// Demo-data: 8 gebruikers (wachtwoord: demo123), vriendschappen en ~60 awards
// verspreid over 30 dagen, inclusief vouches, doubts en reacties.
// Draai met: node seed.js   (verwijdert een bestaande database eerst)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { open, DATA_DIR } = require('./db');
const svc = require('./service');

const DB_PATH = path.join(DATA_DIR, 'aura.db');
for (const suffix of ['', '-wal', '-shm']) {
  const p = DB_PATH + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
const db = open(DB_PATH);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const DAY = 86400000;
const iso = (daysAgo, hour = 12, minute = 0) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// -- gebruikers (backdated zodat niemand in proeftijd zit) -------------------
const USERS = [
  ['aura-raad', 'De Aura-raad', '🏛️', 'Het officiële orgaan voor automatische onderscheidingen.', 400, 1],
  ['jesse', 'Jesse', '🦊', 'Badgejager. Op drie legendarisches na compleet.', 180, 0],
  ['fatima', 'Fatima', '🌻', 'Schrijft citaties waar je bij moet gaan zitten.', 200, 0],
  ['henk', 'Opa Henk', '🎩', 'Snapt alleen de feed en de twijfelknop. Dat is genoeg.', 90, 0],
  ['lena', 'Lena', '🐙', 'Getuige van beroep. Ziet alles, vergeet niets.', 150, 0],
  ['omar', 'Omar', '🌵', 'Verzamelt ondeugd-badges met lichte trots.', 120, 0],
  ['sanne', 'Sanne', '🚀', 'Rent voor elke trein. Haalt de meeste.', 160, 0],
  ['ruben', 'Ruben', '🥸', 'Kent de catalogus beter dan zijn agenda.', 110, 0],
  ['priya', 'Priya', '🦩', 'Deelt aura uit als confetti.', 140, 0],
];
const insertUser = db.prepare(`
  INSERT INTO users (username, display_name, password_hash, avatar_emoji, bio, is_system, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const uid = {};
for (const [username, display, avatar, bio, daysAgo, isSystem] of USERS) {
  const info = insertUser.run(username, display, hashPassword('demo123'), avatar, bio, isSystem, iso(daysAgo));
  uid[username] = info.lastInsertRowid;
}

// -- vriendschappen (iedereen minstens 3 maatjes) ---------------------------
const FRIENDS = [
  ['jesse', 'fatima'], ['jesse', 'omar'], ['jesse', 'sanne'], ['jesse', 'ruben'],
  ['fatima', 'lena'], ['fatima', 'priya'], ['fatima', 'henk'],
  ['henk', 'lena'], ['henk', 'sanne'], ['lena', 'omar'], ['lena', 'ruben'],
  ['omar', 'ruben'], ['sanne', 'priya'], ['sanne', 'omar'], ['ruben', 'priya'], ['priya', 'henk'],
];
const insertFriend = db.prepare(`INSERT INTO friendships (user_a, user_b) VALUES (?, ?)`);
for (const [a, b] of FRIENDS) {
  const [lo, hi] = uid[a] < uid[b] ? [uid[a], uid[b]] : [uid[b], uid[a]];
  insertFriend.run(lo, hi);
}

// -- awards ------------------------------------------------------------------
// [daysAgo, uur, gever, ontvanger, badge, citatie, getuigen[], reacties[[user, emoji]], twijfelaars[]]
const AWARDS = [
  [29, 9,  'fatima', 'jesse', 'vliegenmepper', 'Eén klap. Eén vlieg. Doodse stilte in de keuken. Respect.', ['omar'], [['lena', '👏'], ['sanne', '😂']], []],
  [29, 14, 'jesse', 'fatima', 'koffieketting', 'Betaalde de cappuccino van de student achter haar die zijn pinpas was vergeten.', ['lena'], [['priya', '👏']], []],
  [28, 11, 'sanne', 'omar', 'wc-rol-fantoom', 'Liet het karton achter als een visitekaartje. Wij weten wie het was, Omar.', [], [['jesse', '😂'], ['ruben', '😂'], ['fatima', '😱']], []],
  [28, 16, 'priya', 'henk', 'oversteekbegeleider', 'Hielp mevrouw De Wit én haar rollator én haar boodschappenkar naar de overkant. Drie reddingen in één.', ['fatima', 'lena'], [['jesse', '🫡'], ['sanne', '👏']], []],
  [27, 10, 'omar', 'sanne', 'perronsprinter', 'Sprint 9.58 van Usain Bolt verpulverd op perron 4b, inclusief rugzak en croissant.', ['jesse'], [['ruben', '😂'], ['lena', '👏']], []],
  [27, 19, 'lena', 'ruben', 'thuischef', 'Drie gangen voor zes man. De bearnaise splitste niet. Wetenschappelijk gezien een wonder.', ['fatima', 'priya'], [['omar', '👏'], ['henk', '👏']], []],
  [26, 8,  'ruben', 'priya', 'vroege-vogel', 'Stond om 05:45 op om naar vogels te kijken. Vrijwillig. Wij begrijpen het ook niet.', [], [['sanne', '😱']], []],
  [26, 13, 'henk', 'fatima', 'ouderenfluisteraar', 'Zat een uur naast mij op het bankje en luisterde echt. Een uur! Naar mij!', ['lena'], [['jesse', '👏'], ['priya', '👏'], ['omar', '🫡']], []],
  [25, 12, 'jesse', 'omar', 'laatste-koekje-bandiet', 'Keek mij aan. Pakte de laatste stroopwafel. Bleef mij aankijken. IJskoud.', ['sanne'], [['fatima', '😂'], ['lena', '😂']], []],
  [25, 18, 'fatima', 'lena', 'trooster', 'Bleef drie kwartier op de gang tot de tranen om waren. Kwam terug met thee.', ['priya'], [['henk', '👏'], ['jesse', '👏']], []],
  [24, 9,  'sanne', 'jesse', 'trappenbeest', 'Twaalf verdiepingen omdat "de lift te langzaam ging". De lift was sneller. Hij niet.', ['omar'], [['ruben', '😂']], []],
  [24, 15, 'omar', 'ruben', 'spoiler-sluipschutter', 'Verklapte de moordenaar terwijl de aftiteling van aflevering 1 nog liep.', [], [['jesse', '😱'], ['sanne', '😱'], ['fatima', '😱']], []],
  [23, 11, 'priya', 'sanne', 'zitplaatsschenker', 'Stond op voor een zwangere vrouw én haar peuter én wist een tweede plek te regelen.', ['fatima'], [['lena', '👏']], []],
  [23, 20, 'lena', 'henk', 'verhalenverteller', 'Het verhaal over de paling van 1987 duurde twintig minuten. Niemand keek op zijn telefoon.', ['ruben', 'priya'], [['omar', '👏'], ['jesse', '😂']], []],
  [22, 10, 'ruben', 'fatima', 'complimentenkanon', 'Vijf complimenten, vijf vreemden, vijf keer een dag gemaakt. Geteld en genoteerd.', ['jesse'], [['priya', '👏']], []],
  [22, 17, 'jesse', 'sanne', 'pepervreter', 'At de "niet doen"-saus van de toko. Geen melk. Wel een traan. Telt niet als falen.', ['omar', 'ruben'], [['fatima', '😱'], ['lena', '👏']], []],
  [21, 12, 'fatima', 'omar', 'netflix-overspeler', 'Zat "per ongeluk" op aflevering 8. Wij waren samen bij aflevering 4. Ongelooflijk.', ['sanne'], [['jesse', '😂'], ['priya', '😂']], []],
  [21, 19, 'henk', 'lena', 'sleutelspeurder', 'Vond mijn sleutels. In de koelkast. Naast de rookworst. Vraag niet verder.', [], [['fatima', '😂'], ['ruben', '👏']], []],
  [20, 9,  'omar', 'jesse', 'ijsbreker', 'Kletste twintig minuten met een vreemde in de wachtkamer. Ze hebben nu een padelafspraak.', ['lena'], [['sanne', '👏']], []],
  [20, 14, 'sanne', 'priya', 'paraplu-samaritaan', 'Deelde haar paraplu van Ede tot Arnhem met een doorweekte studente. Kwam zelf half nat aan.', ['fatima'], [['henk', '👏'], ['jesse', '👏']], []],
  [19, 11, 'lena', 'omar', 'saladeontduiker', 'Bestelde de caesar "voor de gezondheid" en at vervolgens mijn halve patat op.', ['ruben'], [['jesse', '😂'], ['fatima', '😂'], ['sanne', '😂']], []],
  [19, 16, 'priya', 'ruben', 'ikea-overwinnaar', 'PAX-kast. Twee meter. Nul restschroeven, nul scheldwoorden. De handleiding is als nieuw.', ['omar'], [['lena', '👏']], []],
  [18, 10, 'jesse', 'henk', 'wifi-wonderdokter', 'Aan. Uit. Weer aan. De kleinkinderen juichten. Opa Henk, IT-legende.', ['fatima'], [['priya', '😂'], ['sanne', '👏']], []],
  [18, 15, 'ruben', 'lena', 'wespenonderhandelaar', 'Loodste de wesp met een bierviltje en pure kalmte naar buiten. Niemand gilde. Bijna niemand.', ['jesse', 'priya'], [['omar', '👏']], []],
  [17, 12, 'fatima', 'sanne', 'regenloper', 'Zeven kilometer door code oranje omdat "het maar water is". Kwam glimmend van trots binnen.', [], [['lena', '👏'], ['henk', '😱']], []],
  [17, 21, 'omar', 'priya', 'middernachtsnacker', 'Om 03:12 betrapt met een boterham hagelslag en grote spijt in de ogen.', ['sanne'], [['jesse', '😂']], []],
  [16, 9,  'henk', 'ruben', 'kofferheld', 'Tilde mijn koffer het rek in alsof het niks was. Er zat serviesgoed in. Van lood.', ['lena'], [['fatima', '👏']], []],
  [16, 14, 'sanne', 'fatima', 'toastmeester', 'Speech op het jubileum: drie grappen, één traan, staande ovatie van de catering.', ['priya', 'jesse'], [['omar', '👏'], ['henk', '👏']], []],
  [15, 11, 'priya', 'omar', 'bureaustoelcoureur', 'Van de printer naar de vergaderzaal in één rol. Twaalf meter. Nieuw kantoorrecord.', ['ruben'], [['jesse', '👏'], ['sanne', '😂']], []],
  [15, 18, 'lena', 'jesse', 'bordleger', 'De "Mega Mixed Grill Uitdaging". Leeg. Inclusief het garnituur dat niemand ooit eet.', ['omar', 'sanne'], [['fatima', '😱'], ['ruben', '👏']], []],
  [14, 10, 'ruben', 'sanne', 'controleur-vriend', 'Eén discreet kuchje en heel de coupé zat rechtop met het kaartje in de hand.', [], [['omar', '🫡'], ['jesse', '😂']], []],
  [14, 15, 'jesse', 'priya', 'plantenreanimator', 'De ficus stond op sterven. Drie weken later staat hij op Instagram. Handen van goud.', ['fatima'], [['lena', '👏']], []],
  [13, 12, 'omar', 'henk', 'duivenverjager', 'Verdedigde vier tosti\'s tegen een gecoördineerd duivenoffensief. Geen kruimel verloren.', ['sanne', 'lena'], [['priya', '😂'], ['ruben', '👏']], []],
  [13, 19, 'fatima', 'ruben', 'meetingmuter', 'Sprak negentig seconden gepassioneerd over de kwartaalcijfers. Op mute. Deed het toen opnieuw.', ['priya'], [['jesse', '😂'], ['sanne', '😂']], []],
  [12, 9,  'sanne', 'lena', 'vogelvoeder', 'De mezen kennen haar inmiddels bij naam. Er staat een wachtrij op het balkon.', ['henk'], [['fatima', '👏']], []],
  [12, 16, 'priya', 'jesse', 'kortingskoning', 'Kreeg korting bij de bakker "omdat het brood scheef stond". Het stond niet scheef.', ['omar'], [['ruben', '😂'], ['lena', '😂']], []],
  [11, 11, 'henk', 'omar', 'stoelenpiraat', 'De goede stoel bij het raam. Ik stond op voor koffie. Drie seconden. Drie!', ['jesse'], [['sanne', '😂'], ['fatima', '😂']], []],
  [11, 17, 'lena', 'fatima', 'ontbijtkoerier', 'Croissants, jus, een bloemetje en het goede dienblad. Om half negen. Op zondag.', ['priya'], [['henk', '👏'], ['jesse', '👏']], []],
  [10, 10, 'jesse', 'ruben', 'deadlineduiker', 'Ingeleverd om 23:59:41. Negentien seconden marge. Noemt het "ruim op tijd".', ['omar'], [['sanne', '😂']], []],
  [10, 15, 'omar', 'fatima', 'dansvloerpionier', 'De dansvloer was leeg. Toen niet meer. Iemand moet de eerste zijn en zij was het.', ['sanne', 'priya'], [['lena', '👏'], ['ruben', '👏']], []],
  [9, 12,  'ruben', 'henk', 'smalltalk-overlever', 'Acht verdiepingen over het weer met de buurman. Bleef glimlachen. Een vakman.', [], [['jesse', '😂'], ['priya', '👏']], []],
  [9, 18,  'fatima', 'priya', 'excuustovenaar', 'Zei als eerste sorry na de discussie over de vaatwasser-indeling. Groots.', ['lena'], [['henk', '👏']], []],
  [8, 11,  'sanne', 'ruben', 'gangpadblokkeerder', 'Parkeerde zijn kar diagonaal bij de aanbiedingen op zaterdagmiddag. Chaos. Gejammer.', ['omar'], [['jesse', '😂'], ['fatima', '😂']], []],
  [8, 20,  'priya', 'lena', 'karaoke-kamikaze', 'Bohemian Rhapsody. Solo. Zes minuten. De hele zaal deed de gitaarsolo mee.', ['jesse', 'fatima', 'omar'], [['sanne', '👏'], ['henk', '👏'], ['ruben', '😱']], []],
  [7, 9,   'lena', 'sanne', 'boodschappen-bicepser', 'Veertien tassen, één loop, nul gevoel meer in de vingers. Maar wel in één keer.', ['fatima'], [['omar', '👏']], []],
  [7, 14,  'jesse', 'omar', 'thuiswerkillusionist', 'Overhemd, colbert, pyjamabroek met eendjes. De camera ging per ongeluk te laat uit.', ['ruben'], [['priya', '😂'], ['sanne', '😂'], ['lena', '😂']], []],
  [6, 10,  'omar', 'lena', 'paddenstoelenspotter', 'Fotografeerde de vliegenzwam en zette er een hekje van takjes omheen. Een hekje!', [], [['fatima', '👏'], ['henk', '👏']], []],
  [6, 16,  'henk', 'jesse', 'bandenplakker', 'Plakte de band van een wildvreemde bij de brug. In de regen. Met eigen plaksetje.', ['sanne'], [['priya', '🫡'], ['ruben', '👏']], []],
  [5, 11,  'fatima', 'henk', 'koffiezetheld', 'Trof een lege pot aan en zette verse koffie. In dit huishouden een daad van verzet.', ['lena'], [['omar', '👏']], []],
  [5, 17,  'ruben', 'omar', 'proefjesgraaier', 'Drie rondes langs de kaaskraam met telkens een andere pet op. De kraamhouder twijfelt nog.', ['jesse'], [['sanne', '😂'], ['priya', '😂']], []],
  [4, 12,  'sanne', 'henk', 'eendenfluisteraar', 'Werd van de vijver tot de voordeur gevolgd door elf eenden in colonne. Keek niet één keer om.', ['priya', 'lena'], [['fatima', '😂'], ['jesse', '👏']], []],
  [4, 19,  'priya', 'fatima', 'naamonthouder', 'Achtentwintig verjaardagsgasten, achtentwintig namen bij het afscheid. Foutloos.', ['ruben'], [['lena', '👏'], ['henk', '👏']], []],
  [3, 10,  'omar', 'jesse', 'snoozemeester', 'Zeven keer gesnoozed en alsnog als eerste op kantoor. Wetenschap kan dit niet verklaren.', [], [['sanne', '😂'], ['ruben', '😂']], []],
  [3, 15,  'lena', 'priya', 'stille-afwasser', 'Het feestje liep nog en de keuken was al schoner dan ervoor. Niemand zag haar gaan.', ['fatima'], [['henk', '👏'], ['jesse', '👏']], []],
  [2, 11,  'jesse', 'sanne', 'gladde-handen', 'Ving het glas op vóór het de grond raakte. Met links. Terwijl ze haar telefoon vasthield.', ['omar', 'ruben'], [['priya', '😱'], ['fatima', '👏']], []],
  [2, 18,  'henk', 'ruben', 'stekkerdoos-strateeg', 'Ontwarde de kabelbak achter de tv. Er kwamen drie opladers uit die niemand herkende.', ['lena'], [['omar', '👏']], []],
  [1, 9,   'fatima', 'jesse', 'muggenwreker', 'Om 03:40 opgestaan, licht aan, mug gevonden, afgerekend. Ging daarna vredig slapen.', ['sanne'], [['lena', '👏'], ['omar', '😂']], []],
  [1, 14,  'ruben', 'lena', 'hondenknuffelaar', 'Vroeg keurig toestemming en kreeg vervolgens tien minuten labrador over zich heen.', ['priya'], [['jesse', '👏'], ['henk', '👏']], []],
  [0, 9,   'sanne', 'omar', 'verjaardagsvergeter', 'Feliciteerde Ruben één dag te laat met "hij komt nog, hij zit in de brievenbus". Er kwam niets.', ['jesse'], [['fatima', '😂'], ['priya', '😂']], []],
  [0, 10,  'priya', 'jesse', 'buurtsuperheld', 'Deed twee weken de boodschappen voor de buurvrouw met griep, inclusief de moeilijke drop.', ['fatima', 'lena'], [['henk', '👏'], ['ruben', '🫡']], []],
  [0, 11,  'omar', 'fatima', 'liftbommenwerper', 'Vierde verdieping ingestapt, derde verdieping uitgestapt. De rest reisde door naar beneden. Met de gevolgen.', ['jesse'], [['sanne', '😂'], ['ruben', '😂'], ['lena', '😱']], []],
  // Twee awards die betwist raken (twijfelaars met opgebouwde reputatie):
  [0, 12,  'henk', 'sanne', 'marathonmens', 'Zij zegt dat ze zondag een halve marathon liep. Ik was erbij toen ze het zei.', [], [['omar', '😱']], ['fatima', 'lena']],
  [0, 13,  'ruben', 'omar', 'blikseminslag-overlever', 'Stond naar eigen zeggen "vlak naast" de inslag van dinsdag. Vanuit zijn woonkamer.', [], [['jesse', '😂']], ['fatima', 'lena']],
];

const markRead = db.prepare(`UPDATE notifications SET read = 1 WHERE created_at < ?`);
for (const [daysAgo, hour, giver, recipient, badge, citation, witnesses, reactions, doubters] of AWARDS) {
  const award = svc.createAward(db, {
    giverId: uid[giver], recipientId: uid[recipient], badgeSlug: badge,
    citation, witnessIds: witnesses.map(w => uid[w]), createdAt: iso(daysAgo, hour),
  });
  db.prepare(`UPDATE awards SET created_at = ? WHERE id = ?`).run(iso(daysAgo, hour), award.id);
  for (const [user, emoji] of reactions) {
    db.prepare(`INSERT OR IGNORE INTO reactions (award_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)`)
      .run(award.id, uid[user], emoji, iso(Math.max(0, daysAgo - 1), hour));
  }
  for (const doubter of doubters) {
    svc.addStance(db, { awardId: award.id, userId: uid[doubter], stance: 'doubt' });
  }
}

// Oudere notificaties als gelezen markeren zodat de bel realistisch oogt.
markRead.run(iso(1, 0));

const counts = {
  users: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE is_system = 0`).get().n,
  badges: db.prepare(`SELECT COUNT(*) AS n FROM badges`).get().n,
  awards: db.prepare(`SELECT COUNT(*) AS n FROM awards`).get().n,
  auto: db.prepare(`SELECT COUNT(*) AS n FROM awards a JOIN users u ON u.id = a.giver_id WHERE u.is_system = 1`).get().n,
  disputed: db.prepare(`SELECT COUNT(*) AS n FROM awards WHERE status = 'disputed'`).get().n,
  vouches: db.prepare(`SELECT COUNT(*) AS n FROM vouches`).get().n,
};
console.log(`Seed klaar: ${counts.users} gebruikers, ${counts.badges} badges, ${counts.awards} awards ` +
  `(waarvan ${counts.auto} van de Aura-raad, ${counts.disputed} betwist), ${counts.vouches} vouches/doubts.`);
console.log('Inloggen kan met bijv. jesse / demo123');
db.close();
