// joust/game.js — Joust game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 500;

// --- Constants ---
const GRAVITY = 0.28;
const FLAP_POWER = -4.8;
const MAX_FALL = 5;
const MOVE_ACCEL = 0.4;
const MAX_SPEED_X = 3.5;
const FRICTION = 0.92;
const PLAYER_W = 28;
const PLAYER_H = 24;
const MOUNT_W = 32;
const MOUNT_H = 16;
const LANCE_LEN = 14;
const EGG_SIZE = 10;
const EGG_HATCH_TIME = 300;
const LAVA_H = 20;

// --- Platforms ---
const platforms = [
  { x: 0, y: H - LAVA_H, w: 130, h: 6 },
  { x: W - 130, y: H - LAVA_H, w: 130, h: 6 },
  { x: 170, y: 380, w: 260, h: 6 },
  { x: 0, y: 270, w: 160, h: 6 },
  { x: W - 160, y: 270, w: 160, h: 6 },
  { x: 200, y: 170, w: 200, h: 6 },
];

// --- State ---
let score, best, wave, lives;
let player, enemies, eggs, particles;
let frameCount;
let waveTransition, respawnTimer, playerInvincible;
let gameOverDelay;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');

// --- Helpers ---

function createPlayer() {
  return {
    x: W / 2, y: 350,
    vx: 0, vy: 0,
    facing: 1,
    flapFrame: 0,
    onGround: false,
    alive: true
  };
}

function createEnemy(type, x, y) {
  const speeds = [1.5, 2.2, 3.0];
  const flapPowers = [-3.5, -4.2, -5.0];
  const colors = ['#f44', '#ff0', '#a4f'];
  const mountColors = ['#844', '#884', '#648'];
  const points = [500, 750, 1000];
  return {
    x, y,
    vx: (Math.random() > 0.5 ? 1 : -1) * speeds[type] * (0.7 + Math.random() * 0.3),
    vy: -2,
    facing: 1,
    flapFrame: 0,
    onGround: false,
    type,
    maxSpeed: speeds[type],
    flapPower: flapPowers[type],
    color: colors[type],
    mountColor: mountColors[type],
    points: points[type],
    flapTimer: 0,
    flapInterval: type === 0 ? 50 : type === 1 ? 35 : 25,
    alive: true,
    targetY: Math.random() * (H * 0.6),
    aiTimer: 0
  };
}

function createEgg(x, y, points) {
  return { x, y, vy: -2, points, timer: 0, onGround: false, hatching: false };
}

function spawnWaveEnemies() {
  enemies = [];
  const count = Math.min(2 + wave, 8);
  for (let i = 0; i < count; i++) {
    let type = 0;
    if (wave >= 3 && Math.random() < 0.4) type = 1;
    if (wave >= 5 && Math.random() < 0.3) type = 2;
    if (wave >= 7 && Math.random() < 0.5) type = Math.random() < 0.5 ? 2 : 1;
    const spawnX = Math.random() * (W - 60) + 30;
    const spawnY = 30 + Math.random() * 80;
    enemies.push(createEnemy(type, spawnX, spawnY));
  }
}

// --- Physics helpers ---

function applyGravity(entity) {
  entity.vy += GRAVITY;
  if (entity.vy > MAX_FALL) entity.vy = MAX_FALL;
}

function wrapX(entity, hw) {
  if (entity.x < -hw) entity.x = W + hw;
  if (entity.x > W + hw) entity.x = -hw;
}

function collidePlatforms(entity, halfW, fullH) {
  entity.onGround = false;
  for (const p of platforms) {
    if (entity.x + halfW > p.x && entity.x - halfW < p.x + p.w) {
      const entityBottom = entity.y + fullH;
      const prevBottom = entityBottom - entity.vy;
      if (entity.vy >= 0 && entityBottom >= p.y && prevBottom <= p.y + 8) {
        entity.y = p.y - fullH;
        entity.vy = 0;
        entity.onGround = true;
        return;
      }
    }
  }
  if (entity.y + fullH > H - LAVA_H + 4) {
    return 'lava';
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 30 + Math.random() * 20,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

// --- Enemy AI & update ---

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;

    e.aiTimer++;
    e.flapTimer++;
    let shouldFlap = e.flapTimer >= e.flapInterval;
    if (e.y > e.targetY + 50) shouldFlap = shouldFlap || e.flapTimer >= e.flapInterval * 0.6;

    if (shouldFlap) {
      e.vy = e.flapPower;
      e.flapFrame = 8;
      e.flapTimer = 0;
    }

    if (e.aiTimer % 60 === 0) {
      e.targetY = 60 + Math.random() * (H * 0.5);
      if (e.type >= 1 && player.alive) {
        const dx = player.x - e.x;
        const wrapDx = dx > W / 2 ? dx - W : dx < -W / 2 ? dx + W : dx;
        e.vx = Math.sign(wrapDx) * e.maxSpeed * (0.7 + Math.random() * 0.3);
        e.facing = Math.sign(e.vx) || 1;
      } else {
        if (Math.random() < 0.4) {
          e.vx = (Math.random() > 0.5 ? 1 : -1) * e.maxSpeed * (0.5 + Math.random() * 0.5);
          e.facing = Math.sign(e.vx) || 1;
        }
      }
    }

    applyGravity(e);
    e.x += e.vx;
    e.y += e.vy;
    if (e.flapFrame > 0) e.flapFrame--;

    wrapX(e, MOUNT_W / 2);

    const platResult = collidePlatforms(e, MOUNT_W / 2, PLAYER_H + MOUNT_H / 2);
    if (platResult === 'lava') {
      e.y = -20;
      e.vy = 0;
    }

    if (e.y < 0) {
      e.y = 0;
      e.vy = Math.abs(e.vy) * 0.3;
    }

    if (e.type === 0 && e.onGround && Math.random() < 0.02) {
      e.vx = -e.vx;
      e.facing = Math.sign(e.vx) || 1;
    }
  }
}

function updateEggs() {
  for (let i = eggs.length - 1; i >= 0; i--) {
    const egg = eggs[i];

    if (!egg.onGround) {
      egg.vy += GRAVITY * 0.5;
      egg.y += egg.vy;

      for (const p of platforms) {
        if (egg.x + EGG_SIZE / 2 > p.x && egg.x - EGG_SIZE / 2 < p.x + p.w) {
          if (egg.vy >= 0 && egg.y + EGG_SIZE >= p.y) {
            egg.y = p.y - EGG_SIZE;
            egg.vy = 0;
            egg.onGround = true;
            break;
          }
        }
      }
      if (egg.y + EGG_SIZE > H - LAVA_H) {
        egg.y = H - LAVA_H - EGG_SIZE;
        egg.vy = 0;
        egg.onGround = true;
      }
    }

    if (egg.onGround) {
      egg.timer++;
      if (egg.timer >= EGG_HATCH_TIME) {
        const newEnemy = createEnemy(0, egg.x, egg.y - PLAYER_H);
        newEnemy.vy = -4;
        enemies.push(newEnemy);
        spawnParticles(egg.x, egg.y, '#ff0', 8);
        eggs.splice(i, 1);
      }
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// --- Pre-computed star positions ---
const stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({ x: (i * 137 + 50) % W, y: (i * 97 + 30) % (H - 60) });
}

// === Export ===

export function createGame() {
  const game = new Game('game');
  let handleFlap, defeatEnemy, killPlayer, checkCombat, collectEggs;

  handleFlap = () => {
    if (player.alive) {
      player.vy = FLAP_POWER;
      player.flapFrame = 8;
    }
  };

  defeatEnemy = (index) => {
    const e = enemies[index];
    eggs.push(createEgg(e.x, e.y, e.points));
    score += e.points;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
    spawnParticles(e.x, e.y, e.color, 12);
    player.vy = -4;
    enemies.splice(index, 1);
  };

  killPlayer = () => {
    if (!player.alive) return;
    player.alive = false;
    spawnParticles(player.x, player.y, '#f86', 15);
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      gameOverDelay = 30; // ~0.5s at 60fps
    } else {
      respawnTimer = 90;
    }
  };

  checkCombat = () => {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) continue;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (MOUNT_W * 0.8)) {
        const playerBottom = player.y + PLAYER_H;
        const enemyBottom = e.y + PLAYER_H;

        if (playerBottom < enemyBottom - 4) {
          defeatEnemy(i);
        } else if (enemyBottom < playerBottom - 4) {
          killPlayer();
          return;
        } else {
          player.vx = -Math.sign(dx || 1) * 3;
          player.vy = -3;
          e.vx = Math.sign(dx || 1) * 3;
          e.vy = -3;
        }
      }
    }
  };

  collectEggs = () => {
    for (let i = eggs.length - 1; i >= 0; i--) {
      const egg = eggs[i];
      const dx = player.x - egg.x;
      const dy = (player.y + PLAYER_H / 2) - (egg.y + EGG_SIZE / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUNT_W / 2 + EGG_SIZE / 2) {
        score += 250;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        spawnParticles(egg.x, egg.y, '#0f0', 6);
        eggs.splice(i, 1);
      }
    }
  };

  game.onInit = () => {
    score = 0;
    best = 0;
    wave = 1;
    lives = 3;
    frameCount = 0;
    waveTransition = 0;
    respawnTimer = 0;
    playerInvincible = 0;
    gameOverDelay = 0;
    scoreEl.textContent = '0';
    waveEl.textContent = '1';
    livesEl.textContent = '3';
    bestEl.textContent = '0';
    player = createPlayer();
    enemies = [];
    eggs = [];
    particles = [];
    game.showOverlay('JOUST', 'Press SPACE to flap \u2014 Arrow keys to move');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // --- Waiting state ---
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        spawnWaveEnemies();
        if (input.wasPressed(' ')) handleFlap();
      }
      return;
    }

    // --- Over state ---
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    frameCount++;

    // Game over delay (replaces setTimeout)
    if (gameOverDelay > 0) {
      gameOverDelay--;
      if (gameOverDelay === 0) {
        if (score > best) { best = score; bestEl.textContent = best; }
        game.showOverlay('GAME OVER', `Score: ${score} \u2014 Wave ${wave} \u2014 Press any key to restart`);
        game.setState('over');
        return;
      }
      updateEnemies();
      updateEggs();
      updateParticles();
      return;
    }

    // Wave transition
    if (waveTransition > 0) {
      waveTransition--;
      if (waveTransition === 0) {
        spawnWaveEnemies();
      }
      updateParticles();
      updateEggs();
      return;
    }

    // Player respawn
    if (respawnTimer > 0) {
      respawnTimer--;
      if (respawnTimer === 0) {
        player = createPlayer();
        player.alive = true;
        playerInvincible = 120;
      }
      updateEnemies();
      updateEggs();
      updateParticles();
      return;
    }

    if (playerInvincible > 0) playerInvincible--;

    // Player input
    if (player.alive) {
      if (input.isDown('ArrowLeft')) {
        player.vx -= MOVE_ACCEL;
        player.facing = -1;
      }
      if (input.isDown('ArrowRight')) {
        player.vx += MOVE_ACCEL;
        player.facing = 1;
      }
      if (input.wasPressed(' ')) {
        handleFlap();
      }
      player.vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, player.vx));
      if (!input.isDown('ArrowLeft') && !input.isDown('ArrowRight')) {
        player.vx *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
      }

      applyGravity(player);
      player.x += player.vx;
      player.y += player.vy;

      if (player.flapFrame > 0) player.flapFrame--;

      wrapX(player, MOUNT_W / 2);

      const platResult = collidePlatforms(player, MOUNT_W / 2, PLAYER_H + MOUNT_H / 2);
      if (platResult === 'lava') {
        killPlayer();
        return;
      }

      if (player.y < 0) {
        player.y = 0;
        player.vy = Math.abs(player.vy) * 0.3;
      }
    }

    updateEnemies();

    if (player.alive && playerInvincible <= 0) {
      checkCombat();
    }

    updateEggs();

    if (player.alive) {
      collectEggs();
    }

    updateParticles();

    // Check wave completion
    if (enemies.length === 0 && eggs.length === 0 && waveTransition === 0) {
      wave++;
      waveEl.textContent = wave;
      waveTransition = 90;
      score += 200;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    for (const s of stars) {
      renderer.fillRect(s.x, s.y, 1, 1, '#334');
    }

    // Lava
    drawLava(renderer);

    // Platforms
    drawPlatforms(renderer);

    // Eggs
    drawEggs(renderer);

    // Enemies
    for (const e of enemies) {
      if (e.alive) drawKnight(renderer, e.x, e.y, e.vx, e.facing, e.flapFrame, e.color, e.mountColor);
    }

    // Player (blink during invincibility)
    if (player.alive && (playerInvincible <= 0 || frameCount % 6 < 3)) {
      drawKnight(renderer, player.x, player.y, player.vx, player.facing, player.flapFrame, '#f86', '#a64');
    }

    // Particles
    drawParticles(renderer);

    // Wave transition text
    if (waveTransition > 0) {
      renderer.setGlow('#f86', 0.6);
      text.drawText(`WAVE ${wave}`, W / 2, H / 2 - 30, 32, '#f86', 'center');
      renderer.setGlow(null);
      text.drawText('Get ready!', W / 2, H / 2 + 10, 16, '#aaa', 'center');
    }

    // Respawn text
    if (respawnTimer > 0 && lives > 0) {
      renderer.setGlow('#f86', 0.4);
      text.drawText(`Lives: ${lives}`, W / 2, H / 2 - 9, 18, '#f86', 'center');
      renderer.setGlow(null);
    }
  };

  // --- Draw helpers ---

  function drawKnight(renderer, x, y, vx, facing, flapFrame, bodyColor, mountColor) {
    // Mount body (ellipse approximated as a filled polygon)
    const bx = x;
    const by = y + PLAYER_H * 0.4 + MOUNT_H / 2;
    const rx = MOUNT_W / 2;
    const ry = MOUNT_H / 2;

    renderer.setGlow(mountColor, 0.3);

    // Ellipse as polygon
    const ellipsePoints = [];
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      ellipsePoints.push({ x: bx + Math.cos(angle) * rx, y: by + Math.sin(angle) * ry });
    }
    renderer.fillPoly(ellipsePoints, mountColor);

    // Wings
    const wingAngle = flapFrame > 0 ? -0.6 : 0.3;
    const wingLen = 16;
    const wingBaseY = y + PLAYER_H * 0.4 + 4;

    // Left wing
    renderer.fillPoly([
      { x: x - 6, y: wingBaseY },
      { x: x - 6 - wingLen * Math.cos(wingAngle), y: wingBaseY - wingLen * Math.sin(wingAngle) },
      { x: x - 2, y: wingBaseY + 4 }
    ], mountColor);

    // Right wing
    renderer.fillPoly([
      { x: x + 6, y: wingBaseY },
      { x: x + 6 + wingLen * Math.cos(wingAngle), y: wingBaseY - wingLen * Math.sin(wingAngle) },
      { x: x + 2, y: wingBaseY + 4 }
    ], mountColor);

    renderer.setGlow(null);

    // Legs
    const legBaseY = by + ry;
    const legLen = 8;
    renderer.drawLine(x - 5, legBaseY, x - 5, legBaseY + legLen, mountColor, 2);
    renderer.drawLine(x + 5, legBaseY, x + 5, legBaseY + legLen, mountColor, 2);

    // Rider body
    renderer.setGlow(bodyColor, 0.4);
    renderer.fillRect(x - 6, y, 12, PLAYER_H * 0.5, bodyColor);

    // Rider head (helmet) - circle
    renderer.fillCircle(x, y - 2, 7, bodyColor);

    // Lance
    renderer.setGlow(bodyColor, 0.3);
    const lanceEndX = x + facing * (MOUNT_W / 2 + LANCE_LEN);
    const lanceEndY = y + 2;
    renderer.drawLine(x, y + 4, lanceEndX, lanceEndY, '#fff', 3);

    // Lance tip
    renderer.fillCircle(lanceEndX, lanceEndY, 2, '#fff');
    renderer.setGlow(null);
  }

  function drawPlatforms(renderer) {
    renderer.setGlow('#0f3460', 0.3);
    for (const p of platforms) {
      renderer.fillRect(p.x, p.y, p.w, p.h, '#0f3460');
      renderer.fillRect(p.x, p.y, p.w, 2, '#1a5a90');
      renderer.fillRect(p.x, p.y + p.h, p.w, 3, '#0a2240');
    }
    renderer.setGlow(null);
  }

  function drawLava(renderer) {
    const lavaY = H - LAVA_H;

    // Lava glow background (gradient approximation with rectangles)
    renderer.fillRect(0, lavaY - 4, W, 4, '#ff3c0033');
    renderer.fillRect(0, lavaY, W, LAVA_H, '#ff3c00cc');

    // Lava surface waves
    renderer.setGlow('#f80', 0.4);
    for (let lx = 0; lx < W; lx += 20) {
      const waveOffset = Math.sin((lx + frameCount * 2) * 0.05) * 3;
      renderer.fillRect(lx, lavaY + waveOffset, 18, LAVA_H - waveOffset, '#f40');
    }
    // Bright highlights
    for (let lx = 0; lx < W; lx += 40) {
      const waveOffset = Math.sin((lx + frameCount * 2) * 0.05) * 3;
      renderer.fillRect(lx + 5, lavaY + waveOffset + 2, 8, 3, '#fa0');
    }
    renderer.setGlow(null);
  }

  function drawEggs(renderer) {
    for (const egg of eggs) {
      const hatchProgress = egg.timer / EGG_HATCH_TIME;

      // Egg glow when near hatching
      if (hatchProgress > 0.5) {
        renderer.setGlow('#ff0', 0.3 + hatchProgress * 0.5);
      }

      // Egg body (ellipse approximation)
      const eggColor = hatchProgress > 0.7 ? '#ff0' : hatchProgress > 0.4 ? '#ffa' : '#fff';
      const erx = EGG_SIZE / 2;
      const ery = EGG_SIZE * 0.6;
      const ecx = egg.x;
      const ecy = egg.y + EGG_SIZE / 2;
      const eggPts = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        eggPts.push({ x: ecx + Math.cos(angle) * erx, y: ecy + Math.sin(angle) * ery });
      }
      renderer.fillPoly(eggPts, eggColor);

      // Shake when about to hatch
      if (hatchProgress > 0.7) {
        const shake = Math.sin(frameCount * 0.5) * 2 * hatchProgress;
        const shakePts = [];
        const srx = erx - 1;
        const sry = EGG_SIZE * 0.5;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          shakePts.push({ x: ecx + shake + Math.cos(angle) * srx, y: ecy + Math.sin(angle) * sry });
        }
        renderer.fillPoly(shakePts, '#fa0');
      }

      renderer.setGlow(null);
    }
  }

  function drawParticles(renderer) {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 50);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // Expand short hex colors to 6-char for alpha append
      let base = p.color;
      if (base.length === 4) {
        base = '#' + base[1] + base[1] + base[2] + base[2] + base[3] + base[3];
      }
      renderer.setGlow(p.color, 0.2);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, base + a);
    }
    renderer.setGlow(null);
  }

  game.start();
  return game;
}
