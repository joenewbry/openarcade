// gravity-pong/game.js — Gravity Pong (Asteroids × Air Hockey) WebGL v2

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;
const GOAL_DEPTH = 22;  // goal zone height at top/bottom
const WIN_SCORE = 5;

const FRICTION = 0.985;
const SHIP_ACCEL = 0.35;
const ROT_SPEED = 0.07;  // radians per frame
const BRAKE_FACTOR = 0.88;
const MAX_SPEED = 7;

const PUCK_R = 8;
const SHIP_R = 12;
const AST_R = 18;

// DOM refs
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl    = document.getElementById('cpuScore');
const winMsgEl      = document.getElementById('winMsg');

let player, cpu, puck, asteroids;
let playerScore, cpuScore;

function makeShip(x, y, angle) {
  return { x, y, vx: 0, vy: 0, angle, r: SHIP_R };
}

function makePuck() {
  return {
    x: W / 2,
    y: H / 2,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() > 0.5 ? 1 : -1) * 2,
    r: PUCK_R,
  };
}

function makeAsteroids() {
  const rocks = [];
  for (let i = 0; i < 4; i++) {
    rocks.push({
      x: 80 + (i % 2) * 320 + Math.random() * 60 - 30,
      y: 160 + Math.floor(i / 2) * 160 + Math.random() * 40 - 20,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      r: AST_R,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
    });
  }
  return rocks;
}

function clampSpeed(obj) {
  const spd = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
  if (spd > MAX_SPEED) {
    obj.vx = (obj.vx / spd) * MAX_SPEED;
    obj.vy = (obj.vy / spd) * MAX_SPEED;
  }
}

function elasticBounce(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const minDist = a.r + b.r;
  // Separate
  const overlap = minDist - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;
  // Exchange velocity along normal
  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const dot = dvx * nx + dvy * ny;
  if (dot > 0) return; // already separating
  a.vx += dot * nx;
  a.vy += dot * ny;
  b.vx -= dot * nx;
  b.vy -= dot * ny;
}

function shipHitPuck(ship, p) {
  const dx = p.x - ship.x;
  const dy = p.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < ship.r + p.r) {
    elasticBounce(ship, p);
    // Give puck some of ship velocity
    p.vx += ship.vx * 0.4;
    p.vy += ship.vy * 0.4;
    clampSpeed(p);
  }
}

function wrapAsteroid(a) {
  if (a.x < -a.r) a.x = W + a.r;
  if (a.x > W + a.r) a.x = -a.r;
  if (a.y < -a.r) a.y = H + a.r;
  if (a.y > H + a.r) a.y = -a.r;
}

// Asteroid vs anything (ship, puck) — reflect
function asteroidHit(ast, obj) {
  const dx = obj.x - ast.x;
  const dy = obj.y - ast.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < ast.r + obj.r) {
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const overlap = ast.r + obj.r - dist;
    obj.x += nx * (overlap + 1);
    obj.y += ny * (overlap + 1);
    const dot = obj.vx * nx + obj.vy * ny;
    obj.vx -= 2 * dot * nx;
    obj.vy -= 2 * dot * ny;
    obj.vx *= 0.8; obj.vy *= 0.8;
  }
}

// CPU AI: steer toward puck
function updateCPU() {
  const targetX = puck.x;
  const targetY = puck.y;
  const dx = targetX - cpu.x;
  const dy = targetY - cpu.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Desired angle
  const desiredAngle = Math.atan2(dy, dx) - Math.PI / 2;
  let dAngle = desiredAngle - cpu.angle;
  // Normalize
  while (dAngle > Math.PI)  dAngle -= Math.PI * 2;
  while (dAngle < -Math.PI) dAngle += Math.PI * 2;
  // Rotate
  if (Math.abs(dAngle) > 0.1) {
    cpu.angle += Math.sign(dAngle) * ROT_SPEED * 1.2;
  }
  // Thrust if not too close
  if (dist > 40) {
    cpu.vx += Math.sin(cpu.angle) * SHIP_ACCEL * 0.8;
    cpu.vy -= Math.cos(cpu.angle) * SHIP_ACCEL * 0.8;
  }
  cpu.vx *= FRICTION;
  cpu.vy *= FRICTION;
  clampSpeed(cpu);
  cpu.x += cpu.vx;
  cpu.y += cpu.vy;
  // Keep CPU roughly in top half
  if (cpu.y > H / 2 - 20 && cpu.y < H / 2) cpu.vy -= 0.5;
  cpu.x = Math.max(cpu.r, Math.min(W - cpu.r, cpu.x));
  cpu.y = Math.max(cpu.r, Math.min(H / 2, cpu.y));
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    player = makeShip(W / 2, H * 3 / 4, 0);
    cpu    = makeShip(W / 2, H / 4, Math.PI);
    puck   = makePuck();
    asteroids = makeAsteroids();
    playerScore = 0; cpuScore = 0;
    playerScoreEl.textContent = '0';
    cpuScoreEl.textContent = '0';
    winMsgEl.style.display = 'none';
    game.showOverlay('GRAVITY PONG', '← → rotate  ↑ thrust  Space brake');
    game.setState('waiting');
  };

  game.setScoreFn(() => playerScore);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed(' ') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }
    if (game.state === 'over') {
      if (input.wasPressed(' ')) game.onInit();
      return;
    }

    // ── Player ship ──
    if (input.isDown('ArrowLeft'))  player.angle -= ROT_SPEED;
    if (input.isDown('ArrowRight')) player.angle += ROT_SPEED;
    if (input.isDown('ArrowUp')) {
      player.vx += Math.sin(player.angle) * SHIP_ACCEL;
      player.vy -= Math.cos(player.angle) * SHIP_ACCEL;
    }
    if (input.isDown(' ')) {
      player.vx *= BRAKE_FACTOR;
      player.vy *= BRAKE_FACTOR;
    }
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    clampSpeed(player);
    player.x += player.vx;
    player.y += player.vy;
    // Clamp to lower half (player's goal area is bottom)
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(H / 2, Math.min(H - player.r, player.y));

    // ── CPU ship ──
    updateCPU();

    // ── Puck physics ──
    puck.x += puck.vx;
    puck.y += puck.vy;

    // Wall bounces (sides)
    if (puck.x - puck.r <= 0)  { puck.x = puck.r;     puck.vx = Math.abs(puck.vx); }
    if (puck.x + puck.r >= W)  { puck.x = W - puck.r; puck.vx = -Math.abs(puck.vx); }

    // Goal zones
    if (puck.y - puck.r <= GOAL_DEPTH) {
      // Puck entered CPU goal (top)
      playerScore++;
      playerScoreEl.textContent = playerScore;
      checkWin();
      if (game.state !== 'over') resetRound();
      return;
    }
    if (puck.y + puck.r >= H - GOAL_DEPTH) {
      // Puck entered player goal (bottom)
      cpuScore++;
      cpuScoreEl.textContent = cpuScore;
      checkWin();
      if (game.state !== 'over') resetRound();
      return;
    }

    // Bounce off top/bottom walls (beyond goal)
    if (puck.y - puck.r <= 0)  { puck.y = puck.r;     puck.vy = Math.abs(puck.vy); }
    if (puck.y + puck.r >= H)  { puck.y = H - puck.r; puck.vy = -Math.abs(puck.vy); }

    // ── Ship/puck collision ──
    shipHitPuck(player, puck);
    shipHitPuck(cpu, puck);

    // ── Asteroids ──
    for (const ast of asteroids) {
      ast.x += ast.vx;
      ast.y += ast.vy;
      ast.angle += ast.spin;
      wrapAsteroid(ast);
      asteroidHit(ast, player);
      asteroidHit(ast, cpu);
      asteroidHit(ast, puck);
    }
  };

  function checkWin() {
    if (playerScore >= WIN_SCORE) {
      game.showOverlay('YOU WIN!', `${playerScore} - ${cpuScore}  •  Space to play again`);
      game.setState('over');
    } else if (cpuScore >= WIN_SCORE) {
      game.showOverlay('CPU WINS', `${playerScore} - ${cpuScore}  •  Space to play again`);
      game.setState('over');
    } else {
      winMsgEl.style.display = 'block';
    }
  }

  function resetRound() {
    puck = makePuck();
    player = makeShip(W / 2, H * 3 / 4, 0);
    cpu    = makeShip(W / 2, H / 4, Math.PI);
  }

  game.onDraw = (renderer, text) => {
    const COLOR = '#0cf';

    // Goal zones
    renderer.fillRect(0, 0, W, GOAL_DEPTH, '#001824');
    renderer.fillRect(0, H - GOAL_DEPTH, W, GOAL_DEPTH, '#001824');
    text.drawText('CPU GOAL', W / 2, 4, 12, '#0cf60', 'center');
    text.drawText('PLAYER GOAL', W / 2, H - GOAL_DEPTH + 4, 12, '#0cf60', 'center');

    // Center line
    renderer.dashedLine(0, H / 2, W, H / 2, '#0c3040', 2, 8, 8);

    // Asteroids
    for (const ast of asteroids) {
      renderer.setGlow('#888', 0.3);
      // Draw rough hexagon polygon
      const pts = [];
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const a = ast.angle + (i / sides) * Math.PI * 2;
        const jr = ast.r * (0.75 + ((i * 7 + 3) % 5) * 0.07);
        pts.push(ast.x + Math.cos(a) * jr, ast.y + Math.sin(a) * jr);
      }
      renderer.fillPoly(pts, '#445');
    }

    // Puck
    renderer.setGlow('#fff', 0.8);
    renderer.fillCircle(puck.x, puck.y, puck.r, '#ddf');

    // Draw CPU ship (triangle, pointing down — it's in top half)
    drawShip(renderer, cpu, '#f84', 0.7);

    // Draw player ship (triangle, pointing up)
    drawShip(renderer, player, COLOR, 0.9);

    renderer.setGlow(null);
  };

  function drawShip(renderer, ship, color, glow) {
    renderer.setGlow(color, glow);
    const a = ship.angle;
    const tip  = [ship.x + Math.sin(a) * ship.r,       ship.y - Math.cos(a) * ship.r];
    const left = [ship.x + Math.sin(a - 2.4) * ship.r * 0.7, ship.y - Math.cos(a - 2.4) * ship.r * 0.7];
    const right= [ship.x + Math.sin(a + 2.4) * ship.r * 0.7, ship.y - Math.cos(a + 2.4) * ship.r * 0.7];
    renderer.fillPoly([tip[0], tip[1], left[0], left[1], right[0], right[1]], color);
  }

  game.start();
  return game;
}
