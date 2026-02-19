// puyo-puyo/game.js — Puyo Puyo game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const COLS = 6;
const ROWS = 12;
const CELL = 40;
const W = COLS * CELL;   // 240
const H = ROWS * CELL;   // 480

// Puyo colors - 4 distinct neon colors
const COLORS = ['#f44', '#4f4', '#44f', '#ff4'];

// ── State ──
let board;                // ROWS x COLS grid, null or color index
let currentPair;          // { pivot, child, rotation }
let pairX, pairY;         // grid position of pivot
let nextPair;
let score, best, maxChain, chainCount, pairsDropped;
let dropInterval, dropTimer;
let softDropping;
const SOFT_DROP_FRAMES = Math.max(1, Math.round(40 * 60 / 1000)); // ~2-3 frames

let animState;            // null | 'popping' | 'falling' | 'chainCheck'
let animTimer;            // frame counter for animation delays
let popSet;               // Set of cell keys being popped
let popPhase;             // pop animation phase counter

// Next piece preview uses a small 2D canvas (tiny, no perf concern)
const nextCanvas = document.getElementById('nextCanvas');
const nctx = nextCanvas ? nextCanvas.getContext('2d') : null;

// DOM refs for side panel
const chainEl = document.getElementById('chain');
const scorePanelEl = document.getElementById('scorePanel');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helpers ──

function randomPair() {
  return {
    pivot: Math.floor(Math.random() * COLORS.length),
    child: Math.floor(Math.random() * COLORS.length)
  };
}

function getChildOffset(rotation) {
  switch (rotation) {
    case 0: return { dx: 0, dy: -1 }; // above
    case 1: return { dx: 1, dy: 0 };  // right
    case 2: return { dx: 0, dy: 1 };  // below
    case 3: return { dx: -1, dy: 0 }; // left
  }
}

function getChildPos() {
  const off = getChildOffset(currentPair.rotation);
  return { x: pairX + off.dx, y: pairY + off.dy };
}

function canPlace(px, py, rotation) {
  const off = getChildOffset(rotation);
  const cx = px + off.dx;
  const cy = py + off.dy;
  if (px < 0 || px >= COLS || py >= ROWS) return false;
  if (py >= 0 && board[py][px] !== null) return false;
  if (cx < 0 || cx >= COLS || cy >= ROWS) return false;
  if (cy >= 0 && board[cy][cx] !== null) return false;
  return true;
}

function movePair(dx) {
  if (!currentPair || animState) return;
  const newX = pairX + dx;
  if (canPlace(newX, pairY, currentPair.rotation)) {
    pairX = newX;
  }
}

function rotatePair(dir) {
  if (!currentPair || animState) return;
  let newRot = (currentPair.rotation + dir + 4) % 4;

  if (canPlace(pairX, pairY, newRot)) {
    currentPair.rotation = newRot;
    return;
  }

  // Wall kicks
  const kicks = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 }
  ];
  for (const kick of kicks) {
    if (canPlace(pairX + kick.dx, pairY + kick.dy, newRot)) {
      pairX += kick.dx;
      pairY += kick.dy;
      currentPair.rotation = newRot;
      return;
    }
  }
}

function dropPair() {
  if (!currentPair || animState) return false;
  const newY = pairY + 1;
  if (canPlace(pairX, newY, currentPair.rotation)) {
    pairY = newY;
    return true;
  }
  return false;
}

// Convert ms to frame count
function dropFrames() {
  const interval = softDropping ? 40 : dropInterval;
  return Math.max(1, Math.round(interval * 60 / 1000));
}

// ── Drawing helpers ──

function drawPuyoGL(renderer, cx, cy, radius, colorIdx, alpha) {
  if (colorIdx === null || colorIdx === undefined) return;
  const color = COLORS[colorIdx];
  const a = alpha !== undefined ? alpha : 1;

  // Main body with glow
  renderer.setGlow(color, 0.4 * a);
  if (a < 1) {
    // Parse hex and apply alpha
    const r = parseInt(color.slice(1, 2), 16) * 17;
    const g = parseInt(color.slice(2, 3), 16) * 17;
    const b = parseInt(color.slice(3, 4), 16) * 17;
    renderer.fillCircle(cx, cy, radius, `rgba(${r},${g},${b},${a})`);
  } else {
    renderer.fillCircle(cx, cy, radius, color);
  }
  renderer.setGlow(null);

  // Inner highlight (top-left)
  renderer.fillCircle(
    cx - radius * 0.25, cy - radius * 0.25, radius * 0.45,
    `rgba(255,255,255,${0.18 * a})`
  );

  // Small specular highlight
  renderer.fillCircle(
    cx - radius * 0.3, cy - radius * 0.35, radius * 0.15,
    `rgba(255,255,255,${0.4 * a})`
  );

  // Eyes
  const eyeOffX = radius * 0.22;
  const eyeY = cy - radius * 0.05;
  const eyeR = radius * 0.12;
  // Left eye
  renderer.fillCircle(cx - eyeOffX, eyeY, eyeR, `rgba(255,255,255,${a})`);
  renderer.fillCircle(cx - eyeOffX, eyeY, eyeR * 0.5, `rgba(17,17,17,${a})`);
  // Right eye
  renderer.fillCircle(cx + eyeOffX, eyeY, eyeR, `rgba(255,255,255,${a})`);
  renderer.fillCircle(cx + eyeOffX, eyeY, eyeR * 0.5, `rgba(17,17,17,${a})`);
}

function drawBoardPuyoGL(renderer, r, c, colorIdx, alpha) {
  const cx = c * CELL + CELL / 2;
  const cy = r * CELL + CELL / 2;
  drawPuyoGL(renderer, cx, cy, CELL * 0.42, colorIdx, alpha);
}

// Next piece preview (2D canvas, same as original)
function drawPuyo2D(context, cx, cy, radius, colorIdx, alpha) {
  if (colorIdx === null || colorIdx === undefined) return;
  const color = COLORS[colorIdx];

  context.save();
  context.globalAlpha = alpha !== undefined ? alpha : 1;

  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.fill();
  context.shadowBlur = 0;

  // Inner highlight
  context.beginPath();
  context.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.45, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.25)';
  context.fill();

  // Specular
  context.beginPath();
  context.arc(cx - radius * 0.3, cy - radius * 0.35, radius * 0.15, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.5)';
  context.fill();

  // Eyes
  const eyeOffX = radius * 0.22;
  const eyeY = cy - radius * 0.05;
  const eyeR = radius * 0.12;
  context.beginPath();
  context.arc(cx - eyeOffX, eyeY, eyeR, 0, Math.PI * 2);
  context.fillStyle = '#fff';
  context.fill();
  context.beginPath();
  context.arc(cx - eyeOffX, eyeY, eyeR * 0.5, 0, Math.PI * 2);
  context.fillStyle = '#111';
  context.fill();
  context.beginPath();
  context.arc(cx + eyeOffX, eyeY, eyeR, 0, Math.PI * 2);
  context.fillStyle = '#fff';
  context.fill();
  context.beginPath();
  context.arc(cx + eyeOffX, eyeY, eyeR * 0.5, 0, Math.PI * 2);
  context.fillStyle = '#111';
  context.fill();

  context.restore();
}

function drawNext() {
  if (!nctx) return;
  nctx.fillStyle = '#16213e';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPair) return;

  const ncx = nextCanvas.width / 2;
  const size = 16;
  // Child above pivot
  drawPuyo2D(nctx, ncx, 20, size, nextPair.child);
  drawPuyo2D(nctx, ncx, 56, size, nextPair.pivot);
}

// ── Chain / pop logic ──

let game; // reference set in createGame

function applyGravity() {
  let fell = false;
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        if (writeRow !== r) {
          board[writeRow][c] = board[r][c];
          board[r][c] = null;
          fell = true;
        }
        writeRow--;
      }
    }
  }

  animState = 'chainCheck';
  // Delay check: 9 frames (~150ms) if pieces fell, 3 frames (~50ms) otherwise
  animTimer = fell ? 9 : 3;
}

function checkPops() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null && !visited[r][c]) {
        const color = board[r][c];
        const group = [];
        const queue = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const cell = queue.shift();
          group.push(cell);

          const neighbors = [
            { r: cell.r - 1, c: cell.c },
            { r: cell.r + 1, c: cell.c },
            { r: cell.r, c: cell.c - 1 },
            { r: cell.r, c: cell.c + 1 }
          ];

          for (const n of neighbors) {
            if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS &&
                !visited[n.r][n.c] && board[n.r][n.c] === color) {
              visited[n.r][n.c] = true;
              queue.push(n);
            }
          }
        }

        if (group.length >= 4) {
          groups.push({ color, cells: group });
        }
      }
    }
  }

  if (groups.length > 0) {
    chainCount++;
    if (chainCount > maxChain) {
      maxChain = chainCount;
      chainEl.textContent = maxChain;
    }

    popSet = new Set();
    let totalPopped = 0;
    let groupBonus = 0;
    const colorsPopped = new Set();

    for (const group of groups) {
      for (const cell of group.cells) {
        popSet.add(cell.r * COLS + cell.c);
        totalPopped++;
      }
      colorsPopped.add(group.color);
      if (group.cells.length > 4) {
        groupBonus += group.cells.length - 3;
      }
    }

    // Color bonus
    const colorBonusTable = [0, 0, 3, 6, 12];
    const colorBonus = colorBonusTable[Math.min(colorsPopped.size, 4)];

    // Chain power
    const chainPower = [0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256];
    const cp = chainCount < chainPower.length ? chainPower[chainCount] : 256 + (chainCount - 11) * 32;

    // Score formula
    const multiplier = Math.max(1, cp + colorBonus + groupBonus);
    const points = 10 * totalPopped * multiplier;
    score += points;
    scoreEl.textContent = score;
    scorePanelEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Start pop animation
    animState = 'popping';
    popPhase = 0;
    // animTimer will count up in onUpdate; pop ends at popPhase > 16
  } else {
    // No pops — spawn next
    animState = null;
    popSet = null;
    if (!spawnPair()) return;
    dropTimer = 0;
  }
}

function finishPop() {
  // Remove popped puyos
  for (const key of popSet) {
    const r = Math.floor(key / COLS);
    const c = key % COLS;
    board[r][c] = null;
  }
  popSet = null;
  animState = 'falling';
  // After a short delay (6 frames ~100ms), apply gravity again
  animTimer = 6;
}

function spawnPair() {
  currentPair = {
    pivot: nextPair.pivot,
    child: nextPair.child,
    rotation: 0
  };
  nextPair = randomPair();
  pairX = 2;
  pairY = 0;
  pairsDropped++;
  drawNext();

  // Progressive difficulty
  dropInterval = Math.max(150, 800 - Math.floor(pairsDropped / 10) * 50);

  // Check spawn blocked
  if (board[0][2] !== null) {
    gameOver();
    return false;
  }
  return true;
}

function lockPair() {
  if (!currentPair) return;
  const child = getChildPos();

  if (pairY >= 0 && pairY < ROWS) {
    board[pairY][pairX] = currentPair.pivot;
  }
  if (child.y >= 0 && child.y < ROWS) {
    board[child.y][child.x] = currentPair.child;
  }

  currentPair = null;
  chainCount = 0;
  applyGravity();
}

function hardDrop() {
  if (!currentPair || animState) return;
  let dropped = 0;
  while (dropPair()) {
    dropped++;
  }
  score += dropped * 2;
  scoreEl.textContent = score;
  scorePanelEl.textContent = score;
  lockPair();
}

function gameOver() {
  game.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
  game.setState('over');
}

// ── Expose game data for ML ──
window.gameData = {};
function updateGameData() {
  window.gameData = {
    board: board ? board.map(row => row.slice()) : [],
    pairX, pairY,
    currentPair,
    nextPair,
    chainCount,
    maxChain,
    score,
    gameState: game ? game.state : 'waiting'
  };
}
setInterval(updateGameData, 200);

// ── Main export ──

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0;
    best = 0;
    maxChain = 0;
    chainCount = 0;
    pairsDropped = 0;
    dropInterval = 800;
    dropTimer = 0;
    softDropping = false;
    animState = null;
    animTimer = 0;
    popSet = null;
    popPhase = 0;
    currentPair = null;

    scoreEl.textContent = '0';
    scorePanelEl.textContent = '0';
    chainEl.textContent = '0';
    bestEl.textContent = '0';

    nextPair = randomPair();
    spawnPair();
    drawNext();

    game.showOverlay('PUYO PUYO', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.setState('playing');
        dropTimer = 0;
      }
      return;
    }

    // ── Game over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Handle animations via frame counting
    if (animState === 'chainCheck') {
      animTimer--;
      if (animTimer <= 0) {
        checkPops();
      }
      return;
    }

    if (animState === 'popping') {
      popPhase++;
      if (popPhase > 16) {
        finishPop();
      }
      return;
    }

    if (animState === 'falling') {
      animTimer--;
      if (animTimer <= 0) {
        applyGravity();
      }
      return;
    }

    // ── Normal input (no animation in progress) ──
    if (currentPair) {
      if (input.wasPressed('ArrowLeft')) movePair(-1);
      if (input.wasPressed('ArrowRight')) movePair(1);
      if (input.wasPressed('ArrowUp')) rotatePair(1);    // clockwise
      if (input.wasPressed('z') || input.wasPressed('Z')) rotatePair(-1); // CCW
      if (input.wasPressed(' ')) { hardDrop(); dropTimer = 0; return; }

      // Soft drop tracking
      softDropping = input.isDown('ArrowDown');

      // Auto-drop timer
      dropTimer++;
      if (dropTimer >= dropFrames()) {
        dropTimer = 0;
        if (!dropPair()) {
          lockPair();
        } else {
          if (softDropping) {
            score += 1;
            scoreEl.textContent = score;
            scorePanelEl.textContent = score;
          }
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid lines
    for (let x = 0; x <= W; x += CELL) {
      renderer.fillRect(x, 0, 0.5, H, '#16213e');
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.fillRect(0, y, W, 0.5, '#16213e');
    }

    // "X" kill marker on col 2, row 0
    renderer.drawLine(2 * CELL + 4, 4, 3 * CELL - 4, CELL - 4, 'rgba(204,136,255,0.3)', 2);
    renderer.drawLine(3 * CELL - 4, 4, 2 * CELL + 4, CELL - 4, 'rgba(204,136,255,0.3)', 2);

    // Board puyos
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== null) {
          if (popSet && popSet.has(r * COLS + c)) {
            // Pop animation
            const pulse = Math.sin(popPhase * 0.6) * 0.5 + 0.5;
            const shrink = Math.max(0, 1 - popPhase / 16);
            const cx = c * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;
            drawPuyoGL(renderer, cx, cy, CELL * 0.42 * shrink, board[r][c], pulse);

            // Sparkle effect
            if (popPhase < 12) {
              const sparkAlpha = 1 - popPhase / 12;
              const color = COLORS[board[r][c]];
              const pr = parseInt(color.slice(1, 2), 16) * 17;
              const pg = parseInt(color.slice(2, 3), 16) * 17;
              const pb = parseInt(color.slice(3, 4), 16) * 17;
              const sparkColor = `rgba(${pr},${pg},${pb},${sparkAlpha})`;
              renderer.setGlow(color, 0.3 * sparkAlpha);
              const sparkCount = 4;
              for (let s = 0; s < sparkCount; s++) {
                const angle = (popPhase * 0.3) + (s * Math.PI * 2 / sparkCount);
                const dist = popPhase * 2;
                const sx = cx + Math.cos(angle) * dist;
                const sy = cy + Math.sin(angle) * dist;
                renderer.fillRect(sx - 2, sy - 2, 4, 4, sparkColor);
              }
              renderer.setGlow(null);
            }
          } else {
            drawBoardPuyoGL(renderer, r, c, board[r][c]);
          }
        }
      }
    }

    // Current falling pair
    if (currentPair && !animState) {
      const child = getChildPos();

      // Ghost (drop preview)
      let ghostY = pairY;
      while (canPlace(pairX, ghostY + 1, currentPair.rotation)) {
        ghostY++;
      }
      if (ghostY !== pairY) {
        const ghostChild = getChildOffset(currentPair.rotation);
        if (ghostY >= 0 && ghostY < ROWS) {
          drawBoardPuyoGL(renderer, ghostY, pairX, currentPair.pivot, 0.2);
        }
        const gcr = ghostY + ghostChild.dy;
        const gcc = pairX + ghostChild.dx;
        if (gcr >= 0 && gcr < ROWS) {
          drawBoardPuyoGL(renderer, gcr, gcc, currentPair.child, 0.2);
        }
      }

      // Actual pair
      if (pairY >= 0 && pairY < ROWS) {
        drawBoardPuyoGL(renderer, pairY, pairX, currentPair.pivot);
      }
      if (child.y >= 0 && child.y < ROWS) {
        drawBoardPuyoGL(renderer, child.y, child.x, currentPair.child);
      }
    }

    // Chain text display
    if (animState === 'popping' && chainCount >= 2) {
      const scale = 1 + Math.sin(popPhase * 0.5) * 0.1;
      const size = Math.round(36 * scale);
      renderer.setGlow('#c8f', 0.8);
      text.drawText(chainCount + ' CHAIN!', W / 2, H / 2 - 18, size, '#c8f', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
