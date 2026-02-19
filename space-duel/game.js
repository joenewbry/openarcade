// space-duel/game.js — Space Duel game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;
const CX = W / 2;
const CY = H / 2;
const DT = 1 / 60; // fixed timestep to match engine's 60Hz tick

// Physics constants (same units as original — seconds-based, applied with DT)
const GRAVITY = 800;
const STAR_RADIUS = 18;
const STAR_GLOW = 40;
const TURN_SPEED = 3.5;
const THRUST = 200;
const MAX_SPEED = 250;
const FRICTION = 0.998;
const BULLET_SPEED = 350;
const BULLET_LIFE = 2.5;       // seconds
const FIRE_COOLDOWN = 0.3;     // seconds
const SHIP_SIZE = 12;
const RESPAWN_TIME = 1.5;      // seconds
const TRAIL_LENGTH = 20;
const MAX_LIVES = 3;
const ORBIT_RADIUS = 160;

// Background stars (generated once)
const bgStars = [];
for (let i = 0; i < 120; i++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.5 + 0.3
  });
}

// ── State ──
let score, best = 0;
let player, ai, bullets, particles;
let roundNum;

// DOM refs
const scoreEl = document.getElementById('score');
const playerLivesEl = document.getElementById('playerLives');
const aiLivesEl = document.getElementById('aiLives');

// ── Helper: transform local vertex list by position + angle ──
function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

// Ship polygon (local coords, pointing right at angle=0)
const shipVerts = [
  { x: SHIP_SIZE, y: 0 },
  { x: -SHIP_SIZE * 0.7, y: -SHIP_SIZE * 0.65 },
  { x: -SHIP_SIZE * 0.3, y: 0 },
  { x: -SHIP_SIZE * 0.7, y: SHIP_SIZE * 0.65 }
];

// Mini ship for lives indicator
const miniShipVerts = [
  { x: 8, y: 0 },
  { x: -5, y: -4 },
  { x: -3, y: 0 },
  { x: -5, y: 4 }
];

// Thrust flame verts (randomised length set at draw time)
function flameVerts(len) {
  return [
    { x: -SHIP_SIZE * 0.45, y: -SHIP_SIZE * 0.25 },
    { x: -len, y: 0 },
    { x: -SHIP_SIZE * 0.45, y: SHIP_SIZE * 0.25 }
  ];
}

function createShip(x, y, angle, color, isPlayer) {
  return {
    x, y,
    vx: 0, vy: 0,
    angle,
    color,
    lives: MAX_LIVES,
    fireCooldown: 0,
    invincible: RESPAWN_TIME,
    trail: [],
    alive: true,
    thrusting: false,
    isPlayer
  };
}

function setOrbitalVelocity(ship) {
  const dx = ship.x - CX;
  const dy = ship.y - CY;
  const dist = Math.hypot(dx, dy);
  const orbitalSpeed = Math.sqrt(GRAVITY / dist) * 0.7;
  const nx = dx / dist;
  const ny = dy / dist;
  if (ship.isPlayer) {
    ship.vx = -ny * orbitalSpeed;
    ship.vy = nx * orbitalSpeed;
  } else {
    ship.vx = ny * orbitalSpeed;
    ship.vy = -nx * orbitalSpeed;
  }
}

function applyGravity(obj) {
  const dx = CX - obj.x;
  const dy = CY - obj.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);
  if (dist < 1) return;
  const force = GRAVITY / distSq;
  obj.vx += (dx / dist) * force * DT;
  obj.vy += (dy / dist) * force * DT;
}

function wrap(obj) {
  if (obj.x < 0) obj.x += W;
  if (obj.x > W) obj.x -= W;
  if (obj.y < 0) obj.y += H;
  if (obj.y > H) obj.y -= H;
}

function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 120 + 40;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      color
    });
  }
}

function fireBullet(ship) {
  if (ship.fireCooldown > 0 || !ship.alive) return;
  const bx = ship.x + Math.cos(ship.angle) * SHIP_SIZE * 1.2;
  const by = ship.y + Math.sin(ship.angle) * SHIP_SIZE * 1.2;
  bullets.push({
    x: bx, y: by,
    vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.3,
    vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.3,
    life: BULLET_LIFE,
    owner: ship,
    color: ship.color
  });
  ship.fireCooldown = FIRE_COOLDOWN;
}

function respawnShip(ship) {
  const other = ship.isPlayer ? ai : player;
  const angle = Math.atan2(other.y - CY, other.x - CX) + Math.PI;
  ship.x = CX + Math.cos(angle) * ORBIT_RADIUS;
  ship.y = CY + Math.sin(angle) * ORBIT_RADIUS;
  ship.angle = Math.atan2(CY - ship.y, CX - ship.x) + Math.PI / 2;
  ship.vx = 0;
  ship.vy = 0;
  setOrbitalVelocity(ship);
  ship.alive = true;
  ship.invincible = RESPAWN_TIME;
  ship.trail = [];
}

export function createGame() {
  const game = new Game('game');

  function killShip(ship) {
    if (!ship.alive || ship.invincible > 0) return;
    ship.alive = false;
    ship.lives--;
    spawnParticles(ship.x, ship.y, 20, ship.color);

    if (ship.isPlayer) {
      playerLivesEl.textContent = ship.lives;
    } else {
      aiLivesEl.textContent = ship.lives;
      score += 100;
      scoreEl.textContent = score;
      if (score > best) best = score;
    }

    // Check for game over
    if (player.lives <= 0) {
      game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
      game.setState('over');
      return;
    }

    if (ai.lives <= 0) {
      // Player wins the round
      roundNum++;
      score += 500;
      scoreEl.textContent = score;
      if (score > best) best = score;
      ai.lives = MAX_LIVES;
      aiLivesEl.textContent = ai.lives;
    }

    respawnShip(ship);
  }

  function updateAI() {
    if (!ai.alive) return;

    const dx = player.x - ai.x;
    const dy = player.y - ai.y;
    const distToPlayer = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);

    const dxc = CX - ai.x;
    const dyc = CY - ai.y;
    const distToCenter = Math.hypot(dxc, dyc);

    let targetAngle = angleToPlayer;

    if (distToCenter < STAR_RADIUS * 4) {
      targetAngle = Math.atan2(-dyc, -dxc);
      ai.thrusting = true;
    } else if (distToPlayer < 80) {
      targetAngle = angleToPlayer + Math.PI * 0.6;
      ai.thrusting = true;
    } else {
      if (player.alive) {
        const leadTime = distToPlayer / BULLET_SPEED * 0.5;
        const predictX = player.x + player.vx * leadTime;
        const predictY = player.y + player.vy * leadTime;
        targetAngle = Math.atan2(predictY - ai.y, predictX - ai.x);
      }

      const desiredDist = ORBIT_RADIUS * 1.2;
      ai.thrusting = distToCenter > desiredDist + 30 || distToCenter < desiredDist - 30;
    }

    let angleDiff = targetAngle - ai.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (angleDiff > 0.05) ai.angle += TURN_SPEED * DT;
    else if (angleDiff < -0.05) ai.angle -= TURN_SPEED * DT;

    if (ai.thrusting) {
      ai.vx += Math.cos(ai.angle) * THRUST * DT;
      ai.vy += Math.sin(ai.angle) * THRUST * DT;
    }

    if (player.alive && Math.abs(angleDiff) < 0.3 && distToPlayer < 350) {
      fireBullet(ai);
    }
  }

  game.onInit = () => {
    score = 0;
    roundNum = 0;
    scoreEl.textContent = '0';

    player = createShip(CX - ORBIT_RADIUS, CY, 0, '#4cf', true);
    ai = createShip(CX + ORBIT_RADIUS, CY, Math.PI, '#f64', false);
    setOrbitalVelocity(player);
    setOrbitalVelocity(ai);

    bullets = [];
    particles = [];

    playerLivesEl.textContent = player.lives;
    aiLivesEl.textContent = ai.lives;

    game.showOverlay('SPACE DUEL', 'Press SPACE to start  |  LEFT/RIGHT: rotate  |  UP: thrust  |  SPACE: fire');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
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

    // ── Playing ──

    // Player input
    if (input.isDown('ArrowLeft')) player.angle -= TURN_SPEED * DT;
    if (input.isDown('ArrowRight')) player.angle += TURN_SPEED * DT;
    player.thrusting = input.isDown('ArrowUp');

    if (player.thrusting && player.alive) {
      player.vx += Math.cos(player.angle) * THRUST * DT;
      player.vy += Math.sin(player.angle) * THRUST * DT;
    }

    if (input.isDown(' ') && player.alive) {
      fireBullet(player);
    }

    // AI
    updateAI();

    // Gravity and movement for both ships
    const ships = [player, ai];
    for (const ship of ships) {
      if (!ship.alive) continue;

      applyGravity(ship);

      // Clamp speed
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > MAX_SPEED) {
        ship.vx = (ship.vx / speed) * MAX_SPEED;
        ship.vy = (ship.vy / speed) * MAX_SPEED;
      }

      // Friction
      ship.vx *= Math.pow(FRICTION, DT * 60);
      ship.vy *= Math.pow(FRICTION, DT * 60);

      ship.x += ship.vx * DT;
      ship.y += ship.vy * DT;
      wrap(ship);

      // Trail
      ship.trail.push({ x: ship.x, y: ship.y });
      if (ship.trail.length > TRAIL_LENGTH) ship.trail.shift();

      // Cooldowns
      if (ship.fireCooldown > 0) ship.fireCooldown -= DT;
      if (ship.invincible > 0) ship.invincible -= DT;

      // Star collision
      const dist = Math.hypot(ship.x - CX, ship.y - CY);
      if (dist < STAR_RADIUS + SHIP_SIZE * 0.5) {
        killShip(ship);
      }
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      applyGravity(b);
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      wrap(b);
      b.life -= DT;

      // Star collision
      const distToStar = Math.hypot(b.x - CX, b.y - CY);
      if (distToStar < STAR_RADIUS) {
        spawnParticles(b.x, b.y, 3, b.color);
        bullets.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }

      // Hit detection against ships
      let removed = false;
      for (const ship of ships) {
        if (b.owner === ship || !ship.alive || ship.invincible > 0) continue;
        const dist = Math.hypot(b.x - ship.x, b.y - ship.y);
        if (dist < SHIP_SIZE) {
          killShip(ship);
          bullets.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (removed) continue;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.life -= DT;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // ML gameData
    window.gameData = {
      playerX: player.x, playerY: player.y,
      playerAngle: player.angle, playerAlive: player.alive,
      aiX: ai.x, aiY: ai.y,
      aiAngle: ai.angle, aiAlive: ai.alive,
      bulletCount: bullets.length,
      playerLives: player.lives, aiLives: ai.lives
    };
  };

  game.onDraw = (renderer, text) => {
    // Background stars
    for (const s of bgStars) {
      const c = Math.round(s.brightness * 255);
      renderer.fillRect(s.x, s.y, s.size, s.size, `rgba(${c},${c},${c},1)`);
    }

    // Central star glow layers (concentric circles with decreasing alpha)
    renderer.setGlow('#ff8020', 0.8);
    renderer.fillCircle(CX, CY, STAR_GLOW, 'rgba(255,50,10,0.05)');
    renderer.fillCircle(CX, CY, STAR_GLOW * 0.7, 'rgba(255,100,30,0.12)');
    renderer.fillCircle(CX, CY, STAR_GLOW * 0.45, 'rgba(255,180,50,0.25)');

    // Central star core
    renderer.fillCircle(CX, CY, STAR_RADIUS, '#ffd060');
    renderer.setGlow(null);

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      renderer.fillRect(p.x - 1.5, p.y - 1.5, 3, 3, `rgba(255,255,255,${alpha})`);
    }

    // Ship trails
    const ships = [player, ai];
    for (const ship of ships) {
      if (ship.trail.length < 2) continue;
      const isP = ship.isPlayer;
      for (let i = 1; i < ship.trail.length; i++) {
        const alpha = (i / ship.trail.length) * 0.5;
        const dx = ship.trail[i].x - ship.trail[i - 1].x;
        const dy = ship.trail[i].y - ship.trail[i - 1].y;
        // Skip wrap-around segments
        if (Math.abs(dx) < W * 0.5 && Math.abs(dy) < H * 0.5) {
          const c = isP ? `rgba(68,204,255,${alpha})` : `rgba(255,102,68,${alpha})`;
          renderer.drawLine(
            ship.trail[i - 1].x, ship.trail[i - 1].y,
            ship.trail[i].x, ship.trail[i].y,
            c, 2
          );
        }
      }
    }

    // Ships
    for (const ship of ships) {
      if (!ship.alive) continue;
      // Blink when invincible
      if (ship.invincible > 0 && Math.floor(ship.invincible * 8) % 2 === 0) continue;

      renderer.setGlow(ship.color, 0.7);
      const worldShip = transformVerts(shipVerts, ship.x, ship.y, ship.angle);
      renderer.strokePoly(worldShip, ship.color, 2, true);

      // Thrust flame
      if (ship.thrusting) {
        const fLen = SHIP_SIZE * (0.8 + Math.random() * 0.5);
        const fv = flameVerts(fLen);
        const worldFlame = transformVerts(fv, ship.x, ship.y, ship.angle);
        renderer.setGlow('#fa0', 0.6);
        renderer.strokePoly(worldFlame, '#fa0', 1.5, false);
      }
    }
    renderer.setGlow(null);

    // Bullets
    for (const b of bullets) {
      renderer.setGlow(b.color, 0.5);
      renderer.fillCircle(b.x, b.y, 2.5, b.color);
    }
    renderer.setGlow(null);

    // Lives indicators — player (bottom-left)
    renderer.setGlow('#4cf', 0.4);
    for (let i = 0; i < player.lives; i++) {
      const lx = 20 + i * 22;
      const ly = H - 18;
      const mini = transformVerts(miniShipVerts, lx, ly, -Math.PI / 2);
      renderer.strokePoly(mini, '#4cf', 1.5, true);
    }

    // Lives indicators — AI (bottom-right)
    renderer.setGlow('#f64', 0.4);
    for (let i = 0; i < ai.lives; i++) {
      const lx = W - 20 - i * 22;
      const ly = H - 18;
      const mini = transformVerts(miniShipVerts, lx, ly, -Math.PI / 2);
      renderer.strokePoly(mini, '#f64', 1.5, true);
    }
    renderer.setGlow(null);

    // Round indicator
    if (roundNum > 0) {
      text.drawText('ROUND ' + (roundNum + 1), CX, H - 10, 12, '#c8a', 'center');
    }
  };

  game.start();
  return game;
}
