# Audit: Settlers Online

## Files Reviewed
- `settlers-online/game.js` (1311 lines)
- `settlers-online/v2.html` (103 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Generates board, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Handles AI turns, animations |
| `onDraw(renderer, text, alpha)` | Yes | Full hex board rendering |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | No | Draws its own title screen on canvas |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns player VP score |
| `input.wasPressed` | Yes | Used for space/click to start |

## Architecture
- Full Settlers of Catan implementation: hex board, vertices, edges
- 4 players (1 human + 3 AI)
- Setup phase: each player places 2 settlements + 2 roads
- Turn phases: roll dice, build, trade
- Resources: wood, brick, ore, grain, sheep
- Buildings: roads, settlements, cities
- Special: longest road tracking, robber (on 7 roll)
- Trading: 4:1 bank trades
- Win condition: first to 10 VP

## Observations

### Positive
- Comprehensive Catan implementation with all core mechanics
- Hex board with proper vertex/edge topology generation
- AI opponents with building priority logic and trading
- Proper turn flow: roll -> build actions -> end turn
- Resource distribution on dice rolls
- Longest road calculation
- Robber placement on 7s (discard if > 7 cards)
- Clean canvas rendering with hex tiles, resource colors, dice display
- Message log for game events
- Hover highlighting for buildable vertices/edges

### Concerns
- Does not use `showOverlay()` for title screen -- draws its own title directly on canvas during 'title' gameState
- Internal `gameState` variable ('title', 'playing', 'gameOver') runs parallel to engine state
- The title screen is drawn in `onDraw` when `gameState === 'title'`, not using the DOM overlay at all
- Trade UI is basic (4:1 bank only, no player-to-player negotiation)
- No development cards (standard Catan feature)

### Engine State Mapping
- `gameState === 'title'` -> `game.setState('waiting')` at init, but overlay hidden since title is canvas-drawn
- `gameState === 'playing'` -> `game.setState('playing')`
- `gameState === 'gameOver'` -> `game.setState('over')` with `showOverlay` is NOT called -- game over is rendered on canvas

### Game Over Handling
When a player reaches 10 VP, `gameState` is set to 'gameOver' and `game.setState('over')` is called, but `showOverlay()` is not called. The game-over screen is rendered in-canvas. This means:
- No difficulty adjustment available in overlay
- Clicking restarts the game (handled in onUpdate)

## v2.html
- Canvas: 600x550
- Custom score-bar with `.player-vp` and `.turn-info` spans
- Standard overlay div exists but is drawn over by canvas content
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Board generates, turns progress, AI plays, VP tracks correctly |
| B) Playable? | PASS | Click-based UI is intuitive; setup, building, trading all functional |
| C) Fun? | PASS | Faithful Catan adaptation with competent AI; good strategic depth |

## Recommended Fixes
1. Call `game.showOverlay()` on game over for difficulty selector access
2. Consider adding development cards for fuller Catan experience (enhancement, not bug)
