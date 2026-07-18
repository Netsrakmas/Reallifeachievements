// Unit-tests voor alle scoringslogica. Draai met: node --test
const { test } = require('node:test');
const assert = require('node:assert');
const C = require('../constants');
const cred = require('../credibility');

test('award-credibility: basis, getuigen en foto', () => {
  assert.equal(cred.awardCredibility({}), C.CRED_BASE);
  assert.equal(cred.awardCredibility({ witnessCount: 1 }), C.CRED_BASE + C.WITNESS_BONUS);
  // getuigen boven het maximum tellen niet mee
  assert.equal(
    cred.awardCredibility({ witnessCount: 10 }),
    C.CRED_BASE + C.WITNESS_MAX * C.WITNESS_BONUS
  );
  // 3 getuigen + foto klemt op 1
  assert.equal(cred.awardCredibility({ witnessCount: 3, timelyPhoto: true }), 1);
});

test('QR-claim (in persoon) weegt zwaarder dan een getuige', () => {
  const qr = cred.awardCredibility({ inPerson: true });
  assert.equal(qr, C.CRED_BASE + C.QR_BONUS);
  assert.ok(qr > cred.awardCredibility({ witnessCount: 1 }));
  // QR-claim start direct op "Ooggetuige bevestigd" (>= 0.65 voor fuzz)
  assert.ok(qr >= 0.65 + C.CRED_FUZZ);
  // en klemt netjes op 1 met alles erbij
  assert.equal(cred.awardCredibility({ witnessCount: 3, timelyPhoto: true, inPerson: true }), 1);
});

test('paar-cap: 4e award A->B in 30 dagen weegt 50%, 7e weegt 10%', () => {
  assert.equal(cred.pairWeight(0), 1);
  assert.equal(cred.pairWeight(2), 1);       // 3e award: nog vol
  assert.equal(cred.pairWeight(3), 0.5);     // 4e award
  assert.equal(cred.pairWeight(5), 0.5);     // 6e award
  assert.equal(cred.pairWeight(6), C.PAIR_MIN_WEIGHT); // 7e award
});

test('wederkerigheid: award terug binnen venster weegt 50%', () => {
  assert.equal(cred.reciprocityWeight(true), C.RECIPROCITY_WEIGHT);
  assert.equal(cred.reciprocityWeight(false), 1);
});

test('verval: halfwaardetijd van 90 dagen', () => {
  assert.equal(cred.decayFactor(0), 1);
  const half = cred.decayFactor(C.DECAY_HALFLIFE_DAYS);
  assert.ok(Math.abs(half - 0.5) < 1e-9, `verwacht 0.5, kreeg ${half}`);
  const quarter = cred.decayFactor(2 * C.DECAY_HALFLIFE_DAYS);
  assert.ok(Math.abs(quarter - 0.25) < 1e-9);
});

test('gever-cred: stijgt per bevestiging, daalt per dispute, geklemd', () => {
  assert.equal(cred.giverCred({}), C.CRED_START);
  assert.equal(cred.giverCred({ confirmedAwards: 5 }), 0.75);
  assert.equal(cred.giverCred({ confirmedAwards: 1000 }), C.CRED_MAX);
  assert.equal(cred.giverCred({ disputedAwards: 1000 }), C.CRED_MIN);
});

test('effectieve punten: reciprociteit halveert (B->A binnen 24u)', () => {
  const base = { rarity: 'uncommon', giverCredValue: 1, ageDays: 0 };
  const vol = cred.effectivePoints(base);
  const terug = cred.effectivePoints({ ...base, reciprocal: true });
  assert.equal(vol, C.RARITY_POINTS.uncommon);
  assert.equal(terug, vol * C.RECIPROCITY_WEIGHT);
});

test('effectieve punten: 4e award in het paar-venster halveert', () => {
  const base = { rarity: 'common', giverCredValue: 1, ageDays: 0 };
  assert.equal(
    cred.effectivePoints({ ...base, pairPriorCount: 3 }),
    C.RARITY_POINTS.common * 0.5
  );
});

test('effectieve punten: betwist of anomalie telt als nul', () => {
  const base = { rarity: 'legendary', giverCredValue: 1.5 };
  assert.equal(cred.effectivePoints({ ...base, status: 'disputed' }), 0);
  assert.equal(cred.effectivePoints({ ...base, anomalyZeroed: true }), 0);
});

test('effectieve punten: proeftijd weegt 0.25', () => {
  const base = { rarity: 'common', giverCredValue: 1, ageDays: 0 };
  assert.equal(cred.effectivePoints({ ...base, probation: true }), C.RARITY_POINTS.common * C.PROBATION_WEIGHT);
});

test('dispute-drempel: 2 gekwalificeerde doubts zonder overwicht aan vouches', () => {
  assert.equal(cred.disputeStatus({ qualifiedDoubts: 2, vouches: 0, currentStatus: 'active' }), 'disputed');
  assert.equal(cred.disputeStatus({ qualifiedDoubts: 1, vouches: 0, currentStatus: 'active' }), 'active');
  // getuigen winnen: herstel
  assert.equal(cred.disputeStatus({ qualifiedDoubts: 2, vouches: 3, currentStatus: 'disputed' }), 'restored');
  // eenmaal betwist blijft betwist zolang vouches niet overheersen
  assert.equal(cred.disputeStatus({ qualifiedDoubts: 2, vouches: 1, currentStatus: 'disputed' }), 'disputed');
});

test('diversiteitseis (Discourse): N/5 gevers en N/4 dagen', () => {
  assert.ok(cred.meetsDiversity(10, 2, 3));
  assert.ok(!cred.meetsDiversity(10, 1, 3)); // te weinig gevers
  assert.ok(!cred.meetsDiversity(10, 2, 2)); // te weinig dagen
});

test('bayesiaanse betrouwbaarheid: (k+1)/(n+3)', () => {
  assert.equal(cred.bayesianReliability(0, 0), 1 / 3);
  assert.equal(cred.bayesianReliability(7, 8), 8 / 11);
});

test('badge-level (Untappd): elke 5 ontvangsten een niveau', () => {
  assert.equal(cred.badgeLevel(1), 1);
  assert.equal(cred.badgeLevel(5), 1);
  assert.equal(cred.badgeLevel(6), 2);
  assert.equal(cred.badgeLevel(11), 3);
});

test('determinisme: zelfde input geeft tweemaal exact dezelfde uitkomst', () => {
  const input = {
    rarity: 'rare', giverCredValue: 0.85, pairPriorCount: 4,
    reciprocal: true, ageDays: 45, probation: false,
  };
  assert.equal(cred.effectivePoints(input), cred.effectivePoints(input));
  assert.equal(cred.fuzz(1234), cred.fuzz(1234));
  assert.deepEqual(cred.credTier(0.8, 42, 'active'), cred.credTier(0.8, 42, 'active'));
});

test('fuzz blijft binnen de band en tiers dekken het hele bereik', () => {
  for (const id of [1, 2, 3, 99, 12345]) {
    assert.ok(Math.abs(cred.fuzz(id)) <= C.CRED_FUZZ);
  }
  assert.equal(cred.credTier(0.98, 1, 'active').key, 'legendary');
  assert.equal(cred.credTier(0.3, 1, 'active').key, 'rumor');
  assert.equal(cred.credTier(0.7, 1, 'disputed').key, 'disputed');
});
