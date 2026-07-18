const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Overschrijfbaar voor hosting met een gemount volume (bijv. DATA_DIR=/data)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function open(dbPath) {
  const db = new Database(dbPath || path.join(DATA_DIR, 'pluim.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  migrate(db);
  loadBadges(db);
  return db;
}

// Kolommen die na de eerste release zijn toegevoegd (CREATE IF NOT EXISTS
// werkt niet voor kolommen op bestaande tabellen).
function migrate(db) {
  const cols = db.prepare(`PRAGMA table_info(awards)`).all().map(c => c.name);
  if (!cols.includes('in_person')) {
    db.exec(`ALTER TABLE awards ADD COLUMN in_person INTEGER NOT NULL DEFAULT 0`);
  }
}

// Catalogus uit badges.json in de db spiegelen (idempotent; ketens worden
// tot brons/zilver/goud-rijen ontvouwd).
function loadBadges(db) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'badges.json'), 'utf8'));
  const upsert = db.prepare(`
    INSERT INTO badges (slug, naam, emoji, categorie, rarity, beschrijving, is_secret, is_auto, chain_slug, chain_step)
    VALUES (@slug, @naam, @emoji, @categorie, @rarity, @beschrijving, @is_secret, @is_auto, @chain_slug, @chain_step)
    ON CONFLICT(slug) DO UPDATE SET
      naam=@naam, emoji=@emoji, categorie=@categorie, rarity=@rarity,
      beschrijving=@beschrijving, is_secret=@is_secret, is_auto=@is_auto,
      chain_slug=@chain_slug, chain_step=@chain_step
  `);
  const STEP_LABEL = ['Brons', 'Zilver', 'Goud'];
  const STEP_RARITY = ['uncommon', 'rare', 'legendary'];
  const tx = db.transaction(() => {
    for (const b of raw) {
      if (b.chain) {
        b.chain.thresholds.forEach((n, i) => {
          upsert.run({
            slug: `${b.slug}-${STEP_LABEL[i].toLowerCase()}`,
            naam: `${b.naam} · ${STEP_LABEL[i]}`,
            emoji: b.emoji,
            categorie: b.categorie,
            rarity: STEP_RARITY[i],
            beschrijving: b.beschrijving.replace('{N}', String(n)),
            is_secret: 0,
            is_auto: 1,
            chain_slug: b.slug,
            chain_step: i + 1,
          });
        });
      } else {
        upsert.run({
          slug: b.slug, naam: b.naam, emoji: b.emoji, categorie: b.categorie,
          rarity: b.rarity, beschrijving: b.beschrijving,
          is_secret: b.secret ? 1 : 0, is_auto: b.auto ? 1 : 0,
          chain_slug: null, chain_step: null,
        });
      }
    }
  });
  tx();
}

module.exports = { open, DATA_DIR };
