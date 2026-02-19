// obstacle-course-race/game.js — WebGL 2 port of Obstacle Course Race

import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 400;
  const GRAVITY = 800;
  const GROUND_Y = 340;
  const PLAYER_W = 20;
  const PLAYER_H = 24;
  const TOTAL_ROUNDS = 3;

  const COLORS = ['#ff44aa', '#44aaff', '#44ff88', '#ffaa44'];
  const NAMES = ['You', 'Blue AI', 'Green AI', 'Orange AI'];

  // DOM score elements
  const roundEl = document.getElementById('roundDisplay');
  const timerEl = document.getElementById('timerDisplay');
  const scoreEl = document.getElementById('scoreDisplay');

  // Game state
  let gameState = 'menu'; // menu | countdown | racing | roundEnd | gameover
  let score = 0;
  let round = 1;
  let raceTimer = 0;
  let finishOrder = [];
  let courseLength = 3000;
  let cameraX = 0;
  let countdown = 0;
  let obstacles = [];
  let platforms = [];
  let players = [];
  let particles = [];
  let playerScores = [0, 0, 0, 0];

  game.setScoreFn(() => score);

  // ── Player creation ──

  function createPlayer(idx, isHuman) {
    return {
      x: 60, y: GROUND_Y - PLAYER_H,
      vx: 0, vy: 0,
      w: PLAYER_W, h: PLAYER_H,
      color: COLORS[idx],
      name: NAMES[idx],
      idx,
      isHuman,
      onGround: true,
      finished: false,
      finishTime: 0,
      diving: false,
      diveTimer: 0,
      stunTimer: 0,
      speedBoost: 0,
      slowTimer: 0,
      facing: 1,
      runAnim: 0,
      ai: !isHuman ? {
        jumpCooldown: 0,
        targetSpeed: 140 + Math.random() * 40,
        reactionDelay: 0.1 + Math.random() * 0.15,
        scanTimer: 0,
        wantJump: false,
        wantDive: false,
        skill: 0.7 + Math.random() * 0.25,
      } : null,
    };
  }

  // ── Course generation ──

  function generateCourse() {
    obstacles = [];
    platforms = [];
    const len = courseLength;

    // Ground segments with occasional gaps
    let gx = 0;
    while (gx < len + 200) {
      let segLen = 200 + Math.random() * 300;
      platforms.push({ x: gx, y: GROUND_Y, w: segLen, h: 60, type: 'ground' });
      gx += segLen;
      if (gx > 300 && gx < len - 200 && Math.random() < 0.3) {
        gx += 50 + Math.random() * 40;
      }
    }

    let ox = 250;
    while (ox < len - 100) {
      const types = ['spinner', 'pendulum', 'conveyor', 'slime', 'bounce', 'movingPlatform', 'wall'];
      let type = types[Math.floor(Math.random() * types.length)];
      let obs = { x: ox, type };

      switch (type) {
        case 'spinner':
          obs.y = GROUND_Y - 40;
          obs.radius = 50 + Math.random() * 20;
          obs.angle = Math.random() * Math.PI * 2;
          obs.speed = (1.5 + Math.random()) * (Math.random() < 0.5 ? 1 : -1);
          obs.barW = 8;
          break;
        case 'pendulum':
          obs.y = GROUND_Y - 120;
          obs.anchorY = obs.y - 40;
          obs.length = 60 + Math.random() * 30;
          obs.angle = Math.random() * Math.PI * 2;
          obs.speed = 1.8 + Math.random() * 0.8;
          obs.bobR = 12;
          break;
        case 'conveyor':
          obs.y = GROUND_Y - 4;
          obs.w = 100 + Math.random() * 80;
          obs.h = 8;
          obs.dir = Math.random() < 0.5 ? -1 : 1;
          obs.speed = 80 + Math.random() * 60;
          obs.animOff = 0;
          break;
        case 'slime':
          obs.y = GROUND_Y - 3;
          obs.w = 60 + Math.random() * 60;
          obs.h = 6;
          break;
        case 'bounce':
          obs.y = GROUND_Y - 6;
          obs.w = 40;
          obs.h = 10;
          obs.compressed = 0;
          break;
        case 'movingPlatform':
          obs.y = GROUND_Y - 60 - Math.random() * 50;
          obs.baseY = obs.y;
          obs.w = 60 + Math.random() * 30;
          obs.h = 10;
          obs.ampY = 20 + Math.random() * 30;
          obs.phase = Math.random() * Math.PI * 2;
          obs.speed = 1 + Math.random();
          break;
        case 'wall':
          obs.y = GROUND_Y - 40 - Math.random() * 30;
          obs.w = 15;
          obs.h = GROUND_Y - obs.y;
          break;
      }
      obstacles.push(obs);
      ox += 120 + Math.random() * 150;
    }
  }

  // ── Race / game init ──

  function startRace() {
    finishOrder = [];
    raceTimer = 0;
    cameraX = 0;
    particles = [];
    generateCourse();
    players = [];
    for (let i = 0; i < 4; i++) {
      players.push(createPlayer(i, i === 0));
      players[i].x = 40 + i * 12;
      players[i].y = GROUND_Y - PLAYER_H;
    }
    countdown = 3;
    gameState = 'countdown';
  }

  function startGame() {
    score = 0;
    round = 1;
    courseLength = 2500 + round * 500;
    playerScores = [0, 0, 0, 0];
    startRace();
    game.setState('playing');
    game.hideOverlay();
  }

  // ── Physics helpers ──

  function getGroundAt(x, w) {
    for (let p of platforms) {
      if (p.type === 'ground' && x + w > p.x && x < p.x + p.w) return p.y;
    }
    return H + 200;
  }

  function resolveCollisions(p) {
    for (let plat of platforms) {
      if (plat.type !== 'ground') continue;
      if (p.x + p.w > plat.x && p.x < plat.x + plat.w) {
        if (p.y + p.h > plat.y && p.y + p.h < plat.y + 20 && p.vy >= 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }
    for (let obs of obstacles) {
      if (obs.type === 'movingPlatform') {
        if (p.x + p.w > obs.x && p.x < obs.x + obs.w) {
          if (p.y + p.h > obs.y && p.y + p.h < obs.y + 16 && p.vy >= 0) {
            p.y = obs.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }
    }
  }

  function distToSeg(pt, x1, y1, x2, y2) {
    let dx = x2 - x1, dy = y2 - y1;
    let len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((pt.x - x1) ** 2 + (pt.y - y1) ** 2);
    let t = Math.max(0, Math.min(1, ((pt.x - x1) * dx + (pt.y - y1) * dy) / len2));
    let px = x1 + t * dx, py = y1 + t * dy;
    return Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.8) * 200,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        r: 2 + Math.random() * 3,
      });
    }
    // Fix maxLife to match life
    for (let i = particles.length - count; i < particles.length; i++) {
      particles[i].maxLife = particles[i].life;
    }
  }

  // ── AI ──

  function updateAI(p, dt) {
    let ai = p.ai;
    ai.scanTimer -= dt;
    if (ai.jumpCooldown > 0) ai.jumpCooldown -= dt;

    let accel = 500;
    let targetVx = ai.targetSpeed;

    if (ai.scanTimer <= 0) {
      ai.scanTimer = ai.reactionDelay;
      ai.wantJump = false;
      ai.wantDive = false;
      let lookAhead = 80 + Math.abs(p.vx) * 0.3;

      for (let obs of obstacles) {
        let odist = obs.x - p.x;
        if (odist < -40 || odist > lookAhead) continue;
        switch (obs.type) {
          case 'spinner':
            if (odist < 60 && Math.abs(obs.y - (p.y + p.h / 2)) < obs.radius + 20) {
              let armY1 = obs.y + Math.sin(obs.angle) * obs.radius;
              let armY2 = obs.y - Math.sin(obs.angle) * obs.radius;
              let dangerY = Math.min(armY1, armY2);
              if (dangerY > p.y - 20 || Math.random() > ai.skill) ai.wantJump = true;
            }
            break;
          case 'pendulum':
            if (odist < 70) {
              let bx = obs.x + Math.sin(obs.angle) * obs.length;
              let by = obs.anchorY + Math.cos(obs.angle) * obs.length;
              if (Math.abs(bx - p.x) < 40 && by > p.y - 20) {
                if (Math.random() < ai.skill) targetVx *= 0.3;
                else ai.wantJump = true;
              }
            }
            break;
          case 'wall':
            if (odist < 50 && odist > -10) ai.wantJump = true;
            break;
          case 'slime':
            if (odist < 60 && odist > -10) ai.wantJump = true;
            break;
          case 'bounce':
            if (odist < 50 && odist > 0) targetVx = ai.targetSpeed * 1.1;
            break;
          case 'conveyor':
            if (odist < 60 && obs.dir < 0) targetVx = ai.targetSpeed * 1.3;
            break;
        }
      }

      if (getGroundAt(p.x + 40, p.w) > H) ai.wantJump = true;
      if (Math.random() < 0.005 * ai.skill && p.onGround) ai.wantDive = true;
    }

    if (p.stunTimer <= 0) {
      let diff = targetVx - p.vx;
      p.vx += Math.sign(diff) * accel * dt;
      p.facing = 1;
      if (ai.wantJump && p.onGround && ai.jumpCooldown <= 0) {
        p.vy = -380;
        p.onGround = false;
        ai.jumpCooldown = 0.3;
        ai.wantJump = false;
      }
      if (ai.wantDive && !p.diving && p.diveTimer <= 0) {
        p.diving = true;
        p.diveTimer = 0.4;
        p.vx += 120;
        ai.wantDive = false;
      }
    } else {
      p.vx *= (1 - 5 * dt);
    }
  }

  // ── Update ──

  function updateObstacles(dt) {
    for (let obs of obstacles) {
      switch (obs.type) {
        case 'spinner':    obs.angle += obs.speed * dt; break;
        case 'pendulum':   obs.angle = Math.sin(raceTimer * obs.speed) * 1.2; break;
        case 'conveyor':   obs.animOff += obs.dir * obs.speed * dt; break;
        case 'movingPlatform':
          obs.y = obs.baseY + Math.sin(raceTimer * obs.speed + obs.phase) * obs.ampY;
          break;
        case 'bounce':
          if (obs.compressed > 0) obs.compressed -= dt;
          break;
      }
    }
  }

  function updatePlayer(p, dt) {
    if (p.finished) return;
    if (p.stunTimer > 0) { p.stunTimer -= dt; p.vx *= 0.9; }
    if (p.diveTimer > 0) { p.diveTimer -= dt; if (p.diveTimer <= 0) p.diving = false; }
    if (p.slowTimer > 0) p.slowTimer -= dt;
    if (p.speedBoost > 0) p.speedBoost -= dt;

    let maxSpeed = 180;
    if (p.slowTimer > 0) maxSpeed = 80;
    if (p.speedBoost > 0) maxSpeed = 260;

    if (p.isHuman && p.stunTimer <= 0) {
      let accel = 600;
      if (game.input.isDown('ArrowRight')) { p.vx += accel * dt; p.facing = 1; }
      else if (game.input.isDown('ArrowLeft')) { p.vx -= accel * dt; p.facing = -1; }
      else { p.vx *= (1 - 8 * dt); }
      if (game.input.isDown('ArrowUp') && p.onGround) { p.vy = -380; p.onGround = false; }
      if (game.input.wasPressed(' ') && !p.diving && p.diveTimer <= 0) {
        p.diving = true;
        p.diveTimer = 0.4;
        p.vx += p.facing * 120;
        if (!p.onGround) p.vy += 150;
      }
    } else if (!p.isHuman) {
      updateAI(p, dt);
    }

    p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;

    resolveCollisions(p);

    // Fell into pit
    if (p.y > H + 100) {
      p.y = GROUND_Y - PLAYER_H - 40;
      p.vy = -200;
      p.x = Math.max(p.x - 80, 40);
      p.stunTimer = 0.5;
      spawnParticles(p.x, GROUND_Y, p.color, 8);
    }

    // Obstacle interactions
    for (let obs of obstacles) {
      switch (obs.type) {
        case 'spinner': {
          let ex1x = obs.x + Math.cos(obs.angle) * obs.radius;
          let ex1y = obs.y + Math.sin(obs.angle) * obs.radius;
          let ex2x = obs.x - Math.cos(obs.angle) * obs.radius;
          let ex2y = obs.y - Math.sin(obs.angle) * obs.radius;
          let pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
          if (distToSeg(pc, ex1x, ex1y, ex2x, ex2y) < 16) {
            let pushAngle = obs.angle + Math.PI / 2;
            p.vx += Math.cos(pushAngle) * 300 * obs.speed;
            p.vy += Math.sin(pushAngle) * 200 - 100;
            p.stunTimer = 0.4;
            spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#fff', 5);
          }
          break;
        }
        case 'pendulum': {
          let bx = obs.x + Math.sin(obs.angle) * obs.length;
          let by = obs.anchorY + Math.cos(obs.angle) * obs.length;
          let dx = (p.x + p.w / 2) - bx;
          let dy = (p.y + p.h / 2) - by;
          if (Math.sqrt(dx * dx + dy * dy) < obs.bobR + 12) {
            let swing = Math.cos(obs.angle) * obs.speed;
            p.vx += swing * 200;
            p.vy = -200;
            p.stunTimer = 0.3;
            spawnParticles(bx, by, '#ff8844', 5);
          }
          break;
        }
        case 'conveyor':
          if (p.x + p.w > obs.x && p.x < obs.x + obs.w &&
              p.y + p.h > obs.y - 4 && p.y + p.h < obs.y + obs.h + 10 && p.onGround) {
            p.vx += obs.dir * obs.speed * dt * 3;
          }
          break;
        case 'slime':
          if (p.x + p.w > obs.x && p.x < obs.x + obs.w &&
              p.y + p.h > obs.y - 4 && p.y + p.h < obs.y + obs.h + 6) {
            p.slowTimer = 0.5;
          }
          break;
        case 'bounce':
          if (p.x + p.w > obs.x && p.x < obs.x + obs.w &&
              p.y + p.h > obs.y && p.y + p.h < obs.y + obs.h + 8 && p.vy >= 0) {
            p.vy = -500;
            p.onGround = false;
            obs.compressed = 0.2;
            spawnParticles(obs.x + obs.w / 2, obs.y, '#ffff44', 6);
          }
          break;
        case 'wall':
          if (p.x + p.w > obs.x && p.x < obs.x + obs.w &&
              p.y + p.h > obs.y && p.y < obs.y + obs.h) {
            if (p.vx > 0) { p.x = obs.x - p.w; }
            else { p.x = obs.x + obs.w; }
            p.vx *= -0.3;
          }
          break;
      }
    }

    // Player-player bumping
    for (let other of players) {
      if (other === p || other.finished) continue;
      let dx = (p.x + p.w / 2) - (other.x + other.w / 2);
      let dy = (p.y + p.h / 2) - (other.y + other.h / 2);
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        let nx = dx / (dist || 1);
        let ny = dy / (dist || 1);
        let push = p.diving ? 180 : 80;
        p.vx += nx * push * dt * 20;
        other.vx -= nx * push * dt * 20;
        if (p.diving) other.stunTimer = 0.3;
      }
    }

    if (p.onGround && Math.abs(p.vx) > 20) {
      p.runAnim += Math.abs(p.vx) * dt * 0.05;
    }

    // Finish line
    if (p.x > courseLength && !p.finished) {
      p.finished = true;
      p.finishTime = raceTimer;
      finishOrder.push(p.idx);
      spawnParticles(p.x, p.y, p.color, 20);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      let pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 300 * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  game.onUpdate = (dt) => {
    const dtSec = dt / 1000;

    if (gameState === 'countdown') {
      countdown -= dtSec;
      if (countdown <= -0.5) gameState = 'racing';
      return;
    }
    if (gameState !== 'racing') return;

    raceTimer += dtSec;
    updateObstacles(dtSec);
    for (let p of players) updatePlayer(p, dtSec);
    updateParticles(dtSec);

    // Camera follows human player
    let targetCam = players[0].x - 120;
    cameraX += (targetCam - cameraX) * 4 * dtSec;
    cameraX = Math.max(0, cameraX);

    // Auto-finish after timeout
    if (raceTimer > 60) {
      for (let p of players) {
        if (!p.finished) {
          p.finished = true;
          p.finishTime = raceTimer;
          finishOrder.push(p.idx);
        }
      }
    }

    // Check if all finished
    if (players.every(p => p.finished)) {
      gameState = 'roundEnd';
      let pts = [10, 6, 3, 1];
      for (let i = 0; i < finishOrder.length; i++) {
        playerScores[finishOrder[i]] += pts[i] || 0;
      }
      score = playerScores[0];
      if (scoreEl) scoreEl.textContent = score;
    }

    // Update DOM
    if (timerEl) timerEl.textContent = raceTimer.toFixed(1);
    if (roundEl) roundEl.textContent = round;
  };

  // ── Drawing helpers (WebGL 2) ──

  // Precompute polygon points for ellipses (no ctx.ellipse)
  function ellipsePoints(cx, cy, rx, ry, rot, steps) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const localX = Math.cos(a) * rx;
      const localY = Math.sin(a) * ry;
      const rotX = rot !== 0 ? localX * Math.cos(rot) - localY * Math.sin(rot) : localX;
      const rotY = rot !== 0 ? localX * Math.sin(rot) + localY * Math.cos(rot) : localY;
      pts.push({ x: cx + rotX, y: cy + rotY });
    }
    return pts;
  }

  function drawBackground(r) {
    // Sky: gradient-like using two rects
    r.fillRect(0, 0, W, H / 2, '#1a1a2e');
    r.fillRect(0, H / 2, W, H / 2, '#16213e');

    // Distant mountains
    const mountainColor = '#0f3460';
    for (let i = 0; i < 10; i++) {
      let mx = ((i * 200 - cameraX * 0.1) % (W + 200) + W + 200) % (W + 200) - 100;
      let mh = 60 + Math.sin(i * 1.7) * 30;
      r.fillPoly([
        { x: mx - 80, y: H },
        { x: mx,      y: H - mh },
        { x: mx + 80, y: H },
      ], mountainColor);
    }

    // Stars
    for (let i = 0; i < 30; i++) {
      let sx = (i * 73 + 10) % W;
      let sy = (i * 47 + 5) % (H * 0.6);
      r.fillRect(sx, sy, 1.5, 1.5, '#ffffff33');
    }
  }

  function drawGround(r) {
    for (let plat of platforms) {
      if (plat.type !== 'ground') continue;
      let px = plat.x - cameraX;
      if (px + plat.w < -20 || px > W + 20) continue;
      r.fillRect(px, plat.y, plat.w, plat.h, '#2a2a4e');
      r.fillRect(px, plat.y, plat.w, 4, '#3a3a6e');
      r.strokePoly([
        { x: px,           y: plat.y },
        { x: px + plat.w, y: plat.y },
        { x: px + plat.w, y: plat.y + 4 },
        { x: px,           y: plat.y + 4 },
      ], '#4a4a8e', 1, true);
    }
  }

  function drawObstacles(r, t) {
    for (let obs of obstacles) {
      let ox = obs.x - cameraX;
      if (ox < -120 || ox > W + 120) continue;

      switch (obs.type) {
        case 'spinner': {
          let ex1x = ox + Math.cos(obs.angle) * obs.radius;
          let ex1y = obs.y + Math.sin(obs.angle) * obs.radius;
          let ex2x = ox - Math.cos(obs.angle) * obs.radius;
          let ex2y = obs.y - Math.sin(obs.angle) * obs.radius;
          // Bar as thick line
          r.setGlow('#ff4444', 0.8);
          r.drawLine(ex1x, ex1y, ex2x, ex2y, '#ff4444', obs.barW);
          r.setGlow(null);
          // Center hub
          r.fillCircle(ox, obs.y, 6, '#aa2222');
          break;
        }
        case 'pendulum': {
          let bx = ox + Math.sin(obs.angle) * obs.length;
          let by = obs.anchorY + Math.cos(obs.angle) * obs.length;
          // Rod
          r.drawLine(ox, obs.anchorY, bx, by, '#888', 2);
          // Bob
          r.setGlow('#ff8844', 0.9);
          r.fillCircle(bx, by, obs.bobR, '#ff8844');
          r.setGlow(null);
          // Anchor
          r.fillCircle(ox, obs.anchorY, 4, '#666');
          break;
        }
        case 'conveyor': {
          r.fillRect(ox, obs.y, obs.w, obs.h, '#555577');
          // Arrow indicators
          let arrowColor = obs.dir > 0 ? '#88ff88' : '#ff8888';
          let arrowChar = obs.dir > 0 ? '>' : '<';
          for (let i = 0; i < obs.w; i += 16) {
            let ax = ((i + obs.animOff) % obs.w + obs.w) % obs.w;
            if (ax + ox < ox + obs.w && ax >= 0) {
              t.drawText(arrowChar, ox + ax, obs.y + 1, 10, arrowColor);
            }
          }
          r.strokePoly([
            { x: ox,          y: obs.y },
            { x: ox + obs.w, y: obs.y },
            { x: ox + obs.w, y: obs.y + obs.h },
            { x: ox,          y: obs.y + obs.h },
          ], '#7777aa', 1, true);
          break;
        }
        case 'slime': {
          r.setGlow('#44cc44', 0.7);
          const pts = ellipsePoints(ox + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, obs.h / 2 + 2, 0, 20);
          r.fillPoly(pts, '#44cc44');
          r.setGlow(null);
          // Bubbles
          for (let i = 0; i < 3; i++) {
            let bx = ox + obs.w * 0.2 + i * obs.w * 0.3;
            let by = obs.y + Math.sin(raceTimer * 3 + i) * 2;
            r.fillCircle(bx, by, 2, '#66ee6644');
          }
          break;
        }
        case 'bounce': {
          let comp = obs.compressed > 0 ? 4 : 0;
          r.setGlow('#ffff44', 0.8);
          r.fillRect(ox, obs.y + comp, obs.w, obs.h - comp, '#ffff44');
          r.setGlow(null);
          // Spring coils
          for (let i = 0; i < 3; i++) {
            let sy = obs.y + comp + 2 + i * 3;
            r.drawLine(ox + 4, sy, ox + obs.w - 4, sy, '#cccc22', 2);
          }
          break;
        }
        case 'movingPlatform': {
          r.setGlow('#8866cc', 0.7);
          r.fillRect(ox, obs.y, obs.w, obs.h, '#8866cc');
          r.setGlow(null);
          r.fillRect(ox, obs.y, obs.w, 3, '#aa88ee');
          break;
        }
        case 'wall': {
          r.fillRect(ox, obs.y, obs.w, obs.h, '#cc6644');
          // Brick lines
          for (let row = 0; row < obs.h; row += 10) {
            r.drawLine(ox, obs.y + row, ox + obs.w, obs.y + row, '#994422', 1);
          }
          break;
        }
      }
    }
  }

  function drawPlayerSprite(r, t, p, px, py) {
    // Stun flicker: encode via alpha hex. Use full or semi-transparent color.
    let alpha = p.stunTimer > 0
      ? (0.5 + Math.sin(raceTimer * 20) * 0.3)
      : 1.0;

    // Convert hex color to rgba string with alpha
    function colorWithAlpha(hex, a) {
      // hex is #rrggbb
      const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
      return hex + alphaHex;
    }

    const col = colorWithAlpha(p.color, alpha);

    r.setGlow(p.color, 0.8);

    if (p.diving) {
      // Diving pose: horizontal ellipse, tilted
      const rot = 0.3 * p.facing;
      const pts = ellipsePoints(px + p.w / 2, py + p.h * 0.6, p.w * 0.7, p.h * 0.35, rot, 16);
      r.fillPoly(pts, col);
    } else {
      // Blob body
      const bodyPts = ellipsePoints(px + p.w / 2, py + p.h * 0.4, p.w * 0.5, p.h * 0.45, 0, 16);
      r.fillPoly(bodyPts, col);

      // Legs
      let legOff = p.onGround ? Math.sin(p.runAnim) * 4 : 2;
      const legL = ellipsePoints(px + p.w * 0.3, py + p.h * 0.8 + legOff, 4, 5, 0, 10);
      const legR = ellipsePoints(px + p.w * 0.7, py + p.h * 0.8 - legOff, 4, 5, 0, 10);
      r.fillPoly(legL, col);
      r.fillPoly(legR, col);
    }

    r.setGlow(null);

    // Eyes
    let eyeOffX = p.facing * 3;
    const whiteAlpha = colorWithAlpha('#ffffff', alpha);
    const pupilAlpha = colorWithAlpha('#111111', alpha);
    r.fillCircle(px + p.w / 2 - 3 + eyeOffX, py + p.h * 0.3, 3, whiteAlpha);
    r.fillCircle(px + p.w / 2 + 3 + eyeOffX, py + p.h * 0.3, 3, whiteAlpha);
    r.fillCircle(px + p.w / 2 - 2 + eyeOffX, py + p.h * 0.3, 1.5, pupilAlpha);
    r.fillCircle(px + p.w / 2 + 4 + eyeOffX, py + p.h * 0.3, 1.5, pupilAlpha);

    // Slow label
    if (p.slowTimer > 0) {
      t.drawText('SLOW', px + p.w / 2, py - 14, 8, '#44cc44', 'center');
    }
  }

  function drawPlayer(r, t, p) {
    if (p.finished && finishOrder.indexOf(p.idx) >= 0) {
      let fx = courseLength - cameraX + 20 + finishOrder.indexOf(p.idx) * 25;
      if (fx < -30 || fx > W + 30) return;
      drawPlayerSprite(r, t, p, fx, GROUND_Y - PLAYER_H);
      return;
    }
    let px = p.x - cameraX;
    if (px < -40 || px > W + 40) return;
    drawPlayerSprite(r, t, p, px, p.y);
  }

  function drawFinishLine(r, t) {
    let fx = courseLength - cameraX;
    if (fx < -20 || fx > W + 20) return;

    // Pole
    r.fillRect(fx, GROUND_Y - 100, 4, 100, '#cccccc');

    // Checkered flag
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        let color = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
        r.fillRect(fx + 4 + col * 5, GROUND_Y - 100 + row * 5, 5, 5, color);
      }
    }

    // Finish banner (vertical strip)
    r.fillRect(fx - 2, GROUND_Y - 70, 8, 70, '#ff44aa44');

    // "FINISH" text rotated — precompute rotated glyph positions
    // We'll draw it vertically instead (character by character top-to-bottom)
    const label = 'FINISH';
    for (let i = 0; i < label.length; i++) {
      t.drawText(label[i], fx - 3, GROUND_Y - 65 + i * 11, 9, '#ff44aa', 'center');
    }
  }

  function drawHUD(r, t) {
    // Minimap bar background
    r.fillRect(50, 10, W - 100, 12, '#ffffff15');
    r.strokePoly([
      { x: 50,       y: 10 },
      { x: W - 50,  y: 10 },
      { x: W - 50,  y: 22 },
      { x: 50,       y: 22 },
    ], '#ffffff33', 1, true);

    // Player dots on minimap
    for (let p of players) {
      let progress = Math.min(p.x / courseLength, 1);
      let mx = 50 + progress * (W - 100);
      r.fillCircle(mx, 16, 4, p.color);
    }

    // Finish marker
    r.fillRect(W - 50, 10, 2, 12, '#ffffff');

    // Position text
    let humanPlayer = players[0];
    let position = 1;
    for (let p of players) {
      if (p !== humanPlayer && p.x > humanPlayer.x) position++;
    }
    let suffix = ['st', 'nd', 'rd', 'th'][Math.min(position - 1, 3)];
    t.drawText(position + suffix + ' Place', 10, 28, 14, '#ffffff', 'left');

    // Player legend
    for (let i = 0; i < players.length; i++) {
      let p = players[i];
      let status = p.finished ? 'DONE' : Math.floor(p.x / courseLength * 100) + '%';
      t.drawText(p.name + ' ' + status, W - 140, 24 + i * 14, 10, p.color, 'left');
    }
  }

  function drawParticles(r) {
    for (let pt of particles) {
      let px = pt.x - cameraX;
      // Encode alpha into color string
      let a = Math.max(0, Math.min(1, pt.life));
      let alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
      r.fillCircle(px, pt.y, pt.r * a, pt.color + alphaHex);
    }
  }

  function drawCountdown(t) {
    let text = countdown > 0 ? Math.ceil(countdown).toString() : 'GO!';
    t.drawText(text, W / 2, H / 2 - 30, 60, '#ff44aa', 'center');
  }

  function drawRoundEnd(r, t) {
    r.fillRect(0, 0, W, H, '#1a1a2e88');

    t.drawText('Round ' + round + ' Complete!', W / 2, 60, 28, '#ff44aa', 'center');

    let pts = [10, 6, 3, 1];
    for (let i = 0; i < finishOrder.length; i++) {
      let p = players[finishOrder[i]];
      let posText = (i + 1) + '. ' + p.name + ' - ' + p.finishTime.toFixed(1) + 's (+' + (pts[i] || 0) + 'pts)';
      t.drawText(posText, W / 2, 110 + i * 30, 16, p.color, 'center');
    }

    for (let p of players) {
      if (!p.finished) {
        t.drawText('DNF - ' + p.name + ' (+0pts)', W / 2, 110 + finishOrder.length * 30, 16, '#666666', 'center');
      }
    }

    let nextMsg = round < TOTAL_ROUNDS
      ? 'Click for Round ' + (round + 1)
      : 'Click to see final results';
    t.drawText(nextMsg, W / 2, 310, 14, '#aaaaaa', 'center');
  }

  // ── Main draw ──

  game.onDraw = (r, t) => {
    drawBackground(r);

    if (gameState === 'menu') {
      // Decorative blobs on menu
      for (let i = 0; i < 5; i++) {
        r.fillCircle(100 + i * 120, 300 + Math.sin(i) * 30, 15, '#ff44aa33');
      }
      return;
    }

    drawGround(r);
    drawObstacles(r, t);
    drawFinishLine(r, t);

    // Draw players sorted by Y (depth)
    let sorted = [...players].sort((a, b) => a.y - b.y);
    for (let p of sorted) drawPlayer(r, t, p);

    drawParticles(r);
    drawHUD(r, t);

    if (gameState === 'countdown') drawCountdown(t);
    if (gameState === 'roundEnd') drawRoundEnd(r, t);
  };

  // ── Click handling ──

  const canvas = game.canvas;

  canvas.addEventListener('click', () => {
    if (gameState === 'menu') {
      startGame();
    } else if (gameState === 'roundEnd') {
      if (round < TOTAL_ROUNDS) {
        round++;
        courseLength = 2500 + round * 500;
        startRace();
      } else {
        showGameOver();
      }
    } else if (gameState === 'gameover') {
      playerScores = [0, 0, 0, 0];
      score = 0;
      round = 1;
      startGame();
    }
  });

  function showGameOver() {
    gameState = 'gameover';
    game.setState('over');

    let maxScore = Math.max(...playerScores);
    let winner = playerScores.indexOf(maxScore);

    let title = winner === 0 ? 'YOU WIN!' : NAMES[winner] + ' WINS!';

    let indices = [0, 1, 2, 3].sort((a, b) => playerScores[b] - playerScores[a]);
    let results = indices.map((idx, i) =>
      (i + 1) + '. ' + NAMES[idx] + ': ' + playerScores[idx] + ' pts'
    ).join('\n');

    game.showOverlay(title, results + '\n\nClick to play again');

    score = playerScores[0];
    if (scoreEl) scoreEl.textContent = score;
  }

  // ── Init ──

  game.onInit = () => {
    game.showOverlay('OBSTACLE COURSE RACE', 'Fall Guys-lite Party Racer!\nClick to start');
    game.setState('waiting');
  };

  game.start();
  return game;
}
