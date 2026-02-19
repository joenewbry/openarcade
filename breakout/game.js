// breakout/game.js — Breakout game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 7;

const BALL_R = 6;
const BASE_BALL_SPEED = 4;

const BRICK_ROWS = 8;
const BRICK_COLS = 10;
const BRICK_W = (W - 20) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_TOP = 60;
const BRICK_PAD = 2;

const ROW_COLORS = ['#f44', '#f80', '#ff0', '#0f0', '#0ff', '#08f', '#88f', '#f0f'];

let paddleX, ballX, ballY, ballVX, ballVY, ballSpeed;
let bricks, score, lives, level;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

function initBricks() {
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks[r][c] = { alive: true };
    }
  }
}

function resetBall() {
  ballX = W / 2;
  ballY = PADDLE_Y - BALL_R - 2;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  ballVX = Math.cos(angle) * ballSpeed;
  ballVY = Math.sin(angle) * ballSpeed;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    paddleX = W / 2 - PADDLE_W / 2;
    score = 0;
    lives = 3;
    level = 1;
    ballSpeed = BASE_BALL_SPEED;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    initBricks();
    resetBall();
    game.showOverlay('BREAKOUT', 'Press LEFT/RIGHT or SPACE to start');
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
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // Move paddle
    if (input.isDown('ArrowLeft')) paddleX -= PADDLE_SPEED;
    if (input.isDown('ArrowRight')) paddleX += PADDLE_SPEED;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX));

    // Move ball
    ballX += ballVX;
    ballY += ballVY;

    // Wall collisions
    if (ballX - BALL_R <= 0) { ballX = BALL_R; ballVX = Math.abs(ballVX); }
    if (ballX + BALL_R >= W) { ballX = W - BALL_R; ballVX = -Math.abs(ballVX); }
    if (ballY - BALL_R <= 0) { ballY = BALL_R; ballVY = Math.abs(ballVY); }

    // Paddle collision
    if (ballVY > 0 && ballY + BALL_R >= PADDLE_Y && ballY + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
        ballX >= paddleX && ballX <= paddleX + PADDLE_W) {
      ballY = PADDLE_Y - BALL_R;
      const hit = (ballX - paddleX) / PADDLE_W;
      const angle = -Math.PI * (0.15 + 0.7 * (1 - hit));
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      ballVX = Math.cos(angle) * speed;
      ballVY = Math.sin(angle) * speed;
    }

    // Ball falls below
    if (ballY - BALL_R > H) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
        game.setState('over');
        return;
      }
      resetBall();
    }

    // Brick collisions
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const bx = 10 + c * BRICK_W + BRICK_PAD;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;

        if (ballX + BALL_R > bx && ballX - BALL_R < bx + bw &&
            ballY + BALL_R > by && ballY - BALL_R < by + bh) {
          bricks[r][c].alive = false;
          score += 10 + (BRICK_ROWS - r) * 5;
          scoreEl.textContent = score;

          const overlapLeft = (ballX + BALL_R) - bx;
          const overlapRight = (bx + bw) - (ballX - BALL_R);
          const overlapTop = (ballY + BALL_R) - by;
          const overlapBottom = (by + bh) - (ballY - BALL_R);
          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          if (minOverlapX < minOverlapY) {
            ballVX = -ballVX;
          } else {
            ballVY = -ballVY;
          }

          const currentSpeed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
          const newSpeed = currentSpeed + 0.02;
          ballVX = (ballVX / currentSpeed) * newSpeed;
          ballVY = (ballVY / currentSpeed) * newSpeed;
          break;
        }
      }
    }

    // Check level clear
    let allClear = true;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (bricks[r][c].alive) { allClear = false; break; }
      }
      if (!allClear) break;
    }
    if (allClear) {
      level++;
      levelEl.textContent = level;
      ballSpeed = BASE_BALL_SPEED + level * 0.5;
      initBricks();
      resetBall();
    }
  };

  game.onDraw = (renderer, text) => {
    // Bricks
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const bx = 10 + c * BRICK_W + BRICK_PAD;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;
        renderer.setGlow(ROW_COLORS[r], 0.4);
        renderer.fillRect(bx, by, bw, bh, ROW_COLORS[r]);
      }
    }

    // Paddle
    renderer.setGlow('#f80', 0.7);
    renderer.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, '#f80');

    // Ball
    renderer.setGlow('#f80', 0.8);
    renderer.fillCircle(ballX, ballY, BALL_R, '#fff');

    // Lives indicator
    renderer.setGlow('#f80', 0.4);
    for (let i = 0; i < lives; i++) {
      renderer.fillCircle(W - 20 - i * 18, H - 15, 5, '#f80');
    }
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
