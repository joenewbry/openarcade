// bike-trials-mp/game.js — Bike Trials MP as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Theme
const THEME       = '#ff44aa';
const THEME_DIM   = '#aa2244';
const THEME_GHOST = 'rgba(255,68,170,0.35)';

// Physics constants
const GRAVITY        = 0.45;
const WHEEL_RADIUS   = 12;
const WHEELBASE      = 40;
const MAX_SPEED      = 7;
const THROTTLE_FORCE = 0.18;
const BRAKE_FORCE    = 0.12;
const LEAN_TORQUE    = 0.004;
const ANGULAR_DAMPING = 0.92;
const BOUNCE         = 0.3;
const FRICTION       = 0.985;
const MAX_LEAN       = Math.PI * 0.55;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// ── Module-scope state ──
let score      = 0;
let bestScore  = parseInt(localStorage.getItem('bikeTrialsBest') || '0');
let currentLevel = 1;

let terrain    = [];
let checkpoints = [];
let player, ghostBike;
let ghostData  = [], ghostFrame = 0;
let cameraX    = 0, cameraY = 0;
let timer      = 0, startTime = 0;
let checkpointBonus = 0;
let finished   = false;
let particles  = [];
let crashTimer = 0;

// ── Helpers ──

function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

function getTerrainY(worldX) {
  for (let i = 0; i < terrain.length - 1; i++) {
    if (worldX >= terrain[i].x && worldX < terrain[i + 1].x) {
      const t = (worldX - terrain[i].x) / (terrain[i + 1].x - terrain[i].x);
      return terrain[i].y + t * (terrain[i + 1].y - terrain[i].y);
    }
  }
  if (terrain.length > 0) {
    if (worldX < terrain[0].x) return terrain[0].y;
    return terrain[terrain.length - 1].y;
  }
  return 280;
}

function getTerrainAngle(worldX) {
  for (let i = 0; i < terrain.length - 1; i++) {
    if (worldX >= terrain[i].x && worldX < terrain[i + 1].x) {
      const dx = terrain[i + 1].x - terrain[i].x;
      const dy = terrain[i + 1].y - terrain[i].y;
      return Math.atan2(dy, dx);
    }
  }
  return 0;
}

function generateTerrain(level) {
  terrain = [];
  checkpoints = [];
  const segW = 30;
  const numSegs = 300 + level * 80;
  let x = -200;
  let y = 280;
  let lastFeature = 0;

  // Start flat
  for (let i = 0; i < 10; i++) {
    terrain.push({ x, y });
    x += segW;
  }

  for (let i = 10; i < numSegs; i++) {
    const progress = i / numSegs;
    const difficulty = 0.3 + progress * 0.7 + (level - 1) * 0.15;
    const featureChance = Math.random();
    const distSinceLast = i - lastFeature;

    if (distSinceLast > 5 && featureChance < 0.15 * difficulty) {
      const hillH = 30 + Math.random() * 50 * difficulty;
      const hillW = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < hillW && i < numSegs; j++) {
        const t = j / (hillW - 1);
        const hf = Math.sin(t * Math.PI);
        terrain.push({ x, y: y - hillH * hf });
        x += segW;
        i++;
      }
      lastFeature = i;
    } else if (distSinceLast > 8 && featureChance < 0.28 * difficulty) {
      const gapW = 2 + Math.floor(Math.random() * 2 * difficulty);
      terrain.push({ x, y: y - 15 }); x += segW; i++;
      if (i < numSegs) { terrain.push({ x, y: y - 30 }); x += segW; i++; }
      for (let j = 0; j < gapW && i < numSegs; j++) {
        terrain.push({ x, y: y + 80 }); x += segW; i++;
      }
      if (i < numSegs) { terrain.push({ x, y: y - 15 }); x += segW; i++; }
      if (i < numSegs) { terrain.push({ x, y }); x += segW; i++; }
      lastFeature = i;
    } else if (distSinceLast > 6 && featureChance < 0.4 * difficulty) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const steps = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < steps && i < numSegs; j++) {
        y += dir * (8 + Math.random() * 12 * difficulty);
        y = Math.max(100, Math.min(340, y));
        terrain.push({ x, y }); x += segW; i++;
      }
      lastFeature = i;
    } else if (distSinceLast > 10 && featureChance < 0.5 * difficulty) {
      const bumps = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < bumps && i < numSegs; j++) {
        const bumpH = 10 + Math.random() * 20 * difficulty;
        terrain.push({ x, y: y - bumpH * (j % 2 === 0 ? 1 : 0) }); x += segW; i++;
      }
      lastFeature = i;
    } else {
      y += (Math.random() - 0.5) * 8;
      y = Math.max(100, Math.min(340, y));
      terrain.push({ x, y }); x += segW;
    }
  }

  // Finish flat
  for (let i = 0; i < 10; i++) {
    terrain.push({ x, y }); x += segW;
  }

  // Checkpoints
  const cpCount = 3;
  for (let i = 1; i <= cpCount; i++) {
    const idx = Math.floor((terrain.length * i) / (cpCount + 1));
    if (idx < terrain.length) {
      checkpoints.push({ x: terrain[idx].x, y: terrain[idx].y - 60, reached: false, index: idx });
    }
  }
  // Finish line
  const lastIdx = terrain.length - 5;
  checkpoints.push({ x: terrain[lastIdx].x, y: terrain[lastIdx].y - 60, reached: false, isFinish: true, index: lastIdx });
}

// ── Bike class ──
class Bike {
  constructor(isGhost) {
    this.isGhost = isGhost;
    this.reset();
  }

  reset() {
    this.x = 50;
    this.y = 200;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVel = 0;
    this.speed = 0;
    this.crashed = false;
    this.onGround = false;
    this.distance = 0;
  }

  update(throttle, brake, leanDir) {
    if (this.crashed) return;

    this.angularVel += leanDir * LEAN_TORQUE;
    this.angularVel *= ANGULAR_DAMPING;
    this.angle += this.angularVel;

    this.vy += GRAVITY;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const halfWB = WHEELBASE / 2;

    const rearWX  = this.x - cosA * halfWB;
    const rearWY  = this.y - sinA * halfWB;
    const frontWX = this.x + cosA * halfWB;
    const frontWY = this.y + sinA * halfWB;

    const groundRear  = getTerrainY(rearWX);
    const groundFront = getTerrainY(frontWX);

    let rearOnGround  = false;
    let frontOnGround = false;

    if (rearWY + WHEEL_RADIUS > groundRear) {
      rearOnGround = true;
      const penetration = (rearWY + WHEEL_RADIUS) - groundRear;
      this.y -= penetration * 0.7;
      this.vy *= -BOUNCE;
      if (Math.abs(this.vy) < 1) this.vy = 0;
      const targetAngle = getTerrainAngle(this.x);
      this.angle += (targetAngle - this.angle) * 0.08;
    }

    if (frontWY + WHEEL_RADIUS > groundFront) {
      frontOnGround = true;
      const penetration = (frontWY + WHEEL_RADIUS) - groundFront;
      this.y -= penetration * 0.7;
      this.vy *= -BOUNCE;
      if (Math.abs(this.vy) < 1) this.vy = 0;
      const targetAngle = getTerrainAngle(this.x);
      this.angle += (targetAngle - this.angle) * 0.08;
    }

    this.onGround = rearOnGround || frontOnGround;

    if (this.onGround) {
      if (throttle) {
        const terrAngle = getTerrainAngle(this.x);
        this.vx += Math.cos(terrAngle) * THROTTLE_FORCE;
        this.vy += Math.sin(terrAngle) * THROTTLE_FORCE;
      }
      if (brake) { this.vx *= (1 - BRAKE_FORCE); }
      this.vx *= FRICTION;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (this.speed > MAX_SPEED) {
      const ratio = MAX_SPEED / this.speed;
      this.vx *= ratio;
      this.vy *= ratio;
      this.speed = MAX_SPEED;
    }

    this.distance = Math.max(this.distance, this.x - 50);

    if (Math.abs(this.angle) > MAX_LEAN) this.crashed = true;
    if (this.y > 500) this.crashed = true;

    // Head collision
    const headX = this.x - sinA * 28;
    const headY = this.y - cosA * 28;
    const headGround = getTerrainY(headX);
    if (headY > headGround - 3 && this.onGround) this.crashed = true;

    if (this.angle > Math.PI)  this.angle -= Math.PI * 2;
    if (this.angle < -Math.PI) this.angle += Math.PI * 2;
  }

  draw(renderer, camX, camY, alpha) {
    const screenX = this.x - camX;
    const screenY = this.y - camY;

    const color      = this.isGhost ? 'rgba(255,68,170,0.35)' : THEME;
    const bodyColor  = this.isGhost ? 'rgba(255,68,170,0.25)' : '#dd3388';
    const riderColor = this.isGhost ? 'rgba(200,200,200,0.25)' : '#cccccc';
    const colorAlpha = this.isGhost ? color : THEME;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const halfWB = WHEELBASE / 2;
    const wheelRot = this.x * 0.15;

    function rot(lx, ly) {
      return {
        x: screenX + lx * cosA - ly * sinA,
        y: screenY + lx * sinA + ly * cosA
      };
    }

    if (!this.isGhost) {
      renderer.setGlow(THEME, 0.5);
    }

    // ── Wheels ──
    // Rear wheel ring (approximated as circle outline using strokePoly)
    const rearCX = screenX - cosA * halfWB;
    const rearCY = screenY - sinA * halfWB;
    const frontCX = screenX + cosA * halfWB;
    const frontCY = screenY + sinA * halfWB;

    const wheelSegs = 12;
    const rearRingPts = [];
    const frontRingPts = [];
    for (let s = 0; s <= wheelSegs; s++) {
      const a = (s / wheelSegs) * Math.PI * 2;
      rearRingPts.push({ x: rearCX + Math.cos(a) * WHEEL_RADIUS, y: rearCY + Math.sin(a) * WHEEL_RADIUS });
      frontRingPts.push({ x: frontCX + Math.cos(a) * WHEEL_RADIUS, y: frontCY + Math.sin(a) * WHEEL_RADIUS });
    }
    renderer.strokePoly(rearRingPts, color, 2.5, false);
    renderer.strokePoly(frontRingPts, color, 2.5, false);

    // Wheel spokes
    for (let s = 0; s < 4; s++) {
      const sa = wheelRot + s * Math.PI / 2;
      renderer.drawLine(
        rearCX, rearCY,
        rearCX + Math.cos(sa) * WHEEL_RADIUS * 0.8, rearCY + Math.sin(sa) * WHEEL_RADIUS * 0.8,
        color, 1
      );
      renderer.drawLine(
        frontCX, frontCY,
        frontCX + Math.cos(sa) * WHEEL_RADIUS * 0.8, frontCY + Math.sin(sa) * WHEEL_RADIUS * 0.8,
        color, 1
      );
    }

    // ── Frame ──
    const frameA = rot(-halfWB, 0);
    const frameB = rot(-8, -10);
    const frameC = rot(5, -12);
    const frameD = rot(halfWB - 2, -4);
    const frameE = rot(halfWB, 0);
    renderer.strokePoly([frameA, frameB, frameC, frameD, frameE], bodyColor, 3, false);

    // ── Seat/tank ──
    const seatA = rot(-12, -10);
    const seatB = rot(-6,  -18);
    const seatC = rot(8,   -20);
    const seatD = rot(14,  -14);
    renderer.fillPoly([seatA, seatB, seatC, seatD], bodyColor);
    renderer.strokePoly([seatA, seatB, seatC, seatD], color, 1.5, true);

    // ── Front forks ──
    const fork1 = rot(10, -12);
    const fork2 = rot(halfWB, 0);
    renderer.drawLine(fork1.x, fork1.y, fork2.x, fork2.y, color, 2);

    // ── Rear swing arm ──
    const swing1 = rot(-6, -4);
    const swing2 = rot(-halfWB, 0);
    renderer.drawLine(swing1.x, swing1.y, swing2.x, swing2.y, color, 2);

    // ── Exhaust ──
    const exhaustColor = this.isGhost ? 'rgba(150,100,50,0.2)' : '#aa6644';
    const ex1 = rot(-4, -4);
    const ex2 = rot(-halfWB + 4, 6);
    const ex3 = rot(-halfWB - 2, 6);
    renderer.strokePoly([ex1, ex2, ex3], exhaustColor, 2, false);

    // ── Handlebars ──
    const hb0 = rot(10, -20);
    const hbR = rot(16, -24);
    const hbL = rot(6,  -24);
    renderer.drawLine(hb0.x, hb0.y, hbR.x, hbR.y, color, 2);
    renderer.drawLine(hb0.x, hb0.y, hbL.x, hbL.y, color, 2);

    renderer.setGlow(null);

    // ── Rider (no glow) ──
    // Body
    const riderBot = rot(-2, -18);
    const riderTop = rot(2,  -32);
    renderer.drawLine(riderBot.x, riderBot.y, riderTop.x, riderTop.y, riderColor, 3);

    // Head (approximated as small circle)
    const headPt = rot(2, -37);
    const headFill = this.isGhost ? 'rgba(200,200,200,0.2)' : '#eeeeee';
    renderer.fillCircle(headPt.x, headPt.y, 5, headFill);
    // Helmet ring (approximated as semicircle)
    const helmetColor = this.isGhost ? 'rgba(255,68,170,0.2)' : THEME;
    const helmetPts = [];
    for (let s = 0; s <= 8; s++) {
      const a = Math.PI + s * Math.PI / 8; // top semicircle
      helmetPts.push({ x: headPt.x + Math.cos(a) * 5.5, y: headPt.y + Math.sin(a) * 5.5 });
    }
    renderer.strokePoly(helmetPts, helmetColor, 2, false);

    // Arms
    const armStart = rot(2, -28);
    const armEnd   = rot(10, -20);
    renderer.drawLine(armStart.x, armStart.y, armEnd.x, armEnd.y, riderColor, 2.5);

    // Legs
    const legTop = rot(-2, -18);
    const legMid = rot(-6, -8);
    const legBot = rot(-2, -2);
    renderer.drawLine(legTop.x, legTop.y, legMid.x, legMid.y, riderColor, 2.5);
    renderer.drawLine(legMid.x, legMid.y, legBot.x, legBot.y, riderColor, 2.5);
  }
}

// ── Ghost AI ──
function generateGhostRun() {
  const ghost = new Bike(true);
  ghost.reset();
  const recording = [];
  const maxFrames = 12000;

  for (let f = 0; f < maxFrames; f++) {
    const terrAngle = getTerrainAngle(ghost.x + 30);
    const aheadY    = getTerrainY(ghost.x + 60);
    const currentY  = getTerrainY(ghost.x);

    let throttle = true, brake = false, lean = 0;

    if (terrAngle > 0.15) lean = 0.5;
    else if (terrAngle < -0.15) lean = -0.3;

    if (terrAngle > 0.5 && ghost.speed > 4) { brake = true; throttle = false; }

    if (aheadY - currentY > 30) { lean = 0.4; throttle = true; brake = false; }

    if (!ghost.onGround) {
      if (ghost.angle > 0.2) lean = -0.6;
      else if (ghost.angle < -0.2) lean = 0.6;
      else lean = 0;
    }

    if (ghost.angle > 0.6) lean = -0.8;
    if (ghost.angle < -0.6) lean = 0.8;

    ghost.update(throttle, brake, lean);
    recording.push({ x: ghost.x, y: ghost.y, angle: ghost.angle, speed: ghost.speed, crashed: ghost.crashed });

    if (ghost.crashed || ghost.x > terrain[terrain.length - 1].x - 100) break;
  }
  return recording;
}

// ── Particles ──
function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 1) * 4,
      life: 30 + Math.random() * 30,
      maxLife: 60,
      color: color || THEME,
      size: 1.5 + Math.random() * 2.5
    });
  }
}

// ── createGame ──
export function createGame() {
  const game = new Game('game');

  bestEl.textContent = bestScore;

  function initLevel() {
    generateTerrain(currentLevel);
    player   = new Bike(false);
    ghostBike = new Bike(true);
    ghostData = generateGhostRun();
    ghostFrame = 0;
    cameraX = 0;
    cameraY = 0;
    timer = 0;
    startTime = 0;
    checkpointBonus = 0;
    finished = false;
    particles = [];
    crashTimer = 0;
    for (const cp of checkpoints) cp.reached = false;
  }

  function endGame(didFinish) {
    finished = didFinish;
    const timePenalty = Math.floor(timer * 2);
    const distScore   = Math.floor(player.distance);
    score = Math.max(0, distScore + checkpointBonus - timePenalty);
    scoreEl.textContent = score;

    if (score > bestScore) {
      bestScore = score;
      bestEl.textContent = bestScore;
      localStorage.setItem('bikeTrialsBest', bestScore.toString());
    }

    if (didFinish) {
      game.showOverlay('LEVEL COMPLETE!', `Distance: ${distScore}m + Checkpoints: ${checkpointBonus} - Time: ${timePenalty} | Score: ${score} -- Press SPACE or ENTER for next level`);
    } else {
      game.showOverlay('CRASHED!', `Distance: ${distScore}m | Score: ${score} -- Press SPACE or ENTER to retry`);
    }
    game.setState('over');
  }

  game.onInit = () => {
    score = 0;
    currentLevel = 1;
    scoreEl.textContent = '0';
    initLevel();
    game.showOverlay('BIKE TRIALS MP', `Level ${currentLevel} -- Arrow Keys: UP=Gas DOWN=Brake LEFT/RIGHT=Lean -- Race the ghost to the finish!`);
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.setState('playing');
        startTime = performance.now();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        if (finished) {
          // Next level
          currentLevel++;
          score = 0;
          scoreEl.textContent = '0';
          initLevel();
          game.setState('playing');
          startTime = performance.now();
        } else {
          // Retry
          score = 0;
          scoreEl.textContent = '0';
          initLevel();
          game.setState('playing');
          startTime = performance.now();
        }
      }
      return;
    }

    // 'crashed' sub-state (still in 'playing' but animating crash)
    if (crashTimer > 0) {
      crashTimer--;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (crashTimer === 0) {
        endGame(false);
      }
      return;
    }

    if (game.state !== 'playing') return;

    timer = (performance.now() - startTime) / 1000;

    const throttle = input.isDown('ArrowUp');
    const brake    = input.isDown('ArrowDown');
    let lean = 0;
    if (input.isDown('ArrowRight')) lean = 1;
    if (input.isDown('ArrowLeft'))  lean = -1;

    player.update(throttle, brake, lean);

    // Dirt particles from rear wheel
    if (player.onGround && throttle && Math.random() < 0.4) {
      const cosA = Math.cos(player.angle);
      const sinA = Math.sin(player.angle);
      spawnParticles(
        player.x - cosA * WHEELBASE / 2,
        player.y - sinA * WHEELBASE / 2 + WHEEL_RADIUS,
        1, '#886644'
      );
    }

    // Ghost playback
    if (ghostFrame < ghostData.length) {
      const gd = ghostData[ghostFrame];
      ghostBike.x = gd.x; ghostBike.y = gd.y;
      ghostBike.angle = gd.angle; ghostBike.speed = gd.speed; ghostBike.crashed = gd.crashed;
      ghostFrame++;
    }

    // Checkpoints
    for (const cp of checkpoints) {
      if (!cp.reached && Math.abs(player.x - cp.x) < 30) {
        cp.reached = true;
        checkpointBonus += cp.isFinish ? 500 : 200;
        spawnParticles(cp.x, cp.y, 20, cp.isFinish ? '#ffff00' : THEME);
        if (cp.isFinish) { endGame(true); return; }
      }
    }

    // Live score
    const distScore  = Math.floor(player.distance);
    const timePenalty = Math.floor(timer * 2);
    score = Math.max(0, distScore + checkpointBonus - timePenalty);
    scoreEl.textContent = score;

    // Camera
    const targetCamX = player.x - W * 0.3;
    const targetCamY = player.y - H * 0.55;
    cameraX += (targetCamX - cameraX) * 0.08;
    cameraY += (targetCamY - cameraY) * 0.06;

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Crash detection
    if (player.crashed && crashTimer === 0) {
      spawnParticles(player.x, player.y, 15, '#ff4444');
      crashTimer = 50;
    }
  };

  game.onDraw = (renderer, text) => {
    // ── Sky gradient approximation (two rects) ──
    renderer.fillRect(0, 0, W, H / 2, '#0a0a1a');
    renderer.fillRect(0, H / 2, W, H / 2, '#1a1a2e');

    // ── Stars (parallax) ──
    for (let i = 0; i < 40; i++) {
      let sx = ((i * 137 + 50) % 800) - (cameraX * 0.05) % 800;
      const sy = (i * 97 + 30) % 250;
      const ss = (i % 3 === 0) ? 1.5 : 1;
      if (sx < 0) sx += 800;
      if (sx < W) renderer.fillRect(sx, sy, ss, ss, 'rgba(255,255,255,0.4)');
    }

    // ── Mountains (parallax) ──
    const mtPts = [{ x: 0, y: H }];
    for (let mx = -50; mx < W + 100; mx += 80) {
      const worldMX = mx + cameraX * 0.15;
      const mh = 80 + Math.sin(worldMX * 0.005) * 40 + Math.cos(worldMX * 0.012) * 25;
      mtPts.push({ x: mx, y: H - 80 - mh });
    }
    mtPts.push({ x: W, y: H });
    renderer.fillPoly(mtPts, '#12122a');

    // ── Terrain ──
    if (terrain.length > 1) {
      const startX = cameraX - 50;
      const endX   = cameraX + W + 50;

      // Build visible terrain points
      const visiblePts = [];
      for (let i = 0; i < terrain.length; i++) {
        if (terrain[i].x >= startX - 60 && terrain[i].x <= endX + 60) {
          visiblePts.push({ x: terrain[i].x - cameraX, y: terrain[i].y - cameraY });
        }
      }

      if (visiblePts.length > 1) {
        const firstSX = visiblePts[0].x;
        const lastSX  = visiblePts[visiblePts.length - 1].x;

        // Filled terrain
        const fillPts = [{ x: firstSX, y: H + 100 }, ...visiblePts, { x: lastSX, y: H + 100 }];
        renderer.fillPoly(fillPts, '#2a2a3e');

        // Terrain edge with glow
        renderer.setGlow(THEME_DIM, 0.5);
        renderer.strokePoly(visiblePts, THEME_DIM, 2, false);
        renderer.setGlow(null);

        // Grass tufts (every 3rd point)
        for (let i = 0; i < terrain.length - 1; i += 3) {
          if (terrain[i].x >= startX - 30 && terrain[i].x <= endX + 30) {
            const sx = terrain[i].x - cameraX;
            const sy = terrain[i].y - cameraY;
            renderer.drawLine(sx, sy, sx - 3, sy - 6, 'rgba(100,200,100,0.3)', 1);
            renderer.drawLine(sx + 2, sy, sx + 5, sy - 5, 'rgba(100,200,100,0.3)', 1);
          }
        }
      }
    }

    // ── Checkpoints ──
    for (const cp of checkpoints) {
      const sx = cp.x - cameraX;
      const sy = cp.y - cameraY;

      if (sx > -50 && sx < W + 50) {
        const groundY = getTerrainY(cp.x) - cameraY;

        // Pole
        const poleColor = cp.reached ? 'rgba(100,200,100,0.6)' : 'rgba(255,68,170,0.5)';
        renderer.drawLine(sx, groundY, sx, sy - 20, poleColor, 2);

        if (cp.isFinish) {
          // Checkered flag
          renderer.setGlow('#ffff00', cp.reached ? 0 : 0.5);
          const flagW = 24, flagH = 16;
          for (let fy = 0; fy < 4; fy++) {
            for (let fx = 0; fx < 6; fx++) {
              const fc = (fx + fy) % 2 === 0 ? '#ffffff' : '#222222';
              renderer.fillRect(sx + fx * (flagW / 6), sy - 20 + fy * (flagH / 4), flagW / 6, flagH / 4, fc);
            }
          }
          renderer.setGlow(null);
          text.drawText('FINISH', sx + 12, sy - 36, 10, '#ffff00', 'center');
        } else {
          // Checkpoint flag (triangle)
          const flagColor = cp.reached ? 'rgba(100,200,100,0.7)' : 'rgba(255,68,170,0.7)';
          renderer.setGlow(cp.reached ? '#00ff00' : THEME, 0.5);
          renderer.fillPoly([
            { x: sx, y: sy - 20 },
            { x: sx + 14, y: sy - 12 },
            { x: sx, y: sy - 4 }
          ], flagColor);
          renderer.setGlow(null);
        }
      }
    }

    // ── Particles ──
    for (const p of particles) {
      const sx = p.x - cameraX;
      const sy = p.y - cameraY;
      const alpha = p.life / p.maxLife;
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size, p.color + a);
    }

    // ── Ghost bike ──
    if (ghostFrame > 0 && !ghostBike.crashed) {
      ghostBike.draw(renderer, cameraX, cameraY, 0.35);
    }

    // ── Player bike ──
    if (!player.crashed || crashTimer > 0) {
      player.draw(renderer, cameraX, cameraY, 1);

      // Crash explosion rays
      if (player.crashed && crashTimer > 0) {
        renderer.setGlow('#ff4444', 0.8);
        const psx = player.x - cameraX;
        const psy = player.y - cameraY;
        const t = (50 - crashTimer) * 0.05;
        for (let r = 0; r < 6; r++) {
          const a = t + r * Math.PI / 3;
          const len = 10 + Math.sin(t * 10 + r) * 15;
          renderer.drawLine(
            psx + Math.cos(a) * 8, psy + Math.sin(a) * 8,
            psx + Math.cos(a) * (8 + len), psy + Math.sin(a) * (8 + len),
            '#ff4444', 2
          );
        }
        renderer.setGlow(null);
      }
    }

    // ── HUD ──
    drawHUD(renderer, text);
  };

  function drawHUD(renderer, text) {
    const pad = 10;

    // Speed gauge panel
    renderer.fillRect(pad, H - 55, 120, 45, 'rgba(26,26,46,0.7)');
    renderer.strokePoly([
      { x: pad, y: H - 55 }, { x: pad + 120, y: H - 55 },
      { x: pad + 120, y: H - 10 }, { x: pad, y: H - 10 }
    ], 'rgba(255,68,170,0.3)', 1, true);

    text.drawText('SPEED', pad + 5, H - 48, 10, THEME, 'left');

    const speedPct = Math.min(1, player.speed / MAX_SPEED);
    renderer.fillRect(pad + 5, H - 34, 100, 8, '#333333');
    const speedColor = speedPct > 0.8 ? '#ff4444' : speedPct > 0.5 ? '#ffaa44' : THEME;
    renderer.setGlow(speedColor, 0.4);
    renderer.fillRect(pad + 5, H - 34, 100 * speedPct, 8, speedColor);
    renderer.setGlow(null);
    text.drawText(`${Math.floor(player.speed * 20)} km/h`, pad + 5, H - 24, 10, '#aaaaaa', 'left');

    // Distance panel
    renderer.fillRect(pad + 130, H - 55, 110, 45, 'rgba(26,26,46,0.7)');
    renderer.strokePoly([
      { x: pad + 130, y: H - 55 }, { x: pad + 240, y: H - 55 },
      { x: pad + 240, y: H - 10 }, { x: pad + 130, y: H - 10 }
    ], 'rgba(255,68,170,0.3)', 1, true);

    text.drawText('DIST', pad + 135, H - 48, 10, THEME, 'left');
    text.drawText(`${Math.floor(player.distance)}m`, pad + 135, H - 30, 14, '#dddddd', 'left');

    // Timer panel
    renderer.fillRect(W - 130, H - 55, 120, 45, 'rgba(26,26,46,0.7)');
    renderer.strokePoly([
      { x: W - 130, y: H - 55 }, { x: W - 10, y: H - 55 },
      { x: W - 10, y: H - 10 }, { x: W - 130, y: H - 10 }
    ], 'rgba(255,68,170,0.3)', 1, true);

    text.drawText('TIME', W - 125, H - 48, 10, THEME, 'left');
    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const ms   = Math.floor((timer * 100) % 100);
    text.drawText(
      `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`,
      W - 125, H - 30, 14, '#dddddd', 'left'
    );

    // Lean panel
    renderer.fillRect(W - 130, H - 108, 120, 45, 'rgba(26,26,46,0.7)');
    renderer.strokePoly([
      { x: W - 130, y: H - 108 }, { x: W - 10, y: H - 108 },
      { x: W - 10, y: H - 63 }, { x: W - 130, y: H - 63 }
    ], 'rgba(255,68,170,0.3)', 1, true);

    text.drawText('LEAN', W - 125, H - 101, 10, THEME, 'left');

    // Lean gauge arc (semicircle from left to right)
    const leanCX = W - 70;
    const leanCY = H - 76;
    const arcR = 14;
    const arcSegs = 16;
    for (let i = 0; i < arcSegs; i++) {
      const a1 = Math.PI + (Math.PI * i / arcSegs);
      const a2 = Math.PI + (Math.PI * (i + 1) / arcSegs);
      renderer.drawLine(
        leanCX + Math.cos(a1) * arcR, leanCY + Math.sin(a1) * arcR,
        leanCX + Math.cos(a2) * arcR, leanCY + Math.sin(a2) * arcR,
        '#333333', 2
      );
    }

    const needleAngle = -Math.PI / 2 + player.angle * 1.5;
    const leanWarning = Math.abs(player.angle) > MAX_LEAN * 0.7;
    const needleColor = leanWarning ? '#ff4444' : THEME;
    renderer.setGlow(needleColor, 0.4);
    renderer.drawLine(leanCX, leanCY, leanCX + Math.cos(needleAngle) * arcR, leanCY + Math.sin(needleAngle) * arcR, needleColor, 2);
    renderer.setGlow(null);

    text.drawText(`${Math.floor(player.angle * 180 / Math.PI)}deg`, W - 55, H - 80, 10, '#aaaaaa', 'left');

    // Level indicator
    text.drawText(`LVL ${currentLevel}`, W - 15, 15, 12, THEME, 'right');

    // Ghost label
    if (ghostFrame > 0 && ghostFrame <= ghostData.length && !ghostBike.crashed) {
      const gsx = ghostBike.x - cameraX;
      const gsy = ghostBike.y - cameraY;
      if (gsx > -20 && gsx < W + 20 && gsy > 0 && gsy < H) {
        text.drawText('GHOST', gsx, gsy - 50, 9, 'rgba(255,68,170,0.4)', 'center');
      }
    }

    // Progress bar at top
    if (checkpoints.length > 0 && terrain.length > 1) {
      const barY = 6, barH = 4, barW = W - 20, barX = 10;
      const totalDist = terrain[terrain.length - 1].x - terrain[0].x;

      renderer.fillRect(barX, barY, barW, barH, '#222222');

      const playerProg = Math.max(0, Math.min(1, (player.x - terrain[0].x) / totalDist));
      renderer.setGlow(THEME, 0.3);
      renderer.fillRect(barX, barY, barW * playerProg, barH, THEME);
      renderer.setGlow(null);

      // Ghost progress marker
      const ghostProg = Math.max(0, Math.min(1, (ghostBike.x - terrain[0].x) / totalDist));
      renderer.fillRect(barX + barW * ghostProg - 2, barY - 1, 4, barH + 2, 'rgba(255,68,170,0.4)');

      // Checkpoint markers
      for (const cp of checkpoints) {
        const cpProg = Math.max(0, Math.min(1, (cp.x - terrain[0].x) / totalDist));
        const cpColor = cp.reached ? '#00ff00' : (cp.isFinish ? '#ffff00' : '#888888');
        renderer.fillRect(barX + barW * cpProg - 1, barY - 2, 2, barH + 4, cpColor);
      }
    }
  }

  game.start();
  return game;
}
