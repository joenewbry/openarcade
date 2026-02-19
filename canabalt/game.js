// canabalt/game.js — Canabalt game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 350;

// Theme
const THEME = '#0af';
const THEME_DIM = '#068';

// Physics
const GRAVITY = 0.6;
const JUMP_FORCE = -11;
const INITIAL_SPEED = 4;
const MAX_SPEED = 12;
const ACCELERATION = 0.003;

// Building generation
const MIN_BUILDING_W = 120;
const MAX_BUILDING_W = 300;
const MIN_GAP = 40;
const MAX_GAP = 120;
const MIN_BUILDING_H = 80;
const MAX_BUILDING_H = 180;

// Player
const PLAYER_W = 14;
const PLAYER_H = 28;
const PLAYER_X = 120;

// Obstacle types
const OBSTACLE_TYPES = ['box', 'antenna'];

// ── State ──
let score, best = 0;
let player, buildings, obstacles, speed, distance, frameCount;
let shakeTimer, shakeIntensity;
let jumpPressed;
let particles;
let farBuildings, midBuildings;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Parallax generation ──
function generateParallax() {
  farBuildings = [];
  midBuildings = [];
  for (let x = 0; x < W + 200; x += 40 + Math.random() * 60) {
    const h = 40 + Math.random() * 80;
    farBuildings.push({ x, w: 30 + Math.random() * 50, h });
  }
  for (let x = 0; x < W + 200; x += 50 + Math.random() * 70) {
    const h = 60 + Math.random() * 100;
    midBuildings.push({ x, w: 40 + Math.random() * 60, h });
  }
}

function createBuilding(x) {
  const w = MIN_BUILDING_W + Math.random() * (MAX_BUILDING_W - MIN_BUILDING_W);
  const h = MIN_BUILDING_H + Math.random() * (MAX_BUILDING_H - MIN_BUILDING_H);
  const topY = H - h;
  return { x, w, h, topY };
}

function createObstacle(buildingX, buildingW, buildingTopY) {
  if (Math.random() > 0.4) return null;
  const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  const margin = 40;
  const ox = buildingX + margin + Math.random() * (buildingW - margin * 2);
  if (type === 'box') {
    return { type, x: ox, y: buildingTopY - 16, w: 18, h: 16 };
  } else {
    return { type, x: ox, y: buildingTopY - 40, w: 6, h: 40 };
  }
}

function jump() {
  if (player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: player.x + PLAYER_W / 2,
        y: player.y + PLAYER_H,
        vx: -speed * 0.5 + (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 20 + Math.random() * 10,
        maxLife: 30
      });
    }
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    distance = 0;
    speed = INITIAL_SPEED;
    frameCount = 0;
    shakeTimer = 0;
    shakeIntensity = 0;
    jumpPressed = false;
    particles = [];
    scoreEl.textContent = '0';

    generateParallax();

    // Create initial buildings
    buildings = [];
    obstacles = [];
    let bx = 0;
    while (bx < W + 400) {
      const b = createBuilding(bx);
      if (buildings.length === 0) {
        b.topY = H - 140;
        b.h = 140;
        b.w = 250;
      }
      buildings.push(b);
      if (buildings.length > 1) {
        const obs = createObstacle(b.x, b.w, b.topY);
        if (obs) obstacles.push(obs);
      }
      bx = b.x + b.w + MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    }

    player = {
      x: PLAYER_X,
      y: buildings[0].topY - PLAYER_H,
      vy: 0,
      onGround: true,
      runFrame: 0
    };

    game.showOverlay('CANABALT', 'Press SPACE or UP to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // State transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Jump input
    if ((input.wasPressed(' ') || input.wasPressed('ArrowUp'))) {
      jump();
    }

    // Increase speed over time
    speed = Math.min(MAX_SPEED, speed + ACCELERATION);

    // Distance / score
    distance += speed;
    score = Math.floor(distance / 10);
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;
    player.onGround = false;

    // Run animation
    if (frameCount % 4 === 0) {
      player.runFrame = (player.runFrame + 1) % 4;
    }

    // Move buildings
    for (let i = buildings.length - 1; i >= 0; i--) {
      buildings[i].x -= speed;
      if (buildings[i].x + buildings[i].w < -50) {
        buildings.splice(i, 1);
      }
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed;
      if (obstacles[i].x < -50) {
        obstacles.splice(i, 1);
      }
    }

    // Generate new buildings at the right
    const lastB = buildings[buildings.length - 1];
    if (lastB && lastB.x + lastB.w < W + 200) {
      const gapScale = Math.min(1, (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED));
      const gap = MIN_GAP + gapScale * (MAX_GAP - MIN_GAP) * 0.6 + Math.random() * (MAX_GAP - MIN_GAP) * 0.4;
      const nx = lastB.x + lastB.w + gap;
      const nb = createBuilding(nx);
      const lastTop = lastB.topY;
      const heightVariation = 60;
      nb.topY = Math.max(H - MAX_BUILDING_H, Math.min(H - MIN_BUILDING_H,
        lastTop + (Math.random() - 0.5) * heightVariation * 2));
      nb.h = H - nb.topY;
      buildings.push(nb);
      const obs = createObstacle(nb.x, nb.w, nb.topY);
      if (obs) obstacles.push(obs);
    }

    // Collision with buildings (landing)
    for (const b of buildings) {
      if (player.x + PLAYER_W > b.x && player.x < b.x + b.w) {
        if (player.vy >= 0 && player.y + PLAYER_H >= b.topY && player.y + PLAYER_H <= b.topY + player.vy + 10) {
          const landingVy = player.vy;
          player.y = b.topY - PLAYER_H;
          player.vy = 0;
          player.onGround = true;

          if (landingVy > 2) {
            for (let i = 0; i < 3; i++) {
              particles.push({
                x: player.x + Math.random() * PLAYER_W,
                y: b.topY,
                vx: (Math.random() - 0.5) * 3 - speed * 0.3,
                vy: -Math.random() * 2,
                life: 15 + Math.random() * 10,
                maxLife: 25
              });
            }
          }
        }
      }
    }

    // Collision with obstacles
    for (const obs of obstacles) {
      const px = player.x, py = player.y;
      if (px + PLAYER_W > obs.x && px < obs.x + obs.w &&
          py + PLAYER_H > obs.y && py < obs.y + obs.h) {
        speed = Math.max(INITIAL_SPEED, speed * 0.6);
        shakeTimer = 10;
        shakeIntensity = 4;
        const obsCenter = { x: obs.x + obs.w / 2, y: obs.y + obs.h / 2 };
        for (let i = 0; i < 8; i++) {
          particles.push({
            x: obsCenter.x,
            y: obsCenter.y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 5,
            life: 20 + Math.random() * 10,
            maxLife: 30
          });
        }
        obs.x = -1000;
      }
    }

    // Fall off screen = game over
    if (player.y > H + 50) {
      game.showOverlay('GAME OVER', score + 'm -- Press any key to restart');
      game.setState('over');
      return;
    }

    // Update shake
    if (shakeTimer > 0) shakeTimer--;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Move parallax
    for (const fb of farBuildings) {
      fb.x -= speed * 0.15;
      if (fb.x + fb.w < 0) fb.x += W + fb.w + 100;
    }
    for (const mb of midBuildings) {
      mb.x -= speed * 0.4;
      if (mb.x + mb.w < 0) mb.x += W + mb.w + 100;
    }
  };

  game.onDraw = (renderer, text) => {
    // Screen shake offset
    let sx = 0, sy = 0;
    if (shakeTimer > 0) {
      sx = (Math.random() - 0.5) * shakeIntensity;
      sy = (Math.random() - 0.5) * shakeIntensity;
    }

    // Sky background layers
    renderer.fillRect(0, 0, W, H * 0.4, '#050510');
    renderer.fillRect(0, H * 0.4, W, H * 0.2, '#0a0a20');
    renderer.fillRect(0, H * 0.6, W, H * 0.4, '#141430');

    // Stars
    for (let i = 0; i < 30; i++) {
      const starX = (i * 191 + 37) % W;
      const starY = (i * 127 + 53) % (H * 0.5);
      renderer.fillRect(starX + sx, starY + sy, 1.5, 1.5, 'rgba(255,255,255,0.15)');
    }

    // Far buildings (parallax layer 1)
    for (let bi = 0; bi < farBuildings.length; bi++) {
      const fb = farBuildings[bi];
      renderer.fillRect(fb.x + sx, H - fb.h + sy, fb.w, fb.h, '#0a0a18');
      // Dim windows
      let wIdx = 0;
      for (let wy = H - fb.h + 8; wy < H - 4; wy += 12) {
        for (let wx = fb.x + 5; wx < fb.x + fb.w - 5; wx += 10) {
          if (((wIdx * 7 + bi * 13) % 5) > 1) {
            renderer.fillRect(wx + sx, wy + sy, 4, 4, 'rgba(0, 170, 255, 0.06)');
          }
          wIdx++;
        }
      }
    }

    // Mid buildings (parallax layer 2)
    for (let bi = 0; bi < midBuildings.length; bi++) {
      const mb = midBuildings[bi];
      renderer.fillRect(mb.x + sx, H - mb.h + sy, mb.w, mb.h, '#0e0e22');
      // Slightly brighter windows
      let wIdx = 0;
      for (let wy = H - mb.h + 8; wy < H - 4; wy += 14) {
        for (let wx = mb.x + 6; wx < mb.x + mb.w - 6; wx += 12) {
          if (((wIdx * 11 + bi * 7) % 4) > 0) {
            renderer.fillRect(wx + sx, wy + sy, 5, 5, 'rgba(0, 170, 255, 0.1)');
          }
          wIdx++;
        }
      }
    }

    // Near buildings (gameplay layer)
    for (const b of buildings) {
      // Building body — use two-tone to approximate gradient
      renderer.fillRect(b.x + sx, b.topY + sy, b.w, b.h * 0.5, '#1a1a35');
      renderer.fillRect(b.x + sx, b.topY + b.h * 0.5 + sy, b.w, b.h * 0.5, '#12122a');

      // Building top edge (neon line with glow)
      renderer.setGlow(THEME, 0.5);
      renderer.drawLine(b.x + sx, b.topY + sy, b.x + b.w + sx, b.topY + sy, THEME, 2);
      renderer.setGlow(null);

      // Building side edges
      renderer.drawLine(b.x + sx, b.topY + sy, b.x + sx, H + sy, THEME_DIM, 1);
      renderer.drawLine(b.x + b.w + sx, b.topY + sy, b.x + b.w + sx, H + sy, THEME_DIM, 1);

      // Windows
      const wSize = 6;
      const wGap = 14;
      for (let wy = b.topY + 12; wy < H - 10; wy += wGap) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += wGap) {
          const col = Math.floor((wx - b.x) / wGap);
          const row = Math.floor((wy - b.topY) / wGap);
          const isOn = ((col * 7 + row * 13 + Math.floor(b.x) * 3) % 5) > 1;
          if (isOn) {
            renderer.fillRect(wx + sx, wy + sy, wSize, wSize, 'rgba(0, 170, 255, 0.2)');
          } else {
            renderer.fillRect(wx + sx, wy + sy, wSize, wSize, 'rgba(0, 170, 255, 0.04)');
          }
        }
      }
    }

    // Obstacles
    for (const obs of obstacles) {
      if (obs.x < -100) continue;
      if (obs.type === 'box') {
        renderer.fillRect(obs.x + sx, obs.y + sy, obs.w, obs.h, '#2a2a4a');
        // Box outline
        renderer.drawLine(obs.x + sx, obs.y + sy, obs.x + obs.w + sx, obs.y + sy, THEME_DIM, 1);
        renderer.drawLine(obs.x + obs.w + sx, obs.y + sy, obs.x + obs.w + sx, obs.y + obs.h + sy, THEME_DIM, 1);
        renderer.drawLine(obs.x + obs.w + sx, obs.y + obs.h + sy, obs.x + sx, obs.y + obs.h + sy, THEME_DIM, 1);
        renderer.drawLine(obs.x + sx, obs.y + obs.h + sy, obs.x + sx, obs.y + sy, THEME_DIM, 1);
        // X mark
        renderer.drawLine(obs.x + 3 + sx, obs.y + 3 + sy, obs.x + obs.w - 3 + sx, obs.y + obs.h - 3 + sy, 'rgba(0, 170, 255, 0.3)', 1);
        renderer.drawLine(obs.x + obs.w - 3 + sx, obs.y + 3 + sy, obs.x + 3 + sx, obs.y + obs.h - 3 + sy, 'rgba(0, 170, 255, 0.3)', 1);
      } else {
        // Antenna pole
        const cx = obs.x + obs.w / 2;
        renderer.drawLine(cx + sx, obs.y + sy, cx + sx, obs.y + obs.h + sy, '#555', 2);
        // Blinking light at top
        const blink = Math.sin(frameCount * 0.15) > 0;
        if (blink) {
          renderer.setGlow('#f44', 0.6);
          renderer.fillCircle(cx + sx, obs.y + sy, 3, '#f44');
          renderer.setGlow(null);
        } else {
          renderer.fillCircle(cx + sx, obs.y + sy, 3, '#622');
        }
      }
    }

    // Particles
    if (particles) {
      for (const p of particles) {
        const alpha = p.life / p.maxLife;
        renderer.fillRect(p.x + sx, p.y + sy, 3, 3, `rgba(0, 170, 255, ${(alpha * 0.8).toFixed(2)})`);
      }
    }

    // Player (running stick figure)
    drawPlayer(renderer, sx, sy);

    // Distance indicator line at bottom
    renderer.fillRect(0 + sx, H - 2 + sy, W, 2, 'rgba(0, 170, 255, 0.1)');

    // Speed indicator bar
    if (game.state === 'playing') {
      const speedPercent = (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
      renderer.fillRect(0 + sx, H - 4 + sy, W * speedPercent, 4, 'rgba(0, 170, 255, 0.15)');
    }
  };

  function drawPlayer(renderer, sx, sy) {
    if (!player) return;
    const px = player.x + sx;
    const py = player.y + sy;
    const frame = player.runFrame;
    const onGround = player.onGround;
    const cx = px + PLAYER_W / 2;

    renderer.setGlow(THEME, 0.7);

    // Head
    renderer.fillCircle(cx, py + 5, 5, THEME);

    // Torso
    renderer.drawLine(cx, py + 10, cx, py + 20, THEME, 3);

    if (onGround) {
      // Running legs animation
      const legAngle1 = Math.sin(frame * Math.PI / 2) * 6;
      const legAngle2 = -legAngle1;

      // Left leg
      renderer.drawLine(cx, py + 20, cx + legAngle1, py + PLAYER_H, THEME, 3);
      // Right leg
      renderer.drawLine(cx, py + 20, cx + legAngle2, py + PLAYER_H, THEME, 3);

      // Arms pumping
      renderer.drawLine(cx, py + 13, cx - legAngle1 * 0.8, py + 18, THEME, 3);
      renderer.drawLine(cx, py + 13, cx + legAngle1 * 0.8, py + 18, THEME, 3);
    } else {
      if (player.vy < 0) {
        // Jumping up - legs tucked
        renderer.drawLine(cx, py + 20, cx - 4, py + PLAYER_H - 2, THEME, 3);
        renderer.drawLine(cx, py + 20, cx + 4, py + PLAYER_H - 2, THEME, 3);
      } else {
        // Falling - legs spread
        renderer.drawLine(cx, py + 20, cx - 5, py + PLAYER_H, THEME, 3);
        renderer.drawLine(cx, py + 20, cx + 6, py + PLAYER_H, THEME, 3);
      }

      // Arms out
      renderer.drawLine(cx, py + 13, cx - 8, py + 10, THEME, 3);
      renderer.drawLine(cx, py + 13, cx + 6, py + 16, THEME, 3);
    }

    renderer.setGlow(null);
  }

  game.start();
  return game;
}
