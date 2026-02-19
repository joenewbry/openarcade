// defender/game.js — Defender game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 512;
const H = 400;

// World constants
const WORLD_W = 4096;
const GROUND_Y = H - 50;
const RADAR_H = 30;
const RADAR_Y = 4;
const PLAY_TOP = RADAR_Y + RADAR_H + 4;

// Player constants
const SHIP_W = 28;
const SHIP_H = 12;
const PLAYER_SPEED = 4;
const PLAYER_MAX_SPEED = 6;
const PLAYER_ACCEL = 0.3;
const BULLET_SPEED = 10;
const BULLET_LIFE = 40;
const FIRE_COOLDOWN = 6;
const INVINCIBLE_TIME = 90;

// Colors
const THEME = '#4f8';

// ── State ──
let score, best = 0;
let player, bullets, enemies, humans, particles, mines, stars;
let cameraX, wave, lives, smartBombs;
let tick, fireCooldown, invincibleTimer;
let terrain;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const waveEl = document.getElementById('wave');

// ── World helpers ──
function wrapX(x) {
  return ((x % WORLD_W) + WORLD_W) % WORLD_W;
}

function worldToScreen(wx) {
  let dx = wx - cameraX;
  if (dx > WORLD_W / 2) dx -= WORLD_W;
  if (dx < -WORLD_W / 2) dx += WORLD_W;
  return dx + W / 2;
}

function isOnScreen(wx, margin) {
  const sx = worldToScreen(wx);
  return sx > -margin && sx < W + margin;
}

function worldDist(a, b) {
  let d = a - b;
  if (d > WORLD_W / 2) d -= WORLD_W;
  if (d < -WORLD_W / 2) d += WORLD_W;
  return d;
}

// ── Terrain generation ──
function generateTerrain() {
  terrain = [];
  const segments = 128;
  const segW = WORLD_W / segments;
  for (let i = 0; i <= segments; i++) {
    const baseH = 20 + Math.sin(i * 0.15) * 12 + Math.sin(i * 0.07) * 8 + Math.sin(i * 0.31) * 6;
    terrain.push({ x: i * segW, h: baseH });
  }
}

function generateStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * WORLD_W,
      y: PLAY_TOP + Math.random() * (GROUND_Y - PLAY_TOP - 60),
      brightness: 0.3 + Math.random() * 0.7,
      size: Math.random() > 0.8 ? 2 : 1
    });
  }
}

// ── Terrain height lookup ──
function getTerrainH(wx) {
  const segW = WORLD_W / (terrain.length - 1);
  const idx = wx / segW;
  const i0 = Math.floor(idx) % terrain.length;
  const i1 = (i0 + 1) % terrain.length;
  const t = idx - Math.floor(idx);
  return terrain[i0].h * (1 - t) + terrain[i1].h * t;
}

// ── Spawning ──
function spawnHumans() {
  humans = [];
  const count = 8 + wave;
  for (let i = 0; i < count; i++) {
    humans.push({
      x: Math.random() * WORLD_W,
      y: GROUND_Y,
      alive: true,
      falling: false,
      carried: false,
      carriedBy: null,
      vy: 0,
      rescued: false
    });
  }
}

function spawnEnemies() {
  enemies = [];
  const landerCount = 4 + wave * 2;
  const bomberCount = Math.max(0, Math.floor(wave * 1.2) - 1);
  const baiterCount = Math.max(0, wave - 3);

  for (let i = 0; i < landerCount; i++) spawnLander();
  for (let i = 0; i < bomberCount; i++) spawnBomber();
  for (let i = 0; i < baiterCount; i++) spawnBaiter();
}

function spawnLander() {
  const x = wrapX(cameraX + W / 2 + 200 + Math.random() * (WORLD_W - W - 400));
  enemies.push({
    type: 'lander',
    x: x,
    y: PLAY_TOP + 20 + Math.random() * 80,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 0,
    alive: true,
    state: 'roaming',
    target: null,
    hp: 1,
    color: '#f44',
    points: 150,
    shootTimer: 60 + Math.floor(Math.random() * 120),
    phaseOffset: Math.random() * Math.PI * 2
  });
}

function spawnBomber() {
  const x = wrapX(cameraX + W / 2 + 200 + Math.random() * (WORLD_W - W - 400));
  enemies.push({
    type: 'bomber',
    x: x,
    y: PLAY_TOP + 30 + Math.random() * 100,
    vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()),
    vy: Math.sin(Math.random() * Math.PI * 2) * 0.5,
    alive: true,
    state: 'moving',
    hp: 1,
    color: '#f80',
    points: 250,
    mineTimer: 80 + Math.floor(Math.random() * 100),
    phaseOffset: Math.random() * Math.PI * 2
  });
}

function spawnBaiter() {
  const x = wrapX(cameraX + W / 2 + 300 + Math.random() * (WORLD_W - W - 600));
  enemies.push({
    type: 'baiter',
    x: x,
    y: PLAY_TOP + 20 + Math.random() * 60,
    vx: 0,
    vy: 0,
    alive: true,
    state: 'chasing',
    hp: 2,
    color: '#ff0',
    points: 200,
    shootTimer: 40 + Math.floor(Math.random() * 60),
    phaseOffset: Math.random() * Math.PI * 2
  });
}

// ── Particles ──
function spawnParticles(wx, wy, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x: wx, y: wy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 15,
      color: color
    });
  }
}

// ── Enemy updates ──
function updateLander(e) {
  if (e.state === 'roaming') {
    e.x = wrapX(e.x + e.vx);
    e.y += Math.sin(tick * 0.03 + e.phaseOffset) * 0.5;
    e.y = Math.max(PLAY_TOP + 10, Math.min(GROUND_Y - 40, e.y));
    if (Math.random() < 0.005) e.vx = (Math.random() - 0.5) * 2;
    if (Math.random() < 0.008) {
      const aliveHumans = humans.filter(h => h.alive && !h.carried);
      if (aliveHumans.length > 0) {
        e.target = aliveHumans[Math.floor(Math.random() * aliveHumans.length)];
        e.state = 'descending';
      }
    }
  } else if (e.state === 'descending') {
    if (!e.target || !e.target.alive || e.target.carried) {
      e.state = 'roaming';
      e.target = null;
      return;
    }
    const dx = worldDist(e.target.x, e.x);
    e.x = wrapX(e.x + Math.sign(dx) * 1.5);
    e.y += 1;
    if (Math.abs(dx) < 10 && Math.abs(e.y - GROUND_Y) < 15) {
      e.target.carried = true;
      e.target.carriedBy = e;
      e.state = 'ascending';
    }
    if (e.y > GROUND_Y - 5) e.y = GROUND_Y - 5;
  } else if (e.state === 'ascending') {
    e.x = wrapX(e.x + e.vx * 0.5);
    e.y -= 0.8;
    if (e.target && e.target.alive) {
      e.target.x = e.x;
      e.target.y = e.y + 14;
    }
    if (e.y < PLAY_TOP + 5) {
      if (e.target && e.target.alive) {
        e.target.alive = false;
        spawnParticles(e.target.x, e.target.y, '#f4f', 8);
      }
      e.type = 'mutant';
      e.state = 'chasing';
      e.color = '#f4f';
      e.points = 150;
      e.hp = 1;
      e.vx = 0;
      e.vy = 0;
      e.target = null;
    }
  }
}

function updateMutant(e) {
  const dx = worldDist(player.x, e.x);
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = 2.5 + wave * 0.2;
  e.vx += (dx / dist) * 0.15;
  e.vy += (dy / dist) * 0.15;
  e.vx = Math.max(-speed, Math.min(speed, e.vx));
  e.vy = Math.max(-speed, Math.min(speed, e.vy));
  e.x = wrapX(e.x + e.vx);
  e.y += e.vy;
  e.y = Math.max(PLAY_TOP + 5, Math.min(GROUND_Y - 5, e.y));
  if (!e.shootTimer) e.shootTimer = 30;
}

function updateBomber(e) {
  e.x = wrapX(e.x + e.vx);
  e.y += Math.sin(tick * 0.02 + e.phaseOffset) * 0.3;
  e.y = Math.max(PLAY_TOP + 20, Math.min(GROUND_Y - 60, e.y));
  e.mineTimer--;
  if (e.mineTimer <= 0) {
    mines.push({
      x: e.x,
      y: e.y + 8,
      life: 300 + Math.floor(Math.random() * 200)
    });
    e.mineTimer = 60 + Math.floor(Math.random() * 80);
  }
}

function updateBaiter(e) {
  const dx = worldDist(player.x, e.x);
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = 3 + wave * 0.3;
  e.vx += (dx / dist) * 0.2;
  e.vy += (dy / dist) * 0.2;
  const mag = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
  if (mag > speed) {
    e.vx = (e.vx / mag) * speed;
    e.vy = (e.vy / mag) * speed;
  }
  e.x = wrapX(e.x + e.vx);
  e.y += e.vy;
  e.y = Math.max(PLAY_TOP + 5, Math.min(GROUND_Y - 5, e.y));
}

function enemyShoot(e) {
  const dx = worldDist(player.x, e.x);
  const dy = player.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = 3;
  enemies.push({
    type: 'shot',
    x: e.x,
    y: e.y,
    vx: (dx / dist) * speed + (Math.random() - 0.5) * 0.5,
    vy: (dy / dist) * speed + (Math.random() - 0.5) * 0.5,
    alive: true,
    hp: 1,
    life: 80,
    color: '#f88'
  });
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) { enemies.splice(i, 1); continue; }

    if (e.type === 'shot') {
      e.x = wrapX(e.x + e.vx);
      e.y += e.vy;
      e.life--;
      if (e.life <= 0 || e.y < PLAY_TOP || e.y > GROUND_Y + 20) {
        enemies.splice(i, 1);
        continue;
      }
      if (invincibleTimer <= 0) {
        const dx = Math.abs(worldDist(e.x, player.x));
        const dy = Math.abs(e.y - player.y);
        if (dx < 12 && dy < 8) {
          enemies.splice(i, 1);
          playerHit();
          return;
        }
      }
      continue;
    }

    if (e.type === 'lander') updateLander(e);
    else if (e.type === 'bomber') updateBomber(e);
    else if (e.type === 'baiter') updateBaiter(e);
    else if (e.type === 'mutant') updateMutant(e);

    if (e.shootTimer !== undefined) {
      e.shootTimer--;
      if (e.shootTimer <= 0 && e.type !== 'bomber') {
        enemyShoot(e);
        e.shootTimer = 40 + Math.floor(Math.random() * 80);
      }
    }
  }
}

function updateHumans() {
  for (const h of humans) {
    if (!h.alive) continue;

    if (h.falling) {
      h.vy += 0.15;
      h.y += h.vy;
      const dx = Math.abs(worldDist(h.x, player.x));
      const dy = Math.abs(h.y - player.y);
      if (dx < 20 && dy < 16) {
        h.falling = false;
        h.rescued = true;
        h.vy = 0;
        score += 500;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        spawnParticles(h.x, h.y, '#4f8', 8);
      }
      if (h.y >= GROUND_Y) {
        h.y = GROUND_Y;
        h.falling = false;
        h.rescued = false;
        h.vy = 0;
      }
      if (h.y < 0) {
        h.alive = false;
      }
    } else if (h.rescued) {
      h.x = player.x;
      h.y = player.y + 14;
      if (h.y >= GROUND_Y - 2) {
        h.y = GROUND_Y;
        h.rescued = false;
        score += 500;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        spawnParticles(h.x, h.y, '#4f8', 6);
      }
    }
  }
}

function killEnemy(e) {
  e.alive = false;
  score += e.points;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
  spawnParticles(e.x, e.y, e.color, 10);
  if (e.target && e.target.alive && e.target.carried) {
    e.target.carried = false;
    e.target.carriedBy = null;
    e.target.falling = true;
    e.target.vy = 0;
  }
}

function fireBullet() {
  fireCooldown = FIRE_COOLDOWN;
  bullets.push({
    x: wrapX(player.x + player.dir * 18),
    y: player.y,
    vx: BULLET_SPEED * player.dir,
    vy: 0,
    life: BULLET_LIFE
  });
}

function playerHit() {
  lives--;
  livesEl.textContent = lives;
  spawnParticles(player.x, player.y, THEME, 15);

  if (lives <= 0) {
    gameOver();
    return;
  }

  invincibleTimer = INVINCIBLE_TIME;
  player.vx = 0;
  player.vy = 0;
  player.y = H / 2;
}

function nextWave() {
  wave++;
  waveEl.textContent = wave;
  smartBombs = Math.min(smartBombs + 1, 6);
  bombsEl.textContent = smartBombs;

  const aliveHumans = humans.filter(h => h.alive);
  score += aliveHumans.length * 100;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }

  spawnEnemies();

  const neededHumans = 8 + wave;
  while (humans.filter(h => h.alive).length < Math.min(neededHumans, 15)) {
    humans.push({
      x: Math.random() * WORLD_W,
      y: GROUND_Y,
      alive: true,
      falling: false,
      carried: false,
      carriedBy: null,
      vy: 0,
      rescued: false
    });
  }
}

// gameOver reference - set inside createGame
let gameOver;

// ── Drawing helpers ──

function drawStars(renderer) {
  for (const s of stars) {
    const sx = worldToScreen(s.x);
    const psx = ((sx - W / 2) * 0.5) + W / 2;
    if (psx > -2 && psx < W + 2) {
      const twinkle = (Math.sin(tick * 0.05 + s.x) + 1) * 0.5;
      const alpha = s.brightness * (0.5 + twinkle * 0.5);
      const a255 = Math.round(alpha * 255);
      const hex = a255.toString(16).padStart(2, '0');
      renderer.fillRect(psx, s.y, s.size, s.size, `#ffffff${hex}`);
    }
  }
}

function drawTerrain(renderer) {
  // Build terrain polygon as a series of filled rectangles/columns to approximate the fill
  // Use fillPoly for the terrain mass and drawLine for the glow outline
  const terrainPoints = [];
  const outlinePoints = [];

  for (let sx = -10; sx <= W + 10; sx += 4) {
    const wx = wrapX(cameraX - W / 2 + sx);
    const h = getTerrainH(wx);
    terrainPoints.push({ x: sx, y: H - h });
    outlinePoints.push({ x: sx, y: H - h });
  }

  // Close the terrain polygon along the bottom
  terrainPoints.push({ x: W + 10, y: H });
  terrainPoints.push({ x: -10, y: H });

  // Fill terrain mass
  renderer.fillPoly(terrainPoints, '#0a2818');

  // Outline with stroke
  renderer.strokePoly(outlinePoints, '#1a5a30', 1, false);

  // Glowing top line
  renderer.setGlow('#4f8', 0.3);
  renderer.strokePoly(outlinePoints, '#2a8a4a', 1, false);
  renderer.setGlow(null);
}

function drawHumans(renderer) {
  renderer.setGlow('#4af', 0.4);
  for (const h of humans) {
    if (!h.alive) continue;
    const sx = worldToScreen(h.x);
    if (sx < -20 || sx > W + 20) continue;

    // Head
    renderer.fillCircle(sx, h.y - 10, 3, '#4af');
    // Body
    renderer.drawLine(sx, h.y - 7, sx, h.y - 1, '#4af', 2);
    // Legs
    renderer.drawLine(sx, h.y - 1, sx - 3, h.y + 3, '#4af', 2);
    renderer.drawLine(sx, h.y - 1, sx + 3, h.y + 3, '#4af', 2);
    // Arms
    renderer.drawLine(sx - 4, h.y - 5, sx + 4, h.y - 5, '#4af', 2);
  }
  renderer.setGlow(null);
}

function drawMines(renderer) {
  for (const m of mines) {
    const sx = worldToScreen(m.x);
    if (sx < -10 || sx > W + 10) continue;
    const pulse = Math.sin(tick * 0.15) * 0.3 + 0.7;
    const a255 = Math.round(pulse * 255);
    const hex = a255.toString(16).padStart(2, '0');
    renderer.setGlow('#f80', 0.5);
    // Diamond shape
    const pts = [
      { x: sx, y: m.y - 5 },
      { x: sx + 5, y: m.y },
      { x: sx, y: m.y + 5 },
      { x: sx - 5, y: m.y }
    ];
    renderer.fillPoly(pts, `#ff8800${hex}`);
    renderer.setGlow(null);
  }
}

function drawEnemies(renderer) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const sx = worldToScreen(e.x);
    if (sx < -30 || sx > W + 30) continue;

    if (e.type === 'shot') {
      renderer.setGlow('#f88', 0.4);
      renderer.fillCircle(sx, e.y, 3, '#f88');
      renderer.setGlow(null);
      continue;
    }

    renderer.setGlow(e.color, 0.6);

    if (e.type === 'lander') {
      drawLander(renderer, sx, e);
    } else if (e.type === 'bomber') {
      drawBomberShape(renderer, sx, e);
    } else if (e.type === 'baiter') {
      drawBaiterShape(renderer, sx, e);
    } else if (e.type === 'mutant') {
      drawMutantShape(renderer, sx, e);
    }

    renderer.setGlow(null);
  }
}

function drawLander(renderer, sx, e) {
  // UFO body - approximate ellipse with a filled polygon
  const bodyPts = [];
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    bodyPts.push({ x: sx + Math.cos(ang) * 12, y: e.y + Math.sin(ang) * 6 });
  }
  renderer.fillPoly(bodyPts, e.color);

  // Dome - upper half ellipse
  const domePts = [];
  for (let i = 0; i <= 8; i++) {
    const ang = Math.PI + (i / 8) * Math.PI;
    domePts.push({ x: sx + Math.cos(ang) * 6, y: e.y - 4 + Math.sin(ang) * 5 });
  }
  renderer.fillPoly(domePts, '#faa');

  // Beam if descending/ascending
  if (e.state === 'descending' || e.state === 'ascending') {
    const beamAlpha = 0.3 + Math.sin(tick * 0.1) * 0.2;
    const a255 = Math.round(beamAlpha * 255);
    const hex = a255.toString(16).padStart(2, '0');
    renderer.drawLine(sx, e.y + 6, sx, GROUND_Y, `#ff4444${hex}`, 2);
  }
}

function drawBomberShape(renderer, sx, e) {
  // Angular diamond ship
  const pts = [
    { x: sx - 10, y: e.y },
    { x: sx, y: e.y - 8 },
    { x: sx + 10, y: e.y },
    { x: sx, y: e.y + 8 }
  ];
  renderer.fillPoly(pts, e.color);
  // Center dot
  renderer.fillCircle(sx, e.y, 3, '#ff0');
}

function drawBaiterShape(renderer, sx, e) {
  const wobble = Math.sin(tick * 0.2 + e.phaseOffset) * 2;
  // Sleek shape
  const pts = [
    { x: sx - 14, y: e.y + wobble },
    { x: sx + 14, y: e.y - 2 },
    { x: sx + 14, y: e.y + 2 },
    { x: sx - 14, y: e.y + 4 + wobble }
  ];
  renderer.fillPoly(pts, e.color);
  // Glow trail
  renderer.drawLine(sx - 14, e.y + 2 + wobble, sx - 22, e.y + 2 + wobble, '#ffff0066', 2);
}

function drawMutantShape(renderer, sx, e) {
  const rot = tick * 0.1;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI * 2 / 6) * i + rot;
    const r = 8 + Math.sin(ang * 3 + tick * 0.05) * 3;
    pts.push({ x: sx + Math.cos(ang) * r, y: e.y + Math.sin(ang) * r });
  }
  renderer.fillPoly(pts, e.color);
}

function drawBullets(renderer) {
  renderer.setGlow(THEME, 0.5);
  for (const b of bullets) {
    const sx = worldToScreen(b.x);
    if (sx < -5 || sx > W + 5) continue;
    renderer.fillRect(sx - 6, b.y - 1, 12, 2, THEME);
  }
  renderer.setGlow(null);
}

function drawPlayer(renderer) {
  if (invincibleTimer > 0 && Math.floor(tick / 3) % 2 === 0) return;

  const sx = worldToScreen(player.x);
  const dir = player.dir;

  renderer.setGlow(THEME, 0.8);

  // Ship body polygon
  const shipPts = [
    { x: sx + dir * 16, y: player.y },
    { x: sx - dir * 12, y: player.y - 7 },
    { x: sx - dir * 8, y: player.y },
    { x: sx - dir * 12, y: player.y + 7 }
  ];
  renderer.fillPoly(shipPts, THEME);

  // Engine glow
  if (Math.abs(player.vx) > 1) {
    const glowAlpha = Math.min(1, Math.abs(player.vx) / PLAYER_MAX_SPEED);
    const a255 = Math.round(glowAlpha * 0.6 * 255);
    const hex = a255.toString(16).padStart(2, '0');
    const engineLen = 16 + Math.random() * 6;
    const flamePts = [
      { x: sx - dir * 12, y: player.y - 4 },
      { x: sx - dir * engineLen, y: player.y },
      { x: sx - dir * 12, y: player.y + 4 }
    ];
    renderer.fillPoly(flamePts, `#44ff88${hex}`);
  }

  renderer.setGlow(null);
}

function drawParticles(renderer) {
  for (const p of particles) {
    if (p.isFlash) continue;
    const sx = worldToScreen(p.x);
    if (sx < -10 || sx > W + 10) continue;
    const alpha = Math.min(1, p.life / 15);
    const a255 = Math.round(alpha * 255);
    const hex = a255.toString(16).padStart(2, '0');
    // Expand short hex color to 6-digit then add alpha
    const c = p.color;
    let rgb;
    if (c.length === 4) {
      rgb = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    } else {
      rgb = c;
    }
    renderer.fillRect(sx - 2, p.y - 2, 4, 4, rgb + hex);
  }
}

function drawSmartBombFlash(renderer) {
  const flash = particles.find(p => p.isFlash);
  if (flash) {
    const alpha = flash.life / 15;
    const a255 = Math.round(alpha * 0.3 * 255);
    const hex = a255.toString(16).padStart(2, '0');
    renderer.fillRect(0, 0, W, H, `#ffffff${hex}`);
  }
}

function drawRadar(renderer, text) {
  // Background
  renderer.fillRect(0, RADAR_Y, W, RADAR_H, '#0a0a1ee6');

  // Border
  renderer.strokePoly([
    { x: 0, y: RADAR_Y },
    { x: W, y: RADAR_Y },
    { x: W, y: RADAR_Y + RADAR_H },
    { x: 0, y: RADAR_Y + RADAR_H }
  ], '#1a4a2a', 1, true);

  const radarScale = W / WORLD_W;

  // Viewport indicator
  const viewLeft = wrapX(cameraX - W / 2);
  const viewSx = viewLeft * radarScale;
  const viewW = W * radarScale;
  renderer.strokePoly([
    { x: viewSx, y: RADAR_Y },
    { x: viewSx + viewW, y: RADAR_Y },
    { x: viewSx + viewW, y: RADAR_Y + RADAR_H },
    { x: viewSx, y: RADAR_Y + RADAR_H }
  ], '#44ff884d', 1, true);

  // Terrain on radar (simplified as small rectangles)
  for (let i = 0; i < terrain.length - 1; i++) {
    const rx = terrain[i].x * radarScale;
    const rh = terrain[i].h * (RADAR_H / (H * 1.5));
    const rw = (terrain[i + 1].x - terrain[i].x) * radarScale;
    renderer.fillRect(rx, RADAR_Y + RADAR_H - rh, Math.max(rw, 1), rh, '#1a3a22');
  }

  // Humans on radar
  for (const h of humans) {
    if (!h.alive) continue;
    const rx = wrapX(h.x) * radarScale;
    renderer.fillRect(rx - 1, RADAR_Y + RADAR_H - 4, 2, 3, '#4af');
  }

  // Enemies on radar
  for (const e of enemies) {
    if (!e.alive || e.type === 'shot') continue;
    const rx = wrapX(e.x) * radarScale;
    const ry = RADAR_Y + ((e.y - PLAY_TOP) / (GROUND_Y - PLAY_TOP)) * RADAR_H;
    renderer.fillRect(rx - 1, Math.max(RADAR_Y, ry) - 1, 2, 2, e.color);
  }

  // Mines on radar
  for (const m of mines) {
    const rx = wrapX(m.x) * radarScale;
    renderer.fillRect(rx, RADAR_Y + RADAR_H - 8, 1, 1, '#f80');
  }

  // Player on radar
  const prx = wrapX(player.x) * radarScale;
  const pry = RADAR_Y + ((player.y - PLAY_TOP) / (GROUND_Y - PLAY_TOP)) * RADAR_H;
  renderer.setGlow(THEME, 0.4);
  renderer.fillRect(prx - 2, pry - 1, 4, 2, THEME);
  renderer.setGlow(null);
}

function drawHUD(renderer, text) {
  const hudY = PLAY_TOP + 4;

  // Lives indicators (small ships)
  renderer.setGlow(THEME, 0.4);
  for (let i = 0; i < lives - 1; i++) {
    const lx = 10 + i * 20;
    const pts = [
      { x: lx + 10, y: hudY + 4 },
      { x: lx, y: hudY },
      { x: lx + 3, y: hudY + 4 },
      { x: lx, y: hudY + 8 }
    ];
    renderer.fillPoly(pts, THEME);
  }

  // Smart bomb indicators
  renderer.setGlow('#ff0', 0.4);
  for (let i = 0; i < smartBombs; i++) {
    const bx = W - 20 - i * 16;
    renderer.fillCircle(bx, hudY + 4, 5, '#ff0');
  }
  renderer.setGlow(null);

  // Wave number
  text.drawText(`WAVE ${wave}`, W / 2, hudY, 10, '#888', 'center');
}


// ── Smart bomb ──
function doSmartBomb() {
  if (smartBombs <= 0) return;
  smartBombs--;
  bombsEl.textContent = smartBombs;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) continue;
    if (isOnScreen(e.x, 50)) {
      killEnemy(e);
    }
  }
  for (let i = mines.length - 1; i >= 0; i--) {
    if (isOnScreen(mines[i].x, 50)) {
      spawnParticles(mines[i].x, mines[i].y, '#f80', 4);
      mines.splice(i, 1);
    }
  }
  particles.push({
    x: player.x, y: player.y,
    vx: 0, vy: 0,
    life: 15,
    color: '#fff',
    isFlash: true
  });
}

function doHyperspace() {
  player.x = Math.random() * WORLD_W;
  player.y = PLAY_TOP + 30 + Math.random() * (GROUND_Y - PLAY_TOP - 80);
  player.vx = 0;
  player.vy = 0;
  invincibleTimer = 30;
  if (Math.random() < 0.15) {
    spawnParticles(player.x, player.y, THEME, 20);
    playerHit();
  }
}


// ── Main export ──

export function createGame() {
  const game = new Game('game');

  gameOver = () => {
    game.showOverlay('GAME OVER', `Score: ${score} | Wave: ${wave} -- Press any key to restart`);
    game.setState('over');
  };

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    lives = 3;
    smartBombs = 3;
    wave = 1;
    livesEl.textContent = lives;
    bombsEl.textContent = smartBombs;
    waveEl.textContent = wave;
    tick = 0;
    fireCooldown = 0;
    invincibleTimer = 0;
    cameraX = 0;
    player = { x: WORLD_W / 2, y: H / 2, vx: 0, vy: 0, dir: 1 };
    bullets = [];
    enemies = [];
    humans = [];
    particles = [];
    mines = [];
    generateTerrain();
    generateStars();
    spawnHumans();
    game.showOverlay('DEFENDER', 'Arrows:Move  Space:Fire  Shift:Bomb  Z:Hyperspace');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        invincibleTimer = INVINCIBLE_TIME;
        spawnEnemies();
        game.setState('playing');
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

    if (fireCooldown > 0) fireCooldown--;
    if (invincibleTimer > 0) invincibleTimer--;

    // Player movement
    if (input.isDown('ArrowLeft')) {
      player.dir = -1;
      player.vx -= PLAYER_ACCEL;
    }
    if (input.isDown('ArrowRight')) {
      player.dir = 1;
      player.vx += PLAYER_ACCEL;
    }
    if (input.isDown('ArrowUp')) {
      player.vy -= PLAYER_ACCEL;
    }
    if (input.isDown('ArrowDown')) {
      player.vy += PLAYER_ACCEL;
    }

    // Friction
    if (!input.isDown('ArrowLeft') && !input.isDown('ArrowRight')) player.vx *= 0.92;
    if (!input.isDown('ArrowUp') && !input.isDown('ArrowDown')) player.vy *= 0.92;

    // Speed limits
    player.vx = Math.max(-PLAYER_MAX_SPEED, Math.min(PLAYER_MAX_SPEED, player.vx));
    player.vy = Math.max(-PLAYER_SPEED, Math.min(PLAYER_SPEED, player.vy));

    player.x = wrapX(player.x + player.vx);
    player.y += player.vy;
    player.y = Math.max(PLAY_TOP + 10, Math.min(GROUND_Y - SHIP_H, player.y));

    // Camera follows player
    const targetCamX = wrapX(player.x + player.dir * 80);
    let camDiff = worldDist(targetCamX, cameraX);
    cameraX = wrapX(cameraX + camDiff * 0.08);

    // Continuous fire
    if (input.isDown(' ') && fireCooldown <= 0) {
      fireBullet();
    }

    // Smart bomb (on press only)
    if (input.wasPressed('Shift')) {
      doSmartBomb();
    }

    // Hyperspace (on press only)
    if (input.wasPressed('z') || input.wasPressed('Z')) {
      doHyperspace();
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = wrapX(b.x + b.vx);
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.y < PLAY_TOP || b.y > GROUND_Y + 10) {
        bullets.splice(i, 1);
      }
    }

    // Update enemies
    updateEnemies();

    // Update mines
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      m.life--;
      if (m.life <= 0) {
        mines.splice(i, 1);
        continue;
      }
      if (invincibleTimer <= 0) {
        const dx = Math.abs(worldDist(m.x, player.x));
        const dy = Math.abs(m.y - player.y);
        if (dx < 10 && dy < 10) {
          mines.splice(i, 1);
          playerHit();
          return;
        }
      }
    }

    // Update humans
    updateHumans();

    // Bullet vs enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!e.alive) continue;
        const dx = Math.abs(worldDist(b.x, e.x));
        const dy = Math.abs(b.y - e.y);
        const hitW = e.type === 'baiter' ? 14 : 12;
        const hitH = e.type === 'baiter' ? 8 : 10;
        if (dx < hitW && dy < hitH) {
          e.hp--;
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            killEnemy(e);
          } else {
            spawnParticles(e.x, e.y, '#fff', 3);
          }
          break;
        }
      }
    }

    // Bullet vs mine collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = mines.length - 1; j >= 0; j--) {
        const m = mines[j];
        const dx = Math.abs(worldDist(b.x, m.x));
        const dy = Math.abs(b.y - m.y);
        if (dx < 8 && dy < 8) {
          mines.splice(j, 1);
          bullets.splice(i, 1);
          spawnParticles(m.x, m.y, '#f80', 5);
          score += 25;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          break;
        }
      }
    }

    // Enemy vs player collisions
    if (invincibleTimer <= 0) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = Math.abs(worldDist(e.x, player.x));
        const dy = Math.abs(e.y - player.y);
        if (dx < 18 && dy < 12) {
          killEnemy(e);
          playerHit();
          return;
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vy += 0.02;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Check wave complete
    const liveEnemies = enemies.filter(e => e.alive && e.type !== 'shot');
    if (liveEnemies.length === 0) {
      nextWave();
    }

    // Baiter spawn timer
    if (tick % 600 === 0 && tick > 300) {
      spawnBaiter();
    }

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerDir: player.dir,
      cameraX: cameraX,
      enemyCount: enemies.filter(e => e.alive).length,
      humanCount: humans.filter(h => h.alive).length,
      wave: wave,
      lives: lives,
      smartBombs: smartBombs
    };
  };

  game.onDraw = (renderer, text) => {
    // Stars (behind everything)
    drawStars(renderer);

    // Terrain/ground
    drawTerrain(renderer);

    // Humans
    drawHumans(renderer);

    // Mines
    drawMines(renderer);

    // Enemies
    drawEnemies(renderer);

    // Bullets
    drawBullets(renderer);

    // Player
    drawPlayer(renderer);

    // Particles
    drawParticles(renderer);

    // Smart bomb flash
    drawSmartBombFlash(renderer);

    // Radar/minimap
    drawRadar(renderer, text);

    // HUD
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
