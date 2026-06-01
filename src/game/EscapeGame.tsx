import { useEffect, useRef, useState } from "react";
import { levels, bossExtraPuzzles, type Puzzle, type Level } from "./data";
import { Button } from "@/components/ui/button";
import {
  drawLana,
  drawZombie,
  drawBoss,
  drawClassmate,
  drawOrb,
  drawCorridor,
  drawDoor,
} from "./sprites";

type Screen = "intro" | "play" | "puzzle" | "win" | "dead";
type Zombie = { x: number; y: number; hp: number; vx: number; hitFlash: number };
type Orb = { x: number; y: number; type: "heal" | "power"; vy: number; t: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Floater = { x: number; y: number; text: string; life: number; color: string };

const W = 800;
const H = 450;
const FLOOR_Y = H - 80;
const LANA_W = 36;
const LANA_H = 48;
const SPEED = 2.5;
const CORRIDOR_LEN = 2400;

export default function EscapeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<Screen>("intro");
  const [levelIdx, setLevelIdx] = useState(0);
  const [bossStep, setBossStep] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // HUD reactive copies
  const [hudHp, setHudHp] = useState(100);
  const [hudMaxHp, setHudMaxHp] = useState(100);
  const [hudStr, setHudStr] = useState(1);
  const [hudScore, setHudScore] = useState(0);
  const [hudRescued, setHudRescued] = useState(0);
  const [hudKills, setHudKills] = useState(0);
  const [hudBossHp, setHudBossHp] = useState(0);

  // Mutable game state
  const state = useRef({
    lanaX: 100,
    lanaY: FLOOR_Y - LANA_H,
    facingLeft: false,
    state: "idle" as "idle" | "walk" | "attack",
    attackTimer: 0,
    invuln: 0,
    hp: 100,
    maxHp: 100,
    strength: 1,
    score: 0,
    rescued: 0,
    kills: 0,
    killsNeeded: 0,
    levelIdx: 0,
    scroll: 0,
    zombies: [] as Zombie[],
    orbs: [] as Orb[],
    particles: [] as Particle[],
    floaters: [] as Floater[],
    classmate: null as { x: number; y: number; rescued: boolean; line: string; name: string } | null,
    doorX: CORRIDOR_LEN - 100,
    doorActive: false,
    keys: {} as Record<string, boolean>,
    boss: null as { x: number; y: number; hp: number; maxHp: number; hitFlash: number; phase: number } | null,
    spawnTimer: 0,
    nextSpawnAt: 0,
    levelTime: 0,
    introBanner: 120,
  });

  function startLevel(idx: number) {
    const lv = levels[idx];
    const s = state.current;
    s.levelIdx = idx;
    s.lanaX = 100;
    s.scroll = 0;
    s.zombies = [];
    s.orbs = [];
    s.particles = [];
    s.floaters = [];
    s.kills = 0;
    s.killsNeeded = lv.zombiesToKill;
    s.doorActive = lv.zombiesToKill === 0;
    s.spawnTimer = 0;
    s.nextSpawnAt = 60;
    s.levelTime = 0;
    s.introBanner = 150;
    s.state = "idle";
    s.attackTimer = 0;
    if (lv.id === "gym") {
      s.boss = { x: CORRIDOR_LEN - 250, y: FLOOR_Y - 96, hp: 100, maxHp: 100, hitFlash: 0, phase: 0 };
      s.doorActive = false;
    } else {
      s.boss = null;
    }
    if (lv.hasClassmate && lv.classmateName) {
      s.classmate = {
        x: 600 + Math.random() * 800,
        y: FLOOR_Y - LANA_H,
        rescued: false,
        line: lv.classmateLine || "",
        name: lv.classmateName,
      };
    } else {
      s.classmate = null;
    }
    setHudHp(s.hp);
    setHudMaxHp(s.maxHp);
    setHudStr(s.strength);
    setHudKills(0);
    setHudBossHp(s.boss?.hp ?? 0);
  }

  function reset() {
    const s = state.current;
    s.hp = 100;
    s.maxHp = 100;
    s.strength = 1;
    s.score = 0;
    s.rescued = 0;
    setHudHp(100);
    setHudMaxHp(100);
    setHudStr(1);
    setHudScore(0);
    setHudRescued(0);
    setLevelIdx(0);
    setBossStep(0);
    startLevel(0);
    setScreen("play");
  }

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      state.current.keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.key === "ArrowUp") e.preventDefault();
      // Attack
      if ((e.key === " " || e.key.toLowerCase() === "j") && state.current.attackTimer <= 0) {
        state.current.state = "attack";
        state.current.attackTimer = 18;
        const s = state.current;
        // Hitbox
        const reach = 50;
        const hx = s.facingLeft ? s.lanaX - reach : s.lanaX + LANA_W;
        // hit zombies
        s.zombies.forEach((z) => {
          const zScreen = z.x - s.scroll;
          if (zScreen + 30 > hx && zScreen < hx + reach + 20 && Math.abs(z.y - s.lanaY) < 40) {
            z.hp -= s.strength;
            z.hitFlash = 8;
            // knockback
            z.vx += s.facingLeft ? -1 : 1;
            for (let i = 0; i < 5; i++) {
              s.particles.push({
                x: zScreen + 15,
                y: z.y + 20,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3,
                life: 30,
                color: "#c83030",
              });
            }
            if (z.hp <= 0) {
              s.kills++;
              s.score += 10;
              setHudKills(s.kills);
              setHudScore(s.score);
              // drop orb
              if (Math.random() < 0.7) {
                const type: "heal" | "power" = Math.random() < 0.5 ? "heal" : "power";
                s.orbs.push({ x: z.x + 15, y: z.y + 20, type, vy: -3, t: 0 });
              }
            }
          }
        });
        s.zombies = s.zombies.filter((z) => z.hp > 0);
        // hit boss
        if (s.boss) {
          const bScreen = s.boss.x - s.scroll;
          if (bScreen + 60 > hx && bScreen < hx + reach + 40) {
            s.boss.hp -= s.strength;
            s.boss.hitFlash = 8;
            setHudBossHp(s.boss.hp);
            for (let i = 0; i < 8; i++) {
              s.particles.push({
                x: bScreen + 40,
                y: s.boss.y + 40,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 4,
                life: 35,
                color: "#80ff60",
              });
            }
            // boss phases trigger puzzles
            const threshold = s.boss.maxHp - (s.boss.phase + 1) * 33;
            if (s.boss.hp <= threshold && s.boss.phase < 3) {
              s.boss.phase++;
              setBossStep(s.boss.phase - 1);
              setShowHint(false);
              setScreen("puzzle");
            }
          }
        }
      }
      // Interact with door
      if (e.key.toLowerCase() === "e" || e.key === "Enter") {
        const s = state.current;
        if (s.doorActive) {
          const dx = s.doorX - s.scroll;
          if (Math.abs(s.lanaX - dx) < 80) {
            setShowHint(false);
            setScreen("puzzle");
          }
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      state.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      update(dt);
      render(ctx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, levelIdx]);

  function update(_dt: number) {
    const s = state.current;
    const lv = levels[s.levelIdx];
    s.levelTime++;
    if (s.introBanner > 0) s.introBanner--;

    // Move
    let moving = false;
    if (s.keys["a"] || s.keys["arrowleft"]) {
      // scroll left or move
      if (s.scroll > 0) s.scroll -= SPEED;
      else if (s.lanaX > 20) s.lanaX -= SPEED;
      s.facingLeft = true;
      moving = true;
    }
    if (s.keys["d"] || s.keys["arrowright"]) {
      // if lana past mid, scroll instead
      if (s.lanaX < W / 2 - 40 && s.scroll < CORRIDOR_LEN - W) {
        s.lanaX += SPEED;
      } else if (s.scroll < CORRIDOR_LEN - W) {
        s.scroll += SPEED;
      } else if (s.lanaX < W - LANA_W - 20) {
        s.lanaX += SPEED;
      }
      s.facingLeft = false;
      moving = true;
    }

    if (s.attackTimer > 0) {
      s.attackTimer--;
      s.state = "attack";
    } else {
      s.state = moving ? "walk" : "idle";
    }
    if (s.invuln > 0) s.invuln--;

    // Spawn zombies
    if (!s.boss && s.kills < s.killsNeeded) {
      s.spawnTimer++;
      if (s.spawnTimer > s.nextSpawnAt && s.zombies.length < 4) {
        s.spawnTimer = 0;
        s.nextSpawnAt = 90 + Math.random() * 90;
        const fromRight = Math.random() < 0.7;
        const wx = fromRight ? s.scroll + W + 30 : s.scroll - 30;
        s.zombies.push({
          x: wx,
          y: FLOOR_Y - LANA_H,
          hp: 2 + Math.floor(s.levelIdx / 2),
          vx: 0,
          hitFlash: 0,
        });
      }
    }

    // Door active check
    if (!s.boss && s.kills >= s.killsNeeded) s.doorActive = true;

    // Update zombies
    const lanaWorldX = s.lanaX + s.scroll;
    s.zombies.forEach((z) => {
      const dir = z.x < lanaWorldX ? 1 : -1;
      z.x += dir * 0.9 + z.vx;
      z.vx *= 0.85;
      if (z.hitFlash > 0) z.hitFlash--;
      // damage lana
      const zScreen = z.x - s.scroll;
      if (
        Math.abs(zScreen - s.lanaX) < 25 &&
        Math.abs(z.y - s.lanaY) < 30 &&
        s.invuln <= 0
      ) {
        s.hp -= 8;
        s.invuln = 40;
        setHudHp(Math.max(0, s.hp));
        s.floaters.push({ x: s.lanaX + 10, y: s.lanaY, text: "-8", life: 40, color: "#ff4060" });
        if (s.hp <= 0) {
          setScreen("dead");
        }
      }
    });

    // Update boss
    if (s.boss) {
      if (s.boss.hitFlash > 0) s.boss.hitFlash--;
      const dir = s.boss.x < lanaWorldX ? 1 : -1;
      s.boss.x += dir * 0.5;
      const bScreen = s.boss.x - s.scroll;
      if (Math.abs(bScreen - s.lanaX) < 60 && s.invuln <= 0) {
        s.hp -= 14;
        s.invuln = 50;
        setHudHp(Math.max(0, s.hp));
        s.floaters.push({ x: s.lanaX + 10, y: s.lanaY, text: "-14", life: 40, color: "#ff4060" });
        if (s.hp <= 0) setScreen("dead");
      }
    }

    // Update orbs
    s.orbs.forEach((o) => {
      o.t++;
      o.y += o.vy;
      o.vy += 0.15;
      if (o.y > FLOOR_Y - 10) {
        o.y = FLOOR_Y - 10;
        o.vy = 0;
      }
      const oScreen = o.x - s.scroll;
      if (Math.abs(oScreen - (s.lanaX + 15)) < 25 && Math.abs(o.y - s.lanaY - 24) < 30) {
        if (o.type === "heal") {
          s.hp = Math.min(s.maxHp, s.hp + 20);
          setHudHp(s.hp);
          s.floaters.push({ x: s.lanaX + 10, y: s.lanaY, text: "+20 HP", life: 50, color: "#ff80a0" });
        } else {
          s.strength += 1;
          s.maxHp += 10;
          s.hp = Math.min(s.maxHp, s.hp + 5);
          setHudStr(s.strength);
          setHudMaxHp(s.maxHp);
          setHudHp(s.hp);
          s.floaters.push({ x: s.lanaX + 10, y: s.lanaY, text: "+СИЛА", life: 50, color: "#80ff60" });
        }
        o.t = -999; // mark for removal
      }
    });
    s.orbs = s.orbs.filter((o) => o.t > -100);

    // Classmate
    if (s.classmate && !s.classmate.rescued) {
      const cScreen = s.classmate.x - s.scroll;
      if (Math.abs(cScreen - s.lanaX) < 30) {
        s.classmate.rescued = true;
        s.rescued++;
        s.score += 50;
        s.maxHp += 20;
        s.hp = Math.min(s.maxHp, s.hp + 30);
        s.strength += 1;
        setHudRescued(s.rescued);
        setHudScore(s.score);
        setHudMaxHp(s.maxHp);
        setHudHp(s.hp);
        setHudStr(s.strength);
        s.floaters.push({
          x: s.lanaX,
          y: s.lanaY - 10,
          text: lv.classmateName + ": +БОНУС!",
          life: 90,
          color: "#ffd040",
        });
      }
    }

    // Particles
    s.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life--;
    });
    s.particles = s.particles.filter((p) => p.life > 0);

    s.floaters.forEach((f) => {
      f.y -= 0.7;
      f.life--;
    });
    s.floaters = s.floaters.filter((f) => f.life > 0);
  }

  function render(ctx: CanvasRenderingContext2D) {
    const s = state.current;
    const lv = levels[s.levelIdx];
    const variant =
      lv.id === "library"
        ? "library"
        : lv.id === "cafeteria"
          ? "cafeteria"
          : lv.id === "gym"
            ? "gym"
            : "school";

    ctx.imageSmoothingEnabled = false;
    drawCorridor(ctx, W, H, s.scroll, variant);

    // Door
    const doorScreen = s.doorX - s.scroll;
    if (doorScreen > -80 && doorScreen < W + 80 && !s.boss) {
      drawDoor(ctx, doorScreen, FLOOR_Y - 120, s.doorActive);
      if (s.doorActive && Math.abs(s.lanaX - doorScreen) < 80) {
        ctx.fillStyle = "#ffd040";
        ctx.font = "bold 10px 'Press Start 2P', monospace";
        ctx.fillText("[E] ОТКРЫТЬ", doorScreen - 20, FLOOR_Y - 130);
      }
    }

    // Classmate
    if (s.classmate && !s.classmate.rescued) {
      const cScreen = s.classmate.x - s.scroll;
      if (cScreen > -50 && cScreen < W + 50) {
        drawClassmate(ctx, cScreen, s.classmate.y, 3);
        // bubble
        ctx.fillStyle = "#ffd040";
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText("ПОМОГИ!", cScreen - 10, s.classmate.y - 8);
        // exclamation
        if (Math.floor(s.levelTime / 30) % 2 === 0) {
          ctx.fillStyle = "#ff4040";
          ctx.fillRect(cScreen + 14, s.classmate.y - 24, 4, 10);
          ctx.fillRect(cScreen + 14, s.classmate.y - 12, 4, 3);
        }
      }
    }

    // Zombies
    s.zombies.forEach((z) => {
      const zx = z.x - s.scroll;
      if (zx < -40 || zx > W + 40) return;
      const flip = z.x > s.lanaX + s.scroll;
      if (z.hitFlash > 0) {
        ctx.globalAlpha = 0.5;
      }
      drawZombie(ctx, zx, z.y, flip, 3);
      ctx.globalAlpha = 1;
      // hp pip
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(zx + 6, z.y - 6, 24, 3);
      ctx.fillStyle = "#c83030";
      ctx.fillRect(zx + 6, z.y - 6, Math.max(0, (z.hp / (2 + Math.floor(s.levelIdx / 2))) * 24), 3);
    });

    // Boss
    if (s.boss) {
      const bx = s.boss.x - s.scroll;
      if (s.boss.hitFlash > 0) ctx.globalAlpha = 0.5;
      drawBoss(ctx, bx, s.boss.y - 50, 4);
      ctx.globalAlpha = 1;
    }

    // Orbs
    s.orbs.forEach((o) => {
      const ox = o.x - s.scroll;
      if (ox < -10 || ox > W + 10) return;
      drawOrb(ctx, ox, o.y, o.type, o.t * 10);
    });

    // Lana
    if (s.invuln > 0 && Math.floor(s.invuln / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    drawLana(ctx, s.lanaX, s.lanaY, s.state, s.facingLeft, 3);
    ctx.globalAlpha = 1;

    // Particles
    s.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Floaters
    s.floaters.forEach((f) => {
      ctx.fillStyle = f.color;
      ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.globalAlpha = Math.min(1, f.life / 30);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });

    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 500);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Intro banner
    if (s.introBanner > 0) {
      const a = s.introBanner > 30 ? 1 : s.introBanner / 30;
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, H / 2 - 50, W, 100);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#a8ff70";
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`УРОВЕНЬ ${s.levelIdx + 1}`, W / 2, H / 2 - 15);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillText(lv.location, W / 2, H / 2 + 8);
      ctx.fillStyle = "#a0a0a0";
      ctx.font = "8px monospace";
      ctx.fillText(lv.intro, W / 2, H / 2 + 28);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    // Red flash on damage
    if (s.invuln > 30) {
      ctx.fillStyle = `rgba(255,40,40,${(s.invuln - 30) / 40})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------- SCREENS ----------------

  if (screen === "intro") {
    return (
      <Shell>
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="text-[var(--toxic)] text-xs flicker">▌ INSERT COIN ▐</div>
          <h1 className="pixel-text text-3xl md:text-5xl text-[var(--toxic)]" style={{ textShadow: "4px 4px 0 var(--blood)" }}>
            СБЕГИ ИЗ<br />ШКОЛЫ
          </h1>
          <div className="text-[var(--toxic)] text-xs">★ ZOMBIE ARCADE EDITION ★</div>
          <div className="bg-card/80 border-2 border-[var(--toxic)]/40 p-5 text-left text-[10px] md:text-xs leading-relaxed space-y-2">
            <p>МЕНЯ ЗОВУТ <span className="text-[var(--toxic)]">ЛАНА</span>.</p>
            <p>ШКОЛУ ЗАХВАТИЛИ ЗОМБИ. УЧИТЕЛЯ. ДРУЗЬЯ. ДИРЕКТОР.</p>
            <p>МНЕ НУЖНО ПРОЙТИ 5 КОРИДОРОВ И СБЕЖАТЬ.</p>
            <p className="text-[var(--toxic)]">— БЕЙ ЗОМБИ И СОБИРАЙ ОЧКИ СИЛЫ</p>
            <p className="text-[var(--toxic)]">— СПАСАЙ ОДНОКЛАССНИКОВ — ОНИ ДАЮТ БОНУСЫ</p>
            <p className="text-[var(--toxic)]">— ОТКРЫВАЙ ДВЕРИ, РЕШАЯ ЛОГИКУ</p>
            <p className="text-[var(--blood)]">— ПОБЕДИ ДИРЕКТОРА В ФИНАЛЕ</p>
          </div>
          <div className="bg-background/80 border border-border p-3 text-[10px] grid grid-cols-2 gap-y-1 max-w-md mx-auto">
            <span className="text-[var(--toxic)]">A / D / ← →</span><span>идти</span>
            <span className="text-[var(--toxic)]">ПРОБЕЛ / J</span><span>удар</span>
            <span className="text-[var(--toxic)]">E / ENTER</span><span>дверь</span>
          </div>
          <Button
            onClick={reset}
            className="pixel-text text-sm bg-[var(--blood)] hover:bg-[var(--blood)]/80 text-white border-2 border-[var(--toxic)] px-8 py-6 rounded-none"
          >
            ▶ НАЧАТЬ
          </Button>
        </div>
      </Shell>
    );
  }

  if (screen === "win") {
    return (
      <Shell>
        <div className="text-center space-y-5 max-w-xl mx-auto">
          <div className="pixel-text text-2xl md:text-4xl text-[var(--toxic)] flicker">★ ПОБЕДА ★</div>
          <h1 className="pixel-text text-xl md:text-3xl">ЛАНА ВЫЖИЛА</h1>
          <div className="bg-card border-2 border-[var(--toxic)]/40 p-5 text-left text-[11px] space-y-2">
            <Row label="ОЧКИ" value={hudScore.toString().padStart(6, "0")} />
            <Row label="УБИТО ЗОМБИ" value={hudKills.toString()} />
            <Row label="СПАСЕНО ДРУЗЕЙ" value={hudRescued.toString()} />
            <Row label="СИЛА" value={"★".repeat(Math.min(10, hudStr))} />
            <Row label="ДИРЕКТОР" value="ПОВЕРЖЕН" />
          </div>
          <p className="text-xs text-muted-foreground">Двери школы распахнулись. Свежий воздух. Финал.</p>
          <Button onClick={reset} className="pixel-text text-xs bg-[var(--toxic)] text-black rounded-none px-6 py-5">
            ▶ ИГРАТЬ СНОВА
          </Button>
        </div>
      </Shell>
    );
  }

  if (screen === "dead") {
    return (
      <Shell>
        <div className="text-center space-y-5 max-w-md mx-auto">
          <div className="pixel-text text-3xl md:text-5xl text-[var(--blood)] flicker">GAME OVER</div>
          <p className="text-xs text-muted-foreground">Зомби пируют. Школа победила.</p>
          <div className="bg-card border-2 border-[var(--blood)]/40 p-4 text-left text-[11px] space-y-2">
            <Row label="ОЧКИ" value={hudScore.toString().padStart(6, "0")} />
            <Row label="УБИТО" value={hudKills.toString()} />
            <Row label="СПАСЕНО" value={hudRescued.toString()} />
          </div>
          <Button onClick={reset} className="pixel-text text-xs bg-[var(--blood)] text-white rounded-none px-6 py-5">
            ▶ ПРОДОЛЖИТЬ?
          </Button>
        </div>
      </Shell>
    );
  }

  // PUZZLE OVERLAY
  if (screen === "puzzle") {
    const lv = levels[levelIdx];
    const isBoss = lv.id === "gym";
    const puzzle: Puzzle = isBoss && bossStep > 0 ? bossExtraPuzzles[bossStep - 1] : lv.puzzle;
    const answer = (i: number) => {
      const s = state.current;
      if (i === puzzle.answer) {
        if (isBoss) {
          if (bossStep < bossExtraPuzzles.length) {
            // continue boss fight
            s.score += 100;
            setHudScore(s.score);
            setScreen("play");
          } else {
            // boss defeated entirely
            setScreen("win");
          }
        } else {
          // advance level
          s.score += 100;
          setHudScore(s.score);
          if (levelIdx < levels.length - 1) {
            const next = levelIdx + 1;
            setLevelIdx(next);
            startLevel(next);
            setScreen("play");
          } else {
            setScreen("win");
          }
        }
      } else {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 400);
        s.hp -= 15;
        setHudHp(Math.max(0, s.hp));
        if (s.hp <= 0) setScreen("dead");
      }
    };
    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          <div className={`bg-card border-2 ${wrongFlash ? "border-[var(--blood)]" : "border-[var(--toxic)]/50"} p-5 md:p-7 space-y-5`}>
            <div className="text-[10px] text-[var(--toxic)]">
              {isBoss ? `БОСС · РАУНД ${bossStep + 1}/3` : `${lv.location}`}
            </div>
            <h2 className="pixel-text text-base md:text-xl text-[var(--toxic)]">{lv.doorTitle}</h2>
            <p className="text-[11px] text-muted-foreground italic">{lv.doorStory}</p>
            <div className="bg-background/60 border border-border p-4 text-xs md:text-sm">
              {puzzle.question}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {puzzle.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  className="text-left text-[11px] bg-background/60 hover:bg-[var(--toxic)] hover:text-black border border-border px-3 py-3 transition-colors"
                >
                  <span className="text-[var(--toxic)] mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>
            {puzzle.hint && (
              <div>
                {showHint ? (
                  <div className="text-[10px] text-[var(--toxic)] border border-[var(--toxic)]/30 p-2">
                    ★ {puzzle.hint}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-[10px] text-muted-foreground underline"
                  >
                    [подсказка]
                  </button>
                )}
              </div>
            )}
            <div className="text-[9px] text-[var(--blood)]">ОШИБКА: −15 HP</div>
          </div>
        </div>
      </Shell>
    );
  }

  // PLAY SCREEN — render canvas + HUD
  const lv = levels[levelIdx];
  return (
    <Shell>
      <div className="max-w-[820px] mx-auto">
        {/* HUD */}
        <div className="bg-black border-2 border-[var(--toxic)]/40 border-b-0 p-2 flex items-center justify-between gap-3 text-[9px]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--toxic)]">ЛАНА</span>
            <div className="w-24 h-3 bg-[var(--blood)]/30 border border-[var(--blood)]">
              <div
                className="h-full bg-[var(--blood)]"
                style={{ width: `${(hudHp / hudMaxHp) * 100}%` }}
              />
            </div>
            <span>{hudHp}/{hudMaxHp}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[var(--toxic)]">СИЛА {"★".repeat(Math.min(5, hudStr))}</span>
            <span>УБ:{hudKills}/{lv.zombiesToKill || "BOSS"}</span>
            <span>SCR:{hudScore.toString().padStart(5, "0")}</span>
          </div>
        </div>
        {state.current.boss && (
          <div className="bg-black border-x-2 border-[var(--toxic)]/40 px-2 py-1 flex items-center gap-2 text-[9px]">
            <span className="text-[var(--blood)] flicker">★ ДИРЕКТОР-ЗОМБИ</span>
            <div className="flex-1 h-2 bg-[var(--blood)]/20 border border-[var(--blood)]">
              <div
                className="h-full bg-[var(--blood)]"
                style={{ width: `${Math.max(0, hudBossHp)}%` }}
              />
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="pixel-canvas w-full block border-2 border-[var(--toxic)]/40 bg-black"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
        <div className="bg-black border-2 border-t-0 border-[var(--toxic)]/40 p-2 text-[9px] flex justify-between text-muted-foreground">
          <span>A/D — ИДТИ · ПРОБЕЛ — УДАР · E — ДВЕРЬ</span>
          <span className="text-[var(--toxic)]">{lv.location}</span>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-[var(--toxic)]">{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-3 md:p-6">
      <div className="w-full">{children}</div>
    </main>
  );
}
