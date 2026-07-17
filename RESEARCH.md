# RESEARCH.md — Real Life Achievements App

Evidence trail voor het ontwerp. Elke sectie is een gedateerd addendum uit web-research.

---

## Addendum 2026-07-17 — Achievement/badge-design & architectuur

### Wat achievements leuk maakt (i.p.v. saai/grindy)
- Kernvraag per achievement (Game Developer, "Achievement Design 101"): *waarom is dit moeilijk, en is die reden leuk?* Achievements werken als ze een echt, memorabel moment erkennen; ze falen als ze een willekeurig getal eisen ("1000x hetzelfde").
- Variatie > volume: geen twaalf bijna-identieke badges.
- Duolingo-data: streaks tilden next-day retention van 12% → 55%; badge-lancering gaf +116% vrienden-toevoegingen. Optimaliseer voor "komt de gebruiker morgen terug".
- Strava: duizenden kleine, lokale leaderboards (segmenten, Local Legend = meeste completions in 90 dagen) i.p.v. één globaal bord — alleen kleine borden blijven winbaar. Kudos = one-tap sociale validatie.
- Foursquare-les: badges/mayorships werkten bij 50k users/dag, stortten in bij 50M — schaarste en winbaarheid moeten groei overleven; scope competitie naar kleine vriendenkringen.
- HeyTaco: elke gebruiker mag 5 taco's/dag géven — cap op het geven (niet het ontvangen) houdt erkenning betekenisvol; 67% dagelijkse engagement vs 35–45% industrie-gemiddelde.

### Taxonomie, tiers en puntwaarden (geteste getallen)
- Kongregate: Easy 5 / Medium 15 / Hard 30 / Impossible 60 punten — legible en battle-tested.
- PlayStation: Bronze 15 / Silver 30 / Gold 90 / Platinum 300; Platinum = meta-badge voor "alle andere gehaald".
- GitHub: tiered thresholds (Pull Shark: 2/16/128/1024) + one-shot gedragsbadges — "YOLO" (mergen zonder review) bewijst dat licht-ondeugende badges geliefd zijn.
- Untappd: badge levelt elke 5 kwalificerende check-ins, retroactief berekend uit historie — geen aparte level-tabel nodig.
- Scouts BSA: ~135 merit badges; elke badge heeft een menselijke "counselor" die vereisten aftekent → het menselijke-attestatie-model voor IRL-daden.
- Secret badges: toon dát iets bestaat (silhouet/"???") zonder de trigger te verklappen (Newgrounds, Stanley Parable). Stanley Parable's "Unachievable" (onhaalbaar by design, 4.4% heeft hem toch) = cheater-detector.

### Humor-formule voor badge-namen
Popcultuur/meme-referentie + woordspeling op de daad + dodelijk serieuze formele beschrijving van een absurde handeling. De humor zit in het páár naam+beschrijving, niet de naam alleen. Voorbeelden uit het wild: "Turd Burglar" (Duke Nukem), "Go Outside" (Stanley Parable, 5 jaar niet spelen), "Little Rocket Man" (HL2, tuinkabouter het hele spel meedragen), "YOLO" (GitHub), "Das Boot" (Untappd).

### Visueel badge-ontwerp
- Moet leesbaar zijn op 16–24 px; test op 64/128 px.
- Cirkels, schilden, hexagonen = sterkste silhouetten; één centraal symbool, geen collage.
- Tier-communicatie: metallic ladder (brons → zilver → goud → platina) + label of vormverschil (nooit alleen kleur — toegankelijkheid).
- Goedkoopste schaalbare pipeline: emoji-als-embleem in een tier-gekleurde ring — duizenden leesbare badges zonder art-pipeline.

### Landschap "IRL achievement"-apps
Habitica/SuperBetter/Forest = self-award. HeyTaco/Bonusly = peer-award maar corporate. Foursquare/Swarm = de kanonieke IRL-badge-arc incl. ondergang. **Gat in de markt: peer-to-peer awarding van zowel deugdzame als ondeugende IRL-daden is onbezet.** Toon-precedent: Borderlands/Stanley Parable-humor, niet corporate recognition.

### Architectuur-aanbeveling
- **Stack: Node.js + Express + better-sqlite3 (SQLite, WAL-mode) + server-rendered HTML + vanilla JS.** Eén repo, nul externe services, `npm i && node server.js`.
  - SQLite-config: `PRAGMA journal_mode=WAL; busy_timeout=5000; synchronous=NORMAL; foreign_keys=ON`.
  - better-sqlite3 is synchroon — geen async races.
  - Next.js afgewezen (overkill, geen SSR/SEO-eis); localStorage-mock afgewezen (kan multi-user niet demonstreren).
- Auth: username+wachtwoord, scrypt (node:crypto, nul deps), httpOnly session-cookie + sessions-tabel. Geen e-mailverificatie (demo).
- Feed: één `awards`-tabel ís de feed (actor/verb/object/target-schema), fan-out-on-read, polling elke 5–10 s. Schema is moeilijk te veranderen, delivery-mechanisme makkelijk — SSE kan later.
- Demo multi-user: seeded demo-accounts + twee browservensters.

### Datamodel-schets
- `users`: id, username, display_name, password_hash, avatar_emoji, bio; cached: karma_good, karma_mischief, reputation.
- `badges`: slug, naam, beschrijving, emoji, categorie, rarity→punten (5/15/30/60), is_secret, chain-info.
- `awards`: badge_id, giver_id, recipient_id (CHECK giver != recipient), citation (het verhaal), status ('active'/'disputed'/'revoked'), created_at. Index op (recipient_id, created_at DESC).
- `vouches`: award_id, voucher_id, stance ('vouch'/'dispute'), UNIQUE(award_id, voucher_id), CHECK voucher ∉ {giver, recipient}.
- `reactions`, `notifications`, `sessions`.
- Dagelijkse give-cap: gewoon een COUNT-query, geen tabel.
- Badge-levels retroactief berekend uit award-historie (Untappd-model).

### Bronnen
gamedeveloper.com (Achievement Design 101) · docs.retroachievements.org · kongregatesupport.zendesk.com · newgrounds.fandom.com · learn.microsoft.com (GDK achievements) · psnprofiles.com trophy guide · help.untappd.com badge levels · en.wikipedia.org/wiki/Foursquare_City_Guide · centrical.com retrospectives · trophy.so (Duolingo/Strava case studies) · scouting.org merit badges · heytaco.com/how · github.com/Schweinepriester/github-profile-achievements · sertifier.com & credly badge-designgidsen · getstream.io activity-feed-architectuur · buildingreputation.com · HN-threads over SQLite-in-productie en Next.js-kritiek.

---

## Addendum 2026-07-17 — Geloofwaardigheids-/reputatiesysteem (peer-attestation)

### Kernlessen uit bestaande systemen
- **LinkedIn endorsements (wat NIET te doen)**: nul verificatie + one-tap frictie + systeem-suggesties = betekenisloos. Als een attestatie niets kost en door het systeem wordt aangespoord, draagt ze geen informatie.
- **Stack Overflow**: 30 stemmen/dag cap; nachtelijke batch-scripts die verdachte stempatronen *stilletjes* terugdraaien (paar-detectie: "A stemt >X% op B").
- **Slashdot**: schaarse, verlopende mod-punten (5 punten, 3 dagen geldig); metamoderatie = willekeurige gebruikers beoordelen de eerlijkheid van eerdere moderaties → "rate the rater".
- **eBay**: wederkerigheids-doodsspiraal — 37%+ kans op vergeldingsnegatief; opgelost door gelijktijdigheid te breken. Les: wederkerige beoordelingen tellen minder.
- **Reddit**: score-fuzzing (getoonde scores licht verstoord zodat colluders hun effect niet kunnen meten); Wilson 95% lower bound voor "best" sortering.
- **Foursquare ("cheater code") / Strava / Pokémon GO — het "soft integrity"-principe**: blokkeer de actie nooit; laat alleen de beloning/geloofwaardigheid stilletjes degraderen. Hét precedent voor een speelse app.
- **BeReal**: authenticiteit via transparante metadata ("late", "3 retakes" publiek zichtbaar) i.p.v. handhaving — vrienden oordelen zelf.
- **Discourse trust levels**: kant-en-klare diversiteitsregel — N events moeten ≥N/5 verschillende gebruikers en ≥N/4 verschillende dagen beslaan; rollend 100-dagen-venster met degradatie.
- **HeyTaco**: 5 awards/dag, dagelijks verlopend; limiet van 4–6/dag geeft de meest consistente participatie; schaarste ís de betekenis-maker.
- **Lobsters**: proeftijd voor nieuwe accounts; zichtbare uitnodigingsboom maakt ringen zichtbaar.
- **Wetenschap (arXiv 1606.02597)**: wederkerige ratings dragen onevenredig bij aan reputatie; minst-actieve gebruikers zijn de grootste bron van reciprocity-bias.
- **EigenTrust/Advogato**: "een award is de geloofwaardigheid van de gever waard" — één recursiestap (award-waarde × gever-cred) vangt ~90% van het voordeel zonder eigenvector-machinerie.

### Scoring-wiskunde: simpelste dat werkt
Additieve punten × gever-cred-gewicht, met paar-caps, diversiteitseisen en exponentieel verval; Bayesian smoothing ((confirms+1)/(reactions+3)) voor geloofwaardigheids-weergave. Géén PageRank/eigenvectors nodig op vriendenkring-schaal.

### Aanbevolen ontwerp (concrete getallen, elk herleidbaar naar een shipped precedent)
1. **Award-economie**: 5 awards/gebruiker/dag, verlopen om middernacht (HeyTaco). Nieuwe accounts (<14 dagen of <3 wederzijdse vrienden): awards tellen 0,25×, geen witness/dispute-rechten (Lobsters-proeftijd, verzacht).
2. **Per-award geloofwaardigheid** (start 0,5): +0,15 per onafhankelijke getuige (max 3; getuige moet vriend van beiden zijn); +0,15 voor in-app-foto binnen 10 min (BeReal-stijl: geen camerarol, wel "laat"-label); +0,1 voor plausibele co-locatie (opt-in). Getoond als speelse tiers, nooit als getal: "Onbevestigd gerucht" → "Ooggetuige bevestigd" → "Gecertificeerd legendarisch". Onderliggende score gefuzzed (Reddit).
3. **Anti-collusie (stil toegepast op score-laag, award "slaagt" altijd)**: paar-cap A→B: eerste 3 per 30 dagen vol, 4–6 op 50%, daarna 10%. Wederkerigheids-demping: B→A binnen 48 u na A→B telt 50% (eBay). Diversiteitseis voor milestones: N badges moeten ≥N/5 gevers en ≥N/4 dagen beslaan (Discourse). Gever-gewicht: Cred 0,25–1,5, stijgt bij bevestigde awards, daalt bij disputes; nieuwe gebruiker start op 0,5. Verval: 90-dagen-halfwaardetijd.
4. **Plausibiliteits-heuristieken (nachtelijke batch, stil)**: >50% van iemands awards naar één persoon; A↔B binnen <1 u vaker dan 2×/week; bursts (>10 in 10 min); geografisch onmogelijke reeksen; gesloten subgrafen waar >70% van awards binnen blijft. Handhavingsladder: stil op nul wegen → soft ban op geven (24–72 u) → uitsluiting van leaderboards. Badge nooit van de plank verwijderen — hij verliest alleen zijn "geverifieerde" glans.
5. **Dispute-flow (grap, geen rechtbank)**: elke vriend kan "Betwijfel ik 🤨" tikken; 2+ doubts van gebruikers met Cred ≥0,75 → badge naar "Betwist"-tier (zichtbaar, grappig geframed), geen leaderboard-credit; ontvanger kan counteren met bewijs of getuige.
6. **Status-oppervlakken**: géén globaal leaderboard (Duolingo-les); ranking alleen binnen vriendenkring/wekelijkse leagues ≤30, gerangschikt op cred-gewogen score. Elke badge toont trots zijn herkomst: gever, getuigen, cred-tier — sociale zichtbaarheid onder echte vrienden is het werkelijke handhavingsmechanisme.

### Bronnen
stackoverflow.blog vote-fraud (2008) · arxiv.org/2111.07101 (SO reputation gaming) · slashdot.org/moderation.shtml · eBay-retaliatiestudies (uni-muenchen, arXiv 1810.13028) · evanmiller.org how-not-to-sort · julesjacobs.com bayesian-scoring · techcrunch.com Foursquare cheater code · arXiv 2408.02883 (BeReal) · Couchsurfing-vouchingstudie · lobste.rs/about · blog.discourse.org trust levels · heytaco.com/research · stories.strava.com leaderboard-integriteit · arXiv 1606.02597 excess reciprocity · nlp.stanford.edu EigenTrust · levien.com Advogato · SybilGuard (Yu 2006) · v5challenge.com / prooof.social (friend-verificatie-apps).

---

## Addendum 2026-07-17 — Master-prompt-craft (prompting-technieken)

### Workflow-consensus
- **Harper Reed / Simon Willison**: drie fasen — spec.md (idea honing) → prompt_plan.md (kleine, testbare, voortbouwende stappen) → uitvoering met tests tussen stappen. Elke stap eindigt geïntegreerd ("no orphaned code").
- **GitHub Spec Kit**: requirements als "System MUST …" (genummerd FR-###); succescriteria meetbaar en technologie-agnostisch (SC-###); `[NEEDS CLARIFICATION: …]`-conventie i.p.v. stil gokken; "checklists are unit tests for English".
- **Addy Osmani**: drie-laags boundaries — *Always do / Ask first / Never do*.
- **Milestone-gating**: elke milestone een CHECKPOINT (automatisch: build/tests slagen; handmatig: "klik Y, verwacht Z") — "ga niet door naar M2 tot M1-checkpoint slaagt". Een bug op spec-niveau kost één zin; op executie-niveau een debugsessie.
- Optimale promptlengte per uitvoeringsstap: 400–1.200 woorden gestructureerd.

### Anti-"AI-slop" stijlverankering
- Gedocumenteerde default-faalmodus: paarse gradient op wit, Inter/Roboto, drie feature-boxen met iconen.
- **Claude Cookbook (frontend aesthetics)**: benoem de faalmodus expliciet aan het model ("you tend to converge toward generic 'on distribution' outputs — avoid this"); expliciete verboden-lijst is de effectiefste enkele techniek; "dominant colors with sharp accents outperform timid, evenly-distributed palettes"; gewicht-extremen in typografie (100/200 vs 800/900), 3×+ groottesprongen; motion: één georkestreerde load-sequence > verspreide micro-interacties.
- **Anthropic frontend-design skill**: ook "smaakvolle" defaults zijn slop geworden (warm crème #F4F1EA + serif + terracotta; near-black + acid-green) — verboden-lijst per modelgeneratie updaten. Palet als compact token-systeem: 4–6 benoemde hexwaarden.
- **DESIGN.md-patroon (Google Labs)**: persistente tokens (kleuren/typografie/spacing/radius) + proza-rationale; "vijf schermen mét design.md houden stijl vast, vijf zonder driften".
- Benoemde stijlankers werken ("Gruvbox terminal", "Japans briefpapier"), bijvoeglijke naamwoorden ("modern, clean") niet.
- Echte content verslaat lorem ipsum — lay-out wordt op echte data afgestemd.

### Zelf-checkbare acceptatiecriteria
- Elk criterium binair ("passes or fails with no middle state"); verboden bijwoorden: "netjes", "correct", "gracieus", "intuïtief".
- Concrete getallen: LCP < 2,5 s; contrast ≥ 4,5:1 (3:1 groot/UI); touch targets ≥ 44 px; 60 fps; nul console-errors; nul dode knoppen; nul placeholders.
- Vier UI-states per data-oppervlak: leeg (met vervolg-actie), laden (skeleton), fout (specifiek + retry), gevuld.
- Determinisme: "zelfde seed → identiek resultaat" als testbaar criterium.

### AI-faalmodi + guards (top 10)
1. Generieke slop-visuals → verboden-lijst + gelockte tokens + benoemd stijlanker.
2. Placeholder-content → echte seed-data + regel "nul lorem ipsum".
3. Dode UI → elk interactief element opgesomd met exact gedrag + click-through-checkpoint.
4. Alleen happy path → vier-states-eis per oppervlak.
5. Inconsistente state → één source of truth, persistentie-contract.
6. Toegankelijkheid faalt by default → numerieke a11y-criteria vanaf prompt één.
7. Stijldrift tussen schermen → persistent token-blok, elk scherm ernaar terugverwijzen.
8. Over-animatie leest als AI → motion-budget.
9. Stil scope-gokken → [NEEDS CLARIFICATION]-conventie.
10. "Laatste 30% overgeslagen" (error handling, hardening) → expliciete hardening-milestone.

### Bronnen
harper.blog llm-codegen-workflow · github.com/github/spec-kit · addyosmani.com/blog/good-spec · platform.claude.com cookbook frontend-aesthetics · github.com/anthropics/skills frontend-design · github.com/google-labs-code/design.md · lovable.dev prompting handbook · braingrid.ai acceptance-criteria & design-system gidsen · prg.sh & techbytes.app anti-slop-artikelen · frontendmasters.com "AI-Generated UI Is Inaccessible by Default" · dev.to reviews van vibe-coded codebases · medium.com Zhbankov Prompt-Driven Development.
