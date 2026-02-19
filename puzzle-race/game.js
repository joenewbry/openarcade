// puzzle-race/game.js — Puzzle Race (Sudoku vs AI) as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Layout constants — match index.html
const GRID_SIZE = 9;
const TOP_BAR = 30;
const GAP = 40;
const CELL = 30;
const GRID_PX = CELL * 9;      // 270
const LEFT_X = (W - GRID_PX * 2 - GAP) / 2;  // 10
const RIGHT_X = LEFT_X + GRID_PX + GAP;       // 320
const GRID_Y = 62;

// Theme color
const THEME = '#a4f';

// DOM elements
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Sudoku helpers ──

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false;
  return true;
}

function generateSolution() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  function solve(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const n of nums) {
            if (isValidPlacement(grid, r, c, n)) {
              grid[r][c] = n;
              if (solve(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve(grid);
  return grid;
}

function countSolutions(grid, limit) {
  let count = 0;

  function solve(grid) {
    if (count >= limit) return;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValidPlacement(grid, r, c, n)) {
              grid[r][c] = n;
              solve(grid);
              if (count >= limit) return;
              grid[r][c] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }

  solve(grid);
  return count;
}

function createPuzzle(solution) {
  const puzzle = solution.map(r => r.slice());
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]));
  let removed = 0;
  const targetRemoved = 49;

  for (const [r, c] of positions) {
    if (removed >= targetRemoved) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle.map(row => row.slice()), 2) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return puzzle;
}

function buildAISolveOrder(puzzle, solution) {
  const order = [];
  const tempGrid = puzzle.map(r => r.slice());
  const candidates = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      if (tempGrid[r][c] !== 0) return new Set();
      const s = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let i = 0; i < 9; i++) { s.delete(tempGrid[r][i]); s.delete(tempGrid[i][c]); }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++)
        for (let cc = bc; cc < bc + 3; cc++)
          s.delete(tempGrid[rr][cc]);
      return s;
    })
  );

  let changed = true;
  while (changed) {
    changed = false;

    // Naked singles
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (tempGrid[r][c] === 0 && candidates[r][c].size === 1) {
          const val = [...candidates[r][c]][0];
          tempGrid[r][c] = val;
          order.push({ row: r, col: c, val });
          candidates[r][c].clear();
          for (let i = 0; i < 9; i++) { candidates[r][i].delete(val); candidates[i][c].delete(val); }
          const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
          for (let rr = br; rr < br + 3; rr++)
            for (let cc = bc; cc < bc + 3; cc++)
              candidates[rr][cc].delete(val);
          changed = true;
        }
      }
    }

    // Hidden singles
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (tempGrid[r][c] !== 0) continue;
        for (const val of candidates[r][c]) {
          let unique = true;
          for (let i = 0; i < 9; i++) if (i !== c && candidates[r][i].has(val)) { unique = false; break; }
          if (!unique) {
            unique = true;
            for (let i = 0; i < 9; i++) if (i !== r && candidates[i][c].has(val)) { unique = false; break; }
          }
          if (!unique) {
            unique = true;
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            for (let rr = br; rr < br + 3; rr++)
              for (let cc = bc; cc < bc + 3; cc++)
                if (!(rr === r && cc === c) && candidates[rr][cc].has(val)) unique = false;
          }
          if (unique) {
            tempGrid[r][c] = val;
            order.push({ row: r, col: c, val });
            candidates[r][c].clear();
            for (let i = 0; i < 9; i++) { candidates[r][i].delete(val); candidates[i][c].delete(val); }
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            for (let rr = br; rr < br + 3; rr++)
              for (let cc = bc; cc < bc + 3; cc++)
                candidates[rr][cc].delete(val);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Remaining cells (rare for medium puzzles)
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (tempGrid[r][c] === 0)
        order.push({ row: r, col: c, val: solution[r][c] });

  return order;
}

function countEmpty(grid) {
  let c = 0;
  for (let r = 0; r < 9; r++)
    for (let cc = 0; cc < 9; cc++)
      if (grid[r][cc] === 0) c++;
  return c;
}

function countGiven(puzzle) {
  let c = 0;
  for (let r = 0; r < 9; r++)
    for (let cc = 0; cc < 9; cc++)
      if (puzzle[r][cc] !== 0) c++;
  return c;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ── Game state ──

let solution, puzzle, playerGrid, aiGrid, playerPencil;
let selectedRow, selectedCol;
let timerStart, elapsed;
let playerRemaining, aiRemaining;
let aiSolveQueue, aiQueueIndex, aiNextTime;
let winner;
let playerErrors; // [{row, col, time}]
let score = 0;
let bestScore = 0;

function initState() {
  solution = generateSolution();
  puzzle = createPuzzle(solution);
  playerGrid = puzzle.map(r => r.slice());
  aiGrid = puzzle.map(r => r.slice());
  playerPencil = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  selectedRow = -1;
  selectedCol = -1;
  timerStart = 0;
  elapsed = 0;
  winner = '';
  playerErrors = [];
  playerRemaining = countEmpty(playerGrid);
  aiRemaining = countEmpty(aiGrid);
  aiSolveQueue = buildAISolveOrder(puzzle, solution);
  aiQueueIndex = 0;
  aiNextTime = 0;
  score = 0;
  scoreEl.textContent = '0';
}

function startGame(game) {
  timerStart = performance.now();
  aiNextTime = timerStart + 2500 + Math.random() * 1000;
  game.setState('playing');
}

function endGame(game, who) {
  winner = who;
  const cellsToSolve = 81 - countGiven(puzzle);
  const timeBonus = Math.max(0, 600 - Math.floor(elapsed));
  if (who === 'player') {
    score = cellsToSolve * 10 + timeBonus;
  } else {
    let correctCells = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] === 0 && playerGrid[r][c] === solution[r][c]) correctCells++;
    score = correctCells * 5;
  }
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
  }
  const t = formatTime(elapsed);
  const title = who === 'player' ? 'YOU WIN!' : 'AI WINS!';
  const text = who === 'player'
    ? `Completed in ${t} — Score: ${score} — Click to play again`
    : `AI finished in ${t} — Score: ${score} — Click to play again`;
  game.showOverlay(title, text);
  game.setState('over');
}

function updateAI(game, now) {
  if (game.state !== 'playing') return;
  if (aiQueueIndex >= aiSolveQueue.length) return;
  if (now < aiNextTime) return;

  const step = aiSolveQueue[aiQueueIndex];
  aiGrid[step.row][step.col] = step.val;
  aiQueueIndex++;
  aiRemaining = countEmpty(aiGrid);
  aiNextTime = now + 2000 + Math.random() * 2000;

  if (aiRemaining === 0) {
    endGame(game, 'ai');
  }
}

// ── Drawing helpers ──

function drawGrid(renderer, text, grid, pencilMarks, x0, y0, label, isPlayer, now) {
  // Grid background
  renderer.fillRect(x0, y0, GRID_PX, GRID_PX, '#0d0d1a');

  // Highlight for player's selected cell
  if (isPlayer && selectedRow >= 0 && selectedCol >= 0) {
    // Row highlight
    renderer.fillRect(x0, y0 + selectedRow * CELL, GRID_PX, CELL, '#a44fff14');
    // Col highlight
    renderer.fillRect(x0 + selectedCol * CELL, y0, CELL, GRID_PX, '#a44fff14');
    // Box highlight
    const br = Math.floor(selectedRow / 3) * 3;
    const bc = Math.floor(selectedCol / 3) * 3;
    renderer.fillRect(x0 + bc * CELL, y0 + br * CELL, CELL * 3, CELL * 3, '#a44fff0f');
    // Selected cell
    renderer.fillRect(x0 + selectedCol * CELL, y0 + selectedRow * CELL, CELL, CELL, '#a44fff40');
  }

  // Thin cell lines
  for (let i = 0; i <= 9; i++) {
    renderer.fillRect(x0, y0 + i * CELL - 0.25, GRID_PX, 0.5, '#333333');
    renderer.fillRect(x0 + i * CELL - 0.25, y0, 0.5, GRID_PX, '#333333');
  }

  // Thick 3x3 box lines
  for (let i = 0; i <= 3; i++) {
    renderer.fillRect(x0, y0 + i * CELL * 3 - 1, GRID_PX, 2, '#888888');
    renderer.fillRect(x0 + i * CELL * 3 - 1, y0, 2, GRID_PX, '#888888');
  }

  // Numbers
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = x0 + c * CELL + CELL / 2;
      const cy = y0 + r * CELL + CELL / 2 - 8; // -8 to vertically center ~16px text
      const val = grid[r][c];

      if (val !== 0) {
        if (puzzle[r][c] !== 0) {
          // Given cell — white, no glow
          renderer.setGlow(null);
          text.drawText(val.toString(), cx, cy, 16, '#e0e0e0', 'center');
        } else if (val !== solution[r][c]) {
          // Error — red with glow
          renderer.setGlow('#ff4444', 0.7);
          text.drawText(val.toString(), cx, cy, 16, '#ff4444', 'center');
          renderer.setGlow(null);
        } else {
          // Correct entry — theme purple with glow
          renderer.setGlow(THEME, 0.5);
          text.drawText(val.toString(), cx, cy, 16, THEME, 'center');
          renderer.setGlow(null);
        }
      } else if (isPlayer && pencilMarks[r][c].size > 0) {
        // Pencil marks — tiny numbers in cell sub-grid
        for (const n of pencilMarks[r][c]) {
          const pr = Math.floor((n - 1) / 3);
          const pc = (n - 1) % 3;
          const px = x0 + c * CELL + 3 + pc * 9 + 4;
          const py = y0 + r * CELL + 4 + pr * 9 - 4;
          text.drawText(n.toString(), px, py, 8, '#667788', 'left');
        }
      }
    }
  }

  // Grid label above the grid
  renderer.setGlow(isPlayer ? THEME : '#ff9944', 0.7);
  text.drawText(label, x0 + GRID_PX / 2, y0 - 18, 12, isPlayer ? THEME : '#ff9944', 'center');
  renderer.setGlow(null);
}

// ── Main createGame export ──

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  game.onInit = () => {
    initState();
    game.showOverlay('PUZZLE RACE', 'Click to Start — Solve Sudoku faster than the AI!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse click — direct canvas listener (not engine input)
  canvas.addEventListener('click', (e) => {
    if (game.state === 'waiting') {
      startGame(game);
      return;
    }
    if (game.state === 'over') {
      initState();
      startGame(game);
      return;
    }
    if (game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (mx >= LEFT_X && mx < LEFT_X + GRID_PX && my >= GRID_Y && my < GRID_Y + GRID_PX) {
      const col = Math.floor((mx - LEFT_X) / CELL);
      const row = Math.floor((my - GRID_Y) / CELL);
      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        selectedRow = row;
        selectedCol = col;
      }
    }
  });

  // Keyboard input for number entry, arrows, delete
  document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing') return;
    if (selectedRow < 0 || selectedCol < 0) return;

    const r = selectedRow, c = selectedCol;

    if (e.key === 'ArrowUp') { selectedRow = Math.max(0, selectedRow - 1); return; }
    if (e.key === 'ArrowDown') { selectedRow = Math.min(8, selectedRow + 1); return; }
    if (e.key === 'ArrowLeft') { selectedCol = Math.max(0, selectedCol - 1); return; }
    if (e.key === 'ArrowRight') { selectedCol = Math.min(8, selectedCol + 1); return; }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (puzzle[r][c] === 0) {
        playerGrid[r][c] = 0;
        playerPencil[r][c].clear();
        playerRemaining = countEmpty(playerGrid);
      }
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      if (puzzle[r][c] !== 0) return;

      if (e.shiftKey) {
        // Pencil mark toggle
        if (playerPencil[r][c].has(num)) {
          playerPencil[r][c].delete(num);
        } else {
          playerPencil[r][c].add(num);
        }
        return;
      }

      playerPencil[r][c].clear();
      playerGrid[r][c] = num;

      if (num !== solution[r][c]) {
        playerErrors.push({ row: r, col: c, time: performance.now() });
      } else {
        // Clear pencil marks in peers
        for (let i = 0; i < 9; i++) {
          playerPencil[r][i].delete(num);
          playerPencil[i][c].delete(num);
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++)
          for (let cc = bc; cc < bc + 3; cc++)
            playerPencil[rr][cc].delete(num);
      }

      playerRemaining = countEmpty(playerGrid);

      if (playerRemaining === 0) {
        let allCorrect = true;
        for (let rr = 0; rr < 9; rr++)
          for (let cc = 0; cc < 9; cc++)
            if (playerGrid[rr][cc] !== solution[rr][cc]) allCorrect = false;
        if (allCorrect) endGame(game, 'player');
      }
    }
  });

  game.onUpdate = (dt) => {
    if (game.state === 'playing') {
      elapsed = (performance.now() - timerStart) / 1000;
      updateAI(game, performance.now());
    }

    // Expire old error flashes (older than 800ms)
    const now = performance.now();
    playerErrors = playerErrors.filter(err => now - err.time < 800);
  };

  game.onDraw = (renderer, text) => {
    const now = performance.now();

    // Timer at top center
    renderer.setGlow(THEME, 0.8);
    text.drawText(formatTime(elapsed), W / 2, 8, 16, THEME, 'center');
    renderer.setGlow(null);

    // Remaining cells counters
    text.drawText('Left: ' + playerRemaining, LEFT_X, 8, 11, '#aaaaaa', 'left');
    text.drawText('Left: ' + aiRemaining, RIGHT_X + GRID_PX, 8, 11, '#aaaaaa', 'right');

    // Draw both grids
    drawGrid(renderer, text, playerGrid, playerPencil, LEFT_X, GRID_Y, 'YOU', true, now);
    drawGrid(renderer, text, aiGrid, null, RIGHT_X, GRID_Y, 'AI', false, now);

    // Divider dashed line between grids
    renderer.dashedLine(W / 2, GRID_Y - 14, W / 2, GRID_Y + GRID_PX + 4, '#444444', 1, 4, 4);

    // Error flash rectangles (drawn as colored outlines using thin rects)
    for (const err of playerErrors) {
      const alpha = Math.round((1 - (now - err.time) / 800) * 255).toString(16).padStart(2, '0');
      const errColor = `#ff4444${alpha}`;
      const ex = LEFT_X + err.col * CELL + 1;
      const ey = GRID_Y + err.row * CELL + 1;
      const ew = CELL - 2;
      const eh = CELL - 2;
      // Top, bottom, left, right borders
      renderer.fillRect(ex, ey, ew, 2, errColor);
      renderer.fillRect(ex, ey + eh - 2, ew, 2, errColor);
      renderer.fillRect(ex, ey, 2, eh, errColor);
      renderer.fillRect(ex + ew - 2, ey, 2, eh, errColor);
    }

    // Controls help at bottom
    const helpY = GRID_Y + GRID_PX + 10;
    text.drawText(
      'Click cell + type 1-9 | Shift+# pencil | Backspace clear | Arrows move',
      W / 2, helpY, 10, '#556677', 'center'
    );
  };

  game.start();
  return game;
}
