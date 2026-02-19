// road-fighter/game.js — Road Fighter game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// ── Theme ──
const THEME = '#4ca';

// ── Road geometry ──
const ROAD_LEFT = 60;
const ROAD_RIGHT = 340;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANE_COUNT = 4;
const LANE_W = ROAD_W / LANE_COUNT;
const SHOULDER_W = 10;

// ── Player car ──
const CAR_W = 32;
const CAR_H = 56;
const PLAYER_Y = H - 100;
const STEER_SPEED = 4.5;
const ACCEL_BOOST = 0.3;
const BRAKE_SLOW = 0.4;

// ── Game constants ──
const BASE_SPEED = 3;
const MAX_SPEED = 10;
const SPEED_RAMP_TIME = 7200;

const FUEL_MAX = 100;
const FUEL_DRAIN_BASE = 0.015;
const FUEL_PICKUP_AMOUNT = 25;

const SPAWN_INTERVAL_START = 70;
const SPAWN_INTERVAL_MIN = 20;

const OBSTACLE_SPAWN_CHANCE = 0.12;
const FUEL_SPAWN_INTERVAL = 300;
const BOOST_SPAWN_INTERVAL = 500;

const STAGE_LENGTH = 2000;

// ── Traffic car colors ──
const TRAFFIC_COLORS = [
  { body: '#e44', accent: '#f66' },
  { body: '#48f', accent: '#6af' },
  { body: '#fa0', accent: '#fc4' },
  { body: '#f0f', accent: '#f6f' },
  { body: '#ff0', accent: '#ff8' },
  { body: '#0f8', accent: '#4fa' }
];

// ── State ──
let score, fuel, speed, playerX, stage, stageProgress;
let trafficCars, obstacles, fuelPickups, boostZones;
let roadOffset, spawnTimer, fuelSpawnTimer, boostSpawnTimer, frameCount;
let crashTimer, crashX, crashY;
let invincibleTimer;
let speedBoostTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
let best = 0;

// ── Helpers ──

function difficulty() {
  return Math.min(frameCount / SPEED_RAMP_TIME, 1);
}

function currentMaxSpeed() {
  return BASE_SPEED + difficulty() * (MAX_SPEED - BASE_SPEED);
}

function spawnInterval() {
  return Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - difficulty() * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN));
}

function randomLaneX() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  return ROAD_LEFT + lane * LANE_W + (LANE_W - CAR_W) / 2;
}

function spawnTrafficCar() {
  const colorSet = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
  const x = randomLaneX();
  const relSpeed = 0.3 + Math.random() * 0.5;
  const swerve = Math.random() < 0.15 ? (Math.random() - 0.5) * 1.5 : 0;
  trafficCars.push({
    x, y: -CAR_H - Math.random() * 40,
    w: CAR_W, h: CAR_H,
    relSpeed,
    swerve,
    swervePhase: Math.random() * Math.PI * 2,
    color: colorSet
  });
}

function spawnObstacle() {
  const types = ['oil', 'rock', 'cone'];
  const type = types[Math.floor(Math.random() * types.length)];
  const x = ROAD_LEFT + SHOULDER_W + Math.random() * (ROAD_W - SHOULDER_W * 2 - 24);
  obstacles.push({ x, y: -30, w: 24, h: 24, type });
}

function spawnFuelPickup() {
  const x = randomLaneX() + (CAR_W - 20) / 2;
  fuelPickups.push({ x, y: -30, w: 20, h: 20, pulse: 0 });
}

function spawnBoostZone() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const x = ROAD_LEFT + lane * LANE_W;
  boostZones.push({ x, y: -120, w: LANE_W, h: 100 });
}

function collides(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    fuel = FUEL_MAX;
    speed = BASE_SPEED;
    playerX = W / 2 - CAR_W / 2;
    stage = 1;
    stageProgress = 0;
    trafficCars = [];
    obstacles = [];
    fuelPickups = [];
    boostZones = [];
    roadOffset = 0;
    spawnTimer = 0;
    fuelSpawnTimer = 0;
    boostSpawnTimer = 0;
    frameCount = 0;
    crashTimer = 0;
    invincibleTimer = 0;
    speedBoostTimer = 0;
    scoreEl.textContent = '0';
    game.showOverlay('ROAD FIGHTER', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing ──
    frameCount++;

    // Handle crash animation
    if (crashTimer > 0) {
      crashTimer--;
      if (crashTimer === 0) {
        invincibleTimer = 90;
        fuel -= 15;
        if (fuel <= 0) {
          fuel = 0;
          if (score > best) { best = score; bestEl.textContent = best; }
          game.showOverlay('GAME OVER', `Score: ${score} | Stage: ${stage} -- Press any key`);
          game.setState('over');
          return;
        }
      }
      return; // freeze gameplay during crash
    }

    // Invincibility countdown
    if (invincibleTimer > 0) invincibleTimer--;

    // Speed boost countdown
    if (speedBoostTimer > 0) speedBoostTimer--;

    // Player steering
    let effectiveSpeed = speed;
    if (input.isDown('ArrowUp') || input.isDown('w')) {
      effectiveSpeed = Math.min(currentMaxSpeed(), speed + ACCEL_BOOST);
    }
    if (input.isDown('ArrowDown') || input.isDown('s')) {
      effectiveSpeed = Math.max(BASE_SPEED * 0.5, speed - BRAKE_SLOW);
    }
    speed = effectiveSpeed;

    if (speedBoostTimer > 0) {
      speed = Math.min(MAX_SPEED * 1.2, speed + 1.5);
    }

    if (input.isDown('ArrowLeft') || input.isDown('a')) playerX -= STEER_SPEED + speed * 0.15;
    if (input.isDown('ArrowRight') || input.isDown('d')) playerX += STEER_SPEED + speed * 0.15;

    // Clamp player to road with slight penalty for shoulder
    if (playerX < ROAD_LEFT) {
      playerX = ROAD_LEFT;
      speed = Math.max(BASE_SPEED * 0.5, speed - 0.2);
    }
    if (playerX + CAR_W > ROAD_RIGHT) {
      playerX = ROAD_RIGHT - CAR_W;
      speed = Math.max(BASE_SPEED * 0.5, speed - 0.2);
    }

    // Fuel drain
    const fuelDrain = FUEL_DRAIN_BASE * (0.7 + speed / MAX_SPEED * 0.6);
    fuel -= fuelDrain;
    if (fuel <= 0) {
      fuel = 0;
      if (score > best) { best = score; bestEl.textContent = best; }
      game.showOverlay('GAME OVER', `Score: ${score} | Stage: ${stage} -- Press any key`);
      game.setState('over');
      return;
    }

    // Scroll road
    roadOffset = (roadOffset + speed * 3) % 40;

    // Score
    const scoreGain = Math.floor(speed * 0.5);
    score += scoreGain;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }

    // Stage progression
    stageProgress += scoreGain;
    if (stageProgress >= STAGE_LENGTH) {
      stageProgress -= STAGE_LENGTH;
      stage++;
    }

    // ── Spawn traffic ──
    spawnTimer++;
    if (spawnTimer >= spawnInterval()) {
      spawnTimer = 0;
      if (Math.random() < OBSTACLE_SPAWN_CHANCE) {
        spawnObstacle();
      } else {
        spawnTrafficCar();
        if (difficulty() > 0.4 && Math.random() < 0.3) {
          spawnTrafficCar();
        }
      }
    }

    // Spawn fuel pickups
    fuelSpawnTimer++;
    if (fuelSpawnTimer >= FUEL_SPAWN_INTERVAL) {
      fuelSpawnTimer = 0;
      spawnFuelPickup();
    }

    // Spawn boost zones
    boostSpawnTimer++;
    if (boostSpawnTimer >= BOOST_SPAWN_INTERVAL) {
      boostSpawnTimer = 0;
      spawnBoostZone();
    }

    // ── Update traffic ──
    for (let i = trafficCars.length - 1; i >= 0; i--) {
      const car = trafficCars[i];
      car.y += speed * (1 - car.relSpeed) * 2;
      if (car.swerve !== 0) {
        car.swervePhase += 0.03;
        car.x += Math.sin(car.swervePhase) * car.swerve;
        car.x = Math.max(ROAD_LEFT, Math.min(ROAD_RIGHT - car.w, car.x));
      }
      if (car.y > H + 20) {
        trafficCars.splice(i, 1);
        continue;
      }
      if (invincibleTimer === 0 && collides(playerX, PLAYER_Y, CAR_W, CAR_H, car.x, car.y, car.w, car.h)) {
        crashTimer = 30;
        crashX = playerX;
        crashY = PLAYER_Y;
        trafficCars.splice(i, 1);
        speed = BASE_SPEED;
        continue;
      }
    }

    // ── Update obstacles ──
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.y += speed * 2;
      if (obs.y > H + 20) {
        obstacles.splice(i, 1);
        continue;
      }
      if (invincibleTimer === 0 && collides(playerX + 4, PLAYER_Y + 4, CAR_W - 8, CAR_H - 8, obs.x, obs.y, obs.w, obs.h)) {
        if (obs.type === 'oil') {
          playerX += (Math.random() - 0.5) * 60;
          playerX = Math.max(ROAD_LEFT, Math.min(ROAD_RIGHT - CAR_W, playerX));
        } else {
          crashTimer = 15;
          crashX = playerX;
          crashY = PLAYER_Y;
          speed = Math.max(BASE_SPEED * 0.5, speed - 2);
        }
        obstacles.splice(i, 1);
        continue;
      }
    }

    // ── Update fuel pickups ──
    for (let i = fuelPickups.length - 1; i >= 0; i--) {
      const fp = fuelPickups[i];
      fp.y += speed * 2;
      fp.pulse += 0.1;
      if (fp.y > H + 20) {
        fuelPickups.splice(i, 1);
        continue;
      }
      if (collides(playerX, PLAYER_Y, CAR_W, CAR_H, fp.x, fp.y, fp.w, fp.h)) {
        fuel = Math.min(FUEL_MAX, fuel + FUEL_PICKUP_AMOUNT);
        score += 50;
        scoreEl.textContent = score;
        fuelPickups.splice(i, 1);
        continue;
      }
    }

    // ── Update boost zones ──
    for (let i = boostZones.length - 1; i >= 0; i--) {
      const bz = boostZones[i];
      bz.y += speed * 2;
      if (bz.y > H + 20) {
        boostZones.splice(i, 1);
        continue;
      }
      if (collides(playerX, PLAYER_Y, CAR_W, CAR_H, bz.x, bz.y, bz.w, bz.h)) {
        speedBoostTimer = 60;
        score += 20;
        scoreEl.textContent = score;
      }
    }

    // gameData for potential ML extraction
    window.gameData = {
      playerX, speed, fuel, stage,
      trafficCount: trafficCars.length,
      obstacleCount: obstacles.length
    };
  };

  game.onDraw = (renderer, text) => {
    // ── Terrain (behind road) ──
    // Left terrain
    renderer.fillRect(0, 0, ROAD_LEFT, H, '#0a1a12');
    // Right terrain
    renderer.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H, '#0a1a12');

    // Trees
    const treeOffset = (roadOffset * 1.5) % 80;
    for (let y = -80 + treeOffset; y < H + 80; y += 80) {
      drawTree(renderer, 20, y);
      drawTree(renderer, 40, y + 40);
      drawTree(renderer, W - 20, y + 20);
      drawTree(renderer, W - 45, y + 60);
    }

    // ── Road surface ──
    renderer.fillRect(ROAD_LEFT, 0, ROAD_W, H, '#222222');

    // ── Shoulder stripes ──
    drawShoulderStripes(renderer, ROAD_LEFT, ROAD_LEFT + SHOULDER_W);
    drawShoulderStripes(renderer, ROAD_RIGHT - SHOULDER_W, ROAD_RIGHT);

    // ── Lane dashes ──
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const lx = ROAD_LEFT + lane * LANE_W;
      const dashOffset = roadOffset % 40;
      for (let y = -40 + dashOffset; y < H + 40; y += 40) {
        renderer.fillRect(lx - 1, y, 2, 20, '#555555');
      }
    }

    // ── Road edge lines (solid) ──
    renderer.fillRect(ROAD_LEFT - 1.5, 0, 3, H, '#888888');
    renderer.fillRect(ROAD_RIGHT - 1.5, 0, 3, H, '#888888');

    // ── Boost zones ──
    for (const bz of boostZones) {
      renderer.fillRect(bz.x, bz.y, bz.w, bz.h, 'rgba(68,204,170,0.12)');
      // Chevrons
      const chevronSpacing = 20;
      const offset = (roadOffset * 2) % chevronSpacing;
      for (let cy = bz.y + offset; cy < bz.y + bz.h; cy += chevronSpacing) {
        if (cy < bz.y || cy > bz.y + bz.h) continue;
        renderer.drawLine(bz.x + 5, cy + 8, bz.x + bz.w / 2, cy, 'rgba(68,204,170,0.4)', 2);
        renderer.drawLine(bz.x + bz.w / 2, cy, bz.x + bz.w - 5, cy + 8, 'rgba(68,204,170,0.4)', 2);
      }
    }

    // ── Obstacles ──
    for (const obs of obstacles) {
      if (obs.type === 'oil') {
        drawOilSlick(renderer, obs);
      } else if (obs.type === 'rock') {
        drawRock(renderer, obs);
      } else {
        drawCone(renderer, obs);
      }
    }

    // ── Fuel pickups ──
    for (const fp of fuelPickups) {
      const glow = 0.5 + Math.sin(fp.pulse) * 0.3;
      const alpha = Math.round(glow * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#0f8', 0.6);
      // Fuel can body
      renderer.fillRect(fp.x + 2, fp.y + 4, fp.w - 4, fp.h - 4, `#00ff64${alpha}`);
      // Handle
      renderer.fillRect(fp.x + 6, fp.y, 8, 6, `#00ff64${alpha}`);
      renderer.setGlow(null);
      // "F" label
      text.drawText('F', fp.x + fp.w / 2, fp.y + fp.h / 2 - 4, 10, '#1a1a2e', 'center');
    }

    // ── Traffic cars ──
    for (const car of trafficCars) {
      drawTrafficCar(renderer, car);
    }

    // ── Player car or explosion ──
    if (crashTimer > 0) {
      drawExplosion(renderer, crashX, crashY);
    } else {
      const blink = invincibleTimer > 0 && Math.floor(invincibleTimer / 4) % 2 === 0;
      if (!blink) {
        drawPlayerCar(renderer, text, playerX, PLAYER_Y);
      }
    }

    // ── HUD: Fuel bar ──
    drawFuelBar(renderer, text);

    // ── HUD: Speedometer ──
    drawSpeedometer(renderer, text);

    // ── HUD: Stage indicator ──
    drawStageHUD(renderer, text);

    // ── Boost visual effect ──
    if (speedBoostTimer > 0) {
      renderer.fillRect(0, 0, W, H, 'rgba(68,204,170,0.06)');
      // Speed lines
      for (let i = 0; i < 8; i++) {
        const lx = Math.random() * W;
        const ly = Math.random() * H;
        const lineLen = 30 + Math.random() * 40;
        const alpha = Math.round((0.3 + Math.random() * 0.2) * 255).toString(16).padStart(2, '0');
        renderer.drawLine(lx, ly, lx + (Math.random() - 0.5) * 4, ly + lineLen, `#4ca${alpha}`, 1);
      }
    }

    // ── Fuel low warning flash ──
    if (fuel < 20 && Math.floor(frameCount / 15) % 2 === 0) {
      renderer.fillRect(0, 0, W, H, 'rgba(255,50,50,0.15)');
    }

    // ── Screen shake via jitter on crash (visual only, draw offset rects at edges) ──
    // Note: WebGL engine doesn't support canvas translate, so we skip screen shake
    // The crash explosion visual already conveys the impact
  };

  // ─────── Drawing helpers ───────

  function drawTree(renderer, x, y) {
    // Trunk
    renderer.fillRect(x - 2, y + 8, 4, 8, '#3a2a1a');
    // Canopy
    renderer.setGlow('#0f4', 0.3);
    renderer.fillCircle(x, y + 6, 8, '#1a4a2a');
    renderer.setGlow(null);
  }

  function drawShoulderStripes(renderer, x1, x2) {
    const stripeH = 10;
    const gap = 10;
    const total = stripeH + gap;
    const offset = (roadOffset * 2) % total;
    const sw = x2 - x1;
    for (let y = -total + offset; y < H + total; y += total) {
      renderer.fillRect(x1, y, sw, stripeH, '#cc3333');
    }
    for (let y = -total + offset + stripeH; y < H + total; y += total) {
      renderer.fillRect(x1, y, sw, gap, '#eeeeee');
    }
  }

  function drawPlayerCar(renderer, text, x, y) {
    // Car body
    renderer.setGlow(THEME, 0.7);
    renderer.fillRect(x + 2, y + 8, CAR_W - 4, CAR_H - 12, THEME);

    // Windshield
    renderer.setGlow(null);
    renderer.fillRect(x + 6, y + 14, CAR_W - 12, 14, '#2a4a5a');

    // Cabin highlight
    renderer.fillRect(x + 6, y + 14, CAR_W - 12, 7, 'rgba(255,255,255,0.12)');

    // Rear section
    renderer.fillRect(x + 4, y + CAR_H - 18, CAR_W - 8, 12, '#3a9a7a');

    // Wheels
    renderer.fillRect(x - 1, y + 12, 5, 12, '#333333');
    renderer.fillRect(x + CAR_W - 4, y + 12, 5, 12, '#333333');
    renderer.fillRect(x - 1, y + CAR_H - 20, 5, 12, '#333333');
    renderer.fillRect(x + CAR_W - 4, y + CAR_H - 20, 5, 12, '#333333');

    // Headlights
    renderer.setGlow('#ff8', 0.5);
    renderer.fillRect(x + 5, y + 2, 6, 4, '#ffff88');
    renderer.fillRect(x + CAR_W - 11, y + 2, 6, 4, '#ffff88');

    // Tail lights
    renderer.setGlow('#f44', 0.4);
    renderer.fillRect(x + 4, y + CAR_H - 6, 6, 3, '#ff4444');
    renderer.fillRect(x + CAR_W - 10, y + CAR_H - 6, 6, 3, '#ff4444');
    renderer.setGlow(null);

    // Exhaust / thrust flame
    const input = game.input;
    if (speedBoostTimer > 0 || input.isDown('ArrowUp') || input.isDown('w')) {
      const flameH = speedBoostTimer > 0 ? 12 + Math.random() * 8 : 4 + Math.random() * 4;
      const flameColor = speedBoostTimer > 0 ? THEME : '#f80';
      const flameAlpha = speedBoostTimer > 0 ? 0.5 + Math.random() * 0.4 : 0.4 + Math.random() * 0.3;
      const alphaHex = Math.round(flameAlpha * 255).toString(16).padStart(2, '0');
      renderer.setGlow(flameColor, 0.5);
      const flamePts = [
        { x: x + CAR_W / 2 - 5, y: y + CAR_H },
        { x: x + CAR_W / 2, y: y + CAR_H + flameH },
        { x: x + CAR_W / 2 + 5, y: y + CAR_H }
      ];
      const c = speedBoostTimer > 0 ? `rgba(68,204,170,${flameAlpha})` : `rgba(255,150,50,${flameAlpha})`;
      renderer.fillPoly(flamePts, c);
      renderer.setGlow(null);
    }
  }

  function drawTrafficCar(renderer, car) {
    const x = car.x, y = car.y;

    // Body
    renderer.setGlow(car.color.body, 0.4);
    renderer.fillRect(x + 2, y + 8, car.w - 4, car.h - 12, car.color.body);
    renderer.setGlow(null);

    // Accent stripe
    renderer.fillRect(x + 6, y + car.h / 2 - 2, car.w - 12, 4, car.color.accent);

    // Windshield (bottom for oncoming cars)
    renderer.fillRect(x + 6, y + car.h - 24, car.w - 12, 12, '#2a3a4a');

    // Wheels
    renderer.fillRect(x - 1, y + 12, 5, 10, '#333333');
    renderer.fillRect(x + car.w - 4, y + 12, 5, 10, '#333333');
    renderer.fillRect(x - 1, y + car.h - 18, 5, 10, '#333333');
    renderer.fillRect(x + car.w - 4, y + car.h - 18, 5, 10, '#333333');

    // Headlights (at bottom since they face us)
    renderer.setGlow('#ff8', 0.3);
    renderer.fillRect(x + 5, y + car.h - 6, 5, 3, '#ffff88');
    renderer.fillRect(x + car.w - 10, y + car.h - 6, 5, 3, '#ffff88');
    renderer.setGlow(null);
  }

  function drawOilSlick(renderer, obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    renderer.setGlow('#448', 0.3);
    renderer.fillCircle(cx, cy, obs.w / 2 + 2, 'rgba(30,30,60,0.7)');
    // Oily sheen
    renderer.fillCircle(cx - 3, cy - 2, obs.w / 3, 'rgba(80,60,140,0.3)');
    renderer.setGlow(null);
  }

  function drawRock(renderer, obs) {
    renderer.setGlow('#99a', 0.2);
    const pts = [
      { x: obs.x + 4, y: obs.y + obs.h },
      { x: obs.x, y: obs.y + obs.h * 0.6 },
      { x: obs.x + 6, y: obs.y },
      { x: obs.x + obs.w - 4, y: obs.y + 2 },
      { x: obs.x + obs.w, y: obs.y + obs.h * 0.5 },
      { x: obs.x + obs.w - 2, y: obs.y + obs.h }
    ];
    renderer.fillPoly(pts, '#667777');
    // Highlight
    const hlPts = [
      { x: obs.x + 6, y: obs.y },
      { x: obs.x + obs.w - 4, y: obs.y + 2 },
      { x: obs.x + obs.w / 2, y: obs.y + obs.h * 0.4 }
    ];
    renderer.fillPoly(hlPts, 'rgba(255,255,255,0.15)');
    renderer.setGlow(null);
  }

  function drawCone(renderer, obs) {
    renderer.setGlow('#f80', 0.3);
    const pts = [
      { x: obs.x + obs.w / 2, y: obs.y },
      { x: obs.x + obs.w - 2, y: obs.y + obs.h },
      { x: obs.x + 2, y: obs.y + obs.h }
    ];
    renderer.fillPoly(pts, '#ff8800');
    renderer.setGlow(null);
    // White stripes
    renderer.fillRect(obs.x + obs.w / 2 - 5, obs.y + obs.h * 0.4, 10, 3, '#ffffff');
    renderer.fillRect(obs.x + obs.w / 2 - 3, obs.y + obs.h * 0.2, 6, 2, '#ffffff');
  }

  function drawExplosion(renderer, x, y) {
    const t = 1 - crashTimer / 30;
    const radius = 20 + t * 25;

    // Outer flash
    const outerAlpha = Math.max(0, 0.6 - t * 0.5);
    const outerG = Math.floor(150 - t * 150);
    renderer.setGlow('#f80', 0.7);
    renderer.fillCircle(x + CAR_W / 2, y + CAR_H / 2, radius, `rgba(255,${outerG},0,${outerAlpha})`);

    // Inner core
    const innerAlpha = Math.max(0, 0.8 - t * 0.8);
    renderer.fillCircle(x + CAR_W / 2, y + CAR_H / 2, radius * 0.4, `rgba(255,255,200,${innerAlpha})`);
    renderer.setGlow(null);

    // Sparks
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 2;
      const dist = radius * (0.6 + Math.random() * 0.5);
      const sx = x + CAR_W / 2 + Math.cos(angle) * dist;
      const sy = y + CAR_H / 2 + Math.sin(angle) * dist;
      renderer.fillRect(sx - 2, sy - 2, 4, 4, '#ffff88');
    }
  }

  function drawFuelBar(renderer, text) {
    const barX = 8;
    const barY = 60;
    const barW = 14;
    const barH = 200;

    // Background
    renderer.fillRect(barX, barY, barW, barH, '#111111');
    // Border
    renderer.drawLine(barX, barY, barX + barW, barY, '#444444', 1);
    renderer.drawLine(barX + barW, barY, barX + barW, barY + barH, '#444444', 1);
    renderer.drawLine(barX + barW, barY + barH, barX, barY + barH, '#444444', 1);
    renderer.drawLine(barX, barY + barH, barX, barY, '#444444', 1);

    // Fuel level
    const fuelH = (fuel / FUEL_MAX) * (barH - 4);
    const fuelColor = fuel > 30 ? '#00ff88' : fuel > 15 ? '#ffaa00' : '#ff4444';
    renderer.setGlow(fuelColor, 0.4);
    renderer.fillRect(barX + 2, barY + (barH - 2 - fuelH), barW - 4, fuelH, fuelColor);
    renderer.setGlow(null);

    // Labels
    text.drawText('F', barX + barW / 2, barY - 12, 9, '#888888', 'center');
    text.drawText('E', barX + barW / 2, barY + barH + 4, 9, '#888888', 'center');
  }

  function drawSpeedometer(renderer, text) {
    const x = W - 50;
    const y = 70;
    const speedPct = (speed - BASE_SPEED * 0.5) / (MAX_SPEED * 1.2 - BASE_SPEED * 0.5);

    text.drawText('SPD', x, y - 16, 10, '#888888', 'center');

    // Speed bar background
    renderer.fillRect(x - 16, y, 32, 8, '#111111');
    // Border
    renderer.drawLine(x - 16, y, x + 16, y, '#444444', 1);
    renderer.drawLine(x + 16, y, x + 16, y + 8, '#444444', 1);
    renderer.drawLine(x + 16, y + 8, x - 16, y + 8, '#444444', 1);
    renderer.drawLine(x - 16, y + 8, x - 16, y, '#444444', 1);

    const barColor = speedBoostTimer > 0 ? THEME : (speedPct > 0.7 ? '#ff4444' : '#4488ff');
    const sw = Math.max(0, speedPct * 28);
    renderer.setGlow(barColor, 0.3);
    renderer.fillRect(x - 14, y + 2, sw, 4, barColor);
    renderer.setGlow(null);

    // KMH text
    const kmh = Math.floor(speed * 20);
    text.drawText(String(kmh), x, y + 12, 11, barColor, 'center');
    text.drawText('km/h', x, y + 24, 8, '#666666', 'center');
  }

  function drawStageHUD(renderer, text) {
    const x = W / 2;
    const y = 6;

    renderer.setGlow(THEME, 0.4);
    text.drawText(`STAGE ${stage}`, x, y, 12, THEME, 'center');
    renderer.setGlow(null);

    // Progress bar
    const barW = 80;
    const barH = 4;
    const bx = x - barW / 2;
    const by = y + 16;
    renderer.fillRect(bx, by, barW, barH, '#222222');
    renderer.fillRect(bx, by, barW * (stageProgress / STAGE_LENGTH), barH, THEME);
  }

  game.start();
  return game;
}
