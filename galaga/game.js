// galaga/game.js — Galaga game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480, H = 600;

// --- Constants ---
const PLAYER_W = 32, PLAYER_H = 28, PLAYER_SPEED = 5;
const BULLET_W = 3, BULLET_H = 12, BULLET_SPEED = 8;
const MAX_PLAYER_BULLETS = 2;

const ENEMY_W = 28, ENEMY_H = 24;
const FORM_COLS = 10, FORM_ROWS = 5;
const FORM_PAD_X = 6, FORM_PAD_Y = 6;
const FORM_TOP = 60;

const ENEMY_TYPES = {
  bee:       { hp: 1, points: 50,  divePts: 100, color: '#4ff', glow: '#0cc' },
  butterfly: { hp: 1, points: 80,  divePts: 160, color: '#ff4', glow: '#cc0' },
  boss:      { hp: 2, points: 150, divePts: 400, color: '#f48', glow: '#c24' }
};

// Stars (static layout, generated once)
const STARS = [];
for (let i = 0; i < 80; i++) {
  STARS.push({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 0.2 + Math.random() * 0.8,
    brightness: 0.3 + Math.random() * 0.7,
    size: Math.random() > 0.8 ? 2 : 1
  });
}

// --- Game state ---
let score, best = 0;
let lives, level, player, playerBullets, enemies, enemyBullets, particles;
let tick, spawnQueue, spawnTimer;
let tractorBeam, capturedShip;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

// --- Formation grid positions ---
function formationX(col) {
  const totalW = FORM_COLS * (ENEMY_W + FORM_PAD_X) - FORM_PAD_X;
  const startX = (W - totalW) / 2;
  return startX + col * (ENEMY_W + FORM_PAD_X);
}
function formationY(row) {
  return FORM_TOP + row * (ENEMY_H + FORM_PAD_Y);
}

// --- Bezier dive paths ---
function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function makeLoopPath(startX, startY) {
  const playerCX = player.x + PLAYER_W / 2;
  const loopDir = startX > W / 2 ? -1 : 1;
  return {
    p0x: startX, p0y: startY,
    p1x: startX + loopDir * 100, p1y: H * 0.4,
    p2x: playerCX + loopDir * 60, p2y: H * 0.85,
    p3x: startX, p3y: startY
  };
}

function makeEntryPath(entryX, entryY, destX, destY) {
  const midX = (entryX + destX) / 2 + (Math.random() - 0.5) * 200;
  return {
    p0x: entryX, p0y: entryY,
    p1x: midX, p1y: entryY + 80,
    p2x: midX, p2y: destY - 40,
    p3x: destX, p3y: destY
  };
}

function makeEnemy(type, row, col) {
  return {
    type, row, col,
    hp: ENEMY_TYPES[type].hp,
    x: formationX(col), y: formationY(row),
    formX: formationX(col), formY: formationY(row),
    state: 'entering',
    path: null, pathT: 0, pathSpeed: 0,
    diveCooldown: 120 + Math.random() * 300,
    alive: true,
    hitFlash: 0,
    hasTractorBeam: false,
    tractorTimer: 0
  };
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 / 14) * i + Math.random() * 0.3;
    const spd = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 18 + Math.random() * 12,
      color
    });
  }
}

function spawnSpark(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 8 + Math.random() * 5,
      color: '#fff'
    });
  }
}

// --- Drawing helpers ---
function drawPlayerShip(renderer, x, y, color, glow, captured) {
  renderer.setGlow(glow, captured ? 0.3 : 0.8);
  // Main body
  renderer.fillPoly([
    { x: x + PLAYER_W / 2, y: y },
    { x: x + PLAYER_W, y: y + PLAYER_H },
    { x: x + PLAYER_W - 6, y: y + PLAYER_H - 4 },
    { x: x + PLAYER_W / 2, y: y + 10 },
    { x: x + 6, y: y + PLAYER_H - 4 },
    { x: x, y: y + PLAYER_H }
  ], color);
  // Cockpit
  renderer.fillCircle(x + PLAYER_W / 2, y + 10, 3, captured ? '#555' : '#fff');
  // Wing accents
  if (!captured) {
    renderer.fillRect(x + 3, y + PLAYER_H - 6, 8, 2, 'rgba(255,255,255,0.3)');
    renderer.fillRect(x + PLAYER_W - 11, y + PLAYER_H - 6, 8, 2, 'rgba(255,255,255,0.3)');
  }
  renderer.setGlow(null);
}

function drawMiniShip(renderer, x, y) {
  renderer.fillPoly([
    { x: x + 6, y: y },
    { x: x + 12, y: y + 10 },
    { x: x, y: y + 10 }
  ], '#f48');
}

function drawEnemy(renderer, e) {
  const t = ENEMY_TYPES[e.type];
  const cx = e.x + ENEMY_W / 2;
  const cy = e.y + ENEMY_H / 2;

  const color = e.hitFlash > 0 ? '#fff' : t.color;
  const glow = e.hitFlash > 0 ? '#fff' : t.glow;
  renderer.setGlow(glow, 0.5);

  if (e.type === 'bee') {
    // Small compact diamond shape
    renderer.fillPoly([
      { x: cx, y: e.y + 2 },
      { x: e.x + ENEMY_W - 4, y: cy },
      { x: cx + 4, y: e.y + ENEMY_H - 2 },
      { x: cx - 4, y: e.y + ENEMY_H - 2 },
      { x: e.x + 4, y: cy }
    ], color);
    // Wings (animated)
    const wingFlap = Math.sin(tick * 0.2 + e.col) * 4;
    const wingColor = e.hitFlash > 0 ? '#fff' : 'rgba(0,255,255,0.4)';
    renderer.fillPoly([
      { x: e.x + 4, y: cy },
      { x: e.x - 2, y: cy - 6 + wingFlap },
      { x: e.x + 8, y: cy - 2 }
    ], wingColor);
    renderer.fillPoly([
      { x: e.x + ENEMY_W - 4, y: cy },
      { x: e.x + ENEMY_W + 2, y: cy - 6 - wingFlap },
      { x: e.x + ENEMY_W - 8, y: cy - 2 }
    ], wingColor);

  } else if (e.type === 'butterfly') {
    // Wider butterfly shape
    renderer.fillPoly([
      { x: cx, y: e.y + 2 },
      { x: e.x + ENEMY_W - 2, y: e.y + 6 },
      { x: e.x + ENEMY_W, y: cy + 2 },
      { x: cx + 6, y: e.y + ENEMY_H - 2 },
      { x: cx, y: e.y + ENEMY_H },
      { x: cx - 6, y: e.y + ENEMY_H - 2 },
      { x: e.x, y: cy + 2 },
      { x: e.x + 2, y: e.y + 6 }
    ], color);
    // Wing details as small circles
    const wingAng = Math.sin(tick * 0.15 + e.col * 0.5) * 3;
    const wingColor = e.hitFlash > 0 ? '#fff' : 'rgba(255,255,0,0.3)';
    renderer.fillCircle(e.x + 5, cy - 2, 5 + wingAng, wingColor);
    renderer.fillCircle(e.x + ENEMY_W - 5, cy - 2, 5 - wingAng, wingColor);

  } else if (e.type === 'boss') {
    // Larger, more imposing body
    renderer.fillPoly([
      { x: cx, y: e.y },
      { x: e.x + ENEMY_W, y: e.y + 8 },
      { x: e.x + ENEMY_W + 2, y: cy + 4 },
      { x: e.x + ENEMY_W - 4, y: e.y + ENEMY_H },
      { x: e.x + 4, y: e.y + ENEMY_H },
      { x: e.x - 2, y: cy + 4 },
      { x: e.x, y: e.y + 8 }
    ], color);
    // Boss crown/horns
    const hornColor = e.hitFlash > 0 ? '#fff' : '#f48';
    renderer.fillPoly([
      { x: cx - 8, y: e.y + 4 },
      { x: cx - 12, y: e.y - 4 },
      { x: cx - 4, y: e.y + 2 }
    ], hornColor);
    renderer.fillPoly([
      { x: cx + 8, y: e.y + 4 },
      { x: cx + 12, y: e.y - 4 },
      { x: cx + 4, y: e.y + 2 }
    ], hornColor);
    // Eyes
    const eyeColor = e.hitFlash > 0 ? '#f48' : '#fff';
    renderer.fillCircle(cx - 6, cy, 3, eyeColor);
    renderer.fillCircle(cx + 6, cy, 3, eyeColor);
    // HP indicator for damaged boss
    if (e.hp < ENEMY_TYPES.boss.hp) {
      renderer.fillRect(e.x + 4, e.y + ENEMY_H + 2, ENEMY_W - 8, 2, 'rgba(255,0,0,0.6)');
      renderer.fillRect(e.x + 4, e.y + ENEMY_H + 2,
        (ENEMY_W - 8) * (e.hp / ENEMY_TYPES.boss.hp), 2, 'rgba(0,255,0,0.6)');
    }
  }

  renderer.setGlow(null);
}

function drawTractorBeam(renderer, tb) {
  const beamW = 50;
  const beamH = player.y - tb.y;
  const pulse = Math.sin(tick * 0.15) * 0.2 + 0.5;

  // Approximate the trapezoidal beam with filled polygon
  renderer.setGlow('#f48', 0.6);
  renderer.fillPoly([
    { x: tb.x - 8, y: tb.y },
    { x: tb.x + 8, y: tb.y },
    { x: tb.x + beamW / 2, y: tb.y + beamH },
    { x: tb.x - beamW / 2, y: tb.y + beamH }
  ], `rgba(255,68,136,${pulse * 0.4})`);

  // Beam edge lines (dashed)
  renderer.dashedLine(tb.x - 8, tb.y, tb.x - beamW / 2, tb.y + beamH,
    `rgba(255,68,136,${pulse * 0.8})`, 1, 4, 4);
  renderer.dashedLine(tb.x + 8, tb.y, tb.x + beamW / 2, tb.y + beamH,
    `rgba(255,68,136,${pulse * 0.8})`, 1, 4, 4);
  renderer.setGlow(null);
}

// --- Core game logic ---
let game; // reference set in createGame

function nextLevel() {
  level++;
  spawnQueue = [];
  spawnTimer = 0;

  const bossCount = Math.min(4 + Math.floor(level / 3), FORM_COLS);
  const butterflyCount = Math.min(6 + Math.floor(level / 2), FORM_COLS);
  const beeRows = Math.min(2 + Math.floor(level / 4), 3);

  const groups = [];

  // Bosses enter from top-right
  const bossStartCol = Math.floor((FORM_COLS - bossCount) / 2);
  const bossGroup = [];
  for (let c = 0; c < bossCount; c++) {
    const e = makeEnemy('boss', 0, bossStartCol + c);
    e.path = makeEntryPath(W + 20, -20, e.formX + ENEMY_W / 2, e.formY + ENEMY_H / 2);
    e.pathSpeed = 0.012 + level * 0.001;
    bossGroup.push(e);
  }
  groups.push(bossGroup);

  // Butterflies enter from top-left
  const bfStartCol = Math.floor((FORM_COLS - butterflyCount) / 2);
  const bfGroup = [];
  for (let c = 0; c < butterflyCount; c++) {
    const e = makeEnemy('butterfly', 1, bfStartCol + c);
    e.path = makeEntryPath(-20, -20, e.formX + ENEMY_W / 2, e.formY + ENEMY_H / 2);
    e.pathSpeed = 0.014 + level * 0.001;
    bfGroup.push(e);
  }
  groups.push(bfGroup);

  // Bees enter from alternating sides
  for (let r = 0; r < beeRows; r++) {
    const beeCount = Math.min(8 + Math.floor(level / 3), FORM_COLS);
    const beeStartCol = Math.floor((FORM_COLS - beeCount) / 2);
    const beeGroup = [];
    const side = r % 2 === 0 ? 1 : -1;
    for (let c = 0; c < beeCount; c++) {
      const e = makeEnemy('bee', 2 + r, beeStartCol + c);
      e.path = makeEntryPath(
        side > 0 ? W + 20 : -20,
        -30 - c * 5,
        e.formX + ENEMY_W / 2, e.formY + ENEMY_H / 2
      );
      e.pathSpeed = 0.016 + level * 0.001;
      beeGroup.push(e);
    }
    groups.push(beeGroup);
  }

  spawnQueue = groups;
}

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
    game.setState('over');
    return;
  }
  player.x = W / 2 - PLAYER_W / 2;
  player.invincible = 45;
}

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 0;
    tick = 0;
    player = { x: W / 2 - PLAYER_W / 2, y: H - 60, invincible: 0 };
    playerBullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    tractorBeam = null;
    capturedShip = null;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    game.showOverlay('GALAGA', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.hideOverlay();
        nextLevel();
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

    tick++;

    // Spawn enemies from queue
    if (spawnQueue.length > 0) {
      spawnTimer++;
      if (spawnTimer >= 30) {
        spawnTimer = 0;
        const group = spawnQueue.shift();
        group.forEach((e, i) => {
          e.pathT = -i * 0.04;
          enemies.push(e);
        });
      }
    }

    // Player movement
    if (input.isDown('ArrowLeft') || input.isDown('a')) player.x -= PLAYER_SPEED;
    if (input.isDown('ArrowRight') || input.isDown('d')) player.x += PLAYER_SPEED;
    player.x = Math.max(0, Math.min(W - PLAYER_W, player.x));
    if (player.invincible > 0) player.invincible--;

    // Shoot
    if (input.wasPressed(' ')) {
      if (playerBullets.length < MAX_PLAYER_BULLETS) {
        playerBullets.push({
          x: player.x + PLAYER_W / 2 - BULLET_W / 2,
          y: player.y - BULLET_H
        });
      }
    }

    // Player bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      playerBullets[i].y -= BULLET_SPEED;
      if (playerBullets[i].y < -BULLET_H) {
        playerBullets.splice(i, 1);
      }
    }

    // Update stars
    STARS.forEach(s => {
      s.y += s.speed;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    });

    // Formation sway
    const formSwayX = Math.sin(tick * 0.015) * (20 + level * 2);
    const formSwayY = Math.sin(tick * 0.01) * 5;

    // Update enemies
    const divingCount = enemies.filter(e => e.alive && (e.state === 'diving' || e.state === 'returning')).length;
    const maxDivers = Math.min(2 + Math.floor(level / 2), 6);
    const diveChance = 0.003 + level * 0.001;

    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash--;

      if (e.state === 'entering') {
        if (e.pathT < 0) { e.pathT += 0.02; continue; }
        e.pathT += e.pathSpeed;
        if (e.pathT >= 1) {
          e.state = 'formation';
          e.x = e.formX;
          e.y = e.formY;
          e.path = null;
        } else {
          const p = e.path;
          e.x = bezier(e.pathT, p.p0x, p.p1x, p.p2x, p.p3x) - ENEMY_W / 2;
          e.y = bezier(e.pathT, p.p0y, p.p1y, p.p2y, p.p3y) - ENEMY_H / 2;
        }
      } else if (e.state === 'formation') {
        e.x = e.formX + formSwayX;
        e.y = e.formY + formSwayY;

        e.diveCooldown--;
        if (e.diveCooldown <= 0 && divingCount < maxDivers && Math.random() < diveChance) {
          e.state = 'diving';
          e.path = makeLoopPath(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2);
          e.pathT = 0;
          e.pathSpeed = 0.008 + level * 0.002;

          if (e.type === 'boss' && !capturedShip && Math.random() < 0.25) {
            e.hasTractorBeam = true;
          }
        }
      } else if (e.state === 'diving') {
        e.pathT += e.pathSpeed;

        // Tractor beam logic
        if (e.hasTractorBeam && e.pathT > 0.3 && e.pathT < 0.6 && !tractorBeam) {
          const bx = bezier(0.45, e.path.p0x, e.path.p1x, e.path.p2x, e.path.p3x) - ENEMY_W / 2;
          const by = bezier(0.45, e.path.p0y, e.path.p1y, e.path.p2y, e.path.p3y) - ENEMY_H / 2;
          e.x = bx; e.y = by;
          tractorBeam = { boss: e, timer: 120, x: bx + ENEMY_W / 2, y: by + ENEMY_H };
          e.tractorTimer = 120;
          continue;
        }

        if (e.tractorTimer > 0) {
          e.tractorTimer--;
          if (e.tractorTimer <= 0) {
            e.hasTractorBeam = false;
            tractorBeam = null;
            e.pathT = 0.6;
          }
          continue;
        }

        if (e.pathT >= 1) {
          e.state = 'formation';
          e.x = e.formX + formSwayX;
          e.y = e.formY + formSwayY;
          e.path = null;
          e.diveCooldown = 180 + Math.random() * 200;
          e.hasTractorBeam = false;
        } else {
          const p = e.path;
          e.x = bezier(e.pathT, p.p0x, p.p1x, p.p2x, p.p3x) - ENEMY_W / 2;
          e.y = bezier(e.pathT, p.p0y, p.p1y, p.p2y, p.p3y) - ENEMY_H / 2;
        }

        // Shoot while diving
        if (Math.random() < 0.02 + level * 0.003) {
          const dx = (player.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2);
          const dy = (player.y) - (e.y + ENEMY_H);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const spd = 3 + level * 0.3;
          enemyBullets.push({
            x: e.x + ENEMY_W / 2,
            y: e.y + ENEMY_H,
            vx: (dx / dist) * spd,
            vy: (dy / dist) * spd
          });
        }
      }
    }

    // Tractor beam capture check
    if (tractorBeam) {
      tractorBeam.timer--;
      if (tractorBeam.timer <= 0) {
        tractorBeam.boss.hasTractorBeam = false;
        tractorBeam.boss.tractorTimer = 0;
        tractorBeam = null;
      } else if (!player.invincible) {
        const beamX = tractorBeam.x;
        const playerCX = player.x + PLAYER_W / 2;
        if (Math.abs(playerCX - beamX) < 30 &&
            player.y > tractorBeam.y && player.y < tractorBeam.y + 200) {
          capturedShip = {
            x: player.x, y: player.y,
            targetX: tractorBeam.boss.x,
            targetY: tractorBeam.boss.y - PLAYER_H - 4,
            boss: tractorBeam.boss,
            attached: false
          };
          tractorBeam.boss.hasTractorBeam = false;
          tractorBeam.boss.tractorTimer = 0;
          tractorBeam = null;
          spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#f48');
          loseLife();
        }
      }
    }

    // Captured ship follows its boss
    if (capturedShip && capturedShip.boss.alive) {
      if (!capturedShip.attached) {
        capturedShip.y -= 2;
        capturedShip.x += (capturedShip.targetX - capturedShip.x) * 0.05;
        if (capturedShip.y <= capturedShip.targetY + 10) {
          capturedShip.attached = true;
        }
      } else {
        capturedShip.x = capturedShip.boss.x;
        capturedShip.y = capturedShip.boss.y - PLAYER_H - 4;
      }
    }

    // If the boss holding captured ship dies, release it as a life bonus
    if (capturedShip && !capturedShip.boss.alive) {
      lives++;
      livesEl.textContent = lives;
      spawnExplosion(capturedShip.x + PLAYER_W / 2, capturedShip.y + PLAYER_H / 2, '#4f4');
      score += 1000;
      scoreEl.textContent = score;
      capturedShip = null;
    }

    // Formation enemies shoot occasionally
    const formEnemies = enemies.filter(e => e.alive && e.state === 'formation');
    if (formEnemies.length > 0 && Math.random() < 0.01 + level * 0.004) {
      const bottomRow = {};
      formEnemies.forEach(e => {
        if (!bottomRow[e.col] || e.row > bottomRow[e.col].row) {
          bottomRow[e.col] = e;
        }
      });
      const shooters = Object.values(bottomRow);
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      const spd = 2.5 + level * 0.2;
      enemyBullets.push({
        x: shooter.x + ENEMY_W / 2,
        y: shooter.y + ENEMY_H,
        vx: (Math.random() - 0.5) * 1.2,
        vy: spd
      });
    }

    // Enemy bullets update
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      enemyBullets[i].x += enemyBullets[i].vx;
      enemyBullets[i].y += enemyBullets[i].vy;
      if (enemyBullets[i].y > H + 10 || enemyBullets[i].x < -10 || enemyBullets[i].x > W + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }
      // Hit player
      if (!player.invincible &&
          enemyBullets[i].x >= player.x && enemyBullets[i].x <= player.x + PLAYER_W &&
          enemyBullets[i].y >= player.y && enemyBullets[i].y <= player.y + PLAYER_H) {
        enemyBullets.splice(i, 1);
        spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#f48');
        loseLife();
        continue;
      }
    }

    // Player bullet vs enemy collision
    for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
      const b = playerBullets[bi];
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x >= e.x && b.x <= e.x + ENEMY_W &&
            b.y >= e.y && b.y <= e.y + ENEMY_H) {
          e.hp--;
          e.hitFlash = 6;
          playerBullets.splice(bi, 1);
          if (e.hp <= 0) {
            e.alive = false;
            const t = ENEMY_TYPES[e.type];
            const pts = (e.state === 'diving' || e.state === 'returning') ? t.divePts : t.points;
            score += pts;
            scoreEl.textContent = score;
            if (score > best) {
              best = score;
              bestEl.textContent = best;
            }
            spawnExplosion(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, t.color);
          } else {
            spawnSpark(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2);
          }
          break;
        }
      }
    }

    // Diving enemy collides with player
    if (!player.invincible) {
      for (const e of enemies) {
        if (!e.alive || e.state === 'formation' || e.state === 'entering') continue;
        if (e.x < player.x + PLAYER_W && e.x + ENEMY_W > player.x &&
            e.y < player.y + PLAYER_H && e.y + ENEMY_H > player.y) {
          e.alive = false;
          spawnExplosion(e.x + ENEMY_W / 2, e.y + ENEMY_H / 2, ENEMY_TYPES[e.type].color);
          spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#f48');
          loseLife();
          break;
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Check if all enemies dead -> next level
    if (enemies.length > 0 && spawnQueue.length === 0 && enemies.every(e => !e.alive)) {
      nextLevel();
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    STARS.forEach(s => {
      const twinkle = (Math.sin(tick * 0.03 + s.x * 0.1) + 1) * 0.5;
      const alpha = s.brightness * (0.5 + twinkle * 0.5);
      renderer.fillRect(s.x, s.y, s.size, s.size, `rgba(255,255,255,${alpha})`);
    });

    // Level indicator
    text.drawText(`Stage ${level}`, W - 10, 10, 12, '#333', 'right');

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      drawEnemy(renderer, e);
    }

    // Captured ship
    if (capturedShip && capturedShip.boss.alive) {
      drawPlayerShip(renderer, capturedShip.x, capturedShip.y, '#888', '#555', true);
    }

    // Tractor beam
    if (tractorBeam) {
      drawTractorBeam(renderer, tractorBeam);
    }

    // Player
    if (game.state === 'playing' || game.state === 'waiting') {
      if (!player.invincible || Math.floor(tick / 3) % 2 === 0) {
        drawPlayerShip(renderer, player.x, player.y, '#f48', '#c24', false);
      }
    }

    // Player bullets
    renderer.setGlow('#f48', 0.5);
    playerBullets.forEach(b => {
      renderer.fillRect(b.x, b.y, BULLET_W, BULLET_H, '#fff');
    });

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    enemyBullets.forEach(b => {
      renderer.fillCircle(b.x, b.y, 3, '#f66');
    });

    renderer.setGlow(null);

    // Particles
    particles.forEach(p => {
      const alpha = Math.min(1, p.life / 15);
      renderer.setGlow(p.color, 0.3);
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, `rgba(255,255,255,${alpha})`);
    });
    renderer.setGlow(null);

    // Lives indicator
    for (let i = 0; i < lives - 1; i++) {
      drawMiniShip(renderer, 10 + i * 22, H - 20);
    }
  };

  game.start();
  return game;
}
