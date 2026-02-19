// creep-td-versus/game.js — Creep TD Versus ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 800, H = 500;

// Grid constants
const COLS = 12, ROWS = 14;
const CELL = 26;
const FIELD_W = COLS * CELL; // 312
const FIELD_H = ROWS * CELL; // 364
const GAP = W - FIELD_W * 2; // 176
const MARGIN_Y = (H - FIELD_H) / 2; // 68
const P1_OX = 0;
const P1_OY = Math.floor(MARGIN_Y);
const P2_OX = FIELD_W + GAP;
const P2_OY = P1_OY;

// Entry at top-left, exit at bottom-right
const ENTRY_COL = 0, ENTRY_ROW = 0;
const EXIT_COL = COLS - 1, EXIT_ROW = ROWS - 1;

// Tower definitions
const TOWER_DEFS = {
  basic:  { cost: 10, range: 2.8, damage: 10, rate: 25, color: '#00ff88', name: 'Basic',  sellback: 5,  key: '1' },
  sniper: { cost: 25, range: 5.5, damage: 35, rate: 55, color: '#44aaff', name: 'Sniper', sellback: 12, key: '2' },
  splash: { cost: 30, range: 2.5, damage: 14, rate: 40, color: '#ff8800', name: 'Splash', splashRadius: 1.8, sellback: 15, key: '3' },
  slow:   { cost: 15, range: 2.5, damage: 4,  rate: 20, color: '#aa44ff', name: 'Slow',  slowFactor: 0.35, slowDuration: 100, sellback: 7, key: '4' }
};

// Creep definitions
const CREEP_DEFS = {
  basic: { cost: 8,  hp: 70,  speed: 1.0,  reward: 3, color: '#ee5555', name: 'Basic', count: 1, radius: 5 },
  fast:  { cost: 12, hp: 40,  speed: 2.2,  reward: 4, color: '#ffff00', name: 'Fast',  count: 1, radius: 4 },
  tank:  { cost: 20, hp: 200, speed: 0.55, reward: 8, color: '#ff8800', name: 'Tank',  count: 1, radius: 7 },
  swarm: { cost: 15, hp: 30,  speed: 1.3,  reward: 1, color: '#ff44ff', name: 'Swarm', count: 5, radius: 3 }
};

// ── State ──
let score, players, gameTime, particles, projectiles, floatingTexts;
let selectedTower;
let mouseX = -999, mouseY = -999;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
let bestScore = parseInt(localStorage.getItem('creepTdVersusBest') || '0');
if (bestEl) bestEl.textContent = bestScore;

// ── Mouse event queue ──
let pendingClicks = [];
let pendingRightClicks = [];
let pendingMouseLeave = false;

// ── BFS Pathfinding ──
function findPath(grid, sr, sc, er, ec) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const queue = [[sr, sc]];
  visited[sr][sc] = true;
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    if (r === er && c === ec) {
      const path = [];
      let cur = [er, ec];
      while (cur) { path.unshift(cur); cur = parent[cur[0]][cur[1]]; }
      return path;
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && !grid[nr][nc]) {
        visited[nr][nc] = true;
        parent[nr][nc] = [r, c];
        queue.push([nr, nc]);
      }
    }
  }
  return null;
}

function createPlayer(isAI) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  return {
    isAI,
    grid,
    towers: [],
    creeps: [],
    lives: 20,
    gold: 50,
    path: findPath(grid, ENTRY_ROW, ENTRY_COL, EXIT_ROW, EXIT_COL),
    creepsKilled: 0,
    incomeTimer: 0
  };
}

function init(game) {
  players = [createPlayer(false), createPlayer(true)];
  score = 0;
  gameTime = 0;
  particles = [];
  projectiles = [];
  floatingTexts = [];
  selectedTower = null;
  pendingClicks = [];
  pendingRightClicks = [];
  if (scoreEl) scoreEl.textContent = '0';
  updateButtons(game);
}

// ── Tower selection ──
function selectTower(type, game) {
  if (game.state !== 'playing') return;
  selectedTower = (selectedTower === type) ? null : type;
  updateButtons(game);
}

function sendCreep(type, game) {
  if (game.state !== 'playing') return;
  const p = players[0];
  const def = CREEP_DEFS[type];
  if (p.gold < def.cost) return;
  p.gold -= def.cost;
  spawnCreeps(players[1], type);
  addFloatingText('SEND ' + def.name.toUpperCase(), W / 2, H / 2 - 10, '#ff5555');
  updateButtons(game);
}

function spawnCreeps(targetPlayer, type) {
  const def = CREEP_DEFS[type];
  for (let i = 0; i < def.count; i++) {
    const creep = {
      type,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      baseSpeed: def.speed,
      color: def.color,
      reward: def.reward,
      radius: def.radius,
      pathIndex: 0,
      x: ENTRY_COL * CELL + CELL / 2,
      y: ENTRY_ROW * CELL + CELL / 2,
      slowTimer: 0,
      spawnDelay: i * 18
    };
    if (targetPlayer.path) creep.path = targetPlayer.path.slice();
    targetPlayer.creeps.push(creep);
  }
}

function repathCreep(creep, player) {
  if (!player.path) return;
  const curCol = Math.round((creep.x - CELL / 2) / CELL);
  const curRow = Math.round((creep.y - CELL / 2) / CELL);
  const cc = Math.max(0, Math.min(COLS - 1, curCol));
  const cr = Math.max(0, Math.min(ROWS - 1, curRow));
  if (player.grid[cr][cc]) {
    const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !player.grid[nr][nc]) {
        const np = findPath(player.grid, nr, nc, EXIT_ROW, EXIT_COL);
        if (np) { creep.path = np; creep.pathIndex = 0; return; }
      }
    }
  } else {
    const np = findPath(player.grid, cr, cc, EXIT_ROW, EXIT_COL);
    if (np) { creep.path = np; creep.pathIndex = 0; }
  }
}

function addFloatingText(text, x, y, color) {
  floatingTexts.push({ text, x, y, color, life: 50 });
}

function updateButtons(game) {
  if (!game || game.state !== 'playing') return;
  const p = players[0];
  document.querySelectorAll('.shop-btn').forEach(b => b.classList.remove('active'));
  if (selectedTower) {
    const btnId = selectedTower === 'sell' ? 'btnSell' :
      'btn' + selectedTower.charAt(0).toUpperCase() + selectedTower.slice(1);
    const el = document.getElementById(btnId);
    if (el) el.classList.add('active');
  }
  const btnBasic = document.getElementById('btnBasic');
  const btnSniper = document.getElementById('btnSniper');
  const btnSplash = document.getElementById('btnSplash');
  const btnSlow = document.getElementById('btnSlow');
  const btnCreepBasic = document.getElementById('btnCreepBasic');
  const btnCreepFast = document.getElementById('btnCreepFast');
  const btnCreepTank = document.getElementById('btnCreepTank');
  const btnCreepSwarm = document.getElementById('btnCreepSwarm');
  if (btnBasic) btnBasic.disabled = p.gold < 10;
  if (btnSniper) btnSniper.disabled = p.gold < 25;
  if (btnSplash) btnSplash.disabled = p.gold < 30;
  if (btnSlow) btnSlow.disabled = p.gold < 15;
  if (btnCreepBasic) btnCreepBasic.disabled = p.gold < 8;
  if (btnCreepFast) btnCreepFast.disabled = p.gold < 12;
  if (btnCreepTank) btnCreepTank.disabled = p.gold < 20;
  if (btnCreepSwarm) btnCreepSwarm.disabled = p.gold < 15;
}

// ── AI ──
function aiTick(game) {
  const ai = players[1];
  const human = players[0];

  // Passive income every 3 seconds (180 frames)
  if (gameTime % 180 === 0) {
    ai.gold += 5;
    players[0].gold += 5;
    updateButtons(game);
  }

  if (gameTime % 70 !== 0) return;

  const towerCount = ai.towers.length;
  const buildWeight = towerCount < 6 ? 0.8 : towerCount < 15 ? 0.55 : 0.35;

  if (Math.random() < buildWeight && ai.gold >= 10) {
    aiPlaceTower(ai);
  } else if (ai.gold >= 8) {
    aiSendCreep(ai, human);
  }
}

function aiPlaceTower(ai) {
  if (!ai.path || ai.path.length < 3) return;

  const candidates = [];
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  const pathSet = new Set(ai.path.map(p => p[0] * COLS + p[1]));

  for (const [pr, pc] of ai.path) {
    for (const [dr, dc] of dirs) {
      const nr = pr + dr, nc = pc + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !ai.grid[nr][nc]) {
        if (!(nr === ENTRY_ROW && nc === ENTRY_COL) && !(nr === EXIT_ROW && nc === EXIT_COL)) {
          if (!pathSet.has(nr * COLS + nc)) continue;
          candidates.push([nr, nc]);
        }
      }
    }
  }

  for (let i = 1; i < ai.path.length - 1; i++) {
    const [pr, pc] = ai.path[i];
    if (!ai.grid[pr][pc]) candidates.push([pr, pc]);
  }

  const seen = new Set();
  const unique = [];
  for (const [r, c] of candidates) {
    const key = r * COLS + c;
    if (!seen.has(key)) { seen.add(key); unique.push([r, c]); }
  }

  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  let towerType = 'basic';
  const rnd = Math.random();
  if (ai.gold >= 30 && rnd < 0.25) towerType = 'splash';
  else if (ai.gold >= 25 && rnd < 0.45) towerType = 'sniper';
  else if (ai.gold >= 15 && rnd < 0.6) towerType = 'slow';
  if (ai.gold < TOWER_DEFS[towerType].cost) towerType = 'basic';
  if (ai.gold < 10) return;

  for (const [r, c] of unique) {
    ai.grid[r][c] = 1;
    const newPath = findPath(ai.grid, ENTRY_ROW, ENTRY_COL, EXIT_ROW, EXIT_COL);
    if (newPath && newPath.length >= ai.path.length) {
      ai.gold -= TOWER_DEFS[towerType].cost;
      ai.towers.push({ type: towerType, row: r, col: c, cooldown: 0 });
      ai.path = newPath;
      for (const cr of ai.creeps) repathCreep(cr, ai);
      return;
    }
    ai.grid[r][c] = 0;
  }

  // Fallback: any valid placement
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (ai.grid[r][c]) continue;
      if ((r === ENTRY_ROW && c === ENTRY_COL) || (r === EXIT_ROW && c === EXIT_COL)) continue;
      ai.grid[r][c] = 1;
      const np = findPath(ai.grid, ENTRY_ROW, ENTRY_COL, EXIT_ROW, EXIT_COL);
      if (np) {
        ai.gold -= TOWER_DEFS[towerType].cost;
        ai.towers.push({ type: towerType, row: r, col: c, cooldown: 0 });
        ai.path = np;
        for (const cr of ai.creeps) repathCreep(cr, ai);
        return;
      }
      ai.grid[r][c] = 0;
    }
  }
}

function aiSendCreep(ai, human) {
  const options = [];
  if (ai.gold >= 8) options.push('basic');
  if (ai.gold >= 12) options.push('fast');
  if (ai.gold >= 20) options.push('tank');
  if (ai.gold >= 15) options.push('swarm');
  if (options.length === 0) return;

  const humanTowers = human.towers.length;
  let type;
  if (humanTowers < 5 && options.includes('fast')) type = 'fast';
  else if (humanTowers > 12 && options.includes('tank')) type = 'tank';
  else type = options[Math.floor(Math.random() * options.length)];

  ai.gold -= CREEP_DEFS[type].cost;
  spawnCreeps(human, type);
}

// ── Update ──
function updateCreeps(player, playerIndex) {
  for (let i = player.creeps.length - 1; i >= 0; i--) {
    const c = player.creeps[i];
    if (c.spawnDelay > 0) { c.spawnDelay--; continue; }

    if (c.slowTimer > 0) {
      c.slowTimer--;
      if (c.slowTimer <= 0) c.speed = c.baseSpeed;
    }

    if (!c.path || c.pathIndex >= c.path.length) {
      player.lives = Math.max(0, player.lives - 1);
      const ox = playerIndex === 0 ? P1_OX : P2_OX;
      for (let k = 0; k < 10; k++) {
        particles.push({
          x: EXIT_COL * CELL + CELL / 2 + ox,
          y: EXIT_ROW * CELL + CELL / 2 + P1_OY,
          vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
          life: 35, color: '#ff4444', size: 3, isRing: false
        });
      }
      addFloatingText('-1 LIFE', ox + EXIT_COL * CELL + CELL / 2, P1_OY + EXIT_ROW * CELL, '#ff4444');
      player.creeps.splice(i, 1);
      continue;
    }

    const [tr, tc] = c.path[c.pathIndex];
    const tx = tc * CELL + CELL / 2;
    const ty = tr * CELL + CELL / 2;
    const dx = tx - c.x, dy = ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = c.speed * 1.8;
    if (dist < moveSpeed) {
      c.x = tx; c.y = ty; c.pathIndex++;
    } else {
      c.x += (dx / dist) * moveSpeed;
      c.y += (dy / dist) * moveSpeed;
    }

    if (c.hp <= 0) {
      player.gold += c.reward;
      player.creepsKilled++;
      if (playerIndex === 0) {
        score += c.reward;
        if (scoreEl) scoreEl.textContent = score;
      }
      const ox = playerIndex === 0 ? P1_OX : P2_OX;
      for (let k = 0; k < 8; k++) {
        particles.push({
          x: c.x + ox, y: c.y + P1_OY,
          vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
          life: 28, color: c.color, size: 2, isRing: false
        });
      }
      addFloatingText('+$' + c.reward, c.x + ox, c.y + P1_OY - 8, '#ffdd00');
      player.creeps.splice(i, 1);
    }
  }
}

function updateTowers(player, playerIndex) {
  for (const t of player.towers) {
    if (t.cooldown > 0) { t.cooldown--; continue; }
    const def = TOWER_DEFS[t.type];
    const tx = t.col * CELL + CELL / 2;
    const ty = t.row * CELL + CELL / 2;
    const rangePx = def.range * CELL;

    let target = null;
    let bestProgress = -1;
    for (const c of player.creeps) {
      if (c.spawnDelay > 0 || c.hp <= 0) continue;
      const dx = c.x - tx, dy = c.y - ty;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= rangePx) {
        const progress = c.pathIndex;
        if (progress > bestProgress) { bestProgress = progress; target = c; }
      }
    }

    if (target) {
      t.cooldown = def.rate;
      const ox = playerIndex === 0 ? P1_OX : P2_OX;

      projectiles.push({
        sx: tx + ox, sy: ty + P1_OY,
        ex: target.x + ox, ey: target.y + P1_OY,
        color: def.color, life: 6, maxLife: 6
      });

      if (def.splashRadius) {
        const sr = def.splashRadius * CELL;
        for (const c of player.creeps) {
          if (c.spawnDelay > 0) continue;
          const dx = c.x - target.x, dy = c.y - target.y;
          if (Math.sqrt(dx * dx + dy * dy) <= sr) c.hp -= def.damage;
        }
        particles.push({
          x: target.x + ox, y: target.y + P1_OY,
          vx: 0, vy: 0, life: 12, color: def.color, size: sr, isRing: true
        });
      } else {
        target.hp -= def.damage;
      }

      if (def.slowFactor && target.slowTimer <= 0) {
        target.speed = target.baseSpeed * def.slowFactor;
        target.slowTimer = def.slowDuration;
      }
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!p.isRing) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; }
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].life--;
    if (projectiles[i].life <= 0) projectiles.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 0.8;
    floatingTexts[i].life--;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }
}

// ── Drawing helpers ──

// Parse color string to [r,g,b,a] for alpha manipulation
function parseColorRGBA(hex) {
  if (!hex) return [1,1,1,1];
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i);
  if (m) return [
    parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255,
    m[4] ? parseInt(m[4],16)/255 : 1
  ];
  return [1,1,1,1];
}

function toHexColor(r, g, b, a = 1) {
  const toHex = v => Math.round(Math.max(0, Math.min(255, v * 255))).toString(16).padStart(2, '0');
  if (a >= 1) return '#' + toHex(r) + toHex(g) + toHex(b);
  return '#' + toHex(r) + toHex(g) + toHex(b) + toHex(a);
}

// Darken a color string by factor (0-1)
function dimColor(colorStr, alpha) {
  const [r, g, b] = parseColorRGBA(colorStr);
  return toHexColor(r, g, b, alpha);
}

function drawField(renderer, text, player, ox, oy, label, isHuman) {
  const accent = isHuman ? '#00ff88' : '#bb44ff';
  const accentAlphaLow = isHuman ? dimColor('#00ff88', 0.06) : dimColor('#bb44ff', 0.06);
  const accentAlphaPath = isHuman ? dimColor('#00ff88', 0.10) : dimColor('#bb44ff', 0.10);
  const bgColor = isHuman ? '#0c1420' : '#140c1c';

  // Field background
  renderer.fillRect(ox, oy, FIELD_W, FIELD_H, bgColor);

  // Grid lines
  for (let r = 0; r <= ROWS; r++) {
    renderer.drawLine(ox, oy + r * CELL, ox + FIELD_W, oy + r * CELL, accentAlphaLow, 0.5);
  }
  for (let c = 0; c <= COLS; c++) {
    renderer.drawLine(ox + c * CELL, oy, ox + c * CELL, oy + FIELD_H, accentAlphaLow, 0.5);
  }

  // Path glow — draw as thick lines between path segments
  if (player.path && player.path.length > 1) {
    const pathWidth = CELL * 0.7;
    for (let i = 0; i < player.path.length - 1; i++) {
      const ax = ox + player.path[i][1] * CELL + CELL / 2;
      const ay = oy + player.path[i][0] * CELL + CELL / 2;
      const bx = ox + player.path[i+1][1] * CELL + CELL / 2;
      const by = oy + player.path[i+1][0] * CELL + CELL / 2;
      renderer.drawLine(ax, ay, bx, by, accentAlphaPath, pathWidth);
    }
  }

  // Entry marker
  renderer.setGlow('#00ff88', 0.5);
  renderer.fillCircle(ox + ENTRY_COL * CELL + CELL / 2, oy + ENTRY_ROW * CELL + CELL / 2, 8, '#00ff88');
  renderer.setGlow(null);
  text.drawText('IN', ox + ENTRY_COL * CELL + CELL / 2, oy + ENTRY_ROW * CELL + CELL / 2 - 4, 8, '#000000', 'center');

  // Exit marker
  renderer.setGlow('#ff4444', 0.5);
  renderer.fillCircle(ox + EXIT_COL * CELL + CELL / 2, oy + EXIT_ROW * CELL + CELL / 2, 8, '#ff4444');
  renderer.setGlow(null);
  text.drawText('OUT', ox + EXIT_COL * CELL + CELL / 2, oy + EXIT_ROW * CELL + CELL / 2 - 4, 7, '#000000', 'center');

  // Towers
  for (const t of player.towers) {
    const def = TOWER_DEFS[t.type];
    const cx = ox + t.col * CELL + CELL / 2;
    const cy = oy + t.row * CELL + CELL / 2;

    renderer.setGlow(def.color, 0.5);
    if (t.type === 'basic') {
      renderer.fillRect(cx - 7, cy - 7, 14, 14, def.color);
    } else if (t.type === 'sniper') {
      renderer.fillPoly([
        { x: cx, y: cy - 9 },
        { x: cx + 8, y: cy + 6 },
        { x: cx - 8, y: cy + 6 }
      ], def.color);
    } else if (t.type === 'splash') {
      renderer.fillCircle(cx, cy, 8, def.color);
    } else if (t.type === 'slow') {
      renderer.fillPoly([
        { x: cx, y: cy - 9 },
        { x: cx + 9, y: cy },
        { x: cx, y: cy + 9 },
        { x: cx - 9, y: cy }
      ], def.color);
    }
    renderer.setGlow(null);

    // Firing flash
    if (t.cooldown > TOWER_DEFS[t.type].rate - 4) {
      renderer.fillCircle(cx, cy, 10, '#ffffff4c');
    }
  }

  // Placement preview for human
  if (isHuman && selectedTower && selectedTower !== 'sell' && TOWER_DEFS[selectedTower]) {
    const gx = mouseX - ox, gy = mouseY - oy;
    const hc = Math.floor(gx / CELL), hr = Math.floor(gy / CELL);
    if (hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS) {
      const def = TOWER_DEFS[selectedTower];
      const canPlace = !player.grid[hr][hc] &&
        !(hr === ENTRY_ROW && hc === ENTRY_COL) && !(hr === EXIT_ROW && hc === EXIT_COL) &&
        player.gold >= def.cost;

      const rangeColor = canPlace ? dimColor(def.color, 0.3) : '#ff000026';
      const hlColor = canPlace ? '#00ff8826' : '#ff000026';

      // Range circle (drawn as a stroked polygon approximation)
      const rangePx = def.range * CELL;
      const rangeCx = ox + hc * CELL + CELL / 2;
      const rangeCy = oy + hr * CELL + CELL / 2;
      const rangePoints = [];
      const SEGMENTS = 32;
      for (let s = 0; s <= SEGMENTS; s++) {
        const angle = (s / SEGMENTS) * Math.PI * 2;
        rangePoints.push({ x: rangeCx + Math.cos(angle) * rangePx, y: rangeCy + Math.sin(angle) * rangePx });
      }
      renderer.strokePoly(rangePoints, rangeColor, 1, true);

      // Cell highlight
      renderer.fillRect(ox + hc * CELL + 1, oy + hr * CELL + 1, CELL - 2, CELL - 2, hlColor);

      // Ghost tower
      if (canPlace) {
        const ghostColor = dimColor(def.color, 0.4);
        const gcx = ox + hc * CELL + CELL / 2, gcy = oy + hr * CELL + CELL / 2;
        if (selectedTower === 'basic') {
          renderer.fillRect(gcx - 7, gcy - 7, 14, 14, ghostColor);
        } else if (selectedTower === 'sniper') {
          renderer.fillPoly([
            { x: gcx, y: gcy - 9 },
            { x: gcx + 8, y: gcy + 6 },
            { x: gcx - 8, y: gcy + 6 }
          ], ghostColor);
        } else if (selectedTower === 'splash') {
          renderer.fillCircle(gcx, gcy, 8, ghostColor);
        } else if (selectedTower === 'slow') {
          renderer.fillPoly([
            { x: gcx, y: gcy - 9 },
            { x: gcx + 9, y: gcy },
            { x: gcx, y: gcy + 9 },
            { x: gcx - 9, y: gcy }
          ], ghostColor);
        }
      }
    }
  }

  // Sell mode highlight
  if (isHuman && selectedTower === 'sell') {
    const gx = mouseX - ox, gy = mouseY - oy;
    const hc = Math.floor(gx / CELL), hr = Math.floor(gy / CELL);
    if (hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS) {
      const hasTower = player.towers.some(t => t.col === hc && t.row === hr);
      if (hasTower) {
        renderer.fillRect(ox + hc * CELL, oy + hr * CELL, CELL, CELL, '#ffaa0040');
        renderer.strokePoly([
          { x: ox + hc * CELL + 1, y: oy + hr * CELL + 1 },
          { x: ox + hc * CELL + CELL - 1, y: oy + hr * CELL + 1 },
          { x: ox + hc * CELL + CELL - 1, y: oy + hr * CELL + CELL - 1 },
          { x: ox + hc * CELL + 1, y: oy + hr * CELL + CELL - 1 }
        ], '#ffaa00', 2, true);
      }
    }
  }

  // Tower info on hover (no tool selected)
  if (isHuman && !selectedTower) {
    const gx = mouseX - ox, gy = mouseY - oy;
    const hc = Math.floor(gx / CELL), hr = Math.floor(gy / CELL);
    if (hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS) {
      const t = player.towers.find(t => t.col === hc && t.row === hr);
      if (t) {
        const def = TOWER_DEFS[t.type];
        const rangePx = def.range * CELL;
        const rangeCx = ox + hc * CELL + CELL / 2;
        const rangeCy = oy + hr * CELL + CELL / 2;
        // Dashed range ring
        const dashRangePoints = [];
        const SEGMENTS = 32;
        for (let s = 0; s <= SEGMENTS; s++) {
          const angle = (s / SEGMENTS) * Math.PI * 2;
          dashRangePoints.push({ x: rangeCx + Math.cos(angle) * rangePx, y: rangeCy + Math.sin(angle) * rangePx });
        }
        renderer.strokePoly(dashRangePoints, dimColor(def.color, 0.4), 1, true);

        // Tooltip
        const ttx = ox + hc * CELL + CELL + 4;
        const tty = Math.min(oy + hr * CELL, oy + FIELD_H - 46);
        const ttw = 95, tth = 42;
        const finalTtx = ttx + ttw > ox + FIELD_W ? ox + hc * CELL - ttw - 4 : ttx;
        renderer.fillRect(finalTtx, tty, ttw, tth, '#0a0a1eE6');
        renderer.strokePoly([
          { x: finalTtx, y: tty },
          { x: finalTtx + ttw, y: tty },
          { x: finalTtx + ttw, y: tty + tth },
          { x: finalTtx, y: tty + tth }
        ], dimColor(def.color, 0.5), 1, true);
        text.drawText(def.name + ' Tower', finalTtx + 4, tty + 3, 9, def.color, 'left');
        text.drawText('DMG:' + def.damage + ' RNG:' + def.range.toFixed(1), finalTtx + 4, tty + 16, 8, '#aaaaaa', 'left');
        text.drawText('Sell: $' + def.sellback, finalTtx + 4, tty + 28, 8, '#aaaaaa', 'left');
      }
    }
  }

  // Creeps
  for (const c of player.creeps) {
    if (c.spawnDelay > 0) continue;
    const cx = ox + c.x, cy = oy + c.y;

    // Slow aura
    if (c.slowTimer > 0) {
      renderer.strokePoly(
        (() => {
          const pts = [];
          for (let s = 0; s < 24; s++) {
            const angle = (s / 24) * Math.PI * 2;
            pts.push({ x: cx + Math.cos(angle) * (c.radius + 4), y: cy + Math.sin(angle) * (c.radius + 4) });
          }
          return pts;
        })(),
        '#aa44ff66', 1.5, true
      );
    }

    // Body
    renderer.setGlow(c.color, 0.4);
    renderer.fillCircle(cx, cy, c.radius, c.color);
    renderer.setGlow(null);

    // Health bar
    const barW = c.radius * 2 + 6;
    const hpPct = Math.max(0, c.hp / c.maxHp);
    renderer.fillRect(cx - barW / 2, cy - c.radius - 7, barW, 3, '#220000');
    const hpColor = hpPct > 0.6 ? '#00ff88' : hpPct > 0.3 ? '#ffff00' : '#ff4444';
    renderer.fillRect(cx - barW / 2, cy - c.radius - 7, barW * hpPct, 3, hpColor);
  }

  // Field border
  renderer.setGlow(accent, 0.5);
  renderer.strokePoly([
    { x: ox, y: oy },
    { x: ox + FIELD_W, y: oy },
    { x: ox + FIELD_W, y: oy + FIELD_H },
    { x: ox, y: oy + FIELD_H }
  ], accent, 1.5, true);
  renderer.setGlow(null);

  // Label above field
  renderer.setGlow(accent, 0.6);
  text.drawText(label, ox + FIELD_W / 2, oy - 38, 11, accent, 'center');
  renderer.setGlow(null);

  // Stats row below label
  const livesColor = player.lives > 10 ? '#00ff88' : player.lives > 5 ? '#ffff00' : '#ff4444';
  text.drawText('\u2665 ' + player.lives, ox + 2, oy - 21, 10, livesColor, 'left');
  text.drawText('$' + player.gold, ox + FIELD_W - 2, oy - 21, 10, '#ffdd00', 'right');
  text.drawText('Kills:' + player.creepsKilled, ox + FIELD_W / 2, oy - 21, 10, '#777777', 'center');
}

function drawCenterPanel(renderer, text) {
  const cx = FIELD_W + GAP / 2;
  const cy = P1_OY + FIELD_H / 2;

  // VS label
  text.drawText('VS', cx, cy - 28, 20, '#333333', 'center');

  // Timer
  const secs = Math.floor(gameTime / 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  text.drawText(timeStr, cx, cy - 6, 11, '#555555', 'center');

  // Wave countdown
  const nextWave = 600 - (gameTime % 600);
  const nextSec = Math.ceil(nextWave / 60);
  const waveColor = nextSec <= 5 ? '#ff4444' : '#444444';
  text.drawText('Auto wave', cx, cy + 14, 9, waveColor, 'center');
  text.drawText('in ' + nextSec + 's', cx, cy + 26, 9, waveColor, 'center');

  // Path length comparison
  const p1len = players[0].path ? players[0].path.length : 0;
  const p2len = players[1].path ? players[1].path.length : 0;
  text.drawText('Path:' + p1len, cx, cy + 48, 8, '#00ff88', 'center');
  text.drawText('Path:' + p2len, cx, cy + 60, 8, '#bb44ff', 'center');

  // Decorative vertical line
  renderer.drawLine(cx, P1_OY + 10, cx, P1_OY + FIELD_H - 10, '#222222', 1);
}

function drawProjectiles(renderer) {
  for (const p of projectiles) {
    const t = p.life / p.maxLife;
    // Interpolate along the line, fading out
    const mx = p.sx + (p.ex - p.sx) * (1 - t);
    const my = p.sy + (p.ey - p.sy) * (1 - t);
    const alpha = Math.max(0, t);
    renderer.setGlow(p.color, 0.4 * alpha);
    renderer.drawLine(mx, my, p.ex, p.ey, dimColor(p.color, alpha), 2);
    renderer.setGlow(null);
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / 35);
    if (p.isRing) {
      const scale = 1 - p.life / 12;
      const pts = [];
      for (let s = 0; s < 24; s++) {
        const angle = (s / 24) * Math.PI * 2;
        pts.push({ x: p.x + Math.cos(angle) * p.size * scale, y: p.y + Math.sin(angle) * p.size * scale });
      }
      renderer.strokePoly(pts, dimColor(p.color, alpha), 2, true);
    } else {
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, dimColor(p.color, alpha));
    }
  }
}

function drawFloatingTexts(renderer, text) {
  for (const ft of floatingTexts) {
    const alpha = Math.min(1, ft.life / 20);
    renderer.setGlow(ft.color, 0.4 * alpha);
    text.drawText(ft.text, ft.x, ft.y, 10, dimColor(ft.color, alpha), 'center');
    renderer.setGlow(null);
  }
}

function drawHUD(text) {
  text.drawText(
    '1-4: Towers  |  Q/W/E/R: Send Creeps  |  S: Sell  |  Right-click: Cancel  |  ESC: Deselect',
    W / 2, H - 12, 8, '#333333', 'center'
  );
}

function endGame(winner, game) {
  game.setState('over');
  score += Math.floor(gameTime / 60);
  if (scoreEl) scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    if (bestEl) bestEl.textContent = bestScore;
    localStorage.setItem('creepTdVersusBest', String(bestScore));
  }
  const timeStr = Math.floor(gameTime / 3600) + ':' + String(Math.floor((gameTime / 60) % 60)).padStart(2, '0');
  const title = winner === 0 ? 'VICTORY!' : 'DEFEATED';
  const body = 'Score: ' + score + ' | Time: ' + timeStr +
    '\nKills: ' + players[0].creepsKilled +
    '\n\nClick to play again';
  game.showOverlay(title, body);
  const overlayTitle = document.getElementById('overlayTitle');
  if (overlayTitle) {
    overlayTitle.style.color = winner === 0 ? '#00ff88' : '#ff4444';
    overlayTitle.style.textShadow = winner === 0
      ? '0 0 25px rgba(0,255,136,0.8)' : '0 0 25px rgba(255,68,68,0.8)';
  }
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  // ── Canvas mouse listeners ──
  const canvas = document.getElementById('game');

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x: sx, y: sy });
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mouseleave', () => {
    pendingMouseLeave = true;
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    pendingRightClicks.push(true);
  });

  // ── Shop button wiring ──
  window.selectTower = (type) => selectTower(type, game);
  window.sendCreep = (type) => sendCreep(type, game);

  // ── onInit ──
  game.onInit = () => {
    init(game);
    game.showOverlay('CREEP TD VERSUS',
      'Build mazes with towers to defend your base.\nSend creeps to overwhelm the AI opponent.\n\nClick to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── onUpdate ──
  game.onUpdate = () => {
    // Handle pending mouse leave
    if (pendingMouseLeave) {
      mouseX = -999; mouseY = -999;
      pendingMouseLeave = false;
    }

    // Handle pending right-clicks (cancel selection)
    for (const _ of pendingRightClicks) {
      if (game.state === 'playing') {
        selectedTower = null;
        updateButtons(game);
      }
    }
    pendingRightClicks.length = 0;

    // Handle pending clicks
    for (const click of pendingClicks) {
      if (game.state === 'waiting' || game.state === 'over') {
        init(game);
        game.setState('playing');
      } else if (game.state === 'playing') {
        handleFieldClick(click.x, click.y, game);
      }
    }
    pendingClicks.length = 0;

    // Key input
    if (game.state === 'waiting' || game.state === 'over') {
      if (game.input.wasPressed(' ') || game.input.wasPressed('Enter')) {
        init(game);
        game.setState('playing');
      }
      return;
    }
    if (game.state !== 'playing') return;

    // Keyboard shortcuts
    if (game.input.wasPressed('1')) selectTower('basic', game);
    else if (game.input.wasPressed('2')) selectTower('sniper', game);
    else if (game.input.wasPressed('3')) selectTower('splash', game);
    else if (game.input.wasPressed('4')) selectTower('slow', game);
    else if (game.input.wasPressed('q') || game.input.wasPressed('Q')) sendCreep('basic', game);
    else if (game.input.wasPressed('w') || game.input.wasPressed('W')) sendCreep('fast', game);
    else if (game.input.wasPressed('e') || game.input.wasPressed('E')) sendCreep('tank', game);
    else if (game.input.wasPressed('r') || game.input.wasPressed('R')) sendCreep('swarm', game);
    else if (game.input.wasPressed('s') || game.input.wasPressed('S')) selectTower('sell', game);
    else if (game.input.wasPressed('Escape')) {
      selectedTower = null;
      updateButtons(game);
    }

    gameTime++;
    aiTick(game);

    // Auto-waves every 10 seconds (600 frames)
    if (gameTime > 0 && gameTime % 600 === 0) {
      const waveNum = Math.floor(gameTime / 600);
      if (waveNum <= 3) {
        spawnCreeps(players[0], 'basic');
        spawnCreeps(players[1], 'basic');
      } else if (waveNum <= 6) {
        spawnCreeps(players[0], 'fast');
        spawnCreeps(players[1], 'fast');
      } else if (waveNum <= 9) {
        spawnCreeps(players[0], 'tank');
        spawnCreeps(players[1], 'tank');
      } else {
        spawnCreeps(players[0], 'swarm');
        spawnCreeps(players[1], 'swarm');
        spawnCreeps(players[0], 'tank');
        spawnCreeps(players[1], 'tank');
      }
      addFloatingText('WAVE ' + waveNum, W / 2, P1_OY + 20, '#ffff00');
    }

    updateTowers(players[0], 0);
    updateTowers(players[1], 1);
    updateCreeps(players[0], 0);
    updateCreeps(players[1], 1);
    updateParticles();

    if (gameTime % 30 === 0) updateButtons(game);

    if (players[0].lives <= 0) endGame(1, game);
    else if (players[1].lives <= 0) endGame(0, game);
  };

  // ── onDraw ──
  game.onDraw = (renderer, text) => {
    // Background already cleared by engine begin()

    if (game.state === 'waiting') {
      // Draw empty fields for the waiting state
      drawField(renderer, text, players[0], P1_OX, P1_OY, 'YOUR FIELD', true);
      drawField(renderer, text, players[1], P2_OX, P2_OY, 'AI FIELD', false);
      drawCenterPanel(renderer, text);
      return;
    }

    drawField(renderer, text, players[0], P1_OX, P1_OY, 'YOUR FIELD', true);
    drawField(renderer, text, players[1], P2_OX, P2_OY, 'AI FIELD', false);
    drawCenterPanel(renderer, text);
    drawProjectiles(renderer);
    drawParticles(renderer);
    drawFloatingTexts(renderer, text);
    drawHUD(text);
  };

  game.start();
  return game;
}

// ── Click handler ──
function handleFieldClick(sx, sy, game) {
  const p = players[0];
  const gx = sx - P1_OX, gy = sy - P1_OY;
  const col = Math.floor(gx / CELL);
  const row = Math.floor(gy / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

  if (selectedTower === 'sell') {
    const ti = p.towers.findIndex(t => t.col === col && t.row === row);
    if (ti >= 0) {
      const t = p.towers[ti];
      const refund = TOWER_DEFS[t.type].sellback;
      p.gold += refund;
      p.grid[row][col] = 0;
      p.towers.splice(ti, 1);
      p.path = findPath(p.grid, ENTRY_ROW, ENTRY_COL, EXIT_ROW, EXIT_COL);
      for (const cr of p.creeps) repathCreep(cr, p);
      addFloatingText('+$' + refund, P1_OX + col * CELL + CELL / 2, P1_OY + row * CELL, '#ffaa00');
      updateButtons(game);
    }
    return;
  }

  if (!selectedTower || !TOWER_DEFS[selectedTower]) return;
  const def = TOWER_DEFS[selectedTower];
  if (p.gold < def.cost) return;
  if ((row === ENTRY_ROW && col === ENTRY_COL) || (row === EXIT_ROW && col === EXIT_COL)) return;
  if (p.grid[row][col]) return;

  p.grid[row][col] = 1;
  const newPath = findPath(p.grid, ENTRY_ROW, ENTRY_COL, EXIT_ROW, EXIT_COL);
  if (!newPath) { p.grid[row][col] = 0; return; }

  p.gold -= def.cost;
  p.towers.push({ type: selectedTower, row, col, cooldown: 0 });
  p.path = newPath;
  for (const cr of p.creeps) repathCreep(cr, p);
  addFloatingText('-$' + def.cost, P1_OX + col * CELL + CELL / 2, P1_OY + row * CELL, '#00ff88');
  updateButtons(game);
}
