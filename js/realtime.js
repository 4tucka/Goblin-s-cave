/* realtime.js — live sync bus.
   Uses BroadcastChannel (instant across tabs of this browser) with a
   `storage`-event fallback, so lobbies and battle maps update in real time. */
const Bus = (() => {
  const handlers = new Map(); // type -> Set(fn)
  let channel = null;
  try { channel = new BroadcastChannel('goblins-cave'); } catch { /* older browser: storage events only */ }

  function on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type)?.delete(fn);
  }

  function fire(type, payload) {
    const set = handlers.get(type);
    if (set) [...set].forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  function emit(type, payload) {
    fire(type, payload);                      // local tab
    if (channel) channel.postMessage({ type, payload });
  }

  if (channel) {
    channel.onmessage = ev => fire(ev.data?.type, ev.data?.payload);
  }
  // fallback: storage events fire in other tabs when localStorage changes
  window.addEventListener('storage', ev => {
    if (ev.key === 'gc_rooms') fire('rooms-changed', null);
  });

  return { on, emit };
})();
