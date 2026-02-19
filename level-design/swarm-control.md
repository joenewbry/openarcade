# Swarm Control — Level Design Notes

## Game Type
Real-time strategy swarm game (1 player vs 1 AI, timed match).

## Core Mechanics
- **Goal**: Destroy the AI's Hive (200 HP) before the AI destroys yours, within `MATCH_DURATION = 180` seconds (3 minutes). If time expires, highest surviving Hive HP wins.
- **Units**: Both sides start with 50 units. Player units are directed by clicking (move entire swarm) or dragging (split swarm 50/50). AI units respond autonomously based on `AI_INTERVAL = 90` frame decisions.
- **Capture nodes**: Neutral nodes scattered on the map. Units near a node capture it after `NODE_SPAWN_INTERVAL = 120` frames. Captured nodes spawn additional units toward a team's total.
- **Hive spawning**: `HIVE_SPAWN_INTERVAL = 200` frames generates units from the Hive itself.
- **Key interactions**: Send swarm to attack enemy units (attrition), capture nodes (economy), or attack the Hive directly (win condition). Split swarm to divide attention.

## Controls
- **Left click**: Move entire swarm to clicked position
- **Click + Drag**: Split swarm ~50/50, send half to drag destination
- **Scroll wheel**: Zoom in/out (range: 0.5–2.0)
- **No hotkeys listed**: All control is mouse-based

## Difficulty Progression

### Structure
Single fixed 3-minute match against an AI opponent. No difficulty levels, no escalation within the match, no increasing AI aggression. Both sides start at identical strength (50 units each). The AI makes decisions at a fixed `AI_INTERVAL = 90` frames (~1.5 seconds) throughout the entire match.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| Starting units | 50 per side | Equal initial forces |
| `MAX_UNITS` | 150 | Unit cap per side |
| `UNIT_SPEED` | 1.6 | Units move at this speed |
| `ATTACK_DAMAGE` | 0.35 | Damage per attack per frame |
| `ATTACK_RANGE` | 18 | Pixel range for unit attacks |
| `NODE_SPAWN_INTERVAL` | 120 frames (~2s) | Node capture speed |
| `HIVE_SPAWN_INTERVAL` | 200 frames (~3.3s) | Hive unit generation rate |
| `MAX_UNITS` cap | 150 | Maximum units per side |
| Hive HP | 200 | Win condition threshold |
| `MATCH_DURATION` | 180 seconds | Timer to end match |
| `AI_INTERVAL` | 90 frames (~1.5s) | AI decision frequency |

### Difficulty Curve Assessment
- **Equal start means immediate competition**: Both sides at 50 units with identical stats creates a neutral game where player decisions from the first second determine outcome. A new player who doesn't know to split and capture nodes will fall behind within 30 seconds.
- **AI decision frequency of 90 frames (1.5s) is very reactive**: The AI evaluates the entire map and redirects its swarm every 1.5 seconds. A human player thinking about a split maneuver for 3 seconds will find the AI has already repositioned twice. This is too reactive for new players to outmaneuver.
- **No tutorial for swarm-split mechanic**: The drag-to-split mechanic is the key strategic move (multi-tasking node capture + direct attack). It's not surfaced anywhere. A player who only uses left-click (whole-swarm movement) is playing with one hand tied behind their back.
- **3 minutes feels rushed for node economy**: Capturing nodes takes 120 frames (~2 seconds) per node. With 3 minutes total, capturing even 3 nodes takes 6 seconds of investment — meaningful but barely enough time to compound economic advantage before the match ends.
- **Unit damage accumulation has no visual feedback**: `ATTACK_DAMAGE = 0.35` per frame means units die in meaningful numbers per second. But with 50+ units on each side, the mass combat visual makes it hard to read who is winning. No health bar for swarms.

## Suggested Improvements

1. **Add difficulty modes** — expose an `AI_DIFFICULTY` setting:
   - `Easy`: `AI_INTERVAL = 180` frames (3 seconds), AI starts with 30 units instead of 50.
   - `Medium`: Current behavior (`AI_INTERVAL = 90`, 50 units).
   - `Hard`: `AI_INTERVAL = 45` frames (0.75s), AI starts with 60 units.
   New players on Easy face an AI that reacts half as fast and starts weaker, making node capture economy viable.

2. **Add a split-swarm tutorial prompt on first launch** — when the game starts for the first time (or always on first match), display a brief overlay: "Click to move your swarm. Click and drag to split it." Highlight the drag interaction with an animated hint. The drag-split is essential and completely undiscoverable without documentation.

3. **Give the player a starting unit advantage on Easy** — start player at 65 units vs AI at 35 on Easy mode. A 30-unit head start gives new players enough margin to learn node capture and positioning without immediately losing attrition battles. Units are equal once `MAX_UNITS = 150` is reached, so the advantage naturally equalizes.

4. **Extend `MATCH_DURATION` from 180 to 240 seconds (4 minutes)** — 3 minutes is very short for an RTS with node economy. An extra minute allows strategic patterns to fully develop — capturing 3–4 nodes, building unit advantage, then transitioning to Hive assault. The current 3 minutes punishes slow starts severely.

5. **Add a node-count HUD indicator** — display "Nodes: Player 2 / AI 3" at all times. Knowing the node economy status is critical strategic information in any RTS. Without it, players have no feedback on whether their economy is ahead or behind, making strategic decisions feel like guesses.

6. **Add unit count display with swarm health estimate** — show "Your units: 47 | Enemy units: 61" as a live counter. Without this information, the player cannot tell if they're winning or losing the attrition battle. This single HUD addition transforms the opacity of mass combat into readable strategic information.
