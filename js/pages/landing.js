/* landing.js */
initChrome('home');
renderFooter();

const u = Auth.currentUser();

/* quick join by code */
$('#quick-join').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#quick-code').value.trim().toUpperCase();
  if (code.length < 4) return toast('Enter the 5-letter room code.', 'err');
  location.href = 'join.html?code=' + encodeURIComponent(code);
});

/* CTAs */
$('#cta-create').addEventListener('click', () => {
  if (!u) {
    const name = window.prompt('Sneak in as a guest — what shall the party call you?', 'Dungeon Master');
    if (name === null) return;
    Auth.becomeGuest(name || 'Dungeon Master');
  }
  location.href = 'create.html';
});

$('#cta-auth').addEventListener('click', () => $('#auth').scrollIntoView({ behavior: 'smooth' }));
$('#banner-auth').addEventListener('click', () => $('#auth').scrollIntoView({ behavior: 'smooth' }));
$('#banner-guest').addEventListener('click', () => {
  if (!Auth.currentUser()) {
    const name = window.prompt('Guest name for this visit?', 'Wanderer');
    if (name === null) return;
    Auth.becomeGuest(name || 'Wanderer');
  }
  location.href = 'join.html';
});
$('#guest-link').addEventListener('click', e => {
  e.preventDefault();
  const name = window.prompt('Guest name for this visit?', 'Wanderer');
  if (name === null) return;
  Auth.becomeGuest(name || 'Wanderer');
  location.reload();
});

/* auth forms */
$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.login($('#login-user').value, $('#login-pass').value);
  if (r.error) return toast(r.error, 'err');
  toast(`Welcome back, <b>${escapeHtml(r.user.username)}</b>! 🔥`, 'ok');
  setTimeout(() => location.reload(), 700);
});
$('#signup-form').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.signup($('#signup-user').value, $('#signup-pass').value);
  if (r.error) return toast(r.error, 'err');
  toast(`Your account is forged, <b>${escapeHtml(r.user.username)}</b>! ⚔️`, 'ok');
  setTimeout(() => location.reload(), 700);
});

/* if already signed in, swap the auth panel for a shortcut */
if (u && !u.guest) {
  $('#auth').innerHTML = `
    <div class="panel-title"><h2>⚔️ Adventurer&rsquo;s Gate</h2></div>
    <p>You are signed in as <b class="gold">${escapeHtml(u.name)}</b>.</p>
    <div class="row">
      <a class="btn btn-primary" href="account.html">Open My Account</a>
      <button class="btn btn-ghost" id="logout-btn">Log out</button>
    </div>`;
  $('#logout-btn').addEventListener('click', () => { Auth.logout(); location.reload(); });
} else if (u && u.guest) {
  $('#auth').querySelector('.panel-title h2').innerHTML = '⚔️ Adventurer&rsquo;s Gate — you&rsquo;re visiting as a guest';
}
