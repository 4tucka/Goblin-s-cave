/* adventures.js — quick-start one-shot templates (map + NPCs + atmosphere pre-forged) */
const ADVENTURES = {

  /* ------------------------------------------------ Goblin Ambush */
  'goblin-ambush': {
    icon: 'assets/icons/goblin.svg', cover: 'assets/map-cave.jpg',
    nameKey: 'adv_ambush_n', descKey: 'adv_ambush_d', lvl: '1–2', foes: 6,
    build() {
      const IC = 'assets/icons/';
      const npcs = [
        { id: uid(), name: 'Goblin Scout', type: 'Goblin', hp: 7, maxHp: 7, ac: 13, icon: IC + 'goblin.svg', atk: 'Scimitar +4 — 1d6+2 slashing', stance: 'hostile' },
        { id: uid(), name: 'Goblin Scout', type: 'Goblin', hp: 7, maxHp: 7, ac: 13, icon: IC + 'goblin.svg', atk: 'Scimitar +4 — 1d6+2 slashing', stance: 'hostile' },
        { id: uid(), name: 'Snagg the Archer', type: 'Goblin', hp: 7, maxHp: 7, ac: 13, icon: IC + 'archer.svg', atk: 'Shortbow +4 — 1d6+2 piercing', stance: 'hostile' },
        { id: uid(), name: 'Grizzak Fang', type: 'Hobgoblin', hp: 11, maxHp: 11, ac: 18, icon: IC + 'guard.svg', atk: 'Longsword +3 — 1d8+1 slashing', stance: 'hostile' },
        { id: uid(), name: 'Cave Wolf', type: 'Wolf', hp: 11, maxHp: 11, ac: 13, icon: IC + 'wolf.svg', atk: 'Bite +4 — 2d4+2 piercing', stance: 'hostile' },
        { id: uid(), name: 'Cave Wolf', type: 'Wolf', hp: 11, maxHp: 11, ac: 13, icon: IC + 'wolf.svg', atk: 'Bite +4 — 2d4+2 piercing', stance: 'hostile' },
      ];
      const tok = (npc, col, row) => ({
        id: uid(), npcId: npc.id, name: npc.name, icon: npc.icon, img: null, color: '#4a2018',
        owner: 'dm', hp: npc.maxHp, maxHp: npc.maxHp, ac: npc.ac, atk: npc.atk, stance: npc.stance, size: 1,
        x: col + 0.5, y: row + 0.5,
      });
      const terrain = {};
      const sand = 'rgba(214,183,110,.5)', wall = 'rgba(40,36,32,.85)', swamp = 'rgba(88,100,45,.6)';
      // winding path of loose sand
      for (let c = 2; c <= 13; c++) terrain[c + ',6'] = sand;
      for (let c = 4; c <= 9; c++) terrain[c + ',5'] = sand;
      // boulder field north-west
      for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) terrain[c + ',' + r] = wall;
      // stagnant pool
      terrain['2,9'] = swamp; terrain['3,9'] = swamp; terrain['2,10'] = swamp;
      const fog = new Set();
      for (let c = 12; c <= 15; c++) for (let r = 0; r <= 11; r++) fog.add(c + ',' + r);
      const props = [
        { id: uid(), icon: '🔥', name: 'Dead campfire', x: 8.5, y: 7.5, scale: 1 },
        { id: uid(), icon: '📦', name: 'Ransacked wagon', x: 9.5, y: 7.5, scale: 1 },
        { id: uid(), icon: '🪨', name: '', x: 4.5, y: 2.5, scale: 1 },
        { id: uid(), icon: '🪨', name: '', x: 13.5, y: 3.5, scale: 1 },
        { id: uid(), icon: '🪨', name: '', x: 12.5, y: 9.5, scale: 1 },
        { id: uid(), icon: '🕯️', name: '', x: 7.5, y: 4.5, scale: 0.7 },
      ];
      return {
        name: 'Goblin Ambush',
        map: { kind: 'template', src: 'assets/map-cave.jpg', cols: 16, rows: 12, cs: 48, grid: 'square' },
        terrain, fog: [...fog], npcs, props, walls: [],
        labels: [{ id: uid(), text: 'Ambush Point', x: 8, y: 3.4, size: 0.42 }],
        tokens: [
          tok(npcs[0], 10, 4), tok(npcs[1], 12, 7), tok(npcs[2], 14, 2),
          tok(npcs[3], 13, 5), tok(npcs[4], 2, 1), tok(npcs[5], 13, 10),
        ],
        audio: { kind: 'synth', id: 'cave', name: '💧 Cathedral Cave', url: '' },
      };
    },
  },

  /* ------------------------------------------------ The Cursed Crypt */
  'cursed-crypt': {
    icon: 'assets/icons/reaper.svg', cover: 'assets/map-dungeon.jpg',
    nameKey: 'adv_crypt_n', descKey: 'adv_crypt_d', lvl: '2–3', foes: 6,
    build() {
      const IC = 'assets/icons/';
      const npcs = [
        { id: uid(), name: 'Skeletal Warden', type: 'Skeleton', hp: 13, maxHp: 13, ac: 13, icon: IC + 'skeleton.svg', atk: 'Shortsword +4 — 1d6+2 piercing', stance: 'hostile' },
        { id: uid(), name: 'Rattling Skeleton', type: 'Skeleton', hp: 13, maxHp: 13, ac: 13, icon: IC + 'skeleton.svg', atk: 'Shortsword +4 — 1d6+2 piercing', stance: 'hostile' },
        { id: uid(), name: 'Rattling Skeleton', type: 'Skeleton', hp: 13, maxHp: 13, ac: 13, icon: IC + 'skeleton.svg', atk: 'Shortsword +4 — 1d6+2 piercing', stance: 'hostile' },
        { id: uid(), name: 'Rotting Zombie', type: 'Zombie', hp: 22, maxHp: 22, ac: 8, icon: IC + 'undead.svg', atk: 'Slam +3 — 1d6+1 bludgeoning', stance: 'hostile' },
        { id: uid(), name: 'The Restless One', type: 'Ghost', hp: 22, maxHp: 22, ac: 11, icon: IC + 'ghost.svg', atk: 'Chill touch +4 — 2d6 cold', stance: 'hostile' },
        { id: uid(), name: 'Crypt Cultist', type: 'Cultist', hp: 9, maxHp: 9, ac: 12, icon: IC + 'cultist.svg', atk: 'Scimitar +3 — 1d6+1 slashing', stance: 'hostile' },
      ];
      const tok = (npc, col, row) => ({
        id: uid(), npcId: npc.id, name: npc.name, icon: npc.icon, img: null, color: '#3c2438',
        owner: 'dm', hp: npc.maxHp, maxHp: npc.maxHp, ac: npc.ac, atk: npc.atk, stance: npc.stance, size: 1,
        x: col + 0.5, y: row + 0.5,
      });
      const wall = 'rgba(40,36,32,.85)', rubble = 'rgba(140,130,115,.55)';
      const terrain = {};
      // collapsed rubble in corners
      for (const [c, r] of [[1, 1], [2, 1], [1, 2], [14, 10], [13, 10], [14, 9]]) terrain[c + ',' + r] = rubble;
      // sealed sanctum floor
      for (let c = 11; c <= 14; c++) for (let r = 1; r <= 4; r++) terrain[c + ',' + r] = wall;
      const fog = new Set();
      for (let c = 10; c <= 15; c++) for (let r = 0; r <= 5; r++) fog.add(c + ',' + r);
      const props = [
        { id: uid(), icon: '🗿', name: 'Ancient sarcophagus', x: 12.5, y: 2.5, scale: 1.2 },
        { id: uid(), icon: '🕯️', name: '', x: 5.5, y: 5.5, scale: 0.7 },
        { id: uid(), icon: '🕯️', name: '', x: 8.5, y: 8.5, scale: 0.7 },
        { id: uid(), icon: '💎', name: 'Grave offering', x: 13.5, y: 3.5, scale: 0.8 },
        { id: uid(), icon: '🕸️', name: '', x: 1.5, y: 10.5, scale: 1 },
        { id: uid(), icon: '🕸️', name: '', x: 14.5, y: 0.5, scale: 1 },
        { id: uid(), icon: '📦', name: 'Tomb chest', x: 3.5, y: 9.5, scale: 1 },
      ];
      const walls = [
        // hall dividers with door gaps
        { id: uid(), x1: 0, y1: 4, x2: 5, y2: 4, w: 0.18 },
        { id: uid(), x1: 7, y1: 4, x2: 10, y2: 4, w: 0.18 },
        { id: uid(), x1: 10, y1: 0, x2: 10, y2: 2, w: 0.18 },
        { id: uid(), x1: 10, y1: 3.5, x2: 10, y2: 6, w: 0.18 },
        { id: uid(), x1: 3, y1: 8, x2: 3, y2: 12, w: 0.18 },
      ];
      return {
        name: 'The Cursed Crypt',
        map: { kind: 'template', src: 'assets/map-dungeon.jpg', cols: 16, rows: 12, cs: 48, grid: 'square' },
        terrain, fog: [...fog], npcs, props, walls,
        labels: [
          { id: uid(), text: 'The Sunken Halls', x: 5, y: 6.6, size: 0.4 },
          { id: uid(), text: 'Sealed Sanctum', x: 12.5, y: 0.8, size: 0.34 },
        ],
        tokens: [
          tok(npcs[0], 6, 2), tok(npcs[1], 4, 6), tok(npcs[2], 8, 5),
          tok(npcs[3], 2, 8), tok(npcs[4], 12, 2), tok(npcs[5], 11, 7),
        ],
        audio: { kind: 'synth', id: 'rain', name: '🌧️ Dungeon Rain', url: '' },
      };
    },
  },

  /* ------------------------------------------------ Tavern Brawl */
  'tavern-brawl': {
    icon: 'assets/icons/candles.svg', cover: 'assets/map-tavern.jpg',
    nameKey: 'adv_tavern_n', descKey: 'adv_tavern_d', lvl: '1', foes: 3,
    build() {
      const IC = 'assets/icons/';
      const npcs = [
        { id: uid(), name: 'Bouncer Krag', type: 'Ogre', hp: 59, maxHp: 59, ac: 11, icon: IC + 'minotaur.svg', atk: 'Greatclub +6 — 2d8+4 bludgeoning', stance: 'hostile' },
        { id: uid(), name: 'Drunken Brawler', type: 'Custom', hp: 10, maxHp: 10, ac: 12, icon: IC + 'barbarian.svg', atk: 'Barstool +2 — 1d4 bludgeoning', stance: 'hostile' },
        { id: uid(), name: 'Drunken Brawler', type: 'Custom', hp: 10, maxHp: 10, ac: 12, icon: IC + 'rogue.svg', atk: 'Tankard +2 — 1d4 bludgeoning', stance: 'hostile' },
        { id: uid(), name: 'Innkeeper Bram', type: 'Custom', hp: 12, maxHp: 12, ac: 12, icon: IC + 'knight.svg', atk: 'Broom +1 — 1d4 bludgeoning', stance: 'friendly' },
        { id: uid(), name: 'Whiskers, the Inn Cat', type: 'Custom', hp: 3, maxHp: 3, ac: 12, icon: IC + 'cat.svg', atk: 'Judgemental stare — psychic', stance: 'friendly' },
      ];
      const tok = (npc, col, row) => ({
        id: uid(), npcId: npc.id, name: npc.name, icon: npc.icon, img: null,
        color: npc.stance === 'friendly' ? '#2c3a24' : '#4a2018',
        owner: 'dm', hp: npc.maxHp, maxHp: npc.maxHp, ac: npc.ac, atk: npc.atk, stance: npc.stance, size: 1,
        x: col + 0.5, y: row + 0.5,
      });
      const wall = 'rgba(40,36,32,.85)', sand = 'rgba(214,183,110,.5)';
      const terrain = {};
      // bar counter + back wall
      for (let c = 2; c <= 7; c++) terrain[c + ',2'] = wall;
      for (let c = 10; c <= 13; c++) for (let r = 8; r <= 9; r++) terrain[c + ',' + r] = sand;
      const props = [
        { id: uid(), icon: '🔥', name: 'Hearth', x: 0.5, y: 5.5, scale: 1.2 },
        { id: uid(), icon: '🍺', name: '', x: 3.5, y: 4.5, scale: 0.8 },
        { id: uid(), icon: '🍺', name: '', x: 6.5, y: 6.5, scale: 0.8 },
        { id: uid(), icon: '🍺', name: '', x: 11.5, y: 8.5, scale: 0.8 },
        { id: uid(), icon: '🛢️', name: 'Ale barrels', x: 14.5, y: 1.5, scale: 1 },
        { id: uid(), icon: '🕯️', name: '', x: 8.5, y: 3.5, scale: 0.7 },
        { id: uid(), icon: '📦', name: 'Lost cargo', x: 1.5, y: 10.5, scale: 1 },
      ];
      return {
        name: 'Tavern Brawl at the Rusty Flagon',
        map: { kind: 'template', src: 'assets/map-tavern.jpg', cols: 16, rows: 12, cs: 48, grid: 'square' },
        terrain, fog: [], npcs, props, walls: [],
        labels: [{ id: uid(), text: 'The Rusty Flagon', x: 8, y: 1.1, size: 0.42 }],
        tokens: [
          tok(npcs[0], 12, 3), tok(npcs[1], 5, 6), tok(npcs[2], 9, 7),
          tok(npcs[3], 4, 1), tok(npcs[4], 15, 10),
        ],
        audio: { kind: 'synth', id: 'tavern', name: '🍺 Hearthside Inn', url: '' },
      };
    },
  },
};

const ADVENTURE_LIST = ['goblin-ambush', 'cursed-crypt', 'tavern-brawl'];
