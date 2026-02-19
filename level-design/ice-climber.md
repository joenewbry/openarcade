# Ice Climber

## Game Type
Single-screen vertical platformer (arcade climbing)

## Core Mechanics
- **Goal**: Climb as high as possible by breaking through ice-block floors and reaching the top of each level
- **Movement**: Walk left/right; jump to break blocks above or bounce off ceilings; fall through gaps in floors
- **Key interactions**: Timing jumps to break floor blocks and create upward paths, avoiding Topi enemies who rebuild broken blocks, collecting fruit for bonus points

## Controls
- **Arrow Left / Arrow Right**: Move horizontally
- **Space** or **Arrow Up**: Jump

## Difficulty Progression

### Structure
Difficulty scales by `level`, which increments each time the player reaches the top of a screen. There is no cap on `level` — it increases indefinitely. Each level uses `FLOORS_PER_LEVEL = 8` floors with `FLOOR_GAP = 4` tiles between floors. Enemy count and speed increase with each level. The player has 3 lives; losing all lives ends the game.

### Key Difficulty Variables
- `GRAVITY`: `0.38` px/frame² — constant across all levels
- `JUMP_VEL`: `-9.5` px/frame — constant; determines max height reachable per jump
- `MOVE_SPEED`: `3` px/frame — constant horizontal speed
- `PLAYER_W`: `24` px, `PLAYER_H`: `28` px — player hitbox dimensions
- `FLOORS_PER_LEVEL`: `8` floors per screen; `FLOOR_GAP`: `4` tiles between floors
- `HOLE_MIN`: `2` tiles, `HOLE_MAX`: `4` tiles — range of gap widths in floors (randomized per floor)
- `TOPI_SPEED`: `1.2` px/frame base; scales as `1 + level * 0.1` per level — at level 5, Topi moves at `1.6` px/frame; at level 10, `2.1` px/frame
- Enemy spawn chance per floor (floors 2+): `0.35 + level * 0.05`; at level 5 = `60%`; at level 13 = `100%` (all floors have enemies)
- Scoring: breaking a block = `10` pts; killing an enemy = `50` or `100` pts; collecting fruit = `100` pts
- `FLOOR_TILE_W`: `16` px — tile size; floor total width spans the canvas

### Difficulty Curve Assessment
The spawn chance formula `0.35 + level * 0.05` means that by level 13, every floor above the first has a Topi enemy — and at that point Topi speed has also increased to `2.1` px/frame, making them very hard to avoid in narrow corridors. New players face Topis immediately on level 1 (35% spawn chance) with no warm-up, and since Topis respawn after rebuilding blocks, the early game teaches nothing about how to avoid them before they become lethal. The random hole widths (`HOLE_MIN=2` to `HOLE_MAX=4`) occasionally generate screens that are trivially easy or impossibly tight, which makes skill feel unrewarded.

## Suggested Improvements
- [ ] Set a fixed enemy-free first level (`level === 0` forces spawn chance to `0`) so new players can learn the jump-and-break loop before enemies are introduced
- [ ] Lower the spawn chance base from `0.35` to `0.20` and the per-level increment from `0.05` to `0.04`, shifting full enemy density from level 13 to approximately level 20 — `0.20 + level * 0.04`
- [ ] Raise `JUMP_VEL` from `-9.5` to `-10.2` so the player can reliably break blocks on the first jump attempt; the current value sometimes requires a second jump from an awkward position
- [ ] Widen the minimum hole size from `HOLE_MIN = 2` tiles to `HOLE_MIN = 3` tiles on levels 0–2 to prevent unfair dead-end screens early on, then restore to 2 at level 3+
- [ ] Add a brief Topi-stun window (e.g., 90 frames) after a Topi is killed before it respawns as an egg, rather than the immediate respawn cycle — the current loop punishes players for fighting back
- [ ] Display the current level number on the HUD (currently only score is shown) so players have a sense of progression and can calibrate how much harder each level will be
