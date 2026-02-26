# Elevator Action -- Audit

## Files
- `/Users/joe/dev/openarcade/elevator-action/game.js` (1049 lines)
- `/Users/joe/dev/openarcade/elevator-action/v2.html` (83 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with proper `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called

DOM structure:
- `canvas#game` 480x600
- Standard overlay elements
- `#score`, `#docs`, `#best` present

The game stores a `_gameRef` at module scope to access `game.input` inside draw functions (line 472: `const input_keys = _gameRef.input`). This is used to check if Space is held for the gun arm animation in `drawPlayer`. Reading input in draw is a minor code smell but doesn't cause bugs since it's read-only.

Camera system works correctly -- smooth scrolling follows player with lerp factor 0.08, clamped to building bounds.

## B) Playable?

**PASS**

Controls:
- **Left/Right arrows**: Move horizontally
- **Up arrow**: Jump (when grounded and not on elevator) / Ride elevator up
- **Down arrow**: Crouch / Ride elevator down / Collect documents at red doors
- **Space**: Shoot

Game flow:
- Player starts at top floor, must collect all red door documents
- Collect by pressing Down near an uncollected red door
- Navigate via floor platforms and elevator shafts
- Elevators auto-move but player controls direction with Up/Down while riding
- Enemies patrol, become alerted when player is within range, then chase and shoot
- After collecting all docs, reach EXIT zone at bottom to advance levels
- 3 lives, invulnerability frames on hit
- Enemies respawn gradually (every 180 frames if below threshold)

The level generation is procedural: each level has more floors, more shafts, more docs, and more enemies. The building is vertically scrolling with a minimap in the top-right corner.

Elevator mechanics are well-implemented: player can ride, control direction, and step off onto platforms. Collision detection handles both floor segments and elevator platforms.

## C) Fun?

**PASS**

Faithful Elevator Action recreation:
- Spy fedora character with purple glow theme
- Alert system on enemies (! indicator, color change from dark to bright red)
- Pulsing red doors with "TOP SECRET" label
- Minimap showing player position, enemies, doors, and camera viewport
- Level progression with building preview on waiting screen
- Smooth camera following
- Exit zone glows green when all docs collected, grey otherwise with "NEED DOCS" text
- Particle effects on kills and door collection

The game captures the core Elevator Action loop: navigate building, avoid/fight enemies, collect documents, escape. The procedural level generation means each playthrough is different.

## Verdict: PASS

Well-executed Elevator Action port. Controls are responsive, the elevator mechanic works smoothly, and the spy theming is cohesive. Procedural generation, minimap, and alert system add depth. The only minor concern is reading input in onDraw for the gun arm animation, but this is cosmetic and harmless.
