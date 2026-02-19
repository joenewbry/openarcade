// snow-bros/game.js — Snow Bros game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// ── Constants ──
const GRAVITY = 0.45;
const TILE = 32;
const COLS = 15;   // 480 / 32
const ROWS = 17;
const PLAYER_W = 24;
const PLAYER_H = 28;
const PLAYER_SPEED = 3;
const JUMP_FORCE = -8.5;
const SNOW_SPEED = 5;
const SNOW_LIFETIME = 40;
const SNOWBALL_ROLL_SPEED = 6;
const MAX_SNOW_HITS = 4;
const LIVES_START = 3;

// ── Level layouts ──
const LEVEL_LAYOUTS = [
  // Level 1: Simple symmetric platforms
  [
    [0, 15, 15],
    [0, 12, 5], [10, 12, 5],
    [3, 9, 9],
    [0, 6, 5], [10, 6, 5],
    [4, 3, 7],
  ],
  // Level 2: Staircase
  [
    [0, 15, 15],
    [0, 13, 4], [11, 13, 4],
    [2, 11, 4], [9, 11, 4],
    [0, 9, 5], [10, 9, 5],
    [4, 7, 7],
    [1, 5, 4], [10, 5, 4],
    [5, 3, 5],
  ],
  // Level 3: Narrow gaps
  [
    [0, 15, 15],
    [0, 13, 3], [5, 13, 5], [12, 13, 3],
    [1, 11, 4], [8, 11, 5],
    [0, 9, 6], [9, 9, 6],
    [3, 7, 3], [8, 7, 3],
    [0, 5, 4], [11, 5, 4],
    [5, 3, 5],
  ],
  // Level 4: Dense platforms
  [
    [0, 15, 15],
    [1, 13, 3], [6, 13, 3], [11, 13, 3],
    [0, 11, 4], [5, 11, 5], [11, 11, 4],
    [2, 9, 3], [7, 9, 3], [11, 9, 3],
    [0, 7, 5], [10, 7, 5],
    [3, 5, 4], [8, 5, 4],
    [5, 3, 5],
  ],
  // Level 5: Wide open
  [
    [0, 15, 15],
    [0, 12, 4], [11, 12, 4],
    [4, 10, 7],
    [0, 8, 3], [12, 8, 3],
    [2, 6, 11],
    [0, 4, 4], [11, 4, 4],
    [5, 2, 5],
  ],
];

// Enemy spawn definitions per level
const LEVEL_ENEMIES = [
  // Level 1: 4 basic enemies
  [
    { x: 1, y: 11, type: 'basic' },
    { x: 13, y: 11, type: 'basic' },
    { x: 6, y: 8, type: 'basic' },
    { x: 1, y: 5, type: 'basic' },
  ],
  // Level 2: 5 enemies with a fast one
  [
    { x: 1, y: 12, type: 'basic' },
    { x: 13, y: 12, type: 'basic' },
    { x: 3, y: 10, type: 'basic' },
    { x: 11, y: 4, type: 'fast' },
    { x: 6, y: 2, type: 'basic' },
  ],
  // Level 3: 6 enemies with fast
  [
    { x: 1, y: 12, type: 'basic' },
    { x: 13, y: 12, type: 'fast' },
    { x: 6, y: 12, type: 'basic' },
    { x: 2, y: 10, type: 'basic' },
    { x: 10, y: 8, type: 'fast' },
    { x: 6, y: 2, type: 'basic' },
  ],
  // Level 4: 7 enemies with tough
  [
    { x: 2, y: 12, type: 'basic' },
    { x: 7, y: 12, type: 'tough' },
    { x: 12, y: 12, type: 'basic' },
    { x: 1, y: 10, type: 'fast' },
    { x: 7, y: 10, type: 'basic' },
    { x: 12, y: 10, type: 'fast' },
    { x: 6, y: 2, type: 'tough' },
  ],
  // Level 5: 8 mixed enemies
  [
    { x: 1, y: 11, type: 'fast' },
    { x: 13, y: 11, type: 'fast' },
    { x: 6, y: 9, type: 'tough' },
    { x: 1, y: 7, type: 'basic' },
    { x: 13, y: 7, type: 'basic' },
    { x: 4, y: 5, type: 'tough' },
    { x: 10, y: 5, type: 'fast' },
    { x: 7, y: 1, type: 'tough' },
  ],
];

// Enemy type definitions
const ENEMY_TYPES = {
  basic: { color: '#f66', speed: 1.2, jumpChance: 0.008, points: 100 },
  fast:  { color: '#ff0', speed: 2.2, jumpChance: 0.015, points: 200 },
  tough: { color: '#f80', speed: 1.5, jumpChance: 0.01,  points: 300 },
};

// ── Game state ──
let player, enemies, snowballs, rollingBalls, particles, platforms;
let level, lives, score, best, tick;
let levelTransition, levelTransitionTimer;
let invincibleTimer;
let game; // reference set in createGame

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');

// ── Utility ──
function hexToRgba(hex, alpha) {
  if (hex.startsWith('rgba')) return hex;
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

// ── Level loading ──
function loadLevel(lvl) {
  const layoutIndex = (lvl - 1) % LEVEL_LAYOUTS.length;
  const enemyIndex = (lvl - 1) % LEVEL_ENEMIES.length;

  // Build platforms
  platforms = [];
  const layout = LEVEL_LAYOUTS[layoutIndex];
  layout.forEach(([tx, ty, tw]) => {
    platforms.push({
      x: tx * TILE,
      y: ty * TILE,
      w: tw * TILE,
      h: TILE,
      isGround: ty === 15,
    });
  });

  // Spawn enemies with difficulty scaling
  enemies = [];
  const enemyDefs = LEVEL_ENEMIES[enemyIndex];
  const speedMult = 1 + (lvl - 1) * 0.12;
  enemyDefs.forEach(def => {
    const et = ENEMY_TYPES[def.type];
    enemies.push({
      x: def.x * TILE,
      y: def.y * TILE - 24,
      w: 22,
      h: 24,
      vx: (Math.random() > 0.5 ? 1 : -1) * et.speed * speedMult,
      vy: 0,
      type: def.type,
      color: et.color,
      speed: et.speed * speedMult,
      jumpChance: et.jumpChance,
      points: et.points + (lvl - 1) * 10,
      snowHits: 0,
      encased: false,
      encaseTimer: 0,
      alive: true,
      onGround: false,
      facing: 1,
      animFrame: 0,
    });
  });

  // Reset projectiles
  snowballs = [];
  rollingBalls = [];
  particles = [];

  // Spawn player
  player = {
    x: 7 * TILE,
    y: 14 * TILE - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    shooting: false,
    shootCooldown: 0,
    animFrame: 0,
  };
}

// ── Collision helpers ──
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function isOnPlatform(entity) {
  const footY = entity.y + entity.h;
  const footL = entity.x + 2;
  const footR = entity.x + entity.w - 2;
  for (const p of platforms) {
    if (footY >= p.y && footY <= p.y + 6 &&
        footR > p.x && footL < p.x + p.w &&
        entity.vy >= 0) {
      return p;
    }
  }
  return null;
}

function resolveVertical(entity) {
  if (entity.vy >= 0) {
    const plat = isOnPlatform(entity);
    if (plat) {
      entity.y = plat.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
      return;
    }
  }
  entity.onGround = false;
}

// ── Update functions ──
function updatePlayer() {
  const input = game.input;

  // Horizontal movement
  if (input.isDown('ArrowLeft')) {
    player.vx = -PLAYER_SPEED;
    player.facing = -1;
  } else if (input.isDown('ArrowRight')) {
    player.vx = PLAYER_SPEED;
    player.facing = 1;
  } else {
    player.vx = 0;
  }

  // Jump
  if ((input.isDown('ArrowUp') || input.isDown('z') || input.isDown('Z')) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  // Apply gravity
  player.vy += GRAVITY;
  if (player.vy > 10) player.vy = 10;

  // Move horizontally
  player.x += player.vx;

  // Wall boundaries (wrap around)
  if (player.x + player.w < 0) player.x = W;
  if (player.x > W) player.x = -player.w;

  // Move vertically
  player.y += player.vy;

  // Floor
  if (player.y + player.h > H) {
    player.y = H - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  // Platform collision
  resolveVertical(player);

  // Ceiling
  if (player.y < 0) {
    player.y = 0;
    player.vy = 0;
  }

  // Shooting
  if (player.shootCooldown > 0) player.shootCooldown--;
  if (input.isDown(' ') && player.shootCooldown <= 0) {
    shootSnow();
    player.shootCooldown = 12;
  }

  player.animFrame = (tick >> 3) & 1;
}

function shootSnow() {
  snowballs.push({
    x: player.x + (player.facing === 1 ? player.w : -8),
    y: player.y + 6,
    vx: SNOW_SPEED * player.facing,
    vy: 0,
    life: SNOW_LIFETIME,
    w: 10,
    h: 10,
  });
}

function updateSnowballs() {
  for (let i = snowballs.length - 1; i >= 0; i--) {
    const s = snowballs[i];
    s.x += s.vx;
    s.life--;

    // Remove if off screen or expired
    if (s.life <= 0 || s.x < -20 || s.x > W + 20) {
      snowballs.splice(i, 1);
      continue;
    }

    // Check hit against enemies
    let hitEnemy = false;
    for (const e of enemies) {
      if (!e.alive || e.encased) continue;
      if (rectOverlap(s, e)) {
        e.snowHits++;
        spawnSnowPuff(s.x, s.y);
        if (e.snowHits >= MAX_SNOW_HITS) {
          e.encased = true;
          e.encaseTimer = 300 + Math.floor(Math.random() * 120);
          e.vx = 0;
          e.vy = 0;
        }
        hitEnemy = true;
        break;
      }
    }
    if (hitEnemy) {
      snowballs.splice(i, 1);
    }
  }
}

function updateRollingBalls() {
  for (let i = rollingBalls.length - 1; i >= 0; i--) {
    const rb = rollingBalls[i];
    rb.x += rb.vx;
    rb.vy += GRAVITY;
    if (rb.vy > 12) rb.vy = 12;
    rb.y += rb.vy;

    // Platform collision for rolling balls
    const footY = rb.y + rb.h;
    for (const p of platforms) {
      if (footY >= p.y && footY <= p.y + 8 &&
          rb.x + rb.w > p.x && rb.x < p.x + p.w &&
          rb.vy >= 0) {
        rb.y = p.y - rb.h;
        rb.vy = 0;
        break;
      }
    }

    // Floor
    if (rb.y + rb.h > H) {
      rb.y = H - rb.h;
      rb.vy = -4;
    }

    // Wrap around walls
    if (rb.x + rb.w < 0) rb.x = W;
    if (rb.x > W) rb.x = -rb.w;

    rb.life--;
    rb.rotation += rb.vx * 0.1;

    // Check collision with other enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e === rb.sourceEnemy && rb.life > 160) continue;
      if (rectOverlap(rb, e)) {
        e.alive = false;
        rb.chainCount++;
        const chainBonus = rb.chainCount * rb.chainCount * 100;
        score += e.points + chainBonus;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
        spawnScorePopup(e.x, e.y, e.points + chainBonus);
      }
    }

    // Remove if expired
    if (rb.life <= 0) {
      if (rb.sourceEnemy && rb.sourceEnemy.alive) {
        rb.sourceEnemy.alive = false;
        score += rb.sourceEnemy.points;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        spawnExplosion(rb.x + rb.w / 2, rb.y + rb.h / 2, '#6fe');
      }
      rollingBalls.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;

    if (e.encased) {
      e.encaseTimer--;
      e.vy += GRAVITY;
      if (e.vy > 10) e.vy = 10;
      e.y += e.vy;
      resolveVertical(e);

      // Floor
      if (e.y + e.h > H) {
        e.y = H - e.h;
        e.vy = 0;
        e.onGround = true;
      }

      // Check if player kicks this snowball
      if (rectOverlap(player, e) && invincibleTimer <= 0) {
        kickSnowball(e);
        continue;
      }

      // Break free
      if (e.encaseTimer <= 0) {
        e.encased = false;
        e.snowHits = 0;
        e.vx = (Math.random() > 0.5 ? 1 : -1) * e.speed;
        invincibleTimer = 10;
      }
      continue;
    }

    // AI movement
    e.animFrame = (tick >> 4) & 1;

    // Apply gravity
    e.vy += GRAVITY;
    if (e.vy > 10) e.vy = 10;

    // Horizontal movement
    e.x += e.vx;
    e.facing = e.vx > 0 ? 1 : -1;

    // Wrap around walls
    if (e.x + e.w < 0) e.x = W;
    if (e.x > W) e.x = -e.w;

    // Vertical
    e.y += e.vy;

    // Floor
    if (e.y + e.h > H) {
      e.y = H - e.h;
      e.vy = 0;
      e.onGround = true;
    }

    resolveVertical(e);

    // Edge detection: reverse at platform edges
    if (e.onGround) {
      const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const footY = e.y + e.h + 2;
      let onEdge = true;
      for (const p of platforms) {
        if (aheadX >= p.x && aheadX <= p.x + p.w &&
            footY >= p.y && footY <= p.y + TILE) {
          onEdge = false;
          break;
        }
      }
      if (onEdge && Math.random() < 0.4) {
        e.vx = -e.vx;
      }
    }

    // Random direction change
    if (Math.random() < 0.005) {
      e.vx = -e.vx;
    }

    // Random jump
    if (e.onGround && Math.random() < e.jumpChance) {
      e.vy = JUMP_FORCE * 0.85;
      e.onGround = false;
    }

    // Drop through platforms sometimes
    if (e.onGround && Math.random() < 0.003) {
      e.y += 4;
      e.onGround = false;
    }

    // Collision with player
    if (invincibleTimer <= 0 && rectOverlap(player, e)) {
      playerHit();
    }
  }
}

function kickSnowball(enemy) {
  const dir = player.facing;
  rollingBalls.push({
    x: enemy.x,
    y: enemy.y,
    w: 28,
    h: 28,
    vx: SNOWBALL_ROLL_SPEED * dir,
    vy: 0,
    life: 180,
    rotation: 0,
    sourceEnemy: enemy,
    chainCount: 0,
  });
  enemy.encased = false;
  enemy.snowHits = 0;
  score += 10;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  spawnSnowPuff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
  enemy.x = -999;
  enemy.y = -999;
}

function playerHit() {
  lives--;
  invincibleTimer = 120;
  spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#6fe');

  if (lives <= 0) {
    gameOver();
    return;
  }

  player.x = 7 * TILE;
  player.y = 14 * TILE - PLAYER_H;
  player.vx = 0;
  player.vy = 0;
}

function checkLevelComplete() {
  const aliveCount = enemies.filter(e => e.alive).length;
  const rollingCount = rollingBalls.length;
  if (aliveCount === 0 && rollingCount === 0) {
    levelTransition = true;
    levelTransitionTimer = 90;
    const bonus = 500 * level;
    score += bonus;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    spawnScorePopup(W / 2 - 40, H / 2, bonus);
  }
}

function gameOver() {
  game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
  game.setState('over');
}

// ── Particles ──
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI * 2 / 16) * i + Math.random() * 0.3;
    const spd = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      color,
      size: 3 + Math.random() * 3,
      gravity: true,
    });
  }
}

function spawnSnowPuff(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      life: 15 + Math.random() * 10,
      maxLife: 25,
      color: '#fff',
      size: 2 + Math.random() * 3,
      gravity: false,
    });
  }
}

function spawnScorePopup(x, y, pts) {
  particles.push({
    x, y,
    vx: 0,
    vy: -1.5,
    life: 50,
    maxLife: 50,
    color: '#ff0',
    text: '+' + pts,
    size: 0,
    gravity: false,
  });
}

// ── Drawing helpers ──
function drawPlatforms(renderer) {
  for (const p of platforms) {
    if (p.isGround) {
      // Ground floor
      renderer.fillRect(p.x, p.y, p.w, p.h, '#16213e');
      renderer.fillRect(p.x, p.y, p.w, 3, '#0f3460');
      // Snow on top
      renderer.fillRect(p.x, p.y, p.w, 2, 'rgba(102, 255, 238, 0.15)');
    } else {
      // Regular platform
      renderer.fillRect(p.x, p.y, p.w, 8, '#16213e');
      // Top edge glow
      renderer.fillRect(p.x, p.y, p.w, 2, '#0f3460');
      // Snow detail on top
      renderer.fillRect(p.x + 2, p.y - 1, p.w - 4, 2, 'rgba(102, 255, 238, 0.20)');
    }
  }

  // Side walls (visual only)
  renderer.fillRect(0, 0, 3, H, '#16213e');
  renderer.fillRect(W - 3, 0, 3, H, '#16213e');
}

function drawPlayer(renderer) {
  const px = player.x;
  const py = player.y;
  const f = player.facing;
  const flicker = invincibleTimer > 0 && (tick & 3) < 2;
  if (flicker) return; // skip draw for blink effect

  const cx = px + PLAYER_W / 2;

  // Body (snowman shape) — bottom body
  renderer.setGlow('#6fe', 0.5);
  renderer.fillCircle(cx, py + PLAYER_H - 6, 11, '#fff');

  // Top body (head)
  renderer.fillCircle(cx, py + 8, 9, '#fff');
  renderer.setGlow(null);

  // Hat
  renderer.fillRect(cx - 8, py - 2, 16, 3, '#6fe');
  renderer.fillRect(cx - 5, py - 9, 10, 8, '#6fe');

  // Eyes
  const eyeOff = f === 1 ? 2 : -2;
  renderer.fillCircle(cx - 3 + eyeOff, py + 6, 2, '#1a1a2e');
  renderer.fillCircle(cx + 3 + eyeOff, py + 6, 2, '#1a1a2e');

  // Nose (carrot) — triangle
  renderer.fillPoly([
    { x: cx + eyeOff, y: py + 9 },
    { x: cx + f * 6 + eyeOff, y: py + 10 },
    { x: cx + eyeOff, y: py + 11 },
  ], '#f80');

  // Arms
  const armY = py + 14;
  if (player.shootCooldown > 6) {
    // Shooting pose
    renderer.drawLine(cx, armY, cx + f * 18, armY - 4, '#ccc', 2);
  } else {
    // Normal arms
    renderer.drawLine(cx - 8, armY, cx - 14, armY + 4, '#ccc', 2);
    renderer.drawLine(cx + 8, armY, cx + 14, armY + 4, '#ccc', 2);
  }
}

function drawEnemies(renderer) {
  for (const e of enemies) {
    if (!e.alive) continue;

    if (e.encased) {
      drawEncasedEnemy(renderer, e);
      continue;
    }

    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;

    renderer.setGlow(e.color, 0.4);

    // Snow coverage indicator
    if (e.snowHits > 0) {
      drawEnemyBody(renderer, e);
      // Snow overlay
      const snowAlpha = (e.snowHits / MAX_SNOW_HITS) * 0.6;
      renderer.fillCircle(cx, cy + 2, e.w / 2 + 2, `rgba(255, 255, 255, ${snowAlpha.toFixed(2)})`);
    } else {
      drawEnemyBody(renderer, e);
    }

    renderer.setGlow(null);
  }
}

function drawEnemyBody(renderer, e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const bounce = e.animFrame * 2;

  if (e.type === 'basic') {
    // Round blob monster
    renderer.fillCircle(cx, cy + bounce, 12, e.color);
    // Feet
    renderer.fillRect(e.x + 2, e.y + e.h - 4, 6, 4, e.color);
    renderer.fillRect(e.x + e.w - 8, e.y + e.h - 4, 6, 4, e.color);
  } else if (e.type === 'fast') {
    // Triangular speedy monster
    renderer.fillPoly([
      { x: cx, y: e.y + bounce },
      { x: e.x + e.w + 2, y: e.y + e.h },
      { x: e.x - 2, y: e.y + e.h },
    ], e.color);
  } else if (e.type === 'tough') {
    // Square armored monster
    renderer.fillRect(e.x - 1, e.y + bounce, e.w + 2, e.h, e.color);
    // Inner border (dark outline effect)
    renderer.fillRect(e.x + 1, e.y + bounce + 2, e.w - 2, 2, '#1a1a2e');
    renderer.fillRect(e.x + 1, e.y + bounce + e.h - 4, e.w - 2, 2, '#1a1a2e');
  }

  // Eyes
  const eyeX1 = cx - 4;
  const eyeX2 = cx + 4;
  const eyeY = cy - 2 + bounce;
  renderer.fillCircle(eyeX1, eyeY, 3, '#fff');
  renderer.fillCircle(eyeX2, eyeY, 3, '#fff');

  // Pupils
  const pupilOff = e.facing || 0;
  renderer.fillCircle(eyeX1 + pupilOff, eyeY, 1.5, '#1a1a2e');
  renderer.fillCircle(eyeX2 + pupilOff, eyeY, 1.5, '#1a1a2e');

  // Angry mouth
  renderer.drawLine(cx - 4, cy + 5 + bounce, cx, cy + 3 + bounce, '#fff', 1.5);
  renderer.drawLine(cx, cy + 3 + bounce, cx + 4, cy + 5 + bounce, '#fff', 1.5);
}

function drawEncasedEnemy(renderer, e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const pulse = Math.sin(tick * 0.1) * 2;

  // Snowball
  renderer.setGlow('#6fe', 0.6);
  renderer.fillCircle(cx, cy, 14 + pulse, '#ddf');

  // Snow texture highlight
  renderer.fillCircle(cx - 4, cy - 4, 5, 'rgba(255, 255, 255, 0.40)');

  // Warning: enemy breaking free
  if (e.encaseTimer < 90) {
    const shake = (tick & 1) ? 1 : -1;
    renderer.fillCircle(cx + shake, cy, 6, hexToRgba(e.color, 0.5));

    // Crack lines
    for (let i = 0; i < 3; i++) {
      const ang = (Math.PI * 2 / 3) * i + tick * 0.05;
      const ix = cx + Math.cos(ang) * 8;
      const iy = cy + Math.sin(ang) * 8;
      const ox = cx + Math.cos(ang) * 14;
      const oy = cy + Math.sin(ang) * 14;
      renderer.drawLine(ix, iy, ox, oy, e.color, 1);
    }
  }

  renderer.setGlow(null);
}

function drawSnowballs(renderer) {
  renderer.setGlow('#6fe', 0.4);
  for (const s of snowballs) {
    renderer.fillCircle(s.x + s.w / 2, s.y + s.h / 2, 5, '#fff');
    // Trail
    renderer.fillCircle(s.x + s.w / 2 - s.vx * 0.5, s.y + s.h / 2, 3, 'rgba(255, 255, 255, 0.30)');
  }
  renderer.setGlow(null);
}

function drawRollingBalls(renderer, text) {
  for (const rb of rollingBalls) {
    const cx = rb.x + rb.w / 2;
    const cy = rb.y + rb.h / 2;

    // Main ball
    renderer.setGlow('#6fe', 0.7);
    renderer.fillCircle(cx, cy, 14, '#eef');

    // Rolling texture — arc approximation with line segments
    const startAng = rb.rotation;
    const endAng = rb.rotation + Math.PI;
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a1 = startAng + (endAng - startAng) * (i / segs);
      const a2 = startAng + (endAng - startAng) * ((i + 1) / segs);
      renderer.drawLine(
        cx + Math.cos(a1) * 10, cy + Math.sin(a1) * 10,
        cx + Math.cos(a2) * 10, cy + Math.sin(a2) * 10,
        'rgba(102, 255, 238, 0.40)', 2
      );
    }

    // Speed lines
    for (let j = 0; j < 3; j++) {
      const lx = cx - rb.vx * (3 + j * 4);
      renderer.drawLine(lx, cy - 4 + j * 4, lx - rb.vx * 2, cy - 4 + j * 4, 'rgba(255, 255, 255, 0.30)', 1);
    }

    renderer.setGlow(null);

    // Chain count display
    if (rb.chainCount > 0) {
      renderer.setGlow('#ff0', 0.5);
      text.drawText('x' + rb.chainCount, cx, cy - 26, 14, '#ff0', 'center');
      renderer.setGlow(null);
    }
  }
}

function drawParticles(renderer, text) {
  for (const p of particles) {
    const alpha = Math.min(1, p.life / 15);

    if (p.text) {
      const col = `rgba(255, 255, 0, ${alpha.toFixed(2)})`;
      text.drawText(p.text, p.x, p.y, 16, col, 'center');
    } else {
      const col = hexToRgba(p.color, alpha);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, col);
    }
  }
}

function drawHUD(renderer, text) {
  // Lives display — small snowman icons
  for (let i = 0; i < lives; i++) {
    const lx = 10 + i * 22;
    const ly = H - 20;
    // Head
    renderer.fillCircle(lx + 6, ly, 5, '#fff');
    // Body
    renderer.fillCircle(lx + 6, ly + 8, 6, '#fff');
    // Hat
    renderer.fillRect(lx + 2, ly - 7, 8, 3, '#6fe');
  }

  // Level indicator on canvas
  text.drawText('LVL ' + level, W - 10, H - 22, 12, '#6fe', 'right');
}

function drawSnowflakes(renderer) {
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137 + 83 + tick * (0.2 + (i % 3) * 0.1)) % (W + 20)) - 10;
    const sy = ((i * 251 + 47 + tick * (0.5 + (i % 4) * 0.2)) % (H + 20)) - 10;
    const sz = 1 + (i % 3);
    renderer.fillRect(sx, sy, sz, sz, 'rgba(255, 255, 255, 0.08)');
  }
}

// ── Main export ──
export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = parseInt(bestEl.textContent) || 0;
    level = 1;
    lives = LIVES_START;
    tick = 0;
    levelTransition = false;
    levelTransitionTimer = 0;
    invincibleTimer = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    loadLevel(level);
    game.showOverlay('SNOW BROS', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
        invincibleTimer = 60;
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;

    // Level transition
    if (levelTransition) {
      levelTransitionTimer--;
      if (levelTransitionTimer <= 0) {
        levelTransition = false;
        level++;
        levelEl.textContent = level;
        loadLevel(level);
        invincibleTimer = 60;
      }
      return;
    }

    if (invincibleTimer > 0) invincibleTimer--;

    updatePlayer();
    updateSnowballs();
    updateRollingBalls();
    updateEnemies();
    updateParticles();
    checkLevelComplete();

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      enemies: enemies.filter(e => e.alive).map(e => ({ x: e.x, y: e.y, encased: e.encased })),
      level: level,
    };
  };

  game.onDraw = (renderer, text) => {
    // Background snowflakes
    drawSnowflakes(renderer);

    // Platforms
    drawPlatforms(renderer);

    // Enemies
    drawEnemies(renderer);

    // Snow projectiles
    drawSnowballs(renderer);

    // Rolling balls
    drawRollingBalls(renderer, text);

    // Player
    drawPlayer(renderer);

    // Particles
    drawParticles(renderer, text);

    // HUD
    drawHUD(renderer, text);

    // Level transition overlay
    if (levelTransition) {
      renderer.fillRect(0, 0, W, H, 'rgba(26, 26, 46, 0.60)');
      renderer.setGlow('#6fe', 0.8);
      text.drawText('LEVEL ' + level + ' CLEAR!', W / 2, H / 2 - 20, 32, '#6fe', 'center');
      renderer.setGlow(null);
      text.drawText('Bonus: ' + (500 * level), W / 2, H / 2 + 20, 18, '#ff0', 'center');
    }
  };

  game.start();
  return game;
}
