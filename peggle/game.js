// peggle/game.js — Peggle game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 640;

// Physics constants
const GRAVITY = 0.15;
const BALL_RADIUS = 6;
const PEG_RADIUS = 10;
const BOUNCE_DAMPING = 0.72;
const WALL_DAMPING = 0.8;

// Launcher
const LAUNCHER_X = W / 2;
const LAUNCHER_Y = 30;
const LAUNCHER_LEN = 35;
const AIM_SPEED = 0.025;
const SHOOT_SPEED = 8;

// Bucket
const BUCKET_W = 60;
const BUCKET_H = 18;
const BUCKET_Y = H - 30;
const BUCKET_SPEED = 1.5;

// ── State ──
let launcherAngle;
let ball;
let pegs;
let hitPegs;
let ballsLeft;
let bucketX, bucketDir;
let level;
let feverTimer;
let feverParticles;
let particles;
let clearAnimTimer;
let shotActive;
let totalOrange;
let orangeLeft;
let showingClearAnim;
let levelCompleteTimer;
let lastShotHitPegs;
let score;
let best = 0;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Level generation ──
function generateLevel(lvl) {
  const pegList = [];
  const margin = 40;
  const topMargin = 80;
  const bottomMargin = 100;
  const usableW = W - margin * 2;
  const usableH = H - topMargin - bottomMargin;

  if (lvl === 1) {
    // Diamond pattern
    const rows = 7;
    const cols = 9;
    for (let r = 0; r < rows; r++) {
      const pegsInRow = cols - Math.abs(r - Math.floor(rows / 2));
      const startX = margin + (usableW - (pegsInRow - 1) * (usableW / (cols - 1))) / 2;
      for (let c = 0; c < pegsInRow; c++) {
        const x = startX + c * (usableW / (cols - 1));
        const y = topMargin + (r / (rows - 1)) * usableH;
        pegList.push({ x, y });
      }
    }
  } else if (lvl === 2) {
    // Grid with gaps
    const rows = 8;
    const cols = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 3 === 0) continue;
        const x = margin + (c / (cols - 1)) * usableW;
        const y = topMargin + (r / (rows - 1)) * usableH;
        pegList.push({ x, y });
      }
    }
  } else if (lvl === 3) {
    // Circular rings
    const cx = W / 2;
    const cy = topMargin + usableH / 2;
    const radii = [60, 110, 160, 200];
    const counts = [6, 10, 16, 22];
    for (let ri = 0; ri < radii.length; ri++) {
      for (let i = 0; i < counts[ri]; i++) {
        const angle = (i / counts[ri]) * Math.PI * 2 + ri * 0.3;
        const x = cx + Math.cos(angle) * radii[ri];
        const y = cy + Math.sin(angle) * radii[ri];
        if (x > margin && x < W - margin && y > topMargin && y < topMargin + usableH) {
          pegList.push({ x, y });
        }
      }
    }
  } else if (lvl === 4) {
    // V-shape with scatter
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      pegList.push({ x: margin + t * usableW / 2, y: topMargin + t * usableH });
      pegList.push({ x: W - margin - t * usableW / 2, y: topMargin + t * usableH });
    }
    // Scatter fill
    for (let i = 0; i < 20; i++) {
      const x = margin + Math.random() * usableW;
      const y = topMargin + Math.random() * usableH;
      let tooClose = false;
      for (const p of pegList) {
        if (Math.hypot(p.x - x, p.y - y) < PEG_RADIUS * 3) { tooClose = true; break; }
      }
      if (!tooClose) pegList.push({ x, y });
    }
  } else {
    // Random procedural levels for 5+
    const numPegs = 40 + (lvl - 5) * 5;
    const seed = lvl * 1337;
    let rng = seed;
    function seededRand() { rng = (rng * 16807 + 0) % 2147483647; return rng / 2147483647; }
    for (let i = 0; i < numPegs; i++) {
      let x, y, valid;
      let attempts = 0;
      do {
        x = margin + seededRand() * usableW;
        y = topMargin + seededRand() * usableH;
        valid = true;
        for (const p of pegList) {
          if (Math.hypot(p.x - x, p.y - y) < PEG_RADIUS * 2.8) { valid = false; break; }
        }
        attempts++;
      } while (!valid && attempts < 50);
      if (valid) pegList.push({ x, y });
    }
  }

  // Assign peg types: ~30% orange, ~5% green, rest blue
  const orangeCount = Math.max(8, Math.floor(pegList.length * 0.3));
  const greenCount = Math.max(1, Math.floor(pegList.length * 0.05));

  // Shuffle indices
  const indices = pegList.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return pegList.map((p, idx) => {
    const shuffledIdx = indices.indexOf(idx);
    let type = 'blue';
    if (shuffledIdx < orangeCount) type = 'orange';
    else if (shuffledIdx < orangeCount + greenCount) type = 'green';
    return { ...p, type, hit: false, radius: PEG_RADIUS, glowTimer: 0 };
  });
}

function resolveCollision(b, peg) {
  const dx = b.x - peg.x;
  const dy = b.y - peg.y;
  const dist = Math.hypot(dx, dy);
  const minDist = BALL_RADIUS + peg.radius;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    b.x += nx * overlap;
    b.y += ny * overlap;
    const dot = b.vx * nx + b.vy * ny;
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
    b.vx *= BOUNCE_DAMPING;
    b.vy *= BOUNCE_DAMPING;
    return true;
  }
  return false;
}

function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 2
    });
  }
}

function spawnFeverParticles() {
  const colors = ['#f80', '#ff0', '#f44', '#6af', '#0f0', '#f0f'];
  for (let i = 0; i < 80; i++) {
    feverParticles.push({
      x: Math.random() * W,
      y: H + Math.random() * 50,
      vx: (Math.random() - 0.5) * 4,
      vy: -(3 + Math.random() * 6),
      life: 60 + Math.random() * 60,
      maxLife: 120,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4
    });
  }
}

function shootBall() {
  if (shotActive || showingClearAnim) return;
  const vx = Math.cos(launcherAngle) * SHOOT_SPEED;
  const vy = Math.sin(launcherAngle) * SHOOT_SPEED;
  ball = {
    x: LAUNCHER_X + Math.cos(launcherAngle) * LAUNCHER_LEN,
    y: LAUNCHER_Y + Math.sin(launcherAngle) * LAUNCHER_LEN,
    vx, vy,
    active: true
  };
  shotActive = true;
  lastShotHitPegs = [];
  ballsLeft--;
}

function advanceLevel() {
  level++;
  ballsLeft = Math.max(ballsLeft, 10);
  pegs = generateLevel(level);
  totalOrange = pegs.filter(p => p.type === 'orange').length;
  orangeLeft = totalOrange;
  launcherAngle = Math.PI / 2;
}

let _game; // reference to the Game instance for finishShot

function finishShot() {
  pegs = pegs.filter(p => !p.hit);
  shotActive = false;
  ball = null;

  orangeLeft = pegs.filter(p => p.type === 'orange').length;

  if (orangeLeft <= 0) {
    // EXTREME FEVER
    feverTimer = 120;
    showingClearAnim = true;
    spawnFeverParticles();
    score += ballsLeft * 500;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    return;
  }

  if (ballsLeft <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    _game.showOverlay('GAME OVER', `Score: ${score} - Press any key to restart`);
    _game.setState('over');
    return;
  }
}

export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    level = 1;
    ballsLeft = 10;
    launcherAngle = Math.PI / 2;
    ball = null;
    shotActive = false;
    hitPegs = [];
    pegs = generateLevel(level);
    totalOrange = pegs.filter(p => p.type === 'orange').length;
    orangeLeft = totalOrange;
    bucketX = W / 2 - BUCKET_W / 2;
    bucketDir = 1;
    feverTimer = 0;
    feverParticles = [];
    particles = [];
    clearAnimTimer = 0;
    showingClearAnim = false;
    levelCompleteTimer = 0;
    lastShotHitPegs = [];

    game.showOverlay('PEGGLE', 'Left/Right to aim, Space to shoot');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')
          || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update fever particles
    for (let i = feverParticles.length - 1; i >= 0; i--) {
      const p = feverParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) feverParticles.splice(i, 1);
    }

    if (feverTimer > 0) {
      feverTimer--;
      if (feverTimer === 0 && showingClearAnim) {
        showingClearAnim = false;
        advanceLevel();
      }
      return;
    }

    // Level complete animation
    if (showingClearAnim) return;

    // Clear anim: remove hit pegs one by one after ball falls
    if (clearAnimTimer > 0) {
      clearAnimTimer--;
      if (clearAnimTimer <= 0) {
        finishShot();
      }
      return;
    }

    // Move bucket
    bucketX += BUCKET_SPEED * bucketDir;
    if (bucketX <= 0) { bucketX = 0; bucketDir = 1; }
    if (bucketX >= W - BUCKET_W) { bucketX = W - BUCKET_W; bucketDir = -1; }

    // Aim with keys
    if (input.isDown('ArrowLeft')) launcherAngle -= AIM_SPEED;
    if (input.isDown('ArrowRight')) launcherAngle += AIM_SPEED;
    launcherAngle = Math.max(0.15, Math.min(Math.PI - 0.15, launcherAngle));

    // Shoot
    if (input.wasPressed(' ') && !shotActive && !showingClearAnim && ballsLeft > 0) {
      shootBall();
    }

    if (!ball || !ball.active) return;

    // Move ball (substeps for better collision)
    const substeps = 3;
    for (let s = 0; s < substeps; s++) {
      ball.vy += GRAVITY / substeps;
      ball.x += ball.vx / substeps;
      ball.y += ball.vy / substeps;

      // Wall collisions
      if (ball.x - BALL_RADIUS < 0) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * WALL_DAMPING;
      }
      if (ball.x + BALL_RADIUS > W) {
        ball.x = W - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * WALL_DAMPING;
      }
      // Ceiling
      if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy) * WALL_DAMPING;
      }

      // Peg collisions
      for (const peg of pegs) {
        if (peg.hit) continue;
        if (resolveCollision(ball, peg)) {
          peg.hit = true;
          peg.glowTimer = 30;
          lastShotHitPegs.push(peg);

          // Score
          let pts = 0;
          if (peg.type === 'orange') {
            pts = 100;
            orangeLeft--;
          } else if (peg.type === 'blue') {
            pts = 10;
          } else if (peg.type === 'green') {
            pts = 50;
            ballsLeft++;
          }

          // Multiplier based on hit count this shot
          const hitCount = lastShotHitPegs.length;
          if (hitCount >= 10) pts *= 5;
          else if (hitCount >= 7) pts *= 3;
          else if (hitCount >= 4) pts *= 2;

          score += pts;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }

          const colorMap = { orange: '#f80', blue: '#6af', green: '#0f0' };
          spawnHitParticles(peg.x, peg.y, colorMap[peg.type] || '#fff');
        }
      }
    }

    // Update peg glow timers
    for (const peg of pegs) {
      if (peg.glowTimer > 0) peg.glowTimer--;
    }

    // Ball fell below screen
    if (ball.y - BALL_RADIUS > H) {
      // Check if ball landed in bucket
      if (ball.x > bucketX && ball.x < bucketX + BUCKET_W) {
        ballsLeft++;
        spawnHitParticles(ball.x, BUCKET_Y, '#6af');
      }
      ball.active = false;
      clearAnimTimer = 20;
      return;
    }

    // Check bucket collision while ball is near bottom
    if (ball.y + BALL_RADIUS >= BUCKET_Y && ball.y - BALL_RADIUS <= BUCKET_Y + BUCKET_H) {
      if (ball.x > bucketX && ball.x < bucketX + BUCKET_W) {
        if (ball.vy > 0) {
          ball.y = BUCKET_Y - BALL_RADIUS;
          ball.vy = -ball.vy * 0.5;
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Subtle grid
    for (let x = 0; x < W; x += 40) {
      renderer.drawLine(x, 0, x, H, '#16213e80', 1);
    }
    for (let y = 0; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, '#16213e80', 1);
    }

    // Draw pegs
    for (const peg of pegs) {
      let color, glowColor;
      if (peg.type === 'orange') {
        color = peg.hit ? '#fc6' : '#f80';
        glowColor = '#f80';
      } else if (peg.type === 'green') {
        color = peg.hit ? '#8f8' : '#0f0';
        glowColor = '#0f0';
      } else {
        color = peg.hit ? '#8bf' : '#48e';
        glowColor = '#6af';
      }

      if (peg.hit) {
        const glowAmount = 0.5 + peg.glowTimer / 30 * 0.5;
        renderer.setGlow(glowColor, glowAmount);
        renderer.fillCircle(peg.x, peg.y, peg.radius, color);
        renderer.setGlow(null);
      } else {
        renderer.setGlow(glowColor, 0.3);
        renderer.fillCircle(peg.x, peg.y, peg.radius, color);
        renderer.setGlow(null);

        // Inner highlight
        renderer.fillCircle(peg.x - 2, peg.y - 2, peg.radius * 0.4, 'rgba(255,255,255,0.2)');
      }
    }

    // Draw particles
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      // Build rgba color from hex + alpha
      const c = p.color;
      renderer.setGlow(c, 0.4 * alpha);
      renderer.fillCircle(p.x, p.y, p.size, withAlpha(c, alpha));
      renderer.setGlow(null);
    }

    // Draw fever particles
    for (const p of feverParticles) {
      const alpha = p.life / p.maxLife;
      renderer.setGlow(p.color, 0.5 * alpha);
      renderer.fillCircle(p.x, p.y, p.size, withAlpha(p.color, alpha));
      renderer.setGlow(null);
    }

    // Draw bucket
    const bucketPoints = [
      { x: bucketX, y: BUCKET_Y },
      { x: bucketX + 6, y: BUCKET_Y + BUCKET_H },
      { x: bucketX + BUCKET_W - 6, y: BUCKET_Y + BUCKET_H },
      { x: bucketX + BUCKET_W, y: BUCKET_Y },
    ];
    renderer.setGlow('#6af', 0.4);
    renderer.fillPoly(bucketPoints, '#16213e');
    renderer.strokePoly(bucketPoints, '#6af', 2, true);
    renderer.setGlow(null);

    // Draw launcher
    const tipX = LAUNCHER_X + Math.cos(launcherAngle) * LAUNCHER_LEN;
    const tipY = LAUNCHER_Y + Math.sin(launcherAngle) * LAUNCHER_LEN;

    // Launcher base
    renderer.setGlow('#6af', 0.5);
    renderer.fillCircle(LAUNCHER_X, LAUNCHER_Y, 12, '#6af');

    // Launcher barrel
    renderer.drawLine(LAUNCHER_X, LAUNCHER_Y, tipX, tipY, '#6af', 5);
    renderer.setGlow(null);

    // Aiming guide (dashed line)
    if (!shotActive) {
      const guideEndX = LAUNCHER_X + Math.cos(launcherAngle) * 200;
      const guideEndY = LAUNCHER_Y + Math.sin(launcherAngle) * 200;
      renderer.dashedLine(tipX, tipY, guideEndX, guideEndY, 'rgba(102,170,255,0.3)', 1, 4, 6);
    }

    // Draw ball
    if (ball && ball.active) {
      // Ball trail
      renderer.fillCircle(ball.x - ball.vx * 0.5, ball.y - ball.vy * 0.5, BALL_RADIUS * 0.7, 'rgba(102,170,255,0.3)');

      renderer.setGlow('#6af', 0.7);
      renderer.fillCircle(ball.x, ball.y, BALL_RADIUS, '#fff');
      renderer.setGlow(null);
    }

    // HUD - info bar at top
    renderer.fillRect(0, 0, W, 16, 'rgba(26,26,46,0.7)');

    text.drawText(`Balls: ${ballsLeft}`, 8, 2, 11, '#888', 'left');
    text.drawText(`Orange: ${orangeLeft}/${totalOrange}`, W / 2, 2, 11, '#f80', 'center');
    text.drawText(`Level ${level}`, W - 8, 2, 11, '#888', 'right');

    // Fever text
    if (feverTimer > 0) {
      const feverAlpha = Math.min(1, feverTimer / 30);
      text.drawText('EXTREME FEVER!', W / 2, H / 2 - 40, 36, withAlpha('#f80', feverAlpha), 'center');
      text.drawText(`+${ballsLeft * 500} BONUS!`, W / 2, H / 2 + 10, 18, withAlpha('#ff0', feverAlpha), 'center');
    }

    // Hit count display during active shot
    if (shotActive && lastShotHitPegs.length > 0) {
      let mult = 1;
      const hc = lastShotHitPegs.length;
      if (hc >= 10) mult = 5;
      else if (hc >= 7) mult = 3;
      else if (hc >= 4) mult = 2;
      const hitColor = mult > 1 ? '#ff0' : '#aaa';
      text.drawText(`${hc} hits${mult > 1 ? ' x' + mult : ''}`, W - 10, 22, 14, hitColor, 'right');
    }
  };

  game.start();
  return game;
}

// Helper: build #rrggbbaa from a hex color string + 0-1 alpha
function withAlpha(hex, a) {
  const v = Math.max(0, Math.min(255, Math.round(a * 255)));
  const aa = v.toString(16).padStart(2, '0');
  // Expand #rgb to #rrggbb first
  const h = hex.slice(1);
  if (h.length === 3) {
    return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + aa;
  }
  // Already #rrggbb
  return hex + aa;
}
