// tetris/game.js — Tetris game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const CELL = 30;
const COLS = 10;
const ROWS = 20;

const PIECES = {
  I: { shape: [[0,0],[1,0],[2,0],[3,0]], color: '#0ff' },
  O: { shape: [[0,0],[1,0],[0,1],[1,1]], color: '#ff0' },
  T: { shape: [[0,0],[1,0],[2,0],[1,1]], color: '#a0f' },
  S: { shape: [[1,0],[2,0],[0,1],[1,1]], color: '#0f0' },
  Z: { shape: [[0,0],[1,0],[1,1],[2,1]], color: '#f00' },
  J: { shape: [[0,0],[0,1],[1,1],[2,1]], color: '#00f' },
  L: { shape: [[2,0],[0,1],[1,1],[2,1]], color: '#f90' }
};
const PIECE_NAMES = Object.keys(PIECES);

let board, current, next, pos, score, lines, level;
let dropInterval, dropTimer, softDropping;
let flashRows, flashTimer, flashPhase, showTetrisText;
let animatingFlash;

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');

// Next piece preview uses a small 2D canvas (tiny, no perf concern)
const nextCanvas = document.getElementById('nextCanvas');
const nctx = nextCanvas ? nextCanvas.getContext('2d') : null;

function randomPiece() {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
  return { name, shape: PIECES[name].shape.map(p => [...p]), color: PIECES[name].color };
}

function collides(shape, p) {
  return shape.some(([sx, sy]) => {
    const nx = p.x + sx, ny = p.y + sy;
    return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
  });
}

function ghostY() {
  let gy = pos.y;
  while (!collides(current.shape, { x: pos.x, y: gy + 1 })) gy++;
  return gy;
}

function drawBlock(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 3);
  context.fillRect(x * size + 1, y * size + 1, 3, size - 2);
}

function drawNext() {
  if (!nctx) return;
  nctx.fillStyle = '#16213e';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const size = 20;
  const minX = Math.min(...next.shape.map(p => p[0]));
  const maxX = Math.max(...next.shape.map(p => p[0]));
  const minY = Math.min(...next.shape.map(p => p[1]));
  const maxY = Math.max(...next.shape.map(p => p[1]));
  const pw = (maxX - minX + 1) * size;
  const ph = (maxY - minY + 1) * size;
  const ox = Math.floor((nextCanvas.width - pw) / 2) / size - minX;
  const oy = Math.floor((nextCanvas.height - ph) / 2) / size - minY;
  next.shape.forEach(([sx, sy]) => {
    drawBlock(nctx, ox + sx, oy + sy, next.color, size);
  });
}

export function createGame() {
  const game = new Game('game');

  function spawnPiece() {
    current = next;
    next = randomPiece();
    const minX = Math.min(...current.shape.map(p => p[0]));
    const maxX = Math.max(...current.shape.map(p => p[0]));
    pos = { x: Math.floor((COLS - (maxX - minX + 1)) / 2) - minX, y: 0 };
    const minY = Math.min(...current.shape.map(p => p[1]));
    pos.y = -minY;

    if (collides(current.shape, pos)) {
      game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
      game.setState('over');
    }
    drawNext();
  }

  function lock() {
    current.shape.forEach(([sx, sy]) => {
      const nx = pos.x + sx, ny = pos.y + sy;
      if (ny >= 0 && ny < ROWS) board[ny][nx] = current.color;
    });

    flashRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(c => c !== null)) flashRows.push(r);
    }

    if (flashRows.length > 0) {
      animatingFlash = true;
      flashPhase = 0;
      if (flashRows.length === 4) showTetrisText = 1;
    } else {
      spawnPiece();
    }
  }

  function finishFlash() {
    const cleared = flashRows.length;
    flashRows.sort((a, b) => b - a).forEach(r => {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
    });
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 70);
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
    flashRows = [];
    showTetrisText = 0;
    animatingFlash = false;
    spawnPiece();
  }

  function rotate() {
    const maxX = Math.max(...current.shape.map(p => p[0]));
    const maxY = Math.max(...current.shape.map(p => p[1]));
    const newShape = current.shape.map(([x, y]) => [maxY - y, x]);
    const kicks = [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: -1 }];
    for (const kick of kicks) {
      const testPos = { x: pos.x + kick.x, y: pos.y + kick.y };
      if (!collides(newShape, testPos)) {
        current.shape = newShape;
        pos.x = testPos.x;
        pos.y = testPos.y;
        return;
      }
    }
  }

  function drop(isSoftDrop) {
    pos.y++;
    if (collides(current.shape, pos)) {
      pos.y--;
      lock();
    } else if (isSoftDrop) {
      score += 1;
      scoreEl.textContent = score;
    }
  }

  function hardDrop() {
    while (!collides(current.shape, { x: pos.x, y: pos.y + 1 })) {
      pos.y++;
      score += 2;
    }
    scoreEl.textContent = score;
    lock();
  }

  function move(dx) {
    pos.x += dx;
    if (collides(current.shape, pos)) pos.x -= dx;
  }

  // Convert ms to frame count
  function dropFrames() {
    const interval = softDropping ? 50 : dropInterval;
    return Math.max(1, Math.round(interval * 60 / 1000));
  }

  game.onInit = () => {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0; lines = 0; level = 1;
    dropInterval = 800;
    dropTimer = 0;
    softDropping = false;
    flashRows = [];
    flashPhase = 0;
    showTetrisText = 0;
    animatingFlash = false;
    scoreEl.textContent = '0';
    linesEl.textContent = '0';
    levelEl.textContent = '1';
    next = randomPiece();
    spawnPiece();
    game.showOverlay('TETRIS', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // Flash animation
    if (animatingFlash) {
      flashPhase++;
      if (flashPhase > 12) {
        finishFlash();
      }
      return;
    }

    // Input
    if (input.wasPressed('ArrowLeft')) move(-1);
    if (input.wasPressed('ArrowRight')) move(1);
    if (input.wasPressed('ArrowUp')) rotate();
    if (input.wasPressed(' ')) { hardDrop(); dropTimer = 0; return; }

    // Soft drop tracking
    softDropping = input.isDown('ArrowDown');

    // Auto-drop timer
    dropTimer++;
    if (dropTimer >= dropFrames()) {
      dropTimer = 0;
      drop(softDropping);
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid
    for (let x = 0; x <= COLS * CELL; x += CELL) {
      renderer.fillRect(x, 0, 0.5, ROWS * CELL, '#16213e');
    }
    for (let y = 0; y <= ROWS * CELL; y += CELL) {
      renderer.fillRect(0, y, COLS * CELL, 0.5, '#16213e');
    }

    // Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          renderer.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, board[r][c]);
          // Highlight
          renderer.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 3, 'rgba(255,255,255,0.15)');
          renderer.fillRect(c * CELL + 1, r * CELL + 1, 3, CELL - 2, 'rgba(255,255,255,0.15)');
        }
      }
    }

    // Flash animation
    if (flashRows.length > 0 && flashPhase > 0) {
      const pulse = Math.sin(flashPhase * 0.8) * 0.5 + 0.5;
      const alpha = pulse * 0.8;
      flashRows.forEach(r => {
        renderer.fillRect(0, r * CELL, COLS * CELL, CELL, `rgba(255,255,255,${alpha})`);
      });

      if (showTetrisText) {
        text.drawText('TETRIS!', COLS * CELL / 2, ROWS * CELL / 2 - 24, 48, '#f0f', 'center');
      }
    }

    if (game.state === 'playing' || game.state === 'waiting') {
      // Ghost piece
      const gy = ghostY();
      current.shape.forEach(([sx, sy]) => {
        const gx = pos.x + sx, gpy = gy + sy;
        if (gpy >= 0) {
          renderer.fillRect(gx * CELL + 1, gpy * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,255,255,0.1)');
        }
      });

      // Current piece
      current.shape.forEach(([sx, sy]) => {
        const px = pos.x + sx, py = pos.y + sy;
        if (py >= 0) {
          renderer.fillRect(px * CELL + 1, py * CELL + 1, CELL - 2, CELL - 2, current.color);
          renderer.fillRect(px * CELL + 1, py * CELL + 1, CELL - 2, 3, 'rgba(255,255,255,0.15)');
          renderer.fillRect(px * CELL + 1, py * CELL + 1, 3, CELL - 2, 'rgba(255,255,255,0.15)');
        }
      });
    }
  };

  game.start();
  return game;
}
