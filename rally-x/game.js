// rally-x/game.js — Rally-X game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// --- Constants ---
const TILE = 24;
const MAZE_COLS = 50;
const MAZE_ROWS = 50;
const MAZE_W = MAZE_COLS * TILE;
const MAZE_H = MAZE_ROWS * TILE;
const CAR_SIZE = 16;
const CAR_SPEED = 3;
const ENEMY_SPEED_BASE = 0.8;
const FLAG_SIZE = 10;
const SMOKE_RADIUS = 12;
const SMOKE_DURATION = 180;
const SMOKE_SLOW_FACTOR = 0.3;
const FUEL_MAX = 1200;
const FUEL_DRAIN = 0.3;
const FUEL_SMOKE_COST = 30;
const SMOKE_MAX = 12;
const RADAR_SIZE = 100;
const RADAR_MARGIN = 8;

// Direction vectors: 0=up, 1=right, 2=down, 3=left
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Game state ---
let score, best = 0;
let maze;
let player;
let enemies;
let flags;
let smokes;
let fuel;
let smokeCount;
let level;
let flagsLeft;
let frameCount;
let cameraX, cameraY;
let roundBonus;
let bonusTimer;
let showingBonus;

// --- Maze generation ---
function generateMaze(cols, rows) {
  const m = [];
  for (let r = 0; r < rows; r++) {
    m[r] = [];
    for (let c = 0; c < cols; c++) {
      m[r][c] = 0;
    }
  }

  function carve(cx, cy) {
    m[cy][cx] = 1;
    const dirs = [0, 1, 2, 3];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const d of dirs) {
      const nx = cx + DX[d] * 2;
      const ny = cy + DY[d] * 2;
      if (nx >= 1 && nx < cols - 1 && ny >= 1 && ny < rows - 1 && m[ny][nx] === 0) {
        m[cy + DY[d]][cx + DX[d]] = 1;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);

  // Add extra passages to make maze more open (especially for early levels)
  const basePassages = Math.floor(cols * rows * 0.12);
  const levelMultiplier = Math.max(0.5, 1 - (level - 1) * 0.1);
  const extraPassages = Math.floor(basePassages * levelMultiplier);

  for (let i = 0; i < extraPassages; i++) {
    const rx = 1 + Math.floor(Math.random() * (cols - 2));
    const ry = 1 + Math.floor(Math.random() * (rows - 2));
    if (m[ry][rx] === 0) {
      let adj = 0;
      if (ry > 0 && m[ry - 1][rx] === 1) adj++;
      if (ry < rows - 1 && m[ry + 1][rx] === 1) adj++;
      if (rx > 0 && m[ry][rx - 1] === 1) adj++;
      if (rx < cols - 1 && m[ry][rx + 1] === 1) adj++;
      const minAdj = level <= 3 ? 1 : 2;
      if (adj >= minAdj) {
        m[ry][rx] = 1;
      }
    }
  }

  return m;
}

function isPassable(wx, wy, size) {
  const margin = 2;
  const x1 = wx + margin;
  const y1 = wy + margin;
  const x2 = wx + size - margin - 1;
  const y2 = wy + size - margin - 1;

  const corners = [
    [Math.floor(x1 / TILE), Math.floor(y1 / TILE)],
    [Math.floor(x2 / TILE), Math.floor(y1 / TILE)],
    [Math.floor(x1 / TILE), Math.floor(y2 / TILE)],
    [Math.floor(x2 / TILE), Math.floor(y2 / TILE)]
  ];

  for (const [col, row] of corners) {
    if (col < 0 || col >= MAZE_COLS || row < 0 || row >= MAZE_ROWS) return false;
    if (maze[row][col] === 0) return false;
  }
  return true;
}

function randomPassablePos() {
  let attempts = 0;
  while (attempts < 1000) {
    const col = 1 + Math.floor(Math.random() * (MAZE_COLS - 2));
    const row = 1 + Math.floor(Math.random() * (MAZE_ROWS - 2));
    if (maze[row][col] === 1) {
      return { x: col * TILE + (TILE - CAR_SIZE) / 2, y: row * TILE + (TILE - CAR_SIZE) / 2 };
    }
    attempts++;
  }
  return { x: TILE + 4, y: TILE + 4 };
}

// BFS-based pathfinding for enemies
function bfsDirection(fromX, fromY, toX, toY) {
  const fc = Math.floor((fromX + CAR_SIZE / 2) / TILE);
  const fr = Math.floor((fromY + CAR_SIZE / 2) / TILE);
  const tc = Math.floor((toX + CAR_SIZE / 2) / TILE);
  const tr = Math.floor((toY + CAR_SIZE / 2) / TILE);

  if (fc === tc && fr === tr) return -1;

  const visited = new Set();
  const queue = [];
  for (let d = 0; d < 4; d++) {
    const nc = fc + DX[d];
    const nr = fr + DY[d];
    if (nc >= 0 && nc < MAZE_COLS && nr >= 0 && nr < MAZE_ROWS && maze[nr][nc] === 1) {
      if (nc === tc && nr === tr) return d;
      const key = nr * MAZE_COLS + nc;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([nc, nr, d]);
      }
    }
  }

  let idx = 0;
  while (idx < queue.length && idx < 2000) {
    const [c, r, firstDir] = queue[idx++];
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (nc >= 0 && nc < MAZE_COLS && nr >= 0 && nr < MAZE_ROWS && maze[nr][nc] === 1) {
        if (nc === tc && nr === tr) return firstDir;
        const key = nr * MAZE_COLS + nc;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nc, nr, firstDir]);
        }
      }
    }
  }

  // Fallback: random passable direction
  const dirs = [0, 1, 2, 3];
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  for (const d of dirs) {
    const nc = fc + DX[d];
    const nr = fr + DY[d];
    if (nc >= 0 && nc < MAZE_COLS && nr >= 0 && nr < MAZE_ROWS && maze[nr][nc] === 1) return d;
  }
  return 0;
}

function setupLevel() {
  maze = generateMaze(MAZE_COLS, MAZE_ROWS);
  player = { ...randomPassablePos(), dir: 1, moving: false };

  // Place flags
  const baseFlags = Math.max(6, 8 - Math.floor(level * 0.3));
  const numFlags = baseFlags + Math.floor(level * 1.2);
  flags = [];
  for (let i = 0; i < numFlags; i++) {
    let pos;
    let tooClose = true;
    let attempts = 0;
    while (tooClose && attempts < 100) {
      pos = randomPassablePos();
      tooClose = false;
      const dx = pos.x - player.x;
      const dy = pos.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < TILE * 8) tooClose = true;
      for (const f of flags) {
        const fdx = pos.x - f.x;
        const fdy = pos.y - f.y;
        if (Math.sqrt(fdx * fdx + fdy * fdy) < TILE * 4) { tooClose = true; break; }
      }
      attempts++;
    }
    flags.push({ x: pos.x, y: pos.y, collected: false });
  }
  flagsLeft = flags.length;

  // Place enemies
  const numEnemies = Math.max(1, 2 + Math.floor((level - 1) * 0.8));
  enemies = [];
  for (let i = 0; i < numEnemies; i++) {
    let pos;
    let tooClose = true;
    let attempts = 0;
    while (tooClose && attempts < 100) {
      pos = randomPassablePos();
      const dx = pos.x - player.x;
      const dy = pos.y - player.y;
      const minDistance = level <= 3 ? TILE * 15 : TILE * 12;
      tooClose = Math.sqrt(dx * dx + dy * dy) < minDistance;
      attempts++;
    }
    enemies.push({
      x: pos.x, y: pos.y,
      dir: Math.floor(Math.random() * 4),
      speed: ENEMY_SPEED_BASE + Math.max(0, (level - 1) * 0.08 + Math.random() * 0.2),
      moveTimer: 0,
      slowed: 0
    });
  }

  smokes = [];
  fuel = FUEL_MAX;
  smokeCount = SMOKE_MAX;
  frameCount = 0;
  roundBonus = 0;
  bonusTimer = 0;
  showingBonus = false;

  // Initialize camera
  cameraX = player.x + CAR_SIZE / 2 - W / 2;
  cameraY = player.y + CAR_SIZE / 2 - H / 2;
  cameraX = Math.max(0, Math.min(MAZE_W - W, cameraX));
  cameraY = Math.max(0, Math.min(MAZE_H - H, cameraY));
}

function dropSmoke() {
  if (smokeCount <= 0 || fuel < FUEL_SMOKE_COST) return;
  smokeCount--;
  fuel -= FUEL_SMOKE_COST;
  const sx = player.x + CAR_SIZE / 2 - DX[player.dir] * CAR_SIZE;
  const sy = player.y + CAR_SIZE / 2 - DY[player.dir] * CAR_SIZE;
  smokes.push({ x: sx, y: sy, timer: SMOKE_DURATION });
}

// --- Helper to compute rotated car polygon points (world coords) ---
function carPoints(cx, cy, dir) {
  const angle = dir * Math.PI / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  function rot(lx, ly) {
    return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
  }
  // Triangle (nose)
  const nose = rot(0, -CAR_SIZE / 2);
  const rWing = rot(CAR_SIZE / 3, CAR_SIZE / 3);
  const lWing = rot(-CAR_SIZE / 3, CAR_SIZE / 3);
  // Body rect corners
  const bTL = rot(-CAR_SIZE / 3, -CAR_SIZE / 4);
  const bTR = rot(CAR_SIZE / 3, -CAR_SIZE / 4);
  const bBR = rot(CAR_SIZE / 3, CAR_SIZE / 4);
  const bBL = rot(-CAR_SIZE / 3, CAR_SIZE / 4);
  return { tri: [nose, rWing, lWing], body: [bTL, bTR, bBR, bBL] };
}

// Convert world coords to screen coords
function toScreen(wx, wy) {
  return { x: wx - cameraX, y: wy - cameraY };
}

// Check if a world rect is visible on screen (with margin)
function isVisible(wx, wy, ww, wh, margin) {
  margin = margin || 0;
  return wx + ww + margin > cameraX &&
         wx - margin < cameraX + W &&
         wy + wh + margin > cameraY &&
         wy - margin < cameraY + H;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    level = 1;
    setupLevel();
    game.showOverlay('RALLY-X', 'Arrow keys to steer, Space for smoke -- Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // --- Waiting state ---
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    // --- Over state ---
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    frameCount++;

    // Handle bonus display between rounds
    if (showingBonus) {
      bonusTimer--;
      if (bonusTimer <= 0) showingBonus = false;
      return;
    }

    // Smoke drop
    if (input.wasPressed(' ')) {
      dropSmoke();
    }

    // Player input
    let wantDir = -1;
    if (input.isDown('ArrowUp')) wantDir = 0;
    else if (input.isDown('ArrowRight')) wantDir = 1;
    else if (input.isDown('ArrowDown')) wantDir = 2;
    else if (input.isDown('ArrowLeft')) wantDir = 3;

    // Try to move player in desired direction
    player.moving = false;
    if (wantDir >= 0) {
      const nx = player.x + DX[wantDir] * CAR_SPEED;
      const ny = player.y + DY[wantDir] * CAR_SPEED;
      if (isPassable(nx, ny, CAR_SIZE)) {
        player.x = nx;
        player.y = ny;
        player.dir = wantDir;
        player.moving = true;
      } else {
        // Try continuing in current direction if desired is blocked
        const cx = player.x + DX[player.dir] * CAR_SPEED;
        const cy = player.y + DY[player.dir] * CAR_SPEED;
        if (isPassable(cx, cy, CAR_SIZE)) {
          player.x = cx;
          player.y = cy;
          player.moving = true;
        }
      }
    }

    // Fuel drain
    if (player.moving) {
      fuel -= FUEL_DRAIN;
    } else {
      fuel -= FUEL_DRAIN * 0.2;
    }
    if (fuel <= 0) {
      fuel = 0;
      game.showOverlay('GAME OVER', `Score: ${score} | Level: ${level} -- Press any key to restart`);
      game.setState('over');
      return;
    }

    // Check flag collection
    const pcx = player.x + CAR_SIZE / 2;
    const pcy = player.y + CAR_SIZE / 2;
    for (const flag of flags) {
      if (flag.collected) continue;
      const dx = pcx - (flag.x + FLAG_SIZE / 2);
      const dy = pcy - (flag.y + FLAG_SIZE / 2);
      if (Math.abs(dx) < (CAR_SIZE + FLAG_SIZE) / 2 && Math.abs(dy) < (CAR_SIZE + FLAG_SIZE) / 2) {
        flag.collected = true;
        flagsLeft--;
        const flagValue = 100 + (flags.length - flagsLeft) * 50;
        score += flagValue;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }

        if (flagsLeft <= 0) {
          // Round complete
          roundBonus = 1000 * level;
          score += roundBonus;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          level++;
          setupLevel();
          showingBonus = true;
          bonusTimer = 120;
          return;
        }
      }
    }

    // Update smokes
    for (let i = smokes.length - 1; i >= 0; i--) {
      smokes[i].timer--;
      if (smokes[i].timer <= 0) {
        smokes.splice(i, 1);
      }
    }

    // Update enemies
    for (const enemy of enemies) {
      // Check if slowed by smoke
      let speedMult = 1;
      if (enemy.slowed > 0) {
        enemy.slowed--;
        speedMult = SMOKE_SLOW_FACTOR;
      }

      // Check for smoke collision
      for (const smoke of smokes) {
        const sdx = (enemy.x + CAR_SIZE / 2) - smoke.x;
        const sdy = (enemy.y + CAR_SIZE / 2) - smoke.y;
        if (Math.sqrt(sdx * sdx + sdy * sdy) < SMOKE_RADIUS + CAR_SIZE / 2) {
          enemy.slowed = 30;
          speedMult = SMOKE_SLOW_FACTOR;
        }
      }

      // Pathfind toward player
      enemy.moveTimer++;
      if (enemy.moveTimer >= 20 + Math.floor(Math.random() * 15)) {
        enemy.moveTimer = 0;
        const newDir = bfsDirection(enemy.x, enemy.y, player.x, player.y);
        if (newDir >= 0) enemy.dir = newDir;
      }

      // Move enemy
      const espeed = enemy.speed * speedMult;
      const enx = enemy.x + DX[enemy.dir] * espeed;
      const eny = enemy.y + DY[enemy.dir] * espeed;
      if (isPassable(enx, eny, CAR_SIZE)) {
        enemy.x = enx;
        enemy.y = eny;
      } else {
        // Try alternative directions
        enemy.moveTimer = 999;
        const dirs = [0, 1, 2, 3];
        for (let i = dirs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        for (const d of dirs) {
          const ax = enemy.x + DX[d] * espeed;
          const ay = enemy.y + DY[d] * espeed;
          if (isPassable(ax, ay, CAR_SIZE)) {
            enemy.x = ax;
            enemy.y = ay;
            enemy.dir = d;
            break;
          }
        }
      }

      // Check collision with player
      const edx = (enemy.x + CAR_SIZE / 2) - pcx;
      const edy = (enemy.y + CAR_SIZE / 2) - pcy;
      if (Math.abs(edx) < CAR_SIZE * 0.8 && Math.abs(edy) < CAR_SIZE * 0.8) {
        game.showOverlay('GAME OVER', `Score: ${score} | Level: ${level} -- Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // Update camera
    cameraX = player.x + CAR_SIZE / 2 - W / 2;
    cameraY = player.y + CAR_SIZE / 2 - H / 2;
    cameraX = Math.max(0, Math.min(MAZE_W - W, cameraX));
    cameraY = Math.max(0, Math.min(MAZE_H - H, cameraY));

    // Update gameData for ML
    window.gameData = {
      playerX: player.x, playerY: player.y, playerDir: player.dir,
      fuel: fuel, flagsLeft: flagsLeft, level: level,
      enemies: enemies.map(e => ({ x: e.x, y: e.y }))
    };
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      drawMazePreview(renderer);
      return;
    }

    drawMaze(renderer);
    drawFlags(renderer);
    drawSmokes(renderer);
    drawEnemies(renderer);
    drawPlayer(renderer);

    // HUD (screen-space, no camera offset)
    drawFuelGauge(renderer, text);
    drawSmokeCounter(renderer, text);
    drawRadar(renderer, text);
    drawLevelIndicator(text);

    if (showingBonus) {
      drawBonusText(text);
    }
  };

  // --- Draw functions ---

  function drawMazePreview(renderer) {
    const scale = 2;
    const ox = W / 2 - MAZE_COLS * scale / 2;
    const oy = H / 2 - MAZE_ROWS * scale / 2;
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        const color = maze[r][c] === 0 ? '#16213e' : '#0f3460';
        renderer.fillRect(ox + c * scale, oy + r * scale, scale, scale, color);
      }
    }
  }

  function drawMaze(renderer) {
    // Only draw visible tiles for performance
    const startCol = Math.max(0, Math.floor(cameraX / TILE));
    const endCol = Math.min(MAZE_COLS, Math.ceil((cameraX + W) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(cameraY / TILE));
    const endRow = Math.min(MAZE_ROWS, Math.ceil((cameraY + H) / TILE) + 1);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const wx = c * TILE;
        const wy = r * TILE;
        const s = toScreen(wx, wy);
        if (maze[r][c] === 0) {
          // Wall
          renderer.fillRect(s.x, s.y, TILE, TILE, '#16213e');
          // Wall accent border
          renderer.fillRect(s.x, s.y, TILE, 1, '#0f3460');
          renderer.fillRect(s.x, s.y, 1, TILE, '#0f3460');
        } else {
          // Path
          renderer.fillRect(s.x, s.y, TILE, TILE, '#0d1b2a');
          // Subtle grid
          renderer.fillRect(s.x, s.y, TILE, 1, '#111d30');
          renderer.fillRect(s.x, s.y, 1, TILE, '#111d30');
        }
      }
    }
  }

  function drawPlayer(renderer) {
    const wcx = player.x + CAR_SIZE / 2;
    const wcy = player.y + CAR_SIZE / 2;
    const s = toScreen(wcx, wcy);

    const pts = carPoints(s.x, s.y, player.dir);

    // Glow
    renderer.setGlow('#4fd', 0.8);

    // Car triangle
    renderer.fillPoly(pts.tri, '#4fd');
    // Car body rect
    renderer.fillPoly(pts.body, '#4fd');

    renderer.setGlow(null);

    // Exhaust puff when moving
    if (player.moving && frameCount % 4 < 2) {
      const ex = s.x - DX[player.dir] * CAR_SIZE * 0.6;
      const ey = s.y - DY[player.dir] * CAR_SIZE * 0.6;
      renderer.fillCircle(ex, ey, 3, '#96969680');
    }
  }

  function drawEnemies(renderer) {
    for (const enemy of enemies) {
      const wcx = enemy.x + CAR_SIZE / 2;
      const wcy = enemy.y + CAR_SIZE / 2;
      if (!isVisible(enemy.x, enemy.y, CAR_SIZE, CAR_SIZE, CAR_SIZE)) continue;
      const s = toScreen(wcx, wcy);

      const color = enemy.slowed > 0 ? '#a44' : '#f44';
      const pts = carPoints(s.x, s.y, enemy.dir);

      renderer.setGlow('#f44', 0.6);
      renderer.fillPoly(pts.tri, color);
      renderer.fillPoly(pts.body, color);
      renderer.setGlow(null);
    }
  }

  function drawFlags(renderer) {
    for (const flag of flags) {
      if (flag.collected) continue;
      if (!isVisible(flag.x, flag.y, FLAG_SIZE, FLAG_SIZE, FLAG_SIZE)) continue;

      const wfx = flag.x + FLAG_SIZE / 2;
      const wfy = flag.y + FLAG_SIZE / 2;
      const s = toScreen(wfx, wfy);

      // Flag pole
      renderer.drawLine(s.x, s.y + FLAG_SIZE / 2, s.x, s.y - FLAG_SIZE / 2, '#aaa', 1);

      // Flag pennant (triangle)
      renderer.setGlow('#ff0', 0.5);
      const top = { x: s.x, y: s.y - FLAG_SIZE / 2 };
      const tip = { x: s.x + FLAG_SIZE * 0.7, y: s.y - FLAG_SIZE / 4 };
      const bot = { x: s.x, y: s.y };
      renderer.fillPoly([top, tip, bot], '#ff0');
      renderer.setGlow(null);
    }
  }

  function drawSmokes(renderer) {
    for (const smoke of smokes) {
      if (!isVisible(smoke.x - SMOKE_RADIUS, smoke.y - SMOKE_RADIUS,
                     SMOKE_RADIUS * 2, SMOKE_RADIUS * 2, SMOKE_RADIUS)) continue;

      const alpha = Math.min(0.6, smoke.timer / SMOKE_DURATION);
      const r = SMOKE_RADIUS * (1 + (1 - smoke.timer / SMOKE_DURATION) * 0.5);
      const s = toScreen(smoke.x, smoke.y);

      // Outer smoke
      const outerAlpha = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(s.x, s.y, r, '#b4b4b4' + outerAlpha);
      // Inner lighter core
      const innerAlpha = Math.round(alpha * 0.5 * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(s.x, s.y, r * 0.5, '#dcdcdc' + innerAlpha);
    }
  }

  function drawFuelGauge(renderer, text) {
    const barW = 120, barH = 10, x = 10, y = H - 24;
    const fuelPct = fuel / FUEL_MAX;

    text.drawText('FUEL', x, y - 12, 10, '#aaa', 'left');
    // Background
    renderer.fillRect(x, y, barW, barH, '#16213e');
    // Fill
    const fuelColor = fuelPct > 0.3 ? '#4fd' : (fuelPct > 0.15 ? '#f80' : '#f44');
    renderer.setGlow(fuelColor, 0.4);
    renderer.fillRect(x, y, barW * fuelPct, barH, fuelColor);
    renderer.setGlow(null);
    // Border (4 thin lines)
    renderer.fillRect(x, y, barW, 1, '#0f3460');
    renderer.fillRect(x, y + barH - 1, barW, 1, '#0f3460');
    renderer.fillRect(x, y, 1, barH, '#0f3460');
    renderer.fillRect(x + barW - 1, y, 1, barH, '#0f3460');
  }

  function drawSmokeCounter(renderer, text) {
    const x = 140, y = H - 24;
    text.drawText('SMOKE', x, y - 12, 10, '#aaa', 'left');
    for (let i = 0; i < SMOKE_MAX; i++) {
      const color = i < smokeCount ? '#b4b4b4cc' : '#16213e';
      renderer.fillCircle(x + 6 + i * 12, y + 5, 4, color);
      // Border
      renderer.fillCircle(x + 6 + i * 12, y + 5, 5, '#0f346040');
    }
  }

  function drawRadar(renderer, text) {
    const rx = W - RADAR_SIZE - RADAR_MARGIN;
    const ry = RADAR_MARGIN;

    // Background
    renderer.fillRect(rx, ry, RADAR_SIZE, RADAR_SIZE, '#0d1b2ae6');
    // Border
    renderer.fillRect(rx, ry, RADAR_SIZE, 1, '#0f3460');
    renderer.fillRect(rx, ry + RADAR_SIZE - 1, RADAR_SIZE, 1, '#0f3460');
    renderer.fillRect(rx, ry, 1, RADAR_SIZE, '#0f3460');
    renderer.fillRect(rx + RADAR_SIZE - 1, ry, 1, RADAR_SIZE, '#0f3460');

    const sx = RADAR_SIZE / MAZE_W;
    const sy = RADAR_SIZE / MAZE_H;

    // Draw walls on radar (every 2nd tile for perf)
    for (let r = 0; r < MAZE_ROWS; r += 2) {
      for (let c = 0; c < MAZE_COLS; c += 2) {
        if (maze[r][c] === 0) {
          renderer.fillRect(
            rx + c * TILE * sx, ry + r * TILE * sy,
            Math.max(1, TILE * sx * 2), Math.max(1, TILE * sy * 2),
            '#1a2a3e'
          );
        }
      }
    }

    // Flags on radar
    for (const flag of flags) {
      if (flag.collected) continue;
      const fx = rx + (flag.x + FLAG_SIZE / 2) * sx;
      const fy = ry + (flag.y + FLAG_SIZE / 2) * sy;
      renderer.fillRect(fx - 1, fy - 1, 3, 3, '#ff0');
    }

    // Enemies on radar
    for (const enemy of enemies) {
      const ex = rx + (enemy.x + CAR_SIZE / 2) * sx;
      const ey = ry + (enemy.y + CAR_SIZE / 2) * sy;
      renderer.fillRect(ex - 1, ey - 1, 3, 3, '#f44');
    }

    // Player on radar (blinking)
    if (frameCount % 20 < 15) {
      const px = rx + (player.x + CAR_SIZE / 2) * sx;
      const py = ry + (player.y + CAR_SIZE / 2) * sy;
      renderer.setGlow('#4fd', 0.5);
      renderer.fillRect(px - 2, py - 2, 4, 4, '#4fd');
      renderer.setGlow(null);
    }

    // Radar label
    text.drawText('RADAR', rx + 2, ry + RADAR_SIZE + 2, 9, '#aaa', 'left');
  }

  function drawLevelIndicator(text) {
    text.drawText(`LVL ${level}`, 10, 4, 12, '#4fd', 'left');
    text.drawText(`Flags: ${flagsLeft}/${flags ? flags.length : 0}`, 10, 20, 12, '#aaa', 'left');
  }

  function drawBonusText(text) {
    text.drawText(`ROUND ${level - 1} CLEAR!`, W / 2, H / 2 - 26, 28, '#4fd', 'center');
    text.drawText(`BONUS +${roundBonus}`, W / 2, H / 2 + 8, 18, '#ff0', 'center');
  }

  game.start();
  return game;
}
