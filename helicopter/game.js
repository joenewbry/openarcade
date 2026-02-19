// helicopter/game.js — Helicopter game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Theme
const THEME = '#f4a';
const THEME_DIM = '#a36';
const THEME_GLOW = '#ff44aa66';

// Physics
const GRAVITY = 0.35;
const THRUST = -0.6;
const MAX_VY = 6;

// Helicopter
const HELI_X = 80;
const HELI_W = 30;
const HELI_H = 16;

// Cave
const CAVE_SEGMENT_W = 4;
const INITIAL_GAP = 260;
const MIN_GAP = 100;
const GAP_SHRINK_RATE = 0.008;
const WALL_DRIFT_SPEED = 0.6;
const SCROLL_SPEED_START = 2.5;
const SCROLL_SPEED_MAX = 5;
const SCROLL_ACCEL = 0.0003;

// Obstacles
const OBS_WIDTH = 20;
const OBS_MIN_H = 30;
const OBS_MAX_H = 80;
const OBS_SPAWN_DIST_START = 300;
const OBS_SPAWN_DIST_MIN = 120;

// Particles
const MAX_PARTICLES = 30;

// ── State ──
let heliY, heliVY, score, best = 0;
let caveTop, caveBot;
let scrollSpeed, distance, frameCount;
let obstacles;
let particles;
let thrusting;
let rotorAngle;
let nextObsDist;
let caveCenter, currentGap;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function generateCaveSegment() {
  const drift = (Math.random() - 0.5) * WALL_DRIFT_SPEED * 2;
  caveCenter += drift;

  currentGap = Math.max(MIN_GAP, INITIAL_GAP - distance * GAP_SHRINK_RATE);

  const halfGap = currentGap / 2;
  const margin = 10;
  if (caveCenter - halfGap < margin) caveCenter = margin + halfGap;
  if (caveCenter + halfGap > H - margin) caveCenter = H - margin - halfGap;

  const noiseTop = (Math.random() - 0.5) * 6;
  const noiseBot = (Math.random() - 0.5) * 6;

  caveTop.push(caveCenter - halfGap + noiseTop);
  caveBot.push(caveCenter + halfGap + noiseBot);
}

function spawnObstacle() {
  const segIdx = caveTop.length - 1;
  const topY = caveTop[segIdx];
  const botY = caveBot[segIdx];
  const gapH = botY - topY;

  if (gapH < 80) return;

  const fromTop = Math.random() < 0.5;
  const obsH = OBS_MIN_H + Math.random() * Math.min(OBS_MAX_H - OBS_MIN_H, gapH * 0.4);
  let obsY;
  if (fromTop) {
    obsY = topY;
  } else {
    obsY = botY - obsH;
  }

  obstacles.push({ x: W + 10, y: obsY, w: OBS_WIDTH, h: obsH, fromTop });
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    heliY = H / 2;
    heliVY = 0;
    score = 0;
    distance = 0;
    frameCount = 0;
    scrollSpeed = SCROLL_SPEED_START;
    thrusting = false;
    rotorAngle = 0;
    scoreEl.textContent = '0';

    caveCenter = H / 2;
    currentGap = INITIAL_GAP;
    caveTop = [];
    caveBot = [];
    const numSegments = Math.ceil(W / CAVE_SEGMENT_W) + 10;
    for (let i = 0; i < numSegments; i++) {
      caveTop.push(caveCenter - currentGap / 2);
      caveBot.push(caveCenter + currentGap / 2);
    }

    obstacles = [];
    particles = [];
    nextObsDist = OBS_SPAWN_DIST_START * 0.6;

    game.showOverlay('HELICOPTER', 'Hold SPACE or CLICK to fly');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Mouse/touch input ──
  let mouseDown = false;
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (game.state === 'waiting') {
      mouseDown = true;
      game.setState('playing');
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing') {
      mouseDown = true;
    }
  });

  canvas.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('mouseleave', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
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

    // Thrust if space is held OR mouse is held
    thrusting = input.isDown(' ') || mouseDown;

    frameCount++;

    // Increase scroll speed over time
    scrollSpeed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_START + distance * SCROLL_ACCEL);

    // Helicopter physics
    if (thrusting) {
      heliVY += THRUST;
      // Spawn thrust particles
      if (frameCount % 2 === 0 && particles.length < MAX_PARTICLES) {
        particles.push({
          x: HELI_X - HELI_W / 2 + Math.random() * 6 - 3,
          y: heliY + HELI_H / 2 + Math.random() * 4,
          vx: -1 - Math.random() * 2,
          vy: 1 + Math.random() * 2,
          life: 1.0,
          size: 2 + Math.random() * 3
        });
      }
    }
    heliVY += GRAVITY;
    heliVY = Math.max(-MAX_VY, Math.min(MAX_VY, heliVY));
    heliY += heliVY;

    // Distance and score
    distance += scrollSpeed;
    score = Math.floor(distance / 10);
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Generate new cave segments as needed
    const neededSegments = Math.ceil((distance + W + 40) / CAVE_SEGMENT_W);
    while (caveTop.length < neededSegments) {
      generateCaveSegment();
    }

    // Spawn obstacles
    nextObsDist -= scrollSpeed;
    if (nextObsDist <= 0) {
      spawnObstacle();
      const spawnDist = Math.max(OBS_SPAWN_DIST_MIN, OBS_SPAWN_DIST_START - distance * 0.015);
      nextObsDist = spawnDist * (0.7 + Math.random() * 0.6);
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= scrollSpeed;
      if (obstacles[i].x + obstacles[i].w < -10) {
        obstacles.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Rotor animation
    rotorAngle += 0.5;

    // ── Collision detection ──
    const heliLeft = HELI_X - HELI_W / 2;
    const heliRight = HELI_X + HELI_W / 2;
    const heliTopY = heliY - HELI_H / 2;
    const heliBotY = heliY + HELI_H / 2;

    // Check cave walls at helicopter position
    for (let px = heliLeft; px <= heliRight; px += CAVE_SEGMENT_W) {
      const segIdx = Math.floor((distance + px) / CAVE_SEGMENT_W);
      if (segIdx >= 0 && segIdx < caveTop.length) {
        if (heliTopY <= caveTop[segIdx] || heliBotY >= caveBot[segIdx]) {
          die();
          return;
        }
      }
    }

    // Check obstacles (AABB)
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (heliRight > o.x && heliLeft < o.x + o.w &&
          heliBotY > o.y && heliTopY < o.y + o.h) {
        die();
        return;
      }
    }

    // Screen bounds
    if (heliY < 0 || heliY > H) {
      die();
      return;
    }
  };

  function die() {
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    drawCave(renderer);
    drawObstacles(renderer);
    drawParticles(renderer);
    drawHelicopter(renderer, text);
  };

  function drawCave(renderer) {
    const startSeg = Math.floor(distance / CAVE_SEGMENT_W);
    const numSegs = Math.ceil(W / CAVE_SEGMENT_W) + 1;

    // Draw top wall as a series of filled quads (segment by segment)
    for (let i = 0; i < numSegs; i++) {
      const segIdx = startSeg + i;
      const nextSegIdx = startSeg + i + 1;
      if (segIdx >= caveTop.length || nextSegIdx >= caveTop.length) break;

      const x1 = i * CAVE_SEGMENT_W - (distance % CAVE_SEGMENT_W);
      const x2 = (i + 1) * CAVE_SEGMENT_W - (distance % CAVE_SEGMENT_W);
      const topY1 = caveTop[segIdx];
      const topY2 = caveTop[nextSegIdx];

      // Top wall fill (from y=0 down to cave top edge)
      renderer.fillPoly([
        { x: x1, y: 0 },
        { x: x2, y: 0 },
        { x: x2, y: topY2 },
        { x: x1, y: topY1 }
      ], '#16213e');

      // Bottom wall fill (from cave bottom edge down to y=H)
      const botY1 = caveBot[segIdx];
      const botY2 = caveBot[nextSegIdx];
      renderer.fillPoly([
        { x: x1, y: botY1 },
        { x: x2, y: botY2 },
        { x: x2, y: H },
        { x: x1, y: H }
      ], '#16213e');
    }

    // Draw cave edge lines (top and bottom) with glow
    renderer.setGlow(THEME, 0.5);
    for (let i = 0; i < numSegs; i++) {
      const segIdx = startSeg + i;
      const nextSegIdx = startSeg + i + 1;
      if (segIdx >= caveTop.length || nextSegIdx >= caveTop.length) break;

      const x1 = i * CAVE_SEGMENT_W - (distance % CAVE_SEGMENT_W);
      const x2 = (i + 1) * CAVE_SEGMENT_W - (distance % CAVE_SEGMENT_W);

      // Top edge
      renderer.drawLine(x1, caveTop[segIdx], x2, caveTop[nextSegIdx], THEME, 1.5);
      // Bottom edge
      renderer.drawLine(x1, caveBot[segIdx], x2, caveBot[nextSegIdx], THEME, 1.5);
    }
    renderer.setGlow(null);

    // Wall striations (texture lines)
    for (let i = 0; i < numSegs; i += 8) {
      const segIdx = startSeg + i;
      if (segIdx >= caveTop.length) break;
      const screenX = i * CAVE_SEGMENT_W - (distance % CAVE_SEGMENT_W);
      // Top wall striation
      renderer.drawLine(screenX, 0, screenX, caveTop[segIdx], '#0f3460', 0.5);
      // Bottom wall striation
      renderer.drawLine(screenX, caveBot[segIdx], screenX, H, '#0f3460', 0.5);
    }
  }

  function drawObstacles(renderer) {
    obstacles.forEach(o => {
      // Obstacle body — use a gradient-like effect with three rects
      renderer.fillRect(o.x, o.y, 5, o.h, '#3a1528');
      renderer.fillRect(o.x + 5, o.y, o.w - 10, o.h, '#5a2540');
      renderer.fillRect(o.x + o.w - 5, o.y, 5, o.h, '#3a1528');

      // Obstacle border glow
      renderer.setGlow(THEME, 0.4);
      // Border as four lines
      renderer.drawLine(o.x, o.y, o.x + o.w, o.y, THEME_DIM, 1.5);
      renderer.drawLine(o.x + o.w, o.y, o.x + o.w, o.y + o.h, THEME_DIM, 1.5);
      renderer.drawLine(o.x + o.w, o.y + o.h, o.x, o.y + o.h, THEME_DIM, 1.5);
      renderer.drawLine(o.x, o.y + o.h, o.x, o.y, THEME_DIM, 1.5);

      // Pointed tip (stalactite / stalagmite)
      if (o.fromTop) {
        renderer.fillPoly([
          { x: o.x, y: o.y + o.h },
          { x: o.x + o.w / 2, y: o.y + o.h + 8 },
          { x: o.x + o.w, y: o.y + o.h }
        ], THEME_DIM);
      } else {
        renderer.fillPoly([
          { x: o.x, y: o.y },
          { x: o.x + o.w / 2, y: o.y - 8 },
          { x: o.x + o.w, y: o.y }
        ], THEME_DIM);
      }
      renderer.setGlow(null);
    });
  }

  function drawParticles(renderer) {
    particles.forEach(p => {
      // Approximate alpha via color hex with alpha channel
      const alpha = Math.floor(p.life * 255).toString(16).padStart(2, '0');
      const r = Math.floor(p.life * p.size);
      renderer.setGlow(THEME, 0.4 * p.life);
      renderer.fillCircle(p.x, p.y, Math.max(1, r), '#ff44aa' + alpha);
    });
    renderer.setGlow(null);
  }

  function drawHelicopter(renderer, text) {
    const cx = HELI_X;
    const cy = heliY;

    // Tilt based on velocity
    const tilt = Math.max(-0.3, Math.min(0.3, heliVY * 0.04));
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);

    // Helper to rotate a point around (cx, cy)
    function rot(dx, dy) {
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    }

    // Thrust glow
    if (thrusting && game.state === 'playing') {
      renderer.setGlow(THEME, 0.6);
      renderer.fillCircle(cx, cy, HELI_W * 0.8, THEME_GLOW);
      renderer.setGlow(null);
    }

    // Body (fuselage) — approximate ellipse with a filled circle
    renderer.setGlow(THEME, 0.7);
    // Use a wider rect + circles to approximate the ellipse shape
    const halfW = HELI_W / 2;
    const halfH = HELI_H / 2;
    // Draw the fuselage as an ellipse approximated by overlapping shapes
    const bodyPts = [];
    const ellipseSegs = 16;
    for (let i = 0; i <= ellipseSegs; i++) {
      const angle = (i / ellipseSegs) * Math.PI * 2;
      const ex = Math.cos(angle) * halfW;
      const ey = Math.sin(angle) * halfH;
      bodyPts.push(rot(ex, ey));
    }
    renderer.fillPoly(bodyPts, THEME);

    // Cockpit window
    const cockpitPts = [];
    for (let i = 0; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const ex = HELI_W / 4 + Math.cos(angle + 0.2) * 5;
      const ey = -2 + Math.sin(angle + 0.2) * 4;
      cockpitPts.push(rot(ex, ey));
    }
    renderer.fillPoly(cockpitPts, '#ffffff99');
    renderer.setGlow(null);

    // Tail boom
    const tailStart = rot(-halfW, 0);
    const tailEnd = rot(-HELI_W - 5, -2);
    renderer.drawLine(tailStart.x, tailStart.y, tailEnd.x, tailEnd.y, THEME, 3);

    // Tail rotor — small ellipse approximation
    const tailRotorPts = [];
    const trAngle = rotorAngle * 3;
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rx = Math.cos(a) * 2;
      const ry = Math.sin(a) * 6;
      // Rotate by trAngle
      const rrx = rx * Math.cos(trAngle) - ry * Math.sin(trAngle);
      const rry = rx * Math.sin(trAngle) + ry * Math.cos(trAngle);
      tailRotorPts.push(rot(-HELI_W - 5 + rrx, -2 + rry));
    }
    renderer.fillPoly(tailRotorPts, THEME_DIM);

    // Main rotor (spinning line)
    renderer.setGlow(THEME, 0.4);
    const rotorSpan = HELI_W * 1.2;
    const rotorOffset = Math.cos(rotorAngle) * rotorSpan;
    const rotorY = -halfH - 3;
    const rLeft = rot(-rotorOffset, rotorY);
    const rRight = rot(rotorOffset, rotorY);
    renderer.drawLine(rLeft.x, rLeft.y, rRight.x, rRight.y, '#fff', 2);

    // Rotor hub
    const hubPos = rot(0, rotorY);
    renderer.fillCircle(hubPos.x, hubPos.y, 2, '#fff');
    renderer.setGlow(null);

    // Landing skid
    const sk1 = rot(-8, halfH);
    const sk2 = rot(-10, halfH + 4);
    const sk3 = rot(10, halfH + 4);
    const sk4 = rot(8, halfH);
    renderer.drawLine(sk1.x, sk1.y, sk2.x, sk2.y, THEME_DIM, 1.5);
    renderer.drawLine(sk2.x, sk2.y, sk3.x, sk3.y, THEME_DIM, 1.5);
    renderer.drawLine(sk3.x, sk3.y, sk4.x, sk4.y, THEME_DIM, 1.5);
  }

  game.start();
  return game;
}
