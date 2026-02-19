// gradius/game.js — Gradius game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 512;
const H = 400;

// Power-up bar: Speed Up, Missile, Double, Laser, Option, Shield
const POWER_NAMES = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', 'SHIELD'];
const POWER_COLORS = ['#fff', '#f80', '#8ef', '#f44', '#fa0', '#4f4'];
const MAX_OPTIONS = 4;
const MAX_SPEED = 5;

// -- State --
let score, best = 0;
let lives;
let player;
let bullets, enemyBullets, enemies, particles, capsules, options;
let tick, scrollX;
let powerIndex;
let speedLevel, hasMissile, hasDouble, hasLaser, shieldHP;
let lastFireTick, fireInterval;
let terrainTop, terrainBot;
let bossActive, boss;
let waveTimer, waveNum, enemySpawnTimer;
let starField;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

// -- Terrain generation --
function generateTerrain() {
  terrainTop = [];
  terrainBot = [];
  for (let i = 0; i < 200; i++) {
    terrainTop.push(0);
    terrainBot.push(0);
  }
  let topH = 0, botH = 0;
  for (let i = 20; i < 200; i++) {
    topH += (Math.random() - 0.52) * 3;
    topH = Math.max(0, Math.min(60, topH));
    botH += (Math.random() - 0.52) * 3;
    botH = Math.max(0, Math.min(60, botH));
    terrainTop[i] = topH;
    terrainBot[i] = botH;
  }
}

function createStarField() {
  starField = [];
  for (let i = 0; i < 80; i++) {
    starField.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.3 + Math.random() * 1.5,
      size: Math.random() > 0.7 ? 2 : 1,
      brightness: 0.3 + Math.random() * 0.7
    });
  }
}

function getTerrainHeight(terrain, worldX) {
  const idx = Math.floor(((scrollX + worldX) / 16)) % terrain.length;
  const idx2 = (idx + 1) % terrain.length;
  const frac = ((scrollX + worldX) / 16) % 1;
  return terrain[Math.abs(idx) % terrain.length] * (1 - frac) +
         terrain[Math.abs(idx2) % terrain.length] * frac;
}

function rectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI * 2 / 10) * i + Math.random() * 0.5;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 10,
      color
    });
  }
}

function spawnSpark(x, y) {
  for (let i = 0; i < 4; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 6,
      color: '#fff'
    });
  }
}

// -- Enemy creation --
function makeEnemy(x, y, type) {
  const e = {
    x, y, vx: -2, vy: 0, w: 20, h: 16,
    hp: 1, points: 100, color: '#f44',
    dropCapsule: false,
    update: () => {},
    shootTimer: undefined
  };

  switch (type) {
    case 'grunt':
      e.color = '#88f';
      e.hp = 1;
      e.points = 50;
      e.w = 18; e.h = 14;
      e.update = () => { e.vx = -2.5; };
      break;
    case 'red':
      e.color = '#f44';
      e.hp = 1;
      e.points = 100;
      e.dropCapsule = true;
      e.w = 20; e.h = 16;
      e.update = () => { e.vx = -2; };
      break;
    case 'sine':
      e.color = '#ff0';
      e.hp = 1;
      e.points = 75;
      e.w = 16; e.h = 12;
      e.phase = Math.random() * Math.PI * 2;
      e.startY = y;
      e.update = () => {
        e.vx = -2.5;
        e.y = e.startY + Math.sin(tick * 0.05 + e.phase) * 40;
      };
      break;
    case 'turret':
      e.color = '#f80';
      e.hp = 2;
      e.points = 150;
      e.w = 22; e.h = 18;
      e.shootTimer = 60 + Math.floor(Math.random() * 40);
      e.shootInterval = 80;
      e.update = () => { e.vx = -1.5; };
      break;
    case 'fast':
      e.color = '#0ff';
      e.hp = 1;
      e.points = 120;
      e.w = 14; e.h = 10;
      e.update = () => { e.vx = -4.5; };
      break;
    case 'heavy':
      e.color = '#c4f';
      e.hp = 4;
      e.points = 200;
      e.w = 26; e.h = 22;
      e.shootTimer = 40;
      e.shootInterval = 60;
      e.update = () => { e.vx = -1; };
      break;
  }
  return e;
}

// -- Formations --
function spawnFormationLine() {
  const y = 40 + Math.random() * (H - 80);
  const isRed = Math.random() < 0.3;
  for (let i = 0; i < 5; i++) {
    enemies.push(makeEnemy(W + 30 + i * 30, y, isRed ? 'red' : 'grunt'));
  }
}

function spawnFormationSine() {
  const baseY = H / 2;
  const isRed = Math.random() < 0.25;
  for (let i = 0; i < 6; i++) {
    const e = makeEnemy(W + 30 + i * 25, baseY, isRed ? 'red' : 'sine');
    e.phase = i * 0.5;
    e.startY = baseY;
    enemies.push(e);
  }
}

function spawnFormationV() {
  const cy = H / 2 + (Math.random() - 0.5) * 100;
  const isRed = Math.random() < 0.2;
  for (let i = 0; i < 5; i++) {
    const dy = (i < 3 ? i : 4 - i) * 20;
    enemies.push(makeEnemy(W + 30 + i * 25, cy + dy, isRed ? 'red' : 'grunt'));
    if (dy > 0) {
      enemies.push(makeEnemy(W + 30 + i * 25, cy - dy, isRed ? 'red' : 'grunt'));
    }
  }
}

function spawnFormationCircle() {
  const cx = W + 60;
  const cy = 60 + Math.random() * (H - 120);
  const isRed = Math.random() < 0.3;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    const e = makeEnemy(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30, isRed ? 'red' : 'grunt');
    e.circleAngle = angle;
    e.circleCX = cx;
    e.circleCY = cy;
    e.update = () => {
      e.circleCX -= 2;
      e.circleAngle += 0.03;
      e.x = e.circleCX + Math.cos(e.circleAngle) * 30;
      e.y = e.circleCY + Math.sin(e.circleAngle) * 30;
      e.vx = 0;
      e.vy = 0;
    };
    enemies.push(e);
  }
}

function spawnSoloEnemy() {
  const diff = Math.min(waveNum, 20);
  const types = ['grunt', 'red', 'sine'];
  if (diff >= 3) types.push('turret');
  if (diff >= 5) types.push('fast');
  if (diff >= 8) types.push('heavy');
  const type = types[Math.floor(Math.random() * types.length)];
  const y = 30 + Math.random() * (H - 60);
  enemies.push(makeEnemy(W + 20, y, type));
}

function spawnWaveEnemies() {
  const diff = Math.min(waveNum, 20);

  if (enemySpawnTimer % (Math.max(60 - diff * 2, 20)) === 0) {
    const type = Math.random();
    if (type < 0.3) spawnFormationLine();
    else if (type < 0.6) spawnFormationSine();
    else if (type < 0.8) spawnFormationV();
    else spawnFormationCircle();
  }

  if (enemySpawnTimer % (Math.max(40 - diff, 15)) === 0) {
    spawnSoloEnemy();
  }
}

function spawnBoss() {
  bossActive = true;
  const diff = Math.min(waveNum, 20);
  boss = {
    x: W - 80,
    y: H / 2 - 40,
    w: 64,
    h: 80,
    hp: 20 + diff * 5,
    maxHp: 20 + diff * 5,
    tick: 0,
    shootTimer: 60,
    weakFlash: false
  };
}

// -- Weapons --
function fireWeapons(x, y) {
  if (hasLaser) {
    bullets.push({ x, y, vx: 10, vy: 0, isLaser: true, pierce: true, life: 30 });
  } else if (hasDouble) {
    bullets.push({ x, y: y - 4, vx: 8, vy: -0.5 });
    bullets.push({ x, y: y + 4, vx: 8, vy: 0.5 });
  } else {
    bullets.push({ x, y, vx: 8, vy: 0 });
  }

  if (hasMissile) {
    bullets.push({ x, y: y + 6, vx: 3, vy: 2, isMissile: true });
  }
}

function resetPowerups() {
  powerIndex = 0;
  speedLevel = 0;
  hasMissile = false;
  hasDouble = false;
  hasLaser = false;
  shieldHP = 0;
  options = [];
  fireInterval = 8;
}

function activatePowerUp() {
  if (powerIndex < 0) return;
  const power = powerIndex;
  powerIndex = -1;

  switch (power) {
    case 0:
      if (speedLevel < MAX_SPEED) speedLevel++;
      break;
    case 1:
      hasMissile = true;
      break;
    case 2:
      hasDouble = true;
      hasLaser = false;
      break;
    case 3:
      hasLaser = true;
      hasDouble = false;
      fireInterval = 10;
      break;
    case 4:
      if (options.length < MAX_OPTIONS) {
        options.push({ x: player.x - 20, y: player.y });
      }
      break;
    case 5:
      shieldHP = 3;
      break;
  }
}

// ---- Exported entry point ----

export function createGame() {
  const game = new Game('game');

  function playerDeath() {
    spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#8ef');
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
      return;
    }
    player.x = 60;
    player.y = H / 2;
    player.invincible = 120;
    resetPowerups();
    bullets = [];
    enemyBullets = [];
  }

  game.onInit = () => {
    score = 0;
    lives = 3;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    player = { x: 60, y: H / 2, w: 28, h: 14, invincible: 0 };
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    capsules = [];
    options = [];
    tick = 0;
    scrollX = 0;
    powerIndex = 0;
    speedLevel = 0;
    hasMissile = false;
    hasDouble = false;
    hasLaser = false;
    shieldHP = 0;
    lastFireTick = 0;
    fireInterval = 8;
    bossActive = false;
    boss = null;
    waveTimer = 0;
    waveNum = 0;
    enemySpawnTimer = 0;
    generateTerrain();
    createStarField();
    game.showOverlay('GRADIUS', 'Arrows: move | Space: fire | Shift: power-up');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // -- State transitions --
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
        || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')
        || input.wasPressed('Shift') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // -- Playing --
    tick++;
    scrollX += 1.5;

    // Stars scroll
    for (const s of starField) {
      s.x -= s.speed;
      if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    }

    // Player movement
    const spd = 2 + speedLevel * 0.8;
    if (input.isDown('ArrowUp')) player.y -= spd;
    if (input.isDown('ArrowDown')) player.y += spd;
    if (input.isDown('ArrowLeft')) player.x -= spd;
    if (input.isDown('ArrowRight')) player.x += spd;
    player.x = Math.max(4, Math.min(W - player.w - 4, player.x));
    player.y = Math.max(4, Math.min(H - player.h - 4, player.y));

    // Update options (follow player with delay)
    for (let i = 0; i < options.length; i++) {
      const target = i === 0 ? player : options[i - 1];
      options[i].x += (target.x - 20 - i * 8 - options[i].x) * 0.15;
      options[i].y += (target.y - options[i].y) * 0.15;
    }

    // Auto-fire if space held
    if (input.isDown(' ') && tick - lastFireTick >= fireInterval) {
      lastFireTick = tick;
      fireWeapons(player.x + player.w, player.y + player.h / 2);
      for (const o of options) {
        fireWeapons(o.x + 6, o.y + 4);
      }
    }

    // Power-up activation
    if (input.wasPressed('Shift')) {
      activatePowerUp();
    }

    // Invincibility timer
    if (player.invincible > 0) player.invincible--;

    // Terrain collision
    const topHeight = getTerrainHeight(terrainTop, player.x + player.w / 2);
    const botHeight = getTerrainHeight(terrainBot, player.x + player.w / 2);
    if (player.y < topHeight || player.y + player.h > H - botHeight) {
      if (player.invincible <= 0) {
        playerDeath();
        return;
      }
    }

    // Spawn enemies
    enemySpawnTimer++;
    waveTimer++;

    if (waveTimer > 600) {
      waveTimer = 0;
      waveNum++;
    }

    if (waveNum > 0 && waveNum % 5 === 0 && !bossActive && !boss) {
      spawnBoss();
    }

    spawnWaveEnemies();

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.update(e);
      e.x += e.vx;
      e.y += e.vy;

      if (e.shootTimer !== undefined) {
        e.shootTimer--;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootInterval;
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          enemyBullets.push({
            x: e.x, y: e.y + e.h / 2,
            vx: (dx / dist) * 3,
            vy: (dy / dist) * 3
          });
        }
      }

      if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) {
        enemies.splice(i, 1);
      }
    }

    // Update boss
    if (boss) {
      boss.tick++;
      boss.x += Math.sin(boss.tick * 0.02) * 1;
      boss.y = H / 2 + Math.sin(boss.tick * 0.015) * 80;

      boss.shootTimer--;
      if (boss.shootTimer <= 0) {
        boss.shootTimer = 30;
        for (let a = -2; a <= 2; a++) {
          const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + a * 0.2;
          enemyBullets.push({
            x: boss.x, y: boss.y + boss.h / 2,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3
          });
        }
      }

      boss.weakFlash = Math.sin(boss.tick * 0.1) > 0;
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.x > W + 10 || b.x < -10 || b.y < -10 || b.y > H + 10) {
        bullets.splice(i, 1);
        continue;
      }

      // Bullet vs enemies
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (rectCollide(b.x - 2, b.y - 2, 4, 4, e.x, e.y, e.w, e.h)) {
          e.hp--;
          if (e.hp <= 0) {
            score += e.points;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
            if (e.dropCapsule) {
              capsules.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: -1 });
            }
            enemies.splice(j, 1);
          } else {
            spawnSpark(b.x, b.y);
          }
          if (!b.pierce) {
            bullets.splice(i, 1);
            hit = true;
          }
          break;
        }
      }
      if (hit) continue;

      // Bullet vs boss
      if (boss) {
        const wx = boss.x + boss.w * 0.3;
        const wy = boss.y + boss.h * 0.3;
        const ww = boss.w * 0.4;
        const wh = boss.h * 0.4;
        if (rectCollide(b.x - 2, b.y - 2, 4, 4, wx, wy, ww, wh)) {
          boss.hp--;
          spawnSpark(b.x, b.y);
          if (!b.pierce) bullets.splice(i, 1);
          if (boss.hp <= 0) {
            score += 500;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, '#fd0');
            spawnExplosion(boss.x + boss.w * 0.3, boss.y + boss.h * 0.3, '#f80');
            spawnExplosion(boss.x + boss.w * 0.7, boss.y + boss.h * 0.7, '#f44');
            boss = null;
            bossActive = false;
            waveNum++;
            waveTimer = 0;
          }
        }
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
      if (rectCollide(b.x - 3, b.y - 3, 6, 6, player.x, player.y, player.w, player.h)) {
        enemyBullets.splice(i, 1);
        if (shieldHP > 0) {
          shieldHP--;
          spawnSpark(b.x, b.y);
        } else if (player.invincible <= 0) {
          playerDeath();
          return;
        }
      }
    }

    // Enemy collision with player
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (rectCollide(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) {
        if (shieldHP > 0) {
          shieldHP--;
          e.hp = 0;
          score += e.points;
          scoreEl.textContent = score;
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
          enemies.splice(i, 1);
        } else if (player.invincible <= 0) {
          playerDeath();
          return;
        }
      }
    }

    // Boss collision with player
    if (boss && rectCollide(player.x, player.y, player.w, player.h, boss.x, boss.y, boss.w, boss.h)) {
      if (player.invincible <= 0) {
        if (shieldHP > 0) {
          shieldHP--;
        } else {
          playerDeath();
          return;
        }
      }
    }

    // Capsules
    for (let i = capsules.length - 1; i >= 0; i--) {
      const c = capsules[i];
      c.x += c.vx;
      if (c.x < -20) { capsules.splice(i, 1); continue; }
      if (rectCollide(player.x, player.y, player.w, player.h, c.x - 6, c.y - 6, 12, 12)) {
        capsules.splice(i, 1);
        powerIndex = Math.min(powerIndex + 1, POWER_NAMES.length - 1);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vy *= 0.98;
      p.vx *= 0.98;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  // ---- DRAW ----

  game.onDraw = (renderer, text) => {
    // Background is handled by renderer.begin('#0a0a1e') in engine

    // Stars
    for (const s of starField || []) {
      const alpha = s.brightness * (0.5 + 0.5 * Math.sin(tick * 0.03 + s.x));
      const v = Math.round(alpha * 255);
      const hex = v.toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, `#c8dcff${hex}`);
    }

    // Terrain (top) - filled polygon
    {
      const pts = [{ x: 0, y: 0 }];
      for (let px = 0; px <= W; px += 4) {
        const h = getTerrainHeight(terrainTop, px);
        pts.push({ x: px, y: h });
      }
      pts.push({ x: W, y: 0 });
      renderer.fillPoly(pts, '#0f3460');

      // Terrain surface glow (top)
      renderer.setGlow('#2af', 0.4);
      const linePts = [];
      for (let px = 0; px <= W; px += 4) {
        const h = getTerrainHeight(terrainTop, px);
        linePts.push({ x: px, y: h });
      }
      renderer.strokePoly(linePts, '#1a5a8a', 1, false);
      renderer.setGlow(null);
    }

    // Terrain (bottom) - filled polygon
    {
      const pts = [{ x: 0, y: H }];
      for (let px = 0; px <= W; px += 4) {
        const h = getTerrainHeight(terrainBot, px);
        pts.push({ x: px, y: H - h });
      }
      pts.push({ x: W, y: H });
      renderer.fillPoly(pts, '#0f3460');

      // Terrain surface glow (bottom)
      renderer.setGlow('#2af', 0.4);
      const linePts = [];
      for (let px = 0; px <= W; px += 4) {
        const h = getTerrainHeight(terrainBot, px);
        linePts.push({ x: px, y: H - h });
      }
      renderer.strokePoly(linePts, '#1a5a8a', 1, false);
      renderer.setGlow(null);
    }

    // Capsules
    for (const c of capsules) {
      renderer.setGlow('#f80', 0.6);
      renderer.fillCircle(c.x, c.y, 6, '#f80');
      renderer.setGlow(null);
      text.drawText('P', c.x, c.y - 4, 8, '#ff0', 'center');
    }

    // Enemies
    for (const e of enemies) {
      renderer.setGlow(e.color, 0.4);
      if (e.dropCapsule) {
        // Red enemies: distinctive shape
        renderer.fillPoly([
          { x: e.x, y: e.y + e.h / 2 },
          { x: e.x + e.w * 0.4, y: e.y },
          { x: e.x + e.w, y: e.y + e.h * 0.3 },
          { x: e.x + e.w, y: e.y + e.h * 0.7 },
          { x: e.x + e.w * 0.4, y: e.y + e.h },
        ], e.color);
      } else {
        // Standard enemy shape
        renderer.fillPoly([
          { x: e.x, y: e.y + e.h / 2 },
          { x: e.x + e.w * 0.3, y: e.y },
          { x: e.x + e.w, y: e.y + e.h * 0.2 },
          { x: e.x + e.w * 0.8, y: e.y + e.h / 2 },
          { x: e.x + e.w, y: e.y + e.h * 0.8 },
          { x: e.x + e.w * 0.3, y: e.y + e.h },
        ], e.color);
      }
      // Eye
      renderer.fillCircle(e.x + e.w * 0.4, e.y + e.h / 2, 2, '#1a1a2e');
      renderer.setGlow(null);
    }

    // Boss
    if (boss) {
      const b = boss;
      renderer.setGlow('#888', 0.5);
      // Main body
      renderer.fillRect(b.x + 10, b.y, b.w - 10, b.h, '#666');
      // Front armor
      renderer.fillPoly([
        { x: b.x, y: b.y + b.h / 2 },
        { x: b.x + 15, y: b.y + 10 },
        { x: b.x + 15, y: b.y + b.h - 10 },
      ], '#888');
      // Cannons
      renderer.fillRect(b.x + 5, b.y - 4, 30, 8, '#555');
      renderer.fillRect(b.x + 5, b.y + b.h - 4, 30, 8, '#555');
      // Weak point (glowing core)
      const coreColor = b.weakFlash ? '#f44' : '#a22';
      renderer.setGlow('#f44', 0.8);
      renderer.fillCircle(b.x + b.w * 0.5, b.y + b.h * 0.5, 12, coreColor);
      renderer.fillCircle(b.x + b.w * 0.5, b.y + b.h * 0.5, 5, '#ff8');
      renderer.setGlow(null);
      // Detail lines
      for (let i = 0; i < 4; i++) {
        const ly = b.y + 15 + i * (b.h - 30) / 3;
        renderer.drawLine(b.x + 15, ly, b.x + b.w - 5, ly, '#444', 1);
      }

      // Boss HP bar (draw above boss)
      const barW = 120;
      const barH = 6;
      const bx = W / 2 - barW / 2;
      const by = 10;
      renderer.fillRect(bx, by, barW, barH, '#333');
      renderer.fillRect(bx, by, barW * (b.hp / b.maxHp), barH, '#f44');
      // Border
      renderer.drawLine(bx, by, bx + barW, by, '#888', 1);
      renderer.drawLine(bx, by + barH, bx + barW, by + barH, '#888', 1);
      renderer.drawLine(bx, by, bx, by + barH, '#888', 1);
      renderer.drawLine(bx + barW, by, bx + barW, by + barH, '#888', 1);
      text.drawText('BOSS', W / 2, by + barH + 4, 9, '#fff', 'center');
    }

    // Player bullets
    for (const b of bullets) {
      if (b.isLaser) {
        renderer.setGlow('#f44', 0.7);
        renderer.fillRect(b.x, b.y - 1, 20, 3, '#f44');
      } else if (b.isMissile) {
        renderer.setGlow('#f80', 0.4);
        renderer.fillPoly([
          { x: b.x + 8, y: b.y },
          { x: b.x, y: b.y - 3 },
          { x: b.x, y: b.y + 3 },
        ], '#f80');
      } else {
        renderer.setGlow('#8ef', 0.4);
        renderer.fillRect(b.x, b.y - 1, 8, 3, '#8ef');
      }
    }
    renderer.setGlow(null);

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    for (const b of enemyBullets) {
      renderer.fillCircle(b.x, b.y, 3, '#f44');
    }
    renderer.setGlow(null);

    // Options
    for (const o of options) {
      renderer.setGlow('#fa0', 0.6);
      renderer.fillCircle(o.x + 5, o.y + 4, 5, '#fa0');
      renderer.setGlow(null);
    }

    // Player
    if (player.invincible <= 0 || Math.floor(tick / 3) % 2 === 0) {
      const px = player.x, py = player.y;
      renderer.setGlow('#8ef', 0.6);
      // Main body polygon
      renderer.fillPoly([
        { x: px + player.w, y: py + player.h / 2 },      // Nose
        { x: px + player.w - 8, y: py },                  // Top front
        { x: px + 4, y: py },                              // Top back
        { x: px, y: py + player.h / 2 - 2 },              // Back indent top
        { x: px + 4, y: py + player.h / 2 },              // Back center
        { x: px, y: py + player.h / 2 + 2 },              // Back indent bot
        { x: px + 4, y: py + player.h },                   // Bottom back
        { x: px + player.w - 8, y: py + player.h },       // Bottom front
      ], '#8ef');
      // Wing details
      renderer.fillRect(px + 6, py + 2, 12, 3, '#5ac');
      renderer.fillRect(px + 6, py + player.h - 5, 12, 3, '#5ac');
      // Engine glow
      renderer.setGlow('#fa0', 0.6);
      const flicker = Math.random() * 4;
      renderer.fillRect(px - 2 - flicker, py + player.h / 2 - 2, 4 + flicker, 4, '#fa0');
      renderer.setGlow(null);
    }

    // Shield visual
    if (shieldHP > 0) {
      const alpha = Math.min(1, 0.3 + shieldHP * 0.2);
      const v = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#4f4', 0.6);
      // Draw shield as a circle outline using small line segments
      const cx = player.x + player.w / 2;
      const cy = player.y + player.h / 2;
      const r = 18;
      const segments = 24;
      const shieldPts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (Math.PI * 2 / segments) * i;
        shieldPts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      renderer.strokePoly(shieldPts, `#44ff44${v}`, 2, false);
      renderer.setGlow(null);
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 15);
      const v = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // Expand 3-char hex to 6-char before appending alpha
      let col = p.color;
      if (col.length === 4) {
        col = '#' + col[1] + col[1] + col[2] + col[2] + col[3] + col[3];
      }
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, col + v);
    }

    // Power-up bar at bottom
    drawPowerBar(renderer, text);
  };

  function drawPowerBar(renderer, text) {
    const barW = POWER_NAMES.length * 60;
    const barX = (W - barW) / 2;
    const barY = H - 22;

    // Background
    renderer.fillRect(barX - 4, barY - 4, barW + 8, 22, '#0a0a1ecc');

    // Border
    renderer.drawLine(barX - 4, barY - 4, barX + barW + 4, barY - 4, '#335', 1);
    renderer.drawLine(barX - 4, barY + 18, barX + barW + 4, barY + 18, '#335', 1);
    renderer.drawLine(barX - 4, barY - 4, barX - 4, barY + 18, '#335', 1);
    renderer.drawLine(barX + barW + 4, barY - 4, barX + barW + 4, barY + 18, '#335', 1);

    for (let i = 0; i < POWER_NAMES.length; i++) {
      const x = barX + i * 60;
      const isHighlighted = i === powerIndex;

      if (isHighlighted) {
        renderer.fillRect(x, barY, 56, 14, '#88eeff40');
        // Highlight border
        renderer.drawLine(x, barY, x + 56, barY, '#8ef', 2);
        renderer.drawLine(x, barY + 14, x + 56, barY + 14, '#8ef', 2);
        renderer.drawLine(x, barY, x, barY + 14, '#8ef', 2);
        renderer.drawLine(x + 56, barY, x + 56, barY + 14, '#8ef', 2);
      } else {
        // Dim border
        renderer.drawLine(x, barY, x + 56, barY, '#335', 1);
        renderer.drawLine(x, barY + 14, x + 56, barY + 14, '#335', 1);
        renderer.drawLine(x, barY, x, barY + 14, '#335', 1);
        renderer.drawLine(x + 56, barY, x + 56, barY + 14, '#335', 1);
      }

      const labelColor = isHighlighted ? POWER_COLORS[i] : '#555';
      text.drawText(POWER_NAMES[i], x + 28, barY + 2, 9, labelColor, 'center');
    }

    // Active power-up indicators above the bar
    const indicators = [];
    if (speedLevel > 0) indicators.push({ label: `SPD${speedLevel}`, color: '#fff' });
    if (hasMissile) indicators.push({ label: 'MSL', color: '#f80' });
    if (hasDouble) indicators.push({ label: 'DBL', color: '#8ef' });
    if (hasLaser) indicators.push({ label: 'LSR', color: '#f44' });
    if (options.length > 0) indicators.push({ label: `OPT${options.length}`, color: '#fa0' });
    if (shieldHP > 0) indicators.push({ label: `SHD${shieldHP}`, color: '#4f4' });

    for (let i = 0; i < indicators.length; i++) {
      text.drawText(indicators[i].label, barX + 20 + i * 40, barY - 14, 8, indicators[i].color, 'center');
    }
  }

  game.start();
  return game;
}
