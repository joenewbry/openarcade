# Donkey Kong - Audit

## A) Works?
**NEEDS_FIX** - Uses engine API correctly overall: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`, `hideOverlay()`. DOM elements all present. Canvas is 480x560. `setScoreFn` is called. However, `fillPoly` is called with array-of-arrays (`[[x,y], [x,y]]`) on lines 601-605 (drawPlatform) and lines 735-739 (drawPrincess), instead of the required `[{x,y}, {x,y}]` object format. This will cause rendering errors for platforms and the princess dress.

## B) Playable?
**NEEDS_FIX** - Arrow keys move left/right, Space jumps, Up/Down for ladders. Barrel throwing, gravity, platform collision with slopes, ladder climbing -- all logic is correct. Jumping over barrels scores 100 points. Reaching the princess completes the level. The gameplay mechanics work, but the visual rendering bug (array-of-arrays in fillPoly) means platforms and the princess dress will not render correctly or may throw errors, making the game confusing visually.

## C) Fun?
**NEEDS_FIX** - The gameplay design is solid -- sloped platforms with barrels rolling along them, broken ladders, gorilla throw animations, level progression with increasing barrel speed. Mario-like character with climbing poses, jumping arms, overalls, and hat detail. The princess has blinking "HELP!" text. But the rendering bug undermines the experience since platforms are the core visual element.

## Issues
- **BUG**: `fillPoly` called with `[[x,y], ...]` arrays instead of `[{x,y}, ...]` objects in `drawPlatform` (line 601-605) and `drawPrincess` (line 735-739). The engine API requires `{x, y}` objects. This will cause platforms and the princess to render incorrectly or crash.
- **Minor**: `best` resets to 0 on each `onInit` (no persistence).
- **Minor**: `jumpedBarrels` Set is created but the barrel scoring check at line 510 uses `b.scored` flag instead, making `jumpedBarrels` dead code.
- **Minor**: Level transition uses `rgba()` string (line 576) which may or may not be supported by the WebGL renderer -- depends on implementation.

## Verdict: NEEDS_FIX
The `fillPoly` argument format bug for platforms and princess will cause visual breakage. Platforms are the core game element; without them rendering, the game is not visually playable.
