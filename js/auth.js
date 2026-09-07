/* auth.js — demo authentication (local only) + guest mode */
const Auth = (() => {
  /* NOTE: this is a local, browser-only demo store. Passwords are hashed with a
     non-cryptographic hash purely so they aren't stored in plain text. */
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36) + s.length;
  }

  function currentUser() {
    const s = Store.get(Store.K.session, null);
    if (!s) return null;
    if (s.guest) return { guest: true, id: s.id, name: s.name, avatar: '🎭' };
    const u = Store.findUser(s.username);
    if (!u) return null;
    return { guest: false, id: u.id, username: u.username, name: u.username, avatar: u.avatar, avatarImg: u.avatarImg, createdAt: u.createdAt };
  }

  function signup(username, password) {
    username = String(username || '').trim();
    if (username.length < 3) return { error: 'Name needs at least 3 characters.' };
    if (String(password || '').length < 4) return { error: 'Password needs at least 4 characters.' };
    if (Store.findUser(username)) return { error: 'That adventurer name is already taken.' };
    const user = {
      id: uid(), username, hash: hash(password),
      avatar: '🧙', avatarImg: null, createdAt: Date.now(),
      stats: { roomsHosted: 0, roomsJoined: 0, diceRolled: 0 },
    };
    Store.saveUser(user);
    Store.set(Store.K.session, { username });
    return { user };
  }

  function login(username, password) {
    const u = Store.findUser(username);
    if (!u || u.hash !== hash(password)) return { error: 'Wrong name or password, adventurer.' };
    Store.set(Store.K.session, { username: u.username });
    return { user: u };
  }

  function logout() { localStorage.removeItem(Store.K.session); }

  function becomeGuest(name) {
    const g = { guest: true, id: 'guest-' + uid(), name: (name || 'Wanderer').trim() || 'Wanderer' };
    Store.set(Store.K.session, g);
    return g;
  }

  function updateProfile(patch) {
    const u = currentUser();
    if (!u || u.guest) return null;
    const rec = Store.findUser(u.username);
    Object.assign(rec, patch);
    Store.saveUser(rec);
    return rec;
  }

  function bumpStat(stat, by = 1) {
    const u = currentUser();
    if (!u || u.guest) return;
    const rec = Store.findUser(u.username);
    rec.stats = rec.stats || {};
    rec.stats[stat] = (rec.stats[stat] || 0) + by;
    Store.saveUser(rec);
  }

  return { currentUser, signup, login, logout, becomeGuest, updateProfile, bumpStat };
})();
