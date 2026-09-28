/* ambient.js — v2 soundscape synthesizer (Web Audio)
   Fully procedural ambience: layered coloured noise, musical drones,
   generated reverb & echo spaces, and randomized one-shot events.
   Public API unchanged: PRESETS, play(track, vol), stop(), setVolume(), isPlaying() */
const Ambient = (() => {
  let ctx = null;
  let master = null;          // master gain (volume control)
  let live = [];              // running sources/timers
  let playing = null;
  let audioEl = null;

  const PRESETS = [
    { id: 'cave',    name: 'Cathedral Cave',  icon: '💧', desc: 'Deep drone, echoing drips, vast stone reverb' },
    { id: 'rain',    name: 'Dungeon Rain',    icon: '🌧️', desc: 'Layered rain hiss, splashes, distant thunder' },
    { id: 'tavern',  name: 'Hearthside Inn',  icon: '🍺', desc: 'Crowd murmur, crackling fire, clinking mugs' },
    { id: 'forest',  name: 'Night Forest',    icon: '🌲', desc: 'Wind in the canopy, crickets, a far owl' },
    { id: 'battle',  name: 'War Drums',       icon: '🥁', desc: 'Marching drums over a grim droning horn' },
    { id: 'crypt',   name: 'Crypt Winds',     icon: '⚰️', desc: 'Hollow wind moaning through sealed halls' },
    { id: 'sanctum', name: 'Arcane Sanctum',  icon: '🔮', desc: 'Shimmering pad with slow celestial chimes' },
    { id: 'depths',  name: 'Sunken Depths',   icon: '🌊', desc: 'Muffled underwater drone, drifting bubbles' },
  ];

  /* ---------------- infrastructure ---------------- */
  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  function track(...nodes) { live.push(...nodes); }
  function every(fn, minMs, maxMs) {
    let dead = false;
    const loop = () => {
      if (dead || !playing) return;
      fn();
      setTimeout(loop, rnd(minMs, maxMs));
    };
    setTimeout(loop, rnd(minMs * 0.3, maxMs));
    live.push({ stop: () => { dead = true; }, disconnect() {} });
  }

  /* ---------------- noise colours ---------------- */
  const noiseCache = {};
  function noiseBuf(color) {
    if (noiseCache[color]) return noiseCache[color];
    const c = ctx, len = c.sampleRate * 3, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'white') d[i] = w * 0.9;
        else if (color === 'pink') { // Paul Kellet approximation
          b0 = 0.997 * b0 + 0.029591 * w; b1 = 0.985 * b1 + 0.032534 * w; b2 = 0.95 * b2 + 0.048056 * w;
          d[i] = (b0 + b1 + b2 + w * 0.05) * 2.1;
        } else { // brown — integrator
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.2;
        }
      }
    }
    noiseCache[color] = buf;
    return buf;
  }

  /* noise bed: looping coloured noise through a filter, optional slow LFO */
  function bed({ color = 'white', type = 'lowpass', freq = 800, q = 0.8, vol = 0.1, lfoRate = 0, lfoDepth = 0, attack = 2 }) {
    const c = ctx;
    const src = c.createBufferSource(); src.buffer = noiseBuf(color); src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    track(src, f, g);
    if (lfoRate) {
      const o = c.createOscillator(); o.frequency.value = lfoRate;
      const og = c.createGain(); og.gain.value = lfoDepth;
      o.connect(og); og.connect(f.frequency); o.start(); track(o, og);
    }
    return { src, f, g };
  }

  /* musical drone: detuned pair through a breathing lowpass, optional fifth */
  function drone({ freq = 55, type = 'sawtooth', vol = 0.04, lp = 320, lfoRate = 0.05, fifth = false }) {
    const c = ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + 4);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.6;
    const oscs = [freq, freq * 1.004].map(fr => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = fr;
      o.connect(f); o.start(); track(o); return o;
    });
    if (fifth) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * 1.5;
      const og = c.createGain(); og.gain.value = 0.4;
      o.connect(og); og.connect(f); o.start(); track(o, og);
    }
    // slow breathing of the filter — the drone feels alive
    const lfo = c.createOscillator(); lfo.frequency.value = lfoRate;
    const lg = c.createGain(); lg.gain.value = lp * 0.4;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start(); track(lfo, lg);
    f.connect(g); g.connect(master);
    track(f, g);
    return g;
  }

  /* generated impulse response for real-sounding spaces */
  function reverbIR(seconds = 3.2, decay = 2.6) {
    const c = ctx, rate = c.sampleRate, len = rate * seconds;
    const buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* send bus into a generated reverb space */
  function makeSpace(seconds, decay, wet = 0.5) {
    const c = ctx;
    const conv = c.createConvolver(); conv.buffer = reverbIR(seconds, decay);
    const g = c.createGain(); g.gain.value = wet;
    conv.connect(g); g.connect(master);
    track(conv, g);
    return conv;
  }

  /* echo corridor for drips and chimes */
  function makeEcho(time = 0.34, fb = 0.42, tone = 1800) {
    const c = ctx;
    const dl = c.createDelay(2); dl.delayTime.value = time;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = tone;
    const g = c.createGain(); g.gain.value = fb;
    dl.connect(f); f.connect(g); g.connect(dl);
    const out = c.createGain(); g.connect(out); out.connect(master);
    track(dl, f, g, out);
    return dl;
  }

  /* one-shot envelope helper */
  function blip({ type = 'sine', f0 = 800, f1 = null, t = 0.3, vol = 0.08, dest = master, curve = 'exp' }) {
    const c = ctx, now = c.currentTime;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (f1) o.frequency[curve === 'exp' ? 'exponentialRampToValueAtTime' : 'linearRampToValueAtTime'](Math.max(20, f1), now + t * 0.8);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    o.connect(g); g.connect(dest);
    o.start(now); o.stop(now + t + 0.05);
    return o;
  }
  function noiseHit({ dur = 0.2, vol = 0.08, type = 'bandpass', freq = 1000, q = 1, dest = master, attack = 0.005 }) {
    const c = ctx, now = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuf('white');
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(now, rnd(0, 1.5)); src.stop(now + dur + 0.1);
  }

  /* ---------------- preset voices ---------------- */
  function pCave() {
    const space = makeSpace(4.5, 2.2, 0.6);
    const echo = makeEcho(rnd(0.28, 0.38), 0.45, 1600);
    drone({ freq: 46, type: 'sawtooth', vol: 0.05, lp: 240, lfoRate: 0.045, fifth: true });
    bed({ color: 'brown', type: 'lowpass', freq: 160, vol: 0.05, lfoRate: 0.06, lfoDepth: 60 });
    bed({ color: 'pink', type: 'highpass', freq: 2600, vol: 0.008, lfoRate: 0.1, lfoDepth: 500 });
    every(() => { // echoing drips
      const f = rnd(700, 2100);
      blip({ f0: f, f1: f * 0.55, t: rnd(0.18, 0.34), vol: rnd(0.05, 0.1), dest: space });
      blip({ f0: f, f1: f * 0.55, t: 0.12, vol: 0.05, dest: echo });
    }, 900, 3400);
    every(() => { // deep rock groan
      noiseHit({ dur: rnd(1.4, 2.6), vol: 0.035, type: 'lowpass', freq: rnd(70, 120), dest: space, attack: rnd(0.4, 0.9) });
    }, 9000, 22000);
  }

  function pRain() {
    const space = makeSpace(2.2, 2.8, 0.35);
    bed({ color: 'pink', type: 'highpass', freq: 1400, vol: 0.055, lfoRate: 0.07, lfoDepth: 300 });   // steady patter
    bed({ color: 'white', type: 'bandpass', freq: 3400, q: 0.5, vol: 0.028, lfoRate: 0.16, lfoDepth: 900 }); // fine spray
    bed({ color: 'brown', type: 'lowpass', freq: 220, vol: 0.05, lfoRate: 0.05, lfoDepth: 70 });      // storm body
    drone({ freq: 55, type: 'sine', vol: 0.02, lp: 200, lfoRate: 0.03 });
    every(() => { // droplets hitting stone/puddles
      const f = rnd(1300, 3000);
      blip({ f0: f, f1: f * 0.6, t: 0.09, vol: rnd(0.02, 0.05), dest: space });
    }, 260, 900);
    every(() => { // distant thunder
      noiseHit({ dur: rnd(3, 5.5), vol: rnd(0.05, 0.09), type: 'lowpass', freq: rnd(90, 160), dest: master, attack: rnd(0.6, 1.4) });
    }, 14000, 34000);
  }

  function pTavern() {
    const space = makeSpace(1.4, 3, 0.25);
    bed({ color: 'brown', type: 'bandpass', freq: 380, q: 0.5, vol: 0.11, lfoRate: 0.13, lfoDepth: 140 }); // crowd body
    bed({ color: 'pink', type: 'bandpass', freq: 900, q: 1.2, vol: 0.045, lfoRate: 0.23, lfoDepth: 260 }); // chatter formant
    drone({ freq: 98, type: 'triangle', vol: 0.02, lp: 400, lfoRate: 0.08 }); // warm hearth hum
    every(() => { // fire crackle
      noiseHit({ dur: rnd(0.02, 0.06), vol: rnd(0.03, 0.07), type: 'highpass', freq: rnd(2200, 4200), dest: space });
    }, 90, 420);
    every(() => { // mug & coin clinks
      const f = rnd(2100, 3400);
      blip({ type: 'triangle', f0: f, t: rnd(0.12, 0.2), vol: rnd(0.03, 0.055), dest: space });
      blip({ type: 'triangle', f0: f * 1.34, t: 0.1, vol: 0.02, dest: space });
    }, 5000, 15000);
    every(() => { // burst of laughter/cheer
      noiseHit({ dur: rnd(0.5, 1.1), vol: rnd(0.03, 0.05), type: 'bandpass', freq: rnd(600, 1100), q: 0.8, dest: space, attack: 0.12 });
    }, 8000, 20000);
  }

  function pForest() {
    const space = makeSpace(2.6, 2.4, 0.3);
    bed({ color: 'pink', type: 'bandpass', freq: 2100, q: 0.35, vol: 0.03, lfoRate: 0.06, lfoDepth: 650 }); // wind in leaves
    bed({ color: 'brown', type: 'lowpass', freq: 190, vol: 0.045, lfoRate: 0.05, lfoDepth: 60 });           // deep wood hush
    every(() => { // cricket chirp trains
      const base = rnd(3800, 4600), n = 3 + (Math.random() * 4 | 0);
      for (let i = 0; i < n; i++) {
        setTimeout(() => playing && blip({ f0: base, t: 0.045, vol: 0.022, dest: space }), i * rnd(70, 95));
      }
    }, 700, 2100);
    every(() => { // far owl
      blip({ f0: 340, f1: 300, t: 0.5, vol: 0.04, dest: space, curve: 'lin' });
      setTimeout(() => playing && blip({ f0: 320, f1: 265, t: 0.7, vol: 0.035, dest: space, curve: 'lin' }), 650);
    }, 16000, 38000);
    every(() => { // branch snap
      noiseHit({ dur: 0.07, vol: 0.03, type: 'bandpass', freq: rnd(900, 1600), q: 2, dest: space });
    }, 9000, 24000);
  }

  function pBattle() {
    const space = makeSpace(2.0, 2.6, 0.3);
    drone({ freq: 49, type: 'sawtooth', vol: 0.05, lp: 300, lfoRate: 0.06, fifth: true }); // war horn drone
    bed({ color: 'brown', type: 'lowpass', freq: 260, vol: 0.06, lfoRate: 0.09, lfoDepth: 90 });
    let beat = 0;
    every(() => { // marching pattern: boom . boom-boom
      const accent = beat % 4 === 0;
      blip({ f0: 82, f1: 36, t: 0.34, vol: accent ? 0.2 : 0.13, dest: master });
      noiseHit({ dur: 0.09, vol: accent ? 0.05 : 0.03, type: 'highpass', freq: 3200, dest: space }); // skin slap
      beat++;
      if (beat % 4 === 3) setTimeout(() => playing && blip({ f0: 78, f1: 40, t: 0.26, vol: 0.1, dest: master }), 240);
    }, 1050, 1080);
    every(() => { // distant battle cries
      noiseHit({ dur: rnd(0.8, 1.6), vol: 0.028, type: 'bandpass', freq: rnd(500, 900), q: 1.4, dest: space, attack: 0.25 });
    }, 7000, 16000);
  }

  function pCrypt() {
    const space = makeSpace(5.2, 1.9, 0.65);
    const echo = makeEcho(0.46, 0.5, 900);
    bed({ color: 'brown', type: 'bandpass', freq: 320, q: 2.2, vol: 0.07, lfoRate: 0.05, lfoDepth: 160 }); // hollow wind
    bed({ color: 'pink', type: 'bandpass', freq: 780, q: 3, vol: 0.03, lfoRate: 0.083, lfoDepth: 240 });   // moaning formant
    drone({ freq: 41, type: 'sine', vol: 0.055, lp: 160, lfoRate: 0.035 });
    every(() => { // ghostly whisper sweep
      noiseHit({ dur: rnd(1.6, 3), vol: 0.02, type: 'highpass', freq: rnd(2600, 4200), dest: space, attack: rnd(0.6, 1.2) });
    }, 9000, 20000);
    every(() => { // stone settle / bone knock
      blip({ type: 'square', f0: rnd(140, 240), f1: 70, t: 0.09, vol: 0.03, dest: echo });
    }, 6000, 16000);
  }

  function pSanctum() {
    const space = makeSpace(4.8, 2.2, 0.6);
    drone({ freq: 110, type: 'sine', vol: 0.045, lp: 900, lfoRate: 0.04, fifth: true });
    drone({ freq: 165, type: 'sine', vol: 0.025, lp: 1200, lfoRate: 0.06 });
    bed({ color: 'pink', type: 'highpass', freq: 5200, vol: 0.012, lfoRate: 0.11, lfoDepth: 900 }); // arcane shimmer
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // A minor pentatonic-ish
    every(() => { // slow celestial chime
      const f = scale[Math.random() * scale.length | 0];
      blip({ f0: f, t: rnd(2.4, 3.6), vol: 0.035, dest: space });
      blip({ f0: f * 2, t: 1.4, vol: 0.012, dest: space });
    }, 4200, 9000);
  }

  function pDepths() {
    const space = makeSpace(3.4, 2.4, 0.55);
    bed({ color: 'brown', type: 'lowpass', freq: 140, vol: 0.1, lfoRate: 0.04, lfoDepth: 45 }); // pressure
    drone({ freq: 38, type: 'sine', vol: 0.06, lp: 130, lfoRate: 0.03 });
    bed({ color: 'pink', type: 'bandpass', freq: 500, q: 1.5, vol: 0.02, lfoRate: 0.07, lfoDepth: 180 }); // current
    every(() => { // rising bubble trails
      const n = 2 + (Math.random() * 4 | 0);
      let f = rnd(300, 700);
      for (let i = 0; i < n; i++) {
        setTimeout(() => { if (!playing) return; blip({ f0: f, f1: f * 1.8, t: 0.09, vol: 0.03, dest: space, curve: 'lin' }); f *= 1.22; }, i * rnd(90, 160));
      }
    }, 1400, 4200);
    every(() => { // far whale-like sweep
      blip({ f0: 90, f1: 160, t: 3.2, vol: 0.025, dest: space, curve: 'lin' });
    }, 22000, 45000);
  }

  const VOICES = { cave: pCave, rain: pRain, tavern: pTavern, forest: pForest, battle: pBattle, crypt: pCrypt, sanctum: pSanctum, depths: pDepths };

  /* ---------------- transport ---------------- */
  function startPreset(id, volume = 0.5) {
    stop();
    const c = ensureCtx();
    master = c.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(clamp(volume, 0, 1), c.currentTime + 1.2); // gentle fade-in
    master.connect(c.destination);
    playing = { kind: 'synth', id };
    (VOICES[id] || pCave)();
    return playing;
  }

  function startURL(url, volume = 0.5) {
    stop();
    ensureCtx();
    audioEl = new Audio(url);
    audioEl.loop = true;
    audioEl.volume = 0;
    audioEl.play().catch(() => {});
    const v = clamp(volume, 0, 1), t0 = Date.now();
    const fade = setInterval(() => { // manual fade-in
      const k = Math.min(1, (Date.now() - t0) / 1200);
      if (audioEl) audioEl.volume = v * k;
      if (k >= 1) clearInterval(fade);
    }, 60);
    live.push({ stop: () => clearInterval(fade), disconnect() {} });
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
    if (master) master.gain.value = clamp(v, 0, 1);
    if (audioEl) audioEl.volume = clamp(v, 0, 1);
  }

  function stop() {
    playing = null;
    live.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    live = [];
    if (master) { try { master.disconnect(); } catch {} master = null; }
    if (audioEl) { audioEl.pause(); audioEl = null; }
  }

  const isPlaying = () => playing;
  return { PRESETS, play, stop, setVolume, isPlaying };
})();
