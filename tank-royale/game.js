import { Game } from '../engine/core.js';

const W = 720;
const H = 420;

const TANK_RADIUS = 17;
const TANK_SPEED = 2.9;
const FIRE_COOLDOWN_MS = 170;
const PLAYER_MAX_HP = 100;

const ENEMY_RADIUS = 16;
const ENEMY_MAX_HP = 55;
const ENEMY_SPEED = 1.6;
const ENEMY_FIRE_COOLDOWN_MS = 760;

const BULLET_SPEED = 7.4;
const BULLET_RADIUS = 3;
const BULLET_LIFE_MS = 1250;
const PLAYER_BULLET_DAMAGE = 25;
const ENEMY_BULLET_DAMAGE = 15;

const DEFAULT_SPAWN_DIRECTOR_CONFIG = {
  spawnCadenceMs: 2300,
  maxConcurrentEnemies: 3,
  spawnBudget: 10,
};

const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
};

let player;
let enemies;
let bullets;
let lastPlayerShotAt;
let score;
let bestScore;
let endResult = null;
let nextEnemyId = 1;
let enemiesDefeated = 0;
let spawnConfig;
let spawnDirector;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const enemiesEl = document.getElementById('enemies');
const phaseEl = document.getElementById('phase');

const overlayPlayBtn = document.getElementById('overlayPlay');
const overlayRestartBtn = document.getElementById('overlayRestart');
const overlayMenuBtn = document.getElementById('overlayMenu');

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readSpawnConfigFromQuery() {
  const params = new URLSearchParams(window.location.search);

  const spawnCadenceMs = readPositiveNumber(
    params.get('spawnCadenceMs'),
    DEFAULT_SPAWN_DIRECTOR_CONFIG.spawnCadenceMs,
  );

  const maxConcurrentEnemies = readPositiveInt(
    params.get('maxConcurrentEnemies'),
    DEFAULT_SPAWN_DIRECTOR_CONFIG.maxConcurrentEnemies,
  );

  const spawnBudget = readPositiveInt(
    params.get('spawnBudget'),
    DEFAULT_SPAWN_DIRECTOR_CONFIG.spawnBudget,
  );

  return {
    spawnCadenceMs: clamp(spawnCadenceMs, 250, 30000),
    maxConcurrentEnemies: clamp(maxConcurrentEnemies, 1, 20),
    spawnBudget: clamp(spawnBudget, 1, 999),
  };
}

function createSpawnDirectorState(config) {
  return {
    maxConcurrentEnemies: config.maxConcurrentEnemies,
    spawnCadenceMs: config.spawnCadenceMs,
    spawnBudget: config.spawnBudget,
    totalSpawned: 0,
    nextSpawnAt: 0,
  };
}

function randomSpawn() {
  return {
    x: 60 + Math.random() * (W - 120),
    y: 60 + Math.random() * (H - 120),
  };
}

function ensureSpawnAwayFromPlayer(spawn, minDist = 130) {
  let attempts = 0;
  while (attempts < 20) {
    const d = Math.hypot(spawn.x - player.x, spawn.y - player.y);
    if (d >= minDist) return spawn;
    const next = randomSpawn();
    spawn.x = next.x;
    spawn.y = next.y;
    attempts += 1;
  }
  return spawn;
}

function spawnEnemy(id) {
  const spawn = ensureSpawnAwayFromPlayer(randomSpawn());
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    angle: Math.PI / 2,
    hp: ENEMY_MAX_HP,
    nextStrafeAt: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    lastShotAt: -9999,
  };
}

function primeEnemyWave() {
  const initialCount = Math.min(
    spawnDirector.maxConcurrentEnemies,
    spawnDirector.spawnBudget,
  );

  for (let i = 0; i < initialCount; i++) {
    enemies.push(spawnEnemy(nextEnemyId++));
    spawnDirector.totalSpawned += 1;
  }

  spawnDirector.nextSpawnAt = performance.now() + spawnDirector.spawnCadenceMs;
}

function updateEnemySpawning(now) {
  if (spawnDirector.totalSpawned >= spawnDirector.spawnBudget) {
    return;
  }

  if (enemies.length >= spawnDirector.maxConcurrentEnemies) {
    return;
  }

  if (now < spawnDirector.nextSpawnAt) {
    return;
  }

  enemies.push(spawnEnemy(nextEnemyId++));
  spawnDirector.totalSpawned += 1;
  spawnDirector.nextSpawnAt = now + spawnDirector.spawnCadenceMs;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  hpEl.textContent = String(Math.max(0, Math.ceil(player.hp)));

  const remaining = Math.max(0, spawnDirector.spawnBudget - enemiesDefeated);
  enemiesEl.textContent = `${enemies.length}/${remaining}`;
}

function setPhaseLabel(value) {
  phaseEl.textContent = value;
}

function resetRound() {
  player = {
    x: W * 0.5,
    y: H * 0.82,
    angle: -Math.PI / 2,
    hp: PLAYER_MAX_HP,
  };

  score = 0;
  bullets = [];
  enemies = [];
  nextEnemyId = 1;
  enemiesDefeated = 0;
  spawnDirector = createSpawnDirectorState(spawnConfig);
  primeEnemyWave();

  lastPlayerShotAt = -9999;
  endResult = null;
  updateHud();
}

function bindTouchButton(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;

  const setState = (value) => {
    touchState[stateKey] = value;
    el.classList.toggle('active', value);
  };

  const onDown = (e) => {
    e.preventDefault();
    setState(true);
  };

  const onUp = (e) => {
    e.preventDefault();
    setState(false);
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', onUp);

  // Fallback for older mobile browsers
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchend', onUp, { passive: false });
  el.addEventListener('touchcancel', onUp, { passive: false });
}

function setupTouchControls() {
  bindTouchButton('btn-up', 'up');
  bindTouchButton('btn-down', 'down');
  bindTouchButton('btn-left', 'left');
  bindTouchButton('btn-right', 'right');
  bindTouchButton('btn-fire', 'fire');

  window.addEventListener('blur', () => {
    for (const key of Object.keys(touchState)) {
      touchState[key] = false;
    }
    document.querySelectorAll('.touch-btn.active').forEach((el) => {
      el.classList.remove('active');
    });
  });
}

function readMoveInput(input) {
  let mx = 0;
  let my = 0;

  if (input.isDown('w') || input.isDown('W') || input.isDown('ArrowUp') || touchState.up) my -= 1;
  if (input.isDown('s') || input.isDown('S') || input.isDown('ArrowDown') || touchState.down) my += 1;
  if (input.isDown('a') || input.isDown('A') || input.isDown('ArrowLeft') || touchState.left) mx -= 1;
  if (input.isDown('d') || input.isDown('D') || input.isDown('ArrowRight') || touchState.right) mx += 1;

  return { mx, my };
}

function shouldFire(input) {
  return input.isDown(' ') || touchState.fire;
}

function pushBullet(shooter, x, y, angle, damage) {
  bullets.push({
    shooter,
    x,
    y,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    bornAt: performance.now(),
    damage,
  });
}

function tryShootPlayer(now) {
  if (now - lastPlayerShotAt < FIRE_COOLDOWN_MS) return;

  const tipX = player.x + Math.cos(player.angle) * (TANK_RADIUS + 10);
  const tipY = player.y + Math.sin(player.angle) * (TANK_RADIUS + 10);
  pushBullet('player', tipX, tipY, player.angle, PLAYER_BULLET_DAMAGE);

  lastPlayerShotAt = now;
}

function tryShootEnemy(enemy, now) {
  const jitteredCooldown = ENEMY_FIRE_COOLDOWN_MS + enemy.id * 70;
  if (now - enemy.lastShotAt < jitteredCooldown) return;

  const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (distToPlayer > 310) return;

  const tipX = enemy.x + Math.cos(enemy.angle) * (ENEMY_RADIUS + 10);
  const tipY = enemy.y + Math.sin(enemy.angle) * (ENEMY_RADIUS + 10);
  pushBullet('enemy', tipX, tipY, enemy.angle, ENEMY_BULLET_DAMAGE);

  enemy.lastShotAt = now;
}

function drawTank(renderer, tank, palette) {
  const c = Math.cos(tank.angle);
  const s = Math.sin(tank.angle);

  const hw = 18;
  const hh = 12;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({
    x: tank.x + p.x * c - p.y * s,
    y: tank.y + p.x * s + p.y * c,
  }));

  renderer.fillPoly(corners, palette.body);

  const treadOffset = 14;
  const treadA = {
    x: tank.x + (-14) * c - (-treadOffset) * s,
    y: tank.y + (-14) * s + (-treadOffset) * c,
  };
  const treadB = {
    x: tank.x + (14) * c - (-treadOffset) * s,
    y: tank.y + (14) * s + (-treadOffset) * c,
  };
  const treadC = {
    x: tank.x + (14) * c - (treadOffset) * s,
    y: tank.y + (14) * s + (treadOffset) * c,
  };
  const treadD = {
    x: tank.x + (-14) * c - (treadOffset) * s,
    y: tank.y + (-14) * s + (treadOffset) * c,
  };
  renderer.drawLine(treadA.x, treadA.y, treadB.x, treadB.y, palette.tread, 4);
  renderer.drawLine(treadD.x, treadD.y, treadC.x, treadC.y, palette.tread, 4);

  renderer.fillCircle(tank.x, tank.y, 9, palette.turret);
  renderer.drawLine(
    tank.x,
    tank.y,
    tank.x + c * (TANK_RADIUS + 12),
    tank.y + s * (TANK_RADIUS + 12),
    palette.barrel,
    5,
  );
}

function drawHpBar(renderer, entity, maxHp, color, yOffset) {
  const width = 30;
  const ratio = clamp(entity.hp / maxHp, 0, 1);
  const x = entity.x - width * 0.5;
  const y = entity.y + yOffset;

  renderer.fillRect(x, y, width, 4, '#000000aa');
  renderer.fillRect(x, y, width * ratio, 4, color);
}

function showButtonState(mode) {
  if (!overlayPlayBtn || !overlayRestartBtn || !overlayMenuBtn) return;

  overlayPlayBtn.hidden = mode !== 'menu';
  overlayRestartBtn.hidden = mode !== 'over';
  overlayMenuBtn.hidden = mode !== 'over';
}

function showMainMenu(game) {
  resetRound();
  setPhaseLabel('MENU');
  showButtonState('menu');
  game.setState('waiting');

  const cadenceSeconds = (spawnConfig.spawnCadenceMs / 1000).toFixed(1);
  game.showOverlay(
    'TANK ROYALE',
    `Simple skirmish prototype\n\nWin: Clear all spawn waves (${spawnConfig.spawnBudget} tanks total)\nLose: Your HP reaches 0\n\nSpawn Director\n- Cadence: ${cadenceSeconds}s\n- Max Concurrent: ${spawnConfig.maxConcurrentEnemies}\n\nEnter / Space / Play to start`,
  );
}

function startRun(game) {
  resetRound();
  setPhaseLabel('PLAY');
  showButtonState('play');
  game.setState('playing');
}

function endRun(game, didWin) {
  endResult = didWin ? 'WIN' : 'LOSE';
  setPhaseLabel(endResult);
  game.setState('over');
  showButtonState('over');

  const title = didWin ? 'VICTORY' : 'DEFEAT';
  const text = didWin
    ? `All spawn waves cleared!\nFinal score: ${score}`
    : `Your tank was destroyed.\nFinal score: ${score}`;

  game.showOverlay(
    title,
    `${text}\n\nR / Enter: Restart\nM / Esc: Menu`,
  );
}

function updateEnemies(dt) {
  const step = dt / (1000 / 60);
  const now = performance.now();

  updateEnemySpawning(now);

  for (const enemy of enemies) {
    const toPlayerX = player.x - enemy.x;
    const toPlayerY = player.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    enemy.angle = Math.atan2(toPlayerY, toPlayerX);

    if (now >= enemy.nextStrafeAt) {
      enemy.strafeDir *= -1;
      enemy.nextStrafeAt = now + 600 + Math.random() * 500;
    }

    let moveX = 0;
    let moveY = 0;

    if (dist > 165) {
      moveX = Math.cos(enemy.angle);
      moveY = Math.sin(enemy.angle);
    } else if (dist < 100) {
      moveX = -Math.cos(enemy.angle);
      moveY = -Math.sin(enemy.angle);
    } else {
      moveX = Math.cos(enemy.angle + (Math.PI / 2) * enemy.strafeDir);
      moveY = Math.sin(enemy.angle + (Math.PI / 2) * enemy.strafeDir);
    }

    enemy.x += moveX * ENEMY_SPEED * step;
    enemy.y += moveY * ENEMY_SPEED * step;
    enemy.x = clamp(enemy.x, ENEMY_RADIUS + 2, W - ENEMY_RADIUS - 2);
    enemy.y = clamp(enemy.y, ENEMY_RADIUS + 2, H - ENEMY_RADIUS - 2);

    tryShootEnemy(enemy, now);
  }
}

function updateBullets(dt, game) {
  const now = performance.now();
  const step = dt / (1000 / 60);

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * step;
    b.y += b.vy * step;

    const expired = now - b.bornAt > BULLET_LIFE_MS;
    const outOfBounds = b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10;
    if (expired || outOfBounds) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.shooter === 'player') {
      let hitEnemy = false;
      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        const d = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (d <= ENEMY_RADIUS + BULLET_RADIUS) {
          enemy.hp -= b.damage;
          bullets.splice(i, 1);
          hitEnemy = true;

          if (enemy.hp <= 0) {
            enemies.splice(e, 1);
            enemiesDefeated += 1;
            score += 100;
            if (score > bestScore) {
              bestScore = score;
            }
          }

          updateHud();
          if (
            enemies.length === 0
            && spawnDirector.totalSpawned >= spawnDirector.spawnBudget
          ) {
            endRun(game, true);
          }

          break;
        }
      }
      if (hitEnemy) continue;
    }

    if (b.shooter === 'enemy') {
      const d = Math.hypot(b.x - player.x, b.y - player.y);
      if (d <= TANK_RADIUS + BULLET_RADIUS) {
        player.hp -= b.damage;
        bullets.splice(i, 1);
        updateHud();

        if (player.hp <= 0) {
          endRun(game, false);
        }

        continue;
      }
    }
  }
}

function tryStartFromInput(game, input) {
  if (input.wasPressed('Enter') || input.wasPressed(' ') || touchState.fire) {
    startRun(game);
  }
}

function tryHandleOverInput(game, input) {
  if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed(' ')) {
    startRun(game);
    return;
  }

  if (input.wasPressed('m') || input.wasPressed('M') || input.wasPressed('Escape')) {
    showMainMenu(game);
  }
}

function drawArena(renderer) {
  renderer.fillRect(0, 0, W, H, '#0d1224');

  renderer.drawLine(2, 2, W - 2, 2, '#2a4f82', 2);
  renderer.drawLine(W - 2, 2, W - 2, H - 2, '#2a4f82', 2);
  renderer.drawLine(W - 2, H - 2, 2, H - 2, '#2a4f82', 2);
  renderer.drawLine(2, H - 2, 2, 2, '#2a4f82', 2);

  for (let x = 40; x < W; x += 40) {
    renderer.drawLine(x, 0, x, H, '#ffffff08', 1);
  }
  for (let y = 40; y < H; y += 40) {
    renderer.drawLine(0, y, W, y, '#ffffff08', 1);
  }
}

export function createGame() {
  const game = new Game('game');

  setupTouchControls();

  overlayPlayBtn?.addEventListener('click', () => {
    if (game.state === 'waiting') startRun(game);
  });

  overlayRestartBtn?.addEventListener('click', () => {
    if (game.state === 'over') startRun(game);
  });

  overlayMenuBtn?.addEventListener('click', () => {
    showMainMenu(game);
  });

  game.onInit = () => {
    bestScore = Number(bestEl.textContent) || 0;
    spawnConfig = readSpawnConfigFromQuery();
    resetRound();
    game.setScoreFn(() => score);
    showMainMenu(game);
  };

  game.onUpdate = (dt) => {
    const input = game.input;

    if (game.state === 'waiting') {
      tryStartFromInput(game, input);
      return;
    }

    if (game.state === 'over') {
      tryHandleOverInput(game, input);
      return;
    }

    if (game.state !== 'playing') return;

    if (input.wasPressed('Escape') || input.wasPressed('m') || input.wasPressed('M')) {
      showMainMenu(game);
      return;
    }

    const move = readMoveInput(input);
    if (move.mx !== 0 || move.my !== 0) {
      const len = Math.hypot(move.mx, move.my);
      const nx = move.mx / len;
      const ny = move.my / len;
      const scale = dt / (1000 / 60);

      player.x += nx * TANK_SPEED * scale;
      player.y += ny * TANK_SPEED * scale;
      player.angle = Math.atan2(ny, nx);
    }

    player.x = clamp(player.x, TANK_RADIUS + 2, W - TANK_RADIUS - 2);
    player.y = clamp(player.y, TANK_RADIUS + 2, H - TANK_RADIUS - 2);

    const now = performance.now();
    if (shouldFire(input)) {
      tryShootPlayer(now);
    }

    updateEnemies(dt);
    updateBullets(dt, game);
  };

  game.onDraw = (renderer, text) => {
    drawArena(renderer);

    if (game.state !== 'waiting' || endResult) {
      for (const enemy of enemies) {
        drawTank(renderer, enemy, {
          body: '#d25a72',
          tread: '#662031',
          turret: '#f39fb0',
          barrel: '#ffe4ea',
        });
        drawHpBar(renderer, enemy, ENEMY_MAX_HP, '#ff7794', 22);
      }

      drawTank(renderer, player, {
        body: '#5ab2ff',
        tread: '#21496a',
        turret: '#8fd2ff',
        barrel: '#dff3ff',
      });
      drawHpBar(renderer, player, PLAYER_MAX_HP, '#63d3ff', 22);

      for (const b of bullets) {
        const glow = b.shooter === 'player' ? '#ffe67d' : '#ff8b9f';
        const fill = b.shooter === 'player' ? '#fff1ac' : '#ffd6de';
        renderer.setGlow(glow, 0.35);
        renderer.fillCircle(b.x, b.y, BULLET_RADIUS, fill);
        renderer.setGlow(null);
      }
    }

    text.drawText('MOVE: WASD / ARROWS / TOUCH D-PAD', 10, 16, 10, '#7fb5ff', 'left');
    text.drawText('SHOOT: SPACE / TOUCH FIRE', 10, 30, 10, '#7fb5ff', 'left');
    text.drawText('MENU: ESC / M', W - 10, 16, 10, '#7fb5ff', 'right');
  };

  game.start();
  return game;
}
