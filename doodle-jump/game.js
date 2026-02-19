// doodle-jump/game.js — Doodle Jump game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// Physics
const GRAVITY = 0.4;
const BOUNCE_VEL = -11;
const MOVE_SPEED = 5;

// Player dimensions
const PW = 30;
const PH = 30;

// Platform dimensions
const PLAT_W = 70;
const PLAT_H = 12;

// Platform generation
const PLAT_COUNT = 8;
const MIN_PLAT_GAP_Y = 40;
const MAX_PLAT_GAP_Y_START = 80;
const MAX_PLAT_GAP_Y_HARD = 130;

// Platform types
const TYPE_NORMAL = 0;
const TYPE_MOVING = 1;
const TYPE_BREAKABLE = 2;

// ── State ──
let score, best = 0;
let player, platforms, cameraY, maxHeight;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function createPlatform(y, heightScore) {
  let type = TYPE_NORMAL;
  const difficulty = Math.min(heightScore / 5000, 1);

  const roll = Math.random();
  if (roll < 0.1 + difficulty * 0.2) {
    type = TYPE_MOVING;
  } else if (roll < 0.15 + difficulty * 0.25) {
    type = TYPE_BREAKABLE;
  }

  return {
    x: Math.random() * (W - PLAT_W),
    y: y,
    type: type,
    broken: false,
    moveDir: Math.random() < 0.5 ? 1 : -1,
    moveSpeed: 1 + Math.random() * 1.5
  };
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';

    player = {
      x: W / 2 - PW / 2,
      y: H - 100,
      vy: 0,
      facingRight: true
    };

    cameraY = 0;
    maxHeight = 0;

    // Generate initial platforms
    platforms = [];
    // Starting platform directly under the player
    platforms.push({
      x: W / 2 - PLAT_W / 2,
      y: H - 60,
      type: TYPE_NORMAL,
      broken: false,
      moveDir: 0,
      moveSpeed: 0
    });

    // Fill screen with platforms going upward
    let lastY = H - 60;
    for (let i = 1; i < PLAT_COUNT; i++) {
      lastY -= MIN_PLAT_GAP_Y + Math.random() * (MAX_PLAT_GAP_Y_START - MIN_PLAT_GAP_Y);
      platforms.push(createPlatform(lastY, 0));
    }

    game.showOverlay('DOODLE JUMP', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        player.vy = BOUNCE_VEL;
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')
          || input.wasPressed('a') || input.wasPressed('d')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Horizontal movement
    if (input.isDown('ArrowLeft') || input.isDown('a')) {
      player.x -= MOVE_SPEED;
      player.facingRight = false;
    }
    if (input.isDown('ArrowRight') || input.isDown('d')) {
      player.x += MOVE_SPEED;
      player.facingRight = true;
    }

    // Screen wrapping
    if (player.x + PW < 0) player.x = W;
    if (player.x > W) player.x = -PW;

    // Apply gravity
    player.vy += GRAVITY;
    player.y += player.vy;

    // Calculate height-based difficulty
    const difficulty = Math.min(maxHeight / 5000, 1);
    const maxGapY = MAX_PLAT_GAP_Y_START + difficulty * (MAX_PLAT_GAP_Y_HARD - MAX_PLAT_GAP_Y_START);

    // Move moving platforms
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.type === TYPE_MOVING && !p.broken) {
        p.x += p.moveDir * p.moveSpeed;
        if (p.x <= 0) { p.x = 0; p.moveDir = 1; }
        if (p.x + PLAT_W >= W) { p.x = W - PLAT_W; p.moveDir = -1; }
      }
    }

    // Platform collision (only when falling)
    if (player.vy > 0) {
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        if (p.broken) continue;

        const playerBottom = player.y + PH;
        const prevBottom = playerBottom - player.vy;

        if (playerBottom >= p.y && prevBottom <= p.y + PLAT_H &&
            player.x + PW > p.x + 5 && player.x < p.x + PLAT_W - 5) {

          if (p.type === TYPE_BREAKABLE) {
            p.broken = true;
          } else {
            player.vy = BOUNCE_VEL;
            player.y = p.y - PH;
          }
        }
      }
    }

    // Camera scrolling
    const scrollThreshold = H * 0.4;
    if (player.y < scrollThreshold + cameraY) {
      const shift = (scrollThreshold + cameraY) - player.y;
      cameraY -= shift;

      const currentHeight = Math.floor(-cameraY);
      if (currentHeight > maxHeight) {
        const heightGain = currentHeight - maxHeight;
        maxHeight = currentHeight;
        score += heightGain;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
      }

      // Remove platforms that fell off the bottom
      for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y - cameraY > H + 50) {
          platforms.splice(i, 1);
        }
      }

      // Generate new platforms at the top
      while (platforms.length < PLAT_COUNT) {
        let highestY = Infinity;
        for (let i = 0; i < platforms.length; i++) {
          if (platforms[i].y < highestY) highestY = platforms[i].y;
        }
        const gap = MIN_PLAT_GAP_Y + Math.random() * (maxGapY - MIN_PLAT_GAP_Y);
        const newY = highestY - gap;
        platforms.push(createPlatform(newY, maxHeight));
      }
    }

    // Game over: player falls below the visible screen
    if (player.y - cameraY > H + PH) {
      game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    // Background — simple solid dark fill (gradient not available in WebGL renderer)
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Subtle grid lines scrolling with camera
    const gridSize = 40;
    const gridOffsetY = (cameraY % gridSize + gridSize) % gridSize;
    for (let gy = -gridSize + gridOffsetY; gy < H + gridSize; gy += gridSize) {
      renderer.drawLine(0, gy, W, gy, '#16213e', 1);
    }

    // Draw platforms
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      const drawY = p.y - cameraY;

      // Skip if off screen
      if (drawY < -20 || drawY > H + 20) continue;

      if (p.broken) {
        // Broken platform fragments
        renderer.fillRect(p.x, drawY + 5, PLAT_W * 0.3, PLAT_H * 0.6, '#55332280');
        renderer.fillRect(p.x + PLAT_W * 0.5, drawY + 10, PLAT_W * 0.35, PLAT_H * 0.5, '#55332280');
        continue;
      }

      if (p.type === TYPE_NORMAL) {
        // Green solid platform with glow
        renderer.setGlow('#3c3', 0.6);
        renderer.fillRect(p.x, drawY, PLAT_W, PLAT_H, '#3c3');
        renderer.setGlow(null);
        // Highlight on top
        renderer.fillRect(p.x + 3, drawY + 1, PLAT_W - 6, 3, '#5e5');

      } else if (p.type === TYPE_MOVING) {
        // Blue moving platform with glow
        renderer.setGlow('#48f', 0.6);
        renderer.fillRect(p.x, drawY, PLAT_W, PLAT_H, '#48f');
        renderer.setGlow(null);
        // Highlight on top
        renderer.fillRect(p.x + 3, drawY + 1, PLAT_W - 6, 3, '#8af');
        // Direction indicator text
        const arrow = p.moveDir > 0 ? '>>' : '<<';
        text.drawText(arrow, p.x + PLAT_W / 2, drawY + 2, 8, '#bdf', 'center');

      } else if (p.type === TYPE_BREAKABLE) {
        // Brown/amber breakable platform with glow
        renderer.setGlow('#a63', 0.4);
        renderer.fillRect(p.x, drawY, PLAT_W, PLAT_H, '#a63');
        renderer.setGlow(null);
        // Crack lines
        renderer.drawLine(p.x + PLAT_W * 0.3, drawY, p.x + PLAT_W * 0.4, drawY + PLAT_H, '#543', 1);
        renderer.drawLine(p.x + PLAT_W * 0.65, drawY, p.x + PLAT_W * 0.55, drawY + PLAT_H, '#543', 1);
      }
    }

    // Draw player
    const px = player.x;
    const py = player.y - cameraY;
    const cx = px + PW / 2;
    const cy = py + PH / 2;

    // Body — orange blob (ellipse approximated with circle)
    renderer.setGlow('#fa0', 0.8);
    renderer.fillCircle(cx, cy + 2, PW / 2, '#fa0');
    renderer.setGlow(null);

    // Lighter belly (smaller inner circle)
    renderer.fillCircle(cx, cy + 4, PW / 2 - 5, '#fc6');

    // Eyes
    const eyeDir = player.facingRight ? 1 : -1;
    // Left eye white
    renderer.fillCircle(cx - 5 * eyeDir, cy - 4, 5, '#fff');
    // Left eye pupil
    renderer.fillCircle(cx - 3 * eyeDir, cy - 4, 2.5, '#111');
    // Right eye white
    renderer.fillCircle(cx + 5 * eyeDir, cy - 4, 5, '#fff');
    // Right eye pupil
    renderer.fillCircle(cx + 7 * eyeDir, cy - 4, 2.5, '#111');

    // Nose/mouth
    renderer.fillCircle(cx + 1 * eyeDir, cy + 1, 2, '#e80');

    // Feet (two little circles at bottom)
    renderer.fillCircle(cx - 6, cy + PH / 2 - 2, 4, '#fa0');
    renderer.fillCircle(cx + 6, cy + PH / 2 - 2, 4, '#fa0');

    // Height meter on the side (only during play)
    if (game.state === 'playing') {
      renderer.fillRect(W - 6, 0, 4, H, '#ffaa004d');
      // Marker showing relative height
      const markerY = H - Math.min((maxHeight / 200) * H, H - 10);
      renderer.setGlow('#fa0', 0.5);
      renderer.fillRect(W - 8, markerY - 2, 8, 4, '#fa0');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
