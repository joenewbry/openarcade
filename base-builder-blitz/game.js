// base-builder-blitz/game.js — WebGL 2 engine port

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// --- CONSTANTS ---
const TILE = 20;
const MAP_W = 60;
const MAP_H = 20;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const ROUND_TIME = 300;
const GATHER_RATE = 1.2;
const BASE_INCOME = 0.6;

// Building definitions
const BLDG = {
  base:     { w: 3, h: 3, hp: 100, cost: 0,  name: 'HQ' },
  barracks: { w: 2, h: 2, hp: 60,  cost: 80, name: 'Barracks' },
  tower:    { w: 1, h: 2, hp: 40,  cost: 60, name: 'Tower', range: 85, dmg: 7, fireRate: 1.2 },
  wall:     { w: 1, h: 1, hp: 100, cost: 30, name: 'Wall' },
  mine:     { w: 2, h: 1, hp: 30,  cost: 50, name: 'Mine' }
};

// Unit definitions
const UDEF = {
  worker:  { hp: 20, spd: 35, atk: 3,  range: 14, atkSpd: 1.0, cost: 0,  r: 4 },
  soldier: { hp: 45, spd: 42, atk: 9,  range: 14, atkSpd: 0.8, cost: 40, r: 5 },
  archer:  { hp: 28, spd: 36, atk: 7,  range: 85, atkSpd: 1.2, cost: 50, r: 4 },
  knight:  { hp: 80, spd: 32, atk: 15, range: 16, atkSpd: 1.0, cost: 80, r: 6 }
};

// Player colors
const P_COL  = ['#4af', '#f66'];
const P_GLOW = ['rgba(68,170,255,0.3)', 'rgba(255,102,102,0.3)'];
const P_BG   = ['#4af00a', '#f6600a']; // used as alpha-encoded fills below

// --- MODULE STATE ---
let score = 0;
let camera = { x: 0, y: 0 };
let keys = {};
let mouse = { x: 0, y: 0 };
let selectedBldg = null;
let timeLeft = ROUND_TIME;
let players, units, buildings, resources, particles;
let grid;
let aiTimer = 0, aiBuildPhase = 0, aiAttackCd = 0;

// Mouse event queue (processed in onUpdate)
let pendingClicks = [];
let pendingRightClicks = [];
let pendingMouseMoves = [];

// UI DOM refs
let scoreEl, timerEl, pResEl, pHPEl, aResEl, aHPEl;
let pWorkEl, pSolEl, pArcEl, pKniEl;
let aWorkEl, aSolEl, aArcEl, aKniEl;

// === GRID ===
function initGrid() {
  grid = Array.from({ length: MAP_W }, () => new Uint8Array(MAP_H));
}
function setGrid(tx, ty, tw, th, val) {
  for (let x = tx; x < tx + tw; x++)
    for (let y = ty; y < ty + th; y++)
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) grid[x][y] = val;
}
function gridFree(tx, ty, tw, th) {
  for (let x = tx; x < tx + tw; x++)
    for (let y = ty; y < ty + th; y++) {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
      if (grid[x][y]) return false;
    }
  return true;
}

// === FACTORIES ===
function mkPlayer(id) {
  return { id, res: 150, score: 0, bBuilt: 0, uKilled: 0, resGathered: 0 };
}

function mkBuilding(type, tx, ty, owner) {
  const d = BLDG[type];
  setGrid(tx, ty, d.w, d.h, 1);
  return {
    type, tx, ty, owner,
    x: tx * TILE + d.w * TILE / 2,
    y: ty * TILE + d.h * TILE / 2,
    w: d.w * TILE, h: d.h * TILE,
    hp: d.hp, maxHp: d.hp,
    fireCd: 0, queue: [], trainT: 0
  };
}

function mkUnit(type, x, y, owner) {
  const d = UDEF[type];
  return {
    type, x, y, owner,
    hp: d.hp, maxHp: d.hp, spd: d.spd,
    atk: d.atk, range: d.range, atkSpd: d.atkSpd,
    r: d.r, atkCd: 0, target: null,
    gatherNode: null, carrying: 0,
    state: type === 'worker' ? 'gather' : 'attack'
  };
}

function mkResource(x, y, amt) {
  return { x, y, amount: amt, maxAmt: amt, r: 10 };
}

// === INIT ===
function init(game) {
  score = 0;
  timeLeft = ROUND_TIME;
  camera = { x: 0, y: 0 };
  selectedBldg = null;
  units = []; buildings = []; resources = []; particles = [];
  aiBuildPhase = 0; aiTimer = 0; aiAttackCd = 0;
  pendingClicks = [];
  pendingRightClicks = [];
  pendingMouseMoves = [];
  initGrid();
  players = [mkPlayer(0), mkPlayer(1)];

  // Resource nodes
  const nodes = [
    [8,5],[7,14],[10,10],
    [25,4],[28,10],[25,16],[30,7],[32,13],
    [50,5],[51,14],[48,10]
  ];
  for (const [nx, ny] of nodes) {
    resources.push(mkResource(nx * TILE, ny * TILE, 250 + Math.random() * 200));
  }

  // Bases
  buildings.push(mkBuilding('base', 2, 8, 0));
  buildings.push(mkBuilding('base', 55, 8, 1));

  // Starting workers
  for (let i = 0; i < 2; i++) {
    units.push(mkUnit('worker', 5 * TILE + i * 15, 10 * TILE, 0));
    units.push(mkUnit('worker', 54 * TILE - i * 15, 10 * TILE, 1));
  }

  updateUI();
  game.showOverlay('BASE BUILDER BLITZ', 'Build, gather, attack - destroy the enemy base!');
  game.setState('waiting');
}

// === PLACE BUILDING ===
function placeBuilding(type, owner, wx, wy) {
  const d = BLDG[type];
  const p = players[owner];
  if (p.res < d.cost) return false;
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);

  const halfX = MAP_W / 2;
  if (owner === 0 && tx + d.w > halfX) return false;
  if (owner === 1 && tx < halfX) return false;
  if (!gridFree(tx, ty, d.w, d.h)) return false;

  p.res -= d.cost;
  buildings.push(mkBuilding(type, tx, ty, owner));
  p.bBuilt++;

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: tx * TILE + d.w * TILE / 2,
      y: ty * TILE + d.h * TILE / 2,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      life: 0.5, color: '#e94'
    });
  }
  return true;
}

// === TRAIN UNIT ===
function trainUnit(type, owner) {
  const d = UDEF[type];
  const p = players[owner];
  if (p.res < d.cost) return false;
  const barr = buildings.filter(b => b.type === 'barracks' && b.owner === owner && b.hp > 0);
  if (barr.length === 0) return false;
  barr.sort((a, b) => a.queue.length - b.queue.length);
  const bar = barr[0];
  if (bar.queue.length >= 3) return false;
  p.res -= d.cost;
  bar.queue.push(type);
  if (bar.queue.length === 1) bar.trainT = trainTime(type);
  return true;
}

function trainTime(t) {
  return { soldier: 3, archer: 4, knight: 5, worker: 4 }[t] || 3;
}

// === HELPERS ===
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function moveToward(u, tx, ty, dt) {
  const dx = tx - u.x, dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return;
  u.x += (dx / d) * u.spd * dt;
  u.y += (dy / d) * u.spd * dt;
  u.x = Math.max(u.r, Math.min(WORLD_W - u.r, u.x));
  u.y = Math.max(u.r, Math.min(WORLD_H - u.r, u.y));
}

function spawnDeath(x, y, owner) {
  const c = P_COL[owner];
  for (let i = 0; i < 6; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      life: 0.6, color: c
    });
  }
}

// === WORKER ===
function updateWorker(u, dt) {
  if (!u.gatherNode || u.gatherNode.amount <= 0) {
    let best = null, bestD = Infinity;
    for (const r of resources) {
      if (r.amount <= 0) continue;
      const d = dist(u, r);
      const sidePenalty = (u.owner === 0 && r.x > WORLD_W * 0.6) ? 200 :
                          (u.owner === 1 && r.x < WORLD_W * 0.4) ? 200 : 0;
      if (d + sidePenalty < bestD) { best = r; bestD = d + sidePenalty; }
    }
    u.gatherNode = best;
    u.carrying = 0;
  }

  if (u.carrying >= 10) {
    const dropOff = buildings.find(b =>
      (b.type === 'base' || b.type === 'mine') && b.owner === u.owner && b.hp > 0
    );
    if (!dropOff) { u.state = 'attack'; return; }
    if (dist(u, dropOff) < 28) {
      players[u.owner].res += u.carrying;
      players[u.owner].resGathered += u.carrying;
      u.carrying = 0;
    } else {
      moveToward(u, dropOff.x, dropOff.y, dt);
    }
  } else if (u.gatherNode) {
    if (dist(u, u.gatherNode) < 16) {
      const g = GATHER_RATE * dt;
      const actual = Math.min(g, u.gatherNode.amount);
      u.gatherNode.amount -= actual;
      u.carrying += actual;
    } else {
      moveToward(u, u.gatherNode.x, u.gatherNode.y, dt);
    }
  }
}

// === COMBAT ===
function updateCombat(u, dt) {
  let target = null, targetD = Infinity;

  for (const e of units) {
    if (e.owner === u.owner || e.hp <= 0) continue;
    const d = dist(u, e);
    if (d < 250 && d < targetD) { target = e; targetD = d; }
  }

  if (!target) {
    for (const b of buildings) {
      if (b.owner === u.owner || b.hp <= 0) continue;
      const d = dist(u, b);
      if (d < targetD) { target = b; targetD = d; }
    }
  }

  if (!target) return;

  if (targetD <= u.range) {
    if (u.atkCd <= 0) {
      target.hp -= u.atk;
      u.atkCd = u.atkSpd;
      particles.push({
        x: u.x, y: u.y,
        vx: (target.x - u.x) * 2, vy: (target.y - u.y) * 2,
        life: 0.15, color: P_COL[u.owner]
      });
    }
  } else {
    moveToward(u, target.x, target.y, dt);
  }
}

// === AI ===
function updateAI(dt) {
  aiTimer += dt;
  if (aiTimer < 0.8) return;
  aiTimer = 0;

  const ai = players[1];
  const cnt = (type) => buildings.filter(b => b.type === type && b.owner === 1 && b.hp > 0).length;
  const nBarracks = cnt('barracks');
  const nTower = cnt('tower');
  const nMine = cnt('mine');
  const nWall = cnt('wall');
  const combatUnits = units.filter(u => u.owner === 1 && u.type !== 'worker' && u.hp > 0);
  const enemyNear = units.filter(u => u.owner === 0 && u.type !== 'worker' && u.hp > 0 && u.x > WORLD_W * 0.55);
  const underAttack = enemyNear.length > 0;

  if (aiBuildPhase === 0) {
    if (nMine === 0 && ai.res >= BLDG.mine.cost) {
      if (tryAIBuild('mine', [[50,12],[48,14]])) aiBuildPhase = 1;
    } else if (nMine > 0) aiBuildPhase = 1;
  }
  if (aiBuildPhase === 1) {
    if (nBarracks === 0 && ai.res >= BLDG.barracks.cost) {
      if (tryAIBuild('barracks', [[52,5],[53,12]])) aiBuildPhase = 2;
    } else if (nBarracks > 0) aiBuildPhase = 2;
  }
  if (aiBuildPhase === 2) {
    if (nTower === 0 && ai.res >= BLDG.tower.cost) {
      if (tryAIBuild('tower', [[50,9],[49,7],[49,12]])) aiBuildPhase = 3;
    } else if (nTower > 0) aiBuildPhase = 3;
  }
  if (aiBuildPhase === 3) {
    if (nBarracks < 2 && ai.res >= BLDG.barracks.cost) {
      if (tryAIBuild('barracks', [[52,13],[50,5],[54,5]])) aiBuildPhase = 4;
    } else if (nBarracks >= 2) aiBuildPhase = 4;
  }
  if (aiBuildPhase >= 4) {
    if (nTower < 3 && ai.res >= BLDG.tower.cost + 30)
      tryAIBuild('tower', [[48,6],[48,13],[46,9],[47,4],[47,15]]);
    if (nWall < 6 && ai.res >= BLDG.wall.cost + 60)
      tryAIBuild('wall', [[47,8],[47,9],[47,10],[47,11],[47,12],[47,7]]);
    if (nMine < 2 && ai.res >= BLDG.mine.cost + 50)
      tryAIBuild('mine', [[48,16],[52,16],[50,3]]);
    if (nBarracks < 3 && ai.res >= BLDG.barracks.cost + 40 && timeLeft < 200)
      tryAIBuild('barracks', [[50,15],[54,4],[50,2]]);
  }

  if (nBarracks > 0) {
    if (underAttack && ai.res >= UDEF.knight.cost) {
      trainUnit('knight', 1);
    } else if (ai.res >= UDEF.soldier.cost) {
      const r = Math.random();
      if (r < 0.35) trainUnit('soldier', 1);
      else if (r < 0.65 && ai.res >= UDEF.archer.cost) trainUnit('archer', 1);
      else if (ai.res >= UDEF.knight.cost) trainUnit('knight', 1);
      else trainUnit('soldier', 1);
    }
  }

  aiAttackCd += 0.8;
  if (aiAttackCd > 15 && combatUnits.length >= 3) {
    aiAttackCd = 0;
    for (const u of combatUnits) {
      if (u.x > WORLD_W * 0.45) u.x -= 10;
    }
  }
}

function tryAIBuild(type, spots) {
  const d = BLDG[type];
  for (const [tx, ty] of spots) {
    if (tx >= MAP_W / 2 && gridFree(tx, ty, d.w, d.h)) {
      const ai = players[1];
      if (ai.res >= d.cost) {
        ai.res -= d.cost;
        buildings.push(mkBuilding(type, tx, ty, 1));
        ai.bBuilt++;
        return true;
      }
    }
  }
  return false;
}

// === UI UPDATE ===
function updateUI() {
  if (!players) return;
  const p = players[0], a = players[1];
  if (pResEl) pResEl.textContent = Math.floor(p.res);
  if (aResEl) aResEl.textContent = Math.floor(a.res);

  const pBase = buildings.find(b => b.type === 'base' && b.owner === 0);
  const aBase = buildings.find(b => b.type === 'base' && b.owner === 1);
  if (pHPEl) pHPEl.textContent = pBase ? Math.ceil(pBase.hp) : 0;
  if (aHPEl) aHPEl.textContent = aBase ? Math.ceil(aBase.hp) : 0;

  score = Math.floor(p.bBuilt * 50 + p.uKilled * 30 + p.resGathered * 0.5);
  if (scoreEl) scoreEl.textContent = score;

  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  if (timerEl) timerEl.textContent = m + ':' + String(s).padStart(2, '0');

  const uc = (owner, type) => units.filter(u => u.owner === owner && u.type === type && u.hp > 0).length;
  if (pWorkEl) pWorkEl.textContent = uc(0, 'worker');
  if (pSolEl)  pSolEl.textContent  = uc(0, 'soldier');
  if (pArcEl)  pArcEl.textContent  = uc(0, 'archer');
  if (pKniEl)  pKniEl.textContent  = uc(0, 'knight');
  if (aWorkEl) aWorkEl.textContent = uc(1, 'worker');
  if (aSolEl)  aSolEl.textContent  = uc(1, 'soldier');
  if (aArcEl)  aArcEl.textContent  = uc(1, 'archer');
  if (aKniEl)  aKniEl.textContent  = uc(1, 'knight');
}

// === END GAME ===
function endGame(reason, game) {
  const p = players[0];
  score = Math.floor(p.bBuilt * 50 + p.uKilled * 30 + p.resGathered * 0.5);
  if (reason === 'win') score += 500;

  const pBase = buildings.find(b => b.type === 'base' && b.owner === 0);
  const aBase = buildings.find(b => b.type === 'base' && b.owner === 1);

  let title, text;
  if (reason === 'win') {
    title = 'VICTORY!';
    text = 'You destroyed the enemy base! Score: ' + score;
  } else if (reason === 'lose') {
    title = 'DEFEATED';
    text = 'Your base was destroyed. Score: ' + score;
  } else {
    const pHP = pBase ? pBase.hp : 0;
    const aHP = aBase ? aBase.hp : 0;
    if (pHP > aHP) {
      score += 200;
      title = 'VICTORY!';
      text = 'You win on HP! (' + Math.ceil(pHP) + ' vs ' + Math.ceil(aHP) + ') Score: ' + score;
    } else if (aHP > pHP) {
      title = 'DEFEATED';
      text = 'AI wins on HP. (' + Math.ceil(pHP) + ' vs ' + Math.ceil(aHP) + ') Score: ' + score;
    } else {
      title = 'DRAW!';
      text = 'Bases tied. Score: ' + score;
    }
  }

  if (scoreEl) scoreEl.textContent = score;
  game.showOverlay(title, text);
  game.setState('over');
}

// === DRAW HELPERS ===
// Approximate circle outline using strokePoly with N segments
function circlePoints(cx, cy, r, segments = 24) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// === DRAW ===
function drawGame(renderer, text) {
  // Background
  renderer.fillRect(0, 0, W, H, '#0a0a1e');

  // ---- World-space rendering (offset by camera) ----
  // We pre-compute camera offset and pass it to every draw call manually

  const cx = camera.x, cy = camera.y;

  // Grid lines (visible range only)
  const startTX = Math.floor(cx / TILE);
  const endTX = Math.ceil((cx + W) / TILE);
  const startTY = Math.floor(cy / TILE);
  const endTY = Math.ceil((cy + H) / TILE);

  for (let x = startTX; x <= endTX; x++) {
    renderer.drawLine(x * TILE - cx, 0, x * TILE - cx, H, '#151530', 0.5);
  }
  for (let y = startTY; y <= endTY; y++) {
    renderer.drawLine(0, y * TILE - cy, W, y * TILE - cy, '#151530', 0.5);
  }

  // Center divider (dashed) — drawn as alternating short lines
  const divX = WORLD_W / 2 - cx;
  if (divX >= 0 && divX <= W) {
    const dashLen = 8, gapLen = 8, cycle = dashLen + gapLen;
    let y = 0;
    while (y < H) {
      const segEnd = Math.min(y + dashLen, H);
      renderer.drawLine(divX, y, divX, segEnd, 'rgba(238,153,68,0.15)', 2);
      y += cycle;
    }
  }

  // Territory backgrounds
  // Player 0: left half (blue tint)
  const p0Right = Math.min(WORLD_W / 2 - cx, W);
  if (p0Right > 0) {
    renderer.fillRect(0, 0, p0Right, H, 'rgba(68,170,255,0.04)');
  }
  // Player 1: right half (red tint)
  const p1Left = Math.max(WORLD_W / 2 - cx, 0);
  if (p1Left < W) {
    renderer.fillRect(p1Left, 0, W - p1Left, H, 'rgba(255,102,102,0.04)');
  }

  // Resources
  for (const r of resources) {
    const rx = r.x - cx, ry = r.y - cy;
    if (rx < -20 || rx > W + 20 || ry < -20 || ry > H + 20) continue;
    const pct = r.amount / r.maxAmt;

    // Outer glow halo
    const haloAlpha = Math.floor((0.08 + pct * 0.15) * 255).toString(16).padStart(2, '0');
    renderer.fillCircle(rx, ry, r.r + 4 + pct * 5, '#ffff44' + haloAlpha);

    // Main crystal body — hsl approximation
    const lightness = Math.floor(30 + pct * 40);
    const saturation = Math.floor(40 + pct * 60);
    // Approximate with yellow-green shades
    const bodyAlpha = 255;
    const bodyCol = pct > 0.7 ? '#cccc00' : pct > 0.4 ? '#999900' : '#555500';
    renderer.fillCircle(rx, ry, 3 + r.r * pct, bodyCol);

    // Diamond crystal on top (rotated square = 4 points)
    const crystalH = 4 * pct + 2;
    renderer.fillPoly([
      { x: rx,     y: ry - crystalH },
      { x: rx + 3, y: ry },
      { x: rx,     y: ry + crystalH },
      { x: rx - 3, y: ry }
    ], '#ffff44');

    // Amount label
    text.drawText(String(Math.floor(r.amount)), rx, ry - r.r - 12, 7, '#cccc44', 'center');
  }

  // Buildings
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    const bx = b.x - b.w / 2 - cx;
    const by = b.y - b.h / 2 - cy;
    if (bx + b.w < -10 || bx > W + 10 || by + b.h < -10 || by > H + 10) continue;

    const col = P_COL[b.owner];
    const hpPct = b.hp / b.maxHp;

    // Main body with glow
    renderer.setGlow(col, 0.5);
    renderer.fillRect(bx, by, b.w, b.h, col);
    renderer.setGlow(null);

    // Inner darker overlay
    renderer.fillRect(bx + 2, by + 2, b.w - 4, b.h - 4, 'rgba(0,0,0,0.3)');

    // Border outline
    renderer.strokePoly([
      { x: bx,       y: by },
      { x: bx + b.w, y: by },
      { x: bx + b.w, y: by + b.h },
      { x: bx,       y: by + b.h }
    ], col, 1, true);

    // Label
    const icons = { base: 'HQ', barracks: 'BK', tower: 'TW', wall: 'W', mine: '$' };
    text.drawText(icons[b.type], b.x - cx, b.y - cy - 5, 9, '#ffffff', 'center');

    // HP bar
    if (hpPct < 1) {
      renderer.fillRect(bx, by - 5, b.w, 3, '#220000');
      const hpCol = hpPct > 0.5 ? '#00cc00' : hpPct > 0.25 ? '#cccc00' : '#cc0000';
      renderer.fillRect(bx, by - 5, b.w * hpPct, 3, hpCol);
    }

    // Train queue progress bar
    if (b.type === 'barracks' && b.queue.length > 0) {
      const pct = 1 - b.trainT / trainTime(b.queue[0]);
      renderer.fillRect(bx, by + b.h + 1, b.w * pct, 2, '#00cc00');
      text.drawText('[' + b.queue.length + ']', b.x - cx, by + b.h + 4, 7, '#cccccc', 'center');
    }

    // Tower range circle
    if (b.type === 'tower') {
      const rangeCol = b.owner === 0 ? 'rgba(68,170,255,0.3)' : 'rgba(255,102,102,0.3)';
      renderer.strokePoly(circlePoints(b.x - cx, b.y - cy, BLDG.tower.range, 32), rangeCol, 1, true);
    }
  }

  // Units
  for (const u of units) {
    if (u.hp <= 0) continue;
    const ux = u.x - cx, uy = u.y - cy;
    if (ux < -20 || ux > W + 20 || uy < -20 || uy > H + 20) continue;

    let col;
    switch (u.type) {
      case 'worker':  col = u.owner === 0 ? '#88ccff' : '#ffcc88'; break;
      case 'soldier': col = u.owner === 0 ? '#4af'    : '#f66';    break;
      case 'archer':  col = u.owner === 0 ? '#4f8'    : '#f84';    break;
      case 'knight':  col = u.owner === 0 ? '#88f'    : '#f44';    break;
    }

    renderer.setGlow(col, 0.3);
    renderer.fillCircle(ux, uy, u.r, col);
    renderer.setGlow(null);

    // Type letter
    const letter = { worker: 'w', soldier: 'S', archer: 'A', knight: 'K' }[u.type];
    text.drawText(letter, ux, uy - 4, 7, '#000000', 'center');

    // HP bar
    const hp = u.hp / u.maxHp;
    if (hp < 1) {
      renderer.fillRect(ux - u.r, uy - u.r - 4, u.r * 2, 2, '#220000');
      renderer.fillRect(ux - u.r, uy - u.r - 4, u.r * 2 * hp, 2, hp > 0.5 ? '#00cc00' : '#cc0000');
    }

    // Worker carry indicator
    if (u.type === 'worker' && u.carrying > 0) {
      text.drawText(String(Math.floor(u.carrying)), ux, uy - u.r - 14, 6, '#ffff44', 'center');
    }
  }

  // Particles
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life * 2));
    const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
    renderer.fillCircle(p.x - cx, p.y - cy, 2, p.color + alphaHex);
  }

  // ---- HUD (screen space) ----

  // Placement ghost
  if (selectedBldg && players) {
    const d = BLDG[selectedBldg];
    const wx = mouse.x + cx;
    const wy = mouse.y + cy;
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const ok = gridFree(tx, ty, d.w, d.h) && tx + d.w <= MAP_W / 2 && players[0].res >= d.cost;
    const ghostAlpha = Math.floor(0.45 * 255).toString(16).padStart(2, '0');
    const ghostCol = ok ? '#00ff00' : '#ff0000';
    renderer.fillRect(tx * TILE - cx, ty * TILE - cy, d.w * TILE, d.h * TILE, ghostCol + ghostAlpha);
  }

  // Bottom menu bar background
  renderer.fillRect(0, H - 34, W, 34, 'rgba(10,10,30,0.88)');
  renderer.drawLine(0, H - 34, W, H - 34, '#ee9944', 1);

  // Building buttons
  const bMenu = [
    { key: '1', type: 'barracks', label: 'Barracks', cost: 80 },
    { key: '2', type: 'tower',    label: 'Tower',    cost: 60 },
    { key: '3', type: 'wall',     label: 'Wall',     cost: 30 },
    { key: '4', type: 'mine',     label: 'Mine',     cost: 50 }
  ];
  for (let i = 0; i < bMenu.length; i++) {
    const mi = bMenu[i];
    const bx = 10 + i * 70;
    const sel = selectedBldg === mi.type;
    const aff = players && players[0].res >= mi.cost;

    renderer.fillRect(bx, H - 30, 64, 26, sel ? 'rgba(238,153,68,0.25)' : 'rgba(25,25,50,0.9)');
    renderer.strokePoly([
      { x: bx,      y: H - 30 },
      { x: bx + 64, y: H - 30 },
      { x: bx + 64, y: H - 4  },
      { x: bx,      y: H - 4  }
    ], sel ? '#ee9944' : (aff ? '#555555' : '#333333'), sel ? 2 : 1, true);

    const labelCol = aff ? '#ee9944' : '#555555';
    const costCol  = aff ? '#ffff44' : '#444444';
    text.drawText('[' + mi.key + ']' + mi.label, bx + 2, H - 29, 8, labelCol, 'left');
    text.drawText(mi.cost + 'G', bx + 2, H - 19, 8, costCol, 'left');
  }

  // Unit train buttons
  const uMenu = [
    { key: 'Q', label: 'Soldier', cost: 40 },
    { key: 'R', label: 'Archer',  cost: 50 },
    { key: 'F', label: 'Knight',  cost: 80 }
  ];
  const hasBarr = buildings.some(b => b.type === 'barracks' && b.owner === 0 && b.hp > 0);
  for (let i = 0; i < uMenu.length; i++) {
    const mi = uMenu[i];
    const ux = 305 + i * 55;
    const aff = players && players[0].res >= mi.cost && hasBarr;

    renderer.fillRect(ux, H - 30, 50, 26, 'rgba(25,25,50,0.9)');
    renderer.strokePoly([
      { x: ux,      y: H - 30 },
      { x: ux + 50, y: H - 30 },
      { x: ux + 50, y: H - 4  },
      { x: ux,      y: H - 4  }
    ], aff ? '#4aaaff' : '#333333', 1, true);

    const labelCol = aff ? '#4aaaff' : '#444444';
    const costCol  = aff ? '#ffff44' : '#444444';
    text.drawText('[' + mi.key + ']' + mi.label.substring(0, 3), ux + 2, H - 29, 8, labelCol, 'left');
    text.drawText(mi.cost + 'G', ux + 2, H - 19, 8, costCol, 'left');
  }

  // Minimap
  drawMinimap(renderer, text);

  // Selected building top-bar label
  if (selectedBldg && players) {
    renderer.fillRect(0, 0, W, 18, 'rgba(10,10,30,0.8)');
    text.drawText(
      'Placing: ' + BLDG[selectedBldg].name + ' (' + BLDG[selectedBldg].cost + 'G) | Right-click/ESC to cancel',
      8, 4, 10, '#ee9944', 'left'
    );
  }
}

function drawMinimap(renderer, text) {
  const mx = W - 135, my = H - 80, mw = 125, mh = 42;

  // Background + border
  renderer.fillRect(mx - 2, my - 2, mw + 4, mh + 4, 'rgba(10,10,30,0.92)');
  renderer.strokePoly([
    { x: mx - 2,      y: my - 2 },
    { x: mx + mw + 2, y: my - 2 },
    { x: mx + mw + 2, y: my + mh + 2 },
    { x: mx - 2,      y: my + mh + 2 }
  ], '#ee9944', 1, true);

  text.drawText('MAP', mx, my - 11, 7, '#ee9944', 'left');

  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;

  // Territory tints
  renderer.fillRect(mx, my, mw / 2, mh, 'rgba(68,170,255,0.08)');
  renderer.fillRect(mx + mw / 2, my, mw / 2, mh, 'rgba(255,102,102,0.08)');

  // Resources
  for (const r of resources) {
    renderer.fillRect(mx + r.x * sx - 1, my + r.y * sy - 1, 2, 2, '#ffff44');
  }

  // Buildings
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    renderer.fillRect(
      mx + (b.x - b.w / 2) * sx,
      my + (b.y - b.h / 2) * sy,
      Math.max(2, b.w * sx),
      Math.max(2, b.h * sy),
      P_COL[b.owner]
    );
  }

  // Units (1px dots)
  for (const u of units) {
    if (u.hp <= 0) continue;
    renderer.fillRect(mx + u.x * sx, my + u.y * sy, 1, 1, u.owner === 0 ? '#88ccff' : '#ffcc88');
  }

  // Viewport rectangle
  renderer.strokePoly([
    { x: mx + camera.x * sx,     y: my + camera.y * sy },
    { x: mx + (camera.x + W) * sx, y: my + camera.y * sy },
    { x: mx + (camera.x + W) * sx, y: my + (camera.y + H) * sy },
    { x: mx + camera.x * sx,     y: my + (camera.y + H) * sy }
  ], '#ffffff', 1, true);
}

// === EXPORT ===
export function createGame() {
  const game = new Game('game');

  // Cache DOM refs
  scoreEl = document.getElementById('score');
  timerEl = document.getElementById('timer');
  pResEl  = document.getElementById('pRes');
  pHPEl   = document.getElementById('pHP');
  aResEl  = document.getElementById('aRes');
  aHPEl   = document.getElementById('aHP');
  pWorkEl = document.getElementById('pWork');
  pSolEl  = document.getElementById('pSol');
  pArcEl  = document.getElementById('pArc');
  pKniEl  = document.getElementById('pKni');
  aWorkEl = document.getElementById('aWork');
  aSolEl  = document.getElementById('aSol');
  aArcEl  = document.getElementById('aArc');
  aKniEl  = document.getElementById('aKni');

  // Canvas mouse listeners (queued and processed in onUpdate)
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    pendingMouseMoves.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  });

  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.button === 2) {
      pendingRightClicks.push({ x, y });
    } else {
      pendingClicks.push({ x, y });
    }
  });

  canvasEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  game.onInit = () => {
    init(game);
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    const dtSec = dt / 1000; // engine uses ms, game logic uses seconds

    // Drain mouse moves
    if (pendingMouseMoves.length > 0) {
      const last = pendingMouseMoves[pendingMouseMoves.length - 1];
      mouse.x = last.x;
      mouse.y = last.y;
      pendingMouseMoves = [];
    }

    // Keyboard camera tracking (update keys map from engine input)
    if (game.state === 'playing') {
      keys['a'] = game.input.isDown('a');
      keys['d'] = game.input.isDown('d');
      keys['w'] = game.input.isDown('w');
      keys['s'] = game.input.isDown('s');
    }

    // Key-press actions
    if (game.input.wasPressed('1') && game.state === 'playing')
      selectedBldg = selectedBldg === 'barracks' ? null : 'barracks';
    if (game.input.wasPressed('2') && game.state === 'playing')
      selectedBldg = selectedBldg === 'tower' ? null : 'tower';
    if (game.input.wasPressed('3') && game.state === 'playing')
      selectedBldg = selectedBldg === 'wall' ? null : 'wall';
    if (game.input.wasPressed('4') && game.state === 'playing')
      selectedBldg = selectedBldg === 'mine' ? null : 'mine';
    if (game.input.wasPressed('Escape') && game.state === 'playing')
      selectedBldg = null;
    if (game.input.wasPressed('q') && game.state === 'playing') trainUnit('soldier', 0);
    if (game.input.wasPressed('r') && game.state === 'playing') trainUnit('archer', 0);
    if (game.input.wasPressed('f') && game.state === 'playing') trainUnit('knight', 0);

    // Any key to start / restart
    if (game.state === 'waiting') {
      // Check any key press
      const anyKey = ['Enter', ' ', 'a', 's', 'd', 'w', '1', '2', '3', '4'];
      for (const k of anyKey) {
        if (game.input.wasPressed(k)) {
          game.setState('playing');
          break;
        }
      }
    }
    if (game.state === 'over') {
      const anyKey = ['Enter', ' ', 'a', 's', 'd', 'w', '1', '2', '3', '4'];
      for (const k of anyKey) {
        if (game.input.wasPressed(k)) {
          init(game);
          break;
        }
      }
    }

    // Process right-clicks
    while (pendingRightClicks.length > 0) {
      pendingRightClicks.shift();
      selectedBldg = null;
    }

    // Process left-clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();

      if (game.state === 'waiting') {
        game.setState('playing');
        continue;
      }
      if (game.state === 'over') {
        init(game);
        continue;
      }
      if (game.state !== 'playing') continue;

      const cx = click.x, cy = click.y;

      // Minimap click
      const mmX = W - 135, mmY = H - 80, mmW = 125, mmH = 42;
      if (cx >= mmX && cx <= mmX + mmW && cy >= mmY && cy <= mmY + mmH) {
        camera.x = Math.max(0, Math.min(WORLD_W - W, ((cx - mmX) / mmW) * WORLD_W - W / 2));
        continue;
      }

      // Build menu clicks (bottom bar)
      if (cy > H - 34) {
        const menuTypes = ['barracks', 'tower', 'wall', 'mine'];
        let handled = false;
        for (let i = 0; i < 4; i++) {
          if (cx >= 10 + i * 70 && cx < 10 + i * 70 + 65) {
            selectedBldg = selectedBldg === menuTypes[i] ? null : menuTypes[i];
            handled = true;
            break;
          }
        }
        if (!handled) {
          const unitTypes = ['soldier', 'archer', 'knight'];
          for (let i = 0; i < 3; i++) {
            if (cx >= 305 + i * 55 && cx < 305 + i * 55 + 50) {
              trainUnit(unitTypes[i], 0);
              break;
            }
          }
        }
        continue;
      }

      // Place building in world
      if (selectedBldg) {
        placeBuilding(selectedBldg, 0, cx + camera.x, cy + camera.y);
      }
    }

    // Game logic update
    if (game.state !== 'playing') return;

    // Timer
    timeLeft -= dtSec;
    if (timeLeft <= 0) { timeLeft = 0; endGame('timeout', game); return; }

    // Camera scroll
    const cs = 250 * dtSec;
    if (keys['a']) camera.x -= cs;
    if (keys['d']) camera.x += cs;
    if (keys['w']) camera.y -= cs;
    if (keys['s']) camera.y += cs;
    camera.x = Math.max(0, Math.min(WORLD_W - W, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - H, camera.y));

    // Passive + mine income
    for (const p of players) p.res += BASE_INCOME * dtSec;
    for (const b of buildings) {
      if (b.type === 'mine' && b.hp > 0) {
        players[b.owner].res += 1.8 * dtSec;
        players[b.owner].resGathered += 1.8 * dtSec;
      }
    }

    // Buildings: training + towers
    for (const b of buildings) {
      if (b.hp <= 0) continue;

      if (b.type === 'barracks' && b.queue.length > 0) {
        b.trainT -= dtSec;
        if (b.trainT <= 0) {
          const utype = b.queue.shift();
          const sx = b.x + (b.owner === 0 ? b.w / 2 + 8 : -b.w / 2 - 8);
          const sy = b.y + (Math.random() - 0.5) * 20;
          units.push(mkUnit(utype, sx, sy, b.owner));
          if (b.queue.length > 0) b.trainT = trainTime(b.queue[0]);
        }
      }

      if (b.type === 'tower') {
        b.fireCd -= dtSec;
        if (b.fireCd <= 0) {
          let best = null, bestD = BLDG.tower.range;
          for (const u of units) {
            if (u.owner !== b.owner && u.hp > 0) {
              const d = dist(b, u);
              if (d < bestD) { best = u; bestD = d; }
            }
          }
          if (best) {
            best.hp -= BLDG.tower.dmg;
            b.fireCd = BLDG.tower.fireRate;
            particles.push({
              x: b.x, y: b.y - 8,
              vx: (best.x - b.x) * 3, vy: (best.y - b.y + 8) * 3,
              life: 0.25, color: P_COL[b.owner]
            });
            if (best.hp <= 0) {
              players[b.owner].uKilled++;
              spawnDeath(best.x, best.y, best.owner);
            }
          }
        }
      }
    }

    // Remove dead buildings
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.hp <= 0) {
        if (b.type === 'base') {
          endGame(b.owner === 0 ? 'lose' : 'win', game);
          return;
        }
        const d = BLDG[b.type];
        setGrid(b.tx, b.ty, d.w, d.h, 0);
        spawnDeath(b.x, b.y, b.owner);
        buildings.splice(i, 1);
      }
    }

    // Update units
    for (const u of units) {
      if (u.hp <= 0) continue;
      u.atkCd -= dtSec;
      if (u.state === 'gather') updateWorker(u, dtSec);
      else updateCombat(u, dtSec);
    }

    // Remove dead units
    for (let i = units.length - 1; i >= 0; i--) {
      if (units[i].hp <= 0) {
        const dead = units[i];
        players[1 - dead.owner].uKilled++;
        spawnDeath(dead.x, dead.y, dead.owner);
        units.splice(i, 1);
      }
    }

    // Remove depleted resources
    resources = resources.filter(r => r.amount > 0);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // AI
    updateAI(dtSec);
    updateUI();
  };

  game.onDraw = (renderer, text) => {
    if (!players) return;
    drawGame(renderer, text);
  };

  game.start();
  return game;
}
