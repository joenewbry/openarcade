// bubble-bobble/game.js — Bubble Bobble game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 520;

// ---- Constants ----
const TILE = 24;
const COLS = W / TILE; // 20
const ROWS = Math.floor(H / TILE); // 21
const GRAVITY = 0.35;
const JUMP_FORCE = -7.5;
const MOVE_SPEED = 2.8;
const BUBBLE_SPEED = 5;
const BUBBLE_FLOAT_SPEED = 0.4;
const BUBBLE_LIFETIME = 480;
const BUBBLE_TRAP_TIME = 300;
const ENEMY_SPEED = 1.2;
const PLAYER_W = 20;
const PLAYER_H = 22;

// ---- State ----
let score, best, level, lives;
let player, enemies, bubbles, particles, platforms, items;
let levelTransitionTimer, deathTimer;

// ---- DOM refs ----
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');

// ---- Level Definitions ----
const LEVEL_DEFS = [
  { // Level 1
    platforms: [
      [0, 20, 20], [0, 0, 20],
      [2, 16, 7], [11, 16, 7],
      [4, 12, 12],
      [1, 8, 7], [12, 8, 7],
      [5, 4, 10],
    ],
    enemies: [
      [3, 15, 0], [15, 15, 0],
      [8, 11, 0],
      [3, 7, 0], [15, 7, 0],
    ]
  },
  { // Level 2
    platforms: [
      [0, 20, 20], [0, 0, 20],
      [1, 17, 5], [14, 17, 5],
      [6, 14, 8],
      [0, 11, 6], [14, 11, 6],
      [4, 8, 12],
      [1, 5, 7], [12, 5, 7],
    ],
    enemies: [
      [2, 16, 0], [16, 16, 0],
      [8, 13, 1],
      [2, 10, 0], [16, 10, 1],
      [6, 7, 1],
      [3, 4, 0],
    ]
  },
  { // Level 3
    platforms: [
      [0, 20, 20], [0, 0, 20],
      [0, 17, 4], [5, 15, 4], [10, 13, 4], [15, 11, 4],
      [0, 9, 4], [5, 7, 4], [10, 5, 4], [15, 3, 4],
      [8, 17, 5],
    ],
    enemies: [
      [1, 16, 0], [7, 14, 1], [12, 12, 0], [17, 10, 1],
      [1, 8, 1], [7, 6, 0], [12, 4, 1], [17, 2, 0],
    ]
  },
  { // Level 4
    platforms: [
      [0, 20, 20], [0, 0, 20],
      [8, 17, 4], [8, 14, 4], [8, 11, 4], [8, 8, 4], [8, 5, 4],
      [1, 15, 5], [14, 15, 5],
      [1, 10, 5], [14, 10, 5],
      [1, 5, 5], [14, 5, 5],
    ],
    enemies: [
      [2, 14, 1], [16, 14, 1],
      [9, 16, 0], [9, 13, 0], [9, 10, 1],
      [2, 9, 0], [16, 9, 0],
      [2, 4, 1], [16, 4, 1],
      [9, 7, 1],
    ]
  },
  { // Level 5
    platforms: [
      [0, 20, 20], [0, 0, 20],
      [0, 17, 14], [6, 14, 14],
      [0, 11, 14], [6, 8, 14],
      [0, 5, 14], [6, 2, 14],
    ],
    enemies: [
      [2, 16, 0], [8, 16, 1], [12, 16, 0],
      [8, 13, 1], [14, 13, 0], [18, 13, 1],
      [2, 10, 0], [8, 10, 1], [12, 10, 0],
      [10, 7, 1], [16, 7, 0],
      [4, 4, 1], [8, 4, 0],
    ]
  },
];

// ---- Entity factories ----
function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    facing: 1, onGround: false,
    shootCooldown: 0, invincible: 0,
    animFrame: 0, animTimer: 0,
  };
}

function createEnemy(x, y, type) {
  return {
    x: x * TILE + 2, y: y * TILE - 2,
    vx: ENEMY_SPEED * (Math.random() < 0.5 ? 1 : -1),
    vy: 0, w: 18, h: 20,
    type, alive: true, trapped: false,
    trapTimer: 0, bubbleX: 0, bubbleY: 0,
    onGround: false, facing: 1,
    animFrame: 0, animTimer: 0, angryFlash: 0,
    speed: type === 1 ? ENEMY_SPEED * 1.4 : ENEMY_SPEED,
  };
}

function createBubble(x, y, dir) {
  return {
    x, y, vx: BUBBLE_SPEED * dir, vy: 0,
    radius: 10, age: 0,
    floating: false, popping: false, popTimer: 0,
  };
}

function createItem(x, y, type) {
  return {
    x, y, vy: 0, w: 16, h: 16,
    type, lifetime: 600, onGround: false,
  };
}

function createParticle(x, y, color) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4 - 2,
    life: 30 + Math.random() * 20,
    maxLife: 50,
    color, size: 2 + Math.random() * 3,
  };
}

// ---- Level builder ----
function buildLevel(n) {
  const def = LEVEL_DEFS[(n - 1) % LEVEL_DEFS.length];
  const difficultyMult = 1 + Math.floor((n - 1) / LEVEL_DEFS.length) * 0.3;

  platforms = [];
  for (const [tx, ty, tw] of def.platforms) {
    platforms.push({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: TILE });
  }
  // Walls
  for (let r = 0; r < ROWS + 1; r++) {
    platforms.push({ x: -TILE, y: r * TILE, w: TILE, h: TILE });
    platforms.push({ x: W, y: r * TILE, w: TILE, h: TILE });
  }

  enemies = [];
  for (const [ex, ey, etype] of def.enemies) {
    const e = createEnemy(ex, ey, etype);
    e.speed *= difficultyMult;
    enemies.push(e);
  }

  bubbles = [];
  items = [];
  particles = [];
}

// ---- Physics helpers ----
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function applyGravity(entity) {
  entity.vy += GRAVITY;
  entity.y += entity.vy;
  entity.x += entity.vx;

  // Wrap horizontally
  if (entity.x > W + 8) entity.x = -entity.w - 4;
  if (entity.x + entity.w < -8) entity.x = W + 4;

  // Platform collision
  entity.onGround = false;
  for (const p of platforms) {
    if (rectCollide(entity, p)) {
      const overlapLeft = (entity.x + entity.w) - p.x;
      const overlapRight = (p.x + p.w) - entity.x;
      const overlapTop = (entity.y + entity.h) - p.y;
      const overlapBottom = (p.y + p.h) - entity.y;
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop && entity.vy >= 0) {
        entity.y = p.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
      } else if (minOverlap === overlapBottom && entity.vy < 0) {
        entity.y = p.y + p.h;
        entity.vy = 0;
      } else if (minOverlap === overlapLeft) {
        entity.x = p.x - entity.w;
        if (entity.vx > 0) entity.vx = -entity.vx;
      } else if (minOverlap === overlapRight) {
        entity.x = p.x + p.w;
        if (entity.vx < 0) entity.vx = -entity.vx;
      }
    }
  }
}

// ---- Game-level functions ----
let game; // reference set in createGame

function nextLevel() {
  level++;
  levelEl.textContent = level;
  score += 100 * level;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
  player.x = W / 2 - PLAYER_W / 2;
  player.y = H - TILE * 2 - PLAYER_H;
  player.vx = 0;
  player.vy = 0;
  buildLevel(level);
  levelTransitionTimer = 90;
}

function playerDie() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
    return;
  }
  player.x = W / 2 - PLAYER_W / 2;
  player.y = H - TILE * 2 - PLAYER_H;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 120;
  deathTimer = 30;
  for (let i = 0; i < 12; i++) {
    particles.push(createParticle(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#4ef'));
  }
}

// ---- Drawing helpers ----
function drawDragon(renderer, x, y, facing, frame, invincible) {
  if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

  // We draw all parts relative to the entity position, handling facing by flipping x offsets
  const cx = x + PLAYER_W / 2;
  const cy = y + PLAYER_H / 2;
  const f = facing; // 1=right, -1=left

  // Body (ellipse approximated as circle)
  renderer.setGlow('#4ef', 0.5);
  renderer.fillCircle(cx, cy + 2, 10, '#4ef');
  renderer.setGlow(null);

  // Belly
  renderer.fillCircle(cx + f * 1, cy + 4, 5, '#aff');

  // Head
  renderer.fillCircle(cx + f * 3, cy - 7, 7, '#4ef');

  // Eye white
  renderer.fillCircle(cx + f * 6, cy - 8, 3, '#fff');
  // Eye pupil
  renderer.fillCircle(cx + f * 7, cy - 8, 1.5, '#111');

  // Snout
  renderer.fillCircle(cx + f * 9, cy - 5, 2.5, '#3bd');

  // Legs (animate)
  const legOffset = frame === 0 ? 0 : 2;
  renderer.fillRect(cx - f * 5 - 2, y + PLAYER_H - 4 + legOffset, 4, 4, '#4ef');
  renderer.fillRect(cx + f * 2 - 2, y + PLAYER_H - 4 - legOffset, 4, 4, '#4ef');

  // Spines on back
  for (let s = 0; s < 3; s++) {
    const sx = cx - f * 6 - f * s * 2;
    const sy = cy - 4 + s * 4;
    renderer.fillPoly([
      [sx, sy],
      [sx - f * 4, sy - 3],
      [sx, sy + 2],
    ], '#0bc');
  }
}

function drawEnemyTrapped(renderer, e) {
  const bx = e.bubbleX, by = e.bubbleY;

  // Bubble outline (use a slightly transparent look via circle + highlight)
  renderer.fillCircle(bx, by, 14, 'rgba(68, 238, 255, 0.1)');
  renderer.fillCircle(bx, by, 14, 'rgba(68, 238, 255, 0.08)');
  // Ring: draw 4 small rectangles as a ring approximation
  // Actually use drawLine to create a circle outline effect
  // We'll draw a dashed ring using multiple line segments
  const segs = 24;
  const ringPts = [];
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    ringPts.push([bx + Math.cos(angle) * 14, by + Math.sin(angle) * 14]);
  }
  for (let i = 0; i < segs; i++) {
    renderer.drawLine(ringPts[i][0], ringPts[i][1], ringPts[i + 1][0], ringPts[i + 1][1], 'rgba(68, 238, 255, 0.6)', 2);
  }

  // Highlight on bubble
  renderer.fillCircle(bx - 4, by - 5, 3, 'rgba(255, 255, 255, 0.4)');

  // Enemy inside
  if (e.angryFlash < 5 || e.trapTimer < BUBBLE_TRAP_TIME * 0.7) {
    const col = e.type === 0 ? '#0f8' : '#a4f';
    renderer.fillCircle(bx, by, 6, col);
    // Angry eyes
    renderer.fillRect(bx - 3, by - 3, 2, 2, '#f00');
    renderer.fillRect(bx + 1, by - 3, 2, 2, '#f00');
  }
}

function drawEnemyFree(renderer, e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const f = e.facing;

  const col = e.type === 0 ? '#0f8' : '#a4f';
  const colDark = e.type === 0 ? '#0a6' : '#63a';

  // Body
  renderer.setGlow(col, 0.4);
  renderer.fillCircle(cx, cy + 1, 9, col);
  renderer.setGlow(null);

  // Eyes
  renderer.fillCircle(cx + f * 2, cy - 4, 3, '#fff');
  renderer.fillCircle(cx + f * 3, cy - 4, 1.5, '#111');
  // Second eye
  renderer.fillCircle(cx - f * 2, cy - 4, 2.5, '#fff');
  renderer.fillCircle(cx - f * 1, cy - 4, 1.2, '#111');

  // Legs
  const lo = e.animFrame === 0 ? 0 : 2;
  renderer.fillRect(cx - 5 - 1, e.y + e.h - 3 + lo, 3, 3, colDark);
  renderer.fillRect(cx + 2 - 1, e.y + e.h - 3 - lo, 3, 3, colDark);

  // Type-specific: horns for fast enemy
  if (e.type === 1) {
    renderer.fillPoly([
      [cx + f * -3, cy - 8],
      [cx + f * -5, cy - 14],
      [cx + f * -1, cy - 8],
    ], '#f4a');
    renderer.fillPoly([
      [cx + f * 3, cy - 8],
      [cx + f * 5, cy - 14],
      [cx + f * 7, cy - 8],
    ], '#f4a');
  }
}

function drawBubbleEntity(renderer, b) {
  if (b.popping) {
    const r = b.radius + b.popTimer * 2;
    // Fading ring
    const segs = 20;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      pts.push([b.x + Math.cos(angle) * r, b.y + Math.sin(angle) * r]);
    }
    const alpha = 1 - b.popTimer / 10;
    const col = `rgba(68, 238, 255, ${(alpha * 0.5).toFixed(2)})`;
    for (let i = 0; i < segs; i++) {
      renderer.drawLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, 1);
    }
    return;
  }

  // Main bubble
  if (!b.floating) {
    renderer.setGlow('#4ef', 0.5);
    renderer.fillCircle(b.x, b.y, b.radius, 'rgba(68, 238, 255, 0.2)');
    renderer.setGlow(null);
  } else {
    renderer.fillCircle(b.x, b.y, b.radius, 'rgba(68, 238, 255, 0.12)');
  }

  // Ring outline
  const segs = 20;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    pts.push([b.x + Math.cos(angle) * b.radius, b.y + Math.sin(angle) * b.radius]);
  }
  const ringColor = b.floating ? 'rgba(68, 238, 255, 0.5)' : 'rgba(68, 238, 255, 0.8)';
  for (let i = 0; i < segs; i++) {
    renderer.drawLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], ringColor, 1.5);
  }

  // Highlight
  renderer.fillCircle(b.x - 3, b.y - 3, b.radius * 0.3, 'rgba(255, 255, 255, 0.35)');
}

function drawItem(renderer, it) {
  const flash = it.lifetime < 120 && Math.floor(it.lifetime / 8) % 2 === 0;
  if (flash) return;

  const cx = it.x + 8;
  const cy = it.y + 8;

  if (it.type === 'food1') {
    // Cherry
    renderer.setGlow('#f44', 0.3);
    renderer.fillCircle(cx - 2, cy + 3, 5, '#f44');
    renderer.fillCircle(cx + 4, cy + 2, 5, '#f44');
    renderer.setGlow(null);
    // Stem
    renderer.drawLine(cx - 2, cy - 2, cx + 1, cy - 8, '#0a4', 1.5);
    renderer.drawLine(cx + 1, cy - 8, cx + 4, cy - 3, '#0a4', 1.5);
  } else if (it.type === 'food2') {
    // Banana (half-ellipse approximated)
    renderer.setGlow('#ff0', 0.3);
    // Approximate the banana shape with a filled polygon
    const bananaPts = [];
    for (let i = 0; i <= 10; i++) {
      const angle = (i / 10) * Math.PI; // half circle
      const rx = 7, ry = 4;
      bananaPts.push([cx + Math.cos(angle - 0.3) * rx, cy + Math.sin(angle - 0.3) * ry]);
    }
    renderer.fillPoly(bananaPts, '#ff0');
    renderer.setGlow(null);
  } else {
    // Cake
    renderer.setGlow('#f8a', 0.3);
    renderer.fillRect(cx - 6, cy - 2, 12, 8, '#f8a');
    renderer.fillRect(cx - 6, cy - 2, 12, 3, '#fcc');
    renderer.setGlow(null);
    // Cherry on top
    renderer.fillCircle(cx, cy - 4, 2, '#f22');
  }
}

// ---- Main export ----
export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = parseInt(bestEl.textContent) || 0;
    level = 1;
    lives = 3;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    livesEl.textContent = '3';
    player = createPlayer(W / 2 - PLAYER_W / 2, H - TILE * 2 - PLAYER_H);
    buildLevel(1);
    levelTransitionTimer = 0;
    deathTimer = 0;
    game.showOverlay('BUBBLE BOBBLE', 'Arrow keys to move, Up to jump, Space to shoot\nPress SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ---- State transitions ----
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ---- Playing state ----
    if (levelTransitionTimer > 0) {
      levelTransitionTimer--;
      return;
    }
    if (deathTimer > 0) {
      deathTimer--;
      return;
    }

    // ---- Player movement ----
    if (input.isDown('ArrowLeft')) {
      player.vx = -MOVE_SPEED;
      player.facing = -1;
    } else if (input.isDown('ArrowRight')) {
      player.vx = MOVE_SPEED;
      player.facing = 1;
    } else {
      player.vx *= 0.7;
      if (Math.abs(player.vx) < 0.2) player.vx = 0;
    }

    if (input.isDown('ArrowUp') && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }

    applyGravity(player);

    // Player animation
    player.animTimer++;
    if (player.animTimer > 8) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 2;
    }

    if (player.invincible > 0) player.invincible--;
    if (player.shootCooldown > 0) player.shootCooldown--;

    // ---- Shoot bubble ----
    if (input.isDown(' ') && player.shootCooldown <= 0) {
      const bx = player.x + (player.facing > 0 ? PLAYER_W : -4);
      const by = player.y + PLAYER_H / 2 - 5;
      bubbles.push(createBubble(bx, by, player.facing));
      player.shootCooldown = 15;
    }

    // ---- Update bubbles ----
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age++;

      if (b.popping) {
        b.popTimer++;
        if (b.popTimer > 10) {
          bubbles.splice(i, 1);
        }
        continue;
      }

      if (!b.floating) {
        b.x += b.vx;
        b.vx *= 0.96;
        if (Math.abs(b.vx) < 0.5) {
          b.floating = true;
          b.vx = 0;
        }
        if (b.x - b.radius < 0) { b.x = b.radius; b.vx = Math.abs(b.vx); }
        if (b.x + b.radius > W) { b.x = W - b.radius; b.vx = -Math.abs(b.vx); }
      } else {
        b.y -= BUBBLE_FLOAT_SPEED;
        b.x += Math.sin(b.age * 0.05) * 0.3;
        if (b.y - b.radius < TILE) {
          b.y = TILE + b.radius;
          b.x += (Math.random() - 0.5) * 2;
        }
        if (b.x < -b.radius) b.x = W + b.radius;
        if (b.x > W + b.radius) b.x = -b.radius;
      }

      if (b.age > BUBBLE_LIFETIME) {
        b.popping = true;
        b.popTimer = 0;
      }
    }

    // ---- Update enemies ----
    let aliveCount = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) continue;

      if (e.trapped) {
        e.trapTimer++;
        e.bubbleY -= BUBBLE_FLOAT_SPEED;
        e.bubbleX += Math.sin(e.trapTimer * 0.05) * 0.3;
        if (e.bubbleY - 12 < TILE) {
          e.bubbleY = TILE + 12;
        }
        if (e.bubbleX < -12) e.bubbleX = W + 12;
        if (e.bubbleX > W + 12) e.bubbleX = -12;

        if (e.trapTimer > BUBBLE_TRAP_TIME * 0.7) {
          e.angryFlash = (e.angryFlash + 1) % 10;
        }

        // Escape
        if (e.trapTimer > BUBBLE_TRAP_TIME) {
          e.trapped = false;
          e.x = e.bubbleX - e.w / 2;
          e.y = e.bubbleY - e.h / 2;
          e.vy = 0;
          e.speed *= 1.2;
          e.angryFlash = 0;
          for (let p = 0; p < 6; p++) {
            particles.push(createParticle(e.bubbleX, e.bubbleY, '#f44'));
          }
        }

        // Check if player pops this trapped enemy
        const dx = (player.x + PLAYER_W / 2) - e.bubbleX;
        const dy = (player.y + PLAYER_H / 2) - e.bubbleY;
        if (Math.sqrt(dx * dx + dy * dy) < 22) {
          e.alive = false;
          const pts = (e.type + 1) * 100;
          score += pts;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          for (let p = 0; p < 10; p++) {
            particles.push(createParticle(e.bubbleX, e.bubbleY, e.type === 0 ? '#0f8' : '#a4f'));
          }
          const foodTypes = ['food1', 'food2', 'food3'];
          items.push(createItem(e.bubbleX - 8, e.bubbleY - 8, foodTypes[Math.floor(Math.random() * foodTypes.length)]));
          particles.push({
            x: e.bubbleX, y: e.bubbleY - 10,
            vx: 0, vy: -1,
            life: 40, maxLife: 40,
            color: '#ff0', size: 0,
            text: '+' + pts,
          });
          continue;
        }

        aliveCount++;
        continue;
      }

      // Normal enemy AI
      e.animTimer++;
      if (e.animTimer > 10) {
        e.animTimer = 0;
        e.animFrame = (e.animFrame + 1) % 2;
      }

      e.vx = e.speed * e.facing;
      applyGravity(e);

      if (e.x <= 2 || e.x + e.w >= W - 2) {
        e.facing = -e.facing;
      }
      if (Math.random() < 0.01) {
        e.facing = -e.facing;
      }
      if (e.onGround && Math.random() < 0.015) {
        e.vy = JUMP_FORCE * 0.8;
      }

      // Check if hit by a bubble
      for (let j = bubbles.length - 1; j >= 0; j--) {
        const b = bubbles[j];
        if (b.popping || (b.floating && b.age > 30)) continue;
        if (b.age > 60 && b.floating) continue;
        const dx = (e.x + e.w / 2) - b.x;
        const dy = (e.y + e.h / 2) - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < b.radius + 10) {
          e.trapped = true;
          e.trapTimer = 0;
          e.bubbleX = e.x + e.w / 2;
          e.bubbleY = e.y + e.h / 2;
          e.angryFlash = 0;
          bubbles.splice(j, 1);
          for (let p = 0; p < 6; p++) {
            particles.push(createParticle(e.bubbleX, e.bubbleY, '#4ef'));
          }
          break;
        }
      }

      // Enemy touches player
      if (!e.trapped && player.invincible <= 0) {
        if (rectCollide(player, e)) {
          playerDie();
          return;
        }
      }

      aliveCount++;
    }

    // ---- Update items ----
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.lifetime--;
      if (it.lifetime <= 0) {
        items.splice(i, 1);
        continue;
      }
      it.vy += GRAVITY * 0.5;
      it.y += it.vy;
      it.onGround = false;
      for (const p of platforms) {
        if (it.x < p.x + p.w && it.x + it.w > p.x &&
            it.y < p.y + p.h && it.y + it.h > p.y) {
          if (it.vy > 0) {
            it.y = p.y - it.h;
            it.vy = 0;
            it.onGround = true;
          }
        }
      }
      if (rectCollide(player, it)) {
        let pts = 0;
        if (it.type === 'food1') pts = 50;
        else if (it.type === 'food2') pts = 100;
        else pts = 200;
        score += pts;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        particles.push({
          x: it.x + 8, y: it.y - 5,
          vx: 0, vy: -1,
          life: 30, maxLife: 30,
          color: '#ff0', size: 0,
          text: '+' + pts,
        });
        items.splice(i, 1);
      }
    }

    // ---- Update particles ----
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // ---- Check level clear ----
    if (aliveCount === 0 && enemies.length > 0 && levelTransitionTimer <= 0) {
      nextLevel();
    }

    // ---- Update gameData for ML ----
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerFacing: player.facing,
      enemies: enemies.filter(e => e.alive).map(e => ({
        x: e.trapped ? e.bubbleX : e.x,
        y: e.trapped ? e.bubbleY : e.y,
        trapped: e.trapped,
        type: e.type,
      })),
      bubbleCount: bubbles.length,
      level: level,
      lives: lives,
    };
  };

  game.onDraw = (renderer, text) => {
    // ---- Draw platforms ----
    for (const p of platforms) {
      if (p.x < 0 || p.x >= W) continue; // Skip wall platforms
      renderer.fillRect(p.x, p.y, p.w, p.h, '#16213e');
      // Top edge
      renderer.fillRect(p.x, p.y, p.w, 2, '#0f3460');
      // Bottom edge
      renderer.fillRect(p.x, p.y + p.h - 2, p.w, 2, '#0a1a30');
      // Brick lines
      for (let bx = p.x; bx < p.x + p.w; bx += TILE / 2) {
        renderer.drawLine(bx, p.y, bx, p.y + p.h, '#0f3460', 0.5);
      }
    }

    // Left/right wall borders
    renderer.fillRect(0, 0, 2, H, '#0f3460');
    renderer.fillRect(W - 2, 0, 2, H, '#0f3460');

    // ---- Draw items ----
    for (const it of items) {
      drawItem(renderer, it);
    }

    // ---- Draw bubbles ----
    for (const b of bubbles) {
      drawBubbleEntity(renderer, b);
    }

    // ---- Draw enemies ----
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.trapped) {
        drawEnemyTrapped(renderer, e);
      } else {
        drawEnemyFree(renderer, e);
      }
    }

    // ---- Draw player ----
    drawDragon(renderer, player.x, player.y, player.facing, player.animFrame, player.invincible);

    // ---- Draw particles ----
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      if (p.text) {
        // Score popup text
        const a = Math.min(1, alpha);
        const col = `rgba(255, 255, 0, ${a.toFixed(2)})`;
        text.drawText(p.text, p.x, p.y, 12, col, 'center');
      } else {
        const a = Math.min(1, alpha);
        // Parse color and add alpha
        const col = hexToRgba(p.color, a);
        renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, col);
      }
    }

    // ---- Level transition message ----
    if (levelTransitionTimer > 0) {
      renderer.setGlow('#4ef', 0.8);
      text.drawText('LEVEL ' + level, W / 2, H / 2 - 10, 28, '#4ef', 'center');
      renderer.setGlow(null);
      text.drawText('Get ready!', W / 2, H / 2 + 20, 14, '#aaa', 'center');
    }

    // ---- Level indicator (small, top) ----
    if (game.state === 'playing') {
      text.drawText('LVL ' + level, W / 2, 14, 10, 'rgba(68, 238, 255, 0.3)', 'center');
    }
  };

  game.start();
  return game;
}

// ---- Utility: hex color to rgba string ----
function hexToRgba(hex, alpha) {
  // Handle rgba() passthrough
  if (hex.startsWith('rgba')) return hex;
  // Handle #rgb and #rrggbb
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}
