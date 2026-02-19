// browser-mmo-rpg/game.js — Browser MMO RPG ported to WebGL 2 engine

import { Game } from '../engine/core.js';

// ── Constants ──
const W = 600, H = 500;
const TILE = 32;
const ACCENT = '#ee44aa';
const WORLD_W = 120, WORLD_H = 100;

const ZONES = {
  town:    { x: 45, y: 40, w: 30, h: 20, name: 'Town of Haven',    color: '#554433' },
  forest:  { x: 80, y: 30, w: 35, h: 40, name: 'Darkwood Forest',  color: '#1a3a1a' },
  dungeon: { x: 40, y:  5, w: 25, h: 25, name: 'Obsidian Dungeon', color: '#2a1a2a' },
  pvp:     { x:  5, y: 35, w: 25, h: 25, name: 'PvP Arena',        color: '#3a1a1a' }
};

const TILE_COLORS = {
  0: '#2a4a2a', 1: '#223355', 2: '#555555', 3: '#887755',
  4: '#665544', 5: '#1a3a1a', 6: '#332233', 7: '#cc3300', 8: '#aa9966'
};

// ── Class / Item / Enemy / Quest Data (unchanged from original) ──
const CLASS_DATA = {
  warrior: {
    name: 'Warrior', hp: 120, mp: 30, str: 14, def: 12, spd: 3, int: 5, color: '#cc4444',
    abilities: [
      { name: 'Slash',       cost:  0, cd:   500, dmg: 1.2, range:  48, desc: 'Basic melee attack',    type: 'melee' },
      { name: 'Shield Bash', cost:  8, cd:  3000, dmg: 1.5, range:  48, desc: 'Stun enemy briefly',    type: 'melee', stun: 1000 },
      { name: 'Whirlwind',   cost: 15, cd:  6000, dmg: 2.0, range:  64, desc: 'Hit all nearby enemies',type: 'aoe' },
      { name: 'War Cry',     cost: 10, cd: 10000, dmg:   0, range:   0, desc: '+50% damage for 5s',    type: 'buff', duration: 5000 }
    ]
  },
  mage: {
    name: 'Mage', hp: 70, mp: 100, str: 6, def: 6, spd: 3, int: 16, color: '#4466ff',
    abilities: [
      { name: 'Firebolt',  cost:  5, cd:  600, dmg: 1.3, range: 180, desc: 'Ranged fire attack',    type: 'ranged', projSpd: 6 },
      { name: 'Ice Nova',  cost: 15, cd: 4000, dmg: 1.8, range:  80, desc: 'Freeze nearby enemies', type: 'aoe', slow: 2000 },
      { name: 'Lightning', cost: 20, cd: 5000, dmg: 2.5, range: 200, desc: 'Chain lightning',       type: 'ranged', projSpd: 5, chain: 2 },
      { name: 'Heal',      cost: 25, cd: 8000, dmg:-2.0, range:   0, desc: 'Restore health',        type: 'heal' }
    ]
  },
  ranger: {
    name: 'Ranger', hp: 90, mp: 50, str: 10, def: 8, spd: 4, int: 10, color: '#44cc44',
    abilities: [
      { name: 'Arrow',      cost:  0, cd:   400, dmg: 1.1, range: 200, desc: 'Ranged arrow',     type: 'ranged', projSpd: 8 },
      { name: 'Multi-Shot', cost: 10, cd:  3000, dmg: 0.8, range: 180, desc: 'Fire 3 arrows',    type: 'ranged', projSpd: 7, multi: 3 },
      { name: 'Trap',       cost: 12, cd:  5000, dmg: 1.5, range:   0, desc: 'Place a trap',     type: 'trap' },
      { name: 'Companion',  cost: 20, cd: 15000, dmg:   0, range:   0, desc: 'Summon wolf ally', type: 'summon', duration: 10000 }
    ]
  }
};

const ITEM_TEMPLATES = {
  rusty_sword:   { name: 'Rusty Sword',   type: 'weapon',    slot: 'weapon',    str: 2,           value:  10, rarity: 0 },
  iron_sword:    { name: 'Iron Sword',    type: 'weapon',    slot: 'weapon',    str: 5,           value:  50, rarity: 1 },
  flame_blade:   { name: 'Flame Blade',   type: 'weapon',    slot: 'weapon',    str: 10, int: 3,  value: 200, rarity: 2 },
  oak_staff:     { name: 'Oak Staff',     type: 'weapon',    slot: 'weapon',    int: 4,           value:  30, rarity: 0 },
  crystal_staff: { name: 'Crystal Staff', type: 'weapon',    slot: 'weapon',    int: 10, mp: 20,  value: 250, rarity: 2 },
  hunting_bow:   { name: 'Hunting Bow',   type: 'weapon',    slot: 'weapon',    str: 3, spd: 1,   value:  25, rarity: 0 },
  longbow:       { name: 'Longbow',       type: 'weapon',    slot: 'weapon',    str: 7, spd: 1,   value: 120, rarity: 1 },
  leather_armor: { name: 'Leather Armor', type: 'armor',     slot: 'armor',     def: 3,           value:  20, rarity: 0 },
  chain_mail:    { name: 'Chain Mail',    type: 'armor',     slot: 'armor',     def: 7,           value:  80, rarity: 1 },
  plate_armor:   { name: 'Plate Armor',   type: 'armor',     slot: 'armor',     def: 14, hp: 20,  value: 300, rarity: 2 },
  mage_robe:     { name: 'Mage Robe',     type: 'armor',     slot: 'armor',     def: 2, int: 5, mp: 15, value: 100, rarity: 1 },
  health_ring:   { name: 'Health Ring',   type: 'accessory', slot: 'accessory', hp: 20,           value:  60, rarity: 1 },
  power_amulet:  { name: 'Power Amulet',  type: 'accessory', slot: 'accessory', str: 4,           value:  80, rarity: 1 },
  health_potion: { name: 'Health Potion', type: 'consumable',                   healHp: 40,       value:  15, rarity: 0 },
  mana_potion:   { name: 'Mana Potion',   type: 'consumable',                   healMp: 30,       value:  15, rarity: 0 },
  super_health:  { name: 'Super Health Potion', type: 'consumable',             healHp: 100,      value:  50, rarity: 1 },
  wolf_fang:     { name: 'Wolf Fang',     type: 'quest',                                          value:   5, rarity: 0 },
  dark_crystal:  { name: 'Dark Crystal',  type: 'quest',                                          value:  25, rarity: 1 },
  ancient_relic: { name: 'Ancient Relic', type: 'quest',                                          value: 100, rarity: 2 }
};

const SHOP_ITEMS = ['health_potion','mana_potion','super_health','iron_sword','chain_mail','longbow','mage_robe','health_ring','power_amulet'];

const ENEMY_TYPES = {
  slime:         { name: 'Slime',           hp:  25, str:  4, def:  2, spd: 1.0, xp:  15, color: '#44cc44', size: 12, drops: ['health_potion'],                                     dropRate: 0.3 },
  wolf:          { name: 'Wolf',            hp:  40, str:  7, def:  3, spd: 2.5, xp:  25, color: '#888888', size: 14, drops: ['wolf_fang','health_potion'],                          dropRate: 0.4 },
  goblin:        { name: 'Goblin',          hp:  50, str:  9, def:  5, spd: 2.0, xp:  35, color: '#66aa33', size: 13, drops: ['health_potion','mana_potion','leather_armor'],        dropRate: 0.35 },
  bandit:        { name: 'Bandit',          hp:  70, str: 12, def:  7, spd: 2.0, xp:  50, color: '#aa6633', size: 14, drops: ['iron_sword','chain_mail','health_potion'],            dropRate: 0.3 },
  skeleton:      { name: 'Skeleton',        hp:  60, str: 11, def:  8, spd: 1.5, xp:  45, color: '#ccccaa', size: 14, drops: ['mana_potion','dark_crystal'],                         dropRate: 0.35 },
  wraith:        { name: 'Wraith',          hp:  80, str: 15, def:  6, spd: 2.5, xp:  65, color: '#8844cc', size: 15, drops: ['dark_crystal','crystal_staff','mage_robe'],           dropRate: 0.3 },
  dark_knight:   { name: 'Dark Knight',     hp: 120, str: 18, def: 14, spd: 1.5, xp:  90, color: '#333355', size: 16, drops: ['flame_blade','plate_armor','super_health'],           dropRate: 0.4 },
  dragon_boss:   { name: 'Shadow Dragon',   hp: 500, str: 30, def: 20, spd: 1.2, xp: 500, color: '#cc2222', size: 28, drops: ['ancient_relic','flame_blade','plate_armor','crystal_staff'], dropRate: 1.0, boss: true },
  pvp_champion:  { name: 'Arena Champion',  hp: 150, str: 20, def: 12, spd: 2.5, xp: 100, color: '#ccaa22', size: 16, drops: ['super_health','power_amulet'],                       dropRate: 0.5 }
};

const QUEST_TEMPLATES = [
  { id: 'q_slimes',    name: 'Slime Cleanup',    desc: 'Kill 5 slimes near town',          type: 'kill',    target: 'slime',       count:  5, xpReward:   80, goldReward:  30 },
  { id: 'q_wolves',    name: 'Wolf Menace',       desc: 'Collect 3 wolf fangs',             type: 'collect', target: 'wolf_fang',   count:  3, xpReward:  120, goldReward:  50 },
  { id: 'q_goblins',   name: 'Goblin Camp',       desc: 'Kill 8 goblins in the forest',     type: 'kill',    target: 'goblin',      count:  8, xpReward:  200, goldReward:  80 },
  { id: 'q_bandits',   name: 'Bandit Bounty',     desc: 'Kill 5 bandits',                   type: 'kill',    target: 'bandit',      count:  5, xpReward:  250, goldReward: 100 },
  { id: 'q_crystals',  name: 'Dark Research',     desc: 'Collect 3 dark crystals',          type: 'collect', target: 'dark_crystal',count:  3, xpReward:  300, goldReward: 120 },
  { id: 'q_skeletons', name: 'Bone Yard',         desc: 'Kill 10 skeletons',                type: 'kill',    target: 'skeleton',    count: 10, xpReward:  350, goldReward: 150 },
  { id: 'q_boss',      name: 'Slay the Dragon',   desc: 'Defeat the Shadow Dragon',         type: 'kill',    target: 'dragon_boss', count:  1, xpReward: 1000, goldReward: 500 },
  { id: 'q_arena',     name: 'Arena Challenge',   desc: 'Defeat 3 arena champions',         type: 'kill',    target: 'pvp_champion',count:  3, xpReward:  400, goldReward: 200 }
];

// ── Module-scope state ──
let gameState = 'menu'; // menu, playing, dead, paused, inventory, map, questlog, shop, questboard
let score = 0;
let worldMap = [];
let camera = { x: 0, y: 0 };
let player = null;
let party = [];
let enemies = [];
let npcs = [];
let projectiles = [];
let particles = [];
let traps = [];
let drops = [];
let floatingTexts = [];
let questLog = [];
let availableQuests = [];
let completedQuests = new Set();

// Mouse state for click-driven UI (engine records raw events for replay; we maintain local state for UI)
let mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
let pendingClicks = []; // { x, y, button }

// ── Utility ──
function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return true;
  let t = worldMap[ty][tx];
  return t === 1 || t === 2 || t === 5 || t === 7;
}

function getRarityColor(r) {
  return r >= 2 ? '#cc44ff' : r >= 1 ? '#4488ff' : '#ffffff';
}

function calcDamage(str, def, baseDmg) {
  return Math.max(1, Math.floor(str * baseDmg - def * 0.4 + (Math.random() * 4 - 2)));
}

// Alpha-encoded color helpers
function withAlpha(hex6, alpha) {
  // hex6 = '#rrggbb', alpha 0-1 → '#rrggbbaa'
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return hex6 + a;
}

// ── World Generation ──
function generateWorld() {
  worldMap = [];
  for (let y = 0; y < WORLD_H; y++) {
    worldMap[y] = new Array(WORLD_W).fill(0);
  }
  // Water borders
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
    if (x < 2 || x >= WORLD_W - 2 || y < 2 || y >= WORLD_H - 2) worldMap[y][x] = 1;
  }
  // Town
  let tz = ZONES.town;
  for (let y = tz.y; y < tz.y + tz.h; y++) for (let x = tz.x; x < tz.x + tz.w; x++) {
    worldMap[y][x] = 4;
    if (y === tz.y || y === tz.y + tz.h - 1 || x === tz.x || x === tz.x + tz.w - 1) worldMap[y][x] = 2;
  }
  worldMap[tz.y][tz.x + 15] = 4; worldMap[tz.y + tz.h - 1][tz.x + 15] = 4;
  worldMap[tz.y + 10][tz.x] = 4; worldMap[tz.y + 10][tz.x + tz.w - 1] = 4;
  for (let x = tz.x + 1; x < tz.x + tz.w - 1; x++) worldMap[tz.y + 10][x] = 3;
  for (let y = tz.y + 1; y < tz.y + tz.h - 1; y++) worldMap[y][tz.x + 15] = 3;
  // Forest
  let fz = ZONES.forest;
  for (let y = fz.y; y < fz.y + fz.h; y++) for (let x = fz.x; x < fz.x + fz.w; x++) {
    if (Math.random() < 0.35) worldMap[y][x] = 5;
  }
  // Dungeon
  let dz = ZONES.dungeon;
  for (let y = dz.y; y < dz.y + dz.h; y++) for (let x = dz.x; x < dz.x + dz.w; x++) {
    worldMap[y][x] = 6;
    if (y === dz.y || y === dz.y + dz.h - 1 || x === dz.x || x === dz.x + dz.w - 1) worldMap[y][x] = 2;
  }
  worldMap[dz.y + dz.h - 1][dz.x + 12] = 6;
  for (let r = 0; r < 5; r++) {
    let rx = dz.x + 3 + Math.floor(Math.random() * 18);
    let ry = dz.y + 3 + Math.floor(Math.random() * 18);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      let ty = ry + dy, tx = rx + dx;
      if (ty > dz.y && ty < dz.y + dz.h - 1 && tx > dz.x && tx < dz.x + dz.w - 1) worldMap[ty][tx] = 6;
    }
  }
  // PvP
  let pz = ZONES.pvp;
  for (let y = pz.y; y < pz.y + pz.h; y++) for (let x = pz.x; x < pz.x + pz.w; x++) {
    worldMap[y][x] = 8;
    if (y === pz.y || y === pz.y + pz.h - 1 || x === pz.x || x === pz.x + pz.w - 1) worldMap[y][x] = 7;
  }
  worldMap[pz.y + pz.h - 1][pz.x + 12] = 8;
  // Roads
  for (let x = tz.x + tz.w; x < fz.x; x++) worldMap[tz.y + 10][x] = 3;
  for (let y = dz.y + dz.h; y < tz.y; y++) worldMap[y][tz.x + 15] = 3;
  for (let x = pz.x + pz.w; x < tz.x; x++) worldMap[pz.y + 12][x] = 3;
  for (let y = pz.y + 12; y <= tz.y + 10; y++) worldMap[y][pz.x + pz.w] = 3;
  // Random ponds
  for (let i = 0; i < 8; i++) {
    let px = 10 + Math.floor(Math.random() * 100);
    let py = 10 + Math.floor(Math.random() * 80);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 5 && worldMap[py + dy] && worldMap[py + dy][px + dx] === 0) worldMap[py + dy][px + dx] = 1;
    }
  }
}

// ── Player ──
function createPlayer(cls) {
  let cd = CLASS_DATA[cls];
  player = {
    x: (ZONES.town.x + 15) * TILE, y: (ZONES.town.y + 10) * TILE,
    class: cls, className: cd.name, color: cd.color,
    maxHp: cd.hp, hp: cd.hp, maxMp: cd.mp, mp: cd.mp,
    str: cd.str, def: cd.def, spd: cd.spd, int: cd.int,
    level: 1, xp: 0, xpToLevel: 100, gold: 50,
    abilities: cd.abilities.map(a => ({ ...a, cdTimer: 0 })),
    equipment: { weapon: null, armor: null, accessory: null },
    inventory: [], buffs: [],
    attackCd: 0, facing: { x: 0, y: 1 }, invuln: 0, size: 14
  };
  if (cls === 'warrior') addItem('rusty_sword');
  else if (cls === 'mage') addItem('oak_staff');
  else addItem('hunting_bow');
  addItem('health_potion');
  addItem('health_potion');
  addItem('mana_potion');
  let wpn = player.inventory.find(i => i.type === 'weapon');
  if (wpn) equipItem(player.inventory.indexOf(wpn));
}

function addItem(templateId) {
  let t = ITEM_TEMPLATES[templateId];
  if (!t) return false;
  if (player.inventory.length >= 20) { addFloatingText(player.x, player.y - 20, 'Inventory Full!', '#ff4444'); return false; }
  player.inventory.push({ ...t, templateId });
  return true;
}

function equipItem(idx) {
  let item = player.inventory[idx];
  if (!item || !item.slot) return;
  let old = player.equipment[item.slot];
  if (old) {
    if (old.str) player.str -= old.str;
    if (old.def) player.def -= old.def;
    if (old.int) player.int -= old.int;
    if (old.hp)  { player.maxHp -= old.hp; player.hp = Math.min(player.hp, player.maxHp); }
    if (old.mp)  { player.maxMp -= old.mp; player.mp = Math.min(player.mp, player.maxMp); }
    if (old.spd) player.spd -= old.spd;
    player.inventory.push(old);
  }
  if (item.str) player.str += item.str;
  if (item.def) player.def += item.def;
  if (item.int) player.int += item.int;
  if (item.hp)  player.maxHp += item.hp;
  if (item.mp)  player.maxMp += item.mp;
  if (item.spd) player.spd += item.spd;
  player.equipment[item.slot] = item;
  player.inventory.splice(idx, 1);
}

function useItem(idx) {
  let item = player.inventory[idx];
  if (!item) return;
  if (item.type === 'consumable') {
    if (item.healHp) { player.hp = Math.min(player.hp + item.healHp, player.maxHp); addFloatingText(player.x, player.y - 20, '+' + item.healHp + ' HP', '#44ff44'); }
    if (item.healMp) { player.mp = Math.min(player.mp + item.healMp, player.maxMp); addFloatingText(player.x, player.y - 20, '+' + item.healMp + ' MP', '#4488ff'); }
    player.inventory.splice(idx, 1);
  } else if (item.slot) {
    equipItem(idx);
  }
}

// ── Party AI ──
function createPartyMember() {
  let classes = ['warrior', 'mage', 'ranger'].filter(c => c !== player.class);
  let cls = classes[Math.floor(Math.random() * classes.length)];
  let cd = CLASS_DATA[cls];
  return {
    x: player.x + 30, y: player.y + 30,
    class: cls, className: cd.name, color: cd.color,
    name: ['Aria','Kael','Luna','Theron','Lyra','Finn'][Math.floor(Math.random() * 6)],
    maxHp: cd.hp, hp: cd.hp, maxMp: cd.mp, mp: cd.mp,
    str: cd.str, def: cd.def, spd: cd.spd, int: cd.int,
    abilities: cd.abilities.map(a => ({ ...a, cdTimer: 0 })),
    attackCd: 0, target: null, state: 'follow', size: 13, level: 1
  };
}

// ── Enemies ──
function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < 6; i++)  spawnEnemy('slime',        ZONES.town);
  for (let i = 0; i < 10; i++) spawnEnemy('wolf',         ZONES.forest);
  for (let i = 0; i < 8; i++)  spawnEnemy('goblin',       ZONES.forest);
  for (let i = 0; i < 5; i++)  spawnEnemy('bandit',       ZONES.forest);
  for (let i = 0; i < 8; i++)  spawnEnemy('skeleton',     ZONES.dungeon);
  for (let i = 0; i < 5; i++)  spawnEnemy('wraith',       ZONES.dungeon);
  for (let i = 0; i < 3; i++)  spawnEnemy('dark_knight',  ZONES.dungeon);
  spawnEnemy('dragon_boss', ZONES.dungeon, ZONES.dungeon.x + 12, ZONES.dungeon.y + 5);
  for (let i = 0; i < 4; i++)  spawnEnemy('pvp_champion', ZONES.pvp);
}

function spawnEnemy(type, zone, fx, fy) {
  let et = ENEMY_TYPES[type];
  let x, y, attempts = 0;
  if (fx !== undefined) { x = fx; y = fy; }
  else {
    do {
      x = zone.x + 2 + Math.floor(Math.random() * (zone.w - 4));
      y = zone.y + 2 + Math.floor(Math.random() * (zone.h - 4));
      attempts++;
    } while (isSolid(x, y) && attempts < 50);
  }
  enemies.push({
    x: x * TILE, y: y * TILE,
    type, ...et,
    maxHp: et.hp, curHp: et.hp,
    homeX: x * TILE, homeY: y * TILE,
    target: null, state: 'idle', stateTimer: 0,
    attackCd: 0, stunTimer: 0, slowTimer: 0,
    alive: true, respawnTimer: 0, spawnZone: zone
  });
}

// ── NPCs ──
function spawnNPCs() {
  npcs = [];
  let tz = ZONES.town;
  npcs.push({ x: (tz.x + 5) * TILE,  y: (tz.y + 5) * TILE,  name: 'Merchant',    type: 'shop',       color: '#ddaa33', size: 14 });
  npcs.push({ x: (tz.x + 25) * TILE, y: (tz.y + 5) * TILE,  name: 'Quest Board', type: 'questboard', color: '#aa8855', size: 14 });
  npcs.push({ x: (tz.x + 15) * TILE, y: (tz.y + 15) * TILE, name: 'Innkeeper',   type: 'inn',        color: '#cc8866', size: 14 });
  npcs.push({ x: (tz.x + 10) * TILE, y: (tz.y + 8) * TILE,  name: 'Guild Master',type: 'guild',      color: '#8866cc', size: 14 });
}

// ── Combat ──
function useAbility(idx) {
  if (!player || idx >= player.abilities.length) return;
  let ab = player.abilities[idx];
  if (ab.cdTimer > 0) return;
  if (player.mp < ab.cost) { addFloatingText(player.x, player.y - 20, 'No Mana!', '#4488ff'); return; }
  player.mp -= ab.cost;
  ab.cdTimer = ab.cd;
  let buffMult = player.buffs.some(b => b.type === 'dmgup') ? 1.5 : 1.0;
  let strStat = player.class === 'mage' ? player.int : player.str;

  if (ab.type === 'melee') {
    enemies.forEach(e => {
      if (!e.alive) return;
      let dx = e.x - player.x, dy = e.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < ab.range) {
        let dmg = Math.floor(calcDamage(strStat, e.def, ab.dmg) * buffMult);
        damageEnemy(e, dmg);
        if (ab.stun) e.stunTimer = ab.stun;
        spawnHitParticles(e.x, e.y, e.color);
      }
    });
  } else if (ab.type === 'ranged') {
    let count = ab.multi || 1;
    for (let i = 0; i < count; i++) {
      let angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
      if (count > 1) angle += (i - (count - 1) / 2) * 0.2;
      projectiles.push({
        x: player.x, y: player.y,
        vx: Math.cos(angle) * (ab.projSpd || 5),
        vy: Math.sin(angle) * (ab.projSpd || 5),
        dmg: Math.floor(calcDamage(strStat, 0, ab.dmg) * buffMult),
        owner: 'player', life: 60, color: player.color, size: 4, chain: ab.chain || 0
      });
    }
  } else if (ab.type === 'aoe') {
    enemies.forEach(e => {
      if (!e.alive) return;
      let dx = e.x - player.x, dy = e.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < ab.range) {
        let dmg = Math.floor(calcDamage(strStat, e.def, ab.dmg) * buffMult);
        damageEnemy(e, dmg);
        if (ab.slow) e.slowTimer = ab.slow;
        spawnHitParticles(e.x, e.y, '#88ccff');
      }
    });
    particles.push({ x: player.x, y: player.y, size: ab.range, life: 15, maxLife: 15, color: ACCENT, type: 'ring' });
  } else if (ab.type === 'heal') {
    let heal = Math.floor(Math.abs(ab.dmg) * player.int);
    player.hp = Math.min(player.hp + heal, player.maxHp);
    addFloatingText(player.x, player.y - 20, '+' + heal + ' HP', '#44ff44');
    party.forEach(p => { p.hp = Math.min(p.hp + Math.floor(heal * 0.5), p.maxHp); });
    particles.push({ x: player.x, y: player.y, size: 40, life: 20, maxLife: 20, color: '#44ff44', type: 'ring' });
  } else if (ab.type === 'buff') {
    player.buffs.push({ type: 'dmgup', duration: ab.duration, timer: ab.duration });
    addFloatingText(player.x, player.y - 30, 'War Cry!', '#ffaa44');
  } else if (ab.type === 'trap') {
    traps.push({ x: player.x, y: player.y, dmg: Math.floor(calcDamage(strStat, 0, ab.dmg) * buffMult), life: 600, owner: 'player', size: 10 });
  } else if (ab.type === 'summon') {
    party.push({
      x: player.x + 30, y: player.y,
      maxHp: 60, hp: 60, str: player.str, def: 5, spd: 3,
      color: '#aa8844', size: 12, name: 'Wolf',
      attackCd: 0, target: null, state: 'follow', timer: ab.duration, isSummon: true
    });
  }
}

function damageEnemy(e, dmg) {
  e.curHp -= dmg;
  addFloatingText(e.x, e.y - 20, '-' + dmg, '#ff4444');
  e.state = 'aggro'; e.target = player;
  if (e.curHp <= 0) {
    e.alive = false;
    e.respawnTimer = 600 + Math.random() * 300;
    let xp = e.xp + Math.floor(e.xp * 0.1 * (player.level - 1));
    giveXP(xp);
    questLog.forEach(q => {
      if (q.type === 'kill' && q.target === e.type) q.progress = Math.min(q.progress + 1, q.count);
    });
    if (Math.random() < e.dropRate && e.drops && e.drops.length > 0) {
      let dropId = e.drops[Math.floor(Math.random() * e.drops.length)];
      drops.push({ x: e.x, y: e.y, item: { ...ITEM_TEMPLATES[dropId], templateId: dropId }, life: 900 });
    }
    let gold = Math.floor(e.xp * 0.3 + Math.random() * 5);
    player.gold += gold;
    addFloatingText(e.x, e.y - 30, '+' + gold + ' gold', '#ffdd44');
    score += e.xp;
    for (let i = 0; i < 8; i++) {
      particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30, maxLife: 30, color: e.color, size: 3, type: 'spark' });
    }
  }
}

function giveXP(xp) {
  player.xp += xp;
  score += Math.floor(xp * 0.5);
  while (player.xp >= player.xpToLevel) {
    player.xp -= player.xpToLevel;
    player.level++;
    player.xpToLevel = Math.floor(player.xpToLevel * 1.5);
    let cd = CLASS_DATA[player.class];
    player.maxHp += 10 + Math.floor(cd.hp * 0.08);
    player.hp = player.maxHp;
    player.maxMp += 5 + Math.floor(cd.mp * 0.05);
    player.mp = player.maxMp;
    player.str += 1 + (player.class === 'warrior' ? 1 : 0);
    player.def += 1;
    player.int += 1 + (player.class === 'mage' ? 1 : 0);
    addFloatingText(player.x, player.y - 40, 'LEVEL UP! Lv.' + player.level, '#ffdd44');
    particles.push({ x: player.x, y: player.y, size: 50, life: 30, maxLife: 30, color: '#ffdd44', type: 'ring' });
    party.forEach(p => { if (!p.isSummon) { p.level++; p.maxHp += 8; p.hp = p.maxHp; p.str += 1; p.def += 1; } });
  }
}

// ── NPC Interaction ──
function interactNearby() {
  npcs.forEach(npc => {
    let dx = npc.x - player.x, dy = npc.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 50) {
      if (npc.type === 'shop') gameState = 'shop';
      else if (npc.type === 'questboard') { refreshQuests(); gameState = 'questboard'; }
      else if (npc.type === 'inn') {
        if (player.gold >= 10) {
          player.gold -= 10;
          player.hp = player.maxHp; player.mp = player.maxMp;
          addFloatingText(player.x, player.y - 20, 'Rested! Full HP/MP', '#44ff44');
        } else { addFloatingText(player.x, player.y - 20, 'Need 10 gold!', '#ff4444'); }
      } else if (npc.type === 'guild') {
        addFloatingText(npc.x, npc.y - 20, 'Guild: +10% XP bonus!', '#8866cc');
      }
    }
  });
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];
    let dx = d.x - player.x, dy = d.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      if (addItem(d.item.templateId)) {
        questLog.forEach(q => {
          if (q.type === 'collect' && q.target === d.item.templateId) q.progress = Math.min(q.progress + 1, q.count);
        });
        drops.splice(i, 1);
      }
    }
  }
}

function refreshQuests() {
  availableQuests = QUEST_TEMPLATES.filter(q => !completedQuests.has(q.id) && !questLog.find(ql => ql.id === q.id));
}

function acceptQuest(idx) {
  if (questLog.length >= 5) return;
  let q = availableQuests[idx];
  if (!q) return;
  questLog.push({ ...q, progress: 0 });
  availableQuests.splice(idx, 1);
}

function checkQuestCompletion() {
  for (let i = questLog.length - 1; i >= 0; i--) {
    let q = questLog[i];
    if (q.progress >= q.count) {
      giveXP(q.xpReward);
      player.gold += q.goldReward;
      score += q.xpReward;
      addFloatingText(player.x, player.y - 40, 'Quest Complete! +' + q.xpReward + 'XP +' + q.goldReward + 'G', '#ffdd44');
      completedQuests.add(q.id);
      questLog.splice(i, 1);
    }
  }
}

// ── Particles / Effects ──
function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 5; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 15, maxLife: 15, color, size: 2, type: 'spark' });
  }
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60 });
}

// ── Zone ──
function getCurrentZone() {
  if (!player) return 'Wilderness';
  let ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
  for (let [k, z] of Object.entries(ZONES)) {
    if (ptx >= z.x && ptx < z.x + z.w && pty >= z.y && pty < z.y + z.h) return z.name;
  }
  return 'Wilderness';
}

// ── Respawn ──
function respawnPlayer() {
  player.hp = player.maxHp; player.mp = player.maxMp;
  player.x = (ZONES.town.x + 15) * TILE;
  player.y = (ZONES.town.y + 10) * TILE;
  player.gold = Math.max(0, player.gold - 20);
  score = Math.max(0, score - 50);
  player.invuln = 2000;
  gameState = 'playing';
}

// ── Game Start ──
function startGame(cls) {
  generateWorld();
  createPlayer(cls);
  party = [createPartyMember()];
  spawnEnemies();
  spawnNPCs();
  refreshQuests();
  drops = []; projectiles = []; particles = []; floatingTexts = []; traps = [];
  score = 0;
  gameState = 'playing';
}

// ── Tick counter for water animation ──
let tick = 0;

// ── Drawing helpers ──

// Draw a circle using fillCircle (body) + white eye rects
function drawCharacterR(renderer, text, sx, sy, size, color, label, isNPC) {
  renderer.fillCircle(sx, sy, size, color);
  // Subtle outline
  renderer.strokePoly([
    ...Array.from({ length: 12 }, (_, i) => {
      let a = (i / 12) * Math.PI * 2;
      return { x: sx + Math.cos(a) * size, y: sy + Math.sin(a) * size };
    })
  ], '#ffffff33', 1, true);
  // Eyes
  renderer.fillRect(sx - 4, sy - 3, 3, 3, '#ffffff');
  renderer.fillRect(sx + 2, sy - 3, 3, 3, '#ffffff');
  if (isNPC) {
    text.drawText('!', sx, sy - size - 20, 14, '#ffdd44', 'center');
  }
  if (label) {
    text.drawText(label, sx, sy - size - 23, 9, '#aaaaaa', 'center');
  }
}

// Draw a filled panel rectangle
function drawPanelR(renderer, text, x, y, w, h, title) {
  renderer.fillRect(x, y, w, h, 'rgba(20,20,40,0.95)');
  // Border using strokePoly
  renderer.strokePoly([
    { x: x,     y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x,     y: y + h }
  ], ACCENT, 2, true);
  text.drawText(title, x + w / 2, y + 8, 14, ACCENT, 'center');
  text.drawText('Press ESC to close', x + w / 2, y + h - 16, 9, '#666666', 'center');
}

// ── Main draw ──
function drawGame(renderer, text, frameCount) {
  if (gameState === 'menu') return;

  // ── Tiles ──
  let startTX = Math.floor(camera.x / TILE);
  let startTY = Math.floor(camera.y / TILE);
  let endTX = startTX + Math.ceil(W / TILE) + 1;
  let endTY = startTY + Math.ceil(H / TILE) + 1;

  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      if (ty < 0 || ty >= WORLD_H || tx < 0 || tx >= WORLD_W) continue;
      let t = worldMap[ty][tx];
      let sx = tx * TILE - camera.x, sy = ty * TILE - camera.y;
      let baseColor = TILE_COLORS[t] || '#2a4a2a';
      renderer.fillRect(sx, sy, TILE, TILE, baseColor);

      if (t === 5) {
        // Tree canopy
        renderer.fillCircle(sx + 16, sy + 10, 12, '#0d2a0d');
        // Trunk
        renderer.fillRect(sx + 14, sy + 18, 4, 14, '#553311');
      } else if (t === 1) {
        // Water shimmer — animate via tick
        let shimmerOff = Math.sin(tick * 0.02 + tx) * 4;
        let shimmerOff2 = Math.cos(tick * 0.016 + ty) * 3;
        renderer.fillRect(sx + shimmerOff, sy + shimmerOff2, 8, 2, 'rgba(100,150,255,0.15)');
      } else if (t === 7) {
        // Lava glow
        let lavaA = 0.2 + Math.sin(tick * 0.03 + tx + ty) * 0.1;
        renderer.fillRect(sx, sy, TILE, TILE, withAlpha('#ffc800', lavaA));
      } else if (t === 3) {
        // Path stones
        renderer.fillRect(sx + 4, sy + 4, 6, 6, '#776644');
        renderer.fillRect(sx + 18, sy + 18, 8, 8, '#776644');
      }
    }
  }

  // ── Drops ──
  drops.forEach(d => {
    let sx = d.x - camera.x, sy = d.y - camera.y;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
    let bob = Math.sin(tick * 0.021) * 3;
    let col = d.item.rarity >= 2 ? '#ff44ff' : d.item.rarity >= 1 ? '#4488ff' : '#ffffff';
    renderer.fillRect(sx - 5, sy - 5 + bob, 10, 10, col);
    renderer.strokePoly([
      { x: sx - 5, y: sy - 5 + bob }, { x: sx + 5, y: sy - 5 + bob },
      { x: sx + 5, y: sy + 5 + bob }, { x: sx - 5, y: sy + 5 + bob }
    ], '#ffffff', 1, true);
  });

  // ── Traps ──
  traps.forEach(t => {
    let sx = t.x - camera.x, sy = t.y - camera.y;
    // Fill circle with 30% alpha orange
    renderer.fillCircle(sx, sy, t.size, 'rgba(255,170,60,0.3)');
    renderer.strokePoly(
      Array.from({ length: 16 }, (_, i) => {
        let a = (i / 16) * Math.PI * 2;
        return { x: sx + Math.cos(a) * t.size, y: sy + Math.sin(a) * t.size };
      }),
      '#ffaa44', 1, true
    );
  });

  // ── NPCs ──
  npcs.forEach(npc => {
    let sx = npc.x - camera.x, sy = npc.y - camera.y;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;
    drawCharacterR(renderer, text, sx, sy, npc.size, npc.color, null, true);
    // Proximity label
    if (player) {
      let dx = npc.x - player.x, dy = npc.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        text.drawText('[E] ' + npc.name, sx, sy - npc.size - 24, 9, '#ffdd44', 'center');
      }
    }
  });

  // ── Enemies ──
  enemies.forEach(e => {
    if (!e.alive) return;
    let sx = e.x - camera.x, sy = e.y - camera.y;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;

    if (e.boss) renderer.setGlow(e.color, 0.8);
    renderer.fillCircle(sx, sy, e.size, e.color);
    if (e.boss) renderer.setGlow(null);

    // Eyes
    renderer.fillRect(sx - 4, sy - 3, 3, 3, '#ff0000');
    renderer.fillRect(sx + 2, sy - 3, 3, 3, '#ff0000');

    // HP bar
    let barW = e.size * 2;
    renderer.fillRect(sx - barW / 2, sy - e.size - 8, barW, 4, '#333333');
    let hpColor = e.curHp / e.maxHp > 0.5 ? '#44cc44' : e.curHp / e.maxHp > 0.25 ? '#ccaa44' : '#cc4444';
    renderer.fillRect(sx - barW / 2, sy - e.size - 8, barW * Math.max(0, e.curHp / e.maxHp), 4, hpColor);

    // Name label
    let nameColor = e.boss ? '#ff4444' : '#cccccc';
    let nameStr = e.name + (e.boss ? ' [BOSS]' : '');
    text.drawText(nameStr, sx, sy - e.size - 22, 8, nameColor, 'center');

    if (e.stunTimer > 0) {
      text.drawText('STUNNED', sx, sy + e.size + 2, 8, '#ffff44', 'center');
    }
  });

  // ── Party ──
  party.forEach((p, pi) => {
    let sx = p.x - camera.x, sy = p.y - camera.y;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;
    drawCharacterR(renderer, text, sx, sy, p.size, p.color, p.name, false);
    // HP bar
    let barW = 24;
    renderer.fillRect(sx - barW / 2, sy - 20, barW, 3, '#333333');
    renderer.fillRect(sx - barW / 2, sy - 20, barW * Math.max(0, p.hp / p.maxHp), 3, '#44cc44');
  });

  // ── Player ──
  if (player) {
    let sx = player.x - camera.x, sy = player.y - camera.y;
    let flash = player.invuln > 0 && Math.floor(player.invuln / 50) % 2;
    if (!flash) {
      drawCharacterR(renderer, text, sx, sy, player.size, player.color, null, false);
      // Facing dot
      renderer.fillCircle(sx + player.facing.x * 12, sy + player.facing.y * 12, 3, '#ffffff');
    }
  }

  // ── Projectiles ──
  projectiles.forEach(p => {
    let sx = p.x - camera.x, sy = p.y - camera.y;
    renderer.setGlow(p.color, 0.6);
    renderer.fillCircle(sx, sy, p.size, p.color);
    renderer.setGlow(null);
  });

  // ── Particles ──
  particles.forEach(p => {
    let alpha = p.life / p.maxLife;
    let sx = p.x - camera.x, sy = p.y - camera.y;
    if (p.type === 'ring') {
      let radius = p.size * (1 - alpha) + 5;
      let pts = Array.from({ length: 20 }, (_, i) => {
        let a = (i / 20) * Math.PI * 2;
        return { x: sx + Math.cos(a) * radius, y: sy + Math.sin(a) * radius };
      });
      renderer.strokePoly(pts, withAlpha(p.color.slice(0, 7), alpha * 0.5), 2, true);
    } else {
      let col = withAlpha(p.color.length >= 7 ? p.color.slice(0, 7) : p.color, alpha);
      renderer.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size, col);
    }
  });

  // ── Floating Texts ──
  floatingTexts.forEach(ft => {
    let sx = ft.x - camera.x, sy = ft.y - camera.y;
    let alpha = ft.life / ft.maxLife;
    let col = withAlpha(ft.color.length >= 7 ? ft.color.slice(0, 7) : ft.color, alpha);
    text.drawText(ft.text, sx, sy, 11, col, 'center');
  });

  // ── HUD ──
  drawHUD(renderer, text);

  // ── UI Panels ──
  if (gameState === 'inventory') drawInventory(renderer, text);
  if (gameState === 'map')       drawMap(renderer, text);
  if (gameState === 'questlog')  drawQuestLog(renderer, text);
  if (gameState === 'shop')      drawShop(renderer, text);
  if (gameState === 'questboard')drawQuestBoard(renderer, text);
}

function drawHUD(renderer, text) {
  if (!player) return;

  // HP Bar
  let bx = 10, by = H - 60, bw = 150, bh = 16;
  renderer.fillRect(bx - 1, by - 1, bw + 2, bh + 2, '#1a1a2e');
  renderer.fillRect(bx, by, bw, bh, '#331111');
  let hpColor = player.hp / player.maxHp > 0.3 ? '#cc2222' : '#ff4444';
  renderer.fillRect(bx, by, bw * Math.max(0, player.hp / player.maxHp), bh, hpColor);
  text.drawText('HP: ' + Math.ceil(player.hp) + '/' + player.maxHp, bx + 4, by + 3, 10, '#ffffff', 'left');

  // MP Bar
  by += 20;
  renderer.fillRect(bx - 1, by - 1, bw + 2, bh + 2, '#1a1a2e');
  renderer.fillRect(bx, by, bw, bh, '#111133');
  renderer.fillRect(bx, by, bw * Math.max(0, player.mp / player.maxMp), bh, '#2244cc');
  text.drawText('MP: ' + Math.ceil(player.mp) + '/' + player.maxMp, bx + 4, by + 3, 10, '#ffffff', 'left');

  // XP Bar
  by += 20;
  renderer.fillRect(bx - 1, by - 1, bw + 2, 8, '#1a1a2e');
  renderer.fillRect(bx, by, bw, 6, '#222211');
  renderer.fillRect(bx, by, bw * (player.xp / player.xpToLevel), 6, '#ccaa22');

  // Ability bar
  let abx = W / 2 - 100, aby = H - 45;
  player.abilities.forEach((ab, i) => {
    let ax = abx + i * 52;
    let cdPct = ab.cdTimer / ab.cd;
    let bgColor = cdPct > 0 ? '#222233' : '#333355';
    renderer.fillRect(ax, aby, 46, 36, bgColor);
    let borderColor = cdPct > 0 ? '#444466' : ACCENT;
    renderer.strokePoly([
      { x: ax, y: aby }, { x: ax + 46, y: aby },
      { x: ax + 46, y: aby + 36 }, { x: ax, y: aby + 36 }
    ], borderColor, 1.5, true);
    if (cdPct > 0) {
      renderer.fillRect(ax, aby, 46, 36 * cdPct, 'rgba(0,0,0,0.5)');
    }
    let labelColor = cdPct > 0 ? '#666688' : '#ffffff';
    text.drawText(String(i + 1), ax + 23, aby + 2, 10, labelColor, 'center');
    text.drawText(ab.name, ax + 23, aby + 14, 7, labelColor, 'center');
    if (ab.cost > 0) {
      text.drawText(ab.cost + 'mp', ax + 23, aby + 25, 7, '#4488ff', 'center');
    }
  });

  // Zone name
  text.drawText(getCurrentZone(), W / 2, 6, 11, ACCENT, 'center');

  // Minimap
  drawMinimap(renderer, text);

  // Quest tracker
  if (questLog.length > 0) {
    let qtH = questLog.length * 28 + 8;
    renderer.fillRect(W - 180, 28, 175, qtH, 'rgba(26,26,46,0.8)');
    renderer.strokePoly([
      { x: W - 180, y: 28 }, { x: W - 5, y: 28 },
      { x: W - 5, y: 28 + qtH }, { x: W - 180, y: 28 + qtH }
    ], ACCENT + '44', 1, true);
    questLog.forEach((q, i) => {
      let qy = 44 + i * 28;
      let qColor = q.progress >= q.count ? '#44ff44' : '#cccccc';
      text.drawText(q.name, W - 174, qy - 2, 8, qColor, 'left');
      text.drawText(q.progress + '/' + q.count, W - 174, qy + 10, 8, '#888888', 'left');
    });
  }

  // Party status
  party.forEach((p, i) => {
    if (p.isSummon && p.timer <= 0) return;
    let px = 10, py = 10 + i * 30;
    renderer.fillRect(px, py, 120, 25, 'rgba(26,26,46,0.7)');
    text.drawText((p.name || 'Wolf') + ' Lv' + (p.level || 1), px + 4, py + 2, 9, p.color, 'left');
    renderer.fillRect(px + 4, py + 15, 80, 5, '#331111');
    renderer.fillRect(px + 4, py + 15, 80 * Math.max(0, p.hp / p.maxHp), 5, '#cc2222');
  });
}

function drawMinimap(renderer, text) {
  let mx = W - 110, my = H - 100, mw = 100, mh = 80;
  renderer.fillRect(mx, my, mw, mh, 'rgba(10,10,20,0.85)');
  renderer.strokePoly([
    { x: mx, y: my }, { x: mx + mw, y: my },
    { x: mx + mw, y: my + mh }, { x: mx, y: my + mh }
  ], ACCENT + '66', 1, true);

  let scaleX = mw / (WORLD_W * TILE), scaleY = mh / (WORLD_H * TILE);
  Object.values(ZONES).forEach(z => {
    // Use zone color with 53% alpha (88 hex)
    let col = z.color + '88';
    renderer.fillRect(mx + z.x * TILE * scaleX, my + z.y * TILE * scaleY, z.w * TILE * scaleX, z.h * TILE * scaleY, col);
  });

  enemies.forEach(e => {
    if (!e.alive) return;
    let col = e.boss ? '#ff0000' : '#ff444444';
    let ds = e.boss ? 3 : 1;
    renderer.fillRect(mx + e.x * scaleX, my + e.y * scaleY, ds, ds, col);
  });

  if (player) {
    renderer.fillRect(mx + player.x * scaleX - 1, my + player.y * scaleY - 1, 3, 3, '#ffffff');
    // Camera viewport rect
    renderer.strokePoly([
      { x: mx + camera.x * scaleX,       y: my + camera.y * scaleY },
      { x: mx + (camera.x + W) * scaleX, y: my + camera.y * scaleY },
      { x: mx + (camera.x + W) * scaleX, y: my + (camera.y + H) * scaleY },
      { x: mx + camera.x * scaleX,       y: my + (camera.y + H) * scaleY }
    ], '#ffffff33', 1, true);
  }
}

function drawInventory(renderer, text) {
  drawPanelR(renderer, text, 50, 30, 500, 440, 'INVENTORY');
  let ix = 60, iy = 55;

  text.drawText('-- Equipment --', ix, iy - 2, 10, '#aaaaaa', 'left');
  iy += 16;
  ['weapon', 'armor', 'accessory'].forEach(slot => {
    let item = player.equipment[slot];
    let col = item ? getRarityColor(item.rarity) : '#555555';
    text.drawText(slot.toUpperCase() + ': ' + (item ? item.name : '(empty)'), ix, iy - 2, 10, col, 'left');
    if (item) {
      let stats = [];
      if (item.str) stats.push('+' + item.str + ' STR');
      if (item.def) stats.push('+' + item.def + ' DEF');
      if (item.int) stats.push('+' + item.int + ' INT');
      if (item.hp) stats.push('+' + item.hp + ' HP');
      if (item.mp) stats.push('+' + item.mp + ' MP');
      text.drawText(stats.join(', '), ix + 200, iy - 2, 10, '#888888', 'left');
    }
    iy += 14;
  });
  iy += 10;

  text.drawText('-- Stats --', ix, iy - 2, 10, ACCENT, 'left');
  iy += 14;
  text.drawText('STR: ' + player.str + '  DEF: ' + player.def + '  INT: ' + player.int + '  SPD: ' + player.spd, ix, iy - 2, 10, '#cccccc', 'left');
  iy += 14;
  text.drawText('HP: ' + Math.ceil(player.hp) + '/' + player.maxHp + '  MP: ' + Math.ceil(player.mp) + '/' + player.maxMp, ix, iy - 2, 10, '#cccccc', 'left');
  iy += 20;

  text.drawText('-- Backpack (' + player.inventory.length + '/20) --', ix, iy - 2, 10, ACCENT, 'left');
  iy += 6;

  player.inventory.forEach((item, i) => {
    let row = Math.floor(i / 4), col2 = i % 4;
    let bx = ix + col2 * 120, by = iy + row * 50;
    let hover = mouse.x >= bx && mouse.x < bx + 115 && mouse.y >= by && mouse.y < by + 45;
    renderer.fillRect(bx, by, 115, 45, hover ? '#333355' : '#222244');
    renderer.strokePoly([
      { x: bx, y: by }, { x: bx + 115, y: by },
      { x: bx + 115, y: by + 45 }, { x: bx, y: by + 45 }
    ], hover ? ACCENT : '#444466', 1, true);
    text.drawText(item.name, bx + 4, by + 4, 9, getRarityColor(item.rarity), 'left');
    text.drawText(item.type === 'consumable' ? 'Use' : item.slot ? 'Equip' : 'Quest', bx + 4, by + 16, 8, '#888888', 'left');
    text.drawText(item.value + 'g', bx + 4, by + 28, 8, '#888888', 'left');
  });
}

function drawMap(renderer, text) {
  drawPanelR(renderer, text, 50, 30, 500, 440, 'WORLD MAP');
  let mx2 = 100, my2 = 70, mw = 400, mh = 350;
  let scaleX = mw / (WORLD_W * TILE), scaleY = mh / (WORLD_H * TILE);

  Object.entries(ZONES).forEach(([k, z]) => {
    let zx = mx2 + z.x * TILE * scaleX, zy = my2 + z.y * TILE * scaleY;
    let zw = z.w * TILE * scaleX, zh = z.h * TILE * scaleY;
    renderer.fillRect(zx, zy, zw, zh, z.color);
    renderer.strokePoly([
      { x: zx, y: zy }, { x: zx + zw, y: zy },
      { x: zx + zw, y: zy + zh }, { x: zx, y: zy + zh }
    ], '#888888', 1, true);
    text.drawText(z.name, zx + zw / 2, zy + zh / 2 - 6, 10, '#ffffff', 'center');
  });

  // Roads
  let tz = ZONES.town, fz = ZONES.forest, dz = ZONES.dungeon, pz = ZONES.pvp;
  renderer.drawLine(
    mx2 + (tz.x + tz.w) * TILE * scaleX, my2 + (tz.y + 10) * TILE * scaleY,
    mx2 + fz.x * TILE * scaleX,           my2 + (tz.y + 10) * TILE * scaleY,
    '#88775544', 3
  );
  renderer.drawLine(
    mx2 + (tz.x + 15) * TILE * scaleX, my2 + tz.y * TILE * scaleY,
    mx2 + (tz.x + 15) * TILE * scaleX, my2 + (dz.y + dz.h) * TILE * scaleY,
    '#88775544', 3
  );

  // Player dot
  if (player) {
    renderer.fillCircle(mx2 + player.x * scaleX, my2 + player.y * scaleY, 5, '#ffffff');
    text.drawText('You are in: ' + getCurrentZone(), mx2, my2 + mh + 10, 9, ACCENT, 'left');
  }
}

function drawQuestLog(renderer, text) {
  drawPanelR(renderer, text, 50, 30, 500, 440, 'QUEST LOG');
  let qx = 70, qy = 55;
  if (questLog.length === 0) {
    text.drawText('No active quests. Visit the Quest Board in town!', qx, qy + 10, 11, '#666666', 'left');
    return;
  }
  questLog.forEach((q, i) => {
    let by = qy + i * 70;
    renderer.fillRect(qx, by, 460, 62, q.progress >= q.count ? '#1a3a1a' : '#222244');
    renderer.strokePoly([
      { x: qx, y: by }, { x: qx + 460, y: by },
      { x: qx + 460, y: by + 62 }, { x: qx, y: by + 62 }
    ], q.progress >= q.count ? '#44ff44' : '#444466', 1, true);
    let titleCol = q.progress >= q.count ? '#44ff44' : ACCENT;
    text.drawText(q.name + (q.progress >= q.count ? ' [COMPLETE]' : ''), qx + 8, by + 6, 11, titleCol, 'left');
    text.drawText(q.desc, qx + 8, by + 20, 9, '#aaaaaa', 'left');
    text.drawText('Progress: ' + q.progress + '/' + q.count + '  |  Reward: ' + q.xpReward + 'XP, ' + q.goldReward + 'G', qx + 8, by + 34, 9, '#888888', 'left');
    renderer.fillRect(qx + 8, by + 50, 200, 5, '#333333');
    renderer.fillRect(qx + 8, by + 50, 200 * Math.min(1, q.progress / q.count), 5, '#44cc44');
  });
}

function drawShop(renderer, text) {
  drawPanelR(renderer, text, 50, 30, 500, 440, 'MERCHANT - Gold: ' + player.gold);
  let sx = 70, sy = 55;
  text.drawText('-- Buy --', sx, sy - 2, 10, ACCENT, 'left');
  sy += 6;

  SHOP_ITEMS.forEach((id, i) => {
    let item = ITEM_TEMPLATES[id];
    let by = sy + i * 40;
    if (by > 400) return;
    let hover = mouse.x >= sx && mouse.x < sx + 460 && mouse.y >= by && mouse.y < by + 35;
    renderer.fillRect(sx, by, 460, 35, hover ? '#333355' : '#222244');
    renderer.strokePoly([
      { x: sx, y: by }, { x: sx + 460, y: by },
      { x: sx + 460, y: by + 35 }, { x: sx, y: by + 35 }
    ], hover ? ACCENT : '#444466', 1, true);
    text.drawText(item.name, sx + 8, by + 4, 10, getRarityColor(item.rarity), 'left');
    let desc = [];
    if (item.str) desc.push('+' + item.str + ' STR');
    if (item.def) desc.push('+' + item.def + ' DEF');
    if (item.int) desc.push('+' + item.int + ' INT');
    if (item.healHp) desc.push('+' + item.healHp + ' HP');
    if (item.healMp) desc.push('+' + item.healMp + ' MP');
    text.drawText(desc.join(', '), sx + 8, by + 17, 9, '#888888', 'left');
    let priceCol = player.gold >= item.value ? '#ffdd44' : '#ff4444';
    text.drawText(item.value + 'g', sx + 450, by + 8, 9, priceCol, 'right');
  });
}

function drawQuestBoard(renderer, text) {
  drawPanelR(renderer, text, 50, 30, 500, 440, 'QUEST BOARD');
  let qx = 70, qy = 55;
  if (availableQuests.length === 0) {
    text.drawText('No quests available right now.', qx, qy + 10, 11, '#666666', 'left');
    return;
  }
  availableQuests.forEach((q, i) => {
    let by = qy + i * 60;
    if (by > 420) return;
    let hover = mouse.x >= qx && mouse.x < qx + 460 && mouse.y >= by && mouse.y < by + 52;
    renderer.fillRect(qx, by, 460, 52, hover ? '#333355' : '#222244');
    renderer.strokePoly([
      { x: qx, y: by }, { x: qx + 460, y: by },
      { x: qx + 460, y: by + 52 }, { x: qx, y: by + 52 }
    ], hover ? '#44ff44' : '#444466', 1, true);
    text.drawText(q.name, qx + 8, by + 6, 11, ACCENT, 'left');
    text.drawText(q.desc, qx + 8, by + 20, 9, '#aaaaaa', 'left');
    text.drawText('Reward: ' + q.xpReward + 'XP, ' + q.goldReward + 'G', qx + 8, by + 34, 9, '#888888', 'left');
    if (hover) text.drawText('[CLICK TO ACCEPT]', qx + 450, by + 6, 9, '#44ff44', 'right');
  });
}

// ── createGame export ──
export function createGame() {
  const game = new Game('game');

  // ── Canvas mouse tracking (for UI hit-testing) ──
  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('mousemove', e => {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
  });
  canvasEl.addEventListener('click', e => {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;
    pendingClicks.push({ x: mouse.x, y: mouse.y, worldX: mouse.worldX, worldY: mouse.worldY });
  });

  // ── Overlay buttons (class selection + respawn) ──
  // We wire them up at startup via DOM
  const overlayBtns = document.getElementById('overlayBtns');
  if (overlayBtns) {
    // Class buttons are in the HTML; we add respawn dynamically
    overlayBtns.addEventListener('click', e => {
      let btn = e.target.closest('.btn');
      if (!btn) return;
      let action = btn.dataset.action;
      if (action === 'respawn') { respawnPlayer(); game.setState('playing'); }
    });
  }

  // Expose startGame for the class-selection buttons
  window.startGame = (cls) => {
    startGame(cls);
    game.setState('playing');
  };

  game.onInit = () => {
    gameState = 'menu';
    score = 0;
    game.showOverlay('BROWSER MMO RPG', 'Choose your class');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    tick++;

    // Process pending clicks for UI panels
    while (pendingClicks.length > 0) {
      let click = pendingClicks.shift();
      handleClick(click, game);
    }

    // Handle key presses for state transitions
    if (game.input.wasPressed('i') || game.input.wasPressed('I')) {
      if (gameState === 'playing') gameState = 'inventory';
      else if (gameState === 'inventory') gameState = 'playing';
    }
    if (game.input.wasPressed('m') || game.input.wasPressed('M')) {
      if (gameState === 'playing') gameState = 'map';
      else if (gameState === 'map') gameState = 'playing';
    }
    if (game.input.wasPressed('q') || game.input.wasPressed('Q')) {
      if (gameState === 'playing') gameState = 'questlog';
      else if (gameState === 'questlog') gameState = 'playing';
    }
    if (game.input.wasPressed('Escape')) {
      if (['inventory','map','questlog','shop','questboard'].includes(gameState)) gameState = 'playing';
    }
    if (game.input.wasPressed('e') || game.input.wasPressed('E')) {
      if (gameState === 'playing') interactNearby();
      else if (gameState === 'shop' || gameState === 'questboard') gameState = 'playing';
    }
    if (game.input.wasPressed('1')) { if (gameState === 'playing') useAbility(0); }
    if (game.input.wasPressed('2')) { if (gameState === 'playing') useAbility(1); }
    if (game.input.wasPressed('3')) { if (gameState === 'playing') useAbility(2); }
    if (game.input.wasPressed('4')) { if (gameState === 'playing') useAbility(3); }

    if (gameState !== 'playing' || !player) return;

    // ── Player movement ──
    let mx = 0, my = 0;
    if (game.input.isDown('w') || game.input.isDown('W') || game.input.isDown('ArrowUp')) my = -1;
    if (game.input.isDown('s') || game.input.isDown('S') || game.input.isDown('ArrowDown')) my = 1;
    if (game.input.isDown('a') || game.input.isDown('A') || game.input.isDown('ArrowLeft')) mx = -1;
    if (game.input.isDown('d') || game.input.isDown('D') || game.input.isDown('ArrowRight')) mx = 1;

    if (mx || my) {
      let len = Math.sqrt(mx * mx + my * my);
      mx /= len; my /= len;
      player.facing = { x: mx, y: my };
      let nx = player.x + mx * player.spd;
      let ny = player.y + my * player.spd;
      let tx = Math.floor(nx / TILE), ty2 = Math.floor(ny / TILE);
      if (!isSolid(tx, ty2)) { player.x = nx; player.y = ny; }
      else {
        tx = Math.floor((player.x + mx * player.spd) / TILE);
        let ty3 = Math.floor(player.y / TILE);
        if (!isSolid(tx, ty3)) player.x += mx * player.spd;
        else {
          let tx2 = Math.floor(player.x / TILE);
          ty3 = Math.floor((player.y + my * player.spd) / TILE);
          if (!isSolid(tx2, ty3)) player.y += my * player.spd;
        }
      }
    }

    // Cooldowns
    player.abilities.forEach(a => { if (a.cdTimer > 0) a.cdTimer = Math.max(0, a.cdTimer - 16); });
    player.buffs = player.buffs.filter(b => { b.timer -= 16; return b.timer > 0; });
    player.mp = Math.min(player.mp + 0.02, player.maxMp);
    if (player.invuln > 0) player.invuln -= 16;

    // Camera
    camera.x = Math.max(0, Math.min(player.x - W / 2, WORLD_W * TILE - W));
    camera.y = Math.max(0, Math.min(player.y - H / 2, WORLD_H * TILE - H));

    // ── Enemies ──
    enemies.forEach(e => {
      if (!e.alive) {
        e.respawnTimer -= 1;
        if (e.respawnTimer <= 0) {
          e.alive = true;
          e.curHp = e.hp + Math.floor(e.hp * 0.05 * (player.level - 1));
          e.maxHp = e.curHp;
          e.x = e.homeX; e.y = e.homeY;
          e.state = 'idle'; e.target = null;
        }
        return;
      }
      if (e.stunTimer > 0) { e.stunTimer -= 16; return; }
      let spdMult = e.slowTimer > 0 ? 0.3 : 1;
      if (e.slowTimer > 0) e.slowTimer -= 16;
      e.attackCd = Math.max(0, e.attackCd - 16);

      let dx = player.x - e.x, dy = player.y - e.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let aggroRange = e.boss ? 200 : 150;
      let leashRange = 400;

      if (e.state === 'idle') {
        e.stateTimer -= 1;
        if (e.stateTimer <= 0) {
          e.stateTimer = 60 + Math.random() * 120;
          let angle = Math.random() * Math.PI * 2;
          e.wanderX = e.x + Math.cos(angle) * 40;
          e.wanderY = e.y + Math.sin(angle) * 40;
        }
        if (e.wanderX !== undefined) {
          let wdx = e.wanderX - e.x, wdy = e.wanderY - e.y;
          let wdist = Math.sqrt(wdx * wdx + wdy * wdy);
          if (wdist > 2) { e.x += (wdx / wdist) * e.spd * 0.3 * spdMult; e.y += (wdy / wdist) * e.spd * 0.3 * spdMult; }
        }
        if (dist < aggroRange) { e.state = 'aggro'; e.target = player; }
      } else if (e.state === 'aggro') {
        let homeDx = e.homeX - e.x, homeDy = e.homeY - e.y;
        let homeDist = Math.sqrt(homeDx * homeDx + homeDy * homeDy);
        if (homeDist > leashRange) { e.state = 'return'; e.target = null; }
        else if (dist < 40) {
          if (e.attackCd <= 0) {
            let dmg = calcDamage(e.str, player.def, 1.0);
            if (player.invuln <= 0) {
              player.hp -= dmg;
              player.invuln = 200;
              addFloatingText(player.x, player.y - 20, '-' + dmg, '#ff6666');
              spawnHitParticles(player.x, player.y, '#ff4444');
            }
            e.attackCd = e.boss ? 1200 : 800;
          }
        } else {
          e.x += (dx / dist) * e.spd * spdMult;
          e.y += (dy / dist) * e.spd * spdMult;
        }
      } else if (e.state === 'return') {
        let hdx = e.homeX - e.x, hdy = e.homeY - e.y;
        let hd = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hd < 10) { e.state = 'idle'; e.curHp = e.maxHp; }
        else { e.x += (hdx / hd) * e.spd; e.y += (hdy / hd) * e.spd; }
      }
    });

    // ── Party AI ──
    for (let pi = party.length - 1; pi >= 0; pi--) {
      let p = party[pi];
      if (p.isSummon) { p.timer -= 16; if (p.timer <= 0) { party.splice(pi, 1); continue; } }
      p.attackCd = Math.max(0, p.attackCd - 16);
      let nearestE = null, nearestD = 150;
      enemies.forEach(e => {
        if (!e.alive) return;
        let d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
        if (d < nearestD) { nearestD = d; nearestE = e; }
      });
      if (nearestE && nearestD < 120) {
        p.state = 'attack'; p.target = nearestE;
        let dx = nearestE.x - p.x, dy = nearestE.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 35) { p.x += (dx / dist) * p.spd; p.y += (dy / dist) * p.spd; }
        else if (p.attackCd <= 0) {
          let dmg = calcDamage(p.str, nearestE.def, 1.0);
          damageEnemy(nearestE, dmg);
          p.attackCd = 800;
          spawnHitParticles(nearestE.x, nearestE.y, p.color);
        }
      } else {
        p.state = 'follow';
        let dx = player.x - p.x + (pi + 1) * 20, dy = player.y - p.y + 20;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 40) { p.x += (dx / dist) * p.spd; p.y += (dy / dist) * p.spd; }
      }
      p.hp = Math.min(p.hp + 0.01, p.maxHp);
      p.mp = Math.min(p.mp + 0.02, p.maxMp);
    }

    // ── Projectiles ──
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let p = projectiles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) { projectiles.splice(i, 1); continue; }
      let ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
      if (isSolid(ptx, pty)) { projectiles.splice(i, 1); continue; }
      if (p.owner === 'player') {
        let hit = false;
        for (let e of enemies) {
          if (!e.alive) continue;
          let dx = e.x - p.x, dy = e.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < e.size + p.size) {
            let dmg = Math.max(1, p.dmg - Math.floor(e.def * 0.3));
            damageEnemy(e, dmg);
            spawnHitParticles(e.x, e.y, p.color);
            if (p.chain > 0) {
              let nearest = null, nd = 120;
              enemies.forEach(e2 => {
                if (!e2.alive || e2 === e) return;
                let d = Math.sqrt((e2.x - e.x) ** 2 + (e2.y - e.y) ** 2);
                if (d < nd) { nd = d; nearest = e2; }
              });
              if (nearest) {
                let angle = Math.atan2(nearest.y - e.y, nearest.x - e.x);
                projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, dmg: Math.floor(p.dmg * 0.7), owner: 'player', life: 30, color: '#88aaff', size: 3, chain: p.chain - 1 });
              }
            }
            hit = true;
            break;
          }
        }
        if (hit) projectiles.splice(i, 1);
      }
    }

    // ── Traps ──
    for (let i = traps.length - 1; i >= 0; i--) {
      let t = traps[i]; t.life--;
      if (t.life <= 0) { traps.splice(i, 1); continue; }
      let triggered = false;
      enemies.forEach(e => {
        if (!e.alive || triggered) return;
        let dx = e.x - t.x, dy = e.y - t.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          damageEnemy(e, t.dmg);
          e.slowTimer = 2000;
          spawnHitParticles(e.x, e.y, '#ffaa44');
          triggered = true;
        }
      });
      if (triggered) traps.splice(i, 1);
    }

    // ── Drops (auto-pickup) ──
    for (let i = drops.length - 1; i >= 0; i--) {
      drops[i].life--;
      if (drops[i].life <= 0) { drops.splice(i, 1); continue; }
      let d = drops[i];
      let dx = d.x - player.x, dy = d.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (addItem(d.item.templateId)) {
          questLog.forEach(q => {
            if (q.type === 'collect' && q.target === d.item.templateId) q.progress = Math.min(q.progress + 1, q.count);
          });
          drops.splice(i, 1);
        }
      }
    }

    // ── Particles ──
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i]; p.life--;
      if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy; }
      if (p.life <= 0) particles.splice(i, 1);
    }

    // ── Floating texts ──
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      floatingTexts[i].y -= 0.5;
      floatingTexts[i].life--;
      if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    checkQuestCompletion();

    // ── DOM HUD ──
    document.getElementById('levelDisp').textContent = player.level;
    document.getElementById('xpDisp').textContent = player.xp + '/' + player.xpToLevel;
    document.getElementById('goldDisp').textContent = player.gold;
    document.getElementById('score').textContent = score;

    // ── Death ──
    if (player.hp <= 0) {
      gameState = 'dead';
      game.setState('over');
      // Rebuild overlay for respawn
      const overlayTitle = document.getElementById('overlayTitle');
      const overlayText  = document.getElementById('overlayText');
      const overlayBtns2 = document.getElementById('overlayBtns');
      if (overlayTitle) overlayTitle.textContent = 'YOU DIED';
      if (overlayText)  overlayText.textContent  = 'Level ' + player.level + ' | Score: ' + score;
      if (overlayBtns2) {
        overlayBtns2.innerHTML = '<button class="btn" data-action="respawn">Respawn in Town</button>';
      }
    }
  };

  game.onDraw = (renderer, text) => {
    renderer.begin('#111122');
    drawGame(renderer, text, tick);
  };

  game.start();
  return game;
}

// ── Click handler (for UI panels) ──
function handleClick(click, game) {
  if (gameState === 'inventory') {
    // Inventory item clicks
    let ix = 60, iy = 55;
    iy += 16 + 3 * 14 + 10 + 14 + 14 + 20 + 6; // match drawInventory layout offset
    player.inventory.forEach((item, i) => {
      let row = Math.floor(i / 4), col2 = i % 4;
      let bx = ix + col2 * 120, by = iy + row * 50;
      if (click.x >= bx && click.x < bx + 115 && click.y >= by && click.y < by + 45) {
        useItem(i);
      }
    });
    return;
  }
  if (gameState === 'shop') {
    let sx = 70, sy = 55 + 6;
    SHOP_ITEMS.forEach((id, i) => {
      let item = ITEM_TEMPLATES[id];
      let by = sy + i * 40;
      if (by > 400) return;
      if (click.x >= sx && click.x < sx + 460 && click.y >= by && click.y < by + 35) {
        if (player.gold >= item.value) {
          player.gold -= item.value;
          addItem(id);
          addFloatingText(player.x, player.y - 20, 'Bought ' + item.name, '#44ff44');
        } else {
          addFloatingText(player.x, player.y - 20, 'Not enough gold!', '#ff4444');
        }
      }
    });
    return;
  }
  if (gameState === 'questboard') {
    let qx = 70, qy = 55;
    availableQuests.forEach((q, i) => {
      let by = qy + i * 60;
      if (by > 420) return;
      if (click.x >= qx && click.x < qx + 460 && click.y >= by && click.y < by + 52) {
        acceptQuest(i);
      }
    });
    return;
  }
  if (gameState === 'playing') {
    // Click = basic attack toward mouse world position
    mouse.worldX = click.worldX;
    mouse.worldY = click.worldY;
    useAbility(0);
  }
}
