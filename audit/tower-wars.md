# Tower Wars - Audit

## A) Works?
**PASS**

The game initializes correctly. It uses the engine API properly: `new Game('game')`, `onInit`, `onUpdate(dt)`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. The v2.html has the correct DOM elements (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`). State transitions follow the `waiting -> playing -> over` pattern. Mouse click on canvas starts the game and also handles tower placement. BFS pathfinding, creep spawning, projectile tracking, and AI logic all appear structurally sound.

One minor note: DOM element lookups (`document.getElementById`) happen at module load time (lines 59-64), before `onInit`. This is fine because v2.html defines those elements above the script tag.

## B) Playable?
**PASS**

Controls are mouse-only (click to place towers on player grid, buttons to select tower type or send creeps). The click handler correctly maps screen coordinates to grid cells with proper scaling. Path validation prevents the player from blocking the only route. The sell mode (`selectedTower === -1`) works. Creep sending deducts gold. Hover preview shows placement validity and tower range. The AI opponent builds towers and sends creeps on a timer.

Potential friction: There is no keyboard shortcut for tower selection (1-4 keys) -- players must click buttons. This is a design choice, not a bug.

## C) Fun?
**PASS**

The game has solid tower defense mechanics with a competitive twist (player vs AI). Four distinct tower types (Arrow, Cannon/splash, Ice/slow, Zap/chain) provide meaningful strategic choices. Four creep types to send against the AI add an offensive dimension. Gold management (spend on towers vs creeps) creates interesting decisions. The AI provides a reasonable opponent. Visual feedback includes projectiles, particles, health bars, slow indicators, and path hints.

## Issues Found

1. **Particle color alpha append** (line 628): `p.color + hex` appends a 2-char hex to colors like `'#f84'` (3-char shorthand), producing invalid 5-char hex strings like `'#f84cc'`. Should normalize colors to 6-char (`#ff8844`) before appending alpha, or use 8-char colors in definitions. This causes particles to render with wrong/no color.

2. **`strokePoly` with 8-char hex color** (line 445): The path hint uses `'#2d822844'` (8-char RGBA hex). Whether this works depends on the engine's canvas context -- standard canvas `strokeStyle` supports 8-char hex in modern browsers, so this is likely fine.

3. **No keyboard controls**: Tower selection and creep sending are button-only. Adding hotkeys (1-4 for towers, Q/W/E/R for creeps) would improve playability significantly.

## Verdict: PASS

The game works, is playable, and is fun. The particle color bug (issue #1) is cosmetic only and does not affect gameplay. The core tower defense + creep sending loop is solid and engaging.
