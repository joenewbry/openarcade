// dr-mario/game.js — Dr. Mario game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

// Grid dimensions: 8 columns x 16 rows
const COLS = 8;
const ROWS = 16;
const CELL = 32;
const W = 280;
const H = 544;

// Offset to center the 8-col grid (256px) in the 280px canvas
const OX = Math.floor((W - COLS * CELL) / 2);
const OY = Math.floor((H - ROWS * CELL) / 2);

const COLORS = ['red', 'yellow', 'blue'];
const COLOR_HEX = { red: '#f44', yellow: '#ff0', blue: '#48f' };
const COLOR_GLOW = { red: '#f00', yellow: '#ff0', blue: '#00f' };
const COLOR_DARK = { red: '#a22', yellow: '#aa0', blue: '#24a' };

// ── State ──
let board;        // ROWS x COLS, each cell: null or { color, type: 'virus'|'pill' }
let pill;         // current falling pill: { cells: [{r,c,color}, {r,c,color}], orientation }
let nextPill;     // preview colors [color, color]
let score, best, level, virusCount, totalViruses;
let dropInterval; // in ms, converted to frames
let dropTimer;    // frame counter for auto-drop
let softDropping;
let clearing, clearCells, clearPhase, clearTimer;
let chainCount;
let levelWon, levelWonTimer;
let gravityTimer, gravityActive;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const virusesEl = document.getElementById('viruses');
const bestEl = document.getElementById('best');

// Next piece preview uses a small 2D canvas (tiny, no perf concern)
const nextCanvas = document.getElementById('nextCanvas');
const nctx = nextCanvas ? nextCanvas.getContext('2d') : null;

// Convert ms interval to frame count at 60fps
function msToFrames(ms) {
  return Math.max(1, Math.round(ms * 60 / 1000));
}

function randomPillColors() {
  return [
    COLORS[Math.floor(Math.random() * 3)],
    COLORS[Math.floor(Math.random() * 3)]
  ];
}

function wouldCreateRun(r, c, color, minLen) {
  let hCount = 1;
  for (let dc = 1; c + dc < COLS && board[r][c + dc] && board[r][c + dc].color === color; dc++) hCount++;
  for (let dc = 1; c - dc >= 0 && board[r][c - dc] && board[r][c - dc].color === color; dc++) hCount++;
  if (hCount >= minLen) return true;

  let vCount = 1;
  for (let dr = 1; r + dr < ROWS && board[r + dr][c] && board[r + dr][c].color === color; dr++) vCount++;
  for (let dr = 1; r - dr >= 0 && board[r - dr][c] && board[r - dr][c].color === color; dr++) vCount++;
  if (vCount >= minLen) return true;

  return false;
}

function isCellOccupied(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return board[r][c] !== null;
}

function canPlace(cells) {
  return cells.every(cell =>
    cell.r >= 0 && cell.r < ROWS &&
    cell.c >= 0 && cell.c < COLS &&
    board[cell.r][cell.c] === null
  );
}

function drawNext() {
  if (!nctx) return;
  nctx.fillStyle = '#16213e';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPill) return;

  const size = 24;
  const gap = 2;
  const totalW = size * 2 + gap;
  const sx = (nextCanvas.width - totalW) / 2;
  const sy = (nextCanvas.height - size) / 2;

  for (let i = 0; i < 2; i++) {
    const hex = COLOR_HEX[nextPill[i]];
    nctx.fillStyle = hex;
    nctx.shadowColor = COLOR_GLOW[nextPill[i]];
    nctx.shadowBlur = 6;
    const x = sx + i * (size + gap);
    const m = 2;
    const r = 4;
    const rx = x + m, ry = sy + m, rw = size - m * 2, rh = size - m * 2;
    const rr = Math.min(r, rw / 2, rh / 2);
    nctx.beginPath();
    nctx.moveTo(rx + rr, ry);
    nctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
    nctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
    nctx.arcTo(rx, ry + rh, rx, ry, rr);
    nctx.arcTo(rx, ry, rx + rw, ry, rr);
    nctx.closePath();
    nctx.fill();
    nctx.shadowBlur = 0;

    // Highlight
    nctx.fillStyle = 'rgba(255,255,255,0.2)';
    nctx.beginPath();
    nctx.moveTo(rx + rr, ry);
    nctx.arcTo(rx + rw, ry, rx + rw, ry + rh * 0.35, rr);
    nctx.lineTo(rx + rw, ry + rh * 0.35);
    nctx.lineTo(rx, ry + rh * 0.35);
    nctx.arcTo(rx, ry, rx + rw, ry, rr);
    nctx.closePath();
    nctx.fill();
  }
}

export function createGame() {
  const game = new Game('game');

  function setupLevel() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    clearing = false;
    clearCells = [];
    clearPhase = 0;
    clearTimer = 0;
    chainCount = 0;
    levelWon = false;
    levelWonTimer = 0;
    gravityActive = false;
    gravityTimer = 0;

    // Place viruses: level 0 = 4 viruses, each subsequent level adds 4, max 84
    totalViruses = Math.min(84, (level + 1) * 4);
    virusCount = totalViruses;

    // Viruses only placed in bottom 12 rows (rows 4-15)
    const virusRows = ROWS - 4;
    let placed = 0;
    let attempts = 0;
    while (placed < totalViruses && attempts < 5000) {
      attempts++;
      const r = 4 + Math.floor(Math.random() * virusRows);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c]) continue;
      const color = COLORS[Math.floor(Math.random() * 3)];
      if (wouldCreateRun(r, c, color, 3)) continue;
      board[r][c] = { color, type: 'virus' };
      placed++;
    }

    virusCount = placed;
    virusesEl.textContent = virusCount;
    levelEl.textContent = level;

    // Speed scales with level
    dropInterval = Math.max(150, 700 - level * 40);

    // Prepare pills
    nextPill = randomPillColors();
    spawnPill();
  }

  function spawnPill() {
    const colors = nextPill;
    nextPill = randomPillColors();
    drawNext();

    const c = 3;
    const r = 0;
    pill = {
      cells: [
        { r: r, c: c, color: colors[0] },
        { r: r, c: c + 1, color: colors[1] }
      ],
      orientation: 0
    };

    // Check if spawn position is blocked
    if (isCellOccupied(pill.cells[0].r, pill.cells[0].c) ||
        isCellOccupied(pill.cells[1].r, pill.cells[1].c)) {
      pill = null;
      game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
    }

    dropTimer = 0;
  }

  function movePill(dr, dc) {
    if (!pill || clearing || gravityActive) return false;
    const newCells = pill.cells.map(cell => ({
      ...cell,
      r: cell.r + dr,
      c: cell.c + dc
    }));
    if (canPlace(newCells)) {
      pill.cells = newCells;
      return true;
    }
    return false;
  }

  function rotatePill() {
    if (!pill || clearing || gravityActive) return;
    const pivot = pill.cells[0];
    let newCells;

    if (pill.orientation === 0) {
      // Horizontal -> Vertical: second cell goes above pivot
      newCells = [
        { ...pivot },
        { r: pivot.r - 1, c: pivot.c, color: pill.cells[1].color }
      ];
      if (canPlace(newCells)) {
        pill.cells = newCells;
        pill.orientation = 1;
        return;
      }
      // If blocked above, try pushing down
      newCells = [
        { r: pivot.r + 1, c: pivot.c, color: pivot.color },
        { r: pivot.r, c: pivot.c, color: pill.cells[1].color }
      ];
      if (canPlace(newCells)) {
        pill.cells = newCells;
        pill.orientation = 1;
        return;
      }
    } else {
      // Vertical -> Horizontal: second cell goes to right of pivot
      newCells = [
        { ...pivot },
        { r: pivot.r, c: pivot.c + 1, color: pill.cells[1].color }
      ];
      if (canPlace(newCells)) {
        pill.cells = newCells;
        pill.orientation = 0;
        return;
      }
      // If blocked right, try shifting left
      newCells = [
        { r: pivot.r, c: pivot.c - 1, color: pivot.color },
        { r: pivot.r, c: pivot.c, color: pill.cells[1].color }
      ];
      if (canPlace(newCells)) {
        pill.cells = newCells;
        pill.orientation = 0;
        return;
      }
    }
  }

  function lockPill() {
    if (!pill) return;
    pill.cells.forEach(cell => {
      if (cell.r >= 0 && cell.r < ROWS && cell.c >= 0 && cell.c < COLS) {
        board[cell.r][cell.c] = { color: cell.color, type: 'pill' };
      }
    });
    pill = null;
    chainCount = 0;
    checkMatches();
  }

  function checkMatches() {
    const toRemove = new Set();

    // Horizontal matches
    for (let r = 0; r < ROWS; r++) {
      let run = [];
      for (let c = 0; c <= COLS; c++) {
        const cell = c < COLS ? board[r][c] : null;
        if (cell && run.length > 0 && cell.color === board[r][run[0]].color) {
          run.push(c);
        } else {
          if (run.length >= 4) {
            run.forEach(cc => toRemove.add(r + ',' + cc));
          }
          run = cell ? [c] : [];
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < COLS; c++) {
      let run = [];
      for (let r = 0; r <= ROWS; r++) {
        const cell = r < ROWS ? board[r][c] : null;
        if (cell && run.length > 0 && cell.color === board[run[0]][c].color) {
          run.push(r);
        } else {
          if (run.length >= 4) {
            run.forEach(rr => toRemove.add(rr + ',' + c));
          }
          run = cell ? [r] : [];
        }
      }
    }

    if (toRemove.size > 0) {
      clearCells = Array.from(toRemove).map(s => {
        const [r, c] = s.split(',').map(Number);
        return { r, c };
      });

      // Count viruses being cleared
      let virusesCleared = 0;
      clearCells.forEach(({ r, c }) => {
        if (board[r][c] && board[r][c].type === 'virus') virusesCleared++;
      });

      // Score: 100 per virus, doubled for each chain step
      if (virusesCleared > 0) {
        const chainMultiplier = Math.pow(2, chainCount);
        score += virusesCleared * 100 * chainMultiplier;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
      }

      virusCount -= virusesCleared;
      virusesEl.textContent = Math.max(0, virusCount);

      // Start clear animation
      clearing = true;
      clearPhase = 0;
      clearTimer = 0;
    } else {
      // No matches, check win or spawn next pill
      if (virusCount <= 0) {
        winLevel();
      } else {
        spawnPill();
      }
    }
  }

  function finishClear() {
    // Remove matched cells
    clearCells.forEach(({ r, c }) => {
      board[r][c] = null;
    });
    clearCells = [];
    clearing = false;
    clearPhase = 0;
    clearTimer = 0;
    chainCount++;

    // Start gravity phase
    gravityActive = true;
    gravityTimer = 0;
  }

  function applyGravity() {
    let moved = false;
    for (let r = ROWS - 2; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] && board[r][c].type === 'pill') {
          if (r + 1 < ROWS && board[r + 1][c] === null) {
            board[r + 1][c] = board[r][c];
            board[r][c] = null;
            moved = true;
          }
        }
      }
    }

    if (!moved) {
      gravityActive = false;
      gravityTimer = 0;
      // After gravity settles, check for new matches (chain)
      checkMatches();
    }
    // If moved, gravity continues on next timer tick
  }

  function winLevel() {
    levelWon = true;
    clearing = false;
    levelWonTimer = 0;
    game.showOverlay('LEVEL CLEAR!', `Score: ${score} -- Next level...`);
  }

  function advanceLevel() {
    game.hideOverlay();
    level++;
    setupLevel();
    drawNext();
  }

  // ── Ghost piece Y calculation ──
  function ghostDrop() {
    if (!pill) return 0;
    let dr = 0;
    while (true) {
      const testCells = pill.cells.map(cell => ({
        ...cell,
        r: cell.r + dr + 1
      }));
      if (!canPlace(testCells)) break;
      dr++;
    }
    return dr;
  }

  // ── Drop frame count ──
  function dropFrames() {
    const interval = softDropping ? 50 : dropInterval;
    return msToFrames(interval);
  }

  // ── Init ──
  game.onInit = () => {
    score = 0;
    best = 0;
    level = 0;
    softDropping = false;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    setupLevel();
    game.showOverlay('DR. MARIO', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ') || input.wasPressed('z') || input.wasPressed('Z')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ') || input.wasPressed('z') || input.wasPressed('Z')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Level won animation
    if (levelWon) {
      levelWonTimer++;
      if (levelWonTimer >= msToFrames(2000)) {
        levelWon = false;
        advanceLevel();
      }
      return;
    }

    // Clear animation phase
    if (clearing) {
      clearTimer++;
      clearPhase++;
      // ~10 frames at 40ms each = ~400ms total, translate to ~24 frames at 60fps
      if (clearTimer >= msToFrames(400)) {
        finishClear();
      }
      return;
    }

    // Gravity phase
    if (gravityActive) {
      gravityTimer++;
      // Apply gravity step every ~4 frames (~60ms equivalent)
      if (gravityTimer >= msToFrames(60)) {
        gravityTimer = 0;
        applyGravity();
      }
      return;
    }

    // No pill means we're in a transition
    if (!pill) return;

    // Input
    if (input.wasPressed('ArrowLeft')) movePill(0, -1);
    if (input.wasPressed('ArrowRight')) movePill(0, 1);
    if (input.wasPressed('ArrowUp') || input.wasPressed('z') || input.wasPressed('Z')) {
      rotatePill();
    }

    // Hard drop
    if (input.wasPressed(' ')) {
      while (movePill(1, 0)) {
        score += 1;
      }
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      lockPill();
      dropTimer = 0;
      return;
    }

    // Soft drop tracking
    softDropping = input.isDown('ArrowDown');

    // Auto-drop timer
    dropTimer++;
    if (dropTimer >= dropFrames()) {
      dropTimer = 0;
      if (!movePill(1, 0)) {
        lockPill();
        return;
      }
      if (softDropping) {
        score += 1;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
      }
    }
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Draw bottle outline
    const bx = OX - 4;
    const by = OY - 4;
    const bw = COLS * CELL + 8;
    const bh = ROWS * CELL + 8;

    // Bottle neck
    const neckW = CELL * 2 + 12;
    const neckH = 16;
    const neckX = OX + (COLS * CELL - neckW) / 2;
    const neckY = by - neckH;

    // Bottle interior fill (darker shade)
    renderer.fillRect(OX, OY, COLS * CELL, ROWS * CELL, 'rgba(10, 10, 30, 0.4)');

    // Bottle body outline with glow
    renderer.setGlow('#f4c', 0.5);
    // Bottom border
    renderer.drawLine(bx, by + bh, bx + bw, by + bh, '#f4c', 2);
    // Left border
    renderer.drawLine(bx, by, bx, by + bh, '#f4c', 2);
    // Right border
    renderer.drawLine(bx + bw, by, bx + bw, by + bh, '#f4c', 2);
    // Top border left side (up to neck)
    renderer.drawLine(bx, by, neckX, by, '#f4c', 2);
    // Top border right side (after neck)
    renderer.drawLine(neckX + neckW, by, bx + bw, by, '#f4c', 2);
    // Neck left wall
    renderer.drawLine(neckX, by, neckX, neckY, '#f4c', 2);
    // Neck right wall
    renderer.drawLine(neckX + neckW, by, neckX + neckW, neckY, '#f4c', 2);
    // Neck top
    renderer.drawLine(neckX, neckY, neckX + neckW, neckY, '#f4c', 2);
    renderer.setGlow(null);

    // Grid lines
    for (let c = 0; c <= COLS; c++) {
      renderer.fillRect(OX + c * CELL, OY, 0.5, ROWS * CELL, '#16213e');
    }
    for (let r = 0; r <= ROWS; r++) {
      renderer.fillRect(OX, OY + r * CELL, COLS * CELL, 0.5, '#16213e');
    }

    // Board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        // Skip cells being cleared (drawn in clear animation)
        if (clearing && clearCells.some(cc => cc.r === r && cc.c === c)) continue;

        const px = OX + c * CELL;
        const py = OY + r * CELL;

        if (cell.type === 'virus') {
          drawVirus(renderer, px, py, cell.color);
        } else {
          drawPillCell(renderer, px, py, cell.color);
        }
      }
    }

    // Active pill
    if (pill && !clearing && !gravityActive) {
      // Ghost piece
      const gDr = ghostDrop();
      if (gDr > 0) {
        pill.cells.forEach(cell => {
          if (cell.r + gDr < 0) return;
          const px = OX + cell.c * CELL;
          const py = OY + (cell.r + gDr) * CELL;
          const m = 2;
          renderer.fillRect(px + m, py + m, CELL - m * 2, CELL - m * 2, 'rgba(255,255,255,0.12)');
        });
      }

      // Active pill cells
      pill.cells.forEach(cell => {
        if (cell.r < 0) return;
        const px = OX + cell.c * CELL;
        const py = OY + cell.r * CELL;
        drawPillCell(renderer, px, py, cell.color);
      });
    }

    // Clear animation
    if (clearing && clearCells.length > 0) {
      const pulse = Math.sin(clearPhase * 0.8) * 0.5 + 0.5;
      renderer.setGlow('#fff', pulse * 0.8);
      clearCells.forEach(({ r, c }) => {
        const px = OX + c * CELL;
        const py = OY + r * CELL;
        renderer.fillRect(px + 1, py + 1, CELL - 2, CELL - 2, `rgba(255, 255, 255, ${pulse * 0.9})`);
      });
      renderer.setGlow(null);
    }
  };

  // ── Drawing helpers ──
  function drawVirus(renderer, px, py, color) {
    const cx = px + CELL / 2;
    const cy = py + CELL / 2;
    const hex = COLOR_HEX[color];

    // Body with glow
    renderer.setGlow(COLOR_GLOW[color], 0.6);
    renderer.fillCircle(cx, cy, CELL * 0.35, hex);
    renderer.setGlow(null);

    // Spiky arms (4 lines)
    const armLen = CELL * 0.2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x1 = cx + Math.cos(angle) * CELL * 0.3;
      const y1 = cy + Math.sin(angle) * CELL * 0.3;
      const x2 = cx + Math.cos(angle) * (CELL * 0.3 + armLen);
      const y2 = cy + Math.sin(angle) * (CELL * 0.3 + armLen);
      renderer.drawLine(x1, y1, x2, y2, hex, 2);
    }

    // Eyes
    renderer.fillCircle(cx - 4, cy - 2, 2.5, '#1a1a2e');
    renderer.fillCircle(cx + 4, cy - 2, 2.5, '#1a1a2e');

    // Pupils
    renderer.fillCircle(cx - 3.5, cy - 2, 1, '#fff');
    renderer.fillCircle(cx + 4.5, cy - 2, 1, '#fff');

    // Mouth (approximate arc with small line segments)
    const mouthCx = cx;
    const mouthCy = cy + 4;
    const mouthR = 4;
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI;
      const a2 = ((i + 1) / segments) * Math.PI;
      renderer.drawLine(
        mouthCx + Math.cos(a1) * mouthR, mouthCy + Math.sin(a1) * mouthR,
        mouthCx + Math.cos(a2) * mouthR, mouthCy + Math.sin(a2) * mouthR,
        '#1a1a2e', 1.5
      );
    }
  }

  function drawPillCell(renderer, px, py, color) {
    const hex = COLOR_HEX[color];
    const m = 2;

    // Pill body with glow
    renderer.setGlow(COLOR_GLOW[color], 0.4);
    renderer.fillRect(px + m, py + m, CELL - m * 2, CELL - m * 2, hex);
    renderer.setGlow(null);

    // Highlight on top
    renderer.fillRect(px + m, py + m, CELL - m * 2, (CELL - m * 2) * 0.35, 'rgba(255,255,255,0.2)');
  }

  game.start();
  return game;
}
