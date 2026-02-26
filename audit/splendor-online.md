# Audit: Splendor Online

## Files Reviewed
- `splendor-online/game.js` (963 lines)
- `splendor-online/v2.html` (83 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Sets up card decks, shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | AI turn logic, message timer, turn flow |
| `onDraw(renderer, text, alpha)` | Yes | Card market, gems, player hands rendering |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns player prestige score |
| `input.wasPressed` | No | Uses direct canvas click/contextmenu listeners |

## Architecture
- 650x500 canvas
- 2-player game: human vs AI
- 3-tier card market (4 face-up cards per tier)
- 5 gem types (ruby, sapphire, emerald, diamond, onyx) + gold (wild)
- Nobles: visit automatically when gem discount thresholds met
- Actions: buy card (click), reserve card (shift+click or right-click), take gems (click gem tokens)
- Gem limits: max 10 gems per player, max 3 gold tokens
- Win condition: first to 15 prestige points (with finish-the-round rule)
- Seeded RNG via mulberry32 for reproducible card generation

## Observations

### Positive
- Faithful Splendor adaptation with all core mechanics
- AI with card evaluation: considers cost, discount value, prestige, noble progress
- AI gem-taking strategy: prioritizes gems needed for affordable cards
- Reserve mechanic with gold token economy
- Noble auto-visit system
- Last-round rule: if a player hits 15, finish the round so both players have equal turns
- Clean card rendering with gem costs, prestige points, discount indicators
- Hover highlighting for interactive elements
- Message system for game events
- Right-click and shift+click for reserve action

### Concerns
- Uses direct canvas click/contextmenu event listeners instead of engine input system
- `contextmenu` event listener with `preventDefault` for right-click reserve -- works but non-standard
- No undo/confirmation for gem taking actions
- Gem return UI when over 10 gems could be confusing

### State Management
- Clean transitions: waiting -> playing -> over
- Game over calls `game.setState('over')` and `game.showOverlay()` with win/loss message
- AI thinking timer adds slight delay for natural feel

## v2.html
- Canvas: 650x500 (wider than standard 600)
- Score bar with `#score` and `#aiScore`
- Standard overlay for title/game-over
- Controls: "Click: Buy/Take | Shift+Click: Reserve | Right-Click: Reserve"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Cards generate, purchasing works, AI plays, nobles visit, win detection works |
| B) Playable? | PASS | Intuitive click-based UI, clear gem/card display |
| C) Fun? | PASS | Deep strategic gem game with competent AI opponent |

## Recommended Fixes
None -- this game is well-implemented and complete.
