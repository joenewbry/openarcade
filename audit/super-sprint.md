# Audit: Super Sprint

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> Space/arrows -> `playing` (with 3s countdown) -> race end -> `over` -> key -> re-init.
- `showOverlay` used at init, race win, and game over. `setScoreFn` wired.
- 3 tracks defined with waypoints: Oval Speedway, Figure Eight, Grand Prix.
- Car class handles physics: steering, acceleration, braking, friction, off-track slowdown.
- AI controllers with skill-level-based wobble and lookahead waypoint targeting.
- DOM refs (`score`, `best`) accessed directly -- v2.html provides them.
- v2.html: canvas 600x600, overlay present but missing `background` style on overlay div.

## B) Playable?
**PASS**

- Controls: Left/Right or A/D to steer, Up or W to accelerate. Simple and intuitive.
- 3-second countdown before race starts.
- Lap tracking with half-lap anti-cheat (must pass halfway point before lap counts).
- Oil slicks cause reduced steering and potential spinouts.
- Wrench pickups grant speed boosts (up to 3).
- Car-to-car collisions with knockback.
- Track progression: win 1st to advance to next track.
- Position indicator, speed display, minimap.

## C) Fun?
**PASS**

- Good racing feel with steering-based controls (not tank controls).
- Track variety creates progression.
- Oil slicks and wrenches add tactical elements.
- AI racers provide competition with varying skill levels.
- Minimap is helpful for tracking positions.
- Clean neon visual style matches the arcade theme.

## Issues
- `colorWithAlpha` function (line 366-369) parses 3-digit hex colors by reading single chars, which works for shorthand hex like `#ae4` but would fail on 6-digit hex. The colors used (`#654`, `#ff0`, `#fa0`) are all 3-digit, so this works in practice, but 6-digit hex like `#ff0000` would break. This is fragile.
- Overlay div in v2.html lacks `background` style, making overlay text potentially hard to read.
- `rgba(...)` color strings are used directly (e.g., `'rgba(255,255,255,0.6)'` on line 612). The engine needs to support this format in addition to hex colors.
- `player._graceTimer` is set as an ad-hoc property on the Car instance (line 541). Works but is slightly messy.
- On game over, `currentTrack` is reset to 0 (line 583), so losing means starting from the first track again. This is intentional difficulty design.

## Verdict: PASS
Solid top-down racer with good progression, multiple tracks, and competent AI. Minor cosmetic issues with overlay background.
