// lunar-lander/game.js — Lunar Lander game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Physics constants
const GRAVITY = 0.02;
const THRUST_POWER = 0.06;
const ROTATION_SPEED = 0.04;
const MAX_SAFE_VY = 1.2;
const MAX_SAFE_VX = 0.8;
const MAX_SAFE_ANGLE = 0.3; // radians from vertical
const FUEL_MAX = 200;

// Ship dimensions
const SHIP_W = 16;
const SHIP_H = 20;

// ── State ──
let score, best = 0;
let ship, terrain, stars, padLeft, padRight, padY;
let level, explosionParticles, landingParticles;
let successTimer;
let crashTimer, crashMsg;
let frameCount;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helpers ──

function generateStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (H * 0.7),
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.5,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
}

function generateTerrain(lvl) {
  terrain = [];
  const segments = 50;
  const segW = W / segments;

  // Pad size gets smaller with level
  const padSize = Math.max(3, 8 - lvl);
  const padStart = Math.floor(Math.random() * (segments - padSize - 10)) + 5;

  const baseY = H - 80;
  const roughness = Math.min(60, 20 + lvl * 8);

  let currentY = baseY;

  for (let i = 0; i <= segments; i++) {
    if (i >= padStart && i <= padStart + padSize) {
      if (i === padStart) {
        padY = currentY;
      }
      terrain.push({ x: i * segW, y: padY });
    } else {
      currentY += (Math.random() - 0.5) * roughness;
      currentY = Math.max(H - 150, Math.min(H - 30, currentY));
      terrain.push({ x: i * segW, y: currentY });
    }
  }

  padLeft = padStart * segW;
  padRight = (padStart + padSize) * segW;
}

function getTerrainY(x) {
  if (x < 0 || x > W) return H;
  const segW = W / 50;
  const idx = Math.floor(x / segW);
  if (idx >= terrain.length - 1) return terrain[terrain.length - 1].y;
  const t = (x - terrain[idx].x) / segW;
  return terrain[idx].y * (1 - t) + terrain[idx + 1].y * t;
}

function isOverPad(x) {
  return x >= padLeft && x <= padRight;
}

function resetShip() {
  ship = {
    x: W / 2 + (Math.random() - 0.5) * 100,
    y: 50,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 0,
    angle: 0,
    fuel: FUEL_MAX,
    thrusting: false
  };
}

function spawnExplosion(x, y) {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    const colors = ['#f44', '#f80', '#ff0', '#48f', '#fff'];
    explosionParticles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 3 + 1
    });
  }
}

// Transform local vertices by position and rotation angle
function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

// Ship polygon (local coords, nose at top when angle=0)
const shipBodyVerts = [
  { x: 0, y: -SHIP_H / 2 },           // nose
  { x: -SHIP_W / 2, y: SHIP_H / 3 },  // bottom left
  { x: -SHIP_W / 4, y: SHIP_H / 2 },  // landing leg left
  { x: SHIP_W / 4, y: SHIP_H / 2 },   // landing leg right
  { x: SHIP_W / 2, y: SHIP_H / 3 }    // bottom right
];

export function createGame() {
  const game = new Game('game');

  function successLanding() {
    const fuelBonus = Math.floor(ship.fuel * 2);
    const velocityBonus = Math.floor((MAX_SAFE_VY - Math.abs(ship.vy)) * 50);
    const accuracyBonus = Math.floor(50 - Math.abs(ship.x - (padLeft + padRight) / 2));
    const levelBonus = level * 100;
    const landingScore = Math.max(0, fuelBonus + velocityBonus + accuracyBonus + levelBonus);

    score += landingScore;
    scoreEl.textContent = score;

    for (let i = 0; i < 20; i++) {
      landingParticles.push({
        x: ship.x + (Math.random() - 0.5) * 20,
        y: ship.y + SHIP_H / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 40 + Math.random() * 30,
        color: Math.random() > 0.5 ? '#48f' : '#0f8'
      });
    }

    successTimer = 90;
  }

  function doGameOver(message) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', message + ' Score: ' + score + ' -- Press SPACE to restart');
    game.setState('over');
  }

  game.onInit = () => {
    score = 0;
    level = 1;
    scoreEl.textContent = '0';
    explosionParticles = [];
    landingParticles = [];
    successTimer = 0;
    crashTimer = 0;
    crashMsg = '';
    frameCount = 0;
    generateStars();
    generateTerrain(level);
    resetShip();
    game.showOverlay('LUNAR LANDER', 'Press SPACE to start -- LEFT/RIGHT: rotate | UP: thrust | Land gently on the pad!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
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

    // Handle success timer (between levels)
    if (successTimer > 0) {
      successTimer--;

      // Update landing particles
      for (let i = landingParticles.length - 1; i >= 0; i--) {
        landingParticles[i].x += landingParticles[i].vx;
        landingParticles[i].y += landingParticles[i].vy;
        landingParticles[i].vy += 0.05;
        landingParticles[i].life--;
        if (landingParticles[i].life <= 0) landingParticles.splice(i, 1);
      }

      if (successTimer === 0) {
        level++;
        landingParticles = [];
        generateTerrain(level);
        resetShip();
      }
      return;
    }

    // Handle crash timer (delay before game over)
    if (crashTimer > 0) {
      crashTimer--;

      // Update explosion particles during crash delay
      for (let i = explosionParticles.length - 1; i >= 0; i--) {
        explosionParticles[i].x += explosionParticles[i].vx;
        explosionParticles[i].y += explosionParticles[i].vy;
        explosionParticles[i].vy += 0.04;
        explosionParticles[i].vx *= 0.98;
        explosionParticles[i].life--;
        if (explosionParticles[i].life <= 0) explosionParticles.splice(i, 1);
      }

      if (crashTimer === 0) {
        doGameOver(crashMsg);
      }
      return;
    }

    // Update explosion particles
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
      explosionParticles[i].x += explosionParticles[i].vx;
      explosionParticles[i].y += explosionParticles[i].vy;
      explosionParticles[i].vy += 0.04;
      explosionParticles[i].vx *= 0.98;
      explosionParticles[i].life--;
      if (explosionParticles[i].life <= 0) explosionParticles.splice(i, 1);
    }

    // Update landing particles
    for (let i = landingParticles.length - 1; i >= 0; i--) {
      landingParticles[i].x += landingParticles[i].vx;
      landingParticles[i].y += landingParticles[i].vy;
      landingParticles[i].vy += 0.05;
      landingParticles[i].life--;
      if (landingParticles[i].life <= 0) landingParticles.splice(i, 1);
    }

    // Skip ship physics if crashed
    if (ship.fuel < 0) return;

    // Ship rotation
    if (input.isDown('ArrowLeft')) ship.angle -= ROTATION_SPEED;
    if (input.isDown('ArrowRight')) ship.angle += ROTATION_SPEED;

    // Clamp angle
    ship.angle = Math.max(-Math.PI, Math.min(Math.PI, ship.angle));

    // Thrust
    ship.thrusting = input.isDown('ArrowUp') && ship.fuel > 0;
    if (ship.thrusting) {
      ship.vx += Math.sin(ship.angle) * THRUST_POWER;
      ship.vy -= Math.cos(ship.angle) * THRUST_POWER;
      ship.fuel -= 0.3;
      if (ship.fuel < 0) ship.fuel = 0;
    }

    // Gravity
    ship.vy += GRAVITY;

    // Apply velocity
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Wall boundaries
    if (ship.x < 10) { ship.x = 10; ship.vx = Math.abs(ship.vx) * 0.3; }
    if (ship.x > W - 10) { ship.x = W - 10; ship.vx = -Math.abs(ship.vx) * 0.3; }
    if (ship.y < 5) { ship.y = 5; ship.vy = Math.abs(ship.vy) * 0.3; }

    // Check terrain collision
    const terrainYAtShip = getTerrainY(ship.x);
    const shipBottom = ship.y + SHIP_H / 2;

    if (shipBottom >= terrainYAtShip) {
      const onPad = isOverPad(ship.x);
      const angleOk = Math.abs(ship.angle) < MAX_SAFE_ANGLE;
      const vyOk = ship.vy < MAX_SAFE_VY && ship.vy >= 0;
      const vxOk = Math.abs(ship.vx) < MAX_SAFE_VX;

      if (onPad && angleOk && vyOk && vxOk) {
        // Successful landing
        ship.y = terrainYAtShip - SHIP_H / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = 0;
        successLanding();
      } else {
        // Crash!
        spawnExplosion(ship.x, ship.y);
        ship.vx = 0;
        ship.vy = 0;
        ship.y = terrainYAtShip - SHIP_H / 2;
        ship.fuel = -1; // flag to stop ship update

        if (!onPad) crashMsg = 'Missed the landing pad!';
        else if (!vyOk) crashMsg = 'Too fast! Descend slower.';
        else if (!vxOk) crashMsg = 'Too much horizontal speed!';
        else if (!angleOk) crashMsg = 'Ship not upright enough!';
        else crashMsg = 'CRASHED!';

        // ~36 frames delay (~600ms at 60fps) before showing game over
        crashTimer = 36;
      }
    }

    // Off-screen safety
    if (ship.y > H + 50) {
      doGameOver('Lost in space!');
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars with twinkle
    const time = frameCount * 0.016; // approximate seconds
    for (const s of stars) {
      const alpha = s.brightness * (0.6 + 0.4 * Math.sin(time * s.twinkleSpeed * 100 + s.twinkleOffset));
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, '#ffffff' + a);
    }

    // Terrain fill
    const terrainFillPts = [{ x: 0, y: H }];
    for (const p of terrain) {
      terrainFillPts.push({ x: p.x, y: p.y });
    }
    terrainFillPts.push({ x: W, y: H });
    renderer.fillPoly(terrainFillPts, '#16213e');

    // Terrain outline
    renderer.setGlow('#48f', 0.4);
    renderer.strokePoly(terrain, '#48f', 1.5, false);

    // Landing pad (highlighted)
    renderer.setGlow('#0f8', 0.8);
    renderer.drawLine(padLeft, padY, padRight, padY, '#0f8', 3);

    // Pad markers (left and right posts)
    renderer.fillRect(padLeft + 2, padY - 6, 3, 6, '#0f8');
    renderer.fillRect(padRight - 5, padY - 6, 3, 6, '#0f8');

    // Center marker (small triangle)
    const padCx = (padLeft + padRight) / 2;
    renderer.fillPoly([
      { x: padCx, y: padY - 8 },
      { x: padCx - 4, y: padY - 2 },
      { x: padCx + 4, y: padY - 2 }
    ], '#0f8');

    // Ship (only draw if not crashed)
    if (ship.fuel >= 0) {
      // Ship body
      renderer.setGlow('#48f', 0.7);
      const worldShip = transformVerts(shipBodyVerts, ship.x, ship.y, ship.angle);
      renderer.strokePoly(worldShip, '#48f', 2, true);

      // Cockpit window
      const cockpitLocal = [{ x: 0, y: -SHIP_H / 6 }];
      const cockpitWorld = transformVerts(cockpitLocal, ship.x, ship.y, ship.angle);
      renderer.fillCircle(cockpitWorld[0].x, cockpitWorld[0].y, 3, '#8bf');

      // Landing legs
      const legPts = [
        { x: -SHIP_W / 4, y: SHIP_H / 2 },
        { x: -SHIP_W / 2 - 2, y: SHIP_H / 2 + 4 },
        { x: SHIP_W / 4, y: SHIP_H / 2 },
        { x: SHIP_W / 2 + 2, y: SHIP_H / 2 + 4 }
      ];
      const worldLegs = transformVerts(legPts, ship.x, ship.y, ship.angle);
      renderer.drawLine(worldLegs[0].x, worldLegs[0].y, worldLegs[1].x, worldLegs[1].y, '#48f', 1.5);
      renderer.drawLine(worldLegs[2].x, worldLegs[2].y, worldLegs[3].x, worldLegs[3].y, '#48f', 1.5);

      // Thrust flame
      if (ship.thrusting) {
        const flameLen = 8 + Math.random() * 12;
        const flameW = 4 + Math.random() * 3;
        const flameVerts = [
          { x: -flameW, y: SHIP_H / 2 },
          { x: 0, y: SHIP_H / 2 + flameLen },
          { x: flameW, y: SHIP_H / 2 }
        ];
        const worldFlame = transformVerts(flameVerts, ship.x, ship.y, ship.angle);
        renderer.setGlow('#f80', 0.8);
        renderer.strokePoly(worldFlame, '#f80', 2, false);

        // Inner flame
        const innerLen = flameLen * 0.6;
        const innerVerts = [
          { x: -flameW * 0.4, y: SHIP_H / 2 },
          { x: 0, y: SHIP_H / 2 + innerLen },
          { x: flameW * 0.4, y: SHIP_H / 2 }
        ];
        const worldInner = transformVerts(innerVerts, ship.x, ship.y, ship.angle);
        renderer.setGlow('#ff0', 0.6);
        renderer.strokePoly(worldInner, '#ff0', 2, false);
      }
    }

    // Explosion particles
    for (const p of explosionParticles) {
      const alpha = Math.min(1, p.life / 20);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // Parse the short hex color
      const r = parseInt(p.color[1], 16) * 17;
      const g = parseInt(p.color[2], 16) * 17;
      const b = parseInt(p.color[3], 16) * 17;
      const fullColor = `rgba(${r},${g},${b},${alpha})`;
      renderer.setGlow(p.color, 0.4);
      renderer.fillCircle(p.x, p.y, p.size, fullColor);
    }

    // Landing success particles
    for (const p of landingParticles) {
      const alpha = Math.min(1, p.life / 25);
      const r = parseInt(p.color[1], 16) * 17;
      const g = parseInt(p.color[2], 16) * 17;
      const b = parseInt(p.color[3], 16) * 17;
      const fullColor = `rgba(${r},${g},${b},${alpha})`;
      renderer.setGlow(p.color, 0.4);
      renderer.fillCircle(p.x, p.y, 2, fullColor);
    }

    renderer.setGlow(null);

    // ── HUD ──

    // Fuel gauge
    const fuelPct = Math.max(0, ship.fuel) / FUEL_MAX;
    const fuelBarW = 100;
    const fuelBarH = 8;
    const fuelX = 10;
    const fuelY = 10;

    text.drawText('FUEL', fuelX, fuelY + fuelBarH + 6, 11, '#aaa', 'left');

    // Fuel bar background
    renderer.fillRect(fuelX, fuelY, fuelBarW, fuelBarH, '#333');

    // Fuel bar fill
    const fuelColor = fuelPct > 0.3 ? '#0f8' : (fuelPct > 0.1 ? '#f80' : '#f44');
    renderer.setGlow(fuelColor, 0.4);
    renderer.fillRect(fuelX + 1, fuelY + 1, (fuelBarW - 2) * fuelPct, fuelBarH - 2, fuelColor);
    renderer.setGlow(null);

    // Velocity display
    const vx = ship.vx || 0;
    const vy = ship.vy || 0;
    const vyColor = Math.abs(vy) > MAX_SAFE_VY ? '#f44' : '#0f8';
    const vxColor = Math.abs(vx) > MAX_SAFE_VX ? '#f44' : '#0f8';

    text.drawText('VX:', W - 110, 10, 11, '#aaa', 'left');
    text.drawText(vx.toFixed(1), W - 80, 10, 11, vxColor, 'left');

    text.drawText('VY:', W - 110, 26, 11, '#aaa', 'left');
    text.drawText(vy.toFixed(1), W - 80, 26, 11, vyColor, 'left');

    // Altitude
    const altitude = Math.max(0, Math.floor(getTerrainY(ship.x) - ship.y - SHIP_H / 2));
    text.drawText('ALT:', W - 110, 42, 11, '#aaa', 'left');
    text.drawText(altitude.toString(), W - 72, 42, 11, '#48f', 'left');

    // Level
    text.drawText('LEVEL:', 10, 34, 11, '#aaa', 'left');
    text.drawText(level.toString(), 62, 34, 11, '#48f', 'left');

    // Success message
    if (successTimer > 0) {
      text.drawText('LANDED!', W / 2, H / 2 - 40, 24, '#0f8', 'center');
      text.drawText('Level ' + level + ' complete', W / 2, H / 2 - 10, 14, '#aaa', 'center');
    }

    // Angle indicator (arc approximation via line segments)
    const indicatorX = W / 2;
    const indicatorY = 18;
    const indicatorR = 12;

    // Draw arc as line segments (semicircle from -PI to 0)
    const arcSegs = 16;
    for (let i = 0; i < arcSegs; i++) {
      const a1 = -Math.PI + (Math.PI * i / arcSegs);
      const a2 = -Math.PI + (Math.PI * (i + 1) / arcSegs);
      renderer.drawLine(
        indicatorX + Math.cos(a1) * indicatorR,
        indicatorY + Math.sin(a1) * indicatorR,
        indicatorX + Math.cos(a2) * indicatorR,
        indicatorY + Math.sin(a2) * indicatorR,
        '#333', 1
      );
    }

    // Angle needle
    const needleAngle = -Math.PI / 2 + ship.angle;
    const angleOk = Math.abs(ship.angle) < MAX_SAFE_ANGLE;
    const needleColor = angleOk ? '#0f8' : '#f44';
    renderer.setGlow(needleColor, 0.4);
    renderer.drawLine(
      indicatorX, indicatorY,
      indicatorX + Math.cos(needleAngle) * indicatorR,
      indicatorY + Math.sin(needleAngle) * indicatorR,
      needleColor, 2
    );
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
