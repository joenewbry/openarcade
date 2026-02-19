// spy-hunter/game.js — Spy Hunter game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// ── Constants ──────────────────────────────────────────────
const ROAD_LEFT = 60;
const ROAD_RIGHT = W - 60;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const NUM_LANES = 4;
const LANE_W = ROAD_W / NUM_LANES;
const PLAYER_W = 28;
const PLAYER_H = 48;
const BULLET_SPEED = 8;
const MAX_BULLETS = 5;

// Enemy types
const ENEMY_TYPES = {
  roadLord:    { color: '#f44', glowColor: '#f44', w: 28, h: 44, speed: 0.6, points: 100, hp: 2, label: 'Road Lord' },
  switchblade: { color: '#ff0', glowColor: '#ff0', w: 30, h: 42, speed: 0.8, points: 150, hp: 1, label: 'Switchblade' },
  enforcer:    { color: '#f0f', glowColor: '#f0f', w: 26, h: 46, speed: 0.7, points: 200, hp: 1, label: 'Enforcer' },
};

const CIVILIAN_COLOR = '#4af';
const CIVILIAN_GLOW = '#4af';

// Power-up types
const POWERUP_TYPES = {
  oil:     { color: '#0f0', label: 'OIL', duration: 0 },
  smoke:   { color: '#aaa', label: 'SMK', duration: 300 },
  missile: { color: '#f80', label: 'MSL', duration: 0 },
};

// ── Game state ────────────────────────────────────────────
let score, best = 0;
let player, bullets, enemies, civilians, powerups, oilSlicks, particles;
let enforcerBullets;
let roadOffset, scrollSpeed, baseScrollSpeed;
let frameCount, distScore;
let spawnTimer, civilianTimer, powerupTimer;
let activePowerup, powerupTimeLeft;
let missileCount, oilCount;
let enemyScoreTotal;

// Road fork state
let fork, forkTimer;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helpers ─────────────────────────────────────────────
function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function addScore(pts) {
  if (pts > 0) enemyScoreTotal += pts;
  score = Math.max(0, Math.floor(distScore) + enemyScoreTotal);
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 / 14) * i + Math.random() * 0.4;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 18 + Math.random() * 12,
      color,
    });
  }
}

function spawnSpark(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 10,
      color: '#fff',
    });
  }
}

function spawnEnemy() {
  const difficulty = Math.min(frameCount / 7200, 1);
  let type;
  const r = Math.random();
  if (difficulty < 0.3) {
    type = r < 0.7 ? 'roadLord' : 'switchblade';
  } else if (difficulty < 0.6) {
    type = r < 0.4 ? 'roadLord' : r < 0.7 ? 'switchblade' : 'enforcer';
  } else {
    const types = Object.keys(ENEMY_TYPES);
    type = types[Math.floor(Math.random() * types.length)];
  }
  const info = ENEMY_TYPES[type];
  const lane = Math.floor(Math.random() * NUM_LANES);
  const lx = ROAD_LEFT + lane * LANE_W + (LANE_W - info.w) / 2;
  enemies.push({
    type,
    x: lx,
    y: -info.h - Math.random() * 60,
    w: info.w,
    h: info.h,
    hp: info.hp,
    phase: Math.random() * Math.PI * 2,
    shootTimer: Math.floor(Math.random() * 40),
  });
}

function spawnCivilian() {
  const w = 24, h = 40;
  const lane = Math.floor(Math.random() * NUM_LANES);
  const lx = ROAD_LEFT + lane * LANE_W + (LANE_W - w) / 2;
  civilians.push({
    x: lx,
    y: -h - Math.random() * 40,
    w, h,
    speed: 0.3 + Math.random() * 0.3,
  });
}

function spawnPowerup() {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * NUM_LANES);
  const lx = ROAD_LEFT + lane * LANE_W + LANE_W / 2;
  powerups.push({ type, x: lx, y: -20 });
}

function collectPowerup(p) {
  if (p.type === 'oil') {
    oilCount += 3;
  } else if (p.type === 'smoke') {
    activePowerup = 'smoke';
    powerupTimeLeft = POWERUP_TYPES.smoke.duration;
  } else if (p.type === 'missile') {
    missileCount += 3;
  }
  spawnSpark(p.x, p.y);
}

function fireWeapon() {
  if (bullets.length >= MAX_BULLETS) return;
  bullets.push({
    x: player.x + PLAYER_W / 2,
    y: player.y,
    type: 'bullet',
  });
}

function fireMissile() {
  if (missileCount <= 0) return;
  missileCount--;
  bullets.push({
    x: player.x + PLAYER_W / 2,
    y: player.y,
    type: 'missile',
  });
}

function dropOil() {
  if (oilCount <= 0) return;
  oilCount--;
  oilSlicks.push({
    x: player.x + PLAYER_W / 2,
    y: player.y + PLAYER_H + 5,
    life: 300,
  });
}

// ── Export ──────────────────────────────────────────────

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    enemyScoreTotal = 0;
    scoreEl.textContent = '0';

    player = {
      x: W / 2 - PLAYER_W / 2,
      y: H - 100,
      invincible: 0,
    };
    bullets = [];
    enemies = [];
    civilians = [];
    powerups = [];
    oilSlicks = [];
    particles = [];
    enforcerBullets = [];
    roadOffset = 0;
    scrollSpeed = 3;
    baseScrollSpeed = 3;
    frameCount = 0;
    distScore = 0;
    spawnTimer = 0;
    civilianTimer = 0;
    powerupTimer = 0;
    activePowerup = null;
    powerupTimeLeft = 0;
    missileCount = 0;
    oilCount = 0;
    fork = null;
    forkTimer = 0;

    game.showOverlay('SPY HUNTER', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ────────────────────────────────────────────
  game.onUpdate = () => {
    const input = game.input;

    // State transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('z') || input.wasPressed('Z') || input.wasPressed('x') || input.wasPressed('X')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Difficulty ramp: speed increases over ~2 minutes
    const difficulty = Math.min(frameCount / 7200, 1);
    scrollSpeed = baseScrollSpeed + difficulty * 3;

    // Player controls
    const playerSpeed = 4;
    if (input.isDown('ArrowLeft'))  player.x -= playerSpeed;
    if (input.isDown('ArrowRight')) player.x += playerSpeed;
    if (input.isDown('ArrowUp'))    player.y -= 2;
    if (input.isDown('ArrowDown'))  player.y += 2;

    // Clamp to road
    player.x = Math.max(ROAD_LEFT + 4, Math.min(ROAD_RIGHT - PLAYER_W - 4, player.x));
    player.y = Math.max(H * 0.3, Math.min(H - PLAYER_H - 10, player.y));

    // Road scroll
    roadOffset = (roadOffset + scrollSpeed) % 40;

    // Distance score
    distScore += scrollSpeed * 0.1;
    if (Math.floor(distScore) > score - enemyScoreTotal) {
      score = Math.floor(distScore) + enemyScoreTotal;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }

    // Invincibility countdown
    if (player.invincible > 0) player.invincible--;

    // Active power-up timer
    if (activePowerup === 'smoke' && powerupTimeLeft > 0) {
      powerupTimeLeft--;
      if (powerupTimeLeft <= 0) activePowerup = null;
    }

    // Fire weapons (wasPressed for per-press fire)
    if (input.wasPressed(' '))            fireWeapon();
    if (input.wasPressed('z') || input.wasPressed('Z')) fireMissile();
    if (input.wasPressed('x') || input.wasPressed('X')) dropOil();

    // ── Spawn enemies ──
    spawnTimer++;
    const spawnRate = Math.max(40, 100 - difficulty * 60);
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawnEnemy();
    }

    // ── Spawn civilians ──
    civilianTimer++;
    const civRate = Math.max(80, 180 - difficulty * 80);
    if (civilianTimer >= civRate) {
      civilianTimer = 0;
      spawnCivilian();
    }

    // ── Spawn power-ups ──
    powerupTimer++;
    if (powerupTimer >= 400) {
      powerupTimer = 0;
      spawnPowerup();
    }

    // ── Road forks ──
    forkTimer++;
    if (forkTimer > 600 && !fork && Math.random() < 0.003) {
      fork = {
        y: -200,
        side: Math.random() < 0.5 ? 'left' : 'right',
        active: true,
      };
      forkTimer = 0;
    }
    if (fork) {
      fork.y += scrollSpeed;
      if (fork.y > H + 300) fork = null;
    }

    // ── Update bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.type === 'missile') {
        b.y -= BULLET_SPEED * 1.5;
      } else {
        b.y -= BULLET_SPEED;
      }
      if (b.y < -20) { bullets.splice(i, 1); continue; }

      // Bullet vs enemies
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (rectCollide(b.x - 2, b.y, 4, 10, e.x, e.y, e.w, e.h)) {
          e.hp--;
          if (e.hp <= 0) {
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, ENEMY_TYPES[e.type].color);
            addScore(ENEMY_TYPES[e.type].points);
            enemies.splice(j, 1);
          } else {
            spawnSpark(e.x + e.w / 2, e.y + e.h / 4);
          }
          bullets.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      // Bullet vs civilians -- penalty!
      for (let j = civilians.length - 1; j >= 0; j--) {
        const c = civilians[j];
        if (rectCollide(b.x - 2, b.y, 4, 10, c.x, c.y, c.w, c.h)) {
          spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, '#4af');
          addScore(-200);
          civilians.splice(j, 1);
          bullets.splice(i, 1);
          break;
        }
      }
    }

    // ── Update enemies ──
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const typeInfo = ENEMY_TYPES[e.type];

      // Move downward relative to scroll
      e.y += scrollSpeed * typeInfo.speed;

      // Type-specific behavior
      if (e.type === 'roadLord') {
        const dx = (player.x + PLAYER_W / 2) - (e.x + e.w / 2);
        e.x += Math.sign(dx) * 1.2;
      } else if (e.type === 'switchblade') {
        e.x += Math.sin(frameCount * 0.06 + e.phase) * 2;
      } else if (e.type === 'enforcer') {
        e.shootTimer++;
        if (e.shootTimer >= 80) {
          e.shootTimer = 0;
          if (e.y > 0 && e.y < H * 0.7) {
            enforcerBullets.push({
              x: e.x + e.w / 2,
              y: e.y + e.h,
              vy: 4,
            });
          }
        }
      }

      // Clamp enemies to road
      e.x = Math.max(ROAD_LEFT + 2, Math.min(ROAD_RIGHT - e.w - 2, e.x));

      // Remove if off screen
      if (e.y > H + 50) { enemies.splice(i, 1); continue; }

      // Check oil slick collision
      for (let oi = oilSlicks.length - 1; oi >= 0; oi--) {
        const o = oilSlicks[oi];
        if (rectCollide(e.x, e.y, e.w, e.h, o.x - 12, o.y - 12, 24, 24)) {
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, typeInfo.color);
          addScore(typeInfo.points);
          enemies.splice(i, 1);
          oilSlicks.splice(oi, 1);
          break;
        }
      }

      // Collision with player
      if (i < enemies.length && player.invincible <= 0) {
        const e2 = enemies[i];
        if (e2 && rectCollide(player.x, player.y, PLAYER_W, PLAYER_H, e2.x, e2.y, e2.w, e2.h)) {
          if (activePowerup === 'smoke') continue;
          spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#e86');
          if (score > best) { best = score; bestEl.textContent = best; }
          game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
          game.setState('over');
          return;
        }
      }
    }

    // ── Update enforcer bullets ──
    for (let i = enforcerBullets.length - 1; i >= 0; i--) {
      enforcerBullets[i].y += enforcerBullets[i].vy;
      if (enforcerBullets[i].y > H + 10) { enforcerBullets.splice(i, 1); continue; }

      if (player.invincible <= 0 && rectCollide(
        enforcerBullets[i].x - 2, enforcerBullets[i].y, 4, 8,
        player.x, player.y, PLAYER_W, PLAYER_H)) {
        if (activePowerup === 'smoke') {
          enforcerBullets.splice(i, 1);
          continue;
        }
        spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#e86');
        if (score > best) { best = score; bestEl.textContent = best; }
        game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // ── Update civilians ──
    for (let i = civilians.length - 1; i >= 0; i--) {
      const c = civilians[i];
      c.y += scrollSpeed * c.speed;
      if (c.y > H + 50) { civilians.splice(i, 1); continue; }

      if (player.invincible <= 0 && rectCollide(player.x, player.y, PLAYER_W, PLAYER_H, c.x, c.y, c.w, c.h)) {
        addScore(-100);
        spawnSpark(c.x + c.w / 2, c.y + c.h / 2);
        civilians.splice(i, 1);
        player.invincible = 30;
      }
    }

    // ── Update power-ups ──
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += scrollSpeed * 0.5;
      if (p.y > H + 20) { powerups.splice(i, 1); continue; }

      if (rectCollide(player.x, player.y, PLAYER_W, PLAYER_H, p.x - 12, p.y - 12, 24, 24)) {
        collectPowerup(p);
        powerups.splice(i, 1);
      }
    }

    // ── Update oil slicks ──
    for (let i = oilSlicks.length - 1; i >= 0; i--) {
      oilSlicks[i].y += scrollSpeed;
      if (oilSlicks[i].y > H + 30) oilSlicks.splice(i, 1);
    }

    // ── Update particles ──
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      enemies: enemies.map(e => ({ x: e.x, y: e.y, type: e.type })),
      civilians: civilians.map(c => ({ x: c.x, y: c.y })),
      scrollSpeed,
      missileCount,
      oilCount,
      activePowerup,
    };
  };

  // ── Draw ────────────────────────────────────────────────
  game.onDraw = (renderer, text) => {
    // Grass / terrain edges
    renderer.fillRect(0, 0, ROAD_LEFT, H, '#0a2a0a');
    renderer.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H, '#0a2a0a');

    // Road surface
    renderer.fillRect(ROAD_LEFT, 0, ROAD_W, H, '#222');

    // Road edges (with glow)
    renderer.setGlow('#e86', 0.5);
    renderer.fillRect(ROAD_LEFT - 2, 0, 3, H, '#e86');
    renderer.fillRect(ROAD_RIGHT - 1, 0, 3, H, '#e86');
    renderer.setGlow(null);

    // Lane dashes
    for (let lane = 1; lane < NUM_LANES; lane++) {
      const lx = ROAD_LEFT + lane * LANE_W;
      for (let dy = -40 + (roadOffset % 40); dy < H; dy += 40) {
        renderer.fillRect(lx - 1, dy, 2, 20, '#555');
      }
    }

    // Road fork
    if (fork) {
      drawFork(renderer);
    }

    // Oil slicks
    renderer.setGlow('#0f0', 0.5);
    for (const o of oilSlicks) {
      renderer.fillCircle(o.x, o.y, 12, 'rgba(0,200,0,153)');
    }
    renderer.setGlow(null);

    // Power-ups
    for (const p of powerups) {
      const info = POWERUP_TYPES[p.type];
      const pulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
      renderer.setGlow(info.color, pulse * 0.7);
      renderer.fillCircle(p.x, p.y, 10, info.color);
      renderer.setGlow(null);
      text.drawText(info.label, p.x, p.y - 5, 8, '#1a1a2e', 'center');
    }

    // Civilians
    for (const c of civilians) {
      drawCivilian(renderer, c);
    }

    // Enemies
    for (const e of enemies) {
      drawEnemy(renderer, e);
    }

    // Enforcer bullets
    renderer.setGlow('#f0f', 0.5);
    for (const b of enforcerBullets) {
      renderer.fillRect(b.x - 2, b.y, 4, 8, '#f0f');
    }
    renderer.setGlow(null);

    // Player bullets
    for (const b of bullets) {
      if (b.type === 'missile') {
        renderer.setGlow('#f80', 0.6);
        renderer.fillPoly([
          { x: b.x, y: b.y - 6 },
          { x: b.x - 3, y: b.y + 6 },
          { x: b.x + 3, y: b.y + 6 },
        ], '#f80');
        renderer.setGlow(null);
      } else {
        renderer.setGlow('#e86', 0.5);
        renderer.fillRect(b.x - 1.5, b.y, 3, 10, '#e86');
        renderer.setGlow(null);
      }
    }

    // Player car
    drawPlayerCar(renderer);

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 30);
      // Parse the #rgb short hex color for rgba conversion
      const rc = parseInt(p.color.slice(1, 2), 16) / 15;
      const gc = parseInt(p.color.slice(2, 3), 16) / 15;
      const bc = parseInt(p.color.slice(3, 4), 16) / 15;
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4,
        `rgba(${Math.round(rc * 255)},${Math.round(gc * 255)},${Math.round(bc * 255)},${alpha})`);
    }

    // Smoke screen effect
    if (activePowerup === 'smoke' && powerupTimeLeft > 0) {
      const smokeAlpha = Math.min(0.3, powerupTimeLeft / 300 * 0.3);
      renderer.fillRect(player.x - 20, player.y - 15, PLAYER_W + 40, PLAYER_H + 30,
        `rgba(180,180,180,${smokeAlpha})`);
    }

    // HUD - weapon indicators
    drawHUD(renderer, text);
  };

  // ── Car drawing helpers ──────────────────────────────────

  function drawPlayerCar(renderer) {
    const x = player.x, y = player.y;
    const blinkOff = player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0;
    if (blinkOff) return;

    renderer.setGlow('#e86', 0.6);

    // Car body
    renderer.fillRect(x + 4, y + 6, PLAYER_W - 8, PLAYER_H - 10, '#e86');

    // Hood / front (triangle)
    renderer.fillPoly([
      { x: x + 6, y: y + 6 },
      { x: x + PLAYER_W / 2, y: y },
      { x: x + PLAYER_W - 6, y: y + 6 },
    ], '#d75');

    // Rear
    renderer.fillRect(x + 5, y + PLAYER_H - 8, PLAYER_W - 10, 8, '#c64');

    // Windshield
    renderer.fillRect(x + 8, y + 14, PLAYER_W - 16, 8, '#4af');

    // Wheels
    renderer.fillRect(x + 1, y + 8, 4, 10, '#333');
    renderer.fillRect(x + PLAYER_W - 5, y + 8, 4, 10, '#333');
    renderer.fillRect(x + 1, y + PLAYER_H - 14, 4, 10, '#333');
    renderer.fillRect(x + PLAYER_W - 5, y + PLAYER_H - 14, 4, 10, '#333');

    // Gun barrel
    renderer.fillRect(x + PLAYER_W / 2 - 1, y - 4, 2, 6, '#aaa');

    renderer.setGlow(null);
  }

  function drawEnemy(renderer, e) {
    const info = ENEMY_TYPES[e.type];
    const x = e.x, y = e.y;

    renderer.setGlow(info.glowColor, 0.5);

    if (e.type === 'roadLord') {
      // Bulky armored car
      renderer.fillRect(x + 2, y + 4, e.w - 4, e.h - 8, '#f44');
      renderer.fillRect(x + 4, y + e.h - 12, e.w - 8, 10, '#c22');
      // Armor plate
      renderer.fillRect(x + 6, y + 6, e.w - 12, 10, '#922');
      // Wheels
      renderer.fillRect(x, y + 6, 3, 10, '#333');
      renderer.fillRect(x + e.w - 3, y + 6, 3, 10, '#333');
      renderer.fillRect(x, y + e.h - 14, 3, 10, '#333');
      renderer.fillRect(x + e.w - 3, y + e.h - 14, 3, 10, '#333');
      // HP indicator
      if (e.hp > 1) {
        renderer.fillRect(x + 4, y + 1, (e.w - 8) * (e.hp / info.hp), 2, '#ff0');
      }
    } else if (e.type === 'switchblade') {
      // Sleek car with blade extensions
      renderer.fillRect(x + 4, y + 4, e.w - 8, e.h - 8, '#ff0');
      renderer.fillRect(x + 6, y + 8, e.w - 12, e.h - 16, '#cc0');
      // Tire slashers (blades sticking out sides)
      const bladePhase = Math.sin(frameCount * 0.15 + e.phase) * 4;
      renderer.fillRect(x - 4 + bladePhase, y + e.h / 2 - 1, 6, 2, '#fff');
      renderer.fillRect(x + e.w - 2 - bladePhase, y + e.h / 2 - 1, 6, 2, '#fff');
      // Wheels
      renderer.fillRect(x + 1, y + 6, 3, 8, '#333');
      renderer.fillRect(x + e.w - 4, y + 6, 3, 8, '#333');
      renderer.fillRect(x + 1, y + e.h - 14, 3, 8, '#333');
      renderer.fillRect(x + e.w - 4, y + e.h - 14, 3, 8, '#333');
    } else if (e.type === 'enforcer') {
      // Aggressive car with front-mounted gun
      renderer.fillRect(x + 3, y + 6, e.w - 6, e.h - 10, '#f0f');
      renderer.fillRect(x + 5, y + e.h - 14, e.w - 10, 12, '#b0b');
      // Gun turret
      renderer.fillRect(x + e.w / 2 - 2, y + e.h - 2, 4, 8, '#aaa');
      // Wheels
      renderer.fillRect(x, y + 8, 3, 8, '#333');
      renderer.fillRect(x + e.w - 3, y + 8, 3, 8, '#333');
      renderer.fillRect(x, y + e.h - 14, 3, 8, '#333');
      renderer.fillRect(x + e.w - 3, y + e.h - 14, 3, 8, '#333');
      // Warning flash before shooting
      if (e.shootTimer > 60) {
        const flashAlpha = 0.3 + Math.sin(frameCount * 0.3) * 0.3;
        renderer.fillCircle(x + e.w / 2, y + e.h + 4, 4,
          `rgba(255,0,255,${flashAlpha})`);
      }
    }

    renderer.setGlow(null);
  }

  function drawCivilian(renderer, c) {
    const x = c.x, y = c.y;
    renderer.setGlow(CIVILIAN_GLOW, 0.3);

    // Simple sedan shape
    renderer.fillRect(x + 3, y + 4, c.w - 6, c.h - 8, '#4af');
    renderer.fillRect(x + 5, y + 8, c.w - 10, c.h - 16, '#38d');

    // Windshield
    renderer.fillRect(x + 6, y + 10, c.w - 12, 6, '#adf');

    // Wheels
    renderer.fillRect(x + 1, y + 6, 3, 7, '#333');
    renderer.fillRect(x + c.w - 4, y + 6, 3, 7, '#333');
    renderer.fillRect(x + 1, y + c.h - 12, 3, 7, '#333');
    renderer.fillRect(x + c.w - 4, y + c.h - 12, 3, 7, '#333');

    renderer.setGlow(null);
  }

  function drawFork(renderer) {
    if (!fork) return;
    const fy = fork.y;
    if (fork.side === 'left') {
      renderer.fillPoly([
        { x: ROAD_LEFT, y: fy },
        { x: ROAD_LEFT - 60, y: fy + 100 },
        { x: ROAD_LEFT - 60, y: fy + 200 },
        { x: ROAD_LEFT, y: fy + 300 },
      ], '#333');
      // Edge line
      renderer.setGlow('#e86', 0.4);
      renderer.drawLine(ROAD_LEFT, fy, ROAD_LEFT - 60, fy + 100, '#e86', 2);
      renderer.drawLine(ROAD_LEFT - 60, fy + 100, ROAD_LEFT - 60, fy + 200, '#e86', 2);
      renderer.drawLine(ROAD_LEFT - 60, fy + 200, ROAD_LEFT, fy + 300, '#e86', 2);
      renderer.setGlow(null);
    } else {
      renderer.fillPoly([
        { x: ROAD_RIGHT, y: fy },
        { x: ROAD_RIGHT + 60, y: fy + 100 },
        { x: ROAD_RIGHT + 60, y: fy + 200 },
        { x: ROAD_RIGHT, y: fy + 300 },
      ], '#333');
      renderer.setGlow('#e86', 0.4);
      renderer.drawLine(ROAD_RIGHT, fy, ROAD_RIGHT + 60, fy + 100, '#e86', 2);
      renderer.drawLine(ROAD_RIGHT + 60, fy + 100, ROAD_RIGHT + 60, fy + 200, '#e86', 2);
      renderer.drawLine(ROAD_RIGHT + 60, fy + 200, ROAD_RIGHT, fy + 300, '#e86', 2);
      renderer.setGlow(null);
    }
  }

  function drawHUD(renderer, text) {
    const hudY = H - 22;

    // Machine gun (always available)
    text.drawText('GUN', ROAD_LEFT + 4, hudY, 11, '#e86', 'left');

    // Missiles
    const mslColor = missileCount > 0 ? '#f80' : '#444';
    text.drawText(`MSL:${missileCount}`, ROAD_LEFT + 50, hudY, 11, mslColor, 'left');

    // Oil
    const oilColor = oilCount > 0 ? '#0f0' : '#444';
    text.drawText(`OIL:${oilCount}`, ROAD_LEFT + 110, hudY, 11, oilColor, 'left');

    // Smoke indicator
    if (activePowerup === 'smoke') {
      const pctLeft = powerupTimeLeft / POWERUP_TYPES.smoke.duration;
      text.drawText(`SMK:${Math.ceil(pctLeft * 100)}%`, ROAD_LEFT + 170, hudY, 11, '#aaa', 'left');
    }

    // Speed indicator
    text.drawText(`${Math.floor(scrollSpeed * 30)}mph`, ROAD_RIGHT - 4, hudY, 11, '#e86', 'right');
  }

  game.start();
  return game;
}
