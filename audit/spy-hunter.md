# Audit: Spy Hunter

## Files Reviewed
- `spy-hunter/game.js` (783 lines)
- `spy-hunter/v2.html` (82 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Initializes state, shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Player movement, enemies, collisions, powerups, road scrolling |
| `onDraw(renderer, text, alpha)` | Yes | Road, vehicles, effects rendering |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns score |
| `input.isDown` | Yes | Arrow keys for steering/speed |
| `input.wasPressed` | Yes | Space (shoot), Z (oil), X (smoke) |

## Architecture
- 400x600 canvas (portrait orientation for vertical scroller)
- 4-lane road with variable scroll speed
- Player car with left/right steering and speed boost/brake
- 3 enemy types: Road Lord (chases), Switchblade (weaves across lanes), Enforcer (shoots back)
- Civilians (blue cars) -- penalty for hitting them
- Powerups: oil slick (drop behind), smoke screen (temporary cover), missile (powerful shot)
- Road forks: choose left or right path
- Distance-based scoring plus enemy kill bonuses
- Difficulty ramp: scroll speed and spawn rates increase over time

## Observations

### Positive
- Classic Spy Hunter feel with vertical scrolling road
- Enemy variety creates different tactical challenges
- Road Lord chases from behind -- must shoot or dodge
- Switchblade weaves unpredictably
- Enforcer shoots bullets player must avoid
- Civilian penalty discourages spray-and-pray
- Powerup system with distinct tactical uses (oil, smoke, missile)
- Road fork mechanic adds variety
- Road markings and shoulder stripes scroll smoothly
- Particle effects for explosions
- Score builds from both distance and combat

### Concerns
- None significant
- Road forks are cosmetic -- both paths converge quickly

### State Management
- Clean transitions with proper overlay usage
- Two game-over paths: player collision death and enforcer bullet death
- Both correctly call `showOverlay` and `setState('over')`
- Score and best score tracked

## v2.html
- Canvas: 400x600 (portrait)
- Score bar with `#score` and `#best`
- Standard overlay for title/game-over
- Controls: "Arrows: Drive | SPACE: Shoot | Z: Oil | X: Smoke"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Road scrolls, enemies spawn, powerups work, scoring tracks |
| B) Playable? | PASS | Responsive steering, clear enemy differentiation, good difficulty ramp |
| C) Fun? | PASS | Satisfying arcade driving/shooting with meaningful powerup choices |

## Recommended Fixes
None -- this game is well-implemented and complete.
