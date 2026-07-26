# Aura 🏵️ — Real Life Achievements

Een multi-user web-app waarin echte mensen elkaar badges toekennen voor daden in het
echte leven: goede daden (een pluim 😇) én ondeugende daden (een duiveltje 😈).
Jezelf een badge geven kan niet — roem moet je gegund worden.

## Twee smaken

1. **Volledige app** (server + database, multi-user tussen apparaten) — zie "Starten" hieronder.
2. **Statische prototype** (`docs/index.html`) — volledig client-side met
   localStorage, hostbaar op GitHub Pages zónder server. Handig om rond te laten
   zien en te spelen op één apparaat. Bouwen: `node build-static.js`. Data blijft
   per browser bewaard (geen deling tussen telefoons — dat vereist de server-versie).
   Publiceren op Pages: zet **Settings → Pages → Source = GitHub Actions**; de
   workflow in `.github/workflows/pages.yml` deployt `docs/` automatisch.

## Starten (volledige app)

```bash
npm install
node seed.js      # maakt de database met 8 demo-gebruikers en een levende feed
node server.js    # → http://localhost:3000
```

Inloggen met een demo-account: `jesse`, `fatima`, `henk`, `lena`, `omar`, `sanne`,
`ruben` of `priya` — wachtwoord `demo123`. Open twee browservensters (of een
incognitovenster) met verschillende accounts om het multi-user-effect te zien:
een award van de een verschijnt binnen 8 seconden bij de ander.

## Wat zit erin

- **132 badges** in de catalogus (`badges.json`): goede daden, ondeugd, sociale
  meesterproeven, kantoorleven, legendarische daden, 7 geheime badges en 6
  brons/zilver/goud-ketens. Elke badge levelt Untappd-stijl bij elke 5e ontvangst.
- **Award-flow**: kies persoon → kies badge → schrijf een citatie (het verhaal is
  de helft van de badge) → tag optioneel getuigen → maak optioneel een live
  bewijsfoto. Maximaal 5 toekenningen per dag (schaarste maakt betekenis).
- **Overhandigen via QR** 🤝: kies in de award-modal "📱 Via QR" — de app toont
  een QR-code die 10 minuten geldig is en strikt éénmalig werkt. De ontvanger
  scant hem met de telefooncamera en claimt de badge. Omdat scannen alleen kan
  als je bij elkaar staat, telt een QR-claim als fysiek bewijs: de badge start
  meteen op "Ooggetuige bevestigd" en draagt het zegel "in persoon overhandigd".
- **Geloofwaardigheidssysteem** ("soft integrity" — de actie slaagt altijd, alleen
  de beloningslaag discrimineert, stilletjes):
  - Elke award krijgt een geloofwaardigheids-tier: *Onbevestigd gerucht* →
    *Volgens zeggen* → *Ooggetuige bevestigd* → *Gecertificeerd legendarisch*.
    Getuigen (✋) en tijdige foto's tillen hem omhoog; twijfels (🤨) van
    betrouwbare leden maken hem *Betwist* — zichtbaar, maar zonder punten.
  - Punten wegen mee: gever-reputatie, paar-cap (steeds dezelfde persoon badgen
    telt af), wederkerigheids-demping (badge terug binnen 48 u telt half),
    verval met 90 dagen halfwaardetijd en een proeftijd voor nieuwe accounts.
  - `node jobs/anomaly.js` draait de nachtelijke heuristieken: verdachte
    patronen (badge-ringen, pingpong, bursts) worden stil op nul gewogen en
    gelogd in `moderation_log`; herhaalde overtreders krijgen een soft-ban.
- **Feed** met reacties, **notificaties**, **profielen** met badge-plank en
  betrouwbaarheidsscore, en een **wekelijkse ranglijst** met aparte
  Engelen- en Duivels-tabs (bewust géén eeuwige globale ranglijst).
- **De Aura-raad** 🏛️ — de systeemgebruiker die automatische badges toekent
  (ketens, seizoens- en verzamelmijlpalen, geheime triggers).

## Commando's

| Commando | Doel |
| --- | --- |
| `node server.js` | Start de app op poort 3000 |
| `node seed.js` | Verse database met demo-data (verwijdert de bestaande) |
| `node --test` | Unit-tests voor alle scoringslogica |
| `node jobs/anomaly.js` | Nachtelijke anti-collusie-job |

## Architectuur

Node.js + Express + better-sqlite3 (SQLite in WAL-mode), server-rendered HTML met
vanilla JS, nul externe diensten (fonts lokaal). Eén `awards`-tabel ís de feed.
Alle getunede getallen staan in `constants.js`; alle score-wiskunde in
`credibility.js` (puur en deterministisch); ontwerp-onderbouwing met bronnen in
`RESEARCH.md`; de volledige bouwspec in `PROMPT.md`.
