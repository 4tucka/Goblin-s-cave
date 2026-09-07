/* mapcanvas.js — shared grid math + interactive map canvas for builder & VTT */

const TOKEN_EMOJIS = ['🧝','🧙','🧔','👸','🥷','🧑‍🌾','🦹','🧛','🐺','👺','👹','🐉','🦂','🕷️','🐍','🦇','💀','👻','🗿','🌳','🐗','🦎','🐲','🛡️'];
const AVATARS = ['🧙','⚔️','🛡️','🏹','🗡️','🐉','🦉','🐺','🔥','👺','🧝','🧛','💀','🎲','🕯️','🌙','🍄','🪓'];
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

/* ---------------- grid math ---------------- */
const Grid = {
  geom(type, cols, rows, cs) {
    if (type === 'hex') {
      const r = cs * 0.58, w = Math.sqrt(3) * r;
      return { worldW: cols * w + w / 2, worldH: rows * 1.5 * r + 0.5 * r };
    }
    return { worldW: cols * cs, worldH: rows * cs };
  },
  center(type, cs, col, row) {
    if (type === 'hex') {
      const r = cs * 0.58, w = Math.sqrt(3) * r;
      return { x: w * (col + 0.5 + (row % 2 ? 0.5 : 0)), y: 1.5 * r * row + r };
    }
    return { x: (col + 0.5) * cs, y: (row + 0.5) * cs };
  },
  pick(type, cs, x, y, cols, rows) {
    if (type === 'hex') {
      const r = cs * 0.58, w = Math.sqrt(3) * r;
      const rowApprox = clamp(Math.round((y - r) / (1.5 * r)), 0, rows - 1);
      let best = null, bd = Infinity;
      for (let rr = rowApprox - 1; rr <= rowApprox + 1; rr++) {
        if (rr < 0 || rr >= rows) continue;
        const cc = clamp(Math.round((x - w * (0.5 + (rr % 2 ? 0.5 : 0))) / w), 0, cols - 1);
        const c = this.center('hex', cs, cc, rr);
        const d = (c.x - x) ** 2 + (c.y - y) ** 2;
        if (d < bd) { bd = d; best = { col: cc, row: rr }; }
      }
      return best || { col: 0, row: 0 };
    }
    return {
      col: clamp(Math.floor(x / cs), 0, cols - 1),
      row: clamp(Math.floor(y / cs), 0, rows - 1),
    };
  },
  path(ctx, type, cs, col, row) {
    if (type === 'hex') {
      const c = this.center(type, cs, col, row);
      const r = cs * 0.58;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 180 * (60 * i - 30);
        const px = c.x + r * Math.cos(a), py = c.y + r * Math.sin(a);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.rect(col * cs, row * cs, cs, cs);
    }
  },
  cellKey(col, row) { return col + ',' + row; },
};

/* ---------------- interactive canvas ---------------- */
class MapCanvas {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;               // { getData(), onAction(action, payload), mode, toolColor }
    this.mode = opts.mode || 'pan'; // pan | terrain | eraser | fog | unfog | token | move
    this.view = { scale: 1, ox: 0, oy: 0 };
    this.drag = null;
    this.hoverCell = null;
    this.hoverToken = null;
    this._imgCache = new Map();

    canvas.addEventListener('pointerdown', e => this.onDown(e));
    canvas.addEventListener('pointermove', e => this.onMove(e));
    window.addEventListener('pointerup', e => this.onUp(e));
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.onWheel(e); }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.ro = new ResizeObserver(() => { this.fitCanvas(); this.render(); });
    this.ro.observe(canvas.parentElement);
    this.fitCanvas();
  }

  fitCanvas() {
    const p = this.cv.parentElement;
    const w = p.clientWidth, h = Math.max(320, p.clientHeight || 480);
    const dpr = window.devicePixelRatio || 1;
    this.cv.width = w * dpr; this.cv.height = h * dpr;
    this.cv.style.height = h + 'px';
    this.dpr = dpr;
  }

  data() { return this.opts.getData ? this.opts.getData() : null; }

  fit() {
    const d = this.data(); if (!d) return;
    const cs = d.cs || 48;
    const { worldW, worldH } = Grid.geom(d.grid, d.cols, d.rows, cs);
    const cw = this.cv.width / this.dpr, ch = this.cv.height / this.dpr;
    const s = Math.min(cw / worldW, ch / worldH) * 0.94;
    this.view.scale = s;
    this.view.ox = (cw - worldW * s) / 2;
    this.view.oy = (ch - worldH * s) / 2;
    this.render();
  }

  screenToWorld(sx, sy) {
    const r = this.cv.getBoundingClientRect();
    const x = (sx - r.left - this.view.ox) / this.view.scale;
    const y = (sy - r.top - this.view.oy) / this.view.scale;
    return { x, y };
  }

  onWheel(e) {
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const r = this.cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const ns = clamp(this.view.scale * factor, 0.25, 4);
    const k = ns / this.view.scale;
    this.view.ox = mx - (mx - this.view.ox) * k;
    this.view.oy = my - (my - this.view.oy) * k;
    this.view.scale = ns;
    this.opts.onView && this.opts.onView(this.view);
    this.render();
  }

  zoomBy(f) {
    const cw = this.cv.width / this.dpr / 2, ch = this.cv.height / this.dpr / 2;
    const ns = clamp(this.view.scale * f, 0.25, 4);
    const k = ns / this.view.scale;
    this.view.ox = cw - (cw - this.view.ox) * k;
    this.view.oy = ch - (ch - this.view.oy) * k;
    this.view.scale = ns;
    this.opts.onView && this.opts.onView(this.view);
    this.render();
  }

  tokenAt(w) {
    const d = this.data(); if (!d) return null;
    const cs = d.cs || 48;
    let best = null, bd = Infinity;
    for (const t of d.tokens || []) {
      const c = Grid.center(d.grid, cs, t.x, t.y);
      const rad = (t.size || 1) * cs * 0.5;
      const dist = Math.hypot(c.x - w.x, c.y - w.y);
      if (dist <= rad && dist < bd) { bd = dist; best = t; }
    }
    return best;
  }

  emit(action, payload) { this.opts.onAction && this.opts.onAction(action, payload); }

  onDown(e) {
    this.cv.setPointerCapture(e.pointerId);
    const w = this.screenToWorld(e.clientX, e.clientY);
    const d = this.data(); if (!d) return;
    const cs = d.cs || 48;
    const cell = Grid.pick(d.grid, cs, w.x, w.y, d.cols, d.rows);
    const m = e.button === 1 || e.button === 2 ? 'pan' : this.mode;

    if (m === 'pan') {
      this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.view.ox, oy: this.view.oy };
      return;
    }
    if (m === 'move') {
      const t = this.tokenAt(w);
      if (t) {
        const allowed = this.opts.canMoveToken ? this.opts.canMoveToken(t) : true;
        if (!allowed) { this.emit('blockedMove', t); return; }
        this.drag = { kind: 'token', token: t, moved: false };
        this.emit('selectToken', t);
        return;
      }
      this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.view.ox, oy: this.view.oy };
      return;
    }
    if (m === 'token') {
      const t = this.tokenAt(w);
      if (t) { this.drag = { kind: 'token', token: t, moved: false }; this.emit('selectToken', t); return; }
      this.emit('placeToken', { col: cell.col, row: cell.row });
      return;
    }
    if (m === 'select') {
      const t = this.tokenAt(w);
      if (t) { this.drag = { kind: 'token', token: t, moved: false }; this.emit('selectToken', t); }
      else this.emit('selectToken', null);
      return;
    }
    // paint modes
    const act = { terrain: 'paintTerrain', eraser: 'eraseTerrain', fog: 'paintFog', unfog: 'eraseFog' }[m];
    if (act) {
      this.drag = { kind: 'paint', act, last: Grid.cellKey(cell.col, cell.row) };
      this.emit(act, cell);
    }
  }

  onMove(e) {
    const w = this.screenToWorld(e.clientX, e.clientY);
    const d = this.data();
    if (d) {
      const cs = d.cs || 48;
      this.hoverCell = Grid.pick(d.grid, cs, w.x, w.y, d.cols, d.rows);
      this.hoverToken = this.tokenAt(w);
      this.cv.style.cursor = this.hoverToken && (this.mode === 'move' || this.mode === 'select' || this.mode === 'token')
        ? 'grab' : (this.mode === 'pan' ? (this.drag ? 'grabbing' : 'grab') : 'crosshair');
    }
    if (!this.drag) { if (d) this.render(); return; }

    if (this.drag.kind === 'pan') {
      this.view.ox = this.drag.ox + (e.clientX - this.drag.sx);
      this.view.oy = this.drag.oy + (e.clientY - this.drag.sy);
      this.opts.onView && this.opts.onView(this.view);
      this.render();
      return;
    }
    if (this.drag.kind === 'token') {
      this.drag.moved = true;
      const t = this.drag.token;
      const snap = Grid.pick(d.grid, d.cs || 48, w.x, w.y, d.cols, d.rows);
      const c = Grid.center(d.grid, d.cs || 48, snap.col, snap.row);
      t.x = c.x / (d.cs || 48); t.y = c.y / (d.cs || 48);
      // store as cell coords of center for hex: recompute col/row floats
      if (d.grid === 'hex') { t.x = snap.col + 0.0; t.y = snap.row + 0.0; t._snap = snap; }
      else { t.x = snap.col + 0.5; t.y = snap.row + 0.5; }
      this.emit('dragToken', t);
      this.render();
      return;
    }
    if (this.drag.kind === 'paint') {
      const key = Grid.cellKey(this.hoverCell.col, this.hoverCell.row);
      if (key !== this.drag.last) {
        this.drag.last = key;
        this.emit(this.drag.act, this.hoverCell);
      }
      this.render();
    }
  }

  onUp(e) {
    if (!this.drag) return;
    if (this.drag.kind === 'token' && this.drag.moved) {
      this.emit('moveToken', this.drag.token);
    } else if (this.drag.kind === 'token' && !this.drag.moved) {
      this.emit('selectToken', this.drag.token);
    }
    this.drag = null;
    this.render();
  }

  /* ---------- rendering ---------- */
  getImage(src) {
    if (!src) return null;
    if (this._imgCache.has(src)) return this._imgCache.get(src);
    const img = new Image();
    img.onload = () => this.render();
    img.src = src;
    this._imgCache.set(src, img);
    return img;
  }

  tokenPx(d, t) {
    const cs = d.cs || 48;
    if (d.grid === 'hex' && Number.isInteger(t.x) && Number.isInteger(t.y)) {
      return Grid.center('hex', cs, t.x, t.y);
    }
    return { x: t.x * cs, y: t.y * cs };
  }

  render() {
    const ctx = this.ctx, d = this.data();
    const cw = this.cv.width / this.dpr, ch = this.cv.height / this.dpr;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, cw, ch);
    if (!d) return;

    const cs = d.cs || 48;
    const { worldW, worldH } = Grid.geom(d.grid, d.cols, d.rows, cs);
    ctx.save();
    ctx.translate(this.view.ox, this.view.oy);
    ctx.scale(this.view.scale, this.view.scale);

    // map image
    const img = this.getImage(d.src);
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, worldW, worldH);
    } else {
      ctx.fillStyle = '#171310';
      ctx.fillRect(0, 0, worldW, worldH);
    }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1 / this.view.scale;
    if (d.grid === 'hex') {
      for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) {
        Grid.path(ctx, 'hex', cs, c, r); ctx.stroke();
      }
    } else {
      for (let c = 0; c <= d.cols; c++) {
        ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, worldH); ctx.stroke();
      }
      for (let r = 0; r <= d.rows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(worldW, r * cs); ctx.stroke();
      }
    }

    // terrain
    for (const [key, color] of Object.entries(d.terrain || {})) {
      const [c, r] = key.split(',').map(Number);
      Grid.path(ctx, d.grid, cs, c, r);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // hover highlight (builder)
    if (this.hoverCell && ['terrain', 'eraser', 'fog', 'unfog', 'token'].includes(this.mode)) {
      Grid.path(ctx, d.grid, cs, this.hoverCell.col, this.hoverCell.row);
      ctx.strokeStyle = this.mode === 'fog' ? 'rgba(180,138,214,.9)' : 'rgba(255,207,138,.9)';
      ctx.lineWidth = 2 / this.view.scale;
      ctx.stroke();
    }

    // fog of war
    const dmView = d.dmView;
    const fogAlpha = dmView ? 0.55 : 0.985;
    if (d.fog && d.fog.size) {
      for (const key of d.fog) {
        const [c, r] = key.split(',').map(Number);
        Grid.path(ctx, d.grid, cs, c, r);
        ctx.fillStyle = `rgba(4,3,2,${fogAlpha})`;
        ctx.fill();
        if (dmView) { ctx.strokeStyle = 'rgba(180,138,214,.35)'; ctx.lineWidth = 1 / this.view.scale; ctx.stroke(); }
      }
    }

    // tokens
    for (const t of d.tokens || []) {
      const p = this.tokenPx(d, t);
      const rad = (t.size || 1) * cs * 0.42;
      ctx.save();
      ctx.translate(p.x, p.y);
      // active turn glow
      if (d.activeTokenId === t.id) {
        ctx.beginPath(); ctx.arc(0, 0, rad + 5 / this.view.scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,207,138,.95)';
        ctx.lineWidth = 3 / this.view.scale;
        ctx.setLineDash([6 / this.view.scale, 4 / this.view.scale]);
        ctx.stroke(); ctx.setLineDash([]);
      }
      if (d.selectedTokenId === t.id) {
        ctx.beginPath(); ctx.arc(0, 0, rad + 3 / this.view.scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,154,60,.9)'; ctx.lineWidth = 2.5 / this.view.scale; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fillStyle = t.color || '#3a2c1c';
      ctx.fill();
      ctx.strokeStyle = t.owner === 'dm' ? 'rgba(224,91,75,.9)' : 'rgba(143,196,106,.9)';
      ctx.lineWidth = 2.5 / this.view.scale;
      ctx.stroke();
      if (t.img && this.getImage(t.img)) {
        const ti = this.getImage(t.img);
        if (ti.complete && ti.naturalWidth) {
          ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(ti, -rad, -rad, rad * 2, rad * 2); ctx.restore();
        }
      } else {
        ctx.font = `${rad * 1.15}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t.icon || '❓', 0, rad * 0.08);
      }
      // hp bar
      if (t.maxHp > 0) {
        const w = rad * 2, hp = clamp(t.hp / t.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(-rad, rad + 4 / this.view.scale, w, 5 / this.view.scale);
        ctx.fillStyle = hp > 0.5 ? '#7fb069' : hp > 0.25 ? '#e8b654' : '#e05b4b';
        ctx.fillRect(-rad, rad + 4 / this.view.scale, w * hp, 5 / this.view.scale);
      }
      // name
      ctx.font = `${Math.max(10, cs * 0.24)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      const tw = ctx.measureText(t.name || '').width;
      ctx.fillRect(-tw / 2 - 3, rad + 11 / this.view.scale, tw + 6, cs * 0.28);
      ctx.fillStyle = '#ecdfc8';
      ctx.fillText(t.name || '', 0, rad + 12 / this.view.scale);
      ctx.restore();
    }

    ctx.restore();
  }
}
