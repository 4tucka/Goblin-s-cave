/* landing.js */
initChrome('home');
renderFooter();

const u = Auth.currentUser();

/* quick join by code */
$('#quick-join').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#quick-code').value.trim().toUpperCase();
  if (code.length < 4) return toast(I18n.t('l_code5'), 'err');
  location.href = 'join.html?code=' + encodeURIComponent(code);
});

/* CTAs */
$('#cta-create').addEventListener('click', () => {
  if (!u) {
    const name = window.prompt(I18n.t('l_guest_q'), I18n.t('j_dm_lbl'));
    if (name === null) return;
    Auth.becomeGuest(name || I18n.t('j_dm_lbl'));
  }
  location.href = 'create.html';
});

$('#cta-auth').addEventListener('click', () => $('#auth').scrollIntoView({ behavior: 'smooth' }));
$('#banner-auth').addEventListener('click', () => $('#auth').scrollIntoView({ behavior: 'smooth' }));
$('#banner-guest').addEventListener('click', () => {
  if (!Auth.currentUser()) {
    const name = window.prompt(I18n.t('l_guest_q2'), I18n.t('l_guest_default'));
    if (name === null) return;
    Auth.becomeGuest(name || I18n.t('l_guest_default'));
  }
  location.href = 'join.html';
});
$('#guest-link').addEventListener('click', e => {
  e.preventDefault();
  const name = window.prompt(I18n.t('l_guest_q2'), I18n.t('l_guest_default'));
  if (name === null) return;
  Auth.becomeGuest(name || I18n.t('l_guest_default'));
  location.reload();
});

/* scroll reveal — sections ignite as they enter the torchlight */
(function initReveal() {
  const targets = Array.from(document.querySelectorAll('main .panel, main .grid, main h2.center'))
    .filter(el => !el.closest('.hero'));
  if (!('IntersectionObserver' in window)) { return; }
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  targets.forEach(el => io.observe(el));
})();

/* quick-start adventure cards */
(function renderAdventures() {
  const grid = $('#adv-grid');
  if (!grid || typeof ADVENTURES === 'undefined') return;
  for (const id of ADVENTURE_LIST) {
    const adv = ADVENTURES[id];
    const card = document.createElement('div');
    card.className = 'card clickable adv-card';
    card.innerHTML = `
      <div class="adv-cover"><img src="${adv.cover}" alt=""><span class="adv-ico">${iconHtml(adv.icon)}</span></div>
      <h3 class="mt1" style="margin-bottom:.2rem;">${escapeHtml(I18n.t(adv.nameKey))}</h3>
      <p class="dim mt0" style="font-size:.85rem;">${escapeHtml(I18n.t(adv.descKey))}</p>
      <div class="row mt1" style="justify-content:space-between;align-items:center;">
        <span><span class="badge dim">⚔️ ${adv.foes}</span> <span class="badge dim">${escapeHtml(I18n.t('adv_lvl', { l: adv.lvl }))}</span></span>
        <a class="btn btn-sm btn-gold" href="create.html?tpl=${id}">${I18n.t('adv_begin')}</a>
      </div>`;
    grid.appendChild(card);
  }
})();

/* auth forms */
$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.login($('#login-user').value, $('#login-pass').value);
  if (r.error) return toast(r.error, 'err');
  toast(I18n.t('l_welcome', { name: escapeHtml(r.user.username) }), 'ok');
  setTimeout(() => location.reload(), 700);
});
$('#signup-form').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.signup($('#signup-user').value, $('#signup-pass').value);
  if (r.error) return toast(r.error, 'err');
  toast(I18n.t('l_forged', { name: escapeHtml(r.user.username) }), 'ok');
  setTimeout(() => location.reload(), 700);
});

/* if already signed in, swap the auth panel for a shortcut */
if (u && !u.guest) {
  $('#auth').innerHTML = `
    <div class="panel-title"><h2>${I18n.t('auth_h')}</h2></div>
    <p>${I18n.t('l_signed_as', { name: escapeHtml(u.name) })}</p>
    <div class="row">
      <a class="btn btn-primary" href="account.html">${I18n.t('l_open_account')}</a>
      <button class="btn btn-ghost" id="logout-btn">${I18n.t('a_logout')}</button>
    </div>`;
  $('#logout-btn').addEventListener('click', () => { Auth.logout(); location.reload(); });
} else if (u && u.guest) {
  $('#auth').querySelector('.panel-title h2').innerHTML = I18n.t('auth_h_guest');
}
