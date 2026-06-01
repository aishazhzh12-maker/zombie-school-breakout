import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  rooms, tasks, crewmates, bossRiddles, ADMIN_CODE, ADMIN_HINT,
  type Room, type Task, type RoomId,
} from "./data";
import {
  Zap, KeyRound, Download, Flame, Trash2, ToggleRight, CreditCard,
  CheckCircle2, X, Skull, Heart, MessageCircle,
} from "lucide-react";

const MAP_W = 1200;
const MAP_H = 700;
const PLAYER_R = 14;
const SPEED = 3.2;

type Vec = { x: number; y: number };

type Modal =
  | { kind: "none" }
  | { kind: "task"; task: Task }
  | { kind: "talk"; name: string; line: string }
  | { kind: "win" }
  | { kind: "lose" }
  | { kind: "boss" };

// ---- helpers ----
const inRect = (p: Vec, r: { x: number; y: number; w: number; h: number }, pad = 0) =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---- Pixel-art human sprites ----
// Grid 16x20 px-units, rendered crisp via shape-rendering crispEdges.
type PixelPalette = {
  skin: string; skinShade: string;
  hair: string; hairShade: string;
  shirt: string; shirtShade: string;
  pants: string; pantsShade: string;
  shoes: string;
  eyes?: string;
};

function PixelHuman({ palette, facing = 1, size = 56, variant = "student", dead = false }:
  { palette: PixelPalette; facing?: 1 | -1; size?: number; variant?: "student" | "girl" | "boss"; dead?: boolean }) {
  // Build grid using cells (x,y,color). Use rectangles for crisp pixels.
  // 16 columns x 20 rows
  const px = (x: number, y: number, c: string, w = 1, h = 1) =>
    <rect key={`${x}-${y}-${c}`} x={x} y={y} width={w} height={h} fill={c} />;

  const isGirl = variant === "girl";
  const isBoss = variant === "boss";
  const cells: React.ReactNode[] = [];

  // Hair back (girl: long hair behind body)
  if (isGirl) {
    cells.push(px(4, 11, palette.hairShade, 8, 5));
    cells.push(px(3, 12, palette.hairShade, 1, 3));
    cells.push(px(12, 12, palette.hairShade, 1, 3));
  }

  // Head (rows 2..6)
  // skin block
  cells.push(px(6, 2, palette.skin, 4, 5));
  cells.push(px(5, 3, palette.skin, 6, 3));
  // skin shading right side
  cells.push(px(10, 3, palette.skinShade, 1, 3));
  cells.push(px(9, 6, palette.skinShade, 1, 1));
  // hair top
  cells.push(px(5, 1, palette.hair, 6, 1));
  cells.push(px(4, 2, palette.hair, 8, 1));
  cells.push(px(4, 3, palette.hair, 1, 2));
  cells.push(px(11, 3, palette.hair, 1, 2));
  if (isGirl) {
    // bangs
    cells.push(px(5, 3, palette.hair, 2, 1));
    cells.push(px(9, 3, palette.hair, 2, 1));
  }
  if (isBoss) {
    // bald with side gray
    cells.push(px(5, 2, palette.skin, 6, 1));
    cells.push(px(4, 2, palette.hair, 1, 2));
    cells.push(px(11, 2, palette.hair, 1, 2));
  }
  // eyes
  cells.push(px(6, 4, palette.eyes ?? "#1b1b1b", 1, 1));
  cells.push(px(9, 4, palette.eyes ?? "#1b1b1b", 1, 1));
  // mouth
  if (isBoss) {
    cells.push(px(7, 6, "#5a0a0a", 2, 1));
  } else {
    cells.push(px(7, 6, "#8a3a3a", 2, 1));
  }
  // neck
  cells.push(px(7, 7, palette.skinShade, 2, 1));

  // Body / shirt (rows 8..13)
  cells.push(px(4, 8, palette.shirt, 8, 5));
  cells.push(px(3, 9, palette.shirt, 1, 3));
  cells.push(px(12, 9, palette.shirt, 1, 3));
  // shirt shading
  cells.push(px(11, 8, palette.shirtShade, 1, 5));
  cells.push(px(4, 12, palette.shirtShade, 8, 1));
  if (isGirl) {
    // collar / detail
    cells.push(px(7, 8, "#ffffff", 2, 1));
  }
  if (isBoss) {
    // tie
    cells.push(px(7, 8, "#1b1b1b", 2, 4));
    cells.push(px(7, 12, "#1b1b1b", 2, 1));
  }
  // arms
  cells.push(px(3, 8, palette.shirt, 1, 1));
  cells.push(px(12, 8, palette.shirt, 1, 1));
  // hands
  cells.push(px(3, 12, palette.skin, 1, 1));
  cells.push(px(12, 12, palette.skin, 1, 1));

  // Pants / legs (rows 13..17)
  cells.push(px(5, 13, palette.pants, 6, 4));
  cells.push(px(5, 13, palette.pants, 2, 4));
  cells.push(px(9, 13, palette.pants, 2, 4));
  cells.push(px(7, 13, palette.pantsShade, 2, 4));
  // shoes
  cells.push(px(4, 17, palette.shoes, 3, 1));
  cells.push(px(9, 17, palette.shoes, 3, 1));

  // Girl: hair down sides
  if (isGirl) {
    cells.push(px(4, 7, palette.hair, 1, 3));
    cells.push(px(11, 7, palette.hair, 1, 3));
  }

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 16 20"
      style={{ transform: `scaleX(${facing})`, imageRendering: "pixelated", shapeRendering: "crispEdges" }}>
      {/* shadow */}
      <ellipse cx="8" cy="19" rx="4" ry="0.6" fill="#000" opacity="0.5" />
      {cells}
      {dead && <text x="8" y="6" textAnchor="middle" fontSize="3" fill="red">X</text>}
    </svg>
  );
}

// Palettes
const PAL_LANA: PixelPalette = {
  skin: "#f4c8a8", skinShade: "#d49a78",
  hair: "#c4377a", hairShade: "#7a1e4a",
  shirt: "#ff6aa8", shirtShade: "#a83a6a",
  pants: "#3a3a55", pantsShade: "#1f1f33",
  shoes: "#1a1a1a",
};
const PAL_MILA: PixelPalette = {
  skin: "#f0c098", skinShade: "#c89070",
  hair: "#6b3a1a", hairShade: "#3a1f0a",
  shirt: "#e84545", shirtShade: "#8a2222",
  pants: "#2a2a3a", pantsShade: "#15151f",
  shoes: "#1a1a1a",
};
const PAL_ARSENY: PixelPalette = {
  skin: "#e8b890", skinShade: "#b8855f",
  hair: "#1a1a1a", hairShade: "#000000",
  shirt: "#3aa3ff", shirtShade: "#1f5a8a",
  pants: "#2a2a3a", pantsShade: "#15151f",
  shoes: "#3a2a1a",
};
const PAL_VIKA: PixelPalette = {
  skin: "#f8d0b0", skinShade: "#d49a78",
  hair: "#e8c038", hairShade: "#8a6a1a",
  shirt: "#ffd23a", shirtShade: "#a87a1f",
  pants: "#3a2a4a", pantsShade: "#1f1530",
  shoes: "#2a1a1a",
};
const PAL_TIMUR: PixelPalette = {
  skin: "#d8a878", skinShade: "#a87850",
  hair: "#2a1a0a", hairShade: "#000000",
  shirt: "#7ad84a", shirtShade: "#3a7a22",
  pants: "#2a2a2a", pantsShade: "#0a0a0a",
  shoes: "#1a1a1a",
};
const PAL_BOSS: PixelPalette = {
  skin: "#c8a890", skinShade: "#8a5a3a",
  hair: "#8a8a8a", hairShade: "#3a3a3a",
  shirt: "#1f1f2a", shirtShade: "#0a0a14",
  pants: "#0a0a0a", pantsShade: "#000000",
  shoes: "#000000",
  eyes: "#ff3030",
};

const PALETTES: Record<string, PixelPalette> = {
  lana: PAL_LANA, "#e84545": PAL_MILA, "#3aa3ff": PAL_ARSENY, "#ffd23a": PAL_VIKA, "#7ad84a": PAL_TIMUR,
};

// Backwards-compatible API used elsewhere in this file
function Crewmate({ color, facing = 1, size = 56, dead = false }: { color: string; facing?: 1 | -1; size?: number; dead?: boolean }) {
  const isLana = color === "#ff66aa";
  const palette = isLana ? PAL_LANA : (PALETTES[color] ?? { ...PAL_MILA, shirt: color, shirtShade: color });
  return <PixelHuman palette={palette} facing={facing} size={size} variant={isLana ? "girl" : "student"} dead={dead} />;
}

function Impostor({ size = 80 }: { size?: number }) {
  return <PixelHuman palette={PAL_BOSS} size={size} variant="boss" />;
}


// ============== TASK MINI-GAMES ==============

// 1) WIRES
function WiresGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const colors = useMemo(() => {
    const c = ["#e84545", "#3aa3ff", "#ffd23a", "#7ad84a"];
    const left = [...c];
    const right = [...c].sort(() => Math.random() - 0.5);
    return { left, right };
  }, []);
  const [connections, setConnections] = useState<Record<number, number>>({});
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [mouse, setMouse] = useState<Vec>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const leftY = (i: number) => 40 + i * 70;
  const rightY = (i: number) => 40 + i * 70;

  const allDone = Object.keys(connections).length === 4 &&
    Object.entries(connections).every(([l, r]) => colors.left[+l] === colors.right[r]);

  useEffect(() => { if (allDone) setTimeout(() => onDone(true), 500); }, [allDone, onDone]);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">Перетащи провода: соедини одинаковые цвета.</p>
      <svg ref={svgRef} width={360} height={320} onMouseMove={onMove} onMouseUp={() => setDragFrom(null)} className="bg-black/40 rounded">
        {/* connections */}
        {Object.entries(connections).map(([l, r]) => (
          <line key={l} x1={40} y1={leftY(+l)} x2={320} y2={rightY(r)}
            stroke={colors.left[+l]} strokeWidth={6} strokeLinecap="round" />
        ))}
        {/* dragging line */}
        {dragFrom !== null && (
          <line x1={40} y1={leftY(dragFrom)} x2={mouse.x} y2={mouse.y}
            stroke={colors.left[dragFrom]} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        )}
        {/* left ports */}
        {colors.left.map((c, i) => (
          <g key={`L${i}`} onMouseDown={() => { setDragFrom(i); setConnections(p => { const n = { ...p }; delete n[i]; return n; }); }} style={{ cursor: "pointer" }}>
            <rect x={10} y={leftY(i) - 18} width={30} height={36} fill="#222" stroke="#666" />
            <circle cx={40} cy={leftY(i)} r={10} fill={c} stroke="#000" strokeWidth={2} />
          </g>
        ))}
        {/* right ports */}
        {colors.right.map((c, i) => (
          <g key={`R${i}`} onMouseUp={() => {
            if (dragFrom !== null) {
              setConnections(p => ({ ...p, [dragFrom]: i }));
              setDragFrom(null);
            }
          }} style={{ cursor: "pointer" }}>
            <circle cx={320} cy={rightY(i)} r={10} fill={c} stroke="#000" strokeWidth={2} />
            <rect x={320} y={rightY(i) - 18} width={30} height={36} fill="#222" stroke="#666" />
          </g>
        ))}
      </svg>
      {allDone && <p className="text-primary font-bold">✓ Готово!</p>}
    </div>
  );
}

// 2) CODE
function CodeGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (val === ADMIN_CODE) onDone(true);
    else { setErr(true); setTimeout(() => setErr(false), 400); }
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground text-center">{ADMIN_HINT}</p>
      <div className={`flex gap-2 ${err ? "shake" : ""}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-12 h-14 border-2 border-primary/60 bg-black/50 rounded flex items-center justify-center text-2xl font-display">
            {val[i] ?? ""}
          </div>
        ))}
      </div>
      <Input autoFocus inputMode="numeric" maxLength={4} value={val}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="text-center w-40 tracking-[0.5em] font-mono" />
      <Button onClick={submit} disabled={val.length !== 4}>
        <KeyRound className="mr-2 h-4 w-4" /> Подтвердить
      </Button>
    </div>
  );
}

// 3) DOWNLOAD — hold button
function DownloadGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const tick = () => {
      setProgress(p => {
        const np = holding.current ? Math.min(100, p + 1) : Math.max(0, p - 0.5);
        if (np >= 100) { onDone(true); return 100; }
        return np;
      });
      ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [onDone]);
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Зажми и держи кнопку. Отпустишь — откатится.</p>
      <div className="w-72 h-6 bg-black/60 rounded overflow-hidden border border-primary/40">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <Button size="lg"
        onMouseDown={() => (holding.current = true)}
        onMouseUp={() => (holding.current = false)}
        onMouseLeave={() => (holding.current = false)}
        onTouchStart={() => (holding.current = true)}
        onTouchEnd={() => (holding.current = false)}>
        <Download className="mr-2 h-4 w-4" /> ДЕРЖАТЬ
      </Button>
      <p className="font-mono text-primary">{Math.floor(progress)}%</p>
    </div>
  );
}

// 4) REACTOR — Simon
function ReactorGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [seq] = useState(() => Array.from({ length: 5 }, () => Math.floor(Math.random() * 4)));
  const [step, setStep] = useState(0);
  const [showing, setShowing] = useState(-1);
  const [phase, setPhase] = useState<"watch" | "input">("watch");

  useEffect(() => {
    if (phase !== "watch") return;
    let i = 0;
    const t = setInterval(() => {
      setShowing(seq[i]);
      setTimeout(() => setShowing(-1), 400);
      i++;
      if (i >= seq.length) { clearInterval(t); setTimeout(() => setPhase("input"), 500); }
    }, 700);
    return () => clearInterval(t);
  }, [phase, seq]);

  const press = (i: number) => {
    if (phase !== "input") return;
    if (seq[step] === i) {
      setShowing(i); setTimeout(() => setShowing(-1), 200);
      if (step + 1 >= seq.length) { onDone(true); return; }
      setStep(step + 1);
    } else {
      setStep(0); setPhase("watch");
    }
  };

  const cols = ["#e84545", "#3aa3ff", "#ffd23a", "#7ad84a"];
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{phase === "watch" ? "Запоминай…" : "Повтори последовательность"}</p>
      <div className="grid grid-cols-2 gap-3">
        {cols.map((c, i) => (
          <button key={i} onClick={() => press(i)}
            className="w-28 h-28 rounded-lg border-2 border-black/60 transition-all"
            style={{ background: c, opacity: showing === i ? 1 : 0.45, transform: showing === i ? "scale(1.05)" : "scale(1)" }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Шаг {step}/{seq.length}</p>
    </div>
  );
}

// 5) TRASH — hold lever
function TrashGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [level, setLevel] = useState(100);
  const holding = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      setLevel(l => {
        const nl = holding.current ? Math.max(0, l - 1.5) : Math.min(100, l + 0.6);
        if (nl <= 0) onDone(true);
        return nl;
      });
    }, 30);
    return () => clearInterval(id);
  }, [onDone]);
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">Тяни рычаг вниз, пока бак не опустеет.</p>
      <div className="w-32 h-56 bg-black/60 border-2 border-amber-700 rounded relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700 to-amber-500" style={{ height: `${level}%` }}>
          <div className="text-[10px] text-center pt-1">🗑️</div>
        </div>
      </div>
      <Button size="lg"
        onMouseDown={() => (holding.current = true)} onMouseUp={() => (holding.current = false)} onMouseLeave={() => (holding.current = false)}
        onTouchStart={() => (holding.current = true)} onTouchEnd={() => (holding.current = false)}>
        <Trash2 className="mr-2 h-4 w-4" /> ТЯНУТЬ
      </Button>
    </div>
  );
}

// 6) SWITCHES
function SwitchesGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [s, setS] = useState<boolean[]>(() => Array.from({ length: 5 }, () => Math.random() < 0.5));
  useEffect(() => { if (s.every(Boolean)) setTimeout(() => onDone(true), 300); }, [s, onDone]);
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Все рубильники должны быть ВКЛ.</p>
      <div className="flex gap-3 bg-black/60 p-4 rounded border border-amber-700">
        {s.map((on, i) => (
          <button key={i} onClick={() => setS(p => p.map((v, j) => j === i ? !v : v))}
            className="w-12 h-24 bg-zinc-800 rounded relative border border-zinc-600">
            <div className="absolute left-1 right-1 h-10 rounded bg-gradient-to-b from-zinc-300 to-zinc-500 transition-all"
              style={{ top: on ? 4 : 40 }} />
            <div className={`absolute bottom-1 left-0 right-0 text-[10px] text-center font-bold ${on ? "text-emerald-400" : "text-red-400"}`}>
              {on ? "ON" : "OFF"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// 7) SWIPE — drag a card horizontally at proper speed
function SwipeGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [x, setX] = useState(0);
  const drag = useRef<{ start: number; t: number } | null>(null);
  const [msg, setMsg] = useState("Проведи карту →");
  const slot = useRef<HTMLDivElement>(null);

  const finish = (speed: number) => {
    if (x < 250) { setMsg("Слишком коротко"); setX(0); return; }
    if (speed < 0.4) setMsg("Слишком медленно — повтори");
    else if (speed > 2.2) setMsg("Слишком быстро — повтори");
    else { setMsg("✓ Принято"); onDone(true); return; }
    setX(0);
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">Проведи плавно — не слишком быстро и не медленно.</p>
      <div ref={slot} className="relative w-80 h-24 bg-black/70 border-2 border-primary/50 rounded overflow-hidden">
        <div className="absolute top-0 bottom-0 right-0 w-2 bg-primary/60" />
        <div
          className="absolute top-2 bottom-2 w-20 rounded bg-gradient-to-br from-amber-300 to-amber-600 border-2 border-amber-900 cursor-grab active:cursor-grabbing flex items-center justify-center text-xs font-bold text-amber-950"
          style={{ left: x + 4 }}
          onMouseDown={(e) => { drag.current = { start: e.clientX - x, t: performance.now() }; }}
          onMouseMove={(e) => { if (drag.current) setX(clamp(e.clientX - drag.current.start, 0, 280)); }}
          onMouseUp={() => { if (drag.current) { const dt = (performance.now() - drag.current.t) / 1000; finish(x / 200 / Math.max(dt, 0.05)); drag.current = null; } }}
          onMouseLeave={() => { if (drag.current) { setX(0); drag.current = null; setMsg("Не отрывай"); } }}
        >
          <CreditCard className="h-6 w-6" />
        </div>
      </div>
      <p className="text-sm text-primary font-bold">{msg}</p>
    </div>
  );
}

// ============== TASK ICONS ==============
function TaskIcon({ kind, className = "" }: { kind: Task["kind"]; className?: string }) {
  const map = { wires: Zap, code: KeyRound, download: Download, reactor: Flame, trash: Trash2, switches: ToggleRight, swipe: CreditCard };
  const I = map[kind];
  return <I className={className} />;
}

// ============== BOSS RIDDLE ==============
function BossFight({ onWin, onLose }: { onWin: () => void; onLose: () => void }) {
  const [step, setStep] = useState(0);
  const [hp, setHp] = useState(3);
  const q = bossRiddles[step];
  const answer = (i: number) => {
    if (i === q.answer) {
      if (step + 1 >= bossRiddles.length) onWin();
      else setStep(step + 1);
    } else {
      const nh = hp - 1;
      setHp(nh);
      if (nh <= 0) onLose();
    }
  };
  return (
    <div className="flex flex-col items-center gap-4 max-w-md">
      <Impostor size={120} />
      <h3 className="font-display text-red-400 text-lg">ДИРЕКТОР-ИМПОСТОР</h3>
      <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => (
        <Heart key={i} className={`h-5 w-5 ${i < hp ? "fill-red-500 text-red-500" : "text-zinc-700"}`} />
      ))}</div>
      <p className="text-center text-base">{q.question}</p>
      <div className="grid grid-cols-2 gap-2 w-full">
        {q.options.map((o, i) => (
          <Button key={i} variant="secondary" onClick={() => answer(i)}>{o}</Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Загадка {step + 1} / {bossRiddles.length}</p>
    </div>
  );
}

// ============== MAIN ==============
export default function EscapeGame() {
  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState<Vec>({ x: 200, y: 140 });
  const [facing, setFacing] = useState<1 | -1>(1);
  const [moving, setMoving] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [hint, setHint] = useState<string>("");
  const keys = useRef<Record<string, boolean>>({});
  const posRef = useRef(pos);
  posRef.current = pos;
  const viewportRef = useRef<HTMLDivElement>(null);

  // input
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // interact key
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (modal.kind !== "none") return;
      if (e.key.toLowerCase() === "e" || e.key === "Enter") {
        // nearest task
        const near = tasks.find(t => !done.has(t.id) && dist(posRef.current, { x: t.x, y: t.y }) < 50);
        if (near) { setModal({ kind: "task", task: near }); return; }
        // boss check
        if (done.size === tasks.length) {
          const cafeteria = rooms.find(r => r.id === "cafeteria")!;
          if (inRect(posRef.current, cafeteria)) { setModal({ kind: "boss" }); return; }
        }
        // talk
        const cm = crewmates.find(c => {
          const r = rooms.find(rr => rr.id === c.room)!;
          return dist(posRef.current, { x: r.x + c.ox, y: r.y + c.oy }) < 60;
        });
        if (cm) setModal({ kind: "talk", name: cm.name, line: cm.line });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal.kind, done]);

  // game loop
  useEffect(() => {
    if (!started || modal.kind !== "none") { setMoving(false); return; }
    let raf = 0;
    const tick = () => {
      let dx = 0, dy = 0;
      if (keys.current["w"] || keys.current["arrowup"]) dy -= 1;
      if (keys.current["s"] || keys.current["arrowdown"]) dy += 1;
      if (keys.current["a"] || keys.current["arrowleft"]) { dx -= 1; setFacing(-1); }
      if (keys.current["d"] || keys.current["arrowright"]) { dx += 1; setFacing(1); }
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        dx = (dx / mag) * SPEED; dy = (dy / mag) * SPEED;
        setMoving(true);
        setPos(p => {
          // restrict to rooms/corridor: must be inside ANY room
          const np = { x: clamp(p.x + dx, PLAYER_R, MAP_W - PLAYER_R), y: clamp(p.y + dy, PLAYER_R, MAP_H - PLAYER_R) };
          const tryX = { x: np.x, y: p.y };
          const tryY = { x: p.x, y: np.y };
          const ok = (q: Vec) => rooms.some(r => inRect(q, r, 10));
          const next = { x: ok(tryX) ? np.x : p.x, y: ok(tryY) ? np.y : p.y };
          return next;
        });
      } else setMoving(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, modal.kind]);

  // hint near task
  useEffect(() => {
    const id = setInterval(() => {
      const near = tasks.find(t => !done.has(t.id) && dist(posRef.current, { x: t.x, y: t.y }) < 50);
      if (near) { setHint(`[E] ${near.title}`); return; }
      const cm = crewmates.find(c => {
        const r = rooms.find(rr => rr.id === c.room)!;
        return dist(posRef.current, { x: r.x + c.ox, y: r.y + c.oy }) < 60;
      });
      if (cm) { setHint(`[E] Поговорить с ${cm.name}`); return; }
      if (done.size === tasks.length) {
        const cafe = rooms.find(r => r.id === "cafeteria")!;
        if (inRect(posRef.current, cafe)) { setHint("[E] СБЕЖАТЬ через столовую — но Директор ждёт!"); return; }
      }
      setHint("");
    }, 120);
    return () => clearInterval(id);
  }, [done]);

  // camera follow
  const cam = useMemo(() => {
    const el = viewportRef.current;
    const vw = el?.clientWidth ?? 800;
    const vh = el?.clientHeight ?? 600;
    return {
      x: clamp(pos.x - vw / 2, 0, MAP_W - vw),
      y: clamp(pos.y - vh / 2, 0, MAP_H - vh),
    };
  }, [pos]);

  const finishTask = useCallback((ok: boolean) => {
    if (ok && modal.kind === "task") {
      setDone(prev => new Set(prev).add(modal.task.id));
    }
    setModal({ kind: "none" });
  }, [modal]);

  if (!started) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 p-6">
        <div className="max-w-2xl text-center space-y-6">
          <div className="flex justify-center gap-3 mb-4">
            <Crewmate color="#ff66aa" />
            <Crewmate color="#3aa3ff" />
            <Impostor size={72} />
            <Crewmate color="#ffd23a" />
            <Crewmate color="#7ad84a" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-primary">СБЕГИ ИЗ ШКОЛЫ</h1>
          <p className="text-muted-foreground">
            Школа захвачена. Среди вас — <span className="text-red-400 font-bold">импостор-Директор</span>.
            Лана и одноклассники должны выполнить все задания, чтобы открыть выход через столовую — и победить босса.
          </p>
          <div className="text-left text-sm bg-black/40 rounded p-4 space-y-1">
            <p>🎮 <b>WASD</b> или <b>стрелки</b> — двигаться</p>
            <p>⚡ <b>E</b> / <b>Enter</b> — взаимодействовать (задание / диалог)</p>
            <p>✅ Выполни все 7 заданий → иди в <b>Столовую</b> на финального босса</p>
          </div>
          <Button size="lg" onClick={() => setStarted(true)} className="font-display">
            НАЧАТЬ
          </Button>
        </div>
      </div>
    );
  }

  const progress = done.size;
  const total = tasks.length;

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-foreground relative select-none">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crewmate color="#ff66aa" size={36} />
          <div>
            <div className="font-display text-sm text-primary">ЛАНА</div>
            <div className="text-xs text-muted-foreground">Школа №7 · Карантин</div>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-6">
          <div className="flex justify-between text-xs mb-1">
            <span>Задания</span>
            <span className="font-mono">{progress} / {total}</span>
          </div>
          <div className="h-3 bg-black/60 rounded border border-primary/40 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-primary transition-all" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="flex gap-1 justify-end mb-1">
            {tasks.map(t => (
              <div key={t.id} title={t.title}
                className={`w-6 h-6 rounded flex items-center justify-center border ${done.has(t.id) ? "bg-emerald-500/30 border-emerald-400 text-emerald-300" : "bg-black/40 border-zinc-600 text-zinc-500"}`}>
                <TaskIcon kind={t.kind} className="h-3 w-3" />
              </div>
            ))}
          </div>
          {done.size === total && <div className="text-red-400 font-bold animate-pulse">→ Столовая: финал!</div>}
        </div>
      </div>

      {/* Map viewport */}
      <div ref={viewportRef} className="absolute inset-0 pt-16">
        <div className="relative" style={{ width: MAP_W, height: MAP_H, transform: `translate(${-cam.x}px, ${-cam.y}px)` }}>
          {/* space background */}
          <div className="absolute -inset-40 bg-[radial-gradient(ellipse_at_center,#1a1a2e_0%,#0a0a14_70%)]" />
          {/* corridors connecting rooms */}
          <svg className="absolute inset-0 pointer-events-none" width={MAP_W} height={MAP_H}>
            <g stroke="#1f2530" strokeWidth={40} fill="none" strokeLinecap="round">
              <line x1={400} y1={140} x2={600} y2={140} />
              <line x1={720} y1={140} x2={760} y2={140} />
              <line x1={190} y1={220} x2={190} y2={460} />
              <line x1={300} y1={550} x2={360} y2={550} />
              <line x1={600} y1={550} x2={660} y2={550} />
              <line x1={880} y1={550} x2={940} y2={420} />
              <line x1={600} y1={220} x2={600} y2={460} />
              <line x1={860} y1={220} x2={1040} y2={300} />
            </g>
          </svg>

          {/* Rooms */}
          {rooms.map((r: Room) => (
            <div key={r.id}
              className="absolute rounded-lg border-2 border-black/70 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]"
              style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: r.color }}>
              <div className="absolute top-1 left-2 text-[11px] uppercase tracking-wider font-display text-white/70">{r.name}</div>
              {/* floor tiles */}
              <div className="absolute inset-2 rounded opacity-30"
                style={{ backgroundImage: "linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.08) 48% 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.08) 48% 52%, transparent 52%)", backgroundSize: "24px 24px" }} />
            </div>
          ))}

          {/* Tasks markers */}
          {tasks.map((t: Task) => {
            const isDone = done.has(t.id);
            return (
              <div key={t.id} className="absolute"
                style={{ left: t.x - 18, top: t.y - 18 }}>
                <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 ${isDone ? "bg-emerald-500/30 border-emerald-300" : "bg-amber-400/30 border-amber-300 glow-toxic"}`}>
                  <TaskIcon kind={t.kind} className={`h-5 w-5 ${isDone ? "text-emerald-200" : "text-amber-100"}`} />
                  {isDone && <CheckCircle2 className="absolute -top-2 -right-2 h-4 w-4 text-emerald-300 bg-black rounded-full" />}
                </div>
              </div>
            );
          })}

          {/* Crewmates */}
          {crewmates.map(c => {
            const r = rooms.find(rr => rr.id === c.room)!;
            return (
              <div key={c.id} className="absolute lana-idle" style={{ left: r.x + c.ox - 28, top: r.y + c.oy - 30 }}>
                <Crewmate color={c.color} size={56} />
                <div className="text-center text-[10px] mt-1 bg-black/70 px-1 rounded">{c.name}</div>
              </div>
            );
          })}

          {/* Impostor in cafeteria (visible when all tasks done) */}
          {done.size === tasks.length && (() => {
            const cafe = rooms.find(r => r.id === "cafeteria")!;
            return (
              <div className="absolute" style={{ left: cafe.x + cafe.w / 2 - 40, top: cafe.y + cafe.h / 2 - 40 }}>
                <Impostor size={80} />
                <div className="text-center text-[10px] mt-1 bg-red-900/80 text-red-100 px-1 rounded font-display animate-pulse">ДИРЕКТОР</div>
              </div>
            );
          })()}

          {/* Lana (player) */}
          <div className="absolute" style={{ left: pos.x - 28, top: pos.y - 32 }}>
            <div className={moving ? "lana-walk" : "lana-idle"}>
              <Crewmate color="#ff66aa" facing={facing} size={56} />
            </div>
            <div className="text-center text-[10px] mt-1 bg-pink-900/70 text-pink-100 px-1 rounded">Лана</div>
          </div>
        </div>
      </div>

      {/* Hint */}
      {hint && modal.kind === "none" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/80 border border-primary/50 px-4 py-2 rounded font-display text-sm text-primary animate-pulse">
          {hint}
        </div>
      )}

      {/* Modals */}
      {modal.kind !== "none" && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-primary/60 rounded-lg max-w-2xl w-full p-6 relative">
            {modal.kind !== "win" && modal.kind !== "lose" && modal.kind !== "boss" && (
              <button onClick={() => setModal({ kind: "none" })} className="absolute top-2 right-2 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            )}

            {modal.kind === "task" && (
              <div>
                <h2 className="font-display text-lg text-primary mb-1 flex items-center gap-2">
                  <TaskIcon kind={modal.task.kind} className="h-5 w-5" />
                  {modal.task.title}
                </h2>
                <p className="text-xs text-muted-foreground mb-4">{modal.task.hint}</p>
                {modal.task.kind === "wires" && <WiresGame onDone={finishTask} />}
                {modal.task.kind === "code" && <CodeGame onDone={finishTask} />}
                {modal.task.kind === "download" && <DownloadGame onDone={finishTask} />}
                {modal.task.kind === "reactor" && <ReactorGame onDone={finishTask} />}
                {modal.task.kind === "trash" && <TrashGame onDone={finishTask} />}
                {modal.task.kind === "switches" && <SwitchesGame onDone={finishTask} />}
                {modal.task.kind === "swipe" && <SwipeGame onDone={finishTask} />}
              </div>
            )}

            {modal.kind === "talk" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <MessageCircle className="h-8 w-8 text-primary" />
                <h3 className="font-display text-lg">{modal.name}</h3>
                <p className="text-base">«{modal.line}»</p>
                <Button onClick={() => setModal({ kind: "none" })}>Понятно</Button>
              </div>
            )}

            {modal.kind === "boss" && (
              <BossFight onWin={() => setModal({ kind: "win" })} onLose={() => setModal({ kind: "lose" })} />
            )}

            {modal.kind === "win" && (
              <div className="text-center space-y-4">
                <h2 className="font-display text-2xl text-emerald-400">ПОБЕДА!</h2>
                <p>Лана и одноклассники вырвались из школы. Импостор остался запертым в спортзале.</p>
                <div className="flex justify-center gap-2">
                  <Crewmate color="#ff66aa" />
                  <Crewmate color="#e84545" />
                  <Crewmate color="#3aa3ff" />
                  <Crewmate color="#ffd23a" />
                  <Crewmate color="#7ad84a" />
                </div>
                <Button onClick={() => { setDone(new Set()); setPos({ x: 200, y: 140 }); setModal({ kind: "none" }); }}>
                  Снова
                </Button>
              </div>
            )}

            {modal.kind === "lose" && (
              <div className="text-center space-y-4">
                <Skull className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="font-display text-2xl text-red-400">ПОРАЖЕНИЕ</h2>
                <p>Директор-импостор оказался хитрее. Попробуй снова.</p>
                <Button onClick={() => setModal({ kind: "boss" })}>Повторить бой</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
