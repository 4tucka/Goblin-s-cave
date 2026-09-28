/* play.js — live VTT session: map, initiative, chat, dice, audio */
initChrome('');
/* fit the VTT shell exactly under the sticky header */
(function fitShell() {
  const main = document.querySelector('main');
  const header = document.querySelector('.site-header');
  const apply = () => { if (innerWidth > 900) main.style.height = (innerHeight - header.offsetHeight - 1) + 'px'; };
  apply();
  addEventListener('resize', apply);
})();

const code = roomCodeOf();
let room = Store.getRoom(code);
const u = Auth.currentUser();

if (!room) {
  document.querySelector('main').innerHTML = `<div class="panel center" style="max-width:520px;margin:10vh auto;">
    <h2>🌑 This room does not exist</h2><p class="dim">It may have been abandoned or expired.</p>
    <a class="btn btn-primary" href="index.html">Back to the entrance</a></div>`;
} else {
  boot();
}

function boot() {
  const isDM = u && u.id === room.hostId;
  const myId = u ? u.id : null;
  let selectedTokenId = null;
  let advMode = null; // null | 'adv' | 'dis'

  /* ---------------- header ---------------- */
  $('#sess-name').textContent = room.name;
  $('#sess-code').textContent = code;
  $('#sess-role').textContent = isDM ? '🕯️ You are the Dungeon Master' : `Playing as ${escapeHtml(u?.name || 'guest')}`;
  $('#btn-end').classList.toggle('hidden', !isDM);
  $$('.dm-only').forEach(el => el.classList.toggle('hidden', !isDM));
  $('#btn-open-join').addEventListener('click', async () => {
    const url = new URL('join.html', location.href);
    url.search = '?code=' + code;
    await copyText(url.toString());
    toast('Invite link copied — share it with latecomers.', 'ok');
  });

  /* ---------------- canvas ---------------- */
  const mc = new MapCanvas($('#vtt-canvas'), {
    getData: () => ({
      src: room.map.src, cols: room.map.cols, rows: room.map.rows,
      grid: room.map.grid, cs: room.map.cs,
      terrain: room.terrain, fog: new Set(room.fog),
      tokens: room.tokens,
      props: room.props || [], walls: room.walls || [], labels: room.labels || [],
      dmView: isDM,
      selectedTokenId,
      activeTokenId: currentTurnToken()?.id || null,
    }),
    onAction,
    canMoveToken: t => canMove(t),
  });
  mc.mode = 'move';
  setTimeout(() => mc.fit(), 60);

  $$('.tool-bar [data-tool]').forEach(b => b.addEventListener('click', () => {
    $$('.tool-bar [data-tool]').forEach(x => x.classList.toggle('active', x === b));
    mc.mode = b.dataset.tool;
  }));
  $('#v-zoom-in').addEventListener('click', () => mc.zoomBy(1.2));
  $('#v-zoom-out').addEventListener('click', () => mc.zoomBy(0.83));
  $('#v-fit').addEventListener('click', () => mc.fit());

  /* ---------------- turn rules ---------------- */
  function currentTurnToken() {
    if (!room.initiative.length) return null;
    const entry = room.initiative[room.turnIdx || 0];
    return room.tokens.find(t => t.id === entry.tokenId) || null;
  }

  function canMove(t) {
    if (isDM) return true;
    const cur = currentTurnToken();
    if (!cur) return t.owner === myId; // no initiative yet: free movement of own token
    if (cur.id !== t.id) return false;
    return t.owner === myId;
  }

  function onAction(action, payload) {
    if (action === 'blockedMove') {
      const cur = currentTurnToken();
      toast(cur
        ? `⏳ It&rsquo;s <b>${escapeHtml(cur.name)}</b>&rsquo;s turn${isDM ? '' : ' — you can only move your own token on your turn'}.`
        : 'The DM has not opened combat yet.', 'err');
      return;
    }
    if (action === 'paintFog' || action === 'eraseFog') {
      if (!isDM) return;
      const key = Grid.cellKey(payload.col, payload.row);
      if (action === 'paintFog') room.fog = [...new Set([...room.fog, key])];
      else room.fog = room.fog.filter(k => k !== key);
      debouncedSave();
      mc.render();
    }
    if (action === 'selectToken') {
      selectedTokenId = payload ? payload.id : null;
      renderTokenPanel();
      mc.render();
    }
    if (action === 'moveToken') {
      saveRoom();
      const t = payload;
      sysChat(`${t.name} moves…`, false);
    }
  }

  /* ---------------- persistence ---------------- */
  let saveTimer = null;
  function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveRoom, 260);
  }
  function saveRoom() { Store.saveRoom(room); }

  Bus.on('room:' + code, latest => {
    if (!latest) return showEnded();
    const keepSel = selectedTokenId;
    room = latest;
    selectedTokenId = keepSel;
    if (room.state === 'ended') return showEnded();
    renderAll();
  });

  function showEnded() {
    $('#ended-overlay').classList.remove('hidden');
    Ambient.stop();
  }

  /* ---------------- token panel ---------------- */
  function renderTokenPanel() {
    const t = room.tokens.find(x => x.id === selectedTokenId);
    const panel = $('#token-panel');
    if (!t) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    $('#tp-name').textContent = `${t.icon || ''} ${t.name}`;
    $('#tp-kind').textContent = t.owner === 'dm' ? 'NPC' : 'Player';
    $('#tp-hp').textContent = t.maxHp > 0 ? `${t.hp}/${t.maxHp}` : '—';
    $('#tp-ac').textContent = t.ac ? `🛡️ AC ${t.ac}` : '';
    $('#tp-atk').textContent = t.atk ? `⚔️ ${t.atk}` : '';
    const canEditHp = isDM || t.owner === myId;
    ['tp-dmg5', 'tp-dmg1', 'tp-heal1', 'tp-heal5'].forEach(id => $('#' + id).disabled = !canEditHp);
    $('#tp-del').classList.toggle('hidden', !isDM || t.owner !== 'dm');
  }
  function adjustHp(delta) {
    const t = room.tokens.find(x => x.id === selectedTokenId);
    if (!t || t.maxHp <= 0) return;
    t.hp = clamp(t.hp + delta, 0, t.maxHp);
    if (t.hp === 0) sysChat(`💀 ${t.name} drops to 0 HP!`);
    renderTokenPanel(); renderInit(); renderParty();
    saveRoom();
  }
  $('#tp-dmg5').addEventListener('click', () => adjustHp(-5));
  $('#tp-dmg1').addEventListener('click', () => adjustHp(-1));
  $('#tp-heal1').addEventListener('click', () => adjustHp(1));
  $('#tp-heal5').addEventListener('click', () => adjustHp(5));
  $('#tp-close').addEventListener('click', () => { selectedTokenId = null; renderTokenPanel(); mc.render(); });
  $('#tp-del').addEventListener('click', () => {
    const t = room.tokens.find(x => x.id === selectedTokenId);
    if (!t) return;
    room.tokens = room.tokens.filter(x => x.id !== t.id);
    room.initiative = room.initiative.filter(e => e.tokenId !== t.id);
    selectedTokenId = null;
    renderTokenPanel(); renderInit(); saveRoom();
  });

  /* ---------------- initiative ---------------- */
  function renderInit() {
    const cards = $('#init-cards');
    cards.innerHTML = '';
    $('#btn-prev-turn').classList.toggle('hidden', !isDM || !room.initiative.length);
    $('#btn-next-turn').classList.toggle('hidden', !isDM || !room.initiative.length);
    $('#btn-init-edit').classList.toggle('hidden', !isDM);
    if (!room.initiative.length) {
      cards.innerHTML = '<span class="dim" style="font-size:.8rem;">No combat yet — the DM sets initiative.</span>';
    }
    room.initiative.forEach((e, i) => {
      const t = room.tokens.find(x => x.id === e.tokenId);
      if (!t) return;
      const el = document.createElement('div');
      el.className = 'init-card' + (i === (room.turnIdx || 0) ? ' current' : '');
      el.innerHTML = `<div class="icon">${t.icon || '❓'}</div>
        <div class="nm">${escapeHtml(t.name)}</div>
        <div class="iv">init ${e.init}</div>
        ${t.maxHp > 0 ? `<div class="hp-line"><i style="width:${clamp(t.hp / t.maxHp * 100, 0, 100)}%"></i></div>` : ''}`;
      if (isDM) el.addEventListener('click', () => { room.turnIdx = i; saveRoom(); renderAll(); });
      cards.appendChild(el);
    });
    const cur = currentTurnToken();
    $('#turn-hint').textContent = cur ? `▶ ${cur.name}'s turn` : '';
  }

  const amBtn = $('#aimaster-toggle');
  const amSync = () => amBtn.classList.toggle('active', I18n.aiMasterOn());
  amSync();
  amBtn.addEventListener('click', () => { I18n.setAiMaster(!I18n.aiMasterOn()); amSync(); });

  $('#btn-next-turn').addEventListener('click', () => {
    if (!room.initiative.length) return;
    room.turnIdx = ((room.turnIdx || 0) + 1) % room.initiative.length;
    const t = currentTurnToken();
    sysChat(`▶ ${t ? t.name : 'Next'}'s turn!`);
    if (I18n.aiMasterOn()) {
      room.chat.push({ id: uid(), who: '🎭 AI Master',
        text: I18n.narrate(room.lang || I18n.getLang(), t ? t.name : 'the party'), type: 'msg', ts: Date.now() });
    }
    saveRoom(); renderAll();
  });
  $('#btn-prev-turn').addEventListener('click', () => {
    if (!room.initiative.length) return;
    room.turnIdx = ((room.turnIdx || 0) - 1 + room.initiative.length) % room.initiative.length;
    saveRoom(); renderAll();
  });

  $('#btn-init-edit').addEventListener('click', () => {
    const rows = room.tokens.map(t => {
      const entry = room.initiative.find(e => e.tokenId === t.id);
      return `<div class="row" style="margin-bottom:.5rem;">
        <span style="width:150px;">${t.icon || ''} ${escapeHtml(t.name)}</span>
        <input type="checkbox" data-inc="${t.id}" ${entry ? 'checked' : ''}>
        <input type="number" data-init="${t.id}" value="${entry ? entry.init : Dice.rollDie(20)}" style="width:80px;">
      </div>`;
    }).join('');
    const ov = openModal(`
      <div class="modal-head"><h3>🎲 Set initiative</h3><button class="modal-x">✕</button></div>
      <p class="dim mt0">Check the combatants in this round, tweak their rolls, then deploy.</p>
      ${rows || '<p class="dim">No tokens on the map yet.</p>'}
      <div class="row end mt2">
        <button class="btn btn-sm" id="init-roll-all">🎲 Re-roll all</button>
        <button class="btn btn-primary" id="init-apply">Deploy order</button>
      </div>`);
    $('#init-roll-all', ov).addEventListener('click', () => {
      $$('[data-init]', ov).forEach(inp => inp.value = Dice.rollDie(20));
    });
    $('#init-apply', ov).addEventListener('click', () => {
      const entries = [];
      $$('[data-inc]', ov).forEach(chk => {
        if (!chk.checked) return;
        const id = chk.dataset.inc;
        const init = parseInt($(`[data-init="${id}"]`, ov).value) || 0;
        entries.push({ tokenId: id, init });
      });
      entries.sort((a, b) => b.init - a.init);
      room.initiative = entries;
      room.turnIdx = 0;
      closeModal();
      sysChat('⚔️ Initiative is set — combat begins!');
      saveRoom(); renderAll();
    });
  });

  /* ---------------- chat ---------------- */
  function renderChat() {
    const box = $('#chat-log');
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    box.innerHTML = room.chat.slice(-120).map(m => {
      if (m.type === 'roll') return `<div class="chat-msg roll"><span class="who">${escapeHtml(m.who)}</span>
        rolled <i>${escapeHtml(m.expr)}</i> → ${m.detail} <span class="ts">${fmtTime(m.ts)}</span></div>`;
      if (m.type === 'sys') return `<div class="chat-msg sys">${escapeHtml(m.text)} <span class="ts">${fmtTime(m.ts)}</span></div>`;
      return `<div class="chat-msg"><span class="who">${escapeHtml(m.who)}</span>${escapeHtml(m.text)} <span class="ts">${fmtTime(m.ts)}</span></div>`;
    }).join('');
    if (atBottom) box.scrollTop = box.scrollHeight;
  }

  function sysChat(text, save = true) {
    room.chat.push({ id: uid(), text, type: 'sys', ts: Date.now() });
    if (save) saveRoom();
    renderChat();
  }

  function sendChat(text) {
    text = (text ?? '').trim();
    if (!text) return;
    const roll = Dice.parseCommand(text);
    if (roll) {
      pushRoll(roll);
    } else {
      room.chat.push({ id: uid(), who: u?.name || 'Guest', text, type: 'msg', ts: Date.now() });
      saveRoom();
    }
    $('#chat-input').value = '';
  }
  function pushRoll(roll) {
    Auth.bumpStat('diceRolled');
    room.chat.push({
      id: uid(), who: u?.name || 'Guest', type: 'roll', ts: Date.now(),
      expr: roll.expr,
      detail: Dice.describe(roll).split('→').pop().trim(),
    });
    saveRoom();
    showDieResult(roll);
  }
  $('#chat-send').addEventListener('click', () => sendChat($('#chat-input').value));
  $('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(e.target.value); });

  /* ---------------- dice tray ---------------- */
  const tray = $('#dice-tray');
  for (const sides of Dice.DICE) {
    const b = document.createElement('button');
    b.className = 'die-btn';
    b.innerHTML = `<span>d${sides}</span><small>${Dice.FACES[sides] || ''}</small>`;
    b.addEventListener('click', () => {
      const mod = parseInt($('#dice-mod').value) || 0;
      const expr = `1d${sides}${mod >= 0 ? (mod ? '+' + mod : '') : mod}`;
      const r = Dice.roll(expr, advMode);
      if (r) pushRoll(r);
    });
    tray.appendChild(b);
  }
  function showDieResult(r) {
    const box = $('#die-result');
    box.classList.remove('rolling'); void box.offsetWidth; box.classList.add('rolling');
    box.innerHTML = `<div class="big">${r.total}</div>
      <div class="dim">${escapeHtml(r.expr)}${r.adv ? (r.adv === 'adv' ? ' with advantage' : ' with disadvantage') : ''}
      — [${r.rolls.join(', ')}]${r.mod ? (r.mod > 0 ? ' +' + r.mod : ' −' + Math.abs(r.mod)) : ''}</div>`;
    // switch to dice tab so players see the tumble
    switchTab('dice');
  }
  $('#adv-toggle').addEventListener('click', () => {
    advMode = advMode === 'adv' ? null : 'adv';
    $('#adv-toggle').classList.toggle('active', advMode === 'adv');
    $('#dis-toggle').classList.remove('active');
  });
  $('#dis-toggle').addEventListener('click', () => {
    advMode = advMode === 'dis' ? null : 'dis';
    $('#dis-toggle').classList.toggle('active', advMode === 'dis');
    $('#adv-toggle').classList.remove('active');
  });

  /* ---------------- party tab ---------------- */
  function renderParty() {
    const box = $('#party-list');
    box.innerHTML = '';
    const dmRow = document.createElement('div');
    dmRow.className = 'player-row';
    dmRow.innerHTML = `<div class="avatar">🕯️</div><div class="grow">
      <div class="name">${escapeHtml(room.hostName)}</div><div class="sub">Dungeon Master</div></div>
      <span class="badge gold">DM</span>`;
    box.appendChild(dmRow);
    for (const p of room.players) {
      const ch = p.character || {};
      const tok = room.tokens.find(t => t.playerId === p.id);
      const row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = `
        <div class="avatar">${ch.tokenImg ? `<img src="${ch.tokenImg}">` : (ch.tokenEmoji || '🎭')}</div>
        <div class="grow">
          <div class="name">${escapeHtml(ch.name || p.name)} <small class="faint">(${escapeHtml(p.name)})</small></div>
          <div class="sub">${escapeHtml(ch.cls || '?')} Lv ${ch.level || 1} · 🛡️ ${ch.ac ?? '?'} · Speed ${ch.speed ?? 30} ft</div>
          ${tok && tok.maxHp > 0 ? `<div class="hp-line" style="height:6px;border-radius:3px;background:#401512;overflow:hidden;margin-top:4px;">
            <i style="display:block;height:100%;width:${clamp(tok.hp / tok.maxHp * 100, 0, 100)}%;background:linear-gradient(90deg,#d84b35,#7fb069);"></i></div>
            <div class="sub">❤️ ${tok.hp}/${tok.maxHp}</div>` : ''}
        </div>`;
      box.appendChild(row);
    }
    // NPC block
    const npcs = room.tokens.filter(t => t.owner === 'dm');
    if (npcs.length) {
      const h = document.createElement('h3');
      h.className = 'mt2'; h.textContent = 'Creatures';
      box.appendChild(h);
      for (const t of npcs) {
        const st = t.stance === 'friendly' ? '<span class="badge green" title="Friendly">🤝</span>'
          : t.stance === 'neutral' ? '<span class="badge dim" title="Neutral">😐</span>'
          : '<span class="badge red" title="Hostile">⚔️</span>';
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `<div class="avatar">${t.icon || '👹'}</div>
          <div class="grow"><div class="name">${escapeHtml(t.name)} ${st}</div>
          <div class="sub">❤️ ${t.hp}/${t.maxHp} · 🛡️ ${t.ac}</div></div>`;
        box.appendChild(row);
      }
    }
  }

  /* ---------------- audio ---------------- */
  function renderAudio() {
    const a = room.audio;
    $('#audio-track').textContent = a ? `${a.name}` : 'No ambience set for this room.';
  }
  $('#audio-play').addEventListener('click', () => {
    if (!room.audio) return toast('The DM hasn&rsquo;t set a track.', 'err');
    Ambient.play(room.audio, parseFloat($('#audio-vol').value));
    toast(`Playing <b>${escapeHtml(room.audio.name)}</b>…`, 'ok');
  });
  $('#audio-stop').addEventListener('click', () => Ambient.stop());
  $('#audio-vol').addEventListener('input', () => Ambient.setVolume(parseFloat($('#audio-vol').value)));

  /* ---------------- tabs ---------------- */
  function switchTab(name) {
    $$('.side-tabs [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.vtt-side [data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== name));
  }
  $$('.side-tabs [data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  /* ---------------- end session ---------------- */
  $('#btn-end').addEventListener('click', () => {
    if (!confirm('End the session for everyone?')) return;
    room.state = 'ended';
    Store.upsertHistory({
      code, name: room.name, date: Date.now(), hostName: room.hostName, role: 'host', viewer: room.hostName,
      players: room.players.map(p => p.name), state: 'ended',
    });
    saveRoom();
    showEnded();
  });

  /* ---------------- render all ---------------- */
  function renderAll() {
    $('#sess-name').textContent = room.name;
    $('#sess-state').textContent = room.state;
    $('#sess-players').textContent = `${room.players.length}/${room.maxPlayers} players`;
    renderInit();
    renderChat();
    renderParty();
    renderAudio();
    renderTokenPanel();
    mc.render();
  }
  renderAll();
}
