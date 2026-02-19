// columns/game.js — Columns game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 300;
const H = 600;

// Grid dimensions
const COLS = 6;
const ROWS = 13;
const CELL = W / COLS; // 50px per cell
const BOARD_Y_OFFSET = H - ROWS * CELL; // top of visible board

// Gem colors - 6 distinct bright colors
const GEM_COLORS = [
  '#f44',  // red
  '#4f4',  // green
  '#44f',  // blue
  '#ff0',  // yellow
  '#f0f',  // magenta
  '#0ff',  // cyan
];

// Drop timing (in frames at 60fps)
const BASE_DROP_FRAMES = 48;  // ~800ms at 60fps
const SOFT_DROP_FRAMES = 3;   // ~50ms at 60fps
const FLASH_FRAMES_PER_TICK = 2; // flash animation speed (was 40ms setTimeout = ~2.4 frames)
const FLASH_TOTAL = 14;

// ── State ──
let score, best, level, gemsCleared;
let board;          // ROWS x COLS grid, null or color index
let piece;          // { col, row, gems: [top, mid, bot] } - color indices
let dropCounter;    // frame counter for drop tick
let dropFrames;     // frames between drops at current level
let chainCount;
let animating;      // true during match/clear animation
let matchedCells;   // Set of "r,c" strings for cells being cleared
let flashPhase;
let flashCounter;   // frame counter for flash animation
let softDropping;
let gameRef;        // reference to game instance

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function randomGem() {
  return Math.floor(Math.random() * GEM_COLORS.length);
}

function spawnPiece() {
  const col = Math.floor(COLS / 2);
  piece = {
    col: col,
    row: -2,  // start above the visible area
    gems: [randomGem(), randomGem(), randomGem()]
  };
  // Check if the landing spot is blocked
  if (board[0][col] !== null) {
    doGameOver();
  }
}

function cycleGems() {
  // Rotate: bottom -> top, top -> middle, middle -> bottom
  const [top, mid, bot] = piece.gems;
  piece.gems = [bot, top, mid];
}

function canMove(col, row) {
  for (let i = 0; i < 3; i++) {
    const r = row + i;
    if (col < 0 || col >= COLS) return false;
    if (r >= ROWS) return false;
    if (r >= 0 && board[r][col] !== null) return false;
  }
  return true;
}

function lockPiece() {
  for (let i = 0; i < 3; i++) {
    const r = piece.row + i;
    if (r >= 0 && r < ROWS) {
      board[r][piece.col] = piece.gems[i];
    }
  }
  piece = null;
  chainCount = 0;
  checkMatches();
}

function checkMatches() {
  matchedCells = new Set();

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === null) continue;
      const color = board[r][c];

      for (const [dr, dc] of directions) {
        let count = 1;
        let cells = [`${r},${c}`];
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) {
          cells.push(`${nr},${nc}`);
          count++;
          nr += dr;
          nc += dc;
        }
        if (count >= 3) {
          cells.forEach(key => matchedCells.add(key));
        }
      }
    }
  }

  if (matchedCells.size > 0) {
    chainCount++;
    animating = true;
    flashPhase = 0;
    flashCounter = 0;
  } else {
    animating = false;
    if (gameRef.state === 'playing') {
      spawnPiece();
      dropCounter = 0;
    }
  }
}

function finishFlash() {
  // Clear matched gems and award score
  const cleared = matchedCells.size;
  const chainBonus = chainCount > 1 ? chainCount * 2 : 1;
  score += cleared * 10 * chainBonus;
  gemsCleared += cleared;

  // Update level every 30 gems cleared
  const newLevel = Math.floor(gemsCleared / 30) + 1;
  if (newLevel > level) {
    level = newLevel;
    dropFrames = Math.max(6, BASE_DROP_FRAMES - (level - 1) * 4);
  }

  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  // Remove matched cells
  matchedCells.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    board[r][c] = null;
  });
  matchedCells = new Set();

  // Apply gravity
  applyGravity();

  // Check for chain reactions
  checkMatches();
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        board[writeRow][c] = board[r][c];
        if (writeRow !== r) board[r][c] = null;
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      board[r][c] = null;
    }
  }
}

function dropTick() {
  if (gameRef.state !== 'playing' || animating || !piece) return;

  if (canMove(piece.col, piece.row + 1)) {
    piece.row++;
    if (softDropping) {
      score += 1;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }
  } else {
    lockPiece();
    return;
  }

  dropCounter = 0;
}

function hardDrop() {
  if (!piece || animating) return;
  while (canMove(piece.col, piece.row + 1)) {
    piece.row++;
    score += 2;
  }
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  lockPiece();
}

function doGameOver() {
  gameRef.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
  gameRef.setState('over');
}

// ── Drawing helpers ──

function drawGem(renderer, x, y, colorIdx, size, alpha) {
  if (colorIdx === null) return;
  const a = alpha !== undefined ? alpha : 1;

  const x1 = x + size * 0.12;
  const y1 = y + size * 0.12;
  const w = size * 0.76;
  const h = size * 0.76;

  // Glow
  renderer.setGlow(GEM_COLORS[colorIdx], 0.5 * a);

  // Main gem body (rounded square approximated as filled rect)
  renderer.fillRect(x1, y1, w, h, GEM_COLORS[colorIdx]);

  // Inner highlight (top-left triangle area approximated as a smaller rect)
  renderer.setGlow(null);
  const hlW = w * 0.45;
  const hlH = h * 0.35;
  const hlColor = `rgba(255, 255, 255, ${0.2 * a})`;
  renderer.fillRect(x1, y1, hlW, hlH, hlColor);
}

export function createGame() {
  const game = new Game('game');
  gameRef = game;

  game.onInit = () => {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    best = best || 0;
    level = 1;
    gemsCleared = 0;
    chainCount = 0;
    dropFrames = BASE_DROP_FRAMES;
    dropCounter = 0;
    animating = false;
    matchedCells = new Set();
    flashPhase = 0;
    flashCounter = 0;
    softDropping = false;
    piece = null;
    scoreEl.textContent = '0';
    game.showOverlay('COLUMNS', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.setState('playing');
        spawnPiece();
        dropCounter = 0;
      }
      return;
    }

    // ── Game Over state ──
    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Handle flash animation
    if (animating) {
      flashCounter++;
      if (flashCounter >= FLASH_FRAMES_PER_TICK) {
        flashCounter = 0;
        flashPhase++;
        if (flashPhase > FLASH_TOTAL) {
          finishFlash();
        }
      }
      return;
    }

    // Input handling (only when piece is active and not animating)
    if (piece) {
      if (input.wasPressed('ArrowLeft')) {
        if (canMove(piece.col - 1, piece.row)) {
          piece.col--;
        }
      }
      if (input.wasPressed('ArrowRight')) {
        if (canMove(piece.col + 1, piece.row)) {
          piece.col++;
        }
      }
      if (input.wasPressed('ArrowUp')) {
        cycleGems();
      }
      if (input.wasPressed(' ')) {
        hardDrop();
        return;
      }

      // Soft drop: track isDown for continuous, wasPressed to start
      if (input.isDown('ArrowDown')) {
        softDropping = true;
      }
      if (input.wasReleased('ArrowDown')) {
        softDropping = false;
        dropCounter = 0;
      }
    }

    // Drop timing via frame counter
    if (piece) {
      dropCounter++;
      const interval = softDropping ? SOFT_DROP_FRAMES : dropFrames;
      if (dropCounter >= interval) {
        dropTick();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Grid lines
    for (let x = 0; x <= W; x += CELL) {
      renderer.drawLine(x, 0, x, H, '#16213e', 0.5);
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.drawLine(0, y, W, y, '#16213e', 0.5);
    }

    // Draw board gems
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board && board[r][c] !== null) {
          const key = `${r},${c}`;
          if (matchedCells && matchedCells.has(key) && flashPhase > 0) {
            // Flash effect for matched gems
            const pulse = Math.sin(flashPhase * 0.7) * 0.5 + 0.5;
            const alpha = 0.3 + pulse * 0.7;
            drawGem(renderer, c * CELL, r * CELL + BOARD_Y_OFFSET, board[r][c], CELL, alpha);
            // White flash overlay
            const flashAlpha = pulse * 0.5;
            renderer.setGlow(null);
            renderer.fillRect(c * CELL + 2, r * CELL + BOARD_Y_OFFSET + 2, CELL - 4, CELL - 4,
              `rgba(255, 255, 255, ${flashAlpha})`);
          } else {
            drawGem(renderer, c * CELL, r * CELL + BOARD_Y_OFFSET, board[r][c], CELL);
          }
        }
      }
    }

    // Draw falling piece
    if (piece && !animating) {
      // Ghost piece (preview where it will land)
      let ghostRow = piece.row;
      while (canMove(piece.col, ghostRow + 1)) ghostRow++;
      if (ghostRow !== piece.row) {
        for (let i = 0; i < 3; i++) {
          const gr = ghostRow + i;
          if (gr >= 0 && gr < ROWS) {
            drawGem(renderer, piece.col * CELL, gr * CELL + BOARD_Y_OFFSET, piece.gems[i], CELL, 0.2);
          }
        }
      }

      // Active piece
      for (let i = 0; i < 3; i++) {
        const r = piece.row + i;
        const py = r * CELL + BOARD_Y_OFFSET;
        if (py >= 0 && r < ROWS) {
          drawGem(renderer, piece.col * CELL, py, piece.gems[i], CELL);
        }
      }
    }

    // Level indicator
    renderer.setGlow(null);
    text.drawText(`LVL ${level}`, W - 6, 4, 12, '#888', 'right');

    // Chain text
    if (chainCount > 1 && animating) {
      const scale = 1 + Math.sin(flashPhase * 0.5) * 0.1;
      const size = Math.round(28 * scale);
      renderer.setGlow('#c6f', 0.8);
      text.drawText(`${chainCount}x CHAIN!`, W / 2, H / 2 - 14, size, '#c6f', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
