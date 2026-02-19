// pac-man/game.js — Pac-Man game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 460;
const H = 520;

// --- MAZE DEFINITION ---
// 0 = path (dot), 1 = wall, 2 = empty (no dot), 3 = power pellet, 4 = ghost house
const COLS = 23;
const ROWS = 22;
const TILE = 20;

// Classic-inspired maze layout (23 wide x 22 tall)
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1],
  [1,3,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,3,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,0,1,1,1,1,2,1,2,1,1,1,1,0,1,1,1,1,1],
  [2,2,2,2,1,0,1,2,2,2,2,2,2,2,2,2,1,0,1,2,2,2,2],
  [1,1,1,1,1,0,1,2,1,1,1,4,1,1,1,2,1,0,1,1,1,1,1],
  [2,2,2,2,2,0,2,2,1,4,4,4,4,4,1,2,2,0,2,2,2,2,2],
  [1,1,1,1,1,0,1,2,1,4,4,4,4,4,1,2,1,0,1,1,1,1,1],
  [2,2,2,2,1,0,1,2,1,1,1,1,1,1,1,2,1,0,1,2,2,2,2],
  [1,1,1,1,1,0,1,2,2,2,2,2,2,2,2,2,1,0,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1],
  [1,3,0,0,1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,3,1],
  [1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- CONSTANTS ---
const PAC_SPEED = 2;
const GHOST_SPEED = 1.6;
const GHOST_COLORS = ['#f44', '#f8b', '#0ff', '#f80']; // red, pink, cyan, orange
const GHOST_NAMES = ['blinky', 'pinky', 'inky', 'clyde'];
const FRIGHTENED_COLOR = '#44f';
const FRIGHTENED_FLASH = '#fff';

// Pac-Man start position (tile coords)
const PAC_START_COL = 11;
const PAC_START_ROW = 16;

// Ghost start positions (tile coords, inside ghost house)
const GHOST_STARTS = [
  { col: 11, row: 9 },   // blinky - starts above house
  { col: 10, row: 10 },  // pinky
  { col: 11, row: 10 },  // inky
  { col: 12, row: 10 },  // clyde
];

// Scatter targets (corners)
const SCATTER_TARGETS = [
  { col: COLS - 2, row: 1 },          // blinky -> top-right
  { col: 1, row: 1 },                 // pinky -> top-left
  { col: COLS - 2, row: ROWS - 2 },   // inky -> bottom-right
  { col: 1, row: ROWS - 2 },          // clyde -> bottom-left
];

// Mode durations: scatter/chase alternating
const MODE_DURATIONS = [7000, 20000, 7000, 20000, 5000, 20000, 5000];

// --- STATE ---
let maze, totalDots, dotsEaten;
let pacman;
let ghosts;
let frightenedTimer, frightenedDuration, ghostEatCombo;
let score, best = 0;
let lives, level;
let mouthAngle, mouthDir, pelletPulse;
let modeTimer, modePhase;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- HELPERS ---
function deepCopyMaze() {
  return MAZE_TEMPLATE.map(row => [...row]);
}

function countDots(m) {
  let count = 0;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c] === 0 || m[r][c] === 3) count++;
    }
  }
  return count;
}

function tileToPixel(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function pixelToTile(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

function isWall(col, row) {
  if (row < 0 || row >= maze.length) return true;
  if (col < 0 || col >= COLS) return false;
  return maze[row][col] === 1;
}

function isGhostHouse(col, row) {
  if (row < 0 || row >= maze.length || col < 0 || col >= COLS) return false;
  return MAZE_TEMPLATE[row][col] === 4;
}

function canMove(col, row, isGhost) {
  if (row < 0 || row >= maze.length) return false;
  if (col < 0 || col >= COLS) return true;
  const tile = maze[row][col];
  if (tile === 1) return false;
  if (tile === 4 && !isGhost) return false;
  return true;
}

function wrapCol(col) {
  if (col < 0) return COLS - 1;
  if (col >= COLS) return 0;
  return col;
}

function distSq(c1, r1, c2, r2) {
  return (c1 - c2) * (c1 - c2) + (r1 - r2) * (r1 - r2);
}

// --- ENTITY CREATION ---
function createPacman() {
  const pos = tileToPixel(PAC_START_COL, PAC_START_ROW);
  return {
    x: pos.x,
    y: pos.y,
    dir: { x: 0, y: 0 },
    nextDir: { x: -1, y: 0 },
    col: PAC_START_COL,
    row: PAC_START_ROW,
    moving: false,
  };
}

function createGhost(index) {
  const start = GHOST_STARTS[index];
  const pos = tileToPixel(start.col, start.row);
  return {
    x: pos.x,
    y: pos.y,
    col: start.col,
    row: start.row,
    dir: { x: 0, y: -1 },
    color: GHOST_COLORS[index],
    name: GHOST_NAMES[index],
    index: index,
    mode: index === 0 ? 'scatter' : 'house',
    houseTimer: index * 120,
    frightened: false,
    eaten: false,
    speed: GHOST_SPEED,
  };
}

// --- LEVEL MANAGEMENT ---
function resetLevel() {
  maze = deepCopyMaze();
  totalDots = countDots(maze);
  dotsEaten = 0;
  pacman = createPacman();
  ghosts = [createGhost(0), createGhost(1), createGhost(2), createGhost(3)];
  frightenedTimer = 0;
  frightenedDuration = Math.max(3000, 8000 - (level - 1) * 1000);
  ghostEatCombo = 0;
  mouthAngle = 0;
  mouthDir = 1;
  pelletPulse = 0;
  modeTimer = 0;
  modePhase = 0;
}

function resetAfterDeath() {
  pacman = createPacman();
  ghosts = [createGhost(0), createGhost(1), createGhost(2), createGhost(3)];
  frightenedTimer = 0;
  ghostEatCombo = 0;
}

// --- MOVEMENT ---
function alignedToTile(entity) {
  const center = tileToPixel(entity.col, entity.row);
  return Math.abs(entity.x - center.x) < 1.5 && Math.abs(entity.y - center.y) < 1.5;
}

function snapToTile(entity) {
  const center = tileToPixel(entity.col, entity.row);
  entity.x = center.x;
  entity.y = center.y;
}

function updatePacman() {
  if (alignedToTile(pacman)) {
    snapToTile(pacman);
    const tile = pixelToTile(pacman.x, pacman.y);
    pacman.col = tile.col;
    pacman.row = tile.row;

    // Try next direction first
    const nextCol = wrapCol(pacman.col + pacman.nextDir.x);
    const nextRow = pacman.row + pacman.nextDir.y;
    if (canMove(nextCol, nextRow, false)) {
      pacman.dir = { ...pacman.nextDir };
      pacman.moving = true;
    } else {
      // Try continuing in current direction
      const contCol = wrapCol(pacman.col + pacman.dir.x);
      const contRow = pacman.row + pacman.dir.y;
      if (!canMove(contCol, contRow, false)) {
        pacman.moving = false;
      }
    }

    // Eat dot
    if (pacman.row >= 0 && pacman.row < maze.length && pacman.col >= 0 && pacman.col < COLS) {
      const t = maze[pacman.row][pacman.col];
      if (t === 0) {
        maze[pacman.row][pacman.col] = 2;
        score += 10;
        dotsEaten++;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
      } else if (t === 3) {
        maze[pacman.row][pacman.col] = 2;
        score += 50;
        dotsEaten++;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        activateFrightened();
      }
    }

    // Check level complete
    if (dotsEaten >= totalDots) {
      level++;
      resetLevel();
      return;
    }
  }

  if (pacman.moving) {
    pacman.x += pacman.dir.x * PAC_SPEED;
    pacman.y += pacman.dir.y * PAC_SPEED;

    // Tunnel wrapping
    if (pacman.x < -TILE / 2) {
      pacman.x = COLS * TILE + TILE / 2;
    } else if (pacman.x > COLS * TILE + TILE / 2) {
      pacman.x = -TILE / 2;
    }

    // Update tile position
    const t = pixelToTile(pacman.x, pacman.y);
    if (t.col >= 0 && t.col < COLS) {
      pacman.col = t.col;
    }
    pacman.row = t.row;
  }
}

// --- FRIGHTENED MODE ---
function activateFrightened() {
  frightenedTimer = frightenedDuration;
  ghostEatCombo = 0;
  for (const ghost of ghosts) {
    if (ghost.mode !== 'house' && !ghost.eaten) {
      ghost.frightened = true;
      ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
    }
  }
}

// --- GHOST AI ---
function getGhostTarget(ghost) {
  if (ghost.frightened) {
    return { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * maze.length) };
  }
  if (ghost.eaten) {
    return { col: 11, row: 10 };
  }
  if (ghost.mode === 'scatter') {
    return SCATTER_TARGETS[ghost.index];
  }
  // Chase mode
  switch (ghost.index) {
    case 0: // Blinky - directly targets pac-man
      return { col: pacman.col, row: pacman.row };
    case 1: // Pinky - targets 4 tiles ahead of pac-man
      return {
        col: Math.max(0, Math.min(COLS - 1, pacman.col + pacman.dir.x * 4)),
        row: Math.max(0, Math.min(maze.length - 1, pacman.row + pacman.dir.y * 4)),
      };
    case 2: { // Inky - uses blinky's position to calculate target
      const blinky = ghosts[0];
      const aheadCol = pacman.col + pacman.dir.x * 2;
      const aheadRow = pacman.row + pacman.dir.y * 2;
      return {
        col: Math.max(0, Math.min(COLS - 1, aheadCol + (aheadCol - blinky.col))),
        row: Math.max(0, Math.min(maze.length - 1, aheadRow + (aheadRow - blinky.row))),
      };
    }
    case 3: { // Clyde - chases when far, scatters when close
      const dist = Math.abs(ghost.col - pacman.col) + Math.abs(ghost.row - pacman.row);
      if (dist > 8) {
        return { col: pacman.col, row: pacman.row };
      }
      return SCATTER_TARGETS[ghost.index];
    }
    default:
      return { col: pacman.col, row: pacman.row };
  }
}

function updateGhost(ghost) {
  const speedMul = ghost.eaten ? 2.5 : (ghost.frightened ? 0.6 : 1.0);
  const spd = ghost.speed * speedMul * (1 + (level - 1) * 0.08);

  // Ghost house logic
  if (ghost.mode === 'house') {
    ghost.houseTimer -= 1;
    if (ghost.houseTimer <= 0) {
      ghost.mode = 'scatter';
      const exitPos = tileToPixel(11, 8);
      ghost.x = exitPos.x;
      ghost.y = exitPos.y;
      ghost.col = 11;
      ghost.row = 8;
      ghost.dir = { x: -1, y: 0 };
    } else {
      ghost.y += Math.sin(ghost.houseTimer * 0.1) * 0.5;
      return;
    }
  }

  // Eaten ghost returning to house
  if (ghost.eaten) {
    if (ghost.col === 11 && ghost.row === 10 && alignedToTile(ghost)) {
      ghost.eaten = false;
      ghost.frightened = false;
      ghost.mode = 'scatter';
      const pos = tileToPixel(11, 8);
      ghost.x = pos.x;
      ghost.y = pos.y;
      ghost.col = 11;
      ghost.row = 8;
      return;
    }
  }

  if (alignedToTile(ghost)) {
    snapToTile(ghost);
    const t = pixelToTile(ghost.x, ghost.y);
    ghost.col = wrapCol(t.col);
    ghost.row = t.row;

    const target = getGhostTarget(ghost);
    const directions = [
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ];

    let bestDir = ghost.dir;
    let bestDist = Infinity;
    const reverse = { x: -ghost.dir.x, y: -ghost.dir.y };

    for (const d of directions) {
      if (d.x === reverse.x && d.y === reverse.y) continue;
      const nextCol = wrapCol(ghost.col + d.x);
      const nextRow = ghost.row + d.y;
      if (!canMove(nextCol, nextRow, true)) continue;
      if (!ghost.eaten && isGhostHouse(nextCol, nextRow)) continue;
      const dist = distSq(nextCol, nextRow, target.col, target.row);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = d;
      }
    }
    ghost.dir = bestDir;
  }

  ghost.x += ghost.dir.x * spd;
  ghost.y += ghost.dir.y * spd;

  // Tunnel wrapping
  if (ghost.x < -TILE / 2) {
    ghost.x = COLS * TILE + TILE / 2;
  } else if (ghost.x > COLS * TILE + TILE / 2) {
    ghost.x = -TILE / 2;
  }

  const t2 = pixelToTile(ghost.x, ghost.y);
  if (t2.col >= 0 && t2.col < COLS) {
    ghost.col = t2.col;
  }
  ghost.row = t2.row;
}

// --- MODE SWITCHING ---
function updateModes(dt) {
  if (frightenedTimer > 0) {
    frightenedTimer -= dt;
    if (frightenedTimer <= 0) {
      frightenedTimer = 0;
      for (const ghost of ghosts) {
        ghost.frightened = false;
      }
    }
    return;
  }

  modeTimer += dt;
  if (modePhase < MODE_DURATIONS.length && modeTimer >= MODE_DURATIONS[modePhase]) {
    modeTimer = 0;
    modePhase++;
    const newMode = (modePhase % 2 === 0) ? 'scatter' : 'chase';
    for (const ghost of ghosts) {
      if (ghost.mode !== 'house' && !ghost.eaten) {
        ghost.mode = newMode;
        ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
      }
    }
  }
}

// --- COLLISION ---
function checkCollisions(game) {
  for (const ghost of ghosts) {
    if (ghost.mode === 'house') continue;
    const dx = pacman.x - ghost.x;
    const dy = pacman.y - ghost.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < TILE * 0.8) {
      if (ghost.frightened && !ghost.eaten) {
        ghost.eaten = true;
        ghost.frightened = false;
        ghostEatCombo++;
        const bonus = 200 * Math.pow(2, ghostEatCombo - 1);
        score += bonus;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
      } else if (!ghost.eaten) {
        lives--;
        if (lives <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
          game.setState('over');
        } else {
          resetAfterDeath();
        }
        return;
      }
    }
  }
}

// --- DRAWING HELPERS ---

// Draw pac-man as a filled pie shape using fillPoly
function drawPacman(renderer) {
  const angle = pacman.moving ? mouthAngle : 0.25;
  let rotation = 0;
  if (pacman.dir.x === 1) rotation = 0;
  else if (pacman.dir.x === -1) rotation = Math.PI;
  else if (pacman.dir.y === -1) rotation = -Math.PI / 2;
  else if (pacman.dir.y === 1) rotation = Math.PI / 2;

  const r = TILE / 2 - 1;
  const cx = pacman.x;
  const cy = pacman.y;

  // Build pie shape as polygon points
  const points = [];
  // Start at the mouth opening (center)
  points.push({ x: cx, y: cy });

  // Arc from mouth angle to 2*PI - mouth angle
  const startAngle = rotation + angle;
  const endAngle = rotation + Math.PI * 2 - angle;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  renderer.setGlow('#fd0', 0.6);
  renderer.fillPoly(points, '#fd0');
  renderer.setGlow(null);
}

// Draw ghost body as a polygon (rounded top approximated + wavy bottom)
function drawGhostBody(renderer, x, y, color) {
  const r = TILE / 2 - 1;
  const points = [];

  // Rounded top (semicircle, going from left to right)
  const arcSteps = 12;
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI + (Math.PI * i / arcSteps);
    points.push({ x: x + Math.cos(a) * r, y: (y - 2) + Math.sin(a) * r });
  }

  // Right side down
  points.push({ x: x + r, y: y + r - 2 });

  // Wavy bottom (3 waves, right to left)
  const waves = 3;
  const waveW = (r * 2) / waves;
  for (let i = 0; i < waves; i++) {
    const wx = x + r - i * waveW;
    // Approximate quadratic curves with midpoints
    points.push({ x: wx - waveW / 4, y: y + r + 1 });
    points.push({ x: wx - waveW / 2, y: y + r - 2 });
    points.push({ x: wx - waveW * 3 / 4, y: y + r - 5 });
    points.push({ x: wx - waveW, y: y + r - 2 });
  }

  renderer.setGlow(color, 0.5);
  renderer.fillPoly(points, color);
  renderer.setGlow(null);
}

// Draw ghost eyes
function drawGhostEyes(renderer, x, y, dir) {
  // White of eyes (approximated as circles)
  renderer.fillCircle(x - 3.5, y - 3, 4, '#fff');
  renderer.fillCircle(x + 3.5, y - 3, 4, '#fff');
  // Pupils
  const px = dir.x * 2;
  const py = dir.y * 2;
  renderer.fillCircle(x - 3.5 + px, y - 3 + py, 2, '#00c');
  renderer.fillCircle(x + 3.5 + px, y - 3 + py, 2, '#00c');
}

// Draw frightened face (small white dots for eyes + wavy mouth line)
function drawFrightenedFace(renderer, x, y) {
  renderer.fillCircle(x - 3, y - 3, 2, '#fff');
  renderer.fillCircle(x + 3, y - 3, 2, '#fff');
  // Wavy mouth approximated as small line segments
  for (let i = 0; i < 4; i++) {
    const x1 = x - 5 + i * 2.5;
    const y1 = y + (i % 2 === 0 ? 3 : 5);
    const x2 = x - 5 + (i + 1) * 2.5;
    const y2 = y + ((i + 1) % 2 === 0 ? 3 : 5);
    renderer.drawLine(x1, y1, x2, y2, '#fff', 1);
  }
}

function drawGhost(renderer, ghost) {
  const x = ghost.x;
  const y = ghost.y;

  if (ghost.eaten) {
    // Just draw eyes
    drawGhostEyes(renderer, x, y, ghost.dir);
    return;
  }

  let color;
  if (ghost.frightened) {
    if (frightenedTimer < 2000 && Math.floor(frightenedTimer / 200) % 2 === 0) {
      color = FRIGHTENED_FLASH;
    } else {
      color = FRIGHTENED_COLOR;
    }
  } else {
    color = ghost.color;
  }

  drawGhostBody(renderer, x, y, color);

  if (!ghost.frightened) {
    drawGhostEyes(renderer, x, y, ghost.dir);
  } else {
    drawFrightenedFace(renderer, x, y);
  }
}

function drawMaze(renderer, text) {
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const tile = maze[r][c];

      if (tile === 1) {
        // Wall
        renderer.fillRect(x, y, TILE, TILE, '#1a237e');
        // Wall borders for depth (only on sides adjacent to non-wall)
        const top = r > 0 && maze[r - 1][c] !== 1;
        const bot = r < maze.length - 1 && maze[r + 1][c] !== 1;
        const left = c > 0 && maze[r][c - 1] !== 1;
        const right = c < COLS - 1 && maze[r][c + 1] !== 1;
        if (top) renderer.fillRect(x, y, TILE, 1, '#3949ab');
        if (bot) renderer.fillRect(x, y + TILE - 1, TILE, 1, '#3949ab');
        if (left) renderer.fillRect(x, y, 1, TILE, '#3949ab');
        if (right) renderer.fillRect(x + TILE - 1, y, 1, TILE, '#3949ab');
      } else if (tile === 0) {
        // Dot
        renderer.fillCircle(x + TILE / 2, y + TILE / 2, 2.5, '#ffcc80');
      } else if (tile === 3) {
        // Power pellet (pulsing)
        const pulseSize = 5 + Math.sin(pelletPulse) * 2;
        renderer.setGlow('#ffcc80', 0.5);
        renderer.fillCircle(x + TILE / 2, y + TILE / 2, pulseSize, '#ffcc80');
        renderer.setGlow(null);
      } else if (tile === 4) {
        // Ghost house floor
        renderer.fillRect(x, y, TILE, TILE, '#0d1333');
      }
    }
  }

  // Ghost house gate
  renderer.fillRect(10 * TILE, 9 * TILE - 1, 3 * TILE, 2, '#f8b');
}

function drawLives(renderer) {
  for (let i = 0; i < lives - 1; i++) {
    const lx = 20 + i * 22;
    const ly = maze.length * TILE + (H - maze.length * TILE) / 2;
    // Simple pac-man icon for lives (small circle)
    const points = [];
    const r = 7;
    points.push({ x: lx, y: ly });
    const startA = 0.25;
    const endA = Math.PI * 2 - 0.25;
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const a = startA + (endA - startA) * (s / steps);
      points.push({ x: lx + Math.cos(a) * r, y: ly + Math.sin(a) * r });
    }
    renderer.fillPoly(points, '#fd0');
  }
}

function drawLevel(textRenderer) {
  textRenderer.drawText('Level ' + level, W - 10, maze.length * TILE + (H - maze.length * TILE) / 2 - 6, 12, '#aaa', 'right');
}

// --- MAIN EXPORT ---
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    lives = 3;
    level = 1;
    resetLevel();
    game.showOverlay('PAC-MAN', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---

    // Direction input
    if (input.wasPressed('ArrowLeft'))  pacman.nextDir = { x: -1, y: 0 };
    if (input.wasPressed('ArrowRight')) pacman.nextDir = { x: 1, y: 0 };
    if (input.wasPressed('ArrowUp'))    pacman.nextDir = { x: 0, y: -1 };
    if (input.wasPressed('ArrowDown'))  pacman.nextDir = { x: 0, y: 1 };

    // Mouth animation
    mouthAngle += mouthDir * 0.12;
    if (mouthAngle > 0.9) mouthDir = -1;
    if (mouthAngle < 0.05) mouthDir = 1;

    // Power pellet pulse
    pelletPulse += 0.05;

    updatePacman();
    updateModes(dt);
    for (const ghost of ghosts) {
      updateGhost(ghost);
    }
    checkCollisions(game);

    // Update game data for ML
    window.gameData = {
      pacX: pacman.col,
      pacY: pacman.row,
      pacDir: pacman.dir,
      ghosts: ghosts.map(g => ({ x: g.col, y: g.row, frightened: g.frightened, eaten: g.eaten, mode: g.mode })),
      lives: lives,
      level: level,
      dotsLeft: totalDots - dotsEaten,
    };
  };

  game.onDraw = (renderer, text) => {
    drawMaze(renderer, text);
    drawPacman(renderer);
    for (const ghost of ghosts) {
      drawGhost(renderer, ghost);
    }
    drawLives(renderer);
    drawLevel(text);
  };

  game.start();
  return game;
}
