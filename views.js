// Server-rendered templates. Eén bron voor alle HTML; ook de feed-fragmenten
// voor polling komen hiervandaan zodat er nooit twee kaart-templates bestaan.
const C = require('./constants');
const ICONS = require('./icons');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const RARITY_NL = { common: 'Gewoon', uncommon: 'Ongewoon', rare: 'Zeldzaam', legendary: 'Legendarisch' };
const CAT_NL = { goed: 'Goede daad', ondeugd: 'Ondeugd', neutraal: 'Neutraal' };

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'zojuist';
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function layout({ user, title, active = '', content, unread = 0, remaining = null }) {
  const nav = user ? `
    <nav class="nav">
      <a class="brand" href="/">Aura</a>
      <div class="nav-links">
        <a href="/" class="${active === 'feed' ? 'active' : ''}">Feed</a>
        <a href="/badges" class="${active === 'badges' ? 'active' : ''}">Catalogus</a>
        <a href="/ranglijst" class="${active === 'ranglijst' ? 'active' : ''}">Ranglijst</a>
        <div class="bell-wrap">
          <button class="btn btn-ghost" id="bell-btn" aria-label="Notificaties">🔔${unread > 0 ? `<span class="bell-count" id="bell-count">${unread}</span>` : '<span id="bell-count"></span>'}</button>
          <div class="notif-panel hidden" id="notif-panel" aria-live="polite"></div>
        </div>
        <a href="/u/${esc(user.username)}" class="${active === 'profiel' ? 'active' : ''}" aria-label="Mijn profiel">${esc(user.avatar_emoji)} ${esc(user.display_name)}</a>
        <button class="btn" id="open-award-btn">✨ Ken badge toe</button>
        <form method="post" action="/logout" style="margin:0"><button class="btn btn-quiet" type="submit">Uitloggen</button></form>
      </div>
    </nav>` : '';
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Aura</title>
  <link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">✨</text></svg>')}">
  <link rel="stylesheet" href="/style.css">
</head>
<body data-poll-ms="${C.POLL_MS}">
${nav}
<main class="wrap">
${content}
</main>
${user ? awardModal(remaining) : ''}
${user ? `<script src="/app.js"></script>` : ''}
</body>
</html>`;
}

function badgeRing(badge, { small = false } = {}) {
  if (badge.is_secret && badge.hidden) {
    return `<div class="badge-ring secret ${small ? 'small' : ''}" aria-label="Geheime badge">???</div>`;
  }
  const inner = ICONS[badge.slug];
  const content = inner
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
    : esc(badge.emoji);
  const iconCls = inner ? ` has-icon ic-${esc(badge.categorie)}` : '';
  return `<div class="badge-ring rarity-${esc(badge.rarity)}${iconCls} ${small ? 'small' : ''}" aria-hidden="true">${content}</div>`;
}

// De award-kaart — hét feed-element (ook als polling-fragment gebruikt).
function awardCard(v, { stamped = false } = {}) {
  const reactions = ['👏', '😂', '😱', '🫡'].map(emoji => {
    const r = v.reactions.find(x => x.emoji === emoji);
    const n = r ? r.n : 0;
    const mine = r && r.mine > 0;
    return `<button class="react-btn ${mine ? 'mine' : ''}" data-award="${v.id}" data-emoji="${emoji}" aria-label="Reageer met ${emoji}">${emoji}${n > 0 ? ` <span class="mono">${n}</span>` : ''}</button>`;
  }).join('');
  const stanceButtons = v.canStance ? `
    <button class="react-btn ${v.myStance === 'vouch' ? 'mine' : ''}" data-stance="vouch" data-award="${v.id}">✋ Ik was erbij${v.myStance === 'vouch' ? ' ✓' : ''}</button>
    <button class="react-btn ${v.myStance === 'doubt' ? 'mine' : ''}" data-stance="doubt" data-award="${v.id}">🤨 Betwijfel ik${v.myStance === 'doubt' ? ' ✓' : ''}</button>` : '';
  const inPerson = v.in_person
    ? `<div class="award-meta">🤝 In persoon overhandigd via QR</div>` : '';
  const witnesses = v.witnesses.length
    ? `<div class="award-meta">✋ Bevestigd door ${v.witnesses.map(esc).join(', ')}</div>` : '';
  const doubts = v.doubts.length
    ? `<div class="award-meta">🤨 Betwijfeld door ${v.doubts.map(esc).join(', ')}</div>` : '';
  const photo = v.photo_path
    ? `<img class="award-photo" src="/photos/${esc(v.photo_path)}" alt="Bewijsfoto bij deze award">${v.photo_late ? '<span class="photo-late-tag">foto later toegevoegd</span>' : ''}` : '';
  return `
  <article class="card award-card reveal ${v.status === 'disputed' ? 'disputed' : ''} ${stamped ? 'stamped' : ''}" data-award-id="${v.id}" data-created="${esc(v.created_at)}">
    ${badgeRing(v.badge)}
    <div>
      <div class="award-head">
        <span class="who"><a href="/u/${esc(v.giver.username)}">${esc(v.giver.avatar_emoji)} ${esc(v.giver.display_name)}</a></span>
        <span class="muted">kende toe aan</span>
        <span class="who"><a href="/u/${esc(v.recipient.username)}">${esc(v.recipient.avatar_emoji)} ${esc(v.recipient.display_name)}</a></span>
        <span class="award-time">${timeAgo(v.created_at)}</span>
      </div>
      <div class="award-badge-name">${esc(v.badge.naam)}
        <span class="rarity-label ${esc(v.badge.rarity)}">${RARITY_NL[v.badge.rarity]}</span>
        <span class="chip cat-${esc(v.badge.categorie)}">${v.badge.categorie === 'goed' ? '😇' : v.badge.categorie === 'ondeugd' ? '😈' : '⚖️'} ${CAT_NL[v.badge.categorie]}</span>
      </div>
      <blockquote class="citation">"${esc(v.citation)}"</blockquote>
      ${photo}
      <div class="award-actions">
        <span class="chip tier-${esc(v.tier.key)}">${esc(v.tier.label)}</span>
        ${reactions}
        ${stanceButtons}
      </div>
      ${inPerson}
      ${witnesses}
      ${doubts}
    </div>
  </article>`;
}

function feedPage({ views }) {
  const cards = views.length
    ? views.map(v => awardCard(v)).join('\n')
    : `<div class="empty-state card"><div class="big">🏅</div>
        <p>Nog geen daden verricht. De geschiedenis wacht.</p>
        <button class="btn" id="empty-award-btn">Ken de eerste badge toe</button></div>`;
  return `
  <div class="eyebrow reveal">Jouw aura · bijgehouden door je vrienden</div>
  <h1 class="reveal">De Feed</h1>
  <div id="feed-error" class="error-state hidden" role="alert">
    <span>De feed kon niet worden ververst.</span>
    <button class="btn btn-ghost" id="feed-retry">Probeer opnieuw</button>
  </div>
  <div id="feed">${cards}</div>`;
}

function loginPage({ error = null, mode = 'login', values = {}, next = '' } = {}) {
  const nextField = next ? `<input type="hidden" name="next" value="${esc(next)}">` : '';
  return `
  <div style="max-width:420px;margin:8vh auto 0">
    <div class="eyebrow">Sinds heden · officieel register</div>
    <h1>Aura</h1>
    <p class="muted">Verdien badges voor goede daden. En voor de andere soort. Alleen anderen kunnen jou een badge toekennen — roem moet je gegund worden.</p>
    ${error ? `<div class="form-error" role="alert">${esc(error)}</div>` : ''}
    <div class="card">
      <div class="tabs">
        <button class="tab ${mode === 'login' ? 'active' : ''}" data-authtab="login" type="button">Inloggen</button>
        <button class="tab ${mode === 'register' ? 'active' : ''}" data-authtab="register" type="button">Account maken</button>
      </div>
      <form method="post" action="/login" id="form-login" class="${mode === 'login' ? '' : 'hidden'}">
        ${nextField}
        <label for="l-username">Gebruikersnaam</label>
        <input id="l-username" name="username" autocomplete="username" required value="${esc(values.username || '')}">
        <label for="l-password">Wachtwoord</label>
        <input id="l-password" name="password" type="password" autocomplete="current-password" required>
        <p><button class="btn" type="submit">Log in</button></p>
      </form>
      <form method="post" action="/register" id="form-register" class="${mode === 'register' ? '' : 'hidden'}">
        ${nextField}
        <label for="r-username">Gebruikersnaam</label>
        <input id="r-username" name="username" autocomplete="username" minlength="2" maxlength="24" pattern="[a-zA-Z0-9_-]+" required value="${esc(values.username || '')}">
        <label for="r-display">Weergavenaam</label>
        <input id="r-display" name="display_name" maxlength="40" required value="${esc(values.display_name || '')}">
        <label for="r-password">Wachtwoord</label>
        <input id="r-password" name="password" type="password" autocomplete="new-password" minlength="6" required>
        <p><button class="btn" type="submit">Maak account</button></p>
      </form>
    </div>
    <p class="muted">Demo-accounts: <span class="mono">jesse</span>, <span class="mono">fatima</span>, <span class="mono">henk</span>, <span class="mono">lena</span>, <span class="mono">omar</span>, <span class="mono">sanne</span>, <span class="mono">ruben</span> of <span class="mono">priya</span> — wachtwoord <span class="mono">demo123</span>. Open twee browservensters voor het volle effect.</p>
  </div>
  <script>
    document.querySelectorAll('[data-authtab]').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('[data-authtab]').forEach(x => x.classList.toggle('active', x === t));
      document.getElementById('form-login').classList.toggle('hidden', t.dataset.authtab !== 'login');
      document.getElementById('form-register').classList.toggle('hidden', t.dataset.authtab !== 'register');
    }));
  </script>`;
}

function catalogPage({ badges, counts }) {
  const tiles = badges.map(b => {
    const hidden = b.is_secret && !b.earnedByViewer;
    const inner = hidden
      ? `<div><div class="award-badge-name">???</div><div class="muted" style="font-size:14px">Een geheime onderscheiding. De Aura-raad zwijgt.</div></div>`
      : `<div>
          <div class="award-badge-name"><a href="/badges/${esc(b.slug)}">${esc(b.naam)}</a></div>
          <div class="rarity-label ${esc(b.rarity)}">${RARITY_NL[b.rarity]}</div>
          <div class="muted" style="font-size:14px">${esc(b.beschrijving)}</div>
        </div>`;
    return `<div class="card badge-tile" data-cat="${esc(b.categorie)}" data-rarity="${esc(b.rarity)}" data-name="${esc((hidden ? '' : b.naam).toLowerCase())}">
      ${badgeRing({ ...b, hidden })}${inner}</div>`;
  }).join('\n');
  return `
  <div class="eyebrow reveal">${counts.total} onderscheidingen, waarvan ${counts.secret} geheim</div>
  <h1 class="reveal">De Catalogus</h1>
  <div class="card reveal" style="display:flex;gap:var(--s2);flex-wrap:wrap;align-items:center">
    <input id="cat-search" placeholder="Zoek een badge…" style="max-width:240px" aria-label="Zoek een badge">
    <select id="cat-filter" aria-label="Filter op categorie" style="max-width:200px">
      <option value="">Alle categorieën</option>
      <option value="goed">😇 Goede daden</option>
      <option value="ondeugd">😈 Ondeugd</option>
      <option value="neutraal">⚖️ Neutraal</option>
    </select>
    <select id="rarity-filter" aria-label="Filter op zeldzaamheid" style="max-width:200px">
      <option value="">Alle zeldzaamheden</option>
      <option value="common">Gewoon</option>
      <option value="uncommon">Ongewoon</option>
      <option value="rare">Zeldzaam</option>
      <option value="legendary">Legendarisch</option>
    </select>
  </div>
  <div class="badge-grid" id="badge-grid">${tiles}</div>
  <div class="empty-state card hidden" id="cat-empty"><div class="big">🔍</div><p>Geen badge gevonden met deze filters. Verruim je zoekopdracht.</p></div>
  <script>
    (function() {
      const search = document.getElementById('cat-search');
      const cat = document.getElementById('cat-filter');
      const rar = document.getElementById('rarity-filter');
      const tiles = [...document.querySelectorAll('#badge-grid .badge-tile')];
      function apply() {
        let visible = 0;
        const q = search.value.trim().toLowerCase();
        for (const t of tiles) {
          const show = (!q || t.dataset.name.includes(q))
            && (!cat.value || t.dataset.cat === cat.value)
            && (!rar.value || t.dataset.rarity === rar.value);
          t.classList.toggle('hidden', !show);
          if (show) visible++;
        }
        document.getElementById('cat-empty').classList.toggle('hidden', visible > 0);
      }
      [search, cat, rar].forEach(el => el.addEventListener('input', apply));
    })();
  </script>`;
}

function badgeDetailPage({ badge, timesAwarded, recentViews }) {
  return `
  <div class="eyebrow reveal"><a href="/badges">← Terug naar de catalogus</a></div>
  <div class="card reveal award-card">
    ${badgeRing(badge)}
    <div>
      <h1 style="font-size:36px">${esc(badge.naam)}</h1>
      <div class="rarity-label ${esc(badge.rarity)}">${RARITY_NL[badge.rarity]} · ${C.RARITY_POINTS[badge.rarity]} punten</div>
      <p class="citation">${esc(badge.beschrijving)}</p>
      <p class="muted mono">${timesAwarded}× toegekend</p>
      ${badge.is_auto ? '<p class="muted">Deze badge kent alleen de Aura-raad toe — automatisch, bij bewezen verdienste.</p>'
        : `<button class="btn" data-preselect-badge="${esc(badge.slug)}">✨ Ken deze badge toe</button>`}
    </div>
  </div>
  <h2 class="reveal">Recente ontvangers</h2>
  ${recentViews.length ? recentViews.map(v => awardCard(v)).join('\n')
    : '<div class="empty-state card"><div class="big">🦗</div><p>Nog nooit toegekend. Wees de eerste die deze eer uitdeelt.</p></div>'}`;
}

function profilePage({ profile, isOwn, scores, shelf, recentViews, reliability, probation }) {
  const shelfHtml = shelf.length ? `<div class="shelf">${shelf.map(b => `
    <div class="card shelf-item">
      ${badgeRing(b, { small: true })}
      <div>
        <div style="font-weight:700">${esc(b.naam)}</div>
        <div class="rarity-label ${esc(b.rarity)}">${RARITY_NL[b.rarity]}</div>
        ${b.n > 1 ? `<div class="level-tag">${b.n}× · niveau ${b.level}</div>` : ''}
      </div>
    </div>`).join('')}</div>`
    : `<div class="empty-state card"><div class="big">🪹</div><p>${isOwn ? 'Nog een lege plank. Doe iets gedenkwaardigs waar iemand bij is.' : 'Nog geen badges. Zag jij een daad? Ken de eerste toe.'}</p></div>`;
  const editForm = isOwn ? `
    <details class="card">
      <summary style="cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center">Profiel bewerken</summary>
      <form id="profile-form">
        <label for="p-avatar">Avatar-emoji</label>
        <input id="p-avatar" name="avatar_emoji" maxlength="8" value="${esc(profile.avatar_emoji)}">
        <label for="p-bio">Bio</label>
        <textarea id="p-bio" name="bio" rows="2" maxlength="160">${esc(profile.bio)}</textarea>
        <p><button class="btn" type="submit">Opslaan</button> <span id="profile-saved" class="muted"></span></p>
        <div class="field-error hidden" id="profile-error"></div>
      </form>
    </details>` : '';
  return `
  <div class="eyebrow reveal">Lid sinds ${new Date(profile.created_at).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}${probation ? ' · in proeftijd' : ''}</div>
  <h1 class="reveal">${esc(profile.avatar_emoji)} ${esc(profile.display_name)}</h1>
  ${profile.bio ? `<p class="muted reveal">${esc(profile.bio)}</p>` : ''}
  <div class="stat-row reveal">
    <div class="stat"><div class="num goed">${scores.goed}</div><div class="lbl">✨ +Aura</div></div>
    <div class="stat"><div class="num ondeugd">${scores.ondeugd}</div><div class="lbl">💀 −Aura</div></div>
    <div class="stat"><div class="num">${shelf.length}</div><div class="lbl">🏅 Badges</div></div>
    <div class="stat"><div class="num">${Math.round(reliability.ratio * 100)}%</div><div class="lbl">🔎 Awards bevestigd</div></div>
  </div>
  <p class="muted" style="font-size:14px">De betrouwbaarheidsscore telt hoe vaak badges die ${isOwn ? 'jij toekent' : `${esc(profile.display_name)} toekent`} door getuigen worden bevestigd.</p>
  ${editForm}
  <h2>De badge-plank</h2>
  ${shelfHtml}
  <h2>Recente vermeldingen</h2>
  ${recentViews.length ? recentViews.map(v => awardCard(v)).join('\n')
    : '<div class="empty-state card"><div class="big">📜</div><p>Nog geen vermeldingen in het register.</p></div>'}`;
}

function leaderboardPage({ tab, rows, weekLabel }) {
  const table = rows.length ? `
  <table class="board">
    <thead><tr><th>#</th><th>Lid</th><th>Punten deze week</th></tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr>
        <td class="mono">${i + 1}</td>
        <td><a href="/u/${esc(r.username)}">${esc(r.avatar_emoji)} ${esc(r.display_name)}</a></td>
        <td class="pts">${Math.round(r.points)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`
    : `<div class="empty-state card"><div class="big">${tab === 'ondeugd' ? '😈' : '😇'}</div><p>Nog niemand heeft deze week ${tab === 'ondeugd' ? 'kattenkwaad uitgehaald' : 'een goede daad verricht'}. De week is nog jong.</p></div>`;
  return `
  <div class="eyebrow reveal">Wekelijkse league · ${esc(weekLabel)} · reset maandag 00:00</div>
  <h1 class="reveal">De Ranglijst</h1>
  <p class="muted reveal">Punten zijn gewogen naar geloofwaardigheid: een betwiste of dubieuze badge telt niet of nauwelijks. Er is bewust geen eeuwige ranglijst — elke maandag krijgt iedereen een nieuwe kans.</p>
  <div class="tabs reveal">
    <a class="tab ${tab === 'goed' ? 'active' : ''}" href="/ranglijst?tab=goed">✨ +Aura</a>
    <a class="tab ${tab === 'ondeugd' ? 'active' : ''}" href="/ranglijst?tab=ondeugd">💀 −Aura</a>
  </div>
  <div class="card reveal">${table}</div>`;
}

// Claim-pagina voor gescande QR-codes; state bepaalt de boodschap.
function claimPage({ state, row, user, claimedCard = null, error = null }) {
  if (claimedCard) {
    return `
    <div class="eyebrow reveal">Officieel overhandigd</div>
    <h1 class="reveal">Gefeliciteerd! 🤝</h1>
    <p class="muted reveal">De badge staat op je plank, met het zegel "in persoon overhandigd".</p>
    ${claimedCard}
    <p><a class="btn" href="/">Naar de feed</a></p>`;
  }
  const MESSAGES = {
    unknown: ['🕳️', 'Deze QR-code is niet (meer) geldig', 'Controleer of je de juiste code hebt gescand, of vraag om een nieuwe.'],
    used: ['🔒', 'Deze QR-code is al gebruikt', 'Een badge claim je maar één keer. De eer is al vergeven.'],
    expired: ['⏳', 'Deze QR-code is verlopen', `Een QR-badge is ${C.QR_TOKEN_TTL_MIN} minuten geldig. Vraag om een nieuwe.`],
  };
  if (MESSAGES[state]) {
    const [emoji, title, sub] = MESSAGES[state];
    return `<div class="empty-state card" style="margin-top:10vh"><div class="big">${emoji}</div>
      <h1 style="font-size:28px">${title}</h1><p class="muted">${sub}</p>
      <p><a class="btn btn-ghost" href="/">Naar de feed</a></p></div>`;
  }
  const b = { slug: row.badge_slug, naam: row.naam, emoji: row.emoji, rarity: row.rarity, categorie: row.categorie };
  return `
  <div class="eyebrow reveal">Er wordt je een eer aangeboden</div>
  <h1 class="reveal" style="font-size:36px">${esc(row.giver_avatar)} ${esc(row.giver_name)} overhandigt je een badge</h1>
  ${error ? `<div class="form-error" role="alert">${esc(error)}</div>` : ''}
  <div class="card award-card reveal">
    ${badgeRing(b)}
    <div>
      <div class="award-badge-name">${esc(row.naam)}
        <span class="rarity-label ${esc(row.rarity)}">${RARITY_NL[row.rarity]}</span></div>
      <blockquote class="citation">"${esc(row.citation)}"</blockquote>
      ${user
        ? `<form method="post" action="/claim/${esc(row.token)}" style="margin-top:var(--s2)">
             <button class="btn" type="submit">🤝 Claim deze badge</button>
           </form>`
        : `<p class="muted">Log eerst in om hem te claimen — daarna kom je hier terug.</p>
           <p><a class="btn" href="/login?next=${encodeURIComponent('/claim/' + row.token)}">Log in en claim</a></p>`}
    </div>
  </div>`;
}

function awardModal(remaining) {
  return `
  <div class="modal-backdrop hidden" id="award-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="eyebrow">Officiële toekenning</div>
      <h2 id="modal-title">Ken een badge toe</h2>
      <p class="muted">Vandaag nog <strong class="mono" id="budget-left">${remaining ?? '…'}</strong> van ${C.DAILY_AWARD_CAP} toekenningen beschikbaar.</p>
      <div class="form-error hidden" id="award-error" role="alert"></div>

      <label>1. Wie verdient hem?</label>
      <div class="tabs" role="group" aria-label="Manier van toekennen">
        <button class="tab active" type="button" id="mode-person">👤 Kies persoon</button>
        <button class="tab" type="button" id="mode-qr">📱 Via QR</button>
      </div>
      <div id="person-section">
        <input id="pick-person" placeholder="Zoek op naam…" autocomplete="off" aria-label="Zoek een persoon">
        <div class="picker-list" id="person-list" aria-live="polite"><div class="skeleton" style="height:44px"></div></div>
      </div>
      <p class="muted hidden" id="qr-explain" style="font-size:14px">
        Sta je naast elkaar? Kies een badge, schrijf de citatie en laat de ander de QR
        scannen — de badge telt dan als <strong>in persoon overhandigd</strong> (extra geloofwaardig).
      </p>

      <label for="pick-badge">2. Welke badge?</label>
      <input id="pick-badge" placeholder="Zoek in de catalogus…" autocomplete="off">
      <div class="picker-list" id="badge-list" aria-live="polite"><div class="skeleton" style="height:44px"></div></div>

      <label for="citation">3. Het verhaal (de citatie)</label>
      <textarea id="citation" rows="3" minlength="${C.CITATION_MIN}" maxlength="${C.CITATION_MAX}" placeholder="Beschrijf de daad alsof het een koninklijke onderscheiding betreft…"></textarea>
      <div class="muted mono" style="font-size:12px"><span id="citation-count">0</span>/${C.CITATION_MAX}</div>
      <div class="field-error hidden" id="citation-error"></div>

      <div id="witness-section">
        <label>Getuigen (optioneel — maakt de badge geloofwaardiger)</label>
        <div class="picker-list" id="witness-list" style="max-height:140px"></div>
      </div>

      <div class="hidden" id="qr-result" aria-live="polite" style="text-align:center">
        <div id="qr-svg" style="background:#FFFFFF;border:1px solid var(--line-strong);border-radius:var(--radius-lg);padding:var(--s3);display:inline-block;max-width:280px;margin-top:var(--s2);box-shadow:var(--shadow)"></div>
        <p class="muted" style="font-size:14px">Laat scannen met de telefooncamera ·
          nog <strong class="mono" id="qr-countdown"></strong> geldig</p>
        <p class="mono" style="font-size:12px;word-break:break-all" id="qr-url"></p>
        <p id="qr-status" class="muted" style="font-weight:700">Wachten op scan…</p>
      </div>

      <div id="photo-section">
      <label>Bewijsfoto (optioneel, alleen live camera)</label>
      <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
        <button class="btn btn-ghost" type="button" id="camera-btn">📷 Maak foto</button>
        <select id="moment" aria-label="Wanneer gebeurde het?" style="max-width:220px">
          <option value="nu">Zojuist gebeurd</option>
          <option value="eerder">Eerder gebeurd</option>
        </select>
      </div>
      <video id="camera-video" class="photo-preview hidden" autoplay playsinline></video>
      <canvas id="camera-canvas" class="hidden"></canvas>
      <img id="photo-preview" class="photo-preview hidden" alt="Voorbeeld van de bewijsfoto">
      <div class="field-error hidden" id="camera-error"></div>
      </div>

      <p style="display:flex;gap:var(--s2);margin-top:var(--s4)">
        <button class="btn" id="award-submit">✨ Ken toe</button>
        <button class="btn btn-quiet" id="award-cancel" type="button">Annuleer</button>
      </p>
    </div>
  </div>`;
}

module.exports = {
  esc, layout, awardCard, feedPage, loginPage, catalogPage,
  badgeDetailPage, profilePage, leaderboardPage, claimPage, timeAgo,
};
