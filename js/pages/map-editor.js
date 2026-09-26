/* map-editor.js — standalone advanced map editor for Vault maps */
initChrome('');
renderFooter();

const u = Auth.currentUser();
if (!u || u.guest) {
  document.querySelector('main').innerHTML = `
    <div class="panel center" style="max-width:520px;margin:6vh auto;">
      <h2>🔒 The drafting table is for signed-in cartographers</h2>
      <p class="dim">Sign in to build and keep maps in your Vault.</p>
      <a class="btn btn-primary" href="index.html#auth">Log in / Sign up</a>
    </div>`;
} else {
  boot();
}

function boot() {
  const params = new URLSearchParams(location.search);
  const mapId = params.get('map');
  const backTo = params.get('return');
  const existing = Store.maps().find(m => m.id === mapId && m.owner === u.username);

  if (backTo === 'create') {
    $('#ed-back').href = 'create.html';
    $('#ed-back').textContent = '← Back to room wizard';
  }

  const state = {
    vaultId: existing ? existing.id : uid(),
    name: existing ? existing.name : 'My Battlemap',
    map: {
      kind: existing?.src ? 'vault' : 'template',
      src: existing ? existing.src : 'assets/map-cave.jpg',
      cols: existing?.cols || 18, rows: existing?.rows || 13,
      grid: existing?.grid || 'square', cs: existing ? 48 : 48,
    },
    terrain: existing?.terrain || {},
    fog: new Set(existing?.fog || []),
    tokens: existing?.tokens || [],
    props: existing?.props || [],
    walls: existing?.walls || [],
    labels: existing?.labels || [],
  };

  $('#ed-status').textContent = existing ? `Editing “${existing.name}”` : 'New map (unsaved)';

  const bld = initBuilder({ root: '#builder-root', state, owner: u.username, getNpcList: () => [] });

  /* wizard round-trip: absorb the pending draft and push it back on unload-save */
  const raw = localStorage.getItem('gc_builder_draft');
  if (raw) {
    try { bld.applySerialized({ map: JSON.parse(raw).map, ...JSON.parse(raw) }); } catch {}
    localStorage.removeItem('gc_builder_draft');
  }
  if (backTo === 'create') {
    $('#ed-back').addEventListener('click', e => {
      e.preventDefault();
      const s = bld.serialize();
      localStorage.setItem('gc_builder_draft', JSON.stringify(s));
      location.href = 'create.html';
    });
  }
}
