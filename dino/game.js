// dino/game.js — Dino Run game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 300;

// Theme
const THEME = '#a4f';
const THEME_DIM = '#73b';

// Ground
const GROUND_Y = H - 40;

// Dino constants
const DINO_X = 60;
const DINO_W = 28;
const DINO_H = 36;
const DINO_DUCK_H = 20;
const DINO_DUCK_W = 36;
const JUMP_FORCE = -10;
const GRAVITY = 0.5;

// ── State ──
let score, best = 0;
let dino, obstacles, stars, groundOffset, frameCount, speed;
let scoreAccumulator;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// Star field
function generateStars() {
  const s = [];
  for (let i = 0; i < 30; i++) {
    s.push({
      x: Math.random() * W,
      y: Math.random() * (GROUND_Y - 40),
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.4 + 0.1,
      speed: Math.random() * 0.3 + 0.1
    });
  }
  return s;
}

function spawnObstacle() {
  const type = Math.random();

  if (type < 0.55) {
    // Cactus - small
    const h = 20 + Math.random() * 16;
    obstacles.push({
      type: 'cactus',
      x: W + 20,
      y: GROUND_Y - h,
      w: 12,
      h: h
    });
  } else if (type < 0.85) {
    // Cactus - cluster (wide)
    const h = 24 + Math.random() * 18;
    const w = 24 + Math.random() * 16;
    obstacles.push({
      type: 'cactus',
      x: W + 20,
      y: GROUND_Y - h,
      w: w,
      h: h
    });
  } else {
    // Pterodactyl - flies at head height or mid height
    const flyY = Math.random() < 0.5
      ? GROUND_Y - DINO_H - 14  // Head height (must duck)
      : GROUND_Y - DINO_H + 4;  // Mid height (can jump or duck)
    obstacles.push({
      type: 'ptero',
      x: W + 20,
      y: flyY,
      w: 30,
      h: 18,
      wingFrame: 0
    });
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    dino = {
      x: DINO_X,
      y: GROUND_Y - DINO_H,
      w: DINO_W,
      h: DINO_H,
      vy: 0,
      jumping: false,
      ducking: false,
      legFrame: 0
    };
    obstacles = [];
    stars = generateStars();
    groundOffset = 0;
    frameCount = 0;
    speed = 4;
    score = 0;
    scoreAccumulator = 0;
    scoreEl.textContent = '0';
    game.showOverlay('DINO RUN', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
        // Execute first jump
        dino.vy = JUMP_FORCE;
        dino.jumping = true;
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Progressive speed increase
    speed = 4 + Math.min(frameCount / 600, 5);

    // Dino ducking
    if (input.isDown('ArrowDown')) {
      if (!dino.ducking && !dino.jumping) {
        dino.ducking = true;
        dino.h = DINO_DUCK_H;
        dino.w = DINO_DUCK_W;
        dino.y = GROUND_Y - DINO_DUCK_H;
      }
    } else {
      if (dino.ducking) {
        dino.ducking = false;
        dino.h = DINO_H;
        dino.w = DINO_W;
        dino.y = GROUND_Y - DINO_H;
      }
    }

    // Dino jumping
    if (dino.jumping) {
      dino.vy += GRAVITY;
      dino.y += dino.vy;

      // Fast fall when holding down during jump
      if (input.isDown('ArrowDown')) {
        dino.vy += GRAVITY * 1.5;
      }

      const landY = dino.ducking ? GROUND_Y - DINO_DUCK_H : GROUND_Y - DINO_H;
      if (dino.y >= landY) {
        dino.y = landY;
        dino.vy = 0;
        dino.jumping = false;
      }
    }

    // Jump input
    if ((input.wasPressed(' ') || input.wasPressed('ArrowUp')) && !dino.jumping) {
      dino.vy = JUMP_FORCE;
      dino.jumping = true;
    }

    // Running animation
    dino.legFrame += speed * 0.1;

    // Ground scroll
    groundOffset = (groundOffset + speed) % 20;

    // Star scroll
    for (let i = 0; i < stars.length; i++) {
      stars[i].x -= stars[i].speed * speed * 0.15;
      if (stars[i].x < -5) {
        stars[i].x = W + 5;
        stars[i].y = Math.random() * (GROUND_Y - 40);
      }
    }

    // Spawn obstacles
    const minGap = Math.max(80, 160 - speed * 8);
    const lastObs = obstacles[obstacles.length - 1];
    if (!lastObs || lastObs.x < W - minGap - Math.random() * 120) {
      spawnObstacle();
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed;

      // Pterodactyl wing animation
      if (obs.type === 'ptero') {
        obs.wingFrame += 0.12;
      }

      // Remove off-screen
      if (obs.x + obs.w < -20) {
        obstacles.splice(i, 1);
        continue;
      }

      // Collision detection (AABB with slight padding for fairness)
      const pad = 4;
      const dx = dino.x + pad;
      const dy = dino.y + pad;
      const dw = dino.w - pad * 2;
      const dh = dino.h - pad * 2;

      if (dx < obs.x + obs.w &&
          dx + dw > obs.x &&
          dy < obs.y + obs.h &&
          dy + dh > obs.y) {
        // Die
        game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // Score: increases continuously based on distance
    scoreAccumulator += speed * 0.05;
    if (scoreAccumulator >= 1) {
      const add = Math.floor(scoreAccumulator);
      score += add;
      scoreAccumulator -= add;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      // Use dim white with alpha approximated by size
      const bright = Math.round(s.brightness * 255);
      const hex = bright.toString(16).padStart(2, '0');
      const starColor = `#${hex}${hex}${hex}`;
      renderer.fillRect(s.x, s.y, s.size, s.size, starColor);
    }

    // Ground line
    renderer.drawLine(0, GROUND_Y, W, GROUND_Y, THEME_DIM, 2);

    // Ground texture (scrolling dashes)
    for (let x = -groundOffset; x < W; x += 20) {
      const len = 4 + (((x * 7 + 13) % 11) / 11) * 8;
      const yOff = 4 + (((x * 3 + 7) % 7) / 7) * 10;
      renderer.drawLine(x, GROUND_Y + yOff, x + len, GROUND_Y + yOff, '#333', 1);
    }

    // Obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.type === 'cactus') {
        drawCactus(renderer, obs);
      } else {
        drawPtero(renderer, obs);
      }
    }

    // Dino
    drawDino(renderer);
  };

  function drawCactus(renderer, obs) {
    renderer.setGlow('#2a8', 0.4);

    // Main trunk
    renderer.fillRect(obs.x, obs.y, obs.w, obs.h, '#2a8');

    // Arms if cactus is tall enough and narrow
    if (obs.h > 24 && obs.w < 20) {
      // Left arm
      const armY = obs.y + obs.h * 0.3;
      renderer.fillRect(obs.x - 6, armY, 6, 4, '#2a8');
      renderer.fillRect(obs.x - 6, armY - 8, 4, 12, '#2a8');

      // Right arm
      const armY2 = obs.y + obs.h * 0.5;
      renderer.fillRect(obs.x + obs.w, armY2, 6, 4, '#2a8');
      renderer.fillRect(obs.x + obs.w + 2, armY2 - 6, 4, 10, '#2a8');
    }

    renderer.setGlow(null);
  }

  function drawPtero(renderer, obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    const wingUp = Math.sin(obs.wingFrame * Math.PI) > 0;

    renderer.setGlow('#e66', 0.4);

    // Body
    renderer.fillRect(cx - 8, cy - 3, 16, 6, '#e66');

    // Head
    renderer.fillRect(cx + 8, cy - 6, 8, 6, '#e66');
    // Beak
    renderer.fillRect(cx + 16, cy - 4, 5, 3, '#e66');

    // Wings
    if (wingUp) {
      renderer.fillRect(cx - 6, cy - 12, 12, 4, '#e66');
      renderer.fillRect(cx - 2, cy - 16, 6, 4, '#e66');
    } else {
      renderer.fillRect(cx - 6, cy + 3, 12, 4, '#e66');
      renderer.fillRect(cx - 2, cy + 7, 6, 4, '#e66');
    }

    // Tail
    renderer.fillRect(cx - 12, cy - 2, 4, 3, '#e66');

    renderer.setGlow(null);
  }

  function drawDino(renderer) {
    const x = dino.x;
    const y = dino.y;

    renderer.setGlow(THEME, 0.6);

    if (dino.ducking) {
      // Ducking dino - wide and low
      // Body (long horizontal)
      renderer.fillRect(x, y + 4, 32, 12, THEME);
      // Head
      renderer.fillRect(x + 26, y, 10, 10, THEME);
      // Eye
      renderer.fillRect(x + 32, y + 2, 3, 3, '#fff');
      // Legs (alternating)
      const legPhase = Math.sin(dino.legFrame) > 0;
      if (legPhase) {
        renderer.fillRect(x + 4, y + 16, 4, 4, THEME);
        renderer.fillRect(x + 18, y + 16, 4, 4, THEME);
      } else {
        renderer.fillRect(x + 10, y + 16, 4, 4, THEME);
        renderer.fillRect(x + 24, y + 16, 4, 4, THEME);
      }
    } else {
      // Standing/running dino
      // Head
      renderer.fillRect(x + 6, y, 22, 14, THEME);
      // Eye
      renderer.fillRect(x + 20, y + 3, 4, 4, '#fff');
      // Mouth line
      renderer.fillRect(x + 18, y + 10, 10, 2, '#1a1a2e');
      // Neck
      renderer.fillRect(x + 6, y + 12, 12, 4, THEME);
      // Body
      renderer.fillRect(x + 2, y + 14, 20, 12, THEME);
      // Tail
      renderer.fillRect(x - 4, y + 14, 6, 4, THEME);
      renderer.fillRect(x - 8, y + 12, 4, 4, THEME);
      // Arms
      renderer.fillRect(x + 18, y + 16, 6, 3, THEME);
      renderer.fillRect(x + 22, y + 19, 3, 3, THEME);

      // Legs (alternating run animation)
      if (dino.jumping) {
        // Both legs down when jumping
        renderer.fillRect(x + 4, y + 26, 5, 6, THEME);
        renderer.fillRect(x + 14, y + 26, 5, 6, THEME);
        renderer.fillRect(x + 4, y + 32, 4, 4, THEME);
        renderer.fillRect(x + 14, y + 32, 4, 4, THEME);
      } else {
        const legPhase = Math.sin(dino.legFrame) > 0;
        if (legPhase) {
          // Left leg forward, right back
          renderer.fillRect(x + 4, y + 26, 5, 8, THEME);
          renderer.fillRect(x + 4, y + 32, 4, 4, THEME);
          renderer.fillRect(x + 14, y + 26, 5, 4, THEME);
        } else {
          // Right leg forward, left back
          renderer.fillRect(x + 14, y + 26, 5, 8, THEME);
          renderer.fillRect(x + 14, y + 32, 4, 4, THEME);
          renderer.fillRect(x + 4, y + 26, 5, 4, THEME);
        }
      }
    }

    renderer.setGlow(null);
  }

  game.start();
  return game;
}
