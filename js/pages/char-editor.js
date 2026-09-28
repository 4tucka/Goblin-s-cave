/* char-editor.js — advanced 5e character creator / editor */
initChrome('');
renderFooter();

const u = Auth.currentUser();
const params = new URLSearchParams(location.search);
const editId = params.get('edit');
const returnTo = params.get('return');
const roomCode = params.get('room') || '';
const existing = editId ? Store.getChar(editId) : null;

if (returnTo === 'join' && roomCode) {
  $('#ce-back').href = 'join.html?code=' + roomCode;
  $('#ce-back').textContent = '← Back to joining';
}
if (returnTo === 'npc') {
  $('#ce-back').href = 'create.html';
  $('#ce-back').textContent = '← Back to the room wizard';
}

const SKILLS = [
  ['acrobatics', 'dex'], ['animal', 'wis'], ['arcana', 'int'], ['athletics', 'str'],
  ['deception', 'cha'], ['history', 'int'], ['insight', 'wis'], ['intimidation', 'cha'],
  ['investigation', 'int'], ['medicine', 'wis'], ['nature', 'int'], ['perception', 'wis'],
  ['performance', 'cha'], ['persuasion', 'cha'], ['religion', 'int'], ['sleight', 'dex'],
  ['stealth', 'dex'], ['survival', 'wis'],
];
const SKILL_LABEL = { acrobatics: 'Acrobatics', animal: 'Animal Handling', arcana: 'Arcana', athletics: 'Athletics',
  deception: 'Deception', history: 'History', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion', sleight: 'Sleight of Hand',
  stealth: 'Stealth', survival: 'Survival' };
const CLASS_DIE = { Barbarian: 'd12', Fighter: 'd10', Paladin: 'd10', Ranger: 'd10',
  Bard: 'd8', Cleric: 'd8', Druid: 'd8', Monk: 'd8', Rogue: 'd8', Warlock: 'd8', Artificer: 'd8',
  Wizard: 'd6', Sorcerer: 'd6' };
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABIL_LABEL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

/* ---------- build dynamic UI ---------- */
$('#ce-cls').innerHTML = CharImport.CLASSES.map(c => `<option>${c}</option>`).join('');

const abilInputs = {};
$('#ce-abilities').innerHTML = ABIL.map(a => `
  <label class="field center" style="margin:0;">
    <span>${ABIL_LABEL[a]}</span>
    <input type="number" id="ab-${a}" min="1" max="30" value="10">
    <b class="gold" id="mod-${a}">+0</b>
  </label>`).join('');
ABIL.forEach(a => { abilInputs[a] = $('#ab-' + a); abilInputs[a].addEventListener('input', recalc); });

$('#ce-saves').innerHTML = ABIL.map(a =>
  `<label class="checkline"><input type="checkbox" id="sv-${a}"> ${ABIL_LABEL[a]}</label>`).join('');

$('#ce-skills').innerHTML = SKILLS.map(([id, ab]) => `
  <label class="row" style="gap:.4rem;">
    <select id="sk-${id}" style="width:auto;padding:.15rem .3rem;font-size:.78rem;">
      <option value="">—</option><option value="prof">prof</option><option value="expert">exp</option>
    </select>
    <span>${SKILL_LABEL[id]} <span class="faint">(${ABIL_LABEL[ab]})</span> <b class="gold" id="skv-${id}"></b></span>
  </label>`).join('');
SKILLS.forEach(([id]) => $('#' + 'sk-' + id).addEventListener('change', recalc));

$('#ce-slots').innerHTML = Array.from({ length: 9 }, (_, i) =>
  `<label class="center" style="font-size:.75rem;">${i + 1}<br>
   <input type="number" id="slot-${i + 1}" min="0" max="8" value="0" style="width:52px;"></label>`).join('');

let chEmoji = '🧝', chImg = null;
$('#ce-emojis').innerHTML = TOKEN_EMOJIS.map((e, i) =>
  `<span data-e="${e}" class="${i === 0 ? 'active' : ''}">${e}</span>`).join('');
$$('#ce-emojis span').forEach(s => s.addEventListener('click', () => {
  chEmoji = s.dataset.e; chImg = null;
  $$('#ce-emojis span').forEach(x => x.classList.toggle('active', x === s));
  $('#ce-portrait').textContent = chEmoji;
}));
$('#ce-img').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    chImg = await fileToScaledDataURL(f, 200);
    $('#ce-portrait').innerHTML = `<img src="${chImg}" style="width:100%;height:100%;object-fit:cover;">`;
  } catch { toast('Could not read that image.', 'err'); }
});

$('#ce-level').addEventListener('input', recalc);
$('#ce-cls').addEventListener('change', () => { $('#ce-hitdie').value = CLASS_DIE[$('#ce-cls').value] || 'd8'; recalc(); });
$('#ce-hitdie').addEventListener('change', recalc);
$('#ce-ac-auto').addEventListener('change', () => { $('#ce-ac').disabled = $('#ce-ac-auto').checked; recalc(); });
$('#ce-hp-auto').addEventListener('change', recalc);

const mod = v => Math.floor((parseInt(v) - 10) / 2);
const fmtM = m => (m >= 0 ? '+' + m : String(m));

function pb() { const lv = clamp(parseInt($('#ce-level').value) || 1, 1, 20); return 2 + Math.floor((lv - 1) / 4); }

function recalc() {
  const P = pb();
  $('#ce-pb').textContent = fmtM(P);
  for (const a of ABIL) {
    const m = mod(abilInputs[a].value);
    $('#mod-' + a).textContent = fmtM(m);
  }
  const wisM = mod(abilInputs.wis.value);
  const per = $('#sk-perception').value;
  $('#ce-passive').textContent = 10 + wisM + (per === 'prof' ? P : per === 'expert' ? P * 2 : 0);
  const dexM = mod(abilInputs.dex.value);
  $('#ce-acdex').textContent = 10 + dexM;
  if ($('#ce-ac-auto').checked) $('#ce-ac').value = 10 + dexM;
  if ($('#ce-hp-auto').checked) {
    const die = parseInt($('#ce-hitdie').value.slice(1)) || 8;
    const avg = Math.floor(die / 2) + 1;
    const conM = mod(abilInputs.con.value);
    const lv = clamp(parseInt($('#ce-level').value) || 1, 1, 20);
    $('#ce-maxhp').value = avg + conM + (lv - 1) * (avg + 1 + conM);
    $('#ce-hp').value = $('#ce-maxhp').value;
  }
  for (const [id, ab] of SKILLS) {
    const lvl = $('#sk-' + id).value;
    const val = mod(abilInputs[ab].value) + (lvl === 'prof' ? P : lvl === 'expert' ? P * 2 : 0);
    $('#skv-' + id).textContent = fmtM(val);
  }
}

$('#ce-roll').addEventListener('click', () => {
  for (const a of ABIL) {
    const r = Dice.roll('4d6kh3');
    abilInputs[a].value = r.total;
  }
  recalc(); toast('Rolled 4d6-drop-lowest for every ability. 🎲', 'ok');
});
$('#ce-standard').addEventListener('click', () => {
  ABIL.forEach(a => abilInputs[a].value = 12);
  recalc();
});

/* ---------- apply / collect ---------- */
function applyChar(ch) {
  $('#ce-name').value = ch.name || '';
  $('#ce-race').value = ch.race || '';
  if (ch.cls) $('#ce-cls').value = CharImport.CLASSES.includes(ch.cls) ? ch.cls : 'Fighter';
  $('#ce-level').value = ch.level || 1;
  $('#ce-bg').value = ch.background || '';
  $('#ce-align').value = ch.alignment || '';
  $('#ce-maxhp').value = ch.maxHp || 10;
  $('#ce-hp').value = ch.hp ?? ch.maxHp ?? 10;
  $('#ce-thp').value = ch.tempHp || 0;
  $('#ce-ac').value = ch.ac || 10;
  $('#ce-speed').value = ch.speed || 30;
  $('#ce-attacks').value = ch.attacks || '';
  $('#ce-spells').value = ch.spellsKnown || '';
  $('#ce-spellab').value = ch.spellAbility || 'int';
  $('#ce-inv').value = ch.inventory || '';
  $('#ce-features').value = ch.features || '';
  $('#ce-notes').value = ch.notes || '';
  if (ch.abilities) for (const a of ABIL) if (ch.abilities[a]) abilInputs[a].value = ch.abilities[a];
  if (ch.saves) for (const a of ABIL) $('#sv-' + a).checked = !!ch.saves[a];
  if (ch.skills) for (const k of Object.keys(ch.skills)) {
    const el = $('#sk-' + k); if (el) el.value = ch.skills[k];
  }
  if (ch.spellSlots) for (const l of Object.keys(ch.spellSlots)) {
    const el = $('#slot-' + l); if (el) el.value = ch.spellSlots[l];
  }
  if (ch.tokenEmoji) {
    chEmoji = ch.tokenEmoji;
    $$('#ce-emojis span').forEach(x => x.classList.toggle('active', x.dataset.e === chEmoji));
    $('#ce-portrait').textContent = chEmoji;
  }
  if (ch.tokenImg) { chImg = ch.tokenImg; $('#ce-portrait').innerHTML = `<img src="${chImg}" style="width:100%;height:100%;object-fit:cover;">`; }
  recalc();
}

function collect() {
  const abilities = {}; ABIL.forEach(a => abilities[a] = clamp(parseInt(abilInputs[a].value) || 10, 1, 30));
  const saves = {}; ABIL.forEach(a => saves[a] = $('#sv-' + a).checked);
  const skills = {}; SKILLS.forEach(([id]) => { const v = $('#sk-' + id).value; if (v) skills[id] = v; });
  const spellSlots = {}; for (let i = 1; i <= 9; i++) { const v = parseInt($('#slot-' + i).value); if (v) spellSlots[i] = v; }
  return {
    id: existing?.id || uid(),
    owner: existing?.owner || (u && !u.guest ? u.username : null),
    name: $('#ce-name').value.trim() || 'Nameless One',
    race: $('#ce-race').value.trim(),
    cls: $('#ce-cls').value,
    level: clamp(parseInt($('#ce-level').value) || 1, 1, 20),
    background: $('#ce-bg').value.trim(),
    alignment: $('#ce-align').value,
    maxHp: Math.max(1, parseInt($('#ce-maxhp').value) || 10),
    hp: Math.max(0, parseInt($('#ce-hp').value) || 0),
    tempHp: Math.max(0, parseInt($('#ce-thp').value) || 0),
    ac: parseInt($('#ce-ac').value) || 10,
    speed: parseInt($('#ce-speed').value) || 30,
    abilities, saves, skills,
    attacks: $('#ce-attacks').value.trim(),
    spellsKnown: $('#ce-spells').value.trim(),
    spellAbility: $('#ce-spellab').value,
    spellSlots,
    inventory: $('#ce-inv').value.trim(),
    features: $('#ce-features').value.trim(),
    notes: $('#ce-notes').value.trim(),
    tokenEmoji: chEmoji, tokenImg: chImg,
  };
}

/* ---------- import ---------- */
function afterImport(ch, src) {
  applyChar(ch);
  $('#ce-import-status').innerHTML = `✅ Imported <b>${escapeHtml(ch.name)}</b> from ${escapeHtml(src)}.`;
  toast(`Imported <b>${escapeHtml(ch.name)}</b> — review and save!`, 'ok');
}
$('#ce-url-go').addEventListener('click', async () => {
  const url = $('#ce-url').value.trim();
  if (!url) return toast('Paste a link first.', 'err');
  $('#ce-import-status').textContent = ' Fetching…';
  const r = await CharImport.fromURL(url);
  if (r.error) { $('#ce-import-status').innerHTML = '⚠️ ' + escapeHtml(r.error); return toast(r.error, 'err', 6000); }
  afterImport(r.char, 'the web');
});
$('#ce-file').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { afterImport(CharImport.normalize(JSON.parse(await f.text())), f.name); }
  catch { toast('That file could not be parsed as character JSON.', 'err'); }
});

/* ---------- save ---------- */
$('#ce-save').addEventListener('click', () => {
  const ch = collect();
  const canVault = u && !u.guest;
  if (canVault && $('#ce-vault').checked) {
    Store.saveChar(ch);
    toast(`<b>${escapeHtml(ch.name)}</b> saved to My Vault. ⚔️`, 'ok');
  }
  if (returnTo === 'join') {
    localStorage.setItem('gc_char_draft', JSON.stringify(ch));
    location.href = 'join.html?code=' + roomCode;
    return;
  }
  if (returnTo === 'npc') {
    ch.__npc = true;
    localStorage.setItem('gc_char_draft', JSON.stringify(ch));
    location.href = 'create.html';
    return;
  }
  if (!canVault) {
    toast('Guests can&rsquo;t keep a Vault — create a free account, or use this editor from a Join page to bring the hero into a room.', 'err', 6000);
    return;
  }
  location.href = 'account.html';
});

/* ---------- boot ---------- */
if (!u || u.guest) { $('#ce-vault-wrap').classList.add('hidden'); }
if (existing) applyChar(existing);
recalc();
