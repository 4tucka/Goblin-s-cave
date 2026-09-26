/* create.js — DM room creation wizard (5 steps) */
initChrome('create');
renderFooter();

const u = Auth.currentUser();
if (!u) { Auth.becomeGuest('Dungeon Master'); }
$('#host-name').textContent = Auth.currentUser().name;

/* ============================================================
   Draft state
============================================================ */
const TEMPLATES = {
  cave:    { src: 'assets/map-cave.jpg',    name: 'Goblin Cave' },
  dungeon: { src: 'assets/map-dungeon.jpg', name: 'Stone Dungeon' },
  tavern:  { src: 'assets/map-tavern.jpg',  name: 'Tavern' },
  blank:   { src: null,                     name: 'Blank Grid' },
};

const draft = {
  name: '', password: '', maxPlayers: 6,
  map: { kind: 'template', src: TEMPLATES.cave.src, cols: 16, rows: 12, cs: 48, grid: 'square' },
  terrain: {},
  fog: new Set(),
  npcs: [
    { id: uid(), name: 'Goblin Scout', type: 'Goblin', hp: 7, maxHp: 7, ac: 13, icon: '👺', atk: 'Scimitar +4 — 1d6+2 slashing' },
    { id: uid(), name: 'Cave Wolf', type: 'Wolf', hp: 11, maxHp: 11, ac: 13, icon: '🐺', atk: 'Bite +4 — 2d4+2 piercing' },
  ],
  tokens: [],
  audio: { kind: 'synth', id: 'cave', name: '💧 Cave Drips', url: '' },
};

let roomPosted = null;   // room code once posted
let currentStep = 1;
let selectedTokenId = null;
let placedNpcId = '';

/* ============================================================
   Wizard navigation
============================================================ */
function goStep(n) {
  currentStep = n;
  $$('[data-panel]').forEach(p => p.classList.toggle('hidden', +p.dataset.panel !== n));
  $$('#steps li').forEach(li => {
    const s = +li.dataset.step;
    li.classList.toggle('active', s === n);
    li.classList.toggle('done', s < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (n === 2) { refreshPlaceNpcSelect(); setTimeout(() => mc.fit(), 30); }
  if (n === 3) renderNpcList();
  if (n === 4) renderAudioPresets();
  if (n === 5 && roomPosted) enterLobbyView();
}
$$('#steps li').forEach(li => li.addEventListener('click', () => {
  if (li.classList.contains('done')) goStep(+li.dataset.step);
}));
$$('[data-next]').forEach(b => b.addEventListener('click', () => {
  if (currentStep === 1) {
    draft.name = $('#r-name').value.trim();
    if (!draft.name) return toast('Give your lair a name first!', 'err');
    draft.password = $('#r-access').value === 'password' ? $('#r-pass').value.trim() : '';
    if ($('#r-access').value === 'password' && !draft.password) return toast('Set a password, or switch the room to Open.', 'err');
    draft.maxPlayers = clamp(parseInt($('#r-max').value) || 6, 1, 12);
  }
  goStep(+b.dataset.next);
}));
$$('[data-prev]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.prev)));

$('#r-name').value = pick(['The Sunken Temple', "Wyrmscar Hollow", 'The Dripping Dark', 'Redfang Warrens', 'Tomb of the Lantern King']) + '';

/* access rule <-> password wiring */
function syncAccess() {
  const open = $('#r-access').value === 'open';
  $('#r-pass').disabled = open;
  if (open) { $('#r-pass').value = ''; }
}
$('#r-access').addEventListener('change', syncAccess);
syncAccess();

/* ============================================================
   STEP 2 — Map Builder
============================================================ */
const mc = new MapCanvas($('#builder-canvas'), {
  getData: () => ({
    ...draft.map, terrain: draft.terrain, fog: draft.fog, tokens: draft.tokens,
    dmView: true, selectedTokenId,
  }),
  onAction,
  canMoveToken: () => true,
});

let terrainColor = TERRAIN_SWATCHES[1].c;

function onAction(action, payload) {
  if (action === 'paintTerrain') { draft.terrain[Grid.cellKey(payload.col, payload.row)] = terrainColor; mc.render(); }
  if (action === 'eraseTerrain') { delete draft.terrain[Grid.cellKey(payload.col, payload.row)]; mc.render(); }
  if (action === 'paintFog') { draft.fog.add(Grid.cellKey(payload.col, payload.row)); mc.render(); }
  if (action === 'eraseFog') { draft.fog.delete(Grid.cellKey(payload.col, payload.row)); mc.render(); }
  if (action === 'placeToken') placeTokenAt(payload.col, payload.row);
  if (action === 'selectToken') selectToken(payload);
  if (action === 'moveToken' || action === 'dragToken') mc.render();
}

function placeTokenAt(col, row) {
  const npc = draft.npcs.find(n => n.id === placedNpcId);
  if (!npc) return toast('Pick which NPC to place (dropdown next to 🎯).', 'err');
  const t = makeNpcToken(npc, col, row);
  draft.tokens.push(t);
  selectToken(t);
  mc.render();
}

function makeNpcToken(npc, col, row) {
  const isHex = draft.map.grid === 'hex';
  return {
    id: uid(), npcId: npc.id, name: npc.name, icon: npc.icon, img: null,
    color: '#4a2018', owner: 'dm',
    hp: npc.maxHp, maxHp: npc.maxHp, ac: npc.ac, atk: npc.atk,
    size: 1,
    x: isHex ? col : col + 0.5,
    y: isHex ? row : row + 0.5,
  };
}

function selectToken(t) {
  selectedTokenId = t ? t.id : null;
  $('#sel-token-empty').classList.toggle('hidden', !!t);
  $('#sel-token-panel').classList.toggle('hidden', !t);
  if (t) {
    $('#t-name').value = t.name;
    $('#t-size').value = t.size;
    $('#t-size-val').textContent = t.size;
  }
  mc.render();
}
$('#t-name').addEventListener('input', () => {
  const t = draft.tokens.find(x => x.id === selectedTokenId);
  if (t) { t.name = $('#t-name').value; mc.render(); }
});
$('#t-size').addEventListener('input', () => {
  const t = draft.tokens.find(x => x.id === selectedTokenId);
  if (t) { t.size = parseFloat($('#t-size').value); $('#t-size-val').textContent = t.size; mc.render(); }
});
$('#t-del').addEventListener('click', () => {
  draft.tokens = draft.tokens.filter(x => x.id !== selectedTokenId);
  selectToken(null); mc.render();
});
$('#t-dup').addEventListener('click', () => {
  const t = draft.tokens.find(x => x.id === selectedTokenId);
  if (!t) return;
  const copy = { ...t, id: uid(), x: t.x + (draft.map.grid === 'hex' ? 1 : 1), name: t.name + ' ‧' };
  draft.tokens.push(copy); selectToken(copy); mc.render();
});

/* tools */
$$('#map-tools [data-tool]').forEach(b => b.addEventListener('click', () => {
  $$('#map-tools [data-tool]').forEach(x => x.classList.toggle('active', x === b));
  mc.mode = b.dataset.tool;
}));
$('#map-tools [data-tool="pan"]').classList.add('active');

/* swatches */
const sw = $('#swatches');
TERRAIN_SWATCHES.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === 1 ? ' active' : '');
  b.style.background = s.c; b.title = s.name;
  b.addEventListener('click', () => {
    terrainColor = s.c;
    $$('.swatch', sw).forEach(x => x.classList.toggle('active', x === b));
  });
  sw.appendChild(b);
});

$('#clear-terrain').addEventListener('click', () => { draft.terrain = {}; mc.render(); });
$('#clear-fog').addEventListener('click', () => { draft.fog.clear(); mc.render(); });
$('#zoom-in').addEventListener('click', () => mc.zoomBy(1.2));
$('#zoom-out').addEventListener('click', () => mc.zoomBy(0.83));
$('#zoom-fit').addEventListener('click', () => mc.fit());

/* templates & upload */
$$('[data-tpl]').forEach(b => b.addEventListener('click', () => {
  $$('[data-tpl]').forEach(x => x.classList.toggle('active', x === b));
  draft.map.kind = 'template';
  draft.map.src = TEMPLATES[b.dataset.tpl].src;
  mc.render();
}));
$('#map-upload').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    draft.map.kind = 'upload';
    draft.map.src = await fileToScaledDataURL(f, 1400, 0.82);
    $$('[data-tpl]').forEach(x => x.classList.remove('active'));
    mc.render();
    toast('Custom map unfurled on the table.', 'ok');
  } catch { toast('Could not read that image.', 'err'); }
});

/* vault maps */
function refreshVaultMaps() {
  const sel = $('#vault-maps');
  sel.innerHTML = '<option value="">📂 Load from My Vault…</option>';
  if (!u || u.guest) return;
  for (const m of Store.maps().filter(m => m.owner === u.username)) {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = m.name;
    sel.appendChild(o);
  }
}
$('#vault-maps').addEventListener('change', e => {
  const m = Store.maps().find(x => x.id === e.target.value);
  if (!m) return;
  Object.assign(draft.map, { kind: 'vault', src: m.src, cols: m.cols, rows: m.rows, grid: m.grid, cs: draft.map.cs });
  draft.terrain = { ...(m.terrain || {}) };
  draft.fog = new Set(m.fog || []);
  $('#g-cols').value = m.cols; $('#g-rows').value = m.rows;
  $$('[data-grid]').forEach(x => x.classList.toggle('active', x.dataset.grid === m.grid));
  mc.fit();
  toast(`Loaded <b>${escapeHtml(m.name)}</b> from the Vault.`, 'ok');
});
$('#map-save-vault').addEventListener('click', () => {
  const cu = Auth.currentUser();
  if (!cu || cu.guest) return toast('Sign up to save maps in your Vault.', 'err');
  const ok = Store.saveMap({
    id: uid(), owner: cu.username,
    name: prompt('Name this map:', draft.name || 'My Battlemap') || 'My Battlemap',
    src: draft.map.src, cols: draft.map.cols, rows: draft.map.rows,
    grid: draft.map.grid, terrain: draft.terrain, fog: [...draft.fog],
  });
  toast(ok ? 'Map saved to My Vault. 🗺️' : 'Storage is full — delete old maps first.', ok ? 'ok' : 'err');
});

/* grid settings */
$$('[data-grid]').forEach(b => b.addEventListener('click', () => {
  $$('[data-grid]').forEach(x => x.classList.toggle('active', x === b));
  draft.map.grid = b.dataset.grid;
  // re-snap tokens
  for (const t of draft.tokens) {
    const col = Math.floor(t.x), row = Math.floor(t.y);
    t.x = draft.map.grid === 'hex' ? clamp(col, 0, draft.map.cols - 1) : col + 0.5;
    t.y = draft.map.grid === 'hex' ? clamp(row, 0, draft.map.rows - 1) : row + 0.5;
  }
  mc.render();
}));
$('#g-cols').addEventListener('change', () => { draft.map.cols = clamp(parseInt($('#g-cols').value) || 16, 6, 40); mc.fit(); });
$('#g-rows').addEventListener('change', () => { draft.map.rows = clamp(parseInt($('#g-rows').value) || 12, 6, 30); mc.fit(); });
$('#g-cs').addEventListener('input', () => {
  draft.map.cs = parseInt($('#g-cs').value);
  $('#cs-val').textContent = draft.map.cs;
  mc.render();
});

/* ============================================================
   STEP 3 — NPC spawner
============================================================ */
let npcIcon = '👺';
const nic = $('#n-icons');
TOKEN_EMOJIS.slice(0, 16).forEach((e, i) => {
  const s = document.createElement('span');
  s.textContent = e; s.dataset.e = e;
  if (i === 0) s.classList.add('active');
  s.addEventListener('click', () => {
    npcIcon = e;
    $$('#n-icons span').forEach(x => x.classList.toggle('active', x === s));
  });
  nic.appendChild(s);
});

const NPC_DEFAULTS = {
  Goblin: { hp: 7, ac: 13, icon: '👺', atk: 'Scimitar +4 — 1d6+2 slashing' },
  Hobgoblin: { hp: 11, ac: 18, icon: '👹', atk: 'Longsword +3 — 1d8+1 slashing' },
  Bugbear: { hp: 27, ac: 16, icon: '🐻', atk: 'Morningstar +4 — 2d8+2 piercing' },
  Skeleton: { hp: 13, ac: 13, icon: '💀', atk: 'Shortsword +4 — 1d6+2 piercing' },
  Zombie: { hp: 22, ac: 8, icon: '🧟', atk: 'Slam +3 — 1d6+1 bludgeoning' },
  Wolf: { hp: 11, ac: 13, icon: '🐺', atk: 'Bite +4 — 2d4+2 piercing' },
  'Giant Spider': { hp: 26, ac: 14, icon: '🕷️', atk: 'Bite +5 — 1d8+3 + poison' },
  Ogre: { hp: 59, ac: 11, icon: '🧌', atk: 'Greatclub +6 — 2d8+4 bludgeoning' },
  Cultist: { hp: 9, ac: 12, icon: '🥷', atk: 'Scimitar +3 — 1d6+1 slashing' },
  Kobold: { hp: 5, ac: 12, icon: '🦎', atk: 'Dagger +4 — 1d4+2 piercing' },
  Orc: { hp: 15, ac: 13, icon: '🗿', atk: 'Greataxe +5 — 1d12+3 slashing' },
  Custom: { hp: 10, ac: 12, icon: '❓', atk: 'Improvised +2 — 1d4' },
};
$('#n-type').addEventListener('change', () => {
  const d = NPC_DEFAULTS[$('#n-type').value];
  $('#n-hp').value = d.hp; $('#n-ac').value = d.ac; npcIcon = d.icon;
  $('#n-atk').value = d.atk;
  $$('#n-icons span').forEach(x => x.classList.toggle('active', x.dataset.e === d.icon));
  if (!$('#n-name').value.trim()) $('#n-name').value = $('#n-type').value;
});

$('#n-add').addEventListener('click', () => addNpc({
  name: $('#n-name').value.trim() || $('#n-type').value,
  type: $('#n-type').value,
  hp: Math.max(1, parseInt($('#n-hp').value) || 1),
  ac: Math.max(1, parseInt($('#n-ac').value) || 10),
  icon: npcIcon,
  atk: $('#n-atk').value.trim(),
}));
$('#n-random').addEventListener('click', () => {
  const names = ['Snagtooth', 'Mugwort', 'Ratch', 'Bogeye', 'Nib', 'Scabbs', 'Grelch', 'Wartfang', 'Dribble', 'Knucks'];
  addNpc({ name: pick(names) + ' the ' + pick(['Sneaky', 'Hungry', 'Unwashed', 'Bold', 'Nervous', 'Shiny']), type: 'Goblin', ...NPC_DEFAULTS.Goblin, hp: rint(5, 9) });
});

function addNpc(n) {
  n.id = uid(); n.maxHp = n.hp;
  draft.npcs.push(n);
  renderNpcList(); refreshPlaceNpcSelect();
  $('#n-name').value = '';
  toast(`<b>${escapeHtml(n.name)}</b> joins the roster. ${n.icon}`, 'ok');
}

$('#n-import').addEventListener('click', () => {
  try {
    const arr = JSON.parse($('#n-json').value || '[]');
    if (!Array.isArray(arr)) throw new Error('need array');
    let n = 0;
    for (const o of arr) {
      if (!o || !o.name) continue;
      addNpc({
        name: String(o.name).slice(0, 40), type: o.type || 'Custom',
        hp: parseInt(o.hp) || 10, ac: parseInt(o.ac) || 10,
        icon: o.icon || '❓', atk: o.atk || '',
      });
      n++;
    }
    $('#n-json').value = '';
    toast(`Imported ${n} stat block${n === 1 ? '' : 's'}.`, 'ok');
  } catch { toast('That JSON could not be parsed.', 'err'); }
});

function renderNpcList() {
  const list = $('#npc-list');
  list.innerHTML = '';
  $('#npc-count').textContent = draft.npcs.length;
  for (const n of draft.npcs) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="avatar">${n.icon}</div>
      <div class="grow">
        <div class="name">${escapeHtml(n.name)} <span class="badge dim">${escapeHtml(n.type)}</span></div>
        <div class="sub">HP ${n.hp} · AC ${n.ac}${n.atk ? ' · ' + escapeHtml(n.atk) : ''}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-del>✕</button>`;
    $('[data-del]', row).addEventListener('click', () => {
      draft.npcs = draft.npcs.filter(x => x.id !== n.id);
      draft.tokens = draft.tokens.filter(t => t.npcId !== n.id);
      renderNpcList(); refreshPlaceNpcSelect(); mc.render();
    });
    list.appendChild(row);
  }
}

function refreshPlaceNpcSelect() {
  const sel = $('#place-npc');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— choose NPC —</option>' +
    draft.npcs.map(n => `<option value="${n.id}">${n.icon} ${escapeHtml(n.name)}</option>`).join('');
  sel.value = prev;
  placedNpcId = sel.value;
}
$('#place-npc')?.addEventListener('change', e => { placedNpcId = e.target.value; });

/* ============================================================
   STEP 4 — Atmosphere
============================================================ */
function renderAudioPresets() {
  const box = $('#audio-presets');
  box.innerHTML = '';
  for (const p of Ambient.PRESETS) {
    const card = document.createElement('div');
    const active = draft.audio.kind === 'synth' && draft.audio.id === p.id;
    card.className = 'card clickable' + (active ? ' torch-lit' : '');
    card.innerHTML = `<h3 class="mt0">${p.icon} ${p.name} ${active ? '<span class="badge green">selected</span>' : ''}</h3>
      <p class="dim mt0">${p.desc}</p>`;
    card.addEventListener('click', () => {
      draft.audio = { kind: 'synth', id: p.id, name: `${p.icon} ${p.name}`, url: '' };
      $('#a-current').textContent = draft.audio.name;
      renderAudioPresets();
    });
    box.appendChild(card);
  }
}
$('#a-url-set').addEventListener('click', () => {
  const url = $('#a-url').value.trim();
  if (!url) return toast('Paste a URL first.', 'err');
  draft.audio = { kind: 'url', id: 'url', name: '🔗 External track', url };
  $('#a-current').textContent = draft.audio.name;
  renderAudioPresets();
  toast('External track attached.', 'ok');
});
$('#a-file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  draft.audio = { kind: 'url', id: 'file', name: `⬆️ ${f.name}`, url };
  $('#a-current').textContent = draft.audio.name;
  renderAudioPresets();
  toast('Track uploaded. Note: uploaded audio streams from the DM&rsquo;s device.', 'ok');
});
$('#a-preview').addEventListener('click', () => {
  Ambient.play(draft.audio, parseFloat($('#a-vol').value));
  toast(`Previewing <b>${escapeHtml(draft.audio.name)}</b>…`);
});
$('#a-stop').addEventListener('click', () => Ambient.stop());
$('#a-vol').addEventListener('input', () => Ambient.setVolume(parseFloat($('#a-vol').value)));

/* ============================================================
   STEP 5 — Staging lobby
============================================================ */
$('#post-room').addEventListener('click', () => {
  const code = Store.newRoomCode();
  const cu = Auth.currentUser();
  const room = {
    code,
    name: draft.name || 'Unnamed Depths',
    password: draft.password || '',
    maxPlayers: draft.maxPlayers,
    hostId: cu.id, hostName: cu.name,
    state: 'lobby',
    createdAt: Date.now(),
    map: { ...draft.map },
    terrain: { ...draft.terrain },
    fog: [...draft.fog],
    npcs: draft.npcs,
    tokens: draft.tokens.map(t => ({ ...t })),
    audio: { ...draft.audio },
    initiative: [], turnIdx: 0,
    players: [],
    chat: [{ id: uid(), who: cu.name, text: 'The room is open. Light the torches! 🕯️', type: 'sys', ts: Date.now() }],
  };
  Store.saveRoom(room);
  roomPosted = code;
  Auth.bumpStat('roomsHosted');
  Store.upsertHistory({ code, name: room.name, date: Date.now(), hostName: cu.name, role: 'host', viewer: cu.name, players: [], state: 'lobby' });
  enterLobbyView();
  toast('📯 Room posted! Share the code with your party.', 'ok');
});

function enterLobbyView() {
  $('#lobby-setup').classList.add('hidden');
  $('#lobby-live').classList.remove('hidden');
  $('#lobby-code').textContent = roomPosted;
  $('#back-from-staging').disabled = true;
  Bus.on('room:' + roomPosted, renderLobby);
  renderLobby();
}

function renderLobby() {
  const room = Store.getRoom(roomPosted);
  if (!room) return;
  if (room.state === 'live') { location.href = 'play.html?room=' + room.code; return; }

  $('#lobby-count').textContent = `${room.players.length}/${room.maxPlayers}`;
  $('#lobby-empty').classList.toggle('hidden', room.players.length > 0);
  const box = $('#lobby-players');
  box.innerHTML = '';
  for (const p of room.players) {
    const row = document.createElement('div');
    row.className = 'player-row';
    const ch = p.character || {};
    row.innerHTML = `
      <div class="avatar">${ch.tokenImg ? `<img src="${ch.tokenImg}">` : (ch.tokenEmoji || '🎭')}</div>
      <div class="grow">
        <div class="name">${escapeHtml(p.name)} ${p.guest ? '<span class="badge dim">guest</span>' : ''}</div>
        <div class="sub">${escapeHtml(ch.name || 'No character')} — ${escapeHtml(ch.cls || '?')} Lv ${ch.level || 1} · ❤️ ${ch.hp}/${ch.maxHp} · 🛡️ ${ch.ac}</div>
      </div>
      ${p.ready ? '<span class="badge green">✔ Ready</span>' : '<span class="badge dim">… not ready</span>'}`;
    box.appendChild(row);
  }
  const allReady = room.players.length > 0 && room.players.every(p => p.ready);
  const start = $('#start-session');
  start.disabled = !allReady;
  start.textContent = allReady ? '⚔️ Start Game Session' : room.players.length ? '⏳ Waiting for Ready…' : '⏳ Waiting for players…';
  renderChat(room, $('#lobby-chat'));
}

$('#start-session').addEventListener('click', () => {
  const room = Store.getRoom(roomPosted);
  if (!room) return;
  room.state = 'live';
  room.chat.push({ id: uid(), who: 'DM', text: 'The session begins — roll for initiative!', type: 'sys', ts: Date.now() });
  Store.saveRoom(room);
  location.href = 'play.html?room=' + room.code;
});

$('#abandon-room').addEventListener('click', () => {
  if (!confirm('Collapse this room? Players will be ejected into the dark.')) return;
  Store.deleteRoom(roomPosted);
  location.href = 'index.html';
});

$('#copy-code').addEventListener('click', async () => {
  await copyText(roomPosted); toast('Code copied.', 'ok');
});
$('#copy-link').addEventListener('click', async () => {
  const url = new URL('join.html', location.href);
  url.search = '?code=' + roomPosted;
  await copyText(url.toString()); toast('Invite link copied.', 'ok');
});

/* lobby chat (shared helper with join page) */
function renderChat(room, box) {
  if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = room.chat.slice(-80).map(m => `
    <div class="chat-msg ${m.type === 'sys' ? 'sys' : ''}">
      ${m.type !== 'sys' ? `<span class="who">${escapeHtml(m.who)}</span>` : ''}${escapeHtml(m.text)}
      <span class="ts">${fmtTime(m.ts)}</span>
    </div>`).join('');
  if (atBottom) box.scrollTop = box.scrollHeight;
}
function sendLobbyChat() {
  const input = $('#lobby-chat-input');
  const text = input.value.trim();
  if (!text || !roomPosted) return;
  const room = Store.getRoom(roomPosted);
  room.chat.push({ id: uid(), who: Auth.currentUser().name + ' (DM)', text, type: 'msg', ts: Date.now() });
  Store.saveRoom(room);
  input.value = '';
  renderChat(room, $('#lobby-chat'));
}
$('#lobby-chat-send').addEventListener('click', sendLobbyChat);
$('#lobby-chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendLobbyChat(); });

/* init */
refreshVaultMaps();
goStep(1);
