// mega-man/game.js — Mega Man game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 512;
const H = 400;

// --- Constants ---
const TILE = 32;
const GRAVITY = 0.55;
const JUMP_FORCE = -9.5;
const MOVE_SPEED = 3;
const BULLET_SPEED = 7;
const MAX_HP = 28;
const BOSS_MAX_HP = 40;
const COLS = 16;
const ROWS = 12;

// --- Colors ---
const THEME = '#4bf';
const THEME_DARK = '#28a';
const PLAYER_COLOR = '#4bf';
const PLAYER_DARK = '#28a';
const ENEMY_COLORS = ['#f44', '#f80', '#ff0', '#f4f'];
const PLATFORM_COLOR = '#2a4a6a';
const PLATFORM_TOP = '#3a6a8a';
const LADDER_COLOR = '#8a6a2a';
const SPIKE_COLOR = '#f44';
const BG_COLOR = '#1a1a2e';
const PICKUP_HP_COLOR = '#4f4';
const PICKUP_SCORE_COLOR = '#ff0';
const GRID_LINE_COLOR = '#1a2a4a';

// --- State ---
let score, best = 0;
let lives, stage;
let player, bullets, enemies, particles, pickups;
let rooms, currentRoom;
let boss, bossActive;
let tick;
let deathTimer;
let shootAnimTimer; // replaces setTimeout for shooting animation
let stageTransitionTimer; // replaces setTimeout for stage transitions
let stageTransitionAction; // 'next' or 'win'

// DOM refs
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const stageEl = document.getElementById('stage');

// --- Boss Patterns ---
const BOSS_PATTERNS = [
  { name: 'FIRE MAN', color: '#f80', glowColor: '#f80', w: 28, h: 36, hp: BOSS_MAX_HP, speed: 2, jumpForce: -10, shootInterval: 50, pattern: 'jumper' },
  { name: 'ICE MAN', color: '#8ef', glowColor: '#8ef', w: 28, h: 36, hp: BOSS_MAX_HP + 10, speed: 3, jumpForce: -8, shootInterval: 40, pattern: 'slider' },
  { name: 'ELEC MAN', color: '#ff0', glowColor: '#ff0', w: 28, h: 36, hp: BOSS_MAX_HP + 20, speed: 3.5, jumpForce: -11, shootInterval: 35, pattern: 'aggressive' },
];

// --- Room/Stage generation ---
function createRoom(w, h) {
  const tiles = [];
  for (let r = 0; r < h; r++) {
    tiles[r] = [];
    for (let c = 0; c < w; c++) tiles[r][c] = 0;
  }
  return { tiles, enemies: [], w, h, playerStart: null, bossRoom: false, exitDir: null };
}

function generateStage1() {
  const roomList = [];
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 3; c < 7; c++) rm.tiles[7][c] = 1;
    for (let c = 9; c < 13; c++) rm.tiles[5][c] = 1;
    for (let r = 0; r < ROWS - 2; r++) rm.tiles[r][0] = 1;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    rm.enemies.push({ type: 'walker', x: 5 * TILE, y: 6 * TILE });
    rm.enemies.push({ type: 'walker', x: 11 * TILE, y: (ROWS-3) * TILE });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 0; c < 6; c++) rm.tiles[7][c] = 1;
    for (let c = 10; c < COLS; c++) rm.tiles[7][c] = 1;
    for (let c = 4; c < 12; c++) rm.tiles[3][c] = 1;
    for (let r = 4; r <= 6; r++) rm.tiles[r][7] = 2;
    for (let r = 8; r <= ROWS-3; r++) rm.tiles[r][3] = 2;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][0] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    rm.enemies.push({ type: 'flier', x: 8 * TILE, y: 5 * TILE });
    rm.enemies.push({ type: 'walker', x: 2 * TILE, y: 6 * TILE });
    rm.enemies.push({ type: 'turret', x: 13 * TILE, y: 6 * TILE, dir: -1 });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let r = 0; r < ROWS; r++) { rm.tiles[r][0] = 1; rm.tiles[r][COLS-1] = 1; }
    for (let c = 2; c < 6; c++) rm.tiles[7][c] = 1;
    for (let c = 10; c < 14; c++) rm.tiles[7][c] = 1;
    for (let c = 5; c < 11; c++) rm.tiles[4][c] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    rm.bossRoom = true;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    roomList.push(rm);
  }
  return roomList;
}

function generateStage2() {
  const roomList = [];
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 5; c < 9; c++) { rm.tiles[ROWS-2][c] = 3; rm.tiles[ROWS-1][c] = 3; }
    for (let c = 6; c < 8; c++) rm.tiles[8][c] = 1;
    for (let c = 2; c < 5; c++) rm.tiles[6][c] = 1;
    for (let c = 9; c < 13; c++) rm.tiles[5][c] = 1;
    for (let r = 0; r < ROWS - 2; r++) rm.tiles[r][0] = 1;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    rm.enemies.push({ type: 'flier', x: 7 * TILE, y: 4 * TILE });
    rm.enemies.push({ type: 'walker', x: 10 * TILE, y: 4 * TILE });
    rm.enemies.push({ type: 'turret', x: 13 * TILE, y: (ROWS-3) * TILE, dir: -1 });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 0; c < 7; c++) rm.tiles[8][c] = 1;
    for (let c = 9; c < COLS; c++) rm.tiles[8][c] = 1;
    for (let c = 3; c < COLS; c++) rm.tiles[5][c] = 1;
    for (let c = 0; c < 10; c++) rm.tiles[2][c] = 1;
    for (let r = 3; r <= 4; r++) rm.tiles[r][5] = 2;
    for (let r = 6; r <= 7; r++) rm.tiles[r][8] = 2;
    for (let r = 9; r <= ROWS-3; r++) rm.tiles[r][12] = 2;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][0] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    rm.enemies.push({ type: 'walker', x: 3 * TILE, y: 7 * TILE });
    rm.enemies.push({ type: 'flier', x: 10 * TILE, y: 3 * TILE });
    rm.enemies.push({ type: 'turret', x: 1 * TILE, y: 1 * TILE, dir: 1 });
    rm.enemies.push({ type: 'walker', x: 7 * TILE, y: 4 * TILE });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let r = 0; r < ROWS; r++) { rm.tiles[r][0] = 1; rm.tiles[r][COLS-1] = 1; }
    for (let c = 3; c < 7; c++) rm.tiles[6][c] = 1;
    for (let c = 9; c < 13; c++) rm.tiles[6][c] = 1;
    for (let c = 5; c < 11; c++) rm.tiles[3][c] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    rm.bossRoom = true;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    roomList.push(rm);
  }
  return roomList;
}

function generateStage3() {
  const roomList = [];
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 3; c < 6; c++) { rm.tiles[ROWS-2][c] = 3; rm.tiles[ROWS-1][c] = 3; }
    for (let c = 9; c < 12; c++) { rm.tiles[ROWS-2][c] = 3; rm.tiles[ROWS-1][c] = 3; }
    for (let c = 2; c < 7; c++) rm.tiles[7][c] = 1;
    for (let c = 9; c < 14; c++) rm.tiles[7][c] = 1;
    for (let c = 5; c < 11; c++) rm.tiles[4][c] = 1;
    for (let r = 0; r < ROWS - 2; r++) rm.tiles[r][0] = 1;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    rm.enemies.push({ type: 'walker', x: 4 * TILE, y: 6 * TILE });
    rm.enemies.push({ type: 'flier', x: 8 * TILE, y: 2 * TILE });
    rm.enemies.push({ type: 'turret', x: 13 * TILE, y: 6 * TILE, dir: -1 });
    rm.enemies.push({ type: 'flier', x: 12 * TILE, y: 5 * TILE });
    rm.enemies.push({ type: 'walker', x: 10 * TILE, y: 6 * TILE });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let c = 2; c < 14; c++) { rm.tiles[ROWS-2][c] = 3; rm.tiles[ROWS-1][c] = 3; }
    for (let c = 1; c < 5; c++) rm.tiles[9][c] = 1;
    for (let c = 7; c < 11; c++) rm.tiles[9][c] = 1;
    for (let c = 12; c < 15; c++) rm.tiles[9][c] = 1;
    for (let c = 3; c < 8; c++) rm.tiles[6][c] = 1;
    for (let c = 10; c < 14; c++) rm.tiles[6][c] = 1;
    for (let c = 1; c < 6; c++) rm.tiles[3][c] = 1;
    for (let c = 8; c < 13; c++) rm.tiles[3][c] = 1;
    for (let r = 4; r <= 5; r++) rm.tiles[r][4] = 2;
    for (let r = 7; r <= 8; r++) rm.tiles[r][9] = 2;
    for (let r = 0; r < ROWS - 2; r++) rm.tiles[r][0] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    rm.tiles[ROWS-2][1] = 1; rm.tiles[ROWS-1][1] = 1;
    for (let r = 0; r < ROWS - 4; r++) rm.tiles[r][COLS-1] = 1;
    rm.enemies.push({ type: 'flier', x: 6 * TILE, y: 4 * TILE });
    rm.enemies.push({ type: 'turret', x: 12 * TILE, y: 5 * TILE, dir: -1 });
    rm.enemies.push({ type: 'walker', x: 8 * TILE, y: 8 * TILE });
    rm.enemies.push({ type: 'flier', x: 3 * TILE, y: 7 * TILE });
    rm.exitDir = 'right';
    roomList.push(rm);
  }
  {
    const rm = createRoom(COLS, ROWS);
    for (let c = 0; c < COLS; c++) { rm.tiles[ROWS-1][c] = 1; rm.tiles[ROWS-2][c] = 1; }
    for (let r = 0; r < ROWS; r++) { rm.tiles[r][0] = 1; rm.tiles[r][COLS-1] = 1; }
    for (let c = 2; c < 5; c++) rm.tiles[8][c] = 1;
    for (let c = 7; c < 9; c++) rm.tiles[6][c] = 1;
    for (let c = 11; c < 14; c++) rm.tiles[8][c] = 1;
    for (let c = 4; c < 8; c++) rm.tiles[4][c] = 1;
    for (let c = 9; c < 12; c++) rm.tiles[4][c] = 1;
    rm.tiles[ROWS-3][0] = 0; rm.tiles[ROWS-4][0] = 0;
    rm.bossRoom = true;
    rm.playerStart = { x: 2 * TILE, y: (ROWS - 3) * TILE };
    roomList.push(rm);
  }
  return roomList;
}

function generateStages() {
  return [generateStage1(), generateStage2(), generateStage3()];
}

// --- Tile Helpers ---
function getTile(rm, col, row) {
  if (row < 0 || row >= rm.h || col < 0 || col >= rm.w) return 1;
  return rm.tiles[row][col];
}
function isSolid(rm, col, row) { return getTile(rm, col, row) === 1; }
function isSpike(rm, col, row) { return getTile(rm, col, row) === 3; }
function isLadder(rm, col, row) { return getTile(rm, col, row) === 2; }

// --- Collision ---
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveEntityTiles(ent, rm) {
  // Horizontal
  const futureX = ent.x + ent.vx;
  let blockedH = false;
  const c1 = Math.floor(futureX / TILE);
  const c2 = Math.floor((futureX + ent.w - 1) / TILE);
  const r1 = Math.floor(ent.y / TILE);
  const r2 = Math.floor((ent.y + ent.h - 1) / TILE);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (isSolid(rm, c, r)) { blockedH = true; break; }
    }
    if (blockedH) break;
  }
  if (!blockedH) ent.x = futureX;
  else ent.vx = 0;

  // Vertical
  const futureY = ent.y + ent.vy;
  const cr1 = Math.floor(ent.x / TILE);
  const cr2 = Math.floor((ent.x + ent.w - 1) / TILE);
  const rr1 = Math.floor(futureY / TILE);
  const rr2 = Math.floor((futureY + ent.h - 1) / TILE);
  let blockedV = false;
  ent.onGround = false;
  for (let r = rr1; r <= rr2; r++) {
    for (let c = cr1; c <= cr2; c++) {
      if (isSolid(rm, c, r)) { blockedV = true; if (ent.vy > 0) ent.onGround = true; break; }
    }
    if (blockedV) break;
  }
  if (!blockedV) ent.y = futureY;
  else ent.vy = 0;

  // Spike check
  const sc1 = Math.floor(ent.x / TILE);
  const sc2 = Math.floor((ent.x + ent.w - 1) / TILE);
  const sr1 = Math.floor(ent.y / TILE);
  const sr2 = Math.floor((ent.y + ent.h - 1) / TILE);
  for (let r = sr1; r <= sr2; r++) {
    for (let c = sc1; c <= sc2; c++) {
      if (isSpike(rm, c, r)) return 'spike';
    }
  }
  return null;
}

// --- Particles ---
function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 / 14) * i + Math.random() * 0.3;
    const spd = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 25 + Math.random() * 15, maxLife: 40,
      color, size: 3 + Math.random() * 2,
    });
  }
}

function spawnSmallParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      life: 10 + Math.random() * 10, maxLife: 20,
      color, size: 2,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// --- Enemy ---
function createEnemy(def) {
  const e = {
    type: def.type, x: def.x, y: def.y, vx: 0, vy: 0,
    w: 20, h: 24, hp: 3, alive: true, dir: def.dir || 1,
    shootTimer: 0, moveTimer: 0, startX: def.x, startY: def.y,
  };
  if (def.type === 'walker') { e.hp = 3; e.vx = 1.2 * e.dir; }
  else if (def.type === 'flier') { e.hp = 2; e.w = 22; e.h = 18; e.floatAngle = Math.random() * Math.PI * 2; }
  else if (def.type === 'turret') { e.hp = 5; e.w = 24; e.h = 24; e.shootTimer = 60 + Math.random() * 60; }
  return e;
}

function spawnRoomEnemies() {
  enemies = [];
  const rm = rooms[currentRoom];
  rm.enemies.forEach(def => enemies.push(createEnemy(def)));
  if (rm.bossRoom && !boss) spawnBoss();
}

function spawnBoss() {
  const pattern = BOSS_PATTERNS[Math.min(stage - 1, BOSS_PATTERNS.length - 1)];
  boss = {
    x: 12 * TILE, y: (ROWS - 3) * TILE - 8,
    vx: 0, vy: 0, w: pattern.w, h: pattern.h,
    hp: pattern.hp, maxHp: pattern.hp,
    color: pattern.color, glowColor: pattern.glowColor, name: pattern.name,
    speed: pattern.speed, jumpForce: pattern.jumpForce,
    shootInterval: pattern.shootInterval, pattern: pattern.pattern,
    facing: -1, dir: -1, onGround: false,
    shootTimer: 0, actionTimer: 0, invincible: 0,
    alive: true, bullets: [], phase: 0,
  };
  bossActive = true;
}

function updateEnemy(e, rm) {
  if (e.type === 'walker') {
    e.vy += GRAVITY;
    e.x += e.vx; e.y += e.vy;
    const feetC = Math.floor((e.x + e.w / 2) / TILE);
    const feetR = Math.floor((e.y + e.h) / TILE);
    if (isSolid(rm, feetC, feetR)) { e.y = feetR * TILE - e.h; e.vy = 0; e.onGround = true; }
    else e.onGround = false;
    const frontC = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / TILE);
    const frontR = Math.floor((e.y + e.h / 2) / TILE);
    const edgeC = Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / TILE);
    const edgeR = Math.floor((e.y + e.h + 4) / TILE);
    if (isSolid(rm, frontC, frontR) || (!isSolid(rm, edgeC, edgeR) && e.onGround)) {
      e.vx = -e.vx; e.dir = -e.dir;
    }
    if (e.x < TILE) { e.x = TILE; e.vx = Math.abs(e.vx); e.dir = 1; }
    if (e.x + e.w > (COLS - 1) * TILE) { e.x = (COLS - 1) * TILE - e.w; e.vx = -Math.abs(e.vx); e.dir = -1; }
  } else if (e.type === 'flier') {
    e.floatAngle += 0.03;
    e.x = e.startX + Math.sin(e.floatAngle * 1.5) * 40;
    e.y = e.startY + Math.sin(e.floatAngle) * 25;
    e.shootTimer++;
    if (e.shootTimer > 90) {
      e.shootTimer = 0;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      enemies.push({
        type: 'ebullet', x: e.x + e.w / 2 - 3, y: e.y + e.h / 2 - 3,
        vx: (dx / dist) * 2.5, vy: (dy / dist) * 2.5,
        w: 6, h: 6, hp: 1, alive: true, dir: 1,
        shootTimer: 0, moveTimer: 0, startX: 0, startY: 0, isBullet: true,
      });
    }
  } else if (e.type === 'turret') {
    e.shootTimer--;
    if (e.shootTimer <= 0) {
      e.shootTimer = 70 + Math.random() * 40;
      enemies.push({
        type: 'ebullet', x: e.x + (e.dir > 0 ? e.w : -6), y: e.y + e.h / 2 - 3,
        vx: 3 * e.dir, vy: 0,
        w: 6, h: 6, hp: 1, alive: true, dir: e.dir,
        shootTimer: 0, moveTimer: 0, startX: 0, startY: 0, isBullet: true,
      });
    }
  } else if (e.type === 'ebullet') {
    e.x += e.vx; e.y += e.vy;
    const bc = Math.floor(e.x / TILE);
    const br = Math.floor(e.y / TILE);
    if (e.x < -10 || e.x > COLS * TILE + 10 || e.y < -10 || e.y > ROWS * TILE + 10 || isSolid(rm, bc, br)) {
      e.alive = false; return;
    }
    if (player.invincible <= 0 && rectCollide(player, e)) { damagePlayer(3); e.alive = false; }
  }
}

function updateBoss(rm) {
  boss.actionTimer++;
  boss.shootTimer++;
  boss.facing = player.x < boss.x ? -1 : 1;
  if (boss.pattern === 'jumper') {
    boss.vy += GRAVITY;
    if (boss.onGround && boss.actionTimer > 60) {
      boss.vy = boss.jumpForce; boss.vx = boss.facing * boss.speed * 1.5; boss.actionTimer = 0;
    }
    if (boss.onGround) boss.vx *= 0.85;
  } else if (boss.pattern === 'slider') {
    boss.vy += GRAVITY;
    if (boss.actionTimer > 40) {
      boss.vx = boss.facing * boss.speed;
      if (boss.onGround && Math.random() < 0.02) { boss.vy = boss.jumpForce; boss.actionTimer = 0; }
    }
    if (boss.onGround) boss.vx *= 0.92;
  } else if (boss.pattern === 'aggressive') {
    boss.vy += GRAVITY;
    boss.vx = boss.facing * boss.speed;
    if (boss.onGround && boss.actionTimer > 30 && Math.abs(player.x - boss.x) < 200) {
      boss.vy = boss.jumpForce; boss.actionTimer = 0;
    }
  }
  if (boss.shootTimer >= boss.shootInterval) { boss.shootTimer = 0; bossShoot(); }
  boss.x += boss.vx; boss.y += boss.vy;
  const feetR = Math.floor((boss.y + boss.h) / TILE);
  const midC = Math.floor((boss.x + boss.w / 2) / TILE);
  boss.onGround = false;
  if (isSolid(rm, midC, feetR)) { boss.y = feetR * TILE - boss.h; boss.vy = 0; boss.onGround = true; }
  const leftC = Math.floor(boss.x / TILE);
  const rightC = Math.floor((boss.x + boss.w) / TILE);
  const headR = Math.floor(boss.y / TILE);
  if (isSolid(rm, leftC, headR) || isSolid(rm, leftC, feetR - 1)) { boss.x = (leftC + 1) * TILE; boss.vx = 0; }
  if (isSolid(rm, rightC, headR) || isSolid(rm, rightC, feetR - 1)) { boss.x = rightC * TILE - boss.w; boss.vx = 0; }
}

function bossShoot() {
  const bx = boss.x + boss.w / 2;
  const by = boss.y + boss.h / 2;
  if (boss.pattern === 'jumper') {
    boss.bullets.push({ x: bx, y: by, vx: boss.facing * 4, vy: -3 });
    boss.bullets.push({ x: bx, y: by, vx: boss.facing * 3, vy: -1 });
  } else if (boss.pattern === 'slider') {
    boss.bullets.push({ x: bx, y: by - 8, vx: boss.facing * 5, vy: 0 });
    boss.bullets.push({ x: bx, y: by, vx: boss.facing * 5, vy: 0 });
    boss.bullets.push({ x: bx, y: by + 8, vx: boss.facing * 5, vy: 0 });
  } else if (boss.pattern === 'aggressive') {
    const dx = player.x - bx;
    const dy = player.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.bullets.push({ x: bx, y: by, vx: (dx / dist) * 5, vy: (dy / dist) * 5 });
    boss.bullets.push({ x: bx, y: by, vx: boss.facing * 4, vy: -2 });
    boss.bullets.push({ x: bx, y: by, vx: boss.facing * 4, vy: 2 });
  }
}

function bossDefeated(game) {
  boss.alive = false;
  score += 200 + stage * 100;
  scoreEl.textContent = score;
  spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.color);
  spawnExplosion(boss.x + boss.w / 2 - 10, boss.y, boss.color);
  spawnExplosion(boss.x + boss.w / 2 + 10, boss.y + boss.h, boss.color);

  if (stage < 3) {
    stageTransitionTimer = 90; // ~1.5 seconds at 60fps
    stageTransitionAction = 'next';
  } else {
    stageTransitionTimer = 90;
    stageTransitionAction = 'win';
  }
}

function damagePlayer(amount) {
  if (player.invincible > 0 || player.dead) return;
  player.hp -= amount;
  player.invincible = 60;
  if (player.hp <= 0) { player.hp = 0; playerDeath(); }
}

function playerDeath() {
  player.dead = true;
  deathTimer = 60;
  spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, THEME);
}

function gameOver(game) {
  game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
  game.setState('over');
}

function playerShoot() {
  if (player.shootTimer > 0 || player.dead) return;
  if (bullets.length >= 3) return;
  player.shootTimer = 10;
  player.shooting = true;
  shootAnimTimer = 9; // ~150ms at 60fps
  bullets.push({
    x: player.x + player.w / 2 + player.facing * 10,
    y: player.y + player.h / 2 - 2,
    vx: BULLET_SPEED * player.facing, vy: 0,
    w: 8, h: 4,
  });
}

function loadStage(stageNum) {
  const allStages = generateStages();
  const idx = Math.min(stageNum - 1, allStages.length - 1);
  rooms = allStages[idx];
  currentRoom = 0;
  bullets = [];
  enemies = [];
  particles = [];
  pickups = [];
  boss = null;
  bossActive = false;
  deathTimer = 0;
  shootAnimTimer = 0;
  stageTransitionTimer = 0;
  stageTransitionAction = null;
  stageEl.textContent = stageNum;

  const rm = rooms[currentRoom];
  const start = rm.playerStart || { x: 2 * TILE, y: (ROWS - 3) * TILE };
  player = {
    x: start.x, y: start.y, vx: 0, vy: 0,
    w: 20, h: 28, hp: MAX_HP, maxHp: MAX_HP,
    facing: 1, onGround: false, onLadder: false,
    shooting: false, shootTimer: 0, invincible: 0, dead: false,
  };
  spawnRoomEnemies();
}

function shadeColor(hex, amount) {
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16) || 0;
    g = parseInt(hex.slice(3, 5), 16) || 0;
    b = parseInt(hex.slice(5, 7), 16) || 0;
  }
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Color helpers ──

function colorWithAlpha(hex, alpha01) {
  // Expand #rgb to #rrggbb, then append alpha hex
  let full;
  if (hex.length === 4) {
    full = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  } else if (hex.length === 7) {
    full = hex;
  } else {
    full = hex.slice(0, 7); // strip existing alpha if any
  }
  const a = Math.floor(Math.max(0, Math.min(1, alpha01)) * 255).toString(16).padStart(2, '0');
  return full + a;
}

// ── Drawing helpers ──

function drawMegaManSprite(renderer, text, x, y, facing, shooting, t) {
  const f = facing;
  renderer.setGlow(PLAYER_COLOR, 0.5);

  // Helmet
  renderer.fillRect(x + 2, y, 16, 10, PLAYER_COLOR);
  renderer.fillRect(x, y + 3, 20, 6, PLAYER_COLOR);
  // Visor
  if (f > 0) {
    renderer.fillRect(x + 13, y + 4, 6, 4, '#1a1a2e');
    renderer.fillRect(x + 15, y + 4, 3, 3, '#fff');
  } else {
    renderer.fillRect(x + 1, y + 4, 6, 4, '#1a1a2e');
    renderer.fillRect(x + 2, y + 4, 3, 3, '#fff');
  }

  // Body
  renderer.fillRect(x + 4, y + 10, 12, 10, PLAYER_COLOR);

  // Arm cannon / arm
  if (shooting) {
    if (f > 0) {
      renderer.fillRect(x + 16, y + 12, 8, 6, PLAYER_DARK);
      renderer.fillRect(x + 22, y + 13, 4, 4, THEME);
    } else {
      renderer.fillRect(x - 4, y + 12, 8, 6, PLAYER_DARK);
      renderer.fillRect(x - 6, y + 13, 4, 4, THEME);
    }
  } else {
    if (f > 0) renderer.fillRect(x + 14, y + 12, 6, 5, PLAYER_DARK);
    else renderer.fillRect(x, y + 12, 6, 5, PLAYER_DARK);
  }

  // Legs
  const walkCycle = player.onGround ? Math.sin(t * 0.15) * 2 : 0;
  renderer.fillRect(x + 4, y + 20, 5, 8 + walkCycle, PLAYER_DARK);
  renderer.fillRect(x + 11, y + 20, 5, 8 - walkCycle, PLAYER_DARK);
  renderer.setGlow(null);
}

function drawWalkerEnemy(renderer, e) {
  renderer.setGlow('#f44', 0.4);
  renderer.fillRect(e.x + 2, e.y + 4, 16, 14, '#f44');
  renderer.fillRect(e.x, e.y + 8, 20, 8, '#f44');
  renderer.fillRect(e.x + 4, e.y + 7, 4, 4, '#ff0');
  renderer.fillRect(e.x + 12, e.y + 7, 4, 4, '#ff0');
  renderer.fillRect(e.x + 5, e.y + 8, 2, 2, '#1a1a2e');
  renderer.fillRect(e.x + 13, e.y + 8, 2, 2, '#1a1a2e');
  renderer.fillRect(e.x + 3, e.y + 18, 5, 6, '#a22');
  renderer.fillRect(e.x + 12, e.y + 18, 5, 6, '#a22');
  renderer.setGlow(null);
}

function drawFlierEnemy(renderer, e) {
  renderer.setGlow('#f80', 0.5);
  renderer.fillCircle(e.x + e.w / 2, e.y + e.h / 2, 9, '#f80');
  const wingFlap = Math.sin(tick * 0.2) * 4;
  renderer.fillRect(e.x - 6, e.y + 4 + wingFlap, 8, 4, '#fa4');
  renderer.fillRect(e.x + e.w - 2, e.y + 4 - wingFlap, 8, 4, '#fa4');
  renderer.fillRect(e.x + 8, e.y + 6, 5, 4, '#fff');
  renderer.fillRect(e.x + 10, e.y + 7, 2, 2, '#1a1a2e');
  renderer.setGlow(null);
}

function drawTurretEnemy(renderer, e) {
  renderer.setGlow('#f44', 0.3);
  renderer.fillRect(e.x, e.y + 8, 24, 16, '#888');
  renderer.fillRect(e.x + 2, e.y + 10, 20, 12, '#666');
  if (e.dir > 0) renderer.fillRect(e.x + 18, e.y + 12, 10, 6, '#aaa');
  else renderer.fillRect(e.x - 4, e.y + 12, 10, 6, '#aaa');
  renderer.setGlow('#f44', 0.5);
  renderer.fillCircle(e.x + 12, e.y + 14, 3, '#f44');
  renderer.setGlow(null);
}

function drawBossSprite(renderer, text, b) {
  const flash = b.invincible > 0 && Math.floor(tick / 2) % 2 === 0;
  const bodyColor = flash ? '#fff' : b.color;
  const darker = flash ? '#ddd' : shadeColor(b.color, -30);

  renderer.setGlow(b.glowColor, 0.6);
  // Helmet
  renderer.fillRect(b.x, b.y, b.w, 14, bodyColor);
  renderer.fillRect(b.x - 2, b.y + 4, b.w + 4, 8, bodyColor);
  // Visor
  if (b.facing > 0) {
    renderer.fillRect(b.x + 18, b.y + 5, 10, 6, '#1a1a2e');
    renderer.fillRect(b.x + 22, b.y + 6, 5, 4, flash ? '#fff' : '#ff0');
  } else {
    renderer.fillRect(b.x, b.y + 5, 10, 6, '#1a1a2e');
    renderer.fillRect(b.x + 1, b.y + 6, 5, 4, flash ? '#fff' : '#ff0');
  }
  // Body
  renderer.fillRect(b.x + 2, b.y + 14, b.w - 4, 12, bodyColor);
  // Legs
  renderer.fillRect(b.x + 4, b.y + 26, 8, 10, darker);
  renderer.fillRect(b.x + b.w - 12, b.y + 26, 8, 10, darker);
  renderer.setGlow(null);

  // Boss HP bar
  const barW = 120;
  const barX = W / 2 - barW / 2;
  const barY = 8;
  renderer.fillRect(barX, barY, barW, 8, '#333');
  renderer.setGlow(b.color, 0.3);
  renderer.fillRect(barX, barY, barW * (b.hp / b.maxHp), 8, b.color);
  renderer.setGlow(null);
  // Boss name
  text.drawText(b.name, W / 2, barY + 12, 10, b.color, 'center');
}

function drawHUD(renderer, text) {
  const hpBarW = 100;
  const hpBarH = 8;
  const hpX = 10;
  const hpY = 8;

  renderer.fillRect(hpX, hpY, hpBarW, hpBarH, '#333');
  const hpRatio = player.hp / player.maxHp;
  const hpColor = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff0' : '#f44';
  renderer.setGlow(hpColor, 0.3);
  renderer.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH, hpColor);
  renderer.setGlow(null);
  text.drawText('HP', hpX + hpBarW + 5, hpY, 10, '#e0e0e0', 'left');
  text.drawText(`Room ${currentRoom + 1}/${rooms.length}`, W - 10, 8, 10, '#888', 'right');
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    stage = 1;
    tick = 0;
    shootAnimTimer = 0;
    stageTransitionTimer = 0;
    stageTransitionAction = null;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    stageEl.textContent = '1';
    game.showOverlay('MEGA MAN', 'Arrow Keys: Move/Climb | Up: Jump | Space: Shoot');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ') || input.wasPressed('x')) {
        game.setState('playing');
        loadStage(stage);
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('x')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;

    // Stage transition timer (replaces setTimeout)
    if (stageTransitionTimer > 0) {
      stageTransitionTimer--;
      if (stageTransitionTimer <= 0) {
        if (stageTransitionAction === 'next') {
          stage++;
          loadStage(stage);
        } else if (stageTransitionAction === 'win') {
          game.showOverlay('YOU WIN!', `Final Score: ${score} -- Press any key to restart`);
          game.setState('over');
        }
        stageTransitionAction = null;
      }
      // Still update particles during transition
      updateParticles();
      return;
    }

    // Shoot animation timer (replaces setTimeout)
    if (shootAnimTimer > 0) {
      shootAnimTimer--;
      if (shootAnimTimer <= 0) player.shooting = false;
    }

    const rm = rooms[currentRoom];

    if (player.dead) {
      deathTimer--;
      updateParticles();
      if (deathTimer <= 0) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) { gameOver(game); return; }
        player.dead = false;
        player.hp = MAX_HP;
        player.invincible = 90;
        const start = rm.playerStart || { x: 2 * TILE, y: (ROWS - 3) * TILE };
        player.x = start.x; player.y = start.y;
        player.vx = 0; player.vy = 0;
        bullets = [];
        if (boss) boss.bullets = [];
        spawnRoomEnemies();
      }
      return;
    }

    // Player input
    player.vx = 0;
    const centerCol = Math.floor((player.x + player.w / 2) / TILE);
    const centerRow = Math.floor((player.y + player.h / 2) / TILE);
    const feetRow = Math.floor((player.y + player.h + 2) / TILE);
    const onLadderTile = isLadder(rm, centerCol, centerRow);
    const ladderBelow = isLadder(rm, centerCol, feetRow);

    if (input.isDown('ArrowLeft') || input.isDown('a')) { player.vx = -MOVE_SPEED; player.facing = -1; }
    if (input.isDown('ArrowRight') || input.isDown('d')) { player.vx = MOVE_SPEED; player.facing = 1; }

    // Ladder climbing
    if ((input.isDown('ArrowUp') || input.isDown('w')) && onLadderTile) {
      player.onLadder = true; player.vy = -2.5;
    } else if ((input.isDown('ArrowDown') || input.isDown('s')) && (onLadderTile || ladderBelow)) {
      player.onLadder = true; player.vy = 2.5;
    } else if (player.onLadder) {
      if (!onLadderTile && !ladderBelow) player.onLadder = false;
      else player.vy = 0;
    }

    // Jump
    if ((input.isDown('ArrowUp') || input.isDown('w')) && player.onGround && !player.onLadder) {
      player.vy = JUMP_FORCE; player.onGround = false;
    }

    // Gravity
    if (!player.onLadder) { player.vy += GRAVITY; if (player.vy > 12) player.vy = 12; }

    // Resolve movement
    const spikeHit = resolveEntityTiles(player, rm);
    if (spikeHit === 'spike') damagePlayer(8);

    if (player.invincible > 0) player.invincible--;
    if (player.shootTimer > 0) player.shootTimer--;

    // Shoot
    if (input.wasPressed(' ') || input.wasPressed('x')) playerShoot();

    // Room transition
    if (player.x + player.w > COLS * TILE - 4 && currentRoom < rooms.length - 1 && rm.exitDir === 'right') {
      currentRoom++;
      player.x = TILE + 4; player.vy = 0;
      bullets = []; pickups = [];
      spawnRoomEnemies();
      return;
    }

    // Fall out of bounds
    if (player.y > ROWS * TILE + 32) damagePlayer(MAX_HP);

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.x < -10 || b.x > COLS * TILE + 10 || b.y < -10 || b.y > ROWS * TILE + 10) {
        bullets.splice(i, 1); continue;
      }
      const bc = Math.floor(b.x / TILE);
      const br = Math.floor(b.y / TILE);
      if (isSolid(rm, bc, br)) { spawnSmallParticles(b.x, b.y, THEME, 3); bullets.splice(i, 1); continue; }
      let hitEnemy = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            score += (e.type === 'turret' ? 30 : e.type === 'flier' ? 20 : 15);
            scoreEl.textContent = score;
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, ENEMY_COLORS[0]);
            if (Math.random() < 0.35) {
              pickups.push({
                x: e.x + e.w / 2 - 6, y: e.y, w: 12, h: 12,
                type: Math.random() < 0.5 ? 'hp' : 'score', vy: 0,
              });
            }
          } else { spawnSmallParticles(b.x, b.y, '#fff', 3); }
          hitEnemy = true; break;
        }
      }
      if (hitEnemy) { bullets.splice(i, 1); continue; }
      // Hit boss
      if (boss && boss.alive && boss.invincible <= 0) {
        if (b.x >= boss.x && b.x <= boss.x + boss.w && b.y >= boss.y && b.y <= boss.y + boss.h) {
          boss.hp -= 1; boss.invincible = 8;
          spawnSmallParticles(b.x, b.y, '#fff', 4);
          bullets.splice(i, 1);
          if (boss.hp <= 0) bossDefeated(game);
          continue;
        }
      }
    }

    // Update enemies
    enemies.forEach(e => {
      if (!e.alive) return;
      updateEnemy(e, rm);
      if (player.invincible <= 0 && rectCollide(player, e)) {
        damagePlayer(4);
        player.vx = -player.facing * 4; player.vy = -3;
      }
    });

    // Update boss
    if (boss && boss.alive) {
      updateBoss(rm);
      if (boss.invincible > 0) boss.invincible--;
      for (let i = boss.bullets.length - 1; i >= 0; i--) {
        const b = boss.bullets[i];
        b.x += b.vx; b.y += b.vy;
        if (b.x < -10 || b.x > COLS * TILE + 10 || b.y < -10 || b.y > ROWS * TILE + 10) {
          boss.bullets.splice(i, 1); continue;
        }
        const bc = Math.floor(b.x / TILE);
        const br = Math.floor(b.y / TILE);
        if (isSolid(rm, bc, br)) { spawnSmallParticles(b.x, b.y, boss.color, 3); boss.bullets.splice(i, 1); continue; }
        if (player.invincible <= 0 &&
            b.x >= player.x && b.x <= player.x + player.w &&
            b.y >= player.y && b.y <= player.y + player.h) {
          damagePlayer(4); boss.bullets.splice(i, 1);
        }
      }
      if (player.invincible <= 0 && rectCollide(player, boss)) {
        damagePlayer(6);
        player.vx = -player.facing * 5; player.vy = -4;
      }
    }

    // Update pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.vy += 0.3; p.y += p.vy;
      const pc = Math.floor((p.x + p.w / 2) / TILE);
      const pr = Math.floor((p.y + p.h) / TILE);
      if (isSolid(rm, pc, pr)) { p.y = pr * TILE - p.h; p.vy = 0; }
      if (rectCollide(player, p)) {
        if (p.type === 'hp') player.hp = Math.min(player.hp + 6, MAX_HP);
        else { score += 50; scoreEl.textContent = score; }
        spawnSmallParticles(p.x + p.w / 2, p.y + p.h / 2, p.type === 'hp' ? PICKUP_HP_COLOR : PICKUP_SCORE_COLOR, 6);
        pickups.splice(i, 1);
      }
    }

    updateParticles();

    // ML gameData
    window.gameData = {
      playerX: player.x, playerY: player.y,
      playerHP: player.hp, playerFacing: player.facing,
      enemies: enemies.filter(e => e.alive).map(e => ({ x: e.x, y: e.y, type: e.type })),
      bossHP: boss ? boss.hp : 0,
      room: currentRoom, stage: stage,
    };
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      // Draw a preview of the player character
      drawMegaManSprite(renderer, text, W / 2 - 20, H / 2 + 40, 1, false, 0);
      return;
    }

    if (!rooms) return;
    const rm = rooms[currentRoom];

    // Draw tiles
    for (let r = 0; r < rm.h; r++) {
      for (let c = 0; c < rm.w; c++) {
        const t = rm.tiles[r][c];
        const tx = c * TILE;
        const ty = r * TILE;
        if (t === 1) {
          renderer.fillRect(tx, ty, TILE, TILE, PLATFORM_COLOR);
          renderer.fillRect(tx, ty, TILE, 3, PLATFORM_TOP);
          // Grid lines as thin rects
          renderer.fillRect(tx, ty, TILE, 1, GRID_LINE_COLOR);
          renderer.fillRect(tx, ty, 1, TILE, GRID_LINE_COLOR);
          renderer.fillRect(tx + TILE - 1, ty, 1, TILE, GRID_LINE_COLOR);
          renderer.fillRect(tx, ty + TILE - 1, TILE, 1, GRID_LINE_COLOR);
        } else if (t === 2) {
          // Ladder
          renderer.fillRect(tx + 4, ty, 4, TILE, LADDER_COLOR);
          renderer.fillRect(tx + TILE - 8, ty, 4, TILE, LADDER_COLOR);
          for (let ry = 0; ry < TILE; ry += 10) {
            renderer.fillRect(tx + 4, ty + ry, TILE - 8, 2, LADDER_COLOR);
          }
        } else if (t === 3) {
          // Spikes as triangles
          renderer.setGlow(SPIKE_COLOR, 0.3);
          const spikes = 4;
          const sw = TILE / spikes;
          for (let s = 0; s < spikes; s++) {
            const points = [
              { x: tx + s * sw, y: ty + TILE },
              { x: tx + s * sw + sw / 2, y: ty + 4 },
              { x: tx + (s + 1) * sw, y: ty + TILE },
            ];
            renderer.fillPoly(points, SPIKE_COLOR);
          }
          renderer.setGlow(null);
        }
      }
    }

    // Draw pickups
    pickups.forEach(p => {
      const glow = p.type === 'hp' ? PICKUP_HP_COLOR : PICKUP_SCORE_COLOR;
      renderer.setGlow(glow, 0.5);
      if (p.type === 'hp') {
        renderer.fillRect(p.x + 3, p.y, 6, 12, glow);
        renderer.fillRect(p.x, p.y + 3, 12, 6, glow);
      } else {
        renderer.fillPoly([
          { x: p.x + 6, y: p.y },
          { x: p.x + 12, y: p.y + 6 },
          { x: p.x + 6, y: p.y + 12 },
          { x: p.x, y: p.y + 6 },
        ], glow);
      }
      renderer.setGlow(null);
    });

    // Draw enemies
    enemies.forEach(e => {
      if (!e.alive) return;
      if (e.type === 'walker') drawWalkerEnemy(renderer, e);
      else if (e.type === 'flier') drawFlierEnemy(renderer, e);
      else if (e.type === 'turret') drawTurretEnemy(renderer, e);
      else if (e.type === 'ebullet') {
        renderer.setGlow('#f44', 0.4);
        renderer.fillCircle(e.x + e.w / 2, e.y + e.h / 2, 3, '#f44');
        renderer.setGlow(null);
      }
    });

    // Draw boss
    if (boss && boss.alive) drawBossSprite(renderer, text, boss);

    // Draw player bullets
    bullets.forEach(b => {
      renderer.setGlow(THEME, 0.5);
      renderer.fillRect(b.x - 2, b.y, 10, 4, THEME);
      renderer.fillRect(b.x, b.y + 1, 6, 2, '#fff');
      renderer.setGlow(null);
    });

    // Draw boss bullets
    if (boss && boss.bullets) {
      boss.bullets.forEach(b => {
        renderer.setGlow(boss.color || '#f44', 0.4);
        renderer.fillCircle(b.x, b.y, 4, boss.color || '#f44');
        renderer.setGlow(null);
      });
    }

    // Draw player
    if (!player.dead) {
      if (player.invincible > 0 && Math.floor(tick / 3) % 2 === 0) {
        // Flashing when invincible - skip draw
      } else {
        drawMegaManSprite(renderer, text, player.x, player.y, player.facing, player.shooting, tick);
      }
    }

    // Draw particles
    particles.forEach(p => {
      const alpha01 = p.life / p.maxLife;
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, colorWithAlpha(p.color, alpha01));
    });

    // Draw HUD
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
