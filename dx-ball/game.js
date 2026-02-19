// dx-ball/game.js — DX-Ball game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 540;
const H = 560;

// ---------- CONSTANTS ----------
const PADDLE_BASE_W = 80;
const PADDLE_MIN_W = 40;
const PADDLE_MAX_W = 160;
const PADDLE_H = 12;
const PADDLE_Y = H - 36;
const PADDLE_KEY_SPEED = 7;

const BALL_R = 5;
const BASE_BALL_SPEED = 4.0;
const MAX_BALL_SPEED = 8.0;

const BRICK_COLS = 12;
const BRICK_W = (W - 20) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_TOP = 50;
const BRICK_PAD = 2;

const POWERUP_W = 28;
const POWERUP_H = 14;
const POWERUP_SPEED = 2.5;
const POWERUP_DROP_CHANCE = 0.22;

// Brick types
const BRICK_NORMAL = 1;
const BRICK_DOUBLE = 2;
const BRICK_TRIPLE = 3;
const BRICK_EXPLOSIVE = 4;

// Power-up types
const PU_EXPAND = 'expand';
const PU_SHRINK = 'shrink';
const PU_MULTI = 'multi';
const PU_FIREBALL = 'fireball';
const PU_CATCH = 'catch';
const PU_EXTRA_LIFE = 'life';
const PU_SPEED_UP = 'speedup';

const GOOD_POWERUPS = [PU_EXPAND, PU_MULTI, PU_FIREBALL, PU_CATCH, PU_EXTRA_LIFE];
const BAD_POWERUPS = [PU_SHRINK, PU_SPEED_UP];

const POWERUP_LABELS = {
  [PU_EXPAND]: 'WIDE',
  [PU_SHRINK]: 'THIN',
  [PU_MULTI]: 'x3',
  [PU_FIREBALL]: 'FIRE',
  [PU_CATCH]: 'GRAB',
  [PU_EXTRA_LIFE]: '+1',
  [PU_SPEED_UP]: 'FAST',
};

// Neon row palette for visual variety
const ROW_HUES = ['#f44', '#fa6', '#ff4', '#4f4', '#4cf', '#48f', '#a4f', '#f4a', '#fa6', '#4f4'];

// ---------- STATE ----------
let score = 0;
let best = 0;
let lives, level;
let paddleX, paddleW;
let balls, bricks, powerups;
let mouseX = W / 2;
let useMouseControl = false;
let fireball = false;
let fireballTimer = 0;
let catching = false;
let catchTimer = 0;
let caughtBall = null;
let combo = 0;
let comboMultiplier = 1;
let particles = [];
let shakeTimer = 0;
let levelTransition = 0;
let brickRows = 6;

// DOM refs
let scoreEl, livesEl, levelEl, bestEl;

// ---------- LEVEL PATTERNS ----------
function generateLevel(lvl) {
  bricks = [];
  const rows = Math.min(6 + Math.floor(lvl / 2), 10);
  brickRows = rows;
  const pattern = (lvl - 1) % 8;

  for (let r = 0; r < rows; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      let type = BRICK_NORMAL;
      let alive = true;

      switch (pattern) {
        case 0: // Full grid, some doubles
          type = (r + c) % 5 === 0 ? BRICK_DOUBLE : BRICK_NORMAL;
          break;
        case 1: // Checkerboard
          alive = (r + c) % 2 === 0;
          type = r < 2 ? BRICK_DOUBLE : BRICK_NORMAL;
          break;
        case 2: // Diamond
          {
            const centerC = BRICK_COLS / 2 - 0.5;
            const centerR = rows / 2 - 0.5;
            const dist = Math.abs(c - centerC) / (BRICK_COLS / 2) + Math.abs(r - centerR) / (rows / 2);
            alive = dist < 1.0;
            type = dist < 0.4 ? BRICK_TRIPLE : (dist < 0.7 ? BRICK_DOUBLE : BRICK_NORMAL);
          }
          break;
        case 3: // Stripes with explosives
          alive = c % 3 !== 2;
          type = r % 3 === 0 ? BRICK_EXPLOSIVE : (r % 3 === 1 ? BRICK_DOUBLE : BRICK_NORMAL);
          break;
        case 4: // Pyramid
          {
            const half = Math.floor(rows / 2);
            const rowWidth = r < half ? (r + 1) * 2 : (rows - r) * 2;
            const startC = Math.floor((BRICK_COLS - rowWidth) / 2);
            alive = c >= startC && c < startC + rowWidth;
            type = r < 2 ? BRICK_TRIPLE : (r < 4 ? BRICK_DOUBLE : BRICK_NORMAL);
          }
          break;
        case 5: // Fortress with explosive core
          {
            const isEdge = r === 0 || r === rows - 1 || c === 0 || c === BRICK_COLS - 1;
            const isInner = r >= 2 && r <= rows - 3 && c >= 3 && c <= BRICK_COLS - 4;
            type = isEdge ? BRICK_TRIPLE : (isInner ? BRICK_EXPLOSIVE : BRICK_DOUBLE);
          }
          break;
        case 6: // Zigzag
          {
            const offset = r % 2 === 0 ? 0 : 3;
            alive = (c + offset) % 6 < 4;
            type = c % 4 === 0 ? BRICK_EXPLOSIVE : (r < 3 ? BRICK_DOUBLE : BRICK_NORMAL);
          }
          break;
        case 7: // Invader shape
          {
            const invader = [
              [0,0,1,0,0,0,0,0,0,1,0,0],
              [0,0,0,1,0,0,0,0,1,0,0,0],
              [0,0,1,1,1,1,1,1,1,1,0,0],
              [0,1,1,0,1,1,1,1,0,1,1,0],
              [1,1,1,1,1,1,1,1,1,1,1,1],
              [1,0,1,1,1,1,1,1,1,1,0,1],
              [1,0,1,0,0,0,0,0,0,1,0,1],
              [0,0,0,1,1,0,0,1,1,0,0,0],
            ];
            alive = r < invader.length && invader[r] && invader[r][c] === 1;
            type = r < 3 ? BRICK_DOUBLE : (r === 4 ? BRICK_TRIPLE : BRICK_NORMAL);
          }
          break;
      }

      // Scale difficulty with level
      if (lvl > 3 && type === BRICK_NORMAL && Math.random() < 0.1 * Math.min(lvl, 8)) {
        type = BRICK_DOUBLE;
      }
      if (lvl > 5 && type === BRICK_DOUBLE && Math.random() < 0.08) {
        type = BRICK_EXPLOSIVE;
      }

      bricks[r][c] = { alive, type, hits: alive ? type : 0 };
    }
  }
}

function brickColor(brick, row) {
  if (brick.type === BRICK_EXPLOSIVE) return '#f44';
  if (brick.hits === 3) return '#f4a';
  if (brick.hits === 2) return '#4cf';
  return ROW_HUES[row % ROW_HUES.length];
}

// ---------- BALL ----------
function resetBall() {
  balls = [];
  caughtBall = null;
  const speed = Math.min(BASE_BALL_SPEED + (level - 1) * 0.3, MAX_BALL_SPEED);
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  balls.push({
    x: W / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    fireball: fireball,
  });
}

// ---------- PARTICLES ----------
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnExplosion(x, y) {
  spawnParticles(x, y, '#f44', 20);
  spawnParticles(x, y, '#fa6', 15);
  spawnParticles(x, y, '#ff4', 10);
  shakeTimer = 8;
}

// ---------- POWERUP LOGIC ----------
function dropPowerup(x, y) {
  if (Math.random() > POWERUP_DROP_CHANCE) return;
  const isGood = Math.random() < 0.65;
  const pool = isGood ? GOOD_POWERUPS : BAD_POWERUPS;
  const type = pool[Math.floor(Math.random() * pool.length)];
  powerups.push({ x: x - POWERUP_W / 2, y, type, isGood });
}

function applyPowerup(pu) {
  switch (pu.type) {
    case PU_EXPAND:
      paddleW = Math.min(paddleW + 30, PADDLE_MAX_W);
      paddleX = Math.max(0, Math.min(W - paddleW, paddleX));
      break;
    case PU_SHRINK:
      paddleW = Math.max(paddleW - 20, PADDLE_MIN_W);
      break;
    case PU_MULTI:
      {
        const newBalls = [];
        balls.forEach(b => {
          for (let i = 0; i < 2; i++) {
            const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? -0.4 : 0.4);
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            newBalls.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              fireball: b.fireball,
            });
          }
        });
        balls = balls.concat(newBalls);
        if (balls.length > 12) balls = balls.slice(0, 12);
      }
      break;
    case PU_FIREBALL:
      fireball = true;
      fireballTimer = 600;
      balls.forEach(b => b.fireball = true);
      break;
    case PU_CATCH:
      catching = true;
      catchTimer = 480;
      break;
    case PU_EXTRA_LIFE:
      lives++;
      livesEl.textContent = lives;
      break;
    case PU_SPEED_UP:
      balls.forEach(b => {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const newSpeed = Math.min(speed * 1.4, MAX_BALL_SPEED);
        const ratio = newSpeed / speed;
        b.vx *= ratio;
        b.vy *= ratio;
      });
      break;
  }
}

// ---------- BRICK COLLISION ----------
function destroyBrick(r, c, fromExplosion) {
  if (r < 0 || r >= bricks.length || c < 0 || c >= BRICK_COLS) return;
  const brick = bricks[r][c];
  if (!brick.alive) return;

  brick.hits--;
  if (brick.hits <= 0) {
    brick.alive = false;
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;

    const basePoints = brick.type === BRICK_EXPLOSIVE ? 50 : (brick.type * 10 + 5);
    score += Math.floor(basePoints * comboMultiplier);
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    spawnParticles(bx, by, brickColor(brick, r), 8);
    dropPowerup(bx, by);

    if (brick.type === BRICK_EXPLOSIVE && !fromExplosion) {
      spawnExplosion(bx, by);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          destroyBrick(r + dr, c + dc, true);
        }
      }
    }
  } else {
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    spawnParticles(bx, by, '#fff', 3);
  }
}

// ---------- RELEASE CAUGHT BALL ----------
function releaseCaughtBall() {
  if (!caughtBall) return;
  const speed = Math.min(BASE_BALL_SPEED + (level - 1) * 0.3, MAX_BALL_SPEED);
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  caughtBall.vx = Math.cos(angle) * speed;
  caughtBall.vy = Math.sin(angle) * speed;
  caughtBall = null;
}

// ---------- CREATE GAME ----------
export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  scoreEl = document.getElementById('score');
  livesEl = document.getElementById('lives');
  levelEl = document.getElementById('level');
  bestEl = document.getElementById('best');

  // Mouse control — raw canvas listener (same pattern as air-hockey)
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    useMouseControl = true;
  });

  canvas.addEventListener('click', () => {
    if (game.state === 'waiting') {
      game.setState('playing');
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing' && caughtBall) {
      releaseCaughtBall();
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- onInit ----------
  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    paddleW = PADDLE_BASE_W;
    paddleX = W / 2 - paddleW / 2;
    balls = [];
    powerups = [];
    particles = [];
    fireball = false;
    fireballTimer = 0;
    catching = false;
    catchTimer = 0;
    caughtBall = null;
    combo = 0;
    comboMultiplier = 1;
    shakeTimer = 0;
    levelTransition = 0;

    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';

    generateLevel(1);
    resetBall();

    game.showOverlay('DX-BALL', 'Press SPACE or click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ---------- onUpdate ----------
  game.onUpdate = () => {
    const input = game.input;

    // State transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
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

    // ---------- PLAYING ----------

    // Level transition animation
    if (levelTransition > 0) {
      levelTransition--;
      if (levelTransition === 0) {
        generateLevel(level);
        resetBall();
        fireball = false;
        fireballTimer = 0;
        catching = false;
        catchTimer = 0;
        caughtBall = null;
        paddleW = PADDLE_BASE_W;
        paddleX = Math.max(0, Math.min(W - paddleW, paddleX));
      }
      return;
    }

    // Screen shake decay
    if (shakeTimer > 0) shakeTimer--;

    // Powerup timers
    if (fireballTimer > 0) {
      fireballTimer--;
      if (fireballTimer <= 0) {
        fireball = false;
        balls.forEach(b => b.fireball = false);
      }
    }
    if (catchTimer > 0) {
      catchTimer--;
      if (catchTimer <= 0) {
        catching = false;
        if (caughtBall) {
          caughtBall = null;
        }
      }
    }

    // Release caught ball with space
    if (input.wasPressed(' ') && caughtBall) {
      releaseCaughtBall();
    }

    // Move paddle (keyboard)
    if (input.isDown('ArrowLeft') || input.isDown('a') || input.isDown('A')) {
      paddleX -= PADDLE_KEY_SPEED;
      useMouseControl = false;
    }
    if (input.isDown('ArrowRight') || input.isDown('d') || input.isDown('D')) {
      paddleX += PADDLE_KEY_SPEED;
      useMouseControl = false;
    }

    // Mouse control
    if (useMouseControl) {
      paddleX = mouseX - paddleW / 2;
    }

    paddleX = Math.max(0, Math.min(W - paddleW, paddleX));

    // Move caught ball with paddle
    if (caughtBall) {
      caughtBall.x = paddleX + paddleW / 2;
      caughtBall.y = PADDLE_Y - BALL_R - 1;
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      powerups[i].y += POWERUP_SPEED;
      const pu = powerups[i];

      if (pu.y + POWERUP_H >= PADDLE_Y && pu.y <= PADDLE_Y + PADDLE_H &&
          pu.x + POWERUP_W >= paddleX && pu.x <= paddleX + paddleW) {
        applyPowerup(pu);
        spawnParticles(pu.x + POWERUP_W / 2, pu.y, pu.isGood ? '#4f4' : '#f44', 6);
        powerups.splice(i, 1);
        continue;
      }

      if (pu.y > H) {
        powerups.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update balls
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];
      if (ball === caughtBall) continue;

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x - BALL_R <= 0) {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + BALL_R >= W) {
        ball.x = W - BALL_R;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - BALL_R <= 0) {
        ball.y = BALL_R;
        ball.vy = Math.abs(ball.vy);
      }

      // Paddle collision
      if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 6 &&
          ball.x >= paddleX - 2 && ball.x <= paddleX + paddleW + 2) {

        combo = 0;
        comboMultiplier = 1;

        if (catching && !caughtBall) {
          caughtBall = ball;
          ball.x = paddleX + paddleW / 2;
          ball.y = PADDLE_Y - BALL_R - 1;
          ball.vx = 0;
          ball.vy = 0;
          continue;
        }

        ball.y = PADDLE_Y - BALL_R;
        const hit = (ball.x - paddleX) / paddleW;
        const angle = -Math.PI * (0.15 + 0.7 * (1 - hit));
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        continue;
      }

      // Ball falls below
      if (ball.y - BALL_R > H) {
        balls.splice(bi, 1);
        if (ball === caughtBall) caughtBall = null;

        if (balls.length === 0) {
          lives--;
          livesEl.textContent = lives;
          combo = 0;
          comboMultiplier = 1;
          fireball = false;
          fireballTimer = 0;
          catching = false;
          catchTimer = 0;
          caughtBall = null;
          paddleW = PADDLE_BASE_W;

          if (lives <= 0) {
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
            game.setState('over');
            return;
          }
          resetBall();
        }
        continue;
      }

      // Brick collisions
      for (let r = 0; r < bricks.length; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (!bricks[r][c].alive) continue;

          const bx = 10 + c * BRICK_W + BRICK_PAD;
          const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
          const bw = BRICK_W - BRICK_PAD * 2;
          const bh = BRICK_H - BRICK_PAD * 2;

          if (ball.x + BALL_R > bx && ball.x - BALL_R < bx + bw &&
              ball.y + BALL_R > by && ball.y - BALL_R < by + bh) {

            combo++;
            comboMultiplier = 1 + Math.floor(combo / 3) * 0.5;

            destroyBrick(r, c, false);

            if (!ball.fireball) {
              const overlapLeft = (ball.x + BALL_R) - bx;
              const overlapRight = (bx + bw) - (ball.x - BALL_R);
              const overlapTop = (ball.y + BALL_R) - by;
              const overlapBottom = (by + bh) - (ball.y - BALL_R);
              const minX = Math.min(overlapLeft, overlapRight);
              const minY = Math.min(overlapTop, overlapBottom);

              if (minX < minY) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }
            }

            if (!ball.fireball) break;
          }
        }
      }

      // Prevent ball from going too horizontal
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (Math.abs(ball.vy) < speed * 0.15 && speed > 0) {
        ball.vy = (ball.vy >= 0 ? 1 : -1) * speed * 0.15;
        const newHSpeed = Math.sqrt(speed * speed - ball.vy * ball.vy);
        ball.vx = (ball.vx >= 0 ? 1 : -1) * newHSpeed;
      }
    }

    // Check level clear
    let allClear = true;
    for (let r = 0; r < bricks.length; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (bricks[r][c].alive) { allClear = false; break; }
      }
      if (!allClear) break;
    }
    if (allClear) {
      level++;
      levelEl.textContent = level;
      levelTransition = 60;
      powerups = [];
      combo = 0;
      comboMultiplier = 1;
    }
  };

  // ---------- onDraw ----------
  game.onDraw = (renderer, text) => {
    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (shakeTimer > 0) {
      const intensity = shakeTimer * 0.8;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    // Subtle grid lines
    for (let x = 0; x < W; x += 30) {
      renderer.drawLine(x + shakeX, shakeY, x + shakeX, H + shakeY, '#16213e', 0.5);
    }
    for (let y = 0; y < H; y += 30) {
      renderer.drawLine(shakeX, y + shakeY, W + shakeX, y + shakeY, '#16213e', 0.5);
    }

    // Level transition text
    if (levelTransition > 0) {
      renderer.setGlow('#fa6', 0.8);
      text.drawText(`LEVEL ${level}`, W / 2 + shakeX, H / 2 - 24 + shakeY, 28, '#fa6', 'center');
      renderer.setGlow(null);
      text.drawText('Get ready!', W / 2 + shakeX, H / 2 + 10 + shakeY, 16, '#aaa', 'center');
      return;
    }

    // Bricks
    for (let r = 0; r < bricks.length; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const brick = bricks[r][c];
        if (!brick.alive) continue;

        const bx = 10 + c * BRICK_W + BRICK_PAD + shakeX;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD + shakeY;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;
        const color = brickColor(brick, r);

        renderer.setGlow(color, 0.4);
        renderer.fillRect(bx, by, bw, bh, color);
        renderer.setGlow(null);

        // Brick type indicators
        if (brick.type === BRICK_EXPLOSIVE) {
          text.drawText('*', bx + bw / 2, by + 1, 10, '#ff4', 'center');
        } else if (brick.hits > 1) {
          text.drawText(String(brick.hits), bx + bw / 2, by + 1, 10, '#1a1a2e', 'center');
        }
      }
    }

    // Powerups
    powerups.forEach(pu => {
      const color = pu.isGood ? '#4f4' : '#f44';
      const bgColor = pu.isGood ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)';

      renderer.setGlow(color, 0.5);
      renderer.fillRect(pu.x + shakeX, pu.y + shakeY, POWERUP_W, POWERUP_H, bgColor);
      // Border using lines
      const px = pu.x + shakeX, py = pu.y + shakeY;
      renderer.drawLine(px, py, px + POWERUP_W, py, color, 1.5);
      renderer.drawLine(px + POWERUP_W, py, px + POWERUP_W, py + POWERUP_H, color, 1.5);
      renderer.drawLine(px + POWERUP_W, py + POWERUP_H, px, py + POWERUP_H, color, 1.5);
      renderer.drawLine(px, py + POWERUP_H, px, py, color, 1.5);
      renderer.setGlow(null);

      text.drawText(POWERUP_LABELS[pu.type], pu.x + POWERUP_W / 2 + shakeX, pu.y + 1 + shakeY, 9, color, 'center');
    });

    // Paddle
    {
      const paddleColor = catching ? '#4cf' : (fireball ? '#f44' : '#fa6');
      renderer.setGlow(paddleColor, 0.7);
      renderer.fillRect(paddleX + shakeX, PADDLE_Y + shakeY, paddleW, PADDLE_H, paddleColor);
      renderer.setGlow(null);
    }

    // Balls
    balls.forEach(ball => {
      const ballColor = ball.fireball ? '#f44' : '#fff';
      const glowColor = ball.fireball ? '#f44' : '#fa6';
      renderer.setGlow(glowColor, ball.fireball ? 1.0 : 0.6);
      renderer.fillCircle(ball.x + shakeX, ball.y + shakeY, BALL_R, ballColor);
      renderer.setGlow(null);

      // Fireball trail
      if (ball.fireball && ball !== caughtBall) {
        renderer.fillCircle(
          ball.x - ball.vx * 0.5 + shakeX,
          ball.y - ball.vy * 0.5 + shakeY,
          BALL_R * 0.8,
          'rgba(255, 68, 68, 0.3)'
        );
        renderer.fillCircle(
          ball.x - ball.vx + shakeX,
          ball.y - ball.vy + shakeY,
          BALL_R * 0.6,
          'rgba(255, 68, 68, 0.15)'
        );
      }
    });

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      // Expand #rgb to #rrggbb before appending alpha
      let base = p.color;
      if (base.length === 4) {
        base = `#${base[1]}${base[1]}${base[2]}${base[2]}${base[3]}${base[3]}`;
      }
      renderer.fillRect(
        p.x - p.size / 2 + shakeX,
        p.y - p.size / 2 + shakeY,
        p.size, p.size,
        base + hexAlpha
      );
    });

    // Combo display
    if (comboMultiplier > 1) {
      renderer.setGlow('#fa6', 0.5);
      text.drawText(`x${comboMultiplier.toFixed(1)}`, W - 10 + shakeX, H - 22 + shakeY, 16, '#fa6', 'right');
      renderer.setGlow(null);
    }

    // Lives indicator (dots at bottom)
    for (let i = 0; i < lives; i++) {
      renderer.setGlow('#fa6', 0.4);
      renderer.fillCircle(15 + i * 16 + shakeX, H - 12 + shakeY, 4, '#fa6');
      renderer.setGlow(null);
    }

    // Active powerup timer bars
    let timerY = H - 28;
    if (fireball && fireballTimer > 0) {
      const pct = fireballTimer / 600;
      renderer.fillRect(10 + shakeX, timerY + shakeY, 80 * pct, 6, 'rgba(255, 68, 68, 0.3)');
      renderer.drawLine(10 + shakeX, timerY + shakeY, 90 + shakeX, timerY + shakeY, '#f44', 1);
      renderer.drawLine(90 + shakeX, timerY + shakeY, 90 + shakeX, timerY + 6 + shakeY, '#f44', 1);
      renderer.drawLine(90 + shakeX, timerY + 6 + shakeY, 10 + shakeX, timerY + 6 + shakeY, '#f44', 1);
      renderer.drawLine(10 + shakeX, timerY + 6 + shakeY, 10 + shakeX, timerY + shakeY, '#f44', 1);
      text.drawText('FIRE', 95 + shakeX, timerY - 2 + shakeY, 8, '#f44', 'left');
      timerY -= 12;
    }
    if (catching && catchTimer > 0) {
      const pct = catchTimer / 480;
      renderer.fillRect(10 + shakeX, timerY + shakeY, 80 * pct, 6, 'rgba(68, 204, 255, 0.3)');
      renderer.drawLine(10 + shakeX, timerY + shakeY, 90 + shakeX, timerY + shakeY, '#4cf', 1);
      renderer.drawLine(90 + shakeX, timerY + shakeY, 90 + shakeX, timerY + 6 + shakeY, '#4cf', 1);
      renderer.drawLine(90 + shakeX, timerY + 6 + shakeY, 10 + shakeX, timerY + 6 + shakeY, '#4cf', 1);
      renderer.drawLine(10 + shakeX, timerY + 6 + shakeY, 10 + shakeX, timerY + shakeY, '#4cf', 1);
      text.drawText('GRAB', 95 + shakeX, timerY - 2 + shakeY, 8, '#4cf', 'left');
    }
  };

  game.start();
  return game;
}
