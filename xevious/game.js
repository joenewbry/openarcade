// xevious/game.js — Xevious game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 640;

// Theme
const THEME = '#8e4';

// Player constants
const PLAYER_W = 28, PLAYER_H = 32;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 8;
const BOMB_SPEED = 3;
const RETICLE_DIST = 100;
const SCROLL_SPEED = 1.5;

// ── State ──
let score, best = 0;
let lives;
let player;
let bullets, bombs, enemyBullets;
let airEnemies, groundTargets;
let particles, explosions;
let terrainFeatures;
let scrollY;
let tick;
let boss, bossActive;
let spawnTimer, bossSpawned;
let difficultyLevel;
let invincibleTimer;
let terrainSeed = 0;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

let _game; // reference to game instance

// ── Seeded random for terrain ──
function seededRandom() {
  terrainSeed = (terrainSeed * 9301 + 49297) % 233280;
  return terrainSeed / 233280;
}

// ── Terrain generation ──
function generateTerrain() {
  terrainFeatures = [];
  for (let ty = -2000; ty < H + 500; ty += 60) {
    const saved = terrainSeed;
    terrainSeed = Math.abs(ty * 137 + 5381);
    const r = seededRandom();
    if (r < 0.15) {
      terrainFeatures.push({
        type: 'river',
        x: seededRandom() * (W - 120) + 20,
        y: ty,
        w: 60 + seededRandom() * 80,
        h: 50 + seededRandom() * 40
      });
    } else if (r < 0.35) {
      terrainFeatures.push({
        type: 'forest',
        x: seededRandom() * (W - 80) + 10,
        y: ty,
        w: 40 + seededRandom() * 60,
        h: 30 + seededRandom() * 40
      });
    } else if (r < 0.42) {
      terrainFeatures.push({
        type: 'base',
        x: seededRandom() * (W - 100) + 30,
        y: ty,
        w: 60 + seededRandom() * 50,
        h: 80 + seededRandom() * 40
      });
    } else if (r < 0.48) {
      terrainFeatures.push({
        type: 'road',
        x: seededRandom() * (W - 60) + 20,
        y: ty,
        w: 20 + seededRandom() * 20,
        h: 100 + seededRandom() * 80
      });
    }
    terrainSeed = saved;
  }
}

// ── Spawning ──

function spawnAirEnemies() {
  const r = Math.random();
  if (r < 0.3) {
    // Torkan: flies straight down
    airEnemies.push({
      type: 'torkan',
      x: Math.random() * (W - 30) + 15,
      y: -30,
      vx: 0,
      vy: 2 + difficultyLevel * 0.3,
      hp: 1,
      points: 30,
      shootTimer: 60 + Math.floor(Math.random() * 60),
      color: '#4cf'
    });
  } else if (r < 0.55) {
    // Zoshi: sine wave pattern
    const startX = Math.random() * (W - 40) + 20;
    airEnemies.push({
      type: 'zoshi',
      x: startX,
      y: -25,
      baseX: startX,
      vx: 0,
      vy: 1.8 + difficultyLevel * 0.2,
      amplitude: 60 + Math.random() * 40,
      freq: 0.03 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      hp: 1,
      points: 50,
      shootTimer: 40 + Math.floor(Math.random() * 50),
      color: '#f84'
    });
  } else if (r < 0.75) {
    // Kapi: flies in from the side, curves across
    const fromLeft = Math.random() > 0.5;
    airEnemies.push({
      type: 'kapi',
      x: fromLeft ? -20 : W + 20,
      y: Math.random() * (H * 0.4) + 30,
      vx: (fromLeft ? 3 : -3) + (fromLeft ? 1 : -1) * difficultyLevel * 0.2,
      vy: 0.5 + Math.random() * 1,
      hp: 1,
      points: 40,
      shootTimer: 30 + Math.floor(Math.random() * 40),
      color: '#ff0'
    });
  } else if (r < 0.9) {
    // Zakato: formation of 3 flying in V
    const cx = Math.random() * (W - 80) + 40;
    for (let i = -1; i <= 1; i++) {
      airEnemies.push({
        type: 'zakato',
        x: cx + i * 30,
        y: -30 - Math.abs(i) * 20,
        vx: 0,
        vy: 2.2 + difficultyLevel * 0.2,
        hp: 1,
        points: 20,
        shootTimer: 50 + Math.floor(Math.random() * 40),
        color: '#f4f'
      });
    }
  } else {
    // Giddo Spario: fast diagonal
    airEnemies.push({
      type: 'giddo',
      x: Math.random() > 0.5 ? -15 : W + 15,
      y: -20,
      vx: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2),
      vy: 3 + difficultyLevel * 0.3,
      hp: 2,
      points: 70,
      shootTimer: 25 + Math.floor(Math.random() * 30),
      color: '#f44'
    });
  }
}

function spawnGroundTarget() {
  const r = Math.random();
  const gx = Math.random() * (W - 60) + 30;
  const gy = -40;
  if (r < 0.35) {
    groundTargets.push({
      type: 'turret',
      x: gx, y: gy,
      hp: 1, points: 100,
      shootTimer: 80 + Math.floor(Math.random() * 60),
      angle: 0,
      color: '#a86'
    });
  } else if (r < 0.6) {
    groundTargets.push({
      type: 'tank',
      x: gx, y: gy,
      hp: 2, points: 150,
      vx: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5),
      shootTimer: 70 + Math.floor(Math.random() * 50),
      color: '#886'
    });
  } else if (r < 0.8) {
    groundTargets.push({
      type: 'gbase',
      x: gx, y: gy,
      hp: 3, points: 300,
      shootTimer: 100,
      color: '#a66'
    });
  } else {
    groundTargets.push({
      type: 'hidden',
      x: gx, y: gy,
      hp: 1, points: 500,
      hidden: true,
      revealed: false,
      revealRadius: 60,
      color: '#ff8'
    });
  }
}

function spawnBoss() {
  bossActive = true;
  boss = {
    x: W / 2,
    y: -80,
    hp: 40,
    maxHp: 40,
    radius: 50,
    phase: 0,
    shootTimer: 0,
    spinAngle: 0,
    state: 'entering',
    points: 5000,
    flashTimer: 0,
    deathTimer: 0
  };
}

// ── Combat helpers ──

function fireBullet() {
  if (bullets.length < 6) {
    bullets.push({ x: player.x + PLAYER_W / 2 - 2, y: player.y - 4 });
    bullets.push({ x: player.x + PLAYER_W / 2 + 2, y: player.y - 4 });
  }
}

function fireBomb() {
  if (bombs.length < 2) {
    bombs.push({
      x: player.x + PLAYER_W / 2,
      y: player.y,
      targetY: player.y - RETICLE_DIST,
      shadow: 0,
      scale: 1
    });
  }
}

function hitGroundTargets(bx, by) {
  for (let i = groundTargets.length - 1; i >= 0; i--) {
    const g = groundTargets[i];
    if (g.type === 'hidden' && !g.revealed) continue;
    const dx = bx - g.x;
    const dy = by - g.y;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
      g.hp--;
      if (g.hp <= 0) {
        addScore(g.points);
        spawnGroundExplosion(g.x, g.y);
        groundTargets.splice(i, 1);
      }
    }
  }
  // Boss ground hit
  if (bossActive && boss && boss.state === 'fighting') {
    const dx = bx - boss.x;
    const dy = by - boss.y;
    if (dx * dx + dy * dy < boss.radius * boss.radius * 1.5) {
      boss.hp -= 3;
      boss.flashTimer = 6;
      spawnSpark(bx, by);
      if (boss.hp <= 0) {
        boss.state = 'dying';
        boss.deathTimer = 60;
      }
    }
  }
}

function revealHidden(bx, by) {
  for (const g of groundTargets) {
    if (g.type === 'hidden' && !g.revealed) {
      const dx = bx - g.x;
      const dy = by - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < g.revealRadius) {
        g.revealed = true;
        g.hidden = false;
      }
    }
  }
}

function playerHit() {
  lives--;
  livesEl.textContent = lives;
  spawnAirExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, THEME);
  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    _game.showOverlay('GAME OVER', `Score: ${score} — Press SPACE to restart`);
    _game.setState('over');
  } else {
    invincibleTimer = 120;
    player.x = W / 2 - PLAYER_W / 2;
    player.y = H - 80;
  }
}

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

// ── Particles & Explosions ──

function spawnAirExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 10,
      color: color || '#fff'
    });
  }
}

function spawnGroundExplosion(x, y) {
  explosions.push({
    x, y,
    radius: 5,
    life: 15,
    maxLife: 15
  });
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

// ── Boss update ──

function updateBoss() {
  const b = boss;
  b.spinAngle += 0.02;
  b.phase += 0.01;

  if (b.state === 'entering') {
    b.y += 1;
    if (b.y >= 100) {
      b.state = 'fighting';
    }
  } else if (b.state === 'fighting') {
    b.x = W / 2 + Math.sin(b.phase) * 150;
    b.y = 100 + Math.sin(b.phase * 0.7) * 50;

    b.shootTimer++;
    if (b.shootTimer % 30 === 0) {
      for (let a = 0; a < 8; a++) {
        const ang = (Math.PI * 2 / 8) * a + b.spinAngle;
        enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(ang) * 2.5,
          vy: Math.sin(ang) * 2.5
        });
      }
    }
    if (b.shootTimer % 50 === 0) {
      const dx = player.x + PLAYER_W / 2 - b.x;
      const dy = player.y + PLAYER_H / 2 - b.y;
      for (let s = -1; s <= 1; s++) {
        const angle = Math.atan2(dy, dx) + s * 0.2;
        enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5
        });
      }
    }

    // Player bullets hit boss
    for (let j = bullets.length - 1; j >= 0; j--) {
      const bul = bullets[j];
      const dx = bul.x - b.x;
      const dy = bul.y - b.y;
      if (dx * dx + dy * dy < b.radius * b.radius) {
        b.hp--;
        b.flashTimer = 4;
        bullets.splice(j, 1);
        spawnSpark(b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 40);
        if (b.hp <= 0) {
          b.state = 'dying';
          b.deathTimer = 60;
        }
      }
    }

    // Player collision with boss
    if (invincibleTimer <= 0) {
      const dx = player.x + PLAYER_W / 2 - b.x;
      const dy = player.y + PLAYER_H / 2 - b.y;
      if (dx * dx + dy * dy < (b.radius + 12) * (b.radius + 12)) {
        playerHit();
      }
    }
  } else if (b.state === 'dying') {
    b.deathTimer--;
    if (b.deathTimer % 5 === 0) {
      spawnAirExplosion(
        b.x + (Math.random() - 0.5) * 80,
        b.y + (Math.random() - 0.5) * 80,
        Math.random() > 0.5 ? '#f84' : '#ff0'
      );
    }
    if (b.deathTimer <= 0) {
      addScore(b.points);
      bossActive = false;
      boss = null;
      for (let k = 0; k < 30; k++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 4;
        particles.push({
          x: b.x, y: b.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 30 + Math.random() * 30,
          color: ['#f84', '#ff0', '#8e4', '#fff'][Math.floor(Math.random() * 4)]
        });
      }
    }
  }
}

// ── Helper: apply alpha to hex color ──
function applyAlpha(color, alpha) {
  if (alpha >= 1) return color;
  if (color.startsWith('#')) {
    let r, g, b;
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
  return color;
}

// ── Export ──
export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    lives = 3;
    tick = 0;
    spawnTimer = 0;
    bossSpawned = false;
    bossActive = false;
    boss = null;
    difficultyLevel = 0;
    invincibleTimer = 0;
    scrollY = 0;

    player = { x: W / 2 - PLAYER_W / 2, y: H - 80 };
    bullets = [];
    bombs = [];
    enemyBullets = [];
    airEnemies = [];
    groundTargets = [];
    particles = [];
    explosions = [];

    terrainSeed = Math.floor(Math.random() * 100000);
    generateTerrain();

    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    game.showOverlay('XEVIOUS', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        invincibleTimer = 90;
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
    if (invincibleTimer > 0) invincibleTimer--;

    // Scroll terrain
    scrollY += SCROLL_SPEED;

    // Difficulty ramps over time
    difficultyLevel = Math.min(tick / 3600, 5);

    // Player movement
    if (input.isDown('ArrowLeft') || input.isDown('a')) player.x -= PLAYER_SPEED;
    if (input.isDown('ArrowRight') || input.isDown('d')) player.x += PLAYER_SPEED;
    if (input.isDown('ArrowUp') || input.isDown('w')) player.y -= PLAYER_SPEED;
    if (input.isDown('ArrowDown') || input.isDown('s')) player.y += PLAYER_SPEED;
    player.x = Math.max(0, Math.min(W - PLAYER_W, player.x));
    player.y = Math.max(40, Math.min(H - PLAYER_H - 10, player.y));

    // Auto-fire when holding space (continuous fire)
    if (input.isDown(' ') && tick % 8 === 0) {
      fireBullet();
      fireBomb();
    }
    if (input.isDown('z') && tick % 8 === 0) {
      fireBullet();
    }
    if (input.isDown('x') && tick % 15 === 0) {
      fireBomb();
    }

    // Spawn enemies
    spawnTimer++;
    const spawnRate = Math.max(30, 80 - difficultyLevel * 8);
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawnAirEnemies();
      if (Math.random() < 0.4 + difficultyLevel * 0.05) {
        spawnGroundTarget();
      }
    }

    // Boss spawn at score thresholds
    if (!bossSpawned && score >= 3000) {
      bossSpawned = true;
      spawnBoss();
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) {
        bullets.splice(i, 1);
      }
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.y -= BOMB_SPEED;
      b.shadow += 0.3;
      b.scale = Math.max(0.3, b.scale - 0.008);
      if (b.y <= b.targetY) {
        spawnGroundExplosion(b.x, b.y);
        hitGroundTargets(b.x, b.y);
        revealHidden(b.x, b.y);
        bombs.splice(i, 1);
      }
    }

    // Update air enemies
    for (let i = airEnemies.length - 1; i >= 0; i--) {
      const e = airEnemies[i];
      switch (e.type) {
        case 'torkan':
          e.x += e.vx;
          e.y += e.vy;
          break;
        case 'zoshi':
          e.y += e.vy;
          e.x = e.baseX + Math.sin(e.y * e.freq + e.phase) * e.amplitude;
          break;
        case 'kapi':
          e.x += e.vx;
          e.y += e.vy;
          break;
        case 'zakato':
          e.x += e.vx;
          e.y += e.vy;
          break;
        case 'giddo':
          e.x += e.vx;
          e.y += e.vy;
          break;
      }

      // Shooting
      e.shootTimer--;
      if (e.shootTimer <= 0 && e.y > 0 && e.y < H - 100) {
        e.shootTimer = 50 + Math.floor(Math.random() * 40) - difficultyLevel * 5;
        const dx = player.x + PLAYER_W / 2 - e.x;
        const dy = player.y + PLAYER_H / 2 - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 3 + difficultyLevel * 0.3;
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed
        });
      }

      // Remove off-screen
      if (e.y > H + 40 || e.x < -60 || e.x > W + 60) {
        airEnemies.splice(i, 1);
        continue;
      }

      // Bullet collision with air enemies
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          e.hp--;
          bullets.splice(j, 1);
          if (e.hp <= 0) {
            addScore(e.points);
            spawnAirExplosion(e.x, e.y, e.color);
            airEnemies.splice(i, 1);
          }
          break;
        }
      }
    }

    // Update ground targets (scroll with terrain)
    for (let i = groundTargets.length - 1; i >= 0; i--) {
      const g = groundTargets[i];
      g.y += SCROLL_SPEED;

      // Tank movement
      if (g.type === 'tank' && g.vx) {
        g.x += g.vx;
        if (g.x < 20 || g.x > W - 50) g.vx *= -1;
      }

      // Turret and base shooting
      if (g.type !== 'hidden' || g.revealed) {
        if (g.shootTimer !== undefined) {
          g.shootTimer--;
          if (g.shootTimer <= 0 && g.y > 30 && g.y < H - 80) {
            g.shootTimer = 80 + Math.floor(Math.random() * 40) - difficultyLevel * 5;
            const dx = player.x + PLAYER_W / 2 - g.x;
            const dy = player.y + PLAYER_H / 2 - g.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 2.5 + difficultyLevel * 0.2;
            enemyBullets.push({
              x: g.x, y: g.y,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              ground: true
            });
            g.angle = Math.atan2(dy, dx);
          }
        }
      }

      // Remove off-screen
      if (g.y > H + 60) {
        groundTargets.splice(i, 1);
      }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }
      // Player collision
      if (invincibleTimer <= 0 &&
          b.x > player.x + 4 && b.x < player.x + PLAYER_W - 4 &&
          b.y > player.y + 4 && b.y < player.y + PLAYER_H - 4) {
        enemyBullets.splice(i, 1);
        playerHit();
        break;
      }
    }

    // Air enemy collision with player
    if (invincibleTimer <= 0) {
      for (let i = airEnemies.length - 1; i >= 0; i--) {
        const e = airEnemies[i];
        if (Math.abs(e.x - (player.x + PLAYER_W / 2)) < 20 &&
            Math.abs(e.y - (player.y + PLAYER_H / 2)) < 20) {
          spawnAirExplosion(e.x, e.y, e.color);
          airEnemies.splice(i, 1);
          playerHit();
          break;
        }
      }
    }

    // Boss update
    if (bossActive && boss) {
      updateBoss();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life--;
      explosions[i].radius += 1.5;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    drawTerrain(renderer);
    drawGroundTargets(renderer);
    drawExplosions(renderer);
    drawBombs(renderer);
    drawPlayer(renderer);
    drawBullets(renderer);
    drawAirEnemies(renderer);
    drawEnemyBullets(renderer);
    drawBoss(renderer);
    drawParticles(renderer);
    drawReticle(renderer);
  };

  game.start();
  return game;
}

// ── Drawing functions ──

function drawTerrain(renderer) {
  const baseOffset = scrollY % 200;

  // Grid lines for visual scrolling
  for (let y = baseOffset % 80; y < H; y += 80) {
    renderer.drawLine(0, y, W, y, '#16213e', 1);
  }

  // Terrain features (offset by scroll)
  terrainFeatures.forEach(f => {
    const sy = f.y + (scrollY % 2400);
    const fy = ((sy % (H + 2500)) + (H + 2500)) % (H + 2500) - 500;
    if (fy < -100 || fy > H + 100) return;

    switch (f.type) {
      case 'river': {
        // Wavy river as filled polygon
        const pts = [];
        // Top edge (with wave)
        for (let rx = 0; rx <= f.w; rx += 10) {
          pts.push({ x: f.x + rx, y: fy + Math.sin((rx + scrollY * 2) * 0.05) * 4 });
        }
        // Bottom edge (with wave, reversed)
        for (let rx = f.w; rx >= 0; rx -= 10) {
          pts.push({ x: f.x + rx, y: fy + f.h + Math.sin((rx + scrollY * 2) * 0.05) * 4 });
        }
        if (pts.length >= 3) {
          renderer.fillPoly(pts, '#0a2a4e');
        }
        break;
      }
      case 'forest': {
        // Forest background
        renderer.fillRect(f.x, fy, f.w, f.h, '#0a3020');
        // Tree dots as small circles
        for (let tx = f.x + 6; tx < f.x + f.w - 6; tx += 10) {
          for (let tyy = fy + 6; tyy < fy + f.h - 6; tyy += 10) {
            renderer.fillCircle(tx + Math.sin(tx * 0.3) * 2, tyy, 4, '#1a5030');
          }
        }
        break;
      }
      case 'base': {
        // Base plate
        renderer.fillRect(f.x, fy, f.w, f.h, '#1a2030');
        // Inner border
        renderer.strokePoly([
          { x: f.x + 4, y: fy + 4 },
          { x: f.x + f.w - 4, y: fy + 4 },
          { x: f.x + f.w - 4, y: fy + f.h - 4 },
          { x: f.x + 4, y: fy + f.h - 4 }
        ], '#2a3040', 1, true);
        // Runway stripe
        renderer.fillRect(f.x + f.w / 2 - 3, fy + 5, 6, f.h - 10, '#2a3040');
        break;
      }
      case 'road': {
        // Road body
        renderer.fillRect(f.x, fy, f.w, f.h, '#1a2030');
        // Center line dashes
        for (let ry = fy; ry < fy + f.h; ry += 12) {
          renderer.fillRect(f.x + f.w / 2 - 1, ry, 2, 6, '#2a3040');
        }
        break;
      }
    }
  });
}

function drawGroundTargets(renderer) {
  groundTargets.forEach(g => {
    if (g.type === 'hidden' && !g.revealed) {
      // Draw subtle shimmer hint
      if (tick % 60 < 10) {
        renderer.fillCircle(g.x, g.y, 12, 'rgba(255,255,136,0.08)');
      }
      return;
    }

    renderer.setGlow(g.color, 0.4);

    switch (g.type) {
      case 'turret': {
        // Base circle
        renderer.fillCircle(g.x, g.y, 14, '#3a3020');
        // Gun barrel
        const angle = g.angle || 0;
        renderer.drawLine(
          g.x, g.y,
          g.x + Math.cos(angle) * 16, g.y + Math.sin(angle) * 16,
          g.color, 3
        );
        // Center
        renderer.fillCircle(g.x, g.y, 5, g.color);
        break;
      }
      case 'tank': {
        // Tank body
        renderer.fillRect(g.x - 14, g.y - 8, 28, 16, '#3a3820');
        // Turret
        renderer.fillRect(g.x - 6, g.y - 5, 12, 10, g.color);
        // Barrel
        renderer.fillRect(g.x + 6, g.y - 2, 12, 4, g.color);
        // Treads
        renderer.fillRect(g.x - 14, g.y - 10, 28, 3, '#2a2818');
        renderer.fillRect(g.x - 14, g.y + 7, 28, 3, '#2a2818');
        break;
      }
      case 'gbase': {
        // Large base structure
        renderer.fillRect(g.x - 20, g.y - 15, 40, 30, '#2a2030');
        renderer.strokePoly([
          { x: g.x - 20, y: g.y - 15 },
          { x: g.x + 20, y: g.y - 15 },
          { x: g.x + 20, y: g.y + 15 },
          { x: g.x - 20, y: g.y + 15 }
        ], g.color, 2, true);
        // Health indicator
        for (let h = 0; h < g.hp; h++) {
          renderer.fillRect(g.x - 12 + h * 10, g.y - 2, 6, 4, g.color);
        }
        break;
      }
      case 'hidden': {
        // Revealed special target - pulsing
        const pulse = Math.sin(tick * 0.1) * 0.3 + 0.7;
        const outerR = 10 + Math.sin(tick * 0.08) * 3;
        renderer.fillCircle(g.x, g.y, outerR, applyAlpha('#ff8', pulse));
        // Inner
        renderer.fillCircle(g.x, g.y, 5, '#ff8');
        break;
      }
    }
    renderer.setGlow(null);
  });
}

function drawExplosions(renderer) {
  explosions.forEach(e => {
    const alpha = e.life / e.maxLife;
    renderer.setGlow('#f84', 0.5);
    renderer.fillCircle(e.x, e.y, e.radius, applyAlpha('#ffc850', alpha * 0.3));
    // Outer ring using a polygon approximation
    const pts = [];
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push({ x: e.x + Math.cos(a) * e.radius, y: e.y + Math.sin(a) * e.radius });
    }
    renderer.strokePoly(pts, applyAlpha('#ffa028', alpha), 2, true);
    renderer.setGlow(null);
  });
}

function drawBombs(renderer) {
  bombs.forEach(b => {
    // Shadow on ground as a small dark ellipse approximation
    const shadowRx = 6 + b.shadow;
    const shadowRy = 3 + b.shadow * 0.5;
    const shadowPts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      shadowPts.push({ x: b.x + Math.cos(a) * shadowRx, y: b.targetY + Math.sin(a) * shadowRy });
    }
    renderer.fillPoly(shadowPts, 'rgba(0,0,0,0.3)');

    // Bomb
    const sz = 4 * b.scale;
    renderer.setGlow(THEME, 0.4);
    renderer.fillCircle(b.x, b.y, sz, THEME);
    renderer.setGlow(null);
  });
}

function drawReticle(renderer) {
  if (_game.state !== 'playing') return;
  const rx = player.x + PLAYER_W / 2;
  const ry = player.y - RETICLE_DIST;
  const pulse = Math.sin(tick * 0.12) * 2;
  const color = 'rgba(136,238,68,0.6)';

  // Outer circle as polygon
  const outerR = 12 + pulse;
  const pts = [];
  const segs = 20;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push({ x: rx + Math.cos(a) * outerR, y: ry + Math.sin(a) * outerR });
  }
  renderer.strokePoly(pts, color, 1, true);

  // Cross hairs
  renderer.drawLine(rx - 18, ry, rx - 8, ry, color, 1);
  renderer.drawLine(rx + 8, ry, rx + 18, ry, color, 1);
  renderer.drawLine(rx, ry - 18, rx, ry - 8, color, 1);
  renderer.drawLine(rx, ry + 8, rx, ry + 18, color, 1);

  // Center dot
  renderer.fillCircle(rx, ry, 2, 'rgba(136,238,68,0.8)');
}

function drawPlayer(renderer) {
  if (_game.state !== 'playing' && _game.state !== 'waiting') return;
  // Blink when invincible
  if (invincibleTimer > 0 && Math.floor(tick / 4) % 2 === 0) return;

  const px = player.x, py = player.y;

  // Engine glow
  renderer.fillPoly([
    { x: px + PLAYER_W / 2 - 4, y: py + PLAYER_H },
    { x: px + PLAYER_W / 2, y: py + PLAYER_H + 8 + Math.random() * 4 },
    { x: px + PLAYER_W / 2 + 4, y: py + PLAYER_H }
  ], 'rgba(136,238,68,0.3)');

  renderer.setGlow(THEME, 0.6);

  // Main fuselage
  renderer.fillPoly([
    { x: px + PLAYER_W / 2, y: py },
    { x: px + PLAYER_W / 2 + 5, y: py + 8 },
    { x: px + PLAYER_W / 2 + 4, y: py + PLAYER_H - 4 },
    { x: px + PLAYER_W / 2 - 4, y: py + PLAYER_H - 4 },
    { x: px + PLAYER_W / 2 - 5, y: py + 8 }
  ], THEME);

  // Left wing
  renderer.fillPoly([
    { x: px + PLAYER_W / 2 - 4, y: py + 12 },
    { x: px, y: py + PLAYER_H - 2 },
    { x: px + 4, y: py + PLAYER_H },
    { x: px + PLAYER_W / 2 - 3, y: py + PLAYER_H - 6 }
  ], THEME);

  // Right wing
  renderer.fillPoly([
    { x: px + PLAYER_W / 2 + 4, y: py + 12 },
    { x: px + PLAYER_W, y: py + PLAYER_H - 2 },
    { x: px + PLAYER_W - 4, y: py + PLAYER_H },
    { x: px + PLAYER_W / 2 + 3, y: py + PLAYER_H - 6 }
  ], THEME);

  // Cockpit
  renderer.fillCircle(px + PLAYER_W / 2, py + 10, 3, '#cfe');

  renderer.setGlow(null);
}

function drawBullets(renderer) {
  renderer.setGlow(THEME, 0.5);
  bullets.forEach(b => {
    renderer.fillRect(b.x - 1, b.y, 2, 8, THEME);
  });
  renderer.setGlow(null);
}

function drawAirEnemies(renderer) {
  airEnemies.forEach(e => {
    renderer.setGlow(e.color, 0.5);

    switch (e.type) {
      case 'torkan': {
        // Diamond
        renderer.fillPoly([
          { x: e.x, y: e.y - 12 },
          { x: e.x + 12, y: e.y },
          { x: e.x, y: e.y + 12 },
          { x: e.x - 12, y: e.y }
        ], e.color);
        // Center eye
        renderer.fillCircle(e.x, e.y, 3, '#1a1a2e');
        break;
      }
      case 'zoshi': {
        // Oval swooper as polygon
        const pts = [];
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          pts.push({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 8 });
        }
        renderer.fillPoly(pts, e.color);
        // Tail
        renderer.fillRect(e.x - 2, e.y + 6, 4, 8, e.color);
        // Eyes
        renderer.fillRect(e.x - 6, e.y - 3, 4, 3, '#1a1a2e');
        renderer.fillRect(e.x + 2, e.y - 3, 4, 3, '#1a1a2e');
        break;
      }
      case 'kapi': {
        // Arrow shape flying sideways
        const dir = e.vx > 0 ? 1 : -1;
        renderer.fillPoly([
          { x: e.x + dir * 14, y: e.y },
          { x: e.x - dir * 10, y: e.y - 10 },
          { x: e.x - dir * 6, y: e.y },
          { x: e.x - dir * 10, y: e.y + 10 }
        ], e.color);
        break;
      }
      case 'zakato': {
        // Small circle
        renderer.fillCircle(e.x, e.y, 8, e.color);
        renderer.fillCircle(e.x, e.y, 3, '#1a1a2e');
        break;
      }
      case 'giddo': {
        // Large hexagon
        const hexOuter = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
          hexOuter.push({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14 });
        }
        renderer.fillPoly(hexOuter, e.color);
        // Inner hexagon
        const hexInner = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i;
          hexInner.push({ x: e.x + Math.cos(a) * 6, y: e.y + Math.sin(a) * 6 });
        }
        renderer.fillPoly(hexInner, '#1a1a2e');
        break;
      }
    }
    renderer.setGlow(null);
  });
}

function drawEnemyBullets(renderer) {
  renderer.setGlow('#f44', 0.4);
  enemyBullets.forEach(b => {
    renderer.fillCircle(b.x, b.y, 3, '#f44');
  });
  renderer.setGlow(null);
}

function drawBoss(renderer) {
  if (!bossActive || !boss) return;
  const b = boss;

  const bossColor = b.flashTimer > 0 ? '#fff' : '#8a6';
  const fillAlpha = b.flashTimer > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(136,238,68,0.15)';
  const innerFill = b.flashTimer > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(100,180,60,0.25)';
  const strokeCol = b.flashTimer > 0 ? '#fff' : '#8e4';
  const innerStroke = b.flashTimer > 0 ? '#fff' : '#ad8';
  const nodeColor = b.flashTimer > 0 ? '#fff' : '#f44';
  if (b.flashTimer > 0) b.flashTimer--;

  renderer.setGlow('#8e4', 0.8);

  // Andor Genesis: large spinning fortress
  // Outer spinning octagon
  const outerPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 / 8) * i + b.spinAngle;
    outerPts.push({ x: b.x + Math.cos(a) * b.radius, y: b.y + Math.sin(a) * b.radius });
  }
  renderer.fillPoly(outerPts, fillAlpha);
  renderer.strokePoly(outerPts, strokeCol, 3, true);

  // Inner structure (rotated octagon)
  const innerPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 / 8) * i + Math.PI / 8 + b.spinAngle;
    innerPts.push({ x: b.x + Math.cos(a) * b.radius * 0.6, y: b.y + Math.sin(a) * b.radius * 0.6 });
  }
  renderer.fillPoly(innerPts, innerFill);
  renderer.strokePoly(innerPts, innerStroke, 2, true);

  // Turret nodes
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 / 4) * i + b.spinAngle;
    const nx = b.x + Math.cos(a) * b.radius * 0.75;
    const ny = b.y + Math.sin(a) * b.radius * 0.75;
    renderer.fillCircle(nx, ny, 5, nodeColor);
  }

  // Core
  const corePulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
  renderer.setGlow('#f84', 0.7);
  renderer.fillCircle(b.x, b.y, 12, applyAlpha('#f84', corePulse));

  renderer.setGlow(null);

  // Health bar above boss
  const hbW = 80;
  const hbX = b.x - hbW / 2;
  const hbY = b.y - b.radius - 15;
  renderer.fillRect(hbX, hbY, hbW, 5, '#400');
  renderer.fillRect(hbX, hbY, hbW * (b.hp / b.maxHp), 5, THEME);
}

function drawParticles(renderer) {
  particles.forEach(p => {
    const alpha = Math.min(1, p.life / 30);
    renderer.fillRect(p.x - 2, p.y - 2, 4, 4, applyAlpha(p.color, alpha));
  });
}
