// sokoban/game.js — Sokoban puzzle game as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 400;

// Cell types
const FLOOR = 0;
const WALL = 1;
const TARGET = 2;
const BOX = 3;
const BOX_ON_TARGET = 4;
const PLAYER = 5;
const PLAYER_ON_TARGET = 6;

// Sokoban level format:
// # = wall, @ = player, $ = box, . = target, * = box on target, + = player on target, space = floor
const LEVELS = [
  // Level 1 - Tutorial (1 box, 4 moves)
  [
    '#####',
    '#   #',
    '#@$ #',
    '#  .#',
    '#####'
  ],
  // Level 2 - Two boxes (8 moves)
  [
    '#####',
    '#  .#',
    '# $ #',
    '#@$ #',
    '#  .#',
    '#####'
  ],
  // Level 3 - Two boxes with wall (11 moves)
  [
    '######',
    '#    #',
    '# @$ #',
    '# #  #',
    '# .$.#',
    '#    #',
    '######'
  ],
  // Level 4 - Two boxes, planning needed (16 moves)
  [
    '######',
    '#    #',
    '# #@ #',
    '# $* #',
    '# .* #',
    '#    #',
    '######'
  ],
  // Level 5 - Three boxes (9 moves)
  [
    '#######',
    '#  . .#',
    '#  $$ #',
    '## @# #',
    ' # $  #',
    ' # .  #',
    ' ######'
  ],
  // Level 6 - Three boxes corridor (9 moves)
  [
    '#######',
    '#     #',
    '#.$ # #',
    '#.$ @ #',
    '#.$   #',
    '#   ###',
    '#####  '
  ],
  // Level 7 - Three boxes winding (52 moves)
  [
    '  ##### ',
    '  #   # ',
    '###$# ##',
    '# $  . #',
    '#   .# #',
    '##$#.  #',
    ' # @ ###',
    ' #   #  ',
    ' #####  '
  ],
  // Level 8 - Microban classic (33 moves)
  [
    '####  ',
    '# .#  ',
    '#  ###',
    '#*@  #',
    '#  $ #',
    '#  ###',
    '####  '
  ],
  // Level 9 - Five boxes (37 moves)
  [
    '  ##### ',
    '###   # ',
    '#.$ $ ##',
    '# .#$  #',
    '#. @ $ #',
    '##  .  #',
    ' ######'
  ],
  // Level 10 - The challenge (44 moves)
  [
    '########',
    '#   #  #',
    '# $  $ #',
    '## .#  #',
    ' #.@.$ #',
    ' # .#$ #',
    ' #     #',
    ' #######'
  ]
];

// ── State ──
let score, best, currentLevel;
let grid, playerR, playerC;
let moves, totalMoves, levelsCompleted;
let history;
let levelTransition;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelNumEl = document.getElementById('levelNum');
const moveCountEl = document.getElementById('moveCount');

// ── Level parsing ──

function parseLevel(levelData) {
  const rows = levelData.length;
  let maxCols = 0;
  for (let r = 0; r < rows; r++) {
    if (levelData[r].length > maxCols) maxCols = levelData[r].length;
  }
  grid = [];
  playerR = -1;
  playerC = -1;
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < maxCols; c++) {
      const ch = c < levelData[r].length ? levelData[r][c] : ' ';
      switch (ch) {
        case '#': grid[r][c] = WALL; break;
        case '$': grid[r][c] = BOX; break;
        case '.': grid[r][c] = TARGET; break;
        case '*': grid[r][c] = BOX_ON_TARGET; break;
        case '@': grid[r][c] = PLAYER; playerR = r; playerC = c; break;
        case '+': grid[r][c] = PLAYER_ON_TARGET; playerR = r; playerC = c; break;
        default:  grid[r][c] = FLOOR; break;
      }
    }
  }
  moves = 0;
  history = [];
}

function loadLevel(n) {
  currentLevel = n;
  parseLevel(LEVELS[n]);
  levelNumEl.textContent = n + 1;
  moveCountEl.textContent = '0';
}

// ── Win check ──

function checkWin() {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === TARGET || grid[r][c] === PLAYER_ON_TARGET) {
        return false;
      }
    }
  }
  return true;
}

// ── Movement ──

function tryMove(dr, dc, game) {
  if (game.state !== 'playing' || levelTransition) return;

  const newR = playerR + dr;
  const newC = playerC + dc;

  if (newR < 0 || newR >= grid.length || newC < 0 || newC >= grid[newR].length) return;

  const target = grid[newR][newC];

  if (target === WALL) return;

  // Box or box on target - try to push
  if (target === BOX || target === BOX_ON_TARGET) {
    const behindR = newR + dr;
    const behindC = newC + dc;

    if (behindR < 0 || behindR >= grid.length || behindC < 0 || behindC >= grid[behindR].length) return;

    const behind = grid[behindR][behindC];
    if (behind !== FLOOR && behind !== TARGET) return;

    // Save state for undo
    history.push({
      playerR: playerR,
      playerC: playerC,
      grid: grid.map(row => row.slice()),
      moves: moves
    });

    // Move box
    grid[behindR][behindC] = (behind === TARGET) ? BOX_ON_TARGET : BOX;
    // Move player to where box was
    grid[newR][newC] = (target === BOX_ON_TARGET) ? PLAYER_ON_TARGET : PLAYER;
    // Clear old player position
    grid[playerR][playerC] = (grid[playerR][playerC] === PLAYER_ON_TARGET) ? TARGET : FLOOR;

    playerR = newR;
    playerC = newC;
    moves++;
    moveCountEl.textContent = moves;

    if (checkWin()) {
      levelComplete(game);
    }
    return;
  }

  // Floor or target - just move
  if (target === FLOOR || target === TARGET) {
    history.push({
      playerR: playerR,
      playerC: playerC,
      grid: grid.map(row => row.slice()),
      moves: moves
    });

    grid[newR][newC] = (target === TARGET) ? PLAYER_ON_TARGET : PLAYER;
    grid[playerR][playerC] = (grid[playerR][playerC] === PLAYER_ON_TARGET) ? TARGET : FLOOR;

    playerR = newR;
    playerC = newC;
    moves++;
    moveCountEl.textContent = moves;
  }
}

function undo() {
  if (history.length === 0) return;
  const state = history.pop();
  grid = state.grid;
  playerR = state.playerR;
  playerC = state.playerC;
  moves = state.moves;
  moveCountEl.textContent = moves;
}

function resetLevel() {
  loadLevel(currentLevel);
}

function levelComplete(game) {
  levelsCompleted++;
  const bonus = Math.max(10, 1000 - moves * 5);
  score += bonus;
  totalMoves += moves;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  if (currentLevel + 1 < LEVELS.length) {
    game.showOverlay('LEVEL ' + (currentLevel + 1) + ' CLEAR!', 'Moves: ' + moves + ' | Bonus: +' + bonus + ' -- Press any key for next level');
    levelTransition = true;
  } else {
    game.showOverlay('GAME OVER', 'All levels complete! Score: ' + score + ' -- Press any key to restart');
    game.setState('over');
  }
}

function nextLevel(game) {
  levelTransition = false;
  loadLevel(currentLevel + 1);
  game.hideOverlay();
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    totalMoves = 0;
    levelsCompleted = 0;
    levelTransition = false;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    loadLevel(0);
    game.showOverlay('SOKOBAN', 'Push boxes onto targets! -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

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
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    if (levelTransition) {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        nextLevel(game);
      }
      return;
    }

    if (input.wasPressed('ArrowUp'))    tryMove(-1, 0, game);
    if (input.wasPressed('ArrowDown'))  tryMove(1, 0, game);
    if (input.wasPressed('ArrowLeft'))  tryMove(0, -1, game);
    if (input.wasPressed('ArrowRight')) tryMove(0, 1, game);

    if (input.wasPressed('z') || input.wasPressed('Z')) undo();
    if (input.wasPressed('r') || input.wasPressed('R')) resetLevel();
  };

  game.onDraw = (renderer, text) => {
    if (grid.length === 0) return;

    const rows = grid.length;
    let cols = 0;
    for (let r = 0; r < rows; r++) {
      if (grid[r].length > cols) cols = grid[r].length;
    }

    // Calculate cell size to fit canvas with padding
    const padding = 16;
    const cellW = Math.floor((W - padding * 2) / cols);
    const cellH = Math.floor((H - padding * 2) / rows);
    const cellSize = Math.min(cellW, cellH, 48);

    // Center the grid
    const gridW = cols * cellSize;
    const gridH = rows * cellSize;
    const offsetX = Math.floor((W - gridW) / 2);
    const offsetY = Math.floor((H - gridH) / 2);

    // Draw grid cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = grid[r][c];

        // Floor / background
        if (cell === WALL) {
          renderer.fillRect(x, y, cellSize, cellSize, '#2a2a4e');
          // Wall border (simulate strokeRect with 4 thin fillRects)
          const bdr = 1;
          renderer.fillRect(x, y, cellSize, bdr, '#3a3a5e');           // top
          renderer.fillRect(x, y + cellSize - bdr, cellSize, bdr, '#3a3a5e'); // bottom
          renderer.fillRect(x, y, bdr, cellSize, '#3a3a5e');           // left
          renderer.fillRect(x + cellSize - bdr, y, bdr, cellSize, '#3a3a5e'); // right
        } else {
          // Dark floor
          renderer.fillRect(x, y, cellSize, cellSize, '#10101e');
          // Subtle grid lines
          const bdr = 1;
          renderer.fillRect(x, y, cellSize, bdr, '#16213e');
          renderer.fillRect(x, y + cellSize - bdr, cellSize, bdr, '#16213e');
          renderer.fillRect(x, y, bdr, cellSize, '#16213e');
          renderer.fillRect(x + cellSize - bdr, y, bdr, cellSize, '#16213e');
        }

        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const pad = Math.floor(cellSize * 0.12);
        const innerSize = cellSize - pad * 2;

        // Target marker (draw under boxes/player) — diamond shape
        if (cell === TARGET || cell === BOX_ON_TARGET || cell === PLAYER_ON_TARGET) {
          renderer.setGlow('#f08', 0.4);
          const d = innerSize * 0.3;
          const diamondPts = [
            { x: cx, y: cy - d },
            { x: cx + d, y: cy },
            { x: cx, y: cy + d },
            { x: cx - d, y: cy }
          ];
          renderer.strokePoly(diamondPts, '#f08', 2, true);
          renderer.setGlow(null);
        }

        // Box
        if (cell === BOX || cell === BOX_ON_TARGET) {
          const onTarget = cell === BOX_ON_TARGET;
          const boxColor = onTarget ? '#f08' : '#c66';
          const detailColor = onTarget ? '#fff' : '#944';

          renderer.setGlow(boxColor, onTarget ? 0.8 : 0.4);
          renderer.fillRect(x + pad, y + pad, innerSize, innerSize, boxColor);
          renderer.setGlow(null);

          // Box detail - cross lines
          renderer.drawLine(x + pad, y + pad, x + pad + innerSize, y + pad + innerSize, detailColor, 1.5);
          renderer.drawLine(x + pad + innerSize, y + pad, x + pad, y + pad + innerSize, detailColor, 1.5);
        }

        // Player
        if (cell === PLAYER || cell === PLAYER_ON_TARGET) {
          renderer.setGlow('#f08', 0.9);
          // Body circle
          renderer.fillCircle(cx, cy, innerSize * 0.35, '#f08');
          renderer.setGlow(null);

          // Eyes
          const eyeOff = innerSize * 0.12;
          const eyeR = Math.max(innerSize * 0.07, 1.5);
          renderer.fillCircle(cx - eyeOff, cy - innerSize * 0.06, eyeR, '#1a1a2e');
          renderer.fillCircle(cx + eyeOff, cy - innerSize * 0.06, eyeR, '#1a1a2e');
        }
      }
    }

    // HUD on canvas
    text.drawText('Lv.' + (currentLevel + 1), 8, H - 20, 12, '#888', 'left');
    text.drawText('Moves: ' + moves, W - 8, H - 20, 12, '#888', 'right');

    // Update gameData for ML
    window.gameData = {
      level: currentLevel + 1,
      moves: moves,
      playerR: playerR,
      playerC: playerC,
      levelsCompleted: levelsCompleted,
      score: score
    };
  };

  game.start();
  return game;
}
