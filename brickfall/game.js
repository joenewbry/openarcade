// brickfall/game.js — Brickfall (Tetris × Breakout) using WebGL v2 engine

import { Game } from '../engine/core.js';

const W = 300;
const H = 480;
const COLS = 10;
const ROWS = 16;
const CELL = W / COLS;          // 30px

const PADDLE_W = 60;
const PADDLE_H = 10;
const PADDLE_Y = H - 30;
const PADDLE_SPEED = 5;

const BALL_R = 6;
const BALL_SPEED = 5;

// Tetromino shapes (relative [col, row] offsets from origin)
const PIECES = [
  [[0,0],[1,0],[2,0],[3,0]],       // I
  [[0,0],[1,0],[0,1],[1,1]],       // O
  [[1,0],[0,1],[1,1],[2,1]],       // T
  [[0,0],[0,1],[1,1],[2,1]],       // J
  [[2,0],[0,1],[1,1],[2,1]],       // L
  [[1,0],[2,0],[0,1],[1,1]],       // S
  [[0,0],[1,0],[1,1],[2,1]],       // Z
];
const COLORS = ['#0ff','#ff0','#a0f','#00f','#f80','#0f0','#f00'];

// DOM refs
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

let board;        // ROWS × COLS of null | color string
let falling;      // { cells: [{c,r}], color }
let fallTimer, fallInterval;
let paddleX;
let ball;         // { x, y, vx, vy, active }
let score, lives, level;
let linesCleared;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}

function spawnPiece() {
  const idx = Math.floor(Math.random() * PIECES.length);
  const shape = PIECES[idx];
  const startC = Math.floor(COLS / 2) - 1;
  falling = {
    cells: shape.map(([dc, dr]) => ({ c: startC + dc, r: dr })),
    color: COLORS[idx],
  };
  // Immediate game over if any spawn cell is occupied
  if (falling.cells.some(({ c, r }) => board[r] && board[r][c])) {
    return false;
  }
  return true;
}

function lockPiece() {
  for (const { c, r } of falling.cells) {
    if (r >= 0 && r < ROWS) board[r][c] = falling.color;
  }
  // Check full rows
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(null));
      cleared++;
      r++; // re-check same row index
    }
  }
  if (cleared > 0) {
    linesCleared += cleared;
    score += cleared * 100 * cleared;
    scoreEl.textContent = score;
    level = Math.floor(linesCleared / 5) + 1;
    levelEl.textContent = level;
    fallInterval = Math.max(10, 55 - level * 5);
  }
}

function movePiece(dc, dr) {
  const next = falling.cells.map(({ c, r }) => ({ c: c + dc, r: r + dr }));
  if (next.every(({ c, r }) =>
    c >= 0 && c < COLS && r < ROWS &&
    (r < 0 || !board[r][c])
  )) {
    falling.cells = next;
    return true;
  }
  return false;
}

function launchBall() {
  ball = {
    x: paddleX + PADDLE_W / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: (Math.random() - 0.5) * 3,
    vy: -BALL_SPEED,
    active: true,
  };
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    board = emptyBoard();
    paddleX = W / 2 - PADDLE_W / 2;
    score = 0; lives = 3; level = 1; linesCleared = 0;
    fallTimer = 0; fallInterval = 50;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    ball = { active: false };
    spawnPiece();
    launchBall();
    game.showOverlay('BRICKFALL', 'Press LEFT/RIGHT or SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }
    if (game.state === 'over') {
      if (input.wasPressed(' ')) game.onInit();
      return;
    }

    // ── Paddle movement ──
    if (input.isDown('ArrowLeft'))  paddleX -= PADDLE_SPEED;
    if (input.isDown('ArrowRight')) paddleX += PADDLE_SPEED;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX));

    // ── Ball physics ──
    if (ball.active) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounces
      if (ball.x - BALL_R <= 0)  { ball.x = BALL_R;     ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R >= W)  { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R <= 0)  { ball.y = BALL_R;     ball.vy = Math.abs(ball.vy); }

      // Paddle collision
      if (ball.vy > 0 &&
          ball.y + BALL_R >= PADDLE_Y &&
          ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
          ball.x >= paddleX - BALL_R && ball.x <= paddleX + PADDLE_W + BALL_R) {
        ball.y = PADDLE_Y - BALL_R;
        const hit = (ball.x - paddleX) / PADDLE_W;
        const angle = (hit - 0.5) * (Math.PI / 3);
        const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.sin(angle) * spd;
        ball.vy = -Math.cos(angle) * spd;
      }

      // Ball vs board blocks (AABB)
      const ballC = Math.floor(ball.x / CELL);
      const ballR = Math.floor(ball.y / CELL);
      outerLoop:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = ballR + dr;
          const c = ballC + dc;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
          if (!board[r][c]) continue;
          // Check overlap
          const bx1 = c * CELL, by1 = r * CELL, bx2 = bx1 + CELL, by2 = by1 + CELL;
          if (ball.x + BALL_R > bx1 && ball.x - BALL_R < bx2 &&
              ball.y + BALL_R > by1 && ball.y - BALL_R < by2) {
            board[r][c] = null;
            score += 10;
            scoreEl.textContent = score;
            // Reflect based on which face was hit
            const overlapX = Math.min(ball.x + BALL_R - bx1, bx2 - (ball.x - BALL_R));
            const overlapY = Math.min(ball.y + BALL_R - by1, by2 - (ball.y - BALL_R));
            if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
            // Check full rows after hit
            checkRows();
            break outerLoop;
          }
        }
      }

      // Ball hits falling piece cells
      for (const { c, r } of falling.cells) {
        if (r < 0) continue;
        const bx1 = c * CELL, by1 = r * CELL, bx2 = bx1 + CELL, by2 = by1 + CELL;
        if (ball.x + BALL_R > bx1 && ball.x - BALL_R < bx2 &&
            ball.y + BALL_R > by1 && ball.y - BALL_R < by2) {
          // Remove that cell from falling piece
          falling.cells = falling.cells.filter(cell => !(cell.c === c && cell.r === r));
          score += 5;
          scoreEl.textContent = score;
          const overlapX = Math.min(ball.x + BALL_R - bx1, bx2 - (ball.x - BALL_R));
          const overlapY = Math.min(ball.y + BALL_R - by1, by2 - (ball.y - BALL_R));
          if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
          break;
        }
      }

      // Ball falls below screen
      if (ball.y - BALL_R > H) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score}  •  Press SPACE to restart`);
          game.setState('over');
          return;
        }
        launchBall();
      }
    }

    // ── Falling piece timer ──
    fallTimer++;
    if (fallTimer >= fallInterval) {
      fallTimer = 0;
      if (!movePiece(0, 1)) {
        lockPiece();
        if (!spawnPiece()) {
          game.showOverlay('GAME OVER', `Score: ${score}  •  Press SPACE to restart`);
          game.setState('over');
        }
      }
    }
  };

  function checkRows() {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(null));
        linesCleared++;
        score += 200;
        scoreEl.textContent = score;
        level = Math.floor(linesCleared / 5) + 1;
        levelEl.textContent = level;
        fallInterval = Math.max(10, 55 - level * 5);
        r++;
      }
    }
  }

  game.onDraw = (renderer, text) => {
    const COLOR = '#f80';

    // Draw board grid (dim)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        renderer.drawLine(c * CELL, 0, c * CELL, H, '#111', 1);
      }
    }

    // Draw stacked blocks
    renderer.setGlow(null);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          renderer.setGlow(board[r][c], 0.3);
          renderer.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, board[r][c]);
        }
      }
    }

    // Draw falling piece
    if (falling) {
      renderer.setGlow(falling.color, 0.6);
      for (const { c, r } of falling.cells) {
        if (r >= 0) {
          renderer.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, falling.color);
        }
      }
    }

    // Draw paddle
    renderer.setGlow(COLOR, 0.7);
    renderer.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, COLOR);

    // Draw ball
    if (ball.active) {
      renderer.setGlow('#fff', 0.9);
      renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
    }

    renderer.setGlow(null);
  };

  game.start();
  return game;
}
