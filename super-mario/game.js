// super-mario/game.js — Super Mario game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 512;
const H = 400;

// --- Constants ---
const TILE = 32;
const GRAVITY = 0.6;
const PLAYER_SPEED = 3.5;
const PLAYER_RUN_SPEED = 5;
const JUMP_FORCE = -11;
const JUMP_HOLD_FORCE = -0.4;
const JUMP_HOLD_FRAMES = 12;
const MAX_FALL = 10;
const COIN_SCORE = 100;
const STOMP_SCORE = 200;
const BLOCK_COIN_SCORE = 50;
const FLAG_SCORE = 1000;
const LEVEL_CLEAR_BONUS = 500;

// --- Game state ---
let score, best = 0;
let lives, level;
let player, camera;
let tiles, coins, enemies, questionBlocks, particles, flagObj;
let jumpHoldTimer;
let levelWidth;
let levelComplete;
let levelCompleteTimer;
let frameCount;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const levelDispEl = document.getElementById('levelDisp');

// --- Level Generation ---
// Tile types: 0=air, 1=ground, 2=brick, 3=question(active), 4=question(used),
//             5=pipe-left, 6=pipe-right, 7=pipe-top-left, 8=pipe-top-right
function generateLevel(lvl) {
  const cols = 100 + lvl * 20;
  levelWidth = cols * TILE;
  const rows = Math.ceil(H / TILE); // 13 rows for 400px
  tiles = Array.from({ length: rows }, () => Array(cols).fill(0));
  coins = [];
  enemies = [];
  questionBlocks = [];
  particles = [];

  // Ground: rows 11 and 12 (bottom two rows)
  const groundRow1 = rows - 2;
  const groundRow2 = rows - 1;
  for (let c = 0; c < cols; c++) {
    tiles[groundRow1][c] = 1;
    tiles[groundRow2][c] = 1;
  }

  // Add gaps in ground
  const numGaps = 2 + lvl;
  for (let g = 0; g < numGaps; g++) {
    const gapStart = 15 + Math.floor(Math.random() * (cols - 30));
    const gapLen = 2 + Math.floor(Math.random() * 2);
    for (let c = gapStart; c < gapStart + gapLen && c < cols; c++) {
      tiles[groundRow1][c] = 0;
      tiles[groundRow2][c] = 0;
    }
  }

  // Platforms (brick and question blocks)
  const numPlatforms = 8 + lvl * 3;
  for (let i = 0; i < numPlatforms; i++) {
    const px = 8 + Math.floor(Math.random() * (cols - 16));
    const py = 4 + Math.floor(Math.random() * 5);
    const plen = 2 + Math.floor(Math.random() * 5);
    for (let c = px; c < px + plen && c < cols; c++) {
      if (Math.random() < 0.25) {
        tiles[py][c] = 3;
        questionBlocks.push({ col: c, row: py, active: true, animTimer: 0 });
      } else {
        tiles[py][c] = 2;
      }
    }
  }

  // Pipes
  const numPipes = 3 + lvl;
  for (let i = 0; i < numPipes; i++) {
    const px = 12 + Math.floor(Math.random() * (cols - 20));
    const pipeH = 2 + Math.floor(Math.random() * 2);
    const baseRow = groundRow1 - 1;
    if (tiles[groundRow1][px] === 0 || tiles[groundRow1][px + 1] === 0) continue;
    for (let r = baseRow; r > baseRow - pipeH; r--) {
      if (r < 0) continue;
      if (r === baseRow - pipeH + 1) {
        tiles[r][px] = 7;
        tiles[r][px + 1] = 8;
      } else {
        tiles[r][px] = 5;
        tiles[r][px + 1] = 6;
      }
    }
  }

  // Coins (floating)
  const numCoins = 10 + lvl * 5;
  for (let i = 0; i < numCoins; i++) {
    const cx = 5 + Math.floor(Math.random() * (cols - 10));
    const cy = 2 + Math.floor(Math.random() * 7);
    if (tiles[cy][cx] === 0) {
      coins.push({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2, collected: false, sparkle: Math.random() * Math.PI * 2 });
    }
  }

  // Enemies
  const numEnemies = 4 + lvl * 2;
  for (let i = 0; i < numEnemies; i++) {
    const ex = 10 + Math.floor(Math.random() * (cols - 15));
    if (tiles[groundRow1][ex] === 1) {
      enemies.push({
        x: ex * TILE,
        y: (groundRow1 - 1) * TILE,
        w: TILE,
        h: TILE,
        vx: (Math.random() < 0.5 ? -1 : 1) * (1 + lvl * 0.2),
        alive: true,
        type: Math.random() < 0.3 + lvl * 0.05 ? 'shell' : 'goomba',
        squishTimer: 0
      });
    }
  }

  // Flag at end
  flagObj = {
    x: (cols - 5) * TILE,
    y: 2 * TILE,
    height: (groundRow1 - 2) * TILE,
    reached: false
  };
}

function initPlayer() {
  player = {
    x: 3 * TILE,
    y: 9 * TILE,
    w: 24,
    h: 30,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    walkFrame: 0,
    walkTimer: 0,
    invincible: 0,
    dead: false
  };
  camera = { x: 0 };
  jumpHoldTimer = 0;
  levelComplete = false;
  levelCompleteTimer = 0;
}

// --- Collision helpers ---
function tileAt(px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  const rows = tiles.length;
  const cols = tiles[0].length;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return 0;
  return tiles[row][col];
}

function isSolid(t) {
  return t === 1 || t === 2 || t === 3 || t === 4 || t === 5 || t === 6 || t === 7 || t === 8;
}

function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolveCollisionX() {
  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w - 1) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h - 1) / TILE);

  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (isSolid(tileAt(c * TILE, r * TILE))) {
        if (player.vx > 0) {
          player.x = c * TILE - player.w;
        } else if (player.vx < 0) {
          player.x = (c + 1) * TILE;
        }
        player.vx = 0;
      }
    }
  }
}

function resolveCollisionY() {
  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w - 1) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h - 1) / TILE);

  player.onGround = false;

  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (isSolid(tileAt(c * TILE, r * TILE))) {
        if (player.vy > 0) {
          player.y = r * TILE - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = (r + 1) * TILE;
          player.vy = 0;
        }
      }
    }
  }
}

export function createGame() {
  const game = new Game('game');

  function doGameOver() {
    game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
    game.setState('over');
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
  }

  function loseLife() {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      doGameOver();
    } else {
      player.dead = false;
      player.invincible = 90;
      initPlayer();
      player.invincible = 90;
    }
  }

  function nextLevel() {
    level++;
    levelDispEl.textContent = level;
    score += LEVEL_CLEAR_BONUS * level;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    generateLevel(level);
    initPlayer();
  }

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    frameCount = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelDispEl.textContent = '1';
    generateLevel(level);
    initPlayer();
    game.showOverlay('SUPER MARIO', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    if (player.dead) return;

    if (levelComplete) {
      levelCompleteTimer++;
      player.x += 2;
      player.walkTimer++;
      if (player.walkTimer > 6) { player.walkTimer = 0; player.walkFrame = (player.walkFrame + 1) % 3; }
      if (levelCompleteTimer > 90) {
        nextLevel();
      }
      return;
    }

    // Invincibility timer
    if (player.invincible > 0) player.invincible--;

    // Horizontal movement
    const running = input.isDown('Shift');
    const speed = running ? PLAYER_RUN_SPEED : PLAYER_SPEED;
    if (input.isDown('ArrowLeft') || input.isDown('a')) {
      player.vx = -speed;
      player.facing = -1;
    } else if (input.isDown('ArrowRight') || input.isDown('d')) {
      player.vx = speed;
      player.facing = 1;
    } else {
      player.vx *= 0.7;
      if (Math.abs(player.vx) < 0.3) player.vx = 0;
    }

    // Jump
    if ((input.isDown(' ') || input.isDown('ArrowUp') || input.isDown('w')) && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      jumpHoldTimer = JUMP_HOLD_FRAMES;
    }
    // Variable jump height
    if ((input.isDown(' ') || input.isDown('ArrowUp') || input.isDown('w')) && jumpHoldTimer > 0) {
      player.vy += JUMP_HOLD_FORCE;
      jumpHoldTimer--;
    }
    if (!(input.isDown(' ') || input.isDown('ArrowUp') || input.isDown('w'))) {
      jumpHoldTimer = 0;
    }

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    // Walk animation
    if (Math.abs(player.vx) > 0.5 && player.onGround) {
      player.walkTimer++;
      if (player.walkTimer > 6) {
        player.walkTimer = 0;
        player.walkFrame = (player.walkFrame + 1) % 3;
      }
    } else if (player.onGround) {
      player.walkFrame = 0;
    }

    // Move X
    player.x += player.vx;
    resolveCollisionX();

    // Move Y
    player.y += player.vy;
    resolveCollisionY();

    // Clamp to level bounds
    if (player.x < 0) player.x = 0;
    if (player.x > levelWidth - player.w) player.x = levelWidth - player.w;

    // Fall into pit
    if (player.y > H + TILE) {
      player.dead = true;
      loseLife();
      return;
    }

    // Camera follows player
    camera.x = player.x - W / 3;
    if (camera.x < 0) camera.x = 0;
    if (camera.x > levelWidth - W) camera.x = levelWidth - W;

    // Coin collection
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.collected) continue;
      const dx = (player.x + player.w / 2) - c.x;
      const dy = (player.y + player.h / 2) - c.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        c.collected = true;
        score += COIN_SCORE;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        for (let p = 0; p < 5; p++) {
          particles.push({
            x: c.x, y: c.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 1) * 3,
            life: 20 + Math.random() * 10,
            color: '#ff0'
          });
        }
      }
    }

    // Enemy interaction
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) {
        if (e.squishTimer > 0) e.squishTimer--;
        continue;
      }

      // Move enemy
      e.x += e.vx;

      // Enemy-tile collision
      const eFoot = e.y + e.h;
      const eCenter = e.x + e.w / 2;
      const belowTile = tileAt(eCenter, eFoot + 1);
      if (!isSolid(belowTile)) {
        e.vx = -e.vx;
      }
      const sideTile = tileAt(e.vx > 0 ? e.x + e.w : e.x - 1, e.y + e.h / 2);
      if (isSolid(sideTile)) {
        e.vx = -e.vx;
      }

      // Player collision
      if (player.invincible > 0) continue;
      if (rectCollide(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) {
        if (player.vy > 0 && player.y + player.h - e.y < player.h * 0.5) {
          // Stomp!
          e.alive = false;
          e.squishTimer = 20;
          player.vy = JUMP_FORCE * 0.6;
          score += STOMP_SCORE;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          for (let p = 0; p < 6; p++) {
            particles.push({
              x: e.x + e.w / 2, y: e.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 1) * 4,
              life: 15 + Math.random() * 10,
              color: '#f42'
            });
          }
        } else {
          // Damaged by enemy
          player.dead = true;
          loseLife();
          return;
        }
      }
    }

    // Question block hit (from below)
    for (let i = 0; i < questionBlocks.length; i++) {
      const qb = questionBlocks[i];
      if (!qb.active) continue;
      const bx = qb.col * TILE;
      const by = qb.row * TILE;
      if (player.vy < 0 &&
          rectCollide(player.x, player.y, player.w, 4, bx, by + TILE - 4, TILE, 4)) {
        qb.active = false;
        qb.animTimer = 10;
        tiles[qb.row][qb.col] = 4;
        score += BLOCK_COIN_SCORE;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        for (let p = 0; p < 4; p++) {
          particles.push({
            x: bx + TILE / 2, y: by,
            vx: (Math.random() - 0.5) * 2,
            vy: -3 - Math.random() * 2,
            life: 25 + Math.random() * 10,
            color: '#ff0'
          });
        }
      }
    }

    // Brick breaking (from below)
    {
      const headX = player.x + player.w / 2;
      const headY = player.y - 1;
      const col = Math.floor(headX / TILE);
      const row = Math.floor(headY / TILE);
      if (row >= 0 && row < tiles.length && col >= 0 && col < tiles[0].length) {
        if (tiles[row][col] === 2 && player.vy < 0) {
          tiles[row][col] = 0;
          for (let p = 0; p < 6; p++) {
            particles.push({
              x: col * TILE + TILE / 2,
              y: row * TILE + TILE / 2,
              vx: (Math.random() - 0.5) * 6,
              vy: -2 - Math.random() * 4,
              life: 20 + Math.random() * 15,
              color: '#c84'
            });
          }
          score += 10;
          scoreEl.textContent = score;
        }
      }
    }

    // Flag/goal check
    if (!flagObj.reached && player.x + player.w > flagObj.x && player.x < flagObj.x + TILE) {
      flagObj.reached = true;
      levelComplete = true;
      levelCompleteTimer = 0;
      score += FLAG_SCORE;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Question block animation
    for (let i = 0; i < questionBlocks.length; i++) {
      if (questionBlocks[i].animTimer > 0) questionBlocks[i].animTimer--;
    }

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerVX: player.vx,
      playerVY: player.vy,
      onGround: player.onGround,
      cameraX: camera.x,
      level: level,
      lives: lives,
      enemyCount: enemies.filter(e => e.alive).length,
      coinCount: coins.filter(c => !c.collected).length
    };
  };

  game.onDraw = (renderer, text) => {
    const cx = camera ? camera.x : 0;
    // Use frameCount for animation time (consistent with fixed timestep)
    const time = frameCount / 60;

    // Background stars (parallax)
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 50) % (levelWidth * 0.5)) - cx * 0.3;
      const sy = (i * 97 + 30) % (H * 0.6);
      if (sx > -5 && sx < W + 5) {
        renderer.fillRect(sx, sy, 2, 2, '#2a2a4e');
      }
    }

    // Draw tiles (only visible columns)
    const startCol = Math.max(0, Math.floor(cx / TILE) - 1);
    const endCol = Math.min(tiles[0].length, Math.ceil((cx + W) / TILE) + 1);

    for (let r = 0; r < tiles.length; r++) {
      for (let c = startCol; c < endCol; c++) {
        const t = tiles[r][c];
        if (t === 0) continue;
        const tx = c * TILE - cx;
        const ty = r * TILE;
        drawTile(renderer, text, tx, ty, t, r, c);
      }
    }

    // Draw coins
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (c.collected) continue;
      const sx = c.x - cx;
      const sy = c.y;
      if (sx < -20 || sx > W + 20) continue;
      drawCoin(renderer, sx, sy, time + c.sparkle);
    }

    // Draw flag
    if (flagObj) {
      const fx = flagObj.x - cx;
      // Pole
      renderer.setGlow('#fff', 0.3);
      renderer.fillRect(fx + TILE / 2 - 2, flagObj.y, 4, flagObj.height, '#aaa');
      renderer.setGlow(null);
      // Flag triangle
      renderer.setGlow('#f42', 0.6);
      renderer.fillPoly([
        { x: fx + TILE / 2 + 2, y: flagObj.y + 5 },
        { x: fx + TILE / 2 + 22, y: flagObj.y + 18 },
        { x: fx + TILE / 2 + 2, y: flagObj.y + 30 }
      ], '#f42');
      renderer.setGlow(null);
      // Ball on top
      renderer.setGlow('#ff0', 0.5);
      renderer.fillCircle(fx + TILE / 2, flagObj.y, 5, '#ff0');
      renderer.setGlow(null);
    }

    // Draw enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const ex = e.x - cx;
      if (ex < -TILE || ex > W + TILE) continue;
      if (e.alive) {
        drawEnemy(renderer, ex, e.y, e.type, time);
      } else if (e.squishTimer > 0) {
        renderer.fillRect(ex + 4, e.y + e.h - 8, e.w - 8, 8, '#666');
      }
    }

    // Draw player
    if (player && !player.dead) {
      if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
        // Blink when invincible -- skip draw
      } else {
        drawPlayer(renderer, player.x - cx, player.y);
      }
    }

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const px = p.x - cx;
      if (px < -10 || px > W + 10) continue;
      renderer.setGlow(p.color, 0.4);
      renderer.fillRect(px - 2, p.y - 2, 4, 4, p.color);
      renderer.setGlow(null);
    }

    // Question block bounce animation (coin pop)
    for (let i = 0; i < questionBlocks.length; i++) {
      const qb = questionBlocks[i];
      if (qb.animTimer > 0) {
        const bx = qb.col * TILE - cx;
        const by = qb.row * TILE - Math.sin(qb.animTimer / 10 * Math.PI) * 8;
        renderer.setGlow('#ff0', 0.6);
        renderer.fillCircle(bx + TILE / 2, by - 10, 6, '#ff0');
        renderer.setGlow(null);
      }
    }

    // Level complete text
    if (levelComplete) {
      text.drawText('LEVEL CLEAR!', W / 2, H / 2 - 30, 32, '#f42', 'center');
      text.drawText(`+${FLAG_SCORE + LEVEL_CLEAR_BONUS * level} pts`, W / 2, H / 2 + 10, 18, '#ff0', 'center');
    }

    // Lives display (hearts) on canvas
    for (let i = 0; i < lives; i++) {
      renderer.setGlow('#f42', 0.4);
      drawHeart(renderer, 10 + i * 22, 8, 8);
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}

// --- Drawing helpers ---

function drawHeart(renderer, x, y, s) {
  // Approximate heart with small rects
  const hs = s * 0.5;
  renderer.fillCircle(x + hs * 0.5, y + hs * 0.3, hs * 0.5, '#f42');
  renderer.fillCircle(x + hs * 1.5, y + hs * 0.3, hs * 0.5, '#f42');
  renderer.fillPoly([
    { x: x, y: y + hs * 0.5 },
    { x: x + s, y: y + hs * 0.5 },
    { x: x + s * 0.5, y: y + s }
  ], '#f42');
}

function drawTile(renderer, text, x, y, type, row, col) {
  switch (type) {
    case 1: // Ground
      renderer.fillRect(x, y, TILE, TILE, '#3a5a2a');
      renderer.fillRect(x, y, TILE, 4, '#2a4a1a');
      // Top grass highlight
      if (row > 0 && !isSolid(tiles[row - 1][col])) {
        renderer.fillRect(x, y, TILE, 5, '#5a8a3a');
      }
      // Grid line borders (thin darker rects on edges)
      renderer.fillRect(x, y, 1, TILE, '#2a4a1a');
      renderer.fillRect(x + TILE - 1, y, 1, TILE, '#2a4a1a');
      renderer.fillRect(x, y, TILE, 1, '#2a4a1a');
      renderer.fillRect(x, y + TILE - 1, TILE, 1, '#2a4a1a');
      break;
    case 2: // Brick
      renderer.fillRect(x, y, TILE, TILE, '#a44');
      // Border
      renderer.fillRect(x, y, TILE, 1, '#722');
      renderer.fillRect(x, y + TILE - 1, TILE, 1, '#722');
      renderer.fillRect(x, y, 1, TILE, '#722');
      renderer.fillRect(x + TILE - 1, y, 1, TILE, '#722');
      // Brick pattern: horizontal line at middle, vertical lines
      renderer.fillRect(x, y + TILE / 2, TILE, 1, '#622');
      renderer.fillRect(x + TILE / 2, y, 1, TILE / 2, '#622');
      renderer.fillRect(x + TILE / 4, y + TILE / 2, 1, TILE / 2, '#622');
      renderer.fillRect(x + TILE * 3 / 4, y + TILE / 2, 1, TILE / 2, '#622');
      break;
    case 3: // Question block (active)
      renderer.setGlow('#ff0', 0.5);
      renderer.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, '#d90');
      renderer.setGlow(null);
      // Border
      renderer.fillRect(x + 2, y + 2, TILE - 4, 1, '#a70');
      renderer.fillRect(x + 2, y + TILE - 3, TILE - 4, 1, '#a70');
      renderer.fillRect(x + 2, y + 2, 1, TILE - 4, '#a70');
      renderer.fillRect(x + TILE - 3, y + 2, 1, TILE - 4, '#a70');
      // Question mark
      text.drawText('?', x + TILE / 2, y + 4, 18, '#fff', 'center');
      break;
    case 4: // Question block (used)
      renderer.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, '#554');
      renderer.fillRect(x + 2, y + 2, TILE - 4, 1, '#443');
      renderer.fillRect(x + 2, y + TILE - 3, TILE - 4, 1, '#443');
      renderer.fillRect(x + 2, y + 2, 1, TILE - 4, '#443');
      renderer.fillRect(x + TILE - 3, y + 2, 1, TILE - 4, '#443');
      break;
    case 5: // Pipe body left
    case 7: // Pipe top left
      renderer.setGlow('#0f8', 0.3);
      renderer.fillRect(x, y, TILE, TILE, '#0a6');
      renderer.setGlow(null);
      renderer.fillRect(x, y, 6, TILE, '#0c8');
      if (type === 7) {
        renderer.fillRect(x - 4, y, TILE + 4, 6, '#0e9');
      }
      break;
    case 6: // Pipe body right
    case 8: // Pipe top right
      renderer.setGlow('#0f8', 0.3);
      renderer.fillRect(x, y, TILE, TILE, '#0a6');
      renderer.setGlow(null);
      renderer.fillRect(x + TILE - 6, y, 6, TILE, '#086');
      if (type === 8) {
        renderer.fillRect(x, y, TILE + 4, 6, '#0e9');
      }
      break;
  }
}

function drawCoin(renderer, x, y, t) {
  const wobble = Math.sin(t * 3) * 0.3 + 0.7;
  // Outer coin (ellipse approximated as scaled circle)
  const rw = 8 * wobble;
  const rh = 8;
  renderer.setGlow('#ff0', 0.6);
  // Approximate ellipse with a wider rect and circle combo
  renderer.fillCircle(x, y, Math.min(rw, rh), '#ff0');
  if (rw > rh) {
    renderer.fillRect(x - rw, y - rh, rw * 2, rh * 2, '#ff0');
  }
  renderer.setGlow(null);
  // Inner shine
  renderer.fillCircle(x, y, Math.min(4 * wobble, 4), '#fa0');

  // Sparkle effect
  const sparkle = Math.sin(t * 5);
  if (sparkle > 0.7) {
    renderer.fillRect(x - 1, y - 12, 2, 6, '#fff');
    renderer.fillRect(x + 8, y - 1, 6, 2, '#fff');
    renderer.fillRect(x - 14, y - 1, 6, 2, '#fff');
    renderer.fillRect(x - 1, y + 8, 2, 6, '#fff');
  }
}

function drawEnemy(renderer, x, y, type, t) {
  if (type === 'goomba') {
    // Body (ellipse approximated as circle + rect)
    renderer.setGlow('#c86', 0.4);
    renderer.fillCircle(x + TILE / 2, y + TILE * 0.6, TILE * 0.4, '#a64');
    renderer.setGlow(null);
    // Feet
    renderer.fillRect(x + 4, y + TILE - 8, 10, 8, '#742');
    renderer.fillRect(x + TILE - 14, y + TILE - 8, 10, 8, '#742');
    // Eyes
    renderer.fillRect(x + 8, y + TILE * 0.35, 6, 6, '#fff');
    renderer.fillRect(x + TILE - 14, y + TILE * 0.35, 6, 6, '#fff');
    // Pupils
    renderer.fillRect(x + 10, y + TILE * 0.38, 3, 4, '#000');
    renderer.fillRect(x + TILE - 12, y + TILE * 0.38, 3, 4, '#000');
    // Angry eyebrows
    renderer.drawLine(x + 7, y + TILE * 0.32, x + 15, y + TILE * 0.3, '#520', 2);
    renderer.drawLine(x + TILE - 7, y + TILE * 0.32, x + TILE - 15, y + TILE * 0.3, '#520', 2);
  } else {
    // Shell enemy (koopa-like)
    // Shell body (lower half)
    renderer.setGlow('#0f0', 0.4);
    renderer.fillCircle(x + TILE / 2, y + TILE * 0.6, TILE * 0.38, '#0a0');
    renderer.setGlow(null);
    // Shell top highlight
    renderer.fillRect(x + TILE / 2 - TILE * 0.35, y + TILE * 0.3, TILE * 0.7, TILE * 0.3, '#0c0');
    // Head
    renderer.fillCircle(x + TILE / 2, y + TILE * 0.25, 8, '#8d4');
    // Eyes
    renderer.fillRect(x + TILE / 2 - 5, y + TILE * 0.2, 4, 4, '#fff');
    renderer.fillRect(x + TILE / 2 + 1, y + TILE * 0.2, 4, 4, '#fff');
    // Pupils
    renderer.fillRect(x + TILE / 2 - 4, y + TILE * 0.22, 2, 3, '#000');
    renderer.fillRect(x + TILE / 2 + 2, y + TILE * 0.22, 2, 3, '#000');
    // Feet
    renderer.fillRect(x + 4, y + TILE - 6, 8, 6, '#a80');
    renderer.fillRect(x + TILE - 12, y + TILE - 6, 8, 6, '#a80');
  }
}

function drawPlayer(renderer, x, y) {
  const f = player.facing;
  const pcx = x + player.w / 2;

  // Body
  renderer.setGlow('#f42', 0.5);
  renderer.fillRect(x + 4, y + 10, player.w - 8, player.h - 16, '#f42');
  renderer.setGlow(null);

  // Overalls
  renderer.fillRect(x + 4, y + 18, player.w - 8, player.h - 22, '#44f');

  // Head
  renderer.fillCircle(pcx, y + 8, 9, '#fca');

  // Hat
  renderer.fillRect(pcx - 10, y - 2, 20, 7, '#f42');
  renderer.fillRect(pcx - 6 + f * 3, y - 4, 12, 6, '#f42');

  // Eyes
  renderer.fillRect(pcx + f * 3, y + 5, 3, 3, '#000');

  // Mustache
  renderer.fillRect(pcx + f * 1 - 3, y + 10, 8, 2, '#520');

  // Legs (animated)
  if (!player.onGround) {
    // Jumping pose
    renderer.fillRect(x + 2, y + player.h - 8, 8, 8, '#44f');
    renderer.fillRect(x + player.w - 10, y + player.h - 8, 8, 8, '#44f');
  } else if (Math.abs(player.vx) > 0.5) {
    // Walking
    const legOff = player.walkFrame === 1 ? 2 : (player.walkFrame === 2 ? -2 : 0);
    renderer.fillRect(x + 2 + legOff, y + player.h - 8, 8, 8, '#44f');
    renderer.fillRect(x + player.w - 10 - legOff, y + player.h - 8, 8, 8, '#44f');
  } else {
    renderer.fillRect(x + 2, y + player.h - 6, 8, 6, '#44f');
    renderer.fillRect(x + player.w - 10, y + player.h - 6, 8, 6, '#44f');
  }

  // Shoes
  if (!player.onGround) {
    renderer.fillRect(x, y + player.h - 4, 10, 4, '#840');
    renderer.fillRect(x + player.w - 10, y + player.h - 4, 10, 4, '#840');
  } else {
    renderer.fillRect(x, y + player.h - 4, 10, 4, '#840');
    renderer.fillRect(x + player.w - 10, y + player.h - 4, 10, 4, '#840');
  }
}
