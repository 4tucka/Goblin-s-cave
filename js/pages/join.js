/* join.js — player join flow: code → password → character → lobby */
initChrome('join');
renderFooter();

const u = Auth.currentUser() || Auth.becomeGuest('Wanderer');
const panes = ['pane-code', 'pane-pass', 'pane-char', 'pane-lobby', 'pane-gone'];
function showPane(id) { panes.forEach(p => $('#' + p).classList.toggle('hidden', p !== id)); }

let code = roomCodeOf();
let room = null;
let myPlayerId = u.id;
let myChar = null;
let myReady = false;
let importedChar = null; // full object from advanced editor / web import

/* token emoji picker */
let chEmoji = 'assets/icons/barbarian.svg', chImg = null;
const em = $('#ch-emojis');
TOKEN_EMOJIS.forEach((e, i) => {
  const s = document.createElement('span');
  s.innerHTML = iconHtml(e);
  if (e === chEmoji) s.classList.add('active');
  s.addEventListener('click', () => {
    chEmoji = e; chImg = null;
    $$('#ch-emojis span').forEach(x => x.classList.toggle('active', x === s));
    $('#ch-preview').innerHTML = iconHtml(e);
  });
  em.appendChild(s);
});
$('#ch-preview').innerHTML = iconHtml(chEmoji);
$('#ch-img').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    chImg = await fileToScaledDataURL(f, 200);
    $('#ch-preview').innerHTML = `<img src="${chImg}" style="width:100%;height:100%;object-fit:cover;">`;
  } catch { toast(I18n.t('j_imgbad'), 'err'); }
});

/* ============================================================
   Step A — code entry
============================================================ */
function extractCode(raw) {
  raw = (raw || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const c = url.searchParams.get('code');
    if (c) return c.toUpperCase();
  } catch { /* not a URL */ }
  const m = raw.toUpperCase().match(/[A-Z0-9]{5}/);
  return m ? m[0] : raw.toUpperCase();
}

$('#code-form').addEventListener('submit', e => {
  e.preventDefault();
  const c = extractCode($('#code-input').value);
  if (c.length < 4) return toast(I18n.t('j_toast_code5'), 'err');
  loadRoom(c);
});

function loadRoom(c) {
  code = c;
  room = Store.getRoom(code);
  $('#code-error').classList.toggle('hidden', !!room);
  if (!room) { showPane('pane-code'); return; }
  history.replaceState(null, '', 'join.html?code=' + code);

  // already live and I'm in it? straight to play
  const me = room.players.find(p => p.id === myPlayerId);
  if (room.state === 'live') {
    if (me) return (location.href = 'play.html?room=' + code);
  }
  if (room.state === 'ended') return showPane('pane-gone');

  if (room.password && !me) {
    $('#pass-room-name').textContent = room.name;
    showPane('pane-pass');
    return;
  }
  if (me) { myChar = me.character; myReady = me.ready; enterLobby(); return; }
  showCharPane();
}

$('#pass-form').addEventListener('submit', e => {
  e.preventDefault();
  const ok = $('#pass-input').value === room.password;
  $('#pass-error').classList.toggle('hidden', ok);
  if (ok) showCharPane();
});

/* ============================================================
   Step B — character selection
============================================================ */
function showCharPane() {
  showPane('pane-char');
  $('#room-name').textContent = room.name;
  $('#room-code-badge').textContent = code;
  $('#room-host').textContent = room.hostName;
  $('#room-count').textContent = `${room.players.length}/${room.maxPlayers}`;
  $('#room-state-badge').textContent = room.state;
  $('#enter-hint').textContent = '';
  $('#ch-advanced').href = 'char-editor.html?return=join&room=' + encodeURIComponent(code);
  $('#ch-save-note').textContent = u.guest ? '(create a free account to keep it)' : '';

  const vault = $('#vault-section');
  if (!u.guest) {
    vault.classList.remove('hidden');
    const box = $('#vault-choices');
    box.innerHTML = '';
    const chars = Store.charsFor(u.username);
    if (!chars.length) box.innerHTML = `<p class="dim">${I18n.t('j_vault_empty')}</p>`;
    for (const c of chars) {
      const card = document.createElement('div');
      card.className = 'card clickable';
      card.innerHTML = `
        <div class="row">
          <div style="font-size:2rem;">${c.tokenImg ? `<img src="${c.tokenImg}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">` : c.tokenEmoji}</div>
          <div><b>${escapeHtml(c.name)}</b><br><small>${escapeHtml(c.cls)} · Lv ${c.level} · ❤️ ${c.maxHp} · 🛡️ ${c.ac}</small></div>
        </div>`;
      card.addEventListener('click', () => pickVaultChar(c));
      box.appendChild(card);
    }
  }
}

function pickVaultChar(c) {
  $('#ch-name').value = c.name;
  $('#ch-cls').value = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'].includes(c.cls) ? c.cls : 'Fighter';
  $('#ch-level').value = c.level;
  $('#ch-hp').value = c.maxHp;
  $('#ch-ac').value = c.ac;
  $('#ch-speed').value = c.speed;
  $('#ch-atk').value = c.attacks || '';
  myChar = { ...c, hp: c.maxHp };
  toast(`Equipped <b>${escapeHtml(c.name)}</b> from the Vault.`, 'ok');
}

/* sheet upload (JSON parsed; PDF gets guidance) */
$('#ch-sheet').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  if (/pdf$/i.test(f.name)) {
    toast('📄 ' + I18n.t('j_pdf'), 'err');
    return;
  }
  try {
    const ch = CharImport.normalize(JSON.parse(await f.text()));
    importedChar = ch;
    $('#ch-name').value = ch.name;
    $('#ch-level').value = ch.level;
    $('#ch-hp').value = ch.maxHp;
    $('#ch-ac').value = ch.ac;
    $('#ch-speed').value = ch.speed;
    $('#ch-atk').value = ch.attacks || '';
    if (CharImport.CLASSES.includes(ch.cls)) $('#ch-cls').value = ch.cls;
    toast(`Sheet imported: <b>${escapeHtml(ch.name)}</b> ✅`, 'ok');
  } catch { toast(I18n.t('j_jsonbad'), 'err'); }
});

function collectCard() {
  return {
    ...(importedChar || {}),
    name: $('#ch-name').value.trim() || u.name,
    cls: $('#ch-cls').value,
    level: clamp(parseInt($('#ch-level').value) || 1, 1, 20),
    maxHp: Math.max(1, parseInt($('#ch-hp').value) || 10),
    hp: Math.max(1, parseInt($('#ch-hp').value) || 10),
    ac: parseInt($('#ch-ac').value) || 10,
    speed: parseInt($('#ch-speed').value) || 30,
    attacks: $('#ch-atk').value.trim(),
    tokenEmoji: chEmoji,
    tokenImg: chImg,
  };
}

$('#enter-lobby').addEventListener('click', () => {
  room = Store.getRoom(code);
  if (!room) return showPane('pane-gone');
  if (room.players.length >= room.maxPlayers && !room.players.find(p => p.id === myPlayerId)) {
    $('#enter-hint').textContent = I18n.t('j_hint_full');
    return toast(I18n.t('j_toast_full'), 'err');
  }
  myChar = collectCard();

  if ($('#ch-save').checked && !u.guest) {
    Store.saveChar({ id: uid(), owner: u.username, ...myChar });
    toast(I18n.t('j_toast_saved'), 'ok');
  }

  room = Store.getRoom(code);
  const idx = room.players.length;
  const token = {
    id: 'tok-' + myPlayerId, playerId: myPlayerId, owner: myPlayerId,
    name: myChar.name, icon: myChar.tokenEmoji || '🧝', img: myChar.tokenImg || null,
    color: '#28402a', size: 1,
    hp: myChar.hp, maxHp: myChar.maxHp, ac: myChar.ac,
    x: room.map.grid === 'hex' ? Math.min(room.map.cols - 1, 1 + idx) : Math.min(room.map.cols - 1.5, 1.5 + idx),
    y: room.map.grid === 'hex' ? Math.max(0, room.map.rows - 2) : room.map.rows - 1.5,
  };
  // re-place if rejoining
  const existingIdx = room.players.findIndex(p => p.id === myPlayerId);
  if (existingIdx >= 0) {
    room.players[existingIdx] = { id: myPlayerId, name: u.name, guest: !!u.guest, ready: myReady, character: myChar };
    const oldTok = room.tokens.find(t => t.playerId === myPlayerId);
    if (oldTok) Object.assign(oldTok, {
      name: myChar.name, icon: myChar.tokenEmoji || '🧝', img: myChar.tokenImg || null,
      hp: myChar.hp, maxHp: myChar.maxHp, ac: myChar.ac,
    });
  } else {
    room.players.push({ id: myPlayerId, name: u.name, guest: !!u.guest, ready: false, character: myChar });
    room.tokens = room.tokens.filter(t => t.playerId !== myPlayerId);
    room.tokens.push(token);
    room.chat.push({ id: uid(), who: u.name, text: I18n.t('j_entered', { name: myChar.name }), type: 'sys', ts: Date.now() });
  }
  Store.saveRoom(room);
  Auth.bumpStat('roomsJoined');
  Store.upsertHistory({ code, name: room.name, date: Date.now(), hostName: room.hostName, role: 'joined', viewer: u.name, players: [u.name], state: room.state });
  if (room.state === 'live') { location.href = 'play.html?room=' + code; return; }
  enterLobby();
});

/* ============================================================
   Step C — lobby
============================================================ */
function enterLobby() {
  showPane('pane-lobby');
  $('#lobby-room-name').textContent = room.name;
  $('#lobby-code').textContent = code;
  Bus.on('room:' + code, onRoomUpdate);
  renderLobby();
}

function onRoomUpdate(latest) {
  if (!latest) { showPane('pane-gone'); return; }
  room = latest;
  if (room.state === 'live') { location.href = 'play.html?room=' + code; return; }
  if (room.state === 'ended') { showPane('pane-gone'); return; }
  renderLobby();
}

function renderLobby() {
  const roster = $('#lobby-roster');
  roster.innerHTML = '';
  // DM row
  const dmRow = document.createElement('div');
  dmRow.className = 'player-row';
  dmRow.innerHTML = `<div class="avatar">🕯️</div>
    <div class="grow"><div class="name">${escapeHtml(room.hostName)}</div>
    <div class="sub">${I18n.t('j_dm_lbl')}</div></div><span class="badge gold">${I18n.t('j_dm')}</span>`;
  roster.appendChild(dmRow);
  for (const p of room.players) {
    const row = document.createElement('div');
    row.className = 'player-row';
    const ch = p.character || {};
    row.innerHTML = `
      <div class="avatar">${ch.tokenImg ? `<img src="${ch.tokenImg}">` : (ch.tokenEmoji || '🎭')}</div>
      <div class="grow">
        <div class="name">${escapeHtml(p.name)} ${p.id === myPlayerId ? `<span class="badge blue">${I18n.t('j_you')}</span>` : ''} ${p.guest ? `<span class="badge dim">${I18n.t('cr_guest')}</span>` : ''}</div>
        <div class="sub">${escapeHtml(ch.name || '?')} — ${escapeHtml(ch.cls || '?')} Lv ${ch.level || 1} · ❤️ ${ch.hp}/${ch.maxHp} · 🛡️ ${ch.ac}</div>
      </div>
      ${p.ready ? `<span class="badge green">${I18n.t('cr_ready')}</span>` : `<span class="badge dim">${I18n.t('j_notready')}</span>`}`;
    roster.appendChild(row);
  }

  const me = room.players.find(p => p.id === myPlayerId);
  myReady = me ? me.ready : false;
  const btn = $('#ready-btn');
  btn.textContent = myReady ? I18n.t('j_unready') : I18n.t('j_ready');
  btn.className = 'btn ' + (myReady ? 'btn-danger' : 'btn-green');
  $('#ready-hint').textContent = myReady ? I18n.t('j_ready_hint') : '';

  const ch = me?.character || myChar || {};
  $('#my-char-summary').innerHTML = `
    <div class="panel-title"><h3 class="mt0">${I18n.t('j_your_hero')}</h3></div>
    <div class="row">
      <div style="font-size:2.2rem;">${ch.tokenImg ? `<img src="${ch.tokenImg}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` : (ch.tokenEmoji || '❓')}</div>
      <div><b>${escapeHtml(ch.name || '')}</b><br>
      <small>${escapeHtml(ch.cls || '')} · Lv ${ch.level || 1} · Speed ${ch.speed || 30} ft</small></div>
    </div>
    <div class="stat-mini mt1">
      <span>❤️ HP <b>${ch.hp ?? '?'}/${ch.maxHp ?? '?'}</b></span>
      <span>🛡️ AC <b>${ch.ac ?? '?'}</b></span>
    </div>
    ${ch.attacks ? `<p class="dim mt1" style="font-size:.82rem;white-space:pre-line;">⚔️ ${escapeHtml(ch.attacks)}</p>` : ''}`;

  renderChat();
}

$('#ready-btn').addEventListener('click', () => {
  room = Store.getRoom(code);
  const me = room.players.find(p => p.id === myPlayerId);
  if (!me) return;
  me.ready = !me.ready;
  Store.saveRoom(room);
  renderLobby();
});

$('#leave-room').addEventListener('click', () => {
  room = Store.getRoom(code);
  if (room) {
    room.players = room.players.filter(p => p.id !== myPlayerId);
    room.tokens = room.tokens.filter(t => t.playerId !== myPlayerId);
    Store.saveRoom(room);
  }
  location.href = 'join.html';
});

function renderChat() {
  const box = $('#lobby-chat');
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = room.chat.slice(-80).map(m => `
    <div class="chat-msg ${m.type === 'sys' ? 'sys' : ''}">
      ${m.type !== 'sys' ? `<span class="who">${escapeHtml(m.who)}</span>` : ''}${escapeHtml(m.text)}
      <span class="ts">${fmtTime(m.ts)}</span>
    </div>`).join('');
  if (atBottom) box.scrollTop = box.scrollHeight;
}
function sendChat() {
  const input = $('#lobby-chat-input');
  const text = input.value.trim();
  if (!text) return;
  room = Store.getRoom(code);
  if (!room) return;
  room.chat.push({ id: uid(), who: u.name, text, type: 'msg', ts: Date.now() });
  Store.saveRoom(room);
  input.value = '';
  renderChat();
}
$('#lobby-chat-send').addEventListener('click', sendChat);
$('#lobby-chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

/* boot */
(function absorbDraft() {
  const raw = localStorage.getItem('gc_char_draft');
  if (!raw) return;
  try {
    importedChar = JSON.parse(raw);
    localStorage.removeItem('gc_char_draft');
    $('#ch-name').value = importedChar.name || '';
    $('#ch-hp').value = importedChar.maxHp || 10;
    $('#ch-ac').value = importedChar.ac || 10;
    $('#ch-level').value = importedChar.level || 1;
    $('#ch-speed').value = importedChar.speed || 30;
    $('#ch-atk').value = importedChar.attacks || '';
    toast(`⚒️ <b>${escapeHtml(importedChar.name)}</b> stepped out of the forge.`, 'ok');
  } catch {}
})();
if (code) loadRoom(code); else showPane('pane-code');
