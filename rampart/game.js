// rampart/game.js — Rampart game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Grid constants
const COLS = 25;
const ROWS = 25;
const CELL = W / COLS; // 20px

// Cell types
const EMPTY = 0;
const LAND = 1;
const WATER = 2;
const WALL = 3;
const CASTLE = 4;
const RUBBLE = 5;
const CANNON = 6;

// Tetris-like wall pieces (relative coords)
const WALL_PIECES = [
  [[0,0],[1,0],[0,1],[1,1]],           // 2x2 square
  [[0,0],[1,0],[2,0]],                  // horizontal bar
  [[0,0],[0,1],[0,2]],                  // vertical bar
  [[0,0],[1,0],[1,1]],                  // L shape
  [[0,0],[0,1],[1,1]],                  // reverse L
  [[0,0],[1,0],[2,0],[2,1]],            // big L
  [[0,0],[1,0],[1,1],[2,1]],            // S shape
  [[0,0],[1,0],[1,0]],                  // corner (deduped below)
  [[0,0],[1,0],[2,0],[1,1]],            // T shape
  [[0,0],[1,0],[2,0],[0,1]],            // J shape
];
// Fix piece 7 (corner) to match original
WALL_PIECES[7] = [[0,0],[1,0],[0,1]];

// Phase durations (in seconds)
const BUILD_TIME = 15;
const BATTLE_TIME = 18;
const REPAIR_TIME = 12;

// ── State ──
let score, best = 0;
let grid;
let phase; // 'build', 'battle', 'repair'
let phaseTimer;
let wave;

// Build/Repair phase
let currentPiece;
let pieceX, pieceY;
let nextPiece;

// Battle phase
let crosshairX, crosshairY;
let cannonCooldown;
let projectiles;
let explosions;

// Ships
let ships;
let enemyProjectiles;

// Castles
let castles;
let enclosedCastles;

// Cannons
let cannons;

// Animation
let phaseFlashTimer = 0;

// Frame counter for variable tick rate (movement repeat)
let frameCount = 0;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helper functions ──

function initGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

  // Create terrain: left 60% is land, right 40% is water
  // With a jagged coastline
  for (let r = 0; r < ROWS; r++) {
    const coastX = 14 + Math.floor(Math.sin(r * 0.8) * 2) + Math.floor(Math.random() * 2);
    for (let c = 0; c < COLS; c++) {
      if (c < coastX) {
        grid[r][c] = LAND;
      } else {
        grid[r][c] = WATER;
      }
    }
  }

  // Place castles (3x3 areas on land)
  castles = [
    { x: 3, y: 4 },
    { x: 7, y: 12 },
    { x: 3, y: 19 },
  ];

  for (const castle of castles) {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (castle.y + dy < ROWS && castle.x + dx < COLS) {
          grid[castle.y + dy][castle.x + dx] = CASTLE;
        }
      }
    }
  }
}

function getRandomPiece() {
  const idx = Math.floor(Math.random() * WALL_PIECES.length);
  return WALL_PIECES[idx].map(([x, y]) => [x, y]);
}

function rotatePiece(piece) {
  const maxY = Math.max(...piece.map(p => p[1]));
  return piece.map(([x, y]) => [maxY - y, x]);
}

function canPlacePiece(piece, px, py) {
  for (const [dx, dy] of piece) {
    const gx = px + dx;
    const gy = py + dy;
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
    const cell = grid[gy][gx];
    if (cell !== LAND && cell !== RUBBLE) return false;
  }
  return true;
}

function placePiece(piece, px, py) {
  for (const [dx, dy] of piece) {
    const gx = px + dx;
    const gy = py + dy;
    if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
      grid[gy][gx] = WALL;
    }
  }
}

function checkEnclosures() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const queue = [];

  // Start flood fill from all edge cells that are not walls/castles/cannons
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        const cell = grid[r][c];
        if (cell !== WALL && cell !== CASTLE && cell !== CANNON) {
          queue.push([r, c]);
          visited[r][c] = true;
        }
      }
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
        const cell = grid[nr][nc];
        if (cell !== WALL && cell !== CASTLE && cell !== CANNON) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
  }

  enclosedCastles = new Set();
  for (let i = 0; i < castles.length; i++) {
    const castle = castles[i];
    let enclosed = true;
    for (let dy = -1; dy <= 3; dy++) {
      for (let dx = -1; dx <= 3; dx++) {
        const cy = castle.y + dy;
        const cx = castle.x + dx;
        if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
          const cell = grid[cy][cx];
          if ((cell === LAND || cell === RUBBLE) && visited[cy][cx]) {
            enclosed = false;
          }
        }
      }
    }
    if (enclosed) {
      enclosedCastles.add(i);
      score += 50;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }
  }
}

function placeCannons() {
  // Remove old cannons from grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === CANNON) grid[r][c] = LAND;
    }
  }
  cannons = [];

  for (const idx of enclosedCastles) {
    const castle = castles[idx];
    const positions = [
      [castle.x + 3, castle.y + 1],
      [castle.x + 3, castle.y],
      [castle.x + 3, castle.y + 2],
      [castle.x - 1, castle.y + 1],
      [castle.x + 1, castle.y - 1],
      [castle.x + 1, castle.y + 3],
    ];
    for (const [cx, cy] of positions) {
      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
        const cell = grid[cy][cx];
        if (cell === LAND || cell === RUBBLE) {
          grid[cy][cx] = CANNON;
          cannons.push({ x: cx, y: cy });
          break;
        }
      }
    }
  }
}

function spawnShips() {
  ships = [];
  const numShips = Math.min(2 + wave, 6);
  for (let i = 0; i < numShips; i++) {
    const sy = 2 + Math.floor(Math.random() * (ROWS - 4));
    ships.push({
      x: COLS - 1 + Math.random() * 3,
      y: sy,
      hp: 2 + Math.floor(wave / 3),
      maxHp: 2 + Math.floor(wave / 3),
      fireTimer: Math.random() * 3 + 1,
      speed: 0.002 + Math.random() * 0.003,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
}

function startBuildPhase() {
  phase = 'build';
  phaseTimer = BUILD_TIME;
  phaseFlashTimer = 0;
  currentPiece = getRandomPiece();
  nextPiece = getRandomPiece();
  pieceX = 5;
  pieceY = 5;
}

function startBattlePhase() {
  checkEnclosures();
  placeCannons();

  phase = 'battle';
  phaseTimer = BATTLE_TIME + Math.min(wave * 2, 10);
  phaseFlashTimer = 0;
  crosshairX = 18;
  crosshairY = 12;
  cannonCooldown = 0;
  projectiles = [];
  explosions = [];
  enemyProjectiles = [];
}

function startRepairPhase() {
  phase = 'repair';
  phaseTimer = REPAIR_TIME;
  phaseFlashTimer = 0;
  currentPiece = getRandomPiece();
  nextPiece = getRandomPiece();
  pieceX = 5;
  pieceY = 5;
}

function fireCannon() {
  if (cannons.length === 0) return;
  if (cannonCooldown > 0) return;

  let bestCannon = cannons[0];
  let bestDist = Infinity;
  for (const c of cannons) {
    const dx = crosshairX - c.x;
    const dy = crosshairY - c.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestCannon = c;
    }
  }

  projectiles.push({
    x: (bestCannon.x + 0.5) * CELL,
    y: (bestCannon.y + 0.5) * CELL,
    tx: (crosshairX + 0.5) * CELL,
    ty: (crosshairY + 0.5) * CELL,
    speed: 250,
    active: true,
  });

  cannonCooldown = 0.5;
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    wave = 0;
    frameCount = 0;

    initGrid();
    ships = [];
    projectiles = [];
    explosions = [];
    enemyProjectiles = [];
    cannons = [];
    enclosedCastles = new Set();

    game.showOverlay('RAMPART', 'Build walls, fire cannons, defend! Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        wave = 1;
        spawnShips();
        startBuildPhase();
      }
      return;
    }

    // ── Game over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    const dt = 1 / 60; // fixed timestep

    phaseTimer -= dt;
    phaseFlashTimer += dt;

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].timer -= dt;
      if (explosions[i].timer <= 0) {
        explosions.splice(i, 1);
      }
    }

    // ── Build / Repair phase ──
    if (phase === 'build' || phase === 'repair') {
      // Movement
      if (input.wasPressed('ArrowLeft')) pieceX = Math.max(0, pieceX - 1);
      if (input.wasPressed('ArrowRight')) pieceX = Math.min(COLS - 1, pieceX + 1);
      if (input.wasPressed('ArrowUp')) pieceY = Math.max(0, pieceY - 1);
      if (input.wasPressed('ArrowDown')) pieceY = Math.min(ROWS - 1, pieceY + 1);

      // Hold-to-repeat: move every 6 frames while held
      if (frameCount % 6 === 0) {
        if (input.isDown('ArrowLeft')) pieceX = Math.max(0, pieceX - 1);
        if (input.isDown('ArrowRight')) pieceX = Math.min(COLS - 1, pieceX + 1);
        if (input.isDown('ArrowUp')) pieceY = Math.max(0, pieceY - 1);
        if (input.isDown('ArrowDown')) pieceY = Math.min(ROWS - 1, pieceY + 1);
      }

      // Rotate
      if (input.wasPressed('z') || input.wasPressed('Z')) {
        currentPiece = rotatePiece(currentPiece);
      }

      // Place
      if (input.wasPressed(' ')) {
        if (canPlacePiece(currentPiece, pieceX, pieceY)) {
          placePiece(currentPiece, pieceX, pieceY);
          score += 10;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          currentPiece = nextPiece;
          nextPiece = getRandomPiece();
        }
      }

      // Phase timer expired
      if (phaseTimer <= 0) {
        if (phase === 'build') {
          startBattlePhase();
        } else {
          checkEnclosures();
          if (enclosedCastles.size === 0) {
            // Game over
            game.showOverlay('GAME OVER', `Wave ${wave} -- Score: ${score} -- No castles enclosed! Press SPACE to restart`);
            game.setState('over');
            if (score > best) { best = score; bestEl.textContent = best; }
            return;
          }
          wave++;
          spawnShips();
          startBattlePhase();
        }
      }
    }

    // ── Battle phase ──
    if (phase === 'battle') {
      cannonCooldown = Math.max(0, cannonCooldown - dt);

      // Crosshair movement
      if (input.wasPressed('ArrowLeft')) crosshairX = Math.max(0, crosshairX - 1);
      if (input.wasPressed('ArrowRight')) crosshairX = Math.min(COLS - 1, crosshairX + 1);
      if (input.wasPressed('ArrowUp')) crosshairY = Math.max(0, crosshairY - 1);
      if (input.wasPressed('ArrowDown')) crosshairY = Math.min(ROWS - 1, crosshairY + 1);

      // Hold-to-repeat crosshair
      if (frameCount % 4 === 0) {
        if (input.isDown('ArrowLeft')) crosshairX = Math.max(0, crosshairX - 1);
        if (input.isDown('ArrowRight')) crosshairX = Math.min(COLS - 1, crosshairX + 1);
        if (input.isDown('ArrowUp')) crosshairY = Math.max(0, crosshairY - 1);
        if (input.isDown('ArrowDown')) crosshairY = Math.min(ROWS - 1, crosshairY + 1);
      }

      // Fire
      if (input.wasPressed(' ')) {
        fireCannon();
      }

      // Update player projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.active) { projectiles.splice(i, 1); continue; }

        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          p.active = false;
          explosions.push({
            x: p.tx, y: p.ty,
            radius: CELL * 1.5,
            timer: 0.4,
            maxTimer: 0.4,
            color: '#4ec',
          });

          // Check ship hits
          for (let j = ships.length - 1; j >= 0; j--) {
            const s = ships[j];
            const sx = (s.x + 0.5) * CELL;
            const sy = (s.y + 0.5) * CELL;
            const hitDist = Math.sqrt((sx - p.tx) ** 2 + (sy - p.ty) ** 2);
            if (hitDist < CELL * 2) {
              s.hp--;
              if (s.hp <= 0) {
                explosions.push({
                  x: sx, y: sy,
                  radius: CELL * 2.5,
                  timer: 0.6,
                  maxTimer: 0.6,
                  color: '#f80',
                });
                ships.splice(j, 1);
                score += 100;
                scoreEl.textContent = score;
                if (score > best) { best = score; bestEl.textContent = best; }
              }
            }
          }
          projectiles.splice(i, 1);
          continue;
        }

        const vx = (dx / dist) * p.speed * dt;
        const vy = (dy / dist) * p.speed * dt;
        p.x += vx;
        p.y += vy;
      }

      // Update enemy ships
      for (const s of ships) {
        s.bobPhase += dt * 2;

        const coastTarget = 15;
        if (s.x > coastTarget) {
          s.x -= s.speed * dt * 60;
        }

        s.fireTimer -= dt;
        if (s.fireTimer <= 0) {
          s.fireTimer = 2 + Math.random() * 3 - Math.min(wave * 0.2, 1.5);

          const targetX = 2 + Math.floor(Math.random() * 12);
          const targetY = Math.floor(Math.random() * ROWS);

          enemyProjectiles.push({
            x: s.x * CELL,
            y: (s.y + 0.5) * CELL,
            tx: targetX * CELL + CELL / 2,
            ty: targetY * CELL + CELL / 2,
            speed: 120 + wave * 10,
            active: true,
          });
        }
      }

      // Update enemy projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        if (!p.active) { enemyProjectiles.splice(i, 1); continue; }

        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          p.active = false;
          explosions.push({
            x: p.tx, y: p.ty,
            radius: CELL * 1.2,
            timer: 0.35,
            maxTimer: 0.35,
            color: '#f44',
          });

          // Destroy walls in blast radius
          const gcx = Math.floor(p.tx / CELL);
          const gcy = Math.floor(p.ty / CELL);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = gcy + dr;
              const nc = gcx + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (grid[nr][nc] === WALL) {
                  grid[nr][nc] = RUBBLE;
                }
              }
            }
          }
          enemyProjectiles.splice(i, 1);
          continue;
        }

        const vx = (dx / dist) * p.speed * dt;
        const vy = (dy / dist) * p.speed * dt;
        p.x += vx;
        p.y += vy;
      }

      // End battle phase
      if (phaseTimer <= 0) {
        startRepairPhase();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // ── Draw grid ──
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const cell = grid[r][c];

        switch (cell) {
          case LAND:
            renderer.fillRect(x, y, CELL, CELL, '#1a2a1e');
            // Subtle grid line (slightly lighter border)
            renderer.drawLine(x, y, x + CELL, y, '#1e3322', 0.5);
            renderer.drawLine(x, y, x, y + CELL, '#1e3322', 0.5);
            break;

          case WATER: {
            const waterAlpha = 0.6 + 0.08 + Math.sin((r + c) * 0.5 + phaseFlashTimer * 1.5) * 0.02;
            // Approximate water color: rgba(30, 60, 120, waterAlpha)
            // Pre-multiply into hex approximation
            const b = Math.floor(30 * waterAlpha);
            const g = Math.floor(60 * waterAlpha);
            const bl = Math.floor(120 * waterAlpha);
            const hex = '#' +
              b.toString(16).padStart(2, '0') +
              g.toString(16).padStart(2, '0') +
              bl.toString(16).padStart(2, '0');
            renderer.fillRect(x, y, CELL, CELL, hex);
            break;
          }

          case WALL:
            renderer.setGlow('#4ec', 0.4);
            renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#4ec');
            renderer.setGlow(null);
            // Brick border
            renderer.drawLine(x + 1, y + 1, x + CELL - 1, y + 1, '#2a8a7a', 0.5);
            renderer.drawLine(x + 1, y + 1, x + 1, y + CELL - 1, '#2a8a7a', 0.5);
            renderer.drawLine(x + CELL - 1, y + 1, x + CELL - 1, y + CELL - 1, '#2a8a7a', 0.5);
            renderer.drawLine(x + 1, y + CELL - 1, x + CELL - 1, y + CELL - 1, '#2a8a7a', 0.5);
            break;

          case CASTLE:
            renderer.setGlow('#b8860b', 0.5);
            renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#b8860b');
            renderer.setGlow(null);
            // Inner castle detail
            renderer.fillRect(x + 3, y + 3, CELL - 6, CELL - 6, '#daa520');
            break;

          case RUBBLE:
            renderer.fillRect(x, y, CELL, CELL, '#1a2a1e');
            // Rubble dots
            renderer.fillRect(x + 3, y + 5, 3, 3, '#555555');
            renderer.fillRect(x + 9, y + 2, 4, 3, '#555555');
            renderer.fillRect(x + 6, y + 11, 3, 4, '#555555');
            break;

          case CANNON:
            renderer.fillRect(x, y, CELL, CELL, '#1a2a1e');
            // Cannon body (circle)
            renderer.setGlow('#4ec', 0.5);
            renderer.fillCircle(x + CELL / 2, y + CELL / 2, CELL / 3, '#888888');
            renderer.setGlow(null);
            // Barrel
            renderer.fillRect(x + CELL / 2, y + CELL / 2 - 2, CELL / 2, 4, '#aaaaaa');
            break;
        }
      }
    }

    // ── Draw enclosure highlights ──
    if (enclosedCastles && enclosedCastles.size > 0) {
      for (const idx of enclosedCastles) {
        const castle = castles[idx];
        const ex = castle.x * CELL - 2;
        const ey = castle.y * CELL - 2;
        const ew = 3 * CELL + 4;
        const eh = 3 * CELL + 4;
        renderer.setGlow('#4ec', 0.6);
        // Stroke rect as 4 lines
        renderer.drawLine(ex, ey, ex + ew, ey, '#4ec', 2);
        renderer.drawLine(ex + ew, ey, ex + ew, ey + eh, '#4ec', 2);
        renderer.drawLine(ex + ew, ey + eh, ex, ey + eh, '#4ec', 2);
        renderer.drawLine(ex, ey + eh, ex, ey, '#4ec', 2);
        renderer.setGlow(null);
      }
    }

    // ── Draw ships ──
    for (const s of ships) {
      const sx = s.x * CELL;
      const sy = (s.y + Math.sin(s.bobPhase) * 0.15) * CELL;

      // Ship hull (polygon)
      renderer.setGlow('#f44', 0.6);
      renderer.fillPoly([
        { x: sx - CELL * 0.3, y: sy + CELL * 0.6 },
        { x: sx + CELL * 1.3, y: sy + CELL * 0.6 },
        { x: sx + CELL,       y: sy + CELL },
        { x: sx,              y: sy + CELL },
      ], '#c44');
      renderer.setGlow(null);

      // Mast
      renderer.drawLine(
        sx + CELL * 0.5, sy + CELL * 0.6,
        sx + CELL * 0.5, sy - CELL * 0.2,
        '#a33', 2
      );

      // Sail (triangle)
      renderer.fillPoly([
        { x: sx + CELL * 0.5, y: sy - CELL * 0.1 },
        { x: sx + CELL * 0.1, y: sy + CELL * 0.3 },
        { x: sx + CELL * 0.5, y: sy + CELL * 0.5 },
      ], '#faa');

      // HP bar
      const hpRatio = s.hp / s.maxHp;
      renderer.fillRect(sx, sy - CELL * 0.4, CELL, 3, '#400');
      renderer.fillRect(sx, sy - CELL * 0.4, CELL * hpRatio, 3, hpRatio > 0.5 ? '#00ff00' : '#ff8800');
    }

    // ── Draw player projectiles ──
    for (const p of projectiles) {
      renderer.setGlow('#4ec', 0.7);
      renderer.fillCircle(p.x, p.y, 3, '#4ec');
      renderer.setGlow(null);
    }

    // ── Draw enemy projectiles ──
    for (const p of enemyProjectiles) {
      renderer.setGlow('#f44', 0.6);
      renderer.fillCircle(p.x, p.y, 3, '#f44');
      renderer.setGlow(null);
    }

    // ── Draw explosions ──
    for (const e of explosions) {
      const progress = 1 - (e.timer / e.maxTimer);
      const eR = e.radius * (0.5 + progress * 0.5);

      // Parse color, compute alpha-blended version
      // Inner explosion
      const alphaInner = (1 - progress) * 0.6;
      const alphaOuter = (1 - progress) * 0.3;

      // Use hex with alpha approximation
      // For #4ec: rgba(68, 238, 204, alpha)
      // For #f80: rgba(255, 136, 0, alpha)
      // For #f44: rgba(255, 68, 68, alpha)
      const innerAlphaHex = Math.max(0, Math.min(255, Math.floor(alphaInner * 255))).toString(16).padStart(2, '0');
      const outerAlphaHex = Math.max(0, Math.min(255, Math.floor(alphaOuter * 255))).toString(16).padStart(2, '0');

      let baseHex;
      if (e.color === '#4ec') baseHex = '44eecc';
      else if (e.color === '#f80') baseHex = 'ff8800';
      else if (e.color === '#f44') baseHex = 'ff4444';
      else baseHex = 'ffffff';

      renderer.setGlow(e.color, 0.8);
      renderer.fillCircle(e.x, e.y, eR, '#' + baseHex + innerAlphaHex);
      renderer.fillCircle(e.x, e.y, eR * 1.5, '#' + baseHex + outerAlphaHex);
      renderer.setGlow(null);
    }

    // ── Draw piece preview during build/repair ──
    if ((phase === 'build' || phase === 'repair') && game.state === 'playing' && currentPiece) {
      const canPlace = canPlacePiece(currentPiece, pieceX, pieceY);
      for (const [dx, dy] of currentPiece) {
        const px = (pieceX + dx) * CELL;
        const py = (pieceY + dy) * CELL;
        if (canPlace) {
          renderer.setGlow('#4ec', 0.6);
          renderer.fillRect(px + 1, py + 1, CELL - 2, CELL - 2, '#44eecc80');
          renderer.setGlow(null);
        } else {
          renderer.setGlow('#f44', 0.6);
          renderer.fillRect(px + 1, py + 1, CELL - 2, CELL - 2, '#ff444480');
          renderer.setGlow(null);
        }
      }

      // Next piece preview box (top-right)
      renderer.fillRect(W - 90, 5, 85, 70, '#16213ed9');
      // Border
      renderer.drawLine(W - 90, 5, W - 5, 5, '#0f3460', 1);
      renderer.drawLine(W - 5, 5, W - 5, 75, '#0f3460', 1);
      renderer.drawLine(W - 5, 75, W - 90, 75, '#0f3460', 1);
      renderer.drawLine(W - 90, 75, W - 90, 5, '#0f3460', 1);

      text.drawText('NEXT', W - 48, 8, 10, '#888888', 'center');

      if (nextPiece) {
        for (const [dx, dy] of nextPiece) {
          const px = W - 72 + dx * 14;
          const py = 22 + dy * 14;
          renderer.fillRect(px, py, 12, 12, '#4ec');
        }
      }
    }

    // ── Draw crosshair during battle ──
    if (phase === 'battle' && game.state === 'playing') {
      const cx = (crosshairX + 0.5) * CELL;
      const cy = (crosshairY + 0.5) * CELL;
      const pulse = Math.sin(phaseFlashTimer * 6) * 2 + 10;

      renderer.setGlow('#4ec', 0.6);
      // Crosshair lines
      renderer.drawLine(cx - pulse, cy, cx - 4, cy, '#4ec', 2);
      renderer.drawLine(cx + 4, cy, cx + pulse, cy, '#4ec', 2);
      renderer.drawLine(cx, cy - pulse, cx, cy - 4, '#4ec', 2);
      renderer.drawLine(cx, cy + 4, cx, cy + pulse, '#4ec', 2);

      // Crosshair circle (approximate with polygon)
      const segments = 16;
      const circPts = [];
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        circPts.push({ x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6 });
      }
      renderer.strokePoly(circPts, '#4ec', 1.5, true);
      renderer.setGlow(null);
    }

    // ── Phase & Timer HUD ──
    if (game.state === 'playing') {
      // Phase banner background
      renderer.fillRect(0, 0, W, 24, '#16213ed9');

      let phaseLabel = '';
      let phaseColor = '#4ec';
      if (phase === 'build') { phaseLabel = 'BUILD PHASE'; phaseColor = '#4ec'; }
      else if (phase === 'battle') { phaseLabel = 'BATTLE PHASE'; phaseColor = '#f44'; }
      else if (phase === 'repair') { phaseLabel = 'REPAIR PHASE'; phaseColor = '#ff0'; }

      const timeLeft = Math.max(0, Math.ceil(phaseTimer));
      const showText = timeLeft > 3 || Math.floor(phaseFlashTimer * 4) % 2 === 0;

      if (showText) {
        renderer.setGlow(phaseColor, 0.7);
        text.drawText(phaseLabel, 8, 5, 14, phaseColor, 'left');
        renderer.setGlow(null);
      }

      // Timer
      const timerColor = timeLeft <= 3 ? '#f44' : '#e0e0e0';
      text.drawText('TIME: ' + timeLeft + 's', W - 8, 5, 14, timerColor, 'right');

      // Wave indicator
      text.drawText('WAVE ' + wave, W / 2, 5, 12, '#888888', 'center');

      // Controls hint at bottom
      renderer.fillRect(0, H - 22, W, 22, '#16213ebf');
      if (phase === 'build' || phase === 'repair') {
        text.drawText('ARROWS: Move  Z: Rotate  SPACE: Place', W / 2, H - 18, 11, '#666666', 'center');
      } else if (phase === 'battle') {
        text.drawText('ARROWS: Aim  SPACE: Fire', W / 2, H - 18, 11, '#666666', 'center');
      }

      // Enclosed castles count
      text.drawText('Castles: ' + (enclosedCastles ? enclosedCastles.size : 0) + '/' + castles.length, W / 2, H - 36, 12, '#4ec', 'center');
    }
  };

  game.start();
  return game;
}
