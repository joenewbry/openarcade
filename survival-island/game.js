// survival-island/game.js — Survival Island for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ---------- MAP CONSTANTS ----------
const MAP_W = 80, MAP_H = 60;
const TILE = 16;
const TILE_WATER = 0, TILE_SAND = 1, TILE_GRASS = 2, TILE_FOREST = 3;

const RESOURCE_TYPES = {
  TREE:      { symbol: 'T', hp: 3, drop: 'wood',  dropAmt: 2, color: '#2a7733' },
  ROCK:      { symbol: 'R', hp: 4, drop: 'stone', dropAmt: 2, color: '#888888' },
  BERRY:     { symbol: 'B', hp: 1, drop: 'food',  dropAmt: 3, color: '#aa33ee' },
  PLANT:     { symbol: 'P', hp: 2, drop: 'fiber', dropAmt: 2, color: '#55bb55' },
  FISH_SPOT: { symbol: 'F', hp: 2, drop: 'food',  dropAmt: 4, color: '#4488dd' },
};

const RECIPES = {
  axe:      { name: 'Axe',     ingredients: { wood: 2, stone: 2 }, desc: 'Gather faster' },
  spear:    { name: 'Spear',   ingredients: { wood: 2, fiber: 2 }, desc: 'Defend & hunt' },
  shelter:  { name: 'Shelter', ingredients: { wood: 5 },           desc: 'Night safety' },
  campfire: { name: 'Campfire',ingredients: { wood: 2, stone: 1 }, desc: 'Warmth & light' },
  raft:     { name: 'Raft',    ingredients: { wood: 10, fiber: 5 },desc: 'ESCAPE the island!' },
};

const TILE_COLORS       = ['#1a3a5c', '#d4c07a', '#3a7a3a', '#2a5a2a'];
const TILE_COLORS_NIGHT = ['#0a1a2e', '#5a5030', '#1a3a1a', '#0e2a0e'];

const AI_NAMES  = ['Morgan', 'Quinn', 'Reese'];
const AI_COLORS = ['#ee8844', '#4488ee', '#ee44ee'];

// ---------- MODULE STATE ----------
let map = [];
let resources = [];
let droppedItems = [];
let shelters = [];
let campfires = [];
let player = null;
let aiCastaways = [];
let dayTime = 0;
let dayCount = 1;
const daySpeed = 0.0003;
let showInventory = false;
let showCraft = false;
let craftSelection = 0;
let notifications = [];
let particles = [];
let gameOverReason = '';
let score = 0;

// Mouse state (set via direct canvas listeners)
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let mouseClicked = false; // single-frame click pulse

// Camera
let camX = 0, camY = 0;

// DOM refs
let dayEl, scoreEl, healthEl, hungerEl;

// ---------- HELPERS ----------
function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const h = hex.slice(1);
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function blendHex(hex1, hex2, t) {
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  const r = Math.round(lerp(r1,r2,t)*255);
  const g = Math.round(lerp(g1,g2,t)*255);
  const b = Math.round(lerp(b1,b2,t)*255);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function alphaHex(hex, a) {
  // returns #rrggbbaa
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2,'0');
  return hex + aa;
}

function getTileColor(tileType) {
  let nightFactor = 0;
  if (dayTime > 0.35 && dayTime < 0.95) {
    if (dayTime < 0.5) nightFactor = (dayTime - 0.35) / 0.15;
    else if (dayTime > 0.85) nightFactor = (0.95 - dayTime) / 0.1;
    else nightFactor = 1;
  }
  return blendHex(TILE_COLORS[tileType], TILE_COLORS_NIGHT[tileType], nightFactor);
}

function nightFactor() {
  if (dayTime > 0.35 && dayTime < 0.95) {
    if (dayTime < 0.5) return (dayTime - 0.35) / 0.15;
    if (dayTime > 0.85) return (0.95 - dayTime) / 0.1;
    return 1;
  }
  return 0;
}

// ---------- MAP GENERATION ----------
function generateIsland() {
  map = []; resources = []; droppedItems = []; shelters = []; campfires = [];
  const cx = MAP_W / 2, cy = MAP_H / 2;
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      let dx = (x - cx) / (MAP_W * 0.42), dy = (y - cy) / (MAP_H * 0.42);
      let dist = Math.sqrt(dx*dx + dy*dy);
      dist += Math.sin(x*0.3)*0.08 + Math.cos(y*0.25)*0.08 + Math.sin((x+y)*0.15)*0.06;
      if (dist > 1.0) map[y][x] = TILE_WATER;
      else if (dist > 0.88) map[y][x] = TILE_SAND;
      else if (dist > 0.4 && Math.random() < 0.35) map[y][x] = TILE_FOREST;
      else map[y][x] = TILE_GRASS;
    }
  }
  for (let y = 2; y < MAP_H-2; y++) {
    for (let x = 2; x < MAP_W-2; x++) {
      if (map[y][x] === TILE_WATER) continue;
      let r = Math.random();
      if (map[y][x] === TILE_FOREST && r < 0.3) {
        resources.push({ x, y, type: 'TREE', hp: RESOURCE_TYPES.TREE.hp, maxHp: RESOURCE_TYPES.TREE.hp });
      } else if (map[y][x] === TILE_GRASS) {
        if (r < 0.03) resources.push({ x, y, type: 'ROCK', hp: RESOURCE_TYPES.ROCK.hp, maxHp: RESOURCE_TYPES.ROCK.hp });
        else if (r < 0.05) resources.push({ x, y, type: 'BERRY', hp: RESOURCE_TYPES.BERRY.hp, maxHp: RESOURCE_TYPES.BERRY.hp });
        else if (r < 0.065) resources.push({ x, y, type: 'PLANT', hp: RESOURCE_TYPES.PLANT.hp, maxHp: RESOURCE_TYPES.PLANT.hp });
      } else if (map[y][x] === TILE_SAND && r < 0.015) {
        resources.push({ x, y, type: 'FISH_SPOT', hp: RESOURCE_TYPES.FISH_SPOT.hp, maxHp: RESOURCE_TYPES.FISH_SPOT.hp });
      }
    }
  }
}

function isLand(x, y) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
  return map[y][x] !== TILE_WATER;
}

// ---------- ENTITY ----------
function createEntity(x, y, name, color, isAI) {
  return {
    x, y, vx: 0, vy: 0, name, color, isAI,
    health: 100, hunger: 100,
    inventory: { wood: 0, stone: 0, food: 0, fiber: 0 },
    tools: { axe: false, spear: false },
    hasShelter: false, hasCampfire: false, hasRaft: false,
    gatherTarget: null, gatherTimer: 0,
    itemsCrafted: 0,
    aiState: 'idle', aiTimer: 0, aiTarget: null,
    personality: Math.random(),
    tradeCooldown: 0,
  };
}

function findSpawnPoint() {
  for (let i = 0; i < 500; i++) {
    let x = 15 + Math.floor(Math.random() * (MAP_W - 30));
    let y = 10 + Math.floor(Math.random() * (MAP_H - 20));
    if (map[y][x] === TILE_GRASS || map[y][x] === TILE_SAND) {
      let ok = true;
      if (player && Math.hypot(player.x - x, player.y - y) < 8) ok = false;
      for (let ai of aiCastaways) {
        if (Math.hypot(ai.x - x, ai.y - y) < 8) ok = false;
      }
      if (ok) return { x, y };
    }
  }
  return { x: MAP_W / 2, y: MAP_H / 2 };
}

function initGame() {
  generateIsland();
  let sp = findSpawnPoint();
  player = createEntity(sp.x, sp.y, 'You', '#44aa88', false);
  aiCastaways = [];
  for (let i = 0; i < 3; i++) {
    let asp = findSpawnPoint();
    let ai = createEntity(asp.x, asp.y, AI_NAMES[i], AI_COLORS[i], true);
    ai.personality = 0.2 + Math.random() * 0.8;
    aiCastaways.push(ai);
  }
  dayTime = 0; dayCount = 1; score = 0;
  showInventory = false; showCraft = false;
  notifications = []; particles = []; gameOverReason = '';
  camX = 0; camY = 0;
}

// ---------- GAME LOGIC ----------
let _gameRef = null; // set after game.start()

function notify(text, color = '#44aa88') {
  notifications.push({ text, timer: 180, color });
  if (notifications.length > 5) notifications.shift();
}

function addParticles(x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x * TILE + 8, y: y * TILE + 8,
      vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3,
      life: 30 + Math.random()*20, color,
    });
  }
}

function worldToTile(sx, sy) {
  return { tx: Math.floor((sx + camX) / TILE), ty: Math.floor((sy + camY) / TILE) };
}

function handleClick() {
  let { tx, ty } = worldToTile(mouseX, mouseY);
  let dist = Math.hypot(tx - player.x, ty - player.y);
  if (dist > 3) return;
  let res = resources.find(r => r.x === tx && r.y === ty);
  if (res) { gatherResource(player, res); return; }
  let target = aiCastaways.find(a => Math.abs(a.x-tx)<1 && Math.abs(a.y-ty)<1 && a.health > 0);
  if (target) attackEntity(player, target);
}

function gatherResource(entity, res) {
  let rt = RESOURCE_TYPES[res.type];
  let dmg = entity.tools.axe ? 2 : 1;
  res.hp -= dmg;
  addParticles(res.x, res.y, rt.color, 3);
  if (res.hp <= 0) {
    entity.inventory[rt.drop] += rt.dropAmt;
    if (!entity.isAI) notify(`+${rt.dropAmt} ${rt.drop}`, '#ffff00');
    addParticles(res.x, res.y, rt.color, 8);
    let idx = resources.indexOf(res);
    resources.splice(idx, 1);
    setTimeout(() => {
      if (_gameRef && _gameRef.state === 'playing') {
        res.hp = res.maxHp;
        resources.push(res);
      }
    }, 15000 + Math.random() * 15000);
  }
}

function attackEntity(attacker, target) {
  let dmg = attacker.tools.spear ? 20 : 8;
  target.health -= dmg;
  addParticles(target.x, target.y, '#ff4444', 6);
  if (!attacker.isAI) notify(`Hit ${target.name} for ${dmg}!`, '#ff4444');
  if (target.health <= 0) {
    for (let key of Object.keys(target.inventory)) {
      if (target.inventory[key] > 0) {
        droppedItems.push({ x: target.x, y: target.y, type: key, amount: target.inventory[key] });
        target.inventory[key] = 0;
      }
    }
    if (!attacker.isAI) { notify(`${target.name} defeated!`, '#ff8844'); score += 10; }
    setTimeout(() => {
      if (_gameRef && _gameRef.state === 'playing' && target.isAI) {
        let sp = findSpawnPoint();
        target.x = sp.x; target.y = sp.y;
        target.health = 100; target.hunger = 100;
        target.tools = { axe: false, spear: false };
        target.hasShelter = false; target.hasCampfire = false; target.hasRaft = false;
        target.inventory = { wood: 0, stone: 0, food: 0, fiber: 0 };
        target.aiState = 'idle';
        if (!attacker.isAI) notify(`${target.name} washed ashore again...`, '#4488ee');
      }
    }, 20000);
  }
}

function interact() {
  for (let i = droppedItems.length-1; i >= 0; i--) {
    let it = droppedItems[i];
    if (Math.hypot(it.x - player.x, it.y - player.y) < 2) {
      player.inventory[it.type] += it.amount;
      notify(`Picked up ${it.amount} ${it.type}`, '#ffff00');
      droppedItems.splice(i, 1);
    }
  }
  if (player.inventory.food > 0 && player.hunger < 80) {
    player.inventory.food--;
    player.hunger = Math.min(100, player.hunger + 30);
    player.health = Math.min(100, player.health + 5);
    notify('Ate food (+30 hunger, +5 health)', '#44aa88');
  }
  for (let ai of aiCastaways) {
    if (ai.health <= 0) continue;
    if (Math.hypot(ai.x - player.x, ai.y - player.y) < 2.5 && ai.personality < 0.5 && ai.tradeCooldown <= 0) {
      let aiHas = Object.keys(ai.inventory).filter(k => ai.inventory[k] >= 2);
      let playerHas = Object.keys(player.inventory).filter(k => player.inventory[k] >= 2);
      if (aiHas.length > 0 && playerHas.length > 0) {
        let give = playerHas[Math.floor(Math.random() * playerHas.length)];
        let get = aiHas.filter(k => k !== give)[0] || aiHas[0];
        if (get && give !== get) {
          player.inventory[give] -= 2; player.inventory[get] += 2;
          ai.inventory[give] += 2;     ai.inventory[get] -= 2;
          notify(`Traded 2 ${give} for 2 ${get} with ${ai.name}`, '#44aaff');
          ai.tradeCooldown = 600;
        }
      }
    }
  }
}

function canCraft(entity, recipeKey) {
  let recipe = RECIPES[recipeKey];
  for (let [item, amt] of Object.entries(recipe.ingredients)) {
    if ((entity.inventory[item] || 0) < amt) return false;
  }
  return true;
}

function craftItem(entity, recipeKey) {
  if (!canCraft(entity, recipeKey)) {
    if (!entity.isAI) notify('Not enough materials!', '#ff4444');
    return false;
  }
  let recipe = RECIPES[recipeKey];
  for (let [item, amt] of Object.entries(recipe.ingredients)) {
    entity.inventory[item] -= amt;
  }
  entity.itemsCrafted++;
  if (!entity.isAI) score += 5;

  switch (recipeKey) {
    case 'axe':
      entity.tools.axe = true;
      if (!entity.isAI) notify('Crafted Axe! Gather faster.', '#ffff00');
      break;
    case 'spear':
      entity.tools.spear = true;
      if (!entity.isAI) notify('Crafted Spear! Better attacks.', '#ffff00');
      break;
    case 'shelter':
      entity.hasShelter = true;
      shelters.push({ x: Math.round(entity.x), y: Math.round(entity.y), owner: entity.name, color: entity.color });
      if (!entity.isAI) notify('Built Shelter! Safe at night.', '#ffff00');
      break;
    case 'campfire':
      entity.hasCampfire = true;
      campfires.push({ x: Math.round(entity.x), y: Math.round(entity.y), owner: entity.name, color: entity.color });
      if (!entity.isAI) notify('Built Campfire! Warmth at night.', '#ffff00');
      break;
    case 'raft':
      entity.hasRaft = true;
      if (!entity.isAI) {
        score += 50;
        gameOverReason = 'You built a raft and escaped the island!';
        endGame(true);
      } else {
        notify(`${entity.name} built a raft and ESCAPED!`, '#ff8844');
        setTimeout(() => {
          if (_gameRef && _gameRef.state === 'playing') {
            let sp = findSpawnPoint();
            entity.x = sp.x; entity.y = sp.y;
            entity.health = 100; entity.hunger = 100;
            entity.tools = { axe: false, spear: false };
            entity.hasShelter = false; entity.hasCampfire = false; entity.hasRaft = false;
            entity.inventory = { wood: 0, stone: 0, food: 0, fiber: 0 };
          }
        }, 20000);
      }
      break;
  }
  addParticles(entity.x, entity.y, '#ffff00', 10);
  return true;
}

function endGame(won) {
  if (!_gameRef) return;
  score += dayCount * 2;
  _gameRef.setState('over');
  _gameRef.showOverlay(
    won ? 'ESCAPED!' : 'PERISHED',
    `${gameOverReason} | Days: ${dayCount} | Score: ${score} | Click to restart`
  );
}

// ---------- AI ----------
function updateAI(ai) {
  if (ai.health <= 0) return;
  ai.tradeCooldown = Math.max(0, ai.tradeCooldown - 1);
  ai.aiTimer -= 1;

  if (ai.hunger < 50 && ai.inventory.food > 0) {
    ai.inventory.food--;
    ai.hunger = Math.min(100, ai.hunger + 30);
    ai.health = Math.min(100, ai.health + 5);
  }

  if (ai.aiTimer > 0) {
    if (ai.aiTarget) {
      let dx = ai.aiTarget.x - ai.x, dy = ai.aiTarget.y - ai.y;
      let dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        let speed = 0.04;
        ai.x += (dx/dist)*speed; ai.y += (dy/dist)*speed;
        if (!isLand(Math.round(ai.x), Math.round(ai.y))) {
          ai.x -= (dx/dist)*speed; ai.y -= (dy/dist)*speed;
          ai.aiTimer = 0;
        }
      } else {
        if (ai.aiState === 'gather') {
          let res = resources.find(r => r.x === ai.aiTarget.x && r.y === ai.aiTarget.y);
          if (res) gatherResource(ai, res);
          ai.aiTimer = 0;
        } else if (ai.aiState === 'steal') {
          for (let i = droppedItems.length-1; i >= 0; i--) {
            let it = droppedItems[i];
            if (Math.hypot(it.x-ai.x, it.y-ai.y) < 2) {
              ai.inventory[it.type] += it.amount;
              droppedItems.splice(i, 1);
            }
          }
          ai.aiTimer = 0;
        }
      }
    }
    return;
  }

  if (canCraft(ai, 'raft')) { craftItem(ai, 'raft'); return; }
  if (!ai.tools.axe && canCraft(ai, 'axe')) { craftItem(ai, 'axe'); return; }
  if (!ai.tools.spear && canCraft(ai, 'spear')) { craftItem(ai, 'spear'); return; }
  let isNight = dayTime > 0.4 && dayTime < 0.9;
  if (isNight && !ai.hasShelter && canCraft(ai, 'shelter')) { craftItem(ai, 'shelter'); return; }
  if (isNight && !ai.hasCampfire && canCraft(ai, 'campfire')) { craftItem(ai, 'campfire'); return; }

  if (ai.personality > 0.7 && ai.tools.spear) {
    let dist = Math.hypot(player.x - ai.x, player.y - ai.y);
    if (dist < 4 && Math.random() < 0.15) {
      ai.aiState = 'attack';
      ai.aiTarget = { x: player.x, y: player.y };
      ai.aiTimer = 120;
      if (dist < 1.5) {
        attackEntity(ai, player);
        notify(`${ai.name} attacks you!`, '#ff4444');
      }
      return;
    }
  }

  if (droppedItems.length > 0) {
    let nearest = null, ndist = Infinity;
    for (let it of droppedItems) {
      let d = Math.hypot(it.x-ai.x, it.y-ai.y);
      if (d < ndist && d < 20) { nearest = it; ndist = d; }
    }
    if (nearest && Math.random() < 0.3) {
      ai.aiState = 'steal'; ai.aiTarget = { x: nearest.x, y: nearest.y }; ai.aiTimer = 200;
      return;
    }
  }

  let needType = null;
  if (ai.hunger < 60) needType = 'BERRY';
  else if (ai.inventory.wood < 10) needType = 'TREE';
  else if (ai.inventory.stone < 4) needType = 'ROCK';
  else if (ai.inventory.fiber < 5) needType = 'PLANT';
  else needType = 'TREE';

  let best = null, bestDist = Infinity;
  for (let r of resources) {
    if (needType && r.type !== needType) continue;
    let d = Math.hypot(r.x-ai.x, r.y-ai.y);
    if (d < bestDist) { best = r; bestDist = d; }
  }
  if (!best) {
    for (let r of resources) {
      let d = Math.hypot(r.x-ai.x, r.y-ai.y);
      if (d < bestDist) { best = r; bestDist = d; }
    }
  }
  if (best) {
    ai.aiState = 'gather'; ai.aiTarget = { x: best.x, y: best.y }; ai.aiTimer = 300;
  } else {
    ai.aiState = 'wander';
    let wx = Math.max(2, Math.min(MAP_W-2, ai.x + (Math.random()-0.5)*10));
    let wy = Math.max(2, Math.min(MAP_H-2, ai.y + (Math.random()-0.5)*10));
    ai.aiTarget = { x: wx, y: wy }; ai.aiTimer = 200;
  }
}

// ---------- CAMERA ----------
function updateCamera() {
  let targetX = player.x * TILE - W / 2;
  let targetY = player.y * TILE - H / 2;
  camX += (targetX - camX) * 0.1;
  camY += (targetY - camY) * 0.1;
  camX = Math.max(0, Math.min(MAP_W * TILE - W, camX));
  camY = Math.max(0, Math.min(MAP_H * TILE - H, camY));
}

// ---------- UPDATE ----------
function update(game) {
  const inp = game.input;

  // Handle craft navigation keys (absorb before movement checks)
  if (showCraft) {
    const recipeKeys = Object.keys(RECIPES);
    if (inp.wasPressed('ArrowUp')) craftSelection = (craftSelection - 1 + recipeKeys.length) % recipeKeys.length;
    if (inp.wasPressed('ArrowDown')) craftSelection = (craftSelection + 1) % recipeKeys.length;
    if (inp.wasPressed('Enter') || inp.wasPressed(' ')) craftItem(player, recipeKeys[craftSelection]);
  }

  // Toggle panels
  if (inp.wasPressed('i')) { showInventory = !showInventory; showCraft = false; }
  if (inp.wasPressed('c')) { showCraft = !showCraft; showInventory = false; craftSelection = 0; }
  if (inp.wasPressed('e')) interact();

  // Player movement
  const speed = 0.08;
  let mx = 0, my = 0;
  if (inp.isDown('w') && !showCraft) my -= speed;
  if (inp.isDown('s') && !showCraft) my += speed;
  if (inp.isDown('a')) mx -= speed;
  if (inp.isDown('d')) mx += speed;
  if (mx && my) { mx *= 0.707; my *= 0.707; }
  let nx = player.x + mx, ny = player.y + my;
  if (isLand(Math.round(nx), Math.round(player.y))) player.x = nx;
  if (isLand(Math.round(player.x), Math.round(ny))) player.y = ny;

  // Click-to-gather
  if (mouseClicked && !showCraft && !showInventory) {
    handleClick();
  }
  // Continuous hold-gather
  if (mouseDown && !showCraft && !showInventory) {
    let { tx, ty } = worldToTile(mouseX, mouseY);
    let dist = Math.hypot(tx - player.x, ty - player.y);
    if (dist <= 3) {
      player.gatherTimer++;
      if (player.gatherTimer >= 15) {
        player.gatherTimer = 0;
        let res = resources.find(r => r.x === tx && r.y === ty);
        if (res) gatherResource(player, res);
      }
    }
  } else {
    player.gatherTimer = 0;
  }
  mouseClicked = false;

  // Day/night cycle
  dayTime += daySpeed;
  if (dayTime >= 1.0) {
    dayTime = 0; dayCount++;
    score += 2;
    notify(`Day ${dayCount} dawns`, '#ffff00');
  }

  // Hunger decay
  player.hunger -= 0.015;
  for (let ai of aiCastaways) { if (ai.health > 0) ai.hunger -= 0.012; }

  // Night damage
  const isNight = dayTime > 0.4 && dayTime < 0.9;
  if (isNight) {
    if (!player.hasShelter && !player.hasCampfire) player.health -= 0.03;
    else if (!player.hasShelter) player.health -= 0.01;
    for (let ai of aiCastaways) {
      if (ai.health <= 0) continue;
      if (!ai.hasShelter && !ai.hasCampfire) ai.health -= 0.03;
      else if (!ai.hasShelter) ai.health -= 0.01;
    }
  }

  // Starvation
  if (player.hunger <= 0) { player.hunger = 0; player.health -= 0.08; }
  for (let ai of aiCastaways) {
    if (ai.hunger <= 0) { ai.hunger = 0; if (ai.health > 0) ai.health -= 0.06; }
  }

  // Player death
  if (player.health <= 0) {
    player.health = 0;
    gameOverReason = player.hunger <= 0 ? 'You starved to death...' : 'You perished in the night...';
    endGame(false);
    return;
  }

  // AI updates
  for (let ai of aiCastaways) updateAI(ai);

  // Particles
  for (let i = particles.length-1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Notifications
  for (let i = notifications.length-1; i >= 0; i--) {
    notifications[i].timer--;
    if (notifications[i].timer <= 0) notifications.splice(i, 1);
  }

  updateCamera();

  // DOM stats
  if (dayEl)    dayEl.textContent    = dayCount;
  if (scoreEl)  scoreEl.textContent  = score;
  if (healthEl) healthEl.textContent = Math.round(player.health);
  if (hungerEl) hungerEl.textContent = Math.round(player.hunger);
}

// ---------- DRAW ----------
function draw(renderer, text, now) {
  // now = performance.now() passed in from onDraw

  const startTX = Math.floor(camX / TILE);
  const startTY = Math.floor(camY / TILE);
  const endTX = Math.min(MAP_W, startTX + Math.ceil(W / TILE) + 2);
  const endTY = Math.min(MAP_H, startTY + Math.ceil(H / TILE) + 2);

  // Draw tiles
  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      if (ty < 0 || ty >= MAP_H || tx < 0 || tx >= MAP_W) continue;
      const sx = tx * TILE - camX, sy = ty * TILE - camY;
      renderer.fillRect(sx, sy, TILE + 1, TILE + 1, getTileColor(map[ty][tx]));
      // Water shimmer
      if (map[ty][tx] === TILE_WATER) {
        const wAlpha = 0.05 + 0.03 * Math.sin(now * 0.002 + tx * 0.5 + ty * 0.3);
        renderer.fillRect(sx, sy, TILE + 1, TILE + 1, alphaHex('#64b4ff', wAlpha));
      }
    }
  }

  // Draw shelters
  for (let s of shelters) {
    const sx = s.x * TILE - camX, sy = s.y * TILE - camY;
    if (sx < -TILE || sx > W + TILE || sy < -TILE || sy > H + TILE) continue;
    renderer.fillRect(sx - 4, sy - 4, TILE + 8, TILE + 8, '#8B4513');
    renderer.fillRect(sx - 2, sy - 2, TILE + 4, TILE + 4, '#A0522D');
    // Roof triangle
    renderer.fillPoly([
      { x: sx - 6,          y: sy + TILE + 4 },
      { x: sx + TILE / 2,   y: sy - 10 },
      { x: sx + TILE + 6,   y: sy + TILE + 4 },
    ], '#654321');
    text.drawText(s.owner, sx + TILE/2, sy + TILE + 6, 7, s.color, 'center');
  }

  // Draw campfires
  for (let c of campfires) {
    const sx = c.x * TILE - camX, sy = c.y * TILE - camY;
    if (sx < -TILE || sx > W + TILE || sy < -TILE || sy > H + TILE) continue;
    const isNight = dayTime > 0.4 && dayTime < 0.9;
    if (isNight) {
      // Glow: approximate with a dim amber circle
      renderer.setGlow('#ff9632', 0.5);
      renderer.fillCircle(sx + 8, sy + 8, 30, '#ff640022');
      renderer.setGlow(null);
    }
    // Flame flicker
    const flameR = 5 + Math.sin(now * 0.01) * 2;
    renderer.setGlow('#ff8800', 0.7);
    renderer.fillCircle(sx + 8, sy + 8, flameR, '#ff8800');
    renderer.fillCircle(sx + 8, sy + 6, 3, '#ffff00');
    renderer.setGlow(null);
  }

  // Draw resources
  for (let r of resources) {
    const sx = r.x * TILE - camX, sy = r.y * TILE - camY;
    if (sx < -TILE*2 || sx > W + TILE || sy < -TILE*2 || sy > H + TILE) continue;
    const rt = RESOURCE_TYPES[r.type];
    renderer.setGlow(rt.color, 0.3);
    renderer.fillCircle(sx + 8, sy + 8, 6, rt.color);
    renderer.setGlow(null);
    // Symbol
    text.drawText(rt.symbol, sx + 8, sy + 4, 10, '#ffffff', 'center');
    // Health bar for damaged resources
    if (r.hp < r.maxHp) {
      renderer.fillRect(sx, sy - 3, TILE, 2, '#440000');
      renderer.fillRect(sx, sy - 3, TILE * (r.hp / r.maxHp), 2, '#44aa88');
    }
  }

  // Draw dropped items
  for (let it of droppedItems) {
    const sx = it.x * TILE - camX, sy = it.y * TILE - camY;
    if (sx < -TILE || sx > W + TILE || sy < -TILE || sy > H + TILE) continue;
    const a = 0.6 + 0.3 * Math.sin(now * 0.005);
    renderer.fillCircle(sx + 8, sy + 8, 4, alphaHex('#ffff00', a));
    text.drawText(`${it.amount}${it.type[0]}`, sx, sy - 2, 7, '#ffff00');
  }

  // Draw AI castaways
  for (let ai of aiCastaways) {
    if (ai.health <= 0) continue;
    const sx = ai.x * TILE - camX, sy = ai.y * TILE - camY;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    // Body
    renderer.fillCircle(sx + 8, sy + 8, 7, ai.color);
    // Eyes
    renderer.fillCircle(sx + 6, sy + 6, 1.5, '#ffffff');
    renderer.fillCircle(sx + 10, sy + 6, 1.5, '#ffffff');
    // Spear
    if (ai.tools.spear) {
      renderer.drawLine(sx + 14, sy - 2, sx + 14, sy + 14, '#aaaaaa', 1.5);
      renderer.fillPoly([
        { x: sx + 12, y: sy - 2 },
        { x: sx + 14, y: sy - 5 },
        { x: sx + 16, y: sy - 2 },
      ], '#888888');
    }
    // Axe
    if (ai.tools.axe) {
      renderer.fillRect(sx - 4, sy + 2, 2, 10, '#aaaaaa');
      renderer.fillRect(sx - 7, sy + 1, 5, 4,  '#888888');
    }
    // Name
    text.drawText(ai.name, sx + 8, sy - 8, 8, ai.color, 'center');
    // Health bar
    renderer.fillRect(sx - 2, sy - 3, 20, 3, '#440000');
    const hpColor = ai.health > 50 ? '#44aa88' : ai.health > 25 ? '#eeaa44' : '#ff4444';
    renderer.fillRect(sx - 2, sy - 3, 20 * (ai.health / 100), 3, hpColor);
    // Personality indicator
    const pLabel = ai.personality > 0.6 ? 'X' : '+';
    const pColor  = ai.personality > 0.6 ? '#ff4444' : '#44aaff';
    text.drawText(pLabel, sx + 8, sy + 18, 8, pColor, 'center');
  }

  // Draw player
  {
    const sx = player.x * TILE - camX, sy = player.y * TILE - camY;
    renderer.setGlow('#44aa88', 0.6);
    renderer.fillCircle(sx + 8, sy + 8, 8, '#44aa88');
    renderer.setGlow(null);
    // Eyes
    renderer.fillCircle(sx + 6, sy + 6, 2, '#ffffff');
    renderer.fillCircle(sx + 10, sy + 6, 2, '#ffffff');
    // Smile — 3-point arc approximation
    renderer.strokePoly([
      { x: sx + 5,  y: sy + 10 },
      { x: sx + 8,  y: sy + 12 },
      { x: sx + 11, y: sy + 10 },
    ], '#ffffff', 1, false);
    // Spear
    if (player.tools.spear) {
      renderer.drawLine(sx + 16, sy - 4, sx + 16, sy + 16, '#dddddd', 2);
      renderer.fillPoly([
        { x: sx + 14, y: sy - 4 },
        { x: sx + 16, y: sy - 8 },
        { x: sx + 18, y: sy - 4 },
      ], '#aaaaaa');
    }
    // Axe
    if (player.tools.axe) {
      renderer.fillRect(sx - 6, sy + 2, 3, 12, '#bbaa88');
      renderer.fillRect(sx - 9, sy + 1, 6, 5, '#aaaaaa');
    }
    text.drawText('You', sx + 8, sy - 10, 8, '#44aa88', 'center');
  }

  // Draw particles
  for (let p of particles) {
    const sx = p.x - camX, sy = p.y - camY;
    const a = p.life / 50;
    renderer.fillRect(sx - 1, sy - 1, 3, 3, alphaHex(p.color, a));
  }

  // Night overlay — dark blue rect with per-entity light holes approximated by a lighter fill
  const nf = nightFactor();
  if (nf > 0) {
    const nightAlpha = nf * 0.55;
    renderer.fillRect(0, 0, W, H, alphaHex('#00001e', nightAlpha));

    // Player light: paint a bright circle over the overlay at reduced opacity (net lightening)
    if (player.hasCampfire || player.tools.axe) {
      const px = player.x * TILE - camX + 8;
      const py = player.y * TILE - camY + 8;
      const radius = player.hasCampfire ? 60 : 30;
      // Draw progressively lighter concentric circles to simulate radial gradient cut
      for (let step = 0; step < 5; step++) {
        const frac = step / 5;
        const r = radius * (1 - frac * 0.8);
        const cutAlpha = nightAlpha * (1 - frac) * 0.5;
        renderer.fillCircle(px, py, r, alphaHex('#00001e', -cutAlpha + nightAlpha));
      }
    }
  }

  // ---------- HUD ----------

  // Minimap
  const mmX = W - 110, mmY = 10, mmW = 100, mmH = 75;
  renderer.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, '#00000077');
  renderer.strokePoly([
    { x: mmX - 2, y: mmY - 2 },
    { x: mmX + mmW + 2, y: mmY - 2 },
    { x: mmX + mmW + 2, y: mmY + mmH + 2 },
    { x: mmX - 2, y: mmY + mmH + 2 },
  ], '#44aa88', 1);

  for (let my = 0; my < MAP_H; my += 2) {
    for (let mx = 0; mx < MAP_W; mx += 2) {
      const px = mmX + (mx / MAP_W) * mmW;
      const py = mmY + (my / MAP_H) * mmH;
      renderer.fillRect(px, py, 2, 2, TILE_COLORS[map[my][mx]]);
    }
  }
  // Player dot
  renderer.fillRect(mmX + (player.x / MAP_W) * mmW - 1, mmY + (player.y / MAP_H) * mmH - 1, 3, 3, '#44aa88');
  // AI dots
  for (let ai of aiCastaways) {
    if (ai.health <= 0) continue;
    renderer.fillRect(mmX + (ai.x / MAP_W) * mmW - 1, mmY + (ai.y / MAP_H) * mmH - 1, 3, 3, ai.color);
  }

  // Day/night bar
  renderer.fillRect(mmX, mmY + mmH + 6, mmW, 12, '#00000099');
  const sunX = mmX + dayTime * mmW;
  const isNight = dayTime > 0.4 && dayTime < 0.9;
  renderer.setGlow(isNight ? '#8888aa' : '#ffff00', 0.5);
  renderer.fillCircle(sunX, mmY + mmH + 12, 4, isNight ? '#8888aa' : '#ffff00');
  renderer.setGlow(null);
  text.drawText(isNight ? 'NIGHT' : 'DAY', mmX + 2, mmY + mmH + 6, 8, '#aaaaaa');

  // HP/Food bars
  const barX = 10, barY = 10, barW = 80, barH = 10;
  renderer.fillRect(barX - 2, barY - 2, barW + 44, 42, '#000000bb');
  // HP
  text.drawText('HP', barX, barY, 8, '#ff4444');
  renderer.fillRect(barX + 16, barY, barW, barH, '#440000');
  const hpColor = player.health > 50 ? '#44aa88' : player.health > 25 ? '#eeaa44' : '#ff4444';
  renderer.fillRect(barX + 16, barY, barW * (player.health / 100), barH, hpColor);
  text.drawText(`${Math.round(player.health)}`, barX + barW + 20, barY, 8, '#ffffff');
  // Food
  text.drawText('FD', barX, barY + 14, 8, '#ee8844');
  renderer.fillRect(barX + 16, barY + 14, barW, barH, '#442200');
  const fdColor = player.hunger > 50 ? '#eeaa44' : player.hunger > 25 ? '#ee8844' : '#ff4444';
  renderer.fillRect(barX + 16, barY + 14, barW * (player.hunger / 100), barH, fdColor);
  text.drawText(`${Math.round(player.hunger)}`, barX + barW + 20, barY + 14, 8, '#ffffff');
  // Tools line
  let toolStr = 'none';
  const toolParts = [];
  if (player.tools.axe)    toolParts.push('Axe');
  if (player.tools.spear)  toolParts.push('Spear');
  if (player.hasShelter)   toolParts.push('Shlt');
  if (player.hasCampfire)  toolParts.push('Fire');
  if (toolParts.length) toolStr = toolParts.join(' ');
  text.drawText('Tools:', barX, barY + 30, 8, '#aaaaaa');
  text.drawText(toolStr, barX + 40, barY + 30, 8, '#44aa88');

  // Quick inventory bar (bottom)
  const invBarY = H - 30;
  renderer.fillRect(W/2 - 140, invBarY - 4, 280, 28, '#000000bb');
  const items = ['wood', 'stone', 'food', 'fiber'];
  const icons  = ['W', 'S', 'F', 'P'];
  for (let i = 0; i < 4; i++) {
    const ix = W/2 - 120 + i * 65;
    text.drawText(`${icons[i]}:`, ix, invBarY + 4, 10, '#aaaaaa');
    text.drawText(`${player.inventory[items[i]]}`, ix + 20, invBarY + 4, 10, '#44aa88');
  }

  // AI status panel
  const aiPanelY = 56;
  renderer.fillRect(8, aiPanelY, 130, aiCastaways.length * 24 + 6, '#00000099');
  for (let i = 0; i < aiCastaways.length; i++) {
    const ai = aiCastaways[i];
    const ay = aiPanelY + 4 + i * 24;
    text.drawText(ai.name, 12, ay, 8, ai.color);
    renderer.fillRect(55, ay + 2, 40, 5, '#440000');
    const ahpColor = ai.health > 50 ? '#44aa88' : '#ff4444';
    renderer.fillRect(55, ay + 2, 40 * Math.max(0, ai.health/100), 5, ahpColor);
    const status = ai.health <= 0 ? 'DEAD' : ai.aiState;
    text.drawText(status, 100, ay, 8, '#888888');
    const pLabel = ai.personality > 0.6 ? 'hostile' : 'friend';
    const pColor  = ai.personality > 0.6 ? '#ff4444' : '#44aaff';
    text.drawText(pLabel, 55, ay + 12, 7, pColor);
    const total = ai.inventory.wood + ai.inventory.stone + ai.inventory.food + ai.inventory.fiber;
    text.drawText(`${total}i`, 100, ay + 12, 7, '#666666');
  }

  // Inventory panel
  if (showInventory) {
    renderer.fillRect(W/2 - 120, 60, 240, 200, '#0a0a1eee');
    renderer.strokePoly([
      { x: W/2-120, y: 60 }, { x: W/2+120, y: 60 },
      { x: W/2+120, y: 260 },{ x: W/2-120, y: 260 },
    ], '#44aa88', 2);
    text.drawText('INVENTORY [I]', W/2, 82, 14, '#44aa88', 'center');
    let iy = 100;
    for (let i = 0; i < 4; i++) {
      text.drawText(`${items[i].padEnd(6)}:`, W/2 - 90, iy, 12, '#aaaaaa');
      text.drawText(`${player.inventory[items[i]]}`, W/2 + 30, iy, 12, '#44aa88');
      iy += 22;
    }
    iy += 10;
    text.drawText('Tools:', W/2 - 90, iy, 12, '#aaaaaa');
    iy += 20;
    text.drawText(`Axe:     ${player.tools.axe    ? 'YES' : 'NO'}`, W/2 - 90, iy, 11, player.tools.axe    ? '#44aa88' : '#444444'); iy += 18;
    text.drawText(`Spear:   ${player.tools.spear  ? 'YES' : 'NO'}`, W/2 - 90, iy, 11, player.tools.spear  ? '#44aa88' : '#444444'); iy += 18;
    text.drawText(`Shelter: ${player.hasShelter   ? 'YES' : 'NO'}`, W/2 - 90, iy, 11, player.hasShelter   ? '#44aa88' : '#444444'); iy += 18;
    text.drawText(`Campfire:${player.hasCampfire  ? 'YES' : 'NO'}`, W/2 - 90, iy, 11, player.hasCampfire  ? '#44aa88' : '#444444');
  }

  // Craft panel
  if (showCraft) {
    const panelW = 280, panelH = 240;
    const px = W/2 - panelW/2, py = 50;
    renderer.fillRect(px, py, panelW, panelH, '#0a0a1eeb');
    renderer.strokePoly([
      { x: px,         y: py },
      { x: px+panelW,  y: py },
      { x: px+panelW,  y: py+panelH },
      { x: px,         y: py+panelH },
    ], '#44aa88', 2);
    text.drawText('CRAFTING [C]  Up/Dn Enter', px + 20, py + 8, 13, '#44aa88');
    const recipeKeys = Object.keys(RECIPES);
    for (let i = 0; i < recipeKeys.length; i++) {
      const ry = py + 40 + i * 38;
      const rk = recipeKeys[i];
      const recipe = RECIPES[rk];
      const can = canCraft(player, rk);
      if (i === craftSelection) {
        renderer.fillRect(px + 4, ry - 10, panelW - 8, 36, '#44aa8826');
        renderer.strokePoly([
          { x: px+4,         y: ry-10 },
          { x: px+panelW-4,  y: ry-10 },
          { x: px+panelW-4,  y: ry+26 },
          { x: px+4,         y: ry+26 },
        ], '#44aa88', 1);
      }
      text.drawText(recipe.name, px + 14, ry, 11, can ? '#44aa88' : '#555555');
      const ingStr = Object.entries(recipe.ingredients).map(([k,v]) => `${k}:${v}`).join(' ');
      text.drawText(ingStr, px + 14, ry + 14, 9, can ? '#aaaaaa' : '#444444');
      text.drawText(recipe.desc, px + 140, ry, 9, can ? '#66aa66' : '#444444');
      if (can) text.drawText('OK', px + panelW - 22, ry, 11, '#ffff00');
    }
  }

  // Notifications
  for (let i = 0; i < notifications.length; i++) {
    const n = notifications[i];
    const a = Math.min(1, n.timer / 40);
    text.drawText(n.text, W/2, H - 50 - i*14, 10, alphaHex(n.color, a), 'center');
  }
}

// ---------- EXPORT ----------
export function createGame() {
  const game = new Game('game');
  _gameRef = game;

  // Grab DOM refs
  dayEl    = document.getElementById('dayNum');
  scoreEl  = document.getElementById('score');
  healthEl = document.getElementById('health');
  hungerEl = document.getElementById('hunger');

  // Mouse events on canvas directly (do not rely on engine input for mouse position/click)
  const canvas = game.canvas;
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', e => {
    mouseDown = true;
    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
    } else if (game.state === 'over') {
      initGame();
      game.setState('playing');
    } else if (game.state === 'playing') {
      mouseClicked = true;
    }
  });
  canvas.addEventListener('mouseup', () => { mouseDown = false; });

  game.onInit = () => {
    game.showOverlay('SURVIVAL ISLAND', 'Gather, Craft, Survive, Escape! | Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    if (game.state !== 'playing') return;
    update(game);
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') return;
    if (!player) return;
    draw(renderer, text, performance.now());
  };

  game.start();
  return game;
}
