// slither/game.js — Cosmic Space Slither with parallax, power-ups, cosmic worms, and synth soundtrack

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// Arena
const ARENA = 3000;

// Snake config
const BASE_SEG_RADIUS = 6;
const SEG_SPACING = 10;
const BASE_SPEED = 2;
const BOOST_SPEED = 4.5;
const TURN_RATE = 0.06;
const INITIAL_LENGTH = 15;
const MIN_LENGTH = 8;

// Food
const MAX_FOOD = 200;
const FOOD_RADIUS = 5;
const FOOD_EAT_DIST = 14;

// AI
const MAX_AI = 8;
const AI_COLORS = ['#f55', '#55f', '#f5f', '#ff5', '#f80', '#0af', '#fa0', '#a4f'];

// Cosmic Worms
const MAX_WORMS = 2;
const WORM_LENGTH_MIN = 60;
const WORM_LENGTH_MAX = 100;
const WORM_RADIUS = 10;
const WORM_SPEED = 1.2;
const WORM_COLOR = '#a4f';
const WORM_RESPAWN_TIME = 1800; // 30 seconds at 60fps

// Power-ups
const POWER_UP_INTERVAL = 900; // ~15 seconds at 60fps
const MAX_POWER_UPS = 3;
const POWER_UP_DURATION = 480; // ~8 seconds at 60fps
const POWER_UP_RADIUS = 12;
const POWER_UP_TYPES = [
  { type: 'shield', color: '#4af', label: 'SHIELD' },
  { type: 'magnet', color: '#f4f', label: 'MAGNET' },
  { type: 'speed', color: '#ff4', label: 'SPEED' },
  { type: 'ghost', color: '#aaf', label: 'GHOST' },
  { type: 'mass', color: '#4f4', label: 'MASS' },
];

// Pre-computed food colors
const FOOD_COLORS = [
  '#ff0000', '#ff4d00', '#ff9900', '#ffe600', '#ccff00',
  '#80ff00', '#33ff00', '#00ff1a', '#00ff66', '#00ffb3',
  '#00ffff', '#00b3ff', '#0066ff', '#001aff', '#3300ff',
  '#8000ff', '#cc00ff', '#ff00e6', '#ff0099', '#ff004d'
];

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Game State ---
let score = 0;
let best = 0;
let player, aiSnakes, cosmicWorms, food, powerUps, camera, particles;
let frameCount = 0;
let lastPowerUpSpawn = 0;
let wormRespawnTimers = [];

// --- Parallax Stars ---
let starLayers = [];
let nebulaClouds = [];

// --- Audio ---
let audioCtx = null;
let audioNodes = null;
let musicStarted = false;
let melodicInterval = null;

// --- Growth milestones ---
const GROWTH_MILESTONES = [50, 100, 150, 200];
let lastMilestone = 0;

// --- Utility ---
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function colorWithAlpha(hexColor, alpha) {
  let hex = hexColor;
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + alphaHex;
}

function randFoodColor() {
  return FOOD_COLORS[randInt(0, FOOD_COLORS.length)];
}

// --- Dynamic segment radius based on length ---
function getSegRadius(snake) {
  const len = snake.segments.length;
  return Math.min(12, BASE_SEG_RADIUS + Math.floor(len / 20) * 0.5);
}

// --- Parallax star generation ---
function generateStars() {
  starLayers = [];
  // Layer 1 (far): 60 tiny dim stars, 5% parallax
  const layer1 = [];
  for (let i = 0; i < 60; i++) {
    layer1.push({ x: rand(0, W + 200), y: rand(0, H + 200), r: rand(0.5, 1.2), alpha: rand(0.15, 0.3), color: '#fff' });
  }
  starLayers.push({ stars: layer1, parallax: 0.05 });

  // Layer 2 (mid): 40 medium stars with twinkle, 15% parallax
  const layer2 = [];
  for (let i = 0; i < 40; i++) {
    layer2.push({ x: rand(0, W + 200), y: rand(0, H + 200), r: rand(1, 2), alpha: rand(0.3, 0.5), twinkle: rand(0, Math.PI * 2), color: '#fff' });
  }
  starLayers.push({ stars: layer2, parallax: 0.15 });

  // Layer 3 (near): 20 brighter stars with color tints, 30% parallax
  const layer3 = [];
  const tints = ['#aaccff', '#ccaaff', '#aaffee', '#ffffff', '#ffccdd'];
  for (let i = 0; i < 20; i++) {
    layer3.push({ x: rand(0, W + 200), y: rand(0, H + 200), r: rand(1.5, 2.5), alpha: rand(0.5, 0.8), color: tints[randInt(0, tints.length)] });
  }
  starLayers.push({ stars: layer3, parallax: 0.3 });

  // Nebula clouds: 4 large semi-transparent circles
  nebulaClouds = [];
  const nebulaColors = ['#6633aa', '#3344aa', '#226666', '#553388'];
  for (let i = 0; i < 4; i++) {
    nebulaClouds.push({
      x: rand(0, W + 200), y: rand(0, H + 200),
      r: rand(80, 160),
      color: nebulaColors[i],
      parallax: 0.08
    });
  }
}

// --- Snake creation ---
function createSnake(x, y, angle, length, color, isPlayer) {
  const segments = [];
  for (let i = 0; i < length; i++) {
    segments.push({
      x: x - Math.cos(angle) * i * SEG_SPACING,
      y: y - Math.sin(angle) * i * SEG_SPACING
    });
  }
  return {
    segments,
    angle,
    speed: BASE_SPEED,
    color,
    isPlayer,
    alive: true,
    boosting: false,
    targetAngle: angle,
    aiTimer: 0,
    aiTarget: null,
    // Power-up state
    activePower: null,
    powerTimer: 0,
    shieldHit: false
  };
}

// --- Cosmic Worm creation ---
function createCosmicWorm(x, y) {
  const angle = rand(0, Math.PI * 2);
  const length = randInt(WORM_LENGTH_MIN, WORM_LENGTH_MAX);
  const segments = [];
  for (let i = 0; i < length; i++) {
    segments.push({
      x: x - Math.cos(angle) * i * SEG_SPACING * 0.8,
      y: y - Math.sin(angle) * i * SEG_SPACING * 0.8
    });
  }
  return {
    segments,
    angle,
    targetAngle: angle,
    speed: WORM_SPEED,
    color: WORM_COLOR,
    alive: true,
    turnTimer: 0,
    isWorm: true
  };
}

// --- Food ---
function createFood(x, y, radius, color) {
  return {
    x: x !== undefined ? x : rand(50, ARENA - 50),
    y: y !== undefined ? y : rand(50, ARENA - 50),
    radius: radius || FOOD_RADIUS,
    color: color || randFoodColor(),
    pulse: rand(0, Math.PI * 2),
    drift: rand(0, Math.PI * 2)
  };
}

function spawnFood() {
  while (food.length < MAX_FOOD) {
    food.push(createFood());
  }
}

// --- Power-up spawning ---
function spawnPowerUp() {
  if (powerUps.length >= MAX_POWER_UPS) return;
  const type = POWER_UP_TYPES[randInt(0, POWER_UP_TYPES.length)];
  powerUps.push({
    x: rand(100, ARENA - 100),
    y: rand(100, ARENA - 100),
    type: type.type,
    color: type.color,
    label: type.label,
    spawnTime: frameCount,
    pulse: 0,
    spin: rand(0, Math.PI * 2)
  });
}

// --- Particles ---
function addParticle(x, y, color, opts) {
  const o = opts || {};
  particles.push({
    x, y,
    vx: o.vx !== undefined ? o.vx : rand(-2, 2),
    vy: o.vy !== undefined ? o.vy : rand(-2, 2),
    life: o.life || rand(15, 40),
    maxLife: o.maxLife || 40,
    color,
    radius: o.radius || rand(1, 3)
  });
}

function addSparkle(x, y, color, count) {
  for (let i = 0; i < (count || 5); i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 4);
    addParticle(x, y, color, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(20, 45),
      maxLife: 45,
      radius: rand(1, 2.5)
    });
  }
}

// --- Snake to food conversion ---
function snakeToFood(snake) {
  for (let i = 0; i < snake.segments.length; i += 2) {
    const seg = snake.segments[i];
    food.push(createFood(seg.x + rand(-5, 5), seg.y + rand(-5, 5), FOOD_RADIUS + 1, snake.color));
  }
}

function wormToFood(worm) {
  // Cosmic worms drop lots of food
  for (let i = 0; i < worm.segments.length; i += 1) {
    const seg = worm.segments[i];
    if (Math.random() < 0.6) {
      food.push(createFood(seg.x + rand(-10, 10), seg.y + rand(-10, 10), FOOD_RADIUS + 2, '#d8f'));
    }
  }
}

// --- AI spawning ---
function spawnAI() {
  while (aiSnakes.length < MAX_AI) {
    let x, y;
    do {
      x = rand(100, ARENA - 100);
      y = rand(100, ARENA - 100);
    } while (player.alive && dist({ x, y }, player.segments[0]) < 400);

    const angle = rand(0, Math.PI * 2);
    const length = randInt(12, 40);
    const color = AI_COLORS[aiSnakes.length % AI_COLORS.length];
    aiSnakes.push(createSnake(x, y, angle, length, color, false));
  }
}

// --- Cosmic Worm spawning ---
function spawnCosmicWorms() {
  while (cosmicWorms.length < MAX_WORMS) {
    let x, y;
    do {
      x = rand(200, ARENA - 200);
      y = rand(200, ARENA - 200);
    } while (player.alive && dist({ x, y }, player.segments[0]) < 600);
    cosmicWorms.push(createCosmicWorm(x, y));
  }
}

// --- Update snake movement ---
function updateSnake(snake) {
  if (!snake.alive) return;

  const head = snake.segments[0];
  const segR = snake.isPlayer ? getSegRadius(snake) : BASE_SEG_RADIUS;
  let speed = snake.boosting ? BOOST_SPEED : BASE_SPEED;

  // Speed power-up doubles speed
  if (snake.activePower === 'speed') speed *= 2;

  snake.speed = speed;

  // Turn toward target angle
  const diff = angleDiff(snake.angle, snake.targetAngle);
  const turnAmount = TURN_RATE * (snake.boosting ? 0.7 : 1);
  if (Math.abs(diff) < turnAmount) {
    snake.angle = snake.targetAngle;
  } else {
    snake.angle += Math.sign(diff) * turnAmount;
  }

  // Move head
  const newHead = {
    x: head.x + Math.cos(snake.angle) * speed,
    y: head.y + Math.sin(snake.angle) * speed
  };

  // Wall bounce
  const margin = 30;
  if (newHead.x < margin) { newHead.x = margin; snake.angle = 0; snake.targetAngle = 0; }
  if (newHead.x > ARENA - margin) { newHead.x = ARENA - margin; snake.angle = Math.PI; snake.targetAngle = Math.PI; }
  if (newHead.y < margin) { newHead.y = margin; snake.angle = Math.PI / 2; snake.targetAngle = Math.PI / 2; }
  if (newHead.y > ARENA - margin) { newHead.y = ARENA - margin; snake.angle = -Math.PI / 2; snake.targetAngle = -Math.PI / 2; }

  snake.segments.unshift(newHead);

  // Maintain segment spacing — fixed: less aggressive threshold, max 2 trims
  let trimCount = 0;
  while (snake.segments.length > 2 && trimCount < 2) {
    const len = snake.segments.length;
    const tail1 = snake.segments[len - 1];
    const tail2 = snake.segments[len - 2];
    if (dist(tail1, tail2) < SEG_SPACING * 0.3) {
      snake.segments.pop();
      trimCount++;
    } else {
      break;
    }
  }

  // Boosting shrinks the snake
  if (snake.boosting && snake.segments.length > MIN_LENGTH) {
    if (Math.random() < 0.15) {
      const tail = snake.segments.pop();
      food.push(createFood(tail.x, tail.y, 3, snake.color));
    }
  }

  // Magnet power-up: attract nearby food
  const magnetRange = snake.activePower === 'magnet' ? 150 : 0;

  // Eat food
  for (let i = food.length - 1; i >= 0; i--) {
    const f = food[i];
    const d = dist(newHead, f);

    // Magnet pull
    if (magnetRange > 0 && d < magnetRange && d > FOOD_EAT_DIST) {
      const pull = 3;
      const angle = Math.atan2(newHead.y - f.y, newHead.x - f.x);
      f.x += Math.cos(angle) * pull;
      f.y += Math.sin(angle) * pull;
    }

    if (d < FOOD_EAT_DIST + f.radius) {
      const tail = snake.segments[snake.segments.length - 1];
      snake.segments.push({ x: tail.x, y: tail.y });
      snake.segments.push({ x: tail.x, y: tail.y });

      addSparkle(f.x, f.y, f.color, 3);
      food.splice(i, 1);

      if (snake.isPlayer) {
        score = snake.segments.length;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        playFoodPip();

        // Check milestones
        for (const ms of GROWTH_MILESTONES) {
          if (score >= ms && lastMilestone < ms) {
            lastMilestone = ms;
            // Celebration burst
            for (let p = 0; p < 20; p++) {
              addSparkle(newHead.x, newHead.y, '#fff', 3);
            }
          }
        }
      }
    }
  }

  // Pick up power-ups (player only)
  if (snake.isPlayer) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      if (dist(newHead, pu) < POWER_UP_RADIUS + segR) {
        applyPowerUp(snake, pu);
        powerUps.splice(i, 1);
      }
    }

    // Decrement power timer
    if (snake.powerTimer > 0) {
      snake.powerTimer--;
      if (snake.powerTimer <= 0) {
        snake.activePower = null;
      }
    }
  }
}

// --- Apply power-up ---
function applyPowerUp(snake, pu) {
  snake.activePower = pu.type;
  snake.powerTimer = POWER_UP_DURATION;
  snake.shieldHit = false;

  if (pu.type === 'mass') {
    // Instant +10 segments
    const tail = snake.segments[snake.segments.length - 1];
    for (let i = 0; i < 10; i++) {
      snake.segments.push({ x: tail.x + rand(-3, 3), y: tail.y + rand(-3, 3) });
    }
    addSparkle(snake.segments[0].x, snake.segments[0].y, '#4f4', 15);
    snake.activePower = null;
    snake.powerTimer = 0;
  }

  playPowerUpChime();
  addSparkle(snake.segments[0].x, snake.segments[0].y, pu.color, 8);
}

// --- Update cosmic worm AI ---
function updateWorm(worm) {
  if (!worm.alive) return;

  const head = worm.segments[0];

  worm.turnTimer--;
  if (worm.turnTimer <= 0) {
    worm.turnTimer = randInt(60, 180);
    // Gentle wandering: bias toward center, avoid edges
    const toCenterX = ARENA / 2 - head.x;
    const toCenterY = ARENA / 2 - head.y;
    const centerAngle = Math.atan2(toCenterY, toCenterX);
    worm.targetAngle = centerAngle + rand(-1.5, 1.5);
  }

  // Smooth turning
  const diff = angleDiff(worm.angle, worm.targetAngle);
  const turnRate = 0.02;
  if (Math.abs(diff) < turnRate) {
    worm.angle = worm.targetAngle;
  } else {
    worm.angle += Math.sign(diff) * turnRate;
  }

  // Move
  const newHead = {
    x: head.x + Math.cos(worm.angle) * worm.speed,
    y: head.y + Math.sin(worm.angle) * worm.speed
  };

  // Bounce off edges
  const margin = 100;
  if (newHead.x < margin) { newHead.x = margin; worm.targetAngle = 0; }
  if (newHead.x > ARENA - margin) { newHead.x = ARENA - margin; worm.targetAngle = Math.PI; }
  if (newHead.y < margin) { newHead.y = margin; worm.targetAngle = Math.PI / 2; }
  if (newHead.y > ARENA - margin) { newHead.y = ARENA - margin; worm.targetAngle = -Math.PI / 2; }

  worm.segments.unshift(newHead);
  if (worm.segments.length > WORM_LENGTH_MAX) {
    worm.segments.pop();
  }
}

// --- AI behavior ---
function updateAI(snake) {
  if (!snake.alive) return;
  const head = snake.segments[0];

  snake.aiTimer--;
  if (snake.aiTimer <= 0) {
    snake.aiTimer = randInt(20, 60);
    snake.aiTarget = null;
    snake.boosting = false;

    let nearestFood = null;
    let nearestDist = Infinity;
    for (const f of food) {
      const d = dist(head, f);
      if (d < nearestDist) {
        nearestDist = d;
        nearestFood = f;
      }
    }

    if (player.alive && Math.random() < 0.15) {
      const playerHead = player.segments[0];
      const dToPlayer = dist(head, playerHead);
      if (dToPlayer < 300 && snake.segments.length > player.segments.length) {
        const ahead = {
          x: playerHead.x + Math.cos(player.angle) * 80,
          y: playerHead.y + Math.sin(player.angle) * 80
        };
        snake.targetAngle = Math.atan2(ahead.y - head.y, ahead.x - head.x);
        snake.boosting = dToPlayer < 150;
        return;
      }
    }

    const allSnakes = [player, ...aiSnakes];
    for (const other of allSnakes) {
      if (other === snake || !other.alive) continue;
      const otherHead = other.segments[0];
      const d = dist(head, otherHead);
      if (d < 80) {
        const awayAngle = Math.atan2(head.y - otherHead.y, head.x - otherHead.x);
        snake.targetAngle = awayAngle;
        snake.boosting = d < 40;
        return;
      }
      for (let i = 3; i < other.segments.length; i += 3) {
        if (dist(head, other.segments[i]) < 40) {
          const awayAngle = Math.atan2(head.y - other.segments[i].y, head.x - other.segments[i].x);
          snake.targetAngle = awayAngle;
          return;
        }
      }
    }

    if (nearestFood && nearestDist < 300) {
      snake.targetAngle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
    } else {
      const toCenterX = ARENA / 2 - head.x;
      const toCenterY = ARENA / 2 - head.y;
      const centerAngle = Math.atan2(toCenterY, toCenterX);
      snake.targetAngle = centerAngle + rand(-1, 1);
    }
  }
}

// --- Collision detection ---
function checkCollisions(game) {
  const allSnakes = [player, ...aiSnakes];

  for (let si = 0; si < allSnakes.length; si++) {
    const snake = allSnakes[si];
    if (!snake.alive) continue;
    const head = snake.segments[0];
    const headR = snake.isPlayer ? getSegRadius(snake) : BASE_SEG_RADIUS;

    // Ghost power-up: player passes through bodies
    if (snake.isPlayer && snake.activePower === 'ghost') continue;

    for (let oi = 0; oi < allSnakes.length; oi++) {
      if (si === oi) continue;
      const other = allSnakes[oi];
      if (!other.alive) continue;

      const otherR = other.isPlayer ? getSegRadius(other) : BASE_SEG_RADIUS;

      for (let j = 4; j < other.segments.length; j++) {
        const seg = other.segments[j];
        if (dist(head, seg) < headR + otherR) {
          // Shield absorbs one hit
          if (snake.isPlayer && snake.activePower === 'shield' && !snake.shieldHit) {
            snake.shieldHit = true;
            snake.activePower = null;
            snake.powerTimer = 0;
            addSparkle(head.x, head.y, '#4af', 12);
            break;
          }

          snake.alive = false;
          snakeToFood(snake);

          for (let p = 0; p < 15; p++) {
            addParticle(head.x, head.y, snake.color, {
              vx: rand(-4, 4), vy: rand(-4, 4), life: rand(25, 50), maxLife: 50, radius: rand(1.5, 4)
            });
          }

          if (snake.isPlayer) {
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            game.showOverlay('GAME OVER', `Length: ${score} -- Press any key to restart`);
            game.setState('over');
            playDeath();
            return;
          }
          break;
        }
      }
    }

    // Check collision with cosmic worm bodies
    if (snake.isPlayer && snake.activePower !== 'ghost') {
      for (const worm of cosmicWorms) {
        if (!worm.alive) continue;
        for (let j = 4; j < worm.segments.length; j += 2) {
          const seg = worm.segments[j];
          if (dist(head, seg) < headR + WORM_RADIUS) {
            if (snake.activePower === 'shield' && !snake.shieldHit) {
              snake.shieldHit = true;
              snake.activePower = null;
              snake.powerTimer = 0;
              addSparkle(head.x, head.y, '#4af', 12);
              break;
            }
            snake.alive = false;
            snakeToFood(snake);
            for (let p = 0; p < 15; p++) {
              addParticle(head.x, head.y, snake.color, {
                vx: rand(-4, 4), vy: rand(-4, 4), life: rand(25, 50), maxLife: 50, radius: rand(1.5, 4)
              });
            }
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            game.showOverlay('GAME OVER', `Length: ${score} -- Press any key to restart`);
            game.setState('over');
            playDeath();
            return;
          }
        }
      }
    }
  }

  // Worms can die if they hit player body (slither rules)
  for (const worm of cosmicWorms) {
    if (!worm.alive) continue;
    const wormHead = worm.segments[0];
    // Check worm head against player body
    if (player.alive) {
      for (let j = 4; j < player.segments.length; j++) {
        const seg = player.segments[j];
        if (dist(wormHead, seg) < WORM_RADIUS + getSegRadius(player)) {
          worm.alive = false;
          wormToFood(worm);
          for (let p = 0; p < 25; p++) {
            addParticle(wormHead.x, wormHead.y, WORM_COLOR, {
              vx: rand(-5, 5), vy: rand(-5, 5), life: rand(30, 60), maxLife: 60, radius: rand(2, 5)
            });
          }
          wormRespawnTimers.push(WORM_RESPAWN_TIME);
          break;
        }
      }
    }
    // Check worm head against AI bodies
    for (const ai of aiSnakes) {
      if (!ai.alive) continue;
      for (let j = 4; j < ai.segments.length; j++) {
        const seg = ai.segments[j];
        if (dist(wormHead, seg) < WORM_RADIUS + BASE_SEG_RADIUS) {
          worm.alive = false;
          wormToFood(worm);
          for (let p = 0; p < 25; p++) {
            addParticle(wormHead.x, wormHead.y, WORM_COLOR, {
              vx: rand(-5, 5), vy: rand(-5, 5), life: rand(30, 60), maxLife: 60, radius: rand(2, 5)
            });
          }
          wormRespawnTimers.push(WORM_RESPAWN_TIME);
          break;
        }
      }
    }
  }

  // Remove dead AI and respawn
  for (let i = aiSnakes.length - 1; i >= 0; i--) {
    if (!aiSnakes[i].alive) aiSnakes.splice(i, 1);
  }
  spawnAI();

  // Remove dead worms
  for (let i = cosmicWorms.length - 1; i >= 0; i--) {
    if (!cosmicWorms[i].alive) cosmicWorms.splice(i, 1);
  }

  // Worm respawn timers
  for (let i = wormRespawnTimers.length - 1; i >= 0; i--) {
    wormRespawnTimers[i]--;
    if (wormRespawnTimers[i] <= 0) {
      wormRespawnTimers.splice(i, 1);
      if (cosmicWorms.length < MAX_WORMS) {
        let x, y;
        do {
          x = rand(200, ARENA - 200);
          y = rand(200, ARENA - 200);
        } while (player.alive && dist({ x, y }, player.segments[0]) < 600);
        cosmicWorms.push(createCosmicWorm(x, y));
      }
    }
  }
}

// --- Camera ---
function updateCamera() {
  if (!player.alive) return;
  const head = player.segments[0];
  camera.x = head.x - W / 2;
  camera.y = head.y - H / 2;
}

// ========== Web Audio Soundtrack ==========

function createAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return;
  }

  const master = audioCtx.createGain();
  master.gain.value = 0.5;
  master.connect(audioCtx.destination);

  audioNodes = { master, drones: [], melodic: null, boostNoise: null };

  // Drone 1: deep bass sawtooth 55Hz
  const bass = audioCtx.createOscillator();
  bass.type = 'sawtooth';
  bass.frequency.value = 55;
  const bassGain = audioCtx.createGain();
  bassGain.gain.value = 0;
  // LFO vibrato
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.3;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 1.5;
  lfo.connect(lfoGain);
  lfoGain.connect(bass.frequency);
  lfo.start();
  bass.connect(bassGain);
  bassGain.connect(master);
  bass.start();
  audioNodes.drones.push({ osc: bass, gain: bassGain, targetGain: 0.04, lfo });

  // Drone 2: two detuned sines for shimmer/beating
  const pad1 = audioCtx.createOscillator();
  pad1.type = 'sine';
  pad1.frequency.value = 220;
  const pad2 = audioCtx.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 223;
  const padGain = audioCtx.createGain();
  padGain.gain.value = 0;
  pad1.connect(padGain);
  pad2.connect(padGain);
  padGain.connect(master);
  pad1.start();
  pad2.start();
  audioNodes.drones.push({ osc: pad1, osc2: pad2, gain: padGain, targetGain: 0.02 });

  // Filtered noise for space rumble
  const noiseSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, noiseSize, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  const noiseLPF = audioCtx.createBiquadFilter();
  noiseLPF.type = 'lowpass';
  noiseLPF.frequency.value = 200;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0;
  noiseSource.connect(noiseLPF);
  noiseLPF.connect(noiseGain);
  noiseGain.connect(master);
  noiseSource.start();
  audioNodes.drones.push({ source: noiseSource, gain: noiseGain, targetGain: 0.01 });

  // Boost whoosh (high-pass filtered noise, silent until boosting)
  const boostSource = audioCtx.createBufferSource();
  boostSource.buffer = noiseBuffer;
  boostSource.loop = true;
  const boostHPF = audioCtx.createBiquadFilter();
  boostHPF.type = 'highpass';
  boostHPF.frequency.value = 2000;
  const boostGain = audioCtx.createGain();
  boostGain.gain.value = 0;
  boostSource.connect(boostHPF);
  boostHPF.connect(boostGain);
  boostGain.connect(master);
  boostSource.start();
  audioNodes.boostNoise = { source: boostSource, gain: boostGain };
}

function startMusic() {
  if (!audioCtx || musicStarted) return;
  musicStarted = true;

  // Fade in drones
  const now = audioCtx.currentTime;
  for (const d of audioNodes.drones) {
    d.gain.gain.setTargetAtTime(d.targetGain, now, 2);
  }

  // Melodic layer: pentatonic minor scale, one note every 2 seconds
  const scale = [110, 130.81, 146.83, 164.81, 196]; // A2 C3 D3 E3 G3
  melodicInterval = setInterval(() => {
    if (!audioCtx || audioCtx.state === 'closed') {
      clearInterval(melodicInterval);
      return;
    }
    const freq = scale[randInt(0, scale.length)];
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = audioCtx.createGain();
    env.gain.value = 0;
    const t = audioCtx.currentTime;
    env.gain.setTargetAtTime(0.03, t, 0.3);
    env.gain.setTargetAtTime(0, t + 1.2, 0.4);
    osc.connect(env);
    env.connect(audioNodes.master);
    osc.start(t);
    osc.stop(t + 2.5);
  }, 2000);
}

function stopMusic() {
  musicStarted = false;
  if (melodicInterval) {
    clearInterval(melodicInterval);
    melodicInterval = null;
  }
  if (audioCtx && audioNodes) {
    const now = audioCtx.currentTime;
    for (const d of audioNodes.drones) {
      d.gain.gain.setTargetAtTime(0, now, 0.5);
    }
  }
}

function updateBoostSound(isBoosting) {
  if (!audioCtx || !audioNodes || !audioNodes.boostNoise) return;
  const target = isBoosting ? 0.06 : 0;
  audioNodes.boostNoise.gain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.1);
}

function playFoodPip() {
  if (!audioCtx || !audioNodes) return;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 880;
  const env = audioCtx.createGain();
  env.gain.value = 0.08;
  const t = audioCtx.currentTime;
  env.gain.setTargetAtTime(0, t, 0.015);
  osc.connect(env);
  env.connect(audioNodes.master);
  osc.start(t);
  osc.stop(t + 0.08);
}

function playPowerUpChime() {
  if (!audioCtx || !audioNodes) return;
  const freqs = [440, 554, 659];
  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = audioCtx.createGain();
    env.gain.value = 0;
    const t = audioCtx.currentTime + i * 0.08;
    env.gain.setTargetAtTime(0.06, t, 0.01);
    env.gain.setTargetAtTime(0, t + 0.1, 0.05);
    osc.connect(env);
    env.connect(audioNodes.master);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

function playDeath() {
  if (!audioCtx || !audioNodes) return;
  // Noise burst
  const noiseSize = audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, noiseSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const env = audioCtx.createGain();
  env.gain.value = 0.15;
  const t = audioCtx.currentTime;
  env.gain.setTargetAtTime(0, t, 0.3);
  src.connect(env);
  env.connect(audioNodes.master);
  src.start(t);
  src.stop(t + 1);

  // Cut all music
  stopMusic();
}

// ========== Main Game ==========

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    food = [];
    aiSnakes = [];
    cosmicWorms = [];
    powerUps = [];
    particles = [];
    camera = { x: 0, y: 0 };
    frameCount = 0;
    lastPowerUpSpawn = 0;
    wormRespawnTimers = [];
    lastMilestone = 0;

    player = createSnake(ARENA / 2, ARENA / 2, 0, INITIAL_LENGTH, '#6ea', true);

    spawnFood();
    spawnAI();
    spawnCosmicWorms();
    generateStars();

    score = INITIAL_LENGTH;
    scoreEl.textContent = score;
    game.showOverlay('SLITHER', 'Press SPACE to start — Arrows: steer | Space: boost | Collect power-ups to survive');
    game.setState('waiting');

    updateCamera();
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
        // Init audio on first interaction
        createAudio();
        startMusic();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')
          || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    frameCount++;

    // Player steering
    if (input.isDown('ArrowLeft')) {
      player.targetAngle = player.angle - TURN_RATE * 3;
    }
    if (input.isDown('ArrowRight')) {
      player.targetAngle = player.angle + TURN_RATE * 3;
    }

    // Boost
    player.boosting = input.isDown(' ') && player.segments.length > MIN_LENGTH;
    updateBoostSound(player.boosting);

    updateSnake(player);

    // Update AI
    for (const ai of aiSnakes) {
      updateAI(ai);
      updateSnake(ai);
    }

    // Update cosmic worms
    for (const worm of cosmicWorms) {
      updateWorm(worm);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].vx *= 0.97;
      particles[i].vy *= 0.97;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Power-up spawning
    if (frameCount - lastPowerUpSpawn > POWER_UP_INTERVAL) {
      lastPowerUpSpawn = frameCount;
      spawnPowerUp();
    }

    checkCollisions(game);
    spawnFood();
    updateCamera();

    if (player.alive) {
      score = player.segments.length;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }
  };

  game.onDraw = (renderer, text) => {
    const time = frameCount * 0.03;

    // --- Draw parallax starfield ---
    drawStarfield(renderer, time);

    // --- Draw arena border (energy field) ---
    drawEnergyBorder(renderer, time);

    // --- Draw food (cosmic orbs) ---
    drawFood(renderer, time);

    // --- Draw power-ups ---
    drawPowerUps(renderer, text, time);

    // --- Draw cosmic worms ---
    for (const worm of cosmicWorms) {
      drawCosmicWorm(renderer, worm, time);
    }

    // --- Draw AI snakes ---
    for (const ai of aiSnakes) {
      drawSnake(renderer, ai, time);
    }

    // --- Draw player on top ---
    drawSnake(renderer, player, time);

    // --- Draw power-up effect on player ---
    drawPowerEffect(renderer, time);

    // --- Draw particles ---
    for (const p of particles) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

      const alpha = p.life / p.maxLife;
      renderer.fillCircle(sx, sy, p.radius, colorWithAlpha(p.color, alpha));
    }

    // --- Draw length indicator ---
    if (player.alive) {
      const head = player.segments[0];
      const sx = head.x - camera.x;
      const sy = head.y - camera.y;
      const labelSize = Math.min(13, 11 + Math.floor(player.segments.length / 50));
      text.drawText(player.segments.length.toString(), sx, sy - 20 - getSegRadius(player), labelSize, colorWithAlpha('#66eeaa', 0.6), 'center');

      // Power-up label
      if (player.activePower) {
        const puType = POWER_UP_TYPES.find(p => p.type === player.activePower);
        if (puType) {
          const timerPct = player.powerTimer / POWER_UP_DURATION;
          text.drawText(puType.label + ' ' + Math.ceil(player.powerTimer / 60) + 's', sx, sy - 32 - getSegRadius(player), 9, colorWithAlpha(puType.color, 0.5 + timerPct * 0.5), 'center');
        }
      }
    }

    // --- Draw minimap ---
    drawMinimap(renderer);

    // --- Draw boost bar ---
    drawBoostBar(renderer, text);
  };

  // ========== Drawing Helpers ==========

  function drawStarfield(renderer, time) {
    // Nebula clouds first (behind stars)
    for (const cloud of nebulaClouds) {
      const ox = (camera.x * cloud.parallax) % (W + 200);
      const oy = (camera.y * cloud.parallax) % (H + 200);
      let sx = cloud.x - ox;
      let sy = cloud.y - oy;
      // Wrap
      while (sx < -cloud.r) sx += W + 200;
      while (sx > W + cloud.r) sx -= W + 200;
      while (sy < -cloud.r) sy += H + 200;
      while (sy > H + cloud.r) sy -= H + 200;

      renderer.fillCircle(sx, sy, cloud.r, colorWithAlpha(cloud.color, 0.03));
      renderer.fillCircle(sx, sy, cloud.r * 0.6, colorWithAlpha(cloud.color, 0.02));
    }

    // Star layers
    for (const layer of starLayers) {
      const ox = (camera.x * layer.parallax) % (W + 200);
      const oy = (camera.y * layer.parallax) % (H + 200);
      for (const star of layer.stars) {
        let sx = star.x - ox;
        let sy = star.y - oy;
        // Wrap
        while (sx < -5) sx += W + 200;
        while (sx > W + 5) sx -= W + 200;
        while (sy < -5) sy += H + 200;
        while (sy > H + 5) sy -= H + 200;

        let alpha = star.alpha;
        // Twinkle for layer 2
        if (star.twinkle !== undefined) {
          alpha *= 0.7 + 0.3 * Math.sin(time * 2 + star.twinkle);
        }

        renderer.fillCircle(sx, sy, star.r, colorWithAlpha(star.color, alpha));
      }
    }
  }

  function drawEnergyBorder(renderer, time) {
    const bx = -camera.x;
    const by = -camera.y;
    const pulse = 0.3 + 0.2 * Math.sin(time * 0.7);

    // Outer glow
    renderer.setGlow('#6633cc', pulse);

    // Top
    renderer.drawLine(bx, by, bx + ARENA, by, colorWithAlpha('#6633cc', pulse), 4);
    // Bottom
    renderer.drawLine(bx, by + ARENA, bx + ARENA, by + ARENA, colorWithAlpha('#6633cc', pulse), 4);
    // Left
    renderer.drawLine(bx, by, bx, by + ARENA, colorWithAlpha('#6633cc', pulse), 4);
    // Right
    renderer.drawLine(bx + ARENA, by, bx + ARENA, by + ARENA, colorWithAlpha('#6633cc', pulse), 4);

    renderer.setGlow(null);

    // Inner bright line
    renderer.drawLine(bx, by, bx + ARENA, by, colorWithAlpha('#4466ff', pulse * 0.5), 1);
    renderer.drawLine(bx, by + ARENA, bx + ARENA, by + ARENA, colorWithAlpha('#4466ff', pulse * 0.5), 1);
    renderer.drawLine(bx, by, bx, by + ARENA, colorWithAlpha('#4466ff', pulse * 0.5), 1);
    renderer.drawLine(bx + ARENA, by, bx + ARENA, by + ARENA, colorWithAlpha('#4466ff', pulse * 0.5), 1);
  }

  function drawFood(renderer, time) {
    for (const f of food) {
      const sx = f.x - camera.x;
      const sy = f.y - camera.y;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

      const pulse = 1 + Math.sin(time * 1.5 + f.pulse) * 0.3;
      const r = f.radius * pulse;
      const driftX = Math.sin(time * 0.5 + f.drift) * 1.5;
      const driftY = Math.cos(time * 0.4 + f.drift * 1.3) * 1.5;

      // Outer halo
      renderer.fillCircle(sx + driftX, sy + driftY, r * 2.5, colorWithAlpha(f.color, 0.06));
      // Mid glow
      renderer.setGlow(f.color, 0.3);
      renderer.fillCircle(sx + driftX, sy + driftY, r * 1.4, colorWithAlpha(f.color, 0.3));
      renderer.setGlow(null);
      // Inner bright core
      renderer.fillCircle(sx + driftX, sy + driftY, r * 0.7, colorWithAlpha(f.color, 0.9));
    }
  }

  function drawPowerUps(renderer, text, time) {
    for (const pu of powerUps) {
      const sx = pu.x - camera.x;
      const sy = pu.y - camera.y;
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

      const pulse = 1 + Math.sin(time * 2 + pu.pulse) * 0.15;
      const r = POWER_UP_RADIUS * pulse;
      const spin = time * 2 + pu.spin;

      // Outer glow
      renderer.fillCircle(sx, sy, r * 2.5, colorWithAlpha(pu.color, 0.05));
      renderer.setGlow(pu.color, 0.6);
      renderer.fillCircle(sx, sy, r, colorWithAlpha(pu.color, 0.7));
      renderer.setGlow(null);

      // Spinning ring
      for (let i = 0; i < 4; i++) {
        const a = spin + i * Math.PI / 2;
        const rx = sx + Math.cos(a) * (r + 4);
        const ry = sy + Math.sin(a) * (r + 4);
        renderer.fillCircle(rx, ry, 2, colorWithAlpha(pu.color, 0.8));
      }

      // Inner bright core
      renderer.fillCircle(sx, sy, r * 0.4, '#fff');

      // Label
      text.drawText(pu.label, sx, sy - r - 8, 8, colorWithAlpha(pu.color, 0.7), 'center');
    }
  }

  function drawCosmicWorm(renderer, worm, time) {
    if (!worm.alive) return;

    const len = worm.segments.length;
    for (let i = len - 1; i >= 0; i--) {
      const seg = worm.segments[i];
      const sx = seg.x - camera.x;
      const sy = seg.y - camera.y;
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

      const t = i / len;
      const radius = WORM_RADIUS * (0.5 + t * 0.5);
      const alpha = 0.3 + t * 0.7;

      if (i === 0) {
        // Worm head: brighter, glowing
        renderer.setGlow('#d8f', 0.5);
        renderer.fillCircle(sx, sy, WORM_RADIUS + 3, '#c8f');
        renderer.setGlow(null);

        // Eyes
        const eyeOffset = WORM_RADIUS * 0.5;
        const eyeAngle1 = worm.angle - 0.4;
        const eyeAngle2 = worm.angle + 0.4;
        renderer.fillCircle(sx + Math.cos(eyeAngle1) * eyeOffset, sy + Math.sin(eyeAngle1) * eyeOffset, 3, '#fff');
        renderer.fillCircle(sx + Math.cos(eyeAngle2) * eyeOffset, sy + Math.sin(eyeAngle2) * eyeOffset, 3, '#fff');
        renderer.fillCircle(sx + Math.cos(eyeAngle1) * (eyeOffset + 1.5), sy + Math.sin(eyeAngle1) * (eyeOffset + 1.5), 1.5, '#111');
        renderer.fillCircle(sx + Math.cos(eyeAngle2) * (eyeOffset + 1.5), sy + Math.sin(eyeAngle2) * (eyeOffset + 1.5), 1.5, '#111');
      } else {
        // Body: subtle glow trail
        if (i % 3 === 0) {
          renderer.fillCircle(sx, sy, radius + 3, colorWithAlpha(WORM_COLOR, 0.05));
        }
        renderer.fillCircle(sx, sy, radius, colorWithAlpha(WORM_COLOR, alpha));
      }
    }
  }

  function drawSnake(renderer, snake, time) {
    if (!snake.alive) return;

    const len = snake.segments.length;
    const segR = snake.isPlayer ? getSegRadius(snake) : BASE_SEG_RADIUS;
    const isGhost = snake.isPlayer && snake.activePower === 'ghost';
    const ghostAlpha = isGhost ? 0.35 : 1;

    // Glow trail behind snake (every 3rd segment)
    for (let i = len - 1; i >= 3; i -= 3) {
      const seg = snake.segments[i];
      const sx = seg.x - camera.x;
      const sy = seg.y - camera.y;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      renderer.fillCircle(sx, sy, segR * 0.6, colorWithAlpha(snake.color, 0.04 * ghostAlpha));
    }

    // Draw from tail to head
    for (let i = len - 1; i >= 0; i--) {
      const seg = snake.segments[i];
      const sx = seg.x - camera.x;
      const sy = seg.y - camera.y;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

      const t = i / len;
      const radius = segR * (0.6 + t * 0.4);
      const alpha = (0.4 + t * 0.6) * ghostAlpha;

      if (i === 0) {
        // Head — bigger, brighter, corona glow
        renderer.setGlow(snake.color, 0.6 * ghostAlpha);
        renderer.fillCircle(sx, sy, segR + 2, isGhost ? colorWithAlpha(snake.color, 0.35) : snake.color);
        renderer.setGlow(null);

        // Corona for player
        if (snake.isPlayer) {
          renderer.fillCircle(sx, sy, segR + 6, colorWithAlpha(snake.color, 0.08 * ghostAlpha));
        }

        // Eyes
        const eyeOffset = segR * 0.5;
        const eyeAngle1 = snake.angle - 0.5;
        const eyeAngle2 = snake.angle + 0.5;
        const ex1 = sx + Math.cos(eyeAngle1) * eyeOffset;
        const ey1 = sy + Math.sin(eyeAngle1) * eyeOffset;
        const ex2 = sx + Math.cos(eyeAngle2) * eyeOffset;
        const ey2 = sy + Math.sin(eyeAngle2) * eyeOffset;
        renderer.fillCircle(ex1, ey1, 2.5, colorWithAlpha('#fff', ghostAlpha));
        renderer.fillCircle(ex2, ey2, 2.5, colorWithAlpha('#fff', ghostAlpha));
        renderer.fillCircle(sx + Math.cos(eyeAngle1) * (eyeOffset + 1), sy + Math.sin(eyeAngle1) * (eyeOffset + 1), 1.2, '#111');
        renderer.fillCircle(sx + Math.cos(eyeAngle2) * (eyeOffset + 1), sy + Math.sin(eyeAngle2) * (eyeOffset + 1), 1.2, '#111');
      } else {
        renderer.fillCircle(sx, sy, radius, colorWithAlpha(snake.color, alpha));
      }
    }

    // Boost trail
    if (snake.boosting) {
      const head = snake.segments[0];
      const sx = head.x - camera.x;
      const sy = head.y - camera.y;

      // Speed power-up: yellow lightning trail
      const trailColor = snake.activePower === 'speed' ? '#ff4' : snake.color;
      for (let i = 0; i < 4; i++) {
        const angle = snake.angle + Math.PI + rand(-0.6, 0.6);
        const d = rand(8, 20);
        renderer.fillCircle(
          sx + Math.cos(angle) * d,
          sy + Math.sin(angle) * d,
          rand(1, 3.5),
          colorWithAlpha(trailColor, 0.4)
        );
      }
    }
  }

  function drawPowerEffect(renderer, time) {
    if (!player.alive || !player.activePower) return;
    const head = player.segments[0];
    const sx = head.x - camera.x;
    const sy = head.y - camera.y;
    const segR = getSegRadius(player);

    if (player.activePower === 'shield') {
      // Glowing ring around head
      const pulse = 0.5 + 0.2 * Math.sin(time * 3);
      renderer.setGlow('#4af', pulse);
      // Draw shield ring as multiple small circles
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12 + time;
        const rx = sx + Math.cos(a) * (segR + 6);
        const ry = sy + Math.sin(a) * (segR + 6);
        renderer.fillCircle(rx, ry, 1.5, colorWithAlpha('#4af', 0.7));
      }
      renderer.setGlow(null);
    }

    if (player.activePower === 'magnet') {
      // Pink field lines radiating from head
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + time * 0.5;
        const d1 = segR + 8 + Math.sin(time * 2 + i) * 4;
        const d2 = d1 + 20 + Math.sin(time * 3 + i * 2) * 10;
        renderer.drawLine(
          sx + Math.cos(a) * d1, sy + Math.sin(a) * d1,
          sx + Math.cos(a) * d2, sy + Math.sin(a) * d2,
          colorWithAlpha('#f4f', 0.2), 1
        );
      }
    }

    if (player.activePower === 'speed') {
      // Yellow lightning trail (handled in boost trail too)
      if (!player.boosting) {
        for (let i = 0; i < 2; i++) {
          const angle = player.angle + Math.PI + rand(-0.4, 0.4);
          const d = rand(6, 14);
          renderer.fillCircle(
            sx + Math.cos(angle) * d,
            sy + Math.sin(angle) * d,
            rand(1, 2),
            colorWithAlpha('#ff4', 0.3)
          );
        }
      }
    }
  }

  function drawMinimap(renderer) {
    const mmSize = 100;
    const mmX = W - mmSize - 10;
    const mmY = H - mmSize - 10;
    const scale = mmSize / ARENA;

    // Background
    renderer.fillRect(mmX, mmY, mmSize, mmSize, 'rgba(5, 5, 16, 0.8)');

    // Border
    const borderPts = [
      { x: mmX, y: mmY },
      { x: mmX + mmSize, y: mmY },
      { x: mmX + mmSize, y: mmY + mmSize },
      { x: mmX, y: mmY + mmSize }
    ];
    renderer.strokePoly(borderPts, '#224', 1, true);

    // Food dots (sparse)
    for (let i = 0; i < food.length; i += 4) {
      const f = food[i];
      renderer.fillRect(mmX + f.x * scale, mmY + f.y * scale, 1, 1, 'rgba(255,255,255,0.1)');
    }

    // Power-ups on minimap
    for (const pu of powerUps) {
      renderer.fillRect(mmX + pu.x * scale - 1, mmY + pu.y * scale - 1, 3, 3, colorWithAlpha(pu.color, 0.8));
    }

    // AI snakes
    for (const ai of aiSnakes) {
      if (!ai.alive) continue;
      const h = ai.segments[0];
      renderer.fillRect(mmX + h.x * scale - 1, mmY + h.y * scale - 1, 3, 3, colorWithAlpha(ai.color, 0.7));
    }

    // Cosmic worms (larger dots)
    for (const worm of cosmicWorms) {
      if (!worm.alive) continue;
      const h = worm.segments[0];
      renderer.fillRect(mmX + h.x * scale - 2, mmY + h.y * scale - 2, 5, 5, colorWithAlpha(WORM_COLOR, 0.8));
    }

    // Player
    if (player.alive) {
      const h = player.segments[0];
      renderer.setGlow('#6ea', 0.3);
      renderer.fillRect(mmX + h.x * scale - 2, mmY + h.y * scale - 2, 4, 4, '#6ea');
      renderer.setGlow(null);
    }
  }

  function drawBoostBar(renderer, text) {
    if (!player.alive) return;
    const canBoost = player.segments.length > MIN_LENGTH;
    const barW = 80;
    const barH = 8;
    const bx = 10;
    const by = H - 20;

    renderer.fillRect(bx, by, barW, barH, '#0a0a1e');

    if (canBoost) {
      const fill = (player.segments.length - MIN_LENGTH) / 50;
      const barColor = player.boosting ? '#ff0' : '#6ea';
      renderer.setGlow(barColor, 0.3);
      renderer.fillRect(bx, by, barW * Math.min(1, fill), barH, barColor);
      renderer.setGlow(null);
    }

    const borderPts = [
      { x: bx, y: by },
      { x: bx + barW, y: by },
      { x: bx + barW, y: by + barH },
      { x: bx, y: by + barH }
    ];
    renderer.strokePoly(borderPts, '#224', 1, true);

    text.drawText('BOOST', bx, by - 6, 10, '#888', 'left');
  }

  game.start();
  return game;
}
