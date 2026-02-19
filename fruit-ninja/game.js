// fruit-ninja/game.js — Fruit Ninja game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Fruit definitions
const FRUIT_TYPES = [
  { name: 'watermelon', radius: 28, color: '#4f4', innerColor: '#f44', points: 3, sliceColor1: '#4f4', sliceColor2: '#f44' },
  { name: 'orange',     radius: 22, color: '#f80', innerColor: '#fa4', points: 2, sliceColor1: '#f80', sliceColor2: '#fa4' },
  { name: 'apple',      radius: 20, color: '#f44', innerColor: '#ffa', points: 1, sliceColor1: '#f44', sliceColor2: '#ffa' },
  { name: 'lemon',      radius: 18, color: '#ff0', innerColor: '#ffa', points: 1, sliceColor1: '#ff0', sliceColor2: '#ffa' },
  { name: 'grape',      radius: 16, color: '#a4f', innerColor: '#c8f', points: 2, sliceColor1: '#a4f', sliceColor2: '#c8f' },
  { name: 'banana',     radius: 20, color: '#fe0', innerColor: '#ffc', points: 1, sliceColor1: '#fe0', sliceColor2: '#ffc' },
  { name: 'kiwi',       radius: 17, color: '#8b4513', innerColor: '#7d2', points: 2, sliceColor1: '#8b4513', sliceColor2: '#7d2' },
  { name: 'blueberry',  radius: 14, color: '#44f', innerColor: '#88f', points: 3, sliceColor1: '#44f', sliceColor2: '#88f' },
];

const GRAVITY = 0.18;
const SPAWN_INTERVAL_START = 70;
const SPAWN_INTERVAL_MIN = 25;
const ARROW_SPEED = 12;

// ── State ──
let score, best, lives;
let fruits, splatters, sliceTrail;
let comboTimer, comboCount, comboTexts;
let frameCount, spawnTimer, difficulty;

// Mouse / slash tracking
let mouseDown, mouseX, mouseY, prevMouseX, prevMouseY;
let slashPoints;

// Arrow key slash support
let arrowSliceX, arrowSliceY;
let showArrowCursor;

// Deferred spawns (replaces setTimeout from original)
let deferredSpawns; // array of { delay, elapsed }

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helpers ──

function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

function checkSlice(fruit) {
  if (fruit.sliced || slashPoints.length < 2) return false;
  for (let i = 1; i < slashPoints.length; i++) {
    const p1 = slashPoints[i - 1];
    const p2 = slashPoints[i];
    if (lineCircleIntersect(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, fruit.radius + 5)) {
      return true;
    }
  }
  return false;
}

function spawnFruit(game) {
  const side = Math.random();
  let x, vx;

  if (side < 0.3) {
    x = 40 + Math.random() * 100;
    vx = 1.5 + Math.random() * 2.5;
  } else if (side < 0.7) {
    x = 150 + Math.random() * 200;
    vx = (Math.random() - 0.5) * 3;
  } else {
    x = W - 140 + Math.random() * 100;
    vx = -(1.5 + Math.random() * 2.5);
  }

  const vy = -(6.5 + Math.random() * 3 + difficulty * 0.3);
  const bombChance = Math.min(0.12 + difficulty * 0.015, 0.3);
  const isBomb = Math.random() < bombChance;
  const type = isBomb ? null : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];

  fruits.push({
    x: x,
    y: H + 30,
    vx: vx,
    vy: vy,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.12,
    type: type,
    isBomb: isBomb,
    radius: isBomb ? 22 : type.radius,
    sliced: false,
    sliceHalves: null,
    missed: false,
  });
}

function spawnWave(game) {
  const count = Math.min(1 + Math.floor(Math.random() * (2 + difficulty * 0.3)), 5);
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      spawnFruit(game);
    } else {
      // Deferred spawn: delay in frames (original was 60-140ms, ~4-8 frames at 60fps)
      const delayFrames = Math.floor((60 + Math.random() * 80) / 16.667);
      deferredSpawns.push({ delay: delayFrames * (i), elapsed: 0 });
    }
  }
}

function sliceFruit(fruit, game) {
  fruit.sliced = true;

  if (fruit.isBomb) {
    // Bomb explosion effect
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      splatters.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#f44' : '#f80',
        life: 1.0,
        decay: 0.015 + Math.random() * 0.01,
      });
    }
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key or click to restart`);
    game.setState('over');
    return;
  }

  // Calculate slice angle from latest slash direction
  let sliceAngle = 0;
  if (slashPoints.length >= 2) {
    const p1 = slashPoints[slashPoints.length - 2];
    const p2 = slashPoints[slashPoints.length - 1];
    sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  // Create two halves
  const perpAngle = sliceAngle + Math.PI / 2;
  const sepSpeed = 1.5 + Math.random();
  fruit.sliceHalves = [
    {
      x: fruit.x, y: fruit.y,
      vx: fruit.vx + Math.cos(perpAngle) * sepSpeed,
      vy: fruit.vy + Math.sin(perpAngle) * sepSpeed,
      rotation: fruit.rotation,
      rotSpeed: fruit.rotSpeed + 0.05,
      side: 1, sliceAngle: sliceAngle,
    },
    {
      x: fruit.x, y: fruit.y,
      vx: fruit.vx - Math.cos(perpAngle) * sepSpeed,
      vy: fruit.vy - Math.sin(perpAngle) * sepSpeed,
      rotation: fruit.rotation,
      rotSpeed: fruit.rotSpeed - 0.05,
      side: -1, sliceAngle: sliceAngle,
    }
  ];

  // Juice splatter particles
  const type = fruit.type;
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    splatters.push({
      x: fruit.x,
      y: fruit.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      radius: 2 + Math.random() * 4,
      color: Math.random() > 0.5 ? type.sliceColor1 : type.sliceColor2,
      life: 1.0,
      decay: 0.012 + Math.random() * 0.01,
    });
  }

  // Score
  const points = type.points;
  score += points;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  // Combo tracking
  comboCount++;
  comboTimer = 15;
}

// ── Trail tracking (frame-based instead of Date.now) ──
// Each trail/slash point gets a frame stamp; we age them by frame count
let trailFrame; // current frame for trail aging

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // ── Mouse tracking ──
  canvas.addEventListener('mousedown', (e) => {
    if (game.state === 'waiting') {
      game.setState('playing');
      game.hideOverlay();
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseDown = true;
    slashPoints = [{ x: mouseX, y: mouseY, frame: trailFrame }];
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;

    if (mouseDown && game.state === 'playing') {
      slashPoints.push({ x: mouseX, y: mouseY, frame: trailFrame });
      sliceTrail.push({ x: mouseX, y: mouseY, frame: trailFrame });

      if (slashPoints.length > 20) {
        slashPoints = slashPoints.slice(-15);
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    slashPoints = [];
  });

  canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
    slashPoints = [];
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Init ──
  game.onInit = () => {
    score = 0;
    best = best || 0;
    lives = 3;
    fruits = [];
    splatters = [];
    sliceTrail = [];
    comboTimer = 0;
    comboCount = 0;
    comboTexts = [];
    frameCount = 0;
    spawnTimer = 0;
    difficulty = 0;
    mouseDown = false;
    mouseX = 0;
    mouseY = 0;
    prevMouseX = 0;
    prevMouseY = 0;
    slashPoints = [];
    arrowSliceX = W / 2;
    arrowSliceY = H / 2;
    showArrowCursor = false;
    deferredSpawns = [];
    trailFrame = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = best;
    game.showOverlay('FRUIT NINJA', 'Press SPACE or click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;
    trailFrame = frameCount;
    difficulty = Math.min(frameCount / 1800, 1);

    // Arrow key cursor movement
    if (input.isDown('ArrowLeft')) arrowSliceX = Math.max(0, arrowSliceX - ARROW_SPEED);
    if (input.isDown('ArrowRight')) arrowSliceX = Math.min(W, arrowSliceX + ARROW_SPEED);
    if (input.isDown('ArrowUp')) arrowSliceY = Math.max(0, arrowSliceY - ARROW_SPEED);
    if (input.isDown('ArrowDown')) arrowSliceY = Math.min(H, arrowSliceY + ARROW_SPEED);

    // Track if arrow keys active for crosshair drawing
    showArrowCursor = input.isDown('ArrowLeft') || input.isDown('ArrowRight') ||
                      input.isDown('ArrowUp') || input.isDown('ArrowDown');

    // Space bar creates wide horizontal slash at arrow cursor position
    if (input.wasPressed(' ')) {
      slashPoints = [
        { x: arrowSliceX - 60, y: arrowSliceY, frame: trailFrame },
        { x: arrowSliceX - 30, y: arrowSliceY, frame: trailFrame },
        { x: arrowSliceX, y: arrowSliceY, frame: trailFrame },
        { x: arrowSliceX + 30, y: arrowSliceY, frame: trailFrame },
        { x: arrowSliceX + 60, y: arrowSliceY, frame: trailFrame },
      ];
      sliceTrail.push(
        { x: arrowSliceX - 60, y: arrowSliceY, frame: trailFrame },
        { x: arrowSliceX + 60, y: arrowSliceY, frame: trailFrame },
      );

      for (const f of fruits) {
        if (!f.sliced && checkSlice(f)) {
          sliceFruit(f, game);
          if (game.state !== 'playing') return;
        }
      }
      slashPoints = [];
    }

    // Spawn timer
    spawnTimer++;
    const spawnInterval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - difficulty * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN));
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnWave(game);
    }

    // Process deferred spawns
    for (let i = deferredSpawns.length - 1; i >= 0; i--) {
      deferredSpawns[i].elapsed++;
      if (deferredSpawns[i].elapsed >= deferredSpawns[i].delay) {
        if (game.state === 'playing') spawnFruit(game);
        deferredSpawns.splice(i, 1);
      }
    }

    // Update fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];

      if (f.sliced && f.sliceHalves) {
        let allOffScreen = true;
        for (const half of f.sliceHalves) {
          half.x += half.vx;
          half.vy += GRAVITY;
          half.y += half.vy;
          half.rotation += half.rotSpeed;
          if (half.y < H + 60) allOffScreen = false;
        }
        if (allOffScreen) {
          fruits.splice(i, 1);
        }
        continue;
      }

      if (!f.sliced) {
        f.x += f.vx;
        f.vy += GRAVITY;
        f.y += f.vy;
        f.rotation += f.rotSpeed;

        // Check if mouse slash hits this fruit
        if (mouseDown && checkSlice(f)) {
          sliceFruit(f, game);
          if (game.state !== 'playing') return;
        }

        // Check if fruit fell off screen without being sliced
        if (f.y > H + 40 && f.vy > 0 && !f.sliced && !f.missed) {
          f.missed = true;
          if (!f.isBomb) {
            lives--;
            if (lives <= 0) {
              if (score > best) {
                best = score;
                bestEl.textContent = best;
              }
              game.showOverlay('GAME OVER', `Score: ${score} -- Press any key or click to restart`);
              game.setState('over');
              return;
            }
          }
          fruits.splice(i, 1);
        }
      }
    }

    // Update splatters
    for (let i = splatters.length - 1; i >= 0; i--) {
      const s = splatters[i];
      s.x += s.vx;
      s.vy += 0.08;
      s.y += s.vy;
      s.vx *= 0.98;
      s.life -= s.decay;
      if (s.life <= 0) {
        splatters.splice(i, 1);
      }
    }

    // Update slice trail (fade out old points) -- 9 frames ~ 150ms at 60fps
    sliceTrail = sliceTrail.filter(p => trailFrame - p.frame < 9);

    // Combo logic
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) {
        if (comboCount >= 3) {
          const bonus = comboCount * 2;
          score += bonus;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          comboTexts.push({
            text: `${comboCount}x COMBO! +${bonus}`,
            x: W / 2,
            y: H / 2 - 40,
            life: 1.0,
          });
        }
        comboCount = 0;
      }
    }

    // Update combo texts
    for (let i = comboTexts.length - 1; i >= 0; i--) {
      comboTexts[i].life -= 0.015;
      comboTexts[i].y -= 0.8;
      if (comboTexts[i].life <= 0) comboTexts.splice(i, 1);
    }

    // Update slash points (remove old ones) -- 5 frames ~ 80ms at 60fps
    if (slashPoints.length > 0) {
      slashPoints = slashPoints.filter(p => trailFrame - p.frame < 5);
    }

    // Update gameData for ML
    window.gameData = {
      score: score,
      lives: lives,
      fruitCount: fruits.filter(f => !f.sliced && !f.isBomb).length,
      bombCount: fruits.filter(f => !f.sliced && f.isBomb).length,
      mouseX: mouseX,
      mouseY: mouseY,
      mouseDown: mouseDown,
    };
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Background horizontal lines
    for (let y = 30; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, '#16213e', 1);
    }

    // Draw splatters (behind fruit)
    for (const s of splatters) {
      const alpha = Math.max(0, s.life);
      // Build color with alpha
      const col = hexWithAlpha(s.color, alpha);
      renderer.setGlow(s.color, 0.3 * alpha);
      renderer.fillCircle(s.x, s.y, s.radius * s.life, col);
    }
    renderer.setGlow(null);

    // Draw fruits
    for (const f of fruits) {
      if (f.sliced && f.sliceHalves) {
        drawSlicedFruit(f, renderer, text);
      } else if (!f.sliced) {
        drawFruit(f, renderer, text);
      }
    }

    // Draw slice trail
    if (sliceTrail.length >= 2) {
      for (let i = 1; i < sliceTrail.length; i++) {
        const p0 = sliceTrail[i - 1];
        const p1 = sliceTrail[i];
        const age0 = (trailFrame - p0.frame) / 9;
        const age1 = (trailFrame - p1.frame) / 9;
        const alpha = Math.max(0, 1 - (age0 + age1) / 2);
        const width = Math.max(1, 6 * (1 - (age0 + age1) / 2));

        const col = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(2)})`;
        renderer.setGlow('#e6a', 0.5 * alpha);
        renderer.drawLine(p0.x, p0.y, p1.x, p1.y, col, width);
      }
      renderer.setGlow(null);
    }

    // Draw combo texts
    for (const ct of comboTexts) {
      const col = hexWithAlpha('#e6a', ct.life);
      renderer.setGlow('#e6a', 0.7 * ct.life);
      text.drawText(ct.text, ct.x, ct.y, 28, col, 'center');
    }
    renderer.setGlow(null);

    // Draw HUD
    drawHUD(renderer, text);

    // Draw arrow crosshair if keyboard control active
    if (showArrowCursor) {
      const cs = 15;
      renderer.setGlow('#e6a', 0.4);
      renderer.drawLine(arrowSliceX - cs, arrowSliceY, arrowSliceX + cs, arrowSliceY, '#e6a', 2);
      renderer.drawLine(arrowSliceX, arrowSliceY - cs, arrowSliceX, arrowSliceY + cs, '#e6a', 2);
      // Approximate circle with polygon
      const circPts = [];
      const circR = cs * 0.7;
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        circPts.push([arrowSliceX + Math.cos(ang) * circR, arrowSliceY + Math.sin(ang) * circR]);
      }
      renderer.strokePoly(circPts, '#e6a', 2, true);
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}

// ── Drawing helpers ──

function hexWithAlpha(hex, alpha) {
  // Convert short hex like '#f44' or long hex '#ff4444' to rgba
  let r, g, b;
  if (hex.startsWith('rgba')) return hex; // already rgba
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex; // Can't parse, return as-is
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
}

function drawFruit(f, renderer, text) {
  if (f.isBomb) {
    drawBomb(f, renderer, text);
  } else {
    drawNormalFruit(f, renderer, text);
  }
}

function drawBomb(f, renderer, text) {
  // Main body
  renderer.setGlow('#f44', 0.5);
  renderer.fillCircle(f.x, f.y, f.radius, '#222');
  renderer.setGlow(null);

  // Highlight
  renderer.fillCircle(f.x - 5, f.y - 5, f.radius * 0.4, '#444');

  // Fuse line (from top of bomb upward)
  const fuseX1 = f.x;
  const fuseY1 = f.y - f.radius;
  const fuseX2 = f.x + 4;
  const fuseY2 = f.y - f.radius - 18;
  renderer.drawLine(fuseX1, fuseY1, fuseX2, fuseY2, '#888', 2);

  // Fuse spark (flicker via frameCount)
  const sparkFlicker = Math.sin(frameCount * 0.3) * 0.3 + 0.7;
  const sparkColor = `rgba(255, ${Math.floor(150 * sparkFlicker)}, 0, ${sparkFlicker.toFixed(2)})`;
  renderer.setGlow('#f80', 0.6 * sparkFlicker);
  renderer.fillCircle(fuseX2, fuseY2, 4, sparkColor);
  renderer.setGlow(null);

  // Danger X
  renderer.setGlow('#f44', 0.3);
  text.drawText('X', f.x, f.y - 7, 16, '#f44', 'center');
  renderer.setGlow(null);
}

function drawNormalFruit(f, renderer, text) {
  const type = f.type;

  // Banana special shape: draw as ellipse approximated by wider circle
  if (type.name === 'banana') {
    // Draw outer banana shape (slightly larger)
    renderer.setGlow(type.color, 0.5);
    renderer.fillCircle(f.x, f.y, f.radius, type.color);
    renderer.setGlow(null);
  } else {
    // Outer with glow
    renderer.setGlow(type.color, 0.5);
    renderer.fillCircle(f.x, f.y, f.radius, type.color);
    renderer.setGlow(null);
  }

  // Inner / flesh highlight (slightly transparent effect via lighter color)
  const innerR = f.radius * 0.55;
  renderer.fillCircle(f.x - f.radius * 0.15, f.y - f.radius * 0.15, innerR, hexWithAlpha(type.innerColor, 0.4));

  // Bright spot
  renderer.fillCircle(f.x - f.radius * 0.3, f.y - f.radius * 0.3, f.radius * 0.25, 'rgba(255,255,255,0.3)');

  // Stem for apple-like fruits
  if (type.name === 'apple' || type.name === 'orange' || type.name === 'lemon') {
    renderer.drawLine(f.x, f.y - f.radius, f.x + 2, f.y - f.radius - 7, '#4a3', 2);
  }

  // Grape clusters
  if (type.name === 'grape') {
    for (let gi = 0; gi < 5; gi++) {
      const gAngle = (gi / 5) * Math.PI * 2;
      const gx = f.x + Math.cos(gAngle) * f.radius * 0.4;
      const gy = f.y + Math.sin(gAngle) * f.radius * 0.4;
      renderer.fillCircle(gx, gy, f.radius * 0.35, '#b6f');
    }
  }

  // Blueberry dot
  if (type.name === 'blueberry') {
    renderer.fillCircle(f.x, f.y - f.radius * 0.4, 2, '#66f');
  }

  // Kiwi texture dots
  if (type.name === 'kiwi') {
    for (let ki = 0; ki < 6; ki++) {
      const kAngle = (ki / 6) * Math.PI * 2;
      const kx = f.x + Math.cos(kAngle) * f.radius * 0.6;
      const ky = f.y + Math.sin(kAngle) * f.radius * 0.6;
      renderer.fillCircle(kx, ky, 1.5, '#5a2d0c');
    }
  }

  // Points indicator
  text.drawText(String(type.points), f.x, f.y - 5, 10, 'rgba(255,255,255,0.6)', 'center');
}

function drawSlicedFruit(f, renderer, text) {
  if (!f.sliceHalves || f.isBomb) return;
  const type = f.type;

  for (const half of f.sliceHalves) {
    // Outer fruit half (full circle -- approximate clipping by drawing semicircle polygon)
    const clipAngle = half.sliceAngle;
    const startAngle = half.side === 1 ? clipAngle : clipAngle + Math.PI;
    const r = f.radius;

    // Build semicircle polygon points
    const pts = [];
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (s / steps) * Math.PI;
      pts.push([half.x + Math.cos(a) * r, half.y + Math.sin(a) * r]);
    }

    // Outer half
    renderer.setGlow(type.color, 0.4);
    renderer.fillPoly(pts, type.color);
    renderer.setGlow(null);

    // Inner flesh half (smaller semicircle)
    const innerPts = [];
    const innerR = r * 0.7;
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (s / steps) * Math.PI;
      innerPts.push([half.x + Math.cos(a) * innerR, half.y + Math.sin(a) * innerR]);
    }
    renderer.fillPoly(innerPts, type.innerColor);

    // Slice edge line
    const ex1 = half.x + Math.cos(clipAngle) * r;
    const ey1 = half.y + Math.sin(clipAngle) * r;
    const ex2 = half.x - Math.cos(clipAngle) * r;
    const ey2 = half.y - Math.sin(clipAngle) * r;
    renderer.drawLine(ex1, ey1, ex2, ey2, type.sliceColor2, 2);
  }
}

function drawHUD(renderer, text) {
  // Lives as hearts
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      renderer.setGlow('#f44', 0.4);
      text.drawText('\u2665', 15 + i * 25, 12, 18, '#f44', 'left');
    } else {
      text.drawText('\u2665', 15 + i * 25, 12, 18, '#333', 'left');
    }
  }
  renderer.setGlow(null);

  // Score on canvas
  renderer.setGlow('#e6a', 0.3);
  text.drawText(`Score: ${score}`, W - 15, 14, 16, '#e6a', 'right');
  renderer.setGlow(null);

  // Current combo indicator
  if (comboCount >= 2 && comboTimer > 0) {
    renderer.setGlow('#ff0', 0.5);
    text.drawText(`${comboCount}x`, W / 2, 20, 20, '#ff0', 'center');
    renderer.setGlow(null);
  }
}
