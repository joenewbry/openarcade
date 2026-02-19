# Sniper Duel

## Game Type
Turn-based tactical shooter (1v1, player vs AI)

## Core Mechanics
- **Goal**: Reduce the AI opponent's HP to 0 before it does the same to you; each player has 5 HP
- **Movement**: After each shot, the player chooses a new cover position from a set of highlighted positions; the AI automatically repositions
- **Key interactions**: Aiming with the mouse and clicking to fire; shots are affected by gravity and wind; headshots deal 2 HP, body shots deal 1 HP

## Controls
- `Mouse move` — aim crosshair
- `Mouse click` — fire bullet (during player aim phase) / start or restart game (during waiting/over)
- `Scroll wheel` — zoom scope in/out (range: 1x–3x, during aim phase only)
- `Click highlighted cover zone` — move to new cover position (during movement phase)

## Difficulty Progression

### Structure
The game has no escalating levels or waves. Each match is a single combat encounter: the player takes a shot, then the AI takes a shot, then both reposition. This repeats until one combatant reaches 0 HP. Wind (`wind.x` up to ±60 px/s, `wind.y` up to ±15 px/s) is regenerated each AI turn, requiring the player to adapt their aim each round.

### Key Difficulty Variables
- `GRAVITY`: `180` px/s² — bullets drop significantly over distance
- `BULLET_SPEED`: `420` px/s
- `player.hp` / `ai.hp`: both start at `5`
- AI aim error: `errorX = (Math.random() - 0.5) * 0.35 * 60` (±10.5 px) and `errorY = (Math.random() - 0.5) * 0.35 * 40` (±7 px) — the AI applies wind and gravity compensation at 70% efficiency, then adds a random offset; this makes it dangerous but not perfectly accurate
- Wind: `wind.x` in range `[-60, +60]`, `wind.y` in range `[-15, +15]`
- Player cover positions: 4 fixed positions at x ∈ {60, 110, 155, 195}
- AI cover positions: 4 fixed positions at x ∈ {405, 445, 505, 535}

### Difficulty Curve Assessment
The difficulty is fixed throughout — there is no ramp. The AI is reasonably accurate from the very first shot and the game offers no easier introductory rounds. Because both sides start with 5 HP and the AI compensates for wind and gravity (at 70%), a new player with no experience of ballistic aiming can be killed in 3–5 rounds with little recourse. The single-match format with no checkpoints means each loss is a complete restart.

## Suggested Improvements
- [ ] Add an "Easy" mode where AI error multiplier is increased from `0.35` to `0.7` (doubling spread), giving beginners a chance to learn the ballistics system
- [ ] Give the player a dotted trajectory preview (already partially implemented via the aim dots) that shows more tick marks — extend from `tm < 3` to `tm < 4` so players can see where the bullet will land near the AI position at full distance
- [ ] Start the player with a practice shot before the AI's first real turn — a "dry fire" round where the AI does not return fire, letting new players understand the gravity drop before HP stakes begin
- [ ] Display the expected drop distance numerically on the HUD (a "Calc Drop" value already exists showing `dist * 0.12` px, but it could be made more prominent)
- [ ] Allow repositioning before the first shot, so the player can choose their initial cover rather than always starting at `PLAYER_COVERS[0].x = 60`
- [ ] Add an optional 3-round match format (first to 3 wins) so a single bad shot doesn't immediately lead to a restart
