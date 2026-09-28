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
    { id: uid(), name: 'Goblin Scout', type: 'Goblin', hp: 7, maxHp: 7, ac: 13, icon: 'assets/icons/goblin.svg', atk: 'Scimitar +4 — 1d6+2 slashing', stance: 'hostile' },
    { id: uid(), name: 'Cave Wolf', type: 'Wolf', hp: 11, maxHp: 11, ac: 13, icon: 'assets/icons/wolf.svg', atk: 'Bite +4 — 2d4+2 piercing', stance: 'hostile' },
  ],
  tokens: [],
  audio: { kind: 'synth', id: 'cave', name: '💧 Cathedral Cave', url: '' },
};

let roomPosted = null;   // room code once posted
let currentStep = 1;
let selectedTokenId = null;

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
  if (n === 2) renderNpcList();
  if (n === 3) { bootBuilder(); setTimeout(() => bld && bld.fit(), 60); }
  if (n === 4) renderAudioPresets();
  if (n === 5 && roomPosted) enterLobbyView();
}
$$('#steps li').forEach(li => li.addEventListener('click', () => {
  if (li.classList.contains('done')) goStep(+li.dataset.step);
}));
$$('[data-next]').forEach(b => b.addEventListener('click', () => {
  if (currentStep === 1) {
    draft.name = $('#r-name').value.trim();
    if (!draft.name) return toast(I18n.t('cr_toast_name'), 'err');
    draft.password = $('#r-access').value === 'password' ? $('#r-pass').value.trim() : '';
    if ($('#r-access').value === 'password' && !draft.password) return toast(I18n.t('cr_toast_pass'), 'err');
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
   STEP 2 — Advanced Map Builder (shared engine)
============================================================ */
draft.props = draft.props || [];
draft.walls = draft.walls || [];
draft.labels = draft.labels || [];

let bld = null;
function bootBuilder() {
  if (bld) { bld.setNpcOptions(); return; }
  bld = initBuilder({
    root: '#builder-root',
    state: draft,
    owner: u && !u.guest ? u.username : null,
    getNpcList: () => draft.npcs,
  });
  bld.setNpcOptions();
}

/* wizard persistence — so round-trips (character editor, full-screen map editor)
   never lose the room you're forging */
function persistWizardDraft() {
  try {
    localStorage.setItem('gc_wizard_draft', JSON.stringify({
      step: currentStep, name: draft.name, password: draft.password, maxPlayers: draft.maxPlayers,
      map: draft.map, terrain: draft.terrain, fog: [...draft.fog],
      npcs: draft.npcs, tokens: draft.tokens, props: draft.props, walls: draft.walls, labels: draft.labels,
      audio: draft.audio,
    }));
  } catch {}
}
(function restoreWizardDraft() {
  const raw = localStorage.getItem('gc_wizard_draft');
  if (!raw) return;
  try {
    const o = JSON.parse(raw);
    draft.name = o.name || ''; draft.password = o.password || '';
    draft.maxPlayers = clamp(parseInt(o.maxPlayers) || 6, 1, 12);
    Object.assign(draft.map, o.map || {});
    draft.terrain = o.terrain || {}; draft.fog = new Set(o.fog || []);
    if (Array.isArray(o.npcs) && o.npcs.length) draft.npcs = o.npcs;
    draft.tokens = o.tokens || []; draft.props = o.props || [];
    draft.walls = o.walls || []; draft.labels = o.labels || [];
    if (o.audio) draft.audio = o.audio;
    $('#r-name').value = draft.name; $('#r-pass').value = draft.password;
    $('#r-max').value = draft.maxPlayers;
    $('#r-access').value = draft.password ? 'password' : 'open';
    if (typeof syncAccess === 'function') syncAccess();
    $('#a-current').textContent = draft.audio.name;
    draft._restoreStep = clamp(parseInt(o.step) || 1, 1, 4);
  } catch {}
  localStorage.removeItem('gc_wizard_draft');
})();

/* absorb a full character coming back from the character editor as a friendly NPC */
(function absorbNpcDraft() {
  const raw = localStorage.getItem('gc_char_draft');
  if (!raw) return;
  try {
    const ch = JSON.parse(raw);
    if (ch && ch.__npc && ch.name) {
      addNpc({
        name: ch.name.slice(0, 40),
        type: [ch.race, ch.cls].filter(Boolean).join(' ') || 'Custom',
        hp: ch.maxHp || 10, ac: ch.ac || 10,
        icon: ch.tokenEmoji || '🎭', img: ch.tokenImg || null,
        atk: ch.attacks || '', stance: 'friendly',
      }, true);
      toast(I18n.t('cr_npc_forged', { name: escapeHtml(ch.name) }), 'ok');
    }
  } catch {}
  localStorage.removeItem('gc_char_draft');
})();

/* full-screen editor round-trip */
$('#open-map-editor').addEventListener('click', e => {
  e.preventDefault();
  persistWizardDraft();
  localStorage.setItem('gc_builder_draft', JSON.stringify({
    map: draft.map, terrain: draft.terrain, fog: [...draft.fog],
    tokens: draft.tokens, props: draft.props, walls: draft.walls, labels: draft.labels,
  }));
  location.href = 'map-editor.html?return=create';
});
(function absorbEditorDraft() {
  const raw = localStorage.getItem('gc_builder_draft');
  if (!raw) return;
  try {
    const o = JSON.parse(raw);
    Object.assign(draft.map, o.map || {});
    draft.terrain = o.terrain || {};
    draft.fog = new Set(o.fog || []);
    draft.tokens = o.tokens || [];
    draft.props = o.props || [];
    draft.walls = o.walls || [];
    draft.labels = o.labels || [];
  } catch {}
  localStorage.removeItem('gc_builder_draft');
})();

/* quick-start adventure templates (?tpl=) — pre-forge the whole room and jump to staging */
(function applyAdventureTemplate() {
  const id = new URLSearchParams(location.search).get('tpl');
  if (!id || typeof ADVENTURES === 'undefined' || !ADVENTURES[id]) return;
  const adv = ADVENTURES[id];
  const t = adv.build();
  draft.name = t.name;
  draft.map = t.map; draft.terrain = t.terrain; draft.fog = new Set(t.fog);
  draft.npcs = t.npcs; draft.tokens = t.tokens; draft.props = t.props;
  draft.walls = t.walls; draft.labels = t.labels;
  draft.audio = t.audio;
  $('#r-name').value = draft.name;
  $('#a-current').textContent = draft.audio.name;
  draft._tplStep = 5;
  toast(I18n.t('adv_loaded', { name: escapeHtml(I18n.t(adv.nameKey)) }), 'ok');
})();

/* ============================================================
   STEP 3 — NPC spawner
============================================================ */
let npcIcon = 'assets/icons/goblin.svg';
const nic = $('#n-icons');
TOKEN_EMOJIS.slice(0, 16).forEach((e, i) => {
  const s = document.createElement('span');
  s.innerHTML = iconHtml(e); s.dataset.e = e;
  if (i === 0) s.classList.add('active');
  s.addEventListener('click', () => {
    npcIcon = e;
    $$('#n-icons span').forEach(x => x.classList.toggle('active', x === s));
  });
  nic.appendChild(s);
});

const NPC_DEFAULTS = {
  Goblin: { hp: 7, ac: 13, icon: 'assets/icons/goblin.svg', atk: 'Scimitar +4 — 1d6+2 slashing' },
  Hobgoblin: { hp: 11, ac: 18, icon: 'assets/icons/guard.svg', atk: 'Longsword +3 — 1d8+1 slashing' },
  Bugbear: { hp: 27, ac: 16, icon: 'assets/icons/beast.svg', atk: 'Morningstar +4 — 2d8+2 piercing' },
  Skeleton: { hp: 13, ac: 13, icon: 'assets/icons/skeleton.svg', atk: 'Shortsword +4 — 1d6+2 piercing' },
  Zombie: { hp: 22, ac: 8, icon: 'assets/icons/undead.svg', atk: 'Slam +3 — 1d6+1 bludgeoning' },
  Wolf: { hp: 11, ac: 13, icon: 'assets/icons/wolf.svg', atk: 'Bite +4 — 2d4+2 piercing' },
  'Giant Spider': { hp: 26, ac: 14, icon: 'assets/icons/spider.svg', atk: 'Bite +5 — 1d8+3 + poison' },
  Ogre: { hp: 59, ac: 11, icon: 'assets/icons/minotaur.svg', atk: 'Greatclub +6 — 2d8+4 bludgeoning' },
  Cultist: { hp: 9, ac: 12, icon: 'assets/icons/cultist.svg', atk: 'Scimitar +3 — 1d6+1 slashing' },
  Kobold: { hp: 5, ac: 12, icon: 'assets/icons/lizardfolk.svg', atk: 'Dagger +4 — 1d4+2 piercing' },
  Orc: { hp: 15, ac: 13, icon: 'assets/icons/orc.svg', atk: 'Greataxe +5 — 1d12+3 slashing' },
  Custom: { hp: 10, ac: 12, icon: 'assets/icons/shadow.svg', atk: 'Improvised +2 — 1d4' },
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
  stance: $('#n-stance').value,
}));
$('#n-random').addEventListener('click', () => {
  const names = ['Snagtooth', 'Mugwort', 'Ratch', 'Bogeye', 'Nib', 'Scabbs', 'Grelch', 'Wartfang', 'Dribble', 'Knucks'];
  addNpc({ name: pick(names) + ' the ' + pick(['Sneaky', 'Hungry', 'Unwashed', 'Bold', 'Nervous', 'Shiny']), type: 'Goblin', ...NPC_DEFAULTS.Goblin, hp: rint(5, 9), stance: 'hostile' });
});

/* full-character NPC round-trip via the advanced character editor */
$('#n-charbuilder').addEventListener('click', () => {
  persistWizardDraft();
  location.href = 'char-editor.html?return=npc';
});

const STANCES = ['friendly', 'neutral', 'hostile'];
const STANCE_META = {
  friendly: { key: 'st_friendly', cls: 'green', icon: '🤝' },
  neutral:  { key: 'st_neutral',  cls: 'dim',   icon: '😐' },
  hostile:  { key: 'st_hostile',  cls: 'red',   icon: '⚔️' },
};
function stanceBadge(n) {
  const m = STANCE_META[n.stance] || STANCE_META.hostile;
  return `<span class="badge ${m.cls} stance-badge" title="Click to change stance">${m.icon} ${escapeHtml(I18n.t(m.key))}</span>`;
}

function addNpc(n, quiet = false) {
  n.id = uid(); n.maxHp = n.hp;
  if (!STANCES.includes(n.stance)) n.stance = 'hostile';
  draft.npcs.push(n);
  renderNpcList(); bld && bld.setNpcOptions();
  $('#n-name').value = '';
  if (!quiet) toast(I18n.t('cr_joins', { name: escapeHtml(n.name) }) + ' ' + iconHtml(n.icon), 'ok');
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
        stance: STANCES.includes(o.stance) ? o.stance : 'hostile',
      });
      n++;
    }
    $('#n-json').value = '';
    toast(I18n.t('cr_imported', { n }), 'ok');
  } catch { toast(I18n.t('cr_jsonbad'), 'err'); }
});

function renderNpcList() {
  const list = $('#npc-list');
  list.innerHTML = '';
  $('#npc-count').textContent = draft.npcs.length;
  for (const n of draft.npcs) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="avatar">${iconHtml(n.icon)}</div>
      <div class="grow">
        <div class="name">${escapeHtml(n.name)} <span class="badge dim">${escapeHtml(n.type)}</span> ${stanceBadge(n)}</div>
        <div class="sub">HP ${n.hp} · AC ${n.ac}${n.atk ? ' · ' + escapeHtml(n.atk) : ''}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-del>✕</button>`;
    $('.stance-badge', row).style.cursor = 'pointer';
    $('.stance-badge', row).addEventListener('click', () => {
      n.stance = STANCES[(STANCES.indexOf(n.stance) + 1) % STANCES.length];
      draft.tokens.forEach(t => { if (t.npcId === n.id) t.stance = n.stance; });
      renderNpcList(); if (bld) bld.render();
    });
    $('[data-del]', row).addEventListener('click', () => {
      draft.npcs = draft.npcs.filter(x => x.id !== n.id);
      draft.tokens = draft.tokens.filter(t => t.npcId !== n.id);
      renderNpcList(); if (bld) { bld.setNpcOptions(); bld.render(); }
    });
    list.appendChild(row);
  }
}

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
  if (!url) return toast(I18n.t('cr_urlfirst'), 'err');
  draft.audio = { kind: 'url', id: 'url', name: '🔗 External track', url };
  $('#a-current').textContent = draft.audio.name;
  renderAudioPresets();
  toast(I18n.t('cr_extok'), 'ok');
});
$('#a-file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  draft.audio = { kind: 'url', id: 'file', name: `⬆️ ${f.name}`, url };
  $('#a-current').textContent = draft.audio.name;
  renderAudioPresets();
  toast(I18n.t('cr_uploaded'), 'ok');
});
$('#a-preview').addEventListener('click', () => {
  Ambient.play(draft.audio, parseFloat($('#a-vol').value));
  toast(I18n.t('cr_previewing', { name: escapeHtml(draft.audio.name) }));
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
    lang: I18n.getLang(),
    state: 'lobby',
    createdAt: Date.now(),
    map: { ...draft.map },
    terrain: { ...draft.terrain },
    fog: [...draft.fog],
    npcs: draft.npcs,
    tokens: draft.tokens.map(t => ({ ...t })),
    props: (draft.props || []).map(p => ({ ...p })),
    walls: (draft.walls || []).map(w => ({ ...w })),
    labels: (draft.labels || []).map(l => ({ ...l })),
    audio: { ...draft.audio },
    initiative: [], turnIdx: 0,
    players: [],
    chat: [{ id: uid(), who: cu.name, text: I18n.t('cr_sys_open'), type: 'sys', ts: Date.now() }],
  };
  Store.saveRoom(room);
  roomPosted = code;
  Auth.bumpStat('roomsHosted');
  Store.upsertHistory({ code, name: room.name, date: Date.now(), hostName: cu.name, role: 'host', viewer: cu.name, players: [], state: 'lobby' });
  enterLobbyView();
  toast(I18n.t('cr_posted'), 'ok');
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
      <div class="avatar">${ch.tokenImg ? `<img src="${ch.tokenImg}">` : iconHtml(ch.tokenEmoji)}</div>
      <div class="grow">
        <div class="name">${escapeHtml(p.name)} ${p.guest ? `<span class="badge dim">${I18n.t('cr_guest')}</span>` : ''}</div>
        <div class="sub">${escapeHtml(ch.name || I18n.t('cr_nochar'))} — ${escapeHtml(ch.cls || '?')} Lv ${ch.level || 1} · ❤️ ${ch.hp}/${ch.maxHp} · 🛡️ ${ch.ac}</div>
      </div>
      ${p.ready ? `<span class="badge green">${I18n.t('cr_ready')}</span>` : `<span class="badge dim">${I18n.t('cr_notready')}</span>`}`;
    box.appendChild(row);
  }
  const allReady = room.players.length > 0 && room.players.every(p => p.ready);
  const start = $('#start-session');
  start.disabled = !allReady;
  start.textContent = allReady ? I18n.t('start_btn') : room.players.length ? I18n.t('cr_wait_ready') : I18n.t('cr_wait_players');
  renderChat(room, $('#lobby-chat'));
}

$('#start-session').addEventListener('click', () => {
  const room = Store.getRoom(roomPosted);
  if (!room) return;
  room.state = 'live';
  room.chat.push({ id: uid(), who: 'DM', text: I18n.t('cr_sys_start'), type: 'sys', ts: Date.now() });
  if (I18n.aiMasterOn()) {
    room.chat.push({ id: uid(), who: '🎭 AI Master', text: I18n.narrate(room.lang || I18n.getLang(), 'the party'), type: 'msg', ts: Date.now() });
  }
  Store.saveRoom(room);
  location.href = 'play.html?room=' + room.code;
});

$('#abandon-room').addEventListener('click', () => {
  if (!confirm(I18n.t('cr_abandon_q'))) return;
  Store.deleteRoom(roomPosted);
  location.href = 'index.html';
});

$('#copy-code').addEventListener('click', async () => {
  await copyText(roomPosted); toast(I18n.t('ui_copied'), 'ok');
});
$('#copy-link').addEventListener('click', async () => {
  const url = new URL('join.html', location.href);
  url.search = '?code=' + roomPosted;
  await copyText(url.toString()); toast(I18n.t('ui_copied'), 'ok');
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
goStep(draft._tplStep || draft._restoreStep || 1);
delete draft._restoreStep;
delete draft._tplStep;
