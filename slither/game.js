// slither/game.js — Slither game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// Arena
const ARENA = 3000;
const GRID_SIZE = 60;

// Snake config
const SEG_RADIUS = 6;
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

// Pre-computed food colors (replaces HSL)
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
let player, aiSnakes, food, camera, particles;
let frameCount = 0;

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

// Color helper: expand shorthand hex to full hex and add alpha
function colorWithAlpha(hexColor, alpha) {
  let hex = hexColor;
  if (hex.length === 4) { // #rgb
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex + alphaHex;
}

function randFoodColor() {
  return FOOD_COLORS[randInt(0, FOOD_COLORS.length)];
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
    // AI properties
    targetAngle: angle,
    aiTimer: 0,
    aiTarget: null
  };
}

// --- Food ---
function createFood(x, y, radius, color) {
  return {
    x: x !== undefined ? x : rand(50, ARENA - 50),
    y: y !== undefined ? y : rand(50, ARENA - 50),
    radius: radius || FOOD_RADIUS,
    color: color || randFoodColor(),
    pulse: rand(0, Math.PI * 2)
  };
}

function spawnFood() {
  while (food.length < MAX_FOOD) {
    food.push(createFood());
  }
}

// --- Particles ---
function addParticle(x, y, color) {
  particles.push({
    x, y,
    vx: rand(-2, 2),
    vy: rand(-2, 2),
    life: rand(15, 30),
    maxLife: 30,
    color,
    radius: rand(1, 3)
  });
}

// --- Snake to food conversion ---
function snakeToFood(snake) {
  for (let i = 0; i < snake.segments.length; i += 2) {
    const seg = snake.segments[i];
    food.push(createFood(seg.x + rand(-5, 5), seg.y + rand(-5, 5), FOOD_RADIUS + 1, snake.color));
  }
}

// --- AI spawning ---
function spawnAI() {
  while (aiSnakes.length < MAX_AI) {
    let x, y;
    // Spawn away from player
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

// --- Update snake movement ---
function updateSnake(snake) {
  if (!snake.alive) return;

  const head = snake.segments[0];
  const speed = snake.boosting ? BOOST_SPEED : BASE_SPEED;
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

  // Wall bounce -- push away from edges
  const margin = 30;
  if (newHead.x < margin) { newHead.x = margin; snake.angle = 0; snake.targetAngle = 0; }
  if (newHead.x > ARENA - margin) { newHead.x = ARENA - margin; snake.angle = Math.PI; snake.targetAngle = Math.PI; }
  if (newHead.y < margin) { newHead.y = margin; snake.angle = Math.PI / 2; snake.targetAngle = Math.PI / 2; }
  if (newHead.y > ARENA - margin) { newHead.y = ARENA - margin; snake.angle = -Math.PI / 2; snake.targetAngle = -Math.PI / 2; }

  snake.segments.unshift(newHead);

  // Maintain segment spacing by trimming tail
  while (snake.segments.length > 2) {
    const len = snake.segments.length;
    const tail1 = snake.segments[len - 1];
    const tail2 = snake.segments[len - 2];
    if (dist(tail1, tail2) < SEG_SPACING * 0.5) {
      snake.segments.pop();
    } else {
      break;
    }
  }

  // Boosting shrinks the snake
  if (snake.boosting && snake.segments.length > MIN_LENGTH) {
    if (Math.random() < 0.15) {
      const tail = snake.segments.pop();
      // Drop food behind
      food.push(createFood(tail.x, tail.y, 3, snake.color));
    }
  }

  // Eat food
  for (let i = food.length - 1; i >= 0; i--) {
    if (dist(head, food[i]) < FOOD_EAT_DIST + food[i].radius) {
      // Grow: add a segment at the tail
      const tail = snake.segments[snake.segments.length - 1];
      snake.segments.push({ x: tail.x, y: tail.y });
      snake.segments.push({ x: tail.x, y: tail.y });

      addParticle(food[i].x, food[i].y, food[i].color);
      addParticle(food[i].x, food[i].y, food[i].color);
      food.splice(i, 1);

      if (snake.isPlayer) {
        score = snake.segments.length;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
      }
    }
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

    // Find nearest food
    let nearestFood = null;
    let nearestDist = Infinity;
    for (const f of food) {
      const d = dist(head, f);
      if (d < nearestDist) {
        nearestDist = d;
        nearestFood = f;
      }
    }

    // Sometimes target player if close
    if (player.alive && Math.random() < 0.15) {
      const playerHead = player.segments[0];
      const dToPlayer = dist(head, playerHead);
      if (dToPlayer < 300 && snake.segments.length > player.segments.length) {
        // Try to cut off player
        const ahead = {
          x: playerHead.x + Math.cos(player.angle) * 80,
          y: playerHead.y + Math.sin(player.angle) * 80
        };
        snake.targetAngle = Math.atan2(ahead.y - head.y, ahead.x - head.x);
        snake.boosting = dToPlayer < 150;
        return;
      }
    }

    // Avoid nearby snake heads
    const allSnakes = [player, ...aiSnakes];
    for (const other of allSnakes) {
      if (other === snake || !other.alive) continue;
      const otherHead = other.segments[0];
      const d = dist(head, otherHead);
      if (d < 80) {
        // Turn away
        const awayAngle = Math.atan2(head.y - otherHead.y, head.x - otherHead.x);
        snake.targetAngle = awayAngle;
        snake.boosting = d < 40;
        return;
      }
      // Check body segments nearby
      for (let i = 3; i < other.segments.length; i += 3) {
        if (dist(head, other.segments[i]) < 40) {
          const awayAngle = Math.atan2(head.y - other.segments[i].y, head.x - other.segments[i].x);
          snake.targetAngle = awayAngle;
          return;
        }
      }
    }

    // Go toward food
    if (nearestFood && nearestDist < 300) {
      snake.targetAngle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
    } else {
      // Wander toward center with some randomness
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

    for (let oi = 0; oi < allSnakes.length; oi++) {
      if (si === oi) continue;
      const other = allSnakes[oi];
      if (!other.alive) continue;

      // Check head against other's body (skip first few segments)
      for (let j = 4; j < other.segments.length; j++) {
        const seg = other.segments[j];
        if (dist(head, seg) < SEG_RADIUS * 2) {
          // Snake dies
          snake.alive = false;
          snakeToFood(snake);

          // Particles at death location
          for (let p = 0; p < 10; p++) {
            addParticle(head.x, head.y, snake.color);
          }

          if (snake.isPlayer) {
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            game.showOverlay('GAME OVER', `Length: ${score} -- Press any key to restart`);
            game.setState('over');
            return;
          }
          break;
        }
      }
    }
  }

  // Remove dead AI and respawn
  for (let i = aiSnakes.length - 1; i >= 0; i--) {
    if (!aiSnakes[i].alive) {
      aiSnakes.splice(i, 1);
    }
  }
  spawnAI();
}

// --- Camera ---
function updateCamera() {
  if (!player.alive) return;
  const head = player.segments[0];
  camera.x = head.x - W / 2;
  camera.y = head.y - H / 2;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    food = [];
    aiSnakes = [];
    particles = [];
    camera = { x: 0, y: 0 };
    frameCount = 0;

    // Create player in center
    player = createSnake(ARENA / 2, ARENA / 2, 0, INITIAL_LENGTH, '#6ea', true);

    spawnFood();
    spawnAI();

    score = INITIAL_LENGTH;
    scoreEl.textContent = score;
    game.showOverlay('SLITHER', 'Press SPACE to start -- Arrows: steer | Space: boost');
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

    updateSnake(player);

    // Update AI
    for (const ai of aiSnakes) {
      updateAI(ai);
      updateSnake(ai);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    checkCollisions(game);
    spawnFood();
    updateCamera();

    // Update score
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
    // --- Draw grid ---
    const startX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;
    for (let x = startX; x < camera.x + W + GRID_SIZE; x += GRID_SIZE) {
      const sx = x - camera.x;
      renderer.drawLine(sx, 0, sx, H, '#16213e', 1);
    }
    for (let y = startY; y < camera.y + H + GRID_SIZE; y += GRID_SIZE) {
      const sy = y - camera.y;
      renderer.drawLine(0, sy, W, sy, '#16213e', 1);
    }

    // --- Draw arena border ---
    const bx = -camera.x;
    const by = -camera.y;
    renderer.setGlow('#f44', 0.5);
    // Top edge
    renderer.drawLine(bx, by, bx + ARENA, by, '#f44', 3);
    // Bottom edge
    renderer.drawLine(bx, by + ARENA, bx + ARENA, by + ARENA, '#f44', 3);
    // Left edge
    renderer.drawLine(bx, by, bx, by + ARENA, '#f44', 3);
    // Right edge
    renderer.drawLine(bx + ARENA, by, bx + ARENA, by + ARENA, '#f44', 3);
    renderer.setGlow(null);

    // --- Draw food ---
    const time = frameCount * 0.05;
    for (const f of food) {
      const sx = f.x - camera.x;
      const sy = f.y - camera.y;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

      const pulse = 1 + Math.sin(time + f.pulse) * 0.3;
      const r = f.radius * pulse;

      renderer.setGlow(f.color, 0.4);
      renderer.fillCircle(sx, sy, r, colorWithAlpha(f.color, 0.8));
      renderer.setGlow(null);
    }

    // --- Draw AI snakes ---
    for (const ai of aiSnakes) {
      drawSnake(renderer, ai);
    }

    // --- Draw player on top ---
    drawSnake(renderer, player);

    // --- Draw particles ---
    for (const p of particles) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

      const alpha = p.life / p.maxLife;
      renderer.fillCircle(sx, sy, p.radius, colorWithAlpha(p.color, alpha));
    }

    // --- Draw length indicator near player head ---
    if (player.alive) {
      const head = player.segments[0];
      const sx = head.x - camera.x;
      const sy = head.y - camera.y;
      text.drawText(player.segments.length.toString(), sx, sy - 18, 11, colorWithAlpha('#66eeaa', 0.6), 'center');
    }

    // --- Draw minimap ---
    drawMinimap(renderer);

    // --- Draw boost bar ---
    drawBoostBar(renderer, text);
  };

  // --- Drawing helpers ---

  function drawSnake(renderer, snake) {
    if (!snake.alive) return;

    const len = snake.segments.length;
    // Draw from tail to head so head is on top
    for (let i = len - 1; i >= 0; i--) {
      const seg = snake.segments[i];
      const sx = seg.x - camera.x;
      const sy = seg.y - camera.y;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

      const t = i / len;
      const radius = SEG_RADIUS * (0.6 + t * 0.4);

      // Brighter at head, dimmer at tail
      const alpha = 0.4 + t * 0.6;

      if (i === 0) {
        // Head -- bigger, brighter, glowing
        renderer.setGlow(snake.color, 0.6);
        renderer.fillCircle(sx, sy, SEG_RADIUS + 2, snake.color);
        renderer.setGlow(null);

        // Eyes
        const eyeOffset = SEG_RADIUS * 0.5;
        const eyeAngle1 = snake.angle - 0.5;
        const eyeAngle2 = snake.angle + 0.5;
        const ex1 = sx + Math.cos(eyeAngle1) * eyeOffset;
        const ey1 = sy + Math.sin(eyeAngle1) * eyeOffset;
        const ex2 = sx + Math.cos(eyeAngle2) * eyeOffset;
        const ey2 = sy + Math.sin(eyeAngle2) * eyeOffset;
        renderer.fillCircle(ex1, ey1, 2.5, '#fff');
        renderer.fillCircle(ex2, ey2, 2.5, '#fff');

        // Pupils
        const px1 = sx + Math.cos(eyeAngle1) * (eyeOffset + 1);
        const py1 = sy + Math.sin(eyeAngle1) * (eyeOffset + 1);
        const px2 = sx + Math.cos(eyeAngle2) * (eyeOffset + 1);
        const py2 = sy + Math.sin(eyeAngle2) * (eyeOffset + 1);
        renderer.fillCircle(px1, py1, 1.2, '#111');
        renderer.fillCircle(px2, py2, 1.2, '#111');
      } else {
        renderer.fillCircle(sx, sy, radius, colorWithAlpha(snake.color, alpha));
      }
    }

    // Boost trail
    if (snake.boosting) {
      const head = snake.segments[0];
      const sx = head.x - camera.x;
      const sy = head.y - camera.y;
      for (let i = 0; i < 3; i++) {
        const angle = snake.angle + Math.PI + rand(-0.5, 0.5);
        const d = rand(8, 16);
        renderer.fillCircle(
          sx + Math.cos(angle) * d,
          sy + Math.sin(angle) * d,
          rand(1, 3),
          colorWithAlpha(snake.color, 0.3)
        );
      }
    }
  }

  function drawMinimap(renderer) {
    const mmSize = 100;
    const mmX = W - mmSize - 10;
    const mmY = H - mmSize - 10;
    const scale = mmSize / ARENA;

    // Background
    renderer.fillRect(mmX, mmY, mmSize, mmSize, 'rgba(22, 33, 62, 0.8)');

    // Border
    const borderPts = [
      { x: mmX, y: mmY },
      { x: mmX + mmSize, y: mmY },
      { x: mmX + mmSize, y: mmY + mmSize },
      { x: mmX, y: mmY + mmSize }
    ];
    renderer.strokePoly(borderPts, '#0f3460', 1, true);

    // Food dots (sparse)
    for (let i = 0; i < food.length; i += 4) {
      const f = food[i];
      renderer.fillRect(mmX + f.x * scale, mmY + f.y * scale, 1, 1, 'rgba(255,255,255,0.15)');
    }

    // AI snakes
    for (const ai of aiSnakes) {
      if (!ai.alive) continue;
      const h = ai.segments[0];
      renderer.fillRect(
        mmX + h.x * scale - 1,
        mmY + h.y * scale - 1,
        3, 3,
        colorWithAlpha(ai.color, 0.7)
      );
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

    // Background
    renderer.fillRect(bx, by, barW, barH, '#16213e');

    if (canBoost) {
      const fill = (player.segments.length - MIN_LENGTH) / 50;
      const barColor = player.boosting ? '#ff0' : '#6ea';
      renderer.setGlow(barColor, 0.3);
      renderer.fillRect(bx, by, barW * Math.min(1, fill), barH, barColor);
      renderer.setGlow(null);
    }

    // Border
    const borderPts = [
      { x: bx, y: by },
      { x: bx + barW, y: by },
      { x: bx + barW, y: by + barH },
      { x: bx, y: by + barH }
    ];
    renderer.strokePoly(borderPts, '#0f3460', 1, true);

    // Label
    text.drawText('BOOST', bx, by - 6, 10, '#888', 'left');
  }

  game.start();
  return game;
}
