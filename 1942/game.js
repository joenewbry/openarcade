// 1942/game.js — 1942 game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 640;

// Theme
const THEME = '#6db';

// Player constants
const PW = 32, PH = 36;
const PLAYER_SPEED = 4;
const FIRE_RATE = 8;
const ROLL_DURATION = 40;
const ROLL_COOLDOWN = 90;
const DOUBLE_TAP_WINDOW = 15;

// Bullet constants
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 3;

// Parallax ground scroll
const SCROLL_SPEED = 1.5;

// ── State ──
let score, best = 0;
let player, bullets, enemies, enemyBullets, powerUps, particles, explosions;
let tick, fireCooldown;
let lives;
let waveTimer, waveNumber, waveEnemiesLeft;
let bossActive, bossSpawnScore;
let scrollOffset;
let lastSpaceDown, rollCooldownTimer, rollingTimer;
let doubleShot, doubleShotTimer;
let speedBoost, speedBoostTimer;
let groundTiles = [];

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

function initGround() {
  groundTiles = [];
  for (let i = 0; i < 30; i++) {
    groundTiles.push({
      x: Math.random() * W,
      y: Math.random() * H * 2 - H,
      w: 20 + Math.random() * 60,
      h: 15 + Math.random() * 40,
      type: Math.random() < 0.3 ? 'island' : 'wave',
      shade: Math.random() * 0.3
    });
  }
}

// ── Enemy spawning ──
function spawnEnemy(type, x, y, pattern) {
  const e = {
    type: type,
    x: x, y: y,
    w: 28, h: 24,
    hp: 1,
    speed: 2,
    points: 10,
    pattern: pattern || 'straight',
    patternPhase: Math.random() * Math.PI * 2,
    patternTimer: 0,
    fireTimer: 60 + Math.floor(Math.random() * 120),
    fireRate: 120,
    alive: true
  };

  switch (type) {
    case 'fighter':
      e.hp = 1; e.speed = 2.5; e.points = 10; e.w = 26; e.h = 22;
      e.fireRate = 150;
      break;
    case 'bomber':
      e.hp = 2; e.speed = 1.5; e.points = 20; e.w = 32; e.h = 28;
      e.fireRate = 80;
      break;
    case 'ace':
      e.hp = 2; e.speed = 3; e.points = 30; e.w = 24; e.h = 20;
      e.fireRate = 100;
      break;
    case 'boss':
      e.hp = 25 + waveNumber * 5; e.maxHp = e.hp;
      e.speed = 1; e.points = 200; e.w = 72; e.h = 56;
      e.fireRate = 40; e.fireTimer = 20;
      e.pattern = 'boss';
      break;
  }

  enemies.push(e);
  return e;
}

// ── Wave spawning ──
function spawnWave() {
  waveNumber++;
  const diff = Math.min(waveNumber, 20);

  if (score >= bossSpawnScore && !bossActive) {
    bossActive = true;
    spawnEnemy('boss', W / 2 - 36, -60, 'boss');
    bossSpawnScore += 400 + waveNumber * 50;
    return;
  }

  const formations = ['v', 'line', 'stagger', 'circle', 'diagonal'];
  const formation = formations[waveNumber % formations.length];
  const count = 4 + Math.min(Math.floor(diff / 2), 6);
  const types = ['fighter'];
  if (diff >= 3) types.push('bomber');
  if (diff >= 6) types.push('ace');

  const baseSpeed = 1.5 + diff * 0.1;

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let ex, ey, pattern;

    switch (formation) {
      case 'v':
        ex = W / 2 - (count / 2 - i) * 44;
        ey = -40 - Math.abs(count / 2 - i) * 30;
        pattern = 'straight';
        break;
      case 'line':
        ex = (W / (count + 1)) * (i + 1) - 14;
        ey = -40 - i * 8;
        pattern = 'straight';
        break;
      case 'stagger':
        ex = 40 + (i % 2 === 0 ? i * 50 : W - 80 - i * 30);
        ey = -40 - i * 25;
        pattern = 'sine';
        break;
      case 'circle':
        ex = W / 2 + Math.cos(i / count * Math.PI * 2) * 120 - 14;
        ey = -60 - Math.sin(i / count * Math.PI * 2) * 60 - 60;
        pattern = 'sine';
        break;
      case 'diagonal':
        ex = i % 2 === 0 ? -30 : W + 30;
        ey = -40 - i * 30;
        pattern = i % 2 === 0 ? 'swoopRight' : 'swoopLeft';
        break;
    }

    const e = spawnEnemy(type, ex, ey, pattern);
    e.speed = baseSpeed + Math.random() * 0.5;
    e.fireRate = Math.max(40, 150 - diff * 8);
  }

  waveEnemiesLeft = count;
}

// ── Power-up spawning ──
function spawnPowerUp(x, y) {
  if (Math.random() > 0.15) return;
  const types = ['doubleShot', 'speedBoost'];
  powerUps.push({
    x: x, y: y,
    type: types[Math.floor(Math.random() * types.length)],
    w: 20, h: 20,
    speed: 1.5
  });
}

// ── Particles & Explosions ──
function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x: x, y: y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 15,
      color: color
    });
  }
}

function spawnExplosion(x, y, count) {
  explosions.push({ x: x, y: y, life: 20, maxLife: 20, size: count * 2 });
  spawnParticles(x, y, count, '#f84');
}

function fireBullet() {
  const cx = player.x + PW / 2;
  const cy = player.y;
  if (doubleShot) {
    bullets.push({ x: cx - 8, y: cy });
    bullets.push({ x: cx + 8, y: cy });
  } else {
    bullets.push({ x: cx, y: cy });
  }
}

let _game; // reference to game instance for hitPlayer/gameOver

function hitPlayer() {
  lives--;
  livesEl.textContent = lives;
  spawnExplosion(player.x + PW / 2, player.y + PH / 2, 12);
  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    _game.showOverlay('GAME OVER', `Score: ${score} — Press SPACE to restart`);
    _game.setState('over');
  } else {
    rollingTimer = 30;
    player.y = H - 80;
  }
}

function startRoll() {
  if (rollCooldownTimer > 0 || rollingTimer > 0) return;
  rollingTimer = ROLL_DURATION;
  rollCooldownTimer = ROLL_COOLDOWN;
}

// ── Export ──
export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    lives = 3;
    tick = 0;
    fireCooldown = 0;
    waveTimer = 0;
    waveNumber = 0;
    waveEnemiesLeft = 0;
    bossActive = false;
    bossSpawnScore = 300;
    scrollOffset = 0;
    lastSpaceDown = -999;
    rollCooldownTimer = 0;
    rollingTimer = 0;
    doubleShot = false;
    doubleShotTimer = 0;
    speedBoost = false;
    speedBoostTimer = 0;

    player = { x: W / 2 - PW / 2, y: H - 80 };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    powerUps = [];
    particles = [];
    explosions = [];

    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    initGround();
    game.showOverlay('1942', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
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
    tick++;
    scrollOffset = (scrollOffset + SCROLL_SPEED) % (H * 2);

    // Cooldowns
    if (fireCooldown > 0) fireCooldown--;
    if (rollCooldownTimer > 0) rollCooldownTimer--;
    if (rollingTimer > 0) rollingTimer--;
    if (doubleShotTimer > 0) {
      doubleShotTimer--;
      if (doubleShotTimer <= 0) doubleShot = false;
    }
    if (speedBoostTimer > 0) {
      speedBoostTimer--;
      if (speedBoostTimer <= 0) speedBoost = false;
    }

    // Player movement
    const spd = speedBoost ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    if (input.isDown('ArrowLeft')) player.x -= spd;
    if (input.isDown('ArrowRight')) player.x += spd;
    if (input.isDown('ArrowUp')) player.y -= spd;
    if (input.isDown('ArrowDown')) player.y += spd;
    player.x = Math.max(0, Math.min(W - PW, player.x));
    player.y = Math.max(H * 0.3, Math.min(H - PH - 10, player.y));

    // Shift triggers roll
    if (input.wasPressed('Shift')) {
      startRoll();
    }

    // Double-tap space triggers roll
    if (input.wasPressed(' ')) {
      if (tick - lastSpaceDown < DOUBLE_TAP_WINDOW) {
        startRoll();
      }
      lastSpaceDown = tick;
    }

    // Auto-fire while holding space
    if (input.isDown(' ') && fireCooldown <= 0 && rollingTimer <= 0) {
      fireBullet();
      fireCooldown = FIRE_RATE;
    }

    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) bullets.splice(i, 1);
    }

    // Wave spawning
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) {
      waveTimer++;
      if (waveTimer > 60) {
        waveTimer = 0;
        bossActive = false;
        spawnWave();
      }
    }

    // Enemy update
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }

      e.patternTimer++;

      // Movement patterns
      switch (e.pattern) {
        case 'straight':
          e.y += e.speed;
          break;
        case 'sine':
          e.y += e.speed;
          e.x += Math.sin(e.patternTimer * 0.04 + e.patternPhase) * 2;
          break;
        case 'swoopRight':
          e.x += e.speed * 1.2;
          e.y += e.speed * 0.8;
          break;
        case 'swoopLeft':
          e.x -= e.speed * 1.2;
          e.y += e.speed * 0.8;
          break;
        case 'boss':
          if (e.y < 60) {
            e.y += e.speed;
          } else {
            e.x += Math.sin(e.patternTimer * 0.02) * 2;
            e.y = 60 + Math.sin(e.patternTimer * 0.015) * 20;
          }
          e.x = Math.max(10, Math.min(W - e.w - 10, e.x));
          break;
      }

      // Enemy firing
      e.fireTimer--;
      if (e.fireTimer <= 0 && e.y > 0 && e.y < H * 0.7) {
        e.fireTimer = e.fireRate + Math.floor(Math.random() * 30);
        const bx = e.x + e.w / 2;
        const by = e.y + e.h;

        if (e.type === 'boss') {
          for (let a = -1; a <= 1; a++) {
            enemyBullets.push({
              x: bx + a * 20, y: by,
              vx: a * 1.5,
              vy: ENEMY_BULLET_SPEED + waveNumber * 0.1
            });
          }
          const dx = (player.x + PW / 2) - bx;
          const dy = (player.y + PH / 2) - by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const spd2 = ENEMY_BULLET_SPEED + 0.5;
          enemyBullets.push({ x: bx, y: by, vx: dx / dist * spd2, vy: dy / dist * spd2 });
        } else {
          const dx = (player.x + PW / 2) - bx;
          const dy = (player.y + PH / 2) - by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const aim = 0.3;
          const espd = ENEMY_BULLET_SPEED + waveNumber * 0.05;
          enemyBullets.push({
            x: bx, y: by,
            vx: dx / dist * espd * aim,
            vy: espd
          });
        }
      }

      // Off-screen removal
      if (e.y > H + 40 || e.x < -60 || e.x > W + 60) {
        enemies.splice(i, 1);
        continue;
      }

      // Bullet-enemy collision
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          bullets.splice(j, 1);
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            score += e.points;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? 20 : 8);
            spawnPowerUp(e.x + e.w / 2, e.y + e.h / 2);
          } else {
            spawnParticles(b.x, b.y, 3, '#fff');
          }
          break;
        }
      }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }

      // Hit player (not while rolling)
      if (rollingTimer <= 0) {
        if (b.x >= player.x + 4 && b.x <= player.x + PW - 4 &&
            b.y >= player.y + 4 && b.y <= player.y + PH - 4) {
          enemyBullets.splice(i, 1);
          hitPlayer();
          break;
        }
      }
    }

    // Enemy-player collision (not while rolling)
    if (rollingTimer <= 0) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (player.x + 4 < e.x + e.w && player.x + PW - 4 > e.x &&
            player.y + 4 < e.y + e.h && player.y + PH - 4 > e.y) {
          e.alive = false;
          score += e.points;
          scoreEl.textContent = score;
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, 8);
          hitPlayer();
          break;
        }
      }
    }

    // Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.y += p.speed;
      if (p.y > H + 20) { powerUps.splice(i, 1); continue; }

      if (player.x < p.x + p.w && player.x + PW > p.x &&
          player.y < p.y + p.h && player.y + PH > p.y) {
        if (p.type === 'doubleShot') {
          doubleShot = true;
          doubleShotTimer = 600;
        } else if (p.type === 'speedBoost') {
          speedBoost = true;
          speedBoostTimer = 480;
        }
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, THEME);
        powerUps.splice(i, 1);
      }
    }

    // Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life--;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Ocean background
    renderer.fillRect(0, 0, W, H, '#0a1628');

    // Parallax ground — islands as filled ellipse-approximated polygons,
    // waves as short horizontal lines
    groundTiles.forEach(t => {
      let ty = (t.y + scrollOffset) % (H * 2) - H * 0.5;
      if (t.type === 'island') {
        // Approximate ellipse with polygon
        const rx = t.w / 2;
        const ry = t.h / 2;
        const alpha = 0.4 + t.shade;
        const r = Math.round(30 * alpha);
        const g = Math.round(80 * alpha);
        const b2 = Math.round(50 * alpha);
        const islandColor = `rgb(${r},${g},${b2})`;
        const pts = [];
        const segs = 12;
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          pts.push({ x: t.x + Math.cos(a) * rx, y: ty + Math.sin(a) * ry });
        }
        renderer.fillPoly(pts, islandColor);

        // Shore highlight
        const shoreColor = 'rgba(80,140,100,0.3)';
        const shorePts = [];
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          shorePts.push({ x: t.x + Math.cos(a) * (rx + 2), y: ty + Math.sin(a) * (ry + 2) });
        }
        renderer.strokePoly(shorePts, shoreColor, 1, true);
      } else {
        // Ocean wave — simple horizontal line
        const waveAlpha = 0.15 + t.shade * 0.2;
        const waveColor = `rgba(40,80,120,${waveAlpha})`;
        renderer.drawLine(t.x - t.w / 2, ty, t.x + t.w / 2, ty, waveColor, 1);
      }
    });

    // Power-ups
    powerUps.forEach(p => {
      const pulse = Math.sin(tick * 0.1) * 0.3 + 0.7;
      if (p.type === 'doubleShot') {
        const c = `rgba(255,200,50,${pulse})`;
        renderer.setGlow('#fc3', 0.5);
        renderer.fillRect(p.x + 4, p.y + 2, 4, 16, c);
        renderer.fillRect(p.x + 12, p.y + 2, 4, 16, c);
        renderer.setGlow(null);
      } else {
        const c = `rgba(100,200,255,${pulse})`;
        renderer.setGlow('#4cf', 0.5);
        // Speed icon — arrow shape
        renderer.fillPoly([
          { x: p.x + 10, y: p.y },
          { x: p.x + 20, y: p.y + 10 },
          { x: p.x + 10, y: p.y + 20 },
          { x: p.x + 10, y: p.y + 14 },
          { x: p.x, y: p.y + 14 },
          { x: p.x, y: p.y + 6 },
          { x: p.x + 10, y: p.y + 6 }
        ], c);
        renderer.setGlow(null);
      }
    });

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    enemyBullets.forEach(b => {
      renderer.fillCircle(b.x, b.y, 3, '#f44');
    });
    renderer.setGlow(null);

    // Enemies
    enemies.forEach(e => {
      if (!e.alive) return;
      drawEnemy(renderer, text, e);
    });

    // Player bullets
    renderer.setGlow(THEME, 0.5);
    bullets.forEach(b => {
      renderer.fillRect(b.x - 2, b.y, 4, 10, THEME);
    });
    renderer.setGlow(null);

    // Player
    drawPlayer(renderer);

    // Explosions
    explosions.forEach(ex => {
      const pct = ex.life / ex.maxLife;
      const r = ex.size * (1 - pct * 0.5);
      const green = Math.floor(120 + pct * 135);
      const blue = Math.floor(pct * 80);
      const alpha = pct * 0.7;
      const c = `rgba(255,${green},${blue},${alpha})`;
      renderer.setGlow('#f84', 0.6);
      renderer.fillCircle(ex.x, ex.y, r, c);
      renderer.setGlow(null);
    });

    // Particles
    particles.forEach(p => {
      const alpha = Math.min(1, p.life / 30);
      // Approximate color with alpha
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, applyAlpha(p.color, alpha));
    });

    // Power-up timer bars (on-canvas HUD)
    drawPowerUpTimers(renderer, text);

    // Roll cooldown indicator
    if (rollCooldownTimer > 0) {
      const pct = rollCooldownTimer / ROLL_COOLDOWN;
      renderer.fillRect(W - 50, H - 14, 40 * (1 - pct), 6, 'rgba(102,221,187,0.3)');
      // Border for roll cooldown bar
      renderer.strokePoly([
        { x: W - 50, y: H - 14 },
        { x: W - 10, y: H - 14 },
        { x: W - 10, y: H - 8 },
        { x: W - 50, y: H - 8 }
      ], 'rgba(102,221,187,0.5)', 1, true);
    }
  };

  game.start();
  return game;
}

// ── Helper: apply alpha to hex/named color ──
function applyAlpha(color, alpha) {
  if (alpha >= 1) return color;
  // Parse common hex colors
  if (color.startsWith('#')) {
    let r, g, b;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
  return color; // fallback
}

// ── Draw helpers ──

function drawPlayer(renderer) {
  const px = player.x, py = player.y;
  const cx = px + PW / 2, cy = py + PH / 2;

  // During roll, draw with reduced width to simulate spinning
  if (rollingTimer > 0) {
    const rollPct = rollingTimer / ROLL_DURATION;
    const scaleX = Math.cos(rollPct * Math.PI * 3);
    const absScale = Math.abs(scaleX) * 0.7 + 0.3;
    const alpha = 0.4 + Math.abs(scaleX) * 0.6;
    // Draw a scaled version — scale the x coordinates around center
    drawPlayerShapeScaled(renderer, cx, cy, absScale, alpha);
    return;
  }

  drawPlayerShape(renderer, cx, cy);

  // Speed boost trail
  if (speedBoost) {
    renderer.fillPoly([
      { x: px + 4, y: py + PH },
      { x: px + PW / 2, y: py + PH + 15 },
      { x: px + PW - 4, y: py + PH }
    ], 'rgba(100,200,255,0.3)');
  }
}

function drawPlayerShape(renderer, cx, cy) {
  renderer.setGlow(THEME, 0.5);

  // Fuselage
  renderer.fillPoly([
    { x: cx, y: cy - PH / 2 },
    { x: cx + 5, y: cy - 6 },
    { x: cx + 5, y: cy + PH / 2 - 4 },
    { x: cx - 5, y: cy + PH / 2 - 4 },
    { x: cx - 5, y: cy - 6 }
  ], THEME);

  // Left wing
  renderer.fillPoly([
    { x: cx - 4, y: cy },
    { x: cx - PW / 2, y: cy + 8 },
    { x: cx - PW / 2, y: cy + 12 },
    { x: cx - 4, y: cy + 6 }
  ], THEME);

  // Right wing
  renderer.fillPoly([
    { x: cx + 4, y: cy },
    { x: cx + PW / 2, y: cy + 8 },
    { x: cx + PW / 2, y: cy + 12 },
    { x: cx + 4, y: cy + 6 }
  ], THEME);

  // Left tail
  renderer.fillPoly([
    { x: cx - 3, y: cy + PH / 2 - 6 },
    { x: cx - 10, y: cy + PH / 2 },
    { x: cx - 3, y: cy + PH / 2 - 2 }
  ], THEME);

  // Right tail
  renderer.fillPoly([
    { x: cx + 3, y: cy + PH / 2 - 6 },
    { x: cx + 10, y: cy + PH / 2 },
    { x: cx + 3, y: cy + PH / 2 - 2 }
  ], THEME);

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 3, y: (cy - 4) + Math.sin(a) * 5 });
  }
  renderer.fillPoly(cockpitPts, '#aef');

  // Engine glow
  renderer.setGlow('#f84', 0.5);
  const enginePts = [];
  const engineRx = 3, engineRy = 5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    enginePts.push({ x: cx + Math.cos(a) * engineRx, y: (cy + PH / 2 - 2) + Math.sin(a) * engineRy });
  }
  renderer.fillPoly(enginePts, '#fa4');

  renderer.setGlow(null);
}

function drawPlayerShapeScaled(renderer, cx, cy, scaleX, alpha) {
  // Apply horizontal scale by adjusting x offsets
  const s = scaleX;
  const col = applyAlpha(THEME, alpha);

  renderer.setGlow(THEME, 0.3 * alpha);

  // Fuselage
  renderer.fillPoly([
    { x: cx, y: cy - PH / 2 },
    { x: cx + 5 * s, y: cy - 6 },
    { x: cx + 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy - 6 }
  ], col);

  // Left wing
  renderer.fillPoly([
    { x: cx - 4 * s, y: cy },
    { x: cx - PW / 2 * s, y: cy + 8 },
    { x: cx - PW / 2 * s, y: cy + 12 },
    { x: cx - 4 * s, y: cy + 6 }
  ], col);

  // Right wing
  renderer.fillPoly([
    { x: cx + 4 * s, y: cy },
    { x: cx + PW / 2 * s, y: cy + 8 },
    { x: cx + PW / 2 * s, y: cy + 12 },
    { x: cx + 4 * s, y: cy + 6 }
  ], col);

  // Left tail
  renderer.fillPoly([
    { x: cx - 3 * s, y: cy + PH / 2 - 6 },
    { x: cx - 10 * s, y: cy + PH / 2 },
    { x: cx - 3 * s, y: cy + PH / 2 - 2 }
  ], col);

  // Right tail
  renderer.fillPoly([
    { x: cx + 3 * s, y: cy + PH / 2 - 6 },
    { x: cx + 10 * s, y: cy + PH / 2 },
    { x: cx + 3 * s, y: cy + PH / 2 - 2 }
  ], col);

  renderer.setGlow(null);
}

function drawEnemy(renderer, text, e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;

  switch (e.type) {
    case 'fighter':
      drawEnemyFighter(renderer, cx, cy, e);
      break;
    case 'bomber':
      drawEnemyBomber(renderer, cx, cy, e);
      break;
    case 'ace':
      drawEnemyAce(renderer, cx, cy, e);
      break;
    case 'boss':
      drawBoss(renderer, e);
      break;
  }
}

function drawEnemyFighter(renderer, cx, cy, e) {
  renderer.setGlow('#f55', 0.4);

  // Body (inverted — nose points down)
  renderer.fillPoly([
    { x: cx, y: cy + e.h / 2 },
    { x: cx + 4, y: cy + 2 },
    { x: cx + e.w / 2 - 2, y: cy - 4 },
    { x: cx + e.w / 2 - 2, y: cy - e.h / 2 + 2 },
    { x: cx - e.w / 2 + 2, y: cy - e.h / 2 + 2 },
    { x: cx - e.w / 2 + 2, y: cy - 4 },
    { x: cx - 4, y: cy + 2 }
  ], '#f55');

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 3, y: cy + Math.sin(a) * 4 });
  }
  renderer.fillPoly(cockpitPts, '#400');

  renderer.setGlow(null);
}

function drawEnemyBomber(renderer, cx, cy, e) {
  renderer.setGlow('#e80', 0.5);

  // Wide body
  renderer.fillRect(cx - e.w / 2 + 2, cy - e.h / 2 + 4, e.w - 4, e.h - 8, '#e80');
  // Wings
  renderer.fillRect(cx - e.w / 2 - 4, cy - 4, e.w + 8, 10, '#e80');
  // Nose
  renderer.fillPoly([
    { x: cx - 6, y: cy + e.h / 2 - 4 },
    { x: cx, y: cy + e.h / 2 + 2 },
    { x: cx + 6, y: cy + e.h / 2 - 4 }
  ], '#e80');

  // Cockpit
  renderer.fillRect(cx - 4, cy - 3, 8, 6, '#420');

  // HP indicator
  if (e.hp > 1) {
    for (let d = 0; d < e.hp; d++) {
      renderer.fillRect(cx - 4 + d * 5, cy - e.h / 2, 3, 3, '#ff0');
    }
  }

  renderer.setGlow(null);
}

function drawEnemyAce(renderer, cx, cy, e) {
  renderer.setGlow('#f4f', 0.5);

  // Sleek body
  renderer.fillPoly([
    { x: cx, y: cy + e.h / 2 },
    { x: cx + e.w / 2, y: cy - e.h / 4 },
    { x: cx + e.w / 4, y: cy - e.h / 2 },
    { x: cx - e.w / 4, y: cy - e.h / 2 },
    { x: cx - e.w / 2, y: cy - e.h / 4 }
  ], '#f4f');

  // Stripe
  renderer.fillRect(cx - 2, cy - e.h / 2 + 2, 4, e.h - 4, '#808');

  // HP indicator
  if (e.hp > 1) {
    for (let d = 0; d < e.hp; d++) {
      renderer.fillRect(cx - 4 + d * 5, cy - e.h / 2 - 3, 3, 3, '#ff0');
    }
  }

  renderer.setGlow(null);
}

function drawBoss(renderer, e) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;

  const pulse = Math.sin(tick * 0.06) * 0.3 + 0.7;
  const bossColor = `rgba(255,60,60,${pulse})`;

  renderer.setGlow('#f44', 0.8);

  // Large fuselage
  renderer.fillRect(cx - 12, cy - e.h / 2, 24, e.h, bossColor);
  // Wide wings
  renderer.fillRect(cx - e.w / 2, cy - 8, e.w, 18, bossColor);

  // Left wing tip
  renderer.fillPoly([
    { x: cx - e.w / 2, y: cy - 8 },
    { x: cx - e.w / 2 - 6, y: cy + 4 },
    { x: cx - e.w / 2, y: cy + 10 }
  ], bossColor);

  // Right wing tip
  renderer.fillPoly([
    { x: cx + e.w / 2, y: cy - 8 },
    { x: cx + e.w / 2 + 6, y: cy + 4 },
    { x: cx + e.w / 2, y: cy + 10 }
  ], bossColor);

  // Nose
  renderer.fillPoly([
    { x: cx - 8, y: cy + e.h / 2 },
    { x: cx, y: cy + e.h / 2 + 10 },
    { x: cx + 8, y: cy + e.h / 2 }
  ], bossColor);

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 6, y: (cy + 2) + Math.sin(a) * 8 });
  }
  renderer.fillPoly(cockpitPts, '#400');

  // Engine flames
  const flameColor = `rgba(255,160,40,${pulse})`;
  renderer.setGlow('#f84', 0.6);

  const lFlame = [];
  const rFlame = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lFlame.push({ x: (cx - 10) + Math.cos(a) * 4, y: (cy - e.h / 2) + Math.sin(a) * 7 });
    rFlame.push({ x: (cx + 10) + Math.cos(a) * 4, y: (cy - e.h / 2) + Math.sin(a) * 7 });
  }
  renderer.fillPoly(lFlame, flameColor);
  renderer.fillPoly(rFlame, flameColor);

  renderer.setGlow(null);

  // Health bar
  const barW = e.w + 20;
  const hpPct = e.hp / e.maxHp;
  renderer.fillRect(cx - barW / 2, e.y - 12, barW, 6, '#400');
  const hpColor = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
  renderer.fillRect(cx - barW / 2, e.y - 12, barW * hpPct, 6, hpColor);
  renderer.strokePoly([
    { x: cx - barW / 2, y: e.y - 12 },
    { x: cx + barW / 2, y: e.y - 12 },
    { x: cx + barW / 2, y: e.y - 6 },
    { x: cx - barW / 2, y: e.y - 6 }
  ], '#666', 1, true);
}

function drawPowerUpTimers(renderer, text) {
  let yOff = 20;
  if (doubleShot) {
    const pct = doubleShotTimer / 600;
    text.drawText('DOUBLE SHOT', 10, yOff - 10, 12, 'rgba(255,200,50,0.8)', 'left');
    renderer.fillRect(10, yOff + 4, 80, 4, '#333');
    renderer.fillRect(10, yOff + 4, 80 * pct, 4, '#fc3');
    yOff += 24;
  }
  if (speedBoost) {
    const pct = speedBoostTimer / 480;
    text.drawText('SPEED BOOST', 10, yOff - 10, 12, 'rgba(100,200,255,0.8)', 'left');
    renderer.fillRect(10, yOff + 4, 80, 4, '#333');
    renderer.fillRect(10, yOff + 4, 80 * pct, 4, '#4cf');
    yOff += 24;
  }
}
