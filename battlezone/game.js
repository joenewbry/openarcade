// battlezone/game.js — Battlezone game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Theme
const THEME = '#4e8';
const THEME_DIM = '#295';
const THEME_BRIGHT = '#6fa';

// Camera / perspective
const FOV = 60 * Math.PI / 180;
const NEAR = 0.1;
const FAR = 800;
const HORIZON_Y = H * 0.45;
const VP_DIST = (W / 2) / Math.tan(FOV / 2);

// Player
const MOVE_SPEED = 2.5;
const ROT_SPEED = 0.035;
const ARENA_SIZE = 600;
const BULLET_SPEED = 12;
const BULLET_LIFE = 80;
const FIRE_COOLDOWN = 15;

// Enemy
const ENEMY_SPEED = 1.0;
const ENEMY_FIRE_INTERVAL_MIN = 90;
const ENEMY_FIRE_INTERVAL_MAX = 200;
const ENEMY_BULLET_SPEED = 6;

// ── State ──
let score, best = 0;
let playerX, playerZ, playerAngle;
let enemies, playerBullets, enemyBullets, particles, obstacles;
let fireCooldown, tick, difficulty;
let spawnTimer, spawnInterval;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// Mountains (static horizon decoration)
const mountains = [];
for (let i = 0; i < 20; i++) {
  mountains.push({
    angle: (i / 20) * Math.PI * 2,
    height: 20 + Math.random() * 50,
    width: 0.15 + Math.random() * 0.2
  });
}

// Stars (static positions)
const stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({
    x: ((i * 137 + 83) % W),
    y: ((i * 97 + 17) % (HORIZON_Y - 20))
  });
}

// Project 3D point to 2D screen
function project(wx, wy, wz) {
  const dx = wx - playerX;
  const dz = wz - playerZ;
  const cosA = Math.cos(-playerAngle);
  const sinA = Math.sin(-playerAngle);
  const rx = dx * cosA - dz * sinA;
  const rz = dx * sinA + dz * cosA;

  if (rz <= NEAR) return null;

  const sx = W / 2 + (rx * VP_DIST) / rz;
  const sy = HORIZON_Y - (wy * VP_DIST) / rz;
  const scale = VP_DIST / rz;

  return { x: sx, y: sy, z: rz, scale };
}

function generateObstacles() {
  obstacles = [];
  for (let i = 0; i < 8; i++) {
    obstacles.push({
      x: (Math.random() - 0.5) * ARENA_SIZE * 1.5,
      z: (Math.random() - 0.5) * ARENA_SIZE * 1.5,
      size: 15 + Math.random() * 20,
      height: 20 + Math.random() * 30
    });
  }
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 200 + Math.random() * 300;
  const ex = playerX + Math.cos(angle) * dist;
  const ez = playerZ + Math.sin(angle) * dist;
  enemies.push({
    x: ex, z: ez,
    angle: Math.atan2(playerZ - ez, playerX - ex),
    alive: true,
    hp: 1 + Math.floor(difficulty / 3),
    fireTimer: ENEMY_FIRE_INTERVAL_MIN + Math.random() * (ENEMY_FIRE_INTERVAL_MAX - ENEMY_FIRE_INTERVAL_MIN),
    moveTimer: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 60 + Math.random() * 120
  });
}

function spawnExplosion(x, z, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.5 + Math.random() * 3;
    const elev = Math.random() * 3;
    particles.push({
      x, y: 10 + Math.random() * 20, z,
      vx: Math.cos(ang) * spd,
      vy: elev,
      vz: Math.sin(ang) * spd,
      life: 20 + Math.random() * 30,
      maxLife: 50
    });
  }
}

function shoot() {
  if (fireCooldown > 0) return;
  fireCooldown = FIRE_COOLDOWN;
  playerBullets.push({
    x: playerX + Math.cos(playerAngle) * 10,
    z: playerZ + Math.sin(playerAngle) * 10,
    vx: Math.cos(playerAngle) * BULLET_SPEED,
    vz: Math.sin(playerAngle) * BULLET_SPEED,
    life: BULLET_LIFE
  });
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    playerX = 0;
    playerZ = 0;
    playerAngle = 0;
    enemies = [];
    playerBullets = [];
    enemyBullets = [];
    particles = [];
    fireCooldown = 0;
    tick = 0;
    difficulty = 0;
    spawnTimer = 0;
    spawnInterval = 180;
    generateObstacles();
    game.showOverlay('BATTLEZONE', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        spawnEnemy();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;
    difficulty = Math.min(score / 50, 10);

    // Player movement
    if (input.isDown('ArrowUp')) {
      playerX += Math.cos(playerAngle) * MOVE_SPEED;
      playerZ += Math.sin(playerAngle) * MOVE_SPEED;
    }
    if (input.isDown('ArrowDown')) {
      playerX -= Math.cos(playerAngle) * MOVE_SPEED * 0.6;
      playerZ -= Math.sin(playerAngle) * MOVE_SPEED * 0.6;
    }
    if (input.isDown('ArrowLeft')) {
      playerAngle -= ROT_SPEED;
    }
    if (input.isDown('ArrowRight')) {
      playerAngle += ROT_SPEED;
    }

    // Fire
    if (input.wasPressed(' ')) shoot();

    // Fire cooldown
    if (fireCooldown > 0) fireCooldown--;

    // Spawn enemies
    spawnTimer++;
    const adjInterval = Math.max(60, spawnInterval - difficulty * 12);
    if (spawnTimer >= adjInterval && enemies.filter(e => e.alive).length < 3 + Math.floor(difficulty)) {
      spawnEnemy();
      spawnTimer = 0;
    }

    // Update enemies
    for (const e of enemies) {
      if (!e.alive) continue;

      // Face player
      const toPlayerAngle = Math.atan2(playerZ - e.z, playerX - e.x);
      let angleDiff = toPlayerAngle - e.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      e.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.02 + difficulty * 0.003);

      // Move toward player
      const distToPlayer = Math.sqrt((playerX - e.x) ** 2 + (playerZ - e.z) ** 2);
      const speed = ENEMY_SPEED + difficulty * 0.1;

      if (distToPlayer > 80) {
        e.x += Math.cos(e.angle) * speed;
        e.z += Math.sin(e.angle) * speed;
      } else if (distToPlayer < 50) {
        e.x -= Math.cos(e.angle) * speed * 0.5;
        e.z -= Math.sin(e.angle) * speed * 0.5;
      }

      // Strafe
      e.strafeTimer--;
      if (e.strafeTimer <= 0) {
        e.strafeDir *= -1;
        e.strafeTimer = 60 + Math.random() * 120;
      }
      const strafeAngle = e.angle + Math.PI / 2;
      e.x += Math.cos(strafeAngle) * speed * 0.3 * e.strafeDir;
      e.z += Math.sin(strafeAngle) * speed * 0.3 * e.strafeDir;

      // Enemy fire
      e.fireTimer--;
      if (e.fireTimer <= 0 && distToPlayer < 400) {
        const fireAngle = Math.atan2(playerZ - e.z, playerX - e.x);
        const spread = (0.1 - difficulty * 0.005) * (Math.random() - 0.5) * 2;
        enemyBullets.push({
          x: e.x, z: e.z, y: 15,
          vx: Math.cos(fireAngle + spread) * ENEMY_BULLET_SPEED,
          vz: Math.sin(fireAngle + spread) * ENEMY_BULLET_SPEED,
          life: 100
        });
        e.fireTimer = Math.max(40, ENEMY_FIRE_INTERVAL_MIN - difficulty * 8) + Math.random() * 60;
      }
    }

    // Update player bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      b.x += b.vx;
      b.z += b.vz;
      b.life--;
      if (b.life <= 0) { playerBullets.splice(i, 1); continue; }

      // Hit enemies
      let hitEnemy = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dist = Math.sqrt((b.x - e.x) ** 2 + (b.z - e.z) ** 2);
        if (dist < 18) {
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            score += 100;
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            spawnExplosion(e.x, e.z, 20);
          } else {
            spawnExplosion(e.x, e.z, 5);
          }
          playerBullets.splice(i, 1);
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) continue;

      // Hit obstacles
      for (const obs of obstacles) {
        const dist = Math.sqrt((b.x - obs.x) ** 2 + (b.z - obs.z) ** 2);
        if (dist < obs.size) {
          playerBullets.splice(i, 1);
          spawnExplosion(b.x, b.z, 3);
          break;
        }
      }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.z += b.vz;
      b.life--;
      if (b.life <= 0) { enemyBullets.splice(i, 1); continue; }

      // Hit player
      const dist = Math.sqrt((b.x - playerX) ** 2 + (b.z - playerZ) ** 2);
      if (dist < 12) {
        enemyBullets.splice(i, 1);
        spawnExplosion(playerX, playerZ, 15);
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
        game.setState('over');
        return;
      }

      // Hit obstacles
      for (const obs of obstacles) {
        const d = Math.sqrt((b.x - obs.x) ** 2 + (b.z - obs.z) ** 2);
        if (d < obs.size) {
          enemyBullets.splice(i, 1);
          break;
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vy -= 0.1; // gravity
      if (p.y < 0) p.y = 0;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Remove dead enemies
    enemies = enemies.filter(e => e.alive || false);

    // Update gameData for ML
    window.gameData = {
      playerX, playerZ, playerAngle,
      enemies: enemies.filter(e => e.alive).map(e => ({ x: e.x, z: e.z })),
      score
    };
  };

  game.onDraw = (renderer, text) => {
    // Sky (dark background area above horizon)
    renderer.fillRect(0, 0, W, HORIZON_Y, '#0a0a1a');

    // Ground (below horizon)
    renderer.fillRect(0, HORIZON_Y, W, H - HORIZON_Y, '#12122a');

    // Stars
    for (let i = 0; i < stars.length; i++) {
      const twinkle = Math.sin(tick * 0.03 + i * 7) > 0.6 ? 2 : 1;
      renderer.fillRect(stars[i].x, stars[i].y, twinkle, twinkle, 'rgba(255,255,255,0.1)');
    }

    // Mountains on horizon - draw as line segments
    renderer.setGlow(THEME, 0.3);
    let prevSx = null, prevSy = null;
    for (let i = 0; i <= 200; i++) {
      const screenAngle = (i / 200) * Math.PI * 2;
      let relAngle = screenAngle - playerAngle;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      const sx = W / 2 + relAngle * VP_DIST * 0.3;
      if (sx < -50 || sx > W + 50) { prevSx = null; continue; }

      let mh = 0;
      for (const m of mountains) {
        let da = screenAngle - m.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < m.width) {
          const t = 1 - Math.abs(da) / m.width;
          mh = Math.max(mh, m.height * t);
        }
      }

      const sy = HORIZON_Y - mh;
      if (prevSx !== null) {
        renderer.drawLine(prevSx, prevSy, sx, sy, THEME, 1.5);
      }
      prevSx = sx;
      prevSy = sy;
    }
    renderer.setGlow(null);

    // Ground grid — horizontal lines (receding into distance)
    renderer.setGlow(THEME, 0.15);
    for (let d = 20; d < FAR; d += 40) {
      const left = project(playerX + Math.cos(playerAngle - FOV / 2) * d, 0,
                            playerZ + Math.sin(playerAngle - FOV / 2) * d);
      const right = project(playerX + Math.cos(playerAngle + FOV / 2) * d, 0,
                             playerZ + Math.sin(playerAngle + FOV / 2) * d);
      if (left && right && left.z > 0 && right.z > 0) {
        const alpha = Math.max(0, 1 - d / FAR) * 0.4;
        const col = `rgba(34,153,85,${alpha})`;
        renderer.drawLine(left.x, left.y, right.x, right.y, col, 1);
      }
    }

    // Grid perpendicular lines
    const gridSpacing = 60;
    const gridRange = 400;
    const cosA = Math.cos(playerAngle);
    const sinA = Math.sin(playerAngle);

    for (let offset = -gridRange; offset <= gridRange; offset += gridSpacing) {
      const baseX = playerX + cosA * offset;
      const baseZ = playerZ + sinA * offset;
      const p1 = project(baseX - sinA * gridRange, 0, baseZ + cosA * gridRange);
      const p2 = project(baseX + sinA * gridRange, 0, baseZ - cosA * gridRange);
      if (p1 && p2) {
        const alpha = Math.max(0, 0.3 - Math.abs(offset) / gridRange * 0.3);
        const col = `rgba(34,153,85,${alpha})`;
        renderer.drawLine(p1.x, p1.y, p2.x, p2.y, col, 1);
      }
    }

    // Grid parallel lines
    for (let offset = -gridRange; offset <= gridRange; offset += gridSpacing) {
      const baseX = playerX - sinA * offset;
      const baseZ = playerZ + cosA * offset;
      const p1 = project(baseX + cosA * 20, 0, baseZ + sinA * 20);
      const p2 = project(baseX + cosA * gridRange, 0, baseZ + sinA * gridRange);
      if (p1 && p2) {
        const alpha = Math.max(0, 0.3 - Math.abs(offset) / gridRange * 0.3);
        const col = `rgba(34,153,85,${alpha})`;
        renderer.drawLine(p1.x, p1.y, p2.x, p2.y, col, 1);
      }
    }
    renderer.setGlow(null);

    // Collect all 3D objects for depth sorting
    const renderList = [];

    for (const obs of obstacles) {
      const p = project(obs.x, 0, obs.z);
      if (p && p.z > 0) {
        renderList.push({ type: 'obstacle', obj: obs, z: p.z, p });
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      const p = project(e.x, 0, e.z);
      if (p && p.z > 0) {
        renderList.push({ type: 'enemy', obj: e, z: p.z, p });
      }
    }

    for (const b of playerBullets) {
      const p = project(b.x, 10, b.z);
      if (p && p.z > 0) {
        renderList.push({ type: 'pbullet', obj: b, z: p.z, p });
      }
    }

    for (const b of enemyBullets) {
      const p = project(b.x, b.y, b.z);
      if (p && p.z > 0) {
        renderList.push({ type: 'ebullet', obj: b, z: p.z, p });
      }
    }

    for (const pt of particles) {
      const p = project(pt.x, pt.y, pt.z);
      if (p && p.z > 0) {
        renderList.push({ type: 'particle', obj: pt, z: p.z, p });
      }
    }

    // Sort far to near
    renderList.sort((a, b) => b.z - a.z);

    // Render all objects
    for (const item of renderList) {
      switch (item.type) {
        case 'obstacle': drawObstacle(renderer, item.obj, item.p); break;
        case 'enemy': drawEnemy(renderer, text, item.obj, item.p); break;
        case 'pbullet': drawPlayerBullet(renderer, item.p); break;
        case 'ebullet': drawEnemyBullet(renderer, item.p); break;
        case 'particle': drawParticle(renderer, item.obj, item.p); break;
      }
    }

    // HUD - Crosshair
    renderer.setGlow(THEME, 0.6);
    const cx = W / 2, cy = HORIZON_Y;
    renderer.drawLine(cx - 15, cy, cx - 5, cy, THEME, 2);
    renderer.drawLine(cx + 5, cy, cx + 15, cy, THEME, 2);
    renderer.drawLine(cx, cy - 15, cx, cy - 5, THEME, 2);
    renderer.drawLine(cx, cy + 5, cx, cy + 15, THEME, 2);
    renderer.setGlow(null);

    // HUD - Compass
    drawCompass(renderer, text);

    // HUD - Radar
    drawRadar(renderer, text);

    // HUD - Cockpit frame
    renderer.setGlow(THEME, 0.3);
    // Left edge
    renderer.drawLine(0, H, 50, H - 30, THEME_DIM, 3);
    renderer.drawLine(50, H - 30, 50, H * 0.7, THEME_DIM, 3);
    // Right edge
    renderer.drawLine(W, H, W - 50, H - 30, THEME_DIM, 3);
    renderer.drawLine(W - 50, H - 30, W - 50, H * 0.7, THEME_DIM, 3);
    // Bottom bar
    renderer.drawLine(50, H - 30, W - 50, H - 30, THEME_DIM, 3);
    renderer.setGlow(null);

    // Horizon line
    renderer.drawLine(0, HORIZON_Y, W, HORIZON_Y, 'rgba(34,153,85,0.3)', 1);
  };

  function drawObstacle(renderer, obs, p) {
    const s = obs.size * p.scale * 0.8;
    const h = obs.height * p.scale * 0.8;
    if (s < 1 || p.x < -100 || p.x > W + 100) return;

    renderer.setGlow(THEME, 0.2);

    const bx = p.x, by = p.y;
    const ty = by - h;

    // Bottom face
    renderer.strokePoly([
      { x: bx - s, y: by },
      { x: bx + s, y: by },
      { x: bx + s * 0.6, y: by - s * 0.3 },
      { x: bx - s * 0.6, y: by - s * 0.3 }
    ], THEME_DIM, 1.5, true);

    // Top face
    renderer.strokePoly([
      { x: bx - s, y: ty },
      { x: bx + s, y: ty },
      { x: bx + s * 0.6, y: ty - s * 0.3 },
      { x: bx - s * 0.6, y: ty - s * 0.3 }
    ], THEME_DIM, 1.5, true);

    // Verticals
    renderer.drawLine(bx - s, by, bx - s, ty, THEME_DIM, 1.5);
    renderer.drawLine(bx + s, by, bx + s, ty, THEME_DIM, 1.5);
    renderer.drawLine(bx + s * 0.6, by - s * 0.3, bx + s * 0.6, ty - s * 0.3, THEME_DIM, 1.5);
    renderer.drawLine(bx - s * 0.6, by - s * 0.3, bx - s * 0.6, ty - s * 0.3, THEME_DIM, 1.5);

    renderer.setGlow(null);
  }

  function drawEnemy(renderer, text, e, p) {
    const s = p.scale * 15;
    if (s < 2 || p.x < -100 || p.x > W + 100) return;

    renderer.setGlow(THEME, 0.7);

    const ex = p.x, ey = p.y;
    const bodyH = s * 1.5;
    const bodyW = s * 2;
    const turretH = s * 0.8;
    const turretW = s * 1.2;
    const barrelLen = s * 2;

    // Tank body (trapezoid)
    renderer.strokePoly([
      { x: ex - bodyW, y: ey },
      { x: ex + bodyW, y: ey },
      { x: ex + bodyW * 0.8, y: ey - bodyH },
      { x: ex - bodyW * 0.8, y: ey - bodyH }
    ], THEME_BRIGHT, 2, true);

    // Tracks
    renderer.drawLine(ex - bodyW * 1.1, ey + s * 0.2, ex + bodyW * 1.1, ey + s * 0.2, THEME_BRIGHT, 2);

    // Turret
    renderer.strokePoly([
      { x: ex - turretW, y: ey - bodyH },
      { x: ex + turretW, y: ey - bodyH },
      { x: ex + turretW * 0.7, y: ey - bodyH - turretH },
      { x: ex - turretW * 0.7, y: ey - bodyH - turretH }
    ], THEME_BRIGHT, 2, true);

    // Barrel
    const barrelY = ey - bodyH - turretH * 0.5;
    renderer.drawLine(ex, barrelY, ex, barrelY - barrelLen, THEME_BRIGHT, 2);

    // Barrel tip
    renderer.drawLine(ex - s * 0.3, barrelY - barrelLen, ex + s * 0.3, barrelY - barrelLen, THEME_BRIGHT, 2);

    // HP indicator
    if (e.hp > 1) {
      const fontSize = Math.max(8, s * 0.6);
      text.drawText(`HP:${e.hp}`, ex, ey - bodyH - turretH - s * 0.5 - fontSize, fontSize, THEME, 'center');
    }

    renderer.setGlow(null);
  }

  function drawPlayerBullet(renderer, p) {
    const s = Math.max(2, p.scale * 3);
    renderer.setGlow(THEME, 0.8);
    renderer.fillCircle(p.x, p.y, s, THEME_BRIGHT);
    renderer.setGlow(null);
  }

  function drawEnemyBullet(renderer, p) {
    const s = Math.max(2, p.scale * 3);
    renderer.setGlow('#f44', 0.7);
    renderer.fillCircle(p.x, p.y, s, '#f44');
    renderer.setGlow(null);
  }

  function drawParticle(renderer, pt, p) {
    const alpha = pt.life / pt.maxLife;
    const s = Math.max(1, p.scale * 2 * alpha);
    const col = `rgba(68,238,136,${alpha})`;
    renderer.setGlow(THEME, 0.3);
    renderer.fillRect(p.x - s / 2, p.y - s / 2, s, s, col);
    renderer.setGlow(null);
  }

  function drawCompass(renderer, text) {
    const cx = W / 2;
    const cy = H - 12;
    const cw = 100;

    renderer.drawLine(cx - cw, cy, cx + cw, cy, THEME_DIM, 1);

    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180;
      let rel = rad - playerAngle;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const sx = cx + (rel / (FOV / 2)) * cw;
      if (sx > cx - cw && sx < cx + cw) {
        renderer.drawLine(sx, cy - 5, sx, cy + 5, THEME, 1);
        const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        text.drawText(labels[a / 45], sx, cy - 16, 8, THEME, 'center');
      }
    }
  }

  function drawRadar(renderer, text) {
    const rx = W - 50;
    const ry = 50;
    const rr = 35;

    // Radar circle outline (approximate with polygon)
    const circlePoints = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      circlePoints.push({ x: rx + Math.cos(a) * rr, y: ry + Math.sin(a) * rr });
    }
    renderer.strokePoly(circlePoints, THEME_DIM, 1, true);

    // Cross
    renderer.drawLine(rx - rr, ry, rx + rr, ry, THEME_DIM, 1);
    renderer.drawLine(rx, ry - rr, rx, ry + rr, THEME_DIM, 1);

    // Player dot
    renderer.setGlow(THEME, 0.4);
    renderer.fillCircle(rx, ry, 2, THEME);

    // Player direction line
    renderer.drawLine(rx, ry, rx + Math.cos(playerAngle) * 8, ry + Math.sin(playerAngle) * 8, THEME, 1);

    // Enemies on radar
    renderer.setGlow('#f44', 0.3);
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - playerX;
      const dz = e.z - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const rdist = Math.min(dist / 15, rr - 4);
      const ex = rx + Math.cos(angle) * rdist;
      const ey = ry + Math.sin(angle) * rdist;
      renderer.fillCircle(ex, ey, 2, '#f44');
    }
    renderer.setGlow(null);

    // Radar label
    text.drawText('RADAR', rx, ry + rr + 2, 8, THEME_DIM, 'center');
  }

  game.start();
  return game;
}
