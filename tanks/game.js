// tanks/game.js — Tanks game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Constants
const GRAVITY = 0.15;
const TANK_W = 30;
const TANK_H = 16;
const BARREL_LEN = 22;
const BARREL_W = 4;
const MAX_HP = 5;
const HP_BAR_W = 40;
const HP_BAR_H = 6;
const PROJECTILE_R = 3;
const EXPLOSION_DURATION = 30;
const CRATER_RADIUS = 20;
const ANGLE_SPEED = 1.5; // degrees per frame
const POWER_SPEED = 0.5;
const MIN_POWER = 5;
const MAX_POWER = 25;
const MIN_ANGLE = 10;
const MAX_ANGLE = 80;
const CPU_THINK_FRAMES = 40;
const CPU_FIRE_DELAY = 20;

// ── State ──
let terrain;
let player, enemy;
let projectile;
let wind;
let turn; // 'player' or 'enemy'
let turnPhase; // 'aiming', 'firing', 'exploding', 'cpuThink', 'cpuFire', 'roundTransition'
let explosions;
let trailPoints;
let cpuTimer;
let roundNum;
let score;
let roundTransitionTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Terrain helpers ──

function generateTerrain() {
  terrain = new Array(W);
  const baseH = H * 0.55;
  const amp1 = 40 + Math.random() * 30;
  const freq1 = 0.008 + Math.random() * 0.006;
  const phase1 = Math.random() * Math.PI * 2;
  const amp2 = 20 + Math.random() * 15;
  const freq2 = 0.02 + Math.random() * 0.01;
  const phase2 = Math.random() * Math.PI * 2;
  const amp3 = 10 + Math.random() * 8;
  const freq3 = 0.05 + Math.random() * 0.03;
  const phase3 = Math.random() * Math.PI * 2;

  for (let x = 0; x < W; x++) {
    terrain[x] = baseH
      + Math.sin(x * freq1 + phase1) * amp1
      + Math.sin(x * freq2 + phase2) * amp2
      + Math.sin(x * freq3 + phase3) * amp3;
  }

  // Clamp edges
  for (let x = 0; x < W; x++) {
    terrain[x] = Math.max(H * 0.3, Math.min(H - 20, terrain[x]));
  }
}

function getTerrainY(x) {
  const ix = Math.floor(Math.max(0, Math.min(W - 1, x)));
  return terrain[ix];
}

function createCrater(cx, cy, radius) {
  for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(W, Math.ceil(cx + radius)); x++) {
    const dx = x - cx;
    const dist = Math.abs(dx);
    if (dist < radius) {
      const depth = Math.sqrt(radius * radius - dx * dx) * 0.6;
      if (cy >= terrain[x] - radius) {
        terrain[x] = Math.min(H - 5, terrain[x] + depth);
      }
    }
  }
}

// ── Tank helpers ──

function makeTank(x, isPlayer) {
  const ty = getTerrainY(x);
  return {
    x: x,
    y: ty,
    hp: MAX_HP,
    angle: 45,
    power: 15,
    isPlayer: isPlayer
  };
}

function setWind() {
  wind = (Math.random() - 0.5) * 0.12;
}

function initRound() {
  generateTerrain();
  const px = 40 + Math.floor(Math.random() * 80);
  const ex = W - 40 - Math.floor(Math.random() * 80);
  player = makeTank(px, true);
  enemy = makeTank(ex, false);
  setWind();
  turn = 'player';
  turnPhase = 'aiming';
  projectile = null;
  explosions = [];
  trailPoints = [];
  cpuTimer = 0;
  roundTransitionTimer = 0;
}

// ── Firing ──

function fireProjectile(tank) {
  const dir = tank.isPlayer ? 1 : -1;
  const angleRad = tank.angle * Math.PI / 180;
  const bx = tank.x + Math.cos(angleRad) * BARREL_LEN * dir;
  const by = tank.y - TANK_H - Math.sin(angleRad) * BARREL_LEN;
  projectile = {
    x: bx,
    y: by,
    vx: Math.cos(angleRad) * tank.power * dir,
    vy: -Math.sin(angleRad) * tank.power
  };
  trailPoints = [];
  turnPhase = 'firing';
}

// ── CPU AI ──

function cpuCalculateShot() {
  let bestAngle = 45;
  let bestPower = 15;
  let bestDist = Infinity;

  for (let trial = 0; trial < 20; trial++) {
    const testAngle = 20 + Math.random() * 60;
    const testPower = 8 + Math.random() * 17;
    const angleRad = testAngle * Math.PI / 180;
    let sx = enemy.x + Math.cos(angleRad) * BARREL_LEN * -1;
    let sy = enemy.y - TANK_H - Math.sin(angleRad) * BARREL_LEN;
    let svx = Math.cos(angleRad) * testPower * -1;
    let svy = -Math.sin(angleRad) * testPower;

    for (let step = 0; step < 300; step++) {
      svx += wind;
      svy += GRAVITY;
      sx += svx;
      sy += svy;

      if (sx < 0 || sx >= W || sy > H + 50) break;
      if (sy >= getTerrainY(sx)) {
        const dist = Math.sqrt((sx - player.x) ** 2 + (sy - player.y) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestAngle = testAngle;
          bestPower = testPower;
        }
        break;
      }
    }
  }

  const accuracy = Math.max(0.5, 1 - roundNum * 0.08);
  enemy.angle = bestAngle + (Math.random() - 0.5) * 15 * accuracy;
  enemy.angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, enemy.angle));
  enemy.power = bestPower + (Math.random() - 0.5) * 5 * accuracy;
  enemy.power = Math.max(MIN_POWER, Math.min(MAX_POWER, enemy.power));
}

// ── Impact & turn management ──

function impact(ix, iy) {
  projectile = null;
  turnPhase = 'exploding';
  createCrater(ix, iy, CRATER_RADIUS);

  player.y = getTerrainY(player.x);
  enemy.y = getTerrainY(enemy.x);

  const particles = [];
  const count = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: ix,
      y: iy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 15 + Math.floor(Math.random() * 20),
      color: Math.random() < 0.5 ? '#ffff44' : (Math.random() < 0.5 ? '#ff8844' : '#ffaa00')
    });
  }
  explosions.push({ x: ix, y: iy, frame: 0, particles: particles });
}

function endTurn() {
  projectile = null;
  trailPoints = [];
  setWind();
  if (turn === 'player') {
    turn = 'enemy';
    turnPhase = 'cpuThink';
    cpuTimer = 0;
  } else {
    turn = 'player';
    turnPhase = 'aiming';
  }
}

// ── Drawing helpers ──

function drawTank(renderer, tank, color, isPlayer) {
  const tx = tank.x;
  const ty = tank.y;
  const dir = isPlayer ? 1 : -1;

  // Tank body
  renderer.setGlow(color, 0.5);
  renderer.fillRect(tx - TANK_W / 2, ty - TANK_H, TANK_W, TANK_H, color);

  // Turret dome (semicircle approximated as filled polygon)
  const domePoints = [];
  const domeR = 8;
  const domeSegs = 10;
  for (let i = 0; i <= domeSegs; i++) {
    const a = Math.PI + (i / domeSegs) * Math.PI;
    domePoints.push({ x: tx + Math.cos(a) * domeR, y: ty - TANK_H + Math.sin(a) * domeR });
  }
  renderer.fillPoly(domePoints, color);

  // Barrel
  const angleRad = tank.angle * Math.PI / 180;
  const bx = tx + Math.cos(angleRad) * BARREL_LEN * dir;
  const by = ty - TANK_H - Math.sin(angleRad) * BARREL_LEN;
  renderer.drawLine(tx, ty - TANK_H, bx, by, color, BARREL_W);

  // Treads
  const treadColor = color === '#af4' ? '#8c3' : '#c33';
  renderer.fillRect(tx - TANK_W / 2 - 2, ty - 3, TANK_W + 4, 3, treadColor);
  renderer.setGlow(null);
}

function drawHPBar(renderer, tank) {
  const bx = tank.x - HP_BAR_W / 2;
  const by = tank.y - TANK_H - 22;

  // Background
  renderer.fillRect(bx, by, HP_BAR_W, HP_BAR_H, '#333');

  // HP fill
  const ratio = Math.max(0, tank.hp / MAX_HP);
  const hpColor = ratio > 0.5 ? '#af4' : (ratio > 0.25 ? '#fa0' : '#f44');
  renderer.setGlow(hpColor, 0.3);
  renderer.fillRect(bx, by, HP_BAR_W * ratio, HP_BAR_H, hpColor);
  renderer.setGlow(null);

  // Border (top, bottom, left, right lines)
  renderer.drawLine(bx, by, bx + HP_BAR_W, by, '#555', 1);
  renderer.drawLine(bx, by + HP_BAR_H, bx + HP_BAR_W, by + HP_BAR_H, '#555', 1);
  renderer.drawLine(bx, by, bx, by + HP_BAR_H, '#555', 1);
  renderer.drawLine(bx + HP_BAR_W, by, bx + HP_BAR_W, by + HP_BAR_H, '#555', 1);
}

function drawWindIndicator(renderer, text) {
  const cx = W / 2;
  const cy = 20;
  const maxLen = 40;
  const windLen = wind / 0.12 * maxLen;

  text.drawText('WIND', cx, cy - 12, 11, '#888', 'center');

  // Arrow shaft
  renderer.drawLine(cx, cy + 4, cx + windLen, cy + 4, '#aaa', 2);

  // Arrowhead
  if (Math.abs(windLen) > 3) {
    const dir = windLen > 0 ? 1 : -1;
    const tipX = cx + windLen;
    const arrowPoints = [
      { x: tipX, y: cy },
      { x: tipX, y: cy + 8 },
      { x: tipX + dir * 6, y: cy + 4 }
    ];
    renderer.fillPoly(arrowPoints, '#aaa');
  }
}

function drawAimingInfo(renderer, text) {
  const x = 10;
  const y = H - 12;

  text.drawText(`Angle: ${Math.round(player.angle)}`, x, y - 26, 12, '#af4', 'left');
  text.drawText(`Power: ${Math.round(player.power)}`, x, y - 12, 12, '#af4', 'left');

  // Power bar
  const barX = 110;
  const barW = 80;
  const barH = 8;
  const ratio = (player.power - MIN_POWER) / (MAX_POWER - MIN_POWER);
  renderer.fillRect(barX, y - 8, barW, barH, '#333');
  renderer.setGlow('#af4', 0.3);
  renderer.fillRect(barX, y - 8, barW * ratio, barH, '#af4');
  renderer.setGlow(null);
  // Border
  renderer.drawLine(barX, y - 8, barX + barW, y - 8, '#555', 1);
  renderer.drawLine(barX, y, barX + barW, y, '#555', 1);
  renderer.drawLine(barX, y - 8, barX, y, '#555', 1);
  renderer.drawLine(barX + barW, y - 8, barX + barW, y, '#555', 1);

  // Help text
  text.drawText('Up/Dn: angle  L/R: power  Space: fire', x, y - 44, 10, '#666', 'left');
}

function drawTurnIndicator(text) {
  const label = turn === 'player' ? 'YOUR TURN' : 'ENEMY TURN';
  const color = turn === 'player' ? '#af4' : '#f44';
  text.drawText(label, W / 2, H - 18, 13, color, 'center');
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    roundNum = 0;
    scoreEl.textContent = '0';
    initRound();
    game.showOverlay('TANKS', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Player aiming input
    if (turn === 'player' && turnPhase === 'aiming') {
      if (input.isDown('ArrowUp')) {
        player.angle = Math.min(MAX_ANGLE, player.angle + ANGLE_SPEED);
      }
      if (input.isDown('ArrowDown')) {
        player.angle = Math.max(MIN_ANGLE, player.angle - ANGLE_SPEED);
      }
      if (input.isDown('ArrowRight')) {
        player.power = Math.min(MAX_POWER, player.power + POWER_SPEED);
      }
      if (input.isDown('ArrowLeft')) {
        player.power = Math.max(MIN_POWER, player.power - POWER_SPEED);
      }
      if (input.wasPressed(' ')) {
        fireProjectile(player);
      }
    }

    // CPU turn logic
    if (turn === 'enemy' && turnPhase === 'cpuThink') {
      cpuTimer++;
      if (cpuTimer >= CPU_THINK_FRAMES) {
        cpuCalculateShot();
        turnPhase = 'cpuFire';
        cpuTimer = 0;
      }
    }
    if (turn === 'enemy' && turnPhase === 'cpuFire') {
      cpuTimer++;
      if (cpuTimer >= CPU_FIRE_DELAY) {
        fireProjectile(enemy);
        cpuTimer = 0;
      }
    }

    // Update projectile
    if (turnPhase === 'firing' && projectile) {
      projectile.vx += wind;
      projectile.vy += GRAVITY;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;

      trailPoints.push({ x: projectile.x, y: projectile.y });
      if (trailPoints.length > 200) trailPoints.shift();

      // Check bounds
      if (projectile.x < -20 || projectile.x > W + 20 || projectile.y > H + 50) {
        endTurn();
        return;
      }

      // Check terrain collision
      if (projectile.y >= getTerrainY(projectile.x) && projectile.y > 0) {
        impact(projectile.x, projectile.y);
        return;
      }

      // Check hit on player tank
      if (turn === 'enemy') {
        if (Math.abs(projectile.x - player.x) < TANK_W / 2 + PROJECTILE_R &&
            projectile.y >= player.y - TANK_H - 4 &&
            projectile.y <= player.y + 4) {
          impact(projectile.x, projectile.y);
          player.hp--;
          return;
        }
      }

      // Check hit on enemy tank
      if (turn === 'player') {
        if (Math.abs(projectile.x - enemy.x) < TANK_W / 2 + PROJECTILE_R &&
            projectile.y >= enemy.y - TANK_H - 4 &&
            projectile.y <= enemy.y + 4) {
          impact(projectile.x, projectile.y);
          enemy.hp--;
          score += 20;
          scoreEl.textContent = score;
          if (score > parseInt(bestEl.textContent)) {
            bestEl.textContent = score;
          }
          return;
        }
      }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].frame++;
      for (const p of explosions[i].particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
      }
      explosions[i].particles = explosions[i].particles.filter(p => p.life > 0);
      if (explosions[i].frame > EXPLOSION_DURATION) {
        explosions.splice(i, 1);
      }
    }

    // Check if explosion phase is done
    if (turnPhase === 'exploding' && explosions.length === 0) {
      if (enemy.hp <= 0) {
        score += 50;
        scoreEl.textContent = score;
        if (score > parseInt(bestEl.textContent)) {
          bestEl.textContent = score;
        }
        roundNum++;
        turnPhase = 'roundTransition';
        roundTransitionTimer = 36; // ~600ms at 60fps
        return;
      }
      if (player.hp <= 0) {
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
        game.setState('over');
        return;
      }
      endTurn();
    }

    // Round transition (replaces setTimeout)
    if (turnPhase === 'roundTransition') {
      roundTransitionTimer--;
      if (roundTransitionTimer <= 0) {
        initRound();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Sky gradient (dark at top, slightly lighter)
    // Use a series of thin rects to approximate gradient
    const gradSteps = 12;
    const gradH = H * 0.6;
    for (let i = 0; i < gradSteps; i++) {
      const t = i / gradSteps;
      const r = Math.round(10 + t * 16);
      const g = Math.round(10 + t * 16);
      const b = Math.round(26 + t * 20);
      const rH = r.toString(16).padStart(2, '0');
      const gH = g.toString(16).padStart(2, '0');
      const bH = b.toString(16).padStart(2, '0');
      renderer.fillRect(0, (i / gradSteps) * gradH, W, gradH / gradSteps + 1, `#${rH}${gH}${bH}`);
    }

    // Draw terrain as filled polygon
    const terrainPoints = [{ x: 0, y: H }];
    // Sample terrain at intervals to keep vertex count manageable
    const step = 2;
    for (let x = 0; x < W; x += step) {
      terrainPoints.push({ x: x, y: terrain[x] });
    }
    terrainPoints.push({ x: W - 1, y: terrain[W - 1] });
    terrainPoints.push({ x: W, y: H });
    renderer.fillPoly(terrainPoints, '#16213e');

    // Terrain surface line with glow
    renderer.setGlow('#0f3460', 0.5);
    for (let x = 0; x < W - step; x += step) {
      renderer.drawLine(x, terrain[x], x + step, terrain[x + step], '#0f3460', 2);
    }
    renderer.setGlow(null);

    // Draw tanks
    drawTank(renderer, player, '#af4', true);
    drawTank(renderer, enemy, '#f44', false);

    // Draw HP bars
    drawHPBar(renderer, player);
    drawHPBar(renderer, enemy);

    // Draw projectile trail (dashed)
    if (trailPoints.length > 1) {
      for (let i = 0; i < trailPoints.length - 1; i++) {
        // Skip every other segment to simulate dashing
        if (i % 4 < 2) {
          renderer.drawLine(
            trailPoints[i].x, trailPoints[i].y,
            trailPoints[i + 1].x, trailPoints[i + 1].y,
            '#aaffee33', 1
          );
        }
      }
    }

    // Draw projectile
    if (projectile) {
      renderer.setGlow('#ff4', 0.7);
      renderer.fillCircle(projectile.x, projectile.y, PROJECTILE_R, '#fff');
      renderer.setGlow(null);
    }

    // Draw explosions
    for (const exp of explosions) {
      // Flash circle
      if (exp.frame < 8) {
        const r = exp.frame * 3;
        const alpha = Math.floor((1 - exp.frame / 8) * 255).toString(16).padStart(2, '0');
        renderer.fillCircle(exp.x, exp.y, r, `#ffc832${alpha}`);
      }
      // Particles
      for (const p of exp.particles) {
        const alpha = Math.max(0, p.life / 35);
        const a = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, p.color + a);
      }
    }

    // Draw wind indicator
    drawWindIndicator(renderer, text);

    // Draw aiming info for player
    if (turn === 'player' && turnPhase === 'aiming') {
      drawAimingInfo(renderer, text);
    }

    // Draw turn indicator
    drawTurnIndicator(text);

    // Draw round number
    text.drawText(`Round ${roundNum + 1}`, W - 10, H - 16, 11, '#555', 'right');
  };

  game.start();
  return game;
}
