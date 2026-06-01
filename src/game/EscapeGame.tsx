import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  levels, bossRiddles, ADMIN_CODE, ADMIN_HINT,
  FLOOR_Y, CEIL_Y,
  type Classroom, type Zombie, type TaskKind,
} from "./data";
import {
  Zap, KeyRound, Download, Flame, Trash2, ToggleRight,
  Calculator, HelpCircle, Lock, Target,
  X, Skull, Heart, DoorClosed, ArrowUp,
} from "lucide-react";



type Vec = { x: number; y: number };

type Modal =
  | { kind: "none" }
  | { kind: "task"; zombie: Zombie }
  | { kind: "search"; classroom: Classroom }
  | { kind: "exit" }
  | { kind: "nextLevel" }
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

// 7) MATH — solve arithmetic
function MathGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const problem = useMemo(() => {
    const a = 12 + Math.floor(Math.random() * 80);
    const b = 7 + Math.floor(Math.random() * 40);
    const ops = ["+", "-", "×"] as const;
    const op = ops[Math.floor(Math.random() * 3)];
    const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
    return { a, b, op, ans };
  }, []);
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (parseInt(val, 10) === problem.ans) onDone(true);
    else { setErr(true); setTimeout(() => setErr(false), 400); }
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Реши пример, чтобы оглушить зомби.</p>
      <div className={`text-4xl font-display text-primary ${err ? "shake" : ""}`}>
        {problem.a} {problem.op} {problem.b} = ?
      </div>
      <Input autoFocus inputMode="numeric" value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^\d-]/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="text-center w-40 text-2xl font-mono" />
      <Button onClick={submit} disabled={!val}>
        <Calculator className="mr-2 h-4 w-4" /> Ответить
      </Button>
    </div>
  );
}

// 8) QUIZ — school question
const QUIZ_POOL = [
  { q: "Столица Австралии?", o: ["Сидней", "Канберра", "Мельбурн", "Перт"], a: 1 },
  { q: "Сколько планет в Солнечной системе?", o: ["7", "8", "9", "10"], a: 1 },
  { q: "Автор «Войны и мира»?", o: ["Достоевский", "Чехов", "Толстой", "Пушкин"], a: 2 },
  { q: "Химический символ золота?", o: ["Go", "Gd", "Au", "Ag"], a: 2 },
  { q: "Сколько хромосом у человека?", o: ["23", "44", "46", "48"], a: 2 },
  { q: "Самая длинная река мира?", o: ["Амазонка", "Нил", "Янцзы", "Волга"], a: 1 },
  { q: "Кто открыл закон тяготения?", o: ["Эйнштейн", "Ньютон", "Галилей", "Кеплер"], a: 1 },
];
function QuizGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const item = useMemo(() => QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)], []);
  const [tries, setTries] = useState(2);
  const pick = (i: number) => {
    if (i === item.a) onDone(true);
    else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onDone(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-4 max-w-md">
      <p className="text-sm text-muted-foreground">Школьный вопрос. Попыток: {tries}</p>
      <h3 className="text-lg font-display text-center">{item.q}</h3>
      <div className="grid grid-cols-2 gap-2 w-full">
        {item.o.map((o, i) => (
          <Button key={i} variant="secondary" onClick={() => pick(i)}>{o}</Button>
        ))}
      </div>
    </div>
  );
}

// 9) LOCK — find code from hints
function LockGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const target = useMemo(() => Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)), []);
  const [dials, setDials] = useState([0, 0, 0]);
  useEffect(() => {
    if (dials.every((d, i) => d === target[i])) setTimeout(() => onDone(true), 300);
  }, [dials, target, onDone]);
  const hints = [
    `Сумма цифр = ${target.reduce((a, b) => a + b, 0)}`,
    `Первая цифра ${target[0] % 2 === 0 ? "чётная" : "нечётная"}`,
    `Последняя цифра = ${target[2]}`,
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Подбери код по подсказкам:</p>
      <ul className="text-xs text-amber-300 list-disc list-inside">
        {hints.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
      <div className="flex gap-3 bg-black/60 p-4 rounded border-2 border-amber-700">
        {dials.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button onClick={() => setDials(p => p.map((v, j) => j === i ? (v + 1) % 10 : v))}
              className="text-amber-300 hover:text-amber-100 text-xl">▲</button>
            <div className="w-12 h-14 bg-zinc-900 border border-amber-600 rounded flex items-center justify-center text-3xl font-mono text-amber-200">
              {d}
            </div>
            <button onClick={() => setDials(p => p.map((v, j) => j === i ? (v + 9) % 10 : v))}
              className="text-amber-300 hover:text-amber-100 text-xl">▼</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 10) AIM — click 5 targets fast
function AimGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [time, setTime] = useState(8);
  useEffect(() => {
    const id = setInterval(() => setTime(t => {
      if (t <= 0.1) { clearInterval(id); onDone(false); return 0; }
      return +(t - 0.1).toFixed(1);
    }), 100);
    return () => clearInterval(id);
  }, [onDone]);
  const respawn = () => setPos({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });
  const hit = () => {
    const n = hits + 1;
    setHits(n);
    if (n >= 5) onDone(true); else respawn();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">Попади 5 раз. Осталось: <b className="text-red-400">{time}s</b></p>
      <div className="relative w-80 h-64 bg-black/70 rounded border-2 border-red-500/50 overflow-hidden">
        <button onClick={hit}
          className="absolute w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 border-2 border-red-200 transition-all"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
          <Target className="h-5 w-5 mx-auto text-white" />
        </button>
      </div>
      <p className="font-mono text-primary">Попаданий: {hits}/5</p>
    </div>
  );
}

// ============== TASK ICONS ==============
function TaskIcon({ kind, className = "" }: { kind: TaskKind; className?: string }) {
  const map: Record<TaskKind, typeof Zap> = {
    wires: Zap, code: KeyRound, download: Download, reactor: Flame,
    trash: Trash2, switches: ToggleRight,
    quiz: HelpCircle, lock: Lock, aim: Target,
  };
  const I = map[kind];
  return <I className={className} />;
}

// ---- Pixel zombie sprite ----
function PixelZombie({ size = 56, facing = -1, hurt = false }: { size?: number; facing?: 1 | -1; hurt?: boolean }) {
  return (
    <PixelHuman
      facing={facing}
      size={size}
      variant="student"
      dead={hurt}
      palette={{
        skin: "#8fb86a", skinShade: "#4a6a2a",
        hair: "#2a2a1a", hairShade: "#000000",
        shirt: "#5a3a2a", shirtShade: "#2a1a0a",
        pants: "#3a3020", pantsShade: "#1a1410",
        shoes: "#000000",
        eyes: "#ffeb3b",
      }}
    />
  );
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

// ============== SCHOOL CORRIDOR (side-scroller) ==============
const SPEED = 3.5;
const VIEW_H = 520;
const REACH = 70;

// Task time limits (seconds). aim has its own timer.
const TIME_LIMITS: Record<TaskKind, number | null> = {
  wires: 14, code: 18, download: 10, reactor: 22,
  trash: 12, switches: 10, quiz: 10, lock: 25, aim: null,
};

// Countdown above each task — calls onTimeout when 0.
function TaskTimer({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const [left, setLeft] = useState(seconds);
  const firedRef = useRef(false);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      const remaining = Math.max(0, seconds - elapsed);
      setLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        onTimeout();
      }
    }, 50);
    return () => clearInterval(id);
  }, [seconds, onTimeout]);
  const pct = (left / seconds) * 100;
  const danger = left < seconds * 0.3;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] font-pixel mb-1">
        <span className={danger ? "text-red-400 animate-pulse" : "text-amber-300"}>⏱ Время на задание</span>
        <span className={`font-mono ${danger ? "text-red-400" : "text-amber-200"}`}>{left.toFixed(1)}s</span>
      </div>
      <div className="h-2 bg-black/70 rounded overflow-hidden border border-amber-700/40">
        <div className={`h-full transition-[width] ${danger ? "bg-red-500" : "bg-gradient-to-r from-amber-400 to-red-500"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EscapeGame() {
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [x, setX] = useState(120);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [moving, setMoving] = useState(false);
  const [hp, setHp] = useState(80);
  const [maxHp] = useState(100);
  const [strength, setStrength] = useState(1);
  const [killed, setKilled] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [hint, setHint] = useState("");
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string>("");

  const cur = levels[level];
  const zombies = cur.zombies;
  const classrooms = cur.classrooms;
  const EXIT_X = cur.exitX;
  const WORLD_W = cur.worldW;
  const isFinalLevel = level === levels.length - 1;

  const keys = useRef<Record<string, boolean>>({});
  const xRef = useRef(x); xRef.current = x;
  const viewportRef = useRef<HTMLDivElement>(null);

  // input
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  const allKilled = killed.size === zombies.length;

  // interact
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (modal.kind !== "none") return;
      if (e.key.toLowerCase() !== "e" && e.key !== "Enter") return;
      const px = xRef.current;
      // nearest zombie
      const z = zombies.find(z => !killed.has(z.id) && Math.abs(z.x - px) < REACH);
      if (z) { setModal({ kind: "task", zombie: z }); return; }
      // nearest classroom
      const c = classrooms.find(c => !searched.has(c.id) && Math.abs(c.x - px) < REACH);
      if (c) { setModal({ kind: "search", classroom: c }); return; }
      // exit door
      if (Math.abs(EXIT_X - px) < REACH) {
        if (!allKilled) {
          setToast("Дверь не откроется — впереди ещё зомби.");
          setTimeout(() => setToast(""), 1800);
        } else setModal({ kind: "exit" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal.kind, killed, searched, allKilled, level]);

  // game loop — walking + auto-block at zombies
  useEffect(() => {
    if (!started || modal.kind !== "none") { setMoving(false); return; }
    let raf = 0;
    const tick = () => {
      let dx = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) { dx -= 1; setFacing(-1); }
      if (keys.current["d"] || keys.current["arrowright"]) { dx += 1; setFacing(1); }
      if (dx !== 0) {
        setMoving(true);
        setX(p => {
          let np = clamp(p + dx * SPEED, 80, WORLD_W - 80);
          // block at undefeated zombies (only when walking towards them)
          const block = zombies.find(z => !killed.has(z.id) &&
            ((dx > 0 && z.x > p && z.x < np + 30) || (dx < 0 && z.x < p && z.x > np - 30)));
          if (block) np = dx > 0 ? block.x - 40 : block.x + 40;
          // block at exit door if not all killed
          if (!allKilled && dx > 0 && EXIT_X > p && EXIT_X < np + 30) np = EXIT_X - 40;
          return np;
        });
      } else setMoving(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, modal.kind, killed, allKilled, level]);

  // hint
  useEffect(() => {
    const id = setInterval(() => {
      const px = xRef.current;
      const z = zombies.find(z => !killed.has(z.id) && Math.abs(z.x - px) < REACH);
      if (z) { setHint(`[E] Победить ${z.name}`); return; }
      const c = classrooms.find(c => !searched.has(c.id) && Math.abs(c.x - px) < REACH);
      if (c) { setHint(`[E] Осмотреть · ${c.name}`); return; }
      if (Math.abs(EXIT_X - px) < REACH) {
        setHint(allKilled ? (isFinalLevel ? "[E] К директору!" : "[E] Подняться на этаж выше") : "Путь заблокирован");
        return;
      }
      setHint("");
    }, 120);
    return () => clearInterval(id);
  }, [killed, searched, allKilled, level]);

  // camera follow
  const cam = useMemo(() => {
    const vw = viewportRef.current?.clientWidth ?? 800;
    return clamp(x - vw / 2, 0, WORLD_W - vw);
  }, [x]);

  const finishTask = useCallback((ok: boolean) => {
    if (modal.kind !== "task") { setModal({ kind: "none" }); return; }
    const z = modal.zombie;
    if (ok) {
      setKilled(prev => new Set(prev).add(z.id));
      setToast(`💀 ${z.name} повержен! +50 очков`);
    } else {
      const dmg = Math.max(8, 25 - strength * 3);
      setHp(h => {
        const nh = Math.max(0, h - dmg);
        if (nh === 0) setTimeout(() => setModal({ kind: "lose" }), 200);
        return nh;
      });
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setToast(`💢 Зомби укусил! -${dmg} HP`);
    }
    setTimeout(() => setToast(""), 1800);
    setModal({ kind: "none" });
  }, [modal, strength]);

  const finishSearch = useCallback(() => {
    if (modal.kind !== "search") { setModal({ kind: "none" }); return; }
    const c = modal.classroom;
    const loot = c.loot;
    if (loot.hpGain) setHp(h => Math.min(maxHp, h + loot.hpGain!));
    if (loot.strengthGain) setStrength(s => s + loot.strengthGain!);
    setSearched(prev => new Set(prev).add(c.id));
    setToast(`Найдено: ${loot.emoji} ${loot.name}`);
    setTimeout(() => setToast(""), 1800);
    setModal({ kind: "none" });
  }, [modal, maxHp]);

  if (!started) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 p-6">
        <div className="max-w-2xl text-center space-y-6">
          <div className="flex justify-center items-end gap-4 mb-4">
            <Crewmate color="#ff66aa" />
            <PixelZombie />
            <PixelZombie facing={1} />
            <Impostor size={72} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-primary">СБЕГИ ИЗ ШКОЛЫ</h1>
          <p className="text-muted-foreground">
            Школа захвачена зомби. Лана идёт по коридору, осматривает кабинеты в поисках припасов и
            сражается с зомби, решая задачи. В конце коридора — дверь на улицу.
          </p>
          <div className="text-left text-sm bg-black/40 rounded p-4 space-y-1">
            <p>🎮 <b>A/D</b> или <b>←/→</b> — идти по коридору</p>
            <p>⚡ <b>E</b> / <b>Enter</b> — осмотреть кабинет / атаковать зомби</p>
            <p>🧟 Зомби побеждаются мини-играми (провода, код, рубильники и т.д.)</p>
            <p>🏫 3 этажа · в конце — бой с директором-зомби</p>
          </div>
          <Button size="lg" onClick={() => setStarted(true)} className="font-display">НАЧАТЬ</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden bg-black text-foreground relative select-none ${shake ? "shake" : ""}`}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crewmate color="#ff66aa" size={36} />
          <div>
            <div className="font-display text-sm text-primary">ЛАНА</div>
            <div className="text-[10px] text-muted-foreground">{cur.name}</div>
          </div>
        </div>
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-xs mb-1"><span>HP</span><span className="font-mono">{hp} / {maxHp}</span></div>
          <div className="h-3 bg-black/60 rounded border border-red-400/40 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          <div className="flex gap-3 justify-end">
            <span className="text-amber-300">🏫 Этаж {cur.id}/{levels.length}</span>
            <span>💪 ×{strength}</span>
            <span>💀 {killed.size}/{zombies.length}</span>
            <span>🔍 {searched.size}/{classrooms.length}</span>
          </div>
          {allKilled && <div className="text-emerald-400 font-bold animate-pulse">
            → {isFinalLevel ? "Беги к директору!" : "Лестница наверх!"}
          </div>}
        </div>
      </div>

      {/* Corridor */}
      <div ref={viewportRef} className="absolute inset-0 pt-16">
        <div className="relative h-full" style={{ width: WORLD_W, transform: `translateX(${-cam}px)` }}>
          {/* Sky / outdoors visible at exit */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, #1a1825 0%, #221820 50%, #181018 100%)",
          }} />
          {/* Floor */}
          <div className="absolute left-0 right-0" style={{ top: FLOOR_Y + 30, height: VIEW_H - FLOOR_Y - 30,
            background: "repeating-linear-gradient(90deg, #2a1f1a 0 60px, #1f1612 60px 120px)",
            boxShadow: "inset 0 4px 0 #0a0606" }} />
          {/* Ceiling */}
          <div className="absolute left-0 right-0" style={{ top: 0, height: CEIL_Y - 16,
            background: "linear-gradient(180deg,#0a0a14, #1a1a26)", boxShadow: "inset 0 -3px 0 #000" }} />
          {/* Wall stripe */}
          <div className="absolute left-0 right-0" style={{ top: CEIL_Y - 16, height: 8, background: "#3a2a2a" }} />

          {/* Flickering lights */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute flicker" style={{
              left: 180 + i * 320, top: CEIL_Y - 8, width: 60, height: 14,
              background: "radial-gradient(ellipse, #ffeb3b 0%, #ffb84d 40%, transparent 70%)",
              filter: "blur(2px)",
            }} />
          ))}

          {/* Classroom doors */}
          {classrooms.map(c => {
            const isDone = searched.has(c.id);
            return (
              <div key={c.id} className="absolute" style={{ left: c.x - 40, top: FLOOR_Y - 110 }}>
                {/* door */}
                <div className="relative w-20 h-32 border-4 border-amber-900 rounded-t-md shadow-[inset_0_0_20px_#000]"
                  style={{ background: isDone ? "#3a2a2a" : "linear-gradient(180deg,#5a3a1a,#3a2410)" }}>
                  <div className="absolute right-2 top-14 w-2 h-2 rounded-full bg-amber-300" />
                  {/* sign */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-[9px] text-amber-200 px-2 py-0.5 rounded whitespace-nowrap font-pixel">
                    {c.name}
                  </div>
                  {isDone && (
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400 text-3xl font-bold">✓</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Exit door */}
          <div className="absolute" style={{ left: EXIT_X - 50, top: FLOOR_Y - 150 }}>
            <div className={`relative w-24 h-40 border-4 rounded-t-md ${allKilled ? "border-emerald-400 glow-toxic" : "border-red-700"}`}
              style={{ background: allKilled ? "linear-gradient(180deg,#1a3a1a,#0a1a0a)" : "linear-gradient(180deg,#2a0a0a,#1a0505)" }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-[10px] text-emerald-300 px-2 py-0.5 rounded whitespace-nowrap font-pixel">
                {allKilled ? (isFinalLevel ? "ВЫХОД ОТКРЫТ" : "ЛЕСТНИЦА ▲") : (isFinalLevel ? "ВЫХОД ⛔" : "ЛЕСТНИЦА ⛔")}
              </div>
              {isFinalLevel
                ? <DoorClosed className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-white/60" />
                : <ArrowUp className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-emerald-300" />}
            </div>
          </div>

          {/* Zombies */}
          {zombies.map(z => {
            if (killed.has(z.id)) {
              return (
                <div key={z.id} className="absolute opacity-60" style={{ left: z.x - 28, top: FLOOR_Y - 20, transform: "rotate(90deg)" }}>
                  <PixelZombie size={56} />
                </div>
              );
            }
            return (
              <div key={z.id} className="absolute zombie-walk" style={{ left: z.x - 28, top: FLOOR_Y - 70 }}>
                <PixelZombie size={56} facing={z.x > x ? -1 : 1} />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-100 text-[9px] px-1 rounded font-pixel flex items-center gap-1">
                  <TaskIcon kind={z.kind} className="h-3 w-3" />
                  {z.name}
                </div>
              </div>
            );
          })}

          {/* Lana */}
          <div className="absolute" style={{ left: x - 28, top: FLOOR_Y - 70 }}>
            <div className={moving ? "lana-walk" : "lana-idle"}>
              <Crewmate color="#ff66aa" facing={facing} size={56} />
            </div>
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none scanlines" />
        </div>
      </div>

      {/* Hint + toast */}
      {hint && modal.kind === "none" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/85 border border-primary/50 px-4 py-2 rounded font-display text-sm text-primary animate-pulse">
          {hint}
        </div>
      )}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-black/90 border border-amber-400/60 text-amber-200 px-4 py-2 rounded font-pixel text-base">
          {toast}
        </div>
      )}

      {/* Modals */}
      {modal.kind !== "none" && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-primary/60 rounded-lg max-w-2xl w-full p-6 relative">
            {modal.kind !== "win" && modal.kind !== "lose" && modal.kind !== "boss" && (
              <button onClick={() => setModal({ kind: "none" })} className="absolute top-2 right-2 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            )}

            {modal.kind === "task" && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <PixelZombie size={48} />
                  <div>
                    <h2 className="font-display text-lg text-red-400">{modal.zombie.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TaskIcon kind={modal.zombie.kind} className="h-3 w-3" />
                      Реши задачу, чтобы повергнуть зомби
                    </p>
                  </div>
                </div>
                {modal.zombie.kind === "wires" && <WiresGame onDone={finishTask} />}
                {modal.zombie.kind === "code" && <CodeGame onDone={finishTask} />}
                {modal.zombie.kind === "download" && <DownloadGame onDone={finishTask} />}
                {modal.zombie.kind === "reactor" && <ReactorGame onDone={finishTask} />}
                {modal.zombie.kind === "trash" && <TrashGame onDone={finishTask} />}
                {modal.zombie.kind === "switches" && <SwitchesGame onDone={finishTask} />}
                
                {modal.zombie.kind === "quiz" && <QuizGame onDone={finishTask} />}
                {modal.zombie.kind === "lock" && <LockGame onDone={finishTask} />}
                {modal.zombie.kind === "aim" && <AimGame onDone={finishTask} />}
              </div>
            )}

            {modal.kind === "search" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <h3 className="font-display text-lg text-primary">{modal.classroom.name}</h3>
                <div className="text-6xl">{modal.classroom.loot.emoji}</div>
                <p>Лана находит: <b>{modal.classroom.loot.name}</b></p>
                <p className="text-xs text-muted-foreground">
                  {modal.classroom.loot.hpGain ? `+${modal.classroom.loot.hpGain} HP  ` : ""}
                  {modal.classroom.loot.strengthGain ? `+${modal.classroom.loot.strengthGain} 💪` : ""}
                </p>
                <Button onClick={finishSearch}>Забрать</Button>
              </div>
            )}

            {modal.kind === "exit" && (
              isFinalLevel ? (
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                  <Impostor size={80} />
                  <h3 className="font-display text-lg text-red-400">У выхода ждёт Директор</h3>
                  <p>«Лана… последний рубеж. Ответь на загадки — и ты свободна.»</p>
                  <Button onClick={() => setModal({ kind: "boss" })}>Принять бой</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                  <ArrowUp className="h-12 w-12 text-emerald-400" />
                  <h3 className="font-display text-lg text-emerald-400">Лестница на следующий этаж</h3>
                  <p>Этаж {cur.id} зачищен. Поднимайся выше — там ещё опаснее.</p>
                  <Button onClick={() => {
                    setLevel(level + 1);
                    setX(120);
                    setKilled(new Set());
                    setSearched(new Set());
                    setHp(h => Math.min(maxHp, h + 20));
                    setModal({ kind: "none" });
                    setToast(`▲ Этаж ${cur.id + 1}`);
                    setTimeout(() => setToast(""), 1800);
                  }}>Подняться ▲</Button>
                </div>
              )
            )}

            {modal.kind === "boss" && (
              <BossFight onWin={() => setModal({ kind: "win" })} onLose={() => setModal({ kind: "lose" })} />
            )}

            {modal.kind === "win" && (
              <div className="text-center space-y-4">
                <h2 className="font-display text-2xl text-emerald-400">ПОБЕДА!</h2>
                <p>Лана выбежала из школы. Солнце. Свобода.</p>
                <div className="flex justify-center"><Crewmate color="#ff66aa" size={80} /></div>
                <Button onClick={() => {
                  setStarted(false); setLevel(0); setX(120); setHp(80); setStrength(1);
                  setKilled(new Set()); setSearched(new Set()); setModal({ kind: "none" });
                }}>Снова</Button>
              </div>
            )}

            {modal.kind === "lose" && (
              <div className="text-center space-y-4">
                <Skull className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="font-display text-2xl text-red-400">ПОРАЖЕНИЕ</h2>
                <p>Зомби оказались сильнее. Попробуй снова.</p>
                <Button onClick={() => {
                  setStarted(false); setLevel(0); setX(120); setHp(80); setStrength(1);
                  setKilled(new Set()); setSearched(new Set()); setModal({ kind: "none" });
                }}>Начать заново</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

