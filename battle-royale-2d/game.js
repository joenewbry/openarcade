// battle-royale-2d/game.js — WebGL 2 engine port

import { Game } from '../engine/core.js';

// ── Canvas / world dimensions ──
const CW = 600, CH = 600;
const MAP_W = 3000, MAP_H = 3000;
const TILE = 40;
const PLAYER_R = 10;

// ── Weapon definitions ──
const WEAPON_DEFS = {
  Pistol:  { damage: 15, fireRate: 400, range: 280, spread: 0.08, magSize: 12, reloadTime: 1200, speed: 14, color: '#aaa', auto: false },
  Shotgun: { damage: 8,  fireRate: 800, range: 180, spread: 0.25, magSize: 6,  reloadTime: 1800, speed: 10, pellets: 5, color: '#fa0', auto: false },
  Rifle:   { damage: 20, fireRate: 150, range: 400, spread: 0.05, magSize: 30, reloadTime: 2000, speed: 16, color: '#4af', auto: true },
  Sniper:  { damage: 70, fireRate: 1200, range: 700, spread: 0.01, magSize: 5, reloadTime: 2500, speed: 22, color: '#f4a', auto: false }
};
const WEAPON_TIERS = ['Pistol', 'Shotgun', 'Rifle', 'Sniper'];

const PLAYER_NAMES  = ['You', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Ghost'];
const PLAYER_COLORS = ['#f64', '#e44', '#4ae', '#4e4', '#ea4', '#e4e', '#4ee', '#aaa'];

// ── Module-scope state ──
let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'
let score = 0;

let zone, zoneTarget, zoneFrom;
let zoneShrinkStart, zoneShrinkDur, zonePhase;
let nextZoneTime, lastZoneTick;
const ZONE_INTERVAL = 30000;
const ZONE_DAMAGE   = 2;

let buildings, lootItems, trees, walls;
let players, bullets, killFeed;
let camera;
let mouse;          // { x, y, down, wasDown }
let showInventory;
let gameTime;

// frame-based timers (ms accumulated in onUpdate dt)
// For shoot/reload timers we still use performance.now() — it carries across fixed-step calls.

// ── Map generation ──
function generateMap() {
  buildings = []; lootItems = []; trees = []; walls = [];

  const BUILDING_CLUSTERS = 14;
  for (let c = 0; c < BUILDING_CLUSTERS; c++) {
    const cx = 300 + Math.random() * (MAP_W - 600);
    const cy = 300 + Math.random() * (MAP_H - 600);
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const bw = 80 + Math.random() * 80;
      const bh = 60 + Math.random() * 80;
      const bx = cx + (Math.random() - 0.5) * 250;
      const by = cy + (Math.random() - 0.5) * 250;
      buildings.push({ x: bx, y: by, w: bw, h: bh,
        color: `hsl(${20 + Math.random()*20}, ${15 + Math.random()*15}%, ${22 + Math.random()*10}%)` });
      walls.push({ x: bx,           y: by,           w: bw, h: 6   });
      walls.push({ x: bx,           y: by + bh - 6,  w: bw, h: 6   });
      walls.push({ x: bx,           y: by,           w: 6,  h: bh  });
      walls.push({ x: bx + bw - 6,  y: by,           w: 6,  h: bh  });

      const lootCount = 1 + Math.floor(Math.random() * 3);
      for (let l = 0; l < lootCount; l++) {
        spawnLoot(bx + 15 + Math.random() * (bw - 30), by + 15 + Math.random() * (bh - 30));
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    spawnLoot(200 + Math.random() * (MAP_W - 400), 200 + Math.random() * (MAP_H - 400));
  }
  for (let i = 0; i < 200; i++) {
    trees.push({
      x: 100 + Math.random() * (MAP_W - 200),
      y: 100 + Math.random() * (MAP_H - 200),
      r: 12 + Math.random() * 10,
      shade: `hsl(${120 + Math.random()*40}, ${40 + Math.random()*30}%, ${18 + Math.random()*12}%)`
    });
  }
}

function spawnLoot(x, y) {
  const r = Math.random();
  if (r < 0.30) {
    const wr = Math.random();
    let type;
    if      (wr < 0.35) type = 'Pistol';
    else if (wr < 0.60) type = 'Shotgun';
    else if (wr < 0.85) type = 'Rifle';
    else                type = 'Sniper';
    lootItems.push({ x, y, kind: 'weapon', weaponType: type, ammo: WEAPON_DEFS[type].magSize * 2 });
  } else if (r < 0.55) {
    lootItems.push({ x, y, kind: 'health', amount: 25 + Math.floor(Math.random() * 26) });
  } else if (r < 0.75) {
    lootItems.push({ x, y, kind: 'armor', amount: 25 + Math.floor(Math.random() * 26) });
  } else {
    const type = WEAPON_TIERS[Math.floor(Math.random() * WEAPON_TIERS.length)];
    lootItems.push({ x, y, kind: 'ammo', weaponType: type,
      amount: WEAPON_DEFS[type].magSize + Math.floor(Math.random() * WEAPON_DEFS[type].magSize) });
  }
}

// ── Player factory ──
function createPlayer(index, x, y) {
  return {
    id: index,
    name: PLAYER_NAMES[index],
    color: PLAYER_COLORS[index],
    x, y, vx: 0, vy: 0,
    speed: 2.5,
    hp: 100, maxHp: 100,
    armor: 0, maxArmor: 100,
    alive: true,
    angle: 0,
    weapons: [null, null],
    activeWeapon: 0,
    ammo: { Pistol: 0, Shotgun: 0, Rifle: 0, Sniper: 0 },
    lastFire: 0,
    reloading: false,
    reloadStart: 0,
    kills: 0,
    placement: 8,
    isAI: index !== 0,
    aiTarget: null,
    aiState: 'loot',
    aiStateTimer: 0,
    aiMoveTarget: null,
    aiLastShot: 0,
    aiScanTimer: 0,
    aiPickupCooldown: 0,
    aiStrafeDist: 0,
    aiStrafeDir: 1,
    flashTimer: 0
  };
}

function initGame() {
  players = []; bullets = []; killFeed = []; lootItems = [];
  showInventory = false;
  gameTime = 0;
  zonePhase = 0;
  zone       = { x: MAP_W / 2, y: MAP_H / 2, r: 1600 };
  zoneTarget = { x: MAP_W / 2, y: MAP_H / 2, r: 1600 };
  zoneFrom   = { ...zone };
  nextZoneTime  = ZONE_INTERVAL;
  lastZoneTick  = 0;
  zoneShrinkStart = 0;
  zoneShrinkDur   = 15000;
  score = 0;
  camera = { x: 0, y: 0 };

  generateMap();

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
    const dist  = 600 + Math.random() * 400;
    const px = MAP_W / 2 + Math.cos(angle) * dist;
    const py = MAP_H / 2 + Math.sin(angle) * dist;
    const p = createPlayer(i, px, py);
    p.weapons[0] = { type: 'Pistol', mag: WEAPON_DEFS.Pistol.magSize, ammo: WEAPON_DEFS.Pistol.magSize * 2 };
    players.push(p);
  }
}

// ── Distance helpers ──
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  return dist(cx, cy, nearX, nearY) < cr;
}

function resolveWallCollision(p) {
  for (const w of walls) {
    if (circleRectCollide(p.x, p.y, PLAYER_R, w.x, w.y, w.w, w.h)) {
      const nearX = Math.max(w.x, Math.min(p.x, w.x + w.w));
      const nearY = Math.max(w.y, Math.min(p.y, w.y + w.h));
      const dx = p.x - nearX;
      const dy = p.y - nearY;
      const d  = Math.hypot(dx, dy);
      if (d > 0) {
        const push = PLAYER_R - d + 1;
        p.x += (dx / d) * push;
        p.y += (dy / d) * push;
      }
    }
  }
  p.x = Math.max(PLAYER_R, Math.min(MAP_W - PLAYER_R, p.x));
  p.y = Math.max(PLAYER_R, Math.min(MAP_H - PLAYER_R, p.y));
}

// ── Pickup ──
function tryPickup() {
  const p = players[0];
  if (!p.alive) return;
  let bestDist = 40, bestIdx = -1;
  for (let i = 0; i < lootItems.length; i++) {
    const l = lootItems[i];
    const d = dist(p.x, p.y, l.x, l.y);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  if (bestIdx >= 0) doPickup(p, bestIdx);
}

function doPickup(p, idx) {
  const l = lootItems[idx];
  if (l.kind === 'weapon') {
    let slot = p.weapons[0] === null ? 0 : (p.weapons[1] === null ? 1 : p.activeWeapon);
    if (p.weapons[slot] !== null) {
      const old = p.weapons[slot];
      lootItems.push({ x: p.x + (Math.random()-0.5)*20, y: p.y + (Math.random()-0.5)*20,
        kind: 'weapon', weaponType: old.type, ammo: old.ammo });
    }
    p.weapons[slot] = { type: l.weaponType, mag: WEAPON_DEFS[l.weaponType].magSize, ammo: l.ammo };
    p.activeWeapon = slot;
    p.reloading = false;
  } else if (l.kind === 'health') {
    p.hp = Math.min(p.maxHp, p.hp + l.amount);
  } else if (l.kind === 'armor') {
    p.armor = Math.min(p.maxArmor, p.armor + l.amount);
  } else if (l.kind === 'ammo') {
    for (const w of p.weapons) {
      if (w && w.type === l.weaponType) w.ammo += l.amount;
    }
  }
  lootItems.splice(idx, 1);
}

// ── Shooting ──
function shoot(p) {
  const w = p.weapons[p.activeWeapon];
  if (!w) return;
  const def = WEAPON_DEFS[w.type];
  if (p.reloading) return;
  if (performance.now() - p.lastFire < def.fireRate) return;
  if (w.mag <= 0) { startReload(p); return; }
  w.mag--;
  p.lastFire = performance.now();
  const pellets = def.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const spread = (Math.random() - 0.5) * def.spread * 2;
    const angle  = p.angle + spread;
    bullets.push({
      x: p.x + Math.cos(p.angle) * 14,
      y: p.y + Math.sin(p.angle) * 14,
      vx: Math.cos(angle) * def.speed,
      vy: Math.sin(angle) * def.speed,
      owner: p.id, damage: def.damage,
      range: def.range, dist: 0,
      color: def.color
    });
  }
}

function startReload(p) {
  const w = p.weapons[p.activeWeapon];
  if (!w || p.reloading) return;
  const def = WEAPON_DEFS[w.type];
  if (w.mag >= def.magSize) return;
  if (w.ammo <= 0) return;
  p.reloading = true;
  p.reloadStart = performance.now();
}

function checkReload(p) {
  if (!p.reloading) return;
  const w = p.weapons[p.activeWeapon];
  if (!w) { p.reloading = false; return; }
  const def = WEAPON_DEFS[w.type];
  if (performance.now() - p.reloadStart >= def.reloadTime) {
    const need = def.magSize - w.mag;
    const take = Math.min(need, w.ammo);
    w.mag  += take;
    w.ammo -= take;
    p.reloading = false;
  }
}

// ── Damage / kill feed ──
function takeDamage(p, damage, attackerId) {
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, damage * 0.5);
    p.armor -= absorbed;
    damage  -= absorbed;
  }
  p.hp -= damage;
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    const alive = players.filter(pl => pl.alive).length;
    p.placement = alive + 1;
    for (const w of p.weapons) {
      if (w) lootItems.push({ x: p.x + (Math.random()-0.5)*30, y: p.y + (Math.random()-0.5)*30,
        kind: 'weapon', weaponType: w.type, ammo: w.ammo });
    }
    if (p.armor > 10) lootItems.push({ x: p.x, y: p.y, kind: 'armor', amount: Math.floor(p.armor) });
    if (attackerId >= 0) {
      const attacker = players[attackerId];
      attacker.kills++;
      if (attackerId === 0) score += 100;
      addKillFeed(attacker.name, p.name, attacker.color);
    } else {
      addKillFeed('Zone', p.name, '#f64');
    }
  }
}

function addKillFeed(killer, victim, color) {
  killFeed.unshift({ killer, victim, color, time: gameTime });
  if (killFeed.length > 6) killFeed.pop();
}

// ── AI helpers ──
function getBestWeaponTier(p) {
  let best = -1;
  for (const w of p.weapons) {
    if (w) best = Math.max(best, WEAPON_TIERS.indexOf(w.type));
  }
  return best;
}

function selectBestWeapon(p, targetDist) {
  let bestSlot = p.activeWeapon, bestScore = -1;
  for (let i = 0; i < 2; i++) {
    const w = p.weapons[i];
    if (!w) continue;
    const def = WEAPON_DEFS[w.type];
    let s = WEAPON_TIERS.indexOf(w.type);
    if (targetDist < def.range) s += 2;
    if (w.mag > 0) s += 1;
    if (s > bestScore) { bestScore = s; bestSlot = i; }
  }
  if (bestSlot !== p.activeWeapon) { p.activeWeapon = bestSlot; p.reloading = false; }
}

function aiDoPickup(p, idx) {
  const l = lootItems[idx];
  if (l.kind === 'weapon') {
    const lootTier = WEAPON_TIERS.indexOf(l.weaponType);
    let worstSlot = 0, worstTier = 99;
    for (let i = 0; i < 2; i++) {
      if (!p.weapons[i]) { worstSlot = i; worstTier = -1; break; }
      const t = WEAPON_TIERS.indexOf(p.weapons[i].type);
      if (t < worstTier) { worstTier = t; worstSlot = i; }
    }
    if (lootTier > worstTier || p.weapons[worstSlot] === null) {
      if (p.weapons[worstSlot]) {
        const old = p.weapons[worstSlot];
        lootItems.push({ x: p.x + (Math.random()-0.5)*20, y: p.y + (Math.random()-0.5)*20,
          kind: 'weapon', weaponType: old.type, ammo: old.ammo });
      }
      p.weapons[worstSlot] = { type: l.weaponType, mag: WEAPON_DEFS[l.weaponType].magSize, ammo: l.ammo };
      lootItems.splice(idx, 1);
    }
  } else {
    doPickup(p, idx);
  }
}

function updateAI(p, dt) {
  if (!p.alive || !p.isAI) return;
  checkReload(p);
  const now = performance.now();
  p.aiStateTimer    -= dt;
  p.aiScanTimer     -= dt;
  p.aiPickupCooldown -= dt;

  const distToZone = dist(p.x, p.y, zone.x, zone.y);
  const zoneUrgent = distToZone > zone.r - 30;

  let nearestEnemy = null, nearestDist = Infinity;
  for (const other of players) {
    if (other.id === p.id || !other.alive) continue;
    const d = dist(p.x, p.y, other.x, other.y);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = other; }
  }

  if (zoneUrgent) {
    p.aiState = 'move_zone';
  } else if (nearestEnemy && nearestDist < 300 && p.hp > 30) {
    p.aiState  = 'fight';
    p.aiTarget = nearestEnemy;
  } else if (nearestEnemy && nearestDist < 200 && p.hp <= 30) {
    p.aiState = 'flee';
  } else if (p.aiStateTimer <= 0) {
    p.aiState      = 'loot';
    p.aiStateTimer = 2000 + Math.random() * 3000;
  }

  let moveX = 0, moveY = 0, wantShoot = false;

  if (p.aiState === 'move_zone') {
    const a = Math.atan2(zone.y - p.y, zone.x - p.x);
    moveX = Math.cos(a);
    moveY = Math.sin(a);
    if (nearestEnemy && nearestDist < 250) {
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      wantShoot = true;
    } else {
      p.angle = a;
    }
  } else if (p.aiState === 'fight') {
    const target = p.aiTarget;
    if (target && target.alive) {
      p.angle = Math.atan2(target.y - p.y, target.x - p.x);
      const w = p.weapons[p.activeWeapon];
      const idealRange = w ? WEAPON_DEFS[w.type].range * 0.6 : 150;
      const targetDist_ = dist(p.x, p.y, target.x, target.y);
      p.aiStrafeDist += dt;
      if (p.aiStrafeDist > 800 + Math.random() * 600) {
        p.aiStrafeDist = 0;
        p.aiStrafeDir *= -1;
      }
      const perpA = p.angle + Math.PI / 2 * p.aiStrafeDir;
      if (targetDist_ > idealRange + 30) {
        moveX = Math.cos(p.angle) * 0.7 + Math.cos(perpA) * 0.3;
        moveY = Math.sin(p.angle) * 0.7 + Math.sin(perpA) * 0.3;
      } else if (targetDist_ < idealRange - 30) {
        moveX = -Math.cos(p.angle) * 0.5 + Math.cos(perpA) * 0.5;
        moveY = -Math.sin(p.angle) * 0.5 + Math.sin(perpA) * 0.5;
      } else {
        moveX = Math.cos(perpA);
        moveY = Math.sin(perpA);
      }
      wantShoot = true;
    } else {
      p.aiState = 'loot';
    }
  } else if (p.aiState === 'flee') {
    if (nearestEnemy) {
      const a = Math.atan2(p.y - nearestEnemy.y, p.x - nearestEnemy.x);
      moveX = Math.cos(a);
      moveY = Math.sin(a);
      p.angle = a + Math.PI;
    }
  } else if (p.aiState === 'loot') {
    let bestLoot = null, bestLootDist = 300;
    for (let i = 0; i < lootItems.length; i++) {
      const l = lootItems[i];
      const d = dist(p.x, p.y, l.x, l.y);
      if (d < bestLootDist) {
        let priority = d;
        if (l.kind === 'weapon' && (!p.weapons[0] || !p.weapons[1])) priority *= 0.5;
        if (l.kind === 'weapon') {
          const curBest  = getBestWeaponTier(p);
          const lootTier = WEAPON_TIERS.indexOf(l.weaponType);
          if (lootTier > curBest) priority *= 0.3;
        }
        if (l.kind === 'health' && p.hp < 70) priority *= 0.4;
        if (l.kind === 'armor' && p.armor < 50) priority *= 0.5;
        if (priority < bestLootDist) { bestLootDist = priority; bestLoot = i; }
      }
    }
    if (bestLoot !== null) {
      const l = lootItems[bestLoot];
      const a = Math.atan2(l.y - p.y, l.x - p.x);
      moveX = Math.cos(a);
      moveY = Math.sin(a);
      p.angle = a;
      if (dist(p.x, p.y, l.x, l.y) < 30 && p.aiPickupCooldown <= 0) {
        aiDoPickup(p, bestLoot);
        p.aiPickupCooldown = 300;
      }
    } else {
      if (!p.aiMoveTarget || dist(p.x, p.y, p.aiMoveTarget.x, p.aiMoveTarget.y) < 50) {
        p.aiMoveTarget = {
          x: zone.x + (Math.random() - 0.5) * zone.r * 0.8,
          y: zone.y + (Math.random() - 0.5) * zone.r * 0.8
        };
      }
      const a = Math.atan2(p.aiMoveTarget.y - p.y, p.aiMoveTarget.x - p.x);
      moveX = Math.cos(a);
      moveY = Math.sin(a);
      p.angle = a;
    }
    if (nearestEnemy && nearestDist < 200) {
      p.angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      wantShoot = true;
    }
  }

  if (wantShoot || p.aiState === 'fight') selectBestWeapon(p, nearestDist);

  const ml = Math.hypot(moveX, moveY);
  if (ml > 0) {
    p.x += (moveX / ml) * p.speed;
    p.y += (moveY / ml) * p.speed;
  }
  resolveWallCollision(p);

  if (wantShoot) {
    const w = p.weapons[p.activeWeapon];
    if (w && w.mag <= 0 && !p.reloading) startReload(p);
    if (w && !p.reloading && now - p.lastFire > WEAPON_DEFS[w.type].fireRate + 50 + Math.random() * 100) {
      p.angle += (Math.random() - 0.5) * 0.12;
      shoot(p);
    }
  }
}

// ── inView culling ──
function inView(x, y, pad) {
  return x > camera.x - pad && x < camera.x + CW + pad &&
         y > camera.y - pad && y < camera.y + CH + pad;
}

// ── Polygon helpers for rendering ──
function makeCirclePoints(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function makeArcPoints(cx, cy, r, startA, endA, segments) {
  const pts = [];
  const span = endA - startA;
  for (let i = 0; i <= segments; i++) {
    const a = startA + (i / segments) * span;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// ── Rounded rect polygon ──
function makeRoundedRect(x, y, w, h, r) {
  const pts = [];
  const steps = 4;
  // top-left corner
  for (let i = steps; i >= 0; i--) {
    const a = Math.PI + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  // top-right
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  // bottom-right
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  // bottom-left
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  return pts;
}

// ── DOM UI refs ──
const killCountEl  = document.getElementById('killCount');
const aliveCountEl = document.getElementById('aliveCount');
const scoreEl      = document.getElementById('score');

// ── Pending mouse-click queue (processed in onUpdate) ──
let pendingClicks = [];

// ── Main createGame ──
export function createGame() {
  const game = new Game('game');

  // ── Mouse state (canvas-relative) ──
  mouse = { x: CW / 2, y: CH / 2, down: false, wasDown: false };

  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('contextmenu', e => e.preventDefault());

  canvasEl.addEventListener('mousemove', e => {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvasEl.addEventListener('mousedown', e => {
    const rect = canvasEl.getBoundingClientRect();
    pendingClicks.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      button: e.button,
      gameState
    });
    if (e.button === 0) mouse.down = true;
  });

  canvasEl.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
  });

  // ── Extra key actions (pickup, reload, inventory, weapon swap) ──
  document.addEventListener('keydown', e => {
    if (gameState !== 'playing') return;
    if (e.key.toLowerCase() === 'e') tryPickup();
    if (e.key.toLowerCase() === 'r') startReload(players[0]);
    if (e.key === 'Tab')  { e.preventDefault(); showInventory = !showInventory; }
    if (e.key === '1') players[0].activeWeapon = 0;
    if (e.key === '2') players[0].activeWeapon = 1;
  });

  // ── onInit ──
  game.onInit = () => {
    gameState = 'menu';
    score = 0;
    game.setScoreFn(() => score);
    game.showOverlay('BATTLE ROYALE 2D', '8 players. 1 survivor. Shrinking zone.');
    const hintElInit = document.getElementById('overlayHint');
    if (hintElInit) hintElInit.textContent = 'Click to Drop In';
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── onUpdate ──
  game.onUpdate = (dt) => {
    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      if (click.gameState === 'menu') {
        initGame();
        gameState = 'playing';
        game.setState('playing');
      } else if (click.gameState === 'gameover') {
        gameState = 'menu';
        game.showOverlay('BATTLE ROYALE 2D', '8 players. 1 survivor. Shrinking zone.');
        const hintElBack = document.getElementById('overlayHint');
        if (hintElBack) hintElBack.textContent = 'Click to Drop In';
        game.setState('waiting');
      }
    }

    if (gameState !== 'playing') return;

    gameTime += dt;

    const player = players[0];

    // ── Zone phase ──
    if (gameTime >= nextZoneTime && zonePhase < 7) {
      zonePhase++;
      zoneFrom = { x: zone.x, y: zone.y, r: zone.r };
      const newR = Math.max(80, zone.r * 0.6);
      const maxOff = (zone.r - newR) * 0.4;
      zoneTarget = {
        x: zone.x + (Math.random() - 0.5) * maxOff,
        y: zone.y + (Math.random() - 0.5) * maxOff,
        r: newR
      };
      zoneTarget.x = Math.max(zoneTarget.r, Math.min(MAP_W - zoneTarget.r, zoneTarget.x));
      zoneTarget.y = Math.max(zoneTarget.r, Math.min(MAP_H - zoneTarget.r, zoneTarget.y));
      zoneShrinkStart = gameTime;
      zoneShrinkDur   = 12000 + zonePhase * 1000;
      nextZoneTime    = gameTime + ZONE_INTERVAL;
      addKillFeed('', 'Zone shrinking!', '#f64');
    }

    // Interpolate zone
    if (gameTime < zoneShrinkStart + zoneShrinkDur && zoneShrinkStart > 0) {
      const t = (gameTime - zoneShrinkStart) / zoneShrinkDur;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      zone.x = zoneFrom.x + (zoneTarget.x - zoneFrom.x) * ease;
      zone.y = zoneFrom.y + (zoneTarget.y - zoneFrom.y) * ease;
      zone.r = zoneFrom.r + (zoneTarget.r - zoneFrom.r) * ease;
    } else if (zoneShrinkStart > 0) {
      zone.x = zoneTarget.x;
      zone.y = zoneTarget.y;
      zone.r = zoneTarget.r;
    }

    // Zone damage every 500ms
    if (gameTime - lastZoneTick > 500) {
      lastZoneTick = gameTime;
      for (const p of players) {
        if (!p.alive) continue;
        if (dist(p.x, p.y, zone.x, zone.y) > zone.r) {
          const dmgMult = 1 + zonePhase * 0.5;
          takeDamage(p, ZONE_DAMAGE * dmgMult, -1);
        }
      }
    }

    // ── Player input ──
    if (player.alive) {
      let mx = 0, my = 0;
      if (game.input.isDown('w') || game.input.isDown('ArrowUp'))    my -= 1;
      if (game.input.isDown('s') || game.input.isDown('ArrowDown'))  my += 1;
      if (game.input.isDown('a') || game.input.isDown('ArrowLeft'))  mx -= 1;
      if (game.input.isDown('d') || game.input.isDown('ArrowRight')) mx += 1;
      const ml = Math.hypot(mx, my);
      if (ml > 0) {
        player.x += (mx / ml) * player.speed;
        player.y += (my / ml) * player.speed;
      }
      resolveWallCollision(player);

      const worldMouseX = mouse.x + camera.x;
      const worldMouseY = mouse.y + camera.y;
      player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

      const w = player.weapons[player.activeWeapon];
      if (mouse.down && w) {
        if (WEAPON_DEFS[w.type].auto) {
          shoot(player);
        } else if (!mouse.wasDown) {
          shoot(player);
        }
      }
      mouse.wasDown = mouse.down;

      checkReload(player);
    }

    // ── AI ──
    for (const p of players) {
      if (p.isAI) updateAI(p, dt);
    }

    // ── Bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.dist += Math.hypot(b.vx, b.vy);
      if (b.dist > b.range || b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) {
        bullets.splice(i, 1); continue;
      }
      let hitWall = false;
      for (const w of walls) {
        if (b.x >= w.x && b.x <= w.x + w.w && b.y >= w.y && b.y <= w.y + w.h) {
          hitWall = true; break;
        }
      }
      if (hitWall) { bullets.splice(i, 1); continue; }
      let hitPlayer = false;
      for (const p of players) {
        if (!p.alive || p.id === b.owner) continue;
        if (dist(b.x, b.y, p.x, p.y) < PLAYER_R + 3) {
          takeDamage(p, b.damage, b.owner);
          p.flashTimer = 150;
          bullets.splice(i, 1);
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) continue;
    }

    // Flash timers
    for (const p of players) {
      if (p.flashTimer > 0) p.flashTimer -= dt;
    }

    // Camera
    if (player.alive) {
      camera.x = player.x - CW / 2;
      camera.y = player.y - CH / 2;
    }

    // DOM UI
    const alive = players.filter(p => p.alive).length;
    if (killCountEl)  killCountEl.textContent  = player.kills;
    if (aliveCountEl) aliveCountEl.textContent = alive;
    if (scoreEl)      scoreEl.textContent      = score;

    // Win / loss check
    if (alive <= 1 || !player.alive) {
      endGame();
    }
  };

  function endGame() {
    gameState = 'gameover';
    const player = players[0];
    const placement = player.alive ? 1 : player.placement;
    const placementBonus = Math.max(0, (8 - placement) * 50);
    score = player.kills * 100 + placementBonus;
    const title = placement === 1 ? 'VICTORY ROYALE!' : `#${placement} / 8`;
    const body  = `Kills: ${player.kills} | Score: ${score}`;
    game.showOverlay(title, body);
    // Patch the hint text into overlayText since showOverlay uses title+text
    const hintEl = document.getElementById('overlayHint');
    if (hintEl) hintEl.textContent = 'Click to Play Again';
    game.setState('over');
    gameState = 'gameover'; // keep local copy in sync
  }

  // ── onDraw ──
  game.onDraw = (renderer, text) => {
    if (gameState === 'menu') {
      // Just background; overlay handles the UI
      renderer.fillRect(0, 0, CW, CH, '#1a1a2e');
      return;
    }
    if (!players) return;

    const sx = -camera.x; // world→screen offset
    const sy = -camera.y;

    // ── Ground ──
    const groundL = Math.max(0,     camera.x);
    const groundT = Math.max(0,     camera.y);
    const groundR = Math.min(MAP_W, camera.x + CW);
    const groundB = Math.min(MAP_H, camera.y + CH);
    renderer.fillRect(sx, sy, MAP_W, MAP_H, '#141428');

    // ── Grid lines ──
    const gx0 = Math.floor(camera.x / TILE) * TILE;
    const gy0 = Math.floor(camera.y / TILE) * TILE;
    for (let x = gx0; x < camera.x + CW + TILE; x += TILE) {
      renderer.drawLine(x + sx, camera.y + sy, x + sx, camera.y + CH + sy, '#1e1e3a', 1);
    }
    for (let y = gy0; y < camera.y + CH + TILE; y += TILE) {
      renderer.drawLine(camera.x + sx, y + sy, camera.x + CW + sx, y + sy, '#1e1e3a', 1);
    }

    // ── Zone danger overlay: draw as a large filled rect with a circle cutout.
    // Approximate by drawing a filled annulus: fill map rect in red-tint,
    // then paint inside the zone circle in transparent (no, that'd overdraw).
    // Better: draw the filled rect first with clip-like approach by drawing a
    // large number of fill-rect strips outside the circle.  Simplest correct
    // approach for WebGL: draw the full map rect at low alpha, then draw the
    // safe zone circle on top at matching background color so it looks cut out.
    // We'll overlay a semi-transparent red rect over the whole visible area
    // and re-fill the safe circle with a very dark color to mask the red.
    // Actually the cleanest approach: fill the danger area using fillPoly of
    // a "frame" (outer map rect + inner circle approximated as polygon).
    {
      const dangerColor = 'rgba(255,50,30,0.12)';
      // Outer rectangle vertices (world coords, converted to screen)
      const outerPts = [
        { x: 0 + sx,      y: 0 + sy      },
        { x: MAP_W + sx,  y: 0 + sy      },
        { x: MAP_W + sx,  y: MAP_H + sy  },
        { x: 0 + sx,      y: MAP_H + sy  },
      ];
      // Inner circle (safe zone) — reversed winding
      const SEGS = 48;
      const innerPts = [];
      for (let i = SEGS - 1; i >= 0; i--) {
        const a = (i / SEGS) * Math.PI * 2;
        innerPts.push({
          x: zone.x + sx + Math.cos(a) * zone.r,
          y: zone.y + sy + Math.sin(a) * zone.r
        });
      }
      // Combine into one polygon: outer → inner (join at seam)
      const framePts = [...outerPts, outerPts[0], innerPts[0], ...innerPts, innerPts[0]];
      renderer.fillPoly(framePts, dangerColor);
    }

    // ── Zone border (dashed circle) ──
    {
      const SEGS = 60;
      const borderPts = makeCirclePoints(zone.x + sx, zone.y + sy, zone.r, SEGS);
      // Stroke as dashed: alternate segments
      const dashSegs = 10, gapSegs = 8;
      let i = 0;
      while (i < SEGS) {
        const end = Math.min(i + dashSegs, SEGS);
        const segPts = [];
        for (let j = i; j <= end && j < borderPts.length; j++) segPts.push(borderPts[j]);
        if (segPts.length >= 2) renderer.strokePoly(segPts, '#f64', 3, false);
        i += dashSegs + gapSegs;
      }
    }

    // ── Next zone indicator ──
    if (zoneTarget && zoneTarget.r < zone.r - 5) {
      const SEGS = 40;
      const nextPts = makeCirclePoints(zoneTarget.x + sx, zoneTarget.y + sy, zoneTarget.r, SEGS);
      const dashSegs = 8, gapSegs = 6;
      let i = 0;
      while (i < SEGS) {
        const end = Math.min(i + dashSegs, SEGS);
        const segPts = [];
        for (let j = i; j <= end && j < nextPts.length; j++) segPts.push(nextPts[j]);
        if (segPts.length >= 2) renderer.strokePoly(segPts, 'rgba(255,255,255,0.25)', 1.5, false);
        i += dashSegs + gapSegs;
      }
    }

    // ── Trees ──
    for (const t of trees) {
      if (!inView(t.x, t.y, t.r + 10)) continue;
      const tx = t.x + sx, ty = t.y + sy;
      renderer.fillCircle(tx, ty, t.r, t.shade);
      const outline = makeCirclePoints(tx, ty, t.r, 16);
      renderer.strokePoly(outline, '#0a2a0a', 1, true);
    }

    // ── Buildings ──
    for (const b of buildings) {
      if (!inView(b.x + b.w/2, b.y + b.h/2, Math.max(b.w, b.h))) continue;
      const bx = b.x + sx, by = b.y + sy;
      renderer.fillRect(bx, by, b.w, b.h, b.color);
      renderer.strokePoly([
        { x: bx,        y: by        },
        { x: bx + b.w,  y: by        },
        { x: bx + b.w,  y: by + b.h  },
        { x: bx,        y: by + b.h  }
      ], '#444', 1.5, true);
      // Door gap
      renderer.fillRect(bx + b.w/2 - 8, by + b.h - 6, 16, 6, '#222');
    }

    // ── Loot ──
    for (const l of lootItems) {
      if (!inView(l.x, l.y, 20)) continue;
      const lx = l.x + sx, ly = l.y + sy;
      const pulse = 0.8 + Math.sin(gameTime / 300 + l.x) * 0.2;

      if (l.kind === 'weapon') {
        const col = WEAPON_DEFS[l.weaponType].color;
        renderer.setGlow(col, 0.5 * pulse);
        renderer.fillRect(lx - 8, ly - 4, 16, 8, col);
        renderer.setGlow(null);
      } else if (l.kind === 'health') {
        renderer.setGlow('#4f4', 0.5 * pulse);
        renderer.fillRect(lx - 5, ly - 2, 10, 4, '#4f4');
        renderer.fillRect(lx - 2, ly - 5, 4, 10, '#4f4');
        renderer.setGlow(null);
      } else if (l.kind === 'armor') {
        renderer.setGlow('#48f', 0.5 * pulse);
        renderer.fillCircle(lx, ly, 6, '#48f');
        // Arc
        const arcPts = makeArcPoints(lx, ly, 6, -Math.PI * 0.8, Math.PI * 0.8, 12);
        renderer.strokePoly(arcPts, '#aaf', 1.5, false);
        renderer.setGlow(null);
      } else if (l.kind === 'ammo') {
        renderer.setGlow('#fa0', 0.4 * pulse);
        renderer.fillRect(lx - 4, ly - 3, 8, 6, '#fa0');
        renderer.setGlow(null);
      }
    }

    // ── Bullets ──
    for (const b of bullets) {
      if (!inView(b.x, b.y, 5)) continue;
      const bx = b.x + sx, by_ = b.y + sy;
      renderer.setGlow(b.color, 0.6);
      renderer.fillCircle(bx, by_, 2.5, b.color);
      renderer.setGlow(null);
      // Trail (semi-transparent)
      const trailColor = b.color + '66'; // ~40% alpha via hex aa
      renderer.drawLine(bx, by_, bx - b.vx * 2, by_ - b.vy * 2, trailColor, 1.5);
    }

    // ── Players (alive) ──
    for (const p of players) {
      if (!p.alive) continue;
      if (!inView(p.x, p.y, 40)) continue;
      drawPlayer(renderer, text, p, sx, sy);
    }

    // ── Dead markers ──
    for (const p of players) {
      if (p.alive) continue;
      if (!inView(p.x, p.y, 15)) continue;
      const px = p.x + sx, py = p.y + sy;
      renderer.drawLine(px - 6, py - 6, px + 6, py + 6, 'rgba(136,136,136,0.4)', 2);
      renderer.drawLine(px + 6, py - 6, px - 6, py + 6, 'rgba(136,136,136,0.4)', 2);
    }

    // ── Pickup hint ──
    if (players[0].alive) {
      for (const l of lootItems) {
        if (dist(players[0].x, players[0].y, l.x, l.y) < 40) {
          let label = l.kind === 'weapon' ? l.weaponType : l.kind;
          if (l.kind === 'health') label = `Health +${l.amount}`;
          if (l.kind === 'armor') label = `Armor +${l.amount}`;
          if (l.kind === 'ammo') label = `${l.weaponType} Ammo +${l.amount}`;
          text.drawText(`[E] ${label}`, l.x + sx, l.y + sy - 22, 10, '#ffffff', 'center');
          break;
        }
      }
    }

    // ── HUD ──
    drawHUD(renderer, text);
    drawMinimap(renderer, text);
    drawKillFeed(renderer, text);
    if (showInventory) drawInventory(renderer, text);
  };

  function drawPlayer(renderer, text, p, sx, sy) {
    const px = p.x + sx, py = p.y + sy;

    if (p.flashTimer > 0) {
      renderer.setGlow('#ffffff', 0.8);
    }

    // Body
    renderer.fillCircle(px, py, PLAYER_R, p.color);
    const bodyOutline = makeCirclePoints(px, py, PLAYER_R, 20);
    renderer.strokePoly(bodyOutline, p.id === 0 ? '#ffffff' : '#333333', p.id === 0 ? 2 : 1, true);
    renderer.setGlow(null);

    // Weapon direction line
    const gunStartX = px + Math.cos(p.angle) * 8;
    const gunStartY = py + Math.sin(p.angle) * 8;
    const gunEndX   = px + Math.cos(p.angle) * 18;
    const gunEndY   = py + Math.sin(p.angle) * 18;
    renderer.drawLine(gunStartX, gunStartY, gunEndX, gunEndY, '#dddddd', 3);

    // Armor ring
    if (p.armor > 0) {
      const armorFrac = p.armor / p.maxArmor;
      const armorPts = makeArcPoints(px, py, PLAYER_R + 3, 0, Math.PI * 2 * armorFrac, 20);
      renderer.strokePoly(armorPts, '#4488ff', 2, false);
    }

    // Name
    text.drawText(p.name, px, py - 28, 9, p.color, 'center');

    // HP bar
    const bw = 24;
    renderer.fillRect(px - bw/2, py - 19, bw, 3, '#333333');
    const hpPct = p.hp / p.maxHp;
    const hpColor = hpPct > 0.5 ? '#44ff44' : (hpPct > 0.25 ? '#ffaa00' : '#ff4444');
    renderer.fillRect(px - bw/2, py - 19, bw * hpPct, 3, hpColor);
  }

  function drawHUD(renderer, text) {
    const p = players[0];
    const hw = 200, hh = 60;
    const hx = CW / 2 - hw / 2, hy = CH - hh - 10;

    // Background
    const bgPts = makeRoundedRect(hx, hy, hw, hh, 6);
    renderer.fillPoly(bgPts, 'rgba(10,10,30,0.85)');
    renderer.strokePoly(bgPts, '#f64', 1, true);

    // Health bar background + fill
    renderer.fillRect(hx + 10, hy + 8, 120, 10, '#333333');
    const hpPct = p.hp / p.maxHp;
    const hpColor = hpPct > 0.5 ? '#44ff44' : (hpPct > 0.25 ? '#ffaa00' : '#ff4444');
    renderer.fillRect(hx + 10, hy + 8, 120 * hpPct, 10, hpColor);
    text.drawText(`HP ${Math.ceil(p.hp)}`, hx + 135, hy + 8, 9, '#ffffff', 'left');

    // Armor bar
    renderer.fillRect(hx + 10, hy + 22, 120, 8, '#333333');
    if (p.armor > 0) {
      renderer.fillRect(hx + 10, hy + 22, 120 * (p.armor / p.maxArmor), 8, '#4488ff');
    }
    text.drawText(`AR ${Math.ceil(p.armor)}`, hx + 135, hy + 22, 9, '#88aaff', 'left');

    // Weapon info
    const w = p.weapons[p.activeWeapon];
    if (w) {
      const def = WEAPON_DEFS[w.type];
      text.drawText(w.type, hx + 10, hy + 37, 11, def.color, 'left');
      const reloadTxt = p.reloading ? ' [R]' : '';
      text.drawText(`${w.mag}/${def.magSize}  +${w.ammo}${reloadTxt}`, hx + 80, hy + 37, 10, '#ffffff', 'left');
    } else {
      text.drawText('No weapon', hx + 10, hy + 37, 10, '#666666', 'left');
    }

    // Weapon slots
    for (let i = 0; i < 2; i++) {
      const sx2 = hx - 45, sy2 = hy + i * 26;
      const slotBg = i === p.activeWeapon ? 'rgba(255,102,68,0.3)' : 'rgba(10,10,30,0.7)';
      const slotBdr = i === p.activeWeapon ? '#f64' : '#444444';
      const slotPts = makeRoundedRect(sx2, sy2, 38, 22, 3);
      renderer.fillPoly(slotPts, slotBg);
      renderer.strokePoly(slotPts, slotBdr, 1, true);
      const label = p.weapons[i] ? p.weapons[i].type.substring(0, 4) : '---';
      text.drawText(label, sx2 + 19, sy2 + 7, 8, '#aaaaaa', 'center');
    }

    // Reload progress bar
    if (p.reloading) {
      const wc = p.weapons[p.activeWeapon];
      if (wc) {
        const def = WEAPON_DEFS[wc.type];
        const pct = (performance.now() - p.reloadStart) / def.reloadTime;
        renderer.fillRect(CW/2 - 40, CH/2 + 25, 80, 6, 'rgba(0,0,0,0.6)');
        renderer.fillRect(CW/2 - 40, CH/2 + 25, 80 * Math.min(1, pct), 6, '#ffaa00');
        text.drawText('Reloading...', CW/2, CH/2 + 14, 9, '#ffffff', 'center');
      }
    }

    // Crosshair
    if (p.alive) {
      const cx = mouse.x, cy = mouse.y;
      renderer.drawLine(cx - 10, cy, cx - 4, cy, 'rgba(255,255,255,0.7)', 1.5);
      renderer.drawLine(cx + 4,  cy, cx + 10, cy, 'rgba(255,255,255,0.7)', 1.5);
      renderer.drawLine(cx, cy - 10, cx, cy - 4, 'rgba(255,255,255,0.7)', 1.5);
      renderer.drawLine(cx, cy + 4,  cx, cy + 10, 'rgba(255,255,255,0.7)', 1.5);
    }

    // Zone timer
    const timeToShrink = Math.max(0, nextZoneTime - gameTime);
    if (timeToShrink > 0 && zonePhase < 7) {
      renderer.fillRect(CW/2 - 50, 8, 100, 20, 'rgba(10,10,30,0.8)');
      renderer.strokePoly([
        { x: CW/2 - 50, y: 8  }, { x: CW/2 + 50, y: 8  },
        { x: CW/2 + 50, y: 28 }, { x: CW/2 - 50, y: 28 }
      ], '#f64', 1, true);
      text.drawText(`Zone ${zonePhase+1}: ${Math.ceil(timeToShrink/1000)}s`,
        CW/2, 12, 11, '#f64', 'center');
    }
  }

  function drawMinimap(renderer, text) {
    const mw = 120, mh = 120;
    const mx = CW - mw - 10, my = 10;
    const scale = mw / MAP_W;

    renderer.fillRect(mx, my, mw, mh, 'rgba(10,10,30,0.85)');
    renderer.strokePoly([
      { x: mx,      y: my      }, { x: mx + mw,  y: my      },
      { x: mx + mw, y: my + mh }, { x: mx,        y: my + mh }
    ], '#f64', 1, true);

    // Buildings
    for (const b of buildings) {
      renderer.fillRect(mx + b.x * scale, my + b.y * scale,
        Math.max(1, b.w * scale), Math.max(1, b.h * scale), 'rgba(100,100,120,0.5)');
    }

    // Zone circle
    const MSEGS = 32;
    const zoneMM = makeCirclePoints(mx + zone.x * scale, my + zone.y * scale, zone.r * scale, MSEGS);
    renderer.strokePoly(zoneMM, 'rgba(255,102,68,0.7)', 1.5, true);

    // Target zone
    if (zoneTarget && zoneTarget.r < zone.r - 5) {
      const targetMM = makeCirclePoints(mx + zoneTarget.x * scale, my + zoneTarget.y * scale, zoneTarget.r * scale, MSEGS);
      renderer.strokePoly(targetMM, 'rgba(255,255,255,0.3)', 1, true);
    }

    // Players
    for (const p of players) {
      if (!p.alive) continue;
      const px = mx + p.x * scale;
      const py = my + p.y * scale;
      if (p.id === 0) {
        renderer.fillRect(px - 2.5, py - 2.5, 5, 5, p.color);
        renderer.strokePoly([
          { x: px - 2.5, y: py - 2.5 }, { x: px + 2.5, y: py - 2.5 },
          { x: px + 2.5, y: py + 2.5 }, { x: px - 2.5, y: py + 2.5 }
        ], '#ffffff', 1, true);
      } else {
        renderer.fillCircle(px, py, 2, p.color);
      }
    }

    // Camera view box
    renderer.strokePoly([
      { x: mx + camera.x * scale,        y: my + camera.y * scale        },
      { x: mx + (camera.x + CW) * scale, y: my + camera.y * scale        },
      { x: mx + (camera.x + CW) * scale, y: my + (camera.y + CH) * scale },
      { x: mx + camera.x * scale,        y: my + (camera.y + CH) * scale }
    ], 'rgba(255,255,255,0.25)', 0.5, true);
  }

  function drawKillFeed(renderer, text) {
    let y = 40;
    for (let i = 0; i < killFeed.length; i++) {
      const kf = killFeed[i];
      const age = gameTime - kf.time;
      if (age > 6000) continue;
      const alpha = age > 4000 ? 1 - (age - 4000) / 2000 : 1;
      const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(10, y, 180, 18, `rgba(10,10,30,${(alpha * 0.7).toFixed(2)})`);
      if (kf.killer) {
        // killer > victim
        const killerColor = kf.color + aHex;
        text.drawText(kf.killer, 14, y + 4, 10, killerColor, 'left');
        // Approximate x offset for killer text (~6px per char at size 10)
        const killerW = kf.killer.length * 6;
        text.drawText(' > ', 14 + killerW, y + 4, 10, `#888888${aHex}`, 'left');
        const arrowW = 3 * 6;
        text.drawText(kf.victim, 14 + killerW + arrowW, y + 4, 10, `#cccccc${aHex}`, 'left');
      } else {
        text.drawText(kf.victim, 14, y + 4, 10, kf.color + aHex, 'left');
      }
      y += 20;
    }
  }

  function drawInventory(renderer, text) {
    const p = players[0];
    const iw = 220, ih = 200;
    const ix = CW/2 - iw/2, iy = CW/2 - ih/2;

    const invPts = makeRoundedRect(ix, iy, iw, ih, 8);
    renderer.fillPoly(invPts, 'rgba(10,10,30,0.92)');
    renderer.strokePoly(invPts, '#f64', 2, true);

    text.drawText('INVENTORY', ix + iw/2, iy + 10, 14, '#f64', 'center');

    let y = iy + 45;
    for (let i = 0; i < 2; i++) {
      const w = p.weapons[i];
      const slotColor = i === p.activeWeapon ? '#f64' : '#888888';
      text.drawText(`Slot ${i+1}: `, ix + 16, y - 4, 11, slotColor, 'left');
      if (w) {
        text.drawText(w.type, ix + 70, y - 4, 11, WEAPON_DEFS[w.type].color, 'left');
        text.drawText(`${w.mag}/${WEAPON_DEFS[w.type].magSize} +${w.ammo}`, ix + 140, y - 4, 11, '#aaaaaa', 'left');
      } else {
        text.drawText('Empty', ix + 70, y - 4, 11, '#555555', 'left');
      }
      y += 20;
    }

    y += 10;
    text.drawText(`Health:  ${Math.ceil(p.hp)} / ${p.maxHp}`, ix + 16, y - 4, 11, '#44ff44', 'left');
    y += 18;
    text.drawText(`Armor:   ${Math.ceil(p.armor)} / ${p.maxArmor}`, ix + 16, y - 4, 11, '#4488ff', 'left');
    y += 26;

    const alive = players.filter(q => q.alive).length;
    text.drawText(`Kills: ${p.kills}`, ix + 16, y - 4, 9, '#888888', 'left');
    y += 14;
    text.drawText(`Alive: ${alive} / 8`, ix + 16, y - 4, 9, '#888888', 'left');
    y += 14;
    text.drawText(`Zone Phase: ${zonePhase}`, ix + 16, y - 4, 9, '#888888', 'left');
  }

  game.start();
  return game;
}
