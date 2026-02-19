// mech-assault/game.js — Mech Assault ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const scoreEl = document.getElementById('score');
const armorEl = document.getElementById('armor');
const heatEl = document.getElementById('heat');
const timerEl = document.getElementById('timer');

// --- CONSTANTS ---
const TILE = 25;
const COLS = W / TILE; // 24
const ROWS = H / TILE; // 20
const MATCH_TIME = 180; // 3 minutes
const RESPAWN_TIME = 5;
const SHUTDOWN_TIME = 3;
const MECH_RADIUS = 10;
const MELEE_RANGE = 30;
const MELEE_DMG = 25;
const MELEE_HEAT = 5;
const MAX_HEAT = 100;
const HEAT_DISSIPATION = 8; // per second
const MECH_SPEED = 80; // pixels/sec
const FOREST_SLOW = 0.5;

// Weapon definitions
const WEAPONS = {
  MG:       { name: 'MG',       damage: 5,  heat: 3,  cooldown: 0.12, speed: 500, range: 250, spread: 0.12, color: '#ff0',  projSize: 2, homing: false },
  Laser:    { name: 'Laser',    damage: 15, heat: 12, cooldown: 0.5,  speed: 900, range: 350, spread: 0.02, color: '#0ff',  projSize: 2, homing: false, isBeam: true },
  Missiles: { name: 'Missiles', damage: 20, heat: 25, cooldown: 1.2,  speed: 200, range: 400, spread: 0.3,  color: '#f80',  projSize: 4, homing: true },
  PPC:      { name: 'PPC',      damage: 40, heat: 35, cooldown: 2.0,  speed: 600, range: 300, spread: 0.03, color: '#a0f',  projSize: 5, homing: false, isBeam: true }
};

const LOADOUTS = [
  ['MG', 'Missiles'],
  ['Laser', 'MG'],
  ['PPC', 'MG'],
  ['Missiles', 'Laser'],
  ['PPC', 'Missiles']
];

// Game state
let map = [];
let mechs = [];
let projectiles = [];
let particles = [];
let beams = [];
let timeLeft = MATCH_TIME;
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let rightMouseDown = false;
let camX = 0, camY = 0;
let score = 0;

const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;

// --- MAP GENERATION ---
function generateMap() {
  map = [];
  for (let r = 0; r < ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        map[r][c] = { type: 1, hp: 999 };
        continue;
      }
      map[r][c] = { type: 0, hp: 0 };
    }
  }
  // Building clusters
  for (let i = 0; i < 8; i++) {
    let bx = 2 + Math.floor(Math.random() * (COLS - 6));
    let by = 2 + Math.floor(Math.random() * (ROWS - 6));
    let bw = 1 + Math.floor(Math.random() * 3);
    let bh = 1 + Math.floor(Math.random() * 3);
    for (let r = by; r < by + bh && r < ROWS - 1; r++) {
      for (let c = bx; c < bx + bw && c < COLS - 1; c++) {
        map[r][c] = { type: 1, hp: 50 + Math.random() * 50 };
      }
    }
  }
  // Forest patches
  for (let i = 0; i < 6; i++) {
    let fx = 2 + Math.floor(Math.random() * (COLS - 5));
    let fy = 2 + Math.floor(Math.random() * (ROWS - 5));
    let fw = 2 + Math.floor(Math.random() * 3);
    let fh = 2 + Math.floor(Math.random() * 3);
    for (let r = fy; r < fy + fh && r < ROWS - 1; r++) {
      for (let c = fx; c < fx + fw && c < COLS - 1; c++) {
        if (map[r][c].type === 0) {
          map[r][c] = { type: 2, hp: 0 };
        }
      }
    }
  }
}

function tileAt(wx, wy) {
  let c = Math.floor(wx / TILE);
  let r = Math.floor(wy / TILE);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return { type: 1, hp: 999 };
  return map[r][c];
}

function isSolid(wx, wy) {
  return tileAt(wx, wy).type === 1;
}

function isForest(wx, wy) {
  return tileAt(wx, wy).type === 2;
}

// --- MECH ---
function createMech(id, isPlayer, color) {
  let loadout = isPlayer ? LOADOUTS[0] : LOADOUTS[Math.floor(Math.random() * LOADOUTS.length)];
  let m = {
    id, isPlayer,
    x: 0, y: 0,
    vx: 0, vy: 0,
    angle: 0,
    turretAngle: 0,
    armor: 100, maxArmor: 100,
    heat: 0,
    shutdown: false, shutdownTimer: 0,
    dead: false, respawnTimer: 0,
    weapons: [loadout[0], loadout[1]],
    activeWeapon: 0,
    cooldowns: [0, 0],
    kills: 0, deaths: 0,
    color,
    meleeCD: 0,
    ai: isPlayer ? null : {
      targetId: -1,
      moveAngle: Math.random() * Math.PI * 2,
      moveTimer: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      aggressiveness: 0.3 + Math.random() * 0.5,
      preferredRange: 120 + Math.random() * 100,
      seekCoverTimer: 0,
      state: 'roam'
    }
  };
  spawnMech(m);
  return m;
}

function spawnMech(m) {
  for (let attempts = 0; attempts < 100; attempts++) {
    let x = (2 + Math.random() * (COLS - 4)) * TILE;
    let y = (2 + Math.random() * (ROWS - 4)) * TILE;
    if (!isSolid(x, y) && !isSolid(x - MECH_RADIUS, y) && !isSolid(x + MECH_RADIUS, y) &&
        !isSolid(x, y - MECH_RADIUS) && !isSolid(x, y + MECH_RADIUS)) {
      let tooClose = false;
      for (let other of mechs) {
        if (other.id !== m.id && !other.dead) {
          let dx = other.x - x, dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < 60) { tooClose = true; break; }
        }
      }
      if (!tooClose) {
        m.x = x; m.y = y;
        m.armor = m.maxArmor;
        m.heat = 0;
        m.shutdown = false; m.shutdownTimer = 0;
        m.dead = false; m.respawnTimer = 0;
        m.cooldowns = [0, 0];
        return;
      }
    }
  }
  m.x = W / 2; m.y = H / 2;
}

// --- PROJECTILES ---
function fireWeapon(mech, weaponIdx) {
  let wName = mech.weapons[weaponIdx];
  let w = WEAPONS[wName];
  if (mech.cooldowns[weaponIdx] > 0) return;
  if (mech.heat + w.heat > MAX_HEAT * 1.2) return;
  if (mech.shutdown || mech.dead) return;

  mech.cooldowns[weaponIdx] = w.cooldown;
  mech.heat += w.heat;

  let angle = mech.turretAngle + (Math.random() - 0.5) * w.spread;

  if (w.isBeam) {
    let bx = mech.x, by = mech.y;
    let dx = Math.cos(angle), dy = Math.sin(angle);
    let hitX = bx + dx * w.range, hitY = by + dy * w.range;
    let hitMech = null;
    for (let s = 10; s < w.range; s += 3) {
      let px = bx + dx * s, py = by + dy * s;
      if (isSolid(px, py)) {
        hitX = px; hitY = py;
        let c = Math.floor(px / TILE), r = Math.floor(py / TILE);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && map[r][c].type === 1 && map[r][c].hp < 500) {
          map[r][c].hp -= w.damage;
          if (map[r][c].hp <= 0) {
            map[r][c] = { type: 3, hp: 0 };
            spawnDebris(c * TILE + TILE / 2, r * TILE + TILE / 2);
          }
        }
        break;
      }
      for (let other of mechs) {
        if (other.id === mech.id || other.dead) continue;
        let mdx = other.x - px, mdy = other.y - py;
        if (mdx * mdx + mdy * mdy < MECH_RADIUS * MECH_RADIUS) {
          hitX = px; hitY = py;
          hitMech = other;
          break;
        }
      }
      if (hitMech) break;
    }
    if (hitMech) damageMech(hitMech, w.damage, mech);
    beams.push({ x1: bx, y1: by, x2: hitX, y2: hitY, color: w.color, life: 0.15, maxLife: 0.15 });
  } else {
    let count = wName === 'Missiles' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      let a = angle + (count > 1 ? (i - 1) * 0.15 : 0);
      projectiles.push({
        x: mech.x + Math.cos(a) * 14,
        y: mech.y + Math.sin(a) * 14,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        damage: w.damage,
        ownerId: mech.id,
        color: w.color,
        size: w.projSize,
        life: w.range / w.speed,
        homing: w.homing,
        targetId: w.homing ? findNearestEnemy(mech) : -1,
        trail: []
      });
    }
  }
  // Muzzle flash
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: mech.x + Math.cos(angle) * 14,
      y: mech.y + Math.sin(angle) * 14,
      vx: Math.cos(angle) * (50 + Math.random() * 80),
      vy: Math.sin(angle) * (50 + Math.random() * 80),
      life: 0.15, maxLife: 0.15,
      color: w.color, size: 3
    });
  }
}

function findNearestEnemy(mech) {
  let best = -1, bestDist = Infinity;
  for (let other of mechs) {
    if (other.id === mech.id || other.dead) continue;
    let dx = other.x - mech.x, dy = other.y - mech.y;
    let d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = other.id; }
  }
  return best;
}

function damageMech(target, dmg, attacker) {
  if (target.dead) return;
  target.armor -= dmg;
  for (let i = 0; i < 4; i++) {
    let a = Math.random() * Math.PI * 2;
    particles.push({
      x: target.x, y: target.y,
      vx: Math.cos(a) * (40 + Math.random() * 60),
      vy: Math.sin(a) * (40 + Math.random() * 60),
      life: 0.3, maxLife: 0.3,
      color: '#ff4', size: 2
    });
  }
  if (target.armor <= 0) killMech(target, attacker);
}

function killMech(target, killer) {
  target.dead = true;
  target.respawnTimer = RESPAWN_TIME;
  target.deaths++;
  if (killer && killer.id !== target.id) killer.kills++;
  spawnExplosion(target.x, target.y, 30);
}

function spawnExplosion(x, y, count) {
  const colors = ['#f80', '#ff0', '#f00', '#fa0', '#fff'];
  for (let i = 0; i < count; i++) {
    let a = Math.random() * Math.PI * 2;
    let spd = 30 + Math.random() * 120;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0.3 + Math.random() * 0.6, maxLife: 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4
    });
  }
}

function spawnDebris(x, y) {
  for (let i = 0; i < 12; i++) {
    let a = Math.random() * Math.PI * 2;
    let spd = 20 + Math.random() * 80;
    particles.push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 0.4 + Math.random() * 0.5, maxLife: 0.5,
      color: '#888', size: 2 + Math.random() * 3
    });
  }
}

// --- AI ---
function updateAI(mech, dt) {
  if (mech.dead || mech.shutdown) return;
  let ai = mech.ai;

  let target = null;
  let targetDist = Infinity;
  for (let other of mechs) {
    if (other.id === mech.id || other.dead) continue;
    let dx = other.x - mech.x, dy = other.y - mech.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < targetDist) { targetDist = d; target = other; ai.targetId = other.id; }
  }

  if (!target) ai.state = 'roam';

  let heatRatio = mech.heat / MAX_HEAT;
  if (heatRatio > 0.8) {
    ai.state = 'retreat';
  } else if (target && targetDist < 300) {
    ai.state = 'engage';
  } else {
    ai.state = 'roam';
  }

  ai.moveTimer -= dt;
  if (ai.moveTimer <= 0) {
    ai.moveTimer = 0.5 + Math.random() * 1.0;
    ai.strafeDir = Math.random() < 0.5 ? 1 : -1;
    if (ai.state === 'roam') ai.moveAngle = Math.random() * Math.PI * 2;
  }

  let moveX = 0, moveY = 0;
  if (ai.state === 'engage' && target) {
    let dx = target.x - mech.x, dy = target.y - mech.y;
    let toTarget = Math.atan2(dy, dx);
    if (targetDist > ai.preferredRange + 30) {
      moveX = Math.cos(toTarget); moveY = Math.sin(toTarget);
    } else if (targetDist < ai.preferredRange - 30) {
      moveX = -Math.cos(toTarget); moveY = -Math.sin(toTarget);
    }
    let strafeAngle = toTarget + Math.PI / 2 * ai.strafeDir;
    moveX += Math.cos(strafeAngle) * 0.6;
    moveY += Math.sin(strafeAngle) * 0.6;
  } else if (ai.state === 'retreat') {
    if (target) {
      let dx = target.x - mech.x, dy = target.y - mech.y;
      let away = Math.atan2(-dy, -dx);
      moveX = Math.cos(away); moveY = Math.sin(away);
    } else {
      moveX = Math.cos(ai.moveAngle); moveY = Math.sin(ai.moveAngle);
    }
  } else {
    moveX = Math.cos(ai.moveAngle); moveY = Math.sin(ai.moveAngle);
  }

  let ml = Math.sqrt(moveX * moveX + moveY * moveY);
  if (ml > 0) { moveX /= ml; moveY /= ml; }

  let speed = MECH_SPEED;
  if (isForest(mech.x, mech.y)) speed *= FOREST_SLOW;

  let nx = mech.x + moveX * speed * dt;
  let ny = mech.y + moveY * speed * dt;

  if (!isSolid(nx, mech.y) && !isSolid(nx - MECH_RADIUS, mech.y) && !isSolid(nx + MECH_RADIUS, mech.y)) {
    mech.x = nx;
  } else {
    ai.moveAngle = Math.random() * Math.PI * 2;
  }
  if (!isSolid(mech.x, ny) && !isSolid(mech.x, ny - MECH_RADIUS) && !isSolid(mech.x, ny + MECH_RADIUS)) {
    mech.y = ny;
  } else {
    ai.moveAngle = Math.random() * Math.PI * 2;
  }

  if (target) {
    let dx = target.x - mech.x, dy = target.y - mech.y;
    let desired = Math.atan2(dy, dx);
    let diff = desired - mech.turretAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    mech.turretAngle += diff * Math.min(1, 5 * dt);
  }

  if (ml > 0.1) {
    let desired = Math.atan2(moveY, moveX);
    let diff = desired - mech.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    mech.angle += diff * Math.min(1, 4 * dt);
  }

  if (target) {
    let w0 = WEAPONS[mech.weapons[0]];
    let w1 = WEAPONS[mech.weapons[1]];
    let bestIdx = 0;
    if (heatRatio > 0.6) {
      bestIdx = w0.heat < w1.heat ? 0 : 1;
    } else if (targetDist < 100) {
      bestIdx = (w0.name === 'MG') ? 0 : (w1.name === 'MG') ? 1 : 0;
    } else if (targetDist > 200) {
      bestIdx = (w0.range > w1.range) ? 0 : 1;
    }
    mech.activeWeapon = bestIdx;

    let aimDiff = Math.abs(Math.atan2(target.y - mech.y, target.x - mech.x) - mech.turretAngle);
    while (aimDiff > Math.PI) aimDiff = Math.PI * 2 - aimDiff;
    if (aimDiff < 0.25 && targetDist < WEAPONS[mech.weapons[bestIdx]].range) {
      let wep = WEAPONS[mech.weapons[bestIdx]];
      if (mech.heat + wep.heat < MAX_HEAT * 0.9 || heatRatio < 0.5) {
        fireWeapon(mech, bestIdx);
      }
    }

    let otherIdx = 1 - bestIdx;
    let otherWep = WEAPONS[mech.weapons[otherIdx]];
    if (aimDiff < 0.3 && targetDist < otherWep.range && Math.random() < 0.3 * dt * 10 &&
        mech.heat + otherWep.heat < MAX_HEAT * 0.85) {
      fireWeapon(mech, otherIdx);
    }

    if (targetDist < MELEE_RANGE && mech.meleeCD <= 0) {
      mech.meleeCD = 0.8;
      damageMech(target, MELEE_DMG, mech);
      mech.heat += MELEE_HEAT;
      spawnExplosion(target.x, target.y, 6);
    }
  }
}

// --- PLAYER INPUT ---
function handlePlayerInput(mech, dt, game) {
  if (mech.dead || mech.shutdown) return;

  let moveX = 0, moveY = 0;
  if (game.input.isDown('w') || game.input.isDown('ArrowUp')) moveY = -1;
  if (game.input.isDown('s') || game.input.isDown('ArrowDown')) moveY = 1;
  if (game.input.isDown('a') || game.input.isDown('ArrowLeft')) moveX = -1;
  if (game.input.isDown('d') || game.input.isDown('ArrowRight')) moveX = 1;

  let ml = Math.sqrt(moveX * moveX + moveY * moveY);
  if (ml > 0) { moveX /= ml; moveY /= ml; }

  let speed = MECH_SPEED;
  if (isForest(mech.x, mech.y)) speed *= FOREST_SLOW;

  let nx = mech.x + moveX * speed * dt;
  let ny = mech.y + moveY * speed * dt;
  let r = MECH_RADIUS;

  if (!isSolid(nx - r, mech.y - r) && !isSolid(nx + r, mech.y - r) &&
      !isSolid(nx - r, mech.y + r) && !isSolid(nx + r, mech.y + r)) {
    mech.x = nx;
  }
  if (!isSolid(mech.x - r, ny - r) && !isSolid(mech.x + r, ny - r) &&
      !isSolid(mech.x - r, ny + r) && !isSolid(mech.x + r, ny + r)) {
    mech.y = ny;
  }

  mech.x = Math.max(TILE + r, Math.min(WORLD_W - TILE - r, mech.x));
  mech.y = Math.max(TILE + r, Math.min(WORLD_H - TILE - r, mech.y));

  if (ml > 0.1) {
    let desired = Math.atan2(moveY, moveX);
    let diff = desired - mech.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    mech.angle += diff * Math.min(1, 6 * dt);
  }

  // Turret aims at mouse in world coords
  let wmx = mouseX + camX;
  let wmy = mouseY + camY;
  mech.turretAngle = Math.atan2(wmy - mech.y, wmx - mech.x);

  if (mouseDown) fireWeapon(mech, mech.activeWeapon);
  if (rightMouseDown) fireWeapon(mech, 1 - mech.activeWeapon);
}

// --- GAME FLOW ---
function startGame(game) {
  score = 0;
  timeLeft = MATCH_TIME;
  projectiles = [];
  particles = [];
  beams = [];
  mechs = [];
  generateMap();

  const colors = ['#4488ff', '#ff4444', '#44cc44', '#ffaa00'];
  mechs.push(createMech(0, true, colors[0]));
  mechs.push(createMech(1, false, colors[1]));
  mechs.push(createMech(2, false, colors[2]));
  mechs.push(createMech(3, false, colors[3]));

  game.setState('playing');
}

function endGame(game) {
  let player = mechs[0];
  score = player.kills - player.deaths;

  let sorted = [...mechs].sort((a, b) => (b.kills - b.deaths) - (a.kills - a.deaths));
  let rank = sorted.findIndex(m => m.isPlayer) + 1;

  let title = rank === 1 ? 'VICTORY!' : 'MATCH OVER';
  let lines = 'Rank #' + rank + ' | Score: ' + score + '\n';
  lines += 'Kills: ' + player.kills + ' Deaths: ' + player.deaths + '\n\n';
  lines += 'Final Standings:\n';
  for (let i = 0; i < sorted.length; i++) {
    let m = sorted[i];
    let name = m.isPlayer ? 'YOU' : 'AI-' + m.id;
    lines += (i + 1) + '. ' + name + ' - K:' + m.kills + ' D:' + m.deaths + ' S:' + (m.kills - m.deaths) + '\n';
  }

  if (scoreEl) scoreEl.textContent = score;
  game.showOverlay(title, lines);
  game.setState('over');
}

// --- HELPERS ---
function shadeColor(hex, amount) {
  let rv = parseInt(hex.slice(1, 3), 16) + amount;
  let gv = parseInt(hex.slice(3, 5), 16) + amount;
  let bv = parseInt(hex.slice(5, 7), 16) + amount;
  rv = Math.max(0, Math.min(255, rv));
  gv = Math.max(0, Math.min(255, gv));
  bv = Math.max(0, Math.min(255, bv));
  return '#' + rv.toString(16).padStart(2, '0') + gv.toString(16).padStart(2, '0') + bv.toString(16).padStart(2, '0');
}

// Rotate a local offset by angle and return world position
function rotPt(cx, cy, lx, ly, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

// Build a rotated rect as 4 points (for fillPoly)
function rotRect(cx, cy, angle, rx, ry, rw, rh) {
  // rx,ry,rw,rh in local space
  const pts = [
    { x: rx,      y: ry },
    { x: rx + rw, y: ry },
    { x: rx + rw, y: ry + rh },
    { x: rx,      y: ry + rh },
  ];
  return pts.map(p => rotPt(cx, cy, p.x, p.y, angle));
}

// Alpha hex suffix for a 0-1 value
function alphaHex(a) {
  return Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

// --- DRAW HELPERS ---
function drawMech(renderer, text, mech) {
  const mx = mech.x - camX;
  const my = mech.y - camY;
  const bodyAngle = mech.angle;
  const turretAngle = mech.turretAngle;
  const mr = MECH_RADIUS;

  // Shadow (approximate ellipse as circle, offset)
  renderer.fillCircle(mx + 2, my + 2, mr + 1, 'rgba(0,0,0,0.3)');

  // Shutdown glow effect — encode by drawing red bg circle
  if (mech.shutdown) {
    const flash = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
    const flashAlpha = alphaHex(flash * 0.7);
    renderer.setGlow('#f00', flash * 0.8);
  }

  // --- Body (rotates with mech.angle) ---
  // Treads (top and bottom bars)
  const treadColor = '#444';
  // Top tread: local (-mr-2, -mr+1) to (mr*2+4 wide, 4 tall)
  renderer.fillPoly(rotRect(mx, my, bodyAngle, -mr - 2, -mr + 1, mr * 2 + 4, 4), treadColor);
  // Bottom tread
  renderer.fillPoly(rotRect(mx, my, bodyAngle, -mr - 2, mr - 5, mr * 2 + 4, 4), treadColor);

  // Main body: local (-mr+1, -mr+3) size (mr*2-2, mr*2-6)
  const bodyColor = mech.shutdown ? '#633' : mech.color;
  renderer.fillPoly(rotRect(mx, my, bodyAngle, -mr + 1, -mr + 3, mr * 2 - 2, mr * 2 - 6), bodyColor);

  // Body detail (darker center)
  const detailColor = shadeColor(mech.shutdown ? '#633' : mech.color, -30);
  renderer.fillPoly(rotRect(mx, my, bodyAngle, -mr + 3, -mr + 5, mr * 2 - 6, mr * 2 - 10), detailColor);

  if (mech.shutdown) renderer.setGlow(null);

  // --- Turret (rotates with mech.turretAngle) ---
  // Gun barrel: local (4, -2) size (mr+6 wide, 4 tall)
  renderer.fillPoly(rotRect(mx, my, turretAngle, 4, -2, mr + 6, 4), '#777');
  // Barrel tip: local (mr+6, -3) size (4, 6)
  renderer.fillPoly(rotRect(mx, my, turretAngle, mr + 6, -3, 4, 6), '#999');
  // Turret base circle
  const turretColor = shadeColor(mech.color, 20);
  renderer.fillCircle(mx, my, 6, turretColor);
  // Turret ring
  renderer.strokePoly(
    Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return { x: mx + Math.cos(a) * 6, y: my + Math.sin(a) * 6 };
    }),
    '#ffffff88', 0.5, true
  );

  // --- Health bar ---
  const hpRatio = mech.armor / mech.maxArmor;
  renderer.fillRect(mx - mr, my - mr - 8, mr * 2, 3, '#300');
  const hpColor = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
  renderer.fillRect(mx - mr, my - mr - 8, mr * 2 * hpRatio, 3, hpColor);

  // --- Heat bar ---
  const heatRatio = Math.min(1, mech.heat / MAX_HEAT);
  renderer.fillRect(mx - mr, my - mr - 4, mr * 2, 2, '#220');
  const heatColor = heatRatio > 0.8 ? '#f00' : heatRatio > 0.5 ? '#fa0' : '#0af';
  renderer.fillRect(mx - mr, my - mr - 4, mr * 2 * heatRatio, 2, heatColor);

  // --- Name label for AI ---
  if (!mech.isPlayer) {
    text.drawText('AI-' + mech.id, mx, my + mr + 4, 8, '#aaa', 'center');
  }
}

function drawHUD(renderer, text, mechs, player) {
  if (!player) return;

  // --- Weapon panel (bottom-left) ---
  renderer.fillRect(5, H - 70, 160, 65, 'rgba(10,10,30,0.8)');
  renderer.strokePoly([
    { x: 5, y: H - 70 }, { x: 165, y: H - 70 },
    { x: 165, y: H - 5 }, { x: 5, y: H - 5 }
  ], '#88aaff44', 1, true);

  for (let i = 0; i < 2; i++) {
    let wName = player.weapons[i];
    let w = WEAPONS[wName];
    let panelY = H - 58 + i * 28;
    let isActive = (i === player.activeWeapon);

    if (isActive) {
      renderer.fillRect(10, panelY - 8, 148, 22, '#88aaff22');
      text.drawText('>', 12, panelY - 4, 10, '#88aaff', 'left');
    }

    let labelColor = isActive ? '#fff' : '#888';
    let prefix = (i === 0 ? 'L' : 'R') + ': ' + wName;
    text.drawText(prefix, 22, panelY - 4, 10, labelColor, 'left');

    // Cooldown bar
    let cdRatio = player.cooldowns[i] / w.cooldown;
    renderer.fillRect(100, panelY - 2, 50, 6, '#333');
    renderer.fillRect(100, panelY - 2, 50 * (1 - cdRatio), 6, cdRatio > 0 ? '#f80' : '#0f0');
  }

  // --- Heat gauge (bottom-right) ---
  renderer.fillRect(W - 85, H - 70, 80, 65, 'rgba(10,10,30,0.8)');
  renderer.strokePoly([
    { x: W - 85, y: H - 70 }, { x: W - 5, y: H - 70 },
    { x: W - 5, y: H - 5 }, { x: W - 85, y: H - 5 }
  ], '#88aaff44', 1, true);

  text.drawText('HEAT', W - 45, H - 64, 10, '#aaa', 'center');

  let heatRatio = player.heat / MAX_HEAT;
  renderer.fillRect(W - 75, H - 50, 60, 14, '#222');
  let heatBarColor = heatRatio > 0.8 ? '#f00' : heatRatio > 0.5 ? '#fa0' : '#0af';
  renderer.fillRect(W - 75, H - 50, 60 * Math.min(1, heatRatio), 14, heatBarColor);
  text.drawText(Math.ceil(player.heat) + '%', W - 45, H - 47, 10, '#fff', 'center');

  if (player.shutdown) {
    text.drawText('SHUTDOWN', W - 45, H - 26, 12, '#f00', 'center');
    text.drawText(player.shutdownTimer.toFixed(1) + 's', W - 45, H - 14, 12, '#f00', 'center');
  }

  if (player.dead) {
    text.drawText('DESTROYED - Respawning ' + player.respawnTimer.toFixed(1) + 's', W / 2, H / 2 - 7, 14, '#f00', 'center');
  }

  // --- Scoreboard (top-right) ---
  let sbH = 15 + mechs.length * 14;
  renderer.fillRect(W - 145, 5, 140, sbH, 'rgba(10,10,30,0.7)');
  renderer.strokePoly([
    { x: W - 145, y: 5 }, { x: W - 5, y: 5 },
    { x: W - 5, y: 5 + sbH }, { x: W - 145, y: 5 + sbH }
  ], '#88aaff44', 1, true);

  text.drawText('PILOT        K  D  SCR', W - 140, 6, 9, '#88aaff', 'left');

  let sorted = [...mechs].sort((a, b) => (b.kills - b.deaths) - (a.kills - a.deaths));
  for (let i = 0; i < sorted.length; i++) {
    let m = sorted[i];
    let name = m.isPlayer ? 'YOU' : 'AI-' + m.id;
    let s = m.kills - m.deaths;
    let line = name.padEnd(13) + String(m.kills).padStart(2) + ' ' + String(m.deaths).padStart(2) + ' ' + String(s).padStart(3);
    text.drawText(line, W - 140, 20 + i * 14, 9, m.isPlayer ? '#88aaff' : '#888', 'left');
  }

  // --- Minimap (top-left) ---
  const mmW = 96, mmH = 80;
  const mmX = 5, mmY = 5;
  renderer.fillRect(mmX, mmY, mmW, mmH, 'rgba(10,10,30,0.8)');
  renderer.strokePoly([
    { x: mmX, y: mmY }, { x: mmX + mmW, y: mmY },
    { x: mmX + mmW, y: mmY + mmH }, { x: mmX, y: mmY + mmH }
  ], '#88aaff44', 1, true);

  let scX = mmW / WORLD_W;
  let scY = mmH / WORLD_H;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let t = map[r][c];
      if (t.type === 1) {
        renderer.fillRect(mmX + c * TILE * scX, mmY + r * TILE * scY, TILE * scX + 0.5, TILE * scY + 0.5, '#556');
      } else if (t.type === 2) {
        renderer.fillRect(mmX + c * TILE * scX, mmY + r * TILE * scY, TILE * scX + 0.5, TILE * scY + 0.5, '#243');
      }
    }
  }

  for (let m of mechs) {
    if (m.dead) continue;
    renderer.fillCircle(mmX + m.x * scX, mmY + m.y * scY, 2, m.isPlayer ? '#88aaff' : '#f44');
  }

  // Camera viewport rect on minimap
  renderer.strokePoly([
    { x: mmX + camX * scX,       y: mmY + camY * scY },
    { x: mmX + (camX + W) * scX, y: mmY + camY * scY },
    { x: mmX + (camX + W) * scX, y: mmY + (camY + H) * scY },
    { x: mmX + camX * scX,       y: mmY + (camY + H) * scY }
  ], '#88aaff55', 0.5, true);
}

// --- EXPORT ---
export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // Mouse input
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    if (game.state === 'waiting' || game.state === 'over') {
      startGame(game);
      return;
    }
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) rightMouseDown = true;
  });

  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) rightMouseDown = false;
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  game.onInit = () => {
    map = []; mechs = []; projectiles = []; particles = []; beams = [];
    score = 0; timeLeft = MATCH_TIME;
    camX = 0; camY = 0;
    mouseDown = false; rightMouseDown = false;
    game.showOverlay('MECH ASSAULT', 'Click to Deploy');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dtMs) => {
    if (game.state !== 'playing') {
      // Key to start from waiting state
      if (game.state === 'waiting' && game.input.wasPressed(' ')) {
        startGame(game);
      }
      return;
    }

    const dt = dtMs / 1000; // convert ms to seconds

    // Weapon cycle key
    if (game.input.wasPressed('r') || game.input.wasPressed('R')) {
      let player = mechs[0];
      if (player) player.activeWeapon = 1 - player.activeWeapon;
    }

    // Melee key
    if (game.input.wasPressed('e') || game.input.wasPressed('E')) {
      let player = mechs[0];
      if (player && !player.dead && !player.shutdown && player.meleeCD <= 0) {
        player.meleeCD = 0.8;
        player.heat += MELEE_HEAT;
        for (let other of mechs) {
          if (other.id === player.id || other.dead) continue;
          let dx = other.x - player.x, dy = other.y - player.y;
          if (Math.sqrt(dx * dx + dy * dy) < MELEE_RANGE) {
            damageMech(other, MELEE_DMG, player);
            spawnExplosion(other.x, other.y, 8);
            break;
          }
        }
        for (let i = 0; i < 5; i++) {
          let a = mechs[0].turretAngle + (Math.random() - 0.5) * 1.2;
          particles.push({
            x: player.x + Math.cos(a) * 16, y: player.y + Math.sin(a) * 16,
            vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
            life: 0.2, maxLife: 0.2,
            color: '#fff', size: 3
          });
        }
      }
    }

    // Timer
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame(game);
      return;
    }

    // Update mechs
    for (let mech of mechs) {
      if (mech.dead) {
        mech.respawnTimer -= dt;
        if (mech.respawnTimer <= 0) spawnMech(mech);
        continue;
      }

      mech.heat = Math.max(0, mech.heat - HEAT_DISSIPATION * dt);

      if (mech.shutdown) {
        mech.shutdownTimer -= dt;
        if (mech.shutdownTimer <= 0) {
          mech.shutdown = false;
          mech.heat = MAX_HEAT * 0.3;
        }
        continue;
      }

      if (mech.heat >= MAX_HEAT) {
        mech.shutdown = true;
        mech.shutdownTimer = SHUTDOWN_TIME;
        for (let i = 0; i < 8; i++) {
          let a = Math.random() * Math.PI * 2;
          particles.push({
            x: mech.x, y: mech.y,
            vx: Math.cos(a) * 30, vy: Math.sin(a) * 30,
            life: 0.5, maxLife: 0.5,
            color: '#f00', size: 2
          });
        }
        continue;
      }

      mech.cooldowns[0] = Math.max(0, mech.cooldowns[0] - dt);
      mech.cooldowns[1] = Math.max(0, mech.cooldowns[1] - dt);
      mech.meleeCD = Math.max(0, mech.meleeCD - dt);

      if (mech.isPlayer) {
        handlePlayerInput(mech, dt, game);
      } else {
        updateAI(mech, dt);
      }
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let p = projectiles[i];
      p.life -= dt;
      if (p.life <= 0) { projectiles.splice(i, 1); continue; }

      if (p.homing && p.targetId >= 0) {
        let target = mechs.find(m => m.id === p.targetId && !m.dead);
        if (target) {
          let dx = target.x - p.x, dy = target.y - p.y;
          let desired = Math.atan2(dy, dx);
          let current = Math.atan2(p.vy, p.vx);
          let diff = desired - current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          let turn = Math.min(Math.abs(diff), 3 * dt) * Math.sign(diff);
          let newAngle = current + turn;
          let spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          spd = Math.min(spd + 150 * dt, 350);
          p.vx = Math.cos(newAngle) * spd;
          p.vy = Math.sin(newAngle) * spd;
        }
      }

      p.trail.push({ x: p.x, y: p.y, life: 0.2 });
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (isSolid(p.x, p.y)) {
        let c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && map[r][c].type === 1 && map[r][c].hp < 500) {
          map[r][c].hp -= p.damage;
          if (map[r][c].hp <= 0) {
            map[r][c] = { type: 3, hp: 0 };
            spawnDebris(c * TILE + TILE / 2, r * TILE + TILE / 2);
          }
        }
        spawnExplosion(p.x, p.y, 4);
        projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let mech of mechs) {
        if (mech.id === p.ownerId || mech.dead) continue;
        let dx = mech.x - p.x, dy = mech.y - p.y;
        if (dx * dx + dy * dy < (MECH_RADIUS + p.size) * (MECH_RADIUS + p.size)) {
          damageMech(mech, p.damage, mechs.find(m => m.id === p.ownerId));
          projectiles.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      for (let j = p.trail.length - 1; j >= 0; j--) {
        p.trail[j].life -= dt;
        if (p.trail[j].life <= 0) p.trail.splice(j, 1);
      }
    }

    // Update beams
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }

    // Update camera
    let player = mechs[0];
    if (player) {
      camX = player.x - W / 2;
      camY = player.y - H / 2;
      camX = Math.max(0, Math.min(WORLD_W - W, camX));
      camY = Math.max(0, Math.min(WORLD_H - H, camY));
    }

    // Update HUD DOM elements
    if (player) {
      score = player.kills - player.deaths;
      if (scoreEl) scoreEl.textContent = score;
      if (armorEl) armorEl.textContent = player.dead ? 'DEAD' : Math.max(0, Math.ceil(player.armor));
      if (heatEl) heatEl.textContent = Math.ceil(player.heat);
    }
    let mins = Math.floor(timeLeft / 60);
    let secs = Math.floor(timeLeft % 60);
    if (timerEl) timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a1a');

    // Draw map tiles (only visible)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let tile = map[r][c];
        let wx = c * TILE, wy = r * TILE;
        // Visibility cull
        if (wx + TILE < camX || wx > camX + W || wy + TILE < camY || wy > camY + H) continue;
        let sx = wx - camX, sy = wy - camY;

        if (tile.type === 0) {
          // Open ground
          renderer.fillRect(sx, sy, TILE, TILE, '#12122a');
          renderer.strokePoly([
            { x: sx, y: sy }, { x: sx + TILE, y: sy },
            { x: sx + TILE, y: sy + TILE }, { x: sx, y: sy + TILE }
          ], '#1a1a35', 0.5, true);
        } else if (tile.type === 1) {
          // Building — color varies with damage
          let dmgRatio = tile.hp < 500 ? Math.max(0, tile.hp / 100) : 1;
          let rv = Math.floor(60 + 40 * dmgRatio);
          let gv = Math.floor(60 + 40 * dmgRatio);
          let bv = Math.floor(80 + 50 * dmgRatio);
          let bldColor = 'rgb(' + rv + ',' + gv + ',' + bv + ')';
          renderer.fillRect(sx, sy, TILE, TILE, bldColor);
          // Building detail inner rect
          renderer.strokePoly([
            { x: sx + 2, y: sy + 2 }, { x: sx + TILE - 2, y: sy + 2 },
            { x: sx + TILE - 2, y: sy + TILE - 2 }, { x: sx + 2, y: sy + TILE - 2 }
          ], '#555', 1, true);
          // Damage cracks
          if (tile.hp < 500) {
            let cracks = Math.floor((1 - dmgRatio) * 3);
            for (let ci = 0; ci < cracks; ci++) {
              renderer.drawLine(
                sx + TILE * 0.3 * (ci + 1), sy,
                sx + TILE * 0.5, sy + TILE * 0.5,
                '#333', 1
              );
              renderer.drawLine(
                sx + TILE * 0.5, sy + TILE * 0.5,
                sx + TILE * 0.7, sy + TILE,
                '#333', 1
              );
            }
          }
        } else if (tile.type === 2) {
          // Forest
          renderer.fillRect(sx, sy, TILE, TILE, '#1a2a1a');
          // Trees — two shades of circles
          renderer.fillCircle(sx + 8, sy + 8, 5, '#2a4a2a');
          renderer.fillCircle(sx + 17, sy + 12, 6, '#2a4a2a');
          renderer.fillCircle(sx + 10, sy + 18, 5, '#2a4a2a');
          renderer.fillCircle(sx + 8, sy + 8, 3, '#3a5a3a');
          renderer.fillCircle(sx + 17, sy + 12, 4, '#3a5a3a');
        } else if (tile.type === 3) {
          // Rubble
          renderer.fillRect(sx, sy, TILE, TILE, '#1a1820');
          renderer.fillRect(sx + 3, sy + 5, 6, 4, '#333');
          renderer.fillRect(sx + 14, sy + 10, 5, 5, '#333');
          renderer.fillRect(sx + 7, sy + 16, 8, 3, '#333');
        }
      }
    }

    // Draw beams
    for (let b of beams) {
      let alpha = b.life / b.maxLife;
      let alpStr = alphaHex(alpha);
      renderer.setGlow(b.color, alpha * 0.8);
      renderer.drawLine(b.x1 - camX, b.y1 - camY, b.x2 - camX, b.y2 - camY,
        b.color + alpStr, 3 * alpha);
      // Inner bright line
      renderer.drawLine(b.x1 - camX, b.y1 - camY, b.x2 - camX, b.y2 - camY,
        '#ffffff' + alpStr, alpha);
      renderer.setGlow(null);
    }

    // Draw projectiles + trails
    for (let p of projectiles) {
      // Trail
      for (let t of p.trail) {
        let alpha = t.life / 0.2;
        let alpStr = alphaHex(alpha * 0.5);
        renderer.fillCircle(t.x - camX, t.y - camY, p.size * 0.6, p.color + alpStr);
      }
      // Projectile
      renderer.setGlow(p.color, 0.7);
      renderer.fillCircle(p.x - camX, p.y - camY, p.size, p.color);
      renderer.fillCircle(p.x - camX, p.y - camY, p.size * 0.5, '#fff');
      renderer.setGlow(null);
    }

    // Draw mechs
    for (let mech of mechs) {
      if (mech.dead) continue;
      drawMech(renderer, text, mech);
    }

    // Draw particles
    for (let p of particles) {
      let alpha = p.life / p.maxLife;
      let alpStr = alphaHex(alpha);
      renderer.fillCircle(p.x - camX, p.y - camY, p.size * alpha, p.color + alpStr);
    }

    // HUD (in screen space — no camera offset)
    if (game.state === 'playing') {
      drawHUD(renderer, text, mechs, mechs[0]);
    }
  };

  game.start();
  return game;
}
