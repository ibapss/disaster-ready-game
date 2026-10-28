/*
 * Simple sound effects made with the Web Audio API.
 * No sound files are needed: every sound is a short generated beep
 * or a burst of filtered noise (for wind, rain and rumbling).
 *
 * Use:  DR.Audio.play('pickup')
 *       DR.Audio.ambient('rain', 0.3)   // background loop, volume 0..1
 */
DR.Audio = (function () {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let enabled = DR.Store.get('sound', true);
  const amb = { kind: null, src: null, gain: null, lfo: null, level: 0 };
  const VOLUME = 0.55;

  /** Creates the audio system on first use (browsers need a click first). */
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch (e) {
        return null;
      }
      master = ctx.createGain();
      master.gain.value = enabled ? VOLUME : 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Plays one beep. o = {type, vol, delay, slide (end frequency)} */
  function tone(freq, dur, o = {}) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.18, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function getNoise() {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  /** A short burst of filtered noise. o = {vol, freq, filter, delay} */
  function noise(dur, o = {}) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.value = o.freq || 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    click: () => tone(560, 0.06, { type: 'triangle', vol: 0.12 }),
    pickup: () => {
      tone(660, 0.09, { type: 'triangle' });
      tone(990, 0.14, { type: 'triangle', delay: 0.08 });
    },
    bad: () => tone(260, 0.28, { type: 'square', vol: 0.07, slide: 150 }),
    good: () => {
      tone(523, 0.1, { type: 'triangle' });
      tone(659, 0.1, { type: 'triangle', delay: 0.09 });
      tone(784, 0.2, { type: 'triangle', delay: 0.18 });
    },
    hurt: () => tone(190, 0.16, { type: 'sawtooth', vol: 0.05, slide: 120 }),
    tick: () => tone(1100, 0.04, { vol: 0.06 }),
    alarm: () => {
      for (let i = 0; i < 3; i++) {
        tone(880, 0.14, { type: 'square', vol: 0.05, delay: i * 0.3 });
        tone(660, 0.14, { type: 'square', vol: 0.05, delay: i * 0.3 + 0.15 });
      }
    },
    radio: () => {
      noise(0.25, { vol: 0.07, filter: 'bandpass', freq: 2500 });
      tone(1250, 0.08, { vol: 0.06, delay: 0.27 });
      tone(1250, 0.08, { vol: 0.06, delay: 0.4 });
    },
    splash: () => noise(0.35, { vol: 0.12, freq: 900 }),
    switch: () => {
      noise(0.05, { vol: 0.2, freq: 3000, filter: 'highpass' });
      tone(140, 0.12, { type: 'square', vol: 0.05, delay: 0.03 });
    },
    right: () => {
      tone(660, 0.1, { type: 'triangle' });
      tone(880, 0.18, { type: 'triangle', delay: 0.1 });
    },
    wrong: () => tone(220, 0.3, { type: 'triangle', vol: 0.12, slide: 180 }),
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.12 }));
      tone(1047, 0.45, { type: 'sine', delay: 0.5, vol: 0.12 });
    },
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.2, vol: 0.12 }))
  };

  /** Settings for each looping background sound. */
  const AMBIENT = {
    rumble: { filter: 'lowpass', freq: 110, gain: 2.2 },
    rain: { filter: 'bandpass', freq: 1400, gain: 0.5 },
    wind: { filter: 'lowpass', freq: 500, gain: 1.3, lfo: true },
    water: { filter: 'lowpass', freq: 700, gain: 0.6, lfo: true }
  };

  function stopAmbient() {
    if (amb.src) {
      try {
        amb.src.stop();
        if (amb.lfo) amb.lfo.stop();
      } catch (e) {
        /* already stopped */
      }
    }
    amb.src = amb.gain = amb.lfo = null;
    amb.kind = null;
    amb.level = 0;
  }

  return {
    play(name) {
      try {
        if (SFX[name]) SFX[name]();
      } catch (e) {
        /* sound is optional */
      }
    },

    /** Call from a click/tap handler so browsers allow sound. */
    unlock() {
      ensure();
    },

    isOn: () => enabled,

    setOn(on) {
      enabled = on;
      DR.Store.set('sound', on);
      if (master) master.gain.value = on ? VOLUME : 0;
    },

    toggle() {
      this.setOn(!enabled);
      return enabled;
    },

    /**
     * Starts/changes a looping background noise.
     * kind: 'rumble' | 'rain' | 'wind' | 'water' | null (stop). level: 0..1
     */
    ambient(kind, level = 0.5) {
      if (!kind) {
        stopAmbient();
        return;
      }
      if (!ctx && !ensure()) return;
      try {
        if (amb.kind !== kind) {
          stopAmbient();
          const cfg = AMBIENT[kind];
          const src = ctx.createBufferSource();
          src.buffer = getNoise();
          src.loop = true;
          const f = ctx.createBiquadFilter();
          f.type = cfg.filter;
          f.frequency.value = cfg.freq;
          const g = ctx.createGain();
          g.gain.value = 0;
          src.connect(f);
          f.connect(g);
          g.connect(master);
          if (cfg.lfo) {
            // slowly wobble the filter so wind/water "whooshes"
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.value = 0.25;
            lfoGain.gain.value = cfg.freq * 0.5;
            lfo.connect(lfoGain);
            lfoGain.connect(f.frequency);
            lfo.start();
            amb.lfo = lfo;
          }
          src.start();
          amb.src = src;
          amb.gain = g;
          amb.kind = kind;
          amb.level = -1;
        }
        if (Math.abs(amb.level - level) > 0.02) {
          amb.level = level;
          amb.gain.gain.setTargetAtTime(level * AMBIENT[kind].gain * 0.25, ctx.currentTime, 0.25);
        }
      } catch (e) {
        /* sound is optional */
      }
    }
  };
})();
