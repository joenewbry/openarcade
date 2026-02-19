// golf-it/game.js — Golf It ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 500, H = 500;

// Colors
const THEME       = '#8f4';
const FAIRWAY     = '#1a3a1a';
const WALL_COLOR  = '#556';
const WATER_COLOR = 'rgba(30,80,180,0.6)';
const WATER_EDGE  = 'rgba(60,120,220,0.4)';
const CUP_COLOR   = '#111';
const FLAG_COLOR  = '#f44';

// Physics
const FRICTION     = 0.985;
const MIN_SPEED    = 0.15;
const MAX_POWER    = 12;
const BALL_R       = 5;
const CUP_R        = 8;
const WALL_BOUNCE  = 0.7;
const BUMPER_BOUNCE = 1.3;

// Players
const players = [
  { name: 'You', color: '#fff', scores: [], isAI: false },
  { name: 'CPU', color: '#f84', scores: [], isAI: true },
];

// Course definitions
const courses = [
  // Hole 1: Straight shot (Par 2)
  {
    par: 2,
    tee: { x: 250, y: 420 },
    cup: { x: 250, y: 80 },
    walls: [
      { x: 100, y: 30,  w: 300, h: 10 },
      { x: 100, y: 460, w: 300, h: 10 },
      { x: 100, y: 30,  w: 10,  h: 440 },
      { x: 390, y: 30,  w: 10,  h: 440 },
    ],
    bumpers: [], water: [], windmills: [],
    fairways: [{ x: 110, y: 40, w: 280, h: 420 }],
  },
  // Hole 2: L-shaped (Par 3)
  {
    par: 3,
    tee: { x: 150, y: 420 },
    cup: { x: 380, y: 100 },
    walls: [
      { x: 60,  y: 50,  w: 440, h: 10 },
      { x: 60,  y: 460, w: 180, h: 10 },
      { x: 60,  y: 50,  w: 10,  h: 420 },
      { x: 230, y: 50,  w: 10,  h: 230 },
      { x: 230, y: 280, w: 220, h: 10 },
      { x: 440, y: 50,  w: 10,  h: 240 },
      { x: 230, y: 460, w: 10,  h: 10 },
    ],
    bumpers: [{ x: 150, y: 250, r: 10 }], water: [], windmills: [],
    fairways: [{ x: 70, y: 60, w: 160, h: 400 }, { x: 240, y: 60, w: 200, h: 230 }],
  },
  // Hole 3: Water hazard (Par 3)
  {
    par: 3,
    tee: { x: 250, y: 430 },
    cup: { x: 250, y: 70 },
    walls: [
      { x: 80,  y: 30,  w: 340, h: 10 },
      { x: 80,  y: 460, w: 340, h: 10 },
      { x: 80,  y: 30,  w: 10,  h: 440 },
      { x: 410, y: 30,  w: 10,  h: 440 },
    ],
    bumpers: [], water: [{ x: 140, y: 200, w: 220, h: 80 }], windmills: [],
    fairways: [{ x: 90, y: 40, w: 320, h: 420 }],
  },
  // Hole 4: Bumper alley (Par 3)
  {
    par: 3,
    tee: { x: 250, y: 430 },
    cup: { x: 250, y: 70 },
    walls: [
      { x: 100, y: 30,  w: 300, h: 10 },
      { x: 100, y: 460, w: 300, h: 10 },
      { x: 100, y: 30,  w: 10,  h: 440 },
      { x: 390, y: 30,  w: 10,  h: 440 },
    ],
    bumpers: [
      { x: 180, y: 180, r: 12 }, { x: 320, y: 180, r: 12 },
      { x: 250, y: 250, r: 12 },
      { x: 180, y: 320, r: 12 }, { x: 320, y: 320, r: 12 },
    ],
    water: [], windmills: [],
    fairways: [{ x: 110, y: 40, w: 280, h: 420 }],
  },
  // Hole 5: Windmill (Par 3)
  {
    par: 3,
    tee: { x: 250, y: 430 },
    cup: { x: 250, y: 80 },
    walls: [
      { x: 80,  y: 30,  w: 340, h: 10 },
      { x: 80,  y: 460, w: 340, h: 10 },
      { x: 80,  y: 30,  w: 10,  h: 440 },
      { x: 410, y: 30,  w: 10,  h: 440 },
    ],
    bumpers: [], water: [],
    windmills: [{ x: 250, y: 250, armLen: 60, armW: 10, speed: 0.02 }],
    fairways: [{ x: 90, y: 40, w: 320, h: 420 }],
  },
  // Hole 6: Zigzag corridor (Par 4)
  {
    par: 4,
    tee: { x: 130, y: 430 },
    cup: { x: 380, y: 70 },
    walls: [
      { x: 60,  y: 30,  w: 390, h: 10 },
      { x: 60,  y: 460, w: 390, h: 10 },
      { x: 60,  y: 30,  w: 10,  h: 440 },
      { x: 440, y: 30,  w: 10,  h: 440 },
      { x: 200, y: 40,  w: 10,  h: 200 },
      { x: 60,  y: 300, w: 200, h: 10 },
      { x: 310, y: 150, w: 10,  h: 200 },
      { x: 310, y: 340, w: 140, h: 10 },
    ],
    bumpers: [], water: [{ x: 65, y: 140, w: 130, h: 60 }], windmills: [],
    fairways: [
      { x: 70,  y: 40,  w: 130, h: 260 },
      { x: 70,  y: 310, w: 240, h: 150 },
      { x: 210, y: 40,  w: 100, h: 270 },
      { x: 320, y: 40,  w: 120, h: 310 },
      { x: 320, y: 350, w: 120, h: 110 },
    ],
  },
  // Hole 7: Island green (Par 3)
  {
    par: 3,
    tee: { x: 250, y: 430 },
    cup: { x: 250, y: 130 },
    walls: [
      { x: 70,  y: 30,  w: 360, h: 10 },
      { x: 70,  y: 460, w: 360, h: 10 },
      { x: 70,  y: 30,  w: 10,  h: 440 },
      { x: 420, y: 30,  w: 10,  h: 440 },
    ],
    bumpers: [{ x: 170, y: 130, r: 8 }, { x: 330, y: 130, r: 8 }],
    water: [{ x: 130, y: 60, w: 240, h: 140 }], windmills: [],
    fairways: [{ x: 80, y: 40, w: 340, h: 420 }],
    island: { x: 210, y: 90, w: 80, h: 80 },
  },
  // Hole 8: Double windmill (Par 4)
  {
    par: 4,
    tee: { x: 250, y: 440 },
    cup: { x: 250, y: 60 },
    walls: [
      { x: 90,  y: 20,  w: 320, h: 10 },
      { x: 90,  y: 460, w: 320, h: 10 },
      { x: 90,  y: 20,  w: 10,  h: 450 },
      { x: 400, y: 20,  w: 10,  h: 450 },
    ],
    bumpers: [], water: [{ x: 150, y: 340, w: 200, h: 40 }],
    windmills: [
      { x: 200, y: 170, armLen: 45, armW: 8, speed:  0.025 },
      { x: 300, y: 270, armLen: 45, armW: 8, speed: -0.02  },
    ],
    fairways: [{ x: 100, y: 30, w: 300, h: 430 }],
  },
  // Hole 9: The gauntlet (Par 5)
  {
    par: 5,
    tee: { x: 130, y: 440 },
    cup: { x: 370, y: 60 },
    walls: [
      { x: 50,  y: 20,  w: 410, h: 10 },
      { x: 50,  y: 460, w: 410, h: 10 },
      { x: 50,  y: 20,  w: 10,  h: 450 },
      { x: 450, y: 20,  w: 10,  h: 450 },
      { x: 160, y: 20,  w: 10,  h: 160 },
      { x: 160, y: 280, w: 10,  h: 180 },
      { x: 290, y: 100, w: 10,  h: 200 },
      { x: 290, y: 380, w: 10,  h: 80  },
    ],
    bumpers: [
      { x: 120, y: 250, r: 10 }, { x: 220, y: 350, r: 10 },
      { x: 370, y: 200, r: 10 }, { x: 370, y: 350, r: 10 },
    ],
    water: [{ x: 300, y: 250, w: 90, h: 70 }],
    windmills: [{ x: 220, y: 150, armLen: 40, armW: 8, speed: 0.018 }],
    fairways: [
      { x: 60,  y: 30, w: 100, h: 430 },
      { x: 170, y: 30, w: 120, h: 430 },
      { x: 300, y: 30, w: 150, h: 430 },
    ],
  },
];

// ── Module-scope state ──
let currentHole, currentPlayer, turnOrder;
let strokes, balls, lastPositions, ballTrails;
let ballMoving, showScorecard, holeComplete, allSunk;
let aiThinking, aiThinkTimer;
let windmillAngle, animTime;
let sinkAnimations, splashAnimations;
let aiming, aimStart, aimEnd, mousePos;
let score;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// ── Mouse event queue ──
let pendingMouseDown = [];
let pendingMouseUp   = [];
let currentMousePos  = { x: 0, y: 0 };

// ── Helper: clamp mouse coords to canvas space ──
function canvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top)  * (H / rect.height),
  };
}

// ── Physics helpers ──
function isBallMoving(b) {
  return Math.abs(b.vx) > MIN_SPEED || Math.abs(b.vy) > MIN_SPEED;
}

function anyBallMoving() {
  return balls.some(b => !b.sunk && isBallMoving(b));
}

function lineIntersectsSegment(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 0.001) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const left = rect.x, right = rect.x + rect.w;
  const top  = rect.y, bottom = rect.y + rect.h;
  function outcode(x, y) {
    let code = 0;
    if (x < left)   code |= 1;
    else if (x > right)  code |= 2;
    if (y < top)    code |= 4;
    else if (y > bottom) code |= 8;
    return code;
  }
  const oc1 = outcode(x1, y1), oc2 = outcode(x2, y2);
  if (oc1 & oc2) return false;
  if (!(oc1 | oc2)) return true;
  return lineIntersectsSegment(x1, y1, x2, y2, left, top, right, top)     ||
         lineIntersectsSegment(x1, y1, x2, y2, right, top, right, bottom) ||
         lineIntersectsSegment(x1, y1, x2, y2, left, bottom, right, bottom) ||
         lineIntersectsSegment(x1, y1, x2, y2, left, top, left, bottom);
}

function resolveWallCollision(b, wall) {
  const left   = wall.x;
  const right  = wall.x + wall.w;
  const top    = wall.y;
  const bottom = wall.y + wall.h;

  const cx = Math.max(left, Math.min(b.x, right));
  const cy = Math.max(top,  Math.min(b.y, bottom));
  const dx = b.x - cx;
  const dy = b.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < BALL_R && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      b.vx -= (1 + WALL_BOUNCE) * dot * nx;
      b.vy -= (1 + WALL_BOUNCE) * dot * ny;
    }
    const overlap = BALL_R - dist;
    b.x += nx * overlap;
    b.y += ny * overlap;
  }
}

function resolveWindmillCollision(b, wm) {
  const realAngle = windmillAngle;
  for (let a = 0; a < 2; a++) {
    const armAngle = realAngle + a * Math.PI;
    const cosA = Math.cos(armAngle);
    const sinA = Math.sin(armAngle);
    const ax  = wm.x;
    const ay  = wm.y;
    const bx2 = wm.x + cosA * wm.armLen;
    const by2 = wm.y + sinA * wm.armLen;
    const segDx = bx2 - ax;
    const segDy = by2 - ay;
    const len2 = segDx * segDx + segDy * segDy;
    let t = ((b.x - ax) * segDx + (b.y - ay) * segDy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * segDx;
    const cy = ay + t * segDy;
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < BALL_R + wm.armW / 2) {
      const nx = dist > 0 ? dx / dist : 1;
      const ny = dist > 0 ? dy / dist : 0;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= (1 + WALL_BOUNCE) * dot * nx;
        b.vy -= (1 + WALL_BOUNCE) * dot * ny;
        const pushSpeed = wm.speed * wm.armLen * 0.5;
        b.vx += -sinA * pushSpeed;
        b.vy +=  cosA * pushSpeed;
      }
      const overlap = BALL_R + wm.armW / 2 - dist;
      b.x += nx * overlap;
      b.y += ny * overlap;
    }
  }
}

function ballBallCollision() {
  if (balls[0].sunk || balls[1].sunk) return;
  const dx = balls[1].x - balls[0].x;
  const dy = balls[1].y - balls[0].y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < BALL_R * 2 && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const dv0 = balls[0].vx * nx + balls[0].vy * ny;
    const dv1 = balls[1].vx * nx + balls[1].vy * ny;
    balls[0].vx += (dv1 - dv0) * nx;
    balls[0].vy += (dv1 - dv0) * ny;
    balls[1].vx += (dv0 - dv1) * nx;
    balls[1].vy += (dv0 - dv1) * ny;
    const overlap = BALL_R * 2 - dist;
    balls[0].x -= nx * overlap * 0.5;
    balls[0].y -= ny * overlap * 0.5;
    balls[1].x += nx * overlap * 0.5;
    balls[1].y += ny * overlap * 0.5;
  }
}

function updateBall(idx) {
  const b = balls[idx];
  if (b.sunk) return;
  if (!isBallMoving(b)) { b.vx = 0; b.vy = 0; return; }

  b.x += b.vx;
  b.y += b.vy;
  b.vx *= FRICTION;
  b.vy *= FRICTION;

  if (Math.abs(b.vx) < MIN_SPEED * 0.5 && Math.abs(b.vy) < MIN_SPEED * 0.5) {
    b.vx = 0; b.vy = 0;
  }

  const course = courses[currentHole];

  // Trail
  ballTrails[idx].push({ x: b.x, y: b.y, life: 20 });
  if (ballTrails[idx].length > 30) ballTrails[idx].shift();

  // Wall collisions
  for (const wall of course.walls) {
    resolveWallCollision(b, wall);
  }

  // Windmill collisions
  for (const wm of course.windmills) {
    resolveWindmillCollision(b, wm);
  }

  // Bumper collisions
  for (const bmp of course.bumpers) {
    const dx = b.x - bmp.x;
    const dy = b.y - bmp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < BALL_R + bmp.r && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= (1 + BUMPER_BOUNCE) * dot * nx;
        b.vy -= (1 + BUMPER_BOUNCE) * dot * ny;
      }
      const overlap = BALL_R + bmp.r - dist;
      b.x += nx * overlap;
      b.y += ny * overlap;
    }
  }

  // Water hazard
  for (const w of course.water) {
    if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
      // Check if on island
      const isl = course.island;
      if (isl && b.x > isl.x && b.x < isl.x + isl.w && b.y > isl.y && b.y < isl.y + isl.h) {
        // Safe on island
      } else {
        // Splash and return to last position
        splashAnimations.push({ x: b.x, y: b.y, life: 30 });
        b.x  = lastPositions[idx].x;
        b.y  = lastPositions[idx].y;
        b.vx = 0; b.vy = 0;
        strokes[idx]++;
      }
    }
  }

  // Cup sink check
  const dx = b.x - course.cup.x;
  const dy = b.y - course.cup.y;
  const distToCup = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (distToCup < CUP_R && speed < 5) {
    b.sunk = true;
    b.vx = 0; b.vy = 0;
    b.x = course.cup.x; b.y = course.cup.y;
    sinkAnimations.push({ x: b.x, y: b.y, life: 40, player: idx });
  }
}

// ── AI ──
function startAITurn() {
  aiThinking  = true;
  aiThinkTimer = 45;
}

function executeAIShot() {
  const b      = balls[1];
  const course = courses[currentHole];
  const cup    = course.cup;

  let targetX = cup.x;
  let targetY = cup.y;
  const dxC = targetX - b.x;
  const dyC = targetY - b.y;
  const distC = Math.sqrt(dxC * dxC + dyC * dyC);

  let directPath = true;
  for (const wall of course.walls) {
    if (lineIntersectsRect(b.x, b.y, targetX, targetY, wall)) { directPath = false; break; }
  }
  if (directPath) {
    for (const wm of course.windmills) {
      const wmDist = Math.sqrt((b.x - wm.x) ** 2 + (b.y - wm.y) ** 2);
      if (wmDist < wm.armLen + 30) { directPath = false; break; }
    }
  }
  if (directPath) {
    for (const w of course.water) {
      if (lineIntersectsRect(b.x, b.y, targetX, targetY, w)) {
        if (!course.island) { directPath = false; break; }
      }
    }
  }

  let power, angle;

  if (directPath) {
    angle = Math.atan2(dyC, dxC);
    power = Math.min(distC * 0.06, MAX_POWER * 0.85);
    angle += (Math.random() - 0.5) * 0.12;
    power *= 0.9 + Math.random() * 0.2;
  } else {
    const candidates = [];
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      for (let d = 60; d < 200; d += 40) {
        const tx = b.x + Math.cos(a) * d;
        const ty = b.y + Math.sin(a) * d;
        if (tx < 60 || tx > 440 || ty < 30 || ty > 470) continue;
        let inWater = false;
        for (const w of course.water) {
          if (tx > w.x && tx < w.x + w.w && ty > w.y && ty < w.y + w.h) { inWater = true; break; }
        }
        if (inWater) continue;
        let pathClear = true;
        for (const wall of course.walls) {
          if (lineIntersectsRect(b.x, b.y, tx, ty, wall)) { pathClear = false; break; }
        }
        if (!pathClear) continue;
        const distToCup = Math.sqrt((tx - cup.x) ** 2 + (ty - cup.y) ** 2);
        candidates.push({ x: tx, y: ty, score: -distToCup });
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best  = candidates[0];
      const bdx   = best.x - b.x;
      const bdy   = best.y - b.y;
      angle = Math.atan2(bdy, bdx);
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
      power = Math.min(bDist * 0.055, MAX_POWER * 0.7);
    } else {
      angle = Math.atan2(dyC, dxC);
      power = Math.min(distC * 0.05, MAX_POWER * 0.6);
    }
    angle += (Math.random() - 0.5) * 0.18;
    power *= 0.85 + Math.random() * 0.3;
  }

  power = Math.max(2, Math.min(power, MAX_POWER));
  lastPositions[1] = { x: b.x, y: b.y };
  b.vx = Math.cos(angle) * power;
  b.vy = Math.sin(angle) * power;
  strokes[1]++;
  ballMoving  = true;
  aiThinking  = false;
}

// ── Score helpers ──
function scoreLabel(s, par) {
  const diff = s - par;
  if (s === 1)        return 'ACE!';
  if (diff <= -3)     return 'Albatross';
  if (diff === -2)    return 'Eagle';
  if (diff === -1)    return 'Birdie';
  if (diff === 0)     return 'Par';
  if (diff === 1)     return 'Bogey';
  if (diff === 2)     return 'Dbl Bogey';
  return '+' + diff;
}

function totalScore(idx) {
  return players[idx].scores.reduce((a, b) => a + b, 0);
}

function totalPar() {
  let p = 0;
  for (let i = 0; i < players[0].scores.length; i++) p += courses[i].par;
  return p;
}

function relativeScore(idx) {
  const t    = totalScore(idx);
  const p    = totalPar();
  if (p === 0) return 'E';
  const diff = t - p;
  if (diff === 0) return 'E';
  if (diff > 0)   return '+' + diff;
  return '' + diff;
}

// ── Setup / init ──
function setupHole() {
  const course = courses[currentHole];
  strokes       = [0, 0];
  holeComplete  = false;
  allSunk       = false;
  ballTrails    = [[], []];
  sinkAnimations   = [];
  splashAnimations = [];
  for (let i = 0; i < 2; i++) {
    balls[i] = {
      x: course.tee.x + (i === 0 ? -12 : 12),
      y: course.tee.y,
      vx: 0, vy: 0, sunk: false,
    };
    lastPositions[i] = { x: balls[i].x, y: balls[i].y };
  }
  currentPlayer = turnOrder[0];
  aiming        = false;
  ballMoving    = false;
  aiThinking    = false;
  if (scoreEl) scoreEl.textContent = (currentHole + 1);
  if (currentPlayer === 1) startAITurn();
}

function handleScorecardClick() {
  if (currentHole < 8) {
    if (players[0].scores[currentHole] <= players[1].scores[currentHole]) {
      turnOrder = [0, 1];
    } else {
      turnOrder = [1, 0];
    }
    currentHole++;
    showScorecard = false;
    setupHole();
  } else {
    const s0   = totalScore(0);
    const best = localStorage.getItem('golfIt_best');
    if (!best || s0 < parseInt(best)) {
      localStorage.setItem('golfIt_best', s0);
      if (bestEl) bestEl.textContent = s0;
    }
    showScorecard = false;
    score = s0;
    // game.setState('over') is called outside
    _pendingGameOver = true;
  }
}
let _pendingGameOver = false;

// ── Draw helpers ──
function drawScorecard(renderer, text) {
  renderer.fillRect(0, 0, W, H, 'rgba(10,10,25,0.95)');

  text.drawText('SCORECARD', W / 2, 18, 16, THEME, 'center');

  const startX = 30;
  const startY = 60;
  const colW   = 42;
  const rowH   = 26;
  const labelW = 50;

  // Header row
  text.drawText('Hole', startX + labelW / 2, startY + rowH / 2 - 6, 10, '#888', 'center');
  for (let i = 0; i < 9; i++) {
    const col = i <= currentHole ? '#aaa' : '#444';
    text.drawText('' + (i + 1), startX + labelW + i * colW + colW / 2, startY + rowH / 2 - 6, 10, col, 'center');
  }
  text.drawText('TOT', startX + labelW + 9 * colW + colW / 2, startY + rowH / 2 - 6, 10, THEME, 'center');

  // Par row
  const parY = startY + rowH;
  text.drawText('Par', startX + labelW / 2, parY + rowH / 2 - 6, 10, '#666', 'center');
  let totalParVal = 0;
  for (let i = 0; i < 9; i++) {
    const col = i <= currentHole ? '#777' : '#333';
    text.drawText('' + courses[i].par, startX + labelW + i * colW + colW / 2, parY + rowH / 2 - 6, 10, col, 'center');
    totalParVal += courses[i].par;
  }
  text.drawText('' + totalParVal, startX + labelW + 9 * colW + colW / 2, parY + rowH / 2 - 6, 10, '#777', 'center');

  // Player rows
  for (let p = 0; p < 2; p++) {
    const py = startY + (p + 2) * rowH;
    text.drawText(players[p].name, startX + labelW / 2, py + rowH / 2 - 6, 10, players[p].color, 'center');
    let total = 0;
    for (let i = 0; i < 9; i++) {
      if (i < players[p].scores.length) {
        const s    = players[p].scores[i];
        total += s;
        const diff = s - courses[i].par;
        let col;
        if (diff <= -2)     col = '#4cf';
        else if (diff === -1) col = '#4f4';
        else if (diff === 0)  col = '#fff';
        else if (diff === 1)  col = '#fa4';
        else                  col = '#f44';
        text.drawText('' + s, startX + labelW + i * colW + colW / 2, py + rowH / 2 - 6, 10, col, 'center');
      } else {
        text.drawText('-', startX + labelW + i * colW + colW / 2, py + rowH / 2 - 6, 10, '#333', 'center');
      }
    }
    if (players[p].scores.length > 0) {
      text.drawText('' + total, startX + labelW + 9 * colW + colW / 2, py + rowH / 2 - 6, 10, players[p].color, 'center');
    }

    // Row divider
    renderer.drawLine(startX, py + rowH, startX + labelW + 10 * colW + colW, py + rowH, '#333', 0.5);
  }

  // Grid lines — vertical
  for (let i = 0; i <= 10; i++) {
    const x = startX + labelW + i * colW;
    renderer.drawLine(x, startY, x, startY + 4 * rowH, '#333', 0.5);
  }
  // Grid lines — horizontal
  for (let i = 0; i <= 4; i++) {
    renderer.drawLine(startX, startY + i * rowH, startX + labelW + 10 * colW + colW, startY + i * rowH, '#333', 0.5);
  }

  // Hole result summary
  const summY = startY + 5 * rowH + 20;
  for (let p = 0; p < 2; p++) {
    if (currentHole < players[p].scores.length) {
      const s     = players[p].scores[currentHole];
      const label = scoreLabel(s, courses[currentHole].par);
      text.drawText(
        players[p].name + ': ' + s + ' strokes (' + label + ')',
        W / 2, summY + p * 24, 14, players[p].color, 'center'
      );
    }
  }

  // Continue / end message
  if (currentHole < 8) {
    text.drawText('Click to continue to next hole', W / 2, H - 46, 12, '#666', 'center');
  } else {
    const s0 = totalScore(0);
    const s1 = totalScore(1);
    let winText, winColor;
    if (s0 < s1)      { winText = 'YOU WIN!';   winColor = THEME; }
    else if (s1 < s0) { winText = 'CPU WINS!';  winColor = '#f84'; }
    else              { winText = 'TIE GAME!';  winColor = '#ff4'; }
    renderer.setGlow(winColor, 0.8);
    text.drawText(winText, W / 2, H - 86, 18, winColor, 'center');
    renderer.setGlow(null);
    text.drawText('Click to play again', W / 2, H - 46, 12, '#666', 'center');
  }
}

function drawHUD(renderer, text) {
  const course = courses[currentHole];

  renderer.fillRect(0, 0, W, 28, 'rgba(0,0,0,0.65)');

  renderer.setGlow(THEME, 0.4);
  text.drawText('Hole ' + (currentHole + 1) + '/9  Par ' + course.par, 8, 3, 11, THEME, 'left');
  renderer.setGlow(null);

  if (!holeComplete) {
    const turnColor = currentPlayer === 0 ? '#fff' : '#f84';
    text.drawText(players[currentPlayer].name + "'s turn", W / 2, 3, 11, turnColor, 'center');
  } else {
    text.drawText('Hole Complete!', W / 2, 3, 11, THEME, 'center');
  }

  text.drawText('You:' + strokes[0], W - 80, 3, 11, '#fff', 'left');
  text.drawText('CPU:' + strokes[1], W - 8,  3, 11, '#f84', 'right');

  if (players[0].scores.length > 0) {
    renderer.fillRect(0, H - 14, W, 14, 'rgba(0,0,0,0.55)');
    text.drawText(
      'Total: You ' + relativeScore(0) + ' (' + totalScore(0) + ')  |  CPU ' + relativeScore(1) + ' (' + totalScore(1) + ')',
      W / 2, H - 13, 10, '#aaa', 'center'
    );
  }
}

// ── Pre-compute rotated windmill arm corners ──
function windmillArmPoly(wm, armIndex) {
  const armAngle = windmillAngle + armIndex * Math.PI;
  const cosA = Math.cos(armAngle);
  const sinA = Math.sin(armAngle);
  const hw   = wm.armW / 2;
  // Rectangle: from (0, -hw) to (armLen, hw) rotated by armAngle about (wm.x, wm.y)
  const corners = [
    { lx: 0,        ly: -hw },
    { lx: wm.armLen, ly: -hw },
    { lx: wm.armLen, ly:  hw },
    { lx: 0,        ly:  hw },
  ];
  return corners.map(c => ({
    x: wm.x + c.lx * cosA - c.ly * sinA,
    y: wm.y + c.lx * sinA + c.ly * cosA,
  }));
}

// ── Main draw ──
function drawGame(renderer, text) {
  renderer.fillRect(0, 0, W, H, '#0a0a18');

  if (showScorecard) {
    drawScorecard(renderer, text);
    return;
  }

  const course = courses[currentHole];

  // Fairways
  for (const f of course.fairways) {
    renderer.fillRect(f.x, f.y, f.w, f.h, FAIRWAY);
  }

  // Fairway grass texture (deterministic dots)
  for (const f of course.fairways) {
    for (let gx = f.x + 8; gx < f.x + f.w; gx += 16) {
      for (let gy = f.y + 8; gy < f.y + f.h; gy += 16) {
        const ox = ((gx * 7 + gy * 13) % 11) - 5;
        const oy = ((gx * 3 + gy * 17) % 9)  - 4;
        renderer.fillRect(gx + ox, gy + oy, 1, 3, 'rgba(30,70,30,0.3)');
      }
    }
  }

  // Island
  if (course.island) {
    const isl = course.island;
    renderer.fillRect(isl.x, isl.y, isl.w, isl.h, '#1a4a1a');
    renderer.strokePoly([
      { x: isl.x,           y: isl.y },
      { x: isl.x + isl.w,   y: isl.y },
      { x: isl.x + isl.w,   y: isl.y + isl.h },
      { x: isl.x,           y: isl.y + isl.h },
    ], '#2a5a2a', 1, true);
  }

  // Water
  for (const w of course.water) {
    renderer.fillRect(w.x, w.y, w.w, w.h, WATER_COLOR);
    // Animated water ripples: 3 sine curves drawn as line segments
    for (let i = 0; i < 3; i++) {
      const baseY  = w.y + 10 + i * 25;
      const offset = (animTime * 0.5 + i * 20) % 60;
      const midX   = w.x + w.w / 2;
      const amplitude = Math.sin(animTime * 0.05) * 5;
      // Draw as a polyline approximation of a quadratic curve
      const steps  = 12;
      const pts    = [];
      for (let s = 0; s <= steps; s++) {
        const tx = w.x + offset + (w.w - 2 * offset) * s / steps;
        const tLocal = s / steps;
        // Quadratic: y = baseY + amplitude * 4 * t * (1-t) ... approx arc
        const ty = baseY + amplitude * (4 * tLocal * (1 - tLocal) - 0) * (i % 2 === 0 ? 1 : -1) * 0.5;
        pts.push({ x: tx, y: ty });
      }
      renderer.strokePoly(pts, WATER_EDGE, 1, false);
    }
  }

  // Walls
  for (const wall of course.walls) {
    renderer.setGlow('#888', 0.2);
    renderer.fillRect(wall.x, wall.y, wall.w, wall.h, WALL_COLOR);
    renderer.setGlow(null);
    // Highlight edge
    if (wall.h <= wall.w) {
      renderer.fillRect(wall.x, wall.y, wall.w, 2, '#778');
    } else {
      renderer.fillRect(wall.x, wall.y, 2, wall.h, '#778');
    }
  }

  // Bumpers
  for (const bmp of course.bumpers) {
    renderer.setGlow('#f66', 0.6);
    renderer.fillCircle(bmp.x, bmp.y, bmp.r, '#d44');
    renderer.setGlow(null);
    renderer.strokePoly(circlePoints(bmp.x, bmp.y, bmp.r, 20), '#faa', 1.5, true);
  }

  // Windmills
  for (const wm of course.windmills) {
    // Hub
    renderer.fillCircle(wm.x, wm.y, 6, '#886');
    renderer.strokePoly(circlePoints(wm.x, wm.y, 6, 16), '#aa8', 1, true);
    // Arms
    for (let a = 0; a < 2; a++) {
      const poly = windmillArmPoly(wm, a);
      renderer.setGlow('#da8', 0.3);
      renderer.fillPoly(poly, '#a86');
      renderer.setGlow(null);
      renderer.strokePoly(poly, '#c98', 1, true);
    }
  }

  // Cup
  renderer.setGlow('#000', 0.4);
  renderer.fillCircle(course.cup.x, course.cup.y, CUP_R, CUP_COLOR);
  renderer.setGlow(null);
  renderer.strokePoly(circlePoints(course.cup.x, course.cup.y, CUP_R, 20), '#444', 1.5, true);
  renderer.strokePoly(circlePoints(course.cup.x, course.cup.y, CUP_R - 3, 16), '#333', 1, true);
  // Flag pole
  renderer.drawLine(course.cup.x, course.cup.y, course.cup.x, course.cup.y - 20, '#ccc', 1.5);
  // Flag pennant
  renderer.fillPoly([
    { x: course.cup.x,      y: course.cup.y - 20 },
    { x: course.cup.x + 10, y: course.cup.y - 16 },
    { x: course.cup.x,      y: course.cup.y - 12 },
  ], FLAG_COLOR);

  // Ball trails
  for (let p = 0; p < 2; p++) {
    for (const t of ballTrails[p]) {
      const alpha = t.life / 20;
      const r     = BALL_R * alpha * 0.6;
      if (r < 0.5) continue;
      const col = p === 0
        ? `rgba(255,255,255,${(alpha * 0.3).toFixed(2)})`
        : `rgba(255,136,68,${(alpha * 0.3).toFixed(2)})`;
      renderer.fillCircle(t.x, t.y, r, col);
    }
  }

  // Splash animations
  for (const sp of splashAnimations) {
    const progress = 1 - sp.life / 30;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + progress * 2;
      const r     = 5 + progress * 20;
      const sx    = sp.x + Math.cos(angle) * r;
      const sy    = sp.y + Math.sin(angle) * r;
      const a     = ((1 - progress) * 0.8).toFixed(2);
      renderer.fillCircle(sx, sy, 2 * (1 - progress), `rgba(80,160,255,${a})`);
    }
  }

  // Sink animations
  for (const sa of sinkAnimations) {
    const progress = 1 - sa.life / 40;
    const baseColor = sa.player === 0 ? '136,255,68' : '255,136,68';
    const a = ((1 - progress) * 0.8).toFixed(2);
    renderer.strokePoly(
      circlePoints(sa.x, sa.y, CUP_R + progress * 15, 24),
      `rgba(${baseColor},${a})`, 2, true
    );
  }

  // Balls
  for (let p = 0; p < 2; p++) {
    const b = balls[p];
    if (b.sunk) continue;
    // Glow halo
    const glowColor = p === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,136,68,0.15)';
    renderer.setGlow(players[p].color, 0.8);
    renderer.fillCircle(b.x, b.y, BALL_R + 3, glowColor);
    // Ball fill
    renderer.fillCircle(b.x, b.y, BALL_R, players[p].color);
    renderer.setGlow(null);
    // Outline
    const strokeCol = p === 0 ? '#ccc' : '#c64';
    renderer.strokePoly(circlePoints(b.x, b.y, BALL_R, 16), strokeCol, 1, true);
    // Label
    text.drawText(p === 0 ? 'P' : 'C', b.x, b.y - 3.5, 7, '#000', 'center');
  }

  // Aiming line
  if (aiming && !players[currentPlayer].isAI) {
    const b    = balls[currentPlayer];
    const dx   = aimStart.x - aimEnd.x;
    const dy   = aimStart.y - aimEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power  = Math.min(dist * 0.1, MAX_POWER);
    const angle  = Math.atan2(dy, dx);
    const lineLen = power * 8;
    const tipX   = b.x + Math.cos(angle) * lineLen;
    const tipY   = b.y + Math.sin(angle) * lineLen;

    // Dashed aim line (simulate with segments)
    renderer.setGlow(THEME, 0.5);
    renderer.dashedLine(b.x, b.y, tipX, tipY, 'rgba(136,255,68,0.7)', 2, 4, 4);
    renderer.setGlow(null);

    // Arrow head
    renderer.drawLine(tipX, tipY, tipX - Math.cos(angle - 0.3) * 8, tipY - Math.sin(angle - 0.3) * 8, THEME, 2);
    renderer.drawLine(tipX, tipY, tipX - Math.cos(angle + 0.3) * 8, tipY - Math.sin(angle + 0.3) * 8, THEME, 2);

    // Drag line (ball to mouse, faded)
    renderer.dashedLine(b.x, b.y, aimEnd.x, aimEnd.y, 'rgba(255,255,255,0.15)', 1, 2, 4);

    // Power bar
    const pct      = power / MAX_POWER;
    const barColor = pct < 0.5 ? THEME : (pct < 0.8 ? '#ff4' : '#f44');
    renderer.fillRect(10, H - 28, 120, 14, 'rgba(0,0,0,0.6)');
    renderer.setGlow(barColor, 0.3);
    renderer.fillRect(10, H - 28, 120 * pct, 14, barColor);
    renderer.setGlow(null);
    renderer.strokePoly([
      { x: 10,  y: H - 28 },
      { x: 130, y: H - 28 },
      { x: 130, y: H - 14 },
      { x: 10,  y: H - 14 },
    ], '#666', 1, true);
    text.drawText('POWER', 14, H - 28, 9, '#fff', 'left');
  }

  drawHUD(renderer, text);

  // AI thinking indicator
  if (aiThinking) {
    renderer.fillRect(W / 2 - 65, H / 2 - 16, 130, 32, 'rgba(0,0,0,0.6)');
    renderer.strokePoly([
      { x: W / 2 - 65, y: H / 2 - 16 },
      { x: W / 2 + 65, y: H / 2 - 16 },
      { x: W / 2 + 65, y: H / 2 + 16 },
      { x: W / 2 - 65, y: H / 2 + 16 },
    ], '#f84', 1, true);
    const dots = '.'.repeat((Math.floor(animTime / 15) % 3) + 1);
    text.drawText('CPU thinking' + dots, W / 2, H / 2 - 6, 12, '#f84', 'center');
  }
}

// ── Utility: approximate circle as polygon ──
function circlePoints(cx, cy, r, segments = 20) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (Math.PI * 2 * i) / segments;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// ── Export ──
export function createGame() {
  const game = new Game('game');

  // Load best score
  const savedBest = localStorage.getItem('golfIt_best');
  if (savedBest && bestEl) bestEl.textContent = savedBest;

  game.onInit = () => {
    // Init game state
    currentHole   = 0;
    currentPlayer = 0;
    turnOrder     = [0, 1];
    players[0].scores = [];
    players[1].scores = [];
    score         = 0;
    aiming        = false;
    aimStart      = { x: 0, y: 0 };
    aimEnd        = { x: 0, y: 0 };
    mousePos      = { x: 0, y: 0 };
    windmillAngle = 0;
    animTime      = 0;
    balls         = [
      { x: 0, y: 0, vx: 0, vy: 0, sunk: false },
      { x: 0, y: 0, vx: 0, vy: 0, sunk: false },
    ];
    lastPositions  = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    ballTrails     = [[], []];
    strokes        = [0, 0];
    ballMoving     = false;
    showScorecard  = false;
    holeComplete   = false;
    allSunk        = false;
    aiThinking     = false;
    aiThinkTimer   = 0;
    sinkAnimations   = [];
    splashAnimations = [];
    _pendingGameOver = false;

    game.showOverlay('GOLF IT', 'Click to Start\n\nCompetitive mini-golf: You vs CPU\nClick your ball, drag to aim, release to putt');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Mouse event listeners on canvas ──
  const canvas = document.getElementById('game');

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousedown', (e) => {
    if (game.state !== 'playing') return;
    if (ballMoving || holeComplete || showScorecard) return;
    if (players[currentPlayer].isAI) return;

    const pos = canvasCoords(e, canvas);
    const b   = balls[currentPlayer];
    if (b.sunk) return;

    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    if (Math.sqrt(dx * dx + dy * dy) < 35) {
      aiming   = true;
      aimStart = { x: pos.x, y: pos.y };
      aimEnd   = { x: pos.x, y: pos.y };
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = canvasCoords(e, canvas);
    mousePos  = pos;
    if (aiming) {
      aimEnd = { x: pos.x, y: pos.y };
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!aiming) return;
    aiming = false;

    const b    = balls[currentPlayer];
    const dx   = aimStart.x - aimEnd.x;
    const dy   = aimStart.y - aimEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const power = Math.min(dist * 0.1, MAX_POWER);
    const angle = Math.atan2(dy, dx);

    lastPositions[currentPlayer] = { x: b.x, y: b.y };
    b.vx = Math.cos(angle) * power;
    b.vy = Math.sin(angle) * power;
    strokes[currentPlayer]++;
    ballMoving = true;
  });

  // Scorecard click
  canvas.addEventListener('click', (e) => {
    if (game.state !== 'playing') return;
    if (showScorecard) {
      handleScorecardClick();
    }
  });

  // ── onUpdate: fixed 60 Hz game logic ──
  game.onUpdate = () => {
    if (game.state === 'waiting') return;

    if (game.state === 'playing' && _pendingGameOver) {
      _pendingGameOver = false;
      const s0 = totalScore(0);
      const s1 = totalScore(1);
      const winner = s0 < s1 ? 'You win!' : (s1 < s0 ? 'CPU wins!' : 'Tie game!');
      game.setState('over');
      game.showOverlay('GAME OVER',
        winner + '\nYou: ' + s0 + ' (' + relativeScore(0) + ') | CPU: ' + s1 + ' (' + relativeScore(1) + ')\n\nClick to play again');
      return;
    }

    if (game.state !== 'playing') return;

    animTime++;
    windmillAngle += 0.02;

    // Decay trails
    for (let p = 0; p < 2; p++) {
      for (let i = ballTrails[p].length - 1; i >= 0; i--) {
        ballTrails[p][i].life--;
        if (ballTrails[p][i].life <= 0) ballTrails[p].splice(i, 1);
      }
    }

    // Decay animations
    for (let i = sinkAnimations.length - 1; i >= 0; i--) {
      sinkAnimations[i].life--;
      if (sinkAnimations[i].life <= 0) sinkAnimations.splice(i, 1);
    }
    for (let i = splashAnimations.length - 1; i >= 0; i--) {
      splashAnimations[i].life--;
      if (splashAnimations[i].life <= 0) splashAnimations.splice(i, 1);
    }

    if (showScorecard) return;

    // AI thinking
    if (aiThinking) {
      aiThinkTimer--;
      if (aiThinkTimer <= 0) executeAIShot();
      return;
    }

    // Physics
    if (ballMoving) {
      updateBall(currentPlayer);
      const other = 1 - currentPlayer;
      if (isBallMoving(balls[other]) && !balls[other].sunk) {
        updateBall(other);
      }
      ballBallCollision();

      if (!anyBallMoving()) {
        ballMoving = false;
        balls[0].vx = 0; balls[0].vy = 0;
        balls[1].vx = 0; balls[1].vy = 0;

        // Both sunk?
        if (balls[0].sunk && balls[1].sunk) {
          allSunk      = true;
          holeComplete = true;
          players[0].scores.push(strokes[0]);
          players[1].scores.push(strokes[1]);
          score = totalScore(0);
          if (scoreEl) scoreEl.textContent = (currentHole + 1);
          setTimeout(() => { showScorecard = true; }, 800);
          return;
        }

        // Current player sunk?
        if (balls[currentPlayer].sunk) {
          if (!balls[1 - currentPlayer].sunk) {
            currentPlayer = 1 - currentPlayer;
            if (players[currentPlayer].isAI) startAITurn();
          }
          return;
        }

        // Max strokes (10)
        if (strokes[currentPlayer] >= 10) {
          balls[currentPlayer].sunk = true;
          if (balls[0].sunk && balls[1].sunk) {
            allSunk      = true;
            holeComplete = true;
            players[0].scores.push(strokes[0]);
            players[1].scores.push(strokes[1]);
            score = totalScore(0);
            setTimeout(() => { showScorecard = true; }, 800);
            return;
          }
          if (!balls[1 - currentPlayer].sunk) {
            currentPlayer = 1 - currentPlayer;
            if (players[currentPlayer].isAI) startAITurn();
          }
          return;
        }

        // Alternate turns
        const nextPlayer = 1 - currentPlayer;
        if (!balls[nextPlayer].sunk) currentPlayer = nextPlayer;
        if (players[currentPlayer].isAI && !balls[currentPlayer].sunk) startAITurn();
      }
    }
  };

  // ── onDraw ──
  game.onDraw = (renderer, text) => {
    drawGame(renderer, text);
  };

  // ── Overlay click → start / restart ──
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'pointer';
    overlay.addEventListener('click', () => {
      if (game.state === 'waiting' || game.state === 'over') {
        // Reset and start
        currentHole   = 0;
        currentPlayer = 0;
        turnOrder     = [0, 1];
        players[0].scores = [];
        players[1].scores = [];
        score         = 0;
        _pendingGameOver = false;
        setupHole();
        game.setState('playing');
      }
    });
  }

  game.start();
  return game;
}
