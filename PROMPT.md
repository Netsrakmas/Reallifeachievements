# PROMPT.md — "Pluim & Duivel" · Real Life Achievements — Master Build Spec

> Dit document is de volledige bouwprompt. Voer het milestone voor milestone uit.
> Ga nooit door naar de volgende milestone voordat het checkpoint van de huidige slaagt.
> Bij ambiguïteit: schrijf `[NEEDS CLARIFICATION: vraag]` in je antwoord in plaats van stil te gokken.
> Elk getuned getal staat in het CONSTANTS-blok (§4) en nergens anders — geen magic numbers in de code.

---

## 1. Rol & missie

Je bent een senior product-engineer én creative director. Je neigt naar generieke,
"on distribution" output — in frontend-design heet dat de "AI-slop"-esthetiek.
Vermijd dat actief: bouw een onderscheidende, speelse app die verrast.
Commit aan één samenhangende esthetiek (§5), gebruik CSS-variabelen, en kies
dominante kleuren met scherpe accenten in plaats van timide, gelijkmatig verdeelde paletten.

**Missie**: bouw *Pluim & Duivel* — een multi-user web-app waarin echte mensen elkaar
badges toekennen voor daden in het echte leven. Goede daden (een pluim 😇) én ondeugende
daden (een duiveltje 😈). Je kunt jezelf nooit een badge geven. De app voelt als een
padvindershandboek dat is overgenomen door je grappigste vrienden: officieel vormgegeven
onzin, dodelijk serieus opgeschreven.

**De ene emotie**: *"HAHAHA die verdien jij"* — het moment dat je een badge aan een vriend
toekent en de hele vriendengroep het in de feed ziet.

**Persona's**: (1) Jesse, 24, kent de catalogus uit z'n hoofd en jaagt op zeldzame badges;
(2) Fatima, 31, geeft vooral badges en schrijft legendarische citaties; (3) Opa Henk, 67,
snapt alleen de feed en de knop "Betwijfel ik 🤨" — ook hij moet alles kunnen.

## 2. Niet-doelen (bewust buiten scope)

- Geen native app, geen pushnotificaties, geen e-mail.
- Geen OAuth/social login, geen e-mailverificatie.
- Geen echt geld, geen inwisselbare beloningen.
- Geen uploads naar externe diensten; foto's optioneel en lokaal opgeslagen.
- Geen globale publieke ranglijst over alle gebruikers (bewuste designkeuze, zie §8.6).
- Geen ML/AI-moderatie in v1 — heuristieken volstaan (wel flags opslaan als latere trainingsdata).

## 3. Harde technische constraints

- **Stack**: Node.js + Express + better-sqlite3 (SQLite). Server-rendered HTML
  (template literals) + vanilla JS voor interactie. Eén repo, nul externe services,
  nul build-step. Start: `npm install && node server.js` → http://localhost:3000.
- SQLite-init: `PRAGMA journal_mode=WAL; busy_timeout=5000; synchronous=NORMAL; foreign_keys=ON`.
- Auth: username + wachtwoord, gehasht met scrypt uit `node:crypto` (nul extra deps),
  httpOnly `SameSite=Lax` session-cookie + `sessions`-tabel.
- Bestandsstructuur: `server.js` (routes), `db.js` (connectie+queries), `schema.sql`,
  `seed.js`, `credibility.js` (alle scoringslogica, puur en unit-testbaar),
  `constants.js` (§4), `public/` (css/js), `badges.json` (catalogus §6).
- Alle timestamps in UTC (ISO 8601). Alle scoringsfuncties deterministisch:
  zelfde input → zelfde output (testbaar).
- Seed-data (`node seed.js`): 8 demo-gebruikers (wachtwoord `demo123`) met echte namen
  (Jesse, Fatima, Henk, Lena, Omar, Sanne, Ruben, Priya), ~60 awards verspreid over
  30 dagen met échte, grappige citaties (geen "test test"), vouches, doubts en reacties —
  zodat de app bij eerste start al lééft.

## 4. CONSTANTS-blok (`constants.js` — de enige plek voor tunables)

```js
module.exports = {
  // Award-economie (HeyTaco: 4–6/dag is de sweet spot; verloop voorkomt hamsteren)
  DAILY_AWARD_CAP: 5,              // awards die je per dag mag GEVEN; verlopen om 00:00 lokaal
  // Proeftijd (Lobsters-model, verzacht voor een fun-app)
  PROBATION_DAYS: 14,              // account jonger dan dit → proeftijd
  PROBATION_MIN_FRIENDS: 3,        // óf minder wederzijdse vrienden dan dit
  PROBATION_WEIGHT: 0.25,          // gewicht van awards gegeven door proeftijd-accounts
  // Geloofwaardigheid per award (BeReal/Veri-Five-model)
  CRED_BASE: 0.5,                  // startgeloofwaardigheid van elke award
  WITNESS_BONUS: 0.15,             // per onafhankelijke getuige…
  WITNESS_MAX: 3,                  // …tot dit maximum
  PHOTO_BONUS: 0.15,               // in-app-foto binnen PHOTO_WINDOW_MIN minuten
  PHOTO_WINDOW_MIN: 10,
  // Anti-collusie (stil toegepast op de score-laag; de award zelf slaagt altijd)
  PAIR_FULL_PER_30D: 3,            // eerste 3 awards A→B per 30 dagen: 100%
  PAIR_HALF_PER_30D: 6,            // awards 4–6: 50%; daarboven: PAIR_MIN_WEIGHT
  PAIR_MIN_WEIGHT: 0.1,
  RECIPROCITY_WINDOW_H: 48,        // B→A binnen 48u na A→B (eBay-retaliatiedata)…
  RECIPROCITY_WEIGHT: 0.5,         // …telt half
  // Gever-reputatie (één-staps EigenTrust)
  CRED_START: 0.5, CRED_MIN: 0.25, CRED_MAX: 1.5,
  CRED_UP_PER_VOUCH: 0.05,         // gever-cred stijgt als zijn awards bevestigd worden
  CRED_DOWN_PER_DISPUTE: 0.1,     // en daalt als ze betwist raken
  DECAY_HALFLIFE_DAYS: 90,         // exponentieel verval van cred-bijdragen (Discourse ~100d)
  // Dispute-flow
  DOUBT_THRESHOLD: 2,              // aantal doubts…
  DOUBT_MIN_CRED: 0.75,            // …van gebruikers met minstens deze cred → status 'disputed'
  // Diversiteitseis voor milestones/trofeeën (Discourse-regel)
  DIVERSITY_GIVERS_DIVISOR: 5,     // N badges moeten ≥ N/5 verschillende gevers beslaan
  DIVERSITY_DAYS_DIVISOR: 4,       // en ≥ N/4 verschillende dagen
  // Punten-economie (Kongregate 5/15/30/60)
  RARITY_POINTS: { common: 5, uncommon: 15, rare: 30, legendary: 60 },
  CHAIN_LEVEL_EVERY: 5,            // Untappd: elke 5 herhaalde awards → badge level +1
  // Nachtelijke heuristieken (Stack Overflow-stijl: stil terugdraaien)
  ANOMALY_PAIR_SHARE: 0.5,         // >50% van iemands gegeven awards naar één persoon
  ANOMALY_PINGPONG_PER_WEEK: 2,    // A↔B binnen 1u, vaker dan 2×/week
  ANOMALY_BURST_N: 10, ANOMALY_BURST_MIN: 10,  // >10 awards in 10 minuten
  SOFT_BAN_HOURS: 48,              // tijdelijke give-ban bij herhaalde anomalie
  // UI
  POLL_MS: 8000,                   // feed/notificatie-polling
  LEAGUE_MAX: 30,                  // wekelijkse leagues van max 30 personen
};
```

## 5. Stijlbijbel

**Stijlanker** (herzien op verzoek, 2026-07-18): *"een modern stickerboek in speels
neo-brutalisme: warm beige papier, vette gele stickers, dikke inktlijnen en harde
slagschaduwen"* — vierkante blokken met royale ronde hoeken, alles voelt tastbaar
als een sticker die je kunt lostrekken. Denk Duolingo-speelsheid × neo-brutalistische
snijranden. NIET: corporate, wishy-washy pastel, dunne haarlijntjes.

**Kleurtokens** (CSS-variabelen, nergens hardgecodeerde kleuren):

```css
--bg:        #F1EAD8;  /* warm beige papier — dominante achtergrond */
--surface:   #FDFAF1;  /* kaarten/stickers — bijna-wit crème */
--surface-2: #F3EDDC;  /* chips, skeletons, secundaire vlakken */
--ink:       #221D10;  /* warme near-black inkt — tekst én dikke randen */
--ink-dim:   #6A6252;  /* secundaire tekst */
--geel:      #FFC421;  /* hét accent — knoppen, highlights (inkt-tekst erop) */
--geel-deep: #8F6700;  /* geel als tékstkleur op licht (contrast-veilig) */
--halo:      #23704A;  /* pluim-groen — goede daden 😇 */
--mischief:  #C13A47;  /* duivel-rood — ondeugd 😈 */
```

**Vorm & diepte**: kaarten = vierkante blokken, radius 16 px, rand 2 px `--ink`,
harde slagschaduw `4px 4px 0` in inkt (geen blur — stickers, geen zweefkaarten).
Interactieve elementen (knoppen, FAB, modal) krijgen een vollere schaduw en
schuiven 2 px in bij :active. Badge-emblemen worden **afgeronde vierkanten**
(radius ~30%) i.p.v. cirkels — rand = rarity-kleur, legendarisch met gele glow.

**Typografie** (Google Fonts, lokaal gehost of via link): display **Fraunces**
(gewicht 900, voor badge-namen en koppen — old-book chunky), body **Karla** (400/700),
cijfers/punten **IBM Plex Mono**. Groottesprongen minimaal 3× (bijv. 16 px body →
56 px paginakop). Nooit Inter, Roboto, Open Sans, Lato of systeemfonts.

**Vormtaal**: badges = emoji-embleem in een cirkelring; ringkleur = rarity
(brons `#A97142`, zilver `#B8BDC4`, goud `--gold`, legendarisch: goud + subtiele glow).
Rarity nooit alléén met kleur communiceren — altijd ook label ("Zeldzaam").
Secret badges tonen als silhouet met "???". Spacing-schaal 4/8/16/32 px; radius 8 px
(kaarten 12 px); randen 1 px `--gold` op 25% opacity als "gouden kaderlijntjes".

**Motion-budget**: één georkestreerde page-load met gestaggerde reveals
(`animation-delay`, CSS-only) + een badge-toekennings-moment (stempel-animatie:
badge schaalt van 1.4→1 met een lichte rotatie, 300 ms, alsof hij op de pagina wordt
gestempeld). Hover/press-feedback. Verder niets.

**Microcopy**: Nederlands, actieve wijs, sentence case ("Ken badge toe", niet "Verstuur").
Foutmeldingen veld-specifiek en uitvoerbaar ("Kies eerst een ontvanger", nooit "Er ging
iets mis"). De toon is die van een ambtelijk certificaat over onzin: "Hierbij verklaart
Fatima dat Jesse op 3 juli een vlieg in één klap heeft geveld."

**VERBODEN**: paarse gradients op wit; Inter/Roboto/systeemfonts; drie-feature-boxen-grid;
warm crème (#F4F1EA) + terracotta + serif-cluster; near-black + acid-green; lorem ipsum of
enige placeholder-string; emoji als vervanging van UI-iconen buiten badge-emblemen;
over-animatie; timide gelijkmatig verdeelde paletten.

## 6. Badge-catalogus (`badges.json`)

Formaat per badge: `{ slug, naam, emoji, categorie, rarity, beschrijving, secret?, chain? }`.
Beschrijving = dodelijk serieuze, ambtelijke formulering van een absurde daad (de humor zit
in het páár naam+beschrijving). Categorieën: `goed` (😇 telt voor Pluim-score),
`ondeugd` (😈 telt voor Duivel-score), `neutraal`. Volledige lijst (120 badges):

### Alledaagse Helden (goed)
1. **Oversteekbegeleider** 🚸 *common* — Begeleidde een oudere medemens veilig naar de overkant.
2. **Boodschappenridder** 🛍️ *common* — Droeg andermans zware boodschappen zonder daartoe verplicht te zijn.
3. **Deurhouder Deluxe** 🚪 *common* — Hield de deur open voor drie of meer opeenvolgende personen.
4. **Portemonnee-Padvinder** 👛 *rare* — Vond een portemonnee en herenigde deze met de rechtmatige eigenaar.
5. **Bandenplakker** 🚲 *uncommon* — Verleende pechhulp aan een vreemde met bandenpech.
6. **Parkeerengel** 🅿️ *common* — Schonk een parkeerkaartje met resterende tijd aan een medeburger.
7. **Zitplaatsschenker** 💺 *common* — Stond een zitplaats af in het openbaar vervoer.
8. **Kattenredder** 🐈 *rare* — Bevrijdde een dier uit een benarde positie.
9. **Buurtsuperheld** 🦸 *uncommon* — Deed boodschappen voor een zieke of slecht ter been zijnde buur.
10. **Sneeuwschuiver** ❄️ *uncommon* — Maakte andermans stoep sneeuw- of ijsvrij.
11. **Complimentenkanon** 💬 *uncommon* — Gaf vijf oprechte complimenten aan vreemden op één dag.
12. **Koffieketting** ☕ *common* — Betaalde de bestelling van de persoon achter zich in de rij.
13. **Wegwijzer** 🧭 *common* — Loodste een verdwaalde toerist succesvol naar de bestemming.
14. **Paraplu-Samaritaan** ☔ *uncommon* — Deelde een paraplu met een doorweekte vreemde.
15. **Bloedbroeder/-zuster** 🩸 *rare* — Doneerde bloed. Bewijs: pleister en koekje.
16. **Zwerfvuilvernietiger** 🗑️ *uncommon* — Verzamelde minimaal één volle zak andermans zwerfvuil.
17. **Verhuisvriend** 📦 *uncommon* — Hielp een volledige verhuizing zonder tegenprestatie te verlangen.
18. **Trooster** 🤗 *uncommon* — Troostte een bedroefd persoon tot merkbare verbetering optrad.
19. **Fooienfee** 💸 *uncommon* — Gaf een buitensporig genereuze fooi aan iemand die het verdiende.
20. **Ouderenfluisteraar** 👵 *rare* — Voerde een oprecht gesprek van vijftien minuten of langer met een eenzame oudere.
21. **Plantenreanimator** 🪴 — *common* — Redde andermans stervende kamerplant van de ondergang.
22. **Stille Afwasser** 🧽 *common* — Deed op een feestje ongevraagd de afwas van de gastheer/-vrouw.

### Kleine Ondeugd (ondeugd)
23. **Liftbommenwerper** 🌬️ *rare* — Liet een windje in een bezette lift en verliet deze voortijdig.
24. **Vliegenmepper** 🪰 *common* — Velde een vlieg in één enkele, besliste klap.
25. **Muggenwreker** 🦟 *common* — Elimineerde de mug die verantwoordelijk was voor nachtelijke slaapverstoring.
26. **Snoozemeester** ⏰ *common* — Snoozede vijfmaal of vaker en arriveerde desondanks tijdig.
27. **Laatste-Koekje-Bandiet** 🍪 *common* — Nam het laatste koekje onder toeziend oog van een ander.
28. **WC-Rol-Fantoom** 🧻 *common* — Liet een lege wc-rol achter voor de volgende bezoeker.
29. **Spoiler-Sluipschutter** 🎬 *uncommon* — Verklapte een plotwending aan een onwillig publiek.
30. **Stoelenpiraat** 🪑 *common* — Confisqueerde de beste stoel op het moment dat deze vrijkwam.
31. **Vakkenvuller** 🚗 *uncommon* — Parkeerde over twee vakken en ontkwam aan iedere consequentie.
32. **Bioscoopfluisteraar** 🍿 *uncommon* — Converseerde tijdens de film en doorstond de boze blikken.
33. **Proefjesgraaier** 🧀 *common* — At zich rond aan gratis proefjes zonder aankoopintentie.
34. **Huisontwaker** 📢 *common* — Maakte per ongeluk het volledige huishouden wakker.
35. **Schermgluurder** 📱 *common* — Las ongegeneerd mee op het telefoonscherm van een medereiziger.
36. **Netflix-Overspeler** 📺 *uncommon* — Keek in het geheim vooruit in een gezamenlijk begonnen serie.
37. **Verjaardagsvergeter** 🎂 *common* — Vergat een verjaardag en presenteerde een doorzichtige reddingspoging.
38. **Gangpadblokkeerder** 🛒 *common* — Blokkeerde een supermarktgangpad op het drukste moment van de dag.
39. **Appgroep-Verlater** 👋 *uncommon* — Verliet demonstratief een groepsapp op een dramatisch moment.
40. **Leftovers-Lord** 🍕 *common* — At andermans gelabelde restjes uit de gedeelde koelkast.
41. **Sokkensmokkelaar** 🧦 *common* — Droeg dezelfde sokken op dag drie en ontkende dit desgevraagd.
42. **Blindganger** 🙈 *uncommon* — Negeerde een bekende op straat door intensief telefoongebruik te veinzen.

### Sociale Meesterproeven (goed/neutraal)
43. **IJsbreker** 🧊 *uncommon* — Begon een gesprek van tien minuten of langer met een volslagen vreemde.
44. **Karaoke-Kamikaze** 🎤 *rare* — Zong solo karaoke voor een volle zaal.
45. **Dansvloerpionier** 🕺 *uncommon* — Betrad als allereerste een volledig lege dansvloer.
46. **Toastmeester** 🥂 *uncommon* — Hield een toespraak voor twintig of meer aanwezigen.
47. **Vredestichter** 🕊️ *rare* — Beslechtte een ruzie tussen twee derden duurzaam.
48. **Matchmaker** 💘 *rare* — Koppelde twee personen die aantoonbaar zijn gaan daten.
49. **Excuustovenaar** 🙏 *uncommon* — Bood als eerste excuses aan na een verhit meningsverschil.
50. **Neezegger** 🚫 *uncommon* — Weigerde beleefd doch beslist iets wat hij/zij echt niet wilde.
51. **Kortingskoning** 🏷️ *uncommon* — Bedong korting op een plaats waar dit hoogst ongebruikelijk is.
52. **Smalltalk-Overlever** 🗣️ *common* — Doorstond een lifttraject vol smalltalk zonder zichtbaar ongemak.
53. **Naamonthouder** 🏷️ *uncommon* — Onthield de naam van iedereen op een feestje en bewees dit bij vertrek.
54. **Verhalenverteller** 📖 *uncommon* — Hield een gezelschap minutenlang stil met één verhaal.

### Fysieke Prestaties (goed/neutraal)
55. **Trappenbeest** 🪜 *common* — Verkoos tien of meer verdiepingen trap boven de lift.
56. **Perronsprinter** 🏃 *common* — Haalde een reeds vertrekkend voertuig met een eervolle sprint.
57. **Regenloper** 🌧️ *uncommon* — Legde vijf kilometer of meer af door aanhoudende regen.
58. **Vroege Vogel** 🌅 *common* — Stond vóór 06:00 op zonder enige externe verplichting.
59. **IJsberenclub** 🧊 *rare* — Nam een ijsbad of dook in koud open water.
60. **Marathonmens** 🏅 *legendary* — Voltooide een (halve) marathon.
61. **Liftweigeraar** 💪 *common* — Weigerde een week lang consequent iedere lift en roltrap.
62. **Boodschappen-Bicepser** 💪 *common* — Vervoerde alle boodschappen in één enkele heroïsche loop.

### Culinaire Avonturen (goed/ondeugd/neutraal)
63. **Pepervreter** 🌶️ *uncommon* — Consumeerde iets buitensporig pittigs zonder naar zuivel te grijpen.
64. **Bordleger** 🍽️ *common* — Liet een uitdagend groot gerecht volledig leeg achter.
65. **Mysterie-Eter** 🦑 *uncommon* — At iets zonder voorafgaande kennis van de aard van het gerecht.
66. **Thuischef** 👨‍🍳 *uncommon* — Serveerde een driegangenmenu aan vier of meer gasten.
67. **Ontbijtkoerier** 🥐 *uncommon* — Verraste iemand met een volledig ontbijt op bed.
68. **Middernachtsnacker** 🌙 *common* — Werd om 03:00 aangetroffen bij de geopende koelkast.
69. **Saladeontduiker** 🥗 *common* — Bestelde een salade en at vervolgens andermans friet.
70. **Barbecue-Bevelhebber** 🔥 *uncommon* — Nam ongevraagd doch succesvol het commando over andermans barbecue.

### Kantoor & Studie
71. **Vergaderontsnapper** 🚪 *uncommon* — Ontsnapte onopgemerkt aan een vergadering die een e-mail had kunnen zijn.
72. **Reply-All-Rampzaaier** 📧 *rare* — Beantwoordde per ongeluk allen. Iedereen. Alle 400.
73. **Printerfluisteraar** 🖨️ *rare* — Verhielp een printerstoring waar drie collega's reeds faalden.
74. **Koffiezetheld** ☕ *common* — Zette een nieuwe pot na het aantreffen van een lege.
75. **Deadlineduiker** 📅 *uncommon* — Leverde in binnen zestig seconden vóór de deadline.
76. **Meetingmuter** 🔇 *common* — Sprak een volle minuut bevlogen op mute.
77. **Thuiswerkillusionist** 🛋️ *common* — Voerde een videovergadering in pak boven, pyjama onder.
78. **Bureaustoelcoureur** 🪑 *uncommon* — Legde op een bureaustoel een aanzienlijke afstand rollend af.

### Huis, Tuin & Techniek
79. **IKEA-Overwinnaar** 🔧 *uncommon* — Assembleerde meubilair zonder restschroeven én zonder relatiecrisis.
80. **Spinnenredder** 🕷️ *common* — Zette een spin levend buiten in plaats van tot geweld over te gaan.
81. **Spinnenwreker** 🕷️ *common* — Koos wél voor geweld. (ondeugd)
82. **Wifi-Wonderdokter** 📶 *common* — Herstelde de huiselijke vrede middels aan- en weer uitzetten.
83. **Gladde Handen** 🤹 *uncommon* — Ving een vallend voorwerp middenin de lucht op.
84. **Sleutelspeurder** 🔑 *common* — Vond andermans verloren gewaande sleutels.
85. **Stekkerdoos-Strateeg** 🔌 *common* — Ontwarde een kabelknoop van archeologische ouderdom.
86. **Tuinkabouter** 🧑‍🌾 *uncommon* — Onderhield andermans tuin tijdens diens vakantie, met levende planten als resultaat.

### Reizen & OV
87. **Zwartkijker** 🎫 *uncommon* — Reisde per abuis eersteklas met een tweedeklaskaartje en werd niet betrapt. (ondeugd)
88. **Kaartjescontroleur-Vriend** 🎫 *common* — Waarschuwde medereizigers discreet voor naderende controle.
89. **Kofferheld** 🧳 *common* — Tilde andermans koffer in het bagagerek.
90. **Wildplasser in Nood** 🌳 *uncommon* — Vond op een onmogelijke locatie toch een oplossing. Details ontbreken bewust. (ondeugd)
91. **Fileontwijker** 🗺️ *common* — Omzeilde een file via een route die alleen locals kennen.
92. **Verkeerde-Trein-Toerist** 🚂 *common* — Belandde in de verkeerde trein en maakte er een dagje uit van.
93. **Souvenirsjouwer** 🗿 *uncommon* — Vervoerde een belachelijk souvenir over een belachelijke afstand.

### Natuur & Dieren
94. **Eendenfluisteraar** 🦆 *common* — Werd spontaan gevolgd door een colonne eenden.
95. **Hondenknuffelaar** 🐕 *common* — Vroeg én kreeg toestemming een vreemde hond te aaien.
96. **Wespenonderhandelaar** 🐝 *uncommon* — Loodste een wesp kalm naar buiten zonder paniek in het gezelschap.
97. **Vogelvoeder** 🐦 *common* — Onderhield een structurele voedselvoorziening voor tuinvogels.
98. **Paddenstoelenspotter** 🍄 *common* — Fotografeerde een paddenstoel in plaats van erop te trappen.
99. **Duivenverjager** 🐦‍⬛ *common* — Beschermde een terraslunch manmoedig tegen een duivenoffensief.

### Legendarisch (rare/legendary — hoge bewijslast, zie §8)
100. **Levensredder** 🚑 *legendary* — Redde daadwerkelijk een mensenleven. Vereist getuigen.
101. **Gevonden Schat** 💎 *legendary* — Vond iets van grote waarde en stond het integraal af.
102. **Beroemdheidsspotter** ⭐ *rare* — Ging met een aantoonbare beroemdheid op de foto.
103. **Bruiloftsspeech-Legende** 💒 *legendary* — Hield een bruiloftsspeech die zowel tranen als gelach oogstte.
104. **Blikseminslag-Overlever** ⚡ *legendary* — Was aantoonbaar binnen 500 meter van een blikseminslag.
105. **Krantenkop** 📰 *legendary* — Haalde (lokaal) nieuws met een positieve daad.
106. **Vier Seizoenen** 🍂 *legendary* — Ontving in elk van de vier seizoenen minstens één badge. (automatisch toegekend)
107. **Eregalerij** 🏆 *legendary* — Ontving 50 badges van 10+ verschillende gevers. (automatisch; diversiteitseis §4)

### Geheime badges (`secret: true` — in catalogus als "???"-silhouet)
108. **De Boemerang** 🪃 *rare* — Ontving exact dezelfde badge die hij/zij eerder aan de gever toekende. (automatisch)
109. **Nachtburgemeester** 🌃 *uncommon* — Ontving een badge tussen 03:00 en 05:00.
110. **Dubbelagent** 🎭 *rare* — Ontving op één dag zowel een Pluim- als een Duivel-badge.
111. **De Verzamelaar** 🗃️ *rare* — Ontving 10 verschillende badges binnen 30 dagen (met diversiteitseis).
112. **Eerste Bloed** 🥇 *uncommon* — Ontving als allereerste gebruiker een bepaalde badge.
113. **Getuige-Expert** 👁️ *uncommon* — Bevestigde als getuige 25 awards die overeind bleven. (automatisch)
114. **Scepticus** 🧐 *uncommon* — Plaatste 10 doubts waarvan er 8+ terecht bleken. (automatisch)

### Keten-badges (chain: brons → zilver → goud, drempels 2/16/128 — GitHub-model)
115. **Pluimenjager** 😇 *chain* — Ontving {2/16/128} goede-daad-badges.
116. **Duivelspact** 😈 *chain* — Ontving {2/16/128} ondeugd-badges.
117. **Vrijgevige** 🎁 *chain* — Kende {2/16/128} badges toe die overeind bleven.
118. **Ooggetuige** 👀 *chain* — Trad {2/16/128} keer op als getuige.
119. **Feedvedette** 📣 *chain* — Ontving {2/16/128} reacties op eigen awards.
120. **Ketting van Goud** ⛓️ *chain* — Ontving {2/16/128} dagen achtereen minstens één badge.

Daarnaast levelt élke individuele badge Untappd-stijl: elke 5e ontvangst van dezelfde
badge → "Vliegenmepper niv. 2", retroactief berekend uit de award-historie.

## 7. Schermen & flows (elk interactief element opgesomd — geen dode knoppen)

Navigatie (vast bovenaan): logo "Pluim & Duivel" (→ feed) · Feed · Catalogus ·
Ranglijst · notificatie-bel met ongelezen-teller (→ dropdown) · eigen avatar (→ profiel) ·
uitloggen. Plus één prominente gouden knop: **"Ken badge toe"** (→ award-modal, overal beschikbaar).

1. **Login/registreer** (`/login`): velden gebruikersnaam/wachtwoord, knoppen "Log in" en
   "Maak account". Veld-specifieke fouten ("Deze gebruikersnaam bestaat al").
   Demo-hint met de acht seed-accounts.
2. **Feed** (`/`): omgekeerd-chronologische award-kaarten. Per kaart: gever-avatar+naam,
   "kende toe aan", ontvanger, badge (ring+emoji+naam+rarity-label), citatie als certificaattekst,
   geloofwaardigheids-tier-chip (§8.2), tijdstip, en knoppen: reactie-emoji (👏 😂 😱 🫡 —
   toggle, max 1 per emoji per user), "Ik was erbij ✋" (getuige, alleen zichtbaar als je
   gever noch ontvanger bent), "Betwijfel ik 🤨" (doubt, zelfde restrictie). Polling elke
   `POLL_MS`. Vier states: leeg ("Nog geen daden verricht. Ken de eerste badge toe!" + knop),
   laden (skeleton-kaarten), fout (specifiek + "Probeer opnieuw"-knop), gevuld.
3. **Award-modal**: stap 1 kies persoon (zoeklijst, jezelf uitgesloten én onklikbaar),
   stap 2 kies badge (zoekbaar, gefilterd op categorie/rarity; secret badges niet kiesbaar),
   stap 3 schrijf citatie (verplicht, 10–280 tekens, teller) + optioneel getuigen taggen +
   optioneel foto (alleen live camera-capture; toon "laat"-label indien > `PHOTO_WINDOW_MIN`
   na het gekozen daad-moment). Toont resterend dagbudget ("Nog 3 van 5 vandaag").
   Bij op: "Je pluimen zijn op voor vandaag — morgen weer 5" (knop disabled, geen error).
   Bevestiging → stempel-animatie (§5) → kaart verschijnt in feed.
4. **Catalogus** (`/badges`): grid van alle badges, filter op categorie en rarity, zoekveld.
   Secret badges als "???"-silhouet. Klik → detail: beschrijving, punten, hoe vaak toegekend,
   recente ontvangers, "Ken deze badge toe"-knop (opent modal met badge voorgeselecteerd).
5. **Profiel** (`/u/:username`): avatar-emoji, bio, Pluim-score 😇 en Duivel-score 😈
   (cred-gewogen, §8), badge-plank (gegroepeerd, met levels en rarity-ringen), recentste
   awards (ontvangen én gegeven), gever-betrouwbaarheidsindicator (§8.5). Eigen profiel:
   bio en avatar-emoji bewerkbaar.
6. **Ranglijst** (`/ranglijst`): wekelijkse league (max `LEAGUE_MAX`, reset ma 00:00) +
   aparte tabs "Engelen 😇" en "Duivels 😈", gerangschikt op cred-gewogen punten.
   Geen globale all-time-ranglijst over alle gebruikers heen.
7. **Notificatie-dropdown**: award ontvangen / getuige bevestigde / doubt geplaatst /
   reactie / level-up / badge betwist of hersteld. Klik → betreffende kaart. "Markeer alles
   gelezen"-knop.

**State-contract**: de `awards`-tabel is de enige source of truth voor de feed; de client
houdt geen eigen kopieën van gedeelde data buiten de laatste poll-respons. Scores worden
server-side berekend (in `credibility.js`), nooit in de client.

## 8. Het geloofwaardigheidssysteem (kern-USP — exact zo implementeren)

Filosofie: **soft integrity** (Foursquare/Strava/BeReal): de actie slaagt altijd, alleen de
belonings-/geloofwaardigheidslaag discrimineert — stilletjes. Nooit een badge van iemands
plank verwijderen; hij verliest hooguit zijn glans en telt niet meer mee.

1. **Economie**: `DAILY_AWARD_CAP` per dag, verloopt om middernacht. Proeftijd-accounts
   (§4): awards wegen `PROBATION_WEIGHT`, geen getuige-/doubt-rechten.
2. **Per-award credibility** ∈ [0,1]: start `CRED_BASE`; + `WITNESS_BONUS` per getuige
   (max `WITNESS_MAX`; getuige ≠ gever/ontvanger, geen proeftijd); + `PHOTO_BONUS` voor
   tijdige in-app-foto. Weergave uitsluitend als tier-chip, nooit als getal, en het
   onderliggende getal wordt licht gefuzzed (±0.03, per award deterministisch geseed op
   award-id zodat het stabiel is): `< 0.5` "Onbevestigd gerucht" · `0.5–0.65` "Volgens
   zeggen" · `0.65–0.9` "Ooggetuige bevestigd" · `≥ 0.9` "Gecertificeerd legendarisch" ·
   betwist: "Betwist 🤨".
3. **Effectieve puntwaarde** van een award =
   `RARITY_POINTS[rarity] × gever-Cred × paar-gewicht × wederkerigheids-gewicht × verval`.
   Paar-gewicht en wederkerigheid per §4. Verval: exponentieel met halfwaardetijd
   `DECAY_HALFLIFE_DAYS` (alleen voor scores/ranglijsten; de badge zelf blijft).
4. **Gever-Cred** ∈ [`CRED_MIN`,`CRED_MAX`], start `CRED_START`: +`CRED_UP_PER_VOUCH` per
   bevestigde award, −`CRED_DOWN_PER_DISPUTE` per betwiste. Instap in één recursiestap —
   geen PageRank.
5. **Betrouwbaarheidsindicator op profiel** (BeReal-stijl metadata, speels): "Awards van
   Jesse worden in 84% van de gevallen bevestigd" — Bayesian-gladgestreken:
   `(bevestigd + 1) / (totaal + 3)`.
6. **Dispute**: `DOUBT_THRESHOLD` doubts van gebruikers met Cred ≥ `DOUBT_MIN_CRED` →
   status `disputed`: chip "Betwist 🤨", geen punten, geen ranglijst. Ontvanger kan
   counteren: nieuwe getuige of foto heropent de beoordeling (vouches > doubts → hersteld).
   Geen formeel beroepsproces — het blijft een grap, geen rechtbank.
7. **Nachtelijke anomalie-job** (`node jobs/anomaly.js`, ook handmatig startbaar; SO-stijl
   *stil*): detecteert de patronen uit §4 (paar-aandeel, pingpong, bursts) → zet
   betreffende award-gewichten op 0 (veld `anomaly_zeroed`), bij herhaling soft-ban van
   `SOFT_BAN_HOURS` op geven. Geen notificatie aan de dader; de badge blijft zichtbaar.
   Alle beslissingen gelogd in een `moderation_log`-tabel (latere ML-trainingsdata).
8. **Milestone-diversiteitseis** (§4, Discourse): automatische badges (#106–#120) tellen
   alleen awards die de ≥N/5-gevers- en ≥N/4-dagen-eis halen.

## 9. Datamodel (`schema.sql`)

`users` (id, username UNIQUE, display_name, password_hash, avatar_emoji, bio, cred REAL
DEFAULT 0.5, created_at) · `friendships` (user_a, user_b, UNIQUE-paar — wederzijds bij
acceptatie; nodig voor proeftijd- en league-logica) · `badges` uit `badges.json` geladen
(id, slug UNIQUE, naam, emoji, categorie, rarity, beschrijving, is_secret, chain_slug,
chain_step) · `awards` (id, badge_id, giver_id, recipient_id CHECK(giver_id != recipient_id),
citation, photo_path NULL, photo_late INTEGER, status TEXT CHECK IN
('active','disputed','restored'), anomaly_zeroed INTEGER DEFAULT 0, created_at; INDEX
(recipient_id, created_at DESC), INDEX (created_at DESC)) · `vouches` (award_id, user_id,
stance CHECK IN ('vouch','doubt'), created_at, UNIQUE(award_id, user_id)) · `reactions`
(award_id, user_id, emoji, UNIQUE(award_id, user_id, emoji)) · `notifications` (user_id,
type, award_id NULL, read INTEGER DEFAULT 0, created_at; INDEX (user_id, read)) ·
`sessions` (token PK, user_id, expires_at) · `moderation_log` (award_id, rule, action,
created_at). Dagbudget = COUNT-query op `awards`, geen aparte tabel. Badge-levels en
automatische badges retroactief berekend.

## 10. Milestones (gated — checkpoint moet slagen vóór de volgende)

- **M1 Fundament**: repo-structuur, schema, constants, seed, auth, sessies.
  CHECKPOINT auto: `node seed.js && node server.js` start zonder errors; registratie +
  login + logout werken via curl. Handmatig: log in als Jesse/demo123.
- **M2 Catalogus & profielen**: badges.json (alle 120), cataloguspagina met filters,
  profielpagina's. CHECKPOINT: catalogus toont 120 badges waarvan 7 als "???"; filter
  op "ondeugd" toont alleen ondeugd-badges; profiel Fatima toont geseedede plank.
- **M3 Award-flow**: modal, dagbudget, citatie-validatie, stempel-animatie, zelf-award
  onmogelijk (UI én server-side 403). CHECKPOINT: 6e award op één dag wordt geweigerd met
  nette melding; POST met giver==recipient → 403; award verschijnt direct in feed.
- **M4 Feed, reacties, notificaties**: polling, vier states, reactie-toggles, bel met
  teller. CHECKPOINT: award van gebruiker A verschijnt binnen `POLL_MS` bij gebruiker B
  (twee ingelogde sessies); ongelezen-teller klopt en reset.
- **M5 Geloofwaardigheid**: credibility.js (puur + unit-tests), getuigen, doubts,
  dispute/herstel, gever-Cred, tier-chips, effectieve punten, anomalie-job.
  CHECKPOINT auto: `node --test` — testcases voor paar-cap (4e award A→B weegt 0.5),
  wederkerigheid (B→A na 24u weegt 0.5), dispute-drempel, verval-halfwaardetijd,
  determinisme (zelfde input → zelfde score, 2×). Handmatig: 2 doubts van hoge-cred-users
  zetten kaart op "Betwist 🤨"; getuige heropent.
- **M6 Ranglijst & automatische badges**: leagues, Engelen/Duivels-tabs, chain-badges,
  secret-badge-triggers, level-berekening. CHECKPOINT: seed-data levert minstens één
  chain-brons en één secret-unlock op; ranglijst gerangschikt op cred-gewogen punten
  (verifieer met bekende seed-verwachting).
- **M7 Hardening & polish** (de "laatste 30%"): alle vier states op elk oppervlak nalopen,
  foutcopy veld-specifiek, load-animatie, a11y-pass (contrast, focus, targets),
  favicon+titel, README met start- en demo-instructies. CHECKPOINT: volledige
  acceptatielijst (§11) groen.

## 11. Acceptatiecriteria (binair, allemaal verplicht)

1. `npm install && node seed.js && node server.js` werkt op een kale machine; app op :3000.
2. Zelf-award is onmogelijk: UI biedt het niet aan én server weigert met 403. (Given
   ingelogd als Jesse, When POST /awards met recipient=jesse, Then 403 + foutmelding.)
3. 6e award binnen één dag → geweigerd met de exacte budgetmelding; om 00:00 reset.
4. Award van A is binnen 8 s zichtbaar bij B zonder handmatige refresh.
5. 2 doubts van gebruikers met Cred ≥ 0.75 → chip "Betwist 🤨" + 0 punten; extra getuige
   herstelt.
6. `node --test` slaagt; scoringsfuncties deterministisch (zelfde input 2× → identiek).
7. Catalogus bevat ≥ 120 badges; secret badges nergens met naam zichtbaar vóór unlock.
8. Vier states aanwezig op feed, catalogus, notificaties en profiel-plank.
9. Nul console-errors; nul dode knoppen (elke zichtbare control doet zijn beschreven actie);
   nul placeholder-strings.
10. Tekstcontrast ≥ 4,5:1 (≥ 3:1 voor tekst ≥ 18 px en UI-componenten); klikdoelen ≥ 44 px;
    zichtbare focus-stijlen.
11. Geen hardgecodeerde kleuren of tunables buiten de tokens (§5) en constants (§4).
12. Fonts zijn Fraunces/Karla/IBM Plex Mono — nergens Inter/Roboto/systeemfont.
13. Rarity is altijd óók als tekstlabel zichtbaar, nooit alleen kleur.
14. Anomalie-job draaibaar als los script; zeroing zichtbaar in moderation_log, onzichtbaar
    voor de dader.

## 12. Boundaries

- **Altijd doen**: elke milestone afsluiten met zijn checkpoint; unit-tests voor alle
  scoringslogica; alle copy in het Nederlands; commit per milestone.
- **Eerst vragen**: schema-wijzigingen ná M1; nieuwe dependencies buiten express +
  better-sqlite3; wijzigingen aan getallen in constants.js.
- **Nooit doen**: externe services of CDN's aanroepen (fonts lokaal); tracking; badge-data
  in de client als source of truth; scores client-side berekenen; secret-badge-triggers
  naar de client lekken; het VERBODEN-blok uit §5 schenden.

## 13. Zelf-check-ritueel vóór "klaar"

Loop de volledige lijst uit §11 langs en rapporteer per criterium pass/fail met bewijs
(command-output of screenshot). Screenshot minimaal: feed gevuld, feed leeg, award-modal
stap 3, betwiste kaart, catalogus met "???"-badges, profiel-plank, ranglijst. Squint-test
tegen het stijlanker: leest het als een padvindershandboek uit 1962 — of als een
AI-startpagina? Bij het tweede: herzie §5-implementatie vóór oplevering.

---

## 14. Feature-uitbreiding: badges weggeven via QR-code

**Idee**: een badge fysiek "overhandigen". De gever kiest badge + citatie, de app toont een
QR-code; de ontvanger scant hem met de telefooncamera en claimt de badge. Omdat scannen
alleen kan als je bij elkaar bent, is een QR-claim zelf bewijs van co-locatie — sterker
dan een getuige-tik (precedent: Pokémon GO friend-QR's, event-check-in-flows, BeReal's
in-het-moment-principe).

**Bestaand dat niet mag breken**: award-flow via persoon-kiezer, dagbudget, alle
geloofwaardigheidsregels, bestaande tests.

**Spec (exacte waarden — nieuwe constants):**
- `QR_TOKEN_TTL_MIN: 10` — een claim-token verloopt na 10 minuten (kort venster =
  scherm-screenshot doorsturen is zinloos), en is strikt éénmalig.
- `QR_BONUS: 0.2` — een geclaimde QR-award krijgt +0.2 op de geloofwaardigheid
  (basis 0.5 + 0.2 = 0.7 → start al op "Ooggetuige bevestigd"); kaart toont
  "🤝 In persoon overhandigd".
- Dagbudget: het aanmaken van een QR-token telt mee in het budget van 5
  (openstaande tokens + gegeven awards vandaag); verlopen tokens geven het
  budget automatisch terug.
- Claim-regels: claimer moet ingelogd zijn (of registreert ter plekke), claimer ≠
  gever (403 met nette melding), token onbekend/verlopen/gebruikt → specifieke
  foutpagina per geval.
- Data: tabel `award_tokens` (token PK, giver_id, badge_id, citation, created_at,
  expires_at, claimed_award_id NULL). QR-inhoud: absolute claim-URL `/claim/<token>`.
- QR-rendering: `qrcode` npm-package (puur JS, geen externe calls at runtime).
- UI: award-modal krijgt bij stap 1 een keuze "👤 Kies persoon" / "📱 Via QR".
  In QR-modus: alleen badge + citatie (getuigen overbodig — het ís al in persoon);
  na aanmaken toont de modal de QR + resterende geldigheid en pollt op claim-status;
  bij claim: "Geclaimd door {naam}! 🎉" + stempel-animatie in de feed.
- Notificatie aan de gever bij claim.

**Acceptatie (binair):** (a) token claimen op tweede ingelogde sessie zet de badge
op de plank van de claimer met "🤝 In persoon overhandigd" en tier ≥ "Ooggetuige
bevestigd"; (b) tweede claim van hetzelfde token → foutpagina "al gebruikt";
(c) claim door de gever zelf → 403; (d) verlopen token → foutpagina "verlopen" en
budget-teruggave; (e) bestaande unit-tests + e2e blijven groen.
