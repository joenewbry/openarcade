// spelunky/game.js — Spelunky game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// --- Constants ---
const TILE = 32;
const COLS = W / TILE; // 15
const ROWS = H / TILE; // 15
const GRAVITY = 0.45;
const MAX_FALL = 7;
const PLAYER_SPEED = 2.5;
const JUMP_FORCE = -7;
const WHIP_RANGE = 36;
const WHIP_DURATION = 12;
const VISIBILITY_RADIUS = 5.5; // tiles
const INVULN_TIME = 60; // frames of invulnerability after hit

// Tile types
const EMPTY = 0, WALL = 1, SPIKE = 2, LADDER = 3, EXIT = 4, ENTRANCE = 5, ARROW_TRAP = 6;

// ── State ──
let score, best = 0;
let player, level, grid, enemies, items, projectiles, particles;
let levelNum;
let frameCount = 0;
let _gameRef = null;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const bombsEl = document.getElementById('bombs');
const ropesEl = document.getElementById('ropes');
const levelEl = document.getElementById('level');

// --- Player ---
function createPlayer(x, y) {
  return {
    x: x * TILE + TILE / 2,
    y: y * TILE + TILE / 2,
    w: 20, h: 26,
    vx: 0, vy: 0,
    hp: 4,
    bombs: 4,
    ropes: 4,
    facing: 1, // 1 right, -1 left
    onGround: false,
    onLadder: false,
    whipTimer: 0,
    invuln: 0,
    stunned: 0,
    dead: false
  };
}

// --- Level Generation ---
function generateLevel(lvl) {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    g[r] = [];
    for (let c = 0; c < COLS; c++) {
      g[r][c] = EMPTY;
    }
  }

  // Fill borders with walls
  for (let c = 0; c < COLS; c++) {
    g[0][c] = WALL;
    g[ROWS - 1][c] = WALL;
  }
  for (let r = 0; r < ROWS; r++) {
    g[r][0] = WALL;
    g[r][COLS - 1] = WALL;
  }

  // Divide into 4x4 rooms (each room is roughly 3x3 tiles inside)
  const ROOM_W = 3;
  const ROOM_H = 3;
  const ROOMS_X = 4;
  const ROOMS_Y = 4;

  // Generate path from top to bottom
  const path = [];
  let px = Math.floor(Math.random() * ROOMS_X);
  path.push({ x: px, y: 0 });

  for (let ry = 0; ry < ROOMS_Y - 1; ry++) {
    const dir = Math.random();
    if (dir < 0.33 && px > 0) {
      px--;
      path.push({ x: px, y: ry });
    } else if (dir < 0.66 && px < ROOMS_X - 1) {
      px++;
      path.push({ x: px, y: ry });
    }
    path.push({ x: px, y: ry + 1 });
  }

  // Mark which rooms are on the path
  const onPath = new Set();
  path.forEach(p => onPath.add(p.x + ',' + p.y));

  // Fill rooms with terrain
  for (let ry = 0; ry < ROOMS_Y; ry++) {
    for (let rx = 0; rx < ROOMS_X; rx++) {
      const baseC = 1 + rx * ROOM_W;
      const baseR = 1 + ry * ROOM_H;
      const isPath = onPath.has(rx + ',' + ry);
      fillRoom(g, baseC, baseR, ROOM_W, ROOM_H, isPath, lvl);
    }
  }

  // Ensure path connectivity
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    clearConnection(g, a, b, ROOM_W, ROOM_H);
  }

  // Place entrance at top of first path room
  const startRoom = path[0];
  const entranceC = 1 + startRoom.x * ROOM_W + 1;
  const entranceR = 1 + startRoom.y * ROOM_H;
  g[entranceR][entranceC] = ENTRANCE;
  g[entranceR + 1][entranceC] = EMPTY;

  // Place exit at bottom of last path room
  const endRoom = path[path.length - 1];
  const exitC = 1 + endRoom.x * ROOM_W + 1;
  const exitR = 1 + endRoom.y * ROOM_H + ROOM_H - 1;
  g[exitR][exitC] = EXIT;
  if (exitR + 1 < ROWS) g[exitR + 1][exitC] = WALL;
  if (exitR - 1 > 0) g[exitR - 1][exitC] = EMPTY;

  return {
    grid: g,
    entrance: { x: entranceC, y: entranceR },
    exit: { x: exitC, y: exitR }
  };
}

function fillRoom(g, baseC, baseR, rw, rh, isPath, lvl) {
  if (isPath) {
    for (let r = 0; r < rh; r++) {
      for (let c = 0; c < rw; c++) {
        g[baseR + r][baseC + c] = EMPTY;
      }
    }
    if (Math.random() < 0.5) {
      const platR = baseR + 1 + Math.floor(Math.random() * (rh - 2));
      const platStart = baseC + Math.floor(Math.random() * 2);
      const platLen = 1 + Math.floor(Math.random() * 2);
      for (let c = platStart; c < Math.min(platStart + platLen, baseC + rw); c++) {
        if (g[platR][c] === EMPTY) g[platR][c] = WALL;
      }
    }
  } else {
    const template = Math.random();
    if (template < 0.3) {
      for (let r = 0; r < rh; r++) {
        for (let c = 0; c < rw; c++) {
          g[baseR + r][baseC + c] = WALL;
        }
      }
    } else if (template < 0.6) {
      for (let r = 0; r < rh; r++) {
        for (let c = 0; c < rw; c++) {
          g[baseR + r][baseC + c] = r === rh - 1 ? WALL : EMPTY;
        }
      }
    } else {
      for (let r = 0; r < rh; r++) {
        for (let c = 0; c < rw; c++) {
          if (r === rh - 1 || (r === 1 && c !== 1)) {
            g[baseR + r][baseC + c] = WALL;
          } else {
            g[baseR + r][baseC + c] = EMPTY;
          }
        }
      }
    }
  }

  // Add traps based on level difficulty
  const trapChance = Math.min(0.08 + lvl * 0.02, 0.2);
  for (let r = 0; r < rh; r++) {
    for (let c = 0; c < rw; c++) {
      const gr = baseR + r;
      const gc = baseC + c;
      if (g[gr][gc] === EMPTY && gr + 1 < ROWS && g[gr + 1][gc] === WALL) {
        if (Math.random() < trapChance * 0.5) {
          g[gr][gc] = SPIKE;
        }
      }
      if (g[gr][gc] === WALL && gc + 1 < COLS && g[gr][gc + 1] === EMPTY) {
        if (Math.random() < trapChance * 0.3) {
          g[gr][gc] = ARROW_TRAP;
        }
      }
    }
  }

  // Add ladders occasionally
  if (Math.random() < 0.3) {
    const lc = baseC + Math.floor(Math.random() * rw);
    for (let r = 0; r < rh; r++) {
      if (g[baseR + r][lc] === EMPTY) {
        g[baseR + r][lc] = LADDER;
      }
    }
  }
}

function clearConnection(g, a, b, rw, rh) {
  const ac = 1 + a.x * rw + 1;
  const ar = 1 + a.y * rh + 1;
  const bc = 1 + b.x * rw + 1;
  const br = 1 + b.y * rh + 1;

  if (a.y === b.y) {
    const minC = Math.min(ac, bc);
    const maxC = Math.max(ac, bc);
    const row = ar;
    for (let c = minC; c <= maxC; c++) {
      g[row][c] = EMPTY;
      if (row - 1 >= 0 && g[row - 1][c] === WALL) g[row - 1][c] = EMPTY;
    }
  } else {
    const minR = Math.min(ar, br);
    const maxR = Math.max(ar, br);
    const col = ac;
    for (let r = minR; r <= maxR; r++) {
      g[r][col] = EMPTY;
      if (r > minR && r < maxR) g[r][col] = LADDER;
    }
  }
}

// --- Enemy spawning ---
function spawnEnemies(lvl, g) {
  const ens = [];
  const count = Math.min(3 + lvl, 10);
  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < 200) {
    attempts++;
    const c = 2 + Math.floor(Math.random() * (COLS - 4));
    const r = 2 + Math.floor(Math.random() * (ROWS - 4));

    if (level && Math.abs(c - level.entrance.x) < 3 && Math.abs(r - level.entrance.y) < 3) continue;

    if (g[r][c] === EMPTY) {
      const type = Math.random();
      if (type < 0.4 && r + 1 < ROWS && g[r + 1][c] === WALL) {
        ens.push({
          type: 'snake',
          x: c * TILE + TILE / 2,
          y: r * TILE + TILE / 2,
          w: 20, h: 12,
          vx: (Math.random() < 0.5 ? 1 : -1) * 1.2,
          vy: 0,
          hp: 1,
          dead: false
        });
        placed++;
      } else if (type < 0.7) {
        ens.push({
          type: 'bat',
          x: c * TILE + TILE / 2,
          y: r * TILE + TILE / 2,
          w: 18, h: 14,
          vx: 0, vy: 0,
          hp: 1,
          dead: false,
          wingPhase: Math.random() * Math.PI * 2,
          active: false
        });
        placed++;
      } else if (r - 1 >= 0 && g[r - 1][c] === WALL) {
        ens.push({
          type: 'spider',
          x: c * TILE + TILE / 2,
          y: r * TILE + TILE / 2,
          w: 16, h: 16,
          vx: 0, vy: 0,
          hp: 1,
          dead: false,
          dropping: false,
          homeY: r * TILE + TILE / 2
        });
        placed++;
      }
    }
  }
  return ens;
}

// --- Item spawning ---
function spawnItems(lvl, g) {
  const its = [];
  const goldCount = 4 + Math.floor(Math.random() * (3 + lvl));
  let placed = 0;
  let attempts = 0;

  while (placed < goldCount && attempts < 200) {
    attempts++;
    const c = 2 + Math.floor(Math.random() * (COLS - 4));
    const r = 2 + Math.floor(Math.random() * (ROWS - 4));

    if (g[r][c] === EMPTY && r + 1 < ROWS && g[r + 1][c] === WALL) {
      const type = Math.random();
      if (type < 0.5) {
        its.push({ type: 'gold', x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 + 4, value: 100, collected: false });
      } else if (type < 0.8) {
        its.push({ type: 'gem', x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 + 4, value: 500, collected: false });
      } else {
        its.push({ type: 'chest', x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, value: 1000, collected: false });
      }
      placed++;
    }
  }
  return its;
}

// --- Particles ---
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 2,
      life: 20 + Math.random() * 20,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

// --- Collision helpers ---
function tileAt(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return WALL;
  return grid[r][c];
}

function isSolid(tile) {
  return tile === WALL || tile === ARROW_TRAP;
}

function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax - aw / 2 < bx + bw / 2 &&
         ax + aw / 2 > bx - bw / 2 &&
         ay - ah / 2 < by + bh / 2 &&
         ay + ah / 2 > by - bh / 2;
}

function worldCollides(x, y, w, h) {
  const left = Math.floor((x - w / 2) / TILE);
  const right = Math.floor((x + w / 2 - 1) / TILE);
  const top = Math.floor((y - h / 2) / TILE);
  const bottom = Math.floor((y + h / 2 - 1) / TILE);

  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (isSolid(tileAt(r, c))) return true;
    }
  }
  return false;
}

// --- Level init ---
function initLevel(lvl) {
  levelNum = lvl;
  levelEl.textContent = lvl;
  level = generateLevel(lvl);
  grid = level.grid;
  player = createPlayer(level.entrance.x, level.entrance.y);
  enemies = spawnEnemies(lvl, grid);
  items = spawnItems(lvl, grid);
  projectiles = [];
  particles = [];
}

function hurtPlayer(dmg) {
  if (player.invuln > 0) return;
  player.hp -= dmg;
  player.invuln = INVULN_TIME;
  spawnParticles(player.x, player.y, '#f44', 6);
  if (player.hp <= 0) {
    player.hp = 0;
    player.dead = true;
    spawnParticles(player.x, player.y, '#f44', 20);
    // Delay game over by ~30 frames
    _deathTimer = 30;
  }
}

let _deathTimer = 0;

function checkArrowTraps() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === ARROW_TRAP) {
        const trapY = r * TILE + TILE / 2;
        const trapX = c * TILE + TILE / 2;
        if (Math.abs(player.y - trapY) < TILE) {
          const dir = (c + 1 < COLS && !isSolid(tileAt(r, c + 1))) ? 1 : -1;
          const dx = player.x - trapX;
          if (Math.sign(dx) === dir && Math.abs(dx) < TILE * 5) {
            grid[r][c] = WALL;
            projectiles.push({
              x: trapX + dir * TILE / 2,
              y: trapY,
              vx: dir * 6,
              vy: 0,
              hostile: true,
              type: 'arrow'
            });
          }
        }
      }
    }
  }
}

function placeBomb() {
  if (player.bombs <= 0) return;
  player.bombs--;
  projectiles.push({
    x: player.x,
    y: player.y - 10,
    vx: player.facing * 3,
    vy: -3,
    type: 'bomb',
    timer: 90,
    hostile: false
  });
}

function placeRope() {
  if (player.ropes <= 0) return;
  player.ropes--;
  const pc = Math.floor(player.x / TILE);
  let pr = Math.floor(player.y / TILE);
  for (let i = 0; i < 6; i++) {
    pr--;
    if (pr <= 0) break;
    if (grid[pr][pc] === WALL) break;
    grid[pr][pc] = LADDER;
  }
}

function nextLevel() {
  const prevHP = player.hp;
  const prevBombs = player.bombs;
  const prevRopes = player.ropes;

  initLevel(levelNum + 1);

  score += 500 * levelNum;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  player.hp = Math.min(prevHP + 1, 4);
  player.bombs = prevBombs;
  player.ropes = prevRopes;
  hpEl.textContent = player.hp;
  bombsEl.textContent = player.bombs;
  ropesEl.textContent = player.ropes;
}

function gameOver() {
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  _gameRef.showOverlay('GAME OVER', 'Score: ' + score + ' | Level: ' + levelNum + ' -- Press any key to restart');
  _gameRef.setState('over');
}

// --- Visibility helper ---
function tileVisible(tx, ty, playerTileX, playerTileY) {
  const dist = Math.sqrt((tx + 0.5 - playerTileX) ** 2 + (ty + 0.5 - playerTileY) ** 2);
  return dist <= VISIBILITY_RADIUS + 1;
}

function tileAlpha(tx, ty, playerTileX, playerTileY) {
  const dist = Math.sqrt((tx + 0.5 - playerTileX) ** 2 + (ty + 0.5 - playerTileY) ** 2);
  return Math.max(0, 1 - Math.max(0, dist - VISIBILITY_RADIUS) / 1.5);
}

function entityVisible(ex, ey, playerTileX, playerTileY) {
  const dist = Math.sqrt((ex / TILE - playerTileX) ** 2 + (ey / TILE - playerTileY) ** 2);
  return dist <= VISIBILITY_RADIUS + 1;
}

// ── Hex color with alpha helper ──
function colorWithAlpha(hex, alpha) {
  // Convert #rgb or #rrggbb to #rrggbbaa
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1], 16) * 17;
    g = parseInt(hex[2], 16) * 17;
    b = parseInt(hex[3], 16) * 17;
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  const a = Math.round(alpha * 255);
  return '#' + r.toString(16).padStart(2, '0') +
               g.toString(16).padStart(2, '0') +
               b.toString(16).padStart(2, '0') +
               a.toString(16).padStart(2, '0');
}

export function createGame() {
  const game = new Game('game');
  _gameRef = game;

  game.onInit = () => {
    score = 0;
    levelNum = 1;
    frameCount = 0;
    _deathTimer = 0;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    particles = [];
    projectiles = [];
    initLevel(1);
    game.showOverlay('SPELUNKY', 'Press SPACE to start\n\nArrows: Move  Space: Whip\nB: Bomb  R: Rope');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    frameCount++;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('b') || input.wasPressed('B') ||
          input.wasPressed('r') || input.wasPressed('R')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Death timer countdown
    if (_deathTimer > 0) {
      _deathTimer--;
      if (_deathTimer <= 0) {
        gameOver();
      }
      return;
    }

    if (player.dead) return;

    // Player invulnerability timer
    if (player.invuln > 0) player.invuln--;
    if (player.stunned > 0) player.stunned--;

    // Whip timer
    if (player.whipTimer > 0) player.whipTimer--;

    // --- Player movement ---
    const onLadderTile = tileAt(Math.floor(player.y / TILE), Math.floor(player.x / TILE)) === LADDER;
    const onLadderTileBelow = tileAt(Math.floor((player.y + player.h / 2) / TILE), Math.floor(player.x / TILE)) === LADDER;

    if (player.stunned <= 0) {
      // Horizontal movement
      if (input.isDown('ArrowLeft')) {
        player.vx = -PLAYER_SPEED;
        player.facing = -1;
      } else if (input.isDown('ArrowRight')) {
        player.vx = PLAYER_SPEED;
        player.facing = 1;
      } else {
        player.vx = 0;
      }

      // Ladder climbing
      if ((input.isDown('ArrowUp') || input.isDown('ArrowDown')) && (onLadderTile || onLadderTileBelow)) {
        player.onLadder = true;
      }

      if (player.onLadder) {
        if (input.isDown('ArrowUp')) {
          player.vy = -PLAYER_SPEED;
        } else if (input.isDown('ArrowDown')) {
          player.vy = PLAYER_SPEED;
        } else {
          player.vy = 0;
        }
        if (!onLadderTile && !onLadderTileBelow) {
          player.onLadder = false;
        }
      }

      // Jumping
      if (input.isDown('ArrowUp') && player.onGround && !player.onLadder) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
      }

      // Whip attack
      if (input.wasPressed(' ') && player.whipTimer <= 0 && player.stunned <= 0) {
        player.whipTimer = WHIP_DURATION;
      }

      // Bomb
      if (input.wasPressed('b') || input.wasPressed('B')) {
        placeBomb();
      }

      // Rope
      if (input.wasPressed('r') || input.wasPressed('R')) {
        placeRope();
      }
    }

    // Apply gravity (unless on ladder)
    if (!player.onLadder) {
      player.vy += GRAVITY;
      if (player.vy > MAX_FALL) player.vy = MAX_FALL;
    }

    // Move X
    const newX = player.x + player.vx;
    if (!worldCollides(newX, player.y, player.w, player.h)) {
      player.x = newX;
    } else {
      player.vx = 0;
    }

    // Move Y
    const newY = player.y + player.vy;
    if (!worldCollides(player.x, newY, player.w, player.h)) {
      player.y = newY;
      player.onGround = false;
    } else {
      if (player.vy > 0) {
        player.onGround = true;
        if (player.vy > 6 && player.invuln <= 0) {
          hurtPlayer(1);
        }
      }
      player.vy = 0;
    }

    // Spike check
    const playerTileR = Math.floor((player.y + player.h / 2 - 2) / TILE);
    const playerTileC = Math.floor(player.x / TILE);
    if (tileAt(playerTileR, playerTileC) === SPIKE && player.invuln <= 0) {
      hurtPlayer(4);
    }

    // Arrow trap trigger
    checkArrowTraps();

    // Exit check
    if (tileAt(Math.floor(player.y / TILE), Math.floor(player.x / TILE)) === EXIT) {
      spawnParticles(player.x, player.y, '#ea6', 20);
      nextLevel();
      return;
    }

    // --- Whip attack ---
    if (player.whipTimer === WHIP_DURATION - 1) {
      const whipX = player.x + player.facing * WHIP_RANGE;
      const whipY = player.y;
      enemies.forEach(e => {
        if (!e.dead && rectCollide(whipX, whipY, 24, 24, e.x, e.y, e.w, e.h)) {
          e.dead = true;
          score += 50;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          spawnParticles(e.x, e.y, '#f44', 8);
        }
      });
    }

    // --- Update enemies ---
    enemies.forEach(e => {
      if (e.dead) return;

      if (e.type === 'snake') {
        e.x += e.vx;
        const checkC = Math.floor((e.x + (e.vx > 0 ? e.w / 2 : -e.w / 2)) / TILE);
        const checkR = Math.floor(e.y / TILE);
        if (isSolid(tileAt(checkR, checkC)) || !isSolid(tileAt(checkR + 1, checkC))) {
          e.vx = -e.vx;
        }
      }

      if (e.type === 'bat') {
        const dist = Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2);
        if (dist < VISIBILITY_RADIUS * TILE || e.active) {
          e.active = true;
          const angle = Math.atan2(player.y - e.y, player.x - e.x);
          e.vx = Math.cos(angle) * 2;
          e.vy = Math.sin(angle) * 1.5 + Math.sin(e.wingPhase) * 0.8;
          e.wingPhase += 0.15;
        }
        e.x += e.vx;
        e.y += e.vy;
      }

      if (e.type === 'spider') {
        const dist = Math.abs(player.x - e.x);
        if (dist < TILE * 2 && player.y > e.y && !e.dropping) {
          e.dropping = true;
        }
        if (e.dropping) {
          e.vy += GRAVITY * 0.5;
          if (e.vy > 4) e.vy = 4;
          e.y += e.vy;
          const gr = Math.floor((e.y + e.h / 2) / TILE);
          const gc = Math.floor(e.x / TILE);
          if (isSolid(tileAt(gr, gc))) {
            e.vy = 0;
            e.y = gr * TILE - e.h / 2;
            if (!e.grounded) {
              e.grounded = true;
              e.vx = (Math.random() < 0.5 ? 1 : -1) * 1.5;
            }
          }
        }
        if (e.grounded) {
          e.x += e.vx;
          const checkC = Math.floor((e.x + (e.vx > 0 ? e.w / 2 : -e.w / 2)) / TILE);
          const checkR = Math.floor(e.y / TILE);
          if (isSolid(tileAt(checkR, checkC))) {
            e.vx = -e.vx;
          }
        }
      }

      // Enemy-player collision
      if (player.invuln <= 0 && rectCollide(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) {
        if (player.vy > 0 && player.y < e.y - e.h / 3) {
          e.dead = true;
          player.vy = JUMP_FORCE * 0.6;
          score += 50;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          spawnParticles(e.x, e.y, '#f44', 8);
        } else {
          hurtPlayer(1);
          player.vx = (player.x < e.x ? -3 : 3);
          player.vy = -3;
          player.stunned = 15;
        }
      }
    });

    // --- Update projectiles ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Hit wall
      const pr = Math.floor(p.y / TILE);
      const pc = Math.floor(p.x / TILE);
      if (isSolid(tileAt(pr, pc))) {
        projectiles.splice(i, 1);
        continue;
      }

      // Hit player
      if (p.hostile && player.invuln <= 0 &&
          rectCollide(player.x, player.y, player.w, player.h, p.x, p.y, 6, 6)) {
        hurtPlayer(1);
        projectiles.splice(i, 1);
        continue;
      }

      // Out of bounds
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        projectiles.splice(i, 1);
      }
    }

    // --- Update items ---
    items.forEach(item => {
      if (item.collected) return;
      if (rectCollide(player.x, player.y, player.w, player.h, item.x, item.y, 16, 16)) {
        item.collected = true;
        score += item.value;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        const color = item.type === 'gold' ? '#fd0' : item.type === 'gem' ? '#4af' : '#ea6';
        spawnParticles(item.x, item.y, color, 10);
      }
    });

    // --- Update particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // --- Update bombs ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.type === 'bomb') {
        p.vy += GRAVITY * 0.5;
        p.timer--;
        if (p.timer <= 0) {
          const br = Math.floor(p.y / TILE);
          const bc = Math.floor(p.x / TILE);
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              if (dr * dr + dc * dc <= 5) {
                const tr = br + dr;
                const tc = bc + dc;
                if (tr > 0 && tr < ROWS - 1 && tc > 0 && tc < COLS - 1) {
                  if (grid[tr][tc] === WALL || grid[tr][tc] === ARROW_TRAP) {
                    grid[tr][tc] = EMPTY;
                  }
                }
              }
            }
          }
          enemies.forEach(e => {
            if (!e.dead) {
              const dist = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
              if (dist < TILE * 2.5) {
                e.dead = true;
                score += 50;
                scoreEl.textContent = score;
                if (score > best) { best = score; bestEl.textContent = best; }
              }
            }
          });
          const pdist = Math.sqrt((player.x - p.x) ** 2 + (player.y - p.y) ** 2);
          if (pdist < TILE * 2 && player.invuln <= 0) {
            hurtPlayer(2);
          }
          spawnParticles(p.x, p.y, '#f80', 25);
          spawnParticles(p.x, p.y, '#ff0', 15);
          projectiles.splice(i, 1);
        }
      }
    }

    // Update HUD
    hpEl.textContent = player.hp;
    bombsEl.textContent = player.bombs;
    ropesEl.textContent = player.ropes;
  };

  game.onDraw = (renderer, text) => {
    const isPlaying = game.state === 'playing';
    const playerTileX = player ? player.x / TILE : COLS / 2;
    const playerTileY = player ? player.y / TILE : ROWS / 2;

    // Draw tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = grid[r][c];
        const tx = c * TILE;
        const ty = r * TILE;

        // Distance-based visibility
        if (isPlaying && !tileVisible(c, r, playerTileX, playerTileY)) continue;

        const alpha = isPlaying ? tileAlpha(c, r, playerTileX, playerTileY) : 1;

        if (tile === WALL) {
          renderer.fillRect(tx, ty, TILE, TILE, colorWithAlpha('#3a2a1a', alpha));
          // Brick pattern - outline
          renderer.fillRect(tx + 1, ty + 1, TILE - 2, 1, colorWithAlpha('#2a1a0a', alpha));
          renderer.fillRect(tx + 1, ty + TILE - 2, TILE - 2, 1, colorWithAlpha('#2a1a0a', alpha));
          renderer.fillRect(tx + 1, ty + 1, 1, TILE - 2, colorWithAlpha('#2a1a0a', alpha));
          renderer.fillRect(tx + TILE - 2, ty + 1, 1, TILE - 2, colorWithAlpha('#2a1a0a', alpha));
          // Horizontal divider
          renderer.fillRect(tx, ty + TILE / 2 - 1, TILE, 1, colorWithAlpha('#2a1a0a', alpha));
          // Vertical divider (top half)
          renderer.fillRect(tx + TILE / 2, ty, 1, TILE / 2, colorWithAlpha('#2a1a0a', alpha));
        } else if (tile === SPIKE) {
          // Spikes as triangles
          for (let i = 0; i < 3; i++) {
            const spikeColor = colorWithAlpha('#888', alpha);
            renderer.fillPoly([
              { x: tx + 4 + i * 10, y: ty + TILE },
              { x: tx + 9 + i * 10, y: ty + TILE - 14 },
              { x: tx + 14 + i * 10, y: ty + TILE }
            ], spikeColor);
          }
        } else if (tile === LADDER) {
          const ladderColor = colorWithAlpha('#864', alpha);
          // Rails
          renderer.fillRect(tx + 7, ty, 2, TILE, ladderColor);
          renderer.fillRect(tx + TILE - 9, ty, 2, TILE, ladderColor);
          // Rungs
          for (let i = 0; i < 3; i++) {
            renderer.fillRect(tx + 8, ty + 5 + i * 10, TILE - 16, 2, ladderColor);
          }
        } else if (tile === EXIT) {
          renderer.fillRect(tx, ty, TILE, TILE, colorWithAlpha('#0a0a18', alpha));
          renderer.setGlow('#ea6', 0.6);
          // Door frame
          const frameColor = colorWithAlpha('#ea6', alpha);
          renderer.fillRect(tx + 4, ty + 2, TILE - 8, 2, frameColor);
          renderer.fillRect(tx + 4, ty + TILE - 4, TILE - 8, 2, frameColor);
          renderer.fillRect(tx + 4, ty + 2, 2, TILE - 4, frameColor);
          renderer.fillRect(tx + TILE - 6, ty + 2, 2, TILE - 4, frameColor);
          // Door handle
          renderer.fillCircle(tx + TILE - 10, ty + TILE / 2, 3, frameColor);
          renderer.setGlow(null);
        } else if (tile === ENTRANCE) {
          renderer.fillRect(tx, ty, TILE, TILE, colorWithAlpha('#0a0a18', alpha));
          const entrColor = colorWithAlpha('#666', alpha);
          renderer.fillRect(tx + 4, ty + 2, TILE - 8, 2, entrColor);
          renderer.fillRect(tx + 4, ty + TILE - 4, TILE - 8, 2, entrColor);
          renderer.fillRect(tx + 4, ty + 2, 2, TILE - 4, entrColor);
          renderer.fillRect(tx + TILE - 6, ty + 2, 2, TILE - 4, entrColor);
        } else if (tile === ARROW_TRAP) {
          renderer.fillRect(tx, ty, TILE, TILE, colorWithAlpha('#3a2a1a', alpha));
          // Arrow indicator triangle
          renderer.fillPoly([
            { x: tx + TILE - 4, y: ty + TILE / 2 - 4 },
            { x: tx + TILE, y: ty + TILE / 2 },
            { x: tx + TILE - 4, y: ty + TILE / 2 + 4 }
          ], colorWithAlpha('#a44', alpha));
        }
      }
    }

    // Draw fog of war overlay (darken distant tiles)
    if (isPlaying && player) {
      // Overlay darkness ring using concentric dark rectangles around player
      // Use a grid of dark tiles for areas outside visibility
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const dist = Math.sqrt((c + 0.5 - playerTileX) ** 2 + (r + 0.5 - playerTileY) ** 2);
          if (dist > VISIBILITY_RADIUS) {
            const darkness = Math.min(1, (dist - VISIBILITY_RADIUS) / 1.5) * 0.85;
            if (darkness > 0.05) {
              const a = Math.round(darkness * 255);
              const fogColor = '#000000' + a.toString(16).padStart(2, '0');
              renderer.fillRect(c * TILE, r * TILE, TILE, TILE, fogColor);
            }
          }
        }
      }
    }

    // Draw items
    items.forEach(item => {
      if (item.collected) return;
      if (isPlaying && !entityVisible(item.x, item.y, playerTileX, playerTileY)) return;

      if (item.type === 'gold') {
        renderer.setGlow('#fd0', 0.5);
        renderer.fillCircle(item.x, item.y, 5, '#fd0');
        renderer.setGlow(null);
      } else if (item.type === 'gem') {
        renderer.setGlow('#4af', 0.5);
        // Diamond shape
        renderer.fillPoly([
          { x: item.x, y: item.y - 7 },
          { x: item.x + 6, y: item.y },
          { x: item.x, y: item.y + 7 },
          { x: item.x - 6, y: item.y }
        ], '#4af');
        renderer.setGlow(null);
      } else if (item.type === 'chest') {
        renderer.setGlow('#ea6', 0.5);
        renderer.fillRect(item.x - 8, item.y - 6, 16, 12, '#ea6');
        renderer.fillRect(item.x - 8, item.y - 1, 16, 2, '#864');
        renderer.fillRect(item.x - 2, item.y - 4, 4, 4, '#fd0');
        renderer.setGlow(null);
      }
    });

    // Draw enemies
    enemies.forEach(e => {
      if (e.dead) return;
      if (isPlaying && !entityVisible(e.x, e.y, playerTileX, playerTileY)) return;

      if (e.type === 'snake') {
        renderer.setGlow('#0a4', 0.4);
        // Body (ellipse approximated as rect with rounded look)
        renderer.fillCircle(e.x, e.y, e.w / 2, '#0a4');
        renderer.setGlow(null);
        // Eyes
        renderer.fillRect(e.x + (e.vx > 0 ? 5 : -8), e.y - 4, 3, 3, '#f00');
        // Tongue
        const tongueDir = e.vx > 0 ? 1 : -1;
        renderer.drawLine(
          e.x + tongueDir * e.w / 2, e.y,
          e.x + tongueDir * (e.w / 2 + 6), e.y - 2,
          '#f44', 1
        );
      } else if (e.type === 'bat') {
        renderer.setGlow('#808', 0.4);
        // Body
        renderer.fillCircle(e.x, e.y, 6, '#808');
        // Wings
        const wingOff = Math.sin(e.wingPhase) * 4;
        renderer.fillPoly([
          { x: e.x - 4, y: e.y },
          { x: e.x - 12, y: e.y - 6 + wingOff },
          { x: e.x - 8, y: e.y + 2 }
        ], '#808');
        renderer.fillPoly([
          { x: e.x + 4, y: e.y },
          { x: e.x + 12, y: e.y - 6 - wingOff },
          { x: e.x + 8, y: e.y + 2 }
        ], '#808');
        renderer.setGlow(null);
        // Eyes
        renderer.fillRect(e.x - 3, e.y - 3, 2, 2, '#f00');
        renderer.fillRect(e.x + 1, e.y - 3, 2, 2, '#f00');
      } else if (e.type === 'spider') {
        renderer.setGlow('#640', 0.4);
        renderer.fillCircle(e.x, e.y, e.w / 2, '#640');
        renderer.setGlow(null);
        // Legs
        for (let s = -1; s <= 1; s += 2) {
          for (let j = 0; j < 3; j++) {
            renderer.drawLine(
              e.x + s * 4, e.y + (j - 1) * 4,
              e.x + s * 12, e.y + (j - 1) * 6 + 4,
              '#640', 1.5
            );
          }
        }
        // Eyes
        renderer.fillRect(e.x - 4, e.y - 4, 3, 3, '#f44');
        renderer.fillRect(e.x + 1, e.y - 4, 3, 3, '#f44');
        // Web line if not yet dropped
        if (!e.dropping) {
          renderer.drawLine(e.x, e.y - e.h / 2, e.x, e.homeY - TILE, '#888', 1);
        }
      }
    });

    // Draw projectiles
    projectiles.forEach(p => {
      if (p.type === 'arrow') {
        renderer.setGlow('#f44', 0.3);
        const dir = p.vx > 0 ? 1 : -1;
        renderer.fillPoly([
          { x: p.x + dir * 8, y: p.y },
          { x: p.x - dir * 6, y: p.y - 3 },
          { x: p.x - dir * 6, y: p.y + 3 }
        ], '#a66');
        renderer.setGlow(null);
      } else if (p.type === 'bomb') {
        renderer.setGlow('#f80', p.timer < 30 ? 0.8 : 0.3);
        renderer.fillCircle(p.x, p.y, 6, '#444');
        renderer.setGlow(null);
        // Fuse
        const fuseColor = p.timer % 6 < 3 ? '#f80' : '#ff0';
        renderer.drawLine(p.x + 4, p.y - 4, p.x + 7, p.y - 8, fuseColor, 2);
      }
    });

    // Draw player
    if (player && !player.dead) {
      // Blink when invulnerable
      if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) {
        // Skip drawing (blink effect)
      } else {
        renderer.setGlow('#ea6', 0.5);

        // Body
        renderer.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h, '#ea6');

        // Head (slightly darker)
        renderer.fillRect(player.x - player.w / 2 + 2, player.y - player.h / 2, player.w - 4, 10, '#d95');

        // Hat
        renderer.fillRect(player.x - player.w / 2 - 2, player.y - player.h / 2 - 4, player.w + 4, 6, '#864');

        // Eyes
        const eyeX = player.x + player.facing * 3;
        renderer.fillRect(eyeX - 2, player.y - player.h / 2 + 3, 4, 3, '#fff');
        renderer.fillRect(eyeX - 1 + player.facing, player.y - player.h / 2 + 4, 2, 2, '#000');

        // Whip
        if (player.whipTimer > 0) {
          renderer.setGlow('#ea6', 0.4);
          const whipProgress = 1 - player.whipTimer / WHIP_DURATION;
          const whipLen = WHIP_RANGE * whipProgress;
          renderer.drawLine(
            player.x + player.facing * player.w / 2, player.y,
            player.x + player.facing * (player.w / 2 + whipLen),
            player.y - 4 + Math.sin(whipProgress * Math.PI) * 8,
            '#864', 2
          );
        }

        renderer.setGlow(null);
      }
    }

    // Draw particles
    particles.forEach(p => {
      const a = Math.max(0, Math.min(1, p.life / 40));
      renderer.setGlow(p.color, 0.3);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, colorWithAlpha(p.color, a));
      renderer.setGlow(null);
    });

    // HUD on canvas
    if (isPlaying) {
      // Mini HP bar at top
      renderer.fillRect(8, 8, 80, 14, 'rgba(0,0,0,0.5)');
      const hpColor = player.hp > 1 ? '#0c0' : '#f44';
      renderer.fillRect(10, 10, (player.hp / 4) * 76, 10, hpColor);
      // HP bar border
      renderer.fillRect(8, 8, 80, 1, '#ea6');
      renderer.fillRect(8, 21, 80, 1, '#ea6');
      renderer.fillRect(8, 8, 1, 14, '#ea6');
      renderer.fillRect(87, 8, 1, 14, '#ea6');
    }
  };

  game.start();
  return game;
}
