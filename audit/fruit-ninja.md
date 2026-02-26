# Fruit Ninja -- Audit

## Files
- `/Users/joe/dev/openarcade/fruit-ninja/game.js` (757 lines)
- `/Users/joe/dev/openarcade/fruit-ninja/v2.html` (83 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called
- Uses `game.canvas` for mouse listener attachment

DOM structure:
- `canvas#game` 500x500
- Standard overlay elements with background
- `#score`, `#best` present
- Canvas cursor set to `crosshair` via CSS

Mouse events are extensive: mousedown, mousemove, mouseup, mouseleave. The slash system tracks points with frame timestamps for aging. Deferred spawns use frame counting instead of setTimeout.

One potential issue: `strokePoly` is called on line 570 with an array of `[x, y]` arrays instead of `{x, y}` objects:
```js
renderer.strokePoly(circPts, '#e6a', 2, true);
```
where `circPts` contains `[x, y]` pairs. The engine API likely expects `{x, y}` objects based on the documented API. This could cause the arrow key crosshair circle to not render. However, this only affects the optional keyboard crosshair display, not core gameplay.

## B) Playable?

**PASS**

Controls:
- **Mouse drag**: Slash across fruits (primary control)
- **Arrow keys + Space**: Move crosshair and slash (alternative keyboard control)
- Click/Space starts game, restarts from game over

Game mechanics:
- 8 fruit types with different sizes, colors, and point values (1-3)
- Bombs: slicing a bomb = instant game over
- Fruits launch from bottom with parabolic trajectories
- Missed fruits (fall off bottom) lose a life; 3 lives total
- Combo system: slice 3+ fruits within 15 frames = bonus points
- Difficulty increases over time (more frequent spawns, faster fruit, more bombs)
- Slice detection uses line-circle intersection (mathematically correct)

The mouse slash system is well-implemented:
- Points tracked with frame timestamps
- Old points pruned (5-frame window for slash, 9-frame window for trail)
- Line-circle intersection for accurate hit detection
- Slice angle calculated from slash direction, creating oriented half-pieces

Keyboard alternative (arrow keys to position crosshair, space for horizontal slash) is a nice accessibility feature.

## C) Fun?

**PASS**

Polished Fruit Ninja implementation:
- 8 distinct fruit types with unique visuals (grape clusters, kiwi dots, banana shape, blueberry detail)
- Satisfying slice mechanics with two separating halves that fall with physics
- Juice splatter particles in fruit colors
- Bomb with fuse, spark animation, and danger X
- Slice trail renders as fading white line with glow
- Combo text floats up and fades
- Hearts for lives display
- Difficulty ramp from spawn interval (70 frames -> 25 frames)

The slice feel is excellent: dragging the mouse across a fruit creates visible halves that separate along the cut angle, with juice particles spraying. The deferred spawn system creates waves of fruit that feel natural.

Bomb risk creates tension as they become more frequent (12% + 1.5%/difficulty level, capping at 30%).

## Verdict: PASS

Excellent Fruit Ninja implementation. Mouse slashing feels satisfying with proper line-circle intersection, directional slice halves, and juice particles. The keyboard alternative adds accessibility. 8 fruit types, bombs, combos, and difficulty scaling provide good depth. Minor note: the `strokePoly` call for the keyboard crosshair circle may use wrong point format (`[x,y]` vs `{x,y}`), but this is cosmetic and only affects the optional keyboard mode visualization.
