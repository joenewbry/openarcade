// swarm-control/game.js — Swarm Control game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;
const WORLD_W = 900, WORLD_H = 600;

// Game constants
const NODE_SPAWN_INTERVAL = 120;
const UNIT_SPEED = 1.6;
const ATTACK_RANGE = 18;
const ATTACK_DAMAGE = 0.35;
const BOID_SEP = 8;
const BOID_ALI = 25;
const BOID_COH = 35;
const MAX_UNITS = 150;
const AI_INTERVAL = 90;
const HIVE_SPAWN_INTERVAL = 200;
const MATCH_DURATION = 180;
const DRAG_THRESHOLD = 15;

// HUD elements
const playerUnitsEl = document.getElementById('playerUnits');
const aiUnitsEl = document.getElementById('aiUnits');
const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');
const timerEl = document.getElementById('timer');
const playerNodesEl = document.getElementById('playerNodes');
const aiNodesEl = document.getElementById('aiNodes');
const statusEl = document.getElementById('status');

// Game state
let score = 0;
let zoomLevel = 1;
let camX = 0, camY = (WORLD_H - H) / 2;

let timeLeft = MATCH_DURATION;
let lastTimeTick = 0;

let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragEndX = 0, dragEndY = 0;

let playerUnits = [];
let aiUnitsArr = [];
let resourceNodes = [];
let playerHive = null;
let aiHive = null;
let particles = [];
let playerKills = 0;
let aiKills = 0;

let aiTarget = null;
let aiSplitTarget = null;
let aiSplitRatio = 0;
let aiDecisionTimer = 0;

let playerHiveSpawn = 0;
let aiHiveSpawn = 0;

// ─────────────────────────── Entity factories ────────────────────────────

function createUnit(x, y, team) {
  return {
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 20,
    vx: 0, vy: 0,
    team,
    hp: 1,
    targetX: x,
    targetY: y,
    assigned: 'main'
  };
}

function createHive(x, y, team) {
  return { x, y, team, hp: 200, maxHp: 200, radius: 18 };
}

function createResourceNode(x, y) {
  return { x, y, owner: 'neutral', captureProgress: 0, radius: 12, spawnTimer: 0 };
}

// ─────────────────────────── Init ────────────────────────────────────────

function initGame() {
  playerUnits = [];
  aiUnitsArr = [];
  resourceNodes = [];
  particles = [];
  playerKills = 0;
  aiKills = 0;
  score = 0;
  timeLeft = MATCH_DURATION;
  lastTimeTick = performance.now();
  zoomLevel = 1;
  camX = 0;
  camY = (WORLD_H - H) / 2;
  playerHiveSpawn = 0;
  aiHiveSpawn = 0;

  playerHive = createHive(80, WORLD_H / 2, 'player');
  aiHive = createHive(WORLD_W - 80, WORLD_H / 2, 'ai');

  for (let i = 0; i < 50; i++) {
    playerUnits.push(createUnit(playerHive.x, playerHive.y, 'player'));
    aiUnitsArr.push(createUnit(aiHive.x, aiHive.y, 'ai'));
  }

  const nodePositions = [
    { x: WORLD_W * 0.3, y: WORLD_H * 0.18 },
    { x: WORLD_W * 0.5, y: WORLD_H * 0.12 },
    { x: WORLD_W * 0.7, y: WORLD_H * 0.18 },
    { x: WORLD_W * 0.22, y: WORLD_H * 0.5 },
    { x: WORLD_W * 0.5, y: WORLD_H * 0.5 },
    { x: WORLD_W * 0.78, y: WORLD_H * 0.5 },
    { x: WORLD_W * 0.3, y: WORLD_H * 0.82 },
    { x: WORLD_W * 0.5, y: WORLD_H * 0.88 },
    { x: WORLD_W * 0.7, y: WORLD_H * 0.82 },
  ];
  for (const p of nodePositions) resourceNodes.push(createResourceNode(p.x, p.y));

  for (const u of playerUnits) { u.targetX = playerHive.x + 40; u.targetY = playerHive.y; }
  for (const u of aiUnitsArr)  { u.targetX = aiHive.x - 40;    u.targetY = aiHive.y; }

  aiTarget = { x: aiHive.x, y: aiHive.y };
  aiSplitTarget = null;
  aiSplitRatio = 0;
  aiDecisionTimer = 0;
}

// ─────────────────────────── Coordinate helpers ──────────────────────────

function screenToWorld(sx, sy) {
  return { x: sx / zoomLevel + camX, y: sy / zoomLevel + camY };
}

// ─────────────────────────── BOIDS + movement ────────────────────────────

function updateUnits(units, enemies, enemyHive) {
  const cellSize = 40;
  const gridW = Math.ceil(WORLD_W / cellSize);
  const gridH = Math.ceil(WORLD_H / cellSize);
  const grid = new Array(gridW * gridH);
  for (let i = 0; i < grid.length; i++) grid[i] = [];

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const gx = Math.floor(u.x / cellSize);
    const gy = Math.floor(u.y / cellSize);
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) grid[gy * gridW + gx].push(i);
  }

  const eGrid = new Array(gridW * gridH);
  for (let i = 0; i < eGrid.length; i++) eGrid[i] = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const gx = Math.floor(e.x / cellSize);
    const gy = Math.floor(e.y / cellSize);
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) eGrid[gy * gridW + gx].push(i);
  }

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.hp <= 0) continue;

    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0, aliCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;

    const gx = Math.floor(u.x / cellSize);
    const gy = Math.floor(u.y / cellSize);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        const cell = grid[ny * gridW + nx];
        for (const j of cell) {
          if (i === j) continue;
          const o = units[j];
          const ddx = u.x - o.x, ddy = u.y - o.y;
          const dist2 = ddx * ddx + ddy * ddy;
          if (dist2 < BOID_SEP * BOID_SEP && dist2 > 0.01) {
            const dist = Math.sqrt(dist2);
            sepX += ddx / dist / dist * 2;
            sepY += ddy / dist / dist * 2;
          }
          if (dist2 < BOID_ALI * BOID_ALI) { aliX += o.vx; aliY += o.vy; aliCount++; }
          if (dist2 < BOID_COH * BOID_COH) { cohX += o.x; cohY += o.y; cohCount++; }
        }
      }
    }

    let fx = 0, fy = 0;
    fx += sepX * 1.5;
    fy += sepY * 1.5;
    if (aliCount > 0) { fx += (aliX / aliCount) * 0.1; fy += (aliY / aliCount) * 0.1; }
    if (cohCount > 0) {
      fx += (cohX / cohCount - u.x) * 0.005;
      fy += (cohY / cohCount - u.y) * 0.005;
    }

    const tdx = u.targetX - u.x, tdy = u.targetY - u.y;
    const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tDist > 5) { fx += (tdx / tDist) * 0.8; fy += (tdy / tDist) * 0.8; }

    // Attack nearest enemy
    let nearestEnemy = null;
    let nearestDist = ATTACK_RANGE;
    for (let dy2 = -1; dy2 <= 1; dy2++) {
      for (let dx2 = -1; dx2 <= 1; dx2++) {
        const nx = gx + dx2, ny = gy + dy2;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        const cell = eGrid[ny * gridW + nx];
        for (const j of cell) {
          const e = enemies[j];
          if (e.hp <= 0) continue;
          const edx = e.x - u.x, edy = e.y - u.y;
          const eDist = Math.sqrt(edx * edx + edy * edy);
          if (eDist < nearestDist) { nearestDist = eDist; nearestEnemy = e; }
        }
      }
    }

    if (nearestEnemy) {
      nearestEnemy.hp -= ATTACK_DAMAGE;
      if (nearestEnemy.hp <= 0) {
        spawnParticle(nearestEnemy.x, nearestEnemy.y, u.team === 'player' ? '#8f0' : '#f44');
      }
      const edx = nearestEnemy.x - u.x, edy = nearestEnemy.y - u.y;
      const ed = Math.sqrt(edx * edx + edy * edy);
      if (ed > 0.1) { fx += (edx / ed) * 0.3; fy += (edy / ed) * 0.3; }
    }

    if (enemyHive && enemyHive.hp > 0) {
      const hdx = enemyHive.x - u.x, hdy = enemyHive.y - u.y;
      const hDist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hDist < enemyHive.radius + 12) {
        enemyHive.hp -= 0.15;
        if (hDist > 2) { fx += (hdx / hDist) * 0.5; fy += (hdy / hDist) * 0.5; }
      }
    }

    if (u.x < 10) fx += 1;
    if (u.x > WORLD_W - 10) fx -= 1;
    if (u.y < 10) fy += 1;
    if (u.y > WORLD_H - 10) fy -= 1;

    u.vx = u.vx * 0.85 + fx * 0.15;
    u.vy = u.vy * 0.85 + fy * 0.15;
    const speed = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
    if (speed > UNIT_SPEED) { u.vx = (u.vx / speed) * UNIT_SPEED; u.vy = (u.vy / speed) * UNIT_SPEED; }

    u.x += u.vx;
    u.y += u.vy;
    u.x = Math.max(2, Math.min(WORLD_W - 2, u.x));
    u.y = Math.max(2, Math.min(WORLD_H - 2, u.y));
  }

  for (let i = units.length - 1; i >= 0; i--) {
    if (units[i].hp <= 0) units.splice(i, 1);
  }
}

// ─────────────────────────── Resource nodes ──────────────────────────────

function updateNodes() {
  for (const node of resourceNodes) {
    let playerNear = 0, aiNear = 0;
    const capRange2 = 35 * 35;
    for (const u of playerUnits) {
      const dx = u.x - node.x, dy = u.y - node.y;
      if (dx * dx + dy * dy < capRange2) playerNear++;
    }
    for (const u of aiUnitsArr) {
      const dx = u.x - node.x, dy = u.y - node.y;
      if (dx * dx + dy * dy < capRange2) aiNear++;
    }

    const capSpeed = 0.008;
    if (playerNear > aiNear && playerNear > 0) {
      node.captureProgress -= capSpeed * (playerNear - aiNear);
      if (node.captureProgress < -1) node.captureProgress = -1;
      if (node.captureProgress <= -0.99) node.owner = 'player';
      else if (node.owner === 'ai' && node.captureProgress < 0.5) node.owner = 'neutral';
    } else if (aiNear > playerNear && aiNear > 0) {
      node.captureProgress += capSpeed * (aiNear - playerNear);
      if (node.captureProgress > 1) node.captureProgress = 1;
      if (node.captureProgress >= 0.99) node.owner = 'ai';
      else if (node.owner === 'player' && node.captureProgress > -0.5) node.owner = 'neutral';
    } else {
      node.captureProgress *= 0.998;
    }

    if (node.owner !== 'neutral') {
      node.spawnTimer++;
      if (node.spawnTimer >= NODE_SPAWN_INTERVAL) {
        node.spawnTimer = 0;
        if (node.owner === 'player' && playerUnits.length < MAX_UNITS) {
          const u = createUnit(node.x, node.y, 'player');
          if (playerUnits.length > 0) { u.targetX = playerUnits[0].targetX; u.targetY = playerUnits[0].targetY; }
          playerUnits.push(u);
        } else if (node.owner === 'ai' && aiUnitsArr.length < MAX_UNITS) {
          const u = createUnit(node.x, node.y, 'ai');
          u.targetX = aiTarget ? aiTarget.x : aiHive.x;
          u.targetY = aiTarget ? aiTarget.y : aiHive.y;
          aiUnitsArr.push(u);
        }
      }
    }
  }
}

// ─────────────────────────── AI ──────────────────────────────────────────

function distToCenter(units, x, y) {
  if (units.length === 0) return 9999;
  let cx = 0, cy = 0;
  for (const u of units) { cx += u.x; cy += u.y; }
  cx /= units.length; cy /= units.length;
  return Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
}

function updateAI() {
  aiDecisionTimer++;
  if (aiDecisionTimer < AI_INTERVAL) return;
  aiDecisionTimer = 0;

  const myCount = aiUnitsArr.length;
  const enemyCount = playerUnits.length;

  let pcx = playerHive.x, pcy = playerHive.y;
  if (playerUnits.length > 0) {
    pcx = 0; pcy = 0;
    for (const u of playerUnits) { pcx += u.x; pcy += u.y; }
    pcx /= playerUnits.length; pcy /= playerUnits.length;
  }

  const myNodes = resourceNodes.filter(n => n.owner === 'ai').length;
  const targetableNodes = resourceNodes.filter(n => n.owner !== 'ai');

  let bestTarget = { x: aiHive.x, y: aiHive.y };
  let bestScore = -Infinity;

  // Attack player hive
  {
    const d = distToCenter(aiUnitsArr, playerHive.x, playerHive.y);
    let s = (myCount > enemyCount * 1.2) ? 55 : 5;
    s += (playerHive.hp < 100) ? 40 : 0;
    s += (myCount > 80) ? 20 : 0;
    s -= d * 0.025;
    s += (timeLeft < 60) ? 30 : 0;
    if (s > bestScore) { bestScore = s; bestTarget = { x: playerHive.x, y: playerHive.y }; }
  }

  // Defend own hive
  {
    const enemyDist = distToCenter(playerUnits, aiHive.x, aiHive.y);
    if (enemyDist < 150) {
      const s = 90 - enemyDist * 0.4;
      if (s > bestScore) { bestScore = s; bestTarget = { x: aiHive.x, y: aiHive.y }; }
    }
  }

  // Intercept player swarm
  {
    const d = distToCenter(aiUnitsArr, pcx, pcy);
    let s = (myCount > enemyCount * 1.1) ? 35 : 10;
    s -= d * 0.03;
    if (enemyCount > myCount * 0.8) s += 15;
    if (s > bestScore) { bestScore = s; bestTarget = { x: pcx, y: pcy }; }
  }

  // Resource nodes
  for (const node of targetableNodes) {
    const d = distToCenter(aiUnitsArr, node.x, node.y);
    const pDist = distToCenter(playerUnits, node.x, node.y);
    let s = 25;
    s -= d * 0.04;
    s += pDist * 0.015;
    if (node.owner === 'player') s += 20;
    if (myNodes < 3) s += 18;
    if (myNodes === 0) s += 25;
    if (s > bestScore) { bestScore = s; bestTarget = { x: node.x, y: node.y }; }
  }

  aiTarget = bestTarget;
  aiSplitTarget = null;
  aiSplitRatio = 0;

  if (myCount > 35) {
    let secondBest = null;
    let secondScore = -Infinity;
    for (const node of targetableNodes) {
      const d = distToCenter(aiUnitsArr, node.x, node.y);
      let s = 18 - d * 0.035;
      if (node.owner === 'player') s += 15;
      const dToMain = Math.sqrt((node.x - aiTarget.x) ** 2 + (node.y - aiTarget.y) ** 2);
      if (dToMain > 80 && s > secondScore) { secondScore = s; secondBest = { x: node.x, y: node.y }; }
    }
    if (secondBest && myCount > 45) {
      aiSplitTarget = secondBest;
      aiSplitRatio = Math.min(0.35, 0.2 + (myCount - 45) * 0.005);
    }
  }

  if (aiSplitTarget && aiSplitRatio > 0) {
    const splitCount = Math.floor(aiUnitsArr.length * aiSplitRatio);
    const sorted = [...aiUnitsArr].sort((a, b) => {
      const da = (a.x - aiSplitTarget.x) ** 2 + (a.y - aiSplitTarget.y) ** 2;
      const db = (b.x - aiSplitTarget.x) ** 2 + (b.y - aiSplitTarget.y) ** 2;
      return da - db;
    });
    for (let i = 0; i < sorted.length; i++) {
      if (i < splitCount) {
        sorted[i].targetX = aiSplitTarget.x; sorted[i].targetY = aiSplitTarget.y; sorted[i].assigned = 'split';
      } else {
        sorted[i].targetX = aiTarget.x; sorted[i].targetY = aiTarget.y; sorted[i].assigned = 'main';
      }
    }
  } else {
    for (const u of aiUnitsArr) { u.targetX = aiTarget.x; u.targetY = aiTarget.y; u.assigned = 'main'; }
  }
}

// ─────────────────────────── Particles ───────────────────────────────────

function spawnParticle(x, y, color) {
  for (let i = 0; i < 4; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 20 + Math.random() * 10,
      color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.95; p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ─────────────────────────── Rendering helpers ───────────────────────────

// Convert world coords to screen coords given current camera + zoom
function wx(worldX) { return (worldX - camX) * zoomLevel; }
function wy(worldY) { return (worldY - camY) * zoomLevel; }
function ws(worldSize) { return worldSize * zoomLevel; }

function drawNode(renderer, text, node, now) {
  const pulse = Math.sin(now * 0.003) * 0.15 + 0.85;

  let ringColor, fillColor, iconColor;
  if (node.owner === 'player') {
    ringColor = `#44aaff${Math.round(0.5 * pulse * 255).toString(16).padStart(2,'0')}`;
    fillColor = '#44aaff33';
    iconColor = '#44aaff';
  } else if (node.owner === 'ai') {
    ringColor = `#ff4444${Math.round(0.5 * pulse * 255).toString(16).padStart(2,'0')}`;
    fillColor = '#ff444433';
    iconColor = '#ff4444';
  } else {
    ringColor = `#88ff00${Math.round(0.3 * pulse * 255).toString(16).padStart(2,'0')}`;
    fillColor = '#88ff001a';
    iconColor = '#88ff00';
  }

  const sx = wx(node.x), sy = wy(node.y);
  const sr = ws(node.radius);

  // Outer ring
  renderer.setGlow(iconColor, 0.4);
  renderer.fillCircle(sx, sy, sr + ws(4), ringColor);
  renderer.setGlow(null);

  // Fill circle
  renderer.fillCircle(sx, sy, sr, fillColor);

  // Capture bar
  if (Math.abs(node.captureProgress) > 0.01) {
    const bw = ws(20), bh = ws(3);
    const bx = sx - bw / 2;
    const by = sy + sr + ws(4);
    renderer.fillRect(bx, by, bw, bh, '#222222');
    if (node.captureProgress < 0) {
      renderer.fillRect(bx, by, bw * (-node.captureProgress), bh, '#44aaff');
    } else {
      renderer.fillRect(bx, by, bw * node.captureProgress, bh, '#ff4444');
    }
  }

  // Diamond icon
  renderer.setGlow(iconColor, 0.5);
  const d = ws(5);
  renderer.strokePoly([
    { x: sx,     y: sy - d },
    { x: sx + d, y: sy     },
    { x: sx,     y: sy + d },
    { x: sx - d, y: sy     },
  ], iconColor, ws(1.5));
  renderer.setGlow(null);
}

function drawHive(renderer, text, hive, color, label, now) {
  const sx = wx(hive.x), sy = wy(hive.y);
  const sr = ws(hive.radius);

  if (hive.hp <= 0) {
    renderer.strokePoly(hexPoints(sx, sy, sr), '#333333', ws(1));
    text.drawText('DESTROYED', sx, sy - ws(4), ws(8), '#444444', 'center');
    return;
  }

  const pulse = Math.sin(now * 0.002) * ws(3);

  // Glow halo
  renderer.setGlow(color, 0.3);
  renderer.fillCircle(sx, sy, sr + ws(14) + pulse, color === '#44aaff' ? '#44aaff18' : '#ff444418');
  renderer.setGlow(null);

  // Outer hex fill
  const outerPts = hexPoints(sx, sy, sr);
  renderer.fillPoly(outerPts, color === '#44aaff' ? '#44aaff26' : '#ff444426');

  // Outer hex stroke
  renderer.setGlow(color, 0.6);
  renderer.strokePoly(outerPts, color, ws(2));

  // Inner hex stroke (dimmed)
  const innerPts = hexPoints(sx, sy, sr * 0.5);
  renderer.strokePoly(innerPts, color + '66', ws(1));
  renderer.setGlow(null);

  // HP bar
  const hpPct = hive.hp / hive.maxHp;
  const bw = ws(30), bh = ws(4);
  const bx = sx - bw / 2;
  const by = sy - sr - ws(12);
  renderer.fillRect(bx, by, bw, bh, '#222222');
  const barColor = hpPct > 0.5 ? color : (hpPct > 0.25 ? '#ffaa00' : '#ff3333');
  renderer.fillRect(bx, by, bw * hpPct, bh, barColor);

  // Label
  renderer.setGlow(color, 0.5);
  text.drawText(label, sx, sy - ws(4), ws(8), color, 'center');
  renderer.setGlow(null);
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}

function drawUnits(renderer, text, units, color, trailColor) {
  if (units.length === 0) return;

  // Trail dots (dimmed)
  for (const u of units) {
    const speed = u.vx * u.vx + u.vy * u.vy;
    if (speed > 0.25) {
      const tx = wx(u.x - u.vx * 2);
      const ty = wy(u.y - u.vy * 2);
      renderer.fillRect(tx - ws(0.5), ty - ws(0.5), ws(1), ws(1), trailColor + '1f');
    }
  }

  // Unit dots
  for (const u of units) {
    renderer.fillRect(wx(u.x) - ws(1.5), wy(u.y) - ws(1.5), ws(3), ws(3), color);
  }

  // Swarm center ring
  let cx = 0, cy = 0;
  for (const u of units) { cx += u.x; cy += u.y; }
  cx /= units.length; cy /= units.length;
  const scx = wx(cx), scy = wy(cy);

  renderer.strokePoly(circlePoints(scx, scy, ws(8), 20), color + '40', ws(0.7));

  // Count label
  text.drawText(String(units.length), scx, scy - ws(14), ws(7), color + '66', 'center');
}

function circlePoints(cx, cy, r, n = 20) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawMinimap(renderer, text) {
  const mmW = 100, mmH = 67;
  const mmX = W - mmW - 8, mmY = H - mmH - 8;
  const sx = mmW / WORLD_W, sy = mmH / WORLD_H;

  renderer.fillRect(mmX, mmY, mmW, mmH, '#0a0a14d9');
  renderer.strokePoly([
    { x: mmX,       y: mmY },
    { x: mmX + mmW, y: mmY },
    { x: mmX + mmW, y: mmY + mmH },
    { x: mmX,       y: mmY + mmH },
  ], '#88ff0040', 1);

  // Nodes
  for (const node of resourceNodes) {
    const c = node.owner === 'player' ? '#44aaff' : node.owner === 'ai' ? '#ff4444' : '#88ff00';
    renderer.fillRect(mmX + node.x * sx - 1, mmY + node.y * sy - 1, 3, 3, c + 'b3');
  }

  // Hives
  if (playerHive.hp > 0) renderer.fillRect(mmX + playerHive.x * sx - 2, mmY + playerHive.y * sy - 2, 5, 5, '#44aaff');
  if (aiHive.hp > 0)     renderer.fillRect(mmX + aiHive.x * sx - 2,     mmY + aiHive.y * sy - 2,     5, 5, '#ff4444');

  // Sampled units
  for (let i = 0; i < playerUnits.length; i += 4) {
    renderer.fillRect(mmX + playerUnits[i].x * sx, mmY + playerUnits[i].y * sy, 1, 1, '#44aaff80');
  }
  for (let i = 0; i < aiUnitsArr.length; i += 4) {
    renderer.fillRect(mmX + aiUnitsArr[i].x * sx, mmY + aiUnitsArr[i].y * sy, 1, 1, '#ff444480');
  }

  // Viewport rect
  renderer.strokePoly([
    { x: mmX + camX * sx,                               y: mmY + camY * sy },
    { x: mmX + (camX + W / zoomLevel) * sx,             y: mmY + camY * sy },
    { x: mmX + (camX + W / zoomLevel) * sx,             y: mmY + (camY + H / zoomLevel) * sy },
    { x: mmX + camX * sx,                               y: mmY + (camY + H / zoomLevel) * sy },
  ], '#ffffff80', 0.7);
}

function drawGrid(renderer) {
  const step = ws(30);
  const offX = -(camX * zoomLevel) % step;
  const offY = -(camY * zoomLevel) % step;

  // Clip-ish: only draw lines within canvas bounds
  for (let x = offX; x <= W; x += step) {
    renderer.fillRect(x - 0.25, 0, 0.5, H, '#88ff0009');
  }
  for (let y = offY; y <= H; y += step) {
    renderer.fillRect(0, y - 0.25, W, 0.5, '#88ff0009');
  }

  // World border
  const bx0 = wx(0), by0 = wy(0);
  const bx1 = wx(WORLD_W), by1 = wy(WORLD_H);
  renderer.strokePoly([
    { x: bx0, y: by0 },
    { x: bx1, y: by0 },
    { x: bx1, y: by1 },
    { x: bx0, y: by1 },
  ], '#88ff0026', ws(2));
}

function drawDragLine(renderer, text) {
  const s = screenToWorld(dragStartX, dragStartY);
  const e = screenToWorld(dragEndX, dragEndY);
  const sx = wx(s.x), sy = wy(s.y);
  const ex = wx(e.x), ey = wy(e.y);

  // Dashed line approximated with short rects along the line
  renderer.drawLine(sx, sy, ex, ey, '#44aaff80', 1.5);

  // Circle at end
  renderer.fillCircle(ex, ey, 6, '#44aaff66');

  // SPLIT label
  text.drawText('SPLIT', ex, ey - 14, 8, '#44aaff', 'center');
}

// ─────────────────────────── Update / endGame ────────────────────────────

let _game = null;

function endGame(reason) {
  let title, txt;
  if (reason === 'player_hive') {
    title = 'VICTORY!'; txt = 'Enemy hive destroyed! Kills: ' + playerKills;
  } else if (reason === 'ai_hive') {
    title = 'DEFEAT'; txt = 'Your hive was destroyed. Kills: ' + playerKills;
  } else if (reason === 'ai_eliminated') {
    title = 'VICTORY!'; txt = 'Enemy swarm wiped out! Kills: ' + playerKills;
  } else if (reason === 'player_eliminated') {
    title = 'DEFEAT'; txt = 'Your swarm was wiped out. Kills: ' + playerKills;
  } else {
    if (playerKills > aiKills) {
      title = 'VICTORY!'; txt = 'Time up! You: ' + playerKills + ' kills vs AI: ' + aiKills;
    } else if (aiKills > playerKills) {
      title = 'DEFEAT'; txt = 'Time up! You: ' + playerKills + ' kills vs AI: ' + aiKills;
    } else {
      title = 'DRAW'; txt = 'Time up! Both scored ' + playerKills + ' kills';
    }
  }
  score = playerKills;
  _game.showOverlay(title, txt);
  _game.setState('over');
}

function doUpdate(dt) {
  if (_game.state === 'over') return;
  if (_game.state === 'waiting') return;

  const now = performance.now();
  if (now - lastTimeTick >= 1000) {
    lastTimeTick = now;
    timeLeft--;
    if (timeLeft <= 0) { endGame('time'); return; }
  }

  const pBefore = playerUnits.length;
  const aBefore = aiUnitsArr.length;

  updateUnits(playerUnits, aiUnitsArr, aiHive);
  updateUnits(aiUnitsArr, playerUnits, playerHive);

  aiKills += Math.max(0, pBefore - playerUnits.length);
  playerKills += Math.max(0, aBefore - aiUnitsArr.length);
  score = playerKills;

  updateNodes();
  updateAI();
  updateParticles();

  if (playerHive.hp > 0 && playerUnits.length < MAX_UNITS) {
    playerHiveSpawn++;
    if (playerHiveSpawn >= HIVE_SPAWN_INTERVAL) {
      playerHiveSpawn = 0;
      const u = createUnit(playerHive.x, playerHive.y, 'player');
      if (playerUnits.length > 0) { u.targetX = playerUnits[0].targetX; u.targetY = playerUnits[0].targetY; }
      playerUnits.push(u);
    }
  }
  if (aiHive.hp > 0 && aiUnitsArr.length < MAX_UNITS) {
    aiHiveSpawn++;
    if (aiHiveSpawn >= HIVE_SPAWN_INTERVAL) {
      aiHiveSpawn = 0;
      const u = createUnit(aiHive.x, aiHive.y, 'ai');
      u.targetX = aiTarget ? aiTarget.x : aiHive.x;
      u.targetY = aiTarget ? aiTarget.y : aiHive.y;
      aiUnitsArr.push(u);
    }
  }

  if (aiHive.hp <= 0) { endGame('player_hive'); return; }
  if (playerHive.hp <= 0) { endGame('ai_hive'); return; }
  if (playerUnits.length === 0 && playerHive.hp <= 0) { endGame('player_eliminated'); return; }
  if (aiUnitsArr.length === 0 && aiHive.hp <= 0) { endGame('ai_eliminated'); return; }

  // Camera follows player swarm
  if (playerUnits.length > 0) {
    let cx = 0, cy = 0;
    for (const u of playerUnits) { cx += u.x; cy += u.y; }
    cx /= playerUnits.length; cy /= playerUnits.length;
    const viewW = W / zoomLevel, viewH = H / zoomLevel;
    camX += (cx - viewW / 2 - camX) * 0.04;
    camY += (cy - viewH / 2 - camY) * 0.04;
  }

  const viewW = W / zoomLevel, viewH = H / zoomLevel;
  camX = Math.max(0, Math.min(WORLD_W - viewW, camX));
  camY = Math.max(0, Math.min(WORLD_H - viewH, camY));

  // HUD
  playerUnitsEl.textContent = playerUnits.length;
  aiUnitsEl.textContent = aiUnitsArr.length;
  scoreEl.textContent = playerKills;
  aiScoreEl.textContent = aiKills;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  timerEl.textContent = mins + ':' + String(secs).padStart(2, '0');
  timerEl.style.color = timeLeft <= 30 ? '#ff4444' : '#aaaaaa';

  const pN = resourceNodes.filter(n => n.owner === 'player').length;
  const aN = resourceNodes.filter(n => n.owner === 'ai').length;
  playerNodesEl.textContent = 'Nodes: ' + pN;
  aiNodesEl.textContent = 'Nodes: ' + aN;

  if (timeLeft <= 30) statusEl.textContent = 'FINAL SECONDS!';
  else if (playerUnits.length > aiUnitsArr.length * 1.5) statusEl.textContent = 'ADVANTAGE!';
  else if (aiUnitsArr.length > playerUnits.length * 1.5) statusEl.textContent = 'OUTNUMBERED!';
  else statusEl.textContent = 'Battle raging...';
}

// ─────────────────────────── createGame ──────────────────────────────────

export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    initGame();
    game.showOverlay('SWARM CONTROL', 'Direct your swarm. Destroy the enemy hive.');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    doUpdate(dt);
  };

  game.onDraw = (renderer, text) => {
    const now = performance.now();

    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a14');

    // Grid + world border
    drawGrid(renderer);

    // Resource nodes
    for (const node of resourceNodes) drawNode(renderer, text, node, now);

    // Hives
    drawHive(renderer, text, playerHive, '#44aaff', 'YOU', now);
    drawHive(renderer, text, aiHive, '#ff4444', 'AI', now);

    // Units
    drawUnits(renderer, text, playerUnits, '#44aaff', '#2299ff');
    drawUnits(renderer, text, aiUnitsArr, '#ff4444', '#ff6666');

    // Particles
    for (const p of particles) {
      const alpha = Math.floor((p.life / 30) * 255).toString(16).padStart(2, '0');
      renderer.fillRect(wx(p.x) - ws(1), wy(p.y) - ws(1), ws(2), ws(2), p.color + alpha);
    }

    // Drag line
    if (isDragging && game.state === 'playing') {
      drawDragLine(renderer, text);
    }

    // Minimap
    drawMinimap(renderer, text);
  };

  // Mouse input — direct canvas listeners (no engine mouse needed for game logic)
  const canvas = game.canvas;

  canvas.addEventListener('mousedown', (e) => {
    if (game.state === 'waiting' || game.state === 'over') {
      initGame();
      game.hideOverlay();
      game.setState('playing');
      return;
    }
    const rect = canvas.getBoundingClientRect();
    dragStartX = (e.clientX - rect.left) * (W / rect.width);
    dragStartY = (e.clientY - rect.top) * (H / rect.height);
    dragEndX = dragStartX;
    dragEndY = dragStartY;
    isDragging = true;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    dragEndX = (e.clientX - rect.left) * (W / rect.width);
    dragEndY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (game.state !== 'playing') return;
    if (!isDragging) return;
    isDragging = false;

    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (W / rect.width);
    const endY = (e.clientY - rect.top) * (H / rect.height);

    const dx = endX - dragStartX;
    const dy = endY - dragStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DRAG_THRESHOLD) {
      // Click: move entire swarm
      const world = screenToWorld(endX, endY);
      for (const u of playerUnits) { u.targetX = world.x; u.targetY = world.y; }
    } else {
      // Drag: split swarm
      const endWorld = screenToWorld(endX, endY);
      const startWorld = screenToWorld(dragStartX, dragStartY);
      const sorted = [...playerUnits].sort((a, b) => {
        const da = (a.x - startWorld.x) ** 2 + (a.y - startWorld.y) ** 2;
        const db = (b.x - startWorld.x) ** 2 + (b.y - startWorld.y) ** 2;
        return da - db;
      });
      const splitCount = Math.max(1, Math.floor(sorted.length * 0.5));
      for (let i = 0; i < splitCount; i++) {
        sorted[i].targetX = endWorld.x;
        sorted[i].targetY = endWorld.y;
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const oldZoom = zoomLevel;
    if (e.deltaY < 0) zoomLevel = Math.min(2.0, zoomLevel + 0.1);
    else zoomLevel = Math.max(0.5, zoomLevel - 0.1);

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const worldX = mx / oldZoom + camX;
    const worldY = my / oldZoom + camY;
    camX = worldX - mx / zoomLevel;
    camY = worldY - my / zoomLevel;

    const viewW = W / zoomLevel, viewH = H / zoomLevel;
    camX = Math.max(0, Math.min(WORLD_W - viewW, camX));
    camY = Math.max(0, Math.min(WORLD_H - viewH, camY));
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.start();
  return game;
}
