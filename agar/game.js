// agar/game.js — Agar.io game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// --- Constants ---
const WORLD_SIZE = 4000;
const GRID_SPACING = 80;
const FOOD_COUNT = 400;
const AI_COUNT = 20;
const MIN_SPLIT_MASS = 36;
const EJECT_MASS = 14;
const MIN_EJECT_MASS = 30;
const MERGE_TIME = 300; // frames before split cells can merge
const BASE_SPEED = 4;

// Neon colors for cells
const CELL_COLORS = [
  '#f44', '#4f4', '#44f', '#ff0', '#f0f', '#0ff',
  '#f80', '#8f0', '#08f', '#f08', '#80f', '#0f8',
  '#fa0', '#af0', '#0af', '#a0f', '#f0a', '#0fa'
];

// AI names
const AI_NAMES = [
  'Bot_Alpha', 'NomNom', 'CellKing', 'BlobMaster', 'Chomper',
  'Mitosis', 'Amoeba', 'SplitGod', 'BigCell', 'TinyTerror',
  'Nucleus', 'Membrane', 'Cytoplasm', 'Phagocyte', 'Microbe',
  'Protozoa', 'Organism', 'Petri', 'Colony', 'Spore',
  'Devourer', 'Absorber', 'GrowBot', 'MassHog', 'Engulfer'
];

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Game State ---
let score = 0;
let best = 0;
let playerCells = [];
let food = [];
let aiCells = [];
let ejectedMass = [];
let camera = { x: 0, y: 0, zoom: 1 };
let mouse = { x: W / 2, y: H / 2, active: false };
let frameCount = 0;
let leaderboard = [];
let aiRespawnQueue = []; // {timer, remaining frames}

// --- Utility ---
function rand(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function massToRadius(mass) { return Math.sqrt(mass) * 4; }
function randColor() { return CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)]; }

// --- Spawn helpers ---
function spawnFood() {
  food.push({
    x: rand(50, WORLD_SIZE - 50),
    y: rand(50, WORLD_SIZE - 50),
    mass: rand(1, 3),
    color: randColor()
  });
}

function spawnAI() {
  const mass = rand(10, 200);
  const spawnMargin = 200;
  aiCells.push({
    x: rand(spawnMargin, WORLD_SIZE - spawnMargin),
    y: rand(spawnMargin, WORLD_SIZE - spawnMargin),
    mass: mass,
    vx: 0,
    vy: 0,
    color: randColor(),
    name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    targetX: rand(200, WORLD_SIZE - 200),
    targetY: rand(200, WORLD_SIZE - 200),
    changeTimer: Math.floor(rand(60, 300)),
    splitCooldown: 0
  });
}

// --- Player helpers ---
function getPlayerCenter() {
  if (playerCells.length === 0) return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
  let tx = 0, ty = 0, tm = 0;
  for (const c of playerCells) {
    tx += c.x * c.mass;
    ty += c.y * c.mass;
    tm += c.mass;
  }
  return { x: tx / tm, y: ty / tm };
}

function getTotalMass() {
  let m = 0;
  for (const c of playerCells) m += c.mass;
  return Math.floor(m);
}

// --- Movement ---
function getTargetDirection(cell, input) {
  const center = getPlayerCenter();
  let tx, ty;

  if (mouse.active) {
    tx = center.x + (mouse.x - W / 2) / camera.zoom;
    ty = center.y + (mouse.y - H / 2) / camera.zoom;
  } else {
    let dx = 0, dy = 0;
    if (input.isDown('ArrowLeft')) dx -= 1;
    if (input.isDown('ArrowRight')) dx += 1;
    if (input.isDown('ArrowUp')) dy -= 1;
    if (input.isDown('ArrowDown')) dy += 1;

    if (dx === 0 && dy === 0) return { dx: 0, dy: 0, dist: 0 };

    const len = Math.hypot(dx, dy);
    tx = cell.x + (dx / len) * 200;
    ty = cell.y + (dy / len) * 200;
  }

  const ddx = tx - cell.x;
  const ddy = ty - cell.y;
  const d = Math.hypot(ddx, ddy);

  if (d < 2) return { dx: 0, dy: 0, dist: 0 };
  return { dx: ddx / d, dy: ddy / d, dist: d };
}

function moveCell(cell, dx, dy, speed) {
  cell.x += dx * speed;
  cell.y += dy * speed;
  const r = massToRadius(cell.mass);
  cell.x = Math.max(r, Math.min(WORLD_SIZE - r, cell.x));
  cell.y = Math.max(r, Math.min(WORLD_SIZE - r, cell.y));
}

// --- Split ---
function splitPlayer(input) {
  const newCells = [];
  for (const cell of playerCells) {
    if (cell.mass < MIN_SPLIT_MASS) continue;
    if (playerCells.length + newCells.length >= 16) break;

    const dir = getTargetDirection(cell, input);
    const sdx = dir.dist > 0 ? dir.dx : 0;
    const sdy = dir.dist > 0 ? dir.dy : (sdx === 0 ? -1 : 0);

    const halfMass = cell.mass / 2;
    cell.mass = halfMass;

    const r = massToRadius(halfMass);
    newCells.push({
      x: cell.x + sdx * r * 4,
      y: cell.y + sdy * r * 4,
      mass: halfMass,
      vx: sdx * 15,
      vy: sdy * 15,
      color: cell.color,
      mergeTimer: MERGE_TIME
    });
  }
  playerCells.push(...newCells);
}

// --- Eject Mass ---
function ejectMassAction(input) {
  for (const cell of playerCells) {
    if (cell.mass < MIN_EJECT_MASS) continue;

    const dir = getTargetDirection(cell, input);
    const edx = dir.dist > 0 ? dir.dx : 0;
    const edy = dir.dist > 0 ? dir.dy : -1;

    cell.mass -= EJECT_MASS;
    const r = massToRadius(cell.mass);
    ejectedMass.push({
      x: cell.x + edx * (r + 10),
      y: cell.y + edy * (r + 10),
      mass: EJECT_MASS,
      vx: edx * 12,
      vy: edy * 12,
      color: cell.color,
      life: 0
    });
  }
}

// --- AI Behavior ---
function updateAI(ai) {
  ai.changeTimer--;
  ai.splitCooldown = Math.max(0, ai.splitCooldown - 1);

  let nearestPrey = null;
  let nearestPreyDist = Infinity;
  let nearestThreat = null;
  let nearestThreatDist = Infinity;

  // Check player cells
  for (const pc of playerCells) {
    const d = dist(ai, pc);
    if (ai.mass > pc.mass * 1.15 && d < nearestPreyDist) {
      nearestPrey = pc;
      nearestPreyDist = d;
    }
    if (pc.mass > ai.mass * 1.15 && d < nearestThreatDist) {
      nearestThreat = pc;
      nearestThreatDist = d;
    }
  }

  // Check other AI cells
  for (const other of aiCells) {
    if (other === ai) continue;
    const d = dist(ai, other);
    if (ai.mass > other.mass * 1.15 && d < nearestPreyDist) {
      nearestPrey = other;
      nearestPreyDist = d;
    }
    if (other.mass > ai.mass * 1.15 && d < nearestThreatDist) {
      nearestThreat = other;
      nearestThreatDist = d;
    }
  }

  // Check food
  let nearestFood = null;
  let nearestFoodDist = Infinity;
  for (const f of food) {
    const d = dist(ai, f);
    if (d < nearestFoodDist) {
      nearestFood = f;
      nearestFoodDist = d;
    }
  }

  const senseRange = massToRadius(ai.mass) * 10 + 200;

  // Decision making
  if (nearestThreat && nearestThreatDist < senseRange) {
    const dx = ai.x - nearestThreat.x;
    const dy = ai.y - nearestThreat.y;
    const d = Math.hypot(dx, dy) || 1;
    ai.targetX = ai.x + (dx / d) * 500;
    ai.targetY = ai.y + (dy / d) * 500;
  } else if (nearestPrey && nearestPreyDist < senseRange) {
    ai.targetX = nearestPrey.x;
    ai.targetY = nearestPrey.y;
  } else if (nearestFood && nearestFoodDist < senseRange * 0.5) {
    ai.targetX = nearestFood.x;
    ai.targetY = nearestFood.y;
  } else if (ai.changeTimer <= 0) {
    ai.targetX = rand(200, WORLD_SIZE - 200);
    ai.targetY = rand(200, WORLD_SIZE - 200);
    ai.changeTimer = Math.floor(rand(120, 400));
  }

  // Move toward target
  const dx = ai.targetX - ai.x;
  const dy = ai.targetY - ai.y;
  const d = Math.hypot(dx, dy);
  if (d > 5) {
    const speed = BASE_SPEED * (30 / (massToRadius(ai.mass) + 20));
    ai.x += (dx / d) * speed;
    ai.y += (dy / d) * speed;
  }

  // Clamp to world
  const r = massToRadius(ai.mass);
  ai.x = Math.max(r, Math.min(WORLD_SIZE - r, ai.x));
  ai.y = Math.max(r, Math.min(WORLD_SIZE - r, ai.y));

  // Slow mass decay for large AI cells
  if (ai.mass > 100) {
    ai.mass *= 0.9998;
  }
}

// --- Collision helpers ---
function canEat(eater, prey) {
  return eater.mass > prey.mass * 1.15;
}

function overlaps(a, b) {
  const ra = massToRadius(a.mass);
  const rb = massToRadius(b.mass);
  const d = dist(a, b);
  return d < ra - rb * 0.4;
}

// --- Leaderboard ---
function updateLeaderboard() {
  leaderboard = [];
  const totalMass = getTotalMass();
  if (totalMass > 0) {
    leaderboard.push({ name: 'You', mass: totalMass, isPlayer: true });
  }
  for (const ai of aiCells) {
    leaderboard.push({ name: ai.name, mass: Math.floor(ai.mass), isPlayer: false });
  }
  leaderboard.sort((a, b) => b.mass - a.mass);
  leaderboard = leaderboard.slice(0, 10);
}

// --- World to screen ---
function worldToScreen(wx, wy) {
  return {
    x: (wx - camera.x) * camera.zoom + W / 2,
    y: (wy - camera.y) * camera.zoom + H / 2
  };
}

// --- Color helper: expand shorthand hex to full hex and add alpha ---
function colorWithAlpha(hexColor, alpha) {
  // Expand #rgb to #rrggbb
  let hex = hexColor;
  if (hex.length === 4) { // #rgb
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  // Append alpha as 2-digit hex
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + alphaHex;
}

// --- Circle approximation with polygon for outlined/alpha circles ---
function circlePoints(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export function createGame() {
  const game = new Game('game');
  const canvas = document.getElementById('game');

  // Mouse tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.active = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    frameCount = 0;
    playerCells = [];
    food = [];
    aiCells = [];
    ejectedMass = [];
    aiRespawnQueue = [];
    mouse = { x: W / 2, y: H / 2, active: false };
    leaderboard = [];
    camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 };
    game.showOverlay('AGAR.IO', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
          || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        // Start game
        playerCells = [{
          x: WORLD_SIZE / 2,
          y: WORLD_SIZE / 2,
          mass: 20,
          vx: 0,
          vy: 0,
          color: '#a6c',
          mergeTimer: 0
        }];

        food = [];
        for (let i = 0; i < FOOD_COUNT; i++) {
          spawnFood();
        }

        aiCells = [];
        for (let i = 0; i < AI_COUNT; i++) {
          spawnAI();
        }

        ejectedMass = [];
        aiRespawnQueue = [];
        score = 20;
        scoreEl.textContent = score;
        frameCount = 0;
        leaderboard = [];

        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Handle split/eject
    if (input.wasPressed(' ')) {
      splitPlayer(input);
    }
    if (input.wasPressed('w') || input.wasPressed('W')) {
      ejectMassAction(input);
    }

    // Move player cells
    for (const cell of playerCells) {
      const dir = getTargetDirection(cell, input);
      if (dir.dist > 0) {
        const speed = BASE_SPEED * (30 / (massToRadius(cell.mass) + 20));
        const factor = Math.min(1, dir.dist / 100);
        moveCell(cell, dir.dx * factor, dir.dy * factor, speed);
      }

      // Apply velocity (from splitting)
      if (Math.abs(cell.vx) > 0.1 || Math.abs(cell.vy) > 0.1) {
        cell.x += cell.vx;
        cell.y += cell.vy;
        cell.vx *= 0.9;
        cell.vy *= 0.9;
        const r = massToRadius(cell.mass);
        cell.x = Math.max(r, Math.min(WORLD_SIZE - r, cell.x));
        cell.y = Math.max(r, Math.min(WORLD_SIZE - r, cell.y));
      }

      // Merge timer
      if (cell.mergeTimer > 0) cell.mergeTimer--;

      // Slow mass decay for large player cells
      if (cell.mass > 100) {
        cell.mass *= 0.9999;
      }
    }

    // Merge player cells
    for (let i = 0; i < playerCells.length; i++) {
      for (let j = i + 1; j < playerCells.length; j++) {
        const a = playerCells[i];
        const b = playerCells[j];
        if (a.mergeTimer > 0 || b.mergeTimer > 0) continue;
        const ra = massToRadius(a.mass);
        const rb = massToRadius(b.mass);
        const d = dist(a, b);
        if (d < ra + rb - Math.min(ra, rb) * 0.5) {
          const totalM = a.mass + b.mass;
          a.x = (a.x * a.mass + b.x * b.mass) / totalM;
          a.y = (a.y * a.mass + b.y * b.mass) / totalM;
          a.mass = totalM;
          playerCells.splice(j, 1);
          j--;
        }
      }
    }

    // Separate overlapping player cells that can't merge
    for (let i = 0; i < playerCells.length; i++) {
      for (let j = i + 1; j < playerCells.length; j++) {
        const a = playerCells[i];
        const b = playerCells[j];
        const ra = massToRadius(a.mass);
        const rb = massToRadius(b.mass);
        const d = dist(a, b);
        const minDist = ra + rb;
        if (d < minDist && d > 0) {
          const overlap = minDist - d;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const push = overlap * 0.3;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    // Player eats food
    for (const cell of playerCells) {
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i];
        const d = dist(cell, f);
        if (d < massToRadius(cell.mass)) {
          cell.mass += f.mass;
          food.splice(i, 1);
          spawnFood();
        }
      }
    }

    // Player eats ejected mass
    for (const cell of playerCells) {
      for (let i = ejectedMass.length - 1; i >= 0; i--) {
        const e = ejectedMass[i];
        if (e.life < 10) continue;
        const d = dist(cell, e);
        if (d < massToRadius(cell.mass)) {
          cell.mass += e.mass;
          ejectedMass.splice(i, 1);
        }
      }
    }

    // Update ejected mass
    for (let i = ejectedMass.length - 1; i >= 0; i--) {
      const e = ejectedMass[i];
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.92;
      e.vy *= 0.92;
      e.life++;
      e.x = Math.max(0, Math.min(WORLD_SIZE, e.x));
      e.y = Math.max(0, Math.min(WORLD_SIZE, e.y));
      if (e.life > 600) {
        ejectedMass.splice(i, 1);
      }
    }

    // AI eats food
    for (const ai of aiCells) {
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i];
        const d = dist(ai, f);
        if (d < massToRadius(ai.mass)) {
          ai.mass += f.mass;
          food.splice(i, 1);
          spawnFood();
        }
      }
    }

    // AI eats ejected mass
    for (const ai of aiCells) {
      for (let i = ejectedMass.length - 1; i >= 0; i--) {
        const e = ejectedMass[i];
        const d = dist(ai, e);
        if (d < massToRadius(ai.mass)) {
          ai.mass += e.mass;
          ejectedMass.splice(i, 1);
        }
      }
    }

    // Player vs AI collisions
    for (let pi = playerCells.length - 1; pi >= 0; pi--) {
      const pc = playerCells[pi];
      for (let ai = aiCells.length - 1; ai >= 0; ai--) {
        const ac = aiCells[ai];
        if (canEat(pc, ac) && overlaps(pc, ac)) {
          pc.mass += ac.mass;
          aiCells.splice(ai, 1);
          aiRespawnQueue.push(180); // 3 seconds at 60fps
        } else if (canEat(ac, pc) && overlaps(ac, pc)) {
          ac.mass += pc.mass;
          playerCells.splice(pi, 1);
          break;
        }
      }
    }

    // AI vs AI collisions
    for (let i = aiCells.length - 1; i >= 0; i--) {
      for (let j = aiCells.length - 1; j >= 0; j--) {
        if (i === j || i >= aiCells.length || j >= aiCells.length) continue;
        const a = aiCells[i];
        const b = aiCells[j];
        if (canEat(a, b) && overlaps(a, b)) {
          a.mass += b.mass;
          aiCells.splice(j, 1);
          if (j < i) i--;
          aiRespawnQueue.push(300); // 5 seconds at 60fps
        }
      }
    }

    // Update AI
    for (const ai of aiCells) {
      updateAI(ai);
    }

    // Process AI respawn queue (replaces setTimeout)
    for (let i = aiRespawnQueue.length - 1; i >= 0; i--) {
      aiRespawnQueue[i]--;
      if (aiRespawnQueue[i] <= 0) {
        spawnAI();
        aiRespawnQueue.splice(i, 1);
      }
    }

    // Check if player is dead
    if (playerCells.length === 0) {
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      game.showOverlay('GAME OVER', `Mass: ${score} — Press any key to restart`);
      game.setState('over');
      return;
    }

    // Update score
    score = getTotalMass();
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Update camera
    const center = getPlayerCenter();
    camera.x = center.x;
    camera.y = center.y;
    const totalMass = getTotalMass();
    const targetZoom = Math.max(0.15, Math.min(1, 40 / (massToRadius(totalMass) + 30)));
    camera.zoom += (targetZoom - camera.zoom) * 0.05;

    // Update leaderboard
    if (frameCount % 30 === 0) {
      updateLeaderboard();
    }

    // Maintain food count
    while (food.length < FOOD_COUNT) {
      spawnFood();
    }

    // Expose game data for ML
    window.gameData = {
      playerX: center.x,
      playerY: center.y,
      playerMass: totalMass,
      playerCells: playerCells.length,
      aiCount: aiCells.length,
      foodCount: food.length,
      zoom: camera.zoom
    };
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      // Draw some decorative cells on waiting screen
      for (let i = 0; i < 15; i++) {
        const x = 50 + (i * 41) % W;
        const y = 50 + (i * 67) % H;
        const r = 10 + (i * 7) % 30;
        const color = CELL_COLORS[i % CELL_COLORS.length];
        renderer.setGlow(color, 0.3);
        renderer.fillCircle(x, y, r, colorWithAlpha(color, 0.3));
      }
      renderer.setGlow(null);
      return;
    }

    // Draw grid
    drawGrid(renderer);

    // Draw world border
    drawWorldBorder(renderer);

    // Draw food
    for (const f of food) {
      drawFoodItem(renderer, f);
    }

    // Draw ejected mass
    for (const e of ejectedMass) {
      drawEjectedItem(renderer, e);
    }

    // Collect all cells for depth sorting (draw smaller cells first)
    const allCells = [];
    for (const ai of aiCells) {
      allCells.push({ cell: ai, type: 'ai' });
    }
    for (const pc of playerCells) {
      allCells.push({ cell: pc, type: 'player' });
    }
    allCells.sort((a, b) => a.cell.mass - b.cell.mass);

    // Draw all cells
    for (const entry of allCells) {
      if (entry.type === 'ai') {
        drawCellItem(renderer, text, entry.cell, true, entry.cell.name);
      } else {
        drawCellItem(renderer, text, entry.cell, true, 'You');
      }
    }

    // Draw leaderboard
    drawLeaderboardUI(renderer, text);

    // Draw minimap
    drawMinimapUI(renderer);
  };

  // --- Drawing helpers ---

  function drawGrid(renderer) {
    const left = camera.x - (W / 2) / camera.zoom;
    const right = camera.x + (W / 2) / camera.zoom;
    const top = camera.y - (H / 2) / camera.zoom;
    const bottom = camera.y + (H / 2) / camera.zoom;

    const startX = Math.floor(left / GRID_SPACING) * GRID_SPACING;
    const startY = Math.floor(top / GRID_SPACING) * GRID_SPACING;

    for (let x = startX; x <= right; x += GRID_SPACING) {
      if (x < 0 || x > WORLD_SIZE) continue;
      const s = worldToScreen(x, 0);
      renderer.drawLine(s.x, 0, s.x, H, '#16213e', 1);
    }
    for (let y = startY; y <= bottom; y += GRID_SPACING) {
      if (y < 0 || y > WORLD_SIZE) continue;
      const s = worldToScreen(0, y);
      renderer.drawLine(0, s.y, W, s.y, '#16213e', 1);
    }
  }

  function drawWorldBorder(renderer) {
    const tl = worldToScreen(0, 0);
    const br = worldToScreen(WORLD_SIZE, WORLD_SIZE);
    const lineW = Math.max(2, 4 * camera.zoom);

    renderer.setGlow('#f44', 0.5);
    // Top edge
    renderer.drawLine(tl.x, tl.y, br.x, tl.y, '#f44', lineW);
    // Bottom edge
    renderer.drawLine(tl.x, br.y, br.x, br.y, '#f44', lineW);
    // Left edge
    renderer.drawLine(tl.x, tl.y, tl.x, br.y, '#f44', lineW);
    // Right edge
    renderer.drawLine(br.x, tl.y, br.x, br.y, '#f44', lineW);
    renderer.setGlow(null);
  }

  function drawCellItem(renderer, text, cell, showName, nameText) {
    const pos = worldToScreen(cell.x, cell.y);
    const r = massToRadius(cell.mass) * camera.zoom;

    // Skip if off screen
    if (pos.x + r < -50 || pos.x - r > W + 50 || pos.y + r < -50 || pos.y - r > H + 50) return;

    const drawR = Math.max(r, 2);

    // Cell body with glow
    const glowIntensity = Math.min(r * 0.5, 15) / 15;
    renderer.setGlow(cell.color, glowIntensity);
    renderer.fillCircle(pos.x, pos.y, drawR, cell.color);
    renderer.setGlow(null);

    // Outline (white, subtle)
    const outlineW = Math.max(1, r * 0.08);
    const segments = Math.max(16, Math.min(48, Math.floor(drawR)));
    const outlinePts = circlePoints(pos.x, pos.y, drawR, segments);
    renderer.strokePoly(outlinePts, 'rgba(255,255,255,0.15)', outlineW, true);

    // Name and mass text
    if (showName && r > 12) {
      const fontSize = Math.max(10, Math.min(r * 0.45, 24));
      text.drawText(nameText || '', pos.x, pos.y - fontSize * 0.4 - fontSize / 2, fontSize, '#fff', 'center');
      const massFontSize = Math.max(8, fontSize * 0.7);
      text.drawText(String(Math.floor(cell.mass)), pos.x, pos.y + massFontSize * 0.5 - massFontSize / 2, massFontSize, 'rgba(255,255,255,0.7)', 'center');
    }
  }

  function drawFoodItem(renderer, f) {
    const pos = worldToScreen(f.x, f.y);
    const r = Math.max(massToRadius(f.mass) * camera.zoom, 2);

    if (pos.x + r < -5 || pos.x - r > W + 5 || pos.y + r < -5 || pos.y - r > H + 5) return;

    renderer.setGlow(f.color, 0.3);
    renderer.fillCircle(pos.x, pos.y, r, f.color);
    renderer.setGlow(null);
  }

  function drawEjectedItem(renderer, e) {
    const pos = worldToScreen(e.x, e.y);
    const r = Math.max(massToRadius(e.mass) * camera.zoom, 3);

    if (pos.x + r < -5 || pos.x - r > W + 5 || pos.y + r < -5 || pos.y - r > H + 5) return;

    // Use a dimmer version of the color to simulate alpha
    renderer.fillCircle(pos.x, pos.y, r, colorWithAlpha(e.color, 0.7));
  }

  function drawLeaderboardUI(renderer, text) {
    const lbX = W - 160;
    const lbY = 10;
    const lbW = 150;
    const lineH = 18;
    const count = Math.min(leaderboard.length, 10);
    const lbH = 26 + count * lineH + 6;

    // Background
    renderer.fillRect(lbX, lbY, lbW, lbH, 'rgba(22, 33, 62, 0.8)');

    // Title
    text.drawText('Leaderboard', lbX + 8, lbY + 6, 12, '#a6c', 'left');

    // Entries
    for (let i = 0; i < count; i++) {
      const entry = leaderboard[i];
      const color = entry.isPlayer ? '#a6c' : '#888';
      const entryText = `${i + 1}. ${entry.name}`;
      text.drawText(entryText, lbX + 8, lbY + 24 + i * lineH, 11, color, 'left');
      text.drawText(String(entry.mass), lbX + lbW - 40, lbY + 24 + i * lineH, 11, color, 'left');
    }
  }

  function drawMinimapUI(renderer) {
    const mmSize = 100;
    const mmX = W - mmSize - 10;
    const mmY = H - mmSize - 10;
    const scale = mmSize / WORLD_SIZE;

    // Background
    renderer.fillRect(mmX, mmY, mmSize, mmSize, 'rgba(22, 33, 62, 0.8)');

    // Border
    const borderPts = [
      { x: mmX, y: mmY },
      { x: mmX + mmSize, y: mmY },
      { x: mmX + mmSize, y: mmY + mmSize },
      { x: mmX, y: mmY + mmSize }
    ];
    renderer.strokePoly(borderPts, 'rgba(15, 52, 96, 0.6)', 1, true);

    // Food dots (sparse)
    for (let i = 0; i < food.length; i += 10) {
      const f = food[i];
      renderer.fillRect(mmX + f.x * scale, mmY + f.y * scale, 1, 1, 'rgba(255,255,255,0.15)');
    }

    // AI cells
    for (const ai of aiCells) {
      const r = Math.max(1, massToRadius(ai.mass) * scale);
      renderer.fillCircle(mmX + ai.x * scale, mmY + ai.y * scale, r, colorWithAlpha(ai.color, 0.6));
    }

    // Player cells
    for (const pc of playerCells) {
      const r = Math.max(2, massToRadius(pc.mass) * scale);
      renderer.setGlow('#a6c', 0.3);
      renderer.fillCircle(mmX + pc.x * scale, mmY + pc.y * scale, r, '#a6c');
      renderer.setGlow(null);
    }

    // Viewport indicator
    const vl = camera.x - (W / 2) / camera.zoom;
    const vt = camera.y - (H / 2) / camera.zoom;
    const vw = W / camera.zoom;
    const vh = H / camera.zoom;
    const vpX = mmX + Math.max(0, vl) * scale;
    const vpY = mmY + Math.max(0, vt) * scale;
    const vpW = Math.min(vw, WORLD_SIZE) * scale;
    const vpH = Math.min(vh, WORLD_SIZE) * scale;
    const vpPts = [
      { x: vpX, y: vpY },
      { x: vpX + vpW, y: vpY },
      { x: vpX + vpW, y: vpY + vpH },
      { x: vpX, y: vpY + vpH }
    ];
    renderer.strokePoly(vpPts, 'rgba(170, 102, 204, 0.5)', 1, true);
  }

  game.start();
  return game;
}
