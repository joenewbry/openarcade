// arkanoid/game.js — Arkanoid game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 600;

// --- Constants ---
const PADDLE_BASE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 7;
const BALL_R = 5;
const BASE_BALL_SPEED = 4.5;
const BRICK_COLS = 12;
const BRICK_ROWS = 10;
const BRICK_W = (W - 20) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_TOP = 60;
const BRICK_PAD = 2;
const POWERUP_W = 24;
const POWERUP_H = 14;
const POWERUP_SPEED = 2.5;
const LASER_W = 3;
const LASER_H = 14;
const LASER_SPEED = 8;

// Brick types
const BRICK_NORMAL = 1;
const BRICK_TOUGH = 2;
const BRICK_METAL = 3;

// Power-up types
const PU_EXPAND = 'E';
const PU_LASER = 'L';
const PU_MULTI = 'M';
const PU_SLOW = 'S';
const PU_LIFE = '1';

const PU_COLORS = {
  [PU_EXPAND]: '#4fb',
  [PU_LASER]: '#f44',
  [PU_MULTI]: '#88f',
  [PU_SLOW]: '#ff0',
  [PU_LIFE]: '#f0f'
};

const PU_LABELS = {
  [PU_EXPAND]: 'E',
  [PU_LASER]: 'L',
  [PU_MULTI]: 'M',
  [PU_SLOW]: 'S',
  [PU_LIFE]: '+'
};

const PU_TYPES = [PU_EXPAND, PU_LASER, PU_MULTI, PU_SLOW, PU_LIFE];

// Row colors for normal bricks
const ROW_COLORS = ['#f44', '#f80', '#fa0', '#ff0', '#8f0', '#0f0', '#0f8', '#0ff', '#08f', '#88f'];

// --- Game state ---
let score, best, lives, level;
let paddleX, paddleW;
let balls;       // Array of {x, y, vx, vy}
let bricks;      // 2D array of {type, hits, alive}
let powerups;    // Array of {x, y, type}
let lasers;      // Array of {x, y}
let hasLaser, laserTimer, expandTimer, slowTimer;
let comboCount, lastHitFrame;
let particles;
let frameCount;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

// --- Level layouts ---
function generateLevel(lvl) {
  const layout = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    layout[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      layout[r][c] = 0;
    }
  }

  switch ((lvl - 1) % 8) {
    case 0: // Full grid, simple
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = BRICK_NORMAL;
        }
      }
      break;

    case 1: // Checkerboard with tough bricks
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if ((r + c) % 2 === 0) {
            layout[r][c] = r < 2 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      break;

    case 2: // Diamond with metal border
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const cx = BRICK_COLS / 2 - 0.5;
          const cy = 4;
          const dist = Math.abs(c - cx) + Math.abs(r - cy);
          if (dist <= 5) {
            if (dist === 5) layout[r][c] = BRICK_METAL;
            else if (dist <= 2) layout[r][c] = BRICK_TOUGH;
            else layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 3: // Stripes with tough rows
      for (let r = 0; r < 8; r++) {
        if (r % 2 === 0) {
          for (let c = 0; c < BRICK_COLS; c++) {
            layout[r][c] = BRICK_NORMAL;
          }
        } else {
          for (let c = 1; c < BRICK_COLS - 1; c++) {
            layout[r][c] = BRICK_TOUGH;
          }
          layout[r][0] = BRICK_METAL;
          layout[r][BRICK_COLS - 1] = BRICK_METAL;
        }
      }
      break;

    case 4: // Inverted pyramid
      for (let r = 0; r < 7; r++) {
        const indent = r;
        for (let c = indent; c < BRICK_COLS - indent; c++) {
          if (c >= 0 && c < BRICK_COLS) {
            layout[r][c] = r === 0 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      // Metal corners
      layout[0][0] = BRICK_METAL;
      layout[0][BRICK_COLS - 1] = BRICK_METAL;
      break;

    case 5: // Cross pattern
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const midC = Math.floor(BRICK_COLS / 2);
          const midR = 4;
          if (c >= midC - 1 && c <= midC || r >= midR - 1 && r <= midR) {
            layout[r][c] = BRICK_NORMAL;
          }
          if (c >= midC - 1 && c <= midC && r >= midR - 1 && r <= midR) {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      // Metal at the tips
      layout[0][Math.floor(BRICK_COLS / 2) - 1] = BRICK_METAL;
      layout[0][Math.floor(BRICK_COLS / 2)] = BRICK_METAL;
      break;

    case 6: // Zigzag
      for (let r = 0; r < 8; r++) {
        const offset = (r % 2 === 0) ? 0 : 3;
        for (let c = 0; c < BRICK_COLS; c++) {
          if ((c + offset) % 6 < 4) {
            layout[r][c] = r < 3 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      break;

    case 7: // Fortress
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (r === 0 || r === 8 || c === 0 || c === BRICK_COLS - 1) {
            layout[r][c] = BRICK_METAL;
          } else if (r >= 2 && r <= 6 && c >= 2 && c <= BRICK_COLS - 3) {
            layout[r][c] = BRICK_NORMAL;
          } else if (r >= 1 && r <= 7 && c >= 1 && c <= BRICK_COLS - 2) {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      // Gate opening
      layout[8][5] = 0;
      layout[8][6] = 0;
      break;
  }

  // Add extra tough bricks for higher levels
  if (lvl > 8) {
    const extraTough = Math.min(lvl - 8, 10);
    for (let i = 0; i < extraTough; i++) {
      const r = Math.floor(Math.random() * BRICK_ROWS);
      const c = Math.floor(Math.random() * BRICK_COLS);
      if (layout[r][c] === BRICK_NORMAL) {
        layout[r][c] = BRICK_TOUGH;
      }
    }
  }

  return layout;
}

function initBricks(lvl) {
  const layout = generateLevel(lvl);
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      const type = layout[r][c];
      bricks[r][c] = {
        type: type,
        hits: type === BRICK_TOUGH ? 2 : (type === BRICK_METAL ? -1 : 1),
        alive: type > 0
      };
    }
  }
}

function getEffectiveBallSpeed() {
  let speed = BASE_BALL_SPEED + (level - 1) * 0.3;
  if (slowTimer > 0) speed *= 0.6;
  return speed;
}

function resetBall() {
  balls = [];
  const speed = getEffectiveBallSpeed();
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  balls.push({
    x: W / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color: color,
      size: 2 + Math.random() * 3
    });
  }
}

function maybeDropPowerup(x, y) {
  if (Math.random() < 0.20) {
    const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    powerups.push({ x: x, y: y, type: type });
  }
}

function activatePowerup(type) {
  switch (type) {
    case PU_EXPAND:
      paddleW = PADDLE_BASE_W * 1.6;
      expandTimer = 600; // ~10 seconds at 60fps
      break;

    case PU_LASER:
      hasLaser = true;
      laserTimer = 600;
      break;

    case PU_MULTI:
      if (balls.length > 0) {
        const newBalls = [];
        const sourceBall = balls[0];
        const speed = Math.sqrt(sourceBall.vx * sourceBall.vx + sourceBall.vy * sourceBall.vy);
        for (let i = 0; i < 2; i++) {
          const angleOffset = (i === 0 ? -0.5 : 0.5);
          const currentAngle = Math.atan2(sourceBall.vy, sourceBall.vx);
          const newAngle = currentAngle + angleOffset;
          newBalls.push({
            x: sourceBall.x,
            y: sourceBall.y,
            vx: Math.cos(newAngle) * speed,
            vy: Math.sin(newAngle) * speed
          });
        }
        balls.push(...newBalls);
      }
      break;

    case PU_SLOW:
      slowTimer = 480; // ~8 seconds
      balls.forEach(ball => {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const newSpeed = speed * 0.6;
        ball.vx = (ball.vx / speed) * newSpeed;
        ball.vy = (ball.vy / speed) * newSpeed;
      });
      break;

    case PU_LIFE:
      lives++;
      livesEl.textContent = lives;
      break;
  }
}

function getBrickColor(row, type) {
  if (type === BRICK_TOUGH) return '#fff';
  if (type === BRICK_METAL) return '#888';
  return ROW_COLORS[row % ROW_COLORS.length];
}

function hitBrick(r, c) {
  const brick = bricks[r][c];
  if (brick.type === BRICK_METAL) {
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    spawnParticles(bx, by, '#888', 4);
    return;
  }

  brick.hits--;
  if (brick.hits <= 0) {
    brick.alive = false;
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    const color = getBrickColor(r, brick.type);
    spawnParticles(bx, by, color, 10);
    maybeDropPowerup(bx, by);

    // Combo scoring — use frame counter instead of Date.now()
    if (frameCount - lastHitFrame < 30) { // ~500ms at 60fps
      comboCount++;
    } else {
      comboCount = 1;
    }
    lastHitFrame = frameCount;

    const basePoints = 10 + (BRICK_ROWS - r) * 5;
    const comboBonus = Math.min(comboCount, 10);
    score += basePoints * comboBonus;
  } else {
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    spawnParticles(bx, by, '#ff8', 4);
  }

  scoreEl.textContent = score;
  if (score > best) {
    best = score;
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    lives = 3;
    level = 1;
    paddleW = PADDLE_BASE_W;
    paddleX = W / 2 - paddleW / 2;
    balls = [];
    powerups = [];
    lasers = [];
    particles = [];
    hasLaser = false;
    laserTimer = 0;
    expandTimer = 0;
    slowTimer = 0;
    comboCount = 0;
    lastHitFrame = -999;
    frameCount = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    initBricks(1);
    resetBall();
    game.showOverlay('ARKANOID', 'Press SPACE or LEFT/RIGHT to start');
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

    // --- Playing state ---
    frameCount++;

    // Fire laser on space
    if (input.wasPressed(' ') && hasLaser) {
      lasers.push({ x: paddleX + 6, y: PADDLE_Y - 4 });
      lasers.push({ x: paddleX + paddleW - 6, y: PADDLE_Y - 4 });
    }

    // Decrement timers
    if (expandTimer > 0) {
      expandTimer--;
      if (expandTimer <= 0) {
        paddleW = PADDLE_BASE_W;
        paddleX = Math.min(paddleX, W - paddleW);
      }
    }
    if (laserTimer > 0) {
      laserTimer--;
      if (laserTimer <= 0) hasLaser = false;
    }
    if (slowTimer > 0) {
      slowTimer--;
      if (slowTimer <= 0) {
        balls.forEach(ball => {
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          const targetSpeed = getEffectiveBallSpeed();
          if (speed > 0) {
            ball.vx = (ball.vx / speed) * targetSpeed;
            ball.vy = (ball.vy / speed) * targetSpeed;
          }
        });
      }
    }

    // Move paddle
    if (input.isDown('ArrowLeft') || input.isDown('a')) paddleX -= PADDLE_SPEED;
    if (input.isDown('ArrowRight') || input.isDown('d')) paddleX += PADDLE_SPEED;
    paddleX = Math.max(0, Math.min(W - paddleW, paddleX));

    // Update balls
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];
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
      if (ball.vy > 0 &&
          ball.y + BALL_R >= PADDLE_Y &&
          ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 6 &&
          ball.x >= paddleX - 2 &&
          ball.x <= paddleX + paddleW + 2) {
        ball.y = PADDLE_Y - BALL_R;
        const hit = (ball.x - paddleX) / paddleW; // 0 to 1
        const angle = -Math.PI * (0.15 + 0.7 * (1 - hit));
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        comboCount = 0;
      }

      // Ball falls below
      if (ball.y - BALL_R > H) {
        balls.splice(bi, 1);
        continue;
      }

      // Brick collisions
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (!bricks[r][c].alive) continue;
          const bx = 10 + c * BRICK_W + BRICK_PAD;
          const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
          const bw = BRICK_W - BRICK_PAD * 2;
          const bh = BRICK_H - BRICK_PAD * 2;

          if (ball.x + BALL_R > bx && ball.x - BALL_R < bx + bw &&
              ball.y + BALL_R > by && ball.y - BALL_R < by + bh) {

            const overlapLeft = (ball.x + BALL_R) - bx;
            const overlapRight = (bx + bw) - (ball.x - BALL_R);
            const overlapTop = (ball.y + BALL_R) - by;
            const overlapBottom = (by + bh) - (ball.y - BALL_R);
            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);

            if (minOverlapX < minOverlapY) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }

            hitBrick(r, c);
            break;
          }
        }
      }
    }

    // All balls lost
    if (balls.length === 0) {
      lives--;
      livesEl.textContent = lives;
      paddleW = PADDLE_BASE_W;
      hasLaser = false;
      laserTimer = 0;
      expandTimer = 0;
      slowTimer = 0;
      if (lives <= 0) {
        if (score > best) best = score;
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
        game.setState('over');
        return;
      }
      resetBall();
    }

    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      powerups[i].y += POWERUP_SPEED;

      const pu = powerups[i];
      if (pu.y + POWERUP_H >= PADDLE_Y &&
          pu.y <= PADDLE_Y + PADDLE_H &&
          pu.x + POWERUP_W / 2 >= paddleX &&
          pu.x - POWERUP_W / 2 <= paddleX + paddleW) {
        activatePowerup(pu.type);
        spawnParticles(pu.x, pu.y, PU_COLORS[pu.type], 8);
        powerups.splice(i, 1);
        continue;
      }

      if (pu.y > H) {
        powerups.splice(i, 1);
      }
    }

    // Update lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].y -= LASER_SPEED;

      if (lasers[i].y < 0) {
        lasers.splice(i, 1);
        continue;
      }

      const laser = lasers[i];
      let hitSomething = false;
      for (let r = 0; r < BRICK_ROWS && !hitSomething; r++) {
        for (let c = 0; c < BRICK_COLS && !hitSomething; c++) {
          if (!bricks[r][c].alive) continue;
          const bx = 10 + c * BRICK_W + BRICK_PAD;
          const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
          const bw = BRICK_W - BRICK_PAD * 2;
          const bh = BRICK_H - BRICK_PAD * 2;

          if (laser.x >= bx && laser.x <= bx + bw &&
              laser.y >= by && laser.y <= by + bh) {
            hitBrick(r, c);
            lasers.splice(i, 1);
            hitSomething = true;
          }
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravity
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Check level clear
    let allClear = true;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (bricks[r][c].alive && bricks[r][c].type !== BRICK_METAL) {
          allClear = false;
          break;
        }
      }
      if (!allClear) break;
    }
    if (allClear) {
      level++;
      levelEl.textContent = level;
      score += 500 * level;
      scoreEl.textContent = score;
      initBricks(level);
      resetBall();
      powerups = [];
      lasers = [];
    }

    // Update game data for ML
    window.gameData = {
      paddleX: paddleX,
      paddleW: paddleW,
      balls: balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
      lives: lives,
      level: level,
      hasLaser: hasLaser,
      powerupsOnScreen: powerups.length,
      activeBricks: bricks.flat().filter(b => b.alive).length
    };
  };

  game.onDraw = (renderer, text) => {
    // Subtle background grid
    for (let x = 0; x < W; x += 40) {
      renderer.drawLine(x, 0, x, H, 'rgba(15, 52, 96, 0.3)', 0.5);
    }
    for (let y = 0; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, 'rgba(15, 52, 96, 0.3)', 0.5);
    }

    // Bricks
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const brick = bricks[r][c];
        const bx = 10 + c * BRICK_W + BRICK_PAD;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;

        if (brick.type === BRICK_METAL) {
          renderer.setGlow('#888', 0.3);
          renderer.fillRect(bx, by, bw, bh, '#667');
          renderer.setGlow(null);
          // Metal cross-hatch lines
          renderer.drawLine(bx + 2, by + bh / 2, bx + bw - 2, by + bh / 2, '#889', 1);
          renderer.drawLine(bx + bw / 3, by + 2, bx + bw / 3, by + bh - 2, '#889', 1);
          renderer.drawLine(bx + 2 * bw / 3, by + 2, bx + 2 * bw / 3, by + bh - 2, '#889', 1);
        } else if (brick.type === BRICK_TOUGH) {
          const color = ROW_COLORS[r % ROW_COLORS.length];
          renderer.setGlow(color, 0.5);
          renderer.fillRect(bx, by, bw, bh, color);
          renderer.setGlow(null);
          // Inner shine to indicate toughness
          renderer.fillRect(bx + 2, by + 2, bw - 4, 4, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx + 2, by + 2, 4, bh - 4, 'rgba(255, 255, 255, 0.3)');
          // Crack line if damaged
          if (brick.hits === 1) {
            renderer.drawLine(bx + bw * 0.3, by, bx + bw * 0.5, by + bh * 0.5, 'rgba(0, 0, 0, 0.6)', 2);
            renderer.drawLine(bx + bw * 0.5, by + bh * 0.5, bx + bw * 0.7, by + bh, 'rgba(0, 0, 0, 0.6)', 2);
          }
        } else {
          const color = ROW_COLORS[r % ROW_COLORS.length];
          renderer.setGlow(color, 0.4);
          renderer.fillRect(bx, by, bw, bh, color);
          renderer.setGlow(null);
          // Subtle highlight
          renderer.fillRect(bx + 1, by + 1, bw - 2, 3, 'rgba(255, 255, 255, 0.15)');
        }
      }
    }

    // Power-ups (rendered as filled rects with label text)
    powerups.forEach(pu => {
      const puColor = PU_COLORS[pu.type];
      const px = pu.x - POWERUP_W / 2;
      const py = pu.y - POWERUP_H / 2;
      renderer.setGlow(puColor, 0.7);
      renderer.fillRect(px, py, POWERUP_W, POWERUP_H, puColor);
      renderer.setGlow(null);
      // Label
      text.drawText(PU_LABELS[pu.type], pu.x, py - 2, 10, '#1a1a2e', 'center');
    });

    // Lasers
    lasers.forEach(laser => {
      renderer.setGlow('#f44', 0.6);
      renderer.fillRect(laser.x - LASER_W / 2, laser.y, LASER_W, LASER_H, '#f44');
    });
    renderer.setGlow(null);

    // Paddle
    const paddleColor = hasLaser ? '#f44' : '#4fb';
    renderer.setGlow(paddleColor, 0.8);
    renderer.fillRect(paddleX, PADDLE_Y, paddleW, PADDLE_H, paddleColor);
    renderer.setGlow(null);

    // Laser cannons on paddle
    if (hasLaser) {
      renderer.fillRect(paddleX + 4, PADDLE_Y - 4, 4, 6, '#f88');
      renderer.fillRect(paddleX + paddleW - 8, PADDLE_Y - 4, 4, 6, '#f88');
    }

    // Paddle highlight
    renderer.fillRect(paddleX + 4, PADDLE_Y + 2, paddleW - 8, 2, 'rgba(255, 255, 255, 0.2)');

    // Balls
    balls.forEach(ball => {
      renderer.setGlow('#4fb', 0.8);
      renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
      renderer.setGlow(null);
      // Ball highlight (small bright dot offset)
      renderer.fillCircle(ball.x - 1, ball.y - 1, BALL_R * 0.4, 'rgba(255, 255, 255, 0.6)');
    });

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      // Parse color and apply alpha — use color with reduced glow
      renderer.setGlow(p.color, alpha * 0.3);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color);
    });
    renderer.setGlow(null);

    // Lives indicator (bottom right)
    renderer.setGlow('#4fb', 0.4);
    for (let i = 0; i < lives; i++) {
      renderer.fillCircle(W - 20 - i * 18, H - 15, 5, '#4fb');
    }
    renderer.setGlow(null);

    // Active power-up indicators (bottom left)
    let indicatorX = 10;
    const indicatorY = H - 12;
    if (expandTimer > 0) {
      text.drawText('EXPAND ' + Math.ceil(expandTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_EXPAND], 'left');
      indicatorX += 80;
    }
    if (laserTimer > 0) {
      text.drawText('LASER ' + Math.ceil(laserTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_LASER], 'left');
      indicatorX += 72;
    }
    if (slowTimer > 0) {
      text.drawText('SLOW ' + Math.ceil(slowTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_SLOW], 'left');
      indicatorX += 66;
    }

    // Combo indicator
    if (comboCount > 1 && frameCount - lastHitFrame < 60) {
      renderer.setGlow('#ff0', 0.6);
      text.drawText('COMBO x' + comboCount, W / 2, BRICK_TOP - 20, 16, '#ff0', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
