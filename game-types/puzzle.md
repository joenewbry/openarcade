# Genre: Puzzle

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: low-medium
**Reference Image**: images/puzzle-reference.png

---

## Identity

Puzzle games center on intellectual challenge. The core player fantasy is the satisfaction of
figuring something out — the "aha" moment when a pattern clicks, the dopamine rush of a chain
reaction, the quiet pride of an optimal solution. Unlike action games where mastery is about
reflexes, puzzle mastery is about understanding systems and recognizing patterns.

### What defines a puzzle game
- A problem with a solution (or a system that generates solvable problems)
- Clearly defined rules that the player must internalize
- Success comes from thinking, not reaction time (though some hybrids exist)
- State is fully or mostly observable — no hidden information (exceptions: minesweeper)
- Minimal randomness in outcome once an action is chosen

### Core player fantasies
- **Intellectual satisfaction**: "I figured it out"
- **Pattern recognition**: "I see the pattern now"
- **Optimization**: "I found a better way"
- **Flow state**: "I lost track of time" (match-3, Tetris)
- **Creative expression**: "I built an elegant solution" (Baba Is You, SpaceChem)

### Sub-genres

| Sub-genre | Mechanic | Timing | Examples |
|-----------|----------|--------|----------|
| Match-3 | Swap adjacent to form groups of 3+ | Real-time or turn-based | Bejeweled, Candy Crush |
| Falling-piece | Arrange descending pieces | Real-time | Tetris, Columns, Puyo Puyo, Dr. Mario |
| Sliding puzzle | Move tiles in constrained space | Turn-based | 15-puzzle, Klotski, 2048 |
| Block-push (Sokoban) | Push objects onto targets | Turn-based | Sokoban, Stephen's Sausage Roll |
| Physics puzzle | Use physics to reach a goal | Varies | Angry Birds, Cut the Rope, Peggle |
| Word puzzle | Form words from letters | Turn-based | Wordle, Scrabble, Boggle |
| Logic puzzle | Deduce from constraints | Turn-based | Sudoku, Nonogram, Minesweeper, Picross |
| Spatial reasoning | Rotate/place shapes | Varies | Tangram, Blokus, Tetromino packing |
| Hidden object | Find items in a scene | Untimed | Hidden object scenes |
| Connection/flow | Draw paths without crossing | Turn-based | Flow Free, Bridges, Pipe Mania |
| Puzzle-platformer | Spatial puzzles + movement | Real-time | Portal, Braid, Baba Is You |
| Color/light | Manipulate color or light | Varies | Lights Out, Hue, Prism |

### Classic examples with analysis

**Tetris** — The gold standard of falling-piece puzzles. Pieces arrive in a random sequence
(using a bag randomizer for fairness). Players must make spatial decisions under increasing
time pressure. Mastery involves: T-spins, back-to-back Tetrises, combo chains, hold mechanics.
Session length 2-5 minutes. Perfect for ML training — clear state, discrete actions, visible
reward signal.

**Bejeweled / Match-3** — Swap two adjacent gems to form a line of 3+ matching. Cascades
create chain reactions that feel effortless but reward board reading. The "luck" of cascades
makes even novices feel smart. Excellent session-based design: rounds last 1-3 minutes.

**Baba Is You** — Rules are physical objects in the level. Push words to change what things
are and what they do. "ROCK IS PUSH" means rocks can be pushed; remove "PUSH" and they
become impassable. Demonstrates that puzzle mechanics can be arbitrarily deep without
complex rendering.

**2048** — Slide all tiles in one direction. Matching numbers merge (2+2=4, 4+4=8, etc.).
Goal: create the 2048 tile. Deceptively simple rules, deep strategy around corner play
and tile management. One-screen, pure-logic, perfect for browser implementation.

**Minesweeper** — Click to reveal cells, deduce mine locations from neighbor counts.
Information is hidden — one of the few puzzle games with imperfect information. Combines
logic with probability assessment. Excellent mouse-based training data.

**The Witness** — Line-drawing puzzles on panels, with rules taught entirely through
environmental context. No text instructions. Demonstrates how to teach puzzle rules
through play, not documentation.

---

## Core Mechanics (deep)

### Grid systems

Most puzzle games operate on a grid. Grid choice affects everything from rendering to
algorithm design.

**Rectangular grid** (most common):
```
Coordinates: (col, row) or (x, y)
Neighbors: 4 (orthogonal) or 8 (including diagonals)
Storage: 2D array — grid[row][col]
Rendering: x = col * cellSize + offsetX, y = row * cellSize + offsetY
```

**Hexagonal grid**:
```
Two common coordinate systems:
  Offset: even/odd rows shift by half a cell width
  Axial (cube): (q, r) where q + r + s = 0
Neighbors: 6 per cell
Rendering (flat-top):
  x = size * (3/2 * q)
  y = size * (sqrt(3)/2 * q + sqrt(3) * r)
```

**Irregular/graph-based grid**:
```
Nodes connected by edges (adjacency list)
Useful for: connection puzzles, network flow, graph coloring
No spatial rendering formula — positions are hand-placed or force-directed
```

**Recommended grid sizes by sub-genre**:

| Sub-genre | Typical grid | Canvas size |
|-----------|-------------|-------------|
| Match-3 | 8x8 | 400x400 |
| Tetris-like | 10x20 | 300x600 |
| Sokoban | 7x7 to 12x12 | 400x400 |
| Sudoku | 9x9 | 450x450 |
| Minesweeper | 9x9 (easy) to 30x16 (expert) | 480x320 |
| 2048 | 4x4 | 400x400 |
| Nonogram | 10x10 to 25x25 | 500x500 |
| Lights Out | 5x5 | 350x350 |
| Word search | 10x10 to 15x15 | 450x450 |

### Match detection algorithms

**Flood fill** (for match-3 with group matching):
```javascript
function floodFill(grid, startRow, startCol, color, visited) {
  const stack = [[startRow, startCol]];
  const group = [];
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (visited[r][c] || grid[r][c] !== color) continue;
    visited[r][c] = true;
    group.push([r, c]);
    stack.push([r-1, c], [r+1, c], [r, c-1], [r, c+1]);
  }
  return group; // match if group.length >= 3
}
```

**Line scan** (for traditional match-3 with line matching):
```javascript
function findLineMatches(grid) {
  const matches = new Set();
  // Horizontal scan
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      if (c < cols && grid[r][c] === grid[r][runStart]) continue;
      if (c - runStart >= 3) {
        for (let k = runStart; k < c; k++) matches.add(`${r},${k}`);
      }
      runStart = c;
    }
  }
  // Vertical scan (same logic, swap r/c)
  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      if (r < rows && grid[r][c] === grid[runStart][c]) continue;
      if (r - runStart >= 3) {
        for (let k = runStart; k < r; k++) matches.add(`${k},${c}`);
      }
      runStart = r;
    }
  }
  return matches;
}
```

**Pattern matching** (for special shapes — L, T, cross):
```javascript
// Define patterns as relative offsets from a center cell
const PATTERNS = {
  T_shape: [[0,0], [0,1], [0,-1], [-1,0]], // and rotations
  L_shape: [[0,0], [0,1], [0,2], [1,0]],   // and rotations
  cross:   [[0,0], [-1,0], [1,0], [0,-1], [0,1]],
};
// Check each pattern at each cell, matching color
```

### Gravity and cascade systems

After matches are removed, pieces above must fall. Cascades happen when falling pieces
create new matches.

```javascript
function applyGravity(grid) {
  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        grid[writeRow][c] = grid[r][c];
        if (writeRow !== r) grid[r][c] = null;
        writeRow--;
      }
    }
    // Fill empty cells at top with new random pieces
    while (writeRow >= 0) {
      grid[writeRow][c] = randomPiece();
      writeRow--;
    }
  }
}

// Cascade loop
async function processMatches() {
  let comboCount = 0;
  while (true) {
    const matches = findMatches(grid);
    if (matches.size === 0) break;
    comboCount++;
    const points = matches.size * 10 * comboCount; // combo multiplier
    score += points;
    removeMatches(grid, matches);
    await animateRemoval(matches);   // 200-300ms
    applyGravity(grid);
    await animateFalling();          // 150-250ms
  }
}
```

**Cascade scoring formula** (Bejeweled-style):
- Base: 10 points per matched piece
- Combo multiplier: cascade depth (1st match = x1, 2nd = x2, 3rd = x3...)
- Special matches: 4-in-a-row = 2x, 5-in-a-row = 5x, L/T shapes = 3x
- Chain bonus: basePoints * comboLevel * matchMultiplier

### Input handling by puzzle type

**Click/tap** (Minesweeper, Nonogram, Lights Out):
```javascript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    handleCellClick(row, col);
  }
});
```

**Drag-and-drop** (Match-3 swap, jigsaw):
```javascript
let dragStart = null;
canvas.addEventListener('mousedown', (e) => {
  dragStart = getCellFromMouse(e);
});
canvas.addEventListener('mouseup', (e) => {
  const dragEnd = getCellFromMouse(e);
  if (dragStart && dragEnd && areAdjacent(dragStart, dragEnd)) {
    trySwap(dragStart, dragEnd);
  }
  dragStart = null;
});
```

**Keyboard selection** (Tetris, Sokoban, 2048):
```javascript
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':  move(-1, 0); break;
    case 'ArrowRight': move(1, 0);  break;
    case 'ArrowDown':  move(0, 1);  break;
    case 'ArrowUp':    rotate();    break; // Tetris
    case ' ':          hardDrop();  break; // Tetris
  }
});
```

### Turn-based vs real-time vs hybrid

| Timing model | Update trigger | Examples | ML training notes |
|-------------|---------------|---------|-------------------|
| Turn-based | Player action | Sokoban, 2048, Minesweeper | Clear cause-effect, easy to label |
| Real-time | Frame tick (rAF) | Tetris, Puyo Puyo | Time pressure adds difficulty signal |
| Hybrid | Player moves + timer | Candy Crush (move limit), timed Sudoku | Mixed signal — time and moves both matter |

For ML training data, **turn-based puzzles produce the cleanest action-outcome mapping**.
Real-time puzzles produce richer continuous data but are harder to segment.

### Undo/redo systems

Essential for Sokoban, sliding puzzles, and logic puzzles. Not needed for match-3 or Tetris.

```javascript
const history = [];
let historyIndex = -1;

function saveState() {
  // Trim any future states if we branched
  history.length = historyIndex + 1;
  history.push(JSON.parse(JSON.stringify(grid)));
  historyIndex++;
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  grid = JSON.parse(JSON.stringify(history[historyIndex]));
  draw();
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  grid = JSON.parse(JSON.stringify(history[historyIndex]));
  draw();
}
```

Memory optimization: for large grids, store diffs instead of full snapshots.

### Hint systems and progressive difficulty

**Hint levels** (least to most helpful):
1. Highlight a region that contains a valid move (subtle glow)
2. Highlight the exact piece or cell involved
3. Show the complete move (animate the swap/placement)
4. Auto-execute after timeout (accessibility feature)

**Hint timing**: Show hint button after 10 seconds of no input. Auto-hint after 30 seconds.
For ML training, disable auto-hints — they corrupt the action data.

**Progressive difficulty levers**:
- Grid size: 6x6 early, 8x8 mid, 10x10 late
- Piece/color count: 4 colors early, 6 colors mid, 8 late
- Time pressure: generous early (120s), tight late (45s)
- Move limits: generous early (30 moves), tight late (15 moves)
- New mechanics: introduce one per 5-10 levels
- Obstacles: blockers, locked cells, ice layers

### Procedural puzzle generation vs hand-crafted

**Hand-crafted advantages**: Guaranteed solvable, tuned difficulty, designed "aha" moments,
better for narrative puzzles. Cost: each puzzle takes human effort.

**Procedural advantages**: Infinite content, consistent difficulty curves, no content
bottleneck. Cost: requires solvability verification, may produce bland puzzles.

**Procedural generation strategies by sub-genre**:

For **Sokoban**: Generate by working backwards from solved state. Place boxes on targets,
then simulate reverse-pushes (pulls) to create the start position. Verify the forward
solution exists and has minimum move count in desired difficulty range.

For **Match-3**: Random fill, then verify at least one valid move exists. If no moves exist,
reshuffle. Check: `for each cell, try swapping with each neighbor, check if match occurs`.

For **Sudoku**: Start with valid completed grid, remove cells symmetrically. After each
removal, verify unique solvability with constraint propagation + backtracking. Difficulty =
number of cells removed + required technique depth.

For **Nonogram**: Start with desired picture, derive row/column clues. Any bitmap works.
Verify unique solvability by running line-solving logic.

For **Minesweeper**: Place mines randomly, ensure first click is safe (no mine, ideally
a zero-cell for opening). Re-roll until first click constraint is met.

### State validation: checking solvability

```javascript
// Example: Check if a Sokoban level is solvable using BFS
function isSolvable(level) {
  const startState = encodeState(level);
  const visited = new Set([startState]);
  const queue = [level];
  while (queue.length > 0) {
    const current = queue.shift();
    if (isSolved(current)) return true;
    for (const move of ['up', 'down', 'left', 'right']) {
      const next = applyMove(current, move);
      const encoded = encodeState(next);
      if (!visited.has(encoded) && !isDeadlock(next)) {
        visited.add(encoded);
        queue.push(next);
      }
    }
  }
  return false;
}

// Deadlock detection: box in corner with no target, box along wall with no target
function isDeadlock(state) {
  for (const box of state.boxes) {
    if (isOnTarget(box)) continue;
    // Corner deadlock
    const blockedH = isWall(box.x-1, box.y) || isWall(box.x+1, box.y);
    const blockedV = isWall(box.x, box.y-1) || isWall(box.x, box.y+1);
    if (blockedH && blockedV) return true;
  }
  return false;
}
```

### Scoring systems

| Sub-genre | Scoring approach | Typical values |
|-----------|-----------------|----------------|
| Match-3 | Per piece + combo multiplier | 10 base, x2/x3/x4 combo |
| Tetris | Per line cleared + level bonus | 100/300/500/800 for 1/2/3/4 lines |
| 2048 | Tile merge value | Score = sum of all merged values |
| Sokoban | Move count (lower is better) | Par: 20-50 moves per level |
| Minesweeper | Time-based (lower is better) | Expert WR: ~30 seconds |
| Sudoku | Time-based + difficulty bonus | Base 1000 - (seconds * 2) |

---

## Design Patterns

### Tutorial integration: teach through play, not text

The best puzzle games never show a text tutorial. They teach by constraining the first few
levels so only the correct action is possible.

**Pattern: Forced first move**
Level 1 has exactly one valid action. The player discovers the mechanic by performing it.
Level 2 has two steps. Level 3 introduces a second mechanic.

**Pattern: Safe experimentation space**
First levels cannot be lost. The player freely explores without penalty, building mental
models of how the system works.

**Pattern: Visual language**
New mechanics are color-coded consistently. Red = danger. Green = goal. Blue = movable.
Never reuse a color for a different meaning.

**Pattern: Escalating combinations**
- Levels 1-5: Mechanic A alone
- Levels 6-10: Mechanic B alone
- Levels 11-15: A and B combined
- Levels 16-20: Mechanic C, then A+C, B+C, then A+B+C

### Difficulty progression

**The golden curve**: difficulty should increase roughly logarithmically. Big jumps early
(player is learning), small jumps later (player is mastering). Every 5-8 levels, a
"breather" level that is easier than the last few, to prevent frustration.

```
Difficulty
    ^
    |             ___------
    |         ___/
    |      __/
    |    _/
    |  _/
    | /
    |/
    +----------------------> Level
```

**Numeric difficulty targets** (for a 50-level game):
- Levels 1-5: Solvable in 1-3 moves. One mechanic. 95% of players complete.
- Levels 6-15: 5-10 moves. Two mechanics. 80% completion rate.
- Levels 16-30: 10-20 moves. All core mechanics. 50% completion rate.
- Levels 31-45: 15-30 moves. Combined mechanics + obstacles. 25% completion.
- Levels 46-50: 25-50+ moves. Everything combined. 10% completion.

### "One more turn" psychology

Puzzle games are uniquely addictive because of:
1. **Near-miss effect**: Almost solving keeps players trying ("I was so close")
2. **Variable ratio reinforcement**: Cascades/chain reactions are unpredictable rewards
3. **Completion drive**: Seeing 47/50 levels done compels finishing
4. **Low cost of retry**: Each attempt is fast (30s-2min), so restarting feels cheap
5. **Mastery gradient**: Each attempt teaches something, so progress feels inevitable

**Implementation tips**:
- Show the solution percentage or distance to goal
- After game over, show "best attempt" alongside current score
- Make restart instant (no menus, no loading, no confirmation dialog)
- Show a preview of the next level to create anticipation

### Accessibility considerations

**Color-blind modes** (critical for match-3 and color-based puzzles):
```javascript
// Add distinct shapes/symbols to each color
const PIECE_STYLES = {
  red:    { color: '#ff4444', shape: 'circle',   symbol: '\u25CF' },
  blue:   { color: '#4444ff', shape: 'diamond',  symbol: '\u25C6' },
  green:  { color: '#44ff44', shape: 'triangle', symbol: '\u25B2' },
  yellow: { color: '#ffff44', shape: 'square',   symbol: '\u25A0' },
  purple: { color: '#ff44ff', shape: 'star',     symbol: '\u2605' },
};
// In color-blind mode, render the symbol on top of each piece
```

- Use both color AND shape to distinguish pieces (never color alone)
- Minimum 4.5:1 contrast ratio against background
- Support keyboard navigation for mouse-based puzzles
- Allow font size scaling for number-based puzzles
- Provide move count / time display in accessible format

### Anti-patterns to avoid

- **Unsolvable random states**: Always verify solvability before presenting a puzzle
- **Pixel-perfect clicking**: Cells should be at least 30x30px. Tap targets 44x44px minimum
- **Hidden information without deduction**: If the player cannot logically determine something, do not punish guessing wrong
- **Punishing experimentation**: Never penalize trying moves in a learning context
- **Timer pressure on logic puzzles**: Time limits on Sudoku or Nonogram feel adversarial
- **Mandatory grinding**: Do not gate progress behind replaying solved puzzles
- **Invisible state**: Every game-relevant variable should be visible on screen
- **Cascade-only scoring**: If score comes only from lucky cascades, the game feels random

---

## Tech Stack

<!-- TECH: {"id": "canvas-2d", "role": "rendering", "optional": false} -->
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->
<!-- TECH: {"id": "web-audio", "role": "audio", "optional": false} -->

**Rendering**: Canvas 2D for most puzzle games. DOM-based rendering is viable for grid
puzzles (Sudoku, Minesweeper) where cells map naturally to HTML elements. Canvas is
preferred for animation-heavy puzzles (match-3, Tetris) where smooth tweening matters.

**Physics engine**: Not needed for 95% of puzzle games. Exception: physics puzzles
(Angry Birds, Cut the Rope) which benefit from Matter.js or Planck.js.

**Audio**: Web Audio API for procedural SFX (sufficient for most puzzles). Howler.js
only if using pre-recorded audio assets.

**Animation**: Manual tweening via requestAnimationFrame. No animation library needed.
Common tween functions:

```javascript
// Ease out cubic — good for piece movement
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Ease in out quad — good for swaps
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Bounce — good for pieces landing
function bounce(t) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1/d1) return n1*t*t;
  if (t < 2/d1) return n1*(t -= 1.5/d1)*t + 0.75;
  if (t < 2.5/d1) return n1*(t -= 2.25/d1)*t + 0.9375;
  return n1*(t -= 2.625/d1)*t + 0.984375;
}
```

**Data structures**:
- Grid state: `Int8Array` or `Uint8Array` for flat grid (faster than 2D array for large grids)
- Piece types: integer enum (0=empty, 1=red, 2=blue, etc.)
- Animation queue: array of `{type, row, col, startTime, duration, fromX, fromY, toX, toY}`
- Undo history: array of grid snapshots or delta objects

---

## Level Design Templates

### Puzzle difficulty metrics

A well-defined difficulty metric lets you sort and balance levels algorithmically.

**Move complexity**: minimum number of moves to solve (BFS shortest path)
- Easy: 1-5 moves
- Medium: 6-15 moves
- Hard: 16-30 moves
- Expert: 31+ moves

**Branching factor**: average number of valid moves per state
- Low (2-3): feels guided, less frustrating
- Medium (4-8): requires planning
- High (9+): overwhelming unless other constraints reduce effective choices

**Technique depth**: what solving techniques are required
- Level 0: Single candidate / obvious move
- Level 1: Elimination / process of deduction
- Level 2: Multi-step lookahead (if I do A, then B becomes possible)
- Level 3: Constraint chains (Sudoku: naked pairs, X-wing)
- Level 4: Backtracking / trial-and-error required

### Grid size progression

| Game phase | Grid size | Piece types | New mechanics |
|-----------|-----------|-------------|---------------|
| Tutorial (1-5) | Small (5x5 or 6x6) | 3-4 | None — core only |
| Early (6-15) | Medium (7x7) | 4-5 | 1 new per 3 levels |
| Mid (16-30) | Standard (8x8) | 5-6 | Combine existing |
| Late (31-45) | Standard or large (8x8 to 10x10) | 6-7 | Obstacles, specials |
| Expert (46+) | Large (10x10+) | 7-8 | Everything at once |

### Element introduction curves

Introduce one new element at a time. Give the player 2-3 levels to internalize it before
combining with previous elements.

**Example for a match-3 game**:
1. Basic matching (3 colors)
2. Basic matching (4 colors)
3. Introduce 4-in-a-row bonus (line clear)
4. Introduce L-shape bonus (area clear)
5. Practice both bonuses
6. Introduce obstacle: frozen cells (require adjacent match to thaw)
7. Frozen cells + bonuses
8. Introduce obstacle: stone blocks (immovable, must match around)
9. Stone blocks + frozen cells
10. New bonus: 5-in-a-row creates color bomb

### Hand-crafted vs procedural tradeoffs

| Factor | Hand-crafted | Procedural | Hybrid |
|--------|-------------|-----------|--------|
| Content volume | Low (10-100 levels) | Infinite | Medium (templates + variation) |
| Quality floor | High | Variable | Medium-high |
| Difficulty tuning | Precise | Statistical | Good |
| "Aha" moments | Designed intentionally | Rare/accidental | Template-driven |
| Dev time per level | 15-60 min | 0 (after algorithm) | 5-10 min per template |
| Replayability | Low (memorize solutions) | High | High |
| Best for | Narrative puzzles, Sokoban | Match-3, Minesweeper | Most puzzle games |

**Hybrid approach** (recommended for OpenArcade):
1. Hand-craft 5 tutorial levels and 5-10 "milestone" levels
2. Define difficulty parameters (grid size, piece count, obstacle density)
3. Generate levels procedurally within parameter ranges
4. Verify solvability automatically
5. Filter by difficulty metric to fill difficulty curve gaps

---

## Visual Reference

### Art styles for puzzle games

**Geometric/clean** (recommended for OpenArcade):
- Flat shapes with clear boundaries
- High contrast between piece types
- Grid lines subtle but visible (#16213e on #1a1a2e)
- Pieces are solid fills with slight border radius

**Neon/glow** (matches OpenArcade visual system):
- Pieces glow with their color (shadowBlur: 8-12)
- Background is dark (#1a1a2e)
- Grid lines are dim accent color
- Matches and cascades produce bright particle bursts

**Pixel art**:
- 8x8 or 16x16 pixel sprites per piece
- Crisp nearest-neighbor scaling
- 4-8 color palette per piece type
- Works well at small canvas sizes

### Color palettes

**Standard 6-color match-3 palette** (against #1a1a2e):
```javascript
const COLORS = [
  '#ff4444', // red — circle
  '#44aaff', // blue — diamond
  '#44ff44', // green — triangle
  '#ffcc00', // yellow — square
  '#ff44ff', // magenta — star
  '#ff8800', // orange — hexagon
];
```

**Colorblind-safe palette** (distinguishable in all forms of CVD):
```javascript
const CB_SAFE = [
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#F0E442', // yellow
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
];
```

### Grid rendering approach

```javascript
function drawGrid(ctx, grid, cellSize, offsetX, offsetY) {
  // Draw grid background
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(offsetX, offsetY, cols * cellSize, rows * cellSize);

  // Draw grid lines
  ctx.strokeStyle = '#16213e';
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + r * cellSize);
    ctx.lineTo(offsetX + cols * cellSize, offsetY + r * cellSize);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + c * cellSize, offsetY);
    ctx.lineTo(offsetX + c * cellSize, offsetY + rows * cellSize);
    ctx.stroke();
  }

  // Draw pieces
  const padding = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const piece = grid[r][c];
      if (piece === 0) continue;
      const x = offsetX + c * cellSize + padding;
      const y = offsetY + r * cellSize + padding;
      const size = cellSize - padding * 2;

      ctx.fillStyle = COLORS[piece - 1];
      ctx.shadowColor = COLORS[piece - 1];
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
```

### Animation: piece movement, match effects, cascades

**Piece swap animation** (match-3):
```javascript
function animateSwap(cellA, cellB, duration = 200) {
  return new Promise(resolve => {
    const startTime = performance.now();
    const ax = cellA.col * cellSize, ay = cellA.row * cellSize;
    const bx = cellB.col * cellSize, by = cellB.row * cellSize;

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = easeInOutQuad(t);
      cellA.renderX = ax + (bx - ax) * ease;
      cellA.renderY = ay + (by - ay) * ease;
      cellB.renderX = bx + (ax - bx) * ease;
      cellB.renderY = by + (ay - by) * ease;
      draw();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
```

**Match removal particles**:
```javascript
function spawnMatchParticles(row, col, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    particles.push({
      x: col * cellSize + cellSize / 2,
      y: row * cellSize + cellSize / 2,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      life: 1.0,
      decay: 0.03 + Math.random() * 0.02,
      color: color,
      size: 3 + Math.random() * 4,
    });
  }
}
```

### Juice: screen shake, particles, flash

**Screen shake** (on big combos or game over):
```javascript
let shakeAmount = 0;
function triggerShake(intensity = 5) { shakeAmount = intensity; }
function getShakeOffset() {
  if (shakeAmount <= 0) return { x: 0, y: 0 };
  shakeAmount *= 0.85; // decay
  if (shakeAmount < 0.5) shakeAmount = 0;
  return {
    x: (Math.random() - 0.5) * shakeAmount * 2,
    y: (Math.random() - 0.5) * shakeAmount * 2,
  };
}
// In draw(): ctx.translate(shake.x, shake.y);
```

**Flash effect** (on match):
```javascript
// Draw a white overlay that fades out
function flashCell(row, col, duration = 150) {
  const startTime = performance.now();
  function drawFlash(now) {
    const t = (now - startTime) / duration;
    if (t >= 1) return;
    const alpha = 1 - t;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    requestAnimationFrame(drawFlash);
  }
  requestAnimationFrame(drawFlash);
}
```

![Reference](images/puzzle-reference.png)

---

## Audio Design

### Essential SFX

All SFX should be generated procedurally with the Web Audio API. No external audio files.

| Sound | Technique | Parameters |
|-------|-----------|------------|
| **Piece select** | Short sine blip | 440Hz, 50ms, vol 0.3 |
| **Piece place/swap** | Soft thud | 220Hz sine + noise, 80ms, vol 0.2 |
| **Match (3)** | Rising arpeggio | C5-E5-G5 triangle, 60ms each, vol 0.3 |
| **Match (4)** | Higher arpeggio | C5-E5-G5-C6, 50ms each, vol 0.4 |
| **Match (5+)** | Bright chord | C5+E5+G5 simultaneous, 200ms, vol 0.5 |
| **Cascade/combo** | Ascending pitch | Start at 440Hz, +50Hz per combo level, 100ms, vol 0.4 |
| **Piece fall/land** | Low thump | 100Hz sine, 60ms, vol 0.2 |
| **Invalid move** | Buzz/error | 150Hz square wave, 100ms, vol 0.2 |
| **Level complete** | Victory fanfare | C-E-G-C arpeggiated, 150ms each, vol 0.5 |
| **Game over** | Descending tones | G4-E4-C4-G3, 200ms each, vol 0.4 |
| **Timer warning** | Tick-tock | 800Hz square, 30ms, every 1s when < 10s remain |

### Combo escalation sound design

Each combo level should sound increasingly satisfying. Use ascending pitch:

```javascript
function playComboSound(comboLevel, audioCtx) {
  const baseFreq = 440 + comboLevel * 80; // rises with combo
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = baseFreq;
  gain.gain.setValueAtTime(0.3 + comboLevel * 0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}
```

### Music

Puzzle games benefit from ambient, non-distracting background music. Good approaches:
- Generative ambient pads (low sine/triangle chords, slow modulation)
- No strong beat (competes with game rhythm)
- Tempo increase when timer is low or difficulty spikes
- Volume lower than SFX (0.15-0.25 vs 0.3-0.5)

For OpenArcade browser puzzles, music is optional. SFX are more important for feedback.

---

## Multiplayer Considerations

### Competitive puzzle modes

**Separate boards with garbage** (Tetris vs, Puyo Puyo):
- Each player has their own board
- Completing combos/chains sends "garbage" to opponent
- Garbage appears as uncolored rows from the bottom
- First player to top out loses

**Shared board** (co-op or competitive):
- Both players act on the same grid
- Turn-based: alternate turns (competitive)
- Real-time: simultaneous actions with collision resolution
- Implementation: lock cells being acted on to prevent conflicts

**Race mode**:
- Both players get identical puzzle (same seed)
- First to solve wins
- Good for: Sudoku, Nonogram, Minesweeper

### Co-op puzzle solving

- Divide the board into regions, each player controls their region
- Or: one player selects pieces, the other places them
- Communication required — creates social engagement

### Asynchronous challenge sharing

- Player solves puzzle, system records move count and time
- Share puzzle via seed/URL: `?seed=12345&size=8x8`
- Friend solves same puzzle, scores are compared
- Implementation: seeded PRNG ensures identical puzzle generation

```javascript
// Seeded random for reproducible puzzles
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}
```

---

## Generation Checklist

### Blocking (must be decided before code generation)

| Parameter | Options | Notes |
|-----------|---------|-------|
| Puzzle type | match-3, Sokoban, Tetris-like, sliding, logic, word | Determines entire architecture |
| Grid type | rectangular, hexagonal, irregular | Affects coordinate system, rendering |
| Grid size | e.g., 8x8, 10x20, 4x4 | Determines canvas size |
| Turn-based or real-time | turn / real-time / hybrid | Affects game loop structure |
| Win condition | clear board, reach score, solve puzzle, survive | Determines end-state check |
| Input method | keyboard, mouse click, mouse drag, hybrid | Determines event handlers |

### Defaultable (sensible defaults applied if not specified)

| Parameter | Default | Range |
|-----------|---------|-------|
| Grid dimensions | 8x8 (match-3), 10x20 (Tetris), 4x4 (2048) | Sub-genre dependent |
| Piece types/colors | 5 | 3-8 |
| Time limit | None (turn-based) or 120s (real-time) | 30s-300s |
| Move limit | None | 10-100 |
| Scoring formula | 10 pts per action * combo multiplier | Varies |
| Difficulty curve | Linear ramp over 50 levels | Logarithmic preferred |
| Undo support | Yes for turn-based, No for real-time | — |
| Hint system | No | Add if > 15 levels |
| Color-blind mode | Shapes always included | — |
| Canvas size | 400x400 (square grid), 300x600 (tall) | Sub-genre dependent |
| Theme color | Unique neon, not reused from existing games | Check style guide |
| Background music | None | Optional ambient |
| Particle effects | Minimal (match glow, remove flash) | Scale with complexity |

---

## From Design to Code

The 9-step generation pipeline mapped to puzzle game specifics.

### Step 1: HTML Structure

Standard OpenArcade template. Puzzle-specific considerations:
- Canvas size determined by grid dimensions and cell size
- Score bar may show additional info: moves remaining, time, level number
- For mouse-based puzzles, cursor should change on hover over valid cells

```html
<!-- Additional score bar items for puzzle games -->
<div class="score-bar">
  <div>Score: <span id="score">0</span></div>
  <div>Level: <span id="level">1</span></div>
  <div>Moves: <span id="moves">0</span></div>
  <div>Best: <span id="best">0</span></div>
</div>
```

### Step 2: Game State and Constants

Define the grid, piece types, and all game parameters as constants at the top.

```javascript
// Grid
const COLS = 8, ROWS = 8;
const CELL_SIZE = 48;

// Piece types (0 = empty)
const PIECE_COUNT = 5;
const COLORS = ['#ff4444', '#44aaff', '#44ff44', '#ffcc00', '#ff44ff'];

// Timing
const FALL_SPEED = 300;       // ms per cell of gravity
const SWAP_DURATION = 200;    // ms for swap animation
const MATCH_DELAY = 150;      // ms flash before removal
const CASCADE_DELAY = 100;    // ms between cascade steps

// Scoring
const BASE_SCORE = 10;
const COMBO_MULTIPLIER = 1.5; // score *= COMBO_MULTIPLIER per cascade

// Difficulty (changes per level)
let level = 1;
let moveLimit = 30;
let targetScore = 500;

// State
let grid = [];
let selected = null;
let animating = false;
let comboCount = 0;
```

### Step 3: Entity Definitions

Puzzle games have few "entities" compared to action games. The grid IS the game.

- **Grid cells**: position, piece type, state (normal, selected, matched, falling, locked)
- **Pieces**: type (color/number), position, render offset (for animation)
- **Particles**: position, velocity, color, life (for match effects)
- **UI elements**: selected cell highlight, hint highlight, valid move indicators

### Step 4: Game Loop and Core Logic

For turn-based puzzles, the "loop" is event-driven, not frame-driven:
```javascript
// Turn-based: respond to input, process result, wait for next input
async function handleMove(fromRow, fromCol, toRow, toCol) {
  if (animating) return;
  animating = true;

  await animateSwap(from, to);
  swap(grid, from, to);

  const matches = findMatches(grid);
  if (matches.size === 0) {
    // Invalid move — swap back
    await animateSwap(to, from);
    swap(grid, to, from);
    playSound('invalid');
  } else {
    moves++;
    await processMatches();
    checkWinCondition();
    checkLoseCondition();
  }

  animating = false;
}
```

For real-time puzzles (Tetris-like), use standard rAF loop with gravity tick:
```javascript
let lastDrop = 0;
const dropInterval = 1000; // ms, decreases with level

function loop(timestamp) {
  if (gameState !== 'playing') return;

  if (timestamp - lastDrop > dropInterval) {
    if (!moveDown()) {
      lockPiece();
      clearLines();
      spawnPiece();
      if (checkCollision(currentPiece)) {
        gameOver();
        return;
      }
    }
    lastDrop = timestamp;
  }

  draw();
  requestAnimationFrame(loop);
}
```

### Step 5: Rendering System

Puzzle rendering order (back to front):
1. Canvas background (#1a1a2e)
2. Grid background (slightly lighter)
3. Grid lines
4. Locked/obstacle cells
5. Normal pieces
6. Selected piece highlight (pulsing border or glow)
7. Animating pieces (swapping, falling)
8. Match flash effects
9. Particles
10. UI overlays (hint arrows, valid move indicators)

### Step 6: Input Handling

Puzzle input is typically simpler than action games but needs careful state management.

```javascript
// Prevent input during animations
canvas.addEventListener('click', (e) => {
  if (animating || gameState !== 'playing') return;
  const { row, col } = getCellFromEvent(e);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

  if (selected === null) {
    // First click — select
    selected = { row, col };
    playSound('select');
  } else if (selected.row === row && selected.col === col) {
    // Same cell — deselect
    selected = null;
  } else if (areAdjacent(selected, { row, col })) {
    // Adjacent cell — attempt swap
    handleMove(selected.row, selected.col, row, col);
    selected = null;
  } else {
    // Non-adjacent — reselect
    selected = { row, col };
    playSound('select');
  }
  draw();
});
```

For keyboard-controlled puzzles (2048, Sokoban):
```javascript
document.addEventListener('keydown', (e) => {
  if (animating || gameState !== 'playing') return;
  const dirs = {
    'ArrowUp':    [0, -1],
    'ArrowDown':  [0, 1],
    'ArrowLeft':  [-1, 0],
    'ArrowRight': [1, 0],
  };
  if (dirs[e.key]) {
    e.preventDefault();
    const [dx, dy] = dirs[e.key];
    handleMove(dx, dy);
  }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    undo();
  }
});
```

### Step 7: UI Overlays and HUD

Standard overlay states:
- **Waiting**: game title + "Press SPACE to start" (or "Click to start" for mouse puzzles)
- **Playing**: overlay hidden, HUD visible (score, level, moves)
- **Level complete**: "LEVEL COMPLETE" + score summary + "Press SPACE for next level"
- **Game over**: "GAME OVER" + final score + "Press any key to restart"

Level-based puzzles add a transition state between levels:
```javascript
function levelComplete() {
  gameState = 'levelTransition';
  overlay.style.display = 'flex';
  overlayTitle.textContent = `LEVEL ${level} COMPLETE`;
  overlayText.textContent = `Score: ${score} — Press SPACE for next level`;
  playSound('levelComplete');
}
```

### Step 8: Audio System

Initialize Web Audio API and create procedural SFX functions:

```javascript
let audioCtx = null;
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration, type = 'sine', vol = 0.3) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const SOUNDS = {
  select:   () => playTone(440, 0.05, 'sine', 0.3),
  match:    () => {
    playTone(523, 0.06, 'triangle', 0.3);
    setTimeout(() => playTone(659, 0.06, 'triangle', 0.3), 60);
    setTimeout(() => playTone(784, 0.06, 'triangle', 0.3), 120);
  },
  combo:    (n) => playTone(440 + n * 80, 0.15, 'triangle', 0.3 + n * 0.05),
  invalid:  () => playTone(150, 0.1, 'square', 0.2),
  win:      () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', 0.5), i * 150);
    });
  },
  lose:     () => {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.4), i * 200);
    });
  },
};

function playSound(name, ...args) { SOUNDS[name]?.(...args); }
```

### Step 9: Recorder Integration and Finalization

Standard OpenArcade integration:
- Ensure `gameState` and `score` are global `let` declarations
- Add `<script src="../recorder.js?v=2"></script>` as last script
- Verify `canvas` has `id="game"`
- Overlay uses `display: none` when hidden (not `visibility: hidden`)

Puzzle-specific considerations for ML training data quality:
- Grid state is fully visible at 2 FPS capture rate (no hidden animations between frames)
- Selected cell highlight is clearly visible in JPEG captures
- Score increments are visible on screen (not just in variable)
- For turn-based puzzles, state changes only on player action — every frame pair shows cause (before) and effect (after)

**Optional** rich state export for future training pipelines:
```javascript
// Update every frame for richer training data extraction
window.gameData = {
  grid: grid.map(row => [...row]),
  selected: selected,
  score: score,
  level: level,
  movesRemaining: moveLimit - moves,
  comboCount: comboCount,
  gameState: gameState,
};
```

---

## Quick-Start Templates

### Minimal Match-3 Architecture

```
init() → fillGrid() → draw()
  ↓ (click)
selectCell(r,c) → if pair selected → trySwap()
  ↓
animateSwap() → findMatches()
  ↓ (no match)        ↓ (match found)
animateSwapBack()    removeMatches() → applyGravity() → findMatches() [cascade loop]
                       ↓ (no more matches)
                     checkWin() / checkLose()
```

### Minimal Sokoban Architecture

```
init() → loadLevel(n) → draw()
  ↓ (arrow key)
tryMove(dx,dy) → check wall → check box push → check box destination
  ↓ (valid)            ↓ (invalid)
saveUndo()           playSound('invalid')
movePlayer()
moveBox() (if push)
draw()
checkWin() → all boxes on targets? → nextLevel()
```

### Minimal 2048 Architecture

```
init() → spawnTile() → spawnTile() → draw()
  ↓ (arrow key)
slide(direction) → merge matching → slide again → spawnTile()
  ↓ (nothing moved)    ↓ (moved)
ignore               animateSlide() → draw() → checkGameOver()
```

### Minimal Tetris Architecture

```
init() → spawnPiece() → loop()
  ↓ (rAF tick)
gravityTick? → moveDown()
  ↓ (blocked)           ↓ (moved)
lockPiece()           draw()
clearLines()
addScore()
spawnPiece()
checkTopOut() → gameOver()
```

---

## Common Pitfalls and Solutions

| Pitfall | Solution |
|---------|----------|
| Match-3 board has no valid moves after cascade | After every cascade, check for valid moves. If none, reshuffle the board |
| Tetris piece overlaps after rotation near wall | Implement wall kicks: try offset positions when rotation collides |
| Sokoban level unsolvable | Always validate with BFS solver before presenting to player |
| 2048 spawns tile on occupied cell | Filter to empty cells first, then pick random from that list |
| Animation stacking causes visual glitches | Use an animation queue, process one at a time, lock input during animation |
| Score not updating in DOM | Always update both the variable AND `scoreEl.textContent` |
| Large grid causes rendering lag | Use dirty-rectangle rendering: only redraw cells that changed |
| Undo corrupts state | Deep-clone state on save: `JSON.parse(JSON.stringify(state))` |
| Touch targets too small on mobile | Minimum cell size 44x44px for touch, 30x30px for mouse |
| Color-only differentiation | Always add shapes or symbols alongside color differences |

---

## ML Training Data Considerations

Puzzle games produce excellent ML training data because:
1. **Clear state representation**: grid is fully visible, no hidden state
2. **Discrete actions**: each click/keypress maps to one game action
3. **Immediate feedback**: action result is visible in the next frame
4. **Measurable optimality**: solutions can be compared to known-optimal

**Best puzzle types for training data** (ranked):
1. **2048** — pure keyboard, 4 actions, clear reward signal
2. **Minesweeper** — mouse-based, rich spatial reasoning, clear risk/reward
3. **Match-3** — mouse-based, moderate action space, visible cascades
4. **Tetris** — keyboard, well-studied, competitive benchmarks exist
5. **Sokoban** — keyboard, planning-heavy, known-optimal solutions for comparison

**Data quality tips**:
- Ensure game state is fully determined by the canvas image
- Avoid animations that span multiple capture frames without stable intermediate states
- Keep score visible at all times (not hidden during transitions)
- For turn-based games, capture frames only when state changes (reduces redundant data)
