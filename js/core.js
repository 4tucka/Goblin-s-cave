/* core.js — tiny utilities shared by all pages */
/* Advanced fantasy icons (game-icons.net, CC BY 3.0 — Lorc & Delapouite) */
const TOKEN_ICONS = ['goblin','orc','wolf','direwolf','dragon','imp','beholder','cultist','reaper','demon','skeleton','undead','beast','spider','bat','serpent','cobra','hydra','harpy','minotaur','lizardfolk','werewolf','vampire','ghost','witch','owl','raven','cat','horse','fairy','myconid','wizard','barbarian','archer','knight','rogue','bard','guard']
  .map(n => `assets/icons/${n}.svg`);
const TOKEN_EMOJIS = TOKEN_ICONS; // legacy name — now SVG paths
const AVATARS = ['wizard','barbarian','knight','rogue','crown','shadow','dice','lantern','key','treasure','gold','castle','candles','tome','sword','swords','axe','wand','shield','relic','raven','wolf','dragon','owl','cat','fairy','ghost']
  .map(n => `assets/icons/${n}.svg`);
const isImgIcon = v => typeof v === 'string' && v.indexOf('assets/icons/') === 0;
const iconHtml = (icon, cls = 'icon-img') => isImgIcon(icon) ? `<img class="${cls}" src="${icon}" alt="">` : `<span>${icon || '🎭'}</span>`;
/* chooseable profile titles */
const TITLES = [
  { id: 'adventurer',     icon: 'assets/icons/sword.svg',    key: 't_adventurer' },
  { id: 'dungeon-master', icon: 'assets/icons/lantern.svg',  key: 't_dm' },
  { id: 'monster-slayer', icon: 'assets/icons/swords.svg',   key: 't_slayer' },
  { id: 'loremaster',     icon: 'assets/icons/tome.svg',     key: 't_lore' },
  { id: 'cartographer',   icon: 'assets/icons/castle.svg',   key: 't_carto' },
  { id: 'treasure-hunter',icon: 'assets/icons/treasure.svg', key: 't_hunter' },
  { id: 'spellweaver',    icon: 'assets/icons/wand.svg',     key: 't_spell' },
  { id: 'goblin-bane',    icon: 'assets/icons/goblin.svg',   key: 't_bane' },
  { id: 'tavern-keeper',  icon: 'assets/icons/candles.svg',  key: 't_tavern' },
  { id: 'shadow-walker',  icon: 'assets/icons/shadow.svg',   key: 't_shadow' },
  { id: 'dragon-kin',     icon: 'assets/icons/dragon.svg',   key: 't_dragon' },
  { id: 'oathkeeper',     icon: 'assets/icons/shield.svg',   key: 't_oath' },
];
const titleOf = id => TITLES.find(t => t.id === id) || TITLES[0];
const TERRAIN_SWATCHES = [
  { name: 'Water',   c: 'rgba(46,109,246,.55)' },
  { name: 'Forest',  c: 'rgba(52,128,60,.6)' },
  { name: 'Rubble',  c: 'rgba(140,130,115,.55)' },
  { name: 'Lava',    c: 'rgba(255,94,26,.55)' },
  { name: 'Sand',    c: 'rgba(214,183,110,.5)' },
  { name: 'Ice',     c: 'rgba(160,220,240,.5)' },
  { name: 'Swamp',   c: 'rgba(88,100,45,.6)' },
  { name: 'Wall',    c: 'rgba(40,36,32,.85)' },
];

/* ============================================================
   Cave palettes & font pairings (user-selectable look)
============================================================ */
const THEMES = [
  { id: 'blood',  icon: '🩸', name: 'Blood',  cols: ['#ff3b30', '#5c2027', '#0d0506'] },
  { id: 'poison', icon: '☠️', name: 'Poison', cols: ['#38e06a', '#2c5c38', '#060d07'] },
  { id: 'arcane', icon: '🔮', name: 'Arcane', cols: ['#a24bff', '#4a2a7a', '#0a0512'] },
  { id: 'frost',  icon: '❄️', name: 'Frost',  cols: ['#3ba8ff', '#275a7c', '#050a10'] },
  { id: 'abyss',  icon: '🌊', name: 'Abyss',  cols: ['#18e0b8', '#1f6b57', '#04100e'] },
];
const FONT_PAIRS = [
  { id: 'gothic', name: 'Gothic Tale',   sample: 'Grenze Gotisch', note: 'blackletter + book serif' },
  { id: 'royal',  name: 'Royal Court',   sample: 'Marcellus',      note: 'elegant classical' },
  { id: 'rune',   name: 'Runestone',     sample: 'Pirata One',     note: 'heavy medieval' },
  { id: 'modern', name: 'Modern Table',  sample: 'Oswald',         note: 'clean & contemporary' },
];
function getTheme() { return localStorage.getItem('gc_theme') || 'blood'; }
function getFont() { return localStorage.getItem('gc_font') || 'gothic'; }
function setTheme(id) {
  if (id === 'blood') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('gc_theme', id);
  syncCanvasAccent();
  if (window.Embers && Embers.refresh) Embers.refresh();
  if (window.Bus) Bus.emit('theme', id);
}
function setFont(id) {
  if (id === 'gothic') document.documentElement.removeAttribute('data-font');
  else document.documentElement.setAttribute('data-font', id);
  localStorage.setItem('gc_font', id);
  syncCanvasAccent();
  if (window.Bus) Bus.emit('font', id);
}
/* cached accent colors for canvas layers (map editor, VTT) */
let _accentCache = null;
function canvasAccent() {
  if (_accentCache) return _accentCache;
  const cs = getComputedStyle(document.documentElement);
  const rgb = (cs.getPropertyValue('--torch-rgb') || '255,59,48').trim();
  const rgb2 = (cs.getPropertyValue('--torch2-rgb') || '255,157,141').trim();
  const disp = (cs.getPropertyValue('--font-display') || 'Georgia, serif').trim();
  return _accentCache = { rgb, rgb2, disp };
}
function syncCanvasAccent() { _accentCache = null; }
setTheme(getTheme()); setFont(getFont());   /* apply persisted choice early */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const roomCodeOf = () => {
  const p = new URLSearchParams(location.search);
  return (p.get('room') || p.get('code') || '').toUpperCase();
};

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + fmtTime(ts);
}

function debounce(fn, ms = 250) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* deterministic-ish random helpers */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/* copy to clipboard with fallback */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); return true; } catch { return false; }
    finally { ta.remove(); }
  }
}

/* read a File as dataURL */
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* downscale an image file to a max dimension, returns dataURL (jpeg) */
function fileToScaledDataURL(file, maxDim = 900, quality = 0.8) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

/* simple modal helper */
function openModal(html, { wide = false, onClose } = {}) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
  document.body.appendChild(ov);
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  $$('.modal-x', ov).forEach(b => b.addEventListener('click', () => closeModal()));
  window.__modalOnClose = onClose;
  return ov;
}
function closeModal() {
  const m = $('.modal-overlay');
  if (m) { m.remove(); if (window.__modalOnClose) { const f = window.__modalOnClose; window.__modalOnClose = null; f(); } }
}

/* toast helper */
function toast(msg, kind = '', ms = 3200) {
  let root = $('#toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = msg;
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 450); }, ms);
}

/* shared header */
function renderHeader(active = '') {
  const u = Auth.currentUser();
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <a class="brand" href="index.html"><span class="flame">🔥</span> Goblin&rsquo;s Cave</a>
    <nav class="nav-links">
      <a href="index.html" data-nav="home" data-i18n="nav_home">Home</a>
      <a href="create.html" data-nav="create" data-i18n="nav_create">Create Room</a>
      <a href="join.html" data-nav="join" data-i18n="nav_join">Join Room</a>
      ${u && !u.guest ? '<a href="account.html" data-nav="account" data-i18n="nav_account">My Account</a>' : ''}
    </nav>
    <div class="spacer"></div>
    <button id="theme-btn" title="Theme & fonts" aria-label="Theme and fonts">🎨</button>
    <select id="lang-sel" style="width:auto;font-size:.82rem;" title="Language / Idioma / Língua / Langue / Sprache">
      ${Object.entries(I18n.LANGS).map(([k, v]) => `<option value="${k}" ${I18n.getLang() === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
    ${u ? `
      <div class="user-chip" id="user-chip" title="${u.guest ? 'Playing as guest' : 'Account'}">
        <div class="avatar">${u.avatarImg ? `<img src="${u.avatarImg}">` : (isImgIcon(u.avatar) ? iconHtml(u.avatar) : (u.avatar || '👤'))}</div>
        <span>${escapeHtml(u.name || u.username)}</span>
        ${u.guest ? '<span class="badge dim">Guest</span>' : ''}
      </div>` : `
      <a class="btn btn-sm" href="index.html#auth" data-i18n="hdr_login">Log in</a>
      <a class="btn btn-sm btn-primary" href="index.html#auth" data-i18n="hdr_signup">Sign up</a>`}
  `;
  document.body.prepend(header);
  const langSel = $('#lang-sel', header);
  if (langSel) langSel.addEventListener('change', e => I18n.setLang(e.target.value));
  I18n.apply(header);
  const link = $(`[data-nav="${active}"]`, header);
  if (link) link.classList.add('active');
  const chip = $('#user-chip', header);
  if (chip) chip.addEventListener('click', () => {
    if (u.guest) location.href = 'index.html#auth';
    else location.href = 'account.html';
  });

  /* -------- theme & font picker -------- */
  const tbtn = $('#theme-btn', header);
  if (tbtn) {
    tbtn.addEventListener('click', e => { e.stopPropagation(); toggleThemePop(); });
    document.addEventListener('click', e => {
      const pop = $('#theme-pop');
      if (pop && !pop.contains(e.target)) pop.remove();
    });
  }
}

function themePopHtml() {
  const t = getTheme(), f = getFont();
  return `
    <h4>🎨 Cave colors</h4>
    <div class="swatch-row">
      ${THEMES.map(th => `
        <button class="tswatch ${th.id === t ? 'active' : ''}" data-theme-id="${th.id}" title="${th.name}">
          <span class="dot" style="background: radial-gradient(circle at 35% 30%, ${th.cols[0]}, ${th.cols[1]} 55%, ${th.cols[2]});"></span>
          <span class="nm">${th.icon} ${th.name}</span>
        </button>`).join('')}
    </div>
    <h4>✒️ Fonts</h4>
    <div class="font-row">
      ${FONT_PAIRS.map(fp => `
        <button class="fswatch ${fp.id === f ? 'active' : ''}" data-font-id="${fp.id}">
          <span class="aa" style="font-family:'${fp.sample}', Georgia, serif;">Goblin's Cave</span>
          <span class="nm">${fp.name} · ${fp.note}</span>
        </button>`).join('')}
    </div>
    <button class="btn btn-sm btn-ghost reset" id="theme-reset">↺ Back to Blood &amp; Gothic Tale</button>`;
}

function toggleThemePop() {
  const existing = $('#theme-pop');
  if (existing) { existing.remove(); return; }
  const pop = document.createElement('div');
  pop.className = 'theme-pop';
  pop.id = 'theme-pop';
  pop.innerHTML = themePopHtml();
  pop.addEventListener('click', e => e.stopPropagation());
  pop.addEventListener('click', e => {
    const t = e.target.closest('[data-theme-id]');
    const f = e.target.closest('[data-font-id]');
    if (t) setTheme(t.dataset.themeId);
    if (f) setFont(f.dataset.fontId);
    if (e.target.closest('#theme-reset')) { setTheme('blood'); setFont('gothic'); }
    if (t || f || e.target.closest('#theme-reset')) pop.innerHTML = themePopHtml();
  });
  document.body.appendChild(pop);
}

/* footer */
function renderFooter() {
  const f = document.createElement('footer');
  f.className = 'footer';
  f.innerHTML = `🕯️ <b>Goblin&rsquo;s Cave</b> — a fan-made virtual tabletop for D&amp;D adventurers. Not affiliated with Wizards of the Coast. · Icons by <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (Lorc &amp; Delapouite, CC BY 3.0).`;
  document.body.appendChild(f);
}

function initChrome(active) {
  renderHeader(active);
  const em = document.createElement('canvas');
  em.id = 'embers-canvas';
  document.body.prepend(em);
  Embers.init(em);
  I18n.apply(document);
}
