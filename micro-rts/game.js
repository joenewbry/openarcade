// micro-rts/game.js — Micro RTS game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

// === GAME CONSTANTS ===
const MAP_W = 1200, MAP_H = 800;
const CANVAS_W = 600, CANVAS_H = 400;
const TILE = 20;
const MAX_UNITS = 30;
const GAME_TIME = 300; // 5 minutes
const FOG_RADIUS = 120;
const THEME = '#e84';

const UNIT_DEFS = {
  worker:  { hp: 40, speed: 1.5, damage: 5, range: 15, atkSpeed: 1000, cost: 50, buildTime: 60, radius: 6, color: '#4f4' },
  soldier: { hp: 80, speed: 1.8, damage: 15, range: 18, atkSpeed: 700, cost: 75, buildTime: 80, radius: 7, color: '#f44' },
  tank:    { hp: 200, speed: 0.9, damage: 40, range: 60, atkSpeed: 1500, cost: 150, buildTime: 140, radius: 10, color: '#ff4' }
};

const BASE_HP = 500;
const BASE_RADIUS = 24;
const MINERAL_AMT = 500;
const GATHER_AMT = 8;
const GATHER_TIME = 800;
const CARRY_MAX = 40;

// === MODULE-SCOPE STATE ===
let score = 0;
let camera = { x: 0, y: 0 };
let players = [];
let minerals = [];
let units = [];
let projectiles = [];
let fogGrid = [];
let selectedUnits = [];
let selBox = null;
let mousePos = { x: 0, y: 0 };
let gameTimer = GAME_TIME;
let particles = [];
let prodQueue = [];
let aiState = {};
let influenceMap = [];

// Mouse input state (handled via direct canvas listeners)
let mouseDown = false;
let mouseButton = 0;
let dragStart = null;

// Minimap canvas (2D, separate from WebGL canvas)
let minimapCtx = null;

// DOM elements
let scoreEl, resMinEl, resUnitEl, resSupplyEl;
let btnWorker, btnSoldier, btnTank;
let timerEl, selectionInfoEl;

// --- Utility ---
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function spawnParticle(x, y, color, size) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      color,
      size: size * (0.3 + Math.random() * 0.7)
    });
  }
}

function spawnUnit(playerId, type, x, y) {
  const def = UNIT_DEFS[type];
  const playerUnits = units.filter(u => u.playerId === playerId && u.alive);
  if (playerUnits.length >= MAX_UNITS) return null;
  const unit = {
    id: Math.random().toString(36).substr(2, 9),
    playerId, type,
    x, y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    range: def.range,
    atkSpeed: def.atkSpeed,
    radius: def.radius,
    alive: true,
    targetX: null, targetY: null,
    targetUnit: null,
    lastAttack: 0,
    carrying: 0,
    gatherTarget: null,
    gathering: false,
    gatherTimer: 0,
    returning: false,
    selected: false
  };
  units.push(unit);
  return unit;
}

function killUnit(unit, killerPlayerId) {
  unit.alive = false;
  unit.selected = false;
  spawnParticle(unit.x, unit.y, unit.playerId === 0 ? '#4af' : '#f44', 12);
  if (killerPlayerId === 0) players[0].unitsKilled++;
  else players[1].unitsKilled++;
}

// --- Camera ---
function clampCamera() {
  camera.x = Math.max(0, Math.min(MAP_W - CANVAS_W, camera.x));
  camera.y = Math.max(0, Math.min(MAP_H - CANVAS_H, camera.y));
}

function updateCamera() {
  const EDGE = 15, SCROLL_SPEED = 5;
  if (mousePos.x < EDGE) camera.x -= SCROLL_SPEED;
  if (mousePos.x > CANVAS_W - EDGE) camera.x += SCROLL_SPEED;
  if (mousePos.y < EDGE) camera.y -= SCROLL_SPEED;
  if (mousePos.y > CANVAS_H - EDGE) camera.y += SCROLL_SPEED;
  clampCamera();
}

// --- Fog of war ---
function updateFog() {
  const fogW = Math.ceil(MAP_W / TILE);
  const fogH = Math.ceil(MAP_H / TILE);
  for (let y = 0; y < fogH; y++) {
    for (let x = 0; x < fogW; x++) {
      if (fogGrid[y][x] > 0) fogGrid[y][x] = Math.max(0, fogGrid[y][x] - 0.02);
    }
  }
  const reveals = units.filter(u => u.alive && u.playerId === 0).map(u => ({ x: u.x, y: u.y }));
  reveals.push({ x: players[0].baseX, y: players[0].baseY });
  for (const r of reveals) {
    const cr = FOG_RADIUS / TILE;
    const cx = Math.floor(r.x / TILE);
    const cy = Math.floor(r.y / TILE);
    for (let dy = -Math.ceil(cr); dy <= Math.ceil(cr); dy++) {
      for (let dx = -Math.ceil(cr); dx <= Math.ceil(cr); dx++) {
        const fx = cx + dx, fy = cy + dy;
        if (fx >= 0 && fx < fogW && fy >= 0 && fy < fogH) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= cr) fogGrid[fy][fx] = 1;
        }
      }
    }
  }
}

function isVisible(x, y) {
  const fx = Math.floor(x / TILE);
  const fy = Math.floor(y / TILE);
  const fogW = Math.ceil(MAP_W / TILE);
  const fogH = Math.ceil(MAP_H / TILE);
  if (fx < 0 || fx >= fogW || fy < 0 || fy >= fogH) return false;
  return fogGrid[fy][fx] > 0.5;
}

// --- Hit detection ---
function findUnitAt(wx, wy, playerId) {
  let closest = null, closestDist = 20;
  for (const u of units) {
    if (!u.alive || (playerId !== undefined && u.playerId !== playerId)) continue;
    const d = dist(u.x, u.y, wx, wy);
    if (d < closestDist) { closest = u; closestDist = d; }
  }
  return closest;
}

function findEnemyAt(wx, wy) {
  let closest = null, closestDist = 20;
  for (const u of units) {
    if (!u.alive || u.playerId === 0) continue;
    const d = dist(u.x, u.y, wx, wy);
    if (d < closestDist) { closest = u; closestDist = d; }
  }
  const p1 = players[1];
  if (p1.alive && dist(p1.baseX, p1.baseY, wx, wy) < BASE_RADIUS + 10) {
    return { isBase: true, playerId: 1, x: p1.baseX, y: p1.baseY };
  }
  return closest;
}

function findMineralAt(wx, wy) {
  for (const m of minerals) {
    if (m.amount > 0 && dist(m.x, m.y, wx, wy) < 16) return m;
  }
  return null;
}

function issueCommand(wx, wy) {
  if (selectedUnits.length === 0) return;
  const enemy = findEnemyAt(wx, wy);
  const mineral = findMineralAt(wx, wy);
  for (const u of selectedUnits) {
    if (!u.alive || u.playerId !== 0) continue;
    if (enemy) {
      u.targetUnit = enemy;
      u.targetX = null; u.targetY = null;
      u.gathering = false; u.gatherTarget = null; u.returning = false;
    } else if (mineral && u.type === 'worker') {
      u.gatherTarget = mineral;
      u.gathering = false;
      u.returning = false;
      u.targetUnit = null;
      u.targetX = mineral.x; u.targetY = mineral.y;
    } else {
      u.targetX = wx; u.targetY = wy;
      u.targetUnit = null;
      u.gathering = false; u.gatherTarget = null; u.returning = false;
    }
  }
  spawnParticle(wx, wy, '#4af', 15);
}

// --- Production ---
function produceUnit(type) {
  const p = players[0];
  const def = UNIT_DEFS[type];
  const playerUnits = units.filter(u => u.playerId === 0 && u.alive);
  if (p.minerals < def.cost || playerUnits.length >= MAX_UNITS) return;
  if (prodQueue.length >= 5) return;
  p.minerals -= def.cost;
  prodQueue.push({ type, timer: def.buildTime, maxTimer: def.buildTime });
}

function updateProduction() {
  if (prodQueue.length > 0 && players[0].alive) {
    prodQueue[0].timer--;
    if (prodQueue[0].timer <= 0) {
      const type = prodQueue[0].type;
      const angle = Math.random() * Math.PI * 2;
      spawnUnit(0, type, players[0].baseX + Math.cos(angle) * 35, players[0].baseY + Math.sin(angle) * 35);
      prodQueue.shift();
    }
  }
}

// --- Influence map ---
function updateInfluenceMap() {
  const infW = Math.ceil(MAP_W / 40);
  const infH = Math.ceil(MAP_H / 40);
  for (let y = 0; y < infH; y++)
    for (let x = 0; x < infW; x++)
      influenceMap[y][x] = 0;
  for (const u of units) {
    if (!u.alive) continue;
    const ix = Math.floor(u.x / 40);
    const iy = Math.floor(u.y / 40);
    const val = u.playerId === 0 ? -1 : 1;
    const str = u.type === 'tank' ? 3 : u.type === 'soldier' ? 2 : 0.5;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const fx = ix + dx, fy = iy + dy;
        if (fx >= 0 && fx < infW && fy >= 0 && fy < infH) {
          const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          influenceMap[fy][fx] += val * str / d;
        }
      }
    }
  }
}

// --- AI ---
function updateAI(dt) {
  const ai = players[1];
  if (!ai.alive) return;

  const aiUnits = units.filter(u => u.alive && u.playerId === 1);
  const aiWorkers = aiUnits.filter(u => u.type === 'worker');
  const aiArmy = aiUnits.filter(u => u.type !== 'worker');
  const playerUnits = units.filter(u => u.alive && u.playerId === 0);

  updateInfluenceMap();

  const elapsed = GAME_TIME - gameTimer;
  if (elapsed < 60) aiState.phase = 'eco';
  else if (elapsed < 120) aiState.phase = 'build';
  else aiState.phase = 'attack';

  if (playerUnits.some(u => dist(u.x, u.y, ai.baseX, ai.baseY) < 200)) {
    aiState.phase = 'defend';
  }

  // Production
  if (ai.prodTimer > 0) {
    ai.prodTimer--;
    if (ai.prodTimer <= 0 && ai.prodType) {
      const angle = Math.random() * Math.PI * 2;
      spawnUnit(1, ai.prodType, ai.baseX + Math.cos(angle) * 35, ai.baseY + Math.sin(angle) * 35);
      ai.prodType = null;
    }
  } else {
    if (aiUnits.length < MAX_UNITS) {
      let buildType = null;
      if (aiState.phase === 'eco') {
        if (aiWorkers.length < 5) buildType = 'worker';
        else if (aiArmy.length < 2) buildType = 'soldier';
        else buildType = 'worker';
      } else if (aiState.phase === 'build') {
        if (aiWorkers.length < 4) buildType = 'worker';
        else if (ai.minerals >= 150 && aiArmy.length > 3 && Math.random() < 0.3) buildType = 'tank';
        else buildType = 'soldier';
      } else {
        if (aiWorkers.length < 3) buildType = 'worker';
        else if (ai.minerals >= 150 && Math.random() < 0.35) buildType = 'tank';
        else buildType = 'soldier';
      }
      if (buildType && ai.minerals >= UNIT_DEFS[buildType].cost) {
        ai.minerals -= UNIT_DEFS[buildType].cost;
        ai.prodTimer = UNIT_DEFS[buildType].buildTime;
        ai.prodType = buildType;
      }
    }
  }

  // Command workers
  for (const w of aiWorkers) {
    if (w.targetUnit || (w.gatherTarget && w.gatherTarget.amount > 0) || w.returning) continue;
    let nearestMineral = null, nearestDist = Infinity;
    for (const m of minerals) {
      if (m.amount <= 0) continue;
      const d = dist(w.x, w.y, m.x, m.y);
      if (d < nearestDist) { nearestDist = d; nearestMineral = m; }
    }
    if (nearestMineral) {
      w.gatherTarget = nearestMineral;
      w.targetX = nearestMineral.x;
      w.targetY = nearestMineral.y;
      w.gathering = false;
      w.returning = false;
    }
  }

  // Command army
  aiState.attackTimer += dt;

  if (aiState.phase === 'defend') {
    const threats = playerUnits.filter(u => dist(u.x, u.y, ai.baseX, ai.baseY) < 250);
    for (const a of aiArmy) {
      if (threats.length > 0) {
        let nearest = threats[0], nd = Infinity;
        for (const t of threats) {
          const d = dist(a.x, a.y, t.x, t.y);
          if (d < nd) { nd = d; nearest = t; }
        }
        a.targetUnit = nearest;
      }
    }
  } else if (aiState.phase === 'attack' && aiArmy.length >= 4) {
    if (aiState.attackTimer > 3) {
      aiState.attackTimer = 0;
      for (const a of aiArmy) {
        let nearestEnemy = null, nd = Infinity;
        for (const pu of playerUnits) {
          const d = dist(a.x, a.y, pu.x, pu.y);
          if (d < nd && d < 200) { nd = d; nearestEnemy = pu; }
        }
        if (nearestEnemy) {
          a.targetUnit = nearestEnemy;
        } else {
          a.targetX = players[0].baseX;
          a.targetY = players[0].baseY;
          a.targetUnit = null;
        }
      }
    }
  } else {
    if (aiState.attackTimer > 5) {
      aiState.attackTimer = 0;
      for (const a of aiArmy) {
        if (!a.targetUnit) {
          a.targetX = ai.baseX + (Math.random() - 0.5) * 100 - 80;
          a.targetY = ai.baseY + (Math.random() - 0.5) * 100;
        }
      }
    }
  }

  // Auto-attack
  for (const a of aiArmy) {
    if (a.targetUnit && a.targetUnit.alive) continue;
    a.targetUnit = null;
    let nearestEnemy = null, nd = Infinity;
    for (const pu of playerUnits) {
      const d = dist(a.x, a.y, pu.x, pu.y);
      if (d < 150 && d < nd) { nd = d; nearestEnemy = pu; }
    }
    if (nearestEnemy) a.targetUnit = nearestEnemy;
  }
}

// --- Unit movement & combat ---
function moveToward(u, tx, ty) {
  const dx = tx - u.x;
  const dy = ty - u.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return;

  const mx = (dx / d) * u.speed;
  const my = (dy / d) * u.speed;
  let nx = u.x + mx;
  let ny = u.y + my;

  for (const other of units) {
    if (other === u || !other.alive) continue;
    const od = dist(nx, ny, other.x, other.y);
    const minD = u.radius + other.radius;
    if (od < minD && od > 0) {
      const push = (minD - od) * 0.3;
      nx += ((nx - other.x) / od) * push;
      ny += ((ny - other.y) / od) * push;
    }
  }

  nx = Math.max(u.radius, Math.min(MAP_W - u.radius, nx));
  ny = Math.max(u.radius, Math.min(MAP_H - u.radius, ny));
  u.x = nx;
  u.y = ny;
}

function updateUnits(dt, now) {
  for (const u of units) {
    if (!u.alive) continue;

    if (u.targetUnit && !u.targetUnit.alive && !u.targetUnit.isBase) {
      u.targetUnit = null;
    }

    // Worker gathering
    if (u.type === 'worker') {
      if (u.returning && u.carrying > 0) {
        const base = players[u.playerId];
        const bd = dist(u.x, u.y, base.baseX, base.baseY);
        if (bd < BASE_RADIUS + 10) {
          base.minerals += u.carrying;
          if (u.playerId === 0) players[0].resourcesGathered += u.carrying;
          else players[1].resourcesGathered += u.carrying;
          u.carrying = 0;
          u.returning = false;
          if (u.gatherTarget && u.gatherTarget.amount > 0) {
            u.targetX = u.gatherTarget.x;
            u.targetY = u.gatherTarget.y;
          } else {
            u.gatherTarget = null;
          }
        } else {
          u.targetX = base.baseX;
          u.targetY = base.baseY;
        }
        u.targetUnit = null;
      }

      if (u.gatherTarget && !u.returning && u.carrying < CARRY_MAX) {
        const md = dist(u.x, u.y, u.gatherTarget.x, u.gatherTarget.y);
        if (md < 18) {
          u.gathering = true;
          u.gatherTimer += dt * 1000;
          if (u.gatherTimer >= GATHER_TIME) {
            u.gatherTimer = 0;
            const amt = Math.min(GATHER_AMT, u.gatherTarget.amount, CARRY_MAX - u.carrying);
            u.carrying += amt;
            u.gatherTarget.amount -= amt;
            if (u.carrying >= CARRY_MAX || u.gatherTarget.amount <= 0) {
              u.returning = true;
              u.gathering = false;
              if (u.gatherTarget.amount <= 0) u.gatherTarget = null;
            }
          }
          continue;
        } else {
          u.gathering = false;
        }
      }
    }

    // Attack target
    if (u.targetUnit) {
      const target = u.targetUnit;
      const tx = target.x;
      const ty = target.y;
      const td = dist(u.x, u.y, tx, ty);

      if (td <= u.range + (target.isBase ? BASE_RADIUS : (target.radius || 8))) {
        if (now - u.lastAttack >= u.atkSpeed) {
          u.lastAttack = now;
          if (target.isBase) {
            const base = players[target.playerId];
            base.baseHp -= u.damage;
            spawnParticle(tx, ty, '#f84', 8);
            if (base.baseHp <= 0) {
              base.alive = false;
              base.baseHp = 0;
            }
          } else if (target.alive) {
            if (u.type === 'tank') {
              projectiles.push({
                x: u.x, y: u.y,
                tx: target.x, ty: target.y,
                target: target,
                damage: u.damage,
                playerId: u.playerId,
                speed: 5,
                life: 60
              });
            } else {
              target.hp -= u.damage;
              spawnParticle(target.x, target.y, '#f44', 5);
              if (target.hp <= 0) killUnit(target, u.playerId);
            }
          }
        }
      } else {
        moveToward(u, tx, ty);
      }
    } else if (u.targetX !== null && u.targetY !== null) {
      const td = dist(u.x, u.y, u.targetX, u.targetY);
      if (td < 5) {
        u.targetX = null;
        u.targetY = null;
      } else {
        moveToward(u, u.targetX, u.targetY);
      }
    } else if (u.type !== 'worker' || u.carrying === 0) {
      let nearestEnemy = null, nd = Infinity;
      for (const e of units) {
        if (!e.alive || e.playerId === u.playerId) continue;
        const d = dist(u.x, u.y, e.x, e.y);
        if (d < u.range + 60 && d < nd) { nd = d; nearestEnemy = e; }
      }
      if (nearestEnemy) u.targetUnit = nearestEnemy;
    }
  }

  units = units.filter(u => u.alive);
  selectedUnits = selectedUnits.filter(u => u.alive);
}

// --- Projectiles ---
function updateProjectiles() {
  for (const p of projectiles) {
    if (p.target && p.target.alive) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < p.speed + 5) {
      if (p.target && p.target.alive) {
        p.target.hp -= p.damage;
        spawnParticle(p.target.x, p.target.y, '#ff4', 8);
        if (p.target.hp <= 0) killUnit(p.target, p.playerId);
      }
      p.life = 0;
    } else {
      p.x += (dx / d) * p.speed;
      p.y += (dy / d) * p.speed;
    }
    p.life--;
  }
  projectiles = projectiles.filter(p => p.life > 0);
}

// --- Particles ---
function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

// --- HUD ---
function updateHUD() {
  const p = players[0];
  const myUnits = units.filter(u => u.alive && u.playerId === 0);
  const workers = myUnits.filter(u => u.type === 'worker').length;
  const army = myUnits.length - workers;

  if (resMinEl) resMinEl.textContent = `Minerals: ${p.minerals}`;
  if (resUnitEl) resUnitEl.textContent = `Units: ${myUnits.length} / ${MAX_UNITS}`;
  if (resSupplyEl) resSupplyEl.textContent = `Workers: ${workers} | Army: ${army}`;

  if (btnWorker) btnWorker.disabled = p.minerals < 50 || myUnits.length >= MAX_UNITS || prodQueue.length >= 5;
  if (btnSoldier) btnSoldier.disabled = p.minerals < 75 || myUnits.length >= MAX_UNITS || prodQueue.length >= 5;
  if (btnTank) btnTank.disabled = p.minerals < 150 || myUnits.length >= MAX_UNITS || prodQueue.length >= 5;

  score = p.unitsKilled * 50 + p.resourcesGathered;
  if (scoreEl) scoreEl.textContent = `SCORE: ${score}`;

  const min = Math.floor(gameTimer / 60);
  const sec = Math.floor(gameTimer % 60);
  if (timerEl) timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;

  if (selectionInfoEl) {
    if (selectedUnits.length === 0) {
      selectionInfoEl.textContent = 'No selection';
    } else if (selectedUnits.length === 1) {
      const u = selectedUnits[0];
      selectionInfoEl.textContent =
        `${u.type.toUpperCase()} HP:${u.hp}/${u.maxHp}` +
        (u.type === 'worker' ? ` Carry:${u.carrying}` : '');
    } else {
      const types = {};
      for (const u of selectedUnits) { types[u.type] = (types[u.type] || 0) + 1; }
      selectionInfoEl.textContent =
        Object.entries(types).map(([t, c]) => `${c}${t[0].toUpperCase()}`).join(' ');
    }
  }

  const queueTypes = {};
  for (const q of prodQueue) { queueTypes[q.type] = (queueTypes[q.type] || 0) + 1; }
  if (btnWorker) btnWorker.textContent = `Worker $50${queueTypes.worker ? ' (' + queueTypes.worker + ')' : ''}`;
  if (btnSoldier) btnSoldier.textContent = `Soldier $75${queueTypes.soldier ? ' (' + queueTypes.soldier + ')' : ''}`;
  if (btnTank) btnTank.textContent = `Tank $150${queueTypes.tank ? ' (' + queueTypes.tank + ')' : ''}`;
}

// --- Minimap (drawn on a separate 2D canvas) ---
function drawMinimap() {
  if (!minimapCtx) return;
  const mc = minimapCtx;
  mc.fillStyle = '#111';
  mc.fillRect(0, 0, 100, 67);

  const mScaleX = 100 / MAP_W, mScaleY = 67 / MAP_H;

  for (const m of minerals) {
    if (m.amount <= 0) continue;
    mc.fillStyle = '#4cf';
    mc.fillRect(m.x * mScaleX - 1, m.y * mScaleY - 1, 2, 2);
  }

  for (const p of players) {
    if (p.id === 1 && !isVisible(p.baseX, p.baseY)) continue;
    mc.fillStyle = p.id === 0 ? '#4af' : '#f44';
    mc.fillRect(p.baseX * mScaleX - 3, p.baseY * mScaleY - 3, 6, 6);
  }

  for (const u of units) {
    if (u.playerId === 1 && !isVisible(u.x, u.y)) continue;
    mc.fillStyle = u.playerId === 0 ? '#4af' : '#f44';
    mc.fillRect(u.x * mScaleX - 1, u.y * mScaleY - 1, 2, 2);
  }

  mc.strokeStyle = '#fff';
  mc.lineWidth = 1;
  mc.strokeRect(
    camera.x * mScaleX,
    camera.y * mScaleY,
    CANVAS_W * mScaleX,
    CANVAS_H * mScaleY
  );
}

// --- Main draw (WebGL renderer) ---
function drawGame(renderer, text) {
  const cx = camera.x, cy = camera.y;

  // Ground grid
  const gridColor = '#1a1a2e';
  for (let x = -(cx % TILE); x < CANVAS_W; x += TILE) {
    renderer.drawLine(x, 0, x, CANVAS_H, gridColor, 0.5);
  }
  for (let y = -(cy % TILE); y < CANVAS_H; y += TILE) {
    renderer.drawLine(0, y, CANVAS_W, y, gridColor, 0.5);
  }

  // Minerals
  for (const m of minerals) {
    if (!isVisible(m.x, m.y) || m.amount <= 0) continue;
    const sx = m.x - cx, sy = m.y - cy;
    if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;

    const a = m.amount / m.maxAmount;
    const alpha = Math.round((0.4 + a * 0.6) * 255).toString(16).padStart(2, '0');
    const color = `#64c8ff${alpha}`;
    const sz = 4 + a * 6;

    renderer.setGlow('#4cf', 0.5);
    renderer.fillPoly([
      { x: sx,          y: sy - sz },
      { x: sx + sz * 0.6, y: sy },
      { x: sx,          y: sy + sz * 0.5 },
      { x: sx - sz * 0.6, y: sy }
    ], color);
    renderer.setGlow(null);
  }

  // Bases
  for (const p of players) {
    if (!p.alive && p.baseHp <= 0) {
      const sx = p.baseX - cx, sy = p.baseY - cy;
      if (p.id === 1 && !isVisible(p.baseX, p.baseY)) continue;
      renderer.fillCircle(sx, sy, BASE_RADIUS * 0.7, '#333333');
      continue;
    }
    const sx = p.baseX - cx, sy = p.baseY - cy;
    if (p.id === 1 && !isVisible(p.baseX, p.baseY)) continue;
    if (sx < -40 || sx > CANVAS_W + 40 || sy < -40 || sy > CANVAS_H + 40) continue;

    const fillColor = p.id === 0 ? '#223344' : '#442222';
    const strokeColor = p.id === 0 ? '#4af' : '#f44';

    renderer.setGlow(strokeColor, 0.5);
    renderer.fillRect(sx - BASE_RADIUS, sy - BASE_RADIUS, BASE_RADIUS * 2, BASE_RADIUS * 2, fillColor);
    renderer.strokePoly([
      { x: sx - BASE_RADIUS, y: sy - BASE_RADIUS },
      { x: sx + BASE_RADIUS, y: sy - BASE_RADIUS },
      { x: sx + BASE_RADIUS, y: sy + BASE_RADIUS },
      { x: sx - BASE_RADIUS, y: sy + BASE_RADIUS }
    ], strokeColor, 2, true);
    renderer.setGlow(null);

    // HP bar
    const hpPct = p.baseHp / BASE_HP;
    renderer.fillRect(sx - BASE_RADIUS, sy - BASE_RADIUS - 8, BASE_RADIUS * 2, 4, '#330000');
    const hpColor = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffff44' : '#ff4444';
    renderer.fillRect(sx - BASE_RADIUS, sy - BASE_RADIUS - 8, BASE_RADIUS * 2 * hpPct, 4, hpColor);

    // Production progress bar (player only)
    if (p.id === 0 && prodQueue.length > 0) {
      const prog = 1 - prodQueue[0].timer / prodQueue[0].maxTimer;
      renderer.fillRect(sx - BASE_RADIUS, sy + BASE_RADIUS + 4, BASE_RADIUS * 2 * prog, 3, '#e84');
      renderer.strokePoly([
        { x: sx - BASE_RADIUS, y: sy + BASE_RADIUS + 4 },
        { x: sx + BASE_RADIUS, y: sy + BASE_RADIUS + 4 },
        { x: sx + BASE_RADIUS, y: sy + BASE_RADIUS + 7 },
        { x: sx - BASE_RADIUS, y: sy + BASE_RADIUS + 7 }
      ], '#e84', 1, true);
    }

    // Base label
    const label = p.id === 0 ? 'BASE' : 'ENEMY';
    const labelColor = p.id === 0 ? '#44aaff' : '#ff4444';
    text.drawText(label, sx, sy - 4, 9, labelColor, 'center');
  }

  // Units
  for (const u of units) {
    if (u.playerId === 1 && !isVisible(u.x, u.y)) continue;
    const sx = u.x - cx, sy = u.y - cy;
    if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;

    const pColor = u.playerId === 0 ? players[0].color : players[1].color;
    const tColor = UNIT_DEFS[u.type].color;
    const glowIntensity = u.selected ? 0.8 : 0.3;

    renderer.setGlow(pColor, glowIntensity);

    if (u.type === 'worker') {
      renderer.fillCircle(sx, sy, u.radius, tColor);
      renderer.strokePoly(
        Array.from({ length: 12 }, (_, i) => ({
          x: sx + Math.cos(i / 12 * Math.PI * 2) * u.radius,
          y: sy + Math.sin(i / 12 * Math.PI * 2) * u.radius
        })),
        pColor, 1.5, true
      );
    } else if (u.type === 'soldier') {
      renderer.fillPoly([
        { x: sx,               y: sy - u.radius },
        { x: sx + u.radius,    y: sy + u.radius * 0.7 },
        { x: sx - u.radius,    y: sy + u.radius * 0.7 }
      ], tColor);
      renderer.strokePoly([
        { x: sx,               y: sy - u.radius },
        { x: sx + u.radius,    y: sy + u.radius * 0.7 },
        { x: sx - u.radius,    y: sy + u.radius * 0.7 }
      ], pColor, 1.5, true);
    } else {
      // Tank — rectangle
      renderer.fillRect(sx - u.radius, sy - u.radius * 0.7, u.radius * 2, u.radius * 1.4, tColor);
      renderer.strokePoly([
        { x: sx - u.radius, y: sy - u.radius * 0.7 },
        { x: sx + u.radius, y: sy - u.radius * 0.7 },
        { x: sx + u.radius, y: sy + u.radius * 0.7 },
        { x: sx - u.radius, y: sy + u.radius * 0.7 }
      ], pColor, 1.5, true);
    }
    renderer.setGlow(null);

    // Selection ring (dashed approximation with a bright stroke poly)
    if (u.selected) {
      const r = u.radius + 4;
      const pts = Array.from({ length: 16 }, (_, i) => ({
        x: sx + Math.cos(i / 16 * Math.PI * 2) * r,
        y: sy + Math.sin(i / 16 * Math.PI * 2) * r
      }));
      renderer.strokePoly(pts, '#ffffffff', 1, true);
    }

    // HP bar
    if (u.hp < u.maxHp) {
      const hpPct = u.hp / u.maxHp;
      const barW = u.radius * 2 + 4;
      renderer.fillRect(sx - barW / 2, sy - u.radius - 6, barW, 3, '#330000');
      const hpColor = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffff44' : '#ff4444';
      renderer.fillRect(sx - barW / 2, sy - u.radius - 6, barW * hpPct, 3, hpColor);
    }

    // Carrying indicator
    if (u.type === 'worker' && u.carrying > 0) {
      renderer.fillRect(sx - 2, sy - 2, 4, 4, '#44ccff');
    }
  }

  // Projectiles
  for (const p of projectiles) {
    if (!isVisible(p.x, p.y)) continue;
    const sx = p.x - cx, sy = p.y - cy;
    renderer.setGlow('#ff4', 0.6);
    renderer.fillCircle(sx, sy, 3, '#ffff44');
    renderer.setGlow(null);
  }

  // Particles
  for (const p of particles) {
    if (!isVisible(p.x, p.y)) continue;
    const sx = p.x - cx, sy = p.y - cy;
    const alpha = p.life / p.maxLife;
    const alphaByte = Math.round(alpha * 255).toString(16).padStart(2, '0');
    const sizeFade = p.size * alpha;
    // Encode alpha into color string
    let baseColor = p.color;
    if (baseColor.length === 4) {
      // Expand #rgb to #rrggbb
      baseColor = '#' + baseColor[1] + baseColor[1] + baseColor[2] + baseColor[2] + baseColor[3] + baseColor[3];
    }
    const colorWithAlpha = baseColor + alphaByte;
    renderer.fillRect(sx - sizeFade / 2, sy - sizeFade / 2, sizeFade, sizeFade, colorWithAlpha);
  }

  // Fog of war — draw dark rects over hidden/partially-hidden tiles
  const fogW = Math.ceil(MAP_W / TILE);
  const fogH = Math.ceil(MAP_H / TILE);
  for (let fy = Math.floor(cy / TILE); fy <= Math.ceil((cy + CANVAS_H) / TILE); fy++) {
    for (let fx = Math.floor(cx / TILE); fx <= Math.ceil((cx + CANVAS_W) / TILE); fx++) {
      if (fx < 0 || fx >= fogW || fy < 0 || fy >= fogH) continue;
      const v = fogGrid[fy][fx];
      if (v >= 1) continue;
      const sx = fx * TILE - cx;
      const sy = fy * TILE - cy;
      const darkness = Math.round((1 - v) * 255).toString(16).padStart(2, '0');
      renderer.fillRect(sx, sy, TILE + 1, TILE + 1, `#0a0a14${darkness}`);
    }
  }

  // Selection box
  if (selBox && selBox.w > 2) {
    renderer.fillRect(selBox.x, selBox.y, selBox.w, selBox.h, '#4aaaffaa');
    renderer.strokePoly([
      { x: selBox.x,           y: selBox.y },
      { x: selBox.x + selBox.w, y: selBox.y },
      { x: selBox.x + selBox.w, y: selBox.y + selBox.h },
      { x: selBox.x,           y: selBox.y + selBox.h }
    ], '#44aaff', 1, true);
  }
}

// --- Game over ---
function showGameOver(game, message) {
  game.setState('over');
  game.showOverlay(message, `Score: ${score}`);
}

// === MAIN EXPORT ===
export function createGame() {
  const game = new Game('game');

  // Grab DOM references
  scoreEl       = document.getElementById('score-display');
  resMinEl      = document.getElementById('res-minerals');
  resUnitEl     = document.getElementById('res-units');
  resSupplyEl   = document.getElementById('res-supply');
  btnWorker     = document.getElementById('btn-worker');
  btnSoldier    = document.getElementById('btn-soldier');
  btnTank       = document.getElementById('btn-tank');
  timerEl       = document.getElementById('timer-display');
  selectionInfoEl = document.getElementById('selection-info');

  const miniCanvas = document.getElementById('minimap');
  if (miniCanvas) minimapCtx = miniCanvas.getContext('2d');

  // Production buttons
  if (btnWorker) btnWorker.addEventListener('click', () => { if (game.state === 'playing') produceUnit('worker'); });
  if (btnSoldier) btnSoldier.addEventListener('click', () => { if (game.state === 'playing') produceUnit('soldier'); });
  if (btnTank) btnTank.addEventListener('click', () => { if (game.state === 'playing') produceUnit('tank'); });

  // Minimap click
  if (miniCanvas) {
    miniCanvas.addEventListener('mousedown', (e) => {
      if (game.state !== 'playing') return;
      const rect = miniCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / 100 * MAP_W;
      const my = (e.clientY - rect.top) / 67 * MAP_H;
      camera.x = mx - CANVAS_W / 2;
      camera.y = my - CANVAS_H / 2;
      clampCamera();
    });
  }

  // Canvas mouse events (direct listeners — not through engine input)
  const canvas = document.getElementById('game');
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (game.state !== 'playing') return;
    mouseDown = true;
    mouseButton = e.button;
    const rect = canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    if (e.button === 0) {
      dragStart = { x: lx, y: ly };
      selBox = null;
    } else if (e.button === 2) {
      issueCommand(lx + camera.x, ly + camera.y);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    if (mouseDown && mouseButton === 0 && dragStart) {
      const cx2 = e.clientX - rect.left;
      const cy2 = e.clientY - rect.top;
      selBox = {
        x: Math.min(dragStart.x, cx2),
        y: Math.min(dragStart.y, cy2),
        w: Math.abs(cx2 - dragStart.x),
        h: Math.abs(cy2 - dragStart.y)
      };
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    if (e.button === 0) {
      if (selBox && selBox.w > 4 && selBox.h > 4) {
        const bx = selBox.x + camera.x;
        const by = selBox.y + camera.y;
        const bw = selBox.w;
        const bh = selBox.h;
        if (!e.shiftKey) { selectedUnits.forEach(u => u.selected = false); selectedUnits = []; }
        for (const u of units) {
          if (u.alive && u.playerId === 0 && u.x >= bx && u.x <= bx + bw && u.y >= by && u.y <= by + bh) {
            u.selected = true;
            if (!selectedUnits.includes(u)) selectedUnits.push(u);
          }
        }
      } else {
        const wx = lx + camera.x;
        const wy = ly + camera.y;
        const clicked = findUnitAt(wx, wy, 0);
        if (!e.shiftKey) { selectedUnits.forEach(u => u.selected = false); selectedUnits = []; }
        if (clicked) {
          clicked.selected = true;
          if (!selectedUnits.includes(clicked)) selectedUnits.push(clicked);
        }
      }
      selBox = null;
      dragStart = null;
    }
    mouseDown = false;
  });

  // === onInit ===
  game.onInit = () => {
    score = 0;
    gameTimer = GAME_TIME;
    units = [];
    projectiles = [];
    particles = [];
    selectedUnits = [];
    prodQueue = [];
    mouseDown = false;
    dragStart = null;
    selBox = null;

    players = [
      { id: 0, minerals: 100, baseX: 80, baseY: MAP_H / 2, baseHp: BASE_HP, alive: true,
        unitsKilled: 0, resourcesGathered: 0, color: '#4af', prodTimer: 0, prodType: null },
      { id: 1, minerals: 100, baseX: MAP_W - 80, baseY: MAP_H / 2, baseHp: BASE_HP, alive: true,
        unitsKilled: 0, resourcesGathered: 0, color: '#f44', prodTimer: 0, prodType: null }
    ];

    minerals = [];
    const patchPositions = [
      { x: 300, y: 200 }, { x: 300, y: 600 },
      { x: 600, y: 400 },
      { x: 900, y: 200 }, { x: 900, y: 600 },
      { x: 500, y: 100 }, { x: 700, y: 700 },
      { x: 600, y: 250 }, { x: 600, y: 550 }
    ];
    for (const p of patchPositions) {
      for (let i = 0; i < 3; i++) {
        minerals.push({
          x: p.x + (Math.random() - 0.5) * 40,
          y: p.y + (Math.random() - 0.5) * 40,
          amount: MINERAL_AMT,
          maxAmount: MINERAL_AMT
        });
      }
    }

    for (let pid = 0; pid < 2; pid++) {
      for (let i = 0; i < 2; i++) {
        spawnUnit(pid, 'worker', players[pid].baseX + (i - 0.5) * 30, players[pid].baseY + (i - 0.5) * 20);
      }
    }

    const fogW = Math.ceil(MAP_W / TILE);
    const fogH = Math.ceil(MAP_H / TILE);
    fogGrid = [];
    for (let y = 0; y < fogH; y++) {
      fogGrid[y] = [];
      for (let x = 0; x < fogW; x++) fogGrid[y][x] = 0;
    }

    const infW = Math.ceil(MAP_W / 40);
    const infH = Math.ceil(MAP_H / 40);
    influenceMap = [];
    for (let y = 0; y < infH; y++) {
      influenceMap[y] = [];
      for (let x = 0; x < infW; x++) influenceMap[y][x] = 0;
    }

    aiState = {
      phase: 'eco',
      attackTimer: 0,
      scoutTimer: 0,
      rallyPoint: { x: MAP_W - 200, y: MAP_H / 2 },
      lastAttackTime: 0
    };

    camera.x = Math.max(0, players[0].baseX - CANVAS_W / 2);
    camera.y = Math.max(0, players[0].baseY - CANVAS_H / 2);

    game.showOverlay('MICRO RTS', 'Gather minerals. Build an army. Destroy the enemy base.');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Keyboard (production hotkeys + selection shortcuts)
  document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing') return;
    switch (e.key.toLowerCase()) {
      case 'w': produceUnit('worker'); break;
      case 's': produceUnit('soldier'); break;
      case 't': produceUnit('tank'); break;
      case 'a':
        selectedUnits.forEach(u => u.selected = false);
        selectedUnits = units.filter(u => u.alive && u.playerId === 0 && u.type !== 'worker');
        selectedUnits.forEach(u => u.selected = true);
        break;
      case 'q':
        selectedUnits.forEach(u => u.selected = false);
        selectedUnits = units.filter(u => u.alive && u.playerId === 0 && u.type === 'worker');
        selectedUnits.forEach(u => u.selected = true);
        break;
    }
  });

  // Start button
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      game.onInit();
      game.setState('playing');
    });
  }

  // === onUpdate (fixed 60Hz) ===
  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;

    const now = performance.now();
    const tickDt = dt / 1000; // seconds

    updateCamera();
    updateFog();
    updateUnits(tickDt, now);
    updateProjectiles();
    updateParticles();
    updateProduction();
    updateAI(tickDt);

    gameTimer -= dt / 1000;
    if (gameTimer <= 0) {
      gameTimer = 0;
      const p0score = players[0].unitsKilled * 50 + players[0].resourcesGathered;
      const p1score = players[1].unitsKilled * 50 + players[1].resourcesGathered;
      if (p0score > p1score) showGameOver(game, 'TIME UP - VICTORY!');
      else if (p0score < p1score) showGameOver(game, 'TIME UP - DEFEAT');
      else showGameOver(game, 'TIME UP - DRAW');
    }

    if (players[0] && !players[0].alive) showGameOver(game, 'BASE DESTROYED - DEFEAT');
    else if (players[1] && !players[1].alive) showGameOver(game, 'ENEMY DESTROYED - VICTORY!');

    updateHUD();
    drawMinimap();
  };

  // === onDraw ===
  game.onDraw = (renderer, text) => {
    drawGame(renderer, text);
  };

  game.start();
  return game;
}
