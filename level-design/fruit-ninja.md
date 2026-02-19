# Fruit Ninja

## Game Type
Reflex slashing / arcade action

## Core Mechanics
- **Goal**: Slice as much fruit as possible using mouse swipes or keyboard controls; losing a fruit costs a life; hitting a bomb ends the game instantly
- **Movement**: No player movement — click and drag the mouse to slash, or use arrow keys to move a crosshair and Space to slash at it
- **Key interactions**: Slice fruit by moving the mouse over them while holding a button; combo bonuses for slicing 3+ fruit in one window; bombs kill instantly on contact

## Controls
- `Mouse click + drag`: Primary slashing method (draws a line that slices all intersecting fruit)
- `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`: Move crosshair cursor (speed: `ARROW_SPEED = 12`)
- `Space`: Perform a wide horizontal slash at the crosshair position (120px wide)

## Difficulty Progression

### Structure
Difficulty is a continuous variable that rises from 0 to 1 over 1800 frames (30 seconds at 60fps). There are no discrete levels. Wave size and bomb frequency increase with difficulty. Spawn interval decreases continuously.

### Key Difficulty Variables
- `difficulty`: `Math.min(frameCount / 1800, 1)` — 0 at start, reaches 1.0 after 30 seconds, then stays at max
- `spawnInterval`: `Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - difficulty * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN))` — starts at `70` frames, shrinks linearly to `25` frames at max difficulty
- Wave fruit count: `Math.min(1 + Math.floor(Math.random() * (2 + difficulty * 0.3)), 5)` — starts at 1–2 fruit, can reach up to 5 at max
- Bomb chance per fruit: `Math.min(0.12 + difficulty * 0.015, 0.3)` — starts at 12%, caps at 30% at max difficulty
- Fruit initial upward velocity: `-(6.5 + Math.random() * 3 + difficulty * 0.3)` — barely scales (max 0.3 addition), so heights are fairly consistent
- Player lives: fixed at `3` throughout

### Difficulty Curve Assessment
The 30-second max-difficulty ramp is very aggressive — skilled players will be at max pressure quickly, but the bomb chance jumping from 12% to 30% in 30 seconds is the bigger problem. At max difficulty with 5-fruit waves and 30% bomb chance, multiple bombs can spawn in the same wave, making keyboard-only play nearly impossible. The game is very mouse-dependent; keyboard slashing with the crosshair is awkward for a game that requires rapid slashing in multiple directions.

## Suggested Improvements
- [ ] Slow the difficulty ramp: change `frameCount / 1800` to `frameCount / 3600` so max difficulty is reached at 60 seconds instead of 30 — this gives players time to find their rhythm before chaos erupts
- [ ] Cap the bomb chance lower: reduce from `Math.min(0.12 + difficulty * 0.015, 0.3)` to `Math.min(0.08 + difficulty * 0.01, 0.20)` — 30% bomb chance per fruit in a 5-fruit wave means ~83% chance of a bomb per wave, which is punishing
- [ ] Start lives at 5 instead of 3 — with a 12% bomb chance even from the start and three lives, a new player learning the controls can die before understanding the game
- [ ] Add a 3-second pre-game phase where fruit floats but cannot be sliced (and cannot be missed), allowing players to see the mechanics before the first life is at risk
- [ ] Improve the keyboard crosshair: expand the Space slash width from 120px to 200px, or allow holding Space to keep slicing, since the current keyboard controls feel inadequate for a fast-paced game
- [ ] Consider a score multiplier on the combo system that activates earlier (at 2x instead of 3x) to reward new players for consecutive slices
