// worm-pong/game.js — Worm Pong (Snake × Pong) using WebGL v2 engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 400;
const SEG = 12;          // snake segment size
const HALF = W / 2;      // center divider
const WIN_SCORE = 7;
const TICK = 6;          // frames per snake step

// Ball
const BALL_R = 6;
const BALL_SPEED = 4;

// ── DOM refs ──
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl    = document.getElementById('cpuScore');
const playerLivesEl = document.getElementById('playerLives');
const cpuLivesEl    = document.getElementById('cpuLives');

let playerScore, cpuScore, playerLives, cpuLives;
let ball;
let playerSnake, cpuSnake;
let playerDir, cpuDir;
let tick;

function makeSnake(startX, startY, len, dx) {
  const segs = [];
  for (let i = 0; i < len; i++) {
    segs.push({ x: startX - dx * i * SEG, y: startY });
  }
  return segs;
}

function resetBall(dir) {
  ball = {
    x: W / 2,
    y: H / 2,
    vx: BALL_SPEED * dir,
    vy: (Math.random() - 0.5) * BALL_SPEED * 1.2,
  };
}

function resetSnakes() {
  // Player in left half (x: 0..240), head near right edge of half
  playerSnake = makeSnake(HALF - SEG * 3, H / 2, 3, 1);
  playerDir = { dx: 0, dy: -1 };

  // CPU in right half (x: 240..480), head near left edge of half
  cpuSnake = makeSnake(HALF + SEG * 3, H / 2, 3, -1);
  cpuDir = { dx: 0, dy: 1 };
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    playerScore = 0; cpuScore = 0;
    playerLives = 3; cpuLives = 3;
    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent = '0';
    playerLivesEl.textContent = '3';
    cpuLivesEl.textContent = '3';
    tick = 0;
    resetSnakes();
    resetBall(1);
    game.showOverlay('WORM PONG', 'Press UP/DOWN or SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => playerScore);

  // ── Next direction queues (buffer one input per tick) ──
  let playerNextDir = null;
  let cpuNextDir = null;

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') || input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }
    if (game.state === 'over') {
      if (input.wasPressed(' ')) game.onInit();
      return;
    }

    // ── Input: queue direction changes ──
    if (input.wasPressed('ArrowUp')   && playerDir.dy === 0) playerNextDir = { dx: 0, dy: -1 };
    if (input.wasPressed('ArrowDown') && playerDir.dy === 0) playerNextDir = { dx: 0, dy:  1 };

    tick++;
    const doStep = (tick % TICK === 0);

    // ── Ball physics (every frame) ──
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom bounce
    if (ball.y - BALL_R <= 0)  { ball.y = BALL_R;      ball.vy = Math.abs(ball.vy); }
    if (ball.y + BALL_R >= H)  { ball.y = H - BALL_R;  ball.vy = -Math.abs(ball.vy); }

    // ── Ball vs snake heads (deflect) ──
    checkBallSnakeHead(playerSnake[0], ball, true);
    checkBallSnakeHead(cpuSnake[0], ball, false);

    // ── Scoring: ball exits sides ──
    if (ball.x - BALL_R < 0) {
      // CPU scores
      cpuScore++;
      cpuScoreEl.textContent = cpuScore;
      playerLives--;
      playerLivesEl.textContent = playerLives;
      if (playerLives <= 0 || cpuScore >= WIN_SCORE) {
        endGame(false);
        return;
      }
      // Respawn player snake small
      playerSnake = makeSnake(HALF - SEG * 3, H / 2, 3, 1);
      playerDir = { dx: 0, dy: -1 };
      playerNextDir = null;
      resetBall(-1);
    }
    if (ball.x + BALL_R > W) {
      // Player scores
      playerScore++;
      playerScoreEl.textContent = playerScore;
      cpuLives--;
      cpuLivesEl.textContent = cpuLives;
      if (cpuLives <= 0 || playerScore >= WIN_SCORE) {
        endGame(true);
        return;
      }
      cpuSnake = makeSnake(HALF + SEG * 3, H / 2, 3, -1);
      cpuDir = { dx: 0, dy: 1 };
      cpuNextDir = null;
      resetBall(1);
    }

    if (!doStep) return;

    // ── Snake step ──
    // Apply queued direction
    if (playerNextDir) { playerDir = playerNextDir; playerNextDir = null; }

    // CPU AI: steer head toward ball Y
    const cpuHead = cpuSnake[0];
    const ballRelY = ball.y - cpuHead.y;
    if (Math.abs(ballRelY) > SEG / 2) {
      const wantDY = ballRelY > 0 ? 1 : -1;
      // Only switch if not reversing
      if (cpuDir.dx !== 0 || wantDY !== -cpuDir.dy) {
        cpuNextDir = { dx: 0, dy: wantDY };
      }
    } else if (cpuDir.dy !== 0) {
      // Move horizontally toward center of CPU half
      const wantDX = cpuHead.x < HALF + HALF / 2 ? 1 : -1;
      cpuNextDir = { dx: wantDX, dy: 0 };
    }
    if (cpuNextDir) { cpuDir = cpuNextDir; cpuNextDir = null; }

    stepSnake(playerSnake, playerDir, 0, HALF);
    stepSnake(cpuSnake, cpuDir, HALF, W);

    // ── Self-collision detection ──
    if (selfCollide(playerSnake)) {
      playerLives--;
      playerLivesEl.textContent = playerLives;
      if (playerLives <= 0) { endGame(false); return; }
      playerSnake = makeSnake(HALF - SEG * 3, H / 2, 3, 1);
      playerDir = { dx: 0, dy: -1 };
      playerNextDir = null;
    }
    if (selfCollide(cpuSnake)) {
      cpuLives--;
      cpuLivesEl.textContent = cpuLives;
      if (cpuLives <= 0) { endGame(true); return; }
      cpuSnake = makeSnake(HALF + SEG * 3, H / 2, 3, -1);
      cpuDir = { dx: 0, dy: 1 };
      cpuNextDir = null;
    }
  };

  function stepSnake(snake, dir, minX, maxX) {
    const head = snake[0];
    let nx = head.x + dir.dx * SEG;
    let ny = head.y + dir.dy * SEG;
    // Clamp to half-arena bounds
    nx = Math.max(minX + SEG / 2, Math.min(maxX - SEG / 2, nx));
    ny = Math.max(SEG / 2, Math.min(H - SEG / 2, ny));
    // Move: shift tail, add new head
    snake.pop();
    snake.unshift({ x: nx, y: ny });
  }

  function selfCollide(snake) {
    const head = snake[0];
    for (let i = 2; i < snake.length; i++) {
      const d = Math.abs(head.x - snake[i].x) + Math.abs(head.y - snake[i].y);
      if (d < SEG * 0.8) return true;
    }
    return false;
  }

  function checkBallSnakeHead(head, b, isPlayer) {
    const dx = b.x - head.x;
    const dy = b.y - head.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < SEG / 2 + BALL_R) {
      // Deflect ball
      if (isPlayer) {
        b.vx = Math.abs(b.vx) + 0.1; // send right
        b.vy = (dy / dist) * Math.abs(b.vx) * 0.8;
        b.x = head.x + (SEG / 2 + BALL_R) + 1;
        // Grow snake on return
        const tail = playerSnake[playerSnake.length - 1];
        playerSnake.push({ x: tail.x, y: tail.y });
      } else {
        b.vx = -(Math.abs(b.vx) + 0.1); // send left
        b.vy = (dy / dist) * Math.abs(b.vx) * 0.8;
        b.x = head.x - (SEG / 2 + BALL_R) - 1;
        // Grow CPU snake on return
        const tail = cpuSnake[cpuSnake.length - 1];
        cpuSnake.push({ x: tail.x, y: tail.y });
      }
      // Clamp speed
      const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > BALL_SPEED * 2.5) {
        b.vx = (b.vx / spd) * BALL_SPEED * 2.5;
        b.vy = (b.vy / spd) * BALL_SPEED * 2.5;
      }
    }
  }

  function endGame(playerWon) {
    const msg = playerWon ? 'YOU WIN!' : 'CPU WINS';
    game.showOverlay(msg, `${playerScore} - ${cpuScore}  •  Press SPACE to play again`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    const COLOR = '#5af';

    // Center divider
    renderer.dashedLine(HALF, 0, HALF, H, '#0f3060', 2, 8, 8);

    // Score background (dim)
    text.drawText(String(playerScore), W / 4, 20, 80, '#162040', 'center');
    text.drawText(String(cpuScore), 3 * W / 4, 20, 80, '#162040', 'center');

    // Draw player snake
    renderer.setGlow(COLOR, 0.5);
    for (let i = 0; i < playerSnake.length; i++) {
      const s = playerSnake[i];
      const alpha = i === 0 ? 1 : 0.6 - i * 0.02;
      const bright = i === 0 ? '#adf' : COLOR;
      renderer.fillRect(s.x - SEG / 2, s.y - SEG / 2, SEG - 1, SEG - 1, bright);
    }

    // Draw CPU snake
    for (let i = 0; i < cpuSnake.length; i++) {
      const s = cpuSnake[i];
      const bright = i === 0 ? '#adf' : COLOR;
      renderer.fillRect(s.x - SEG / 2, s.y - SEG / 2, SEG - 1, SEG - 1, bright);
    }

    // Ball
    renderer.setGlow('#fff', 0.8);
    renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
