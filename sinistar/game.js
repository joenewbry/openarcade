// sinistar/game.js — Sinistar game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// World size (wraps around)
const WORLD = 3000;
const HALF = WORLD / 2;

// Player constants
const TURN_SPEED = 0.065;
const THRUST = 0.14;
const FRICTION = 0.993;
const MAX_SPEED = 5;
const SHIP_SIZE = 12;
const BULLET_SPEED = 8;
const BULLET_LIFE = 45;
const FIRE_RATE = 7;
const INVINCIBLE_TIME = 90;
const CRYSTALS_PER_BOMB = 5;

// Sinistar constants
const SINISTAR_PIECES = 20;
const SINISTAR_SIZE = 30;
const SINISTAR_CHASE_SPEED = 3.2;
const SINISTAR_WANDER_SPEED = 1.0;
const SINIBOMB_DAMAGE = 5;
const SINIBOMB_SPEED = 6;

// Entity counts
const NUM_PLANETOIDS = 18;
const NUM_WORKERS = 8;
const NUM_WARRIORS = 5;

// ── State ──
let ship, bullets, sinibombs, planetoids, crystals, workers, warriors;
let sinistar, particles;
let score, best = 0, lives, sinibombCount;
let fireCooldown, invincibleTimer;
let camX, camY;
let warningText, warningTimer;
let level;
let frameCount;
let pendingRespawns; // replaces setTimeout for worker/warrior respawns
let shiftConsumed; // one bomb per press

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');

// ── Helpers ──

function wrapDiff(a, b) {
  let d = a - b;
  if (d > HALF) d -= WORLD;
  if (d < -HALF) d += WORLD;
  return d;
}

function wrapCoord(v) {
  return ((v % WORLD) + WORLD) % WORLD;
}

function worldDist(ax, ay, bx, by) {
  const dx = wrapDiff(ax, bx);
  const dy = wrapDiff(ay, by);
  return Math.hypot(dx, dy);
}

function angleToward(fromX, fromY, toX, toY) {
  return Math.atan2(wrapDiff(toY, fromY), wrapDiff(toX, fromX));
}

function createPlanetoid(x, y) {
  const r = 18 + Math.random() * 14;
  const numVerts = 7 + Math.floor(Math.random() * 5);
  const verts = [];
  for (let i = 0; i < numVerts; i++) {
    const a = (i / numVerts) * Math.PI * 2;
    const rv = r * (0.75 + Math.random() * 0.25);
    verts.push({ x: Math.cos(a) * rv, y: Math.sin(a) * rv });
  }
  return {
    x, y, r, verts,
    crystals: 3 + Math.floor(Math.random() * 4),
    hp: 3 + Math.floor(Math.random() * 3),
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.005,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3
  };
}

function createWorker() {
  return {
    x: Math.random() * WORLD,
    y: Math.random() * WORLD,
    angle: Math.random() * Math.PI * 2,
    speed: 1.2 + Math.random() * 0.5,
    carrying: false,
    targetCrystal: null,
    hp: 2,
    r: 8
  };
}

function createWarrior() {
  return {
    x: Math.random() * WORLD,
    y: Math.random() * WORLD,
    angle: Math.random() * Math.PI * 2,
    speed: 1.8 + Math.random() * 0.8,
    hp: 3,
    r: 9,
    fireCooldown: 0,
    bullets: []
  };
}

function createSinistar() {
  return {
    x: Math.random() * WORLD,
    y: Math.random() * WORLD,
    pieces: 0,
    hp: SINISTAR_PIECES,
    angle: 0,
    complete: false,
    chargeTimer: 0,
    vx: 0,
    vy: 0,
    mouthOpen: 0
  };
}

function addParticles(x, y, count, color, speedMul) {
  speedMul = speedMul || 1;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (Math.random() * 2.5 + 0.5) * speedMul;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 15 + Math.random() * 20,
      color
    });
  }
}

function showWarning(text) {
  warningText = text;
  warningTimer = 90;
}

// Convert world to screen coords
function toScreen(wx, wy) {
  let dx = wrapDiff(wx, camX);
  let dy = wrapDiff(wy, camY);
  return { x: W / 2 + dx, y: H / 2 + dy };
}

function isOnScreen(wx, wy, margin) {
  const s = toScreen(wx, wy);
  return s.x > -margin && s.x < W + margin && s.y > -margin && s.y < H + margin;
}

// ── Main ──

export function createGame() {
  const game = new Game('game');

  function nextLevel() {
    level++;
    // Respawn planetoids
    for (let i = planetoids.length; i < NUM_PLANETOIDS; i++) {
      let px, py;
      do {
        px = Math.random() * WORLD;
        py = Math.random() * WORLD;
      } while (worldDist(px, py, ship.x, ship.y) < 200);
      planetoids.push(createPlanetoid(px, py));
    }
    // Respawn workers
    for (let i = workers.length; i < NUM_WORKERS + level; i++) {
      workers.push(createWorker());
    }
    // Respawn warriors
    for (let i = warriors.length; i < NUM_WARRIORS + level; i++) {
      warriors.push(createWarrior());
    }
    // New sinistar
    sinistar = createSinistar();
    showWarning('LEVEL ' + level);
    score += 500;
    scoreEl.textContent = score;
  }

  function playerHit() {
    addParticles(ship.x, ship.y, 15, '#f64');
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Press any key to restart');
      game.setState('over');
      return;
    }
    // Respawn
    invincibleTimer = INVINCIBLE_TIME;
    ship.vx = 0;
    ship.vy = 0;
  }

  game.onInit = () => {
    level = 1;
    frameCount = 0;
    pendingRespawns = [];
    shiftConsumed = false;
    ship = { x: WORLD / 2, y: WORLD / 2, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false, crystalCount: 0 };
    bullets = [];
    sinibombs = [];
    planetoids = [];
    crystals = [];
    workers = [];
    warriors = [];
    particles = [];
    score = 0;
    lives = 3;
    sinibombCount = 0;
    fireCooldown = 0;
    invincibleTimer = INVINCIBLE_TIME;
    warningText = '';
    warningTimer = 0;

    // Spawn planetoids away from player
    for (let i = 0; i < NUM_PLANETOIDS; i++) {
      let px, py;
      do {
        px = Math.random() * WORLD;
        py = Math.random() * WORLD;
      } while (worldDist(px, py, ship.x, ship.y) < 200);
      planetoids.push(createPlanetoid(px, py));
    }

    // Spawn workers
    for (let i = 0; i < NUM_WORKERS; i++) {
      workers.push(createWorker());
    }

    // Spawn warriors
    for (let i = 0; i < NUM_WARRIORS; i++) {
      warriors.push(createWarrior());
    }

    sinistar = createSinistar();

    scoreEl.textContent = '0';
    livesEl.textContent = lives;
    bombsEl.textContent = '0';
    camX = ship.x;
    camY = ship.y;

    game.showOverlay('SINISTAR', 'Press SPACE to start | LEFT/RIGHT: rotate | UP: thrust | SPACE: fire | SHIFT: sinibomb');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Shift')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Process pending respawns
    for (let i = pendingRespawns.length - 1; i >= 0; i--) {
      pendingRespawns[i].delay--;
      if (pendingRespawns[i].delay <= 0) {
        const r = pendingRespawns[i];
        if (r.type === 'worker') workers.push(createWorker());
        else warriors.push(createWarrior());
        pendingRespawns.splice(i, 1);
      }
    }

    // Ship controls
    if (input.isDown('ArrowLeft')) ship.angle -= TURN_SPEED;
    if (input.isDown('ArrowRight')) ship.angle += TURN_SPEED;
    ship.thrusting = input.isDown('ArrowUp');

    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > MAX_SPEED) {
        ship.vx = (ship.vx / sp) * MAX_SPEED;
        ship.vy = (ship.vy / sp) * MAX_SPEED;
      }
    }
    ship.vx *= FRICTION;
    ship.vy *= FRICTION;
    ship.x = wrapCoord(ship.x + ship.vx);
    ship.y = wrapCoord(ship.y + ship.vy);

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

    // Fire sinibomb (one per press)
    if (input.isDown('Shift') && !shiftConsumed && sinibombCount > 0 && sinibombs.length < 3) {
      sinibombCount--;
      bombsEl.textContent = sinibombCount;
      sinibombs.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
        vx: Math.cos(ship.angle) * SINIBOMB_SPEED + ship.vx * 0.2,
        vy: Math.sin(ship.angle) * SINIBOMB_SPEED + ship.vy * 0.2,
        life: 90
      });
      shiftConsumed = true;
    }
    if (!input.isDown('Shift')) shiftConsumed = false;

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = wrapCoord(b.x + b.vx);
      b.y = wrapCoord(b.y + b.vy);
      b.life--;
      if (b.life <= 0) bullets.splice(i, 1);
    }

    // Update sinibombs
    for (let i = sinibombs.length - 1; i >= 0; i--) {
      const sb = sinibombs[i];
      sb.x = wrapCoord(sb.x + sb.vx);
      sb.y = wrapCoord(sb.y + sb.vy);
      sb.life--;
      if (sb.life <= 0) {
        addParticles(sb.x, sb.y, 6, '#ff0');
        sinibombs.splice(i, 1);
      }
    }

    // Update planetoids (drift)
    for (const p of planetoids) {
      p.x = wrapCoord(p.x + p.vx);
      p.y = wrapCoord(p.y + p.vy);
      p.rot += p.rotSpeed;
    }

    // Update crystals (drift slowly)
    for (let i = crystals.length - 1; i >= 0; i--) {
      const c = crystals[i];
      c.x = wrapCoord(c.x + c.vx);
      c.y = wrapCoord(c.y + c.vy);
      c.vx *= 0.98;
      c.vy *= 0.98;
      c.life--;
      if (c.life <= 0) {
        crystals.splice(i, 1);
      }
    }

    // Player collects crystals
    for (let i = crystals.length - 1; i >= 0; i--) {
      const c = crystals[i];
      if (worldDist(ship.x, ship.y, c.x, c.y) < 20) {
        crystals.splice(i, 1);
        score += 10;
        scoreEl.textContent = score;
        ship.crystalCount = (ship.crystalCount || 0) + 1;
        if (ship.crystalCount >= CRYSTALS_PER_BOMB) {
          ship.crystalCount = 0;
          sinibombCount++;
          bombsEl.textContent = sinibombCount;
          showWarning('SINIBOMB READY!');
        }
      }
    }

    // Bullet-planetoid collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      for (let pi = planetoids.length - 1; pi >= 0; pi--) {
        const b = bullets[bi];
        const p = planetoids[pi];
        if (!b || !p) continue;
        if (worldDist(b.x, b.y, p.x, p.y) < p.r) {
          p.hp--;
          addParticles(b.x, b.y, 4, '#888');
          bullets.splice(bi, 1);
          if (p.hp <= 0) {
            for (let c = 0; c < p.crystals; c++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 0.5 + Math.random() * 1.5;
              crystals.push({
                x: p.x + Math.cos(a) * p.r * 0.5,
                y: p.y + Math.sin(a) * p.r * 0.5,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 600
              });
            }
            addParticles(p.x, p.y, 10, '#aaa', 1.5);
            planetoids.splice(pi, 1);
            score += 25;
            scoreEl.textContent = score;
          }
          break;
        }
      }
    }

    // Bullet-worker collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      for (let wi = workers.length - 1; wi >= 0; wi--) {
        const b = bullets[bi];
        const w = workers[wi];
        if (!b || !w) continue;
        if (worldDist(b.x, b.y, w.x, w.y) < w.r + 4) {
          w.hp--;
          bullets.splice(bi, 1);
          if (w.hp <= 0) {
            addParticles(w.x, w.y, 8, '#4af');
            if (w.carrying) {
              crystals.push({ x: w.x, y: w.y, vx: 0, vy: 0, life: 600 });
            }
            workers.splice(wi, 1);
            score += 50;
            scoreEl.textContent = score;
            // Schedule respawn via frame counter (~5-10 seconds at 60fps)
            pendingRespawns.push({ type: 'worker', delay: 300 + Math.floor(Math.random() * 300) });
          }
          break;
        }
      }
    }

    // Bullet-warrior collisions
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      for (let wi = warriors.length - 1; wi >= 0; wi--) {
        const b = bullets[bi];
        const w = warriors[wi];
        if (!b || !w) continue;
        if (worldDist(b.x, b.y, w.x, w.y) < w.r + 4) {
          w.hp--;
          bullets.splice(bi, 1);
          if (w.hp <= 0) {
            addParticles(w.x, w.y, 10, '#f44');
            warriors.splice(wi, 1);
            score += 100;
            scoreEl.textContent = score;
            pendingRespawns.push({ type: 'warrior', delay: 360 + Math.floor(Math.random() * 300) });
          }
          break;
        }
      }
    }

    // Sinibomb-sinistar collisions
    for (let si = sinibombs.length - 1; si >= 0; si--) {
      const sb = sinibombs[si];
      if (worldDist(sb.x, sb.y, sinistar.x, sinistar.y) < SINISTAR_SIZE + 10) {
        addParticles(sb.x, sb.y, 20, '#ff0', 2);
        addParticles(sinistar.x, sinistar.y, 15, '#f64', 1.5);
        sinistar.hp -= SINIBOMB_DAMAGE;
        sinibombs.splice(si, 1);
        score += 200;
        scoreEl.textContent = score;
        if (sinistar.hp <= 0) {
          addParticles(sinistar.x, sinistar.y, 40, '#f64', 3);
          addParticles(sinistar.x, sinistar.y, 30, '#ff0', 2);
          showWarning('SINISTAR DESTROYED!');
          score += 1000;
          scoreEl.textContent = score;
          nextLevel();
        }
      }
    }

    // Update workers AI
    for (const w of workers) {
      if (w.carrying) {
        const a = angleToward(w.x, w.y, sinistar.x, sinistar.y);
        w.angle = a;
        w.x = wrapCoord(w.x + Math.cos(a) * w.speed);
        w.y = wrapCoord(w.y + Math.sin(a) * w.speed);
        if (worldDist(w.x, w.y, sinistar.x, sinistar.y) < SINISTAR_SIZE + 10) {
          w.carrying = false;
          sinistar.pieces = Math.min(sinistar.pieces + 1, SINISTAR_PIECES);
          if (sinistar.pieces >= SINISTAR_PIECES && !sinistar.complete) {
            sinistar.complete = true;
            sinistar.hp = SINISTAR_PIECES;
            showWarning('BEWARE, I LIVE!');
          }
          addParticles(sinistar.x, sinistar.y, 5, '#4af');
        }
      } else {
        let nearest = null;
        let nearDist = Infinity;
        for (const c of crystals) {
          const d = worldDist(w.x, w.y, c.x, c.y);
          if (d < nearDist) {
            nearDist = d;
            nearest = c;
          }
        }
        if (nearest && nearDist < 800) {
          const a = angleToward(w.x, w.y, nearest.x, nearest.y);
          w.angle = a;
          w.x = wrapCoord(w.x + Math.cos(a) * w.speed);
          w.y = wrapCoord(w.y + Math.sin(a) * w.speed);
          if (nearDist < 12) {
            w.carrying = true;
            const idx = crystals.indexOf(nearest);
            if (idx >= 0) crystals.splice(idx, 1);
          }
        } else {
          let nearP = null;
          let nearPD = Infinity;
          for (const p of planetoids) {
            const d = worldDist(w.x, w.y, p.x, p.y);
            if (d < nearPD) {
              nearPD = d;
              nearP = p;
            }
          }
          if (nearP) {
            const a = angleToward(w.x, w.y, nearP.x, nearP.y);
            w.angle = a;
            w.x = wrapCoord(w.x + Math.cos(a) * w.speed * 0.7);
            w.y = wrapCoord(w.y + Math.sin(a) * w.speed * 0.7);
            if (nearPD < nearP.r + 5) {
              if (Math.random() < 0.01) {
                nearP.hp--;
                if (nearP.hp <= 0) {
                  for (let c = 0; c < nearP.crystals; c++) {
                    const ca = Math.random() * Math.PI * 2;
                    crystals.push({
                      x: nearP.x + Math.cos(ca) * 10,
                      y: nearP.y + Math.sin(ca) * 10,
                      vx: Math.cos(ca) * 0.8,
                      vy: Math.sin(ca) * 0.8,
                      life: 600
                    });
                  }
                  addParticles(nearP.x, nearP.y, 8, '#aaa');
                  const idx = planetoids.indexOf(nearP);
                  if (idx >= 0) planetoids.splice(idx, 1);
                }
              }
            }
          } else {
            w.x = wrapCoord(w.x + Math.cos(w.angle) * w.speed * 0.5);
            w.y = wrapCoord(w.y + Math.sin(w.angle) * w.speed * 0.5);
            if (Math.random() < 0.02) w.angle += (Math.random() - 0.5) * 0.5;
          }
        }
      }
    }

    // Update warriors AI (chase and shoot player)
    for (const w of warriors) {
      const dist = worldDist(w.x, w.y, ship.x, ship.y);
      const a = angleToward(w.x, w.y, ship.x, ship.y);
      w.angle = a;

      if (dist > 60) {
        w.x = wrapCoord(w.x + Math.cos(a) * w.speed);
        w.y = wrapCoord(w.y + Math.sin(a) * w.speed);
      } else {
        w.x = wrapCoord(w.x + Math.cos(a + Math.PI / 2) * w.speed * 0.5);
        w.y = wrapCoord(w.y + Math.sin(a + Math.PI / 2) * w.speed * 0.5);
      }

      w.fireCooldown--;
      if (w.fireCooldown <= 0 && dist < 350) {
        w.bullets.push({
          x: w.x, y: w.y,
          vx: Math.cos(a) * 4,
          vy: Math.sin(a) * 4,
          life: 60
        });
        w.fireCooldown = 50 + Math.floor(Math.random() * 30);
      }

      for (let i = w.bullets.length - 1; i >= 0; i--) {
        const b = w.bullets[i];
        b.x = wrapCoord(b.x + b.vx);
        b.y = wrapCoord(b.y + b.vy);
        b.life--;
        if (b.life <= 0) {
          w.bullets.splice(i, 1);
          continue;
        }
        if (invincibleTimer <= 0 && worldDist(b.x, b.y, ship.x, ship.y) < SHIP_SIZE + 3) {
          w.bullets.splice(i, 1);
          playerHit();
          break;
        }
      }
    }

    // Update sinistar
    if (sinistar.complete) {
      const a = angleToward(sinistar.x, sinistar.y, ship.x, ship.y);
      sinistar.angle = a;
      const chaseSpeed = SINISTAR_CHASE_SPEED + level * 0.15;
      sinistar.vx = Math.cos(a) * chaseSpeed;
      sinistar.vy = Math.sin(a) * chaseSpeed;
      sinistar.x = wrapCoord(sinistar.x + sinistar.vx);
      sinistar.y = wrapCoord(sinistar.y + sinistar.vy);
      sinistar.mouthOpen = Math.sin(frameCount * 0.6) * 0.3 + 0.3;

      sinistar.chargeTimer++;
      if (sinistar.chargeTimer % 120 === 0) {
        const dist = worldDist(sinistar.x, sinistar.y, ship.x, ship.y);
        if (dist < 300) {
          showWarning('RUN, COWARD!');
        } else if (Math.random() < 0.5) {
          const msgs = ['BEWARE!', 'RUN!', 'I HUNGER!', 'RUN, COWARD!'];
          showWarning(msgs[Math.floor(Math.random() * msgs.length)]);
        }
      }

      if (invincibleTimer <= 0 && worldDist(sinistar.x, sinistar.y, ship.x, ship.y) < SINISTAR_SIZE + SHIP_SIZE) {
        playerHit();
      }
    } else {
      sinistar.angle += Math.sin(frameCount * 0.06) * 0.02;
      sinistar.x = wrapCoord(sinistar.x + Math.cos(sinistar.angle) * SINISTAR_WANDER_SPEED);
      sinistar.y = wrapCoord(sinistar.y + Math.sin(sinistar.angle) * SINISTAR_WANDER_SPEED);

      if (sinistar.pieces >= SINISTAR_PIECES - 3 && sinistar.pieces < SINISTAR_PIECES) {
        if (Math.random() < 0.005) showWarning('BEWARE...');
      }
    }

    // Warrior collision with player
    if (invincibleTimer <= 0) {
      for (const w of warriors) {
        if (worldDist(w.x, w.y, ship.x, ship.y) < w.r + SHIP_SIZE) {
          playerHit();
          break;
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Warning timer
    if (warningTimer > 0) warningTimer--;

    // Camera follows ship
    camX = ship.x;
    camY = ship.y;

    if (score > best) best = score;
  };

  game.onDraw = (renderer, text) => {
    // Star background (parallax)
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137.5 + 50) % WORLD);
      const sy = ((i * 251.3 + 80) % WORLD);
      const s = toScreen(sx, sy);
      if (s.x >= 0 && s.x < W && s.y >= 0 && s.y < H) {
        renderer.fillRect(s.x, s.y, 1, 1, '#334');
      }
    }
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 193.7 + 200) % WORLD);
      const sy = ((i * 317.1 + 150) % WORLD);
      const s = toScreen(sx, sy);
      if (s.x >= 0 && s.x < W && s.y >= 0 && s.y < H) {
        renderer.fillRect(s.x, s.y, 1.5, 1.5, '#445');
      }
    }

    // Particles
    for (const p of particles) {
      const s = toScreen(p.x, p.y);
      if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) continue;
      const alpha = Math.max(0, p.life / 35);
      const c = parseHexAlpha(p.color, alpha);
      renderer.fillRect(s.x - 1, s.y - 1, 2, 2, c);
    }

    // Planetoids
    for (const p of planetoids) {
      if (!isOnScreen(p.x, p.y, p.r + 20)) continue;
      const s = toScreen(p.x, p.y);
      // Rotate verts and draw as polygon
      const cos = Math.cos(p.rot);
      const sin = Math.sin(p.rot);
      const pts = p.verts.map(v => ({
        x: s.x + v.x * cos - v.y * sin,
        y: s.y + v.x * sin + v.y * cos
      }));
      // Fill with translucent grey
      renderer.fillPoly(pts, 'rgba(136,136,136,0.2)');
      // Stroke outline
      renderer.setGlow('#666', 0.3);
      renderer.strokePoly(pts, '#888', 1.5, true);
      renderer.setGlow(null);
    }

    // Crystals
    for (const c of crystals) {
      if (!isOnScreen(c.x, c.y, 15)) continue;
      const s = toScreen(c.x, c.y);
      const blink = c.life < 120 ? (Math.floor(c.life / 8) % 2 === 0 ? 0.3 : 1.0) : 1.0;
      const color = blink < 1.0 ? 'rgba(68,255,255,' + blink + ')' : '#4ff';
      renderer.setGlow('#4ff', 0.6);
      renderer.fillPoly([
        { x: s.x, y: s.y - 6 },
        { x: s.x + 4, y: s.y },
        { x: s.x, y: s.y + 6 },
        { x: s.x - 4, y: s.y }
      ], color);
      renderer.setGlow(null);
    }

    // Workers
    for (const w of workers) {
      if (!isOnScreen(w.x, w.y, 20)) continue;
      const s = toScreen(w.x, w.y);
      const cos = Math.cos(w.angle);
      const sin = Math.sin(w.angle);
      const workerPts = [
        rotPt(s.x, s.y, 8, 0, cos, sin),
        rotPt(s.x, s.y, 0, -5, cos, sin),
        rotPt(s.x, s.y, -6, 0, cos, sin),
        rotPt(s.x, s.y, 0, 5, cos, sin)
      ];
      renderer.setGlow('#4af', 0.4);
      renderer.strokePoly(workerPts, '#4af', 1.5, true);
      renderer.setGlow(null);
      if (w.carrying) {
        renderer.fillRect(s.x - 2, s.y - 2, 4, 4, '#4ff');
      }
    }

    // Warriors
    for (const w of warriors) {
      if (!isOnScreen(w.x, w.y, 20)) continue;
      const s = toScreen(w.x, w.y);
      const cos = Math.cos(w.angle);
      const sin = Math.sin(w.angle);
      const warriorPts = [
        rotPt(s.x, s.y, 10, 0, cos, sin),
        rotPt(s.x, s.y, -7, -7, cos, sin),
        rotPt(s.x, s.y, -4, 0, cos, sin),
        rotPt(s.x, s.y, -7, 7, cos, sin)
      ];
      renderer.setGlow('#f44', 0.5);
      renderer.strokePoly(warriorPts, '#f44', 2, true);
      renderer.setGlow(null);

      // Warrior bullets
      renderer.setGlow('#f44', 0.3);
      for (const b of w.bullets) {
        const bs = toScreen(b.x, b.y);
        if (bs.x < -5 || bs.x > W + 5 || bs.y < -5 || bs.y > H + 5) continue;
        renderer.fillCircle(bs.x, bs.y, 2, '#f88');
      }
      renderer.setGlow(null);
    }

    // Sinistar
    if (isOnScreen(sinistar.x, sinistar.y, SINISTAR_SIZE + 20)) {
      const s = toScreen(sinistar.x, sinistar.y);
      drawSinistarGL(renderer, text, s.x, s.y);
    }

    // Player ship
    if (invincibleTimer <= 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
      const ps = toScreen(ship.x, ship.y);
      const cos = Math.cos(ship.angle);
      const sin = Math.sin(ship.angle);
      const shipPts = [
        rotPt(ps.x, ps.y, SHIP_SIZE, 0, cos, sin),
        rotPt(ps.x, ps.y, -SHIP_SIZE * 0.7, -SHIP_SIZE * 0.7, cos, sin),
        rotPt(ps.x, ps.y, -SHIP_SIZE * 0.3, 0, cos, sin),
        rotPt(ps.x, ps.y, -SHIP_SIZE * 0.7, SHIP_SIZE * 0.7, cos, sin)
      ];
      renderer.setGlow('#f64', 0.7);
      renderer.strokePoly(shipPts, '#f64', 2, true);
      renderer.setGlow(null);

      // Thrust flame
      if (ship.thrusting) {
        const flameLen = SHIP_SIZE * (0.7 + Math.random() * 0.4);
        const flamePts = [
          rotPt(ps.x, ps.y, -SHIP_SIZE * 0.4, -SHIP_SIZE * 0.25, cos, sin),
          rotPt(ps.x, ps.y, -flameLen, 0, cos, sin),
          rotPt(ps.x, ps.y, -SHIP_SIZE * 0.4, SHIP_SIZE * 0.25, cos, sin)
        ];
        renderer.setGlow('#ff0', 0.6);
        renderer.strokePoly(flamePts, '#ff0', 1.5, false);
        renderer.setGlow(null);
      }
    }

    // Player bullets
    renderer.setGlow('#f64', 0.4);
    for (const b of bullets) {
      const s = toScreen(b.x, b.y);
      if (s.x < -5 || s.x > W + 5 || s.y < -5 || s.y > H + 5) continue;
      renderer.fillCircle(s.x, s.y, 2, '#fff');
    }
    renderer.setGlow(null);

    // Sinibombs
    for (const sb of sinibombs) {
      const s = toScreen(sb.x, sb.y);
      if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) continue;
      renderer.setGlow('#ff0', 0.8);
      renderer.fillCircle(s.x, s.y, 5, '#ff0');
      renderer.setGlow(null);
    }

    // HUD: Sinistar build progress
    drawBuildMeterGL(renderer, text);

    // HUD: Minimap
    drawMinimapGL(renderer);

    // HUD: Crystal counter toward next bomb
    drawCrystalCounterGL(renderer, text);

    // Lives indicator
    for (let i = 0; i < lives; i++) {
      const cx = 20 + i * 22;
      const cy = H - 18;
      const cos = Math.cos(-Math.PI / 2);
      const sin = Math.sin(-Math.PI / 2);
      const lifePts = [
        rotPt(cx, cy, 8, 0, cos, sin),
        rotPt(cx, cy, -5, -4, cos, sin),
        rotPt(cx, cy, -3, 0, cos, sin),
        rotPt(cx, cy, -5, 4, cos, sin)
      ];
      renderer.setGlow('#f64', 0.3);
      renderer.strokePoly(lifePts, '#f64', 1.5, true);
      renderer.setGlow(null);
    }

    // Warning text
    if (warningTimer > 0) {
      const alpha = warningTimer > 60 ? 1 : warningTimer / 60;
      const pulse = 0.8 + Math.sin(frameCount * 0.9) * 0.2;
      const a = alpha * pulse;
      const color = 'rgba(255,102,68,' + a.toFixed(2) + ')';
      renderer.setGlow('#f64', 0.8);
      text.drawText(warningText, W / 2, 42, 28, color, 'center');
      renderer.setGlow(null);
    }

    // Off-screen sinistar indicator
    if (!isOnScreen(sinistar.x, sinistar.y, SINISTAR_SIZE)) {
      drawSinistarArrowGL(renderer);
    }
  };

  game.start();
  return game;
}

// ── Drawing helpers ──

function rotPt(cx, cy, lx, ly, cos, sin) {
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

function parseHexAlpha(hex, alpha) {
  // Convert #rgb or #rrggbb with alpha to rgba string
  if (hex.length === 4) {
    const r = parseInt(hex[1], 16) * 17;
    const g = parseInt(hex[2], 16) * 17;
    const b = parseInt(hex[3], 16) * 17;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
}

function drawSinistarGL(renderer, text, sx, sy) {
  const progress = sinistar.pieces / SINISTAR_PIECES;
  const size = SINISTAR_SIZE;
  const mouth = sinistar.complete ? sinistar.mouthOpen : 0;

  const r = Math.floor(100 + progress * 155);
  const g = Math.floor(40 + progress * 30);
  const b = Math.floor(20);
  const faceColor = 'rgb(' + r + ',' + g + ',' + b + ')';

  renderer.setGlow(sinistar.complete ? '#f64' : '#840', sinistar.complete ? 0.8 : 0.4);

  // Skull outline (circle approximation with polygon)
  const circPts = [];
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    circPts.push({ x: sx + Math.cos(a) * size, y: sy + Math.sin(a) * size });
  }
  renderer.strokePoly(circPts, faceColor, 2.5, true);

  // Fill partial based on build progress
  if (progress > 0) {
    const fillAlpha = 0.15 + progress * 0.25;
    const fr = Math.floor((100 + progress * 155) * fillAlpha);
    const fg = Math.floor((40 + progress * 30) * fillAlpha);
    const fb = Math.floor(20 * fillAlpha);
    renderer.fillPoly(circPts, 'rgba(' + r + ',' + g + ',' + b + ',' + fillAlpha.toFixed(2) + ')');
  }

  // Eyes
  if (progress > 0.2) {
    const eyeColor = sinistar.complete ? '#ff0' : '#a60';
    renderer.setGlow(eyeColor, sinistar.complete ? 0.7 : 0.3);
    // Left eye
    renderer.fillPoly([
      { x: sx - 14, y: sy - 10 },
      { x: sx - 8, y: sy - 6 },
      { x: sx - 14, y: sy - 2 }
    ], eyeColor);
    // Right eye
    renderer.fillPoly([
      { x: sx + 14, y: sy - 10 },
      { x: sx + 8, y: sy - 6 },
      { x: sx + 14, y: sy - 2 }
    ], eyeColor);
  }

  // Mouth
  if (progress > 0.4) {
    const mouthColor = sinistar.complete ? '#f44' : '#840';
    const mouthY = 8 + mouth * 6;
    const mouthPts = [
      { x: sx - 12, y: sy + 6 },
      { x: sx - 8, y: sy + mouthY },
      { x: sx - 3, y: sy + 6 + mouth * 2 },
      { x: sx, y: sy + mouthY },
      { x: sx + 3, y: sy + 6 + mouth * 2 },
      { x: sx + 8, y: sy + mouthY },
      { x: sx + 12, y: sy + 6 }
    ];
    renderer.strokePoly(mouthPts, mouthColor, 2, false);
  }

  // Nose
  if (progress > 0.6) {
    const nosePts = [
      { x: sx - 2, y: sy - 2 },
      { x: sx, y: sy + 3 },
      { x: sx + 2, y: sy - 2 }
    ];
    renderer.strokePoly(nosePts, faceColor, 1.5, false);
  }

  renderer.setGlow(null);
}

function drawBuildMeterGL(renderer, text) {
  const bw = 100;
  const bh = 8;
  const bx = W - bw - 10;
  const by = H - 26;
  const progress = sinistar.pieces / SINISTAR_PIECES;

  // Background
  renderer.fillRect(bx, by, bw, bh, '#16213e');
  // Border (using thin rects)
  renderer.fillRect(bx, by, bw, 1, '#0f3460');
  renderer.fillRect(bx, by + bh - 1, bw, 1, '#0f3460');
  renderer.fillRect(bx, by, 1, bh, '#0f3460');
  renderer.fillRect(bx + bw - 1, by, 1, bh, '#0f3460');

  // Fill
  const fillColor = sinistar.complete ? '#f44' : '#f64';
  if (sinistar.complete) renderer.setGlow('#f44', 0.5);
  renderer.fillRect(bx, by, bw * progress, bh, fillColor);
  renderer.setGlow(null);

  // Label
  const label = sinistar.complete ? 'SINISTAR LIVES!' : 'SINISTAR';
  text.drawText(label, bx + bw, by - 6, 10, '#aaa', 'right');
}

function drawMinimapGL(renderer) {
  const ms = 70;
  const mx = W - ms - 8;
  const my = 8;
  const scale = ms / WORLD;

  // Background
  renderer.fillRect(mx, my, ms, ms, 'rgba(22,33,62,0.8)');
  // Border
  renderer.fillRect(mx, my, ms, 1, '#0f3460');
  renderer.fillRect(mx, my + ms - 1, ms, 1, '#0f3460');
  renderer.fillRect(mx, my, 1, ms, '#0f3460');
  renderer.fillRect(mx + ms - 1, my, 1, ms, '#0f3460');

  // Planetoids
  for (const p of planetoids) {
    renderer.fillRect(mx + p.x * scale - 1, my + p.y * scale - 1, 2, 2, '#666');
  }

  // Crystals
  for (const c of crystals) {
    renderer.fillRect(mx + c.x * scale, my + c.y * scale, 1, 1, '#4ff');
  }

  // Workers
  for (const w of workers) {
    renderer.fillRect(mx + w.x * scale, my + w.y * scale, 2, 2, '#4af');
  }

  // Warriors
  for (const w of warriors) {
    renderer.fillRect(mx + w.x * scale, my + w.y * scale, 2, 2, '#f44');
  }

  // Sinistar
  renderer.fillRect(mx + sinistar.x * scale - 2, my + sinistar.y * scale - 2, 4, 4,
    sinistar.complete ? '#f44' : '#840');

  // Player
  renderer.fillRect(mx + ship.x * scale - 1, my + ship.y * scale - 1, 3, 3, '#f64');
}

function drawCrystalCounterGL(renderer, text) {
  const cx = 10;
  const cy = H - 42;
  const count = ship.crystalCount || 0;

  text.drawText('CRYSTALS', cx, cy - 8, 10, '#aaa', 'left');

  for (let i = 0; i < CRYSTALS_PER_BOMB; i++) {
    const dx = cx + 4 + i * 14;
    const dy = cy + 10;
    const filled = i < count;
    const pts = [
      { x: dx, y: dy - 4 },
      { x: dx + 4, y: dy },
      { x: dx, y: dy + 4 },
      { x: dx - 4, y: dy }
    ];
    if (filled) {
      renderer.setGlow('#4ff', 0.3);
      renderer.fillPoly(pts, '#4ff');
      renderer.setGlow(null);
    } else {
      renderer.strokePoly(pts, '#0f3460', 1, true);
    }
  }
}

function drawSinistarArrowGL(renderer) {
  const dx = wrapDiff(sinistar.x, camX);
  const dy = wrapDiff(sinistar.y, camY);
  const a = Math.atan2(dy, dx);
  const margin = 20;
  const ex = W / 2 + Math.cos(a) * (W / 2 - margin);
  const ey = H / 2 + Math.sin(a) * (H / 2 - margin);
  const clampX = Math.max(margin, Math.min(W - margin, ex));
  const clampY = Math.max(margin, Math.min(H - margin, ey));

  const color = sinistar.complete ? '#f44' : '#840';
  const pulse = sinistar.complete ? (0.6 + Math.sin(frameCount * 0.6) * 0.4) : 0.5;

  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const arrowPts = [
    rotPt(clampX, clampY, 10, 0, cos, sin),
    rotPt(clampX, clampY, -6, -6, cos, sin),
    rotPt(clampX, clampY, -6, 6, cos, sin)
  ];
  const alphaColor = parseHexAlpha(color, pulse);
  renderer.setGlow(color, sinistar.complete ? 0.5 : 0.2);
  renderer.fillPoly(arrowPts, alphaColor);
  renderer.setGlow(null);
}
