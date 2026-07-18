// Nachtelijke anomalie-job (Stack Overflow-stijl: stil terugdraaien).
// Draai met: node jobs/anomaly.js
// Zet gewichten van verdachte awards op nul, logt in moderation_log en geeft
// herhaalde overtreders een tijdelijke soft-ban op geven. De dader merkt niets;
// badges blijven zichtbaar maar tellen niet meer mee.
const C = require('../constants');
const { open } = require('../db');

const db = open();
const log = db.prepare(`INSERT INTO moderation_log (award_id, user_id, rule, action) VALUES (?, ?, ?, ?)`);
const zero = db.prepare(`UPDATE awards SET anomaly_zeroed = 1 WHERE id = ? AND anomaly_zeroed = 0`);

let zeroed = 0;
const offenders = new Map(); // user_id -> aantal regels geraakt

function markAwards(awardIds, userId, rule) {
  for (const id of awardIds) {
    if (zero.run(id).changes > 0) {
      log.run(id, userId, rule, 'zero_weight');
      zeroed++;
    }
  }
  if (awardIds.length) offenders.set(userId, (offenders.get(userId) || 0) + 1);
}

const users = db.prepare(`SELECT id FROM users WHERE is_system = 0`).all();

for (const { id: userId } of users) {
  const given = db.prepare(`
    SELECT id, recipient_id, created_at FROM awards
    WHERE giver_id = ? AND created_at >= datetime('now', '-30 days')
    ORDER BY created_at
  `).all(userId);
  if (!given.length) continue;

  // Regel 1: > ANOMALY_PAIR_SHARE van iemands awards naar een persoon
  if (given.length >= C.ANOMALY_PAIR_MIN_TOTAL) {
    const perRecipient = new Map();
    for (const a of given) {
      perRecipient.set(a.recipient_id, [...(perRecipient.get(a.recipient_id) || []), a.id]);
    }
    for (const [recipientId, ids] of perRecipient) {
      if (ids.length / given.length > C.ANOMALY_PAIR_SHARE) {
        markAwards(ids, userId, `pair_share>${C.ANOMALY_PAIR_SHARE} naar user ${recipientId}`);
      }
    }
  }

  // Regel 2: pingpong — A<->B binnen 1 uur, vaker dan N keer per week
  const pingpong = db.prepare(`
    SELECT a.id FROM awards a
    WHERE a.giver_id = ? AND a.created_at >= datetime('now', '-7 days')
      AND EXISTS (
        SELECT 1 FROM awards b
        WHERE b.giver_id = a.recipient_id AND b.recipient_id = a.giver_id
          AND abs(julianday(b.created_at) - julianday(a.created_at)) < 1.0 / 24
      )
  `).all(userId);
  if (pingpong.length > C.ANOMALY_PINGPONG_PER_WEEK) {
    markAwards(pingpong.map(r => r.id), userId, `pingpong>${C.ANOMALY_PINGPONG_PER_WEEK}/week`);
  }

  // Regel 3: burst — > N awards binnen M minuten
  for (let i = 0; i + C.ANOMALY_BURST_N < given.length; i++) {
    const windowEnd = new Date(given[i + C.ANOMALY_BURST_N].created_at) - new Date(given[i].created_at);
    if (windowEnd <= C.ANOMALY_BURST_MIN * 60000) {
      const ids = given.slice(i, i + C.ANOMALY_BURST_N + 1).map(a => a.id);
      markAwards(ids, userId, `burst>${C.ANOMALY_BURST_N}in${C.ANOMALY_BURST_MIN}min`);
      break;
    }
  }
}

// Handhavingsladder: wie meerdere regels raakt, krijgt een tijdelijke give-ban.
for (const [userId, ruleCount] of offenders) {
  if (ruleCount >= 2) {
    const until = new Date(Date.now() + C.SOFT_BAN_HOURS * 3600000).toISOString();
    db.prepare(`UPDATE users SET soft_ban_until = ? WHERE id = ?`).run(until, userId);
    log.run(null, userId, 'meerdere_regels', `soft_ban_tot_${until}`);
  }
}

console.log(`Anomalie-job klaar: ${zeroed} award(s) op nul gewogen, ${offenders.size} gebruiker(s) geraakt.`);
db.close();
