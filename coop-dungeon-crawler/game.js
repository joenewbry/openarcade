// coop-dungeon-crawler/game.js — Co-op Dungeon Crawler ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const TILE = 24;
const COLS = Math.floor(W / TILE); // 25
const ROWS = Math.floor(H / TILE); // 20
const HUD_H = 20;
const MAP_H = ROWS * TILE; // 480

// ── DOM refs ──
const scoreEl = document.getElementById('scoreVal');
const floorEl = document.getElementById('floorVal');
const roomEl = document.getElementById('roomVal');
const lootEl = document.getElementById('lootVal');

// ── State ──
let gameState, score, totalLoot, currentFloor;
const MAX_FLOORS = 3;
let dungeon, rooms, currentRoom, roomsCleared;
let monsters, lootItems, projectiles, particles, floatingTexts;
let player, ally, camera;

// ── Class definitions ──
const CLASS_DEFS = {
  warrior: {
    name: 'Warrior', color: '#48f', hp: 150, maxHp: 150, atk: 18, def: 8, speed: 2.0,
    range: 28, attackArc: Math.PI * 0.6,
    abilities: [
      { name: 'Shield Bash', cooldown: 180, range: 32, damage: 25, stun: 60, type: 'melee' },
      { name: 'War Cry',     cooldown: 360, range: 80,  damage: 0,  buff: 'atkUp', duration: 300, type: 'aoe' },
      { name: 'Cleave',      cooldown: 120, range: 34,  damage: 30, arc: Math.PI, type: 'melee' }
    ]
  },
  mage: {
    name: 'Mage', color: '#c4f', hp: 80, maxHp: 80, atk: 22, def: 3, speed: 1.8,
    range: 140, attackArc: Math.PI * 0.15,
    abilities: [
      { name: 'Fireball',   cooldown: 150, range: 160, damage: 40, radius: 48, type: 'projectile' },
      { name: 'Frost Nova', cooldown: 300, range: 60,  damage: 15, slow: 120, radius: 64, type: 'aoe' },
      { name: 'Arcane Bolt',cooldown: 90,  range: 180, damage: 28, type: 'projectile' }
    ]
  },
  rogue: {
    name: 'Rogue', color: '#4f4', hp: 100, maxHp: 100, atk: 20, def: 5, speed: 3.0,
    range: 26, attackArc: Math.PI * 0.4,
    abilities: [
      { name: 'Backstab',      cooldown: 120, range: 30, damage: 45, type: 'melee' },
      { name: 'Smoke Bomb',    cooldown: 240, range: 0,  duration: 180, type: 'self' },
      { name: 'Fan of Knives', cooldown: 150, range: 80, damage: 18, type: 'aoe' }
    ]
  }
};
const COMPLEMENT = { warrior: 'mage', mage: 'warrior', rogue: 'warrior' };

// ── Tile colors ──
const WALL_COLORS  = ['#2a2520', '#322e28', '#2e2a24'];
const FLOOR_COLORS = ['#4a4238', '#524a3e', '#484035'];
const CORRIDOR_COLOR = '#3a342c';
const DOOR_COLOR     = '#a84';

// ── Class selection: handled via overlay buttons ──
let pendingClass = null;
let pendingRestart = false;

// ── Overlay refs ──
let overlayEl, classSelectEl, overlayMsgEl, restartBtnEl, overlayH1El;

// ============================================================
//  HELPERS
// ============================================================
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function isWalkable(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (ty < 0 || ty >= dungeon.length || tx < 0 || tx >= (dungeon[0] || []).length) return false;
  return dungeon[ty][tx] > 0;
}

// Expand a color string to #rrggbbaa for the renderer
function colorWithAlpha(color, alphaHex) {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    if (h.length === 3) {
      // expand #rgb to #rrggbb
      return '#' + h[0]+h[0] + h[1]+h[1] + h[2]+h[2] + alphaHex;
    }
    if (h.length === 6) return color + alphaHex;
    if (h.length === 8) return color; // already has alpha
  }
  return color; // rgba() or named — return as-is
}

function canMoveTo(entity, nx, ny) {
  const r = 8;
  return isWalkable(nx - r, ny - r) && isWalkable(nx + r, ny - r) &&
         isWalkable(nx - r, ny + r) && isWalkable(nx + r, ny + r);
}

// ============================================================
//  DUNGEON GENERATION
// ============================================================
function generateDungeon(floor) {
  const dw = 80, dh = 60;
  dungeon = [];
  for (let y = 0; y < dh; y++) {
    dungeon[y] = [];
    for (let x = 0; x < dw; x++) dungeon[y][x] = 0;
  }
  rooms = [];
  const numRooms = 6 + floor * 2;
  let attempts = 0;

  while (rooms.length < numRooms && attempts < 500) {
    attempts++;
    const rw = 6 + Math.floor(Math.random() * 6);
    const rh = 5 + Math.floor(Math.random() * 5);
    const rx = 2 + Math.floor(Math.random() * (dw - rw - 4));
    const ry = 2 + Math.floor(Math.random() * (dh - rh - 4));

    let overlap = false;
    for (const r of rooms) {
      if (rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y) {
        overlap = true; break;
      }
    }
    if (overlap) continue;

    const room = {
      x: rx, y: ry, w: rw, h: rh,
      cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2),
      cleared: false, isBoss: false, monsters: [], loot: []
    };
    rooms.push(room);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++)
        dungeon[y][x] = 1;
  }

  if (rooms.length > 1) rooms[rooms.length - 1].isBoss = true;

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i], b = rooms[i + 1];
    let cx = a.cx, cy = a.cy;
    while (cx !== b.cx) {
      if (cy >= 0 && cy < dh && cx >= 0 && cx < dw) {
        if (dungeon[cy][cx] === 0) dungeon[cy][cx] = 3;
        if (cy + 1 < dh && dungeon[cy + 1][cx] === 0) dungeon[cy + 1][cx] = 3;
      }
      cx += cx < b.cx ? 1 : -1;
    }
    while (cy !== b.cy) {
      if (cy >= 0 && cy < dh && cx >= 0 && cx < dw) {
        if (dungeon[cy][cx] === 0) dungeon[cy][cx] = 3;
        if (cx + 1 < dw && dungeon[cy][cx + 1] === 0) dungeon[cy][cx + 1] = 3;
      }
      cy += cy < b.cy ? 1 : -1;
    }
  }

  // Place doors
  for (const r of rooms) {
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (x < 0 || x >= dw || y < 0 || y >= dh) continue;
        if (dungeon[y][x] !== 0) continue;
        let adjRoom = false, adjCorridor = false;
        for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + ddx, ny = y + ddy;
          if (nx < 0 || nx >= dw || ny < 0 || ny >= dh) continue;
          if (dungeon[ny][nx] === 1) adjRoom = true;
          if (dungeon[ny][nx] === 3) adjCorridor = true;
        }
        if (adjRoom && adjCorridor) dungeon[y][x] = 2;
      }
    }
  }
  return rooms;
}

// ============================================================
//  MONSTER SPAWNING
// ============================================================
function spawnMonsters(room, floor) {
  const types = [
    { name: 'Skeleton',   hp: 30, atk: 8,  def: 2, speed: 1.2, color: '#ddd', xp: 10, range: 24, char: 'S' },
    { name: 'Slime',      hp: 20, atk: 5,  def: 1, speed: 0.8, color: '#4d4', xp: 8,  range: 20, char: 'O' },
    { name: 'Goblin',     hp: 25, atk: 10, def: 3, speed: 1.5, color: '#d84', xp: 12, range: 22, char: 'G' },
    { name: 'Dark Knight',hp: 45, atk: 14, def: 5, speed: 1.0, color: '#88c', xp: 18, range: 26, char: 'K' }
  ];
  const count = room.isBoss ? 1 : 2 + Math.floor(Math.random() * 3) + floor;
  const result = [];
  for (let i = 0; i < count; i++) {
    let t;
    if (room.isBoss) {
      t = {
        name: 'Floor ' + floor + ' Boss',
        hp: 100 + floor * 80, atk: 15 + floor * 5, def: 5 + floor * 3,
        speed: 1.0, color: '#f44', xp: 50 + floor * 30, range: 30,
        char: 'B', isBoss: true
      };
    } else {
      const ti = floor >= 3
        ? Math.floor(Math.random() * types.length)
        : Math.floor(Math.random() * Math.min(2 + floor, types.length));
      t = { ...types[ti] };
      t.hp = Math.floor(t.hp * (1 + (floor - 1) * 0.4));
      t.atk = Math.floor(t.atk * (1 + (floor - 1) * 0.3));
    }
    const mx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const my = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    result.push({
      ...t,
      maxHp: t.hp,
      x: mx * TILE + TILE / 2,
      y: my * TILE + TILE / 2,
      facing: Math.random() * Math.PI * 2,
      attackCd: 0, stunTimer: 0, slowTimer: 0, alive: true,
      roomIdx: rooms.indexOf(room),
      aggroRange: 120 + (room.isBoss ? 60 : 0)
    });
  }
  return result;
}

// ============================================================
//  ENTITY CREATION
// ============================================================
function createEntity(classDef, x, y, isAI) {
  return {
    ...classDef,
    x, y,
    facing: 0,
    vx: 0, vy: 0,
    attackCd: 0,
    abilityCd: [0, 0, 0],
    stunTimer: 0, slowTimer: 0, smokeTimer: 0,
    buffTimer: 0, buffType: null,
    isAI, alive: true,
    invincTimer: 0, killCount: 0
  };
}

// ============================================================
//  LOOT
// ============================================================
function dropLoot(x, y, fromBoss) {
  const roll = Math.random();
  if (roll < 0.35 || fromBoss) {
    const types = [
      { name: 'Health Potion', color: '#f44', value: 5,  effect: 'heal',    amount: 30,  char: '+' },
      { name: 'Atk Scroll',   color: '#ff4', value: 8,  effect: 'atkUp',   amount: 5,   char: '^' },
      { name: 'Def Scroll',   color: '#4af', value: 8,  effect: 'defUp',   amount: 3,   char: '#' },
      { name: 'Gold Pile',    color: '#fa0', value: 15, effect: 'gold',    amount: 0,   char: '$' },
      { name: 'Speed Boots',  color: '#4ff', value: 12, effect: 'speedUp', amount: 0.3, char: '>' }
    ];
    const t = fromBoss
      ? types[Math.floor(Math.random() * types.length)]
      : types[Math.floor(Math.random() * 4)];
    lootItems.push({
      ...t,
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      sparkle: 0, alive: true
    });
    if (fromBoss && Math.random() < 0.5) {
      const t2 = types[Math.floor(Math.random() * types.length)];
      lootItems.push({
        ...t2,
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 24,
        sparkle: 0, alive: true
      });
    }
  }
}

function pickupLoot(entity, loot) {
  if (loot.effect === 'heal') {
    entity.hp = Math.min(entity.maxHp, entity.hp + loot.amount);
    spawnFloatingText(entity.x, entity.y - 12, '+' + loot.amount + ' HP', '#4f4');
  } else if (loot.effect === 'atkUp') {
    entity.atk += loot.amount;
    spawnFloatingText(entity.x, entity.y - 12, '+' + loot.amount + ' ATK', '#ff4');
  } else if (loot.effect === 'defUp') {
    entity.def += loot.amount;
    spawnFloatingText(entity.x, entity.y - 12, '+' + loot.amount + ' DEF', '#4af');
  } else if (loot.effect === 'gold') {
    spawnFloatingText(entity.x, entity.y - 12, '+' + loot.value + ' Gold', '#fa0');
  } else if (loot.effect === 'speedUp') {
    entity.speed += loot.amount;
    spawnFloatingText(entity.x, entity.y - 12, '+SPD', '#4ff');
  }
  score += loot.value;
  totalLoot += loot.value;
  loot.alive = false;
}

// ============================================================
//  COMBAT
// ============================================================
function meleeAttack(attacker, target) {
  const d = dist(attacker, target);
  if (d > attacker.range + 8) return false;
  const angle = angleTo(attacker, target);
  const diff = Math.abs(((angle - attacker.facing) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  if (diff > attacker.attackArc / 2 + 0.2) return false;
  let dmg = Math.max(1, attacker.atk - target.def + Math.floor(Math.random() * 4));
  if (attacker.buffType === 'atkUp') dmg = Math.floor(dmg * 1.4);
  target.hp -= dmg;
  spawnFloatingText(target.x, target.y - 12, '-' + dmg, '#f44');
  spawnHitParticles(target.x, target.y, attacker.color || '#fff');
  return true;
}

function useAbility(user, abilityIdx, targetAngle) {
  if (user.abilityCd[abilityIdx] > 0) return false;
  const ab = user.abilities[abilityIdx];
  if (!ab) return false;
  user.abilityCd[abilityIdx] = ab.cooldown;

  if (ab.type === 'melee') {
    const targets = monsters.filter(m => m.alive && dist(user, m) < ab.range + 8);
    for (const t of targets) {
      let dmg = Math.max(1, ab.damage + user.atk * 0.3 - t.def);
      t.hp -= Math.floor(dmg);
      if (ab.stun) t.stunTimer = ab.stun;
      spawnFloatingText(t.x, t.y - 12, '-' + Math.floor(dmg), '#fa0');
      spawnHitParticles(t.x, t.y, '#fa0');
    }
    return targets.length > 0;
  }

  if (ab.type === 'projectile') {
    projectiles.push({
      x: user.x, y: user.y,
      vx: Math.cos(targetAngle) * 4,
      vy: Math.sin(targetAngle) * 4,
      damage: ab.damage + user.atk * 0.4,
      radius: ab.radius || 0,
      range: ab.range, traveled: 0,
      owner: user, color: user.color, alive: true
    });
    return true;
  }

  if (ab.type === 'aoe') {
    if (ab.buff) {
      player.buffType = ab.buff; player.buffTimer = ab.duration;
      ally.buffType = ab.buff;   ally.buffTimer = ab.duration;
      spawnFloatingText(user.x, user.y - 16, ab.name + '!', '#ff4');
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x: user.x, y: user.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 30, color: '#ff4' });
      }
    } else {
      const targets = monsters.filter(m => m.alive && dist(user, m) < (ab.radius || 60));
      for (const t of targets) {
        let dmg = Math.max(1, ab.damage + user.atk * 0.2 - t.def * 0.5);
        t.hp -= Math.floor(dmg);
        if (ab.slow) t.slowTimer = ab.slow;
        spawnFloatingText(t.x, t.y - 12, '-' + Math.floor(dmg), '#4af');
        spawnHitParticles(t.x, t.y, '#4af');
      }
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * (ab.radius || 60);
        particles.push({ x: user.x + Math.cos(a) * rr, y: user.y + Math.sin(a) * rr, vx: 0, vy: -1, life: 25, color: '#4af' });
      }
    }
    return true;
  }

  if (ab.type === 'self') {
    user.smokeTimer = ab.duration;
    spawnFloatingText(user.x, user.y - 16, 'Stealth!', '#888');
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x: user.x, y: user.y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 40, color: '#666' });
    }
    return true;
  }
  return false;
}

// ============================================================
//  AI ALLY
// ============================================================
function updateAlly() {
  if (!ally.alive) return;
  if (ally.stunTimer > 0) { ally.stunTimer--; return; }

  let nearest = null, nearDist = Infinity;
  for (const m of monsters) {
    if (!m.alive) continue;
    const d = dist(ally, m);
    if (d < nearDist) { nearDist = d; nearest = m; }
  }

  let nearLoot = null, lootDist = Infinity;
  const needsHeal = ally.hp < ally.maxHp * 0.4;
  for (const l of lootItems) {
    if (!l.alive) continue;
    const d = dist(ally, l);
    if (needsHeal && l.effect === 'heal' && d < lootDist) { nearLoot = l; lootDist = d; }
    else if (!needsHeal && d < lootDist && d < 100) { nearLoot = l; lootDist = d; }
  }

  const speed = ally.slowTimer > 0 ? ally.speed * 0.5 : ally.speed;
  let targetX, targetY;

  if (needsHeal && nearLoot && lootDist < 150) {
    targetX = nearLoot.x; targetY = nearLoot.y;
    if (lootDist < 16) pickupLoot(ally, nearLoot);
  } else if (nearest && nearDist < 200) {
    if (ally.className === 'mage' && nearDist < 60) {
      const away = angleTo(nearest, ally);
      targetX = ally.x + Math.cos(away) * 30;
      targetY = ally.y + Math.sin(away) * 30;
    } else {
      targetX = nearest.x; targetY = nearest.y;
    }
    ally.facing = angleTo(ally, nearest);
    if (ally.attackCd <= 0 && nearDist < ally.range + 12) {
      meleeAttack(ally, nearest);
      ally.attackCd = 20;
    }
    if (nearest) {
      if (ally.abilityCd[0] <= 0 && nearDist < ally.abilities[0].range + 10)
        useAbility(ally, 0, angleTo(ally, nearest));
      const nearbyCount = monsters.filter(m => m.alive && dist(ally, m) < 80).length;
      if (ally.abilityCd[1] <= 0 && (nearbyCount >= 2 || ally.hp < ally.maxHp * 0.3))
        useAbility(ally, 1, angleTo(ally, nearest));
      if (ally.abilityCd[2] <= 0 && nearDist < ally.abilities[2].range + 10)
        useAbility(ally, 2, angleTo(ally, nearest));
    }
  } else {
    const dToPlayer = dist(ally, player);
    if (dToPlayer > 60) {
      targetX = player.x; targetY = player.y;
    } else {
      if (nearLoot && lootDist < 60) {
        targetX = nearLoot.x; targetY = nearLoot.y;
        if (lootDist < 16) pickupLoot(ally, nearLoot);
      } else {
        targetX = ally.x; targetY = ally.y;
      }
    }
  }

  if (targetX !== undefined) {
    const angle = angleTo(ally, { x: targetX, y: targetY });
    const d = dist(ally, { x: targetX, y: targetY });
    if (d > 8) {
      const nx = ally.x + Math.cos(angle) * speed;
      const ny = ally.y + Math.sin(angle) * speed;
      if (canMoveTo(ally, nx, ny)) { ally.x = nx; ally.y = ny; }
      else if (canMoveTo(ally, nx, ally.y)) ally.x = nx;
      else if (canMoveTo(ally, ally.x, ny)) ally.y = ny;
    }
  }

  if (ally.attackCd > 0) ally.attackCd--;
  for (let i = 0; i < 3; i++) if (ally.abilityCd[i] > 0) ally.abilityCd[i]--;
  if (ally.slowTimer > 0) ally.slowTimer--;
  if (ally.smokeTimer > 0) ally.smokeTimer--;
  if (ally.buffTimer > 0) ally.buffTimer--;
  else ally.buffType = null;
}

// ============================================================
//  MONSTER AI
// ============================================================
function updateMonsters() {
  for (const m of monsters) {
    if (!m.alive) continue;
    if (m.stunTimer > 0) { m.stunTimer--; continue; }

    let target = null, tDist = Infinity;
    if (player.alive && player.smokeTimer <= 0) {
      const d = dist(m, player);
      if (d < m.aggroRange) { target = player; tDist = d; }
    }
    if (ally.alive && ally.smokeTimer <= 0) {
      const d = dist(m, ally);
      if (d < tDist && d < m.aggroRange) { target = ally; tDist = d; }
    }
    if (!target) continue;

    const speed = m.slowTimer > 0 ? m.speed * 0.4 : m.speed;
    const angle = angleTo(m, target);
    m.facing = angle;

    if (tDist > m.range) {
      const nx = m.x + Math.cos(angle) * speed;
      const ny = m.y + Math.sin(angle) * speed;
      if (canMoveTo(m, nx, ny)) { m.x = nx; m.y = ny; }
      else if (canMoveTo(m, nx, m.y)) m.x = nx;
      else if (canMoveTo(m, m.x, ny)) m.y = ny;
    }

    if (tDist < m.range + 8 && m.attackCd <= 0) {
      let dmg = Math.max(1, m.atk - target.def + Math.floor(Math.random() * 3));
      if (target.smokeTimer > 0) dmg = Math.floor(dmg * 0.3);
      target.hp -= dmg;
      target.invincTimer = 10;
      spawnFloatingText(target.x, target.y - 12, '-' + dmg, '#f88');
      spawnHitParticles(target.x, target.y, m.color);
      m.attackCd = m.isBoss ? 30 : 40;
    }

    if (m.attackCd > 0) m.attackCd--;
    if (m.slowTimer > 0) m.slowTimer--;

    if (m.hp <= 0) {
      m.alive = false;
      score += m.xp || 10;
      player.killCount++;
      dropLoot(m.x, m.y, m.isBoss);
      spawnDeathParticles(m.x, m.y, m.color);
      checkRoomClear(m.roomIdx);
    }
  }
}

function checkRoomClear(roomIdx) {
  if (roomIdx < 0 || roomIdx >= rooms.length) return;
  const room = rooms[roomIdx];
  if (room.cleared) return;
  const alive = monsters.filter(m => m.roomIdx === roomIdx && m.alive);
  if (alive.length === 0) {
    room.cleared = true;
    roomsCleared++;
    score += 20;
    spawnFloatingText(room.cx * TILE, room.cy * TILE, 'ROOM CLEARED!', '#4f4');
    if (room.isBoss) {
      score += 100 * currentFloor;
      if (currentFloor >= MAX_FLOORS) {
        setTimeout(() => {
          gameState = 'over';
          showGameOverlay('VICTORY!', 'All dungeon floors cleared!\nFinal Score: ' + score, true);
          game.setState('over');
        }, 500);
      } else {
        spawnFloatingText(player.x, player.y - 24, 'DESCENDING...', '#a84');
        setTimeout(() => {
          initFloor(currentFloor + 1, player.className);
        }, 1000);
      }
    }
  }
}

// ============================================================
//  PARTICLES & EFFECTS
// ============================================================
function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({ x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 15, maxLife: 15, color });
  }
}
function spawnDeathParticles(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 2;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30, maxLife: 30, color });
  }
}
function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 45, maxLife: 45 });
}

// ============================================================
//  GAME INIT
// ============================================================
function initFloor(floor, playerClass) {
  currentFloor = floor;
  const allyClass = COMPLEMENT[playerClass] || 'warrior';

  const rms = generateDungeon(floor);
  monsters = []; lootItems = []; projectiles = []; particles = []; floatingTexts = [];
  roomsCleared = 0; currentRoom = 0;

  for (let i = 1; i < rms.length; i++) {
    const ms = spawnMonsters(rms[i], floor);
    monsters.push(...ms);
  }
  rms[0].cleared = true;
  roomsCleared = 1;

  const startRoom = rms[0];
  const sx = startRoom.cx * TILE + TILE / 2;
  const sy = startRoom.cy * TILE + TILE / 2;

  if (floor > 1 && player) {
    // preserve entity, heal
    player.x = sx - 16; player.y = sy;
    ally.x   = sx + 16; ally.y   = sy;
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
    ally.hp   = Math.min(ally.maxHp,   ally.hp   + Math.floor(ally.maxHp * 0.3));
  } else {
    player = createEntity(CLASS_DEFS[playerClass], sx - 16, sy, false);
    player.className = playerClass;
    ally   = createEntity(CLASS_DEFS[allyClass],   sx + 16, sy, true);
    ally.className = allyClass;
  }

  camera = { x: 0, y: 0 };
  updateHUD();
}

function startGame(playerClass) {
  gameState = 'playing';
  score = 0; totalLoot = 0; currentFloor = 1;
  player = null;
  initFloor(1, playerClass);
  game.setState('playing');
}

// ============================================================
//  HUD UPDATE
// ============================================================
function updateHUD() {
  if (scoreEl) scoreEl.textContent = score;
  if (floorEl) floorEl.textContent = currentFloor + '/' + MAX_FLOORS;
  if (roomEl)  roomEl.textContent  = roomsCleared + '/' + (rooms ? rooms.length : 0);
  if (lootEl)  lootEl.textContent  = totalLoot;
}

// ============================================================
//  OVERLAY MANAGEMENT (custom for this game)
// ============================================================
function showGameOverlay(title, msg, isWin) {
  if (!overlayEl) return;
  overlayEl.classList.remove('hidden');
  if (classSelectEl) classSelectEl.style.display = 'none';
  if (restartBtnEl)  restartBtnEl.style.display   = 'block';
  if (overlayH1El) {
    overlayH1El.textContent = title;
    overlayH1El.style.color = isWin ? '#4f4' : '#f44';
  }
  if (overlayMsgEl) {
    overlayMsgEl.textContent = msg;
    overlayMsgEl.style.whiteSpace = 'pre-line';
  }
}

// ============================================================
//  DRAW HELPERS
// ============================================================
function drawCharacter(renderer, text, entity, isAlly) {
  const size = 10;
  const cx = entity.x - camera.x;
  const cy = entity.y - camera.y;

  // buff glow halo
  if (entity.buffTimer > 0) {
    renderer.fillCircle(cx, cy, 16, 'rgba(255,255,68,0.15)');
  }

  // body
  renderer.setGlow(entity.color, 0.8);
  if (entity.smokeTimer > 0) {
    renderer.fillCircle(cx, cy, size, 'rgba(128,128,128,0.4)');
  } else {
    renderer.fillCircle(cx, cy, size, entity.color);
  }
  renderer.setGlow(null);

  // facing indicator line
  renderer.drawLine(
    cx, cy,
    cx + Math.cos(entity.facing) * 14,
    cy + Math.sin(entity.facing) * 14,
    '#ffffff', 2
  );

  // class icon
  const icons = { warrior: 'W', mage: 'M', rogue: 'R' };
  text.drawText(icons[entity.className] || '?', cx, cy - 5, 10, '#111', 'center');

  // label
  text.drawText(isAlly ? 'ALLY' : 'YOU', cx, cy - 18, 9, isAlly ? '#aaa' : '#fff', 'center');

  // health bar
  const bw = 24, bh = 3;
  const bx = cx - bw / 2;
  const by = cy + size + 4;
  renderer.fillRect(bx, by, bw, bh, '#440000');
  const hpFrac = Math.max(0, entity.hp / entity.maxHp);
  renderer.fillRect(bx, by, bw * hpFrac, bh, entity.hp > entity.maxHp * 0.3 ? '#44ff44' : '#ff4444');

  // invincibility flash ring
  if (entity.invincTimer > 0 && entity.invincTimer % 4 < 2) {
    renderer.strokePoly([
      { x: cx + Math.cos(0)              * (size + 3), y: cy + Math.sin(0)              * (size + 3) },
      { x: cx + Math.cos(Math.PI * 0.5)  * (size + 3), y: cy + Math.sin(Math.PI * 0.5)  * (size + 3) },
      { x: cx + Math.cos(Math.PI)        * (size + 3), y: cy + Math.sin(Math.PI)        * (size + 3) },
      { x: cx + Math.cos(Math.PI * 1.5)  * (size + 3), y: cy + Math.sin(Math.PI * 1.5)  * (size + 3) },
    ], '#ffffff', 1, true);
  }
}

function drawHUD(renderer, text) {
  // bottom HUD bar
  renderer.fillRect(0, MAP_H, W, HUD_H, 'rgba(26,26,46,0.9)');
  renderer.drawLine(0, MAP_H, W, MAP_H, 'rgba(170,136,68,0.3)', 1);

  // player HP
  if (player) {
    const pHpText = player.alive ? `You: ${player.hp}/${player.maxHp}` : 'You: DEAD';
    text.drawText(pHpText, 6, MAP_H + 5, 10, '#aaa', 'left');
  }
  // ally HP
  if (ally) {
    const aHpText = ally.alive ? `Ally: ${ally.hp}/${ally.maxHp}` : 'Ally: DEAD';
    text.drawText(aHpText, 140, MAP_H + 5, 10, '#aaa', 'left');
  }

  // abilities
  if (player && player.abilities) {
    for (let i = 0; i < 3; i++) {
      const ab = player.abilities[i];
      if (!ab) continue;
      const ready = player.abilityCd[i] <= 0;
      const cdText = ready ? 'RDY' : Math.ceil(player.abilityCd[i] / 60) + 's';
      const label = `[${i + 1}]${ab.name.substring(0, 6)} ${cdText}`;
      text.drawText(label, W - 6 - (2 - i) * 140, MAP_H + 5, 10, ready ? '#a84' : '#555', 'right');
    }
  }
}

function drawMinimap(renderer) {
  const mmW = 100, mmH = 70;
  const mmX = W - mmW - 4, mmY = 4;
  if (!dungeon || !dungeon[0]) return;
  const scaleX = mmW / dungeon[0].length;
  const scaleY = mmH / dungeon.length;

  renderer.fillRect(mmX, mmY, mmW, mmH, 'rgba(10,10,20,0.8)');
  renderer.strokePoly([
    { x: mmX, y: mmY }, { x: mmX + mmW, y: mmY },
    { x: mmX + mmW, y: mmY + mmH }, { x: mmX, y: mmY + mmH }
  ], 'rgba(170,136,68,0.4)', 1, true);

  // rooms
  for (const room of rooms) {
    const rc = room.cleared ? 'rgba(68,255,68,0.3)'
             : room.isBoss  ? 'rgba(255,68,68,0.4)'
             :                 'rgba(170,136,68,0.3)';
    renderer.fillRect(
      mmX + room.x * scaleX, mmY + room.y * scaleY,
      room.w * scaleX, room.h * scaleY, rc
    );
  }

  // player dot
  if (player && player.alive) {
    renderer.fillRect(
      mmX + (player.x / TILE) * scaleX - 1,
      mmY + (player.y / TILE) * scaleY - 1, 3, 3, player.color
    );
  }
  // ally dot
  if (ally && ally.alive) {
    renderer.fillRect(
      mmX + (ally.x / TILE) * scaleX - 1,
      mmY + (ally.y / TILE) * scaleY - 1, 3, 3, ally.color
    );
  }
  // monster dots
  for (const m of monsters) {
    if (!m.alive) continue;
    renderer.fillRect(
      mmX + (m.x / TILE) * scaleX,
      mmY + (m.y / TILE) * scaleY,
      m.isBoss ? 3 : 2, m.isBoss ? 3 : 2, m.isBoss ? '#f44' : '#f84'
    );
  }
}

// ============================================================
//  GAME EXPORT
// ============================================================
let game;

export function createGame() {
  game = new Game('game');

  // Grab overlay DOM elements
  overlayEl       = document.getElementById('overlay');
  classSelectEl   = document.getElementById('classSelect');
  overlayMsgEl    = document.getElementById('overlayMsg');
  restartBtnEl    = document.getElementById('restartBtn');
  overlayH1El     = overlayEl ? overlayEl.querySelector('h1') : null;

  // Wire up class selection buttons
  if (classSelectEl) {
    classSelectEl.querySelectorAll('.class-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingClass = btn.dataset.class;
      });
    });
  }

  // Wire up restart button
  if (restartBtnEl) {
    restartBtnEl.addEventListener('click', () => {
      pendingRestart = true;
    });
  }

  game.onInit = () => {
    gameState = 'waiting';
    score = 0; totalLoot = 0; currentFloor = 1;
    dungeon = []; rooms = []; monsters = []; lootItems = [];
    projectiles = []; particles = []; floatingTexts = [];
    player = null; ally = null; camera = { x: 0, y: 0 };
    updateHUD();

    // Show the class selection overlay
    if (overlayEl) overlayEl.classList.remove('hidden');
    if (classSelectEl) classSelectEl.style.display = 'flex';
    if (restartBtnEl) restartBtnEl.style.display = 'none';
    if (overlayH1El) {
      overlayH1El.textContent = 'CO-OP DUNGEON CRAWLER';
      overlayH1El.style.color = '#a84';
    }
    if (overlayMsgEl) overlayMsgEl.textContent = '';

    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    // Handle class button clicks
    if (pendingClass) {
      const cls = pendingClass;
      pendingClass = null;
      startGame(cls);
      return;
    }
    // Handle restart
    if (pendingRestart) {
      pendingRestart = false;
      if (overlayEl) overlayEl.classList.remove('hidden');
      if (classSelectEl) classSelectEl.style.display = 'flex';
      if (restartBtnEl) restartBtnEl.style.display = 'none';
      if (overlayH1El) { overlayH1El.textContent = 'CO-OP DUNGEON CRAWLER'; overlayH1El.style.color = '#a84'; }
      if (overlayMsgEl) overlayMsgEl.textContent = '';
      gameState = 'waiting';
      game.setState('waiting');
      return;
    }

    if (gameState !== 'playing') return;
    if (!player || !ally) return;

    // ── Player input ──
    if (player.alive && player.stunTimer <= 0) {
      const speed = player.slowTimer > 0 ? player.speed * 0.5 : player.speed;
      let mx = 0, my = 0;
      if (game.input.isDown('w') || game.input.isDown('W') || game.input.isDown('ArrowUp'))    my = -1;
      if (game.input.isDown('s') || game.input.isDown('S') || game.input.isDown('ArrowDown'))  my =  1;
      if (game.input.isDown('a') || game.input.isDown('A') || game.input.isDown('ArrowLeft'))  mx = -1;
      if (game.input.isDown('d') || game.input.isDown('D') || game.input.isDown('ArrowRight')) mx =  1;
      if (mx || my) {
        const len = Math.sqrt(mx * mx + my * my);
        mx /= len; my /= len;
        player.facing = Math.atan2(my, mx);
        const nx = player.x + mx * speed;
        const ny = player.y + my * speed;
        if (canMoveTo(player, nx, ny)) { player.x = nx; player.y = ny; }
        else if (canMoveTo(player, nx, player.y)) player.x = nx;
        else if (canMoveTo(player, player.x, ny)) player.y = ny;
      }

      // Attack
      if (game.input.isDown(' ') && player.attackCd <= 0) {
        let best = null, bestDist = Infinity;
        for (const m of monsters) {
          if (!m.alive) continue;
          const d = dist(player, m);
          if (d < player.range + 20 && d < bestDist) { best = m; bestDist = d; }
        }
        if (best) {
          player.facing = angleTo(player, best);
          if (player.className === 'mage') {
            projectiles.push({
              x: player.x, y: player.y,
              vx: Math.cos(player.facing) * 4, vy: Math.sin(player.facing) * 4,
              damage: player.atk, radius: 0, range: player.range,
              traveled: 0, owner: player, color: player.color, alive: true
            });
          } else {
            meleeAttack(player, best);
          }
        } else if (player.className === 'mage') {
          projectiles.push({
            x: player.x, y: player.y,
            vx: Math.cos(player.facing) * 4, vy: Math.sin(player.facing) * 4,
            damage: player.atk, radius: 0, range: player.range,
            traveled: 0, owner: player, color: player.color, alive: true
          });
        }
        player.attackCd = player.className === 'rogue' ? 15 : 20;
      }

      // Interact / pickup
      if (game.input.wasPressed('e') || game.input.wasPressed('E')) {
        for (const l of lootItems) {
          if (!l.alive) continue;
          if (dist(player, l) < 24) { pickupLoot(player, l); break; }
        }
      }

      // Abilities 1-3
      for (let i = 0; i < 3; i++) {
        const keyStr = String(i + 1);
        if (game.input.wasPressed(keyStr)) {
          let targetAngle = player.facing;
          let nearestM = null, nd = Infinity;
          for (const m of monsters) {
            if (!m.alive) continue;
            const d = dist(player, m);
            if (d < nd) { nearestM = m; nd = d; }
          }
          if (nearestM) targetAngle = angleTo(player, nearestM);
          useAbility(player, i, targetAngle);
        }
      }
    }

    // Player cooldowns
    if (player.attackCd > 0) player.attackCd--;
    for (let i = 0; i < 3; i++) if (player.abilityCd[i] > 0) player.abilityCd[i]--;
    if (player.stunTimer > 0) player.stunTimer--;
    if (player.slowTimer > 0) player.slowTimer--;
    if (player.smokeTimer > 0) player.smokeTimer--;
    if (player.buffTimer > 0) player.buffTimer--;
    else player.buffType = null;
    if (player.invincTimer > 0) player.invincTimer--;

    updateAlly();
    updateMonsters();

    // Update projectiles
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.x += p.vx; p.y += p.vy;
      p.traveled += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (p.traveled > p.range || !isWalkable(p.x, p.y)) {
        p.alive = false;
        if (p.radius > 0) {
          for (const m of monsters) {
            if (!m.alive) continue;
            if (dist(p, m) < p.radius) {
              let dmg = Math.max(1, Math.floor(p.damage * 0.7) - m.def);
              m.hp -= dmg;
              spawnFloatingText(m.x, m.y - 12, '-' + dmg, '#fa0');
              spawnHitParticles(m.x, m.y, '#f80');
              if (m.hp <= 0) {
                m.alive = false; score += m.xp || 10; player.killCount++;
                dropLoot(m.x, m.y, m.isBoss);
                spawnDeathParticles(m.x, m.y, m.color);
                checkRoomClear(m.roomIdx);
              }
            }
          }
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 20, maxLife: 20, color: '#f80' });
          }
        }
        continue;
      }
      for (const m of monsters) {
        if (!m.alive) continue;
        if (dist(p, m) < 14) {
          let dmg = Math.max(1, Math.floor(p.damage) - m.def);
          m.hp -= dmg;
          spawnFloatingText(m.x, m.y - 12, '-' + dmg, '#fa0');
          spawnHitParticles(m.x, m.y, p.color);
          if (m.hp <= 0) {
            m.alive = false; score += m.xp || 10; player.killCount++;
            dropLoot(m.x, m.y, m.isBoss);
            spawnDeathParticles(m.x, m.y, m.color);
            checkRoomClear(m.roomIdx);
          }
          if (p.radius > 0) {
            for (const m2 of monsters) {
              if (!m2.alive || m2 === m) continue;
              if (dist(p, m2) < p.radius) {
                let dmg2 = Math.max(1, Math.floor(p.damage * 0.5) - m2.def);
                m2.hp -= dmg2;
                spawnFloatingText(m2.x, m2.y - 12, '-' + dmg2, '#fa0');
                if (m2.hp <= 0) {
                  m2.alive = false; score += m2.xp || 10;
                  dropLoot(m2.x, m2.y, m2.isBoss);
                  spawnDeathParticles(m2.x, m2.y, m2.color);
                  checkRoomClear(m2.roomIdx);
                }
              }
            }
          }
          p.alive = false;
          break;
        }
      }
    }

    projectiles = projectiles.filter(p => p.alive);
    lootItems   = lootItems.filter(l => l.alive);

    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life--;
    }
    particles = particles.filter(p => p.life > 0);

    for (const ft of floatingTexts) {
      ft.y -= 0.5; ft.life--;
    }
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);

    for (const l of lootItems) {
      if (l.alive) l.sparkle = (l.sparkle + 0.05) % (Math.PI * 2);
    }

    // Check deaths
    if (player.hp <= 0) {
      player.alive = false; player.hp = 0;
      if (!ally.alive) {
        gameState = 'over';
        showGameOverlay('GAME OVER', 'Both heroes fell in the dungeon.\nScore: ' + score, false);
        game.setState('over');
      } else {
        spawnFloatingText(player.x, player.y - 16, 'FALLEN!', '#f44');
      }
    }
    if (ally.hp <= 0) {
      ally.alive = false; ally.hp = 0;
      if (!player.alive) {
        gameState = 'over';
        showGameOverlay('GAME OVER', 'Both heroes fell in the dungeon.\nScore: ' + score, false);
        game.setState('over');
      } else {
        spawnFloatingText(ally.x, ally.y - 16, 'ALLY DOWN!', '#f44');
      }
    }

    // Camera follows player
    if (player && player.alive) {
      camera.x = player.x - W / 2;
      camera.y = player.y - MAP_H / 2;
    }

    updateHUD();
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0e0e1a');

    if (gameState !== 'playing' || !dungeon || dungeon.length === 0) {
      // Waiting or game over — just draw background
      return;
    }

    // Determine visible tile range
    const camX = camera.x, camY = camera.y;
    const dungeonW = (dungeon[0] || []).length;
    const dungeonH = dungeon.length;
    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol   = Math.min(dungeonW, Math.ceil((camX + W) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow   = Math.min(dungeonH, Math.ceil((camY + MAP_H) / TILE) + 1);

    // Draw tiles
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = dungeon[r] ? dungeon[r][c] : 0;
        const x = c * TILE - camX;
        const y = r * TILE - camY;

        if (tile === 0) {
          // Wall — only if adjacent to non-wall
          let nearFloor = false;
          for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
            const nr = r + ddy, nc = c + ddx;
            if (nr >= 0 && nr < dungeonH && nc >= 0 && nc < dungeonW && dungeon[nr][nc] > 0) {
              nearFloor = true; break;
            }
          }
          if (nearFloor) {
            renderer.fillRect(x, y, TILE, TILE, WALL_COLORS[(r * 7 + c * 13) % 3]);
            // Brick lines
            renderer.drawLine(x + 1, y + 1,             x + TILE - 1, y + 1,             'rgba(0,0,0,0.3)', 0.5);
            renderer.drawLine(x + 1, y + TILE / 2 - 1,  x + TILE - 1, y + TILE / 2 - 1,  'rgba(0,0,0,0.3)', 0.5);
            renderer.drawLine(x + TILE / 2, y + TILE / 2, x + TILE / 2, y + TILE - 1, 'rgba(0,0,0,0.3)', 0.5);
          }
        } else if (tile === 1) {
          renderer.fillRect(x, y, TILE, TILE, FLOOR_COLORS[(r * 3 + c * 7) % 3]);
          if ((r + c) % 5 === 0) {
            renderer.fillRect(x + 4, y + 4, 4, 4, 'rgba(170,136,68,0.06)');
          }
        } else if (tile === 2) {
          renderer.fillRect(x, y, TILE, TILE, '#3a342c');
          renderer.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, DOOR_COLOR);
          renderer.fillRect(x + 6, y + 6, TILE - 12, TILE - 12, '#665544');
        } else if (tile === 3) {
          renderer.fillRect(x, y, TILE, TILE, CORRIDOR_COLOR);
        }
      }
    }

    // Uncleared room indicators
    for (const room of rooms) {
      if (!room.cleared) {
        const rx = room.x * TILE - camX;
        const ry = room.y * TILE - camY;
        renderer.fillRect(rx, ry, room.w * TILE, room.h * TILE,
          room.isBoss ? 'rgba(255,68,68,0.08)' : 'rgba(255,100,50,0.05)');
      }
    }

    // Loot items
    for (const l of lootItems) {
      if (!l.alive) continue;
      const lx = l.x - camX;
      const ly = l.y - camY;
      const sparkleSize = 1 + Math.sin(l.sparkle * 3) * 0.5;
      const alpha = Math.floor((0.3 + Math.sin(l.sparkle * 4) * 0.2) * 255).toString(16).padStart(2, '0');

      renderer.setGlow(l.color, 0.5);
      renderer.fillCircle(lx, ly, 8 * sparkleSize, colorWithAlpha(l.color, alpha));
      renderer.setGlow(null);

      text.drawText(l.char, lx, ly - 6, 14, l.color, 'center');
    }

    // Monsters
    for (const m of monsters) {
      if (!m.alive) continue;
      const mx = m.x - camX;
      const my = m.y - camY;
      const size = m.isBoss ? 14 : 8;

      renderer.setGlow(m.color, m.isBoss ? 0.8 : 0.5);
      renderer.fillCircle(mx, my, size, m.color);
      renderer.setGlow(null);

      text.drawText(m.char, mx, my - (m.isBoss ? 9 : 6), m.isBoss ? 16 : 11, '#111111', 'center');

      // Health bar
      if (m.hp < m.maxHp) {
        const bw = m.isBoss ? 36 : 20;
        const bh = 3;
        const bx = mx - bw / 2;
        const by = my - size - 6;
        renderer.fillRect(bx, by, bw, bh, '#440000');
        renderer.fillRect(bx, by, bw * (m.hp / m.maxHp), bh,
          m.hp > m.maxHp * 0.3 ? '#44ff44' : '#ff4444');
      }

      // Stun indicator
      if (m.stunTimer > 0) {
        text.drawText('*', mx + size, my - size - 3, 8, '#ffff00', 'left');
      }
    }

    // Ally
    if (ally && ally.alive) {
      drawCharacter(renderer, text, ally, true);
    }

    // Player
    if (player && player.alive) {
      drawCharacter(renderer, text, player, false);
    }

    // Projectiles
    for (const p of projectiles) {
      if (!p.alive) continue;
      const px = p.x - camX;
      const py = p.y - camY;
      renderer.setGlow(p.color, 0.8);
      renderer.fillCircle(px, py, 4, p.color);
      renderer.setGlow(null);
      // Trail
      const trailAlpha = '66'; // 40%
      renderer.drawLine(px, py, px - p.vx * 3, py - p.vy * 3, colorWithAlpha(p.color, trailAlpha), 2);
    }

    // Particles
    for (const p of particles) {
      const a = Math.max(0, Math.min(255, Math.floor((p.life / p.maxLife) * 255)));
      const aHex = a.toString(16).padStart(2, '0');
      renderer.fillRect(p.x - camX - 2, p.y - camY - 2, 4, 4, colorWithAlpha(p.color, aHex));
    }

    // Floating texts
    for (const ft of floatingTexts) {
      const a = Math.max(0, Math.min(255, Math.floor((ft.life / ft.maxLife) * 255)));
      const aHex = a.toString(16).padStart(2, '0');
      renderer.setGlow(ft.color, 0.5);
      text.drawText(ft.text, ft.x - camX, ft.y - camY - 6, 12, colorWithAlpha(ft.color, aHex), 'center');
      renderer.setGlow(null);
    }

    // HUD
    drawHUD(renderer, text);

    // Minimap
    drawMinimap(renderer);
  };

  game.start();
  return game;
}
