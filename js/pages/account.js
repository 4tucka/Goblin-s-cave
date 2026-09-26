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
      $('[data-act=edit]', el).addEventListener('click', () => { location.href = 'char-editor.html?edit=' + c.id; });
      $('[data-act=del]', el).addEventListener('click', () => {
        if (confirm(`Send "${c.name}" off to retirement?`)) { Store.deleteChar(c.id); renderChars(); }
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
          ${m.src ? `<img src="${m.src}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:grid;place-items:center;height:100%;color:var(--ink-faint);">Blank grid</div>'}
        </div>
        <b class="mt1" style="display:block;">${escapeHtml(m.name)}</b>
        <small>${m.cols}×${m.rows} · ${m.grid === 'hex' ? 'hex' : 'square'} grid</small>
        <div class="row mt1">
          <button class="btn btn-sm" data-act="edit">🧰 Edit</button>
          <button class="btn btn-sm btn-danger" data-act="del">Delete</button>
        </div>`;
      $('[data-act=edit]', el).addEventListener('click', () => { location.href = 'map-editor.html?map=' + m.id; });
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
