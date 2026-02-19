// jetpack-joyride/game.js — Jetpack Joyride game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// --- Constants ---
const GRAVITY = 0.4;
const THRUST = -0.65;
const MAX_VY = 7;
const PLAYER_X = 70;
const PLAYER_W = 20;
const PLAYER_H = 32;
const FLOOR_Y = H - 30;
const CEIL_Y = 30;

// --- Obstacle types ---
const OBS_ZAPPER = 'zapper';
const OBS_MISSILE = 'missile';
const OBS_LASER = 'laser';

// --- State ---
let player, obstacles, coins, particles, distance, scrollSpeed;
let thrustOn = false;
let frameCount, lastObstacleFrame, lastCoinFrame;
let bgOffset = 0;
let score = 0;
let best = 0;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Helpers ---
function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// --- Obstacle spawning ---
function spawnObstacle() {
  const difficulty = Math.min(frameCount / 3600, 1);
  const roll = Math.random();

  if (roll < 0.4) {
    // Zapper: vertical rotating bar
    const y1 = CEIL_Y + 30 + Math.random() * (FLOOR_Y - CEIL_Y - 120);
    const len = 60 + Math.random() * 60;
    obstacles.push({
      type: OBS_ZAPPER,
      x: W + 20,
      y: y1,
      len: len,
      angle: Math.random() * Math.PI,
      rotSpeed: 0.03 + Math.random() * 0.02,
      w: 12,
      h: len
    });
  } else if (roll < 0.7) {
    // Missile: warned then flies from right
    const y = CEIL_Y + 30 + Math.random() * (FLOOR_Y - CEIL_Y - 60);
    obstacles.push({
      type: OBS_MISSILE,
      x: W + 40,
      y: y,
      vx: -(scrollSpeed + 2 + difficulty * 2),
      w: 30,
      h: 12,
      warned: false,
      warnTimer: 60,
      active: false
    });
  } else {
    // Laser: horizontal beam with warning
    const y = CEIL_Y + 40 + Math.random() * (FLOOR_Y - CEIL_Y - 80);
    obstacles.push({
      type: OBS_LASER,
      x: 0,
      y: y,
      w: W,
      h: 8,
      warnTimer: 90,
      fireTimer: 30,
      active: false,
      emitterX: W - 20
    });
  }
}

function updateObstacle(obs) {
  if (obs.type === OBS_ZAPPER) {
    obs.x -= scrollSpeed;
    obs.angle += obs.rotSpeed;
  } else if (obs.type === OBS_MISSILE) {
    if (obs.warnTimer > 0) {
      obs.warnTimer--;
      if (obs.warnTimer <= 0) {
        obs.active = true;
        obs.x = W + 10;
      }
    } else {
      obs.x += obs.vx;
    }
  } else if (obs.type === OBS_LASER) {
    if (obs.warnTimer > 0) {
      obs.warnTimer--;
    } else if (obs.fireTimer > 0) {
      obs.active = true;
      obs.fireTimer--;
    } else {
      obs.active = false;
    }
  }
}

// --- Collision detection ---
function checkCollision(p, obs) {
  const px = p.x - p.w / 2;
  const py = p.y - p.h / 2;
  const pw = p.w;
  const ph = p.h;

  if (obs.type === OBS_ZAPPER) {
    const cx = obs.x;
    const cy = obs.y + obs.len / 2;
    const halfLen = obs.len / 2;
    const barW = 6;

    const cos = Math.cos(obs.angle);
    const sin = Math.sin(obs.angle);
    const x1 = cx + cos * halfLen;
    const y1 = cy + sin * halfLen;
    const x2 = cx - cos * halfLen;
    const y2 = cy - sin * halfLen;

    const dist = pointToSegmentDist(p.x, p.y, x1, y1, x2, y2);
    return dist < (pw / 2 + barW);
  } else if (obs.type === OBS_MISSILE) {
    return rectOverlap(px, py, pw, ph, obs.x - obs.w / 2, obs.y - obs.h / 2, obs.w, obs.h);
  } else if (obs.type === OBS_LASER) {
    return rectOverlap(px, py, pw, ph, obs.x, obs.y - obs.h / 2, obs.w, obs.h);
  }
  return false;
}

// --- Coin spawning ---
function spawnCoinGroup() {
  const count = 3 + Math.floor(Math.random() * 5);
  const baseY = CEIL_Y + 40 + Math.random() * (FLOOR_Y - CEIL_Y - 80);
  const pattern = Math.random();

  for (let i = 0; i < count; i++) {
    let cx, cy;
    if (pattern < 0.33) {
      cx = W + 20 + i * 25;
      cy = baseY;
    } else if (pattern < 0.66) {
      cx = W + 20 + i * 25;
      cy = baseY + i * 15;
    } else {
      cx = W + 20 + i * 25;
      cy = baseY + Math.sin(i * 0.8) * 40;
    }
    coins.push({ x: cx, y: cy, collected: false });
  }
}

// --- Particles ---
function spawnThrustParticle() {
  particles.push({
    x: player.x - player.w / 2 - 3 + Math.random() * 6,
    y: player.y + player.h / 2 + 2,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 2 + Math.random() * 3,
    life: 1,
    decay: 0.04 + Math.random() * 0.03,
    color: Math.random() < 0.5 ? '#f80' : '#ff0',
    size: 3 + Math.random() * 3
  });
}

function spawnCoinParticles(cx, cy) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.05,
      color: '#fd0',
      size: 2 + Math.random() * 2
    });
  }
}

function spawnDeathParticles() {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02,
      color: Math.random() < 0.5 ? '#4ce' : '#f44',
      size: 3 + Math.random() * 4
    });
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    player = { x: PLAYER_X, y: H / 2, vy: 0, w: PLAYER_W, h: PLAYER_H };
    obstacles = [];
    coins = [];
    particles = [];
    distance = 0;
    scrollSpeed = 3;
    frameCount = 0;
    lastObstacleFrame = 0;
    lastCoinFrame = 0;
    thrustOn = false;
    bgOffset = 0;
    score = 0;
    scoreEl.textContent = '0';
    game.showOverlay('JETPACK JOYRIDE', 'Hold SPACE or CLICK to fly \u2014 Release to fall');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // --- Mouse/touch controls ---
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (game.state === 'waiting') {
      game.setState('playing');
      thrustOn = true;
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing') {
      thrustOn = true;
    }
  });

  canvas.addEventListener('mouseup', () => {
    thrustOn = false;
  });

  canvas.addEventListener('mouseleave', () => {
    if (game.state === 'playing') {
      thrustOn = false;
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.state === 'waiting') {
      game.setState('playing');
      thrustOn = true;
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state === 'playing') {
      thrustOn = true;
    }
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    thrustOn = false;
  });

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
        thrustOn = true;
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    frameCount++;
    distance += scrollSpeed;

    // Difficulty scaling: speed increases over time
    scrollSpeed = 3 + Math.min(frameCount / 3000, 3);

    // Keyboard thrust control
    if (input.isDown(' ') || input.isDown('ArrowUp')) {
      thrustOn = true;
    } else if (!input.isDown(' ') && !input.isDown('ArrowUp')) {
      // Only clear thrustOn from keyboard if no mouse/touch is active
      // We check by looking at whether the mouse button is still down
      // The mouse events set thrustOn directly, so we only clear if no key is held
      // Actually, simplify: if keys aren't held and mouse isn't held, thrustOn stays
      // from mouse events. The mouseup/touchend handlers clear it.
      // We just need to not override mouse-driven thrustOn here.
      // So only set thrustOn = false if we were driven by keyboard.
    }

    // Player physics
    if (thrustOn) {
      player.vy += THRUST;
    } else {
      player.vy += GRAVITY;
    }
    player.vy = Math.max(-MAX_VY, Math.min(MAX_VY, player.vy));
    player.y += player.vy;

    // Clamp to floor/ceiling
    if (player.y - player.h / 2 < CEIL_Y) {
      player.y = CEIL_Y + player.h / 2;
      player.vy = 0;
    }
    if (player.y + player.h / 2 > FLOOR_Y) {
      player.y = FLOOR_Y - player.h / 2;
      player.vy = 0;
    }

    // Thrust particles
    if (thrustOn && frameCount % 2 === 0) {
      spawnThrustParticle();
    }

    // Spawn obstacles
    const obstacleCooldown = Math.max(60, 150 - frameCount / 30);
    if (frameCount - lastObstacleFrame > obstacleCooldown) {
      spawnObstacle();
      lastObstacleFrame = frameCount;
    }

    // Spawn coins
    if (frameCount - lastCoinFrame > 40) {
      if (Math.random() < 0.4) {
        spawnCoinGroup();
      }
      lastCoinFrame = frameCount;
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      updateObstacle(obs);

      // Remove off-screen or expired obstacles
      let shouldRemove = false;
      if (obs.type === OBS_ZAPPER) {
        shouldRemove = obs.x < -obs.len;
      } else if (obs.type === OBS_MISSILE) {
        shouldRemove = obs.active && obs.x < -50;
      } else if (obs.type === OBS_LASER) {
        shouldRemove = obs.warnTimer <= 0 && obs.fireTimer <= 0 && !obs.active;
      }
      if (shouldRemove) {
        obstacles.splice(i, 1);
        continue;
      }

      // Collision
      if (obs.active !== false && checkCollision(player, obs)) {
        spawnDeathParticles();
        if (score > best) { best = score; bestEl.textContent = best; }
        game.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
      coins[i].x -= scrollSpeed;
      if (coins[i].x < -20) {
        coins.splice(i, 1);
        continue;
      }
      // Collect
      const dx = player.x - coins[i].x;
      const dy = player.y - coins[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        score += 5;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        spawnCoinParticles(coins[i].x, coins[i].y);
        coins.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life -= particles[i].decay;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Score from distance
    const newDistScore = Math.floor(distance / 50);
    if (newDistScore > Math.floor((distance - scrollSpeed) / 50)) {
      score++;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }

    // Update gameData for ML
    window.gameData = {
      playerY: player.y,
      playerVY: player.vy,
      thrustOn: thrustOn,
      obstacles: obstacles.map(o => ({ type: o.type, x: o.x, y: o.y })),
      coins: coins.map(c => ({ x: c.x, y: c.y })),
      speed: scrollSpeed,
      distance: distance
    };
  };

  game.onDraw = (renderer, text) => {
    // Scrolling background grid lines
    if (game.state === 'playing') {
      bgOffset = (bgOffset + scrollSpeed * 0.3) % 40;
    }
    for (let x = -bgOffset; x < W; x += 40) {
      renderer.drawLine(x, CEIL_Y, x, FLOOR_Y, '#16213e', 1);
    }
    for (let y = CEIL_Y; y <= FLOOR_Y; y += 40) {
      renderer.drawLine(0, y, W, y, '#16213e', 1);
    }

    // Floor and ceiling
    renderer.fillRect(0, 0, W, CEIL_Y, '#0f3460');
    renderer.fillRect(0, FLOOR_Y, W, H - FLOOR_Y, '#0f3460');

    // Floor/ceiling edge glow
    renderer.setGlow('#4ce', 0.6);
    renderer.fillRect(0, CEIL_Y - 1, W, 2, '#4ce');
    renderer.fillRect(0, FLOOR_Y - 1, W, 2, '#4ce');
    renderer.setGlow(null);

    // Distance indicator on floor
    const distMarkers = Math.floor(distance / 200);
    for (let i = 0; i < 8; i++) {
      const mx = W - ((distance % 200) / 200 * 200) + i * 200 - 400;
      if (mx > 0 && mx < W) {
        const mDist = (distMarkers - 3 + i) * 200;
        if (mDist >= 0) {
          text.drawText(`${mDist}m`, mx, FLOOR_Y + 4, 10, '#1a3a6e', 'left');
        }
      }
    }

    // Draw obstacles
    for (const obs of obstacles) {
      drawObstacle(renderer, text, obs);
    }

    // Draw coins
    for (const c of coins) {
      drawCoin(renderer, c);
    }

    // Draw player
    drawPlayer(renderer);

    // Draw particles
    for (const p of particles) {
      renderer.setGlow(p.color, 0.4 * p.life);
      // Expand short hex (#rgb) to long hex (#rrggbb) then append alpha
      const alphaHex = Math.round(Math.min(1, p.life) * 255).toString(16).padStart(2, '0');
      let hex6;
      if (p.color.length === 4) {
        // #rgb -> #rrggbb
        hex6 = '#' + p.color[1] + p.color[1] + p.color[2] + p.color[2] + p.color[3] + p.color[3];
      } else {
        hex6 = p.color;
      }
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, hex6 + alphaHex);
    }
    renderer.setGlow(null);

    // Score on canvas (distance counter)
    renderer.setGlow('#4ce', 0.4);
    text.drawText(`${Math.floor(distance)}m`, W - 80, CEIL_Y + 6, 14, '#4ce', 'left');
    renderer.setGlow(null);
  };

  function drawPlayer(renderer) {
    const px = player.x;
    const py = player.y;

    // Body rectangle with glow
    renderer.setGlow('#4ce', 0.6);
    renderer.fillRect(px - player.w / 2, py - player.h / 2, player.w, player.h, '#4ce');
    renderer.setGlow(null);

    // Helmet visor
    renderer.fillRect(px - player.w / 2 + 3, py - player.h / 2 + 3, player.w - 6, 10, '#1a1a2e');
    renderer.fillRect(px - player.w / 2 + 4, py - player.h / 2 + 4, player.w - 8, 8, '#8ef');

    // Jetpack on back
    renderer.fillRect(px - player.w / 2 - 6, py - 6, 6, 18, '#38a');

    // Thrust flame
    if (thrustOn) {
      const flameLen = 10 + Math.random() * 15;
      const nozzleX = px - player.w / 2 - 6;

      // Outer flame (orange)
      renderer.setGlow('#f80', 0.7);
      renderer.fillPoly([
        { x: nozzleX, y: py - 2 },
        { x: nozzleX - flameLen, y: py + 4 },
        { x: nozzleX, y: py + 10 }
      ], '#f80');

      // Inner flame (yellow)
      renderer.setGlow('#ff0', 0.7);
      renderer.fillPoly([
        { x: nozzleX, y: py },
        { x: nozzleX - flameLen * 0.5, y: py + 4 },
        { x: nozzleX, y: py + 8 }
      ], '#ff0');
      renderer.setGlow(null);
    }

    // Legs
    renderer.fillRect(px - 5, py + player.h / 2, 4, 6, '#4ce');
    renderer.fillRect(px + 1, py + player.h / 2, 4, 6, '#4ce');
  }

  function drawObstacle(renderer, text, obs) {
    if (obs.type === OBS_ZAPPER) {
      const cx = obs.x;
      const cy = obs.y + obs.len / 2;
      const halfLen = obs.len / 2;
      const cos = Math.cos(obs.angle);
      const sin = Math.sin(obs.angle);
      const x1 = cx + cos * halfLen;
      const y1 = cy + sin * halfLen;
      const x2 = cx - cos * halfLen;
      const y2 = cy - sin * halfLen;

      // Zapper bar
      renderer.setGlow('#f44', 0.7);
      renderer.drawLine(x1, y1, x2, y2, '#f44', 4);

      // Endpoints (yellow orbs)
      renderer.setGlow('#ff0', 0.6);
      renderer.fillCircle(x1, y1, 6, '#ff0');
      renderer.fillCircle(x2, y2, 6, '#ff0');
      renderer.setGlow(null);

      // Electricity effect (every other pair of frames)
      if (frameCount % 4 < 2) {
        const segments = 6;
        const points = [];
        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          const lx = x1 + (x2 - x1) * t + (s > 0 && s < segments ? (Math.random() - 0.5) * 12 : 0);
          const ly = y1 + (y2 - y1) * t + (s > 0 && s < segments ? (Math.random() - 0.5) * 12 : 0);
          points.push({ x: lx, y: ly });
        }
        renderer.strokePoly(points, '#ff8', 1, false);
      }

    } else if (obs.type === OBS_MISSILE) {
      if (obs.warnTimer > 0) {
        // Warning indicator on right side
        const blink = Math.floor(obs.warnTimer / 5) % 2 === 0;
        if (blink) {
          renderer.setGlow('#f44', 0.6);
          text.drawText('!', W - 15, obs.y - 8, 16, '#f44', 'center');
          // Warning line (dashed)
          renderer.dashedLine(W - 20, obs.y, 0, obs.y, '#ff44444d', 1, 4, 4);
          renderer.setGlow(null);
        }
      } else {
        // Missile body (pointing left - direction of travel)
        renderer.setGlow('#f44', 0.5);
        renderer.fillPoly([
          { x: obs.x - obs.w / 2, y: obs.y },
          { x: obs.x + obs.w / 2, y: obs.y - obs.h / 2 },
          { x: obs.x + obs.w / 2, y: obs.y + obs.h / 2 }
        ], '#f44');

        // Exhaust (trailing right)
        const exLen = 5 + Math.random() * 10;
        renderer.setGlow('#f80', 0.5);
        renderer.fillPoly([
          { x: obs.x + obs.w / 2, y: obs.y - 3 },
          { x: obs.x + obs.w / 2 + exLen, y: obs.y },
          { x: obs.x + obs.w / 2, y: obs.y + 3 }
        ], '#f80');
        renderer.setGlow(null);
      }

    } else if (obs.type === OBS_LASER) {
      if (obs.warnTimer > 0) {
        // Warning: thin dashed line and emitter glow
        const blink = Math.floor(obs.warnTimer / 8) % 2 === 0;
        if (blink) {
          renderer.dashedLine(0, obs.y, W, obs.y, '#ff444466', 1, 6, 6);
        }
        // Emitter nodes
        const glowIntensity = obs.warnTimer < 30 ? 0.7 : 0.4;
        renderer.setGlow('#f44', glowIntensity);
        renderer.fillCircle(10, obs.y, 5, '#f44');
        renderer.fillCircle(W - 10, obs.y, 5, '#f44');
        renderer.setGlow(null);
      } else if (obs.active) {
        // Active laser beam
        renderer.setGlow('#f44', 0.9);
        renderer.fillRect(0, obs.y - obs.h / 2, W, obs.h, '#f44');
        // Inner bright beam
        renderer.fillRect(0, obs.y - obs.h / 4, W, obs.h / 2, '#faa');
        // Emitter nodes
        renderer.fillCircle(10, obs.y, 6, '#f44');
        renderer.fillCircle(W - 10, obs.y, 6, '#f44');
        renderer.setGlow(null);
      }
    }
  }

  function drawCoin(renderer, c) {
    // Gold coin with glow - approximate spin with varying circle size
    const scaleX = 0.5 + 0.5 * Math.abs(Math.cos(frameCount * 0.06 + c.x * 0.01));
    const r = 6 * Math.max(scaleX, 0.3);

    renderer.setGlow('#fd0', 0.5);
    renderer.fillCircle(c.x, c.y, r, '#fd0');

    // Inner highlight
    if (scaleX > 0.3) {
      renderer.fillCircle(c.x, c.y, r * 0.5, '#ff8');
    }
    renderer.setGlow(null);
  }

  game.start();
  return game;
}
