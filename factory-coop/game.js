// factory-coop/game.js — Factory Co-op game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// --- Constants ---
const TILE = 40;
const COLS = W / TILE; // 15
const ROWS = H / TILE; // 10
const ROUND_TIME = 180; // 3 minutes
const PLAYER_SPEED = 2.5;

// Colors
const C_FLOOR = '#2a2a3e';
const C_WALL = '#3a3a5e';
const C_CONVEYOR = '#333350';
const C_MACHINE_PAINT = '#c44';
const C_MACHINE_CUT = '#4c4';
const C_MACHINE_ASSEMBLE = '#44c';
const C_BIN = '#555';
const C_OUTPUT = '#f84';
const C_PLAYER = '#0f0';
const C_AI = '#ff0';

// Materials / Products
const MATERIALS = {
  raw_red:        { color: '#e44', label: 'R'  },
  raw_blue:       { color: '#48f', label: 'B'  },
  raw_green:      { color: '#4d4', label: 'G'  },
  raw_yellow:     { color: '#ee4', label: 'Y'  },
  painted_red:    { color: '#f66', label: 'PR' },
  painted_blue:   { color: '#6af', label: 'PB' },
  painted_green:  { color: '#6f6', label: 'PG' },
  cut_red:        { color: '#f66', label: 'CR' },
  cut_blue:       { color: '#6af', label: 'CB' },
  cut_green:      { color: '#6f6', label: 'CG' },
  red_widget:     { color: '#f44', label: 'RW' },
  blue_gadget:    { color: '#48f', label: 'BG' },
  green_gizmo:    { color: '#4d4', label: 'GG' },
  yellow_device:  { color: '#ee4', label: 'YD' },
  cut_yellow:     { color: '#ee4', label: 'CY' },
  painted_yellow: { color: '#fd4', label: 'PY' },
};

// Recipes: product -> steps (each step: machine type + input -> output)
const RECIPES = {
  red_widget: {
    name: 'Red Widget',
    color: '#f44',
    steps: [
      { machine: 'paint', input: 'raw_red',       output: 'painted_red' },
      { machine: 'cut',   input: 'painted_red',   output: 'cut_red'     },
      { machine: 'assemble', input: 'cut_red',    output: 'red_widget'  },
    ]
  },
  blue_gadget: {
    name: 'Blue Gadget',
    color: '#48f',
    steps: [
      { machine: 'paint', input: 'raw_blue',      output: 'painted_blue' },
      { machine: 'cut',   input: 'painted_blue',  output: 'cut_blue'     },
      { machine: 'assemble', input: 'cut_blue',   output: 'blue_gadget'  },
    ]
  },
  green_gizmo: {
    name: 'Green Gizmo',
    color: '#4d4',
    steps: [
      { machine: 'paint',   input: 'raw_green',     output: 'painted_green' },
      { machine: 'cut',     input: 'painted_green', output: 'cut_green'     },
      { machine: 'assemble',input: 'cut_green',     output: 'green_gizmo'  },
    ]
  },
  yellow_device: {
    name: 'Yellow Device',
    color: '#ee4',
    steps: [
      { machine: 'cut',     input: 'raw_yellow',    output: 'cut_yellow'    },
      { machine: 'paint',   input: 'cut_yellow',    output: 'painted_yellow'},
      { machine: 'assemble',input: 'painted_yellow',output: 'yellow_device' },
    ]
  },
};

const PRODUCT_KEYS = Object.keys(RECIPES);

// --- Module-scope state ---
let score = 0;
let timeLeft = ROUND_TIME;
let orders = [];
let orderIdCounter = 0;
let nextOrderTime = 0;
let difficulty = 1;
let conveyorOffset = 0;
let frameCount = 0;
let particles = [];

// Factory structures
const layout = [];
const machines = [];
const bins = [];
let outputZone = null;

// Player
const player = {
  x: 0, y: 0,
  holding: null,
  radius: 14,
  color: C_PLAYER,
  label: 'P1',
  interactCooldown: 0,
};

// AI ally
const ai = {
  x: 0, y: 0,
  holding: null,
  radius: 14,
  color: C_AI,
  label: 'AI',
  task: null,
  taskCooldown: 0,
  interactCooldown: 0,
};

// DOM refs
let scoreEl, timerEl;

// Pending canvas click events
let pendingClicks = [];

// --- Factory Layout ---
function buildFactory() {
  for (let r = 0; r < ROWS; r++) {
    layout[r] = [];
    for (let c = 0; c < COLS; c++) {
      layout[r][c] = 0;
    }
  }
  for (let c = 0; c < COLS; c++) { layout[0][c] = 1; layout[ROWS-1][c] = 1; }
  for (let r = 0; r < ROWS; r++) { layout[r][0] = 1; layout[r][COLS-1] = 1; }

  machines.length = 0;
  bins.length = 0;

  const binMats = ['raw_red', 'raw_blue', 'raw_green', 'raw_yellow'];
  for (let i = 0; i < 4; i++) {
    layout[2 + i][1] = 2;
    bins.push({ col: 1, row: 2 + i, material: binMats[i] });
  }

  layout[2][4] = 3;
  machines.push({ col: 4, row: 2, type: 'paint', processing: null, timer: 0, output: null });
  layout[7][4] = 3;
  machines.push({ col: 4, row: 7, type: 'paint', processing: null, timer: 0, output: null });

  layout[2][7] = 4;
  machines.push({ col: 7, row: 2, type: 'cut', processing: null, timer: 0, output: null });
  layout[7][7] = 4;
  machines.push({ col: 7, row: 7, type: 'cut', processing: null, timer: 0, output: null });

  layout[2][10] = 5;
  machines.push({ col: 10, row: 2, type: 'assemble', processing: null, timer: 0, output: null });
  layout[7][10] = 5;
  machines.push({ col: 10, row: 7, type: 'assemble', processing: null, timer: 0, output: null });

  layout[4][13] = 6;
  layout[5][13] = 6;
  outputZone = { col: 13, rows: [4, 5] };

  for (let c = 2; c <= 12; c++) {
    if (layout[4][c] === 0) layout[4][c] = 7;
    if (layout[5][c] === 0) layout[5][c] = 7;
  }
}

// --- Collision ---
function isWalkable(px, py, radius) {
  const offsets = [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]];
  for (const [ox, oy] of offsets) {
    const c = Math.floor((px + ox) / TILE);
    const r = Math.floor((py + oy) / TILE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const t = layout[r][c];
    if (t === 1 || t === 2 || t === 3 || t === 4 || t === 5) return false;
  }
  return true;
}

function nearestMachine(px, py) {
  let best = null, bestDist = Infinity;
  for (const m of machines) {
    const mx = m.col * TILE + TILE / 2;
    const my = m.row * TILE + TILE / 2;
    const d = Math.hypot(px - mx, py - my);
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return bestDist < TILE * 1.5 ? best : null;
}

function nearestBin(px, py) {
  let best = null, bestDist = Infinity;
  for (const b of bins) {
    const bx = b.col * TILE + TILE / 2;
    const by = b.row * TILE + TILE / 2;
    const d = Math.hypot(px - bx, py - by);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return bestDist < TILE * 1.5 ? best : null;
}

function nearOutput(px, py) {
  if (!outputZone) return false;
  const ox = outputZone.col * TILE + TILE / 2;
  for (const r of outputZone.rows) {
    const oy = r * TILE + TILE / 2;
    if (Math.hypot(px - ox, py - oy) < TILE * 1.5) return true;
  }
  return false;
}

// --- Orders ---
function spawnOrder() {
  const product = PRODUCT_KEYS[Math.floor(Math.random() * Math.min(2 + difficulty, PRODUCT_KEYS.length))];
  const recipe = RECIPES[product];
  const timeLimit = 30 - Math.min(difficulty * 2, 15);
  orders.push({
    id: orderIdCounter++,
    product,
    name: recipe.name,
    color: recipe.color,
    timeLeft: timeLimit,
    maxTime: timeLimit,
    completed: false,
    claimed: null,
  });
}

// --- Interaction ---
function interact(entity) {
  if (entity.interactCooldown > 0) return;
  entity.interactCooldown = 15;

  const bin = nearestBin(entity.x, entity.y);
  if (bin && !entity.holding) {
    entity.holding = bin.material;
    return;
  }

  const machine = nearestMachine(entity.x, entity.y);
  if (machine) {
    if (machine.output && !entity.holding) {
      entity.holding = machine.output;
      machine.output = null;
      return;
    }
    if (entity.holding && !machine.processing && !machine.output) {
      for (const pk of PRODUCT_KEYS) {
        for (const step of RECIPES[pk].steps) {
          if (step.machine === machine.type && step.input === entity.holding) {
            machine.processing = { input: entity.holding, output: step.output };
            machine.timer = 90;
            entity.holding = null;
            return;
          }
        }
      }
    }
    return;
  }

  if (nearOutput(entity.x, entity.y) && entity.holding) {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.completed && order.product === entity.holding) {
        order.completed = true;
        const bonus = Math.ceil(order.timeLeft / order.maxTime * 5);
        score += 1 + bonus;
        entity.holding = null;
        if (scoreEl) scoreEl.textContent = score;
        for (let p = 0; p < 8; p++) {
          particles.push({
            x: entity.x, y: entity.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color: order.color,
          });
        }
        return;
      }
    }
  }
}

function grabDrop(entity) {
  if (entity.interactCooldown > 0) return;
  entity.interactCooldown = 15;

  const bin = nearestBin(entity.x, entity.y);
  if (bin && !entity.holding) {
    entity.holding = bin.material;
    return;
  }

  const machine = nearestMachine(entity.x, entity.y);
  if (machine) {
    if (machine.output && !entity.holding) {
      entity.holding = machine.output;
      machine.output = null;
      return;
    }
    if (entity.holding && !machine.processing && !machine.output) {
      for (const pk of PRODUCT_KEYS) {
        for (const step of RECIPES[pk].steps) {
          if (step.machine === machine.type && step.input === entity.holding) {
            machine.processing = { input: entity.holding, output: step.output };
            machine.timer = 90;
            entity.holding = null;
            return;
          }
        }
      }
    }
    return;
  }

  if (nearOutput(entity.x, entity.y) && entity.holding) {
    interact(entity);
    return;
  }

  if (entity.holding) {
    entity.holding = null;
  }
}

// --- AI Logic ---
function findRecipeStep(product, currentMaterial) {
  const recipe = RECIPES[product];
  if (!recipe) return null;
  for (let i = 0; i < recipe.steps.length; i++) {
    if (recipe.steps[i].input === currentMaterial) {
      return { stepIndex: i, step: recipe.steps[i] };
    }
  }
  return null;
}

function getMachineForType(type, preferBottom) {
  let best = null;
  for (const m of machines) {
    if (m.type === type) {
      if (preferBottom && m.row >= 5) return m;
      if (!preferBottom && m.row < 5) return m;
      if (!best) best = m;
    }
  }
  return best;
}

function aiDecideTask() {
  let targetOrder = null;
  for (const order of orders) {
    if (!order.completed && (order.claimed === 'ai' || order.claimed === null)) {
      if (!targetOrder || order.claimed === 'ai') {
        targetOrder = order;
        if (order.claimed === 'ai') break;
      }
    }
  }

  if (!targetOrder) return null;
  targetOrder.claimed = 'ai';

  const recipe = RECIPES[targetOrder.product];
  if (!recipe) return null;

  if (!ai.holding) {
    return { type: 'grab', order: targetOrder, material: recipe.steps[0].input };
  }

  if (ai.holding === targetOrder.product) {
    return { type: 'deliver', order: targetOrder };
  }

  const stepInfo = findRecipeStep(targetOrder.product, ai.holding);
  if (stepInfo) {
    return { type: 'process', order: targetOrder, step: stepInfo.step };
  }

  return { type: 'drop' };
}

function aiMoveTo(tx, ty) {
  const dx = tx - ai.x;
  const dy = ty - ai.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return true;
  const speed = PLAYER_SPEED;
  const nx = ai.x + (dx / dist) * speed;
  const ny = ai.y + (dy / dist) * speed;
  const playerDist = Math.hypot(nx - player.x, ny - player.y);
  if (playerDist < 30) {
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const dodgeX = ai.x + perpX * speed;
    const dodgeY = ai.y + perpY * speed;
    if (isWalkable(dodgeX, dodgeY, ai.radius)) {
      ai.x = dodgeX;
      ai.y = dodgeY;
    }
    return false;
  }
  if (isWalkable(nx, ai.y, ai.radius)) ai.x = nx;
  if (isWalkable(ai.x, ny, ai.radius)) ai.y = ny;
  return false;
}

function aiUpdate() {
  if (ai.interactCooldown > 0) ai.interactCooldown--;
  if (ai.taskCooldown > 0) { ai.taskCooldown--; return; }

  if (!ai.task || ai.task.type === 'idle') {
    ai.task = aiDecideTask();
    if (!ai.task) {
      ai.task = { type: 'idle' };
      ai.taskCooldown = 30;
      return;
    }
  }

  const task = ai.task;

  if (task.type === 'grab') {
    const bin = bins.find(b => b.material === task.material);
    if (!bin) { ai.task = null; return; }
    const tx = bin.col * TILE + TILE / 2 + TILE;
    const ty = bin.row * TILE + TILE / 2;
    if (aiMoveTo(tx, ty)) {
      if (nearestBin(ai.x, ai.y)) {
        grabDrop(ai);
        if (ai.holding) {
          ai.task = null;
          ai.taskCooldown = 10;
        }
      }
    }
    return;
  }

  if (task.type === 'process') {
    const machine = getMachineForType(task.step.machine, true);
    if (!machine) { ai.task = null; return; }

    if (machine.processing) {
      const tx = machine.col * TILE + TILE / 2;
      const ty = machine.row * TILE + TILE / 2 + TILE;
      aiMoveTo(tx, ty);
      return;
    }

    if (machine.output) {
      if (!ai.holding) {
        const tx = machine.col * TILE + TILE / 2;
        const ty = machine.row * TILE + TILE / 2 + TILE;
        if (aiMoveTo(tx, ty)) {
          if (nearestMachine(ai.x, ai.y) === machine) {
            grabDrop(ai);
            ai.task = null;
            ai.taskCooldown = 5;
          }
        }
        return;
      }
      ai.taskCooldown = 20;
      return;
    }

    const tx = machine.col * TILE + TILE / 2;
    const ty = machine.row * TILE + TILE / 2 + TILE;
    if (aiMoveTo(tx, ty)) {
      if (nearestMachine(ai.x, ai.y) === machine) {
        grabDrop(ai);
        if (!ai.holding) {
          ai.task = { type: 'wait_machine', machine, order: task.order };
        }
      }
    }
    return;
  }

  if (task.type === 'wait_machine') {
    const machine = task.machine;
    const tx = machine.col * TILE + TILE / 2;
    const ty = machine.row * TILE + TILE / 2 + TILE;
    aiMoveTo(tx, ty);
    if (machine.output && !ai.holding) {
      if (nearestMachine(ai.x, ai.y) === machine) {
        grabDrop(ai);
        ai.task = null;
        ai.taskCooldown = 5;
      }
    }
    return;
  }

  if (task.type === 'deliver') {
    const tx = outputZone.col * TILE + TILE / 2 - TILE;
    const ty = outputZone.rows[1] * TILE + TILE / 2;
    if (aiMoveTo(tx, ty)) {
      if (nearOutput(ai.x, ai.y)) {
        interact(ai);
        ai.task = null;
        ai.taskCooldown = 15;
      }
    }
    return;
  }

  if (task.type === 'drop') {
    ai.holding = null;
    ai.task = null;
    ai.taskCooldown = 10;
    return;
  }

  ai.task = null;
  ai.taskCooldown = 30;
}

// --- Drawing helpers ---
function drawEntity(renderer, text, e) {
  // Shadow (ellipse approximated as a scaled circle / rect)
  renderer.fillRect(e.x - e.radius, e.y + 2, e.radius * 2, e.radius * 0.5, 'rgba(0,0,0,0.3)');

  // Body glow + circle
  renderer.setGlow(e.color, 0.6);
  renderer.fillCircle(e.x, e.y, e.radius, e.color);
  renderer.setGlow(null);

  // Label
  text.drawText(e.label, e.x, e.y - 6, 10, '#000', 'center');

  // Held item
  if (e.holding) {
    const mat = MATERIALS[e.holding];
    if (mat) {
      renderer.setGlow(mat.color, 0.5);
      renderer.fillCircle(e.x + 12, e.y - 12, 8, mat.color);
      renderer.setGlow(null);
      // stroke ring
      const ringPts = [];
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        ringPts.push({ x: e.x + 12 + Math.cos(ang) * 8, y: e.y - 12 + Math.sin(ang) * 8 });
      }
      renderer.strokePoly(ringPts, '#fff', 1.5, true);
      text.drawText(mat.label, e.x + 12, e.y - 18, 7, '#fff', 'center');
    }
  }
}

// --- createGame export ---
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  scoreEl = document.getElementById('score');
  timerEl = document.getElementById('timer');

  // Canvas click events for start/restart
  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x, y });
  });

  // --- Init ---
  game.onInit = () => {
    score = 0;
    timeLeft = ROUND_TIME;
    frameCount = 0;
    orders = [];
    orderIdCounter = 0;
    nextOrderTime = 2;
    difficulty = 1;
    particles = [];
    pendingClicks = [];
    conveyorOffset = 0;

    if (scoreEl) scoreEl.textContent = '0';
    if (timerEl) timerEl.textContent = '3:00';

    player.x = 2 * TILE + TILE / 2;
    player.y = 3 * TILE + TILE / 2;
    player.holding = null;
    player.interactCooldown = 0;

    ai.x = 2 * TILE + TILE / 2;
    ai.y = 6 * TILE + TILE / 2;
    ai.holding = null;
    ai.task = null;
    ai.taskCooldown = 0;
    ai.interactCooldown = 0;

    for (const m of machines) {
      m.processing = null;
      m.timer = 0;
      m.output = null;
    }

    game.showOverlay('FACTORY CO-OP', 'WASD move | SPACE grab/drop | E interact\n\nClick to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // --- Update ---
  game.onUpdate = () => {
    const input = game.input;

    // Waiting: click or key to start
    if (game.state === 'waiting') {
      let startNow = pendingClicks.length > 0;
      startNow = startNow ||
        input.wasPressed(' ') || input.wasPressed('Enter') ||
        input.wasPressed('w') || input.wasPressed('s') ||
        input.wasPressed('a') || input.wasPressed('d');
      if (startNow) {
        pendingClicks = [];
        // Spawn initial orders
        spawnOrder();
        spawnOrder();
        game.setState('playing');
      }
      return;
    }

    // Game over: click or key to restart
    if (game.state === 'over') {
      let restart = pendingClicks.length > 0;
      restart = restart || input.wasPressed(' ') || input.wasPressed('Enter');
      if (restart) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // --- Playing ---
    frameCount++;
    pendingClicks = []; // clicks have no in-game effect except start/restart

    if (player.interactCooldown > 0) player.interactCooldown--;

    // Player movement
    let dx = 0, dy = 0;
    if (input.isDown('w') || input.isDown('ArrowUp'))    dy = -PLAYER_SPEED;
    if (input.isDown('s') || input.isDown('ArrowDown'))  dy = PLAYER_SPEED;
    if (input.isDown('a') || input.isDown('ArrowLeft'))  dx = -PLAYER_SPEED;
    if (input.isDown('d') || input.isDown('ArrowRight')) dx = PLAYER_SPEED;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }

    const newX = player.x + dx;
    const newY = player.y + dy;
    if (isWalkable(newX, player.y, player.radius)) player.x = newX;
    if (isWalkable(player.x, newY, player.radius)) player.y = newY;

    // Player interactions
    if (input.wasPressed(' ')) grabDrop(player);
    if (input.wasPressed('e') || input.wasPressed('E')) interact(player);

    // Update machines
    for (const m of machines) {
      if (m.processing) {
        m.timer--;
        if (m.timer <= 0) {
          m.output = m.processing.output;
          m.processing = null;
        }
      }
    }

    // AI update
    aiUpdate();

    // Timer (every 60 frames = 1 second at fixed 60Hz)
    if (frameCount % 60 === 0) {
      timeLeft--;
      if (timeLeft <= 0) {
        game.showOverlay('SHIFT OVER!', 'Orders completed: ' + score + '\n\nClick or press Enter to play again');
        game.setState('over');
        return;
      }
      const min = Math.floor(timeLeft / 60);
      const sec = timeLeft % 60;
      if (timerEl) timerEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // Order management (every 60 frames)
    if (frameCount % 60 === 0) {
      nextOrderTime--;
      if (nextOrderTime <= 0) {
        orders = orders.filter(o => !o.completed && o.timeLeft > 0);
        const maxOrders = Math.min(2 + Math.floor(difficulty / 2), 5);
        if (orders.length < maxOrders) {
          spawnOrder();
        }
        nextOrderTime = Math.max(4, 10 - difficulty);
      }

      // Update order timers
      for (const order of orders) {
        if (!order.completed) {
          order.timeLeft--;
          if (order.timeLeft <= 0) order.completed = true;
        }
      }

      // Increase difficulty
      if (frameCount % 600 === 0) {
        difficulty++;
      }
    }

    // Conveyor animation
    conveyorOffset = (conveyorOffset + 0.3) % TILE;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  // --- Draw ---
  game.onDraw = (renderer, text) => {
    // Background floor
    renderer.fillRect(0, 0, W, H, C_FLOOR);

    // Draw tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE;
        const t = layout[r][c];

        if (t === 1) {
          // Wall
          renderer.fillRect(x, y, TILE, TILE, C_WALL);
          renderer.drawLine(x + 1, y + 1, x + TILE - 1, y + 1, '#4a4a6e', 1);
          renderer.drawLine(x + 1, y + 1, x + 1, y + TILE - 1, '#4a4a6e', 1);
          renderer.drawLine(x + TILE - 1, y + 1, x + TILE - 1, y + TILE - 1, '#4a4a6e', 1);
          renderer.drawLine(x + 1, y + TILE - 1, x + TILE - 1, y + TILE - 1, '#4a4a6e', 1);
        } else if (t === 7) {
          // Conveyor belt
          renderer.fillRect(x, y, TILE, TILE, C_CONVEYOR);
          // Animated chevrons (pre-computed lines)
          const offset = conveyorOffset;
          for (let cx2 = -TILE; cx2 < TILE * 2; cx2 += 20) {
            const bx = x + ((cx2 + offset) % TILE);
            if (bx >= x && bx <= x + TILE) {
              renderer.drawLine(bx, y + 10, bx + 6, y + TILE / 2, '#555578', 1.5);
              renderer.drawLine(bx + 6, y + TILE / 2, bx, y + TILE - 10, '#555578', 1.5);
            }
          }
        } else if (t === 6) {
          // Output zone
          renderer.fillRect(x, y, TILE, TILE, '#332211');
          renderer.drawLine(x + 2, y + 2, x + TILE - 2, y + 2, C_OUTPUT, 2);
          renderer.drawLine(x + TILE - 2, y + 2, x + TILE - 2, y + TILE - 2, C_OUTPUT, 2);
          renderer.drawLine(x + TILE - 2, y + TILE - 2, x + 2, y + TILE - 2, C_OUTPUT, 2);
          renderer.drawLine(x + 2, y + TILE - 2, x + 2, y + 2, C_OUTPUT, 2);
          text.drawText('OUT', x + TILE / 2, y + TILE / 2 - 5, 10, C_OUTPUT, 'center');
        }
      }
    }

    // Draw bins
    for (const bin of bins) {
      const x = bin.col * TILE;
      const y = bin.row * TILE;
      renderer.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, C_BIN);
      const mat = MATERIALS[bin.material];
      renderer.fillRect(x + 8, y + 8, TILE - 16, TILE - 16, mat.color);
      text.drawText(mat.label, x + TILE / 2, y + TILE / 2 - 5, 10, '#fff', 'center');
    }

    // Draw machines
    for (const m of machines) {
      const x = m.col * TILE;
      const y = m.row * TILE;
      const color = m.type === 'paint' ? C_MACHINE_PAINT :
                    m.type === 'cut'   ? C_MACHINE_CUT   : C_MACHINE_ASSEMBLE;
      renderer.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, color);

      // Machine label
      const labels = { paint: 'PAINT', cut: 'CUT', assemble: 'ASM' };
      text.drawText(labels[m.type], x + TILE / 2, y + 4, 9, '#fff', 'center');

      // Processing indicator
      if (m.processing) {
        const progress = 1 - (m.timer / 90);
        renderer.fillRect(x + 5, y + TILE - 11, TILE - 10, 5, '#444');
        renderer.fillRect(x + 5, y + TILE - 11, (TILE - 10) * progress, 5, '#fff');

        // Spinning gear lines (6 spokes, pre-computed)
        const angle = frameCount * 0.1;
        const cx2 = x + TILE / 2;
        const cy2 = y + TILE / 2 + 3;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i + angle;
          renderer.drawLine(cx2, cy2, cx2 + Math.cos(a) * 8, cy2 + Math.sin(a) * 8, 'rgba(255,255,255,0.5)', 1.5);
        }
      }

      // Output indicator
      if (m.output) {
        const mat = MATERIALS[m.output];
        if (mat) {
          renderer.fillCircle(x + TILE / 2, y + TILE - 6, 6, mat.color);
          text.drawText(mat.label, x + TILE / 2, y + TILE - 11, 7, '#fff', 'center');
        }
        // Glow pulse on border
        const alpha = Math.floor((0.3 + 0.3 * Math.sin(frameCount * 0.1)) * 255).toString(16).padStart(2, '0');
        renderer.drawLine(x, y, x + TILE, y, `#ffffff${alpha}`, 2);
        renderer.drawLine(x + TILE, y, x + TILE, y + TILE, `#ffffff${alpha}`, 2);
        renderer.drawLine(x + TILE, y + TILE, x, y + TILE, `#ffffff${alpha}`, 2);
        renderer.drawLine(x, y + TILE, x, y, `#ffffff${alpha}`, 2);
      }
    }

    // Draw entities
    drawEntity(renderer, text, player);
    drawEntity(renderer, text, ai);

    // Draw order queue on left
    const activeOrders = orders.filter(o => !o.completed);
    const panelH = Math.min(activeOrders.length * 36 + 24, H);
    renderer.fillRect(0, 0, 130, panelH, 'rgba(0,0,0,0.6)');
    text.drawText('ORDERS', 8, 5, 11, '#f84', 'left');

    let oy = 30;
    for (const order of activeOrders) {
      if (oy > H - 20) break;

      // Order background
      const bgColor = order.timeLeft < 5 ? 'rgba(255,50,50,0.3)' : 'rgba(50,50,80,0.5)';
      renderer.fillRect(4, oy - 10, 122, 30, bgColor);

      // Product name
      text.drawText(order.name, 8, oy - 7, 10, order.color, 'left');

      // Timer bar background + fill
      const timerFrac = order.timeLeft / order.maxTime;
      const barColor = timerFrac > 0.5 ? '#4d4' : timerFrac > 0.25 ? '#ee4' : '#e44';
      renderer.fillRect(8, oy + 8, 100, 6, '#333');
      renderer.fillRect(8, oy + 8, 100 * timerFrac, 6, barColor);

      // Claimed indicator
      if (order.claimed === 'ai') {
        text.drawText('AI', 122, oy - 7, 8, C_AI, 'right');
      }

      oy += 36;
    }

    // Draw particles
    for (const p of particles) {
      const palpha = Math.floor((p.life / 30) * 255).toString(16).padStart(2, '0');
      // Expand 3-char hex color to 6-char for alpha concatenation
      const pc = p.color.length === 4 ? '#' + p.color[1]+p.color[1]+p.color[2]+p.color[2]+p.color[3]+p.color[3] : p.color;
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, pc + palpha);
    }

    // Legend at bottom right
    renderer.fillRect(W - 160, H - 50, 160, 50, 'rgba(0,0,0,0.5)');
    text.drawText('PAINT', W - 150, H - 44, 9, C_MACHINE_PAINT, 'left');
    text.drawText('CUT',   W - 100, H - 44, 9, C_MACHINE_CUT,   'left');
    text.drawText('ASM',   W - 55,  H - 44, 9, C_MACHINE_ASSEMBLE, 'left');
    text.drawText('WASD E SPACE', W - 150, H - 24, 9, '#888', 'left');
  };

  buildFactory();
  game.start();
  return game;
}
