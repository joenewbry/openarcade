// outrun/game.js — OutRun game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 400;

// Road constants
const ROAD_W = 2000;
const SEG_LENGTH = 200;
const DRAW_DIST = 150;
const CAM_HEIGHT = 1000;
const CAM_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180);
const TOTAL_SEGMENTS = 6000;

// Checkpoint
const CHECKPOINT_INTERVAL = 600;
const TIME_PER_CHECKPOINT = 15;

// Player physics
const MAX_SPEED = SEG_LENGTH * 60;
const ACCEL = MAX_SPEED / 120;
const BRAKE = -MAX_SPEED / 60;
const DECEL = -MAX_SPEED / 300;
const OFF_ROAD_DECEL = -MAX_SPEED / 30;
const OFF_ROAD_LIMIT = MAX_SPEED / 4;
const CENTRIFUGAL = 0.3;

// Traffic
const TRAFFIC_DENSITY = 0.03;
const TRAFFIC_COLORS = ['#f44', '#4f4', '#44f', '#ff0', '#0ff', '#fa0', '#f4e', '#fff'];

// Scenery types
const SCENERY_PALM = 0;
const SCENERY_BUSH = 1;
const SCENERY_SIGN = 2;
const SCENERY_ROCK = 3;

// Fixed tick = 1/60 second
const DT = 1 / 60;

// ── State ──
let segments, trafficCars;
let playerX, speed, position;
let score, best = 0;
let timeLeft, nextCheckpoint, checkpointFlash;
let frameCount;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Sky gradient colors (pre-computed bands) ──
const SKY_BANDS = [];
(function buildSkyBands() {
  const stops = [
    { pos: 0.00, r: 10,  g: 0,   b: 32  },
    { pos: 0.30, r: 26,  g: 0,   b: 64  },
    { pos: 0.55, r: 74,  g: 0,   b: 96  },
    { pos: 0.75, r: 160, g: 32,  b: 80  },
    { pos: 0.90, r: 240, g: 96,  b: 48  },
    { pos: 1.00, r: 255, g: 128, b: 64  },
  ];
  const skyH = Math.ceil(H * 0.55);
  const bandCount = 44;
  for (let i = 0; i < bandCount; i++) {
    const t = i / (bandCount - 1);
    let s0 = stops[0], s1 = stops[1];
    for (let j = 1; j < stops.length; j++) {
      if (t <= stops[j].pos) {
        s0 = stops[j - 1];
        s1 = stops[j];
        break;
      }
    }
    const localT = (s1.pos === s0.pos) ? 0 : (t - s0.pos) / (s1.pos - s0.pos);
    const r = Math.round(s0.r + (s1.r - s0.r) * localT);
    const g = Math.round(s0.g + (s1.g - s0.g) * localT);
    const b = Math.round(s0.b + (s1.b - s0.b) * localT);
    const y = Math.floor(t * skyH);
    const nextT = (i + 1) / (bandCount - 1);
    const nextY = i < bandCount - 1 ? Math.floor(nextT * skyH) : skyH;
    const h = Math.max(1, nextY - y);
    SKY_BANDS.push({ y, h, color: `rgb(${r},${g},${b})` });
  }
})();

// ── Sun stripe pre-computation ──
const SUN_Y = H * 0.38;
const SUN_R = 40;
const SUN_STRIPES = [];
for (let i = 0; i < 6; i++) {
  const stripeY = SUN_Y - SUN_R + 10 + i * 14;
  const stripeH = 2 + i * 0.8;
  const dy = stripeY - SUN_Y;
  if (Math.abs(dy) < SUN_R) {
    const halfW = Math.sqrt(SUN_R * SUN_R - dy * dy);
    SUN_STRIPES.push({ x: W / 2 - halfW, y: stripeY, w: halfW * 2, h: stripeH });
  }
}

// Deterministic pseudo-random for scenery placement (same every game)
function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildRoad() {
  segments = [];
  for (let i = 0; i < TOTAL_SEGMENTS; i++) {
    const seg = {
      index: i,
      p1: { world: { z: i * SEG_LENGTH, x: 0, y: 0 }, camera: {}, screen: {} },
      p2: { world: { z: (i + 1) * SEG_LENGTH, x: 0, y: 0 }, camera: {}, screen: {} },
      curve: 0,
      hill: 0,
      color: {},
      sceneryLeft: null,
      sceneryRight: null,
    };

    // Curves
    if (i > 50 && i < 250) seg.curve = 2;
    else if (i > 300 && i < 500) seg.curve = -3;
    else if (i > 600 && i < 800) seg.curve = 4;
    else if (i > 900 && i < 1050) seg.curve = -2;
    else if (i > 1100 && i < 1400) seg.curve = 3;
    else if (i > 1500 && i < 1700) seg.curve = -4;
    else if (i > 1800 && i < 1950) seg.curve = 2.5;
    else if (i > 2100 && i < 2400) seg.curve = -3.5;
    else if (i > 2500 && i < 2700) seg.curve = 5;
    else if (i > 2800 && i < 3000) seg.curve = -2;
    else if (i > 3200 && i < 3500) seg.curve = 3;
    else if (i > 3600 && i < 3800) seg.curve = -4;
    else if (i > 4000 && i < 4300) seg.curve = 2;
    else if (i > 4500 && i < 4700) seg.curve = -3;
    else if (i > 4900 && i < 5200) seg.curve = 4.5;
    else if (i > 5400 && i < 5600) seg.curve = -5;
    else if (i > 5700 && i < 5900) seg.curve = 3;

    // Hills
    if (i > 100 && i < 180) seg.hill = Math.sin((i - 100) / 80 * Math.PI) * 40;
    else if (i > 350 && i < 450) seg.hill = Math.sin((i - 350) / 100 * Math.PI) * 60;
    else if (i > 700 && i < 780) seg.hill = Math.sin((i - 700) / 80 * Math.PI) * 30;
    else if (i > 1000 && i < 1100) seg.hill = Math.sin((i - 1000) / 100 * Math.PI) * -50;
    else if (i > 1300 && i < 1380) seg.hill = Math.sin((i - 1300) / 80 * Math.PI) * 45;
    else if (i > 1600 && i < 1700) seg.hill = Math.sin((i - 1600) / 100 * Math.PI) * -40;
    else if (i > 2000 && i < 2100) seg.hill = Math.sin((i - 2000) / 100 * Math.PI) * 55;
    else if (i > 2300 && i < 2380) seg.hill = Math.sin((i - 2300) / 80 * Math.PI) * -35;
    else if (i > 2600 && i < 2700) seg.hill = Math.sin((i - 2600) / 100 * Math.PI) * 50;
    else if (i > 3100 && i < 3200) seg.hill = Math.sin((i - 3100) / 100 * Math.PI) * -60;
    else if (i > 3500 && i < 3600) seg.hill = Math.sin((i - 3500) / 100 * Math.PI) * 40;
    else if (i > 4100 && i < 4200) seg.hill = Math.sin((i - 4100) / 100 * Math.PI) * -45;
    else if (i > 4600 && i < 4700) seg.hill = Math.sin((i - 4600) / 100 * Math.PI) * 55;
    else if (i > 5100 && i < 5200) seg.hill = Math.sin((i - 5100) / 100 * Math.PI) * -50;

    // Segment colors
    const dark = (Math.floor(i / 3) % 2 === 0);
    seg.color = {
      road: dark ? '#555' : '#666',
      grass: dark ? '#1a4a1a' : '#1e5e1e',
      rumble: dark ? '#c22' : '#fff',
      lane: dark ? '#fff' : null
    };

    // Checkpoint segments
    if (i % CHECKPOINT_INTERVAL === 0 && i > 0) {
      seg.color.road = '#f4e';
      seg.color.rumble = '#f4e';
    }

    // Scenery (deterministic)
    if (pseudoRandom(i * 7 + 3) < 0.06 && i > 10) {
      const r1 = pseudoRandom(i * 13 + 7);
      const r2 = pseudoRandom(i * 17 + 11);
      const r3 = pseudoRandom(i * 23 + 19);
      const r4 = pseudoRandom(i * 29 + 31);
      const type = r1 < 0.5 ? SCENERY_PALM :
                   r2 < 0.5 ? SCENERY_BUSH :
                   r3 < 0.5 ? SCENERY_SIGN : SCENERY_ROCK;
      const offset = 1.2 + r4 * 2.0;
      if (pseudoRandom(i * 37 + 41) < 0.5) {
        seg.sceneryLeft = { type, offset };
      } else {
        seg.sceneryRight = { type, offset };
      }
    }

    segments.push(seg);
  }

  // Pre-compute y positions from hills
  let curY = 0;
  for (let i = 0; i < segments.length; i++) {
    curY += segments[i].hill;
    segments[i].p1.world.y = curY;
  }
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].p2.world.y = segments[i + 1].p1.world.y;
  }
  segments[segments.length - 1].p2.world.y = segments[segments.length - 1].p1.world.y;
}

function spawnTraffic() {
  trafficCars = [];
  for (let i = 30; i < TOTAL_SEGMENTS; i++) {
    const r = pseudoRandom(i * 43 + 59);
    if (r < TRAFFIC_DENSITY) {
      trafficCars.push({
        z: i * SEG_LENGTH + pseudoRandom(i * 53 + 67) * SEG_LENGTH,
        x: -0.7 + pseudoRandom(i * 61 + 71) * 1.4,
        speed: MAX_SPEED * (0.2 + pseudoRandom(i * 73 + 79) * 0.35),
        color: TRAFFIC_COLORS[Math.floor(pseudoRandom(i * 83 + 89) * TRAFFIC_COLORS.length)],
        w: 300,
      });
    }
  }
}

function findSegment(z) {
  const idx = Math.floor(z / SEG_LENGTH) % TOTAL_SEGMENTS;
  return segments[idx < 0 ? idx + TOTAL_SEGMENTS : idx];
}

function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = (p.world.y || 0) - camY;
  p.camera.z = (p.world.z || 0) - camZ;
  if (p.camera.z <= 0) p.camera.z = 1;
  p.screen.scale = CAM_DEPTH / p.camera.z;
  p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
  p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
  p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
}

function shadeColor(hex, amt) {
  let r = parseInt(hex.slice(1, 2), 16) * 17;
  let g = parseInt(hex.slice(2, 3), 16) * 17;
  let b = parseInt(hex.slice(3, 4), 16) * 17;
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}

// ── Drawing helpers ──

function drawScenery(renderer, item, side, p1, seg) {
  const scale = p1.scale || seg.p1.screen.scale;
  if (!scale || scale < 0.001) return;

  const x = side > 0
    ? p1.x + p1.w * item.offset
    : p1.x - p1.w * item.offset;
  const y = p1.y;

  const size = scale * 4000;
  if (size < 2) return;

  switch (item.type) {
    case SCENERY_PALM: {
      renderer.fillRect(x - size * 0.03, y - size * 0.5, size * 0.06, size * 0.5, '#5a3a1a');
      renderer.setGlow('#2a8a2a', 0.3);
      renderer.fillCircle(x, y - size * 0.5, size * 0.15, '#1a6a1a');
      renderer.fillCircle(x - size * 0.1, y - size * 0.45, size * 0.1, '#1a6a1a');
      renderer.fillCircle(x + size * 0.1, y - size * 0.45, size * 0.1, '#1a6a1a');
      renderer.setGlow(null);
      break;
    }
    case SCENERY_BUSH: {
      renderer.setGlow('#2a7a3a', 0.2);
      renderer.fillCircle(x, y - size * 0.06, size * 0.08, '#1a5a2a');
      renderer.setGlow(null);
      break;
    }
    case SCENERY_SIGN: {
      renderer.fillRect(x - size * 0.01, y - size * 0.3, size * 0.02, size * 0.3, '#888');
      renderer.fillRect(x - size * 0.08, y - size * 0.32, size * 0.16, size * 0.1, '#224');
      renderer.setGlow('#f4e', 0.3);
      renderer.fillRect(x - size * 0.06, y - size * 0.3, size * 0.12, size * 0.06, '#f4e');
      renderer.setGlow(null);
      break;
    }
    case SCENERY_ROCK: {
      renderer.fillCircle(x, y - size * 0.03, size * 0.05, '#444');
      break;
    }
  }
}

function drawTrafficCar(renderer, car, seg) {
  const p1 = seg.p1.screen;
  const p2 = seg.p2.screen;

  const segStart = Math.floor(car.z / SEG_LENGTH) * SEG_LENGTH;
  const frac = (car.z - segStart) / SEG_LENGTH;

  const cx = p1.x + (p2.x - p1.x) * frac + (p1.w + (p2.w - p1.w) * frac) * car.x;
  const cy = p1.y + (p2.y - p1.y) * frac;
  const scale = p1.scale || seg.p1.screen.scale;
  if (!scale || scale < 0.001) return;

  const cw = scale * car.w;
  const ch = cw * 0.6;
  if (cw < 1) return;

  renderer.setGlow(car.color, 0.4);
  renderer.fillRect(cx - cw / 2, cy - ch, cw, ch, car.color);
  renderer.fillRect(cx - cw * 0.35, cy - ch * 1.3, cw * 0.7, ch * 0.4, shadeColor(car.color, -40));
  renderer.fillRect(cx - cw * 0.3, cy - ch * 1.25, cw * 0.6, ch * 0.3, '#aae');
  renderer.setGlow(null);
}

function drawPlayerCar(renderer, input) {
  const carW = 50;
  const carH = 30;
  const cx = W / 2;
  const cy = H - 50;

  const steerOffset = (input.isDown('ArrowLeft') || input.isDown('a') ? -3 : 0) +
                      (input.isDown('ArrowRight') || input.isDown('d') ? 3 : 0);

  // Shadow
  renderer.fillRect(cx - carW / 2 + 3, cy - 2, carW, 8, 'rgba(0,0,0,0.4)');

  // Car body (trapezoid)
  renderer.setGlow('#f4e', 0.7);
  renderer.fillPoly([
    { x: cx - carW / 2 + steerOffset, y: cy },
    { x: cx + carW / 2 + steerOffset, y: cy },
    { x: cx + carW / 2 - 3,           y: cy - carH },
    { x: cx - carW / 2 + 3,           y: cy - carH }
  ], '#f4e');
  renderer.setGlow(null);

  // Roof
  renderer.fillRect(cx - carW * 0.3, cy - carH - 12, carW * 0.6, 14, '#c3b');

  // Windshield
  renderer.fillRect(cx - carW * 0.25, cy - carH - 10, carW * 0.5, 10, '#99ccff');

  // Rear lights
  renderer.setGlow('#f00', 0.5);
  renderer.fillRect(cx - carW / 2 + steerOffset + 2, cy - 5, 6, 4, '#f00');
  renderer.fillRect(cx + carW / 2 + steerOffset - 8, cy - 5, 6, 4, '#f00');
  renderer.setGlow(null);

  // Wheels
  renderer.fillRect(cx - carW / 2 - 3 + steerOffset, cy - 6, 6, 8, '#222');
  renderer.fillRect(cx + carW / 2 - 3 + steerOffset, cy - 6, 6, 8, '#222');
  renderer.fillRect(cx - carW / 2 - 1, cy - carH + 2, 6, 8, '#222');
  renderer.fillRect(cx + carW / 2 - 5, cy - carH + 2, 6, 8, '#222');
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    buildRoad();
    spawnTraffic();
    playerX = 0;
    speed = 0;
    position = 0;
    score = 0;
    timeLeft = 30;
    frameCount = 0;
    nextCheckpoint = CHECKPOINT_INTERVAL;
    checkpointFlash = 0;
    scoreEl.textContent = '0';
    game.showOverlay('OUTRUN', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Timer
    timeLeft -= DT;
    if (timeLeft <= 0) {
      timeLeft = 0;
      score = Math.floor(position / SEG_LENGTH);
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
      return;
    }

    // Current segment
    const playerSeg = findSegment(position);
    const speedPct = speed / MAX_SPEED;

    // Acceleration / braking
    if (input.isDown('ArrowUp') || input.isDown('w')) {
      speed += ACCEL;
    } else if (input.isDown('ArrowDown') || input.isDown('s')) {
      speed += BRAKE;
    } else {
      speed += DECEL;
    }

    // Steering
    if (input.isDown('ArrowLeft') || input.isDown('a')) {
      playerX -= 0.04 * speedPct;
    }
    if (input.isDown('ArrowRight') || input.isDown('d')) {
      playerX += 0.04 * speedPct;
    }

    // Centrifugal force
    playerX -= (playerSeg.curve * speedPct * CENTRIFUGAL * DT);

    // Off-road
    if (Math.abs(playerX) > 1.0) {
      if (speed > OFF_ROAD_LIMIT) {
        speed += OFF_ROAD_DECEL;
      }
      playerX = Math.max(-2.0, Math.min(2.0, playerX));
    }

    // Clamp speed
    speed = Math.max(0, Math.min(MAX_SPEED, speed));

    // Move forward
    position += speed * DT;

    // Traffic collision
    for (let i = 0; i < trafficCars.length; i++) {
      const car = trafficCars[i];
      const carDist = car.z - position;
      if (carDist > 0 && carDist < SEG_LENGTH * 0.8) {
        const playerW = 0.25;
        if (Math.abs(playerX - car.x) < (playerW + 0.2)) {
          speed = Math.max(0, speed - MAX_SPEED * 0.6);
          if (playerX > car.x) playerX += 0.3;
          else playerX -= 0.3;
          position = car.z - SEG_LENGTH * 0.8;
        }
      }
    }

    // Move traffic
    for (let i = 0; i < trafficCars.length; i++) {
      trafficCars[i].z += trafficCars[i].speed * DT;
      if (trafficCars[i].z > TOTAL_SEGMENTS * SEG_LENGTH) {
        trafficCars[i].z -= TOTAL_SEGMENTS * SEG_LENGTH;
      }
    }

    // Score
    score = Math.floor(position / SEG_LENGTH);
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Checkpoint
    const currentSeg = Math.floor(position / SEG_LENGTH);
    if (currentSeg >= nextCheckpoint) {
      timeLeft += TIME_PER_CHECKPOINT;
      nextCheckpoint += CHECKPOINT_INTERVAL;
      checkpointFlash = 2.0;
    }
    if (checkpointFlash > 0) checkpointFlash -= DT;
  };

  game.onDraw = (renderer, text) => {
    // ── Sky gradient (horizontal bands) ──
    for (let i = 0; i < SKY_BANDS.length; i++) {
      const b = SKY_BANDS[i];
      renderer.fillRect(0, b.y, W, b.h, b.color);
    }

    // ── Sun ──
    renderer.setGlow('#ff4060', 0.8);
    renderer.fillCircle(W / 2, SUN_Y, SUN_R, '#ff4060');
    renderer.setGlow(null);

    // Sun stripes
    for (let i = 0; i < SUN_STRIPES.length; i++) {
      const s = SUN_STRIPES[i];
      renderer.fillRect(s.x, s.y, s.w, s.h, '#0a0020');
    }

    // ── Road rendering ──
    const baseSegIdx = Math.floor(position / SEG_LENGTH);

    let camX = playerX * ROAD_W;
    let camY = CAM_HEIGHT;
    const pSeg = findSegment(position);
    camY += pSeg.p1.world.y;

    // Collect visible segments
    const drawSegs = [];
    let curCurveX = 0;
    for (let n = 0; n < DRAW_DIST; n++) {
      const idx = (baseSegIdx + n) % TOTAL_SEGMENTS;
      const seg = segments[idx];
      const loopOffset = (baseSegIdx + n >= TOTAL_SEGMENTS) ? TOTAL_SEGMENTS * SEG_LENGTH : 0;

      seg.p1.world.z = idx * SEG_LENGTH + loopOffset;
      seg.p2.world.z = (idx + 1) * SEG_LENGTH + loopOffset;

      seg.p1.world.x = curCurveX;
      curCurveX += seg.curve;
      seg.p2.world.x = curCurveX;

      project(seg.p1, camX + seg.p1.world.x, camY, position);
      project(seg.p2, camX + seg.p2.world.x, camY, position);

      if (seg.p1.camera.z <= 0 || seg.p2.screen.y >= H) continue;
      drawSegs.push({ seg, idx });
    }

    // Pass 1: Draw road surface (grass, road, rumble, lanes) back to front
    for (let i = drawSegs.length - 1; i >= 0; i--) {
      const { seg } = drawSegs[i];
      const p1 = seg.p1.screen;
      const p2 = seg.p2.screen;

      if (p1.y > H && p2.y > H) continue;

      const y1 = Math.max(0, Math.min(H, p2.y));
      const y2 = Math.max(0, Math.min(H, p1.y));
      if (y1 >= y2) continue;

      // Grass
      renderer.fillRect(0, y1, W, y2 - y1, seg.color.grass);

      // Road (trapezoid)
      renderer.fillPoly([
        { x: p1.x - p1.w, y: p1.y },
        { x: p1.x + p1.w, y: p1.y },
        { x: p2.x + p2.w, y: p2.y },
        { x: p2.x - p2.w, y: p2.y }
      ], seg.color.road);

      // Rumble strips
      const rw1 = p1.w * 0.08;
      const rw2 = p2.w * 0.08;
      renderer.fillPoly([
        { x: p1.x - p1.w - rw1, y: p1.y },
        { x: p1.x - p1.w,       y: p1.y },
        { x: p2.x - p2.w,       y: p2.y },
        { x: p2.x - p2.w - rw2, y: p2.y }
      ], seg.color.rumble);
      renderer.fillPoly([
        { x: p1.x + p1.w,       y: p1.y },
        { x: p1.x + p1.w + rw1, y: p1.y },
        { x: p2.x + p2.w + rw2, y: p2.y },
        { x: p2.x + p2.w,       y: p2.y }
      ], seg.color.rumble);

      // Lane markings
      if (seg.color.lane) {
        const laneW1 = p1.w * 0.015;
        const laneW2 = p2.w * 0.015;
        for (let lane = -1; lane <= 1; lane += 2) {
          const lx1 = p1.x + p1.w * lane * 0.33;
          const lx2 = p2.x + p2.w * lane * 0.33;
          renderer.fillPoly([
            { x: lx1 - laneW1, y: p1.y },
            { x: lx1 + laneW1, y: p1.y },
            { x: lx2 + laneW2, y: p2.y },
            { x: lx2 - laneW2, y: p2.y }
          ], seg.color.lane);
        }
      }
    }

    // Flush road surface so scenery/traffic draw on top
    renderer.flushBatch();

    // Pass 2: Draw scenery and traffic back to front (on top of road)
    for (let i = drawSegs.length - 1; i >= 0; i--) {
      const { seg, idx } = drawSegs[i];
      const p1 = seg.p1.screen;

      // Scenery
      if (seg.sceneryLeft) {
        drawScenery(renderer, seg.sceneryLeft, -1, p1, seg);
      }
      if (seg.sceneryRight) {
        drawScenery(renderer, seg.sceneryRight, 1, p1, seg);
      }

      // Traffic cars on this segment
      for (let t = 0; t < trafficCars.length; t++) {
        const car = trafficCars[t];
        const carSegIdx = Math.floor(car.z / SEG_LENGTH) % TOTAL_SEGMENTS;
        if (carSegIdx === idx) {
          drawTrafficCar(renderer, car, seg);
        }
      }
    }

    // ── Player car ──
    drawPlayerCar(renderer, game.input);

    // ── HUD ──
    drawHUD(renderer, text, game);

    // ── Checkpoint flash ──
    if (checkpointFlash > 0) {
      const alpha = Math.min(1, checkpointFlash) * 0.6;
      renderer.fillRect(0, 0, W, H, `rgba(255,68,238,${alpha * 0.15})`);
      renderer.setGlow('#f4e', 0.8);
      text.drawText('CHECKPOINT! +' + TIME_PER_CHECKPOINT + 's', W / 2, H / 2 - 55, 28, '#f4e', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}

function drawHUD(renderer, text, game) {
  // Speed gauge
  const gaugeX = 10;
  const gaugeY = H - 35;
  const gaugeW = 120;
  const gaugeH = 14;
  const speedPct = speed / MAX_SPEED;

  // Gauge background
  renderer.fillRect(gaugeX - 2, gaugeY - 18, gaugeW + 4, gaugeH + 24, 'rgba(0,0,0,0.5)');

  text.drawText('SPEED', gaugeX, gaugeY - 24, 10, '#aaa', 'left');

  // Speed bar bg
  renderer.fillRect(gaugeX, gaugeY, gaugeW, gaugeH, '#333');

  // Speed bar fill
  const speedColor = speedPct < 0.5 ? '#4f4' : speedPct < 0.8 ? '#ff0' : '#f44';
  renderer.setGlow(speedColor, 0.4);
  renderer.fillRect(gaugeX, gaugeY, gaugeW * speedPct, gaugeH, speedColor);
  renderer.setGlow(null);

  // Speed text
  const kmh = Math.floor(speedPct * 280);
  text.drawText(kmh + ' km/h', gaugeX + gaugeW + 5, gaugeY - 2, 11, '#fff', 'left');

  // Timer
  const timeColor = timeLeft <= 5 ? '#f44' : timeLeft <= 10 ? '#ff0' : '#fff';
  if (timeLeft <= 5) {
    renderer.setGlow(timeColor, 0.6);
  }
  text.drawText('TIME: ' + Math.ceil(timeLeft), W / 2, 5, 22, timeColor, 'center');
  renderer.setGlow(null);

  // Timer flash when low
  if (timeLeft <= 5 && Math.floor(timeLeft * 4) % 2 === 0) {
    renderer.fillRect(0, 0, W, H, 'rgba(255,0,0,0.08)');
  }

  // Next checkpoint distance
  const distToCheckpoint = nextCheckpoint - Math.floor(position / SEG_LENGTH);
  text.drawText('NEXT CP: ' + distToCheckpoint + 'm', W - 10, 5, 11, '#f4e', 'right');

  // Controls hint when slow
  if (speed < MAX_SPEED * 0.05 && game.state === 'playing') {
    text.drawText('UP=Gas  DOWN=Brake  LEFT/RIGHT=Steer', W / 2, H - 12, 10, '#a38', 'center');
  }
}
