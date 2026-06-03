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
// 💀 Победа в задании над зомби
export function sfxKill() {
  tone({ freq: 520, freqEnd: 180, dur: 0.22, type: "sawtooth", gain: 0.2 });
  tone({ freq: 180, freqEnd: 60, dur: 0.3, type: "sine", gain: 0.18, delay: 0.08 });
}
// 🩸 Зомби кусает Лану
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
// 🧟 Рык зомби
export function sfxGrowl() {
  tone({ freq: 110, freqEnd: 55, dur: 0.45, type: "sawtooth", gain: 0.2 });
  tone({ freq: 85, freqEnd: 40, dur: 0.55, type: "square", gain: 0.14, delay: 0.05 });
  noise(0.5, 0.12, 350);
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

// Note frequencies
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  Cs4: 277.18, Ds4: 311.13, Fs4: 369.99, Gs4: 415.30, As4: 466.16,
  Cs5: 554.37, Ds5: 622.25, Fs5: 739.99,
};

// Menu — мечтательная, спокойная (pixel-arcade lobby)
const MENU_MELODY: Array<[string, number]> = [
  ["A4", 0.4], ["C5", 0.4], ["E5", 0.4], ["D5", 0.4],
  ["C5", 0.4], ["A4", 0.4], ["G4", 0.8],
  ["F4", 0.4], ["A4", 0.4], ["C5", 0.4], ["B4", 0.4],
  ["A4", 0.4], ["G4", 0.4], ["A4", 0.8],
];
const MENU_BASS: Array<[string, number]> = [
  ["A3", 0.8], ["F3", 0.8], ["G3", 0.8], ["E3", 0.8],
  ["F3", 0.8], ["C3", 0.8], ["G3", 0.8], ["A3", 0.8],
];

// Game — напряжённая, хоррор-арпеджио
const GAME_MELODY: Array<[string, number]> = [
  ["E4", 0.3], ["F4", 0.3], ["E4", 0.3], ["B3", 0.3],
  ["E4", 0.3], ["G4", 0.3], ["Fs4", 0.3], ["E4", 0.3],
  ["D4", 0.3], ["E4", 0.3], ["F4", 0.3], ["E4", 0.3],
  ["B3", 0.3], ["Cs4", 0.3], ["D4", 0.3], ["B3", 0.3],
];
const GAME_BASS: Array<[string, number]> = [
  ["E3", 0.6], ["E3", 0.6], ["E3", 0.6], ["B3", 0.6],
  ["A3", 0.6], ["A3", 0.6], ["E3", 0.6], ["B3", 0.6],
];

function scheduleLoop(track: "menu" | "game") {
  const a = ac(); if (!a) return;
  const melody = track === "menu" ? MENU_MELODY : GAME_MELODY;
  const bass = track === "menu" ? MENU_BASS : GAME_BASS;
  const melType: OscillatorType = track === "menu" ? "triangle" : "square";
  const bassType: OscillatorType = track === "menu" ? "sine" : "sawtooth";
  const melGain = track === "menu" ? 0.06 : 0.05;
  const bassGain = track === "menu" ? 0.05 : 0.06;

  let t = 0;
  for (const [n, d] of melody) { playNote(N[n], d * 0.9, t, melType, melGain); t += d; }
  const loopLen = t;
  let bt = 0;
  for (const [n, d] of bass) { playNote(N[n], d * 0.95, bt, bassType, bassGain); bt += d; }

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
