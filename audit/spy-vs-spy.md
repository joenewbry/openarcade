# Audit: Spy vs Spy

## Files Reviewed
- `spy-vs-spy/game.js` (900 lines)
- `spy-vs-spy/v2.html` (85 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Generates rooms, places items, shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Player/AI movement, combat, searching, timer |
| `onDraw(renderer, text, alpha)` | Yes | Room rendering, split view (player + AI rooms) |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns score |
| `input.isDown` | Yes | Arrow keys / WASD for movement |
| `input.wasPressed` | Yes | Space (search), Z (set trap), X (use item), C (disguise) |

## Architecture
- 600x400 canvas
- 4x3 grid of rooms with doors connecting them
- Two spies: player (white) and AI (black)
- Furniture types: desk, cabinet, safe, bookshelf, plant, locker
- Documents: 4 hidden in furniture, collect all to win
- Traps: place on furniture to damage opponent
- Disguise mechanic: temporarily invisible to AI
- Combat: rock-paper-scissors system when spies meet
- 3-minute timer -- time runs out, most documents wins
- AI with BFS pathfinding to navigate rooms

## Observations

### Positive
- Unique stealth/exploration gameplay -- rare genre for browser games
- Room-based world with connected doors
- Furniture searching mechanic adds tension (traps could be hidden)
- Trap system creates mind games -- booby-trap searched furniture
- Rock-paper-scissors combat is simple but effective
- AI opponent with pathfinding and search priorities
- Disguise mechanic for avoiding combat
- Timer creates urgency
- Split display: player's room and AI's room shown simultaneously
- Document counter and trap inventory in HUD
- Message system for event feedback

### Concerns
- Combat (rock-paper-scissors) is pure luck -- could be frustrating
- AI pathfinding could occasionally seem random
- No indication of which furniture has been searched (player must remember)

### State Management
- Clean transitions with proper overlay usage
- Game over via: timer expiry, all documents collected, or player defeated
- `game.showOverlay()` called with win/loss message
- `game.setState('over')` called properly
- Score based on documents collected

## v2.html
- Canvas: 600x400
- HUD with `#playerDocs`, `#playerTraps`, `#timer`, `#score`
- Standard overlay for title/game-over
- Controls: "Arrows/WASD: Move | SPACE: Search | Z: Trap | X: Use | C: Disguise"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Rooms generate, furniture searchable, traps work, combat resolves, timer counts down |
| B) Playable? | PASS | Clear controls, informative HUD, understandable mechanics |
| C) Fun? | PASS | Tense hide-and-seek gameplay with strategic trap placement |

## Recommended Fixes
None -- this game is well-implemented and complete.
