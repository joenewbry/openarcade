// blokus/game.js — Blokus ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// Grid settings
const GRID = 14;
const CELL = 28;
const BOARD_X = Math.floor((W - GRID * CELL) / 2);
const BOARD_Y = 8;
const BOARD_PX = GRID * CELL;
const PANEL_Y = BOARD_Y + BOARD_PX + 14;
const PANEL_H = H - PANEL_Y;

// Colors
const PLAYER_COLOR = '#4488ff';
const PLAYER_LIGHT = 'rgba(68, 136, 255, 0.4)';
const PLAYER_INVALID = 'rgba(255, 60, 60, 0.35)';
const AI_COLOR = '#a966ff';
const GRID_COLOR = '#16213e';
const EMPTY_COLOR = '#222222';
const CORNER_DOT = 'rgba(68, 136, 255, 0.55)';

// Standard Blokus 21 pieces
const PIECE_DEFS = [
  { name: '1',  cells: [[0,0]] },
  { name: 'I2', cells: [[0,0],[1,0]] },
  { name: 'I3', cells: [[0,0],[1,0],[2,0]] },
  { name: 'V3', cells: [[0,0],[1,0],[1,1]] },
  { name: 'I4', cells: [[0,0],[1,0],[2,0],[3,0]] },
  { name: 'L4', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'T4', cells: [[0,0],[1,0],[2,0],[1,1]] },
  { name: 'S4', cells: [[0,0],[1,0],[1,1],[2,1]] },
  { name: 'O4', cells: [[0,0],[1,0],[0,1],[1,1]] },
  { name: 'I5', cells: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
  { name: 'L5', cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { name: 'Y5', cells: [[0,0],[1,0],[2,0],[3,0],[1,1]] },
  { name: 'N5', cells: [[0,0],[1,0],[1,1],[2,1],[3,1]] },
  { name: 'P5', cells: [[0,0],[1,0],[2,0],[0,1],[1,1]] },
  { name: 'F5', cells: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
  { name: 'T5', cells: [[0,0],[1,0],[2,0],[1,1],[1,2]] },
  { name: 'U5', cells: [[0,0],[2,0],[0,1],[1,1],[2,1]] },
  { name: 'V5', cells: [[0,0],[0,1],[0,2],[1,2],[2,2]] },
  { name: 'W5', cells: [[0,0],[0,1],[1,1],[1,2],[2,2]] },
  { name: 'X5', cells: [[1,0],[0,1],[1,1],[2,1],[1,2]] },
  { name: 'Z5', cells: [[0,0],[1,0],[1,1],[1,2],[2,2]] },
];

// --- Piece geometry helpers ---

function deepCopy(cells) {
  return cells.map(c => [c[0], c[1]]);
}

function rotateCW(cells) {
  let r = cells.map(([x, y]) => [-y, x]);
  let mx = Math.min(...r.map(c => c[0]));
  let my = Math.min(...r.map(c => c[1]));
  return r.map(([x, y]) => [x - mx, y - my]);
}

function flipH(cells) {
  let f = cells.map(([x, y]) => [-x, y]);
  let mx = Math.min(...f.map(c => c[0]));
  return f.map(([x, y]) => [x - mx, y]);
}

function normalize(cells) {
  let mx = Math.min(...cells.map(c => c[0]));
  let my = Math.min(...cells.map(c => c[1]));
  let n = cells.map(([x, y]) => [x - mx, y - my]);
  n.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return n;
}

function cellsKey(cells) {
  return normalize(cells).map(c => c[0] + ',' + c[1]).join('|');
}

function getAllOrientations(cells) {
  let seen = new Set();
  let result = [];
  let base = deepCopy(cells);
  for (let f = 0; f < 2; f++) {
    let c = deepCopy(base);
    for (let r = 0; r < 4; r++) {
      let n = normalize(c);
      let k = cellsKey(n);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(n);
      }
      c = rotateCW(c);
    }
    base = flipH(base);
  }
  return result;
}

// Pre-compute all orientations for each piece
const PIECE_ORIENTATIONS = PIECE_DEFS.map(d => getAllOrientations(d.cells));

function makePieceSet() {
  return PIECE_DEFS.map(d => ({
    name: d.name,
    cells: deepCopy(d.cells),
    used: false,
    _panelX: 0, _panelY: 0, _panelW: 0, _panelH: 0,
  }));
}

// --- Board helpers ---

function getCell(board, x, y) {
  if (x < 0 || x >= GRID || y < 0 || y >= GRID) return -1;
  return board[y * GRID + x];
}

function setCell(board, x, y, v) {
  board[y * GRID + x] = v;
}

function hasPlacedAny(board, player) {
  for (let i = 0; i < GRID * GRID; i++) {
    if (board[i] === player) return true;
  }
  return false;
}

function getValidCorners(board, player) {
  let corners = new Set();
  let edges = new Set();
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (getCell(board, x, y) !== player) continue;
      for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID)
          edges.add(ny * GRID + nx);
      }
      for (let [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && getCell(board, nx, ny) === 0)
          corners.add(ny * GRID + nx);
      }
    }
  }
  for (let e of edges) corners.delete(e);
  return corners;
}

function isValidPlacement(board, cells, ox, oy, player) {
  let placed = hasPlacedAny(board, player);
  let startX = player === 1 ? 0 : GRID - 1;
  let startY = player === 1 ? 0 : GRID - 1;
  let coversStart = false;
  let touchesCorner = false;
  let touchesEdge = false;

  for (let [cx, cy] of cells) {
    let gx = ox + cx, gy = oy + cy;
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return false;
    if (getCell(board, gx, gy) !== 0) return false;
    if (gx === startX && gy === startY) coversStart = true;
    for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      if (getCell(board, gx + dx, gy + dy) === player) touchesEdge = true;
    }
    for (let [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      if (getCell(board, gx + dx, gy + dy) === player) touchesCorner = true;
    }
  }

  if (!placed) return coversStart;
  return touchesCorner && !touchesEdge;
}

function placePiece(board, cells, ox, oy, player) {
  for (let [cx, cy] of cells) setCell(board, ox + cx, oy + cy, player);
}

function countSquares(board, player) {
  let s = 0;
  for (let i = 0; i < GRID * GRID; i++) if (board[i] === player) s++;
  return s;
}

function piecesRemaining(pieces) {
  let c = 0;
  for (let p of pieces) if (!p.used) c++;
  return c;
}

// --- Move generation ---

function getFirstMovesList(board, pieces, player) {
  let sx = player === 1 ? 0 : GRID - 1;
  let sy = player === 1 ? 0 : GRID - 1;
  let moves = [];
  let seen = new Set();
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].used) continue;
    for (let oCells of PIECE_ORIENTATIONS[i]) {
      for (let [cx, cy] of oCells) {
        let ox = sx - cx, oy = sy - cy;
        let key = cellsKey(oCells) + '@' + ox + ',' + oy;
        if (seen.has(key)) continue;
        seen.add(key);
        if (isValidPlacement(board, oCells, ox, oy, player)) {
          moves.push({ pieceIdx: i, cells: oCells, ox, oy });
        }
      }
    }
  }
  return moves;
}

function getAllMoves(board, pieces, player) {
  if (!hasPlacedAny(board, player)) return getFirstMovesList(board, pieces, player);
  let corners = getValidCorners(board, player);
  if (corners.size === 0) return [];
  let cornerList = [];
  for (let c of corners) cornerList.push([c % GRID, Math.floor(c / GRID)]);

  let moves = [];
  let seen = new Set();
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].used) continue;
    for (let oCells of PIECE_ORIENTATIONS[i]) {
      for (let [cornerX, cornerY] of cornerList) {
        for (let [cx, cy] of oCells) {
          let ox = cornerX - cx, oy = cornerY - cy;
          let key = i + '|' + cellsKey(oCells) + '|' + ox + ',' + oy;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isValidPlacement(board, oCells, ox, oy, player)) {
            moves.push({ pieceIdx: i, cells: oCells, ox, oy });
          }
        }
      }
    }
  }
  return moves;
}

function hasAnyMove(board, pieces, player) {
  if (!hasPlacedAny(board, player)) {
    let sx = player === 1 ? 0 : GRID - 1;
    let sy = player === 1 ? 0 : GRID - 1;
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].used) continue;
      for (let oCells of PIECE_ORIENTATIONS[i]) {
        for (let [cx, cy] of oCells) {
          if (isValidPlacement(board, oCells, sx - cx, sy - cy, player)) return true;
        }
      }
    }
    return false;
  }
  let corners = getValidCorners(board, player);
  if (corners.size === 0) return false;
  let cornerList = [];
  for (let c of corners) cornerList.push([c % GRID, Math.floor(c / GRID)]);
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].used) continue;
    for (let oCells of PIECE_ORIENTATIONS[i]) {
      for (let [cornerX, cornerY] of cornerList) {
        for (let [cx, cy] of oCells) {
          if (isValidPlacement(board, oCells, cornerX - cx, cornerY - cy, player)) return true;
        }
      }
    }
  }
  return false;
}

// --- AI ---

function aiMove(board, aiPieces) {
  let moves = getAllMoves(board, aiPieces, 2);
  if (moves.length === 0) return null;

  let myCornersBefore = getValidCorners(board, 2).size;
  let oppCornersBefore = getValidCorners(board, 1).size;
  let totalPiecesUsed = 0;
  for (let p of aiPieces) if (p.used) totalPiecesUsed++;

  let bestScore = -Infinity;
  let bestMoves = [];

  for (let move of moves) {
    let { cells, ox, oy, pieceIdx } = move;
    let pieceSize = cells.length;

    for (let [cx, cy] of cells) setCell(board, ox + cx, oy + cy, 2);

    let myCorners = getValidCorners(board, 2).size;
    let oppCorners = getValidCorners(board, 1).size;

    for (let [cx, cy] of cells) setCell(board, ox + cx, oy + cy, 0);

    let cornerGain = myCorners - myCornersBefore;
    let oppLoss = oppCornersBefore - oppCorners;

    let earlyGame = totalPiecesUsed < 8;
    let sc = pieceSize * (earlyGame ? 4 : 2)
           + cornerGain * 2.5
           + oppLoss * 1.5;

    if (earlyGame) {
      let cd = 0;
      for (let [cx, cy] of cells) {
        let dx = (ox + cx) - 6.5, dy = (oy + cy) - 6.5;
        cd += Math.sqrt(dx * dx + dy * dy);
      }
      sc -= cd * 0.15;
    }

    if (sc > bestScore) {
      bestScore = sc;
      bestMoves = [move];
    } else if (sc === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// --- Module state ---
let board;
let playerPieces, aiPieces;
let selectedPieceIdx;
let currentRotation;
let turn;
let mouseGridX, mouseGridY;
let mouseCanvasX, mouseCanvasY;
let playerPassed, aiPassed;
let hoverValid;
let aiThinking;
let aiTimer;   // frames remaining before AI executes
let score;

// DOM elements updated outside the canvas
let scoreEl, aiScoreEl, piecesLeftEl, aiPiecesLeftEl, passBtn, turnIndicator;

// Mouse event queue (click coords in canvas space)
let pendingClicks = [];
let pendingKeyPresses = [];

function selectNextAvailable() {
  for (let i = 0; i < playerPieces.length; i++) {
    if (!playerPieces[i].used) {
      selectedPieceIdx = i;
      currentRotation = deepCopy(playerPieces[i].cells);
      return;
    }
  }
  selectedPieceIdx = -1;
  currentRotation = null;
}

function updateScores() {
  let ps = countSquares(board, 1);
  let as2 = countSquares(board, 2);
  score = ps;
  if (scoreEl) scoreEl.textContent = ps;
  if (aiScoreEl) aiScoreEl.textContent = as2;
  if (piecesLeftEl) piecesLeftEl.textContent = piecesRemaining(playerPieces);
  if (aiPiecesLeftEl) aiPiecesLeftEl.textContent = piecesRemaining(aiPieces);
}

function setTurnText(text, color) {
  if (turnIndicator) {
    turnIndicator.textContent = text;
    turnIndicator.style.color = color;
  }
}

function getPieceBounds(cells) {
  let maxX = 0, maxY = 0;
  for (let [x, y] of cells) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { maxX, maxY };
}

// Layout piece panel items and store hit areas
function layoutPiecePanel() {
  const cs = 9;
  const gap = 6;
  const startY = PANEL_Y + 10;
  const rowH = 52;
  let x = 10;
  let y = startY;
  let row = 0;

  for (let i = 0; i < playerPieces.length; i++) {
    let p = playerPieces[i];
    let bounds = getPieceBounds(p.cells);
    let pw = (bounds.maxX + 1) * cs + gap;

    if (x + pw > W - 10 && x > 20) {
      row++;
      x = 10;
      y = startY + row * rowH;
    }

    let bw = (bounds.maxX + 1) * cs + 8;
    let bh = (bounds.maxY + 1) * cs + 8;
    p._panelX = x - 4;
    p._panelY = y - 4;
    p._panelW = bw;
    p._panelH = bh;
    p._drawX = x;
    p._drawY = y;

    x += pw + 2;
  }
}

function getPanelPieceAt(mx, my) {
  for (let i = 0; i < playerPieces.length; i++) {
    let p = playerPieces[i];
    if (p.used) continue;
    if (mx >= p._panelX && mx <= p._panelX + p._panelW &&
        my >= p._panelY && my <= p._panelY + p._panelH) {
      return i;
    }
  }
  return -1;
}

// --- Drawing ---

function drawBoard(renderer) {
  // Background fill behind board
  renderer.fillRect(0, 0, W, PANEL_Y - 6, '#1a1a2e');

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let px = BOARD_X + x * CELL;
      let py = BOARD_Y + y * CELL;
      let v = getCell(board, x, y);
      let color = v === 1 ? PLAYER_COLOR : v === 2 ? AI_COLOR : EMPTY_COLOR;
      renderer.fillRect(px, py, CELL, CELL, color);

      // Grid lines
      renderer.drawLine(px, py, px + CELL, py, GRID_COLOR, 1);
      renderer.drawLine(px, py, px, py + CELL, GRID_COLOR, 1);

      // Inner highlight for placed pieces
      if (v === 1) {
        renderer.fillRect(px + 1, py + 1, CELL / 2 - 1, CELL / 2 - 1, 'rgba(255,255,255,0.12)');
      } else if (v === 2) {
        renderer.fillRect(px + 1, py + 1, CELL / 2 - 1, CELL / 2 - 1, 'rgba(255,255,255,0.10)');
      }
    }
  }

  // Bottom and right grid border lines
  renderer.drawLine(BOARD_X, BOARD_Y + BOARD_PX, BOARD_X + BOARD_PX, BOARD_Y + BOARD_PX, GRID_COLOR, 1);
  renderer.drawLine(BOARD_X + BOARD_PX, BOARD_Y, BOARD_X + BOARD_PX, BOARD_Y + BOARD_PX, GRID_COLOR, 1);

  // Starting corner highlights
  if (!hasPlacedAny(board, 1)) {
    renderer.fillRect(BOARD_X + 2, BOARD_Y + 2, CELL - 4, CELL - 4, 'rgba(68,136,255,0.3)');
    renderer.drawLine(BOARD_X + 1, BOARD_Y + 1, BOARD_X + CELL - 1, BOARD_Y + 1, '#4488ff', 1);
    renderer.drawLine(BOARD_X + 1, BOARD_Y + 1, BOARD_X + 1, BOARD_Y + CELL - 1, '#4488ff', 1);
    renderer.drawLine(BOARD_X + CELL - 1, BOARD_Y + 1, BOARD_X + CELL - 1, BOARD_Y + CELL - 1, '#4488ff', 1);
    renderer.drawLine(BOARD_X + 1, BOARD_Y + CELL - 1, BOARD_X + CELL - 1, BOARD_Y + CELL - 1, '#4488ff', 1);
  }
  if (!hasPlacedAny(board, 2)) {
    let px = BOARD_X + (GRID - 1) * CELL;
    let py = BOARD_Y + (GRID - 1) * CELL;
    renderer.fillRect(px + 2, py + 2, CELL - 4, CELL - 4, 'rgba(170,102,255,0.3)');
    renderer.drawLine(px + 1, py + 1, px + CELL - 1, py + 1, AI_COLOR, 1);
    renderer.drawLine(px + 1, py + 1, px + 1, py + CELL - 1, AI_COLOR, 1);
    renderer.drawLine(px + CELL - 1, py + 1, px + CELL - 1, py + CELL - 1, AI_COLOR, 1);
    renderer.drawLine(px + 1, py + CELL - 1, px + CELL - 1, py + CELL - 1, AI_COLOR, 1);
  }

  // Board outer border
  renderer.setGlow(AI_COLOR, 0.3);
  renderer.drawLine(BOARD_X - 1, BOARD_Y - 1, BOARD_X + BOARD_PX + 1, BOARD_Y - 1, AI_COLOR, 2);
  renderer.drawLine(BOARD_X - 1, BOARD_Y - 1, BOARD_X - 1, BOARD_Y + BOARD_PX + 1, AI_COLOR, 2);
  renderer.drawLine(BOARD_X + BOARD_PX + 1, BOARD_Y - 1, BOARD_X + BOARD_PX + 1, BOARD_Y + BOARD_PX + 1, AI_COLOR, 2);
  renderer.drawLine(BOARD_X - 1, BOARD_Y + BOARD_PX + 1, BOARD_X + BOARD_PX + 1, BOARD_Y + BOARD_PX + 1, AI_COLOR, 2);
  renderer.setGlow(null);
}

function drawCornerDots(renderer, gameState) {
  if (gameState !== 'playing' || turn !== 1) return;
  if (!hasPlacedAny(board, 1)) return;
  let corners = getValidCorners(board, 1);
  for (let c of corners) {
    let x = c % GRID, y = Math.floor(c / GRID);
    renderer.fillCircle(
      BOARD_X + x * CELL + CELL / 2,
      BOARD_Y + y * CELL + CELL / 2,
      3,
      CORNER_DOT
    );
  }
}

function drawHoverPreview(renderer, gameState) {
  if (gameState !== 'playing' || turn !== 1 || aiThinking) return;
  if (selectedPieceIdx < 0 || !currentRotation) return;
  if (mouseGridX < 0 || mouseGridY < 0) return;

  let valid = isValidPlacement(board, currentRotation, mouseGridX, mouseGridY, 1);
  hoverValid = valid;

  for (let [cx, cy] of currentRotation) {
    let gx = mouseGridX + cx, gy = mouseGridY + cy;
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) continue;
    let px = BOARD_X + gx * CELL;
    let py = BOARD_Y + gy * CELL;
    renderer.fillRect(px + 1, py + 1, CELL - 2, CELL - 2, valid ? PLAYER_LIGHT : PLAYER_INVALID);
    if (valid) {
      renderer.drawLine(px + 2, py + 2, px + CELL - 2, py + 2, PLAYER_COLOR, 2);
      renderer.drawLine(px + 2, py + 2, px + 2, py + CELL - 2, PLAYER_COLOR, 2);
      renderer.drawLine(px + CELL - 2, py + 2, px + CELL - 2, py + CELL - 2, PLAYER_COLOR, 2);
      renderer.drawLine(px + 2, py + CELL - 2, px + CELL - 2, py + CELL - 2, PLAYER_COLOR, 2);
    } else {
      renderer.drawLine(px + 2, py + 2, px + CELL - 2, py + 2, 'rgba(255,60,60,0.5)', 1);
      renderer.drawLine(px + 2, py + 2, px + 2, py + CELL - 2, 'rgba(255,60,60,0.5)', 1);
      renderer.drawLine(px + CELL - 2, py + 2, px + CELL - 2, py + CELL - 2, 'rgba(255,60,60,0.5)', 1);
      renderer.drawLine(px + 2, py + CELL - 2, px + CELL - 2, py + CELL - 2, 'rgba(255,60,60,0.5)', 1);
    }
  }
}

function drawPiecePanel(renderer, text) {
  // Panel background
  renderer.fillRect(0, PANEL_Y - 6, W, PANEL_H + 10, '#111111');
  renderer.drawLine(0, PANEL_Y - 6, W, PANEL_Y - 6, '#333333', 1);

  text.drawText('YOUR PIECES  [click=select  R=rotate  F=flip]', 10, PANEL_Y - 3, 9, '#666666', 'left');

  const cs = 9;

  layoutPiecePanel();

  for (let i = 0; i < playerPieces.length; i++) {
    let p = playerPieces[i];
    let selected = (i === selectedPieceIdx && !p.used);

    if (selected) {
      renderer.fillRect(p._panelX, p._panelY, p._panelW, p._panelH, 'rgba(68,136,255,0.15)');
      renderer.drawLine(p._panelX, p._panelY, p._panelX + p._panelW, p._panelY, '#4488ff', 1.5);
      renderer.drawLine(p._panelX, p._panelY, p._panelX, p._panelY + p._panelH, '#4488ff', 1.5);
      renderer.drawLine(p._panelX + p._panelW, p._panelY, p._panelX + p._panelW, p._panelY + p._panelH, '#4488ff', 1.5);
      renderer.drawLine(p._panelX, p._panelY + p._panelH, p._panelX + p._panelW, p._panelY + p._panelH, '#4488ff', 1.5);
    }

    let color = p.used ? 'rgba(80,80,80,0.2)' : selected ? '#ffffff' : PLAYER_COLOR;

    for (let [cx, cy] of p.cells) {
      renderer.fillRect(p._drawX + cx * cs, p._drawY + cy * cs, cs - 1, cs - 1, color);
    }
  }
}

// --- Export ---

export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Grab DOM elements
  scoreEl       = document.getElementById('score');
  aiScoreEl     = document.getElementById('aiScore');
  piecesLeftEl  = document.getElementById('piecesLeft');
  aiPiecesLeftEl = document.getElementById('aiPiecesLeft');
  passBtn       = document.getElementById('passBtn');
  turnIndicator = document.getElementById('turnIndicator');

  // Mouse tracking (canvas coords)
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseCanvasX = (e.clientX - rect.left) * scaleX;
    mouseCanvasY = (e.clientY - rect.top) * scaleY;

    let gx = Math.floor((mouseCanvasX - BOARD_X) / CELL);
    let gy = Math.floor((mouseCanvasY - BOARD_Y) / CELL);
    if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID && mouseCanvasY < PANEL_Y - 6) {
      mouseGridX = gx;
      mouseGridY = gy;
    } else {
      mouseGridX = -1;
      mouseGridY = -1;
    }
  });

  canvasEl.addEventListener('mouseleave', () => {
    mouseGridX = -1;
    mouseGridY = -1;
    mouseCanvasX = -1;
    mouseCanvasY = -1;
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    pendingClicks.push({ x, y });
  });

  // Keyboard input (R/F for rotate/flip)
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'f') {
      pendingKeyPresses.push(k);
    }
  });

  // Pass button
  if (passBtn) {
    passBtn.addEventListener('click', () => {
      if (game.state !== 'playing' || turn !== 1 || aiThinking) return;
      playerPassed = true;
      turn = 2;
      if (aiPassed) {
        endGame(game);
      } else {
        aiTimer = 18; // ~300ms at 60fps
        setTurnText('AI thinking...', AI_COLOR);
      }
    });
  }

  game.onInit = () => {
    board = new Uint8Array(GRID * GRID);
    playerPieces = makePieceSet();
    aiPieces = makePieceSet();
    selectedPieceIdx = -1;
    currentRotation = null;
    turn = 1;
    score = 0;
    mouseGridX = -1;
    mouseGridY = -1;
    mouseCanvasX = -1;
    mouseCanvasY = -1;
    playerPassed = false;
    aiPassed = false;
    hoverValid = false;
    aiThinking = false;
    aiTimer = 0;
    pendingClicks = [];
    pendingKeyPresses = [];

    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    if (piecesLeftEl) piecesLeftEl.textContent = '21';
    if (aiPiecesLeftEl) aiPiecesLeftEl.textContent = '21';
    setTurnText('Your turn', PLAYER_COLOR);
    if (passBtn) passBtn.disabled = true;

    game.showOverlay('BLOKUS', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // --- Waiting ---
    if (game.state === 'waiting') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        pendingKeyPresses = [];
        game.setState('playing');
        if (passBtn) passBtn.disabled = false;
        selectNextAvailable();
      }
      return;
    }

    // --- Game Over ---
    if (game.state === 'over') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        pendingKeyPresses = [];
        game.onInit();
      }
      return;
    }

    // --- Playing ---

    // AI turn: count down timer then fire
    if (aiThinking && aiTimer > 0) {
      aiTimer--;
      if (aiTimer === 0) {
        executeAiTurn(game);
      }
      pendingClicks = [];
      pendingKeyPresses = [];
      return;
    }

    if (turn !== 1) {
      pendingClicks = [];
      pendingKeyPresses = [];
      return;
    }

    // Process key presses (rotate / flip)
    for (const k of pendingKeyPresses) {
      if (!currentRotation) continue;
      if (k === 'r') {
        currentRotation = rotateCW(currentRotation);
      } else if (k === 'f') {
        currentRotation = flipH(currentRotation);
      }
    }
    pendingKeyPresses = [];

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const { x, y } = click;

      // Click in piece panel
      if (y >= PANEL_Y - 6) {
        let idx = getPanelPieceAt(x, y);
        if (idx >= 0 && !playerPieces[idx].used) {
          selectedPieceIdx = idx;
          currentRotation = deepCopy(playerPieces[idx].cells);
        }
        continue;
      }

      // Click on board to place
      let gx = Math.floor((x - BOARD_X) / CELL);
      let gy = Math.floor((y - BOARD_Y) / CELL);
      if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
        if (selectedPieceIdx >= 0 && currentRotation) {
          if (isValidPlacement(board, currentRotation, gx, gy, 1)) {
            placePiece(board, currentRotation, gx, gy, 1);
            playerPieces[selectedPieceIdx].used = true;
            playerPassed = false;
            updateScores();

            selectedPieceIdx = -1;
            currentRotation = null;
            selectNextAvailable();

            turn = 2;
            aiThinking = true;
            aiTimer = 18;
            setTurnText('AI thinking...', AI_COLOR);
          }
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    drawBoard(renderer);
    drawCornerDots(renderer, game.state);
    drawHoverPreview(renderer, game.state);
    drawPiecePanel(renderer, text);
  };

  game.start();
  return game;
}

function executeAiTurn(game) {
  const move = aiMove(board, aiPieces);
  if (move) {
    placePiece(board, move.cells, move.ox, move.oy, 2);
    aiPieces[move.pieceIdx].used = true;
    aiPassed = false;
    updateScores();
  } else {
    aiPassed = true;
  }

  aiThinking = false;
  turn = 1;

  // Check if player can move
  if (!hasAnyMove(board, playerPieces, 1)) {
    playerPassed = true;
    if (aiPassed) {
      endGame(game);
      return;
    }
    // Check if AI can still move
    if (!hasAnyMove(board, aiPieces, 2)) {
      endGame(game);
      return;
    }
    setTurnText('No moves - auto-passing...', '#888888');
    turn = 2;
    aiThinking = true;
    aiTimer = 36;
    return;
  }

  playerPassed = false;
  setTurnText('Your turn', PLAYER_COLOR);
  if (passBtn) passBtn.disabled = false;

  if (selectedPieceIdx < 0 || playerPieces[selectedPieceIdx].used) {
    selectNextAvailable();
  }
}

function endGame(game) {
  game.setState('over');
  if (passBtn) passBtn.disabled = true;
  aiThinking = false;

  const ps = countSquares(board, 1);
  const as2 = countSquares(board, 2);
  score = ps;
  if (scoreEl) scoreEl.textContent = ps;

  setTurnText('Game over', '#888888');

  let title, msg;
  if (ps > as2) {
    title = 'YOU WIN!';
    msg = ps + ' vs ' + as2 + ' squares \u2014 Click to play again';
  } else if (as2 > ps) {
    title = 'AI WINS!';
    msg = as2 + ' vs ' + ps + ' squares \u2014 Click to play again';
  } else {
    title = 'TIE!';
    msg = ps + ' squares each \u2014 Click to play again';
  }
  game.showOverlay(title, msg);
}
