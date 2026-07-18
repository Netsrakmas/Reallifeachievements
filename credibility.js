// Alle scoringslogica van Pluim & Duivel. Puur en deterministisch:
// zelfde input geeft altijd dezelfde output. Onderbouwing: RESEARCH.md.
const C = require('./constants');

// Geloofwaardigheid van een individuele award, in [0,1]. Een QR-claim
// (inPerson) is fysiek bewijs van nabijheid en weegt zwaarder dan een getuige.
function awardCredibility({ witnessCount = 0, timelyPhoto = false, inPerson = false }) {
  const witnesses = Math.min(witnessCount, C.WITNESS_MAX);
  let cred = C.CRED_BASE + witnesses * C.WITNESS_BONUS
    + (timelyPhoto ? C.PHOTO_BONUS : 0)
    + (inPerson ? C.QR_BONUS : 0);
  return Math.min(1, Math.max(0, cred));
}

// Deterministische fuzz (Reddit-principe): colluders kunnen hun effect niet
// aflezen, maar dezelfde award toont altijd dezelfde waarde.
function fuzz(awardId) {
  let h = 2166136261;
  const s = String(awardId);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unit = ((h >>> 0) % 1000) / 999; // [0,1]
  return (unit * 2 - 1) * C.CRED_FUZZ;
}

// Speelse tier-chip; nooit het kale getal tonen.
function credTier(cred, awardId, status) {
  if (status === 'disputed') return { key: 'disputed', label: 'Betwist 🤨' };
  const shown = Math.min(1, Math.max(0, cred + fuzz(awardId)));
  if (shown >= 0.9) return { key: 'legendary', label: 'Gecertificeerd legendarisch' };
  if (shown >= 0.65) return { key: 'confirmed', label: 'Ooggetuige bevestigd' };
  if (shown >= 0.5) return { key: 'hearsay', label: 'Volgens zeggen' };
  return { key: 'rumor', label: 'Onbevestigd gerucht' };
}

// Paar-gewicht: hoeveelste award van A naar B in de laatste 30 dagen is dit?
// (priorCount = aantal eerdere A->B-awards in dat venster.)
function pairWeight(priorCount) {
  if (priorCount < C.PAIR_FULL_PER_30D) return 1;
  if (priorCount < C.PAIR_HALF_PER_30D) return 0.5;
  return C.PAIR_MIN_WEIGHT;
}

// Wederkerigheids-demping: gaf B aan A binnen het venster vóór deze award?
function reciprocityWeight(reverseAwardWithinWindow) {
  return reverseAwardWithinWindow ? C.RECIPROCITY_WEIGHT : 1;
}

// Exponentieel verval met halfwaardetijd (alleen voor scores/ranglijsten).
function decayFactor(ageDays) {
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / C.DECAY_HALFLIFE_DAYS);
}

// Gever-Cred uit historie (een-staps EigenTrust): bevestigde awards omhoog,
// betwiste omlaag, geklemd op [CRED_MIN, CRED_MAX].
function giverCred({ confirmedAwards = 0, disputedAwards = 0 }) {
  const raw = C.CRED_START
    + confirmedAwards * C.CRED_UP_PER_VOUCH
    - disputedAwards * C.CRED_DOWN_PER_DISPUTE;
  return Math.min(C.CRED_MAX, Math.max(C.CRED_MIN, raw));
}

// Effectieve puntwaarde van een award voor scores en ranglijsten.
function effectivePoints({
  rarity, giverCredValue, pairPriorCount = 0, reciprocal = false,
  ageDays = 0, probation = false, anomalyZeroed = false, status = 'active',
}) {
  if (anomalyZeroed || status === 'disputed') return 0;
  const base = C.RARITY_POINTS[rarity];
  if (base === undefined) throw new Error(`Onbekende rarity: ${rarity}`);
  return base
    * giverCredValue
    * pairWeight(pairPriorCount)
    * reciprocityWeight(reciprocal)
    * decayFactor(ageDays)
    * (probation ? C.PROBATION_WEIGHT : 1);
}

// Dispute-status: doubts van gebruikers met voldoende Cred tellen; herstel
// zodra vouches de gekwalificeerde doubts overtreffen.
function disputeStatus({ qualifiedDoubts, vouches, currentStatus }) {
  if (qualifiedDoubts >= C.DOUBT_THRESHOLD && vouches <= qualifiedDoubts) return 'disputed';
  if (currentStatus === 'disputed' && vouches > qualifiedDoubts) return 'restored';
  return currentStatus === 'disputed' ? 'disputed' : currentStatus;
}

// Discourse-diversiteitsregel voor automatische milestones.
function meetsDiversity(n, distinctGivers, distinctDays) {
  return distinctGivers >= Math.ceil(n / C.DIVERSITY_GIVERS_DIVISOR)
    && distinctDays >= Math.ceil(n / C.DIVERSITY_DAYS_DIVISOR);
}

// Bayesian-gladgestreken betrouwbaarheid van een gever ("84% bevestigd").
function bayesianReliability(confirmed, total) {
  return (confirmed + 1) / (total + 3);
}

// Untappd-model: badge-level uit het aantal keer dat dezelfde badge is ontvangen.
function badgeLevel(count) {
  return Math.floor(Math.max(0, count - 1) / C.CHAIN_LEVEL_EVERY) + 1;
}

module.exports = {
  awardCredibility, fuzz, credTier, pairWeight, reciprocityWeight,
  decayFactor, giverCred, effectivePoints, disputeStatus, meetsDiversity,
  bayesianReliability, badgeLevel,
};
