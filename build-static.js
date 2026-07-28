// Genereert de zelfstandige statische app (docs/index.html) van Aura:
// fonts als data-URI, badge-catalogus ingebed, interactieve feed/modal/catalogus.
// Volledig client-side met localStorage-opslag — hostbaar op GitHub Pages of
// elke statische host, zonder server. Draai met: node build-static.js
const fs = require('fs');
const path = require('path');
const APP = __dirname;


// Catalogus: zelfde ontvouwing van ketens als db.js
const raw = JSON.parse(fs.readFileSync(path.join(APP, 'badges.json'), 'utf8'));
const STEP_LABEL = ['Brons', 'Zilver', 'Goud'];
const STEP_RARITY = ['uncommon', 'rare', 'legendary'];
const badges = [];
for (const b of raw) {
  if (b.chain) {
    b.chain.thresholds.forEach((n, i) => badges.push({
      slug: `${b.slug}-${STEP_LABEL[i].toLowerCase()}`,
      naam: `${b.naam} · ${STEP_LABEL[i]}`,
      emoji: b.emoji, categorie: b.categorie, rarity: STEP_RARITY[i],
      beschrijving: b.beschrijving.replace('{N}', String(n)), auto: true,
    }));
  } else {
    badges.push({ slug: b.slug, naam: b.naam, emoji: b.emoji, categorie: b.categorie,
      rarity: b.rarity, beschrijving: b.beschrijving, secret: !!b.secret, auto: !!b.auto });
  }
}

const QRCode = require(path.join(APP, 'node_modules/qrcode'));
let QR_SVG = '';
const html = `<!DOCTYPE html>
<html lang="nl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Aura</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="82" font-size="82">✨</text></svg>')}">
<style>
/* Stijlbijbel v4: moderne app/OS-look — systeem-font, indigo accent, squircle-badges. */
:root{--bg:#F2F3F7;--surface:#FFFFFF;--surface-2:#EBECF2;--ink:#16161C;--ink-dim:#6B6B78;
--accent:#5B57E8;--accent-deep:#4B47D0;--accent-soft:rgba(91,87,232,.12);
--halo:#0F7D3E;--halo-soft:rgba(15,125,62,.12);--mischief:#D42B4C;--mischief-soft:rgba(212,43,76,.12);
--bronze:#8A6236;--silver:#686F7A;--line:rgba(22,22,28,.1);--line-strong:rgba(22,22,28,.16);--glass:rgba(255,255,255,.85);
--sh:0 1px 2px rgba(22,22,28,.06),0 4px 16px rgba(22,22,28,.08);
--sh-lift:0 12px 32px rgba(22,22,28,.16);
--s1:4px;--s2:8px;--s3:16px;--s4:32px;--r:14px;--rl:20px;
--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Helvetica Neue',Arial,sans-serif}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;font-family:var(--font);font-size:16px;line-height:1.55;color:var(--ink);
-webkit-font-smoothing:antialiased;
background:radial-gradient(1000px 420px at 50% -200px,rgba(91,87,232,.12),transparent),var(--bg);
min-height:100vh;padding-bottom:96px}
h1,h2{font-weight:800;margin:0 0 var(--s2);letter-spacing:-.02em}
h1{font-size:34px;line-height:1.08;text-wrap:balance}
h2{font-size:22px}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-deep);margin:var(--s3) 0 var(--s1)}
.muted{color:var(--ink-dim)}
.mono{font-variant-numeric:tabular-nums}
.wrap{max-width:640px;margin:0 auto;padding:0 var(--s3)}
header.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:var(--s2);
padding:12px var(--s3);border-bottom:1px solid var(--line);background:var(--glass);backdrop-filter:blur(12px)}
.brand{font-weight:800;font-size:20px;letter-spacing:-.02em;margin-right:auto}
select.as{background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);
border-radius:var(--r);padding:8px 10px;font-family:var(--font);font-size:14px;min-height:44px}
.btn{font-family:var(--font);font-weight:700;font-size:15px;background:var(--accent);color:#fff;
border:none;border-radius:999px;padding:11px 18px;min-height:44px;cursor:pointer;box-shadow:var(--sh);
transition:transform .1s ease,box-shadow .12s ease,filter .12s ease}
.btn:hover{filter:brightness(1.06);box-shadow:var(--sh-lift)}
.btn:active{transform:scale(.97);filter:brightness(.96)}
.btn:disabled{opacity:.4}
.btn-ghost{background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);box-shadow:none}
.btn:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--rl);
padding:var(--s3);margin-bottom:var(--s3);box-shadow:var(--sh)}
.award{display:grid;grid-template-columns:56px 1fr;gap:var(--s3)}
.award.disputed{opacity:.66;box-shadow:none;border-style:dashed}
.ring{width:52px;height:52px;border-radius:17px;display:flex;align-items:center;justify-content:center;
font-size:26px;background:var(--surface-2);border:2px solid var(--bronze);flex-shrink:0}
.ring.uncommon{border-color:var(--silver)}
.ring.rare{border-color:var(--accent);background:var(--accent-soft)}
.ring.legendary{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 4px var(--accent-soft)}
.ring.secret{border-style:dashed;border-color:var(--ink-dim);color:var(--ink-dim);font-size:15px;font-weight:700}
.rlabel{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.rlabel.common{color:var(--bronze)}.rlabel.uncommon{color:var(--silver)}
.rlabel.rare,.rlabel.legendary{color:var(--accent-deep)}
.bname{font-weight:800;font-size:18px;letter-spacing:-.01em}
.who{font-weight:700}
.head{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;font-size:14px}
.time{font-size:12px;color:var(--ink-dim);margin-left:auto}
.cite{font-size:16px;line-height:1.5;font-weight:500;border-left:3px solid var(--accent-soft);padding-left:var(--s3);margin:var(--s2) 0}
.chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;
border:1px solid var(--line-strong);border-radius:999px;padding:4px 10px;color:var(--ink-dim);background:var(--surface)}
.chip.t-legendary{color:var(--accent-deep);border-color:var(--accent);background:var(--accent-soft)}
.chip.t-confirmed{color:var(--halo);border-color:var(--halo);background:var(--halo-soft)}
.chip.t-disputed{color:var(--mischief);border-color:var(--mischief);background:var(--mischief-soft)}
.chip.c-goed{color:var(--halo)}.chip.c-ondeugd{color:var(--mischief)}
.acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--s3);align-items:center}
.rb{background:var(--surface-2);border:1px solid transparent;border-radius:999px;color:var(--ink);
font-size:13px;font-weight:600;padding:8px 12px;min-height:40px;cursor:pointer;font-family:var(--font)}
.rb.mine{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-deep)}
.meta{font-size:13px;color:var(--ink-dim);margin-top:6px}
.tabbar{position:fixed;bottom:0;left:0;right:0;z-index:40;display:flex;align-items:center;
padding-bottom:env(safe-area-inset-bottom);
border-top:1px solid var(--line);background:var(--glass);backdrop-filter:blur(14px)}
.tabbar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
background:none;border:none;color:var(--ink-dim);font-family:var(--font);
font-weight:600;font-size:11px;padding:9px 2px;cursor:pointer;min-height:56px}
.tabbar-item svg{width:24px;height:24px}
.tabbar-item.on{color:var(--accent)}
.tabbar-give{flex:0 0 auto;display:flex;align-items:center;justify-content:center;
width:52px;height:52px;margin:-14px 6px 0;border-radius:18px;
background:var(--accent);color:#fff;border:3px solid var(--surface);cursor:pointer;
box-shadow:var(--sh-lift)}
.tabbar-give svg{width:26px;height:26px}
.tabbar-give:active{transform:scale(.94)}
.backdrop{position:fixed;inset:0;background:rgba(22,22,28,.4);backdrop-filter:blur(4px);z-index:60;display:flex;
align-items:flex-end;justify-content:center}
.sheet{background:var(--surface);border:1px solid var(--line);border-bottom:none;border-radius:var(--rl) var(--rl) 0 0;
padding:var(--s3) var(--s3) calc(var(--s4) + env(safe-area-inset-bottom));width:100%;max-width:640px;max-height:88vh;overflow-y:auto;box-shadow:var(--sh-lift)}
.hidden{display:none!important}
#qr-panel svg{display:block;width:100%;height:auto}
input,textarea{font-family:var(--font);font-size:16px;background:var(--surface);color:var(--ink);
border:1px solid var(--line-strong);border-radius:var(--r);padding:11px 14px;width:100%;min-height:44px}
input::placeholder,textarea::placeholder{color:var(--ink-dim)}
textarea{resize:vertical}
label{font-weight:700;display:block;margin:var(--s3) 0 var(--s1);font-size:14px}
.plist{max-height:180px;overflow-y:auto;border:1px solid var(--line-strong);border-radius:var(--r);background:var(--surface)}
.pi{display:flex;gap:var(--s2);align-items:center;width:100%;padding:11px 14px;background:none;
border:none;border-bottom:1px solid var(--line);color:var(--ink);font-family:var(--font);
font-size:15px;cursor:pointer;text-align:left;min-height:44px}
.pi:last-child{border-bottom:none}
.pi:hover{background:var(--surface-2)}
.pi.sel{background:var(--accent-soft);color:var(--accent-deep);font-weight:700}
.pi:disabled{color:var(--ink-dim);font-style:italic;background:var(--surface-2)}
.err{background:var(--mischief-soft);border:1px solid var(--mischief);color:var(--mischief);font-weight:700;
border-radius:var(--r);padding:var(--s2) var(--s3);margin-top:var(--s2);font-size:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)}
.tile{display:flex;gap:10px;align-items:center;background:var(--surface);
border:1px solid var(--line);border-radius:var(--rl);padding:12px;min-width:0;box-shadow:var(--sh)}
.tile .ring{width:44px;height:44px;border-radius:14px;font-size:20px;border-width:2px}
.tile>div{min-width:0}
.tile .bname{font-size:14px;overflow-wrap:break-word}
.tile .desc{font-size:12px;color:var(--ink-dim)}
.stats{display:flex;gap:var(--s2);margin:var(--s2) 0 var(--s3);flex-wrap:wrap}
.stat{text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--rl);
padding:var(--s2) var(--s3);box-shadow:var(--sh)}
.stat .n{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.stat .n.g{color:var(--halo)}.stat .n.o{color:var(--mischief)}
.stat .l{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-dim)}
.rankrow{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--line)}
.rankrow:last-child{border-bottom:none}
.rankpos{font-weight:800;font-variant-numeric:tabular-nums;color:var(--ink-dim);min-width:22px;text-align:center}
.rankname{flex:1;font-weight:600}
.rankpts{font-weight:800;font-variant-numeric:tabular-nums;color:var(--accent-deep)}
.empty{text-align:center;padding:var(--s4);color:var(--ink-dim)}
.empty .big{font-size:36px}
.note{font-size:13px;color:var(--ink-dim);border:1px solid var(--line);border-radius:var(--r);padding:var(--s2) var(--s3);margin-bottom:var(--s3);background:var(--surface)}
.filters{display:flex;gap:var(--s2);margin-bottom:var(--s3);flex-wrap:wrap}
.fchip{background:var(--surface);border:1px solid var(--line-strong);border-radius:999px;
color:var(--ink-dim);font-family:var(--font);font-weight:700;font-size:13px;padding:8px 14px;min-height:40px;cursor:pointer}
.fchip.on{color:#fff;border-color:var(--accent);background:var(--accent)}
@media(prefers-reduced-motion:no-preference){
.reveal{opacity:0;transform:translateY(10px);animation:rv .45s ease-out forwards}
.reveal:nth-child(2){animation-delay:.07s}.reveal:nth-child(3){animation-delay:.14s}
.reveal:nth-child(4){animation-delay:.21s}.reveal:nth-child(n+5){animation-delay:.28s}
@keyframes rv{to{opacity:1;transform:none}}
.stamped{animation:st .35s cubic-bezier(.2,1.3,.4,1)}
@keyframes st{0%{transform:scale(1.3);opacity:0}100%{transform:none;opacity:1}}}
@media(prefers-color-scheme:dark){:root{--bg:#0F1014;--surface:#1A1B21;--surface-2:#24262E;--ink:#ECECF1;--ink-dim:#9B9BA8;--accent:#5B57E8;--accent-deep:#ADA9FF;--accent-soft:rgba(124,121,242,.2);--halo:#3FCE8A;--halo-soft:rgba(63,206,138,.18);--mischief:#FF6E88;--mischief-soft:rgba(255,110,136,.18);--bronze:#C79A5E;--silver:#A7ADB8;--line:rgba(255,255,255,.1);--line-strong:rgba(255,255,255,.18);--glass:rgba(18,19,24,.82);--sh:0 1px 2px rgba(0,0,0,.4),0 6px 20px rgba(0,0,0,.45);--sh-lift:0 12px 32px rgba(0,0,0,.55)}body{background:radial-gradient(1000px 420px at 50% -200px,rgba(124,121,242,.16),transparent),var(--bg)}}
</style>
</head><body>

<header class="top">
  <span class="brand">Aura</span>
  <label class="muted" for="as" style="font-size:12px;margin:0">Bekijk als</label>
  <select id="as" class="as" aria-label="Bekijk de app als deze gebruiker"></select>
</header>

<div class="wrap">
  <div id="view"></div>
</div>

<nav class="tabbar" aria-label="Hoofdnavigatie">
  <button class="tabbar-item on" data-tab="feed" aria-label="Feed">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.7 12 3l9 7.7"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/></svg>
    <span>Feed</span>
  </button>
  <button class="tabbar-item" data-tab="cat" aria-label="Catalogus">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/></svg>
    <span>Catalogus</span>
  </button>
  <button class="tabbar-give" id="fab" aria-label="Ken badge toe">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>
  <button class="tabbar-item" data-tab="rank" aria-label="Ranglijst">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v3a6 6 0 0 1-12 0V4Z"/><path d="M6 5H3.5v1A3 3 0 0 0 6 9"/><path d="M18 5h2.5v1A3 3 0 0 1 18 9"/><path d="M12 13v3"/><path d="M8.5 20.5a3.5 3.5 0 0 1 7 0Z"/></svg>
    <span>Ranglijst</span>
  </button>
  <button class="tabbar-item" data-tab="prof" aria-label="Profiel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0Z"/></svg>
    <span>Profiel</span>
  </button>
</nav>

<div class="backdrop hidden" id="modal">
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mt">
    <div class="eyebrow" style="margin-top:0">Officiële toekenning</div>
    <h2 id="mt">Ken een badge toe</h2>
    <p class="muted" style="font-size:14px">Vandaag nog <strong class="mono" id="budget"></strong> van 5 toekenningen.</p>
    <div class="err hidden" id="merr" role="alert"></div>
    <label>1. Wie verdient hem?</label>
    <div class="filters" role="group" aria-label="Manier van toekennen" style="margin-bottom:var(--s1)">
      <button class="fchip on" type="button" id="mode-person">👤 Kies persoon</button>
      <button class="fchip" type="button" id="mode-qr">📱 Via QR</button>
    </div>
    <div class="plist" id="mpeople"></div>
    <p class="muted hidden" id="qr-explain" style="font-size:13px;margin:var(--s1) 0 0">
      Sta je naast elkaar? Laat de ander de QR scannen — de badge telt dan als
      <strong>🤝 in persoon overhandigd</strong> en start meteen op "Ooggetuige bevestigd".</p>
    <label for="mbq">2. Welke badge?</label>
    <input id="mbq" placeholder="Zoek in de catalogus…" autocomplete="off">
    <div class="plist" id="mbadges"></div>
    <label for="mcite">3. Het verhaal (de citatie)</label>
    <textarea id="mcite" rows="3" maxlength="280" placeholder="Beschrijf de daad alsof het een koninklijke onderscheiding betreft…"></textarea>
    <div id="wit-section">
      <label>Getuigen (optioneel — maakt de badge geloofwaardiger)</label>
      <div class="plist" id="mwit" style="max-height:132px"></div>
    </div>
    <div class="hidden" id="qr-panel" style="text-align:center">
      <div style="background:var(--ink);border-radius:var(--rl);padding:var(--s2);display:inline-block;max-width:240px;margin-top:var(--s2)">__QR_SVG__</div>
      <p class="muted" style="font-size:13px">Nog <strong class="mono" id="qr-count">10:00</strong> geldig ·
        in de echte app scant je vriend dit met de telefooncamera</p>
      <p id="qr-status" class="muted" style="font-weight:700">Wachten op scan…</p>
      <button class="btn btn-ghost" type="button" id="qr-sim">Simuleer: Omar scant hem 📱</button>
    </div>
    <p style="display:flex;gap:var(--s2);margin-top:var(--s3)">
      <button class="btn" id="msubmit">✨ Ken toe</button>
      <button class="btn btn-ghost" id="mcancel">Annuleer</button>
    </p>
  </div>
</div>

<script>
'use strict';
// ---------- data ----------
const BADGES = ${JSON.stringify(badges)};
const PTS = {common:5, uncommon:15, rare:30, legendary:60};
const RNL = {common:'Gewoon', uncommon:'Ongewoon', rare:'Zeldzaam', legendary:'Legendarisch'};
const USERS = [
  {u:'jesse', n:'Jesse', a:'🦊', bio:'Badgejager. Op drie legendarisches na compleet.'},
  {u:'fatima', n:'Fatima', a:'🌻', bio:'Schrijft citaties waar je bij moet gaan zitten.'},
  {u:'henk', n:'Opa Henk', a:'🎩', bio:'Snapt alleen de feed en de twijfelknop. Dat is genoeg.'},
  {u:'lena', n:'Lena', a:'🐙', bio:'Getuige van beroep. Ziet alles, vergeet niets.'},
  {u:'omar', n:'Omar', a:'🌵', bio:'Verzamelt ondeugd-badges met lichte trots.'},
  {u:'sanne', n:'Sanne', a:'🚀', bio:'Rent voor elke trein. Haalt de meeste.'},
  {u:'ruben', n:'Ruben', a:'🥸', bio:'Kent de catalogus beter dan zijn agenda.'},
  {u:'priya', n:'Priya', a:'🦩', bio:'Deelt aura uit als confetti.'},
];
const byU = Object.fromEntries(USERS.map(x=>[x.u,x]));
const byS = Object.fromEntries(BADGES.map(b=>[b.slug,b]));
const H = 3600000, D = 86400000, now = Date.now();
// [gever, ontvanger, slug, citatie, ms geleden, getuigen[], twijfelaars[], reacties{emoji:[users]}]
let seq = 0;
const mk = (g,r,s,c,ago,w=[],dbt=[],re={}) => ({id:++seq, g, r, s, c, t:now-ago, w:[...w], d:[...dbt], re:JSON.parse(JSON.stringify(re)), my:{}});
const SEED_AWARDS = [
  mk('omar','fatima','liftbommenwerper','Vierde verdieping ingestapt, derde verdieping uitgestapt. De rest reisde door naar beneden. Met de gevolgen.',2*H,['jesse'],[],{'😂':['sanne','ruben'],'😱':['lena']}),
  mk('priya','jesse','buurtsuperheld','Deed twee weken de boodschappen voor de buurvrouw met griep, inclusief de moeilijke drop.',5*H,['fatima','lena'],[],{'👏':['henk'],'🫡':['ruben']}),
  mk('ruben','omar','blikseminslag-overlever','Stond naar eigen zeggen "vlak naast" de inslag van dinsdag. Vanuit zijn woonkamer.',7*H,[],['fatima','lena'],{'😂':['jesse']}),
  mk('sanne','omar','verjaardagsvergeter','Feliciteerde Ruben één dag te laat met "hij komt nog, hij zit in de brievenbus". Er kwam niets.',9*H,['jesse'],[],{'😂':['fatima','priya']}),
  mk('fatima','jesse','muggenwreker','Om 03:40 opgestaan, licht aan, mug gevonden, afgerekend. Ging daarna vredig slapen.',D+2*H,['sanne'],[],{'👏':['lena'],'😂':['omar']}),
  mk('ruben','lena','hondenknuffelaar','Vroeg keurig toestemming en kreeg vervolgens tien minuten labrador over zich heen.',D+6*H,['priya'],[],{'👏':['jesse','henk']}),
  mk('jesse','sanne','gladde-handen','Ving het glas op vóór het de grond raakte. Met links. Terwijl ze haar telefoon vasthield.',2*D,['omar','ruben'],[],{'😱':['priya'],'👏':['fatima']}),
  mk('henk','ruben','stekkerdoos-strateeg','Ontwarde de kabelbak achter de tv. Er kwamen drie opladers uit die niemand herkende.',2*D+8*H,['lena'],[],{'👏':['omar']}),
  mk('lena','priya','stille-afwasser','Het feestje liep nog en de keuken was al schoner dan ervoor. Niemand zag haar gaan.',3*D,['fatima'],[],{'👏':['henk','jesse']}),
  mk('omar','jesse','snoozemeester','Zeven keer gesnoozed en alsnog als eerste op kantoor. Wetenschap kan dit niet verklaren.',3*D+5*H,[],[],{'😂':['sanne','ruben']}),
  mk('priya','fatima','naamonthouder','Achtentwintig verjaardagsgasten, achtentwintig namen bij het afscheid. Foutloos.',4*D,['ruben'],[],{'👏':['lena','henk']}),
  mk('sanne','henk','eendenfluisteraar','Werd van de vijver tot de voordeur gevolgd door elf eenden in colonne. Keek niet één keer om.',4*D+6*H,['priya','lena'],[],{'😂':['fatima'],'👏':['jesse']}),
  mk('jesse','omar','thuiswerkillusionist','Overhemd, colbert, pyjamabroek met eendjes. De camera ging per ongeluk te laat uit.',5*D,['ruben'],[],{'😂':['priya','sanne','lena']}),
  mk('priya','lena','karaoke-kamikaze','Bohemian Rhapsody. Solo. Zes minuten. De hele zaal deed de gitaarsolo mee.',6*D,['jesse','fatima','omar'],[],{'👏':['sanne','henk'],'😱':['ruben']}),
];

// ---------- opslag: alles blijft bewaard in deze browser (geen server) ----------
const STORE_KEY = 'aura-v1';
const today = () => new Date().toISOString().slice(0,10);
let AWARDS, budget = {}, me = 'jesse', tab = 'feed';
function load(){
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (s && Array.isArray(s.awards)) {
      AWARDS = s.awards;
      me = byU[s.me] ? s.me : 'jesse';
      seq = s.seq || AWARDS.reduce((m,a)=>Math.max(m,a.id),0);
      budget = (s.day === today()) ? (s.budget||{}) : {}; // dagbudget reset bij nieuwe dag
      return;
    }
  } catch(e){}
  AWARDS = SEED_AWARDS; // eerste bezoek: seed-data
}
function save(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify({awards:AWARDS, budget, me, seq, day:today()})); } catch(e){}
}
function resetData(){
  localStorage.removeItem(STORE_KEY);
  AWARDS = SEED_AWARDS.map(a=>({...a, w:[...a.w], d:[...a.d], re:JSON.parse(JSON.stringify(a.re))}));
  budget = {}; me = 'jesse'; tab = 'feed';
  seq = AWARDS.reduce((m,a)=>Math.max(m,a.id),0);
  asSel.value = 'jesse';
  save(); render();
}
load();
const budgetLeft = () => 5 - (budget[me]||0);

// ---------- regels (vereenvoudigde port van credibility.js) ----------
function status(a){ return a.d.length >= 2 && a.w.length <= a.d.length ? 'disputed' : 'active'; }
function tier(a){
  if (status(a)==='disputed') return {k:'disputed', l:'Betwist 🤨'};
  const c = 0.5 + Math.min(a.w.length,3)*0.15 + (a.inP ? 0.2 : 0);
  if (c >= 0.9) return {k:'legendary', l:'Gecertificeerd legendarisch'};
  if (c >= 0.65) return {k:'confirmed', l:'Ooggetuige bevestigd'};
  return {k:'hearsay', l:'Volgens zeggen'};
}
function ago(t){
  const m = Math.round((now - t)/60000);
  if (m < 1) return 'zojuist';
  if (m < 60) return m + ' min geleden';
  const h = Math.round(m/60);
  if (h < 24) return h + ' uur geleden';
  return Math.round(h/24) + ' d geleden';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- weergave ----------
const view = document.getElementById('view');
function ring(b, extra){
  return '<div class="ring ' + b.rarity + (extra||'') + '" aria-hidden="true">' + b.emoji + '</div>';
}
function card(a, stamped){
  const b = byS[a.s], st = status(a), t = tier(a);
  const canStance = me !== a.g && me !== a.r;
  const rx = ['👏','😂','😱','🫡'].map(e => {
    const list = a.re[e]||[]; const mine = list.includes(me);
    return '<button class="rb'+(mine?' mine':'')+'" data-react="'+e+'" data-id="'+a.id+'" aria-label="Reageer met '+e+'">'+e+(list.length?' <span class="mono">'+list.length+'</span>':'')+'</button>';
  }).join('');
  const stance = canStance
    ? '<button class="rb'+(a.w.includes(me)?' mine':'')+'" data-stance="w" data-id="'+a.id+'">✋ Ik was erbij</button>'
      + '<button class="rb'+(a.d.includes(me)?' mine':'')+'" data-stance="d" data-id="'+a.id+'">🤨 Betwijfel ik</button>'
    : '';
  return '<article class="card award reveal'+(st==='disputed'?' disputed':'')+(stamped?' stamped':'')+'">'
    + ring(b)
    + '<div><div class="head"><span class="who">'+byU[a.g].a+' '+esc(byU[a.g].n)+'</span>'
    + '<span class="muted">kende toe aan</span><span class="who">'+byU[a.r].a+' '+esc(byU[a.r].n)+'</span>'
    + '<span class="time">'+ago(a.t)+'</span></div>'
    + '<div class="bname">'+esc(b.naam)+' <span class="rlabel '+b.rarity+'">'+RNL[b.rarity]+'</span> '
    + '<span class="chip c-'+b.categorie+'">'+(b.categorie==='goed'?'😇':b.categorie==='ondeugd'?'😈':'⚖️')+'</span></div>'
    + '<blockquote class="cite">"'+esc(a.c)+'"</blockquote>'
    + '<div class="acts"><span class="chip t-'+t.k+'">'+t.l+'</span>'+rx+stance+'</div>'
    + (a.inP?'<div class="meta">🤝 In persoon overhandigd via QR</div>':'')
    + (a.w.length?'<div class="meta">✋ Bevestigd door '+a.w.map(u=>esc(byU[u].n)).join(', ')+'</div>':'')
    + (a.d.length?'<div class="meta">🤨 Betwijfeld door '+a.d.map(u=>esc(byU[u].n)).join(', ')+'</div>':'')
    + '</div></article>';
}

function renderFeed(){
  const sorted = [...AWARDS].sort((x,y)=>y.t-x.t);
  view.innerHTML = '<div class="eyebrow">Jouw aura · bijgehouden door je vrienden</div><h1 class="reveal">De Feed</h1>'
    + '<p class="note reveal">Aura-prototype (zonder server): je toekenningen blijven bewaard in <em>deze</em> browser (geen deling tussen telefoons — dat vraagt een server). Wissel rechtsboven van gebruiker om het multi-user-effect te spelen. <button id="reset-btn" class="fchip" style="margin-top:6px">↺ Begin opnieuw met de demo-data</button></p>'
    + sorted.map(a=>card(a)).join('');
  const rb = document.getElementById('reset-btn');
  if (rb) rb.addEventListener('click', () => { if (confirm('Alle badges die je hebt toegekend wissen en teruggaan naar de demo-data?')) resetData(); });
}

let catFilter = '', catQ = '';
function renderCat(){
  const secretN = BADGES.filter(b=>b.secret).length;
  const items = BADGES.filter(b => (!catFilter || b.categorie===catFilter)
    && (!catQ || (!b.secret && b.naam.toLowerCase().includes(catQ))));
  view.innerHTML = '<div class="eyebrow">'+BADGES.length+' onderscheidingen, waarvan '+secretN+' geheim</div>'
    + '<h1 class="reveal">De Catalogus</h1>'
    + '<input id="cq" placeholder="Zoek een badge…" value="'+esc(catQ)+'" aria-label="Zoek een badge" style="margin-bottom:var(--s2)">'
    + '<div class="filters">'
    + ['','goed','ondeugd','neutraal'].map(f=>'<button class="fchip'+(catFilter===f?' on':'')+'" data-f="'+f+'">'+(f===''?'Alles':f==='goed'?'😇 Goed':f==='ondeugd'?'😈 Ondeugd':'⚖️ Neutraal')+'</button>').join('')
    + '</div>'
    + (items.length ? '<div class="grid">'+items.map(b => b.secret
      ? '<div class="tile"><div class="ring secret">???</div><div><div class="bname">???</div><div class="desc">De Aura-raad zwijgt.</div></div></div>'
      : '<div class="tile">'+ring(b)+'<div><div class="bname">'+esc(b.naam)+'</div><div class="rlabel '+b.rarity+'">'+RNL[b.rarity]+'</div><div class="desc">'+esc(b.beschrijving)+'</div></div></div>').join('')+'</div>'
      : '<div class="empty card"><div class="big">🔍</div><p>Geen badge gevonden met deze filters.</p></div>');
  document.getElementById('cq').addEventListener('input', e => { catQ = e.target.value.trim().toLowerCase(); renderCat(); });
  view.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { catFilter = b.dataset.f; renderCat(); }));
}

function renderProf(){
  const u = byU[me];
  const mine = AWARDS.filter(a => a.r === me && status(a) !== 'disputed');
  let g=0, o=0;
  const shelf = new Map();
  for (const a of mine) {
    const b = byS[a.s];
    if (b.categorie==='goed') g += PTS[b.rarity];
    else if (b.categorie==='ondeugd') o += PTS[b.rarity];
    else { g += PTS[b.rarity]/2; o += PTS[b.rarity]/2; }
    shelf.set(a.s, (shelf.get(a.s)||0)+1);
  }
  view.innerHTML = '<div class="eyebrow">Profiel in deze demo</div><h1 class="reveal">'+u.a+' '+esc(u.n)+'</h1>'
    + '<p class="muted reveal">'+esc(u.bio)+'</p>'
    + '<div class="stats reveal"><div class="stat"><div class="n g">'+Math.round(g)+'</div><div class="l">✨ +Aura</div></div>'
    + '<div class="stat"><div class="n o">'+Math.round(o)+'</div><div class="l">💀 −Aura</div></div>'
    + '<div class="stat"><div class="n">'+shelf.size+'</div><div class="l">🏅 Badges</div></div></div>'
    + '<h2>De badge-plank</h2>'
    + (shelf.size ? '<div class="grid">'+[...shelf.entries()].map(([s,n]) => {
        const b = byS[s];
        return '<div class="tile">'+ring(b)+'<div><div class="bname">'+esc(b.naam)+'</div><div class="rlabel '+b.rarity+'">'+RNL[b.rarity]+(n>1?' · '+n+'×':'')+'</div></div></div>';
      }).join('')+'</div>'
      : '<div class="empty card"><div class="big">🪹</div><p>Nog een lege plank. Doe iets gedenkwaardigs waar iemand bij is.</p></div>')
    + '<h2 style="margin-top:var(--s3)">Recente vermeldingen</h2>'
    + [...AWARDS].filter(a=>a.r===me||a.g===me).sort((x,y)=>y.t-x.t).slice(0,5).map(a=>card(a)).join('');
}

let rankTab = 'goed';
function renderRank(){
  const weekAgo = Date.now() - 7*D;
  const per = new Map();
  for (const a of AWARDS){
    if (a.t < weekAgo || status(a)==='disputed') continue;
    const b = byS[a.s]; if (!b) continue;
    const pts = PTS[b.rarity] || 0;
    const cur = per.get(a.r) || { goed:0, ondeugd:0 };
    if (b.categorie==='goed') cur.goed += pts;
    else if (b.categorie==='ondeugd') cur.ondeugd += pts;
    else { cur.goed += pts/2; cur.ondeugd += pts/2; }
    per.set(a.r, cur);
  }
  const rows = [...per.entries()]
    .map(([u,s]) => ({ u, pts: Math.round(rankTab==='goed'?s.goed:s.ondeugd) }))
    .filter(r => r.pts > 0)
    .sort((x,y)=>y.pts-x.pts);
  const list = rows.length ? rows.map((r,i) =>
    '<div class="rankrow"><span class="rankpos">'+(i+1)+'</span>'
    + '<span class="rankname">'+byU[r.u].a+' '+esc(byU[r.u].n)+(r.u===me?' <span class="muted">(jij)</span>':'')+'</span>'
    + '<span class="rankpts mono">'+r.pts+'</span></div>').join('')
    : '<div class="empty"><div class="big">'+(rankTab==='ondeugd'?'😈':'😇')+'</div><p>Deze week nog niemand. De week is jong.</p></div>';
  view.innerHTML = '<div class="eyebrow">Wekelijkse ranglijst · gewogen naar geloofwaardigheid</div>'
    + '<h1 class="reveal">Ranglijst</h1>'
    + '<div class="filters reveal"><button class="fchip'+(rankTab==='goed'?' on':'')+'" data-rank="goed">✨ +Aura</button>'
    + '<button class="fchip'+(rankTab==='ondeugd'?' on':'')+'" data-rank="ondeugd">💀 −Aura</button></div>'
    + '<div class="card reveal">'+list+'</div>';
  view.querySelectorAll('[data-rank]').forEach(b => b.addEventListener('click', () => { rankTab=b.dataset.rank; renderRank(); }));
}

function render(){
  if (tab==='feed') renderFeed();
  else if (tab==='cat') renderCat();
  else if (tab==='rank') renderRank();
  else renderProf();
  window.scrollTo(0,0);
}
function setActiveTab(t){
  document.querySelectorAll('.tabbar-item').forEach(x=>x.classList.toggle('on', x.dataset.tab===t));
}

// ---------- interactie ----------
document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.react) {
    const a = AWARDS.find(x=>x.id==b.dataset.id);
    const list = a.re[b.dataset.react] = a.re[b.dataset.react]||[];
    const i = list.indexOf(me);
    if (i>=0) list.splice(i,1); else list.push(me);
    save(); render();
  } else if (b.dataset.stance) {
    const a = AWARDS.find(x=>x.id==b.dataset.id);
    const add = b.dataset.stance==='w' ? a.w : a.d;
    const other = b.dataset.stance==='w' ? a.d : a.w;
    const i = add.indexOf(me);
    if (i>=0) add.splice(i,1);
    else { add.push(me); const j = other.indexOf(me); if (j>=0) other.splice(j,1); }
    save(); render();
  }
});

document.querySelectorAll('.tabbar-item').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  setActiveTab(tab);
  render();
}));

const asSel = document.getElementById('as');
asSel.innerHTML = USERS.map(u=>'<option value="'+u.u+'">'+u.a+' '+u.n+'</option>').join('');
asSel.value = me;
asSel.addEventListener('change', () => { me = asSel.value; save(); render(); });

// ---------- modal ----------
const modal = document.getElementById('modal');
let selP = null, selB = null, selW = new Set(), bq = '', qrMode = false, qrTimer = null;
function setMode(qr){
  qrMode = qr;
  document.getElementById('mode-person').classList.toggle('on', !qr);
  document.getElementById('mode-qr').classList.toggle('on', qr);
  document.getElementById('mpeople').classList.toggle('hidden', qr);
  document.getElementById('qr-explain').classList.toggle('hidden', !qr);
  document.getElementById('wit-section').classList.toggle('hidden', qr);
  document.getElementById('qr-panel').classList.add('hidden');
  document.getElementById('msubmit').textContent = qr ? '📱 Maak QR-code' : '✨ Ken toe';
  document.getElementById('msubmit').classList.remove('hidden');
  if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
}
function openModal(){
  selP=null; selB=null; selW=new Set(); bq='';
  document.getElementById('mcite').value='';
  document.getElementById('mbq').value='';
  document.getElementById('merr').classList.add('hidden');
  document.getElementById('budget').textContent = budgetLeft();
  setMode(false);
  drawModal();
  modal.classList.remove('hidden');
}
document.getElementById('mode-person').addEventListener('click', ()=>setMode(false));
document.getElementById('mode-qr').addEventListener('click', ()=>setMode(true));
document.getElementById('qr-sim').addEventListener('click', () => {
  const scanner = me==='omar' ? 'lena' : 'omar';
  const cite = document.getElementById('mcite').value.trim();
  AWARDS.push({id:++seq, g:me, r:scanner, s:selB, c:cite, t:Date.now(), w:[], d:[], re:{}, inP:true});
  save();
  document.getElementById('qr-status').textContent = 'Geclaimd door '+byU[scanner].n+'! 🎉';
  if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
  setTimeout(() => {
    modal.classList.add('hidden');
    tab='feed';
    setActiveTab("feed");
    renderFeed();
    const first = view.querySelector('article');
    if (first) { first.classList.remove('reveal'); first.classList.add('stamped'); }
    window.scrollTo(0,0);
  }, 1400);
});
function drawModal(){
  document.getElementById('mpeople').innerHTML = USERS.map(u =>
    '<button type="button" class="pi'+(selP===u.u?' sel':'')+'" data-p="'+u.u+'"'+(u.u===me?' disabled':'')+'>'
    + u.a+' '+u.n+(u.u===me?' (jijzelf — dat mag dus niet)':'')+(selP===u.u?' ✓':'')+'</button>').join('');
  const opts = BADGES.filter(b=>!b.secret && !b.auto && (!bq || b.naam.toLowerCase().includes(bq))).slice(0,30);
  document.getElementById('mbadges').innerHTML = opts.length ? opts.map(b =>
    '<button type="button" class="pi'+(selB===b.slug?' sel':'')+'" data-b="'+b.slug+'">'+b.emoji+' '+esc(b.naam)
    + ' <span class="rlabel '+b.rarity+'" style="margin-left:auto">'+RNL[b.rarity]+'</span>'+(selB===b.slug?' ✓':'')+'</button>').join('')
    : '<div class="empty"><p>Geen badge gevonden.</p></div>';
  document.getElementById('mwit').innerHTML = USERS.filter(u=>u.u!==me && u.u!==selP).map(u =>
    '<button type="button" class="pi'+(selW.has(u.u)?' sel':'')+'" data-w="'+u.u+'">'+u.a+' '+u.n+(selW.has(u.u)?' ✋':'')+'</button>').join('');
}
modal.addEventListener('click', ev => {
  if (ev.target===modal) modal.classList.add('hidden');
  const b = ev.target.closest('.pi'); if (!b) return;
  if (b.dataset.p) { selP=b.dataset.p; selW.delete(selP); }
  else if (b.dataset.b) selB=b.dataset.b;
  else if (b.dataset.w) { selW.has(b.dataset.w)?selW.delete(b.dataset.w):selW.add(b.dataset.w); }
  drawModal();
});
document.getElementById('mbq').addEventListener('input', e => { bq=e.target.value.trim().toLowerCase(); drawModal(); });
document.getElementById('msubmit').addEventListener('click', () => {
  const err = document.getElementById('merr');
  const cite = document.getElementById('mcite').value.trim();
  err.classList.add('hidden');
  const fail = m => { err.textContent=m; err.classList.remove('hidden'); };
  if (budgetLeft() <= 0) return fail('Je aura-giften zijn op voor vandaag — morgen weer 5.');
  if (qrMode) {
    if (!selB) return fail('Kies eerst een badge uit de catalogus.');
    if (cite.length < 10) return fail('Schrijf een citatie van minstens 10 tekens — het verhaal is de helft van de badge.');
    budget[me] = (budget[me]||0)+1;
    save();
    document.getElementById('budget').textContent = budgetLeft();
    document.getElementById('qr-panel').classList.remove('hidden');
    document.getElementById('qr-status').textContent = 'Wachten op scan…';
    document.getElementById('msubmit').classList.add('hidden');
    let left = 600;
    const cd = document.getElementById('qr-count');
    if (qrTimer) clearInterval(qrTimer);
    qrTimer = setInterval(() => {
      left--; cd.textContent = Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
      if (left<=0) { clearInterval(qrTimer); qrTimer=null; document.getElementById('qr-status').textContent='Verlopen — maak een nieuwe QR-code.'; }
    }, 1000);
    return;
  }
  if (!selP) return fail('Kies eerst een ontvanger.');
  if (!selB) return fail('Kies eerst een badge uit de catalogus.');
  if (cite.length < 10) return fail('Schrijf een citatie van minstens 10 tekens — het verhaal is de helft van de badge.');
  budget[me] = (budget[me]||0)+1;
  AWARDS.push({id:++seq, g:me, r:selP, s:selB, c:cite, t:Date.now(), w:[...selW], d:[], re:{}, my:{}});
  save();
  modal.classList.add('hidden');
  tab='feed';
  setActiveTab("feed");
  renderFeed();
  const first = view.querySelector('article');
  if (first) { first.classList.remove('reveal'); first.classList.add('stamped'); }
  window.scrollTo(0,0);
});
document.getElementById('mcancel').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('fab').addEventListener('click', openModal);

render();
</script>
</body></html>`;

const OUT = path.join(__dirname, 'docs', 'index.html');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// De QR verwijst standaard naar de app zelf; overschrijfbaar met SITE_URL zodra
// je de Pages-URL kent (bijv. SITE_URL=https://naam.github.io/repo node build-static.js).
const qrTarget = process.env.SITE_URL || 'https://aura.example/';
QRCode.toString(qrTarget, { type: 'svg', margin: 1, width: 240 }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync(OUT, html.replace('__QR_SVG__', svg));
  console.log('docs/index.html geschreven:', Math.round((html.length + svg.length) / 1024), 'kB');
});
