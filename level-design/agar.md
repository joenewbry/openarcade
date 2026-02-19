# Agar

## Game Type
Browser-based mass-accumulation / survival

## Core Mechanics
- **Goal**: Grow your cell by consuming food pellets and smaller AI cells. Become the largest cell on the map.
- **Movement**: Mouse cursor controls direction; the cell moves toward the cursor continuously. Larger cells move slower.
- **Key interactions**: Eating food pellets to grow mass, splitting your cell (W) to launch half your mass as a projectile to eat other cells, consuming AI cells smaller than yourself, being consumed by AI cells larger than yourself.

## Controls
- Mouse: aim direction of movement
- W key: split cell (launches half mass toward cursor)

## Difficulty Progression

### Structure
The game is open-ended with no explicit levels or rounds. Difficulty is entirely emergent from the current board state: 20 AI cells spawn at startup with random starting mass between 10 and 200, and they respawn after being eaten. Player starts at mass 20. The world is `4000x4000` units. Food count is fixed at `400` pellets; eaten pellets respawn immediately.

### Key Difficulty Variables
- `WORLD_SIZE`: `4000` (fixed). Larger world means more time before encountering threats.
- `FOOD_COUNT`: `400` (fixed). Pellets respawn instantly so food pressure never changes.
- `AI_COUNT`: `20` AI cells always present (fixed). Eaten AIs respawn with random mass `rand(10, 200)`.
- `BASE_SPEED`: `4`. Effective speed formula: `BASE_SPEED * (30 / (massToRadius(mass) + 20))`. As mass grows, speed drops significantly.
- `MIN_SPLIT_MASS`: `36`. Player must reach mass 36 before splitting is possible.
- `MERGE_TIME`: `300` frames (~5 seconds). After splitting, cells cannot merge for 5 seconds, leaving the player vulnerable.
- AI respawn mass: `rand(10, 200)`. Some AIs respawn already larger than a new player (mass > 20), creating immediate danger near spawn.

### Difficulty Curve Assessment
Early game is fair — at mass 20 the player is only threatened by the subset of AIs that spawned above mass 20. However, because AIs spawn with up to mass 200 (10x the player start), the map immediately contains cells that can eat the player. There is no grace period or safe starting zone. Mid game becomes easier as the player outgrows most AIs, but the constant respawn of fresh AIs at up to mass 200 means the threat level never scales down to zero. The split mechanic is unexplained and the cursor-based control gives no tutorial context for new players.

## Suggested Improvements
- [ ] Cap AI spawn mass at `40` for the first 60 seconds of play (while the player is below mass 100), then restore full `rand(10, 200)` range — this prevents an instant lethal encounter at spawn.
- [ ] Add a small safe-zone circle of radius `150` around the player's spawn point where AI cells cannot enter for the first 10 seconds.
- [ ] Display a one-time tooltip on first split attempt if mass < 36: "Need more mass to split — eat more pellets first."
- [ ] Show the player's current mass and a simple "rank" (e.g., "#4 of 20") in the HUD so players understand their standing relative to the AI field.
- [ ] Reduce `MERGE_TIME` from `300` frames to `180` frames (~3 seconds) to make the split mechanic feel less punishing for beginners who accidentally split.
- [ ] Add a slow, visible size indicator around food pellets that a player is large enough to eat, to teach the size-comparison mechanic visually.
