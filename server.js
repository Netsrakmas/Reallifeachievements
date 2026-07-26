// Aura — server. Start met: node server.js
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const C = require('./constants');
const { open, DATA_DIR } = require('./db');
const svc = require('./service');
const V = require('./views');

const db = open();
const app = express();
// Achter een reverse proxy (Fly/Render/Caddy/nginx) klopt req.protocol dan met
// X-Forwarded-Proto, zodat QR-claim-URL's https gebruiken.
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '6mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PHOTO_DIR = path.join(DATA_DIR, 'photos');
if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });
app.use('/photos', express.static(PHOTO_DIR));

// ---- auth ------------------------------------------------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), check);
}

function readCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

app.use((req, res, next) => {
  const token = readCookies(req).session;
  req.user = null;
  if (token) {
    const row = db.prepare(`
      SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
    `).get(token);
    if (row) req.user = row;
  }
  next();
});

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + C.SESSION_DAYS * 86400000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expires);
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${C.SESSION_DAYS * 86400}`);
}

function requirePage(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}
function requireApi(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Log eerst in.' });
  next();
}

function page(req, res, { title, active, content }) {
  const unread = req.user
    ? db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0`).get(req.user.id).n
    : 0;
  const remaining = req.user ? svc.dailyRemaining(db, req.user.id) : null;
  res.send(V.layout({ user: req.user, title, active, content, unread, remaining }));
}

// ---- auth-routes -----------------------------------------------------------

// Alleen interne paden als redirect-doel accepteren (geen open redirect).
function safeNext(raw) {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

app.get('/login', (req, res) => {
  if (req.user) return res.redirect(safeNext(req.query.next));
  res.send(V.layout({ user: null, title: 'Inloggen', content: V.loginPage({ next: req.query.next }) }));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE username = ? AND is_system = 0`).get((username || '').trim());
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).send(V.layout({
      user: null, title: 'Inloggen',
      content: V.loginPage({ error: 'Gebruikersnaam en wachtwoord passen niet bij elkaar.', values: { username }, next: req.body.next }),
    }));
  }
  startSession(res, user.id);
  res.redirect(safeNext(req.body.next));
});

app.post('/register', (req, res) => {
  const username = (req.body.username || '').trim();
  const display = (req.body.display_name || '').trim();
  const password = req.body.password || '';
  const fail = (error) => res.status(400).send(V.layout({
    user: null, title: 'Account maken',
    content: V.loginPage({ error, mode: 'register', values: { username, display_name: display } }),
  }));
  if (!/^[a-zA-Z0-9_-]{2,24}$/.test(username)) return fail('Kies een gebruikersnaam van 2–24 tekens: letters, cijfers, - of _.');
  if (display.length < 1 || display.length > 40) return fail('Vul een weergavenaam in van maximaal 40 tekens.');
  if (password.length < 6) return fail('Kies een wachtwoord van minstens 6 tekens.');
  if (db.prepare(`SELECT 1 FROM users WHERE username = ?`).get(username)) return fail('Deze gebruikersnaam bestaat al. Kies een andere.');
  const info = db.prepare(`
    INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)
  `).run(username, display, hashPassword(password));
  startSession(res, info.lastInsertRowid);
  res.redirect(safeNext(req.body.next));
});

app.post('/logout', (req, res) => {
  const token = readCookies(req).session;
  if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.redirect('/login');
});

// ---- pagina's --------------------------------------------------------------

const FEED_LIMIT = 40;
function feedViews(req, sinceIso = null) {
  const rows = sinceIso
    ? db.prepare(`SELECT * FROM awards WHERE created_at > ? ORDER BY created_at DESC LIMIT ?`).all(sinceIso, FEED_LIMIT)
    : db.prepare(`SELECT * FROM awards ORDER BY created_at DESC, id DESC LIMIT ?`).all(FEED_LIMIT);
  return rows.map(a => svc.awardView(db, a, req.user.id));
}

app.get('/', requirePage, (req, res) => {
  page(req, res, { title: 'Feed', active: 'feed', content: V.feedPage({ views: feedViews(req) }) });
});

app.get('/badges', requirePage, (req, res) => {
  const badges = db.prepare(`
    SELECT b.*, EXISTS(
      SELECT 1 FROM awards a WHERE a.badge_id = b.id AND a.recipient_id = ?
    ) AS earnedByViewer
    FROM badges b
    ORDER BY b.is_secret, CASE b.rarity WHEN 'legendary' THEN 3 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 1 ELSE 0 END DESC, b.naam
  `).all(req.user.id);
  const counts = {
    total: badges.length,
    secret: badges.filter(b => b.is_secret).length,
  };
  page(req, res, { title: 'Catalogus', active: 'badges', content: V.catalogPage({ badges, counts }) });
});

app.get('/badges/:slug', requirePage, (req, res) => {
  const badge = db.prepare(`SELECT * FROM badges WHERE slug = ?`).get(req.params.slug);
  if (!badge) return res.status(404).send(V.layout({ user: req.user, title: 'Niet gevonden', content: '<h1>Deze badge bestaat niet</h1><p><a href="/badges">Terug naar de catalogus</a></p>' }));
  const earned = db.prepare(`SELECT 1 FROM awards WHERE badge_id = ? AND recipient_id = ? LIMIT 1`).get(badge.id, req.user.id);
  if (badge.is_secret && !earned) {
    return res.status(403).send(V.layout({ user: req.user, title: 'Geheim', content: '<h1>???</h1><p>Deze onderscheiding is geheim. De Aura-raad doet geen mededelingen.</p><p><a href="/badges">Terug naar de catalogus</a></p>' }));
  }
  const timesAwarded = db.prepare(`SELECT COUNT(*) AS n FROM awards WHERE badge_id = ?`).get(badge.id).n;
  const recent = db.prepare(`SELECT * FROM awards WHERE badge_id = ? ORDER BY created_at DESC LIMIT 5`).all(badge.id);
  page(req, res, {
    title: badge.naam, active: 'badges',
    content: V.badgeDetailPage({ badge, timesAwarded, recentViews: recent.map(a => svc.awardView(db, a, req.user.id)) }),
  });
});

app.get('/u/:username', requirePage, (req, res) => {
  const profile = db.prepare(`SELECT * FROM users WHERE username = ? AND is_system = 0`).get(req.params.username);
  if (!profile) return res.status(404).send(V.layout({ user: req.user, title: 'Niet gevonden', content: '<h1>Dit lid bestaat niet</h1><p><a href="/">Terug naar de feed</a></p>' }));
  const recent = db.prepare(`
    SELECT * FROM awards WHERE recipient_id = ? OR giver_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(profile.id, profile.id);
  page(req, res, {
    title: profile.display_name, active: req.user.id === profile.id ? 'profiel' : '',
    content: V.profilePage({
      profile,
      isOwn: req.user.id === profile.id,
      scores: svc.userScores(db, profile.id),
      shelf: svc.badgeShelf(db, profile.id),
      recentViews: recent.map(a => svc.awardView(db, a, req.user.id)),
      reliability: svc.giverReliability(db, profile.id),
      probation: svc.isProbation(db, profile),
    }),
  });
});

app.get('/ranglijst', requirePage, (req, res) => {
  const tab = req.query.tab === 'ondeugd' ? 'ondeugd' : 'goed';
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekAwards = db.prepare(`
    SELECT a.*, b.categorie FROM awards a JOIN badges b ON b.id = a.badge_id
    JOIN users g ON g.id = a.giver_id
    WHERE a.created_at >= ? AND b.categorie = ? AND g.is_system = 0
  `).all(monday.toISOString(), tab);
  const perUser = new Map();
  for (const a of weekAwards) {
    const pts = svc.awardPoints(db, a);
    perUser.set(a.recipient_id, (perUser.get(a.recipient_id) || 0) + pts);
  }
  const rows = [...perUser.entries()]
    .map(([userId, points]) => ({
      ...db.prepare(`SELECT username, display_name, avatar_emoji FROM users WHERE id = ?`).get(userId),
      points,
    }))
    .filter(r => r.points > 0.5)
    .sort((a, b) => b.points - a.points)
    .slice(0, C.LEAGUE_MAX);
  const weekLabel = `week van ${monday.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`;
  page(req, res, { title: 'Ranglijst', active: 'ranglijst', content: V.leaderboardPage({ tab, rows, weekLabel }) });
});

// ---- JSON-API --------------------------------------------------------------

app.get('/api/feed', requireApi, (req, res) => {
  const views = feedViews(req, req.query.since || null);
  res.json({
    html: views.map(v => V.awardCard(v)).join('\n'),
    count: views.length,
    latest: views.length ? views[0].created_at : (req.query.since || null),
    unread: db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0`).get(req.user.id).n,
    remaining: svc.dailyRemaining(db, req.user.id),
  });
});

app.get('/api/awards/:id/fragment', requireApi, (req, res) => {
  const award = db.prepare(`SELECT * FROM awards WHERE id = ?`).get(req.params.id);
  if (!award) return res.status(404).json({ error: 'Deze award bestaat niet (meer).' });
  res.json({ html: V.awardCard(svc.awardView(db, award, req.user.id)) });
});

app.get('/api/users', requireApi, (req, res) => {
  const users = db.prepare(`
    SELECT username, display_name, avatar_emoji, id = ? AS isSelf
    FROM users WHERE is_system = 0 ORDER BY display_name
  `).all(req.user.id);
  res.json({ users });
});

app.get('/api/badges', requireApi, (req, res) => {
  const badges = db.prepare(`
    SELECT slug, naam, emoji, categorie, rarity FROM badges
    WHERE is_secret = 0 AND is_auto = 0 ORDER BY naam
  `).all();
  res.json({ badges });
});

app.post('/api/awards', requireApi, (req, res) => {
  const { recipient_username, badge_slug, citation, witness_usernames = [], photo = null, moment = 'nu' } = req.body;
  const recipient = db.prepare(`SELECT id FROM users WHERE username = ? AND is_system = 0`).get(recipient_username || '');
  try {
    let photoPath = null;
    if (photo) {
      const match = /^data:image\/jpeg;base64,(.+)$/.exec(photo);
      if (!match) { const e = new Error('De bewijsfoto kon niet worden gelezen. Maak hem opnieuw met de camera.'); e.status = 400; throw e; }
      const buf = Buffer.from(match[1], 'base64');
      if (buf.length > 4 * 1024 * 1024) { const e = new Error('De bewijsfoto is te groot (max 4 MB).'); e.status = 400; throw e; }
      photoPath = `${crypto.randomBytes(8).toString('hex')}.jpg`;
      fs.writeFileSync(path.join(PHOTO_DIR, photoPath), buf);
    }
    const witnessIds = (Array.isArray(witness_usernames) ? witness_usernames : [])
      .map(u => db.prepare(`SELECT id FROM users WHERE username = ? AND is_system = 0`).get(u))
      .filter(Boolean).map(r => r.id);
    const award = svc.createAward(db, {
      giverId: req.user.id,
      recipientId: recipient ? recipient.id : -1,
      badgeSlug: badge_slug,
      citation,
      witnessIds,
      photoPath,
      photoLate: moment !== 'nu' ? 1 : 0,
    });
    res.json({
      html: V.awardCard(svc.awardView(db, award, req.user.id), { stamped: true }),
      remaining: svc.dailyRemaining(db, req.user.id),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/awards/:id/stance', requireApi, (req, res) => {
  const stance = req.body.stance === 'doubt' ? 'doubt' : 'vouch';
  try {
    svc.addStance(db, { awardId: Number(req.params.id), userId: req.user.id, stance });
    const award = db.prepare(`SELECT * FROM awards WHERE id = ?`).get(req.params.id);
    res.json({ html: V.awardCard(svc.awardView(db, award, req.user.id)) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/awards/:id/react', requireApi, (req, res) => {
  const emoji = String(req.body.emoji || '');
  if (!['👏', '😂', '😱', '🫡'].includes(emoji)) return res.status(400).json({ error: 'Kies een van de vier reacties.' });
  const award = db.prepare(`SELECT * FROM awards WHERE id = ?`).get(req.params.id);
  if (!award) return res.status(404).json({ error: 'Deze award bestaat niet (meer).' });
  const existing = db.prepare(`SELECT id FROM reactions WHERE award_id = ? AND user_id = ? AND emoji = ?`)
    .get(award.id, req.user.id, emoji);
  if (existing) {
    db.prepare(`DELETE FROM reactions WHERE id = ?`).run(existing.id);
  } else {
    db.prepare(`INSERT INTO reactions (award_id, user_id, emoji) VALUES (?, ?, ?)`).run(award.id, req.user.id, emoji);
    if (award.recipient_id !== req.user.id) {
      svc.notify(db, award.recipient_id, 'reaction', award.id, `${req.user.display_name} reageerde met ${emoji} op je badge`);
    }
    svc.checkAutoBadges(db, award.recipient_id);
  }
  res.json({ html: V.awardCard(svc.awardView(db, award, req.user.id)) });
});

// ---- QR-overhandiging ------------------------------------------------------

app.post('/api/qr-awards', requireApi, (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const { badge, expiresAt } = svc.createToken(db, {
      giverId: req.user.id, badgeSlug: req.body.badge_slug, citation: req.body.citation, token,
    });
    const claimUrl = `${req.protocol}://${req.get('host')}/claim/${token}`;
    QRCode.toString(claimUrl, { type: 'svg', margin: 1, width: 260 }, (err, svg) => {
      if (err) return res.status(500).json({ error: 'De QR-code kon niet worden gemaakt. Probeer het opnieuw.' });
      res.json({
        token, claimUrl, expiresAt, qrSvg: svg, badgeNaam: badge.naam,
        remaining: svc.dailyRemaining(db, req.user.id),
      });
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/qr-awards/:token/status', requireApi, (req, res) => {
  const { state, row } = svc.tokenState(db, req.params.token);
  if (state === 'unknown' || row.giver_id !== req.user.id) {
    return res.status(404).json({ error: 'Deze QR-code is niet (meer) geldig.' });
  }
  let claimedBy = null;
  if (state === 'used') {
    const award = db.prepare(`
      SELECT u.display_name FROM awards a JOIN users u ON u.id = a.recipient_id WHERE a.id = ?
    `).get(row.claimed_award_id);
    claimedBy = award ? award.display_name : null;
  }
  res.json({ state, claimedBy, remaining: svc.dailyRemaining(db, req.user.id) });
});

app.get('/claim/:token', (req, res) => {
  const { state, row } = svc.tokenState(db, req.params.token);
  const content = V.claimPage({ state, row: row ? { ...row, token: req.params.token } : null, user: req.user });
  if (!req.user) {
    return res.send(V.layout({ user: null, title: 'Badge claimen', content }));
  }
  page(req, res, { title: 'Badge claimen', active: '', content });
});

app.post('/claim/:token', requirePage, (req, res) => {
  try {
    const award = svc.claimToken(db, { token: req.params.token, claimerId: req.user.id });
    const card = V.awardCard(svc.awardView(db, award, req.user.id), { stamped: true });
    page(req, res, { title: 'Badge geclaimd', active: '', content: V.claimPage({ claimedCard: card }) });
  } catch (e) {
    const { state, row } = svc.tokenState(db, req.params.token);
    const content = V.claimPage({
      state: state === 'open' ? 'open' : state,
      row: row ? { ...row, token: req.params.token } : null,
      user: req.user,
      error: e.message,
    });
    res.status(e.status || 500);
    page(req, res, { title: 'Badge claimen', active: '', content });
  }
});

app.get('/api/notifications', requireApi, (req, res) => {
  const items = db.prepare(`
    SELECT id, type, award_id, message, read, created_at FROM notifications
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(req.user.id);
  res.json({
    items: items.map(n => ({ ...n, ago: V.timeAgo(n.created_at) })),
    unread: items.filter(n => !n.read).length,
  });
});

app.post('/api/notifications/read', requireApi, (req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(req.user.id);
  res.json({ ok: true });
});

app.post('/api/profile', requireApi, (req, res) => {
  const bio = String(req.body.bio || '').slice(0, 160);
  const avatar = String(req.body.avatar_emoji || '').trim().slice(0, 8) || '🙂';
  db.prepare(`UPDATE users SET bio = ?, avatar_emoji = ? WHERE id = ?`).run(bio, avatar, req.user.id);
  res.json({ ok: true });
});

// ---- start -----------------------------------------------------------------

const port = Number(process.env.PORT) || C.PORT;
const server = app.listen(port, () => {
  console.log(`Aura draait op http://localhost:${port}`);
  console.log('Inloggen: jesse / demo123 (of een van de andere demo-accounts)');
});
module.exports = { app, server, db };
