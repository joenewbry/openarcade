// competitive-tetris/game.js — Competitive Tetris as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// Board constants
const COLS = 10, ROWS = 20;
const CELL = 22;
const BOARD_W = COLS * CELL; // 220
const BOARD_H = ROWS * CELL; // 440
const BOARD_Y = 30;
const P1_X = 15;
const P2_X = W - BOARD_W - 15;
const PREVIEW_SIZE = 4;
const PREVIEW_CELL = 16;

// Piece definitions: each rotation is a list of [row, col] offsets
const PIECES = {
  I: { color: '#00f0f0', shape: [[0,0],[0,1],[0,2],[0,3]] },
  O: { color: '#f0f000', shape: [[0,0],[0,1],[1,0],[1,1]] },
  T: { color: '#a000f0', shape: [[0,1],[1,0],[1,1],[1,2]] },
  S: { color: '#00f000', shape: [[0,1],[0,2],[1,0],[1,1]] },
  Z: { color: '#f00000', shape: [[0,0],[0,1],[1,1],[1,2]] },
  J: { color: '#0000f0', shape: [[0,0],[1,0],[1,1],[1,2]] },
  L: { color: '#f0a000', shape: [[0,2],[1,0],[1,1],[1,2]] }
};
const PIECE_NAMES = ['I','O','T','S','Z','J','L'];

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');

// ── Module-scope state ──
let p1, p2;
let speedTimer;      // accumulates ms of play time
let aiMoveTimer;     // accumulates ms for AI move pacing
let aiTargetCol;
let aiTargetRot;
let aiDropping;

// Frame-based timers: at 60Hz, 1 frame = 16.667ms
// We track dt accumulation in onUpdate

function rotateShape(shape) {
  const maxR = Math.max(...shape.map(s => s[0]));
  return shape.map(([r, c]) => [c, maxR - r]);
}

function getRotations(name) {
  let s = PIECES[name].shape.map(p => [...p]);
  const rots = [s];
  for (let i = 0; i < 3; i++) {
    s = rotateShape(s);
    const minR = Math.min(...s.map(p => p[0]));
    const minC = Math.min(...s.map(p => p[1]));
    s = s.map(([r, c]) => [r - minR, c - minC]);
    rots.push(s);
  }
  return rots;
}

const ALL_ROTATIONS = {};
PIECE_NAMES.forEach(n => { ALL_ROTATIONS[n] = getRotations(n); });

function createPlayer() {
  return {
    board: Array.from({length: ROWS}, () => Array(COLS).fill(null)),
    piece: null,
    pieceType: null,
    rotation: 0,
    pieceRow: 0,
    pieceCol: 0,
    nextType: null,
    lines: 0,
    dropTimer: 0,
    dropInterval: 800,
    pendingGarbage: 0,
    alive: true,
    bag: [],
    lockDelay: 0,
    lockDelayMax: 500
  };
}

function nextFromBag(player) {
  if (player.bag.length === 0) {
    player.bag = [...PIECE_NAMES];
    for (let i = player.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.bag[i], player.bag[j]] = [player.bag[j], player.bag[i]];
    }
  }
  return player.bag.pop();
}

function getShapeWidth(shape) {
  return Math.max(...shape.map(p => p[1])) + 1;
}

function isValid(board, shape, row, col) {
  for (const [r, c] of shape) {
    const br = row + r;
    const bc = col + c;
    if (bc < 0 || bc >= COLS || br >= ROWS) return false;
    if (br >= 0 && board[br][bc]) return false;
  }
  return true;
}

function clearLines(player) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (player.board[r].every(c => c !== null)) {
      player.board.splice(r, 1);
      player.board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

function addGarbage(player, count) {
  for (let i = 0; i < count; i++) {
    const gap = Math.floor(Math.random() * COLS);
    const row = Array(COLS).fill('#888888');
    row[gap] = null;
    player.board.shift();
    player.board.push(row);
  }
}

function spawnPiece(player) {
  if (player.pendingGarbage > 0) {
    addGarbage(player, player.pendingGarbage);
    player.pendingGarbage = 0;
  }

  const type = player.nextType || nextFromBag(player);
  player.nextType = nextFromBag(player);
  player.pieceType = type;
  player.rotation = 0;
  player.piece = ALL_ROTATIONS[type][0];
  player.pieceCol = Math.floor((COLS - getShapeWidth(player.piece)) / 2);
  player.pieceRow = 0;
  player.lockDelay = 0;

  if (!isValid(player.board, player.piece, player.pieceRow, player.pieceCol)) {
    player.alive = false;
  }
}

function lockPiece(player) {
  for (const [r, c] of player.piece) {
    const br = player.pieceRow + r;
    const bc = player.pieceCol + c;
    if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
      player.board[br][bc] = PIECES[player.pieceType].color;
    }
  }

  const cleared = clearLines(player);
  player.lines += cleared;

  if (cleared >= 2) {
    const opponent = player === p1 ? p2 : p1;
    let garbage = 0;
    if (cleared === 2) garbage = 1;
    else if (cleared === 3) garbage = 2;
    else if (cleared >= 4) garbage = 4;
    opponent.pendingGarbage += garbage;
  }

  spawnPiece(player);
}

function getGhostRow(player) {
  let r = player.pieceRow;
  while (isValid(player.board, player.piece, r + 1, player.pieceCol)) r++;
  return r;
}

function movePlayer(player, dx) {
  if (!player.alive || !player.piece) return;
  if (isValid(player.board, player.piece, player.pieceRow, player.pieceCol + dx)) {
    player.pieceCol += dx;
    if (player.lockDelay > 0) player.lockDelay = 0;
  }
}

function rotatePlayer(player, dir) {
  if (!player.alive || !player.piece) return;
  const newRot = (player.rotation + dir + 4) % 4;
  const newShape = ALL_ROTATIONS[player.pieceType][newRot];
  if (isValid(player.board, newShape, player.pieceRow, player.pieceCol)) {
    player.piece = newShape;
    player.rotation = newRot;
    if (player.lockDelay > 0) player.lockDelay = 0;
    return;
  }
  const kicks = [[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,1]];
  for (const [dc, dr] of kicks) {
    if (isValid(player.board, newShape, player.pieceRow + dr, player.pieceCol + dc)) {
      player.piece = newShape;
      player.rotation = newRot;
      player.pieceCol += dc;
      player.pieceRow += dr;
      if (player.lockDelay > 0) player.lockDelay = 0;
      return;
    }
  }
}

function softDrop(player) {
  if (!player.alive || !player.piece) return;
  if (isValid(player.board, player.piece, player.pieceRow + 1, player.pieceCol)) {
    player.pieceRow++;
  }
}

function hardDrop(player) {
  if (!player.alive || !player.piece) return;
  while (isValid(player.board, player.piece, player.pieceRow + 1, player.pieceCol)) {
    player.pieceRow++;
  }
  lockPiece(player);
}

// ── AI Logic ──

function aiEvaluate(board) {
  let holes = 0;
  let totalHeight = 0;
  let maxHeight = 0;
  let bumpiness = 0;
  const colHeights = [];

  for (let c = 0; c < COLS; c++) {
    let h = 0;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) { h = ROWS - r; break; }
    }
    colHeights.push(h);
    totalHeight += h;
    if (h > maxHeight) maxHeight = h;
  }

  for (let c = 0; c < COLS; c++) {
    let blocked = false;
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) blocked = true;
      else if (blocked) holes++;
    }
  }

  for (let c = 0; c < COLS - 1; c++) {
    bumpiness += Math.abs(colHeights[c] - colHeights[c + 1]);
  }

  let completeLines = 0;
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell !== null)) completeLines++;
  }

  return -holes * 35 - totalHeight * 2 - bumpiness * 5 + completeLines * 80 - maxHeight * 3;
}

function aiFindBestMove(player) {
  let bestScore = -Infinity;
  let bestCol = player.pieceCol;
  let bestRot = 0;

  for (let rot = 0; rot < 4; rot++) {
    const shape = ALL_ROTATIONS[player.pieceType][rot];
    const shapeWidth = Math.max(...shape.map(p => p[1])) + 1;
    const minCol = -Math.min(...shape.map(p => p[1]));
    const maxCol = COLS - shapeWidth - Math.min(...shape.map(p => p[1]));

    for (let col = minCol; col <= maxCol; col++) {
      if (!isValid(player.board, shape, 0, col)) continue;

      let row = 0;
      while (isValid(player.board, shape, row + 1, col)) row++;

      const testBoard = player.board.map(r => [...r]);
      for (const [r, c] of shape) {
        const br = row + r;
        const bc = col + c;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
          testBoard[br][bc] = '#fff';
        }
      }

      const sc = aiEvaluate(testBoard);
      if (sc > bestScore) {
        bestScore = sc;
        bestCol = col;
        bestRot = rot;
      }
    }
  }

  return { col: bestCol, rot: bestRot };
}

function updateAI(dt) {
  if (!p2.alive || !p2.piece) return;

  if (aiTargetCol === -1) {
    const move = aiFindBestMove(p2);
    aiTargetCol = move.col;
    aiTargetRot = move.rot;
    aiDropping = false;
  }

  aiMoveTimer += dt;
  if (aiMoveTimer < 80) return;
  aiMoveTimer = 0;

  if (p2.rotation !== aiTargetRot) {
    rotatePlayer(p2, 1);
    return;
  }

  if (p2.pieceCol < aiTargetCol) {
    movePlayer(p2, 1);
    return;
  } else if (p2.pieceCol > aiTargetCol) {
    movePlayer(p2, -1);
    return;
  }

  if (!aiDropping) {
    aiDropping = true;
    hardDrop(p2);
    aiTargetCol = -1;
  }
}

function updateGravity(player, dt) {
  if (!player.alive || !player.piece) return;
  player.dropTimer += dt;

  if (player.dropTimer >= player.dropInterval) {
    player.dropTimer = 0;
    if (isValid(player.board, player.piece, player.pieceRow + 1, player.pieceCol)) {
      player.pieceRow++;
      player.lockDelay = 0;
    } else {
      player.lockDelay += player.dropInterval;
      if (player.lockDelay >= player.lockDelayMax) {
        lockPiece(player);
      }
    }
  }
}

// ── Drawing helpers ──

function drawBlock(renderer, x, y, color) {
  renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, color);
  // Top/left highlight
  renderer.fillRect(x + 1, y + 1, CELL - 2, 4, 'rgba(255,255,255,0.25)');
  renderer.fillRect(x + 1, y + 1, 4, CELL - 2, 'rgba(255,255,255,0.25)');
  // Bottom/right shadow
  renderer.fillRect(x + CELL - 4, y + 1, 3, CELL - 2, 'rgba(0,0,0,0.3)');
  renderer.fillRect(x + 1, y + CELL - 4, CELL - 2, 3, 'rgba(0,0,0,0.3)');
}

function drawBoard(renderer, text, player, ox, oy, label) {
  // Background
  renderer.fillRect(ox, oy, BOARD_W, BOARD_H, '#0a0a1a');

  // Grid lines
  for (let r = 0; r <= ROWS; r++) {
    renderer.drawLine(ox, oy + r * CELL, ox + BOARD_W, oy + r * CELL, '#1a1a3e', 0.5);
  }
  for (let c = 0; c <= COLS; c++) {
    renderer.drawLine(ox + c * CELL, oy, ox + c * CELL, oy + BOARD_H, '#1a1a3e', 0.5);
  }

  // Placed blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (player.board[r][c]) {
        drawBlock(renderer, ox + c * CELL, oy + r * CELL, player.board[r][c]);
      }
    }
  }

  // Ghost piece
  if (player.piece && player.alive) {
    const ghostRow = getGhostRow(player);
    for (const [r, c] of player.piece) {
      const br = ghostRow + r;
      const bc = player.pieceCol + c;
      if (br >= 0 && br < ROWS) {
        renderer.fillRect(ox + bc * CELL + 1, oy + br * CELL + 1, CELL - 2, CELL - 2, 'rgba(255,68,255,0.15)');
        // Ghost outline via thin rects along edges
        renderer.fillRect(ox + bc * CELL + 1, oy + br * CELL + 1, CELL - 2, 1, 'rgba(255,68,255,0.4)');
        renderer.fillRect(ox + bc * CELL + 1, oy + br * CELL + CELL - 2, CELL - 2, 1, 'rgba(255,68,255,0.4)');
        renderer.fillRect(ox + bc * CELL + 1, oy + br * CELL + 1, 1, CELL - 2, 'rgba(255,68,255,0.4)');
        renderer.fillRect(ox + bc * CELL + CELL - 2, oy + br * CELL + 1, 1, CELL - 2, 'rgba(255,68,255,0.4)');
      }
    }
  }

  // Active piece
  if (player.piece && player.alive) {
    const color = PIECES[player.pieceType].color;
    for (const [r, c] of player.piece) {
      const br = player.pieceRow + r;
      const bc = player.pieceCol + c;
      if (br >= 0 && br < ROWS) {
        drawBlock(renderer, ox + bc * CELL, oy + br * CELL, color);
      }
    }
  }

  // Board border (strokePoly)
  renderer.strokePoly([
    {x: ox, y: oy}, {x: ox + BOARD_W, y: oy},
    {x: ox + BOARD_W, y: oy + BOARD_H}, {x: ox, y: oy + BOARD_H}
  ], player.alive ? '#ff44ff' : '#555555', 2, true);

  // Pending garbage indicator bar (left side of board)
  if (player.pendingGarbage > 0) {
    const barH = Math.min(player.pendingGarbage * CELL, BOARD_H);
    renderer.fillRect(ox - 6, oy + BOARD_H - barH, 4, barH, '#ff4444');
  }

  // Label
  const labelColor = player.alive ? '#ff44ff' : '#555555';
  text.drawText(label, ox + BOARD_W / 2, oy - 18, 13, labelColor, 'center');

  // Next piece preview
  const previewX = player === p1 ? ox + BOARD_W + 8 : ox - PREVIEW_SIZE * PREVIEW_CELL - 8;
  const previewY = oy;
  renderer.fillRect(previewX, previewY, PREVIEW_SIZE * PREVIEW_CELL, PREVIEW_SIZE * PREVIEW_CELL, '#111111');
  renderer.strokePoly([
    {x: previewX, y: previewY},
    {x: previewX + PREVIEW_SIZE * PREVIEW_CELL, y: previewY},
    {x: previewX + PREVIEW_SIZE * PREVIEW_CELL, y: previewY + PREVIEW_SIZE * PREVIEW_CELL},
    {x: previewX, y: previewY + PREVIEW_SIZE * PREVIEW_CELL}
  ], '#333333', 1, true);

  text.drawText('NEXT', previewX + PREVIEW_SIZE * PREVIEW_CELL / 2, previewY - 11, 10, '#888888', 'center');

  if (player.nextType) {
    const nextShape = ALL_ROTATIONS[player.nextType][0];
    const nextColor = PIECES[player.nextType].color;
    const sw = Math.max(...nextShape.map(p => p[1])) + 1;
    const sh = Math.max(...nextShape.map(p => p[0])) + 1;
    const offX = Math.floor((PREVIEW_SIZE - sw) / 2);
    const offY = Math.floor((PREVIEW_SIZE - sh) / 2);
    for (const [r, c] of nextShape) {
      const px = previewX + (offX + c) * PREVIEW_CELL;
      const py = previewY + (offY + r) * PREVIEW_CELL;
      renderer.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, nextColor);
      // Highlight
      renderer.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, 3, 'rgba(255,255,255,0.2)');
    }
  }
}

function drawCenterInfo(renderer, text) {
  const cx = W / 2;

  // VS text
  renderer.setGlow('#ff44ff', 0.6);
  text.drawText('VS', cx, BOARD_Y + 30, 20, '#ff44ff', 'center');
  renderer.setGlow(null);

  // Speed level
  const level = Math.floor(speedTimer / 30000) + 1;
  text.drawText('SPEED ' + level, cx, BOARD_Y + 57, 11, '#888888', 'center');

  // Garbage indicators
  if (p1.pendingGarbage > 0) {
    text.drawText('+' + p1.pendingGarbage + ' >>>', cx, BOARD_Y + 92, 12, '#ff4444', 'center');
  }
  if (p2.pendingGarbage > 0) {
    text.drawText('<<< +' + p2.pendingGarbage, cx, BOARD_Y + 112, 12, '#ff4444', 'center');
  }

  // Controls reminder
  text.drawText('\u2190\u2192 Move',        cx, BOARD_Y + BOARD_H - 68, 9, '#444444', 'center');
  text.drawText('\u2191 Rotate',            cx, BOARD_Y + BOARD_H - 54, 9, '#444444', 'center');
  text.drawText('\u2193 Soft Drop',         cx, BOARD_Y + BOARD_H - 40, 9, '#444444', 'center');
  text.drawText('SPACE Hard Drop',          cx, BOARD_Y + BOARD_H - 26, 9, '#444444', 'center');
}

// ── Pending click queue for overlay ──
let pendingClicks = [];

export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Track held keys for DAS (delayed auto shift)
  let leftHeld = 0, rightHeld = 0;
  const DAS_DELAY = 170;  // ms before repeat
  const DAS_RATE  = 50;   // ms repeat interval

  canvasEl.addEventListener('mousedown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    pendingClicks.push({ x, y });
  });

  game.onInit = () => {
    p1 = createPlayer();
    p2 = createPlayer();
    speedTimer = 0;
    aiMoveTimer = 0;
    aiTargetCol = -1;
    aiTargetRot = 0;
    aiDropping = false;
    leftHeld = 0;
    rightHeld = 0;
    pendingClicks = [];

    spawnPiece(p1);
    spawnPiece(p2);

    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';

    game.showOverlay('COMPETITIVE TETRIS', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => p1 ? p1.lines : 0);

  game.onUpdate = (dt) => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.setState('playing');
      }
      return;
    }

    // ── Game over state ──
    if (game.state === 'over') {
      if (pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Speed increase
    speedTimer += dt;
    const speedLevel = Math.floor(speedTimer / 30000);
    const baseInterval = Math.max(150, 800 - speedLevel * 80);
    p1.dropInterval = baseInterval;
    p2.dropInterval = baseInterval;

    // Player input
    if (p1.alive) {
      if (input.wasPressed('ArrowLeft'))  { movePlayer(p1, -1); leftHeld = -DAS_DELAY; }
      if (input.wasPressed('ArrowRight')) { movePlayer(p1, 1);  rightHeld = -DAS_DELAY; }
      if (input.wasPressed('ArrowUp'))    rotatePlayer(p1, 1);
      if (input.wasPressed('ArrowDown'))  softDrop(p1);
      if (input.wasPressed(' '))          hardDrop(p1);

      // DAS
      if (input.isDown('ArrowLeft')) {
        leftHeld += dt;
        if (leftHeld >= 0) { movePlayer(p1, -1); leftHeld -= DAS_RATE; }
      } else {
        leftHeld = -DAS_DELAY;
      }
      if (input.isDown('ArrowRight')) {
        rightHeld += dt;
        if (rightHeld >= 0) { movePlayer(p1, 1); rightHeld -= DAS_RATE; }
      } else {
        rightHeld = -DAS_DELAY;
      }
    }

    // Gravity
    updateGravity(p1, dt);
    updateGravity(p2, dt);

    // AI
    updateAI(dt);

    // Update DOM scores
    if (scoreEl) scoreEl.textContent = p1.lines;
    if (aiScoreEl) aiScoreEl.textContent = p2.lines;

    // Check game over
    if (!p1.alive || !p2.alive) {
      let title, body;
      if (!p1.alive && !p2.alive) {
        title = 'DRAW!';
        body = 'Both topped out! Lines: ' + p1.lines + ' vs ' + p2.lines + ' | Click to Retry';
      } else if (!p1.alive) {
        title = 'AI WINS!';
        body = 'You topped out! Lines: ' + p1.lines + ' vs ' + p2.lines + ' | Click to Retry';
      } else {
        title = 'YOU WIN!';
        body = 'AI topped out! Lines: ' + p1.lines + ' vs ' + p2.lines + ' | Click to Retry';
      }
      game.showOverlay(title, body);
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'playing' || game.state === 'over') {
      drawBoard(renderer, text, p1, P1_X, BOARD_Y, 'YOU (' + (p1 ? p1.lines : 0) + ')');
      drawBoard(renderer, text, p2, P2_X, BOARD_Y, 'AI (' + (p2 ? p2.lines : 0) + ')');
      drawCenterInfo(renderer, text);
    }
  };

  game.start();
  return game;
}
