// soccer-heads/game.js — Soccer Heads game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 350;
const GRAVITY = 0.45;
const GROUND_Y = H - 40;
const WIN_SCORE = 5;

// Goal dimensions
const GOAL_W = 40;
const GOAL_H = 80;
const GOAL_TOP = GROUND_Y - GOAL_H;

// Character dimensions
const CHAR_RADIUS = 22;
const CHAR_BODY_H = 20;
const CHAR_W = 28;

// Ball
const BALL_R = 10;

// Trail
const TRAIL_MAX = 12;

// ── State ──
let gameState;
let score;
let elapsed;       // seconds, accumulated at 1/60 per fixed step
let goalPause;     // frames remaining in goal-pause state
let goalMessage;
let trail;
let particles;
let player, cpu, ball;
let frameCount;    // for leg/arm animation

// ── DOM refs ──
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl    = document.getElementById('cpuScore');
const timerEl       = document.getElementById('timer');

// Particle color presets as [r,g,b] 0-255
const COLORS = {
  '#fff': [255, 255, 255],
  '#ff0': [255, 255,   0],
  '#4af': [ 68, 170, 255],
  '#f54': [255,  85,  68],
};

function colorToRgb(hex) {
  if (COLORS[hex]) return COLORS[hex];
  // Fallback for 3-char hex
  if (hex.length === 4) {
    return [
      parseInt(hex[1], 16) * 17,
      parseInt(hex[2], 16) * 17,
      parseInt(hex[3], 16) * 17,
    ];
  }
  return [255, 255, 255];
}

// ── Helpers ──

function createChar(x, facingRight) {
  return {
    x, y: GROUND_Y,
    vx: 0, vy: 0,
    w: CHAR_W,
    radius: CHAR_RADIUS,
    onGround: true,
    facingRight,
    kickTimer: 0,
    kickCooldown: 0,
    isKicking: false,
    score: 0,
  };
}

function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, r: BALL_R };
}

function spawnParticles(x, y, hexColor, count) {
  const rgb = colorToRgb(hexColor);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      rgb,
      life: 20 + Math.random() * 20,
      maxLife: 40,
    });
  }
}

function resetAfterGoal() {
  player.x = 150; player.y = GROUND_Y; player.vx = 0; player.vy = 0; player.onGround = true;
  cpu.x    = 450; cpu.y    = GROUND_Y; cpu.vx    = 0; cpu.vy    = 0; cpu.onGround    = true;
  ball.x = W / 2;
  ball.y = 120;
  ball.vx = (Math.random() - 0.5) * 2;
  ball.vy = -2;
  trail = [];
}

// ── Physics ──

function updateChar(ch) {
  ch.vy += GRAVITY;
  ch.x  += ch.vx;
  ch.y  += ch.vy;

  if (ch.y >= GROUND_Y) {
    ch.y = GROUND_Y;
    ch.vy = 0;
    ch.onGround = true;
  }

  const minX = GOAL_W + ch.w / 2;
  const maxX = W - GOAL_W - ch.w / 2;
  ch.x = Math.max(minX, Math.min(maxX, ch.x));

  if (ch.vx > 0.5) ch.facingRight = true;
  else if (ch.vx < -0.5) ch.facingRight = false;
}

function updateBall() {
  ball.vy += GRAVITY;
  ball.x  += ball.vx;
  ball.y  += ball.vy;

  // Floor bounce
  if (ball.y + ball.r > GROUND_Y) {
    ball.y  = GROUND_Y - ball.r;
    ball.vy = -ball.vy * 0.7;
    ball.vx *= 0.95;
    if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
  }

  // Ceiling bounce
  if (ball.y - ball.r < 0) {
    ball.y  = ball.r;
    ball.vy = Math.abs(ball.vy) * 0.8;
  }

  // Left wall (skip if in goal mouth)
  if (ball.x - ball.r < 0) {
    if (!(ball.y > GOAL_TOP && ball.y < GROUND_Y)) {
      ball.x  = ball.r;
      ball.vx = Math.abs(ball.vx) * 0.8;
    }
  }

  // Right wall (skip if in goal mouth)
  if (ball.x + ball.r > W) {
    if (!(ball.y > GOAL_TOP && ball.y < GROUND_Y)) {
      ball.x  = W - ball.r;
      ball.vx = -Math.abs(ball.vx) * 0.8;
    }
  }

  // Left goal top bar
  if (ball.x - ball.r < GOAL_W && ball.x + ball.r > 0) {
    if (Math.abs(ball.y - GOAL_TOP) < ball.r + 3 && ball.y < GOAL_TOP) {
      ball.y  = GOAL_TOP - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.7;
    }
  }
  // Right goal top bar
  if (ball.x + ball.r > W - GOAL_W && ball.x - ball.r < W) {
    if (Math.abs(ball.y - GOAL_TOP) < ball.r + 3 && ball.y < GOAL_TOP) {
      ball.y  = GOAL_TOP - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.7;
    }
  }

  // Goal side posts (only while ball is in goal-height band)
  if (ball.y > GOAL_TOP && ball.y < GROUND_Y) {
    if (Math.abs(ball.x - GOAL_W) < ball.r + 2 && ball.x > GOAL_W) {
      ball.x  = GOAL_W + ball.r + 2;
      ball.vx = Math.abs(ball.vx) * 0.7;
    }
    if (Math.abs(ball.x - (W - GOAL_W)) < ball.r + 2 && ball.x < W - GOAL_W) {
      ball.x  = W - GOAL_W - ball.r - 2;
      ball.vx = -Math.abs(ball.vx) * 0.7;
    }
  }

  // Cap speed
  const speed = Math.hypot(ball.vx, ball.vy);
  const MAX_SPEED = 12;
  if (speed > MAX_SPEED) {
    ball.vx = (ball.vx / speed) * MAX_SPEED;
    ball.vy = (ball.vy / speed) * MAX_SPEED;
  }

  ball.vx *= 0.999;
}

function handleCharBallCollision(ch) {
  const headX = ch.x;
  const headY = ch.y - CHAR_BODY_H - ch.radius;
  const dx    = ball.x - headX;
  const dy    = ball.y - headY;
  const dist  = Math.hypot(dx, dy);
  const minDist = ch.radius + ball.r;

  if (dist < minDist && dist > 0) {
    const nx      = dx / dist;
    const ny      = dy / dist;
    const overlap = minDist - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const relVx  = ball.vx - ch.vx;
    const relVy  = ball.vy - ch.vy;
    const relDot = relVx * nx + relVy * ny;

    if (relDot < 0) {
      const bounce = 1.3;
      ball.vx -= relDot * nx * bounce;
      ball.vy -= relDot * ny * bounce;
      ball.vx += ch.vx * 0.5;
      ball.vy += ch.vy * 0.3;
      spawnParticles(ball.x, ball.y, '#fff', 4);
    }
  }

  // Body collision (rectangle)
  const bodyTop   = ch.y - CHAR_BODY_H;
  const bodyLeft  = ch.x - ch.w / 2;
  const bodyRight = ch.x + ch.w / 2;

  if (ball.x + ball.r > bodyLeft && ball.x - ball.r < bodyRight &&
      ball.y + ball.r > bodyTop  && ball.y - ball.r < ch.y) {
    const fromLeft  = ball.x - bodyLeft;
    const fromRight = bodyRight - ball.x;
    const fromTop   = ball.y - bodyTop;

    if (fromTop < fromLeft && fromTop < fromRight) {
      ball.y  = bodyTop - ball.r;
      ball.vy = Math.min(ball.vy, ch.vy - 3);
    } else if (fromLeft < fromRight) {
      ball.x  = bodyLeft - ball.r;
      ball.vx = Math.min(ball.vx, -2);
    } else {
      ball.x  = bodyRight + ball.r;
      ball.vx = Math.max(ball.vx, 2);
    }
  }
}

function handleKick(ch) {
  const kickDir = ch.facingRight ? 1 : -1;
  const kickX   = ch.x + kickDir * (ch.w / 2 + 10);
  const kickY   = ch.y - CHAR_BODY_H / 2;
  const dx   = ball.x - kickX;
  const dy   = ball.y - kickY;
  const dist = Math.hypot(dx, dy);

  if (dist < 35) {
    const power = 8;
    const angle = Math.atan2(dy - 5, dx);
    ball.vx = Math.cos(angle) * power + ch.vx * 0.5;
    ball.vy = Math.sin(angle) * power - 2;
    spawnParticles(kickX, kickY, '#ff0', 6);
    ch.kickTimer = 0;
    ch.isKicking = false;
  }
}

function handleCharCharCollision() {
  const dx   = cpu.x - player.x;
  const dist = Math.abs(dx);
  const minD = player.w / 2 + cpu.w / 2 + 4;

  if (dist < minD) {
    const push = (minD - dist) / 2;
    const dir  = dx > 0 ? 1 : -1;
    player.x  -= dir * push;
    cpu.x     += dir * push;
    const avgVx = (player.vx + cpu.vx) / 2;
    player.vx = avgVx - dir * 0.5;
    cpu.vx    = avgVx + dir * 0.5;
  }
}

function updateAI() {
  const AI_SPEED      = 3.2;
  const AI_JUMP_SPEED = -8.5;

  const ballDist       = Math.abs(ball.x - cpu.x);
  const ballIsOnMySide = ball.x > W / 2 - 30;
  const ballComingToMe = ball.vx > 0;
  const ballAboveMe    = ball.y < cpu.y - 30;

  let targetX = cpu.x;
  if (ballIsOnMySide || ballComingToMe) {
    targetX = ball.x > cpu.x ? ball.x - 15 : ball.x + 15;
  } else {
    targetX = 420;
  }

  const diff = targetX - cpu.x;
  if (Math.abs(diff) > 5) {
    cpu.vx = Math.sign(diff) * AI_SPEED;
  } else {
    cpu.vx *= 0.7;
  }

  const shouldJump = (
    (ballDist < 80 && ballAboveMe && ball.y < GROUND_Y - 50) ||
    (ballDist < 60 && ball.y < cpu.y - 20) ||
    (ball.y < GROUND_Y - 100 && ballDist < 100 && ball.vy < 0)
  );
  if (shouldJump && cpu.onGround) {
    cpu.vy       = AI_JUMP_SPEED;
    cpu.onGround = false;
  }

  const kickDist = Math.hypot(ball.x - cpu.x, ball.y - (cpu.y - CHAR_RADIUS));
  if (kickDist < 50 && cpu.kickCooldown <= 0 && ball.x < cpu.x) {
    cpu.isKicking    = true;
    cpu.kickTimer    = 8;
    cpu.kickCooldown = 25;
  }
}

function checkGoals() {
  // Left goal — CPU scores
  if (ball.x < GOAL_W - 5 && ball.y > GOAL_TOP && ball.y < GROUND_Y) {
    cpu.score++;
    cpuScoreEl.textContent = cpu.score;
    goalMessage = 'CPU GOAL!';
    gameState   = 'goalPause';
    goalPause   = 90;
    spawnParticles(ball.x, ball.y, '#f54', 20);
    return;
  }
  // Right goal — Player scores
  if (ball.x > W - GOAL_W + 5 && ball.y > GOAL_TOP && ball.y < GROUND_Y) {
    player.score++;
    score = player.score;
    playerScoreEl.textContent = player.score;
    goalMessage = 'GOAL!';
    gameState   = 'goalPause';
    goalPause   = 90;
    spawnParticles(ball.x, ball.y, '#4af', 20);
    return;
  }
}

function stepParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.2;
    p.life -= 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Drawing helpers ──

// Build polygon points approximating an arc section
function arcPoints(cx, cy, r, startAngle, endAngle, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawGoal(renderer, x, isLeft) {
  if (isLeft) {
    renderer.drawLine(x + GOAL_W, GOAL_TOP, x, GOAL_TOP, '#ffffff', 3);
    renderer.drawLine(x, GOAL_TOP, x, GROUND_Y, '#ffffff', 3);
    for (let i = 0; i <= GOAL_H; i += 8) {
      renderer.drawLine(x, GOAL_TOP + i, x + GOAL_W, GOAL_TOP + i, 'rgba(255,255,255,0.15)', 1);
    }
    for (let i = 0; i <= GOAL_W; i += 8) {
      renderer.drawLine(x + i, GOAL_TOP, x + i, GROUND_Y, 'rgba(255,255,255,0.15)', 1);
    }
  } else {
    renderer.drawLine(x, GOAL_TOP, x + GOAL_W, GOAL_TOP, '#ffffff', 3);
    renderer.drawLine(x + GOAL_W, GOAL_TOP, x + GOAL_W, GROUND_Y, '#ffffff', 3);
    for (let i = 0; i <= GOAL_H; i += 8) {
      renderer.drawLine(x, GOAL_TOP + i, x + GOAL_W, GOAL_TOP + i, 'rgba(255,255,255,0.15)', 1);
    }
    for (let i = 0; i <= GOAL_W; i += 8) {
      renderer.drawLine(x + i, GOAL_TOP, x + i, GROUND_Y, 'rgba(255,255,255,0.15)', 1);
    }
  }
}

function drawBall(renderer) {
  // Shadow
  renderer.fillRect(ball.x - ball.r * 0.8, GROUND_Y + 1, ball.r * 1.6, 4, 'rgba(0,0,0,0.3)');

  renderer.setGlow('#ffffff', 0.5);
  renderer.fillCircle(ball.x, ball.y, ball.r, '#ffffff');
  renderer.setGlow(null);

  // Pattern dots
  renderer.fillCircle(ball.x - 2, ball.y - 2, 3,   '#cccccc');
  renderer.fillCircle(ball.x + 4, ball.y + 1, 2.5, '#cccccc');
  renderer.fillCircle(ball.x - 1, ball.y + 4, 2,   '#cccccc');
}

function drawCharacter(renderer, text, ch, bodyColor, headColor, label) {
  const x     = ch.x;
  const y     = ch.y;
  const headY = y - CHAR_BODY_H - ch.radius;

  // Ground shadow
  renderer.fillCircle(x, GROUND_Y + 3, ch.w / 2, 'rgba(0,0,0,0.3)');

  // Legs — animated with frame counter
  const legSpread = Math.sin(frameCount * (Math.PI / 30)) * (Math.abs(ch.vx) > 0.5 ? 6 : 0);
  renderer.drawLine(x - 5, y - 4, x - 8 - legSpread, y, bodyColor, 4);
  renderer.drawLine(x + 5, y - 4, x + 8 + legSpread, y, bodyColor, 4);

  // Body
  renderer.setGlow(bodyColor, 0.5);
  renderer.fillRect(x - ch.w / 2 + 4, y - CHAR_BODY_H, ch.w - 8, CHAR_BODY_H - 2, bodyColor);
  renderer.setGlow(null);

  // Arms
  const dir      = ch.facingRight ? 1 : -1;
  const armSwing = ch.isKicking ? -0.8 : Math.sin(frameCount * (Math.PI / 36)) * 0.3;

  // Back arm
  const backArmEndX = x - dir * 14;
  const backArmEndY = y - CHAR_BODY_H + 10 + Math.sin(armSwing + 1) * 5;
  renderer.drawLine(x - dir * 4, y - CHAR_BODY_H + 4, backArmEndX, backArmEndY, bodyColor, 3);

  // Front arm
  let frontArmEndX, frontArmEndY;
  if (ch.isKicking) {
    frontArmEndX = x + dir * 20;
    frontArmEndY = y - CHAR_BODY_H - 2;
  } else {
    frontArmEndX = x + dir * 14;
    frontArmEndY = y - CHAR_BODY_H + 10 + Math.sin(armSwing) * 5;
  }
  renderer.drawLine(x + dir * 4, y - CHAR_BODY_H + 4, frontArmEndX, frontArmEndY, bodyColor, 3);

  // Head
  renderer.setGlow(headColor, 0.6);
  renderer.fillCircle(x, headY, ch.radius, headColor);
  renderer.setGlow(null);

  // Hairband arc (top of head)
  const bandColor = (bodyColor === '#4aaaff') ? '#2a8af5' : '#dd4422';
  const bandPts   = arcPoints(x, headY, ch.radius, -Math.PI * 0.85, -Math.PI * 0.15, 10);
  renderer.strokePoly(bandPts, bandColor, 3, false);

  // Eyes
  const eyeDir = ch.facingRight ? 1 : -1;
  renderer.fillCircle(x + eyeDir * 6,  headY - 4, 5,   '#ffffff');
  renderer.fillCircle(x + eyeDir * 14, headY - 4, 4,   '#ffffff');
  renderer.fillCircle(x + eyeDir * 7,  headY - 4, 2.5, '#111111');
  renderer.fillCircle(x + eyeDir * 15, headY - 4, 2,   '#111111');

  // Mouth
  if (ch.isKicking) {
    const mouthPts = arcPoints(x + eyeDir * 10, headY + 6, 4, 0, Math.PI, 8);
    renderer.strokePoly(mouthPts, '#111111', 1.5, false);
  } else {
    renderer.drawLine(x + eyeDir * 6, headY + 7, x + eyeDir * 14, headY + 7, '#111111', 1.5);
  }

  // Label above head
  text.drawText(label, x, headY - ch.radius - 16, 10, '#ffffff', 'center');
}

function drawKickArc(renderer, ch) {
  const dir   = ch.facingRight ? 1 : -1;
  const kickX = ch.x + dir * (ch.w / 2 + 5);
  const kickY = ch.y - CHAR_BODY_H / 2;

  // Arc indicator — use semi-transparent yellow
  const startA = dir > 0 ? -0.8 : Math.PI - 0.8;
  const endA   = dir > 0 ?  0.8 : Math.PI + 0.8;
  const aPts   = arcPoints(kickX, kickY, 20, startA, endA, 10);
  renderer.strokePoly(aPts, '#ffff0066', 2, false);

  // Foot
  const footColor = (ch === player) ? '#4aafffff' : '#ff5544ff';
  renderer.fillCircle(ch.x + dir * 18, ch.y - 6, 5, footColor);
}

// ── Game export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    player      = createChar(150, true);
    cpu         = createChar(450, false);
    ball        = createBall(W / 2, 100);
    score       = 0;
    elapsed     = 0;
    goalPause   = 0;
    goalMessage = '';
    trail       = [];
    particles   = [];
    frameCount  = 0;
    gameState   = 'waiting';

    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent    = '0';
    timerEl.textContent       = '0:00';

    game.showOverlay('SOCCER HEADS', 'Arrow Keys = Move, Up = Jump, Space = Kick\nFirst to 5 goals wins!\n\nPress SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        gameState = 'playing';
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Goal pause countdown ──
    if (gameState === 'goalPause') {
      goalPause--;
      stepParticles();

      if (goalPause <= 0) {
        if (player.score >= WIN_SCORE || cpu.score >= WIN_SCORE) {
          if (player.score >= WIN_SCORE) {
            game.showOverlay('YOU WIN!', `${player.score} - ${cpu.score} -- Press SPACE to play again`);
          } else {
            game.showOverlay('CPU WINS!', `${player.score} - ${cpu.score} -- Press SPACE to play again`);
          }
          game.setState('over');
          return;
        }
        resetAfterGoal();
        gameState = 'playing';
      }
      return;
    }

    // ── Playing state ──
    frameCount++;
    elapsed += 1 / 60;

    const MOVE_SPEED  = 4;
    const JUMP_SPEED  = -8.5;

    // Player input
    if (input.isDown('ArrowLeft'))       player.vx = -MOVE_SPEED;
    else if (input.isDown('ArrowRight')) player.vx =  MOVE_SPEED;
    else                                 player.vx *= 0.7;

    if (input.isDown('ArrowUp') && player.onGround) {
      player.vy       = JUMP_SPEED;
      player.onGround = false;
    }

    if (input.wasPressed(' ') && player.kickCooldown <= 0) {
      player.isKicking    = true;
      player.kickTimer    = 8;
      player.kickCooldown = 20;
    }

    // AI
    updateAI();

    // Characters
    updateChar(player);
    updateChar(cpu);

    // Ball
    updateBall();

    // Head/body collisions with ball
    handleCharBallCollision(player);
    handleCharBallCollision(cpu);

    // Kick processing
    if (player.kickTimer > 0) {
      handleKick(player);
      player.kickTimer--;
      if (player.kickTimer <= 0) player.isKicking = false;
    }
    if (player.kickCooldown > 0) player.kickCooldown--;

    if (cpu.kickTimer > 0) {
      handleKick(cpu);
      cpu.kickTimer--;
      if (cpu.kickTimer <= 0) cpu.isKicking = false;
    }
    if (cpu.kickCooldown > 0) cpu.kickCooldown--;

    // Character-character collision
    handleCharCharCollision();

    // Goal detection
    checkGoals();

    // Timer DOM
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;

    // Ball trail
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > TRAIL_MAX) trail.shift();

    // Particles
    stepParticles();
  };

  game.onDraw = (renderer, text) => {
    // ── Background ──
    renderer.fillRect(0, 0, W, GROUND_Y, '#0a0a1e');
    renderer.fillRect(0, GROUND_Y, W, H - GROUND_Y, '#2a5a1a');

    // Ground line
    renderer.drawLine(0, GROUND_Y, W, GROUND_Y, '#44dd44', 2);

    // Field markings
    renderer.drawLine(W / 2, GROUND_Y - 2, W / 2, H, 'rgba(68,221,68,0.15)', 1);
    const centerArcPts = arcPoints(W / 2, GROUND_Y, 40, Math.PI, 2 * Math.PI, 20);
    renderer.strokePoly(centerArcPts, 'rgba(68,221,68,0.15)', 1, false);

    // Goals
    drawGoal(renderer, 0, true);
    drawGoal(renderer, W - GOAL_W, false);

    // Ball trail
    for (let i = 0; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.4;
      const r     = ball.r * (i / trail.length) * 0.7;
      if (r < 0.5) continue;
      // Build rgba string
      const a255 = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(trail[i].x, trail[i].y, r, `#ffffff${a255}`);
    }

    // Ball
    drawBall(renderer);

    // Characters
    drawCharacter(renderer, text, player, '#4aaaff', '#55bbff', 'P1');
    drawCharacter(renderer, text, cpu,    '#ff5544', '#ff6655', 'CPU');

    // Kick arcs
    if (player.isKicking) drawKickArc(renderer, player);
    if (cpu.isKicking)    drawKickArc(renderer, cpu);

    // Particles
    for (const p of particles) {
      const a    = p.life / p.maxLife;
      const a255 = Math.round(a * 255).toString(16).padStart(2, '0');
      const [r, g, b] = p.rgb;
      const rr = r.toString(16).padStart(2, '0');
      const gg = g.toString(16).padStart(2, '0');
      const bb = b.toString(16).padStart(2, '0');
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, `#${rr}${gg}${bb}${a255}`);
    }

    // Big score watermark
    text.drawText(`${player ? player.score : 0} - ${cpu ? cpu.score : 0}`, W / 2, 80, 80, '#44dd4409', 'center');

    // Goal message during pause
    if (gameState === 'goalPause' && goalMessage) {
      const msgColor = goalMessage === 'GOAL!' ? '#4aaaff' : '#ff5544';
      renderer.setGlow(msgColor, 0.8);
      text.drawText(goalMessage, W / 2, H / 2 - 30, 36, '#ffffff', 'center');
      renderer.setGlow(null);
      text.drawText(`${player.score} - ${cpu.score}`, W / 2, H / 2 + 10, 18, '#aaaaaa', 'center');
    }
  };

  game.start();
  return game;
}
