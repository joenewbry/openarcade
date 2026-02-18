# OpenArcade Game Generation Instructions

Master reference for generating new arcade games. Each game is built by a separate Claude Code instance. Follow these instructions exactly to produce a game that integrates with the project's data collection pipeline and visual design system.

---

## 1. File Structure Requirements

Each game lives in its own folder at the repo root.

```
openarcade/
  your-game-name/
    index.html      ← clean version (required)
    keypad.html      ← version with arrow key visualizer (required)
  recorder.js        ← shared data collection script (already exists, do NOT modify)
  index.html         ← landing page (update to add your game card)
  styles.css         ← landing page styles (update to add your game's card colors)
```

**Folder naming rules:**
- All lowercase
- Use hyphens for multi-word names (e.g., `space-invaders`, not `spaceInvaders` or `Space_Invaders`)
- Short and descriptive (the folder name becomes the game identifier in the data pipeline)

**Both `index.html` and `keypad.html` must include this script tag as the LAST script before `</body>`:**

```html
<script src="../recorder.js?v=2"></script>
```

The `keypad.html` version is identical to `index.html` except it adds a visual arrow key indicator next to the canvas. It does NOT include the recorder script tag (only `index.html` does). See Section 11 for the keypad template.

---

## 2. HTML Template

Every game follows this exact HTML structure. Replace `GAME_NAME`, `GAME_TITLE`, `THEME_COLOR`, `CANVAS_WIDTH`, `CANVAS_HEIGHT`, and `RGBA_THEME` with your game's values.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GAME_TITLE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 16px;
      width: CANVAS_WIDTHpx;
    }
    .back { color: THEME_COLOR; text-decoration: none; font-size: 1.2rem; }
    .back:hover { text-shadow: 0 0 10px RGBA_THEME; }
    h1 { color: THEME_COLOR; font-size: 2rem; text-shadow: 0 0 15px RGBA_THEME; }
    .score-bar {
      display: flex;
      justify-content: space-between;
      width: CANVAS_WIDTHpx;
      margin-bottom: 10px;
      font-size: 1.1rem;
    }
    .score-bar span { color: THEME_COLOR; }
    canvas {
      border: 2px solid THEME_COLOR;
      box-shadow: 0 0 20px RGBA_THEME;
      display: block;
    }
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: THEME_COLOR;
      text-align: center;
      pointer-events: none;
      background: rgba(26, 26, 46, 0.85);
    }
    .overlay h2 { font-size: 1.8rem; margin-bottom: 10px; }
    .overlay p { font-size: 1rem; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <a href="../" class="back">&larr; Back</a>
    <h1>GAME_NAME</h1>
  </div>
  <div class="score-bar">
    <div>Score: <span id="score">0</span></div>
    <div>Best: <span id="best">0</span></div>
  </div>
  <div style="position: relative; display: inline-block;">
    <canvas id="game" width="CANVAS_WIDTH" height="CANVAS_HEIGHT"></canvas>
    <div class="overlay" id="overlay" style="width:CANVAS_WIDTHpx;height:CANVAS_HEIGHTpx;">
      <h2 id="overlayTitle">GAME_NAME</h2>
      <p id="overlayText">Press SPACE to start</p>
    </div>
  </div>

  <script>
    // Your game code here (see Section 3)
  </script>
  <script src="../recorder.js?v=2"></script>
</body>
</html>
```

**Critical structural details:**
- The canvas and overlay are wrapped in `<div style="position: relative; display: inline-block;">` so the overlay positions correctly on top of the canvas.
- The overlay's inline style must set `width` and `height` to match the canvas dimensions exactly.
- The `.header` and `.score-bar` width should match `CANVAS_WIDTH` for alignment.
- The overlay includes `pointer-events: none` so it does not block interaction.
- The overlay uses `background: rgba(26, 26, 46, 0.85)` for a semi-transparent dark backdrop over the canvas.

---

## 3. JavaScript Requirements

### CRITICAL Global Variables

The recorder depends on these. If they are missing or wrong, no data gets collected.

```javascript
// MUST be declared with `let` at the top-level scope of your <script> tag.
// The recorder reads these by name.

let gameState;  // MUST be one of: 'waiting', 'playing', 'over'
let score;      // MUST be a number that increments during gameplay
```

`gameState` controls when the recorder starts and stops capturing:
- `'waiting'` = title screen, game has not started yet. Recorder is idle.
- `'playing'` = gameplay is active. Recorder captures frames and keyboard events.
- `'over'` = game ended. Recorder stops and uploads the segment.

The recorder also detects state from the overlay DOM element as a fallback. When `overlay.style.display = 'none'`, the recorder infers `'playing'`. When the overlay is visible and contains "GAME OVER" text, it infers `'over'`. But you should ALWAYS set the `gameState` variable directly -- it is more reliable.

### Game State Machine

Every game must implement this state flow:

```
WAITING ──(user presses key)──> PLAYING ──(death/loss)──> OVER
   ^                                                        │
   └────────────────(user presses key)──────────────────────┘
```

Implementation pattern (follow this exactly):

```javascript
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');

let score, best = 0, gameState;

function init() {
  score = 0;
  scoreEl.textContent = '0';
  gameState = 'waiting';
  overlay.style.display = 'flex';       // Show overlay
  overlayTitle.textContent = 'GAME_NAME';
  overlayText.textContent = 'Press SPACE to start';
  draw();
}

function start() {
  gameState = 'playing';
  overlay.style.display = 'none';       // Hide overlay -- triggers recorder
  loop();
}

function gameOver() {
  gameState = 'over';                    // Triggers recorder upload
  overlay.style.display = 'flex';       // Show overlay
  overlayTitle.textContent = 'GAME OVER';
  overlayText.textContent = `Score: ${score} — Press any key to restart`;
}

// Game loop using requestAnimationFrame
function loop() {
  if (gameState !== 'playing') return;
  update();
  draw();
  requestAnimationFrame(loop);
}

// Keyboard handler
document.addEventListener('keydown', (e) => {
  // Prevent default for game keys to avoid page scrolling
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (gameState === 'waiting') {
    start();
    return;
  }

  if (gameState === 'over') {
    init();      // Reset and go back to waiting
    return;
  }

  if (gameState === 'playing') {
    // Handle game-specific input here
  }
});

init();
```

### Timer-based games (alternative to requestAnimationFrame)

Some games (like Snake) use `setTimeout` ticks instead of `requestAnimationFrame`. This is fine -- just make sure `gameState` is set correctly at every transition. Example:

```javascript
function tick() {
  clearTimeout(timer);
  if (gameState !== 'playing') return;
  update();
  draw();
  timer = setTimeout(tick, interval);
}
```

### Score updating

Always update both the `score` variable AND the DOM element:

```javascript
score += 10;
scoreEl.textContent = score;
if (score > best) {
  best = score;
  bestEl.textContent = best;
}
```

---

## 4. Data Collection Integration

### How recorder.js works

`recorder.js` is a drop-in script that runs passively alongside your game. You do NOT need to call any recorder functions. It automatically:

1. **Finds the canvas** -- looks for `canvas#game` first, falls back to any `<canvas>` element.
2. **Polls game state** every 200ms -- reads the global `gameState` variable or infers state from the overlay DOM.
3. **Starts recording** when `gameState` changes to `'playing'` (captures frames + keyboard events).
4. **Stops recording** when `gameState` changes to `'over'` (uploads the collected segment).
5. **Shows a "TRAINING AI" badge** in the bottom-right corner (fixed position, does not interfere with gameplay).

### What it captures

**Canvas frames:**
- 2 frames per second (every 500ms)
- JPEG format at 0.7 quality
- Captured via `canvas.toBlob()`
- Frames are concatenated into a single binary blob with an index for upload

**ALL keyboard events:**
- `keydown` and `keyup` events for EVERY key pressed (not just arrow keys)
- Each event includes: `timestamp_ms`, `type` (keydown/keyup), `key` (browser key name), `keyCode`
- This means games can use any keys they want -- WASD, number keys, letter keys, etc. -- and all input will be captured
- Common key mappings for reference:

| Browser key   | Typical use                |
|---------------|----------------------------|
| `ArrowLeft`   | Move left                  |
| `ArrowRight`  | Move right                 |
| `ArrowDown`   | Move down / crouch         |
| `ArrowUp`     | Move up / jump             |
| `' '` (Space) | Action / fire              |
| `w/a/s/d`     | Alternative movement       |
| `e/q/r/f`     | Interact / ability keys    |
| `1-9`         | Item/weapon selection      |
| `Shift`       | Sprint / modifier          |
| `Enter`       | Confirm / chat             |

**Mouse events:**
- `mousemove`: recorded at up to 30 Hz (throttled) with canvas-relative `x`, `y` coordinates
- `mousedown` / `mouseup`: button presses with `button` identifier (0=left, 1=middle, 2=right) and canvas-relative `x`, `y`
- `click`: click events with canvas-relative `x`, `y`
- `wheel`: scroll wheel delta for zoom/selection mechanics
- All mouse coordinates are relative to the canvas element (0,0 = top-left of canvas), NOT the page
- Mouse events outside the canvas bounding box are ignored

**Combined event stream:**
All keyboard and mouse events are interleaved in a single timestamped event array, making it easy to reconstruct the full input sequence during training. Each event has a `type` field (`keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`, `click`, `wheel`) so they can be filtered by category.

### Upload format

Every 60 seconds (or when a session ends), the recorder uploads a segment via POST to `/api/ingest/browser` as `multipart/form-data`:

- `metadata` (JSON string): game name, session ID, collector ID, segment number, canvas dimensions, current score, timestamp, user agent
- `frames` (binary blob): concatenated JPEG frame data
- `frame_index` (JSON string): array of `{offset, length, timestamp_ms}` for each frame
- `events` (JSON string): unified array of all input events, each with:
  - Keyboard: `{timestamp_ms, type: 'keydown'|'keyup', key, keyCode}`
  - Mouse move: `{timestamp_ms, type: 'mousemove', x, y}`
  - Mouse button: `{timestamp_ms, type: 'mousedown'|'mouseup'|'click', button, x, y}`
  - Scroll: `{timestamp_ms, type: 'wheel', deltaX, deltaY, x, y}`

The game name is auto-detected from the URL path (the folder name).

### What you do NOT need to do

- Do NOT import or initialize the recorder
- Do NOT call any recorder functions
- Do NOT add a recording toggle or UI
- Do NOT worry about upload failures (the recorder silently discards them)
- Do NOT add the "TRAINING AI" badge -- the recorder creates it automatically

---

## 5. Visual Style Guide

All games share a consistent retro/neon aesthetic. Follow these rules:

### Colors

- **Page background:** `#1a1a2e` (dark navy)
- **Canvas background:** `#1a1a2e` (same as page, or use a subtle gradient)
- **Grid lines (if applicable):** `#16213e`
- **Card/panel background:** `#16213e`
- **Panel borders:** `#0f3460`
- **Text color:** `#e0e0e0` (light gray)
- **Secondary text:** `#aaa` or `#888`
- **Theme accent:** A unique neon color per game (see below)

### Existing theme colors (do NOT reuse these):

| Game            | Accent Color | Hex     |
|-----------------|--------------|---------|
| Tetris          | Magenta      | `#f0f`  |
| Space Invaders  | Green        | `#0f0`  |
| Flappy Bird     | Yellow       | `#ff0`  |
| Snake           | Cyan         | `#0ff`  |
| Breakout        | Orange       | `#f80`  |
| Pong            | Lavender     | `#88f`  |
| Asteroids       | Red          | `#f44`  |

Pick a color that is visually distinct from all of the above. Good options include: `#f08` (hot pink), `#0f8` (mint), `#f84` (coral), `#8f0` (lime), `#48f` (blue), `#fa0` (amber), `#a4f` (purple), `#0af` (sky blue).

### Typography

- Font: `'Courier New', monospace` everywhere
- Title (`h1`): `2rem`, theme color, with `text-shadow: 0 0 15px` using the theme color at ~0.4 alpha
- Overlay title (`h2`): `1.8rem`
- Score bar: `1.1rem`

### Neon glow effects

Use `shadowColor` and `shadowBlur` on the canvas context for neon glow:

```javascript
ctx.fillStyle = '#0ff';
ctx.shadowColor = '#0ff';
ctx.shadowBlur = 12;
// ... draw something ...
ctx.shadowBlur = 0;  // Always reset after drawing
```

Use CSS `box-shadow` on the canvas border:

```css
canvas {
  border: 2px solid THEME_COLOR;
  box-shadow: 0 0 20px RGBA_THEME;
}
```

### Canvas sizing

Common canvas sizes used in existing games:
- **400x400** -- Snake (grid-based, square)
- **400x600** -- Flappy Bird (tall portrait)
- **300x600** -- Tetris (tall portrait, narrow)
- **480x560** -- Breakout (wide portrait)
- **600x400** -- Pong (landscape)
- **600x600** -- Asteroids (large square)

Choose a size appropriate for your game. Keep it reasonable (not too small to see, not too large to display on a laptop screen). Width should not exceed 600px.

---

## 6. Game Design Principles for ML Training Value

These games exist to generate training data for ML models that learn to play from screen pixels and keyboard actions. Design your game with this in mind.

### Clear visual state

- Every game object should be visually distinct and unambiguous
- Avoid overlapping elements that obscure game state
- Use high-contrast colors against the dark background
- The score and key game info should be readable at 2fps JPEG captures

### Discrete or well-defined actions

- Each input (keypress, mouse click, mouse movement) should produce a clear, observable effect on the game state
- Both discrete actions (click to place, press to jump) and continuous actions (mouse aim, held-key movement) produce valuable training data
- Mouse-based aiming/pointing games are particularly valuable -- they capture continuous spatial decision-making that maps well to screen automation tasks
- Prefer games with clear action-reaction patterns

### Progressive difficulty

- Start easy and ramp up over time
- This naturally generates training data at varied difficulty levels
- Examples: increasing speed, more obstacles, faster enemies

### Short game sessions

- Games should last 30 seconds to 3 minutes on average
- More sessions = more training episodes = better ML data
- Avoid games that can last indefinitely at a steady state

### Visible reward signal

- Score must be visible on the canvas or in the score bar at all times
- Score should increase frequently (not just at level completion)
- The connection between actions and score should be obvious

### Minimize pure randomness

- Some randomness is fine (spawn positions, etc.)
- But the game should be primarily skill-based
- A perfect player should be able to consistently score high
- Avoid instant-death scenarios that are impossible to react to

### Rich observable state

Consider adding a global object with game-specific state for richer data extraction:

```javascript
// Optional but valuable -- the recorder doesn't read this directly,
// but future data pipelines could
window.gameData = {
  playerX: player.x,
  playerY: player.y,
  enemies: enemies.map(e => ({x: e.x, y: e.y})),
  // etc.
};
```

---

## 7. Controls & Input

### Input philosophy

The recorder captures **ALL keyboard input and ALL mouse input** on the canvas. This means games are free to use whatever control scheme makes sense -- arrow keys, WASD, mouse aiming, click-to-place, scroll wheel, any combination. Every input event is recorded with a timestamp for ML training.

### Recommended control patterns by game type

| Game Type | Primary Input | Examples |
|-----------|--------------|---------|
| Maze / Navigation | Arrow keys | Pac-Man, Snake, Sokoban |
| Platformer | Arrow keys + Space | Donkey Kong, Mario, Doodle Jump |
| Shooter (fixed) | Arrow keys + Space | Space Invaders, Galaga |
| Shooter (aiming) | Mouse aim + click to fire, WASD to move | Robotron, twin-stick shooters |
| Puzzle (placement) | Mouse click on grid | Minesweeper, Tower Defense, Sudoku |
| Puzzle (falling) | Arrow keys + Space | Tetris, Dr. Mario, Columns |
| Strategy | Mouse click + keyboard shortcuts | Tower defense, Lemmings |
| Physics (aiming) | Mouse aim + click to launch | Missile Command, Peggle, Angry Birds |
| Racing | Arrow keys or WASD | Road Fighter, Outrun |
| Card / Board | Mouse click to select/play | Poker, Solitaire |

### Rules

- **preventDefault on game keys** to avoid page scrolling:

```javascript
document.addEventListener('keydown', (e) => {
  // Prevent scrolling for common game keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  // ... rest of handler
});
```

- **Use `e.key` (string-based)** for keyboard events, not the deprecated `e.keyCode`.
- **Both `keydown` and `keyup` are recorded**, so held-key mechanics work fine for data collection.
- **Mouse coordinates are canvas-relative** in the recorded data (the recorder handles the offset calculation). Your game logic should also use canvas-relative coordinates for consistency.
- **Right-click context menu**: If your game uses right-click, prevent the context menu:

```javascript
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
```

### Mouse-based games

Mouse-based games are fully supported and encouraged. The recorder captures:
- Cursor position at up to 30 Hz (smooth tracking data)
- All button presses/releases with coordinates
- Scroll wheel events

For mouse games, make sure gameplay happens on the canvas element. The recorder only tracks mouse events within the canvas bounds.

Example mouse handler pattern:

```javascript
const canvasRect = canvas.getBoundingClientRect.bind(canvas);

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Use x, y for game logic (aiming, hovering, etc.)
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Use x, y for game logic (placing, selecting, firing, etc.)
});
```

### Touch support

Touch controls are optional but nice-to-have for mobile play. Touch events are NOT currently recorded by the data pipeline, but may be added in the future.

---

## 8. Testing Checklist

Before considering the game complete, verify all of the following:

- [ ] **Canvas renders** at the correct size and is visible
- [ ] **`gameState` variable** is accessible from the browser console and updates correctly:
  - Starts as `'waiting'`
  - Becomes `'playing'` when the game starts
  - Becomes `'over'` on death/loss
  - Returns to `'waiting'` after restart
- [ ] **`score` variable** is accessible from the browser console and increments during gameplay
- [ ] **Overlay** shows on title screen and game over, hides during gameplay (`display: none`)
- [ ] **Overlay text** says "GAME OVER" (or similar) on the game over screen (the recorder uses this as a fallback detection method)
- [ ] **recorder.js loads** without errors and the "TRAINING AI" badge appears in the bottom-right
- [ ] **All game controls** work correctly (keyboard and/or mouse)
- [ ] **Arrow keys do not scroll the page** (preventDefault is called)
- [ ] **Mouse input** (if used) works correctly with canvas-relative coordinates
- [ ] **Game restarts cleanly** after game over (no stale state, timers, or animation frames)
- [ ] **No console errors** during any game state
- [ ] **Canvas has `id="game"`** on the element
- [ ] **Score bar** updates in real-time during gameplay
- [ ] **Back link** (`<a href="../">`) works to return to the landing page
- [ ] **keypad.html** exists and shows the arrow key visualizer

---

## 9. Landing Page Integration

After creating the game, update the landing page to include it.

### Step 1: Add the game card to `/index.html`

Add a new `<a>` element inside the `<div class="games-grid">`:

```html
<a href="your-game-name/index.html" class="game-card card-yourgamename">
  <h2>Your Game Title</h2>
  <p class="description">One or two sentences describing the game. Keep it punchy and action-oriented.</p>
  <p class="controls"><span>Controls:</span> Brief description of controls</p>
</a>
```

The `card-yourgamename` class is used for color styling (see step 2). Use a short class suffix (no hyphens). For example, `space-invaders` uses `card-invaders`.

### Step 2: Add card colors to `/styles.css`

Add two CSS rules at the end of `styles.css`:

```css
.card-yourgamename h2 { color: THEME_COLOR; }
.card-yourgamename:hover { border-color: THEME_COLOR; box-shadow: 0 8px 30px RGBA_THEME_015; }
```

Where `RGBA_THEME_015` is the theme color at 0.15 alpha. For example, if your theme color is `#f08`:

```css
.card-hotpink h2 { color: #f08; }
.card-hotpink:hover { border-color: #f08; box-shadow: 0 8px 30px rgba(255, 0, 136, 0.15); }
```

---

## 10. Example: Minimal Working Game

Below is a complete, minimal game that satisfies all requirements. It is a "Dodge" game where the player moves left/right to dodge falling objects. Use this as a structural reference -- your actual game should be more interesting.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dodge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 16px;
      width: 400px;
    }
    .back { color: #f08; text-decoration: none; font-size: 1.2rem; }
    .back:hover { text-shadow: 0 0 10px rgba(255, 0, 136, 0.5); }
    h1 { color: #f08; font-size: 2rem; text-shadow: 0 0 15px rgba(255, 0, 136, 0.4); }
    .score-bar {
      display: flex;
      justify-content: space-between;
      width: 400px;
      margin-bottom: 10px;
      font-size: 1.1rem;
    }
    .score-bar span { color: #f08; }
    canvas {
      border: 2px solid #f08;
      box-shadow: 0 0 20px rgba(255, 0, 136, 0.2);
      display: block;
    }
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f08;
      text-align: center;
      pointer-events: none;
      background: rgba(26, 26, 46, 0.85);
    }
    .overlay h2 { font-size: 1.8rem; margin-bottom: 10px; }
    .overlay p { font-size: 1rem; color: #aaa; }
  </style>
</head>
<body>
  <div class="header">
    <a href="../" class="back">&larr; Back</a>
    <h1>DODGE</h1>
  </div>
  <div class="score-bar">
    <div>Score: <span id="score">0</span></div>
    <div>Best: <span id="best">0</span></div>
  </div>
  <div style="position: relative; display: inline-block;">
    <canvas id="game" width="400" height="500"></canvas>
    <div class="overlay" id="overlay" style="width:400px;height:500px;">
      <h2 id="overlayTitle">DODGE</h2>
      <p id="overlayText">Press LEFT/RIGHT or SPACE to start</p>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayText = document.getElementById('overlayText');

    // Player
    const PLAYER_W = 30, PLAYER_H = 30;
    const PLAYER_SPEED = 5;
    const PLAYER_Y = H - 50;

    // Falling objects
    const OBJ_SIZE = 20;
    const SPAWN_RATE_START = 60;  // frames between spawns (decreases over time)
    const SPAWN_RATE_MIN = 15;
    const FALL_SPEED_START = 2;
    const FALL_SPEED_MAX = 6;

    let playerX, score, best = 0, gameState;
    let objects, spawnTimer, frameCount;
    let keys = {};

    function init() {
      playerX = W / 2 - PLAYER_W / 2;
      score = 0;
      objects = [];
      spawnTimer = 0;
      frameCount = 0;
      scoreEl.textContent = '0';
      gameState = 'waiting';
      overlay.style.display = 'flex';
      overlayTitle.textContent = 'DODGE';
      overlayText.textContent = 'Press LEFT/RIGHT or SPACE to start';
      draw();
    }

    function start() {
      gameState = 'playing';
      overlay.style.display = 'none';
      requestAnimationFrame(loop);
    }

    function loop() {
      if (gameState !== 'playing') return;
      update();
      draw();
      requestAnimationFrame(loop);
    }

    function update() {
      frameCount++;

      // Move player
      if (keys['ArrowLeft']) playerX -= PLAYER_SPEED;
      if (keys['ArrowRight']) playerX += PLAYER_SPEED;
      playerX = Math.max(0, Math.min(W - PLAYER_W, playerX));

      // Difficulty scaling
      const difficulty = Math.min(frameCount / 3600, 1); // ramps over ~60 seconds
      const spawnRate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_START - difficulty * (SPAWN_RATE_START - SPAWN_RATE_MIN));
      const fallSpeed = FALL_SPEED_START + difficulty * (FALL_SPEED_MAX - FALL_SPEED_START);

      // Spawn falling objects
      spawnTimer++;
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        objects.push({
          x: Math.random() * (W - OBJ_SIZE),
          y: -OBJ_SIZE,
          speed: fallSpeed * (0.8 + Math.random() * 0.4)
        });
      }

      // Update falling objects
      for (let i = objects.length - 1; i >= 0; i--) {
        objects[i].y += objects[i].speed;

        // Remove off-screen objects and increment score
        if (objects[i].y > H) {
          objects.splice(i, 1);
          score++;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          continue;
        }

        // Collision detection (AABB)
        const obj = objects[i];
        if (obj.x < playerX + PLAYER_W &&
            obj.x + OBJ_SIZE > playerX &&
            obj.y < PLAYER_Y + PLAYER_H &&
            obj.y + OBJ_SIZE > PLAYER_Y) {
          die();
          return;
        }
      }
    }

    function die() {
      gameState = 'over';
      overlay.style.display = 'flex';
      overlayTitle.textContent = 'GAME OVER';
      overlayText.textContent = `Score: ${score} — Press any key to restart`;
    }

    function draw() {
      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);

      // Player
      ctx.fillStyle = '#f08';
      ctx.shadowColor = '#f08';
      ctx.shadowBlur = 12;
      ctx.fillRect(playerX, PLAYER_Y, PLAYER_W, PLAYER_H);
      ctx.shadowBlur = 0;

      // Falling objects
      objects.forEach(obj => {
        ctx.fillStyle = '#f44';
        ctx.shadowColor = '#f44';
        ctx.shadowBlur = 8;
        ctx.fillRect(obj.x, obj.y, OBJ_SIZE, OBJ_SIZE);
      });
      ctx.shadowBlur = 0;

      // Ground line
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(0, PLAYER_Y + PLAYER_H + 10, W, 2);
    }

    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keys[e.key] = true;

      if (gameState === 'waiting') { start(); return; }
      if (gameState === 'over') { init(); return; }
    });

    document.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    init();
  </script>
  <script src="../recorder.js?v=2"></script>
</body>
</html>
```

This minimal example demonstrates:
- Correct HTML structure with overlay, canvas `id="game"`, score bar
- Global `gameState` and `score` variables at script scope
- State machine: waiting -> playing -> over -> waiting
- Overlay show/hide at each transition
- `requestAnimationFrame` game loop
- Arrow key input with `preventDefault`
- Progressive difficulty (spawn rate and fall speed increase over time)
- Short sessions (typically 30-90 seconds)
- Neon visual style with shadowBlur glow effects
- recorder.js loaded as last script

---

## 11. Keypad.html Variant

The `keypad.html` file is identical to `index.html` with these changes:

1. **Add a `game-row` wrapper** around the canvas container and a new keypad div.
2. **Add keypad CSS** for the arrow key visualizer.
3. **Add keypad HTML** next to the canvas.
4. **Add keypad event listeners** that light up keys on press/release.
5. **Remove the recorder.js script tag** (keypad.html is for local testing/demo, not data collection).

### Keypad CSS (add to the `<style>` block):

```css
.game-row { display: flex; gap: 20px; align-items: flex-start; }
.keypad { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 20px; }
.keypad-row { display: flex; gap: 4px; }
.kp-key {
  width: 44px; height: 44px;
  background: #16213e;
  border: 2px solid #0f3460;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; color: #555;
  transition: background 0.06s, border-color 0.06s, color 0.06s, box-shadow 0.06s;
}
.kp-key.active {
  background: rgba(THEME_RGB, 0.15);
  border-color: THEME_COLOR;
  color: THEME_COLOR;
  box-shadow: 0 0 12px rgba(THEME_RGB, 0.4);
}
.kp-spacer { width: 44px; height: 44px; }
```

### Keypad HTML (wrap canvas container and add keypad):

```html
<div class="game-row">
  <div style="position: relative; display: inline-block;">
    <canvas id="game" width="400" height="500"></canvas>
    <div class="overlay" id="overlay" style="width:400px;height:500px;">
      <h2 id="overlayTitle">GAME_NAME</h2>
      <p id="overlayText">Press SPACE to start</p>
    </div>
  </div>
  <div class="keypad">
    <div class="keypad-row">
      <div class="kp-spacer"></div>
      <div class="kp-key" id="kp-up">&uarr;</div>
      <div class="kp-spacer"></div>
    </div>
    <div class="keypad-row">
      <div class="kp-key" id="kp-left">&larr;</div>
      <div class="kp-key" id="kp-down">&darr;</div>
      <div class="kp-key" id="kp-right">&rarr;</div>
    </div>
  </div>
</div>
```

### Keypad JavaScript (add after the game script):

```javascript
const kpMap = {
  ArrowUp: 'kp-up',
  ArrowDown: 'kp-down',
  ArrowLeft: 'kp-left',
  ArrowRight: 'kp-right'
};
document.addEventListener('keydown', (e) => {
  if (kpMap[e.key]) document.getElementById(kpMap[e.key]).classList.add('active');
});
document.addEventListener('keyup', (e) => {
  if (kpMap[e.key]) document.getElementById(kpMap[e.key]).classList.remove('active');
});
```

---

## 12. Summary of Recorder Contract

This is the complete interface contract between your game and `recorder.js`. If you satisfy these requirements, data collection will work automatically.

| Requirement | How to satisfy |
|---|---|
| Canvas detection | Use `<canvas id="game">` |
| Game name | Folder name in the URL path (auto-detected) |
| State detection (primary) | Global `let gameState` variable with values `'waiting'`, `'playing'`, `'over'` |
| State detection (fallback) | Overlay with class `overlay`, hidden via `display:none` during play, shows "GAME OVER" text on death |
| Score detection (primary) | Global `let score` variable (number) |
| Score detection (fallback) | DOM element `<span id="score">` or element with class `score-bar span` |
| Recording starts | When gameState transitions to `'playing'` |
| Recording stops | When gameState transitions to `'over'` |
| Supported keyboard input | ALL keys (every keydown/keyup is recorded) |
| Supported mouse input | mousemove (30 Hz), mousedown/mouseup/click, wheel -- canvas-relative coordinates |
| Script tag | `<script src="../recorder.js?v=2"></script>` as last script before `</body>` |

---

## 13. Game Ideas

If you need inspiration, here are game concepts that work well for ML training data. All are playable with arrow keys + space and produce good action-reward signal:

- **Frogger** -- navigate across lanes of traffic and a river. Arrow keys to hop.
- **Pac-Man** -- navigate a maze eating dots while avoiding ghosts. Arrow keys to move.
- **Galaga** -- fixed-shooter variant of space invaders with swooping enemies. Left/right + space to fire.
- **Centipede** -- shoot a descending centipede that splits when hit. Arrow keys + space.
- **Missile Command** -- defend cities from incoming missiles. Arrow keys to aim cursor, space to fire.
- **Brick Breaker variants** -- Breakout with power-ups and different brick patterns.
- **Side-scrolling runner** -- auto-scrolling, jump/duck to avoid obstacles. Up to jump, down to duck.
- **Tower defense (simplified)** -- place turrets on a grid, enemies walk a path. Arrow keys to move cursor, space to place.
- **Puzzle Bobble / Bust-a-Move** -- aim and shoot colored bubbles. Left/right to aim, space to fire.
- **Sokoban** -- push boxes onto targets in a grid puzzle. Arrow keys to move.

**Mouse-based games (now fully supported):**

- **Missile Command** -- click to target where your counter-missiles detonate. Mouse aim + click.
- **Minesweeper** -- click to reveal tiles, right-click to flag. Pure mouse.
- **Tower Defense** -- click to place towers on a grid. Mouse placement + keyboard shortcuts.
- **Peggle** -- aim and click to launch a ball at pegs. Mouse aim + click.
- **Fruit Ninja** -- swipe/drag across the canvas to slice fruit. Mouse drag.
- **Duck Hunt** -- click to shoot ducks as they fly across the screen. Mouse aim + click.
- **Angry Birds (simplified)** -- drag to aim slingshot, release to fire. Mouse drag.
- **Plants vs. Zombies (simplified)** -- click to place plant defenders. Mouse click on grid.
- **Lemmings** -- click on lemmings to assign jobs. Mouse click + selection.
- **Sudoku / Nonogram** -- click cells, type numbers. Mouse + keyboard hybrid.

Pick games with clear visual states, short episodes, and a strong relationship between player skill and score.
