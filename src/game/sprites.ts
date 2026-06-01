// Pixel sprite drawing utilities. Each sprite is a grid of color codes.
// '.' = transparent. Single chars map to a palette.

type Palette = Record<string, string>;

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  palette: Palette,
  x: number,
  y: number,
  scale: number,
  flip = false,
) {
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      const dx = flip ? sprite[0].length - 1 - col : col;
      ctx.fillStyle = color;
      ctx.fillRect(x + dx * scale, y + row * scale, scale, scale);
    }
  }
}

// LANA - 12 wide x 16 tall
const LANA_IDLE = [
  "....hhhh....",
  "...hhhhhh...",
  "...hsffsh...",
  "...hfffffh..",
  "...hfeefh...",
  "....fmmf....",
  "...ttttt....",
  "..tbtttbt...",
  "..tttttt....",
  "..tttttt....",
  "..jjjjjj....",
  "..jjjjjj....",
  "..jj..jj....",
  "..jj..jj....",
  "..ss..ss....",
  "..ss..ss....",
];
const LANA_WALK = [
  "....hhhh....",
  "...hhhhhh...",
  "...hsffsh...",
  "...hfffffh..",
  "...hfeefh...",
  "....fmmf....",
  "...ttttt..t.",
  "..tbtttbtt..",
  "..tttttt....",
  "..tttttt....",
  "..jjjjjj....",
  "..jjjjjj....",
  "..jj...jj...",
  ".jj.....jj..",
  ".ss......ss.",
  ".ss......ss.",
];
const LANA_ATTACK = [
  "....hhhh..ww",
  "...hhhhhh.ww",
  "...hsffsh.ww",
  "...hfffffhww",
  "...hfeefh.ww",
  "....fmmf....",
  "...ttttttt..",
  "..tbtttbtt..",
  "..tttttt....",
  "..tttttt....",
  "..jjjjjj....",
  "..jjjjjj....",
  "..jj..jj....",
  "..jj..jj....",
  "..ss..ss....",
  "..ss..ss....",
];
const LANA_PALETTE: Palette = {
  h: "#3a2418", // hair
  f: "#e6b89c", // face
  s: "#b8896d", // skin shadow
  e: "#1a1a1a", // eyes
  m: "#7a2a2a", // mouth
  t: "#d8d4c4", // shirt
  b: "#7a1f1f", // tie/blood
  j: "#2a2a3a", // skirt/jeans
  w: "#9a9aa0", // bat/weapon
};

// ZOMBIE
const ZOMBIE = [
  "...zzzz.....",
  "..zzzzzz....",
  "..zrzzrz....",
  "..zzzzzz....",
  "...zbbz.....",
  "..gggggg....",
  ".gggggggg...",
  "g.gggggg.g..",
  "g.gggggg.g..",
  "..gggggg....",
  "..gg..gg....",
  "..gg..gg....",
  "..gg..gg....",
  "..gg..gg....",
  "..bb..bb....",
  "..bb..bb....",
];
const ZOMBIE_PALETTE: Palette = {
  z: "#5a7a4a", // head
  r: "#c83030", // glowing eyes
  b: "#3a1818", // mouth/blood
  g: "#3a5a3a", // body tattered
};

// BOSS DIRECTOR ZOMBIE - 20x24
const BOSS = [
  ".....zzzzzzz........",
  "....zzzzzzzzz.......",
  "....zrzzzzrz........",
  "....zzzzzzzz........",
  "....zzbbbbzz........",
  "....zzzzzzzz........",
  "...sssssssss........",
  "..sssssssssss.......",
  "..sttttttttts.......",
  "..stwwwwwwwts.......",
  "..stwwwwwwwts.......",
  "..stwwwwwwwts.......",
  "..sttttttttts.......",
  "..sssssssssss.......",
  "...sss...sss........",
  "...sss...sss........",
  "...sss...sss........",
  "...sss...sss........",
  "...sss...sss........",
  "...sss...sss........",
  "...bbb...bbb........",
  "...bbb...bbb........",
  "..bbbbb.bbbbb.......",
  "..bbbbb.bbbbb.......",
];
const BOSS_PALETTE: Palette = {
  z: "#3a5a3a",
  r: "#ff2020",
  b: "#1a0808",
  s: "#1a1a2a", // suit
  t: "#d8d4c4", // shirt
  w: "#7a1f1f", // tie
};

// CLASSMATE
const CLASSMATE = [
  "....yyyy....",
  "...yyyyyy...",
  "...yfffy....",
  "...yfeefy...",
  "....fmmf....",
  "...ttttt....",
  "..tttttt....",
  "..tttttt....",
  "..tttttt....",
  "..pppppp....",
  "..pppppp....",
  "..pp..pp....",
  "..pp..pp....",
  "..pp..pp....",
  "..ss..ss....",
  "..ss..ss....",
];
const CLASSMATE_PALETTE: Palette = {
  y: "#d4a020",
  f: "#e6b89c",
  e: "#1a1a1a",
  m: "#7a2a2a",
  t: "#3a6a8a",
  p: "#2a2a3a",
  s: "#1a1a1a",
};

export function drawLana(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: "idle" | "walk" | "attack",
  facingLeft: boolean,
  scale = 3,
) {
  const sprite = state === "attack" ? LANA_ATTACK : state === "walk" ? LANA_WALK : LANA_IDLE;
  drawSprite(ctx, sprite, LANA_PALETTE, x, y, scale, facingLeft);
}

export function drawZombie(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingLeft: boolean,
  scale = 3,
) {
  drawSprite(ctx, ZOMBIE, ZOMBIE_PALETTE, x, y, scale, facingLeft);
}

export function drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 4) {
  drawSprite(ctx, BOSS, BOSS_PALETTE, x, y, scale);
}

export function drawClassmate(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 3) {
  drawSprite(ctx, CLASSMATE, CLASSMATE_PALETTE, x, y, scale);
}

export function drawOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: "heal" | "power",
  t: number,
) {
  const bob = Math.sin(t / 200) * 3;
  ctx.fillStyle = type === "heal" ? "#ff4060" : "#80ff60";
  ctx.fillRect(x - 4, y - 4 + bob, 8, 8);
  ctx.fillStyle = type === "heal" ? "#ffa0b0" : "#c0ffa0";
  ctx.fillRect(x - 2, y - 4 + bob, 2, 2);
  // glow
  ctx.fillStyle = type === "heal" ? "rgba(255,64,96,0.25)" : "rgba(128,255,96,0.25)";
  ctx.fillRect(x - 8, y - 8 + bob, 16, 16);
}

// Background: corridor with parallax lockers, floor, ceiling lights
export function drawCorridor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scroll: number,
  variant: "school" | "library" | "cafeteria" | "gym",
) {
  // Floor
  const floorY = h - 80;
  // ceiling
  ctx.fillStyle = "#0a0f0c";
  ctx.fillRect(0, 0, w, floorY - 200);

  // back wall
  const wallColors: Record<string, [string, string]> = {
    school: ["#1a2a22", "#0e1812"],
    library: ["#2a1f14", "#160e08"],
    cafeteria: ["#1f2a2f", "#0e1418"],
    gym: ["#2a1818", "#180a0a"],
  };
  const [wallTop, wallBot] = wallColors[variant];
  const grad = ctx.createLinearGradient(0, floorY - 200, 0, floorY);
  grad.addColorStop(0, wallTop);
  grad.addColorStop(1, wallBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, floorY - 200, w, 200);

  // ceiling lights (flickering pixel rects)
  for (let i = 0; i < 6; i++) {
    const lx = ((i * 200) - (scroll * 0.3) % 200) % (w + 200) - 50;
    ctx.fillStyle = "#1a1a14";
    ctx.fillRect(lx, 20, 80, 12);
    const flick = Math.sin(performance.now() / 200 + i) > -0.3;
    if (flick) {
      ctx.fillStyle = "#a8ff70";
      ctx.fillRect(lx + 8, 28, 64, 4);
      // light cone
      ctx.fillStyle = "rgba(168,255,112,0.05)";
      ctx.fillRect(lx, 32, 80, floorY - 32);
    }
  }

  // Lockers / shelves (parallax)
  const tile = 60;
  const offset = -(scroll * 0.5) % tile;
  for (let x = offset - tile; x < w + tile; x += tile) {
    if (variant === "library") {
      // bookshelf
      ctx.fillStyle = "#3a2818";
      ctx.fillRect(x, floorY - 180, tile - 4, 180);
      for (let r = 0; r < 5; r++) {
        ctx.fillStyle = "#1a1208";
        ctx.fillRect(x + 2, floorY - 180 + r * 36 + 4, tile - 8, 28);
        // books
        for (let b = 0; b < 6; b++) {
          const colors = ["#7a2a2a", "#2a4a7a", "#7a6a2a", "#4a2a5a", "#2a7a4a"];
          ctx.fillStyle = colors[(b + r + Math.floor(x)) % colors.length];
          ctx.fillRect(x + 4 + b * 9, floorY - 180 + r * 36 + 6, 7, 24);
        }
      }
    } else if (variant === "cafeteria") {
      // tables / counters
      ctx.fillStyle = "#2a3a3a";
      ctx.fillRect(x, floorY - 80, tile - 4, 80);
      ctx.fillStyle = "#4a5a5a";
      ctx.fillRect(x, floorY - 80, tile - 4, 10);
    } else if (variant === "gym") {
      // brick wall
      ctx.fillStyle = "#2a1414";
      ctx.fillRect(x, floorY - 200, tile - 4, 200);
      for (let r = 0; r < 8; r++) {
        ctx.fillStyle = "#1a0808";
        ctx.fillRect(x, floorY - 200 + r * 25, tile - 4, 2);
      }
    } else {
      // school lockers
      ctx.fillStyle = "#3a4a4a";
      ctx.fillRect(x, floorY - 160, tile - 4, 160);
      ctx.fillStyle = "#1a2a2a";
      ctx.fillRect(x + 4, floorY - 150, tile - 12, 140);
      // vent
      ctx.fillStyle = "#0a1414";
      for (let v = 0; v < 4; v++) {
        ctx.fillRect(x + 8, floorY - 145 + v * 4, tile - 20, 2);
      }
      // handle
      ctx.fillStyle = "#8a8a8a";
      ctx.fillRect(x + tile - 14, floorY - 80, 4, 8);
      // blood smear sometimes
      if ((Math.floor(x / tile) + 7) % 5 === 0) {
        ctx.fillStyle = "rgba(120,20,20,0.7)";
        ctx.fillRect(x + 10, floorY - 60, 20, 40);
      }
    }
  }

  // Floor
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, floorY, w, h - floorY);
  // floor tiles
  for (let x = -(scroll % 40); x < w; x += 40) {
    ctx.fillStyle = "#0a0806";
    ctx.fillRect(x, floorY, 2, h - floorY);
  }
  // paper litter
  for (let i = 0; i < 8; i++) {
    const px = ((i * 137) - scroll * 0.8) % (w + 100);
    ctx.fillStyle = "#d8d4c4";
    ctx.fillRect(px, floorY + 20 + (i % 3) * 15, 8, 6);
    if (i % 3 === 0) {
      ctx.fillStyle = "rgba(120,20,20,0.6)";
      ctx.fillRect(px - 4, floorY + 25 + (i % 3) * 15, 4, 3);
    }
  }
}

export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active: boolean,
) {
  // frame
  ctx.fillStyle = "#1a0a04";
  ctx.fillRect(x - 4, y - 4, 64, 124);
  // door
  ctx.fillStyle = active ? "#a85020" : "#4a2a14";
  ctx.fillRect(x, y, 56, 120);
  // panels
  ctx.fillStyle = "#2a1408";
  ctx.fillRect(x + 6, y + 8, 44, 40);
  ctx.fillRect(x + 6, y + 56, 44, 40);
  // handle
  ctx.fillStyle = active ? "#ffd040" : "#8a7a3a";
  ctx.fillRect(x + 46, y + 70, 4, 8);
  // EXIT sign
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + 6, y - 18, 44, 14);
  ctx.fillStyle = active ? "#80ff60" : "#3a6a3a";
  ctx.font = "bold 8px monospace";
  ctx.fillText("EXIT", x + 16, y - 8);
  if (active) {
    ctx.fillStyle = "rgba(255,208,64,0.2)";
    ctx.fillRect(x - 20, y - 10, 96, 140);
  }
}
