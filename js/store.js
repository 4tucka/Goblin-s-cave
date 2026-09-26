/* store.js — localStorage-backed database for Goblin's Cave */
const Store = (() => {
  const K = {
    users: 'gc_users',
    session: 'gc_session',
    chars: 'gc_chars',
    maps: 'gc_maps',
    rooms: 'gc_rooms',
    history: 'gc_history',
  };

  function get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch {
      if (window.toast) toast('⚠️ Browser storage is full — that change could not be saved. Try a smaller image or delete old maps/rooms.', 'err', 5200);
      return false;
    }
  }

  /* ---- users ---- */
  const users = () => get(K.users, {});
  function saveUser(user) { const all = users(); all[user.username.toLowerCase()] = user; set(K.users, all); }
  function findUser(username) { return users()[String(username).toLowerCase()] || null; }

  /* ---- characters ("My Vault") ---- */
  const chars = () => get(K.chars, []);
  const charsFor = owner => chars().filter(c => c.owner === owner);
  function saveChar(ch) {
    const all = chars();
    const i = all.findIndex(c => c.id === ch.id);
    if (i >= 0) all[i] = ch; else all.push(ch);
    set(K.chars, all); return ch;
  }
  function deleteChar(id) { set(K.chars, chars().filter(c => c.id !== id)); }
  function getChar(id) { return chars().find(c => c.id === id) || null; }

  /* ---- custom saved maps ---- */
  const maps = () => get(K.maps, []);
  function saveMap(m) {
    const all = maps();
    const i = all.findIndex(x => x.id === m.id);
    if (i >= 0) all[i] = m; else all.push(m);
    try { set(K.maps, all); return true; }
    catch { all.splice(all.indexOf(m), 1); set(K.maps, all); return false; }
  }
  function deleteMap(id) { set(K.maps, maps().filter(m => m.id !== id)); }

  /* ---- rooms ---- */
  const rooms = () => get(K.rooms, {});
  const getRoom = code => rooms()[String(code).toUpperCase()] || null;
  function saveRoom(room) {
    const all = rooms();
    room.updatedAt = Date.now();
    all[room.code] = room;
    // prune ended rooms older than 2 days to keep storage light
    for (const c of Object.keys(all)) {
      if (all[c].state === 'ended' && Date.now() - all[c].updatedAt > 2 * 864e5) delete all[c];
    }
    set(K.rooms, all);
    Bus.emit('room:' + room.code, room);
    return room;
  }
  function deleteRoom(code) {
    const all = rooms(); delete all[code]; set(K.rooms, all);
    Bus.emit('room:' + code, null);
  }

  /* ---- history ---- */
  const history = () => get(K.history, []);
  function pushHistory(entry) {
    const all = history();
    all.unshift(entry);
    set(K.history, all.slice(0, 60));
  }
  /* replace any entry with the same room code + viewer, else prepend */
  function upsertHistory(entry) {
    const all = history();
    const i = all.findIndex(h => h.code === entry.code && h.viewer === entry.viewer);
    if (i >= 0) all[i] = entry; else all.unshift(entry);
    set(K.history, all.slice(0, 60));
  }
  const historyFor = name => history().filter(h =>
    h.hostName === name || (h.players || []).some(p => p === name));

  function newRoomCode() {
    const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 5 }, () => letters[rint(0, letters.length - 1)]).join(''); }
    while (getRoom(code));
    return code;
  }

  return { K, get, set, users, saveUser, findUser, chars, charsFor, saveChar, deleteChar, getChar,
    maps, saveMap, deleteMap, rooms, getRoom, saveRoom, deleteRoom, history, pushHistory, upsertHistory, historyFor, newRoomCode };
})();
