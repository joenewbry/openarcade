# Capture the Flag

## Game Type
Top-down multiplayer action / team tactics (1 human vs 3 AI teammates vs 4 AI enemies)

## Core Mechanics
- **Goal**: Capture the enemy flag and return it to your base 3 times before the red team does
- **Movement**: WASD or arrow keys for 8-directional movement; speed varies by class (Scout 3.2, Medic 2.2, Engineer 2.0, Heavy 1.6 px/frame)
- **Key interactions**: Shoot at enemies with mouse click, pick up enemy flag with E key, return dropped friendly flags by walking over them, use class ability with Q

## Controls
- WASD or Arrow Keys: Move
- Mouse click (left, held): Shoot in mouse direction
- E: Pick up enemy flag
- Q: Use class ability

## Difficulty Progression

### Structure
The game is a single-round match with no difficulty scaling. First team to 3 captures wins. There is no time limit. The AI team composition is fixed (scout, heavy, medic, engineer) with predetermined roles (2 attackers, 1 medic support, 1 defender). Map layout is procedurally generated each game.

### Key Difficulty Variables
- Human player starts with `hp` from their chosen class (Scout 60, Heavy 150, Medic 80, Engineer 90)
- AI fire rate: `fireRate` in ms per shot (Scout 180ms, Heavy 400ms, Medic 250ms, Engineer 300ms) — same as player
- AI shoot range: `nearestEnemyDist < 220` for attackers, `< 200` for defenders
- Respawn timer: `respawnTimer = 5` seconds for both player and AI — fixed
- AI attacker aggro: moves toward enemy flag if it is at base or dropped, ignores it if carried (chases carrier's team instead)
- Engineer turret: `hp 80, damage 5, fireRate 500ms, range 150 px`; up to 3 per engineer
- Score: +50 per capture, +10 per kill

### Difficulty Curve Assessment
With no difficulty ramping, the game's challenge is fixed at its starting level. The red team's AI is competent (pathfinds, uses abilities, coordinates roles) making first-time players likely to lose repeatedly. The Scout class starts with only 60 HP and no defensive option — beginners who pick Scout for its speed will get deleted almost immediately. Flag pickup requiring the E key is also non-obvious and can leave players confused about why the flag isn't being grabbed.

## Suggested Improvements
- [ ] Add a difficulty selector (Easy/Normal/Hard) that adjusts AI `speed` by ±0.3 and `damage` by ±4 — Easy mode would give the red team stats at 80% to help new players learn
- [ ] Increase Scout starting HP from 60 to 80 to make it a viable beginner class
- [ ] Make flag pickup automatic when the human player walks over it (the AI already gets auto-pickup; the E key requirement creates an unfair disadvantage for the human player specifically)
- [ ] Add a 3-second respawn invincibility window instead of spawning players live — currently the player can be shot immediately upon respawn near contested bases
- [ ] Reduce AI attacker shoot range from 220 to 160 px to give the human player more room to maneuver without taking fire from across the map
- [ ] Show a brief tutorial overlay explaining E = flag pickup and Q = ability on first game launch
