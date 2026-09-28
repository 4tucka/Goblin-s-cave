/* ============================================================
   AIDM — AI Dungeon Master GAME ENGINE (command layer).
   The AI brain may only PROPOSE actions; every mutation passes
   through exec(), which validates against the authoritative
   Game State (the existing room object) before applying it.
   Architecture: PLAYER → BRAIN → TOOL CALL → VALIDATOR →
   GAME STATE → MAP/UI (existing systems, reused).
   ============================================================ */
const AIDM = (() => {

  /* ---------- terrain registry: gameplay-meaningful ground ---------- */
  const TERRAIN = {
    grass:      { c: 'rgba(88,140,70,.5)',   cost: 1 },
    forest:     { c: 'rgba(52,128,60,.6)',   cost: 2, cover: true },
    sand:       { c: 'rgba(214,183,110,.5)', cost: 1 },
    stone:      { c: 'rgba(140,130,115,.45)',cost: 1 },
    dirt:       { c: 'rgba(146,108,74,.5)',  cost: 1 },
    mud:        { c: 'rgba(96,74,44,.6)',    cost: 2 },
    swamp:      { c: 'rgba(88,100,45,.6)',   cost: 2 },
    water:      { c: 'rgba(46,109,246,.55)', cost: 99 },
    deep_water: { c: 'rgba(20,60,180,.7)',   cost: 99 },
    mountain:   { c: 'rgba(90,86,80,.8)',    cost: 3 },
    hill:       { c: 'rgba(120,112,96,.6)',  cost: 2 },
    cliff:      { c: 'rgba(50,46,40,.9)',    cost: 99 },
    lava:       { c: 'rgba(255,94,26,.55)',  cost: 99 },
    snow:       { c: 'rgba(230,240,250,.5)', cost: 2 },
    ice:        { c: 'rgba(160,220,240,.5)', cost: 2 },
    road:       { c: 'rgba(180,150,100,.55)',cost: 1 },
    bridge:     { c: 'rgba(150,105,60,.65)', cost: 1 },
    rubble:     { c: 'rgba(140,130,115,.55)',cost: 2 },
    wall:       { c: 'rgba(40,36,32,.88)',   cost: 99 },
  };
  const terrainNameByColor = {};
  for (const [n, t] of Object.entries(TERRAIN)) terrainNameByColor[t.c] = n;

  /* ---------- geometry helpers ---------- */
  const key = (c, r) => c + ',' + r;
  function inBounds(room, c, r) { return c >= 0 && r >= 0 && c < room.map.cols && r < room.map.rows; }
  function doorAt(room, c, r) {
    return (room.props || []).find(p => p.door && Math.floor(p.x) === c && Math.floor(p.y) === r);
  }
  function terrainTypeAt(room, c, r) { return terrainNameByColor[room.terrain[key(c, r)]] || null; }
  function cellBlock(room, c, r) {           // blocks movement & sight
    if (!inBounds(room, c, r)) return true;
    const tt = terrainTypeAt(room, c, r);
    if (tt && TERRAIN[tt].cost >= 99) return true;
    const d = doorAt(room, c, r);
    if (d && (d.state === 'closed' || d.state === 'locked')) return true;
    return false;
  }
  function moveCost(room, c, r) {
    const tt = terrainTypeAt(room, c, r);
    return tt ? TERRAIN[tt].cost : 1;
  }
  function occupiedBy(room, c, r, exceptId) {
    return room.tokens.find(t => t.id !== exceptId && Math.floor(t.x) === c && Math.floor(t.y) === r);
  }

  /* BFS pathfinding with terrain costs */
  function path(room, from, to, maxCost) {
    const [fc, fr] = [Math.floor(from.x), Math.floor(from.y)];
    const [tc, tr] = [Math.floor(to.x), Math.floor(to.y)];
    if (!inBounds(room, tc, tr)) return null;
    const cost = { [key(fc, fr)]: 0 }, prev = {};
    const q = [[fc, fr]];
    while (q.length) {
      q.sort((a, b) => cost[key(a[0], a[1])] - cost[key(b[0], b[1])]);
      const [c, r] = q.shift();
      if (c === tc && r === tr) break;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr, k = key(nc, nr);
        if (!inBounds(room, nc, nr) || cellBlock(room, nc, nr)) continue;
        const step = cost[key(c, r)] + moveCost(room, nc, nr);
        if (step > maxCost) continue;
        if (cost[k] === undefined || step < cost[k]) {
          cost[k] = step; prev[k] = key(c, r); q.push([nc, nr]);
        }
      }
    }
    const tk = key(tc, tr);
    if (cost[tk] === undefined) return null;
    const cells = []; let k = tk;
    while (k && k !== key(fc, fr)) { const [c, r] = k.split(',').map(Number); cells.unshift([c, r]); k = prev[k]; }
    return { cells, cost: cost[tk] };
  }

  /* Bresenham line of sight (walls & closed doors block) */
  function los(room, a, b) {
    let [x0, y0] = [Math.floor(a.x), Math.floor(a.y)];
    const [x1, y1] = [Math.floor(b.x), Math.floor(b.y)];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (!(x0 === x1 && y0 === y1)) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      if (x0 === x1 && y0 === y1) break;
      if (cellBlock(room, x0, y0)) return false;
    }
    return true;
  }

  /* ---------- memory ---------- */
  function mem(room) {
    room.aidm = room.aidm || { scene: null, session: [], campaign: [], world: {}, quests: [], npc: {} };
    return room.aidm;
  }
  function remember(room, layer, entry) {
    const m = mem(room);
    m[layer].push({ ts: Date.now(), text: entry });
    if (m[layer].length > 120) m[layer].shift();
  }

  /* ---------- dice (real rolls, never invented) ---------- */
  function atkBonus(t) { const m = String(t.atk || '').match(/([+-]\d+)/); return m ? parseInt(m[1]) : 3; }
  function dmgExpr(t) { const m = String(t.atk || '').match(/(\d+d\d+(?:[+-]\d+)?)/); return m ? m[1] : '1d6'; }

  /* ============================================================
     EXEC — the single validated mutation entry point
     ============================================================ */
  function exec(room, action) {
    const A = action || {};
    const t = id => room.tokens.find(x => x.id === id);
    switch (A.type) {

      case 'SPAWN_UNIT': {
        if (!A.name) return { ok: false, error: 'spawn: name required' };
        const c = A.x | 0, r = A.y | 0;
        if (!inBounds(room, c, r)) return { ok: false, error: 'spawn: out of bounds' };
        if (cellBlock(room, c, r)) return { ok: false, error: 'spawn: cell blocked' };
        if (occupiedBy(room, c, r)) return { ok: false, error: 'spawn: cell occupied' };
        const tok = {
          id: A.id || uid(), npcId: A.id || uid(), name: A.name.slice(0, 40),
          icon: A.icon || 'assets/icons/shadow.svg', img: null, color: '#4a2018',
          owner: A.owner || 'dm', stance: A.stance || 'hostile',
          hp: A.hp || 10, maxHp: A.hp || 10, ac: A.ac || 12, atk: A.atk || 'Claws +3 — 1d6 slashing',
          level: A.level || 1, speed: A.speed || 6, faction: A.faction || '',
          statuses: [], x: c + 0.5, y: r + 0.5,
        };
        room.tokens.push(tok);
        return { ok: true, unit: tok };
      }

      case 'MOVE_UNIT': {
        const u = t(A.unitId);
        if (!u) return { ok: false, error: 'move: no such unit' };
        if (u.hp <= 0) return { ok: false, error: 'move: unit is down' };
        const p = path(room, u, { x: A.x, y: A.y }, u.speed || 6);
        if (!p) return { ok: false, error: 'move: unreachable or too far' };
        if (occupiedBy(room, A.x | 0, A.y | 0, u.id)) return { ok: false, error: 'move: cell occupied' };
        u.x = (A.x | 0) + 0.5; u.y = (A.y | 0) + 0.5;
        return { ok: true, unit: u, cost: p.cost };
      }

      case 'REMOVE_UNIT': {
        const u = t(A.unitId);
        if (!u) return { ok: false, error: 'remove: no such unit' };
        room.tokens = room.tokens.filter(x => x.id !== u.id);
        room.initiative = (room.initiative || []).filter(e => e.tokenId !== u.id);
        return { ok: true, name: u.name };
      }

      case 'CHANGE_HP': {
        const u = t(A.unitId);
        if (!u || u.maxHp <= 0) return { ok: false, error: 'hp: no such unit' };
        u.hp = Math.max(0, Math.min(u.maxHp, u.hp + (A.delta | 0)));
        return { ok: true, unit: u, hp: u.hp };
      }

      case 'APPLY_STATUS': {
        const u = t(A.unitId);
        if (!u) return { ok: false, error: 'status: no such unit' };
        u.statuses = u.statuses || [];
        if (!u.statuses.includes(A.status)) u.statuses.push(A.status);
        return { ok: true, unit: u };
      }

      case 'ATTACK': {
        const at = t(A.attackerId), df = t(A.targetId);
        if (!at || !df) return { ok: false, error: 'attack: missing combatant' };
        const dist = Math.hypot(Math.floor(at.x) - Math.floor(df.x), Math.floor(at.y) - Math.floor(df.y));
        if (dist > 1.6 && !/bow|shortbow|longbow|crossbow|arrow|sling/i.test(at.atk || ''))
          return { ok: false, error: 'attack: target out of melee reach' };
        if (!los(room, at, df)) return { ok: false, error: 'attack: no line of sight' };
        const roll = Dice.roll('1d20');
        const total = roll.total + atkBonus(at);
        const crit = roll.total === 20;
        if (total < (df.ac || 10) && !crit) return { ok: true, hit: false, roll: total, target: df };
        let dmg = Dice.roll(dmgExpr(at)).total;
        if (crit) dmg *= 2;
        df.hp = Math.max(0, df.hp - dmg);
        return { ok: true, hit: true, crit, roll: total, dmg, target: df, down: df.hp === 0 };
      }

      case 'SET_TERRAIN': {
        let n = 0;
        for (const [c, r] of A.cells || []) {
          if (!inBounds(room, c, r)) continue;
          const tt = TERRAIN[A.terrain];
          if (!tt) return { ok: false, error: 'terrain: unknown type ' + A.terrain };
          room.terrain[key(c, r)] = tt.c; n++;
        }
        return { ok: true, painted: n };
      }

      case 'CLEAR_TERRAIN': {
        let n = 0;
        for (const [c, r] of A.cells || []) { if (delete room.terrain[key(c, r)]) n++; }
        return { ok: true, cleared: n };
      }

      case 'CREATE_WALL': {
        room.walls = room.walls || [];
        const w = { id: uid(), x1: A.x1, y1: A.y1, x2: A.x2, y2: A.y2, w: A.w || 0.18 };
        room.walls.push(w);
        return { ok: true, wall: w };
      }

      case 'CREATE_DOOR': {
        const c = A.x | 0, r = A.y | 0;
        if (!inBounds(room, c, r)) return { ok: false, error: 'door: out of bounds' };
        if (doorAt(room, c, r)) return { ok: false, error: 'door: already exists' };
        const d = { id: 'door_' + uid(), icon: '🚪', name: A.name || 'Door', door: true, state: A.state || 'closed', x: c + 0.5, y: r + 0.5, scale: 1 };
        room.props = room.props || [];
        room.props.push(d);
        return { ok: true, door: d };
      }

      case 'SET_DOOR': {
        const states = ['open', 'closed', 'locked', 'destroyed'];
        if (!states.includes(A.state)) return { ok: false, error: 'door: bad state' };
        const d = A.doorId ? (room.props || []).find(p => p.id === A.doorId)
          : doorAt(room, A.x | 0, A.y | 0);
        if (!d) return { ok: false, error: 'door: not found' };
        if (d.state === 'destroyed') return { ok: false, error: 'door: destroyed beyond use' };
        d.state = A.state;
        return { ok: true, door: d };
      }

      case 'CREATE_PROP': {
        const c = A.x | 0, r = A.y | 0;
        if (!inBounds(room, c, r)) return { ok: false, error: 'prop: out of bounds' };
        const p = { id: A.id || uid(), icon: A.icon || '📦', name: A.name || '', x: c + 0.5, y: r + 0.5, scale: A.scale || 1 };
        if (A.item) p.item = true;
        if (A.state) p.state = A.state;
        room.props = room.props || [];
        room.props.push(p);
        return { ok: true, prop: p };
      }

      case 'SET_FOG': {
        let n = 0;
        const rad = A.r ?? 3;
        for (let c = (A.x | 0) - rad; c <= (A.x | 0) + rad; c++)
          for (let r = (A.y | 0) - rad; r <= (A.y | 0) + rad; r++) {
            if (!inBounds(room, c, r)) continue;
            if ((c - (A.x | 0)) ** 2 + (r - (A.y | 0)) ** 2 > rad * rad + 1) continue;
            const fog = new Set(room.fog);
            if (A.mode === 'hide') fog.add(key(c, r)); else fog.delete(key(c, r));
            room.fog = [...fog]; n++;
          }
        return { ok: true, cells: n };
      }

      case 'ROLL': {
        const r = Dice.roll(A.expr || '1d20', A.adv || null);
        if (!r) return { ok: false, error: 'roll: bad expression' };
        return { ok: true, roll: r };
      }

      case 'START_COMBAT': {
        const entries = room.tokens.filter(x => x.maxHp > 0 && x.hp > 0).map(x => ({
          tokenId: x.id, name: x.name, icon: x.icon, val: Dice.roll('1d20').total + (x.owner === 'dm' ? 2 : 1),
        })).sort((a, b) => b.val - a.val);
        room.initiative = entries; room.turnIdx = 0; room.combat = true;
        return { ok: true, order: entries.map(e => e.name) };
      }

      case 'END_COMBAT': { room.combat = false; room.initiative = []; room.turnIdx = 0; return { ok: true }; }

      case 'CREATE_QUEST': {
        const m = mem(room);
        const q = { id: uid(), title: A.title || 'Untitled quest', desc: A.desc || '', state: 'active' };
        m.quests.push(q);
        remember(room, 'session', 'Quest offered: ' + q.title);
        return { ok: true, quest: q };
      }

      case 'UPDATE_WORLD': {
        const m = mem(room);
        Object.assign(m.world, A.flags || {});
        if (A.note) remember(room, 'campaign', A.note);
        return { ok: true };
      }

      default:
        return { ok: false, error: 'unknown action: ' + (A && A.type) };
    }
  }

  /* run a batch; returns per-action results for honest narration */
  function execAll(room, actions) {
    return (actions || []).map(a => ({ action: a, result: exec(room, a) }));
  }

  return { TERRAIN, key, inBounds, doorAt, terrainTypeAt, cellBlock, moveCost, path, los, mem, remember, atkBonus, dmgExpr, exec, execAll };
})();
