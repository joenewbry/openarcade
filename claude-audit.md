# OpenArcade - Code Audit

Audited: 2026-02-15

## Project Summary

A collection of 7 browser-based arcade games (Tetris, Flappy Bird, Snake, Space Invaders, Breakout, Pong, Asteroids) with a shared landing page. Each game is a single self-contained HTML file with inline CSS and JavaScript. Tetris has an additional AI autoplay mode with WebSocket integration for training data collection. Total codebase: ~7,065 lines across 16 HTML files (15 game files + 1 landing page) plus a shared CSS file.

**Maturity**: Early prototype / hobby project. 6 commits over 3 days. No build system, no tests, no CI, no linting, no `.gitignore`.

---

## Speed Improvements

### S1. No build system or dev server
There is no `package.json`, no dev server, and no hot reload. You have to open HTML files directly in a browser and manually refresh after changes. Adding even a basic setup (e.g., `npx serve .` or `vite` with zero config) would speed up iteration. A live-reload dev server would save cumulative minutes per session.

### S2. No `.gitignore`
**File**: (missing)
Any IDE config, `.DS_Store`, or accidental files will end up tracked. Should add a basic `.gitignore` immediately.

### S3. No linting or formatting
No ESLint, Prettier, or any code quality tooling. Since the JS is all inline in HTML files, consider at minimum an `.editorconfig` for consistent formatting, or extract JS to separate files to enable standard tooling.

### S4. Tetris has 3 near-identical variants that must be manually kept in sync
- `/Users/joe/dev/openarcade/tetris/index.html` (447 lines)
- `/Users/joe/dev/openarcade/tetris/keypad.html` (460 lines)
- `/Users/joe/dev/openarcade/tetris/autoplay.html` (1031 lines)

Changes to game logic (e.g., piece definitions, collision, rotation, scoring) must be manually replicated across all three files. The `keypad.html` differs from `index.html` only by: (a) added keypad HTML/CSS, (b) ArrowDown maps to `hardDrop()` instead of soft drop, (c) 3 lines of keypad visualizer JS. The `autoplay.html` copy-pastes the entire engine and adds ~580 lines of AI + WebSocket code on top. Any bug fix to core Tetris must be applied in 3 places.

### S5. All 7 games have index.html + keypad.html duplication
Every game except Tetris has a `keypad.html` that is an exact copy of `index.html` plus ~40 lines of keypad HTML/CSS and 3 lines of JS. This doubles the file count and means every game bug must be fixed in 2 places:
- `flappy/index.html` (299 lines) vs `flappy/keypad.html` (336 lines)
- `snake/index.html` (233 lines) vs `snake/keypad.html` (270 lines)
- `space-invaders/index.html` (875 lines) vs `space-invaders/keypad.html` (912 lines)
- `breakout/index.html` (326 lines) vs `breakout/keypad.html` (346 lines)
- `pong/index.html` (313 lines) vs `pong/keypad.html` (335 lines)
- `asteroids/index.html` (427 lines) vs `asteroids/keypad.html` (455 lines)

The keypad could instead be a toggleable overlay or a URL parameter (`?keypad=1`), eliminating ~2,700 lines of duplication.

---

## Reliability Improvements

### R1. No error handling anywhere
No `try/catch` blocks, no error boundaries, no graceful failure. If any runtime error occurs (e.g., a null canvas context), the game silently breaks with no feedback to the user.

### R2. Snake `placeFood()` can infinite loop
**File**: `/Users/joe/dev/openarcade/snake/index.html`, line 106-111 (same in `keypad.html` line 138-143)
```javascript
function placeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}
```
If the snake fills the entire board (20x20 = 400 cells), this loops forever, freezing the browser. Should either detect a win condition or use a list of available cells.

### R3. Tetris randomizer is purely random (no bag system)
**File**: `/Users/joe/dev/openarcade/tetris/index.html`, line 160-163
```javascript
function randomPiece() {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
  ...
}
```
Standard Tetris uses a 7-bag randomizer to prevent long droughts of needed pieces. The current implementation can give the same piece many times in a row, which creates an unfair experience and also means the AI training data has a non-standard distribution.

### R4. Pong AI prediction uses unbounded while loop
**File**: `/Users/joe/dev/openarcade/pong/index.html`, lines 155-158
```javascript
while (aiTarget < 0 || aiTarget > H) {
  if (aiTarget < 0) aiTarget = -aiTarget;
  if (aiTarget > H) aiTarget = 2 * H - aiTarget;
}
```
If `ballVY` is very large relative to `ballVX`, `timeToReach` can be huge, making `aiTarget` far out of bounds. The reflection loop should work correctly for normal values, but lacks a safety iteration limit.

### R5. WebSocket in autoplay has no message validation
**File**: `/Users/joe/dev/openarcade/tetris/autoplay.html`, lines 983-989
```javascript
ws.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    handleWSMessage(msg);
  } catch (e) {
    // Ignore malformed messages
  }
};
```
The `handleWSMessage` function processes `msg.action` and `msg.mode` without any validation. A malicious or buggy WebSocket server could inject arbitrary actions. The `executeAction` function at line 928 accepts any string, meaning unexpected action values silently do nothing but could mask bugs.

### R6. No persistent high scores
All "best" scores are stored only in JavaScript variables and are lost on page refresh. `localStorage` could trivially persist them.

### R7. requestAnimationFrame loops have no frame-rate independence
**Files**: All games using `requestAnimationFrame` (flappy, space-invaders, breakout, pong, asteroids)
Game physics are tied to frame rate. On a 120Hz monitor, Flappy Bird will run at double speed. On a slow machine, everything slows down. Should use delta-time calculations for consistent behavior.

---

## Code Quality

### Q1. Massive code duplication across index/keypad pairs (critical)
As detailed in S4 and S5 above, roughly 38% of the total codebase (2,700+ lines) is exact duplication between `index.html` and `keypad.html` variants. This is the single largest quality issue.

### Q2. Massive code duplication between Tetris variants (critical)
The Tetris game engine (init, randomPiece, spawnPiece, collides, lock, animateFlash, rotate, drop, hardDrop, ghostY, move, draw, drawBlock, drawNext) is copy-pasted across 3 files:
- `tetris/index.html` (lines 111-444)
- `tetris/keypad.html` (lines 141-458)
- `tetris/autoplay.html` (lines 191-510)

These copies have drifted: `index.html` has soft-drop behavior (lines 140-141, 264-272, 420-441) that `keypad.html` lacks (it maps ArrowDown to hardDrop instead). The `autoplay.html` version adds return values to `move()` (line 377) and `rotate()` (line 343) that the other versions don't have. Any future engine fix risks being applied inconsistently.

### Q3. Inline CSS is duplicated across every game file
Each game file contains 50-95 lines of nearly identical inline CSS (background color, font, body layout, header, overlay styles). Only the accent color changes per game. This could be a shared `game.css` with CSS custom properties for the accent color.

### Q4. `findBestMove()` function is dead code
**File**: `/Users/joe/dev/openarcade/tetris/autoplay.html`, lines 759-782
The `findBestMove()` function (single-piece evaluation without lookahead) is defined but never called. Only `findBestMoveWithLookahead()` (line 784) is used in `scheduleAIMove()` (line 891). This is dead code.

### Q5. `flashTimer` variable declared but never used
**File**: `/Users/joe/dev/openarcade/tetris/index.html`, line 139
**File**: `/Users/joe/dev/openarcade/tetris/keypad.html`, line 169
**File**: `/Users/joe/dev/openarcade/tetris/autoplay.html`, line 223
```javascript
let flashRows = [], flashTimer = 0, flashPhase = 0, showTetrisText = 0;
```
`flashTimer` is initialized to 0 but never read or written anywhere. Only `flashPhase` is used for the animation.

### Q6. Inconsistent back-link paths
**File**: `/Users/joe/dev/openarcade/space-invaders/index.html`, line 60
**File**: `/Users/joe/dev/openarcade/space-invaders/keypad.html`, line 80
```html
<a href="../index.html" class="back">
```
All other games use `<a href="../" class="back">`. Space Invaders uses `../index.html`. Both work, but the inconsistency suggests copy-paste errors.

### Q7. `hit` variable set but never read
**File**: `/Users/joe/dev/openarcade/space-invaders/index.html`, line 455 and 483
```javascript
let hit = false;
...
hit = true;
break;
```
The `hit` variable is set to `true` and then `break` exits the loop. The variable is never checked after the loop ends. This appears in both `index.html` and `keypad.html` of Space Invaders.

### Q8. Tetris keypad.html has different ArrowDown behavior from index.html
**File**: `/Users/joe/dev/openarcade/tetris/keypad.html`, line 445
```javascript
case 'ArrowDown': hardDrop(); break;
```
vs `tetris/index.html` line 420-426 where ArrowDown is soft-drop. This behavioral divergence between two variants of the "same" game is confusing and undocumented.

---

## Architecture Concerns

### A1. No separation of concerns -- everything is in one HTML file per game
All CSS, HTML, and JavaScript for each game lives in a single monolithic HTML file. The largest (Space Invaders) is 912 lines. This makes it impossible to share code, run tests, use linting, or do any static analysis. Even basic extraction into `<game>.js` and `<game>.css` files would enable tooling.

### A2. No shared game engine or framework
Each game implements its own game loop, input handling, overlay system, score display, and draw utilities from scratch. Common patterns (init/start/gameOver state machine, keydown/keyup handlers, overlay management, score tracking) are reimplemented 7-8 times. A lightweight shared game framework (even 100 lines) could eliminate significant duplication.

### A3. The AI autoplay architecture is tightly coupled to the game engine
**File**: `/Users/joe/dev/openarcade/tetris/autoplay.html`
The AI code directly mutates game state (`pos`, `current.shape`, `board`) and calls game functions (`move()`, `rotate()`, `hardDrop()`). Because the game engine is copy-pasted into the same file, there's no API boundary. If the game engine is updated in `index.html`, the AI version must be manually kept in sync, and any engine change can break the AI without warning.

### A4. No mobile/touch support
All games require keyboard input (arrow keys, spacebar). There are no touch event handlers. The keypad visualizer is display-only -- it shows which keys are pressed but doesn't accept touch input. On mobile devices, the games are completely unplayable.

### A5. Tetris autoplay WebSocket URL is hardcoded
**File**: `/Users/joe/dev/openarcade/tetris/autoplay.html`, line 952
```javascript
const WS_URL = 'ws://localhost:9876';
```
The WebSocket URL is hardcoded to `localhost:9876`. If the training server runs elsewhere, this requires editing the source file. Should be configurable via URL parameter or environment.

---

## Quick Wins

### W1. Eliminate index/keypad duplication with a query parameter (high impact, ~1 hour)
Add a `?keypad=1` URL parameter check. If present, dynamically inject the keypad HTML and attach the 3-line keypad visualizer event listener. This eliminates 7 duplicate files (~2,700 lines) and ensures all bug fixes are applied once.

### W2. Add `.gitignore` (5 minutes)
Create a basic `.gitignore` with `.DS_Store`, `node_modules/`, `.idea/`, `.vscode/` entries.

### W3. Persist high scores in localStorage (15 minutes per game)
Replace `let best = 0` with `let best = parseInt(localStorage.getItem('snake-best') || '0')` and save on update. Immediately makes the games feel more polished.

### W4. Remove dead code in autoplay.html (5 minutes)
Delete the unused `findBestMove()` function (lines 759-782) and the unused `flashTimer` variable.

### W5. Extract shared CSS into a `game.css` file (30 minutes)
The body, header, back link, overlay, and score-bar CSS is nearly identical across all games. Extract it into a shared file and use a CSS custom property like `--accent-color` for per-game theming. This saves ~600 lines.

### W6. Add frame-rate independence to requestAnimationFrame games (30 minutes each)
Pass `timestamp` from `requestAnimationFrame` callback, calculate `deltaTime`, and multiply all velocities/movements by it. This ensures games run at consistent speed across different monitors and hardware.

### W7. Fix the Snake infinite-loop risk (10 minutes)
Before the random food placement loop, check if the snake length equals the total grid cells. If so, display a "You Win!" screen. As a safety measure, add a maximum iteration count to the while loop.
