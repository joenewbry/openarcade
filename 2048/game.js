// 2048/game.js — 2048 game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 480;

// Grid constants
const GRID = 4;
const PAD = 12;
const GAP = 10;
const BOARD_Y = 60;
const BOARD_SIZE = W - PAD * 2;
const CELL = (BOARD_SIZE - GAP * (GRID + 1)) / GRID;

// Tile colors — neon palette on dark background
const TILE_COLORS = {
  2:    { bg: '#1e2a4a', fg: '#8899bb', glow: '#446' },
  4:    { bg: '#1e3050', fg: '#99aacc', glow: '#558' },
  8:    { bg: '#2a2040', fg: '#cc88ff', glow: '#a4f' },
  16:   { bg: '#302050', fg: '#dd77ff', glow: '#b4f' },
  32:   { bg: '#352060', fg: '#ff66cc', glow: '#f4a' },
  64:   { bg: '#402040', fg: '#ff4488', glow: '#f48' },
  128:  { bg: '#403020', fg: '#ffaa44', glow: '#fa4' },
  256:  { bg: '#504020', fg: '#ffcc22', glow: '#fc2' },
  512:  { bg: '#504010', fg: '#ffdd00', glow: '#fd0' },
  1024: { bg: '#553800', fg: '#ffee44', glow: '#fe4' },
  2048: { bg: '#604000', fg: '#ff8844', glow: '#f84' },
  4096: { bg: '#600020', fg: '#ff4466', glow: '#f46' },
  8192: { bg: '#400040', fg: '#ff22ff', glow: '#f2f' },
};

function getTileColor(val) {
  if (TILE_COLORS[val]) return TILE_COLORS[val];
  return { bg: '#500050', fg: '#ff88ff', glow: '#f8f' };
}

// Animation constants (in frames at 60fps)
const ANIM_FRAMES = Math.round(100 * 60 / 1000);   // ~6 frames for 100ms
const SPAWN_FRAMES = Math.round(120 * 60 / 1000);   // ~7 frames for 120ms

// ── State ──
let score, best = 0;
let grid;
let animating;
let animTiles;       // tiles in motion: {fromR, fromC, toR, toC, val, merged}
let animTimer;       // counts up to ANIM_FRAMES
let spawnTile;       // {r, c, val}
let spawnTimer;      // counts up to SPAWN_FRAMES
let spawnPhase;      // false = sliding, true = spawning
let pendingMove;     // direction queued during animation

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function cellX(c) { return PAD + GAP + c * (CELL + GAP); }
function cellY(r) { return BOARD_Y + GAP + r * (CELL + GAP); }

// Ease in-out quad
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return null;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  const val = Math.random() < 0.9 ? 2 : 4;
  grid[cell.r][cell.c] = val;
  return { r: cell.r, c: cell.c, val };
}

function canMove() {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] === 0) return true;
      if (c < GRID - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < GRID - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function slideRow(row) {
  const len = row.length;
  let moves = [];
  let result = [];
  let mergeScore = 0;

  let nonZero = [];
  for (let i = 0; i < len; i++) {
    if (row[i] !== 0) nonZero.push({ val: row[i], origIdx: i });
  }

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i].val === nonZero[i + 1].val) {
      const merged = nonZero[i].val * 2;
      const destIdx = result.length;
      result.push(merged);
      mergeScore += merged;
      moves.push({ fromIdx: nonZero[i].origIdx, toIdx: destIdx, val: nonZero[i].val, merged: true });
      moves.push({ fromIdx: nonZero[i + 1].origIdx, toIdx: destIdx, val: nonZero[i + 1].val, merged: true });
      i += 2;
    } else {
      const destIdx = result.length;
      result.push(nonZero[i].val);
      moves.push({ fromIdx: nonZero[i].origIdx, toIdx: destIdx, val: nonZero[i].val, merged: false });
      i++;
    }
  }

  while (result.length < len) result.push(0);
  return { row: result, mergeScore, moves };
}

function doMove(dir) {
  let totalScore = 0;
  let changed = false;
  let allMoves = [];

  if (dir === 'left') {
    for (let r = 0; r < GRID; r++) {
      const { row, mergeScore, moves } = slideRow(grid[r]);
      moves.forEach(m => {
        if (m.fromIdx !== m.toIdx || m.merged) changed = true;
        allMoves.push({ fromR: r, fromC: m.fromIdx, toR: r, toC: m.toIdx, val: m.val, merged: m.merged });
      });
      totalScore += mergeScore;
      grid[r] = row;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < GRID; r++) {
      const reversed = [...grid[r]].reverse();
      const { row, mergeScore, moves } = slideRow(reversed);
      moves.forEach(m => {
        const fromC = GRID - 1 - m.fromIdx;
        const toC = GRID - 1 - m.toIdx;
        if (fromC !== toC || m.merged) changed = true;
        allMoves.push({ fromR: r, fromC, toR: r, toC, val: m.val, merged: m.merged });
      });
      totalScore += mergeScore;
      grid[r] = row.reverse();
    }
  } else if (dir === 'up') {
    for (let c = 0; c < GRID; c++) {
      const col = [];
      for (let r = 0; r < GRID; r++) col.push(grid[r][c]);
      const { row, mergeScore, moves } = slideRow(col);
      moves.forEach(m => {
        if (m.fromIdx !== m.toIdx || m.merged) changed = true;
        allMoves.push({ fromR: m.fromIdx, fromC: c, toR: m.toIdx, toC: c, val: m.val, merged: m.merged });
      });
      totalScore += mergeScore;
      for (let r = 0; r < GRID; r++) grid[r][c] = row[r];
    }
  } else if (dir === 'down') {
    for (let c = 0; c < GRID; c++) {
      const col = [];
      for (let r = GRID - 1; r >= 0; r--) col.push(grid[r][c]);
      const { row, mergeScore, moves } = slideRow(col);
      moves.forEach(m => {
        const fromR = GRID - 1 - m.fromIdx;
        const toR = GRID - 1 - m.toIdx;
        if (fromR !== toR || m.merged) changed = true;
        allMoves.push({ fromR, fromC: c, toR, toC: c, val: m.val, merged: m.merged });
      });
      totalScore += mergeScore;
      const reversed = row.reverse();
      for (let r = 0; r < GRID; r++) grid[r][c] = reversed[r];
    }
  }

  if (changed) {
    score += totalScore;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
  }

  return { changed, allMoves };
}

function handleMove(dir) {
  if (animating) return;

  const { changed, allMoves } = doMove(dir);
  if (!changed) return;

  // Start slide animation
  animTiles = allMoves;
  animating = true;
  animTimer = 0;
  spawnPhase = false;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    score = 0;
    scoreEl.textContent = '0';
    animating = false;
    animTiles = [];
    animTimer = 0;
    spawnTile = null;
    spawnTimer = 0;
    spawnPhase = false;
    pendingMove = null;

    addRandomTile();
    addRandomTile();

    game.showOverlay('2048', 'Press any arrow key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    const dirMap = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
    };

    // Handle state transitions
    if (game.state === 'waiting') {
      for (const key of Object.keys(dirMap)) {
        if (input.wasPressed(key)) {
          game.setState('playing');
          handleMove(dirMap[key]);
          return;
        }
      }
      if (input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      for (const key of [...Object.keys(dirMap), ' ', 'Enter']) {
        if (input.wasPressed(key)) {
          game.onInit();
          return;
        }
      }
      return;
    }

    // ── Playing state ──

    // Process animation
    if (animating) {
      if (!spawnPhase) {
        // Slide animation
        animTimer++;
        if (animTimer >= ANIM_FRAMES) {
          // Slide done — spawn new tile
          animTiles = [];
          const spawned = addRandomTile();
          if (spawned) {
            spawnTile = { r: spawned.r, c: spawned.c, val: spawned.val };
            spawnTimer = 0;
            spawnPhase = true;
          } else {
            animating = false;
            if (!canMove()) {
              if (score > best) {
                best = score;
                bestEl.textContent = best;
              }
              game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
              game.setState('over');
            }
          }
        }
      } else {
        // Spawn animation
        spawnTimer++;
        if (spawnTimer >= SPAWN_FRAMES) {
          spawnTile = null;
          spawnPhase = false;
          animating = false;
          if (!canMove()) {
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
            game.setState('over');
          }
        }
      }
    }

    // Accept input even during animation — queue it
    if (!animating) {
      for (const key of Object.keys(dirMap)) {
        if (input.wasPressed(key)) {
          handleMove(dirMap[key]);
          break;
        }
      }
    }

    // Expose game data
    window.gameData = {
      grid: grid.map(row => [...row]),
      score,
      gameState: game.state,
    };
  };

  game.onDraw = (renderer, text) => {
    // ── Board background with border ──
    renderer.fillRect(PAD - 1, BOARD_Y - 1, BOARD_SIZE + 2, BOARD_SIZE + GAP + 2, '#1a2a45');
    renderer.fillRect(PAD, BOARD_Y, BOARD_SIZE, BOARD_SIZE + GAP, '#0d1525');

    // Empty cell slots
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        renderer.fillRect(cellX(c), cellY(r), CELL, CELL, '#141e35');
      }
    }

    // ── In-canvas header ──
    renderer.setGlow('#f84', 0.5);
    text.drawText('2048', PAD, 18, 28, '#f84', 'left');
    renderer.setGlow(null);

    text.drawText('SCORE', W - PAD, 12, 16, '#888', 'right');
    text.drawText(String(score), W - PAD, 32, 20, '#f84', 'right');

    // ── Tiles ──
    if (animating && !spawnPhase && animTiles.length > 0) {
      // Slide animation frame
      const t = easeInOutQuad(Math.min(animTimer / ANIM_FRAMES, 1));

      // Track merged destinations
      const mergedAt = {};
      animTiles.forEach(m => {
        if (m.merged) {
          const key = m.toR + ',' + m.toC;
          mergedAt[key] = m.val * 2;
        }
      });

      // Draw moving tiles
      animTiles.forEach(m => {
        const fromX = cellX(m.fromC);
        const fromY = cellY(m.fromR);
        const toX = cellX(m.toC);
        const toY = cellY(m.toR);

        const x = fromX + (toX - fromX) * t;
        const y = fromY + (toY - fromY) * t;

        drawTileGL(renderer, text, x, y, m.val, 1);
      });

      // Merged tiles pop in near end of slide
      if (t >= 0.8) {
        const popT = (t - 0.8) / 0.2;
        const popScale = 1 + 0.15 * Math.sin(popT * Math.PI);
        for (const key in mergedAt) {
          const [r, c] = key.split(',').map(Number);
          drawTileGL(renderer, text, cellX(c), cellY(r), mergedAt[key], popScale);
        }
      }
    } else {
      // Static or spawn phase — draw all tiles from grid
      const spawnProgress = spawnPhase ? Math.min(spawnTimer / SPAWN_FRAMES, 1) : 1;
      // Ease: cubic ease out for spawn
      const spawnEase = spawnPhase ? (1 - Math.pow(1 - spawnProgress, 3)) : 1;

      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (grid[r][c] === 0) continue;

          if (spawnTile && spawnTile.r === r && spawnTile.c === c && spawnPhase) {
            const scale = Math.max(0.01, spawnEase);
            drawTileGL(renderer, text, cellX(c), cellY(r), grid[r][c], scale);
          } else {
            drawTileGL(renderer, text, cellX(c), cellY(r), grid[r][c], 1);
          }
        }
      }
    }
  };

  game.start();
  return game;
}

// Draw a single tile using renderer and text APIs
function drawTileGL(renderer, text, x, y, val, scale) {
  if (val === 0) return;
  scale = scale || 1;

  const tc = getTileColor(val);
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  const sz = CELL * scale;
  const tx = cx - sz / 2;
  const ty = cy - sz / 2;

  // Glow for higher values
  const glowIntensity = Math.min(Math.log2(val) - 1, 11);
  if (glowIntensity > 3) {
    renderer.setGlow(tc.glow, glowIntensity / 11);
  }

  // Border (slightly larger rect behind the tile)
  renderer.fillRect(tx - 1, ty - 1, sz + 2, sz + 2, tc.glow);

  // Tile background
  renderer.fillRect(tx, ty, sz, sz, tc.bg);

  renderer.setGlow(null);

  // Number
  const numStr = String(val);
  let fontSize;
  if (val < 100) fontSize = 32 * scale;
  else if (val < 1000) fontSize = 26 * scale;
  else if (val < 10000) fontSize = 20 * scale;
  else fontSize = 16 * scale;

  // Text glow for higher values
  if (glowIntensity > 2) {
    renderer.setGlow(tc.glow, 0.5);
  }

  // y is top-of-text; offset to visually center in tile
  text.drawText(numStr, cx, cy - fontSize * 0.55, Math.round(fontSize), tc.fg, 'center');

  renderer.setGlow(null);
}
