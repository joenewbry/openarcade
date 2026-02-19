// pinball/game.js — Pinball game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 350;
const H = 600;

// Physics constants
const GRAVITY = 0.15;
const FRICTION = 0.999;
const BALL_RADIUS = 6;
const FLIPPER_LENGTH = 50;
const FLIPPER_WIDTH = 8;
const FLIPPER_PIVOT_Y = H - 55;
const FLIPPER_REST_ANGLE = 0.4;
const FLIPPER_UP_ANGLE = -0.6;
const FLIPPER_SPEED = 0.25;

// Table geometry
const TABLE_LEFT = 15;
const TABLE_RIGHT = W - 15;
const TABLE_TOP = 15;
const LAUNCHER_X = TABLE_RIGHT - 18;
const LAUNCHER_WIDTH = 20;
const LAUNCHER_WALL_X = TABLE_RIGHT - LAUNCHER_WIDTH - 8;

// Flipper pivots
const LEFT_FLIPPER_X = 85;
const RIGHT_FLIPPER_X = W - 85;

// ── State ──
let score, best = 0, balls;
let ballObj, launching, launchPower, launchHeld;
let leftFlipperAngle, rightFlipperAngle;
let leftFlipperTarget, rightFlipperTarget;
let prevLeftAngle, prevRightAngle;
let bumpers, dropTargets, dropTargetSets, rollovers, spinner;
let slingshots;
let multiplier, multiball, multiballBalls;
let nudgeCount, tiltWarning, tilted, tiltCooldown;
let bonusText;
let dropTargetResetTimers, rolloverResetTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const ballsEl = document.getElementById('balls');

// ── Helper: frame-based timer queue (replaces setTimeout) ──
let timers = [];
function scheduleTimer(frames, callback) {
  timers.push({ frames, callback });
}
function updateTimers() {
  for (let i = timers.length - 1; i >= 0; i--) {
    timers[i].frames--;
    if (timers[i].frames <= 0) {
      timers[i].callback();
      timers.splice(i, 1);
    }
  }
}

// ── Factory functions ──

function createBumpers() {
  return [
    { x: W / 2, y: 150, r: 22, points: 100, hitTimer: 0, color: '#f44' },
    { x: W / 2 - 60, y: 200, r: 20, points: 100, hitTimer: 0, color: '#4f4' },
    { x: W / 2 + 60, y: 200, r: 20, points: 100, hitTimer: 0, color: '#48f' },
    { x: W / 2 - 30, y: 270, r: 18, points: 150, hitTimer: 0, color: '#f0f' },
    { x: W / 2 + 30, y: 270, r: 18, points: 150, hitTimer: 0, color: '#fc6' },
  ];
}

function createDropTargets() {
  const set1 = [
    { x: 50, y: 160, w: 6, h: 20, hit: false, points: 200 },
    { x: 50, y: 185, w: 6, h: 20, hit: false, points: 200 },
    { x: 50, y: 210, w: 6, h: 20, hit: false, points: 200 },
  ];
  const set2 = [
    { x: W - 56, y: 160, w: 6, h: 20, hit: false, points: 200 },
    { x: W - 56, y: 185, w: 6, h: 20, hit: false, points: 200 },
    { x: W - 56, y: 210, w: 6, h: 20, hit: false, points: 200 },
  ];
  return [set1, set2];
}

function createRollovers() {
  return [
    { x: 100, y: 80, w: 20, hit: false, points: 50 },
    { x: 155, y: 80, w: 20, hit: false, points: 50 },
    { x: 210, y: 80, w: 20, hit: false, points: 50 },
  ];
}

function createSpinner() {
  return { x: W / 2, y: 110, w: 30, angle: 0, spinSpeed: 0, points: 10 };
}

function createSlingshots() {
  return [
    {
      x1: TABLE_LEFT + 15, y1: FLIPPER_PIVOT_Y - 80,
      x2: TABLE_LEFT + 15, y2: FLIPPER_PIVOT_Y - 10,
      x3: LEFT_FLIPPER_X - 10, y3: FLIPPER_PIVOT_Y - 10,
      hitTimer: 0, points: 10
    },
    {
      x1: TABLE_RIGHT - LAUNCHER_WIDTH - 23, y1: FLIPPER_PIVOT_Y - 80,
      x2: TABLE_RIGHT - LAUNCHER_WIDTH - 23, y2: FLIPPER_PIVOT_Y - 10,
      x3: RIGHT_FLIPPER_X + 10, y3: FLIPPER_PIVOT_Y - 10,
      hitTimer: 0, points: 10
    }
  ];
}

function createBall(x, y, vx, vy) {
  return { x, y, vx: vx || 0, vy: vy || 0, active: true };
}

// ── Score helpers ──

function addScore(pts) {
  const gained = pts * multiplier;
  score += gained;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  return gained;
}

function addBonusText(x, y, txt) {
  bonusText.push({ x, y, text: txt, timer: 60, oy: 0 });
}

// ── Physics helpers ──

function reflectBallOffCircle(ball, cx, cy, cr, bounceFactor) {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = cx + nx * (cr + BALL_RADIUS + 1);
  ball.y = cy + ny * (cr + BALL_RADIUS + 1);
  const dot = ball.vx * nx + ball.vy * ny;
  ball.vx -= 2 * dot * nx;
  ball.vy -= 2 * dot * ny;
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed < bounceFactor) {
    ball.vx = nx * bounceFactor;
    ball.vy = ny * bounceFactor;
  } else {
    ball.vx *= 1.05;
    ball.vy *= 1.05;
  }
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  let t = (apx * abx + apy * aby) / (abx * abx + aby * aby);
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * abx, y: ay + t * aby };
}

function reflectBallOffSegment(ball, ax, ay, bx, by, bounceFactor) {
  const cp = closestPointOnSegment(ball.x, ball.y, ax, ay, bx, by);
  const dx = ball.x - cp.x;
  const dy = ball.y - cp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return false;
  if (dist > BALL_RADIUS + 2) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = cp.x + nx * (BALL_RADIUS + 2);
  ball.y = cp.y + ny * (BALL_RADIUS + 2);
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot > 0) return false;
  ball.vx -= 2 * dot * nx;
  ball.vy -= 2 * dot * ny;
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed < bounceFactor) {
    ball.vx += nx * bounceFactor * 0.5;
    ball.vy += ny * bounceFactor * 0.5;
  }
  return true;
}

function getFlipperEndpoints(pivotX, pivotY, angle, side) {
  const dir = side === 'left' ? 1 : -1;
  const endX = pivotX + Math.cos(angle * dir) * FLIPPER_LENGTH * dir;
  const endY = pivotY - Math.sin(angle * dir) * FLIPPER_LENGTH;
  return { px: pivotX, py: pivotY, ex: endX, ey: endY };
}

function handleFlipperCollision(ball, pivotX, pivotY, angle, pAngle, side) {
  const fp = getFlipperEndpoints(pivotX, pivotY, angle, side);
  const cp = closestPointOnSegment(ball.x, ball.y, fp.px, fp.py, fp.ex, fp.ey);
  const dx = ball.x - cp.x;
  const dy = ball.y - cp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < BALL_RADIUS + FLIPPER_WIDTH / 2 + 1) {
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : -1;
    ball.x = cp.x + nx * (BALL_RADIUS + FLIPPER_WIDTH / 2 + 2);
    ball.y = cp.y + ny * (BALL_RADIUS + FLIPPER_WIDTH / 2 + 2);
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
    const angularVel = angle - pAngle;
    if (Math.abs(angularVel) > 0.02) {
      const contactDist = Math.sqrt((cp.x - pivotX) ** 2 + (cp.y - pivotY) ** 2);
      const boost = angularVel * contactDist * 0.15;
      ball.vy -= Math.abs(boost) * 3;
      ball.vx += (side === 'left' ? 1 : -1) * Math.abs(boost) * 1.5;
    }
    if (ball.vy > -2) ball.vy = -2;
    return true;
  }
  return false;
}

// ── Ball physics update ──

function updateBallPhysics(ball) {
  if (!ball.active) return;
  if (tilted) {
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y > H + 20) ball.active = false;
    return;
  }

  ball.vy += GRAVITY;
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall collisions
  if (ball.x - BALL_RADIUS < TABLE_LEFT) {
    ball.x = TABLE_LEFT + BALL_RADIUS;
    ball.vx = Math.abs(ball.vx) * 0.8;
  }
  if (ball.y < FLIPPER_PIVOT_Y - 100) {
    if (ball.x + BALL_RADIUS > TABLE_RIGHT) {
      ball.x = TABLE_RIGHT - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.8;
    }
  } else {
    if (ball.x < LAUNCHER_WALL_X && ball.x + BALL_RADIUS > LAUNCHER_WALL_X) {
      if (!launching) {
        ball.x = LAUNCHER_WALL_X - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * 0.8;
      }
    }
    if (ball.x + BALL_RADIUS > TABLE_RIGHT) {
      ball.x = TABLE_RIGHT - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.8;
    }
  }
  if (ball.y - BALL_RADIUS < TABLE_TOP) {
    ball.y = TABLE_TOP + BALL_RADIUS;
    ball.vy = Math.abs(ball.vy) * 0.8;
  }

  // Launcher wall barrier
  if (ball.y > FLIPPER_PIVOT_Y - 100 && ball.y < FLIPPER_PIVOT_Y) {
    if (ball.x + BALL_RADIUS > LAUNCHER_WALL_X && ball.x < LAUNCHER_WALL_X) {
      ball.x = LAUNCHER_WALL_X - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * 0.6;
    }
  }

  // Top curve guide rails
  const curveCenter = { x: TABLE_RIGHT - 40, y: TABLE_TOP + 40 };
  const curveDist = Math.sqrt((ball.x - curveCenter.x) ** 2 + (ball.y - curveCenter.y) ** 2);
  if (curveDist > 45 && ball.x > W / 2 + 50 && ball.y < TABLE_TOP + 80) {
    reflectBallOffCircle(ball, curveCenter.x, curveCenter.y, 45, 1);
  }

  // Bumper collisions
  for (const bumper of bumpers) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bumper.r + BALL_RADIUS) {
      reflectBallOffCircle(ball, bumper.x, bumper.y, bumper.r, 4);
      bumper.hitTimer = 15;
      const pts = addScore(bumper.points);
      addBonusText(bumper.x, bumper.y - bumper.r - 10, `+${pts}`);
    }
  }

  // Drop target collisions
  for (const dt of dropTargets) {
    if (dt.hit) continue;
    if (ball.x + BALL_RADIUS > dt.x && ball.x - BALL_RADIUS < dt.x + dt.w &&
        ball.y + BALL_RADIUS > dt.y && ball.y - BALL_RADIUS < dt.y + dt.h) {
      dt.hit = true;
      if (dt.x < W / 2) {
        ball.vx = Math.abs(ball.vx) + 2;
      } else {
        ball.vx = -Math.abs(ball.vx) - 2;
      }
      const pts = addScore(dt.points);
      addBonusText(dt.x, dt.y - 10, `+${pts}`);

      for (const set of dropTargetSets) {
        if (set.every(t => t.hit)) {
          addScore(2000);
          multiplier = Math.min(multiplier + 1, 5);
          addBonusText(set[1].x, set[1].y - 30, `${multiplier}x MULTI!`);
          // Reset after ~3 seconds (180 frames at 60fps)
          const capturedSet = set;
          scheduleTimer(180, () => {
            capturedSet.forEach(t => t.hit = false);
          });
        }
      }
    }
  }

  // Rollover lanes
  for (const ro of rollovers) {
    if (ball.x > ro.x && ball.x < ro.x + ro.w && ball.y > ro.y - 5 && ball.y < ro.y + 10) {
      if (!ro.hit) {
        ro.hit = true;
        addScore(ro.points);
        addBonusText(ro.x + ro.w / 2, ro.y - 15, `+${ro.points * multiplier}`);
        if (rollovers.every(r => r.hit)) {
          addScore(1000);
          addBonusText(W / 2, ro.y - 30, 'ALL LANES BONUS!');
          if (!multiball) {
            multiball = true;
            multiballBalls.push(createBall(ball.x - 15, ball.y, -2, -3));
            multiballBalls.push(createBall(ball.x + 15, ball.y, 2, -3));
            addBonusText(W / 2, H / 2, 'MULTIBALL!');
          }
          // Reset after ~5 seconds (300 frames)
          scheduleTimer(300, () => {
            rollovers.forEach(r => r.hit = false);
          });
        }
      }
    }
  }

  // Spinner
  const sdx = ball.x - spinner.x;
  const sdy = ball.y - spinner.y;
  if (Math.abs(sdx) < spinner.w / 2 + BALL_RADIUS && Math.abs(sdy) < 8 + BALL_RADIUS) {
    spinner.spinSpeed = Math.abs(ball.vy) * 0.5 + Math.abs(ball.vx) * 0.3;
    addScore(spinner.points);
    ball.vy *= 0.7;
  }

  // Slingshot collisions
  for (const sl of slingshots) {
    const hit1 = reflectBallOffSegment(ball, sl.x1, sl.y1, sl.x2, sl.y2, 5);
    const hit2 = reflectBallOffSegment(ball, sl.x2, sl.y2, sl.x3, sl.y3, 5);
    const hit3 = reflectBallOffSegment(ball, sl.x3, sl.y3, sl.x1, sl.y1, 5);
    if (hit1 || hit2 || hit3) {
      sl.hitTimer = 10;
      addScore(sl.points);
    }
  }

  // Flipper collisions (initial pass — will be re-done with prev angle in update)
  handleFlipperCollision(ball, LEFT_FLIPPER_X, FLIPPER_PIVOT_Y, leftFlipperAngle, leftFlipperAngle, 'left');
  handleFlipperCollision(ball, RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y, rightFlipperAngle, rightFlipperAngle, 'right');

  // Out-slants
  reflectBallOffSegment(ball, TABLE_LEFT, FLIPPER_PIVOT_Y - 80, LEFT_FLIPPER_X - 20, FLIPPER_PIVOT_Y, 1);
  reflectBallOffSegment(ball, LAUNCHER_WALL_X, FLIPPER_PIVOT_Y - 80, RIGHT_FLIPPER_X + 20, FLIPPER_PIVOT_Y, 1);

  // Drain detection
  if (ball.y > H + 10) {
    ball.active = false;
  }
}

// ── Lose ball / Game over ──

let gameRef; // will be set in createGame

function loseBall() {
  balls--;
  ballsEl.textContent = balls;
  if (balls <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    gameRef.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    gameRef.setState('over');
    return;
  }
  launching = true;
  launchPower = 0;
  launchHeld = false;
  tilted = false;
  tiltWarning = false;
  nudgeCount = 0;
  multiplier = 1;
  multiball = false;
  multiballBalls = [];
  ballObj = createBall(LAUNCHER_X, H - 60, 0, 0);
}

// ── Expose for ML ──
let gameDataCounter = 0;
window.gameData = {};

function updateGameData() {
  gameDataCounter++;
  if (gameDataCounter % 6 !== 0) return; // ~every 100ms at 60fps
  window.gameData = {
    ballX: ballObj.x,
    ballY: ballObj.y,
    ballVX: ballObj.vx,
    ballVY: ballObj.vy,
    leftFlipper: leftFlipperAngle,
    rightFlipper: rightFlipperAngle,
    launching,
    launchPower,
    multiplier,
    multiball,
    tilted,
    balls,
    score
  };
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');
  gameRef = game;

  game.onInit = () => {
    score = 0;
    balls = 3;
    scoreEl.textContent = '0';
    ballsEl.textContent = balls;
    multiplier = 1;
    multiball = false;
    multiballBalls = [];
    nudgeCount = 0;
    tiltWarning = false;
    tilted = false;
    tiltCooldown = 0;
    bonusText = [];
    timers = [];
    launching = true;
    launchPower = 0;
    launchHeld = false;
    leftFlipperAngle = FLIPPER_REST_ANGLE;
    rightFlipperAngle = FLIPPER_REST_ANGLE;
    leftFlipperTarget = FLIPPER_REST_ANGLE;
    rightFlipperTarget = FLIPPER_REST_ANGLE;
    prevLeftAngle = FLIPPER_REST_ANGLE;
    prevRightAngle = FLIPPER_REST_ANGLE;
    bumpers = createBumpers();
    dropTargetSets = createDropTargets();
    dropTargets = dropTargetSets.flat();
    rollovers = createRollovers();
    spinner = createSpinner();
    slingshots = createSlingshots();
    ballObj = createBall(LAUNCHER_X, H - 60, 0, 0);
    gameDataCounter = 0;
    game.showOverlay('PINBALL', 'Hold SPACE to launch');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        launching = true;
        launchPower = 0;
        launchHeld = false;
        ballObj = createBall(LAUNCHER_X, H - 60, 0, 0);
        if (input.isDown(' ')) {
          launchHeld = true;
        }
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

    // Tilt cooldown
    if (tilted) {
      tiltCooldown--;
      if (tiltCooldown <= 0) {
        tilted = false;
      }
    }

    // Flipper input
    if (input.isDown('ArrowLeft')) {
      leftFlipperTarget = -FLIPPER_UP_ANGLE;
    } else {
      leftFlipperTarget = FLIPPER_REST_ANGLE;
    }
    if (input.isDown('ArrowRight')) {
      rightFlipperTarget = -FLIPPER_UP_ANGLE;
    } else {
      rightFlipperTarget = FLIPPER_REST_ANGLE;
    }

    // Launch input
    if (input.isDown(' ') && launching) {
      launchHeld = true;
    }
    if (input.wasReleased(' ') && launching && launchHeld) {
      launchHeld = false;
      launching = false;
      const power = launchPower / 100;
      ballObj.vy = -(3 + power * 10);
      ballObj.vx = -0.5;
      launchPower = 0;
    }

    // Nudge
    if (input.wasPressed('ArrowUp')) {
      if (!tilted) {
        nudgeCount++;
        if (nudgeCount >= 4) {
          tilted = true;
          tiltCooldown = 180;
          leftFlipperTarget = FLIPPER_REST_ANGLE;
          rightFlipperTarget = FLIPPER_REST_ANGLE;
        } else if (nudgeCount >= 2) {
          tiltWarning = true;
          tiltCooldown = 120;
        }
        ballObj.vy -= 1.5;
        ballObj.vx += (Math.random() - 0.5) * 2;
        for (const mb of multiballBalls) {
          mb.vy -= 1;
          mb.vx += (Math.random() - 0.5) * 2;
        }
      }
    }

    // Launcher
    if (launching) {
      if (launchHeld) {
        launchPower = Math.min(launchPower + 0.8, 100);
      }
      ballObj.x = LAUNCHER_X;
      ballObj.y = H - 60 + (launchPower * 0.15);
      ballObj.vx = 0;
      ballObj.vy = 0;
      return;
    }

    // Store previous flipper angles
    prevLeftAngle = leftFlipperAngle;
    prevRightAngle = rightFlipperAngle;

    // Animate flippers
    if (leftFlipperAngle < leftFlipperTarget) {
      leftFlipperAngle = Math.min(leftFlipperAngle + FLIPPER_SPEED, leftFlipperTarget);
    } else {
      leftFlipperAngle = Math.max(leftFlipperAngle - FLIPPER_SPEED, leftFlipperTarget);
    }
    if (rightFlipperAngle < rightFlipperTarget) {
      rightFlipperAngle = Math.min(rightFlipperAngle + FLIPPER_SPEED, rightFlipperTarget);
    } else {
      rightFlipperAngle = Math.max(rightFlipperAngle - FLIPPER_SPEED, rightFlipperTarget);
    }

    // Update main ball
    updateBallPhysics(ballObj);

    // Re-do flipper collision with proper prev angle
    handleFlipperCollision(ballObj, LEFT_FLIPPER_X, FLIPPER_PIVOT_Y, leftFlipperAngle, prevLeftAngle, 'left');
    handleFlipperCollision(ballObj, RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y, rightFlipperAngle, prevRightAngle, 'right');

    // Multiball balls
    for (const mb of multiballBalls) {
      if (!mb.active) continue;
      updateBallPhysics(mb);
      handleFlipperCollision(mb, LEFT_FLIPPER_X, FLIPPER_PIVOT_Y, leftFlipperAngle, prevLeftAngle, 'left');
      handleFlipperCollision(mb, RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y, rightFlipperAngle, prevRightAngle, 'right');
    }

    // Remove inactive multiball balls
    multiballBalls = multiballBalls.filter(b => b.active);
    if (multiballBalls.length === 0 && multiball) {
      multiball = false;
    }

    // Spinner decay
    if (spinner.spinSpeed > 0) {
      spinner.angle += spinner.spinSpeed;
      spinner.spinSpeed *= 0.97;
      if (spinner.spinSpeed < 0.1) spinner.spinSpeed = 0;
    }

    // Bumper hit timers
    for (const b of bumpers) {
      if (b.hitTimer > 0) b.hitTimer--;
    }
    for (const s of slingshots) {
      if (s.hitTimer > 0) s.hitTimer--;
    }

    // Bonus text
    for (let i = bonusText.length - 1; i >= 0; i--) {
      bonusText[i].timer--;
      bonusText[i].oy -= 0.8;
      if (bonusText[i].timer <= 0) bonusText.splice(i, 1);
    }

    // Frame-based timers
    updateTimers();

    // Check main ball drain
    if (!ballObj.active) {
      if (multiballBalls.length > 0) {
        ballObj = multiballBalls.shift();
      } else {
        loseBall();
      }
    }

    // Nudge cooldown
    if (tiltWarning) {
      tiltCooldown--;
      if (tiltCooldown <= 0) {
        tiltWarning = false;
        nudgeCount = Math.max(0, nudgeCount - 1);
      }
    }

    // ML game data
    updateGameData();
  };

  game.onDraw = (renderer, text) => {
    // Table border
    renderer.drawLine(TABLE_LEFT, TABLE_TOP, TABLE_RIGHT, TABLE_TOP, '#0f3460', 2);
    renderer.drawLine(TABLE_LEFT, TABLE_TOP, TABLE_LEFT, H, '#0f3460', 2);
    renderer.drawLine(TABLE_RIGHT, TABLE_TOP, TABLE_RIGHT, H, '#0f3460', 2);

    // Launcher lane background
    renderer.fillRect(LAUNCHER_WALL_X, FLIPPER_PIVOT_Y - 100, LAUNCHER_WIDTH + 8, H - FLIPPER_PIVOT_Y + 100, '#16213e');
    renderer.drawLine(LAUNCHER_WALL_X, FLIPPER_PIVOT_Y - 100, LAUNCHER_WALL_X, H, '#0f3460', 1);

    // Launch power indicator
    if (launching && launchPower > 0) {
      const barH = (launchPower / 100) * 80;
      const hue = 40 - launchPower * 0.4;
      // Approximate hsl color: goes from gold to red
      const r = 255;
      const g = Math.max(0, Math.round(204 - launchPower * 2));
      const b2 = 0;
      const hexR = r.toString(16).padStart(2, '0');
      const hexG = g.toString(16).padStart(2, '0');
      const hexB = b2.toString(16).padStart(2, '0');
      const barColor = `#${hexR}${hexG}${hexB}`;
      renderer.setGlow('#fc6', 0.4);
      renderer.fillRect(LAUNCHER_X - 5, H - 30 - barH, 10, barH, barColor);
      renderer.setGlow(null);
    }

    // Slingshots
    for (const sl of slingshots) {
      const slColor = sl.hitTimer > 0 ? '#fff' : '#fc6';
      const slFillColor = sl.hitTimer > 0 ? '#fc6' : '#33291a';
      const pts = [
        { x: sl.x1, y: sl.y1 },
        { x: sl.x2, y: sl.y2 },
        { x: sl.x3, y: sl.y3 },
      ];
      renderer.fillPoly(pts, slFillColor);
      if (sl.hitTimer > 0) {
        renderer.setGlow('#fff', 0.7);
      } else {
        renderer.setGlow('#fc6', 0.3);
      }
      renderer.strokePoly(pts, slColor, 2, true);
      renderer.setGlow(null);
    }

    // Out-slants
    renderer.drawLine(TABLE_LEFT, FLIPPER_PIVOT_Y - 80, LEFT_FLIPPER_X - 20, FLIPPER_PIVOT_Y, '#0f3460', 3);
    renderer.drawLine(LAUNCHER_WALL_X, FLIPPER_PIVOT_Y - 80, RIGHT_FLIPPER_X + 20, FLIPPER_PIVOT_Y, '#0f3460', 3);

    // Bumpers
    for (const b of bumpers) {
      const glowing = b.hitTimer > 0;
      const outerColor = glowing ? '#fff' : b.color;
      const innerColor = glowing ? b.color : '#1a1a2e';
      const dotColor = glowing ? '#fff' : b.color;

      if (glowing) {
        renderer.setGlow('#fff', 0.8);
      } else {
        renderer.setGlow(b.color, 0.5);
      }
      renderer.fillCircle(b.x, b.y, b.r, outerColor);
      renderer.setGlow(null);
      renderer.fillCircle(b.x, b.y, b.r * 0.6, innerColor);
      renderer.fillCircle(b.x, b.y, 3, dotColor);
    }

    // Drop targets
    for (const dt of dropTargets) {
      if (dt.hit) {
        renderer.fillRect(dt.x, dt.y, dt.w, dt.h, '#33291a');
      } else {
        renderer.setGlow('#fc6', 0.4);
        renderer.fillRect(dt.x, dt.y, dt.w, dt.h, '#fc6');
        renderer.setGlow(null);
      }
    }

    // Rollover lanes
    for (const ro of rollovers) {
      const roColor = ro.hit ? '#fc6' : '#0f3460';
      if (ro.hit) {
        renderer.setGlow('#fc6', 0.5);
      }
      renderer.fillRect(ro.x, ro.y, ro.w, 3, roColor);
      // Arrow indicator (small triangle below the lane)
      const arrowPts = [
        { x: ro.x + ro.w / 2, y: ro.y + 8 },
        { x: ro.x + ro.w / 2 - 5, y: ro.y + 15 },
        { x: ro.x + ro.w / 2 + 5, y: ro.y + 15 },
      ];
      renderer.fillPoly(arrowPts, roColor);
      if (ro.hit) {
        renderer.setGlow(null);
      }
    }

    // Spinner
    const spinColor = spinner.spinSpeed > 1 ? '#fc6' : '#888';
    if (spinner.spinSpeed > 1) {
      renderer.setGlow('#fc6', 0.5);
    }
    // Draw spinner as a rotated line
    const cosA = Math.cos(spinner.angle);
    const sinA = Math.sin(spinner.angle);
    const hw = spinner.w / 2;
    renderer.drawLine(
      spinner.x - cosA * hw, spinner.y - sinA * hw,
      spinner.x + cosA * hw, spinner.y + sinA * hw,
      spinColor, 2
    );
    if (spinner.spinSpeed > 1) {
      renderer.setGlow(null);
    }

    // Flippers
    if (!tilted) {
      const lfp = getFlipperEndpoints(LEFT_FLIPPER_X, FLIPPER_PIVOT_Y, leftFlipperAngle, 'left');
      const rfp = getFlipperEndpoints(RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y, rightFlipperAngle, 'right');
      renderer.setGlow('#fc6', 0.5);
      renderer.drawLine(lfp.px, lfp.py, lfp.ex, lfp.ey, '#fc6', FLIPPER_WIDTH);
      renderer.drawLine(rfp.px, rfp.py, rfp.ex, rfp.ey, '#fc6', FLIPPER_WIDTH);
      renderer.setGlow(null);
    } else {
      // Tilted: dim flippers at rest angle
      const lfp = getFlipperEndpoints(LEFT_FLIPPER_X, FLIPPER_PIVOT_Y, FLIPPER_REST_ANGLE, 'left');
      const rfp = getFlipperEndpoints(RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y, FLIPPER_REST_ANGLE, 'right');
      renderer.drawLine(lfp.px, lfp.py, lfp.ex, lfp.ey, '#554422', FLIPPER_WIDTH);
      renderer.drawLine(rfp.px, rfp.py, rfp.ex, rfp.ey, '#554422', FLIPPER_WIDTH);
    }

    // Drain area
    renderer.fillRect(LEFT_FLIPPER_X - 10, FLIPPER_PIVOT_Y + 15, RIGHT_FLIPPER_X - LEFT_FLIPPER_X + 20, 8, '#0a0a18');

    // Draw balls
    drawBallGfx(renderer, ballObj);
    for (const mb of multiballBalls) {
      drawBallGfx(renderer, mb);
    }

    // Multiplier display
    if (multiplier > 1) {
      renderer.setGlow('#fc6', 0.4);
      text.drawText(`${multiplier}x MULTIPLIER`, W / 2, H - 22, 14, '#fc6', 'center');
      renderer.setGlow(null);
    }

    // Multiball indicator
    if (multiball) {
      renderer.setGlow('#f0f', 0.5);
      text.drawText('MULTIBALL', W / 2, 30, 12, '#f0f', 'center');
      renderer.setGlow(null);
    }

    // Tilt warning
    if (tiltWarning && !tilted) {
      text.drawText('WARNING', W / 2, H / 2 - 8, 16, '#f44', 'center');
    }
    if (tilted) {
      renderer.setGlow('#f44', 0.6);
      text.drawText('TILT', W / 2, H / 2 - 12, 24, '#f44', 'center');
      renderer.setGlow(null);
    }

    // Bonus text
    for (const bt of bonusText) {
      const alpha = Math.min(1, bt.timer / 20);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      text.drawText(bt.text, bt.x, bt.y + bt.oy, 12, `#ffcc66${alphaHex}`, 'center');
    }

    // Ball count indicator (small dots at bottom-left)
    for (let i = 0; i < balls - 1; i++) {
      renderer.setGlow('#fc6', 0.3);
      renderer.fillCircle(TABLE_LEFT + 15 + i * 15, H - 10, 4, '#fc6');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}

function drawBallGfx(renderer, ball) {
  if (!ball.active) return;
  renderer.setGlow('#fc6', 0.6);
  renderer.fillCircle(ball.x, ball.y, BALL_RADIUS, '#eee');
  renderer.setGlow(null);
  // Highlight
  renderer.fillCircle(ball.x - 2, ball.y - 2, BALL_RADIUS * 0.4, '#ffffff99');
}
