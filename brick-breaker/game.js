// brick-breaker/game.js — Brick Breaker roguelike ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// Theme
const THEME = '#e48';

// Paddle constants
const BASE_PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 7;

// Ball constants
const BALL_R = 6;
const BASE_BALL_SPEED = 4;

// Brick constants
const BRICK_COLS = 10;
const BRICK_W = (W - 20) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_TOP = 60;
const BRICK_PAD = 2;

// Brick colors by type
const BRICK_COLORS = {
  normal: '#e48',
  tough: '#f80',
  hard: '#f44',
  gold: '#ff0'
};

// Power-up definitions
const POWERUPS = [
  { id: 'multiball', name: 'MULTI-BALL', desc: 'Split into 3 balls', icon: '***', color: '#0ff' },
  { id: 'wide', name: 'WIDE PADDLE', desc: 'Paddle 50% wider', icon: '<->', color: '#0f0' },
  { id: 'fireball', name: 'FIREBALL', desc: 'Ball destroys without bouncing', icon: '(~)', color: '#f44' },
  { id: 'sticky', name: 'STICKY PADDLE', desc: 'Ball sticks on catch', icon: '[=]', color: '#ff0' },
  { id: 'extralife', name: 'EXTRA LIFE', desc: '+1 life', icon: '<3', color: '#f0f' },
  { id: 'speeddown', name: 'SLOW BALL', desc: 'Ball moves slower', icon: '>>>', color: '#88f' }
];

// ── State ──
let score, best = 0;
let lives, room, scoreMultiplier;
let paddleX, paddleW;
let balls; // array of {x, y, vx, vy, speed, fireball, stuck, stuckOffset}
let bricks; // array of {x, y, w, h, hp, maxHp, type, alive}
let hasFireball, hasSticky;
let stickyBall;
let choosingPowerup, powerupChoices, selectedPowerup;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const roomEl = document.getElementById('room');
const livesEl = document.getElementById('lives');

// ── Room generation ──
function generateRoom(roomNum) {
  const brickArr = [];
  const pattern = (roomNum - 1) % 7;
  const rows = Math.min(5 + Math.floor(roomNum / 2), 10);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      let hp = 1;
      let type = 'normal';
      let alive = true;

      switch (pattern) {
        case 0: // Full grid
          if (roomNum > 2 && r < 2) { hp = 2; type = 'tough'; }
          break;
        case 1: // Checkerboard
          if ((r + c) % 2 === 0) { alive = false; }
          if (r === 0) { hp = 2; type = 'tough'; }
          break;
        case 2: // Diamond
          {
            const midR = rows / 2, midC = BRICK_COLS / 2;
            const dist = Math.abs(r - midR) + Math.abs(c - midC);
            if (dist > Math.max(midR, midC)) { alive = false; }
            if (dist <= 2) { hp = 3; type = 'hard'; }
          }
          break;
        case 3: // Stripes
          if (c % 3 === 1) { alive = false; }
          if (r < 2) { hp = 2; type = 'tough'; }
          break;
        case 4: // Fortress walls
          if (r >= 2 && r <= rows - 3 && c >= 2 && c <= BRICK_COLS - 3) { alive = false; }
          if (r === 0 || r === rows - 1 || c === 0 || c === BRICK_COLS - 1) { hp = 2; type = 'tough'; }
          if ((r === 0 || r === rows - 1) && (c === 0 || c === BRICK_COLS - 1)) { hp = 3; type = 'hard'; }
          break;
        case 5: // Zigzag
          if ((r % 2 === 0 && c < 2) || (r % 2 === 1 && c >= BRICK_COLS - 2)) { alive = false; }
          if (r % 3 === 0) { hp = 2; type = 'tough'; }
          break;
        case 6: // Cross
          {
            const midR2 = Math.floor(rows / 2), midC2 = Math.floor(BRICK_COLS / 2);
            if (r !== midR2 && c !== midC2 && c !== midC2 - 1) { alive = false; }
            if (r === midR2 && (c === midC2 || c === midC2 - 1)) { hp = 3; type = 'hard'; }
            else if (r === midR2 || c === midC2 || c === midC2 - 1) { hp = 2; type = 'tough'; }
          }
          break;
      }

      // Scale difficulty with room number
      if (roomNum > 4 && alive && Math.random() < 0.1 * (roomNum - 4)) {
        hp = Math.min(hp + 1, 3);
        type = hp === 3 ? 'hard' : 'tough';
      }

      // Rare gold bricks worth bonus points
      if (alive && Math.random() < 0.05) {
        type = 'gold';
        hp = 1;
      }

      if (alive) {
        const bx = 10 + c * BRICK_W + BRICK_PAD;
        const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;
        brickArr.push({ x: bx, y: by, w: bw, h: bh, hp, maxHp: hp, type, alive: true });
      }
    }
  }
  return brickArr;
}

function resetBall() {
  const speed = BASE_BALL_SPEED;
  if (hasSticky) {
    const ball = {
      x: paddleX + paddleW / 2,
      y: PADDLE_Y - BALL_R - 1,
      vx: 0, vy: 0, speed,
      fireball: hasFireball,
      stuck: true,
      stuckOffset: 0
    };
    balls = [ball];
    stickyBall = ball;
  } else {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    balls = [{
      x: paddleX + paddleW / 2,
      y: PADDLE_Y - BALL_R - 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      fireball: hasFireball,
      stuck: false,
      stuckOffset: 0
    }];
    stickyBall = null;
  }
}

function launchStuckBall() {
  if (stickyBall && stickyBall.stuck) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    stickyBall.vx = Math.cos(angle) * stickyBall.speed;
    stickyBall.vy = Math.sin(angle) * stickyBall.speed;
    stickyBall.stuck = false;
    stickyBall = null;
  }
}

function startPowerupChoice() {
  choosingPowerup = true;
  const shuffled = [...POWERUPS].sort(() => Math.random() - 0.5);
  powerupChoices = shuffled.slice(0, 3);
  selectedPowerup = 0;
}

function applyPowerup(pu) {
  switch (pu.id) {
    case 'multiball':
      break;
    case 'wide':
      paddleW = Math.min(paddleW * 1.5, W * 0.6);
      paddleX = Math.max(0, Math.min(W - paddleW, paddleX));
      break;
    case 'fireball':
      hasFireball = true;
      break;
    case 'sticky':
      hasSticky = true;
      break;
    case 'extralife':
      lives++;
      livesEl.textContent = lives;
      break;
    case 'speeddown':
      break;
  }

  // Advance room
  room++;
  scoreMultiplier = 1 + (room - 1) * 0.25;
  roomEl.textContent = room;
  bricks = generateRoom(room);
  choosingPowerup = false;

  // Reset ball for new room
  resetBall();

  // Handle multi-ball: add 2 extra balls
  if (pu.id === 'multiball' && balls.length > 0) {
    const base = balls[0];
    if (base.stuck) {
      launchStuckBall();
    }
    for (let i = 0; i < 2; i++) {
      const angle = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5);
      balls.push({
        x: base.x,
        y: base.y,
        vx: Math.cos(angle) * base.speed,
        vy: Math.sin(angle) * base.speed,
        speed: base.speed,
        fireball: hasFireball,
        stuck: false,
        stuckOffset: 0
      });
    }
  }

  // Handle speed down
  if (pu.id === 'speeddown') {
    balls.forEach(b => {
      const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (currentSpeed > 0) {
        const newSpeed = Math.max(currentSpeed * 0.7, 2);
        b.vx = (b.vx / currentSpeed) * newSpeed;
        b.vy = (b.vy / currentSpeed) * newSpeed;
        b.speed = newSpeed;
      }
    });
  }
}

// ── Word wrap helper (returns array of lines) ──
function wordWrap(str, maxChars) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (test.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    room = 1;
    scoreMultiplier = 1;
    paddleW = BASE_PADDLE_W;
    paddleX = W / 2 - paddleW / 2;
    hasFireball = false;
    hasSticky = false;
    stickyBall = null;
    choosingPowerup = false;
    powerupChoices = [];
    selectedPowerup = 0;
    bricks = generateRoom(1);
    resetBall();
    scoreEl.textContent = '0';
    roomEl.textContent = '1';
    livesEl.textContent = '3';
    game.showOverlay('BRICK BREAKER', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Power-up selection input
    if (choosingPowerup) {
      if (input.wasPressed('ArrowLeft')) {
        selectedPowerup = (selectedPowerup - 1 + powerupChoices.length) % powerupChoices.length;
      } else if (input.wasPressed('ArrowRight')) {
        selectedPowerup = (selectedPowerup + 1) % powerupChoices.length;
      } else if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        applyPowerup(powerupChoices[selectedPowerup]);
      } else if (input.wasPressed('1')) {
        if (0 < powerupChoices.length) applyPowerup(powerupChoices[0]);
      } else if (input.wasPressed('2')) {
        if (1 < powerupChoices.length) applyPowerup(powerupChoices[1]);
      } else if (input.wasPressed('3')) {
        if (2 < powerupChoices.length) applyPowerup(powerupChoices[2]);
      }
      return;
    }

    // Launch stuck ball
    if (input.wasPressed(' ')) {
      launchStuckBall();
    }

    // Move paddle
    if (input.isDown('ArrowLeft') || input.isDown('a')) paddleX -= PADDLE_SPEED;
    if (input.isDown('ArrowRight') || input.isDown('d')) paddleX += PADDLE_SPEED;
    paddleX = Math.max(0, Math.min(W - paddleW, paddleX));

    // Update stuck ball position
    if (stickyBall && stickyBall.stuck) {
      stickyBall.x = paddleX + paddleW / 2 + stickyBall.stuckOffset;
      stickyBall.y = PADDLE_Y - BALL_R - 1;
    }

    // Update each ball
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      if (ball.stuck) continue;

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R >= W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

      // Paddle collision
      if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
          ball.x >= paddleX - 2 && ball.x <= paddleX + paddleW + 2) {
        if (hasSticky && !stickyBall) {
          ball.stuck = true;
          ball.stuckOffset = ball.x - (paddleX + paddleW / 2);
          ball.vx = 0;
          ball.vy = 0;
          ball.y = PADDLE_Y - BALL_R - 1;
          stickyBall = ball;
        } else {
          ball.y = PADDLE_Y - BALL_R;
          const hit = (ball.x - paddleX) / paddleW;
          const angle = -Math.PI * (0.15 + 0.7 * (1 - hit));
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = Math.cos(angle) * speed;
          ball.vy = Math.sin(angle) * speed;
        }
      }

      // Ball falls below paddle
      if (ball.y - BALL_R > H) {
        balls.splice(i, 1);
        continue;
      }

      // Brick collisions
      for (let j = bricks.length - 1; j >= 0; j--) {
        const brick = bricks[j];
        if (!brick.alive) continue;

        if (ball.x + BALL_R > brick.x && ball.x - BALL_R < brick.x + brick.w &&
            ball.y + BALL_R > brick.y && ball.y - BALL_R < brick.y + brick.h) {

          brick.hp--;
          if (brick.hp <= 0) {
            brick.alive = false;
            const points = brick.type === 'gold' ? 50 : (brick.maxHp * 10);
            score += Math.round(points * scoreMultiplier);
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
            }
          }

          if (!ball.fireball) {
            // Determine bounce direction
            const overlapLeft = (ball.x + BALL_R) - brick.x;
            const overlapRight = (brick.x + brick.w) - (ball.x - BALL_R);
            const overlapTop = (ball.y + BALL_R) - brick.y;
            const overlapBottom = (brick.y + brick.h) - (ball.y - BALL_R);
            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);
            if (minOverlapX < minOverlapY) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }
            break; // Only one brick collision per frame for normal balls
          }
          // Fireball plows through -- no bounce, no break
        }
      }
    }

    // All balls lost
    if (balls.length === 0) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        game.showOverlay('GAME OVER', `Score: ${score} | Room ${room} -- Press SPACE`);
        game.setState('over');
        return;
      }
      hasFireball = false;
      stickyBall = null;
      resetBall();
    }

    // Check room clear
    const allDead = bricks.every(b => !b.alive);
    if (allDead) {
      startPowerupChoice();
    }
  };

  game.onDraw = (renderer, text) => {
    // ── Draw bricks ──
    for (const brick of bricks) {
      if (!brick.alive) continue;
      let color;
      if (brick.type === 'gold') {
        color = BRICK_COLORS.gold;
      } else if (brick.hp >= 3) {
        color = BRICK_COLORS.hard;
      } else if (brick.hp >= 2) {
        color = BRICK_COLORS.tough;
      } else {
        color = BRICK_COLORS.normal;
      }
      renderer.setGlow(color, 0.3);
      renderer.fillRect(brick.x, brick.y, brick.w, brick.h, color);

      // Show HP indicator for multi-hit bricks
      if (brick.maxHp > 1 && brick.hp > 0) {
        text.drawText(String(brick.hp), brick.x + brick.w / 2, brick.y + 1, 10, '#1a1a2e', 'center');
      }
    }
    renderer.setGlow(null);

    // ── Draw paddle ──
    renderer.setGlow(THEME, 0.6);
    renderer.fillRect(paddleX, PADDLE_Y, paddleW, PADDLE_H, THEME);
    renderer.setGlow(null);

    // Sticky indicator on paddle
    if (hasSticky) {
      renderer.fillRect(paddleX, PADDLE_Y, paddleW, 2, '#ff0');
    }

    // ── Draw balls ──
    for (const ball of balls) {
      if (ball.fireball) {
        renderer.setGlow('#f44', 1.0);
        renderer.fillCircle(ball.x, ball.y, BALL_R, '#f44');
      } else {
        renderer.setGlow(THEME, 0.7);
        renderer.fillCircle(ball.x, ball.y, BALL_R, '#fff');
      }
    }
    renderer.setGlow(null);

    // ── Lives indicator (bottom right) ──
    renderer.setGlow(THEME, 0.3);
    for (let i = 0; i < lives; i++) {
      renderer.fillCircle(W - 20 - i * 18, H - 15, 5, THEME);
    }
    renderer.setGlow(null);

    // ── Room multiplier display ──
    if (scoreMultiplier > 1) {
      text.drawText('x' + scoreMultiplier.toFixed(2), 10, H - 22, 12, '#ff0', 'left');
    }

    // ── Active power-up indicators (top right) ──
    let puY = 20;
    if (hasFireball) {
      text.drawText('FIRE', W - 8, puY, 10, '#f44', 'right');
      puY += 14;
    }
    if (hasSticky) {
      text.drawText('STICKY', W - 8, puY, 10, '#ff0', 'right');
      puY += 14;
    }
    if (paddleW > BASE_PADDLE_W) {
      text.drawText('WIDE', W - 8, puY, 10, '#0f0', 'right');
    }

    // ── Power-up selection screen ──
    if (choosingPowerup) {
      // Dim overlay background
      renderer.fillRect(0, 0, W, H, 'rgba(26, 26, 46, 0.88)');

      // Title
      renderer.setGlow(THEME, 0.5);
      text.drawText('ROOM ' + room + ' CLEARED!', W / 2, 120, 24, THEME, 'center');
      renderer.setGlow(null);

      text.drawText('Choose a power-up (1/2/3 or Left/Right + Space)', W / 2, 160, 14, '#aaa', 'center');

      // Draw power-up cards
      const cardW = 130;
      const cardH = 140;
      const gap = 15;
      const totalW = powerupChoices.length * cardW + (powerupChoices.length - 1) * gap;
      const startX = (W - totalW) / 2;

      for (let i = 0; i < powerupChoices.length; i++) {
        const pu = powerupChoices[i];
        const cx = startX + i * (cardW + gap);
        const cy = 210;
        const isSelected = i === selectedPowerup;

        // Card background
        const bgColor = isSelected ? '#16213e' : '#0d1525';
        renderer.fillRect(cx, cy, cardW, cardH, bgColor);

        // Card border (using lines)
        const borderColor = isSelected ? pu.color : '#0f3460';
        const bw = isSelected ? 3 : 1;
        if (isSelected) {
          renderer.setGlow(pu.color, 0.7);
        }
        // Top, bottom, left, right borders
        renderer.drawLine(cx, cy, cx + cardW, cy, borderColor, bw);
        renderer.drawLine(cx, cy + cardH, cx + cardW, cy + cardH, borderColor, bw);
        renderer.drawLine(cx, cy, cx, cy + cardH, borderColor, bw);
        renderer.drawLine(cx + cardW, cy, cx + cardW, cy + cardH, borderColor, bw);
        renderer.setGlow(null);

        // Number label
        const numColor = isSelected ? pu.color : '#555';
        text.drawText('[' + (i + 1) + ']', cx + cardW / 2, cy + 8, 12, numColor, 'center');

        // Icon
        text.drawText(pu.icon, cx + cardW / 2, cy + 34, 20, pu.color, 'center');

        // Name
        text.drawText(pu.name, cx + cardW / 2, cy + 62, 11, pu.color, 'center');

        // Description (word-wrapped)
        const descLines = wordWrap(pu.desc, 14);
        let lineY = cy + 86;
        for (const line of descLines) {
          text.drawText(line, cx + cardW / 2, lineY, 10, '#aaa', 'center');
          lineY += 14;
        }
      }
    }
  };

  game.start();
  return game;
}
