// battleship-evolved/game.js — Battleship Evolved ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Grid constants
const GRID_SIZE = 10;
const CELL = 20;
const GRID_PX = GRID_SIZE * CELL; // 200px
const LABEL_W = 14;
const LABEL_H = 14;
const GRID_TOTAL_W = LABEL_W + GRID_PX;
const GRID_TOTAL_H = LABEL_H + GRID_PX;

// Layout positions
const HEADER_H = 36;
const LEFT_GRID_X = Math.floor((500 - 2 * GRID_TOTAL_W - 20) / 2);
const RIGHT_GRID_X = LEFT_GRID_X + GRID_TOTAL_W + 20;
const GRID_Y = HEADER_H + 8;

// Ship definitions
const SHIP_DEFS = [
  { name: 'Carrier',    size: 5, color: '#4af' },
  { name: 'Battleship', size: 4, color: '#48d' },
  { name: 'Cruiser',    size: 3, color: '#3ae' },
  { name: 'Submarine',  size: 3, color: '#2ad' },
  { name: 'Destroyer',  size: 2, color: '#5bf' }
];

// Cell states
const EMPTY = 0;
const SHIP  = 1;
const HIT   = 2;
const MISS  = 3;
const SUNK  = 4;

// ── Module-scope state ──
let score;

let playerGrid, aiGrid;
let playerShips, aiShips;
let playerShipsSunk, aiShipsSunk;

let placingIndex, placingHoriz;
let hoverR, hoverC, hoverValid;

let aiHits, aiTargetStack, aiFirstHit, aiHitChain, aiMode;

let playerTotalShots, aiTotalShots, playerHits, aiHitsCount;
let statusText, lastAiResult;
let lastAiShotR, lastAiShotC;

let aimR, aimC;

let explosions;

// Internal phase: 'placing' | 'playerTurn' | 'aiTurn'
let phase;

// Pending AI shot timer (frames)
let aiShotPendingFrames;

// Mouse event queues
let pendingClicks = [];
let pendingMoves  = [];

// DOM refs
const scoreEl      = document.getElementById('score');
const aiScoreEl    = document.getElementById('aiScore');
const playerShipsEl = document.getElementById('playerShips');
const aiShipsEl    = document.getElementById('aiShips');

// ── Helpers ──

function createGrid() {
  const g = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    g[r] = new Array(GRID_SIZE).fill(EMPTY);
  }
  return g;
}

function canPlaceShip(grid, r, c, size, horiz) {
  for (let i = 0; i < size; i++) {
    const cr = horiz ? r       : r + i;
    const cc = horiz ? c + i   : c;
    if (cr < 0 || cr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) return false;
    if (grid[cr][cc] !== EMPTY) return false;
  }
  return true;
}

function placeShip(grid, ships, r, c, size, horiz, defIndex) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    const cr = horiz ? r       : r + i;
    const cc = horiz ? c + i   : c;
    grid[cr][cc] = SHIP;
    cells.push({ r: cr, c: cc });
  }
  ships.push({ defIndex, cells, sunk: false });
}

function placeAIShips() {
  for (let i = 0; i < SHIP_DEFS.length; i++) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 1000) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (canPlaceShip(aiGrid, r, c, SHIP_DEFS[i].size, horiz)) {
        placeShip(aiGrid, aiShips, r, c, SHIP_DEFS[i].size, horiz, i);
        placed = true;
      }
      attempts++;
    }
  }
}

function getGridCell(mx, my, gridX, gridY) {
  const x = mx - gridX - LABEL_W;
  const y = my - gridY - LABEL_H;
  if (x < 0 || y < 0 || x >= GRID_PX || y >= GRID_PX) return null;
  return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
}

function checkShipSunk(grid, ship) {
  return ship.cells.every(cell => grid[cell.r][cell.c] === HIT || grid[cell.r][cell.c] === SUNK);
}

function markShipSunk(grid, ship) {
  ship.sunk = true;
  ship.cells.forEach(cell => { grid[cell.r][cell.c] = SUNK; });
}

function addExplosion(x, y, big) {
  explosions.push({ x, y, radius: big ? 20 : 12, maxRadius: big ? 30 : 18, alpha: 1.0, big });
}

function buildTargetStack() {
  aiTargetStack = [];
  if (aiHitChain.length === 1) {
    const h = aiHitChain[0];
    const dirs = [
      { r: h.r - 1, c: h.c },
      { r: h.r + 1, c: h.c },
      { r: h.r, c: h.c - 1 },
      { r: h.r, c: h.c + 1 }
    ];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const d of dirs) {
      if (d.r >= 0 && d.r < GRID_SIZE && d.c >= 0 && d.c < GRID_SIZE && aiHits[d.r][d.c] === 0) {
        aiTargetStack.push(d);
      }
    }
  } else if (aiHitChain.length >= 2) {
    const isHoriz = aiHitChain[0].r === aiHitChain[1].r;
    if (isHoriz) {
      const row = aiHitChain[0].r;
      let minC = GRID_SIZE, maxC = -1;
      for (const h of aiHitChain) {
        if (h.c < minC) minC = h.c;
        if (h.c > maxC) maxC = h.c;
      }
      if (minC - 1 >= 0 && aiHits[row][minC - 1] === 0) aiTargetStack.push({ r: row, c: minC - 1 });
      if (maxC + 1 < GRID_SIZE && aiHits[row][maxC + 1] === 0) aiTargetStack.push({ r: row, c: maxC + 1 });
    } else {
      const col = aiHitChain[0].c;
      let minR = GRID_SIZE, maxR = -1;
      for (const h of aiHitChain) {
        if (h.r < minR) minR = h.r;
        if (h.r > maxR) maxR = h.r;
      }
      if (minR - 1 >= 0 && aiHits[minR - 1][col] === 0) aiTargetStack.push({ r: minR - 1, c: col });
      if (maxR + 1 < GRID_SIZE && aiHits[maxR + 1][col] === 0) aiTargetStack.push({ r: maxR + 1, c: col });
    }
    if (aiTargetStack.length === 0 && aiFirstHit) {
      aiHitChain = [aiFirstHit];
      buildTargetStack();
    }
  }
}

function computeProbabilityMap() {
  const prob = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    prob[r] = new Array(GRID_SIZE).fill(0);
  }

  for (const ship of playerShips) {
    if (ship.sunk) continue;
    const size = SHIP_DEFS[ship.defIndex].size;

    // Horizontal placements
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c <= GRID_SIZE - size; c++) {
        let valid = true, hasHit = false;
        for (let i = 0; i < size; i++) {
          const state = aiHits[r][c + i];
          if (state === MISS || state === SUNK) { valid = false; break; }
          if (state === HIT) hasHit = true;
        }
        if (valid) {
          const weight = hasHit ? 20 : 1;
          for (let i = 0; i < size; i++) {
            if (aiHits[r][c + i] === 0) prob[r][c + i] += weight;
          }
        }
      }
    }

    // Vertical placements
    for (let r = 0; r <= GRID_SIZE - size; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let valid = true, hasHit = false;
        for (let i = 0; i < size; i++) {
          const state = aiHits[r + i][c];
          if (state === MISS || state === SUNK) { valid = false; break; }
          if (state === HIT) hasHit = true;
        }
        if (valid) {
          const weight = hasHit ? 20 : 1;
          for (let i = 0; i < size; i++) {
            if (aiHits[r + i][c] === 0) prob[r + i][c] += weight;
          }
        }
      }
    }
  }

  // Checkerboard bonus in hunt mode
  if (aiMode === 'hunt') {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % 2 === 0 && prob[r][c] > 0) prob[r][c] += 2;
      }
    }
  }

  return prob;
}

function aiFire(game) {
  let r, c;

  if (aiMode === 'target' && aiTargetStack.length > 0) {
    let found = false;
    while (aiTargetStack.length > 0 && !found) {
      const target = aiTargetStack.pop();
      if (target.r >= 0 && target.r < GRID_SIZE &&
          target.c >= 0 && target.c < GRID_SIZE &&
          aiHits[target.r][target.c] === 0) {
        r = target.r; c = target.c; found = true;
      }
    }
    if (!found) {
      aiMode = 'hunt';
      aiTargetStack = [];
      aiHitChain = [];
    }
  }

  if (aiMode === 'hunt' || r === undefined) {
    const prob = computeProbabilityMap();
    let maxProb = -1;
    const candidates = [];
    for (let rr = 0; rr < GRID_SIZE; rr++) {
      for (let cc = 0; cc < GRID_SIZE; cc++) {
        if (aiHits[rr][cc] !== 0) continue;
        if (prob[rr][cc] > maxProb) {
          maxProb = prob[rr][cc];
          candidates.length = 0;
          candidates.push({ r: rr, c: cc });
        } else if (prob[rr][cc] === maxProb) {
          candidates.push({ r: rr, c: cc });
        }
      }
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    r = pick.r; c = pick.c;
  }

  aiTotalShots++;
  lastAiShotR = r; lastAiShotC = c;

  if (playerGrid[r][c] === SHIP) {
    playerGrid[r][c] = HIT;
    aiHits[r][c] = HIT;
    aiHitsCount++;
    aiScoreEl.textContent = aiHitsCount;

    aiHitChain.push({ r, c });
    if (aiMode === 'hunt') {
      aiFirstHit = { r, c };
      aiMode = 'target';
      aiHitChain = [{ r, c }];
    }

    let sunkShip = null;
    for (const ship of playerShips) {
      if (!ship.sunk && checkShipSunk(playerGrid, ship)) {
        markShipSunk(playerGrid, ship);
        ship.cells.forEach(cell => { aiHits[cell.r][cell.c] = SUNK; });
        playerShipsSunk++;
        playerShipsEl.textContent = 5 - playerShipsSunk;
        sunkShip = ship;
        break;
      }
    }

    if (sunkShip) {
      addExplosion(LEFT_GRID_X + LABEL_W + c * CELL + CELL / 2,
                   GRID_Y + LABEL_H + r * CELL + CELL / 2, true);
      lastAiResult = 'sunk';

      aiTargetStack = [];
      aiHitChain = [];
      aiFirstHit = null;

      let hasUnsunkHit = false;
      for (let rr = 0; rr < GRID_SIZE && !hasUnsunkHit; rr++) {
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          if (aiHits[rr][cc] === HIT) {
            hasUnsunkHit = true;
            aiFirstHit = { r: rr, c: cc };
            aiHitChain = [{ r: rr, c: cc }];
            break;
          }
        }
      }

      if (hasUnsunkHit) {
        aiMode = 'target';
        buildTargetStack();
      } else {
        aiMode = 'hunt';
      }

      if (playerShipsSunk >= 5) {
        gameOver(false, game);
        return;
      }
    } else {
      lastAiResult = 'hit';
      addExplosion(LEFT_GRID_X + LABEL_W + c * CELL + CELL / 2,
                   GRID_Y + LABEL_H + r * CELL + CELL / 2, false);
      buildTargetStack();
    }
  } else {
    playerGrid[r][c] = MISS;
    aiHits[r][c] = MISS;
    lastAiResult = 'miss';

    if (aiMode === 'target' && aiTargetStack.length === 0) {
      if (aiHitChain.length > 0) {
        buildTargetStack();
        if (aiTargetStack.length === 0) {
          aiMode = 'hunt';
          aiHitChain = [];
          aiFirstHit = null;
        }
      } else {
        aiMode = 'hunt';
      }
    }
  }
}

function playerFire(r, c, game) {
  if (aiGrid[r][c] === HIT || aiGrid[r][c] === MISS || aiGrid[r][c] === SUNK) return false;

  playerTotalShots++;
  if (aiGrid[r][c] === SHIP) {
    aiGrid[r][c] = HIT;
    playerHits++;
    score = playerHits;
    scoreEl.textContent = score;

    for (const ship of aiShips) {
      if (!ship.sunk && checkShipSunk(aiGrid, ship)) {
        markShipSunk(aiGrid, ship);
        aiShipsSunk++;
        aiShipsEl.textContent = 5 - aiShipsSunk;
        addExplosion(RIGHT_GRID_X + LABEL_W + c * CELL + CELL / 2,
                     GRID_Y + LABEL_H + r * CELL + CELL / 2, true);
        statusText = 'You sank the ' + SHIP_DEFS[ship.defIndex].name + '!';
        if (aiShipsSunk >= 5) {
          gameOver(true, game);
          return true;
        }
        return true;
      }
    }
    addExplosion(RIGHT_GRID_X + LABEL_W + c * CELL + CELL / 2,
                 GRID_Y + LABEL_H + r * CELL + CELL / 2, false);
    statusText = 'HIT!';
  } else {
    aiGrid[r][c] = MISS;
    statusText = 'Miss...';
  }
  return true;
}

function gameOver(playerWon, game) {
  if (playerWon) {
    const efficiency = Math.max(0, Math.round((playerHits / playerTotalShots) * 100));
    score = playerHits * 10 + efficiency;
    scoreEl.textContent = playerHits;
    game.showOverlay('VICTORY!',
      'Hits: ' + playerHits + '/' + playerTotalShots + ' shots (' + efficiency + '% accuracy) - Click to play again');
  } else {
    game.showOverlay('DEFEAT',
      'AI sank your fleet in ' + aiTotalShots + ' shots - Click to play again');
  }
  game.setState('over');
}

// ── Drawing helpers ──

function drawGrid(renderer, text, gx, gy, grid, isPlayer, label) {
  const cellStartX = gx + LABEL_W;
  const cellStartY = gy + LABEL_H;

  // Grid title
  text.drawText(label, gx + GRID_TOTAL_W / 2, gy - 14, 10, '#4af', 'center');

  // Column labels (A-J)
  for (let c = 0; c < GRID_SIZE; c++) {
    text.drawText(String.fromCharCode(65 + c),
      cellStartX + c * CELL + CELL / 2, gy + 2, 8, '#667', 'center');
  }

  // Row labels (1-10)
  for (let r = 0; r < GRID_SIZE; r++) {
    text.drawText(String(r + 1),
      gx + LABEL_W - 2, cellStartY + r * CELL + 6, 8, '#667', 'right');
  }

  // Draw cells
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = cellStartX + c * CELL;
      const y = cellStartY + r * CELL;
      const state = grid[r][c];

      // Background
      let bgColor = '#1a2a3e';
      if (state === SUNK)                     bgColor = 'rgba(255,68,68,0.25)';
      else if (state === HIT)                 bgColor = 'rgba(255,68,68,0.12)';
      else if (state === SHIP && isPlayer)    bgColor = 'rgba(68,170,255,0.25)';
      renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, bgColor);

      // Ship body on player grid
      if (isPlayer && state === SHIP) {
        renderer.fillRect(x + 2, y + 2, CELL - 4, CELL - 4, 'rgba(68,170,255,0.5)');
        renderer.setGlow('#4af', 0.5);
        renderer.strokePoly([
          { x: x + 2, y: y + 2 }, { x: x + CELL - 2, y: y + 2 },
          { x: x + CELL - 2, y: y + CELL - 2 }, { x: x + 2, y: y + CELL - 2 }
        ], '#4af', 1, true);
        renderer.setGlow(null);
      }

      // Hit marker (X)
      if (state === HIT) {
        renderer.setGlow('#f44', 0.5);
        renderer.drawLine(x + 4, y + 4, x + CELL - 4, y + CELL - 4, '#f44', 2);
        renderer.drawLine(x + CELL - 4, y + 4, x + 4, y + CELL - 4, '#f44', 2);
        renderer.setGlow(null);
      }

      // Sunk marker
      if (state === SUNK) {
        renderer.fillRect(x + 2, y + 2, CELL - 4, CELL - 4, 'rgba(255,68,68,0.4)');
        renderer.setGlow('#f44', 0.7);
        renderer.strokePoly([
          { x: x + 2, y: y + 2 }, { x: x + CELL - 2, y: y + 2 },
          { x: x + CELL - 2, y: y + CELL - 2 }, { x: x + 2, y: y + CELL - 2 }
        ], '#f44', 2, true);
        renderer.drawLine(x + 5, y + 5, x + CELL - 5, y + CELL - 5, '#f44', 2);
        renderer.drawLine(x + CELL - 5, y + 5, x + 5, y + CELL - 5, '#f44', 2);
        renderer.setGlow(null);
      }

      // Miss marker (dot)
      if (state === MISS) {
        renderer.fillCircle(x + CELL / 2, y + CELL / 2, 3, '#556');
      }
    }
  }

  // Grid lines
  for (let r = 0; r <= GRID_SIZE; r++) {
    renderer.drawLine(cellStartX, cellStartY + r * CELL,
                      cellStartX + GRID_PX, cellStartY + r * CELL, '#16213e', 1);
  }
  for (let c = 0; c <= GRID_SIZE; c++) {
    renderer.drawLine(cellStartX + c * CELL, cellStartY,
                      cellStartX + c * CELL, cellStartY + GRID_PX, '#16213e', 1);
  }

  // Outer border glow
  renderer.strokePoly([
    { x: cellStartX, y: cellStartY },
    { x: cellStartX + GRID_PX, y: cellStartY },
    { x: cellStartX + GRID_PX, y: cellStartY + GRID_PX },
    { x: cellStartX, y: cellStartY + GRID_PX }
  ], 'rgba(68,170,255,0.3)', 1, true);
}

function drawPlacementPreview(renderer) {
  if (hoverR < 0 || hoverC < 0) return;
  const ship = SHIP_DEFS[placingIndex];
  const cellStartX = LEFT_GRID_X + LABEL_W;
  const cellStartY = GRID_Y + LABEL_H;

  const fillColor  = hoverValid ? 'rgba(68,255,68,0.35)'  : 'rgba(255,68,68,0.35)';
  const lineColor  = hoverValid ? '#4f4' : '#f44';

  for (let i = 0; i < ship.size; i++) {
    const cr = placingHoriz ? hoverR     : hoverR + i;
    const cc = placingHoriz ? hoverC + i : hoverC;
    if (cr < 0 || cr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) continue;
    const x = cellStartX + cc * CELL;
    const y = cellStartY + cr * CELL;
    renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, fillColor);
    renderer.strokePoly([
      { x: x + 1, y: y + 1 }, { x: x + CELL - 1, y: y + 1 },
      { x: x + CELL - 1, y: y + CELL - 1 }, { x: x + 1, y: y + CELL - 1 }
    ], lineColor, 1, true);
  }
}

function drawAimHighlight(renderer) {
  const cellStartX = RIGHT_GRID_X + LABEL_W;
  const cellStartY = GRID_Y + LABEL_H;
  const x = cellStartX + aimC * CELL;
  const y = cellStartY + aimR * CELL;

  renderer.setGlow('#4af', 0.8);
  renderer.strokePoly([
    { x: x + 1, y: y + 1 }, { x: x + CELL - 1, y: y + 1 },
    { x: x + CELL - 1, y: y + CELL - 1 }, { x: x + 1, y: y + CELL - 1 }
  ], '#4af', 2, true);
  renderer.setGlow(null);

  // Crosshair lines (dashed-style: semi-transparent solid lines)
  renderer.drawLine(x + CELL / 2, cellStartY,
                    x + CELL / 2, cellStartY + GRID_PX, 'rgba(68,170,255,0.35)', 1);
  renderer.drawLine(cellStartX, y + CELL / 2,
                    cellStartX + GRID_PX, y + CELL / 2, 'rgba(68,170,255,0.35)', 1);
}

function drawExplosions(renderer) {
  for (const e of explosions) {
    const alpha = e.alpha;
    if (e.big) {
      renderer.fillCircle(e.x, e.y, e.radius,
        `rgba(255,100,50,${(alpha * 0.6).toFixed(3)})`);
    } else {
      renderer.fillCircle(e.x, e.y, e.radius,
        `rgba(255,68,68,${(alpha * 0.5).toFixed(3)})`);
    }
    // Inner bright ring
    renderer.fillCircle(e.x, e.y, e.radius * 0.5,
      `rgba(255,255,100,${(alpha * 0.7).toFixed(3)})`);
  }
}

function drawLegend(renderer, text) {
  const ly = GRID_Y + GRID_TOTAL_H + 16;

  if (phase === 'placing') {
    let tx = 20;
    for (let i = 0; i < SHIP_DEFS.length; i++) {
      const placed  = i < placingIndex;
      const current = i === placingIndex;
      const color = placed ? '#4f4' : (current ? '#4af' : '#445');
      const prefix = placed ? '\u2713 ' : (current ? '> ' : '  ');
      const label  = prefix + SHIP_DEFS[i].name + '(' + SHIP_DEFS[i].size + ')';
      text.drawText(label, tx, ly, 9, color, 'left');
      tx += label.length * 5.5 + 10;
    }
    const rotLabel = placingHoriz ? '[R] Horizontal' : '[R] Vertical';
    text.drawText(rotLabel, W - 20, ly, 9, '#667', 'right');
  } else if (phase === 'playerTurn' || phase === 'aiTurn') {
    text.drawText('Your ships: ' + (5 - playerShipsSunk) + '/5', 20, ly, 9, '#4af', 'left');
    text.drawText('Enemy ships: ' + (5 - aiShipsSunk) + '/5', 20, ly + 14, 9, '#4af', 'left');

    const acc = playerTotalShots > 0 ? Math.round(playerHits / playerTotalShots * 100) : 0;
    text.drawText('Shots: ' + playerTotalShots + ' | Accuracy: ' + acc + '%',
      W - 20, ly, 9, '#667', 'right');
    text.drawText('AI Shots: ' + aiTotalShots, W - 20, ly + 14, 9, '#667', 'right');
  }
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  const canvasEl = document.getElementById('game');

  // Context menu prevention
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mouse move — track hover
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    pendingMoves.push({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    });
  });

  // Mouse down — queue clicks
  canvasEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    pendingClicks.push({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    });
  });

  // ── onInit ──
  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    aiScoreEl.textContent = '0';
    playerShipsEl.textContent = '5';
    aiShipsEl.textContent = '5';

    playerGrid = createGrid();
    aiGrid = createGrid();
    playerShips = [];
    aiShips = [];
    playerShipsSunk = 0;
    aiShipsSunk = 0;

    placingIndex = 0;
    placingHoriz = true;
    hoverR = -1; hoverC = -1; hoverValid = false;

    aiHits = createGrid();
    aiTargetStack = [];
    aiFirstHit = null;
    aiHitChain = [];
    aiMode = 'hunt';

    playerTotalShots = 0;
    aiTotalShots = 0;
    playerHits = 0;
    aiHitsCount = 0;
    statusText = '';
    lastAiShotR = -1; lastAiShotC = -1; lastAiResult = '';
    aimR = -1; aimC = -1;
    explosions = [];
    phase = null;
    aiShotPendingFrames = 0;

    pendingClicks = [];
    pendingMoves  = [];

    game.showOverlay('BATTLESHIP EVOLVED', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── onUpdate ──
  game.onUpdate = () => {
    // Drain mouse moves (take last only)
    let mx = -1, my = -1;
    if (pendingMoves.length > 0) {
      const last = pendingMoves[pendingMoves.length - 1];
      mx = last.x; my = last.y;
      pendingMoves = [];
    }

    // Process hover updates
    if (mx >= 0) {
      if (phase === 'placing') {
        const cell = getGridCell(mx, my, LEFT_GRID_X, GRID_Y);
        if (cell) {
          hoverR = cell.r; hoverC = cell.c;
          hoverValid = canPlaceShip(playerGrid, cell.r, cell.c, SHIP_DEFS[placingIndex].size, placingHoriz);
        } else {
          hoverR = -1; hoverC = -1; hoverValid = false;
        }
      } else if (phase === 'playerTurn') {
        const cell = getGridCell(mx, my, RIGHT_GRID_X, GRID_Y);
        if (cell && aiGrid[cell.r][cell.c] !== HIT &&
            aiGrid[cell.r][cell.c] !== MISS && aiGrid[cell.r][cell.c] !== SUNK) {
          aimR = cell.r; aimC = cell.c;
        } else {
          aimR = -1; aimC = -1;
        }
      }
    }

    // Process keyboard
    if (game.input.wasPressed('r') || game.input.wasPressed('R')) {
      if (phase === 'placing') {
        placingHoriz = !placingHoriz;
        if (hoverR >= 0 && hoverC >= 0) {
          hoverValid = canPlaceShip(playerGrid, hoverR, hoverC, SHIP_DEFS[placingIndex].size, placingHoriz);
        }
      }
    }

    // Start game from waiting state via any key or click
    if (game.state === 'waiting') {
      const anyKey = game.input.wasPressed('Enter') || game.input.wasPressed(' ') ||
                     game.input.wasPressed('r') || game.input.wasPressed('R');
      const clicked = pendingClicks.length > 0;
      if (anyKey || clicked) {
        pendingClicks = [];
        // Start placement
        phase = 'placing';
        statusText = 'Place ' + SHIP_DEFS[0].name + ' (' + SHIP_DEFS[0].size + ') - R to rotate';
        game.setState('playing');
      }
      return;
    }

    // Restart from over state
    if (game.state === 'over') {
      const anyKey = game.input.wasPressed('Enter') || game.input.wasPressed(' ') ||
                     game.input.wasPressed('r') || game.input.wasPressed('R');
      const clicked = pendingClicks.length > 0;
      if (anyKey || clicked) {
        pendingClicks = [];
        game.onInit();
        return;
      }
      pendingClicks = [];
      return;
    }

    // AI shot timer (simulates setTimeout 600ms = ~36 frames at 60fps)
    if (phase === 'aiTurn') {
      aiShotPendingFrames--;
      if (aiShotPendingFrames <= 0) {
        aiFire(game);
        if (game.state !== 'over') {
          phase = 'playerTurn';
          aimR = -1; aimC = -1;
          if (lastAiResult === 'sunk')      statusText = 'AI sank your ship! YOUR TURN';
          else if (lastAiResult === 'hit')  statusText = 'AI hit! YOUR TURN';
          else                              statusText = 'AI missed. YOUR TURN';
        }
      }
      pendingClicks = [];
      return;
    }

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const cx = click.x, cy = click.y;

      if (phase === 'placing') {
        const cell = getGridCell(cx, cy, LEFT_GRID_X, GRID_Y);
        if (cell && canPlaceShip(playerGrid, cell.r, cell.c, SHIP_DEFS[placingIndex].size, placingHoriz)) {
          placeShip(playerGrid, playerShips, cell.r, cell.c, SHIP_DEFS[placingIndex].size, placingHoriz, placingIndex);
          placingIndex++;
          if (placingIndex >= SHIP_DEFS.length) {
            placeAIShips();
            phase = 'playerTurn';
            statusText = 'YOUR TURN - Fire at the enemy grid!';
          } else {
            statusText = 'Place ' + SHIP_DEFS[placingIndex].name + ' (' + SHIP_DEFS[placingIndex].size + ') - R to rotate';
          }
        }
      } else if (phase === 'playerTurn') {
        const cell = getGridCell(cx, cy, RIGHT_GRID_X, GRID_Y);
        if (cell) {
          const fired = playerFire(cell.r, cell.c, game);
          if (fired && game.state !== 'over') {
            phase = 'aiTurn';
            statusText = 'AI TARGETING...';
            aimR = -1; aimC = -1;
            aiShotPendingFrames = 36; // ~600ms at 60fps
          }
        }
      }
    }

    // Update explosions every frame
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.radius += 0.8;
      e.alpha  -= 0.03;
      if (e.alpha <= 0) explosions.splice(i, 1);
    }
  };

  // ── onDraw ──
  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Status text
    if (statusText) {
      renderer.setGlow('#4af', 0.5);
      text.drawText(statusText, W / 2, HEADER_H / 2 - 6, 12, '#4af', 'center');
      renderer.setGlow(null);
    }

    if (phase) {
      drawGrid(renderer, text, LEFT_GRID_X,  GRID_Y, playerGrid, true,  'YOUR FLEET');
      drawGrid(renderer, text, RIGHT_GRID_X, GRID_Y, aiGrid,     false, 'ENEMY WATERS');
    }

    if (phase === 'placing') {
      drawPlacementPreview(renderer);
    }

    if (phase === 'playerTurn' && aimR >= 0 && aimC >= 0) {
      drawAimHighlight(renderer);
    }

    drawExplosions(renderer);

    if (phase) {
      drawLegend(renderer, text);
    }
  };

  game.start();
  return game;
}
