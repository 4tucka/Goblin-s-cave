/* embers.js — floating ember particle backdrop */
const Embers = (() => {
  function init(canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, parts = [];
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const n = Math.min(70, Math.floor(W / 22));
      parts = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(anywhere = false) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 10,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.25 + Math.random() * 0.75,
        vx: (Math.random() - 0.5) * 0.35,
        life: 0.6 + Math.random() * 0.4,
        hue: (352 + Math.random() * 22) % 360,
        wob: Math.random() * Math.PI * 2,
      };
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.wob += 0.02;
        p.x += p.vx + Math.sin(p.wob) * 0.25;
        p.y -= p.vy;
        p.life -= 0.0016;
        if (p.y < -12 || p.life <= 0) parts[i] = spawn();
        const a = Math.max(0, Math.min(1, p.life)) * 0.85;
        ctx.beginPath();
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue}, 100%, 66%, ${a})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 100%, 55%, ${a * 0.45})`);
        g.addColorStop(1, 'hsla(20,100%,50%,0)');
        ctx.fillStyle = g;
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', resize);
    resize();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);
  }
  return { init };
})();
