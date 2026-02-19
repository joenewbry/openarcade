# Pool Billiards

## Game Type
Physics-based billiards / 8-ball pool vs AI

## Core Mechanics
- **Goal**: Pocket all of your assigned balls (solids 1–7 or stripes 9–15), then legally pocket the 8-ball before the CPU does
- **Movement**: Aim with the mouse (angle follows cursor), drag back from the cue ball to set power, release to shoot
- **Key interactions**: Ball-ball elastic collisions, pocket detection, ball-in-hand after scratch, foul/turn rules

## Controls
- `Mouse move` — aim cue stick direction
- `Mouse down + drag` — pull back to set shot power (max drag converts to `MAX_POWER = 18`)
- `Mouse up` — release to fire
- Power formula: `Math.min(MAX_POWER, pullDist * 0.12)`

## Difficulty Progression

### Structure
There is no wave or level progression. Each game is a single match of 8-ball against the CPU AI. The AI quality is fixed for the entire game.

### Key Difficulty Variables
- `MAX_POWER`: `18` — maximum cue velocity units; constant
- `FRICTION`: `0.986` per frame — controls how far balls roll; constant
- `MIN_VEL`: `0.06` — velocity threshold at which balls stop; constant
- `BALL_R`: `8` px — ball radius; constant
- `POCKET_R`: `15` px — pocket capture radius; constant
- AI shot evaluation: `shotScore` starts at 100, penalized by shot distance (`-0.08 per px`), object-ball to pocket distance (`-0.1 per px`), cut angle (`-25 per radian`), long shots (`-20 if > 350px`); bonus for tight cuts (`+15 if cutAngle < 0.25`), plus `±4` random noise
- AI power: `Math.min(MAX_POWER * 0.85, Math.max(4, shotDist * 0.03 + pDist * 0.02 + 4))` plus `±0.75` random noise
- AI think delay: `600 + Math.random() * 400` ms before shooting

### Difficulty Curve Assessment
The AI is a capable pool player that finds clear line-of-sight shots and applies realistic power. A casual player may feel outmatched because the AI never misses easy shots and immediately spots the best legal ball-pocket combination. The ±4 score noise and ±0.75 power noise provide some human-like error, but the effective miss rate on easy straight shots is very low.

## Suggested Improvements
- [ ] Increase AI shot power noise from `±0.75` to `±2.0` so the AI occasionally over/underpowers shots
- [ ] Increase AI score noise from `±4` to `±12` to make the AI miss medium-difficulty shots more often
- [ ] Add an explicit AI difficulty enum (Easy / Medium / Hard) gating the above noise values
- [ ] Reduce `POCKET_R` from `15` to `12` px to make pocketing feel more skillful for the player
- [ ] Show a brief "Ball in hand anywhere on table" tutorial prompt the first time a scratch occurs — the current UI only says "SCRATCH!" and places the ball, which is confusing for new players
- [ ] Add a short (3-second) countdown before the AI takes its turn so the player can follow the AI's reasoning
