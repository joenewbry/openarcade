// nonogram/game.js — Nonogram game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 560;
const H = 560;

// ── Puzzle definitions ──
const PUZZLES = [
  // 5x5 puzzles
  {
    name: 'Heart', size: 5,
    data: [
      0,1,0,1,0,
      1,1,1,1,1,
      1,1,1,1,1,
      0,1,1,1,0,
      0,0,1,0,0
    ]
  },
  {
    name: 'Star', size: 5,
    data: [
      0,0,1,0,0,
      0,1,1,1,0,
      1,1,1,1,1,
      0,1,0,1,0,
      1,0,0,0,1
    ]
  },
  {
    name: 'Arrow', size: 5,
    data: [
      0,0,1,0,0,
      0,1,1,0,0,
      1,1,1,1,1,
      0,1,1,0,0,
      0,0,1,0,0
    ]
  },
  {
    name: 'Cross', size: 5,
    data: [
      0,1,1,1,0,
      1,0,1,0,1,
      1,1,1,1,1,
      1,0,1,0,1,
      0,1,1,1,0
    ]
  },
  // 10x10 puzzles
  {
    name: 'Mushroom', size: 10,
    data: [
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,0,1,1,0,1,1,0,
      0,1,1,1,1,1,1,1,1,0,
      1,1,0,1,1,1,1,0,1,1,
      1,1,1,1,1,1,1,1,1,1,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,0,0,1,1,0,0,
      0,0,1,1,0,0,1,1,0,0,
      0,0,1,1,1,1,1,1,0,0
    ]
  },
  {
    name: 'Skull', size: 10,
    data: [
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,1,1,1,1,1,1,0,
      1,1,1,1,1,1,1,1,1,1,
      1,1,0,0,1,1,0,0,1,1,
      1,1,0,0,1,1,0,0,1,1,
      1,1,1,1,1,1,1,1,1,1,
      0,1,1,0,1,1,0,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,0,0,1,0,0,1,0,0,0,
      0,0,1,0,1,1,0,1,0,0
    ]
  },
  {
    name: 'Spaceship', size: 10,
    data: [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,0,1,1,0,1,1,0,
      0,1,1,1,1,1,1,1,1,0,
      1,1,1,1,1,1,1,1,1,1,
      1,0,1,1,0,0,1,1,0,1,
      1,0,0,1,0,0,1,0,0,1,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,0,0,0,0,1,0,0
    ]
  },
  {
    name: 'Cat', size: 10,
    data: [
      1,0,0,0,0,0,0,0,0,1,
      1,1,0,0,0,0,0,0,1,1,
      1,1,1,0,0,0,0,1,1,1,
      1,0,1,1,1,1,1,1,0,1,
      1,0,0,1,0,0,1,0,0,1,
      1,1,0,0,1,1,0,0,1,1,
      0,1,1,1,1,1,1,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,0,0,1,0,0,1,0,0,0,
      0,0,1,1,0,0,1,1,0,0
    ]
  },
  {
    name: 'House', size: 10,
    data: [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,1,1,1,1,1,1,0,
      1,1,1,1,1,1,1,1,1,1,
      1,1,1,1,1,1,1,1,1,1,
      1,1,0,0,1,1,0,0,1,1,
      1,1,0,0,1,1,0,0,1,1,
      1,1,1,1,0,0,1,1,1,1,
      1,1,1,1,0,0,1,1,1,1
    ]
  },
  {
    name: 'Anchor', size: 10,
    data: [
      0,0,0,1,1,1,1,0,0,0,
      0,0,0,1,0,0,1,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      1,0,0,0,1,1,0,0,0,1,
      1,1,0,0,1,1,0,0,1,1,
      0,1,1,0,1,1,0,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,0,0,1,1,0,0
    ]
  },
  {
    name: 'Tree', size: 10,
    data: [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,1,1,1,1,1,1,0,
      0,0,1,1,1,1,1,1,0,0,
      0,1,1,1,1,1,1,1,1,0,
      1,1,1,1,1,1,1,1,1,1,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,1,1,1,1,0,0,0
    ]
  },
  {
    name: 'Sword', size: 10,
    data: [
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,1,1,1,1,1,1,0,0,
      0,0,0,1,1,1,1,0,0,0,
      0,0,0,0,1,1,0,0,0,0,
      0,0,0,0,1,1,0,0,0,0
    ]
  }
];

// ── State ──
let score = 0;
let best = 0;
let currentPuzzleIndex = 0;
let puzzleSize = 0;
let solution = [];
let grid = [];         // 0=unknown, 1=filled, 2=marked-empty
let cursorR = 0;
let cursorC = 0;
let rowClues = [];
let colClues = [];
let maxRowClueLen = 0;
let maxColClueLen = 0;
let startTime = 0;
let elapsedTime = 0;
let puzzleComplete = false;
let mistakes = 0;
let totalFilled = 0;
let hoverR = -1;
let hoverC = -1;

// Layout (recalculated per puzzle)
let CLUE_AREA_LEFT = 0;
let CLUE_AREA_TOP = 0;
let CELL_SIZE = 0;
let GRID_X = 0;
let GRID_Y = 0;

// Frame-based timers
let timerFrameCount = 0;  // counts frames for elapsed time
let solvedDelayFrames = 0; // delay after puzzle solved before next

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Clue computation ──
function computeClues(data, size) {
  const rClues = [];
  const cClues = [];

  for (let r = 0; r < size; r++) {
    const row = [];
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        count++;
      } else if (count > 0) {
        row.push(count);
        count = 0;
      }
    }
    if (count > 0) row.push(count);
    rClues.push(row.length ? row : [0]);
  }

  for (let c = 0; c < size; c++) {
    const col = [];
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (data[r * size + c]) {
        count++;
      } else if (count > 0) {
        col.push(count);
        count = 0;
      }
    }
    if (count > 0) col.push(count);
    cClues.push(col.length ? col : [0]);
  }

  return { rowClues: rClues, colClues: cClues };
}

// ── Layout calculation ──
function calcLayout() {
  maxRowClueLen = Math.max(...rowClues.map(c => c.length));
  maxColClueLen = Math.max(...colClues.map(c => c.length));

  const availW = W - 20;
  const availH = H - 40;

  const totalCellsH = maxRowClueLen + puzzleSize;
  const totalCellsV = maxColClueLen + puzzleSize;
  CELL_SIZE = Math.floor(Math.min(availW / totalCellsH, availH / totalCellsV));
  if (CELL_SIZE > 40) CELL_SIZE = 40;
  if (CELL_SIZE < 20) CELL_SIZE = 20;

  const totalW = totalCellsH * CELL_SIZE;
  const totalH = totalCellsV * CELL_SIZE;

  const startX = Math.floor((W - totalW) / 2);
  const startY = Math.floor((H - totalH) / 2) + 10;

  CLUE_AREA_LEFT = maxRowClueLen * CELL_SIZE;
  CLUE_AREA_TOP = maxColClueLen * CELL_SIZE;
  GRID_X = startX + CLUE_AREA_LEFT;
  GRID_Y = startY + CLUE_AREA_TOP;
}

// ── Row/col completion checks ──
function isRowComplete(r) {
  const clue = rowClues[r];
  const groups = [];
  let count = 0;
  for (let c = 0; c < puzzleSize; c++) {
    if (grid[r * puzzleSize + c] === 1) {
      count++;
    } else {
      if (count > 0) groups.push(count);
      count = 0;
    }
  }
  if (count > 0) groups.push(count);
  if (clue.length === 1 && clue[0] === 0) return groups.length === 0;
  if (groups.length !== clue.length) return false;
  return groups.every((g, i) => g === clue[i]);
}

function isColComplete(c) {
  const clue = colClues[c];
  const groups = [];
  let count = 0;
  for (let r = 0; r < puzzleSize; r++) {
    if (grid[r * puzzleSize + c] === 1) {
      count++;
    } else {
      if (count > 0) groups.push(count);
      count = 0;
    }
  }
  if (count > 0) groups.push(count);
  if (clue.length === 1 && clue[0] === 0) return groups.length === 0;
  if (groups.length !== clue.length) return false;
  return groups.every((g, i) => g === clue[i]);
}

// ── Win check ──
function checkWin() {
  for (let r = 0; r < puzzleSize; r++) {
    for (let c = 0; c < puzzleSize; c++) {
      const idx = r * puzzleSize + c;
      if (solution[idx] === 1 && grid[idx] !== 1) return false;
      if (solution[idx] === 0 && grid[idx] === 1) return false;
    }
  }
  return true;
}

// ── Scoring ──
function calculateScore() {
  const sizeBonus = puzzleSize === 5 ? 100 : 500;
  const baseTime = puzzleSize === 5 ? 30 : 120;
  const timePenalty = Math.max(0, Math.floor(elapsedTime - baseTime));
  const mistakePenalty = mistakes * 20;
  return Math.max(10, sizeBonus - timePenalty - mistakePenalty);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ── Load puzzle ──
function loadPuzzle() {
  const p = PUZZLES[currentPuzzleIndex];
  puzzleSize = p.size;
  solution = [...p.data];
  grid = new Array(puzzleSize * puzzleSize).fill(0);
  cursorR = 0;
  cursorC = 0;
  mistakes = 0;
  puzzleComplete = false;
  totalFilled = solution.filter(v => v === 1).length;

  const clues = computeClues(solution, puzzleSize);
  rowClues = clues.rowClues;
  colClues = clues.colClues;
  calcLayout();
}

// ── Cell actions ──
function fillCell(r, c, game) {
  if (puzzleComplete) return;
  if (r < 0 || r >= puzzleSize || c < 0 || c >= puzzleSize) return;
  const idx = r * puzzleSize + c;
  if (grid[idx] === 1) {
    grid[idx] = 0;
  } else {
    grid[idx] = 1;
    if (solution[idx] === 0) {
      mistakes++;
    }
  }
  if (checkWin()) puzzleSolved(game);
}

function markCell(r, c) {
  if (puzzleComplete) return;
  if (r < 0 || r >= puzzleSize || c < 0 || c >= puzzleSize) return;
  const idx = r * puzzleSize + c;
  if (grid[idx] === 2) {
    grid[idx] = 0;
  } else if (grid[idx] === 0) {
    grid[idx] = 2;
  }
}

function puzzleSolved(game) {
  puzzleComplete = true;
  // Freeze elapsed time
  elapsedTime = Math.floor(timerFrameCount / 60);

  const puzzleScore = calculateScore();
  score += puzzleScore;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  // Auto-fill unmarked empty cells
  for (let i = 0; i < puzzleSize * puzzleSize; i++) {
    if (solution[i] === 0 && grid[i] === 0) grid[i] = 2;
  }

  // Start delay before next puzzle (~1.5s = 90 frames)
  solvedDelayFrames = 90;
}

// ── Pixel-to-grid conversion ──
function pixelToGrid(px, py) {
  const c = Math.floor((px - GRID_X) / CELL_SIZE);
  const r = Math.floor((py - GRID_Y) / CELL_SIZE);
  if (r >= 0 && r < puzzleSize && c >= 0 && c < puzzleSize) {
    return { r, c };
  }
  return null;
}

// ── Mouse handling ──
function setupMouse(canvas, game) {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const cell = pixelToGrid(x, y);
    if (cell) {
      if (cell.r !== hoverR || cell.c !== hoverC) {
        hoverR = cell.r;
        hoverC = cell.c;
        cursorR = cell.r;
        cursorC = cell.c;
      }
    } else {
      hoverR = -1;
      hoverC = -1;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverR = -1;
    hoverC = -1;
  });

  canvas.addEventListener('click', (e) => {
    if (game.state !== 'playing' || puzzleComplete) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const cell = pixelToGrid(x, y);
    if (cell) {
      cursorR = cell.r;
      cursorC = cell.c;
      fillCell(cell.r, cell.c, game);
    }
  });

  // Right click = mark cell
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 2) return;
    if (game.state !== 'playing' || puzzleComplete) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const cell = pixelToGrid(x, y);
    if (cell) {
      cursorR = cell.r;
      cursorC = cell.c;
      markCell(cell.r, cell.c);
    }
  });
}

// ── Draw helper: stroke rectangle using drawLine ──
function strokeRect(renderer, x, y, w, h, color, lineWidth) {
  renderer.drawLine(x, y, x + w, y, color, lineWidth);
  renderer.drawLine(x + w, y, x + w, y + h, color, lineWidth);
  renderer.drawLine(x + w, y + h, x, y + h, color, lineWidth);
  renderer.drawLine(x, y + h, x, y, color, lineWidth);
}

// ── Create game ──
export function createGame() {
  const game = new Game('game');

  setupMouse(game.canvas, game);

  game.onInit = () => {
    score = 0;
    currentPuzzleIndex = 0;
    puzzleComplete = false;
    solvedDelayFrames = 0;
    timerFrameCount = 0;
    elapsedTime = 0;
    scoreEl.textContent = '0';
    loadPuzzle();
    const p = PUZZLES[currentPuzzleIndex];
    game.showOverlay('NONOGRAM', `Puzzle 1/${PUZZLES.length}: "${p.name}" (${p.size}x${p.size}) -- Press SPACE to start`);
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        timerFrameCount = 0;
        elapsedTime = 0;
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Timer: count frames, update elapsed each second
    if (!puzzleComplete) {
      timerFrameCount++;
      elapsedTime = Math.floor(timerFrameCount / 60);
    }

    // Handle solved delay
    if (solvedDelayFrames > 0) {
      solvedDelayFrames--;
      if (solvedDelayFrames === 0) {
        currentPuzzleIndex++;
        if (currentPuzzleIndex >= PUZZLES.length) {
          // All puzzles done
          game.showOverlay('ALL PUZZLES COMPLETE!', `Final Score: ${score} -- Press SPACE to restart`);
          game.setState('over');
          currentPuzzleIndex = 0;
        } else {
          // Load next puzzle
          loadPuzzle();
          timerFrameCount = 0;
          elapsedTime = 0;
        }
      }
      return;
    }

    // Keyboard movement (only when not complete)
    if (!puzzleComplete) {
      if (input.wasPressed('ArrowUp')) {
        cursorR = Math.max(0, cursorR - 1);
      }
      if (input.wasPressed('ArrowDown')) {
        cursorR = Math.min(puzzleSize - 1, cursorR + 1);
      }
      if (input.wasPressed('ArrowLeft')) {
        cursorC = Math.max(0, cursorC - 1);
      }
      if (input.wasPressed('ArrowRight')) {
        cursorC = Math.min(puzzleSize - 1, cursorC + 1);
      }
      if (input.wasPressed(' ')) {
        fillCell(cursorR, cursorC, game);
      }
      if (input.wasPressed('x') || input.wasPressed('X')) {
        markCell(cursorR, cursorC);
      }
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      // Draw preview hint text
      text.drawText('Use number clues to fill cells and reveal the picture!', W / 2, H / 2 - 20, 14, '#888888', 'center');
      text.drawText('Arrow Keys = Move | Space = Fill | X = Mark Empty', W / 2, H / 2 + 5, 14, '#888888', 'center');
      text.drawText('Mouse: Left Click = Fill | Right Click = Mark', W / 2, H / 2 + 25, 14, '#888888', 'center');
      return;
    }

    if (game.state === 'over') return;

    // ── Timer display ──
    text.drawText(`Time: ${formatTime(elapsedTime)}`, 10, 2, 14, '#aa88ee', 'left');
    text.drawText(`Puzzle ${currentPuzzleIndex + 1}/${PUZZLES.length}: "${PUZZLES[currentPuzzleIndex].name}"`, 200, 2, 14, '#aa88ee', 'left');
    text.drawText(`Errors: ${mistakes}`, W - 100, 2, 14, '#aa88ee', 'left');

    // ── Grid background ──
    renderer.fillRect(GRID_X, GRID_Y, puzzleSize * CELL_SIZE, puzzleSize * CELL_SIZE, '#0d0d1a');

    // ── Clue area backgrounds ──
    // Row clue background
    renderer.fillRect(GRID_X - maxRowClueLen * CELL_SIZE, GRID_Y, maxRowClueLen * CELL_SIZE, puzzleSize * CELL_SIZE, '#16213e80');
    // Col clue background
    renderer.fillRect(GRID_X, GRID_Y - maxColClueLen * CELL_SIZE, puzzleSize * CELL_SIZE, maxColClueLen * CELL_SIZE, '#16213e80');

    // ── Grid lines ──
    for (let i = 0; i <= puzzleSize; i++) {
      let lineColor = '#2a2a4e';
      let lineW = 1;
      if (i % 5 === 0 && puzzleSize === 10) {
        lineColor = '#4a4a6e';
        lineW = 2;
      }
      // Vertical lines
      renderer.drawLine(
        GRID_X + i * CELL_SIZE, GRID_Y,
        GRID_X + i * CELL_SIZE, GRID_Y + puzzleSize * CELL_SIZE,
        lineColor, lineW
      );
      // Horizontal lines
      renderer.drawLine(
        GRID_X, GRID_Y + i * CELL_SIZE,
        GRID_X + puzzleSize * CELL_SIZE, GRID_Y + i * CELL_SIZE,
        lineColor, lineW
      );
    }

    // ── Outer border ──
    strokeRect(renderer, GRID_X, GRID_Y, puzzleSize * CELL_SIZE, puzzleSize * CELL_SIZE, '#aa88ee', 2);

    // ── Cells ──
    for (let r = 0; r < puzzleSize; r++) {
      for (let c = 0; c < puzzleSize; c++) {
        const idx = r * puzzleSize + c;
        const cx = GRID_X + c * CELL_SIZE;
        const cy = GRID_Y + r * CELL_SIZE;

        if (grid[idx] === 1) {
          const isCorrect = solution[idx] === 1;
          if (puzzleComplete) {
            renderer.setGlow('#aa88ee', 0.5);
            renderer.fillRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4, '#aa88ee');
            renderer.setGlow(null);
          } else if (!isCorrect) {
            renderer.setGlow('#f44', 0.4);
            renderer.fillRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4, '#f44');
            renderer.setGlow(null);
          } else {
            renderer.setGlow('#aa88ee', 0.4);
            renderer.fillRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4, '#aa88ee');
            renderer.setGlow(null);
          }
        } else if (grid[idx] === 2) {
          // Marked as empty (X)
          const pad = 6;
          renderer.drawLine(cx + pad, cy + pad, cx + CELL_SIZE - pad, cy + CELL_SIZE - pad, '#666666', 2);
          renderer.drawLine(cx + CELL_SIZE - pad, cy + pad, cx + pad, cy + CELL_SIZE - pad, '#666666', 2);
        }
      }
    }

    // ── Cursor (only when not complete) ──
    if (!puzzleComplete) {
      renderer.setGlow('#ffffff', 0.5);
      strokeRect(renderer,
        GRID_X + cursorC * CELL_SIZE + 1,
        GRID_Y + cursorR * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        '#ffffff', 3
      );
      renderer.setGlow(null);
    }

    // ── Row clues ──
    const clueFontSize = CELL_SIZE <= 24 ? 12 : 14;

    for (let r = 0; r < puzzleSize; r++) {
      const clue = rowClues[r];
      const completed = isRowComplete(r);
      const cy = GRID_Y + r * CELL_SIZE + CELL_SIZE / 2 - clueFontSize / 2;

      for (let i = 0; i < clue.length; i++) {
        const cx = GRID_X - (clue.length - i) * CELL_SIZE + CELL_SIZE / 2;
        const clueColor = completed ? '#44aa66' : '#c8c8e8';
        text.drawText(String(clue[i]), cx, cy, clueFontSize, clueColor, 'center');
      }
    }

    // ── Column clues ──
    for (let c = 0; c < puzzleSize; c++) {
      const clue = colClues[c];
      const completed = isColComplete(c);
      const cx = GRID_X + c * CELL_SIZE + CELL_SIZE / 2;

      for (let i = 0; i < clue.length; i++) {
        const cy = GRID_Y - (clue.length - i) * CELL_SIZE + CELL_SIZE / 2 - clueFontSize / 2;
        const clueColor = completed ? '#44aa66' : '#c8c8e8';
        text.drawText(String(clue[i]), cx, cy, clueFontSize, clueColor, 'center');
      }
    }

    // ── Separator lines between clue area and grid ──
    // Left of grid (vertical separator)
    renderer.drawLine(GRID_X, GRID_Y - maxColClueLen * CELL_SIZE, GRID_X, GRID_Y + puzzleSize * CELL_SIZE, '#aa88ee', 2);
    // Top of grid (horizontal separator)
    renderer.drawLine(GRID_X - maxRowClueLen * CELL_SIZE, GRID_Y, GRID_X + puzzleSize * CELL_SIZE, GRID_Y, '#aa88ee', 2);

    // ── Puzzle complete flash ──
    if (puzzleComplete) {
      renderer.fillRect(GRID_X, GRID_Y, puzzleSize * CELL_SIZE, puzzleSize * CELL_SIZE, '#aa88ee26');
      renderer.setGlow('#aa88ee', 0.8);
      text.drawText('COMPLETE!', GRID_X + puzzleSize * CELL_SIZE / 2, GRID_Y + puzzleSize * CELL_SIZE + 8, 20, '#aa88ee', 'center');
      renderer.setGlow(null);
    }
  };

  // Expose game data for ML
  window.gameData = {
    get puzzleIndex() { return currentPuzzleIndex; },
    get puzzleSize() { return puzzleSize; },
    get cursorR() { return cursorR; },
    get cursorC() { return cursorC; },
    get grid() { return grid; },
    get mistakes() { return mistakes; },
    get elapsed() { return elapsedTime; }
  };

  game.start();
  return game;
}
