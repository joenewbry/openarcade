# Volleyball 2D - Audit

## A) Works?
**PASS**

The game initializes correctly using the engine API: `new Game('game')`, `onInit`, `onUpdate()`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`, `hideOverlay()`. The v2.html has all required DOM elements (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`). The game uses a custom internal `gameState` variable (`waiting`, `serving`, `playing`, `scored`, `over`) alongside the engine's state system. Canvas is 600x400 (standard size).

DOM refs (`scoreEl`, `bestEl`, `matchInfo`) are accessed without null guards, but the HTML defines them before the script tag so this works.

## B) Playable?
**PASS**

Controls: Arrow Left/Right to move, Arrow Up to jump, Space to spike. Controls are responsive and feel correct for a volleyball-style game. The game supports both keyboard and mouse click to start/serve. The serve mechanic (ball floats above your player, press key to launch) is intuitive.

The AI uses ball trajectory prediction (`predictBallLanding`) to position itself and jumps/spikes contextually. It provides a competent opponent.

Physics feel reasonable: gravity, ball bounce with decay, net collision, wall bounces, and a max bounce count (3) per side before awarding a point. The max ball speed clamp prevents physics explosions.

## C) Fun?
**PASS**

The game captures the core volleyball loop well: serve, rally, score. The slime-volleyball style (half-dome characters) is a proven fun format. The spike mechanic adds a satisfying offensive option. The bounce limit (3 per side) creates urgency without being too punishing. Visual polish includes: ball trail, particle effects on hits and scores, shadow under ball and players, eye tracking the ball, spike indicator, match point notification. First to 15 gives a full match feeling.

## Issues Found

1. **`onUpdate` ignores `dt` parameter** (line 588): The update function does not use delta time. Physics runs per-frame, meaning the game speed is tied to framerate. At 120Hz the game runs twice as fast; at 30Hz it runs half speed. This affects gravity, movement, ball physics, and the score timer.

2. **Score timer is frame-based** (line 291, 604): `scoreTimer = 60` counts down by 1 per frame. At 60fps this is 1 second, but at other framerates it varies.

3. **`bestEl` used for CPU score** (line 260, 525): The `#best` element is repurposed to display the CPU's score rather than a best/high score. The HTML label says "CPU:" which matches, but the element ID `best` is misleading. The v2.html correctly labels it "CPU: <span id='best'>0</span>", so this is a naming inconsistency rather than a bug. However, it means there is no persistent best score tracking.

4. **Particle color alpha append on short hex** (lines 472-474): The `drawParticles` function handles both 4-char (`#fff`) and 7-char (`#ffffff`) hex strings when appending alpha. It slices to get the base color, then appends a 2-char alpha hex. For 4-char input like `#4af`, `base = p.color.slice(0, 4)` gives `#4af`, then `#4af` + alpha gives a 6-char string like `#4afcc`, which is not valid hex. This is the same class of bug as tower-wars. Colors like `#ff0` from spike particles would be affected.

5. **8-char hex color strings used extensively**: Colors like `#ffffff26`, `#ffffff4d`, `#ffffff66`, `#ffffff88`, `#ffffff40`, `#00000050`, `#00000033`, `#00000026`, `#ffffff1a`, `#ffffff1e`, `#ffff96XX` (with appended alpha) are used throughout. Whether these work depends on the engine's WebGL color parser supporting 8-char hex. In standard Canvas2D, 8-char hex is supported in modern browsers, but in a custom WebGL renderer it depends on the implementation.

6. **Document-level key listeners** (lines 537-565): Key events are registered on `document`, not the canvas. This means keys are captured even when the user is interacting with other page elements (e.g., the score bar, back link). The `e.preventDefault()` on arrow keys could interfere with page scrolling. This is a minor UX issue.

7. **Duplicate start/serve logic**: The keydown handler (lines 542-560) and click handler (lines 568-586) contain identical code for starting and serving. This is code duplication, not a bug, but makes maintenance harder.

## Verdict: PASS

The game works, is playable, and is fun. The framerate-dependent physics (issue #1) is the most significant concern but is common across many games in the collection. The particle color bug (issue #4) is cosmetic. The core volleyball gameplay loop is satisfying with good AI, nice visual polish, and a proper match structure.
