# Peggle

## Game Type
Physics-based ball-shooting puzzle (Peggle clone)

## Core Mechanics
- **Goal**: Clear all orange pegs using a limited supply of balls. Green pegs award an extra ball when hit.
- **Movement**: Aim the launcher left/right from the top-center; a dashed guide line shows trajectory. Hold and release Space to fire.
- **Key interactions**: Ball bounces off pegs (BOUNCE_DAMPING = 0.72). Hitting all orange pegs triggers "EXTREME FEVER" and a ball-count bonus. A moving bucket at the bottom can catch the ball to refund it.

## Controls
- Arrow Left / Right: aim launcher
- Space: fire ball

## Difficulty Progression

### Structure
4 handcrafted levels followed by procedurally generated levels from level 5 onward. Advancing levels preserves remaining ball count (minimum 10 balls guaranteed at level start via `Math.max(ballsLeft, 10)`).

### Key Difficulty Variables
- `ballsLeft`: starts at `10`, preserved between levels (refilled to 10 if lower); green pegs add 1 ball each, bucket catch adds 1 ball.
- `orangeCount`: `Math.max(8, Math.floor(pegList.length * 0.3))` — roughly 30% of pegs are orange.
- Procedural peg count (level 5+): `40 + (lvl - 5) * 5` — level 5 = 40 pegs, level 10 = 65 pegs, growing indefinitely.
- `BUCKET_SPEED`: fixed at `1.5` px/frame — never changes.
- `SHOOT_SPEED`: fixed at `8` px/frame — never changes.
- `GRAVITY`: fixed at `0.15` — never changes.
- `BOUNCE_DAMPING`: fixed at `0.72` — never changes.
- Score multipliers based on pegs hit per shot: 4+ hits = 2x, 7+ = 3x, 10+ = 5x — never changes.
- No enemy projectiles or time pressure exists.

### Difficulty Curve Assessment
The first 4 levels are genuinely well-designed with increasing complexity (diamond → grid → rings → V-shape). Level 5+ procedural generation is seeded (`lvl * 1337`) so layouts are deterministic but arbitrary — some levels will be much harder than others by chance. Starting with 10 balls and 30% orange pegs is a reasonable baseline. The main difficulty pain point is the level 3 ring pattern, which frequently traps the ball in the central rings and is harder than level 4.

## Suggested Improvements
- [ ] Increase starting `ballsLeft` from `10` to `12` to reduce frustration on early levels while players learn trajectory physics
- [ ] Reduce the orange peg percentage from `0.3` to `0.25` (still `Math.max(8, ...)`) for procedural levels 5+, where peg density already increases
- [ ] Increase `BUCKET_SPEED` from `1.5` to `2.0` so catching the ball with the bucket is more frequently a viable play, especially in later wide-peg layouts
- [ ] Add a fourth named level between the current levels 3 and 4 with a simpler pattern (e.g. two horizontal rows) to break up the difficulty spike at level 3
- [ ] Add a guaranteed green peg at a fixed position in procedural levels (e.g. always one in the lower-center area) so the "free ball" mechanic reliably fires in later levels
