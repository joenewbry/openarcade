// tron/game.js — Tron light-cycle game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Grid settings
const CELL = 10;
const COLS = W / CELL;
const ROWS = H / CELL;
const TICK_INTERVAL = 5; // frames at 60fps (~80ms)

// Colors
const PLAYER_COLOR = '#0f8';
const PLAYER_TRAIL = 'rgba(0, 255, 136, 0.35)';
const AI_COLOR = '#f80';
const AI_TRAIL = 'rgba(255, 136, 0, 0.35)';
const CRASH_COLOR = '#f00';
const GRID_COLOR = '#16213e';
const HUD_DIM = 'rgba(255, 255, 255, 0.3)';
const HUD_DIMMER = 'rgba(255, 255, 255, 0.25)';

// Directions
const DIR = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 }
};

// ── State ──
let score, wins, rounds;
let player, ai;
let grid; // 0 = empty, 1 = player trail, 2 = AI trail
let roundDelay;
let frameCount;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Grid helpers ──
function setGrid(x, y, val) {
  if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
    grid[y * COLS + x] = val;
  }
}

function getGrid(x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return -1; // wall
  return grid[y * COLS + x];
}

function resetRound() {
  grid = new Uint8Array(COLS * ROWS);

  player = {
    x: Math.floor(COLS * 0.25),
    y: Math.floor(ROWS / 2),
    dir: { ...DIR.RIGHT },
    nextDir: { ...DIR.RIGHT },
    alive: true,
    trail: []
  };

  ai = {
    x: Math.floor(COLS * 0.75),
    y: Math.floor(ROWS / 2),
    dir: { ...DIR.LEFT },
    alive: true,
    trail: []
  };

  setGrid(player.x, player.y, 1);
  player.trail.push({ x: player.x, y: player.y });

  setGrid(ai.x, ai.y, 2);
  ai.trail.push({ x: ai.x, y: ai.y });
}

// ── AI ──
function countOpen(startX, startY, maxCount) {
  const visited = new Set();
  const queue = [startX + startY * COLS];
  visited.add(queue[0]);
  let count = 0;

  while (queue.length > 0 && count < maxCount) {
    const idx = queue.shift();
    const cx = idx % COLS;
    const cy = Math.floor(idx / COLS);
    count++;

    for (const key in DIR) {
      const d = DIR[key];
      const nx = cx + d.x;
      const ny = cy + d.y;
      const nIdx = nx + ny * COLS;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
          !visited.has(nIdx) && grid[nIdx] === 0) {
        visited.add(nIdx);
        queue.push(nIdx);
      }
    }
  }

  return count;
}

function aiDecide() {
  const currentDir = ai.dir;
  const possibleDirs = [];

  for (const key in DIR) {
    const d = DIR[key];
    if (d.x + currentDir.x === 0 && d.y + currentDir.y === 0) continue;
    possibleDirs.push(d);
  }

  let bestDir = currentDir;
  let bestScore = -1;

  for (const d of possibleDirs) {
    const nx = ai.x + d.x;
    const ny = ai.y + d.y;
    if (getGrid(nx, ny) !== 0) continue;

    const openCount = countOpen(nx, ny, 80);
    const toPlayerX = player.x - ai.x;
    const toPlayerY = player.y - ai.y;
    const dot = d.x * toPlayerX + d.y * toPlayerY;
    const aggressiveBonus = dot > 0 ? 3 : 0;
    const dirScore = openCount + aggressiveBonus;

    if (dirScore > bestScore) {
      bestScore = dirScore;
      bestDir = d;
    }
  }

  if (bestScore >= 0) {
    ai.dir = { ...bestDir };
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    wins = 0;
    rounds = 0;
    frameCount = 0;
    scoreEl.textContent = '0';
    resetRound();
    game.showOverlay('TRON', 'Press any arrow key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      const keyDirs = {
        ArrowUp: DIR.UP,
        ArrowDown: DIR.DOWN,
        ArrowLeft: DIR.LEFT,
        ArrowRight: DIR.RIGHT
      };
      for (const key in keyDirs) {
        if (input.wasPressed(key)) {
          const d = keyDirs[key];
          // Prevent reversing the initial RIGHT direction
          if (!(d.x + DIR.RIGHT.x === 0 && d.y + DIR.RIGHT.y === 0)) {
            player.nextDir = { ...d };
            player.dir = { ...d };
          }
          game.setState('playing');
          roundDelay = 0;
          frameCount = 0;
          return;
        }
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Direction input (always responsive)
    const keyDirs = {
      ArrowUp: DIR.UP,
      ArrowDown: DIR.DOWN,
      ArrowLeft: DIR.LEFT,
      ArrowRight: DIR.RIGHT
    };
    for (const key in keyDirs) {
      if (input.wasPressed(key)) {
        const d = keyDirs[key];
        if (d.x + player.dir.x !== 0 || d.y + player.dir.y !== 0) {
          player.nextDir = { ...d };
        }
      }
    }

    // Frame-based tick (simulate ~80ms interval at 60fps)
    frameCount++;
    if (frameCount < TICK_INTERVAL) return;
    frameCount = 0;

    // Handle round transition delay
    if (roundDelay > 0) {
      roundDelay--;
      if (roundDelay === 0) {
        resetRound();
      }
      return;
    }

    if (!player.alive && !ai.alive) return;

    // Apply player direction
    player.dir = { ...player.nextDir };

    // Move player
    if (player.alive) {
      const nx = player.x + player.dir.x;
      const ny = player.y + player.dir.y;
      const cell = getGrid(nx, ny);
      if (cell !== 0) {
        player.alive = false;
      } else {
        player.x = nx;
        player.y = ny;
        setGrid(player.x, player.y, 1);
        player.trail.push({ x: player.x, y: player.y });
      }
    }

    // AI decides and moves
    if (ai.alive) {
      aiDecide();
      const nx = ai.x + ai.dir.x;
      const ny = ai.y + ai.dir.y;
      const cell = getGrid(nx, ny);
      if (cell !== 0) {
        ai.alive = false;
      } else {
        ai.x = nx;
        ai.y = ny;
        setGrid(ai.x, ai.y, 2);
        ai.trail.push({ x: ai.x, y: ai.y });
      }
    }

    // Check round result
    if (!player.alive || !ai.alive) {
      rounds++;
      if (player.alive && !ai.alive) {
        wins++;
        score += 10 + Math.floor(player.trail.length / 2);
        scoreEl.textContent = score;
        const best = parseInt(bestEl.textContent) || 0;
        if (score > best) {
          bestEl.textContent = score;
        }
      }

      if (!player.alive) {
        game.showOverlay('GAME OVER',
          `Score: ${score} (${wins}/${rounds} rounds won) \u2014 Press any key`);
        game.setState('over');
        return;
      }

      // AI died, player survived — new round after delay
      roundDelay = 15;
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid lines
    for (let x = 0; x <= W; x += CELL) {
      renderer.drawLine(x, 0, x, H, GRID_COLOR, 0.5);
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.drawLine(0, y, W, y, GRID_COLOR, 0.5);
    }

    // Player trail
    for (let i = 0; i < player.trail.length; i++) {
      const seg = player.trail[i];
      const isHead = (i === player.trail.length - 1) && player.alive;
      if (isHead) continue;
      renderer.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, PLAYER_TRAIL);
    }

    // AI trail
    for (let i = 0; i < ai.trail.length; i++) {
      const seg = ai.trail[i];
      const isHead = (i === ai.trail.length - 1) && ai.alive;
      if (isHead) continue;
      renderer.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, AI_TRAIL);
    }

    // Player head
    if (player.alive && player.trail.length > 0) {
      renderer.setGlow(PLAYER_COLOR, 0.8);
      renderer.fillRect(player.x * CELL, player.y * CELL, CELL, CELL, PLAYER_COLOR);
      renderer.setGlow(null);
    } else if (!player.alive && player.trail.length > 0) {
      const last = player.trail[player.trail.length - 1];
      renderer.setGlow(CRASH_COLOR, 1.0);
      renderer.fillRect(last.x * CELL, last.y * CELL, CELL, CELL, CRASH_COLOR);
      renderer.setGlow(null);
    }

    // AI head
    if (ai.alive && ai.trail.length > 0) {
      renderer.setGlow(AI_COLOR, 0.8);
      renderer.fillRect(ai.x * CELL, ai.y * CELL, CELL, CELL, AI_COLOR);
      renderer.setGlow(null);
    } else if (!ai.alive && ai.trail.length > 0) {
      const last = ai.trail[ai.trail.length - 1];
      renderer.setGlow(CRASH_COLOR, 1.0);
      renderer.fillRect(last.x * CELL, last.y * CELL, CELL, CELL, CRASH_COLOR);
      renderer.setGlow(null);
    }

    // HUD during play
    if (game.state === 'playing') {
      text.drawText('YOU', 8, 4, 12, HUD_DIM, 'left');
      renderer.fillRect(38, 7, 10, 10, PLAYER_COLOR);

      text.drawText('CPU', W - 30, 4, 12, HUD_DIM, 'right');
      renderer.fillRect(W - 18, 7, 10, 10, AI_COLOR);

      text.drawText(`Round ${rounds + 1}`, W / 2, 4, 12, HUD_DIMMER, 'center');

      // New round flash
      if (roundDelay > 10) {
        renderer.setGlow(PLAYER_COLOR, 1.0);
        text.drawText('ROUND WON!', W / 2, H / 2 - 12, 24, PLAYER_COLOR, 'center');
        renderer.setGlow(null);
      }
    }
  };

  game.start();
  return game;
}
