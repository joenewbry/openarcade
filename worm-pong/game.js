// worm-pong/game.js — Worm Pong (Snake × Pong) Full Arena Edition

import { Game } from '../engine/core.js';

const W = 480;
const H = 400;
const CELL = 16;
const COLS = W / CELL;   // 30
const ROWS = H / CELL;   // 25
const TICK = 5;           // frames per snake step

const BALL_R = 7;
const BALL_SPEED = 4.5;
const WIN_SCORE = 7;
const MAX_FOOD = 3;
const FOOD_INTERVAL = 160;
const FOOD_TTL = 420;

// DOM refs
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl    = document.getElementById('cpuScore');
const playerLivesEl = document.getElementById('playerLives');
const cpuLivesEl    = document.getElementById('cpuLives');

let playerScore, cpuScore, playerLives, cpuLives;
let ball;
let playerSnake, cpuSnake;
let playerDir, cpuDir;
let playerNextDir, cpuNextDir;
let tick, foodTimer;
let foods;  // [{ gx, gy, ttl }]

function makeSnake(gx, gy, len, dx) {
  const segs = [];
  for (let i = 0; i < len; i++) segs.push({ x: gx - dx * i, y: gy });
  return segs;
}

function growSnake(snake) {
  const tail = snake[snake.length - 1];
  snake.push({ x: tail.x, y: tail.y });
}

function resetBall() {
  const angle = (Math.random() - 0.5) * Math.PI * 0.8 + (Math.random() > 0.5 ? 0 : Math.PI);
  ball = {
    x: W / 2,
    y: H / 2,
    vx: Math.cos(angle) * BALL_SPEED,
    vy: Math.sin(angle) * BALL_SPEED,
  };
}

function spawnFood() {
  if (foods.length >= MAX_FOOD) return;
  const occupied = new Set();
  for (const s of playerSnake) occupied.add(`${s.x},${s.y}`);
  for (const s of cpuSnake)    occupied.add(`${s.x},${s.y}`);
  for (const f of foods)        occupied.add(`${f.gx},${f.gy}`);
  let attempts = 0;
  while (attempts < 40) {
    const gx = 1 + Math.floor(Math.random() * (COLS - 2));
    const gy = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (!occupied.has(`${gx},${gy}`)) {
      foods.push({ gx, gy, ttl: FOOD_TTL });
      return;
    }
    attempts++;
  }
}

function stepSnake(snake, dir) {
  const head = snake[0];
  const nx = (head.x + dir.dx + COLS) % COLS;
  const ny = (head.y + dir.dy + ROWS) % ROWS;
  snake.unshift({ x: nx, y: ny });
  snake.pop();
}

function selfCollide(snake) {
  const head = snake[0];
  for (let i = 2; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  return false;
}

function ballHitsSnakeHead(snake) {
  const cx = snake[0].x * CELL + CELL / 2;
  const cy = snake[0].y * CELL + CELL / 2;
  return Math.sqrt((ball.x - cx) ** 2 + (ball.y - cy) ** 2) < BALL_R + CELL / 2;
}

function ballHitsSnakeBody(snake) {
  for (let i = 1; i < snake.length; i++) {
    const cx = snake[i].x * CELL + CELL / 2;
    const cy = snake[i].y * CELL + CELL / 2;
    if (Math.sqrt((ball.x - cx) ** 2 + (ball.y - cy) ** 2) < BALL_R + CELL / 2 - 2) {
      return i;
    }
  }
  return -1;
}

function deflectBallFromHead(snake) {
  const cx = snake[0].x * CELL + CELL / 2;
  const cy = snake[0].y * CELL + CELL / 2;
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd  = Math.min(Math.sqrt(ball.vx ** 2 + ball.vy ** 2) + 0.2, BALL_SPEED * 2.2);
  ball.vx = (dx / dist) * spd;
  ball.vy = (dy / dist) * spd;
  const overlap = BALL_R + CELL / 2 - dist;
  ball.x += (dx / dist) * (overlap + 1);
  ball.y += (dy / dist) * (overlap + 1);
}

function cpuTick() {
  const head = cpuSnake[0];
  let target = null;

  // Seek nearest food if snake is short
  if (foods.length > 0 && cpuSnake.length < 12) {
    let best = Infinity;
    for (const f of foods) {
      const d = Math.abs(f.gx - head.x) + Math.abs(f.gy - head.y);
      if (d < best) { best = d; target = { x: f.gx, y: f.gy }; }
    }
  }
  // Otherwise aim for ball
  if (!target) {
    target = { x: Math.floor(ball.x / CELL), y: Math.floor(ball.y / CELL) };
  }

  const dx = target.x - head.x;
  const dy = target.y - head.y;

  const moves = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx !== 0) moves.push({ dx: Math.sign(dx), dy: 0 });
    if (dy !== 0) moves.push({ dx: 0, dy: Math.sign(dy) });
  } else {
    if (dy !== 0) moves.push({ dx: 0, dy: Math.sign(dy) });
    if (dx !== 0) moves.push({ dx: Math.sign(dx), dy: 0 });
  }
  moves.push(cpuDir);

  for (const m of moves) {
    if (m.dx === -cpuDir.dx && m.dy === -cpuDir.dy) continue;
    const nx = (head.x + m.dx + COLS) % COLS;
    const ny = (head.y + m.dy + ROWS) % ROWS;
    if (!cpuSnake.slice(1).some(s => s.x === nx && s.y === ny)) {
      cpuNextDir = m;
      break;
    }
  }
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
    tick = 0; foodTimer = 0;
    foods = [];
    playerSnake = makeSnake(5, 20, 3, -1);
    cpuSnake    = makeSnake(24, 5, 3, 1);
    playerDir = { dx: 1, dy: 0 };
    cpuDir    = { dx: -1, dy: 0 };
    playerNextDir = null;
    cpuNextDir = null;
    resetBall();
    game.showOverlay('WORM PONG', 'Arrow keys to move  \u2022  Hit ball with head to score  \u2022  Green pellets grow your snake');
    game.setState('waiting');
  };

  game.setScoreFn(() => playerScore);

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
      if (input.wasPressed(' ')) game.onInit();
      return;
    }

    // ── Input ──
    if (input.wasPressed('ArrowUp')    && playerDir.dy === 0) playerNextDir = { dx: 0, dy: -1 };
    if (input.wasPressed('ArrowDown')  && playerDir.dy === 0) playerNextDir = { dx: 0, dy:  1 };
    if (input.wasPressed('ArrowLeft')  && playerDir.dx === 0) playerNextDir = { dx: -1, dy: 0 };
    if (input.wasPressed('ArrowRight') && playerDir.dx === 0) playerNextDir = { dx:  1, dy: 0 };

    // ── Food spawning + TTL ──
    foodTimer++;
    if (foodTimer >= FOOD_INTERVAL) { foodTimer = 0; spawnFood(); }
    for (let i = foods.length - 1; i >= 0; i--) {
      if (--foods[i].ttl <= 0) foods.splice(i, 1);
    }

    // ── Ball physics (every frame) ──
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - BALL_R <= 0)  { ball.x = BALL_R;     ball.vx =  Math.abs(ball.vx); }
    if (ball.x + BALL_R >= W)  { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - BALL_R <= 0)  { ball.y = BALL_R;     ball.vy =  Math.abs(ball.vy); }
    if (ball.y + BALL_R >= H)  { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

    // ── Ball vs heads ──
    if (ballHitsSnakeHead(playerSnake)) {
      deflectBallFromHead(playerSnake);
      playerScore++;
      playerScoreEl.textContent = playerScore;
      growSnake(playerSnake);
      if (playerScore >= WIN_SCORE) { endGame(true); return; }
    } else if (ballHitsSnakeHead(cpuSnake)) {
      deflectBallFromHead(cpuSnake);
      cpuScore++;
      cpuScoreEl.textContent = cpuScore;
      growSnake(cpuSnake);
      if (cpuScore >= WIN_SCORE) { endGame(false); return; }
    }

    // ── Ball vs body — removes hit segment ──
    const pBodyHit = ballHitsSnakeBody(playerSnake);
    if (pBodyHit !== -1 && playerSnake.length > 1) {
      playerSnake.splice(pBodyHit, 1);
      ball.vx *= -1;
    }
    const cBodyHit = ballHitsSnakeBody(cpuSnake);
    if (cBodyHit !== -1 && cpuSnake.length > 1) {
      cpuSnake.splice(cBodyHit, 1);
      ball.vy *= -1;
    }

    // ── Snake step ──
    tick++;
    if (tick < TICK) return;
    tick = 0;

    if (playerNextDir) { playerDir = playerNextDir; playerNextDir = null; }
    cpuTick();
    if (cpuNextDir) { cpuDir = cpuNextDir; cpuNextDir = null; }

    stepSnake(playerSnake, playerDir);
    stepSnake(cpuSnake, cpuDir);

    // ── Eat food ──
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (playerSnake[0].x === f.gx && playerSnake[0].y === f.gy) {
        growSnake(playerSnake); growSnake(playerSnake);
        foods.splice(i, 1);
      } else if (cpuSnake[0].x === f.gx && cpuSnake[0].y === f.gy) {
        growSnake(cpuSnake); growSnake(cpuSnake);
        foods.splice(i, 1);
      }
    }

    // ── Self-collision ──
    if (selfCollide(playerSnake)) {
      playerLives--;
      playerLivesEl.textContent = playerLives;
      if (playerLives <= 0) { endGame(false); return; }
      playerSnake = makeSnake(5, 20, 3, -1);
      playerDir = { dx: 1, dy: 0 };
      playerNextDir = null;
    }
    if (selfCollide(cpuSnake)) {
      cpuLives--;
      cpuLivesEl.textContent = cpuLives;
      if (cpuLives <= 0) { endGame(true); return; }
      cpuSnake = makeSnake(24, 5, 3, 1);
      cpuDir = { dx: -1, dy: 0 };
      cpuNextDir = null;
    }
  };

  function endGame(playerWon) {
    game.showOverlay(playerWon ? 'YOU WIN!' : 'CPU WINS',
      `${playerScore} - ${cpuScore}  \u2022  Press SPACE to play again`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    const COLOR = '#5af';

    // Dim score watermarks
    text.drawText(String(playerScore), W / 4, 20, 80, '#0a1525', 'center');
    text.drawText(String(cpuScore), 3 * W / 4, 20, 80, '#0a1525', 'center');

    // Food pellets
    for (const f of foods) {
      const pulse = 0.5 + 0.5 * Math.sin(f.ttl * 0.05);
      const px = f.gx * CELL + CELL / 2;
      const py = f.gy * CELL + CELL / 2;
      renderer.setGlow('#0f8', pulse * 0.9);
      renderer.fillCircle(px, py, CELL / 2 - 1, '#0f8');
    }

    // Player snake (blue)
    for (let i = 0; i < playerSnake.length; i++) {
      const s = playerSnake[i];
      renderer.setGlow(COLOR, i === 0 ? 0.7 : 0.25);
      renderer.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2,
        i === 0 ? '#adf' : COLOR);
    }

    // CPU snake (orange)
    for (let i = 0; i < cpuSnake.length; i++) {
      const s = cpuSnake[i];
      renderer.setGlow('#f84', i === 0 ? 0.7 : 0.25);
      renderer.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2,
        i === 0 ? '#fda' : '#f84');
    }

    // Ball
    renderer.setGlow('#fff', 0.9);
    renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
