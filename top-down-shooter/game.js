// top-down-shooter/game.js — Top-Down Shooter Arena for WebGL 2 engine

import { Game } from '../engine/core.js';

// ===== Constants =====
const W = 600, H = 600;
const MATCH_TIME = 180; // 3 minutes in seconds
const RESPAWN_TIME = 2000;
const PICKUP_RESPAWN = 8000;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 2.2;
const BULLET_SPEED = 7;

const WEAPONS = {
  pistol:  { name:'PISTOL',  color:'#aaa', fireRate:400, damage:20, spread:0.04, bullets:1, ammoMax:Infinity, speed:7, lifetime:500, size:2 },
  smg:     { name:'SMG',     color:'#4af', fireRate:100, damage:10, spread:0.1,  bullets:1, ammoMax:120, speed:8, lifetime:400, size:2 },
  shotgun: { name:'SHOTGUN', color:'#fa4', fireRate:700, damage:12, spread:0.15, bullets:5, ammoMax:24,  speed:6, lifetime:300, size:2 },
  rocket:  { name:'ROCKET',  color:'#f44', fireRate:1200,damage:60, spread:0.02, bullets:1, ammoMax:8,   speed:4, lifetime:800, size:4 }
};

const PLAYER_COLORS = ['#44ff44', '#4444ff', '#ffff44', '#ff44ff'];
const PLAYER_NAMES  = ['YOU', 'RED-BOT', 'BLU-BOT', 'YEL-BOT'];

// ===== Utility =====
function dist(a, b)   { return Math.hypot(a.x - b.x, a.y - b.y); }
function ang(a, b)    { return Math.atan2(b.y - a.y, b.x - a.x); }
function clamp(v,mn,mx){ return Math.max(mn, Math.min(mx, v)); }
function rnd(a, b)    { return a + Math.random() * (b - a); }

function rectContains(r, px, py) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return Math.hypot(cx - nx, cy - ny) < cr;
}

function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 0.0001) {
    if (x1 < rx || x1 > rx + rw) return false;
  } else {
    let t1 = (rx - x1) / dx, t2 = (rx + rw - x1) / dx;
    if (t1 > t2) { let tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 0.0001) {
    if (y1 < ry || y1 > ry + rh) return false;
  } else {
    let t1 = (ry - y1) / dy, t2 = (ry + rh - y1) / dy;
    if (t1 > t2) { let tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function hasLineOfSight(ax, ay, bx, by, walls) {
  for (const w of walls) {
    if (lineRectIntersect(ax, ay, bx, by, w.x, w.y, w.w, w.h)) return false;
  }
  return true;
}

function resolveWallCollision(px, py, r, walls) {
  let x = px, y = py;
  for (const w of walls) {
    if (circleRectCollide(x, y, r, w.x, w.y, w.w, w.h)) {
      const nx = clamp(x, w.x, w.x + w.w);
      const ny = clamp(y, w.y, w.y + w.h);
      const dx = x - nx, dy = y - ny;
      const d = Math.hypot(dx, dy);
      if (d < 0.001) {
        const oL = x - w.x + r, oR = (w.x + w.w) - x + r;
        const oT = y - w.y + r, oB = (w.y + w.h) - y + r;
        const minO = Math.min(oL, oR, oT, oB);
        if (minO === oL) x = w.x - r;
        else if (minO === oR) x = w.x + w.w + r;
        else if (minO === oT) y = w.y - r;
        else y = w.y + w.h + r;
      } else {
        const pen = r - d;
        x += (dx / d) * pen;
        y += (dy / d) * pen;
      }
    }
  }
  return { x, y };
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ===== Map =====
function buildMap() {
  const walls = [];
  const spawnPoints = [
    {x:60, y:60}, {x:W-60, y:60}, {x:60, y:H-60}, {x:W-60, y:H-60}
  ];

  // Border walls
  walls.push({x:0,   y:0,   w:W, h:8});
  walls.push({x:0,   y:H-8, w:W, h:8});
  walls.push({x:0,   y:0,   w:8, h:H});
  walls.push({x:W-8, y:0,   w:8, h:H});

  // Center cross
  walls.push({x:270, y:200, w:60, h:16});
  walls.push({x:270, y:384, w:60, h:16});
  walls.push({x:200, y:270, w:16, h:60});
  walls.push({x:384, y:270, w:16, h:60});

  // Corner covers
  walls.push({x:100, y:100, w:50, h:14}); walls.push({x:100, y:100, w:14, h:50});
  walls.push({x:450, y:100, w:50, h:14}); walls.push({x:486, y:100, w:14, h:50});
  walls.push({x:100, y:486, w:50, h:14}); walls.push({x:100, y:450, w:14, h:50});
  walls.push({x:450, y:486, w:50, h:14}); walls.push({x:486, y:450, w:14, h:50});

  // Side covers
  walls.push({x:280, y:80,  w:40, h:14}); walls.push({x:280, y:506, w:40, h:14});
  walls.push({x:80,  y:280, w:14, h:40}); walls.push({x:506, y:280, w:14, h:40});

  // Additional cover
  walls.push({x:170, y:170, w:30, h:30}); walls.push({x:400, y:170, w:30, h:30});
  walls.push({x:170, y:400, w:30, h:30}); walls.push({x:400, y:400, w:30, h:30});

  const pickupSpots = [
    {x:300, y:300, type:'weapon'}, {x:150, y:300, type:'weapon'},
    {x:450, y:300, type:'weapon'}, {x:300, y:150, type:'weapon'},
    {x:300, y:450, type:'weapon'},
    {x:100, y:200, type:'health'}, {x:500, y:200, type:'health'},
    {x:100, y:400, type:'health'}, {x:500, y:400, type:'health'},
    {x:200, y:100, type:'ammo'},   {x:400, y:100, type:'ammo'},
    {x:200, y:500, type:'ammo'},   {x:400, y:500, type:'ammo'},
  ];

  return { walls, spawnPoints, pickupSpots };
}

// ===== Pickups =====
function spawnPickup(spot) {
  if (spot.type === 'weapon') {
    const wTypes = ['smg', 'shotgun', 'rocket'];
    const weights = [4, 3, 1];
    const total = weights.reduce((a,b) => a+b, 0);
    let r = Math.random() * total, cum = 0;
    let chosen = 'smg';
    for (let i = 0; i < wTypes.length; i++) {
      cum += weights[i];
      if (r <= cum) { chosen = wTypes[i]; break; }
    }
    return { x:spot.x, y:spot.y, type:'weapon', weapon:chosen, alive:true, respawnTimer:0, spot };
  } else if (spot.type === 'health') {
    return { x:spot.x, y:spot.y, type:'health', amount:40, alive:true, respawnTimer:0, spot };
  } else {
    return { x:spot.x, y:spot.y, type:'ammo', amount:1, alive:true, respawnTimer:0, spot };
  }
}

// ===== Players =====
function createPlayer(index, isHuman, spawnPoints) {
  const sp = spawnPoints[index];
  return {
    x: sp.x, y: sp.y,
    vx: 0, vy: 0,
    angle: 0,
    color: PLAYER_COLORS[index],
    name: PLAYER_NAMES[index],
    index,
    isHuman,
    hp: 100, maxHp: 100,
    alive: true,
    respawnTimer: 0,
    weapon: 'pistol',
    ammo: { smg: 0, shotgun: 0, rocket: 0 },
    lastFire: 0,
    kills: 0,
    deaths: 0,
    muzzleFlash: 0,
    ai: isHuman ? null : {
      targetPlayer: null,
      moveTarget: null,
      moveTimer: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      aggression: rnd(0.3, 0.9),
      accuracy: rnd(0.85, 0.97),
      reactionTime: rnd(150, 400),
      lastSawEnemy: 0,
    }
  };
}

// ===== Main game factory =====
export function createGame() {
  const game = new Game('game');

  // --- State ---
  let players = [], bullets = [], pickups = [], particles = [];
  let walls = [], spawnPoints = [], pickupSpots = [];
  let timeLeft = MATCH_TIME;
  let score = 0;
  let matchEnded = false;

  // Mouse tracking (canvas-relative)
  let mouseX = W / 2, mouseY = H / 2;
  let mouseDown = false;
  let pickupPressed = false;

  // DOM HUD elements
  const sbKills    = document.getElementById('sb-kills');
  const sbDeaths   = document.getElementById('sb-deaths');
  const sbScore    = document.getElementById('sb-score');
  const sbTime     = document.getElementById('sb-time');
  const weaponHud  = document.getElementById('weapon-hud');
  const timerHud   = document.getElementById('timer-hud');

  // --- Mouse input on canvas ---
  game.canvas.addEventListener('mousemove', (e) => {
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top)  * scaleY;
  });
  game.canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; });
  game.canvas.addEventListener('mouseup',   (e) => { if (e.button === 0) mouseDown = false; });
  game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Particle helpers ---
  function spawnParticle(x, y, vx, vy, color, life, size) {
    particles.push({ x, y, vx, vy, color, life, maxLife: life, size: size || 2 });
  }

  function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(1, 4);
      spawnParticle(x, y, Math.cos(a)*s, Math.sin(a)*s, color, rnd(200, 500), rnd(1, 3));
    }
  }

  function spawnMuzzleParticles(x, y, angle) {
    for (let i = 0; i < 4; i++) {
      const a = angle + rnd(-0.4, 0.4);
      const s = rnd(2, 5);
      spawnParticle(x, y, Math.cos(a)*s, Math.sin(a)*s, '#ff8', rnd(80, 160), rnd(1, 2.5));
    }
  }

  // --- Bullet fire ---
  function fireBullet(player) {
    const weap = WEAPONS[player.weapon];
    const now = performance.now();
    if (now - player.lastFire < weap.fireRate) return;
    if (player.weapon !== 'pistol' && player.ammo[player.weapon] <= 0) {
      player.weapon = 'pistol';
      return;
    }
    player.lastFire = now;
    player.muzzleFlash = 100;
    if (player.weapon !== 'pistol') player.ammo[player.weapon] -= 1;

    const muzzleX = player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 4);
    const muzzleY = player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 4);
    spawnMuzzleParticles(muzzleX, muzzleY, player.angle);

    for (let i = 0; i < weap.bullets; i++) {
      const spread = (weap.bullets > 1)
        ? (i - (weap.bullets - 1) / 2) * weap.spread + rnd(-0.03, 0.03)
        : rnd(-weap.spread, weap.spread);
      const a = player.angle + spread;
      bullets.push({
        x: muzzleX, y: muzzleY,
        vx: Math.cos(a) * weap.speed,
        vy: Math.sin(a) * weap.speed,
        owner: player.index,
        damage: weap.damage,
        color: weap.color,
        size: weap.size,
        lifetime: weap.lifetime,
        born: now,
        weapon: player.weapon,
        trail: []
      });
    }
  }

  // --- Pickup logic ---
  function tryPickup(player, pickup) {
    if (!pickup.alive) return;
    if (pickup.type === 'weapon') {
      player.weapon = pickup.weapon;
      player.ammo[pickup.weapon] = WEAPONS[pickup.weapon].ammoMax;
      pickup.alive = false;
      pickup.respawnTimer = PICKUP_RESPAWN;
      spawnExplosion(pickup.x, pickup.y, WEAPONS[pickup.weapon].color, 8);
    } else if (pickup.type === 'health') {
      if (player.hp >= player.maxHp) return;
      player.hp = Math.min(player.maxHp, player.hp + pickup.amount);
      pickup.alive = false;
      pickup.respawnTimer = PICKUP_RESPAWN;
      spawnExplosion(pickup.x, pickup.y, '#44ff44', 8);
    } else if (pickup.type === 'ammo') {
      if (player.weapon === 'pistol') return;
      const w = player.weapon;
      if (player.ammo[w] >= WEAPONS[w].ammoMax) return;
      player.ammo[w] = Math.min(WEAPONS[w].ammoMax, player.ammo[w] + Math.ceil(WEAPONS[w].ammoMax * 0.3));
      pickup.alive = false;
      pickup.respawnTimer = PICKUP_RESPAWN;
      spawnExplosion(pickup.x, pickup.y, '#ffff44', 8);
    }
  }

  // --- Damage & death ---
  function damagePlayer(target, damage, attackerIndex) {
    if (!target.alive) return;
    target.hp -= damage;
    spawnExplosion(target.x, target.y, '#f44', 4);
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.respawnTimer = RESPAWN_TIME;
      target.deaths++;
      if (attackerIndex >= 0 && attackerIndex !== target.index) {
        players[attackerIndex].kills++;
      }
      spawnExplosion(target.x, target.y, target.color, 20);
      spawnExplosion(target.x, target.y, '#f44', 15);
    }
  }

  function respawnPlayer(p) {
    let bestSpawn = spawnPoints[p.index];
    let bestD = 0;
    for (const sp of spawnPoints) {
      let minEnemy = Infinity;
      for (const other of players) {
        if (other.index === p.index || !other.alive) continue;
        const d = dist(sp, other);
        if (d < minEnemy) minEnemy = d;
      }
      if (minEnemy > bestD) { bestD = minEnemy; bestSpawn = sp; }
    }
    p.x = bestSpawn.x; p.y = bestSpawn.y;
    p.hp = p.maxHp;
    p.alive = true;
    p.weapon = 'pistol';
    p.ammo = { smg: 0, shotgun: 0, rocket: 0 };
    spawnExplosion(p.x, p.y, p.color, 12);
  }

  // --- AI ---
  function getFlankPosition(p, enemy) {
    const a = ang(p, enemy);
    const idealDist = p.weapon === 'shotgun' ? 100 : p.weapon === 'rocket' ? 200 : 180;
    const currentDist = dist(p, enemy);
    if (currentDist > idealDist + 50) {
      return { x: enemy.x - Math.cos(a) * idealDist, y: enemy.y - Math.sin(a) * idealDist };
    } else if (currentDist < idealDist - 50) {
      return { x: p.x - Math.cos(a) * 80, y: p.y - Math.sin(a) * 80 };
    }
    const perpAngle = a + Math.PI / 2;
    return { x: p.x + Math.cos(perpAngle) * rnd(-80, 80), y: p.y + Math.sin(perpAngle) * rnd(-80, 80) };
  }

  function updateAI(p, dt, now) {
    if (!p.alive || !p.ai) return;
    const ai = p.ai;

    // Find closest visible enemy
    let closestEnemy = null, closestDist = Infinity;
    const threats = [];
    for (const other of players) {
      if (other.index === p.index || !other.alive) continue;
      const d = dist(p, other);
      if (hasLineOfSight(p.x, p.y, other.x, other.y, walls)) {
        threats.push({ player: other, dist: d });
        if (d < closestDist) { closestDist = d; closestEnemy = other; }
      }
    }

    if (threats.length > 0) {
      threats.sort((a, b) => (a.dist - (100 - a.player.hp) * 2) - (b.dist - (100 - b.player.hp) * 2));
      ai.targetPlayer = threats[0].player;
      closestEnemy = threats[0].player;
      closestDist = threats[0].dist;
      ai.lastSawEnemy = now;
    } else if (now - ai.lastSawEnemy > 2000) {
      ai.targetPlayer = null;
    }

    // Aim
    if (closestEnemy) {
      const targetAngle = ang(p, closestEnemy);
      const jitter = (1 - ai.accuracy) * rnd(-0.3, 0.3);
      let desired = targetAngle + jitter;
      let diff = desired - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.angle += diff * clamp(dt * 0.01, 0, 0.3);
    }

    // Movement decisions
    ai.moveTimer -= dt;
    if (ai.moveTimer <= 0 || !ai.moveTarget) {
      ai.moveTimer = rnd(500, 1500);
      ai.strafeDir *= -1;

      if (p.hp < 50) {
        let bestPk = null, bestDist = Infinity;
        for (const pk of pickups) {
          if (!pk.alive || pk.type !== 'health') continue;
          const d = dist(p, pk);
          if (d < bestDist) { bestDist = d; bestPk = pk; }
        }
        if (bestPk && bestDist < 300) {
          ai.moveTarget = { x: bestPk.x, y: bestPk.y };
        } else if (closestEnemy) {
          ai.moveTarget = getFlankPosition(p, closestEnemy);
        } else {
          ai.moveTarget = { x: rnd(60, W-60), y: rnd(60, H-60) };
        }
      } else if (p.weapon === 'pistol' && Math.random() < 0.6) {
        let bestPk = null, bestDist = Infinity;
        for (const pk of pickups) {
          if (!pk.alive || pk.type !== 'weapon') continue;
          const d = dist(p, pk);
          if (d < bestDist) { bestDist = d; bestPk = pk; }
        }
        if (bestPk && bestDist < 350) {
          ai.moveTarget = { x: bestPk.x, y: bestPk.y };
        } else if (closestEnemy) {
          ai.moveTarget = getFlankPosition(p, closestEnemy);
        } else {
          ai.moveTarget = { x: rnd(60, W-60), y: rnd(60, H-60) };
        }
      } else if (closestEnemy) {
        if (closestDist < 80 && p.hp < closestEnemy.hp) {
          const retreatAngle = ang(closestEnemy, p);
          ai.moveTarget = { x: p.x + Math.cos(retreatAngle) * 150, y: p.y + Math.sin(retreatAngle) * 150 };
        } else {
          ai.moveTarget = getFlankPosition(p, closestEnemy);
        }
      } else {
        let bestPk = null, bestDist = Infinity;
        for (const pk of pickups) {
          if (!pk.alive) continue;
          const d = dist(p, pk);
          const wantAmmo = pk.type === 'ammo' && p.weapon !== 'pistol' && p.ammo[p.weapon] < WEAPONS[p.weapon].ammoMax * 0.5;
          const wantWeap = pk.type === 'weapon' && p.weapon === 'pistol';
          if ((wantAmmo || wantWeap) && d < bestDist) { bestDist = d; bestPk = pk; }
        }
        ai.moveTarget = bestPk ? { x: bestPk.x, y: bestPk.y } : { x: rnd(60, W-60), y: rnd(60, H-60) };
      }
    }

    // Move
    let mvx = 0, mvy = 0;
    if (ai.moveTarget) {
      const d = dist(p, ai.moveTarget);
      if (d > 10) {
        const a = ang(p, ai.moveTarget);
        mvx = Math.cos(a); mvy = Math.sin(a);
        if (closestEnemy && closestDist < 250) {
          const perpA = a + (Math.PI / 2) * ai.strafeDir;
          mvx = mvx * 0.6 + Math.cos(perpA) * 0.4;
          mvy = mvy * 0.6 + Math.sin(perpA) * 0.4;
        }
      }
    }
    p.vx = mvx * PLAYER_SPEED;
    p.vy = mvy * PLAYER_SPEED;

    // Fire
    if (closestEnemy && closestDist < 350) {
      const angleDiff = Math.abs(normalizeAngle(ang(p, closestEnemy) - p.angle));
      if (angleDiff < 0.25) fireBullet(p);
    }

    // Try nearby pickups
    for (const pk of pickups) {
      if (!pk.alive) continue;
      if (dist(p, pk) < 28) tryPickup(p, pk);
    }

    // Switch to best weapon
    if (p.weapon !== 'pistol' && p.ammo[p.weapon] <= 0) {
      let best = 'pistol', bestPri = 0;
      const priority = { smg: 2, shotgun: 3, rocket: 4 };
      for (const wk of ['smg', 'shotgun', 'rocket']) {
        if (p.ammo[wk] > 0 && priority[wk] > bestPri) { best = wk; bestPri = priority[wk]; }
      }
      p.weapon = best;
    }
  }

  // --- Game init ---
  function initGame() {
    const map = buildMap();
    walls = map.walls;
    spawnPoints = map.spawnPoints;
    pickupSpots = map.pickupSpots;
    players = [];
    bullets = [];
    particles = [];
    pickups = [];
    timeLeft = MATCH_TIME;
    score = 0;
    matchEnded = false;

    for (let i = 0; i < 4; i++) players.push(createPlayer(i, i === 0, spawnPoints));
    for (const spot of pickupSpots) pickups.push(spawnPickup(spot));

    game.setState('playing');
  }

  // --- End match ---
  function endMatch() {
    if (matchEnded) return;
    matchEnded = true;
    const sorted = [...players].sort((a, b) => (b.kills - b.deaths) - (a.kills - a.deaths));
    const winner = sorted[0];
    const finalScore = players[0].kills - players[0].deaths;

    game.setState('over');

    // Build result HTML in overlay
    let scoresHtml = '<div class="final-scores">';
    sorted.forEach((p, i) => {
      const netS = p.kills - p.deaths;
      const cls = i === 0 ? 'winner' : '';
      const medal = i === 0 ? '>> ' : '   ';
      scoresHtml += `<div class="${cls}">${medal}${p.name}: ${p.kills}K/${p.deaths}D (${netS >= 0 ? '+' : ''}${netS})</div>`;
    });
    scoresHtml += '</div>';

    if (game.overlay) {
      game.overlay.style.display = 'flex';
      game.overlay.innerHTML = `
        <h2>MATCH OVER</h2>
        <h1 style="color:${winner.color}">${winner.name} WINS!</h1>
        ${scoresHtml}
        <p>Your score: ${finalScore}</p>
        <button id="restart-btn">PLAY AGAIN</button>
      `;
      document.getElementById('restart-btn').addEventListener('click', () => {
        initGame();
      });
    }
  }

  // --- onInit ---
  game.onInit = () => {
    game.showOverlay('TOP-DOWN SHOOTER ARENA', 'WASD Move | Mouse Aim | Click Shoot | E Pickup');
    game.setState('waiting');

    // Start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        initGame();
      });
    }

    // Build initial map for rendering (menu screen)
    const map = buildMap();
    walls = map.walls;
    spawnPoints = map.spawnPoints;
    pickupSpots = map.pickupSpots;
  };

  // --- Score ---
  game.setScoreFn(() => score);

  // --- Update (fixed 60Hz) ---
  const FIXED_MS = 1000 / 60;
  game.onUpdate = (dt) => {
    // Accept any game key to start or restart
    if (game.state === 'waiting' || game.state === 'over') {
      const startKeys = ['w','a','s','d','W','A','S','D','e','E','r','R',
                         'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '];
      for (const key of startKeys) {
        if (game.input.wasPressed(key)) { initGame(); return; }
      }
      return;
    }
    if (game.state !== 'playing') return;

    // Timer
    timeLeft -= dt / 1000;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endMatch();
      return;
    }

    const now = performance.now();

    // Human input
    const human = players[0];
    if (human && human.alive) {
      let mx = 0, my = 0;
      if (game.input.isDown('w') || game.input.isDown('W') || game.input.isDown('ArrowUp'))    my -= 1;
      if (game.input.isDown('s') || game.input.isDown('S') || game.input.isDown('ArrowDown'))  my += 1;
      if (game.input.isDown('a') || game.input.isDown('A') || game.input.isDown('ArrowLeft'))  mx -= 1;
      if (game.input.isDown('d') || game.input.isDown('D') || game.input.isDown('ArrowRight')) mx += 1;

      if (mx || my) {
        const len = Math.hypot(mx, my);
        human.vx = (mx / len) * PLAYER_SPEED;
        human.vy = (my / len) * PLAYER_SPEED;
      } else {
        human.vx = 0; human.vy = 0;
      }

      // Aim toward mouse
      human.angle = Math.atan2(mouseY - human.y, mouseX - human.x);

      // Shoot
      if (mouseDown) fireBullet(human);

      // Pickup (E key)
      if (game.input.wasPressed('e') || game.input.wasPressed('E')) {
        let closestPk = null, closestD = 40;
        for (const pk of pickups) {
          if (!pk.alive) continue;
          const d = dist(human, pk);
          if (d < closestD) { closestD = d; closestPk = pk; }
        }
        if (closestPk) tryPickup(human, closestPk);
      }

      // R = switch to pistol if out of ammo
      if (game.input.wasPressed('r') || game.input.wasPressed('R')) {
        if (human.weapon !== 'pistol' && human.ammo[human.weapon] <= 0) {
          human.weapon = 'pistol';
        }
      }
    }

    // AI updates
    for (const p of players) {
      if (!p.isHuman) updateAI(p, dt, now);
    }

    // Move players
    for (const p of players) {
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) respawnPlayer(p);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      const resolved = resolveWallCollision(p.x, p.y, PLAYER_RADIUS, walls);
      p.x = clamp(resolved.x, PLAYER_RADIUS + 8, W - PLAYER_RADIUS - 8);
      p.y = clamp(resolved.y, PLAYER_RADIUS + 8, H - PLAYER_RADIUS - 8);
      if (p.muzzleFlash > 0) p.muzzleFlash -= dt;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx;
      b.y += b.vy;

      // Lifetime
      if (now - b.born > b.lifetime) {
        if (b.weapon === 'rocket') {
          spawnExplosion(b.x, b.y, '#f44', 20);
          spawnExplosion(b.x, b.y, '#fa4', 15);
          for (const p of players) {
            if (!p.alive) continue;
            const d = dist(b, p);
            if (d < 60) damagePlayer(p, Math.round(b.damage * (1 - d / 60)), b.owner);
          }
        }
        bullets.splice(i, 1);
        continue;
      }

      // Wall hit
      let hitWall = false;
      for (const w of walls) {
        if (rectContains(w, b.x, b.y)) {
          hitWall = true;
          if (b.weapon === 'rocket') {
            spawnExplosion(b.x, b.y, '#f44', 20);
            spawnExplosion(b.x, b.y, '#fa4', 15);
            for (const p of players) {
              if (!p.alive) continue;
              const d = dist(b, p);
              if (d < 60) damagePlayer(p, Math.round(b.damage * (1 - d / 60)), b.owner);
            }
          } else {
            spawnExplosion(b.x, b.y, b.color, 3);
          }
          break;
        }
      }
      if (hitWall) { bullets.splice(i, 1); continue; }

      // Player hit
      let hitPlayer = false;
      for (const p of players) {
        if (!p.alive || p.index === b.owner) continue;
        if (dist(b, p) < PLAYER_RADIUS) {
          damagePlayer(p, b.damage, b.owner);
          if (b.weapon === 'rocket') {
            spawnExplosion(b.x, b.y, '#f44', 20);
            spawnExplosion(b.x, b.y, '#fa4', 15);
            for (const p2 of players) {
              if (!p2.alive || p2 === p) continue;
              const d = dist(b, p2);
              if (d < 60) damagePlayer(p2, Math.round(b.damage * 0.5 * (1 - d / 60)), b.owner);
            }
          } else {
            spawnExplosion(b.x, b.y, b.color, 4);
          }
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) { bullets.splice(i, 1); continue; }

      // Out of bounds
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
        bullets.splice(i, 1);
      }
    }

    // Pickups
    for (const pk of pickups) {
      if (!pk.alive) {
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0) {
          const newPk = spawnPickup(pk.spot);
          Object.assign(pk, newPk);
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vx *= 0.95;  pt.vy *= 0.95;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // HUD update
    if (players.length > 0) {
      const h = players[0];
      score = h.kills - h.deaths;
      if (sbKills)   sbKills.textContent   = h.kills;
      if (sbDeaths)  sbDeaths.textContent  = h.deaths;
      if (sbScore)   sbScore.textContent   = score;
      const mins = Math.floor(timeLeft / 60);
      const secs = Math.floor(timeLeft % 60);
      const timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
      if (sbTime)    sbTime.textContent    = timeStr;
      if (timerHud)  timerHud.textContent  = timeStr;

      if (weaponHud) {
        if (h.alive) {
          const w = WEAPONS[h.weapon];
          const ammoStr = h.weapon === 'pistol' ? '\u221e' : h.ammo[h.weapon];
          weaponHud.textContent = w.name + ' | ' + ammoStr;
          weaponHud.style.color = w.color;
          weaponHud.style.borderColor = w.color + '60';
        } else {
          weaponHud.textContent = 'RESPAWNING...';
          weaponHud.style.color = '#f44';
        }
      }
    }
  };

  // --- Draw ---
  game.onDraw = (renderer, text, alpha) => {
    const now = performance.now();

    // Background
    renderer.fillRect(0, 0, W, H, '#0d0d1a');

    // Grid
    for (let x = 0; x < W; x += 40) {
      renderer.drawLine(x, 0, x, H, '#ffffff08', 1);
    }
    for (let y = 0; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, '#ffffff08', 1);
    }

    // Walls
    for (const w of walls) {
      renderer.fillRect(w.x, w.y, w.w, w.h, '#2a2a3e');
      // border tint
      renderer.drawLine(w.x,       w.y,       w.x + w.w, w.y,       '#f4444426', 1);
      renderer.drawLine(w.x + w.w, w.y,       w.x + w.w, w.y + w.h, '#f4444426', 1);
      renderer.drawLine(w.x + w.w, w.y + w.h, w.x,       w.y + w.h, '#f4444426', 1);
      renderer.drawLine(w.x,       w.y + w.h, w.x,       w.y,       '#f4444426', 1);
    }

    // Pickups
    for (const pk of pickups) {
      if (!pk.alive) continue;
      const pulse = 0.7 + Math.sin(now * 0.004) * 0.3;
      const alpha8 = Math.round(0.8 * pulse * 255).toString(16).padStart(2, '0');

      if (pk.type === 'weapon') {
        const wDef = WEAPONS[pk.weapon];
        const col = wDef.color;
        // glow
        renderer.setGlow(col, 0.5 * pulse);
        renderer.fillRect(pk.x - 10, pk.y - 4, 20, 8, col + alpha8);
        renderer.setGlow(null);
        text.drawText(wDef.name.charAt(0), pk.x, pk.y - 5, 10, '#fff', 'center');
      } else if (pk.type === 'health') {
        renderer.setGlow('#44ff44', 0.5 * pulse);
        renderer.fillRect(pk.x - 3, pk.y - 8, 6, 16, '#44ff44' + alpha8);
        renderer.fillRect(pk.x - 8, pk.y - 3, 16, 6,  '#44ff44' + alpha8);
        renderer.setGlow(null);
      } else if (pk.type === 'ammo') {
        renderer.setGlow('#ffff44', 0.5 * pulse);
        renderer.fillRect(pk.x - 6, pk.y - 3, 12, 6, '#ffff44' + alpha8);
        renderer.fillRect(pk.x - 4, pk.y - 5, 8,  2, '#ffff44' + alpha8);
        renderer.setGlow(null);
      }
    }

    // Bullet trails and bullets
    for (const b of bullets) {
      // Trail
      if (b.trail.length > 1) {
        const trailAlpha = Math.round(0.3 * 255).toString(16).padStart(2, '0');
        const trailColor = b.color + trailAlpha;
        for (let i = 0; i < b.trail.length - 1; i++) {
          renderer.drawLine(b.trail[i].x, b.trail[i].y, b.trail[i+1].x, b.trail[i+1].y, trailColor, b.size * 0.8);
        }
        // last segment to current
        const last = b.trail[b.trail.length - 1];
        renderer.drawLine(last.x, last.y, b.x, b.y, trailColor, b.size * 0.8);
      }
      // Bullet
      renderer.setGlow(b.color, b.weapon === 'rocket' ? 0.8 : 0.4);
      renderer.fillCircle(b.x, b.y, b.size, b.color);
      renderer.setGlow(null);
    }

    // Particles
    for (const pt of particles) {
      const a = pt.life / pt.maxLife;
      const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
      const r = Math.max(0.5, pt.size * a);
      renderer.fillCircle(pt.x, pt.y, r, pt.color + alphaHex);
    }

    // Players
    for (const p of players) {
      if (!p.alive) continue;

      // Shadow
      renderer.fillCircle(p.x + 2, p.y + 3, PLAYER_RADIUS * 0.8, '#0000004d');

      // Body with glow
      renderer.setGlow(p.color, 0.5);
      renderer.fillCircle(p.x, p.y, PLAYER_RADIUS, p.color);
      renderer.setGlow(null);

      // Inner highlight
      renderer.fillCircle(p.x - 3, p.y - 3, PLAYER_RADIUS * 0.5, '#ffffff26');

      // Gun barrel
      const barrelStart = {
        x: p.x + Math.cos(p.angle) * PLAYER_RADIUS * 0.5,
        y: p.y + Math.sin(p.angle) * PLAYER_RADIUS * 0.5
      };
      const barrelEnd = {
        x: p.x + Math.cos(p.angle) * (PLAYER_RADIUS + 10),
        y: p.y + Math.sin(p.angle) * (PLAYER_RADIUS + 10)
      };
      renderer.drawLine(barrelStart.x, barrelStart.y, barrelEnd.x, barrelEnd.y, p.color, 3);

      // Weapon color at barrel tip
      renderer.fillCircle(barrelEnd.x, barrelEnd.y, 3, WEAPONS[p.weapon].color);

      // Muzzle flash
      if (p.muzzleFlash > 0) {
        const flashAlpha = p.muzzleFlash / 100;
        const flashX = p.x + Math.cos(p.angle) * (PLAYER_RADIUS + 12);
        const flashY = p.y + Math.sin(p.angle) * (PLAYER_RADIUS + 12);
        const fa1 = Math.round(flashAlpha * 0.9 * 255).toString(16).padStart(2, '0');
        const fa2 = Math.round(flashAlpha * 0.6 * 255).toString(16).padStart(2, '0');
        renderer.fillCircle(flashX, flashY, 6,  '#ffffff' + fa1);
        renderer.fillCircle(flashX, flashY, 10, '#ffff88' + fa2);
      }

      // Health bar
      const hbW = 28, hbH = 4;
      const hbX = p.x - hbW / 2;
      const hbY = p.y - PLAYER_RADIUS - 10;
      renderer.fillRect(hbX - 1, hbY - 1, hbW + 2, hbH + 2, '#00000080');
      const hpRatio = p.hp / p.maxHp;
      const hpColor = hpRatio > 0.6 ? '#44ff44' : hpRatio > 0.3 ? '#ffff44' : '#ff4444';
      renderer.fillRect(hbX, hbY, hbW * hpRatio, hbH, hpColor);

      // Name
      text.drawText(p.name, p.x, p.y - PLAYER_RADIUS - 22, 9, p.color, 'center');
    }

    // Respawn indicators for dead players
    for (const p of players) {
      if (p.alive) continue;
      const sp = spawnPoints[p.index];
      if (!sp) continue;
      const blink = 0.3 + Math.sin(now * 0.005) * 0.2;
      const blinkHex = Math.round(blink * 255).toString(16).padStart(2, '0');
      // Draw dashed circle approximation as an octagon stroke
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pts.push({ x: sp.x + Math.cos(a) * (PLAYER_RADIUS + 4), y: sp.y + Math.sin(a) * (PLAYER_RADIUS + 4) });
      }
      renderer.strokePoly(pts, p.color + blinkHex, 1, true);
      // Respawn timer text
      const alphaHex = Math.round(0.6 * 255).toString(16).padStart(2, '0');
      text.drawText((p.respawnTimer / 1000).toFixed(1) + 's', sp.x, sp.y - 5, 10, p.color + alphaHex, 'center');
    }

    // Kill-feed (scoreboard mini)
    renderer.fillRect(W - 140, 14, 130, players.length * 16 + 6, '#00000066');
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const netScore = p.kills - p.deaths;
      const netStr = (netScore >= 0 ? '+' : '') + netScore;
      text.drawText(p.name, W - 132, 22 + i * 16, 10, p.color, 'left');
      text.drawText(p.kills + 'K/' + p.deaths + 'D (' + netStr + ')', W - 18, 22 + i * 16, 10, p.color, 'right');
    }
  };

  game.start();
  return game;
}
