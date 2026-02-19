// pong/game.js — Pong game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 400;

const PADDLE_W = 10;
const PADDLE_H = 60;
const PADDLE_MARGIN = 20;
const PADDLE_SPEED = 5;
const BALL_SIZE = 8;
const BASE_BALL_SPEED = 4;
const WIN_SCORE = 11;
const AI_SPEED = 3.5;
const AI_REACTION = 0.08;

// ── State ──
let playerY, cpuY, ballX, ballY, ballVX, ballVY;
let playerScore, cpuScore, rallyCount;
let aiTarget;

// ── DOM refs ──
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');
const matchPointEl = document.getElementById('matchPoint');

function resetBall(dir) {
  ballX = W / 2;
  ballY = H / 2;
  const angle = (Math.random() - 0.5) * Math.PI / 3;
  ballVX = Math.cos(angle) * BASE_BALL_SPEED * dir;
  ballVY = Math.sin(angle) * BASE_BALL_SPEED;
  rallyCount = 0;
  aiTarget = H / 2;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    playerY = H / 2 - PADDLE_H / 2;
    cpuY = H / 2 - PADDLE_H / 2;
    playerScore = 0;
    cpuScore = 0;
    rallyCount = 0;
    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent = '0';
    matchPointEl.style.display = 'none';
    resetBall(1);
    game.showOverlay('PONG', 'Press UP/DOWN or SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => playerScore);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') || input.wasPressed(' ')) {
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

    // ── Playing state ──

    // Player movement
    if (input.isDown('ArrowUp')) playerY -= PADDLE_SPEED;
    if (input.isDown('ArrowDown')) playerY += PADDLE_SPEED;
    playerY = Math.max(0, Math.min(H - PADDLE_H, playerY));

    // AI movement
    if (ballVX > 0) {
      const timeToReach = (W - PADDLE_MARGIN - PADDLE_W - ballX) / ballVX;
      aiTarget = ballY + ballVY * timeToReach;
      while (aiTarget < 0 || aiTarget > H) {
        if (aiTarget < 0) aiTarget = -aiTarget;
        if (aiTarget > H) aiTarget = 2 * H - aiTarget;
      }
    } else {
      aiTarget = H / 2;
    }

    const cpuCenter = cpuY + PADDLE_H / 2;
    const diff = aiTarget - cpuCenter;
    const aiMoveSpeed = AI_SPEED + Math.min(rallyCount * 0.1, 2);
    if (Math.abs(diff) > 4) {
      cpuY += Math.sign(diff) * Math.min(aiMoveSpeed, Math.abs(diff) * AI_REACTION + 2);
    }
    cpuY = Math.max(0, Math.min(H - PADDLE_H, cpuY));

    // Ball movement
    ballX += ballVX;
    ballY += ballVY;

    // Top/bottom bounce
    if (ballY - BALL_SIZE / 2 <= 0) { ballY = BALL_SIZE / 2; ballVY = Math.abs(ballVY); }
    if (ballY + BALL_SIZE / 2 >= H) { ballY = H - BALL_SIZE / 2; ballVY = -Math.abs(ballVY); }

    // Player paddle collision (left)
    const pPaddleX = PADDLE_MARGIN;
    if (ballVX < 0 &&
        ballX - BALL_SIZE / 2 <= pPaddleX + PADDLE_W &&
        ballX - BALL_SIZE / 2 >= pPaddleX &&
        ballY >= playerY && ballY <= playerY + PADDLE_H) {
      ballX = pPaddleX + PADDLE_W + BALL_SIZE / 2;
      const hit = (ballY - playerY) / PADDLE_H;
      const angle = (hit - 0.5) * Math.PI / 3;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) + 0.15;
      ballVX = Math.cos(angle) * speed;
      ballVY = Math.sin(angle) * speed;
      rallyCount++;
    }

    // CPU paddle collision (right)
    const cPaddleX = W - PADDLE_MARGIN - PADDLE_W;
    if (ballVX > 0 &&
        ballX + BALL_SIZE / 2 >= cPaddleX &&
        ballX + BALL_SIZE / 2 <= cPaddleX + PADDLE_W &&
        ballY >= cpuY && ballY <= cpuY + PADDLE_H) {
      ballX = cPaddleX - BALL_SIZE / 2;
      const hit = (ballY - cpuY) / PADDLE_H;
      const angle = Math.PI - (hit - 0.5) * Math.PI / 3;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) + 0.15;
      ballVX = Math.cos(angle) * speed;
      ballVY = Math.sin(angle) * speed;
      rallyCount++;
    }

    // Scoring
    if (ballX < 0) {
      cpuScore++;
      cpuScoreEl.textContent = cpuScore;
      checkWin(-1);
    }
    if (ballX > W) {
      playerScore++;
      playerScoreEl.textContent = playerScore;
      checkWin(1);
    }

    // Match point indicator
    if (playerScore >= WIN_SCORE - 1 || cpuScore >= WIN_SCORE - 1) {
      matchPointEl.style.display = 'block';
    } else {
      matchPointEl.style.display = 'none';
    }
  };

  function checkWin(lastScorer) {
    if (playerScore >= WIN_SCORE) {
      game.showOverlay('YOU WIN!', `${playerScore} - ${cpuScore} -- Press SPACE to play again`);
      game.setState('over');
      return;
    }
    if (cpuScore >= WIN_SCORE) {
      game.showOverlay('CPU WINS', `${playerScore} - ${cpuScore} -- Press SPACE to play again`);
      game.setState('over');
      return;
    }
    resetBall(-lastScorer);
  }

  game.onDraw = (renderer, text) => {
    // Center dashed line
    renderer.dashedLine(W / 2, 0, W / 2, H, '#0f3460', 2, 8, 8);

    // Big score display (background, dim)
    text.drawText(String(playerScore), W / 4, 20, 80, '#16213e', 'center');
    text.drawText(String(cpuScore), 3 * W / 4, 20, 80, '#16213e', 'center');

    // Player paddle (with glow)
    renderer.setGlow('#88f', 0.6);
    renderer.fillRect(PADDLE_MARGIN, playerY, PADDLE_W, PADDLE_H, '#88f');

    // CPU paddle (with glow)
    renderer.fillRect(W - PADDLE_MARGIN - PADDLE_W, cpuY, PADDLE_W, PADDLE_H, '#88f');

    // Ball (with glow)
    renderer.setGlow('#88f', 0.7);
    renderer.fillCircle(ballX, ballY, BALL_SIZE, '#fff');
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
