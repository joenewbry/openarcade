// temple-run/game.js — Temple Run 2D game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// --- Constants ---
const LANE_COUNT = 3;
const LANE_WIDTH = 100;
const CORRIDOR_WIDTH = LANE_COUNT * LANE_WIDTH; // 300
const CORRIDOR_LEFT = (W - CORRIDOR_WIDTH) / 2;  // 50
const PLAYER_W = 30;
const PLAYER_H = 40;
const PLAYER_Y = H - 100;
const LANE_SWITCH_SPEED = 12;

// Obstacle types
const OBS_ROOT = 'root';
const OBS_FIRE = 'fire';
const OBS_GAP = 'gap';

// Timing
const BASE_SPEED = 3;
const MAX_SPEED = 10;
const SPEED_RAMP_FRAMES = 7200;
const MIN_SPAWN_DIST = 140;
const MAX_SPAWN_DIST = 280;

// Jump / slide
const JUMP_DURATION = 30;
const JUMP_HEIGHT = 50;
const SLIDE_DURATION = 24;

// --- State ---
let playerLane, playerX, targetX;
let scrollSpeed, frameCount;
let obstacles, coins, nextSpawnY;
let isJumping, jumpFrame;
let isSliding, slideFrame;
let distanceTraveled, coinBonus;
let particles;
let wallOffset, tileOffset;
let score, best;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function laneX(lane) {
  return CORRIDOR_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function getJumpOffset() {
  if (!isJumping) return 0;
  const t = jumpFrame / JUMP_DURATION;
  return -JUMP_HEIGHT * Math.sin(t * Math.PI);
}

function spawnRow(y) {
  const r = Math.random();
  if (r < 0.25) {
    const lane = Math.floor(Math.random() * 3);
    obstacles.push({ type: OBS_ROOT, lane, y, width: 1 });
    if (Math.random() < 0.3) {
      const adj = lane === 0 ? 1 : (lane === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2));
      obstacles.push({ type: OBS_ROOT, lane: adj, y, width: 1 });
    }
  } else if (r < 0.45) {
    const lane = Math.floor(Math.random() * 3);
    obstacles.push({ type: OBS_FIRE, lane, y, width: 1 });
    if (Math.random() < 0.25) {
      const adj = lane === 0 ? 1 : (lane === 2 ? 1 : (Math.random() < 0.5 ? 0 : 2));
      obstacles.push({ type: OBS_FIRE, lane: adj, y, width: 1 });
    }
  } else if (r < 0.6) {
    const lane = Math.floor(Math.random() * 3);
    obstacles.push({ type: OBS_GAP, lane, y, width: 1 });
  } else {
    const lane = Math.floor(Math.random() * 3);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let c = 0; c < count; c++) {
      coins.push({
        x: laneX(lane),
        y: y - c * 40,
        bobPhase: Math.random() * Math.PI * 2
      });
    }
  }
}

function checkCollision(obs) {
  const obsX = laneX(obs.lane);
  const obsW = LANE_WIDTH * 0.7;
  const px = playerX;
  const py = PLAYER_Y;
  const pw = PLAYER_W;
  const ph = PLAYER_H;

  let obsH;
  if (obs.type === OBS_GAP) obsH = 50;
  else if (obs.type === OBS_FIRE) obsH = 30;
  else obsH = 18;

  if (Math.abs(px - obsX) > (pw + obsW) / 2) return false;

  const obsTop = obs.y;
  const obsBottom = obs.y + obsH;
  if (obsBottom < py || obsTop > py + ph) return false;

  if (obs.type === OBS_ROOT) {
    if (isJumping && jumpFrame > 3 && jumpFrame < JUMP_DURATION - 3) return false;
    return true;
  }
  if (obs.type === OBS_FIRE) {
    if (isSliding && slideFrame > 2 && slideFrame < SLIDE_DURATION - 2) return false;
    return true;
  }
  if (obs.type === OBS_GAP) {
    if (isJumping && jumpFrame > 3 && jumpFrame < JUMP_DURATION - 3) return false;
    return true;
  }
  return true;
}

function checkCoinCollect(coin) {
  const dx = playerX - coin.x;
  const dy = (PLAYER_Y + PLAYER_H / 2) - coin.y;
  return Math.sqrt(dx * dx + dy * dy) < 30;
}

export function createGame() {
  const game = new Game('game');
  best = 0;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    playerLane = 1;
    playerX = laneX(1);
    targetX = playerX;
    scrollSpeed = BASE_SPEED;
    frameCount = 0;
    obstacles = [];
    coins = [];
    nextSpawnY = -200;
    isJumping = false;
    jumpFrame = 0;
    isSliding = false;
    slideFrame = 0;
    distanceTraveled = 0;
    coinBonus = 0;
    particles = [];
    wallOffset = 0;
    tileOffset = 0;
    game.showOverlay('TEMPLE RUN 2D', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // --- waiting state ---
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    // --- over state ---
    if (game.state === 'over') {
      // Update particles even when game is over
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // --- playing state ---
    frameCount++;

    // Increase speed over time
    const t = Math.min(frameCount / SPEED_RAMP_FRAMES, 1);
    scrollSpeed = BASE_SPEED + t * (MAX_SPEED - BASE_SPEED);

    // Distance and score
    distanceTraveled += scrollSpeed;
    score = Math.floor(distanceTraveled / 10) + coinBonus;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Lane switching input
    if (input.wasPressed('ArrowLeft') && playerLane > 0) {
      playerLane--;
    }
    if (input.wasPressed('ArrowRight') && playerLane < 2) {
      playerLane++;
    }

    // Smooth lane switching
    targetX = laneX(playerLane);
    const dx = targetX - playerX;
    if (Math.abs(dx) < LANE_SWITCH_SPEED) {
      playerX = targetX;
    } else {
      playerX += Math.sign(dx) * LANE_SWITCH_SPEED;
    }

    // Jump
    if (input.wasPressed('ArrowUp') || input.wasPressed(' ')) {
      if (!isJumping && !isSliding) {
        isJumping = true;
        jumpFrame = 0;
      }
    }
    if (isJumping) {
      jumpFrame++;
      if (jumpFrame >= JUMP_DURATION) {
        isJumping = false;
        jumpFrame = 0;
      }
    }

    // Slide
    if (input.wasPressed('ArrowDown')) {
      if (!isSliding && !isJumping) {
        isSliding = true;
        slideFrame = 0;
      }
    }
    if (isSliding) {
      slideFrame++;
      if (slideFrame >= SLIDE_DURATION) {
        isSliding = false;
        slideFrame = 0;
      }
    }

    // Scroll offsets
    wallOffset = (wallOffset + scrollSpeed) % 40;
    tileOffset = (tileOffset + scrollSpeed) % 50;

    // Spawn obstacles and coins
    while (nextSpawnY < 0) {
      spawnRow(nextSpawnY);
      nextSpawnY -= MIN_SPAWN_DIST + Math.random() * (MAX_SPAWN_DIST - MIN_SPAWN_DIST);
    }

    // Move obstacles down
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].y += scrollSpeed;
      if (obstacles[i].y > H + 50) {
        obstacles.splice(i, 1);
        continue;
      }
      if (checkCollision(obstacles[i])) {
        // Game over
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        // Death particles
        for (let j = 0; j < 20; j++) {
          particles.push({
            x: playerX,
            y: PLAYER_Y + PLAYER_H / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30 + Math.random() * 20,
            color: '#d84'
          });
        }
        game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // Move coins down
    for (let i = coins.length - 1; i >= 0; i--) {
      coins[i].y += scrollSpeed;
      if (coins[i].y > H + 50) {
        coins.splice(i, 1);
        continue;
      }
      if (checkCoinCollect(coins[i])) {
        for (let j = 0; j < 6; j++) {
          particles.push({
            x: coins[i].x,
            y: coins[i].y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 15 + Math.random() * 10,
            color: '#ff0'
          });
        }
        coinBonus += 50;
        coins.splice(i, 1);
      }
    }

    // Update nextSpawnY
    nextSpawnY += scrollSpeed;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Expose game data for ML training
    window.gameData = {
      playerLane,
      playerX,
      playerY: PLAYER_Y,
      isJumping,
      isSliding,
      scrollSpeed,
      obstacles: obstacles.map(o => ({ type: o.type, lane: o.lane, y: o.y })),
      coins: coins.map(c => ({ x: c.x, y: c.y })),
      score,
      distanceTraveled
    };
  };

  game.onDraw = (renderer, text) => {
    // --- Draw temple walls (left and right) ---

    // Left wall gradient (dark background blocks)
    const wallW = CORRIDOR_LEFT;
    renderer.fillRect(0, 0, wallW, H, '#0d0d1a');
    // Right wall
    const rightX = CORRIDOR_LEFT + CORRIDOR_WIDTH;
    renderer.fillRect(rightX, 0, wallW, H, '#0d0d1a');

    // Slightly lighter inner strips for wall gradient effect
    renderer.fillRect(wallW - 16, 0, 16, H, '#111428');
    renderer.fillRect(rightX, 0, 16, H, '#111428');

    // Wall block decorations (stone pattern)
    for (let y = -wallOffset; y < H; y += 40) {
      const row = Math.floor((y + wallOffset) / 40);
      const off = (row % 2) * 20;
      // Left wall blocks
      for (let x = 0; x < wallW; x += 40) {
        renderer.drawLine(x + off * 0.5, y, x + off * 0.5 + 40, y, '#0f346040', 1);
        renderer.drawLine(x + off * 0.5, y, x + off * 0.5, y + 40, '#0f346040', 1);
      }
      // Right wall blocks
      for (let x = rightX; x < W; x += 40) {
        renderer.drawLine(x + off * 0.5, y, x + off * 0.5 + 40, y, '#0f346040', 1);
        renderer.drawLine(x + off * 0.5, y, x + off * 0.5, y + 40, '#0f346040', 1);
      }
    }

    // Wall edge glow
    renderer.fillRect(wallW - 3, 0, 6, H, '#dd884414');
    renderer.fillRect(rightX - 3, 0, 6, H, '#dd884414');

    // Wall inner borders
    renderer.drawLine(wallW, 0, wallW, H, '#dd88444d', 1);
    renderer.drawLine(rightX, 0, rightX, H, '#dd88444d', 1);

    // Lane dividers (dashed)
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = CORRIDOR_LEFT + i * LANE_WIDTH;
      renderer.dashedLine(lx, 0, lx, H, '#dd88441f', 1, 8, 12);
    }

    // --- Floor tiles ---
    const tileSize = 50;
    for (let y = -tileOffset; y < H; y += tileSize) {
      const row = Math.floor((y + tileOffset) / tileSize);
      const off = (row % 2) * (tileSize / 2);
      for (let x = CORRIDOR_LEFT + off; x < CORRIDOR_LEFT + CORRIDOR_WIDTH; x += tileSize) {
        // Tile outline
        renderer.drawLine(x, y, x + tileSize, y, '#0f346066', 0.5);
        renderer.drawLine(x, y, x, y + tileSize, '#0f346066', 0.5);
      }
    }

    // --- Draw gaps ---
    for (const obs of obstacles) {
      if (obs.type !== OBS_GAP) continue;
      const cx = laneX(obs.lane);
      const gy = obs.y;
      const gw = LANE_WIDTH - 6;
      const gh = 50;

      // Dark pit
      renderer.fillRect(cx - gw / 2, gy, gw, gh, '#050510');

      // Edge glow (4 border lines)
      renderer.drawLine(cx - gw / 2, gy, cx + gw / 2, gy, '#dd88444d', 2);
      renderer.drawLine(cx - gw / 2, gy + gh, cx + gw / 2, gy + gh, '#dd88444d', 2);
      renderer.drawLine(cx - gw / 2, gy, cx - gw / 2, gy + gh, '#dd88444d', 2);
      renderer.drawLine(cx + gw / 2, gy, cx + gw / 2, gy + gh, '#dd88444d', 2);

      // Depth lines
      for (let di = 4; di < gw - 4; di += 12) {
        renderer.drawLine(cx - gw / 2 + di, gy + 2, cx - gw / 2 + di + 4, gy + gh - 2, '#6432144d', 1);
      }

      // Label
      text.drawText('GAP', cx, gy - 8, 9, '#d84', 'center');
    }

    // --- Draw coins ---
    renderer.setGlow('#ff0', 0.6);
    for (const coin of coins) {
      coin.bobPhase += 0.08;
      const bobY = Math.sin(coin.bobPhase) * 3;
      renderer.fillCircle(coin.x, coin.y + bobY, 8, '#ff0');
      // Inner highlight
      renderer.fillCircle(coin.x - 2, coin.y + bobY - 2, 3, '#ffa');
    }
    renderer.setGlow(null);

    // --- Draw root obstacles ---
    for (const obs of obstacles) {
      if (obs.type !== OBS_ROOT) continue;
      const cx = laneX(obs.lane);
      const ry = obs.y;
      const rw = LANE_WIDTH * 0.7;
      const rh = 18;

      // Root body (organic shape as filled polygon)
      renderer.setGlow('#d84', 0.4);
      const rootPts = [
        { x: cx - rw / 2, y: ry + rh },
        { x: cx - rw / 3, y: ry - 4 },
        { x: cx - rw / 6, y: ry + rh * 0.3 },
        { x: cx, y: ry - 6 },
        { x: cx + rw / 6, y: ry + rh * 0.4 },
        { x: cx + rw / 3, y: ry - 3 },
        { x: cx + rw / 2, y: ry + rh }
      ];
      renderer.fillPoly(rootPts, '#5a3a1a');

      // Root highlight (ellipse approximated as wide rect)
      renderer.fillRect(cx - rw * 0.25, ry + rh * 0.3 - 3, rw * 0.5, 6, '#7a5a3a');
      renderer.setGlow(null);

      // Label
      text.drawText('ROOT', cx, ry - 8, 9, '#d84', 'center');
    }

    // --- Draw fire obstacles ---
    for (const obs of obstacles) {
      if (obs.type !== OBS_FIRE) continue;
      const cx = laneX(obs.lane);
      const fy = obs.y;
      const fw = LANE_WIDTH * 0.6;

      // Fire base
      renderer.fillRect(cx - fw / 2, fy - 5, fw, 35, '#331100');

      // Animated flames
      const time = frameCount * 0.15;
      renderer.setGlow('#f40', 0.7);

      for (let i = 0; i < 5; i++) {
        const fx = cx - fw / 3 + (i * fw / 3.5);
        const fh = 20 + Math.sin(time + i * 1.5) * 8;
        const flameTop = fy + 25 - fh;

        // Outer flame (triangle approximation)
        const outerPts = [
          { x: fx - 8, y: fy + 25 },
          { x: fx, y: flameTop },
          { x: fx + 8, y: fy + 25 }
        ];
        renderer.fillPoly(outerPts, '#f40');

        // Inner flame (smaller triangle)
        const innerPts = [
          { x: fx - 4, y: fy + 25 },
          { x: fx, y: flameTop + fh * 0.3 },
          { x: fx + 4, y: fy + 25 }
        ];
        renderer.fillPoly(innerPts, '#fa0');
      }
      renderer.setGlow(null);

      // Label
      text.drawText('FIRE', cx, fy - 14, 9, '#f40', 'center');
    }

    // --- Draw player ---
    const jumpOff = getJumpOffset();
    let px = playerX;
    let py = PLAYER_Y + jumpOff;
    let pw = PLAYER_W;
    let ph = PLAYER_H;

    if (isSliding) {
      ph = PLAYER_H * 0.4;
      pw = PLAYER_W * 1.3;
      py = PLAYER_Y + PLAYER_H - ph;
    }

    // Shadow on ground when jumping
    if (isJumping) {
      const shadowScale = 1 + jumpOff / JUMP_HEIGHT * 0.3;
      renderer.fillRect(
        px - pw * shadowScale * 0.6,
        PLAYER_Y + PLAYER_H - 2,
        pw * shadowScale * 1.2,
        4,
        '#0000004d'
      );
    }

    // Player body
    renderer.setGlow('#d84', 0.7);

    // Torso
    renderer.fillRect(px - pw / 2, py, pw, ph, '#d84');
    // Inner detail - vest
    renderer.fillRect(px - pw / 2 + 4, py + 4, pw - 8, ph - 8, '#a62');

    // Head (only when not sliding)
    if (!isSliding) {
      renderer.fillCircle(px, py - 6, 8, '#d84');
      // Hat
      renderer.fillRect(px - 10, py - 14, 20, 4, '#863');
      renderer.fillRect(px - 6, py - 18, 12, 6, '#863');
    }
    renderer.setGlow(null);

    // Running legs animation
    if (game.state === 'playing' && !isSliding && !isJumping) {
      const legPhase = Math.sin(frameCount * 0.3);
      renderer.fillRect(px - 5 + legPhase * 4, py + ph, 4, 8, '#863');
      renderer.fillRect(px + 1 - legPhase * 4, py + ph, 4, 8, '#863');
    }

    // Jump trail effect
    if (isJumping) {
      const trailY = PLAYER_Y + PLAYER_H;
      for (let i = 0; i < 3; i++) {
        const alpha = Math.round((0.3 - i * 0.1) * 255).toString(16).padStart(2, '0');
        renderer.drawLine(
          px - 10 - i * 3, trailY + i * 4,
          px + 10 + i * 3, trailY + i * 4,
          '#dd8844' + alpha, 2
        );
      }
    }

    // Slide sparks
    if (isSliding) {
      for (let i = 0; i < 2; i++) {
        const sx = px + (Math.random() - 0.5) * pw;
        const sy = py + ph - 2;
        renderer.fillRect(sx, sy, 2, 2, '#ff0');
      }
    }

    // --- Draw particles ---
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 40);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // p.color is 4-char hex like '#d84' or '#ff0'; expand to rrggbb + alpha
      let hexBase;
      if (p.color.length === 4) {
        const r = p.color[1], g = p.color[2], b = p.color[3];
        hexBase = '#' + r + r + g + g + b + b;
      } else {
        hexBase = p.color;
      }
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, hexBase + a);
    }

    // Speed indicator
    if (game.state === 'playing') {
      text.drawText(`SPD ${Math.floor(scrollSpeed * 10)}`, CORRIDOR_LEFT, H - 14, 10, '#888', 'left');
    }
  };

  game.start();
  return game;
}
