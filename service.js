// Domeinlaag: validaties, scores, automatische badges en notificaties.
// Alle score-wiskunde zelf leeft in credibility.js; hier alleen queries + orkestratie.
const C = require('./constants');
const cred = require('./credibility');

const DAY_MS = 86400000;

function nowIso() { return new Date().toISOString(); }
function daysBetween(aIso, bIso) { return (new Date(bIso) - new Date(aIso)) / DAY_MS; }

// ---- gebruikers -----------------------------------------------------------

function systemUser(db) {
  return db.prepare(`SELECT * FROM users WHERE is_system = 1`).get();
}

function mutualFriendCount(db, userId) {
  return db.prepare(
    `SELECT COUNT(*) AS n FROM friendships WHERE user_a = ? OR user_b = ?`
  ).get(userId, userId).n;
}

function isProbation(db, user, at = nowIso()) {
  if (user.is_system) return false;
  const accountAgeDays = daysBetween(user.created_at, at);
  return accountAgeDays < C.PROBATION_DAYS
    && mutualFriendCount(db, user.id) < C.PROBATION_MIN_FRIENDS;
}

function giverCredValue(db, userId) {
  const user = db.prepare(`SELECT is_system FROM users WHERE id = ?`).get(userId);
  if (user && user.is_system) return 1;
  const confirmed = db.prepare(`
    SELECT COUNT(DISTINCT a.id) AS n FROM awards a
    JOIN vouches v ON v.award_id = a.id AND v.stance = 'vouch'
    WHERE a.giver_id = ? AND a.status != 'disputed'
  `).get(userId).n;
  const disputed = db.prepare(
    `SELECT COUNT(*) AS n FROM awards WHERE giver_id = ? AND status = 'disputed'`
  ).get(userId).n;
  return cred.giverCred({ confirmedAwards: confirmed, disputedAwards: disputed });
}

function giverReliability(db, userId) {
  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM awards a JOIN users u ON u.id = a.giver_id
     WHERE a.giver_id = ? AND u.is_system = 0`
  ).get(userId).n;
  const confirmed = db.prepare(`
    SELECT COUNT(DISTINCT a.id) AS n FROM awards a
    JOIN vouches v ON v.award_id = a.id AND v.stance = 'vouch'
    WHERE a.giver_id = ? AND a.status != 'disputed'
  `).get(userId).n;
  return { total, confirmed, ratio: cred.bayesianReliability(confirmed, total) };
}

// ---- award-economie -------------------------------------------------------

function dailyRemaining(db, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const used = db.prepare(
    `SELECT COUNT(*) AS n FROM awards WHERE giver_id = ? AND substr(created_at, 1, 10) = ?`
  ).get(userId, today).n;
  // Openstaande QR-tokens tellen mee; verlopen of geclaimde geven het budget terug
  // (een claim wordt een award en telt dan via de query hierboven).
  const openTokens = db.prepare(`
    SELECT COUNT(*) AS n FROM award_tokens
    WHERE giver_id = ? AND substr(created_at, 1, 10) = ?
      AND claimed_award_id IS NULL AND expires_at > ?
  `).get(userId, today, nowIso()).n;
  return Math.max(0, C.DAILY_AWARD_CAP - used - openTokens);
}

function softBanned(db, userId) {
  const u = db.prepare(`SELECT soft_ban_until FROM users WHERE id = ?`).get(userId);
  return !!(u && u.soft_ban_until && u.soft_ban_until > nowIso());
}

// Award aanmaken met alle regels. Gooit Error met .status en nette NL-melding.
function createAward(db, { giverId, recipientId, badgeSlug, citation, witnessIds = [], photoPath = null, photoLate = 0, inPerson = 0, viaToken = false, createdAt = null }) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };

  const giver = db.prepare(`SELECT * FROM users WHERE id = ?`).get(giverId);
  const recipient = db.prepare(`SELECT * FROM users WHERE id = ?`).get(recipientId);
  if (!recipient) throw fail(404, 'Kies eerst een ontvanger.');
  if (giverId === recipientId) throw fail(403, 'Je kunt jezelf geen badge toekennen. Zo werkt roem niet.');
  const badge = db.prepare(`SELECT * FROM badges WHERE slug = ?`).get(badgeSlug);
  if (!badge) throw fail(404, 'Kies eerst een badge uit de catalogus.');
  if (!giver.is_system && (badge.is_secret || badge.is_auto)) {
    throw fail(403, 'Deze badge kent alleen de Pluimenraad toe.');
  }
  const text = (citation || '').trim();
  if (text.length < C.CITATION_MIN) throw fail(400, `Schrijf een citatie van minstens ${C.CITATION_MIN} tekens — het verhaal is de helft van de badge.`);
  if (text.length > C.CITATION_MAX) throw fail(400, `Houd de citatie onder ${C.CITATION_MAX} tekens.`);
  if (!giver.is_system && !viaToken) {
    if (softBanned(db, giverId)) throw fail(429, 'Je kunt tijdelijk geen badges toekennen. Probeer het later opnieuw.');
    if (dailyRemaining(db, giverId) <= 0) throw fail(429, 'Je pluimen zijn op voor vandaag — morgen weer 5.');
  }

  const info = db.prepare(`
    INSERT INTO awards (badge_id, giver_id, recipient_id, citation, photo_path, photo_late, in_person, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(badge.id, giverId, recipientId, text, photoPath, photoLate ? 1 : 0, inPerson ? 1 : 0, createdAt || nowIso());
  const awardId = info.lastInsertRowid;

  for (const wid of witnessIds) {
    if (wid === giverId || wid === recipientId) continue;
    const w = db.prepare(`SELECT * FROM users WHERE id = ?`).get(wid);
    if (!w || isProbation(db, w)) continue;
    db.prepare(`INSERT OR IGNORE INTO vouches (award_id, user_id, stance) VALUES (?, ?, 'vouch')`)
      .run(awardId, wid);
  }

  notify(db, recipientId, 'award_received', awardId,
    `${giver.display_name} kende je de badge "${badge.naam}" toe ${badge.emoji}`);

  checkAutoBadges(db, recipientId, awardId);
  return db.prepare(`SELECT * FROM awards WHERE id = ?`).get(awardId);
}

// ---- vouches & disputes ---------------------------------------------------

function addStance(db, { awardId, userId, stance }) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
  const award = db.prepare(`SELECT * FROM awards WHERE id = ?`).get(awardId);
  if (!award) throw fail(404, 'Deze award bestaat niet (meer).');
  if (userId === award.giver_id || userId === award.recipient_id) {
    throw fail(403, 'Gever en ontvanger tellen niet als getuige of twijfelaar.');
  }
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (isProbation(db, user)) throw fail(403, 'Nieuwe accounts kunnen nog niet getuigen of twijfelen. Maak eerst wat maatjes.');

  db.prepare(`
    INSERT INTO vouches (award_id, user_id, stance) VALUES (?, ?, ?)
    ON CONFLICT(award_id, user_id) DO UPDATE SET stance = excluded.stance
  `).run(awardId, userId, stance);

  const prevStatus = award.status;
  const newStatus = recalcStatus(db, awardId);
  const badge = db.prepare(`SELECT * FROM badges WHERE id = ?`).get(award.badge_id);
  if (stance === 'vouch') {
    notify(db, award.recipient_id, 'vouch', awardId,
      `${user.display_name} was erbij: "${badge.naam}" is bevestigd ✋`);
  } else {
    notify(db, award.recipient_id, 'doubt', awardId,
      `${user.display_name} betwijfelt je badge "${badge.naam}" 🤨`);
  }
  if (newStatus === 'disputed' && prevStatus !== 'disputed') {
    notify(db, award.recipient_id, 'disputed', awardId,
      `Je badge "${badge.naam}" is nu officieel Betwist 🤨 — een getuige of foto kan hem redden.`);
    notify(db, award.giver_id, 'disputed', awardId,
      `De badge "${badge.naam}" die jij toekende is Betwist 🤨`);
  } else if (prevStatus === 'disputed' && newStatus === 'restored') {
    notify(db, award.recipient_id, 'restored', awardId,
      `Eerherstel! Je badge "${badge.naam}" is niet langer betwist.`);
  }
  checkAutoBadges(db, userId, awardId);
  return newStatus;
}

function recalcStatus(db, awardId) {
  const award = db.prepare(`SELECT * FROM awards WHERE id = ?`).get(awardId);
  const rows = db.prepare(`SELECT user_id, stance FROM vouches WHERE award_id = ?`).all(awardId);
  let vouches = 0, qualifiedDoubts = 0;
  for (const r of rows) {
    if (r.stance === 'vouch') vouches++;
    else if (giverCredValue(db, r.user_id) >= C.DOUBT_MIN_CRED) qualifiedDoubts++;
  }
  const next = cred.disputeStatus({ qualifiedDoubts, vouches, currentStatus: award.status });
  if (next !== award.status) {
    db.prepare(`UPDATE awards SET status = ? WHERE id = ?`).run(next, awardId);
  }
  return next;
}

// ---- weergave & scores ----------------------------------------------------

// Alle weergavedata van een award in een keer (voor feed/profiel/detail).
function awardView(db, award, viewerId = null) {
  const badge = db.prepare(`SELECT * FROM badges WHERE id = ?`).get(award.badge_id);
  const giver = db.prepare(`SELECT id, username, display_name, avatar_emoji, is_system FROM users WHERE id = ?`).get(award.giver_id);
  const recipient = db.prepare(`SELECT id, username, display_name, avatar_emoji FROM users WHERE id = ?`).get(award.recipient_id);
  const stances = db.prepare(`
    SELECT v.stance, u.display_name FROM vouches v JOIN users u ON u.id = v.user_id
    WHERE v.award_id = ? ORDER BY v.created_at
  `).all(award.id);
  const witnesses = stances.filter(s => s.stance === 'vouch');
  const doubts = stances.filter(s => s.stance === 'doubt');
  const credibility = cred.awardCredibility({
    witnessCount: witnesses.length,
    timelyPhoto: !!award.photo_path && !award.photo_late,
    inPerson: !!award.in_person,
  });
  const reactions = db.prepare(`
    SELECT emoji, COUNT(*) AS n, SUM(user_id = ?) AS mine
    FROM reactions WHERE award_id = ? GROUP BY emoji
  `).all(viewerId || -1, award.id);
  const myStance = viewerId
    ? (db.prepare(`SELECT stance FROM vouches WHERE award_id = ? AND user_id = ?`).get(award.id, viewerId) || {}).stance || null
    : null;
  return {
    id: award.id, created_at: award.created_at, citation: award.citation,
    status: award.status, photo_path: award.photo_path, photo_late: !!award.photo_late,
    in_person: !!award.in_person,
    badge: { slug: badge.slug, naam: badge.naam, emoji: badge.emoji, rarity: badge.rarity, categorie: badge.categorie },
    giver, recipient,
    witnesses: witnesses.map(w => w.display_name),
    doubts: doubts.map(d => d.display_name),
    tier: cred.credTier(credibility, award.id, award.status),
    reactions,
    myStance,
    canStance: viewerId && viewerId !== award.giver_id && viewerId !== award.recipient_id && !giver.is_system,
  };
}

// Effectieve punten van een award (0 bij betwist/anomalie).
function awardPoints(db, award, at = nowIso()) {
  const badge = db.prepare(`SELECT rarity FROM badges WHERE id = ?`).get(award.badge_id);
  const giver = db.prepare(`SELECT * FROM users WHERE id = ?`).get(award.giver_id);
  const priorPair = db.prepare(`
    SELECT COUNT(*) AS n FROM awards
    WHERE giver_id = ? AND recipient_id = ? AND id < ?
      AND created_at >= datetime(?, '-30 days')
  `).get(award.giver_id, award.recipient_id, award.id, award.created_at).n;
  const reciprocal = !!db.prepare(`
    SELECT 1 FROM awards WHERE giver_id = ? AND recipient_id = ?
      AND created_at < ? AND created_at >= datetime(?, ?)
    LIMIT 1
  `).get(award.recipient_id, award.giver_id, award.created_at, award.created_at, `-${C.RECIPROCITY_WINDOW_H} hours`);
  return cred.effectivePoints({
    rarity: badge.rarity,
    giverCredValue: giverCredValue(db, award.giver_id),
    pairPriorCount: priorPair,
    reciprocal,
    ageDays: Math.max(0, daysBetween(award.created_at, at)),
    probation: isProbation(db, giver, award.created_at),
    anomalyZeroed: !!award.anomaly_zeroed,
    status: award.status,
  });
}

// Pluim- en Duivel-score van een gebruiker (cred-gewogen, met verval).
function userScores(db, userId) {
  const awards = db.prepare(`
    SELECT a.*, b.categorie FROM awards a JOIN badges b ON b.id = a.badge_id
    WHERE a.recipient_id = ?
  `).all(userId);
  let goed = 0, ondeugd = 0;
  for (const a of awards) {
    const pts = awardPoints(db, a);
    if (a.categorie === 'goed') goed += pts;
    else if (a.categorie === 'ondeugd') ondeugd += pts;
    else { goed += pts / 2; ondeugd += pts / 2; }
  }
  return { goed: Math.round(goed), ondeugd: Math.round(ondeugd) };
}

// Badge-plank: per badge het aantal + level (Untappd-model).
function badgeShelf(db, userId) {
  const rows = db.prepare(`
    SELECT b.slug, b.naam, b.emoji, b.rarity, b.categorie, COUNT(*) AS n, MAX(a.created_at) AS laatst
    FROM awards a JOIN badges b ON b.id = a.badge_id
    WHERE a.recipient_id = ? AND a.status != 'disputed'
    GROUP BY b.id ORDER BY MAX(a.created_at) DESC
  `).all(userId);
  return rows.map(r => ({ ...r, level: cred.badgeLevel(r.n) }));
}

// ---- QR-overhandiging -----------------------------------------------------

// Token aanmaken: consumeert direct dagbudget (verlopen tokens geven het terug).
function createToken(db, { giverId, badgeSlug, citation, token }) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
  const badge = db.prepare(`SELECT * FROM badges WHERE slug = ?`).get(badgeSlug);
  if (!badge) throw fail(404, 'Kies eerst een badge uit de catalogus.');
  if (badge.is_secret || badge.is_auto) throw fail(403, 'Deze badge kent alleen de Pluimenraad toe.');
  const text = (citation || '').trim();
  if (text.length < C.CITATION_MIN) throw fail(400, `Schrijf een citatie van minstens ${C.CITATION_MIN} tekens — het verhaal is de helft van de badge.`);
  if (text.length > C.CITATION_MAX) throw fail(400, `Houd de citatie onder ${C.CITATION_MAX} tekens.`);
  if (softBanned(db, giverId)) throw fail(429, 'Je kunt tijdelijk geen badges toekennen. Probeer het later opnieuw.');
  if (dailyRemaining(db, giverId) <= 0) throw fail(429, 'Je pluimen zijn op voor vandaag — morgen weer 5.');
  const expiresAt = new Date(Date.now() + C.QR_TOKEN_TTL_MIN * 60000).toISOString();
  db.prepare(`
    INSERT INTO award_tokens (token, giver_id, badge_id, citation, expires_at) VALUES (?, ?, ?, ?, ?)
  `).run(token, giverId, badge.id, text, expiresAt);
  return { token, badge, expiresAt };
}

// Status van een token voor de claim-pagina: 'unknown' | 'used' | 'expired' | 'open'
function tokenState(db, token) {
  const row = db.prepare(`
    SELECT t.*, b.slug AS badge_slug, b.naam, b.emoji, b.rarity, b.categorie, b.beschrijving,
           u.username AS giver_username, u.display_name AS giver_name, u.avatar_emoji AS giver_avatar
    FROM award_tokens t JOIN badges b ON b.id = t.badge_id JOIN users u ON u.id = t.giver_id
    WHERE t.token = ?
  `).get(token);
  if (!row) return { state: 'unknown' };
  if (row.claimed_award_id) return { state: 'used', row };
  if (row.expires_at <= nowIso()) return { state: 'expired', row };
  return { state: 'open', row };
}

// Claim: maakt de award aan met in_person-bonus; token is daarna verbruikt.
function claimToken(db, { token, claimerId }) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
  const { state, row } = tokenState(db, token);
  if (state === 'unknown') throw fail(404, 'Deze QR-code is niet (meer) geldig.');
  if (state === 'used') throw fail(410, 'Deze QR-code is al gebruikt — een badge claim je maar één keer.');
  if (state === 'expired') throw fail(410, 'Deze QR-code is verlopen. Vraag om een nieuwe.');
  if (row.giver_id === claimerId) throw fail(403, 'Je kunt je eigen QR-code niet claimen. Zo werkt roem niet.');
  const award = createAward(db, {
    giverId: row.giver_id, recipientId: claimerId, badgeSlug: row.badge_slug,
    citation: row.citation, inPerson: 1, viaToken: true,
  });
  db.prepare(`UPDATE award_tokens SET claimed_award_id = ? WHERE token = ?`).run(award.id, token);
  const claimer = db.prepare(`SELECT display_name FROM users WHERE id = ?`).get(claimerId);
  notify(db, row.giver_id, 'qr_claimed', award.id,
    `${claimer.display_name} claimde je QR-badge "${row.naam}" 🤝`);
  return award;
}

// ---- notificaties ---------------------------------------------------------

function notify(db, userId, type, awardId, message) {
  db.prepare(`INSERT INTO notifications (user_id, type, award_id, message) VALUES (?, ?, ?, ?)`)
    .run(userId, type, awardId, message);
}

// ---- automatische badges (de Pluimenraad) ---------------------------------

function hasBadge(db, userId, slug) {
  return !!db.prepare(`
    SELECT 1 FROM awards a JOIN badges b ON b.id = a.badge_id
    WHERE a.recipient_id = ? AND b.slug = ? LIMIT 1
  `).get(userId, slug);
}

function grantAuto(db, userId, slug, citation, createdAt = null) {
  if (hasBadge(db, userId, slug)) return false;
  const sys = systemUser(db);
  if (!sys || sys.id === userId) return false;
  createAward(db, { giverId: sys.id, recipientId: userId, badgeSlug: slug, citation, createdAt });
  return true;
}

// Controleer alle automatische triggers voor een gebruiker.
// Bewust na elke award/vouch aangeroepen; queries zijn klein op deze schaal.
function checkAutoBadges(db, userId, triggerAwardId = null) {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user || user.is_system) return;
  const trigAward = triggerAwardId ? db.prepare(`SELECT created_at FROM awards WHERE id = ?`).get(triggerAwardId) : null;
  const autoAt = trigAward ? trigAward.created_at : null;

  const received = db.prepare(`
    SELECT a.*, b.categorie, b.slug AS badge_slug, b.is_auto FROM awards a
    JOIN badges b ON b.id = a.badge_id
    WHERE a.recipient_id = ? AND a.status != 'disputed'
  `).all(userId);
  const organic = received.filter(a => !a.is_auto);
  const n = organic.length;
  const distinctGivers = new Set(organic.map(a => a.giver_id)).size;
  const distinctDays = new Set(organic.map(a => a.created_at.slice(0, 10))).size;
  const diverse = (need) => cred.meetsDiversity(need, distinctGivers, distinctDays);

  // Keten-badges (drempels 2/16/128; diversiteitseis geldt voor ontvang-ketens)
  const chains = {
    pluimenjager: organic.filter(a => a.categorie === 'goed').length,
    duivelspact: organic.filter(a => a.categorie === 'ondeugd').length,
  };
  const given = db.prepare(`
    SELECT COUNT(*) AS n FROM awards WHERE giver_id = ? AND status != 'disputed'
  `).get(userId).n;
  const witnessed = db.prepare(`
    SELECT COUNT(*) AS n FROM vouches v JOIN awards a ON a.id = v.award_id
    WHERE v.user_id = ? AND v.stance = 'vouch' AND a.status != 'disputed'
  `).get(userId).n;
  const reactionsReceived = db.prepare(`
    SELECT COUNT(*) AS n FROM reactions r JOIN awards a ON a.id = r.award_id
    WHERE a.recipient_id = ?
  `).get(userId).n;
  const streak = longestDailyStreak(organic.map(a => a.created_at.slice(0, 10)));
  const chainCounts = {
    pluimenjager: chains.pluimenjager, duivelspact: chains.duivelspact,
    vrijgevige: given, ooggetuige: witnessed, feedvedette: reactionsReceived,
    'ketting-van-goud': streak,
  };
  const STEP = ['brons', 'zilver', 'goud'];
  for (const [slug, count] of Object.entries(chainCounts)) {
    C.CHAIN_THRESHOLDS.forEach((threshold, i) => {
      const needsDiversity = slug === 'pluimenjager' || slug === 'duivelspact';
      if (count >= threshold && (!needsDiversity || diverse(threshold))) {
        grantAuto(db, userId, `${slug}-${STEP[i]}`,
          `De Pluimenraad stelt vast dat ${user.display_name} de drempel van ${threshold} heeft bereikt. Hulde.`, autoAt);
      }
    });
  }

  // Vier Seizoenen: in elk kwartaal-seizoen minstens 1 badge
  const seasons = new Set(organic.map(a => {
    const m = Number(a.created_at.slice(5, 7));
    return m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'lente' : m <= 8 ? 'zomer' : 'herfst';
  }));
  if (seasons.size === 4) {
    grantAuto(db, userId, 'vier-seizoenen', `Winter, lente, zomer én herfst: ${user.display_name} presteert het hele jaar door.`, autoAt);
  }

  // Eregalerij: 50 badges van 10+ gevers
  if (n >= 50 && distinctGivers >= 10) {
    grantAuto(db, userId, 'eregalerij', `Vijftig verdiende badges van tien verschillende gevers. ${user.display_name} treedt toe tot de Eregalerij.`, autoAt);
  }

  // De Verzamelaar: 10 verschillende badges binnen 30 dagen (+ diversiteit)
  const last30 = organic.filter(a => daysBetween(a.created_at, nowIso()) <= 30);
  if (new Set(last30.map(a => a.badge_slug)).size >= 10 && diverse(10)) {
    grantAuto(db, userId, 'de-verzamelaar', `Tien verschillende badges in dertig dagen. ${user.display_name} verzamelt daden zoals anderen postzegels.`, autoAt);
  }

  // Triggers rond de specifieke nieuwe award
  if (triggerAwardId) {
    const trig = received.find(a => a.id === triggerAwardId);
    if (trig && !trig.is_auto) {
      // De Boemerang: zelfde badge eerder zelf aan de gever toegekend
      const boomerang = db.prepare(`
        SELECT 1 FROM awards WHERE giver_id = ? AND recipient_id = ? AND badge_id = ?
          AND created_at < ? LIMIT 1
      `).get(userId, trig.giver_id, trig.badge_id, trig.created_at);
      if (boomerang) grantAuto(db, userId, 'de-boemerang', `Wat ${user.display_name} uitdeelde, kwam terug. De kringloop is voltooid.`, autoAt);

      // Nachtburgemeester: award tussen 03:00 en 05:00 (servertijd)
      const hour = new Date(trig.created_at).getHours();
      if (hour >= 3 && hour < 5) {
        grantAuto(db, userId, 'nachtburgemeester', `Om ${String(hour).padStart(2, '0')}:00 nog badges ontvangen. De nacht kent haar burgemeester.`, autoAt);
      }

      // Dubbelagent: op een dag zowel goed als ondeugd
      const day = trig.created_at.slice(0, 10);
      const cats = new Set(organic.filter(a => a.created_at.slice(0, 10) === day).map(a => a.categorie));
      if (cats.has('goed') && cats.has('ondeugd')) {
        grantAuto(db, userId, 'dubbelagent', `Op één dag zowel engel als duivel. ${user.display_name} speelt beide kanten.`, autoAt);
      }

      // Eerste Bloed: allereerste ontvanger van deze badge
      const earlier = db.prepare(`
        SELECT 1 FROM awards WHERE badge_id = ? AND id != ? AND created_at < ? LIMIT 1
      `).get(trig.badge_id, trig.id, trig.created_at);
      if (!earlier) grantAuto(db, userId, 'eerste-bloed', `${user.display_name} ontving de badge "${trig.badge_slug}" als allereerste. De geschiedenisboeken noteren het.`, autoAt);
    }
  }

  // Getuige-Expert: 25 bevestigde, overeind gebleven getuigenissen
  if (witnessed >= 25) {
    grantAuto(db, userId, 'getuige-expert', `Vijfentwintig getuigenissen, allemaal overeind. ${user.display_name} ziet alles.`, autoAt);
  }

  // Scepticus: 10 doubts waarvan 8+ terecht (award werd betwist)
  const doubtsPlaced = db.prepare(`
    SELECT a.status FROM vouches v JOIN awards a ON a.id = v.award_id
    WHERE v.user_id = ? AND v.stance = 'doubt'
  `).all(userId);
  const justified = doubtsPlaced.filter(d => d.status === 'disputed').length;
  if (doubtsPlaced.length >= 10 && justified >= 8) {
    grantAuto(db, userId, 'scepticus', `Tien twijfels, acht keer raak. ${user.display_name} laat zich niets wijsmaken.`, autoAt);
  }
}

function longestDailyStreak(dayStrings) {
  const days = [...new Set(dayStrings)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = (prev && (new Date(d) - new Date(prev)) === DAY_MS) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

module.exports = {
  nowIso, daysBetween, systemUser, isProbation, mutualFriendCount,
  giverCredValue, giverReliability, dailyRemaining, softBanned,
  createAward, addStance, recalcStatus, awardView, awardPoints,
  createToken, tokenState, claimToken,
  userScores, badgeShelf, notify, checkAutoBadges, longestDailyStreak,
};
