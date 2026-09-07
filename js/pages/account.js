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
        `<span data-av="${a}" class="${rec.avatar === a && !rec.avatarImg ? 'active' : ''}">${a}</span>`).join('')}</div>
      <label class="field mt2"><span>…or upload a portrait</span>
        <input type="file" id="av-file" accept="image/*"></label>
    `);
    $$('.avatar-picker span', ov).forEach(s => s.addEventListener('click', () => {
      Auth.updateProfile({ avatar: s.dataset.av, avatarImg: null });
      closeModal(); renderProfile(); toast('Avatar updated.', 'ok');
    }));
    $('#av-file', ov).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = await fileToScaledDataURL(f, 240);
        Auth.updateProfile({ avatarImg: data });
        closeModal(); renderProfile(); toast('Portrait hung in the hall.', 'ok');
      } catch { toast('That image could not be read.', 'err'); }
    });
  });

  /* ---------- characters ---------- */
  $('#new-char').addEventListener('click', () => openCharEditor(null));

  function renderProfile() {
    const rec = Store.findUser(u.username);
    $('#profile-name').textContent = rec.username;
    $('#profile-avatar').innerHTML = rec.avatarImg ? `<img src="${rec.avatarImg}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid var(--torch);">` : rec.avatar;
    $('#profile-since').textContent = 'In the cave since ' + fmtDate(rec.createdAt);
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
            ${c.tokenImg ? `<img src="${c.tokenImg}" style="width:100%;height:100%;object-fit:cover;">` : (c.tokenEmoji || '❓')}
          </div>
          <div class="grow">
            <b>${escapeHtml(c.name)}</b><br>
            <small>${escapeHtml(c.cls || 'Adventurer')} · Lv ${c.level || 1}</small><br>
            <span class="badge dim mt0" style="margin-top:.3rem;">❤️ ${c.hp}/${c.maxHp}</span>
            <span class="badge dim">🛡️ ${c.ac}</span>
          </div>
        </div>
        <div class="row mt1">
          <button class="btn btn-sm" data-act="edit">Edit</button>
          <button class="btn btn-sm btn-danger" data-act="del">Delete</button>
        </div>`;
      $('[data-act=edit]', el).addEventListener('click', () => openCharEditor(c));
      $('[data-act=del]', el).addEventListener('click', () => {
        if (confirm(`Send "${c.name}" off to retirement?`)) { Store.deleteChar(c.id); renderChars(); }
      });
      grid.appendChild(el);
    }
  }

  function openCharEditor(existing) {
    const c = existing || {
      id: uid(), owner: u.username, name: '', cls: 'Fighter', level: 1,
      hp: 10, maxHp: 10, ac: 14, speed: 30, attacks: '', notes: '',
      tokenEmoji: '🧝', tokenImg: null,
    };
    const ov = openModal(`
      <div class="modal-head"><h3>${existing ? 'Edit' : 'Forge'} character card</h3><button class="modal-x">✕</button></div>
      <div class="inline-grid">
        <label class="field"><span>Name</span><input type="text" id="c-name" value="${escapeHtml(c.name)}"></label>
        <label class="field"><span>Class</span>
          <select id="c-cls">${['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'].map(x =>
            `<option ${c.cls === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Level</span><input type="number" id="c-level" min="1" max="20" value="${c.level}"></label>
        <label class="field"><span>Speed (ft)</span><input type="number" id="c-speed" min="0" step="5" value="${c.speed}"></label>
        <label class="field"><span>Max HP</span><input type="number" id="c-maxhp" min="1" value="${c.maxHp}"></label>
        <label class="field"><span>AC</span><input type="number" id="c-ac" min="1" value="${c.ac}"></label>
      </div>
      <label class="field"><span>Main attacks (one per line, e.g. "Longsword +5 — 1d8+3 slashing")</span>
        <textarea id="c-attacks">${escapeHtml(c.attacks || '')}</textarea></label>
      <label class="field"><span>Notes / backstory</span><textarea id="c-notes">${escapeHtml(c.notes || '')}</textarea></label>
      <div class="row between">
        <div>
          <span class="dim" style="font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;">Token portrait</span>
          <div class="token-emoji-picker mt1">${TOKEN_EMOJIS.map(e =>
            `<span data-e="${e}" class="${c.tokenEmoji === e && !c.tokenImg ? 'active' : ''}">${e}</span>`).join('')}</div>
        </div>
        <div style="max-width:150px;">
          <div id="c-token-preview" style="width:64px;height:64px;font-size:2.4rem;display:grid;place-items:center;background:var(--stone-3);border-radius:50%;border:2px solid var(--line);margin:0 auto;overflow:hidden;">
            ${c.tokenImg ? `<img src="${c.tokenImg}" style="width:100%;height:100%;object-fit:cover;">` : c.tokenEmoji}
          </div>
          <input type="file" id="c-tokenfile" accept="image/*" class="mt1" style="width:130px;font-size:.72rem;">
        </div>
      </div>
      <div class="row end mt2">
        <button class="btn btn-ghost modal-x">Cancel</button>
        <button class="btn btn-primary" id="c-save">💾 Save to Vault</button>
      </div>
    `, { wide: true });

    const state = { ...c };
    $$('.token-emoji-picker span', ov).forEach(s => s.addEventListener('click', () => {
      state.tokenEmoji = s.dataset.e; state.tokenImg = null;
      $$('.token-emoji-picker span', ov).forEach(x => x.classList.toggle('active', x === s));
      $('#c-token-preview', ov).innerHTML = state.tokenEmoji;
    }));
    $('#c-tokenfile', ov).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        state.tokenImg = await fileToScaledDataURL(f, 200);
        $('#c-token-preview', ov).innerHTML = `<img src="${state.tokenImg}" style="width:100%;height:100%;object-fit:cover;">`;
      } catch { toast('Could not read that image.', 'err'); }
    });
    $('#c-save', ov).addEventListener('click', () => {
      state.name = $('#c-name', ov).value.trim() || 'Nameless One';
      state.cls = $('#c-cls', ov).value;
      state.level = clamp(parseInt($('#c-level', ov).value) || 1, 1, 20);
      state.speed = parseInt($('#c-speed', ov).value) || 30;
      state.maxHp = Math.max(1, parseInt($('#c-maxhp', ov).value) || 10);
      state.hp = Math.min(existing ? existing.hp : state.maxHp, state.maxHp);
      state.ac = parseInt($('#c-ac', ov).value) || 10;
      state.attacks = $('#c-attacks', ov).value;
      state.notes = $('#c-notes', ov).value;
      Store.saveChar(state);
      closeModal(); renderChars(); toast(`<b>${escapeHtml(state.name)}</b> saved to the Vault.`, 'ok');
    });
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
          ${m.src ? `<img src="${m.src}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:grid;place-items:center;height:100%;color:var(--ink-faint);">Blank grid</div>'}
        </div>
        <b class="mt1" style="display:block;">${escapeHtml(m.name)}</b>
        <small>${m.cols}×${m.rows} · ${m.grid === 'hex' ? 'hex' : 'square'} grid</small>
        <div class="row mt1">
          <button class="btn btn-sm btn-danger" data-act="del">Delete</button>
        </div>`;
      $('[data-act=del]', el).addEventListener('click', () => {
        if (confirm(`Burn the map "${m.name}"?`)) { Store.deleteMap(m.id); renderMaps(); }
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
        toast(`Now playing: <b>${p.name}</b> ${p.icon}`, 'ok');
      });
      box.appendChild(b);
    }
    const stop = document.createElement('button');
    stop.className = 'chip'; stop.innerHTML = '⏹️ Stop';
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
          <div class="name">${escapeHtml(h.name)} <span class="badge ${h.state === 'live' ? 'green' : 'dim'}">${h.state === 'live' ? 'live' : h.state}</span></div>
          <div class="sub">${h.role === 'host' ? 'Hosted' : 'Joined'} · ${fmtDate(h.date)} · Party: ${escapeHtml((h.players || []).join(', ') || '—')}</div>
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
