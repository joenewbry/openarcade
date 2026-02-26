# Audit: Sandbox Physics

## Files Reviewed
- `sandbox-physics/game.js` (927 lines)
- `sandbox-physics/v2.html` (63 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Physics step during test phase, particle updates |
| `onDraw(renderer, text, alpha)` | Yes | Full rendering pipeline |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing transitions |
| `showOverlay()` | Yes | Used for initial title screen |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns `score.p1` |
| `input.isDown/wasPressed` | No | Uses direct mouse events on canvas instead |

## Architecture
- Custom mouse event listeners on canvas (mousedown, mouseup, mousemove) rather than engine input system
- Uses a `startBtn` DOM button inside the overlay to trigger game start
- Split-screen design: left half = player build zone, right half = AI build zone
- Internal `gameState` and `phase` variables manage flow independently from engine state
- Challenge-based progression: 5 physics challenges, each with build (30s) + test phases
- Results displayed via in-canvas rendering (not DOM overlay)

## Observations

### Positive
- Physics engine is solid: gravity, friction, bounce, collisions all implemented
- 8 material/tool types (wood, metal, rubber, wheel, spring, rocket, hinge, rope)
- AI builds automatically during player's build phase
- Ghost preview shows where objects will be placed
- Connection system (hinge/rope/spring) via drag between objects
- Particles for visual feedback
- 5 distinct challenge types with different goals (launch, tower, bridge, protect, rube goldberg)

### Concerns
- No keyboard controls at all -- entirely mouse-driven, which is fine for this type of game
- Uses direct DOM event listeners instead of engine's input system for mouse -- works but diverges from pattern
- The `startBtn` inside the custom overlay HTML means the standard overlay system is bypassed for game start
- No `setState('over')` is ever called -- after all 5 challenges, game just stops updating (gameState set to 'done' but engine state stays 'playing')
- No game-over overlay with difficulty selector since setState('over') is never reached
- The `score.p1` pattern is non-standard but works with `setScoreFn`

### Missing Game Over State
After completing all 5 challenges, the code sets `gameState = 'done'` and updates the DOM scoreBar, but never calls `game.setState('over')` or `game.showOverlay()`. The results are shown in-canvas. This means:
- No difficulty adjustment is available
- No restart prompt via standard overlay
- The recorder session never ends properly

## v2.html
- Canvas: 600x500
- Custom toolbar with tool buttons (Wood, Metal, Rubber, Wheel, Spring, Rocket, Hinge, Rope, Delete)
- Custom statusBar, scoreBar, topBar -- significantly diverges from standard template
- Uses `<button id="startBtn">` inside overlay instead of click-to-start pattern
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Renders, physics simulates, challenges progress |
| B) Playable? | NEEDS_FIX | No proper game-over state; after 5 challenges, stuck with no restart option |
| C) Fun? | PASS | Creative sandbox with good variety of challenges and materials |

## Recommended Fixes
1. Call `game.setState('over')` and `game.showOverlay()` after the final challenge results
2. Add restart capability (click/key to reset after game ends)
3. Consider using `_gameRef.setState('over')` pattern for proper recorder session end
