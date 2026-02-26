# Audit: Simon

## Files Reviewed
- `simon/game.js` (441 lines)
- `simon/v2.html` (83 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Phase state machine, sequence playback, input handling |
| `onDraw(renderer, text, alpha)` | Yes | Panel rendering with glow effects |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | Yes | Explicitly called when starting game |
| `setScoreFn()` | Yes | Returns current score (sequence length) |
| `input.wasPressed` | Yes | Space to start, number keys 1-4, arrow keys for panels |

## Architecture
- 4 colored panels in 2x2 grid (green, red, yellow, blue)
- Phase state machine: idle -> pre-show -> showing -> input -> flash-correct/flash-wrong
- Web Audio API for tone generation (E4, C4, A3, E3 frequencies)
- Sequence grows by 1 each round
- Both keyboard (1-4 or arrow keys) and mouse click input
- Rounded corner panels using `fillPoly` with corner segments

## Observations

### Positive
- Clean, well-structured phase state machine
- Audio feedback with distinct tones per panel (Web Audio API)
- Dual input: mouse clicks on panels + keyboard shortcuts
- Smooth visual feedback: panels light up during show and input phases
- Proper timing: sequence playback speed increases as game progresses
- Glow effects on active panels using `setGlow`
- Score and best score tracking
- Central circle decoration between panels

### Concerns
- None -- this is one of the cleanest implementations in the set
- The game is simple by nature but executes well

### State Management
- Engine state transitions are clean and correct
- Both `showOverlay` and `hideOverlay` are explicitly called (one of few games that does this)
- Game over shows score and restart prompt

## v2.html
- Canvas: 400x450
- Score bar with `#score` and `#best`
- Standard overlay for title/game-over
- Controls note: "Keys 1-4 / Arrows / Click panels"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Sequence plays, input registers, scoring works |
| B) Playable? | PASS | Responsive controls, clear visual/audio feedback |
| C) Fun? | PASS | Classic Simon gameplay, well-paced difficulty ramp |

## Recommended Fixes
None -- this game is clean and complete.
