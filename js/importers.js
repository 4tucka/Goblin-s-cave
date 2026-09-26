/* importers.js — import characters from other sites' exports.
   Auto-detects D&D Beyond JSON, 5e.tools JSON, fastcharacter.com JSON,
   character-keeper sheets and most generic JSON formats, and tries URL fetches. */
const CharImport = (() => {
  const CLASSES = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard','Artificer','Blood Hunter'];
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABIL_KEYS = { str: ['str', 'strength'], dex: ['dex', 'dexterity'], con: ['con', 'constitution'], int: ['int', 'intelligence'], wis: ['wis', 'wisdom'], cha: ['cha', 'charisma'] };

  /* breadth-first search for the first matching key anywhere in the object tree */
  function deepFind(o, keys, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 6) return undefined;
    if (Array.isArray(o)) {
      for (const item of o) { const r = deepFind(item, keys, depth + 1); if (r !== undefined) return r; }
      return undefined;
    }
    for (const k of Object.keys(o)) {
      const lk = k.toLowerCase();
      if (keys.some(key => lk === key)) return o[k];
    }
    for (const k of Object.keys(o)) {
      const r = deepFind(o[k], keys, depth + 1);
      if (r !== undefined) return r;
    }
    return undefined;
  }

  function num(v, d = 0) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
    if (v && typeof v === 'object') return num(v.value ?? v.total ?? v.score ?? v.mod ?? v.base, d);
    return d;
  }

  function pickClass(o) {
    const c = deepFind(o, ['classes', 'class', 'classname', 'class_name']);
    if (Array.isArray(c)) {
      return c.map(x => (typeof x === 'string' ? x : `${x.name || ''}${x.level ? ' ' + x.level : ''}`.trim())).filter(Boolean).join(' / ') || 'Fighter';
    }
    if (typeof c === 'string' && c) return c;
    if (c && typeof c === 'object' && c.name) return c.name;
    return 'Fighter';
  }

  function pickAbilities(o) {
    const out = {};
    const block = deepFind(o, ['abilities', 'abilityscores', 'ability_scores', 'attributes', 'stats', 'scores', 'abilitymods']);
    const src = (block && typeof block === 'object') ? block : o;
    for (const a of ABIL) {
      let v = undefined;
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        for (const key of ABIL_KEYS[a]) {
          for (const k of Object.keys(src)) {
            if (k.toLowerCase() === key || k.toLowerCase().startsWith(key)) { v = num(src[k], 10); break; }
          }
          if (v !== undefined) break;
        }
      }
      if (v === undefined) v = deepFind(o, ABIL_KEYS[a]) !== undefined ? num(deepFind(o, ABIL_KEYS[a]), 10) : 10;
      out[a] = clamp(v, 1, 30);
    }
    return out;
  }

  function pickAttacks(o) {
    const list = deepFind(o, ['attacks', 'actions', 'attackslist']);
    if (!Array.isArray(list)) return '';
    return list.slice(0, 8).map(a => {
      if (typeof a === 'string') return a;
      const name = a.name || a.weapon || 'Attack';
      const bonus = a.attackBonus ?? a.toHit ?? a.bonus ?? '';
      const dmg = a.damage ?? a.damageDice ?? a.damageText ?? '';
      const type = a.damageType || a.type || '';
      return `${name}${bonus !== '' ? ' +' + num(bonus) : ''}${dmg ? ' — ' + (typeof dmg === 'string' ? dmg : `${dmg.dice || ''}${dmg.value ?? ''}`) : ''}${type ? ' ' + type : ''}`.trim();
    }).filter(Boolean).join('\n');
  }

  function pickSpells(o) {
    const list = deepFind(o, ['spells', 'spelllist', 'knownspells']);
    if (!Array.isArray(list)) return '';
    return list.slice(0, 40).map(s => typeof s === 'string' ? s : (s.name || '')).filter(Boolean).join(', ');
  }

  function pickInventory(o) {
    const list = deepFind(o, ['inventory', 'items', 'equipment', 'gear']);
    if (!Array.isArray(list)) return '';
    return list.slice(0, 40).map(i => typeof i === 'string' ? i :
      `${i.name || ''}${(i.quantity || i.qty) > 1 ? ' ×' + (i.quantity || i.qty) : ''}`).filter(Boolean).join('\n');
  }

  function pickSkills(o) {
    const skills = {};
    const block = deepFind(o, ['skills', 'skillproficiencies', 'skillmodifiers']);
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      for (const k of Object.keys(block)) {
        const v = block[k];
        const prof = (v && typeof v === 'object') ? !!(v.proficient || v.proficiency || v.expertise || v.expert) : !!v;
        if (prof) skills[k.toLowerCase()] = 'prof';
      }
    } else if (Array.isArray(block)) {
      block.forEach(s => { if (s && s.name) skills[String(s.name).toLowerCase()] = 'prof'; else if (typeof s === 'string') skills[s.toLowerCase()] = 'prof'; });
    }
    return skills;
  }

  /* main normalizer: any character-ish JSON -> our character card shape */
  function normalize(o) {
    if (typeof o === 'string') o = JSON.parse(o);
    if (!o || typeof o !== 'object') throw new Error('no object');
    const abilities = pickAbilities(o);
    const cls = pickClass(o);
    const level = clamp(num(deepFind(o, ['level', 'characterlevel']), 1), 1, 20);
    const maxHp = num(deepFind(o, ['maxhitpoints', 'maxhp', 'hitpoints', 'hp', 'health']), 10);
    const ch = {
      name: String(deepFind(o, ['name', 'charactername', 'character_name']) || 'Imported Hero').slice(0, 48),
      cls: CLASSES.find(c => cls.toLowerCase().includes(c.toLowerCase())) || (cls || 'Fighter'),
      level,
      race: String(deepFind(o, ['race', 'races', 'species']) || (Array.isArray(deepFind(o, ['races'])) ? '' : '')) || '',
      background: String(deepFind(o, ['background']) || '') || '',
      alignment: String(deepFind(o, ['alignment']) || '') || '',
      maxHp, hp: maxHp,
      ac: num(deepFind(o, ['ac', 'armorclass', 'armor_class']), 10 + Math.floor((abilities.dex - 10) / 2)),
      speed: num(deepFind(o, ['speed', 'walk', 'movespeed']), 30),
      abilities,
      saves: {}, skills: pickSkills(o),
      attacks: pickAttacks(o),
      spellsKnown: pickSpells(o),
      spellAbility: 'int',
      spellSlots: {},
      inventory: pickInventory(o),
      features: String(deepFind(o, ['features', 'feats', 'traits', 'abilities_text']) || '') || '',
      notes: String(deepFind(o, ['backstory', 'background_text', 'description', 'bio']) || '') || '',
      tokenEmoji: '🧝', tokenImg: null,
      tempHp: 0,
    };
    if (Array.isArray(deepFind(o, ['races']))) {
      const r = deepFind(o, ['races']);
      ch.race = r.map(x => typeof x === 'string' ? x : x.name).filter(Boolean).join(' / ');
    }
    return ch;
  }

  async function fromURL(url) {
    let res;
    try { res = await fetch(url, { mode: 'cors' }); }
    catch {
      return { error: 'That site blocks direct browser fetches (CORS). Download its JSON export and upload it here instead — I auto-detect the format.' };
    }
    if (!res.ok) return { error: `The site answered ${res.status}. Try downloading its JSON export and uploading it.` };
    const text = await res.text();
    try { return { char: normalize(JSON.parse(text)) }; }
    catch {
      if (/^\s*</.test(text)) return { error: 'That link returns an HTML page, not data. Export/download the character as JSON from that site, then upload it here.' };
      return { error: 'The response was not valid JSON character data.' };
    }
  }

  return { normalize, fromURL, CLASSES };
})();
