// kart-racer/game.js — Kart Racer ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// DOM elements
const lapEl = document.getElementById('lap');
const posEl = document.getElementById('pos');
const itemEl = document.getElementById('item');
const scoreEl = document.getElementById('score');

let score = 0;
let gameState = 'menu'; // 'menu' | 'countdown' | 'racing' | 'raceEnd' | 'results'
let frameCount = 0;

// Track definitions
const tracks = [
  {
    name: 'Mushroom Circuit',
    bg: '#2a5e2a',
    waypoints: [
      {x:300,y:420},{x:160,y:400},{x:80,y:340},{x:60,y:260},{x:80,y:180},
      {x:140,y:120},{x:220,y:80},{x:320,y:70},{x:420,y:80},{x:490,y:120},
      {x:530,y:200},{x:540,y:300},{x:520,y:370},{x:460,y:420},{x:380,y:430}
    ],
    trackWidth: 52,
    itemBoxes: [0,3,6,9,12]
  },
  {
    name: 'Shell Speedway',
    bg: '#3a3a1e',
    waypoints: [
      {x:300,y:440},{x:180,y:410},{x:100,y:350},{x:80,y:270},{x:120,y:200},
      {x:200,y:160},{x:300,y:200},{x:400,y:250},{x:480,y:200},{x:520,y:140},
      {x:500,y:80},{x:420,y:60},{x:340,y:80},{x:300,y:140},{x:260,y:200},
      {x:200,y:280},{x:160,y:350},{x:200,y:410},{x:300,y:440}
    ],
    trackWidth: 46,
    itemBoxes: [0,4,8,12,16]
  },
  {
    name: 'Rainbow Road',
    bg: '#1a1a3e',
    waypoints: [
      {x:300,y:450},{x:150,y:430},{x:60,y:380},{x:40,y:300},{x:60,y:220},
      {x:120,y:160},{x:200,y:120},{x:260,y:80},{x:340,y:60},{x:440,y:70},
      {x:520,y:110},{x:560,y:180},{x:540,y:260},{x:480,y:310},{x:400,y:330},
      {x:350,y:360},{x:400,y:400},{x:480,y:420},{x:520,y:440},{x:460,y:460},
      {x:380,y:460}
    ],
    trackWidth: 40,
    itemBoxes: [0,4,8,12,16,19]
  }
];

let currentTrack = 0;
let raceNum = 0;

const kartDefs = [
  { name: 'Player', color: '#f44', weight: 1.0, maxSpeed: 3.8, accel: 0.06, handling: 0.045 },
  { name: 'Luigi',  color: '#4f4', weight: 1.1, maxSpeed: 3.6, accel: 0.055, handling: 0.05 },
  { name: 'Toad',   color: '#44f', weight: 0.8, maxSpeed: 4.0, accel: 0.07, handling: 0.04 },
  { name: 'Bowser', color: '#fa0', weight: 1.4, maxSpeed: 3.4, accel: 0.045, handling: 0.055 }
];

let karts = [];
let shells = [];
let bananas = [];
let itemBoxes = [];
let particles = [];
let countdownTimer = 0;
let raceFinished = false;
let raceEndTimer = 0;
let finishOrder = [];

// Pre-built track geometry cache (computed once per race start)
let trackGeomCache = null;

// ── Track helpers ──

function getTrackPoint(track, t) {
  const wp = track.waypoints;
  const n = wp.length;
  const idx = ((t % n) + n) % n;
  const i = Math.floor(idx);
  const f = idx - i;
  const p0 = wp[i % n];
  const p1 = wp[(i + 1) % n];
  return { x: p0.x + (p1.x - p0.x) * f, y: p0.y + (p1.y - p0.y) * f };
}

function getTrackDir(track, t) {
  const wp = track.waypoints;
  const n = wp.length;
  const i = Math.floor(((t % n) + n) % n);
  const p0 = wp[i % n];
  const p1 = wp[(i + 1) % n];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

function closestTrackParam(track, px, py) {
  const wp = track.waypoints;
  const n = wp.length;
  let bestT = 0, bestDist = Infinity;
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < 1; f += 0.1) {
      const p = getTrackPoint(track, i + f);
      const dx = px - p.x, dy = py - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; bestT = i + f; }
    }
  }
  for (let f = -0.1; f <= 0.1; f += 0.02) {
    const t = bestT + f;
    const p = getTrackPoint(track, t);
    const dx = px - p.x, dy = py - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; bestT = t; }
  }
  return { t: bestT, dist: Math.sqrt(bestDist) };
}

function isOnTrack(track, px, py) {
  return closestTrackParam(track, px, py).dist < track.trackWidth;
}

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

// Build static track geometry (outer/inner poly + rumble strips + center line)
function buildTrackGeometry(track) {
  const n = track.waypoints.length;
  const tw = track.trackWidth;
  const step = 0.2;

  const outerPts = [];  // outer border poly
  const innerPts = [];  // inner border poly
  const surfacePts = []; // outer edge forward, inner edge backward (for filled surface)
  const centerPts = [];
  const rumble = []; // {x, y, color} dots

  for (let t = 0; t < n; t += step) {
    const p = getTrackPoint(track, t);
    const d = getTrackDir(track, t);
    const nx = -d.y, ny = d.x;
    outerPts.push({ x: p.x + nx * (tw + 4), y: p.y + ny * (tw + 4) });
    innerPts.push({ x: p.x - nx * (tw + 4), y: p.y - ny * (tw + 4) });
    centerPts.push({ x: p.x, y: p.y });
  }

  // Surface: outer forward + inner backward (closed loop for fillPoly-via-triangles)
  const outerSurface = [];
  const innerSurface = [];
  for (let t = 0; t < n; t += 0.15) {
    const p = getTrackPoint(track, t);
    const d = getTrackDir(track, t);
    const nx = -d.y, ny = d.x;
    outerSurface.push({ x: p.x + nx * tw, y: p.y + ny * tw });
    innerSurface.push({ x: p.x - nx * tw, y: p.y - ny * tw });
  }

  // Build triangle strip for surface as individual triangles
  const surfaceTris = []; // array of {pts: [{x,y},{x,y},{x,y}]}
  for (let i = 0; i < outerSurface.length; i++) {
    const j = (i + 1) % outerSurface.length;
    const o0 = outerSurface[i], o1 = outerSurface[j];
    const i0 = innerSurface[i], i1 = innerSurface[j];
    surfaceTris.push([o0, i0, o1]);
    surfaceTris.push([i0, i1, o1]);
  }

  // Rumble strips
  for (let t = 0; t < n; t += 0.4) {
    const p = getTrackPoint(track, t);
    const d = getTrackDir(track, t);
    const nx = -d.y, ny = d.x;
    const isRed = Math.floor(t * 3) % 2 === 0;
    const color = isRed ? '#f44' : '#fff';
    rumble.push({
      ox: p.x + nx * tw - 2, oy: p.y + ny * tw - 2,
      ix: p.x - nx * tw - 2, iy: p.y - ny * tw - 2,
      color
    });
  }

  // Start/finish line geometry (checkerboard)
  const sfp = getTrackPoint(track, 0);
  const sfd = getTrackDir(track, 0);
  const sfAngle = Math.atan2(sfd.y, sfd.x);
  const sfCheckers = [];
  const cos = Math.cos(sfAngle), sin = Math.sin(sfAngle);
  for (let r = -tw; r < tw; r += 6) {
    for (let c = -4; c < 4; c += 6) {
      const checkerColor = ((Math.floor(r / 6) + Math.floor(c / 6)) % 2) === 0 ? '#fff' : '#111';
      // corners of this 6x6 square in local space, rotated to world space
      const corners = [
        {lx: c,   ly: r},
        {lx: c+6, ly: r},
        {lx: c+6, ly: r+6},
        {lx: c,   ly: r+6},
      ].map(({lx, ly}) => ({
        x: sfp.x + lx * cos - ly * sin,
        y: sfp.y + lx * sin + ly * cos
      }));
      sfCheckers.push({ pts: corners, color: checkerColor });
    }
  }

  return { outerPts, innerPts, surfaceTris, centerPts, rumble, sfCheckers };
}

// ── Kart creation ──

function createKart(def, index, track) {
  const startT = -index * 0.6;
  const sp = getTrackPoint(track, startT);
  const sd = getTrackDir(track, startT);
  const angle = Math.atan2(sd.y, sd.x);
  return {
    x: sp.x, y: sp.y, angle,
    speed: 0, def, index,
    isPlayer: index === 0,
    lap: 0, trackParam: startT, lastCheckpoint: -1,
    item: null, itemName: 'None',
    drifting: false, driftDir: 0, driftTimer: 0, driftBoost: 0,
    boostTimer: 0, starTimer: 0, spinTimer: 0, invincTimer: 0,
    finished: false, finishTime: 0,
    aiTargetT: startT + 2, aiItemTimer: 0, aiDriftTimer: 0,
    steerSmooth: 0
  };
}

// ── Race management ──

function startGrandPrix() {
  score = 0;
  raceNum = 0;
  currentTrack = 0;
  scoreEl.textContent = '0';
  startRace();
}

function startRace() {
  const track = tracks[currentTrack];
  karts = kartDefs.map((d, i) => createKart(d, i, track));
  shells = [];
  bananas = [];
  particles = [];
  finishOrder = [];
  raceFinished = false;
  raceEndTimer = 0;
  countdownTimer = 180;

  itemBoxes = [];
  track.itemBoxes.forEach(idx => {
    const p = getTrackPoint(track, idx + 0.5);
    const d = getTrackDir(track, idx + 0.5);
    const nx = -d.y, ny = d.x;
    for (let s = -1; s <= 1; s++) {
      itemBoxes.push({
        x: p.x + nx * s * 20,
        y: p.y + ny * s * 20,
        active: true,
        respawnTimer: 0,
        baseX: p.x + nx * s * 20,
        baseY: p.y + ny * s * 20
      });
    }
  });

  // Pre-build track geometry once
  trackGeomCache = buildTrackGeometry(track);

  gameState = 'countdown';
}

function nextRace() {
  raceNum++;
  currentTrack = (currentTrack + 1) % tracks.length;
  if (raceNum >= 3) {
    gameState = 'results';
    return;
  }
  startRace();
}

// ── Items ──

const ITEMS = ['Mushroom', 'Shell', 'Banana', 'Star'];

function giveRandomItem(kart) {
  const pos = getPosition(kart);
  let weights;
  if (pos <= 1) weights = [3, 3, 3, 1];
  else if (pos === 2) weights = [3, 2, 2, 2];
  else weights = [4, 2, 1, 3];
  const total = weights.reduce((a, b) => a + b);
  let r = Math.random() * total;
  for (let i = 0; i < ITEMS.length; i++) {
    r -= weights[i];
    if (r <= 0) { kart.item = i; kart.itemName = ITEMS[i]; return; }
  }
  kart.item = 0; kart.itemName = 'Mushroom';
}

function useItem(kart) {
  if (kart.item === null) return;
  const item = kart.item;
  kart.item = null;
  kart.itemName = 'None';
  switch (item) {
    case 0:
      kart.boostTimer = 30;
      spawnParticles(kart.x, kart.y, '#ff0', 8);
      break;
    case 1:
      shells.push({
        x: kart.x + Math.cos(kart.angle) * 20,
        y: kart.y + Math.sin(kart.angle) * 20,
        vx: Math.cos(kart.angle) * 6,
        vy: Math.sin(kart.angle) * 6,
        owner: kart.index, life: 180, bounces: 3
      });
      break;
    case 2:
      bananas.push({
        x: kart.x - Math.cos(kart.angle) * 25,
        y: kart.y - Math.sin(kart.angle) * 25,
        owner: kart.index
      });
      break;
    case 3:
      kart.starTimer = 180;
      kart.invincTimer = 180;
      break;
  }
}

function getPosition(kart) {
  let pos = 1;
  const progress = kart.lap * tracks[currentTrack].waypoints.length + kart.trackParam;
  for (const other of karts) {
    if (other === kart) continue;
    const op = other.lap * tracks[currentTrack].waypoints.length + other.trackParam;
    if (op > progress) pos++;
  }
  return pos;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 2 + 1;
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 20 + Math.random() * 20,
      maxLife: 30,
      color, size: 2 + Math.random() * 3
    });
  }
}

function getSuffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

function endRace() {
  if (raceFinished) return;
  raceFinished = true;
  for (const kart of karts) {
    if (!kart.finished) {
      kart.finished = true;
      finishOrder.push(kart.index);
      if (kart.isPlayer) {
        const pos = finishOrder.indexOf(kart.index) + 1;
        const points = [10, 7, 4, 2][pos - 1] || 1;
        score += points;
        scoreEl.textContent = score;
      }
    }
  }
  gameState = 'raceEnd';
}

// ── AI ──

function updateAI(kart, track) {
  let accel = 1, steer = 0, drift = false, useItemFlag = false;

  const lookAhead = 2.5 + kart.speed * 0.5;
  const targetT = kart.trackParam + lookAhead;
  const targetPt = getTrackPoint(track, targetT);

  const toTarget = Math.atan2(targetPt.y - kart.y, targetPt.x - kart.x);
  let angleDelta = angleDiff(kart.angle, toTarget);

  kart.steerSmooth += (angleDelta * 8 - kart.steerSmooth) * 0.15;
  steer = Math.max(-1, Math.min(1, kart.steerSmooth));

  const farLook = kart.trackParam + lookAhead * 2;
  const farPt = getTrackPoint(track, farLook);
  const farAngle = Math.atan2(farPt.y - kart.y, farPt.x - kart.x);
  const farDelta = Math.abs(angleDiff(kart.angle, farAngle));

  if (farDelta > 0.8 && kart.speed > 2.5) accel = -0.3;

  if (Math.abs(angleDelta) > 0.4 && kart.speed > 2) {
    kart.aiDriftTimer++;
    if (kart.aiDriftTimer > 10) drift = true;
  } else {
    kart.aiDriftTimer = 0;
  }

  for (const banana of bananas) {
    const d = dist(kart, banana);
    if (d < 60) {
      const bAngle = Math.atan2(banana.y - kart.y, banana.x - kart.x);
      const bDelta = angleDiff(kart.angle, bAngle);
      if (Math.abs(bDelta) < 0.5) steer -= Math.sign(bDelta) * 0.5;
    }
  }

  if (kart.item !== null) {
    kart.aiItemTimer++;
    if (kart.aiItemTimer > 60 + Math.random() * 120) {
      if (kart.item === 0) useItemFlag = true;
      if (kart.item === 1) {
        for (const other of karts) {
          if (other === kart || other.finished) continue;
          const d = dist(kart, other);
          if (d < 150) {
            const a = Math.atan2(other.y - kart.y, other.x - kart.x);
            if (Math.abs(angleDiff(kart.angle, a)) < 0.5) { useItemFlag = true; break; }
          }
        }
        if (!useItemFlag && kart.aiItemTimer > 180) useItemFlag = true;
      }
      if (kart.item === 2) useItemFlag = true;
      if (kart.item === 3) {
        if (getPosition(kart) > 1 || kart.aiItemTimer > 120) useItemFlag = true;
      }
      if (useItemFlag) kart.aiItemTimer = 0;
    }
  } else {
    kart.aiItemTimer = 0;
  }

  steer = Math.max(-1, Math.min(1, steer));
  return { accel, steer, drift, useItem: useItemFlag };
}

// ── Update ──

function update(game) {
  frameCount++;

  if (gameState === 'menu') return;
  if (gameState === 'raceEnd') return;
  if (gameState === 'results') return;

  if (gameState === 'countdown') {
    countdownTimer--;
    if (countdownTimer <= 0) gameState = 'racing';
    return;
  }

  const track = tracks[currentTrack];
  const numWP = track.waypoints.length;

  for (const kart of karts) {
    if (kart.finished) continue;

    if (kart.boostTimer > 0) kart.boostTimer--;
    if (kart.starTimer > 0) kart.starTimer--;
    if (kart.invincTimer > 0) kart.invincTimer--;
    if (kart.spinTimer > 0) {
      kart.spinTimer--;
      kart.angle += 0.3;
      kart.speed *= 0.95;
      continue;
    }

    let accelInput = 0, steerInput = 0, driftInput = false, useItemInput = false;

    if (kart.isPlayer) {
      if (game.input.isDown('ArrowUp') || game.input.isDown('w')) accelInput = 1;
      if (game.input.isDown('ArrowDown') || game.input.isDown('s')) accelInput = -0.5;
      if (game.input.isDown('ArrowLeft') || game.input.isDown('a')) steerInput = -1;
      if (game.input.isDown('ArrowRight') || game.input.isDown('d')) steerInput = 1;
      if (game.input.isDown('z') || game.input.isDown('Z')) driftInput = true;
      if (game.input.wasPressed(' ')) useItemInput = true;
    } else {
      const ai = updateAI(kart, track);
      accelInput = ai.accel;
      steerInput = ai.steer;
      driftInput = ai.drift;
      useItemInput = ai.useItem;
    }

    if (useItemInput && kart.item !== null) useItem(kart);

    let maxSpd = kart.def.maxSpeed;
    if (kart.boostTimer > 0) maxSpd *= 1.5;
    if (kart.starTimer > 0) maxSpd *= 1.3;
    if (kart.driftBoost > 0) { maxSpd *= 1.3; kart.driftBoost--; }

    if (!isOnTrack(track, kart.x, kart.y)) {
      maxSpd *= 0.5;
      kart.speed *= 0.98;
    }

    if (accelInput > 0) {
      kart.speed += kart.def.accel * accelInput;
    } else if (accelInput < 0) {
      kart.speed += accelInput * 0.04;
    } else {
      kart.speed *= 0.99;
    }
    kart.speed = Math.max(-1, Math.min(maxSpd, kart.speed));

    let turnRate = kart.def.handling;
    if (kart.drifting) turnRate *= 1.4;
    if (Math.abs(kart.speed) < 0.5) turnRate *= Math.abs(kart.speed) / 0.5;
    kart.angle += steerInput * turnRate * (kart.speed > 0 ? 1 : -1);

    if (driftInput && Math.abs(kart.speed) > 2 && steerInput !== 0) {
      if (!kart.drifting) {
        kart.drifting = true;
        kart.driftDir = steerInput > 0 ? 1 : -1;
        kart.driftTimer = 0;
      }
      kart.driftTimer++;
      kart.angle += kart.driftDir * 0.015;
      if (kart.driftTimer % 3 === 0) {
        const driftColor = kart.driftTimer > 60 ? '#f0f' : kart.driftTimer > 30 ? '#fa0' : '#48f';
        spawnParticles(
          kart.x - Math.cos(kart.angle) * 10,
          kart.y - Math.sin(kart.angle) * 10,
          driftColor, 1
        );
      }
    } else {
      if (kart.drifting && kart.driftTimer > 20) {
        kart.driftBoost = kart.driftTimer > 60 ? 45 : kart.driftTimer > 30 ? 25 : 12;
        spawnParticles(kart.x, kart.y, '#ff0', 6);
      }
      kart.drifting = false;
      kart.driftTimer = 0;
    }

    kart.x += Math.cos(kart.angle) * kart.speed;
    kart.y += Math.sin(kart.angle) * kart.speed;
    kart.x = Math.max(10, Math.min(W - 10, kart.x));
    kart.y = Math.max(10, Math.min(H - 10, kart.y));

    const info = closestTrackParam(track, kart.x, kart.y);
    const prevParam = kart.trackParam;
    const newParam = info.t;
    const dParam = newParam - prevParam;
    if (dParam < -numWP / 2) {
      kart.lap++;
      if (kart.lap >= 3) {
        kart.finished = true;
        kart.finishTime = performance.now();
        finishOrder.push(kart.index);
        if (kart.isPlayer) {
          const pos = finishOrder.length;
          const points = [10, 7, 4, 2][pos - 1] || 1;
          score += points;
          scoreEl.textContent = score;
        }
      }
    } else if (dParam > numWP / 2) {
      kart.lap = Math.max(0, kart.lap - 1);
    }
    kart.trackParam = newParam;

    if (kart.boostTimer > 0 || kart.driftBoost > 0) {
      spawnParticles(
        kart.x - Math.cos(kart.angle) * 12,
        kart.y - Math.sin(kart.angle) * 12,
        '#f80', 1
      );
    }
    if (kart.starTimer > 0 && Math.random() < 0.3) {
      const colors = ['#f00', '#ff0', '#0f0', '#0ff', '#f0f'];
      spawnParticles(kart.x, kart.y, colors[Math.floor(Math.random() * 5)], 1);
    }

    for (const box of itemBoxes) {
      if (!box.active) continue;
      if (dist(kart, box) < 18 && kart.item === null) {
        box.active = false;
        box.respawnTimer = 180;
        giveRandomItem(kart);
        if (kart.isPlayer) itemEl.textContent = kart.itemName;
        spawnParticles(box.x, box.y, '#ff0', 6);
      }
    }

    for (let i = bananas.length - 1; i >= 0; i--) {
      if (dist(kart, bananas[i]) < 16 && bananas[i].owner !== kart.index && kart.invincTimer <= 0) {
        kart.spinTimer = 30;
        kart.speed *= 0.3;
        spawnParticles(kart.x, kart.y, '#ff0', 10);
        bananas.splice(i, 1);
      } else if (kart.starTimer > 0 && dist(kart, bananas[i]) < 16) {
        bananas.splice(i, 1);
      }
    }
  }

  // Kart-kart collision
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      if (a.finished || b.finished) continue;
      const d = dist(a, b);
      if (d < 20) {
        const nx = (b.x - a.x) / (d || 1);
        const ny = (b.y - a.y) / (d || 1);
        const overlap = 20 - d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        if (a.starTimer > 0 && b.invincTimer <= 0) { b.spinTimer = 30; b.speed *= 0.2; }
        if (b.starTimer > 0 && a.invincTimer <= 0) { a.spinTimer = 30; a.speed *= 0.2; }
        const totalW = a.def.weight + b.def.weight;
        a.speed -= (b.def.weight / totalW) * 0.3;
        b.speed -= (a.def.weight / totalW) * 0.3;
      }
    }
  }

  // Update shells
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life--;
    if (s.x < 5 || s.x > W - 5) { s.vx *= -1; s.bounces--; }
    if (s.y < 5 || s.y > H - 5) { s.vy *= -1; s.bounces--; }
    if (s.life <= 0 || s.bounces <= 0) { shells.splice(i, 1); continue; }
    for (const kart of karts) {
      if (kart.finished || kart.index === s.owner) continue;
      if (dist(kart, s) < 18) {
        if (kart.invincTimer > 0 || kart.starTimer > 0) {
          shells.splice(i, 1);
          spawnParticles(s.x, s.y, '#0f0', 8);
          break;
        }
        kart.spinTimer = 40;
        kart.speed *= 0.1;
        spawnParticles(kart.x, kart.y, '#f44', 12);
        shells.splice(i, 1);
        break;
      }
    }
  }

  // Respawn item boxes
  for (const box of itemBoxes) {
    if (!box.active) {
      box.respawnTimer--;
      if (box.respawnTimer <= 0) box.active = true;
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update player HUD
  const player = karts[0];
  if (player) {
    lapEl.textContent = Math.min(player.lap + 1, 3) + '/3';
    posEl.textContent = getPosition(player) + getSuffix(getPosition(player));
    itemEl.textContent = player.itemName;
  }

  // Check race end
  if (finishOrder.length >= 4 || (finishOrder.length > 0 && karts.every(k => k.finished || k.lap >= 3))) {
    endRace();
  }
  if (finishOrder.length > 0 && !raceFinished) {
    raceEndTimer++;
    if (raceEndTimer > 300) endRace();
  }
}

// ── HSL helper ──
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

// ── Rotate point around origin ──
function rotPt(x, y, cos, sin) {
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// Expand #rgb to #rrggbb
function expandHex(color) {
  if (color.length === 4 && color[0] === '#') {
    return '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3];
  }
  return color;
}

// ── Draw ──

function draw(renderer, text, game) {
  const track = tracks[currentTrack];
  const geom = trackGeomCache;

  // Background (track bg color)
  renderer.fillRect(0, 0, W, H, track.bg);

  // Grass pattern
  for (let i = 0; i < 200; i++) {
    const gx = (i * 137.5) % W;
    const gy = (i * 97.3) % H;
    renderer.fillRect(gx, gy, 2, 4, '#00aa0026'); // alpha ~15%
  }

  if (geom) {
    // Track surface (filled triangles)
    for (const tri of geom.surfaceTris) {
      renderer.fillPoly(tri, '#555');
    }

    // Outer border
    renderer.strokePoly(geom.outerPts, '#f44', 3, true);
    // Inner border
    renderer.strokePoly(geom.innerPts, '#f44', 3, true);

    // Center line (dashed - approximate with short segments)
    const cp = geom.centerPts;
    for (let i = 0; i < cp.length; i += 2) {
      const j = (i + 1) % cp.length;
      renderer.drawLine(cp[i].x, cp[i].y, cp[j].x, cp[j].y, '#888', 1);
    }

    // Rumble strips
    for (const r of geom.rumble) {
      renderer.fillRect(r.ox, r.oy, 4, 4, r.color);
      renderer.fillRect(r.ix, r.iy, 4, 4, r.color);
    }

    // Start/finish checkerboard
    for (const checker of geom.sfCheckers) {
      renderer.fillPoly(checker.pts, checker.color);
    }
  }

  // Item boxes
  const timeSec = frameCount / 60;
  for (const box of itemBoxes) {
    if (!box.active) continue;
    const bob = Math.sin(timeSec * 3 + box.x) * 3;
    const rot = timeSec * 2;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const bx = box.x, by = box.y + bob;
    // Rotated 16x16 square
    const half = 8;
    const corners = [
      rotPt(-half, -half, cos, sin),
      rotPt( half, -half, cos, sin),
      rotPt( half,  half, cos, sin),
      rotPt(-half,  half, cos, sin),
    ].map(p => ({ x: bx + p.x, y: by + p.y }));
    renderer.fillPoly(corners, '#fc0');
    renderer.strokePoly(corners, '#a80', 2, true);
    // '?' text centered
    text.drawText('?', bx, by - 7, 14, '#fff', 'center');
  }

  // Bananas
  for (const banana of bananas) {
    // Approximate banana arc as a series of line segments
    const bx = banana.x - 4;
    const by = banana.y;
    // Draw a curved banana shape with a poly approximation
    const pts = [];
    for (let a = 0.3; a <= Math.PI - 0.3; a += 0.2) {
      pts.push({
        x: bx + Math.cos(a) * 5 - Math.sin(a) * 0,
        y: by + Math.sin(a) * 5
      });
    }
    renderer.strokePoly(pts, '#ff0', 4, false);
    // Stem dot
    renderer.fillCircle(bx, by - 2, 1.5, '#a80');
  }

  // Shells
  for (const shell of shells) {
    renderer.fillCircle(shell.x, shell.y, 6, '#0f0');
    renderer.strokePoly([
      { x: shell.x - 6, y: shell.y },
      { x: shell.x + 6, y: shell.y },
      { x: shell.x, y: shell.y - 6 },
      { x: shell.x, y: shell.y + 6 },
    ], '#080', 2, false);
    renderer.fillCircle(shell.x - 1, shell.y - 1, 2, '#8f8');
  }

  // Karts (sorted by y for pseudo-depth)
  const sortedKarts = [...karts].sort((a, b) => a.y - b.y);
  for (const kart of sortedKarts) {
    drawKart(renderer, text, kart);
  }

  // Particles
  for (const p of particles) {
    const alpha = Math.max(0, p.life / 30);
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, expandHex(p.color) + alphaHex);
  }

  // Countdown
  if (gameState === 'countdown') {
    const sec = Math.ceil(countdownTimer / 60);
    renderer.fillRect(0, 0, W, H, '#00000080');
    const label = sec > 0 ? String(sec) : 'GO!';
    const labelColor = sec > 0 ? '#f44' : '#0f0';
    renderer.setGlow(labelColor, 0.8);
    text.drawText(label, W / 2, H / 2 - 40, 80, labelColor, 'center');
    renderer.setGlow(null);
    text.drawText(tracks[currentTrack].name, W / 2, H / 2 - 90, 20, '#fff', 'center');
    text.drawText('Race ' + (raceNum + 1) + '/3', W / 2, H / 2 + 48, 20, '#fff', 'center');
  }

  // Mini-map
  drawMiniMap(renderer, track);

  // Item display box (top-right)
  const player = karts[0];
  if (player && player.item !== null) {
    renderer.fillRect(W - 70, 10, 60, 60, '#000000b3');
    renderer.strokePoly([
      {x: W-70, y: 10}, {x: W-10, y: 10},
      {x: W-10, y: 70}, {x: W-70, y: 70}
    ], '#f44', 2, true);
    const itemLabels = ['MUSH', 'SHELL', 'BAN', 'STAR'];
    text.drawText(itemLabels[player.item] || '', W - 40, 47, 11, '#fff', 'center');
  }

  // Race end overlay content is handled by game.showOverlay / DOM
}

function drawKart(renderer, text, kart) {
  const cos = Math.cos(kart.angle);
  const sin = Math.sin(kart.angle);
  const cx = kart.x, cy = kart.y;

  function local(lx, ly) {
    return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
  }

  // Shadow (ellipse approximated with fillCircle at slight offset)
  renderer.fillCircle(cx + 2, cy + 2, 10, '#00000050');

  // Star rainbow effect
  let bodyColor = kart.def.color;
  if (kart.starTimer > 0) {
    const hue = (frameCount * 6) % 360;
    bodyColor = hslToHex(hue, 100, 60);
  }

  // Kart body polygon: moveTo(14,0), lineTo(-10,-8), lineTo(-12,-6), lineTo(-12,6), lineTo(-10,8)
  const bodyPts = [
    local(14, 0),
    local(-10, -8),
    local(-12, -6),
    local(-12, 6),
    local(-10, 8),
  ];
  renderer.fillPoly(bodyPts, bodyColor);
  renderer.strokePoly(bodyPts, '#000', 1.5, true);

  // Windshield: fillRect(2, -4, 5, 8) — 4 corners
  const wsPts = [
    local(2, -4), local(7, -4), local(7, 4), local(2, 4)
  ];
  renderer.fillPoly(wsPts, '#8cf');

  // Wheels: 4 fillRect calls
  // fillRect(-10,-10, 6,3)
  renderer.fillPoly([local(-10,-10), local(-4,-10), local(-4,-7), local(-10,-7)], '#222');
  // fillRect(-10, 7, 6,3)
  renderer.fillPoly([local(-10,7), local(-4,7), local(-4,10), local(-10,10)], '#222');
  // fillRect(6,-10, 6,3)
  renderer.fillPoly([local(6,-10), local(12,-10), local(12,-7), local(6,-7)], '#222');
  // fillRect(6, 7, 6,3)
  renderer.fillPoly([local(6,7), local(12,7), local(12,10), local(6,10)], '#222');

  // Boost flame
  if (kart.boostTimer > 0 || kart.driftBoost > 0) {
    const flameTip = -20 - Math.random() * 8;
    const outerFlame = [local(-12, -3), local(flameTip, 0), local(-12, 3)];
    renderer.fillPoly(outerFlame, '#f80');
    const innerTip = -16 - Math.random() * 5;
    const innerFlame = [local(-12, -2), local(innerTip, 0), local(-12, 2)];
    renderer.fillPoly(innerFlame, '#ff0');
  }

  // Drift sparks
  if (kart.drifting) {
    const sparkColor = kart.driftTimer > 60 ? '#f0f' : kart.driftTimer > 30 ? '#fa0' : '#48f';
    for (let i = 0; i < 3; i++) {
      const sx = -10 + Math.random() * 4 - 2;
      const sy = (kart.driftDir > 0 ? 8 : -8) + Math.random() * 4 - 2;
      const wp = local(sx, sy);
      renderer.fillRect(wp.x, wp.y, 2, 2, sparkColor);
    }
  }

  // Name label
  if (!kart.isPlayer) {
    text.drawText(kart.def.name, cx, cy - 26, 9, '#ffffffb3', 'center');
  } else {
    text.drawText('YOU', cx, cy - 26, 9, '#ff0', 'center');
  }
}

function drawMiniMap(renderer, track) {
  const mx = 10, my = H - 90, mw = 80, mh = 70;
  renderer.fillRect(mx, my, mw, mh, '#00000099');
  renderer.strokePoly([
    {x:mx,    y:my},
    {x:mx+mw, y:my},
    {x:mx+mw, y:my+mh},
    {x:mx,    y:my+mh}
  ], '#f44', 1, true);

  const wp = track.waypoints;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of wp) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const sx = (mw - 10) / (maxX - minX || 1);
  const sy = (mh - 10) / (maxY - minY || 1);
  const s = Math.min(sx, sy);
  const ox = mx + 5 + (mw - 10 - (maxX - minX) * s) / 2;
  const oy = my + 5 + (mh - 10 - (maxY - minY) * s) / 2;

  // Track path on mini-map
  const mapPts = wp.map(p => ({
    x: ox + (p.x - minX) * s,
    y: oy + (p.y - minY) * s
  }));
  renderer.strokePoly(mapPts, '#888', 2, true);

  // Kart dots
  for (const kart of karts) {
    const px = ox + (kart.x - minX) * s;
    const py = oy + (kart.y - minY) * s;
    renderer.fillCircle(px, py, kart.isPlayer ? 3 : 2, kart.def.color);
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    gameState = 'menu';
    score = 0;
    frameCount = 0;
    karts = [];
    shells = [];
    bananas = [];
    particles = [];
    itemBoxes = [];
    trackGeomCache = null;
    lapEl.textContent = '0/3';
    posEl.textContent = '-';
    itemEl.textContent = 'None';
    scoreEl.textContent = '0';
    game.showOverlay('KART RACER', 'Click to Start\n\nArrow Keys: Steer/Accel/Brake\nSpace: Use Item | Z: Drift');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Canvas click for menu/transitions
  const canvas = document.getElementById('game');
  canvas.addEventListener('click', () => {
    if (gameState === 'menu') {
      game.setState('playing');
      startGrandPrix();
    } else if (gameState === 'results') {
      game.setState('playing');
      startGrandPrix();
    } else if (gameState === 'raceEnd') {
      nextRace();
      if (gameState !== 'results') {
        game.hideOverlay();
      }
    }
  });

  // Make overlay clickable
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'pointer';
    overlay.addEventListener('click', () => {
      canvas.dispatchEvent(new Event('click'));
    });
  }

  game.onUpdate = () => {
    update(game);

    // Show overlays for race transitions
    if (gameState === 'raceEnd' && !raceFinished) {
      // Already handled in endRace
    }
    if (gameState === 'raceEnd' && raceFinished) {
      const playerPos = finishOrder.indexOf(0) + 1;
      let resultLines = [tracks[currentTrack].name, ''];
      finishOrder.forEach((idx, i) => {
        resultLines.push((i + 1) + getSuffix(i + 1) + ': ' + kartDefs[idx].name);
      });
      resultLines.push('');
      resultLines.push('Race ' + (raceNum + 1) + '/3 | Total Score: ' + score);
      if (raceNum < 2) resultLines.push('Click for Next Race');
      else resultLines.push('Click to See Results');
      const overlayTitleEl = document.getElementById('overlayTitle');
      const overlayTextEl = document.getElementById('overlayText');
      if (overlayTitleEl) overlayTitleEl.textContent = playerPos + getSuffix(playerPos) + ' Place!';
      if (overlayTextEl) overlayTextEl.innerHTML = resultLines.join('<br>');
      const overlayEl = document.getElementById('overlay');
      if (overlayEl) overlayEl.style.display = 'flex';
      raceFinished = false; // prevent re-showing every frame
    }

    if (gameState === 'results') {
      game.showOverlay('GRAND PRIX COMPLETE!', 'Total Score: ' + score + '\n\nClick to Play Again');
    }
  };

  game.onDraw = (renderer, text) => {
    draw(renderer, text, game);
  };

  game.start();
  return game;
}
