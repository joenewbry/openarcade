import { Game } from '../engine/core.js';

const W = 720;
const H = 420;

const TANK_RADIUS = 17;
const TANK_SPEED = 2.7;
const FIRE_COOLDOWN_MS = 180;

const BULLET_SPEED = 7.8;
const BULLET_RADIUS = 3;
const BULLET_LIFE_MS = 1200;

const TARGET_RADIUS = 13;
const TARGET_COUNT = 8;

const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
};

let player;
let bullets;
let targets;
let lastShotAt;
let score;
let bestScore;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function spawnTarget() {
  return {
    x: 60 + Math.random() * (W - 120),
    y: 60 + Math.random() * (H - 120),
    r: TARGET_RADIUS,
    pulse: Math.random() * Math.PI * 2,
  };
}

function initTargets() {
  targets = [];
  for (let i = 0; i < TARGET_COUNT; i++) {
    targets.push(spawnTarget());
  }
}

function resetGame() {
  player = {
    x: W * 0.5,
    y: H * 0.5,
    angle: -Math.PI / 2,
  };
  bullets = [];
  score = 0;
  scoreEl.textContent = String(score);
  initTargets();
  lastShotAt = -9999;
}

function bindTouchButton(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;

  const setState = (value) => {
    touchState[stateKey] = value;
    el.classList.toggle('active', value);
  };

  const onDown = (e) => {
    e.preventDefault();
    setState(true);
  };

  const onUp = (e) => {
    e.preventDefault();
    setState(false);
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', onUp);

  // Fallback for older mobile browsers
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchend', onUp, { passive: false });
  el.addEventListener('touchcancel', onUp, { passive: false });
}

function setupTouchControls() {
  bindTouchButton('btn-up', 'up');
  bindTouchButton('btn-down', 'down');
  bindTouchButton('btn-left', 'left');
  bindTouchButton('btn-right', 'right');
  bindTouchButton('btn-fire', 'fire');

  window.addEventListener('blur', () => {
    for (const key of Object.keys(touchState)) {
      touchState[key] = false;
    }
    document.querySelectorAll('.touch-btn.active').forEach((el) => {
      el.classList.remove('active');
    });
  });
}

function readMoveInput(input) {
  let mx = 0;
  let my = 0;

  if (input.isDown('w') || input.isDown('W') || input.isDown('ArrowUp') || touchState.up) my -= 1;
  if (input.isDown('s') || input.isDown('S') || input.isDown('ArrowDown') || touchState.down) my += 1;
  if (input.isDown('a') || input.isDown('A') || input.isDown('ArrowLeft') || touchState.left) mx -= 1;
  if (input.isDown('d') || input.isDown('D') || input.isDown('ArrowRight') || touchState.right) mx += 1;

  return { mx, my };
}

function shouldFire(input) {
  return input.isDown(' ') || touchState.fire;
}

function tryShoot(now) {
  if (now - lastShotAt < FIRE_COOLDOWN_MS) return;

  const tipX = player.x + Math.cos(player.angle) * (TANK_RADIUS + 10);
  const tipY = player.y + Math.sin(player.angle) * (TANK_RADIUS + 10);

  bullets.push({
    x: tipX,
    y: tipY,
    vx: Math.cos(player.angle) * BULLET_SPEED,
    vy: Math.sin(player.angle) * BULLET_SPEED,
    bornAt: now,
  });

  lastShotAt = now;
}

function drawTank(renderer) {
  const c = Math.cos(player.angle);
  const s = Math.sin(player.angle);

  // Tank body as rotated rectangle
  const hw = 18;
  const hh = 12;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({
    x: player.x + p.x * c - p.y * s,
    y: player.y + p.x * s + p.y * c,
  }));

  renderer.fillPoly(corners, '#5ab2ff');

  // Treads
  const treadOffset = 14;
  const treadA = {
    x: player.x + (-14) * c - (-treadOffset) * s,
    y: player.y + (-14) * s + (-treadOffset) * c,
  };
  const treadB = {
    x: player.x + (14) * c - (-treadOffset) * s,
    y: player.y + (14) * s + (-treadOffset) * c,
  };
  const treadC = {
    x: player.x + (14) * c - (treadOffset) * s,
    y: player.y + (14) * s + (treadOffset) * c,
  };
  const treadD = {
    x: player.x + (-14) * c - (treadOffset) * s,
    y: player.y + (-14) * s + (treadOffset) * c,
  };
  renderer.drawLine(treadA.x, treadA.y, treadB.x, treadB.y, '#21496a', 4);
  renderer.drawLine(treadD.x, treadD.y, treadC.x, treadC.y, '#21496a', 4);

  // Turret and barrel
  renderer.fillCircle(player.x, player.y, 9, '#8fd2ff');
  renderer.drawLine(
    player.x,
    player.y,
    player.x + c * (TANK_RADIUS + 12),
    player.y + s * (TANK_RADIUS + 12),
    '#dff3ff',
    5,
  );
}

function drawTargets(renderer, now) {
  for (const target of targets) {
    const glowPulse = 0.2 + 0.15 * Math.sin(now * 0.004 + target.pulse);
    renderer.setGlow('#ff5b6e', glowPulse);
    renderer.fillCircle(target.x, target.y, target.r, '#ff5b6e');
    renderer.setGlow(null);
    renderer.fillRect(target.x - 2, target.y - 8, 4, 16, '#ffd2d8');
    renderer.fillRect(target.x - 8, target.y - 2, 16, 4, '#ffd2d8');
  }
}

export function createGame() {
  const game = new Game('game');

  setupTouchControls();

  game.onInit = () => {
    bestScore = Number(bestEl.textContent) || 0;
    resetGame();
    game.showOverlay(
      'TANK ROYALE',
      'WASD / Arrows: Move\nSpace: Shoot\nTouch: D-pad + FIRE\n\nPress any movement control to start',
    );
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    const input = game.input;

    if (game.state === 'waiting') {
      const move = readMoveInput(input);
      if (move.mx !== 0 || move.my !== 0 || input.wasPressed(' ') || touchState.fire) {
        game.setState('playing');
      }
      return;
    }

    if (game.state !== 'playing') return;

    const move = readMoveInput(input);

    if (move.mx !== 0 || move.my !== 0) {
      const len = Math.hypot(move.mx, move.my);
      const nx = move.mx / len;
      const ny = move.my / len;
      const scale = dt / (1000 / 60);

      player.x += nx * TANK_SPEED * scale;
      player.y += ny * TANK_SPEED * scale;
      player.angle = Math.atan2(ny, nx);
    }

    player.x = clamp(player.x, TANK_RADIUS + 2, W - TANK_RADIUS - 2);
    player.y = clamp(player.y, TANK_RADIUS + 2, H - TANK_RADIUS - 2);

    const now = performance.now();
    if (shouldFire(input)) {
      tryShoot(now);
    }

    const step = dt / (1000 / 60);
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * step;
      b.y += b.vy * step;

      const expired = now - b.bornAt > BULLET_LIFE_MS;
      const outOfBounds = b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10;
      if (expired || outOfBounds) {
        bullets.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let t = targets.length - 1; t >= 0; t--) {
        const target = targets[t];
        const d = Math.hypot(b.x - target.x, b.y - target.y);
        if (d <= target.r + BULLET_RADIUS) {
          bullets.splice(i, 1);
          targets.splice(t, 1);
          targets.push(spawnTarget());
          score += 10;
          scoreEl.textContent = String(score);
          if (score > bestScore) {
            bestScore = score;
            bestEl.textContent = String(bestScore);
          }
          hit = true;
          break;
        }
      }

      if (hit) continue;
    }
  };

  game.onDraw = (renderer, text) => {
    const now = performance.now();

    renderer.fillRect(0, 0, W, H, '#0d1224');

    // Arena border
    renderer.drawLine(2, 2, W - 2, 2, '#2a4f82', 2);
    renderer.drawLine(W - 2, 2, W - 2, H - 2, '#2a4f82', 2);
    renderer.drawLine(W - 2, H - 2, 2, H - 2, '#2a4f82', 2);
    renderer.drawLine(2, H - 2, 2, 2, '#2a4f82', 2);

    // Grid lines
    for (let x = 40; x < W; x += 40) {
      renderer.drawLine(x, 0, x, H, '#ffffff08', 1);
    }
    for (let y = 40; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, '#ffffff08', 1);
    }

    drawTargets(renderer, now);
    drawTank(renderer);

    for (const b of bullets) {
      renderer.setGlow('#ffe67d', 0.45);
      renderer.fillCircle(b.x, b.y, BULLET_RADIUS, '#fff1ac');
      renderer.setGlow(null);
    }

    text.drawText('MOVE: WASD / ARROWS / TOUCH D-PAD', 10, 16, 10, '#7fb5ff', 'left');
    text.drawText('SHOOT: SPACE / TOUCH FIRE', 10, 30, 10, '#7fb5ff', 'left');
  };

  game.start();
  return game;
}
