# Rampart

## Game Type
Turn-based castle defense / wall-building strategy game

## Core Mechanics
- **Goal**: Defend your castle(s) against enemy ships by building walls around them and firing cannons; survive as many waves as possible
- **Movement**: Place Tetris-like wall pieces on the board during the build phase; aim and fire cannons during the battle phase
- **Key interactions**: Three alternating phases — Build (place wall pieces to enclose castle), Battle (enemy ships fire projectiles; player fires cannons), Repair (place wall pieces to seal breaches); if no castle is fully enclosed at the end of a Repair phase, the game ends; enclosing multiple castles in one wall earns bonus cannons

## Controls
- `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown` — move wall piece (Build/Repair) or aim cannon (Battle)
- `Z` — rotate wall piece counterclockwise
- `X` — rotate wall piece clockwise
- `Space` — place wall piece (Build/Repair) or fire cannon (Battle)
- `Tab` — cycle to next cannon (Battle phase)

## Difficulty Progression

### Structure
Waves advance continuously (1, 2, 3, …) with no reset. Each wave consists of three phases: Build (`BUILD_TIME = 15` s), Battle (`BATTLE_TIME = 18 + min(wave * 2, 10)` s), and Repair (`REPAIR_TIME = 12` s). Enemy count, ship HP, and fire rate all scale with wave number. The game ends when no castle is enclosed at the end of a Repair phase.

### Key Difficulty Variables
- `BUILD_TIME`: `15` seconds — constant across all waves
- `BATTLE_TIME`: `18 + Math.min(wave * 2, 10)` seconds
  - Wave 1: 20 s, Wave 5: 28 s (cap), Wave 5+: 28 s
- `REPAIR_TIME`: `12` seconds — constant
- `numShips`: `Math.min(2 + wave, 6)` — enemy ship count
  - Wave 1: 3, Wave 4: 6, Wave 4+: 6 (maxes quickly)
- Ship HP: `2 + Math.floor(wave / 3)`
  - Wave 1: 2, Wave 3: 3, Wave 6: 4, Wave 9: 5
- Ship fire interval: `2 + Math.random() * 3 - Math.min(wave * 0.2, 1.5)` seconds
  - Wave 1: ~2–5 s between shots, Wave 8+: ~0.5–3.5 s (fire rate cap)
- Enemy projectile speed: `120 + wave * 10` px/s
  - Wave 1: 130 px/s, Wave 5: 170 px/s, Wave 10: 220 px/s
- Cannon fire cooldown: `0.5` seconds — constant
- `WALL_PIECES`: 10 Tetris-like pieces of varying shapes — same set each wave

### Difficulty Curve Assessment
Wave 1 begins with 3 ships and a 20-second battle phase, which is reasonable for learning cannon aiming. The problem is that `numShips` hits its cap of 6 by wave 4, while `BATTLE_TIME` caps at 28 seconds by wave 5 — but projectile speed and ship HP continue scaling indefinitely. By wave 6, ships have 4 HP each and fire fast projectiles, punching through walls faster than 12 seconds of repair time allows. New players also rarely understand that they must fully enclose a castle (not just patch individual wall gaps), leading to sudden game-overs that feel opaque.

## Suggested Improvements
- [ ] Slow ship count growth: change `Math.min(2 + wave, 6)` to `Math.min(1 + wave, 6)` so the maximum of 6 ships isn't reached until wave 5 instead of wave 4
- [ ] Reduce projectile speed scaling: change `120 + wave * 10` to `120 + wave * 6` so the escalation is less severe in mid-game waves
- [ ] Increase `REPAIR_TIME` from `12` to `16` seconds — 12 seconds is insufficient for new players to understand what constitutes a "closed" wall and place enough pieces to seal it
- [ ] Add a visual indicator showing whether the current wall placement will fully enclose a castle (e.g., highlight the enclosed area in green during the Build/Repair phase) so players understand the enclosure win condition
- [ ] Add a wave-start summary showing "Wave X — N ships incoming" before the battle phase begins, giving players 2–3 seconds to prepare
- [ ] Cap ship HP growth: change `2 + Math.floor(wave / 3)` to `Math.min(2 + Math.floor(wave / 3), 6)` and slow it to `Math.floor(wave / 4)` so HP increases every 4 waves instead of every 3
