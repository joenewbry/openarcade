// kingdom-clash/game.js — Kingdom Clash RTS ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const CW = 720, CH = 500;

// Map constants
const MAP_W = 2400, MAP_H = 1600;
const TILE = 32;
const TILES_X = MAP_W / TILE;  // 75
const TILES_Y = MAP_H / TILE;  // 50

// Ages
const AGES = ['Dark', 'Feudal', 'Castle'];
const AGE_COST = [
  null,
  { food: 500, gold: 0 },
  { food: 800, gold: 200 }
];

// ===== BUILDING DEFS =====
const BLDG = {
  townCenter:  { name: 'Town Center',    w: 3, h: 3, hp: 2000, age: 0, cost: { wood: 300 }, popAdd: 5,  symbol: 'TC', color: '#da4' },
  house:       { name: 'House',          w: 2, h: 2, hp: 300,  age: 0, cost: { wood: 30  }, popAdd: 5,  symbol: 'H',  color: '#a86' },
  farm:        { name: 'Farm',           w: 2, h: 2, hp: 200,  age: 0, cost: { wood: 60  }, popAdd: 0,  symbol: 'F',  color: '#6a4' },
  barracks:    { name: 'Barracks',       w: 2, h: 2, hp: 600,  age: 1, cost: { wood: 150 }, popAdd: 0,  symbol: 'BK', color: '#c55' },
  archery:     { name: 'Archery Range',  w: 2, h: 2, hp: 500,  age: 1, cost: { wood: 175 }, popAdd: 0,  symbol: 'AR', color: '#5a5' },
  stable:      { name: 'Stable',         w: 3, h: 2, hp: 600,  age: 2, cost: { wood: 150, gold: 50 }, popAdd: 0, symbol: 'ST', color: '#86c' },
  blacksmith:  { name: 'Blacksmith',     w: 2, h: 2, hp: 500,  age: 1, cost: { wood: 100, gold: 50 }, popAdd: 0, symbol: 'BS', color: '#888' },
  wall:        { name: 'Wall',           w: 1, h: 1, hp: 400,  age: 1, cost: { wood: 5   }, popAdd: 0,  symbol: 'W',  color: '#777' }
};

// ===== UNIT DEFS =====
const UNIT = {
  villager:  { name: 'Villager',   hp: 25,  atk: 3,  range: 1, speed: 1.5, cost: { food: 50 },          popCost: 1, age: 0, trainAt: 'townCenter', trainTime: 15, symbol: 'V', color: '#8cf' },
  militia:   { name: 'Militia',    hp: 40,  atk: 6,  range: 1, speed: 1.3, cost: { food: 60, gold: 20 }, popCost: 1, age: 0, trainAt: 'barracks',   trainTime: 18, symbol: 'M', color: '#f66' },
  swordsman: { name: 'Swordsman',  hp: 60,  atk: 10, range: 1, speed: 1.2, cost: { food: 60, gold: 30 }, popCost: 1, age: 1, trainAt: 'barracks',   trainTime: 20, symbol: 'S', color: '#f44' },
  archer:    { name: 'Archer',     hp: 30,  atk: 5,  range: 5, speed: 1.4, cost: { food: 25, gold: 45 }, popCost: 1, age: 1, trainAt: 'archery',    trainTime: 20, symbol: 'A', color: '#4f4' },
  knight:    { name: 'Knight',     hp: 120, atk: 14, range: 1, speed: 2.2, cost: { food: 60, gold: 75 }, popCost: 2, age: 2, trainAt: 'stable',     trainTime: 25, symbol: 'K', color: '#c6f' }
};

// Tile color table
const TILE_COLORS = {
  0: '#2a4a1a',  // grass
  1: '#1a5a1a',  // tree
  2: '#8a7a2a',  // gold
  3: '#6a6a6a',  // stone
  4: '#1a2a4a',  // water
};

// ===== MODULE-SCOPE STATE =====
let score = 0;
let gameState = 'menu'; // menu, playing, won, lost

// Map
let tiles = [];
let camera = { x: 0, y: 0 };

// Entities
let players = [];
let selected = [];        // indices into players[0].units
let selectedBuilding = null;
let buildMode = null;
let gameTime = 0;
const MAX_TIME = 600;
let tickCount = 0;

// Input state
let mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let dragStart = null;
let scrollEdge = { x: 0, y: 0 };

// AI state
let aiTimer = 0;
let aiWaveCount = 0;

// Pending input events
let pendingMouseEvents = [];

// HUD DOM references (updated periodically)
let scoreEl, timerEl, killEl, builtEl;
let foodEl, woodEl, goldEl, popEl, ageEl;
let selTextEl;

// ===== HELPERS =====
function canAfford(player, cost) {
  return (player.food >= (cost.food || 0)) &&
         (player.wood >= (cost.wood || 0)) &&
         (player.gold >= (cost.gold || 0));
}

function payCost(player, cost) {
  player.food -= (cost.food || 0);
  player.wood -= (cost.wood || 0);
  player.gold -= (cost.gold || 0);
}

function distEntities(a, b) {
  let ax = a.x !== undefined ? a.x : (a.tx * TILE + TILE);
  let ay = a.y !== undefined ? a.y : (a.ty * TILE + TILE);
  let bx = b.x !== undefined ? b.x : (b.tx * TILE + TILE);
  let by = b.y !== undefined ? b.y : (b.ty * TILE + TILE);
  return Math.hypot(ax - bx, ay - by);
}

function bldgCenter(b) {
  const def = BLDG[b.type];
  return { x: (b.tx + def.w / 2) * TILE, y: (b.ty + def.h / 2) * TILE };
}

function clampCamera() {
  camera.x = Math.max(0, Math.min(MAP_W - CW, camera.x));
  camera.y = Math.max(0, Math.min(MAP_H - CH, camera.y));
}

function shiftColor(hex, id) {
  if (id === 1) {
    // 3-digit hex like '#da4'
    const h = hex.slice(1);
    let r, g, b;
    if (h.length === 3) {
      r = parseInt(h[0], 16) * 17;
      g = parseInt(h[1], 16) * 17;
      b = parseInt(h[2], 16) * 17;
    } else {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    }
    r = Math.min(255, r + 80);
    g = Math.max(0, g - 40);
    b = Math.max(0, b - 40);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  return hex;
}

function hpColor(pct) {
  if (pct > 0.5) return '#0a0';
  if (pct > 0.25) return '#aa0';
  return '#a00';
}

// ===== MAP GENERATION =====
function generateMap() {
  tiles = [];
  for (let y = 0; y < TILES_Y; y++) {
    tiles[y] = [];
    for (let x = 0; x < TILES_X; x++) {
      tiles[y][x] = 0;
    }
  }
  // Water edges
  for (let y = 0; y < TILES_Y; y++) {
    for (let x = 0; x < TILES_X; x++) {
      if (x === 0 || x === TILES_X - 1 || y === 0 || y === TILES_Y - 1) tiles[y][x] = 4;
    }
  }
  // Tree clusters
  for (let i = 0; i < 30; i++) {
    let cx = 3 + (Math.random() * (TILES_X - 6) | 0);
    let cy = 3 + (Math.random() * (TILES_Y - 6) | 0);
    let r = 2 + (Math.random() * 4 | 0);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        let nx = cx + dx, ny = cy + dy;
        if (nx > 1 && nx < TILES_X - 2 && ny > 1 && ny < TILES_Y - 2 && Math.random() < 0.6) {
          if (dx * dx + dy * dy < r * r) tiles[ny][nx] = 1;
        }
      }
    }
  }
  // Gold mines
  for (let i = 0; i < 12; i++) {
    let cx = 4 + (Math.random() * (TILES_X - 8) | 0);
    let cy = 4 + (Math.random() * (TILES_Y - 8) | 0);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.5) {
          let nx = cx + dx, ny = cy + dy;
          if (nx > 1 && nx < TILES_X - 2 && ny > 1 && ny < TILES_Y - 2) tiles[ny][nx] = 2;
        }
      }
    }
  }
  clearArea(3, 3, 10, 10);
  clearArea(TILES_X - 13, TILES_Y - 13, 10, 10);
  // Trees near player starts
  for (let i = 0; i < 3; i++) {
    let tx = 10 + (Math.random() * 6 | 0), ty = 3 + (Math.random() * 8 | 0);
    for (let d = 0; d < 6; d++) tiles[ty + (Math.random() * 3 | 0)][tx + (Math.random() * 3 | 0)] = 1;
    tx = TILES_X - 18 + (Math.random() * 6 | 0);
    ty = TILES_Y - 12 + (Math.random() * 8 | 0);
    for (let d = 0; d < 6; d++) tiles[Math.min(TILES_Y - 2, ty + (Math.random() * 3 | 0))][Math.min(TILES_X - 2, tx + (Math.random() * 3 | 0))] = 1;
  }
  // Gold near starts
  tiles[6][12] = 2; tiles[7][12] = 2; tiles[6][13] = 2;
  tiles[TILES_Y - 7][TILES_X - 13] = 2; tiles[TILES_Y - 8][TILES_X - 13] = 2; tiles[TILES_Y - 7][TILES_X - 14] = 2;
}

function clearArea(sx, sy, w, h) {
  for (let y = sy; y < sy + h && y < TILES_Y; y++)
    for (let x = sx; x < sx + w && x < TILES_X; x++)
      tiles[y][x] = 0;
}

// ===== ENTITY CREATION =====
function newPlayer(id) {
  return { id, food: 200, wood: 200, gold: 100, age: 0, pop: 0, maxPop: 10, units: [], buildings: [], kills: 0, built: 0 };
}

function createBuilding(player, type, tx, ty) {
  const def = BLDG[type];
  const b = { type, tx, ty, hp: def.hp, maxHp: def.hp, owner: player.id, built: false, buildProgress: 0, buildTime: 30, queue: [], queueTimers: [] };
  player.buildings.push(b);
  player.maxPop += def.popAdd;
  player.built++;
  for (let dy = 0; dy < def.h; dy++)
    for (let dx = 0; dx < def.w; dx++)
      tiles[ty + dy][tx + dx] = 10 + player.id;
  return b;
}

function createUnit(player, type, x, y) {
  const def = UNIT[type];
  const u = {
    type, x, y, hp: def.hp, maxHp: def.hp, owner: player.id,
    target: null, moveTarget: null, gatherTarget: null, gatherType: null,
    carrying: 0, carryType: null, attackTarget: null, attackCooldown: 0,
    state: 'idle', buildTarget: null
  };
  player.units.push(u);
  player.pop += def.popCost;
  return u;
}

// ===== INIT =====
function initGame() {
  generateMap();
  players = [newPlayer(0), newPlayer(1)];

  let tc0 = createBuilding(players[0], 'townCenter', 4, 4);
  tc0.built = true; tc0.buildProgress = 1;
  for (let i = 0; i < 3; i++) createUnit(players[0], 'villager', (5 + i) * TILE, 8 * TILE);

  let tc1 = createBuilding(players[1], 'townCenter', TILES_X - 7, TILES_Y - 7);
  tc1.built = true; tc1.buildProgress = 1;
  for (let i = 0; i < 3; i++) createUnit(players[1], 'villager', (TILES_X - 6 + i) * TILE, (TILES_Y - 4) * TILE);

  camera = { x: 0, y: 0 };
  selected = [];
  selectedBuilding = null;
  buildMode = null;
  gameTime = 0;
  tickCount = 0;
  score = 0;
  aiTimer = 0;
  aiWaveCount = 0;
}

// ===== PATHFINDING =====
function moveToward(unit, tx, ty, speed) {
  const dx = tx - unit.x, dy = ty - unit.y;
  const d = Math.hypot(dx, dy);
  if (d < speed * 2) { unit.x = tx; unit.y = ty; return true; }
  unit.x += (dx / d) * speed * 2;
  unit.y += (dy / d) * speed * 2;
  let tileX = unit.x / TILE | 0, tileY = unit.y / TILE | 0;
  if (tileX >= 0 && tileX < TILES_X && tileY >= 0 && tileY < TILES_Y) {
    if (tiles[tileY][tileX] === 4) {
      unit.x -= (dx / d) * speed * 2;
      unit.y -= (dy / d) * speed * 2;
    }
  }
  return false;
}

// ===== RESOURCE FIND =====
function findNearestResource(unit, type) {
  let tileType = type === 'wood' ? 1 : type === 'gold' ? 2 : -1;
  if (tileType < 0) return null;
  let ux = unit.x / TILE | 0, uy = unit.y / TILE | 0;
  for (let r = 1; r < 30; r++) {
    let best = null, bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        let nx = ux + dx, ny = uy + dy;
        if (nx >= 0 && nx < TILES_X && ny >= 0 && ny < TILES_Y && tiles[ny][nx] === tileType) {
          let d = Math.abs(dx) + Math.abs(dy);
          if (d < bestD) { bestD = d; best = { tx: nx, ty: ny }; }
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function findNearestDropoff(unit) {
  const p = players[unit.owner];
  let best = null, bestD = Infinity;
  for (const b of p.buildings) {
    if (!b.built || b.type !== 'townCenter') continue;
    let d = distEntities(unit, bldgCenter(b));
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function findNearestFarm(unit) {
  const p = players[unit.owner];
  let best = null, bestD = Infinity;
  for (const b of p.buildings) {
    if (b.type !== 'farm' || !b.built || b.hp <= 0) continue;
    let d = distEntities(unit, bldgCenter(b));
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// ===== UNIT AI =====
function updateUnit(unit, dt) {
  const def = UNIT[unit.type];
  const player = players[unit.owner];
  unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);

  unit.x = Math.max(TILE, Math.min(MAP_W - TILE, unit.x));
  unit.y = Math.max(TILE, Math.min(MAP_H - TILE, unit.y));

  if (unit.attackTarget) {
    const tgt = unit.attackTarget;
    if (!tgt || tgt.hp <= 0) { unit.attackTarget = null; unit.state = 'idle'; return; }
    const d = distEntities(unit, tgt);
    const range = def.range * TILE;
    if (d <= range + TILE) {
      unit.state = 'attacking';
      if (unit.attackCooldown <= 0) {
        tgt.hp -= def.atk;
        unit.attackCooldown = 1;
        if (tgt.hp <= 0) {
          const enemyId = tgt.owner !== undefined ? tgt.owner : (unit.owner === 0 ? 1 : 0);
          const enemy = players[enemyId];
          if (tgt.type && UNIT[tgt.type]) {
            enemy.units = enemy.units.filter(u => u !== tgt);
            enemy.pop -= UNIT[tgt.type].popCost;
            player.kills++;
          } else if (tgt.type && BLDG[tgt.type]) {
            const bdef = BLDG[tgt.type];
            for (let dy = 0; dy < bdef.h; dy++)
              for (let dx = 0; dx < bdef.w; dx++)
                if (tgt.ty + dy < TILES_Y && tgt.tx + dx < TILES_X)
                  tiles[tgt.ty + dy][tgt.tx + dx] = 0;
            enemy.buildings = enemy.buildings.filter(b => b !== tgt);
            enemy.maxPop -= bdef.popAdd;
            player.kills++;
          }
          unit.attackTarget = null;
          unit.state = 'idle';
        }
      }
    } else {
      unit.state = 'moving';
      let tx = tgt.x !== undefined ? tgt.x : (tgt.tx * TILE + TILE);
      let ty = tgt.y !== undefined ? tgt.y : (tgt.ty * TILE + TILE);
      moveToward(unit, tx, ty, def.speed);
    }
    return;
  }

  if (unit.moveTarget) {
    unit.state = 'moving';
    if (moveToward(unit, unit.moveTarget.x, unit.moveTarget.y, def.speed)) {
      unit.moveTarget = null;
      unit.state = 'idle';
    }
    return;
  }

  if (unit.buildTarget && unit.type === 'villager') {
    const b = unit.buildTarget;
    if (b.built || b.hp <= 0) { unit.buildTarget = null; unit.state = 'idle'; return; }
    const d = distEntities(unit, bldgCenter(b));
    if (d < TILE * 3) {
      unit.state = 'building';
      b.buildProgress += dt / b.buildTime;
      if (b.buildProgress >= 1) { b.built = true; b.buildProgress = 1; unit.buildTarget = null; unit.state = 'idle'; }
    } else {
      unit.state = 'moving';
      const c = bldgCenter(b);
      moveToward(unit, c.x, c.y, def.speed);
    }
    return;
  }

  if (unit.type === 'villager' && unit.gatherTarget) {
    const gt = unit.gatherTarget;
    if (unit.carrying >= 10) {
      const drop = findNearestDropoff(unit);
      if (drop) {
        const dc = bldgCenter(drop);
        const d = distEntities(unit, dc);
        if (d < TILE * 2.5) {
          if (unit.carryType === 'food') player.food += unit.carrying;
          else if (unit.carryType === 'wood') player.wood += unit.carrying;
          else if (unit.carryType === 'gold') player.gold += unit.carrying;
          unit.carrying = 0;
          unit.state = 'gathering';
        } else {
          unit.state = 'moving';
          moveToward(unit, dc.x, dc.y, def.speed);
        }
      }
      return;
    }
    if (unit.gatherType === 'food' && gt.type === 'farm') {
      const fc = bldgCenter(gt);
      const d = distEntities(unit, fc);
      if (d < TILE * 2.5) {
        unit.state = 'gathering';
        unit.carrying += dt * 3;
        unit.carryType = 'food';
        gt.hp -= dt * 0.5;
        if (gt.hp <= 0) { unit.gatherTarget = null; }
      } else {
        unit.state = 'moving';
        moveToward(unit, fc.x, fc.y, def.speed);
      }
      return;
    }
    let tx = gt.tx !== undefined ? gt.tx : (gt.x / TILE | 0);
    let ty = gt.ty !== undefined ? gt.ty : (gt.y / TILE | 0);
    if (tx >= 0 && tx < TILES_X && ty >= 0 && ty < TILES_Y) {
      let tileV = tiles[ty][tx];
      let expectedTile = unit.gatherType === 'wood' ? 1 : 2;
      if (tileV !== expectedTile) {
        let next = findNearestResource(unit, unit.gatherType);
        if (next) { unit.gatherTarget = next; } else { unit.gatherTarget = null; unit.state = 'idle'; }
        return;
      }
      let px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      let d = Math.hypot(unit.x - px, unit.y - py);
      if (d < TILE * 1.5) {
        unit.state = 'gathering';
        unit.carrying += dt * 3;
        unit.carryType = unit.gatherType;
        if (unit.carrying >= 10 && Math.random() < 0.15) tiles[ty][tx] = 0;
      } else {
        unit.state = 'moving';
        moveToward(unit, px, py, def.speed);
      }
    }
    return;
  }

  if (unit.type !== 'villager' || !unit.gatherTarget) {
    const enemyId = unit.owner === 0 ? 1 : 0;
    const enemy = players[enemyId];
    let closest = null, closestD = TILE * 8;
    for (const eu of enemy.units) {
      const d = distEntities(unit, eu);
      if (d < closestD) { closestD = d; closest = eu; }
    }
    for (const eb of enemy.buildings) {
      if (eb.hp <= 0) continue;
      const d = distEntities(unit, bldgCenter(eb));
      if (d < closestD) { closestD = d; closest = eb; }
    }
    if (closest) { unit.attackTarget = closest; return; }
  }

  unit.state = 'idle';
}

// ===== BUILDING QUEUES =====
function updateBuildingQueues(player, dt) {
  for (const b of player.buildings) {
    if (!b.built) continue;
    if (b.queue.length > 0) {
      b.queueTimers[0] -= dt;
      if (b.queueTimers[0] <= 0) {
        const unitType = b.queue.shift();
        b.queueTimers.shift();
        const def = UNIT[unitType];
        if (player.pop + def.popCost <= player.maxPop) {
          const c = bldgCenter(b);
          createUnit(player, unitType, c.x + TILE, c.y + TILE * 2);
        } else {
          if (def.cost.food) player.food += def.cost.food;
          if (def.cost.gold) player.gold += def.cost.gold;
        }
      }
    }
  }
}

// ===== TRAIN & AGE =====
function trainUnit(type) {
  if (gameState !== 'playing') return;
  const p = players[0];
  const def = UNIT[type];
  if (!def || p.age < def.age) return;
  if (!canAfford(p, def.cost)) return;
  if (p.pop + def.popCost > p.maxPop) return;
  let trainBldg = null;
  for (const b of p.buildings) { if (b.type === def.trainAt && b.built) { trainBldg = b; break; } }
  if (!trainBldg) return;
  payCost(p, def.cost);
  trainBldg.queue.push(type);
  trainBldg.queueTimers.push(def.trainTime);
  updateHUD();
  updateBuildButtons();
  updateTrainButtons();
}

function tryAgeUp() {
  if (gameState !== 'playing') return;
  const p = players[0];
  if (p.age >= 2) return;
  const cost = AGE_COST[p.age + 1];
  if (!canAfford(p, cost)) return;
  payCost(p, cost);
  p.age++;
  updateBuildButtons();
  updateTrainButtons();
  updateHUD();
}

function canPlaceBuilding(type, tx, ty) {
  const def = BLDG[type];
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      let nx = tx + dx, ny = ty + dy;
      if (nx < 1 || nx >= TILES_X - 1 || ny < 1 || ny >= TILES_Y - 1) return false;
      if (tiles[ny][nx] !== 0) return false;
    }
  }
  return true;
}

// ===== AI =====
function aiUpdate(dt) {
  const ai = players[1];
  aiTimer += dt;
  if (aiTimer < 3) return;
  aiTimer = 0;

  for (const u of ai.units) {
    if (u.type === 'villager' && u.state === 'idle' && !u.gatherTarget && !u.buildTarget && !u.attackTarget) {
      if (ai.food < 200) {
        let farm = findNearestFarm(u);
        if (farm) { u.gatherTarget = farm; u.gatherType = 'food'; }
        else {
          let done = false;
          for (const b of ai.buildings) {
            if (b.type === 'townCenter' && b.built) {
              for (let attempt = 0; attempt < 10; attempt++) {
                let fx = (b.tx + (Math.random() * 8 - 4)) | 0;
                let fy = (b.ty + (Math.random() * 8 - 2)) | 0;
                if (canPlaceBuilding('farm', fx, fy) && canAfford(ai, BLDG.farm.cost)) {
                  payCost(ai, BLDG.farm.cost);
                  let nb = createBuilding(ai, 'farm', fx, fy);
                  u.buildTarget = nb; done = true; break;
                }
              }
              if (done) break;
            }
          }
          if (!done) {
            let tree = findNearestResource(u, 'wood');
            if (tree) { u.gatherTarget = tree; u.gatherType = 'wood'; }
          }
        }
      } else if (ai.wood < 200) {
        let tree = findNearestResource(u, 'wood');
        if (tree) { u.gatherTarget = tree; u.gatherType = 'wood'; }
      } else if (ai.gold < 100) {
        let mine = findNearestResource(u, 'gold');
        if (mine) { u.gatherTarget = mine; u.gatherType = 'gold'; }
      } else {
        let types = ['wood', 'gold'];
        let type = types[Math.random() * 2 | 0];
        let res = findNearestResource(u, type);
        if (res) { u.gatherTarget = res; u.gatherType = type; }
      }
    }
  }

  let hasBarracks = ai.buildings.some(b => b.type === 'barracks' && b.built);
  let hasArchery  = ai.buildings.some(b => b.type === 'archery' && b.built);
  let hasStable   = ai.buildings.some(b => b.type === 'stable' && b.built);
  let hasBsmith   = ai.buildings.some(b => b.type === 'blacksmith' && b.built);
  let houseCount  = ai.buildings.filter(b => b.type === 'house').length;

  if (ai.pop >= ai.maxPop - 2 && houseCount < 8 && canAfford(ai, BLDG.house.cost)) {
    let tc = ai.buildings.find(b => b.type === 'townCenter');
    if (tc) {
      for (let attempt = 0; attempt < 20; attempt++) {
        let hx = (tc.tx + (Math.random() * 12 - 6)) | 0;
        let hy = (tc.ty + (Math.random() * 12 - 6)) | 0;
        if (canPlaceBuilding('house', hx, hy)) {
          payCost(ai, BLDG.house.cost);
          let nb = createBuilding(ai, 'house', hx, hy);
          let vill = ai.units.find(u => u.type === 'villager' && u.state === 'idle');
          if (vill) vill.buildTarget = nb;
          break;
        }
      }
    }
  }

  let villCount = ai.units.filter(u => u.type === 'villager').length;
  if (villCount < 8 && canAfford(ai, UNIT.villager.cost) && ai.pop < ai.maxPop) {
    let tc = ai.buildings.find(b => b.type === 'townCenter' && b.built);
    if (tc && tc.queue.length < 2) {
      payCost(ai, UNIT.villager.cost);
      tc.queue.push('villager');
      tc.queueTimers.push(UNIT.villager.trainTime);
    }
  }

  if (ai.age === 0 && ai.food >= 500 && villCount >= 5) {
    let cost = AGE_COST[1];
    if (canAfford(ai, cost)) { payCost(ai, cost); ai.age = 1; }
  }
  if (ai.age === 1 && ai.food >= 800 && ai.gold >= 200 && gameTime > 180) {
    let cost = AGE_COST[2];
    if (canAfford(ai, cost)) { payCost(ai, cost); ai.age = 2; }
  }

  if (ai.age >= 1 && !hasBarracks && canAfford(ai, BLDG.barracks.cost)) aiBuild(ai, 'barracks');
  if (ai.age >= 1 && !hasArchery && canAfford(ai, BLDG.archery.cost) && hasBarracks) aiBuild(ai, 'archery');
  if (ai.age >= 2 && !hasStable && canAfford(ai, BLDG.stable.cost)) aiBuild(ai, 'stable');
  if (ai.age >= 1 && !hasBsmith && canAfford(ai, BLDG.blacksmith.cost) && hasBarracks) aiBuild(ai, 'blacksmith');

  let militaryCount = ai.units.filter(u => u.type !== 'villager').length;
  if (ai.age >= 1 && ai.pop < ai.maxPop) {
    if (hasBarracks) {
      let type = ai.age >= 1 ? 'swordsman' : 'militia';
      if (canAfford(ai, UNIT[type].cost)) {
        let bk = ai.buildings.find(b => b.type === 'barracks' && b.built && b.queue.length < 3);
        if (bk) { payCost(ai, UNIT[type].cost); bk.queue.push(type); bk.queueTimers.push(UNIT[type].trainTime); }
      }
    }
    if (hasArchery && canAfford(ai, UNIT.archer.cost)) {
      let ar = ai.buildings.find(b => b.type === 'archery' && b.built && b.queue.length < 2);
      if (ar) { payCost(ai, UNIT.archer.cost); ar.queue.push('archer'); ar.queueTimers.push(UNIT.archer.trainTime); }
    }
    if (hasStable && canAfford(ai, UNIT.knight.cost)) {
      let st = ai.buildings.find(b => b.type === 'stable' && b.built && b.queue.length < 2);
      if (st) { payCost(ai, UNIT.knight.cost); st.queue.push('knight'); st.queueTimers.push(UNIT.knight.trainTime); }
    }
  }

  if (militaryCount >= 5 + aiWaveCount * 3 || (gameTime > 360 && militaryCount >= 3)) {
    let tc0 = players[0].buildings.find(b => b.type === 'townCenter');
    if (tc0) {
      for (const u of ai.units) {
        if (u.type !== 'villager' && !u.attackTarget) u.attackTarget = tc0;
      }
      aiWaveCount++;
    }
  }
}

function aiBuild(ai, type) {
  let tc = ai.buildings.find(b => b.type === 'townCenter');
  if (!tc) return;
  for (let attempt = 0; attempt < 30; attempt++) {
    let bx = (tc.tx + (Math.random() * 16 - 8)) | 0;
    let by = (tc.ty + (Math.random() * 16 - 8)) | 0;
    if (canPlaceBuilding(type, bx, by)) {
      payCost(ai, BLDG[type].cost);
      let nb = createBuilding(ai, type, bx, by);
      let vill = ai.units.find(u => u.type === 'villager' && (u.state === 'idle' || u.state === 'gathering'));
      if (vill) { vill.buildTarget = nb; vill.gatherTarget = null; }
      else { nb.buildProgress = 0.5; }
      return;
    }
  }
}

// ===== HUD DOM UPDATES =====
function updateHUD() {
  if (!players[0]) return;
  const p = players[0];
  if (scoreEl) scoreEl.textContent = score;
  if (killEl)  killEl.textContent = p.kills;
  if (builtEl) builtEl.textContent = p.built;
  if (foodEl)  foodEl.textContent = Math.floor(p.food);
  if (woodEl)  woodEl.textContent = Math.floor(p.wood);
  if (goldEl)  goldEl.textContent = Math.floor(p.gold);
  if (popEl)   popEl.textContent = p.pop + '/' + p.maxPop;
  if (ageEl)   ageEl.textContent = AGES[p.age] + ' Age';

  let remaining = Math.max(0, MAX_TIME - gameTime);
  let min = Math.floor(remaining / 60);
  let sec = Math.floor(remaining % 60);
  if (timerEl) timerEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;

  const ageBtn = document.getElementById('ageUpBtn');
  if (ageBtn) {
    if (p.age >= 2) {
      ageBtn.classList.add('disabled');
      ageBtn.innerHTML = 'Max Age';
    } else {
      const cost = AGE_COST[p.age + 1];
      let costStr = 'F' + cost.food;
      if (cost.gold) costStr += ' G' + cost.gold;
      ageBtn.querySelector('.cost').textContent = costStr;
      ageBtn.classList.toggle('disabled', !canAfford(p, cost));
    }
  }
}

function updateSelectionInfo() {
  const el = selTextEl;
  if (!el) return;
  if (selected.length > 0) {
    let units = selected.map(i => players[0].units[i]).filter(u => u);
    if (units.length === 1) {
      const u = units[0];
      const def = UNIT[u.type];
      el.innerHTML = `<b style="color:${def.color}">${def.name}</b><br>HP: ${Math.ceil(u.hp)}/${u.maxHp}<br>ATK: ${def.atk} | RNG: ${def.range}<br>State: ${u.state}${u.carrying > 0 ? '<br>Carry: ' + Math.floor(u.carrying) + ' ' + u.carryType : ''}`;
    } else {
      let counts = {};
      for (const u of units) { counts[u.type] = (counts[u.type] || 0) + 1; }
      let str = Object.entries(counts).map(([t, c]) => c + 'x ' + UNIT[t].name).join('<br>');
      el.innerHTML = `<b>${units.length} units</b><br>${str}`;
    }
  } else if (selectedBuilding !== null && players[0].buildings[selectedBuilding]) {
    const b = players[0].buildings[selectedBuilding];
    const def = BLDG[b.type];
    let qStr = b.queue.length > 0 ? '<br>Queue: ' + b.queue.map(t => UNIT[t].symbol).join(',') : '';
    el.innerHTML = `<b style="color:${def.color}">${def.name}</b><br>HP: ${Math.ceil(b.hp)}/${b.maxHp}${!b.built ? '<br>Building: ' + Math.floor(b.buildProgress * 100) + '%' : ''}${qStr}`;
  } else {
    el.innerHTML = 'Click units/buildings<br>RClick to move/attack';
  }
}

function updateBuildButtons() {
  const panel = document.getElementById('buildButtons');
  if (!panel || !players[0]) return;
  const p = players[0];
  let html = '';
  for (const [key, def] of Object.entries(BLDG)) {
    if (key === 'townCenter') continue;
    const canBuild = p.age >= def.age;
    const afford = canAfford(p, def.cost);
    let costStr = [];
    if (def.cost.food) costStr.push('F' + def.cost.food);
    if (def.cost.wood) costStr.push('W' + def.cost.wood);
    if (def.cost.gold) costStr.push('G' + def.cost.gold);
    const ageLabel = !canBuild ? ' [' + AGES[def.age] + ']' : '';
    html += `<button class="btn ${(!canBuild || !afford) ? 'disabled' : ''}" onclick="window._kcSetBuild('${key}')"${!canBuild ? ' title="Need ' + AGES[def.age] + ' Age"' : ''}>${def.name}<br><span class="cost">${costStr.join(' ')}${ageLabel}</span></button>`;
  }
  panel.innerHTML = html;
}

function updateTrainButtons() {
  const panel = document.getElementById('trainButtons');
  if (!panel || !players[0]) return;
  const p = players[0];
  let html = '';
  const trainTypes = ['militia', 'swordsman', 'archer', 'knight'];
  const hotkeys = ['1', '2', '3', '4'];
  for (let i = 0; i < trainTypes.length; i++) {
    const type = trainTypes[i];
    const def = UNIT[type];
    const canTrain = p.age >= def.age;
    const hasBldg = p.buildings.some(b => b.type === def.trainAt && b.built);
    const afford = canAfford(p, def.cost);
    let costStr = [];
    if (def.cost.food) costStr.push('F' + def.cost.food);
    if (def.cost.gold) costStr.push('G' + def.cost.gold);
    const ageLabel = !canTrain ? ' [' + AGES[def.age] + ']' : '';
    html += `<button class="btn ${(!canTrain || !hasBldg || !afford) ? 'disabled' : ''}" onclick="window._kcTrain('${type}')">${def.name} [${hotkeys[i]}]<br><span class="cost">${costStr.join(' ')}${ageLabel}</span></button>`;
  }
  panel.innerHTML = html;
}

// ===== RENDERING =====
function drawBuildingR(renderer, text, b, playerId) {
  const def = BLDG[b.type];
  let px = b.tx * TILE - camera.x;
  let py = b.ty * TILE - camera.y;
  let w = def.w * TILE, h = def.h * TILE;
  if (px + w < 0 || px > CW || py + h < 0 || py > CH) return;

  let baseColor = playerId === 0 ? def.color : shiftColor(def.color, playerId);

  if (!b.built) {
    let builtH = h * b.buildProgress;
    // semi-transparent fill for construction progress
    renderer.fillRect(px, py + h - builtH, w, builtH, baseColor + '66');
    renderer.strokePoly([
      { x: px, y: py }, { x: px + w, y: py },
      { x: px + w, y: py + h }, { x: px, y: py + h }
    ], '#888', 1, true);
    text.drawText(Math.floor(b.buildProgress * 100) + '%', px + w / 2, py + h / 2 - 6, 9, '#aaa', 'center');
  } else {
    renderer.fillRect(px + 2, py + 2, w - 4, h - 4, baseColor);
    renderer.strokePoly([
      { x: px + 1, y: py + 1 }, { x: px + w - 1, y: py + 1 },
      { x: px + w - 1, y: py + h - 1 }, { x: px + 1, y: py + h - 1 }
    ], playerId === 0 ? '#da4' : '#f44', 1.5, true);
    text.drawText(def.symbol, px + w / 2, py + h / 2 - 6, 11, '#fff', 'center');
    if (b.type === 'townCenter') {
      // Flag pole + banner
      let fc = playerId === 0 ? '#48f' : '#f44';
      renderer.fillRect(px + w / 2 - 2, py + 2, 4, 10, fc);
      renderer.fillRect(px + w / 2 + 2, py + 2, 8, 6, fc);
    }
  }

  // HP bar
  if (b.hp < b.maxHp) {
    let hpPct = b.hp / b.maxHp;
    renderer.fillRect(px, py - 5, w, 3, '#300');
    renderer.fillRect(px, py - 5, w * hpPct, 3, hpColor(hpPct));
  }

  // Queue indicator
  if (b.queue && b.queue.length > 0 && playerId === 0) {
    text.drawText('Q:' + b.queue.length, px + 1, py + h + 1, 8, '#da4', 'left');
  }

  // Selected building highlight
  if (playerId === 0 && selectedBuilding !== null && players[0].buildings[selectedBuilding] === b) {
    renderer.strokePoly([
      { x: px - 2, y: py - 2 }, { x: px + w + 2, y: py - 2 },
      { x: px + w + 2, y: py + h + 2 }, { x: px - 2, y: py + h + 2 }
    ], '#4f4', 2, true);
  }
}

function drawUnitR(renderer, text, u, playerId, isSelected) {
  let px = u.x - camera.x, py = u.y - camera.y;
  if (px < -TILE || px > CW + TILE || py < -TILE || py > CH + TILE) return;

  const def = UNIT[u.type];
  let r = TILE * 0.4;

  // Shadow (ellipse approximated as flat oval — use a stretched circle as a rect with alpha)
  renderer.fillCircle(px, py + r * 0.5, r * 0.8, 'rgba(0,0,0,0.3)');

  // Body
  let color = playerId === 0 ? def.color : shiftColor(def.color, playerId);
  renderer.setGlow(color, 0.4);
  renderer.fillCircle(px, py, r, color);
  renderer.setGlow(null);

  // Team outline ring
  renderer.strokePoly(circlePoints(px, py, r, 12), playerId === 0 ? '#48f' : '#f44', 1.5, true);

  // Symbol
  text.drawText(def.symbol, px, py - 5, 10, '#fff', 'center');

  // HP bar
  let hpPct = u.hp / u.maxHp;
  if (hpPct < 1) {
    renderer.fillRect(px - r, py - r - 5, r * 2, 3, '#300');
    renderer.fillRect(px - r, py - r - 5, r * 2 * hpPct, 3, hpColor(hpPct));
  }

  // Carrying indicator dot
  if (u.carrying > 0) {
    let cc = u.carryType === 'food' ? '#6c6' : u.carryType === 'wood' ? '#a86' : '#dd4';
    renderer.fillCircle(px + r, py - r, 3, cc);
  }

  // Selection ring
  if (isSelected) {
    renderer.strokePoly(circlePoints(px, py, r + 4, 12), '#4f4', 2, true);
  }

  // Attacking ring
  if (u.state === 'attacking') {
    renderer.strokePoly(circlePoints(px, py, r + 6, 12), '#f44', 1, true);
  }
}

function circlePoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function renderMinimap(renderer, text) {
  // Minimap canvas element: 168 x 112, positioned outside main canvas
  // We render it via its own 2d context (separate element)
  const mc = document.getElementById('minimap');
  if (!mc) return;
  const mCtx = mc.getContext('2d');
  if (!mCtx) return;
  mCtx.fillStyle = '#111';
  mCtx.fillRect(0, 0, 168, 112);
  const sx = 168 / MAP_W, sy = 112 / MAP_H;

  for (let ty = 0; ty < TILES_Y; ty += 2) {
    for (let tx = 0; tx < TILES_X; tx += 2) {
      let t = tiles[ty][tx];
      let px = tx * TILE * sx, py = ty * TILE * sy;
      if (t === 1) mCtx.fillStyle = '#1a4a1a';
      else if (t === 2) mCtx.fillStyle = '#8a7a2a';
      else if (t === 4) mCtx.fillStyle = '#1a2a4a';
      else if (t >= 10) mCtx.fillStyle = t === 10 ? '#336' : '#633';
      else continue;
      mCtx.fillRect(px, py, TILE * 2 * sx + 1, TILE * 2 * sy + 1);
    }
  }
  for (const p of players) {
    mCtx.fillStyle = p.id === 0 ? '#48f' : '#f44';
    for (const b of p.buildings) {
      mCtx.fillRect(b.tx * TILE * sx, b.ty * TILE * sy, BLDG[b.type].w * TILE * sx + 1, BLDG[b.type].h * TILE * sy + 1);
    }
  }
  for (const p of players) {
    mCtx.fillStyle = p.id === 0 ? '#8bf' : '#f88';
    for (const u of p.units) {
      mCtx.fillRect(u.x * sx - 1, u.y * sy - 1, 2, 2);
    }
  }
  mCtx.strokeStyle = '#da4';
  mCtx.lineWidth = 1;
  mCtx.strokeRect(camera.x * sx, camera.y * sy, CW * sx, CH * sy);
}

// ===== INPUT PROCESSING =====
function processMouseEvent(e, game) {
  if (e.type === 'mousemove') {
    mouse.x = e.x;
    mouse.y = e.y;
    mouse.worldX = e.x + camera.x;
    mouse.worldY = e.y + camera.y;
    const edgeSize = 30;
    scrollEdge.x = e.x < edgeSize ? -1 : e.x > CW - edgeSize ? 1 : 0;
    scrollEdge.y = e.y < edgeSize ? -1 : e.y > CH - edgeSize ? 1 : 0;
    return;
  }

  if (gameState !== 'playing') return;

  if (e.type === 'minimap') {
    camera.x = (e.x / 168) * MAP_W - CW / 2;
    camera.y = (e.y / 112) * MAP_H - CH / 2;
    clampCamera();
    return;
  }

  if (e.type === 'mousedown' && e.button === 0) {
    if (buildMode) {
      let tx = mouse.worldX / TILE | 0;
      let ty = mouse.worldY / TILE | 0;
      const def = BLDG[buildMode];
      if (canPlaceBuilding(buildMode, tx, ty) && canAfford(players[0], def.cost) && players[0].age >= def.age) {
        payCost(players[0], def.cost);
        let nb = createBuilding(players[0], buildMode, tx, ty);
        for (const idx of selected) {
          const u = players[0].units[idx];
          if (u && u.type === 'villager') {
            u.buildTarget = nb; u.gatherTarget = null; u.moveTarget = null; u.attackTarget = null;
          }
        }
        if (selected.length === 0) {
          let best = null, bestD = Infinity;
          for (const u of players[0].units) {
            if (u.type === 'villager') {
              let d = distEntities(u, bldgCenter(nb));
              if (d < bestD) { bestD = d; best = u; }
            }
          }
          if (best) { best.buildTarget = nb; best.gatherTarget = null; }
        }
        if (!e.shift) buildMode = null;
        updateBuildButtons();
        updateHUD();
      }
      return;
    }

    dragStart = { x: mouse.worldX, y: mouse.worldY };
    if (!e.shift) { selected = []; selectedBuilding = null; }

    // Check units
    for (let i = 0; i < players[0].units.length; i++) {
      const u = players[0].units[i];
      if (Math.hypot(u.x - mouse.worldX, u.y - mouse.worldY) < TILE * 0.7) {
        if (!selected.includes(i)) selected.push(i);
        updateSelectionInfo();
        return;
      }
    }
    // Check buildings
    for (let i = 0; i < players[0].buildings.length; i++) {
      const b = players[0].buildings[i];
      const bdef = BLDG[b.type];
      if (mouse.worldX >= b.tx * TILE && mouse.worldX < (b.tx + bdef.w) * TILE &&
          mouse.worldY >= b.ty * TILE && mouse.worldY < (b.ty + bdef.h) * TILE) {
        selectedBuilding = i;
        updateSelectionInfo();
        return;
      }
    }
    updateSelectionInfo();
    return;
  }

  if (e.type === 'mouseup' && e.button === 0 && dragStart) {
    let x1 = Math.min(dragStart.x, mouse.worldX), y1 = Math.min(dragStart.y, mouse.worldY);
    let x2 = Math.max(dragStart.x, mouse.worldX), y2 = Math.max(dragStart.y, mouse.worldY);
    if (x2 - x1 > 10 || y2 - y1 > 10) {
      if (!e.shift) selected = [];
      for (let i = 0; i < players[0].units.length; i++) {
        const u = players[0].units[i];
        if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) {
          if (!selected.includes(i)) selected.push(i);
        }
      }
      updateSelectionInfo();
    }
    dragStart = null;
    return;
  }

  if (e.type === 'contextmenu') {
    if (selected.length === 0) return;
    let wx = mouse.worldX, wy = mouse.worldY;
    // Attack enemy unit
    for (const eu of players[1].units) {
      if (Math.hypot(eu.x - wx, eu.y - wy) < TILE) {
        for (const idx of selected) {
          const u = players[0].units[idx];
          if (u) { u.attackTarget = eu; u.moveTarget = null; u.gatherTarget = null; u.buildTarget = null; }
        }
        return;
      }
    }
    // Attack enemy building
    for (const eb of players[1].buildings) {
      const bdef = BLDG[eb.type];
      if (wx >= eb.tx * TILE && wx < (eb.tx + bdef.w) * TILE &&
          wy >= eb.ty * TILE && wy < (eb.ty + bdef.h) * TILE) {
        for (const idx of selected) {
          const u = players[0].units[idx];
          if (u) { u.attackTarget = eb; u.moveTarget = null; u.gatherTarget = null; u.buildTarget = null; }
        }
        return;
      }
    }
    // Gather resource
    let tx = wx / TILE | 0, ty = wy / TILE | 0;
    if (tx >= 0 && tx < TILES_X && ty >= 0 && ty < TILES_Y) {
      let t = tiles[ty][tx];
      if (t === 1 || t === 2) {
        for (const idx of selected) {
          const u = players[0].units[idx];
          if (u && u.type === 'villager') {
            u.gatherTarget = { tx, ty }; u.gatherType = t === 1 ? 'wood' : 'gold';
            u.moveTarget = null; u.attackTarget = null; u.buildTarget = null; u.carrying = 0;
          }
        }
        return;
      }
      // Own farm
      for (const b of players[0].buildings) {
        if (b.type !== 'farm' || !b.built) continue;
        const bdef = BLDG.farm;
        if (wx >= b.tx * TILE && wx < (b.tx + bdef.w) * TILE &&
            wy >= b.ty * TILE && wy < (b.ty + bdef.h) * TILE) {
          for (const idx of selected) {
            const u = players[0].units[idx];
            if (u && u.type === 'villager') {
              u.gatherTarget = b; u.gatherType = 'food';
              u.moveTarget = null; u.attackTarget = null; u.buildTarget = null; u.carrying = 0;
            }
          }
          return;
        }
      }
    }
    // Move
    for (const idx of selected) {
      const u = players[0].units[idx];
      if (u) { u.moveTarget = { x: wx, y: wy }; u.attackTarget = null; u.gatherTarget = null; u.buildTarget = null; }
    }
  }
}

// ===== EXPORT =====
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Cache DOM refs
  scoreEl   = document.getElementById('scoreDisplay');
  timerEl   = document.getElementById('timer');
  killEl    = document.getElementById('killDisplay');
  builtEl   = document.getElementById('builtDisplay');
  foodEl    = document.getElementById('foodDisplay');
  woodEl    = document.getElementById('woodDisplay');
  goldEl    = document.getElementById('goldDisplay');
  popEl     = document.getElementById('popDisplay');
  ageEl     = document.getElementById('ageDisplay');
  selTextEl = document.getElementById('selText');

  // Expose functions for inline onclick handlers
  window._kcSetBuild = (type) => {
    if (gameState !== 'playing') return;
    const p = players[0];
    const def = BLDG[type];
    if (p.age < def.age || !canAfford(p, def.cost)) return;
    buildMode = type;
  };
  window._kcTrain = trainUnit;
  window._kcAgeUp = tryAgeUp;
  window._kcStart = () => {
    initGame();
    gameState = 'playing';
    game.hideOverlay();
    game.setState('playing');
    updateBuildButtons();
    updateTrainButtons();
    updateHUD();
  };

  // Minimap click
  const minimapEl = document.getElementById('minimap');
  if (minimapEl) {
    minimapEl.addEventListener('mousedown', (e) => {
      const rect = minimapEl.getBoundingClientRect();
      pendingMouseEvents.push({ type: 'minimap', x: e.clientX - rect.left, y: e.clientY - rect.top });
    });
  }

  // Main canvas events
  canvasEl.addEventListener('contextmenu', (e) => { e.preventDefault(); });

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    pendingMouseEvents.push({ type: 'mousemove', x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
  });

  canvasEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    pendingMouseEvents.push({ type: 'mousedown', button: e.button, x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, shift: e.shiftKey });
    if (e.button === 2) {
      pendingMouseEvents.push({ type: 'contextmenu', shift: e.shiftKey });
    }
  });

  canvasEl.addEventListener('mouseup', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    pendingMouseEvents.push({ type: 'mouseup', button: e.button, x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, shift: e.shiftKey });
  });

  // ===== GAME LIFECYCLE =====
  game.onInit = () => {
    initGame();
    gameState = 'menu';
    pendingMouseEvents = [];
    dragStart = null;
    scrollEdge = { x: 0, y: 0 };
    game.showOverlay('KINGDOM CLASH', 'Build your kingdom. Train your army. Crush the enemy.');
    game.setState('waiting');
    updateBuildButtons();
    updateTrainButtons();
    updateHUD();
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    const dtSec = dt / 1000;
    const input = game.input;

    // Process queued mouse events
    for (const e of pendingMouseEvents) {
      processMouseEvent(e, game);
    }
    pendingMouseEvents = [];

    // Waiting state: any key or the overlay start button starts the game
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        window._kcStart();
      }
      return;
    }

    // Over state: any key restarts
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        window._kcStart();
      }
      return;
    }

    if (gameState !== 'playing') return;

    // Camera keyboard scroll
    const scrollSpeed = 8;
    if (input.isDown('ArrowLeft'))  camera.x -= scrollSpeed;
    if (input.isDown('ArrowRight')) camera.x += scrollSpeed;
    if (input.isDown('ArrowUp'))    camera.y -= scrollSpeed;
    if (input.isDown('ArrowDown'))  camera.y += scrollSpeed;
    if (scrollEdge.x < 0) camera.x -= scrollSpeed;
    if (scrollEdge.x > 0) camera.x += scrollSpeed;
    if (scrollEdge.y < 0) camera.y -= scrollSpeed;
    if (scrollEdge.y > 0) camera.y += scrollSpeed;
    clampCamera();

    // Hotkeys
    if (input.wasPressed('Escape')) { buildMode = null; selected = []; selectedBuilding = null; }
    if (input.wasPressed('b') || input.wasPressed('B')) { buildMode = buildMode ? null : 'house'; }
    if (input.wasPressed('a') || input.wasPressed('A')) tryAgeUp();
    if (input.wasPressed('v') || input.wasPressed('V')) trainUnit('villager');
    if (input.wasPressed('1')) trainUnit('militia');
    if (input.wasPressed('2')) trainUnit('swordsman');
    if (input.wasPressed('3')) trainUnit('archer');
    if (input.wasPressed('4')) trainUnit('knight');

    gameTime += dtSec;
    tickCount++;

    // Update units & queues
    for (const p of players) {
      for (const u of p.units) updateUnit(u, dtSec);
      updateBuildingQueues(p, dtSec);
      if (p.id === 1) {
        for (const b of p.buildings) {
          if (!b.built) {
            b.buildProgress += dtSec / (b.buildTime * 0.7);
            if (b.buildProgress >= 1) { b.built = true; b.buildProgress = 1; }
          }
        }
      }
    }

    aiUpdate(dtSec);

    score = players[0].kills * 10 + players[0].built * 5;

    // Win/loss check
    let enemyTC = players[1].buildings.find(b => b.type === 'townCenter');
    let playerTC = players[0].buildings.find(b => b.type === 'townCenter');
    if (!enemyTC || enemyTC.hp <= 0) {
      gameState = 'won'; score += 500;
      game.showOverlay('VICTORY!', `Score: ${score} - You destroyed the enemy kingdom! [Space] to play again`);
      game.setState('over');
    } else if (!playerTC || playerTC.hp <= 0) {
      gameState = 'lost';
      game.showOverlay('DEFEAT', `Score: ${score} - Your Town Center was destroyed! [Space] to play again`);
      game.setState('over');
    } else if (gameTime >= MAX_TIME) {
      let aiScore = players[1].kills * 10 + players[1].built * 5;
      if (score >= aiScore) {
        gameState = 'won'; score += 200;
        game.showOverlay('VICTORY!', `Score: ${score} - Time up - you had the higher score! [Space] to play again`);
      } else {
        gameState = 'lost';
        game.showOverlay('DEFEAT', `Score: ${score} - Time up - the AI had a higher score. [Space] to play again`);
      }
      game.setState('over');
    }

    // Periodic DOM updates
    if (tickCount % 10 === 0) {
      updateHUD();
      updateSelectionInfo();
      updateBuildButtons();
      updateTrainButtons();
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, CW, CH, '#111');

    // ── Tile rendering ──
    let startTX = Math.max(0, camera.x / TILE | 0);
    let startTY = Math.max(0, camera.y / TILE | 0);
    let endTX = Math.min(TILES_X, ((camera.x + CW) / TILE | 0) + 1);
    let endTY = Math.min(TILES_Y, ((camera.y + CH) / TILE | 0) + 1);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        let px = tx * TILE - camera.x;
        let py = ty * TILE - camera.y;
        let t = tiles[ty][tx];
        let col = (t >= 10) ? '#2a4a1a' : (TILE_COLORS[t] || '#2a4a1a');
        renderer.fillRect(px, py, TILE, TILE, col);

        if (t === 1) {
          // Tree: dark base circle + lighter top
          renderer.fillCircle(px + TILE / 2, py + TILE / 2, TILE * 0.35, '#0a3a0a');
          renderer.fillCircle(px + TILE / 2, py + TILE / 2 - 3, TILE * 0.3, '#2a6a2a');
        }
        if (t === 2) {
          // Gold deposit
          renderer.setGlow('#dd4', 0.5);
          renderer.fillCircle(px + TILE / 2, py + TILE / 2, TILE * 0.3, '#cc3');
          renderer.setGlow(null);
          text.drawText('$', px + TILE / 2, py + TILE / 2 - 6, 10, '#fa4', 'center');
        }
        if (t === 4) {
          // Water overlay
          renderer.fillRect(px, py, TILE, TILE, 'rgba(30,60,120,0.3)');
        }
      }
    }

    // Grid lines (subtle)
    for (let tx = startTX; tx <= endTX; tx++) {
      let px = tx * TILE - camera.x;
      renderer.drawLine(px, 0, px, CH, 'rgba(255,255,255,0.03)', 0.5);
    }
    for (let ty = startTY; ty <= endTY; ty++) {
      let py = ty * TILE - camera.y;
      renderer.drawLine(0, py, CW, py, 'rgba(255,255,255,0.03)', 0.5);
    }

    // Buildings
    for (const p of players) {
      for (const b of p.buildings) {
        drawBuildingR(renderer, text, b, p.id);
      }
    }

    // Units
    for (const p of players) {
      for (let i = 0; i < p.units.length; i++) {
        drawUnitR(renderer, text, p.units[i], p.id, p.id === 0 && selected.includes(i));
      }
    }

    // Build mode ghost
    if (buildMode && gameState === 'playing') {
      const def = BLDG[buildMode];
      let tx = mouse.worldX / TILE | 0;
      let ty = mouse.worldY / TILE | 0;
      let px = tx * TILE - camera.x;
      let py = ty * TILE - camera.y;
      let valid = canPlaceBuilding(buildMode, tx, ty);
      renderer.fillRect(px, py, def.w * TILE, def.h * TILE, valid ? 'rgba(68,170,68,0.5)' : 'rgba(170,68,68,0.5)');
      renderer.strokePoly([
        { x: px, y: py }, { x: px + def.w * TILE, y: py },
        { x: px + def.w * TILE, y: py + def.h * TILE }, { x: px, y: py + def.h * TILE }
      ], valid ? '#6f6' : '#f66', 2, true);
      text.drawText(def.name, px + (def.w * TILE) / 2, py + (def.h * TILE) / 2 - 6, 10, '#fff', 'center');
    }

    // Selection drag box
    if (dragStart && gameState === 'playing') {
      let x1 = dragStart.x - camera.x, y1 = dragStart.y - camera.y;
      let x2 = mouse.x, y2 = mouse.y;
      let bx = Math.min(x1, x2), by = Math.min(y1, y2);
      let bw = Math.abs(x2 - x1), bh = Math.abs(y2 - y1);
      renderer.strokePoly([
        { x: bx, y: by }, { x: bx + bw, y: by },
        { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }
      ], '#da4', 1, true);
    }

    // Render minimap via 2d canvas context
    renderMinimap(renderer, text);
  };

  game.start();
  return game;
}
