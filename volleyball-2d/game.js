// volleyball-2d/game.js — Volleyball 2D game logic for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// Physics constants
const GRAVITY = 0.4;
const GROUND_Y = 360;
const NET_X = 300;
const NET_TOP = 220;
const NET_WIDTH = 6;
const NET_BOTTOM = GROUND_Y;
const BALL_R = 12;
const SLIME_W = 50;
const SLIME_H = 40;
const BALL_FRICTION = 0.999;
const BALL_BOUNCE = 0.75;
const WALL_BOUNCE = 0.6;
const MAX_BALL_SPEED = 12;
const WIN_SCORE = 15;
const MAX_BOUNCES = 3;
const TRAIL_LEN = 12;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const matchInfo = document.getElementById('matchInfo');

// ── State ──
let gameState;
let score = 0;
let p1, p2, ball;
let p1Score, p2Score;
let serveSide;
let bouncesLeft, bouncesRight;
let scoreTimer;
let ballTrail;
let particles;
let lastScoredSide;

// ── Input ──
const keys = {};

// ── Helpers ──
function createPlayer(x, side) {
  return {
    x, y: GROUND_Y,
    vx: 0, vy: 0,
    side,
    onGround: true,
    color: side === 1 ? '#4af' : '#f64',
    spiking: false,
    spikeTimer: 0,
  };
}

function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, lastHitBy: 0 };
}

function resetRound() {
  p1 = createPlayer(150, 1);
  p2 = createPlayer(450, 2);
  bouncesLeft = 0;
  bouncesRight = 0;
  ballTrail = [];
  particles = [];
  ball = createBall(serveSide === 1 ? 150 : 450, 200);
  ball.lastHitBy = 0;
}

function clampBallSpeed() {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > MAX_BALL_SPEED) {
    ball.vx = (ball.vx / speed) * MAX_BALL_SPEED;
    ball.vy = (ball.vy / speed) * MAX_BALL_SPEED;
  }
}

// ── Particles ──
function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: 20 + Math.random() * 15, color });
  }
}

function spawnScoreParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, life: 30 + Math.random() * 20, color: Math.random() > 0.5 ? '#4af' : '#fff' });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Player update ──
function updatePlayer(player) {
  if (!player.onGround) player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.side === 1) {
    if (player.x - SLIME_W < 0) player.x = SLIME_W;
    if (player.x + SLIME_W > NET_X - NET_WIDTH / 2) player.x = NET_X - NET_WIDTH / 2 - SLIME_W;
  } else {
    if (player.x - SLIME_W < NET_X + NET_WIDTH / 2) player.x = NET_X + NET_WIDTH / 2 + SLIME_W;
    if (player.x + SLIME_W > W) player.x = W - SLIME_W;
  }

  if (player.onGround) player.vx *= 0.8;
  if (player.spikeTimer > 0) player.spikeTimer--;
  if (player.spikeTimer === 0) player.spiking = false;
}

function handlePlayerInput() {
  const MOVE_SPEED = 4;
  const JUMP_SPEED = -9.5;
  if (keys['ArrowLeft']) p1.vx = -MOVE_SPEED;
  else if (keys['ArrowRight']) p1.vx = MOVE_SPEED;
  if (keys['ArrowUp'] && p1.onGround) { p1.vy = JUMP_SPEED; p1.onGround = false; }
  if (keys['Space'] && !p1.spiking) { p1.spiking = true; p1.spikeTimer = 12; }
}

// ── AI ──
function predictBallLanding(bx, by, bvx, bvy) {
  let sx = bx, sy = by, svx = bvx, svy = bvy;
  for (let i = 0; i < 200; i++) {
    svy += GRAVITY;
    sx += svx;
    sy += svy;
    if (sx > NET_X - NET_WIDTH / 2 - BALL_R && sx < NET_X + NET_WIDTH / 2 + BALL_R && sy > NET_TOP) {
      svx = -svx * 0.7;
      sx = sx < NET_X ? NET_X - NET_WIDTH / 2 - BALL_R - 1 : NET_X + NET_WIDTH / 2 + BALL_R + 1;
    }
    if (sx - BALL_R < 0) { sx = BALL_R; svx = Math.abs(svx) * 0.7; }
    if (sx + BALL_R > W) { sx = W - BALL_R; svx = -Math.abs(svx) * 0.7; }
    if (sy + BALL_R >= GROUND_Y) return { x: sx, y: GROUND_Y - BALL_R, time: i };
  }
  return { x: sx, y: sy, time: 200 };
}

function updateAI() {
  const MOVE_SPEED = 3.8;
  const JUMP_SPEED = -9.5;

  const prediction = predictBallLanding(ball.x, ball.y, ball.vx, ball.vy);
  let targetX = prediction.x;

  const ballComingToAI = ball.vx > 0 || ball.x > NET_X;
  const ballOnAISide = ball.x > NET_X;

  if (!ballComingToAI && !ballOnAISide) {
    targetX = 450;
  } else {
    if (targetX < NET_X + NET_WIDTH / 2 + SLIME_W) targetX = NET_X + NET_WIDTH / 2 + SLIME_W + 20;
  }

  const dx = targetX - p2.x;
  if (Math.abs(dx) > 5) p2.vx = dx > 0 ? MOVE_SPEED : -MOVE_SPEED;
  else p2.vx = 0;

  const ballNear = Math.abs(ball.x - p2.x) < 80;
  const ballAbove = ball.y < p2.y - 20;
  const ballDescending = ball.vy > 0;
  const ballOnRightSide = ball.x > NET_X;

  if (p2.onGround && ballOnRightSide) {
    if (ballNear && ballAbove && ball.y < NET_TOP + 60 && ball.y > NET_TOP - 80) {
      p2.vy = JUMP_SPEED; p2.onGround = false;
    }
    if (ballNear && ball.y > GROUND_Y - 100 && ball.y < GROUND_Y - 30 && ballDescending) {
      p2.vy = JUMP_SPEED; p2.onGround = false;
    }
    if (Math.abs(ball.x - p2.x) < 50 && ball.y > GROUND_Y - 80 && ballDescending) {
      p2.vy = JUMP_SPEED; p2.onGround = false;
    }
  }

  if (!p2.onGround && Math.abs(ball.x - p2.x) < 60 && Math.abs(ball.y - (p2.y - SLIME_H)) < 50) {
    if (!p2.spiking && p2.vy < 2) { p2.spiking = true; p2.spikeTimer = 12; }
  }
}

// ── Ball-slime collision ──
function ballSlimeCollision(player) {
  const cx = player.x;
  const cy = player.y;
  const dx = ball.x - cx;
  const dy = ball.y - cy;

  if (dy > 5) return false;

  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = SLIME_W + BALL_R;

  if (dist < minDist && dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;

    ball.x = cx + nx * minDist;
    ball.y = cy + ny * minDist;

    const relVx = ball.vx - player.vx;
    const relVy = ball.vy - player.vy;
    const dot = relVx * nx + relVy * ny;

    if (dot < 0) {
      ball.vx = ball.vx - 2 * dot * nx + player.vx * 0.3;
      ball.vy = ball.vy - 2 * dot * ny + player.vy * 0.3;
      if (ball.vy > -3) ball.vy -= 2;

      if (player.spiking) {
        const spikeDir = player.side === 1 ? 1 : -1;
        ball.vx += spikeDir * 4;
        ball.vy -= 1;
        spawnHitParticles(ball.x, ball.y, '#ff0');
      } else {
        spawnHitParticles(ball.x, ball.y, player.color);
      }

      ball.lastHitBy = player.side;
      if (player.side === 1) bouncesLeft = 0;
      else bouncesRight = 0;
    }
    clampBallSpeed();
    return true;
  }
  return false;
}

// ── Scoring ──
function scorePoint(game, side) {
  if (side === 1) {
    p1Score++;
    score = p1Score;
    scoreEl.textContent = p1Score;
    serveSide = 1;
    lastScoredSide = 1;
  } else {
    p2Score++;
    bestEl.textContent = p2Score;
    serveSide = 2;
    lastScoredSide = 2;
  }

  spawnScoreParticles(ball.x, ball.y);

  if (p1Score >= WIN_SCORE) {
    gameState = 'over';
    score = p1Score;
    game.showOverlay('YOU WIN!', p1Score + ' - ' + p2Score + ' | Press any key to play again');
    game.setState('over');
    return;
  }
  if (p2Score >= WIN_SCORE) {
    gameState = 'over';
    score = p1Score;
    game.showOverlay('CPU WINS', p1Score + ' - ' + p2Score + ' | Press any key to play again');
    game.setState('over');
    return;
  }

  if (p1Score === WIN_SCORE - 1 || p2Score === WIN_SCORE - 1) {
    matchInfo.textContent = 'MATCH POINT';
    matchInfo.style.color = '#f44';
  } else {
    matchInfo.textContent = 'First to 15';
    matchInfo.style.color = '#aaa';
  }

  gameState = 'scored';
  scoreTimer = 60;
}

// ── Ball update ──
function updateBall(game) {
  ball.vy += GRAVITY;
  ball.x += ball.vx;
  ball.y += ball.vy;

  ballTrail.push({ x: ball.x, y: ball.y });
  if (ballTrail.length > TRAIL_LEN) ballTrail.shift();

  if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * WALL_BOUNCE; }
  if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; }
  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * WALL_BOUNCE; }

  const netLeft = NET_X - NET_WIDTH / 2;
  const netRight = NET_X + NET_WIDTH / 2;

  // Net top
  if (ball.y + BALL_R > NET_TOP && ball.y - BALL_R < NET_TOP + 10 &&
      ball.x + BALL_R > netLeft && ball.x - BALL_R < netRight) {
    if (ball.vy > 0) { ball.y = NET_TOP - BALL_R; ball.vy = -ball.vy * 0.6; }
  }

  // Net sides
  if (ball.y + BALL_R > NET_TOP && ball.y < NET_BOTTOM) {
    if (ball.x + BALL_R > netLeft && ball.x < NET_X && ball.vx > 0) {
      ball.x = netLeft - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
    }
    if (ball.x - BALL_R < netRight && ball.x > NET_X && ball.vx < 0) {
      ball.x = netRight + BALL_R; ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
    }
  }

  ballSlimeCollision(p1);
  ballSlimeCollision(p2);

  // Ground collision / scoring
  if (ball.y + BALL_R >= GROUND_Y) {
    ball.y = GROUND_Y - BALL_R;
    if (ball.x < NET_X) {
      bouncesLeft++;
      if (bouncesLeft > MAX_BOUNCES) { scorePoint(game, 2); return; }
      ball.vy = -ball.vy * BALL_BOUNCE;
      ball.vx *= 0.9;
      if (Math.abs(ball.vy) < 2) { scorePoint(game, 2); return; }
    } else {
      bouncesRight++;
      if (bouncesRight > MAX_BOUNCES) { scorePoint(game, 1); return; }
      ball.vy = -ball.vy * BALL_BOUNCE;
      ball.vx *= 0.9;
      if (Math.abs(ball.vy) < 2) { scorePoint(game, 1); return; }
    }
  }

  ball.vx *= BALL_FRICTION;
  clampBallSpeed();
}

// ── Draw helpers ──
function drawCourt(r) {
  // Sky
  r.fillRect(0, 0, W, GROUND_Y, '#0a1628');
  // Ground
  r.fillRect(0, GROUND_Y, W, H - GROUND_Y, '#1e3015');

  // Ground line
  r.fillRect(0, GROUND_Y, W, 2, '#ffffff26');

  // Center dashed line under net
  r.dashedLine(NET_X, GROUND_Y, NET_X, H, '#ffffff1a', 1, 4, 4);

  // Boundary lines
  r.fillRect(10, GROUND_Y + 2, 1, H - GROUND_Y - 2, '#ffffff1e');
  r.fillRect(W - 11, GROUND_Y + 2, 1, H - GROUND_Y - 2, '#ffffff1e');

  // Net body
  r.fillRect(NET_X - NET_WIDTH / 2, NET_TOP, NET_WIDTH, NET_BOTTOM - NET_TOP, '#ffffff');

  // Net crosshatch lines
  for (let y = NET_TOP; y < NET_BOTTOM; y += 10) {
    r.fillRect(NET_X - NET_WIDTH / 2, y, NET_WIDTH, 1, '#ffffff4d');
  }

  // Net top cap
  r.fillRect(NET_X - NET_WIDTH / 2 - 2, NET_TOP - 3, NET_WIDTH + 4, 6, '#cccccc');
}

function drawSlime(r, text, player) {
  const x = player.x;
  const y = player.y;
  const color = player.color;

  // Shadow
  r.fillCircle(x, GROUND_Y + 2, SLIME_W * 0.5, '#00000050');

  // Dome — use fillPoly to simulate half-circle (top half only)
  const steps = 20;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI + (i / steps) * Math.PI; // PI to 2PI (top half)
    pts.push({ x: x + Math.cos(angle) * SLIME_W, y: y + Math.sin(angle) * SLIME_W });
  }
  // Close the base
  pts.push({ x: x + SLIME_W, y: y });
  pts.push({ x: x - SLIME_W, y: y });

  // Fill color — slightly lighter at top
  const fillColor = player.side === 1 ? '#55ccff' : '#ff8855';
  r.fillPoly(pts, fillColor);

  // Outline glow
  r.setGlow(color, 0.6);
  r.strokePoly(pts, color, 2, false);
  r.setGlow(null);

  // Eye white
  const eyeX = x + (player.side === 1 ? 12 : -12);
  const eyeY = y - 18;
  r.fillCircle(eyeX, eyeY, 7, '#ffffff');

  // Pupil — track ball
  let pbx = ball.x - eyeX;
  let pby = ball.y - eyeY;
  const pd = Math.sqrt(pbx * pbx + pby * pby);
  if (pd > 0) { pbx /= pd; pby /= pd; }
  r.fillCircle(eyeX + pbx * 3, eyeY + pby * 3, 3.5, '#111111');

  // Spike indicator
  if (player.spiking) {
    r.setGlow('#ff0', 0.8);
    r.strokePoly([
      { x: x, y: y - SLIME_W - 14 },
      { x: x + 6, y: y - SLIME_W - 8 },
      { x: x, y: y - SLIME_W - 2 },
      { x: x - 6, y: y - SLIME_W - 8 },
    ], '#ffff00', 2, true);
    r.setGlow(null);
  }

  // Label
  text.drawText(player.side === 1 ? 'YOU' : 'CPU', x, y + 6, 10, '#ffffff66', 'center');
}

function drawBall(r) {
  // Trail
  for (let i = 0; i < ballTrail.length; i++) {
    const t = ballTrail[i];
    const alpha = Math.floor((i / ballTrail.length) * 0.4 * 255).toString(16).padStart(2, '0');
    const radius = BALL_R * (i / ballTrail.length) * 0.7;
    if (radius < 1) continue;
    r.fillCircle(t.x, t.y, radius, `#ffff96${alpha}`);
  }

  // Ground shadow
  if (ball.y < GROUND_Y - BALL_R) {
    let shadowScale = 1 - (GROUND_Y - ball.y) / 400;
    if (shadowScale < 0.2) shadowScale = 0.2;
    r.fillCircle(ball.x, GROUND_Y + 2, BALL_R * shadowScale * 0.6, '#00000033');
  }

  // Ball glow
  r.setGlow('#ffffc8', 0.5);
  r.fillCircle(ball.x, ball.y, BALL_R, '#eeeeaa');
  r.setGlow(null);

  // Highlight
  r.fillCircle(ball.x - 3, ball.y - 3, 4, '#ffffff88');

  // Seam arc (approximate with poly)
  const seamPts = [];
  for (let i = 0; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    seamPts.push({ x: ball.x + Math.cos(angle) * BALL_R * 0.7, y: ball.y + Math.sin(angle) * BALL_R * 0.7 });
  }
  r.strokePoly(seamPts, '#00000026', 1, true);
}

function drawParticles(r) {
  for (const p of particles) {
    const alpha = Math.floor(Math.min(1, p.life / 40) * 255).toString(16).padStart(2, '0');
    const base = p.color.length === 4 ? p.color.slice(0, 4) : p.color.slice(0, 7);
    r.fillRect(p.x - 2, p.y - 2, 4, 4, base + alpha);
  }
}

function drawBounceIndicator(text) {
  if (bouncesLeft > 0) {
    const col = bouncesLeft >= MAX_BOUNCES ? '#ff4444' : '#ffffff66';
    text.drawText('Bounces: ' + bouncesLeft + '/' + MAX_BOUNCES, NET_X / 2, GROUND_Y + 8, 11, col, 'center');
  }
  if (bouncesRight > 0) {
    const col = bouncesRight >= MAX_BOUNCES ? '#ff4444' : '#ffffff66';
    text.drawText('Bounces: ' + bouncesRight + '/' + MAX_BOUNCES, NET_X + (W - NET_X) / 2, GROUND_Y + 8, 11, col, 'center');
  }
}

function drawScoreBoardText(r) {
  // Ghost scoreboard - simulate low-alpha big numbers with filled rects as pixel-art digits
  // Keep it simple: just two large colored transparent rectangles as score zone markers
  // (text.js doesn't support alpha; skip decorative ghost text)
}

function drawControls(text) {
  text.drawText('\u2190\u2192 Move  \u2191 Jump  SPACE Spike', W / 2, H - 14, 9, '#ffffff40', 'center');
}

function drawServeIndicator(r, text) {
  if (gameState === 'serving') {
    text.drawText('Press any key to serve', W / 2, 16, 14, '#4aaeff', 'center');

    // Downward arrow above ball
    const bx = ball.x;
    const by = ball.y - BALL_R - 15;
    r.setGlow('#4af', 0.4);
    r.drawLine(bx, by, bx, by + 8, '#4aaeff', 2);
    r.drawLine(bx - 4, by + 4, bx, by + 8, '#4aaeff', 2);
    r.drawLine(bx + 4, by + 4, bx, by + 8, '#4aaeff', 2);
    r.setGlow(null);
  }
}

// ── Game factory ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    p1Score = 0;
    p2Score = 0;
    score = 0;
    serveSide = 1;
    lastScoredSide = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    matchInfo.textContent = 'First to 15';
    matchInfo.style.color = '#aaa';
    resetRound();
    gameState = 'waiting';
    game.showOverlay('VOLLEYBALL 2D', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Input: key events direct on document ──
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (gameState === 'waiting' || gameState === 'over') {
      gameState = 'serving';
      p1Score = 0; p2Score = 0; score = 0;
      serveSide = 1;
      scoreEl.textContent = '0';
      bestEl.textContent = '0';
      matchInfo.textContent = 'First to 15';
      matchInfo.style.color = '#aaa';
      resetRound();
      game.setState('playing');
      game.hideOverlay();
      return;
    }
    if (gameState === 'serving') {
      gameState = 'playing';
      if (serveSide === 1) { ball.vy = -7; ball.vx = 1.5; }
      else { ball.vy = -7; ball.vx = -1.5; }
      ball.lastHitBy = serveSide;
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Click to start/serve
  game.canvas.addEventListener('click', () => {
    if (gameState === 'waiting' || gameState === 'over') {
      gameState = 'serving';
      p1Score = 0; p2Score = 0; score = 0;
      serveSide = 1;
      scoreEl.textContent = '0';
      bestEl.textContent = '0';
      matchInfo.textContent = 'First to 15';
      matchInfo.style.color = '#aaa';
      resetRound();
      game.setState('playing');
      game.hideOverlay();
    } else if (gameState === 'serving') {
      gameState = 'playing';
      if (serveSide === 1) { ball.vy = -7; ball.vx = 1.5; }
      else { ball.vy = -7; ball.vx = -1.5; }
      ball.lastHitBy = serveSide;
    }
  });

  game.onUpdate = () => {
    if (gameState === 'playing') {
      handlePlayerInput();
      updateAI();
      updatePlayer(p1);
      updatePlayer(p2);
      updateBall(game);
    } else if (gameState === 'serving') {
      handlePlayerInput();
      updateAI();
      updatePlayer(p1);
      updatePlayer(p2);
      // Ball floats above server
      if (serveSide === 1) { ball.x = p1.x; ball.y = p1.y - SLIME_W - BALL_R - 20; }
      else { ball.x = p2.x; ball.y = p2.y - SLIME_W - BALL_R - 20; }
    } else if (gameState === 'scored') {
      scoreTimer--;
      if (scoreTimer <= 0) {
        gameState = 'serving';
        resetRound();
      }
    }
    updateParticles();
  };

  game.onDraw = (r, text) => {
    drawCourt(r);
    drawScoreBoardText(r);
    drawSlime(r, text, p1);
    drawSlime(r, text, p2);
    drawBall(r);
    drawParticles(r);
    drawBounceIndicator(text);
    drawControls(text);
    drawServeIndicator(r, text);
  };

  game.start();
  return game;
}
