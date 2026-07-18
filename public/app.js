// Clientlogica: award-modal, feed-polling, reacties, getuigen/twijfels, notificaties.
// Alle scores en regels leven op de server; dit bestand doet alleen weergave.
(function () {
  'use strict';
  const POLL_MS = Number(document.body.dataset.pollMs) || 8000;
  const feed = document.getElementById('feed');

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Er ging iets mis met de verbinding.');
    return data;
  }

  // ---- feed-polling --------------------------------------------------------
  let latest = feed ? [...feed.querySelectorAll('[data-created]')].map(el => el.dataset.created).sort().pop() || null : null;
  let pollTimer = null;

  async function poll() {
    if (!feed) return;
    try {
      const q = latest ? `?since=${encodeURIComponent(latest)}` : '';
      const data = await api(`/api/feed${q}`);
      document.getElementById('feed-error').classList.add('hidden');
      if (data.count > 0) {
        const tmp = document.createElement('div');
        tmp.innerHTML = data.html;
        // nieuwste onderaan het fragment eerst invoegen zodat de volgorde klopt
        [...tmp.children].reverse().forEach(el => {
          const existing = feed.querySelector(`[data-award-id="${el.dataset.awardId}"]`);
          if (existing) existing.replaceWith(el);
          else feed.prepend(el);
        });
        latest = data.latest || latest;
        const empty = feed.querySelector('.empty-state');
        if (empty) empty.remove();
      }
      updateBell(data.unread);
      updateBudget(data.remaining);
    } catch (e) {
      document.getElementById('feed-error').classList.remove('hidden');
    }
  }
  if (feed) {
    pollTimer = setInterval(poll, POLL_MS);
    document.getElementById('feed-retry').addEventListener('click', poll);
  }

  function updateBell(unread) {
    const el = document.getElementById('bell-count');
    if (!el) return;
    if (unread > 0) { el.textContent = unread; el.className = 'bell-count'; }
    else { el.textContent = ''; el.className = ''; }
  }
  function updateBudget(remaining) {
    const el = document.getElementById('budget-left');
    if (el && remaining !== undefined && remaining !== null) el.textContent = remaining;
    const submit = document.getElementById('award-submit');
    if (submit && remaining === 0) submit.disabled = true;
  }

  // ---- kaart-acties (reacties, getuige, twijfel) — event delegation --------
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const awardId = btn.dataset.award;
    try {
      if (awardId && btn.dataset.emoji) {
        const data = await api(`/api/awards/${awardId}/react`, { method: 'POST', body: { emoji: btn.dataset.emoji } });
        replaceCard(awardId, data.html);
      } else if (awardId && btn.dataset.stance) {
        const data = await api(`/api/awards/${awardId}/stance`, { method: 'POST', body: { stance: btn.dataset.stance } });
        replaceCard(awardId, data.html);
      }
    } catch (e) {
      toastError(btn, e.message);
    }
  });

  function replaceCard(awardId, html) {
    const card = document.querySelector(`[data-award-id="${awardId}"]`);
    if (!card) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const next = tmp.firstElementChild;
    next.classList.remove('reveal');
    card.replaceWith(next);
  }

  function toastError(nearEl, message) {
    const card = nearEl.closest('.card') || document.body;
    let note = card.querySelector('.field-error[data-toast]');
    if (!note) {
      note = document.createElement('div');
      note.className = 'field-error';
      note.setAttribute('data-toast', '1');
      note.setAttribute('role', 'alert');
      card.appendChild(note);
    }
    note.textContent = message;
    setTimeout(() => note.remove(), 4000);
  }

  // ---- notificaties --------------------------------------------------------
  const bellBtn = document.getElementById('bell-btn');
  const notifPanel = document.getElementById('notif-panel');
  if (bellBtn) {
    bellBtn.addEventListener('click', async () => {
      const isOpen = !notifPanel.classList.contains('hidden');
      if (isOpen) { notifPanel.classList.add('hidden'); return; }
      notifPanel.classList.remove('hidden');
      notifPanel.innerHTML = '<div class="skeleton" style="height:44px"></div>';
      try {
        const data = await api('/api/notifications');
        if (!data.items.length) {
          notifPanel.innerHTML = '<div class="empty-state"><div class="big">🔕</div><p>Nog geen nieuws. Doe iets gedenkwaardigs.</p></div>';
          return;
        }
        notifPanel.innerHTML = data.items.map(n =>
          `<div class="notif-item ${n.read ? '' : 'unread'}">${escapeHtml(n.message)}<div class="muted mono" style="font-size:11px">${escapeHtml(n.ago)}</div></div>`
        ).join('') +
        '<button class="btn btn-quiet" id="notif-read-all" style="width:100%">Markeer alles gelezen</button>';
        document.getElementById('notif-read-all').addEventListener('click', async () => {
          await api('/api/notifications/read', { method: 'POST' });
          updateBell(0);
          notifPanel.querySelectorAll('.unread').forEach(el => el.classList.remove('unread'));
        });
      } catch (e) {
        notifPanel.innerHTML = `<div class="error-state"><span>${escapeHtml(e.message)}</span></div>`;
      }
    });
    document.addEventListener('click', (ev) => {
      if (!ev.target.closest('.bell-wrap')) notifPanel.classList.add('hidden');
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // ---- award-modal ---------------------------------------------------------
  const modal = document.getElementById('award-modal');
  if (!modal) return;
  const personList = document.getElementById('person-list');
  const badgeList = document.getElementById('badge-list');
  const witnessList = document.getElementById('witness-list');
  const citation = document.getElementById('citation');
  const errBox = document.getElementById('award-error');
  let users = [], badges = [];
  let selPerson = null, selBadge = null, selWitnesses = new Set();
  let photoData = null, cameraStream = null;

  async function openModal(preselectBadge = null) {
    modal.classList.remove('hidden');
    errBox.classList.add('hidden');
    try {
      if (!users.length) users = (await api('/api/users')).users;
      if (!badges.length) badges = (await api('/api/badges')).badges;
    } catch (e) {
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
      return;
    }
    if (preselectBadge) {
      const b = badges.find(x => x.slug === preselectBadge);
      if (b) selBadge = b;
    }
    renderPersons(); renderBadges(); renderWitnesses();
  }

  function closeModal() {
    modal.classList.add('hidden');
    stopCamera();
  }

  function renderPersons() {
    const q = document.getElementById('pick-person').value.trim().toLowerCase();
    const items = users.filter(u => !q || u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    personList.innerHTML = items.length ? items.map(u =>
      `<button type="button" class="picker-item ${selPerson === u.username ? 'selected' : ''}" data-person="${u.username}" ${u.isSelf ? 'disabled' : ''}>
        ${escapeHtml(u.avatar_emoji)} ${escapeHtml(u.display_name)}${u.isSelf ? ' (jijzelf — dat mag dus niet)' : ''}${selPerson === u.username ? ' ✓' : ''}
      </button>`).join('')
      : '<div class="empty-state"><p>Niemand gevonden met deze naam.</p></div>';
  }

  function renderBadges() {
    const q = document.getElementById('pick-badge').value.trim().toLowerCase();
    const items = badges.filter(b => !q || b.naam.toLowerCase().includes(q));
    badgeList.innerHTML = items.length ? items.slice(0, 60).map(b =>
      `<button type="button" class="picker-item ${selBadge && selBadge.slug === b.slug ? 'selected' : ''}" data-badge="${b.slug}">
        ${escapeHtml(b.emoji)} ${escapeHtml(b.naam)} <span class="rarity-label ${b.rarity}" style="margin-left:auto">${b.rarity === 'common' ? 'gewoon' : b.rarity === 'uncommon' ? 'ongewoon' : b.rarity === 'rare' ? 'zeldzaam' : 'legendarisch'}</span>${selBadge && selBadge.slug === b.slug ? ' ✓' : ''}
      </button>`).join('')
      : '<div class="empty-state"><p>Geen badge gevonden. Probeer een ander woord.</p></div>';
  }

  function renderWitnesses() {
    const candidates = users.filter(u => !u.isSelf && u.username !== selPerson);
    witnessList.innerHTML = candidates.map(u =>
      `<button type="button" class="picker-item ${selWitnesses.has(u.username) ? 'selected' : ''}" data-witness="${u.username}">
        ${escapeHtml(u.avatar_emoji)} ${escapeHtml(u.display_name)}${selWitnesses.has(u.username) ? ' ✋' : ''}
      </button>`).join('');
  }

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeModal();
    const item = ev.target.closest('.picker-item');
    if (!item) return;
    if (item.dataset.person) {
      selPerson = item.dataset.person;
      selWitnesses.delete(selPerson);
      renderPersons(); renderWitnesses();
    } else if (item.dataset.badge) {
      selBadge = badges.find(b => b.slug === item.dataset.badge);
      renderBadges();
    } else if (item.dataset.witness) {
      const w = item.dataset.witness;
      if (selWitnesses.has(w)) selWitnesses.delete(w); else selWitnesses.add(w);
      renderWitnesses();
    }
  });
  document.getElementById('pick-person').addEventListener('input', renderPersons);
  document.getElementById('pick-badge').addEventListener('input', renderBadges);
  citation.addEventListener('input', () => {
    document.getElementById('citation-count').textContent = citation.value.length;
  });

  // camera (alleen live capture; geen camerarol — BeReal-principe)
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const preview = document.getElementById('photo-preview');
  const cameraError = document.getElementById('camera-error');
  document.getElementById('camera-btn').addEventListener('click', async () => {
    cameraError.classList.add('hidden');
    if (cameraStream) {
      // tweede klik = vastleggen
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      photoData = canvas.toDataURL('image/jpeg', 0.8);
      preview.src = photoData;
      preview.classList.remove('hidden');
      stopCamera();
      document.getElementById('camera-btn').textContent = '📷 Opnieuw';
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = cameraStream;
      video.classList.remove('hidden');
      preview.classList.add('hidden');
      photoData = null;
      document.getElementById('camera-btn').textContent = '📸 Leg vast';
    } catch (e) {
      cameraError.textContent = 'Geen camera beschikbaar. De badge kan ook zonder foto — hij telt dan als "volgens zeggen".';
      cameraError.classList.remove('hidden');
    }
  });
  function stopCamera() {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    video.classList.add('hidden');
  }

  document.getElementById('award-submit').addEventListener('click', async () => {
    errBox.classList.add('hidden');
    document.getElementById('citation-error').classList.add('hidden');
    if (!selPerson) { errBox.textContent = 'Kies eerst een ontvanger.'; errBox.classList.remove('hidden'); return; }
    if (!selBadge) { errBox.textContent = 'Kies eerst een badge uit de catalogus.'; errBox.classList.remove('hidden'); return; }
    try {
      const data = await api('/api/awards', {
        method: 'POST',
        body: {
          recipient_username: selPerson,
          badge_slug: selBadge.slug,
          citation: citation.value,
          witness_usernames: [...selWitnesses],
          photo: photoData,
          moment: document.getElementById('moment').value,
        },
      });
      closeModal();
      updateBudget(data.remaining);
      if (feed) {
        const empty = feed.querySelector('.empty-state');
        if (empty) empty.remove();
        const tmp = document.createElement('div');
        tmp.innerHTML = data.html;
        const card = tmp.firstElementChild;
        card.classList.remove('reveal');
        feed.prepend(card);
        latest = card.dataset.created || latest;
      } else {
        window.location.href = '/';
      }
      // formulier resetten voor de volgende daad
      selPerson = null; selBadge = null; selWitnesses = new Set();
      citation.value = ''; photoData = null;
      preview.classList.add('hidden');
      document.getElementById('citation-count').textContent = '0';
      document.getElementById('camera-btn').textContent = '📷 Maak foto';
    } catch (e) {
      const box = /citatie/i.test(e.message) ? document.getElementById('citation-error') : errBox;
      box.textContent = e.message;
      box.classList.remove('hidden');
    }
  });
  document.getElementById('award-cancel').addEventListener('click', closeModal);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

  const openBtn = document.getElementById('open-award-btn');
  if (openBtn) openBtn.addEventListener('click', () => openModal());
  const emptyBtn = document.getElementById('empty-award-btn');
  if (emptyBtn) emptyBtn.addEventListener('click', () => openModal());
  document.querySelectorAll('[data-preselect-badge]').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.preselectBadge)));

  // ---- profiel bewerken ----------------------------------------------------
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const errEl = document.getElementById('profile-error');
      errEl.classList.add('hidden');
      try {
        await api('/api/profile', {
          method: 'POST',
          body: {
            bio: document.getElementById('p-bio').value,
            avatar_emoji: document.getElementById('p-avatar').value,
          },
        });
        document.getElementById('profile-saved').textContent = 'Opgeslagen ✓';
        setTimeout(() => window.location.reload(), 600);
      } catch (e) {
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
      }
    });
  }
})();
