/* builder.js — the Advanced Map Creator/Editor.
   Shared by the Create-Room wizard (step 2) and the standalone map-editor.html.
   Injects its whole UI into a #builder-root element. */

const PROP_EMOJIS = ['🌳', '', '️', '🍺', '🔥', '️', '🗿', '🕸️', '📦', '🛢️', '🗝️', '💎', '', '🍄', '⛲', '🕯️', '🪨', '🌋'];

function initBuilder({ root, state, owner = null, getNpcList = () => [] }) {
  const R = typeof root === 'string' ? $(root) : root;

  R.innerHTML = `
    <div class="row" style="margin-bottom:.6rem;">
      <span class="dim">Base map:</span>
      <button class="chip b-tpl active" data-tpl="cave">👺 Goblin Cave</button>
      <button class="chip b-tpl" data-tpl="dungeon">🏰 Stone Dungeon</button>
      <button class="chip b-tpl" data-tpl="tavern">🍺 Tavern</button>
      <button class="chip b-tpl" data-tpl="blank">⬛ Blank</button>
      <label class="chip" style="cursor:pointer;">⬆️ Upload
        <input type="file" class="b-upload" accept="image/*" style="display:none;"></label>
      <select class="b-vault-load" style="width:auto;font-size:.82rem;"><option value="">📂 Load from Vault…</option></select>
      <div class="spacer"></div>
      <button class="btn btn-sm b-export">⬇️ Export JSON</button>
      <label class="btn btn-sm" style="cursor:pointer;">⬆️ Import JSON
        <input type="file" class="b-import" accept=".json,application/json" style="display:none;"></label>
      ${owner ? '<button class="btn btn-sm b-save-vault">💾 Save to Vault</button>' : ''}
    </div>

    <div class="tool-bar">
      <button class="tool-btn" data-tool="pan" title="Drag to move around">✋ Pan</button>
      <button class="tool-btn" data-tool="select" title="Select / move tokens, props, walls">👆 Select</button>
      <button class="tool-btn" data-tool="token" title="Click an empty cell to place the selected NPC token">🎯 NPC token</button>
      <select class="b-npc" style="width:auto;font-size:.8rem;"><option value="">— NPC —</option></select>
      <button class="tool-btn" data-tool="prop" title="Place props (furniture, objects)">📦 Prop</button>
      <button class="tool-btn" data-tool="wall" title="Drag to draw a wall segment">🧱 Wall</button>
      <button class="tool-btn" data-tool="label" title="Click to place a text label">🏷️ Label</button>
      <span class="tool-sep"></span>
      <button class="tool-btn" data-tool="terrain">🎨 Terrain</button>
      <button class="tool-btn" data-tool="region" title="Drag a rectangle to fill terrain">▧ Region fill</button>
      <button class="tool-btn" data-tool="eraser">🧽 Erase</button>
      <span class="tool-sep"></span>
      <button class="tool-btn" data-tool="fog">🌫️ Fog</button>
      <button class="tool-btn" data-tool="unfog">☀️ Reveal</button>
    </div>
    <div class="tool-bar">
      <span class="b-swatches row" style="gap:.25rem;"></span>
      <span class="tool-sep"></span>
      <span class="dim" style="font-size:.78rem;">Prop:</span>
      <select class="b-prop" style="width:auto;font-size:.95rem;">${PROP_EMOJIS.map(p => `<option>${p}</option>`).join('')}</select>
      <label class="dim" style="font-size:.78rem;">size <input type="range" class="b-prop-size" min="0.5" max="3" step="0.25" value="1" style="width:90px;"></label>
      <span class="tool-sep"></span>
      <button class="tool-btn b-undo" title="Undo (Ctrl+Z)">↩️</button>
      <button class="tool-btn b-redo" title="Redo (Ctrl+Y)">↪️</button>
      <span class="tool-sep"></span>
      <button class="tool-btn b-zin">＋</button>
      <button class="tool-btn b-zout">－</button>
      <button class="tool-btn b-zfit">⤢ Fit</button>
      <span class="tool-sep"></span>
      <button class="tool-btn b-clear-terrain">Clear terrain</button>
      <button class="tool-btn b-clear-fog">Clear fog</button>
      <button class="tool-btn b-clear-objs">Clear props/walls/labels</button>
    </div>

    <div class="canvas-frame" style="height:480px;"><canvas class="b-canvas"></canvas></div>

    <div class="grid cols-2 mt2">
      <div class="card">
        <h3 class="mt0">Grid &amp; canvas</h3>
        <div class="row">
          <button class="chip b-grid active" data-grid="square">▦ Square</button>
          <button class="chip b-grid" data-grid="hex">⬡ Hex</button>
        </div>
        <div class="inline-grid mt1">
          <label class="field"><span>Columns</span><input type="number" class="b-cols" min="6" max="60" value="${state.map.cols}"></label>
          <label class="field"><span>Rows</span><input type="number" class="b-rows" min="6" max="40" value="${state.map.rows}"></label>
        </div>
        <label class="field"><span>Cell size: <b class="b-cs-val">${state.map.cs}</b>px</span>
          <input type="range" class="b-cs" min="28" max="90" value="${state.map.cs}"></label>
      </div>
      <div class="card">
        <h3 class="mt0">Selected object</h3>
        <div class="dim b-sel-empty">Click 🎯 tokens, 📦 props or 🧱 walls with the <b>Select</b> tool.</div>
        <div class="b-sel hidden">
          <div class="row"><b class="b-sel-title"></b><span class="badge dim b-sel-kind"></span></div>
          <label class="field mt1 b-sel-name-wrap"><span>Label / name</span><input type="text" class="b-sel-name"></label>
          <label class="field"><span class="b-sel-size-lbl">Scale</span>
            <input type="range" class="b-sel-size" min="0.5" max="4" step="0.25" value="1"></label>
          <div class="row">
            <button class="btn btn-sm b-sel-dup">⧉ Duplicate</button>
            <button class="btn btn-sm btn-danger b-sel-del">🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>`;

  const TEMPLATES = {
    cave: 'assets/map-cave.jpg', dungeon: 'assets/map-dungeon.jpg',
    tavern: 'assets/map-tavern.jpg', blank: null,
  };

  state.props = state.props || [];
  state.walls = state.walls || [];
  state.labels = state.labels || [];

  /* ---------- canvas ---------- */
  let selected = null; // {kind:'token'|'prop'|'wall', ref}
  let terrainColor = TERRAIN_SWATCHES[1].c;
  let npcId = '', commitTimer = null;

  const mc = new MapCanvas($('.b-canvas', R), {
    getData: () => ({ ...state.map, terrain: state.terrain, fog: state.fog, tokens: state.tokens,
      props: state.props, walls: state.walls, labels: state.labels,
      dmView: true, selectedTokenId: selected?.kind === 'token' ? selected.ref.id : null,
      selectedPropId: selected?.kind === 'prop' ? selected.ref.id : null,
      selectedWallId: selected?.kind === 'wall' ? selected.ref.id : null }),
    onAction,
    canMoveToken: () => true,
  });

  /* ---------- undo / redo ---------- */
  let hist = [], hIdx = -1;
  const snap = () => JSON.stringify({ terrain: state.terrain, fog: [...state.fog], tokens: state.tokens,
    props: state.props, walls: state.walls, labels: state.labels });
  function commit() {
    const s = snap();
    if (hist[hIdx] === s) return;
    hist = hist.slice(0, hIdx + 1);
    hist.push(s); hIdx++;
    if (hist.length > 60) { hist.shift(); hIdx--; }
  }
  function commitSoon() { clearTimeout(commitTimer); commitTimer = setTimeout(commit, 300); }
  function restore(s) {
    const o = JSON.parse(s);
    state.terrain = o.terrain; state.fog = new Set(o.fog);
    state.tokens = o.tokens; state.props = o.props; state.walls = o.walls; state.labels = o.labels;
    selected = null; renderSel(); mc.render();
  }
  $('.b-undo', R).addEventListener('click', () => { if (hIdx > 0) { hIdx--; restore(hist[hIdx]); } });
  $('.b-redo', R).addEventListener('click', () => { if (hIdx < hist.length - 1) { hIdx++; restore(hist[hIdx]); } });
  document.addEventListener('keydown', e => {
    if (!R.isConnected) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'z') { e.preventDefault(); $('.b-undo', R).click(); }
    if (e.key === 'y') { e.preventDefault(); $('.b-redo', R).click(); }
  });
  commit();

  /* ---------- tools ---------- */
  $$('[data-tool]', R).forEach(b => b.addEventListener('click', () => {
    $$('[data-tool]', R).forEach(x => x.classList.toggle('active', x === b));
    mc.mode = b.dataset.tool;
  }));
  $('[data-tool="pan"]', R).classList.add('active');

  /* swatches */
  const sw = $('.b-swatches', R);
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

  /* zoom / clears */
  $('.b-zin', R).addEventListener('click', () => mc.zoomBy(1.2));
  $('.b-zout', R).addEventListener('click', () => mc.zoomBy(0.83));
  $('.b-zfit', R).addEventListener('click', () => mc.fit());
  $('.b-clear-terrain', R).addEventListener('click', () => { state.terrain = {}; commit(); mc.render(); });
  $('.b-clear-fog', R).addEventListener('click', () => { state.fog.clear(); commit(); mc.render(); });
  $('.b-clear-objs', R).addEventListener('click', () => {
    if (!confirm('Remove ALL props, walls and labels?')) return;
    state.props = []; state.walls = []; state.labels = [];
    selected = null; renderSel(); commit(); mc.render();
  });

  /* base maps */
  $$('.b-tpl', R).forEach(b => b.addEventListener('click', () => {
    $$('.b-tpl', R).forEach(x => x.classList.toggle('active', x === b));
    state.map.kind = 'template';
    state.map.src = TEMPLATES[b.dataset.tpl];
    mc.render();
  }));
  $('.b-upload', R).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      state.map.kind = 'upload';
      state.map.src = await fileToScaledDataURL(f, 1400, 0.82);
      $$('.b-tpl', R).forEach(x => x.classList.remove('active'));
      mc.render();
      toast('Custom map unfurled on the table.', 'ok');
    } catch { toast('Could not read that image.', 'err'); }
  });

  /* grid settings */
  $$('.b-grid', R).forEach(b => b.addEventListener('click', () => {
    $$('.b-grid', R).forEach(x => x.classList.toggle('active', x === b));
    state.map.grid = b.dataset.grid;
    for (const t of state.tokens) {
      const col = Math.floor(t.x), row = Math.floor(t.y);
      t.x = state.map.grid === 'hex' ? clamp(col, 0, state.map.cols - 1) : col + 0.5;
      t.y = state.map.grid === 'hex' ? clamp(row, 0, state.map.rows - 1) : row + 0.5;
    }
    commit(); mc.render();
  }));
  if (state.map.grid === 'hex') $$('.b-grid', R).forEach(x => x.classList.toggle('active', x.dataset.grid === 'hex'));
  $('.b-cols', R).addEventListener('change', () => { state.map.cols = clamp(parseInt($('.b-cols', R).value) || 16, 6, 60); commit(); mc.fit(); });
  $('.b-rows', R).addEventListener('change', () => { state.map.rows = clamp(parseInt($('.b-rows', R).value) || 12, 6, 40); commit(); mc.fit(); });
  $('.b-cs', R).addEventListener('input', () => {
    state.map.cs = parseInt($('.b-cs', R).value);
    $('.b-cs-val', R).textContent = state.map.cs;
    mc.render();
  });

  /* npc options for token placement */
  function setNpcOptions() {
    const sel = $('.b-npc', R);
    sel.innerHTML = '<option value="">— NPC —</option>' +
      getNpcList().map(n => `<option value="${n.id}">${n.icon} ${escapeHtml(n.name)}</option>`).join('');
    sel.value = npcId;
  }
  $('.b-npc', R).addEventListener('change', e => { npcId = e.target.value; });

  /* ---------- selection panel ---------- */
  function renderSel() {
    const empty = $('.b-sel-empty', R), box = $('.b-sel', R);
    empty.classList.toggle('hidden', !!selected);
    box.classList.toggle('hidden', !selected);
    if (!selected) return;
    const o = selected.ref;
    $('.b-sel-kind', R).textContent = selected.kind;
    $('.b-sel-title', R).textContent = o.icon ? `${o.icon} ` : '';
    $('.b-sel-name', R).value = o.name || o.text || '';
    const isWall = selected.kind === 'wall';
    $('.b-sel-size-lbl', R).textContent = isWall ? 'Thickness' : 'Scale / size';
    $('.b-sel-size', R).value = isWall ? (o.w || 0.2) * 4 : (o.size || o.scale || 1);
    $('.b-sel-size', R).min = isWall ? 0.5 : 0.25;
    $('.b-sel-size', R).max = isWall ? 3 : 4;
    $('.b-sel-size', R).step = 0.25;
  }
  $('.b-sel-name', R).addEventListener('input', () => {
    if (!selected) return;
    const v = $('.b-sel-name', R).value;
    if (selected.kind === 'label') selected.ref.text = v; else selected.ref.name = v;
    mc.render();
  });
  $('.b-sel-size', R).addEventListener('input', () => {
    if (!selected) return;
    const v = parseFloat($('.b-sel-size', R).value);
    if (selected.kind === 'token') selected.ref.size = v;
    if (selected.kind === 'prop') selected.ref.scale = v;
    if (selected.kind === 'wall') selected.ref.w = v / 4;
    mc.render();
  });
  $('.b-sel-del', R).addEventListener('click', () => {
    if (!selected) return;
    const id = selected.ref.id;
    if (selected.kind === 'token') state.tokens = state.tokens.filter(x => x.id !== id);
    if (selected.kind === 'prop') state.props = state.props.filter(x => x.id !== id);
    if (selected.kind === 'wall') state.walls = state.walls.filter(x => x.id !== id);
    selected = null; renderSel(); commit(); mc.render();
  });
  $('.b-sel-dup', R).addEventListener('click', () => {
    if (!selected || selected.kind === 'wall') return;
    const copy = { ...selected.ref, id: uid(), x: selected.ref.x + 1 };
    (selected.kind === 'token' ? state.tokens : state.props).push(copy);
    selected = { kind: selected.kind, ref: copy };
    renderSel(); commit(); mc.render();
  });

  /* ---------- canvas actions ---------- */
  function makeNpcToken(npc, col, row) {
    const hex = state.map.grid === 'hex';
    return { id: uid(), npcId: npc.id, name: npc.name, icon: npc.icon, img: null, color: '#4a2018',
      owner: 'dm', hp: npc.maxHp, maxHp: npc.maxHp, ac: npc.ac, atk: npc.atk, size: 1,
      x: hex ? col : col + 0.5, y: hex ? row : row + 0.5 };
  }

  function onAction(action, p) {
    switch (action) {
      case 'paintTerrain': state.terrain[Grid.cellKey(p.col, p.row)] = terrainColor; commitSoon(); mc.render(); break;
      case 'eraseTerrain': delete state.terrain[Grid.cellKey(p.col, p.row)]; commitSoon(); mc.render(); break;
      case 'paintFog': state.fog.add(Grid.cellKey(p.col, p.row)); commitSoon(); mc.render(); break;
      case 'eraseFog': state.fog.delete(Grid.cellKey(p.col, p.row)); commitSoon(); mc.render(); break;
      case 'regionEnd': {
        const c0 = Math.min(p.a.col, p.b.col), c1 = Math.max(p.a.col, p.b.col);
        const r0 = Math.min(p.a.row, p.b.row), r1 = Math.max(p.a.row, p.b.row);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++)
          state.terrain[Grid.cellKey(c, r)] = terrainColor;
        commit(); mc.render(); break;
      }
      case 'placeToken': {
        const npc = getNpcList().find(n => n.id === npcId);
        if (!npc) return toast('Pick which NPC to place (dropdown next to 🎯).', 'err');
        const t = makeNpcToken(npc, p.col, p.row);
        state.tokens.push(t);
        selected = { kind: 'token', ref: t }; renderSel(); commit(); mc.render(); break;
      }
      case 'placeProp': {
        const pr = { id: uid(), icon: $('.b-prop', R).value, name: '', x: p.x, y: p.y,
          scale: parseFloat($('.b-prop-size', R).value) || 1 };
        state.props.push(pr);
        selected = { kind: 'prop', ref: pr }; renderSel(); commit(); mc.render(); break;
      }
      case 'wallEnd': {
        const wl = { id: uid(), x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, w: 0.2 };
        state.walls.push(wl);
        selected = { kind: 'wall', ref: wl }; renderSel(); commit(); mc.render(); break;
      }
      case 'labelAt': {
        const text = prompt('Label text:', 'The Crypt');
        if (!text) return;
        state.labels.push({ id: uid(), text, x: p.x, y: p.y, size: 0.5, color: '#ff9d8d' });
        commit(); mc.render(); break;
      }
      case 'selectToken':
        selected = p ? { kind: 'token', ref: p } : (selected?.kind === 'token' ? null : selected);
        if (!p && selected?.kind === 'token') selected = null;
        renderSel(); mc.render(); break;
      case 'selectProp':
        selected = p ? { kind: 'prop', ref: p } : (selected?.kind === 'prop' ? null : selected);
        renderSel(); mc.render(); break;
      case 'selectWall': selected = { kind: 'wall', ref: p }; renderSel(); mc.render(); break;
      case 'moveToken': case 'moveProp': commit(); mc.render(); break;
      case 'dragToken': case 'dragProp': mc.render(); break;
    }
  }

  /* ---------- export / import ---------- */
  function serialize() {
    return {
      v: 2, name: state.name || 'My Battlemap',
      map: { ...state.map }, terrain: state.terrain, fog: [...state.fog],
      tokens: state.tokens, props: state.props, walls: state.walls, labels: state.labels,
    };
  }
  $('.b-export', R).addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.name || 'battlemap').replace(/\W+/g, '-') + '.json';
    a.click();
    toast('Map exported as JSON.', 'ok');
  });
  $('.b-import', R).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      applySerialized(o);
      toast('Map imported. 🗺️', 'ok');
    } catch { toast('That JSON could not be parsed as a map.', 'err'); }
  });
  function applySerialized(o) {
    if (!o || !o.map) throw new Error('not a map');
    Object.assign(state.map, o.map);
    state.terrain = o.terrain || {};
    state.fog = new Set(o.fog || []);
    state.tokens = o.tokens || [];
    state.props = o.props || [];
    state.walls = o.walls || [];
    state.labels = o.labels || [];
    $('.b-cols', R).value = state.map.cols;
    $('.b-rows', R).value = state.map.rows;
    $('.b-cs', R).value = state.map.cs; $('.b-cs-val', R).textContent = state.map.cs;
    $$('.b-grid', R).forEach(x => x.classList.toggle('active', x.dataset.grid === state.map.grid));
    selected = null; renderSel(); commit(); mc.fit();
  }

  /* ---------- vault ---------- */
  function refreshVault() {
    const sel = $('.b-vault-load', R);
    sel.innerHTML = '<option value="">📂 Load from Vault…</option>';
    if (!owner) return;
    for (const m of Store.maps().filter(m => m.owner === owner)) {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = m.name;
      sel.appendChild(o);
    }
  }
  $('.b-vault-load', R).addEventListener('change', e => {
    const m = Store.maps().find(x => x.id === e.target.value);
    if (!m) return;
    applySerialized({ map: { kind: 'vault', src: m.src, cols: m.cols, rows: m.rows, grid: m.grid, cs: state.map.cs },
      terrain: m.terrain, fog: m.fog, tokens: m.tokens, props: m.props, walls: m.walls, labels: m.labels });
    toast(`Loaded <b>${escapeHtml(m.name)}</b> from the Vault.`, 'ok');
  });
  const saveBtn = $('.b-save-vault', R);
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const name = prompt('Name this map:', state.name || 'My Battlemap') || 'My Battlemap';
    const ok = Store.saveMap({ id: state.vaultId || uid(), owner, name,
      src: state.map.src, cols: state.map.cols, rows: state.map.rows, grid: state.map.grid,
      terrain: state.terrain, fog: [...state.fog], tokens: state.tokens,
      props: state.props, walls: state.walls, labels: state.labels });
    toast(ok ? 'Map saved to My Vault. 🗺️' : 'Storage is full — delete old maps first.', ok ? 'ok' : 'err');
  });

  refreshVault();
  setTimeout(() => mc.fit(), 40);

  return {
    fit: () => mc.fit(),
    render: () => mc.render(),
    setNpcOptions,
    refreshVault,
    serialize,
    applySerialized,
    get state() { return state; },
  };
}
