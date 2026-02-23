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
const BASE_BALL_SPEED = 5.5;
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
const PU_STRONG = 'P';
const PU_LIFE = '1';

const PU_COLORS = {
  [PU_EXPAND]: '#4fb',
  [PU_LASER]: '#f44',
  [PU_MULTI]: '#88f',
  [PU_STRONG]: '#fa0',
  [PU_LIFE]: '#f0f'
};

const PU_LABELS = {
  [PU_EXPAND]: 'E',
  [PU_LASER]: 'L',
  [PU_MULTI]: 'M',
  [PU_STRONG]: 'P',
  [PU_LIFE]: '+'
};

const PU_TYPES = [PU_EXPAND, PU_LASER, PU_MULTI, PU_STRONG, PU_LIFE];

// Row colors for normal bricks
const ROW_COLORS = ['#f44', '#f80', '#fa0', '#ff0', '#8f0', '#0f0', '#0f8', '#0ff', '#08f', '#88f'];

// --- Game state ---
let score, best, lives, level;
let paddleX, paddleW;
let balls;       // Array of {x, y, vx, vy}
let bricks;      // 2D array of {type, hits, alive}
let powerups;    // Array of {x, y, type}
let lasers;      // Array of {x, y}
let hasLaser, laserTimer, expandTimer, strongTimer, laserHintTimer;
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

  switch ((lvl - 1) % 16) {
    case 0: // Welcome Mat — simple full grid
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

    case 2: // Diamond — partial metal border with openings
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const cx = BRICK_COLS / 2 - 0.5;
          const cy = 4;
          const dist = Math.abs(c - cx) + Math.abs(r - cy);
          if (dist <= 5) {
            if (dist === 5 && (c + r) % 2 === 0) layout[r][c] = BRICK_METAL;
            else if (dist === 5) layout[r][c] = BRICK_TOUGH;
            else if (dist <= 2) layout[r][c] = BRICK_TOUGH;
            else layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 3: // Stripes — alternating normal/tough rows, no metal
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = r % 2 === 0 ? BRICK_NORMAL : BRICK_TOUGH;
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

    case 7: // Fortress — metal top + corner pillars, wide bottom gate
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (r === 0) {
            layout[r][c] = BRICK_METAL;
          } else if (r <= 5 && (c <= 1 || c >= BRICK_COLS - 2)) {
            layout[r][c] = BRICK_METAL;
          } else if (r === 1 && c >= 2 && c <= BRICK_COLS - 3) {
            layout[r][c] = BRICK_TOUGH;
          } else if (r >= 2 && r <= 7 && c >= 2 && c <= BRICK_COLS - 3) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 8: // Corridor — vertical metal walls, normal center, tough sides
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (c === 4 || c === 7) {
            layout[r][c] = BRICK_METAL;
          } else if (c === 5 || c === 6) {
            layout[r][c] = BRICK_NORMAL;
          } else {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      break;

    case 9: { // Bullseye — concentric rings
      const cx9 = BRICK_COLS / 2 - 0.5;
      const cy9 = 4.5;
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const dist = Math.sqrt((c - cx9) * (c - cx9) + (r - cy9) * (r - cy9));
          if (dist <= 1.5) {
            layout[r][c] = r <= 3 ? 0 : BRICK_METAL;
          } else if (dist <= 3) {
            layout[r][c] = BRICK_TOUGH;
          } else if (dist <= 5) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;
    }

    case 10: // Maze — metal walls with normal brick paths
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = BRICK_NORMAL;
        }
      }
      for (let c = 0; c < 5; c++) layout[2][c] = BRICK_METAL;
      for (let c = 7; c < BRICK_COLS; c++) layout[4][c] = BRICK_METAL;
      for (let c = 0; c < 5; c++) layout[6][c] = BRICK_METAL;
      for (let r = 0; r < 3; r++) layout[r][8] = BRICK_METAL;
      for (let r = 4; r < 7; r++) layout[r][3] = BRICK_METAL;
      for (let r = 6; r < 9; r++) layout[r][8] = BRICK_METAL;
      break;

    case 11: // Shields — 3 shielded groups
      for (let g = 0; g < 3; g++) {
        const cOff = g * 4;
        for (let r = 5; r <= 7; r++) {
          for (let c = cOff; c < cOff + 4; c++) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
        layout[2][cOff + 1] = BRICK_TOUGH;
        layout[2][cOff + 2] = BRICK_TOUGH;
        for (let c = cOff; c < cOff + 4; c++) layout[3][c] = BRICK_TOUGH;
        for (let c = cOff; c < cOff + 4; c++) layout[4][c] = BRICK_TOUGH;
      }
      break;

    case 12: // Staircase — descending steps
      for (let step = 0; step < 6; step++) {
        const r = step + 1;
        const cStart = step * 2;
        for (let c = cStart; c < cStart + 2 && c < BRICK_COLS; c++) {
          layout[r][c] = step < 2 ? BRICK_TOUGH : BRICK_NORMAL;
          if (r + 1 < BRICK_ROWS) layout[r + 1][c] = BRICK_NORMAL;
        }
        if (cStart < BRICK_COLS) layout[r][cStart] = BRICK_METAL;
      }
      break;

    case 13: // Honeycomb — offset hex-like pattern
      for (let r = 0; r < 8; r++) {
        const off = (r % 2 === 0) ? 0 : 1;
        for (let c = off; c < BRICK_COLS; c += 2) {
          layout[r][c] = BRICK_NORMAL;
          if (r >= 1 && r <= 6 && c >= 2 && c <= 9 && (r + c) % 4 === 0) {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      break;

    case 14: // Gauntlet — dense field with metal column gap
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (c === 5 || c === 6) {
            layout[r][c] = r >= 6 ? BRICK_NORMAL : 0;
          } else if (c === 4 || c === 7) {
            layout[r][c] = BRICK_METAL;
          } else if (r < 4) {
            layout[r][c] = BRICK_TOUGH;
          } else {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 15: { // Boss — skull pattern
      const skull = [
        [0,0,2,2,2,2,2,2,2,2,0,0],
        [0,2,2,2,2,2,2,2,2,2,2,0],
        [0,2,1,3,3,1,1,3,3,1,2,0],
        [0,2,1,1,1,1,1,1,1,1,2,0],
        [0,0,2,1,1,2,2,1,1,2,0,0],
        [0,0,0,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,0,1,1,0,1,1,0,0],
        [0,0,0,1,1,1,1,1,1,0,0,0],
      ];
      for (let r = 0; r < skull.length; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = skull[r][c];
        }
      }
      break;
    }
  }

  // Add extra tough bricks for higher levels (after first cycle)
  if (lvl > 16) {
    const extraTough = Math.min(lvl - 16, 10);
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
  return BASE_BALL_SPEED + (level - 1) * 0.3;
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
      expandTimer = 600;
      break;

    case PU_LASER:
      hasLaser = true;
      laserTimer = 600;
      laserHintTimer = 120;
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

    case PU_STRONG:
      strongTimer = 480;
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

    if (frameCount - lastHitFrame < 30) {
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

function hitBrickStrong(r, c) {
  const brick = bricks[r][c];
  brick.alive = false;
  const bx = 10 + c * BRICK_W + BRICK_W / 2;
  const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
  const color = brick.type === BRICK_METAL ? '#fa0' : getBrickColor(r, brick.type);
  spawnParticles(bx, by, color, 12);
  if (brick.type !== BRICK_METAL) {
    maybeDropPowerup(bx, by);
  }

  if (frameCount - lastHitFrame < 30) {
    comboCount++;
  } else {
    comboCount = 1;
  }
  lastHitFrame = frameCount;

  const basePoints = brick.type === BRICK_METAL ? 100 : (10 + (BRICK_ROWS - r) * 5);
  const comboBonus = Math.min(comboCount, 10);
  score += basePoints * comboBonus;
  scoreEl.textContent = score;
  if (score > best) best = score;
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
    strongTimer = 0;
    laserHintTimer = 0;
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
    if (strongTimer > 0) {
      strongTimer--;
    }
    if (laserHintTimer > 0) {
      laserHintTimer--;
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
        const hit = (ball.x - paddleX) / paddleW;
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

            if (strongTimer > 0) {
              // Power ball — plow through everything
              hitBrickStrong(r, c);
            } else {
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
    }

    // All balls lost
    if (balls.length === 0) {
      lives--;
      livesEl.textContent = lives;
      paddleW = PADDLE_BASE_W;
      hasLaser = false;
      laserTimer = 0;
      expandTimer = 0;
      strongTimer = 0;
      laserHintTimer = 0;
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
      p.vy += 0.08;
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
      hasStrong: strongTimer > 0,
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

    // Bricks — 3D beveled
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const brick = bricks[r][c];
        const bx = 10 + c * BRICK_W + BRICK_PAD;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;

        if (brick.type === BRICK_METAL) {
          // Metal brick — darker base with 3D detail
          renderer.fillRect(bx, by, bw, bh, '#556');
          // Top third lighter stripe
          renderer.fillRect(bx + 2, by, bw - 4, bh / 3, 'rgba(255, 255, 255, 0.15)');
          // Specular highlight line
          renderer.fillRect(bx + 4, by + 2, bw - 8, 1, 'rgba(255, 255, 255, 0.3)');
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Rivet dots at corners
          renderer.fillCircle(bx + 4, by + 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + bw - 4, by + 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + 4, by + bh - 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + bw - 4, by + bh - 4, 1.5, 'rgba(200, 200, 220, 0.5)');
        } else if (brick.type === BRICK_TOUGH) {
          const color = ROW_COLORS[r % ROW_COLORS.length];
          renderer.setGlow(color, 0.5);
          renderer.fillRect(bx, by, bw, bh, color);
          renderer.setGlow(null);
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Inner shine
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
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Inner face highlight
          renderer.fillRect(bx + 2, by + 2, bw - 4, (bh - 4) / 2, 'rgba(255, 255, 255, 0.1)');
        }
      }
    }

    // Power-ups — rotating 3D capsules
    powerups.forEach(pu => {
      const puColor = PU_COLORS[pu.type];
      const phase = Math.sin(frameCount * 0.08 + pu.y * 0.1);
      const visibleW = POWERUP_W * Math.abs(phase);

      if (visibleW < 2) {
        // Edge-on: thin line
        renderer.fillRect(pu.x - 1, pu.y - POWERUP_H / 2, 2, POWERUP_H, puColor);
      } else {
        const px = pu.x - visibleW / 2;
        const py = pu.y - POWERUP_H / 2;
        renderer.setGlow(puColor, 0.7);
        renderer.fillRect(px, py, visibleW, POWERUP_H, puColor);
        renderer.setGlow(null);

        // 3D highlight on top half
        if (phase > 0) {
          renderer.fillRect(px + 1, py + 1, visibleW - 2, POWERUP_H / 3, 'rgba(255, 255, 255, 0.25)');
        }

        // Label visible when capsule > 50% width
        if (visibleW > POWERUP_W * 0.5) {
          text.drawText(PU_LABELS[pu.type], pu.x, py - 2, 10, '#1a1a2e', 'center');
        }
      }
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

    // Laser hint
    if (laserHintTimer > 0) {
      const alpha = laserHintTimer < 30 ? laserHintTimer / 30 : 1;
      const hintColor = `rgba(255, 68, 68, ${alpha})`;
      text.drawText('PRESS SPACE TO FIRE', W / 2, PADDLE_Y - 30, 12, hintColor, 'center');
    }

    // Balls — glow gold when strong
    balls.forEach(ball => {
      if (strongTimer > 0) {
        renderer.setGlow('#fa0', 1.0);
        renderer.fillCircle(ball.x, ball.y, BALL_R + 2, '#fa0');
        renderer.setGlow(null);
        renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
      } else {
        renderer.setGlow('#4fb', 0.8);
        renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
        renderer.setGlow(null);
      }
      // Ball highlight
      renderer.fillCircle(ball.x - 1, ball.y - 1, BALL_R * 0.4, 'rgba(255, 255, 255, 0.6)');
    });

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
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

    // Power-up legend (bottom-right, above lives)
    const legendX = W - 140;
    const legendY = H - 55;
    const legendItems = [
      { color: PU_COLORS[PU_EXPAND], letter: 'E', name: 'Expand' },
      { color: PU_COLORS[PU_LASER], letter: 'L', name: 'Laser' },
      { color: PU_COLORS[PU_MULTI], letter: 'M', name: 'Multi' },
      { color: PU_COLORS[PU_STRONG], letter: 'P', name: 'Power' },
      { color: PU_COLORS[PU_LIFE], letter: '+', name: 'Life' },
    ];
    legendItems.forEach((item, i) => {
      const ly = legendY + i * 10;
      renderer.fillCircle(legendX + 3, ly, 2.5, item.color);
      text.drawText(item.letter + ' ' + item.name, legendX + 9, ly - 5, 8, 'rgba(255, 255, 255, 0.5)', 'left');
    });

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
    if (strongTimer > 0) {
      text.drawText('POWER ' + Math.ceil(strongTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_STRONG], 'left');
      indicatorX += 72;
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
