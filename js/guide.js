/* guide.js — "The Goblin Guide": floating assistant with 5e knowledge,
   site navigation help and DM generators. Runs fully local. */
const Guide = (() => {
  /* ---------------- 5e rules knowledge base (SRD) ---------------- */
  const RULES = [
    { k: ['grapple', 'grappling', 'grab'], a:
`<b>Grappling (5e)</b>
• Use the <b>Attack action</b> to make a special melee attack: your <b>Strength (Athletics)</b> check vs the target's Strength (Athletics) or Dexterity (Acrobatics) — target chooses.
• The target must be no more than one size larger than you and within reach.
• On success, the target's speed becomes <b>0</b>. You can drag/carry it, but your speed is halved unless it's two sizes smaller.
• <b>Escaping:</b> the grappled creature uses its action to repeat the contest.
• Conditions that end the grapple: you're incapacitated, or something moves you out of reach (e.g., thunderwave).` },
    { k: ['counterspell'], a:
`<b>Counterspell</b> — 3rd-level abjuration, reaction, 60 ft, Somatic + Verbal components.
• When a creature within 60 ft casts a spell, you attempt to interrupt it.
• If the spell is <b>3rd level or lower</b>, it fails automatically.
• If higher, make an <b>ability check</b> with your spellcasting modifier, DC = 10 + spell's level. On a success, the spell is countered.
• At Higher Levels: casting with a slot of 4th+ automatically counters spells of that level or lower.` },
    { k: ['sneak attack'], a:
`<b>Sneak Attack</b> (Rogue)
• Once per turn, extra damage when you hit with a finesse/ranged weapon and have <b>advantage</b>.
• No advantage needed if an ally is within 5 ft of the target and you don't have disadvantage.
• Damage: 1d6 at level 1, scaling to 10d6 at level 19 (rogue level).` },
    { k: ['death save', 'death saving', 'death saves', 'dying', 'unconscious', 'stabilize'], a:
`<b>Death Saving Throws</b>
• At the start of your turn while at 0 HP, roll a d20: 10+ is a success, 9 or lower a failure.
• <b>3 successes:</b> you stabilize. <b>3 failures:</b> you die. Rolling a 1 counts as two failures; a natural 20 restores 1 HP.
• Any damage while at 0 HP = 1 failure; a critical hit = 2 failures.
• Healing of any kind restores you immediately.` },
    { k: ['cover', 'half cover', 'three-quarters'], a:
`<b>Cover (5e)</b>
• <b>Half cover:</b> +2 AC and Dex saves (low wall, furniture, a creature).
• <b>Three-quarters cover:</b> +5 AC and Dex saves (portcullis, arrow slit).
• <b>Total cover:</b> can't be targeted directly by attacks or spells.` },
    { k: ['surprise', 'surprised'], a:
`<b>Surprise</b>
• On ambush, the DM compares Stealth checks to passive Perception. Anyone who doesn't notice a threat is <b>surprised</b>.
• A surprised creature can't move or act on its first turn and can't take reactions until that turn ends.` },
    { k: ['dash', 'dodge', 'disengage', 'action options'], a:
`<b>Combat Action Options</b>
• <b>Dash:</b> gain extra movement equal to your speed.
• <b>Disengage:</b> your movement doesn't provoke opportunity attacks this turn.
• <b>Dodge:</b> attacks against you have disadvantage until your next turn; you keep Dex saves.
• Also: Ready, Help, Hide, Search, Use an Object, Shove/Grapple (via Attack).` },
    { k: ['opportunity attack'], a:
`<b>Opportunity Attacks</b>
• Triggered when a hostile creature you can see <b>moves out of your reach</b>.
• Uses your <b>reaction</b>, one melee attack against it.
• Doesn't trigger on teleporting or forced movement; avoid with Disengage.` },
    { k: ['long rest', 'short rest'], a:
`<b>Resting</b>
• <b>Short rest (1h):</b> spend Hit Dice to heal; some class features recharge.
• <b>Long rest (8h):</b> restore all HP, regain spent Hit Dice (up to half max), reset long-rest resources. One per 24h (usually).` },
    { k: ['ability check', 'skill check', 'proficiency bonus', 'dc'], a:
`<b>Ability Checks</b>
• d20 + ability modifier (+ proficiency if trained) vs a DC.
• Typical DCs: 5 Very Easy, 10 Easy, 15 Medium, 20 Hard, 25 Very Hard, 30 Nearly Impossible.
• Proficiency bonus by level: +2 (1–4), +3 (5–8), +4 (9–12), +5 (13–16), +6 (17–20).` },
    { k: ['advantage', 'disadvantage'], a:
`<b>Advantage / Disadvantage</b>
• Roll 2d20 and take the higher (advantage) or lower (disadvantage) result.
• Multiple sources don't stack; advantage and disadvantage cancel out, leaving a straight roll.` },
    { k: ['conditions', 'blinded', 'frightened', 'poisoned', 'stunned', 'prone'], a:
`<b>Common Conditions</b>
• <b>Blinded:</b> auto-fails sight checks; attacks vs you have advantage, yours have disadvantage.
• <b>Frightened:</b> disadvantage on checks/attacks while source visible; can't move toward it.
• <b>Prone:</b> disadvantage on attacks; melee hits vs you have advantage, ranged hits disadvantage.
• <b>Stunned:</b> incapacitated, can't move, speaks falteringly; attacks vs you have advantage, your Dex/Str saves fail.
• <b>Poisoned:</b> disadvantage on attack rolls and ability checks.` },
    { k: ['initiative'], a:
`<b>Initiative</b>
• Everyone rolls a <b>Dexterity check</b>; turns proceed highest to lowest.
• Ties: PCs before monsters, or higher Dex. The DM can roll once per group of identical monsters.
• In Goblin's Cave, the DM manages the initiative bar — use "Next Turn" to advance.` },
    { k: ['spell slot', 'spellcasting'], a:
`<b>Spell Slots</b>
• Slots are ammunition for spells; a 1st-level slot can't cast a 2nd-level spell, but higher slots can upcast.
• Slots return after a long rest (Warlocks after a short rest). Cantrips cost no slots.
• Multiclass casters add levels per the multiclass spell slot table.` },
    { k: ['fireball'], a:
`<b>Fireball</b> — 3rd-level evocation, 150 ft range, 20-ft-radius sphere, Dexterity save.
• 8d6 fire damage (half on save). Ignites flammable objects.
• Upcast: +1d6 per slot level above 3rd. The classic "you're all going to die in this room" spell.` },
    { k: ['healing word', 'cure wounds'], a:
`<b>Healing options</b>
• <b>Healing Word:</b> bonus-action ranged heal, 1d4 + modifier — great for picking up downed allies.
• <b>Cure Wounds:</b> action touch heal, 1d8 + modifier. Both scale when upcast.` },
    { k: ['concentration'], a:
`<b>Concentration</b>
• Some spells need concentration; you can only concentrate on one at a time.
• When you take damage, make a <b>Constitution save, DC = 10 or half the damage (whichever is higher)</b>, or lose the spell.
• Being incapacitated or killed also ends it.` },
    { k: ['line of sight', 'line of effect', 'targeting'], a:
`<b>Targeting rules</b>
• A clear path is needed to the target; total cover blocks targeting.
• <b>Line of sight</b> matters for many spells; lightly obscured areas impose disadvantage on Perception, heavily obscured areas effectively blind.` },
    { k: ['critical', 'crit'], a:
`<b>Critical Hits</b>
• Natural 20 on an attack roll = automatic hit and a crit: roll the damage dice <b>twice</b>, then add modifiers.
• Natural 1 on an attack = automatic miss.` },
    { k: ['encumbrance', 'carrying capacity', 'inventory weight'], a:
`<b>Carrying Capacity</b>
• Capacity = Strength score × 15 (in pounds). Push/drag/lift = ×30, but speed drops to 5 ft.
• A common variant is "encumbrance": carrying over Str × 5 makes you encumbered (−10 ft speed).` },
  ];

  /* ---------------- site navigation help ---------------- */
  const HELP = [
    { k: ['create room', 'host', 'dm a room', 'new room', 'start a room'], a:
`<b>Hosting a room:</b>
1. Click <b>Create Room</b> in the header (guests welcome!).
2. Fill in the name, optional password and player cap.
3. Build your map (templates or upload), paint terrain & fog of war.
4. Spawn NPCs with HP/AC and tokens.
5. Pick an ambient track, then <b>Post Room</b>.
6. Share the <b>5-letter code</b> or join link and wait for players to Ready up, then <b>Start Game Session</b>.` },
    { k: ['join room', 'join a game', 'room code', 'join link'], a:
`<b>Joining:</b> click <b>Join Room</b>, paste the 5-letter code (or the full invite link), then pick or create your character. Toggle <b>Ready</b> in the lobby — the session starts once the DM launches it.` },
    { k: ['map builder', 'build a map', 'grid', 'hex'], a:
`<b>Map Builder tips:</b>
• Choose a template, upload an image, or start blank.
• Toggle <b>Square / Hex</b> grids and set columns/rows.
• <b>Terrain:</b> pick a swatch and paint cells. <b>Erase</b> clears them.
• <b>Fog:</b> paint fog to hide areas — players only see what you reveal (erase fog in-game).
• <b>Tokens:</b> place NPC tokens with the token tool; set token size with the scale slider.
• Save your map to <b>My Vault</b> to reuse it later.` },
    { k: ['fog of war', 'fog'], a:
`<b>Fog of War:</b> in the map builder, paint fog to hide areas before the game. During the session, the DM uses the <b>Fog brush/eraser</b> to reveal areas live — players' views update in real time.` },
    { k: ['character', 'sheet', 'vault', 'upload character'], a:
`<b>Characters:</b>
• Logged-in players save characters to <b>My Vault</b> (Account page) and reuse them in any room.
• Guests can fill a quick character card when joining, or upload a <b>JSON sheet</b> (fields: name, class, level, hp, ac, speed, attacks, token).
• A character card holds: Name, Class, Level, HP, AC, Speed, main attacks and a token portrait.` },
    { k: ['dice', 'roll', 'advantage', 'disadvantage'], a:
`<b>Dice:</b> use the dice tray in a session, or type commands in chat:
• <b>/roll 1d20+5</b> — attack with modifier
• <b>/roll d20 adv</b> or <b>/roll d20 dis</b> — advantage/disadvantage
• <b>/roll 4d6kh3</b> — keep highest 3 (ability scores!)
Rolls are broadcast to the whole table with a flourish.` },
    { k: ['audio', 'music', 'ambient', 'sound'], a:
`<b>Atmosphere:</b> in step 4 of room creation, choose a synthesized ambient loop (Dungeon Rain, Tavern Noise, Cave Drips, Night Forest, Battle Drums), paste an external audio URL, or upload an MP3. Players get a volume control during play.` },
    { k: ['account', 'profile', 'history', 'save'], a:
`<b>Accounts:</b> sign up on the landing page to get <b>My Vault</b> (saved characters, maps), campaign stats, and <b>Room History</b>. Guests can play instantly but nothing persists between visits.` },
    { k: ['initiative', 'turn', 'combat'], a:
`<b>Initiative in-session:</b> the DM opens the initiative panel, adds tokens (rolls are automatic), and drives combat with <b>Next/Prev Turn</b>. Players can move their own token on their turn; the DM can move anything, reveal fog, and run NPCs.` },
    { k: ['password', 'private room'], a:
`<b>Private rooms:</b> in room step 1, set a password. Joiners must enter it before seeing the lobby. Max player count also limits who can enter.` },
  ];

  /* ---------------- DM generators ---------------- */
  const N = {
    names: ['Brixie', 'Mogwick', 'Hargrid', 'Snivelle', 'Torvald', 'Zanni', 'Grethel', 'Orbin', 'Nyx', 'Fizzlewick', 'Drogmir', 'Elowen', 'Kratch', 'Sylvia Thorn', 'Bodo', 'Margath', 'Piper', 'Uzga', 'Caldwell', 'Renna'],
    races: ['goblin', 'human', 'half-orc', 'tiefling', 'halfling', 'dwarf', 'elf', 'kobold', 'gnome', 'dragonborn'],
    jobs: ['innkeeper', 'blacksmith', 'hedge wizard', 'graverobber', 'monster hunter', 'candle-maker', 'retired adventurer', 'smuggler', 'cartographer', 'mushroom farmer'],
    traits: ['who never stops grinning', 'with a jar of pickled eyes on the shelf', 'who whispers everything', 'missing one eyebrow', 'with a suspiciously clean apron', 'who keeps glancing at the ceiling', 'with brass teeth', 'who collects teeth', 'smelling of sulfur and honey', 'with an unseen familiar nearby'],
    hooks: ['knows a shortcut through the caves — for a price', 'is secretly feeding information to the hobgoblins', 'will pay double to escort a "harmless" crate', 'has a map tattooed on their scalp', 'swears the statue in the square moves at night', 'owes a debt to someone with scales', 'sells potions of dubious origin (roll on the wild table)', 'can identify the symbol on the party\'s found coin'],
    enc1: ['goblin scouts', 'giant spiders', 'a starving owlbear', 'cult initiates', 'skeletons of a past party', 'a rival adventuring crew', 'swarm of bats and one very angry ogre', 'doppelganger posing as a lost child', 'hobgoblin slavers', 'animated armor'],
    enc2: ['ambushed the last group that came through', 'are arguing loudly over a shiny rock', 'have rigged tripwires across the corridor', 'are performing a questionable ritual', 'are asleep — mostly', 'demand a toll in food, not coin', 'flee if their leader drops, and their leader is very visible', 'carry a key that fits something deeper in'],
    env: ['a dripping cavern', 'a collapsed shrine', 'a flooded undercroft', 'a bone-strewn den', 'a mushroom grove', 'a flooded mine shaft', 'a goblin warren lit by tallow candles', 'an echoing chasm bridge'],
    lootSmall: ['a pouch of 3d6 silver pieces', 'a goblin tooth necklace (worth 5 gp to the right buyer)', 'a potion of healing', 'scroll of disguise self', 'a surprisingly fine dagger', 'smoked rations for 3 days', 'a brass compass that points to fresh water'],
    lootBig: ['a +1 weapon of the previous owner\'s choice', 'gemstones worth 4d6 × 10 gp', 'a ring of jumping', 'wand of magic missiles (7 charges)', 'a map fragment to something called "The Deep Vault"', 'boots of elvenkind', 'a sentient, sarcastic shield'],
    lootWeird: ['a jar of everbright fireflies', 'a tiny bag of holding (fits one hand, holds 30 lbs)', 'a music box that calms goblins', 'one (1) extremely loyal giant rat', 'a chime that opens any locked wooden door — once', 'goblin IOUs, signed in crayon'],
  };

  function randomNPC() {
    return `🎭 <b>${pick(N.names)}</b> — a ${pick(N.races)} ${pick(N.jobs)} ${pick(N.traits)}.
<i>Hook:</i> ${pick(N.hooks)}.
<i>Roleplay tip:</i> give them one want, one fear, and one secret they'll never admit.`;
  }

  function randomEncounter() {
    const party = rint(3, 5);
    return `⚔️ <b>Encounter idea</b> (party of ~${party}, levels ${rint(1, 4)}–${rint(5, 8)}):
${pick(N.enc1)} ${pick(N.enc2)}, encountered in ${pick(N.env)}.
<i>Tactical twist:</i> ${pick(['unstable ground — shove checks cause falls', 'reinforcements arrive in 3 rounds', 'a hostage makes area attacks risky', 'darkness; only one torch remains', 'a rival NPC intervenes mid-fight', 'the loot is cursed and obvious about it'])}.`;
  }

  function randomLoot() {
    return `💰 <b>Loot drop:</b>
• ${pick(N.lootSmall)}
• ${pick(N.lootSmall)}
• Rare find: ${pick(N.lootBig)}
• Weird goblin treasure: ${pick(N.lootWeird)}
<i>Rule of thumb: let them carry it out, then make them choose what to drop when the cave starts collapsing.</i>`;
  }

  function randomName() {
    return `✍️ Names from the cave: <b>${pick(N.names)} ${pick(['the Unwashed', 'Crackletooth', 'of the Deep Warren', 'Half-Candle', 'Mudfoot', 'the Third', 'Nine-Fingers', 'Gloomwhisper'])}</b>.
Party of adventurers? Try: <b>${pick(N.names)}, ${pick(N.names)} &amp; ${pick(N.names)}</b>.`;
  }

  /* ---------------- answering engine ---------------- */
  const GREET = /^(hi|hello|hey|yo|sup|oi|greetings|good (morning|evening|day))\b/i;

  /* a keyword phrase matches when ALL of its words appear in the question
     (substring match per word, so "grapple" also catches "grappling") */
  function scoreEntry(entry, q) {
    let score = 0;
    for (const kw of entry.k) {
      const words = kw.split(' ');
      if (words.every(w => q.includes(w))) score += kw.length + words.length;
    }
    return score;
  }
  function bestEntry(list, q) {
    let best = null, bestScore = 0;
    for (const e of list) {
      const s = scoreEntry(e, q);
      if (s > bestScore) { best = e; bestScore = s; }
    }
    return { best, bestScore };
  }

  function answer(text) {
    const q = String(text || '').toLowerCase();

    if (/^\/?help$/.test(q)) return intro();
    if (GREET.test(q.trim())) return `Well met, adventurer! 🕯️ Ask me about the site (<i>"how do I create a room?"</i>), D&amp;D rules (<i>"how does grappling work?"</i>) or shout <i>"generate an NPC"</i> for DM fuel.`;

    // generators
    if (/\b(generate|make|create|give me|random)\b.*\b(npc|character|villager|person)\b/.test(q) || /\bnpc\b.*\b(generate|idea)\b/.test(q)) return randomNPC();
    if (/\b(encounter|fight|battle|combat)\b.*\b(idea|generate|random|make|suggest)\b/.test(q) || /\b(random|generate)\b.*\b(encounter|fight)\b/.test(q)) return randomEncounter();
    if (/\b(loot|treasure|reward)\b/.test(q) && /\b(idea|generate|random|suggest|table|what)\b/.test(q)) return randomLoot();
    if (/\bname\b.*\b(idea|generate|random|suggest|for)\b/.test(q) || /\b(random|generate)\b.*\bname\b/.test(q)) return randomName();

    // site help first (specific product questions beat generic rules)
    let { best, bestScore } = bestEntry(HELP, q);
    if (best && bestScore >= 5) return best.a;

    // 5e rules
    const rules = bestEntry(RULES, q);
    if (rules.best && rules.bestScore >= Math.max(4, bestScore)) return rules.best.a;
    if (best) return best.a;

    // dice requests
    const cmd = Dice.parseCommand('/roll ' + q.replace(/roll|dice|please|for me|me/gi, '').trim());
    if (cmd) return `🎲 ${Dice.describe(cmd)}`;

    return `Hmm, even my goblin scouts haven't heard of that. 🍄 Try:
• Site: <i>"how do I join a room?"</i>, <i>"explain the map builder"</i>
• Rules: <i>"how does grappling work?"</i>, <i>"counterspell components"</i>
• DM fuel: <i>"generate an NPC"</i>, <i>"random encounter"</i>, <i>"loot ideas"</i>`;
  }

  function intro() {
    return `👺 <b>The Goblin Guide at your service!</b>
I know my way around the cave and the rules of the game. Try:
• <i>"How do I create a room?"</i>
• <i>"How does fog of war work?"</i>
• <i>"What are death saving throws?"</i>
• <i>"Generate an NPC"</i> / <i>"random encounter"</i> / <i>"loot ideas"</i>`;
  }

  /* ---------------- widget UI ---------------- */
  const CHIPS = [['g_c1', 'How do I create a room?'], ['g_c2', 'How does grappling work?'], ['g_c3', 'Generate an NPC'], ['g_c4', 'Random encounter'], ['g_c5', 'Loot ideas']];

  function mount() {
    if ($('#guide-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'guide-fab';
    fab.title = 'The Goblin Guide';
    fab.innerHTML = '👺';
    document.body.appendChild(fab);

    const panel = document.createElement('div');
    panel.id = 'guide-panel';
    panel.classList.add('hidden');
    panel.innerHTML = `
      <header>
        <span class="face">👺</span>
        <div><b>The Goblin Guide</b><small id="guide-sub">site help • 5e rules • DM generators</small></div>
        <div class="spacer"></div>
        <button class="modal-x" id="guide-close">✕</button>
      </header>
      <div id="guide-log"></div>
      <div id="guide-chips"></div>
      <div id="guide-chips2" style="display:flex;gap:.35rem;padding:.3rem .7rem 0;"></div>
      <div id="guide-input-row">
        <input id="guide-input" placeholder="Ask the goblin…" autocomplete="off">
        <button id="guide-send">➤</button>
      </div>`;
    const relabel = () => {
      const sub = $('#guide-sub'); if (sub) sub.textContent = I18n.t('g_sub');
      const inp = $('#guide-input'); if (inp) inp.placeholder = I18n.t('g_ph');
      const am = $('#am-toggle');
      if (am) am.classList.toggle('active', I18n.aiMasterOn());
    };
    Bus.on('lang', relabel);
    document.body.appendChild(panel);

    const log = $('#guide-log');
    const addMsg = (html, who) => {
      const d = document.createElement('div');
      d.className = 'g-msg ' + who;
      d.innerHTML = html;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    };

    fab.addEventListener('click', () => {
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        if (!log.children.length) addMsg(intro(), 'bot');
        setTimeout(() => $('#guide-input').focus(), 50);
      }
    });
    $('#guide-close').addEventListener('click', () => panel.classList.add('hidden'));

    const chips = $('#guide-chips');
    CHIPS.forEach(([k, q]) => {
      const b = document.createElement('span');
      b.className = 'chip'; b.dataset.i18n = k; b.textContent = I18n.t(k);
      b.addEventListener('click', () => send(q));
      chips.appendChild(b);
    });

    /* AI Master row */
    const chips2 = $('#guide-chips2');
    const amT = document.createElement('span');
    amT.className = 'chip'; amT.id = 'am-toggle';
    amT.textContent = '🎭 AI Master';
    amT.title = 'Narrator persona: speaks the room language and narrates turns in-session';
    amT.classList.toggle('active', I18n.aiMasterOn());
    amT.addEventListener('click', () => {
      I18n.setAiMaster(!I18n.aiMasterOn());
      amT.classList.toggle('active', I18n.aiMasterOn());
      addMsg(I18n.aiMasterOn()
        ? '🎭 <b>AI Master awakens.</b> I will narrate the session in the chosen language.'
        : 'The AI Master folds back into the shadows.', 'bot');
    });
    chips2.appendChild(amT);
    const amN = document.createElement('span');
    amN.className = 'chip'; amN.textContent = '🎭 Narrate the scene';
    amN.addEventListener('click', () => addMsg('🎭 ' + I18n.narrate(I18n.getLang(), 'the party'), 'bot'));
    chips2.appendChild(amN);

    function send(text) {
      text = (text ?? '').trim();
      if (!text) return;
      addMsg(escapeHtml(text), 'user');
      $('#guide-input').value = '';
      setTimeout(() => {
        const raw = answer(text);
        const lang = I18n.getLang();
        if (lang === 'en') return addMsg(raw, 'bot');
        const node = addMsg('<i>…</i>', 'bot');
        I18n.MT.translate(I18n.MT.strip(raw), lang).then(tr => {
          node.innerHTML = tr ? escapeHtml(tr) : raw;
          log.scrollTop = log.scrollHeight;
        });
      }, 260);
    }
    $('#guide-send').addEventListener('click', () => send($('#guide-input').value));
    $('#guide-input').addEventListener('keydown', e => { if (e.key === 'Enter') send(e.target.value); });
  }

  return { mount, answer };
})();

/* auto-mount everywhere */
window.addEventListener('DOMContentLoaded', () => Guide.mount());
