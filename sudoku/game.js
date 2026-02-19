// sudoku/game.js — Sudoku game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 450;
const H = 500;

// Grid geometry
const GRID_SIZE = 450;
const CELL = GRID_SIZE / 9; // 50px per cell
const GRID_TOP = 0;
const NUM_PAD_TOP = GRID_SIZE + 5;
const NUM_PAD_H = H - GRID_SIZE;

// Theme colors
const THEME = '#4ae';
const THEME_DIM = 'rgba(68, 170, 238, 0.15)';
const THEME_MED = 'rgba(68, 170, 238, 0.25)';
const ERROR_COLOR = '#f44';
const LOCKED_COLOR = '#888';
const PLAYER_COLOR = '#4ae';
const BG = '#1a1a2e';
const GRID_LINE = '#0f3460';
const GRID_LINE_THICK = '#4ae';
const CELL_BG = '#16213e';

// ── State ──
let score, best = 0;
let puzzle, solution, board, locked;
let selRow = -1, selCol = -1;
let startTime = 0, elapsed = 0, timerInterval = null;
let difficulty = 40; // number of cells to remove

// ── DOM refs ──
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Sudoku Generator ──

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function solveSudoku(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board, limit) {
  let count = 0;
  function solve(b) {
    if (count >= limit) return;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValid(b, r, c, n)) {
              b[r][c] = n;
              solve(b);
              b[r][c] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve(board);
  return count;
}

function generatePuzzle(removals) {
  const solved = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveSudoku(solved);

  const puz = solved.map(r => [...r]);

  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }
  shuffleArray(cells);

  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= removals) break;
    const backup = puz[r][c];
    puz[r][c] = 0;
    const test = puz.map(row => [...row]);
    if (countSolutions(test, 2) === 1) {
      removed++;
    } else {
      puz[r][c] = backup;
    }
  }

  return { puzzle: puz, solution: solved };
}

// ── Game Logic ──

function hasConflict(row, col, num) {
  if (num === 0) return false;
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return true;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return true;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return true;
    }
  }
  return false;
}

function isBoardComplete() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
      if (hasConflict(r, c, board[r][c])) return false;
    }
  }
  return true;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function calculateScore(elapsedMs) {
  const seconds = Math.floor(elapsedMs / 1000);
  return Math.max(100, 10000 - seconds * 10);
}

function updateTimer(game) {
  if (game.state !== 'playing') return;
  elapsed = Date.now() - startTime;
  timerEl.textContent = formatTime(elapsed);
}

function getGridCell(mx, my) {
  if (my < GRID_TOP || my >= GRID_TOP + GRID_SIZE) return null;
  if (mx < 0 || mx >= GRID_SIZE) return null;
  const col = Math.floor(mx / CELL);
  const row = Math.floor((my - GRID_TOP) / CELL);
  if (row < 0 || row > 8 || col < 0 || col > 8) return null;
  return { row, col };
}

function getNumPadValue(mx, my) {
  if (my < NUM_PAD_TOP || my >= H) return null;
  const count_btns = 10;
  const gap = 4;
  const btnW = (GRID_SIZE - gap * (count_btns + 1)) / count_btns;
  for (let i = 0; i < count_btns; i++) {
    const x = gap + i * (btnW + gap);
    if (mx >= x && mx <= x + btnW) {
      return i < 9 ? i + 1 : 0; // 0 means clear
    }
  }
  return null;
}

function placeNumber(num, game) {
  if (selRow < 0 || selCol < 0) return;
  if (locked[selRow][selCol]) return;

  board[selRow][selCol] = num;

  if (num !== 0 && isBoardComplete()) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    score = calculateScore(elapsed);
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('COMPLETE!', `Time: ${formatTime(elapsed)} | Score: ${score} -- Press any key for new game`);
    game.setState('over');
  }
}

// ── Drawing helpers ──

function drawGrid(renderer, text, game) {
  // Cell backgrounds for highlighting
  if (selRow >= 0 && selCol >= 0 && game.state === 'playing') {
    const selBox_r = Math.floor(selRow / 3) * 3;
    const selBox_c = Math.floor(selCol / 3) * 3;

    // Highlight row, column, and box
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const inRow = r === selRow;
        const inCol = c === selCol;
        const inBox = r >= selBox_r && r < selBox_r + 3 && c >= selBox_c && c < selBox_c + 3;

        if (inRow || inCol || inBox) {
          renderer.fillRect(c * CELL, GRID_TOP + r * CELL, CELL, CELL, THEME_DIM);
        }
      }
    }

    // Highlight selected cell
    renderer.fillRect(selCol * CELL, GRID_TOP + selRow * CELL, CELL, CELL, THEME_MED);

    // Highlight all cells with the same number as selected
    const selNum = board[selRow][selCol];
    if (selNum !== 0) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === selNum && (r !== selRow || c !== selCol)) {
            renderer.fillRect(c * CELL, GRID_TOP + r * CELL, CELL, CELL, THEME_DIM);
          }
        }
      }
    }
  }

  // Thin grid lines
  for (let i = 0; i <= 9; i++) {
    if (i % 3 === 0) continue; // skip thick lines for now
    // Vertical
    renderer.drawLine(i * CELL, GRID_TOP, i * CELL, GRID_TOP + GRID_SIZE, GRID_LINE, 1);
    // Horizontal
    renderer.drawLine(0, GRID_TOP + i * CELL, GRID_SIZE, GRID_TOP + i * CELL, GRID_LINE, 1);
  }

  // Thick lines for 3x3 boxes (with neon glow)
  renderer.setGlow(THEME, 0.6);
  for (let i = 0; i <= 3; i++) {
    // Vertical
    renderer.drawLine(i * 3 * CELL, GRID_TOP, i * 3 * CELL, GRID_TOP + GRID_SIZE, GRID_LINE_THICK, 2);
    // Horizontal
    renderer.drawLine(0, GRID_TOP + i * 3 * CELL, GRID_SIZE, GRID_TOP + i * 3 * CELL, GRID_LINE_THICK, 2);
  }
  renderer.setGlow(null);

  // Selection border (bright glow)
  if (selRow >= 0 && selCol >= 0 && game.state === 'playing') {
    const sx = selCol * CELL + 1;
    const sy = GRID_TOP + selRow * CELL + 1;
    const sw = CELL - 2;
    const sh = CELL - 2;

    renderer.setGlow(THEME, 0.8);
    // Draw selection rectangle border as 4 lines
    renderer.drawLine(sx, sy, sx + sw, sy, THEME, 3);
    renderer.drawLine(sx + sw, sy, sx + sw, sy + sh, THEME, 3);
    renderer.drawLine(sx + sw, sy + sh, sx, sy + sh, THEME, 3);
    renderer.drawLine(sx, sy + sh, sx, sy, THEME, 3);
    renderer.setGlow(null);
  }
}

function drawNumbers(renderer, text) {
  if (!board) return;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === 0) continue;

      const x = c * CELL + CELL / 2;
      const y = GRID_TOP + r * CELL + CELL / 2 - 12; // offset for text baseline

      let color;
      if (locked[r][c]) {
        color = LOCKED_COLOR;
      } else if (hasConflict(r, c, num)) {
        renderer.setGlow(ERROR_COLOR, 0.7);
        color = ERROR_COLOR;
      } else {
        renderer.setGlow(THEME, 0.5);
        color = PLAYER_COLOR;
      }

      text.drawText(num.toString(), x, y, 24, color, 'center');
      renderer.setGlow(null);
    }
  }
}

function drawNumberPad(renderer, text) {
  const padY = NUM_PAD_TOP;
  const count_btns = 10;
  const gap = 4;
  const btnW = (GRID_SIZE - gap * (count_btns + 1)) / count_btns;
  const btnH = NUM_PAD_H - 10;

  for (let i = 0; i < count_btns; i++) {
    const x = gap + i * (btnW + gap);
    const label = i < 9 ? (i + 1).toString() : 'X';

    // Check if this number is fully placed (all 9 instances on board)
    let count = 0;
    if (i < 9 && board) {
      const num = i + 1;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === num) count++;
        }
      }
    }
    const depleted = count >= 9;

    // Background
    renderer.fillRect(x, padY, btnW, btnH, depleted ? '#111' : CELL_BG);

    // Border (as 4 lines)
    const borderColor = depleted ? '#333' : GRID_LINE;
    renderer.drawLine(x, padY, x + btnW, padY, borderColor, 1);
    renderer.drawLine(x + btnW, padY, x + btnW, padY + btnH, borderColor, 1);
    renderer.drawLine(x + btnW, padY + btnH, x, padY + btnH, borderColor, 1);
    renderer.drawLine(x, padY + btnH, x, padY, borderColor, 1);

    // Label
    let labelColor;
    if (depleted) {
      labelColor = '#333';
    } else if (i === 9) {
      labelColor = ERROR_COLOR;
    } else {
      renderer.setGlow(THEME, 0.4);
      labelColor = THEME;
    }

    text.drawText(label, x + btnW / 2, padY + btnH / 2 - 9, 18, labelColor, 'center');
    renderer.setGlow(null);
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    selRow = -1;
    selCol = -1;
    elapsed = 0;
    timerEl.textContent = '0:00';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    board = null;
    puzzle = null;
    solution = null;
    locked = null;

    game.showOverlay('SUDOKU', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score || 0);

  // Click handler for grid and number pad
  const canvas = document.getElementById('game');
  canvas.addEventListener('click', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    // Check grid
    const cell = getGridCell(mx, my);
    if (cell) {
      selRow = cell.row;
      selCol = cell.col;
      return;
    }

    // Check number pad
    const num = getNumPadValue(mx, my);
    if (num !== null) {
      placeNumber(num, game);
      return;
    }
  });

  function startGame() {
    const result = generatePuzzle(difficulty);
    puzzle = result.puzzle;
    solution = result.solution;
    board = puzzle.map(r => [...r]);
    locked = puzzle.map(r => r.map(v => v !== 0));
    selRow = 4;
    selCol = 4;

    score = 0;
    scoreEl.textContent = '0';
    startTime = Date.now();
    elapsed = 0;
    timerEl.textContent = '0:00';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateTimer(game), 200);

    game.hideOverlay();
    game.setState('playing');
  }

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        startGame();
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        ' ', 'Enter', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'Backspace', 'Delete', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
        'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'w', 'x', 'y', 'z']) {
        if (input.wasPressed(key)) {
          game.onInit();
          return;
        }
      }
      return;
    }

    // ── Playing state ──
    if (input.wasPressed('ArrowUp')) {
      if (selRow > 0) selRow--;
    }
    if (input.wasPressed('ArrowDown')) {
      if (selRow < 8) selRow++;
    }
    if (input.wasPressed('ArrowLeft')) {
      if (selCol > 0) selCol--;
    }
    if (input.wasPressed('ArrowRight')) {
      if (selCol < 8) selCol++;
    }

    for (let n = 1; n <= 9; n++) {
      if (input.wasPressed(n.toString())) {
        placeNumber(n, game);
      }
    }
    if (input.wasPressed('Backspace') || input.wasPressed('Delete')) {
      placeNumber(0, game);
    }
  };

  game.onDraw = (renderer, text) => {
    drawGrid(renderer, text, game);
    drawNumbers(renderer, text);
    drawNumberPad(renderer, text);
  };

  // Expose game data for ML pipeline
  window.gameData = {
    get board() { return board; },
    get solution() { return solution; },
    get selectedCell() { return { row: selRow, col: selCol }; },
    get elapsed() { return elapsed; }
  };

  game.start();
  return game;
}
