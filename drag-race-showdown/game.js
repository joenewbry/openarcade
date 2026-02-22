// drag-race-showdown/game.js — WebGL 2 engine port

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// ── Constants ──
const QUARTER_MILE = 402.336;
const MAX_GEARS = 5;
const OPTIMAL_RPM_MIN = 5500;
const OPTIMAL_RPM_MAX = 7000;
const REDLINE_RPM = 8500;
const IDLE_RPM = 1000;
const MAX_RPM = 9000;
const NITRO_DURATION = 1.5;
const NITRO_BOOST = 1.5;

const GEAR_RATIOS = [3.8, 2.5, 1.7, 1.2, 0.9];
const GEAR_MAX_SPEEDS = [18, 35, 55, 75, 95];

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const roundEl = document.getElementById('round');
const winsEl = document.getElementById('wins');
const nitrosEl = document.getElementById('nitros');

// ── Game state ──
let gameState = 'idle';
let score = 0;
let round = 1;
let wins = 0;
let bestTime = null;
let player, ai;
let trafficState = 0;
let trafficTimer = 0;
let raceStartTime = 0;
let raceTime = 0;
let countdownStarted = false;
let raceFinished = false;
let winner = '';
let particles = [];
let shakeX = 0, shakeY = 0;
let shakeTimer = 0;
let cityBuildings = [];

// Pending click flag for canvas click handling
let pendingClick = false;

// ── City generation ──
function generateCity() {
  cityBuildings = [];
  for (let i = 0; i < 15; i++) {
    let bx = i * 45 + 10;
    let bh = 30 + Math.sin(i * 2.7) * 25 + Math.cos(i * 1.3) * 15;
    let bw = 20 + Math.sin(i * 1.5) * 10;
    let windows = [];
    for (let wy = -bh + 5; wy < -5; wy += 8) {
      for (let wx = 3; wx < bw - 3; wx += 6) {
        if (Math.random() > 0.4) windows.push({ x: wx, y: wy });
      }
    }
    cityBuildings.push({ x: bx, h: bh, w: bw, windows });
  }
}

function createRacer(isAI) {
  return {
    x: 60,
    distance: 0,
    speed: 0,
    rpm: IDLE_RPM,
    gear: 1,
    launched: false,
    launchTime: 0,
    reactionTime: 0,
    finishTime: null,
    nitrosLeft: 3,
    nitroActive: false,
    nitroTimer: 0,
    falseStart: false,
    bogDown: 0,
    isAI: isAI,
    wheelAngle: 0,
    exhaustTimer: 0,
    aiReactionBase: 0.3,
    aiShiftAccuracy: 0.85,
    aiNitroUsed: 0
  };
}

function init() {
  player = createRacer(false);
  ai = createRacer(true);
  ai.aiReactionBase = Math.max(0.15, 0.4 - round * 0.03);
  ai.aiShiftAccuracy = Math.min(0.98, 0.75 + round * 0.03);
  player.nitrosLeft = 3;
  trafficState = 0;
  trafficTimer = 0;
  countdownStarted = false;
  raceFinished = false;
  winner = '';
  particles = [];
  shakeTimer = 0;
  raceTime = 0;
  nitrosEl.textContent = player.nitrosLeft;
  if (cityBuildings.length === 0) generateCity();
}

function startCountdown() {
  countdownStarted = true;
  trafficState = 0;
  trafficTimer = 0;
  gameState = 'countdown';
}

function updateTrafficLight(dt) {
  if (!countdownStarted) return;
  trafficTimer += dt / 1000; // dt is ms from engine
  if (trafficTimer < 0.8) trafficState = 1;
  else if (trafficTimer < 1.6) trafficState = 2;
  else if (trafficTimer < 2.4) trafficState = 3;
  else if (trafficTimer < 3.0) trafficState = 4;
  else {
    if (trafficState !== 5) {
      trafficState = 5;
      raceStartTime = performance.now() / 1000;
      gameState = 'racing';
    }
  }
}

function launchRacer(racer) {
  if (racer.launched) return;
  if (trafficState < 5) {
    racer.falseStart = true;
    racer.launched = true;
    return;
  }
  racer.launched = true;
  racer.launchTime = performance.now() / 1000;
  racer.reactionTime = racer.launchTime - raceStartTime;
  racer.rpm = 3000;
}

function shiftGear(racer) {
  if (!racer.launched || racer.falseStart) return;
  if (racer.gear >= MAX_GEARS) return;
  if (racer.finishTime !== null) return;

  if (racer.rpm < OPTIMAL_RPM_MIN) {
    racer.bogDown = 0.5;
    racer.rpm = Math.max(2000, racer.rpm - 1500);
  }

  racer.gear++;
  let rpmDrop = racer.rpm * (GEAR_RATIOS[racer.gear - 1] / GEAR_RATIOS[racer.gear - 2]) * 0.45;
  racer.rpm = Math.max(2000, racer.rpm - rpmDrop);
}

function activateNitro(racer) {
  if (!racer.launched || racer.falseStart) return;
  if (racer.nitrosLeft <= 0 || racer.nitroActive) return;
  if (racer.finishTime !== null) return;
  racer.nitroActive = true;
  racer.nitroTimer = NITRO_DURATION;
  racer.nitrosLeft--;
  shakeTimer = 0.3;
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: getCarX(racer),
      y: racer === player ? 245 : 165,
      vx: -Math.random() * 80 - 40,
      vy: (Math.random() - 0.5) * 30,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      color: '#00aaff',
      size: 3 + Math.random() * 4
    });
  }
}

function getCarX(racer) {
  let progress = Math.min(1, racer.distance / QUARTER_MILE);
  return 60 + progress * 420;
}

function updateRacer(racer, dt) {
  if (!racer.launched || racer.falseStart) return;
  if (racer.finishTime !== null) return;

  if (racer.bogDown > 0) {
    racer.bogDown -= dt;
    racer.rpm += 500 * dt;
    racer.speed *= 0.98;
  } else {
    let rpmGain = 3500 / GEAR_RATIOS[racer.gear - 1];
    rpmGain *= Math.max(0.3, 1 - (racer.rpm / MAX_RPM) * 0.5);
    racer.rpm += rpmGain * dt;
  }

  if (racer.rpm > REDLINE_RPM) {
    racer.rpm = REDLINE_RPM;
    racer.speed *= (1 - 0.3 * dt);
  }

  let powerFraction = 0;
  if (racer.rpm >= OPTIMAL_RPM_MIN && racer.rpm <= OPTIMAL_RPM_MAX) {
    powerFraction = 1.0;
  } else if (racer.rpm < OPTIMAL_RPM_MIN) {
    powerFraction = 0.4 + 0.6 * ((racer.rpm - IDLE_RPM) / (OPTIMAL_RPM_MIN - IDLE_RPM));
  } else {
    powerFraction = 1.0 - 0.4 * ((racer.rpm - OPTIMAL_RPM_MAX) / (REDLINE_RPM - OPTIMAL_RPM_MAX));
  }
  powerFraction = Math.max(0, Math.min(1, powerFraction));

  let nitroMult = 1;
  if (racer.nitroActive) {
    racer.nitroTimer -= dt;
    nitroMult = NITRO_BOOST;
    if (racer.nitroTimer <= 0) racer.nitroActive = false;
  }

  let maxSpeedForGear = GEAR_MAX_SPEEDS[racer.gear - 1];
  let torque = (5 + racer.gear * 2) * GEAR_RATIOS[racer.gear - 1];
  let acceleration = torque * powerFraction * nitroMult;

  if (racer.speed < maxSpeedForGear) {
    racer.speed += acceleration * dt;
  } else {
    racer.speed = Math.min(racer.speed, maxSpeedForGear * 1.05);
  }

  racer.speed -= racer.speed * racer.speed * 0.00005 * dt;
  racer.speed = Math.max(0, racer.speed);
  racer.distance += racer.speed * dt;
  racer.wheelAngle += racer.speed * dt * 8;

  racer.exhaustTimer -= dt;
  if (racer.exhaustTimer <= 0 && racer.speed > 5) {
    racer.exhaustTimer = 0.05;
    let cy = racer === player ? 245 : 165;
    particles.push({
      x: getCarX(racer) - 20,
      y: cy + 5,
      vx: -Math.random() * 30 - 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      color: racer.nitroActive ? '#00aaff' : '#555555',
      size: 2 + Math.random() * 3
    });
  }

  if (racer.distance >= QUARTER_MILE) {
    racer.finishTime = raceTime;
    let cy = racer === player ? 245 : 165;
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: 480,
        y: cy + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 100,
        vy: -Math.random() * 60 - 20,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        color: racer === player ? '#ff0066' : '#00aaff',
        size: 2 + Math.random() * 4
      });
    }
  }
}

function updateAI(dt) {
  if (ai.finishTime !== null) return;

  if (!ai.launched && trafficState === 5) {
    let elapsed = performance.now() / 1000 - raceStartTime;
    let reaction = ai.aiReactionBase + Math.random() * 0.08;
    if (elapsed >= reaction) launchRacer(ai);
  }

  if (ai.launched && !ai.falseStart && ai.gear < MAX_GEARS) {
    let shiftPoint = OPTIMAL_RPM_MIN + (OPTIMAL_RPM_MAX - OPTIMAL_RPM_MIN) * ai.aiShiftAccuracy;
    shiftPoint += (Math.random() - 0.5) * 800;
    if (ai.rpm >= shiftPoint) shiftGear(ai);
  }

  if (ai.launched && !ai.falseStart && !ai.nitroActive && ai.nitrosLeft > 0) {
    if (ai.gear >= 3 && ai.aiNitroUsed < 2 && Math.random() < 0.005) {
      activateNitro(ai);
      ai.aiNitroUsed++;
    }
    if (ai.distance < player.distance - 20 && ai.gear >= 2 && Math.random() < 0.01) {
      activateNitro(ai);
      ai.aiNitroUsed++;
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function update(dt, game) {
  // dt from engine is ms, convert to seconds
  const dtS = dt / 1000;

  if (gameState === 'countdown') updateTrafficLight(dt);

  if (gameState === 'racing') {
    raceTime += dtS;
    updateRacer(player, dtS);
    updateRacer(ai, dtS);
    updateAI(dtS);

    if (!raceFinished) {
      if (player.finishTime !== null && ai.finishTime === null && !ai.falseStart) {
        if (raceTime - player.finishTime > 3) endRace(game);
      }
      if (ai.finishTime !== null && player.finishTime === null && !player.falseStart) {
        if (raceTime - ai.finishTime > 3) endRace(game);
      }
      if ((player.finishTime !== null || player.falseStart) &&
          (ai.finishTime !== null || ai.falseStart)) {
        endRace(game);
      }
    }
  }

  if (shakeTimer > 0) shakeTimer -= dtS;
  updateParticles(dtS);
}

function endRace(game) {
  if (raceFinished) return;
  raceFinished = true;
  gameState = 'results';

  if (player.falseStart && ai.falseStart) {
    winner = 'DOUBLE FALSE START!';
  } else if (player.falseStart) {
    winner = 'FALSE START - DQ!';
  } else if (ai.falseStart) {
    winner = 'AI FALSE START - YOU WIN!';
    wins++;
  } else if (player.finishTime !== null && ai.finishTime !== null) {
    if (player.finishTime < ai.finishTime) { winner = 'YOU WIN!'; wins++; }
    else if (ai.finishTime < player.finishTime) winner = 'AI WINS!';
    else { winner = 'DEAD HEAT!'; wins++; }
  } else if (player.finishTime !== null) {
    winner = 'YOU WIN!'; wins++;
  } else {
    winner = 'AI WINS!';
  }

  if (player.finishTime !== null && !player.falseStart) {
    let t = player.finishTime;
    if (bestTime === null || t < bestTime) {
      bestTime = t;
      score = t;
      scoreEl.textContent = t.toFixed(3) + 's';
    }
  }
  winsEl.textContent = wins;

  let lines = [];
  if (player.finishTime !== null && !player.falseStart) {
    lines.push('Your time: ' + player.finishTime.toFixed(3) + 's (RT: ' + player.reactionTime.toFixed(3) + 's)');
  }
  if (ai.finishTime !== null && !ai.falseStart) {
    lines.push('AI time: ' + ai.finishTime.toFixed(3) + 's (RT: ' + ai.reactionTime.toFixed(3) + 's)');
  }
  if (player.finishTime !== null && ai.finishTime !== null && !player.falseStart && !ai.falseStart) {
    let diff = Math.abs(player.finishTime - ai.finishTime);
    lines.push('Margin: ' + diff.toFixed(3) + 's');
  }
  lines.push('');
  lines.push('Click for next round');

  game.setState('over');
  game.showOverlay(winner, lines.join('\n'));
}

// ── Drawing helpers ──

function drawTrack(renderer) {
  // Sky gradient — approximate with two rects
  renderer.fillRect(0, 0, W, 100, '#0a0a1e');
  renderer.fillRect(0, 100, W, 100, '#141432');

  // City silhouette
  for (let b of cityBuildings) {
    renderer.fillRect(b.x, 200 - b.h, b.w, b.h, '#111128');
    for (let win of b.windows) {
      renderer.fillRect(b.x + win.x, 200 + win.y, 3, 4, '#f06240'); // '#f062' approx
    }
  }

  // Stars (deterministic with LCG)
  let seed = 42;
  for (let i = 0; i < 30; i++) {
    seed = (seed * 16807) % 2147483647;
    let sx = (seed % W);
    seed = (seed * 16807) % 2147483647;
    let sy = (seed % 130);
    renderer.fillRect(sx, sy, 1, 1, '#ffffff33');
  }

  // Ground
  renderer.fillRect(0, 200, W, 200, '#222240');

  // Lanes
  renderer.fillRect(0, 210, W, 60, '#2a2a48');
  renderer.fillRect(0, 135, W, 60, '#282846');

  // Lane center dashed divider (solid simulation: draw small dashes)
  // Horizontal dashed line at y=200 (pink/red)
  for (let x = 0; x < W; x += 25) {
    renderer.fillRect(x, 199, 15, 2, '#ff006688');
  }

  // Lane border lines (subtle, dashed simulation)
  for (let x = 0; x < W; x += 16) {
    renderer.fillRect(x, 134, 8, 1, '#ff006650');
    renderer.fillRect(x, 194, 8, 1, '#ff006650');
    renderer.fillRect(x, 269, 8, 1, '#ff006650');
  }

  // Start line (checkerboard)
  for (let y = 135; y < 270; y += 8) {
    renderer.fillRect(58, y, 4, 4, '#ffffff');
    renderer.fillRect(62, y + 4, 4, 4, '#ffffff');
  }

  // Finish line (faint checkerboard)
  let fx = 480;
  for (let y = 135; y < 270; y += 8) {
    renderer.fillRect(fx, y, 4, 4, '#ffffff44');
    renderer.fillRect(fx + 4, y + 4, 4, 4, '#ffffff44');
  }
}

function drawDistanceMarkers(renderer, text) {
  for (let i = 1; i <= 3; i++) {
    let mx = 60 + (420 * i / 4);
    // Dashed vertical line
    for (let y = 135; y < 270; y += 8) {
      renderer.fillRect(mx, y, 1, 3, '#33333388');
    }
    text.drawText(Math.round(QUARTER_MILE * i / 4) + 'm', mx, 277, 9, '#44448888', 'center');
  }
}

// Draw a rounded rectangle as a filled polygon approximation (use fillRect + corner fills)
// For simplicity we just use a plain fillRect for panels.
function drawPanel(renderer, x, y, w, h, fillColor, strokeColor) {
  renderer.fillRect(x, y, w, h, fillColor);
  // Border: top, bottom, left, right
  renderer.fillRect(x, y, w, 1, strokeColor);
  renderer.fillRect(x, y + h - 1, w, 1, strokeColor);
  renderer.fillRect(x, y, 1, h, strokeColor);
  renderer.fillRect(x + w - 1, y, 1, h, strokeColor);
}

function drawCar(renderer, racer, laneY, color1, color2) {
  let cx = getCarX(racer);
  let cy = laneY;

  const bodyLen = 44;
  const bodyH = 16;

  // Apply shake offset if active (shake is applied globally via offset params)
  let sx = shakeTimer > 0 ? shakeX : 0;
  let sy = shakeTimer > 0 ? shakeY : 0;

  // Shadow
  renderer.fillCircle(cx + sx, cy + bodyH / 2 + 3 + sy, 22, '#00000050');

  // Main body — polygon
  renderer.fillPoly([
    { x: cx - bodyLen / 2 + sx,       y: cy + bodyH / 2 + sy },
    { x: cx - bodyLen / 2 + sx,       y: cy - bodyH / 4 + sy },
    { x: cx - bodyLen / 4 + sx,       y: cy - bodyH / 2 + sy },
    { x: cx + bodyLen / 6 + sx,       y: cy - bodyH / 2 + sy },
    { x: cx + bodyLen / 3 + sx,       y: cy - bodyH / 4 + sy },
    { x: cx + bodyLen / 2 + sx,       y: cy - bodyH / 4 + sy },
    { x: cx + bodyLen / 2 + 3 + sx,   y: cy + sy },
    { x: cx + bodyLen / 2 + sx,       y: cy + bodyH / 2 + sy },
  ], color1);

  // Windshield
  renderer.fillPoly([
    { x: cx - bodyLen / 4 + 2 + sx, y: cy - bodyH / 2 + 2 + sy },
    { x: cx + bodyLen / 6 - 2 + sx, y: cy - bodyH / 2 + 2 + sy },
    { x: cx + bodyLen / 4 + sx,     y: cy - bodyH / 4 + sy },
    { x: cx - bodyLen / 5 + sx,     y: cy - bodyH / 4 + sy },
  ], '#2a4a6a');

  // Racing stripe
  renderer.fillRect(cx - bodyLen / 2 + sx, cy - 1 + sy, bodyLen, 3, color2);

  // Spoiler
  renderer.fillRect(cx - bodyLen / 2 - 2 + sx, cy - bodyH / 2 - 3 + sy, 8, 3, color1);
  renderer.fillRect(cx - bodyLen / 2 - 2 + sx, cy - bodyH / 2 + sy, 2, 5, color1);

  // Wheels
  let wheelR = 5;
  let wPos = [cx + bodyLen / 3 + sx, cx - bodyLen / 4 + sx];
  for (let wx of wPos) {
    renderer.fillCircle(wx, cy + bodyH / 2 + sy, wheelR, '#111111');
  }

  // Wheel spokes
  for (let wx of wPos) {
    for (let a = 0; a < 4; a++) {
      let angle = racer.wheelAngle + a * Math.PI / 2;
      renderer.drawLine(
        wx, cy + bodyH / 2 + sy,
        wx + Math.cos(angle) * 3.5, cy + bodyH / 2 + Math.sin(angle) * 3.5 + sy,
        '#555555', 1
      );
    }
  }

  // Wheel rims
  for (let wx of wPos) {
    renderer.strokePoly(
      [
        { x: wx + 2, y: cy + bodyH / 2 + sy },
        { x: wx,     y: cy + bodyH / 2 - 2 + sy },
        { x: wx - 2, y: cy + bodyH / 2 + sy },
        { x: wx,     y: cy + bodyH / 2 + 2 + sy },
      ],
      '#888888', 0.5, true
    );
  }

  // Headlights
  renderer.fillRect(cx + bodyLen / 2 + sx, cy - bodyH / 4 + 2 + sy, 3, 4, '#ffff88');
  if (racer.launched && racer.speed > 1) {
    renderer.fillPoly([
      { x: cx + bodyLen / 2 + 3 + sx, y: cy - bodyH / 4 + sy },
      { x: cx + bodyLen / 2 + 50 + sx, y: cy - bodyH + sy },
      { x: cx + bodyLen / 2 + 50 + sx, y: cy + bodyH / 2 + sy },
      { x: cx + bodyLen / 2 + 3 + sx, y: cy + bodyH / 4 - 2 + sy },
    ], '#ffff8815');
  }

  // Tail light
  renderer.fillRect(cx - bodyLen / 2 - 1 + sx, cy - bodyH / 4 + 1 + sy, 2, 5, '#ff0000');

  // Nitro flame
  if (racer.nitroActive) {
    let flameLen = 18 + Math.random() * 12;
    renderer.setGlow('#00eeff', 0.8);
    // Outer flame (blue gradient approximated by two triangles)
    renderer.fillPoly([
      { x: cx - bodyLen / 2 + sx,             y: cy - 4 + sy },
      { x: cx - bodyLen / 2 - flameLen + sx,  y: cy + 2 + sy },
      { x: cx - bodyLen / 2 + sx,             y: cy + 8 + sy },
    ], '#0066ff');
    renderer.fillPoly([
      { x: cx - bodyLen / 2 + sx,                     y: cy - 4 + sy },
      { x: cx - bodyLen / 2 - flameLen * 0.5 + sx,   y: cy + 2 + sy },
      { x: cx - bodyLen / 2 + sx,                     y: cy + 8 + sy },
    ], '#00eeff');
    // Inner flame (bright center)
    renderer.fillPoly([
      { x: cx - bodyLen / 2 + sx,                      y: cy - 1 + sy },
      { x: cx - bodyLen / 2 - flameLen * 0.6 + sx,    y: cy + 2 + sy },
      { x: cx - bodyLen / 2 + sx,                      y: cy + 5 + sy },
    ], '#ffffff88');
    renderer.setGlow(null);
  }

  // Tire smoke on launch
  if (racer.launched && racer.speed < 12 && racer.speed > 0 && !racer.falseStart) {
    for (let i = 0; i < 4; i++) {
      let smx = cx - bodyLen / 4 - 5 - Math.random() * 20 + sx;
      let smy = cy + bodyH / 2 + Math.random() * 5 + sy;
      renderer.fillCircle(smx, smy, 3 + Math.random() * 6, '#c8c8c840');
    }
  }
}

function drawTrafficLight(renderer) {
  let lx = 15, ly = 8;
  let lw = 32, lh = 100;

  // Housing
  drawPanel(renderer, lx, ly, lw, lh, '#1a1a1a', '#444444');

  // Pole
  renderer.fillRect(lx + lw / 2 - 2, ly + lh, 4, 25, '#333333');

  const lightDefs = [
    { y: ly + 10, active: trafficState >= 1, color: '#ff0000', glowColor: '#ff0000' },
    { y: ly + 28, active: trafficState >= 2, color: '#ff0000', glowColor: '#ff0000' },
    { y: ly + 46, active: trafficState >= 3, color: '#ff0000', glowColor: '#ff0000' },
    { y: ly + 64, active: trafficState === 4, color: '#ffff00', glowColor: '#ffff00' },
    { y: ly + 82, active: trafficState === 5, color: '#00ff00', glowColor: '#00ff00' },
  ];

  for (let light of lightDefs) {
    // Outer ring (dark)
    renderer.fillCircle(lx + lw / 2, light.y, 9, '#111111');
    // Inner light
    let lightColor = light.active ? light.color : '#222222';
    if (light.active) {
      renderer.setGlow(light.glowColor, 0.9);
    }
    renderer.fillCircle(lx + lw / 2, light.y, 7, lightColor);
    if (light.active) {
      renderer.setGlow(null);
    }
  }
}

function drawTachometer(renderer, text, racer, x, y, label) {
  let w = 130, h = 55;

  // Background panel
  drawPanel(renderer, x, y, w, h, '#000000b3', '#ff006350');

  // Label
  text.drawText(label, x + 4, y + 2, 9, '#888888', 'left');

  // RPM bar background
  let barX = x + 5, barY = y + 16, barW = w - 10, barH = 14;
  renderer.fillRect(barX, barY, barW, barH, '#1a1a1a');

  // Optimal zone marker (green tint)
  let optMinFrac = (OPTIMAL_RPM_MIN - IDLE_RPM) / (MAX_RPM - IDLE_RPM);
  let optMaxFrac = (OPTIMAL_RPM_MAX - IDLE_RPM) / (MAX_RPM - IDLE_RPM);
  renderer.fillRect(barX + barW * optMinFrac, barY, barW * (optMaxFrac - optMinFrac), barH, '#00ff0022');

  // Redline zone marker (red tint)
  let redFrac = (REDLINE_RPM - IDLE_RPM) / (MAX_RPM - IDLE_RPM);
  renderer.fillRect(barX + barW * redFrac, barY, barW * (1 - redFrac), barH, '#ff000022');

  // RPM fill
  let rpmFrac = Math.max(0, (racer.rpm - IDLE_RPM) / (MAX_RPM - IDLE_RPM));
  let barColor;
  if (racer.rpm >= OPTIMAL_RPM_MIN && racer.rpm <= OPTIMAL_RPM_MAX) {
    barColor = '#00ff00';
  } else if (racer.rpm > OPTIMAL_RPM_MAX) {
    barColor = racer.rpm > REDLINE_RPM - 500 ? '#ff0000' : '#ffaa00';
  } else {
    barColor = '#ffff00';
  }
  renderer.fillRect(barX, barY, barW * rpmFrac, barH, barColor);

  // RPM text (right-aligned in bar area)
  text.drawText(Math.round(racer.rpm).toString(), x + w - 5, y + 16, 10, barColor, 'right');

  // Gear indicator
  text.drawText('G' + racer.gear, x + 5, y + 37, 16, '#ff0066', 'left');

  // Speed MPH
  let mph = racer.speed * 2.237;
  text.drawText(Math.round(mph) + ' MPH', x + w / 2 + 5, y + 39, 12, '#ffffff', 'center');

  // Nitro indicator
  if (racer.nitroActive) {
    // Blink using frame time
    let blink = Math.sin(performance.now() / 80) > 0;
    if (blink) {
      renderer.setGlow('#00eeff', 0.7);
      text.drawText('NOS!', x + w - 4, y + 39, 10, '#00eeff', 'right');
      renderer.setGlow(null);
    }
  } else {
    let dots = '';
    for (let i = 0; i < racer.nitrosLeft; i++) dots += '\u25CF';
    for (let i = racer.nitrosLeft; i < 3; i++) dots += '\u25CB';
    text.drawText(dots, x + w - 4, y + 39, 10, '#555555', 'right');
  }
}

function drawProgressBar(renderer, text) {
  let x = 70, y = 295, w = 450, h = 18;

  drawPanel(renderer, x, y, w, h, '#00000099', '#ff006350');

  // Player progress
  let pProg = Math.min(1, player.distance / QUARTER_MILE);
  renderer.fillRect(x + 2, y + 2, (w - 4) * pProg, 6, '#ff0066');

  // AI progress
  let aProg = Math.min(1, ai.distance / QUARTER_MILE);
  renderer.fillRect(x + 2, y + 10, (w - 4) * aProg, 6, '#00aaff');

  // Labels
  text.drawText('YOU', x - 3, y + 1, 8, '#ff0066', 'right');
  text.drawText('AI',  x - 3, y + 9, 8, '#00aaff', 'right');

  // Progress distance text
  text.drawText(
    Math.round(player.distance) + 'm / ' + Math.round(QUARTER_MILE) + 'm',
    x + w / 2, y + h + 2, 8, '#666666', 'center'
  );
}

function drawHUD(renderer, text) {
  drawTachometer(renderer, text, player, 55, 330, 'PLAYER');
  drawTachometer(renderer, text, ai, 415, 330, 'AI');

  // Race time
  if (gameState === 'racing' || gameState === 'results') {
    text.drawText(raceTime.toFixed(3) + 's', W / 2, 349, 16, '#ffffff', 'center');
  }

  // Reaction times
  if (player.launched && !player.falseStart && player.reactionTime > 0) {
    text.drawText('RT: ' + player.reactionTime.toFixed(3) + 's', 190, 342, 10, '#ff0066', 'left');
  }
  if (ai.launched && !ai.falseStart && ai.reactionTime > 0) {
    text.drawText('RT: ' + ai.reactionTime.toFixed(3) + 's', 410, 342, 10, '#00aaff', 'right');
  }

  // False start warning
  if (player.falseStart) {
    renderer.setGlow('#ff0000', 0.9);
    text.drawText('FALSE START - DQ!', W / 2, 248, 22, '#ff0000', 'center');
    renderer.setGlow(null);
  }

  // Shift prompt / redline warning
  if (player.launched && !player.falseStart && player.finishTime === null && player.bogDown <= 0) {
    if (player.rpm >= OPTIMAL_RPM_MIN && player.rpm <= OPTIMAL_RPM_MAX && player.gear < MAX_GEARS) {
      let alpha = Math.round(128 + 127 * Math.sin(performance.now() / 100));
      let alphaHex = alpha.toString(16).padStart(2, '0');
      renderer.setGlow('#00ff00', 0.5);
      text.drawText('\u25B2 SHIFT UP!', W / 2, 308, 13, '#00ff00' + alphaHex, 'center');
      renderer.setGlow(null);
    }
    if (player.rpm > REDLINE_RPM - 800 && player.gear < MAX_GEARS) {
      let alpha = Math.round(128 + 127 * Math.sin(performance.now() / 60));
      let alphaHex = alpha.toString(16).padStart(2, '0');
      renderer.setGlow('#ff0000', 0.8);
      text.drawText('!!! REDLINE !!!', W / 2, 308, 15, '#ff0000' + alphaHex, 'center');
      renderer.setGlow(null);
    }
  }

  // Countdown hints
  if (gameState === 'countdown' && trafficState < 5) {
    text.drawText('SPACE = Launch at GREEN  |  UP = Shift  |  N = Nitro', W / 2, 385, 10, '#555555', 'center');
  }

  // Round indicator
  text.drawText('RD ' + round, W - 10, 385, 9, '#444444', 'right');

  drawProgressBar(renderer, text);
}

function drawParticles(renderer) {
  for (let p of particles) {
    let alpha = Math.max(0, p.life / p.maxLife);
    let alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    renderer.fillCircle(p.x, p.y, p.size * (0.5 + alpha * 0.5), p.color + alphaHex);
  }
}

function drawWinner(renderer, text) {
  if (raceFinished && gameState === 'results') {
    let col = winner.includes('YOU WIN') ? '#00ff00' :
              winner.includes('FALSE') ? '#ff0000' : '#ffaa00';
    renderer.setGlow(col, 0.9);
    text.drawText(winner, W / 2, 118, 26, col, 'center');
    renderer.setGlow(null);

    let ty = 148;
    if (player.finishTime !== null && !player.falseStart) {
      text.drawText('You: ' + player.finishTime.toFixed(3) + 's', W / 2, ty, 12, '#ff0066', 'center');
      ty += 16;
    }
    if (ai.finishTime !== null && !ai.falseStart) {
      text.drawText('AI: ' + ai.finishTime.toFixed(3) + 's', W / 2, ty, 12, '#00aaff', 'center');
    }
  }
}

// ── Input action handlers ──
function handleStart(game) {
  if (gameState === 'idle') {
    game.hideOverlay();
    init();
    startCountdown();
    game.setState('playing');
  } else if (gameState === 'results') {
    game.hideOverlay();
    round++;
    roundEl.textContent = round;
    init();
    startCountdown();
    game.setState('playing');
  }
}

// ── createGame entry point ──
export function createGame() {
  const game = new Game('game');

  // Canvas click for start/next-round
  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('click', () => {
    pendingClick = true;
  });
  const overlayEl = document.getElementById('overlay');
  if (overlayEl) {
    overlayEl.addEventListener('click', () => {
      pendingClick = true;
    });
  }

  game.setScoreFn(() => score);

  game.onInit = () => {
    init();
    game.showOverlay('DRAG RACE SHOWDOWN',
      'SPACE to launch at green light\nUP to shift gear | N for nitro\nClick to Start');
    game.setState('waiting');
  };

  game.onUpdate = (dt) => {
    // Handle canvas click (start/next-round)
    if (pendingClick) {
      pendingClick = false;
      handleStart(game);
    }

    // Keyboard input
    if (gameState === 'countdown' || gameState === 'racing') {
      if (game.input.wasPressed(' ')) {
        launchRacer(player);
      }
      if (game.input.wasPressed('ArrowUp')) {
        shiftGear(player);
      }
      if (game.input.wasPressed('n') || game.input.wasPressed('N')) {
        activateNitro(player);
        nitrosEl.textContent = player.nitrosLeft;
      }
    }

    // Compute shake offset each frame when active
    if (shakeTimer > 0) {
      let intensity = shakeTimer * 15;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    } else {
      shakeX = 0;
      shakeY = 0;
    }

    update(dt, game);
  };

  game.onDraw = (renderer, text) => {
    drawTrack(renderer);
    drawTrafficLight(renderer);
    drawParticles(renderer);

    // AI on top lane (laneY=165), player on bottom lane (laneY=240)
    drawCar(renderer, ai, 165, '#00aaff', '#006688');
    drawCar(renderer, player, 240, '#ff0066', '#aa0044');

    drawHUD(renderer, text);
    drawDistanceMarkers(renderer, text);
    drawWinner(renderer, text);
  };

  game.start();
  return game;
}
