// klotski/game.js — Klotski sliding puzzle as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 500;

// Grid: 4 columns x 5 rows
const COLS = 4, ROWS = 5;
const PAD = 20;
const GAP = 4;
const CELL = (W - 2 * PAD - (COLS - 1) * GAP) / COLS;
const GRID_X = PAD;
const GRID_Y = PAD;
const GRID_W = COLS * CELL + (COLS - 1) * GAP;
const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

// Block colors (neon palette)
const COLORS = {
  king:  { fill: '#f44', glow: '#f44', label: 'CAO' },
  vert:  { fill: '#4af', glow: '#4af', label: '' },
  horiz: { fill: '#4f4', glow: '#4f4', label: '' },
  small: { fill: '#fa0', glow: '#fa0', label: '' },
};

// Puzzle configurations
const PUZZLES = [
  {
    name: 'Heng Dao Li Ma',
    blocks: [
      { type: 'king',  col: 1, row: 0, w: 2, h: 2 },
      { type: 'vert',  col: 0, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 0, w: 1, h: 2 },
      { type: 'horiz', col: 1, row: 2, w: 2, h: 1 },
      { type: 'vert',  col: 0, row: 2, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 2, w: 1, h: 2 },
      { type: 'small', col: 1, row: 3, w: 1, h: 1 },
      { type: 'small', col: 2, row: 3, w: 1, h: 1 },
      { type: 'small', col: 1, row: 4, w: 1, h: 1 },
      { type: 'small', col: 2, row: 4, w: 1, h: 1 },
    ]
  },
  {
    name: 'Guard the Pass',
    blocks: [
      { type: 'king',  col: 1, row: 0, w: 2, h: 2 },
      { type: 'vert',  col: 0, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 0, row: 2, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 2, w: 1, h: 2 },
      { type: 'horiz', col: 1, row: 2, w: 2, h: 1 },
      { type: 'small', col: 0, row: 4, w: 1, h: 1 },
      { type: 'small', col: 1, row: 3, w: 1, h: 1 },
      { type: 'small', col: 2, row: 3, w: 1, h: 1 },
      { type: 'small', col: 3, row: 4, w: 1, h: 1 },
    ]
  },
  {
    name: 'Soldiers at the Gate',
    blocks: [
      { type: 'king',  col: 1, row: 0, w: 2, h: 2 },
      { type: 'vert',  col: 0, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 0, w: 1, h: 2 },
      { type: 'horiz', col: 1, row: 2, w: 2, h: 1 },
      { type: 'small', col: 0, row: 2, w: 1, h: 1 },
      { type: 'small', col: 3, row: 2, w: 1, h: 1 },
      { type: 'small', col: 0, row: 3, w: 1, h: 1 },
      { type: 'small', col: 1, row: 3, w: 1, h: 1 },
      { type: 'small', col: 2, row: 3, w: 1, h: 1 },
      { type: 'small', col: 3, row: 3, w: 1, h: 1 },
      { type: 'small', col: 1, row: 4, w: 1, h: 1 },
      { type: 'small', col: 2, row: 4, w: 1, h: 1 },
    ]
  },
  {
    name: 'Near the End',
    blocks: [
      { type: 'king',  col: 1, row: 0, w: 2, h: 2 },
      { type: 'vert',  col: 0, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 0, w: 1, h: 2 },
      { type: 'horiz', col: 0, row: 2, w: 2, h: 1 },
      { type: 'horiz', col: 2, row: 2, w: 2, h: 1 },
      { type: 'vert',  col: 0, row: 3, w: 1, h: 2 },
      { type: 'small', col: 1, row: 3, w: 1, h: 1 },
      { type: 'small', col: 2, row: 3, w: 1, h: 1 },
      { type: 'vert',  col: 3, row: 3, w: 1, h: 2 },
    ]
  },
  {
    name: 'Four Generals',
    blocks: [
      { type: 'king',  col: 1, row: 0, w: 2, h: 2 },
      { type: 'vert',  col: 0, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 0, w: 1, h: 2 },
      { type: 'vert',  col: 0, row: 2, w: 1, h: 2 },
      { type: 'vert',  col: 3, row: 2, w: 1, h: 2 },
      { type: 'small', col: 1, row: 2, w: 1, h: 1 },
      { type: 'small', col: 2, row: 2, w: 1, h: 1 },
      { type: 'small', col: 1, row: 3, w: 1, h: 1 },
      { type: 'small', col: 2, row: 3, w: 1, h: 1 },
      { type: 'small', col: 1, row: 4, w: 1, h: 1 },
      { type: 'small', col: 2, row: 4, w: 1, h: 1 },
    ]
  },
];

// ── State ──
let score, best, blocks, selectedIdx, currentLevel;
let grid;
let celebrateTimer, celebrateParticles;
let isDragging, mouseDownX, mouseDownY, mouseDownBlockIdx;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Grid helpers ──

function buildGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = -1;
    }
  }
  blocks.forEach((b, i) => {
    for (let dr = 0; dr < b.h; dr++) {
      for (let dc = 0; dc < b.w; dc++) {
        grid[b.row + dr][b.col + dc] = i;
      }
    }
  });
}

function cellToPixel(col, row) {
  return {
    x: GRID_X + col * (CELL + GAP),
    y: GRID_Y + row * (CELL + GAP)
  };
}

function pixelToCell(px, py) {
  const col = Math.floor((px - GRID_X) / (CELL + GAP));
  const row = Math.floor((py - GRID_Y) / (CELL + GAP));
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}

function canMove(blockIdx, dc, dr) {
  const b = blocks[blockIdx];
  const newCol = b.col + dc;
  const newRow = b.row + dr;
  if (newCol < 0 || newCol + b.w > COLS) return false;
  if (newRow < 0 || newRow + b.h > ROWS) return false;
  for (let r = 0; r < b.h; r++) {
    for (let c = 0; c < b.w; c++) {
      const tr = newRow + r;
      const tc = newCol + c;
      if (grid[tr][tc] !== -1 && grid[tr][tc] !== blockIdx) return false;
    }
  }
  return true;
}

function moveBlock(blockIdx, dc, dr) {
  const b = blocks[blockIdx];
  for (let r = 0; r < b.h; r++) {
    for (let c = 0; c < b.w; c++) {
      grid[b.row + r][b.col + c] = -1;
    }
  }
  b.col += dc;
  b.row += dr;
  for (let r = 0; r < b.h; r++) {
    for (let c = 0; c < b.w; c++) {
      grid[b.row + r][b.col + c] = blockIdx;
    }
  }
  score++;
  scoreEl.textContent = score;
}

function checkWin() {
  const king = blocks[0];
  return king.col === 1 && king.row === 3;
}

function initLevel(levelIdx) {
  currentLevel = levelIdx % PUZZLES.length;
  const puzzle = PUZZLES[currentLevel];
  blocks = puzzle.blocks.map(b => ({ ...b }));
  selectedIdx = -1;
  isDragging = false;
  buildGrid();
}

function getBlockAtPixel(px, py) {
  const cell = pixelToCell(px, py);
  if (!cell) return -1;
  return grid[cell.row][cell.col];
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // Mouse handling — raw DOM events on canvas
  canvas.addEventListener('mousedown', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const idx = getBlockAtPixel(mx, my);
    if (idx >= 0) {
      selectedIdx = idx;
      mouseDownX = mx;
      mouseDownY = my;
      mouseDownBlockIdx = idx;
      isDragging = true;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    const dx = mx - mouseDownX;
    const dy = my - mouseDownY;
    const threshold = CELL * 0.4;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let dc = 0, dr = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dc = dx > 0 ? 1 : -1;
      } else {
        dr = dy > 0 ? 1 : -1;
      }
      if (canMove(mouseDownBlockIdx, dc, dr)) {
        moveBlock(mouseDownBlockIdx, dc, dr);
        mouseDownX = mx;
        mouseDownY = my;
        if (checkWin()) {
          triggerWin(game);
          return;
        }
      }
    }
  });

  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });

  // Touch handling
  canvas.addEventListener('touchstart', (e) => {
    if (game.state !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = (touch.clientX - rect.left) * (W / rect.width);
    const my = (touch.clientY - rect.top) * (H / rect.height);
    const idx = getBlockAtPixel(mx, my);
    if (idx >= 0) {
      selectedIdx = idx;
      mouseDownX = mx;
      mouseDownY = my;
      mouseDownBlockIdx = idx;
      isDragging = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDragging || game.state !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = (touch.clientX - rect.left) * (W / rect.width);
    const my = (touch.clientY - rect.top) * (H / rect.height);

    const dx = mx - mouseDownX;
    const dy = my - mouseDownY;
    const threshold = CELL * 0.4;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let dc = 0, dr = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dc = dx > 0 ? 1 : -1;
      } else {
        dr = dy > 0 ? 1 : -1;
      }
      if (canMove(mouseDownBlockIdx, dc, dr)) {
        moveBlock(mouseDownBlockIdx, dc, dr);
        mouseDownX = mx;
        mouseDownY = my;
        if (checkWin()) {
          triggerWin(game);
          return;
        }
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => { isDragging = false; });
  canvas.addEventListener('touchcancel', () => { isDragging = false; });

  function triggerWin(game) {
    if (best === null || score < best) {
      best = score;
      bestEl.textContent = best;
    }
    celebrateTimer = 180;
    celebrateParticles = [];
    for (let i = 0; i < 60; i++) {
      celebrateParticles.push({
        x: W / 2,
        y: H / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 3,
        life: 60 + Math.random() * 120,
        color: ['#f8c', '#f44', '#4af', '#4f4', '#fa0', '#ff0'][Math.floor(Math.random() * 6)],
        size: 3 + Math.random() * 5
      });
    }
    game.setState('over');
  }

  // ── Init ──
  game.onInit = () => {
    score = 0;
    best = null;
    currentLevel = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = '-';
    celebrateTimer = 0;
    celebrateParticles = [];
    initLevel(currentLevel);
    game.showOverlay('KLOTSKI', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Tick celebration
      if (celebrateTimer > 0) {
        celebrateTimer--;
        // Update particles
        celebrateParticles.forEach(p => {
          if (p.life <= 0) return;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1;
          p.life--;
        });
        if (celebrateTimer === 0) {
          const nextLvl = (currentLevel + 1) % PUZZLES.length;
          game.showOverlay('PUZZLE SOLVED!', `Solved in ${score} moves! Press SPACE for next puzzle`);
        }
      }
      if (celebrateTimer === 0 && input.wasPressed(' ')) {
        currentLevel = (currentLevel + 1) % PUZZLES.length;
        score = 0;
        scoreEl.textContent = '0';
        celebrateTimer = 0;
        celebrateParticles = [];
        initLevel(currentLevel);
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    // ── Playing state — keyboard controls ──

    // Tab to cycle selection
    if (input.wasPressed('Tab')) {
      selectedIdx = (selectedIdx + 1) % blocks.length;
      return;
    }

    if (selectedIdx < 0) return;

    let dc = 0, dr = 0;
    if (input.wasPressed('ArrowLeft')) dc = -1;
    else if (input.wasPressed('ArrowRight')) dc = 1;
    else if (input.wasPressed('ArrowUp')) dr = -1;
    else if (input.wasPressed('ArrowDown')) dr = 1;
    else return;

    if (dc !== 0 || dr !== 0) {
      if (canMove(selectedIdx, dc, dr)) {
        moveBlock(selectedIdx, dc, dr);
        if (checkWin()) {
          triggerWin(game);
        }
      }
    }
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Grid background
    renderer.fillRect(GRID_X - 2, GRID_Y - 2, GRID_W + 4, GRID_H + 4, '#16213e');

    // Grid cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos = cellToPixel(c, r);
        renderer.fillRect(pos.x, pos.y, CELL, CELL, '#111828');
      }
    }

    // Exit indicator at bottom center
    const exitLeft = cellToPixel(1, ROWS - 1);
    const exitRight = cellToPixel(2, ROWS - 1);
    const exitY = exitLeft.y + CELL;

    // Exit dashed line
    renderer.setGlow('#f8c', 0.4);
    renderer.dashedLine(exitLeft.x, exitY + 2, exitRight.x + CELL, exitY + 2, '#f8c', 2, 4, 4);
    renderer.setGlow(null);

    // Exit text
    text.drawText('\u25BC EXIT \u25BC', GRID_X + GRID_W / 2, exitY + 8, 18, '#f8c', 'center');

    // Draw blocks
    blocks.forEach((b, i) => {
      const pos = cellToPixel(b.col, b.row);
      const bw = b.w * CELL + (b.w - 1) * GAP;
      const bh = b.h * CELL + (b.h - 1) * GAP;
      const colorInfo = COLORS[b.type];
      const isSelected = (i === selectedIdx);

      // Block glow
      if (isSelected) {
        renderer.setGlow('#fff', 0.8);
      } else {
        renderer.setGlow(colorInfo.glow, 0.5);
      }

      // Block body (filled rect)
      renderer.fillRect(pos.x, pos.y, bw, bh, colorInfo.fill);

      // Inner highlight (top third, semi-transparent)
      renderer.setGlow(null);
      renderer.fillRect(pos.x + 3, pos.y + 3, bw - 6, bh / 3, 'rgba(255,255,255,0.12)');

      // Selection border
      if (isSelected) {
        renderer.setGlow('#fff', 0.7);
        // Draw border as four thin rects
        const bdr = 3;
        renderer.fillRect(pos.x, pos.y, bw, bdr, '#fff');             // top
        renderer.fillRect(pos.x, pos.y + bh - bdr, bw, bdr, '#fff');  // bottom
        renderer.fillRect(pos.x, pos.y, bdr, bh, '#fff');             // left
        renderer.fillRect(pos.x + bw - bdr, pos.y, bdr, bh, '#fff');  // right
        renderer.setGlow(null);
      }

      // Label for king block
      if (b.type === 'king') {
        renderer.setGlow('#f44', 0.5);
        text.drawText('CAO', pos.x + bw / 2, pos.y + bh / 2 - 12, 22, '#fff', 'center');
        text.drawText('CAO', pos.x + bw / 2, pos.y + bh / 2 + 12, 22, '#fff', 'center');
        renderer.setGlow(null);
      }
    });

    // HUD: level info
    const infoY = GRID_Y + GRID_H + 40;
    text.drawText(`Level ${currentLevel + 1}: ${PUZZLES[currentLevel].name}`, W / 2, infoY, 14, '#888', 'center');

    if (game.state === 'playing') {
      text.drawText('Click a block, then use arrow keys to slide', W / 2, infoY + 22, 12, '#555', 'center');
      text.drawText('Or click and drag blocks to move them', W / 2, infoY + 38, 12, '#555', 'center');
    }

    // Celebration particles
    if (game.state === 'over' && celebrateTimer > 0) {
      celebrateParticles.forEach(p => {
        if (p.life <= 0) return;
        const alpha = Math.min(1, p.life / 30);
        // Use fillCircle with glow for particles
        renderer.setGlow(p.color, 0.6);
        renderer.fillCircle(p.x, p.y, p.size, p.color);
      });
      renderer.setGlow(null);

      // "SOLVED!" text
      renderer.setGlow('#f8c', 0.8);
      text.drawText('SOLVED!', W / 2, H / 2, 36, '#f8c', 'center');
      renderer.setGlow(null);
    }
  };

  // Expose game data for ML
  window.gameData = {
    get blocks() { return blocks; },
    get grid() { return grid; },
    get selectedIdx() { return selectedIdx; },
    get level() { return currentLevel; }
  };

  game.start();
  return game;
}
