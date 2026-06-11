import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  levels, bossRiddles,
  FLOOR_Y, CEIL_Y,
  type Classroom, type Doll, type TaskKind, type LootItem, type SearchSpot,
} from "./data";
import { sfxGunshot, sfxBat, sfxKill, sfxBite, sfxDeath, sfxGrowl, sfxBoom, sfxSwing, sfxPickup, playMusic, stopMusic, setMusicMuted } from "./sounds";
import {
  Zap, Download, Flame, Trash2, ToggleRight,
  HelpCircle, Target,
  X, Skull, Heart, DoorClosed, ArrowUp,
  Lightbulb, Coins, Shirt, ShoppingBag, Crosshair, Swords, Flashlight, Volume2, VolumeX,
  Backpack, Utensils, ArrowDown, BatteryFull, BatteryLow, Trophy, LogIn, LogOut,
} from "lucide-react";
import { Leaderboard, submitScore } from "./Leaderboard";
import { supabase } from "@/integrations/supabase/client";
import { generateAiQuestion, type AiQuestion } from "@/lib/api/ai-questions.functions";
import menuLanaCutout from "../assets/ref-lana.png";
import menuBearCutout from "../assets/ref-bear.png";
import menuBallerinaCutout from "../assets/ref-doll.png";
import menuMonkeyCutout from "../assets/ref-monkey.png";
import menuClownCutout from "../assets/ref-clown.png";
import menuFriendGirlCutout from "../assets/ref-dina.png";
import menuFriendBoyCutout from "../assets/ref-karl.png";



type Vec = { x: number; y: number };

type Modal =
  | { kind: "none" }
  | { kind: "task"; doll: Doll }
  | { kind: "search"; classroom: Classroom }
  | { kind: "exit" }
  | { kind: "doorTask" }
  | { kind: "nextLevel" }
  | { kind: "win" }
  | { kind: "lose" }
  | { kind: "backpack" }
  | { kind: "boss" }
  | { kind: "story"; title: string; body: string };

type InvItem = { id: string; name: string; emoji: string; hp: number; food: number; strength: number; battery?: number; givesFlashlight?: boolean; noise?: number };

type StoryNote = {
  id: string;
  title: string;
  body: string;
};

type IntroStory = {
  title: string;
  paragraphs: string[];
  goals: string[];
};

type IntroFrame = {
  scene: "black" | "school" | "classroom" | "lana" | "flicker" | "empty" | "monsters";
  line: string;
};

type ToyMonsterKind = "bear" | "porcelain" | "monkey" | "clown" | "puppet";

type RescueEvent = {
  id: "karl" | "dina" | "children";
  name: string;
  roomId: string;
  message: string;
};

type Checkpoint = {
  level: number;
  x: number;
  label: string;
  killed: Set<string>;
  searched: Set<string>;
  storyNotes: Set<string>;
  rescued: Set<string>;
};


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
  /** Renders tactical vest with straps and pouches over the torso */
  armored?: boolean;
  /** Optional Mario-style cap color (defaults to hair) */
  cap?: string;
  /** Optional accent streak color in hair (e.g. purple strand) */
  streak?: string;
  /** Optional accent color for clothing trim */
  accent?: string;
  /** Optional ponytail color (defaults to hair) */
  ponytail?: string;
};

/**
 * FRONT-FACING chunky pixel sprite (16x22 grid) with HEAD TURNED to the side.
 * Body stands frontal вЂ” both shoulders, both legs visible. Head + eyes look
 * toward `facing` (1 = looks right, -1 = looks left).
 */
function PixelHuman({ palette, facing = 1, size = 72, variant = "student", dead = false }:
  { palette: PixelPalette; facing?: 1 | -1; size?: number; variant?: "student" | "girl" | "boss"; dead?: boolean }) {
  const isGirl = variant === "girl";
  const isBoss = variant === "boss";

  const K = "#0a0a0a";
  const W = "#ffffff";
  const S = palette.skin;
  const Sh = palette.skinShade;
  const H = palette.hair;
  const Hh = palette.hairShade;
  const T = palette.shirt;
  const Tt = palette.shirtShade;
  const N = palette.pants;
  const Nn = palette.pantsShade;
  const B = palette.shoes;
  const EYE = isBoss ? "#ff2a2a" : isGirl ? "#7a5ad6" : "#1a2a4a";
  const MOUTH = isBoss ? "#5a1010" : isGirl ? "#c84060" : "#7a3a2a";
  const STREAK = palette.streak ?? null;
  const PT = palette.ponytail ?? H;
  const ACC = palette.accent ?? "#c84060";

  const Wd = 16;
  const Ht = 22;
  const g: (string | null)[][] = Array.from({ length: Ht }, () => Array(Wd).fill(null));
  const px = (x: number, y: number, c: string | null) => {
    if (x >= 0 && x < Wd && y >= 0 && y < Ht) g[y][x] = c;
  };
  const row = (y: number, x0: number, x1: number, c: string) => {
    for (let x = x0; x <= x1; x++) px(x, y, c);
  };
  const box = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c);
  };

  // ============ HEAD (front-facing oval, slightly turned) ============
  row(0, 6, 9, K);
  px(5, 1, K); px(10, 1, K);
  px(4, 2, K); px(11, 2, K);
  px(4, 3, K); px(11, 3, K);
  px(4, 4, K); px(11, 4, K);
  px(4, 5, K); px(11, 5, K);
  px(5, 6, K); px(10, 6, K);
  px(6, 7, K); px(9, 7, K);
  // skin fill
  box(5, 1, 10, 6, S);
  // shading on the cheek opposite the turn (head looks right в†’ shade left cheek)
  px(5, 5, Sh); px(5, 6, Sh); px(6, 6, Sh);

  // ============ HAIR (top crown only вЂ” does NOT cover eyes) ============
  if (isBoss) {
    // bald with thin grey rim
    px(5, 1, Hh); px(10, 1, Hh);
    px(6, 1, Hh); px(9, 1, Hh);
    // scar on forehead
    px(8, 2, "#7a1a1a");
  } else {
    // crown across top (row 1 only)
    row(1, 6, 9, H);
    px(5, 2, H); px(10, 2, H);
    // small bangs ABOVE the eyes (row 2 only, not row 3)
    px(6, 2, H); px(9, 2, H);
    // highlight on crown
    px(7, 1, Hh); px(8, 1, Hh);
  }

  // ============ PONYTAIL (girl) вЂ” behind head on the LEFT ============
  if (isGirl) {
    px(3, 3, PT); px(3, 4, PT);
    px(2, 4, PT); px(2, 5, PT);
    px(1, 5, PT); px(1, 6, PT); px(1, 7, PT);
    px(2, 7, PT);
    // ribbon highlight
    px(2, 5, ACC);
    // outline
    px(0, 5, K); px(0, 6, K); px(0, 7, K); px(0, 8, K);
    px(1, 8, K); px(2, 8, K); px(3, 5, K);
  }

  // ============ RED BOW on top of head (girl, Ruby-style) ============
  if (isGirl) {
    // bow loops
    px(6, 0, ACC); px(9, 0, ACC);
    px(5, 0, K); px(10, 0, K);
    // bow knot
    px(7, 0, ACC); px(8, 0, ACC);
    px(7, 1, ACC); px(8, 1, ACC);
  }

  // ============ PURPLE STREAK ============
  if (STREAK) {
    px(6, 2, STREAK);
    if (isGirl) px(1, 6, STREAK);
  }

  // ============ EYES (symmetric, large, clearly visible) ============
  // Eye whites вЂ” two pixels each
  px(6, 3, W); px(7, 3, W);
  px(9, 3, W); px(10, 3, W);
  // Pupils shifted toward facing side (right by default) so it looks like glancing sideways
  // facing=1 в†’ pupils on the right pixel of each eye (cols 7 & 10)
  px(7, 3, EYE);
  px(10, 3, EYE);
  // Brows above each eye
  if (!isBoss) {
    px(6, 2, Hh); px(7, 2, Hh);
    px(9, 2, Hh); px(10, 2, Hh);
  } else {
    // angry brows
    px(6, 2, K); px(7, 2, K);
    px(9, 2, K); px(10, 2, K);
    // red glow
    px(6, 3, "#ffb0b0"); px(9, 3, "#ffb0b0");
    px(7, 3, "#ff2a2a"); px(10, 3, "#ff2a2a");
  }
  // Girl lashes
  if (isGirl) {
    px(6, 2, K); px(10, 2, K);
  }

  // ============ NOSE & MOUTH (centered) ============
  // small nose between eyes
  px(8, 4, Sh);
  // mouth вЂ” small smile centered
  px(7, 5, MOUTH); px(8, 5, MOUTH);
  if (isGirl) {
    // smaller heart-shaped lips
    px(7, 5, ACC); px(8, 5, ACC);
  }
  if (isBoss) {
    // grim mouth
    row(5, 7, 9, K);
  }


  // ============ NECK ============
  box(7, 7, 8, 8, S);
  px(8, 8, Sh);
  px(6, 8, K); px(9, 8, K);

  // ============ TORSO (front-facing) ============
  row(9, 4, 11, T);
  box(4, 10, 11, 13, T);
  for (let y = 10; y <= 13; y++) px(4, y, Tt);
  for (let y = 9; y <= 13; y++) { px(3, y, K); px(12, y, K); }
  row(14, 4, 11, K);

  if (palette.armored) {
    box(6, 10, 9, 13, Tt);
    px(6, 10, "#3a2a18"); px(9, 10, "#3a2a18");
    px(6, 12, "#c8a838"); px(9, 12, "#c8a838");
    px(7, 13, "#3a2a18"); px(8, 13, "#3a2a18");
  } else if (isBoss) {
    px(6, 10, Tt); px(9, 10, Tt);
    px(7, 11, "#a01818"); px(8, 11, "#a01818");
    px(7, 12, "#a01818"); px(8, 12, "#a01818");
    px(7, 13, "#7a0a0a"); px(8, 13, "#7a0a0a");
  } else if (isGirl) {
    px(7, 10, ACC); px(8, 10, ACC);
    row(13, 5, 10, Tt);
  }

  // ============ ARMS (both sides) ============
  px(3, 10, T); px(3, 11, T); px(3, 12, Tt); px(3, 13, S);
  px(2, 10, K); px(2, 11, K); px(2, 12, K); px(2, 13, K); px(3, 14, K);
  px(12, 10, T); px(12, 11, T); px(12, 12, Tt); px(12, 13, S);
  px(13, 10, K); px(13, 11, K); px(13, 12, K); px(13, 13, K); px(12, 14, K);

  // ============ HIPS / BELT ============
  row(14, 4, 11, "#2a1a0a");
  px(7, 14, "#c8a838"); px(8, 14, "#c8a838");

  // ============ LEGS (side-by-side front view) ============
  box(5, 15, 7, 19, N);
  box(8, 15, 10, 19, N);
  for (let y = 15; y <= 19; y++) { px(7, y, Nn); px(8, y, Nn); }
  for (let y = 15; y <= 19; y++) { px(4, y, K); px(11, y, K); }
  row(20, 5, 10, K);

  // ============ SHOES ============
  box(4, 20, 7, 21, B);
  box(8, 20, 11, 21, B);
  px(5, 21, "#3a3a3a"); px(9, 21, "#3a3a3a");
  px(3, 20, K); px(3, 21, K);
  px(12, 20, K); px(12, 21, K);
  row(21, 4, 11, K);

  // ============ DEAD overlay ============
  if (dead) {
    px(8, 3, "#ff2222"); px(10, 3, "#ff2222");
    px(8, 4, "#ff2222"); px(10, 4, "#ff2222");
  }

  // ============ Build horizontal-run rects ============
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < Ht; y++) {
    let x = 0;
    while (x < Wd) {
      const c = g[y][x];
      if (c === null) { x++; continue; }
      let x2 = x;
      while (x2 + 1 < Wd && g[y][x2 + 1] === c) x2++;
      rects.push(
        <rect key={`${y}-${x}`} x={x} y={y} width={x2 - x + 1} height={1} fill={c} shapeRendering="crispEdges" />
      );
      x = x2 + 1;
    }
  }

  const vbW = Wd;
  const vbH = Ht;
  const renderH = size;
  const renderW = Math.round((size * vbW) / vbH);

  return (
    <svg width={renderW} height={renderH} viewBox={`0 0 ${vbW} ${vbH}`}
      style={{
        transform: `scaleX(${facing})`,
        imageRendering: "pixelated",
        shapeRendering: "crispEdges",
      }}
    >
      <ellipse cx={Wd / 2} cy={vbH - 0.2} rx={Wd / 2.4} ry={0.5} fill="#000" opacity="0.45" />
      {rects}
    </svg>
  );
}

type TeenKind = "lana" | "karl" | "dina";
type TeenMotion = "idle" | "walk" | "run" | "scared";
type MonsterMotion = "idle" | "walk" | "run";

function PixelTeen({
  kind = "lana",
  facing = 1,
  size = 92,
  scared = false,
  motion = scared ? "scared" : "idle",
  palette,
}: {
  kind?: TeenKind;
  facing?: 1 | -1;
  size?: number;
  scared?: boolean;
  motion?: TeenMotion;
  palette?: PixelPalette;
}) {
  const isLana = kind === "lana";
  const isKarl = kind === "karl";
  const isDina = kind === "dina";
  const skin = palette?.skin ?? (isKarl ? "#e3b48c" : isDina ? "#d8a378" : "#efc09a");
  const skinShade = palette?.skinShade ?? (isKarl ? "#b77a56" : isDina ? "#9a6548" : "#bf8260");
  const hair = palette?.hair ?? (isKarl ? "#6b3a22" : isDina ? "#5a3320" : "#231512");
  const hairHi = palette?.hairShade ?? (isKarl ? "#9a5a30" : isDina ? "#86553a" : "#3a201a");
  const blazer = palette?.shirt ?? (isDina ? "#202b3a" : "#2a2634");
  const blazerDark = palette?.shirtShade ?? "#11101a";
  const shirt = kind === "lana" ? "#d9d5c8" : palette?.accent ?? "#d9d5c8";
  const tie = palette?.accent ?? (isKarl ? "#8b1d2c" : isDina ? "#233f6b" : "#5b2030");
  const skirt = palette?.pants ?? (isDina || kind === "lana" ? "#242338" : "#2b2d36");
  const skirtShade = palette?.pantsShade ?? "#151420";
  const shoes = palette?.shoes ?? "#0c0b10";
  const glasses = isDina ? "#d8e8ff" : "transparent";
  const outline = "#09080c";
  const eye = scared ? "#f5efe6" : "#141018";
  const mouth = scared ? "#4b0a12" : "#6d2b2b";
  const vbW = 64;
  const vbH = 96;
  const renderW = Math.round((size * vbW) / vbH);
  const frames = Array.from({ length: 10 }, (_, i) => i);
  const isAnimated = motion !== "idle";

  const frameClass = motion === "run" ? "teen-run-frame" : motion === "scared" ? "teen-scared-frame" : "teen-walk-frame";
  const cycleMs = motion === "run" ? 540 : motion === "scared" ? 620 : 820;

  const poseFor = (frame: number) => {
    if (motion === "idle") return { bob: 0, lean: -1, hip: 0, hair: 0, coat: 0, leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0 };
    if (motion === "scared") {
      const jitter = [-1, 0, -2, 1, -1, 1, -2, 0, -1, 1][frame];
      const arm = [0, -1, -2, -1, 0, 1, 0, -1, -2, -1][frame];
      return { bob: frame % 2 ? -1 : 0, lean: -3 + jitter, hip: jitter, hair: 1 - jitter, coat: jitter, leftLeg: -1, rightLeg: 1, leftArm: -5 + arm, rightArm: -4 - arm };
    }
    const walking = motion === "walk";
    const stride = walking ? [-5, -4, -2, 1, 4, 5, 3, 0, -3, -5] : [-8, -6, -3, 2, 7, 8, 4, 0, -5, -8];
    const counter = [-stride[frame], -stride[frame] * 0.7];
    return {
      bob: [0, -1, -2, -1, 0, -1, -2, -1, 0, 0][frame],
      lean: walking ? [-1, -1, 0, 1, 2, 1, 0, -1, -2, -1][frame] : [-3, -2, -1, 1, 3, 2, 0, -2, -3, -3][frame],
      hip: Math.round(stride[frame] * 0.22),
      hair: Math.round(counter[0] * 0.18),
      coat: Math.round(counter[0] * 0.15),
      leftLeg: stride[frame],
      rightLeg: Math.round(counter[0]),
      leftArm: Math.round(counter[0] * 0.75),
      rightArm: Math.round(stride[frame] * 0.75),
    };
  };

  const Rect = ({ x, y, w, h, fill, opacity = 1 }: { x: number; y: number; w: number; h: number; fill: string; opacity?: number }) => (
    <rect x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} shapeRendering="crispEdges" />
  );

  const renderFrame = (frame: number) => {
    const p = poseFor(frame);
    const sx = 4 + p.lean;
    const sy = p.bob;
    const scaredPose = motion === "scared";
    const leftKnee = Math.round(p.leftLeg * 0.45);
    const rightKnee = Math.round(p.rightLeg * 0.45);
    const leftFoot = Math.round(p.leftLeg * 0.7);
    const rightFoot = Math.round(p.rightLeg * 0.7);
    const headX = sx + (scaredPose ? -1 : 0);
    const hairSwing = p.hair;

    return (
      <g key={frame} className={isAnimated ? frameClass : undefined} style={isAnimated ? { animationDelay: `${-(cycleMs / 10) * frame}ms` } : undefined}>
        <ellipse cx="32" cy="93" rx="18" ry="2" fill="#000" opacity="0.42" />

        {/* back hair and loose strands */}
        {(isLana || isDina) && (
          <>
            <Rect x={headX + 15 + hairSwing} y={18 + sy} w={8} h={isLana ? 15 : 24} fill={outline} />
            <Rect x={headX + 41 + hairSwing} y={18 + sy} w={8} h={isLana ? 15 : 24} fill={outline} />
            <Rect x={headX + 16 + hairSwing} y={19 + sy} w={7} h={(isLana ? 18 : 29) + (scaredPose ? 2 : 0)} fill={hair} />
            <Rect x={headX + 41 + hairSwing} y={19 + sy} w={7} h={(isLana ? 18 : 29) + (scaredPose ? 2 : 0)} fill={hair} />
            <Rect x={headX + 18 + hairSwing} y={(isLana ? 31 : 43) + sy} w={4} h={isLana ? 5 : 9} fill={hairHi} opacity={0.86} />
            <Rect x={headX + 42 + hairSwing} y={(isLana ? 31 : 42) + sy} w={4} h={isLana ? 5 : 10} fill={hairHi} opacity={0.72} />
          </>
        )}

        {/* legs: long, separated, with frame-by-frame stride */}
        <Rect x={sx + 20 + p.hip} y={53 + sy} w={9} h={25} fill={outline} />
        <Rect x={sx + 34 + p.hip} y={53 + sy} w={9} h={25} fill={outline} />
        <Rect x={sx + 21 + p.hip + leftKnee} y={54 + sy} w={7} h={28} fill={skirt} />
        <Rect x={sx + 35 + p.hip + rightKnee} y={54 + sy} w={7} h={28} fill={skirt} />
        <Rect x={sx + 22 + p.hip + leftKnee} y={68 + sy} w={5} h={11} fill={skirtShade} opacity={0.58} />
        <Rect x={sx + 36 + p.hip + rightKnee} y={68 + sy} w={5} h={11} fill={skirtShade} opacity={0.58} />
        <Rect x={sx + 17 + p.hip + leftFoot} y={81 + sy} w={13} h={5} fill={outline} />
        <Rect x={sx + 34 + p.hip + rightFoot} y={81 + sy} w={13} h={5} fill={outline} />
        <Rect x={sx + 18 + p.hip + leftFoot} y={81 + sy} w={11} h={4} fill={shoes} />
        <Rect x={sx + 35 + p.hip + rightFoot} y={81 + sy} w={11} h={4} fill={shoes} />

        {/* torso and blazer, narrow realistic teen silhouette */}
        <Rect x={sx + 20} y={31 + sy} w={24} h={27} fill={outline} />
        <Rect x={sx + 21} y={32 + sy} w={22} h={25} fill={blazer} />
        <Rect x={sx + 27} y={32 + sy} w={10} h={23} fill={shirt} />
        <Rect x={sx + 31} y={34 + sy} w={3} h={14} fill={tie} />
        <Rect x={sx + 23 + p.coat} y={43 + sy} w={6} h={14} fill={blazerDark} />
        <Rect x={sx + 36 - p.coat} y={43 + sy} w={6} h={14} fill={blazerDark} />
        <Rect x={sx + 23} y={57 + sy} w={18} h={4} fill={outline} />
        {kind === "lana" && (
          <>
            <Rect x={sx + 15 - p.coat} y={35 + sy} w={5} h={20} fill="#6b3f34" />
            <Rect x={sx + 16 - p.coat} y={37 + sy} w={4} h={18} fill="#8a5746" />
            <Rect x={sx + 22 + p.coat} y={55 + sy} w={7} h={2} fill="#725041" opacity={0.85} />
          </>
        )}
        {kind === "lana" && (
          <>
            <Rect x={sx + 30} y={37 + sy} w={5} h={11} fill="#7d1d2d" />
            <Rect x={sx + 23} y={58 + sy} w={18} h={4} fill="#17131d" />
            <Rect x={sx + 22} y={74 + sy} w={5} h={5} fill="#d8d5c8" opacity={0.95} />
            <Rect x={sx + 36} y={74 + sy} w={5} h={5} fill="#d8d5c8" opacity={0.95} />
          </>
        )}

        {/* arms: natural length to upper thigh, opposite the legs */}
        <Rect x={sx + 14 + p.leftArm} y={33 + sy} w={7} h={24} fill={outline} />
        <Rect x={sx + 43 + p.rightArm} y={33 + sy} w={7} h={24} fill={outline} />
        <Rect x={sx + 15 + p.leftArm} y={34 + sy} w={5} h={20} fill={blazer} />
        <Rect x={sx + 44 + p.rightArm} y={34 + sy} w={5} h={20} fill={blazer} />
        <Rect x={sx + 15 + p.leftArm} y={53 + sy + (scaredPose ? -4 : 0)} w={5} h={7} fill={skin} />
        <Rect x={sx + 44 + p.rightArm} y={53 + sy + (scaredPose ? -5 : 0)} w={5} h={7} fill={skin} />

        {/* neck and head */}
        <Rect x={headX + 29} y={27 + sy} w={7} h={7} fill={outline} />
        <Rect x={headX + 30} y={27 + sy} w={5} h={7} fill={skin} />
        <Rect x={headX + 22} y={8 + sy} w={21} h={21} fill={outline} />
        <Rect x={headX + 23} y={9 + sy} w={19} h={20} fill={skin} />
        <Rect x={headX + 38} y={13 + sy} w={4} h={14} fill={skinShade} opacity={0.88} />

        {/* hair mass, bangs and highlights */}
        <Rect x={headX + 21 + hairSwing} y={5 + sy} w={23} h={9} fill={outline} />
        <Rect x={headX + 22 + hairSwing} y={6 + sy} w={21} h={8} fill={hair} />
        <Rect x={headX + 20 + hairSwing} y={12 + sy} w={8} h={13} fill={hair} />
        <Rect x={headX + 37 + hairSwing} y={12 + sy} w={8} h={13} fill={hair} />
        {isLana && (
          <>
            <Rect x={headX + 25 + hairSwing} y={13 + sy} w={4} h={7} fill={hair} />
            <Rect x={headX + 31 + hairSwing} y={12 + sy} w={4} h={6} fill={hair} />
            <Rect x={headX + 36 + hairSwing} y={13 + sy} w={3} h={7} fill={hair} />
          </>
        )}
        <Rect x={headX + 25 + hairSwing} y={7 + sy} w={12} h={3} fill={hairHi} opacity={0.88} />
        <Rect x={headX + 23 + hairSwing} y={14 + sy} w={5} h={2} fill={hairHi} opacity={0.7} />
        {palette?.cap && (
          <>
            <Rect x={headX + 23 + hairSwing} y={5 + sy} w={19} h={5} fill={palette.cap} />
            <Rect x={headX + 38 + hairSwing} y={9 + sy} w={7} h={3} fill={palette.cap} />
          </>
        )}

        {/* face */}
        <Rect x={headX + 27} y={17 + sy} w={4} h={2} fill={scaredPose ? "#fff7eb" : eye} />
        <Rect x={headX + 36} y={17 + sy} w={4} h={2} fill={scaredPose ? "#fff7eb" : eye} />
        {scaredPose && (
          <>
            <Rect x={headX + 29} y={17 + sy} w={1} h={2} fill={eye} />
            <Rect x={headX + 38} y={17 + sy} w={1} h={2} fill={eye} />
          </>
        )}
        {isDina && (
          <>
            <rect x={headX + 26} y={16 + sy} width="7" height="5" fill="none" stroke={glasses} strokeWidth="1" shapeRendering="crispEdges" />
            <rect x={headX + 35} y={16 + sy} width="7" height="5" fill="none" stroke={glasses} strokeWidth="1" shapeRendering="crispEdges" />
            <Rect x={headX + 33} y={18 + sy} w={2} h={1} fill={glasses} opacity={0.75} />
          </>
        )}
        <Rect x={headX + 33} y={21 + sy} w={2} h={2} fill={skinShade} />
        <Rect x={headX + 31} y={25 + sy} w={scaredPose ? 6 : 4} h={2} fill={mouth} />
        {scaredPose && <Rect x={headX + 33} y={27 + sy} w={2} h={2} fill={mouth} />}

        {/* tiny hand-painted pixel highlights */}
        <Rect x={sx + 22} y={33 + sy} w={3} h={14} fill="#ffffff" opacity={0.08} />
        <Rect x={headX + 27} y={10 + sy} w={4} h={1} fill="#fff8dc" opacity={0.16} />
      </g>
    );
  };

  return (
    <svg
      width={renderW}
      height={size}
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="pixel-teen"
      style={{
        transform: `scaleX(${facing})`,
        imageRendering: "pixelated",
        shapeRendering: "crispEdges",
        ["--teen-cycle" as string]: `${cycleMs}ms`,
      }}
    >
      {motion === "idle" ? renderFrame(0) : frames.map(renderFrame)}
    </svg>
  );
}

function StoryPortrait({ title }: { title: string }) {
  const lower = title.toLowerCase();
  const kind: TeenKind = lower.includes("karl") ? "karl" : lower.includes("dina") ? "dina" : "lana";
  return <MenuArtCharacter kind={kind} size={kind === "lana" ? 150 : 125} scared />;
}

function IntroCinematic({
  frames,
  onStart,
  onClose,
  onShuffle,
}: {
  frames: IntroFrame[];
  onStart: () => void;
  onClose: () => void;
  onShuffle: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const current = frames[frame] ?? frames[0];
  const isLast = frame >= frames.length - 1;

  useEffect(() => {
    setFrame(0);
  }, [frames]);

  useEffect(() => {
    if (isLast) return;
    const id = setTimeout(() => setFrame(f => Math.min(frames.length - 1, f + 1)), current.scene === "black" ? 1800 : 2600);
    return () => clearTimeout(id);
  }, [current.scene, frames.length, isLast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-3">
      <div className="relative h-full max-h-[760px] w-full max-w-5xl overflow-hidden border border-red-950 bg-black shadow-[0_0_60px_rgba(127,29,29,0.45)]">
        <div className={`intro-film-frame intro-scene-${current.scene}`}>
          {current.scene !== "black" && (
            <>
              <div className="intro-film-title">
                <span>DOLLS OF THE SCHOOL</span>
                <small>old school event archive</small>
              </div>
              <div className="intro-film-school">
                <div className="intro-film-moon" />
                <div className="intro-film-building">
                  {Array.from({ length: 18 }, (_, i) => <span key={i} />)}
                </div>
              </div>
              <div className="intro-film-classroom">
                <div className="intro-board">РќР• РћРЎРўРђР’Р›РЇР™РўР• РќРђРЎ РћР”РќРРҐ</div>
                <div className="intro-window" />
                <div className="intro-desks">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="intro-desk">
                      {(current.scene === "classroom" || current.scene === "lana" || current.scene === "flicker") && i !== 2 && (
                        <div className={current.scene === "flicker" ? "intro-friend-distort" : ""}>
                          <MenuArtCharacter kind={i % 2 ? "karl" : "dina"} size={80} facing={i % 2 ? -1 : 1} />
                        </div>
                      )}
                      {i === 2 && <MenuArtCharacter kind="lana" size={98} scared={current.scene === "flicker"} motion={current.scene === "flicker" ? "scared" : "idle"} />}
                    </div>
                  ))}
                </div>
              </div>
              {(current.scene === "flicker" || current.scene === "empty") && <div className="intro-flicker" />}
              {current.scene === "monsters" && (
                <div className="intro-monster-lineup">
                  <MenuArtMonster kind="bear" size={160} />
                  <MenuArtMonster kind="porcelain" size={130} />
                  <MenuArtMonster kind="monkey" size={130} />
                  <MenuArtMonster kind="clown" size={190} />
                  <MenuArtMonster kind="porcelain" size={170} boss />
                </div>
              )}
            </>
          )}
        </div>
        <div className="intro-dialog-panel absolute inset-x-0 bg-gradient-to-t from-black via-black/92 to-transparent px-4 pb-4 pt-20">
          <div className="mx-auto max-w-3xl border border-red-900/70 bg-black/80 p-3 text-center">
            <p className="text-sm leading-relaxed text-zinc-100 md:text-base">{current.line}</p>
            <div className="mt-3 flex items-center justify-center gap-1">
              {frames.map((_, i) => (
                <span key={i} className={`h-1.5 w-6 ${i <= frame ? "bg-red-400" : "bg-zinc-700"}`} />
              ))}
            </div>
          </div>
          <div className="intro-actions mt-3 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setFrame(f => Math.min(frames.length - 1, f + 1))} disabled={isLast}>
              Р”Р°Р»СЊС€Рµ
            </Button>
            <Button variant="secondary" onClick={onShuffle}>Р”СЂСѓРіР°СЏ РІРµСЂСЃРёСЏ</Button>
            <Button onClick={onStart} className="font-display">РќРђР§РђРўР¬ РџРћР‘Р•Р“</Button>
            <button type="button" onClick={onClose} className="rounded border border-zinc-700 bg-black/60 px-3 py-2 text-xs font-pixel text-zinc-300 hover:text-white">
              Р—Р°РєСЂС‹С‚СЊ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Lana speech bubble (rotating phrases) ----
const LANA_LINES = [
  "Where is the key?..",
  "Shhh, don't wake them",
  "Gotta find the exit!",
  "I can do this рџ’њ",
  "Hmm, maybe in the desk?",
  "Hear footsteps?",
  "Hope the battery doesn't die",
  "Almost thereвЂ¦",
  "I think there's something here",
  "Stay calm, Lana",
];

const STORY_NOTES: Record<string, StoryNote> = {
  "l1-7": {
    id: "note-backpack",
    title: "Р СЋРєР·Р°Рє Р›Р°РЅС‹",
    body: "Lana came back after rehearsal for her forgotten backpack. The lights began to blink, the clocks froze, and the school became too quiet.",
  },
  "l1-basement-stairs": {
    id: "note-basement",
    title: "Basement Notice",
    body: "A faded notice says the basement was sealed after an old school celebration. Someone crossed out the word accident.",
  },
  "l2-east-hall": {
    id: "note-dina",
    title: "Dina's Page",
    body: "Dina's neat handwriting: The toys say they are protecting us. I think they are scared of being left alone.",
  },
  "l3a-studio": {
    id: "note-karl",
    title: "Karl's Joke Book",
    body: "Karl wrote a joke, then scratched it out. Under it: If I start smiling too much, Lana, don't trust my voice.",
  },
  "l4-dusty-attic": {
    id: "note-attic",
    title: "Attic Ledger",
    body: "Old school-play props were locked here for years. The plush bear, the porcelain doll, and the clockwork monkey are listed as missing.",
  },
  "l5-roof-passage": {
    id: "note-truth",
    title: "The Hidden Truth",
    body: "The tragedy was hidden to protect the school. The toys absorbed lonely children and decided no child should ever leave them again.",
  },
};

const RESCUE_EVENTS: RescueEvent[] = [
  {
    id: "children",
    name: "Lost Children",
    roomId: "l2-east-hall",
    message: "A group of younger students crawl out from under the desks. Lana points them toward the lit stairwell.",
  },
  {
    id: "karl",
    name: "Karl",
    roomId: "l3a-studio",
    message: "Karl is shaking, but still jokes that the paintings blink first. He joins Lana's escape route.",
  },
  {
    id: "dina",
    name: "Dina",
    roomId: "l5-roof-passage",
    message: "Dina lowers her notebook. She knows enough of the truth to help Lana face the final doll.",
  },
];

const INTRO_STORIES: IntroStory[] = [
  {
    title: "РЎР®Р–Р•Рў",
    paragraphs: [
      "РњРЅРѕРіРѕ Р»РµС‚ РЅР°Р·Р°Рґ РІ С€РєРѕР»Рµ РїСЂРѕРёР·РѕС€С‘Р» РЅРµСЃС‡Р°СЃС‚РЅС‹Р№ СЃР»СѓС‡Р°Р№ РІРѕ РІСЂРµРјСЏ СЃС‚Р°СЂРѕРіРѕ РїСЂР°Р·РґРЅРёРєР° СЃ РёРіСЂСѓС€РєР°РјРё.",
      "Р’Р·СЂРѕСЃР»С‹Рµ СЃРєСЂС‹Р»Рё РїСЂР°РІРґСѓ, Р° Р·Р°Р±С‹С‚С‹Рµ РёРіСЂСѓС€РєРё РІРїРёС‚Р°Р»Рё СЃС‚СЂР°С… Рё РѕРґРёРЅРѕС‡РµСЃС‚РІРѕ РґРµС‚РµР№.",
      "РўРµРїРµСЂСЊ РѕРЅРё РѕР¶РёР»Рё Рё СѓРґРµСЂР¶РёРІР°СЋС‚ СѓС‡РµРЅРёРєРѕРІ РІРЅСѓС‚СЂРё С€РєРѕР»С‹, РїРѕС‚РѕРјСѓ С‡С‚Рѕ Р±РѕСЏС‚СЃСЏ СЃРЅРѕРІР° РѕСЃС‚Р°С‚СЊСЃСЏ РѕРґРЅРё.",
    ],
    goals: ["РЅР°Р№С‚Рё РґСЂСѓР·РµР№", "СѓР·РЅР°С‚СЊ РїСЂР°РІРґСѓ", "РѕСЃРІРѕР±РѕРґРёС‚СЊ РґРµС‚РµР№", "РІС‹Р±СЂР°С‚СЊСЃСЏ РЅР°СЂСѓР¶Сѓ"],
  },
  {
    title: "РќРћР§Р¬ Р’ РЁРљРћР›Р•",
    paragraphs: [
      "Р›Р°РЅР° РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ Р·Р° Р·Р°Р±С‹С‚С‹Рј СЂСЋРєР·Р°РєРѕРј, РЅРѕ РєРѕСЂРёРґРѕСЂС‹ СѓР¶Рµ РЅРµ РїРѕС…РѕР¶Рё РЅР° РѕР±С‹С‡РЅСѓСЋ С€РєРѕР»Сѓ.",
      "Р§Р°СЃС‹ РѕСЃС‚Р°РЅРѕРІРёР»РёСЃСЊ, РґРІРµСЂРё Р·Р°РїРµСЂР»РёСЃСЊ, Р° СЃС‚Р°СЂС‹Рµ РёРіСЂСѓС€РєРё РЅР°С‡Р°Р»Рё С€РµРїС‚Р°С‚СЊ РёРјРµРЅР° РїСЂРѕРїР°РІС€РёС… СѓС‡РµРЅРёРєРѕРІ.",
      "Р§С‚РѕР±С‹ РІС‹Р№С‚Рё, Р›Р°РЅРµ РїСЂРёРґС‘С‚СЃСЏ РїРѕРЅСЏС‚СЊ, РїРѕС‡РµРјСѓ С€РєРѕР»Р° РЅРµ РѕС‚РїСѓСЃРєР°РµС‚ РґРµС‚РµР№ РїРѕСЃР»Рµ Р·РІРѕРЅРєР°.",
    ],
    goals: ["РЅР°Р№С‚Рё РєР»СЋС‡Рё", "СЃРїР°СЃС‚Рё РґСЂСѓР·РµР№", "СЃРѕР±СЂР°С‚СЊ Р·Р°РїРёСЃРєРё", "РґРѕР№С‚Рё РґРѕ РІС‹С…РѕРґР°"],
  },
  {
    title: "РўРђР™РќРђ РР“Р РЈРЁР•Рљ",
    paragraphs: [
      "РљРѕРіРґР°-С‚Рѕ С€РєРѕР»СЊРЅС‹Рµ РёРіСЂСѓС€РєРё Р±С‹Р»Рё С‡Р°СЃС‚СЊСЋ СЃРїРµРєС‚Р°РєР»СЏ, РєРѕС‚РѕСЂС‹Р№ Р·Р°РєРѕРЅС‡РёР»СЃСЏ С‚СЂР°РіРµРґРёРµР№.",
      "РџРѕСЃР»Рµ СЌС‚РѕРіРѕ РёС… СЃРїСЂСЏС‚Р°Р»Рё РЅР° С‡РµСЂРґР°РєРµ, РЅРѕ РѕРґРёРЅРѕС‡РµСЃС‚РІРѕ СЃРґРµР»Р°Р»Рѕ РёС… Р¶РёРІС‹РјРё Рё Р·Р»С‹РјРё.",
      "РћРЅРё РЅРµ С…РѕС‚СЏС‚ РїСЂРёС‡РёРЅСЏС‚СЊ Р±РѕР»СЊ, РЅРѕ СЃС‡РёС‚Р°СЋС‚, С‡С‚Рѕ РІРЅСѓС‚СЂРё С€РєРѕР»С‹ РґРµС‚СЏРј Р±РµР·РѕРїР°СЃРЅРµРµ, С‡РµРј СЃРЅР°СЂСѓР¶Рё.",
    ],
    goals: ["РЅРµ С€СѓРјРµС‚СЊ", "РёСЃРєР°С‚СЊ СѓР»РёРєРё", "РѕСЃРІРѕР±РѕРґРёС‚СЊ Р·Р°РїРµСЂС‚С‹С… РґРµС‚РµР№", "СЃР»РѕРјР°С‚СЊ СЃС‚Р°СЂРѕРµ РїСЂРѕРєР»СЏС‚РёРµ"],
  },
  {
    title: "Р—РђР‘Р«РўР«Р™ РџР РђР—Р”РќРРљ",
    paragraphs: [
      "Р’ Р°РєС‚РѕРІРѕРј Р·Р°Р»Рµ РєРѕРіРґР°-С‚Рѕ РїСЂРѕС€С‘Р» РїСЂР°Р·РґРЅРёРє, Рѕ РєРѕС‚РѕСЂРѕРј Р±РѕР»СЊС€Рµ РЅРёРєС‚Рѕ РЅРµ РіРѕРІРѕСЂРёС‚.",
      "РџРѕСЃР»Рµ РЅРµРіРѕ РЅРµСЃРєРѕР»СЊРєРѕ РґРµС‚РµР№ РёСЃС‡РµР·Р»Рё, Р° РёРіСЂСѓС€РєРё РѕСЃС‚Р°Р»РёСЃСЊ Р¶РґР°С‚СЊ, С‡С‚Рѕ СЃ РЅРёРјРё СЃРЅРѕРІР° Р±СѓРґСѓС‚ РёРіСЂР°С‚СЊ.",
      "РўРµРїРµСЂСЊ С€РєРѕР»Р° Р·Р°РєСЂС‹РІР°РµС‚СЃСЏ СЃР°РјР°, Рё С‚РѕР»СЊРєРѕ Р›Р°РЅР° РјРѕР¶РµС‚ РѕС‚РєСЂС‹С‚СЊ РґРІРµСЂРё С‚РµРј, РєС‚Рѕ Р·Р°СЃС‚СЂСЏР» РІРЅСѓС‚СЂРё.",
    ],
    goals: ["РЅР°Р№С‚Рё РґСЂСѓР·РµР№", "РЅРµ РїРѕРїР°СЃС‚СЊСЃСЏ РёРіСЂСѓС€РєР°Рј", "СѓР·РЅР°С‚СЊ, С‡С‚Рѕ СЃР»СѓС‡РёР»РѕСЃСЊ РЅР° РїСЂР°Р·РґРЅРёРєРµ", "РІС‹РІРµСЃС‚Рё РґРµС‚РµР№ РёР· С€РєРѕР»С‹"],
  },
  {
    title: "РџРћРЎР›Р•Р”РќРР™ Р—Р’РћРќРћРљ",
    paragraphs: [
      "РџРѕСЃР»Рµ РїРѕСЃР»РµРґРЅРµРіРѕ Р·РІРѕРЅРєР° РІ С€РєРѕР»Рµ РґРѕР»Р¶РЅР° Р±С‹Р»Р° РЅР°СЃС‚СѓРїРёС‚СЊ С‚РёС€РёРЅР°, РЅРѕ РІРјРµСЃС‚Рѕ РЅРµС‘ РїСЂРѕСЃРЅСѓР»РёСЃСЊ СЃС‚Р°СЂС‹Рµ РёРіСЂСѓС€РєРё.",
      "РћРЅРё РїРѕРјРЅСЏС‚ СЃС‚СЂР°С… РґРµС‚РµР№ Р»СѓС‡С€Рµ, С‡РµРј РёС… РіРѕР»РѕСЃР°, Рё РїРѕСЌС‚РѕРјСѓ РЅРµ РґР°СЋС‚ РЅРёРєРѕРјСѓ СѓР№С‚Рё.",
      "Р›Р°РЅР° РґРѕР»Р¶РЅР° РїСЂРѕР№С‚Рё СЌС‚Р°Р¶ Р·Р° СЌС‚Р°Р¶РѕРј Рё РґРѕРєР°Р·Р°С‚СЊ, С‡С‚Рѕ РѕРґРёРЅРѕС‡РµСЃС‚РІРѕ РјРѕР¶РЅРѕ РѕС‚РїСѓСЃС‚РёС‚СЊ.",
    ],
    goals: ["РІС‹Р¶РёС‚СЊ РІ РєРѕСЂРёРґРѕСЂР°С…", "РѕС‚С‹СЃРєР°С‚СЊ РїРѕС‚РµСЂСЏРЅРЅС‹С… СѓС‡РµРЅРёРєРѕРІ", "СЂР°СЃРєСЂС‹С‚СЊ СЃРєСЂС‹С‚СѓСЋ РїСЂР°РІРґСѓ", "СЃР±РµР¶Р°С‚СЊ РґРѕ СЂР°СЃСЃРІРµС‚Р°"],
  },
];

const INTRO_CINEMATIC_VARIANTS: IntroFrame[][] = [
  [
    { scene: "black", line: "Р›Р°РЅР°: РЇ РІРµСЂРЅСѓР»Р°СЃСЊ С‚РѕР»СЊРєРѕ Р·Р° СЂСЋРєР·Р°РєРѕРј. РџРѕС‡РµРјСѓ РІ С€РєРѕР»Рµ С‚Р°Рє С‚РёС…Рѕ?" },
    { scene: "school", line: "Р›Р°РЅР°: РћРєРЅР° С‚С‘РјРЅС‹Рµ... РЅРѕ РІРЅСѓС‚СЂРё Р±СѓРґС‚Рѕ РєС‚Рѕ-С‚Рѕ С…РѕРґРёС‚." },
    { scene: "classroom", line: "Р›Р°РЅР°: Р РµР±СЏС‚Р°? Р’С‹ РµС‰С‘ Р·РґРµСЃСЊ? РћС‚РІРµС‚СЊС‚Рµ..." },
    { scene: "lana", line: "Р›Р°РЅР°: РЎРІРµС‚ РјРѕСЂРіР°РµС‚. Р­С‚Рѕ РЅРµ РїРѕС…РѕР¶Рµ РЅР° РѕР±С‹С‡РЅСѓСЋ Р°РІР°СЂРёСЋ." },
    { scene: "flicker", line: "Р›Р°РЅР°: РќРµС‚... С‚РѕР»СЊРєРѕ С‡С‚Рѕ РІСЃРµ СЃРёРґРµР»Рё СЂСЏРґРѕРј СЃРѕ РјРЅРѕР№." },
    { scene: "empty", line: "Р›Р°РЅР°: РџР°СЂС‚С‹ РїСѓСЃС‚С‹Рµ. Р”СЂСѓР·СЊСЏ РёСЃС‡РµР·Р»Рё. РћСЃС‚Р°Р»РёСЃСЊ С‚РѕР»СЊРєРѕ РёС… РІРµС‰Рё." },
    { scene: "monsters", line: "Р›Р°РЅР°: РРіСЂСѓС€РєРё РґРІРёРіР°СЋС‚СЃСЏ. РћРЅРё СЃРјРѕС‚СЂСЏС‚ С‚Р°Рє, Р±СѓРґС‚Рѕ Р·РЅР°СЋС‚ РјРѕС‘ РёРјСЏ." },
  ],
  [
    { scene: "black", line: "Р›Р°РЅР°: РџРѕСЃР»Рµ Р·РІРѕРЅРєР° С€РєРѕР»Р° РґРѕР»Р¶РЅР° Р±С‹Р»Р° РѕРїСѓСЃС‚РµС‚СЊ. РќРѕ РѕРЅР° Р±СѓРґС‚Рѕ РїСЂРѕСЃРЅСѓР»Р°СЃСЊ." },
    { scene: "school", line: "Р›Р°РЅР°: Р“Р»Р°РІРЅС‹Р№ РІС…РѕРґ Р·Р°РєСЂС‹С‚. РљС‚Рѕ-С‚Рѕ Р·Р°РїРµСЂ РЅР°СЃ РёР·РЅСѓС‚СЂРё." },
    { scene: "classroom", line: "Р›Р°РЅР°: РЈС‡РµРЅРёРєРё С€РµРїС‡СѓС‚СЃСЏ... РѕРЅРё С‚РѕР¶Рµ СЃР»С‹С€Р°С‚ СЌС‚Рё С€Р°РіРё?" },
    { scene: "lana", line: "Р›Р°РЅР°: Р•СЃР»Рё СЌС‚Рѕ СЂРѕР·С‹РіСЂС‹С€, РѕРЅ СЃРѕРІСЃРµРј РЅРµ СЃРјРµС€РЅРѕР№." },
    { scene: "flicker", line: "Р›Р°РЅР°: РЎРІРµС‚! РќРµ РіР°СЃРЅРё... РїРѕР¶Р°Р»СѓР№СЃС‚Р°." },
    { scene: "empty", line: "Р›Р°РЅР°: Р’СЃРµ РїСЂРѕРїР°Р»Рё. Р”Р°Р¶Рµ Р·РІСѓРє РґС‹С…Р°РЅРёСЏ РёСЃС‡РµР·." },
    { scene: "monsters", line: "Р›Р°РЅР°: РЎС‚Р°СЂС‹Рµ РёРіСЂСѓС€РєРё РІС‹С€Р»Рё РёР· С€РєР°С„РѕРІ. РћРЅРё РЅРµ С…РѕС‚СЏС‚ РѕС‚РїСѓСЃРєР°С‚СЊ РґРµС‚РµР№." },
  ],
  [
    { scene: "black", line: "Р›Р°РЅР°: РЇ СЃР»С‹С€Р°Р»Р° РёСЃС‚РѕСЂРёСЋ Рѕ С€РєРѕР»СЊРЅРѕРј РїСЂР°Р·РґРЅРёРєРµ. РќР°Рј Р·Р°РїСЂРµС‰Р°Р»Рё Рѕ РЅС‘Рј РіРѕРІРѕСЂРёС‚СЊ." },
    { scene: "school", line: "Р›Р°РЅР°: РўРµРїРµСЂСЊ С€РєРѕР»Р° РІС‹РіР»СЏРґРёС‚ С‚Р°Рє, Р±СѓРґС‚Рѕ РІСЃС‘ РµС‰С‘ Р¶РґС‘С‚ С‚РѕС‚ РїСЂР°Р·РґРЅРёРє." },
    { scene: "classroom", line: "Р›Р°РЅР°: РќР° РґРѕСЃРєРµ РЅР°РїРёСЃР°РЅРѕ: 'РќРµ РѕСЃС‚Р°РІР»СЏР№С‚Рµ РЅР°СЃ РѕРґРЅРёС…'." },
    { scene: "lana", line: "Р›Р°РЅР°: РќСѓР¶РЅРѕ РЅР°Р№С‚Рё РљР°СЂР»Р° Рё Р”РёРЅСѓ. РћРЅРё РЅРµ РјРѕРіР»Рё РїСЂРѕСЃС‚Рѕ РёСЃС‡РµР·РЅСѓС‚СЊ." },
    { scene: "flicker", line: "Р›Р°РЅР°: РљС‚Рѕ-С‚Рѕ СЃС‚РѕРёС‚ Сѓ РґРІРµСЂРё... РЅРµС‚, СЌС‚Рѕ РёРіСЂСѓС€РєР°." },
    { scene: "empty", line: "Р›Р°РЅР°: Р§РµРј С‚РёС€Рµ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РєР»Р°СЃСЃ, С‚РµРј РіСЂРѕРјС‡Рµ СЃР»С‹С€РЅРѕ Р·Р°РІРѕРґРЅРѕР№ РєР»СЋС‡РёРє." },
    { scene: "monsters", line: "Р›Р°РЅР°: РћРЅРё РЅРµ Р·Р»С‹Рµ? РќРµС‚... РѕРЅРё РЅР°РїСѓРіР°РЅС‹. РќРѕ РІСЃС‘ СЂР°РІРЅРѕ РѕРїР°СЃРЅС‹." },
  ],
];

function pickToyMonsterKind(name: string): ToyMonsterKind {
  const lower = name.toLowerCase();
  if (lower.includes("bear") || lower.includes("plush")) return "bear";
  if (lower.includes("monkey") || lower.includes("music box")) return "monkey";
  if (lower.includes("clown")) return "clown";
  if (lower.includes("ballerina") || lower.includes("doll") || lower.includes("porcelain") || lower.includes("matron")) return "porcelain";
  return "porcelain";
}

const AMBIENT_HORROR_LINES = [
  "A child's laugh echoes from an empty classroom.",
  "The floorboards creak behind Lana, then go silent.",
  "A toy bell rings once somewhere in the dark.",
  "The lights flicker. For a second, every door looks open.",
  "Something small runs across the ceiling tiles.",
  "A whisper says Lana's name from the lockers.",
];

function storyNoteForRoom(roomId: string) {
  return STORY_NOTES[roomId] ?? null;
}

function rescueForRoom(roomId: string) {
  return RESCUE_EVENTS.find((event) => event.roomId === roomId) ?? null;
}

function LanaSpeech({ side = "right" }: { side?: "left" | "right" }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const pick = () => {
      if (!mounted) return;
      setLine(LANA_LINES[Math.floor(Math.random() * LANA_LINES.length)]);
      setTimeout(() => mounted && setLine(null), 2600);
    };
    const t0 = setTimeout(pick, 1200);
    const iv = setInterval(pick, 6500);
    return () => { mounted = false; clearTimeout(t0); clearInterval(iv); };
  }, []);
  if (!line) return null;
  return (
    <div
      className="absolute font-pixel text-[11px] text-black bg-white border-2 border-black px-2 py-1 whitespace-nowrap animate-fade-in"
      style={{
        bottom: 70, [side]: -10, borderRadius: 6,
        boxShadow: "2px 2px 0 #000",
        zIndex: 20,
      }}
    >
      {line}
      <span
        className="absolute"
        style={{
          [side]: 16, bottom: -8, width: 0, height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid #000",
        }}
      />
      <span
        className="absolute"
        style={{
          [side]: 17, bottom: -5, width: 0, height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid #fff",
        }}
      />
    </div>
  );
}



// Palettes
// Lana matches the menu art: dark hair, navy school uniform, red tie, muted backpack.
const PAL_LANA: PixelPalette = {
  skin: "#d6a786", skinShade: "#986247",
  hair: "#151116", hairShade: "#2f2630",
  shirt: "#202b3a", shirtShade: "#0d1119",
  pants: "#1b1f32", pantsShade: "#0b0d15",
  shoes: "#0a090d",
  accent: "#7d1d2d",
  ponytail: "#151116",
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
  skin: "#f0e8dc", skinShade: "#b8a898",
  hair: "#d8d0c8", hairShade: "#8a7a72",
  shirt: "#261824", shirtShade: "#0a0610",
  pants: "#181018", pantsShade: "#000000",
  shoes: "#0a0608",
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
  { id: "classic", name: "School Uniform", price: 0, palette: PAL_LANA },
  { id: "hoodie", name: "Grey Hoodie + Jeans", price: 60, palette: {
    skin: "#f4c8a8", skinShade: "#d49a78",
    hair: "#3a2418", hairShade: "#1a0e08",
    shirt: "#6e7480", shirtShade: "#3a3e48",
    pants: "#2a3a5a", pantsShade: "#101830", shoes: "#f4f4f4",
    cap: "#6e7480",
  } },
  { id: "track", name: "Tracksuit", price: 80, palette: {
    skin: "#f4c8a8", skinShade: "#d49a78",
    hair: "#2a1a14", hairShade: "#0a0506",
    shirt: "#1aa8a8", shirtShade: "#0a5a5a",
    pants: "#0a0a14", pantsShade: "#000000", shoes: "#ffffff",
    cap: "#1aa8a8",
  } },
  { id: "denim", name: "Denim Jacket", price: 120, palette: {
    skin: "#f4c8a8", skinShade: "#d49a78",
    hair: "#5a3a1a", hairShade: "#2a1a08",
    shirt: "#3a6aa8", shirtShade: "#1a3a68",
    pants: "#1a2a4a", pantsShade: "#0a1228", shoes: "#3a2418",
    cap: "#3a6aa8",
  } },
  { id: "punk", name: "Punk Jacket", price: 160, palette: {
    skin: "#f4c8a8", skinShade: "#c8946a",
    hair: "#ff2a6a", hairShade: "#8a0a3a",
    shirt: "#1a1a1a", shirtShade: "#000000",
    pants: "#2a1a2a", pantsShade: "#0a0a0a", shoes: "#3a0a0a",
    cap: "#1a1a1a",
  } },
  { id: "raincoat", name: "Yellow Raincoat", price: 200, palette: {
    skin: "#f4c8a8", skinShade: "#d49a78",
    hair: "#2a1a14", hairShade: "#0a0506",
    shirt: "#f4c834", shirtShade: "#a07a10",
    pants: "#1a1a24", pantsShade: "#000000", shoes: "#1a1a1a",
    cap: "#f4c834",
  } },
  { id: "winter", name: "Winter Coat", price: 240, palette: {
    skin: "#f4c8a8", skinShade: "#c8946a",
    hair: "#3a2418", hairShade: "#1a0e08",
    shirt: "#8a2424", shirtShade: "#4a0e0e",
    pants: "#1a1a24", pantsShade: "#000000", shoes: "#3a2418",
    cap: "#f4f4f4",
  } },
  { id: "armor", name: "Armor Vest (+10 HP)", price: 300, palette: {
    skin: "#f4c8a8", skinShade: "#c8946a",
    hair: "#2a1a14", hairShade: "#0a0506",
    shirt: "#2a3322", shirtShade: "#141a10",
    pants: "#1a1a1a", pantsShade: "#000000", shoes: "#2a1a0a",
    cap: "#2a3322",
    armored: true,
  } },
  { id: "ninja", name: "Ninja (-noise)", price: 420, palette: {
    skin: "#e0b890", skinShade: "#a87a55",
    hair: "#000000", hairShade: "#000000",
    shirt: "#0a0a14", shirtShade: "#000000",
    pants: "#000000", pantsShade: "#000000", shoes: "#000000",
    eyes: "#ff3030",
  } },
];

// Smooth (non-pixel) silhouette preview used in the wardrobe shop.
function SmoothOutfitPreview({ palette, size = 110 }: { palette: PixelPalette; size?: number }) {
  return (
    <svg width={size * 0.55} height={size} viewBox="0 0 55 100" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.55))" }}>
      {/* hair back */}
      <ellipse cx="27.5" cy="16" rx="11" ry="11" fill={palette.hairShade} />
      {/* head */}
      <ellipse cx="27.5" cy="18" rx="8.5" ry="9.5" fill={palette.skin} />
      <path d="M19 17 Q19 9 27.5 8 Q36 9 36 17 L36 13 Q32 10 27.5 10 Q23 10 19 13 Z" fill={palette.hair} />
      {/* eyes */}
      <circle cx="24.5" cy="19" r="0.9" fill={palette.eyes ?? "#1a1a1a"} />
      <circle cx="30.5" cy="19" r="0.9" fill={palette.eyes ?? "#1a1a1a"} />
      {/* neck */}
      <rect x="25.5" y="26" width="4" height="4" fill={palette.skinShade} />
      {/* torso (jacket/shirt) */}
      <path d="M14 32 Q14 30 17 29 L25 28 L30 28 L38 29 Q41 30 41 32 L42 58 L13 58 Z" fill={palette.shirt} />
      <path d="M14 32 Q14 30 17 29 L25 28 L25 58 L13 58 Z" fill={palette.shirtShade} opacity="0.55" />
      {/* armor vest detail */}
      {palette.armored && (
        <>
          <rect x="22" y="34" width="11" height="20" fill="#1a1a14" opacity="0.55" />
          <rect x="22" y="38" width="11" height="1.2" fill="#3a3a28" />
          <rect x="22" y="46" width="11" height="1.2" fill="#3a3a28" />
        </>
      )}
      {/* belt */}
      <rect x="13" y="56" width="29" height="3" fill="#1a1014" />
      {/* legs (pants) */}
      <path d="M14 59 L26 59 L25 92 L17 92 Z" fill={palette.pants} />
      <path d="M29 59 L41 59 L38 92 L30 92 Z" fill={palette.pants} />
      <path d="M14 59 L20 59 L18 92 L17 92 Z" fill={palette.pantsShade} opacity="0.6" />
      <path d="M29 59 L34 59 L31 92 L30 92 Z" fill={palette.pantsShade} opacity="0.6" />
      {/* shoes */}
      <ellipse cx="20.5" cy="93" rx="4.5" ry="2.2" fill={palette.shoes} />
      <ellipse cx="34" cy="93" rx="4.5" ry="2.2" fill={palette.shoes} />
      {/* subtle face shading */}
      <ellipse cx="27.5" cy="22" rx="6" ry="3" fill={palette.skinShade} opacity="0.25" />
    </svg>
  );
}

// ---- Upgrades (persisted in localStorage) ----
export type UpgradeId = "bat" | "gun" | "flashlight" | "hp" | "hint";
export type Upgrade = {
  id: UpgradeId; name: string; icon: typeof Swords; price: number; desc: string; max?: number;
};
const UPGRADES: Upgrade[] = [
  { id: "bat",        name: "Baseball Bat",   icon: Swords,     price: 60,  desc: "1 hit вЂ” stun doll without a task.", max: 5 },
  { id: "gun",        name: "Pistol",            icon: Crosshair,  price: 220, desc: "Shot вЂ” instantly kills doll.", max: 5 },
  { id: "flashlight", name: "Flashlight",             icon: Flashlight, price: 140, desc: "Lights up dark hallways (floors 2вЂ“3)." },
  { id: "hp",         name: "Enhanced Health",  icon: Heart,      price: 180, desc: "+25 to max HP." },
  { id: "hint",       name: "РџРѕРґСЃРєР°Р·РєРё", icon: Lightbulb, price: 90, desc: "Detailed hints in all tasks." },
];

type Inventory = {
  bat: number; gun: number;
  flashlight: boolean; hp: boolean; hint: boolean;
};
const EMPTY_INV: Inventory = { bat: 0, gun: 0, flashlight: false, hp: false, hint: false };

const SAVE_KEY = "escape-school-save-v1";
const CRYSTAL_PRICE = 120;
const RESPAWN_CRYSTAL_COST = 1;
type SaveData = { coins: number; crystals: number; outfit: string; owned: Inventory; ownedOutfits: string[] };
const DEFAULT_OUTFITS = ["classic"];
const loadSave = (): SaveData => {
  if (typeof window === "undefined") return { coins: 0, crystals: 0, outfit: "classic", owned: { ...EMPTY_INV }, ownedOutfits: [...DEFAULT_OUTFITS] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { coins: 0, crystals: 0, outfit: "classic", owned: { ...EMPTY_INV }, ownedOutfits: [...DEFAULT_OUTFITS] };
    const p = JSON.parse(raw);
    const ownedOutfits: string[] = Array.isArray(p.ownedOutfits) ? p.ownedOutfits : [];
    const merged = Array.from(new Set([...DEFAULT_OUTFITS, ...ownedOutfits, p.outfit ?? "classic"]));
    return { coins: p.coins ?? 0, crystals: p.crystals ?? 0, outfit: p.outfit ?? "classic", owned: { ...EMPTY_INV, ...(p.owned ?? {}) }, ownedOutfits: merged };
  } catch { return { coins: 0, crystals: 0, outfit: "classic", owned: { ...EMPTY_INV }, ownedOutfits: [...DEFAULT_OUTFITS] }; }
};
const writeSave = (s: SaveData) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

// ---- Per-task hints ----
const TASK_HINTS: Record<TaskKind, { short: string; long: string }> = {
  wires:    { short: "Drag the wire from the left terminal to the right one of the same color.", long: "If you make a mistake вЂ” click the left terminal again to reset the connection. Colors must match exactly." },
  download: { short: "Р—Р°Р¶РјРё РєРЅРѕРїРєСѓ, РїРѕРєР° С€РєР°Р»Р° РЅРµ Р·Р°РїРѕР»РЅРёС‚СЃСЏ.", long: "Р•СЃР»Рё РѕС‚РїСѓСЃС‚РёС€СЊ, РїСЂРѕРіСЂРµСЃСЃ РїР°РґР°РµС‚ РјРµРґР»РµРЅРЅРѕ. РљРЅРѕРїРєСѓ РјРѕР¶РЅРѕ РЅР°Р¶Р°С‚СЊ СЃРЅРѕРІР°." },
  reactor:  { short: "Р—Р°РїРѕРјРЅРё С†РІРµС‚Р° РїРѕ РїРѕСЂСЏРґРєСѓ Рё РїРѕРІС‚РѕСЂРё.", long: "Р•СЃР»Рё РѕС€РёР±С‘С€СЊСЃСЏ, С†РІРµС‚Р° РїРѕРєР°Р¶СѓС‚СЃСЏ СЃРЅРѕРІР°." },
  trash:    { short: "Hold the lever until the tank is empty.", long: "The tank refills if you release. Don't get distracted." },
  switches: { short: "Р’РєР»СЋС‡Рё РІСЃРµ С‚СѓРјР±Р»РµСЂС‹.", long: "РџСЂРѕСЃС‚Рѕ РЅР°Р¶РјРё РєР°Р¶РґС‹Р№ РІС‹РєР»СЋС‡РµРЅРЅС‹Р№ С‚СѓРјР±Р»РµСЂ." },
  quiz:     { short: "РџСЂРѕС‡РёС‚Р°Р№ СЃРёС‚СѓР°С†РёСЋ Рё РІС‹Р±РµСЂРё Р±РµР·РѕРїР°СЃРЅРѕРµ РґРµР№СЃС‚РІРёРµ. Р•СЃС‚СЊ 3 РїРѕРїС‹С‚РєРё.", long: "Р’РѕРїСЂРѕСЃС‹ РЅРµ РїСЂРѕ СѓСЂРѕРєРё, Р° РїСЂРѕ РІС‹Р¶РёРІР°РЅРёРµ, С€СѓРј, СЃРІРµС‚ Рё РїРѕРІРµРґРµРЅРёРµ РєСѓРєРѕР»." },
  aim:      { short: "РќР°Р¶РјРё РєСЂР°СЃРЅС‹Рµ С†РµР»Рё.", long: "Р¦РµР»РµР№ РјРµРЅСЊС€Рµ, РІСЂРµРјРµРЅРё Р±РѕР»СЊС€Рµ." },
};

function HintBox({ kind, advanced }: { kind: TaskKind; advanced: boolean }) {
  const [open, setOpen] = useState(false);
  const tip = TASK_HINTS[kind];
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11px] font-pixel text-amber-300 hover:text-amber-100 bg-black/40 border border-amber-700/40 rounded px-2 py-1">
        <Lightbulb className="h-3 w-3" />
        {open ? "РЎРєСЂС‹С‚СЊ РїРѕРґСЃРєР°Р·РєСѓ" : "РџРѕРґСЃРєР°Р·РєР°"}
      </button>
      {open && (
        <div className="mt-2 text-[12px] text-amber-100/90 bg-amber-900/15 border border-amber-700/30 rounded p-2">
          <div>рџ’Ў {tip.short}</div>
          {advanced && <div className="mt-1 text-amber-300/90">в… {tip.long}</div>}
        </div>
      )}
    </div>
  );
}

// Backwards-compatible API used elsewhere in this file
function Crewmate({ color, facing = 1, size = 80, dead = false, palette, motion = "idle" }:
  { color: string; facing?: 1 | -1; size?: number; dead?: boolean; palette?: PixelPalette; motion?: TeenMotion }) {
  const isLana = color === "#ff66aa";
  const pal = isLana ? PAL_LANA : (palette ?? (PALETTES[color] ?? { ...PAL_MILA, shirt: color, shirtShade: color }));
  if (isLana) return <MenuArtCharacter kind="lana" facing={facing} size={Math.round(size * 1.9)} scared={dead || motion === "scared"} motion={motion} />;
  return <PixelHuman palette={pal} facing={facing} size={size} variant={isLana ? "girl" : "student"} dead={dead} />;
}

function MenuArtCharacter({
  kind = "lana",
  facing = 1,
  size = 120,
  scared = false,
  motion = "idle",
}: {
  kind?: TeenKind;
  facing?: 1 | -1;
  size?: number;
  scared?: boolean;
  motion?: TeenMotion;
}) {
  const src = kind === "lana" ? menuLanaCutout : kind === "karl" ? menuFriendBoyCutout : menuFriendGirlCutout;
  const className = motion === "run" ? "menu-art-run" : motion === "walk" ? "menu-art-walk" : scared || motion === "scared" ? "menu-art-scared" : "";
  const style = {
    height: size,
    width: "auto",
    "--face": facing,
  } as CSSProperties;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={`menu-art-cutout ${className}`}
      style={style}
    />
  );
}

function MenuArtMonster({
  kind,
  size = 120,
  facing = -1,
  hurt = false,
  boss = false,
  motion = "walk",
}: {
  kind: ToyMonsterKind;
  size?: number;
  facing?: 1 | -1;
  hurt?: boolean;
  boss?: boolean;
  motion?: MonsterMotion;
}) {
  const src =
    kind === "bear" ? menuBearCutout :
    kind === "monkey" ? menuMonkeyCutout :
    kind === "clown" ? menuClownCutout :
    menuBallerinaCutout;
  const motionClass = motion === "run" ? "menu-art-monster-run" : motion === "walk" ? "menu-art-monster-walk" : "menu-art-monster-idle";
  const style = {
    height: boss ? Math.round(size * 1.18) : size,
    width: "auto",
    "--face": facing,
  } as CSSProperties;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={`menu-art-cutout menu-art-monster ${motionClass} ${hurt ? "menu-art-hurt" : ""} ${boss ? "menu-art-boss" : ""}`}
      style={style}
    />
  );
}

function Impostor({ size = 80 }: { size?: number }) {
  return <MenuArtMonster kind="porcelain" size={size} boss facing={-1} />;
}


// ============== TASK MINI-GAMES ==============

// 1) WIRES
function WiresGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const colors = useMemo(() => {
    const c = ["#e84545", "#3aa3ff", "#ffd23a"];
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

  const allDone = Object.keys(connections).length === colors.left.length &&
    Object.entries(connections).every(([l, r]) => colors.left[+l] === colors.right[r]);

  useEffect(() => { if (allDone) setTimeout(() => onDone(true), 500); }, [allDone, onDone]);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">РЎРѕРµРґРёРЅРё РѕРґРёРЅР°РєРѕРІС‹Рµ С†РІРµС‚Р°.</p>
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
      {allDone && <p className="text-primary font-bold">вњ“ Done!</p>}
    </div>
  );
}


// 3) DOWNLOAD вЂ” hold button
function DownloadGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const tick = () => {
      setProgress(p => {
        const np = holding.current ? Math.min(100, p + 3) : Math.max(0, p - 0.2);
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
      <p className="text-sm text-muted-foreground">Р—Р°Р¶РјРё РєРЅРѕРїРєСѓ, РїРѕРєР° С€РєР°Р»Р° РЅРµ Р·Р°РїРѕР»РЅРёС‚СЃСЏ.</p>
      <div className="w-72 h-6 bg-black/60 rounded overflow-hidden border border-primary/40">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <Button size="lg"
        onMouseDown={() => (holding.current = true)}
        onMouseUp={() => (holding.current = false)}
        onMouseLeave={() => (holding.current = false)}
        onTouchStart={() => (holding.current = true)}
        onTouchEnd={() => (holding.current = false)}>
        <Download className="mr-2 h-4 w-4" /> Р”Р•Р Р–РђРўР¬
      </Button>
      <p className="font-mono text-primary">{Math.floor(progress)}%</p>
    </div>
  );
}

// 4) REACTOR вЂ” Simon
function ReactorGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [seq] = useState(() => Array.from({ length: 3 }, () => Math.floor(Math.random() * 4)));
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
    }, 650);
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
      <p className="text-sm text-muted-foreground">{phase === "watch" ? "Р—Р°РїРѕРјРЅРё С†РІРµС‚Р°..." : "РџРѕРІС‚РѕСЂРё С†РІРµС‚Р°"}</p>
      <div className="grid grid-cols-2 gap-3">
        {cols.map((c, i) => (
          <button key={i} onClick={() => press(i)}
            className="w-28 h-28 rounded-lg border-2 border-black/60 transition-all"
            style={{ background: c, opacity: showing === i ? 1 : 0.45, transform: showing === i ? "scale(1.05)" : "scale(1)" }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">РЁР°Рі {step}/{seq.length}</p>
    </div>
  );
}

// 5) TRASH вЂ” hold lever
function TrashGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [level, setLevel] = useState(100);
  const holding = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      setLevel(l => {
        const nl = holding.current ? Math.max(0, l - 6) : Math.min(100, l + 0.12);
        if (nl <= 0) onDone(true);
        return nl;
      });
    }, 30);
    return () => clearInterval(id);
  }, [onDone]);
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">Р”РµСЂР¶Рё СЂС‹С‡Р°Рі, РїРѕРєР° С€РєР°Р»Р° РЅРµ РѕРїСѓСЃС‚РµРµС‚.</p>
      <div className="w-32 h-56 bg-black/60 border-2 border-amber-700 rounded relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700 to-amber-500" style={{ height: `${level}%` }}>
          <div className="text-[10px] text-center pt-1">рџ—‘пёЏ</div>
        </div>
      </div>
      <Button size="lg"
        onMouseDown={() => (holding.current = true)} onMouseUp={() => (holding.current = false)} onMouseLeave={() => (holding.current = false)}
        onTouchStart={() => (holding.current = true)} onTouchEnd={() => (holding.current = false)}>
        <Trash2 className="mr-2 h-4 w-4" /> РўРЇРќРЈРўР¬
      </Button>
    </div>
  );
}

// 6) SWITCHES
function SwitchesGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [s, setS] = useState<boolean[]>(() => Array.from({ length: 3 }, () => false));
  useEffect(() => { if (s.every(Boolean)) setTimeout(() => onDone(true), 300); }, [s, onDone]);
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Р’РєР»СЋС‡Рё РІСЃРµ С‚СѓРјР±Р»РµСЂС‹.</p>
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


// 8) QUIZ вЂ” survival/story question
const QUIZ_POOL = [
  { q: "РЎРІРµС‚ РЅР°С‡Р°Р» РјРёРіР°С‚СЊ. Р§С‚Рѕ Р±РµР·РѕРїР°СЃРЅРµРµ СЃРґРµР»Р°С‚СЊ РїРµСЂРІС‹Рј?", o: ["Р—Р°РјРµСЂРµС‚СЊ Рё СЃР»СѓС€Р°С‚СЊ", "Р‘РµР¶Р°С‚СЊ РїРѕ РєРѕСЂРёРґРѕСЂСѓ", "РљСЂРёС‡Р°С‚СЊ РґСЂСѓР·СЊСЏРј", "РЎС‚СѓС‡Р°С‚СЊ РїРѕ С€РєР°С„Р°Рј"], a: 0 },
  { q: "Р—Р°РІРѕРґРЅР°СЏ РѕР±РµР·СЊСЏРЅРєР° СЂРµР°РіРёСЂСѓРµС‚ РЅР° Р·РІСѓРє. РљР°Рє РїСЂРѕР№С‚Рё РјРёРјРѕ?", o: ["РРґС‚Рё С‚РёС…Рѕ", "Р‘СЂРѕСЃРёС‚СЊ РєРЅРёРіСѓ РІ РѕРєРЅРѕ", "Р’РєР»СЋС‡РёС‚СЊ СЃРёСЂРµРЅСѓ", "РџРЅСѓС‚СЊ РїР°СЂС‚Сѓ"], a: 0 },
  { q: "РљСѓРєР»Р° РёСЃС‡РµР·Р»Р° РёР· РєР»Р°СЃСЃР°. Р“РґРµ РѕРїР°СЃРЅРµРµ РІСЃРµРіРѕ СЃС‚РѕСЏС‚СЊ?", o: ["РЎРїРёРЅРѕР№ Рє РґРІРµСЂРё", "РЈ РІРєР»СЋС‡С‘РЅРЅРѕРіРѕ СЃРІРµС‚Р°", "Р СЏРґРѕРј СЃРѕ С€РєР°С„С‡РёРєРѕРј", "Р—Р° РїР°СЂС‚РѕР№"], a: 0 },
  { q: "РњРµРґРІРµРґСЊ РёРґС‘С‚ РјРµРґР»РµРЅРЅРѕ, РЅРѕ РЅРµ РѕС‚СЃС‚Р°С‘С‚. Р§С‚Рѕ РїРѕРјРѕР¶РµС‚ РІС‹РёРіСЂР°С‚СЊ РІСЂРµРјСЏ?", o: ["Р—Р°РєСЂС‹С‚СЊ Р·Р° СЃРѕР±РѕР№ РґРІРµСЂСЊ", "Р–РґР°С‚СЊ РЅР° РјРµСЃС‚Рµ", "Р’С‹РєР»СЋС‡РёС‚СЊ С„РѕРЅР°СЂРёРє", "РЎРјРѕС‚СЂРµС‚СЊ РµРјСѓ РІ РіР»Р°Р·Р°"], a: 0 },
  { q: "Р›Р°РЅР° РЅР°С€Р»Р° С‡СѓР¶РѕР№ С€С‘РїРѕС‚ РІ РґРёРЅР°РјРёРєРµ. Р§РµРјСѓ Р»СѓС‡С€Рµ РЅРµ РґРѕРІРµСЂСЏС‚СЊ?", o: ["Р“РѕР»РѕСЃСѓ Р±РµР· Р»РёС†Р°", "РўРёС…РёРј С€Р°РіР°Рј", "РЎРІРµС‚Сѓ С„РѕРЅР°СЂРёРєР°", "Р—Р°РєСЂС‹С‚РѕР№ РґРІРµСЂРё"], a: 0 },
  { q: "РџРµСЂРµРґ С‚РѕР±РѕР№ РґРІРµ РґРІРµСЂРё: РёР· РѕРґРЅРѕР№ СЃР»С‹С€РµРЅ СЃРјРµС…, Р·Р° РґСЂСѓРіРѕР№ С‚РёС€РёРЅР°. РљСѓРґР° Р±РµР·РѕРїР°СЃРЅРµРµ?", o: ["Р’ С‚РёС…СѓСЋ РґРІРµСЂСЊ", "Рљ СЃРјРµС…Сѓ", "РћСЃС‚Р°С‚СЊСЃСЏ РјРµР¶РґСѓ РґРІРµСЂСЏРјРё", "РЎС‚СѓС‡Р°С‚СЊ РІ РѕР±Рµ"], a: 0 },
  { q: "Р¤Р°СЂС„РѕСЂРѕРІР°СЏ РєСѓРєР»Р° РїРѕСЏРІРёР»Р°СЃСЊ СЂСЏРґРѕРј. Р§С‚Рѕ РІР°Р¶РЅРµРµ?", o: ["РќРµ С‚РµСЂСЏС‚СЊ РµС‘ РёР· РІРёРґР°", "РЎСЂР°Р·Сѓ СЃРµСЃС‚СЊ Р·Р° РїР°СЂС‚Сѓ", "Р‘СЂРѕСЃРёС‚СЊ Р°РїС‚РµС‡РєСѓ", "РћС‚РєСЂС‹С‚СЊ СЂСЋРєР·Р°Рє"], a: 0 },
  { q: "РќР° РїРѕР»Сѓ Р»РµР¶РёС‚ РёРіСЂСѓС€РєР°-РїСЂРёРјР°РЅРєР°. РљРѕРіРґР° РµС‘ Р»СѓС‡С€Рµ Р±СЂРѕСЃРёС‚СЊ?", o: ["Р§С‚РѕР±С‹ РѕС‚РІР»РµС‡СЊ РєСѓРєР»Сѓ", "РљРѕРіРґР° СЂСЏРґРѕРј РЅРёРєРѕРіРѕ РЅРµС‚", "РџРѕСЃР»Рµ РїРѕР±РµРґС‹", "РџРµСЂРµРґ С‡С‚РµРЅРёРµРј Р·Р°РїРёСЃРєРё"], a: 0 },
];
const toQuestion = (item: { q: string; o: string[]; a: number }): AiQuestion => ({
  question: item.q,
  options: item.o as [string, string, string, string],
  answer: item.a,
});
let lastLocalQuizIndex = -1;
const pickLocalQuiz = () => {
  let index = Math.floor(Math.random() * QUIZ_POOL.length);
  if (QUIZ_POOL.length > 1 && index === lastLocalQuizIndex) index = (index + 1) % QUIZ_POOL.length;
  lastLocalQuizIndex = index;
  return toQuestion(QUIZ_POOL[index]);
};
const pickLocalRiddle = () => {
  const item = bossRiddles[Math.floor(Math.random() * bossRiddles.length)];
  return {
    question: item.question,
    options: item.options as [string, string, string, string],
    answer: item.answer,
  };
};

function useGeneratedQuestion(args: {
  kind: "quiz" | "riddle";
  levelName: string;
  dollName?: string;
  fallback: AiQuestion;
}) {
  const [item, setItem] = useState<AiQuestion>(args.fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setItem(args.fallback);
    generateAiQuestion({
      data: {
        kind: args.kind,
        levelName: args.levelName,
        dollName: args.dollName,
      },
    }).then(({ question }) => {
      if (alive && question) setItem(question);
    }).catch(() => {
      // Local questions keep the game playable without Gemini.
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [args.kind, args.levelName, args.dollName, args.fallback]);

  return { item, loading };
}

function QuizGame({ onDone, levelName, dollName }: { onDone: (ok: boolean) => void; levelName: string; dollName: string }) {
  const fallback = useMemo(() => pickLocalQuiz(), []);
  const { item, loading } = useGeneratedQuestion({ kind: "quiz", levelName, dollName, fallback });
  const [tries, setTries] = useState(3);
  const pick = (i: number) => {
    if (i === item.answer) onDone(true);
    else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onDone(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-4 max-w-md">
      <p className="text-sm text-muted-foreground">{loading ? "Р“РѕС‚РѕРІРёРј РІРѕРїСЂРѕСЃ..." : "РџСЂРѕСЃС‚РѕР№ РІРѕРїСЂРѕСЃ."} РџРѕРїС‹С‚РєРё: {tries}</p>
      <h3 className="text-lg font-display text-center">{item.question}</h3>
      <div className="grid grid-cols-2 gap-2 w-full">
        {item.options.map((o, i) => (
          <Button key={i} variant="secondary" onClick={() => pick(i)}>{o}</Button>
        ))}
      </div>
    </div>
  );
}

function BossRiddleGate({ onDone, levelName }: { onDone: (ok: boolean) => void; levelName: string }) {
  const fallback = useMemo(() => pickLocalRiddle(), []);
  const { item, loading } = useGeneratedQuestion({ kind: "riddle", levelName, dollName: "The Porcelain Matron", fallback });
  const [tries, setTries] = useState(3);
  const pick = (i: number) => {
    if (i === item.answer) onDone(true);
    else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onDone(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
      <Impostor size={90} />
      <div>
        <h3 className="font-display text-lg text-red-400">Р—Р°РіР°РґРєР° РњР°С‚СЂРѕРЅС‹</h3>
        <p className="text-xs text-muted-foreground">{loading ? "РљСѓРєР»Р° СЃР»СѓС€Р°РµС‚..." : `РћС‚РІРµС‚СЊ, С‡С‚РѕР±С‹ РїСЂРѕР№С‚Рё Рє С„РёРЅР°Р»Сѓ. РџРѕРїС‹С‚РєРё: ${tries}`}</p>
      </div>
      <h4 className="text-base font-display text-amber-100">{item.question}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {item.options.map((o, i) => (
          <Button key={i} variant="secondary" onClick={() => pick(i)}>{o}</Button>
        ))}
      </div>
    </div>
  );
}

function BossEncounter({ onWin, onLose, levelName }: { onWin: () => void; onLose: () => void; levelName: string }) {
  const [riddleSolved, setRiddleSolved] = useState(false);
  if (riddleSolved) return <BossFight onWin={onWin} onLose={onLose} />;
  return <BossRiddleGate levelName={levelName} onDone={(ok) => ok ? setRiddleSolved(true) : onLose()} />;
}

// 9) LOCK вЂ” find code from hints
function LockGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const target = useMemo(() => Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)), []);
  const [dials, setDials] = useState([0, 0, 0]);
  useEffect(() => {
    if (dials.every((d, i) => d === target[i])) setTimeout(() => onDone(true), 300);
  }, [dials, target, onDone]);
  const hints = [
    `Sum of digits = ${target.reduce((a, b) => a + b, 0)}`,
    `First digit is ${target[0] % 2 === 0 ? "even" : "odd"}`,
    `Last digit = ${target[2]}`,
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Guess the code from the hints:</p>
      <ul className="text-xs text-amber-300 list-disc list-inside">
        {hints.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
      <div className="flex gap-3 bg-black/60 p-4 rounded border-2 border-amber-700">
        {dials.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button onClick={() => setDials(p => p.map((v, j) => j === i ? (v + 1) % 10 : v))}
              className="text-amber-300 hover:text-amber-100 text-xl">в–І</button>
            <div className="w-12 h-14 bg-zinc-900 border border-amber-600 rounded flex items-center justify-center text-3xl font-mono text-amber-200">
              {d}
            </div>
            <button onClick={() => setDials(p => p.map((v, j) => j === i ? (v + 9) % 10 : v))}
              className="text-amber-300 hover:text-amber-100 text-xl">в–ј</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 10) AIM вЂ” click 5 targets fast
function AimGame({ onDone }: { onDone: (ok: boolean) => void }) {
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [time, setTime] = useState(16);
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
    if (n >= 3) onDone(true); else respawn();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">РќР°Р¶РјРё 3 С†РµР»Рё. РћСЃС‚Р°Р»РѕСЃСЊ: <b className="text-red-400">{time}s</b></p>
      <div className="relative w-80 h-64 bg-black/70 rounded border-2 border-red-500/50 overflow-hidden">
        <button onClick={hit}
          className="absolute w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 border-2 border-red-200 transition-all"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
          <Target className="h-5 w-5 mx-auto text-white" />
        </button>
      </div>
      <p className="font-mono text-primary">РџРѕРїР°РґР°РЅРёСЏ: {hits}/3</p>
    </div>
  );
}

// ============== TASK ICONS ==============
function TaskIcon({ kind, className = "" }: { kind: TaskKind; className?: string }) {
  const map: Record<TaskKind, typeof Zap> = {
    wires: Zap, download: Download, reactor: Flame,
    trash: Trash2, switches: ToggleRight,
    quiz: HelpCircle, aim: Target,
  };
  const I = map[kind];
  return <I className={className} />;
}

function monsterBehaviorLabel(kind: ToyMonsterKind) {
  if (kind === "bear") return "РїР»СЋС€РµРІС‹Р№ РјРµРґРІРµРґСЊ вЂ” РјРµРґР»РµРЅРЅРѕ РїСЂРµСЃР»РµРґСѓРµС‚";
  if (kind === "porcelain") return "Р±Р°Р»РµСЂРёРЅР° Р±РµР· РЅРѕРі вЂ” РїРѕР»Р·С‘С‚ Рё РёСЃС‡РµР·Р°РµС‚";
  if (kind === "monkey") return "Р·Р°РІРѕРґРЅР°СЏ РѕР±РµР·СЊСЏРЅР° вЂ” СЂРµР°РіРёСЂСѓРµС‚ РЅР° С€СѓРј";
  if (kind === "clown") return "РєР»РѕСѓРЅ-РјР°СЂРёРѕРЅРµС‚РєР° вЂ” Р±С‹СЃС‚СЂРѕ РґРѕРіРѕРЅСЏРµС‚";
  return "РєСѓРєР»Р° вЂ” Р±СЂРѕРґРёС‚ СЂСЏРґРѕРј";
}

function ToyMonster({ kind, size = 80, facing = -1, hurt = false, boss = false }:
  { kind: ToyMonsterKind; size?: number; facing?: 1 | -1; hurt?: boolean; boss?: boolean }) {
  const W = boss ? 34 : 28;
  const H = boss ? 44 : 34;
  const renderW = Math.round((size * W) / H);
  const filter = hurt
    ? "brightness(2) saturate(2) hue-rotate(-20deg)"
    : boss
      ? "drop-shadow(0 0 12px rgba(255,60,80,0.7))"
      : "drop-shadow(0 5px 4px rgba(0,0,0,0.55))";

  const colors = {
    bear: { a: "#8a6842", b: "#3b2818", c: "#c49a6c", e: "#ff1a1a" },
    porcelain: { a: "#d8d1c8", b: "#9b8790", c: "#b06f88", e: "#1a0508" },
    monkey: { a: "#7b4b24", b: "#2b1a10", c: "#caa36a", e: "#ff2323" },
    clown: { a: "#e3ded5", b: "#5b3340", c: "#1d314f", e: "#090609" },
    puppet: { a: "#4a7a38", b: "#243b1b", c: "#6aa050", e: "#ff1818" },
  }[kind];
  const grime = kind === "porcelain" ? "#1b1214" : "#120b08";
  const red = "#8f121c";

  return (
    <svg
      width={renderW}
      height={size}
      viewBox={`0 0 ${W} ${H}`}
      style={{ transform: `scaleX(${facing})`, imageRendering: "pixelated", shapeRendering: "crispEdges", filter }}
    >
      <ellipse cx={W / 2} cy={H - 0.5} rx={W / 2.5} ry="0.8" fill="#000" opacity="0.48" />
      {kind === "bear" && (
        <>
          <rect x="5" y="4" width="6" height="6" fill={colors.b} />
          <rect x="6" y="5" width="4" height="4" fill={colors.a} />
          <rect x="18" y="3" width="6" height="7" fill={colors.b} />
          <rect x="19" y="4" width="4" height="5" fill={colors.a} />
          <rect x="4" y="8" width="21" height="15" fill={colors.a} />
          <rect x="6" y="10" width="17" height="11" fill="#9b7448" opacity="0.75" />
          <rect x="7" y="12" width="5" height="5" fill="#050303" />
          <rect x="8" y="13" width="3" height="1" fill="#6a5a54" />
          <rect x="9" y="12" width="1" height="5" fill="#6a5a54" />
          <rect x="17" y="12" width="4" height="4" fill="#1a0306" />
          <rect x="18" y="13" width="2" height="2" fill={colors.e} />
          <rect x="13" y="15" width="3" height="3" fill="#160d09" />
          <rect x="10" y="20" width="10" height="1" fill="#1a0306" />
          <rect x="11" y="21" width="1" height="1" fill={red} />
          <rect x="14" y="21" width="1" height="1" fill={red} />
          <rect x="18" y="21" width="1" height="1" fill={red} />
          <rect x="5" y="23" width="18" height="9" fill={colors.a} />
          <rect x="10" y="24" width="8" height="6" fill={colors.c} />
          <rect x="2" y="23" width="5" height="8" fill={colors.b} />
          <rect x="22" y="23" width="5" height="8" fill={colors.b} />
          <rect x="1" y="30" width="3" height="2" fill={colors.a} />
          <rect x="25" y="30" width="3" height="2" fill={colors.a} />
          <rect x="7" y="32" width="6" height="2" fill={colors.b} />
          <rect x="16" y="32" width="6" height="2" fill={colors.b} />
          <rect x="12" y="25" width="1" height="5" fill={grime} opacity="0.75" />
          <rect x="17" y="27" width="3" height="1" fill={grime} opacity="0.8" />
          <rect x="5" y="18" width="3" height="1" fill={red} opacity="0.6" />
          <rect x="21" y="6" width="1" height="3" fill="#090604" />
        </>
      )}
      {kind === "porcelain" && (
        <>
          <rect x={boss ? 9 : 8} y={boss ? 2 : 4} width={boss ? 16 : 13} height={boss ? 14 : 12} fill={colors.a} />
          <rect x={boss ? 7 : 6} y={boss ? 1 : 3} width={boss ? 20 : 17} height="4" fill="#151015" />
          <rect x={boss ? 10 : 9} y={boss ? 7 : 8} width="4" height="4" fill="#090609" />
          <rect x={boss ? 20 : 17} y={boss ? 7 : 8} width="4" height="4" fill={colors.e} />
          <rect x={boss ? 15 : 13} y={boss ? 13 : 14} width="6" height="1" fill="#27050a" />
          <rect x={boss ? 12 : 10} y={boss ? 17 : 17} width={boss ? 12 : 9} height={boss ? 7 : 6} fill={colors.c} />
          <rect x={boss ? 8 : 7} y={boss ? 22 : 22} width={boss ? 20 : 15} height="5" fill="#b5758e" />
          <rect x={boss ? 5 : 4} y={boss ? 25 : 25} width={boss ? 24 : 19} height="2" fill="#d59ab2" />
          <rect x={boss ? 6 : 5} y={boss ? 27 : 27} width={boss ? 22 : 17} height="3" fill="#2b121d" />
          <rect x={boss ? 2 : 2} y={boss ? 23 : 22} width={boss ? 10 : 8} height="4" fill={colors.a} />
          <rect x={boss ? 0 : 0} y={boss ? 27 : 26} width={boss ? 10 : 8} height="3" fill={colors.a} />
          <rect x={boss ? 22 : 19} y={boss ? 22 : 22} width={boss ? 10 : 8} height="4" fill={colors.a} />
          <rect x={boss ? 25 : 22} y={boss ? 26 : 26} width={boss ? 8 : 6} height="3" fill={colors.a} />
          <rect x={boss ? 8 : 7} y={boss ? 30 : 30} width={boss ? 18 : 15} height="3" fill="#1a0a10" />
          <rect x={boss ? 10 : 9} y={boss ? 33 : 32} width={boss ? 13 : 10} height={boss ? 3 : 2} fill="#10070b" />
          {boss && <rect x="15" y="0" width="5" height="4" fill="#b30f2a" />}
          <rect x={boss ? 13 : 11} y={boss ? 5 : 6} width="1" height="6" fill={grime} />
          <rect x={boss ? 14 : 12} y={boss ? 10 : 11} width="2" height="1" fill={grime} />
          <rect x={boss ? 22 : 18} y={boss ? 5 : 6} width="1" height="8" fill={grime} opacity="0.8" />
          <rect x={boss ? 16 : 13} y={boss ? 18 : 18} width="1" height="8" fill="#090609" opacity="0.7" />
          <rect x={boss ? 18 : 15} y={boss ? 28 : 27} width="3" height="1" fill={red} opacity="0.75" />
        </>
      )}
      {kind === "monkey" && (
        <>
          <rect x="6" y="8" width="16" height="13" fill={colors.a} />
          <rect x="3" y="10" width="5" height="7" fill={colors.b} />
          <rect x="20" y="10" width="5" height="7" fill={colors.b} />
          <rect x="8" y="11" width="5" height="5" fill="#140807" />
          <rect x="15" y="11" width="5" height="5" fill="#140807" />
          <rect x="10" y="13" width="2" height="2" fill={colors.e} />
          <rect x="17" y="13" width="2" height="2" fill={colors.e} />
          <rect x="10" y="16" width="8" height="4" fill={colors.c} />
          <rect x="9" y="21" width="10" height="9" fill={colors.b} />
          <rect x="4" y="22" width="5" height="4" fill={colors.c} />
          <rect x="19" y="22" width="5" height="4" fill={colors.c} />
          <rect x="6" y="3" width="16" height="3" fill="#b5a15a" />
          <rect x="22" y="4" width="4" height="2" fill="#b5a15a" />
          <rect x="23" y="6" width="2" height="6" fill="#9f8846" />
          <rect x="25" y="6" width="4" height="2" fill="#9f8846" />
          <rect x="26" y="8" width="2" height="4" fill="#9f8846" />
          <rect x="12" y="30" width="3" height="4" fill={colors.a} />
          <rect x="17" y="30" width="3" height="4" fill={colors.a} />
          <rect x="10" y="18" width="8" height="1" fill="#f2d6a0" />
          <rect x="11" y="19" width="1" height="1" fill="#0a0504" />
          <rect x="13" y="19" width="1" height="1" fill="#0a0504" />
          <rect x="15" y="19" width="1" height="1" fill="#0a0504" />
          <rect x="17" y="19" width="1" height="1" fill="#0a0504" />
          <rect x="6" y="27" width="3" height="1" fill={red} opacity="0.75" />
        </>
      )}
      {kind === "clown" && (
        <>
          <rect x="6" y="0" width="1" height="34" fill="#5b3928" opacity="0.75" />
          <rect x="13" y="0" width="1" height="34" fill="#5b3928" opacity="0.65" />
          <rect x="22" y="0" width="1" height="34" fill="#5b3928" opacity="0.75" />
          <rect x="5" y="5" width="5" height="6" fill="#7a161e" />
          <rect x="18" y="5" width="5" height="6" fill="#7a161e" />
          <rect x="7" y="6" width="14" height="13" fill={colors.a} />
          <rect x="9" y="11" width="3" height="4" fill={colors.e} />
          <rect x="16" y="11" width="3" height="4" fill={colors.e} />
          <rect x="13" y="14" width="3" height="3" fill="#b40022" />
          <rect x="8" y="18" width="13" height="2" fill="#5b0408" />
          <rect x="9" y="20" width="2" height="1" fill="#f2eee3" />
          <rect x="13" y="20" width="2" height="1" fill="#f2eee3" />
          <rect x="17" y="20" width="2" height="1" fill="#f2eee3" />
          <rect x="5" y="21" width="18" height="3" fill="#d8c8b5" />
          <rect x="7" y="24" width="14" height="9" fill={colors.c} />
          <rect x="11" y="24" width="5" height="9" fill="#6b2432" />
          <rect x="1" y="23" width="5" height="9" fill="#182944" />
          <rect x="22" y="23" width="5" height="9" fill="#6b2432" />
          <rect x="0" y="31" width="4" height="2" fill="#d8d0c8" />
          <rect x="25" y="31" width="3" height="2" fill="#d8d0c8" />
          <rect x="8" y="33" width="5" height="1" fill="#111" />
          <rect x="16" y="33" width="5" height="1" fill="#111" />
          <rect x="10" y="8" width="2" height="1" fill={grime} />
          <rect x="17" y="9" width="2" height="1" fill={grime} />
        </>
      )}
      {kind === "puppet" && (
        <>
          <rect x="8" y="5" width="12" height="14" fill={colors.a} />
          <rect x="10" y="10" width="3" height="3" fill="#0a0a0a" />
          <rect x="16" y="10" width="3" height="3" fill={colors.e} />
          <rect x="11" y="16" width="7" height="1" fill="#220509" />
          <rect x="7" y="20" width="14" height="10" fill={colors.b} />
          <rect x="3" y="21" width="4" height="8" fill={colors.a} />
          <rect x="21" y="21" width="4" height="8" fill={colors.a} />
          <rect x="9" y="30" width="4" height="4" fill={colors.b} />
          <rect x="16" y="30" width="4" height="4" fill={colors.b} />
          <rect x="7" y="3" width="14" height="1" fill="#111" opacity="0.8" />
          <rect x="5" y="8" width="1" height="20" fill="#111" opacity="0.65" />
          <rect x="23" y="8" width="1" height="20" fill="#111" opacity="0.65" />
          <rect x="11" y="20" width="2" height="1" fill={red} />
        </>
      )}
    </svg>
  );
}

function ScaryMenuScene() {
  // Atmospheric hero for the main menu: Lana scared in the middle,
  // Karl & Dina slightly distorted to the sides, with toy-monsters looming in
  // the background behind translucent puppet strings вЂ” "manipulating" the kids.
  return (
    <div className="scary-menu-scene">
      <div className="scary-menu-vignette" />
      <div className="scary-menu-fog" />
      <div className="scary-menu-title">
        <div className="scary-menu-title-main">WELCOME BACK TO SCHOOL</div>
        <div className="scary-menu-title-sub">РѕРЅРё РІСЃС‘ РµС‰С‘ Р¶РґСѓС‚ РґРµС‚РµР№вЂ¦</div>
      </div>

      {/* Background monsters вЂ” large, dim, looming, with puppet strings */}
      <div className="scary-bg-monsters">
        <div className="scary-bg-monster scary-bg-bear">
          <MenuArtMonster kind="bear" size={210} />
        </div>
        <div className="scary-bg-monster scary-bg-clown">
          <MenuArtMonster kind="clown" size={220} />
        </div>
        <div className="scary-bg-monster scary-bg-monkey">
          <MenuArtMonster kind="monkey" size={170} />
        </div>
        {/* Puppet strings reaching down toward the children */}
        <svg className="scary-puppet-strings" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden>
          <g stroke="#d8c8a8" strokeWidth="0.6" opacity="0.55">
            <line x1="180" y1="0" x2="260" y2="320" />
            <line x1="220" y1="0" x2="280" y2="320" />
            <line x1="500" y1="0" x2="500" y2="300" />
            <line x1="520" y1="0" x2="520" y2="300" />
            <line x1="780" y1="0" x2="720" y2="320" />
            <line x1="820" y1="0" x2="740" y2="320" />
          </g>
        </svg>
      </div>

      {/* Foreground children */}
      <div className="scary-menu-kids">
        <div className="scary-menu-kid scary-menu-karl">
          <MenuArtCharacter kind="karl" size={165} facing={1} motion="scared" />
          <div className="scary-menu-label">РљРђР Р›</div>
        </div>
        <div className="scary-menu-kid scary-menu-lana">
          <MenuArtCharacter kind="lana" size={190} facing={1} scared motion="scared" />
          <div className="scary-menu-label scary-menu-label-main">Р›РђРќРђ</div>
        </div>
        <div className="scary-menu-kid scary-menu-dina">
          <MenuArtCharacter kind="dina" size={165} facing={-1} motion="scared" />
          <div className="scary-menu-label">Р”РРќРђ</div>
        </div>
      </div>

      <div className="scary-menu-floor" />
    </div>
  );
}

function CharacterDesignBoard() {
  const monsters: { kind: ToyMonsterKind; title: string; note: string; size: number; boss?: boolean }[] = [
    { kind: "bear", title: "1. PLUSH BEAR", note: "slow stalker", size: 118 },
    { kind: "porcelain", title: "2. PORCELAIN DOLL", note: "appears behind you", size: 118 },
    { kind: "monkey", title: "3. CLOCKWORK MONKEY", note: "runs to noise", size: 108 },
    { kind: "clown", title: "4. MARIONETTE CLOWN", note: "fast chase", size: 120 },
    { kind: "porcelain", title: "5. THE MATRON", note: "protects her family", size: 142, boss: true },
  ];
  const teens: { kind: TeenKind; title: string; note: string; size: number; facing?: 1 | -1 }[] = [
    { kind: "lana", title: "LANA", note: "scared, but stubborn", size: 112 },
    { kind: "karl", title: "KARL", note: "jokes when afraid", size: 112, facing: -1 },
    { kind: "dina", title: "DINA", note: "quiet and observant", size: 112 },
  ];

  return (
    <div className="character-design-board">
      <div className="design-board-title">DOLLS OF THE SCHOOL</div>
      <div className="design-board-subtitle">character and monster sprites</div>
      <div className="design-monster-grid">
        {monsters.map((m) => (
          <div key={m.title} className="design-panel">
            <div className="design-panel-title">{m.title}</div>
            <div className="design-sprite-stage">
              <MenuArtMonster kind={m.kind} size={m.size} boss={m.boss} />
            </div>
            <div className="design-panel-note">{m.note}</div>
          </div>
        ))}
      </div>
      <div className="design-teen-grid">
        {teens.map((t) => (
          <div key={t.title} className="design-panel design-panel-teen">
            <div className="design-panel-title">{t.title}</div>
            <div className="design-sprite-stage">
              <MenuArtCharacter kind={t.kind} size={t.kind === "lana" ? 145 : 125} facing={t.facing ?? 1} scared={t.kind === "lana"} />
            </div>
            <div className="design-panel-note">{t.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Mr. Hopp-style plush horror sprite ----
// Replaces the old pixel doll with a ragged plush rabbit-monster: long
// floppy ears, oversized round black button eyes with red pinpoint pupils,
// stitched mouth full of jagged teeth, torn fabric body.
function PixelDoll({ size = 80, facing = -1, hurt = false, boss = false }:
  { size?: number; facing?: 1 | -1; hurt?: boolean; boss?: boolean }) {
  // Plush body palette вЂ” sickly rotted green for normal dolls, pink Mr Hopp plush for boss
  const FUR = boss ? "#e89cb4" : "#4a7a38";
  const FURD = boss ? "#a4607a" : "#2a4a1a";
  const FURL = boss ? "#f8c0d4" : "#6aa050";
  const BELLY = boss ? "#d488a4" : "#3a5028";
  const STITCH = "#1a1014";
  const EYE_W = boss ? "#1a0810" : "#0a0a0a";    // black button eye
  const PUPIL = "#ff1818";     // glowing red pupil
  const PUPIL_HOT = "#ffd0d0"; // hot center
  const TOOTH = boss ? "#f4ecd4" : "#d8d0b4";
  const MOUTH = "#3a0408";
  const W = boss ? 28 : 22;
  const H = boss ? 36 : 28;
  // viewBox-based hand-drawn SVG with pixel-perfect rendering
  return (
    <svg
      width={Math.round((size * W) / H)}
      height={size}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        transform: `scaleX(${facing})`,
        imageRendering: "pixelated",
        shapeRendering: "crispEdges",
        filter: hurt ? "brightness(2) saturate(2) hue-rotate(-20deg)" : (boss ? "drop-shadow(0 0 6px rgba(255,30,30,0.55))" : "none"),
      }}
    >
      {/* Long floppy ears */}
      <rect x={boss ? 5 : 3} y="0" width={boss ? 4 : 3} height={boss ? 13 : 10} fill={FUR} />
      <rect x={boss ? 5 : 3} y={boss ? 11 : 8} width={boss ? 4 : 3} height={2} fill={FURD} />
      <rect x={boss ? 19 : 16} y="0" width={boss ? 4 : 3} height={boss ? 13 : 10} fill={FUR} />
      <rect x={boss ? 19 : 16} y={boss ? 11 : 8} width={boss ? 4 : 3} height={2} fill={FURD} />
      {/* inner ear pink */}
      <rect x={boss ? 6 : 4} y="2" width={boss ? 2 : 1} height={boss ? 7 : 5} fill={boss ? "#c8587a" : "#2a3a18"} />
      <rect x={boss ? 20 : 17} y="2" width={boss ? 2 : 1} height={boss ? 7 : 5} fill={boss ? "#c8587a" : "#2a3a18"} />

      {/* Head вЂ” round plush */}
      <rect x={boss ? 4 : 2} y={boss ? 8 : 5} width={boss ? 20 : 18} height={boss ? 14 : 11} fill={FUR} />
      <rect x={boss ? 4 : 2} y={boss ? 8 : 5} width={boss ? 20 : 18} height={2} fill={FURL} />
      <rect x={boss ? 4 : 2} y={boss ? 20 : 14} width={boss ? 20 : 18} height={2} fill={FURD} />
      {/* Stitch seam across head */}
      <rect x={boss ? 13 : 11} y={boss ? 8 : 5} width="1" height={boss ? 14 : 11} fill={STITCH} opacity="0.7" />
      {/* Big round button EYES */}
      <rect x={boss ? 6 : 4} y={boss ? 12 : 8} width={boss ? 6 : 5} height={boss ? 5 : 4} fill={EYE_W} />
      <rect x={boss ? 16 : 13} y={boss ? 12 : 8} width={boss ? 6 : 5} height={boss ? 5 : 4} fill={EYE_W} />
      {/* white highlight on top-left of each eye */}
      <rect x={boss ? 7 : 5} y={boss ? 13 : 9} width="1" height="1" fill="#fff" opacity="0.6" />
      <rect x={boss ? 17 : 14} y={boss ? 13 : 9} width="1" height="1" fill="#fff" opacity="0.6" />
      {/* Red pinpoint pupils */}
      <rect x={boss ? 8 : 6} y={boss ? 14 : 10} width={boss ? 2 : 2} height={boss ? 2 : 1} fill={PUPIL} />
      <rect x={boss ? 18 : 15} y={boss ? 14 : 10} width={boss ? 2 : 2} height={boss ? 2 : 1} fill={PUPIL} />
      <rect x={boss ? 8 : 6} y={boss ? 14 : 10} width="1" height="1" fill={PUPIL_HOT} />
      <rect x={boss ? 18 : 15} y={boss ? 14 : 10} width="1" height="1" fill={PUPIL_HOT} />
      {/* Third eye on boss forehead */}
      {boss && (
        <>
          <rect x="13" y="9" width="3" height="3" fill={EYE_W} />
          <rect x="14" y="10" width="1" height="1" fill={PUPIL} />
        </>
      )}
      {/* Stitched MOUTH with jagged teeth */}
      <rect x={boss ? 8 : 6} y={boss ? 18 : 13} width={boss ? 12 : 10} height={boss ? 2 : 1} fill={MOUTH} />
      {[0,1,2,3,4].map(i => (
        <rect key={`t-${i}`} x={(boss ? 9 : 7) + i * 2} y={boss ? 18 : 13} width="1" height="1" fill={TOOTH} />
      ))}
      {/* mouth stitch lines */}
      <rect x={boss ? 8 : 6} y={boss ? 20 : 14} width="1" height="1" fill={STITCH} />
      <rect x={boss ? 19 : 15} y={boss ? 20 : 14} width="1" height="1" fill={STITCH} />
      {/* Body вЂ” torn plush torso */}
      <rect x={boss ? 6 : 4} y={boss ? 22 : 16} width={boss ? 16 : 14} height={boss ? 9 : 7} fill={FUR} />
      {/* belly patch */}
      <rect x={boss ? 9 : 7} y={boss ? 23 : 17} width={boss ? 10 : 8} height={boss ? 7 : 5} fill={BELLY} />
      {/* stitches down belly */}
      <rect x={boss ? 14 : 11} y={boss ? 22 : 16} width="1" height={boss ? 9 : 7} fill={STITCH} opacity="0.7" />
      {/* blood drips from mouth */}
      <rect x={boss ? 11 : 9} y={boss ? 21 : 14} width="1" height={boss ? 3 : 2} fill="#7a0808" />
      <rect x={boss ? 16 : 13} y={boss ? 21 : 14} width="1" height={boss ? 4 : 3} fill="#7a0808" />
      {/* Arms hanging long */}
      <rect x={boss ? 3 : 1} y={boss ? 23 : 17} width="3" height={boss ? 7 : 5} fill={FUR} />
      <rect x={boss ? 22 : 19} y={boss ? 23 : 17} width="3" height={boss ? 7 : 5} fill={FUR} />
      {/* claws */}
      <rect x={boss ? 3 : 1} y={boss ? 29 : 21} width="1" height="1" fill="#1a0408" />
      <rect x={boss ? 5 : 3} y={boss ? 29 : 21} width="1" height="1" fill="#1a0408" />
      <rect x={boss ? 22 : 19} y={boss ? 29 : 21} width="1" height="1" fill="#1a0408" />
      <rect x={boss ? 24 : 21} y={boss ? 29 : 21} width="1" height="1" fill="#1a0408" />
      {/* Legs / nubs */}
      <rect x={boss ? 8 : 6} y={boss ? 31 : 22} width={boss ? 4 : 4} height={boss ? 5 : 4} fill={FURD} />
      <rect x={boss ? 16 : 12} y={boss ? 31 : 22} width={boss ? 4 : 4} height={boss ? 5 : 4} fill={FURD} />
      {/* tear patches on body */}
      <rect x={boss ? 7 : 5} y={boss ? 26 : 19} width="2" height="1" fill={STITCH} opacity="0.5" />
      {/* shadow */}
      <ellipse cx={W/2} cy={H - 0.3} rx={W/2.4} ry="0.6" fill="#000" opacity="0.5" />
    </svg>
  );
}


// ============== BOSS ARENA вЂ” bat-vs-Hopp combat ==============
function BossFight({ onWin, onLose }: { onWin: () => void; onLose: () => void }) {
  const ARENA_W = 720;
  const ARENA_H = 360;
  const FLOOR_PX = 60;
  const [bossHp, setBossHp] = useState(10);
  const [lanaHp, setLanaHp] = useState(100);
  const [lanaX, setLanaX] = useState(100);
  const lanaXRef = useRef(100); lanaXRef.current = lanaX;
  const [lanaY, setLanaY] = useState(0);
  const jumpV = useRef(0);
  const jumpY = useRef(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const bossX = 580;
  const [bossY, setBossY] = useState(0);
  const bossYRef = useRef(0);
  const [hasBat, setHasBat] = useState(false);
  const hasBatRef = useRef(false); hasBatRef.current = hasBat;
  const [batSpawn, setBatSpawn] = useState<{ x: number } | null>({ x: 240 });
  const batSpawnRef = useRef<{x:number}|null>({ x: 240 }); batSpawnRef.current = batSpawn;
  const [debris, setDebris] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shake, setShake] = useState(false);
  const [bossHurt, setBossHurt] = useState(false);
  const bossInvul = useRef(0);
  const lanaInvul = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const phase = useRef<{ k: "idle"|"jump"|"land"; t: number }>({ k: "idle", t: 0 });
  const debrisId = useRef(0);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if ((k === " " || k === "w" || k === "arrowup" || k === "С†") && jumpY.current === 0 && jumpV.current === 0) {
        jumpV.current = -11;
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    let raf = 0; let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(50, now - last); last = now;
      // movement
      let dx = 0;
      if (keys.current["a"] || keys.current["arrowleft"] || keys.current["С„"]) { dx -= 1; setFacing(-1); }
      if (keys.current["d"] || keys.current["arrowright"] || keys.current["РІ"]) { dx += 1; setFacing(1); }
      if (dx) setLanaX(p => clamp(p + dx * 4.2, 30, ARENA_W - 60));
      // gravity
      if (jumpV.current !== 0 || jumpY.current > 0) {
        jumpV.current += 0.7;
        jumpY.current = Math.max(0, jumpY.current - jumpV.current);
        if (jumpY.current === 0) jumpV.current = 0;
        setLanaY(jumpY.current);
      }
      // boss AI
      const ph = phase.current; ph.t += dt;
      if (ph.k === "idle" && ph.t > 1800) { ph.k = "jump"; ph.t = 0; sfxGrowl(); }
      else if (ph.k === "jump") {
        const p = Math.min(1, ph.t / 1100);
        const yy = Math.sin(p * Math.PI) * 130;
        bossYRef.current = yy; setBossY(yy);
        if (p >= 1) {
          ph.k = "land"; ph.t = 0; bossYRef.current = 0; setBossY(0);
          sfxBoom(); setShake(true); setTimeout(() => setShake(false), 600);
          const nd = Array.from({ length: 4 }, () => ({ id: ++debrisId.current, x: 80 + Math.random() * (ARENA_W - 160), y: 0 }));
          setDebris(d => [...d, ...nd]);
          if (!hasBatRef.current && !batSpawnRef.current) {
            setBatSpawn({ x: 120 + Math.random() * (ARENA_W - 280) });
          }
        }
      } else if (ph.k === "land" && ph.t > 1400) { ph.k = "idle"; ph.t = 0; }
      // debris fall + hit detection
      setDebris(prev => prev.map(d => ({ ...d, y: d.y + 7 })).filter(d => {
        if (d.y >= ARENA_H - FLOOR_PX - 20) {
          if (Math.abs(d.x - lanaXRef.current) < 22 && jumpY.current < 20 && now - lanaInvul.current > 600) {
            lanaInvul.current = now; sfxBite();
            setLanaHp(h => { const nh = Math.max(0, h - 12); if (nh === 0) { sfxDeath(); setTimeout(onLose, 200); } return nh; });
          }
          return false;
        }
        return true;
      }));
      // pickup bat
      if (batSpawnRef.current && Math.abs(batSpawnRef.current.x - lanaXRef.current) < 28 && jumpY.current < 18) {
        sfxPickup(); setHasBat(true); setBatSpawn(null);
      }
      // hit boss
      if (hasBatRef.current && now - bossInvul.current > 700) {
        if (Math.abs(bossX - lanaXRef.current) < 70 && bossYRef.current < 30) {
          bossInvul.current = now; sfxSwing(); sfxBat();
          setHasBat(false); setBossHurt(true); setTimeout(() => setBossHurt(false), 350);
          setBossHp(h => { const nh = h - 1; if (nh <= 0) { sfxKill(); setTimeout(onWin, 400); } return nh; });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onWin, onLose]);

  return (
    <div className="flex flex-col items-center gap-2 max-w-full">
      <div className="flex items-center justify-between w-full px-2">
        <div className="font-display text-red-400">THE PORCELAIN MATRON вЂ” BOSS</div>
        <div className="flex gap-0.5">{Array.from({ length: 10 }).map((_, i) => (
          <Heart key={i} className={`h-4 w-4 ${i < bossHp ? "fill-red-500 text-red-500" : "text-zinc-700"}`} />
        ))}</div>
      </div>
      <div className={`relative overflow-hidden border-2 border-red-700 bg-[#0a0410] ${shake ? "shake" : ""}`}
        style={{ width: ARENA_W, height: ARENA_H, maxWidth: "100%" }}>
        <div className="absolute inset-x-0 top-0" style={{ height: ARENA_H - FLOOR_PX, background: "linear-gradient(180deg,#1a0510 0%,#0a0410 70%)" }} />
        <div className="absolute left-0 right-0 bottom-0" style={{ height: FLOOR_PX, background: "repeating-linear-gradient(90deg,#5a3a1a 0 50px,#3a2410 50px 100px)", boxShadow: "inset 0 4px 0 #0a0606" }} />
        <div className="absolute top-2 right-2 text-[10px] font-pixel text-amber-300/60">GYM</div>
        {/* Boss */}
        <div className="absolute" style={{ left: bossX - 100, bottom: FLOOR_PX + bossY - 6 }}>
          <div style={{ filter: bossHurt ? "brightness(2.5) hue-rotate(-40deg)" : "drop-shadow(0 0 10px rgba(255,0,0,0.6))" }}>
            <MenuArtMonster kind="porcelain" size={220} boss facing={lanaXRef.current > bossX ? 1 : -1} />
          </div>
        </div>
        {/* Debris */}
        {debris.map(d => (
          <div key={d.id} className="absolute" style={{ left: d.x - 10, top: d.y, width: 22, height: 14, background: "linear-gradient(180deg,#8a5a2a,#3a1a08)", boxShadow: "inset -2px -2px 0 #1a0a04, 0 0 4px rgba(0,0,0,0.8)", transform: `rotate(${(d.id * 37) % 360}deg)` }} />
        ))}
        {/* Glowing bat pickup */}
        {batSpawn && (
          <div className="absolute" style={{ left: batSpawn.x - 22, bottom: FLOOR_PX - 4, width: 44, height: 44 }}>
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: "radial-gradient(circle,#fff48a 0%,rgba(255,200,40,0.6) 35%,transparent 70%)", filter: "blur(3px)" }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl" style={{ filter: "drop-shadow(0 0 8px #ffec8a)" }}>рџЏЏ</div>
          </div>
        )}
        {/* Lana */}
        <div className="absolute" style={{ left: lanaX - 28, bottom: FLOOR_PX - 6 + lanaY }}>
          <MenuArtCharacter kind="lana" facing={facing} size={150} scared={lanaHp < 35} motion={lanaHp < 35 ? "scared" : "idle"} />
          {hasBat && (
            <div className="absolute" style={{ top: 14, left: facing === 1 ? 36 : -14, fontSize: 24, transform: `scaleX(${facing}) rotate(${facing === 1 ? -28 : 28}deg)`, filter: "drop-shadow(0 0 8px #ffec8a)" }}>рџЏЏ</div>
          )}
        </div>
        {/* Lana HP */}
        <div className="absolute top-2 left-2 right-24 flex items-center gap-2 z-10">
          <span className="font-pixel text-[10px] text-rose-300">LANA</span>
          <div className="flex-1 h-3 bg-black/70 border border-rose-700 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-600 to-rose-400" style={{ width: `${lanaHp}%` }} />
          </div>
          <span className="font-mono text-[10px]">{lanaHp}</span>
        </div>
        <div className="absolute bottom-1 left-2 text-[9px] font-pixel text-amber-300/80 bg-black/70 px-2 py-0.5 rounded">
          A/D move В· SPACE jump В· grab bat then ram the doll В· dodge debris!
        </div>
      </div>
    </div>
  );
}

// ============== SCHOOL CORRIDOR (side-scroller) ==============
const SPEED = 3.5;
const VIEW_H = 520;
const REACH = 70;

// Р’СЂРµРјСЏ Р·Р°РґР°РЅРёСЏ limits (seconds). aim has its own timer.
const TIME_LIMITS: Record<TaskKind, number | null> = {
  wires: 50, download: 36, reactor: 44,
  trash: 36, switches: 36, quiz: 34, aim: null,
};

// Countdown above each task вЂ” calls onTimeout when 0.
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
        <span className={danger ? "text-red-400 animate-pulse" : "text-amber-300"}>вЏ± Р’СЂРµРјСЏ Р·Р°РґР°РЅРёСЏ</span>
        <span className={`font-mono ${danger ? "text-red-400" : "text-amber-200"}`}>{left.toFixed(1)}s</span>
      </div>
      <div className="h-2 bg-black/70 rounded overflow-hidden border border-amber-700/40">
        <div className={`h-full transition-[width] ${danger ? "bg-red-500" : "bg-gradient-to-r from-amber-400 to-red-500"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ====== РљСѓРєРѕР»СЊРЅР°СЏ СЂСѓРєР°, С‚СЏРЅСѓС‰Р°СЏСЃСЏ С‡РµСЂРµР· РѕРєРЅРѕ ======
function DollHand({ delay = 0 }: { delay?: number }) {
  return (
    <svg viewBox="0 0 40 70" width={40} height={70}
      style={{ animation: `lana-walk 1.8s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: "50% 0%" }}>
      {/* РїСЂРµРґРїР»РµС‡СЊРµ */}
      <rect x="14" y="20" width="12" height="38" fill="#d8c7b6" stroke="#4a342e" strokeWidth="1.5" />
      <rect x="14" y="30" width="12" height="3" fill="#8b6f63" opacity="0.55" />
      <rect x="14" y="45" width="12" height="3" fill="#8b6f63" opacity="0.45" />
      {/* С„Р°СЂС„РѕСЂРѕРІС‹Рµ С‚СЂРµС‰РёРЅС‹ */}
      <line x1="16" y1="25" x2="22" y2="35" stroke="#4a342e" strokeWidth="1.1" />
      <line x1="20" y1="40" x2="24" y2="50" stroke="#4a342e" strokeWidth="1.1" />
      {/* Р»Р°РґРѕРЅСЊ */}
      <rect x="12" y="6" width="16" height="16" fill="#ead9c8" stroke="#4a342e" strokeWidth="1.5" />
      {/* РїР°Р»СЊС†С‹ */}
      <rect x="11" y="0" width="3" height="10" fill="#ead9c8" stroke="#4a342e" strokeWidth="1" />
      <rect x="15" y="-2" width="3" height="12" fill="#ead9c8" stroke="#4a342e" strokeWidth="1" />
      <rect x="19" y="-2" width="3" height="12" fill="#ead9c8" stroke="#4a342e" strokeWidth="1" />
      <rect x="23" y="0" width="3" height="10" fill="#ead9c8" stroke="#4a342e" strokeWidth="1" />
      {/* РЅРѕРіС‚Рё */}
      <rect x="11" y="0" width="3" height="2" fill="#211818" />
      <rect x="15" y="-2" width="3" height="2" fill="#211818" />
      <rect x="19" y="-2" width="3" height="2" fill="#211818" />
      <rect x="23" y="0" width="3" height="2" fill="#211818" />
    </svg>
  );
}

// ====== РўРѕС‡РєР° РїРѕРёСЃРєР° РІ РєРѕРјРЅР°С‚Рµ ======
function SpotEl({ spot, taken, lit, active, hasKey, hasBat }:
  { spot: SearchSpot; taken: boolean; lit: boolean; active: boolean; hasKey?: boolean; hasBat?: boolean }) {
  const x = spot.x;
  let body: React.ReactNode = null;
  let labelTop = 0;
  if (spot.where === "desk") {
    // РїР°СЂС‚Р°
    body = (
      <div className="absolute" style={{ left: x - 50, bottom: 24, width: 100, height: 56 }}>
        <div className="absolute left-0 right-0 top-0 h-3 bg-[#8a6a3a] border-2 border-[#3a2a14]" />
        <div className="absolute left-2 top-3 bottom-0 w-3 bg-[#5a3a1a] border-2 border-[#1a0a00]" />
        <div className="absolute right-2 top-3 bottom-0 w-3 bg-[#5a3a1a] border-2 border-[#1a0a00]" />
        <div className="absolute left-12 top-1 w-5 h-2 bg-[#c9bfa8]" title="papers" />
      </div>
    );
    labelTop = 8;
  } else if (spot.where === "underDesk") {
    // РїРѕРґ РїР°СЂС‚РѕР№ вЂ” С‰РµР»СЊ
    body = (
      <div className="absolute" style={{ left: x - 50, bottom: 24, width: 100, height: 56 }}>
        <div className="absolute left-0 right-0 top-0 h-3 bg-[#7a5a2a] border-2 border-[#2a1a08]" />
        <div className="absolute left-2 top-3 bottom-0 w-3 bg-[#4a2a14] border-2 border-[#1a0a00]" />
        <div className="absolute right-2 top-3 bottom-0 w-3 bg-[#4a2a14] border-2 border-[#1a0a00]" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 text-[9px] font-pixel text-amber-200/70">в†“ under desk</div>
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
    <div
      className={`group ${taken ? "opacity-40" : ""}`}
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        {body}
        {/* РєР»РёРєР°Р±РµР»СЊРЅР°СЏ РїРѕРґСЃРІРµС‚РєР° Р·РѕРЅС‹ */}
        <div className="absolute" style={{ left: x - 50, bottom: 18, width: 100, height: 110 }}>
          <div className={`absolute inset-0 rounded transition ${
            active && !taken
              ? "border-2 border-emerald-300/90 bg-emerald-200/10 shadow-[0_0_22px_rgba(110,231,183,0.45)]"
              : "border border-amber-300/0"
          }`} />
        </div>
        {!taken && lit && (spot.item || hasKey || hasBat) && (
          <div
            className="absolute flex items-center justify-center animate-pulse pointer-events-none"
            style={{
              left: x - 24,
              bottom: 108 + labelTop,
              width: 48,
              height: 48,
              fontSize: 36,
              lineHeight: 1,
              textShadow: "0 0 10px rgba(255,220,120,0.95), 0 2px 4px rgba(0,0,0,0.9)",
              filter: "drop-shadow(0 0 6px rgba(255,200,80,0.8))",
            }}
            title={hasKey ? "Key" : hasBat ? "Bat" : spot.item?.name}
          >
            {hasKey ? "рџ—ќ" : hasBat ? "рџЏЏ" : spot.item!.emoji}
          </div>
        )}
        {!taken && (
          <div className={`absolute font-pixel text-[10px] rounded px-1 animate-pulse border ${lit ? "text-amber-200 bg-black/80 border-amber-400/50" : "text-zinc-400 bg-black/80 border-zinc-700"}`}
            style={{ left: x - 24, bottom: 160 + labelTop }}>
            {lit ? "рџ”Ќ search" : "???"}
          </div>
        )}
        {!taken && active && (
          <div className="absolute font-pixel text-[12px] rounded px-2 py-1 animate-pulse border text-emerald-100 bg-emerald-950/90 border-emerald-300/80 shadow-[0_0_18px_rgba(110,231,183,0.45)]"
            style={{ left: x - 34, bottom: 188 + labelTop }}>
            E РІР·СЏС‚СЊ
          </div>
        )}
        {taken && (spot.item || hasKey || hasBat) && (
          <div className="absolute font-pixel text-emerald-300 text-[13px]"
            style={{ left: x - 14, bottom: 135 + labelTop }}>
            вњ“ {hasKey ? "рџ—ќ" : hasBat ? "рџЏЏ" : spot.item!.emoji}
          </div>
        )}
        {taken && !spot.item && !hasKey && !hasBat && (
          <div className="absolute font-pixel text-zinc-500 text-[10px]"
            style={{ left: x - 14, bottom: 135 + labelTop }}>
            вњ— empty
          </div>
        )}
      </div>
    </div>
  );
}

// Р”РµС‚РµСЂРјРёРЅРёСЂРѕРІР°РЅРЅС‹Р№ РєРІРµСЃС‚ РґР»СЏ РєР»Р°СЃСЃР°: РѕРїСЂРµРґРµР»СЏРµС‚, РєР°РєР°СЏ С‚РѕС‡РєР° РїСЂСЏС‡РµС‚ РєР»СЋС‡.
// Р‘РёС‚Р° СЃРїР°РІРЅРёС‚СЃСЏ Р Р•Р”РљРћ вЂ” С‚РѕР»СЊРєРѕ РІ РѕРґРЅРѕРј РєР»Р°СЃСЃРµ РЅР° СЌС‚Р°Р¶ (РєР»Р°СЃСЃСѓ СЃ РЅР°РёРјРµРЅСЊС€РёРј x).
function getClassroomQuest(classroom: Classroom, levelId: number) {
  let h = 0;
  for (let i = 0; i < classroom.id.length; i++) h = (h * 31 + classroom.id.charCodeAt(i)) >>> 0;
  h = (h + levelId * 997) >>> 0;
  const n = classroom.spots.length;
  const keyIdx = h % n;
  // Р‘РёС‚Р° вЂ” С‚РѕР»СЊРєРѕ РІ РїРµСЂРІРѕРј РєР»Р°СЃСЃРµ СѓСЂРѕРІРЅСЏ (РѕРґРёРЅ РЅР° СЌС‚Р°Р¶)
  const lvl = levels.find(l => l.id === levelId);
  const isBatClass = !!lvl && lvl.classrooms[0]?.id === classroom.id;
  let batIdx = isBatClass ? ((h * 7 + 3) % n) : -1;
  if (batIdx === keyIdx) batIdx = (batIdx + 1) % n;
  return { keyIdx, batIdx, hasBat: isBatClass };
}

const KEY_ITEM: LootItem = { name: "Door key", emoji: "рџ—ќ", strengthGain: 0 };
const BAT_ITEM: LootItem = { name: "Baseball bat", emoji: "рџЏЏ", strengthGain: 0 };

type ClassroomTheme = {
  kind: "math" | "physics" | "lab" | "computer" | "music" | "art" | "library" | "cafeteria" | "gym" | "history" | "storage" | "default";
  board: string[];
  wall: string;
  floor: string;
  accent: string;
  light: string;
};

function getClassroomTheme(name: string): ClassroomTheme {
  const n = name.toLowerCase();
  if (/math|РјР°С‚/.test(n)) return {
    kind: "math",
    board: ["x + 7 = ?", "2 + 2 = 4", "FIND KEY"],
    wall: "linear-gradient(180deg,#181528,#0d0b18 72%,#07040d)",
    floor: "repeating-linear-gradient(90deg,#24212d 0 48px,#1b1823 48px 96px)",
    accent: "#8fb6ff",
    light: "rgba(120,170,255,0.14)",
  };
  if (/physics|С„РёР·|astronomy|Р°СЃС‚СЂ/.test(n)) return {
    kind: "physics",
    board: ["E = mcВІ", "ORBIT SHIFT", "KEY?"],
    wall: "linear-gradient(180deg,#101a2a,#090d18 72%,#05060d)",
    floor: "repeating-linear-gradient(90deg,#1f2630 0 54px,#171d25 54px 108px)",
    accent: "#76d7ff",
    light: "rgba(118,215,255,0.13)",
  };
  if (/lab|laboratory|biology|Р±РёРѕ|С…РёРј/.test(n)) return {
    kind: "lab",
    board: ["DO NOT MIX", "PH 7?", "LOCKED"],
    wall: "linear-gradient(180deg,#10251e,#07140f 72%,#040907)",
    floor: "repeating-linear-gradient(90deg,#1d2a22 0 50px,#141f18 50px 100px)",
    accent: "#55d889",
    light: "rgba(80,220,140,0.13)",
  };
  if (/computer|server|РєРѕРјРї/.test(n)) return {
    kind: "computer",
    board: ["LOGIN: ???", "POWER LOW", "KEY FILE"],
    wall: "linear-gradient(180deg,#0b1722,#060b13 72%,#030509)",
    floor: "repeating-linear-gradient(90deg,#121d26 0 45px,#0d151d 45px 90px)",
    accent: "#41e0c8",
    light: "rgba(65,224,200,0.13)",
  };
  if (/music|РјСѓР·/.test(n)) return {
    kind: "music",
    board: ["PLAY QUIET", "la la...", "KEY NOTE"],
    wall: "linear-gradient(180deg,#211326,#110814 72%,#09040a)",
    floor: "repeating-linear-gradient(90deg,#2a1b2c 0 50px,#201421 50px 100px)",
    accent: "#d7a7ff",
    light: "rgba(215,167,255,0.13)",
  };
  if (/art|studio|РёСЃРєСѓСЃ|СЂРёСЃ/.test(n)) return {
    kind: "art",
    board: ["RED PAINT?", "DON'T LOOK", "KEY"],
    wall: "linear-gradient(180deg,#261816,#120a09 72%,#080403)",
    floor: "repeating-linear-gradient(90deg,#2d211b 0 52px,#211813 52px 104px)",
    accent: "#ff8a66",
    light: "rgba(255,138,102,0.12)",
  };
  if (/library|archive|Р»РёС‚|Р±РёР±Р»/.test(n)) return {
    kind: "library",
    board: ["SILENCE", "BOOK 13", "KEY PAGE"],
    wall: "linear-gradient(180deg,#201713,#100b08 72%,#080403)",
    floor: "repeating-linear-gradient(90deg,#2b2117 0 46px,#21180f 46px 92px)",
    accent: "#d6ad68",
    light: "rgba(214,173,104,0.12)",
  };
  if (/cafeteria|canteen|РєСѓС…|СЃС‚РѕР»РѕРІ/.test(n)) return {
    kind: "cafeteria",
    board: ["LUNCH 00:00", "NO FOOD", "KEY TRAY"],
    wall: "linear-gradient(180deg,#241914,#120c08 72%,#080403)",
    floor: "repeating-linear-gradient(90deg,#2c2119 0 58px,#211811 58px 116px)",
    accent: "#f0b45f",
    light: "rgba(240,180,95,0.12)",
  };
  if (/gym|СЃРїРѕСЂС‚/.test(n)) return {
    kind: "gym",
    board: ["RUN QUIET", "LOCKER 4", "KEY"],
    wall: "linear-gradient(180deg,#1c1c24,#0f0f16 72%,#07070b)",
    floor: "repeating-linear-gradient(90deg,#302416 0 70px,#241b10 70px 140px)",
    accent: "#f4d35e",
    light: "rgba(244,211,94,0.12)",
  };
  if (/history|geo|map|РёСЃС‚|РіРµРѕ/.test(n)) return {
    kind: "history",
    board: ["OLD MAP", "YEAR 19??", "KEY ROOM"],
    wall: "linear-gradient(180deg,#231d16,#110d08 72%,#070403)",
    floor: "repeating-linear-gradient(90deg,#2a2117 0 50px,#1e170f 50px 100px)",
    accent: "#c9a36a",
    light: "rgba(201,163,106,0.12)",
  };
  if (/storage|attic|locker|utility|boiler|basement|СЃРєР»Р°Рґ|С‡РµСЂРґР°Рє/.test(n)) return {
    kind: "storage",
    board: ["BOX 7", "DO NOT OPEN", "KEY"],
    wall: "linear-gradient(180deg,#1b1715,#0e0a08 72%,#070403)",
    floor: "repeating-linear-gradient(90deg,#251d17 0 52px,#1b1510 52px 104px)",
    accent: "#a99b88",
    light: "rgba(169,155,136,0.10)",
  };
  return {
    kind: "default",
    board: ["NO WAY OUT", "FIND THE KEY", "LISTEN"],
    wall: "linear-gradient(180deg,#1a1018,#0d0610 70%,#080308)",
    floor: "repeating-linear-gradient(90deg,#2a1f1a 0 50px,#1f1612 50px 100px)",
    accent: "#f36458",
    light: "rgba(243,100,88,0.11)",
  };
}

function SubjectDecor({ theme }: { theme: ClassroomTheme }) {
  const accent = theme.accent;
  if (theme.kind === "math") return (
    <>
      <div className="absolute font-mono text-[13px] text-blue-200/65" style={{ left: 230, top: 42 }}>ПЂ В· в€љ9 В· 12%</div>
      <div className="absolute border border-blue-200/30" style={{ left: 238, top: 82, width: 62, height: 38, transform: "rotate(-8deg)" }} />
      <div className="absolute font-mono text-[11px] text-blue-100/55" style={{ left: 322, top: 120 }}>x = ?</div>
    </>
  );
  if (theme.kind === "physics") return (
    <>
      <div className="absolute rounded-full border border-cyan-200/40" style={{ left: 236, top: 52, width: 72, height: 26, transform: "rotate(-22deg)" }} />
      <div className="absolute rounded-full border border-cyan-200/35" style={{ left: 236, top: 52, width: 72, height: 26, transform: "rotate(22deg)" }} />
      <div className="absolute rounded-full" style={{ left: 268, top: 60, width: 8, height: 8, background: accent, boxShadow: `0 0 16px ${accent}` }} />
      <div className="absolute text-cyan-100/60 text-[24px]" style={{ left: 330, top: 82 }}>в„</div>
    </>
  );
  if (theme.kind === "lab") return (
    <>
      <div className="absolute" style={{ left: 228, top: 96, width: 110, height: 52 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute bottom-0 border border-emerald-100/35" style={{ left: i * 35, width: 20, height: 36 + i * 8, background: "rgba(20,80,55,0.45)" }}>
            <div className="absolute left-0 right-0 bottom-0" style={{ height: 10 + i * 6, background: accent, opacity: 0.45 }} />
          </div>
        ))}
      </div>
      <div className="absolute text-emerald-200/70 text-[18px]" style={{ left: 350, top: 50 }}>вЈ</div>
    </>
  );
  if (theme.kind === "computer") return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute border border-cyan-300/30 bg-black/50" style={{ left: 220 + i * 48, top: 92, width: 36, height: 28 }}>
          <div className="absolute left-1 right-1 top-1 h-1" style={{ background: accent, opacity: 0.7 }} />
          <div className="absolute left-1 top-6 w-3 h-1 bg-cyan-200/50" />
        </div>
      ))}
      <div className="absolute font-mono text-[10px] text-cyan-200/60" style={{ left: 224, top: 56 }}>0101 ACCESS</div>
    </>
  );
  if (theme.kind === "music") return (
    <>
      <div className="absolute text-purple-200/65 text-[34px]" style={{ left: 230, top: 76 }}>в™Є</div>
      <div className="absolute text-purple-200/50 text-[26px]" style={{ left: 300, top: 48 }}>в™«</div>
      <div className="absolute border-l-4 border-purple-200/40" style={{ left: 360, top: 64, width: 30, height: 78, transform: "rotate(-12deg)" }} />
    </>
  );
  if (theme.kind === "art") return (
    <>
      {["#8b0f19", "#e29b40", "#325f8f"].map((c, i) => (
        <div key={c} className="absolute rounded-full" style={{ left: 225 + i * 36, top: 78 + i * 9, width: 24, height: 12, background: c, opacity: 0.75 }} />
      ))}
      <div className="absolute border border-orange-200/35" style={{ left: 328, top: 52, width: 54, height: 64, transform: "rotate(5deg)" }} />
    </>
  );
  if (theme.kind === "library") return (
    <>
      <div className="absolute" style={{ left: 220, top: 50, width: 120, height: 92 }}>
        <div className="absolute inset-0 bg-[#2b190f] border border-amber-900/70" />
        {[0, 1, 2].map(i => <div key={i} className="absolute left-1 right-1 h-1 bg-black/60" style={{ top: 25 + i * 24 }} />)}
        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="absolute w-5 bg-amber-200/50" style={{ left: 6 + (i % 6) * 18, top: 7 + Math.floor(i / 6) * 28, height: 18 }} />)}
      </div>
    </>
  );
  if (theme.kind === "cafeteria") return (
    <>
      <div className="absolute bg-zinc-800/80 border border-zinc-500/40" style={{ left: 230, top: 116, width: 120, height: 18 }} />
      <div className="absolute text-amber-200/70 text-[22px]" style={{ left: 246, top: 82 }}>рџЌЅ</div>
      <div className="absolute text-amber-200/60 text-[18px]" style={{ left: 312, top: 88 }}>в•</div>
    </>
  );
  if (theme.kind === "gym") return (
    <>
      <div className="absolute rounded-full border-4 border-amber-300/40" style={{ left: 232, top: 78, width: 42, height: 42 }} />
      <div className="absolute rounded-full bg-orange-800/70 border border-orange-300/40" style={{ left: 308, top: 104, width: 28, height: 28 }} />
      <div className="absolute h-1 bg-amber-200/40" style={{ left: 220, top: 58, width: 150 }} />
    </>
  );
  if (theme.kind === "history") return (
    <>
      <div className="absolute bg-amber-100/20 border border-amber-200/35" style={{ left: 226, top: 48, width: 94, height: 70, transform: "rotate(-4deg)" }} />
      <div className="absolute border-t border-amber-200/40" style={{ left: 238, top: 78, width: 60, transform: "rotate(15deg)" }} />
      <div className="absolute font-mono text-[10px] text-amber-200/60" style={{ left: 334, top: 64 }}>1912</div>
    </>
  );
  if (theme.kind === "storage") return (
    <>
      {[0, 1, 2].map(i => <div key={i} className="absolute bg-[#3a2b20] border border-[#15100b]" style={{ left: 222 + i * 42, top: 95 - i * 10, width: 38, height: 34 }} />)}
      <div className="absolute text-zinc-300/50 text-[18px]" style={{ left: 352, top: 70 }}>вљ™</div>
    </>
  );
  return null;
}

// ====== РЎС†РµРЅР° РІРЅСѓС‚СЂРё РєР»Р°СЃСЃР° ======
function ClassroomScene({
  classroom, levelId, hasFlashlight, batteryPct, onCollect, onLeave,
  lanaPalette, onConsumeBattery, onToast,
}: {
  classroom: Classroom;
  levelId: number;
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
  const quest = useMemo(() => getClassroomQuest(classroom, levelId), [classroom, levelId]);
  const theme = useMemo(() => getClassroomTheme(classroom.name), [classroom.name]);
  const keySpotId = classroom.spots[quest.keyIdx]?.id;
  const batSpotId = quest.hasBat && quest.batIdx >= 0 ? classroom.spots[quest.batIdx]?.id : undefined;

  const [keyFound, setKeyFound] = useState(false);
  const [batFound, setBatFound] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [roomMoving, setRoomMoving] = useState(false);

  // РџРµСЂРµРґРІРёР¶РµРЅРёРµ Р›Р°РЅС‹ РїРѕ РєР»Р°СЃСЃСѓ (A/D РёР»Рё СЃС‚СЂРµР»РєРё)
  const [lanaX, setLanaX] = useState(20);
  const [facing, setFacing] = useState<1 | -1>(1);
  const lanaRoomXRef = useRef(20);
  lanaRoomXRef.current = lanaX;
  const keysRef = useRef<{ l: boolean; r: boolean }>({ l: false, r: false });
  const collectSpot = useCallback((spot: SearchSpot) => {
    if (taken.has(spot.id)) return;
    const isKeySpot = spot.id === keySpotId;
    const isBatSpot = spot.id === batSpotId;
    setTaken(prev => new Set(prev).add(spot.id));
    if (isKeySpot) {
      setKeyFound(true);
      onCollect(KEY_ITEM, spot);
      onToast("РљР»СЋС‡ РЅР°Р№РґРµРЅ");
    } else if (isBatSpot) {
      setBatFound(true);
      onCollect(BAT_ITEM, spot);
      onToast("Р‘РёС‚Р° РЅР°Р№РґРµРЅР°. РЈРґР°СЂ: G");
    } else if (spot.item) {
      onCollect(spot.item, spot);
    } else {
      onToast("РџСѓСЃС‚Рѕ");
    }
  }, [batSpotId, keySpotId, onCollect, onToast, taken]);

  const activeSpot = useMemo(() => {
    const lanaCenter = lanaX + 52;
    let best: SearchSpot | null = null;
    let bestDist = Infinity;
    for (const spot of classroom.spots) {
      if (taken.has(spot.id)) continue;
      const dist = Math.abs(spot.x - lanaCenter);
      if (dist < 76 && dist < bestDist) {
        best = spot;
        bestDist = dist;
      }
    }
    return best;
  }, [classroom.spots, lanaX, taken]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "e" || k === "E" || k === "у" || k === "У") {
        const lanaCenter = lanaRoomXRef.current + 52;
        const spot = classroom.spots
          .filter(s => !taken.has(s.id))
          .map(s => ({ spot: s, dist: Math.abs(s.x - lanaCenter) }))
          .filter(s => s.dist < 76)
          .sort((a, b) => a.dist - b.dist)[0]?.spot;
        if (spot) {
          e.preventDefault();
          collectSpot(spot);
        } else {
          onToast("Подойди ближе к столу или полке");
        }
      }
      if (k === "a" || k === "A" || k === "ArrowLeft" || k === "С„" || k === "Р¤") { keysRef.current.l = true; setFacing(-1); }
      if (k === "d" || k === "D" || k === "ArrowRight" || k === "РІ" || k === "Р’") { keysRef.current.r = true; setFacing(1); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "a" || k === "A" || k === "ArrowLeft" || k === "С„" || k === "Р¤") keysRef.current.l = false;
      if (k === "d" || k === "D" || k === "ArrowRight" || k === "РІ" || k === "Р’") keysRef.current.r = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    const tick = () => {
      const k = keysRef.current;
      setRoomMoving(k.l || k.r);
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
  }, [classroom.spots, collectSpot, onToast, taken]);

  const openDoor = () => {
    if (!keyFound) { onToast("рџ”’ Find the key first"); return; }
    setDoorOpen(true);
    onToast("рџљЄ Door open! +15 coins");
    onCollect({ name: "Open door", emoji: "рџљЄ", hpGain: 0 }, classroom.spots[0]);
  };

  const tryLeave = () => {
    if (!doorOpen) { onToast("рџ”’ Р”РІРµСЂСЊ Р·Р°РєСЂС‹С‚Р° вЂ” РЅР°Р№РґРё РєР»СЋС‡"); return; }
    onLeave();
  };

  return (
    <div className="relative w-full overflow-hidden border-2 border-zinc-800 rounded bg-[#0a0610]"
      style={{ height: 380 }}>
      {/* Р·Р°РґРЅСЏСЏ СЃС‚РµРЅР° */}
      <div className="absolute inset-x-0 top-0" style={{
        height: 230,
        background: theme.wall,
      }} />
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 800 380" preserveAspectRatio="none">
        <path d="M 40 60 L 80 100 L 60 140 L 110 180" stroke="#1a0a0a" strokeWidth="1.5" fill="none" />
        <path d="M 700 30 L 750 80 L 720 130 L 770 180" stroke="#1a0a0a" strokeWidth="1.5" fill="none" />
      </svg>
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 800 380" preserveAspectRatio="none">
        <path d="M 250 20 C 240 70, 270 110, 245 160" stroke="#5a0a0a" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.65" />
        <circle cx="245" cy="160" r="5" fill="#5a0a0a" opacity="0.8" />
        <path d="M 580 0 C 575 40, 600 70, 585 110" stroke="#5a0a0a" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />
      </svg>
      <SubjectDecor theme={theme} />

      {/* РћРљРќРћ СЃ Р»СѓРЅРѕР№ Рё РєСѓРєРѕР»СЊРЅС‹РјРё СЂСѓРєР°РјРё */}
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
        <div className="absolute" style={{ left: 6, bottom: -34, transform: "rotate(-12deg)" }}><DollHand delay={0} /></div>
        <div className="absolute" style={{ left: 92, bottom: -38, transform: "rotate(8deg)" }}><DollHand delay={0.4} /></div>
        <div className="absolute" style={{ right: -6, bottom: -28, transform: "rotate(20deg) scaleX(-1)" }}><DollHand delay={0.8} /></div>
        <div className="absolute -bottom-1 left-2 right-2 h-2 bg-[#5a0a0a] opacity-80" />
        <div className="absolute -top-4 left-2 text-[9px] font-pixel text-red-300 animate-pulse">вљ  they are outside</div>
      </div>

      {/* Р”РѕСЃРєР° */}
      <div className="absolute" style={{ left: 24, top: 28, width: 180, height: 90 }}>
        <div className="absolute inset-0 bg-[#0a2a1a] border-4 border-[#3a2a1a]" />
        <div className="absolute inset-2 text-[10px] font-pixel leading-tight" style={{ color: theme.accent }}>
          {theme.board.map((line) => <div key={line}>{line}</div>)}
        </div>
      </div>

      {/* Р—Р°РїРµСЂС‚Р°СЏ РґРІРµСЂСЊ СЃРїСЂР°РІР° РЅР° СЃС‚РµРЅРµ */}
      <div className="absolute" style={{ right: 16, top: 24, width: 130, height: 200 }}>
        {/* СЂР°РјРєР° */}
        <div className="absolute inset-0 bg-[#3a2618] border-4 border-[#1a0e08]" />
        {/* С„РёР»С‘РЅРєРё */}
        <div className="absolute left-3 right-3 top-3 h-16 bg-[#2a1810] border-2 border-[#0a0604]" />
        <div className="absolute left-3 right-3 top-24 h-16 bg-[#2a1810] border-2 border-[#0a0604]" />
        {/* СЃР»РµРґС‹ РєСЂРѕРІРё */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 130 200" preserveAspectRatio="none">
          <path d="M 20 40 C 18 60, 28 80, 22 100" stroke="#5a0a0a" strokeWidth="3" fill="none" opacity="0.85" />
          <circle cx="22" cy="100" r="3" fill="#5a0a0a" />
        </svg>
        {/* Р·Р°РјРѕРє */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 bg-[#1a1a1a] border-2 border-[#5a5a5a] rounded-full">
          {doorOpen ? "рџ”“" : "рџ”’"}
        </div>
        {/* СЃС‚Р°С‚СѓСЃ РґРІРµСЂРё */}
        <div className="absolute -bottom-1 left-0 right-0 text-center text-[10px] font-pixel">
          {doorOpen ? (
            <span className="text-emerald-300">вњ“ OPEN</span>
          ) : (
            <span className="text-amber-200">{keyFound ? "Turn key в†’" : "рџ”’ need key"}</span>
          )}
        </div>
      </div>

      {/* РЁРєР°С„ СЃ С‚СЂСѓР±Р°РјРё */}
      <div className="absolute" style={{ left: 230, top: 110, width: 70, height: 60 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-2 bg-[#5a5a5a] border border-black" style={{ left: i * 11 }} />
        ))}
      </div>

      {/* РџРѕР» */}
      <div className="absolute inset-x-0 bottom-0" style={{
        height: 150,
        background: theme.floor,
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

      {/* Р›Р°РЅР° вЂ” С…РѕРґРёС‚ РїРѕ РєР»Р°СЃСЃСѓ (A/D РёР»Рё в†ђ в†’) */}
      <div className="absolute transition-none" style={{ left: lanaX, bottom: 28 }}>
        <LanaSpeech />
        <MenuArtCharacter kind="lana" facing={facing} size={135} scared={batteryPct < 20} motion={batteryPct < 20 ? "scared" : roomMoving ? "walk" : "idle"} />
      </div>

      {/* РўРѕС‡РєРё РїРѕРёСЃРєР° */}
      {classroom.spots.map(spot => {
        const isKeySpot = spot.id === keySpotId;
        const isBatSpot = spot.id === batSpotId;
        return (
          <SpotEl
            key={spot.id}
            spot={spot}
            taken={taken.has(spot.id)}
            lit={lit}
            active={activeSpot?.id === spot.id}
            hasKey={isKeySpot}
            hasBat={isBatSpot}
          />
        );
      })}

      {/* Р›С‘РіРєРёР№ Р»СѓРЅРЅС‹Р№ РїРѕР»СѓРјСЂР°Рє вЂ” РІРёРґРЅРѕ РІРµСЃСЊ РєР»Р°СЃСЃ, РЅРѕ СЃ Р°С‚РјРѕСЃС„РµСЂРѕР№ */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
            background: "radial-gradient(ellipse 600px 320px at 65% 25%, rgba(180,200,255,0.10) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(10,10,30,0.18), rgba(0,0,0,0.32))",
        }} />
      {lit && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 460px 300px at 30% 75%, ${theme.light} 0%, rgba(255,240,180,0.08) 40%, rgba(0,0,0,0) 75%)`,
            mixBlendMode: "screen",
          }} />
      )}

      {/* РџР°РЅРµР»СЊ РєРІРµСЃС‚Р° СЃРІРµСЂС…Сѓ */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-pixel bg-black/85 px-3 py-1 rounded border border-amber-400/40 flex items-center gap-3 z-10">
        <span className={keyFound ? "text-emerald-300" : "text-amber-200"}>
          {keyFound ? "вњ“ Key рџ—ќ" : "вњ— Find key рџ—ќ"}
        </span>
        {quest.hasBat && (
          <span className={batFound ? "text-emerald-300" : "text-amber-200"}>
            {batFound ? "вњ“ Bat рџЏЏ" : "вњ— Find bat рџЏЏ"}
          </span>
        )}
        <span className="text-zinc-400">В· Spots: {remaining}/{classroom.spots.length}</span>
      </div>

      {/* РџР°РЅРµР»СЊ РґРІРµСЂРё вЂ” СѓРїСЂР°РІР»РµРЅРёРµ РєРІРµСЃС‚РѕРј */}
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 z-10">
        <div className="flex items-center gap-2 bg-black/85 border border-amber-700/60 rounded p-2">
          {!doorOpen && (
            <Button size="sm" onClick={openDoor} disabled={!keyFound}>
              {keyFound ? "рџ—ќ Open door" : "рџ”’ Need key"}
            </Button>
          )}
          {doorOpen && (
            <span className="text-emerald-300 font-pixel text-xs px-2">рџљЄ Door open</span>
          )}
        </div>
        <Button size="sm" variant={doorOpen ? "default" : "secondary"} onClick={tryLeave} disabled={!doorOpen}>
          {doorOpen ? "в†’ Exit to hallway" : "рџ”’ Locked"}
        </Button>
      </div>
    </div>
  );
}


export default function EscapeGame() {
  // Persisted (menu / shop)
  const [save, setSave] = useState<SaveData>(() => ({ coins: 0, crystals: 0, outfit: "classic", owned: { ...EMPTY_INV }, ownedOutfits: [...DEFAULT_OUTFITS] }));
  const [menuTab, setMenuTab] = useState<"play" | "instructions" | "outfit" | "shop" | "leaderboard">("play");
  const [playerName, setPlayerName] = useState<string>("Lana");
  useEffect(() => {
    const s = loadSave();
    setSave(s);
    setCoins(s.coins);
    if (typeof window !== "undefined") {
      setPlayerName(localStorage.getItem("lana_player_name") || "Lana");
    }
  }, []);

  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const startTimeRef = useRef<number>(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);

  const [started, setStarted] = useState(false);
  const [introStoryIndex, setIntroStoryIndex] = useState<number | null>(null);
  const [musicOff, setMusicOff] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthEmail(data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? null);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOutPlayer() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  // Background music: menu vs game. Needs a user gesture to start AudioContext.
  useEffect(() => {
    const track: "menu" | "game" = started ? "game" : "menu";
    const start = () => playMusic(track);
    start();
    const onGesture = () => start();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [started]);
  useEffect(() => () => { stopMusic(); }, []);
  useEffect(() => { setMusicMuted(musicOff); }, [musicOff]);

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
  const [jumpscare, setJumpscare] = useState<ToyMonsterKind | null>(null);
  const lastJumpscareRef = useRef(0);
  const [toast, setToast] = useState<string>("");
  const [inv, setInv] = useState<InvItem[]>([]);
  const invRef = useRef(inv); invRef.current = inv;
  const lastBiteRef = useRef(0);
  const [storyNotes, setStoryNotes] = useState<Set<string>>(new Set());
  const [rescued, setRescued] = useState<Set<string>>(new Set());
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [ambientLine, setAmbientLine] = useState("");

  // ===== Noise lure (thrown toy) вЂ” dolls С…РѕРґСЊР±Р° to this x =====
  const [lure, setLure] = useState<{ x: number; until: number; emoji: string } | null>(null);
  const lureRef = useRef<typeof lure>(null); lureRef.current = lure;

  // ===== Hiding in a locker =====
  const [hiding, setHiding] = useState<string | null>(null);
  const hidingRef = useRef<string | null>(null); hidingRef.current = hiding;

  // ===== Jump physics + obstacle collisions =====
  const [jumpY, setJumpY] = useState(0);
  const jumpYRef = useRef(0); jumpYRef.current = jumpY;
  const jumpVRef = useRef(0);
  const lastGlassRef = useRef(0);
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === " " || k === "w" || k === "arrowup" || k === "С†") && jumpYRef.current === 0 && jumpVRef.current === 0 && modal.kind === "none" && started) {
        jumpVRef.current = -11;
      }
    };
    window.addEventListener("keydown", dn);
    return () => window.removeEventListener("keydown", dn);
  }, [modal.kind, started]);
  useEffect(() => {
    if (!started || modal.kind !== "none") return;
    let raf = 0;
    const tick = () => {
      // gravity
      if (jumpVRef.current !== 0 || jumpYRef.current > 0) {
        jumpVRef.current += 0.7;
        const ny = Math.max(0, jumpYRef.current - jumpVRef.current);
        jumpYRef.current = ny;
        if (ny === 0) jumpVRef.current = 0;
        setJumpY(ny);
      }
      // obstacle damage вЂ” glass
      const obs = levels[level]?.obstacles ?? [];
      const now = performance.now();
      if (jumpYRef.current < 18 && now - lastGlassRef.current > 900) {
        for (const o of obs) {
          if (Math.abs(o.x - xRef.current) < 24) {
            lastGlassRef.current = now;
            sfxBite();
            setShake(true); setTimeout(() => setShake(false), 250);
            setHp(h => {
              const nh = Math.max(0, h - 8);
              if (nh === 0) { sfxDeath(); setTimeout(() => setModal({ kind: "lose" }), 200); }
              return nh;
            });
            setToast("рџ©ё Stepped on glass! -8 HP (jump with SPACE)");
            setTimeout(() => setToast(""), 1500);
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, modal.kind, level]);

  // Р“РѕР»РѕРґ 0..100. Tick down over time; at 0 starts damaging HP.
  const MAX_HUNGER = 100;
  const [hunger, setHunger] = useState(MAX_HUNGER);
  const hungerRef = useRef(hunger); hungerRef.current = hunger;

  // РЎРёРґСЏ РЅР° РєРѕСЂС‚РѕС‡РєР°С… вЂ” РјРµРґР»РµРЅРЅРѕ, РЅРѕ Р±РµР· С€СѓРјР°.
  const [crouching, setCrouching] = useState(false);
  const crouchRef = useRef(false); crouchRef.current = crouching;

  // РЎРїСЏС‰РёРµ РєСѓРєР»С‹, РєРѕС‚РѕСЂС‹С… СѓР¶Рµ СЂР°Р·Р±СѓРґРёР»Рё (РїРѕСЃР»Рµ СЌС‚РѕРіРѕ РІРµРґСѓС‚ СЃРµР±СЏ РєР°Рє РѕР±С‹С‡РЅС‹Рµ).
  const wokenRef = useRef<Set<string>>(new Set());

  // ===== Р¤РѕРЅР°СЂРёРє Рё Р±Р°С‚Р°СЂРµСЏ =====
  const MAX_BATTERY = 100;
  const [foundFlashlight, setFoundFlashlight] = useState(false);
  const [battery, setBattery] = useState(MAX_BATTERY);
  const hasFlashlight = save.owned.flashlight || foundFlashlight;
  const flashlightOn = hasFlashlight && battery > 0;

  // Weapons remaining (decreases as used; bought in shop)
  const [batLeft, setBatLeft] = useState(save.owned.bat);
  const [gunLeft, setGunLeft] = useState(save.owned.gun);
  const [coins, setCoins] = useState(save.coins);
  // Р‘РµР¶РёС‚ mode (Shift). Noisy вЂ” wakes "sleeping" dolls sooner.
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false); runningRef.current = running;

  // Selected outfit
  const outfit = useMemo(() => OUTFITS.find(o => o.id === save.outfit) ?? OUTFITS[0], [save.outfit]);
  const lanaPalette = outfit.palette;
  const isNinja = outfit.id === "ninja";

  // Persist coins + owned weapons left on changes
  useEffect(() => {
    writeSave({ ...save, coins });
  }, [coins]);

  const cur = levels[level];
  const dolls = cur.dolls;
  const classrooms = cur.classrooms;
  const EXIT_X = cur.exitX;
  const WORLD_W = cur.worldW;
  const isFinalLevel = level === levels.length - 1;

  const keys = useRef<Record<string, boolean>>({});
  const xRef = useRef(x); xRef.current = x;
  const viewportRef = useRef<HTMLDivElement>(null);

  // Animated doll positions (patrol around their home x).
  const zomPosRef = useRef<Record<string, number>>({});
  const [, setZomTick] = useState(0);
  const tStartRef = useRef(performance.now());
  const zomHomeRef = useRef<Record<string, number>>({});
  const zx = useCallback((z: Doll, idx: number) => {
    {
      const monsterKind = pickToyMonsterKind(z.name);
      if (z.sleeping && !wokenRef.current.has(z.id) && monsterKind !== "bear") return z.x;
      const home = zomHomeRef.current[z.id] ?? z.x;
      const t = (performance.now() - tStartRef.current) / 1000;
      const playerX = xRef.current;
      const lureNow = lureRef.current;
      const moveHome = (target: number, speed: number) => {
        const dist = target - home;
        if (Math.abs(dist) < 1) return home;
        const next = home + Math.sign(dist) * Math.min(speed, Math.abs(dist));
        zomHomeRef.current[z.id] = clamp(next, 80, WORLD_W - 80);
        return next;
      };

      // Р‘РµР¶РёС‚ near any monster = instantly heard, full chase
      const alertedByRun = runningRef.current && Math.abs(playerX - home) < 280 && !hidingRef.current;
      if (monsterKind === "bear") return moveHome(playerX, (alertedByRun ? 1.6 : 0.58) + level * 0.08);
      if (monsterKind === "porcelain") {
        if (alertedByRun) return moveHome(playerX, 2.4 + level * 0.18);
        const phase = (t + idx * 0.73) % 6.2;
        if (phase < 1.25) return clamp(playerX + (idx % 2 ? 170 : -170), 90, WORLD_W - 90);
        if (phase > 5.25) return clamp(playerX + (idx % 2 ? -90 : 90), 90, WORLD_W - 90);
        return home + Math.sin(t * 0.55 + idx) * 24;
      }
      if (monsterKind === "monkey") {
        const hearsNoise = !!lureNow && performance.now() < lureNow.until;
        if (alertedByRun || hearsNoise) return moveHome(hearsNoise ? lureNow.x : playerX, 3.2 + level * 0.18);
        return home + Math.sin(t * 1.7 + idx * 2.4) * 42;
      }
      if (monsterKind === "clown") {
        if ((alertedByRun || Math.abs(playerX - home) < 440) && !hidingRef.current) return moveHome(playerX, (alertedByRun ? 3.4 : 2.65) + level * 0.22);
        return home + Math.sin(t * 1.35 + idx * 1.7) * 92;
      }
      return home + Math.sin(t * 0.9 + idx * 1.7) * 60;
    }
    // Sleeping (and not yet woken) вЂ” СЃС‚РѕСЏС‚ РЅР° РјРµСЃС‚Рµ.
    if (z.sleeping && !wokenRef.current.has(z.id)) return z.x;
    const home = zomHomeRef.current[z.id] ?? z.x;
    const t = (performance.now() - tStartRef.current) / 1000;
    return home + Math.sin(t * 0.9 + idx * 1.7) * 60;
  }, [WORLD_W, level]);
  const killedRef = useRef(killed); killedRef.current = killed;

  // input
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  const allKilled = killed.size === dolls.length;

  const saveCheckpoint = useCallback((label: string, px = xRef.current) => {
    setCheckpoint(prev => {
      if (prev && prev.level === level && prev.x >= px - 30) return prev;
      const next: Checkpoint = {
        level,
        x: px,
        label,
        killed: new Set(killed),
        searched: new Set(searched),
        storyNotes: new Set(storyNotes),
        rescued: new Set(rescued),
      };
      setToast(`РўРѕС‡РєР°: ${label}`);
      setTimeout(() => setToast(""), 1600);
      return next;
    });
  }, [level, killed, searched, storyNotes, rescued]);

  const respawnAtCheckpoint = useCallback(() => {
    if (!checkpoint) return;
    setLevel(checkpoint.level);
    setX(checkpoint.x);
    setKilled(new Set(checkpoint.killed));
    setSearched(new Set(checkpoint.searched));
    setStoryNotes(new Set(checkpoint.storyNotes));
    setRescued(new Set(checkpoint.rescued));
    setHp(Math.max(45, Math.floor(maxHp * 0.55)));
    setHunger(MAX_HUNGER);
    setBattery(b => Math.max(35, b));
    setHiding(null);
    setLure(null);
    wokenRef.current = new Set();
    zomHomeRef.current = {};
    setModal({ kind: "none" });
    setToast(`Lana wakes near ${checkpoint.label}`);
    setTimeout(() => setToast(""), 2000);
  }, [checkpoint, maxHp]);

  const respawnWithCrystal = useCallback(() => {
    if (!checkpoint) {
      setToast("РќРµС‚ С‚РѕС‡РєРё РІРѕР·СЂРѕР¶РґРµРЅРёСЏ.");
      setTimeout(() => setToast(""), 1400);
      return;
    }
    if ((save.crystals ?? 0) < RESPAWN_CRYSTAL_COST) {
      setToast("РќСѓР¶РµРЅ РєСЂРёСЃС‚Р°Р»Р». РљСѓРїРё РµРіРѕ РІ РјР°РіР°Р·РёРЅРµ Р·Р° РјРѕРЅРµС‚С‹.");
      setTimeout(() => setToast(""), 1800);
      return;
    }
    setSave(s => {
      const ns = { ...s, crystals: Math.max(0, (s.crystals ?? 0) - RESPAWN_CRYSTAL_COST) };
      writeSave(ns);
      return ns;
    });
    respawnAtCheckpoint();
  }, [checkpoint, respawnAtCheckpoint, save.crystals]);

  useEffect(() => {
    if (!started || modal.kind !== "none") return;
    const marker = x > EXIT_X - 360
      ? { x: EXIT_X - 260, label: "the stairwell" }
      : x > WORLD_W * 0.55
        ? { x: Math.floor(WORLD_W * 0.55), label: "the long corridor" }
        : null;
    if (!marker) return;
    if (!checkpoint || checkpoint.level < level || (checkpoint.level === level && checkpoint.x < marker.x - 80)) {
      saveCheckpoint(marker.label, marker.x);
    }
  }, [x, level, started, modal.kind, EXIT_X, WORLD_W, checkpoint, saveCheckpoint]);

  useEffect(() => {
    if (!started || modal.kind !== "none") return;
    const id = setInterval(() => {
      const line = AMBIENT_HORROR_LINES[Math.floor(Math.random() * AMBIENT_HORROR_LINES.length)];
      setAmbientLine(line);
      sfxGrowl();
      setTimeout(() => setAmbientLine(""), 3000);
    }, 18000);
    return () => clearInterval(id);
  }, [started, modal.kind]);

  // РґРµР№СЃС‚РІРёРµ + weapon
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (modal.kind !== "none") return;
      const k = e.key.toLowerCase();
      const px = xRef.current;
      // Weapon: F = pistol (instant kill), G = bat (stun = win without minigame)
      if (k === "f" || k === "g") {
        const z = dolls.find((zz, i) => !killed.has(zz.id) && Math.abs(zx(zz, i) - px) < REACH + 30);
        if (!z) return;
        if (k === "f" && gunLeft > 0) {
          setGunLeft(n => { const nn = n - 1; setSave(s => { const ns = { ...s, owned: { ...s.owned, gun: nn } }; writeSave(ns); return ns; }); return nn; });
          setKilled(prev => new Set(prev).add(z.id));
          sfxGunshot();
          setCoins(c => c + 25);
          setToast(`рџ”« ${z.name} вЂ” РѕСЃС‚Р°РЅРѕРІР»РµРЅР° РІС‹СЃС‚СЂРµР»РѕРј! +25 coins`);
          setTimeout(() => setToast(""), 1600);
          return;
        }
        if (k === "g" && batLeft > 0) {
          setBatLeft(n => {
            const nn = n - 1;
            setSave(s => {
              const ownedBat = s.owned.bat ?? 0;
              const newBat = Math.max(0, ownedBat - 1);
              const ns = { ...s, owned: { ...s.owned, bat: newBat } };
              writeSave(ns);
              return ns;
            });
            return nn;
          });
          setKilled(prev => new Set(prev).add(z.id));
          sfxBat();
          setCoins(c => c + 15);
          setToast(`рџЏЏ ${z.name} вЂ” stunned with bat! +15 coins`);
          setTimeout(() => setToast(""), 1600);
          return;
        }
        setToast(k === "f" ? "рџ”« РќРµС‚ РїР°С‚СЂРѕРЅРѕРІ" : "рџЏЏ РќРµС‚ Р±РёС‚С‹");
        setTimeout(() => setToast(""), 1200);
        return;
      }
      if (k === "b") { setModal({ kind: "backpack" }); return; }
      // T вЂ” throw nearest noise toy from backpack to lure dolls
      if (k === "t" || k === "Рµ") {
        const list = invRef.current;
        const toyIdx = list.findIndex(it => it.noise && it.noise > 0);
        if (toyIdx === -1) {
          setToast("рџђ° РќРµС‚ РёРіСЂСѓС€РµРє РґР»СЏ РѕС‚РІР»РµС‡РµРЅРёСЏ. РќР°Р№РґРё РїР»СЋС€РµРІСѓСЋ РёРіСЂСѓС€РєСѓ, С€РєР°С‚СѓР»РєСѓ РёР»Рё Р·РІРѕРЅРѕРє.");
          setTimeout(() => setToast(""), 1500);
          return;
        }
        const toy = list[toyIdx];
        setInv(p => p.filter((_, i) => i !== toyIdx));
        const throwX = clamp(px + (facing === 1 ? 220 : -220), 80, WORLD_W - 80);
        sfxPickup();
        setLure({ x: throwX, until: performance.now() + (toy.noise ?? 4000), emoji: toy.emoji });
        setToast(`${toy.emoji} Р‘СЂРѕС€РµРЅРѕ! РљСѓРєР»С‹ РёРґСѓС‚ РЅР° Р·РІСѓРє...`);
        setTimeout(() => setToast(""), 1500);
        return;
      }
      // H вЂ” hide / unhide in nearest locker
      if (k === "h" || k === "СЂ") {
        if (hidingRef.current) {
          setHiding(null);
          setToast("рџљЄ Stepped out of the locker");
          setTimeout(() => setToast(""), 1200);
          return;
        }
        const spot = (cur.hideSpots ?? []).find(s => Math.abs(s.x - px) < REACH);
        if (spot) {
          setHiding(spot.id);
          sfxPickup();
          setToast("рџљЄ Hidden in the locker. Hold quietвЂ¦ (H to leave)");
          setTimeout(() => setToast(""), 1800);
        } else {
          setToast("No locker nearby");
          setTimeout(() => setToast(""), 1000);
        }
        return;
      }
      if (k !== "e" && e.key !== "Enter") return;
      // nearest doll
      const z = dolls.find((zz, i) => !killed.has(zz.id) && Math.abs(zx(zz, i) - px) < REACH);
      if (z) { setModal({ kind: "task", doll: z }); return; }
      // nearest classroom
      const c = classrooms.find(c => !searched.has(c.id) && Math.abs(c.x - px) < REACH);
      if (c) { setModal({ kind: "search", classroom: c }); return; }
      // exit door
      if (Math.abs(EXIT_X - px) < REACH) {
        if (!allKilled) {
          setToast("Р”РІРµСЂСЊ РЅРµ РѕС‚РєСЂРѕРµС‚СЃСЏ: РІРїРµСЂРµРґРё РµС‰С‘ РєСѓРєР»С‹.");
          setTimeout(() => setToast(""), 1800);
        } else setModal({ kind: isFinalLevel ? "doorTask" : "exit" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modal.kind, killed, searched, allKilled, level, gunLeft, batLeft, dolls, zx, EXIT_X]);

  // game loop вЂ” movement + auto-block at dolls
  useEffect(() => {
    if (!started || modal.kind !== "none") { setMoving(false); return; }
    let raf = 0;
    const tick = () => {
      // Lure pull вЂ” drift each doll's home toward the lure x while active
      const lureNow = lureRef.current;
      if (lureNow && performance.now() < lureNow.until) {
        for (const z of dolls) {
          if (killedRef.current.has(z.id)) continue;
          const monsterKind = pickToyMonsterKind(z.name);
          if (monsterKind === "bear" || monsterKind === "porcelain") continue;
          // wake sleeping dolls вЂ” noise reaches them
          if (z.sleeping) wokenRef.current.add(z.id);
          const home = zomHomeRef.current[z.id] ?? z.x;
          const dist = Math.abs(home - lureNow.x);
          if (dist > 5) {
            const dir = lureNow.x > home ? 1 : -1;
            const pull = monsterKind === "monkey" ? 4.2 : monsterKind === "clown" ? 2.8 : 1.3;
            zomHomeRef.current[z.id] = home + dir * Math.min(pull, dist);
          }
        }
      } else if (lureNow && performance.now() >= lureNow.until) {
        setLure(null);
      }
      // Update doll patrol positions
      const pos: Record<string, number> = {};
      dolls.forEach((z, i) => { pos[z.id] = zx(z, i); });
      zomPosRef.current = pos;
      setZomTick(t => (t + 1) % 1000000);

      // Crouch (C) вЂ” С‚РёС…Рѕ, РјРµРґР»РµРЅРЅРѕ. Run (Shift) вЂ” С€СѓРјРЅРѕ, Р±С‹СЃС‚СЂРѕ.
      const isCrouch = !!(keys.current["c"] || keys.current["control"]);
      const isRun = !isCrouch && !!(keys.current["shift"]);
      setRunning(isRun);
      setCrouching(isCrouch);
      const speed = isCrouch ? SPEED * 0.45 : (isRun ? SPEED * 1.7 : SPEED);

      let dx = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) { dx -= 1; setFacing(-1); }
      if (keys.current["d"] || keys.current["arrowright"]) { dx += 1; setFacing(1); }
      if (dx !== 0 && hidingRef.current) setHiding(null);
      if (dx !== 0) {
        setMoving(true);
        setX(p => {
          let np = clamp(p + dx * speed, 80, WORLD_W - 80);
          const block = dolls.find(z => {
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

      // ===== Sleeping dolls: hearing detection =====
      // РЎРёРґСЏ РЅР° РєРѕСЂС‚РѕС‡РєР°С… вЂ” РїРѕР»РЅРѕСЃС‚СЊСЋ С‚РёС…Рѕ. РЎС‚РѕСЏ вЂ” СЃР»С‹С€Р°С‚. Р‘РµРіРѕРј вЂ” СЃР»С‹С€Р°С‚ РёР·РґР°Р»РµРєР°.
      // РЈСЃР»С‹С€Р°Р»Рё = РїСЂРѕСЃС‹РїР°СЋС‚СЃСЏ Рё СЃСЂР°Р·Сѓ РєСѓСЃР°СЋС‚ Р·Р° РѕРіСЂРѕРјРЅС‹Р№ СѓСЂРѕРЅ.
      if (!isCrouch && !hidingRef.current) {
        const hearRange = isRun ? 130 : (dx !== 0 ? 75 : 40) - (isNinja ? 10 : 0);
        for (let i = 0; i < dolls.length; i++) {
          const z = dolls[i];
          if (!z.sleeping || pickToyMonsterKind(z.name) === "bear") continue;
          if (killedRef.current.has(z.id) || wokenRef.current.has(z.id)) continue;
          if (Math.abs(z.x - xRef.current) < hearRange) {
            wokenRef.current.add(z.id);
            sfxGrowl();
            const dmg = 35 + level * 5 + (isRun ? 15 : 0);
            setHp(h => {
              const nh = Math.max(0, h - dmg);
              if (nh === 0) { sfxDeath(); setTimeout(() => setModal({ kind: "lose" }), 200); }
              return nh;
            });
            setShake(true);
            setTimeout(() => setShake(false), 600);
            setToast(`рџ± ${z.name} woke up and attacked! -${dmg} HP`);
            setTimeout(() => setToast(""), 2200);
            lastBiteRef.current = nowT;
            break;
          }
        }
      }

      // Contact damage вЂ” patrolling doll within bite range.
      const biteCD = isRun ? 500 : 800;
      const biteRange = (isCrouch ? 22 : (isRun ? 48 : 32)) - (isNinja ? 6 : 0);
      if (nowT - lastBiteRef.current > biteCD && !hidingRef.current) {
        for (let i = 0; i < dolls.length; i++) {
          const z = dolls[i];
          if (killedRef.current.has(z.id)) continue;
          // РЎРїСЏС‰РёРµ, РµС‰С‘ РЅРµ СЂР°Р·Р±СѓР¶РµРЅРЅС‹Рµ, РЅРµ РєСѓСЃР°СЋС‚ РїР°СЃСЃРёРІРЅРѕ.
          if (z.sleeping && !wokenRef.current.has(z.id) && pickToyMonsterKind(z.name) !== "bear") continue;
          if (Math.abs(pos[z.id] - xRef.current) < biteRange) {
            lastBiteRef.current = nowT;
            const base = 4 + Math.floor(Math.random() * 5);
            const dmg = base + (level * 2) + (isRun ? 3 : 0);
            sfxBite();
            setHp(h => {
              const nh = Math.max(0, h - dmg);
              if (nh === 0) { sfxDeath(); setTimeout(() => setModal({ kind: "lose" }), 200); }
              return nh;
            });
            setShake(true);
            setTimeout(() => setShake(false), 350);
            // Jumpscare вЂ” at most every 4s
            if (nowT - lastJumpscareRef.current > 4000) {
              lastJumpscareRef.current = nowT;
              setJumpscare(pickToyMonsterKind(z.name));
              setTimeout(() => setJumpscare(null), 650);
            }
            setToast(`рџ©ё ${z.name} Р°С‚Р°РєСѓРµС‚! -${dmg} HP${isRun ? " (noisy!)" : ""}`);
            setTimeout(() => setToast(""), 1200);
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, modal.kind, allKilled, level, dolls, EXIT_X, WORLD_W, zx]);

  // hint
  useEffect(() => {
    const id = setInterval(() => {
      const px = xRef.current;
      const z = dolls.find((z, i) => !killed.has(z.id) && Math.abs((zomPosRef.current[z.id] ?? zx(z, i)) - px) < REACH);
      if (z) { setHint(`[E] РћСЃС‚Р°РЅРѕРІРёС‚СЊ ${z.name}`); return; }
      const c = classrooms.find(c => !searched.has(c.id) && Math.abs(c.x - px) < REACH);
      if (c) { setHint(`[E] РћСЃРјРѕС‚СЂРµС‚СЊ В· ${c.name}`); return; }
      if (Math.abs(EXIT_X - px) < REACH) {
        setHint(allKilled ? (isFinalLevel ? "[E] Рљ РњР°С‚СЂРѕРЅРµ" : "[E] РџРѕРґРЅСЏС‚СЊСЃСЏ РІС‹С€Рµ") : "РџСѓС‚СЊ Р·Р°РєСЂС‹С‚");
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
    const z = modal.doll;
    if (ok) {
      setKilled(prev => new Set(prev).add(z.id));
      sfxKill();
      const reward = 10 + level * 5;
      setCoins(c => c + reward);
      setToast(`рџ’Ђ ${z.name} РѕСЃС‚Р°РЅРѕРІР»РµРЅР°! +${reward} рџЄ™`);
    } else {
      const dmg = Math.max(8, 25 - strength * 3);
      sfxBite();
      setHp(h => {
        const nh = Math.max(0, h - dmg);
        if (nh === 0) { sfxDeath(); setTimeout(() => setModal({ kind: "lose" }), 200); }
        return nh;
      });
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setToast(`рџ’ў РљСѓРєР»Р° СѓРґР°СЂРёР»Р° Р›Р°РЅСѓ! -${dmg} HP`);
    }
    setTimeout(() => setToast(""), 1800);
    setModal({ kind: "none" });
  }, [modal, strength]);

  // РџРѕРґРѕР±СЂР°С‚СЊ РїСЂРµРґРјРµС‚ РІРЅСѓС‚СЂРё СЃС†РµРЅС‹ РєР»Р°СЃСЃР°.
  const collectSpotItem = useCallback((loot: LootItem, _spot: SearchSpot) => {
    // Found bat вЂ” give a single-use stun weapon, hold it in hand.
    if (loot.name === "Baseball bat") {
      setBatLeft(n => {
        const nn = n + 1;
        setSave(s => { const ns = { ...s, owned: { ...s.owned, bat: nn } }; writeSave(ns); return ns; });
        return nn;
      });
      setToast("рџЏЏ Lana picked up a bat! 1 hit вЂ” press G near a doll.");
      setTimeout(() => setToast(""), 2200);
      setCoins(c => c + 10);
      return;
    }
    if (loot.strengthGain) setStrength(s => s + loot.strengthGain!);
    if (loot.givesFlashlight) {
      setFoundFlashlight(true);
      setBattery(b => Math.max(b, loot.battery ?? MAX_BATTERY));
      setToast(`рџ”¦ Found ${loot.name}! Now Lana can see in the dark.`);
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
      noise: loot.noise,
    };
    if (item.hp || item.food || item.battery || item.noise) {
      setInv(prev => [...prev, item]);
      const bonus = [
        item.hp ? `+${item.hp} HP` : null,
        item.food ? `+${item.food} рџЌґ` : null,
        item.battery ? `+${item.battery}% рџ”‹` : null,
      ].filter(Boolean).join(", ");
      setToast(`рџЋ’ ${loot.emoji} ${loot.name}${bonus ? ` (${bonus})` : ""}`);
    } else {
      setToast(`Found: ${loot.emoji} ${loot.name}${loot.strengthGain ? ` (+${loot.strengthGain} рџ’Є)` : ""}`);
    }
    setCoins(c => c + 3);
    setTimeout(() => setToast(""), 1600);
  }, []);

  // Р—Р°РєСЂС‹С‚СЊ РєРѕРјРЅР°С‚Сѓ вЂ” РїРѕРјРµС‚РёС‚СЊ РєР°Рє РѕР±С‹СЃРєР°РЅРЅСѓСЋ.
  const leaveClassroom = useCallback(() => {
    if (modal.kind !== "search") { setModal({ kind: "none" }); return; }
    const c = modal.classroom;
    setSearched(prev => new Set(prev).add(c.id));
    const note = storyNoteForRoom(c.id);
    const rescue = rescueForRoom(c.id);
    const foundNote = note && !storyNotes.has(note.id);
    const foundRescue = rescue && !rescued.has(rescue.id);
    if (foundNote || foundRescue) {
      const nextStoryNotes = new Set(storyNotes);
      const nextRescued = new Set(rescued);
      if (note) nextStoryNotes.add(note.id);
      if (rescue) nextRescued.add(rescue.id);
      setStoryNotes(nextStoryNotes);
      setRescued(nextRescued);
      const title = foundRescue && rescue ? `${rescue.name} Found` : note?.title ?? "A New Clue";
      const body = [
        foundNote ? note?.body : null,
        foundRescue ? rescue?.message : null,
      ].filter(Boolean).join("\n\n");
      setCheckpoint({
        level,
        x: xRef.current,
        label: title,
        killed: new Set(killed),
        searched: new Set([...searched, c.id]),
        storyNotes: nextStoryNotes,
        rescued: nextRescued,
      });
      setModal({ kind: "story", title, body });
      return;
    }
    setModal({ kind: "none" });
  }, [modal, rescued, storyNotes, level, killed, searched]);

  // РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ a specific item from the backpack.
  const useItem = useCallback((idx: number) => {
    const it = invRef.current[idx];
    if (!it) return;
    setInv(p => p.filter((_, i) => i !== idx));
    if (it.hp) setHp(h => Math.min(maxHp, h + it.hp));
    if (it.food) setHunger(h => Math.min(MAX_HUNGER, h + it.food));
    if (it.strength) setStrength(s => s + it.strength);
    if (it.battery) {
      if (!hasFlashlight) {
        setToast(`рџЄ« ${it.emoji} ${it.name}: РЅРµС‚ С„РѕРЅР°СЂРёРєР° вЂ” battery not needed now.`);
      } else {
        setBattery(b => Math.min(MAX_BATTERY, b + it.battery!));
        setToast(`рџ”‹ ${it.emoji} +${it.battery}% flashlight charge`);
      }
    } else {
      setToast(`рџ’Љ ${it.emoji} ${it.name} used`);
    }
    setTimeout(() => setToast(""), 1400);
  }, [maxHp, hasFlashlight]);

  // Auto-emergency-heal С‚РѕР»СЊРєРѕ РїСЂРё РєСЂРёС‚РёС‡РµСЃРєРѕРј HP.
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
      setToast(`рџ’Љ Auto: ${item.emoji} ${item.name} (+${item.hp} HP)`);
      setTimeout(() => setToast(""), 1800);
    }
  }, [hp, started, modal.kind, maxHp]);

  // Р“РѕР»РѕРґ tick вЂ” СѓР±С‹РІР°РµС‚ СЃРѕ РІСЂРµРјРµРЅРµРј, РїСЂРё 0 вЂ” РєСѓСЃР°РµС‚ РіРѕР»РѕРґ.
  useEffect(() => {
    if (!started || modal.kind === "lose" || modal.kind === "win") return;
    const id = setInterval(() => {
      if (modal.kind !== "none") return; // РЅРµ СѓР±С‹РІР°РµС‚ РІРѕ РІСЂРµРјСЏ Р·Р°РґР°РЅРёР№
      setHunger(h => {
        const nh = Math.max(0, h - 1);
        if (nh === 0) {
          // РіРѕР»РѕРґР°РµРј вЂ” С‚РµСЂСЏРµРј 2 HP
          setHp(hh => Math.max(0, hh - 2));
          setToast("рџЌґ Lana is hungry! -2 HP");
          setTimeout(() => setToast(""), 1200);
        }
        return nh;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [started, modal.kind]);

  // Р Р°Р·СЂСЏРґ Р±Р°С‚Р°СЂРµРё вЂ” С‚РѕР»СЊРєРѕ РєРѕРіРґР° С„РѕРЅР°СЂСЊ РіРѕСЂРёС‚ Рё С‚РµРјРЅРѕ (СЌС‚Р°Р¶ >= 2) РёР»Рё РјС‹ РІРЅСѓС‚СЂРё РєР»Р°СЃСЃР°.
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
          setToast("рџЄ« Battery died! Need a new one.");
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
    setStoryNotes(new Set());
    setRescued(new Set());
    setCheckpoint(null);
    setAmbientLine("");
    wokenRef.current = new Set();
    zomHomeRef.current = {};
    setModal({ kind: "none" });
    startTimeRef.current = Date.now();
    setScoreSubmitted(false);
    setStarted(true);
  };

  const openIntroStory = () => {
    setIntroStoryIndex(prev => {
      if (INTRO_STORIES.length <= 1) return 0;
      let next = Math.floor(Math.random() * INTRO_STORIES.length);
      if (next === prev) next = (next + 1) % INTRO_STORIES.length;
      return next;
    });
  };

  const submitMyScore = async (won: boolean) => {
    if (scoreSubmitted || submittingScore) return;
    setSubmittingScore(true);
    try {
      const name = (playerName || "Lana").trim().slice(0, 24) || "Lana";
      if (typeof window !== "undefined") localStorage.setItem("lana_player_name", name);
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await submitScore({
        name,
        coins: coins + (won ? ending.bonus : 0),
        levels_completed: won ? levels.length : level,
        time_seconds: elapsed,
        won,
      });
      setScoreSubmitted(true);
      setLeaderboardKey(k => k + 1);
      setToast("Р РµРєРѕСЂРґ РѕС‚РїСЂР°РІР»РµРЅ!");
    } catch (e: any) {
      setToast("РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё: " + (e?.message ?? "unknown"));
    } finally {
      setSubmittingScore(false);
      setTimeout(() => setToast(""), 2000);
    }
  };

  const buyOutfit = (o: Outfit) => {
    if (save.ownedOutfits.includes(o.id)) return;
    if (coins < o.price) { setToast("РќРµ С…РІР°С‚Р°РµС‚ РјРѕРЅРµС‚"); setTimeout(() => setToast(""), 1500); return; }
    const ownedOutfits = Array.from(new Set([...save.ownedOutfits, o.id]));
    const ns = { ...save, coins: coins - o.price, outfit: o.id, ownedOutfits };
    setCoins(ns.coins); setSave(ns); writeSave(ns);
    setToast(`РљСѓРїР»РµРЅРѕ: ${o.name}`); setTimeout(() => setToast(""), 1500);
  };
  const equipOutfit = (o: Outfit) => {
    if (!save.ownedOutfits.includes(o.id)) return;
    const ns = { ...save, outfit: o.id };
    setSave(ns); writeSave(ns);
  };
  const buyUpgrade = (u: Upgrade) => {
    if (coins < u.price) { setToast("РќРµ С…РІР°С‚Р°РµС‚ РјРѕРЅРµС‚"); setTimeout(() => setToast(""), 1500); return; }
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
  const buyCrystal = () => {
    if (coins < CRYSTAL_PRICE) {
      setToast("РќРµ С…РІР°С‚Р°РµС‚ РјРѕРЅРµС‚ РЅР° РєСЂРёСЃС‚Р°Р»Р»");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    const ns = { ...save, coins: coins - CRYSTAL_PRICE, crystals: (save.crystals ?? 0) + 1 };
    setCoins(ns.coins); setSave(ns); writeSave(ns);
    setToast("РљСЂРёСЃС‚Р°Р»Р» РєСѓРїР»РµРЅ");
    setTimeout(() => setToast(""), 1500);
  };

  const ending = storyNotes.size >= Object.keys(STORY_NOTES).length && rescued.size >= RESCUE_EVENTS.length
    ? {
        title: "РЎР•РљР Р•РўРќРђРЇ РљРћРќР¦РћР’РљРђ",
        body: "Р›Р°РЅР° СЃРїР°СЃР°РµС‚ РљР°СЂР»Р°, Р”РёРЅСѓ Рё РґРµС‚РµР№. РЎРѕР±СЂР°РЅРЅС‹Рµ Р·Р°РїРёСЃРєРё СЂР°СЃРєСЂС‹РІР°СЋС‚ С‚Р°Р№РЅСѓ С€РєРѕР»С‹, Рё РёРіСЂСѓС€РєРё РЅР°РєРѕРЅРµС† РѕС‚РїСѓСЃРєР°СЋС‚ С‚РµС…, РєРѕРіРѕ СѓРґРµСЂР¶РёРІР°Р»Рё.",
        bonus: 350,
      }
    : rescued.size >= 2
      ? {
          title: "РҐРћР РћРЁРђРЇ РљРћРќР¦РћР’РљРђ",
          body: "Р›Р°РЅР° РІС‹Р±РёСЂР°РµС‚СЃСЏ СЃ РґСЂСѓР·СЊСЏРјРё Рё РЅР°Р№РґРµРЅРЅС‹РјРё РґРµС‚СЊРјРё. Р”РІРµСЂРё С€РєРѕР»С‹ РѕС‚РєСЂС‹РІР°СЋС‚СЃСЏ, РЅРѕ Р·Р° СЃС‚РµРЅР°РјРё РµС‰С‘ РѕСЃС‚Р°СЋС‚СЃСЏ С€С‘РїРѕС‚С‹.",
          bonus: 250,
        }
      : {
          title: "РћР”РРќРћРљРђРЇ РљРћРќР¦РћР’РљРђ",
          body: "Р›Р°РЅР° РІС‹Р±РёСЂР°РµС‚СЃСЏ Р¶РёРІРѕР№, РЅРѕ С€РєРѕР»Р° СЃРѕС…СЂР°РЅСЏРµС‚ СЃР»РёС€РєРѕРј РјРЅРѕРіРѕ СЃРµРєСЂРµС‚РѕРІ. РџРѕР·Р°РґРё РёРіСЂСѓС€РєРё СЃРЅРѕРІР° Р·РѕРІСѓС‚ РґРµС‚РµР№.",
          bonus: 150,
        };

  if (!started) {
    const introFrames = introStoryIndex === null ? null : INTRO_CINEMATIC_VARIANTS[introStoryIndex % INTRO_CINEMATIC_VARIANTS.length];

    return (
      <div className="school-menu h-screen w-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 p-4 overflow-auto">
        <div className="max-w-2xl w-full space-y-3">
          <ScaryMenuScene />
          <div className="text-center py-4 border border-red-900/50 rounded bg-black/50">
            <h1 className="font-display text-2xl md:text-3xl tracking-widest text-red-500" style={{ textShadow: "0 0 16px rgba(216,34,30,0.45), 0 2px 0 #1a0000" }}>
              WELCOME BACK TO SCHOOL
            </h1>
            <p className="font-pixel text-xs text-zinc-400 mt-1 tracking-[0.3em]">РѕРЅРё РІСЃС‘ РµС‰С‘ Р¶РґСѓС‚ РґРµС‚РµР№вЂ¦</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="px-3 py-1 bg-amber-900/40 border border-amber-700 rounded font-pixel text-amber-200 flex items-center gap-2">
              <Coins className="h-4 w-4" /> {coins} РјРѕРЅРµС‚
            </div>
            <div className="px-3 py-1 bg-cyan-950/50 border border-cyan-700 rounded font-pixel text-cyan-200 flex items-center gap-2">
              в—† {save.crystals ?? 0} РєСЂРёСЃС‚.
            </div>
            <button onClick={() => setMusicOff(v => !v)}
              className="px-3 py-1 bg-black/40 border border-zinc-700 rounded font-pixel text-zinc-200 flex items-center gap-2 hover:bg-black/60"
              title="РњСѓР·С‹РєР° РІРєР»./off">
              {musicOff ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {musicOff ? "РњСѓР·С‹РєР° РІС‹РєР»." : "РњСѓР·С‹РєР° РІРєР»."}
            </button>
            {authEmail && (
              <div className="max-w-[220px] truncate px-3 py-1 bg-emerald-950/50 border border-emerald-700 rounded font-pixel text-emerald-200">
                {authEmail}
              </div>
            )}
          </div>


          <div className="flex gap-2 justify-center">
            {[
              { id: "play", label: "РРіСЂР°С‚СЊ", icon: ArrowUp },
              { id: "instructions", label: "РРЅСЃС‚СЂСѓРєС†РёСЏ", icon: HelpCircle },
              { id: "outfit", label: "РћР±СЂР°Р·С‹", icon: Shirt },
              { id: "shop", label: "РњР°РіР°Р·РёРЅ", icon: ShoppingBag },
              { id: "leaderboard", label: "Р РµРєРѕСЂРґС‹", icon: Trophy },
            ].map(t => (
              <button key={t.id} onClick={() => setMenuTab(t.id as typeof menuTab)}
                className={`px-4 py-2 rounded font-pixel text-sm flex items-center gap-2 border ${menuTab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-zinc-700 text-zinc-300"}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
            {authEmail ? (
              <button
                type="button"
                onClick={signOutPlayer}
                disabled={signingOut}
                className="px-4 py-2 rounded font-pixel text-sm flex items-center gap-2 border bg-black/40 border-zinc-700 text-zinc-300 hover:bg-black/60 hover:text-zinc-100 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" /> {signingOut ? "Р’С‹С…РѕРґРёРј" : "Р’С‹Р№С‚Рё"}
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded font-pixel text-sm flex items-center gap-2 border bg-black/40 border-zinc-700 text-zinc-300 hover:bg-black/60 hover:text-zinc-100"
              >
                <LogIn className="h-4 w-4" /> Р’РѕР№С‚Рё
              </Link>
            )}
          </div>

          {menuTab === "play" && (
            <div className="bg-black/40 rounded p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Р›Р°РЅР° РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ Р·Р° Р·Р°Р±С‹С‚С‹Рј СЂСЋРєР·Р°РєРѕРј. Р§Р°СЃС‹ РѕСЃС‚Р°РЅР°РІР»РёРІР°СЋС‚СЃСЏ, РґСЂСѓР·СЊСЏ РёСЃС‡РµР·Р°СЋС‚, Р° СЃС‚Р°СЂС‹Рµ РєСѓРєР»С‹ РЅР°С‡РёРЅР°СЋС‚ РѕС…СЂР°РЅСЏС‚СЊ С€РєРѕР»СЊРЅСѓСЋ С‚Р°Р№РЅСѓ.
              </p>
              <div className="flex justify-center">
                <Button size="lg" onClick={openIntroStory} className="font-display">РќРђР§РђРўР¬ РР“Р РЈ</Button>
              </div>
            </div>
          )}

          {menuTab === "instructions" && (
            <div className="bg-black/40 rounded p-4 space-y-3">
              <h2 className="font-display text-lg text-red-300 text-center">РРЅСЃС‚СЂСѓРєС†РёСЏ</h2>
              <div className="text-left text-[12px] grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                <p>рџЋ® <b>A/D</b> В· <b>в†ђ/в†’</b> вЂ” С…РѕРґСЊР±Р°</p>
                <p>рџЏѓ <b>Shift</b> вЂ” Р±РµРі, РЅРѕ РјРѕРЅСЃС‚СЂС‹ СЃР»С‹С€Р°С‚ С€СѓРј</p>
                <p>рџ¤« <b>C</b> / <b>Ctrl</b> вЂ” РїСЂРёСЃРµСЃС‚СЊ Рё РёРґС‚Рё С‚РёС€Рµ</p>
                <p>рџЋ’ <b>B</b> вЂ” РѕС‚РєСЂС‹С‚СЊ СЂСЋРєР·Р°Рє</p>
                <p>вљЎ <b>E</b> / <b>Enter</b> вЂ” РґРµР№СЃС‚РІРёРµ СЂСЏРґРѕРј СЃ РїСЂРµРґРјРµС‚РѕРј</p>
                <p>рџЏЏ <b>G</b> вЂ” РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ Р±РёС‚Сѓ СЂСЏРґРѕРј СЃ РєСѓРєР»РѕР№</p>
                <p>рџ§ё <b>T</b> вЂ” Р±СЂРѕСЃРёС‚СЊ РёРіСЂСѓС€РєСѓ, С‡С‚РѕР±С‹ РѕС‚РІР»РµС‡СЊ РјРѕРЅСЃС‚СЂР°</p>
                <p>рџљЄ <b>H</b> вЂ” СЃРїСЂСЏС‚Р°С‚СЊСЃСЏ РІ С€РєР°С„С‡РёРєРµ</p>
                <p>рџ†™ <b>Space</b> вЂ” РїРµСЂРµРїСЂС‹РіРЅСѓС‚СЊ СЃС‚РµРєР»Рѕ</p>
                <p>рџЌґ Р•РґР° РІРѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµС‚ СЃРёР»С‹, РіРѕР»РѕРґ РѕС‚РЅРёРјР°РµС‚ HP</p>
                <p>рџґ РЎРїСЏС‰РёРµ РєСѓРєР»С‹ РїСЂРѕСЃС‹РїР°СЋС‚СЃСЏ РѕС‚ РіСЂРѕРјРєРёС… С€Р°РіРѕРІ</p>
                <p>рџЊ‘ Р’ С‚С‘РјРЅС‹С… РєРѕСЂРёРґРѕСЂР°С… РЅСѓР¶РµРЅ С„РѕРЅР°СЂРёРє Рё Р±Р°С‚Р°СЂРµР№РєРё</p>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                РќР° РєР°Р¶РґРѕРј СЌС‚Р°Р¶Рµ РґСЂСѓРіРѕР№ РІСЂР°Рі: РјРµРґРІРµРґСЊ, Р±Р°Р»РµСЂРёРЅР°, РѕР±РµР·СЊСЏРЅР°, РєР»РѕСѓРЅ Рё СЃРµРјСЊСЏ РњР°С‚СЂРѕРЅС‹.
              </p>
            </div>
          )}

          {menuTab === "outfit" && (
            <div className="bg-black/40 rounded p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {OUTFITS.map(o => {
                const owned = o.price === 0 || save.ownedOutfits.includes(o.id);
                const equipped = save.outfit === o.id;
                return (
                  <div key={o.id} className={`p-3 rounded border ${equipped ? "border-primary bg-primary/10" : "border-zinc-700 bg-black/40"} flex flex-col items-center gap-2`}>
                    <MenuArtCharacter kind="lana" size={135} facing={1} motion="idle" />
                    <div className="text-xs font-pixel text-center">{o.name}</div>
                    {equipped
                      ? <div className="text-[10px] text-primary font-pixel">РќРђР”Р•РўРћ</div>
                      : owned
                        ? <Button size="sm" variant="secondary" onClick={() => equipOutfit(o)}>РќР°РґРµС‚СЊ</Button>
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
              <div className="flex items-center gap-3 p-2 border border-cyan-700 rounded bg-cyan-950/25">
                <div className="h-6 w-6 text-cyan-200 flex items-center justify-center text-lg">в—†</div>
                <div className="flex-1">
                  <div className="font-pixel text-sm">РљСЂРёСЃС‚Р°Р»Р» РІРѕР·СЂРѕР¶РґРµРЅРёСЏ <span className="text-cyan-300">Г—{save.crystals ?? 0}</span></div>
                  <div className="text-[11px] text-muted-foreground">РќСѓР¶РµРЅ, С‡С‚РѕР±С‹ РІРѕР·СЂРѕРґРёС‚СЊСЃСЏ Сѓ РїРѕСЃР»РµРґРЅРµР№ С‚РѕС‡РєРё РїРѕСЃР»Рµ РїРѕСЂР°Р¶РµРЅРёСЏ.</div>
                </div>
                <Button size="sm" disabled={coins < CRYSTAL_PRICE} onClick={buyCrystal}>
                  <Coins className="h-3 w-3 mr-1" /> {CRYSTAL_PRICE}
                </Button>
              </div>
              {UPGRADES.map(u => {
                const I = u.icon;
                const cur = u.id === "bat" || u.id === "gun" ? (save.owned[u.id] as number) : (save.owned[u.id] ? 1 : 0);
                const maxed = u.id === "bat" || u.id === "gun" ? cur >= (u.max ?? 5) : cur >= 1;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 border border-zinc-700 rounded bg-black/40">
                    <I className="h-6 w-6 text-amber-300" />
                    <div className="flex-1">
                      <div className="font-pixel text-sm">{u.name} {(u.id === "bat" || u.id === "gun") && <span className="text-amber-300">Г—{cur}</span>}</div>
                      <div className="text-[11px] text-muted-foreground">{u.desc}</div>
                    </div>
                    <Button size="sm" disabled={maxed || coins < u.price} onClick={() => buyUpgrade(u)}>
                      {maxed ? "РљСѓРїР»РµРЅРѕ" : <><Coins className="h-3 w-3 mr-1" /> {u.price}</>}
                    </Button>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground text-center pt-1">РџРѕРєСѓРїРєРё СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РјРµР¶РґСѓ РёРіСЂР°РјРё.</p>
            </div>
          )}

          {menuTab === "leaderboard" && (
            <div className="bg-black/40 rounded p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400 font-pixel shrink-0">РРјСЏ:</label>
                <Input
                  value={playerName}
                  maxLength={24}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (typeof window !== "undefined") localStorage.setItem("lana_player_name", e.target.value);
                  }}
                  className="h-8 text-sm"
                  placeholder="Lana"
                />
                <Button size="sm" variant="secondary" onClick={() => setLeaderboardKey(k => k + 1)}>в†»</Button>
              </div>
              <Leaderboard refreshKey={leaderboardKey} />
              <p className="text-[10px] text-muted-foreground text-center">
                РўРѕРї-20 РёРіСЂРѕРєРѕРІ РїРѕ РјРѕРЅРµС‚Р°Рј. Р РµРєРѕСЂРґ РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ РїРѕСЃР»Рµ РїРѕР±РµРґС‹ РёР»Рё РїРѕСЂР°Р¶РµРЅРёСЏ.
              </p>
            </div>
          )}
        </div>
        {introFrames && (
          <IntroCinematic
            frames={introFrames}
            onShuffle={openIntroStory}
            onClose={() => setIntroStoryIndex(null)}
            onStart={() => { setIntroStoryIndex(null); beginGame(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`school-horror-shell h-screen w-screen overflow-hidden bg-black text-foreground relative select-none ${shake ? "shake" : ""}`}>
      {/* Jumpscare overlay */}
      {jumpscare && (
        <div className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at center, rgba(120,0,0,0.55), rgba(0,0,0,0.95) 70%)",
            animation: "shake 0.5s",
          }}>
          <div style={{
            transform: "scale(2.4)",
            filter: "drop-shadow(0 0 40px rgba(220,20,20,0.9)) contrast(1.4) saturate(1.4)",
            animation: "scale-in 0.18s ease-out",
          }}>
            <MenuArtMonster kind={jumpscare} size={300} boss facing={1} />
          </div>
          <div className="absolute inset-0" style={{
            background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 4px)",
            mixBlendMode: "multiply",
          }} />
        </div>
      )}
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MenuArtCharacter kind="lana" size={70} />
          <div>
            <div className="font-display text-sm text-primary">LANA</div>
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
              <span className="flex items-center gap-1"><Utensils className="h-3 w-3 text-amber-300" /> Р“РѕР»РѕРґ</span>
              <span className={`font-mono ${hunger < 25 ? "text-red-400 animate-pulse" : "text-amber-200"}`}>{hunger}</span>
            </div>
            <div className="h-2 bg-black/60 rounded border border-amber-700/40 overflow-hidden">
              <div className={`h-full transition-all ${hunger < 25 ? "bg-red-500" : "bg-gradient-to-r from-amber-500 to-yellow-300"}`} style={{ width: `${(hunger / MAX_HUNGER) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          <div className="flex gap-3 justify-end flex-wrap">
            <span className="text-amber-300">рџЏ« Floor {cur.id}/{levels.length}</span>
            <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-amber-300" />{coins}</span>
            <span className="text-cyan-200" title="РљСЂРёСЃС‚Р°Р»Р»С‹ РІРѕР·СЂРѕР¶РґРµРЅРёСЏ">в—† {save.crystals ?? 0}</span>
            <span title="Bat (G)">рџЏЏ {batLeft}</span>
            <span title="Pistol (F)">рџ”« {gunLeft}</span>
            {hasFlashlight && (
              <span title={`Flashlight В· battery ${battery}%`} className={`flex items-center gap-1 ${battery === 0 ? "text-red-400 animate-pulse" : (battery < 25 ? "text-amber-400" : "text-amber-200")}`}>
                <Flashlight className="h-3 w-3 inline" />
                {battery > 25 ? <BatteryFull className="h-3 w-3 inline" /> : <BatteryLow className="h-3 w-3 inline" />}
                {battery}%
              </span>
            )}
            <span>рџ’Ђ {killed.size}/{dolls.length}</span>
            <span>рџ”Ќ {searched.size}/{classrooms.length}</span>
            <span title="РќР°Р№РґРµРЅРЅС‹Рµ Р·Р°РїРёСЃРєРё">Notes {storyNotes.size}/{Object.keys(STORY_NOTES).length}</span>
            <span title="РЎРїР°СЃС‘РЅРЅС‹Рµ РґСЂСѓР·СЊСЏ Рё РґРµС‚Рё">Saved {rescued.size}/{RESCUE_EVENTS.length}</span>
            <span className={crouching ? "text-emerald-400" : (running ? "text-red-400" : "text-zinc-500")} title={crouching ? "РџСЂРёСЃРµР»Р° вЂ” quiet" : (running ? "Р‘РµР¶РёС‚ вЂ” noisy" : "РҐРѕРґСЊР±Р°")}>
              {crouching ? <ArrowDown className="h-3 w-3 inline" /> : (running ? <Volume2 className="h-3 w-3 inline" /> : <VolumeX className="h-3 w-3 inline" />)}
            </span>
          </div>
          <div className="flex gap-1 justify-end items-center min-h-[18px]">
            <button onClick={() => setModal({ kind: "backpack" })}
              className="flex items-center gap-1 text-[10px] text-amber-200 hover:text-amber-100 bg-black/60 border border-amber-700/60 rounded px-2 py-0.5 font-pixel">
              <Backpack className="h-3 w-3" /> Р СЋРєР·Р°Рє [B] В· {inv.length}
            </button>
            {inv.slice(0, 5).map((it, i) => (
              <span key={it.id + i} title={`${it.name}${it.hp ? ` +${it.hp} HP` : ""}${it.food ? ` +${it.food} рџЌґ` : ""}`}
                className="bg-black/60 border border-amber-700/60 rounded px-1 text-sm leading-none">
                {it.emoji}
              </span>
            ))}
            {inv.length > 5 && <span className="text-[10px] text-amber-300">+{inv.length - 5}</span>}
            <button onClick={beginGame}
              title="Р—Р°РЅРѕРІРѕ"
              className="ml-2 flex items-center gap-1 text-[10px] text-amber-200 hover:text-amber-100 bg-black/60 border border-amber-700/60 rounded px-2 py-0.5 font-pixel">
              в†» Р—Р°РЅРѕРІРѕ
            </button>
            {checkpoint && (
              <span className="text-[10px] text-emerald-300 bg-black/60 border border-emerald-700/60 rounded px-2 py-0.5 font-pixel">
                РўРѕС‡РєР°: {checkpoint.label}
              </span>
            )}
            <button onClick={() => { setStarted(false); setMenuTab("play"); setModal({ kind: "none" }); }}
              title="Р’ РјРµРЅСЋ"
              className="flex items-center gap-2 text-[13px] text-red-100 hover:text-white bg-red-950/80 border-2 border-red-500/80 rounded px-4 py-2 font-pixel shadow-[0_0_16px_rgba(127,29,29,0.35)]">
              вњ• РњРµРЅСЋ
            </button>
          </div>
          {allKilled && <div className="text-emerald-400 font-bold animate-pulse">
            в†’ {isFinalLevel ? "Рљ РњР°С‚СЂРѕРЅРµ!" : "РќР°РІРµСЂС…!"}
          </div>}
        </div>
      </div>


      {/* Corridor */}
      <div ref={viewportRef} className="absolute inset-0 pt-16 school-horror-viewport">
        <div className="relative h-full" style={{ width: WORLD_W, transform: `translateX(${-cam}px)` }}>
          {/* Sky / outdoors visible at exit */}
          <div className="absolute inset-0 school-wall-bg" style={{
            background: "linear-gradient(180deg, #1a1825 0%, #221820 50%, #181018 100%)",
          }} />
          {/* Floor */}
          <div className="absolute left-0 right-0 school-floor-bg" style={{ top: FLOOR_Y + 30, height: VIEW_H - FLOOR_Y - 30,
            background: "repeating-linear-gradient(90deg, #2a1f1a 0 60px, #1f1612 60px 120px)",
            boxShadow: "inset 0 4px 0 #0a0606" }} />
          {/* Ceiling */}
          <div className="absolute left-0 right-0 school-ceiling-bg" style={{ top: 0, height: CEIL_Y - 16,
            background: "linear-gradient(180deg,#0a0a14, #1a1a26)", boxShadow: "inset 0 -3px 0 #000" }} />
          {/* Wall stripe */}
          <div className="absolute left-0 right-0" style={{ top: CEIL_Y - 16, height: 8, background: "#3a2a2a" }} />

          {/* Flickering lights */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="absolute flicker" style={{
              left: 220 + i * 640, top: CEIL_Y - 8, width: 60, height: 14,
              background: "radial-gradient(ellipse, #ffeb3b 0%, #ffb84d 40%, transparent 70%)",
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
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400 text-3xl font-bold">вњ“</div>
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
                {allKilled ? (isFinalLevel ? "EXIT OPEN" : "STAIRS в–І") : (isFinalLevel ? "EXIT в›”" : "STAIRS в›”")}
              </div>
              {isFinalLevel
                ? <DoorClosed className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-white/60" />
                : <ArrowUp className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-emerald-300" />}
            </div>
          </div>

          {/* Glass shard obstacles */}
          {(cur.obstacles ?? []).map(o => (
            <div key={o.id} className="absolute pointer-events-none" style={{ left: o.x - 22, top: FLOOR_Y + 4, width: 44, height: 22 }}>
              <svg viewBox="0 0 44 22" width={44} height={22}>
                <polygon points="2,20 10,4 14,20" fill="#c8e8f0" stroke="#fff" strokeWidth="0.5" opacity="0.9" />
                <polygon points="14,20 22,2 28,20" fill="#a8d8e8" stroke="#fff" strokeWidth="0.5" opacity="0.85" />
                <polygon points="28,20 36,6 42,20" fill="#c8e8f0" stroke="#fff" strokeWidth="0.5" opacity="0.9" />
                <polygon points="6,20 8,12 11,20" fill="#fff" opacity="0.5" />
              </svg>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-pixel text-cyan-200 animate-pulse">вљ  glass</div>
            </div>
          ))}

          {/* Hide spots вЂ” lockers along the wall */}
          {(cur.hideSpots ?? []).map(s => {
            const near = Math.abs(s.x - x) < REACH;
            const inUse = hiding === s.id;
            return (
              <div key={s.id} className="absolute" style={{ left: s.x - 22, top: FLOOR_Y - 130 }}>
                <div className="relative" style={{ width: 44, height: 130 }}>
                  {/* locker body */}
                  <div className="absolute inset-0 border-2 border-zinc-900"
                    style={{ background: "linear-gradient(180deg,#4a5a4a,#2a3a2a)", boxShadow: "inset -3px -3px 0 #1a2218, inset 3px 3px 0 #6a7a68" }} />
                  {/* slats */}
                  <div className="absolute left-1 right-1 top-3 h-1 bg-black/50" />
                  <div className="absolute left-1 right-1 top-6 h-1 bg-black/50" />
                  <div className="absolute left-1 right-1 top-9 h-1 bg-black/50" />
                  {/* handle */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-amber-400" />
                  {/* door split */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/70" />
                  {inUse && (
                    <div className="absolute inset-0 flex items-center justify-center text-[18px]">рџ‘ЃпёЏ</div>
                  )}
                  {near && !inUse && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/80 text-emerald-200 text-[9px] px-1 rounded font-pixel whitespace-nowrap">
                      [H] Hide
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thrown toy lure marker */}
          {lure && (
            <div className="absolute" style={{ left: lure.x - 14, top: FLOOR_Y - 20, width: 28, height: 28 }}>
              <div className="relative w-full h-full flex items-center justify-center text-[22px] animate-pulse"
                style={{ filter: "drop-shadow(0 0 6px #ffd23a)" }}>
                {lure.emoji}
              </div>
              {/* sound rings */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/70 animate-ping" style={{ width: 60, height: 60 }} />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-pixel text-amber-200">в™Є в™« в™Є</div>
            </div>
          )}



          {/* Dolls */}
          {dolls.map((z) => {
            const monsterKind = pickToyMonsterKind(z.name);
            if (killed.has(z.id)) {
              return (
                <div key={z.id} className="absolute opacity-60" style={{ left: z.x - 34, top: FLOOR_Y - 24, transform: "rotate(90deg)" }}>
                  <MenuArtMonster kind={monsterKind} size={96} motion="idle" />
                </div>
              );
            }
            const isSleeping = !!z.sleeping && !wokenRef.current.has(z.id);
            if (isSleeping) {
              return (
                <div key={z.id} className="absolute" style={{ left: z.x - 34, top: FLOOR_Y - 86 }}>
                  {/* tilted up, looking at ceiling */}
                  <div style={{ transform: "rotate(-18deg)", transformOrigin: "50% 90%" }}>
                    <MenuArtMonster kind={monsterKind} size={96} facing={1} motion="idle" />
                  </div>
                  {/* Zzz */}
                  <div className="absolute -top-6 left-10 text-blue-200 font-pixel text-sm animate-pulse drop-shadow">
                    Zzz
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-900/80 text-blue-100 text-[9px] px-1 rounded font-pixel flex items-center gap-1 whitespace-nowrap">
                    рџґ {z.name}
                  </div>
                </div>
              );
            }
            const zCur = zomPosRef.current[z.id] ?? z.x;
            return (
              <div key={z.id} className="absolute doll-walk" style={{
                left: zCur - 34, top: FLOOR_Y - 86, transition: "left 0.08s linear",
                filter: "drop-shadow(0 0 10px rgba(180,10,10,0.65)) drop-shadow(0 6px 6px rgba(0,0,0,0.9)) contrast(1.15) saturate(1.2)",
              }}>
                <MenuArtMonster
                  kind={monsterKind}
                  size={monsterKind === "clown" ? 128 : monsterKind === "bear" ? 118 : 104}
                  facing={zCur > x ? -1 : 1}
                  motion={monsterKind === "clown" || monsterKind === "monkey" ? "run" : "walk"}
                />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-100 text-[9px] px-1 rounded font-pixel flex items-center gap-1 whitespace-nowrap">
                  <TaskIcon kind={z.kind} className="h-3 w-3" />
                  {z.name} В· {monsterBehaviorLabel(monsterKind)}
                </div>
              </div>
            );
          })}

          {/* Lana */}
          <div className="absolute" style={{ left: x - 28, top: FLOOR_Y - 70 - jumpY, transition: jumpY === 0 ? "top 0.1s" : "none", opacity: 1 }}>
            {hiding && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/85 text-emerald-200 text-[9px] px-2 py-0.5 rounded font-pixel whitespace-nowrap">
                рџљЄ Hidden вЂ” H to leave
              </div>
            )}
            <LanaSpeech side={facing === 1 ? "left" : "right"} />
            <div className={hp < maxHp * 0.28 ? "lana-scared" : (moving ? "lana-walk" : "lana-idle")}
              style={crouching ? { transform: "scaleY(0.7) translateY(18px)", transformOrigin: "50% 100%" } : undefined}>
              <MenuArtCharacter kind="lana" facing={facing} size={150} scared={hp < maxHp * 0.28} motion={hp < maxHp * 0.28 ? "scared" : running ? "run" : moving ? "walk" : "idle"} />
              {batLeft > 0 && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: 26,
                    left: facing === 1 ? 36 : -14,
                    fontSize: 26,
                    lineHeight: 1,
                    transform: `scaleX(${facing}) rotate(${facing === 1 ? -25 : 25}deg)`,
                    transformOrigin: "50% 100%",
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
                  }}
                  title="Bat вЂ” 1 hit (G)"
                >
                  рџЏЏ
                </div>
              )}
            </div>
            {crouching && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-900/80 text-emerald-100 text-[9px] px-1 rounded font-pixel">рџ¤« quiet</div>
            )}
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none scanlines" />
        </div>
      </div>

      {/* Darkness overlay вЂ” 2-3 СЌС‚Р°Р¶. РЎ РІРєР»СЋС‡С‘РЅРЅС‹Рј С„РѕРЅР°СЂС‘Рј вЂ” Р±РѕР»СЊС€РѕР№ РєРѕРЅСѓСЃ, РёРЅР°С‡Рµ вЂ” РєСЂРѕС€РµС‡РЅС‹Р№ РєСЂСѓР¶РѕРє. */}
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
            ? "рџЊ‘ Dark! РќР°Р№РґРё С„РѕРЅР°СЂРёРє РІ РєР»Р°СЃСЃРµ РёР»Рё РєСѓРїРё РІ РјР°РіР°Р·РёРЅРµ В· РёРґРё С‚РёС…Рѕ"
            : "рџЄ« Battery died! РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ a new one from backpack [B]"}
        </div>
      )}

      {/* РџРѕРґСЃРєР°Р·РєР° + toast */}
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
      {ambientLine && modal.kind === "none" && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 bg-black/90 border border-red-700/50 text-red-100 px-4 py-2 rounded font-pixel text-xs tracking-wide shadow-[0_0_24px_rgba(127,29,29,0.45)]">
          {ambientLine}
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

            {modal.kind === "story" && (
              <div className="space-y-4 text-center max-w-lg mx-auto">
                <div className="mx-auto w-28 h-28 border-2 border-red-800 bg-black/70 rounded flex items-center justify-center shadow-[0_0_24px_rgba(127,29,29,0.45)] overflow-hidden">
                  <StoryPortrait title={modal.title} />
                </div>
                <div>
                  <h2 className="font-display text-xl text-red-300">{modal.title}</h2>
                  <p className="mt-3 text-sm text-zinc-200 whitespace-pre-line leading-relaxed">{modal.body}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-pixel">
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">
                    Notes<br /><span className="text-amber-300">{storyNotes.size}/{Object.keys(STORY_NOTES).length}</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">
                    Saved<br /><span className="text-emerald-300">{rescued.size}/{RESCUE_EVENTS.length}</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">
                    Checkpoint<br /><span className="text-primary">{checkpoint?.label ?? "none"}</span>
                  </div>
                </div>
                <Button onClick={() => setModal({ kind: "none" })}>Keep moving</Button>
              </div>
            )}

            {modal.kind === "task" && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MenuArtMonster kind={pickToyMonsterKind(modal.doll.name)} size={86} />
                  <div>
                    <h2 className="font-display text-lg text-red-400">{modal.doll.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TaskIcon kind={modal.doll.kind} className="h-3 w-3" />
                      {monsterBehaviorLabel(pickToyMonsterKind(modal.doll.name))} В· СЂРµС€Рё Р»С‘РіРєРѕРµ Р·Р°РґР°РЅРёРµ, С‡С‚РѕР±С‹ РІС‹Р¶РёС‚СЊ
                    </p>
                  </div>
                </div>
                <HintBox kind={modal.doll.kind} advanced={save.owned.hint} />
                {TIME_LIMITS[modal.doll.kind] !== null && (
                  <TaskTimer
                    key={modal.doll.id}
                    seconds={TIME_LIMITS[modal.doll.kind] as number}
                    onTimeout={() => finishTask(false)}
                  />
                )}
                {modal.doll.kind === "wires" && <WiresGame onDone={finishTask} />}
                {modal.doll.kind === "download" && <DownloadGame onDone={finishTask} />}
                {modal.doll.kind === "reactor" && <ReactorGame onDone={finishTask} />}
                {modal.doll.kind === "trash" && <TrashGame onDone={finishTask} />}
                {modal.doll.kind === "switches" && <SwitchesGame onDone={finishTask} />}
                {modal.doll.kind === "quiz" && <QuizGame onDone={finishTask} levelName={cur.name} dollName={modal.doll.name} />}
                {modal.doll.kind === "aim" && <AimGame onDone={finishTask} />}
              </div>
            )}

            {modal.kind === "search" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-primary">{modal.classroom.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Р’ РєР»Р°СЃСЃРµ РјРѕР¶РЅРѕ РЅР°Р№С‚Рё С„РѕРЅР°СЂРёРєРё, Р±Р°С‚Р°СЂРµР№РєРё, РµРґСѓ Рё Р°РїС‚РµС‡РєРё. Р—Р° РѕРєРЅРѕРј С‚РµРїРµСЂСЊ С‚РѕР»СЊРєРѕ СЃС‚Р°СЂС‹Рµ РєСѓРєР»С‹.
                    </p>
                  </div>
                  <div className="text-[11px] font-pixel text-amber-200 flex items-center gap-2">
                    {hasFlashlight ? (
                      <span className={`flex items-center gap-1 ${battery > 0 ? "text-amber-200" : "text-red-400 animate-pulse"}`}>
                        {battery > 25 ? <BatteryFull className="h-4 w-4" /> : <BatteryLow className="h-4 w-4" />}
                        рџ”¦ {battery}%
                      </span>
                    ) : (
                      <span className="text-red-300">рџ”¦ РЅРµС‚ С„РѕРЅР°СЂРёРєР°</span>
                    )}
                  </div>
                </div>
                <ClassroomScene
                  classroom={modal.classroom}
                  levelId={cur.id}
                  hasFlashlight={hasFlashlight}
                  batteryPct={battery}
                  onCollect={(loot, spot) => {
                    if (loot.emoji === "рџљЄ") {
                      // С‚СЂРёРіРіРµСЂ "РґРІРµСЂСЊ РѕС‚РєСЂС‹С‚Р°" вЂ” РґР°С‘Рј РЅР°РіСЂР°РґСѓ
                      setCoins(c => c + 15);
                      return;
                    }
                    if (loot.emoji === "рџ—ќ") {
                      // РєР»СЋС‡ вЂ” РЅРµ РєР»Р°РґС‘Рј РІ СЂСЋРєР·Р°Рє, РїСЂРѕСЃС‚Рѕ Р±РѕРЅСѓСЃ
                      setCoins(c => c + 5);
                      return;
                    }
                    if (loot.emoji === "рџЏЏ") {
                      // Р±РёС‚Р° РёР· РєР»Р°СЃСЃР° вЂ” РѕРґРЅРѕСЂР°Р·РѕРІР°СЏ, РЅРµ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РјРµР¶РґСѓ Р·Р°Р±РµРіР°РјРё
                      setBatLeft(n => n + 1);
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
                  <h3 className="font-display text-lg text-red-400">Р¤Р°СЂС„РѕСЂРѕРІР°СЏ РњР°С‚СЂРѕРЅР° Р¶РґС‘С‚ Сѓ РІС‹С…РѕРґР°</h3>
                  <p>"I kept them safe, Lana. Why would you take them into the dark outside?"</p>
                  <Button onClick={() => setModal({ kind: "boss" })}>Р’РѕР№С‚Рё</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                  <ArrowUp className="h-12 w-12 text-emerald-400" />
                  <h3 className="font-display text-lg text-emerald-400">Р›РµСЃС‚РЅРёС†Р° РЅР° СЃР»РµРґСѓСЋС‰РёР№ СЌС‚Р°Р¶</h3>
                  <p>Floor {cur.id} РїСЂРѕР№РґРµРЅ. РџРѕРґРЅРёРјР°Р№СЃСЏ РІС‹С€Рµ.</p>
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
                    setToast(`в–І Floor ${cur.id + 1}`);
                    setTimeout(() => setToast(""), 1800);
                  }}>РџРѕРґРЅСЏС‚СЊСЃСЏ в–І</Button>
                </div>
              )
            )}

            {modal.kind === "doorTask" && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <DoorClosed className="h-10 w-10 text-amber-400" />
                  <div>
                    <h2 className="font-display text-lg text-amber-300">Р—Р°РјРѕРє РґРІРµСЂРё</h2>
                    <p className="text-xs text-muted-foreground">РЎРѕРµРґРёРЅРё РїСЂРѕРІРѕРґР°, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РїСѓС‚СЊ Рє С„Р°СЂС„РѕСЂРѕРІРѕР№ РєСѓРєР»Рµ.</p>
                  </div>
                </div>
                <HintBox kind="wires" advanced={save.owned.hint} />
                <TaskTimer seconds={45} onTimeout={() => {
                  setHp(h => Math.max(0, h - 15));
                  setShake(true); setTimeout(() => setShake(false), 400);
                  setToast("рџ©ё A doll crept up at the door! -15 HP");
                  setTimeout(() => setToast(""), 1600);
                  setModal({ kind: "none" });
                }} />
                <WiresGame onDone={(ok) => {
                  if (ok) { setToast("рџљЄ Door open!"); setTimeout(() => setToast(""), 1500); setModal({ kind: "boss" }); }
                  else { setHp(h => Math.max(0, h - 10)); setModal({ kind: "none" }); }
                }} />
              </div>
            )}

            {modal.kind === "boss" && (
              <BossEncounter levelName={cur.name} onWin={() => setModal({ kind: "win" })} onLose={() => setModal({ kind: "lose" })} />
            )}

            {modal.kind === "backpack" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <Backpack className="h-7 w-7 text-amber-300" />
                  <div>
                    <h2 className="font-display text-lg text-amber-300">Р СЋРєР·Р°Рє Р›Р°РЅС‹</h2>
                    <p className="text-xs text-muted-foreground">РСЃРїРѕР»СЊР·СѓР№ РїСЂРµРґРјРµС‚С‹, С‡С‚РѕР±С‹ Р»РµС‡РёС‚СЊСЃСЏ, РµСЃС‚СЊ РёР»Рё СЃС‚Р°РЅРѕРІРёС‚СЊСЃСЏ СЃРёР»СЊРЅРµРµ.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/40 border border-red-700/40 rounded p-2 text-center">
                    <div className="text-red-300">HP</div><div className="font-mono">{hp}/{maxHp}</div>
                  </div>
                  <div className="bg-black/40 border border-amber-700/40 rounded p-2 text-center">
                    <div className="text-amber-300">Р“РѕР»РѕРґ</div><div className="font-mono">{hunger}/{MAX_HUNGER}</div>
                  </div>
                  <div className="bg-black/40 border border-emerald-700/40 rounded p-2 text-center">
                    <div className="text-emerald-300">Strength</div><div className="font-mono">Г—{strength}</div>
                  </div>
                </div>
                {hasFlashlight && (
                  <div className="bg-black/40 border border-amber-600/40 rounded p-2 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2"><Flashlight className="h-4 w-4 text-amber-200" /> Flashlight</span>
                    <span className={`font-mono ${battery === 0 ? "text-red-400" : battery < 25 ? "text-amber-400" : "text-amber-200"}`}>
                      рџ”‹ {battery}%
                    </span>
                  </div>
                )}
                {inv.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">Р СЋРєР·Р°Рє РїСѓСЃС‚. РС‰Рё РїСЂРµРґРјРµС‚С‹ РІ РєР»Р°СЃСЃР°С….</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                    {inv.map((it, idx) => (
                      <div key={it.id} className="flex items-center gap-2 p-2 bg-black/40 border border-amber-700/40 rounded">
                        <div className="text-2xl">{it.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-pixel truncate">{it.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {it.hp ? `+${it.hp} HP ` : ""}
                            {it.food ? `+${it.food} рџЌґ ` : ""}
                            {it.strength ? `+${it.strength} рџ’Є ` : ""}
                            {it.battery ? `+${it.battery}% рџ”‹` : ""}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => useItem(idx)}>РСЃРїРѕР»СЊР·РѕРІР°С‚СЊ</Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setModal({ kind: "none" })}>Р—Р°РєСЂС‹С‚СЊ</Button>
                </div>
              </div>
            )}

            {modal.kind === "win" && (
              <div className="text-center space-y-4">
                <h2 className="font-display text-2xl text-emerald-400">{ending.title}</h2>
                <p>{ending.body}</p>
                <div className="flex justify-center"><MenuArtCharacter kind="lana" size={140} scared /></div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-pixel">
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">Notes<br /><span className="text-amber-300">{storyNotes.size}/{Object.keys(STORY_NOTES).length}</span></div>
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">Saved<br /><span className="text-emerald-300">{rescued.size}/{RESCUE_EVENTS.length}</span></div>
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">Bonus<br /><span className="text-primary">+{ending.bonus}</span></div>
                </div>
                <p className="text-amber-300 font-pixel">Р‘РѕРЅСѓСЃ РєРѕРЅС†РѕРІРєРё: +{ending.bonus} coins</p>
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={playerName}
                    maxLength={24}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="h-8 text-sm max-w-[180px]"
                    placeholder="Your name"
                    disabled={scoreSubmitted}
                  />
                  <Button size="sm" variant="secondary" disabled={scoreSubmitted || submittingScore}
                    onClick={() => submitMyScore(true)}>
                    <Trophy className="h-3 w-3 mr-1" />
                    {scoreSubmitted ? "Submitted" : "To records"}
                  </Button>
                </div>
                <Button onClick={() => {
                  setCoins(c => c + ending.bonus);
                  setStarted(false); setMenuTab(scoreSubmitted ? "leaderboard" : "play"); setModal({ kind: "none" });
                }}>РњРµРЅСЋ</Button>
              </div>
            )}

            {modal.kind === "lose" && (
              <div className="text-center space-y-4">
                <Skull className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="font-display text-2xl text-red-400">Р›Р°РЅР° РЅРµ СЃРјРѕРіР»Р° РІС‹Р±СЂР°С‚СЊСЃСЏ</h2>
                <p className="text-sm text-zinc-200">
                  РљСѓРєР»С‹ СЃРЅРѕРІР° Р·Р°РєСЂС‹Р»Рё РєРѕСЂРёРґРѕСЂ. Р’С‹Р±РµСЂРё, С‡С‚Рѕ РґРµР»Р°С‚СЊ РґР°Р»СЊС€Рµ.
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-pixel">
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">
                    Р­С‚Р°Р¶<br /><span className="text-amber-300">{cur.id}/{levels.length}</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-700 rounded p-2">
                    РњРѕРЅРµС‚С‹<br /><span className="text-amber-300">{coins}</span>
                  </div>
                  <div className="bg-black/40 border border-cyan-700 rounded p-2">
                    РљСЂРёСЃС‚Р°Р»Р»С‹<br /><span className="text-cyan-300">в—† {save.crystals ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  РљСЂРёСЃС‚Р°Р»Р»С‹ РїРѕРєСѓРїР°СЋС‚СЃСЏ РІ РјР°РіР°Р·РёРЅРµ Р·Р° РјРѕРЅРµС‚С‹. РџРµСЂРµСЂРѕР¶РґРµРЅРёРµ СЃС‚РѕРёС‚ в—† {RESPAWN_CRYSTAL_COST}.
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={playerName}
                    maxLength={24}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="h-8 text-sm max-w-[180px]"
                    placeholder="РРјСЏ"
                    disabled={scoreSubmitted}
                  />
                  <Button size="sm" variant="secondary" disabled={scoreSubmitted || submittingScore}
                    onClick={() => submitMyScore(false)}>
                    <Trophy className="h-3 w-3 mr-1" />
                    {scoreSubmitted ? "РћС‚РїСЂР°РІР»РµРЅРѕ" : "Р’ СЂРµРєРѕСЂРґС‹"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setStarted(false); setMenuTab(scoreSubmitted ? "leaderboard" : "play"); setModal({ kind: "none" }); }}
                  >
                    Р’С‹Р№С‚Рё РёР· РёРіСЂС‹
                  </Button>
                  <Button variant="secondary" onClick={beginGame}>
                    РќР°С‡Р°С‚СЊ Р·Р°РЅРѕРІРѕ
                  </Button>
                  <Button
                    onClick={respawnWithCrystal}
                    disabled={!checkpoint || (save.crystals ?? 0) < RESPAWN_CRYSTAL_COST}
                    title={!checkpoint ? "РўРѕС‡РєР° РІРѕР·СЂРѕР¶РґРµРЅРёСЏ РµС‰С‘ РЅРµ РЅР°Р№РґРµРЅР°" : "РџРѕС‚СЂР°С‚РёС‚СЊ РєСЂРёСЃС‚Р°Р»Р» Рё РІРµСЂРЅСѓС‚СЊСЃСЏ Рє С‚РѕС‡РєРµ"}
                  >
                    в—† РџРµСЂРµСЂРѕРґРёС‚СЊСЃСЏ
                  </Button>
                </div>
                {!checkpoint && <p className="text-[11px] text-red-300">РўРѕС‡РєР° РІРѕР·СЂРѕР¶РґРµРЅРёСЏ РµС‰С‘ РЅРµ РЅР°Р№РґРµРЅР°.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

