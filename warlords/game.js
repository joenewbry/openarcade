// warlords/game.js — Warlords game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Castle configuration
const BRICK_W = 12;
const BRICK_H = 12;
const WALL_LAYERS = 3;
const WALL_LENGTH = 8;
const SHIELD_LEN = 40;
const SHIELD_THICK = 6;
const BALL_R = 5;
const BALL_SPEED_BASE = 3.5;
const CORNER_INSET = 10;

// TL=red, TR=yellow, BL=purple(player), BR=green
const CASTLE_COLORS = ['#f44', '#ff0', '#a4e', '#0f0'];
const SHIELD_COLORS = ['#f88', '#ff8', '#c8f', '#8f8'];

// Dimmed versions for health bar backgrounds
const DIM_COLOR = '#16213e';

// ── State ──
let score, best = 0, frameCount;
let castles, fireballs, eliminationOrder;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Brick generation ──

function createBricks(corner) {
  const bricks = [];

  switch (corner) {
    case 0: { // top-left
      for (let layer = 0; layer < WALL_LAYERS; layer++) {
        for (let i = 0; i < WALL_LENGTH; i++) {
          bricks.push({ x: CORNER_INSET + i * BRICK_W, y: CORNER_INSET + layer * BRICK_H, alive: true });
        }
        for (let i = 1; i < WALL_LENGTH; i++) {
          bricks.push({ x: CORNER_INSET + layer * BRICK_W, y: CORNER_INSET + i * BRICK_H, alive: true });
        }
      }
      break;
    }
    case 1: { // top-right
      for (let layer = 0; layer < WALL_LAYERS; layer++) {
        for (let i = 0; i < WALL_LENGTH; i++) {
          bricks.push({ x: W - CORNER_INSET - (i + 1) * BRICK_W, y: CORNER_INSET + layer * BRICK_H, alive: true });
        }
        for (let i = 1; i < WALL_LENGTH; i++) {
          bricks.push({ x: W - CORNER_INSET - (layer + 1) * BRICK_W, y: CORNER_INSET + i * BRICK_H, alive: true });
        }
      }
      break;
    }
    case 2: { // bottom-left (player)
      for (let layer = 0; layer < WALL_LAYERS; layer++) {
        for (let i = 0; i < WALL_LENGTH; i++) {
          bricks.push({ x: CORNER_INSET + i * BRICK_W, y: H - CORNER_INSET - (layer + 1) * BRICK_H, alive: true });
        }
        for (let i = 1; i < WALL_LENGTH; i++) {
          bricks.push({ x: CORNER_INSET + layer * BRICK_W, y: H - CORNER_INSET - (i + 1) * BRICK_H, alive: true });
        }
      }
      break;
    }
    case 3: { // bottom-right
      for (let layer = 0; layer < WALL_LAYERS; layer++) {
        for (let i = 0; i < WALL_LENGTH; i++) {
          bricks.push({ x: W - CORNER_INSET - (i + 1) * BRICK_W, y: H - CORNER_INSET - (layer + 1) * BRICK_H, alive: true });
        }
        for (let i = 1; i < WALL_LENGTH; i++) {
          bricks.push({ x: W - CORNER_INSET - (layer + 1) * BRICK_W, y: H - CORNER_INSET - (i + 1) * BRICK_H, alive: true });
        }
      }
      break;
    }
  }
  return bricks;
}

// ── Shield positioning ──

function getShieldPos(corner, t) {
  const armLen = WALL_LENGTH * BRICK_W;
  const totalPerimeter = armLen * 2;
  const dist = t * totalPerimeter;
  let sx, sy, angle;
  const offset = WALL_LAYERS * BRICK_H + 4;

  switch (corner) {
    case 0: { // top-left
      if (dist <= armLen) {
        sx = CORNER_INSET + dist;
        sy = CORNER_INSET + offset;
        angle = 0;
      } else {
        sx = CORNER_INSET + offset;
        sy = CORNER_INSET + (dist - armLen);
        angle = Math.PI / 2;
      }
      break;
    }
    case 1: { // top-right
      if (dist <= armLen) {
        sx = W - CORNER_INSET - dist;
        sy = CORNER_INSET + offset;
        angle = 0;
      } else {
        sx = W - CORNER_INSET - offset;
        sy = CORNER_INSET + (dist - armLen);
        angle = Math.PI / 2;
      }
      break;
    }
    case 2: { // bottom-left (player)
      if (dist <= armLen) {
        sx = CORNER_INSET + dist;
        sy = H - CORNER_INSET - offset;
        angle = 0;
      } else {
        sx = CORNER_INSET + offset;
        sy = H - CORNER_INSET - (dist - armLen);
        angle = Math.PI / 2;
      }
      break;
    }
    case 3: { // bottom-right
      if (dist <= armLen) {
        sx = W - CORNER_INSET - dist;
        sy = H - CORNER_INSET - offset;
        angle = 0;
      } else {
        sx = W - CORNER_INSET - offset;
        sy = H - CORNER_INSET - (dist - armLen);
        angle = Math.PI / 2;
      }
      break;
    }
  }
  return { x: sx, y: sy, angle };
}

function getShieldRect(corner, t) {
  const pos = getShieldPos(corner, t);
  if (pos.angle === 0) {
    return { x: pos.x - SHIELD_LEN / 2, y: pos.y - SHIELD_THICK / 2, w: SHIELD_LEN, h: SHIELD_THICK };
  } else {
    return { x: pos.x - SHIELD_THICK / 2, y: pos.y - SHIELD_LEN / 2, w: SHIELD_THICK, h: SHIELD_LEN };
  }
}

// ── Castle center ──

function getCastleCenter(corner) {
  switch (corner) {
    case 0: return { x: CORNER_INSET, y: CORNER_INSET };
    case 1: return { x: W - CORNER_INSET, y: CORNER_INSET };
    case 2: return { x: CORNER_INSET, y: H - CORNER_INSET };
    case 3: return { x: W - CORNER_INSET, y: H - CORNER_INSET };
  }
}

// ── Fireball ──

function createFireball() {
  const angle = Math.random() * Math.PI * 2;
  const speed = BALL_SPEED_BASE + Math.min(frameCount / 3600, 2);
  return {
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H / 2 + (Math.random() - 0.5) * 60,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed: speed
  };
}

// ── Physics helpers ──

function ballHitsRect(ball, rx, ry, rw, rh) {
  return ball.x + BALL_R > rx && ball.x - BALL_R < rx + rw &&
         ball.y + BALL_R > ry && ball.y - BALL_R < ry + rh;
}

function reflectBallOffRect(ball, rect) {
  const overlapLeft = (ball.x + BALL_R) - rect.x;
  const overlapRight = (rect.x + rect.w) - (ball.x - BALL_R);
  const overlapTop = (ball.y + BALL_R) - rect.y;
  const overlapBottom = (rect.y + rect.h) - (ball.y - BALL_R);

  const minX = Math.min(overlapLeft, overlapRight);
  const minY = Math.min(overlapTop, overlapBottom);

  if (minX < minY) {
    ball.vx = -ball.vx;
  } else {
    ball.vy = -ball.vy;
  }

  // Slight randomness to prevent infinite loops
  ball.vx += (Math.random() - 0.5) * 0.3;
  ball.vy += (Math.random() - 0.5) * 0.3;

  // Normalize speed
  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  ball.vx = (ball.vx / currentSpeed) * ball.speed;
  ball.vy = (ball.vy / currentSpeed) * ball.speed;
}

// ── AI ──

function updateAI(castle) {
  if (!castle.alive) return;

  let nearestBall = null;
  let nearestDist = Infinity;

  for (const ball of fireballs) {
    const dx = ball.x - getCastleCenter(castle.corner).x;
    const dy = ball.y - getCastleCenter(castle.corner).y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestBall = ball;
    }
  }

  if (!nearestBall) return;

  let bestT = castle.shieldPos;
  let bestDist = Infinity;

  for (let sample = 0; sample <= 20; sample++) {
    const t = sample / 20;
    const pos = getShieldPos(castle.corner, t);
    const dx = nearestBall.x - pos.x;
    const dy = nearestBall.y - pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
    }
  }

  const aiSpeed = 0.012 + Math.random() * 0.005;
  const diff = bestT - castle.shieldPos;
  if (Math.abs(diff) > aiSpeed) {
    castle.shieldPos += Math.sign(diff) * aiSpeed;
  } else {
    castle.shieldPos = bestT;
  }
  castle.shieldPos = Math.max(0.05, Math.min(0.95, castle.shieldPos));
}

// ── Export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    frameCount = 0;
    eliminationOrder = [];
    scoreEl.textContent = '0';

    castles = [];
    for (let i = 0; i < 4; i++) {
      castles.push({
        corner: i,
        alive: true,
        bricks: createBricks(i),
        shieldPos: 0.25,
        color: CASTLE_COLORS[i],
        shieldColor: SHIELD_COLORS[i]
      });
    }

    fireballs = [createFireball()];

    game.showOverlay('WARLORDS', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Player shield movement (castle 2 = bottom-left)
    const playerCastle = castles[2];
    if (playerCastle.alive) {
      const shieldSpeed = 0.018;
      if (input.isDown('ArrowLeft') || input.isDown('ArrowUp')) {
        playerCastle.shieldPos -= shieldSpeed;
      }
      if (input.isDown('ArrowRight') || input.isDown('ArrowDown')) {
        playerCastle.shieldPos += shieldSpeed;
      }
      playerCastle.shieldPos = Math.max(0.05, Math.min(0.95, playerCastle.shieldPos));
    }

    // AI shields
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue;
      updateAI(castles[i]);
    }

    // Spawn additional fireballs over time
    if (frameCount > 600 && fireballs.length < 2) {
      fireballs.push(createFireball());
    }
    if (frameCount > 1500 && fireballs.length < 3) {
      fireballs.push(createFireball());
    }

    // Update fireballs
    for (let fi = fireballs.length - 1; fi >= 0; fi--) {
      const ball = fireballs[fi];

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Gradually increase speed
      ball.speed = BALL_SPEED_BASE + Math.min(frameCount / 1800, 3);
      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (Math.abs(currentSpeed - ball.speed) > 0.5) {
        ball.vx = (ball.vx / currentSpeed) * ball.speed;
        ball.vy = (ball.vy / currentSpeed) * ball.speed;
      }

      // Wall bounces
      if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R >= W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
      if (ball.y + BALL_R >= H) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); }

      // Shield collisions
      for (const castle of castles) {
        if (!castle.alive) continue;
        const sr = getShieldRect(castle.corner, castle.shieldPos);
        if (ballHitsRect(ball, sr.x, sr.y, sr.w, sr.h)) {
          reflectBallOffRect(ball, sr);
          ball.x += ball.vx * 2;
          ball.y += ball.vy * 2;
        }
      }

      // Brick collisions
      for (const castle of castles) {
        if (!castle.alive) continue;
        for (const brick of castle.bricks) {
          if (!brick.alive) continue;
          if (ballHitsRect(ball, brick.x, brick.y, BRICK_W, BRICK_H)) {
            brick.alive = false;
            reflectBallOffRect(ball, { x: brick.x, y: brick.y, w: BRICK_W, h: BRICK_H });
            break;
          }
        }

        // Check if castle is destroyed
        const aliveCount = castle.bricks.filter(b => b.alive).length;
        if (aliveCount === 0 && castle.alive) {
          castle.alive = false;
          eliminationOrder.push(castle.corner);
          if (castle.corner !== 2) {
            score += 100;
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
          }
        }
      }
    }

    // Check game end conditions
    const aliveCastles = castles.filter(c => c.alive);

    // Player eliminated
    if (!castles[2].alive) {
      game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
      return;
    }

    // Player is last one standing
    if (aliveCastles.length === 1 && aliveCastles[0].corner === 2) {
      score += 200;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      game.showOverlay('VICTORY!', `Score: ${score} -- Press any key to restart`);
      game.setState('over');
      return;
    }
  };

  game.onDraw = (renderer, text) => {
    // Center cross lines (subtle grid)
    renderer.drawLine(W / 2, 0, W / 2, H, '#16213e', 1);
    renderer.drawLine(0, H / 2, W, H / 2, '#16213e', 1);

    // Diagonal lines (arena feel)
    renderer.drawLine(0, 0, W, H, '#0f1a2e', 1);
    renderer.drawLine(W, 0, 0, H, '#0f1a2e', 1);

    // Draw castles
    for (const castle of castles) {
      // Bricks
      renderer.setGlow(castle.color, 0.3);
      for (const brick of castle.bricks) {
        if (!brick.alive) continue;
        renderer.fillRect(brick.x + 1, brick.y + 1, BRICK_W - 2, BRICK_H - 2, castle.color);
      }
      renderer.setGlow(null);

      // Shield
      if (castle.alive) {
        const sr = getShieldRect(castle.corner, castle.shieldPos);
        renderer.setGlow(castle.shieldColor, 0.8);
        renderer.fillRect(sr.x, sr.y, sr.w, sr.h, castle.shieldColor);
        renderer.setGlow(null);
      }

      // Castle core (inner corner marker)
      if (castle.alive) {
        const center = getCastleCenter(castle.corner);
        renderer.setGlow(castle.color, 0.5);
        renderer.fillRect(center.x - 4, center.y - 4, 8, 8, castle.color);
        renderer.setGlow(null);
      } else {
        // Dead castle: draw an X
        const center = getCastleCenter(castle.corner);
        renderer.drawLine(center.x - 8, center.y - 8, center.x + 8, center.y + 8, '#333', 2);
        renderer.drawLine(center.x + 8, center.y - 8, center.x - 8, center.y + 8, '#333', 2);
      }
    }

    // Draw fireballs
    for (const ball of fireballs) {
      // Outer glow
      renderer.setGlow('#f80', 0.9);
      renderer.fillCircle(ball.x, ball.y, BALL_R, '#f80');
      // Inner bright core
      renderer.setGlow('#ff0', 0.5);
      renderer.fillCircle(ball.x, ball.y, BALL_R * 0.5, '#ff0');
      renderer.setGlow(null);
    }

    // Corner labels
    for (let i = 0; i < 4; i++) {
      if (!castles[i].alive) continue;
      const center = getCastleCenter(i);
      const label = i === 2 ? 'YOU' : 'AI';
      const labelOffsetX = (i === 0 || i === 2) ? 30 : -30;
      const labelOffsetY = (i === 0 || i === 1) ? 30 : -20;
      text.drawText(label, center.x + labelOffsetX, center.y + labelOffsetY - 10, 10, castles[i].color, 'center');
    }

    // Status indicators (center of canvas)
    let statusX = W / 2 - 60;
    for (let i = 0; i < 4; i++) {
      const c = castles[i];
      const name = i === 2 ? 'P' : `${i + 1}`;
      const color = c.alive ? c.color : '#333';
      text.drawText(name, statusX + i * 40, H / 2 - 14, 11, color, 'center');

      // Health bar background
      const totalBricks = c.bricks.length;
      const aliveBricks = c.bricks.filter(b => b.alive).length;
      const healthPct = aliveBricks / totalBricks;
      renderer.fillRect(statusX + i * 40 - 15, H / 2 + 2, 30, 4, DIM_COLOR);
      renderer.fillRect(statusX + i * 40 - 15, H / 2 + 2, 30 * healthPct, 4, color);
    }
  };

  game.start();
  return game;
}
