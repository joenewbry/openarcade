# Factory Co-op

## Game Type
Real-time co-op action / overcooked-style factory management

## Core Mechanics
- **Goal**: Complete as many timed orders as possible within 3 minutes by carrying raw materials through paint, cut, and assemble machines, then delivering finished products to the output zone
- **Movement**: WASD to move the player character around a fixed factory floor; the AI ally moves automatically
- **Key interactions**: Space to grab from bins or pick up machine output; E to interact with machines or deliver to output; each recipe requires 3 sequential machine steps

## Controls
- `W` / `ArrowUp`: Move up (`PLAYER_SPEED = 2.5`)
- `S` / `ArrowDown`: Move down
- `A` / `ArrowLeft`: Move left
- `D` / `ArrowRight`: Move right
- `Space`: Grab from nearest bin or drop held item / pick up machine output
- `E`: Interact (also delivers to output zone)

## Difficulty Progression

### Structure
Difficulty increases every 600 frames (10 seconds at 60fps). Order time limits shrink with difficulty. New orders spawn on a countdown (`nextOrderTime`) that also shrinks with difficulty. The game runs for `ROUND_TIME = 180` seconds total.

### Key Difficulty Variables
- `difficulty`: starts at 1, increments by 1 every `600` frames (every ~10 seconds); no cap shown
- Order time limit: `30 - Math.min(difficulty * 2, 15)` seconds — starts at 28s (difficulty 1), shrinks to 15s minimum (difficulty 8+)
- Order spawn interval: `Math.max(4, 10 - difficulty)` seconds — starts at 9s (difficulty 1), hits floor of 4s (difficulty 6+)
- Max simultaneous orders: `Math.min(2 + Math.floor(difficulty / 2), 5)` — starts at 2, reaches 5 (difficulty 6+)
- Product variety: `Math.min(2 + difficulty, PRODUCT_KEYS.length)` recipes available (4 total) — starts with 2 recipes, all 4 unlocked by difficulty 2
- Machine processing time: fixed at 90 frames (~1.5 seconds) per step regardless of difficulty

### Difficulty Curve Assessment
The 10-second difficulty tick is far too aggressive. By the 1-minute mark (difficulty ~6), all four recipe types are active, orders are spawning every 4 seconds, the time limit is at its minimum (15s), and up to 5 simultaneous orders are on-screen. This is expert-level pressure before most players have learned the layout. The factory floor is also not immediately readable — bins, machines, and the output zone all look similar.

## Suggested Improvements
- [ ] Slow the difficulty tick from every 600 frames to every 1800 frames (30 seconds); the current 10-second escalation is too punishing to learn the game
- [ ] Start with `difficulty = 0` and only unlock the 3rd and 4th product types at difficulties 3 and 5, giving players time to master the simpler red/blue recipes
- [ ] Increase the initial order time limit from 28s to 40s (set base from `30` to `45`) — new players need time to learn the machine layout without order timers expiring
- [ ] Add distinct visual labels or icons on each machine type (PAINT/CUT/ASM already have text, but machine colors are confusingly similar at a glance) — consider making machines much larger visually or adding colored outlines
- [ ] Show a brief factory tour overlay at game start (2–3 seconds auto-advancing) pointing out bins, machines, and the output zone before the first order spawns
- [ ] The AI ally is helpful but claims orders aggressively (`order.claimed = 'ai'`); make the AI prefer unclaimed orders first for 30 seconds before competing with the player
