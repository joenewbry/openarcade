import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 500;

  // --- Constants ---
  const PLAYER_R = 10;
  const BULLET_SPEED = 8;
  const MOVE_SPEED = 2.2;
  const CROUCH_SPEED = 0.8;
  const MAX_AMMO = 50;
  const RELOAD_TIME = 60;
  const SHOOT_COOLDOWN = 8;
  const AI_SHOOT_COOLDOWN = 15;

  // --- Game State ---
  let score = 0;
  let coverObjects = [];
  let ammoPickups = [];
  let splats = [];
  let players = [];
  let bullets = [];
  let particles = [];
  let roundNum = 1;
  let blueWins = 0, redWins = 0;
  let roundEndTimer = 0;
  let roundMessage = '';
  let gameStartTime = 0;
  let frameCount = 0;

  // --- Mouse State (direct canvas listeners, not through Input) ---
  let mouseX = 300, mouseY = 250;
  let mouseDown = false;
  let shiftDown = false;

  // DOM refs for score bar
  const blueAliveEl = document.getElementById('blueAlive');
  const redAliveEl = document.getElementById('redAlive');
  const roundNumEl = document.getElementById('roundNum');
  const blueWinsEl = document.getElementById('blueWins');
  const redWinsEl = document.getElementById('redWins');

  // --- Canvas mouse listeners ---
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) * (W / r.width);
    mouseY = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener('mousedown', e => { mouseDown = true; e.preventDefault(); });
  canvas.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Shift key tracking
  document.addEventListener('keydown', e => {
    if (e.key === 'Shift') shiftDown = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'Shift') shiftDown = false;
  });

  // --- Collision helpers ---
  function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx - rw / 2, Math.min(cx, rx + rw / 2));
    const closestY = Math.max(ry - rh / 2, Math.min(cy, ry + rh / 2));
    const dx = cx - closestX, dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function rectContains(rx, ry, rw, rh, px, py) {
    return px >= rx - rw / 2 && px <= rx + rw / 2 && py >= ry - rh / 2 && py <= ry + rh / 2;
  }

  function lineLineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 0.001) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
    const left = rx - rw / 2, right = rx + rw / 2, top = ry - rh / 2, bottom = ry + rh / 2;
    if (lineLineIntersect(x1, y1, x2, y2, left, top, right, top)) return true;
    if (lineLineIntersect(x1, y1, x2, y2, right, top, right, bottom)) return true;
    if (lineLineIntersect(x1, y1, x2, y2, left, bottom, right, bottom)) return true;
    if (lineLineIntersect(x1, y1, x2, y2, left, top, left, bottom)) return true;
    return false;
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    for (const c of coverObjects) {
      if (lineRectIntersect(x1, y1, x2, y2, c.x, c.y, c.w, c.h)) return false;
    }
    return true;
  }

  function isNearCover(px, py, margin) {
    for (const c of coverObjects) {
      if (circleRectOverlap(px, py, margin || 20, c.x, c.y, c.w, c.h)) return true;
    }
    return false;
  }

  function getNearestCover(px, py) {
    let best = null, bestD = Infinity;
    for (const c of coverObjects) {
      const d = Math.hypot(c.x - px, c.y - py);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function pushOutOfCover(p) {
    for (const c of coverObjects) {
      if (circleRectOverlap(p.x, p.y, p.r, c.x, c.y, c.w, c.h)) {
        const cx = Math.max(c.x - c.w / 2, Math.min(p.x, c.x + c.w / 2));
        const cy = Math.max(c.y - c.h / 2, Math.min(p.y, c.y + c.h / 2));
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) {
          const push = p.r - dist + 1;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        } else {
          p.x += p.r + 1;
        }
      }
    }
  }

  // --- Map Generation ---
  function generateMap() {
    coverObjects = [];
    coverObjects.push({ x: 300, y: 250, w: 50, h: 20, type: 'bunker' });
    coverObjects.push({ x: 300, y: 170, w: 20, h: 40, type: 'wall' });
    coverObjects.push({ x: 300, y: 330, w: 20, h: 40, type: 'wall' });
    coverObjects.push({ x: 120, y: 120, w: 40, h: 15, type: 'sandbag' });
    coverObjects.push({ x: 100, y: 250, w: 15, h: 50, type: 'wall' });
    coverObjects.push({ x: 150, y: 380, w: 35, h: 15, type: 'sandbag' });
    coverObjects.push({ x: 200, y: 180, w: 20, h: 20, type: 'barrel' });
    coverObjects.push({ x: 220, y: 320, w: 24, h: 24, type: 'tree' });
    coverObjects.push({ x: 480, y: 120, w: 40, h: 15, type: 'sandbag' });
    coverObjects.push({ x: 500, y: 250, w: 15, h: 50, type: 'wall' });
    coverObjects.push({ x: 450, y: 380, w: 35, h: 15, type: 'sandbag' });
    coverObjects.push({ x: 400, y: 180, w: 20, h: 20, type: 'barrel' });
    coverObjects.push({ x: 380, y: 320, w: 24, h: 24, type: 'tree' });
    coverObjects.push({ x: 200, y: 60, w: 30, h: 12, type: 'sandbag' });
    coverObjects.push({ x: 400, y: 440, w: 30, h: 12, type: 'sandbag' });
    coverObjects.push({ x: 60, y: 60, w: 22, h: 22, type: 'tree' });
    coverObjects.push({ x: 540, y: 440, w: 22, h: 22, type: 'tree' });
    coverObjects.push({ x: 60, y: 440, w: 22, h: 22, type: 'tree' });
    coverObjects.push({ x: 540, y: 60, w: 22, h: 22, type: 'tree' });
  }

  function spawnAmmoPickups() {
    ammoPickups = [];
    const spots = [{ x: 300, y: 100 }, { x: 300, y: 400 }, { x: 150, y: 250 }, { x: 450, y: 250 }, { x: 200, y: 150 }, { x: 400, y: 350 }];
    for (const s of spots) {
      ammoPickups.push({ x: s.x, y: s.y, active: true, respawn: 0 });
    }
  }

  function createPlayers() {
    players = [];
    const blueSpawns = [{ x: 40, y: 200 }, { x: 40, y: 250 }, { x: 40, y: 300 }];
    for (let i = 0; i < 3; i++) {
      players.push({
        x: blueSpawns[i].x, y: blueSpawns[i].y, vx: 0, vy: 0, angle: 0,
        team: 'blue', human: i === 0, dead: false, ammo: MAX_AMMO,
        reloading: false, reloadTimer: 0, shootCooldown: 0, crouching: false, behindCover: false,
        r: PLAYER_R, id: i, aiTarget: null, aiMoveTarget: null, aiState: 'advance', aiStateTimer: 0,
        aiAccuracy: 0.6 + Math.random() * 0.2, aiBravery: 0.3 + Math.random() * 0.5,
        aiLastShootDir: 0, eliminations: 0,
      });
    }
    const redSpawns = [{ x: 560, y: 200 }, { x: 560, y: 250 }, { x: 560, y: 300 }];
    for (let i = 0; i < 3; i++) {
      players.push({
        x: redSpawns[i].x, y: redSpawns[i].y, vx: 0, vy: 0, angle: Math.PI,
        team: 'red', human: false, dead: false, ammo: MAX_AMMO,
        reloading: false, reloadTimer: 0, shootCooldown: 0, crouching: false, behindCover: false,
        r: PLAYER_R, id: i + 3, aiTarget: null, aiMoveTarget: null, aiState: 'advance', aiStateTimer: 0,
        aiAccuracy: 0.5 + Math.random() * 0.25, aiBravery: 0.3 + Math.random() * 0.5,
        aiLastShootDir: 0, eliminations: 0,
      });
    }
  }

  function getHumanPlayer() {
    return players.find(p => p.human);
  }

  // --- Shooting ---
  function shoot(p) {
    if (p.dead || p.ammo <= 0 || p.shootCooldown > 0 || p.reloading) return;
    p.ammo--;
    p.shootCooldown = p.human ? SHOOT_COOLDOWN : AI_SHOOT_COOLDOWN;
    const bx = p.x + Math.cos(p.angle) * 14;
    const by = p.y + Math.sin(p.angle) * 14;
    const spread = p.human ? 0.04 : (0.1 * (1 - p.aiAccuracy));
    const a = p.angle + (Math.random() - 0.5) * spread;
    bullets.push({
      x: bx, y: by,
      vx: Math.cos(a) * BULLET_SPEED,
      vy: Math.sin(a) * BULLET_SPEED,
      team: p.team, owner: p.id, life: 80,
      color: p.team === 'blue' ? '#4af' : '#f55',
    });
    for (let i = 0; i < 4; i++) {
      const pa = a + (Math.random() - 0.5) * 0.5;
      particles.push({
        x: bx, y: by,
        vx: Math.cos(pa) * (2 + Math.random() * 3),
        vy: Math.sin(pa) * (2 + Math.random() * 3),
        life: 10 + Math.random() * 8,
        color: p.team === 'blue' ? '#4af' : '#f55',
        r: 2 + Math.random() * 2,
      });
    }
    if (p.ammo <= 0 && !p.reloading) {
      p.reloading = true;
      p.reloadTimer = RELOAD_TIME;
    }
  }

  // --- AI ---
  function findCoverToward(p, target) {
    let best = null, bestScore = -Infinity;
    for (const c of coverObjects) {
      const dToTarget = Math.hypot(target.x - c.x, target.y - c.y);
      const dFromMe = Math.hypot(c.x - p.x, c.y - p.y);
      const score = -dToTarget * 0.3 - dFromMe * 0.7;
      if (dFromMe > 15 && dToTarget < Math.hypot(target.x - p.x, target.y - p.y) && score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  function updateAI(p) {
    if (p.dead || p.human) return;
    const enemies = players.filter(e => e.team !== p.team && !e.dead);
    if (enemies.length === 0) return;

    let nearestVis = null, nearestVisDist = Infinity;
    let nearest = null, nearestDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
      if (hasLineOfSight(p.x, p.y, e.x, e.y) && d < nearestVisDist) {
        nearestVisDist = d; nearestVis = e;
      }
    }

    p.aiStateTimer--;
    if (p.aiStateTimer <= 0) {
      if (p.ammo < 10 && !p.reloading) {
        p.aiState = 'retreat';
        p.aiStateTimer = 60 + Math.random() * 40;
      } else if (nearestVis && nearestVisDist < 120) {
        p.aiState = Math.random() < p.aiBravery ? 'aggressive' : 'cover';
        p.aiStateTimer = 40 + Math.random() * 40;
      } else if (!nearestVis && Math.random() < 0.4) {
        p.aiState = 'flank';
        p.aiStateTimer = 80 + Math.random() * 60;
      } else if (nearestVis) {
        p.aiState = Math.random() < 0.5 ? 'advance' : 'cover';
        p.aiStateTimer = 50 + Math.random() * 50;
      } else {
        p.aiState = 'advance';
        p.aiStateTimer = 40 + Math.random() * 40;
      }
    }

    if (p.ammo < 15 && !p.reloading && p.ammo > 0 && (!nearestVis || nearestVisDist > 150)) {
      p.reloading = true;
      p.reloadTimer = RELOAD_TIME;
    }

    let moveX = 0, moveY = 0;
    let wantCrouch = false;

    switch (p.aiState) {
      case 'advance': {
        if (nearest) {
          const cov = findCoverToward(p, nearest);
          if (cov && Math.hypot(cov.x - p.x, cov.y - p.y) > 25) {
            const ang = Math.atan2(cov.y - p.y, cov.x - p.x);
            moveX = Math.cos(ang); moveY = Math.sin(ang);
          } else {
            const ang = Math.atan2(nearest.y - p.y, nearest.x - p.x);
            moveX = Math.cos(ang) * 0.5; moveY = Math.sin(ang) * 0.5;
          }
        }
        break;
      }
      case 'cover': {
        const cov = getNearestCover(p.x, p.y);
        if (cov && nearest) {
          const eAngle = Math.atan2(nearest.y - cov.y, nearest.x - cov.x);
          const behindX = cov.x - Math.cos(eAngle) * (cov.w / 2 + 20);
          const behindY = cov.y - Math.sin(eAngle) * (cov.h / 2 + 20);
          const d = Math.hypot(behindX - p.x, behindY - p.y);
          if (d > 10) {
            const ang = Math.atan2(behindY - p.y, behindX - p.x);
            moveX = Math.cos(ang); moveY = Math.sin(ang);
          } else {
            wantCrouch = true;
          }
        }
        break;
      }
      case 'flank': {
        if (nearest) {
          const ang = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          const flankDir = (p.id % 2 === 0) ? 1 : -1;
          const fa = ang + flankDir * Math.PI / 3;
          moveX = Math.cos(fa); moveY = Math.sin(fa);
        }
        break;
      }
      case 'retreat': {
        const safeX = p.team === 'blue' ? 80 : 520;
        const ang = Math.atan2(250 - p.y, safeX - p.x);
        moveX = Math.cos(ang); moveY = Math.sin(ang);
        wantCrouch = isNearCover(p.x, p.y, 25);
        if (!p.reloading && p.ammo < MAX_AMMO) {
          p.reloading = true;
          p.reloadTimer = RELOAD_TIME;
        }
        break;
      }
      case 'aggressive': {
        if (nearest) {
          const ang = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          moveX = Math.cos(ang) * 1.2; moveY = Math.sin(ang) * 1.2;
        }
        break;
      }
    }

    if (p.ammo < 20 && !p.reloading) {
      const pickup = ammoPickups.find(a => a.active && Math.hypot(a.x - p.x, a.y - p.y) < 200);
      if (pickup) {
        const ang = Math.atan2(pickup.y - p.y, pickup.x - p.x);
        moveX = Math.cos(ang); moveY = Math.sin(ang);
      }
    }

    const spd = wantCrouch ? CROUCH_SPEED : MOVE_SPEED;
    p.crouching = wantCrouch;
    p.vx = moveX * spd;
    p.vy = moveY * spd;

    if (nearestVis) {
      const targetAngle = Math.atan2(nearestVis.y - p.y, nearestVis.x - p.x);
      let diff = targetAngle - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.angle += diff * 0.15;
      const aimError = Math.abs(diff);
      if (aimError < 0.2 && !p.reloading && p.ammo > 0 && nearestVisDist < 350) {
        const shouldShoot = !nearestVis.crouching || nearestVisDist < 100 || Math.random() < 0.3;
        if (shouldShoot) shoot(p);
      }
    } else if (nearest) {
      const targetAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
      let diff = targetAngle - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.angle += diff * 0.05;
    }
  }

  // --- Round / Match flow ---
  function startRound() {
    generateMap();
    spawnAmmoPickups();
    createPlayers();
    bullets = [];
    particles = [];
    if (splats.length > 100) splats = splats.slice(-50);
    roundEndTimer = 0;
    roundMessage = '';
    if (blueAliveEl) blueAliveEl.textContent = '3';
    if (redAliveEl) redAliveEl.textContent = '3';
  }

  function startMatch() {
    score = 0;
    roundNum = 1;
    blueWins = 0;
    redWins = 0;
    splats = [];
    if (blueWinsEl) blueWinsEl.textContent = '0';
    if (redWinsEl) redWinsEl.textContent = '0';
    if (roundNumEl) roundNumEl.textContent = '1';
    gameStartTime = frameCount;
    startRound();
    game.setState('playing');
  }

  function endMatch() {
    const winner = blueWins > redWins ? 'BLUE' : 'RED';
    const title = winner + ' TEAM WINS!';
    game.showOverlay(title, 'Final Score: ' + blueWins + ' - ' + redWins + '  |  Your Eliminations: ' + score);
    game.setState('over');
  }

  // --- onInit ---
  game.onInit = () => {
    game.showOverlay('PAINTBALL SKIRMISH', 'WASD=Move | Mouse=Aim | Click=Shoot | R=Reload | Shift=Crouch');
    game.setState('waiting');

    // Start button wires up through the overlay button in HTML
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.onclick = () => startMatch();
    }
  };

  // --- Score function ---
  game.setScoreFn(() => score);

  // --- onUpdate ---
  game.onUpdate = () => {
    frameCount++;

    if (game.state === 'waiting') return;

    // R key: reload human player
    if (game.input.wasPressed('r') || game.input.wasPressed('R')) {
      const hp = getHumanPlayer();
      if (hp && !hp.dead && hp.ammo < MAX_AMMO && !hp.reloading) {
        hp.reloading = true;
        hp.reloadTimer = RELOAD_TIME;
      }
    }

    // Round-end pause
    if (roundEndTimer > 0) {
      roundEndTimer--;
      if (roundEndTimer <= 0) {
        if (blueWins >= 3 || redWins >= 3) {
          endMatch();
        } else {
          startRound();
        }
      }
      return;
    }

    if (game.state !== 'playing') return;

    // Update players
    for (const p of players) {
      if (p.dead) continue;

      if (p.human) {
        let mx = 0, my = 0;
        if (game.input.isDown('w') || game.input.isDown('ArrowUp')) my = -1;
        if (game.input.isDown('s') || game.input.isDown('ArrowDown')) my = 1;
        if (game.input.isDown('a') || game.input.isDown('ArrowLeft')) mx = -1;
        if (game.input.isDown('d') || game.input.isDown('ArrowRight')) mx = 1;
        const len = Math.hypot(mx, my);
        if (len > 0) { mx /= len; my /= len; }
        p.crouching = shiftDown && isNearCover(p.x, p.y, 25);
        const spd = p.crouching ? CROUCH_SPEED : MOVE_SPEED;
        p.vx = mx * spd;
        p.vy = my * spd;
        p.angle = Math.atan2(mouseY - p.y, mouseX - p.x);
        if (mouseDown) shoot(p);
      } else {
        updateAI(p);
      }

      // Reload
      if (p.reloading) {
        p.reloadTimer--;
        if (p.reloadTimer <= 0) {
          p.ammo = MAX_AMMO;
          p.reloading = false;
        }
      }
      p.shootCooldown = Math.max(0, p.shootCooldown - 1);

      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.x = Math.max(p.r, Math.min(W - p.r, p.x));
      p.y = Math.max(p.r, Math.min(H - p.r, p.y));
      pushOutOfCover(p);
      p.behindCover = p.crouching && isNearCover(p.x, p.y, 20);

      // Ammo pickups
      for (const a of ammoPickups) {
        if (a.active && Math.hypot(a.x - p.x, a.y - p.y) < 18) {
          a.active = false;
          a.respawn = 300 + Math.random() * 200;
          p.ammo = Math.min(MAX_AMMO, p.ammo + 20);
          for (let i = 0; i < 8; i++) {
            particles.push({
              x: a.x, y: a.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 20, color: '#ff0', r: 3,
            });
          }
        }
      }
    }

    // Ammo respawn
    for (const a of ammoPickups) {
      if (!a.active) {
        a.respawn--;
        if (a.respawn <= 0) a.active = true;
      }
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || b.life <= 0) {
        bullets.splice(i, 1);
        continue;
      }

      let hitCover = false;
      for (const c of coverObjects) {
        if (rectContains(c.x, c.y, c.w + 4, c.h + 4, b.x, b.y)) {
          hitCover = true;
          splats.push({ x: b.x, y: b.y, r: 4 + Math.random() * 4, color: b.color, alpha: 0.7 });
          for (let j = 0; j < 3; j++) {
            particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 12, color: b.color, r: 2 });
          }
          break;
        }
      }
      if (hitCover) { bullets.splice(i, 1); continue; }

      let hitPlayer = false;
      for (const p of players) {
        if (p.dead || p.team === b.team) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + 3) {
          if (p.behindCover && Math.random() < 0.7) {
            splats.push({ x: b.x, y: b.y, r: 3, color: b.color, alpha: 0.5 });
            hitPlayer = true;
            break;
          }
          p.dead = true;
          hitPlayer = true;
          const owner = players.find(pl => pl.id === b.owner);
          if (owner) owner.eliminations++;
          if (b.team === 'blue') score++;

          for (let j = 0; j < 20; j++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 1 + Math.random() * 5;
            particles.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 25 + Math.random() * 15, color: b.color, r: 3 + Math.random() * 5 });
          }
          for (let j = 0; j < 6; j++) {
            splats.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 30, r: 8 + Math.random() * 12, color: b.color, alpha: 0.4 + Math.random() * 0.3 });
          }
          break;
        }
      }
      if (hitPlayer) { bullets.splice(i, 1); continue; }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Check round end
    const blueAlive = players.filter(p => p.team === 'blue' && !p.dead).length;
    const redAlive = players.filter(p => p.team === 'red' && !p.dead).length;
    if (blueAliveEl) blueAliveEl.textContent = blueAlive;
    if (redAliveEl) redAliveEl.textContent = redAlive;

    if (blueAlive === 0 || redAlive === 0) {
      if (blueAlive === 0) {
        redWins++;
        roundMessage = 'RED TEAM WINS ROUND ' + roundNum + '!';
      } else {
        blueWins++;
        roundMessage = 'BLUE TEAM WINS ROUND ' + roundNum + '!';
      }
      roundNum++;
      if (blueWinsEl) blueWinsEl.textContent = blueWins;
      if (redWinsEl) redWinsEl.textContent = redWins;
      if (roundNumEl) roundNumEl.textContent = Math.min(roundNum, 5);
      roundEndTimer = 120;
    }
  };

  // --- onDraw ---
  game.onDraw = (renderer, text) => {
    // Background field
    renderer.fillRect(0, 0, W, H, '#1a2a1a');

    // Grid lines
    for (let x = 0; x < W; x += 40) {
      renderer.drawLine(x, 0, x, H, '#1e361e', 1);
    }
    for (let y = 0; y < H; y += 40) {
      renderer.drawLine(0, y, W, y, '#1e361e', 1);
    }

    // Center line
    renderer.drawLine(W / 2, 0, W / 2, H, '#ffffff1a', 2);

    // Spawn zones
    renderer.fillRect(0, 0, 80, H, '#4af0000d');
    renderer.fillRect(W - 80, 0, 80, H, '#f550000d');

    // Splats (ground)
    for (const s of splats) {
      const alpha = Math.round(s.alpha * 0.6 * 255).toString(16).padStart(2, '0');
      const col = s.color + alpha;
      renderer.fillCircle(s.x, s.y, s.r, col);
      // Irregular extra blobs — use fixed offsets per splat to avoid randomness in draw
      renderer.fillCircle(s.x + s.r * 0.4, s.y - s.r * 0.3, s.r * 0.4, col);
      renderer.fillCircle(s.x - s.r * 0.5, s.y + s.r * 0.2, s.r * 0.35, col);
    }

    // Ammo pickups
    const pulseAlpha = Math.round((0.6 + 0.3 * Math.sin(frameCount * 0.05)) * 255).toString(16).padStart(2, '0');
    for (const a of ammoPickups) {
      if (!a.active) continue;
      renderer.fillCircle(a.x, a.y, 8, '#ffff00' + pulseAlpha);
      text.drawText('A', a.x, a.y - 5, 10, '#000000', 'center');
    }

    // Cover objects
    for (const c of coverObjects) {
      const lx = c.x - c.w / 2, ly = c.y - c.h / 2;
      switch (c.type) {
        case 'bunker': {
          renderer.fillRect(lx, ly, c.w, c.h, '#556677');
          renderer.strokePoly([
            { x: lx, y: ly }, { x: lx + c.w, y: ly },
            { x: lx + c.w, y: ly + c.h }, { x: lx, y: ly + c.h },
          ], '#7788aa', 2);
          // Sandbag texture stripes
          for (let i = 0; i < c.w; i += 8) {
            renderer.fillRect(lx + i, ly, 6, c.h, '#66778880');
          }
          break;
        }
        case 'wall': {
          renderer.fillRect(lx, ly, c.w, c.h, '#5a5a6a');
          renderer.strokePoly([
            { x: lx, y: ly }, { x: lx + c.w, y: ly },
            { x: lx + c.w, y: ly + c.h }, { x: lx, y: ly + c.h },
          ], '#7a7a8a', 2);
          break;
        }
        case 'tree': {
          // Trunk
          renderer.fillRect(c.x - 3, c.y - 3, 6, 6, '#554433');
          // Canopy
          renderer.fillCircle(c.x, c.y, c.w / 2, '#2a5a2a');
          // Outline via strokePoly approximation: use 8-point circle
          const pts = [];
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            pts.push({ x: c.x + Math.cos(ang) * (c.w / 2), y: c.y + Math.sin(ang) * (c.w / 2) });
          }
          renderer.strokePoly(pts, '#3a7a3a', 1);
          break;
        }
        case 'barrel': {
          renderer.fillCircle(c.x, c.y, c.w / 2, '#665544');
          const bpts = [];
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            bpts.push({ x: c.x + Math.cos(ang) * (c.w / 2), y: c.y + Math.sin(ang) * (c.w / 2) });
          }
          renderer.strokePoly(bpts, '#887766', 2);
          const ipts = [];
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            ipts.push({ x: c.x + Math.cos(ang) * (c.w / 4), y: c.y + Math.sin(ang) * (c.w / 4) });
          }
          renderer.strokePoly(ipts, '#554433', 1.5);
          break;
        }
        case 'sandbag': {
          renderer.fillRect(lx, ly, c.w, c.h, '#8a7a5a');
          renderer.strokePoly([
            { x: lx, y: ly }, { x: lx + c.w, y: ly },
            { x: lx + c.w, y: ly + c.h }, { x: lx, y: ly + c.h },
          ], '#9a8a6a', 1);
          for (let i = 0; i < c.w; i += 10) {
            renderer.drawLine(lx + i, ly, lx + i, ly + c.h, '#9a8a6a', 1);
          }
          break;
        }
      }
    }

    // Players
    for (const p of players) {
      const isBlue = p.team === 'blue';
      const mainColor = isBlue ? '#44aaff' : '#ff5555';
      const darkColor = isBlue ? '#2288aa' : '#aa3333';

      if (p.dead) {
        // X mark at half alpha
        renderer.drawLine(p.x - 8, p.y - 8, p.x + 8, p.y + 8, mainColor + '66', 3);
        renderer.drawLine(p.x + 8, p.y - 8, p.x - 8, p.y + 8, mainColor + '66', 3);
        continue;
      }

      // Crouch indicator (dashed ring)
      if (p.crouching) {
        renderer.dashedLine(
          p.x + (p.r + 6), p.y, p.x + (p.r + 6) * Math.cos(Math.PI), p.y + (p.r + 6) * Math.sin(Math.PI),
          '#ffffff4d', 1, 4, 4
        );
        // Simple approach: draw a thin outline circle as strokePoly
        const dpts = [];
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          dpts.push({ x: p.x + Math.cos(ang) * (p.r + 6), y: p.y + Math.sin(ang) * (p.r + 6) });
        }
        renderer.strokePoly(dpts, '#ffffff33', 1);
      }

      // Body circle
      const bodyColor = p.crouching ? darkColor : mainColor;
      const bodyR = p.crouching ? p.r - 2 : p.r;
      renderer.fillCircle(p.x, p.y, bodyR, bodyColor);
      // White outline
      const bpts = [];
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        bpts.push({ x: p.x + Math.cos(ang) * bodyR, y: p.y + Math.sin(ang) * bodyR });
      }
      renderer.strokePoly(bpts, '#ffffff', 1.5);

      // Gun barrel
      const gx = p.x + Math.cos(p.angle) * 14;
      const gy = p.y + Math.sin(p.angle) * 14;
      renderer.drawLine(
        p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8,
        gx, gy, '#dddddd', 3
      );

      // Human ring
      if (p.human) {
        const hpts = [];
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          hpts.push({ x: p.x + Math.cos(ang) * (p.r + 4), y: p.y + Math.sin(ang) * (p.r + 4) });
        }
        renderer.strokePoly(hpts, '#ffffff', 1);
      }

      // "YOU" label
      if (p.human) {
        text.drawText('YOU', p.x, p.y - p.r - 12, 10, '#ffffff', 'center');
      }

      // Ammo bar
      const barW = 16, barH = 3;
      const barX = p.x - barW / 2, barY = p.y + p.r + 4;
      renderer.fillRect(barX, barY, barW, barH, '#333333');
      const ammoFrac = p.ammo / MAX_AMMO;
      const barColor = p.reloading ? '#ff8800' : (ammoFrac < 0.2 ? '#ff0000' : '#00ff00');
      renderer.fillRect(barX, barY, barW * ammoFrac, barH, barColor);
    }

    // Bullets
    for (const b of bullets) {
      renderer.fillCircle(b.x, b.y, 3, b.color + 'e6');
      // Trail
      renderer.fillCircle(b.x - b.vx * 0.5, b.y - b.vy * 0.5, 2, b.color + '4d');
    }

    // Particles
    for (const p of particles) {
      const lifeAlpha = Math.round((p.life / 30) * 255).toString(16).padStart(2, '0');
      const scaledR = p.r * (p.life / 30);
      if (scaledR > 0.5) {
        renderer.fillCircle(p.x, p.y, scaledR, p.color + lifeAlpha);
      }
    }

    // HUD for human player
    const hp = getHumanPlayer();
    if (hp && !hp.dead && game.state === 'playing') {
      // Ammo panel background
      renderer.fillRect(8, H - 48, 140, 40, '#00000099');
      renderer.strokePoly([
        { x: 8, y: H - 48 }, { x: 148, y: H - 48 },
        { x: 148, y: H - 8 }, { x: 8, y: H - 8 },
      ], '#44aaff', 1);

      if (hp.reloading) {
        const pct = Math.round((1 - hp.reloadTimer / RELOAD_TIME) * 100);
        text.drawText('RELOADING ' + pct + '%', 14, H - 44, 13, '#ff8800', 'left');
      } else {
        text.drawText('AMMO: ' + hp.ammo + '/' + MAX_AMMO, 14, H - 44, 13, '#ffffff', 'left');
      }
      // Ammo bar
      renderer.fillRect(14, H - 24, 120, 8, '#333333');
      const af = hp.ammo / MAX_AMMO;
      const barCol = hp.reloading ? '#ff8800' : (af < 0.2 ? '#ff0000' : '#44aaff');
      renderer.fillRect(14, H - 24, 120 * af, 8, barCol);

      // Crosshair at mouse
      renderer.strokePoly(
        (() => { const pts = []; for (let i = 0; i < 24; i++) { const ang = (i / 24) * Math.PI * 2; pts.push({ x: mouseX + Math.cos(ang) * 12, y: mouseY + Math.sin(ang) * 12 }); } return pts; })(),
        '#ffffff99', 1
      );
      renderer.drawLine(mouseX - 16, mouseY, mouseX - 6, mouseY, '#ffffff99', 1);
      renderer.drawLine(mouseX + 6, mouseY, mouseX + 16, mouseY, '#ffffff99', 1);
      renderer.drawLine(mouseX, mouseY - 16, mouseX, mouseY - 6, '#ffffff99', 1);
      renderer.drawLine(mouseX, mouseY + 6, mouseX, mouseY + 16, '#ffffff99', 1);

    } else if (hp && hp.dead && game.state === 'playing') {
      renderer.fillRect(0, 0, W, H, '#00000066');
      text.drawText('ELIMINATED', W / 2, H / 2 - 20, 24, '#ff5555', 'center');
      text.drawText('Watching teammates...', W / 2, H / 2 + 12, 14, '#aaaaaa', 'center');
    }

    // Shift hint
    if (hp && !hp.dead && game.state === 'playing' && isNearCover(hp.x, hp.y, 30) && !hp.crouching) {
      text.drawText('[SHIFT] Crouch behind cover', hp.x, hp.y - 24, 10, '#ffffff80', 'center');
    }

    // Round message
    if (roundEndTimer > 0) {
      renderer.fillRect(0, H / 2 - 30, W, 60, '#00000080');
      const msgColor = roundMessage.includes('BLUE') ? '#44aaff' : '#ff5555';
      text.drawText(roundMessage, W / 2, H / 2 - 22, 22, msgColor, 'center');
      text.drawText('Score: ' + blueWins + ' - ' + redWins, W / 2, H / 2 + 10, 12, '#aaaaaa', 'center');
    }

    // Controls hint (first ~4s = 240 frames)
    if (game.state === 'playing' && roundNum === 1 && (frameCount - gameStartTime) < 240) {
      renderer.fillRect(W / 2 - 150, H - 20, 300, 16, '#00000080');
      text.drawText('WASD=Move  Mouse=Aim  Click=Shoot  R=Reload  Shift=Crouch', W / 2, H - 18, 10, '#888888', 'center');
    }
  };

  game.start();
  return game;
}
