// missile-command/game.js — Missile Command game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Ground level
const GROUND_Y = 460;
const GROUND_H = H - GROUND_Y;

// Cities: 6 cities in two groups of 3, gaps for bases
const CITY_W = 30;
const CITY_H = 20;
const cityPositions = [55, 100, 145, 305, 350, 395];

// Missile bases: left, center, right
const BASE_W = 24;
const BASE_H = 18;
const basePositions = [30, 245, 455];

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Game State ---
let score, best = 0;
let cities;       // { x, alive }
let bases;        // { x, ammo, maxAmmo }
let counterMissiles; // { sx, sy, tx, ty, x, y, speed, trail }
let explosions;   // { x, y, radius, maxRadius, growing, life }
let icbms;        // { sx, sy, tx, ty, x, y, speed, trail, mirv, mirvSplit, splitDone }
let particles;    // { x, y, vx, vy, life, color }

// Wave management
let wave, icbmQueue, icbmSpawnTimer, icbmSpawnInterval;
let waveComplete, waveCompleteTimer;
let selectedBase;

// Mouse tracking
let mouseX = W / 2, mouseY = H / 2;
let pendingClicks; // queued click positions

// Stars (fixed positions for background)
const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * (GROUND_Y - 20), size: Math.random() * 1.5 + 0.5, flicker: Math.random() });
}

// --- Helpers ---

// Expand #rgb to #rrggbb so we can append alpha hex bytes
function hexExpand(c) {
  if (c.length === 4) { // #rgb
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
}

function getICBMSpeed() {
  return 0.8 + wave * 0.2 + Math.random() * 0.3;
}

function getTargets() {
  const targets = [];
  cities.forEach(c => { if (c.alive) targets.push({ x: c.x + CITY_W / 2, y: GROUND_Y }); });
  bases.forEach(b => { targets.push({ x: b.x, y: GROUND_Y }); });
  return targets;
}

function spawnICBM() {
  const targets = getTargets();
  if (targets.length === 0) return;
  const target = targets[Math.floor(Math.random() * targets.length)];
  const sx = Math.random() * (W - 40) + 20;
  const sy = -10;
  const isMirv = wave >= 3 && Math.random() < Math.min(0.3 + (wave - 3) * 0.05, 0.5);
  const speed = getICBMSpeed();

  icbms.push({
    sx, sy,
    tx: target.x + (Math.random() - 0.5) * 10,
    ty: target.y,
    x: sx, y: sy,
    speed,
    trail: [{ x: sx, y: sy }],
    mirv: isMirv,
    mirvSplit: 100 + Math.random() * 200,
    splitDone: false
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 1,
      life: 15 + Math.random() * 20,
      color
    });
  }
}

function hitGround(x, y) {
  cities.forEach(c => {
    if (!c.alive) return;
    if (Math.abs(x - (c.x + CITY_W / 2)) < CITY_W * 0.8) {
      c.alive = false;
      spawnParticles(c.x + CITY_W / 2, GROUND_Y - CITY_H / 2, '#f44', 15);
    }
  });
  bases.forEach(b => {
    if (Math.abs(x - b.x) < BASE_W) {
      b.ammo = Math.max(0, b.ammo - 5);
      spawnParticles(b.x, GROUND_Y - BASE_H / 2, '#f80', 8);
    }
  });
}

function findBestBase(tx, ty) {
  let bestBase = -1;
  let bestDist = Infinity;
  bases.forEach((b, i) => {
    if (b.ammo <= 0) return;
    const dx = tx - b.x;
    const dy = ty - (GROUND_Y - BASE_H);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestBase = i;
    }
  });
  return bestBase;
}

function fireMissile(tx, ty, gameState) {
  if (gameState !== 'playing') return;
  if (ty > GROUND_Y - 10) ty = GROUND_Y - 10;

  let baseIdx = selectedBase;
  if (bases[baseIdx].ammo <= 0) {
    baseIdx = findBestBase(tx, ty);
  }
  if (baseIdx === -1) return;

  const b = bases[baseIdx];
  b.ammo--;

  const sx = b.x;
  const sy = GROUND_Y - BASE_H;

  counterMissiles.push({
    sx, sy,
    tx, ty,
    x: sx, y: sy,
    speed: 6,
    trail: [{ x: sx, y: sy }]
  });
}

function nextWave() {
  wave++;
  waveComplete = false;
  waveCompleteTimer = 0;

  const baseAmmo = Math.min(10 + Math.floor(wave / 3) * 2, 20);
  bases.forEach(b => {
    b.ammo = baseAmmo;
    b.maxAmmo = baseAmmo;
  });

  const missileCount = 8 + wave * 3;
  const mirvCount = wave >= 3 ? Math.floor((wave - 2) * 1.5) : 0;
  icbmQueue = missileCount + mirvCount;
  icbmSpawnInterval = Math.max(15, 60 - wave * 4);
  icbmSpawnTimer = 0;
}

// === Export ===

export function createGame() {
  const game = new Game('game');
  const canvas = document.getElementById('game');

  // Mouse tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });

  // Click to fire (queue clicks for processing in onUpdate)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    mouseX = cx;
    mouseY = cy;

    if (game.state === 'waiting') {
      game.setState('playing');
      nextWave();
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    if (game.state === 'playing') {
      pendingClicks.push({ x: cx, y: cy });
    }
  });

  // Prevent context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    wave = 0;
    selectedBase = 1;

    cities = cityPositions.map(x => ({ x, alive: true }));
    bases = basePositions.map(x => ({ x, ammo: 10, maxAmmo: 10 }));

    counterMissiles = [];
    explosions = [];
    icbms = [];
    particles = [];
    icbmQueue = 0;
    icbmSpawnTimer = 0;
    waveComplete = false;
    waveCompleteTimer = 0;
    pendingClicks = [];

    mouseX = W / 2;
    mouseY = H / 2;

    canvas.style.cursor = 'crosshair';
    game.showOverlay('MISSILE COMMAND', 'Click to start | 1/2/3 = select base');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from keyboard
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.setState('playing');
        nextWave();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---

    // Base selection via keyboard
    if (input.wasPressed('1')) selectedBase = 0;
    if (input.wasPressed('2')) selectedBase = 1;
    if (input.wasPressed('3')) selectedBase = 2;

    // Process queued clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      fireMissile(click.x, click.y, game.state);
    }

    // Spawn ICBMs from queue
    if (icbmQueue > 0) {
      icbmSpawnTimer++;
      if (icbmSpawnTimer >= icbmSpawnInterval) {
        icbmSpawnTimer = 0;
        spawnICBM();
        icbmQueue--;
      }
    }

    // Update counter-missiles
    for (let i = counterMissiles.length - 1; i >= 0; i--) {
      const cm = counterMissiles[i];
      const dx = cm.tx - cm.x;
      const dy = cm.ty - cm.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < cm.speed) {
        explosions.push({
          x: cm.tx, y: cm.ty,
          radius: 0, maxRadius: 35 + wave * 2,
          growing: true, life: 1
        });
        counterMissiles.splice(i, 1);
      } else {
        cm.x += (dx / dist) * cm.speed;
        cm.y += (dy / dist) * cm.speed;
        cm.trail.push({ x: cm.x, y: cm.y });
        if (cm.trail.length > 30) cm.trail.shift();
      }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i];
      if (ex.growing) {
        ex.radius += 1.2;
        if (ex.radius >= ex.maxRadius) {
          ex.growing = false;
        }
      } else {
        ex.life -= 0.025;
        ex.radius -= 0.4;
        if (ex.life <= 0 || ex.radius <= 0) {
          explosions.splice(i, 1);
        }
      }
    }

    // Update ICBMs
    for (let i = icbms.length - 1; i >= 0; i--) {
      const m = icbms[i];
      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // MIRV split check
      if (m.mirv && !m.splitDone && m.y > m.mirvSplit) {
        m.splitDone = true;
        const splitCount = 2 + (wave >= 6 ? 1 : 0);
        for (let s = 0; s < splitCount; s++) {
          const targets = getTargets();
          if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            const speed = getICBMSpeed() * 1.1;
            icbms.push({
              sx: m.x, sy: m.y,
              tx: t.x + (Math.random() - 0.5) * 20,
              ty: t.y,
              x: m.x + (Math.random() - 0.5) * 30,
              y: m.y,
              speed,
              trail: [{ x: m.x, y: m.y }],
              mirv: false, mirvSplit: 0, splitDone: false
            });
          }
        }
        spawnParticles(m.x, m.y, '#f80', 6);
        icbms.splice(i, 1);
        continue;
      }

      if (dist < m.speed) {
        hitGround(m.tx, m.ty);
        spawnParticles(m.tx, m.ty, '#f44', 10);
        icbms.splice(i, 1);
      } else {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
        m.trail.push({ x: m.x, y: m.y });
        if (m.trail.length > 50) m.trail.shift();

        // Check if ICBM hit by any explosion
        let destroyed = false;
        for (const ex of explosions) {
          const edx = m.x - ex.x;
          const edy = m.y - ex.y;
          if (Math.sqrt(edx * edx + edy * edy) < ex.radius) {
            destroyed = true;
            break;
          }
        }
        if (destroyed) {
          score += 25;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          spawnParticles(m.x, m.y, '#c4f', 8);
          icbms.splice(i, 1);
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Check wave completion
    if (!waveComplete && icbmQueue === 0 && icbms.length === 0) {
      waveComplete = true;
      waveCompleteTimer = 90;
    }

    if (waveComplete) {
      waveCompleteTimer--;
      if (waveCompleteTimer <= 0) {
        const survivingCities = cities.filter(c => c.alive).length;
        const bonus = survivingCities * 100;
        score += bonus;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        nextWave();
      }
    }

    // Check game over
    if (cities.every(c => !c.alive)) {
      game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Wave ' + wave + ' -- Click to restart');
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    for (const s of stars) {
      const a = 0.3 + ((s.flicker * 137.5 + performance.now() * 0.001) % 1) * 0.2;
      const ah = Math.round(a * 255).toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, '#ffffff' + ah);
    }

    // ICBM trails and heads
    for (const m of icbms) {
      const trailColor = m.mirv && !m.splitDone ? '#f80' : '#f44';
      if (m.trail.length > 1) {
        for (let i = 0; i < m.trail.length - 1; i++) {
          renderer.drawLine(m.trail[i].x, m.trail[i].y, m.trail[i + 1].x, m.trail[i + 1].y, trailColor, 1.5);
        }
      }
      const headColor = m.mirv && !m.splitDone ? '#ff0' : '#f44';
      const headR = m.mirv && !m.splitDone ? 4 : 3;
      renderer.setGlow(headColor, 0.5);
      renderer.fillCircle(m.x, m.y, headR, headColor);
      renderer.setGlow(null);
    }

    // Counter-missile trails and heads
    for (const cm of counterMissiles) {
      if (cm.trail.length > 1) {
        for (let i = 0; i < cm.trail.length - 1; i++) {
          renderer.drawLine(cm.trail[i].x, cm.trail[i].y, cm.trail[i + 1].x, cm.trail[i + 1].y, '#48f', 1.5);
        }
      }
      renderer.setGlow('#48f', 0.6);
      renderer.fillCircle(cm.x, cm.y, 3, '#48f');
      renderer.setGlow(null);
    }

    // Explosions (approximate the radial gradient with concentric circles)
    for (const ex of explosions) {
      const alpha = ex.life * 0.8;
      if (ex.radius > 0) {
        // Outer ring: purple, faded
        const outerA = Math.round(Math.max(0, alpha * 0.4) * 255).toString(16).padStart(2, '0');
        renderer.fillCircle(ex.x, ex.y, ex.radius, '#cc44ff' + outerA);
        // Mid ring: orange
        const midA = Math.round(Math.max(0, alpha * 0.6) * 255).toString(16).padStart(2, '0');
        renderer.fillCircle(ex.x, ex.y, ex.radius * 0.6, '#ffb450' + midA);
        // Inner core: white-hot
        const innerA = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
        renderer.fillCircle(ex.x, ex.y, ex.radius * 0.3, '#ffffff' + innerA);
      }
    }

    // Ground
    renderer.fillRect(0, GROUND_Y, W, GROUND_H, '#2a1a3e');
    renderer.fillRect(0, GROUND_Y, W, 3, '#3a2a4e');

    // Cities
    for (const c of cities) {
      if (!c.alive) {
        // Rubble (deterministic)
        for (let j = 0; j < 4; j++) {
          const rh = 3 + ((c.x * 3 + j * 7) % 4);
          const ry = GROUND_Y - 3 - ((c.x * 5 + j * 11) % 5);
          renderer.fillRect(c.x + j * 8, ry, 6, rh, '#3a2a3e');
        }
        continue;
      }
      // Alive city: buildings with glow
      renderer.setGlow('#c4f', 0.5);
      renderer.fillRect(c.x, GROUND_Y - 18, 8, 18, '#c4f');
      renderer.fillRect(c.x + 10, GROUND_Y - 14, 10, 14, '#c4f');
      renderer.fillRect(c.x + 22, GROUND_Y - 20, 8, 20, '#c4f');
      renderer.setGlow(null);
      // Windows (small yellow dots, deterministic per city)
      let wi = 0;
      for (let bx = c.x + 2; bx < c.x + CITY_W; bx += 12) {
        for (let by = GROUND_Y - 16; by < GROUND_Y - 2; by += 5) {
          wi++;
          if ((c.x * 7 + wi * 13) % 10 > 2) {
            renderer.fillRect(bx, by, 2, 2, '#ff0');
          }
        }
      }
    }

    // Missile bases
    for (let idx = 0; idx < bases.length; idx++) {
      const b = bases[idx];
      const bx = b.x;
      const isSelected = idx === selectedBase;
      const baseColor = isSelected ? '#c4f' : '#8a6aae';

      // Triangular silo
      renderer.setGlow('#c4f', isSelected ? 0.7 : 0.3);
      renderer.fillPoly([
        { x: bx - BASE_W / 2, y: GROUND_Y },
        { x: bx, y: GROUND_Y - BASE_H },
        { x: bx + BASE_W / 2, y: GROUND_Y }
      ], baseColor);
      renderer.setGlow(null);

      // Ammo count above base
      const ammoColor = b.ammo > 0 ? '#c4f' : '#555';
      text.drawText(String(b.ammo), bx, GROUND_Y - BASE_H - 12, 10, ammoColor, 'center');

      // Base number
      const numColor = isSelected ? '#fff' : '#888';
      text.drawText(String(idx + 1), bx, GROUND_Y - 10, 9, numColor, 'center');
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 35);
      const ah = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, hexExpand(p.color) + ah);
    }

    // Crosshair at mouse position (during gameplay)
    if (game.state === 'playing') {
      renderer.setGlow('#c4f', 0.5);
      renderer.drawLine(mouseX - 10, mouseY, mouseX - 4, mouseY, '#c4f', 1);
      renderer.drawLine(mouseX + 4, mouseY, mouseX + 10, mouseY, '#c4f', 1);
      renderer.drawLine(mouseX, mouseY - 10, mouseX, mouseY - 4, '#c4f', 1);
      renderer.drawLine(mouseX, mouseY + 4, mouseX, mouseY + 10, '#c4f', 1);
      renderer.setGlow(null);
    }

    // Wave indicator
    if (game.state === 'playing') {
      text.drawText('WAVE ' + wave, 8, 4, 12, '#c4f', 'left');
      const alive = cities.filter(c => c.alive).length;
      text.drawText('CITIES: ' + alive, W - 8, 4, 12, '#c4f', 'right');
    }

    // Wave complete bonus display
    if (waveComplete && waveCompleteTimer > 30) {
      renderer.setGlow('#c4f', 0.6);
      text.drawText('WAVE ' + wave + ' COMPLETE', W / 2, H / 2 - 30, 20, '#c4f', 'center');
      renderer.setGlow(null);
      const survivingCities = cities.filter(c => c.alive).length;
      text.drawText('Bonus: ' + survivingCities + ' cities x 100 = ' + (survivingCities * 100), W / 2, H / 2, 14, '#aaa', 'center');
    }
  };

  game.start();
  return game;
}
