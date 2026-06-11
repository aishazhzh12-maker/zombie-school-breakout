// Lightweight WebAudio SFX — no external assets needed.
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) ctx = new AC();
    } catch { /* ignore */ }
  }
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(opts: {
  freq: number; type?: OscillatorType; dur: number; gain?: number;
  freqEnd?: number; delay?: number;
}) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + (opts.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + opts.dur);
  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0); osc.stop(t0 + opts.dur + 0.05);
}

function noise(dur: number, gain = 0.2, filterFreq = 1200, delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

// 🔫 Выстрел / убийство
export function sfxGunshot() {
  noise(0.18, 0.35, 2200);
  tone({ freq: 220, freqEnd: 60, dur: 0.18, type: "square", gain: 0.22 });
}
// 🏏 Удар битой
export function sfxBat() {
  tone({ freq: 380, freqEnd: 90, dur: 0.18, type: "triangle", gain: 0.25 });
  noise(0.12, 0.18, 800, 0.02);
}
// 💀 Победа в задании над куклой
export function sfxKill() {
  tone({ freq: 520, freqEnd: 180, dur: 0.22, type: "sawtooth", gain: 0.2 });
  tone({ freq: 180, freqEnd: 60, dur: 0.3, type: "sine", gain: 0.18, delay: 0.08 });
}
// 🩸 Кукла кусает Лану
export function sfxBite() {
  tone({ freq: 140, freqEnd: 70, dur: 0.18, type: "sawtooth", gain: 0.22 });
  noise(0.12, 0.18, 600);
}
// 😱 Лана умирает
export function sfxDeath() {
  tone({ freq: 660, freqEnd: 120, dur: 0.5, type: "triangle", gain: 0.25 });
  tone({ freq: 300, freqEnd: 50, dur: 0.7, type: "sawtooth", gain: 0.22, delay: 0.1 });
  noise(0.6, 0.15, 500, 0.15);
}
// 🧟 Рык куклой
export function sfxGrowl() {
  tone({ freq: 110, freqEnd: 55, dur: 0.45, type: "sawtooth", gain: 0.2 });
  tone({ freq: 85, freqEnd: 40, dur: 0.55, type: "square", gain: 0.14, delay: 0.05 });
  noise(0.5, 0.12, 350);
}
// 💥 Земля сотрясается от прыжка босса
export function sfxBoom() {
  tone({ freq: 80, freqEnd: 30, dur: 0.5, type: "sine", gain: 0.32 });
  tone({ freq: 50, freqEnd: 20, dur: 0.7, type: "sawtooth", gain: 0.22, delay: 0.02 });
  noise(0.6, 0.28, 200);
}
// 🏏 Свист биты в воздухе
export function sfxSwing() {
  tone({ freq: 700, freqEnd: 200, dur: 0.14, type: "triangle", gain: 0.18 });
  noise(0.1, 0.12, 1800);
}
// ✨ Поднял предмет
export function sfxPickup() {
  tone({ freq: 660, freqEnd: 990, dur: 0.12, type: "triangle", gain: 0.18 });
  tone({ freq: 880, freqEnd: 1320, dur: 0.12, type: "sine", gain: 0.15, delay: 0.08 });
}

// ===== Background music (two simple looping melodies) =====
let musicTimer: number | null = null;
let musicStop: (() => void) | null = null;
let currentTrack: "menu" | "game" | null = null;
let musicMuted = false;

export function setMusicMuted(m: boolean) {
  musicMuted = m;
  if (m) stopMusic();
  else if (currentTrack) {
    const t = currentTrack; currentTrack = null; playMusic(t);
  }
}

function playNote(freq: number, dur: number, when: number, type: OscillatorType = "triangle", gain = 0.08) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function playHorrorPad(root: number, dur: number, when: number, gain = 0.035) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(620, t0);
  filter.frequency.exponentialRampToValueAtTime(180, t0 + dur);
  const master = a.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(gain, t0 + 0.8);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  filter.connect(master).connect(a.destination);
  const ratios = [1, 1.015, 1.414];
  ratios.forEach((r, i) => {
    const osc = a.createOscillator();
    osc.type = i === 2 ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(root * r, t0);
    osc.detune.setValueAtTime(i === 1 ? -13 : i === 2 ? 9 : 0, t0);
    osc.connect(filter);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  });
}

function playMusicBoxTick(when: number, gain = 0.035) {
  playNote(N.Cs5, 0.08, when, "triangle", gain);
  playNote(N.G5, 0.08, when + 0.09, "sine", gain * 0.75);
}

// Note frequencies
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  Cs4: 277.18, Ds4: 311.13, Fs4: 369.99, Gs4: 415.30, As4: 466.16,
  Cs5: 554.37, Ds5: 622.25, Fs5: 739.99,
};

// Menu — quiet, uneasy music-box pulse.
const MENU_MELODY: Array<[string, number]> = [
  ["A4", 0.55], ["C5", 0.35], ["B4", 0.55], ["Fs4", 0.75],
  ["A4", 0.55], ["Ds5", 0.25], ["C5", 0.65], ["G4", 0.9],
  ["F4", 0.55], ["A4", 0.35], ["Gs4", 0.55], ["E4", 0.75],
  ["F4", 0.55], ["Cs5", 0.25], ["B4", 0.65], ["A4", 0.9],
];
const MENU_BASS: Array<[string, number]> = [
  ["A3", 1.2], ["Fs4", 0.4], ["F3", 1.2], ["E3", 0.4],
  ["D3", 1.2], ["Cs4", 0.4], ["E3", 1.2], ["A3", 0.4],
];

// Game — darker chase pulse with dissonant half-steps.
const GAME_MELODY: Array<[string, number]> = [
  ["E4", 0.22], ["F4", 0.22], ["E4", 0.22], ["B3", 0.34],
  ["E4", 0.22], ["Gs4", 0.22], ["F4", 0.22], ["E4", 0.34],
  ["D4", 0.22], ["Ds4", 0.22], ["D4", 0.22], ["A3", 0.34],
  ["Cs4", 0.22], ["D4", 0.22], ["F4", 0.22], ["B3", 0.34],
];
const GAME_BASS: Array<[string, number]> = [
  ["E3", 0.44], ["E3", 0.44], ["F3", 0.44], ["E3", 0.44],
  ["B3", 0.44], ["A3", 0.44], ["F3", 0.44], ["E3", 0.44],
];

function scheduleLoop(track: "menu" | "game") {
  const a = ac(); if (!a) return;
  const melody = track === "menu" ? MENU_MELODY : GAME_MELODY;
  const bass = track === "menu" ? MENU_BASS : GAME_BASS;
  const melType: OscillatorType = track === "menu" ? "triangle" : "square";
  const bassType: OscillatorType = track === "menu" ? "sine" : "sawtooth";
  const melGain = track === "menu" ? 0.038 : 0.042;
  const bassGain = track === "menu" ? 0.035 : 0.052;

  let t = 0;
  for (const [n, d] of melody) { playNote(N[n], d * 0.9, t, melType, melGain); t += d; }
  const loopLen = t;
  let bt = 0;
  for (const [n, d] of bass) { playNote(N[n], d * 0.95, bt, bassType, bassGain); bt += d; }
  playHorrorPad(track === "menu" ? N.A3 / 2 : N.E3 / 2, Math.max(4, loopLen - 0.1), 0, track === "menu" ? 0.018 : 0.032);
  if (track === "menu") {
    playMusicBoxTick(1.8, 0.026);
    playMusicBoxTick(4.7, 0.022);
  } else {
    playNote(N.Fs5, 0.12, 1.15, "sawtooth", 0.026);
    playNote(N.Cs5, 0.16, 3.05, "triangle", 0.022);
  }

  musicTimer = window.setTimeout(() => {
    if (currentTrack === track && !musicMuted) scheduleLoop(track);
  }, loopLen * 1000);
  musicStop = () => { if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; } };
}

export function playMusic(track: "menu" | "game") {
  if (currentTrack === track) return;
  stopMusic();
  currentTrack = track;
  if (musicMuted) return;
  // ensure AudioContext is alive (must be after user gesture)
  if (!ac()) return;
  scheduleLoop(track);
}

export function stopMusic() {
  if (musicStop) { musicStop(); musicStop = null; }
  musicTimer = null;
  currentTrack = null;
}
