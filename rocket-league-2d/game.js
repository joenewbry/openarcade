import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 400;

  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const matchInfoEl = document.getElementById('matchInfo');

  const THEME = '#f60';

  // ── Constants ──
  const GRAVITY       = 0.4;
  const ARENA_L       = 12;
  const ARENA_R       = W - 12;
  const ARENA_T       = 30;
  const ARENA_B       = H - 12;
  const ARENA_W       = ARENA_R - ARENA_L;
  const ARENA_H       = ARENA_B - ARENA_T;
  const GOAL_H        = 100;
  const GOAL_W        = 12;
  const GOAL_TOP      = ARENA_B - GOAL_H;
  const BALL_R        = 13;
  const WIN_SCORE     = 5;
  const MATCH_SECS    = 180;
  const MAX_BOOST     = 100;

  const CAR_W         = 38;
  const CAR_H         = 18;
  const DRIVE_FORCE   = 0.45;
  const AIR_TORQUE    = 0.07;
  const JUMP_VEL      = -7.5;
  const DOUBLE_JUMP_VEL = -6;
  const BOOST_FORCE   = 0.55;
  const BOOST_RATE    = 1.0;
  const MAX_SPEED     = 8;
  const MAX_BOOST_SPEED = 12;
  const GROUND_FRIC   = 0.94;
  const AIR_FRIC      = 0.997;

  // ── Game state ──
  let score = 0, aiScore = 0;
  let timer = 0, goalTimer = 0, goalMessage = '', kickoffTimer = 0;
  let ball, player, aiCar, particles, ballTrail, boostPads;

  // ── justPressed via engine input wrapped with wasPressed ──
  // We track jump press ourselves via wasPressed on ArrowUp / 'w'
  let jumpPressedThisFrame = false;

  // ── Helpers ──
  function makeCar(x, facingRight, isAI) {
    return {
      x, y: ARENA_B - CAR_H / 2,
      vx: 0, vy: 0,
      angle: 0, angVel: 0,
      grounded: false, onWallL: false, onWallR: false, onCeiling: false,
      boost: 40, jumps: 2,
      facingRight, isAI,
      color: isAI ? '#4af' : '#f60',
      darkColor: isAI ? '#2a7ab5' : '#b34700',
      flameTimer: 0, lastHitBall: 0
    };
  }

  function initBoostPads() {
    boostPads = [];
    const positions = [
      [80, ARENA_B], [200, ARENA_B], [300, ARENA_B], [400, ARENA_B], [520, ARENA_B],
      [ARENA_L, 250], [ARENA_R, 250],
      [150, ARENA_T], [300, ARENA_T], [450, ARENA_T]
    ];
    for (const [px, py] of positions) {
      boostPads.push({ x: px, y: py, active: true, respawn: 0, big: (px === 300 && py === ARENA_B) });
    }
  }

  function resetPositions() {
    ball = { x: W / 2, y: ARENA_B - 80, vx: 0, vy: 0 };
    player = makeCar(170, true, false);
    aiCar  = makeCar(430, false, true);
    ballTrail = [];
    kickoffTimer = 60;
  }

  function resetAll() {
    score = 0; aiScore = 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (bestEl)  bestEl.textContent  = '0';
    timer = MATCH_SECS * 60;
    initBoostPads();
    resetPositions();
    particles = [];
    game.showOverlay('ROCKET LEAGUE 2D', '\u2190 \u2192 Drive   \u2191 Jump   Space Boost\n\nScore goals with car soccer!\n\nPress any key to start');
    game.setState('waiting');
  }

  function startMatch() {
    score = 0; aiScore = 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (bestEl)  bestEl.textContent  = '0';
    timer = MATCH_SECS * 60;
    initBoostPads();
    resetPositions();
    particles = [];
    game.setState('playing');
  }

  // ── Particles ──
  function spawn(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (Math.random() * 2 + 0.5) * (spd || 1);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 25 + Math.random() * 20, max: 45, color, sz: Math.random() * 3 + 1 });
    }
  }

  // ── Car physics ──
  function updateCar(c, inputLR, inputJump, inputBoost) {
    const wasGrounded = c.grounded;
    c.grounded = false; c.onWallL = false; c.onWallR = false; c.onCeiling = false;

    if (c.y + CAR_H / 2 >= ARENA_B - 1)  c.grounded  = true;
    if (c.y - CAR_H / 2 <= ARENA_T + 1)  c.onCeiling = true;
    if (c.x - CAR_W / 2 <= ARENA_L + 1)  c.onWallL   = true;
    if (c.x + CAR_W / 2 >= ARENA_R - 1)  c.onWallR   = true;

    if (c.grounded && !wasGrounded) c.jumps = 2;
    if (c.onWallL || c.onWallR || c.onCeiling) c.jumps = Math.max(c.jumps, 1);

    if (c.grounded) {
      c.angle *= 0.8;
      c.angVel *= 0.5;
      if (inputLR !== 0) { c.vx += inputLR * DRIVE_FORCE; c.facingRight = inputLR > 0; }
      c.vx *= GROUND_FRIC;
      if (Math.abs(c.vy) < 1) c.vy = 0;
    } else {
      if (inputLR !== 0) c.angVel += inputLR * AIR_TORQUE;
      c.vx *= AIR_FRIC;
      c.vy *= AIR_FRIC;
    }

    if (c.onWallL && !c.grounded) {
      c.vy *= 0.92;
      if (inputLR !== 0) c.vy += inputLR * DRIVE_FORCE * -0.5;
      c.angle = Math.PI / 2 * 0.2 + c.angle * 0.8;
    }
    if (c.onWallR && !c.grounded) {
      c.vy *= 0.92;
      if (inputLR !== 0) c.vy += inputLR * DRIVE_FORCE * 0.5;
      c.angle = -Math.PI / 2 * 0.2 + c.angle * 0.8;
    }
    if (c.onCeiling && !c.grounded) {
      c.vx *= GROUND_FRIC;
      if (inputLR !== 0) c.vx += inputLR * DRIVE_FORCE;
      c.angle = Math.PI * 0.2 + c.angle * 0.8;
    }

    if (inputJump && c.jumps > 0) {
      if (c.grounded) {
        c.vy = JUMP_VEL; c.jumps--;
        spawn(c.x, c.y + CAR_H / 2, '#fff', 6, 1.5);
      } else if (c.onWallL) {
        c.vx = 6; c.vy = -5; c.jumps--;
        spawn(c.x - CAR_W / 2, c.y, '#fff', 6, 1.5);
      } else if (c.onWallR) {
        c.vx = -6; c.vy = -5; c.jumps--;
        spawn(c.x + CAR_W / 2, c.y, '#fff', 6, 1.5);
      } else if (c.onCeiling) {
        c.vy = 5; c.jumps--;
        spawn(c.x, c.y - CAR_H / 2, '#fff', 6, 1.5);
      } else if (c.jumps >= 1) {
        c.vy = DOUBLE_JUMP_VEL; c.jumps--;
        spawn(c.x, c.y + CAR_H / 2, '#aaf', 4, 1);
      }
    }

    c.flameTimer = Math.max(0, c.flameTimer - 1);
    if (inputBoost && c.boost > 0) {
      const bx = Math.cos(c.angle) * (c.facingRight ? 1 : -1);
      const by = Math.sin(c.angle);
      c.vx += bx * BOOST_FORCE;
      c.vy += by * BOOST_FORCE;
      c.boost -= BOOST_RATE;
      if (c.boost < 0) c.boost = 0;
      c.flameTimer = 6;
      if (Math.random() < 0.6) spawn(c.x - bx * CAR_W / 2, c.y - by * CAR_W / 2, c.isAI ? '#4af' : '#f60', 1, 2);
    }

    c.vy += GRAVITY;
    c.angVel *= 0.9;
    c.angle  += c.angVel;
    c.x += c.vx;
    c.y += c.vy;

    const spd = Math.hypot(c.vx, c.vy);
    const limit = inputBoost ? MAX_BOOST_SPEED : MAX_SPEED;
    if (spd > limit) { c.vx *= limit / spd; c.vy *= limit / spd; }

    if (c.y + CAR_H / 2 > ARENA_B) { c.y = ARENA_B - CAR_H / 2; c.vy = Math.min(0, c.vy * -0.1); }
    if (c.y - CAR_H / 2 < ARENA_T) { c.y = ARENA_T + CAR_H / 2; c.vy = Math.max(0, c.vy * -0.1); }

    const inGoalZone = c.y + CAR_H / 2 > GOAL_TOP && c.y - CAR_H / 2 < ARENA_B;
    if (c.x - CAR_W / 2 < ARENA_L) {
      if (!inGoalZone) { c.x = ARENA_L + CAR_W / 2; c.vx = Math.max(0, c.vx * -0.2); }
      else if (c.x - CAR_W / 2 < ARENA_L - GOAL_W) { c.x = ARENA_L - GOAL_W + CAR_W / 2; c.vx = Math.max(0, c.vx * -0.2); }
    }
    if (c.x + CAR_W / 2 > ARENA_R) {
      if (!inGoalZone) { c.x = ARENA_R - CAR_W / 2; c.vx = Math.min(0, c.vx * -0.2); }
      else if (c.x + CAR_W / 2 > ARENA_R + GOAL_W) { c.x = ARENA_R + GOAL_W - CAR_W / 2; c.vx = Math.min(0, c.vx * -0.2); }
    }
  }

  // ── Ball physics ──
  function updateBall() {
    if (kickoffTimer > 0) { kickoffTimer--; return null; }

    ball.vy += GRAVITY;
    ball.x  += ball.vx;
    ball.y  += ball.vy;
    ball.vx *= 0.999;
    ball.vy *= 0.999;

    const spd = Math.hypot(ball.vx, ball.vy);
    if (spd > 14) { ball.vx *= 14 / spd; ball.vy *= 14 / spd; }

    if (spd > 1.5) {
      ballTrail.push({ x: ball.x, y: ball.y, life: 12 });
      if (ballTrail.length > 25) ballTrail.shift();
    }

    if (ball.y - BALL_R < ARENA_T) { ball.y = ARENA_T + BALL_R; ball.vy = Math.abs(ball.vy) * 0.7; }
    if (ball.y + BALL_R > ARENA_B) {
      ball.y = ARENA_B - BALL_R; ball.vy = -Math.abs(ball.vy) * 0.7;
      ball.vx *= 0.97;
      if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
    }

    if (ball.x - BALL_R < ARENA_L) {
      if (ball.y > GOAL_TOP + BALL_R && ball.y < ARENA_B - BALL_R) {
        if (ball.x < ARENA_L - GOAL_W - BALL_R) return 'ai_goal';
        if (ball.x - BALL_R < ARENA_L - GOAL_W) { ball.x = ARENA_L - GOAL_W + BALL_R; ball.vx = Math.abs(ball.vx) * 0.5; }
        if (ball.y - BALL_R < GOAL_TOP) { ball.y = GOAL_TOP + BALL_R; ball.vy = Math.abs(ball.vy) * 0.6; }
      } else { ball.x = ARENA_L + BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; }
    }
    if (ball.x + BALL_R > ARENA_R) {
      if (ball.y > GOAL_TOP + BALL_R && ball.y < ARENA_B - BALL_R) {
        if (ball.x > ARENA_R + GOAL_W + BALL_R) return 'player_goal';
        if (ball.x + BALL_R > ARENA_R + GOAL_W) { ball.x = ARENA_R + GOAL_W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.5; }
        if (ball.y - BALL_R < GOAL_TOP) { ball.y = GOAL_TOP + BALL_R; ball.vy = Math.abs(ball.vy) * 0.6; }
      } else { ball.x = ARENA_R - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }
    }

    const postR = 5;
    const posts = [{ x: ARENA_L, y: GOAL_TOP }, { x: ARENA_R, y: GOAL_TOP }];
    for (const p of posts) {
      const dx = ball.x - p.x, dy = ball.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < BALL_R + postR) {
        const nx = dx / d, ny = dy / d;
        ball.x = p.x + nx * (BALL_R + postR);
        ball.y = p.y + ny * (BALL_R + postR);
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx * 0.7;
        ball.vy -= 2 * dot * ny * 0.7;
        spawn(p.x, p.y, '#ff0', 6, 1.5);
      }
    }
    return null;
  }

  // ── Car-Ball collision ──
  function carBallHit(c) {
    const dx = ball.x - c.x, dy = ball.y - c.y;
    const cos = Math.cos(-c.angle), sin = Math.sin(-c.angle);
    const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
    const hw = CAR_W / 2 + 2, hh = CAR_H / 2 + 2;
    const cx = Math.max(-hw, Math.min(hw, lx));
    const cy = Math.max(-hh, Math.min(hh, ly));
    const dlx = lx - cx, dly = ly - cy;
    const d = Math.hypot(dlx, dly);
    if (d >= BALL_R) return;

    const cos2 = Math.cos(c.angle), sin2 = Math.sin(c.angle);
    let nx, ny;
    if (d < 0.01) {
      const dd = Math.hypot(dx, dy) || 1;
      nx = dx / dd; ny = dy / dd;
    } else {
      const lnx = dlx / d, lny = dly / d;
      nx = lnx * cos2 - lny * sin2;
      ny = lnx * sin2 + lny * cos2;
    }

    ball.x += nx * (BALL_R - d + 1);
    ball.y += ny * (BALL_R - d + 1);

    const rvx = ball.vx - c.vx, rvy = ball.vy - c.vy;
    const rDot = rvx * nx + rvy * ny;
    if (rDot > 0) return;

    const imp = -(1 + 0.82) * rDot / (1 + 0.5);
    ball.vx += imp * nx;  ball.vy += imp * ny;
    c.vx    -= imp * 0.3 * nx; c.vy -= imp * 0.3 * ny;

    const hitSpd = Math.hypot(rvx, rvy);
    spawn(ball.x - nx * BALL_R, ball.y - ny * BALL_R, hitSpd > 6 ? '#ff0' : '#fff', Math.min(12, Math.floor(hitSpd * 2)), hitSpd * 0.3);
    c.lastHitBall = 10;
  }

  // ── Car-Car collision ──
  function carCar() {
    const dx = aiCar.x - player.x, dy = aiCar.y - player.y;
    const d = Math.hypot(dx, dy);
    const minD = CAR_W * 0.6;
    if (d < minD && d > 0) {
      const nx = dx / d, ny = dy / d;
      const ov = minD - d;
      player.x -= nx * ov * 0.5; player.y -= ny * ov * 0.5;
      aiCar.x  += nx * ov * 0.5; aiCar.y  += ny * ov * 0.5;
      const rv = (player.vx - aiCar.vx) * nx + (player.vy - aiCar.vy) * ny;
      if (rv > 0) {
        player.vx -= rv * nx * 0.4; player.vy -= rv * ny * 0.4;
        aiCar.vx  += rv * nx * 0.4; aiCar.vy  += rv * ny * 0.4;
      }
      spawn((player.x + aiCar.x) / 2, (player.y + aiCar.y) / 2, '#fff', 4, 1);
    }
  }

  // ── Boost pads ──
  function checkPads(c) {
    for (const p of boostPads) {
      if (!p.active) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < CAR_W / 2 + 10) {
        c.boost = Math.min(MAX_BOOST, c.boost + (p.big ? 40 : 20));
        p.active = false;
        p.respawn = p.big ? 360 : 240;
        spawn(p.x, p.y, '#ff0', 6, 1.5);
      }
    }
  }

  // ── AI ──
  function aiThink() {
    let lr = 0, jump = false, boost = false;
    const predT = 25;
    let pbx = ball.x + ball.vx * predT;
    let pby = ball.y + ball.vy * predT + 0.5 * GRAVITY * predT * predT;
    pbx = Math.max(ARENA_L, Math.min(ARENA_R, pbx));
    pby = Math.max(ARENA_T, Math.min(ARENA_B, pby));

    const distBall  = Math.hypot(aiCar.x - ball.x, aiCar.y - ball.y);
    const ballToGoal    = ball.vx > 0.5 && ball.x > W * 0.35;
    const ballDangerous = ball.x > W * 0.55 && ball.vx > 0;
    const ballOnMySide  = ball.x > W / 2;

    let targetX, targetY, urgency = 0;

    if (ballDangerous && ball.x > W * 0.65) {
      targetX = ball.x; targetY = ball.y; urgency = 3;
    } else if (ballOnMySide && ballToGoal) {
      targetX = Math.max(ball.x, pbx); targetY = pby; urgency = 2;
    } else if (!ballOnMySide) {
      targetX = ball.x + 35; targetY = ball.y; urgency = 1;
      if (aiCar.x > ball.x + 20) { targetX = ball.x; targetY = ball.y; urgency = 2; }
    } else {
      targetX = Math.max(ball.x + 30, ARENA_R - 100);
      targetY = (ball.y + (GOAL_TOP + ARENA_B) / 2) / 2;
      urgency = 1;
    }

    const dxT = targetX - aiCar.x;
    const dyT = targetY - aiCar.y;

    if (aiCar.grounded) {
      if (dxT > 15) lr = 1; else if (dxT < -15) lr = -1; else lr = dxT > 0 ? 0.5 : -0.5;
      if (ball.y < aiCar.y - 30 && Math.abs(ball.x - aiCar.x) < 80 && distBall < 120) jump = true;
      if (ball.y < ARENA_B - 100 && distBall < 150 && urgency >= 2) jump = true;
    } else {
      const angleToTarget = Math.atan2(dyT, dxT);
      let diff = angleToTarget - aiCar.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (diff > 0.2) lr = 1; else if (diff < -0.2) lr = -1;
      if (distBall < 80 && aiCar.jumps > 0 && ball.y < aiCar.y) jump = true;
    }

    if (urgency >= 3 && aiCar.boost > 5) boost = true;
    else if (urgency >= 2 && aiCar.boost > 20 && distBall > 80) boost = true;
    else if (urgency >= 1 && aiCar.boost > 50 && distBall > 200) boost = true;
    if (!aiCar.grounded && distBall < 150 && aiCar.boost > 10) boost = true;

    if (lr > 0) aiCar.facingRight = true;
    else if (lr < 0) aiCar.facingRight = false;

    updateCar(aiCar, lr, jump, boost);
  }

  // ── Goal handling ──
  function handleGoal(who) {
    if (who === 'player_goal') {
      score++;
      if (scoreEl) scoreEl.textContent = score;
      goalMessage = 'GOAL!';
      spawn(ARENA_R + GOAL_W / 2, (GOAL_TOP + ARENA_B) / 2, '#f60', 40, 3);
    } else {
      aiScore++;
      if (bestEl) bestEl.textContent = aiScore;
      goalMessage = 'AI SCORES!';
      spawn(ARENA_L - GOAL_W / 2, (GOAL_TOP + ARENA_B) / 2, '#4af', 40, 3);
    }
    goalTimer = 120;
    if (score >= WIN_SCORE || aiScore >= WIN_SCORE) goalTimer = 150;
    game.setState('over'); // use 'over' for goal-scored pause; handled in onUpdate
    // We'll use a custom goalScored flag instead
  }

  // ── Rendering helpers ──
  // Build polygon points for car body shape
  function carBodyPoints(hw, hh) {
    return [
      { x: -hw + 3, y: -hh },
      { x: hw - 2,  y: -hh },
      { x: hw + 5,  y: -3  },
      { x: hw + 5,  y:  3  },
      { x: hw - 2,  y:  hh },
      { x: -hw + 3, y:  hh },
      { x: -hw,     y:  hh - 3 },
      { x: -hw,     y: -hh + 3 },
    ];
  }

  function transformPoly(pts, cx, cy, angle, flipX) {
    const cos = Math.cos(angle * flipX), sin = Math.sin(angle * flipX);
    return pts.map(p => {
      const px = p.x * flipX;
      return {
        x: cx + px * cos - p.y * sin,
        y: cy + px * sin + p.y * cos,
      };
    });
  }

  function drawBoostMeter(renderer, text, x, y, amount, color, label) {
    const bw = 100, bh = 4;
    renderer.fillRect(x, y, bw, bh, '#1a1a2e');
    const fill = bw * (amount / MAX_BOOST);
    renderer.fillRect(x, y, fill, bh, color);
    if (amount > 50) {
      renderer.setGlow(color, 0.4);
      renderer.fillRect(x, y, fill, bh, color);
      renderer.setGlow(null);
    }
    renderer.fillRect(x, y, bw, 1, '#333');
    renderer.fillRect(x, y + bh - 1, bw, 1, '#333');
    renderer.fillRect(x, y, 1, bh, '#333');
    renderer.fillRect(x + bw - 1, y, 1, bh, '#333');
    text.drawText(label, x, y - 9, 7, '#666', 'left');
  }

  function drawGoal(renderer, x, dir, color) {
    // Parse #rgb shorthand -> rgba components for tinted fill
    const r16 = parseInt(color[1], 16) * 17;
    const g16 = parseInt(color[2], 16) * 17;
    const b16 = parseInt(color[3], 16) * 17;
    const toHex2 = v => v.toString(16).padStart(2, '0');
    const goalAlpha = `#${toHex2(r16)}${toHex2(g16)}${toHex2(b16)}1a`; // ~10% alpha
    const netAlpha  = `#${toHex2(r16)}${toHex2(g16)}${toHex2(b16)}40`; // ~25% alpha

    const gx = dir < 0 ? x - GOAL_W : x;
    renderer.fillRect(gx, GOAL_TOP, GOAL_W, GOAL_H, goalAlpha);

    // Net horizontal lines
    for (let ny = GOAL_TOP; ny <= ARENA_B; ny += 12) {
      renderer.fillRect(gx, ny, GOAL_W, 1, netAlpha);
    }

    // Goal frame
    renderer.drawLine(x, GOAL_TOP, x + dir * GOAL_W, GOAL_TOP, color, 3);
    renderer.drawLine(x + dir * GOAL_W, GOAL_TOP, x + dir * GOAL_W, ARENA_B, color, 3);
    renderer.drawLine(x + dir * GOAL_W, ARENA_B, x, ARENA_B, color, 3);
  }

  function drawBall(renderer) {
    const spd = Math.hypot(ball.vx, ball.vy);
    const glowColor = spd > 6 ? '#f60' : spd > 3 ? '#fa0' : '#fff';
    const glowIntensity = 0.3 + spd * 0.04;
    renderer.setGlow(glowColor, glowIntensity);
    renderer.fillCircle(ball.x, ball.y, BALL_R, '#eeeeee');
    renderer.setGlow(null);

    // Soccer spots
    const rot = Math.atan2(ball.vy, ball.vx + 0.01);
    for (let i = 0; i < 5; i++) {
      const a = rot + i * Math.PI * 2 / 5;
      const sx = ball.x + Math.cos(a) * BALL_R * 0.55;
      const sy = ball.y + Math.sin(a) * BALL_R * 0.55;
      renderer.fillCircle(sx, sy, 2.5, '#777777');
    }
    // Outline ring (thin)
    renderer.fillCircle(ball.x, ball.y, BALL_R, '#888888' + '40');
  }

  function drawCar(renderer, text, c) {
    const flip  = c.facingRight ? 1 : -1;
    const angle = c.angle * flip;
    const cos   = Math.cos(angle), sin = Math.sin(angle);
    const hw = CAR_W / 2, hh = CAR_H / 2;

    // Helper: transform local pt to world
    const tw = (lx, ly) => ({
      x: c.x + (lx * flip) * cos - ly * sin,
      y: c.y + (lx * flip) * sin + ly * cos,
    });

    // Boost flame
    if (c.flameTimer > 0) {
      const fLen = c.flameTimer * 3 + Math.random() * 10;
      const flameColor = c.isAI ? '#44aaff' : '#ff5000';
      const flamePts = [
        tw(-hw, -hh * 0.4),
        tw(-hw - fLen, 0),
        tw(-hw,  hh * 0.4),
      ];
      renderer.fillPoly(flamePts, flameColor + 'b3');
    }

    // Car body glow
    renderer.setGlow(c.color, 0.3);
    const bodyPts = [
      tw(-hw + 3, -hh),
      tw( hw - 2, -hh),
      tw( hw + 5, -3),
      tw( hw + 5,  3),
      tw( hw - 2,  hh),
      tw(-hw + 3,  hh),
      tw(-hw,      hh - 3),
      tw(-hw,     -hh + 3),
    ];
    renderer.fillPoly(bodyPts, c.color);
    renderer.setGlow(null);

    // Cabin
    const cabinPts = [
      tw(-4,  -hh),
      tw(10,  -hh),
      tw(10,  -hh * 0.3),
      tw(-4,  -hh * 0.3),
    ];
    renderer.fillPoly(cabinPts, c.darkColor);

    // Windshield
    const windPts = [
      tw(6,  -hh + 1),
      tw(12, -hh + 1),
      tw(10, -4),
      tw(4,  -4),
    ];
    renderer.fillPoly(windPts, '#78b4ff59');

    // Headlight
    renderer.setGlow('#ff0', 0.3);
    const hl = tw(hw + 2, -2.5);
    renderer.fillRect(hl.x - 1.5, hl.y - 1.5, 3, 3, '#ffff00');
    renderer.setGlow(null);

    // Taillight
    const tl = tw(-hw, -3);
    renderer.fillRect(tl.x - 1, tl.y, 2, 6, '#ff0000');

    // Wheels
    const wf = tw(hw - 5, hh);
    const wr = tw(-hw + 7, hh);
    renderer.fillRect(wf.x - 5, wf.y - 2, 10, 5, '#111111');
    renderer.fillRect(wr.x - 5, wr.y - 2, 10, 5, '#111111');
    renderer.fillRect(wf.x - 4, wf.y - 1, 8,  3, '#444444');
    renderer.fillRect(wr.x - 4, wr.y - 1, 8,  3, '#444444');

    // Label
    const lb = tw(0, 2);
    text.drawText(c.isAI ? 'AI' : 'P1', lb.x, lb.y - 3, 7, '#ffffff', 'center');
  }

  // ── Goal-scored state (not using engine state, custom flag) ──
  let inGoalScored = false;

  // ── onInit ──
  game.onInit = () => {
    resetAll();
  };

  game.setScoreFn(() => score);

  // ── onUpdate ──
  game.onUpdate = (dt) => {
    const inp = game.input;

    if (game.state === 'waiting') {
      // Any key starts match
      if (inp.wasPressed('ArrowLeft') || inp.wasPressed('ArrowRight') ||
          inp.wasPressed('ArrowUp')   || inp.wasPressed(' ') ||
          inp.wasPressed('Enter')     || inp.wasPressed('a') ||
          inp.wasPressed('d')         || inp.wasPressed('w')) {
        startMatch();
        inGoalScored = false;
      }
      return;
    }

    if (game.state === 'over' && !inGoalScored) {
      if (inp.wasPressed('ArrowLeft') || inp.wasPressed('ArrowRight') ||
          inp.wasPressed('ArrowUp')   || inp.wasPressed(' ') ||
          inp.wasPressed('Enter')) {
        resetAll();
      }
      return;
    }

    // Goal-scored pause
    if (inGoalScored) {
      goalTimer--;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (goalTimer <= 0) {
        if (score >= WIN_SCORE || aiScore >= WIN_SCORE) {
          // End match
          const title = score > aiScore ? 'YOU WIN!' : (aiScore > score ? 'AI WINS!' : 'DRAW!');
          game.showOverlay(title, `Final Score: ${score} - ${aiScore}\n\nPress any key to play again`);
          game.setState('over');
          inGoalScored = false;
        } else {
          resetPositions();
          game.setState('playing');
          inGoalScored = false;
        }
      }
      return;
    }

    if (game.state !== 'playing') return;

    // Timer
    timer--;
    const secs = Math.max(0, Math.ceil(timer / 60));
    if (matchInfoEl) {
      matchInfoEl.textContent = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')} | First to ${WIN_SCORE}`;
    }
    if (timer <= 0) {
      const title = score > aiScore ? 'YOU WIN!' : (aiScore > score ? 'AI WINS!' : 'DRAW!');
      game.showOverlay(title, `Final Score: ${score} - ${aiScore}\n\nPress any key to play again`);
      game.setState('over');
      return;
    }

    // Player input
    const pLR   = (inp.isDown('ArrowRight') || inp.isDown('d')) ? 1 : ((inp.isDown('ArrowLeft') || inp.isDown('a')) ? -1 : 0);
    const pJump = inp.wasPressed('ArrowUp') || inp.wasPressed('w');
    const pBoost = inp.isDown(' ');
    if (pLR > 0) player.facingRight = true;
    else if (pLR < 0) player.facingRight = false;

    updateCar(player, pLR, pJump, pBoost);
    aiThink();

    const goalResult = updateBall();
    if (goalResult) {
      if (goalResult === 'player_goal') {
        score++;
        if (scoreEl) scoreEl.textContent = score;
        goalMessage = 'GOAL!';
        spawn(ARENA_R + GOAL_W / 2, (GOAL_TOP + ARENA_B) / 2, '#f60', 40, 3);
      } else {
        aiScore++;
        if (bestEl) bestEl.textContent = aiScore;
        goalMessage = 'AI SCORES!';
        spawn(ARENA_L - GOAL_W / 2, (GOAL_TOP + ARENA_B) / 2, '#4af', 40, 3);
      }
      goalTimer = 120;
      if (score >= WIN_SCORE || aiScore >= WIN_SCORE) goalTimer = 150;
      inGoalScored = true;
      return;
    }

    carBallHit(player);
    carBallHit(aiCar);
    carCar();
    checkPads(player);
    checkPads(aiCar);
    for (const p of boostPads) {
      if (!p.active) { p.respawn--; if (p.respawn <= 0) p.active = true; }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = ballTrail.length - 1; i >= 0; i--) {
      ballTrail[i].life--;
      if (ballTrail[i].life <= 0) ballTrail.splice(i, 1);
    }

    player.lastHitBall = Math.max(0, player.lastHitBall - 1);
    aiCar.lastHitBall  = Math.max(0, aiCar.lastHitBall - 1);
  };

  // ── onDraw ──
  game.onDraw = (renderer, text, alpha) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a18');

    // Arena field
    renderer.fillRect(ARENA_L, ARENA_T, ARENA_W, ARENA_H, '#0e0e20');

    // Grid lines
    for (let x = ARENA_L; x <= ARENA_R; x += 40) {
      renderer.drawLine(x, ARENA_T, x, ARENA_B, '#ffffff07', 1);
    }
    for (let y = ARENA_T; y <= ARENA_B; y += 40) {
      renderer.drawLine(ARENA_L, y, ARENA_R, y, '#ffffff07', 1);
    }

    // Center line (dashed)
    renderer.dashedLine(W / 2, ARENA_T, W / 2, ARENA_B, '#ffffff0f', 1, 4, 4);

    // Center circle (approximate with polygon)
    const circR = 45;
    const circCX = W / 2, circCY = (ARENA_T + ARENA_B) / 2;
    const circSegs = 32;
    const circPts = [];
    for (let i = 0; i < circSegs; i++) {
      const a = (i / circSegs) * Math.PI * 2;
      circPts.push({ x: circCX + Math.cos(a) * circR, y: circCY + Math.sin(a) * circR });
    }
    renderer.strokePoly(circPts, '#ffffff0f', 1, true);

    // Goals
    drawGoal(renderer, ARENA_L, -1, '#f60');
    drawGoal(renderer, ARENA_R,  1, '#4af');

    // Goal posts
    renderer.setGlow('#ff0', 0.6);
    renderer.fillCircle(ARENA_L, GOAL_TOP, 4, '#ffff00');
    renderer.fillCircle(ARENA_R, GOAL_TOP, 4, '#ffff00');
    renderer.setGlow(null);

    // Arena border
    renderer.drawLine(ARENA_L, ARENA_T, ARENA_R, ARENA_T, '#333333', 2);
    renderer.drawLine(ARENA_L, ARENA_B, ARENA_R, ARENA_B, '#333333', 2);
    renderer.drawLine(ARENA_L, ARENA_T, ARENA_L, GOAL_TOP, '#333333', 2);
    renderer.drawLine(ARENA_R, ARENA_T, ARENA_R, GOAL_TOP, '#333333', 2);

    // Boost pads
    const t = performance.now();
    for (const p of boostPads) {
      if (!p.active) {
        renderer.fillCircle(p.x, p.y, 5, '#55555533');
      } else {
        const rotA = Math.PI / 4 + t * 0.002;
        const sz = p.big ? 8 : 5;
        const cos = Math.cos(rotA), sin = Math.sin(rotA);
        const padPts = [
          { x: p.x + cos * sz - sin * sz, y: p.y + sin * sz + cos * sz },
          { x: p.x + cos * sz + sin * sz, y: p.y + sin * sz - cos * sz },
          { x: p.x - cos * sz + sin * sz, y: p.y - sin * sz - cos * sz },
          { x: p.x - cos * sz - sin * sz, y: p.y - sin * sz + cos * sz },
        ];
        const padColor = p.big ? '#ff8800' : '#ffa500';
        renderer.setGlow(padColor, 0.5);
        renderer.fillPoly(padPts, padColor);
        renderer.setGlow(null);
      }
    }

    // Ball trail
    for (const tr of ballTrail) {
      const a = tr.life / 12;
      const alpha8 = Math.round(a * 0.15 * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(tr.x, tr.y, BALL_R * a * 0.6, `#ffffff${alpha8}`);
    }

    // Ball
    if (ball) drawBall(renderer);

    // Cars
    if (player) drawCar(renderer, text, player);
    if (aiCar)  drawCar(renderer, text, aiCar);

    // Boost meters
    drawBoostMeter(renderer, text, 15,       ARENA_B + 9, player ? player.boost : 0, '#ff6600', 'P1 BOOST');
    drawBoostMeter(renderer, text, W - 115,  ARENA_B + 9, aiCar  ? aiCar.boost  : 0, '#44aaff', 'AI BOOST');

    // Particles
    for (const p of particles) {
      const pa = p.life / p.max;
      const a8 = Math.round(pa * 255).toString(16).padStart(2, '0');
      renderer.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz, p.color + a8);
    }

    // Goal message
    if (inGoalScored && goalTimer > 0) {
      const pulse = 1 + Math.sin(goalTimer * 0.15) * 0.08;
      const msgColor = goalMessage.includes('AI') ? '#44aaff' : '#ff6600';
      renderer.setGlow(msgColor, 0.8);
      text.drawText(goalMessage, W / 2, H / 2 - 30, 40 * pulse, msgColor, 'center');
      renderer.setGlow(null);
      text.drawText(`${score} - ${aiScore}`, W / 2, H / 2 + 14, 16, '#aaaaaa', 'center');
    }

    // Kickoff countdown
    if (kickoffTimer > 30) {
      const num = Math.ceil((kickoffTimer - 30) / 30).toString();
      renderer.setGlow('#ffffff', 0.6);
      text.drawText(num, W / 2, H / 2 - 50, 30, '#ffffff', 'center');
      renderer.setGlow(null);
    } else if (kickoffTimer > 0) {
      renderer.setGlow('#ff6600', 0.8);
      text.drawText('GO!', W / 2, H / 2 - 50, 24, '#ff6600', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
