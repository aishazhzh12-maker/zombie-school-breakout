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
