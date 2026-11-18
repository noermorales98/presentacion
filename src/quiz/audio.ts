// Sonidos 8-bit generados con Web Audio (sin archivos). Música chiptune opcional.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem("noxy-quiz-muted") === "1";
} catch {
  /* ignorar */
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** llamar tras un gesto del usuario (clic / tecla) para desbloquear el audio */
export function unlockAudio() {
  ac();
}
export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("noxy-quiz-muted", m ? "1" : "0");
  } catch {
    /* ignorar */
  }
  if (master) master.gain.value = m ? 0 : 0.5;
}

type Wave = OscillatorType;
function tone(freq: number, dur: number, opts: { type?: Wave; vol?: number; at?: number; slideTo?: number } = {}) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "square";
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
  const v = opts.vol ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, opts: { vol?: number; at?: number; lowpass?: number; highpass?: number } = {}) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.vol ?? 0.25, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = src;
  if (opts.lowpass) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.lowpass;
    node.connect(f);
    node = f;
  }
  if (opts.highpass) {
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = opts.highpass;
    node.connect(f);
    node = f;
  }
  node.connect(g).connect(master);
  src.start(t0);
}

const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

export const sfx = {
  join() {
    tone(N(72), 0.08, { at: 0 });
    tone(N(79), 0.12, { at: 0.08 });
  },
  start() {
    [60, 64, 67, 72].forEach((n, i) => tone(N(n), 0.12, { at: i * 0.09 }));
  },
  question() {
    tone(N(76), 0.09);
    tone(N(83), 0.14, { at: 0.09 });
  },
  answerIn() {
    tone(N(88), 0.04, { vol: 0.08 });
  },
  tap() {
    tone(N(84), 0.05, { vol: 0.12 });
  },
  tick() {
    tone(N(96), 0.02, { vol: 0.05, type: "triangle" });
  },
  fightStart() {
    for (let i = 0; i < 8; i++) noise(0.07, { at: i * 0.07, lowpass: 600, vol: 0.2 });
    tone(N(45), 0.6, { type: "sawtooth", vol: 0.12, slideTo: N(52) });
  },
  hit() {
    noise(0.08, { vol: 0.22, lowpass: 2500 });
    tone(N(55), 0.07, { type: "square", vol: 0.12, slideTo: N(40) });
  },
  hitSmall() {
    noise(0.04, { vol: 0.1, lowpass: 3500 });
  },
  ko() {
    tone(N(76), 0.35, { type: "square", vol: 0.14, slideTo: N(40) });
  },
  explosion() {
    noise(0.5, { vol: 0.35, lowpass: 900 });
    tone(N(38), 0.4, { type: "sawtooth", vol: 0.16, slideTo: N(24) });
  },
  lightning() {
    noise(0.25, { vol: 0.3, highpass: 1500 });
    tone(N(100), 0.12, { type: "sawtooth", vol: 0.1, slideTo: N(50) });
  },
  freeze() {
    [96, 100, 103].forEach((n, i) => tone(N(n), 0.12, { type: "triangle", vol: 0.1, at: i * 0.04 }));
  },
  shatter() {
    noise(0.18, { vol: 0.2, highpass: 3000 });
  },
  meteor() {
    tone(N(90), 0.5, { type: "sawtooth", vol: 0.1, slideTo: N(40) });
  },
  victory() {
    [64, 67, 72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.13, { at: i * 0.07, vol: 0.16 }));
  },
  correct() {
    tone(N(72), 0.1);
    tone(N(79), 0.1, { at: 0.1 });
    tone(N(84), 0.22, { at: 0.2 });
  },
  wrong() {
    tone(N(52), 0.2, { type: "sawtooth", vol: 0.16 });
    tone(N(46), 0.3, { type: "sawtooth", vol: 0.16, at: 0.18 });
  },
  step() {
    tone(N(67), 0.05, { type: "triangle", vol: 0.1 });
  },
  fanfare() {
    const seq = [67, 67, 67, 72, 76, 79, 76, 79, 84];
    const dur = [0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0.1, 0.6];
    let t = 0;
    seq.forEach((n, i) => {
      tone(N(n), dur[i] + 0.05, { at: t, vol: 0.16 });
      tone(N(n - 12), dur[i] + 0.05, { at: t, vol: 0.08, type: "triangle" });
      t += dur[i] + 0.02;
    });
  },
};

/* ───────────── música chiptune de fondo ───────────── */
const SCALES: number[][] = [
  [0, 2, 4, 7, 9], // mayor pentatónica
  [0, 3, 5, 7, 10], // menor pentatónica
];
let musicTimer: number | null = null;
let step = 0;
let musicLevel = 0;

function musicTick() {
  const scale = SCALES[musicLevel % 2];
  const root = 57 + [0, 2, 5, 7, -2, 3, 9, 4, 0, 7][musicLevel % 10];
  const patt = [0, 2, 1, 3, 4, 3, 1, 2];
  const deg = patt[step % patt.length] + (step % 16 >= 8 ? 1 : 0);
  const note = root + scale[deg % scale.length] + 12 * Math.floor(deg / scale.length);
  tone(N(note + 12), 0.1, { vol: 0.045, type: "square" });
  if (step % 4 === 0) tone(N(root - 12 + scale[(step / 4) % 3]), 0.28, { vol: 0.06, type: "triangle" });
  if (step % 2 === 1) noise(0.03, { vol: 0.03, highpass: 6000 });
  step++;
}

export function startMusic(level = 0) {
  musicLevel = level;
  if (musicTimer !== null) return;
  ac();
  musicTimer = window.setInterval(musicTick, 170);
}
export function setMusicLevel(level: number) {
  musicLevel = level;
}
export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
