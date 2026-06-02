import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  levels, bossRiddles, ADMIN_CODE, ADMIN_HINT,
  FLOOR_Y, CEIL_Y,
  type Classroom, type Zombie, type TaskKind, type LootItem, type SearchSpot,
} from "./data";
import {
  Zap, KeyRound, Download, Flame, Trash2, ToggleRight,
  Calculator, HelpCircle, Lock, Target,
  X, Skull, Heart, DoorClosed, ArrowUp,
  Lightbulb, Coins, Shirt, ShoppingBag, Crosshair, Swords, Flashlight, Volume2, VolumeX,
  Backpack, Utensils, ArrowDown, BatteryFull, BatteryLow, Trophy,
} from "lucide-react";
import { Leaderboard, submitScore } from "./Leaderboard";



type Vec = { x: number; y: number };

type Modal =
  | { kind: "none" }
  | { kind: "task"; zombie: Zombie }
  | { kind: "search"; classroom: Classroom }
  | { kind: "exit" }
  | { kind: "doorTask" }
  | { kind: "nextLevel" }
  | { kind: "win" }
  | { kind: "lose" }
  | { kind: "backpack" }
  | { kind: "boss" };

type InvItem = { id: string; name: string; emoji: string; hp: number; food: number; strength: number; battery?: number; givesFlashlight?: boolean };


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

// ---- Lana outfits (selectable in menu) ----
export type Outfit = {
  id: string; name: string; price: number; palette: PixelPalette;
};
const OUTFITS: Outfit[] = [
  { id: "classic", name: "Школьная форма", price: 0, palette: PAL_LANA },
  { id: "track", name: "Спортивный костюм", price: 80, palette: {
    skin: "#f4c8a8", skinShade: "#d49a78",
    hair: "#c4377a", hairShade: "#7a1e4a",
    shirt: "#1aa8a8", shirtShade: "#0a5a5a",
    pants: "#0a0a14", pantsShade: "#000000", shoes: "#ffffff",
  } },
  { id: "punk", name: "Панк-куртка", price: 160, palette: {
    skin: "#f4c8a8", skinShade: "#c8946a",
    hair: "#ff2a6a", hairShade: "#8a0a3a",
    shirt: "#1a1a1a", shirtShade: "#000000",
    pants: "#2a1a2a", pantsShade: "#0a0a0a", shoes: "#3a0a0a",
  } },
  { id: "armor", name: "Бронежилет (+10 HP)", price: 300, palette: {
    skin: "#f4c8a8", skinShade: "#c8946a",
    hair: "#c4377a", hairShade: "#7a1e4a",
    shirt: "#3a4a2a", shirtShade: "#1a2410",
    pants: "#1a1a1a", pantsShade: "#000000", shoes: "#0a0a0a",
  } },
  { id: "ninja", name: "Ниндзя (-шум)", price: 420, palette: {
    skin: "#e0b890", skinShade: "#a87a55",
    hair: "#000000", hairShade: "#000000",
    shirt: "#0a0a14", shirtShade: "#000000",
    pants: "#000000", pantsShade: "#000000", shoes: "#000000",
    eyes: "#ff3030",
  } },
];

// ---- Upgrades (persisted in localStorage) ----
export type UpgradeId = "bat" | "gun" | "flashlight" | "hp" | "hint";
export type Upgrade = {
  id: UpgradeId; name: string; icon: typeof Swords; price: number; desc: string; max?: number;
};
const UPGRADES: Upgrade[] = [
  { id: "bat",        name: "Бейсбольная бита",   icon: Swords,     price: 60,  desc: "1 удар — оглушить зомби без задания.", max: 5 },
  { id: "gun",        name: "Пистолет",            icon: Crosshair,  price: 220, desc: "Выстрел — мгновенно убивает зомби.", max: 5 },
  { id: "flashlight", name: "Фонарик",             icon: Flashlight, price: 140, desc: "Освещает тёмные коридоры (2–3 этаж)." },
  { id: "hp",         name: "Усиленное здоровье",  icon: Heart,      price: 180, desc: "+25 к макс. HP." },
  { id: "hint",       name: "Дополнительные подсказки", icon: Lightbulb, price: 90, desc: "Подробные подсказки во всех заданиях." },
];

type Inventory = {
  bat: number; gun: number;
  flashlight: boolean; hp: boolean; hint: boolean;
};
const EMPTY_INV: Inventory = { bat: 0, gun: 0, flashlight: false, hp: false, hint: false };

const SAVE_KEY = "escape-school-save-v1";
type SaveData = { coins: number; outfit: string; owned: Inventory };
const loadSave = (): SaveData => {
  if (typeof window === "undefined") return { coins: 0, outfit: "classic", owned: { ...EMPTY_INV } };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { coins: 0, outfit: "classic", owned: { ...EMPTY_INV } };
    const p = JSON.parse(raw);
    return { coins: p.coins ?? 0, outfit: p.outfit ?? "classic", owned: { ...EMPTY_INV, ...(p.owned ?? {}) } };
  } catch { return { coins: 0, outfit: "classic", owned: { ...EMPTY_INV } }; }
};
const writeSave = (s: SaveData) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

// ---- Per-task hints ----
const TASK_HINTS: Record<TaskKind, { short: string; long: string }> = {
  wires:    { short: "Тяни мышью провод от левой клеммы к правой того же цвета.", long: "Если ошибся — кликни левую клемму ещё раз, чтобы сбросить соединение. Цвета должны совпасть точно." },
  code:     { short: "На двери математическое выражение — реши его.", long: "1740 + 2331 = 4071. Введи последние 4 цифры — это и есть код." },
  download: { short: "Удерживай кнопку, не отпускай, пока полоса не достигнет 100%.", long: "Если отпустить — прогресс быстро падает. Не двигай мышью с кнопки." },
  reactor:  { short: "Запомни цвета в нужном порядке и повтори.", long: "Если ошибся — последовательность покажут заново с начала. Считай вслух." },
  trash:    { short: "Удерживай рычаг, пока бак не опустеет.", long: "Бак заполняется обратно, если отпустить. Не отвлекайся." },
  switches: { short: "Включи ВСЕ рубильники (ON).", long: "Просто нажми на каждый OFF — нет ловушек, никаких комбинаций." },
  quiz:     { short: "Прочитай вопрос внимательно, всего 2 попытки.", long: "Если не уверен — выбирай самый правдоподобный, времени мало." },
  lock:     { short: "Подбери 3 цифры по подсказкам сбоку.", long: "Сначала зафиксируй последнюю цифру (она дана прямо), потом подбирай первую по чётности, остаток — по сумме." },
  aim:      { short: "Кликай по красным мишеням как можно быстрее.", long: "Не води мышью — мишень появится случайно. Целься в центр." },
};

function HintBox({ kind, advanced }: { kind: TaskKind; advanced: boolean }) {
  const [open, setOpen] = useState(false);
  const tip = TASK_HINTS[kind];
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11px] font-pixel text-amber-300 hover:text-amber-100 bg-black/40 border border-amber-700/40 rounded px-2 py-1">
        <Lightbulb className="h-3 w-3" />
        {open ? "Скрыть подсказку" : "Подсказка"}
      </button>
      {open && (
        <div className="mt-2 text-[12px] text-amber-100/90 bg-amber-900/15 border border-amber-700/30 rounded p-2">
          <div>💡 {tip.short}</div>
          {advanced && <div className="mt-1 text-amber-300/90">★ {tip.long}</div>}
        </div>
      )}
    </div>
  );
}

// Backwards-compatible API used elsewhere in this file
function Crewmate({ color, facing = 1, size = 56, dead = false, palette }:
  { color: string; facing?: 1 | -1; size?: number; dead?: boolean; palette?: PixelPalette }) {
  const isLana = color === "#ff66aa";
  const pal = palette ?? (isLana ? PAL_LANA : (PALETTES[color] ?? { ...PAL_MILA, shirt: color, shirtShade: color }));
  return <PixelHuman palette={pal} facing={facing} size={size} variant={isLana ? "girl" : "student"} dead={dead} />;
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
        const np = holding.current ? Math.min(100, p + 0.8) : Math.max(0, p - 1.2);
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
  const [seq] = useState(() => Array.from({ length: 7 }, () => Math.floor(Math.random() * 4)));
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

// ====== Зомби-рука, тянущаяся через окно ======
function ZombieHand({ delay = 0 }: { delay?: number }) {
  return (
    <svg viewBox="0 0 40 70" width={40} height={70}
      style={{ animation: `lana-walk 1.8s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: "50% 0%" }}>
      {/* предплечье */}
      <rect x="14" y="20" width="12" height="38" fill="#5a7a4a" stroke="#1a2a14" strokeWidth="1.5" />
      <rect x="14" y="30" width="12" height="3" fill="#3a5a2a" opacity="0.7" />
      <rect x="14" y="45" width="12" height="3" fill="#3a5a2a" opacity="0.7" />
      {/* кровавые царапины */}
      <line x1="16" y1="25" x2="22" y2="35" stroke="#7a0a0a" strokeWidth="1.2" />
      <line x1="20" y1="40" x2="24" y2="50" stroke="#7a0a0a" strokeWidth="1.2" />
      {/* ладонь */}
      <rect x="12" y="6" width="16" height="16" fill="#6a8a5a" stroke="#1a2a14" strokeWidth="1.5" />
      {/* пальцы */}
      <rect x="11" y="0" width="3" height="10" fill="#6a8a5a" stroke="#1a2a14" strokeWidth="1" />
      <rect x="15" y="-2" width="3" height="12" fill="#6a8a5a" stroke="#1a2a14" strokeWidth="1" />
      <rect x="19" y="-2" width="3" height="12" fill="#6a8a5a" stroke="#1a2a14" strokeWidth="1" />
      <rect x="23" y="0" width="3" height="10" fill="#6a8a5a" stroke="#1a2a14" strokeWidth="1" />
      {/* ногти */}
      <rect x="11" y="0" width="3" height="2" fill="#3a0a0a" />
      <rect x="15" y="-2" width="3" height="2" fill="#3a0a0a" />
      <rect x="19" y="-2" width="3" height="2" fill="#3a0a0a" />
      <rect x="23" y="0" width="3" height="2" fill="#3a0a0a" />
    </svg>
  );
}

// ====== Точка поиска в комнате ======
function SpotEl({ spot, taken, lit, hasKey, onClick }:
  { spot: SearchSpot; taken: boolean; lit: boolean; hasKey?: boolean; onClick: () => void }) {
  const x = spot.x;
  let body: React.ReactNode = null;
  let labelTop = 0;
  if (spot.where === "desk") {
    // парта
    body = (
      <div className="absolute" style={{ left: x - 50, bottom: 24, width: 100, height: 56 }}>
        <div className="absolute left-0 right-0 top-0 h-3 bg-[#8a6a3a] border-2 border-[#3a2a14]" />
        <div className="absolute left-2 top-3 bottom-0 w-3 bg-[#5a3a1a] border-2 border-[#1a0a00]" />
        <div className="absolute right-2 top-3 bottom-0 w-3 bg-[#5a3a1a] border-2 border-[#1a0a00]" />
        <div className="absolute left-12 top-1 w-5 h-2 bg-[#c9bfa8]" title="бумаги" />
      </div>
    );
    labelTop = 8;
  } else if (spot.where === "underDesk") {
    // под партой — щель
    body = (
      <div className="absolute" style={{ left: x - 50, bottom: 24, width: 100, height: 56 }}>
        <div className="absolute left-0 right-0 top-0 h-3 bg-[#7a5a2a] border-2 border-[#2a1a08]" />
        <div className="absolute left-2 top-3 bottom-0 w-3 bg-[#4a2a14] border-2 border-[#1a0a00]" />
        <div className="absolute right-2 top-3 bottom-0 w-3 bg-[#4a2a14] border-2 border-[#1a0a00]" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 text-[9px] font-pixel text-amber-200/70">↓ под партой</div>
      </div>
    );
    labelTop = 56;
  } else if (spot.where === "shelf") {
    body = (
      <div className="absolute" style={{ left: x - 40, bottom: 100, width: 80, height: 80 }}>
        <div className="absolute inset-0 bg-[#3a2a1a] border-2 border-[#1a0a00]" />
        <div className="absolute left-1 right-1 top-3 h-1 bg-[#1a0a00]" />
        <div className="absolute left-1 right-1 top-1/2 h-1 bg-[#1a0a00]" />
        <div className="absolute left-2 top-5 w-3 h-6 bg-red-900" />
        <div className="absolute left-7 top-5 w-3 h-6 bg-blue-900" />
        <div className="absolute left-12 top-5 w-3 h-6 bg-yellow-900" />
      </div>
    );
    labelTop = -8;
  } else if (spot.where === "drawer") {
    body = (
      <div className="absolute" style={{ left: x - 32, bottom: 30, width: 64, height: 50 }}>
        <div className="absolute inset-0 bg-[#4a3a2a] border-2 border-[#1a0a00]" />
        <div className="absolute left-2 right-2 top-2 h-3 bg-[#2a1a08]" />
        <div className="absolute left-2 right-2 top-7 h-3 bg-[#2a1a08]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-12 w-3 h-1 bg-[#c9a868]" />
      </div>
    );
    labelTop = -8;
  } else {
    // trash
    body = (
      <div className="absolute" style={{ left: x - 22, bottom: 24, width: 44, height: 50 }}>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-[#3a3a3a] border-2 border-black" style={{ clipPath: "polygon(8% 0,92% 0,100% 100%,0 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-2 bg-[#5a5a5a] border border-black" />
      </div>
    );
    labelTop = -10;
  }
  return (
    <button
      onClick={onClick}
      disabled={taken}
      className={`group ${taken ? "opacity-40 cursor-default" : "hover:brightness-125 cursor-pointer"}`}
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", background: "transparent", border: 0, pointerEvents: "none" }}
    >
      <div style={{ pointerEvents: taken ? "none" : "auto", position: "absolute", inset: 0 }}>
        {body}
        {/* кликабельная подсветка зоны */}
        <div className="absolute" style={{ left: x - 50, bottom: 18, width: 100, height: 110 }}>
          <div className="absolute inset-0 border border-amber-300/0 group-hover:border-amber-300/60 group-hover:bg-amber-200/5 rounded" />
        </div>
        {!taken && (
          <div className={`absolute font-pixel text-[10px] rounded px-1 animate-pulse border ${lit ? "text-amber-200 bg-black/80 border-amber-400/50" : "text-zinc-400 bg-black/80 border-zinc-700"}`}
            style={{ left: x - 24, bottom: 130 + labelTop }}>
            {lit ? "🔍 искать" : "???"}
          </div>
        )}
        {taken && spot.item && (
          <div className="absolute font-pixel text-emerald-300 text-[11px]"
            style={{ left: x - 14, bottom: 135 + labelTop }}>
            ✓ {hasKey ? "🗝" : spot.item.emoji}
          </div>
        )}
        {taken && !spot.item && (
          <div className="absolute font-pixel text-zinc-500 text-[10px]"
            style={{ left: x - 14, bottom: 135 + labelTop }}>
            ✗ пусто
          </div>
        )}
      </div>
    </button>
  );
}

// Детерминированный квест для класса: определяет, какая точка прячет ключ.
function getClassroomQuest(classroom: Classroom) {
  let h = 0;
  for (let i = 0; i < classroom.id.length; i++) h = (h * 31 + classroom.id.charCodeAt(i)) >>> 0;
  const keyIdx = h % classroom.spots.length;
  return { keyIdx };
}

const KEY_ITEM: LootItem = { name: "Ключ от двери", emoji: "🗝", strengthGain: 0 };

// ====== Сцена внутри класса ======
function ClassroomScene({
  classroom, hasFlashlight, batteryPct, onCollect, onLeave,
  lanaPalette, onConsumeBattery, onToast,
}: {
  classroom: Classroom;
  hasFlashlight: boolean;
  batteryPct: number;
  onCollect: (item: LootItem, spot: SearchSpot) => void;
  onLeave: () => void;
  lanaPalette: PixelPalette;
  onConsumeBattery: (n: number) => boolean;
  onToast: (m: string) => void;
}) {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const lit = hasFlashlight && batteryPct > 0;
  const remaining = classroom.spots.filter(s => !taken.has(s.id)).length;
  const quest = useMemo(() => getClassroomQuest(classroom), [classroom]);
  const keySpotId = classroom.spots[quest.keyIdx]?.id;

  const [keyFound, setKeyFound] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);

  // Передвижение Ланы по классу (A/D или стрелки)
  const [lanaX, setLanaX] = useState(20);
  const [facing, setFacing] = useState<1 | -1>(1);
  const keysRef = useRef<{ l: boolean; r: boolean }>({ l: false, r: false });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "a" || k === "A" || k === "ArrowLeft" || k === "ф" || k === "Ф") { keysRef.current.l = true; setFacing(-1); }
      if (k === "d" || k === "D" || k === "ArrowRight" || k === "в" || k === "В") { keysRef.current.r = true; setFacing(1); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "a" || k === "A" || k === "ArrowLeft" || k === "ф" || k === "Ф") keysRef.current.l = false;
      if (k === "d" || k === "D" || k === "ArrowRight" || k === "в" || k === "В") keysRef.current.r = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const tick = () => {
      const k = keysRef.current;
      if (k.l || k.r) {
        setLanaX(x => Math.max(4, Math.min(720, x + (k.r ? 3 : 0) - (k.l ? 3 : 0))));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
  }, []);

  const openDoor = () => {
    if (!keyFound) { onToast("🔒 Сначала найди ключ"); return; }
    setDoorOpen(true);
    onToast("🚪 Дверь открыта! +15 монет");
    onCollect({ name: "Открытая дверь", emoji: "🚪", hpGain: 0 }, classroom.spots[0]);
  };

  const tryLeave = () => {
    if (!doorOpen) { onToast("🔒 Дверь закрыта — выполни квест"); return; }
    onLeave();
  };

  return (
    <div className="relative w-full overflow-hidden border-2 border-zinc-800 rounded bg-[#0a0610]"
      style={{ height: 380 }}>
      {/* задняя стена */}
      <div className="absolute inset-x-0 top-0" style={{
        height: 230,
        background: "linear-gradient(180deg,#1a1018,#0d0610 70%,#080308)",
      }} />
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 800 380" preserveAspectRatio="none">
        <path d="M 40 60 L 80 100 L 60 140 L 110 180" stroke="#1a0a0a" strokeWidth="1.5" fill="none" />
        <path d="M 700 30 L 750 80 L 720 130 L 770 180" stroke="#1a0a0a" strokeWidth="1.5" fill="none" />
      </svg>
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 800 380" preserveAspectRatio="none">
        <path d="M 250 20 C 240 70, 270 110, 245 160" stroke="#5a0a0a" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.85" />
        <circle cx="245" cy="160" r="6" fill="#5a0a0a" />
        <path d="M 580 0 C 575 40, 600 70, 585 110" stroke="#5a0a0a" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
      </svg>

      {/* ОКНО с луной и зомби-руками */}
      <div className="absolute" style={{ left: 430, top: 18, width: 190, height: 130 }}>
        <div className="absolute inset-0 border-4 border-zinc-700 overflow-hidden"
          style={{ background: "linear-gradient(180deg,#0d1a3a 0%,#1a2550 40%,#0a1530 100%)" }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="absolute bg-white rounded-full" style={{
              left: `${(i * 53) % 100}%`, top: `${(i * 37) % 75}%`,
              width: 2, height: 2, opacity: 0.3 + ((i * 11) % 7) / 10,
            }} />
          ))}
          <div className="absolute" style={{
            top: 14, right: 14, width: 50, height: 50, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #fef9d4 0%, #e8dca0 55%, #a89c60 100%)",
            boxShadow: "0 0 40px 10px rgba(254,249,212,0.45), 0 0 80px 20px rgba(254,249,212,0.18)",
          }}>
            <div className="absolute bg-[#a89c60]/60 rounded-full" style={{ left: 12, top: 16, width: 6, height: 6 }} />
            <div className="absolute bg-[#a89c60]/60 rounded-full" style={{ left: 26, top: 28, width: 4, height: 4 }} />
            <div className="absolute bg-[#a89c60]/60 rounded-full" style={{ left: 20, top: 34, width: 5, height: 5 }} />
          </div>
          <div className="absolute bg-zinc-700/40 rounded-full blur-md" style={{ top: 38, right: 4, width: 76, height: 12 }} />
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#050810]" style={{
            clipPath: "polygon(0 100%,0 60%,8% 50%,15% 60%,22% 30%,32% 40%,42% 20%,52% 35%,62% 25%,72% 45%,82% 35%,92% 55%,100% 45%,100% 100%)",
          }} />
        </div>
        <div className="absolute top-0 bottom-0 w-[3px] bg-zinc-700" style={{ left: "50%" }} />
        <div className="absolute left-0 right-0 h-[3px] bg-zinc-700" style={{ top: "50%" }} />
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 200 140" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="80" y2="50" stroke="#cfd6dc" strokeWidth="0.6" opacity="0.6" />
          <line x1="200" y1="20" x2="120" y2="90" stroke="#cfd6dc" strokeWidth="0.6" opacity="0.6" />
          <line x1="30" y1="140" x2="100" y2="80" stroke="#cfd6dc" strokeWidth="0.6" opacity="0.6" />
        </svg>
        <div className="absolute" style={{ left: 6, bottom: -34, transform: "rotate(-12deg)" }}><ZombieHand delay={0} /></div>
        <div className="absolute" style={{ left: 92, bottom: -38, transform: "rotate(8deg)" }}><ZombieHand delay={0.4} /></div>
        <div className="absolute" style={{ right: -6, bottom: -28, transform: "rotate(20deg) scaleX(-1)" }}><ZombieHand delay={0.8} /></div>
        <div className="absolute -bottom-1 left-2 right-2 h-2 bg-[#5a0a0a] opacity-80" />
        <div className="absolute -top-4 left-2 text-[9px] font-pixel text-red-300 animate-pulse">⚠ они снаружи</div>
      </div>

      {/* Доска */}
      <div className="absolute" style={{ left: 24, top: 28, width: 180, height: 90 }}>
        <div className="absolute inset-0 bg-[#0a2a1a] border-4 border-[#3a2a1a]" />
        <div className="absolute inset-2 text-[10px] font-pixel text-red-400 leading-tight">
          ВЫХОДА НЕТ...<br/>НАЙДИ КЛЮЧ 🗝
        </div>
      </div>

      {/* Запертая дверь справа на стене */}
      <div className="absolute" style={{ right: 16, top: 24, width: 130, height: 200 }}>
        {/* рамка */}
        <div className="absolute inset-0 bg-[#3a2618] border-4 border-[#1a0e08]" />
        {/* филёнки */}
        <div className="absolute left-3 right-3 top-3 h-16 bg-[#2a1810] border-2 border-[#0a0604]" />
        <div className="absolute left-3 right-3 top-24 h-16 bg-[#2a1810] border-2 border-[#0a0604]" />
        {/* следы крови */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 130 200" preserveAspectRatio="none">
          <path d="M 20 40 C 18 60, 28 80, 22 100" stroke="#5a0a0a" strokeWidth="3" fill="none" opacity="0.85" />
          <circle cx="22" cy="100" r="3" fill="#5a0a0a" />
        </svg>
        {/* замок */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 bg-[#1a1a1a] border-2 border-[#5a5a5a] rounded-full">
          {doorOpen ? "🔓" : "🔒"}
        </div>
        {/* статус двери */}
        <div className="absolute -bottom-1 left-0 right-0 text-center text-[10px] font-pixel">
          {doorOpen ? (
            <span className="text-emerald-300">✓ ОТКРЫТО</span>
          ) : (
            <span className="text-amber-200">{keyFound ? "Поверни ключ →" : "🔒 нужен ключ"}</span>
          )}
        </div>
      </div>

      {/* Шкаф с трубами */}
      <div className="absolute" style={{ left: 230, top: 110, width: 70, height: 60 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-2 bg-[#5a5a5a] border border-black" style={{ left: i * 11 }} />
        ))}
      </div>

      {/* Пол */}
      <div className="absolute inset-x-0 bottom-0" style={{
        height: 150,
        background: "repeating-linear-gradient(90deg,#2a1f1a 0 50px,#1f1612 50px 100px)",
        boxShadow: "inset 0 4px 0 #0a0606",
      }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="absolute" style={{
          left: 40 + i * 90, bottom: 6 + ((i * 7) % 12),
          width: 12, height: 8,
          background: i % 2 ? "#c9bfa8" : "#5a3a1a",
          transform: `rotate(${(i * 47) % 360}deg)`, opacity: 0.7,
        }} />
      ))}

      {/* Лана у входа */}
      <div className="absolute" style={{ left: 6, bottom: 28 }}>
        <PixelHuman palette={lanaPalette} facing={1} size={64} variant="girl" />
      </div>

      {/* Точки поиска */}
      {classroom.spots.map(spot => {
        const isKeySpot = spot.id === keySpotId;
        return (
          <SpotEl key={spot.id} spot={spot} taken={taken.has(spot.id)} lit={lit} hasKey={isKeySpot}
            onClick={() => {
              if (taken.has(spot.id)) return;
              setTaken(prev => new Set(prev).add(spot.id));
              if (isKeySpot) {
                setKeyFound(true);
                onCollect(KEY_ITEM, spot);
                onToast("🗝 Ключ от двери найден!");
              }
              if (spot.item) onCollect(spot.item, spot);
            }} />
        );
      })}

      {/* Темнота если нет фонаря или села батарея */}
      {!lit && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 8% 80%, rgba(0,0,0,0) 60px, rgba(0,0,0,0.94) 220px, rgba(0,0,0,0.98) 100%)",
          }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] font-pixel text-red-300 animate-pulse">
            🌑 темно — без фонарика не разглядеть точки и код
          </div>
        </div>
      )}
      {lit && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 420px 280px at 30% 75%, rgba(255,240,180,0.0) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.55) 95%)",
          }} />
      )}

      {/* Панель квеста сверху */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-pixel bg-black/85 px-3 py-1 rounded border border-amber-400/40 flex items-center gap-3 z-10">
        <span className={keyFound ? "text-emerald-300" : "text-amber-200"}>
          {keyFound ? "✓ Ключ 🗝" : "✗ Найди ключ 🗝"}
        </span>
        <span className="text-zinc-400">· Точек: {remaining}/{classroom.spots.length}</span>
      </div>

      {/* Панель двери — управление квестом */}
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 z-10">
        <div className="flex items-center gap-2 bg-black/85 border border-amber-700/60 rounded p-2">
          {!doorOpen && (
            <Button size="sm" onClick={openDoor} disabled={!keyFound}>
              {keyFound ? "🗝 Открыть дверь" : "🔒 Нужен ключ"}
            </Button>
          )}
          {doorOpen && (
            <span className="text-emerald-300 font-pixel text-xs px-2">🚪 Дверь открыта</span>
          )}
        </div>
        <Button size="sm" variant={doorOpen ? "default" : "secondary"} onClick={tryLeave} disabled={!doorOpen}>
          {doorOpen ? "→ Выйти в коридор" : "🔒 Заперто"}
        </Button>
      </div>
    </div>
  );
}


export default function EscapeGame() {
  // Persisted (menu / shop)
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [menuTab, setMenuTab] = useState<"play" | "outfit" | "shop" | "leaderboard">("play");
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window === "undefined") return "Лана";
    return localStorage.getItem("lana_player_name") || "Лана";
  });
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const startTimeRef = useRef<number>(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);

  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [x, setX] = useState(120);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [moving, setMoving] = useState(false);
  const baseMaxHp = 100 + (save.owned.hp ? 25 : 0);
  const [hp, setHp] = useState(baseMaxHp);
  const [maxHp, setMaxHp] = useState(baseMaxHp);
  const [strength, setStrength] = useState(1);
  const [killed, setKilled] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [hint, setHint] = useState("");
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [inv, setInv] = useState<InvItem[]>([]);
  const invRef = useRef(inv); invRef.current = inv;
  const lastBiteRef = useRef(0);

  // Hunger 0..100. Tick down over time; at 0 starts damaging HP.
  const MAX_HUNGER = 100;
  const [hunger, setHunger] = useState(MAX_HUNGER);
  const hungerRef = useRef(hunger); hungerRef.current = hunger;

  // Сидя на корточках — медленно, но без шума.
  const [crouching, setCrouching] = useState(false);
  const crouchRef = useRef(false); crouchRef.current = crouching;

  // Спящие зомби, которых уже разбудили (после этого ведут себя как обычные).
  const wokenRef = useRef<Set<string>>(new Set());

  // ===== Фонарик и батарея =====
  const MAX_BATTERY = 100;
  const [foundFlashlight, setFoundFlashlight] = useState(false);
  const [battery, setBattery] = useState(MAX_BATTERY);
  const hasFlashlight = save.owned.flashlight || foundFlashlight;
  const flashlightOn = hasFlashlight && battery > 0;

  // Weapons remaining (decreases as used; bought in shop)
  const [batLeft, setBatLeft] = useState(save.owned.bat);
  const [gunLeft, setGunLeft] = useState(save.owned.gun);
  const [coins, setCoins] = useState(save.coins);
  // Running mode (Shift). Noisy — wakes "sleeping" zombies sooner.
  const [running, setRunning] = useState(false);

  // Selected outfit
  const outfit = useMemo(() => OUTFITS.find(o => o.id === save.outfit) ?? OUTFITS[0], [save.outfit]);
  const lanaPalette = outfit.palette;
  const isNinja = outfit.id === "ninja";

  // Persist coins + owned weapons left on changes
  useEffect(() => {
    writeSave({ ...save, coins });
  }, [coins]);

  const cur = levels[level];
  const zombies = cur.zombies;
  const classrooms = cur.classrooms;
  const EXIT_X = cur.exitX;
  const WORLD_W = cur.worldW;
  const isFinalLevel = level === levels.length - 1;

  const keys = useRef<Record<string, boolean>>({});
  const xRef = useRef(x); xRef.current = x;
  const viewportRef = useRef<HTMLDivElement>(null);

  // Animated zombie positions (patrol around their home x).
  const zomPosRef = useRef<Record<string, number>>({});
  const [, setZomTick] = useState(0);
  const tStartRef = useRef(performance.now());
  const zx = useCallback((z: Zombie, idx: number) => {
    // Sleeping (and not yet woken) — стоят на месте.
    if (z.sleeping && !wokenRef.current.has(z.id)) return z.x;
    const t = (performance.now() - tStartRef.current) / 1000;
    return z.x + Math.sin(t * 0.9 + idx * 1.7) * 60;
  }, []);
  const killedRef = useRef(killed); killedRef.current = killed;

  // input
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  const allKilled = killed.size === zombies.length;

  // interact + weapon
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (modal.kind !== "none") return;
      const k = e.key.toLowerCase();
      const px = xRef.current;
      // Weapon: F = pistol (instant kill), G = bat (stun = win without minigame)
      if (k === "f" || k === "g") {
        const z = zombies.find((zz, i) => !killed.has(zz.id) && Math.abs(zx(zz, i) - px) < REACH + 30);
        if (!z) return;
        if (k === "f" && gunLeft > 0) {
          setGunLeft(n => { const nn = n - 1; setSave(s => { const ns = { ...s, owned: { ...s.owned, gun: nn } }; writeSave(ns); return ns; }); return nn; });
          setKilled(prev => new Set(prev).add(z.id));
          setCoins(c => c + 25);
          setToast(`🔫 ${z.name} — выстрел! +25 монет`);
          setTimeout(() => setToast(""), 1600);
          return;
        }
        if (k === "g" && batLeft > 0) {
          setBatLeft(n => { const nn = n - 1; setSave(s => { const ns = { ...s, owned: { ...s.owned, bat: nn } }; writeSave(ns); return ns; }); return nn; });
          setKilled(prev => new Set(prev).add(z.id));
          setCoins(c => c + 15);
          setToast(`🏏 ${z.name} — оглушён битой! +15 монет`);
          setTimeout(() => setToast(""), 1600);
          return;
        }
        setToast(k === "f" ? "🔫 Нет патронов" : "🏏 Нет бит");
        setTimeout(() => setToast(""), 1200);
        return;
      }
      if (k === "b") { setModal({ kind: "backpack" }); return; }
      if (k !== "e" && e.key !== "Enter") return;
      // nearest zombie
      const z = zombies.find((zz, i) => !killed.has(zz.id) && Math.abs(zx(zz, i) - px) < REACH);
      if (z) { setModal({ kind: "task", zombie: z }); return; }
      // nearest classroom
      const c = classrooms.find(c => !searched.has(c.id) && Math.abs(c.x - px) < REACH);
      if (c) { setModal({ kind: "search", classroom: c }); return; }
      // exit door
      if (Math.abs(EXIT_X - px) < REACH) {
        if (!allKilled) {
          setToast("Дверь не откроется — впереди ещё зомби.");
          setTimeout(() => setToast(""), 1800);
        } else setModal({ kind: isFinalLevel ? "doorTask" : "exit" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal.kind, killed, searched, allKilled, level, gunLeft, batLeft, zombies, zx, EXIT_X]);

  // game loop — walking + auto-block at zombies
  useEffect(() => {
    if (!started || modal.kind !== "none") { setMoving(false); return; }
    let raf = 0;
    const tick = () => {
      // Update zombie patrol positions
      const pos: Record<string, number> = {};
      zombies.forEach((z, i) => { pos[z.id] = zx(z, i); });
      zomPosRef.current = pos;
      setZomTick(t => (t + 1) % 1000000);

      // Crouch (C) — тихо, медленно. Run (Shift) — шумно, быстро.
      const isCrouch = !!(keys.current["c"] || keys.current["control"]);
      const isRun = !isCrouch && !!(keys.current["shift"]);
      setRunning(isRun);
      setCrouching(isCrouch);
      const speed = isCrouch ? SPEED * 0.45 : (isRun ? SPEED * 1.7 : SPEED);

      let dx = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) { dx -= 1; setFacing(-1); }
      if (keys.current["d"] || keys.current["arrowright"]) { dx += 1; setFacing(1); }
      if (dx !== 0) {
        setMoving(true);
        setX(p => {
          let np = clamp(p + dx * speed, 80, WORLD_W - 80);
          const block = zombies.find(z => {
            if (killedRef.current.has(z.id)) return false;
            const zc = pos[z.id];
            return (dx > 0 && zc > p && zc < np + 30) || (dx < 0 && zc < p && zc > np - 30);
          });
          if (block) np = dx > 0 ? pos[block.id] - 40 : pos[block.id] + 40;
          if (!allKilled && dx > 0 && EXIT_X > p && EXIT_X < np + 30) np = EXIT_X - 40;
          return np;
        });
      } else setMoving(false);

      const nowT = performance.now();

      // ===== Sleeping zombies: hearing detection =====
      // Сидя на корточках — полностью тихо. Стоя — слышат. Бегом — слышат издалека.
      // Услышали = просыпаются и сразу кусают за огромный урон.
      if (!isCrouch) {
        const hearRange = isRun ? 130 : (dx !== 0 ? 75 : 40) - (isNinja ? 10 : 0);
        for (let i = 0; i < zombies.length; i++) {
          const z = zombies[i];
          if (!z.sleeping) continue;
          if (killedRef.current.has(z.id) || wokenRef.current.has(z.id)) continue;
          if (Math.abs(z.x - xRef.current) < hearRange) {
            wokenRef.current.add(z.id);
            const dmg = 35 + level * 5 + (isRun ? 15 : 0);
            setHp(h => Math.max(0, h - dmg));
            setShake(true);
            setTimeout(() => setShake(false), 600);
            setToast(`😱 ${z.name} проснулся и накинулся! -${dmg} HP`);
            setTimeout(() => setToast(""), 2200);
            lastBiteRef.current = nowT;
            break;
          }
        }
      }

      // Contact damage — patrolling zombie within bite range.
      const biteCD = isRun ? 500 : 800;
      const biteRange = (isCrouch ? 22 : (isRun ? 48 : 32)) - (isNinja ? 6 : 0);
      if (nowT - lastBiteRef.current > biteCD) {
        for (let i = 0; i < zombies.length; i++) {
          const z = zombies[i];
          if (killedRef.current.has(z.id)) continue;
          // Спящие, ещё не разбуженные, не кусают пассивно.
          if (z.sleeping && !wokenRef.current.has(z.id)) continue;
          if (Math.abs(pos[z.id] - xRef.current) < biteRange) {
            lastBiteRef.current = nowT;
            const base = 4 + Math.floor(Math.random() * 5);
            const dmg = base + (level * 2) + (isRun ? 3 : 0);
            setHp(h => Math.max(0, h - dmg));
            setShake(true);
            setTimeout(() => setShake(false), 350);
            setToast(`🩸 ${z.name} кусает! -${dmg} HP${isRun ? " (шумно!)" : ""}`);
            setTimeout(() => setToast(""), 1200);
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, modal.kind, allKilled, level, zombies, EXIT_X, WORLD_W, zx]);

  // hint
  useEffect(() => {
    const id = setInterval(() => {
      const px = xRef.current;
      const z = zombies.find((z, i) => !killed.has(z.id) && Math.abs((zomPosRef.current[z.id] ?? zx(z, i)) - px) < REACH);
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
      const reward = 10 + level * 5;
      setCoins(c => c + reward);
      setToast(`💀 ${z.name} повержен! +${reward} 🪙`);
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

  // Подобрать предмет внутри сцены класса.
  const collectSpotItem = useCallback((loot: LootItem, _spot: SearchSpot) => {
    if (loot.strengthGain) setStrength(s => s + loot.strengthGain!);
    if (loot.givesFlashlight) {
      setFoundFlashlight(true);
      setBattery(b => Math.max(b, loot.battery ?? MAX_BATTERY));
      setToast(`🔦 Найден ${loot.name}! Теперь Лана видит в темноте.`);
      setTimeout(() => setToast(""), 1800);
      setCoins(c => c + 8);
      return;
    }
    const item: InvItem = {
      id: `${loot.name}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
      name: loot.name,
      emoji: loot.emoji,
      hp: loot.hpGain ?? 0,
      food: loot.foodGain ?? 0,
      strength: loot.strengthGain ?? 0,
      battery: loot.battery,
    };
    if (item.hp || item.food || item.battery) {
      setInv(prev => [...prev, item]);
      const bonus = [
        item.hp ? `+${item.hp} HP` : null,
        item.food ? `+${item.food} 🍴` : null,
        item.battery ? `+${item.battery}% 🔋` : null,
      ].filter(Boolean).join(", ");
      setToast(`🎒 ${loot.emoji} ${loot.name}${bonus ? ` (${bonus})` : ""}`);
    } else {
      setToast(`Найдено: ${loot.emoji} ${loot.name}${loot.strengthGain ? ` (+${loot.strengthGain} 💪)` : ""}`);
    }
    setCoins(c => c + 3);
    setTimeout(() => setToast(""), 1600);
  }, []);

  // Закрыть комнату — пометить как обысканную.
  const leaveClassroom = useCallback(() => {
    if (modal.kind !== "search") { setModal({ kind: "none" }); return; }
    const c = modal.classroom;
    setSearched(prev => new Set(prev).add(c.id));
    setModal({ kind: "none" });
  }, [modal]);

  // Use a specific item from the backpack.
  const useItem = useCallback((idx: number) => {
    const it = invRef.current[idx];
    if (!it) return;
    setInv(p => p.filter((_, i) => i !== idx));
    if (it.hp) setHp(h => Math.min(maxHp, h + it.hp));
    if (it.food) setHunger(h => Math.min(MAX_HUNGER, h + it.food));
    if (it.strength) setStrength(s => s + it.strength);
    if (it.battery) {
      if (!hasFlashlight) {
        setToast(`🪫 ${it.emoji} ${it.name}: нет фонарика — батарейка не нужна сейчас.`);
      } else {
        setBattery(b => Math.min(MAX_BATTERY, b + it.battery!));
        setToast(`🔋 ${it.emoji} +${it.battery}% заряда фонаря`);
      }
    } else {
      setToast(`💊 ${it.emoji} ${it.name} использовано`);
    }
    setTimeout(() => setToast(""), 1400);
  }, [maxHp, hasFlashlight]);

  // Auto-emergency-heal только при критическом HP.
  useEffect(() => {
    if (!started) return;
    if (modal.kind === "lose" || modal.kind === "win") return;
    if (hp === 0) { setModal({ kind: "lose" }); return; }
    if (hp < 20 && invRef.current.some(i => i.hp > 0)) {
      const list = invRef.current;
      let bestIdx = -1;
      for (let i = 0; i < list.length; i++) if (list[i].hp > 0 && (bestIdx < 0 || list[i].hp > list[bestIdx].hp)) bestIdx = i;
      if (bestIdx < 0) return;
      const item = list[bestIdx];
      setInv(p => p.filter((_, i) => i !== bestIdx));
      setHp(h => Math.min(maxHp, h + item.hp));
      if (item.food) setHunger(h => Math.min(MAX_HUNGER, h + item.food));
      setToast(`💊 Авто: ${item.emoji} ${item.name} (+${item.hp} HP)`);
      setTimeout(() => setToast(""), 1800);
    }
  }, [hp, started, modal.kind, maxHp]);

  // Hunger tick — убывает со временем, при 0 — кусает голод.
  useEffect(() => {
    if (!started || modal.kind === "lose" || modal.kind === "win") return;
    const id = setInterval(() => {
      if (modal.kind !== "none") return; // не убывает во время заданий
      setHunger(h => {
        const nh = Math.max(0, h - 1);
        if (nh === 0) {
          // голодаем — теряем 2 HP
          setHp(hh => Math.max(0, hh - 2));
          setToast("🍴 Лана голодна! -2 HP");
          setTimeout(() => setToast(""), 1200);
        }
        return nh;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [started, modal.kind]);

  // Разряд батареи — только когда фонарь горит и темно (этаж >= 2) или мы внутри класса.
  useEffect(() => {
    if (!started) return;
    if (modal.kind === "lose" || modal.kind === "win") return;
    const id = setInterval(() => {
      if (!flashlightOn) return;
      const inDarkCorridor = level >= 1 && modal.kind === "none";
      const inSearch = modal.kind === "search";
      if (!inDarkCorridor && !inSearch) return;
      setBattery(b => {
        const nb = Math.max(0, b - 1);
        if (nb === 0 && b > 0) {
          setToast("🪫 Батарейка села! Нужна новая.");
          setTimeout(() => setToast(""), 1600);
        }
        return nb;
      });
    }, 900);
    return () => clearInterval(id);
  }, [started, modal.kind, flashlightOn, level]);

  const beginGame = () => {
    const mh = 100 + (save.owned.hp ? 25 : 0);
    setMaxHp(mh); setHp(mh);
    setBatLeft(save.owned.bat); setGunLeft(save.owned.gun);
    setLevel(0); setX(120); setStrength(1);
    setKilled(new Set()); setSearched(new Set()); setInv([]);
    setHunger(MAX_HUNGER);
    setBattery(MAX_BATTERY);
    setFoundFlashlight(false);
    wokenRef.current = new Set();
    setModal({ kind: "none" });
    startTimeRef.current = Date.now();
    setScoreSubmitted(false);
    setStarted(true);
  };

  const submitMyScore = async (won: boolean) => {
    if (scoreSubmitted || submittingScore) return;
    setSubmittingScore(true);
    try {
      const name = (playerName || "Лана").trim().slice(0, 24) || "Лана";
      if (typeof window !== "undefined") localStorage.setItem("lana_player_name", name);
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await submitScore({
        name,
        coins: coins + (won ? 200 : 0),
        levels_completed: won ? levels.length : level,
        time_seconds: elapsed,
        won,
      });
      setScoreSubmitted(true);
      setLeaderboardKey(k => k + 1);
      setToast("Рекорд отправлен!");
    } catch (e: any) {
      setToast("Ошибка отправки: " + (e?.message ?? "неизвестно"));
    } finally {
      setSubmittingScore(false);
      setTimeout(() => setToast(""), 2000);
    }
  };

  const buyOutfit = (o: Outfit) => {
    if (save.outfit === o.id) return;
    if (coins < o.price) { setToast("Не хватает монет"); setTimeout(() => setToast(""), 1500); return; }
    const ns = { ...save, coins: coins - o.price, outfit: o.id };
    setCoins(ns.coins); setSave(ns); writeSave(ns);
  };
  const equipOutfit = (o: Outfit) => {
    const ns = { ...save, outfit: o.id };
    setSave(ns); writeSave(ns);
  };
  const buyUpgrade = (u: Upgrade) => {
    if (coins < u.price) { setToast("Не хватает монет"); setTimeout(() => setToast(""), 1500); return; }
    const owned = { ...save.owned };
    if (u.id === "bat" || u.id === "gun") {
      if ((owned[u.id] ?? 0) >= (u.max ?? 99)) return;
      owned[u.id] = (owned[u.id] ?? 0) + 1;
    } else {
      if (owned[u.id]) return;
      owned[u.id] = true;
    }
    const ns = { ...save, coins: coins - u.price, owned };
    setCoins(ns.coins); setSave(ns); writeSave(ns);
  };

  if (!started) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 p-4 overflow-auto">
        <div className="max-w-3xl w-full space-y-4">
          <div className="flex justify-center items-end gap-4">
            <Crewmate color="#ff66aa" palette={lanaPalette} size={72} />
            <PixelZombie />
            <PixelZombie facing={1} />
            <Impostor size={80} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-primary text-center">СБЕГИ ИЗ ШКОЛЫ</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="px-3 py-1 bg-amber-900/40 border border-amber-700 rounded font-pixel text-amber-200 flex items-center gap-2">
              <Coins className="h-4 w-4" /> {coins} монет
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {[
              { id: "play", label: "Игра", icon: ArrowUp },
              { id: "outfit", label: "Одежда", icon: Shirt },
              { id: "shop", label: "Магазин", icon: ShoppingBag },
              { id: "leaderboard", label: "Рекорды", icon: Trophy },
            ].map(t => (
              <button key={t.id} onClick={() => setMenuTab(t.id as typeof menuTab)}
                className={`px-4 py-2 rounded font-pixel text-sm flex items-center gap-2 border ${menuTab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-zinc-700 text-zinc-300"}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {menuTab === "play" && (
            <div className="bg-black/40 rounded p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Школа захвачена зомби. Лана зачищает 3 этажа, выполняет задания, чтобы открыть выход.
              </p>
              <div className="text-left text-[12px] grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                <p>🎮 <b>A/D</b> · <b>←/→</b> — идти</p>
                <p>🏃 <b>Shift</b> — бежать (шумно!)</p>
                <p>🤫 <b>C</b> / <b>Ctrl</b> — присесть (тихо, мимо спящих)</p>
                <p>🎒 <b>B</b> — рюкзак / использовать предметы</p>
                <p>⚡ <b>E</b> / <b>Enter</b> — взаимодействие</p>
                <p>🏏 <b>G</b> — бита · 🔫 <b>F</b> — пистолет</p>
                <p>🍴 Не забывай есть — голод отнимает HP</p>
                <p>😴 Спящие зомби съедят, если их услышать</p>
                <p>🌑 На 2–3 этаже темно — нужен фонарик</p>
              </div>
              <div className="flex justify-center">
                <Button size="lg" onClick={beginGame} className="font-display">НАЧАТЬ ИГРУ</Button>
              </div>
            </div>
          )}

          {menuTab === "outfit" && (
            <div className="bg-black/40 rounded p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {OUTFITS.map(o => {
                const owned = o.price === 0 || (save.outfit === o.id);
                const equipped = save.outfit === o.id;
                return (
                  <div key={o.id} className={`p-3 rounded border ${equipped ? "border-primary bg-primary/10" : "border-zinc-700 bg-black/40"} flex flex-col items-center gap-2`}>
                    <PixelHuman palette={o.palette} variant="girl" size={64} />
                    <div className="text-xs font-pixel text-center">{o.name}</div>
                    {equipped
                      ? <div className="text-[10px] text-primary font-pixel">НАДЕТО</div>
                      : owned
                        ? <Button size="sm" variant="secondary" onClick={() => equipOutfit(o)}>Надеть</Button>
                        : <Button size="sm" onClick={() => buyOutfit(o)} disabled={coins < o.price}>
                            <Coins className="h-3 w-3 mr-1" /> {o.price}
                          </Button>}
                  </div>
                );
              })}
            </div>
          )}

          {menuTab === "shop" && (
            <div className="bg-black/40 rounded p-4 space-y-2">
              {UPGRADES.map(u => {
                const I = u.icon;
                const cur = u.id === "bat" || u.id === "gun" ? (save.owned[u.id] as number) : (save.owned[u.id] ? 1 : 0);
                const maxed = u.id === "bat" || u.id === "gun" ? cur >= (u.max ?? 5) : cur >= 1;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 border border-zinc-700 rounded bg-black/40">
                    <I className="h-6 w-6 text-amber-300" />
                    <div className="flex-1">
                      <div className="font-pixel text-sm">{u.name} {(u.id === "bat" || u.id === "gun") && <span className="text-amber-300">×{cur}</span>}</div>
                      <div className="text-[11px] text-muted-foreground">{u.desc}</div>
                    </div>
                    <Button size="sm" disabled={maxed || coins < u.price} onClick={() => buyUpgrade(u)}>
                      {maxed ? "Куплено" : <><Coins className="h-3 w-3 mr-1" /> {u.price}</>}
                    </Button>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground text-center pt-1">Покупки сохраняются между играми.</p>
            </div>
          )}

          {menuTab === "leaderboard" && (
            <div className="bg-black/40 rounded p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400 font-pixel shrink-0">Имя:</label>
                <Input
                  value={playerName}
                  maxLength={24}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (typeof window !== "undefined") localStorage.setItem("lana_player_name", e.target.value);
                  }}
                  className="h-8 text-sm"
                  placeholder="Лана"
                />
                <Button size="sm" variant="secondary" onClick={() => setLeaderboardKey(k => k + 1)}>↻</Button>
              </div>
              <Leaderboard refreshKey={leaderboardKey} />
              <p className="text-[10px] text-muted-foreground text-center">
                Топ-20 игроков по монетам. Рекорд отправляется после победы или поражения.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen overflow-hidden bg-black text-foreground relative select-none ${shake ? "shake" : ""}`}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crewmate color="#ff66aa" palette={lanaPalette} size={36} />
          <div>
            <div className="font-display text-sm text-primary">ЛАНА</div>
            <div className="text-[10px] text-muted-foreground">{cur.name}</div>
          </div>
        </div>
        <div className="flex-1 max-w-md space-y-1">
          <div>
            <div className="flex justify-between text-xs mb-1"><span>HP</span><span className="font-mono">{hp} / {maxHp}</span></div>
            <div className="h-3 bg-black/60 rounded border border-red-400/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1"><Utensils className="h-3 w-3 text-amber-300" /> Сытость</span>
              <span className={`font-mono ${hunger < 25 ? "text-red-400 animate-pulse" : "text-amber-200"}`}>{hunger}</span>
            </div>
            <div className="h-2 bg-black/60 rounded border border-amber-700/40 overflow-hidden">
              <div className={`h-full transition-all ${hunger < 25 ? "bg-red-500" : "bg-gradient-to-r from-amber-500 to-yellow-300"}`} style={{ width: `${(hunger / MAX_HUNGER) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          <div className="flex gap-3 justify-end flex-wrap">
            <span className="text-amber-300">🏫 Этаж {cur.id}/{levels.length}</span>
            <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-amber-300" />{coins}</span>
            <span title="Бита (G)">🏏 {batLeft}</span>
            <span title="Пистолет (F)">🔫 {gunLeft}</span>
            {hasFlashlight && (
              <span title={`Фонарик · батарея ${battery}%`} className={`flex items-center gap-1 ${battery === 0 ? "text-red-400 animate-pulse" : (battery < 25 ? "text-amber-400" : "text-amber-200")}`}>
                <Flashlight className="h-3 w-3 inline" />
                {battery > 25 ? <BatteryFull className="h-3 w-3 inline" /> : <BatteryLow className="h-3 w-3 inline" />}
                {battery}%
              </span>
            )}
            <span>💀 {killed.size}/{zombies.length}</span>
            <span>🔍 {searched.size}/{classrooms.length}</span>
            <span className={crouching ? "text-emerald-400" : (running ? "text-red-400" : "text-zinc-500")} title={crouching ? "Сидит — тихо" : (running ? "Бежит — шумно" : "Идёт")}>
              {crouching ? <ArrowDown className="h-3 w-3 inline" /> : (running ? <Volume2 className="h-3 w-3 inline" /> : <VolumeX className="h-3 w-3 inline" />)}
            </span>
          </div>
          <div className="flex gap-1 justify-end items-center min-h-[18px]">
            <button onClick={() => setModal({ kind: "backpack" })}
              className="flex items-center gap-1 text-[10px] text-amber-200 hover:text-amber-100 bg-black/60 border border-amber-700/60 rounded px-2 py-0.5 font-pixel">
              <Backpack className="h-3 w-3" /> Рюкзак [B] · {inv.length}
            </button>
            {inv.slice(0, 5).map((it, i) => (
              <span key={it.id + i} title={`${it.name}${it.hp ? ` +${it.hp} HP` : ""}${it.food ? ` +${it.food} 🍴` : ""}`}
                className="bg-black/60 border border-amber-700/60 rounded px-1 text-sm leading-none">
                {it.emoji}
              </span>
            ))}
            {inv.length > 5 && <span className="text-[10px] text-amber-300">+{inv.length - 5}</span>}
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

          {/* === SCARY DECOR === */}
          {/* Broken windows on the back wall */}
          {Array.from({ length: Math.floor(WORLD_W / 360) }).map((_, i) => {
            const left = 140 + i * 360;
            return (
              <div key={`win-${i}`} className="absolute" style={{ left, top: CEIL_Y + 6, width: 90, height: 70 }}>
                <div className="absolute inset-0 border-2 border-zinc-700 bg-gradient-to-b from-slate-900 to-slate-950" />
                <div className="absolute inset-1 bg-[radial-gradient(circle_at_30%_40%,#1a2a3a_0%,#070a14_70%)] opacity-80" />
                {/* Glass cracks */}
                <svg className="absolute inset-0" viewBox="0 0 90 70" preserveAspectRatio="none">
                  <polygon points="0,0 30,25 0,30" fill="#0a0a14" stroke="#6a7a8a" strokeWidth="0.6" />
                  <line x1="20" y1="10" x2="70" y2="60" stroke="#a0a8b0" strokeWidth="0.4" opacity="0.7" />
                  <line x1="55" y1="5" x2="35" y2="65" stroke="#a0a8b0" strokeWidth="0.4" opacity="0.7" />
                  <line x1="10" y1="40" x2="80" y2="35" stroke="#a0a8b0" strokeWidth="0.4" opacity="0.7" />
                  <polygon points="60,20 80,10 85,30 70,40" fill="#000" stroke="#6a7a8a" strokeWidth="0.4" />
                </svg>
                {/* Window frame cross */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-zinc-700" />
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-zinc-700" />
              </div>
            );
          })}

          {/* Wall blood smears */}
          {Array.from({ length: Math.floor(WORLD_W / 280) }).map((_, i) => {
            const left = 60 + i * 280 + (i % 3) * 35;
            return (
              <svg key={`blood-${i}`} className="absolute pointer-events-none" viewBox="0 0 80 120"
                style={{ left, top: CEIL_Y + 80 + ((i * 17) % 60), width: 80, height: 120, opacity: 0.85 }}>
                <path d={`M 40 ${10 + (i % 4) * 6} C 30 30, 55 40, 38 55 S 25 80, 35 ${100 + (i % 3) * 5}`}
                  stroke="#7a0a0a" strokeWidth="6" fill="none" strokeLinecap="round" />
                <circle cx="42" cy={100 + (i % 3) * 5} r="6" fill="#7a0a0a" />
                <circle cx="48" cy="115" r="3" fill="#5a0505" />
              </svg>
            );
          })}

          {/* Floor trash + glass shards + papers */}
          {Array.from({ length: Math.floor(WORLD_W / 90) }).map((_, i) => {
            const left = 30 + i * 90 + ((i * 53) % 50);
            const kind = i % 5;
            const top = FLOOR_Y + 18 + ((i * 13) % 25);
            if (kind === 0) {
              // crumpled paper
              return <div key={`tr-${i}`} className="absolute" style={{ left, top, width: 14, height: 10, background: "#c9bfa8", boxShadow: "inset -2px -2px 0 #6a5a3a", transform: `rotate(${(i * 37) % 360}deg)` }} />;
            }
            if (kind === 1) {
              // broken bottle/glass shards
              return (
                <svg key={`tr-${i}`} className="absolute" viewBox="0 0 20 10" style={{ left, top: top + 6, width: 20, height: 10 }}>
                  <polygon points="0,8 6,2 8,8" fill="#7ec8d8" opacity="0.7" stroke="#fff" strokeWidth="0.3" />
                  <polygon points="9,8 13,3 16,8" fill="#7ec8d8" opacity="0.6" stroke="#fff" strokeWidth="0.3" />
                  <polygon points="14,8 18,5 20,8" fill="#7ec8d8" opacity="0.5" stroke="#fff" strokeWidth="0.3" />
                </svg>
              );
            }
            if (kind === 2) {
              // blood puddle
              return <div key={`tr-${i}`} className="absolute rounded-full" style={{ left, top: top + 8, width: 28 + ((i * 7) % 16), height: 8, background: "radial-gradient(ellipse, #6a0a0a 0%, #3a0505 70%, transparent 100%)" }} />;
            }
            if (kind === 3) {
              // scattered book
              return (
                <div key={`tr-${i}`} className="absolute" style={{ left, top: top + 4, width: 18, height: 12, background: "#3a5a8a", border: "1px solid #1a2a4a", transform: `rotate(${(i * 23) % 90 - 45}deg)` }}>
                  <div className="h-full w-full" style={{ background: "repeating-linear-gradient(180deg,#f2e8c8 0 2px, transparent 2px 4px)" }} />
                </div>
              );
            }
            // trash bag / debris
            return (
              <div key={`tr-${i}`} className="absolute rounded-t-full" style={{
                left, top: top + 2, width: 24, height: 14,
                background: "linear-gradient(180deg,#1a1a1a,#0a0a0a)",
                boxShadow: "inset 2px 2px 0 #2a2a2a"
              }} />
            );
          })}

          {/* Wall cracks */}
          {Array.from({ length: Math.floor(WORLD_W / 240) }).map((_, i) => {
            const left = 90 + i * 240;
            return (
              <svg key={`crk-${i}`} className="absolute pointer-events-none"
                viewBox="0 0 60 200" style={{ left, top: CEIL_Y, width: 60, height: 200, opacity: 0.55 }}>
                <path d={`M 30 0 L ${20 + (i % 5)} 40 L ${35 + (i % 4)} 80 L ${15 + (i % 6)} 130 L ${28 + (i % 3)} 200`}
                  stroke="#000" strokeWidth="1.2" fill="none" />
                <path d={`M ${24 + (i % 3)} 30 L 10 60`} stroke="#000" strokeWidth="0.8" />
                <path d={`M ${32 + (i % 4)} 90 L 50 120`} stroke="#000" strokeWidth="0.8" />
              </svg>
            );
          })}

          {/* Hanging cobweb at top corners */}
          {Array.from({ length: Math.floor(WORLD_W / 500) }).map((_, i) => (
            <svg key={`web-${i}`} className="absolute pointer-events-none"
              viewBox="0 0 60 60" style={{ left: 40 + i * 500, top: CEIL_Y + 4, width: 60, height: 60, opacity: 0.35 }}>
              <path d="M 0 0 L 60 0 L 30 50 Z" fill="none" stroke="#dcdcdc" strokeWidth="0.4" />
              <path d="M 0 0 L 30 50 M 60 0 L 30 50 M 15 0 L 30 50 M 45 0 L 30 50" stroke="#dcdcdc" strokeWidth="0.3" />
              <path d="M 5 8 L 55 8 M 10 18 L 50 18 M 15 28 L 45 28 M 22 40 L 38 40" stroke="#dcdcdc" strokeWidth="0.3" />
            </svg>
          ))}

          {/* Dark red horror tint */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(40,0,0,0.45) 100%)" }} />



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
          {zombies.map((z, i) => {
            if (killed.has(z.id)) {
              return (
                <div key={z.id} className="absolute opacity-60" style={{ left: z.x - 28, top: FLOOR_Y - 20, transform: "rotate(90deg)" }}>
                  <PixelZombie size={56} />
                </div>
              );
            }
            const isSleeping = !!z.sleeping && !wokenRef.current.has(z.id);
            if (isSleeping) {
              return (
                <div key={z.id} className="absolute" style={{ left: z.x - 28, top: FLOOR_Y - 70 }}>
                  {/* tilted up, looking at ceiling */}
                  <div style={{ transform: "rotate(-18deg)", transformOrigin: "50% 90%" }}>
                    <PixelZombie size={56} facing={1} />
                  </div>
                  {/* Zzz */}
                  <div className="absolute -top-6 left-10 text-blue-200 font-pixel text-sm animate-pulse drop-shadow">
                    Zzz
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-900/80 text-blue-100 text-[9px] px-1 rounded font-pixel flex items-center gap-1 whitespace-nowrap">
                    😴 {z.name}
                  </div>
                </div>
              );
            }
            const zCur = zomPosRef.current[z.id] ?? z.x;
            return (
              <div key={z.id} className="absolute zombie-walk" style={{ left: zCur - 28, top: FLOOR_Y - 70, transition: "left 0.08s linear" }}>
                <PixelZombie size={56} facing={zCur > x ? -1 : 1} />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-100 text-[9px] px-1 rounded font-pixel flex items-center gap-1 whitespace-nowrap">
                  <TaskIcon kind={z.kind} className="h-3 w-3" />
                  {z.name}
                </div>
              </div>
            );
          })}

          {/* Lana */}
          <div className="absolute" style={{ left: x - 28, top: FLOOR_Y - 70 }}>
            <div className={moving ? "lana-walk" : "lana-idle"}
              style={crouching ? { transform: "scaleY(0.7) translateY(18px)", transformOrigin: "50% 100%" } : undefined}>
              <Crewmate color="#ff66aa" palette={lanaPalette} facing={facing} size={56} />
            </div>
            {crouching && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-900/80 text-emerald-100 text-[9px] px-1 rounded font-pixel">🤫 тихо</div>
            )}
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none scanlines" />
        </div>
      </div>

      {/* Darkness overlay — 2-3 этаж. С включённым фонарём — большой конус, иначе — крошечный кружок. */}
      {level >= 1 && (
        <div className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: `radial-gradient(circle at ${(x - cam)}px ${FLOOR_Y - 40}px,
              rgba(0,0,0,0) 0px,
              rgba(0,0,0,0) ${flashlightOn ? 120 : 50}px,
              rgba(0,0,0,${level === 1 ? 0.85 : 0.96}) ${flashlightOn ? 280 : 120}px,
              rgba(0,0,0,${level === 1 ? 0.92 : 0.99}) 100%)`,
          }} />
      )}
      {level >= 1 && !flashlightOn && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-red-900/80 border border-red-500 text-red-100 px-3 py-1 rounded font-pixel text-xs">
          {!hasFlashlight
            ? "🌑 Темно! Найди фонарик в классе или купи в магазине · ходи тихо"
            : "🪫 Батарейка села! Используй новую из рюкзака [B]"}
        </div>
      )}

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
          <div className={`bg-zinc-900 border-2 border-primary/60 rounded-lg w-full p-6 relative ${modal.kind === "search" ? "max-w-4xl" : "max-w-2xl"}`}>
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
                <HintBox kind={modal.zombie.kind} advanced={save.owned.hint} />
                {TIME_LIMITS[modal.zombie.kind] !== null && (
                  <TaskTimer
                    key={modal.zombie.id}
                    seconds={TIME_LIMITS[modal.zombie.kind] as number}
                    onTimeout={() => finishTask(false)}
                  />
                )}
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
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-primary">{modal.classroom.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Внутри класса. Ищи фонарик, батарейки, еду и аптечки. За окном — зомби.
                    </p>
                  </div>
                  <div className="text-[11px] font-pixel text-amber-200 flex items-center gap-2">
                    {hasFlashlight ? (
                      <span className={`flex items-center gap-1 ${battery > 0 ? "text-amber-200" : "text-red-400 animate-pulse"}`}>
                        {battery > 25 ? <BatteryFull className="h-4 w-4" /> : <BatteryLow className="h-4 w-4" />}
                        🔦 {battery}%
                      </span>
                    ) : (
                      <span className="text-red-300">🔦 нет фонарика</span>
                    )}
                  </div>
                </div>
                <ClassroomScene
                  classroom={modal.classroom}
                  hasFlashlight={hasFlashlight}
                  batteryPct={battery}
                  onCollect={(loot, spot) => {
                    if (loot.emoji === "🚪") {
                      // триггер "дверь открыта" — даём награду
                      setCoins(c => c + 15);
                      return;
                    }
                    if (loot.emoji === "🗝") {
                      // ключ — не кладём в рюкзак, просто бонус
                      setCoins(c => c + 5);
                      return;
                    }
                    collectSpotItem(loot, spot);
                  }}
                  onLeave={leaveClassroom}
                  lanaPalette={lanaPalette}
                  onConsumeBattery={(n) => {
                    if (battery < n) return false;
                    setBattery(b => Math.max(0, b - n));
                    return true;
                  }}
                  onToast={(m) => { setToast(m); setTimeout(() => setToast(""), 1600); }}
                />
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
                    setInv([]);
                    setHunger(MAX_HUNGER);
                    setBattery(b => Math.min(MAX_BATTERY, b + 40));
                    wokenRef.current = new Set();
                    setHp(h => Math.min(maxHp, h + 20));
                    setModal({ kind: "none" });
                    setToast(`▲ Этаж ${cur.id + 1}`);
                    setTimeout(() => setToast(""), 1800);
                  }}>Подняться ▲</Button>
                </div>
              )
            )}

            {modal.kind === "doorTask" && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <DoorClosed className="h-10 w-10 text-amber-400" />
                  <div>
                    <h2 className="font-display text-lg text-amber-300">Замок на двери</h2>
                    <p className="text-xs text-muted-foreground">Подбери код, чтобы открыть путь к директору.</p>
                  </div>
                </div>
                <HintBox kind="lock" advanced={save.owned.hint} />
                <TaskTimer seconds={30} onTimeout={() => {
                  setHp(h => Math.max(0, h - 15));
                  setShake(true); setTimeout(() => setShake(false), 400);
                  setToast("🩸 Зомби подкрался у двери! -15 HP");
                  setTimeout(() => setToast(""), 1600);
                  setModal({ kind: "none" });
                }} />
                <LockGame onDone={(ok) => {
                  if (ok) { setToast("🚪 Дверь открыта!"); setTimeout(() => setToast(""), 1500); setModal({ kind: "boss" }); }
                  else { setHp(h => Math.max(0, h - 10)); setModal({ kind: "none" }); }
                }} />
              </div>
            )}

            {modal.kind === "boss" && (
              <BossFight onWin={() => setModal({ kind: "win" })} onLose={() => setModal({ kind: "lose" })} />
            )}

            {modal.kind === "backpack" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <Backpack className="h-7 w-7 text-amber-300" />
                  <div>
                    <h2 className="font-display text-lg text-amber-300">Рюкзак Ланы</h2>
                    <p className="text-xs text-muted-foreground">Используй предметы, чтобы лечиться, есть или стать сильнее.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/40 border border-red-700/40 rounded p-2 text-center">
                    <div className="text-red-300">HP</div><div className="font-mono">{hp}/{maxHp}</div>
                  </div>
                  <div className="bg-black/40 border border-amber-700/40 rounded p-2 text-center">
                    <div className="text-amber-300">Сытость</div><div className="font-mono">{hunger}/{MAX_HUNGER}</div>
                  </div>
                  <div className="bg-black/40 border border-emerald-700/40 rounded p-2 text-center">
                    <div className="text-emerald-300">Сила</div><div className="font-mono">×{strength}</div>
                  </div>
                </div>
                {hasFlashlight && (
                  <div className="bg-black/40 border border-amber-600/40 rounded p-2 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2"><Flashlight className="h-4 w-4 text-amber-200" /> Фонарик</span>
                    <span className={`font-mono ${battery === 0 ? "text-red-400" : battery < 25 ? "text-amber-400" : "text-amber-200"}`}>
                      🔋 {battery}%
                    </span>
                  </div>
                )}
                {inv.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">Рюкзак пуст. Ищи предметы в кабинетах.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                    {inv.map((it, idx) => (
                      <div key={it.id} className="flex items-center gap-2 p-2 bg-black/40 border border-amber-700/40 rounded">
                        <div className="text-2xl">{it.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-pixel truncate">{it.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {it.hp ? `+${it.hp} HP ` : ""}
                            {it.food ? `+${it.food} 🍴 ` : ""}
                            {it.strength ? `+${it.strength} 💪 ` : ""}
                            {it.battery ? `+${it.battery}% 🔋` : ""}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => useItem(idx)}>Исп.</Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setModal({ kind: "none" })}>Закрыть</Button>
                </div>
              </div>
            )}

            {modal.kind === "win" && (
              <div className="text-center space-y-4">
                <h2 className="font-display text-2xl text-emerald-400">ПОБЕДА!</h2>
                <p>Лана выбежала из школы. Солнце. Свобода.</p>
                <div className="flex justify-center"><Crewmate color="#ff66aa" palette={lanaPalette} size={80} /></div>
                <p className="text-amber-300 font-pixel">Бонус за победу: +200 🪙</p>
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={playerName}
                    maxLength={24}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="h-8 text-sm max-w-[180px]"
                    placeholder="Твоё имя"
                    disabled={scoreSubmitted}
                  />
                  <Button size="sm" variant="secondary" disabled={scoreSubmitted || submittingScore}
                    onClick={() => submitMyScore(true)}>
                    <Trophy className="h-3 w-3 mr-1" />
                    {scoreSubmitted ? "Отправлено" : "В рекорды"}
                  </Button>
                </div>
                <Button onClick={() => {
                  setCoins(c => c + 200);
                  setStarted(false); setMenuTab(scoreSubmitted ? "leaderboard" : "play"); setModal({ kind: "none" });
                }}>В меню</Button>
              </div>
            )}

            {modal.kind === "lose" && (
              <div className="text-center space-y-4">
                <Skull className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="font-display text-2xl text-red-400">ПОРАЖЕНИЕ</h2>
                <p>Зомби оказались сильнее. Купи улучшения и попробуй снова.</p>
                <p className="text-xs text-zinc-400">Этажей пройдено: {level} · Монет: {coins}</p>
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={playerName}
                    maxLength={24}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="h-8 text-sm max-w-[180px]"
                    placeholder="Твоё имя"
                    disabled={scoreSubmitted}
                  />
                  <Button size="sm" variant="secondary" disabled={scoreSubmitted || submittingScore}
                    onClick={() => submitMyScore(false)}>
                    <Trophy className="h-3 w-3 mr-1" />
                    {scoreSubmitted ? "Отправлено" : "В рекорды"}
                  </Button>
                </div>
                <Button onClick={() => { setStarted(false); setMenuTab(scoreSubmitted ? "leaderboard" : "play"); setModal({ kind: "none" }); }}>В меню</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

