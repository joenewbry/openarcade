// micro-machines/game.js — Micro Machines game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ── Constants ──
const CAR_LEN = 14, CAR_WID = 8;
const FRICTION = 0.97;
const TURN_SPEED = 0.045;
const ACCEL = 0.18;
const BRAKE = 0.12;
const MAX_SPEED = 3.8;
const BOOST_MULT = 1.8;
const LAPS_TO_WIN = 3;
const POINTS_TO_WIN = 5;
const ITEM_TYPES = ['boost', 'oil', 'missile', 'shield'];
const ITEM_COLORS = { boost: '#00ff00', oil: '#884400', missile: '#ff0000', shield: '#0088ff' };
const ITEM_NAMES  = { boost: 'BOOST', oil: 'OIL SLICK', missile: 'MISSILE', shield: 'SHIELD' };
const CAR_COLORS  = ['#ff3333', '#33ccff', '#33ff33', '#ffff33'];
const CAR_NAMES   = ['Red', 'Blue', 'Green', 'Yellow'];

// ── Track Definitions ──
const TRACKS = [];

TRACKS.push({
  name: 'Kitchen Table',
  bg: '#8B6F47',
  trackColor: '#a08060',
  borderColor: '#604020',
  waypoints: [
    {x:300,y:420},{x:160,y:400},{x:80,y:340},{x:60,y:250},
    {x:80,y:160},{x:160,y:100},{x:300,y:80},{x:440,y:100},
    {x:520,y:160},{x:540,y:250},{x:520,y:340},{x:440,y:400}
  ],
  width: 60,
  obstacles: [
    {type:'book',   x:200,y:250,w:50,h:35,color:'#cc4444',angle:0.2},
    {type:'cup',    x:400,y:200,r:18,color:'#dddddd'},
    {type:'pen',    x:350,y:350,w:60,h:5, color:'#222299',angle:-0.4},
    {type:'eraser', x:150,y:180,w:25,h:15,color:'#ff99aa',angle:0.5}
  ],
  itemSpawns: [{x:300,y:420},{x:80,y:250},{x:300,y:80},{x:520,y:250}],
  startX: 300, startY: 450, startAngle: -Math.PI/2
});

TRACKS.push({
  name: 'Study Desk',
  bg: '#5a4a3a',
  trackColor: '#7a6a5a',
  borderColor: '#3a2a1a',
  waypoints: [
    {x:150,y:430},{x:70,y:370},{x:60,y:280},{x:100,y:200},
    {x:200,y:160},{x:300,y:200},{x:400,y:300},{x:500,y:340},
    {x:540,y:280},{x:530,y:200},{x:480,y:140},{x:380,y:100},
    {x:300,y:120},{x:200,y:200},{x:140,y:320},{x:150,y:400}
  ],
  width: 52,
  obstacles: [
    {type:'book',   x:320,y:380,w:55,h:40,color:'#4488aa',angle:-0.1},
    {type:'cup',    x:450,y:230,r:16,color:'#eeeeee'},
    {type:'pen',    x:180,y:300,w:55,h:5, color:'#333333',angle:0.8},
    {type:'eraser', x:400,y:160,w:20,h:12,color:'#ffccaa',angle:-0.3},
    {type:'book',   x:120,y:140,w:40,h:30,color:'#66aa44',angle:0.4}
  ],
  itemSpawns: [{x:150,y:430},{x:100,y:200},{x:480,y:140},{x:540,y:280}],
  startX: 200, startY: 450, startAngle: -Math.PI/2
});

TRACKS.push({
  name: 'Bathroom Counter',
  bg: '#607080',
  trackColor: '#8090a0',
  borderColor: '#405060',
  waypoints: [
    {x:100,y:440},{x:60,y:360},{x:80,y:260},{x:140,y:180},
    {x:240,y:120},{x:360,y:90},{x:460,y:120},{x:520,y:200},
    {x:540,y:300},{x:500,y:380},{x:420,y:420},{x:340,y:380},
    {x:280,y:320},{x:250,y:260},{x:280,y:200},{x:340,y:180},
    {x:400,y:220},{x:400,y:300},{x:350,y:360},{x:260,y:400},
    {x:180,y:430}
  ],
  width: 48,
  obstacles: [
    {type:'cup',    x:180,y:260,r:20,color:'#ffaaff'},
    {type:'book',   x:440,y:300,w:35,h:50,color:'#ffffff',angle:0},
    {type:'eraser', x:320,y:260,w:30,h:18,color:'#aaffaa',angle:0.7},
    {type:'cup',    x:130,y:350,r:14,color:'#ffff88'}
  ],
  itemSpawns: [{x:100,y:440},{x:240,y:120},{x:520,y:200},{x:350,y:360}],
  startX: 140, startY: 460, startAngle: -Math.PI/2
});

// ── Module-scope state ──
let score = 0;
let best = parseInt(localStorage.getItem('microMachinesBest')) || 0;
let cars = [], items = [], projectiles = [], particles = [];
let currentTrack = 0;
let track = TRACKS[0];
let raceCountdown = 0;
let cameraX = 0, cameraY = 0;
let playerPoints = [0,0,0,0];
let raceOver = false;
let raceEndTimer = 0;
let matchOver = false;
const numPlayers = 4;
let frameCounter = 0;
let itemPulseFrame = 0; // frame-based pulse for items

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const lapEl   = document.getElementById('lapDisplay');
const itemEl  = document.getElementById('itemDisplay');

if (bestEl) bestEl.textContent = best;

// ── Utility ──
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a, b, t) { return a + (b - a) * t; }
function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
function randRange(a, b) { return a + Math.random() * (b - a); }

// Rotate a point around origin
function rotPt(x, y, cos, sin) {
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// ── Track geometry ──
function nearestWaypointSegment(px, py) {
  const wp = track.waypoints;
  let bestDist = Infinity, bestIdx = 0, bestT = 0;
  for (let i = 0; i < wp.length; i++) {
    const j = (i + 1) % wp.length;
    const ax = wp[i].x, ay = wp[i].y;
    const bx = wp[j].x, by = wp[j].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < bestDist) { bestDist = d; bestIdx = i; bestT = t; }
  }
  return { dist: bestDist, idx: bestIdx, t: bestT };
}

function isOnTrack(px, py) {
  return nearestWaypointSegment(px, py).dist < track.width / 2 + 5;
}

function getTrackProgress(px, py) {
  const r = nearestWaypointSegment(px, py);
  return (r.idx + r.t) / track.waypoints.length;
}

// ── Car Factory ──
function createCar(idx, isPlayer) {
  const sx = track.startX + (idx % 2) * 25 - 12;
  const sy = track.startY + Math.floor(idx / 2) * 25;
  return {
    x: sx, y: sy,
    vx: 0, vy: 0,
    angle: track.startAngle,
    speed: 0,
    idx: idx,
    isPlayer: isPlayer,
    color: CAR_COLORS[idx],
    item: null,
    shieldTimer: 0,
    boostTimer: 0,
    spinTimer: 0,
    lap: 0,
    lastProgress: 0,
    crossedStart: false,
    alive: true,
    offscreenTimer: 0,
    finished: false,
    finishOrder: -1,
    aiTargetWP: 2,
    aiItemCooldown: 0,
    aiSteerNoise: 0
  };
}

// ── Race / Match management ──
function startRace() {
  track = TRACKS[currentTrack % TRACKS.length];
  cars = [];
  for (let i = 0; i < numPlayers; i++) {
    cars.push(createCar(i, i === 0));
  }
  items = [];
  projectiles = [];
  particles = [];
  raceOver = false;
  raceEndTimer = 0;
  raceCountdown = 180;
  spawnItems();
  updateScoreBar();
}

function spawnItems() {
  items = [];
  for (const sp of track.itemSpawns) {
    items.push({
      x: sp.x + randRange(-15, 15),
      y: sp.y + randRange(-15, 15),
      type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
      respawnTimer: 0
    });
  }
}

function updateScoreBar() {
  const car = cars[0];
  if (car && lapEl) {
    lapEl.textContent = Math.min(car.lap + 1, LAPS_TO_WIN) + '/' + LAPS_TO_WIN;
  }
  if (scoreEl) scoreEl.textContent = playerPoints[0];
}

// ── Update ──
function update(game) {
  frameCounter++;
  itemPulseFrame++;

  if (game.state === 'waiting') {
    // Waiting for Enter — input handled by onUpdate checking wasPressed
    if (game.input.wasPressed('Enter')) {
      startMatch(game);
    }
    return;
  }

  if (game.state === 'over') {
    if (game.input.wasPressed('Enter')) {
      startMatch(game);
    }
    return;
  }

  // 'playing' state
  if (raceCountdown > 0) {
    raceCountdown--;
    return;
  }

  if (raceOver) {
    raceEndTimer++;
    if (raceEndTimer > 150) {
      // Award points: 1st=3, 2nd=2, 3rd=1, 4th=0
      const pts = [3, 2, 1, 0];
      const finishOrder = cars.filter(c => c.finished).sort((a, b) => a.finishOrder - b.finishOrder);
      const unfinished = cars.filter(c => !c.finished);
      const order = [...finishOrder, ...unfinished];
      for (let i = 0; i < order.length; i++) {
        playerPoints[order[i].idx] += pts[i] || 0;
      }
      score = playerPoints[0];
      if (scoreEl) scoreEl.textContent = score;
      if (score > best) {
        best = score;
        if (bestEl) bestEl.textContent = best;
        localStorage.setItem('microMachinesBest', best);
      }

      if (playerPoints.some(p => p >= POINTS_TO_WIN)) {
        const winner = playerPoints.indexOf(Math.max(...playerPoints));
        const winnerName = winner === 0 ? 'YOU' : CAR_NAMES[winner];
        game.setState('over');
        game.showOverlay(
          winner === 0 ? 'YOU WIN!' : winnerName.toUpperCase() + ' WINS!',
          'Final Scores:\n' + cars.map((c, i) => CAR_NAMES[i] + ': ' + playerPoints[i] + ' pts').join(', ') +
          '\n\nPress ENTER to play again'
        );
        return;
      }

      currentTrack++;
      startRace();
      return;
    }
    updateParticles();
    return;
  }

  // Update cars
  for (const car of cars) {
    if (car.finished) continue;
    updateCar(car, game);
  }

  // Check race done
  const finishCount = cars.filter(c => c.finished).length;
  if (finishCount >= 1 && !raceOver) {
    raceOver = true;
    const remaining = cars.filter(c => !c.finished)
      .sort((a, b) => {
        const pa = a.lap + getTrackProgress(a.x, a.y);
        const pb = b.lap + getTrackProgress(b.x, b.y);
        return pb - pa;
      });
    let nextOrder = finishCount;
    for (const c of remaining) {
      c.finished = true;
      c.finishOrder = nextOrder++;
    }
  }

  // Respawn items
  for (const item of items) {
    if (item.respawnTimer > 0) {
      item.respawnTimer--;
      if (item.respawnTimer === 0) {
        item.type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      }
    }
  }

  updateProjectiles();
  updateParticles();

  // Camera follows leader (or player)
  let leader = cars[0];
  let bestProgress = -1;
  for (const c of cars) {
    const p = c.lap * 100 + getTrackProgress(c.x, c.y) * 100;
    if (p > bestProgress) { bestProgress = p; leader = c; }
  }
  cameraX = lerp(cameraX, leader.x - W / 2, 0.08);
  cameraY = lerp(cameraY, leader.y - H / 2, 0.08);

  // Off-screen respawn
  for (const car of cars) {
    if (car.finished) continue;
    const sx = car.x - cameraX, sy = car.y - cameraY;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) {
      car.offscreenTimer++;
      if (car.offscreenTimer > 60) {
        respawnCar(car);
        car.offscreenTimer = 0;
      }
    } else {
      car.offscreenTimer = 0;
    }
  }

  updateScoreBar();
}

function startMatch(game) {
  playerPoints = [0, 0, 0, 0];
  score = 0;
  currentTrack = 0;
  game.setState('playing');
  cameraX = TRACKS[0].startX - W / 2;
  cameraY = TRACKS[0].startY - H / 2;
  startRace();
}

function updateCar(car, game) {
  if (car.spinTimer > 0) {
    car.spinTimer--;
    car.angle += 0.2;
    car.vx *= 0.95;
    car.vy *= 0.95;
    car.x += car.vx;
    car.y += car.vy;
    return;
  }

  let accel = 0, steer = 0, useItem = false;

  if (car.isPlayer) {
    if (game.input.isDown('ArrowUp'))   accel = 1;
    if (game.input.isDown('ArrowDown')) accel = -0.6;
    if (game.input.isDown('ArrowLeft')) steer = -1;
    if (game.input.isDown('ArrowRight')) steer = 1;
    if (game.input.wasPressed(' '))     useItem = true;
  } else {
    const ai = getAIInput(car);
    accel = ai.accel;
    steer = ai.steer;
    useItem = ai.useItem;
  }

  let maxSpd = MAX_SPEED;
  if (car.boostTimer > 0) {
    car.boostTimer--;
    maxSpd *= BOOST_MULT;
    if (Math.random() < 0.3) {
      particles.push({
        x: car.x - Math.cos(car.angle) * 8,
        y: car.y - Math.sin(car.angle) * 8,
        vx: randRange(-1, 1), vy: randRange(-1, 1),
        life: 15, maxLife: 15, color: '#ff8800', size: 3
      });
    }
  }
  if (car.shieldTimer > 0) car.shieldTimer--;

  const speed = Math.hypot(car.vx, car.vy);
  if (speed > 0.3) {
    car.angle += steer * TURN_SPEED * Math.min(speed / 2, 1);
  }

  if (accel > 0) {
    car.vx += Math.cos(car.angle) * ACCEL * accel;
    car.vy += Math.sin(car.angle) * ACCEL * accel;
  } else if (accel < 0) {
    car.vx += Math.cos(car.angle) * BRAKE * accel;
    car.vy += Math.sin(car.angle) * BRAKE * accel;
  }

  car.vx *= FRICTION;
  car.vy *= FRICTION;

  const speed2 = Math.hypot(car.vx, car.vy);
  if (speed2 > maxSpd) {
    car.vx = (car.vx / speed2) * maxSpd;
    car.vy = (car.vy / speed2) * maxSpd;
  }

  if (!isOnTrack(car.x, car.y)) {
    car.vx *= 0.93;
    car.vy *= 0.93;
    if (Math.random() < 0.2) {
      particles.push({
        x: car.x, y: car.y,
        vx: randRange(-0.5, 0.5), vy: randRange(-0.5, 0.5),
        life: 20, maxLife: 20, color: '#aa9988', size: 4
      });
    }
  }

  car.x += car.vx;
  car.y += car.vy;

  // Obstacle collision
  for (const obs of track.obstacles) {
    if (obs.type === 'cup') {
      if (dist(car, obs) < obs.r + 6) {
        const dx = car.x - obs.x, dy = car.y - obs.y;
        const d = Math.hypot(dx, dy) || 1;
        car.x = obs.x + (dx / d) * (obs.r + 7);
        car.y = obs.y + (dy / d) * (obs.r + 7);
        car.vx = (dx / d) * speed2 * 0.5;
        car.vy = (dy / d) * speed2 * 0.5;
      }
    } else {
      const co = Math.cos(-(obs.angle || 0)), si = Math.sin(-(obs.angle || 0));
      const rx = (car.x - obs.x) * co - (car.y - obs.y) * si;
      const ry = (car.x - obs.x) * si + (car.y - obs.y) * co;
      const hw = (obs.w || 40) / 2 + 5, hh = (obs.h || 20) / 2 + 5;
      if (Math.abs(rx) < hw && Math.abs(ry) < hh) {
        let outRx = rx, outRy = ry;
        if (Math.abs(rx) / hw > Math.abs(ry) / hh) {
          outRx = rx > 0 ? hw : -hw;
        } else {
          outRy = ry > 0 ? hh : -hh;
        }
        const co2 = Math.cos(obs.angle || 0), si2 = Math.sin(obs.angle || 0);
        car.x = obs.x + outRx * co2 - outRy * si2;
        car.y = obs.y + outRx * si2 + outRy * co2;
        car.vx *= -0.3;
        car.vy *= -0.3;
      }
    }
  }

  // Car-car collision
  for (const other of cars) {
    if (other === car || other.finished) continue;
    const d = dist(car, other);
    if (d < 12 && d > 0) {
      const dx = car.x - other.x, dy = car.y - other.y;
      const push = (12 - d) / 2;
      car.x += (dx / d) * push;
      car.y += (dy / d) * push;
      other.x -= (dx / d) * push;
      other.y -= (dy / d) * push;
      const tvx = car.vx, tvy = car.vy;
      car.vx = lerp(car.vx, other.vx, 0.3);
      car.vy = lerp(car.vy, other.vy, 0.3);
      other.vx = lerp(other.vx, tvx, 0.3);
      other.vy = lerp(other.vy, tvy, 0.3);
    }
  }

  // Item pickup
  for (const item of items) {
    if (item.respawnTimer > 0) continue;
    if (dist(car, item) < 18 && !car.item) {
      car.item = item.type;
      item.respawnTimer = 300;
      if (car.isPlayer && itemEl) itemEl.textContent = ITEM_NAMES[car.item];
    }
  }

  if (useItem && car.item) {
    activateItem(car);
  }

  // Lap tracking
  const progress = getTrackProgress(car.x, car.y);
  if (car.lastProgress > 0.8 && progress < 0.2) {
    car.lap++;
    if (car.lap >= LAPS_TO_WIN) {
      car.finished = true;
      car.finishOrder = cars.filter(c => c.finished).length - 1;
    }
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: car.x, y: car.y,
        vx: randRange(-2, 2), vy: randRange(-2, 2),
        life: 30, maxLife: 30, color: car.color, size: 3
      });
    }
  } else if (car.lastProgress < 0.2 && progress > 0.8) {
    car.lap = Math.max(0, car.lap - 1);
  }
  car.lastProgress = progress;

  // Tire smoke
  if (Math.abs(steer) > 0.5 && speed2 > 2) {
    particles.push({
      x: car.x - Math.cos(car.angle) * 5,
      y: car.y - Math.sin(car.angle) * 5,
      vx: randRange(-0.3, 0.3), vy: randRange(-0.3, 0.3),
      life: 12, maxLife: 12, color: '#888888', size: 2
    });
  }
}

function activateItem(car) {
  const type = car.item;
  car.item = null;
  if (car.isPlayer && itemEl) itemEl.textContent = 'None';

  switch (type) {
    case 'boost':
      car.boostTimer = 45;
      break;
    case 'oil':
      projectiles.push({
        type: 'oil',
        x: car.x - Math.cos(car.angle) * 15,
        y: car.y - Math.sin(car.angle) * 15,
        vx: 0, vy: 0,
        owner: car.idx,
        life: 600, r: 12
      });
      break;
    case 'missile':
      projectiles.push({
        type: 'missile',
        x: car.x + Math.cos(car.angle) * 10,
        y: car.y + Math.sin(car.angle) * 10,
        vx: Math.cos(car.angle) * 6,
        vy: Math.sin(car.angle) * 6,
        owner: car.idx,
        life: 120, r: 4
      });
      break;
    case 'shield':
      car.shieldTimer = 300;
      break;
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life--;
    if (p.life <= 0) { projectiles.splice(i, 1); continue; }

    if (p.type === 'missile') {
      p.x += p.vx;
      p.y += p.vy;
      particles.push({
        x: p.x, y: p.y,
        vx: randRange(-0.5, 0.5), vy: randRange(-0.5, 0.5),
        life: 10, maxLife: 10, color: '#ff8800', size: 2
      });
    }

    for (const car of cars) {
      if (car.idx === p.owner || car.finished || car.spinTimer > 0) continue;
      if (dist(car, p) < p.r + 6) {
        if (car.shieldTimer > 0) {
          car.shieldTimer = Math.max(0, car.shieldTimer - 60);
          for (let j = 0; j < 8; j++) {
            particles.push({
              x: car.x, y: car.y,
              vx: randRange(-2, 2), vy: randRange(-2, 2),
              life: 20, maxLife: 20, color: '#0088ff', size: 3
            });
          }
        } else {
          if (p.type === 'missile') {
            car.spinTimer = 40;
            car.vx = p.vx * 0.5;
            car.vy = p.vy * 0.5;
            for (let j = 0; j < 15; j++) {
              particles.push({
                x: car.x, y: car.y,
                vx: randRange(-3, 3), vy: randRange(-3, 3),
                life: 25, maxLife: 25, color: '#ff8800', size: 4
              });
            }
          } else if (p.type === 'oil') {
            car.spinTimer = 30;
            continue; // oil persists
          }
        }
        if (p.type === 'missile') {
          projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function respawnCar(car) {
  const r = nearestWaypointSegment(car.x, car.y);
  const wp = track.waypoints;
  const i = r.idx, j = (i + 1) % wp.length;
  car.x = lerp(wp[i].x, wp[j].x, r.t);
  car.y = lerp(wp[i].y, wp[j].y, r.t);
  car.vx = 0;
  car.vy = 0;
  const ni = (r.idx + 2) % wp.length;
  car.angle = Math.atan2(wp[ni].y - car.y, wp[ni].x - car.x);
  car.spinTimer = 0;
}

// ── AI ──
function getAIInput(car) {
  const wp = track.waypoints;
  const target = wp[car.aiTargetWP % wp.length];
  const dx = target.x - car.x, dy = target.y - car.y;
  const distToTarget = Math.hypot(dx, dy);

  if (distToTarget < 40) {
    car.aiTargetWP = (car.aiTargetWP + 1) % wp.length;
  }

  const desiredAngle = Math.atan2(dy, dx);
  const diff = angleDiff(car.angle, desiredAngle);

  if (Math.random() < 0.02) car.aiSteerNoise = randRange(-0.3, 0.3);

  let steer = 0;
  if (diff > 0.05) steer = Math.min(1, diff * 2 + car.aiSteerNoise);
  else if (diff < -0.05) steer = Math.max(-1, diff * 2 + car.aiSteerNoise);

  const speed = Math.hypot(car.vx, car.vy);
  let accel = 1;
  if (Math.abs(diff) > 0.8 && speed > 2) accel = -0.3;
  else if (Math.abs(diff) > 0.4 && speed > 2.5) accel = 0.3;

  let useItem = false;
  if (car.item && car.aiItemCooldown <= 0) {
    if (car.item === 'boost') {
      if (Math.abs(diff) < 0.3) { useItem = true; car.aiItemCooldown = 60; }
    } else if (car.item === 'missile') {
      for (const other of cars) {
        if (other.idx === car.idx) continue;
        const toDist = dist(car, other);
        if (toDist < 120 && toDist > 20) {
          const toAngle = Math.atan2(other.y - car.y, other.x - car.x);
          if (Math.abs(angleDiff(car.angle, toAngle)) < 0.3) {
            useItem = true;
            car.aiItemCooldown = 90;
          }
        }
      }
    } else if (car.item === 'oil') {
      for (const other of cars) {
        if (other.idx === car.idx) continue;
        const toDist = dist(car, other);
        const toAngle = Math.atan2(other.y - car.y, other.x - car.x);
        const behind = Math.abs(angleDiff(car.angle, toAngle)) > 2;
        if (toDist < 60 && behind) { useItem = true; car.aiItemCooldown = 90; }
      }
      if (Math.random() < 0.005) { useItem = true; car.aiItemCooldown = 90; }
    } else if (car.item === 'shield') {
      const nearCar = cars.some(c => c.idx !== car.idx && dist(c, car) < 80);
      if (nearCar && Math.random() < 0.02) { useItem = true; car.aiItemCooldown = 60; }
    }
  }
  if (car.aiItemCooldown > 0) car.aiItemCooldown--;

  return { accel, steer, useItem };
}

// ── Drawing helpers ──

// Build a thick stroke polyline as a filled polygon strip
// Returns flat {x,y} list of the strip triangles for fillPoly per segment
function buildTrackStrip(waypoints, halfWidth, offX = 0, offY = 0) {
  // Returns array of quads as [{x,y}] arrays for each segment (camera-offset applied)
  const segs = [];
  const n = waypoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = waypoints[i].x - offX, ay = waypoints[i].y - offY;
    const bx = waypoints[j].x - offX, by = waypoints[j].y - offY;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    const nx = -dy / len * halfWidth;
    const ny = dx / len * halfWidth;
    // Quad: 4 corners
    segs.push([
      { x: ax + nx, y: ay + ny },
      { x: ax - nx, y: ay - ny },
      { x: bx - nx, y: by - ny },
      { x: bx + nx, y: by + ny }
    ]);
  }
  return segs;
}

function drawTrackStrips(renderer, waypoints, halfWidth, color, offX = 0, offY = 0) {
  const segs = buildTrackStrip(waypoints, halfWidth, offX, offY);
  for (const quad of segs) {
    renderer.fillPoly(quad, color);
  }
}

function drawCar(renderer, text, car, cx, cy) {
  // All positions are world-space; apply camera offset
  const wx = car.x - cx;
  const wy = car.y - cy;

  const cosA = Math.cos(car.angle), sinA = Math.sin(car.angle);
  const hl = CAR_LEN / 2, hw = CAR_WID / 2;

  // Helper: rotate local point and add world offset
  function wp(lx, ly) {
    return { x: wx + lx * cosA - ly * sinA, y: wy + lx * sinA + ly * cosA };
  }

  // Shadow (slight offset)
  const shadowOff = 1;
  renderer.fillPoly([
    { x: wx + shadowOff + (-hl) * cosA - (-hw) * sinA, y: wy + shadowOff + (-hl) * sinA + (-hw) * cosA },
    { x: wx + shadowOff + ( hl) * cosA - (-hw) * sinA, y: wy + shadowOff + ( hl) * sinA + (-hw) * cosA },
    { x: wx + shadowOff + ( hl) * cosA - ( hw) * sinA, y: wy + shadowOff + ( hl) * sinA + ( hw) * cosA },
    { x: wx + shadowOff + (-hl) * cosA - ( hw) * sinA, y: wy + shadowOff + (-hl) * sinA + ( hw) * cosA },
  ], '#00000066');

  // Car body
  renderer.fillPoly([wp(-hl, -hw), wp(hl, -hw), wp(hl, hw), wp(-hl, hw)], car.color);

  // Windshield (front-right rect)
  // Windshield at x: hl-5 to hl-2, y: -hw+1 to hw-1
  renderer.fillPoly([
    wp(hl - 5, -hw + 1), wp(hl - 2, -hw + 1),
    wp(hl - 2, hw - 1), wp(hl - 5, hw - 1)
  ], '#00000099');

  // Headlights (front)
  renderer.fillRect(wx + (hl) * cosA - (-hw + 1) * sinA - 1,
                    wy + (hl) * sinA + (-hw + 1) * cosA - 1, 2, 2, '#ffff88');
  renderer.fillRect(wx + (hl) * cosA - ( hw - 3) * sinA - 1,
                    wy + (hl) * sinA + ( hw - 3) * cosA - 1, 2, 2, '#ffff88');

  // Tail lights (rear)
  renderer.fillRect(wx + (-hl - 1) * cosA - (-hw + 1) * sinA - 1,
                    wy + (-hl - 1) * sinA + (-hw + 1) * cosA - 1, 2, 2, '#ff0000');
  renderer.fillRect(wx + (-hl - 1) * cosA - ( hw - 3) * sinA - 1,
                    wy + (-hl - 1) * sinA + ( hw - 3) * cosA - 1, 2, 2, '#ff0000');

  // Shield
  if (car.shieldTimer > 0) {
    const alpha = Math.round((0.4 + Math.sin(frameCounter * 0.1) * 0.2) * 255).toString(16).padStart(2, '0');
    renderer.setGlow('#0088ff', 0.5);
    renderer.strokePoly(
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return { x: wx + Math.cos(a) * 12, y: wy + Math.sin(a) * 12 };
      }),
      '#0088ff' + alpha, 2, true
    );
    renderer.setGlow(null);
  }

  // AI item dot
  if (car.item && !car.isPlayer) {
    renderer.fillCircle(wx, wy - 14, 4, ITEM_COLORS[car.item]);
  }

  // Player indicator
  if (car.isPlayer) {
    text.drawText('P1', wx, wy - 22, 8, '#ffffff', 'center');
  }
}

function drawObstacle(renderer, obs, cx, cy) {
  const ox = obs.x - cx;
  const oy = obs.y - cy;
  const cosA = Math.cos(obs.angle || 0), sinA = Math.sin(obs.angle || 0);

  function wp(lx, ly) {
    return { x: ox + lx * cosA - ly * sinA, y: oy + lx * sinA + ly * cosA };
  }

  if (obs.type === 'cup') {
    // Outer shadow circle
    renderer.fillCircle(ox, oy, obs.r + 1, '#00000033');
    // Cup circle
    renderer.fillCircle(ox, oy, obs.r, obs.color);
    // Inner shadow
    renderer.fillCircle(ox, oy, obs.r - 4, '#00000022');
    // Handle arc: approximate with a small filled rect arc
    // Draw handle as a line
    renderer.drawLine(
      ox + (obs.r - 2) * cosA, oy + (obs.r - 2) * sinA,
      ox + (obs.r + 4) * cosA, oy + (obs.r + 4) * sinA,
      obs.color, 4
    );
  } else if (obs.type === 'book') {
    const hw = obs.w / 2, hh = obs.h / 2;
    // Cover
    renderer.fillPoly([wp(-hw, -hh), wp(hw, -hh), wp(hw, hh), wp(-hw, hh)], obs.color);
    // Pages (off-white interior)
    renderer.fillPoly([wp(-hw + 3, -hh + 2), wp(hw - 3, -hh + 2), wp(hw - 3, hh - 2), wp(-hw + 3, hh - 2)], '#ffffe0');
    // Spine (top strip, same as cover)
    renderer.fillPoly([wp(-hw, -hh), wp(hw, -hh), wp(hw, -hh + 5), wp(-hw, -hh + 5)], obs.color);
    // Title line
    renderer.fillPoly([wp(-obs.w / 4, -hh + 1.5), wp(obs.w / 4, -hh + 1.5),
                       wp(obs.w / 4, -hh + 3.5), wp(-obs.w / 4, -hh + 3.5)], '#00000066');
  } else if (obs.type === 'pen') {
    const hw = obs.w / 2, hh = obs.h / 2;
    // Pen body
    renderer.fillPoly([wp(-hw, -hh), wp(hw, -hh), wp(hw, hh), wp(-hw, hh)], obs.color);
    // Tip triangle
    renderer.fillPoly([wp(hw, -hh), wp(hw + 6, 0), wp(hw, hh)], '#111111');
    // Clip bar
    renderer.fillPoly([wp(-hw + 2, -hh - 2), wp(-hw + 10, -hh - 2),
                       wp(-hw + 10, hh + 2), wp(-hw + 2, hh + 2)], '#cccccc');
  } else if (obs.type === 'eraser') {
    const hw = obs.w / 2, hh = obs.h / 2;
    // Eraser body
    renderer.fillPoly([wp(-hw, -hh), wp(hw, -hh), wp(hw, hh), wp(-hw, hh)], obs.color);
    // Band
    const bx0 = -hw + obs.w * 0.3;
    const bx1 = bx0 + obs.w * 0.15;
    renderer.fillPoly([wp(bx0, -hh), wp(bx1, -hh), wp(bx1, hh), wp(bx0, hh)], '#00000022');
  }
}

// ── Main draw ──
function draw(renderer, text, game) {
  // Background
  renderer.fillRect(0, 0, W, H, track.bg);

  if (game.state === 'waiting') {
    // Nothing extra in waiting — overlay handles it
    return;
  }

  // Camera offset
  const cx = cameraX, cy = cameraY;

  // ── Track surface ──
  // Border (wider)
  drawTrackStrips(renderer, track.waypoints, track.width / 2 + 4, track.borderColor, cx, cy);
  // Surface
  drawTrackStrips(renderer, track.waypoints, track.width / 2, track.trackColor, cx, cy);

  // Center dashed line (approximate with dotted segments)
  const wp = track.waypoints;
  for (let i = 0; i < wp.length; i++) {
    const j = (i + 1) % wp.length;
    const ax = wp[i].x - cx, ay = wp[i].y - cy;
    const bx = wp[j].x - cx, by = wp[j].y - cy;
    const len = Math.hypot(bx - ax, by - ay);
    const dx = (bx - ax) / len, dy = (by - ay) / len;
    let d = 0;
    while (d < len) {
      const segEnd = Math.min(d + 8, len);
      renderer.drawLine(
        ax + dx * d, ay + dy * d,
        ax + dx * segEnd, ay + dy * segEnd,
        '#ffffff22', 1.5
      );
      d += 20; // 8 on, 12 off
    }
  }

  // ── Start/Finish line ──
  {
    const sx = track.startX - cx, sy = track.startY - cy;
    const a = track.startAngle + Math.PI / 2;
    const cosA = Math.cos(a), sinA = Math.sin(a);
    const hw = track.width / 2;
    const sq = 6;
    const n = Math.floor(hw * 2 / sq);
    for (let i = 0; i < n; i++) {
      const t0 = -hw + i * sq;
      const t1 = t0 + sq;
      const color = i % 2 === 0 ? '#ffffff' : '#111111';
      // Local rect: x from t0..t1, y from -2..2
      renderer.fillPoly([
        { x: sx + t0 * cosA - (-2) * sinA, y: sy + t0 * sinA + (-2) * cosA },
        { x: sx + t1 * cosA - (-2) * sinA, y: sy + t1 * sinA + (-2) * cosA },
        { x: sx + t1 * cosA - ( 2) * sinA, y: sy + t1 * sinA + ( 2) * cosA },
        { x: sx + t0 * cosA - ( 2) * sinA, y: sy + t0 * sinA + ( 2) * cosA },
      ], color);
    }
  }

  // ── Obstacles ──
  for (const obs of track.obstacles) {
    drawObstacle(renderer, obs, cx, cy);
  }

  // ── Items ──
  const pulse = 0.8 + Math.sin(itemPulseFrame * (2 * Math.PI / 60)) * 0.2;
  for (const item of items) {
    if (item.respawnTimer > 0) continue;
    const ix = item.x - cx, iy = item.y - cy;
    const r = 8 * pulse;
    // Glow aura
    renderer.setGlow(ITEM_COLORS[item.type], 0.6);
    renderer.fillCircle(ix, iy, r + 4, ITEM_COLORS[item.type] + '30');
    renderer.fillCircle(ix, iy, r, ITEM_COLORS[item.type]);
    renderer.setGlow(null);
    // Icon letter
    const icons = { boost: 'B', oil: 'O', missile: 'M', shield: 'S' };
    text.drawText(icons[item.type], ix, iy - 4, 8, '#ffffff', 'center');
  }

  // ── Projectiles ──
  for (const p of projectiles) {
    const px = p.x - cx, py = p.y - cy;
    if (p.type === 'oil') {
      renderer.fillCircle(px, py, p.r, '#442200aa');
      renderer.fillCircle(px + 2, py - 2, p.r * 0.6, '#55330088');
    } else if (p.type === 'missile') {
      const angle = Math.atan2(p.vy, p.vx);
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      function mwp(lx, ly) {
        return { x: px + lx * cosA - ly * sinA, y: py + lx * sinA + ly * cosA };
      }
      renderer.fillPoly([mwp(-5, -2), mwp(5, -2), mwp(5, 2), mwp(-5, 2)], '#ff4444');
      renderer.fillPoly([mwp(4, -1.5), mwp(7, -1.5), mwp(7, 1.5), mwp(4, 1.5)], '#ffff00');
    }
  }

  // ── Particles ──
  for (const p of particles) {
    const alpha = Math.min(1, p.life / (p.maxLife || 30));
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    const baseColor = p.color.length === 7 ? p.color : p.color.slice(0, 7);
    renderer.fillRect(p.x - cx - p.size / 2, p.y - cy - p.size / 2, p.size, p.size, baseColor + alphaHex);
  }

  // ── Cars ──
  for (const car of cars) {
    drawCar(renderer, text, car, cx, cy);
  }

  // ── HUD (screen-space, no camera offset) ──
  drawHUD(renderer, text, game);
}

function drawHUD(renderer, text, game) {
  // Countdown
  if (raceCountdown > 0 && game.state === 'playing') {
    const sec = Math.ceil(raceCountdown / 60);
    if (sec > 0) {
      renderer.setGlow('#ff8800', 0.8);
      text.drawText(String(sec), W / 2, H / 2 - 30, 64, '#ff8800', 'center');
      renderer.setGlow(null);
    }
    return;
  }

  // Track name
  text.drawText(track.name, 8, 6, 10, '#ff8800', 'left');

  // Mini standings (top-right)
  if (cars.length > 0) {
    const sorted = [...cars].sort((a, b) => {
      const pa = a.lap * 100 + getTrackProgress(a.x, a.y) * 100;
      const pb = b.lap * 100 + getTrackProgress(b.x, b.y) * 100;
      return pb - pa;
    });
    const posLabels = ['1st', '2nd', '3rd', '4th'];
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const name = c.isPlayer ? 'YOU' : CAR_NAMES[c.idx];
      text.drawText(posLabels[i] + ' ' + name, W - 90, 6 + i * 14, 10, c.color, 'left');
    }
  }

  // Points display (bottom)
  for (let i = 0; i < numPlayers; i++) {
    const name = i === 0 ? 'YOU' : CAR_NAMES[i];
    text.drawText(name + ':' + playerPoints[i], 8 + i * 70, H - 16, 10, CAR_COLORS[i], 'left');
  }

  // Race over banner
  if (raceOver) {
    renderer.fillRect(0, H / 2 - 30, W, 60, '#000000aa');
    const winner = cars.find(c => c.finishOrder === 0);
    if (winner) {
      const name = winner.isPlayer ? 'YOU' : CAR_NAMES[winner.idx];
      renderer.setGlow('#ff8800', 0.7);
      text.drawText(name + (winner.isPlayer ? ' WIN!' : ' WINS!'), W / 2, H / 2 - 14, 24, '#ff8800', 'center');
      renderer.setGlow(null);
    }
  }

  // Minimap (top-right corner)
  const mmX = W - 80, mmY = 30;
  const mmScale = 0.1;
  renderer.fillRect(mmX - 35, mmY - 25, 70, 60, '#00000099');

  // Mini track (draw each waypoint segment scaled/offset)
  const mmOffX = mmX - 300 * mmScale;
  const mmOffY = mmY - 250 * mmScale;
  for (const seg of buildTrackStrip(track.waypoints, 10)) {
    renderer.fillPoly(seg.map(pt => ({
      x: mmOffX + pt.x * mmScale,
      y: mmOffY + pt.y * mmScale
    })), '#ffffff44');
  }

  // Mini cars
  for (const car of cars) {
    renderer.fillCircle(mmOffX + car.x * mmScale, mmOffY + car.y * mmScale, 1.5, car.color);
  }
}

// ── Export ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    playerPoints = [0, 0, 0, 0];
    currentTrack = 0;
    cameraX = TRACKS[0].startX - W / 2;
    cameraY = TRACKS[0].startY - H / 2;
    cars = [];
    items = [];
    projectiles = [];
    particles = [];
    frameCounter = 0;
    itemPulseFrame = 0;
    game.showOverlay('MICRO MACHINES', 'Arrows to drive, SPACE for items\nRace tiny cars on household surfaces!\n\nPress ENTER to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    update(game);
  };

  game.onDraw = (renderer, text) => {
    draw(renderer, text, game);
  };

  game.start();
  return game;
}
