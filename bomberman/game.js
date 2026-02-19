// bomberman/game.js — Bomberman game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// Grid configuration: 15 columns x 15 rows
const COLS = 15;
const ROWS = 15;
const TILE = W / COLS; // 32px per tile

// Tile types
const EMPTY = 0;
const WALL = 1;
const SOFT = 2;

// Power-up types
const PU_BOMB = 'bomb';
const PU_RANGE = 'range';
const PU_SPEED = 'speed';

// Colors
const THEME = '#f90';
const BG = '#1a1a2e';
const GRID_LINE = '#16213e';
const WALL_COLOR = '#445';
const WALL_HIGHLIGHT = '#667';
const SOFT_COLOR = '#8b6914';
const SOFT_HIGHLIGHT = '#c9a029';
const SOFT_SHADOW = '#6b4f10';
const FLOOR_COLOR = '#12122a';

// -- State --
let score, best = 0;
let grid, player, enemies, bombs, explosions, powerups;
let level;
let lives;
let pulseCounter = 0; // global frame counter for animations

// -- DOM refs --
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function updateScore(val) {
  score = val;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
}

function gridAt(gx, gy) {
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return WALL;
  return grid[gy][gx];
}

function hasBombAt(gx, gy) {
  return bombs.some(b => b.x === gx && b.y === gy);
}

function canWalk(gx, gy, isEnemy) {
  if (gridAt(gx, gy) !== EMPTY) return false;
  if (isEnemy && hasBombAt(gx, gy)) return false;
  return true;
}

function setupLevel() {
  grid = [];
  bombs = [];
  explosions = [];
  powerups = [];

  // Build grid
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        grid[r][c] = WALL;
      } else if (r % 2 === 0 && c % 2 === 0) {
        grid[r][c] = WALL;
      } else {
        grid[r][c] = EMPTY;
      }
    }
  }

  // Place soft blocks randomly
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] === EMPTY) {
        if ((r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1)) continue;
        if (Math.random() < 0.4 + level * 0.02) {
          grid[r][c] = SOFT;
        }
      }
    }
  }

  // Player setup
  player = {
    x: 1, y: 1,
    px: TILE, py: TILE,
    speed: 2.0 + (level > 3 ? 0.3 : 0),
    maxBombs: 1,
    bombRange: 2,
    activeBombs: 0,
    moving: false,
    dir: 'down',
    animTimer: 0,
    invincible: 0
  };

  // Enemies
  enemies = [];
  const enemyCount = Math.min(3 + level, 8);
  const emptyCells = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] === EMPTY) {
        const dist = Math.abs(r - 1) + Math.abs(c - 1);
        if (dist >= 5) {
          emptyCells.push({ r, c });
        }
      }
    }
  }

  // Shuffle and pick enemy positions
  for (let i = emptyCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
  }

  for (let i = 0; i < Math.min(enemyCount, emptyCells.length); i++) {
    const cell = emptyCells[i];
    const speed = 0.8 + Math.random() * 0.4 + level * 0.1;
    enemies.push({
      x: cell.c,
      y: cell.r,
      px: cell.c * TILE,
      py: cell.r * TILE,
      speed: Math.min(speed, 2.5),
      dir: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
      changeTimer: 0,
      changeCooldown: 60 + Math.floor(Math.random() * 120),
      type: i < 2 && level >= 3 ? 'fast' : 'normal',
      animTimer: Math.random() * 100
    });
  }
}

// Reference to game instance for playerHit/gameOver
let _game = null;

function placeBomb() {
  if (player.activeBombs >= player.maxBombs) return;
  const bx = player.x;
  const by = player.y;
  if (hasBombAt(bx, by)) return;

  bombs.push({
    x: bx,
    y: by,
    timer: 120,
    range: player.bombRange,
    owner: 'player',
    pulseTimer: 0
  });
  player.activeBombs++;
}

function addExplosion(gx, gy, part) {
  if (explosions.some(e => e.x === gx && e.y === gy)) return;

  explosions.push({
    x: gx,
    y: gy,
    timer: 30,
    part: part
  });

  // Kill enemies in explosion
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].x === gx && enemies[i].y === gy) {
      enemies.splice(i, 1);
      updateScore(score + 50);
    }
  }

  // Kill player in explosion
  if (player.x === gx && player.y === gy && player.invincible <= 0) {
    playerHit();
  }
}

function explodeBomb(index) {
  const b = bombs[index];
  bombs.splice(index, 1);
  if (b.owner === 'player') player.activeBombs--;

  addExplosion(b.x, b.y, 'center');

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  for (const d of dirs) {
    for (let dist = 1; dist <= b.range; dist++) {
      const ex = b.x + d.dx * dist;
      const ey = b.y + d.dy * dist;

      if (gridAt(ex, ey) === WALL) break;

      if (gridAt(ex, ey) === SOFT) {
        grid[ey][ex] = EMPTY;
        updateScore(score + 10);

        if (Math.random() < 0.3) {
          const types = [PU_BOMB, PU_RANGE, PU_SPEED];
          powerups.push({
            x: ex,
            y: ey,
            type: types[Math.floor(Math.random() * types.length)],
            timer: 600
          });
        }

        addExplosion(ex, ey, dist === b.range ? 'end' : 'mid');
        break;
      }

      addExplosion(ex, ey, dist === b.range ? 'end' : 'mid');

      const chainIdx = bombs.findIndex(ob => ob.x === ex && ob.y === ey);
      if (chainIdx !== -1) {
        explodeBomb(chainIdx);
      }
    }
  }
}

function applyPowerUp(type) {
  switch (type) {
    case PU_BOMB:
      player.maxBombs = Math.min(player.maxBombs + 1, 5);
      break;
    case PU_RANGE:
      player.bombRange = Math.min(player.bombRange + 1, 6);
      break;
    case PU_SPEED:
      player.speed = Math.min(player.speed + 0.4, 3.5);
      break;
  }
  updateScore(score + 20);
}

function playerHit() {
  if (player.invincible > 0) return;
  lives--;
  if (lives <= 0) {
    gameOver();
  } else {
    player.x = 1;
    player.y = 1;
    player.px = TILE;
    player.py = TILE;
    player.invincible = 120;
  }
}

function gameOver() {
  if (_game) {
    _game.showOverlay('GAME OVER', `Score: ${score} | Level: ${level} -- Press SPACE to restart`);
    _game.setState('over');
  }
}

function checkPlayerEnemyCollision() {
  if (player.invincible > 0) return;
  for (const e of enemies) {
    const dx = Math.abs(player.px - e.px);
    const dy = Math.abs(player.py - e.py);
    if (dx < TILE * 0.7 && dy < TILE * 0.7) {
      playerHit();
      return;
    }
  }
}

function updatePlayer(step, input) {
  let dx = 0, dy = 0;
  if (input.isDown('ArrowLeft')) { dx = -1; player.dir = 'left'; }
  else if (input.isDown('ArrowRight')) { dx = 1; player.dir = 'right'; }
  else if (input.isDown('ArrowUp')) { dy = -1; player.dir = 'up'; }
  else if (input.isDown('ArrowDown')) { dy = 1; player.dir = 'down'; }

  player.moving = (dx !== 0 || dy !== 0);
  if (player.moving) player.animTimer += step;

  if (dx !== 0 || dy !== 0) {
    const speed = player.speed * step;
    const newPx = player.px + dx * speed;
    const newPy = player.py + dy * speed;
    const margin = TILE * 0.35;

    if (dx !== 0) {
      const alignedY = Math.round(player.py / TILE) * TILE;
      const diffY = Math.abs(player.py - alignedY);
      if (diffY < margin) {
        player.py = alignedY;
        const targetGy = Math.round(player.py / TILE);
        const checkGx = dx > 0 ? Math.floor((newPx + TILE - 1) / TILE) : Math.floor(newPx / TILE);
        if (canWalk(checkGx, targetGy, false)) {
          player.px = newPx;
        }
      }
    }

    if (dy !== 0) {
      const alignedX = Math.round(player.px / TILE) * TILE;
      const diffX = Math.abs(player.px - alignedX);
      if (diffX < margin) {
        player.px = alignedX;
        const targetGx = Math.round(player.px / TILE);
        const checkGy = dy > 0 ? Math.floor((newPy + TILE - 1) / TILE) : Math.floor(newPy / TILE);
        if (canWalk(targetGx, checkGy, false)) {
          player.py = newPy;
        }
      }
    }

    player.px = Math.max(TILE, Math.min((COLS - 2) * TILE, player.px));
    player.py = Math.max(TILE, Math.min((ROWS - 2) * TILE, player.py));
    player.x = Math.round(player.px / TILE);
    player.y = Math.round(player.py / TILE);
  }
}

function updateEnemies(step) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.animTimer += step;
    e.changeTimer += step;

    const speed = e.speed * step;
    let dx = 0, dy = 0;

    switch (e.dir) {
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
    }

    const newPx = e.px + dx * speed;
    const newPy = e.py + dy * speed;
    let blocked = false;

    if (dx !== 0) {
      const alignedY = Math.round(e.py / TILE) * TILE;
      e.py = alignedY;
      const gy = Math.round(e.py / TILE);
      const checkGx = dx > 0 ? Math.floor((newPx + TILE - 1) / TILE) : Math.floor(newPx / TILE);
      if (canWalk(checkGx, gy, true)) {
        e.px = newPx;
      } else {
        blocked = true;
        e.px = Math.round(e.px / TILE) * TILE;
      }
    }

    if (dy !== 0) {
      const alignedX = Math.round(e.px / TILE) * TILE;
      e.px = alignedX;
      const gx = Math.round(e.px / TILE);
      const checkGy = dy > 0 ? Math.floor((newPy + TILE - 1) / TILE) : Math.floor(newPy / TILE);
      if (canWalk(gx, checkGy, true)) {
        e.py = newPy;
      } else {
        blocked = true;
        e.py = Math.round(e.py / TILE) * TILE;
      }
    }

    e.x = Math.round(e.px / TILE);
    e.y = Math.round(e.py / TILE);

    if (blocked || e.changeTimer >= e.changeCooldown) {
      e.changeTimer = 0;
      const dirs = ['up', 'down', 'left', 'right'].filter(d => d !== e.dir);
      const walkable = dirs.filter(d => {
        let nx = e.x, ny = e.y;
        switch (d) {
          case 'left': nx--; break;
          case 'right': nx++; break;
          case 'up': ny--; break;
          case 'down': ny++; break;
        }
        return canWalk(nx, ny, true);
      });
      if (walkable.length > 0) {
        e.dir = walkable[Math.floor(Math.random() * walkable.length)];
      } else {
        e.dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
      e.changeCooldown = 40 + Math.floor(Math.random() * 100);
    }
  }
}

function updateBombs(step) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.timer -= step;
    b.pulseTimer += step;
    if (b.timer <= 0) {
      explodeBomb(i);
    }
  }
}

function updateExplosions(step) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].timer -= step;
    if (explosions[i].timer <= 0) {
      explosions.splice(i, 1);
    }
  }

  // Check if player walks into active explosion
  for (const exp of explosions) {
    if (player.x === exp.x && player.y === exp.y && player.invincible <= 0) {
      playerHit();
    }
  }

  // Check if enemies walk into active explosion
  for (let i = enemies.length - 1; i >= 0; i--) {
    for (const exp of explosions) {
      if (enemies[i] && enemies[i].x === exp.x && enemies[i].y === exp.y) {
        enemies.splice(i, 1);
        updateScore(score + 50);
        break;
      }
    }
  }

  // Power-up collection
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    pu.timer -= step;
    if (pu.timer <= 0) {
      powerups.splice(i, 1);
      continue;
    }
    if (player.x === pu.x && player.y === pu.y) {
      applyPowerUp(pu.type);
      powerups.splice(i, 1);
    }
  }
}

// ---- DRAWING ----

function drawGrid(renderer) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const tile = grid[r][c];

      if (tile === WALL) {
        // Indestructible wall - dark gray bricks
        renderer.fillRect(x, y, TILE, TILE, WALL_COLOR);
        // Brick pattern
        renderer.fillRect(x + 1, y + 1, TILE - 2, TILE / 2 - 1, WALL_HIGHLIGHT);
        renderer.fillRect(x + 1, y + TILE / 2 + 1, TILE - 2, TILE / 2 - 2, WALL_HIGHLIGHT);
        // Mortar lines
        renderer.fillRect(x, y + TILE / 2 - 1, TILE, 2, '#333');
        renderer.fillRect(x + TILE / 2, y, 2, TILE / 2 - 1, '#333');
        renderer.fillRect(x + TILE / 4, y + TILE / 2 + 1, 2, TILE / 2 - 2, '#333');
      } else if (tile === SOFT) {
        // Destructible block - brownish
        renderer.fillRect(x + 1, y + 1, TILE - 2, TILE - 2, SOFT_COLOR);
        // Highlight edges
        renderer.fillRect(x + 3, y + 3, TILE - 6, 3, SOFT_HIGHLIGHT);
        renderer.fillRect(x + 3, y + 3, 3, TILE - 6, SOFT_HIGHLIGHT);
        // Shadow edges
        renderer.fillRect(x + TILE - 5, y + 4, 2, TILE - 8, SOFT_SHADOW);
        renderer.fillRect(x + 4, y + TILE - 5, TILE - 8, 2, SOFT_SHADOW);
      } else {
        // Empty - dark floor with subtle grid lines
        renderer.fillRect(x, y, TILE, TILE, FLOOR_COLOR);
        // Grid outline approximation using thin rects
        renderer.fillRect(x, y, TILE, 1, GRID_LINE);
        renderer.fillRect(x, y, 1, TILE, GRID_LINE);
      }
    }
  }
}

function drawPlayer(renderer) {
  const x = player.px;
  const y = player.py;
  const s = TILE;
  const flash = player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0;

  // Skip drawing on flash frames to simulate blinking
  if (flash) return;

  // Body glow
  renderer.setGlow('#f90', 0.5);

  // Head (circle)
  renderer.fillCircle(x + s / 2, y + s * 0.3, s * 0.25, '#fff');

  // Body (rectangle)
  renderer.fillRect(x + s * 0.25, y + s * 0.45, s * 0.5, s * 0.35, '#fff');

  renderer.setGlow(null);

  // Eyes
  const eyeOffset = player.dir === 'left' ? -2 : player.dir === 'right' ? 2 : 0;
  const eyeYOffset = player.dir === 'up' ? -1 : player.dir === 'down' ? 1 : 0;
  renderer.fillRect(x + s * 0.38 + eyeOffset, y + s * 0.25 + eyeYOffset, 3, 3, '#222');
  renderer.fillRect(x + s * 0.55 + eyeOffset, y + s * 0.25 + eyeYOffset, 3, 3, '#222');

  // Feet animation
  const walkPhase = Math.sin(player.animTimer * 0.3);
  if (player.moving) {
    renderer.fillRect(x + s * 0.28, y + s * 0.78 + walkPhase * 2, s * 0.18, s * 0.12, '#f90');
    renderer.fillRect(x + s * 0.54, y + s * 0.78 - walkPhase * 2, s * 0.18, s * 0.12, '#f90');
  } else {
    renderer.fillRect(x + s * 0.28, y + s * 0.78, s * 0.18, s * 0.12, '#f90');
    renderer.fillRect(x + s * 0.54, y + s * 0.78, s * 0.18, s * 0.12, '#f90');
  }
}

function drawEnemies(renderer) {
  for (const e of enemies) {
    const x = e.px;
    const y = e.py;
    const s = TILE;
    const bob = Math.sin(e.animTimer * 0.15) * 2;

    const bodyColor = e.type === 'fast' ? '#f44' : '#a4f';

    renderer.setGlow(bodyColor, 0.5);

    // Ghost-like body: approximate with a circle (head) + rect (body) + wavy bottom rects
    // Head dome
    renderer.fillCircle(x + s / 2, y + s * 0.35 + bob, s * 0.3, bodyColor);
    // Body rectangle
    renderer.fillRect(x + s * 0.2, y + s * 0.35 + bob, s * 0.6, s * 0.4, bodyColor);

    // Wavy bottom: draw small rects for tentacles
    const wavePhase = e.animTimer * 0.2;
    for (let i = 0; i < 4; i++) {
      const tentX = x + s * 0.2 + i * s * 0.15;
      const tentY = y + s * 0.72 + bob + Math.sin(wavePhase + i * 1.5) * 2;
      renderer.fillRect(tentX, tentY, s * 0.15, s * 0.08, bodyColor);
    }

    renderer.setGlow(null);

    // Eyes (white circles)
    renderer.fillCircle(x + s * 0.37, y + s * 0.33 + bob, 4, '#fff');
    renderer.fillCircle(x + s * 0.63, y + s * 0.33 + bob, 4, '#fff');

    // Pupils
    const lookDx = e.dir === 'left' ? -1 : e.dir === 'right' ? 1 : 0;
    const lookDy = e.dir === 'up' ? -1 : e.dir === 'down' ? 1 : 0;
    renderer.fillCircle(x + s * 0.37 + lookDx * 2, y + s * 0.33 + bob + lookDy * 1, 2, '#222');
    renderer.fillCircle(x + s * 0.63 + lookDx * 2, y + s * 0.33 + bob + lookDy * 1, 2, '#222');
  }
}

function drawBombs(renderer) {
  for (const b of bombs) {
    const x = b.x * TILE;
    const y = b.y * TILE;
    const s = TILE;
    const pulse = 1.0 + Math.sin(b.pulseTimer * 0.3) * 0.1;
    const urgency = b.timer < 30 ? 1.0 + Math.sin(b.pulseTimer * 0.8) * 0.15 : 1.0;
    const r = s * 0.35 * pulse * urgency;

    // Bomb body with glow
    const glowColor = b.timer < 30 ? '#f44' : '#f90';
    renderer.setGlow(glowColor, b.timer < 30 ? 0.8 : 0.5);
    renderer.fillCircle(x + s / 2, y + s / 2 + 2, r, '#333');
    renderer.setGlow(null);

    // Highlight
    renderer.fillCircle(x + s / 2 - 3, y + s / 2 - 2, r * 0.3, '#555');

    // Fuse (approximate bezier with a line)
    const fuseColor = b.timer < 30 ? '#f44' : '#f90';
    renderer.drawLine(x + s / 2, y + s / 2 - r, x + s / 2 + 3, y + s / 2 - r - 10, fuseColor, 2);

    // Spark at fuse tip
    if (pulseCounter % 3 !== 0) {
      renderer.setGlow('#ff0', 0.6);
      renderer.fillCircle(x + s / 2 + 3, y + s / 2 - r - 10, 2, '#ff0');
      renderer.setGlow(null);
    }
  }
}

function drawExplosions(renderer) {
  for (const exp of explosions) {
    const x = exp.x * TILE;
    const y = exp.y * TILE;
    const s = TILE;
    const intensity = exp.timer / 30;

    // Outer glow
    renderer.setGlow('#f90', intensity);
    renderer.fillRect(x - 2, y - 2, s + 4, s + 4, '#f64000');
    renderer.setGlow(null);

    // Inner fire
    renderer.fillRect(x + 2, y + 2, s - 4, s - 4, '#ffc832');

    // Hot core
    renderer.fillRect(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.5, '#ffffc8');
  }
}

function drawPowerUps(renderer, text) {
  for (const pu of powerups) {
    const x = pu.x * TILE;
    const y = pu.y * TILE;
    const s = TILE;
    const pulse = 0.8 + Math.sin(pulseCounter * 0.08) * 0.2;

    // Blinking when about to expire
    if (pu.timer < 120 && Math.floor(pu.timer / 8) % 2 === 0) continue;

    switch (pu.type) {
      case PU_BOMB: {
        // Extra bomb: blue circle with B
        renderer.setGlow('#4af', 0.6);
        renderer.fillCircle(x + s / 2, y + s / 2, s * 0.3 * pulse, '#4af');
        renderer.setGlow(null);
        text.drawText('B', x + s / 2, y + s / 2 - 7, 14, '#fff', 'center');
        break;
      }
      case PU_RANGE: {
        // Range up: red diamond (rotated square approximated with a polygon)
        const sz = s * 0.3 * pulse;
        const cx = x + s / 2;
        const cy = y + s / 2;
        renderer.setGlow('#f44', 0.6);
        renderer.fillPoly([
          { x: cx, y: cy - sz },
          { x: cx + sz, y: cy },
          { x: cx, y: cy + sz },
          { x: cx - sz, y: cy }
        ], '#f44');
        renderer.setGlow(null);
        text.drawText('R', cx, cy - 7, 14, '#fff', 'center');
        break;
      }
      case PU_SPEED: {
        // Speed up: green triangle with S
        const sz = s * 0.35 * pulse;
        const cx = x + s / 2;
        const cy = y + s / 2;
        renderer.setGlow('#4f4', 0.6);
        renderer.fillPoly([
          { x: cx, y: cy - sz },
          { x: cx + sz, y: cy + sz * 0.7 },
          { x: cx - sz, y: cy + sz * 0.7 }
        ], '#4f4');
        renderer.setGlow(null);
        text.drawText('S', cx, cy - 5, 12, '#fff', 'center');
        break;
      }
    }
  }
}

function drawHUD(renderer, text) {
  // Semi-transparent bar at top
  renderer.fillRect(0, 0, W, TILE, 'rgba(26, 26, 46, 0.7)');

  // Lives text
  text.drawText('Lives:', 6, 4, 13, '#f90', 'left');

  // Lives circles
  for (let i = 0; i < lives; i++) {
    renderer.fillCircle(62 + i * 18 + 6, TILE / 2, 5, '#fff');
  }

  // Level text centered
  text.drawText('Level ' + level, W / 2, 4, 13, '#f90', 'center');

  // Power-up status right-aligned
  const statusText = 'B:' + player.maxBombs + ' | R:' + player.bombRange;
  text.drawText(statusText, W - 6, 6, 11, '#aaa', 'right');
}

export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    level = 1;
    lives = 3;
    pulseCounter = 0;
    setupLevel();
    game.showOverlay('BOMBERMAN', 'Arrows: Move | Space: Bomb -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    pulseCounter++;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        game.hideOverlay();
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
    // Normalize to ~60fps: the engine calls onUpdate at fixed 60Hz,
    // so step ~= 1.0
    const step = 1.0;

    // Update player invincibility
    if (player.invincible > 0) player.invincible -= step;

    // Player movement
    updatePlayer(step, input);

    // Place bomb
    if (input.wasPressed(' ')) {
      placeBomb();
    }

    // Update enemies
    updateEnemies(step);

    // Update bombs
    updateBombs(step);

    // Update explosions
    updateExplosions(step);

    // Check if player hits enemy
    checkPlayerEnemyCollision();

    // Check if level complete
    if (enemies.length === 0) {
      score += 100 * level;
      updateScore(score);
      level++;
      setupLevel();
    }
  };

  game.onDraw = (renderer, text) => {
    drawGrid(renderer);
    drawPowerUps(renderer, text);
    drawBombs(renderer);
    drawExplosions(renderer);
    drawEnemies(renderer);
    drawPlayer(renderer);
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
