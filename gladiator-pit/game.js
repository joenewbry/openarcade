// gladiator-pit/game.js — Gladiator Pit ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 500, H = 500, CX = W / 2, CY = H / 2;
const ARENA_R = 220;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const roundEl = document.getElementById('roundNum');
const aliveEl = document.getElementById('aliveCount');

// ── Module-scope state ──
let gameState = 'menu'; // menu, playing, roundEnd, gameOver
let score = 0;
let round = 1;
let gladiators = [];
let pickups = [];
let particles = [];
let projectiles = [];
let sandGrains = [];
let pickupTimer = 0;
let healthPickupTimer = 0;
let roundEndTimer = 0;

// ── Keyboard state ──
const keys = {};

// ── Weapon definitions ──
const WEAPONS = {
  fists:  { name: 'Fists',         damage: 8,  range: 22, speed: 0.25, arc: Math.PI * 0.6,  color: '#ccc', knockback: 3,  staminaCost: 8  },
  sword:  { name: 'Sword',         damage: 18, range: 38, speed: 0.35, arc: Math.PI * 0.5,  color: '#ddd', knockback: 5,  staminaCost: 15 },
  spear:  { name: 'Spear',         damage: 22, range: 55, speed: 0.5,  arc: Math.PI * 0.25, color: '#aaf', knockback: 7,  staminaCost: 18 },
  hammer: { name: 'Hammer',        damage: 35, range: 32, speed: 0.7,  arc: Math.PI * 0.7,  color: '#f88', knockback: 12, staminaCost: 25 },
  knife:  { name: 'Throwing Knife',damage: 14, range: 30, speed: 0.3,  arc: Math.PI * 0.4,  color: '#8f8', knockback: 2,  staminaCost: 12,
            ranged: true, projSpeed: 250, projRange: 180 }
};

// ── Distance helpers ──
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function clampToArena(g) {
  const dx = g.x - CX, dy = g.y - CY;
  const d = Math.hypot(dx, dy);
  const maxR = ARENA_R - g.radius;
  if (d > maxR) {
    g.x = CX + (dx / d) * maxR;
    g.y = CY + (dy / d) * maxR;
  }
}

// ── Gladiator factory ──
function createGladiator(x, y, color, name, isPlayer) {
  return {
    x, y, vx: 0, vy: 0,
    radius: 12, color, name, isPlayer,
    hp: 100, maxHp: 100,
    stamina: 100, maxStamina: 100,
    staminaRegen: 22,
    weapon: 'fists',
    facing: 0,
    speed: 120,
    attacking: false, attackTimer: 0, attackCooldown: 0,
    dodging: false, dodgeTimer: 0, dodgeCooldown: 0, dodgeDir: 0,
    iframes: 0, alive: true, hitFlash: 0, killedBy: null,
    // AI fields
    aiTarget: null, aiState: 'roam', aiTimer: 0,
    aiDodgeReact: 0.3 + Math.random() * 0.4,
    aiAggression: 0.4 + Math.random() * 0.5,
    aiPickupTarget: null,
    aiWanderAngle: Math.random() * Math.PI * 2
  };
}

// ── Pickups ──
function spawnWeaponPickup() {
  const types = ['sword', 'spear', 'hammer', 'knife'];
  const type = types[Math.floor(Math.random() * types.length)];
  const angle = Math.random() * Math.PI * 2;
  const d = Math.random() * (ARENA_R - 30);
  pickups.push({ x: CX + Math.cos(angle) * d, y: CY + Math.sin(angle) * d, type, isHealth: false, bobTimer: Math.random() * Math.PI * 2 });
}

function spawnHealthPickup() {
  const angle = Math.random() * Math.PI * 2;
  const d = Math.random() * (ARENA_R - 30);
  pickups.push({ x: CX + Math.cos(angle) * d, y: CY + Math.sin(angle) * d, type: 'health', isHealth: true, bobTimer: Math.random() * Math.PI * 2 });
}

// ── Particles ──
function spawnBlood(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 30 + Math.random() * 80;
    const life = 0.4 + Math.random() * 0.5;
    particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life, radius: 1.5 + Math.random() * 2.5, color: color || '#c22', type: 'blood' });
  }
}

function spawnSpark(x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 100;
    const life = 0.2 + Math.random() * 0.3;
    particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life, radius: 1 + Math.random() * 2, color: '#fd8', type: 'spark' });
  }
}

function spawnDust(x, y) {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 20 + Math.random() * 40;
    const life = 0.3 + Math.random() * 0.3;
    particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life, radius: 2 + Math.random() * 3, color: '#c9a05c', type: 'dust' });
  }
}

// ── Sand texture ──
function generateSand() {
  sandGrains = [];
  for (let i = 0; i < 600; i++) {
    const angle = Math.random() * Math.PI * 2;
    const d = Math.random() * ARENA_R;
    sandGrains.push({ x: CX + Math.cos(angle) * d, y: CY + Math.sin(angle) * d, shade: Math.random() * 0.15 });
  }
}

// ── Start round ──
function startRound(game) {
  gameState = 'playing';
  game.hideOverlay();
  gladiators = [];
  pickups = [];
  particles = [];
  projectiles = [];
  pickupTimer = 2;
  healthPickupTimer = 8;
  roundEndTimer = 0;

  const colors = ['#4af', '#f44', '#4f4', '#f8f'];
  const names = ['Player', 'Brutus', 'Maximus', 'Spartacus'];
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i / 4) - Math.PI / 2;
    const d = ARENA_R * 0.6;
    const g = createGladiator(
      CX + Math.cos(angle) * d,
      CY + Math.sin(angle) * d,
      colors[i], names[i], i === 0
    );
    g.facing = Math.atan2(CY - g.y, CX - g.x);
    gladiators.push(g);
  }

  spawnWeaponPickup();
  spawnWeaponPickup();
  generateSand();
  roundEl.textContent = round;
  updateAliveCount();
}

function updateAliveCount() {
  aliveEl.textContent = gladiators.filter(g => g.alive).length;
}

// ── Attack / melee ──
function performAttack(g) {
  const wep = WEAPONS[g.weapon];
  if (g.attackCooldown > 0 || g.stamina < wep.staminaCost || g.dodging) return;
  g.attacking = true;
  g.attackTimer = wep.speed;
  g.attackCooldown = wep.speed + 0.15;
  g.stamina -= wep.staminaCost;

  if (wep.ranged) {
    projectiles.push({
      x: g.x + Math.cos(g.facing) * (g.radius + 5),
      y: g.y + Math.sin(g.facing) * (g.radius + 5),
      vx: Math.cos(g.facing) * wep.projSpeed,
      vy: Math.sin(g.facing) * wep.projSpeed,
      damage: wep.damage,
      knockback: wep.knockback,
      owner: g,
      life: wep.projRange / wep.projSpeed,
      color: wep.color
    });
  }
}

function checkMeleeHit(attacker, dt) {
  const wep = WEAPONS[attacker.weapon];
  if (wep.ranged) return;
  const peak = wep.speed * 0.5;
  if (Math.abs(attacker.attackTimer - peak) > dt * 2 + 0.05) return;

  for (const target of gladiators) {
    if (target === attacker || !target.alive || target.iframes > 0) continue;
    if (dist(attacker, target) > wep.range + target.radius) continue;
    let angleDiff = angleTo(attacker, target) - attacker.facing;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (Math.abs(angleDiff) > wep.arc / 2) continue;
    dealDamage(attacker, target, wep.damage, wep.knockback);
  }
}

function dealDamage(attacker, target, damage, knockback) {
  target.hp -= damage;
  target.hitFlash = 0.15;
  target.iframes = 0.2;
  const angle = angleTo(attacker, target);
  target.vx += Math.cos(angle) * knockback * 15;
  target.vy += Math.sin(angle) * knockback * 15;
  spawnBlood(target.x, target.y, 6, '#c22');
  spawnSpark((attacker.x + target.x) / 2, (attacker.y + target.y) / 2, 4);

  if (target.hp <= 0) {
    target.alive = false;
    target.killedBy = attacker;
    if (attacker.isPlayer) {
      score++;
      scoreEl.textContent = score;
    }
    spawnBlood(target.x, target.y, 20, '#a11');
    if (target.weapon !== 'fists') {
      pickups.push({ x: target.x, y: target.y, type: target.weapon, isHealth: false, bobTimer: 0 });
    }
    updateAliveCount();
  }
}

// ── Dodge ──
function performDodge(g) {
  if (g.dodgeCooldown > 0 || g.stamina < 25 || g.dodging || g.attacking) return;
  g.dodging = true;
  g.dodgeTimer = 0.3;
  g.dodgeCooldown = 0.6;
  g.iframes = 0.25;
  g.stamina -= 25;

  const moveX = g.isPlayer ? ((keys.d ? 1 : 0) - (keys.a ? 1 : 0)) : Math.cos(g.dodgeDir);
  const moveY = g.isPlayer ? ((keys.s ? 1 : 0) - (keys.w ? 1 : 0)) : Math.sin(g.dodgeDir);
  const moveLen = Math.hypot(moveX, moveY);
  g.dodgeDir = moveLen > 0 ? Math.atan2(moveY, moveX) : g.facing;
  spawnDust(g.x, g.y);
}

// ── Pickup ──
function tryPickup(g) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (dist(g, p) < 22) {
      if (p.isHealth) {
        g.hp = Math.min(g.maxHp, g.hp + 30);
        spawnSpark(p.x, p.y, 8);
      } else {
        if (g.weapon !== 'fists') {
          pickups.push({ x: g.x - Math.cos(g.facing) * 15, y: g.y - Math.sin(g.facing) * 15, type: g.weapon, isHealth: false, bobTimer: 0 });
        }
        g.weapon = p.type;
        spawnSpark(p.x, p.y, 10);
      }
      pickups.splice(i, 1);
      break;
    }
  }
}

// ── Player update ──
function updatePlayer(g, dt) {
  if (!g.alive) return;
  let mx = 0, my = 0;
  if (keys.a) mx -= 1;
  if (keys.d) mx += 1;
  if (keys.w) my -= 1;
  if (keys.s) my += 1;
  const mLen = Math.hypot(mx, my);

  if (!g.dodging && !g.attacking) {
    if (mLen > 0) {
      g.vx = (mx / mLen) * g.speed;
      g.vy = (my / mLen) * g.speed;
      g.facing = Math.atan2(my, mx);
    } else {
      g.vx *= 0.8;
      g.vy *= 0.8;
    }
  }

  if (keys.space) performAttack(g);
  if (keys.shift) performDodge(g);
  if (keys.e) tryPickup(g);
}

// ── AI update ──
function updateAI(g, dt) {
  if (!g.alive) return;
  g.aiTimer -= dt;
  const wep = WEAPONS[g.weapon];
  const aliveOthers = gladiators.filter(o => o !== g && o.alive);
  if (aliveOthers.length === 0) return;

  let nearestEnemy = null, nearestDist = Infinity;
  for (const o of aliveOthers) {
    const d = dist(g, o);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = o; }
  }

  let nearestPickup = null, pickupDist = Infinity;
  for (const p of pickups) {
    const d = dist(g, p);
    if (d < pickupDist) { pickupDist = d; nearestPickup = p; }
  }

  // Dodge incoming melee
  for (const o of aliveOthers) {
    if (o.attacking && dist(g, o) < WEAPONS[o.weapon].range + 20) {
      if (Math.random() < g.aiDodgeReact && g.dodgeCooldown <= 0 && g.stamina >= 25) {
        const a = angleTo(o, g);
        g.dodgeDir = a + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        performDodge(g);
        return;
      }
    }
  }

  // Dodge projectiles
  for (const p of projectiles) {
    if (p.owner === g) continue;
    if (dist(g, p) < 40 && g.dodgeCooldown <= 0 && g.stamina >= 25) {
      const a = Math.atan2(p.vy, p.vx);
      g.dodgeDir = a + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      performDodge(g);
      return;
    }
  }

  // State machine decision
  if (g.aiTimer <= 0) {
    g.aiTimer = 0.3 + Math.random() * 0.4;
    if (g.hp < 30 && nearestPickup && nearestPickup.isHealth && pickupDist < 150) {
      g.aiState = 'pickup'; g.aiPickupTarget = nearestPickup;
    } else if (g.weapon === 'fists' && nearestPickup && !nearestPickup.isHealth && pickupDist < 180) {
      g.aiState = 'pickup'; g.aiPickupTarget = nearestPickup;
    } else if (nearestPickup && !nearestPickup.isHealth && pickupDist < 100 && g.weapon === 'fists') {
      g.aiState = 'pickup'; g.aiPickupTarget = nearestPickup;
    } else if (g.stamina < 20) {
      g.aiState = 'retreat';
    } else if (g.hp < 25 && nearestDist < 60) {
      g.aiState = 'retreat';
    } else if (nearestDist < wep.range + 15) {
      g.aiState = 'attack';
    } else if (nearestDist < 150 || g.aiAggression > 0.6) {
      g.aiState = 'chase';
    } else {
      g.aiState = 'roam';
    }
    g.aiTarget = nearestEnemy;
  }

  const target = g.aiTarget || nearestEnemy;
  if (!target || g.dodging) return;

  switch (g.aiState) {
    case 'chase': {
      let idealDist = wep.range * 0.8;
      if (g.weapon === 'spear') idealDist = wep.range * 0.7;
      if (g.weapon === 'knife') idealDist = wep.range + 40;
      if (g.weapon === 'hammer') idealDist = wep.range * 0.5;
      const a = angleTo(g, target);
      const d = dist(g, target);
      if (d > idealDist + 10) {
        g.vx = Math.cos(a) * g.speed;
        g.vy = Math.sin(a) * g.speed;
      } else if (d < idealDist - 10) {
        g.vx = -Math.cos(a) * g.speed * 0.6;
        g.vy = -Math.sin(a) * g.speed * 0.6;
      } else {
        const strafe = a + Math.PI / 2;
        g.vx = Math.cos(strafe) * g.speed * 0.5;
        g.vy = Math.sin(strafe) * g.speed * 0.5;
      }
      g.facing = a;
      break;
    }
    case 'attack': {
      const a = angleTo(g, target);
      g.facing = a;
      if (dist(g, target) < wep.range + target.radius + 5) performAttack(g);
      g.vx = Math.cos(a) * g.speed * 0.3;
      g.vy = Math.sin(a) * g.speed * 0.3;
      break;
    }
    case 'retreat': {
      const a = angleTo(target, g);
      g.vx = Math.cos(a) * g.speed * 0.9;
      g.vy = Math.sin(a) * g.speed * 0.9;
      g.facing = angleTo(g, target);
      break;
    }
    case 'pickup': {
      const p = g.aiPickupTarget;
      if (p && pickups.includes(p)) {
        const a = angleTo(g, p);
        g.vx = Math.cos(a) * g.speed;
        g.vy = Math.sin(a) * g.speed;
        g.facing = a;
        if (dist(g, p) < 20) tryPickup(g);
      } else {
        g.aiState = 'roam';
      }
      break;
    }
    case 'roam': {
      g.aiWanderAngle += (Math.random() - 0.5) * 2 * dt;
      const toCenterAngle = Math.atan2(CY - g.y, CX - g.x);
      const dFromCenter = Math.hypot(g.x - CX, g.y - CY);
      if (dFromCenter > ARENA_R * 0.6) {
        g.aiWanderAngle = toCenterAngle + (Math.random() - 0.5) * 0.5;
      }
      g.vx = Math.cos(g.aiWanderAngle) * g.speed * 0.5;
      g.vy = Math.sin(g.aiWanderAngle) * g.speed * 0.5;
      g.facing = g.aiWanderAngle;
      break;
    }
  }
}

// ── Main update ──
function update(dt, game) {
  if (gameState !== 'playing') return;

  for (const g of gladiators) {
    if (!g.alive) continue;

    if (!g.attacking && !g.dodging) {
      g.stamina = Math.min(g.maxStamina, g.stamina + g.staminaRegen * dt);
    }

    if (g.attackCooldown > 0) g.attackCooldown -= dt;
    if (g.dodgeCooldown > 0) g.dodgeCooldown -= dt;
    if (g.iframes > 0) g.iframes -= dt;
    if (g.hitFlash > 0) g.hitFlash -= dt;

    if (g.attacking) {
      checkMeleeHit(g, dt);
      g.attackTimer -= dt;
      if (g.attackTimer <= 0) g.attacking = false;
    }

    if (g.dodging) {
      g.vx = Math.cos(g.dodgeDir) * g.speed * 2.5;
      g.vy = Math.sin(g.dodgeDir) * g.speed * 2.5;
      g.dodgeTimer -= dt;
      if (g.dodgeTimer <= 0) g.dodging = false;
    }

    if (g.isPlayer) updatePlayer(g, dt);
    else updateAI(g, dt);

    g.x += g.vx * dt;
    g.y += g.vy * dt;

    if (!g.dodging) {
      g.vx *= Math.pow(0.05, dt);
      g.vy *= Math.pow(0.05, dt);
    }

    clampToArena(g);

    // Push apart
    for (const o of gladiators) {
      if (o === g || !o.alive) continue;
      const d = dist(g, o);
      const minD = g.radius + o.radius;
      if (d < minD && d > 0) {
        const overlap = (minD - d) / 2;
        const ax = (g.x - o.x) / d;
        const ay = (g.y - o.y) / d;
        g.x += ax * overlap;
        g.y += ay * overlap;
        o.x -= ax * overlap;
        o.y -= ay * overlap;
      }
    }
  }

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let hit = false;
    for (const g of gladiators) {
      if (g === p.owner || !g.alive || g.iframes > 0) continue;
      if (dist(g, p) < g.radius + 4) {
        dealDamage(p.owner, g, p.damage, p.knockback);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const dFromCenter = Math.hypot(p.x - CX, p.y - CY);
      if (p.life <= 0 || dFromCenter > ARENA_R + 10) {
        projectiles.splice(i, 1);
      }
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.02, dt);
    p.vy *= Math.pow(0.02, dt);
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Spawn pickups
  pickupTimer -= dt;
  if (pickupTimer <= 0 && pickups.filter(p => !p.isHealth).length < 4) {
    spawnWeaponPickup();
    pickupTimer = 4 + Math.random() * 3;
  }
  healthPickupTimer -= dt;
  if (healthPickupTimer <= 0 && pickups.filter(p => p.isHealth).length < 2) {
    spawnHealthPickup();
    healthPickupTimer = 10 + Math.random() * 5;
  }

  for (const p of pickups) p.bobTimer += dt * 3;

  // Round end check
  const alive = gladiators.filter(g => g.alive);
  updateAliveCount();
  if (alive.length <= 1) {
    roundEndTimer += dt;
    if (roundEndTimer > 1.5) {
      roundEndTimer = 0;
      const player = gladiators[0];
      if (player.alive) {
        round++;
        roundEl.textContent = round;
        game.showOverlay('VICTORY!', `Round ${round - 1} cleared! Kills: ${score}. Starting Round ${round}...`);
        gameState = 'roundEnd';
        setTimeout(() => { if (gameState === 'roundEnd') startRound(game); }, 2000);
      } else {
        game.showOverlay('DEFEATED', `You fell in Round ${round}. Total Kills: ${score}. Click to restart.`);
        gameState = 'gameOver';
        game.setState('over');
      }
    }
  }
}

// ── Weapon icon drawing (pre-computed rotated vertices) ──
function drawWeaponIcon(renderer, type, cx, cy, angle) {
  // angle: direction the weapon faces (radians)
  // We draw the icon relative to center (cx, cy), oriented along 'angle'
  // facing "up" (angle = -PI/2) in local coords => map local x/y to world via rotation

  function rotPt(lx, ly) {
    // local: x right, y down. We want y-up = "forward" along angle
    // rotate 90 degrees so +y local = angle direction
    const rx = lx;
    const ry = -ly; // flip y so "up" in local means forward
    const cos = Math.cos(angle - Math.PI / 2);
    const sin = Math.sin(angle - Math.PI / 2);
    return { x: cx + rx * cos - ry * sin, y: cy + rx * sin + ry * cos };
  }

  function rotRect(lx, ly, lw, lh, color) {
    // four corners of rectangle centered at (lx + lw/2, ly + lh/2) in local coords
    const x0 = lx, y0 = ly, x1 = lx + lw, y1 = ly + lh;
    const pts = [rotPt(x0, y0), rotPt(x1, y0), rotPt(x1, y1), rotPt(x0, y1)];
    renderer.fillPoly(pts, color);
  }

  switch (type) {
    case 'sword': {
      // blade: -2..2 x, -8..8 y
      rotRect(-2, -8, 4, 16, '#ddd');
      // guard: -3..3 x, 6..10 y
      rotRect(-3, 6, 6, 4, '#a86');
      break;
    }
    case 'spear': {
      // shaft: -1.5..1.5, -12..12
      rotRect(-1.5, -12, 3, 24, '#874');
      // tip triangle
      const tip = [rotPt(0, -14), rotPt(-3, -8), rotPt(3, -8)];
      renderer.fillPoly(tip, '#aaf');
      break;
    }
    case 'hammer': {
      // handle: -1.5..1.5, -6..10
      rotRect(-1.5, -6, 3, 16, '#874');
      // head: -5..5, -10..-4
      rotRect(-5, -10, 10, 6, '#888');
      // accent: -4..4, -9..-5
      rotRect(-4, -9, 8, 4, '#f88');
      break;
    }
    case 'knife': {
      // blade triangle
      const blade = [rotPt(0, -7), rotPt(-2, 2), rotPt(2, 2)];
      renderer.fillPoly(blade, '#8f8');
      // handle: -1.5..1.5, 2..6
      rotRect(-1.5, 2, 3, 4, '#a86');
      break;
    }
  }
}

// ── Draw circle using fillPoly fan ──
// We use renderer.fillCircle which is natively available
// Helper to build arc polygon points
function buildArcPoints(cx, cy, r, startAngle, endAngle, segments) {
  const pts = [{ x: cx, y: cy }];
  const step = (endAngle - startAngle) / segments;
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + step * i;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// Build outline circle ring points for strokePoly
function buildCirclePoints(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// ── Draw ──
function draw(renderer, text) {
  // Background
  renderer.fillRect(0, 0, W, H, '#1a1a2e');

  // Arena floor gradient — approximate with concentric filled circles
  // outer: #8a6830, mid: #b08840, center: #c9a05c
  // Draw 3 circles from outside in
  renderer.fillCircle(CX, CY, ARENA_R, '#8a6830');
  renderer.fillCircle(CX, CY, ARENA_R * 0.85, '#9a7638');
  renderer.fillCircle(CX, CY, ARENA_R * 0.6, '#b08840');
  renderer.fillCircle(CX, CY, ARENA_R * 0.3, '#c9a05c');

  // Sand grains
  for (const grain of sandGrains) {
    const shade = Math.floor(grain.shade * 255);
    // Convert shade to alpha hex
    const alphaHex = shade.toString(16).padStart(2, '0');
    renderer.fillRect(grain.x, grain.y, 1, 1, `#000000${alphaHex}`);
  }

  // Arena wall (outer ring stroked)
  renderer.setGlow('#654', 0.3);
  const wallPts = buildCirclePoints(CX, CY, ARENA_R, 48);
  renderer.strokePoly(wallPts, '#654', 6, true);
  renderer.setGlow(null);

  const wall2Pts = buildCirclePoints(CX, CY, ARENA_R + 3, 48);
  renderer.strokePoly(wall2Pts, '#432', 2, true);

  // Pillars
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i / 8);
    const px = CX + Math.cos(a) * (ARENA_R + 1);
    const py = CY + Math.sin(a) * (ARENA_R + 1);
    renderer.fillCircle(px, py, 5, '#765');
    const pillarRing = buildCirclePoints(px, py, 5, 12);
    renderer.strokePoly(pillarRing, '#543', 1, true);
  }

  // Blood stains (fading particles near end of life)
  for (const p of particles) {
    if (p.type === 'blood' && p.life < p.maxLife * 0.3) {
      const alpha = Math.floor((p.life / (p.maxLife * 0.3)) * 0.3 * 255);
      const alphaHex = Math.max(0, Math.min(255, alpha)).toString(16).padStart(2, '0');
      renderer.fillCircle(p.x, p.y, p.radius + 1, `#781414${alphaHex}`);
    }
  }

  // Pickups
  for (const p of pickups) {
    const bob = Math.sin(p.bobTimer) * 2;
    const py = p.y + bob;

    if (p.isHealth) {
      renderer.setGlow('#0f0', 0.5);
      // Green cross
      renderer.fillRect(p.x - 6, py - 2, 12, 4, '#2a2');
      renderer.fillRect(p.x - 2, py - 6, 4, 12, '#2a2');
      renderer.setGlow(null);
    } else {
      const wep = WEAPONS[p.type];
      renderer.setGlow(wep.color, 0.4);
      drawWeaponIcon(renderer, p.type, p.x, py, -Math.PI / 2);
      renderer.setGlow(null);
      text.drawText(wep.name, p.x, py + 10, 8, '#fff', 'center');
    }
  }

  // Projectiles (knife: rotated triangle)
  for (const p of projectiles) {
    const angle = Math.atan2(p.vy, p.vx);
    renderer.setGlow(p.color, 0.4);
    // Knife triangle: tip at +6 in direction, base at -3 with ±2 perpendicular
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const nx = -sin, ny = cos; // perpendicular
    const tip  = { x: p.x + cos * 6,      y: p.y + sin * 6 };
    const bl   = { x: p.x - cos * 3 - nx * 2, y: p.y - sin * 3 - ny * 2 };
    const br   = { x: p.x - cos * 3 + nx * 2, y: p.y - sin * 3 + ny * 2 };
    renderer.fillPoly([tip, bl, br], p.color);
    renderer.setGlow(null);
  }

  // Gladiators sorted by y for pseudo-depth
  const sortedGlads = gladiators.filter(g => g.alive).sort((a, b) => a.y - b.y);
  for (const g of sortedGlads) {
    // Dodge trail ghost
    if (g.dodging) {
      const gx = g.x - Math.cos(g.dodgeDir) * 10;
      const gy = g.y - Math.sin(g.dodgeDir) * 10;
      // 30% alpha version of color
      const trailColor = g.color + '4d'; // ~30% alpha
      renderer.fillCircle(gx, gy, g.radius, trailColor);
    }

    // Shadow (ellipse approximation — draw flat circle)
    renderer.fillCircle(g.x, g.y + g.radius * 0.5, g.radius * 0.8, '#00000050');

    // Body
    const bodyColor = g.hitFlash > 0 ? '#ffffff' : g.color;
    const alphaInt = g.iframes > 0 ? Math.floor(0.6 * 255) : 255;
    const alphaHex = alphaInt.toString(16).padStart(2, '0');
    const drawColor = (g.hitFlash > 0) ? `#ffffff${alphaHex}` : (g.iframes > 0 ? bodyColor + alphaHex : bodyColor);

    renderer.setGlow(g.color, 0.5);
    renderer.fillCircle(g.x, g.y, g.radius, drawColor);
    renderer.setGlow(null);

    // Inner highlight (white 15% alpha)
    renderer.fillCircle(g.x, g.y - 1, g.radius * 0.6, '#ffffff26');

    // Facing indicator (eye white)
    const ex = g.x + Math.cos(g.facing) * 6;
    const ey = g.y + Math.sin(g.facing) * 6;
    renderer.fillCircle(ex, ey, 3, '#ffffff');
    // Pupil
    const px2 = ex + Math.cos(g.facing) * 1.5;
    const py2 = ey + Math.sin(g.facing) * 1.5;
    renderer.fillCircle(px2, py2, 1.5, '#111111');

    // Weapon in hand
    if (g.weapon !== 'fists') {
      const swing = g.attacking ? Math.sin(g.attackTimer / WEAPONS[g.weapon].speed * Math.PI) * 0.8 : 0;
      const wAngle = g.facing + swing;
      // Translate weapon to g.radius+4 in facing direction, then add swing rotation
      const handX = g.x + Math.cos(g.facing) * (g.radius + 4);
      const handY = g.y + Math.sin(g.facing) * (g.radius + 4);
      drawWeaponIcon(renderer, g.weapon, handX, handY, wAngle);
    }

    // Attack arc visualization
    if (g.attacking && !WEAPONS[g.weapon].ranged) {
      const wep = WEAPONS[g.weapon];
      const progress = 1 - g.attackTimer / wep.speed;
      const swingAngle = g.facing - wep.arc / 2 + wep.arc * progress;
      const arcAlpha = Math.floor(0.15 * (1 - progress) * 255);
      const arcAlphaHex = arcAlpha.toString(16).padStart(2, '0');
      const arcPts = buildArcPoints(g.x, g.y, wep.range, g.facing - wep.arc / 2, swingAngle, 12);
      renderer.fillPoly(arcPts, `#ffffc8${arcAlphaHex}`);
    }

    // Name tag
    text.drawText(g.name, g.x, g.y - g.radius - 26, 9, '#ffffff', 'center');

    // HP bar background
    const hpW = 24;
    renderer.fillRect(g.x - hpW / 2, g.y - g.radius - 14, hpW, 4, '#333333');
    const hpFrac = Math.max(0, g.hp / g.maxHp);
    const hpColor = hpFrac > 0.5 ? '#22aa22' : hpFrac > 0.25 ? '#ddaa22' : '#aa2222';
    renderer.fillRect(g.x - hpW / 2, g.y - g.radius - 14, hpW * hpFrac, 4, hpColor);

    // Stamina bar (player only)
    if (g.isPlayer) {
      renderer.fillRect(g.x - hpW / 2, g.y - g.radius - 9, hpW, 3, '#333333');
      renderer.fillRect(g.x - hpW / 2, g.y - g.radius - 9, hpW * (g.stamina / g.maxStamina), 3, '#4488ff');
    }

    // Weapon label below gladiator
    if (g.weapon !== 'fists') {
      text.drawText(WEAPONS[g.weapon].name, g.x, g.y + g.radius + 5, 7, WEAPONS[g.weapon].color, 'center');
    }
  }

  // Dead gladiators (X marks)
  for (const g of gladiators) {
    if (g.alive) continue;
    renderer.drawLine(g.x - 6, g.y - 6, g.x + 6, g.y + 6, g.color + '66', 2);
    renderer.drawLine(g.x + 6, g.y - 6, g.x - 6, g.y + 6, g.color + '66', 2);
  }

  // Active particles
  for (const p of particles) {
    if (p.type === 'blood' && p.life < p.maxLife * 0.3) continue; // already drawn as stains
    const alpha = Math.floor((p.life / p.maxLife) * 255);
    const alphaHex = Math.max(0, Math.min(255, alpha)).toString(16).padStart(2, '0');
    const r = Math.max(0.5, p.radius * (p.life / p.maxLife));
    renderer.fillCircle(p.x, p.y, r, p.color + alphaHex);
  }

  // Player HUD
  const player = gladiators[0];
  if (player && gameState === 'playing') {
    text.drawText(`Weapon: ${WEAPONS[player.weapon].name}`, 10, H - 38, 12, '#ddaa44', 'left');
    text.drawText(`HP: ${Math.ceil(player.hp)}`, 10, H - 22, 10, '#aaaaaa', 'left');
    text.drawText(`Stamina: ${Math.ceil(player.stamina)}`, 120, H - 22, 10, '#aaaaaa', 'left');
    text.drawText(`Round ${round}`, W - 10, H - 22, 10, '#ddaa44', 'right');
  }
}

// ── Export ──
export function createGame() {
  const game = new Game('game');

  // Key handling — register additional keys the engine doesn't preventDefault for
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'Shift') keys.shift = true;
  });
  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    if (e.key === ' ') keys.space = false;
    if (e.key === 'Shift') keys.shift = false;
  });

  // Click to start / restart
  const canvas = document.getElementById('game');
  canvas.addEventListener('click', () => {
    if (gameState === 'menu') {
      startRound(game);
      game.setState('playing');
    } else if (gameState === 'gameOver') {
      score = 0;
      round = 1;
      scoreEl.textContent = 0;
      game.setState('playing');
      startRound(game);
    }
  });

  game.onInit = () => {
    gameState = 'menu';
    gladiators = [];
    pickups = [];
    particles = [];
    projectiles = [];
    sandGrains = [];
    score = 0;
    round = 1;
    scoreEl.textContent = 0;
    roundEl.textContent = 1;
    aliveEl.textContent = 4;
    generateSand();
    game.showOverlay('GLADIATOR PIT', 'Click to Enter the Arena');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const dt = 1 / 60;
    update(dt, game);
  };

  game.onDraw = (renderer, text) => {
    draw(renderer, text);
  };

  game.start();
  return game;
}
