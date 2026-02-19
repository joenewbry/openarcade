// geometry-dash/game.js — Geometry Dash game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Theme
const THEME = '#f2c';

// Physics
const GRAVITY = 0.65;
const JUMP_FORCE = -10.5;
const GROUND_Y = H - 60;
const PLAYER_SIZE = 30;
const BASE_SPEED = 4.5;
const MAX_SPEED = 8;

// Obstacle types
const OBS_SPIKE = 0;
const OBS_SPIKE_CEIL = 1;
const OBS_GAP = 2;
const OBS_PORTAL = 3;
const OBS_BLOCK = 4;
const OBS_SPIKE_DOUBLE = 5;
const OBS_PILLAR = 6;
const OBS_RAMP = 7;

// ── State ──
let player, obstacles, particles, bgStars, distance, speed, level;
let frameCount, pulsePhase;
let gravityDir;
let attemptCount;
let screenShake;
let score, best;
let deathAnimActive, deathFrames;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Seeded random ──
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateObstacles(levelNum) {
  const obs = [];
  const rng = seededRandom(levelNum * 7919 + 1013);
  const difficulty = Math.min(levelNum / 10, 1);

  let x = 500;
  const segmentCount = 40 + Math.floor(difficulty * 30);

  for (let i = 0; i < segmentCount; i++) {
    const r = rng();
    const spacing = 120 + rng() * 160 * (1 - difficulty * 0.4);
    x += spacing;

    if (r < 0.30) {
      obs.push({ type: OBS_SPIKE, x: x, w: 30, h: 30 });
    } else if (r < 0.45 && difficulty > 0.1) {
      obs.push({ type: OBS_SPIKE, x: x, w: 30, h: 30 });
      obs.push({ type: OBS_SPIKE, x: x + 35, w: 30, h: 30 });
    } else if (r < 0.55 && difficulty > 0.2) {
      obs.push({ type: OBS_SPIKE, x: x, w: 30, h: 30 });
      obs.push({ type: OBS_SPIKE, x: x + 35, w: 30, h: 30 });
      obs.push({ type: OBS_SPIKE, x: x + 70, w: 30, h: 30 });
    } else if (r < 0.65) {
      const bh = 30 + rng() * 40;
      obs.push({ type: OBS_BLOCK, x: x, w: 40 + rng() * 40, h: bh });
    } else if (r < 0.72 && difficulty > 0.15) {
      const bw = 50 + rng() * 30;
      obs.push({ type: OBS_BLOCK, x: x, w: bw, h: 35 });
      obs.push({ type: OBS_SPIKE, x: x + bw / 2 - 15, w: 30, h: 30, onBlock: 35 });
    } else if (r < 0.80 && difficulty > 0.3) {
      obs.push({ type: OBS_PILLAR, x: x, w: 30, gapY: 120 + rng() * 60, gapH: 100 - difficulty * 30 });
    } else if (r < 0.88 && difficulty > 0.2) {
      const gapW = 60 + rng() * 50 * (1 + difficulty);
      obs.push({ type: OBS_GAP, x: x, w: gapW });
    } else if (r < 0.93 && difficulty > 0.4) {
      obs.push({ type: OBS_PORTAL, x: x, w: 30, h: 60 });
    } else {
      obs.push({ type: OBS_RAMP, x: x, w: 60, h: 30 + rng() * 20 });
    }
  }

  const lastObs = obs[obs.length - 1];
  const totalDist = lastObs.x + (lastObs.w || 30) + 300;
  return { obstacles: obs, totalDist: totalDist };
}

function getTotalDist() {
  if (obstacles.length === 0) return 3000;
  const last = obstacles[obstacles.length - 1];
  return last.x + (last.w || 30) + 300;
}

function isOnGap(worldX) {
  for (const obs of obstacles) {
    if (obs.type === OBS_GAP) {
      if (worldX + PLAYER_SIZE > obs.x && worldX < obs.x + obs.w) {
        return true;
      }
    }
  }
  return false;
}

function jump() {
  player.vy = JUMP_FORCE * gravityDir;
  player.onGround = false;

  for (let i = 0; i < 5; i++) {
    particles.push({
      x: player.x + PLAYER_SIZE / 2,
      y: gravityDir === 1 ? player.y + PLAYER_SIZE : player.y,
      vx: (Math.random() - 0.5) * 3 - speed * 0.3,
      vy: gravityDir * (1 + Math.random() * 3),
      life: 0.5 + Math.random() * 0.3,
      color: THEME,
      size: 2 + Math.random() * 3
    });
  }
}

function spawnTrailParticle() {
  particles.push({
    x: player.x + PLAYER_SIZE * 0.3,
    y: player.y + PLAYER_SIZE / 2 + (Math.random() - 0.5) * PLAYER_SIZE * 0.6,
    vx: -speed * 0.5 + (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    life: 0.3 + Math.random() * 0.3,
    color: THEME,
    size: 2 + Math.random() * 2
  });
}

export function createGame() {
  const game = new Game('game');

  best = 0;
  level = 1;
  attemptCount = 0;
  deathAnimActive = false;
  deathFrames = 0;

  game.onInit = () => {
    player = {
      x: 100,
      y: GROUND_Y - PLAYER_SIZE,
      vy: 0,
      onGround: true,
      rotation: 0,
      dead: false
    };
    gravityDir = 1;
    distance = 0;
    speed = BASE_SPEED;
    frameCount = 0;
    pulsePhase = 0;
    screenShake = 0;
    score = 0;
    deathAnimActive = false;
    deathFrames = 0;
    scoreEl.textContent = '0';

    const levelData = generateObstacles(level);
    obstacles = levelData.obstacles;

    if (!bgStars) {
      bgStars = [];
      for (let i = 0; i < 60; i++) {
        bgStars.push({
          x: Math.random() * W,
          y: Math.random() * (H - 80),
          size: 1 + Math.random() * 2,
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }

    particles = [];

    if (attemptCount > 0) {
      game.showOverlay('GEOMETRY DASH', `Level ${level} \u2014 Attempt ${attemptCount + 1} \u2014 Press SPACE`);
    } else {
      game.showOverlay('GEOMETRY DASH', 'Press SPACE or UP to start');
    }
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Die ──
  function die() {
    player.dead = true;
    screenShake = 15;

    // Death explosion particles
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 / 30) * i;
      const spd = 2 + Math.random() * 5;
      particles.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.5 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? THEME : '#fff',
        size: 2 + Math.random() * 4
      });
    }

    deathAnimActive = true;
    deathFrames = 0;
    game.setState('over');
  }

  // ── Level complete ──
  function levelComplete() {
    score = 100;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    // Victory particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y + PLAYER_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 8 - 2,
        life: 1 + Math.random() * 0.5,
        color: ['#f2c', '#0ff', '#ff0', '#0f0', '#f80'][Math.floor(Math.random() * 5)],
        size: 3 + Math.random() * 4
      });
    }

    level++;
    attemptCount = 0;
    game.showOverlay('LEVEL COMPLETE!', `Level ${level - 1} cleared! Press SPACE for Level ${level}`);
    game.setState('over');
  }

  // ── Block collisions ──
  function checkBlockCollisions() {
    const px = player.x + distance;
    for (const obs of obstacles) {
      if (obs.type === OBS_BLOCK || obs.type === OBS_RAMP) {
        const bx = obs.x;
        const bw = obs.w;
        const bh = obs.h;
        const by = GROUND_Y - bh;

        if (px + PLAYER_SIZE > bx + 2 && px < bx + bw - 2) {
          if (gravityDir === 1) {
            if (player.vy >= 0 && player.y + PLAYER_SIZE > by && player.y + PLAYER_SIZE < by + bh * 0.6) {
              player.y = by - PLAYER_SIZE;
              player.vy = 0;
              player.onGround = true;
            } else if (player.y + PLAYER_SIZE > by + 4 && player.y < GROUND_Y) {
              die();
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // ── Obstacle collisions ──
  function checkObstacleCollisions() {
    const px = player.x + distance;
    const py = player.y;
    const ps = PLAYER_SIZE;
    const margin = 4;

    for (const obs of obstacles) {
      const ox = obs.x;

      switch (obs.type) {
        case OBS_SPIKE: {
          const tipY = obs.onBlock
            ? GROUND_Y - obs.onBlock - obs.h
            : GROUND_Y - obs.h;
          const baseY = tipY + obs.h;
          if (px + ps - margin > ox + margin && px + margin < ox + obs.w - margin &&
              py + ps - margin > tipY && py + margin < baseY) {
            die();
            return true;
          }
          break;
        }

        case OBS_PILLAR: {
          if (px + ps > ox + margin && px < ox + obs.w - margin) {
            const inGap = py > obs.gapY && py + ps < obs.gapY + obs.gapH;
            if (!inGap) {
              die();
              return true;
            }
          }
          break;
        }

        case OBS_PORTAL: {
          const portalY = GROUND_Y - obs.h - 10;
          if (px + ps > ox && px < ox + obs.w &&
              py + ps > portalY && py < portalY + obs.h) {
            gravityDir *= -1;
            obs.x = -9999;
            screenShake = 8;
            for (let i = 0; i < 15; i++) {
              particles.push({
                x: player.x + ps / 2,
                y: py + ps / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 0.7 + Math.random() * 0.5,
                color: '#0ff',
                size: 3 + Math.random() * 4
              });
            }
          }
          break;
        }
      }
    }
    return false;
  }

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // Death animation via frame counter
    if (deathAnimActive) {
      deathFrames++;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.03;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (screenShake > 0) screenShake *= 0.85;
      if (deathFrames >= 40) {
        deathAnimActive = false;
        game.showOverlay('GAME OVER', `${score}% \u2014 Level ${level} \u2014 Press SPACE to retry`);
      }
      return;
    }

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
        attemptCount++;
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
        game.onInit();
      }
      return;
    }

    // ── Playing ──
    frameCount++;
    pulsePhase += 0.05;

    // Speed increases over distance
    const progress = distance / getTotalDist();
    speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(progress, 1) * 0.5;

    // Scroll world
    distance += speed;

    // Update score (percentage of level completed)
    const pct = Math.min(100, Math.floor((distance / getTotalDist()) * 100));
    if (pct > score) {
      score = pct;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }

    // Check if level completed
    if (distance >= getTotalDist()) {
      levelComplete();
      return;
    }

    // Player gravity
    const grav = GRAVITY * gravityDir;
    player.vy += grav;
    player.y += player.vy;

    // Ground collision (considering gaps)
    const onGap = isOnGap(player.x + distance);

    if (gravityDir === 1) {
      if (!onGap && player.y >= GROUND_Y - PLAYER_SIZE) {
        player.y = GROUND_Y - PLAYER_SIZE;
        player.vy = 0;
        player.onGround = true;
      } else if (player.y <= 10) {
        player.y = 10;
        player.vy = 0;
      } else {
        player.onGround = false;
      }
    } else {
      if (!onGap && player.y <= 40) {
        player.y = 40;
        player.vy = 0;
        player.onGround = true;
      } else if (player.y >= H - 60 - PLAYER_SIZE) {
        player.y = H - 60 - PLAYER_SIZE;
        player.vy = 0;
      } else {
        player.onGround = false;
      }
    }

    // Check block collisions
    if (checkBlockCollisions()) return;

    // Fall into gap = death
    if (onGap && ((gravityDir === 1 && player.y >= GROUND_Y - PLAYER_SIZE) ||
                   (gravityDir === -1 && player.y <= 40))) {
      die();
      return;
    }

    // Off screen = death
    if (player.y > H + 50 || player.y < -50) {
      die();
      return;
    }

    // Rotation (spinning while in air)
    if (!player.onGround) {
      player.rotation += 5 * gravityDir * (Math.PI / 180) * (speed / BASE_SPEED) * 2;
    } else {
      const target = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
      player.rotation += (target - player.rotation) * 0.3;
    }

    // Jump input (held key)
    if ((input.isDown(' ') || input.isDown('ArrowUp') || input.isDown('w') || input.isDown('W')) && player.onGround) {
      jump();
    }

    // Obstacle collision
    if (checkObstacleCollisions()) return;

    // Trail particles
    if (frameCount % 2 === 0) {
      spawnTrailParticle();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Screen shake decay
    if (screenShake > 0) {
      screenShake *= 0.9;
      if (screenShake < 0.5) screenShake = 0;
    }
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
      shakeX = (Math.random() - 0.5) * screenShake;
      shakeY = (Math.random() - 0.5) * screenShake;
    }

    // Pulsing background stripes (subtle)
    const pulse = Math.sin(pulsePhase || 0) * 0.5 + 0.5;
    const stripeAlpha = Math.floor((0.03 + pulse * 0.02) * 255).toString(16).padStart(2, '0');
    for (let i = 0; i < W; i += 80) {
      const sx = (i - ((distance || 0) * 0.5) % 80) + shakeX;
      renderer.fillRect(sx, 0 + shakeY, 2, H, '#ff22cc' + stripeAlpha);
    }

    // Background stars
    if (bgStars) {
      for (const star of bgStars) {
        const twinkle = Math.sin((pulsePhase || 0) * 2 + star.twinkle) * 0.3 + 0.7;
        const a = Math.floor(0.2 * twinkle * 255).toString(16).padStart(2, '0');
        renderer.fillRect(star.x + shakeX, star.y + shakeY, star.size, star.size, '#ffffff' + a);
      }
    }

    // Scrolling background grid
    const gridOff = -(((distance || 0) * 0.3) % 60);
    for (let x = gridOff; x < W; x += 60) {
      renderer.drawLine(x + shakeX, 0 + shakeY, x + shakeX, H + shakeY, '#16213e', 1);
    }
    for (let y = 0; y < H; y += 60) {
      renderer.drawLine(0 + shakeX, y + shakeY, W + shakeX, y + shakeY, '#16213e', 1);
    }

    // Ground
    drawGround(renderer, shakeX, shakeY);

    // Obstacles
    drawObstacles(renderer, text, shakeX, shakeY);

    // Particles (behind player)
    drawParticles(renderer, shakeX, shakeY);

    // Player
    if (player && !player.dead) {
      drawPlayer(renderer, shakeX, shakeY);
    }

    // Progress bar at top
    drawProgressBar(renderer, text, shakeX, shakeY);

    // Gravity indicator
    if (gravityDir === -1) {
      text.drawText('GRAVITY FLIPPED', 10 + shakeX, 10 + shakeY, 12, '#0ff', 'left');
    }
  };

  // ── Draw helpers ──

  function drawGround(renderer, sx, sy) {
    // Ground lines
    renderer.fillRect(0 + sx, GROUND_Y + sy, W, 2, '#0f3460');
    renderer.fillRect(0 + sx, 38 + sy, W, 2, '#0f3460');

    // Ground surface with gaps
    const groundTop = GROUND_Y + 2;
    let drawX = 0;
    const sortedGaps = (obstacles || []).filter(o => o.type === OBS_GAP).sort((a, b) => a.x - b.x);
    for (const gap of sortedGaps) {
      const gapScreenX = gap.x - (distance || 0);
      const gapEndX = gapScreenX + gap.w;
      if (gapEndX > 0 && gapScreenX < W) {
        if (gapScreenX > drawX) {
          renderer.fillRect(drawX + sx, groundTop + sy, gapScreenX - drawX, H - groundTop, '#16213e');
        }
        drawX = Math.max(drawX, gapEndX);
      }
    }
    if (drawX < W) {
      renderer.fillRect(drawX + sx, groundTop + sy, W - drawX, H - groundTop, '#16213e');
    }

    // Neon ground line with glow
    const glowAlpha = 0.3 + Math.sin((pulsePhase || 0) * 2) * 0.1;
    const a = Math.floor(glowAlpha * 255).toString(16).padStart(2, '0');
    renderer.setGlow(THEME, 0.5);
    renderer.fillRect(0 + sx, GROUND_Y - 1 + sy, W, 2, '#ff22cc' + a);
    renderer.setGlow(null);
  }

  function drawObstacles(renderer, text, sx, sy) {
    if (!obstacles) return;

    for (const obs of obstacles) {
      const screenX = obs.x - (distance || 0) + sx;
      if (screenX > W + 50 || screenX + (obs.w || 30) < -50) continue;

      switch (obs.type) {
        case OBS_SPIKE: {
          const baseY = obs.onBlock
            ? GROUND_Y - obs.onBlock
            : GROUND_Y;
          drawSpike(renderer, screenX, baseY + sy, obs.w, obs.h);
          break;
        }

        case OBS_BLOCK: {
          const by = GROUND_Y - obs.h;
          renderer.fillRect(screenX, by + sy, obs.w, obs.h, '#16213e');
          // Border edges
          renderer.drawLine(screenX, by + sy, screenX + obs.w, by + sy, '#0f3460', 2);
          renderer.drawLine(screenX, by + sy, screenX, by + obs.h + sy, '#0f3460', 2);
          renderer.drawLine(screenX + obs.w, by + sy, screenX + obs.w, by + obs.h + sy, '#0f3460', 2);
          renderer.drawLine(screenX, by + obs.h + sy, screenX + obs.w, by + obs.h + sy, '#0f3460', 2);
          // Top edge glow
          renderer.setGlow(THEME, 0.4);
          renderer.fillRect(screenX, by + sy, obs.w, 2, '#ff22cc66');
          renderer.setGlow(null);
          break;
        }

        case OBS_RAMP: {
          const by = GROUND_Y - obs.h;
          const pts = [
            { x: screenX, y: GROUND_Y + sy },
            { x: screenX + obs.w, y: GROUND_Y + sy },
            { x: screenX + obs.w, y: by + sy }
          ];
          renderer.fillPoly(pts, '#16213e');
          renderer.strokePoly(pts, '#0f3460', 2, true);
          // Edge glow
          renderer.setGlow(THEME, 0.4);
          renderer.drawLine(screenX, GROUND_Y + sy, screenX + obs.w, by + sy, '#ff22cc66', 2);
          renderer.setGlow(null);
          break;
        }

        case OBS_GAP: {
          const leftX = screenX;
          const rightX = screenX + obs.w;
          const gapPulse = 0.5 + Math.sin((pulsePhase || 0) * 3) * 0.2;
          const ga = Math.floor(gapPulse * 255).toString(16).padStart(2, '0');
          renderer.setGlow('#f44', 0.4);
          for (let i = 0; i < 3; i++) {
            renderer.fillRect(leftX - 4, GROUND_Y + 4 + i * 8 + sy, 4, 4, '#ff4444' + ga);
            renderer.fillRect(rightX, GROUND_Y + 4 + i * 8 + sy, 4, 4, '#ff4444' + ga);
          }
          renderer.setGlow(null);
          break;
        }

        case OBS_PORTAL: {
          const py = GROUND_Y - obs.h - 10;
          drawPortal(renderer, text, screenX, py + sy, obs.w, obs.h);
          break;
        }

        case OBS_PILLAR: {
          // Top portion
          renderer.fillRect(screenX, 40 + sy, obs.w, obs.gapY - 40, '#16213e');
          renderer.drawLine(screenX, 40 + sy, screenX + obs.w, 40 + sy, '#0f3460', 2);
          renderer.drawLine(screenX, 40 + sy, screenX, obs.gapY + sy, '#0f3460', 2);
          renderer.drawLine(screenX + obs.w, 40 + sy, screenX + obs.w, obs.gapY + sy, '#0f3460', 2);
          renderer.drawLine(screenX, obs.gapY + sy, screenX + obs.w, obs.gapY + sy, '#0f3460', 2);

          // Bottom portion
          renderer.fillRect(screenX, obs.gapY + obs.gapH + sy, obs.w, GROUND_Y - obs.gapY - obs.gapH, '#16213e');
          renderer.drawLine(screenX, obs.gapY + obs.gapH + sy, screenX + obs.w, obs.gapY + obs.gapH + sy, '#0f3460', 2);
          renderer.drawLine(screenX, obs.gapY + obs.gapH + sy, screenX, GROUND_Y + sy, '#0f3460', 2);
          renderer.drawLine(screenX + obs.w, obs.gapY + obs.gapH + sy, screenX + obs.w, GROUND_Y + sy, '#0f3460', 2);

          // Gap edges glow
          renderer.setGlow('#0ff', 0.5);
          renderer.fillRect(screenX, obs.gapY - 1 + sy, obs.w, 2, '#00ffff80');
          renderer.fillRect(screenX, obs.gapY + obs.gapH - 1 + sy, obs.w, 2, '#00ffff80');
          renderer.setGlow(null);
          break;
        }
      }
    }
  }

  function drawSpike(renderer, x, baseY, w, h) {
    const pts = [
      { x: x, y: baseY },
      { x: x + w / 2, y: baseY - h },
      { x: x + w, y: baseY }
    ];
    renderer.setGlow('#f44', 0.6);
    renderer.fillPoly(pts, '#f44');
    renderer.setGlow(null);

    // Inner highlight
    const inner = [
      { x: x + w * 0.25, y: baseY },
      { x: x + w / 2, y: baseY - h * 0.6 },
      { x: x + w * 0.75, y: baseY }
    ];
    renderer.fillPoly(inner, '#ff888866');
  }

  function drawPortal(renderer, text, x, y, w, h) {
    const pulse = Math.sin((pulsePhase || 0) * 3) * 0.3 + 0.7;

    const cx = x + w / 2;
    const cy = y + h / 2;

    // Diamond shape (filled)
    const diamond = [
      { x: cx, y: y },
      { x: x + w, y: cy },
      { x: cx, y: y + h },
      { x: x, y: cy }
    ];

    const fillAlpha = Math.floor((0.1 + pulse * 0.15) * 255).toString(16).padStart(2, '0');
    renderer.fillPoly(diamond, '#00ffff' + fillAlpha);

    // Diamond outline
    renderer.setGlow('#0ff', pulse * 0.8);
    renderer.strokePoly(diamond, '#0ff', 3, true);
    renderer.setGlow(null);

    // Center dot
    renderer.fillCircle(cx, cy, 3, '#fff');

    // Arrow indicating gravity flip
    text.drawText(gravityDir === 1 ? '\u2191' : '\u2193', cx, y - 16, 16, '#0ff', 'center');
  }

  function drawPlayer(renderer, sx, sy) {
    if (!player) return;

    const cx = player.x + PLAYER_SIZE / 2 + sx;
    const cy = player.y + PLAYER_SIZE / 2 + sy;
    const half = PLAYER_SIZE / 2;
    const rot = player.rotation;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    // Transform corners around center
    function rotPt(lx, ly) {
      return {
        x: cx + lx * cosR - ly * sinR,
        y: cy + lx * sinR + ly * cosR
      };
    }

    // Outer cube
    const outer = [
      rotPt(-half, -half),
      rotPt(half, -half),
      rotPt(half, half),
      rotPt(-half, half)
    ];

    renderer.setGlow(THEME, 0.7 + Math.sin((pulsePhase || 0) * 2) * 0.2);
    renderer.fillPoly(outer, THEME);

    // Inner square (darker)
    const m = 6;
    const inner = [
      rotPt(-half + m, -half + m),
      rotPt(half - m, -half + m),
      rotPt(half - m, half - m),
      rotPt(-half + m, half - m)
    ];
    renderer.setGlow(null);
    renderer.fillPoly(inner, '#1a1a2e');

    // Inner diamond
    const d = 5;
    const diamond = [
      rotPt(0, -d),
      rotPt(d, 0),
      rotPt(0, d),
      rotPt(-d, 0)
    ];
    renderer.fillPoly(diamond, THEME);

    // Border
    renderer.strokePoly(outer, '#ffffff80', 1.5, true);
  }

  function drawParticles(renderer, sx, sy) {
    if (!particles) return;
    for (const p of particles) {
      const a = Math.max(0, Math.min(1, p.life));
      const aHex = Math.floor(a * 255).toString(16).padStart(2, '0');

      // Parse short color to get base hex
      let baseHex;
      if (p.color === '#f2c') baseHex = 'ff22cc';
      else if (p.color === '#0ff') baseHex = '00ffff';
      else if (p.color === '#fff') baseHex = 'ffffff';
      else if (p.color === '#ff0') baseHex = 'ffff00';
      else if (p.color === '#0f0') baseHex = '00ff00';
      else if (p.color === '#f80') baseHex = 'ff8800';
      else baseHex = 'ffffff';

      renderer.setGlow('#' + baseHex, 0.4);
      renderer.fillRect(p.x - p.size / 2 + sx, p.y - p.size / 2 + sy, p.size, p.size, '#' + baseHex + aHex);
    }
    renderer.setGlow(null);
  }

  function drawProgressBar(renderer, text, sx, sy) {
    const barWidth = W - 40;
    const barHeight = 6;
    const barX = 20;
    const barY = H - 20;
    const prog = Math.min(1, (distance || 0) / getTotalDist());

    // Background
    renderer.fillRect(barX + sx, barY + sy, barWidth, barHeight, '#0f3460');

    // Fill - use theme color with glow
    renderer.setGlow(THEME, 0.5);
    renderer.fillRect(barX + sx, barY + sy, barWidth * prog, barHeight, THEME);
    renderer.setGlow(null);

    // Percentage text
    text.drawText(`${score || 0}%`, barX + barWidth + sx, barY - 6 + sy, 11, '#e0e0e0', 'right');

    // Level indicator
    text.drawText(`Level ${level}`, barX + sx, barY - 6 + sy, 11, '#e0e0e0', 'left');
  }

  game.start();
  return game;
}
