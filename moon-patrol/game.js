// moon-patrol/game.js — Moon Patrol game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Theme
const THEME = '#48e';
const THEME_DIM = '#246';

// Ground
const GROUND_Y = 320;

// Buggy
const BUGGY_X = 100; // fixed screen x
const BUGGY_W = 40;
const BUGGY_H = 20;
const WHEEL_R = 8;
const JUMP_VEL = -8;
const GRAVITY = 0.35;

// Scroll
const BASE_SCROLL = 2.5;
const MAX_SCROLL = 5.5;

// Checkpoints
const CHECKPOINT_DIST = 800;

// Helper: expand 3-char hex to 6-char (e.g. '#48e' -> '#4488ee')
function expandHex(c) {
  if (c.length === 4) return '#' + c[1]+c[1] + c[2]+c[2] + c[3]+c[3];
  return c;
}

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

// ── State ──
let score, best = 0, lives;
let buggy, scrollX, scrollSpeed, frameCount;
let craters, rocks, mines, ufos, bombs;
let bulletsF, bulletsU, particles;
let checkpoint, checkpointLetter;
let fireCooldownF, fireCooldownU;
let lastSpawnX;
let difficulty;

// Parallax mountains
let mountains = [];
function generateMountains() {
  mountains = [];
  let x = 0;
  while (x < 1800) {
    const w = 60 + Math.random() * 120;
    const h = 30 + Math.random() * 60;
    mountains.push({ x, w, h });
    x += w * 0.6 + Math.random() * 40;
  }
}

// Stars
let stars = [];
function generateStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (GROUND_Y - 40),
      size: Math.random() < 0.3 ? 2 : 1,
      twinkle: Math.random() * Math.PI * 2
    });
  }
}

// Terrain generation
function generateTerrain(startX, endX) {
  craters = craters.filter(c => c.x + c.w > scrollX - 100);
  rocks = rocks.filter(r => r.x > scrollX - 100);
  mines = mines.filter(m => m.x > scrollX - 100);

  const segStart = Math.max(startX, lastSpawnX);
  let x = segStart;
  while (x < endX) {
    const roll = Math.random();
    if (roll < 0.15 * difficulty) {
      const w = 30 + Math.random() * 40;
      craters.push({ x, w, depth: 15 + Math.random() * 15 });
      x += w + 40 + Math.random() * 60;
    } else if (roll < 0.25 * difficulty) {
      const h = 12 + Math.random() * 14;
      rocks.push({ x, w: 16 + Math.random() * 10, h, hit: false });
      x += 60 + Math.random() * 80;
    } else if (roll < 0.32 * difficulty) {
      mines.push({ x, timer: 0, active: true });
      x += 80 + Math.random() * 100;
    } else {
      x += 40 + Math.random() * 60;
    }
  }
  lastSpawnX = x;
}

function spawnUFO() {
  if (Math.random() < 0.012 * difficulty && ufos.length < 2 + Math.floor(difficulty)) {
    const ufoX = scrollX + W + 20;
    const ufoY = 40 + Math.random() * 80;
    const speed = 1.5 + Math.random() * 1.5 * difficulty;
    ufos.push({
      x: ufoX, y: ufoY,
      vx: -speed,
      vy: Math.sin(Math.random() * Math.PI) * 0.5,
      bombTimer: 60 + Math.floor(Math.random() * 80),
      alive: true
    });
  }
}

function addParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 15 + Math.random() * 15,
      color
    });
  }
}

function getGroundAt(wx) {
  for (const c of craters) {
    if (wx > c.x && wx < c.x + c.w) {
      return GROUND_Y + c.depth;
    }
  }
  return GROUND_Y;
}

let killTimer = 0;
let killAction = null;

function killBuggy(game) {
  if (!buggy.alive) return;
  buggy.alive = false;
  addParticles(BUGGY_X + BUGGY_W / 2, buggy.y - BUGGY_H / 2, 20, THEME);
  addParticles(BUGGY_X + BUGGY_W / 2, buggy.y - BUGGY_H / 2, 10, '#fff');
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    killTimer = 36; // ~600ms at 60fps
    killAction = 'gameover';
  } else {
    killTimer = 48; // ~800ms at 60fps
    killAction = 'respawn';
  }
}

function respawn() {
  buggy.y = GROUND_Y;
  buggy.vy = 0;
  buggy.grounded = true;
  buggy.alive = true;
  buggy.suspF = 0;
  buggy.suspR = 0;
  const bx = scrollX + BUGGY_X;
  craters = craters.filter(c => Math.abs(c.x + c.w / 2 - bx) > 80);
  rocks = rocks.filter(r => Math.abs(r.x - bx) > 80);
  mines = mines.filter(m => Math.abs(m.x - bx) > 80);
  bombs = [];
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    scrollX = 0;
    scrollSpeed = BASE_SCROLL;
    frameCount = 0;
    difficulty = 1;
    buggy = { y: GROUND_Y, vy: 0, grounded: true, alive: true, wheelPhase: 0, suspF: 0, suspR: 0 };
    craters = [];
    rocks = [];
    mines = [];
    ufos = [];
    bombs = [];
    bulletsF = [];
    bulletsU = [];
    particles = [];
    checkpoint = CHECKPOINT_DIST;
    checkpointLetter = 0;
    fireCooldownF = 0;
    fireCooldownU = 0;
    lastSpawnX = W + 50;
    killTimer = 0;
    killAction = null;

    generateMountains();
    generateStars();
    generateTerrain(W + 50, scrollX + W * 3);

    scoreEl.textContent = '0';
    livesEl.textContent = lives;
    game.showOverlay('MOON PATROL', 'Press any key to start -- SPACE/UP: Jump | Z: Fire forward | X: Fire up');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight') || input.wasPressed('z') || input.wasPressed('x')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight') || input.wasPressed('z') || input.wasPressed('x')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Handle kill timer (replaces setTimeout)
    if (killTimer > 0) {
      killTimer--;
      if (killTimer === 0) {
        if (killAction === 'gameover') {
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Press any key to restart');
          game.setState('over');
        } else if (killAction === 'respawn') {
          respawn();
        }
        killAction = null;
      }
    }

    // Difficulty scales with distance
    difficulty = 1 + Math.min(scrollX / 5000, 2.5);
    scrollSpeed = BASE_SCROLL + (MAX_SCROLL - BASE_SCROLL) * Math.min(scrollX / 8000, 1);

    // Scroll
    if (buggy.alive) {
      scrollX += scrollSpeed;
    }

    // Score = distance
    const distScore = Math.floor(scrollX / 10);
    if (distScore > score) {
      score = distScore;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
    }

    // Checkpoints
    if (scrollX > checkpoint && checkpointLetter < 26) {
      addParticles(W / 2, GROUND_Y - 40, 8, '#ff0');
      score += 100;
      scoreEl.textContent = score;
      checkpointLetter++;
      checkpoint += CHECKPOINT_DIST;
    }

    // Generate more terrain ahead
    if (lastSpawnX < scrollX + W * 2) {
      generateTerrain(lastSpawnX, scrollX + W * 3);
    }

    // Spawn UFOs
    spawnUFO();

    // Buggy physics
    if (buggy.alive) {
      buggy.wheelPhase += scrollSpeed * 0.15;

      // Jump
      if ((input.isDown(' ') || input.isDown('ArrowUp')) && buggy.grounded) {
        buggy.vy = JUMP_VEL;
        buggy.grounded = false;
      }

      // Gravity
      buggy.vy += GRAVITY;
      buggy.y += buggy.vy;

      // Ground collision
      const buggyWorldX = scrollX + BUGGY_X;
      const groundFront = getGroundAt(buggyWorldX + BUGGY_W);
      const groundRear = getGroundAt(buggyWorldX);
      const groundCenter = getGroundAt(buggyWorldX + BUGGY_W / 2);
      const effectiveGround = Math.min(groundFront, groundRear, groundCenter);

      if (buggy.y >= effectiveGround) {
        buggy.y = effectiveGround;
        buggy.vy = 0;
        buggy.grounded = true;
      } else {
        buggy.grounded = false;
      }

      // Check if buggy fell into crater
      const deepFront = getGroundAt(buggyWorldX + BUGGY_W);
      const deepRear = getGroundAt(buggyWorldX);
      if (buggy.grounded && deepFront > GROUND_Y + 5 && deepRear > GROUND_Y + 5) {
        if (buggy.y > GROUND_Y + 8) {
          killBuggy(game);
        }
      }

      // Suspension animation
      const targetSuspF = buggy.grounded ? (groundFront - GROUND_Y) * 0.3 : 0;
      const targetSuspR = buggy.grounded ? (groundRear - GROUND_Y) * 0.3 : 0;
      buggy.suspF += (targetSuspF - buggy.suspF) * 0.3;
      buggy.suspR += (targetSuspR - buggy.suspR) * 0.3;

      // Rock collision
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i];
        if (r.hit) continue;
        const rx = r.x - scrollX;
        if (rx > BUGGY_X - 5 && rx < BUGGY_X + BUGGY_W + 5) {
          if (buggy.y > GROUND_Y - r.h + 5) {
            killBuggy(game);
            break;
          }
        }
      }

      // Mine collision
      for (const m of mines) {
        if (!m.active) continue;
        const mx = m.x - scrollX;
        if (mx > BUGGY_X - 10 && mx < BUGGY_X + BUGGY_W + 10) {
          if (buggy.grounded || buggy.y > GROUND_Y - 15) {
            m.active = false;
            addParticles(BUGGY_X + BUGGY_W / 2, GROUND_Y - 5, 12, '#f80');
            killBuggy(game);
            break;
          }
        }
      }

      // Bomb collision
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        const bx = b.x - scrollX;
        const by = b.y;
        if (bx > BUGGY_X - 8 && bx < BUGGY_X + BUGGY_W + 8 &&
            by > buggy.y - BUGGY_H - 8 && by < buggy.y + 8) {
          bombs.splice(i, 1);
          addParticles(bx, by, 10, '#f44');
          killBuggy(game);
          break;
        }
      }

      // Fire forward
      if (fireCooldownF > 0) fireCooldownF--;
      if (input.isDown('z') && fireCooldownF === 0 && buggy.alive) {
        bulletsF.push({ x: scrollX + BUGGY_X + BUGGY_W + 5, y: buggy.y - BUGGY_H / 2 });
        fireCooldownF = 12;
      }

      // Fire up
      if (fireCooldownU > 0) fireCooldownU--;
      if (input.isDown('x') && fireCooldownU === 0 && buggy.alive) {
        bulletsU.push({ x: scrollX + BUGGY_X + BUGGY_W / 2, y: buggy.y - BUGGY_H });
        fireCooldownU = 15;
      }
    }

    // Update forward bullets
    for (let i = bulletsF.length - 1; i >= 0; i--) {
      bulletsF[i].x += 7;
      if (bulletsF[i].x > scrollX + W + 20) {
        bulletsF.splice(i, 1);
        continue;
      }
      // Hit rocks
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        if (r.hit) continue;
        if (Math.abs(bulletsF[i].x - r.x) < r.w / 2 + 5 &&
            bulletsF[i].y > GROUND_Y - r.h - 5 && bulletsF[i].y < GROUND_Y + 5) {
          r.hit = true;
          addParticles(r.x - scrollX, GROUND_Y - r.h / 2, 8, '#888');
          score += 25;
          scoreEl.textContent = score;
          bulletsF.splice(i, 1);
          break;
        }
      }
    }

    // Update upward bullets
    for (let i = bulletsU.length - 1; i >= 0; i--) {
      bulletsU[i].y -= 6;
      if (bulletsU[i].y < -20) {
        bulletsU.splice(i, 1);
        continue;
      }
      // Hit UFOs
      for (let j = ufos.length - 1; j >= 0; j--) {
        const u = ufos[j];
        if (!u.alive) continue;
        if (Math.abs(bulletsU[i].x - u.x) < 20 && Math.abs(bulletsU[i].y - u.y) < 15) {
          u.alive = false;
          addParticles(u.x - scrollX, u.y, 12, '#f44');
          score += 50;
          scoreEl.textContent = score;
          bulletsU.splice(i, 1);
          break;
        }
      }
    }

    // Update UFOs
    for (let i = ufos.length - 1; i >= 0; i--) {
      const u = ufos[i];
      if (!u.alive) { ufos.splice(i, 1); continue; }
      u.x += u.vx + scrollSpeed * 0.2;
      u.y += Math.sin(frameCount * 0.05 + i) * 0.5;

      u.bombTimer--;
      if (u.bombTimer <= 0) {
        u.bombTimer = 50 + Math.floor(Math.random() * 60 / difficulty);
        bombs.push({ x: u.x, y: u.y + 10, vy: 2 + Math.random() });
      }

      if (u.x < scrollX - 60) {
        ufos.splice(i, 1);
      }
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      bombs[i].y += bombs[i].vy;
      bombs[i].vy += 0.08;
      if (bombs[i].y > GROUND_Y + 10) {
        addParticles(bombs[i].x - scrollX, GROUND_Y, 6, '#f80');
        bombs.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].vy += 0.05;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Clean up destroyed rocks
    rocks = rocks.filter(r => !r.hit || r.x > scrollX - 100);
  };

  game.onDraw = (renderer, text) => {
    // Sky: dark background (handled by renderer.begin default bg)
    // Upper sky region - very dark
    renderer.fillRect(0, 0, W, GROUND_Y, '#0a0a1a');

    // Stars
    for (const s of stars) {
      const twinkle = Math.sin(frameCount * 0.03 + s.twinkle);
      const alpha = Math.max(0.1, 0.3 + twinkle * 0.3);
      const a8 = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, '#ffffff' + a8);
    }

    // Parallax mountains (back layer)
    const mOffset = (scrollX * 0.15) % 1200;
    for (const m of mountains) {
      let mx = m.x - mOffset;
      const screenX = mx < -200 ? mx + 1200 : mx;
      if (screenX > W + 200 || screenX + m.w < -200) continue;
      renderer.fillPoly([
        { x: screenX, y: GROUND_Y },
        { x: screenX + m.w * 0.3, y: GROUND_Y - m.h },
        { x: screenX + m.w * 0.5, y: GROUND_Y - m.h * 0.8 },
        { x: screenX + m.w * 0.7, y: GROUND_Y - m.h * 0.95 },
        { x: screenX + m.w, y: GROUND_Y }
      ], '#0f1525');
    }

    // Parallax mountains (front layer)
    const mOffset2 = (scrollX * 0.3) % 1400;
    for (const m of mountains) {
      let mx = m.x * 1.3 + 200 - mOffset2;
      const screenX = mx < -200 ? mx + 1400 : mx;
      const mw = m.w * 0.7;
      const mh = m.h * 0.5;
      if (screenX > W + 200 || screenX + mw < -200) continue;
      renderer.fillPoly([
        { x: screenX, y: GROUND_Y },
        { x: screenX + mw * 0.4, y: GROUND_Y - mh },
        { x: screenX + mw * 0.6, y: GROUND_Y - mh * 0.7 },
        { x: screenX + mw, y: GROUND_Y }
      ], '#141830');
    }

    // Draw terrain fill (ground body)
    // Build terrain surface points, then fill below to bottom of screen
    const terrainPoints = [];
    let px = 0;
    while (px <= W) {
      const wx = scrollX + px;
      let gy = GROUND_Y;
      for (const c of craters) {
        if (wx >= c.x && wx <= c.x + c.w) {
          const cx = (wx - c.x) / c.w;
          gy = GROUND_Y + Math.sin(cx * Math.PI) * c.depth;
          break;
        }
      }
      terrainPoints.push({ x: px, y: gy });
      px += 4; // step by 4 for polygon fill (less overhead than 2)
    }

    // Fill ground body as a series of quads
    for (let i = 0; i < terrainPoints.length - 1; i++) {
      const p0 = terrainPoints[i];
      const p1 = terrainPoints[i + 1];
      renderer.fillPoly([
        { x: p0.x, y: p0.y },
        { x: p1.x, y: p1.y },
        { x: p1.x, y: H },
        { x: p0.x, y: H }
      ], '#16213e');
    }

    // Draw ground surface line
    renderer.setGlow(THEME, 0.4);
    for (let i = 0; i < terrainPoints.length - 1; i++) {
      renderer.drawLine(
        terrainPoints[i].x, terrainPoints[i].y,
        terrainPoints[i + 1].x, terrainPoints[i + 1].y,
        THEME, 2
      );
    }
    renderer.setGlow(null);

    // Draw rocks
    for (const r of rocks) {
      if (r.hit) continue;
      const rx = r.x - scrollX;
      if (rx < -30 || rx > W + 30) continue;
      renderer.setGlow(THEME, 0.3);
      renderer.fillPoly([
        { x: rx - r.w / 2, y: GROUND_Y },
        { x: rx - r.w / 3, y: GROUND_Y - r.h * 0.7 },
        { x: rx, y: GROUND_Y - r.h },
        { x: rx + r.w / 3, y: GROUND_Y - r.h * 0.6 },
        { x: rx + r.w / 2, y: GROUND_Y }
      ], '#556');
      renderer.setGlow(null);
    }

    // Draw mines
    for (const m of mines) {
      if (!m.active) continue;
      const mx = m.x - scrollX;
      if (mx < -20 || mx > W + 20) continue;
      const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      const a8 = Math.round(pulse * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#f80', 0.6);
      renderer.fillCircle(mx, GROUND_Y - 6, 6, '#ff6400' + a8);
      // Spikes
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        renderer.drawLine(
          mx + Math.cos(a) * 6, GROUND_Y - 6 + Math.sin(a) * 6,
          mx + Math.cos(a) * 10, GROUND_Y - 6 + Math.sin(a) * 10,
          '#f80', 1.5
        );
      }
      renderer.setGlow(null);
    }

    // Draw checkpoints
    for (let i = 0; i <= checkpointLetter; i++) {
      const cpX = (i + 1) * CHECKPOINT_DIST - scrollX;
      if (cpX < -20 || cpX > W + 20) continue;
      const passed = i < checkpointLetter;
      const cpColor = passed ? '#333' : '#ff0';
      if (!passed) renderer.setGlow('#ff0', 0.4);
      renderer.drawLine(cpX, GROUND_Y, cpX, GROUND_Y - 50, cpColor, 2);
      text.drawText(String.fromCharCode(65 + i), cpX, GROUND_Y - 62, 14, passed ? '#444' : '#ff0', 'center');
      if (!passed) renderer.setGlow(null);
    }

    // Draw UFOs
    for (const u of ufos) {
      if (!u.alive) continue;
      const ux = u.x - scrollX;
      const uy = u.y;
      if (ux < -30 || ux > W + 30) continue;
      // Saucer body (ellipse approximated as wide short rect + circles)
      renderer.setGlow('#f44', 0.7);
      renderer.fillRect(ux - 16, uy - 5, 32, 10, '#f44');
      renderer.fillCircle(ux - 14, uy, 6, '#f44');
      renderer.fillCircle(ux + 14, uy, 6, '#f44');
      // Dome (upper half)
      renderer.fillRect(ux - 8, uy - 10, 16, 7, '#f88');
      renderer.fillCircle(ux, uy - 10, 8, '#f88');
      // Lights
      const blink = Math.sin(frameCount * 0.15 + u.x) > 0;
      renderer.fillCircle(ux - 10, uy + 2, 2, blink ? '#ff0' : '#880');
      renderer.fillCircle(ux + 10, uy + 2, 2, blink ? '#ff0' : '#880');
      renderer.setGlow(null);
    }

    // Draw bombs
    renderer.setGlow('#f44', 0.5);
    for (const b of bombs) {
      const bx = b.x - scrollX;
      renderer.fillCircle(bx, b.y, 3, '#f44');
    }
    renderer.setGlow(null);

    // Draw buggy
    if (buggy.alive) {
      const bx = BUGGY_X;
      const by = buggy.y;

      // Wheel positions
      const rearWheelX = bx + 6;
      const frontWheelX = bx + BUGGY_W - 6;
      const rearWheelY = by - WHEEL_R + buggy.suspR;
      const frontWheelY = by - WHEEL_R + buggy.suspF;

      // Body base Y (average of wheel positions)
      const bodyBaseY = (rearWheelY + frontWheelY) / 2 - WHEEL_R - 2;

      // Main body
      renderer.setGlow(THEME, 0.7);
      renderer.fillRect(bx + 4, bodyBaseY - BUGGY_H / 4, BUGGY_W - 8, BUGGY_H / 2 + 2, THEME);

      // Cabin
      renderer.fillRect(bx + 8, bodyBaseY - BUGGY_H / 2 - 4, BUGGY_W / 2 - 4, 8, '#5af');

      // Antenna
      renderer.drawLine(
        bx + 10, bodyBaseY - BUGGY_H / 2 - 4,
        bx + 6, bodyBaseY - BUGGY_H / 2 - 14,
        THEME, 1.5
      );
      renderer.fillCircle(bx + 6, bodyBaseY - BUGGY_H / 2 - 15, 2, '#ff0');

      // Gun barrel
      renderer.fillRect(bx + BUGGY_W - 8, bodyBaseY, 12, 3, '#aaa');
      renderer.setGlow(null);

      // Wheels
      drawWheel(renderer, rearWheelX, rearWheelY);
      drawWheel(renderer, frontWheelX, frontWheelY);

      // Suspension links
      renderer.drawLine(rearWheelX, bodyBaseY + BUGGY_H / 4, rearWheelX, rearWheelY, '#666', 2);
      renderer.drawLine(frontWheelX, bodyBaseY + BUGGY_H / 4, frontWheelX, frontWheelY, '#666', 2);
    }

    // Draw forward bullets
    renderer.setGlow('#ff0', 0.5);
    for (const b of bulletsF) {
      const bx = b.x - scrollX;
      renderer.fillRect(bx - 4, b.y - 1, 8, 2, '#ff0');
    }

    // Draw upward bullets
    renderer.setGlow('#0ff', 0.5);
    for (const b of bulletsU) {
      const bx = b.x - scrollX;
      renderer.fillRect(bx - 1, b.y - 4, 2, 8, '#0ff');
    }
    renderer.setGlow(null);

    // Draw particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 30);
      const a8 = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(p.x - 1, p.y - 1, 3, 3, expandHex(p.color) + a8);
    }

    // HUD: checkpoint progress bar
    const progress = (scrollX % CHECKPOINT_DIST) / CHECKPOINT_DIST;
    const barW = 100;
    const barH = 6;
    const barX = W - barW - 10;
    const barY = 10;
    renderer.fillRect(barX, barY, barW, barH, '#16213e');
    renderer.fillRect(barX, barY, barW * progress, barH, THEME);
    // Bar outline using lines
    renderer.drawLine(barX, barY, barX + barW, barY, THEME_DIM, 1);
    renderer.drawLine(barX + barW, barY, barX + barW, barY + barH, THEME_DIM, 1);
    renderer.drawLine(barX + barW, barY + barH, barX, barY + barH, THEME_DIM, 1);
    renderer.drawLine(barX, barY + barH, barX, barY, THEME_DIM, 1);

    // Checkpoint letters
    const currentLetter = String.fromCharCode(65 + Math.min(checkpointLetter, 25));
    const nextLetter = String.fromCharCode(65 + Math.min(checkpointLetter + 1, 25));
    text.drawText(currentLetter, barX - 12, barY - 2, 10, '#888', 'left');
    text.drawText(nextLetter, barX + barW + 14, barY - 2, 10, '#888', 'right');

    // Lives display on canvas
    renderer.setGlow(THEME, 0.3);
    for (let i = 0; i < lives; i++) {
      const lx = 12 + i * 20;
      const ly = 12;
      renderer.fillRect(lx, ly, 12, 6, THEME);
      renderer.fillCircle(lx + 2, ly + 8, 3, THEME);
      renderer.fillCircle(lx + 10, ly + 8, 3, THEME);
    }
    renderer.setGlow(null);
  };

  function drawWheel(renderer, x, y) {
    renderer.setGlow(THEME, 0.4);
    // Wheel outline as circle of lines
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      renderer.drawLine(
        x + Math.cos(a0) * WHEEL_R, y + Math.sin(a0) * WHEEL_R,
        x + Math.cos(a1) * WHEEL_R, y + Math.sin(a1) * WHEEL_R,
        THEME, 2
      );
    }
    // Spokes
    for (let a = 0; a < 4; a++) {
      const angle = buggy.wheelPhase + (a * Math.PI / 2);
      renderer.drawLine(
        x, y,
        x + Math.cos(angle) * (WHEEL_R - 2), y + Math.sin(angle) * (WHEEL_R - 2),
        THEME, 1
      );
    }
    // Hub
    renderer.fillCircle(x, y, 2, THEME);
    renderer.setGlow(null);
  }

  game.start();
  return game;
}
