// slot-racer/game.js — Slot Racer game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// ── Track Definition ──
const TRACK_LAYOUTS = [
  // Layout 0: Classic oval
  [
    { type: 'straight', length: 140, angle: 0 },
    { type: 'curve', radius: 80, sweep: Math.PI, dir: 1 },
    { type: 'straight', length: 140, angle: Math.PI },
    { type: 'curve', radius: 80, sweep: Math.PI, dir: 1 },
  ],
  // Layout 1: Figure-8 inspired
  [
    { type: 'straight', length: 80, angle: 0 },
    { type: 'curve', radius: 60, sweep: Math.PI * 0.75, dir: 1 },
    { type: 'straight', length: 60, angle: 0 },
    { type: 'curve', radius: 60, sweep: Math.PI * 0.75, dir: -1 },
    { type: 'straight', length: 80, angle: 0 },
    { type: 'curve', radius: 60, sweep: Math.PI * 0.75, dir: 1 },
    { type: 'straight', length: 60, angle: 0 },
    { type: 'curve', radius: 60, sweep: Math.PI * 0.75, dir: -1 },
  ],
  // Layout 2: Tight technical circuit
  [
    { type: 'straight', length: 120, angle: 0 },
    { type: 'curve', radius: 45, sweep: Math.PI * 0.5, dir: 1 },
    { type: 'straight', length: 60, angle: 0 },
    { type: 'curve', radius: 70, sweep: Math.PI * 0.5, dir: 1 },
    { type: 'straight', length: 120, angle: 0 },
    { type: 'curve', radius: 45, sweep: Math.PI * 0.5, dir: 1 },
    { type: 'straight', length: 60, angle: 0 },
    { type: 'curve', radius: 70, sweep: Math.PI * 0.5, dir: 1 },
  ],
];

// ── Track baking ──
const STEP = 2; // pixels between sample points

function bakeTrack(layout) {
  const rawPoints = [];
  let cx = 0, cy = 0, heading = 0;

  for (const seg of layout) {
    if (seg.type === 'straight') {
      const len = seg.length;
      const steps = Math.ceil(len / STEP);
      const dx = Math.cos(heading) * STEP;
      const dy = Math.sin(heading) * STEP;
      for (let i = 0; i < steps; i++) {
        rawPoints.push({ x: cx, y: cy, angle: heading, curvature: 0 });
        cx += dx;
        cy += dy;
      }
    } else if (seg.type === 'curve') {
      const { radius, sweep, dir } = seg;
      const arcLen = radius * sweep;
      const steps = Math.ceil(arcLen / STEP);
      const dAngle = (sweep / steps) * dir;
      const curvature = 1 / radius;
      for (let i = 0; i < steps; i++) {
        rawPoints.push({ x: cx, y: cy, angle: heading, curvature });
        heading += dAngle;
        cx += Math.cos(heading) * STEP;
        cy += Math.sin(heading) * STEP;
      }
    }
  }

  // Center the track in the canvas
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of rawPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const offsetX = (W - (minX + maxX)) / 2;
  const offsetY = (H - (minY + maxY)) / 2;
  for (const p of rawPoints) {
    p.x += offsetX;
    p.y += offsetY;
  }

  return rawPoints;
}

function shortAngleDist(a, b) {
  let d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return d;
}

// ── Constants ──
const TRACK_WIDTH = 28;
const LANE_OFFSET = 7;
const BASE_MAX_SPEED = 4.5;
const SPEED_LIMIT_CURVE_BASE = 2.2;

// ── Module State ──
let trackPoints = [];
let trackLength = 0;
let currentLayout = 0;

let player, cpu;
let accelerating = false;
let gameTime = 0;
let skidMarks = [];
let lapDisplay = '';
let lapDisplayTimer = 0;
let difficultyLevel = 0;
let score = 0;
let best = 0;
let frameCount = 0;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Track helpers ──
function loadTrack(idx) {
  currentLayout = idx % TRACK_LAYOUTS.length;
  trackPoints = bakeTrack(TRACK_LAYOUTS[currentLayout]);
  trackLength = trackPoints.length;
}

function getTrackPoint(dist) {
  const d = ((dist % trackLength) + trackLength) % trackLength;
  const i = Math.floor(d);
  const f = d - i;
  const p0 = trackPoints[i % trackLength];
  const p1 = trackPoints[(i + 1) % trackLength];
  return {
    x: p0.x + (p1.x - p0.x) * f,
    y: p0.y + (p1.y - p0.y) * f,
    angle: p0.angle + shortAngleDist(p0.angle, p1.angle) * f,
    curvature: p0.curvature + (p1.curvature - p0.curvature) * f,
  };
}

function getCurveSpeedLimit(curvature, difficulty) {
  if (curvature === 0) return 999;
  const baseLimit = SPEED_LIMIT_CURVE_BASE / (curvature * 50);
  const diffFactor = 1 + difficulty * 0.04;
  return baseLimit / diffFactor + 1.5;
}

// ── Car Class ──
class Car {
  constructor(lane, color, isPlayer) {
    this.lane = lane; // -1 = inner, +1 = outer
    this.color = color;
    this.isPlayer = isPlayer;
    this.dist = 0;
    this.speed = 0;
    this.maxSpeed = 5;
    this.accel = 0.08;
    this.decel = 0.06;
    this.brakeDecel = 0.12;
    this.laps = 0;
    this.lapStartFrame = 0;
    this.bestLap = Infinity;
    this.lastLapTime = 0;
    this.offTrack = false;
    this.offTrackTimer = 0;
    this.offTrackX = 0;
    this.offTrackY = 0;
    this.offTrackAngle = 0;
    this.offTrackVx = 0;
    this.offTrackVy = 0;
    this.trail = [];
    this.crossedStart = false;
  }

  reset(startDist) {
    this.dist = startDist;
    this.speed = 0;
    this.laps = 0;
    this.lapStartFrame = 0;
    this.bestLap = Infinity;
    this.lastLapTime = 0;
    this.offTrack = false;
    this.offTrackTimer = 0;
    this.trail = [];
    this.crossedStart = false;
  }

  getPosition() {
    if (this.offTrack) {
      return { x: this.offTrackX, y: this.offTrackY, angle: this.offTrackAngle };
    }
    const tp = getTrackPoint(this.dist);
    const nx = -Math.sin(tp.angle) * this.lane * LANE_OFFSET;
    const ny = Math.cos(tp.angle) * this.lane * LANE_OFFSET;
    return { x: tp.x + nx, y: tp.y + ny, angle: tp.angle };
  }
}

// ── Fly off ──
function flyOff(car) {
  const pos = car.getPosition();
  car.offTrack = true;
  car.offTrackTimer = 1.5;
  car.offTrackX = pos.x;
  car.offTrackY = pos.y;
  car.offTrackAngle = pos.angle;
  car.offTrackVx = Math.cos(pos.angle) * car.speed * 0.5;
  car.offTrackVy = Math.sin(pos.angle) * car.speed * 0.5;
  car.speed = 0;
}

// ── CPU AI ──
// dt = 1/60 per fixed tick
const DT = 1 / 60;

function updateCPU() {
  if (cpu.offTrack) {
    cpu.offTrackTimer -= DT;
    cpu.offTrackX += cpu.offTrackVx * DT * 60;
    cpu.offTrackY += cpu.offTrackVy * DT * 60;
    cpu.offTrackVx *= 0.96;
    cpu.offTrackVy *= 0.96;
    if (cpu.offTrackTimer <= 0) {
      cpu.offTrack = false;
      cpu.speed = 0.5;
    }
    return;
  }

  const tp = getTrackPoint(cpu.dist);
  const lookAhead = getTrackPoint(cpu.dist + 30);
  const maxCurv = Math.max(tp.curvature, lookAhead.curvature);
  const safeSpeed = getCurveSpeedLimit(maxCurv, difficultyLevel) * 0.88;

  const cpuMaxSpeed = BASE_MAX_SPEED + difficultyLevel * 0.08;
  const targetSpeed = Math.min(cpuMaxSpeed, safeSpeed);

  if (cpu.speed < targetSpeed) {
    cpu.speed += cpu.accel * 0.9 * DT * 60;
  } else {
    cpu.speed -= cpu.brakeDecel * DT * 60;
  }
  cpu.speed = Math.max(0.2, cpu.speed);

  // Tiny chance CPU makes a mistake on tight curves
  if (maxCurv > 0 && difficultyLevel > 2 && Math.random() < 0.0003) {
    cpu.speed += 1.5;
  }

  const speedLimit = getCurveSpeedLimit(tp.curvature, difficultyLevel);
  if (tp.curvature > 0 && cpu.speed > speedLimit * 1.1) {
    flyOff(cpu);
    return;
  }

  const prevDist = cpu.dist;
  cpu.dist += cpu.speed * DT * 60;

  // Lap detection
  if (cpu.dist >= trackLength && prevDist < trackLength) {
    cpu.dist -= trackLength;
    cpu.laps++;
  }

  // Trail
  const pos = cpu.getPosition();
  cpu.trail.push({ x: pos.x, y: pos.y, age: 0 });
  if (cpu.trail.length > 20) cpu.trail.shift();
}

// ── Export ──
export function createGame() {
  const game = new Game('game');

  // Mouse/touch input for accelerating
  const canvas = game.canvas;

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (game.state === 'waiting') {
      accelerating = true;
      game.setState('playing');
      player.lapStartFrame = frameCount;
      cpu.lapStartFrame = frameCount;
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing') {
      accelerating = true;
    }
  });

  canvas.addEventListener('mouseup', () => { accelerating = false; });
  canvas.addEventListener('mouseleave', () => { accelerating = false; });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.state === 'waiting') {
      accelerating = true;
      game.setState('playing');
      player.lapStartFrame = frameCount;
      cpu.lapStartFrame = frameCount;
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing') {
      accelerating = true;
    }
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    accelerating = false;
  });

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    accelerating = false;
    gameTime = 0;
    skidMarks = [];
    difficultyLevel = 0;
    lapDisplay = '';
    lapDisplayTimer = 0;
    frameCount = 0;

    loadTrack(0);

    player = new Car(-1, '#a6f', true);
    player.reset(0);
    cpu = new Car(1, '#f44', false);
    cpu.reset(Math.floor(trackLength * 0.05));

    game.showOverlay('SLOT RACER', 'Hold SPACE or Click to accelerate\nRelease to brake. Don\'t fly off curves!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        accelerating = true;
        game.setState('playing');
        player.lapStartFrame = frameCount;
        cpu.lapStartFrame = frameCount;
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
    gameTime += DT;

    // Space key for acceleration (supplements mouse/touch)
    if (input.wasPressed(' ')) {
      accelerating = true;
    }
    if (input.wasReleased(' ')) {
      accelerating = false;
    }

    // ── Update Player ──
    if (player.offTrack) {
      player.offTrackTimer -= DT;
      player.offTrackX += player.offTrackVx * DT * 60;
      player.offTrackY += player.offTrackVy * DT * 60;
      player.offTrackVx *= 0.96;
      player.offTrackVy *= 0.96;
      if (player.offTrackTimer <= 0) {
        player.offTrack = false;
        player.speed = 0.5;
      }
    } else {
      const maxSpd = BASE_MAX_SPEED + difficultyLevel * 0.06;
      if (accelerating) {
        player.speed += player.accel * DT * 60;
        if (player.speed > maxSpd) player.speed = maxSpd;
      } else {
        player.speed -= player.brakeDecel * DT * 60;
        if (player.speed < 0) player.speed = 0;
      }

      const tp = getTrackPoint(player.dist);

      // Check fly off
      const speedLimit = getCurveSpeedLimit(tp.curvature, difficultyLevel);
      if (tp.curvature > 0 && player.speed > speedLimit) {
        flyOff(player);
      } else {
        // Add skid marks when near speed limit on curves
        if (tp.curvature > 0 && player.speed > speedLimit * 0.75) {
          const pos = player.getPosition();
          const intensity = (player.speed - speedLimit * 0.75) / (speedLimit * 0.25);
          skidMarks.push({ x: pos.x, y: pos.y, age: 0, intensity: Math.min(1, intensity) });
        }

        const prevDist = player.dist;
        player.dist += player.speed * DT * 60;

        // Lap detection
        if (player.dist >= trackLength && prevDist < trackLength) {
          player.dist -= trackLength;
          player.laps++;
          const lapFrames = frameCount - player.lapStartFrame;
          player.lastLapTime = lapFrames / 60; // convert frames to seconds
          if (player.lastLapTime < player.bestLap) {
            player.bestLap = player.lastLapTime;
          }
          player.lapStartFrame = frameCount;
          difficultyLevel = player.laps;

          // Score: laps * 1000 + time bonus
          const timeBonus = Math.max(0, Math.floor((30 - player.lastLapTime) * 20));
          score = player.laps * 1000 + timeBonus;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }

          lapDisplay = `LAP ${player.laps} - ${player.lastLapTime.toFixed(2)}s`;
          lapDisplayTimer = 2.5;

          // Change track every 3 laps
          if (player.laps > 0 && player.laps % 3 === 0) {
            const newLayout = (currentLayout + 1) % TRACK_LAYOUTS.length;
            loadTrack(newLayout);
            player.dist = 0;
            cpu.dist = Math.floor(trackLength * 0.3);
            skidMarks = [];
          }

          // End game after 10 laps
          if (player.laps >= 10) {
            gameOver(game);
            return;
          }
        }
      }

      // Trail
      if (!player.offTrack) {
        const pos = player.getPosition();
        player.trail.push({ x: pos.x, y: pos.y, age: 0 });
        if (player.trail.length > 20) player.trail.shift();
      }
    }

    // ── Update CPU ──
    updateCPU();

    // ── Age trails and skid marks ──
    for (const t of player.trail) t.age += DT;
    for (const t of cpu.trail) t.age += DT;
    for (const s of skidMarks) s.age += DT;
    skidMarks = skidMarks.filter(s => s.age < 4);

    // Lap display timer
    if (lapDisplayTimer > 0) lapDisplayTimer -= DT;
  };

  function gameOver(game) {
    game.setState('over');
    const bestLapStr = player.bestLap < Infinity ? player.bestLap.toFixed(2) + 's' : '--';
    game.showOverlay('GAME OVER', `Score: ${score} | ${player.laps} Laps | Best: ${bestLapStr}\nPress SPACE to restart`);
  }

  game.onDraw = (renderer, text) => {
    // ── Draw Track ──
    drawTrack(renderer);
    drawSkidMarks(renderer);
    drawStartLine(renderer);
    drawCar(renderer, cpu);
    drawCar(renderer, player);
    drawHUD(renderer, text, game);
  };

  function drawTrack(renderer) {
    // Build polyline points for track center, sampled every 4 points for perf
    // Track surface: thick border lines on each side
    const sampleStep = 4;

    // Outer edge
    const outerPoints = [];
    const innerPoints = [];
    for (let i = 0; i < trackLength; i += sampleStep) {
      const p = trackPoints[i];
      const nx = -Math.sin(p.angle);
      const ny = Math.cos(p.angle);
      outerPoints.push({ x: p.x + nx * TRACK_WIDTH, y: p.y + ny * TRACK_WIDTH });
      innerPoints.push({ x: p.x - nx * TRACK_WIDTH, y: p.y - ny * TRACK_WIDTH });
    }

    // Draw track surface as filled quads between inner and outer edges
    for (let i = 0; i < outerPoints.length; i++) {
      const ni = (i + 1) % outerPoints.length;
      const o0 = outerPoints[i];
      const o1 = outerPoints[ni];
      const i0 = innerPoints[i];
      const i1 = innerPoints[ni];
      renderer.fillPoly([o0, o1, i1, i0], '#1e1e36');
    }

    // Draw track borders
    renderer.strokePoly(outerPoints, '#3a3a5e', 2, true);
    renderer.strokePoly(innerPoints, '#3a3a5e', 2, true);

    // Center slot line (dashed) - draw as individual dash segments
    const centerPoints = [];
    for (let i = 0; i < trackLength; i += sampleStep) {
      centerPoints.push({ x: trackPoints[i].x, y: trackPoints[i].y });
    }
    // Draw dashed center line as short segments
    for (let i = 0; i < centerPoints.length; i += 2) {
      const ni = (i + 1) % centerPoints.length;
      renderer.drawLine(
        centerPoints[i].x, centerPoints[i].y,
        centerPoints[ni].x, centerPoints[ni].y,
        '#3a3a5e', 1
      );
    }

    // Lane slots (thin lines where cars ride)
    for (const laneOff of [-LANE_OFFSET, LANE_OFFSET]) {
      const lanePoints = [];
      for (let i = 0; i < trackLength; i += sampleStep * 2) {
        const p = trackPoints[i];
        const nx = -Math.sin(p.angle) * laneOff;
        const ny = Math.cos(p.angle) * laneOff;
        lanePoints.push({ x: p.x + nx, y: p.y + ny });
      }
      renderer.strokePoly(lanePoints, '#2a2a48', 1.5, true);
    }
  }

  function drawStartLine(renderer) {
    const p = trackPoints[0];
    const nx = -Math.sin(p.angle);
    const ny = Math.cos(p.angle);
    renderer.drawLine(
      p.x + nx * TRACK_WIDTH, p.y + ny * TRACK_WIDTH,
      p.x - nx * TRACK_WIDTH, p.y - ny * TRACK_WIDTH,
      '#ffffff', 2
    );

    // Checkerboard pattern on start line
    const segments = 6;
    const segLen = (TRACK_WIDTH * 2) / segments;
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 0) {
        const sx = p.x - nx * TRACK_WIDTH + nx * segLen * i + nx * segLen * 0.5;
        const sy = p.y - ny * TRACK_WIDTH + ny * segLen * i + ny * segLen * 0.5;
        renderer.fillRect(sx - 2, sy - 2, 4, 4, '#ffffff4d');
      }
    }
  }

  function drawSkidMarks(renderer) {
    for (const s of skidMarks) {
      const alpha = Math.max(0, (1 - s.age / 4) * s.intensity * 0.4);
      if (alpha <= 0) continue;
      const a = Math.round(alpha * 255);
      const hex = a.toString(16).padStart(2, '0');
      renderer.fillCircle(s.x, s.y, 2, '#3c3c3c' + hex);
    }
  }

  // Expand 3-char hex (#a6f) to 6-char (#aa66ff) for alpha concatenation
  function expandHex(color) {
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  }

  function drawCar(renderer, car) {
    const pos = car.getPosition();
    const carHex = expandHex(car.color);

    // Trail glow
    for (let i = 0; i < car.trail.length; i++) {
      const t = car.trail[i];
      const alpha = ((i / car.trail.length) * 0.4) * Math.max(0, 1 - t.age * 3);
      if (alpha <= 0) continue;
      const a = Math.round(Math.min(1, alpha) * 255);
      const hex = a.toString(16).padStart(2, '0');
      renderer.fillCircle(t.x, t.y, 3, carHex + hex);
    }

    if (car.offTrack) {
      // Spinning off-track car - draw as a rotated rectangle using fillPoly
      const spinAngle = pos.angle + car.offTrackTimer * 10;
      const alpha = 0.4 + car.offTrackTimer * 0.3;
      const a = Math.round(Math.min(1, alpha) * 255);
      const hex = a.toString(16).padStart(2, '0');
      const cos = Math.cos(spinAngle);
      const sin = Math.sin(spinAngle);
      // Rectangle -7,-4 to 7,4
      const corners = [
        { x: pos.x + (-7) * cos - (-4) * sin, y: pos.y + (-7) * sin + (-4) * cos },
        { x: pos.x + (7) * cos - (-4) * sin,  y: pos.y + (7) * sin + (-4) * cos },
        { x: pos.x + (7) * cos - (4) * sin,   y: pos.y + (7) * sin + (4) * cos },
        { x: pos.x + (-7) * cos - (4) * sin,  y: pos.y + (-7) * sin + (4) * cos },
      ];
      renderer.fillPoly(corners, carHex + hex);
      return;
    }

    // Car body - draw as a rotated polygon
    const cos = Math.cos(pos.angle);
    const sin = Math.sin(pos.angle);

    function rotPt(lx, ly) {
      return {
        x: pos.x + lx * cos - ly * sin,
        y: pos.y + lx * sin + ly * cos,
      };
    }

    // Glow
    renderer.setGlow(car.color, 0.6);

    // Body (rect -8,-4 to 8,4)
    const body = [rotPt(-8, -4), rotPt(8, -4), rotPt(8, 4), rotPt(-8, 4)];
    renderer.fillPoly(body, car.color);

    // Windshield (rect 3,-3 to 7,3)
    const windshield = [rotPt(3, -3), rotPt(7, -3), rotPt(7, 3), rotPt(3, 3)];
    renderer.fillPoly(windshield, '#ffffff4d');

    // Wheels
    const wheelColor = '#333333';
    const wheels = [
      [rotPt(-6, -5), rotPt(-2, -5), rotPt(-2, -3), rotPt(-6, -3)], // front-left
      [rotPt(-6, 3),  rotPt(-2, 3),  rotPt(-2, 5),  rotPt(-6, 5)],  // front-right
      [rotPt(3, -5),  rotPt(7, -5),  rotPt(7, -3),  rotPt(3, -3)],  // rear-left
      [rotPt(3, 3),   rotPt(7, 3),   rotPt(7, 5),   rotPt(3, 5)],   // rear-right
    ];
    for (const w of wheels) {
      renderer.fillPoly(w, wheelColor);
    }

    renderer.setGlow(null);
  }

  function drawHUD(renderer, text, game) {
    // Speed bar
    const barX = 15, barY = H - 60, barW = 100, barH = 12;
    const maxSpd = BASE_MAX_SPEED + difficultyLevel * 0.06;
    const speedRatio = player.offTrack ? 0 : player.speed / maxSpd;

    // Speed bar background
    renderer.fillRect(barX, barY, barW, barH, '#16213e');
    // Speed bar border (draw as four lines)
    renderer.drawLine(barX, barY, barX + barW, barY, '#3a3a5e', 1);
    renderer.drawLine(barX + barW, barY, barX + barW, barY + barH, '#3a3a5e', 1);
    renderer.drawLine(barX + barW, barY + barH, barX, barY + barH, '#3a3a5e', 1);
    renderer.drawLine(barX, barY + barH, barX, barY, '#3a3a5e', 1);

    // Speed bar fill with color
    let barColor;
    if (speedRatio < 0.5) barColor = '#0f0';
    else if (speedRatio < 0.8) barColor = '#ff0';
    else barColor = '#f44';
    const fillW = (barW - 2) * speedRatio;
    if (fillW > 0) {
      renderer.setGlow(barColor, 0.4);
      renderer.fillRect(barX + 1, barY + 1, fillW, barH - 2, barColor);
      renderer.setGlow(null);
    }

    // SPEED label
    text.drawText('SPEED', barX, barY - 3 - 10, 10, '#888888', 'left');

    // Lap counter
    text.drawText(
      `LAP ${Math.min(player.laps + 1, 10)}/10`,
      barX, barY - 20 - 14, 14, '#aa66ff', 'left'
    );

    // Current lap time
    if (game.state === 'playing' && !player.offTrack) {
      const lapFrames = frameCount - player.lapStartFrame;
      const elapsed = lapFrames / 60;
      text.drawText(`Time: ${elapsed.toFixed(1)}s`, barX, barY + 30 - 12, 12, '#888888', 'left');
    }

    // Best lap
    if (player.bestLap < Infinity) {
      text.drawText(`Best: ${player.bestLap.toFixed(2)}s`, barX + 120, barY + 30 - 11, 11, '#00ff00', 'left');
    }

    // Position indicator
    if (game.state === 'playing') {
      const playerProgress = player.laps * trackLength + player.dist;
      const cpuProgress = cpu.laps * trackLength + cpu.dist;
      const diff = playerProgress - cpuProgress;
      let posText, posColor;
      if (diff > 0) {
        posText = '1ST';
        posColor = '#00ff00';
      } else {
        posText = '2ND';
        posColor = '#ff4444';
      }
      text.drawText(posText, W - 15, H - 50 - 16, 16, posColor, 'right');
    }

    // Lap display notification (visible while timer > 0.3, then hide)
    if (lapDisplayTimer > 0.3) {
      text.drawText(lapDisplay, W / 2, 30 - 18, 18, '#aa66ff', 'center');
    }

    // Track layout indicator
    text.drawText(`Track ${currentLayout + 1}`, W - 60, 20 - 10, 10, '#555555', 'left');

    // Accelerating indicator
    if (accelerating && game.state === 'playing') {
      text.drawText('GAS', barX + barW + 10, barY + 10 - 11, 11, '#aa66ff', 'left');
    }

    // Off-track warning
    if (player.offTrack) {
      // Blink using frameCount
      const blink = Math.sin(frameCount * 0.6) > 0;
      if (blink) {
        renderer.setGlow('#f44', 0.8);
        text.drawText('OFF TRACK!', W / 2, H / 2 - 20, 20, '#ff4444', 'center');
        renderer.setGlow(null);
      }
    }
  }

  // Expose game data for ML
  window.gameData = {};
  setInterval(() => {
    if (game.state === 'playing' && player) {
      const pPos = player.getPosition();
      const cPos = cpu.getPosition();
      window.gameData = {
        playerX: pPos.x,
        playerY: pPos.y,
        playerSpeed: player.speed,
        playerLaps: player.laps,
        playerDist: player.dist,
        cpuX: cPos.x,
        cpuY: cPos.y,
        cpuSpeed: cpu.speed,
        cpuLaps: cpu.laps,
        accelerating: accelerating,
        offTrack: player.offTrack,
        difficulty: difficultyLevel,
      };
    }
  }, 200);

  game.start();
  return game;
}
