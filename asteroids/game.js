// asteroids/game.js — Asteroids game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

const SHIP_SIZE = 15;
const TURN_SPEED = 0.07;
const THRUST = 0.12;
const FRICTION = 0.995;
const MAX_SPEED = 6;
const BULLET_SPEED = 7;
const BULLET_LIFE = 60;
const FIRE_RATE = 8;
const INVINCIBLE_TIME = 120;

let ship, bullets, asteroids, particles;
let score, lives, level;
let fireCooldown, invincibleTimer;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');

function createAsteroid(x, y, size) {
  const numVerts = 8 + Math.floor(Math.random() * 5);
  const verts = [];
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    const r = size * (0.7 + Math.random() * 0.3);
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  const speed = (4 - size / 15) * 0.6 + Math.random() * 0.5;
  const dir = Math.random() * Math.PI * 2;
  return {
    x, y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size, verts,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03
  };
}

function wrap(obj) {
  if (obj.x < -20) obj.x = W + 20;
  if (obj.x > W + 20) obj.x = -20;
  if (obj.y < -20) obj.y = H + 20;
  if (obj.y > H + 20) obj.y = -20;
}

function addParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      color
    });
  }
}

// Transform local verts by position and rotation
function transformVerts(verts, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return verts.map(v => ({
    x: cx + v.x * cos - v.y * sin,
    y: cy + v.x * sin + v.y * cos
  }));
}

export function createGame() {
  const game = new Game('game');

  function spawnAsteroids(count) {
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (Math.hypot(x - ship.x, y - ship.y) < 120);
      asteroids.push(createAsteroid(x, y, 40));
    }
  }

  game.onInit = () => {
    ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = 3;
    level = 1;
    fireCooldown = 0;
    invincibleTimer = INVINCIBLE_TIME;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    spawnAsteroids(4);
    game.showOverlay('ASTEROIDS', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
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

    // Ship controls
    if (input.isDown('ArrowLeft')) ship.angle -= TURN_SPEED;
    if (input.isDown('ArrowRight')) ship.angle += TURN_SPEED;
    ship.thrusting = input.isDown('ArrowUp');

    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > MAX_SPEED) {
        ship.vx = (ship.vx / speed) * MAX_SPEED;
        ship.vy = (ship.vy / speed) * MAX_SPEED;
      }
    }

    ship.vx *= FRICTION;
    ship.vy *= FRICTION;
    ship.x += ship.vx;
    ship.y += ship.vy;
    wrap(ship);

    if (invincibleTimer > 0) invincibleTimer--;

    // Fire bullets
    if (fireCooldown > 0) fireCooldown--;
    if (input.isDown(' ') && fireCooldown === 0) {
      bullets.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
        vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.3,
        vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.3,
        life: BULLET_LIFE
      });
      fireCooldown = FIRE_RATE;
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].x += bullets[i].vx;
      bullets[i].y += bullets[i].vy;
      wrap(bullets[i]);
      bullets[i].life--;
      if (bullets[i].life <= 0) bullets.splice(i, 1);
    }

    // Update asteroids
    for (const a of asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.rotSpeed;
      wrap(a);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Bullet-asteroid collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        const b = bullets[bi];
        if (!b || !a) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.size) {
          addParticles(a.x, a.y, 8, '#f44');
          if (a.size >= 35) {
            score += 20;
            asteroids.push(createAsteroid(a.x, a.y, 22));
            asteroids.push(createAsteroid(a.x, a.y, 22));
          } else if (a.size >= 18) {
            score += 50;
            asteroids.push(createAsteroid(a.x, a.y, 12));
            asteroids.push(createAsteroid(a.x, a.y, 12));
          } else {
            score += 100;
          }
          scoreEl.textContent = score;
          asteroids.splice(ai, 1);
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // Ship-asteroid collision
    if (invincibleTimer <= 0) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.size + SHIP_SIZE * 0.6) {
          addParticles(ship.x, ship.y, 15, '#f44');
          lives--;
          livesEl.textContent = lives;
          if (lives <= 0) {
            game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
            game.setState('over');
            return;
          }
          ship.x = W / 2;
          ship.y = H / 2;
          ship.vx = 0;
          ship.vy = 0;
          ship.angle = -Math.PI / 2;
          invincibleTimer = INVINCIBLE_TIME;
          break;
        }
      }
    }

    // Next level
    if (asteroids.length === 0) {
      level++;
      spawnAsteroids(3 + level);
    }
  };

  // Ship polygon (local coords, pointing right at angle=0)
  const shipVerts = [
    { x: SHIP_SIZE, y: 0 },
    { x: -SHIP_SIZE * 0.7, y: -SHIP_SIZE * 0.6 },
    { x: -SHIP_SIZE * 0.4, y: 0 },
    { x: -SHIP_SIZE * 0.7, y: SHIP_SIZE * 0.6 }
  ];

  // Mini ship for lives indicator
  const miniShipVerts = [
    { x: 10, y: 0 },
    { x: -7, y: -5 },
    { x: -4, y: 0 },
    { x: -7, y: 5 }
  ];

  game.onDraw = (renderer, text) => {
    // Particles
    for (const p of particles) {
      const alpha = p.life / 40;
      const r = parseInt(p.color.slice(1, 2), 16) / 15;
      const g = parseInt(p.color.slice(2, 3), 16) / 15;
      const b = parseInt(p.color.slice(3, 4), 16) / 15;
      renderer.fillRect(p.x - 1, p.y - 1, 2, 2, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha})`);
    }

    // Asteroids
    renderer.setGlow('#f44', 0.5);
    for (const a of asteroids) {
      const worldVerts = transformVerts(a.verts, a.x, a.y, a.rot);
      renderer.strokePoly(worldVerts, '#f44', 1.5, true);
    }

    // Ship
    if (invincibleTimer <= 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
      renderer.setGlow('#f44', 0.7);
      const worldShip = transformVerts(shipVerts, ship.x, ship.y, ship.angle);
      renderer.strokePoly(worldShip, '#f44', 2, true);

      // Thrust flame
      if (ship.thrusting) {
        const flameLen = SHIP_SIZE * (0.8 + Math.random() * 0.4);
        const flameVerts = [
          { x: -SHIP_SIZE * 0.5, y: -SHIP_SIZE * 0.25 },
          { x: -flameLen, y: 0 },
          { x: -SHIP_SIZE * 0.5, y: SHIP_SIZE * 0.25 }
        ];
        const worldFlame = transformVerts(flameVerts, ship.x, ship.y, ship.angle);
        renderer.setGlow('#f80', 0.6);
        renderer.strokePoly(worldFlame, '#f80', 1.5, false);
      }
    }

    // Bullets
    renderer.setGlow('#f44', 0.5);
    for (const b of bullets) {
      renderer.fillCircle(b.x, b.y, 2, '#fff');
    }

    // Lives indicator
    renderer.setGlow('#f44', 0.4);
    for (let i = 0; i < lives; i++) {
      const lx = 25 + i * 25;
      const ly = H - 20;
      const worldMini = transformVerts(miniShipVerts, lx, ly, -Math.PI / 2);
      renderer.strokePoly(worldMini, '#f44', 1.5, true);
    }
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
