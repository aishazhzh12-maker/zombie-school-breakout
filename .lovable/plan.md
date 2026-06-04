## Plan: Horror overhaul + boss combat rework

### 1. Bats become rare (data.ts)
Remove all "Bat" (🏏) entries from classroom search spots except **one per floor**, placed in one room each. No other changes to loot tables.

### 2. Mr. Hopp's Playhouse horror aesthetic
- Darker palette + heavier vignette: deepen the CRT vignette, lower ambient brightness via a near-black overlay on the scene, intensify scanlines.
- Replace zombie sprites with "Mr. Hopp-style" plush-monster look: long ears, oversized round black button eyes with red pinpoint pupils, stitched mouth, ragged fabric body. Implemented as a new `PixelHopp` variant of the pixel sprite renderer (still pixel art per earlier rule).
- Lana's pixel sprite kept; add subtle red eye-glow flicker when zombies are near.
- Add occasional screen-jitter + low growl SFX when a Hopp is within ~150px (reuse existing `sfxGrowl`/`sfxBite`).

### 3. Giant scary Principal boss
- New `PixelHoppBoss`: ~2.5x normal sprite scale, hunched, bloody mouth, three glowing red eyes, dragging arms. Replaces current boss visuals in the boss room.

### 4. Jump mechanic + glass obstacles
- Add `Space` / `W` / `Up` key + on-screen ⬆ button → triggers Lana jump (vertical velocity, gravity, lands on `FLOOR_Y`). Block double-jump.
- Add `obstacles: { x: number; kind: "glass" }[]` per level (broken glass shards rendered as small white triangles). If Lana touches glass while NOT mid-jump → take damage + `sfxBite` + brief shake.
- Place 3–5 glass piles per level at sensible spots.

### 5. Boss fight rework (in Gym, floor 5)
- Replace current riddle-modal boss with an inline arena fight inside the boss room (no modal).
- Boss state: `hp = 10`, periodic AI loop:
  - Idle → roar → **jump**: rises ~120px, lands → screen-shake + earthquake (Lana stunned briefly if grounded) → 2–3 wood debris pieces fall from ceiling at random x; if they hit Lana → damage.
  - After landing, a **glowing bat** spawns on the floor (yellow pulsing aura). Lana picks it up by walking over it. Picking up grants a one-shot "swing" → walking into boss with bat equipped deals 1 dmg, consumes bat, boss recoils.
  - Repeat until boss hp = 0 → win screen / next level.
- Boss takes damage flash (red). Lana death if hp ≤ 0 as usual.
- Remove `bossRiddles` modal trigger for this floor; keep riddles only as fallback if needed.

### Technical notes
- All work stays in `src/game/EscapeGame.tsx`, `src/game/data.ts`, `src/game/sounds.ts`, `src/styles.css`.
- Add `obstacles` field to `Level` type (optional, backward compatible).
- Add `jumpY`, `jumpV` to Lana state; gravity integrated each tick.
- Boss combat lives in a new `BossArena` component rendered when `currentLevel.id === 5` and Lana is past `bossX`.
- Add new SFX: `sfxBoom` (earthquake), `sfxSwing` (bat hit), `sfxPickup`.

### Out of scope (ask later if wanted)
- Full audio redesign / licensed Hopp music.
- New animated cutscene intros.
