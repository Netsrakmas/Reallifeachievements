// Alle getunede getallen van Pluim & Duivel. Onderbouwing per getal: zie RESEARCH.md.
module.exports = {
  // Award-economie (HeyTaco: 4-6/dag is de sweet spot; verloop voorkomt hamsteren)
  DAILY_AWARD_CAP: 5,
  // Proeftijd (Lobsters-model, verzacht voor een fun-app)
  PROBATION_DAYS: 14,
  PROBATION_MIN_FRIENDS: 3,
  PROBATION_WEIGHT: 0.25,
  // Geloofwaardigheid per award (BeReal/Veri-Five-model)
  CRED_BASE: 0.5,
  WITNESS_BONUS: 0.15,
  WITNESS_MAX: 3,
  PHOTO_BONUS: 0.15,
  PHOTO_WINDOW_MIN: 10,
  // Anti-collusie (stil toegepast op de score-laag; de award zelf slaagt altijd)
  PAIR_FULL_PER_30D: 3,
  PAIR_HALF_PER_30D: 6,
  PAIR_MIN_WEIGHT: 0.1,
  RECIPROCITY_WINDOW_H: 48,
  RECIPROCITY_WEIGHT: 0.5,
  // Gever-reputatie (een-staps EigenTrust)
  CRED_START: 0.5,
  CRED_MIN: 0.25,
  CRED_MAX: 1.5,
  CRED_UP_PER_VOUCH: 0.05,
  CRED_DOWN_PER_DISPUTE: 0.1,
  DECAY_HALFLIFE_DAYS: 90,
  // Dispute-flow
  DOUBT_THRESHOLD: 2,
  DOUBT_MIN_CRED: 0.75,
  // Diversiteitseis voor milestones/trofeeen (Discourse-regel)
  DIVERSITY_GIVERS_DIVISOR: 5,
  DIVERSITY_DAYS_DIVISOR: 4,
  // Punten-economie (Kongregate 5/15/30/60)
  RARITY_POINTS: { common: 5, uncommon: 15, rare: 30, legendary: 60 },
  CHAIN_LEVEL_EVERY: 5,
  CHAIN_THRESHOLDS: [2, 16, 128], // brons / zilver / goud (GitHub-model)
  // Nachtelijke heuristieken (Stack Overflow-stijl: stil terugdraaien)
  ANOMALY_PAIR_SHARE: 0.5,
  ANOMALY_PAIR_MIN_TOTAL: 10, // paar-aandeel pas beoordelen vanaf dit aantal gegeven awards
  ANOMALY_PINGPONG_PER_WEEK: 2,
  ANOMALY_BURST_N: 10,
  ANOMALY_BURST_MIN: 10,
  SOFT_BAN_HOURS: 48,
  // Weergave-fuzz van credibility (Reddit-principe), deterministisch per award
  CRED_FUZZ: 0.03,
  // UI
  POLL_MS: 8000,
  LEAGUE_MAX: 30,
  CITATION_MIN: 10,
  CITATION_MAX: 280,
  SESSION_DAYS: 30,
  PORT: 3000,
};
