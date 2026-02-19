// boulder-dash/game.js — Boulder Dash game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 400;

// Tile types
const EMPTY = 0;
const DIRT = 1;
const WALL = 2;
const BOULDER = 3;
const DIAMOND = 4;
const PLAYER = 5;
const EXIT = 6;
const ENEMY = 7;
const STEEL = 8;

// Grid dimensions
const COLS = 25;
const ROWS = 20;
const TILE_W = W / COLS; // 20
const TILE_H = H / ROWS; // 20

// Level definitions
const levels = [
  { diamonds: 6, time: 120, enemies: 1, boulderDensity: 0.12, diamondDensity: 0.06 },
  { diamonds: 10, time: 110, enemies: 2, boulderDensity: 0.14, diamondDensity: 0.06 },
  { diamonds: 14, time: 100, enemies: 3, boulderDensity: 0.16, diamondDensity: 0.06 },
  { diamonds: 18, time: 90, enemies: 3, boulderDensity: 0.18, diamondDensity: 0.07 },
  { diamonds: 22, time: 85, enemies: 4, boulderDensity: 0.20, diamondDensity: 0.07 },
  { diamonds: 26, time: 80, enemies: 4, boulderDensity: 0.22, diamondDensity: 0.08 },
  { diamonds: 30, time: 75, enemies: 5, boulderDensity: 0.24, diamondDensity: 0.08 },
];

// ── State ──
let score, best = 0;
let grid, fallingMap;
let player, enemies, diamondsNeeded, diamondsCollected;
let exitOpen, exitPos, level, timeLeft;
let deathAnim, deathTimer;
let levelCompleteAnim, levelCompleteTimer;

// Frame counters (replacing setInterval/timestamp-based ticks)
let gravityTimer, gravityFrames; // gravity/enemy tick interval in frames
let timerCounter; // 1-second timer countdown in frames (60 frames = 1 sec)

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function getLevelDef(lvl) {
  if (lvl < levels.length) return levels[lvl];
  const last = levels[levels.length - 1];
  const extra = lvl - levels.length + 1;
  return {
    diamonds: last.diamonds + extra * 4,
    time: Math.max(60, last.time - extra * 5),
    enemies: Math.min(8, last.enemies + Math.floor(extra / 2)),
    boulderDensity: Math.min(0.30, last.boulderDensity + extra * 0.02),
    diamondDensity: Math.min(0.12, last.diamondDensity + extra * 0.01),
  };
}

function generateCave(lvl) {
  const def = getLevelDef(lvl);
  grid = [];
  fallingMap = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    fallingMap[r] = [];
    for (let c = 0; c < COLS; c++) {
      fallingMap[r][c] = false;
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        grid[r][c] = STEEL;
      } else {
        grid[r][c] = DIRT;
      }
    }
  }

  // Wall clusters
  const wallClusters = 3 + lvl;
  for (let i = 0; i < wallClusters; i++) {
    const cr = 2 + Math.floor(Math.random() * (ROWS - 4));
    const cc = 2 + Math.floor(Math.random() * (COLS - 4));
    const size = 2 + Math.floor(Math.random() * 3);
    const horizontal = Math.random() > 0.5;
    for (let j = 0; j < size; j++) {
      const rr = horizontal ? cr : cr + j;
      const rc = horizontal ? cc + j : cc;
      if (rr > 0 && rr < ROWS - 1 && rc > 0 && rc < COLS - 1) {
        grid[rr][rc] = WALL;
      }
    }
  }

  // Scatter boulders
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] === DIRT && Math.random() < def.boulderDensity) {
        grid[r][c] = BOULDER;
      }
    }
  }

  // Scatter diamonds
  let placed = 0;
  const totalDiamondsNeeded = def.diamonds + 4;
  while (placed < totalDiamondsNeeded) {
    for (let r = 1; r < ROWS - 1 && placed < totalDiamondsNeeded; r++) {
      for (let c = 1; c < COLS - 1 && placed < totalDiamondsNeeded; c++) {
        if (grid[r][c] === DIRT && Math.random() < def.diamondDensity) {
          grid[r][c] = DIAMOND;
          placed++;
        }
      }
    }
  }

  // Place player
  const pr = 2;
  const pc = 2;
  grid[pr][pc] = PLAYER;
  grid[pr - 1][pc] = EMPTY;
  grid[pr][pc - 1] = EMPTY;
  grid[pr][pc + 1] = grid[pr][pc + 1] === STEEL ? STEEL : EMPTY;
  grid[pr + 1][pc] = grid[pr + 1][pc] === STEEL ? STEEL : DIRT;
  player = { r: pr, c: pc };

  // Place exit
  const er = ROWS - 3;
  const ec = COLS - 3;
  grid[er][ec] = EXIT;
  exitPos = { r: er, c: ec };

  // Place enemies
  enemies = [];
  for (let i = 0; i < def.enemies; i++) {
    let attempts = 0;
    while (attempts < 200) {
      const er2 = 3 + Math.floor(Math.random() * (ROWS - 6));
      const ec2 = 5 + Math.floor(Math.random() * (COLS - 8));
      if (Math.abs(er2 - pr) + Math.abs(ec2 - pc) > 6 &&
          Math.abs(er2 - er) + Math.abs(ec2 - ec) > 4 &&
          grid[er2][ec2] === DIRT) {
        grid[er2][ec2] = ENEMY;
        enemies.push({ r: er2, c: ec2, dir: Math.floor(Math.random() * 4), alive: true });
        break;
      }
      attempts++;
    }
  }

  diamondsNeeded = def.diamonds;
  diamondsCollected = 0;
  timeLeft = def.time;
  exitOpen = false;
}

function applyGravity() {
  const newFalling = [];
  for (let r = 0; r < ROWS; r++) {
    newFalling[r] = [];
    for (let c = 0; c < COLS; c++) {
      newFalling[r][c] = false;
    }
  }

  for (let r = ROWS - 2; r >= 1; r--) {
    for (let c = 1; c < COLS - 1; c++) {
      const tile = grid[r][c];
      if (tile !== BOULDER && tile !== DIAMOND) continue;

      const below = grid[r + 1][c];
      const wasFalling = fallingMap[r][c];

      if (below === EMPTY) {
        grid[r + 1][c] = tile;
        grid[r][c] = EMPTY;
        newFalling[r + 1][c] = true;
        continue;
      }

      if (below === PLAYER && wasFalling) {
        grid[r + 1][c] = tile;
        grid[r][c] = EMPTY;
        die();
        fallingMap = newFalling;
        return;
      }

      if (below === ENEMY && wasFalling) {
        grid[r + 1][c] = tile;
        grid[r][c] = EMPTY;
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].r === r + 1 && enemies[i].c === c) {
            enemies[i].alive = false;
            enemies.splice(i, 1);
            score += 200;
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            break;
          }
        }
        newFalling[r + 1][c] = true;
        continue;
      }

      if (below === BOULDER || below === DIAMOND || below === WALL) {
        if (c > 1 && grid[r][c - 1] === EMPTY && grid[r + 1][c - 1] === EMPTY) {
          grid[r][c - 1] = tile;
          grid[r][c] = EMPTY;
          newFalling[r][c - 1] = true;
          continue;
        }
        if (c < COLS - 2 && grid[r][c + 1] === EMPTY && grid[r + 1][c + 1] === EMPTY) {
          grid[r][c + 1] = tile;
          grid[r][c] = EMPTY;
          newFalling[r][c + 1] = true;
          continue;
        }
      }

      newFalling[r][c] = false;
    }
  }
  fallingMap = newFalling;
}

function moveEnemies() {
  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const leftDir = (enemy.dir + 3) % 4;
    const rightDir = (enemy.dir + 1) % 4;
    const reverseDir = (enemy.dir + 2) % 4;
    const tryDirs = [leftDir, enemy.dir, rightDir, reverseDir];
    let moved = false;

    for (const d of tryDirs) {
      const nr = enemy.r + dr[d];
      const nc = enemy.c + dc[d];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        const target = grid[nr][nc];
        if (target === EMPTY) {
          grid[enemy.r][enemy.c] = EMPTY;
          enemy.r = nr;
          enemy.c = nc;
          grid[nr][nc] = ENEMY;
          enemy.dir = d;
          moved = true;
          break;
        }
        if (target === PLAYER) {
          die();
          return;
        }
      }
    }

    if (!moved) {
      enemy.dir = Math.floor(Math.random() * 4);
    }
  }
}

function tryMove(dr, dc) {
  if (deathAnim || levelCompleteAnim) return;

  const nr = player.r + dr;
  const nc = player.c + dc;

  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;

  const target = grid[nr][nc];

  if (target === WALL || target === STEEL) return;

  // Push boulder horizontally
  if (target === BOULDER && dr === 0) {
    const behindR = nr;
    const behindC = nc + dc;
    if (behindC >= 0 && behindC < COLS && grid[behindR][behindC] === EMPTY && !fallingMap[nr][nc]) {
      grid[behindR][behindC] = BOULDER;
      fallingMap[behindR][behindC] = false;
      grid[player.r][player.c] = EMPTY;
      player.r = nr;
      player.c = nc;
      grid[nr][nc] = PLAYER;
      return;
    }
    return;
  }

  if (target === BOULDER && dr !== 0) return;

  // Collect diamond
  if (target === DIAMOND) {
    diamondsCollected++;
    score += 100;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    if (diamondsCollected >= diamondsNeeded && !exitOpen) {
      exitOpen = true;
    }
  }

  // Reach exit
  if (target === EXIT) {
    if (exitOpen) {
      nextLevel();
      return;
    }
    return;
  }

  // Enemy collision
  if (target === ENEMY) {
    die();
    return;
  }

  // Move into empty, dirt, or diamond space
  if (target === EMPTY || target === DIRT || target === DIAMOND) {
    grid[player.r][player.c] = EMPTY;
    player.r = nr;
    player.c = nc;
    grid[nr][nc] = PLAYER;
  }
}

function die() {
  deathAnim = true;
  deathTimer = 30;
}

let _gameRef = null;

function nextLevel() {
  levelCompleteAnim = true;
  levelCompleteTimer = 40;
  const timeBonus = timeLeft * 10;
  score += timeBonus;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function gameOver() {
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  _gameRef.showOverlay('GAME OVER', 'Score: ' + score + ' | Level: ' + (level + 1) + ' -- Press any key to restart');
  _gameRef.setState('over');
}

// Animation phase counter (replaces Date.now() for consistent animation)
let animFrameCount = 0;

export function createGame() {
  const game = new Game('game');
  _gameRef = game;

  game.onInit = () => {
    score = 0;
    level = 0;
    scoreEl.textContent = '0';
    deathAnim = false;
    levelCompleteAnim = false;
    gravityTimer = 0;
    gravityFrames = Math.round(150 * 60 / 1000); // 150ms tick = ~9 frames
    timerCounter = 0;
    animFrameCount = 0;
    generateCave(0);
    game.showOverlay('BOULDER DASH', 'Arrow keys to move & dig -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    animFrameCount++;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Death animation
    if (deathAnim) {
      deathTimer--;
      if (deathTimer <= 0) {
        deathAnim = false;
        gameOver();
      }
      return;
    }

    // Level complete animation
    if (levelCompleteAnim) {
      levelCompleteTimer--;
      if (levelCompleteTimer <= 0) {
        levelCompleteAnim = false;
        level++;
        generateCave(level);
      }
      return;
    }

    // 1-second timer countdown (60 frames = 1 second at 60Hz)
    timerCounter++;
    if (timerCounter >= 60) {
      timerCounter = 0;
      timeLeft--;
      if (timeLeft <= 0) {
        die();
        return;
      }
    }

    // Gravity and enemy movement tick
    gravityTimer++;
    if (gravityTimer >= gravityFrames) {
      gravityTimer = 0;
      applyGravity();
      moveEnemies();
    }

    // Player movement (one move per key press)
    if (input.wasPressed('ArrowUp')) tryMove(-1, 0);
    if (input.wasPressed('ArrowDown')) tryMove(1, 0);
    if (input.wasPressed('ArrowLeft')) tryMove(0, -1);
    if (input.wasPressed('ArrowRight')) tryMove(0, 1);
  };

  game.onDraw = (renderer, text) => {
    const sparklePhase = (animFrameCount % 60) / 60;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE_W;
        const y = r * TILE_H;
        const tile = grid[r][c];

        switch (tile) {
          case DIRT:
            // Brown dirt with texture
            renderer.fillRect(x, y, TILE_W, TILE_H, '#6b4423');
            renderer.fillRect(x + 2, y + 2, TILE_W - 4, TILE_H - 4, '#8b6433');
            // Texture dots
            if ((r + c) % 3 === 0) renderer.fillRect(x + 4, y + 4, 2, 2, '#5a3a1a');
            if ((r + c) % 3 === 1) renderer.fillRect(x + 12, y + 10, 2, 2, '#5a3a1a');
            break;

          case WALL:
            // Gray stone wall
            renderer.fillRect(x, y, TILE_W, TILE_H, '#444444');
            renderer.fillRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, '#555555');
            renderer.fillRect(x + 3, y + 3, TILE_W - 6, 1, '#3a3a3a');
            renderer.fillRect(x + 3, y + TILE_H - 4, TILE_W - 6, 1, '#3a3a3a');
            break;

          case STEEL:
            // Dark indestructible border
            renderer.fillRect(x, y, TILE_W, TILE_H, '#333333');
            renderer.fillRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, '#2a2a2a');
            // Cross hatch approximated with two lines
            renderer.drawLine(x, y, x + TILE_W, y + TILE_H, '#3a3a3a', 0.5);
            renderer.drawLine(x + TILE_W, y, x, y + TILE_H, '#3a3a3a', 0.5);
            break;

          case BOULDER: {
            // Gray circle boulder
            const bcx = x + TILE_W / 2;
            const bcy = y + TILE_H / 2;
            renderer.setGlow('#666666', 0.3);
            renderer.fillCircle(bcx, bcy, TILE_W / 2 - 2, '#888888');
            renderer.setGlow(null);
            // Highlight
            renderer.fillCircle(bcx - 2, bcy - 3, 3, '#aaaaaa');
            break;
          }

          case DIAMOND:
            drawDiamond(renderer, x, y, sparklePhase);
            break;

          case PLAYER:
            if (deathAnim) {
              const flash = deathTimer % 4 < 2;
              renderer.setGlow('#f44', 1.0);
              renderer.fillRect(x + 2, y + 2, TILE_W - 4, TILE_H - 4, flash ? '#f44' : '#fff');
              renderer.setGlow(null);
            } else {
              drawPlayer(renderer, x, y);
            }
            break;

          case EXIT:
            drawExit(renderer, text, x, y);
            break;

          case ENEMY:
            drawEnemy(renderer, x, y);
            break;

          // EMPTY: black background (already cleared)
        }
      }
    }

    // HUD overlay on canvas
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}

function drawDiamond(renderer, x, y, phase) {
  const cx = x + TILE_W / 2;
  const cy = y + TILE_H / 2;
  const size = TILE_W / 2 - 2;
  const glow = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 + x * 0.3);

  renderer.setGlow('#8cf', 0.4 + glow * 0.6);

  // Diamond shape (rotated square)
  const alpha = 0.7 + glow * 0.3;
  const r = Math.round(136 * alpha + 10 * (1 - alpha));
  const g = Math.round(204 * alpha + 10 * (1 - alpha));
  const b = Math.round(255 * alpha + 20 * (1 - alpha));
  const color = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

  const points = [
    { x: cx, y: cy - size },
    { x: cx + size, y: cy },
    { x: cx, y: cy + size },
    { x: cx - size, y: cy },
  ];
  renderer.fillPoly(points, color);

  // Inner bright spot
  renderer.fillCircle(cx - 1, cy - 2, 2, '#ffffff');

  renderer.setGlow(null);
}

function drawPlayer(renderer, x, y) {
  const cx = x + TILE_W / 2;

  renderer.setGlow('#8cf', 0.7);

  // Body
  renderer.fillRect(x + 4, y + 6, TILE_W - 8, TILE_H - 8, '#8cf');

  // Head
  renderer.fillCircle(cx, y + 5, 4, '#adf');

  // Eyes
  renderer.fillRect(cx - 3, y + 3, 2, 2, '#1a1a2e');
  renderer.fillRect(cx + 1, y + 3, 2, 2, '#1a1a2e');

  renderer.setGlow(null);
}

function drawExit(renderer, text, x, y) {
  if (exitOpen) {
    const pulse = 0.5 + 0.5 * Math.sin(animFrameCount * 0.3);
    const alphaVal = 0.4 + pulse * 0.6;
    const g = Math.round(255 * alphaVal);
    const rVal = Math.round(100 * alphaVal);
    const color = '#' + rVal.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + rVal.toString(16).padStart(2, '0');

    renderer.setGlow('#4f4', 0.8 + pulse * 0.5);
    renderer.fillRect(x + 2, y + 2, TILE_W - 4, TILE_H - 4, color);
    renderer.setGlow(null);

    // Door frame
    const framePoints = [
      { x: x + 3, y: y + 3 },
      { x: x + TILE_W - 3, y: y + 3 },
      { x: x + TILE_W - 3, y: y + TILE_H - 3 },
      { x: x + 3, y: y + TILE_H - 3 },
    ];
    renderer.strokePoly(framePoints, '#4f4', 2, true);

    // "E" indicator
    text.drawText('E', x + TILE_W / 2, y + TILE_H / 2 - 5, 10, '#ffffff', 'center');
  } else {
    // Locked exit
    renderer.fillRect(x + 2, y + 2, TILE_W - 4, TILE_H - 4, '#2a2a3e');
    const framePoints = [
      { x: x + 3, y: y + 3 },
      { x: x + TILE_W - 3, y: y + 3 },
      { x: x + TILE_W - 3, y: y + TILE_H - 3 },
      { x: x + 3, y: y + TILE_H - 3 },
    ];
    renderer.strokePoly(framePoints, '#444444', 1, true);
  }
}

function drawEnemy(renderer, x, y) {
  const cx = x + TILE_W / 2;
  const cy = y + TILE_H / 2;
  const pulse = 0.7 + 0.3 * Math.sin(animFrameCount * 0.48);

  renderer.setGlow('#f44', 0.6);

  // Body circle
  const bodyAlpha = pulse;
  const bodyR = Math.round(255 * bodyAlpha);
  const bodyG = Math.round(68 * bodyAlpha);
  const bodyB = Math.round(68 * bodyAlpha);
  const bodyColor = '#' + bodyR.toString(16).padStart(2, '0') + bodyG.toString(16).padStart(2, '0') + bodyB.toString(16).padStart(2, '0');
  renderer.fillCircle(cx, cy, TILE_W / 2 - 3, bodyColor);

  // Wings (triangles)
  const wingR = Math.round(255 * pulse);
  const wingG = Math.round(120 * pulse);
  const wingB = Math.round(80 * pulse);
  const wingColor = '#' + wingR.toString(16).padStart(2, '0') + wingG.toString(16).padStart(2, '0') + wingB.toString(16).padStart(2, '0');

  // Left wing
  renderer.fillPoly([
    { x: cx - 2, y: cy },
    { x: cx - TILE_W / 2 + 1, y: cy - 4 },
    { x: cx - TILE_W / 2 + 1, y: cy + 4 },
  ], wingColor);

  // Right wing
  renderer.fillPoly([
    { x: cx + 2, y: cy },
    { x: cx + TILE_W / 2 - 1, y: cy - 4 },
    { x: cx + TILE_W / 2 - 1, y: cy + 4 },
  ], wingColor);

  // Eyes
  renderer.fillRect(cx - 3, cy - 2, 2, 2, '#ffffff');
  renderer.fillRect(cx + 1, cy - 2, 2, 2, '#ffffff');

  renderer.setGlow(null);
}

function drawHUD(renderer, text) {
  // Semi-transparent bar at top
  renderer.fillRect(0, 0, W, 18, 'rgba(10, 10, 20, 0.7)');

  // Level
  text.drawText('LVL ' + (level + 1), 4, 3, 11, '#8cf', 'left');

  // Diamonds
  const dColor = exitOpen ? '#4f4' : '#8cf';
  text.drawText('\u2666 ' + diamondsCollected + '/' + diamondsNeeded, W / 2, 3, 11, dColor, 'center');

  // Timer
  const tColor = timeLeft <= 15 ? '#f44' : '#8cf';
  text.drawText('TIME ' + timeLeft, W - 4, 3, 11, tColor, 'right');

  // Exit open flash
  if (exitOpen && !levelCompleteAnim) {
    const flash = Math.sin(animFrameCount * 0.36) > 0;
    if (flash) {
      renderer.fillRect(W / 2 - 60, H - 22, 120, 18, 'rgba(10, 10, 20, 0.6)');
      text.drawText('EXIT OPEN!', W / 2, H - 18, 12, '#4f4', 'center');
    }
  }

  // Level complete flash
  if (levelCompleteAnim) {
    renderer.fillRect(0, H / 2 - 20, W, 40, 'rgba(10, 10, 20, 0.7)');
    renderer.setGlow('#4f4', 1.0);
    text.drawText('LEVEL ' + (level + 1) + ' COMPLETE!', W / 2, H / 2 - 10, 20, '#4f4', 'center');
    renderer.setGlow(null);
  }
}
