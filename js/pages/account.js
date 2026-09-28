/* account.js — profile dashboard, My Vault, room history */
initChrome('account');
renderFooter();

const u = Auth.currentUser();
if (!u || u.guest) {
  $('#gate').classList.remove('hidden');
} else {
  $('#account').classList.remove('hidden');
  boot();
}

function boot() {
  renderProfile();
  renderChars();
  renderMaps();
  renderPlaylist();
  renderHistory();

  $('#logout').addEventListener('click', () => { Auth.logout(); location.href = 'index.html'; });

  /* ---------- avatar ---------- */
  $('#change-avatar').addEventListener('click', () => {
    const rec = Store.findUser(u.username);
    const ov = openModal(`
      <div class="modal-head"><h3>Choose your face</h3><button class="modal-x">✕</button></div>
      <div class="avatar-picker">${AVATARS.map(a =>
        `<span data-av="${a}" class="${rec.avatar === a && !rec.avatarImg ? 'active' : ''}">${iconHtml(a)}</span>`).join('')}</div>
      <label class="field mt2"><span>…or upload a portrait</span>
        <input type="file" id="av-file" accept="image/*"></label>
    `);
    $$('.avatar-picker span', ov).forEach(s => s.addEventListener('click', () => {
      Auth.updateProfile({ avatar: s.dataset.av, avatarImg: null });
      closeModal(); renderProfile(); toast(I18n.t('a_avatar_ok'), 'ok');
    }));
    $('#av-file', ov).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = await fileToScaledDataURL(f, 240);
        Auth.updateProfile({ avatarImg: data });
        closeModal(); renderProfile(); toast(I18n.t('a_portrait_ok'), 'ok');
      } catch { toast(I18n.t('a_imgbad'), 'err'); }
    });
  });

  /* ---------- title & bio ---------- */
  $('#edit-profile').addEventListener('click', () => {
    const rec = Store.findUser(u.username);
    const ov = openModal(`
      <div class="modal-head"><h3>${I18n.t('a_edit_profile')}</h3><button class="modal-x">✕</button></div>
      <label class="field"><span>${I18n.t('a_title')}</span>
        <div class="title-grid">${TITLES.map(t =>
          `<div class="tile${t.id === (rec.title || 'adventurer') ? ' active' : ''}" data-t="${t.id}">${iconHtml(t.icon)}<span>${escapeHtml(I18n.t(t.key))}</span></div>`).join('')}</div>
      </label>
      <label class="field mt1"><span>${I18n.t('a_bio')}</span>
        <textarea id="bio-input" rows="4" maxlength="280" style="width:100%;" placeholder="${I18n.t('a_bio_ph')}">${escapeHtml(rec.bio || '')}</textarea>
      </label>
      <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
        <button class="btn btn-gold" id="save-profile">${I18n.t('a_save_profile')}</button>
      </div>
    `);
    let sel = rec.title || 'adventurer';
    $$('.title-grid .tile', ov).forEach(tl => tl.addEventListener('click', () => {
      sel = tl.dataset.t;
      $$('.title-grid .tile', ov).forEach(x => x.classList.toggle('active', x === tl));
    }));
    $('#save-profile', ov).addEventListener('click', () => {
      Auth.updateProfile({ title: sel, bio: $('#bio-input', ov).value.trim() });
      closeModal(); renderProfile(); toast(I18n.t('a_profile_saved'), 'ok');
    });
  });

  /* ---------- characters ---------- */
  

  function renderProfile() {
    const rec = Store.findUser(u.username);
    $('#profile-name').textContent = rec.username;
    $('#profile-avatar').innerHTML = rec.avatarImg ? `<img src="${rec.avatarImg}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid var(--torch);">` : iconHtml(rec.avatar || '👤');
    const tt = titleOf(rec.title || 'adventurer');
    const tb = $('#profile-title');
    tb.innerHTML = `${iconHtml(tt.icon)} <span data-i18n="${tt.key}">${escapeHtml(I18n.t(tt.key))}</span>`;
    $('#profile-bio').textContent = rec.bio || I18n.t('a_bio_ph');
    $('#profile-since').textContent = I18n.t('a_since', { date: fmtDate(rec.createdAt) });
    const s = rec.stats || {};
    $('#stat-hosted').textContent = s.roomsHosted || 0;
    $('#stat-joined').textContent = s.roomsJoined || 0;
    $('#stat-dice').textContent = s.diceRolled || 0;
    $('#stat-maps').textContent = Store.maps().filter(m => m.owner === u.username).length;
  }

  function renderChars() {
    const grid = $('#char-grid');
    const chars = Store.charsFor(u.username);
    grid.innerHTML = '';
    $('#no-chars').classList.toggle('hidden', chars.length > 0);
    for (const c of chars) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <div class="row" style="align-items:flex-start;">
          <div style="font-size:2.4rem;width:56px;height:56px;display:grid;place-items:center;background:var(--stone-3);border-radius:12px;border:1px solid var(--line);overflow:hidden;">
            ${c.tokenImg ? `<img src="${c.tokenImg}" style="width:100%;height:100%;object-fit:cover;">` : iconHtml(c.tokenEmoji || '❓')}
          </div>
          <div class="grow">
            <b>${escapeHtml(c.name)}</b><br>
            <small>${escapeHtml(c.cls || I18n.t('p_role_pl'))} · Lv ${c.level || 1}</small><br>
            <span class="badge dim mt0" style="margin-top:.3rem;">❤️ ${c.hp}/${c.maxHp}</span>
            <span class="badge dim">🛡️ ${c.ac}</span>
          </div>
        </div>
        <div class="row mt1">
          <button class="btn btn-sm" data-act="edit">${I18n.t('a_edit')}</button>
          <button class="btn btn-sm btn-danger" data-act="del">${I18n.t('a_delete')}</button>
        </div>`;
      $('[data-act=edit]', el).addEventListener('click', () => { location.href = 'char-editor.html?edit=' + c.id; });
      $('[data-act=del]', el).addEventListener('click', () => {
        if (confirm(I18n.t('a_char_del_q', { name: c.name }))) { Store.deleteChar(c.id); renderChars(); }
      });
      grid.appendChild(el);
    }
  }

  /* ---------- saved maps ---------- */
  function renderMaps() {
    const grid = $('#map-grid');
    const maps = Store.maps().filter(m => m.owner === u.username);
    grid.innerHTML = '';
    $('#no-maps').classList.toggle('hidden', maps.length > 0);
    for (const m of maps) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <div style="height:90px;border-radius:8px;overflow:hidden;background:#0a0805;border:1px solid var(--line-soft);">
          ${m.src ? `<img src="${m.src}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:grid;place-items:center;height:100%;color:var(--ink-faint);">${I18n.t('a_blank')}</div>`}
        </div>
        <b class="mt1" style="display:block;">${escapeHtml(m.name)}</b>
        <small>${I18n.t('a_size', { c: m.cols, r: m.rows, g: I18n.t(m.grid === 'hex' ? 'a_grid_hex' : 'a_grid_square') })}</small>
        <div class="row mt1">
          <button class="btn btn-sm" data-act="edit">🧰 ${I18n.t('a_edit')}</button>
          <button class="btn btn-sm btn-danger" data-act="del">${I18n.t('a_delete')}</button>
        </div>`;
      $('[data-act=edit]', el).addEventListener('click', () => { location.href = 'map-editor.html?map=' + m.id; });
      $('[data-act=del]', el).addEventListener('click', () => {
        if (confirm(I18n.t('a_map_del_q', { name: m.name }))) { Store.deleteMap(m.id); renderMaps(); }
      });
      grid.appendChild(el);
    }
  }

  /* ---------- playlist ---------- */
  function renderPlaylist() {
    const box = $('#playlist');
    box.innerHTML = '';
    for (const p of Ambient.PRESETS) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.innerHTML = `${p.icon} ${p.name}`;
      b.title = p.desc;
      b.addEventListener('click', () => {
        if (Ambient.isPlaying()?.id === p.id) { Ambient.stop(); b.classList.remove('active'); return; }
        $$('.chip', box).forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        Ambient.play({ kind: 'synth', id: p.id }, 0.5);
        toast(I18n.t('a_now_playing', { name: escapeHtml(p.name), icon: p.icon }), 'ok');
      });
      box.appendChild(b);
    }
    const stop = document.createElement('button');
    stop.className = 'chip'; stop.textContent = I18n.t('cr_stop');
    stop.addEventListener('click', () => { Ambient.stop(); $$('.chip', box).forEach(x => x.classList.remove('active')); });
    box.appendChild(stop);
  }

  /* ---------- history ---------- */
  function renderHistory() {
    const list = $('#history-list');
    const items = Store.historyFor(u.username);
    list.innerHTML = '';
    $('#no-history').classList.toggle('hidden', items.length > 0);
    for (const h of items) {
      const el = document.createElement('div');
      el.className = 'player-row';
      el.innerHTML = `
        <div class="avatar">${h.role === 'host' ? '🕯️' : '🚪'}</div>
        <div class="grow">
          <div class="name">${escapeHtml(h.name)} <span class="badge ${h.state === 'live' ? 'green' : 'dim'}">${h.state === 'live' ? I18n.t('p_state_live') : h.state === 'lobby' ? I18n.t('a_state_lobby') : I18n.t('a_ended')}</span></div>
          <div class="sub">${h.role === 'host' ? I18n.t('a_hosted_h') : I18n.t('a_joined_h')} · ${fmtDate(h.date)} · ${I18n.t('a_party')} ${escapeHtml((h.players || []).join(', ') || '—')}</div>
        </div>
        <span class="badge gold">${escapeHtml(h.code)}</span>`;
      list.appendChild(el);
    }
  }
}

/* responsive profile grid */
const st = document.createElement('style');
st.textContent = '@media (max-width:860px){#profile-grid{grid-template-columns:1fr !important;}}';
document.head.appendChild(st);
