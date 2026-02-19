// super-sprint/game.js — Super Sprint game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// ── Track definition ──
const TRACK_WIDTH = 80;

const tracks = [
  // Track 0: Oval
  {
    name: 'OVAL SPEEDWAY',
    waypoints: [
      {x: 300, y: 80}, {x: 460, y: 100}, {x: 530, y: 180},
      {x: 550, y: 300}, {x: 530, y: 420}, {x: 460, y: 500},
      {x: 300, y: 520}, {x: 140, y: 500}, {x: 70, y: 420},
      {x: 50, y: 300}, {x: 70, y: 180}, {x: 140, y: 100}
    ],
    startIdx: 0,
    lapsToWin: 3
  },
  // Track 1: Figure-8 ish
  {
    name: 'FIGURE EIGHT',
    waypoints: [
      {x: 300, y: 60}, {x: 480, y: 80}, {x: 540, y: 160},
      {x: 500, y: 260}, {x: 380, y: 300}, {x: 300, y: 300},
      {x: 220, y: 300}, {x: 100, y: 340}, {x: 60, y: 440},
      {x: 120, y: 520}, {x: 300, y: 540}, {x: 480, y: 520},
      {x: 540, y: 440}, {x: 500, y: 340}, {x: 380, y: 300},
      {x: 300, y: 300}, {x: 220, y: 300}, {x: 100, y: 260},
      {x: 60, y: 160}, {x: 120, y: 80}
    ],
    startIdx: 0,
    lapsToWin: 2
  },
  // Track 2: Tight corners
  {
    name: 'GRAND PRIX',
    waypoints: [
      {x: 100, y: 80}, {x: 300, y: 60}, {x: 500, y: 80},
      {x: 540, y: 150}, {x: 520, y: 230}, {x: 400, y: 260},
      {x: 350, y: 300}, {x: 380, y: 360}, {x: 530, y: 380},
      {x: 550, y: 460}, {x: 500, y: 530}, {x: 300, y: 550},
      {x: 100, y: 530}, {x: 60, y: 460}, {x: 80, y: 360},
      {x: 200, y: 320}, {x: 250, y: 280}, {x: 200, y: 230},
      {x: 80, y: 200}, {x: 60, y: 140}
    ],
    startIdx: 0,
    lapsToWin: 2
  }
];

let currentTrack = 0;
let track;

// ── Car constants ──
const CAR_LENGTH = 18;
const CAR_WIDTH = 10;

// ── Car class ──
class Car {
  constructor(color, glowColor, isPlayer) {
    this.color = color;
    this.glowColor = glowColor;
    this.isPlayer = isPlayer;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.speed = 0;
    this.maxSpeed = 3.0;
    this.acceleration = 0.08;
    this.braking = 0.05;
    this.friction = 0.02;
    this.turnSpeed = 0.04;
    this.waypointIdx = 0;
    this.lap = 0;
    this.passedHalf = false;
    this.finished = false;
    this.finishPosition = 0;
    this.spinTimer = 0;
    this.speedBoosts = 0;
    this.onOil = false;
  }

  reset(startWpIdx, offset) {
    const wp = track.waypoints[startWpIdx];
    const nextWp = track.waypoints[(startWpIdx + 1) % track.waypoints.length];
    this.angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
    const perpAngle = this.angle + Math.PI / 2;
    this.x = wp.x + Math.cos(perpAngle) * offset;
    this.y = wp.y + Math.sin(perpAngle) * offset;
    this.speed = 0;
    this.waypointIdx = startWpIdx;
    this.lap = 0;
    this.passedHalf = false;
    this.finished = false;
    this.finishPosition = 0;
    this.spinTimer = 0;
    this.speedBoosts = 0;
    this.maxSpeed = 3.0;
    this.onOil = false;
  }

  getEffectiveMaxSpeed() {
    return this.maxSpeed + this.speedBoosts * 0.4;
  }

  update(steerLeft, steerRight, accelerate) {
    if (this.finished) return;

    if (this.spinTimer > 0) {
      this.spinTimer--;
      this.angle += 0.2;
      this.speed *= 0.95;
      return;
    }

    // Steering
    const turnMult = this.onOil ? 0.4 : 1.0;
    if (steerLeft) this.angle -= this.turnSpeed * turnMult * (0.5 + this.speed / this.getEffectiveMaxSpeed() * 0.5);
    if (steerRight) this.angle += this.turnSpeed * turnMult * (0.5 + this.speed / this.getEffectiveMaxSpeed() * 0.5);

    // Acceleration
    if (accelerate) {
      this.speed = Math.min(this.getEffectiveMaxSpeed(), this.speed + this.acceleration);
    } else {
      this.speed = Math.max(0, this.speed - this.braking);
    }

    // Friction
    this.speed = Math.max(0, this.speed - this.friction);

    // Move
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Keep on canvas
    this.x = Math.max(10, Math.min(W - 10, this.x));
    this.y = Math.max(10, Math.min(H - 10, this.y));

    // Check if off track (slow down)
    if (!this.isOnTrack()) {
      this.speed *= 0.92;
    }

    // Waypoint progression
    this.updateWaypoint();
  }

  isOnTrack() {
    const wps = track.waypoints;
    let minDist = Infinity;
    for (let i = 0; i < wps.length; i++) {
      const j = (i + 1) % wps.length;
      const d = distToSegment(this.x, this.y, wps[i].x, wps[i].y, wps[j].x, wps[j].y);
      if (d < minDist) minDist = d;
    }
    return minDist < TRACK_WIDTH / 2 + 10;
  }

  updateWaypoint() {
    const wps = track.waypoints;
    const nextIdx = (this.waypointIdx + 1) % wps.length;
    const wp = wps[nextIdx];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 50) {
      this.waypointIdx = nextIdx;

      const halfIdx = Math.floor(wps.length / 2);
      if (this.waypointIdx === halfIdx) {
        this.passedHalf = true;
      }

      if (this.waypointIdx === track.startIdx && this.passedHalf) {
        this.lap++;
        this.passedHalf = false;

        if (this.isPlayer) {
          score += 100 * this.lap;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
        }
      }
    }
  }
}

// ── AI Controller ──
class AIController {
  constructor(car, skillLevel) {
    this.car = car;
    this.skillLevel = skillLevel;
    this.lookAhead = 2;
    this.wobbleTimer = 0;
    this.wobbleDir = 0;
  }

  update() {
    if (this.car.finished || this.car.spinTimer > 0) return;

    const wps = track.waypoints;
    const targetIdx = (this.car.waypointIdx + this.lookAhead) % wps.length;
    const target = wps[targetIdx];

    const dx = target.x - this.car.x;
    const dy = target.y - this.car.y;
    let targetAngle = Math.atan2(dy, dx);

    this.wobbleTimer++;
    if (this.wobbleTimer > 30 + Math.random() * 30) {
      this.wobbleTimer = 0;
      this.wobbleDir = (Math.random() - 0.5) * (1.0 - this.skillLevel) * 0.3;
    }
    targetAngle += this.wobbleDir;

    let angleDiff = targetAngle - this.car.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const steerLeft = angleDiff < -0.05;
    const steerRight = angleDiff > 0.05;

    const sharpTurn = Math.abs(angleDiff) > 0.5;
    const accelerate = !sharpTurn || this.car.speed < this.car.getEffectiveMaxSpeed() * 0.5;

    this.car.update(steerLeft, steerRight, accelerate);
  }
}

// ── Game objects ──
let player, aiCars, aiControllers;
let oilSlicks = [];
let wrenches = [];
let finishOrder = 0;
let raceCountdown = 0;
let lapDisplay = '';
let particles = [];
let score = 0;
let best = 0;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Utility functions ──
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx, projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function pointOnTrack(x, y) {
  const wps = track.waypoints;
  for (let i = 0; i < wps.length; i++) {
    const j = (i + 1) % wps.length;
    if (distToSegment(x, y, wps[i].x, wps[i].y, wps[j].x, wps[j].y) < TRACK_WIDTH / 2 - 10) {
      return true;
    }
  }
  return false;
}

function randomOnTrack() {
  const wps = track.waypoints;
  const segIdx = Math.floor(Math.random() * wps.length);
  const nextIdx = (segIdx + 1) % wps.length;
  const t = 0.2 + Math.random() * 0.6;
  const x = wps[segIdx].x + (wps[nextIdx].x - wps[segIdx].x) * t;
  const y = wps[segIdx].y + (wps[nextIdx].y - wps[segIdx].y) * t;
  const angle = Math.atan2(wps[nextIdx].y - wps[segIdx].y, wps[nextIdx].x - wps[segIdx].x);
  const perpAngle = angle + Math.PI / 2;
  const offset = (Math.random() - 0.5) * (TRACK_WIDTH * 0.4);
  return {x: x + Math.cos(perpAngle) * offset, y: y + Math.sin(perpAngle) * offset, segIdx};
}

// ── Spawn obstacles and pickups ──
function spawnTrackItems() {
  oilSlicks = [];
  wrenches = [];

  const numOils = 3 + currentTrack;
  for (let i = 0; i < numOils; i++) {
    const pos = randomOnTrack();
    if (pos.segIdx === track.startIdx || pos.segIdx === (track.startIdx + 1) % track.waypoints.length) continue;
    oilSlicks.push({x: pos.x, y: pos.y, radius: 12 + Math.random() * 8});
  }

  const numWrenches = 2 + currentTrack;
  for (let i = 0; i < numWrenches; i++) {
    const pos = randomOnTrack();
    if (pos.segIdx === track.startIdx) continue;
    wrenches.push({x: pos.x, y: pos.y, collected: false, respawnTimer: 0});
  }
}

function setupRace() {
  track = tracks[currentTrack];
  finishOrder = 0;

  player = new Car('#ae4', '#ae4', true);
  player.reset(track.startIdx, -15);

  const ai1 = new Car('#f44', '#f44', false);
  ai1.reset(track.startIdx, 0);
  const ai2 = new Car('#48f', '#48f', false);
  ai2.reset(track.startIdx, 15);

  aiCars = [ai1, ai2];
  aiControllers = [
    new AIController(ai1, 0.6 + currentTrack * 0.1),
    new AIController(ai2, 0.5 + currentTrack * 0.1)
  ];

  spawnTrackItems();
}

// ── Transform local verts by position and rotation ──
function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

// ── Pre-compute track border points ──
function getTrackBorderPoints(border) {
  const wps = track.waypoints;
  const points = [];
  for (let i = 0; i <= wps.length; i++) {
    const idx = i % wps.length;
    const prevIdx = (idx - 1 + wps.length) % wps.length;
    const nextIdx = (idx + 1) % wps.length;

    const dx1 = wps[idx].x - wps[prevIdx].x;
    const dy1 = wps[idx].y - wps[prevIdx].y;
    const dx2 = wps[nextIdx].x - wps[idx].x;
    const dy2 = wps[nextIdx].y - wps[idx].y;
    const angle = Math.atan2(dy1 + dy2, dx1 + dx2);
    const perpAngle = angle + Math.PI / 2;

    points.push({
      x: wps[idx].x + Math.cos(perpAngle) * border * TRACK_WIDTH / 2,
      y: wps[idx].y + Math.sin(perpAngle) * border * TRACK_WIDTH / 2
    });
  }
  return points;
}

// ── Hex-to-rgba helper for particles with alpha ──
function colorWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 2), 16) * 17;
  const g = parseInt(hex.slice(2, 3), 16) * 17;
  const b = parseInt(hex.slice(3, 4), 16) * 17;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    particles = [];
    setupRace();
    game.showOverlay('SUPER SPRINT', `Track: ${tracks[currentTrack].name} -- Press SPACE to race!`);
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
        raceCountdown = 180; // 3 second countdown at 60fps
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        player._graceTimer = 0;
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Countdown
    if (raceCountdown > 0) {
      raceCountdown--;
      return;
    }

    // Player input
    const steerL = input.isDown('ArrowLeft') || input.isDown('a');
    const steerR = input.isDown('ArrowRight') || input.isDown('d');
    const accel = input.isDown('ArrowUp') || input.isDown('w');
    player.update(steerL, steerR, accel);

    // AI updates
    aiControllers.forEach(ai => ai.update());

    // All cars: check collisions with items
    const allCars = [player, ...aiCars];

    allCars.forEach(car => {
      car.onOil = false;

      // Oil slick collisions
      oilSlicks.forEach(oil => {
        const dx = car.x - oil.x;
        const dy = car.y - oil.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < oil.radius + 8) {
          car.onOil = true;
          if (car.speed > 1.5 && car.spinTimer === 0 && Math.random() < 0.03) {
            car.spinTimer = 30;
            for (let i = 0; i < 5; i++) {
              particles.push({
                x: car.x, y: car.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 20 + Math.random() * 20,
                color: '#654'
              });
            }
          }
        }
      });

      // Wrench pickups
      wrenches.forEach(wr => {
        if (wr.collected) {
          wr.respawnTimer--;
          if (wr.respawnTimer <= 0) wr.collected = false;
          return;
        }
        const dx = car.x - wr.x;
        const dy = car.y - wr.y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          wr.collected = true;
          wr.respawnTimer = 300;
          car.speedBoosts = Math.min(car.speedBoosts + 1, 3);
          if (car.isPlayer) {
            score += 25;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
          }
          for (let i = 0; i < 8; i++) {
            particles.push({
              x: wr.x, y: wr.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 15 + Math.random() * 15,
              color: '#ff0'
            });
          }
        }
      });

      // Car-to-car collisions
      allCars.forEach(other => {
        if (other === car) return;
        const dx = car.x - other.x;
        const dy = car.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 16 && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = 16 - dist;
          car.x += nx * overlap * 0.5;
          car.y += ny * overlap * 0.5;
          other.x -= nx * overlap * 0.5;
          other.y -= ny * overlap * 0.5;
          const avgSpeed = (car.speed + other.speed) * 0.5;
          car.speed = avgSpeed * 0.8;
          other.speed = avgSpeed * 0.8;
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: (car.x + other.x) / 2, y: (car.y + other.y) / 2,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 10 + Math.random() * 10,
              color: '#fa0'
            });
          }
        }
      });
    });

    // Check lap/race completion
    allCars.forEach(car => {
      if (!car.finished && car.lap >= track.lapsToWin) {
        car.finished = true;
        finishOrder++;
        car.finishPosition = finishOrder;
        car.speed = 0;
      }
    });

    // Check if race is over
    if (player.finished) {
      const posBonus = [0, 300, 150, 50];
      score += posBonus[player.finishPosition] || 0;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }

      if (player.finishPosition === 1 && currentTrack < tracks.length - 1) {
        currentTrack++;
        raceWon();
      } else {
        gameOver();
      }
      return;
    }

    // If both AI finished and player hasn't
    const allAiDone = aiCars.every(c => c.finished);
    if (allAiDone && !player.finished) {
      if (!player._graceTimer) player._graceTimer = 120;
      player._graceTimer--;
      if (player._graceTimer <= 0) {
        player.finished = true;
        finishOrder++;
        player.finishPosition = finishOrder;
        gameOver();
        return;
      }
    }

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    // Lap display
    lapDisplay = `Lap ${Math.min(player.lap + 1, track.lapsToWin)}/${track.lapsToWin}`;

    // Expose game data for ML
    window.gameData = {
      playerX: player.x, playerY: player.y,
      playerAngle: player.angle, playerSpeed: player.speed,
      playerLap: player.lap,
      ai: aiCars.map(c => ({x: c.x, y: c.y, lap: c.lap})),
      oilSlicks: oilSlicks.map(o => ({x: o.x, y: o.y})),
      wrenches: wrenches.filter(w => !w.collected).map(w => ({x: w.x, y: w.y}))
    };
  };

  function raceWon() {
    game.showOverlay('RACE WON!', `Score: ${score} -- Next: ${tracks[currentTrack].name} -- Press any key`);
    game.setState('over');
  }

  function gameOver() {
    const posText = ['', '1st', '2nd', '3rd'];
    game.showOverlay('GAME OVER', `Finished ${posText[player.finishPosition] || 'DNF'} -- Score: ${score} -- Press any key`);
    game.setState('over');
    currentTrack = 0;
  }

  // ── Car body polygon (local coords, pointing right at angle=0) ──
  const carBodyVerts = [
    {x: -CAR_LENGTH / 2, y: -CAR_WIDTH / 2},
    {x:  CAR_LENGTH / 2, y: -CAR_WIDTH / 2},
    {x:  CAR_LENGTH / 2, y:  CAR_WIDTH / 2},
    {x: -CAR_LENGTH / 2, y:  CAR_WIDTH / 2}
  ];

  // Windshield (small rect at front of car)
  const windshieldVerts = [
    {x: CAR_LENGTH / 2 - 5, y: -CAR_WIDTH / 2 + 2},
    {x: CAR_LENGTH / 2 - 2, y: -CAR_WIDTH / 2 + 2},
    {x: CAR_LENGTH / 2 - 2, y:  CAR_WIDTH / 2 - 2},
    {x: CAR_LENGTH / 2 - 5, y:  CAR_WIDTH / 2 - 2}
  ];

  function drawCar(renderer, car) {
    const glow = car.spinTimer > 0 ? 0.8 : 0.5;
    renderer.setGlow(car.glowColor, glow);

    // Car body
    const body = transformVerts(carBodyVerts, car.x, car.y, car.angle);
    renderer.fillPoly(body, car.color);

    // Windshield
    const ws = transformVerts(windshieldVerts, car.x, car.y, car.angle);
    renderer.fillPoly(ws, 'rgba(255,255,255,0.6)');

    // Speed boost indicators (small yellow dots at rear)
    if (car.speedBoosts > 0) {
      for (let i = 0; i < car.speedBoosts; i++) {
        const localVerts = [
          {x: -CAR_LENGTH / 2 - 3, y: -CAR_WIDTH / 2 + 2 + i * 4},
          {x: -CAR_LENGTH / 2 - 1, y: -CAR_WIDTH / 2 + 2 + i * 4},
          {x: -CAR_LENGTH / 2 - 1, y: -CAR_WIDTH / 2 + 5 + i * 4},
          {x: -CAR_LENGTH / 2 - 3, y: -CAR_WIDTH / 2 + 5 + i * 4}
        ];
        const boostDots = transformVerts(localVerts, car.x, car.y, car.angle);
        renderer.fillPoly(boostDots, '#ff0');
      }
    }

    renderer.setGlow(null);
  }

  // ── Draw the track surface ──
  function drawTrack(renderer) {
    const wps = track.waypoints;

    // Draw grass texture dots
    // Use a seeded-ish approach: just draw a fixed set each frame (cheap)
    renderer.setGlow(null);

    // Track surface: draw as a series of thick filled quads between waypoints
    // We approximate the thick line by drawing filled quads for each segment
    for (let i = 0; i < wps.length; i++) {
      const j = (i + 1) % wps.length;
      const ax = wps[i].x, ay = wps[i].y;
      const bx = wps[j].x, by = wps[j].y;

      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) continue;

      const nx = -dy / len * TRACK_WIDTH / 2;
      const ny = dx / len * TRACK_WIDTH / 2;

      const quadPoints = [
        {x: ax + nx, y: ay + ny},
        {x: bx + nx, y: by + ny},
        {x: bx - nx, y: by - ny},
        {x: ax - nx, y: ay - ny}
      ];
      renderer.fillPoly(quadPoints, '#2a2a3e');
    }

    // Fill gaps at waypoint joints with circles (rendered as filled polygons)
    for (let i = 0; i < wps.length; i++) {
      const cx = wps[i].x, cy = wps[i].y;
      renderer.fillCircle(cx, cy, TRACK_WIDTH / 2, '#2a2a3e');
    }

    // Track borders (dashed neon lines)
    for (let border = -1; border <= 1; border += 2) {
      const borderPoints = getTrackBorderPoints(border);
      // Draw dashed border: alternate draw/skip segments
      for (let i = 0; i < borderPoints.length - 1; i++) {
        const p1 = borderPoints[i];
        const p2 = borderPoints[i + 1];
        // Approximate dashes: draw every other segment
        if (i % 2 === 0) {
          renderer.drawLine(p1.x, p1.y, p2.x, p2.y, 'rgba(170,238,68,0.5)', 2);
        }
      }
    }

    // Start/finish line
    const startWp = wps[track.startIdx];
    const nextWp = wps[(track.startIdx + 1) % wps.length];
    const startAngle = Math.atan2(nextWp.y - startWp.y, nextWp.x - startWp.x);
    const perpA = startAngle + Math.PI / 2;

    const slx1 = startWp.x + Math.cos(perpA) * TRACK_WIDTH / 2;
    const sly1 = startWp.y + Math.sin(perpA) * TRACK_WIDTH / 2;
    const slx2 = startWp.x - Math.cos(perpA) * TRACK_WIDTH / 2;
    const sly2 = startWp.y - Math.sin(perpA) * TRACK_WIDTH / 2;

    renderer.drawLine(slx1, sly1, slx2, sly2, '#fff', 3);

    // Checkerboard pattern at start
    const checkSize = 6;
    const numChecks = Math.floor(TRACK_WIDTH / checkSize);
    for (let c = 0; c < numChecks; c++) {
      if (c % 2 !== 0) continue;
      const t = (c + 0.5) / numChecks - 0.5;
      const cx = startWp.x + Math.cos(perpA) * t * TRACK_WIDTH;
      const cy = startWp.y + Math.sin(perpA) * t * TRACK_WIDTH;
      renderer.fillRect(cx - checkSize / 2, cy - checkSize / 2, checkSize, checkSize, '#fff');
    }
  }

  // ── Draw minimap ──
  function drawMinimap(renderer) {
    const mmSize = 100;
    const mmX = W - mmSize - 10;
    const mmY = H - mmSize - 10;
    const scale = mmSize / W;

    // Background
    renderer.fillRect(mmX, mmY, mmSize, mmSize, 'rgba(16,16,30,0.8)');
    // Border
    renderer.drawLine(mmX, mmY, mmX + mmSize, mmY, 'rgba(170,238,68,0.3)', 1);
    renderer.drawLine(mmX + mmSize, mmY, mmX + mmSize, mmY + mmSize, 'rgba(170,238,68,0.3)', 1);
    renderer.drawLine(mmX + mmSize, mmY + mmSize, mmX, mmY + mmSize, 'rgba(170,238,68,0.3)', 1);
    renderer.drawLine(mmX, mmY + mmSize, mmX, mmY, 'rgba(170,238,68,0.3)', 1);

    // Track
    const wps = track.waypoints;
    for (let i = 0; i < wps.length; i++) {
      const j = (i + 1) % wps.length;
      renderer.drawLine(
        mmX + wps[i].x * scale, mmY + wps[i].y * scale,
        mmX + wps[j].x * scale, mmY + wps[j].y * scale,
        '#444', 3
      );
    }

    // Cars on minimap
    const allCars = [player, ...aiCars];
    allCars.forEach(car => {
      renderer.fillCircle(mmX + car.x * scale, mmY + car.y * scale, 2.5, car.color);
    });
  }

  game.onDraw = (renderer, text) => {
    // ── Draw track surface ──
    drawTrack(renderer);

    // ── Oil slicks ──
    renderer.setGlow(null);
    oilSlicks.forEach(oil => {
      renderer.fillCircle(oil.x, oil.y, oil.radius, 'rgba(40,30,20,0.7)');
      // Border ring
      const numSegs = 16;
      for (let i = 0; i < numSegs; i++) {
        const a1 = (i / numSegs) * Math.PI * 2;
        const a2 = ((i + 1) / numSegs) * Math.PI * 2;
        renderer.drawLine(
          oil.x + Math.cos(a1) * oil.radius, oil.y + Math.sin(a1) * oil.radius,
          oil.x + Math.cos(a2) * oil.radius, oil.y + Math.sin(a2) * oil.radius,
          '#543', 1
        );
      }
      // Sheen highlight
      renderer.fillCircle(oil.x - 2, oil.y - 2, oil.radius * 0.5, 'rgba(80,60,100,0.3)');
    });

    // ── Wrenches ──
    wrenches.forEach(wr => {
      if (wr.collected) return;
      renderer.setGlow('#ff0', 0.5);
      // Handle
      renderer.drawLine(wr.x - 5, wr.y + 5, wr.x + 3, wr.y - 3, '#ff0', 2.5);
      // Head (arc approximated as line segments)
      const headCx = wr.x + 5, headCy = wr.y - 5, headR = 4;
      const arcStart = -0.5, arcEnd = 2.5;
      const arcSegs = 6;
      for (let i = 0; i < arcSegs; i++) {
        const a1 = arcStart + (arcEnd - arcStart) * (i / arcSegs);
        const a2 = arcStart + (arcEnd - arcStart) * ((i + 1) / arcSegs);
        renderer.drawLine(
          headCx + Math.cos(a1) * headR, headCy + Math.sin(a1) * headR,
          headCx + Math.cos(a2) * headR, headCy + Math.sin(a2) * headR,
          '#ff0', 2.5
        );
      }
      renderer.setGlow(null);
    });

    // ── Particles ──
    particles.forEach(p => {
      const alpha = Math.min(1, p.life / 30);
      renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, colorWithAlpha(p.color, alpha));
    });

    // ── Draw cars (AI first, player on top) ──
    aiCars.forEach(car => drawCar(renderer, car));
    drawCar(renderer, player);

    // ── HUD ──
    if (game.state === 'playing') {
      // Lap counter
      renderer.setGlow('#ae4', 0.4);
      text.drawText(lapDisplay, 10, 8, 16, '#ae4', 'left');

      // Track name
      renderer.setGlow(null);
      text.drawText(track.name, 10, 28, 12, '#888', 'left');

      // Speed indicator
      renderer.setGlow('#ae4', 0.3);
      const speedPct = Math.round(player.speed / player.getEffectiveMaxSpeed() * 100);
      text.drawText(`Speed: ${speedPct}%`, W - 10, 8, 16, '#ae4', 'right');

      // Upgrade indicator
      if (player.speedBoosts > 0) {
        renderer.setGlow('#ff0', 0.3);
        text.drawText(`Upgrades: ${'*'.repeat(player.speedBoosts)}`, W - 10, 28, 12, '#ff0', 'right');
      }

      // Position indicator
      const allCars = [player, ...aiCars];
      const sorted = [...allCars].sort((a, b) => {
        if (a.lap !== b.lap) return b.lap - a.lap;
        return b.waypointIdx - a.waypointIdx;
      });
      const pos = sorted.indexOf(player) + 1;
      const posText = ['', '1st', '2nd', '3rd'];
      const posColor = pos === 1 ? '#ae4' : (pos === 2 ? '#ff0' : '#f44');
      renderer.setGlow(posColor, 0.5);
      text.drawText(posText[pos], W / 2, 4, 18, posColor, 'center');

      // Countdown
      if (raceCountdown > 0) {
        const countNum = Math.ceil(raceCountdown / 60);
        renderer.setGlow('#ae4', 0.8);
        text.drawText(countNum > 0 ? String(countNum) : 'GO!', W / 2, H / 2 - 30, 60, '#fff', 'center');
      }

      // Mini-map
      renderer.setGlow(null);
      drawMinimap(renderer);
    }

    renderer.setGlow(null);
  };

  game.start();
  return game;
}
