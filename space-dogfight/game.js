// space-dogfight/game.js — Space Dogfight as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 600;

// --- Constants ---
const MATCH_TIME = 180;
const TURN_SPEED = 0.065;
const THRUST = 0.12;
const MAX_SPEED = 3.5;
const FRICTION = 0.992;
const LASER_SPEED = 7;
const LASER_LIFE = 55;
const LASER_DMG = 12;
const LASER_COOLDOWN = 10;
const MISSILE_SPEED = 4;
const MISSILE_TURN = 0.045;
const MISSILE_LIFE = 180;
const MISSILE_DMG = 40;
const MAX_MISSILES = 5;
const MISSILE_RELOAD = 300;
const SHIELD_MAX = 100;
const SHIELD_REGEN = 0.06;
const SHIELD_DRAIN = 0.8;
const SHIELD_ABSORB = 0.7;
const BOOST_MAX = 100;
const BOOST_DRAIN = 1.2;
const BOOST_REGEN = 0.15;
const BOOST_MULT = 2.2;
const SHIP_HP = 100;
const RESPAWN_TIME = 120;
const SHIP_RADIUS = 10;
const NUM_ASTEROIDS = 8;
const NUM_STARS = 120;

const SHIP_COLORS = ['#4af', '#f44', '#4f4', '#fa4'];
const SHIP_NAMES = ['PLAYER', 'RED AI', 'GRN AI', 'GLD AI'];

// --- State ---
let ships, lasers, missiles, asteroids, particles, explosions, stars;
let score, timeLeft, frameTick;

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const leaderEl = document.getElementById('leader');

// --- Helpers ---
function wrap(obj) {
  if (obj.x < -20) obj.x += W + 40;
  if (obj.x > W + 20) obj.x -= W + 40;
  if (obj.y < -20) obj.y += H + 40;
  if (obj.y > H + 20) obj.y -= H + 40;
}

function wrapDist(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (dx > W / 2) dx -= W;
  if (dx < -W / 2) dx += W;
  if (dy > H / 2) dy -= H;
  if (dy < -H / 2) dy += H;
  return { dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
}

function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

// --- Factories ---
function createShip(id, isPlayer) {
  return {
    id, isPlayer,
    x: 100 + Math.random() * (W - 200),
    y: 100 + Math.random() * (H - 200),
    vx: 0, vy: 0,
    angle: Math.random() * Math.PI * 2,
    hp: SHIP_HP,
    alive: true,
    respawnTimer: 0,
    kills: 0,
    shield: SHIELD_MAX,
    shielding: false,
    boost: BOOST_MAX,
    boosting: false,
    missiles: MAX_MISSILES,
    missileReload: 0,
    laserCooldown: 0,
    thrustOn: false,
    aiTarget: null,
    aiMissileTimer: 60 + Math.random() * 120,
    aiThrust: false,
    aiShoot: false,
    aiMissile: false,
    aiShield: false,
    aiBoost: false,
    aiTurnDir: 0
  };
}

function createAsteroid() {
  const r = 18 + Math.random() * 22;
  const n = 7 + Math.floor(Math.random() * 5);
  const verts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r * (0.7 + Math.random() * 0.6);
    verts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
  }
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 1.0,
    vy: (Math.random() - 0.5) * 1.0,
    r, rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.015,
    verts
  };
}

function initStars() {
  stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.8 + 0.3,
      brightness: Math.random() * 0.5 + 0.3
    });
  }
}

// --- Particles ---
function spawnParticles(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed;
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.5 + Math.random() * 0.5),
      maxLife: life, color,
      size: Math.random() * 3 + 1
    });
  }
}

function spawnExplosion(x, y, size) {
  explosions.push({ x, y, r: 0, maxR: size, life: 1 });
  spawnParticles(x, y, '#ff8', 20, 4, 40);
  spawnParticles(x, y, '#f84', 15, 3, 30);
  spawnParticles(x, y, '#fff', 5, 2, 20);
}

// --- Combat ---
function damageShip(ship, dmg, attackerId) {
  if (!ship.alive) return;
  let actual = dmg;
  if (ship.shielding) {
    actual *= (1 - SHIELD_ABSORB);
    ship.shield -= dmg * 0.5;
    spawnParticles(ship.x, ship.y, '#8ef', 4, 2, 15);
  }
  ship.hp -= actual;
  if (ship.hp <= 0) {
    ship.hp = 0;
    ship.alive = false;
    ship.respawnTimer = RESPAWN_TIME;
    spawnExplosion(ship.x, ship.y, 40);
    if (attackerId !== undefined && attackerId !== ship.id) {
      ships[attackerId].kills++;
      if (attackerId === 0) {
        score = ships[0].kills;
        if (scoreEl) scoreEl.textContent = score;
      }
    }
  }
}

function fireLaser(ship) {
  if (ship.laserCooldown > 0) return;
  ship.laserCooldown = LASER_COOLDOWN;
  const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
  lasers.push({
    x: ship.x + cos * 14, y: ship.y + sin * 14,
    vx: cos * LASER_SPEED + ship.vx * 0.3,
    vy: sin * LASER_SPEED + ship.vy * 0.3,
    life: LASER_LIFE, owner: ship.id,
    color: SHIP_COLORS[ship.id]
  });
}

function fireMissile(ship) {
  if (ship.missiles <= 0) return;
  ship.missiles--;
  const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
  let target = null, minD = Infinity;
  for (const s of ships) {
    if (s.id === ship.id || !s.alive) continue;
    const d = wrapDist(ship.x, ship.y, s.x, s.y).dist;
    if (d < minD) { minD = d; target = s.id; }
  }
  missiles.push({
    x: ship.x + cos * 14, y: ship.y + sin * 14,
    vx: cos * MISSILE_SPEED * 0.5 + ship.vx * 0.5,
    vy: sin * MISSILE_SPEED * 0.5 + ship.vy * 0.5,
    angle: ship.angle, life: MISSILE_LIFE,
    owner: ship.id, target,
    color: SHIP_COLORS[ship.id]
  });
}

// --- AI ---
function updateAI(ship) {
  if (!ship.alive) return;

  let bestTarget = null, bestDist = Infinity;
  for (const s of ships) {
    if (s.id === ship.id || !s.alive) continue;
    const d = wrapDist(ship.x, ship.y, s.x, s.y).dist;
    if (d < bestDist) { bestDist = d; bestTarget = s; }
  }
  ship.aiTarget = bestTarget;
  ship.aiShoot = false;
  ship.aiMissile = false;
  ship.aiShield = false;
  ship.aiBoost = false;
  ship.aiThrust = false;
  ship.aiTurnDir = 0;

  if (!bestTarget) { ship.aiThrust = true; return; }

  const { dx, dy, dist } = wrapDist(ship.x, ship.y, bestTarget.x, bestTarget.y);

  const tHit = dist / LASER_SPEED;
  const predX = dx + (bestTarget.vx - ship.vx * 0.3) * tHit;
  const predY = dy + (bestTarget.vy - ship.vy * 0.3) * tHit;
  const targetAngle = Math.atan2(predY, predX);

  let angleDiff = targetAngle - ship.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (angleDiff > 0.05) ship.aiTurnDir = 1;
  else if (angleDiff < -0.05) ship.aiTurnDir = -1;

  if (dist > 150) ship.aiThrust = true;
  else if (dist < 80) ship.aiThrust = false;
  else ship.aiThrust = Math.abs(angleDiff) < 1.0;

  if (Math.abs(angleDiff) < 0.3 && dist < 400) ship.aiShoot = true;

  ship.aiMissileTimer--;
  if (ship.aiMissileTimer <= 0 && ship.missiles > 0 && dist < 300 && dist > 60 && Math.abs(angleDiff) < 0.6) {
    ship.aiMissile = true;
    ship.aiMissileTimer = 90 + Math.random() * 60;
  }

  let threatened = false;
  for (const l of lasers) {
    if (l.owner === ship.id) continue;
    const ld = wrapDist(ship.x, ship.y, l.x, l.y);
    if (ld.dist < 60) {
      const ldot = (-ld.dx * l.vx + -ld.dy * l.vy);
      if (ldot > 0) { threatened = true; break; }
    }
  }
  for (const m of missiles) {
    if (m.owner === ship.id) continue;
    const md = wrapDist(ship.x, ship.y, m.x, m.y);
    if (md.dist < 100) { threatened = true; break; }
  }
  if (threatened && ship.shield > 20) ship.aiShield = true;

  if (dist > 250 && ship.boost > 40) ship.aiBoost = true;

  for (const a of asteroids) {
    const ad = wrapDist(ship.x, ship.y, a.x, a.y);
    if (ad.dist < a.r + 40) {
      const avoidAngle = Math.atan2(-ad.dy, -ad.dx);
      let avoidDiff = avoidAngle - ship.angle;
      while (avoidDiff > Math.PI) avoidDiff -= Math.PI * 2;
      while (avoidDiff < -Math.PI) avoidDiff += Math.PI * 2;
      ship.aiTurnDir = avoidDiff > 0 ? 1 : -1;
      ship.aiThrust = true;
      break;
    }
  }
}

// --- Apply input ---
function applyInput(ship, input) {
  if (!ship.alive) return;

  let turnDir = 0, thrust = false, shoot = false;
  let missile = false, shield = false, boost = false;

  if (ship.isPlayer) {
    turnDir = (input.isDown('ArrowRight') || input.isDown('d') ? 1 : 0) -
              (input.isDown('ArrowLeft')  || input.isDown('a') ? 1 : 0);
    thrust = input.isDown('ArrowUp') || input.isDown('w');
    shoot  = input.isDown(' ');
    missile = input.wasPressed('z');
    shield  = input.isDown('x');
    boost   = input.isDown('c');
  } else {
    turnDir = ship.aiTurnDir;
    thrust  = ship.aiThrust;
    shoot   = ship.aiShoot;
    missile = ship.aiMissile;
    shield  = ship.aiShield;
    boost   = ship.aiBoost;
  }

  ship.angle += turnDir * TURN_SPEED;
  ship.thrustOn = thrust;

  let thrustPower = THRUST;
  ship.boosting = false;
  if (boost && ship.boost > 0) {
    thrustPower *= BOOST_MULT;
    ship.boost -= BOOST_DRAIN;
    ship.boosting = true;
    if (ship.boost < 0) ship.boost = 0;
  }

  if (thrust) {
    ship.vx += Math.cos(ship.angle) * thrustPower;
    ship.vy += Math.sin(ship.angle) * thrustPower;
  }

  const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  const maxSpd = ship.boosting ? MAX_SPEED * 1.6 : MAX_SPEED;
  if (spd > maxSpd) {
    ship.vx *= maxSpd / spd;
    ship.vy *= maxSpd / spd;
  }
  ship.vx *= FRICTION;
  ship.vy *= FRICTION;

  ship.shielding = shield && ship.shield > 5;
  if (ship.shielding) {
    ship.shield -= SHIELD_DRAIN;
    if (ship.shield < 0) ship.shield = 0;
  } else {
    ship.shield = Math.min(SHIELD_MAX, ship.shield + SHIELD_REGEN);
  }

  if (!ship.boosting) {
    ship.boost = Math.min(BOOST_MAX, ship.boost + BOOST_REGEN);
  }

  if (ship.missiles < MAX_MISSILES) {
    ship.missileReload++;
    if (ship.missileReload >= MISSILE_RELOAD) {
      ship.missileReload = 0;
      ship.missiles++;
    }
  }

  if (ship.laserCooldown > 0) ship.laserCooldown--;
  if (shoot) fireLaser(ship);
  if (missile) {
    fireMissile(ship);
    if (!ship.isPlayer) ship.aiMissile = false;
  }

  ship.x += ship.vx;
  ship.y += ship.vy;
  wrap(ship);
}

// --- Ship polygon (local coords, pointing right at angle=0) ---
const SHIP_BODY = [
  { x: 14, y: 0 },
  { x: -9, y: -8 },
  { x: -6, y: 0 },
  { x: -9, y: 8 }
];

// Missile shape (local coords)
const MISSILE_SHAPE = [
  { x: 6, y: 0 },
  { x: -4, y: -3 },
  { x: -4, y: 3 }
];

export function createGame() {
  const game = new Game('game');

  function initGame() {
    ships = [];
    lasers = [];
    missiles = [];
    asteroids = [];
    particles = [];
    explosions = [];
    timeLeft = MATCH_TIME;
    frameTick = 0;
    score = 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (timerEl) timerEl.textContent = '3:00';
    if (leaderEl) leaderEl.textContent = '---';

    for (let i = 0; i < 4; i++) {
      ships.push(createShip(i, i === 0));
    }
    ships[0].x = 150;      ships[0].y = 150;      ships[0].angle = Math.PI * 0.25;
    ships[1].x = W - 150;  ships[1].y = 150;      ships[1].angle = Math.PI * 0.75;
    ships[2].x = 150;      ships[2].y = H - 150;  ships[2].angle = -Math.PI * 0.25;
    ships[3].x = W - 150;  ships[3].y = H - 150;  ships[3].angle = -Math.PI * 0.75;

    for (let i = 0; i < NUM_ASTEROIDS; i++) {
      asteroids.push(createAsteroid());
    }
    initStars();
  }

  game.onInit = () => {
    initGame();
    game.showOverlay('SPACE DOGFIGHT', 'Click to Launch');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // --- Mouse click to start ---
  game.canvas.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') {
      initGame();
      game.setState('playing');
    }
  });

  // --- Update ---
  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;

    frameTick++;

    // Timer (60Hz fixed update)
    if (frameTick % 60 === 0) {
      timeLeft--;
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      if (timerEl) timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      if (timeLeft <= 0) { endMatch(); return; }
    }

    if (frameTick % 30 === 0) {
      const best = ships.reduce((a, b) => a.kills > b.kills ? a : b);
      if (leaderEl) leaderEl.textContent = SHIP_NAMES[best.id] + ' (' + best.kills + ')';
    }

    // AI
    for (const s of ships) {
      if (!s.isPlayer) updateAI(s);
    }

    // Ships
    for (const s of ships) {
      if (s.alive) {
        applyInput(s, game.input);
        if (s.thrustOn && frameTick % 2 === 0) {
          const ex = s.x - Math.cos(s.angle) * 12;
          const ey = s.y - Math.sin(s.angle) * 12;
          spawnParticles(ex, ey, s.boosting ? '#ff8' : '#f84', 2, 2, 15);
        }
      } else {
        s.respawnTimer--;
        if (s.respawnTimer <= 0) {
          s.alive = true;
          s.hp = SHIP_HP;
          s.shield = SHIELD_MAX;
          s.boost = BOOST_MAX;
          s.x = 100 + Math.random() * (W - 200);
          s.y = 100 + Math.random() * (H - 200);
          s.vx = 0; s.vy = 0;
          spawnParticles(s.x, s.y, SHIP_COLORS[s.id], 15, 3, 25);
        }
      }
    }

    // Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.x += l.vx; l.y += l.vy;
      l.life--;
      wrap(l);
      if (l.life <= 0) { lasers.splice(i, 1); continue; }
      let hit = false;
      for (const s of ships) {
        if (s.id === l.owner || !s.alive) continue;
        if (wrapDist(l.x, l.y, s.x, s.y).dist < SHIP_RADIUS + 3) {
          damageShip(s, LASER_DMG, l.owner);
          spawnParticles(l.x, l.y, l.color, 5, 2, 12);
          hit = true; break;
        }
      }
      if (hit) { lasers.splice(i, 1); continue; }
      for (const a of asteroids) {
        if (wrapDist(l.x, l.y, a.x, a.y).dist < a.r) {
          spawnParticles(l.x, l.y, '#888', 3, 1.5, 10);
          hit = true; break;
        }
      }
      if (hit) lasers.splice(i, 1);
    }

    // Missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.life--;
      if (m.life <= 0) {
        spawnParticles(m.x, m.y, '#ff8', 8, 2, 15);
        missiles.splice(i, 1); continue;
      }
      if (m.target !== null) {
        const t = ships[m.target];
        if (t && t.alive) {
          const d = wrapDist(m.x, m.y, t.x, t.y);
          const ta = Math.atan2(d.dy, d.dx);
          let diff = ta - m.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (diff > MISSILE_TURN) m.angle += MISSILE_TURN;
          else if (diff < -MISSILE_TURN) m.angle -= MISSILE_TURN;
          else m.angle = ta;
        }
      }
      m.vx = Math.cos(m.angle) * MISSILE_SPEED;
      m.vy = Math.sin(m.angle) * MISSILE_SPEED;
      m.x += m.vx; m.y += m.vy;
      wrap(m);
      if (frameTick % 2 === 0) spawnParticles(m.x, m.y, m.color, 1, 1, 12);

      let hit = false;
      for (const s of ships) {
        if (s.id === m.owner || !s.alive) continue;
        if (wrapDist(m.x, m.y, s.x, s.y).dist < SHIP_RADIUS + 5) {
          damageShip(s, MISSILE_DMG, m.owner);
          spawnExplosion(m.x, m.y, 25);
          hit = true; break;
        }
      }
      if (hit) { missiles.splice(i, 1); continue; }
      for (const a of asteroids) {
        if (wrapDist(m.x, m.y, a.x, a.y).dist < a.r) {
          spawnExplosion(m.x, m.y, 20);
          hit = true; break;
        }
      }
      if (hit) missiles.splice(i, 1);
    }

    // Asteroids
    for (const a of asteroids) {
      a.x += a.vx; a.y += a.vy;
      a.rot += a.rotSpeed;
      wrap(a);
      for (const s of ships) {
        if (!s.alive) continue;
        const d = wrapDist(a.x, a.y, s.x, s.y);
        if (d.dist < a.r + SHIP_RADIUS) {
          damageShip(s, 25, undefined);
          s.vx += (-d.dx / d.dist) * 3;
          s.vy += (-d.dy / d.dist) * 3;
          spawnParticles(s.x, s.y, '#888', 5, 2, 12);
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.life -= 0.04;
      e.r = e.maxR * (1 - e.life);
      if (e.life <= 0) explosions.splice(i, 1);
    }
  };

  // --- End match ---
  function endMatch() {
    const sorted = [...ships].sort((a, b) => b.kills - a.kills);
    const winner = sorted[0];
    const rank = sorted.findIndex(s => s.id === 0) + 1;
    const places = ['1st', '2nd', '3rd', '4th'];
    const titleEl = document.getElementById('overlayTitle');
    const textEl  = document.getElementById('overlayText');
    if (titleEl) {
      titleEl.textContent = winner.id === 0 ? 'VICTORY!' : 'MATCH OVER';
      titleEl.style.color = winner.id === 0 ? '#4f4' : '#4af';
    }
    let lines = places[rank - 1] + ' Place - ' + score + ' kills\n\n';
    for (const s of sorted) lines += SHIP_NAMES[s.id] + ': ' + s.kills + ' kills\n';
    lines += '\nClick to play again';
    if (textEl) textEl.textContent = lines;
    game.setState('over');
  }

  // --- Draw ---
  game.onDraw = (renderer, text) => {
    // Stars
    for (const s of stars) {
      const fl = Math.floor((s.brightness + Math.sin(frameTick * 0.02 + s.x) * 0.15) * 255);
      const alpha = Math.max(0, Math.min(255, fl));
      const hexA = alpha.toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, `#c8dcff${hexA}`);
    }

    // Asteroids
    renderer.setGlow('#666', 0.3);
    for (const a of asteroids) {
      const worldVerts = transformVerts(a.verts, a.x, a.y, a.rot);
      renderer.fillPoly(worldVerts, '#3a3a3a');
      renderer.strokePoly(worldVerts, '#666', 1, true);
    }
    renderer.setGlow(null);

    // Lasers
    for (const l of lasers) {
      const alpha = Math.floor((l.life / LASER_LIFE) * 255);
      const hexA = alpha.toString(16).padStart(2, '0');
      // Trail line
      renderer.setGlow(l.color, 0.6);
      renderer.drawLine(l.x, l.y, l.x - l.vx * 3, l.y - l.vy * 3, l.color + hexA, 2);
      // Tip dot
      renderer.fillCircle(l.x, l.y, 2, '#ffffff' + hexA);
    }
    renderer.setGlow(null);

    // Missiles
    renderer.setGlow('#f84', 0.7);
    for (const m of missiles) {
      const worldVerts = transformVerts(MISSILE_SHAPE, m.x, m.y, m.angle);
      renderer.fillPoly(worldVerts, m.color);
    }
    renderer.setGlow(null);

    // Particles
    for (const p of particles) {
      const alpha = Math.floor((p.life / p.maxLife) * 255);
      const hexA = alpha.toString(16).padStart(2, '0');
      const half = p.size / 2;
      renderer.fillRect(p.x - half, p.y - half, p.size, p.size, p.color + hexA);
    }

    // Explosions
    for (const e of explosions) {
      const alpha = Math.floor(e.life * 0.4 * 255);
      const strokeAlpha = Math.floor(e.life * 0.6 * 255);
      const hexA  = alpha.toString(16).padStart(2, '0');
      const hexAs = strokeAlpha.toString(16).padStart(2, '0');
      renderer.fillCircle(e.x, e.y, e.r, '#ffc850' + hexA);
      // Stroke ring via polygon approximation
      const ringPts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ringPts.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r });
      }
      renderer.strokePoly(ringPts, '#ff7828' + hexAs, 2, true);
    }

    // Ships
    for (const s of ships) {
      if (!s.alive) continue;
      const col = SHIP_COLORS[s.id];

      // Shield bubble
      if (s.shielding) {
        renderer.setGlow(col, 0.5);
        const r = SHIP_RADIUS + 6;
        const ringPts = [];
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          ringPts.push({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r });
        }
        renderer.fillPoly(ringPts, col + '20');
        renderer.strokePoly(ringPts, col + '80', 2, true);
      }

      // Engine glow
      if (s.thrustOn) {
        const glow = (4 + Math.random() * 6) * (s.boosting ? 1.8 : 1);
        const flameColor = s.boosting ? '#ff4' : '#f84';
        renderer.setGlow(flameColor, 0.8);
        const flameVerts = [
          { x: -7, y: -4 },
          { x: -7 - glow, y: 0 },
          { x: -7, y: 4 }
        ];
        const worldFlame = transformVerts(flameVerts, s.x, s.y, s.angle);
        renderer.fillPoly(worldFlame, flameColor);
      }

      // Ship body
      renderer.setGlow(col, 0.6);
      const worldBody = transformVerts(SHIP_BODY, s.x, s.y, s.angle);
      renderer.fillPoly(worldBody, col);
      renderer.strokePoly(worldBody, '#ffffff80', 0.5, true);

      renderer.setGlow(null);

      // HP bar
      if (s.hp < SHIP_HP) {
        const barW = 24, barH = 3;
        const bx = s.x - barW / 2, by = s.y - 18;
        renderer.fillRect(bx, by, barW, barH, '#333333');
        const ratio = s.hp / SHIP_HP;
        const barCol = ratio > 0.5 ? '#44ff44' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
        renderer.fillRect(bx, by, barW * ratio, barH, barCol);
      }

      // Ship name label
      text.drawText(SHIP_NAMES[s.id], s.x, s.y + 14, 8, col, 'center');
    }

    // HUD — player ship bars
    const p = ships[0];
    if (!p) return;
    const hudY = H - 12;

    // Shield bar (label + bar)
    renderer.fillRect(10, hudY - 22, 80, 8, '#333333');
    renderer.fillRect(10, hudY - 22, 80 * (p.shield / SHIELD_MAX), 8, '#44aaff');
    text.drawText('SHD', 94, hudY - 22, 11, '#88ccff', 'left');

    // Boost bar
    renderer.fillRect(10, hudY - 10, 80, 8, '#333333');
    renderer.fillRect(10, hudY - 10, 80 * (p.boost / BOOST_MAX), 8, '#ffaa44');
    text.drawText('BST', 94, hudY - 10, 11, '#ffcc88', 'left');

    // Missile pips
    let msl = 'MSL: ';
    for (let i = 0; i < MAX_MISSILES; i++) msl += i < p.missiles ? '\u25C6' : '\u25C7';
    text.drawText(msl, W - 10, hudY - 22, 11, '#ff8888', 'right');

    // HP
    const hpCol = p.hp > 50 ? '#44ff44' : p.hp > 25 ? '#ffaa44' : '#ff4444';
    text.drawText('HP: ' + Math.ceil(p.hp), W - 10, hudY - 10, 11, hpCol, 'right');

    // Respawn message
    if (!p.alive) {
      renderer.setGlow('#f44', 0.8);
      text.drawText('DESTROYED', W / 2, H / 2 - 10, 18, '#ff4444', 'center');
      renderer.setGlow(null);
      text.drawText('Respawning in ' + Math.ceil(p.respawnTimer / 60) + '...', W / 2, H / 2 + 10, 12, '#aaaaaa', 'center');
    }

    // Scoreboard (top-right)
    const sorted = [...ships].sort((a, b) => b.kills - a.kills);
    for (let i = 0; i < sorted.length; i++) {
      const sc = sorted[i];
      text.drawText(SHIP_NAMES[sc.id] + ': ' + sc.kills, W - 10, 14 + i * 14, 10, SHIP_COLORS[sc.id], 'right');
    }
  };

  game.start();
  return game;
}
