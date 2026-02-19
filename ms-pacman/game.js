// ms-pacman/game.js — Ms. Pac-Man game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 448;
const H = 496;
const T = 16;
const COLS = 28;
const ROWS = 31;

// Directions: 0=right, 1=down, 2=left, 3=up
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

// Ghost colors
const GHOST_COLORS = ['#f00', '#f9b', '#0ff', '#f80'];
const FRIGHTENED_COLOR = '#22f';
const FRIGHTENED_FLASH = '#fff';

// 4 maze layouts, 31 rows x 28 cols each
// W=wall .=dot o=power -=ghost_door G=ghost_house E=empty T=tunnel
const MAZES = [
  [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W............WW............W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'WoWWWW.WWWWW.WW.WWWWW.WWWWoW',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'W..........................W',
    'W.WWWW.WW.WWWWWWWW.WW.WWWW.W',
    'W.WWWW.WW.WWWWWWWW.WW.WWWW.W',
    'W......WW....WW....WW......W',
    'WWWWWW.WWWWWEWWEWWWWW.WWWWWW',
    'EEEEWW.WWWWWEWWEWWWWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEW------WEWW.WWEEEE',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'TTEEEE.EEEWGGGGGGWEEE.EEEETT',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'WWWWWW.WWEWWWWWWWWEWW.WWWWWW',
    'W............WW............W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'Wo..WW................WW..oW',
    'WWW.WW.WW.WWWWWWWW.WW.WW.WWW',
    'WWW.WW.WW.WWWWWWWW.WW.WW.WWW',
    'W......WW....WW....WW......W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W..........................W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ],
  [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W..........................W',
    'W.WWWW.WW.WWWWWWWW.WW.WWWW.W',
    'WoWWWW.WW.WWWWWWWW.WW.WWWWoW',
    'W.WWWW.WW....WW....WW.WWWW.W',
    'W......WWWWW.WW.WWWWW......W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'W.WWWW.......WW.......WWWW.W',
    'W......WW....WW....WW......W',
    'WWWWWW.WWWWWEWWEWWWWW.WWWWWW',
    'EEEEWW.WWWWWEWWEWWWWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEW------WEWW.WWEEEE',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'TTEEEE.EEEWGGGGGGWEEE.EEEETT',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'WWWWWW.WWEWWWWWWWWEWW.WWWWWW',
    'W............WW............W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'Wo.WWW.WWWWW.WW.WWWWW.WWW.oW',
    'WW.....WW..........WW.....WW',
    'WW.WWW.WW.WWWWWWWW.WW.WWW.WW',
    'WW.WWW....WWWWWWWW....WWW.WW',
    'W......WW....WW....WW......W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W..........................W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ],
  [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W............WW............W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'WoWWWW.WWWWW.WW.WWWWW.WWWWoW',
    'W......WWWWW.WW.WWWWW......W',
    'W.WWWW.......WW.......WWWW.W',
    'W.WWWW.WW.WWWWWWWW.WW.WWWW.W',
    'W......WW.WWWWWWWW.WW......W',
    'WWWWWW.WW....WW....WW.WWWWWW',
    'WWWWWW.WWWWWEWWEWWWWW.WWWWWW',
    'EEEEWW.WWWWWEWWEWWWWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEW------WEWW.WWEEEE',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'TTEEEE.EEEWGGGGGGWEEE.EEEETT',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'WWWWWW.WWEWWWWWWWWEWW.WWWWWW',
    'W..........................W',
    'W.WW.WWWWW.WWWWWW.WWWWW.WW.W',
    'W.WW.WWWWW.WWWWWW.WWWWW.WW.W',
    'Wo.........WW..........WW.oW',
    'W.WW.WWWWW......WWWWW.WW.WWW',
    'W.WW.WWWWW.WWWW.WWWWW.WW..WW',
    'W......WW....WW....WW......W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W..........................W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ],
  [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W..........................W',
    'W.WW.WWWWW.WWWW.WWWWW.WW..WW',
    'WoWW.WWWWW.WWWW.WWWWW.WW.oWW',
    'W.WW.......WWWW.......WW..WW',
    'W....WWWWW.WWWW.WWWWW....WWW',
    'W.WW.WWWWW......WWWWW.WW.WWW',
    'W.WW.......WWWW.......WW..WW',
    'W......WW..WWWW..WW.......WW',
    'WWWWWW.WWWWWEWWEWWWWW.WWWWWW',
    'EEEEWW.WWWWWEWWEWWWWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEW------WEWW.WWEEEE',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'TTEEEE.EEEWGGGGGGWEEE.EEEETT',
    'WWWWWW.WWEWGGGGGGWEWW.WWWWWW',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'EEEEWW.EEEEEEEEEEEEEE.WWEEEE',
    'EEEEWW.WWEWWWWWWWWEWW.WWEEEE',
    'WWWWWW.WWEWWWWWWWWEWW.WWWWWW',
    'W............WW............W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'W.WWWW.WWWWW.WW.WWWWW.WWWW.W',
    'Wo..WW................WW..oW',
    'WWW.WW.WW.WWWWWWWW.WW.WW.WWW',
    'WWW.WW.WW.WWWWWWWW.WW.WW.WWW',
    'W......WW....WW....WW......W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W.WWWWWWWWWW.WW.WWWWWWWWWW.W',
    'W..........................W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ],
];

const MODE_SCHEDULE = [
  { mode: 'scatter', duration: 420 },
  { mode: 'chase', duration: 1200 },
  { mode: 'scatter', duration: 420 },
  { mode: 'chase', duration: 1200 },
  { mode: 'scatter', duration: 300 },
  { mode: 'chase', duration: 1200 },
  { mode: 'scatter', duration: 300 },
  { mode: 'chase', duration: Infinity },
];

const FRUIT_TYPES = [
  { name: 'cherry', color: '#f00', points: 100 },
  { name: 'strawberry', color: '#f44', points: 300 },
  { name: 'orange', color: '#f80', points: 500 },
  { name: 'pretzel', color: '#da4', points: 700 },
  { name: 'apple', color: '#0f0', points: 1000 },
  { name: 'pear', color: '#af0', points: 2000 },
  { name: 'banana', color: '#ff0', points: 5000 },
];

// ── Module-scope state ──
let score, best;
let level, lives, dots, totalDots, powerTimer, ghostsEaten;
let pacman, ghosts, fruit, fruitShown;
let deathAnim, deathAnimTimer;
let readyTimer, freezeTimer;
let ghostScorePopup;
let currentMaze, modeIndex, modeFrames;
let animFrame;
let grid;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelDisp = document.getElementById('levelDisp');
const livesDisp = document.getElementById('livesDisp');

// ── Maze helpers ──

function parseMaze(mazeIndex) {
  const mazeData = MAZES[mazeIndex % MAZES.length];
  grid = [];
  dots = 0;
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    const row = mazeData[r] || '';
    for (let c = 0; c < COLS; c++) {
      const ch = (c < row.length) ? row[c] : 'W';
      switch (ch) {
        case 'W': grid[r][c] = 1; break;
        case '.': grid[r][c] = 2; dots++; break;
        case 'o': grid[r][c] = 3; dots++; break;
        case '-': grid[r][c] = 4; break;
        case 'G': grid[r][c] = 5; break;
        case 'T': grid[r][c] = 6; break;
        case 'E': default: grid[r][c] = 0; break;
      }
    }
  }
  totalDots = dots;
}

function tileAt(c, r) {
  if (r < 0 || r >= ROWS) return 1;
  c = ((c % COLS) + COLS) % COLS;
  return grid[r][c];
}

function isWalkable(c, r) {
  return tileAt(c, r) !== 1;
}

function isWalkableGhost(c, r, canUseDoor) {
  const t = tileAt(c, r);
  if (t === 1) return false;
  if (t === 4 && !canUseDoor) return false;
  return true;
}

function wrapCol(c) {
  return ((c % COLS) + COLS) % COLS;
}

// ── Entity creation ──

function createPacman() {
  return {
    col: 14, row: 23,
    dir: 2, nextDir: 2,
    pixelX: 14 * T, pixelY: 23 * T,
    moving: false,
    mouthAngle: 0.3, mouthDir: 1,
    speed: 2,
  };
}

function createGhost(index) {
  const cols = [14, 12, 14, 16];
  const rows = [11, 14, 14, 14];
  const scatterTargets = [
    { col: 25, row: 0 },
    { col: 2, row: 0 },
    { col: 27, row: 30 },
    { col: 0, row: 30 },
  ];
  return {
    index,
    col: cols[index], row: rows[index],
    pixelX: cols[index] * T, pixelY: rows[index] * T,
    dir: index === 0 ? 2 : 3,
    mode: index === 0 ? 'scatter' : 'house',
    frightened: false,
    speed: 1.5,
    houseTimer: [0, 180, 360, 540][index],
    scatterTarget: scatterTargets[index],
    eaten: false,
    returningHome: false,
  };
}

function resetPositions() {
  pacman = createPacman();
  ghosts = [0, 1, 2, 3].map(createGhost);
}

function updateLivesDisplay() {
  livesDisp.innerHTML = 'Lives: <span>' + lives + '</span>';
}

// ── Ghost AI ──

function isChaseMode() {
  return MODE_SCHEDULE[modeIndex] && MODE_SCHEDULE[modeIndex].mode === 'chase';
}

function getGhostTarget(ghost) {
  if (ghost.returningHome) return { col: 14, row: 11 };
  if (ghost.frightened) {
    return { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * ROWS) };
  }
  if (!isChaseMode()) return ghost.scatterTarget;

  switch (ghost.index) {
    case 0: return { col: pacman.col, row: pacman.row };
    case 1: return {
      col: Math.max(0, Math.min(COLS - 1, pacman.col + DX[pacman.dir] * 4)),
      row: Math.max(0, Math.min(ROWS - 1, pacman.row + DY[pacman.dir] * 4))
    };
    case 2: {
      const b = ghosts[0];
      const ac = pacman.col + DX[pacman.dir] * 2;
      const ar = pacman.row + DY[pacman.dir] * 2;
      return {
        col: Math.max(0, Math.min(COLS - 1, ac + (ac - b.col))),
        row: Math.max(0, Math.min(ROWS - 1, ar + (ar - b.row)))
      };
    }
    case 3: {
      const d = Math.abs(ghost.col - pacman.col) + Math.abs(ghost.row - pacman.row);
      return d > 8 ? { col: pacman.col, row: pacman.row } : ghost.scatterTarget;
    }
    default: return { col: pacman.col, row: pacman.row };
  }
}

function chooseGhostDir(ghost) {
  const target = getGhostTarget(ghost);
  const canUseDoor = ghost.mode === 'house' || ghost.returningHome;
  const opposite = (ghost.dir + 2) % 4;
  const priority = [3, 2, 1, 0]; // up, left, down, right
  let bestDir = -1;
  let bestDist = Infinity;

  for (const dir of priority) {
    if (dir === opposite && !ghost.returningHome) continue;
    const nc = wrapCol(ghost.col + DX[dir]);
    const nr = ghost.row + DY[dir];
    if (!isWalkableGhost(nc, nr, canUseDoor)) continue;
    const dist = (nc - target.col) ** 2 + (nr - target.row) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  if (bestDir === -1) {
    for (const dir of priority) {
      const nc = wrapCol(ghost.col + DX[dir]);
      const nr = ghost.row + DY[dir];
      if (isWalkableGhost(nc, nr, canUseDoor)) return dir;
    }
    return ghost.dir;
  }
  return bestDir;
}

function getGhostSpeed() {
  return 1.5 + Math.min(level * 0.1, 1);
}

// ── Game logic ──

function activatePower() {
  const dur = Math.max(120, 360 - level * 30);
  powerTimer = dur;
  ghostsEaten = 0;
  ghosts.forEach(g => {
    if (g.mode !== 'house' && !g.returningHome) {
      g.frightened = true;
      g.dir = (g.dir + 2) % 4;
    }
  });
}

function updatePacman(input) {
  if (input.isDown('ArrowLeft')) pacman.nextDir = 2;
  if (input.isDown('ArrowRight')) pacman.nextDir = 0;
  if (input.isDown('ArrowUp')) pacman.nextDir = 3;
  if (input.isDown('ArrowDown')) pacman.nextDir = 1;

  const atTile = (pacman.pixelX === pacman.col * T && pacman.pixelY === pacman.row * T);

  if (atTile) {
    const nc = wrapCol(pacman.col + DX[pacman.nextDir]);
    const nr = pacman.row + DY[pacman.nextDir];
    if (isWalkable(nc, nr)) {
      pacman.dir = pacman.nextDir;
      pacman.moving = true;
    } else {
      const fc = wrapCol(pacman.col + DX[pacman.dir]);
      const fr = pacman.row + DY[pacman.dir];
      pacman.moving = isWalkable(fc, fr);
    }
  }

  if (pacman.moving) {
    pacman.pixelX += DX[pacman.dir] * pacman.speed;
    pacman.pixelY += DY[pacman.dir] * pacman.speed;

    const targetCol = wrapCol(pacman.col + DX[pacman.dir]);
    const targetRow = pacman.row + DY[pacman.dir];
    const tx = targetCol * T;
    const ty = targetRow * T;

    // Tunnel wrapping
    if (pacman.dir === 0 && pacman.pixelX >= COLS * T) {
      pacman.pixelX = 0;
    }
    if (pacman.dir === 2 && pacman.pixelX < 0) {
      pacman.pixelX = (COLS - 1) * T;
    }

    const dx = tx - pacman.pixelX;
    const dy = ty - pacman.pixelY;
    const arrived = (Math.abs(dx) <= pacman.speed && Math.abs(dy) <= pacman.speed) ||
                    (pacman.dir === 0 && pacman.col === COLS - 1 && targetCol === 0 && pacman.pixelX <= T) ||
                    (pacman.dir === 2 && pacman.col === 0 && targetCol === COLS - 1 && pacman.pixelX >= (COLS - 2) * T);

    if (arrived) {
      pacman.col = targetCol;
      pacman.row = targetRow;
      pacman.pixelX = targetCol * T;
      pacman.pixelY = targetRow * T;

      // Eat dot
      if (grid[pacman.row][pacman.col] === 2) {
        grid[pacman.row][pacman.col] = 0;
        score += 10;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        dots--;
      }

      // Eat power pellet
      if (grid[pacman.row][pacman.col] === 3) {
        grid[pacman.row][pacman.col] = 0;
        score += 50;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        dots--;
        activatePower();
      }

      if (dots <= 0) { levelUp(); return; }
    }
  }
}

function updateGhost(ghost) {
  if (ghost.mode === 'house') {
    ghost.houseTimer--;
    ghost.pixelY = ghost.row * T + Math.sin(animFrame * 0.08) * 3;
    ghost.pixelX = ghost.col * T;
    if (ghost.houseTimer <= 0) {
      ghost.col = 14;
      ghost.row = 11;
      ghost.pixelX = 14 * T;
      ghost.pixelY = 11 * T;
      ghost.mode = 'scatter';
      ghost.dir = 2;
    }
    return;
  }

  if (ghost.returningHome) {
    ghost.speed = 4;
    if (ghost.col === 14 && (ghost.row === 14 || ghost.row === 13)) {
      ghost.returningHome = false;
      ghost.eaten = false;
      ghost.mode = 'scatter';
      ghost.speed = getGhostSpeed();
      ghost.frightened = powerTimer > 0;
      return;
    }
  } else {
    ghost.speed = ghost.frightened ? 1 : getGhostSpeed();
  }

  ghost.pixelX += DX[ghost.dir] * ghost.speed;
  ghost.pixelY += DY[ghost.dir] * ghost.speed;

  // Tunnel wrap pixels
  if (ghost.pixelX >= COLS * T) ghost.pixelX = 0;
  if (ghost.pixelX < 0) ghost.pixelX = (COLS - 1) * T;

  const targetCol = wrapCol(ghost.col + DX[ghost.dir]);
  const targetRow = ghost.row + DY[ghost.dir];
  const tx = targetCol * T;
  const ty = targetRow * T;
  const dx = Math.abs(tx - ghost.pixelX);
  const dy = Math.abs(ty - ghost.pixelY);

  if (dx <= ghost.speed && dy <= ghost.speed && targetRow >= 0 && targetRow < ROWS) {
    ghost.col = targetCol;
    ghost.row = targetRow;
    ghost.pixelX = targetCol * T;
    ghost.pixelY = targetRow * T;
    ghost.dir = chooseGhostDir(ghost);
  }
}

function checkCollisions(game) {
  ghosts.forEach(ghost => {
    if (ghost.mode === 'house') return;
    const dist = Math.abs(pacman.pixelX - ghost.pixelX) + Math.abs(pacman.pixelY - ghost.pixelY);
    if (dist < T) {
      if (ghost.frightened && !ghost.eaten && !ghost.returningHome) {
        ghostsEaten++;
        const pts = 200 * Math.pow(2, ghostsEaten - 1);
        score += pts;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        ghost.eaten = true;
        ghost.frightened = false;
        ghost.returningHome = true;
        ghostScorePopup = { x: ghost.pixelX, y: ghost.pixelY, points: pts, timer: 45 };
        freezeTimer = 30;
      } else if (!ghost.eaten && !ghost.returningHome) {
        deathAnim = 1;
        deathAnimTimer = 0;
      }
    }
  });
}

function updateFruit() {
  if (!fruit && fruitShown < 2) {
    const eaten = totalDots - dots;
    if ((fruitShown === 0 && eaten >= 70) || (fruitShown === 1 && eaten >= 170)) {
      const fi = Math.min(level - 1, FRUIT_TYPES.length - 1);
      fruit = { ...FRUIT_TYPES[fi], col: 14, row: 17, timer: 600 };
      fruitShown++;
    }
  }
  if (fruit) {
    fruit.timer--;
    if (fruit.timer <= 0) { fruit = null; return; }
    if (Math.abs(pacman.col - fruit.col) + Math.abs(pacman.row - fruit.row) < 2) {
      score += fruit.points;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
      ghostScorePopup = { x: fruit.col * T, y: fruit.row * T, points: fruit.points, timer: 60 };
      fruit = null;
    }
  }
}

function levelUp() {
  level++;
  levelDisp.textContent = level;
  currentMaze = (level - 1) % MAZES.length;
  parseMaze(currentMaze);
  resetPositions();
  powerTimer = 0;
  ghostsEaten = 0;
  fruit = null;
  fruitShown = 0;
  modeIndex = 0;
  modeFrames = 0;
  readyTimer = 120;
  freezeTimer = 0;
  ghostScorePopup = null;
}

// ── Drawing helpers ──

function drawMaze(renderer) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 1) {
        drawWall(renderer, c, r);
      } else if (grid[r][c] === 4) {
        renderer.fillRect(c * T, r * T + T / 2 - 2, T, 4, '#f9b');
      }
    }
  }
}

function drawWall(renderer, c, r) {
  const x = c * T, y = r * T;
  const up = r > 0 && (grid[r - 1][c] === 1 || grid[r - 1][c] === 4);
  const dn = r < ROWS - 1 && (grid[r + 1][c] === 1 || grid[r + 1][c] === 4);
  const lt = c > 0 && grid[r][c - 1] === 1;
  const rt = c < COLS - 1 && grid[r][c + 1] === 1;

  // Wall fill
  renderer.fillRect(x, y, T, T, '#0a0a3e');

  // Border edges
  if (!up) renderer.drawLine(x, y + 0.5, x + T, y + 0.5, '#26c', 1.5);
  if (!dn) renderer.drawLine(x, y + T - 0.5, x + T, y + T - 0.5, '#26c', 1.5);
  if (!lt) renderer.drawLine(x + 0.5, y, x + 0.5, y + T, '#26c', 1.5);
  if (!rt) renderer.drawLine(x + T - 0.5, y, x + T - 0.5, y + T, '#26c', 1.5);
}

function drawDots(renderer) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * T + T / 2;
      const y = r * T + T / 2;
      if (grid[r][c] === 2) {
        renderer.fillCircle(x, y, 2, '#ffb8ff');
      } else if (grid[r][c] === 3) {
        const pulse = 0.6 + Math.sin(animFrame * 0.1) * 0.4;
        const alpha = Math.round(pulse * 255).toString(16).padStart(2, '0');
        renderer.setGlow('#f6a', 0.5);
        renderer.fillCircle(x, y, 5, '#ffb8ff' + alpha);
        renderer.setGlow(null);
      }
    }
  }
}

function drawPacmanEntity(renderer) {
  const cx = pacman.pixelX + T / 2;
  const cy = pacman.pixelY + T / 2;
  const r = T / 2 - 1;
  const mouth = pacman.mouthAngle * 0.5;

  // Direction angles: 0=right, 1=down, 2=left, 3=up
  const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const angle = angles[pacman.dir];

  // Build a pacman shape as a polygon (wedge with mouth)
  // We approximate the arc with polygon segments
  const segments = 20;
  const startAngle = angle + mouth;
  const endAngle = angle + Math.PI * 2 - mouth;
  const step = (endAngle - startAngle) / segments;

  const pts = [{ x: cx, y: cy }];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + step * i;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  renderer.setGlow('#ff0', 0.5);
  renderer.fillPoly(pts, '#ff0');
  renderer.setGlow(null);

  // Eye (relative to direction)
  const eyeAngle = angle - 0.4;
  const eyeDist = 3.5;
  const eyeX = cx + Math.cos(eyeAngle) * eyeDist;
  const eyeY = cy + Math.sin(eyeAngle) * eyeDist;
  renderer.fillCircle(eyeX, eyeY, 1.5, '#000');

  // Beauty mark
  const markAngle = angle + 0.2;
  const markDist = 4;
  const markX = cx + Math.cos(markAngle) * markDist;
  const markY = cy + Math.sin(markAngle) * markDist;
  renderer.fillCircle(markX, markY, 0.8, '#000');

  // Bow/ribbon on top
  const bowX = cx;
  const bowY = cy - r - 2;
  renderer.setGlow('#f00', 0.3);
  // Left ribbon
  renderer.fillPoly([
    { x: bowX, y: bowY },
    { x: bowX - 5, y: bowY - 4 },
    { x: bowX - 1, y: bowY + 1 },
  ], '#f00');
  // Right ribbon
  renderer.fillPoly([
    { x: bowX, y: bowY },
    { x: bowX + 5, y: bowY - 4 },
    { x: bowX + 1, y: bowY + 1 },
  ], '#f00');
  // Knot
  renderer.fillCircle(bowX, bowY, 2, '#f00');
  renderer.setGlow(null);
}

function drawDeathAnimation(renderer) {
  const cx = pacman.pixelX + T / 2;
  const cy = pacman.pixelY + T / 2;
  const r = (T / 2 - 1) * (1 - (deathAnimTimer / 50) * 0.3);
  const progress = Math.min(deathAnimTimer / 50, 1);
  const openAngle = progress * Math.PI;

  const segments = 20;
  const startAngle = openAngle;
  const endAngle = Math.PI * 2 - openAngle;
  const step = (endAngle - startAngle) / segments;

  const pts = [{ x: cx, y: cy }];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + step * i;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  renderer.setGlow('#ff0', 0.5);
  renderer.fillPoly(pts, '#ff0');
  renderer.setGlow(null);
}

function drawGhostEntity(renderer, ghost) {
  if (ghost.eaten && ghost.returningHome) {
    drawGhostEyes(renderer, ghost.pixelX + T / 2, ghost.pixelY + T / 2, ghost.dir);
    return;
  }

  const cx = ghost.pixelX + T / 2;
  const cy = ghost.pixelY + T / 2;
  const r = T / 2 - 1;

  let color;
  if (ghost.frightened) {
    color = (powerTimer < 120 && Math.floor(powerTimer / 10) % 2 === 0) ? FRIGHTENED_FLASH : FRIGHTENED_COLOR;
  } else {
    color = GHOST_COLORS[ghost.index];
  }

  // Ghost body: dome (top half-circle) + rectangular body + wavy skirt
  // Build as a polygon: top arc + right side + wavy bottom + left side
  const segments = 12;
  const pts = [];

  // Top dome (semicircle from PI to 0)
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI - (Math.PI * i / segments);
    pts.push({ x: cx + Math.cos(a) * r, y: (cy - 1) + Math.sin(a) * r });
  }

  // Right side down to skirt
  const skirtY = cy + r - 2;
  pts.push({ x: cx + r, y: skirtY });

  // Wavy skirt bottom (right to left)
  const wave = Math.sin(animFrame * 0.15 + ghost.index * 2) * 2;
  const numWaves = 3;
  const waveW = (r * 2) / numWaves;
  for (let i = 0; i < numWaves; i++) {
    const bx = cx + r - i * waveW;
    pts.push({ x: bx - waveW * 0.25, y: skirtY + 3 + wave });
    pts.push({ x: bx - waveW * 0.5, y: skirtY });
    pts.push({ x: bx - waveW * 0.75, y: skirtY - 3 - wave });
    if (i < numWaves - 1) {
      pts.push({ x: bx - waveW, y: skirtY });
    }
  }

  // Close back to left side
  pts.push({ x: cx - r, y: skirtY });

  renderer.setGlow(color, 0.4);
  renderer.fillPoly(pts, color);
  renderer.setGlow(null);

  if (!ghost.frightened) {
    drawGhostEyes(renderer, cx, cy, ghost.dir);
  } else {
    // Frightened face: two white dots for eyes
    renderer.fillCircle(cx - 3, cy - 2, 1.5, '#fff');
    renderer.fillCircle(cx + 3, cy - 2, 1.5, '#fff');
    // Wavy mouth
    for (let i = 0; i < 4; i++) {
      const sx = cx - 4 + i * 2;
      const sy = cy + 3;
      const ex = cx - 4 + (i + 1) * 2;
      const ey = cy + 3 + ((i % 2 === 0) ? -2 : 0);
      renderer.drawLine(sx, sy + ((i % 2 === 0) ? 0 : -2), ex, ey, '#fff', 1);
    }
  }
}

function drawGhostEyes(renderer, cx, cy, dir) {
  // White ellipses (approximated as circles)
  renderer.fillCircle(cx - 3, cy - 2, 3, '#fff');
  renderer.fillCircle(cx + 3, cy - 2, 3, '#fff');

  // Pupils
  const offsets = [
    { x: 1.5, y: 0 },
    { x: 0, y: 1.5 },
    { x: -1.5, y: 0 },
    { x: 0, y: -1.5 },
  ];
  const po = offsets[dir] || { x: 0, y: 0 };
  renderer.fillCircle(cx - 3 + po.x, cy - 2 + po.y, 1.5, '#22a');
  renderer.fillCircle(cx + 3 + po.x, cy - 2 + po.y, 1.5, '#22a');
}

function drawFruitEntity(renderer) {
  if (!fruit) return;
  const cx = fruit.col * T + T / 2;
  const cy = fruit.row * T + T / 2;
  renderer.setGlow(fruit.color, 0.5);
  renderer.fillCircle(cx, cy, 5, fruit.color);
  renderer.setGlow(null);
  // Stem
  renderer.drawLine(cx, cy - 5, cx + 2, cy - 8, '#0a0', 1.5);
  // Leaf (small circle approximation)
  renderer.fillCircle(cx + 3, cy - 7, 2, '#0a0');
}

// ── Export createGame ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    level = 1;
    lives = 3;
    levelDisp.textContent = level;
    updateLivesDisplay();
    currentMaze = 0;
    parseMaze(currentMaze);
    resetPositions();
    powerTimer = 0;
    ghostsEaten = 0;
    fruit = null;
    fruitShown = 0;
    modeIndex = 0;
    modeFrames = 0;
    deathAnim = 0;
    deathAnimTimer = 0;
    readyTimer = 0;
    freezeTimer = 0;
    ghostScorePopup = null;
    animFrame = 0;
    game.showOverlay('MS. PAC-MAN', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        readyTimer = 120;
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

    // ── Playing state ──
    animFrame++;

    if (readyTimer > 0) { readyTimer--; return; }
    if (freezeTimer > 0) { freezeTimer--; return; }

    if (deathAnim > 0) {
      deathAnimTimer++;
      if (deathAnimTimer > 60) {
        deathAnim = 0;
        deathAnimTimer = 0;
        lives--;
        updateLivesDisplay();
        if (lives <= 0) {
          game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Press any key to restart');
          game.setState('over');
          return;
        }
        resetPositions();
        readyTimer = 90;
      }
      return;
    }

    // Mode timer
    modeFrames++;
    if (MODE_SCHEDULE[modeIndex] && modeFrames >= MODE_SCHEDULE[modeIndex].duration) {
      modeFrames = 0;
      modeIndex = Math.min(modeIndex + 1, MODE_SCHEDULE.length - 1);
    }

    // Power timer
    if (powerTimer > 0) {
      powerTimer--;
      if (powerTimer <= 0) {
        ghosts.forEach(g => { g.frightened = false; });
      }
    }

    updatePacman(input);
    ghosts.forEach(updateGhost);
    checkCollisions(game);
    updateFruit();

    // Mouth animation
    pacman.mouthAngle += 0.15 * pacman.mouthDir;
    if (pacman.mouthAngle > 0.8) pacman.mouthDir = -1;
    if (pacman.mouthAngle < 0.05) pacman.mouthDir = 1;

    // ML data
    window.gameData = {
      pacmanCol: pacman.col, pacmanRow: pacman.row, pacmanDir: pacman.dir,
      ghosts: ghosts.map(g => ({ col: g.col, row: g.row, frightened: g.frightened, mode: g.mode })),
      dotsRemaining: dots, powerTimer, level, lives,
    };
  };

  game.onDraw = (renderer, text) => {
    drawMaze(renderer);
    drawDots(renderer);
    if (fruit) drawFruitEntity(renderer);

    if (deathAnim) {
      drawDeathAnimation(renderer);
    } else if (pacman) {
      drawPacmanEntity(renderer);
    }

    if (ghosts) {
      ghosts.forEach(g => drawGhostEntity(renderer, g));
    }

    if (ghostScorePopup) {
      ghostScorePopup.timer--;
      text.drawText(String(ghostScorePopup.points), ghostScorePopup.x + T / 2, ghostScorePopup.y + T / 2 - 5, 10, '#0ff', 'center');
      if (ghostScorePopup.timer <= 0) ghostScorePopup = null;
    }

    if (readyTimer > 0) {
      renderer.setGlow('#ff0', 0.6);
      text.drawText('READY!', W / 2, 17 * T - 2, 16, '#ff0', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
