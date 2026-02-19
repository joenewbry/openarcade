// pipe-dream/game.js — Pipe Dream game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 350;
const H = 500;
const COLS = 7;
const ROWS = 10;
const CELL = 50;

// Pipe types: connections [top, right, bottom, left]
const PIPE_TYPES = [
  { name: 'vert',  conn: [1,0,1,0] },
  { name: 'horiz', conn: [0,1,0,1] },
  { name: 'tr',    conn: [1,1,0,0] },
  { name: 'rb',    conn: [0,1,1,0] },
  { name: 'bl',    conn: [0,0,1,1] },
  { name: 'lt',    conn: [1,0,0,1] },
  { name: 'cross', conn: [1,1,1,1] },
];

const WATER_COLOR = '#0af';
const WATER_GLOW  = '#08f';
const SOURCE_COLOR = '#f80';
const CURSOR_COLOR = '#ff0';

// Opposite directions: 0=top->2=bottom, 1=right->3=left
const OPP = [2, 3, 0, 1];
// Direction offsets [dr, dc]: top, right, bottom, left
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

const COUNTDOWN_SEC = 15;
const SPEED_START = 1200;
const SPEED_MIN = 350;
const SPEED_STEP = 35;
const QUEUE_LEN = 5;

// Weights: straights common, bends common, cross rare
const PIPE_WEIGHTS = [3, 3, 2, 2, 2, 2, 1];
const PIPE_WEIGHT_TOTAL = PIPE_WEIGHTS.reduce((a, b) => a + b, 0);

// ── State ──
let grid;            // ROWS x COLS: null or { typeIdx, filled:[t,r,b,l], crossUsed:0|1|2 }
let queue;           // pipe type indices
let cursorR, cursorC;
let sourceR, sourceC, sourceDir;
let flowHead;        // { r, c, fromDir } next cell water will enter
let flowStarted;
let flowCountdown;   // seconds remaining
let flowSpeed;       // ms per pipe segment (decreases)
let pipesUsed;       // number of pipes water has passed through
let animProgress;    // 0..1 for current flow animation
let animFromDir, animExitDir, animR, animC; // current animation targets
let animating;       // true while animating a flow step
let score, best;
let hoverR, hoverC;  // mouse hover position

// Frame-based timers (at 60fps)
let countdownFrames;   // frames until next countdown tick
let flowAnimStart;     // performance.now() when current flow anim started
let flowAnimDuration;  // ms for current flow anim

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const timerEl = document.getElementById('timer');

// ── Queue canvas rendering ──
const queueCanvas = document.getElementById('queueCanvas');
let queueCtx = null;
if (queueCanvas) {
  queueCtx = queueCanvas.getContext('2d');
}

function randPipe() {
  let r = Math.random() * PIPE_WEIGHT_TOTAL;
  for (let i = 0; i < PIPE_WEIGHTS.length; i++) {
    r -= PIPE_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

function drawPipeShapeCanvas(context, x, y, size, typeIdx) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pw = size * 0.34;
  const hw = pw / 2;
  const conn = PIPE_TYPES[typeIdx].conn;
  const isCross = typeIdx === 6;

  context.fillStyle = '#1e2d4d';
  for (let d = 0; d < 4; d++) {
    if (!conn[d]) continue;
    context.save();
    context.translate(cx, cy);
    context.rotate(d * Math.PI / 2);
    context.fillRect(-hw, -size / 2, pw, size / 2 + hw);
    context.restore();
  }

  context.strokeStyle = '#4a7a9a';
  context.lineWidth = 1.5;
  context.shadowColor = '#4dc';
  context.shadowBlur = 3;

  for (let d = 0; d < 4; d++) {
    if (!conn[d]) continue;
    context.save();
    context.translate(cx, cy);
    context.rotate(d * Math.PI / 2);
    context.beginPath();
    context.moveTo(-hw, hw);
    context.lineTo(-hw, -size / 2);
    context.stroke();
    context.beginPath();
    context.moveTo(hw, hw);
    context.lineTo(hw, -size / 2);
    context.stroke();
    context.restore();
  }

  for (let d = 0; d < 4; d++) {
    if (conn[d]) continue;
    const prev = (d + 3) % 4;
    const next = (d + 1) % 4;
    if (conn[prev] || conn[next]) {
      context.save();
      context.translate(cx, cy);
      context.rotate(d * Math.PI / 2);
      context.beginPath();
      context.moveTo(-hw, -hw);
      context.lineTo(hw, -hw);
      context.stroke();
      context.restore();
    }
  }

  context.shadowBlur = 0;

  if (isCross) {
    context.strokeStyle = '#2a3a5a';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx - size / 2, cy - hw);
    context.lineTo(cx + size / 2, cy - hw);
    context.stroke();
    context.beginPath();
    context.moveTo(cx - size / 2, cy + hw);
    context.lineTo(cx + size / 2, cy + hw);
    context.stroke();
  }
}

function drawQueueCanvas() {
  if (!queueCtx) return;
  const qw = queueCanvas.width;
  const qh = queueCanvas.height;
  queueCtx.fillStyle = '#16213e';
  queueCtx.fillRect(0, 0, qw, qh);

  const prevSize = 50;
  const gap = 6;

  for (let i = 0; i < queue.length; i++) {
    const px = (qw - prevSize) / 2;
    const py = i * (prevSize + gap) + gap;

    if (i === 0) {
      queueCtx.strokeStyle = '#4dc';
      queueCtx.lineWidth = 2;
      queueCtx.shadowColor = '#4dc';
      queueCtx.shadowBlur = 8;
      queueCtx.strokeRect(px - 3, py - 3, prevSize + 6, prevSize + 6);
      queueCtx.shadowBlur = 0;
    }

    drawPipeShapeCanvas(queueCtx, px, py, prevSize, queue[i]);
  }
}

// ── Helper: stroke a rectangle using drawLine ──
function strokeRect(renderer, x, y, w, h, color, lineWidth) {
  renderer.drawLine(x, y, x + w, y, color, lineWidth);
  renderer.drawLine(x + w, y, x + w, y + h, color, lineWidth);
  renderer.drawLine(x + w, y + h, x, y + h, color, lineWidth);
  renderer.drawLine(x, y + h, x, y, color, lineWidth);
}

// ── Pipe drawing in WebGL ──

function drawPipeArm(renderer, cx, cy, size, d, pw, color, lineWidth) {
  // Draw the wall outlines for one arm of a pipe in the given direction
  const hw = pw / 2;
  const halfCell = size / 2;
  // Using direction: 0=up, 1=right, 2=down, 3=left
  // We need to draw two parallel lines from center to edge
  switch (d) {
    case 0: // top
      renderer.drawLine(cx - hw, cy - hw, cx - hw, cy - halfCell, color, lineWidth);
      renderer.drawLine(cx + hw, cy - hw, cx + hw, cy - halfCell, color, lineWidth);
      break;
    case 1: // right
      renderer.drawLine(cx + hw, cy - hw, cx + halfCell, cy - hw, color, lineWidth);
      renderer.drawLine(cx + hw, cy + hw, cx + halfCell, cy + hw, color, lineWidth);
      break;
    case 2: // bottom
      renderer.drawLine(cx - hw, cy + hw, cx - hw, cy + halfCell, color, lineWidth);
      renderer.drawLine(cx + hw, cy + hw, cx + hw, cy + halfCell, color, lineWidth);
      break;
    case 3: // left
      renderer.drawLine(cx - hw, cy - hw, cx - halfCell, cy - hw, color, lineWidth);
      renderer.drawLine(cx - hw, cy + hw, cx - halfCell, cy + hw, color, lineWidth);
      break;
  }
}

function drawPipeInterior(renderer, cx, cy, size, d, pw, color) {
  // Fill the interior for one arm of a pipe
  const hw = pw / 2;
  const halfCell = size / 2;
  const c = color || '#1e2d4d';
  switch (d) {
    case 0: // top
      renderer.fillRect(cx - hw, cy - halfCell, pw, halfCell + hw, c);
      break;
    case 1: // right
      renderer.fillRect(cx - hw, cy - hw, halfCell + hw, pw, c);
      break;
    case 2: // bottom
      renderer.fillRect(cx - hw, cy - hw, pw, halfCell + hw, c);
      break;
    case 3: // left
      renderer.fillRect(cx - halfCell, cy - hw, halfCell + hw, pw, c);
      break;
  }
}

function drawPipeCap(renderer, cx, cy, size, d, pw, color, lineWidth) {
  // Draw a cap line across one side of the pipe (where it doesn't connect)
  const hw = pw / 2;
  switch (d) {
    case 0: // top cap
      renderer.drawLine(cx - hw, cy - hw, cx + hw, cy - hw, color, lineWidth);
      break;
    case 1: // right cap
      renderer.drawLine(cx + hw, cy - hw, cx + hw, cy + hw, color, lineWidth);
      break;
    case 2: // bottom cap
      renderer.drawLine(cx - hw, cy + hw, cx + hw, cy + hw, color, lineWidth);
      break;
    case 3: // left cap
      renderer.drawLine(cx - hw, cy - hw, cx - hw, cy + hw, color, lineWidth);
      break;
  }
}

function drawPipeShape(renderer, x, y, size, typeIdx, alpha) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pw = size * 0.34;
  const conn = PIPE_TYPES[typeIdx].conn;
  const isCross = typeIdx === 6;
  const isGhost = alpha !== undefined;
  const alphaSuffix = isGhost ? Math.round(alpha * 255).toString(16).padStart(2, '0') : '';

  // Fill interior for each arm
  const interiorColor = isGhost ? '#1e2d4d' + alphaSuffix : '#1e2d4d';
  for (let d = 0; d < 4; d++) {
    if (!conn[d]) continue;
    drawPipeInterior(renderer, cx, cy, size, d, pw, interiorColor);
  }

  // Pipe wall outlines with glow
  const wallColor = isGhost ? '#4a7a9a' + alphaSuffix : '#4a7a9a';
  if (!isGhost) renderer.setGlow('#4dc', 0.3);
  for (let d = 0; d < 4; d++) {
    if (!conn[d]) continue;
    drawPipeArm(renderer, cx, cy, size, d, pw, wallColor, 1.5);
  }

  // End caps where pipe doesn't connect
  for (let d = 0; d < 4; d++) {
    if (conn[d]) continue;
    const prev = (d + 3) % 4;
    const next = (d + 1) % 4;
    if (conn[prev] || conn[next]) {
      drawPipeCap(renderer, cx, cy, size, d, pw, wallColor, 1.5);
    }
  }
  if (!isGhost) renderer.setGlow(null);

  // Cross-piece divider lines
  if (isCross) {
    const hw = pw / 2;
    const divColor = isGhost ? '#2a3a5a' + alphaSuffix : '#2a3a5a';
    renderer.drawLine(cx - size / 2, cy - hw, cx + size / 2, cy - hw, divColor, 1);
    renderer.drawLine(cx - size / 2, cy + hw, cx + size / 2, cy + hw, divColor, 1);
  }
}

function drawWater(renderer, x, y, size, filled, animInfo) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pw = size * 0.34;
  const ww = pw * 0.55;
  const hw = ww / 2;
  const halfCell = size / 2;

  renderer.setGlow(WATER_GLOW, 0.6);

  // Draw filled water segments (already traversed)
  if (filled) {
    for (let d = 0; d < 4; d++) {
      if (!filled[d]) continue;
      switch (d) {
        case 0: // top
          renderer.fillRect(cx - hw, cy - halfCell, ww, halfCell, WATER_COLOR);
          break;
        case 1: // right
          renderer.fillRect(cx, cy - hw, halfCell, ww, WATER_COLOR);
          break;
        case 2: // bottom
          renderer.fillRect(cx - hw, cy, ww, halfCell, WATER_COLOR);
          break;
        case 3: // left
          renderer.fillRect(cx - halfCell, cy - hw, halfCell, ww, WATER_COLOR);
          break;
      }
    }
    // Center blob
    if (filled.some(f => f)) {
      renderer.fillRect(cx - hw, cy - hw, ww, ww, WATER_COLOR);
    }
  }

  // Animated water for current flow step
  if (animInfo) {
    const { fromDir, exitDir, progress } = animInfo;

    if (progress <= 0.5) {
      // Phase 1: from entry edge toward center
      const t = progress * 2;
      drawWaterArm(renderer, cx, cy, halfCell, hw, ww, fromDir, t, true);
    } else {
      // Phase 2: entry side fully filled + center + exit progressing
      drawWaterArm(renderer, cx, cy, halfCell, hw, ww, fromDir, 1, true);
      // Center
      renderer.fillRect(cx - hw, cy - hw, ww, ww, WATER_COLOR);
      // Exit arm
      const t = (progress - 0.5) * 2;
      drawWaterArm(renderer, cx, cy, halfCell, hw, ww, exitDir, t, false);
    }
  }

  renderer.setGlow(null);
}

function drawWaterArm(renderer, cx, cy, halfCell, hw, ww, dir, t, fromEdge) {
  // fromEdge: true = draw from edge toward center, false = draw from center toward edge
  switch (dir) {
    case 0: // top
      if (fromEdge) {
        renderer.fillRect(cx - hw, cy - halfCell, ww, t * halfCell, WATER_COLOR);
      } else {
        renderer.fillRect(cx - hw, cy - t * halfCell, ww, t * halfCell, WATER_COLOR);
      }
      break;
    case 1: // right
      if (fromEdge) {
        renderer.fillRect(cx + halfCell - t * halfCell, cy - hw, t * halfCell, ww, WATER_COLOR);
      } else {
        renderer.fillRect(cx, cy - hw, t * halfCell, ww, WATER_COLOR);
      }
      break;
    case 2: // bottom
      if (fromEdge) {
        renderer.fillRect(cx - hw, cy + halfCell - t * halfCell, ww, t * halfCell, WATER_COLOR);
      } else {
        renderer.fillRect(cx - hw, cy, ww, t * halfCell, WATER_COLOR);
      }
      break;
    case 3: // left
      if (fromEdge) {
        renderer.fillRect(cx - halfCell, cy - hw, t * halfCell, ww, WATER_COLOR);
      } else {
        renderer.fillRect(cx - t * halfCell, cy - hw, t * halfCell, ww, WATER_COLOR);
      }
      break;
  }
}

function drawSourceCell(renderer, text, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  // Source background
  renderer.setGlow(SOURCE_COLOR, 0.8);
  renderer.fillRect(x + 3, y + 3, size - 6, size - 6, '#2a1a0e');
  renderer.setGlow(null);

  // Border
  strokeRect(renderer, x + 3, y + 3, size - 6, size - 6, SOURCE_COLOR, 2);

  // "S" label
  renderer.setGlow(SOURCE_COLOR, 0.6);
  text.drawText('S', cx, cy - Math.floor(size * 0.2), Math.floor(size * 0.4), SOURCE_COLOR, 'center');
  renderer.setGlow(null);

  // Arrow showing exit direction
  const arrEndX = cx + DC[sourceDir] * size * 0.3;
  const arrEndY = cy + DR[sourceDir] * size * 0.3;
  const arrStartX = cx + DC[sourceDir] * size * 0.1;
  const arrStartY = cy + DR[sourceDir] * size * 0.1;
  renderer.drawLine(arrStartX, arrStartY, arrEndX, arrEndY, SOURCE_COLOR, 2);

  // Arrowhead
  const aLen = 5;
  const angle = Math.atan2(DR[sourceDir], DC[sourceDir]);
  renderer.drawLine(arrEndX, arrEndY,
    arrEndX - aLen * Math.cos(angle - 0.5), arrEndY - aLen * Math.sin(angle - 0.5),
    SOURCE_COLOR, 2);
  renderer.drawLine(arrEndX, arrEndY,
    arrEndX - aLen * Math.cos(angle + 0.5), arrEndY - aLen * Math.sin(angle + 0.5),
    SOURCE_COLOR, 2);

  // Draw water spout if flow started
  if (flowStarted) {
    const ww = size * 0.34 * 0.55;
    renderer.setGlow(WATER_GLOW, 0.6);
    // Water flows from center toward exit edge
    switch (sourceDir) {
      case 0: // top
        renderer.fillRect(cx - ww / 2, cy - size * 0.45, ww, size * 0.45, WATER_COLOR);
        break;
      case 1: // right
        renderer.fillRect(cx, cy - ww / 2, size * 0.45, ww, WATER_COLOR);
        break;
      case 2: // bottom
        renderer.fillRect(cx - ww / 2, cy, ww, size * 0.45, WATER_COLOR);
        break;
      case 3: // left
        renderer.fillRect(cx - size * 0.45, cy - ww / 2, size * 0.45, ww, WATER_COLOR);
        break;
    }
    renderer.setGlow(null);
  }
}

function placePipe(r, c, game) {
  if (game.state !== 'playing') return;
  if (r === sourceR && c === sourceC) return;

  const cell = grid[r][c];

  // Can't replace a pipe that has water in it
  if (cell && (cell.filled[0] || cell.filled[1] || cell.filled[2] || cell.filled[3])) return;

  // Replacing an unfilled pipe costs countdown time
  if (cell && cell.typeIdx >= 0) {
    flowCountdown = Math.max(0, flowCountdown - 2);
    timerEl.textContent = flowStarted ? 'FLOW' : flowCountdown;
  }

  const typeIdx = queue.shift();
  queue.push(randPipe());

  grid[r][c] = {
    typeIdx: typeIdx,
    filled: [0, 0, 0, 0],
    crossUsed: 0
  };

  drawQueueCanvas();
}

function beginFlow(game) {
  flowStarted = true;
  timerEl.textContent = 'FLOW';

  // Mark source in grid
  grid[sourceR][sourceC] = { typeIdx: -1, filled: [0,0,0,0], crossUsed: 0 };
  grid[sourceR][sourceC].filled[sourceDir] = 1;

  // First cell water enters
  flowHead = {
    r: sourceR + DR[sourceDir],
    c: sourceC + DC[sourceDir],
    fromDir: OPP[sourceDir]
  };

  advanceFlow(game);
}

function advanceFlow(game) {
  if (game.state !== 'playing') return;

  const { r, c, fromDir } = flowHead;

  // Off grid?
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { endGame(game); return; }

  const cell = grid[r][c];
  if (!cell || cell.typeIdx < 0) { endGame(game); return; }

  const pipe = PIPE_TYPES[cell.typeIdx];

  // Pipe must connect on the entry side
  if (!pipe.conn[fromDir]) { endGame(game); return; }

  // Find exit direction
  let exitDir;
  if (pipe.name === 'cross') {
    exitDir = OPP[fromDir];
    if (cell.filled[fromDir] && cell.filled[exitDir]) { endGame(game); return; }
  } else {
    exitDir = -1;
    for (let d = 0; d < 4; d++) {
      if (d !== fromDir && pipe.conn[d]) { exitDir = d; break; }
    }
    if (exitDir < 0) { endGame(game); return; }
    if (cell.filled[fromDir] && cell.filled[exitDir]) { endGame(game); return; }
  }

  // Start animation for this pipe segment
  animR = r;
  animC = c;
  animFromDir = fromDir;
  animExitDir = exitDir;
  animProgress = 0;
  animating = true;
  flowAnimStart = performance.now();
  flowAnimDuration = flowSpeed;
}

function updateFlowAnim(game) {
  if (!animating || game.state !== 'playing') return;

  const now = performance.now();
  animProgress = Math.min(1, (now - flowAnimStart) / flowAnimDuration);

  if (animProgress >= 1) {
    // Animation done: mark filled
    animating = false;
    const cell = grid[animR][animC];
    const pipe = PIPE_TYPES[cell.typeIdx];
    cell.filled[animFromDir] = 1;
    cell.filled[animExitDir] = 1;

    // Score
    pipesUsed++;
    let pts = 10;
    if (pipe.name === 'cross') {
      cell.crossUsed++;
      if (cell.crossUsed >= 2) pts += 50;
    }
    score += pts;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('pipedream_best', best);
    }

    // Speed up
    flowSpeed = Math.max(SPEED_MIN, SPEED_START - pipesUsed * SPEED_STEP);

    // Next cell
    flowHead = {
      r: animR + DR[animExitDir],
      c: animC + DC[animExitDir],
      fromDir: OPP[animExitDir]
    };

    // Advance to next pipe
    advanceFlow(game);
  }
}

function endGame(game) {
  animating = false;
  game.showOverlay('GAME OVER', 'Pipes: ' + pipesUsed + ' | Score: ' + score + ' -- Press SPACE to restart');
  game.setState('over');
}

// ── Mouse handling ──

function setupMouse(canvas, game) {
  canvas.addEventListener('mousemove', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const c = Math.floor(mx / CELL);
    const r = Math.floor(my / CELL);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      hoverR = r;
      hoverC = c;
      cursorR = r;
      cursorC = c;
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const c = Math.floor(mx / CELL);
    const r = Math.floor(my / CELL);

    if (game.state === 'waiting') {
      game.setState('playing');
      timerEl.textContent = flowCountdown;
      countdownFrames = 60;
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    if (game.state === 'playing' && r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      cursorR = r;
      cursorC = c;
      placePipe(r, c, game);
    }
  });
}

export function createGame() {
  const game = new Game('game');

  // Set up mouse handling
  setupMouse(game.canvas, game);

  game.onInit = () => {
    score = 0;
    best = parseInt(localStorage.getItem('pipedream_best') || '0', 10);
    scoreEl.textContent = '0';
    bestEl.textContent = best;
    timerEl.textContent = '--';

    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    queue = [];
    for (let i = 0; i < QUEUE_LEN; i++) queue.push(randPipe());

    cursorR = Math.floor(ROWS / 2);
    cursorC = Math.floor(COLS / 2);
    hoverR = -1;
    hoverC = -1;

    // Random source on left or right edge
    sourceR = 1 + Math.floor(Math.random() * (ROWS - 2));
    const onLeft = Math.random() < 0.5;
    sourceC = onLeft ? 0 : COLS - 1;
    sourceDir = onLeft ? 1 : 3;

    flowHead = null;
    flowStarted = false;
    flowCountdown = COUNTDOWN_SEC;
    flowSpeed = SPEED_START;
    pipesUsed = 0;
    animProgress = 0;
    animating = false;
    countdownFrames = 0;
    flowAnimStart = 0;
    flowAnimDuration = 0;

    drawQueueCanvas();
    game.showOverlay('PIPE DREAM', 'Press SPACE or click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        timerEl.textContent = flowCountdown;
        countdownFrames = 60;
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Keyboard cursor movement
    if (input.wasPressed('ArrowUp'))    cursorR = Math.max(0, cursorR - 1);
    if (input.wasPressed('ArrowDown'))  cursorR = Math.min(ROWS - 1, cursorR + 1);
    if (input.wasPressed('ArrowLeft'))  cursorC = Math.max(0, cursorC - 1);
    if (input.wasPressed('ArrowRight')) cursorC = Math.min(COLS - 1, cursorC + 1);
    if (input.wasPressed(' '))          placePipe(cursorR, cursorC, game);

    // Countdown timer (frame-based: 60 frames = 1 second)
    if (!flowStarted) {
      countdownFrames--;
      if (countdownFrames <= 0) {
        countdownFrames = 60;
        if (flowCountdown <= 0) {
          timerEl.textContent = '0';
          beginFlow(game);
        } else {
          timerEl.textContent = flowCountdown;
          flowCountdown--;
        }
      }
    }

    // Update flow animation
    if (flowStarted) {
      updateFlowAnim(game);
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid lines
    for (let c = 0; c <= COLS; c++) {
      renderer.drawLine(c * CELL, 0, c * CELL, ROWS * CELL, '#16213e', 0.5);
    }
    for (let r = 0; r <= ROWS; r++) {
      renderer.drawLine(0, r * CELL, COLS * CELL, r * CELL, '#16213e', 0.5);
    }

    // Draw all cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (!cell) continue;

        const px = c * CELL;
        const py = r * CELL;

        // Source cell
        if (cell.typeIdx === -1) {
          drawSourceCell(renderer, text, px, py, CELL);
          continue;
        }

        // Draw pipe structure
        drawPipeShape(renderer, px, py, CELL, cell.typeIdx);

        // Draw water
        let anim = null;
        if (animating && animR === r && animC === c) {
          anim = { fromDir: animFromDir, exitDir: animExitDir, progress: animProgress };
        }
        drawWater(renderer, px, py, CELL, cell.filled, anim);
      }
    }

    // Draw source if not yet in grid (before flow starts)
    if (!grid[sourceR][sourceC]) {
      drawSourceCell(renderer, text, sourceC * CELL, sourceR * CELL, CELL);
    }

    // Cursor highlight
    if (game.state === 'playing') {
      const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
      renderer.setGlow(CURSOR_COLOR, 0.6 * pulse);
      strokeRect(renderer, cursorC * CELL + 2, cursorR * CELL + 2, CELL - 4, CELL - 4, CURSOR_COLOR, 2.5);
      renderer.setGlow(null);

      // Next piece preview ghost on cursor (if cell empty)
      if (queue.length > 0 && !grid[cursorR][cursorC] && !(cursorR === sourceR && cursorC === sourceC)) {
        drawPipeShape(renderer, cursorC * CELL, cursorR * CELL, CELL, queue[0], 0.25);
      }
    }

    // Status text at bottom of canvas
    if (game.state === 'playing' && !flowStarted) {
      renderer.setGlow('#4dc', 0.8);
      text.drawText('Water in ' + timerEl.textContent + 's - place pipes!', W / 2, H - 20, 15, '#4dc', 'center');
      renderer.setGlow(null);
    } else if (game.state === 'playing' && flowStarted) {
      renderer.setGlow(WATER_GLOW, 0.7);
      text.drawText('Pipes filled: ' + pipesUsed, W / 2, H - 20, 14, WATER_COLOR, 'center');
      renderer.setGlow(null);
    }
  };

  // Expose for debugging / ML
  window.gameData = {
    get grid() { return grid; },
    get queue() { return queue; },
    get flowHead() { return flowHead; },
    get pipesUsed() { return pipesUsed; }
  };

  game.start();
  return game;
}
