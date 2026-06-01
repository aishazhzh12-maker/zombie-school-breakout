import { useEffect, useRef, useState, useCallback } from "react";
import {
  levels,
  supplyPool,
  combatPuzzles,
  bossExtraPuzzles,
  classroomNames,
  type Puzzle,
  type Supply,
} from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Zap, Trophy, Skull, DoorClosed, Search, Brain, Backpack, KeyRound } from "lucide-react";

type Screen = "intro" | "play" | "win" | "dead";
type Modal =
  | { kind: "none" }
  | { kind: "search"; doorId: number; supply: Supply }
  | { kind: "combat"; zombieId: number; puzzle: Puzzle }
  | { kind: "exit"; bossStep?: number };

type Door = { id: number; x: number; name: string; opened: boolean };
type Zombie = { id: number; x: number; defeated: boolean };

const WORLD_WIDTH = 2400; // px
const VIEWPORT_WIDTH = 900; // logical px for scene
const LANA_SPEED = 4; // px per frame
const INTERACT_RANGE = 70;

// ---------- SVG SPRITES ----------

function LanaSprite({ walking, facingLeft, hurt }: { walking: boolean; facingLeft: boolean; hurt: boolean }) {
  return (
    <div
      className={`${walking ? "lana-walk" : "lana-idle"} ${hurt ? "shake" : ""}`}
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined, transformOrigin: "center bottom" }}
    >
      <svg width="80" height="140" viewBox="0 0 80 140" style={{ filter: hurt ? "hue-rotate(-20deg) brightness(1.3)" : "drop-shadow(0 8px 12px rgba(0,0,0,0.6))" }}>
        {/* shadow */}
        <ellipse cx="40" cy="138" rx="22" ry="3" fill="rgba(0,0,0,0.5)" />
        {/* legs */}
        <rect x="28" y="92" width="10" height="42" rx="3" fill="#1a1d3a" />
        <rect x="42" y="92" width="10" height="42" rx="3" fill="#22264a" />
        {/* shoes */}
        <ellipse cx="33" cy="134" rx="9" ry="4" fill="#0a0a0a" />
        <ellipse cx="47" cy="134" rx="9" ry="4" fill="#0a0a0a" />
        {/* skirt */}
        <path d="M22 78 L58 78 L62 100 L18 100 Z" fill="#3a2030" />
        <path d="M22 78 L58 78 L60 88 L20 88 Z" fill="#4a2840" />
        {/* body / shirt */}
        <path d="M22 42 Q22 38 26 38 L54 38 Q58 38 58 42 L58 82 L22 82 Z" fill="#e8e3d5" />
        {/* tie */}
        <path d="M37 42 L43 42 L42 58 L40 64 L38 58 Z" fill="#8a1f1f" />
        {/* backpack strap */}
        <rect x="20" y="44" width="4" height="36" rx="2" fill="#2a2a3a" />
        <rect x="56" y="44" width="4" height="36" rx="2" fill="#2a2a3a" />
        {/* arms */}
        <rect x="14" y="44" width="10" height="34" rx="5" fill="#e6b89c" />
        <rect x="56" y="44" width="10" height="34" rx="5" fill="#e6b89c" />
        {/* neck */}
        <rect x="34" y="32" width="12" height="10" fill="#e6b89c" />
        {/* head */}
        <ellipse cx="40" cy="22" rx="14" ry="16" fill="#e6b89c" />
        {/* hair back */}
        <path d="M26 18 Q26 4 40 4 Q54 4 54 18 L54 28 L48 26 L48 16 L32 16 L32 26 L26 28 Z" fill="#2a1810" />
        {/* hair side */}
        <path d="M26 18 Q26 28 30 32 L30 24 Q26 22 26 18 Z" fill="#2a1810" />
        <path d="M54 18 Q54 28 50 32 L50 24 Q54 22 54 18 Z" fill="#2a1810" />
        {/* ponytail */}
        <path d="M52 18 Q60 22 62 32 Q63 42 58 46 Q56 38 54 30 Z" fill="#2a1810" />
        {/* face: eyes */}
        <ellipse cx="35" cy="22" rx="1.5" ry="2" fill="#0a0a0a" />
        <ellipse cx="45" cy="22" rx="1.5" ry="2" fill="#0a0a0a" />
        {/* brows */}
        <rect x="32" y="18" width="6" height="1.2" fill="#1a0a08" />
        <rect x="42" y="18" width="6" height="1.2" fill="#1a0a08" />
        {/* mouth */}
        <path d="M36 28 Q40 30 44 28" stroke="#7a2a2a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* cheek scratch */}
        <path d="M46 24 L48 27" stroke="#8a1f1f" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function ZombieSprite({ defeated }: { defeated: boolean }) {
  return (
    <div className={defeated ? "" : "zombie-walk"} style={{ opacity: defeated ? 0 : 1, transition: "opacity 0.5s, transform 0.5s", transform: defeated ? "translateY(40px) rotate(90deg)" : undefined }}>
      <svg width="80" height="140" viewBox="0 0 80 140" style={{ filter: "drop-shadow(0 6px 10px rgba(80,20,20,0.6))" }}>
        <ellipse cx="40" cy="138" rx="22" ry="3" fill="rgba(0,0,0,0.5)" />
        {/* legs torn */}
        <path d="M28 92 L36 92 L34 134 L26 134 Z" fill="#1a1410" />
        <path d="M44 92 L52 92 L54 134 L46 134 Z" fill="#1a1410" />
        {/* body torn shirt */}
        <path d="M20 42 L60 42 L62 90 L18 90 Z" fill="#5a6a4a" />
        <path d="M30 60 L36 70 L32 78 Z" fill="#2a1a18" />
        <path d="M48 50 L54 60 L50 68 Z" fill="#2a1a18" />
        {/* arms outstretched */}
        <rect x="6" y="46" width="14" height="10" rx="4" fill="#7a8a6a" />
        <rect x="60" y="46" width="14" height="10" rx="4" fill="#7a8a6a" />
        {/* claws */}
        <path d="M4 50 L0 48 L4 52 L0 54 Z" fill="#1a1a1a" />
        <path d="M76 50 L80 48 L76 52 L80 54 Z" fill="#1a1a1a" />
        {/* neck */}
        <rect x="34" y="32" width="12" height="10" fill="#7a8a6a" />
        {/* head */}
        <ellipse cx="40" cy="22" rx="14" ry="16" fill="#7a8a6a" />
        {/* hair sparse */}
        <path d="M28 12 Q40 4 52 12 L50 18 L46 14 L40 16 L34 14 L30 18 Z" fill="#1a1a14" />
        {/* glowing eyes */}
        <circle cx="34" cy="22" r="3" fill="#ff2020" />
        <circle cx="46" cy="22" r="3" fill="#ff2020" />
        <circle cx="34" cy="22" r="1.5" fill="#ffe0e0" />
        <circle cx="46" cy="22" r="1.5" fill="#ffe0e0" />
        {/* mouth gaping */}
        <ellipse cx="40" cy="30" rx="6" ry="3" fill="#1a0808" />
        <path d="M36 28 L37 32 M40 28 L40 32 M44 28 L43 32" stroke="#e8d8d0" strokeWidth="0.8" />
        {/* blood drip */}
        <path d="M40 32 Q39 36 41 38" stroke="#8a1010" strokeWidth="1.2" fill="none" />
        {/* tears in shirt */}
        <path d="M28 70 L34 80 L30 82 Z" fill="#1a1a1a" />
      </svg>
    </div>
  );
}

function BossSprite() {
  return (
    <div className="zombie-walk" style={{ transform: "scale(1.5)" }}>
      <svg width="110" height="180" viewBox="0 0 110 180" style={{ filter: "drop-shadow(0 10px 14px rgba(120,20,20,0.7))" }}>
        <ellipse cx="55" cy="178" rx="32" ry="4" fill="rgba(0,0,0,0.6)" />
        {/* legs in suit pants */}
        <rect x="38" y="120" width="14" height="54" fill="#0a0a14" />
        <rect x="58" y="120" width="14" height="54" fill="#0a0a14" />
        {/* shoes */}
        <ellipse cx="45" cy="174" rx="11" ry="4" fill="#1a1a1a" />
        <ellipse cx="65" cy="174" rx="11" ry="4" fill="#1a1a1a" />
        {/* suit jacket */}
        <path d="M22 56 L88 56 L92 120 L18 120 Z" fill="#161624" />
        <path d="M22 56 L40 56 L38 110 L18 120 Z" fill="#0e0e1a" />
        <path d="M88 56 L70 56 L72 110 L92 120 Z" fill="#0e0e1a" />
        {/* shirt */}
        <path d="M40 56 L70 56 L68 100 L42 100 Z" fill="#e0d8c8" />
        {/* tie blood-stained */}
        <path d="M50 56 L60 56 L58 96 L55 102 L52 96 Z" fill="#6a0a0a" />
        <path d="M52 78 Q55 82 58 78" stroke="#3a0404" strokeWidth="1.5" fill="none" />
        {/* arms */}
        <rect x="6" y="60" width="18" height="60" rx="6" fill="#161624" />
        <rect x="86" y="60" width="18" height="60" rx="6" fill="#161624" />
        {/* hands */}
        <circle cx="15" cy="124" r="9" fill="#7a8a6a" />
        <circle cx="95" cy="124" r="9" fill="#7a8a6a" />
        {/* head */}
        <ellipse cx="55" cy="30" rx="20" ry="22" fill="#7a8a6a" />
        {/* bald top */}
        <path d="M40 20 Q55 8 70 20 L70 28 Q55 26 40 28 Z" fill="#6a7a5a" />
        {/* glowing eyes */}
        <circle cx="47" cy="30" r="4" fill="#ff1010" />
        <circle cx="63" cy="30" r="4" fill="#ff1010" />
        <circle cx="47" cy="30" r="2" fill="#ffffff" />
        <circle cx="63" cy="30" r="2" fill="#ffffff" />
        {/* glasses */}
        <circle cx="47" cy="30" r="6" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <circle cx="63" cy="30" r="6" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="53" y1="30" x2="57" y2="30" stroke="#1a1a1a" strokeWidth="1.5" />
        {/* mouth */}
        <ellipse cx="55" cy="44" rx="9" ry="4" fill="#1a0808" />
        <path d="M48 42 L49 47 M52 42 L52 47 M55 42 L55 47 M58 42 L58 47 M62 42 L61 47" stroke="#e8d8d0" strokeWidth="0.8" />
        {/* blood drip */}
        <path d="M55 48 Q53 54 56 58 Q58 62 55 64" stroke="#8a1010" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

// Door SVG inset into the wall
function ClassroomDoor({ name, inRange, opened }: { name: string; inRange: boolean; opened: boolean }) {
  return (
    <div className="relative flex flex-col items-center" style={{ width: 90 }}>
      <div
        className={`relative transition-all ${inRange ? "glow-toxic" : ""}`}
        style={{
          width: 80,
          height: 150,
          background: opened
            ? "linear-gradient(180deg, #0a0a0a 0%, #1a0808 100%)"
            : "linear-gradient(180deg, #5a3a20 0%, #3a2410 100%)",
          border: "3px solid #1a0a04",
          borderRadius: "6px 6px 0 0",
          boxShadow: inRange ? undefined : "inset 0 0 20px rgba(0,0,0,0.6)",
        }}
      >
        {/* Door panels */}
        {!opened && (
          <>
            <div style={{ position: "absolute", top: 12, left: 8, right: 8, height: 50, background: "rgba(0,0,0,0.3)", border: "1px solid #2a1408", borderRadius: 4 }} />
            <div style={{ position: "absolute", top: 70, left: 8, right: 8, height: 50, background: "rgba(0,0,0,0.3)", border: "1px solid #2a1408", borderRadius: 4 }} />
            <div style={{ position: "absolute", right: 8, top: 90, width: 6, height: 6, background: "#ffd040", borderRadius: "50%" }} />
          </>
        )}
        {opened && (
          <div style={{ position: "absolute", inset: 4, background: "radial-gradient(ellipse at center bottom, rgba(168,255,112,0.15), transparent)" }} />
        )}
      </div>
      {/* name plate */}
      <div className="absolute -top-7 bg-black/80 border border-[var(--toxic)]/40 px-2 py-0.5 text-[10px] text-[var(--toxic)] whitespace-nowrap rounded">
        {name}
      </div>
      {inRange && !opened && (
        <div className="absolute -bottom-10 bg-[var(--toxic)] text-black px-3 py-1 text-xs font-bold rounded whitespace-nowrap animate-pulse">
          [E] Войти
        </div>
      )}
    </div>
  );
}

// ---------- MAIN COMPONENT ----------

export default function EscapeGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [levelIdx, setLevelIdx] = useState(0);
  const [lanaX, setLanaX] = useState(120);
  const [facingLeft, setFacingLeft] = useState(false);
  const [walking, setWalking] = useState(false);
  const [hurt, setHurt] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [strength, setStrength] = useState(1);
  const [score, setScore] = useState(0);
  const [supplies, setSupplies] = useState<string[]>([]);
  const [zombiesDefeated, setZombiesDefeated] = useState(0);
  const [classroomsChecked, setClassroomsChecked] = useState(0);
  const [doors, setDoors] = useState<Door[]>([]);
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [floaters, setFloaters] = useState<{ id: number; text: string; color: string; x: number }[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const keys = useRef<Record<string, boolean>>({});
  const triggeredZombies = useRef<Set<number>>(new Set());
  const floaterId = useRef(0);

  const lv = levels[levelIdx];

  // Build level
  const buildLevel = useCallback((idx: number) => {
    const lvl = levels[idx];
    const isBoss = lvl.id === "gym";
    const newDoors: Door[] = [];
    const newZombies: Zombie[] = [];

    if (!isBoss) {
      // spread doors across world
      const usableStart = 250;
      const usableEnd = WORLD_WIDTH - 250;
      const span = usableEnd - usableStart;
      const total = lvl.classroomsToCheck;
      for (let i = 0; i < total; i++) {
        const x = usableStart + (span / (total + 1)) * (i + 1);
        newDoors.push({
          id: i,
          x,
          name: classroomNames[(idx * 3 + i) % classroomNames.length],
          opened: false,
        });
      }
      // zombies between/after doors
      for (let i = 0; i < lvl.zombiesToDefeat; i++) {
        const x = usableStart + (span / (lvl.zombiesToDefeat + 1)) * (i + 1) + 80;
        newZombies.push({ id: i, x, defeated: false });
      }
    } else {
      // boss only — single zombie at end
      newZombies.push({ id: 0, x: WORLD_WIDTH - 350, defeated: false });
    }

    setDoors(newDoors);
    setZombies(newZombies);
    setClassroomsChecked(0);
    setZombiesDefeated(0);
    setLanaX(120);
    setFacingLeft(false);
    triggeredZombies.current.clear();
  }, []);

  const startGame = () => {
    setHp(100);
    setMaxHp(100);
    setStrength(1);
    setScore(0);
    setSupplies([]);
    setLevelIdx(0);
    buildLevel(0);
    setScreen("play");
  };

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (["arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (modal.kind !== "none") return;
      if (k === "e" || k === "enter") {
        // door interact
        const near = doors.find((d) => !d.opened && Math.abs(d.x - lanaX) < INTERACT_RANGE);
        if (near) {
          const supply = supplyPool[Math.floor(Math.random() * supplyPool.length)];
          setModal({ kind: "search", doorId: near.id, supply });
          return;
        }
        // exit interact
        if (canReachExit() && lanaX > WORLD_WIDTH - 200) {
          setShowHint(false);
          setModal({ kind: "exit", bossStep: lv.id === "gym" ? 0 : undefined });
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doors, lanaX, modal, lv]);

  function canReachExit() {
    if (lv.id === "gym") return zombies.every((z) => z.defeated);
    return zombiesDefeated >= lv.zombiesToDefeat && classroomsChecked >= lv.classroomsToCheck;
  }

  // Game loop
  useEffect(() => {
    if (screen !== "play") return;
    let raf = 0;
    const step = () => {
      if (modal.kind === "none") {
        let dx = 0;
        if (keys.current["a"] || keys.current["arrowleft"]) dx -= LANA_SPEED;
        if (keys.current["d"] || keys.current["arrowright"]) dx += LANA_SPEED;
        if (dx !== 0) {
          setWalking(true);
          if (dx < 0) setFacingLeft(true);
          if (dx > 0) setFacingLeft(false);
          setLanaX((x) => {
            const nx = Math.max(60, Math.min(WORLD_WIDTH - 60, x + dx));
            // check zombie collision
            zombies.forEach((z) => {
              if (!z.defeated && !triggeredZombies.current.has(z.id) && Math.abs(z.x - nx) < 90) {
                triggeredZombies.current.add(z.id);
                const puzzle = combatPuzzles[Math.floor(Math.random() * combatPuzzles.length)];
                setModal({ kind: "combat", zombieId: z.id, puzzle });
              }
            });
            return nx;
          });
        } else {
          setWalking(false);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, modal, zombies]);

  // Floaters cleanup
  function addFloater(text: string, color: string) {
    const id = ++floaterId.current;
    setFloaters((f) => [...f, { id, text, color, x: 0 }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1200);
  }

  function takeDamage(amount: number) {
    setHp((h) => {
      const nh = Math.max(0, h - amount);
      if (nh <= 0) {
        setScreen("dead");
      }
      return nh;
    });
    setHurt(true);
    setTimeout(() => setHurt(false), 500);
    addFloater(`−${amount} HP`, "#ff4060");
  }

  function applySupply(s: Supply) {
    if (s.hpGain) {
      setHp((h) => Math.min(maxHp + (s.maxHpGain || 0), h + (s.hpGain || 0)));
    }
    if (s.maxHpGain) setMaxHp((m) => m + (s.maxHpGain || 0));
    if (s.strengthGain) setStrength((st) => st + (s.strengthGain || 0));
    if (s.scoreGain) setScore((sc) => sc + (s.scoreGain || 0));
    setSupplies((arr) => [...arr, s.emoji]);
    if (s.hpGain) addFloater(`+${s.hpGain} HP`, "#80ff80");
    if (s.strengthGain) addFloater(`+СИЛА`, "#ffd040");
  }

  // ---------- MODAL HANDLERS ----------

  function handleSearchClose() {
    if (modal.kind !== "search") return;
    applySupply(modal.supply);
    setDoors((ds) => ds.map((d) => (d.id === modal.doorId ? { ...d, opened: true } : d)));
    setClassroomsChecked((c) => c + 1);
    setModal({ kind: "none" });
  }

  function handleCombatAnswer(correct: boolean) {
    if (modal.kind !== "combat") return;
    if (correct) {
      setZombies((zs) => zs.map((z) => (z.id === modal.zombieId ? { ...z, defeated: true } : z)));
      setZombiesDefeated((n) => n + 1);
      setScore((s) => s + 25 * strength);
      addFloater(`+${25 * strength} ОЧКОВ`, "#80ff80");
      setModal({ kind: "none" });
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 500);
      const dmg = Math.max(5, 20 - strength * 2);
      takeDamage(dmg);
      triggeredZombies.current.delete(modal.zombieId);
      setModal({ kind: "none" });
    }
  }

  function handleExitAnswer(correct: boolean) {
    if (modal.kind !== "exit") return;
    const isBoss = lv.id === "gym";
    const step = modal.bossStep || 0;
    if (correct) {
      if (isBoss) {
        if (step < bossExtraPuzzles.length) {
          setScore((s) => s + 200);
          setModal({ kind: "exit", bossStep: step + 1 });
          setShowHint(false);
        } else {
          setScore((s) => s + 500);
          setModal({ kind: "none" });
          setScreen("win");
        }
      } else {
        setScore((s) => s + 150);
        const next = levelIdx + 1;
        if (next >= levels.length) {
          setScreen("win");
        } else {
          setLevelIdx(next);
          buildLevel(next);
        }
        setModal({ kind: "none" });
      }
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 500);
      takeDamage(20);
    }
  }

  // ---------- RENDER ----------

  if (screen === "intro") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at center, #1a2a22 0%, #0a0e0c 80%)" }}>
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--toxic)] flicker">
            <Skull className="w-4 h-4" /> День X · 14:30
          </div>
          <h1 className="font-display text-6xl md:text-8xl text-[var(--toxic)] leading-none" style={{ textShadow: "4px 4px 0 var(--blood), 0 0 40px rgba(168,255,112,0.4)" }}>
            СБЕГИ ИЗ ШКОЛЫ
          </h1>
          <p className="text-lg text-foreground/90 leading-relaxed">
            Меня зовут <span className="text-[var(--toxic)] font-bold">Лана</span>. Школу захватили зомби.
            Учителя. Друзья. Директор. Чтобы выжить — нужно искать припасы по классам,
            а чтобы пройти мимо зомби — <span className="text-[var(--toxic)]">отвечать на вопросы быстрее, чем они укусят</span>.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Info icon="🚪" label="Обыскивай классы" />
            <Info icon="🥪" label="Собирай припасы" />
            <Info icon="🧟" label="Побеждай логикой" />
            <Info icon="👑" label="Одолей директора" />
          </div>
          <div className="bg-card/80 border border-border rounded-xl p-4 text-xs text-muted-foreground inline-block">
            <span className="text-[var(--toxic)]">A / D</span> или <span className="text-[var(--toxic)]">← →</span> — движение &nbsp;·&nbsp; <span className="text-[var(--toxic)]">E</span> — взаимодействие
          </div>
          <div>
            <Button size="lg" onClick={startGame} className="bg-[var(--blood)] hover:bg-[var(--blood)]/80 text-white text-lg px-10 py-7 rounded-xl shadow-[0_0_30px_rgba(168,255,112,0.3)]">
              Начать побег
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "win") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at center, #1f3a22 0%, #0a0e0c 80%)" }}>
        <div className="max-w-md text-center space-y-5">
          <Trophy className="w-20 h-20 mx-auto text-[var(--toxic)]" />
          <h1 className="font-display text-5xl text-[var(--toxic)]">ЛАНА ВЫЖИЛА!</h1>
          <p className="text-foreground/90">Главные двери школы открыты. Свежий воздух. Свобода.</p>
          <div className="bg-card border border-border rounded-xl p-4 text-sm space-y-2 text-left">
            <Row label="Очки" value={score.toString()} />
            <Row label="Уровней пройдено" value="5 / 5" />
            <Row label="Припасов собрано" value={supplies.length.toString()} />
            <Row label="Сила в финале" value={"★".repeat(Math.min(10, strength))} />
          </div>
          <Button onClick={startGame} className="bg-[var(--toxic)] text-black hover:bg-[var(--toxic)]/80">Сыграть снова</Button>
        </div>
      </main>
    );
  }

  if (screen === "dead") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at center, #3a1818 0%, #0a0e0c 80%)" }}>
        <div className="max-w-md text-center space-y-5">
          <Skull className="w-20 h-20 mx-auto text-[var(--blood)] flicker" />
          <h1 className="font-display text-5xl text-[var(--blood)]">ЛАНУ СЪЕЛИ</h1>
          <p className="text-muted-foreground">Школа победила. Звонок прозвенел последний раз.</p>
          <div className="bg-card border border-border rounded-xl p-4 text-sm space-y-2 text-left">
            <Row label="Очки" value={score.toString()} />
            <Row label="Уровень" value={`${levelIdx + 1} / ${levels.length}`} />
            <Row label="Припасов" value={supplies.length.toString()} />
          </div>
          <Button onClick={startGame} variant="destructive">Попробовать снова</Button>
        </div>
      </main>
    );
  }

  // PLAY
  const exitReady = canReachExit();
  const cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEWPORT_WIDTH, lanaX - VIEWPORT_WIDTH / 2));

  return (
    <main className="h-screen flex flex-col bg-background pixel-scene">
      {/* HUD */}
      <header className="bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-4 z-20">
        <div className="flex items-center gap-2 min-w-[200px]">
          <Heart className="w-5 h-5 text-[var(--blood)]" />
          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden border border-border">
            <div className="h-full bg-gradient-to-r from-[var(--blood)] to-red-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums">{hp}/{maxHp}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Zap className="w-4 h-4 text-[var(--toxic)]" />
          <span className="font-bold">{strength}</span>
          <span className="text-[var(--toxic)] tracking-wide">{"★".repeat(Math.min(5, strength))}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Backpack className="w-4 h-4 text-muted-foreground" />
          <span className="font-bold">{supplies.length}</span>
          <span className="text-xs text-muted-foreground hidden md:inline">{supplies.slice(-5).join(" ")}</span>
        </div>
        <div className="flex-1 text-center text-xs text-muted-foreground hidden md:block">
          <div className="text-[var(--toxic)] font-bold uppercase tracking-widest text-[11px]">{lv.location}</div>
          <div>
            Классы: {classroomsChecked}/{lv.classroomsToCheck} · Зомби: {zombiesDefeated}/{lv.zombiesToDefeat || "BOSS"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase">Очки</div>
          <div className="text-sm font-bold text-[var(--toxic)] tabular-nums">{score.toString().padStart(5, "0")}</div>
        </div>
      </header>

      {/* SCENE */}
      <div className={`relative flex-1 overflow-hidden scanlines crt-vignette ${wrongFlash ? "danger-pulse" : ""}`} style={{ background: lv.bgGradient, imageRendering: "pixelated" }}>
        {/* Ambient blood vignette when low HP */}
        {hp < maxHp * 0.3 && (
          <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: "inset 0 0 200px 40px rgba(180,20,20,0.4)", animation: "danger-vignette 1.5s infinite" }} />
        )}

        {/* Ceiling lights */}
        <div className="absolute top-0 left-0 right-0 h-12 z-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={i % 3 === 0 ? "flicker" : ""} style={{ position: "absolute", left: `${(i + 1) * 12}%`, top: 4, width: 80, height: 8, background: "linear-gradient(180deg, #c0ffa0, transparent)", borderRadius: 4, boxShadow: "0 0 30px 4px rgba(168,255,112,0.3)" }} />
          ))}
        </div>

        {/* World container */}
        <div
          className="absolute bottom-0 left-0 will-change-transform scroll-smooth-x"
          style={{
            width: WORLD_WIDTH,
            height: "100%",
            transform: `translateX(${-cameraX}px)`,
          }}
        >
          {/* Back wall */}
          <div className="absolute left-0 right-0 bottom-[90px] top-12" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7))" }}>
            {/* Wall tiles / wainscoting */}
            <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)", borderTop: "2px solid #3a3a3a" }} />
          </div>

          {/* Lockers / decorations between doors */}
          {lv.id !== "gym" && Array.from({ length: 20 }).map((_, i) => {
            const x = i * 120 + 40;
            const hasDoor = doors.some((d) => Math.abs(d.x - x) < 80);
            if (hasDoor) return null;
            return (
              <div key={i} className="absolute bottom-[110px]" style={{ left: x, width: 70, height: 180, background: "linear-gradient(180deg, #2a3a3a, #1a2a2a)", border: "2px solid #0a1414", borderRadius: 4, boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)" }}>
                <div style={{ position: "absolute", inset: 6, background: "rgba(0,0,0,0.3)", borderRadius: 2 }} />
                <div style={{ position: "absolute", top: 18, left: 14, right: 14, height: 12, background: "rgba(0,0,0,0.6)", borderRadius: 2 }}>
                  {[0, 1, 2].map((v) => (
                    <div key={v} style={{ position: "absolute", left: 0, right: 0, top: v * 4, height: 1, background: "#0a0a0a" }} />
                  ))}
                </div>
                <div style={{ position: "absolute", bottom: 50, right: 6, width: 5, height: 8, background: "#8a8a8a" }} />
                {i % 4 === 0 && (
                  <div style={{ position: "absolute", bottom: -10, left: 10, width: 30, height: 50, background: "radial-gradient(ellipse, rgba(120,20,20,0.6), transparent 70%)" }} />
                )}
              </div>
            );
          })}

          {/* Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-[90px]" style={{ background: "linear-gradient(180deg, #1a1410 0%, #0a0806 100%)" }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0" style={{ left: i * 80, width: 1, background: "rgba(0,0,0,0.5)" }} />
            ))}
            {/* litter */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="absolute" style={{ left: i * 200 + 60, bottom: 10 + (i % 3) * 8, width: 12, height: 9, background: "#d8d4c4", transform: `rotate(${i * 17}deg)`, boxShadow: "1px 1px 0 rgba(0,0,0,0.4)" }} />
            ))}
          </div>

          {/* Classroom doors */}
          {doors.map((d) => (
            <div key={d.id} className="absolute bottom-[90px]" style={{ left: d.x - 40 }}>
              <ClassroomDoor name={d.name} inRange={!d.opened && Math.abs(d.x - lanaX) < INTERACT_RANGE} opened={d.opened} />
            </div>
          ))}

          {/* Zombies */}
          {zombies.map((z) => (
            <div key={z.id} className="absolute bottom-[80px]" style={{ left: z.x - 40 }}>
              <ZombieSprite defeated={z.defeated} />
              {!z.defeated && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--blood)] text-white text-[10px] px-2 py-0.5 rounded animate-pulse whitespace-nowrap">
                  Зомби!
                </div>
              )}
            </div>
          ))}

          {/* Boss */}
          {lv.id === "gym" && zombies[0] && !zombies[0].defeated && (
            <div className="absolute bottom-[80px]" style={{ left: zombies[0].x - 60 }}>
              <BossSprite />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--blood)] text-white text-xs px-3 py-1 rounded font-bold whitespace-nowrap">
                Директор-зомби
              </div>
            </div>
          )}

          {/* Exit door */}
          <div className="absolute bottom-[90px]" style={{ left: WORLD_WIDTH - 160 }}>
            <div className="relative flex flex-col items-center">
              <div className={`relative transition-all ${exitReady ? "glow-toxic" : ""}`} style={{
                width: 100, height: 200,
                background: exitReady ? "linear-gradient(180deg, #4a2a14 0%, #2a1408 100%)" : "linear-gradient(180deg, #2a1a14 0%, #1a0a08 100%)",
                border: "4px solid #0a0404", borderRadius: "8px 8px 0 0",
              }}>
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[var(--toxic)]/20 border border-[var(--toxic)] px-2 py-0.5 text-[10px] text-[var(--toxic)] font-bold rounded">
                  EXIT
                </div>
                {/* lock or open */}
                <div className="absolute top-1/2 right-3 -translate-y-1/2 text-2xl">
                  {exitReady ? "🟢" : "🔒"}
                </div>
              </div>
              {exitReady && lanaX > WORLD_WIDTH - 200 && (
                <div className="absolute -bottom-10 bg-[var(--toxic)] text-black px-3 py-1 text-xs font-bold rounded animate-pulse whitespace-nowrap">
                  [E] Выйти
                </div>
              )}
            </div>
          </div>

          {/* Lana */}
          <div className="absolute bottom-[80px]" style={{ left: lanaX - 40 }}>
            <LanaSprite walking={walking} facingLeft={facingLeft} hurt={hurt} />
            {/* floaters */}
            {floaters.map((f) => (
              <div key={f.id} className="absolute -top-10 left-1/2 -translate-x-1/2 font-bold text-sm float-up pointer-events-none whitespace-nowrap" style={{ color: f.color, textShadow: "1px 1px 2px black" }}>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots in upper right */}
        <div className="absolute top-16 right-4 z-10 bg-black/60 backdrop-blur rounded-lg p-2 flex gap-1.5">
          {levels.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < levelIdx ? "bg-[var(--toxic)]" : i === levelIdx ? "bg-[var(--toxic)] animate-pulse" : "bg-muted"}`} />
          ))}
        </div>

        {/* Level intro banner */}
        <LevelBanner key={levelIdx} location={lv.location} intro={lv.intro} />

        {/* MODAL */}
        {modal.kind === "search" && (
          <Modal title="Обыск кабинета" icon={<Search className="w-5 h-5" />}>
            <div className="text-center space-y-4">
              <div className="text-7xl">{modal.supply.emoji}</div>
              <div className="text-lg font-bold">{modal.supply.name}</div>
              <p className="text-sm text-muted-foreground">{modal.supply.description}</p>
              <div className="flex justify-center gap-3 text-xs">
                {modal.supply.hpGain ? <span className="bg-[var(--blood)]/20 text-[var(--blood)] px-2 py-1 rounded">+{modal.supply.hpGain} HP</span> : null}
                {modal.supply.maxHpGain ? <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">+{modal.supply.maxHpGain} макс HP</span> : null}
                {modal.supply.strengthGain ? <span className="bg-[var(--toxic)]/20 text-[var(--toxic)] px-2 py-1 rounded">+{modal.supply.strengthGain} сила</span> : null}
                {modal.supply.scoreGain ? <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">+{modal.supply.scoreGain} очк.</span> : null}
              </div>
              <Button onClick={handleSearchClose} className="w-full bg-[var(--toxic)] text-black hover:bg-[var(--toxic)]/80">Забрать</Button>
            </div>
          </Modal>
        )}

        {modal.kind === "combat" && (
          <Modal
            title="Зомби атакует!"
            icon={<Skull className="w-5 h-5 text-[var(--blood)]" />}
            danger
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div style={{ transform: "scale(0.7)" }}>
                  <ZombieSprite defeated={false} />
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground italic">
                Ответь правильно — и Лана вырубит его. Ошибёшься — укусит.
              </p>
              <div className="bg-background/60 border border-[var(--blood)]/40 rounded-lg p-4 flex items-start gap-3">
                <Brain className="w-5 h-5 text-[var(--toxic)] mt-0.5 shrink-0" />
                <p className="font-medium">{modal.puzzle.question}</p>
              </div>
              <PuzzleAnswer puzzle={modal.puzzle} onSubmit={handleCombatAnswer} />
              {modal.puzzle.input && (
                <div className="text-xs text-center text-muted-foreground italic">
                  {modal.puzzle.input === "code" ? "Введи код полностью" : "Введи ответ и нажми Enter"}
                </div>
              )}
              {modal.puzzle.hint && (
                showHint ? (
                  <div className="text-xs text-[var(--toxic)] bg-[var(--toxic)]/10 border border-[var(--toxic)]/30 rounded p-2">💡 {modal.puzzle.hint}</div>
                ) : (
                  <button onClick={() => setShowHint(true)} className="text-xs text-muted-foreground underline">подсказка</button>
                )
              )}
              <div className="text-xs text-[var(--blood)] text-center">Ошибка стоит до 20 HP</div>
            </div>
          </Modal>
        )}

        {modal.kind === "exit" && (() => {
          const isBoss = lv.id === "gym";
          const step = modal.bossStep || 0;
          const puzzle = isBoss && step > 0 ? bossExtraPuzzles[step - 1] : lv.exitPuzzle;
          return (
            <Modal
              title={isBoss ? `Король-Директор · Раунд ${step + 1}/3` : lv.exitTitle}
              icon={isBoss ? <Skull className="w-5 h-5 text-[var(--blood)]" /> : <DoorClosed className="w-5 h-5" />}
              danger={isBoss}
            >
              <div className="space-y-4">
                {isBoss && step === 0 && (
                  <div className="flex justify-center"><BossSprite /></div>
                )}
                <p className="text-sm text-muted-foreground italic">{lv.exitStory}</p>
                <div className="bg-background/60 border border-[var(--toxic)]/40 rounded-lg p-4 flex items-start gap-3">
                  <Brain className="w-5 h-5 text-[var(--toxic)] mt-0.5 shrink-0" />
                  <p className="font-medium">{puzzle.question}</p>
                </div>
                <PuzzleAnswer key={`${isBoss}-${step}`} puzzle={puzzle} onSubmit={handleExitAnswer} />
                {puzzle.hint && (
                  showHint ? (
                    <div className="text-xs text-[var(--toxic)] bg-[var(--toxic)]/10 border border-[var(--toxic)]/30 rounded p-2">💡 {puzzle.hint}</div>
                  ) : (
                    <button onClick={() => setShowHint(true)} className="text-xs text-muted-foreground underline">подсказка</button>
                  )
                )}
              </div>
            </Modal>
          );
        })()}
      </div>
    </main>
  );
}

function Info({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="bg-card/60 border border-border rounded-lg p-3 flex flex-col items-center gap-1">
      <div className="text-2xl">{icon}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

// Универсальный компонент ответа: варианты, число или код
function PuzzleAnswer({ puzzle, onSubmit }: { puzzle: Puzzle; onSubmit: (correct: boolean) => void }) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(false);

  if (puzzle.options && puzzle.options.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {puzzle.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSubmit(i === puzzle.answer)}
            className="text-left text-sm bg-background/60 hover:bg-[var(--toxic)] hover:text-black border border-border hover:border-[var(--toxic)] px-3 py-3 transition-colors"
          >
            <span className="text-[var(--toxic)] font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        ))}
      </div>
    );
  }

  const isCode = puzzle.input === "code";
  const len = puzzle.codeLength || 4;

  const submit = () => {
    const v = val.trim();
    const correct = v === String(puzzle.answer);
    if (!correct) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    onSubmit(correct);
    if (!correct) setVal("");
  };

  if (isCode) {
    return (
      <div className={`flex flex-col items-center gap-3 ${shake ? "shake" : ""}`}>
        <div className="flex items-center gap-2 text-[var(--toxic)]">
          <KeyRound className="w-5 h-5" />
          <span className="text-xs uppercase tracking-widest">Кодовый замок · {len} цифр</span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: len }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-14 border-2 border-[var(--toxic)]/60 bg-black/60 flex items-center justify-center text-2xl font-display text-[var(--toxic)]"
              style={{ boxShadow: "inset 0 0 10px rgba(168,255,112,0.2)" }}
            >
              {val[i] || ""}
            </div>
          ))}
        </div>
        <Input
          autoFocus
          inputMode="numeric"
          maxLength={len}
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, len))}
          onKeyDown={(e) => { if (e.key === "Enter" && val.length === len) submit(); }}
          className="w-48 text-center text-lg font-display tracking-[0.5em] bg-background border-2 border-border focus:border-[var(--toxic)]"
          placeholder={"·".repeat(len)}
        />
        <Button
          onClick={submit}
          disabled={val.length !== len}
          className="bg-[var(--toxic)] text-black hover:bg-[var(--toxic)]/80 font-display text-xs px-6"
        >
          Открыть замок
        </Button>
      </div>
    );
  }

  // number / text input
  return (
    <div className={`flex flex-col items-center gap-3 ${shake ? "shake" : ""}`}>
      <Input
        autoFocus
        inputMode={puzzle.input === "number" ? "numeric" : "text"}
        value={val}
        onChange={(e) => setVal(puzzle.input === "number" ? e.target.value.replace(/[^\d.-]/g, "") : e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && val.length > 0) submit(); }}
        className="w-56 text-center text-xl font-display bg-background border-2 border-border focus:border-[var(--toxic)]"
        placeholder="ответ"
      />
      <Button
        onClick={submit}
        disabled={val.length === 0}
        className="bg-[var(--toxic)] text-black hover:bg-[var(--toxic)]/80 font-display text-xs px-6"
      >
        Ответить
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-[var(--toxic)] font-bold">{value}</span>
    </div>
  );
}

function Modal({ title, icon, danger, children }: { title: string; icon?: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md bg-card border-2 ${danger ? "border-[var(--blood)]" : "border-[var(--toxic)]/50"} rounded-2xl shadow-2xl overflow-hidden`}>
        <div className={`px-5 py-3 flex items-center gap-2 ${danger ? "bg-[var(--blood)]/20" : "bg-[var(--toxic)]/10"} border-b border-border`}>
          {icon}
          <h3 className="font-bold uppercase tracking-wider text-sm">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function LevelBanner({ location, intro }: { location: string; intro: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-black/80 backdrop-blur border border-[var(--toxic)]/50 px-6 py-4 rounded-xl">
        <div className="text-[var(--toxic)] font-display text-2xl tracking-wider">{location}</div>
        <div className="text-sm text-muted-foreground italic mt-1 max-w-md">{intro}</div>
      </div>
    </div>
  );
}
