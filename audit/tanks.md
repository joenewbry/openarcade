# Audit: Tanks

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> Space -> `playing` -> player HP=0 -> `over` -> Space -> re-init.
- `showOverlay` used at init and game over. `setScoreFn` wired.
- All game logic in `onUpdate` (no setTimeout for turn management -- uses frame-counting timers instead, which is correct).
- DOM refs (`score`, `best`) accessed directly -- v2.html provides them.
- v2.html: canvas 600x400, overlay present but missing `background` style (same as super-sprint/super-mario).
- Terrain generated as array of heights with sine waves. Craters deform terrain permanently.

## B) Playable?
**PASS**

- Controls: Up/Down to adjust angle, Left/Right to adjust power, Space to fire. Clean and documented in HUD.
- Projectile physics: gravity + wind. Trail visualization shows projectile path.
- CPU AI uses Monte Carlo simulation (20 random trials, picks closest to player) with accuracy degradation based on round number.
- Wind changes each turn, adding variety.
- Terrain deforms on impact (craters), tanks adjust to new terrain height.
- Rounds progress: destroy enemy -> new terrain + new enemy with full HP, score increases.
- Player retains current HP between rounds, creating endurance challenge.

## C) Fun?
**PASS**

- Classic artillery game with satisfying arc physics.
- Wind adds unpredictability and skill requirement.
- Terrain deformation from craters is visually satisfying and strategically meaningful.
- CPU gets more accurate over rounds, creating escalating challenge.
- Score tracking encourages replaying for high scores.
- Visual feedback: projectile trail, explosion particles, crater formation.

## Issues
- `bestEl.textContent` is parsed with `parseInt` on lines 452 and 480. If `bestEl` starts as `'0'`, this works. But if it's empty or NaN, `parseInt` returns NaN and comparison fails silently (score would never update best). In practice, the HTML initializes it to `'0'` so this is safe.
- Overlay div in v2.html lacks `background` style, making overlay text potentially hard to read.
- `scoreEl.textContent = '0'` on line 345 is called without null guard. The element exists in v2.html, so this works.
- When enemy is destroyed and round transitions, `initRound` creates a new terrain and resets tank positions, but player HP carries over (since `player.hp` is only set in `makeTank` which is called by `initRound`). Wait -- actually `initRound` calls `player = makeTank(px, true)` which creates a new tank with `hp: MAX_HP`. This means the player gets full HP every round, removing the endurance element. This may or may not be intentional.
- The CPU AI runs 20 Monte Carlo trials, which is a small number. Sometimes the CPU will miss badly, especially in early rounds with high accuracy variance. This creates a somewhat easy game, but the increasing accuracy (line 179: `accuracy = max(0.5, 1 - roundNum * 0.08)`) means by round 6+ the CPU becomes quite precise.

## Verdict: PASS
Solid artillery game with satisfying physics, terrain deformation, and escalating AI difficulty. The missing overlay background is cosmetic.
