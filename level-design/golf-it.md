# Golf It

## Game Type
Competitive mini-golf (turn-based, 1v1 vs CPU)

## Core Mechanics
- **Goal**: Complete 9 holes in fewer total strokes than the CPU opponent
- **Movement**: Ball physics — drag to aim, release to putt; friction slows the ball over time
- **Key interactions**: Aiming shots with drag, avoiding water hazards (penalty stroke + return to last position), bouncing off walls and bumpers, timing windmill obstacles

## Controls
- **Mouse drag** on ball: Click near ball (within 35px), drag to set aim direction and power, release to shoot
- Power = `Math.min(dist * 0.1, MAX_POWER)` where `MAX_POWER = 12`
- Aim line shows shot direction; power bar shows strength

## Difficulty Progression

### Structure
The game is a fixed 9-hole course set. Holes are played in order (Hole 1 through Hole 9). There is no score-based gating — the player always plays all 9 holes. After the final hole, scores are compared for a win/loss. Turn order on each hole is determined by who scored better on the previous hole.

### Key Difficulty Variables
- **FRICTION**: `0.985` — constant across all holes; ball slows at the same rate throughout
- **WALL_BOUNCE**: `0.7` — constant; walls absorb 30% of velocity
- **BUMPER_BOUNCE**: `1.3` — constant; bumpers add 30% extra velocity
- **MAX_POWER**: `12` — constant cap on shot power
- **CUP_R**: `8` — constant hole radius; no tolerance change across holes
- **Windmill speed**: Hole 5 uses `speed: 0.02`; Hole 8 uses speeds `0.025` and `-0.02`
- **Par progression**: Hole 1 = Par 2, Holes 2–5 = Par 3, Hole 6 = Par 4, Hole 7 = Par 3, Hole 8 = Par 4, Hole 9 = Par 5
- **Max strokes per player per hole**: Hard cap of `10`

### Difficulty Curve Assessment
The curve is reasonable overall but Hole 7 (island green) is deceptively punishing — a large water hazard surrounds a small island (80x80 px), and missing it costs a stroke and resets to last position, making par almost impossible for new players. The CPU AI also has a significant advantage on early holes because it aims directly at the cup with random noise of only `±0.12 radians`, while the aiming interface requires players to understand drag mechanics before they can aim precisely.

## Suggested Improvements
- [ ] Add a brief interactive tutorial on Hole 1 showing how to click, drag, and release — new players often miss that you drag away from the ball, not toward the target
- [ ] Increase `CUP_R` from `8` to `11` on Holes 1–3 to give beginners a more forgiving target as they learn the power/angle system
- [ ] Reduce the island on Hole 7 from `{ x: 210, y: 90, w: 80, h: 80 }` to at least `{ w: 110, h: 110 }` — the current target is extremely small relative to the water area
- [ ] Increase `WALL_BOUNCE` from `0.7` to `0.78` on early holes (1–3) so ricochets feel livelier and more predictable; current absorption is heavy
- [ ] Add a stroke penalty counter to the HUD (currently only shows raw stroke count) so players understand the cost of hitting water before they experience it
- [ ] Lower the CPU's random power multiplier range from `0.9 + Math.random() * 0.2` to `0.85 + Math.random() * 0.3` on holes 1–4 to make early holes more competitive
