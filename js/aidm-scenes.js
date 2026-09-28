/* ============================================================
   AIDMScenes — procedural scene generation.
   Scenes are expressed ONLY as validated engine actions, so the
   world they describe is the world that actually exists.
   ============================================================ */
const AIDMScenes = (() => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[rnd(0, arr.length - 1)];

  const TYPES = {
    mine:   { img: 'assets/map-cave.jpg',    floor: 'dirt',  accent: 'lava',  label: 'The Abandoned Mine',
              mobs: [['Goblin Miner', 'goblin', 7, 13], ['Cave Wolf', 'wolf', 11, 13], ['Bat Swarm', 'bat', 8, 12], ['Ogre Overseer', 'minotaur', 30, 13]],
              props: ['🪨', '️', '🛢️', '🗝️', '🕯️'] },
    crypt:  { img: 'assets/map-dungeon.jpg', floor: 'stone', accent: 'rubble', label: 'The Restless Crypt',
              mobs: [['Skeletal Warden', 'skeleton', 13, 13], ['Rattling Skeleton', 'skeleton', 13, 13], ['Rotting Zombie', 'undead', 22, 8], ['The Restless One', 'ghost', 18, 11]],
              props: ['🗿', '🕯️', '🕸️', '💎', '⚰️'] },
    cave:   { img: 'assets/map-cave.jpg',    floor: 'stone', accent: 'water', label: 'The Goblin Warren',
              mobs: [['Goblin Scout', 'goblin', 7, 13], ['Goblin Archer', 'archer', 7, 13], ['Wolf', 'wolf', 11, 13], ['Hobgoblin Chief', 'guard', 15, 15]],
              props: ['🔥', '📦', '🛢️', '🍖'] },
    tavern: { img: 'assets/map-tavern.jpg',  floor: 'dirt',  accent: null,    label: 'The Rusty Flagon',
              mobs: [['Innkeeper Bram', 'knight', 12, 12, 'friendly'], ['Barmaid Mira', 'fairy', 9, 11, 'friendly'], ['Drunken Brawler', 'barbarian', 10, 12], ['Ogre Bouncer', 'minotaur', 40, 11]],
              props: ['🍺', '🪑', '️', '🕯️'] },
    village:{ img: null,                     floor: 'grass', accent: 'forest', label: 'Willowbrook Village',
              mobs: [['Merchant Tobo', 'rogue', 10, 12, 'friendly'], ['Guard Alda', 'guard', 14, 14, 'friendly'], ['Villager Nix', 'cat', 6, 10, 'friendly'], ['Wolf', 'wolf', 11, 13]],
              props: ['🌳', '️', '⛲', '📦', '️'] },
    camp:   { img: 'assets/map-cave.jpg',    floor: 'grass', accent: 'forest', label: 'Bandit Camp',
              mobs: [['Bandit Sentry', 'rogue', 9, 12], ['Bandit Brute', 'barbarian', 14, 12], ['Bandit Archer', 'archer', 8, 12], ['War Dog', 'wolf', 11, 12]],
              props: ['🔥', '', '🛢️', '🗝️'] },
  };

  /* carve rooms + corridors on the existing grid */
  function carve(cols, rows, roomCount) {
    const floor = new Set(), rooms = [];
    for (let i = 0; i < roomCount * 4 && rooms.length < roomCount; i++) {
      const w = rnd(3, 5), h = rnd(3, 4);
      const x = rnd(1, cols - w - 2), y = rnd(1, rows - h - 2);
      const rect = { x, y, w, h };
      if (rooms.some(o => x < o.x + o.w + 1 && o.x < x + w + 1 && y < o.y + o.h + 1 && o.y < y + h + 1)) continue;
      rooms.push(rect);
      for (let c = x; c < x + w; c++) for (let r = y; r < y + h; r++) floor.add(c + ',' + r);
    }
    const cx = r => Math.floor(r.x + r.w / 2), cy = r => Math.floor(r.y + r.h / 2);
    const doors = [];
    for (let i = 1; i < rooms.length; i++) {
      let c = cx(rooms[i - 1]), r = cy(rooms[i - 1]);
      const tc = cx(rooms[i]), tr = cy(rooms[i]);
      while (c !== tc) {
        const wasIn = floor.has(c + ',' + r);
        c += Math.sign(tc - c);
        floor.add(c + ',' + r);
        if (!wasIn && floor.has(c + ',' + r) && !doors.some(d => d[0] === c && d[1] === r)) { /* corridor mouth */ }
      }
      while (r !== tr) { r += Math.sign(tr - r); floor.add(c + ',' + r); }
      // door at the room rim where corridor enters room i
      doors.push([tc, tr]);
    }
    return { floor, rooms, doors };
  }

  function build(room, type) {
    const T = TYPES[type] || TYPES.mine;
    const { cols, rows } = room.map;
    const actions = [];
    const isVillage = type === 'village';

    /* terrain: fresh canvas */
    const clear = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) clear.push([c, r]);
    actions.push({ type: 'CLEAR_TERRAIN', cells: clear });

    let floorCells;
    if (isVillage) {
      floorCells = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) floorCells.push([c, r]);
      actions.push({ type: 'SET_TERRAIN', terrain: 'grass', cells: floorCells });
      // a road through the middle
      const road = []; for (let c = 0; c < cols; c++) { road.push([c, 5]); road.push([c, 6]); }
      actions.push({ type: 'SET_TERRAIN', terrain: 'road', cells: road });
      // forest rims
      const trees = [];
      for (let r = 0; r < rows; r++) { trees.push([0, r]); trees.push([cols - 1, r]); }
      for (let c = 0; c < cols; c++) { trees.push([c, 0]); trees.push([c, rows - 1]); }
      actions.push({ type: 'SET_TERRAIN', terrain: 'forest', cells: trees });
      // huts as wall blocks with doors
      for (const [hx, hy] of [[2, 1], [9, 8], [12, 1]]) {
        const walls = [];
        for (let c = hx; c < hx + 3; c++) for (let r = hy; r < hy + 3; r++) walls.push([c, r]);
        actions.push({ type: 'SET_TERRAIN', terrain: 'wall', cells: walls });
        actions.push({ type: 'CREATE_DOOR', x: hx + 1, y: hy + 2, state: 'closed' });
      }
    } else {
      const g = carve(cols, rows, 4);
      floorCells = [...g.floor].map(k => k.split(',').map(Number));
      // walls ringing the floors
      const walls = new Set();
      for (const [c, r] of floorCells)
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
          const k = (c + dc) + ',' + (r + dr);
          if (!g.floor.has(k) && c + dc >= 0 && r + dr >= 0 && c + dc < cols && r + dr < rows) walls.add(k);
        }
      actions.push({ type: 'SET_TERRAIN', terrain: T.floor, cells: floorCells });
      actions.push({ type: 'SET_TERRAIN', terrain: 'wall', cells: [...walls].map(k => k.split(',').map(Number)) });
      // accent terrain patches
      if (T.accent && T.accent !== 'forest') {
        const acc = floorCells.filter(() => Math.random() < 0.06);
        if (acc.length) actions.push({ type: 'SET_TERRAIN', terrain: T.accent, cells: acc });
      }
      if (T.accent === 'forest') {
        const acc = floorCells.filter(() => Math.random() < 0.12);
        if (acc.length) actions.push({ type: 'SET_TERRAIN', terrain: 'forest', cells: acc });
      }
      // doors at corridor mouths (on floor, not wall)
      for (const [dc, dr] of g.doors) actions.push({ type: 'CREATE_DOOR', x: dc, y: dr, state: Math.random() < 0.3 ? 'locked' : 'closed' });
      // torches along walls
      const torchSpots = [...walls].slice(0, 60).filter(() => Math.random() < 0.14);
      for (const k of torchSpots) { const [c, r] = k.split(',').map(Number); actions.push({ type: 'CREATE_PROP', icon: '🕯️', x: c, y: r }); }
    }

    /* props */
    for (let i = 0; i < 6; i++) {
      const [c, r] = pick(floorCells);
      actions.push({ type: 'CREATE_PROP', icon: pick(T.props), x: c, y: r });
    }
    /* a loot item somewhere deep */
    { const [c, r] = pick(floorCells); actions.push({ type: 'CREATE_PROP', icon: '💎', name: 'Glittering gem', item: true, x: c, y: r }); }

    /* inhabitants */
    const hostiles = T.mobs.filter(m => m[4] !== 'friendly');
    const friendlies = T.mobs.filter(m => m[4] === 'friendly');
    for (const m of friendlies) {
      const [c, r] = pick(floorCells);
      actions.push({ type: 'SPAWN_UNIT', name: m[0], icon: 'assets/icons/' + m[1] + '.svg', hp: m[2], ac: m[3], stance: 'friendly', faction: 'folk', x: c, y: r });
    }
    for (const m of hostiles) {
      const [c, r] = pick(floorCells);
      actions.push({ type: 'SPAWN_UNIT', name: m[0], icon: 'assets/icons/' + m[1] + '.svg', hp: m[2], ac: m[3], stance: 'hostile', faction: type === 'village' ? 'wolves' : 'raiders', x: c, y: r });
    }

    /* fog: hide the world, reveal only around the party */
    actions.push({ type: 'SET_FOG', mode: 'hide', x: cols >> 1, y: rows >> 1, r: cols });
    for (const t of room.tokens.filter(x => x.owner !== 'dm')) {
      actions.push({ type: 'SET_FOG', mode: 'reveal', x: Math.floor(t.x), y: Math.floor(t.y), r: 3 });
    }
    return { actions, label: T.label, type };
  }

  TYPES.dungeon = TYPES.crypt;
  return { build, TYPES };
})();
