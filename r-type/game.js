// r-type/game.js — R-Type game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 512;
const H = 400;

// Constants
const PLAYER_W = 28, PLAYER_H = 14;
const PLAYER_SPEED = 3.5;
const CHARGE_MAX = 90; // frames to full charge
const SCROLL_SPEED = 1;

// Power-up types
const PU_FORCE = 0, PU_WAVE = 1, PU_BOUNCE = 2, PU_SPEED = 3;

// ── State ──
let score, best = 0;
let lives, wave, tick;
let player, bullets, enemies, enemyBullets, particles, powerUps;
let forcePod, scrollX, starField;
let chargeTime, charging, chargeMax;
let spawnTimer, spawnQueue;
let terrain;
let boss, bossActive;
let waveIntroTimer, waveIntroText;
let autoFireTimer;
const AUTO_FIRE_RATE = 8;

// Deferred spawns (replaces setTimeout)
let deferredSpawns;

// DOM refs
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');

// ── Star field (parallax) ──
function genStars() {
  starField = [];
  for (let i = 0; i < 80; i++) {
    starField.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.2 + Math.random() * 1.2,
      size: Math.random() < 0.3 ? 2 : 1,
      brightness: 40 + Math.floor(Math.random() * 60)
    });
  }
}

// ── Terrain generation ──
function genTerrain() {
  terrain = { top: [], bottom: [] };
  for (let x = 0; x < W + 200; x += 4) {
    const t = x * 0.01;
    terrain.top.push(Math.sin(t) * 15 + Math.sin(t * 2.3) * 8 + 25);
    terrain.bottom.push(Math.sin(t + 2) * 15 + Math.sin(t * 1.7 + 1) * 10 + 25);
  }
}

// ── Wave definitions ──
const WAVES = [
  { // Wave 1: Basic scouts
    name: 'Scout Patrol',
    spawns: [
      { type: 'scout', count: 6, delay: 40, pattern: 'line' },
      { type: 'scout', count: 6, delay: 40, pattern: 'sine' },
      { type: 'powerup', puType: PU_FORCE, delay: 80 },
      { type: 'scout', count: 8, delay: 30, pattern: 'line' },
    ]
  },
  { // Wave 2: Drifters
    name: 'Drifter Swarm',
    spawns: [
      { type: 'drifter', count: 5, delay: 50, pattern: 'spread' },
      { type: 'scout', count: 6, delay: 35, pattern: 'sine' },
      { type: 'powerup', puType: PU_WAVE, delay: 60 },
      { type: 'drifter', count: 8, delay: 35, pattern: 'spread' },
      { type: 'scout', count: 5, delay: 40, pattern: 'line' },
    ]
  },
  { // Wave 3: Chargers
    name: 'Charger Rush',
    spawns: [
      { type: 'charger', count: 4, delay: 60, pattern: 'line' },
      { type: 'scout', count: 6, delay: 30, pattern: 'sine' },
      { type: 'powerup', puType: PU_BOUNCE, delay: 80 },
      { type: 'charger', count: 6, delay: 45, pattern: 'line' },
      { type: 'drifter', count: 5, delay: 40, pattern: 'spread' },
    ]
  },
  { // Wave 4: Turrets and mixed
    name: 'Organic Defenses',
    spawns: [
      { type: 'turret', count: 3, delay: 80, pattern: 'fixed' },
      { type: 'scout', count: 8, delay: 25, pattern: 'sine' },
      { type: 'powerup', puType: PU_SPEED, delay: 60 },
      { type: 'drifter', count: 6, delay: 35, pattern: 'spread' },
      { type: 'charger', count: 4, delay: 50, pattern: 'line' },
      { type: 'turret', count: 2, delay: 90, pattern: 'fixed' },
    ]
  },
  { // Wave 5: Boss - Dobkeratops
    name: 'BOSS: Dobkeratops',
    spawns: [
      { type: 'powerup', puType: PU_FORCE, delay: 30 },
      { type: 'boss', bossType: 'dobkeratops', delay: 120 },
    ]
  },
  { // Wave 6: Harder scouts + snakes
    name: 'Serpent Approach',
    spawns: [
      { type: 'snake', count: 1, delay: 60, segments: 8 },
      { type: 'scout', count: 8, delay: 25, pattern: 'sine' },
      { type: 'powerup', puType: PU_WAVE, delay: 60 },
      { type: 'snake', count: 1, delay: 50, segments: 10 },
      { type: 'charger', count: 6, delay: 40, pattern: 'line' },
      { type: 'drifter', count: 6, delay: 35, pattern: 'spread' },
    ]
  },
  { // Wave 7: Dense mixed
    name: 'Full Assault',
    spawns: [
      { type: 'turret', count: 4, delay: 70, pattern: 'fixed' },
      { type: 'charger', count: 6, delay: 35, pattern: 'line' },
      { type: 'powerup', puType: PU_BOUNCE, delay: 50 },
      { type: 'scout', count: 10, delay: 20, pattern: 'sine' },
      { type: 'snake', count: 1, delay: 50, segments: 12 },
      { type: 'drifter', count: 8, delay: 30, pattern: 'spread' },
    ]
  },
  { // Wave 8: Boss - Gomander
    name: 'BOSS: Gomander',
    spawns: [
      { type: 'powerup', puType: PU_FORCE, delay: 30 },
      { type: 'powerup', puType: PU_WAVE, delay: 60 },
      { type: 'boss', bossType: 'gomander', delay: 120 },
    ]
  },
];

// ── Collision ──
function rectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// ── Particles ──
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.floor(Math.random() * 15),
      color
    });
  }
}

// ── Spawners ──
function spawnEnemy(type, pattern, idx, total, gameRef) {
  if (gameRef.state !== 'playing') return;
  const e = {
    type, x: W + 20, y: 0, vx: -2, vy: 0,
    hp: 1, points: 10, tick: 0,
    w: 20, h: 16, baseY: 0, phase: idx * 0.5,
    shootTimer: 60 + Math.floor(Math.random() * 60)
  };

  switch (type) {
    case 'scout':
      e.hp = 1; e.points = 10; e.w = 18; e.h = 14;
      e.vx = -2.5;
      if (pattern === 'sine') {
        e.y = H * 0.2 + (H * 0.6 / total) * idx;
        e.baseY = e.y;
        e.moveFn = 'sine';
      } else {
        e.y = 40 + (H - 80) * (idx / Math.max(total - 1, 1));
        e.moveFn = 'straight';
      }
      break;
    case 'drifter':
      e.hp = 2; e.points = 20; e.w = 22; e.h = 18;
      e.vx = -1.5;
      if (pattern === 'spread') {
        e.y = 30 + Math.random() * (H - 60);
        e.baseY = e.y;
      } else {
        e.y = H / 2;
        e.baseY = H / 2;
      }
      e.moveFn = 'drift';
      break;
    case 'charger':
      e.hp = 1; e.points = 25; e.w = 20; e.h = 12;
      e.vx = -1;
      e.y = 30 + Math.random() * (H - 60);
      e.moveFn = 'charge';
      e.charging = false;
      e.chargeTimer = 60 + Math.floor(Math.random() * 40);
      break;
    case 'turret':
      e.hp = 4; e.points = 40; e.w = 24; e.h = 24;
      e.vx = -0.8;
      if (pattern === 'fixed') {
        e.y = Math.random() < 0.5 ? 30 + Math.random() * 40 : H - 70 + Math.random() * 40;
      } else {
        e.y = 40 + Math.random() * (H - 80);
      }
      e.moveFn = 'turret';
      e.shootTimer = 30;
      break;
  }
  enemies.push(e);
}

function spawnSnake(segments, gameRef) {
  if (gameRef.state !== 'playing') return;
  const startY = 60 + Math.random() * (H - 120);
  for (let i = 0; i < segments; i++) {
    const e = {
      type: 'snake', x: W + 20 + i * 16, y: startY,
      vx: -2, vy: 0, hp: i === 0 ? 3 : 1,
      points: i === 0 ? 50 : 10, tick: 0,
      w: 16, h: 14, baseY: startY,
      phase: i * 0.4, segIdx: i, isHead: i === 0,
      moveFn: 'snake', shootTimer: 999
    };
    enemies.push(e);
  }
}

function spawnBoss(bossType) {
  bossActive = true;
  if (bossType === 'dobkeratops') {
    boss = {
      type: 'dobkeratops', x: W - 100, y: H / 2 - 50,
      w: 80, h: 100, hp: 60, maxHp: 60, points: 500,
      tick: 0, phase: 0, parts: [
        { x: 0, y: -20, w: 30, h: 20, hp: 15, maxHp: 15, alive: true },
        { x: 0, y: 80, w: 30, h: 20, hp: 15, maxHp: 15, alive: true },
        { x: 30, y: 30, w: 20, h: 40, hp: 30, maxHp: 30, alive: true },
      ]
    };
  } else {
    boss = {
      type: 'gomander', x: W - 80, y: H / 2 - 60,
      w: 70, h: 120, hp: 90, maxHp: 90, points: 800,
      tick: 0, phase: 0, parts: [
        { x: -10, y: 0, w: 25, h: 30, hp: 20, maxHp: 20, alive: true },
        { x: -10, y: 90, w: 25, h: 30, hp: 20, maxHp: 20, alive: true },
        { x: 20, y: 40, w: 30, h: 40, hp: 50, maxHp: 50, alive: true },
      ]
    };
  }
  enemies.push({
    type: 'boss', x: boss.x, y: boss.y,
    w: boss.w, h: boss.h, hp: boss.hp,
    points: 0, tick: 0, moveFn: 'boss',
    isBoss: true, shootTimer: 40
  });
}

function spawnPowerUp(puType) {
  powerUps.push({
    type: puType,
    x: W + 10,
    y: 60 + Math.random() * (H - 120),
    tick: 0
  });
}

// ── Collect power-up ──
function collectPowerUp(p) {
  score += 50;
  scoreEl.textContent = score;
  spawnParticles(p.x + 8, p.y + 8, '#ff0', 8);
  switch (p.type) {
    case PU_FORCE:
      if (!forcePod) {
        forcePod = { x: p.x, y: p.y, attached: false, front: true };
      } else {
        forcePod.front = !forcePod.front;
      }
      break;
    case PU_WAVE:
      player.weapon = 'wave';
      break;
    case PU_BOUNCE:
      player.weapon = 'bounce';
      break;
    case PU_SPEED:
      player.speedBoost = true;
      break;
  }
}

// ── Firing ──
function fire() {
  bullets.push({
    x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 1,
    vx: 7, vy: 0, damage: 1, type: 'normal', life: 120
  });
}

function fireCharged() {
  const power = chargeTime / chargeMax;
  if (power < 0.2) {
    fire();
  } else if (power < 0.6) {
    bullets.push({
      x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 3,
      vx: 8, vy: 0, damage: 3, type: 'charge_med', life: 150
    });
  } else {
    bullets.push({
      x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 5,
      vx: 6, vy: 0, damage: 8, type: 'charge_full', life: 180
    });
  }
  chargeTime = 0;
}

function fireWeapon() {
  switch (player.weapon) {
    case 'wave':
      bullets.push({
        x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 1,
        vx: 5, vy: 0, damage: 1, type: 'wave', life: 100,
        amplitude: 0, wavePhase: tick * 0.1
      });
      break;
    case 'bounce':
      bullets.push({
        x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 1,
        vx: 5, vy: 2.5, damage: 1, type: 'bounce', life: 200
      });
      bullets.push({
        x: player.x + PLAYER_W, y: player.y + PLAYER_H / 2 - 1,
        vx: 5, vy: -2.5, damage: 1, type: 'bounce', life: 200
      });
      break;
    default:
      fire();
      break;
  }
}

// ── Enemy AI ──
function updateEnemy(e) {
  switch (e.moveFn) {
    case 'straight':
      e.x += e.vx;
      break;
    case 'sine':
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.tick * 0.04 + e.phase) * 40;
      break;
    case 'drift':
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.tick * 0.02 + e.phase) * 60;
      break;
    case 'charge':
      if (!e.charging) {
        e.x += e.vx;
        e.chargeTimer--;
        if (e.chargeTimer <= 0 && e.x < W - 60) {
          e.charging = true;
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          e.vx = dx / dist * 5;
          e.vy = dy / dist * 5;
        }
      } else {
        e.x += e.vx;
        e.y += e.vy;
      }
      break;
    case 'turret':
      e.x += e.vx;
      e.shootTimer--;
      if (e.shootTimer <= 0 && e.x < W - 20) {
        e.shootTimer = 50 + Math.floor(Math.random() * 30);
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        enemyBullets.push({
          x: e.x, y: e.y + e.h / 2,
          vx: dx / dist * 3, vy: dy / dist * 3
        });
      }
      break;
    case 'snake':
      e.x += e.vx;
      e.y = e.baseY + Math.sin(e.tick * 0.05 + e.phase) * 50;
      break;
    case 'boss':
      if (boss) {
        boss.tick++;
        boss.y = H / 2 - boss.h / 2 + Math.sin(boss.tick * 0.015) * 80;
        boss.x = W - boss.w - 20 + Math.sin(boss.tick * 0.01) * 30;
        e.x = boss.x; e.y = boss.y;
        e.hp = boss.hp;

        e.shootTimer--;
        if (e.shootTimer <= 0) {
          e.shootTimer = 35 + Math.floor(Math.random() * 20);
          const bx = boss.x;
          const by = boss.y + boss.h / 2;
          for (let a = -2; a <= 2; a++) {
            enemyBullets.push({ x: bx, y: by, vx: -3, vy: a * 1.2 });
          }
          boss.parts.forEach(p => {
            if (p.alive) {
              const px = boss.x + p.x;
              const py = boss.y + p.y + p.h / 2;
              const dx = player.x - px;
              const dy = player.y - py;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              enemyBullets.push({
                x: px, y: py,
                vx: dx / dist * 2.5, vy: dy / dist * 2.5
              });
            }
          });
        }

        // Bullet vs boss parts
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          for (const p of boss.parts) {
            if (!p.alive) continue;
            const px = boss.x + p.x, py = boss.y + p.y;
            if (rectCollide(b.x - 2, b.y - 2, 4, 4, px, py, p.w, p.h)) {
              p.hp -= b.damage;
              boss.hp -= b.damage;
              bullets.splice(j, 1);
              spawnParticles(b.x, b.y, '#f80', 3);
              if (p.hp <= 0) {
                p.alive = false;
                spawnParticles(px + p.w / 2, py + p.h / 2, '#ff0', 10);
                score += 100;
                scoreEl.textContent = score;
              }
              break;
            }
          }
        }
      }
      break;
  }

  // Regular enemy shooting
  if (e.moveFn !== 'boss' && e.moveFn !== 'snake') {
    e.shootTimer--;
    if (e.shootTimer <= 0 && e.x > 20 && e.x < W - 20) {
      e.shootTimer = 80 + Math.floor(Math.random() * 60);
      if (e.type === 'drifter') {
        for (let a = -1; a <= 1; a++) {
          enemyBullets.push({ x: e.x, y: e.y + (e.h || 16) / 2, vx: -3, vy: a * 1.5 });
        }
      } else {
        enemyBullets.push({ x: e.x, y: e.y + (e.h || 16) / 2, vx: -3.5, vy: 0 });
      }
    }
  }
}

function destroyEnemy(e) {
  score += e.points;
  scoreEl.textContent = score;
  if (score > best) best = score;
  const color = e.type === 'scout' ? '#4f4' : e.type === 'drifter' ? '#48f' :
                e.type === 'charger' ? '#f80' : e.type === 'turret' ? '#f44' :
                e.type === 'snake' ? '#a4f' : '#ff0';
  spawnParticles(e.x + (e.w || 20) / 2, e.y + (e.h || 16) / 2, color, 8);
}

function playerHit(gameRef) {
  if (player.invuln > 0) return;
  lives--;
  livesEl.textContent = lives;
  spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#f8e', 15);

  if (lives <= 0) {
    gameRef.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    gameRef.setState('over');
    return;
  }

  player.x = 60;
  player.y = H / 2;
  player.invuln = 120;
  player.weapon = 'normal';
  player.speedBoost = false;
  if (forcePod) {
    forcePod.attached = false;
    forcePod.x = player.x + 40;
    forcePod.y = player.y;
  }
  chargeTime = 0;
  charging = false;
}

// ── Wave start ──
function startWave(gameRef) {
  wave++;
  if (wave > WAVES.length) wave = WAVES.length;
  waveEl.textContent = wave;
  const wDef = WAVES[wave - 1];
  spawnQueue = [];
  let totalDelay = 0;
  wDef.spawns.forEach(s => {
    totalDelay += s.delay;
    spawnQueue.push({ ...s, time: totalDelay });
  });
  spawnTimer = 0;
  bossActive = false;
  boss = null;
  waveIntroTimer = 90;
  waveIntroText = wDef.name;
  deferredSpawns = [];
}

// ── Hex color to rgba with alpha ──
function colorWithAlpha(hex, alpha) {
  // hex is like '#f8e' or '#ff8800'
  let r, g, b;
  const h = hex.slice(1);
  if (h.length === 3) {
    r = parseInt(h[0], 16) * 17;
    g = parseInt(h[1], 16) * 17;
    b = parseInt(h[2], 16) * 17;
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    wave = 0;
    tick = 0;
    scrollX = 0;
    charging = false;
    chargeTime = 0;
    chargeMax = CHARGE_MAX;
    bossActive = false;
    boss = null;
    waveIntroTimer = 0;
    waveIntroText = '';
    autoFireTimer = 0;
    deferredSpawns = [];
    player = { x: 60, y: H / 2, weapon: 'normal', speedBoost: false, invuln: 0 };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerUps = [];
    forcePod = null;
    spawnTimer = 0;
    spawnQueue = [];
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    waveEl.textContent = '1';
    genStars();
    genTerrain();
    game.showOverlay('R-TYPE', 'Press SPACE to start\n\nArrows: Move | Space: Fire (hold to charge)');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        startWave(game);
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;
    scrollX += SCROLL_SPEED;

    // Stars
    for (const s of starField) {
      s.x -= s.speed;
      if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    }

    if (waveIntroTimer > 0) waveIntroTimer--;

    // Player movement
    const spd = player.speedBoost ? PLAYER_SPEED * 1.4 : PLAYER_SPEED;
    if (input.isDown('ArrowUp')) player.y -= spd;
    if (input.isDown('ArrowDown')) player.y += spd;
    if (input.isDown('ArrowLeft')) player.x -= spd;
    if (input.isDown('ArrowRight')) player.x += spd;
    player.x = Math.max(4, Math.min(W - PLAYER_W - 4, player.x));
    player.y = Math.max(4, Math.min(H - PLAYER_H - 4, player.y));

    if (player.invuln > 0) player.invuln--;

    // Charge mechanic
    if (input.wasPressed(' ')) {
      if (!charging) {
        charging = true;
        chargeTime = 0;
        fireWeapon();
      }
    }
    if (input.wasReleased(' ')) {
      if (charging) {
        charging = false;
        if (chargeTime > 15) {
          fireCharged();
        }
        chargeTime = 0;
      }
    }
    if (charging) {
      chargeTime = Math.min(chargeTime + 1, chargeMax);
    }

    // Force pod movement
    if (forcePod) {
      if (forcePod.attached) {
        if (forcePod.front) {
          forcePod.x = player.x + PLAYER_W + 2;
          forcePod.y = player.y + PLAYER_H / 2 - 6;
        } else {
          forcePod.x = player.x - 14;
          forcePod.y = player.y + PLAYER_H / 2 - 6;
        }
      } else {
        const dx = player.x + PLAYER_W / 2 - forcePod.x;
        const dy = player.y + PLAYER_H / 2 - forcePod.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          forcePod.x += dx / dist * 1.5;
          forcePod.y += dy / dist * 1.5;
        }
        if (dist < 20) {
          forcePod.attached = true;
          forcePod.front = true;
        }
      }
      if (forcePod.attached && tick % 15 === 0) {
        const dir = forcePod.front ? 1 : -1;
        bullets.push({
          x: forcePod.x + (forcePod.front ? 12 : 0),
          y: forcePod.y + 4,
          vx: 6 * dir, vy: 0,
          damage: 1, type: 'force', life: 200
        });
      }
    }

    // Spawning
    spawnTimer++;
    for (const s of spawnQueue) {
      if (s.spawned) continue;
      if (spawnTimer >= s.time) {
        s.spawned = true;
        if (s.type === 'powerup') {
          spawnPowerUp(s.puType);
        } else if (s.type === 'boss') {
          spawnBoss(s.bossType);
        } else if (s.type === 'snake') {
          spawnSnake(s.segments, game);
        } else {
          // Stagger spawns using frame-based deferred system (replaces setTimeout)
          for (let i = 0; i < s.count; i++) {
            deferredSpawns.push({
              frame: tick + Math.round(i * 180 / (1000 / 60)), // ~180ms per enemy at 60fps = ~11 frames
              type: s.type, pattern: s.pattern, idx: i, total: s.count
            });
          }
        }
      }
    }

    // Process deferred spawns
    for (let i = deferredSpawns.length - 1; i >= 0; i--) {
      const ds = deferredSpawns[i];
      if (tick >= ds.frame) {
        spawnEnemy(ds.type, ds.pattern, ds.idx, ds.total, game);
        deferredSpawns.splice(i, 1);
      }
    }

    // Check wave complete
    if (!bossActive && spawnQueue.every(s => s.spawned) && enemies.length === 0 &&
        deferredSpawns.length === 0 && spawnTimer > 60) {
      if (wave < WAVES.length) {
        startWave(game);
      } else {
        wave = 0;
        startWave(game);
      }
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.type === 'bounce') {
        if (b.y <= 2 || b.y >= H - 2) b.vy *= -1;
      }
      // Wave bullet sine motion
      if (b.type === 'wave') {
        b.amplitude += 0.15;
        b.y += Math.sin(b.amplitude + b.wavePhase) * 3;
      }
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10 || b.life <= 0) {
        bullets.splice(i, 1);
      }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }
      // Hit player
      if (!player.invuln && rectCollide(b.x - 3, b.y - 3, 6, 6, player.x + 4, player.y + 2, PLAYER_W - 8, PLAYER_H - 4)) {
        if (forcePod && forcePod.attached && forcePod.front && b.x > player.x + PLAYER_W - 5) {
          enemyBullets.splice(i, 1);
          spawnParticles(b.x, b.y, '#f8e', 3);
          continue;
        }
        enemyBullets.splice(i, 1);
        playerHit(game);
        continue;
      }
      // Force pod absorbs bullets
      if (forcePod) {
        if (rectCollide(b.x - 3, b.y - 3, 6, 6, forcePod.x, forcePod.y, 12, 12)) {
          enemyBullets.splice(i, 1);
          spawnParticles(b.x, b.y, '#f8e', 3);
        }
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.tick++;
      updateEnemy(e);

      if (e.x < -60 && !e.isBoss) {
        enemies.splice(i, 1);
        continue;
      }

      // Bullet vs enemy
      let hit = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const ew = e.w || 20, eh = e.h || 16;
        if (rectCollide(b.x - 2, b.y - 2, 4, 4, e.x, e.y, ew, eh)) {
          e.hp -= b.damage;
          bullets.splice(j, 1);
          spawnParticles(b.x, b.y, '#fff', 3);
          if (e.hp <= 0) {
            destroyEnemy(e);
            hit = true;
            break;
          }
        }
      }
      if (hit) { enemies.splice(i, 1); continue; }

      // Enemy vs player
      if (!player.invuln && !e.dead) {
        const ew = e.w || 20, eh = e.h || 16;
        if (rectCollide(e.x, e.y, ew, eh, player.x + 4, player.y + 2, PLAYER_W - 8, PLAYER_H - 4)) {
          playerHit(game);
        }
      }

      // Force pod damages enemies on contact
      if (forcePod && forcePod.attached) {
        const ew = e.w || 20, eh = e.h || 16;
        if (rectCollide(forcePod.x, forcePod.y, 12, 12, e.x, e.y, ew, eh)) {
          e.hp -= 0.5;
          spawnParticles(forcePod.x + 6, forcePod.y + 6, '#f8e', 2);
          if (e.hp <= 0) {
            destroyEnemy(e);
            enemies.splice(i, 1);
          }
        }
      }
    }

    // Boss defeated
    if (boss && boss.hp <= 0) {
      score += boss.points;
      scoreEl.textContent = score;
      if (score > best) best = score;
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#f80', 30);
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ff0', 20);
      boss = null;
      bossActive = false;
      enemyBullets = [];
    }

    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.x -= 0.5;
      if (p.x < -20) { powerUps.splice(i, 1); continue; }
      if (rectCollide(p.x, p.y, 16, 16, player.x, player.y, PLAYER_W, PLAYER_H)) {
        collectPowerUp(p);
        powerUps.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Terrain collision
    const tIdx = Math.floor((scrollX % (terrain.top.length * 4)) / 4);
    if (tIdx >= 0 && tIdx < terrain.top.length) {
      const topH = terrain.top[tIdx % terrain.top.length];
      const botH = terrain.bottom[tIdx % terrain.bottom.length];
      if (!player.invuln) {
        if (player.y < topH - 10 || player.y + PLAYER_H > H - botH + 10) {
          playerHit(game);
        }
      }
    }

    // Expose game data for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      enemyCount: enemies.length,
      bulletCount: enemyBullets.length,
      charging: charging,
      chargeLevel: chargeTime / chargeMax,
      hasForcePod: !!forcePod,
      weapon: player.weapon,
      wave: wave,
      lives: lives
    };
  };

  // ── Drawing ──
  game.onDraw = (renderer, text) => {
    // Background (handled by renderer.begin, but we use dark bg)
    renderer.fillRect(0, 0, W, H, '#0a0a18');

    // Stars
    for (const s of starField) {
      const a = s.brightness / 100;
      renderer.fillRect(s.x, s.y, s.size, s.size, colorWithAlpha('#c8c8ff', a));
    }

    // Terrain
    drawTerrain(renderer);

    // Power-ups
    for (const p of powerUps) {
      p.tick++;
      const pulse = Math.sin(p.tick * 0.1) * 0.3 + 0.7;
      const colors = ['#f8e', '#4ef', '#a4f', '#ff0'];
      const labels = ['F', 'W', 'B', 'S'];
      renderer.setGlow(colors[p.type], pulse * 0.5);
      renderer.fillCircle(p.x + 8, p.y + 8, 9, colors[p.type]);
      renderer.setGlow(null);
      text.drawText(labels[p.type], p.x + 8, p.y + 4, 10, '#000', 'center');
    }

    // Enemies (non-boss)
    for (const e of enemies) {
      if (e.moveFn === 'boss') continue;
      drawEnemy(renderer, e);
    }

    // Boss
    if (boss) drawBoss(renderer, text);

    // Force pod
    if (forcePod) {
      renderer.setGlow('#f8e', 0.7);
      renderer.fillCircle(forcePod.x + 6, forcePod.y + 6, 7, '#f8e');
      renderer.fillCircle(forcePod.x + 6, forcePod.y + 6, 4, '#faf');
      renderer.setGlow(null);
    }

    // Player
    if (game.state === 'playing' || game.state === 'waiting') {
      if (player.invuln > 0 && tick % 4 < 2) {
        // Flicker when invulnerable
      } else {
        drawPlayer(renderer);
      }
    }

    // Player bullets
    for (const b of bullets) {
      switch (b.type) {
        case 'normal':
        case 'force':
          renderer.setGlow('#f8e', 0.4);
          renderer.fillRect(b.x, b.y, 8, 3, b.type === 'force' ? '#faf' : '#f8e');
          break;
        case 'charge_med':
          renderer.setGlow('#f8e', 0.6);
          renderer.fillCircle(b.x + 8, b.y + 3, 8, '#faf');
          renderer.fillCircle(b.x + 8, b.y + 3, 5, '#fce');
          break;
        case 'charge_full':
          renderer.setGlow('#f8e', 0.9);
          renderer.fillCircle(b.x + 12, b.y + 5, 14, '#fff');
          renderer.fillCircle(b.x + 12, b.y + 5, 9, '#fce');
          break;
        case 'wave':
          renderer.setGlow('#4ef', 0.5);
          renderer.fillCircle(b.x + 4, b.y + 1, 5, '#4ef');
          break;
        case 'bounce':
          renderer.setGlow('#a4f', 0.4);
          renderer.fillRect(b.x, b.y, 6, 3, '#a4f');
          break;
      }
      renderer.setGlow(null);
    }

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    for (const b of enemyBullets) {
      renderer.fillCircle(b.x, b.y, 3, '#f44');
    }
    renderer.setGlow(null);

    // Particles
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 15);
      renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, colorWithAlpha(p.color, alpha));
    }

    // Charge indicator
    if (charging && chargeTime > 5) {
      const power = chargeTime / chargeMax;
      const r = 3 + power * 10;
      const cx = player.x + PLAYER_W + 2;
      const cy = player.y + PLAYER_H / 2;
      // Draw charge arc as segmented circle
      const chargeColor = power > 0.6 ? '#fff' : '#f8e';
      renderer.setGlow('#f8e', power * 0.8);
      const segments = Math.floor(power * 20) + 4;
      const endAngle = Math.PI * 2 * power;
      const arcPts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * endAngle;
        arcPts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      if (arcPts.length > 1) {
        renderer.strokePoly(arcPts, chargeColor, 2, false);
      }
      // Inner glow
      if (power > 0.3) {
        renderer.fillCircle(cx, cy, r * 0.6, colorWithAlpha('#f8e', power * 0.4));
      }
      renderer.setGlow(null);
    }

    // Wave intro text
    if (waveIntroTimer > 0) {
      const alpha = Math.min(1, waveIntroTimer / 30);
      renderer.setGlow('#f8e', 0.6 * alpha);
      text.drawText(waveIntroText, W / 2, H / 2 - 20, 20, colorWithAlpha('#f8e', alpha), 'center');
      text.drawText(`Wave ${wave}`, W / 2, H / 2 + 5, 14, colorWithAlpha('#aaa', alpha), 'center');
      renderer.setGlow(null);
    }

    // Boss health bar
    if (boss) {
      const barW = 200, barH = 8;
      const bx = W / 2 - barW / 2, by = 10;
      renderer.fillRect(bx, by, barW, barH, '#400');
      const hpPct = Math.max(0, boss.hp / boss.maxHp);
      const barColor = hpPct > 0.5 ? '#f8e' : hpPct > 0.25 ? '#f80' : '#f44';
      renderer.fillRect(bx, by, barW * hpPct, barH, barColor);
      // Bar border
      renderer.drawLine(bx, by, bx + barW, by, '#f8e', 1);
      renderer.drawLine(bx + barW, by, bx + barW, by + barH, '#f8e', 1);
      renderer.drawLine(bx + barW, by + barH, bx, by + barH, '#f8e', 1);
      renderer.drawLine(bx, by + barH, bx, by, '#f8e', 1);
      text.drawText(boss.type.toUpperCase(), W / 2, by + barH + 4, 9, '#fff', 'center');
    }

    // Lives display (mini ships)
    renderer.setGlow('#f8e', 0.3);
    for (let i = 0; i < lives - 1; i++) {
      const lx = W - 30 - i * 18;
      const ly = H - 15;
      const pts = [
        { x: lx + 10, y: ly },
        { x: lx, y: ly + 6 },
        { x: lx + 4, y: ly + 8 },
        { x: lx + 10, y: ly + 4 },
      ];
      renderer.fillPoly(pts, '#f8e');
    }
    renderer.setGlow(null);
  };

  // ── Draw helpers ──

  function drawTerrain(renderer) {
    const tOffset = Math.floor(scrollX / 4) % terrain.top.length;

    // Top terrain as filled polygon
    const topPts = [{ x: 0, y: 0 }];
    for (let x = 0; x <= W; x += 4) {
      const idx = (tOffset + Math.floor(x / 4)) % terrain.top.length;
      topPts.push({ x, y: terrain.top[idx] });
    }
    topPts.push({ x: W, y: 0 });
    renderer.fillPoly(topPts, '#12162a');

    // Top terrain edge glow
    const topEdge = [];
    for (let x = 0; x <= W; x += 4) {
      const idx = (tOffset + Math.floor(x / 4)) % terrain.top.length;
      topEdge.push({ x, y: terrain.top[idx] });
    }
    if (topEdge.length > 1) {
      renderer.strokePoly(topEdge, colorWithAlpha('#f8e', 0.15), 1, false);
    }

    // Bottom terrain as filled polygon
    const botPts = [{ x: 0, y: H }];
    for (let x = 0; x <= W; x += 4) {
      const idx = (tOffset + Math.floor(x / 4)) % terrain.bottom.length;
      botPts.push({ x, y: H - terrain.bottom[idx] });
    }
    botPts.push({ x: W, y: H });
    renderer.fillPoly(botPts, '#12162a');

    // Bottom terrain edge glow
    const botEdge = [];
    for (let x = 0; x <= W; x += 4) {
      const idx = (tOffset + Math.floor(x / 4)) % terrain.bottom.length;
      botEdge.push({ x, y: H - terrain.bottom[idx] });
    }
    if (botEdge.length > 1) {
      renderer.strokePoly(botEdge, colorWithAlpha('#f8e', 0.15), 1, false);
    }
  }

  function drawPlayer(renderer) {
    const px = player.x, py = player.y;

    // Main hull
    renderer.setGlow('#f8e', 0.5);
    const hull = [
      { x: px + PLAYER_W + 4, y: py + PLAYER_H / 2 },
      { x: px + PLAYER_W - 4, y: py },
      { x: px + 6, y: py + 1 },
      { x: px, y: py + PLAYER_H / 2 - 2 },
      { x: px, y: py + PLAYER_H / 2 + 2 },
      { x: px + 6, y: py + PLAYER_H - 1 },
      { x: px + PLAYER_W - 4, y: py + PLAYER_H },
    ];
    renderer.fillPoly(hull, '#dde');

    // Cockpit
    renderer.fillCircle(px + PLAYER_W - 6, py + PLAYER_H / 2, 4, '#4ef');

    // Engine glow
    renderer.setGlow('#f80', 0.6);
    renderer.fillRect(px - 4, py + PLAYER_H / 2 - 2, 5, 4, '#f84');
    renderer.setGlow(null);

    // Wing accents
    renderer.fillRect(px + 8, py, 10, 2, '#f8e');
    renderer.fillRect(px + 8, py + PLAYER_H - 2, 10, 2, '#f8e');
  }

  function drawEnemy(renderer, e) {
    const ex = e.x, ey = e.y;
    switch (e.type) {
      case 'scout': {
        renderer.setGlow('#4f4', 0.4);
        const pts = [
          { x: ex, y: ey + e.h / 2 },
          { x: ex + 6, y: ey },
          { x: ex + e.w - 4, y: ey + 2 },
          { x: ex + e.w, y: ey + e.h / 2 },
          { x: ex + e.w - 4, y: ey + e.h - 2 },
          { x: ex + 6, y: ey + e.h },
        ];
        renderer.fillPoly(pts, '#4f4');
        // Eye
        renderer.fillCircle(ex + 5, ey + e.h / 2, 2, '#ff0');
        renderer.setGlow(null);
        break;
      }
      case 'drifter': {
        renderer.setGlow('#48f', 0.5);
        // Jellyfish dome (approximated as polygon)
        const wobble = Math.sin(e.tick * 0.1);
        const dome = [];
        // Top arc
        for (let a = Math.PI; a >= 0; a -= Math.PI / 8) {
          dome.push({
            x: ex + e.w / 2 + Math.cos(a) * (e.w / 2),
            y: ey + 8 + Math.sin(a) * (-8)
          });
        }
        // Bottom tentacles
        for (let t = e.w; t >= 0; t -= 4) {
          dome.push({
            x: ex + t,
            y: ey + e.h - 4 + Math.sin(t * 0.5 + wobble) * 3
          });
        }
        renderer.fillPoly(dome, '#48f');
        // Eyes
        renderer.fillCircle(ex + 7, ey + 7, 2.5, '#fff');
        renderer.fillCircle(ex + e.w - 7, ey + 7, 2.5, '#fff');
        renderer.setGlow(null);
        break;
      }
      case 'charger': {
        const chColor = e.charging ? '#f44' : '#f80';
        renderer.setGlow(chColor, e.charging ? 0.7 : 0.4);
        const pts = [
          { x: ex, y: ey + e.h / 2 },
          { x: ex + 8, y: ey },
          { x: ex + e.w, y: ey + 2 },
          { x: ex + e.w + 4, y: ey + e.h / 2 },
          { x: ex + e.w, y: ey + e.h - 2 },
          { x: ex + 8, y: ey + e.h },
        ];
        renderer.fillPoly(pts, chColor);
        renderer.setGlow(null);
        break;
      }
      case 'turret': {
        renderer.setGlow('#f44', 0.4);
        renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, e.w / 2, '#f44');

        // Gun barrel (line toward player)
        const aimDx = player.x - ex;
        const aimDy = player.y - ey;
        const aimDist = Math.sqrt(aimDx * aimDx + aimDy * aimDy) || 1;
        const bx = ex + e.w / 2;
        const by = ey + e.h / 2;
        renderer.drawLine(bx, by, bx + (aimDx / aimDist) * 14, by + (aimDy / aimDist) * 14, '#a22', 4);

        // Core
        renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, 4, '#ff0');
        renderer.setGlow(null);
        break;
      }
      case 'snake': {
        const snakeColor = e.isHead ? '#c6f' : '#a4f';
        renderer.setGlow('#a4f', 0.3);
        renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, e.w / 2, snakeColor);
        if (e.isHead) {
          renderer.fillCircle(ex + 4, ey + e.h / 2 - 2, 2, '#ff0');
          renderer.fillCircle(ex + 4, ey + e.h / 2 + 2, 2, '#ff0');
        }
        renderer.setGlow(null);
        break;
      }
    }
  }

  function drawBoss(renderer, textR) {
    const bx = boss.x, by = boss.y;
    const pulse = Math.sin(tick * 0.05) * 0.15 + 0.85;

    if (boss.type === 'dobkeratops') {
      // Main body - organic mass
      renderer.setGlow('#f44', 0.7);
      renderer.fillCircle(bx + boss.w / 2, by + boss.h / 2, boss.w / 2 - 5,
        colorWithAlpha('#b43c3c', pulse));

      // Organic texture bumps
      for (let i = 0; i < 6; i++) {
        const ox = bx + 10 + Math.sin(tick * 0.02 + i) * 15 + i * 8;
        const oy = by + 20 + Math.cos(tick * 0.03 + i * 2) * 12 + i * 10;
        renderer.fillCircle(ox, oy, 6 + Math.sin(i) * 3,
          colorWithAlpha('#c85050', pulse));
      }

      // Core weak point
      const corePart = boss.parts[2];
      if (corePart.alive) {
        renderer.setGlow('#ff0', 0.7);
        renderer.fillCircle(
          bx + corePart.x + corePart.w / 2,
          by + corePart.y + corePart.h / 2,
          12 + Math.sin(tick * 0.08) * 3, '#ff0');
        renderer.fillCircle(
          bx + corePart.x + corePart.w / 2,
          by + corePart.y + corePart.h / 2, 6, '#f80');
      }

      // Claws
      boss.parts.slice(0, 2).forEach((p, i) => {
        if (!p.alive) return;
        const px = bx + p.x, py = by + p.y;
        const clawWobble = Math.sin(tick * 0.04 + i * Math.PI) * 8;
        renderer.setGlow('#f44', 0.5);
        const clawPts = [
          { x: px + p.w, y: py + p.h / 2 },
          { x: px + 5, y: py + clawWobble },
          { x: px - 15, y: py + p.h / 2 + clawWobble * 0.5 },
          { x: px + 5, y: py + p.h + clawWobble },
        ];
        renderer.fillPoly(clawPts, '#a33');
      });

      // Eye
      renderer.setGlow('#f8e', 0.6);
      renderer.fillCircle(bx + 20, by + boss.h / 2, 8, '#fff');
      renderer.fillCircle(bx + 18, by + boss.h / 2, 4, '#f00');
      renderer.fillCircle(bx + 17, by + boss.h / 2, 2, '#000');
      renderer.setGlow(null);

    } else {
      // Gomander - serpentine boss
      renderer.setGlow('#4f4', 0.7);
      // Body segments
      for (let i = 0; i < 8; i++) {
        const sx = bx + boss.w / 2 + Math.sin(tick * 0.02 + i * 0.8) * 20;
        const sy = by + i * 15 + Math.cos(tick * 0.015 + i * 0.6) * 5;
        renderer.fillCircle(sx, sy, 18 - i * 0.5,
          colorWithAlpha('#64b43c', pulse));
      }

      // Mouth parts (jaws)
      boss.parts.slice(0, 2).forEach((p, i) => {
        if (!p.alive) return;
        const px = bx + p.x, py = by + p.y;
        const jawMove = Math.sin(tick * 0.06) * 5 * (i === 0 ? -1 : 1);
        renderer.setGlow('#4f4', 0.5);
        const jawPts = [
          { x: px + p.w, y: py + p.h / 2 },
          { x: px, y: py + jawMove },
          { x: px - 20, y: py + p.h / 2 + jawMove },
          { x: px, y: py + p.h + jawMove },
        ];
        renderer.fillPoly(jawPts, '#6b3');
        // Teeth
        for (let t = 0; t < 3; t++) {
          renderer.fillRect(px - 15 + t * 7, py + p.h / 2 + jawMove - 2, 3, 4, '#fff');
        }
      });

      // Core
      const core = boss.parts[2];
      if (core.alive) {
        renderer.setGlow('#f80', 0.7);
        renderer.fillCircle(
          bx + core.x + core.w / 2,
          by + core.y + core.h / 2,
          14 + Math.sin(tick * 0.1) * 3, '#f84');
        renderer.fillCircle(
          bx + core.x + core.w / 2,
          by + core.y + core.h / 2, 7, '#ff0');
      }

      // Eyes
      renderer.setGlow('#ff0', 0.5);
      for (let i = 0; i < 2; i++) {
        const eyeX = bx + 15, eyeY = by + 30 + i * 60;
        renderer.fillCircle(eyeX, eyeY, 5, '#ff0');
        renderer.fillCircle(eyeX - 1, eyeY, 2.5, '#000');
      }
      renderer.setGlow(null);
    }
  }

  game.start();
  return game;
}
