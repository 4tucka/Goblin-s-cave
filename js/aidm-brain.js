/* ============================================================
   AIDMBrain — the Dungeon Master's mind (local expert system).
   Parses player intent (RU/EN), plans tool calls, executes them
   through the validated engine, and narrates ONLY what truly
   happened. Swap this module for an LLM provider later — the
   engine contract (actions in, results out) stays the same.
   ============================================================ */
const AIDMBrain = (() => {
  const IC = 'assets/icons/';
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[rnd(0, a.length - 1)];

  /* ---------- narration (RU native, EN fallback) ---------- */
  const L = {
    ru: {
      sceneDone: 'Я сотворил {label}. Карта перед вами — но туман скрывает то, что вы ещё не видели.',
      sceneFail: 'Моя магия дала сбой: {err}',
      spawned: '{list} появляются в мире.',
      moved: '{name} перемещается.',
      moveFail: '{name} не может туда пройти ({err}).',
      doorOpen: 'Дверь со скрипом открывается.',
      doorLock: 'Замок щёлкает — дверь заперта.',
      doorBreak: 'Удар! Дверь разлетается в щепки.',
      doorFail: 'С дверью ничего не выходит: {err}',
      look: 'Вы осматриваетесь. {seen}',
      nothing: 'Видимого поблизости ничего нового.',
      atkHit: '{a} бьёт {d}: {roll} против AC — попадание, {dmg} урона!',
      atkCrit: 'КРИТ! {a} обрушивает на {d} {dmg} урона!',
      atkMiss: '{a} атакует {d} — {roll}, мимо!',
      atkDown: '💀 {d} падает без движения.',
      atkFail: 'Атака не удалась: {err}',
      roll: '🎲 {who} бросает {expr}: {total}.',
      combat: '⚔️ БОЙ! Инициатива: {order}.',
      combatEnd: 'Бой окончен. Мир затихает.',
      quest: '📜 Новый квест: «{title}» — {desc}',
      torch: 'Свет разгоняет тьму вокруг вас.',
      hidden: 'Туман сгущается, скрывая эти земли.',
      npcSays: '{npc}: «{line}»',
      enemyMoves: '{name} крадётся ближе…',
      greeting: 'Я — ваш Мастер Подземелий. Скажите «создай заброшенную шахту» или «таверну», и я сотворю сцену. Командуйте отрядом: «иду к двери», «атакую гоблина», «осмотреться», «бросаю 1d20».',
      fallback: 'Мир внимает вашим словам, но я не уверен в действии. Попробуйте: идти, атаковать, открыть дверь, осмотреться, создать сцену, бросить кубик.',
      cantSee: 'Вы не видите этого сквозь туман и стены.',
    },
    en: {
      sceneDone: 'I have forged {label}. The map is yours — though fog still hides what you have not seen.',
      sceneFail: 'My magic falters: {err}',
      spawned: '{list} enter the world.',
      moved: '{name} moves.',
      moveFail: '{name} cannot get there ({err}).',
      doorOpen: 'The door creaks open.',
      doorLock: 'The lock clicks — the door is sealed.',
      doorBreak: 'Crash! The door splinters apart.',
      doorFail: 'The door resists you: {err}',
      look: 'You look around. {seen}',
      nothing: 'Nothing new within sight.',
      atkHit: '{a} strikes {d}: {roll} vs AC — a hit, {dmg} damage!',
      atkCrit: 'CRITICAL! {a} devastates {d} for {dmg}!',
      atkMiss: '{a} swings at {d} — {roll}, a miss!',
      atkDown: '💀 {d} drops to the ground.',
      atkFail: 'The attack fails: {err}',
      roll: '🎲 {who} rolls {expr}: {total}.',
      combat: '⚔️ COMBAT! Initiative: {order}.',
      combatEnd: 'The fight is over. The world grows quiet.',
      quest: '📜 New quest: “{title}” — {desc}',
      torch: 'Light pushes back the dark around you.',
      hidden: 'Fog rolls in, swallowing the land.',
      npcSays: '{npc}: “{line}”',
      enemyMoves: '{name} creeps closer…',
      greeting: 'I am your Dungeon Master. Say “create an abandoned mine” or “a tavern” and I will forge the scene. Command your party: “go to the door”, “attack the goblin”, “look around”, “roll 1d20”.',
      fallback: 'The world listens, but I am unsure of the deed. Try: go, attack, open the door, look around, create a scene, roll a die.',
      cantSee: 'You cannot see that through fog and stone.',
    },
  };
  const t = (lang, k, vars) => {
    let s = (L[lang] && L[lang][k]) || L.en[k] || k;
    for (const [kk, v] of Object.entries(vars || {})) s = s.split('{' + kk + '}').join(v);
    return s;
  };

  /* ---------- helpers over the room ---------- */
  const myToken = ctx => ctx.room.tokens.find(x => x.owner !== 'dm' && x.playerId === ctx.me?.id)
    || ctx.room.tokens.find(x => x.owner !== 'dm') || null;
  const hostiles = r => r.tokens.filter(x => x.owner === 'dm' && x.stance !== 'friendly' && x.hp > 0);
  const findUnit = (r, word) => {
    if (!word) return null;
    return r.tokens.find(x => x.hp > 0 && x.name.toLowerCase().includes(word.toLowerCase())) || null;
  };
  const nearest = (r, from, list) => list
    .map(x => ({ x, d: Math.hypot(Math.floor(x.x) - Math.floor(from.x), Math.floor(y(x)) - Math.floor(from.y)) }))
    .sort((a, b) => a.d - b.d)[0]?.x;
  const y = x => x.y;

  const MOB_WORDS = [
    ['гоблин', 'goblin', 'goblin', 7, 13], ['wolf', 'волк', 'wolf', 11, 13], ['скелет', 'skeleton', 'skeleton', 13, 13],
    ['зомби', 'zombie', 'undead', 22, 8], ['орк', 'orc', 'orc', 15, 13], ['страж', 'guard', 'guard', 14, 14, 'friendly'],
    ['торгов', 'merchant', 'rogue', 10, 12, 'friendly'], ['дракон', 'dragon', 'dragon', 60, 17], ['разбойник', 'bandit', 'rogue', 9, 12],
    ['культист', 'cultist', 'cultist', 9, 12], ['призрак', 'ghost', 'ghost', 18, 11], ['огр', 'ogre', 'minotaur', 40, 11],
  ];

  const SCENE_WORDS = [
    ['шахт', 'mine', 'mine'], ['tavern', 'таверн', 'tavern'], ['склеп', 'crypt', 'crypt'], ['кладб', 'cemetery', 'crypt'],
    ['деревн', 'village', 'village'], ['village'], ['лагерь', 'camp', 'camp'], ['пещер', 'cave', 'cave'], ['подземел', 'dungeon', 'crypt'],
    ['mina', 'mine'], ['taberna', 'tavern', 'tavern'], ['taverne', 'tavern'], ['taverna', 'tavern'], ['cripta', 'crypt'], ['crypte', 'crypt'],
    ['krypta', 'crypt'], ['aldea', 'village'], ['dorf', 'village'], ['село', 'village'], ['campamento', 'camp'], ['lager', 'camp'],
    ['табір', 'camp'], ['cueva', 'cave'], ['grotte', 'cave'], ['höhle', 'cave'], ['печер', 'cave'], ['donjon', 'dungeon'], ['cria', 'village'],
  ];

  /* ---------- enemy turn AI ---------- */
  function enemyTurns(ctx, lines) {
    const r = ctx.room, lang = ctx.lang;
    const players = r.tokens.filter(x => x.owner !== 'dm' && x.hp > 0);
    if (!players.length) return;
    for (const e of hostiles(r)) {
      const tgt = nearest(r, e, players);
      if (!tgt) break;
      const dist = Math.hypot(Math.floor(e.x) - Math.floor(tgt.x), Math.floor(e.y) - Math.floor(tgt.y));
      if (dist > 1.5) {
        const step = Math.max(1, Math.min(e.speed || 6, Math.round(dist) - 1));
        const dir = { x: Math.floor(tgt.x), y: Math.floor(tgt.y) };
        const mv = AIDM.exec(r, { type: 'MOVE_UNIT', unitId: e.id, x: dir.x, y: dir.y });
        if (!mv.ok) { // try a shorter step
          const half = { x: Math.floor(e.x) + Math.sign(dir.x - Math.floor(e.x)) * Math.min(step, Math.abs(dir.x - Math.floor(e.x))),
                         y: Math.floor(e.y) + Math.sign(dir.y - Math.floor(e.y)) * Math.min(step, Math.abs(dir.y - Math.floor(e.y))) };
          AIDM.exec(r, { type: 'MOVE_UNIT', unitId: e.id, x: half.x, y: half.y });
        }
        lines.push(t(lang, 'enemyMoves', { name: e.name }));
      }
      const d2 = Math.hypot(Math.floor(e.x) - Math.floor(tgt.x), Math.floor(e.y) - Math.floor(tgt.y));
      if (d2 <= 1.6) {
        const res = AIDM.exec(r, { type: 'ATTACK', attackerId: e.id, targetId: tgt.id });
        if (res.ok && res.hit) lines.push(t(lang, res.crit ? 'atkCrit' : 'atkHit', { a: e.name, d: tgt.name, roll: res.roll, dmg: res.dmg }));
        else if (res.ok) lines.push(t(lang, 'atkMiss', { a: e.name, d: tgt.name, roll: res.roll }));
        if (res.ok && res.down) lines.push(t(lang, 'atkDown', { d: tgt.name }));
      }
    }
  }

  /* ---------- the think loop ---------- */
  function think(ctx, text) {
    const r = ctx.room, lang = ctx.lang || 'en';
    const s = String(text).toLowerCase();
    const me = myToken(ctx);
    const M = AIDM.mem(r);
    AIDM.remember(r, 'session', 'PLAYER: ' + text);
    const out = [], hidden = [];
    const run = actions => AIDM.execAll(r, actions);

    /* ----- scene creation ----- */
    const sceneHit = SCENE_WORDS.find(w => w.some(x => x && s.includes(x)));
    if (/(создай|сделай|построй|сгенерируй|make|create|build|generate|crée|crea|cria|erschaffe|створи|створ)/.test(s) && sceneHit) {
      const type = sceneHit[sceneHit.length - 1];
      const sc = AIDMScenes.build(r, type);
      const res = run(sc.actions);
      const errs = res.filter(x => !x.result.ok);
      M.scene = { type, label: sc.label, at: Date.now() };
      AIDM.remember(r, 'campaign', 'Scene forged: ' + sc.label);
      out.push(t(lang, 'sceneDone', { label: sc.label }));
      const spawned = res.filter(x => x.action.type === 'SPAWN_UNIT' && x.result.ok).map(x => x.result.unit.name);
      if (spawned.length) { out.push(t(lang, 'spawned', { list: spawned.join(', ') })); hidden.push('hostiles: ' + spawned.join(', ')); }
      if (errs.length) hidden.push('validation errors: ' + errs.map(e => e.result.error).join('; '));
      ctx.sys('🧙 ' + sc.label);
      return { narrative: out.join(' '), hidden };
    }

    /* ----- spawning ----- */
    const mobHit = MOB_WORDS.find(m => m.slice(0, 2).some(x => s.includes(x)));
    if (/(спавн|призов|появ|spawn|summon|add|добав)/.test(s) && mobHit) {
      const nMatch = s.match(/(\d+)/); const n = Math.min(nMatch ? +nMatch[1] : 1, 6);
      const actions = [];
      for (let i = 0; i < n; i++) {
        const c = rnd(1, r.map.cols - 2), rr = rnd(1, r.map.rows - 2);
        actions.push({ type: 'SPAWN_UNIT', name: cap(mobHit[2]) + (n > 1 ? ' ' + (i + 1) : ''), icon: IC + mobHit[2] + '.svg', hp: mobHit[3], ac: mobHit[4], stance: mobHit[5] || 'hostile', faction: mobHit[5] ? 'folk' : 'raiders', x: c, y: rr });
      }
      const res = run(actions);
      const ok = res.filter(x => x.result.ok).map(x => x.result.unit.name);
      const bad = res.filter(x => !x.result.ok);
      out.push(ok.length ? t(lang, 'spawned', { list: ok.join(', ') }) : t(lang, 'sceneFail', { err: bad[0]?.result.error }));
      AIDM.remember(r, 'session', 'Spawned: ' + ok.join(', '));
      return { narrative: out.join(' '), hidden };
    }

    /* ----- doors ----- */
    if (/(открой|open|запри|lock|выбей|break|взлом)/.test(s) && /(двер|door)/.test(s)) {
      const doors = (r.props || []).filter(p => p.door);
      const near = me ? doors.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0] : doors[0];
      if (!near) return { narrative: t(lang, 'doorFail', { err: 'no door in this world' }), hidden };
      let res;
      if (/(запри|lock)/.test(s)) res = AIDM.exec(r, { type: 'SET_DOOR', doorId: near.id, state: 'locked' });
      else if (/(выбей|break|взлом)/.test(s)) {
        const roll = AIDM.exec(r, { type: 'ROLL', expr: '1d20' });
        const strong = roll.result.roll.total >= 14;
        out.push(t(lang, 'roll', { who: me?.name || 'You', expr: '1d20', total: roll.result.roll.total }));
        if (!strong) return { narrative: out.join(' ') + ' ' + t(lang, 'doorFail', { err: lang === 'ru' ? 'слишком крепкая' : 'too sturdy' }), hidden };
        res = AIDM.exec(r, { type: 'SET_DOOR', doorId: near.id, state: 'destroyed' });
        AIDM.remember(r, 'session', 'Door smashed — noise will carry');
        AIDM.exec(r, { type: 'UPDATE_WORLD', flags: { noise: true }, note: 'A door was smashed; someone may have heard.' });
      } else res = AIDM.exec(r, { type: 'SET_DOOR', doorId: near.id, state: 'open' });
      if (!res.ok) return { narrative: t(lang, 'doorFail', { err: res.error }), hidden };
      out.push(res.door.state === 'open' ? t(lang, 'doorOpen') : res.door.state === 'locked' ? t(lang, 'doorLock') : t(lang, 'doorBreak'));
      return { narrative: out.join(' '), hidden };
    }

    /* ----- movement ----- */
    if (me && /(иду|идти|пойду|движ|move|go |walk|бегу|run)/.test(s + ' ')) {
      let target = null;
      const dirWords = [['север', 'north', 0, -1], ['юг', 'south', 0, 1], ['восток', 'east', 1, 0], ['запад', 'west', -1, 0]];
      const dw = dirWords.find(d => d.some(w => s.includes(w)));
      const propHit = (r.props || []).find(p => p.name && s.includes(p.name.toLowerCase()));
      if (propHit) target = { x: Math.floor(propHit.x), y: Math.floor(propHit.y) };
      else if (dw) target = { x: Math.floor(me.x) + dw[2] * 3, y: Math.floor(me.y) + dw[3] * 3 };
      else if (/(двер|door)/.test(s)) {
        const near = (r.props || []).filter(p => p.door).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (near) target = { x: Math.floor(near.x), y: Math.floor(near.y) };
      }
      if (!target) return { narrative: t(lang, 'fallback'), hidden };
      target.x = Math.max(0, Math.min(r.map.cols - 1, target.x));
      target.y = Math.max(0, Math.min(r.map.rows - 1, target.y));
      const res = AIDM.exec(r, { type: 'MOVE_UNIT', unitId: me.id, x: target.x, y: target.y });
      if (res.ok) {
        out.push(t(lang, 'moved', { name: me.name }));
        AIDM.exec(r, { type: 'SET_FOG', mode: 'reveal', x: target.x, y: target.y, r: 3 });
      } else out.push(t(lang, 'moveFail', { name: me.name, err: res.error }));
      return { narrative: out.join(' '), hidden };
    }

    /* ----- look / search ----- */
    if (/(осмотр|огляд|look|search|обыск|развед|olhar|mirar|regarder|umsehen|озирн)/.test(s) && me) {
      AIDM.exec(r, { type: 'SET_FOG', mode: 'reveal', x: Math.floor(me.x), y: Math.floor(me.y), r: 3 });
      const seen = [];
      for (const x of r.tokens) {
        if (x.id === me.id) continue;
        if (Math.hypot(x.x - me.x, x.y - me.y) <= 6 && AIDM.los(r, me, x)) seen.push(x.name);
      }
      for (const p of r.props || []) {
        if (Math.hypot(p.x - me.x, p.y - me.y) <= 5 && AIDM.los(r, me, p)) seen.push(p.name || p.icon);
      }
      out.push(t(lang, 'look', { seen: seen.length ? seen.join(', ') : t(lang, 'nothing') }));
      AIDM.remember(r, 'session', 'Scouted at ' + Math.floor(me.x) + ',' + Math.floor(me.y));
      return { narrative: out.join(' '), hidden };
    }

    /* ----- attack ----- */
    if (/(атаку|атак|attack|бью|удар|стреля|shoot|strike|atacar|attaquer|greife)/.test(s) && me) {
      if (!r.combat || !r.initiative.length) { const c = AIDM.exec(r, { type: 'START_COMBAT' }); if (c.ok) out.push(t(lang, 'combat', { order: c.order.join(' → ') })); }
      let target = null;
      for (const m of MOB_WORDS) { const u = findUnit(r, m[2]); if (u && m.slice(0, 2).some(w => s.includes(w))) { target = u; break; } }
      target = target || nearest(r, me, hostiles(r));
      if (!target) return { narrative: t(lang, 'atkFail', { err: lang === 'ru' ? 'цели не видно' : 'no target in sight' }), hidden };
      if (!AIDM.los(r, me, target)) return { narrative: t(lang, 'cantSee'), hidden };
      const dist = Math.hypot(Math.floor(me.x) - Math.floor(target.x), Math.floor(me.y) - Math.floor(target.y));
      if (dist > 1.6) {
        const mv = AIDM.exec(r, { type: 'MOVE_UNIT', unitId: me.id, x: Math.floor(target.x) + (Math.floor(me.x) > Math.floor(target.x) ? 1 : -1), y: Math.floor(target.y) });
        if (mv.ok) out.push(t(lang, 'moved', { name: me.name }));
      }
      const res = AIDM.exec(r, { type: 'ATTACK', attackerId: me.id, targetId: target.id });
      if (!res.ok) out.push(t(lang, 'atkFail', { err: res.error }));
      else if (res.hit) {
        out.push(t(lang, res.crit ? 'atkCrit' : 'atkHit', { a: me.name, d: target.name, roll: res.roll, dmg: res.dmg }));
        if (res.down) {
          out.push(t(lang, 'atkDown', { d: target.name }));
          AIDM.exec(r, { type: 'UPDATE_WORLD', flags: { ['killed_' + target.faction]: true }, note: target.name + ' was slain.' });
          if (target.faction) hidden.push('faction ' + target.faction + ' will remember this');
        }
      } else out.push(t(lang, 'atkMiss', { a: me.name, d: target.name, roll: res.roll }));
      enemyTurns(ctx, out);
      return { narrative: out.join(' '), hidden };
    }

    /* ----- torch / reveal ----- */
    if (/(факел|torch|освет|light|reveal|покажи|tocha|antorcha|torche|fackel|смолоскип)/.test(s) && me) {
      AIDM.exec(r, { type: 'SET_FOG', mode: 'reveal', x: Math.floor(me.x), y: Math.floor(me.y), r: 4 });
      return { narrative: t(lang, 'torch'), hidden };
    }
    if (/(спрячь|hide|туман|fog)/.test(s) && me) {
      AIDM.exec(r, { type: 'SET_FOG', mode: 'hide', x: Math.floor(me.x), y: Math.floor(me.y), r: 3 });
      return { narrative: t(lang, 'hidden'), hidden };
    }

    /* ----- dice ----- */
    const dm = s.match(/(\d*d\d+(?:\s*[+-]\s*\d+)?)/);
    if (/(брос|roll|куб|dice|rolar|tirar|lancer|würfle|würfle|кинути)/.test(s) || dm) {
      const res = AIDM.exec(r, { type: 'ROLL', expr: dm ? dm[1].replace(/\s/g, '') : '1d20', adv: /преим|adv/.test(s) ? 'adv' : /помех|dis/.test(s) ? 'dis' : null });
      if (!res.ok) return { narrative: t(lang, 'fallback'), hidden };
      ctx.pushRoll && ctx.pushRoll(res.roll);
      return { narrative: t(lang, 'roll', { who: me?.name || 'You', expr: res.roll.expr, total: res.roll.total }), hidden };
    }

    /* ----- combat ----- */
    if (/(начать бой|start combat|бой!|initiative|инициатив)/.test(s)) {
      const res = AIDM.exec(r, { type: 'START_COMBAT' });
      return { narrative: res.ok ? t(lang, 'combat', { order: res.order.join(' → ') }) : t(lang, 'fallback'), hidden };
    }

    /* ----- quest ----- */
    if (/(квест|quest|задан)/.test(s)) {
      const qs = lang === 'ru'
        ? [['Тень над шахтой', 'Гоблины снова зажгли огни в заброшенной шахте. Выясни, кто их ведёт.'], ['Пропавший торговец', 'Тобо не вернулся из crypt. Найди его — живым, если получится.']]
        : [['Shadow over the Mine', 'Goblins have relit their fires in the abandoned mine. Find out who leads them.'], ['The Missing Merchant', 'Tobo never returned from the crypt. Find him — alive, if possible.']];
      const q = pick(qs);
      const res = AIDM.exec(r, { type: 'CREATE_QUEST', title: q[0], desc: q[1] });
      return { narrative: t(lang, 'quest', { title: q[0], desc: q[1] }) + (res.ok ? '' : ' (' + res.error + ')'), hidden };
    }

    /* ----- talk to an NPC ----- */
    const npc = r.tokens.find(x => x.owner === 'dm' && s.includes(x.name.toLowerCase().split(' ')[0].toLowerCase()));
    if (npc && /(говор|скаж|спрос|talk|ask|say|торг|buy|куп)/.test(s)) {
      const meta = M.npc[npc.id] || (M.npc[npc.id] = { attitude: npc.stance === 'friendly' ? 60 : 30, memory: [] });
      meta.memory.push(text);
      const kind = /(торг|buy|куп|sell)/.test(s) && /merchant|торгов/i.test(npc.name);
      const line = kind
        ? (lang === 'ru' ? 'Для тебя — половина цены. Но страже я о тебе расскажу, если обманешь.' : 'For you — half price. But cheat me, and I tell the guards about you.')
        : meta.attitude > 50
          ? (lang === 'ru' ? 'Слухи нынче тревожные: огни на юге, и волки воют ближе к стенам.' : 'Troubling rumors: fires to the south, and wolves howling closer to the walls.')
          : (lang === 'ru' ? 'Мне нечего сказать чужакам.' : 'I have nothing for strangers.');
      AIDM.remember(r, 'session', npc.name + ' spoke with the party');
      return { narrative: t(lang, 'npcSays', { npc: npc.name, line }), hidden };
    }

    /* ----- greeting / fallback ----- */
    if (/(привет|hello|hi |кто ты|who are)/.test(s)) return { narrative: t(lang, 'greeting'), hidden };
    AIDM.remember(r, 'session', 'unparsed: ' + text);
    return { narrative: t(lang, 'fallback'), hidden };
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return { think, enemyTurns, greet: lang => t(lang, 'greeting') };
})();
