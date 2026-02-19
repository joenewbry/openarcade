// lights-out/game.js — Lights Out game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 440;

// Grid constants
const GRID = 5;
const CELL = 60;
const GAP = 8;
const GRID_SIZE = GRID * CELL + (GRID - 1) * GAP; // 332
const GRID_X = Math.floor((W - GRID_SIZE) / 2);
const INFO_H = 50;
const GRID_Y = INFO_H + Math.floor((H - INFO_H - GRID_SIZE) / 2);

// Theme colors
const THEME = '#4fc';
const THEME_DIM = '#1a3a30';

// ── State ──
let score, best = 0;
let grid = [];       // 5x5 array, true = light ON
let level = 1;
let clicks = 0;
let totalClicks = 0;
let hoverR = -1, hoverC = -1;

// Timers (frame-based)
let solvedDelayFrames = 0;   // countdown for level-complete delay
let gameOverDelayFrames = 0; // countdown for game-over delay

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Puzzle generation ──

function generatePuzzle(numToggles) {
  grid = [];
  for (let r = 0; r < GRID; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID; c++) {
      grid[r][c] = false;
    }
  }
  let toggledCells = new Set();
  let attempts = 0;
  while (toggledCells.size < numToggles && attempts < numToggles * 10) {
    const r = Math.floor(Math.random() * GRID);
    const c = Math.floor(Math.random() * GRID);
    const key = r * GRID + c;
    if (!toggledCells.has(key)) {
      toggledCells.add(key);
      toggleCell(r, c);
    }
    attempts++;
  }
  // Make sure at least one light is on
  let anyOn = false;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c]) { anyOn = true; break; }
    }
    if (anyOn) break;
  }
  if (!anyOn) {
    const cr = Math.floor(GRID / 2);
    toggleCell(cr, cr);
  }
}

function toggleCell(r, c) {
  grid[r][c] = !grid[r][c];
  if (r > 0) grid[r - 1][c] = !grid[r - 1][c];
  if (r < GRID - 1) grid[r + 1][c] = !grid[r + 1][c];
  if (c > 0) grid[r][c - 1] = !grid[r][c - 1];
  if (c < GRID - 1) grid[r][c + 1] = !grid[r][c + 1];
}

function isSolved() {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c]) return false;
    }
  }
  return true;
}

function countLightsOn() {
  let count = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c]) count++;
    }
  }
  return count;
}

function getTogglesForLevel(lvl) {
  return Math.min(2 + lvl, 15);
}

function getMaxClicks(lvl) {
  const toggles = getTogglesForLevel(lvl);
  return Math.max(toggles * 3, 15);
}

// Convert canvas pixel coords to grid row/col
function pixelToGrid(px, py) {
  const gx = px - GRID_X;
  const gy = py - GRID_Y;
  if (gx < 0 || gy < 0) return { r: -1, c: -1 };
  const c = Math.floor(gx / (CELL + GAP));
  const r = Math.floor(gy / (CELL + GAP));
  if (r < 0 || r >= GRID || c < 0 || c >= GRID) return { r: -1, c: -1 };
  const cellX = gx - c * (CELL + GAP);
  const cellY = gy - r * (CELL + GAP);
  if (cellX > CELL || cellY > CELL) return { r: -1, c: -1 };
  return { r, c };
}

function levelComplete(game) {
  let levelScore = level * 1000 - clicks * 50;
  if (levelScore < level * 100) levelScore = level * 100;
  score += levelScore;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  level++;
  totalClicks += clicks;
  clicks = 0;
  generatePuzzle(getTogglesForLevel(level));
}

function handleGridClick(r, c, game) {
  if (r < 0 || c < 0) return;
  clicks++;
  totalClicks++;
  toggleCell(r, c);

  // Update running score display
  let runningScore = score + Math.max(level * 1000 - clicks * 50, level * 100);
  scoreEl.textContent = runningScore;

  if (isSolved()) {
    // Delay before moving to next level (~400ms at 60fps = 24 frames)
    solvedDelayFrames = 24;
  } else if (clicks >= getMaxClicks(level)) {
    // Delay before game over (~200ms at 60fps = 12 frames)
    gameOverDelayFrames = 12;
  }
}

// ── Mouse handling ──

function setupMouse(canvas, game) {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const { r, c } = pixelToGrid(x, y);
    if (r !== hoverR || c !== hoverC) {
      hoverR = r;
      hoverC = c;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverR = -1;
    hoverC = -1;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);

    if (game.state === 'waiting') {
      game.setState('playing');
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    if (game.state === 'playing') {
      const { r, c } = pixelToGrid(x, y);
      handleGridClick(r, c, game);
    }
  });
}

// ── Draw helper: stroke a rectangle using drawLine ──

function strokeRect(renderer, x, y, w, h, color, lineWidth) {
  renderer.drawLine(x, y, x + w, y, color, lineWidth);
  renderer.drawLine(x + w, y, x + w, y + h, color, lineWidth);
  renderer.drawLine(x + w, y + h, x, y + h, color, lineWidth);
  renderer.drawLine(x, y + h, x, y, color, lineWidth);
}

// ── Create game ──

export function createGame() {
  const game = new Game('game');

  setupMouse(game.canvas, game);

  game.onInit = () => {
    score = 0;
    totalClicks = 0;
    level = 1;
    clicks = 0;
    solvedDelayFrames = 0;
    gameOverDelayFrames = 0;
    hoverR = -1;
    hoverC = -1;
    scoreEl.textContent = '0';
    generatePuzzle(getTogglesForLevel(level));
    game.showOverlay('LIGHTS OUT', 'Click or press SPACE to start');
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
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Handle delayed level complete
    if (solvedDelayFrames > 0) {
      solvedDelayFrames--;
      if (solvedDelayFrames === 0) {
        levelComplete(game);
      }
      return;
    }

    // Handle delayed game over
    if (gameOverDelayFrames > 0) {
      gameOverDelayFrames--;
      if (gameOverDelayFrames === 0) {
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        game.showOverlay('GAME OVER', 'Level ' + level + ' -- Score: ' + score + '  Click or press any key to restart');
        game.setState('over');
      }
      return;
    }
  };

  game.onDraw = (renderer, text) => {
    // Draw info bar at top
    // Level (left)
    text.drawText('Level ' + level, GRID_X, 8, 16, THEME, 'left');

    // Lights remaining (center)
    const lightsOn = countLightsOn();
    const lightsColor = lightsOn === 0 ? '#4f4' : '#aaa';
    text.drawText(lightsOn + ' lights', W / 2, 8, 16, lightsColor, 'center');

    // Clicks / max clicks (right)
    const maxClicks = getMaxClicks(level);
    const remaining = maxClicks - clicks;
    let clicksColor = '#aaa';
    if (game.state === 'playing') {
      if (remaining <= 3 && remaining > 0) {
        clicksColor = '#f44';
      } else if (remaining <= 6) {
        clicksColor = '#f80';
      }
    }
    text.drawText(clicks + '/' + maxClicks, GRID_X + GRID_SIZE, 8, 16, clicksColor, 'right');

    // Draw grid cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = GRID_X + c * (CELL + GAP);
        const y = GRID_Y + r * (CELL + GAP);
        const isOn = grid[r][c];
        const isHover = (r === hoverR && c === hoverC && game.state === 'playing');

        if (isOn) {
          // Lit cell with glow
          renderer.setGlow(THEME, 0.8);
          renderer.fillRect(x, y, CELL, CELL, THEME);
          renderer.setGlow(null);

          // Inner bright center
          renderer.fillRect(x + 8, y + 8, CELL - 16, CELL - 16, 'rgba(255, 255, 255, 0.3)');
        } else {
          // Dark cell
          renderer.fillRect(x, y, CELL, CELL, THEME_DIM);

          // Subtle border
          strokeRect(renderer, x + 0.5, y + 0.5, CELL - 1, CELL - 1, '#0f3460', 1);
        }

        // Hover highlight
        if (isHover) {
          strokeRect(renderer, x - 1, y - 1, CELL + 2, CELL + 2, 'rgba(68, 255, 204, 0.6)', 2);

          // Also highlight neighbors
          const neighbors = [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
          ];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
              const nx = GRID_X + nc * (CELL + GAP);
              const ny = GRID_Y + nr * (CELL + GAP);
              strokeRect(renderer, nx - 1, ny - 1, CELL + 2, CELL + 2, 'rgba(68, 255, 204, 0.3)', 1);
            }
          }
        }
      }
    }

    // Grid border
    strokeRect(renderer, GRID_X - 6, GRID_Y - 6, GRID_SIZE + 12, GRID_SIZE + 12, '#0f3460', 1);
  };

  // Expose game data for ML training
  window.gameData = {
    get grid() { return grid; },
    get level() { return level; },
    get clicks() { return clicks; },
    get lightsOn() { return countLightsOn(); }
  };

  game.start();
  return game;
}
