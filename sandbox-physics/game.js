// sandbox-physics/game.js — Sandbox Physics as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 500;
const HALF = W / 2;
const GRAVITY = 0.35;
const FRICTION = 0.985;
const BOUNCE = 0.4;
const DT = 1;

// ── Game State ──
let gameState = 'menu';
let score = { p1: 0, ai: 0 };
let currentTool = 'wood';
let challengeIndex = 0;
let buildTimer = 30;
let phase = 'build'; // build, test, results
let timerInterval = null;
let p1Objects = [];
let aiObjects = [];
let p1Connections = [];
let aiConnections = [];
let dragStart = null;
let dragObj = null;
let mouseX = 0;
let mouseY = 0;
let testFrames = 0;
const maxTestFrames = 300;
let challengeResult = { p1: 0, ai: 0 };
let particles = [];

// ── Challenges ──
const challenges = [
  { name: 'Launch Ball to Target', desc: 'Build a launcher to send the ball to the target zone', type: 'launch',
    setup: (side) => ({ ball: { x: side === 'left' ? 60 : HALF + 60, y: 380, r: 8 }, target: { x: side === 'left' ? 220 : HALF + 220, y: 100, w: 50, h: 50 } }) },
  { name: 'Build Tallest Tower', desc: 'Stack objects as high as possible - height measured after test', type: 'tower',
    setup: (side) => ({ base: { x: side === 'left' ? 150 : HALF + 150, y: 440 } }) },
  { name: 'Bridge the Gap', desc: 'Build a bridge so the ball rolls across the gap', type: 'bridge',
    setup: (side) => ({ gap: { x: side === 'left' ? 80 : HALF + 80, w: 140 }, ball: { x: side === 'left' ? 30 : HALF + 30, y: 350, r: 8 } }) },
  { name: 'Protect the Egg', desc: 'Build a structure to cushion the falling egg', type: 'protect',
    setup: (side) => ({ egg: { x: side === 'left' ? 150 : HALF + 150, y: 40, r: 10 }, zone: { x: side === 'left' ? 100 : HALF + 100, y: 420, w: 100, h: 30 } }) },
  { name: 'Rube Goldberg', desc: 'Chain reactions! Move ball from start to finish zone', type: 'rube',
    setup: (side) => ({ ball: { x: side === 'left' ? 40 : HALF + 40, y: 80, r: 8 }, finish: { x: side === 'left' ? 220 : HALF + 220, y: 420, w: 50, h: 40 } }) },
];

// ── Physics Objects ──
class PhysObj {
  constructor(x, y, type, w, h) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.type = type;
    this.w = w || 40; this.h = h || 20;
    this.r = type === 'wheel' ? 14 : (type === 'ball' || type === 'egg') ? (h || 8) : 0;
    this.angle = 0; this.va = 0;
    this.mass = type === 'metal' ? 3 : type === 'rubber' ? 0.8 : type === 'wheel' ? 1.5 : type === 'rocket' ? 0.5 : 1;
    this.bounce = type === 'rubber' ? 0.75 : type === 'metal' ? 0.2 : BOUNCE;
    this.friction = type === 'rubber' ? 0.95 : FRICTION;
    this.fixed = false;
    this.rocketFuel = type === 'rocket' ? 120 : 0;
    this.color = this.getColor();
    this.alive = true;
  }
  getColor() {
    switch (this.type) {
      case 'wood':   return '#c97';
      case 'metal':  return '#99a';
      case 'rubber': return '#e74';
      case 'wheel':  return '#555';
      case 'spring': return '#4ce';
      case 'rocket': return '#f84';
      case 'ball':   return '#ff5';
      case 'egg':    return '#ffe';
      default:       return '#8a4';
    }
  }
  get cx() { return this.r > 0 ? this.x : this.x + this.w / 2; }
  get cy() { return this.r > 0 ? this.y : this.y + this.h / 2; }
}

class Connection {
  constructor(a, b, type) {
    this.a = a; this.b = b;
    this.type = type;
    this.restLen = dist(a.cx, a.cy, b.cx, b.cy);
    this.stiffness = type === 'spring' ? 0.05 : type === 'rope' ? 0.3 : 0.8;
  }
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function hitTest(obj, mx, my) {
  if (obj.r > 0) return dist(obj.x, obj.y, mx, my) < obj.r + 8;
  return mx >= obj.x - 4 && mx <= obj.x + obj.w + 4 && my >= obj.y - 4 && my <= obj.y + obj.h + 4;
}

// ── AI Builder ──
function aiBuilds(ch) {
  aiObjects = aiObjects.filter(o => o.type === 'ball' || o.type === 'egg');
  aiConnections = [];
  const ox = HALF;

  switch (ch.type) {
    case 'launch': {
      const ramp1 = new PhysObj(ox + 40, 370, 'wood', 50, 12);
      const ramp2 = new PhysObj(ox + 50, 355, 'wood', 50, 12); ramp2.angle = -0.3;
      const ramp3 = new PhysObj(ox + 60, 335, 'metal', 50, 12); ramp3.angle = -0.4;
      const base1 = new PhysObj(ox + 30, 400, 'metal', 50, 20);
      const base2 = new PhysObj(ox + 30, 420, 'metal', 60, 20);
      const rocket1 = new PhysObj(ox + 55, 295, 'rocket', 16, 40);
      const spring1 = new PhysObj(ox + 80, 380, 'spring', 10, 30);
      aiObjects.push(base1, base2, ramp1, ramp2, ramp3, rocket1, spring1);
      aiConnections.push(new Connection(base1, ramp1, 'hinge'));
      aiConnections.push(new Connection(ramp1, ramp2, 'hinge'));
      aiConnections.push(new Connection(ramp2, ramp3, 'hinge'));
      aiConnections.push(new Connection(ramp3, rocket1, 'rope'));
      break;
    }
    case 'tower': {
      for (let i = 0; i < 7; i++) {
        const block = new PhysObj(ox + 130 + (i % 2) * 5, 430 - i * 22, i % 3 === 0 ? 'metal' : 'wood', 44, 20);
        aiObjects.push(block);
        if (i > 0) aiConnections.push(new Connection(aiObjects[aiObjects.length - 2], block, 'hinge'));
      }
      const sup1 = new PhysObj(ox + 110, 390, 'wood', 15, 60);
      const sup2 = new PhysObj(ox + 175, 390, 'wood', 15, 60);
      aiObjects.push(sup1, sup2);
      aiConnections.push(new Connection(sup1, aiObjects[1], 'hinge'));
      aiConnections.push(new Connection(sup2, aiObjects[1], 'hinge'));
      break;
    }
    case 'bridge': {
      const gx = ox + 80;
      for (let i = 0; i < 5; i++) {
        const plank = new PhysObj(gx + i * 30, 395, i % 2 === 0 ? 'metal' : 'wood', 34, 10);
        aiObjects.push(plank);
        if (i > 0) aiConnections.push(new Connection(aiObjects[aiObjects.length - 2], plank, 'hinge'));
      }
      const s1 = new PhysObj(gx + 20, 410, 'metal', 40, 15);
      const s2 = new PhysObj(gx + 80, 410, 'metal', 40, 15);
      const s3 = new PhysObj(gx + 50, 420, 'metal', 50, 12);
      aiObjects.push(s1, s2, s3);
      aiConnections.push(new Connection(s1, aiObjects[1], 'rope'));
      aiConnections.push(new Connection(s2, aiObjects[3], 'rope'));
      break;
    }
    case 'protect': {
      const ex = ox + 120;
      const r1 = new PhysObj(ex, 350, 'rubber', 50, 15);
      const r2 = new PhysObj(ex + 20, 370, 'rubber', 50, 15);
      const r3 = new PhysObj(ex - 10, 380, 'rubber', 50, 15);
      const r4 = new PhysObj(ex + 10, 395, 'rubber', 60, 15);
      const s1 = new PhysObj(ex - 20, 320, 'spring', 10, 30);
      const s2 = new PhysObj(ex + 60, 320, 'spring', 10, 30);
      const w1 = new PhysObj(ex - 10, 410, 'metal', 80, 15); w1.fixed = true;
      aiObjects.push(r1, r2, r3, r4, s1, s2, w1);
      aiConnections.push(new Connection(s1, r1, 'spring'));
      aiConnections.push(new Connection(s2, r1, 'spring'));
      aiConnections.push(new Connection(r1, r2, 'rope'));
      aiConnections.push(new Connection(r2, r3, 'rope'));
      aiConnections.push(new Connection(r3, r4, 'rope'));
      break;
    }
    case 'rube': {
      const bx = ox + 20;
      const ramp1 = new PhysObj(bx + 40, 120, 'wood', 60, 10); ramp1.angle = 0.3;
      const ramp2 = new PhysObj(bx + 120, 200, 'wood', 60, 10); ramp2.angle = -0.3;
      const ramp3 = new PhysObj(bx + 40, 280, 'wood', 60, 10); ramp3.angle = 0.3;
      const ramp4 = new PhysObj(bx + 120, 350, 'wood', 70, 10); ramp4.angle = -0.2;
      const spring1 = new PhysObj(bx + 100, 160, 'spring', 10, 30);
      const spring2 = new PhysObj(bx + 30, 240, 'spring', 10, 30);
      const wh = new PhysObj(bx + 180, 400, 'wheel', 0, 14);
      aiObjects.push(ramp1, ramp2, ramp3, ramp4, spring1, spring2, wh);
      aiConnections.push(new Connection(ramp1, spring1, 'hinge'));
      aiConnections.push(new Connection(ramp2, spring2, 'hinge'));
      break;
    }
  }
}

// ── Physics Engine ──
function stepPhysics(objects, connections, sideMin, sideMax) {
  for (const o of objects) {
    if (o.fixed) continue;
    o.vy += GRAVITY * o.mass;
    if (o.type === 'rocket' && o.rocketFuel > 0) {
      o.vy -= 1.2;
      o.rocketFuel--;
      particles.push({
        x: o.x + 8, y: o.y + 40,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 1,
        life: 20,
        color: Math.random() > 0.5 ? '#ff8844' : '#ffff55',
      });
    }
    o.vx *= o.friction;
    o.vy *= o.friction;
    o.x += o.vx * DT;
    o.y += o.vy * DT;
    if (o.r > 0) { o.va *= 0.98; o.angle += o.va; }

    const floor = H - 10;
    if (o.r > 0) {
      if (o.y + o.r > floor) { o.y = floor - o.r; o.vy *= -o.bounce; o.vx *= 0.92; }
      if (o.x - o.r < sideMin) { o.x = sideMin + o.r; o.vx *= -o.bounce; }
      if (o.x + o.r > sideMax) { o.x = sideMax - o.r; o.vx *= -o.bounce; }
      if (o.y - o.r < 0) { o.y = o.r; o.vy *= -o.bounce; }
    } else {
      if (o.y + o.h > floor) { o.y = floor - o.h; o.vy *= -o.bounce; o.vx *= 0.92; }
      if (o.x < sideMin) { o.x = sideMin; o.vx *= -o.bounce; }
      if (o.x + o.w > sideMax) { o.x = sideMax - o.w; o.vx *= -o.bounce; }
      if (o.y < 0) { o.y = 0; o.vy *= -o.bounce; }
    }
  }

  if (challenges[challengeIndex].type === 'bridge') {
    const gapSetup = challenges[challengeIndex].setup(sideMin < HALF ? 'left' : 'right');
    const gx = gapSetup.gap.x;
    const gw = gapSetup.gap.w;
    for (const o of objects) {
      if (o.fixed) continue;
      const cx2 = o.r > 0 ? o.x : o.x + o.w / 2;
      const bottom = o.r > 0 ? o.y + o.r : o.y + o.h;
      if (!(cx2 > gx && cx2 < gx + gw)) {
        if (bottom > 400) {
          if (o.r > 0) { o.y = 400 - o.r; o.vy *= -o.bounce; o.vx *= 0.92; }
          else { o.y = 400 - o.h; o.vy *= -o.bounce; o.vx *= 0.92; }
        }
      }
    }
  }

  for (const c of connections) {
    const a = c.a, b = c.b;
    if (!a.alive || !b.alive) continue;
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const diff = (d - c.restLen) / d;
    const nx = dx * diff * c.stiffness;
    const ny = dy * diff * c.stiffness;
    if (!a.fixed) { a.x += nx; a.y += ny; a.vx += nx * 0.5; a.vy += ny * 0.5; }
    if (!b.fixed) { b.x -= nx; b.y -= ny; b.vx -= nx * 0.5; b.vy -= ny * 0.5; }
  }

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      resolveCollision(objects[i], objects[j]);
    }
  }
}

function resolveCollision(a, b) {
  if (a.fixed && b.fixed) return;
  if (a.r > 0 && b.r > 0) {
    const d = dist(a.x, a.y, b.x, b.y);
    const minD = a.r + b.r;
    if (d < minD && d > 0) {
      const nx = (b.x - a.x) / d;
      const ny = (b.y - a.y) / d;
      const overlap = minD - d;
      const totalMass = a.mass + b.mass;
      if (!a.fixed) { a.x -= nx * overlap * (b.mass / totalMass); a.y -= ny * overlap * (b.mass / totalMass); }
      if (!b.fixed) { b.x += nx * overlap * (a.mass / totalMass); b.y += ny * overlap * (a.mass / totalMass); }
      const relV = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (relV > 0) {
        const bounce = Math.min(a.bounce, b.bounce);
        const imp = relV * (1 + bounce) / totalMass;
        if (!a.fixed) { a.vx -= imp * b.mass * nx; a.vy -= imp * b.mass * ny; }
        if (!b.fixed) { b.vx += imp * a.mass * nx; b.vy += imp * a.mass * ny; }
      }
    }
  } else if (a.r > 0 || b.r > 0) {
    const circ = a.r > 0 ? a : b;
    const rect = a.r > 0 ? b : a;
    const closestX = Math.max(rect.x, Math.min(circ.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circ.y, rect.y + rect.h));
    const d = dist(circ.x, circ.y, closestX, closestY);
    if (d < circ.r && d > 0) {
      const nx = (circ.x - closestX) / d;
      const ny = (circ.y - closestY) / d;
      const overlap = circ.r - d;
      if (!circ.fixed) { circ.x += nx * overlap * 0.7; circ.y += ny * overlap * 0.7; }
      if (!rect.fixed) { rect.x -= nx * overlap * 0.3; rect.y -= ny * overlap * 0.3; }
      const relV = circ.vx * nx + circ.vy * ny;
      if (relV < 0) {
        const bounce = Math.min(circ.bounce, rect.bounce);
        if (!circ.fixed) { circ.vx -= nx * relV * (1 + bounce); circ.vy -= ny * relV * (1 + bounce); }
        if (!rect.fixed) { rect.vx += nx * relV * 0.3; rect.vy += ny * relV * 0.3; }
        if (circ.type === 'wheel') circ.va += (circ.vx * ny - circ.vy * nx) * 0.02;
      }
    }
  } else {
    const acx = a.cx, acy = a.cy;
    const bcx = b.cx, bcy = b.cy;
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        const sign = acx < bcx ? -1 : 1;
        if (!a.fixed) a.x += sign * overlapX * 0.5;
        if (!b.fixed) b.x -= sign * overlapX * 0.5;
        const relV = a.vx - b.vx;
        const bounce = Math.min(a.bounce, b.bounce);
        if (!a.fixed) a.vx -= relV * (1 + bounce) * 0.5;
        if (!b.fixed) b.vx += relV * (1 + bounce) * 0.5;
      } else {
        const sign = acy < bcy ? -1 : 1;
        if (!a.fixed) a.y += sign * overlapY * 0.5;
        if (!b.fixed) b.y -= sign * overlapY * 0.5;
        const relV = a.vy - b.vy;
        const bounce = Math.min(a.bounce, b.bounce);
        if (!a.fixed) a.vy -= relV * (1 + bounce) * 0.5;
        if (!b.fixed) b.vy += relV * (1 + bounce) * 0.5;
      }
    }
  }
}

// ── Scoring ──
function evaluateChallenge() {
  const ch = challenges[challengeIndex];
  let s1 = 0, s2 = 0;
  switch (ch.type) {
    case 'launch': {
      const t1 = ch.setup('left'); const t2 = ch.setup('right');
      const ball1 = p1Objects.find(o => o.type === 'ball');
      const ball2 = aiObjects.find(o => o.type === 'ball');
      if (ball1) { const d1 = dist(ball1.x, ball1.y, t1.target.x + t1.target.w / 2, t1.target.y + t1.target.h / 2); s1 = d1 < 40 ? 100 : Math.max(0, 100 - d1 * 0.5); }
      if (ball2) { const d2 = dist(ball2.x, ball2.y, t2.target.x + t2.target.w / 2, t2.target.y + t2.target.h / 2); s2 = d2 < 40 ? 100 : Math.max(0, 100 - d2 * 0.5); }
      break;
    }
    case 'tower': {
      let minY1 = H, minY2 = H;
      for (const o of p1Objects) { if (o.type !== 'ball' && o.type !== 'egg') { const top = o.r > 0 ? o.y - o.r : o.y; if (top < minY1) minY1 = top; } }
      for (const o of aiObjects) { if (o.type !== 'ball' && o.type !== 'egg') { const top = o.r > 0 ? o.y - o.r : o.y; if (top < minY2) minY2 = top; } }
      s1 = Math.max(0, (440 - minY1) * 0.4);
      s2 = Math.max(0, (440 - minY2) * 0.4);
      break;
    }
    case 'bridge': {
      const ball1 = p1Objects.find(o => o.type === 'ball');
      const ball2 = aiObjects.find(o => o.type === 'ball');
      if (ball1) { const sx = ch.setup('left'); s1 = Math.max(0, (ball1.x - sx.ball.x) * 0.6); if (ball1.y > H - 20) s1 *= 0.2; }
      if (ball2) { const sx = ch.setup('right'); s2 = Math.max(0, (ball2.x - sx.ball.x) * 0.6); if (ball2.y > H - 20) s2 *= 0.2; }
      break;
    }
    case 'protect': {
      const egg1 = p1Objects.find(o => o.type === 'egg');
      const egg2 = aiObjects.find(o => o.type === 'egg');
      if (egg1) { const sp = Math.sqrt(egg1.vx ** 2 + egg1.vy ** 2); s1 = Math.max(0, 100 - sp * 10); const setup = ch.setup('left'); if (egg1.x > setup.zone.x && egg1.x < setup.zone.x + setup.zone.w) s1 += 20; if (egg1.y > H - 50) s1 *= 0.5; }
      if (egg2) { const sp = Math.sqrt(egg2.vx ** 2 + egg2.vy ** 2); s2 = Math.max(0, 100 - sp * 10); const setup = ch.setup('right'); if (egg2.x > setup.zone.x && egg2.x < setup.zone.x + setup.zone.w) s2 += 20; if (egg2.y > H - 50) s2 *= 0.5; }
      break;
    }
    case 'rube': {
      const ball1 = p1Objects.find(o => o.type === 'ball');
      const ball2 = aiObjects.find(o => o.type === 'ball');
      if (ball1) { const f = ch.setup('left').finish; const d = dist(ball1.x, ball1.y, f.x + f.w / 2, f.y + f.h / 2); s1 = d < 35 ? 100 : Math.max(0, 100 - d * 0.3); }
      if (ball2) { const f = ch.setup('right').finish; const d = dist(ball2.x, ball2.y, f.x + f.w / 2, f.y + f.h / 2); s2 = d < 35 ? 100 : Math.max(0, 100 - d * 0.3); }
      break;
    }
  }
  return { p1: Math.round(Math.min(100, Math.max(0, s1))), ai: Math.round(Math.min(100, Math.max(0, s2))) };
}

// ── Status Bar ──
function updateStatus() {
  const s = document.getElementById('statusBar');
  if (!s) return;
  if (phase === 'build') {
    if (currentTool === 'hinge' || currentTool === 'rope' || currentTool === 'spring') {
      s.textContent = `Drag between two objects to connect with ${currentTool} | Time: ${buildTimer}s`;
    } else if (currentTool === 'delete') {
      s.textContent = `Click an object to delete it | Time: ${buildTimer}s`;
    } else {
      s.textContent = `Click in your zone (left half) to place ${currentTool} | Time: ${buildTimer}s`;
    }
  } else if (phase === 'test') {
    s.textContent = `Testing physics... Watch your contraption! | ${Math.ceil((maxTestFrames - testFrames) / 60)}s`;
  } else {
    s.textContent = 'Results!';
  }
}

function updateScoreBar() {
  const el = document.getElementById('scoreBar');
  if (el) el.textContent = `P1: ${score.p1} | AI: ${score.ai} | Challenge ${challengeIndex + 1}/5`;
}

// ── Game Flow ──
function startChallenge() {
  phase = 'build';
  buildTimer = 30;
  testFrames = 0;
  p1Objects = [];
  aiObjects = [];
  p1Connections = [];
  aiConnections = [];
  particles = [];

  const ch = challenges[challengeIndex];

  if (ch.type === 'launch' || ch.type === 'bridge' || ch.type === 'rube') {
    const s1 = ch.setup('left'); const s2 = ch.setup('right');
    const ball1 = new PhysObj(s1.ball.x, s1.ball.y, 'ball', 0, s1.ball.r); ball1.fixed = true;
    const ball2 = new PhysObj(s2.ball.x, s2.ball.y, 'ball', 0, s2.ball.r); ball2.fixed = true;
    p1Objects.push(ball1); aiObjects.push(ball2);
  }
  if (ch.type === 'protect') {
    const s1 = ch.setup('left'); const s2 = ch.setup('right');
    const egg1 = new PhysObj(s1.egg.x, s1.egg.y, 'egg', 0, s1.egg.r); egg1.fixed = true;
    const egg2 = new PhysObj(s2.egg.x, s2.egg.y, 'egg', 0, s2.egg.r); egg2.fixed = true;
    p1Objects.push(egg1); aiObjects.push(egg2);
  }

  aiBuilds(ch);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (phase === 'build') {
      buildTimer--;
      updateStatus();
      if (buildTimer <= 0) startTest();
    }
  }, 1000);

  updateScoreBar();
  updateStatus();
}

function startTest() {
  phase = 'test';
  testFrames = 0;
  clearInterval(timerInterval);
  for (const o of p1Objects) { if (o.type === 'ball' || o.type === 'egg') o.fixed = false; }
  for (const o of aiObjects) { if (o.type === 'ball' || o.type === 'egg') o.fixed = false; }
  if (challenges[challengeIndex].type === 'bridge') {
    const b1 = p1Objects.find(o => o.type === 'ball');
    const b2 = aiObjects.find(o => o.type === 'ball');
    if (b1) b1.vx = 2;
    if (b2) b2.vx = 2;
  }
  updateStatus();
}

function endTest() {
  phase = 'results';
  challengeResult = evaluateChallenge();
  score.p1 += challengeResult.p1;
  score.ai += challengeResult.ai;
  updateScoreBar();

  setTimeout(() => {
    challengeIndex++;
    if (challengeIndex >= challenges.length) {
      showFinalResults();
    } else {
      startChallenge();
    }
  }, 2500);
}

function showFinalResults() {
  gameState = 'menu';
  const ov = document.getElementById('overlay');
  if (!ov) return;
  ov.style.display = 'flex';
  const winner = score.p1 > score.ai ? 'YOU WIN!' : score.p1 < score.ai ? 'AI WINS!' : 'TIE!';
  ov.innerHTML = `
    <h1>${winner}</h1>
    <h2>Final Score: You ${score.p1} - AI ${score.ai}</h2>
    <p>5 challenges completed. ${score.p1 > score.ai ? 'Your engineering skills prevailed!' : score.p1 < score.ai ? 'The AI built better contraptions this time.' : 'Perfectly matched builders!'}</p>
    <button id="startBtn">PLAY AGAIN</button>
  `;
  document.getElementById('startBtn').addEventListener('click', () => startGameFn());
}

// ── Drawing Helpers (WebGL engine) ──

// Draw a physics object using renderer + text
function drawObj(o, renderer, text) {
  if (o.r > 0) {
    // Circular objects
    if (o.type === 'ball') {
      renderer.setGlow('#ff5', 0.8);
      renderer.fillCircle(o.x, o.y, o.r, '#ff5');
      renderer.fillCircle(o.x, o.y, o.r * 0.5, '#ff8');
      renderer.setGlow(null);
    } else if (o.type === 'egg') {
      renderer.fillCircle(o.x, o.y, o.r, '#ffe8c0');
      // crack lines as tiny rects
      renderer.fillRect(o.x - 3, o.y - 4, 1, 4, '#bb988880');
      renderer.fillRect(o.x, o.y - 3, 1, 3, '#bb988880');
    } else if (o.type === 'wheel') {
      renderer.fillCircle(o.x, o.y, o.r, '#555');
      // spokes
      for (let i = 0; i < 4; i++) {
        const a = o.angle + i * Math.PI / 2;
        renderer.drawLine(
          o.x, o.y,
          o.x + Math.cos(a) * o.r * 0.8,
          o.y + Math.sin(a) * o.r * 0.8,
          '#888', 2
        );
      }
      // tire ring
      renderer.strokePoly(
        Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return { x: o.x + Math.cos(a) * o.r, y: o.y + Math.sin(a) * o.r };
        }),
        '#333', 3, true
      );
    }
  } else {
    // Rectangle objects — build rotated polygon
    const cx2 = o.x + o.w / 2;
    const cy2 = o.y + o.h / 2;
    const hw = o.w / 2;
    const hh = o.h / 2;
    const cos = Math.cos(o.angle);
    const sin = Math.sin(o.angle);
    function rotPt(lx, ly) {
      return { x: cx2 + lx * cos - ly * sin, y: cy2 + lx * sin + ly * cos };
    }
    const corners = [
      rotPt(-hw, -hh), rotPt(hw, -hh), rotPt(hw, hh), rotPt(-hw, hh),
    ];

    if (o.type === 'rocket') {
      renderer.fillPoly(corners, '#f84');
      // nose cone
      const nose = [
        rotPt(-hw, -hh),
        rotPt(0, -hh - 8),
        rotPt(hw, -hh),
      ];
      renderer.fillPoly(nose, '#f55');
      // left fin
      renderer.fillPoly([rotPt(-hw - 4, hh - 8), rotPt(-hw, hh - 8), rotPt(-hw, hh), rotPt(-hw - 4, hh)], '#c44');
      // right fin
      renderer.fillPoly([rotPt(hw, hh - 8), rotPt(hw + 4, hh - 8), rotPt(hw + 4, hh), rotPt(hw, hh)], '#c44');
      if (o.rocketFuel > 0) {
        renderer.fillPoly([rotPt(-hw / 4, hh - 2), rotPt(hw / 4, hh - 2), rotPt(hw / 4, hh), rotPt(-hw / 4, hh)], '#ff0');
      }
    } else if (o.type === 'spring') {
      // spring coils as short line segments
      const coils = 5;
      for (let i = 0; i <= coils; i++) {
        const t0 = i / coils;
        const t1 = (i + 1) / coils;
        const sx0 = (i % 2 === 0 ? -1 : 1) * hw * 0.4;
        const sy0 = -hh + t0 * o.h;
        const sx1 = ((i + 1) % 2 === 0 ? -1 : 1) * hw * 0.4;
        const sy1 = -hh + t1 * o.h;
        if (i < coils) {
          const p0 = rotPt(sx0, sy0);
          const p1pt = rotPt(sx1, sy1);
          renderer.drawLine(p0.x, p0.y, p1pt.x, p1pt.y, '#4ce', 2);
        }
      }
      // end caps
      renderer.fillPoly([rotPt(-hw, -hh), rotPt(hw, -hh), rotPt(hw, -hh + 3), rotPt(-hw, -hh + 3)], '#3ab');
      renderer.fillPoly([rotPt(-hw, hh - 3), rotPt(hw, hh - 3), rotPt(hw, hh), rotPt(-hw, hh)], '#3ab');
    } else {
      renderer.fillPoly(corners, o.color);
      // detail lines
      if (o.type === 'wood') {
        for (let i = 1; i <= 3; i++) {
          const t = i / 4;
          const p0 = rotPt(-hw, -hh + t * o.h);
          const p1pt = rotPt(hw, -hh + t * o.h + 2);
          renderer.drawLine(p0.x, p0.y, p1pt.x, p1pt.y, '#00000033', 1);
        }
      } else if (o.type === 'metal') {
        renderer.fillCircle(cx2 - o.w / 3, cy2, 2, '#bbc');
        renderer.fillCircle(cx2 + o.w / 3, cy2, 2, '#bbc');
      } else if (o.type === 'rubber') {
        for (let i = 0; i < 4; i++) {
          const lx = -hw + (i + 0.5) * o.w / 4;
          const ly = ((i % 2) - 0.5) * hh * 0.6;
          const pt = rotPt(lx, ly);
          renderer.fillCircle(pt.x, pt.y, 1.5, '#c63');
        }
      }
      renderer.strokePoly(corners, '#ffffff22', 1, true);
    }
  }
}

function drawConnection(c, renderer) {
  const ax = c.a.cx, ay = c.a.cy;
  const bx = c.b.cx, by = c.b.cy;

  if (c.type === 'hinge') {
    renderer.dashedLine(ax, ay, bx, by, '#aaa', 2, 4, 3);
    const mx2 = (ax + bx) / 2, my2 = (ay + by) / 2;
    renderer.fillCircle(mx2, my2, 4, '#ccc');
    renderer.strokePoly(
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return { x: mx2 + Math.cos(a) * 4, y: my2 + Math.sin(a) * 4 };
      }),
      '#888', 1, true
    );
  } else if (c.type === 'rope') {
    // Approximate quadratic bezier with line segments
    const mx2 = (ax + bx) / 2;
    const my2 = (ay + by) / 2 + 10;
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const x0 = (1 - t0) * (1 - t0) * ax + 2 * (1 - t0) * t0 * mx2 + t0 * t0 * bx;
      const y0 = (1 - t0) * (1 - t0) * ay + 2 * (1 - t0) * t0 * my2 + t0 * t0 * by;
      const x1 = (1 - t1) * (1 - t1) * ax + 2 * (1 - t1) * t1 * mx2 + t1 * t1 * bx;
      const y1 = (1 - t1) * (1 - t1) * ay + 2 * (1 - t1) * t1 * my2 + t1 * t1 * by;
      renderer.drawLine(x0, y0, x1, y1, '#a86', 2);
    }
  } else if (c.type === 'spring') {
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / len, ndy = dy / len;
    const px = -ndy, py = ndx;
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const off0 = Math.sin(i * Math.PI) * 6;
      const off1 = Math.sin((i + 1) * Math.PI) * 6;
      const x0 = ax + dx * t0 + px * off0;
      const y0 = ay + dy * t0 + py * off0;
      const x1 = ax + dx * t1 + px * off1;
      const y1 = ay + dy * t1 + py * off1;
      renderer.drawLine(x0, y0, x1, y1, '#4ce', 2);
    }
  }
}

function drawChallenge(renderer, text) {
  const ch = challenges[challengeIndex];
  drawChallengeSetup(ch, 'left', renderer, text);
  drawChallengeSetup(ch, 'right', renderer, text);
}

function drawChallengeSetup(ch, side, renderer, text) {
  const setup = ch.setup(side);
  const sideMin = side === 'left' ? 0 : HALF;
  const sideMax = side === 'left' ? HALF : W;

  if (ch.type === 'launch' && setup.target) {
    renderer.setGlow('#8a4', 0.6);
    renderer.fillRect(setup.target.x, setup.target.y, setup.target.w, setup.target.h, '#8a443380');
    renderer.strokePoly([
      { x: setup.target.x, y: setup.target.y }, { x: setup.target.x + setup.target.w, y: setup.target.y },
      { x: setup.target.x + setup.target.w, y: setup.target.y + setup.target.h }, { x: setup.target.x, y: setup.target.y + setup.target.h },
    ], '#8a4', 2, true);
    renderer.setGlow(null);
    const tcx = setup.target.x + setup.target.w / 2;
    const tcy = setup.target.y + setup.target.h / 2;
    renderer.strokePoly(Array.from({ length: 16 }, (_, i) => ({ x: tcx + Math.cos(i / 16 * Math.PI * 2) * 10, y: tcy + Math.sin(i / 16 * Math.PI * 2) * 10 })), '#f55', 2, true);
    renderer.fillCircle(tcx, tcy, 4, '#f55');
  }

  if (ch.type === 'bridge' && setup.gap) {
    const gx = setup.gap.x;
    const gw = setup.gap.w;
    renderer.fillRect(sideMin, 400, gx - sideMin, H - 400, '#543');
    renderer.fillRect(gx + gw, 400, sideMax - (gx + gw), H - 400, '#543');
    renderer.fillRect(gx, 400, gw, H - 400, '#0a0a1e');
    renderer.drawLine(gx, 400, gx, H, '#765', 2);
    renderer.drawLine(gx + gw, 400, gx + gw, H, '#765', 2);
    text.drawText('->', gx + gw + 5, 388, 12, '#8a4', 'left');
  }

  if (ch.type === 'protect' && setup.zone) {
    renderer.fillRect(setup.zone.x, setup.zone.y, setup.zone.w, setup.zone.h, '#44cc8833');
    renderer.dashedLine(setup.zone.x, setup.zone.y, setup.zone.x + setup.zone.w, setup.zone.y, '#4c8', 1.5, 4, 3);
    renderer.dashedLine(setup.zone.x + setup.zone.w, setup.zone.y, setup.zone.x + setup.zone.w, setup.zone.y + setup.zone.h, '#4c8', 1.5, 4, 3);
    renderer.dashedLine(setup.zone.x, setup.zone.y + setup.zone.h, setup.zone.x + setup.zone.w, setup.zone.y + setup.zone.h, '#4c8', 1.5, 4, 3);
    renderer.dashedLine(setup.zone.x, setup.zone.y, setup.zone.x, setup.zone.y + setup.zone.h, '#4c8', 1.5, 4, 3);
    text.drawText('v', setup.egg.x - 4, setup.egg.y + 30, 14, '#fa5', 'left');
  }

  if (ch.type === 'rube' && setup.finish) {
    renderer.fillRect(setup.finish.x, setup.finish.y, setup.finish.w, setup.finish.h, '#8a443340');
    renderer.strokePoly([
      { x: setup.finish.x, y: setup.finish.y },
      { x: setup.finish.x + setup.finish.w, y: setup.finish.y },
      { x: setup.finish.x + setup.finish.w, y: setup.finish.y + setup.finish.h },
      { x: setup.finish.x, y: setup.finish.y + setup.finish.h },
    ], '#8a4', 2, true);
    text.drawText('FINISH', setup.finish.x + setup.finish.w / 2, setup.finish.y + setup.finish.h / 2 - 6, 10, '#8a4', 'center');
  }

  if (ch.type === 'tower') {
    for (let h = 400; h > 50; h -= 50) {
      renderer.drawLine(sideMin + 5, h, sideMin + 15, h, '#555', 1);
      text.drawText(`${440 - h}`, sideMin + 2, h - 10, 8, '#555', 'left');
    }
  }
}

// ── Main createGame export ──
let startGameFn = null;

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('SANDBOX PHYSICS', '');
    game.setState('waiting');
  };

  game.setScoreFn(() => score.p1);

  // Toolbar button wiring
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      updateStatus();
    });
  });

  // Mouse events on canvas directly
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing' || phase !== 'build') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx >= HALF) return;

    if (currentTool === 'delete') {
      for (let i = p1Objects.length - 1; i >= 0; i--) {
        const o = p1Objects[i];
        if (o.type === 'ball' || o.type === 'egg') continue;
        if (hitTest(o, mx, my)) {
          p1Connections = p1Connections.filter(c => c.a !== o && c.b !== o);
          p1Objects.splice(i, 1);
          break;
        }
      }
      return;
    }

    if (currentTool === 'hinge' || currentTool === 'rope' || currentTool === 'spring') {
      for (const o of p1Objects) {
        if (hitTest(o, mx, my)) { dragStart = o; dragObj = { x: mx, y: my }; return; }
      }
      return;
    }

    if (p1Objects.length >= 20) return;
    let obj;
    if (currentTool === 'wheel') {
      obj = new PhysObj(mx, my, 'wheel', 0, 14);
    } else if (currentTool === 'spring') {
      obj = new PhysObj(mx - 5, my - 15, 'spring', 10, 30);
    } else if (currentTool === 'rocket') {
      obj = new PhysObj(mx - 8, my - 20, 'rocket', 16, 40);
    } else {
      obj = new PhysObj(mx - 20, my - 10, currentTool, 40, 20);
    }
    if (obj.r > 0) {
      obj.x = Math.max(obj.r, Math.min(HALF - obj.r - 2, obj.x));
    } else {
      obj.x = Math.max(0, Math.min(HALF - obj.w - 2, obj.x));
    }
    obj.y = Math.max(40, Math.min(H - (obj.r > 0 ? obj.r : obj.h) - 10, obj.y));
    p1Objects.push(obj);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!dragStart) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const o of p1Objects) {
      if (o !== dragStart && hitTest(o, mx, my)) {
        const connType = currentTool === 'spring' ? 'spring' : currentTool;
        p1Connections.push(new Connection(dragStart, o, connType));
        break;
      }
    }
    dragStart = null;
    dragObj = null;
  });

  // Start button
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', () => startGameFn());

  startGameFn = () => {
    gameState = 'playing';
    score = { p1: 0, ai: 0 };
    challengeIndex = 0;
    game.setState('playing');
    startChallenge();
  };

  game.onUpdate = (dt) => {
    if (gameState !== 'playing') return;
    if (phase === 'test') {
      stepPhysics(p1Objects, p1Connections, 0, HALF);
      stepPhysics(aiObjects, aiConnections, HALF, W);
      testFrames++;
      updateStatus();
      if (testFrames >= maxTestFrames) endTest();
    }
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Grid
    for (let x = 0; x < W; x += 20) renderer.drawLine(x, 0, x, H, '#ffffff08', 0.5);
    for (let y = 0; y < H; y += 20) renderer.drawLine(0, y, W, y, '#ffffff08', 0.5);

    // Center divider (dashed)
    renderer.dashedLine(HALF, 0, HALF, H, '#8a4', 2, 6, 4);

    // Floor
    if (!challenges[challengeIndex] || challenges[challengeIndex].type !== 'bridge') {
      renderer.fillRect(0, H - 10, W, 10, '#2a2a3e');
      renderer.drawLine(0, H - 10, W, H - 10, '#444', 1);
    }

    // Zone labels
    text.drawText('YOUR BUILD', HALF / 2, 8, 12, '#8a4', 'center');
    text.drawText('AI BUILD', HALF + HALF / 2, 8, 12, '#e74', 'center');

    // Build zone highlight
    if (phase === 'build') {
      renderer.fillRect(0, 20, HALF - 1, H - 30, '#8a44440a');
      renderer.fillRect(HALF + 1, 20, HALF - 1, H - 30, '#e7440a0a');
    }

    // Challenge setup
    if (challenges[challengeIndex]) drawChallenge(renderer, text);

    // Connections
    for (const c of p1Connections) drawConnection(c, renderer);
    for (const c of aiConnections) drawConnection(c, renderer);

    // Objects
    for (const o of p1Objects) drawObj(o, renderer, text);
    for (const o of aiObjects) drawObj(o, renderer, text);

    // Drag line preview
    if (dragStart && dragObj) {
      const col = currentTool === 'spring' ? '#4ce' : currentTool === 'rope' ? '#a86' : '#aaa';
      renderer.dashedLine(dragStart.cx, dragStart.cy, mouseX, mouseY, col, 2, 4, 4);
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.round((p.life / 20) * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(p.x, p.y, 2, p.color.slice(0, 7) + alpha);
    }

    // Timer / phase label
    if (phase === 'build') {
      const timerCol = buildTimer <= 5 ? '#f55' : '#8a4';
      text.drawText(`BUILD: ${buildTimer}s`, W / 2, 26, 20, timerCol, 'center');
    } else if (phase === 'test') {
      text.drawText('TESTING...', W / 2, 26, 20, '#ff5', 'center');
    }

    // Challenge name
    if (challenges[challengeIndex]) {
      text.drawText(challenges[challengeIndex].name.toUpperCase(), W / 2, 50, 11, '#cda', 'center');
    }

    // Ghost preview
    if (phase === 'build' && mouseX < HALF && mouseX > 0 && mouseY > 20 && mouseY < H - 10) {
      if (currentTool !== 'hinge' && currentTool !== 'rope' && currentTool !== 'spring' && currentTool !== 'delete') {
        const ghostColors = { wood: '#c9770060', metal: '#99aa0060', rubber: '#ee774460', wheel: '#55555560', rocket: '#ff884460' };
        const gc = ghostColors[currentTool] || '#8aa44460';
        if (currentTool === 'wheel') {
          renderer.fillCircle(mouseX, mouseY, 14, gc);
        } else if (currentTool === 'rocket') {
          renderer.fillRect(mouseX - 8, mouseY - 20, 16, 40, gc);
        } else {
          renderer.fillRect(mouseX - 20, mouseY - 10, 40, 20, gc);
        }
      }
    }

    // Results overlay panel (drawn in-canvas, not via DOM overlay)
    if (phase === 'results') {
      renderer.fillRect(W / 4, H / 2 - 50, W / 2, 100, '#1a1a2ecc');
      renderer.strokePoly([
        { x: W / 4, y: H / 2 - 50 }, { x: W / 4 + W / 2, y: H / 2 - 50 },
        { x: W / 4 + W / 2, y: H / 2 + 50 }, { x: W / 4, y: H / 2 + 50 },
      ], '#8a4', 2, true);
      text.drawText('CHALLENGE RESULTS', W / 2, H / 2 - 40, 16, '#8a4', 'center');
      const p1col = challengeResult.p1 >= challengeResult.ai ? '#8a4' : '#aaa';
      const aicol = challengeResult.ai >= challengeResult.p1 ? '#e74' : '#aaa';
      text.drawText(`You: +${challengeResult.p1}pts`, W / 2, H / 2 - 8, 14, p1col, 'center');
      text.drawText(`AI: +${challengeResult.ai}pts`, W / 2, H / 2 + 14, 14, aicol, 'center');
      const winnerStr = challengeResult.p1 > challengeResult.ai ? 'You win this round!' : challengeResult.ai > challengeResult.p1 ? 'AI wins this round!' : 'Tie!';
      text.drawText(winnerStr, W / 2, H / 2 + 34, 11, '#ff5', 'center');
    }
  };

  game.start();
  return game;
}
