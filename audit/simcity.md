# Audit: SimCity

## Files Reviewed
- `simcity/game.js` (831 lines)
- `simcity/v2.html` (105 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Initializes map, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Growth simulation, tax collection, scrolling |
| `onDraw(renderer, text, alpha)` | Yes | Grid rendering with zone colors |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns population score |
| `input.isDown` | Yes | Arrow keys for map scrolling |
| `input.wasPressed` | Yes | Number keys 1-6 for zone selection, space to start |

## Architecture
- 40x40 world grid, 30px tiles, 20x20 viewport (600x600 canvas)
- 6 zone types: Residential, Commercial, Industrial, Road, Power Plant, Park
- Growth simulation: zones grow levels (0-3) based on conditions
- Tax system: periodic income based on population
- Power grid: BFS from power plants to determine powered zones
- Happiness system: affected by parks, road access, industrial proximity
- Bankruptcy: game over when money stays negative too long
- Mouse click to place zones, arrow keys to scroll viewport

## Observations

### Positive
- Solid city-building mechanics with interconnected systems
- Growth depends on road adjacency, power, and zone demand balance
- Tax revenue scales with population
- Visual feedback: zone colors, level indicators, powered status
- Minimap showing full world
- Keyboard zone selection (1-6) is efficient
- Happiness affects growth rate -- good strategic layer
- Bankruptcy timer gives player a chance to recover

### Concerns
- None significant -- clean implementation
- Could benefit from more visual polish (building sprites vs colored squares)

### State Management
- Clean state transitions: waiting -> playing -> over
- Game over triggered by bankruptcy (money negative for too long)
- Score is population count
- Best score tracked and persisted in DOM

## v2.html
- Canvas: 600x600
- Score bar with `#score` (population) and `#best`
- Zone key indicators `#zk1` through `#zk6` showing selected zone
- Color-coded zone legend at bottom
- Standard overlay for title/game-over
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Map renders, zones place, simulation runs, taxes collect |
| B) Playable? | PASS | Intuitive controls; keyboard zone selection + mouse placement works well |
| C) Fun? | PASS | Satisfying city growth loop; balanced systems create meaningful decisions |

## Recommended Fixes
None -- this game is well-implemented and complete.
