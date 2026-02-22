// terraria-lite/game.js — Terraria Lite as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;
const TILE = 12;
const WORLD_W = 50, WORLD_H = 34;

// UI element refs
const hpEl    = document.getElementById('hp');
const scoreEl = document.getElementById('score');
const dayEl   = document.getElementById('day');
const todEl   = document.getElementById('timeOfDay');
const toolEl  = document.getElementById('tool');
const allyHpEl = document.getElementById('allyHp');

let score = 0;

// ---- Tile types ----
const T = {
  AIR: 0, DIRT: 1, STONE: 2, GRASS: 3, IRON_ORE: 4, GOLD_ORE: 5,
  WOOD: 6, LEAF: 7, PLATFORM: 8, DOOR: 9, WALL: 10, TORCH: 11,
  BEDROCK: 12, SAND: 13
};

const TILE_COLORS = {
  [T.AIR]: null,
  [T.DIRT]: '#8B5E3C',
  [T.STONE]: '#808080',
  [T.GRASS]: '#4a7a3a',
  [T.IRON_ORE]: '#A8A8C0',
  [T.GOLD_ORE]: '#D4A017',
  [T.WOOD]: '#6B3A1F',
  [T.LEAF]: '#2E7D32',
  [T.PLATFORM]: '#7A5C3E',
  [T.DOOR]: '#5C3D1E',
  [T.WALL]: '#5A5A5A',
  [T.TORCH]: '#FFA000',
  [T.BEDROCK]: '#333333',
  [T.SAND]: '#C2B280'
};

const TILE_HARDNESS = {
  [T.DIRT]: 15, [T.STONE]: 40, [T.GRASS]: 15, [T.IRON_ORE]: 55,
  [T.GOLD_ORE]: 65, [T.WOOD]: 20, [T.LEAF]: 5, [T.PLATFORM]: 8,
  [T.DOOR]: 12, [T.WALL]: 30, [T.TORCH]: 3, [T.BEDROCK]: 9999,
  [T.SAND]: 10
};

// ---- Items / Crafting ----
const ITEMS = {
  DIRT:      { name: 'Dirt',      tile: T.DIRT,     color: '#8B5E3C', placeable: true },
  STONE:     { name: 'Stone',     tile: T.STONE,    color: '#808080', placeable: true },
  WOOD:      { name: 'Wood',      tile: T.WOOD,     color: '#6B3A1F', placeable: true },
  IRON:      { name: 'Iron',                        color: '#A8A8C0', placeable: false },
  GOLD:      { name: 'Gold',                        color: '#D4A017', placeable: false },
  SAND:      { name: 'Sand',      tile: T.SAND,     color: '#C2B280', placeable: true },
  LEAF:      { name: 'Leaf',      tile: T.LEAF,     color: '#2E7D32', placeable: true },
  PLATFORM:  { name: 'Platform',  tile: T.PLATFORM, color: '#7A5C3E', placeable: true },
  DOOR:      { name: 'Door',      tile: T.DOOR,     color: '#5C3D1E', placeable: true },
  WALL_BLOCK:{ name: 'Wall',      tile: T.WALL,     color: '#5A5A5A', placeable: true },
  TORCH:     { name: 'Torch',     tile: T.TORCH,    color: '#FFA000', placeable: true },
  PICKAXE:   { name: 'Pickaxe',                     color: '#B0C4DE', tool: true },
  SWORD:     { name: 'Sword',                       color: '#E0E0E0', tool: true },
  IRON_PICK: { name: 'IronPick',                    color: '#7090B0', tool: true },
  IRON_SWORD:{ name: 'IronSword',                   color: '#B0B0CC', tool: true },
  GOLD_SWORD:{ name: 'GoldSword',                   color: '#FFD700', tool: true }
};

const RECIPES = [
  { result: 'PICKAXE',   need: { WOOD: 5 },              label: 'Pickaxe (5 Wood)' },
  { result: 'SWORD',     need: { WOOD: 7, STONE: 3 },    label: 'Sword (7 Wood, 3 Stone)' },
  { result: 'TORCH',     need: { WOOD: 1 },              label: 'Torch (1 Wood)',    qty: 3 },
  { result: 'PLATFORM',  need: { WOOD: 2 },              label: 'Platform (2 Wood)', qty: 4 },
  { result: 'DOOR',      need: { WOOD: 6 },              label: 'Door (6 Wood)' },
  { result: 'WALL_BLOCK',need: { STONE: 2 },             label: 'Wall (2 Stone)',    qty: 4 },
  { result: 'IRON_PICK', need: { IRON: 8, WOOD: 3 },     label: 'IronPick (8 Iron, 3 Wood)' },
  { result: 'IRON_SWORD',need: { IRON: 10, WOOD: 3 },    label: 'IronSword (10 Iron, 3 Wood)' },
  { result: 'GOLD_SWORD',need: { GOLD: 12, WOOD: 5 },    label: 'GoldSword (12 Gold, 5 Wood)' }
];

// ---- Game state ----
let world = [];
let lightMap = [];
let particles = [];
let enemies = [];
let projectiles = [];
let droppedItems = [];
let damageNumbers = [];
let worldTime = 0;
let dayCount = 1;
let bossActive = false;
let boss = null;
let showInventory = false;
let miningTarget = null;
let miningProgress = 0;
let cameraX = 0, cameraY = 0;
let player = null;
let ally = null;
let spawnTimer = 0;
let lightTimer = 0;
let gameStateLocal = 'menu'; // local mirror so non-engine code can check it

// ---- Mouse state (direct canvas listeners) ----
let mouseX = 0, mouseY = 0, mouseDown = false;
let mouseWorldX = 0, mouseWorldY = 0;

const GRAVITY = 0.4;
const JUMP_VEL = -7;

// ---- Helper: hex color with alpha factor (replaces globalAlpha) ----
function colorWithAlpha(hex, alpha) {
  // hex is '#rrggbb', return '#rrggbbaa'
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  const ah = a.toString(16).padStart(2, '0');
  if (hex.startsWith('#') && hex.length === 7) return hex + ah;
  if (hex.startsWith('#') && hex.length === 9) return hex.slice(0, 7) + ah;
  return hex;
}

// ---- Helper: lighten/darken a hex color by a light factor [0-1] ----
function applyLight(hex, light) {
  if (!hex) return '#00000000';
  // light=1 = full color, light=0 = black
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 0.3 + light * 0.7;
  const nr = Math.round(Math.min(255, r * factor)).toString(16).padStart(2, '0');
  const ng = Math.round(Math.min(255, g * factor)).toString(16).padStart(2, '0');
  const nb = Math.round(Math.min(255, b * factor)).toString(16).padStart(2, '0');
  return `#${nr}${ng}${nb}`;
}

function createEntity(x, y, isAlly) {
  return {
    x, y, w: 10, h: 20,
    vx: 0, vy: 0,
    hp: isAlly ? 80 : 100,
    maxHp: isAlly ? 80 : 100,
    onGround: false,
    facing: 1,
    inventory: {},
    hotbar: ['PICKAXE', 'SWORD', 'TORCH', 'PLATFORM', 'DIRT'],
    selectedSlot: 0,
    toolMode: 'mine',
    attackCooldown: 0,
    invincible: 0,
    isAlly: !!isAlly,
    animFrame: 0,
    animTimer: 0,
    swingTimer: 0,
    aiState: 'follow',
    aiTimer: 0,
    aiTarget: null,
    aiMiningTarget: null,
    aiMiningProgress: 0,
    respawnTimer: 0
  };
}

// ---- World Generation ----
function generateWorld() {
  world = [];
  for (let x = 0; x < WORLD_W; x++) {
    world[x] = [];
    const surfaceY = Math.floor(10 + Math.sin(x * 0.15) * 2 + Math.sin(x * 0.07) * 3);
    for (let y = 0; y < WORLD_H; y++) {
      if (y < surfaceY - 1) {
        world[x][y] = T.AIR;
      } else if (y === surfaceY - 1) {
        world[x][y] = T.GRASS;
      } else if (y < surfaceY + 5) {
        world[x][y] = T.DIRT;
      } else if (y >= WORLD_H - 1) {
        world[x][y] = T.BEDROCK;
      } else {
        const r = Math.random();
        if (r < 0.03 && y > surfaceY + 8) world[x][y] = T.GOLD_ORE;
        else if (r < 0.08 && y > surfaceY + 5) world[x][y] = T.IRON_ORE;
        else world[x][y] = T.STONE;
      }
      const cx = x * 0.12, cy = y * 0.12;
      const n = Math.sin(cx * 2.1 + cy * 1.3) * Math.cos(cx * 1.7 - cy * 2.4) +
                Math.sin(cx * 0.9 + cy * 3.1) * 0.5;
      if (n > 0.55 && y > surfaceY + 2 && y < WORLD_H - 1) {
        world[x][y] = T.AIR;
      }
    }
  }
  // Trees
  for (let x = 2; x < WORLD_W - 2; x++) {
    if (Math.random() < 0.12) {
      const surfaceY = getSurface(x);
      if (surfaceY > 3 && world[x][surfaceY] === T.GRASS) {
        const h = 3 + Math.floor(Math.random() * 3);
        for (let ty = 1; ty <= h; ty++) {
          if (surfaceY - 1 - ty >= 0) world[x][surfaceY - 1 - ty] = T.WOOD;
        }
        for (let lx = -1; lx <= 1; lx++) {
          for (let ly = 0; ly <= 2; ly++) {
            const tx = x + lx, ty = surfaceY - 1 - h - ly;
            if (tx >= 0 && tx < WORLD_W && ty >= 0 && world[tx][ty] === T.AIR) {
              world[tx][ty] = T.LEAF;
            }
          }
        }
        x += 3;
      }
    }
  }
}

function getSurface(x) {
  for (let y = 0; y < WORLD_H; y++) {
    if (world[x] && world[x][y] !== T.AIR) return y;
  }
  return WORLD_H - 2;
}

function tileAt(x, y) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return T.BEDROCK;
  return world[x][y];
}

function setTile(x, y, t) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
  if (world[x][y] === T.BEDROCK) return;
  world[x][y] = t;
}

// ---- Light map ----
function computeLight() {
  lightMap = [];
  for (let x = 0; x < WORLD_W; x++) {
    lightMap[x] = [];
    for (let y = 0; y < WORLD_H; y++) lightMap[x][y] = 0;
  }
  const isNight = worldTime < 5000 || worldTime > 19000;
  const skyLight = isNight ? 0.15 : 1.0;
  const duskLight = (worldTime >= 17000 && worldTime <= 19000) ?
    1.0 - (worldTime - 17000) / 2000 * 0.85 :
    (worldTime >= 5000 && worldTime <= 7000) ?
    0.15 + (worldTime - 5000) / 2000 * 0.85 : skyLight;

  for (let x = 0; x < WORLD_W; x++) {
    let sunPen = duskLight;
    for (let y = 0; y < WORLD_H; y++) {
      if (world[x][y] !== T.AIR && world[x][y] !== T.PLATFORM) {
        sunPen *= 0.65;
      }
      lightMap[x][y] = Math.max(lightMap[x][y], sunPen);
    }
  }
  for (let x = 0; x < WORLD_W; x++) {
    for (let y = 0; y < WORLD_H; y++) {
      if (world[x][y] === T.TORCH) addLight(x, y, 1.0, 6);
    }
  }
  if (player) {
    const px = Math.floor(player.x / TILE);
    const py = Math.floor(player.y / TILE);
    addLight(px, py, 0.6, 4);
  }
}

function addLight(ox, oy, intensity, radius) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = ox + dx, y = oy + dy;
      if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const v = intensity * (1 - dist / radius);
        lightMap[x][y] = Math.min(1, Math.max(lightMap[x][y], v));
      }
    }
  }
}

// ---- Particles ----
function spawnParticle(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3 - 1,
      life: 20 + Math.random() * 20,
      color,
      size: 1 + Math.random() * 2
    });
  }
}

function spawnDamageNumber(x, y, dmg, color) {
  damageNumbers.push({ x, y, text: '-' + dmg, color: color || '#f44', life: 40, vy: -1.5 });
}

// ---- Collision ----
function solidAt(wx, wy) {
  const t = tileAt(wx, wy);
  return t !== T.AIR && t !== T.TORCH && t !== T.PLATFORM;
}

function platformAt(wx, wy) {
  return tileAt(wx, wy) === T.PLATFORM;
}

function moveEntity(e) {
  e.x += e.vx;
  const left = Math.floor(e.x / TILE);
  const right = Math.floor((e.x + e.w) / TILE);
  const top = Math.floor(e.y / TILE);
  const bot = Math.floor((e.y + e.h - 1) / TILE);
  for (let tx = left; tx <= right; tx++) {
    for (let ty = top; ty <= bot; ty++) {
      if (solidAt(tx, ty)) {
        if (e.vx > 0) e.x = tx * TILE - e.w - 0.01;
        else if (e.vx < 0) e.x = (tx + 1) * TILE + 0.01;
        e.vx = 0;
      }
    }
  }

  e.vy += GRAVITY;
  if (e.vy > 10) e.vy = 10;
  e.y += e.vy;
  e.onGround = false;
  const left2 = Math.floor(e.x / TILE);
  const right2 = Math.floor((e.x + e.w) / TILE);
  const top2 = Math.floor(e.y / TILE);
  const bot2 = Math.floor((e.y + e.h - 1) / TILE);
  for (let tx = left2; tx <= right2; tx++) {
    for (let ty = top2; ty <= bot2; ty++) {
      const isSolid = solidAt(tx, ty);
      const isPlat = platformAt(tx, ty);
      if (isSolid || (isPlat && e.vy > 0 && (e.y + e.h - e.vy) <= ty * TILE + 1)) {
        if (e.vy > 0) {
          e.y = ty * TILE - e.h;
          e.vy = 0;
          e.onGround = true;
        } else if (e.vy < 0 && isSolid) {
          e.y = (ty + 1) * TILE;
          e.vy = 0;
        }
      }
    }
  }

  if (e.x < 0) { e.x = 0; e.vx = 0; }
  if (e.x + e.w > WORLD_W * TILE) { e.x = WORLD_W * TILE - e.w; e.vx = 0; }
  if (e.y < 0) { e.y = 0; e.vy = 0; }
  if (e.y > WORLD_H * TILE) { e.y = (WORLD_H - 3) * TILE; e.vy = 0; }
}

// ---- Inventory helpers ----
function addItem(entity, item, count) {
  if (!count) count = 1;
  entity.inventory[item] = (entity.inventory[item] || 0) + count;
}

function hasItem(entity, item, count) {
  return (entity.inventory[item] || 0) >= (count || 1);
}

function removeItem(entity, item, count) {
  if (!count) count = 1;
  entity.inventory[item] = (entity.inventory[item] || 0) - count;
  if (entity.inventory[item] <= 0) delete entity.inventory[item];
}

function getSelectedItem(entity) {
  return entity.hotbar[entity.selectedSlot];
}

function tileToItem(t) {
  switch (t) {
    case T.DIRT: case T.GRASS: return 'DIRT';
    case T.STONE: return 'STONE';
    case T.WOOD: return 'WOOD';
    case T.IRON_ORE: return 'IRON';
    case T.GOLD_ORE: return 'GOLD';
    case T.LEAF: return 'LEAF';
    case T.SAND: return 'SAND';
    case T.PLATFORM: return 'PLATFORM';
    case T.DOOR: return 'DOOR';
    case T.WALL: return 'WALL_BLOCK';
    case T.TORCH: return 'TORCH';
    default: return 'STONE';
  }
}

function getMiningSpeed(entity) {
  const sel = getSelectedItem(entity);
  if (sel === 'IRON_PICK') return 3;
  if (sel === 'PICKAXE') return 2;
  return 1;
}

function getAttackDmg(entity) {
  const sel = getSelectedItem(entity);
  if (sel === 'GOLD_SWORD') return 25;
  if (sel === 'IRON_SWORD') return 15;
  if (sel === 'SWORD') return 8;
  return 3;
}

// ---- Mining ----
function tryMine(entity, tx, ty) {
  const tile = tileAt(tx, ty);
  if (tile === T.AIR || tile === T.BEDROCK) return false;
  const hardness = TILE_HARDNESS[tile] || 30;
  const speed = getMiningSpeed(entity);
  if (entity === player) {
    if (!miningTarget || miningTarget.x !== tx || miningTarget.y !== ty) {
      miningTarget = { x: tx, y: ty };
      miningProgress = 0;
    }
    miningProgress += speed;
    if (miningProgress >= hardness) {
      mineTile(entity, tx, ty, tile);
      miningTarget = null;
      miningProgress = 0;
      return true;
    }
  } else {
    if (!entity.aiMiningTarget || entity.aiMiningTarget.x !== tx || entity.aiMiningTarget.y !== ty) {
      entity.aiMiningTarget = { x: tx, y: ty };
      entity.aiMiningProgress = 0;
    }
    entity.aiMiningProgress += speed;
    if (entity.aiMiningProgress >= hardness) {
      mineTile(entity, tx, ty, tile);
      entity.aiMiningTarget = null;
      entity.aiMiningProgress = 0;
      return true;
    }
  }
  return false;
}

function mineTile(entity, tx, ty, tile) {
  const item = tileToItem(tile);
  addItem(entity, item, 1);
  setTile(tx, ty, T.AIR);
  spawnParticle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE_COLORS[tile], 6);
  score += 1;
  if (entity === player) {
    const info = ITEMS[item];
    if (info && info.placeable && !entity.hotbar.includes(item)) {
      for (let i = 0; i < 5; i++) {
        const hb = entity.hotbar[i];
        if (!hb || (!ITEMS[hb]?.tool && !(entity.inventory[hb] > 0))) {
          entity.hotbar[i] = item;
          break;
        }
      }
    }
  }
}

// ---- Placing ----
function tryPlace(entity, tx, ty) {
  if (tileAt(tx, ty) !== T.AIR) return false;
  const sel = getSelectedItem(entity);
  const info = ITEMS[sel];
  if (!info || !info.placeable) return false;
  if (!hasItem(entity, sel)) return false;
  const ex = tx * TILE, ey = ty * TILE;
  if (rectsOverlap(ex, ey, TILE, TILE, player.x, player.y, player.w, player.h)) return false;
  if (ally && rectsOverlap(ex, ey, TILE, TILE, ally.x, ally.y, ally.w, ally.h)) return false;
  removeItem(entity, sel, 1);
  setTile(tx, ty, info.tile);
  spawnParticle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, info.color, 3);
  score += 1;
  return true;
}

// ---- Combat ----
function tryAttack(entity, targetX, targetY) {
  if (entity.attackCooldown > 0) return;
  entity.swingTimer = 8;
  entity.attackCooldown = 15;
  const dmg = getAttackDmg(entity);
  const range = 30;
  for (const e of enemies) {
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dist = Math.hypot(ecx - (entity.x + entity.w / 2), ecy - (entity.y + entity.h / 2));
    if (dist < range + e.w) hurtEnemy(e, dmg, entity);
  }
  if (boss) {
    const bcx = boss.x + boss.w / 2, bcy = boss.y + boss.h / 2;
    const dist = Math.hypot(bcx - (entity.x + entity.w / 2), bcy - (entity.y + entity.h / 2));
    if (dist < range + boss.w) {
      boss.hp -= dmg;
      spawnDamageNumber(boss.x + boss.w / 2, boss.y - 5, dmg, '#ff0');
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, '#a00', 5);
      if (boss.hp <= 0) {
        score += 200;
        spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ff0', 30);
        for (let i = 0; i < 8; i++) {
          droppedItems.push({
            x: boss.x + Math.random() * boss.w, y: boss.y,
            vy: -3 - Math.random() * 2, item: 'GOLD', life: 300
          });
        }
        boss = null;
        bossActive = false;
      }
    }
  }
}

function hurtEnemy(e, dmg, attacker) {
  e.hp -= dmg;
  const knockDir = e.x > attacker.x ? 1 : -1;
  e.vx = knockDir * 3;
  e.vy = -2;
  spawnDamageNumber(e.x + e.w / 2, e.y - 5, dmg);
  spawnParticle(e.x + e.w / 2, e.y + e.h / 2, '#a00', 4);
}

function hurtEntity(entity, dmg, game) {
  if (entity.invincible > 0) return;
  entity.hp -= dmg;
  entity.invincible = 30;
  spawnDamageNumber(entity.x + entity.w / 2, entity.y - 5, dmg, entity.isAlly ? '#f90' : '#f00');
  if (entity.hp <= 0 && !entity.isAlly) {
    game.showOverlay('GAME OVER', `Score: ${score} | Day ${dayCount} | Click or Space to restart`);
    game.setState('over');
  }
  if (entity.hp <= 0 && entity.isAlly) {
    entity.respawnTimer = 300;
    entity.hp = 0;
  }
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// ---- Enemies ----
function spawnEnemy() {
  const isNight = worldTime < 5000 || worldTime > 19000;
  const types = ['slime', 'zombie', 'skeleton'];
  const type = types[Math.floor(Math.random() * (isNight ? 3 : 1))];
  const side = Math.random() < 0.5 ? -1 : 1;
  let sx = player.x + side * (W / 2 + 30 + Math.random() * 50);
  let sy;
  if (isNight) {
    const tx = Math.floor(sx / TILE);
    if (tx < 0 || tx >= WORLD_W) return;
    sy = (getSurface(Math.max(0, Math.min(WORLD_W - 1, tx))) - 1) * TILE;
  } else {
    if (player.y < getSurface(Math.floor(player.x / TILE)) * TILE) return;
    sy = player.y + (Math.random() - 0.5) * 100;
  }
  const e = {
    x: sx, y: sy, vx: 0, vy: 0,
    type,
    hp: type === 'slime' ? 20 : type === 'zombie' ? 35 : 25,
    maxHp: type === 'slime' ? 20 : type === 'zombie' ? 35 : 25,
    w: type === 'slime' ? 12 : 10,
    h: type === 'slime' ? 10 : 18,
    dmg: type === 'slime' ? 5 : type === 'zombie' ? 10 : 8,
    speed: type === 'slime' ? 0.8 : type === 'zombie' ? 0.5 : 1.0,
    onGround: false,
    jumpTimer: 0,
    color: type === 'slime' ? '#4f4' : type === 'zombie' ? '#696' : '#ddd',
    attackTimer: 0,
    shootTimer: type === 'skeleton' ? 60 : 0
  };
  enemies.push(e);
}

function spawnBoss() {
  if (bossActive) return;
  bossActive = true;
  const sx = player.x + (Math.random() < 0.5 ? -200 : 200);
  const tx = Math.max(0, Math.min(WORLD_W - 1, Math.floor(sx / TILE)));
  const sy = (getSurface(tx) - 3) * TILE;
  boss = {
    x: sx, y: sy, w: 28, h: 28,
    vx: 0, vy: 0,
    hp: 300, maxHp: 300,
    onGround: false,
    phase: 0,
    attackTimer: 0,
    jumpTimer: 0,
    chargeTimer: 0,
    summonTimer: 200
  };
}

function updateEnemy(e, game) {
  const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
  const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
  const dist = Math.hypot(dx, dy);

  if (e.type === 'slime') {
    e.jumpTimer--;
    if (e.onGround && e.jumpTimer <= 0) {
      e.vy = -5 - Math.random() * 2;
      e.vx = Math.sign(dx) * (1 + Math.random());
      e.jumpTimer = 30 + Math.random() * 40;
    }
  } else if (e.type === 'skeleton') {
    if (dist < 60) e.vx = -Math.sign(dx) * e.speed;
    else if (dist > 120) e.vx = Math.sign(dx) * e.speed;
    else e.vx *= 0.9;
    e.shootTimer--;
    if (e.shootTimer <= 0 && dist < 200) {
      projectiles.push({
        x: e.x + e.w / 2, y: e.y + e.h / 4,
        vx: Math.sign(dx) * 3, vy: -1,
        dmg: 8, life: 90, color: '#eee', friendly: false
      });
      e.shootTimer = 70 + Math.random() * 30;
    }
    if (e.onGround && Math.random() < 0.02) e.vy = -5;
  } else {
    e.vx = Math.sign(dx) * e.speed;
    if (e.onGround && Math.random() < 0.03) e.vy = -6;
  }

  e.vy += GRAVITY;
  if (e.vy > 8) e.vy = 8;
  e.vx *= 0.92;
  e.x += e.vx;
  e.y += e.vy;
  e.onGround = false;

  const btx = Math.floor((e.x + e.w / 2) / TILE);
  const bty = Math.floor((e.y + e.h) / TILE);
  if (solidAt(btx, bty) || platformAt(btx, bty)) {
    if (e.vy >= 0) { e.y = bty * TILE - e.h; e.vy = 0; e.onGround = true; }
  }
  const wx = Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / TILE);
  const wy = Math.floor((e.y + e.h / 2) / TILE);
  if (solidAt(wx, wy)) {
    e.x -= e.vx; e.vx = 0;
    if (e.onGround) e.vy = -5;
  }

  if (rectsOverlap(e.x, e.y, e.w, e.h, player.x, player.y, player.w, player.h)) {
    hurtEntity(player, e.dmg, game);
  }
  if (ally && ally.hp > 0 && rectsOverlap(e.x, e.y, e.w, e.h, ally.x, ally.y, ally.w, ally.h)) {
    hurtEntity(ally, e.dmg, game);
  }

  if (e.hp <= 0) {
    score += e.type === 'slime' ? 10 : e.type === 'zombie' ? 20 : 15;
    spawnParticle(e.x + e.w / 2, e.y + e.h / 2, e.color, 10);
    if (Math.random() < 0.3) {
      const drops = ['IRON', 'WOOD', 'TORCH', 'STONE'];
      droppedItems.push({
        x: e.x + e.w / 2, y: e.y,
        vy: -2, item: drops[Math.floor(Math.random() * drops.length)], life: 300
      });
    }
    return false;
  }
  return true;
}

function updateBoss(game) {
  if (!boss) return;
  const dx = player.x - boss.x;

  boss.vy += GRAVITY * 0.5;
  boss.attackTimer--;
  boss.summonTimer--;
  boss.chargeTimer--;

  boss.phase = boss.hp < 150 ? 1 : 0;
  const speed = boss.phase === 1 ? 2.0 : 1.2;

  boss.vx = Math.sign(dx) * speed;
  if (boss.onGround && Math.random() < 0.04) boss.vy = -8;

  if (boss.chargeTimer <= 0 && Math.abs(dx) < 200) {
    boss.vx = Math.sign(dx) * 5;
    boss.chargeTimer = 80 + Math.random() * 40;
  }

  if (boss.summonTimer <= 0) {
    for (let i = 0; i < 2; i++) spawnEnemy();
    boss.summonTimer = boss.phase === 1 ? 150 : 250;
  }

  if (boss.phase === 1 && boss.attackTimer <= 0) {
    for (let a = -1; a <= 1; a++) {
      projectiles.push({
        x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
        vx: Math.sign(dx) * 2.5 + a * 0.5,
        vy: -1.5 + a * 0.8,
        dmg: 12, life: 80, color: '#f44', friendly: false
      });
    }
    boss.attackTimer = 50;
  }

  boss.x += boss.vx;
  boss.y += boss.vy;
  boss.onGround = false;
  boss.vx *= 0.9;

  const btx = Math.floor((boss.x + boss.w / 2) / TILE);
  const bty = Math.floor((boss.y + boss.h) / TILE);
  if (solidAt(btx, bty)) {
    boss.y = bty * TILE - boss.h;
    boss.vy = 0;
    boss.onGround = true;
  }

  if (rectsOverlap(boss.x, boss.y, boss.w, boss.h, player.x, player.y, player.w, player.h)) {
    hurtEntity(player, 15, game);
  }
  if (ally && ally.hp > 0 && rectsOverlap(boss.x, boss.y, boss.w, boss.h, ally.x, ally.y, ally.w, ally.h)) {
    hurtEntity(ally, 15, game);
  }
}

// ---- AI Ally ----
function updateAlly(game) {
  if (!ally) return;
  if (ally.hp <= 0) {
    ally.respawnTimer--;
    if (ally.respawnTimer <= 0) {
      ally.hp = ally.maxHp;
      ally.x = player.x + 20;
      ally.y = player.y - 30;
      ally.vy = 0; ally.vx = 0;
    }
    return;
  }

  ally.attackCooldown--;
  ally.invincible--;
  ally.aiTimer--;

  const dx = player.x - ally.x;
  const dy = player.y - ally.y;
  const dist = Math.hypot(dx, dy);

  let nearestEnemy = null, nearestDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - ally.x, e.y - ally.y);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
  }
  if (boss) {
    const d = Math.hypot(boss.x - ally.x, boss.y - ally.y);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = boss; }
  }

  if (nearestEnemy && nearestDist < 100) {
    ally.aiState = 'fight';
  } else if (dist > 120) {
    ally.aiState = 'follow';
  } else if (ally.aiTimer <= 0) {
    ally.aiState = Math.random() < 0.5 ? 'mine' : 'follow';
    ally.aiTimer = 60 + Math.random() * 120;
  }

  switch (ally.aiState) {
    case 'follow': {
      ally.vx = Math.sign(dx) * 1.5;
      if (ally.onGround && (dy < -20 || (Math.abs(dx) > 5 && isBlockedAhead(ally)))) ally.vy = JUMP_VEL;
      ally.facing = Math.sign(dx) || 1;
      break;
    }
    case 'fight': {
      if (nearestEnemy) {
        const edx = nearestEnemy.x - ally.x;
        ally.vx = Math.sign(edx) * 1.2;
        ally.facing = Math.sign(edx) || 1;
        if (nearestDist < 30) {
          ally.selectedSlot = 1;
          tryAttack(ally, nearestEnemy.x, nearestEnemy.y);
          if (nearestDist < 15) ally.vx = -Math.sign(edx) * 0.5;
        }
        if (ally.onGround && nearestEnemy.y < ally.y - 15) ally.vy = JUMP_VEL;
      }
      break;
    }
    case 'mine': {
      const atx = Math.floor(ally.x / TILE);
      const aty = Math.floor(ally.y / TILE);
      let bestTile = null, bestDist = 999;
      for (let dx2 = -4; dx2 <= 4; dx2++) {
        for (let dy2 = -3; dy2 <= 3; dy2++) {
          const mx = atx + dx2, my = aty + dy2;
          const t = tileAt(mx, my);
          if (t === T.IRON_ORE || t === T.GOLD_ORE || t === T.WOOD || t === T.STONE) {
            const d = Math.abs(dx2) + Math.abs(dy2);
            if (d < bestDist) { bestDist = d; bestTile = { x: mx, y: my }; }
          }
        }
      }
      if (bestTile) {
        const tdx = bestTile.x * TILE + TILE / 2 - (ally.x + ally.w / 2);
        if (Math.abs(tdx) > TILE) ally.vx = Math.sign(tdx) * 1.0;
        ally.facing = Math.sign(tdx) || 1;
        ally.selectedSlot = 0;
        tryMine(ally, bestTile.x, bestTile.y);
      } else {
        ally.aiState = 'follow';
      }
      break;
    }
  }

  if (Math.random() < 0.002) {
    for (const [item, count] of Object.entries(ally.inventory)) {
      if (count > 3) {
        const give = Math.floor(count / 2);
        removeItem(ally, item, give);
        addItem(player, item, give);
      }
    }
  }

  ally.vy += GRAVITY;
  ally.vx *= 0.85;
  moveEntity(ally);
  ally.animTimer++;
  if (ally.animTimer > 8) { ally.animTimer = 0; ally.animFrame = (ally.animFrame + 1) % 4; }
}

function isBlockedAhead(entity) {
  const ahead = Math.floor((entity.x + entity.w / 2 + entity.facing * 12) / TILE);
  const ey = Math.floor((entity.y + entity.h / 2) / TILE);
  return solidAt(ahead, ey);
}

// ---- Crafting ----
function craft(recipeIdx) {
  const r = RECIPES[recipeIdx];
  for (const [item, need] of Object.entries(r.need)) {
    if (!hasItem(player, item, need)) return false;
  }
  for (const [item, need] of Object.entries(r.need)) {
    removeItem(player, item, need);
  }
  addItem(player, r.result, r.qty || 1);
  score += 5;
  const info = ITEMS[r.result];
  if (info && !player.hotbar.includes(r.result)) {
    for (let i = 0; i < 5; i++) {
      const hb = player.hotbar[i];
      if (!hb || (!ITEMS[hb]?.tool && !(player.inventory[hb] > 0))) {
        player.hotbar[i] = r.result;
        break;
      }
    }
  }
  return true;
}

function handleInventoryClick(mx, my) {
  const invX = W / 2 - 145, invY = 40;
  const recipeY = invY + 90;
  for (let i = 0; i < RECIPES.length; i++) {
    const ry = recipeY + i * 22;
    if (mx >= invX && mx <= invX + 290 && my >= ry && my <= ry + 20) {
      craft(i);
      return;
    }
  }
}

// ---- Dropped items ----
function updateDroppedItems() {
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    const d = droppedItems[i];
    d.vy += 0.2;
    d.y += d.vy;
    d.life--;
    const ty = Math.floor((d.y + 4) / TILE);
    const tx = Math.floor(d.x / TILE);
    if (solidAt(tx, ty)) { d.y = ty * TILE - 4; d.vy = 0; }
    if (Math.hypot(d.x - player.x - player.w / 2, d.y - player.y - player.h / 2) < 20) {
      addItem(player, d.item, 1);
      spawnParticle(d.x, d.y, ITEMS[d.item]?.color || '#fff', 3);
      droppedItems.splice(i, 1); continue;
    }
    if (ally && ally.hp > 0 && Math.hypot(d.x - ally.x - ally.w / 2, d.y - ally.y - ally.h / 2) < 20) {
      addItem(ally, d.item, 1);
      droppedItems.splice(i, 1); continue;
    }
    if (d.life <= 0) droppedItems.splice(i, 1);
  }
}

// ---- Projectiles ----
function updateProjectiles(game) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (solidAt(tx, ty)) { projectiles.splice(i, 1); continue; }
    if (!p.friendly) {
      if (rectsOverlap(p.x - 2, p.y - 2, 4, 4, player.x, player.y, player.w, player.h)) {
        hurtEntity(player, p.dmg, game); projectiles.splice(i, 1); continue;
      }
      if (ally && ally.hp > 0 && rectsOverlap(p.x - 2, p.y - 2, 4, 4, ally.x, ally.y, ally.w, ally.h)) {
        hurtEntity(ally, p.dmg, game); projectiles.splice(i, 1); continue;
      }
    }
    if (p.life <= 0) projectiles.splice(i, 1);
  }
}

// ---- Player Update ----
function updatePlayer(input, game) {
  if (input.isDown('a') || input.isDown('A')) { player.vx = -2.5; player.facing = -1; }
  else if (input.isDown('d') || input.isDown('D')) { player.vx = 2.5; player.facing = 1; }
  else player.vx *= 0.7;

  if ((input.isDown('w') || input.isDown('W') || input.isDown(' ')) && player.onGround) {
    player.vy = JUMP_VEL;
  }

  if (input.wasPressed('e') || input.wasPressed('E')) showInventory = !showInventory;
  if (input.wasPressed('q') || input.wasPressed('Q')) {
    player.toolMode = player.toolMode === 'mine' ? 'place' : 'mine';
  }
  for (let i = 0; i < 5; i++) {
    if (input.wasPressed(String(i + 1))) player.selectedSlot = i;
  }

  player.attackCooldown--;
  player.invincible--;
  player.swingTimer--;

  if (Math.abs(player.vx) > 0.5) {
    player.animTimer++;
    if (player.animTimer > 6) { player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4; }
  } else {
    player.animFrame = 0;
  }

  moveEntity(player);

  if (mouseDown && !showInventory) {
    mouseWorldX = mouseX + cameraX;
    mouseWorldY = mouseY + cameraY;
    const tx = Math.floor(mouseWorldX / TILE);
    const ty = Math.floor(mouseWorldY / TILE);
    const dist = Math.hypot(tx * TILE - player.x, ty * TILE - player.y);
    if (dist < 70) {
      const sel = getSelectedItem(player);
      const info = ITEMS[sel];
      if (player.toolMode === 'mine' || (info && info.tool)) {
        if (sel === 'SWORD' || sel === 'IRON_SWORD' || sel === 'GOLD_SWORD') {
          tryAttack(player, mouseWorldX, mouseWorldY);
        } else {
          tryMine(player, tx, ty);
        }
      } else {
        tryPlace(player, tx, ty);
      }
    }
  }
}

// ---- Camera ----
function updateCamera() {
  const targetX = player.x + player.w / 2 - W / 2;
  const targetY = player.y + player.h / 2 - H / 2;
  cameraX += (targetX - cameraX) * 0.1;
  cameraY += (targetY - cameraY) * 0.1;
  cameraX = Math.max(0, Math.min(WORLD_W * TILE - W, cameraX));
  cameraY = Math.max(0, Math.min(WORLD_H * TILE - H, cameraY));
}

// ---- Render ----
function render(renderer, text) {
  // Sky gradient based on time of day
  const isNight = worldTime < 5000 || worldTime > 19000;
  const duskFactor = (worldTime >= 17000 && worldTime <= 19000) ?
    (worldTime - 17000) / 2000 :
    (worldTime >= 5000 && worldTime <= 7000) ?
    1 - (worldTime - 5000) / 2000 : (isNight ? 1 : 0);

  const skyR = Math.floor(30 + (1 - duskFactor) * 105);
  const skyG = Math.floor(30 + (1 - duskFactor) * 150);
  const skyB = Math.floor(60 + (1 - duskFactor) * 200);
  const skyHex = `#${skyR.toString(16).padStart(2, '0')}${skyG.toString(16).padStart(2, '0')}${skyB.toString(16).padStart(2, '0')}`;
  renderer.fillRect(0, 0, W, H, skyHex);

  // Stars at night
  if (duskFactor > 0.5) {
    const starAlpha = Math.round((duskFactor - 0.5) * 1.5 * 255).toString(16).padStart(2, '0');
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + i * i * 31) % W;
      const sy = (i * 89 + i * i * 17) % (H * 0.4);
      renderer.fillRect(sx, sy, 1.5, 1.5, `#ffffff${starAlpha}`);
    }
  }

  // Sun / Moon
  const timeAngle = (worldTime / 24000) * Math.PI * 2 - Math.PI / 2;
  const celestialX = W / 2 + Math.cos(timeAngle) * 250;
  const celestialY = H * 0.3 + Math.sin(timeAngle) * 150;
  if (isNight) {
    renderer.fillCircle(celestialX, celestialY, 15, '#E8E8F0');
    renderer.fillCircle(celestialX + 5, celestialY - 3, 12, skyHex);
  } else {
    renderer.setGlow('#FFE44D', 0.8);
    renderer.fillCircle(celestialX, celestialY, 18, '#FFE44D');
    renderer.setGlow(null);
  }

  // Tiles
  const startTX = Math.max(0, Math.floor(cameraX / TILE));
  const endTX = Math.min(WORLD_W - 1, Math.floor((cameraX + W) / TILE) + 1);
  const startTY = Math.max(0, Math.floor(cameraY / TILE));
  const endTY = Math.min(WORLD_H - 1, Math.floor((cameraY + H) / TILE) + 1);

  const now = performance.now();

  for (let tx = startTX; tx <= endTX; tx++) {
    for (let ty = startTY; ty <= endTY; ty++) {
      const tile = world[tx]?.[ty];
      if (tile === T.AIR) continue;
      const color = TILE_COLORS[tile];
      if (!color) continue;

      const sx = tx * TILE - cameraX;
      const sy = ty * TILE - cameraY;
      const light = lightMap[tx]?.[ty] ?? 0.5;

      renderer.fillRect(sx, sy, TILE, TILE, applyLight(color, light));

      // Tile details
      if (tile === T.GRASS) {
        renderer.fillRect(sx, sy, TILE, 2, applyLight('#5a9a4a', light));
      } else if (tile === T.IRON_ORE) {
        renderer.fillRect(sx + 3, sy + 3, 3, 3, applyLight('#C8C8E0', light));
        renderer.fillRect(sx + 7, sy + 6, 3, 3, applyLight('#C8C8E0', light));
      } else if (tile === T.GOLD_ORE) {
        renderer.fillRect(sx + 2, sy + 4, 4, 3, applyLight('#FFD700', light));
        renderer.fillRect(sx + 7, sy + 2, 3, 4, applyLight('#FFD700', light));
      } else if (tile === T.TORCH) {
        const flicker = 0.5 + Math.sin(now * 0.01) * 0.3;
        renderer.setGlow('#FFD040', flicker * 0.8);
        renderer.fillCircle(sx + TILE / 2, sy + 2, 4, colorWithAlpha('#FFD040', flicker));
        renderer.setGlow(null);
      } else if (tile === T.WOOD) {
        renderer.fillRect(sx + 4, sy, 4, TILE, applyLight('#4A2510', light));
      } else if (tile === T.LEAF) {
        renderer.fillRect(sx + 2, sy + 2, 4, 4, applyLight('#1B5E20', light));
        renderer.fillRect(sx + 6, sy + 6, 4, 4, applyLight('#1B5E20', light));
      } else if (tile === T.PLATFORM) {
        renderer.fillRect(sx, sy, TILE, 3, applyLight('#5A3C1E', light));
      } else if (tile === T.DOOR) {
        renderer.fillRect(sx + 3, sy, 6, TILE, applyLight('#3C2010', light));
        renderer.fillRect(sx + 7, sy + 5, 2, 2, applyLight('#D4A017', light));
      }

      // Subtle grid lines — very transparent dark overlay
      renderer.fillRect(sx, sy, TILE, 1, '#00000010');
      renderer.fillRect(sx, sy, 1, TILE, '#00000010');
    }
  }

  // Mining indicator
  if (miningTarget && mouseDown) {
    const mx = miningTarget.x * TILE - cameraX + TILE / 2;
    const my = miningTarget.y * TILE - cameraY + TILE / 2;
    const tile = tileAt(miningTarget.x, miningTarget.y);
    const hardness = TILE_HARDNESS[tile] || 30;
    const pct = Math.min(1, miningProgress / hardness);
    // Draw arc as a series of line segments
    const segments = 16;
    for (let i = 0; i < Math.round(pct * segments); i++) {
      const a0 = -Math.PI / 2 + (i / segments) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 1) / segments) * Math.PI * 2;
      renderer.drawLine(
        mx + Math.cos(a0) * 8, my + Math.sin(a0) * 8,
        mx + Math.cos(a1) * 8, my + Math.sin(a1) * 8,
        '#ffffff', 2
      );
    }
    // Crack overlay (progress > 30%)
    if (pct > 0.3) {
      const bx = miningTarget.x * TILE - cameraX;
      const by = miningTarget.y * TILE - cameraY;
      const crackAlpha = Math.round(pct * 0.6 * 255).toString(16).padStart(2, '0');
      renderer.drawLine(bx + 2, by + 2, bx + TILE / 2, by + TILE / 2, `#000000${crackAlpha}`, 1.5);
      renderer.drawLine(bx + TILE / 2, by + TILE / 2, bx + TILE - 2, by + 4, `#000000${crackAlpha}`, 1.5);
    }
  }

  // Dropped items
  for (const d of droppedItems) {
    const dx = d.x - cameraX, dy = d.y - cameraY;
    const bob = Math.sin(now * 0.005 + d.x) * 2;
    const col = ITEMS[d.item]?.color || '#ffffff';
    renderer.fillRect(dx - 3, dy - 3 + bob, 6, 6, col);
    renderer.drawLine(dx - 3, dy - 3 + bob, dx + 3, dy - 3 + bob, '#ffffff', 1);
    renderer.drawLine(dx + 3, dy - 3 + bob, dx + 3, dy + 3 + bob, '#ffffff', 1);
    renderer.drawLine(dx + 3, dy + 3 + bob, dx - 3, dy + 3 + bob, '#ffffff', 1);
    renderer.drawLine(dx - 3, dy + 3 + bob, dx - 3, dy - 3 + bob, '#ffffff', 1);
  }

  // Enemies
  for (const e of enemies) {
    const ex = e.x - cameraX, ey = e.y - cameraY;
    if (ex < -30 || ex > W + 30 || ey < -30 || ey > H + 30) continue;

    if (e.type === 'slime') {
      const squash = e.onGround ? 0.8 : 1.1;
      const rw = e.w / 2 * (2 - squash);
      const rh = e.h / 2 * squash;
      // Draw ellipse as filled circle stretched via rect approximation
      renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, Math.max(rw, rh), e.color);
      renderer.fillRect(ex + 3, ey + 2, 2, 2, '#000000');
      renderer.fillRect(ex + 7, ey + 2, 2, 2, '#000000');
    } else if (e.type === 'zombie') {
      renderer.fillRect(ex, ey, e.w, e.h, '#4a5a3a');
      renderer.fillRect(ex + 1, ey, e.w - 2, 6, '#696969');
      renderer.fillRect(ex + 2, ey + 2, 2, 1, '#aa0000');
      renderer.fillRect(ex + 6, ey + 2, 2, 1, '#aa0000');
      renderer.fillRect(ex - 3, ey + 7, 3, 2, '#4a5a3a');
      renderer.fillRect(ex + e.w, ey + 7, 3, 2, '#4a5a3a');
    } else if (e.type === 'skeleton') {
      renderer.fillRect(ex + 2, ey, 6, 6, '#dddddd');
      renderer.fillRect(ex + 3, ey + 6, 4, 8, '#dddddd');
      renderer.fillRect(ex + 1, ey + 14, 3, 4, '#dddddd');
      renderer.fillRect(ex + 6, ey + 14, 3, 4, '#dddddd');
      renderer.fillRect(ex + 3, ey + 2, 2, 2, '#000000');
      renderer.fillRect(ex + 6, ey + 2, 2, 2, '#000000');
      // Bow
      const bowX = e.vx >= 0 ? ex + e.w + 3 : ex - 3;
      renderer.drawLine(bowX, ey + 5, bowX + (e.vx >= 0 ? 3 : -3), ey + 8, '#8B4513', 1.5);
      renderer.drawLine(bowX + (e.vx >= 0 ? 3 : -3), ey + 8, bowX, ey + 11, '#8B4513', 1.5);
    }

    // HP bar
    if (e.hp < e.maxHp) {
      renderer.fillRect(ex, ey - 4, e.w, 2, '#330000');
      renderer.fillRect(ex, ey - 4, e.w * (e.hp / e.maxHp), 2, '#ff4444');
    }
  }

  // Boss
  if (boss) {
    const bx = boss.x - cameraX, by = boss.y - cameraY;
    renderer.fillRect(bx, by, boss.w, boss.h, '#8B0000');
    renderer.fillRect(bx + 4, by + 4, boss.w - 8, boss.h - 12, '#660000');
    // Eyes with glow
    const eyeColor = boss.phase === 1 ? '#ffff00' : '#ff0000';
    renderer.setGlow(eyeColor, 0.8);
    renderer.fillRect(bx + 6, by + 8, 5, 4, eyeColor);
    renderer.fillRect(bx + 17, by + 8, 5, 4, eyeColor);
    renderer.setGlow(null);
    // Horns
    renderer.fillPoly([
      { x: bx + 2, y: by }, { x: bx + 6, y: by - 8 }, { x: bx + 10, y: by }
    ], '#555555');
    renderer.fillPoly([
      { x: bx + boss.w - 2, y: by }, { x: bx + boss.w - 6, y: by - 8 }, { x: bx + boss.w - 10, y: by }
    ], '#555555');
    // Mouth and teeth
    renderer.fillRect(bx + 8, by + 16, 12, 4, '#ff4444');
    for (let t2 = 0; t2 < 4; t2++) {
      renderer.fillRect(bx + 9 + t2 * 3, by + 16, 2, 2, '#ffffff');
    }
    // HP bar
    renderer.fillRect(bx - 5, by - 14, boss.w + 10, 4, '#330000');
    renderer.fillRect(bx - 5, by - 14, (boss.w + 10) * (boss.hp / boss.maxHp), 4, '#ff0000');
    renderer.drawLine(bx - 5, by - 14, bx - 5 + boss.w + 10, by - 14, '#880000', 1);
    text.drawText('DEMON LORD', bx + boss.w / 2, by - 22, 8, '#ff4444', 'center');
  }

  // Projectiles
  for (const p of projectiles) {
    const px = p.x - cameraX, py = p.y - cameraY;
    renderer.setGlow(p.color, 0.6);
    renderer.fillCircle(px, py, 3, p.color);
    renderer.setGlow(null);
  }

  // Characters
  drawEntity(renderer, text, player, '#3a8', '#2a6');
  if (ally && ally.hp > 0) drawEntity(renderer, text, ally, '#88f', '#66c');

  // Particles
  for (const p of particles) {
    const alpha = Math.round((p.life / 40) * 255).toString(16).padStart(2, '0');
    renderer.fillRect(p.x - cameraX, p.y - cameraY, p.size, p.size, colorWithAlpha(p.color, p.life / 40));
  }

  // Damage numbers
  for (const d of damageNumbers) {
    const alpha = d.life / 40;
    text.drawText(d.text, d.x - cameraX - 8, d.y - cameraY, 10, colorWithAlpha(d.color, alpha));
  }

  // HUD
  drawHUD(renderer, text);

  if (showInventory) drawInventory(renderer, text);
}

function drawEntity(renderer, text, e, bodyColor, legColor) {
  const ex = e.x - cameraX, ey = e.y - cameraY;
  const flash = e.invincible > 0 && Math.floor(e.invincible / 3) % 2;
  const alpha = flash ? 0.5 : 1.0;

  // Legs
  const legOff = e.onGround ? Math.sin(e.animFrame * Math.PI / 2) * 2 : 0;
  renderer.fillRect(ex + 1, ey + 14, 3, 6 + legOff, colorWithAlpha(legColor, alpha));
  renderer.fillRect(ex + 6, ey + 14, 3, 6 - legOff, colorWithAlpha(legColor, alpha));

  // Body
  renderer.fillRect(ex, ey + 4, 10, 11, colorWithAlpha(bodyColor, alpha));

  // Head
  renderer.fillRect(ex + 1, ey - 2, 8, 8, colorWithAlpha('#F5D0A9', alpha));

  // Eyes
  const eyeX = e.facing > 0 ? ex + 5 : ex + 2;
  renderer.fillRect(eyeX, ey + 1, 2, 2, colorWithAlpha('#000000', alpha));

  // Hair
  const hairColor = e.isAlly ? '#6666ff' : '#884400';
  renderer.fillRect(ex, ey - 3, 10, 3, colorWithAlpha(hairColor, alpha));
  if (e.facing > 0) renderer.fillRect(ex + 8, ey - 3, 2, 5, colorWithAlpha(hairColor, alpha));
  else renderer.fillRect(ex, ey - 3, 2, 5, colorWithAlpha(hairColor, alpha));

  // Tool swing
  if (e.swingTimer > 0) {
    const angle = (1 - e.swingTimer / 8) * Math.PI * 0.7 - Math.PI * 0.3;
    const pivotX = ex + 5 + e.facing * 3;
    const pivotY = ey + 8;
    const cos = Math.cos(angle * e.facing);
    const sin = Math.sin(angle * e.facing);
    const sel = getSelectedItem(e);
    if (sel === 'SWORD' || sel === 'IRON_SWORD' || sel === 'GOLD_SWORD') {
      const swordColor = ITEMS[sel]?.color || '#cccccc';
      // Blade: a rotated rect from pivot
      const bx1 = pivotX + cos * 0 - sin * (-1);
      const by1 = pivotY + sin * 0 + cos * (-1);
      const bx2 = pivotX + cos * 0 - sin * 1;
      const by2 = pivotY + sin * 0 + cos * 1;
      const bx3 = pivotX + cos * 12 - sin * 1;
      const by3 = pivotY + sin * 12 + cos * 1;
      const bx4 = pivotX + cos * 12 - sin * (-1);
      const by4 = pivotY + sin * 12 + cos * (-1);
      renderer.fillPoly([{x:bx1,y:by1},{x:bx2,y:by2},{x:bx3,y:by3},{x:bx4,y:by4}], swordColor);
    } else {
      // Pickaxe
      const px1 = pivotX + cos * 0 - sin * (-1);
      const py1 = pivotY + sin * 0 + cos * (-1);
      const px2 = pivotX + cos * 0 - sin * 1;
      const py2 = pivotY + sin * 0 + cos * 1;
      const px3 = pivotX + cos * 8 - sin * 1;
      const py3 = pivotY + sin * 8 + cos * 1;
      const px4 = pivotX + cos * 8 - sin * (-1);
      const py4 = pivotY + sin * 8 + cos * (-1);
      renderer.fillPoly([{x:px1,y:py1},{x:px2,y:py2},{x:px3,y:py3},{x:px4,y:py4}], '#654321');
      const hColor = ITEMS[sel]?.color || '#999999';
      renderer.fillRect(pivotX + cos * 6 - 3, pivotY + sin * 6 - 3, 6, 4, hColor);
    }
  }

  // Ally label
  if (e.isAlly) {
    text.drawText('ALLY', ex + 5, ey - 12, 7, '#8888ff', 'center');
  }

  // HP bar (when damaged)
  if (e.hp < e.maxHp) {
    renderer.fillRect(ex - 2, ey - (e.isAlly ? 12 : 8), 14, 2, '#330000');
    renderer.fillRect(ex - 2, ey - (e.isAlly ? 12 : 8), 14 * (e.hp / e.maxHp), 2, e.isAlly ? '#8888ff' : '#44cc88');
  }
}

function drawHUD(renderer, text) {
  // Hotbar
  const hbX = W / 2 - 65;
  const hbY = H - 30;
  for (let i = 0; i < 5; i++) {
    const x = hbX + i * 28;
    renderer.fillRect(x, hbY, 24, 24, i === player.selectedSlot ? '#44cc8840' : '#00000080');
    const borderColor = i === player.selectedSlot ? '#44cc88' : '#555555';
    const bw = i === player.selectedSlot ? 2 : 1;
    renderer.drawLine(x, hbY, x + 24, hbY, borderColor, bw);
    renderer.drawLine(x + 24, hbY, x + 24, hbY + 24, borderColor, bw);
    renderer.drawLine(x + 24, hbY + 24, x, hbY + 24, borderColor, bw);
    renderer.drawLine(x, hbY + 24, x, hbY, borderColor, bw);

    const item = player.hotbar[i];
    if (item && ITEMS[item]) {
      if (ITEMS[item].tool) {
        renderer.fillRect(x + 8, hbY + 4, 3, 14, ITEMS[item].color);
        renderer.fillRect(x + 5, hbY + 3, 9, 5, ITEMS[item].color);
      } else {
        renderer.fillRect(x + 5, hbY + 5, 14, 14, ITEMS[item].color);
      }
      const count = player.inventory[item] || 0;
      if (count > 0 && !ITEMS[item].tool) {
        text.drawText(count > 99 ? '99+' : String(count), x + 2, hbY + 16, 8, '#ffffff');
      }
      text.drawText(String(i + 1), x + 1, hbY + 1, 7, '#888888');
    } else {
      text.drawText(String(i + 1), x + 1, hbY + 1, 7, '#444444');
    }
  }

  // Tool mode indicator
  text.drawText(player.toolMode === 'mine' ? '[MINE]' : '[PLACE]', W / 2, hbY - 8, 9, '#44cc88', 'center');

  // Boss HP bar at top
  if (boss) {
    renderer.fillRect(W / 2 - 100, 5, 200, 16, '#00000080');
    renderer.fillRect(W / 2 - 98, 7, 196, 12, '#880000');
    renderer.fillRect(W / 2 - 98, 7, 196 * (boss.hp / boss.maxHp), 12, '#ff0000');
    text.drawText('DEMON LORD', W / 2, 10, 9, '#ffffff', 'center');
  }

  // Crosshair at mouse position
  renderer.drawLine(mouseX - 6, mouseY, mouseX + 6, mouseY, '#ffffff66', 1.5);
  renderer.drawLine(mouseX, mouseY - 6, mouseX, mouseY + 6, '#ffffff66', 1.5);

  // Tile highlight under cursor
  const htx = Math.floor((mouseX + cameraX) / TILE);
  const hty = Math.floor((mouseY + cameraY) / TILE);
  const hsx = htx * TILE - cameraX;
  const hsy = hty * TILE - cameraY;
  renderer.drawLine(hsx, hsy, hsx + TILE, hsy, '#44cc8866', 1);
  renderer.drawLine(hsx + TILE, hsy, hsx + TILE, hsy + TILE, '#44cc8866', 1);
  renderer.drawLine(hsx + TILE, hsy + TILE, hsx, hsy + TILE, '#44cc8866', 1);
  renderer.drawLine(hsx, hsy + TILE, hsx, hsy, '#44cc8866', 1);
}

function drawInventory(renderer, text) {
  const invX = W / 2 - 145, invY = 30;
  const invW = 290, invH = 340;

  renderer.fillRect(invX, invY, invW, invH, '#14142880');
  renderer.drawLine(invX, invY, invX + invW, invY, '#44cc88', 2);
  renderer.drawLine(invX + invW, invY, invX + invW, invY + invH, '#44cc88', 2);
  renderer.drawLine(invX + invW, invY + invH, invX, invY + invH, '#44cc88', 2);
  renderer.drawLine(invX, invY + invH, invX, invY, '#44cc88', 2);

  text.drawText('INVENTORY', invX + 10, invY + 4, 12, '#44cc88');
  text.drawText('[E] to close', invX + 170, invY + 4, 9, '#44cc88');

  let row = 0;
  const itemKeys = Object.keys(player.inventory).sort();
  for (const item of itemKeys) {
    const count = player.inventory[item];
    if (count <= 0) continue;
    const info = ITEMS[item];
    if (!info) continue;
    const iy = invY + 30 + row * 16;
    if (iy > invY + invH - 60) break;
    renderer.fillRect(invX + 10, iy - 6, 8, 8, info.color);
    text.drawText(`${info.name}: ${count}`, invX + 24, iy - 6, 9, '#cccccc');
    row++;
  }

  const craftY = invY + 30 + Math.max(row, 4) * 16 + 10;
  text.drawText('CRAFTING:', invX + 10, craftY, 10, '#44cc88');

  for (let i = 0; i < RECIPES.length; i++) {
    const r = RECIPES[i];
    const ry = craftY + 14 + i * 20;
    if (ry > invY + invH - 10) break;
    let canCraft = true;
    for (const [item, need] of Object.entries(r.need)) {
      if (!hasItem(player, item, need)) { canCraft = false; break; }
    }
    renderer.fillRect(invX + 8, ry - 9, invW - 16, 18,
      canCraft ? '#44cc8820' : '#64646420');
    const label = r.label + (r.qty && r.qty > 1 ? ` x${r.qty}` : '');
    text.drawText(label, invX + 12, ry - 6, 8, canCraft ? '#44cc88' : '#666666');
    if (canCraft) {
      text.drawText('[CLICK]', invX + invW - 60, ry - 6, 8, '#44cc88');
    }
  }
}

function initGame(game) {
  score = 0;
  worldTime = 8000;
  dayCount = 1;
  bossActive = false;
  boss = null;
  enemies = [];
  particles = [];
  projectiles = [];
  droppedItems = [];
  damageNumbers = [];
  showInventory = false;
  miningTarget = null;
  miningProgress = 0;
  spawnTimer = 0;
  lightTimer = 0;

  generateWorld();

  const spawnX = 25;
  const surfY = getSurface(spawnX);
  player = createEntity(spawnX * TILE, (surfY - 2) * TILE, false);
  player.inventory = { WOOD: 5, DIRT: 10, TORCH: 3 };
  player.hotbar = ['PICKAXE', 'SWORD', 'TORCH', 'DIRT', 'PLATFORM'];

  ally = createEntity((spawnX + 2) * TILE, (surfY - 2) * TILE, true);
  ally.inventory = { WOOD: 3 };
  ally.hotbar = ['PICKAXE', 'SWORD', 'TORCH', 'DIRT', 'PLATFORM'];

  computeLight();

  if (hpEl) hpEl.textContent = '100';
  if (scoreEl) scoreEl.textContent = '0';
  if (dayEl) dayEl.textContent = '1';
  if (todEl) todEl.textContent = 'Morning';
  if (toolEl) toolEl.textContent = 'Pickaxe [MINE]';
  if (allyHpEl) allyHpEl.textContent = '80';
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    // Draw a quick preview on the canvas (optional — engine will clear each frame)
    game.showOverlay('TERRARIA LITE', 'Click or press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ---- Direct canvas mouse listeners ----
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    if (game.state === 'waiting' || game.state === 'over') {
      initGame(game);
      game.setState('playing');
      return;
    }
    mouseDown = true;
    if (showInventory) handleInventoryClick(mouseX, mouseY);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    miningTarget = null;
    miningProgress = 0;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      // Wait for any key
      const anyKey = input.wasPressed(' ') || input.wasPressed('Enter') ||
                     input.wasPressed('w') || input.wasPressed('a') ||
                     input.wasPressed('d') || input.wasPressed('ArrowLeft') ||
                     input.wasPressed('ArrowRight');
      if (anyKey) {
        initGame(game);
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter') ||
          input.wasPressed('w') || input.wasPressed('a') || input.wasPressed('d')) {
        initGame(game);
        game.setState('playing');
      }
      return;
    }

    // ---- Time of day ----
    worldTime += 3;
    if (worldTime >= 24000) { worldTime -= 24000; dayCount++; }

    const hour = Math.floor((worldTime / 24000) * 24);
    const tod = hour >= 5 && hour < 7 ? 'Dawn' :
                hour >= 7 && hour < 12 ? 'Morning' :
                hour >= 12 && hour < 17 ? 'Afternoon' :
                hour >= 17 && hour < 19 ? 'Dusk' : 'Night';
    if (todEl) todEl.textContent = tod;
    if (dayEl) dayEl.textContent = dayCount;
    if (hpEl) hpEl.textContent = Math.max(0, Math.round(player.hp));
    if (scoreEl) scoreEl.textContent = score;
    if (toolEl) toolEl.textContent = (ITEMS[getSelectedItem(player)]?.name || '???') + ' [' + player.toolMode.toUpperCase() + ']';
    if (allyHpEl) allyHpEl.textContent = ally ? Math.max(0, ally.hp) + (ally.hp <= 0 ? ' (respawning)' : '') : '0';

    updatePlayer(input, game);
    updateAlly(game);
    updateCamera();

    // Enemy spawning
    spawnTimer--;
    const isNight = worldTime < 5000 || worldTime > 19000;
    if (spawnTimer <= 0 && enemies.length < (isNight ? 8 : 4)) {
      spawnEnemy();
      spawnTimer = isNight ? 60 + Math.random() * 90 : 150 + Math.random() * 200;
    }

    // Boss spawn
    if (isNight && score >= 100 && !bossActive && dayCount >= 2 && Math.random() < 0.001) {
      spawnBoss();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!updateEnemy(enemies[i], game)) enemies.splice(i, 1);
    }

    updateBoss(game);
    updateProjectiles(game);
    updateDroppedItems();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const d = damageNumbers[i];
      d.y += d.vy; d.life--;
      if (d.life <= 0) damageNumbers.splice(i, 1);
    }

    // Recompute lighting periodically
    lightTimer--;
    if (lightTimer <= 0) { computeLight(); lightTimer = 15; }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting' || !player) {
      // Show a simple preview background while on menu
      renderer.fillRect(0, 0, W, H, '#0a1030');
      for (let i = 0; i < 30; i++) {
        renderer.fillRect(
          (i * 137 + i * i * 31) % W,
          (i * 89 + i * i * 17) % (H * 0.4),
          1.5, 1.5, '#ffffff80'
        );
      }
      // Ground preview
      for (let x = 0; x < W; x += TILE) {
        const sy2 = H * 0.6 + Math.sin(x * 0.03) * 15;
        renderer.fillRect(x, sy2, TILE, 3, '#4a7a3a');
        renderer.fillRect(x, sy2 + 3, TILE, H - sy2 - 3, '#8B5E3C');
      }
      return;
    }

    render(renderer, text);
  };

  game.start();
  return game;
}
