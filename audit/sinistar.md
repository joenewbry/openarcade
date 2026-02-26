# Audit: Sinistar

## Files Reviewed
- `sinistar/game.js` (1122 lines)
- `sinistar/v2.html` (82 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Initializes entities, shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Ship movement, entity AI, collision detection |
| `onDraw(renderer, text, alpha)` | Yes | World rendering with camera offset |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing -> over transitions |
| `showOverlay()` | Yes | Title and game-over screens |
| `hideOverlay()` | Yes | Explicitly called when starting game |
| `setScoreFn()` | Yes | Returns score |
| `input.isDown` | Yes | Arrow keys for rotation/thrust |
| `input.wasPressed` | Yes | Space to fire, Shift for sinibomb |

## Architecture
- 3000x3000 wrapping world
- Ship with rotation, thrust, friction physics
- Entity types: planetoids (crystal sources), workers (mine crystals, build Sinistar), warriors (attack player)
- Sinistar boss: built from 20 pieces by workers, chases player when complete
- Sinibombs: player collects 5 crystals to craft 1 sinibomb, the only weapon against Sinistar
- Camera follows player with smooth tracking
- Minimap in corner showing entity positions
- Level progression: completing Sinistar advances level, increases difficulty

## Observations

### Positive
- Faithful recreation of the classic arcade game concept
- Complex entity AI: workers gather crystals and deliver to Sinistar, warriors patrol and chase
- Wrapping world with proper distance calculations
- Sinistar build progress meter adds tension
- Warning system when Sinistar is nearby or fully built
- Sinibomb mechanic creates meaningful resource management
- Lives system with invincibility frames on respawn
- Minimap essential for navigating large world
- Level scaling increases enemy counts and aggression
- Particle effects for explosions and thrust
- `pendingRespawns` array replaces setTimeout for deterministic respawns

### Concerns
- None significant -- well-implemented arcade game
- Sinistar's skull rendering is simple but effective

### State Management
- Clean state transitions with proper overlay usage
- Game over shows score and restart prompt
- Both showOverlay and hideOverlay are explicitly called
- `shiftConsumed` flag ensures one sinibomb per key press

## v2.html
- Canvas: 500x500
- Score bar with `#score`, `#lives`, `#bombs`
- Standard overlay for title/game-over
- Controls: "Arrows: Fly | SPACE: Shoot | SHIFT: Sinibomb"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | All systems functional: ship, enemies, Sinistar, combat, levels |
| B) Playable? | PASS | Responsive controls, clear HUD, good difficulty curve |
| C) Fun? | PASS | Tense gameplay with excellent resource management and boss mechanic |

## Recommended Fixes
None -- this game is well-implemented and complete.
