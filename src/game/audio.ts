let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let bed: GainNode | null = null;
let muted = false;
let windSrc: AudioBufferSourceNode | null = null;

function ac(): AudioContext | null {
  return ctx;
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    bed = ctx.createGain();
    sfx.gain.value = 0.85;
    bed.gain.value = 0.18;
    sfx.connect(master);
    bed.connect(master);
    master.connect(ctx.destination);
    startWind();
  }
  if (ctx.state === "suspended") void ctx.resume();
  applyMute();
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  applyMute();
}

export function isMuted() {
  return muted;
}

function applyMute() {
  if (!master || !ctx) return;
  const v = muted ? 0 : 1;
  master.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
}

function env(t: number, a: number, d: number, vol: number) {
  if (!ctx) return null;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}

function noise(len: number) {
  if (!ctx) return null;
  const buf = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * len)),
    ctx.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startWind() {
  if (!ctx || !bed) return;
  const buf = noise(2);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 380;
  const g = ctx.createGain();
  g.gain.value = 0.22;
  src.connect(f).connect(g).connect(bed);
  src.start();
  windSrc = src;
}

export function sfxShot(kind: string = "shotgun") {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const dur =
    kind === "smg"
      ? 0.055
      : kind === "rifle"
        ? 0.08
        : kind === "cannon"
          ? 0.24
          : kind === "flare"
            ? 0.18
            : 0.15;
  const buf = noise(dur);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value =
    kind === "smg"
      ? 1.65 + Math.random() * 0.2
      : kind === "rifle"
        ? 1.35 + Math.random() * 0.15
        : kind === "cannon"
          ? 0.58
          : kind === "flare"
            ? 0.78
            : 0.9 + Math.random() * 0.2;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value =
    kind === "smg"
      ? 2900
      : kind === "rifle"
        ? 2400
        : kind === "cannon"
          ? 400
          : kind === "flare"
            ? 1100
            : 1600 + Math.random() * 400;
  bp.Q.value = 0.65;
  const g = env(
    t,
    0.003,
    kind === "cannon" ? 0.22 : kind === "smg" ? 0.05 : 0.13,
    kind === "cannon" ? 0.72 : kind === "smg" ? 0.36 : 0.52,
  );
  if (!g) return;
  src.connect(bp).connect(g).connect(sfx);
  src.start(t);

  const osc = ctx.createOscillator();
  osc.type = kind === "flare" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(
    kind === "smg"
      ? 240
      : kind === "rifle"
        ? 190
        : kind === "cannon"
          ? 62
          : kind === "flare"
            ? 140
            : 96,
    t,
  );
  osc.frequency.exponentialRampToValueAtTime(
    kind === "cannon" ? 26 : 38,
    t + (kind === "smg" ? 0.05 : 0.11),
  );
  const g2 = env(
    t,
    0.003,
    kind === "cannon" ? 0.18 : kind === "smg" ? 0.05 : 0.1,
    kind === "smg" ? 0.3 : 0.5,
  );
  if (!g2) return;
  osc.connect(g2).connect(sfx);
  osc.start(t);
  osc.stop(t + (kind === "smg" ? 0.06 : 0.14));
}

export function sfxDash() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const buf = noise(0.18);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.09);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    const g = env(t, 0.01, 0.16, 0.42);
    if (g) {
      src.connect(f).connect(g).connect(sfx);
      src.start(t);
    }
  }
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.14);
  const g2 = env(t, 0.005, 0.14, 0.22);
  if (g2) {
    osc.connect(g2).connect(sfx);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export function sfxExplosion() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const buf = noise(0.38);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(680, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.36);
    const g = env(t, 0.006, 0.35, 0.78);
    if (g) {
      src.connect(lp).connect(g).connect(sfx);
      src.start(t);
    }
  }
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(84, t);
  osc.frequency.exponentialRampToValueAtTime(22, t + 0.32);
  const g2 = env(t, 0.004, 0.32, 0.65);
  if (g2) {
    osc.connect(g2).connect(sfx);
    osc.start(t);
    osc.stop(t + 0.35);
  }
}

export function sfxScreech() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(1650, t);
  osc.frequency.exponentialRampToValueAtTime(2150, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(1180, t + 0.26);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 2.2;
  const g = env(t, 0.015, 0.25, 0.24);
  if (!g) return;
  osc.connect(bp).connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.29);
}

export function sfxPickup() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(523, t);
  osc.frequency.setValueAtTime(784, t + 0.07);
  const g = env(t, 0.004, 0.16, 0.22);
  if (!g) return;
  osc.connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.18);
}

export function sfxPerk() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const at = t + idx * 0.055;
    const osc = ctx!.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    const g = env(at, 0.004, 0.16, 0.2);
    if (!g) return;
    osc.connect(g).connect(sfx!);
    osc.start(at);
    osc.stop(at + 0.18);
  });
}

export function sfxHit(combo = 1) {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const boost = Math.min(combo * 24, 260);
  osc.frequency.setValueAtTime(420 + boost, t);
  osc.frequency.exponentialRampToValueAtTime(140 + boost * 0.3, t + 0.09);
  const g = env(t, 0.002, 0.1, 0.28);
  if (!g) return;
  osc.connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.11);
}

export function sfxHurt() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);
  const g = env(t, 0.004, 0.16, 0.32);
  if (!g) return;
  osc.connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.18);
}

export function sfxReload(perfect = false) {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const click = (at: number, freq: number) => {
    const osc = ctx!.createOscillator();
    osc.type = perfect ? "triangle" : "square";
    osc.frequency.value = freq;
    const g = env(at, 0.001, 0.05, perfect ? 0.22 : 0.12);
    if (!g) return;
    osc.connect(g).connect(sfx!);
    osc.start(at);
    osc.stop(at + 0.06);
  };
  click(t, perfect ? 440 : 220);
  click(t + 0.07, perfect ? 660 : 310);
}

export function sfxWave() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(392, t);
  osc.frequency.setValueAtTime(523, t + 0.12);
  const g = env(t, 0.01, 0.28, 0.18);
  if (!g) return;
  osc.connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.32);
}

export function sfxOver() {
  if (!ctx || !sfx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.5);
  const g = env(t, 0.02, 0.5, 0.22);
  if (!g) return;
  osc.connect(g).connect(sfx);
  osc.start(t);
  osc.stop(t + 0.55);
}

void ac;
void windSrc;
