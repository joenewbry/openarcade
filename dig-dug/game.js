// dig-dug/game.js — Dig Dug game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 520;

// Grid dimensions
const COLS = 15;
const ROWS = 16;
const CELL = 32;
const TOP_ROWS = 2;
const OFFSET_X = (W - COLS * CELL) / 2;
const OFFSET_Y = H - ROWS * CELL;

// Depth layer colors
const DIRT_COLORS = ['#8B6914', '#7A5B0F', '#654A0E', '#503A0D'];
const DIRT_EDGE_COLORS = ['#A07828', '#8C6618', '#755414', '#604410'];

// Score values by depth layer
const POOKA_SCORES = [200, 300, 400, 500];
const FYGAR_SCORES = [400, 600, 800, 1000];
const ROCK_CRUSH_BONUS = 1000;

// Player movement timing
const PLAYER_MOVE_INTERVAL = 5;

// ── State ──
let score, best, level, lives;
let grid;
let player;
let enemies;
let rocks;
let pump;
let frameCount;
let levelCompleteTimer;
let deathTimer;
let lastMoveFrame;
let gameRef;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');

// ── Helpers ──

function getDepthLayer(row) {
  if (row < TOP_ROWS) return -1;
  const dirtRow = row - TOP_ROWS;
  const totalDirtRows = ROWS - TOP_ROWS;
  const layerSize = totalDirtRows / 4;
  return Math.min(3, Math.floor(dirtRow / layerSize));
}

function getDirtColor(row) {
  const layer = getDepthLayer(row);
  if (layer < 0) return null;
  return DIRT_COLORS[layer];
}

function getDirtEdgeColor(row) {
  const layer = getDepthLayer(row);
  if (layer < 0) return null;
  return DIRT_EDGE_COLORS[layer];
}

function initGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = r >= TOP_ROWS ? 1 : 0;
    }
  }
  // Carve initial tunnels for player spawn area
  const spawnRow = TOP_ROWS;
  for (let c = 3; c < COLS - 3; c++) {
    grid[spawnRow][c] = 0;
  }
}

function createEnemies() {
  enemies = [];
  const numPookas = Math.min(2 + level, 6);
  const numFygars = Math.min(Math.floor(level / 2) + 1, 4);

  for (let i = 0; i < numPookas + numFygars; i++) {
    let row, col, attempts = 0;
    do {
      row = TOP_ROWS + 3 + Math.floor(Math.random() * (ROWS - TOP_ROWS - 4));
      col = 1 + Math.floor(Math.random() * (COLS - 2));
      attempts++;
    } while (attempts < 100 && (
      (Math.abs(row - player.row) < 3 && Math.abs(col - player.col) < 3) ||
      enemies.some(e => Math.abs(e.row - row) < 2 && Math.abs(e.col - col) < 2)
    ));

    grid[row][col] = 0;

    const isPooka = i < numPookas;
    enemies.push({
      row, col,
      x: col * CELL + OFFSET_X,
      y: row * CELL + OFFSET_Y,
      type: isPooka ? 'pooka' : 'fygar',
      dir: Math.random() < 0.5 ? 1 : -1,
      dirY: 0,
      moveTimer: 0,
      moveInterval: Math.max(12, 20 - level * 2),
      inflateLevel: 0,
      deflateTimer: 0,
      alive: true,
      ghost: false,
      ghostTimer: 0,
      ghostTarget: null,
      escaping: false,
      fireTimer: 0,
      fireActive: false,
      fireDir: 1,
      fireLength: 0,
    });
  }
}

function createRocks() {
  rocks = [];
  const numRocks = Math.min(2 + Math.floor(level / 2), 5);
  for (let i = 0; i < numRocks; i++) {
    let row, col, attempts = 0;
    do {
      row = TOP_ROWS + 1 + Math.floor(Math.random() * Math.floor((ROWS - TOP_ROWS) / 2));
      col = 1 + Math.floor(Math.random() * (COLS - 2));
      attempts++;
    } while (attempts < 100 && (
      (row === player.row && col === player.col) ||
      enemies.some(e => e.row === row && e.col === col) ||
      rocks.some(r => r.row === row && r.col === col)
    ));

    grid[row][col] = 0;

    rocks.push({
      row, col,
      x: col * CELL + OFFSET_X,
      y: row * CELL + OFFSET_Y,
      falling: false,
      fallSpeed: 0,
      settled: false,
      settleTimer: 0,
      wobbleTimer: 0,
      crushedEnemies: 0,
    });
  }
}

function initLevel() {
  initGrid();
  player = {
    row: TOP_ROWS,
    col: Math.floor(COLS / 2),
    x: Math.floor(COLS / 2) * CELL + OFFSET_X,
    y: TOP_ROWS * CELL + OFFSET_Y,
    dir: 0,
    facingX: 1,
    facingY: 0,
    alive: true,
  };
  pump = null;
  frameCount = 0;
  lastMoveFrame = 0;
  levelCompleteTimer = 0;
  deathTimer = 0;
  createEnemies();
  createRocks();
  levelEl.textContent = level;
}

function addScore(points) {
  score += points;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function tryMove(row, col) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  for (const rock of rocks) {
    if (!rock.falling && rock.row === row && rock.col === col) return false;
  }
  return true;
}

function movePlayer() {
  if (!player.alive) return;
  if (frameCount - lastMoveFrame < PLAYER_MOVE_INTERVAL) return;

  const input = gameRef.input;
  let moved = false;
  let newRow = player.row;
  let newCol = player.col;

  if (input.isDown('ArrowLeft')) {
    newCol = player.col - 1;
    player.facingX = -1; player.facingY = 0; player.dir = 2;
    moved = true;
  } else if (input.isDown('ArrowRight')) {
    newCol = player.col + 1;
    player.facingX = 1; player.facingY = 0; player.dir = 0;
    moved = true;
  } else if (input.isDown('ArrowUp')) {
    newRow = player.row - 1;
    player.facingX = 0; player.facingY = -1; player.dir = 3;
    moved = true;
  } else if (input.isDown('ArrowDown')) {
    newRow = player.row + 1;
    player.facingX = 0; player.facingY = 1; player.dir = 1;
    moved = true;
  }

  if (moved && tryMove(newRow, newCol)) {
    player.row = newRow;
    player.col = newCol;
    if (newRow >= TOP_ROWS && grid[newRow][newCol] === 1) {
      grid[newRow][newCol] = 0;
    }
    player.x = player.col * CELL + OFFSET_X;
    player.y = player.row * CELL + OFFSET_Y;
    lastMoveFrame = frameCount;

    if (pump && !pump.retracting) {
      pump = null;
    }
  }
}

function firePump() {
  if (pump) return;
  pump = {
    startRow: player.row,
    startCol: player.col,
    dx: player.facingX,
    dy: player.facingY,
    length: 0,
    maxLength: 4,
    extending: true,
    retracting: false,
    target: null,
    extendTimer: 0,
  };
}

function updatePump() {
  if (!pump) return;

  pump.extendTimer++;
  if (pump.extendTimer < 3) return;
  pump.extendTimer = 0;

  if (pump.extending) {
    pump.length++;
    const tipRow = pump.startRow + pump.dy * pump.length;
    const tipCol = pump.startCol + pump.dx * pump.length;

    if (tipRow < 0 || tipRow >= ROWS || tipCol < 0 || tipCol >= COLS) {
      pump = null;
      return;
    }

    for (const rock of rocks) {
      if (!rock.falling && rock.row === tipRow && rock.col === tipCol) {
        pump = null;
        return;
      }
    }

    for (const enemy of enemies) {
      if (enemy.alive && enemy.inflateLevel < 4 && enemy.row === tipRow && enemy.col === tipCol) {
        pump.target = enemy;
        pump.extending = false;
        enemy.inflateLevel = Math.min(enemy.inflateLevel + 1, 4);
        enemy.deflateTimer = 0;
        return;
      }
    }

    if (pump.length >= pump.maxLength) {
      pump = null;
    }
  }
}

function popEnemy(enemy) {
  enemy.alive = false;
  const layer = getDepthLayer(enemy.row);
  const scores = enemy.type === 'pooka' ? POOKA_SCORES : FYGAR_SCORES;
  const points = scores[Math.max(0, layer)];
  addScore(points);
}

function pumpEnemy() {
  const input = gameRef.input;
  if (pump && pump.target && input.isDown(' ')) {
    pump.target.deflateTimer = 0;
    if (frameCount % 15 === 0) {
      pump.target.inflateLevel = Math.min(pump.target.inflateLevel + 1, 4);
    }
    if (pump.target.inflateLevel >= 4) {
      popEnemy(pump.target);
      pump = null;
    }
  }
  if (pump && pump.target && !input.isDown(' ')) {
    pump = null;
  }
}

function killPlayer() {
  if (!player.alive) return;
  player.alive = false;
  pump = null;
  deathTimer = 60;
}

function updateEnemies() {
  const aliveEnemies = enemies.filter(e => e.alive);

  if (aliveEnemies.length === 1 && !aliveEnemies[0].escaping) {
    aliveEnemies[0].escaping = true;
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    if (enemy.inflateLevel > 0) {
      enemy.deflateTimer++;
      if (enemy.deflateTimer > 40) {
        enemy.inflateLevel--;
        enemy.deflateTimer = 0;
      }
      continue;
    }

    enemy.moveTimer++;
    if (enemy.moveTimer < enemy.moveInterval) continue;
    enemy.moveTimer = 0;

    if (enemy.escaping) {
      if (enemy.row > 0) {
        let newRow = enemy.row - 1;
        let newCol = enemy.col;
        if (Math.random() < 0.3) {
          const centerCol = Math.floor(COLS / 2);
          if (enemy.col < centerCol) newCol++;
          else if (enemy.col > centerCol) newCol--;
        }
        newCol = Math.max(0, Math.min(COLS - 1, newCol));
        enemy.row = newRow;
        enemy.col = newCol;
        if (newRow >= TOP_ROWS) grid[newRow][newCol] = 0;
      } else {
        enemy.alive = false;
      }
    } else if (enemy.ghost) {
      enemy.ghostTimer++;
      const dRow = player.row - enemy.row;
      const dCol = player.col - enemy.col;
      if (Math.abs(dRow) > Math.abs(dCol)) {
        enemy.row += Math.sign(dRow);
      } else {
        enemy.col += Math.sign(dCol);
      }
      enemy.row = Math.max(0, Math.min(ROWS - 1, enemy.row));
      enemy.col = Math.max(0, Math.min(COLS - 1, enemy.col));
      if (grid[enemy.row] && grid[enemy.row][enemy.col] === 0) {
        enemy.ghost = false;
        enemy.ghostTimer = 0;
      }
      if (enemy.ghostTimer > 60) {
        enemy.ghost = false;
        enemy.ghostTimer = 0;
      }
    } else {
      let possibleMoves = [];
      const dirs = [
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 },
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
      ];

      for (const d of dirs) {
        const nr = enemy.row + d.dr;
        const nc = enemy.col + d.dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === 0) {
          if (!rocks.some(r => !r.falling && r.row === nr && r.col === nc)) {
            possibleMoves.push(d);
          }
        }
      }

      if (possibleMoves.length > 0) {
        let chosen;
        if (Math.random() < 0.4) {
          possibleMoves.sort((a, b) => {
            const distA = Math.abs(enemy.row + a.dr - player.row) + Math.abs(enemy.col + a.dc - player.col);
            const distB = Math.abs(enemy.row + b.dr - player.row) + Math.abs(enemy.col + b.dc - player.col);
            return distA - distB;
          });
          chosen = possibleMoves[0];
        } else {
          chosen = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        enemy.row += chosen.dr;
        enemy.col += chosen.dc;
        enemy.dir = chosen.dc !== 0 ? chosen.dc : enemy.dir;
        enemy.dirY = chosen.dr;
      } else {
        if (Math.random() < 0.15) {
          enemy.ghost = true;
          enemy.ghostTimer = 0;
        }
      }

      if (enemy.type === 'fygar' && !enemy.fireActive) {
        enemy.fireTimer++;
        if (enemy.fireTimer > 60 && Math.random() < 0.05) {
          if (enemy.row === player.row) {
            enemy.fireActive = true;
            enemy.fireDir = player.col > enemy.col ? 1 : -1;
            enemy.fireLength = 0;
            enemy.fireTimer = 0;
          }
        }
      }
    }

    enemy.x = enemy.col * CELL + OFFSET_X;
    enemy.y = enemy.row * CELL + OFFSET_Y;

    if (player.alive && enemy.row === player.row && enemy.col === player.col && enemy.inflateLevel === 0) {
      killPlayer();
    }
  }

  // Update Fygar fire
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.type !== 'fygar') continue;
    if (enemy.fireActive) {
      enemy.fireLength += 0.15;
      if (enemy.fireLength >= 3) {
        enemy.fireActive = false;
        enemy.fireLength = 0;
      }
      if (player.alive) {
        for (let i = 1; i <= Math.floor(enemy.fireLength); i++) {
          const fc = enemy.col + enemy.fireDir * i;
          if (fc >= 0 && fc < COLS && enemy.row === player.row && fc === player.col) {
            killPlayer();
            break;
          }
        }
      }
    }
  }
}

function updateRocks() {
  for (const rock of rocks) {
    if (rock.settled) continue;

    if (!rock.falling) {
      const belowRow = rock.row + 1;
      if (belowRow < ROWS && grid[belowRow][rock.col] === 0) {
        if (!rocks.some(r => r !== rock && !r.falling && r.row === belowRow && r.col === rock.col)) {
          rock.wobbleTimer++;
          if (rock.wobbleTimer > 20) {
            rock.falling = true;
            rock.fallSpeed = 0;
            rock.crushedEnemies = 0;
          }
        }
      } else {
        rock.wobbleTimer = 0;
      }
    } else {
      rock.fallSpeed = Math.min(rock.fallSpeed + 0.5, 6);
      rock.y += rock.fallSpeed;
      const newRow = Math.floor((rock.y - OFFSET_Y + CELL / 2) / CELL);

      if (newRow >= TOP_ROWS && newRow < ROWS && grid[newRow]) {
        grid[newRow][rock.col] = 0;
      }

      const nextRow = newRow + 1;
      let shouldStop = false;
      if (nextRow >= ROWS) {
        shouldStop = true;
      } else if (grid[nextRow] && grid[nextRow][rock.col] === 1) {
        shouldStop = true;
      } else {
        if (rocks.some(r => r !== rock && r.settled && r.row === nextRow && r.col === rock.col)) {
          shouldStop = true;
        }
      }

      for (const enemy of enemies) {
        if (enemy.alive && enemy.col === rock.col && Math.abs(enemy.row - newRow) <= 0) {
          enemy.alive = false;
          rock.crushedEnemies++;
          addScore(ROCK_CRUSH_BONUS * rock.crushedEnemies);
        }
      }

      if (player.alive && player.col === rock.col && player.row === newRow) {
        killPlayer();
      }

      if (shouldStop) {
        rock.row = newRow;
        rock.y = rock.row * CELL + OFFSET_Y;
        rock.x = rock.col * CELL + OFFSET_X;
        rock.falling = false;
        rock.settled = true;
      } else {
        rock.row = newRow;
      }
    }
  }
}

function handleDeath() {
  if (!player.alive && deathTimer > 0) {
    deathTimer--;
    if (deathTimer <= 0) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        gameRef.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        gameRef.setState('over');
      } else {
        player.alive = true;
        player.row = TOP_ROWS;
        player.col = Math.floor(COLS / 2);
        player.x = player.col * CELL + OFFSET_X;
        player.y = player.row * CELL + OFFSET_Y;
        pump = null;
        for (const enemy of enemies) {
          if (enemy.alive && Math.abs(enemy.row - player.row) < 2 && Math.abs(enemy.col - player.col) < 2) {
            enemy.row = Math.min(ROWS - 2, enemy.row + 3);
            enemy.col = Math.max(1, Math.min(COLS - 2, enemy.col));
            enemy.x = enemy.col * CELL + OFFSET_X;
            enemy.y = enemy.row * CELL + OFFSET_Y;
          }
        }
      }
    }
  }
}

function checkLevelComplete() {
  const aliveEnemies = enemies.filter(e => e.alive);
  if (aliveEnemies.length === 0 && player.alive) {
    levelCompleteTimer++;
    if (levelCompleteTimer > 60) {
      level++;
      initLevel();
    }
  }
}

// ── Drawing ──

function drawDirt(renderer) {
  for (let r = TOP_ROWS; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 1) {
        const x = c * CELL + OFFSET_X;
        const y = r * CELL + OFFSET_Y;
        const color = getDirtColor(r);
        const edgeColor = getDirtEdgeColor(r);

        renderer.fillRect(x, y, CELL, CELL, color);

        // Texture dots
        if ((r + c) % 3 === 0) {
          renderer.fillRect(x + 4, y + 4, 2, 2, edgeColor);
          renderer.fillRect(x + 20, y + 14, 2, 2, edgeColor);
        }
        if ((r + c) % 4 === 1) {
          renderer.fillRect(x + 12, y + 8, 2, 2, edgeColor);
          renderer.fillRect(x + 26, y + 22, 2, 2, edgeColor);
        }

        // Edge lines where dirt meets tunnel
        if (c > 0 && grid[r][c - 1] === 0) {
          renderer.drawLine(x, y, x, y + CELL, edgeColor, 1);
        }
        if (c < COLS - 1 && grid[r][c + 1] === 0) {
          renderer.drawLine(x + CELL, y, x + CELL, y + CELL, edgeColor, 1);
        }
        if (r > TOP_ROWS && grid[r - 1][c] === 0) {
          renderer.drawLine(x, y, x + CELL, y, edgeColor, 1);
        }
        if (r < ROWS - 1 && grid[r + 1][c] === 0) {
          renderer.drawLine(x, y + CELL, x + CELL, y + CELL, edgeColor, 1);
        }
      }
    }
  }
}

function drawSky(renderer) {
  // Sky background — use two gradient rects to approximate
  const skyH = TOP_ROWS * CELL;
  const skyY = OFFSET_Y;
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(26 + (26 - 26) * t);
    const g = Math.round(42 + (26 - 42) * t);
    const b = Math.round(78 + (46 - 78) * t);
    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    renderer.fillRect(OFFSET_X, skyY + i * (skyH / steps), COLS * CELL, skyH / steps, hex);
  }
}

function drawTunnelBackground(renderer) {
  for (let r = TOP_ROWS; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 0) {
        const x = c * CELL + OFFSET_X;
        const y = r * CELL + OFFSET_Y;
        renderer.fillRect(x, y, CELL, CELL, '#12121e');
      }
    }
  }
}

function drawDepthIndicators(text) {
  const totalDirtRows = ROWS - TOP_ROWS;
  const layerSize = totalDirtRows / 4;
  for (let i = 0; i < 4; i++) {
    const row = TOP_ROWS + Math.floor(i * layerSize);
    const y = row * CELL + OFFSET_Y + 2;
    text.drawText(`L${i + 1}`, OFFSET_X - 18, y, 9, '#555', 'left');
  }
}

function drawPlayer(renderer) {
  if (!player.alive) {
    // Death animation — explosion particles
    if (deathTimer > 0) {
      const cx = player.x + CELL / 2;
      const cy = player.y + CELL / 2;
      // Use alpha-like effect via color brightness fade
      renderer.setGlow('#4af', 0.8 * (deathTimer / 60));
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + frameCount * 0.1;
        const dist = (60 - deathTimer) * 0.5;
        renderer.fillCircle(
          cx + Math.cos(angle) * dist,
          cy + Math.sin(angle) * dist,
          3, '#4af'
        );
      }
      renderer.setGlow(null);
    }
    return;
  }

  const cx = player.x + CELL / 2;
  const cy = player.y + CELL / 2;

  renderer.setGlow('#4af', 0.5);

  // Body (white suit)
  renderer.fillRect(player.x + 8, player.y + 6, 16, 18, '#e8e8ff');

  // Head
  renderer.fillCircle(cx, player.y + 6, 7, '#ffcc88');

  // Helmet
  // Approximate half-circle helmet with a rect + circle
  renderer.fillRect(cx - 8, player.y - 3, 16, 8, '#4af');
  renderer.fillCircle(cx, player.y + 1, 8, '#4af');
  // Re-draw face area below helmet
  renderer.fillCircle(cx, player.y + 6, 6, '#ffcc88');

  // Eyes
  const eyeOffsetX = player.facingX * 2;
  renderer.fillRect(cx - 2 + eyeOffsetX, player.y + 5, 2, 2, '#222');
  renderer.fillRect(cx + 1 + eyeOffsetX, player.y + 5, 2, 2, '#222');

  // Legs
  renderer.fillRect(player.x + 10, player.y + 24, 5, 6, '#4af');
  renderer.fillRect(player.x + 17, player.y + 24, 5, 6, '#4af');

  // Pump weapon direction indicator
  const armStartX = cx + player.facingX * 10;
  const armStartY = cy + player.facingY * 10;
  const armEndX = cx + player.facingX * 14;
  const armEndY = cy + player.facingY * 14;
  renderer.drawLine(armStartX, armStartY, armEndX, armEndY, '#4af', 2);

  renderer.setGlow(null);
}

function drawPump(renderer) {
  if (!pump) return;

  const startX = pump.startCol * CELL + OFFSET_X + CELL / 2;
  const startY = pump.startRow * CELL + OFFSET_Y + CELL / 2;
  const endX = startX + pump.dx * pump.length * CELL;
  const endY = startY + pump.dy * pump.length * CELL;

  renderer.setGlow('#4af', 0.5);
  renderer.dashedLine(startX, startY, endX, endY, '#4af', 3, 4, 4);

  // Pump tip
  renderer.fillCircle(endX, endY, 4, '#fff');
  renderer.setGlow(null);
}

function drawEnemy(renderer, enemy) {
  if (!enemy.alive) return;

  const cx = enemy.x + CELL / 2;
  const cy = enemy.y + CELL / 2;
  const inflate = enemy.inflateLevel;

  // Ghost mode: draw slightly transparent-looking (lighter color)
  const ghostMode = enemy.ghost;

  if (enemy.type === 'pooka') {
    // Pooka: round red enemy with goggles
    const radius = 10 + inflate * 3;
    let bodyColor;
    if (inflate > 0) {
      const l = 60 + inflate * 10;
      // hsl(0, 100%, l%) — approximate
      const rgb = hslToHex(0, 100, l);
      bodyColor = rgb;
    } else {
      bodyColor = '#e44';
    }

    if (ghostMode) {
      bodyColor = blendColor(bodyColor, '#1a1a2e', 0.4);
    }

    renderer.setGlow('#e44', inflate > 0 ? 0.8 : 0.4);
    renderer.fillCircle(cx, cy, radius, bodyColor);

    if (inflate === 0) {
      // Goggles
      renderer.fillRect(cx - 6, cy - 4, 5, 5, '#fff');
      renderer.fillRect(cx + 1, cy - 4, 5, 5, '#fff');
      renderer.fillRect(cx - 4 + enemy.dir, cy - 2, 2, 2, '#222');
      renderer.fillRect(cx + 2 + enemy.dir, cy - 2, 2, 2, '#222');

      // Feet
      renderer.fillRect(cx - 6, cy + 8, 4, 3, '#c33');
      renderer.fillRect(cx + 2, cy + 8, 4, 3, '#c33');
    }
    renderer.setGlow(null);
  } else {
    // Fygar: green dragon enemy
    const radius = 10 + inflate * 3;
    let bodyColor;
    if (inflate > 0) {
      const l = 50 + inflate * 10;
      bodyColor = hslToHex(120, 80, l);
    } else {
      bodyColor = '#4c4';
    }

    if (ghostMode) {
      bodyColor = blendColor(bodyColor, '#1a1a2e', 0.4);
    }

    renderer.setGlow('#4c4', inflate > 0 ? 0.8 : 0.4);

    if (inflate > 0) {
      renderer.fillCircle(cx, cy, radius, bodyColor);
      // Stretched face on inflated body
      renderer.fillRect(cx - 4, cy - 3, 3, 3, '#fff');
      renderer.fillRect(cx + 2, cy - 3, 3, 3, '#fff');
      renderer.fillRect(cx - 3, cy - 2, 2, 2, '#222');
      renderer.fillRect(cx + 3, cy - 2, 2, 2, '#222');
    } else {
      // Body (rectangular for dragon)
      renderer.fillRect(cx - 10, cy - 8, 20, 16, bodyColor);
      // Snout
      if (enemy.dir > 0) {
        renderer.fillRect(cx + 6, cy - 4, 8, 8, bodyColor);
      } else {
        renderer.fillRect(cx - 14, cy - 4, 8, 8, bodyColor);
      }

      // Eyes
      renderer.fillRect(cx - 4, cy - 6, 4, 4, '#fff');
      renderer.fillRect(cx + 2, cy - 6, 4, 4, '#fff');
      renderer.fillRect(cx - 3 + enemy.dir, cy - 5, 2, 2, '#222');
      renderer.fillRect(cx + 3 + enemy.dir, cy - 5, 2, 2, '#222');

      // Tail
      const tailDir = -enemy.dir;
      renderer.fillRect(cx + tailDir * 12 - 3, cy - 2, 6, 4, '#3a3');

      // Wings (triangle)
      renderer.fillPoly([
        { x: cx, y: cy - 8 },
        { x: cx - 4, y: cy - 14 },
        { x: cx + 4, y: cy - 14 },
      ], '#5d5');

      // Fire breath
      if (enemy.fireActive) {
        renderer.setGlow('#f80', 0.7);
        const fireLen = Math.floor(enemy.fireLength);
        for (let i = 1; i <= fireLen; i++) {
          const fx = (enemy.col + enemy.fireDir * i) * CELL + OFFSET_X;
          const fy = enemy.row * CELL + OFFSET_Y;
          const fireColor = i === 1 ? '#ff4' : (i === 2 ? '#f80' : '#f44');
          renderer.fillRect(fx + 4, fy + 8, CELL - 8, CELL - 16, fireColor);
          // Flame flicker
          const flickerX = fx + 2 + Math.sin(frameCount * 0.5) * 3;
          renderer.fillRect(flickerX, fy + 4, CELL - 4, 4, fireColor);
        }
      }
    }
    renderer.setGlow(null);
  }

  // Escaping indicator
  if (enemy.escaping) {
    renderer.setGlow('#ff0', 0.4);
    renderer.fillRect(cx - 2, cy - 18, 4, 8, '#ff0');
    renderer.setGlow(null);
  }
}

function drawRock(renderer, rock) {
  const x = rock.x;
  const y = rock.y;

  let offsetX = 0;
  if (rock.wobbleTimer > 0 && !rock.falling && !rock.settled) {
    offsetX = Math.sin(rock.wobbleTimer * 0.5) * 2;
  }

  renderer.setGlow('#888', 0.2);

  // Rock body polygon
  renderer.fillPoly([
    { x: x + offsetX + 4, y: y + 2 },
    { x: x + offsetX + CELL - 4, y: y + 2 },
    { x: x + offsetX + CELL - 2, y: y + CELL / 2 },
    { x: x + offsetX + CELL - 6, y: y + CELL - 2 },
    { x: x + offsetX + 6, y: y + CELL - 2 },
    { x: x + offsetX + 2, y: y + CELL / 2 },
  ], '#778');

  // Rock highlight polygon
  renderer.fillPoly([
    { x: x + offsetX + 8, y: y + 4 },
    { x: x + offsetX + CELL - 8, y: y + 4 },
    { x: x + offsetX + CELL - 10, y: y + 12 },
    { x: x + offsetX + 10, y: y + 12 },
  ], '#99a');

  // Crack lines
  renderer.drawLine(x + offsetX + 12, y + 6, x + offsetX + 16, y + 16, '#556', 1);
  renderer.drawLine(x + offsetX + 16, y + 16, x + offsetX + 20, y + 12, '#556', 1);

  renderer.setGlow(null);
}

// ── Color helpers ──

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function blendColor(hex1, hex2, t) {
  const parse = (h) => {
    if (h.length === 4) {
      return [
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
        parseInt(h[3] + h[3], 16),
      ];
    }
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
  };

  const [r1p, g1p, b1p] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);

  const r = Math.round(r1p + (r2 - r1p) * t);
  const g = Math.round(g1p + (g2 - g1p) * t);
  const b = Math.round(b1p + (b2 - b1p) * t);
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  gameRef = game;

  game.onInit = () => {
    score = 0;
    best = 0;
    level = 1;
    lives = 3;
    frameCount = 0;
    lastMoveFrame = 0;
    levelCompleteTimer = 0;
    deathTimer = 0;
    pump = null;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    livesEl.textContent = '3';
    initLevel();
    game.showOverlay('DIG DUG', 'Arrow keys to move, SPACE to pump\nPress any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    if (player.alive) {
      movePlayer();
    }

    // Pump mechanics
    if (input.isDown(' ') && !pump && player.alive) {
      firePump();
    }
    updatePump();
    pumpEnemy();

    updateEnemies();
    updateRocks();
    handleDeath();
    checkLevelComplete();

    // Update gameData for ML
    window.gameData = {
      playerRow: player.row,
      playerCol: player.col,
      playerAlive: player.alive,
      enemies: enemies.filter(e => e.alive).map(e => ({
        row: e.row, col: e.col, type: e.type, inflate: e.inflateLevel, ghost: e.ghost
      })),
      level,
      lives,
    };
  };

  game.onDraw = (renderer, text) => {
    // Clear background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    drawSky(renderer);
    drawTunnelBackground(renderer);
    drawDirt(renderer);
    drawDepthIndicators(text);

    for (const rock of rocks) {
      drawRock(renderer, rock);
    }

    for (const enemy of enemies) {
      drawEnemy(renderer, enemy);
    }

    drawPlayer(renderer);
    drawPump(renderer);

    // Level complete text
    if (levelCompleteTimer > 0 && enemies.filter(e => e.alive).length === 0) {
      renderer.setGlow('#4af', 1.0);
      text.drawText('LEVEL COMPLETE!', W / 2, H / 2 - 12, 24, '#4af', 'center');
      renderer.setGlow(null);
    }

    // Border around play area
    renderer.drawLine(OFFSET_X, OFFSET_Y, OFFSET_X + COLS * CELL, OFFSET_Y, '#16213e', 1);
    renderer.drawLine(OFFSET_X, OFFSET_Y, OFFSET_X, OFFSET_Y + ROWS * CELL, '#16213e', 1);
    renderer.drawLine(OFFSET_X + COLS * CELL, OFFSET_Y, OFFSET_X + COLS * CELL, OFFSET_Y + ROWS * CELL, '#16213e', 1);
    renderer.drawLine(OFFSET_X, OFFSET_Y + ROWS * CELL, OFFSET_X + COLS * CELL, OFFSET_Y + ROWS * CELL, '#16213e', 1);
  };

  game.start();
  return game;
}
