/* core.js — tiny utilities shared by all pages */
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
      <a href="index.html" data-nav="home">Home</a>
      <a href="create.html" data-nav="create">Create Room</a>
      <a href="join.html" data-nav="join">Join Room</a>
      ${u && !u.guest ? '<a href="account.html" data-nav="account">My Account</a>' : ''}
    </nav>
    <div class="spacer"></div>
    ${u ? `
      <div class="user-chip" id="user-chip" title="${u.guest ? 'Playing as guest' : 'Account'}">
        <div class="avatar">${u.avatarImg ? `<img src="${u.avatarImg}">` : (u.avatar || '👤')}</div>
        <span>${escapeHtml(u.name || u.username)}</span>
        ${u.guest ? '<span class="badge dim">Guest</span>' : ''}
      </div>` : `
      <a class="btn btn-sm" href="index.html#auth">Log in</a>
      <a class="btn btn-sm btn-primary" href="index.html#auth">Sign up</a>`}
  `;
  document.body.prepend(header);
  const link = $(`[data-nav="${active}"]`, header);
  if (link) link.classList.add('active');
  const chip = $('#user-chip', header);
  if (chip) chip.addEventListener('click', () => {
    if (u.guest) location.href = 'index.html#auth';
    else location.href = 'account.html';
  });
}

/* footer */
function renderFooter() {
  const f = document.createElement('footer');
  f.className = 'footer';
  f.innerHTML = `🕯️ <b>Goblin&rsquo;s Cave</b> — a fan-made virtual tabletop for D&amp;D adventurers. Not affiliated with Wizards of the Coast.`;
  document.body.appendChild(f);
}

function initChrome(active) {
  renderHeader(active);
  const em = document.createElement('canvas');
  em.id = 'embers-canvas';
  document.body.prepend(em);
  Embers.init(em);
}
