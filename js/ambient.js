/* ambient.js — procedurally synthesized ambient loops (Web Audio) + URL tracks */
const Ambient = (() => {
  let ctx = null, nodes = [], gainNode = null, playing = null, audioEl = null;

  const PRESETS = [
    { id: 'rain',    name: 'Dungeon Rain',   icon: '🌧️', desc: 'Filtered rain hiss with distant rumble' },
    { id: 'tavern',  name: 'Tavern Noise',   icon: '🍺', desc: 'Warm crowd murmur and hearth crackle' },
    { id: 'cave',    name: 'Cave Drips',     icon: '💧', desc: 'Deep cavern drone with echoing drips' },
    { id: 'forest',  name: 'Night Forest',   icon: '🌲', desc: 'Soft wind through leaves, crickets' },
    { id: 'battle',  name: 'Battle Drums',   icon: '🥁', desc: 'Low war-drone with slow drum pulse' },
  ];

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(c, seconds = 2) {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function addNoise(c, { type = 'lowpass', freq = 800, q = 1, vol = 0.1, lfo = null }) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c); src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(gainNode);
    src.start();
    nodes.push(src, f, g);
    if (lfo) {
      const osc = c.createOscillator(); osc.frequency.value = lfo.rate;
      const og = c.createGain(); og.gain.value = lfo.depth;
      osc.connect(og); og.connect(f.frequency); osc.start();
      nodes.push(osc, og);
    }
    return { src, f, g };
  }

  function addTone(c, { freq = 220, type = 'sine', vol = 0.05, lfoRate = 0, lfoDepth = 0 }) {
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain(); g.gain.value = vol;
    o.connect(g); g.connect(gainNode); o.start();
    nodes.push(o, g);
    if (lfoRate) {
      const l = c.createOscillator(); l.frequency.value = lfoRate;
      const lg = c.createGain(); lg.gain.value = lfoDepth;
      l.connect(lg); lg.connect(g.gain); l.start();
      nodes.push(l, lg);
    }
    return o;
  }

  let dripTimer = null;
  function addDrips(c) {
    const drip = () => {
      if (!playing) return;
      const o = c.createOscillator(); o.type = 'sine';
      const f = 900 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(f * 0.5, c.currentTime + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
      o.connect(g); g.connect(gainNode); o.start(); o.stop(c.currentTime + 0.4);
      dripTimer = setTimeout(drip, 500 + Math.random() * 2600);
    };
    drip();
  }

  let drumTimer = null;
  function addDrums(c) {
    const hit = () => {
      if (!playing) return;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(75, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(38, c.currentTime + 0.25);
      const g = c.createGain();
      g.gain.setValueAtTime(0.22, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      o.connect(g); g.connect(gainNode); o.start(); o.stop(c.currentTime + 0.55);
      drumTimer = setTimeout(hit, [900, 900, 900, 1350][rint(0, 3)]);
    };
    hit();
  }

  function startPreset(id, volume = 0.5) {
    stop();
    const c = ensureCtx();
    gainNode = c.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(c.destination);
    playing = { kind: 'synth', id };

    switch (id) {
      case 'rain':
        addNoise(c, { type: 'highpass', freq: 1200, vol: 0.05 });
        addNoise(c, { type: 'lowpass', freq: 700, vol: 0.12, lfo: { rate: 0.08, depth: 250 } });
        addTone(c, { freq: 55, type: 'sine', vol: 0.03, lfoRate: 0.05, lfoDepth: 0.015 });
        break;
      case 'tavern':
        addNoise(c, { type: 'bandpass', freq: 420, q: 0.7, vol: 0.09, lfo: { rate: 0.12, depth: 160 } });
        addNoise(c, { type: 'bandpass', freq: 900, q: 1.4, vol: 0.04, lfo: { rate: 0.21, depth: 260 } });
        addTone(c, { freq: 110, type: 'triangle', vol: 0.02, lfoRate: 0.09, lfoDepth: 0.01 });
        break;
      case 'cave':
        addTone(c, { freq: 48, type: 'sine', vol: 0.07, lfoRate: 0.04, lfoDepth: 0.03 });
        addNoise(c, { type: 'lowpass', freq: 220, vol: 0.04 });
        addDrips(c);
        break;
      case 'forest':
        addNoise(c, { type: 'bandpass', freq: 2400, q: 0.4, vol: 0.025, lfo: { rate: 0.07, depth: 700 } });
        addNoise(c, { type: 'highpass', freq: 5200, vol: 0.012, lfo: { rate: 0.31, depth: 900 } });
        addTone(c, { freq: 90, type: 'sine', vol: 0.02 });
        break;
      case 'battle':
        addTone(c, { freq: 42, type: 'sawtooth', vol: 0.035, lfoRate: 0.1, lfoDepth: 0.02 });
        addNoise(c, { type: 'lowpass', freq: 300, vol: 0.05 });
        addDrums(c);
        break;
    }
    return playing;
  }

  function startURL(url, volume = 0.5) {
    stop();
    ensureCtx();
    audioEl = new Audio(url);
    audioEl.loop = true;
    audioEl.volume = clamp(volume, 0, 1);
    audioEl.play().catch(() => {});
    playing = { kind: 'url', id: url };
    return playing;
  }

  function play(track, volume = 0.5) {
    if (!track) return null;
    if (track.kind === 'synth') return startPreset(track.id, volume);
    if (track.kind === 'url' && track.url) return startURL(track.url, volume);
    return null;
  }

  function setVolume(v) {
    if (gainNode) gainNode.gain.value = clamp(v, 0, 1);
    if (audioEl) audioEl.volume = clamp(v, 0, 1);
  }

  function stop() {
    playing = null;
    clearTimeout(dripTimer); clearTimeout(drumTimer);
    nodes.forEach(n => { try { n.stop?.(); n.disconnect(); } catch {} });
    nodes = [];
    if (gainNode) { try { gainNode.disconnect(); } catch {} gainNode = null; }
    if (audioEl) { audioEl.pause(); audioEl = null; }
  }

  const isPlaying = () => playing;
  return { PRESETS, play, stop, setVolume, isPlaying };
})();
