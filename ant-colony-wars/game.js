// ant-colony-wars/game.js — WebGL 2 port

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const QUEEN_RADIUS = 8;
const ANT_SPEED = 1.2;
const FOOD_SPAWN_INTERVAL = 8; // seconds

// ---- Shared module-scope state ----
let player, ai, foodSources;
let score, aiScoreVal, gameTime;
let selectedRole = 'worker';
let lastFoodSpawn = 0;
let frameCounter = 0;

// DOM references for score bar and controls
let scoreEl, aiScoreEl, playerFoodEl, aiFoodEl, playerAntsEl, aiAntsEl, timerEl, controlsDiv;
let btnSpawn, btnRaid;

// ---- Colony helpers ----
function createColony(side) {
  const isLeft = side === 'left';
  const baseX = isLeft ? 80 : W - 80;
  const baseY = 200;
  return {
    side, isLeft,
    queenX: baseX, queenY: baseY,
    queenHP: 100,
    food: 50, score: 0,
    antsProduced: 20, foodGathered: 0,
    ants: [], tunnels: [],
    raidActive: false, raidCooldown: 0,
    workerTarget: 12, soldierTarget: 4, diggerTarget: 4
  };
}

function createAnt(colony, role) {
  return {
    x: colony.queenX + (Math.random() - 0.5) * 20,
    y: colony.queenY + (Math.random() - 0.5) * 20,
    role,
    hp: role === 'soldier' ? 3 : 1,
    carrying: 0,
    targetX: null, targetY: null,
    state: 'idle',
    speed: ANT_SPEED * (0.9 + Math.random() * 0.2),
    animOffset: Math.random() * Math.PI * 2,
    _gatherTimer: 0, _foodRef: null, _digTimer: 0
  };
}

// ---- Tunnel helpers ----
function initTunnels(colony) {
  const bx = colony.queenX, by = colony.queenY;
  const dir = colony.isLeft ? 1 : -1;
  colony.tunnels.push({ x1: bx - 25, y1: by - 20, x2: bx + 25, y2: by + 20, type: 'chamber' });
  colony.tunnels.push({ x1: bx, y1: by - 5, x2: bx + dir * 80, y2: by + 5, type: 'tunnel' });
  colony.tunnels.push({ x1: bx + dir * 40, y1: by - 5, x2: bx + dir * 40, y2: by - 50, type: 'tunnel' });
  colony.tunnels.push({ x1: bx + dir * 35, y1: by - 55, x2: bx + dir * 70, y2: by - 35, type: 'chamber' });
  colony.tunnels.push({ x1: bx + dir * 60, y1: by - 5, x2: bx + dir * 60, y2: by + 50, type: 'tunnel' });
  colony.tunnels.push({ x1: bx + dir * 45, y1: by + 40, x2: bx + dir * 80, y2: by + 65, type: 'chamber' });
}

function expandTunnel(colony) {
  const lastTunnel = colony.tunnels[colony.tunnels.length - 1];
  const dir = colony.isLeft ? 1 : -1;
  const cx = (lastTunnel.x1 + lastTunnel.x2) / 2;
  const cy = (lastTunnel.y1 + lastTunnel.y2) / 2;
  const targetX = cx + dir * (40 + Math.random() * 30);
  const targetY = cy + (Math.random() - 0.5) * 60;
  const clampedX = Math.max(30, Math.min(W - 30, targetX));
  const clampedY = Math.max(60, Math.min(H - 60, targetY));
  colony.tunnels.push({ x1: cx - 3, y1: cy - 3, x2: clampedX, y2: clampedY, type: 'tunnel' });
  colony.tunnels.push({
    x1: clampedX - 15, y1: clampedY - 12,
    x2: clampedX + 15, y2: clampedY + 12,
    type: 'chamber'
  });
}

// ---- Food helpers ----
function spawnFoodSource() {
  const x = 180 + Math.random() * (W - 360);
  const y = 80 + Math.random() * (H - 160);
  foodSources.push({ x, y, amount: 15 + Math.floor(Math.random() * 20), maxAmount: 30 });
}

function initFoodSources() {
  for (let i = 0; i < 6; i++) spawnFoodSource();
}

// ---- Init ----
function init() {
  player = createColony('left');
  ai = createColony('right');
  initTunnels(player);
  initTunnels(ai);
  for (let i = 0; i < 20; i++) {
    const role = i < 12 ? 'worker' : (i < 16 ? 'soldier' : 'digger');
    player.ants.push(createAnt(player, role));
    ai.ants.push(createAnt(ai, role));
  }
  foodSources = [];
  initFoodSources();
  gameTime = 300;
  score = 0;
  aiScoreVal = 0;
  lastFoodSpawn = 0;
  frameCounter = 0;
  selectedRole = 'worker';
}

// ---- Role Assignment (exposed globally for button onclick) ----
function setRole(role) {
  selectedRole = role;
  document.getElementById('btnWorker').classList.toggle('active', role === 'worker');
  document.getElementById('btnSoldier').classList.toggle('active', role === 'soldier');
  document.getElementById('btnDigger').classList.toggle('active', role === 'digger');
}

function spawnAnts() {
  if (!player || player.food < 10) return;
  player.food -= 10;
  player.ants.push(createAnt(player, selectedRole));
  player.antsProduced++;
}

function launchRaid(game) {
  if (game.state !== 'playing') return;
  if (player.raidCooldown > 0) return;
  const soldiers = player.ants.filter(a => a.role === 'soldier' && a.state !== 'raiding');
  if (soldiers.length < 2) return;
  soldiers.forEach(s => {
    s.state = 'raiding';
    s.targetX = ai.queenX + (Math.random() - 0.5) * 30;
    s.targetY = ai.queenY + (Math.random() - 0.5) * 30;
  });
  player.raidActive = true;
  player.raidCooldown = 600;
}

// ---- AI Logic ----
function aiThink() {
  const totalAnts = ai.ants.length;
  const workerCount = ai.ants.filter(a => a.role === 'worker').length;
  const soldierCount = ai.ants.filter(a => a.role === 'soldier').length;
  const diggerCount = ai.ants.filter(a => a.role === 'digger').length;

  const timeRatio = gameTime / 300;
  let wantWorkers, wantSoldiers, wantDiggers;

  if (timeRatio > 0.6) {
    wantWorkers = 0.6; wantSoldiers = 0.2; wantDiggers = 0.2;
  } else if (timeRatio > 0.3) {
    wantWorkers = 0.4; wantSoldiers = 0.4; wantDiggers = 0.2;
  } else {
    wantWorkers = 0.3; wantSoldiers = 0.6; wantDiggers = 0.1;
  }

  if (ai.queenHP < 70) {
    wantSoldiers = Math.min(0.7, wantSoldiers + 0.2);
    wantWorkers = 1 - wantSoldiers - wantDiggers;
  }

  if (ai.food >= 10 && totalAnts < 60) {
    const workerRatio = totalAnts > 0 ? workerCount / totalAnts : 0;
    const soldierRatio = totalAnts > 0 ? soldierCount / totalAnts : 0;
    let role = 'worker';
    if (workerRatio > wantWorkers && soldierRatio < wantSoldiers) role = 'soldier';
    else if (workerRatio > wantWorkers && soldierRatio >= wantSoldiers) role = 'digger';
    ai.food -= 10;
    ai.ants.push(createAnt(ai, role));
    ai.antsProduced++;
  }

  if (diggerCount > 0 && ai.tunnels.length < 20 && Math.random() < 0.005) {
    expandTunnel(ai);
  }

  ai.raidCooldown = Math.max(0, ai.raidCooldown - 1);
  if (ai.raidCooldown <= 0 && soldierCount >= 3 && timeRatio < 0.7) {
    const soldiers = ai.ants.filter(a => a.role === 'soldier' && a.state !== 'raiding');
    if (soldiers.length >= 3) {
      soldiers.forEach(s => {
        s.state = 'raiding';
        s.targetX = player.queenX + (Math.random() - 0.5) * 30;
        s.targetY = player.queenY + (Math.random() - 0.5) * 30;
      });
      ai.raidActive = true;
      ai.raidCooldown = 480 + Math.random() * 300;
    }
  }
}

// ---- Ant movement ----
function findNearestFood(ant) {
  let best = null, bestDist = Infinity;
  for (const f of foodSources) {
    if (f.amount <= 0) continue;
    const d = Math.hypot(f.x - ant.x, f.y - ant.y);
    if (d < bestDist) { bestDist = d; best = f; }
  }
  return best;
}

function moveToward(ant, tx, ty) {
  const dx = tx - ant.x, dy = ty - ant.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  ant.x += (dx / dist) * ant.speed;
  ant.y += (dy / dist) * ant.speed;
  return false;
}

function updateAnts(colony, enemyColony) {
  for (let i = colony.ants.length - 1; i >= 0; i--) {
    const ant = colony.ants[i];

    if (ant.role === 'worker') {
      if (ant.state === 'idle' || ant.state === 'moving') {
        const food = findNearestFood(ant);
        if (food) {
          ant.targetX = food.x;
          ant.targetY = food.y;
          ant.state = 'moving';
          if (moveToward(ant, food.x, food.y)) {
            ant.state = 'gathering';
            ant._gatherTimer = 60;
            ant._foodRef = food;
          }
        } else {
          if (!ant.targetX || Math.random() < 0.01) {
            ant.targetX = colony.queenX + (colony.isLeft ? 1 : -1) * (30 + Math.random() * 100);
            ant.targetY = colony.queenY + (Math.random() - 0.5) * 100;
          }
          moveToward(ant, ant.targetX, ant.targetY);
        }
      } else if (ant.state === 'gathering') {
        ant._gatherTimer--;
        if (ant._gatherTimer <= 0) {
          if (ant._foodRef && ant._foodRef.amount > 0) {
            const take = Math.min(3, ant._foodRef.amount);
            ant.carrying = take;
            ant._foodRef.amount -= take;
          }
          ant.state = 'returning';
        }
      } else if (ant.state === 'returning') {
        if (moveToward(ant, colony.queenX, colony.queenY)) {
          colony.food += ant.carrying;
          colony.foodGathered += ant.carrying;
          ant.carrying = 0;
          ant.state = 'idle';
        }
      }
    }

    if (ant.role === 'soldier') {
      if (ant.state === 'raiding') {
        if (moveToward(ant, ant.targetX, ant.targetY)) {
          if (Math.hypot(ant.x - enemyColony.queenX, ant.y - enemyColony.queenY) < 30) {
            enemyColony.queenHP -= 0.15;
          }
          for (let j = enemyColony.ants.length - 1; j >= 0; j--) {
            const enemy = enemyColony.ants[j];
            if (Math.hypot(ant.x - enemy.x, ant.y - enemy.y) < 12) {
              enemy.hp -= 0.05;
              ant.hp -= 0.02;
              if (enemy.hp <= 0) enemyColony.ants.splice(j, 1);
            }
          }
          if (Math.random() < 0.02) {
            ant.targetX = enemyColony.queenX + (Math.random() - 0.5) * 50;
            ant.targetY = enemyColony.queenY + (Math.random() - 0.5) * 50;
          }
        }
      } else {
        if (!ant.targetX || Math.random() < 0.01) {
          ant.targetX = colony.queenX + (Math.random() - 0.5) * 60;
          ant.targetY = colony.queenY + (Math.random() - 0.5) * 60;
        }
        moveToward(ant, ant.targetX, ant.targetY);
        for (let j = enemyColony.ants.length - 1; j >= 0; j--) {
          const enemy = enemyColony.ants[j];
          if (enemy.state === 'raiding' && Math.hypot(ant.x - enemy.x, ant.y - enemy.y) < 20) {
            ant.targetX = enemy.x;
            ant.targetY = enemy.y;
            enemy.hp -= 0.04;
            ant.hp -= 0.02;
            if (enemy.hp <= 0) enemyColony.ants.splice(j, 1);
          }
        }
      }
    }

    if (ant.role === 'digger') {
      if (ant.state === 'idle' || ant.state === 'digging' || ant.state === 'moving') {
        const lastT = colony.tunnels[colony.tunnels.length - 1];
        const tx = (lastT.x1 + lastT.x2) / 2;
        const ty = (lastT.y1 + lastT.y2) / 2;
        if (moveToward(ant, tx, ty)) {
          ant.state = 'digging';
          ant._digTimer = (ant._digTimer || 0) + 1;
          if (ant._digTimer > 200 && colony.tunnels.length < 18) {
            expandTunnel(colony);
            ant._digTimer = 0;
          }
        } else {
          ant.state = 'moving';
        }
      }
    }

    if (ant.hp <= 0) colony.ants.splice(i, 1);
  }
}

// ---- Ellipse approximation for fillPoly ----
function ellipsePoints(cx, cy, rx, ry, steps) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

// ---- Thick tunnel segment as a quad polygon ----
function tunnelSegmentPoints(x1, y1, x2, y2, half) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * half, ny = dx / len * half;
  return [
    { x: x1 + nx, y: y1 + ny },
    { x: x2 + nx, y: y2 + ny },
    { x: x2 - nx, y: y2 - ny },
    { x: x1 - nx, y: y1 - ny },
  ];
}

// ---- Pre-built static background geometry (computed once) ----
let bgGeometry = null;
function buildBgGeometry() {
  // Dirt dots
  const dots = [];
  for (let i = 0; i < 80; i++) {
    dots.push({
      x: (i * 73 + 17) % W,
      y: 60 + (i * 47 + 31) % (H - 70),
      r: 1 + (i % 3)
    });
  }
  // Small rocks
  const rocks = [];
  for (let i = 0; i < 15; i++) {
    rocks.push({
      x: (i * 137 + 53) % W,
      y: 80 + (i * 89 + 29) % (H - 100),
      rx: 3 + (i % 3),
      ry: 2 + (i % 2)
    });
  }
  // Grass blade base X positions
  const grassX = [];
  for (let x = 5; x < W; x += 8) grassX.push(x);
  bgGeometry = { dots, rocks, grassX };
}

// ---- Draw helpers (using renderer / text) ----

function drawBackground(renderer, text, t) {
  const bg = bgGeometry;

  // Sky band at top (two quads blended with colors)
  renderer.fillRect(0, 0, W, 50, '#1a2a3e');
  renderer.fillRect(0, 30, W, 20, '#2a1a0e');

  // Ground surface wavy line — approximate with short segments
  for (let x = 0; x <= W - 10; x += 10) {
    const y0 = 50 + Math.sin(x * 0.05) * 3;
    const y1 = 50 + Math.sin((x + 10) * 0.05) * 3;
    renderer.drawLine(x, y0, x + 10, y1, '#4a3', 2);
  }

  // Animated grass blades
  for (const gx of bg.grassX) {
    const h = 5 + Math.sin(gx * 0.3) * 3;
    const sway = Math.sin(t * 0.001 + gx) * 2;
    renderer.drawLine(gx, 50, gx + sway, 50 - h, '#5a4', 1);
  }

  // Earth fill
  renderer.fillRect(0, 50, W, H - 50, '#3a2815');
  renderer.fillRect(0, 50 + (H - 50) * 0.3, W, (H - 50) * 0.7, '#1a1208');

  // Dirt texture dots (semi-transparent via rgba color)
  for (const d of bg.dots) {
    renderer.fillCircle(d.x, d.y, d.r, 'rgba(80,55,30,0.3)');
  }

  // Small rocks
  for (const r of bg.rocks) {
    const pts = ellipsePoints(r.x, r.y, r.rx, r.ry, 12);
    renderer.fillPoly(pts, '#4a3a2a');
  }

  // Dividing dashed line (manual dash segments)
  const dashLen = 4, gapLen = 4;
  for (let y = 55; y < H; y += dashLen + gapLen) {
    renderer.drawLine(W / 2, y, W / 2, Math.min(y + dashLen, H), 'rgba(170,102,34,0.15)', 1);
  }

  // Colony labels
  text.drawText('YOUR COLONY', 120, 34, 10, '#664422', 'center');
  text.drawText('ENEMY COLONY', W - 120, 34, 10, '#664422', 'center');
}

function drawTunnels(renderer, colony, color) {
  for (const t of colony.tunnels) {
    const cx = (t.x1 + t.x2) / 2;
    const cy = (t.y1 + t.y2) / 2;
    if (t.type === 'chamber') {
      const rw = Math.abs(t.x2 - t.x1) / 2 + 4;
      const rh = Math.abs(t.y2 - t.y1) / 2 + 4;
      const pts = ellipsePoints(cx, cy, rw, rh, 20);
      renderer.fillPoly(pts, color);
    } else {
      // Thick tunnel segment (10px wide)
      const pts = tunnelSegmentPoints(t.x1, t.y1, t.x2, t.y2, 5);
      renderer.fillPoly(pts, color);
    }
  }
}

function drawQueen(renderer, text, colony, color, pulseT) {
  const pulse = Math.sin(pulseT * 0.003) * 2;
  const rx = QUEEN_RADIUS + pulse;
  const ry = QUEEN_RADIUS * 0.7 + pulse * 0.5;
  const pts = ellipsePoints(colony.queenX, colony.queenY, rx, ry, 24);
  renderer.setGlow(color, 0.5);
  renderer.fillPoly(pts, color);
  renderer.setGlow(null);

  // Crown outline
  renderer.strokePoly(pts, '#ffffff80', 1, true);

  // Crown shape (7 points)
  const qx = colony.queenX, qy = colony.queenY - QUEEN_RADIUS - 3;
  const crownPts = [
    { x: qx - 5, y: qy + 4 },
    { x: qx - 5, y: qy },
    { x: qx - 3, y: qy + 2 },
    { x: qx,     y: qy - 2 },
    { x: qx + 3, y: qy + 2 },
    { x: qx + 5, y: qy },
    { x: qx + 5, y: qy + 4 },
  ];
  renderer.fillPoly(crownPts, '#ffd700');

  // HP bar
  const hpW = 30;
  const hpX = colony.queenX - hpW / 2;
  const hpY = colony.queenY + QUEEN_RADIUS + 6;
  renderer.fillRect(hpX, hpY, hpW, 4, '#333333');
  const hpColor = colony.queenHP > 50 ? '#44aa44' : (colony.queenHP > 25 ? '#aa8844' : '#aa4444');
  renderer.fillRect(hpX, hpY, hpW * (colony.queenHP / 100), 4, hpColor);
}

function drawAnts(renderer, colony, t) {
  for (const ant of colony.ants) {
    const wobble = Math.sin(t * 0.01 + ant.animOffset) * 0.8;

    let color;
    if (ant.role === 'worker') color = colony.isLeft ? '#88bb66' : '#bb8866';
    else if (ant.role === 'soldier') color = colony.isLeft ? '#6666bb' : '#bb4444';
    else color = colony.isLeft ? '#bbaa55' : '#aa88aa';

    if (ant.state === 'raiding') color = '#ff4444';

    const ax = ant.x + wobble;

    // Body head
    renderer.fillCircle(ax, ant.y, 2.5, color);
    // Body abdomen
    renderer.fillCircle(ant.x - 2 + wobble * 0.5, ant.y + 1, 2, color);

    // Legs (3 pairs)
    for (let l = -1; l <= 1; l++) {
      const lx = ant.x + l * 2 + wobble * 0.3;
      const ly = ant.y + 2;
      const legTip = Math.sin(t * 0.01 + ant.animOffset + l) * 2;
      renderer.drawLine(lx, ly, lx + legTip, ly + 2.5, color, 0.5);
    }

    // Carrying dot
    if (ant.carrying > 0) {
      renderer.fillCircle(ant.x + 3, ant.y - 3, 1.5, '#66bb33');
    }
  }
}

function drawFood(renderer, text) {
  for (const f of foodSources) {
    const size = 3 + (f.amount / f.maxAmount) * 6;
    renderer.setGlow('#55aa33', 0.3);
    renderer.fillCircle(f.x, f.y, size, '#55aa33');
    renderer.fillCircle(f.x - 1, f.y - 1, size * 0.6, '#77cc44');
    renderer.setGlow(null);
    text.drawText(String(f.amount), f.x, f.y - size - 11, 8, '#cccccc', 'center');
  }
}

function drawBattleEffects(renderer, t) {
  const allAnts = [...player.ants, ...ai.ants];
  for (const ant of allAnts) {
    if (ant.state === 'raiding' && Math.random() < 0.3) {
      const ox = (Math.random() - 0.5) * 8;
      const oy = (Math.random() - 0.5) * 8;
      const g = Math.floor(100 + Math.random() * 155);
      renderer.fillCircle(ant.x + ox, ant.y + oy, 1, `rgba(255,${g},50,0.7)`);
    }
  }
}

function drawRoleCount(text, colony, x, y) {
  const workers = colony.ants.filter(a => a.role === 'worker').length;
  const soldiers = colony.ants.filter(a => a.role === 'soldier').length;
  const diggers = colony.ants.filter(a => a.role === 'digger').length;
  const wColor = colony.isLeft ? '#88bb66' : '#bb8866';
  const sColor = colony.isLeft ? '#6666bb' : '#bb4444';
  const dColor = colony.isLeft ? '#bbaa55' : '#aa88aa';
  text.drawText(`W:${workers}`, x, y - 9, 9, wColor, 'left');
  text.drawText(`S:${soldiers}`, x + 30, y - 9, 9, sColor, 'left');
  text.drawText(`D:${diggers}`, x + 60, y - 9, 9, dColor, 'left');
}

// ---- endGame ----
function endGame(reason, game) {
  game.setState('over');
  controlsDiv.style.display = 'none';
  if (reason === 'playerWin') {
    game.showOverlay('VICTORY!', `Enemy queen destroyed! Score: ${score}. Click to play again.`);
  } else if (reason === 'aiWin') {
    game.showOverlay('DEFEAT', `Your queen was killed! Score: ${score}. Click to play again.`);
  } else {
    if (score > aiScoreVal) {
      game.showOverlay('VICTORY!', `Time up! You: ${score} vs AI: ${aiScoreVal}. Click to play again.`);
    } else if (score < aiScoreVal) {
      game.showOverlay('DEFEAT', `Time up! You: ${score} vs AI: ${aiScoreVal}. Click to play again.`);
    } else {
      game.showOverlay('DRAW', `Time up! Both scored ${score}. Click to play again.`);
    }
  }
}

// ---- Main export ----
export function createGame() {
  buildBgGeometry();

  // Grab DOM refs
  scoreEl       = document.getElementById('score');
  aiScoreEl     = document.getElementById('aiScore');
  playerFoodEl  = document.getElementById('playerFood');
  aiFoodEl      = document.getElementById('aiFood');
  playerAntsEl  = document.getElementById('playerAnts');
  aiAntsEl      = document.getElementById('aiAnts');
  timerEl       = document.getElementById('timer');
  controlsDiv   = document.getElementById('controls');
  btnSpawn      = document.getElementById('btnSpawn');
  btnRaid       = document.getElementById('btnRaid');

  // Expose button handlers globally so onclick attributes work
  window.setRole   = setRole;
  window.spawnAnts = spawnAnts;

  const game = new Game('game');

  game.onInit = () => {
    init();
    game.showOverlay('ANT COLONY WARS', 'Click anywhere to start');
    game.setState('waiting');
    if (controlsDiv) controlsDiv.style.display = 'none';
    // Reset button active state
    document.getElementById('btnWorker').classList.add('active');
    document.getElementById('btnSoldier').classList.remove('active');
    document.getElementById('btnDigger').classList.remove('active');
  };

  // Expose launchRaid globally with game reference
  window.launchRaid = () => launchRaid(game);

  game.setScoreFn(() => score);

  // ---- Canvas click handler ----
  const canvas = document.getElementById('game');
  canvas.addEventListener('click', (e) => {
    if (game.state === 'waiting') {
      game.setState('playing');
      if (controlsDiv) controlsDiv.style.display = 'flex';
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      game.setState('playing');
      if (controlsDiv) controlsDiv.style.display = 'flex';
      return;
    }
    if (game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    // Direct workers to clicked food source
    for (const f of foodSources) {
      if (Math.hypot(mx - f.x, my - f.y) < 15) {
        player.ants.filter(a => a.role === 'worker' && a.state !== 'returning').forEach(w => {
          w.targetX = f.x;
          w.targetY = f.y;
          w.state = 'moving';
        });
        return;
      }
    }

    // Click on left side: expand tunnel toward point
    if (mx < W / 2 && player.tunnels.length < 18) {
      const diggers = player.ants.filter(a => a.role === 'digger');
      if (diggers.length > 0) {
        const lastT = player.tunnels[player.tunnels.length - 1];
        const cx = (lastT.x1 + lastT.x2) / 2;
        const cy = (lastT.y1 + lastT.y2) / 2;
        const clampedX = Math.max(30, Math.min(W / 2 + 50, mx));
        const clampedY = Math.max(60, Math.min(H - 30, my));
        player.tunnels.push({ x1: cx - 3, y1: cy - 3, x2: clampedX, y2: clampedY, type: 'tunnel' });
        player.tunnels.push({
          x1: clampedX - 15, y1: clampedY - 12,
          x2: clampedX + 15, y2: clampedY + 12,
          type: 'chamber'
        });
      }
    }
  });

  // ---- Update ----
  game.onUpdate = (dt) => {
    frameCounter++;
    if (game.state !== 'playing') return;

    // dt is in ms (fixed 1000/60 ms per tick)
    const dtSec = dt / 1000;

    gameTime -= dtSec;
    if (gameTime <= 0) {
      gameTime = 0;
      endGame('time', game);
      return;
    }

    player.raidCooldown = Math.max(0, player.raidCooldown - 1);

    aiThink();
    updateAnts(player, ai);
    updateAnts(ai, player);

    lastFoodSpawn += dtSec;
    if (lastFoodSpawn > FOOD_SPAWN_INTERVAL && foodSources.length < 10) {
      spawnFoodSource();
      lastFoodSpawn = 0;
    }
    foodSources = foodSources.filter(f => f.amount > 0);

    score = player.antsProduced + player.foodGathered;
    aiScoreVal = ai.antsProduced + ai.foodGathered;

    if (ai.queenHP <= 0)     { endGame('playerWin', game); return; }
    if (player.queenHP <= 0) { endGame('aiWin', game);     return; }

    // Update DOM score bar
    if (scoreEl)      scoreEl.textContent      = score;
    if (aiScoreEl)    aiScoreEl.textContent    = aiScoreVal;
    if (playerFoodEl) playerFoodEl.textContent = Math.floor(player.food);
    if (aiFoodEl)     aiFoodEl.textContent     = Math.floor(ai.food);
    if (playerAntsEl) playerAntsEl.textContent = player.ants.length;
    if (aiAntsEl)     aiAntsEl.textContent     = ai.ants.length;

    const mins = Math.floor(gameTime / 60);
    const secs = Math.floor(gameTime % 60);
    if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Update button labels
    if (btnSpawn) btnSpawn.textContent =
      player.food >= 10 ? `Spawn ${selectedRole} (10 food)` : 'Need food...';
    if (btnRaid) btnRaid.textContent =
      player.raidCooldown > 0 ? `Raid (${Math.ceil(player.raidCooldown / 60)}s)` : 'Raid Enemy!';
  };

  // ---- Draw ----
  game.onDraw = (renderer, text) => {
    const t = frameCounter; // integer frame counter, used for animation phase

    drawBackground(renderer, text, t);

    if (!player || !ai) return;

    // Tunnels fill
    drawTunnels(renderer, player, 'rgba(100,70,40,0.7)');
    drawTunnels(renderer, ai,     'rgba(90,50,50,0.7)');

    // Chamber outlines for player and ai
    for (const colony of [player, ai]) {
      for (const t2 of colony.tunnels) {
        if (t2.type === 'chamber') {
          const cx = (t2.x1 + t2.x2) / 2;
          const cy = (t2.y1 + t2.y2) / 2;
          const rw = Math.abs(t2.x2 - t2.x1) / 2 + 4;
          const rh = Math.abs(t2.y2 - t2.y1) / 2 + 4;
          const pts = ellipsePoints(cx, cy, rw, rh, 20);
          renderer.strokePoly(pts, 'rgba(140,100,60,0.3)', 1, true);
        }
      }
    }

    // Food
    drawFood(renderer, text);

    // Queens
    drawQueen(renderer, text, player, '#66aa66', t);
    drawQueen(renderer, text, ai,     '#aa5555', t);

    // Ants
    drawAnts(renderer, player, t);
    drawAnts(renderer, ai,     t);

    // Battle effects
    drawBattleEffects(renderer, t);

    // Role counts
    drawRoleCount(text, player, 10, H);
    drawRoleCount(text, ai, W - 100, H);
  };

  game.start();
  return game;
}
