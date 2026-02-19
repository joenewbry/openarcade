// minesweeper/game.js — Minesweeper game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 440;

// Grid constants
const COLS = 16;
const ROWS = 16;
const CELL = 25; // 25px per cell => 400px total
const HEADER_H = 40; // header area at top of canvas
const MINES = 40;

// Number colors (1-8)
const NUM_COLORS = [
  null,       // 0 unused
  '#48f',     // 1 blue
  '#0c0',     // 2 green
  '#f44',     // 3 red
  '#88f',     // 4 purple-blue
  '#c44',     // 5 dark red
  '#0cc',     // 6 teal
  '#c8c',     // 7 pink
  '#aaa'      // 8 gray
];

// ── State ──
let score, grid;
let minesPlaced, startTime, revealedCount, flagCount, gameWon;
let timerFrameCount; // replaces setInterval — counts frames for 1-second timer ticks

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
let best = 0;

// ── Mouse event queue ──
let pendingClicks = [];

function initGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = { mine: false, revealed: false, flagged: false, adjacent: 0 };
    }
  }
}

function placeMines(safeR, safeC) {
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (grid[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    grid[r][c].mine = true;
    placed++;
  }

  // Calculate adjacent counts
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) {
            count++;
          }
        }
      }
      grid[r][c].adjacent = count;
    }
  }
  minesPlaced = true;
}

function revealCell(r, c, game) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;

  cell.revealed = true;
  revealedCount++;

  if (cell.mine) {
    gameOver(false, game);
    return;
  }

  // Update score
  score = revealedCount;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  // Flood fill if no adjacent mines
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        revealCell(r + dr, c + dc, game);
      }
    }
  }

  // Check win condition
  if (revealedCount === ROWS * COLS - MINES) {
    gameOver(true, game);
  }
}

function gameOver(won, game) {
  gameWon = won;

  if (won) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 500 - elapsed * 2);
    score = revealedCount + timeBonus;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
  }

  // Reveal all mines
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].mine) {
        grid[r][c].revealed = true;
      }
    }
  }

  if (won) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    game.showOverlay('YOU WIN!', `Score: ${score} (${elapsed}s) \u2014 Press any key to play again`);
  } else {
    game.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
  }
  game.setState('over');
}

function getGridPos(x, y) {
  const c = Math.floor(x / CELL);
  const r = Math.floor((y - HEADER_H) / CELL);
  return { r, c };
}

// ── Draw helpers ──

function drawHeader(renderer, text, gameState) {
  const elapsed = gameState === 'playing' ? Math.floor((Date.now() - startTime) / 1000) : 0;

  // Timer (left)
  renderer.setGlow('#8f0', 0.4);
  text.drawText('\u23F1 ' + String(elapsed).padStart(3, '0'), 8, HEADER_H / 2 - 8, 16, '#8f0', 'left');

  // Mine counter (right)
  const remaining = MINES - flagCount;
  text.drawText('\u2739 ' + String(remaining).padStart(2, '0'), W - 8, HEADER_H / 2 - 8, 16, '#8f0', 'right');

  // Center: cells revealed / total
  const totalSafe = ROWS * COLS - MINES;
  text.drawText(revealedCount + '/' + totalSafe, W / 2, HEADER_H / 2 - 8, 16, '#8f0', 'center');

  renderer.setGlow(null);

  // Header separator line
  renderer.drawLine(0, HEADER_H - 1, W, HEADER_H - 1, 'rgba(136,255,0,0.3)', 1);
}

function drawCell(renderer, text, r, c) {
  const cell = grid[r][c];
  const x = c * CELL;
  const y = HEADER_H + r * CELL;

  if (!cell.revealed) {
    // Unrevealed cell body
    renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#1e2d4a');

    // Highlight edge (top + left) for raised effect
    renderer.fillRect(x + 1, y + 1, CELL - 2, 2, '#2a3f5f');
    renderer.fillRect(x + 1, y + 1, 2, CELL - 2, '#2a3f5f');

    // Shadow edge (bottom + right) for raised effect
    renderer.fillRect(x + 1, y + CELL - 3, CELL - 2, 2, '#121d32');
    renderer.fillRect(x + CELL - 3, y + 1, 2, CELL - 2, '#121d32');

    // Draw flag
    if (cell.flagged) {
      renderer.setGlow('#f44', 0.4);
      text.drawText('\u2691', x + CELL / 2, y + CELL / 2 - 7, 14, '#f44', 'center');
      renderer.setGlow(null);
    }
  } else {
    // Revealed cell
    renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#141e30');

    if (cell.mine) {
      // Mine: outer red circle
      renderer.setGlow('#f44', 0.5);
      renderer.fillCircle(x + CELL / 2, y + CELL / 2, 7, '#f44');
      renderer.setGlow(null);
      // Mine: inner white dot
      renderer.fillCircle(x + CELL / 2, y + CELL / 2, 2, '#fff');
    } else if (cell.adjacent > 0) {
      // Number
      const color = NUM_COLORS[cell.adjacent];
      renderer.setGlow(color, 0.3);
      text.drawText(String(cell.adjacent), x + CELL / 2, y + CELL / 2 - 8, 15, color, 'center');
      renderer.setGlow(null);
    }
  }
}

function drawGridLines(renderer) {
  for (let r = 0; r <= ROWS; r++) {
    renderer.drawLine(0, HEADER_H + r * CELL, W, HEADER_H + r * CELL, '#0f3460', 1);
  }
  for (let c = 0; c <= COLS; c++) {
    renderer.drawLine(c * CELL, HEADER_H, c * CELL, H, '#0f3460', 1);
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Prevent context menu on canvas
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mouse handler — queue clicks to be processed in onUpdate
  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    pendingClicks.push({ x, y, button: e.button });
  });

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    minesPlaced = false;
    revealedCount = 0;
    flagCount = 0;
    gameWon = false;
    startTime = 0;
    timerFrameCount = 0;
    pendingClicks = [];

    initGrid();

    game.showOverlay('MINESWEEPER', 'Click anywhere to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle waiting state
    if (game.state === 'waiting') {
      // Any key or click starts the game
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        startTime = Date.now();
        pendingClicks = [];
        return;
      }
      // Check for click to start
      if (pendingClicks.length > 0) {
        game.setState('playing');
        startTime = Date.now();
        // Don't clear pendingClicks — process first click as a game action
      } else {
        return;
      }
    }

    // Handle game over state
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
        return;
      }
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
        return;
      }
      return;
    }

    // ── Playing state ──
    timerFrameCount++;

    // Process queued mouse clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const { r, c } = getGridPos(click.x, click.y);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;

      if (click.button === 0) {
        // Left click — reveal
        if (grid[r][c].flagged) continue;
        if (!minesPlaced) {
          placeMines(r, c);
        }
        revealCell(r, c, game);
      } else if (click.button === 2) {
        // Right click — flag/unflag
        if (grid[r][c].revealed) continue;
        grid[r][c].flagged = !grid[r][c].flagged;
        flagCount += grid[r][c].flagged ? 1 : -1;
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Draw header (timer, mine count, progress)
    drawHeader(renderer, text, game.state);

    // Draw all cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        drawCell(renderer, text, r, c);
      }
    }

    // Draw grid lines
    drawGridLines(renderer);
  };

  game.start();
  return game;
}
