import { Game } from '../engine/core.js';

const canvasEl = document.getElementById('game');
const W = canvasEl?.width || 720;
const H = canvasEl?.height || 420;

const CELL = 40;
const GRID_COLS = 18;
const GRID_ROWS = 10;
const GRID_OFFSET_Y = (H - GRID_ROWS * CELL) * 0.5;

const TANK_RADIUS = 17;
const TANK_SPEED = 2.9;
const FIRE_COOLDOWN_MS = 170;
const PLAYER_MAX_HP = 100;

const ENEMY_COUNT = 3;
const ENEMY_RADIUS = 16;
const ENEMY_MAX_HP = 55;
const ENEMY_SPEED = 1.55;
const ENEMY_FIRE_COOLDOWN_MS = 760;
const ENEMY_MEMORY_MS = 1300;

const BULLET_SPEED = 7.4;
const BULLET_RADIUS = 3;
const BULLET_LIFE_MS = 1250;
const PLAYER_BULLET_DAMAGE = 25;
const ENEMY_BULLET_DAMAGE = 15;

const touchState = { up: false, down: false, left: false, right: false, fire: false };

let grid = { blocked: new Set(), openCells: [] };
let player;
let enemies;
let bullets;
let lastPlayerShotAt;
let score;
let bestScore;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const enemiesEl = document.getElementById('enemies');
const phaseEl = document.getElementById('phase');

const overlayPlayBtn = document.getElementById('overlayPlay');
const overlayRestartBtn = document.getElementById('overlayRestart');
const overlayMenuBtn = document.getElementById('overlayMenu');

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const keyForCell = (c, r) => `${c},${r}`;
const inGrid = (c, r) => c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;

function worldToCell(x, y) {
  return { c: Math.floor(x / CELL), r: Math.floor((y - GRID_OFFSET_Y) / CELL) };
}

function cellToWorldCenter(c, r) {
  return { x: c * CELL + CELL * 0.5, y: GRID_OFFSET_Y + r * CELL + CELL * 0.5 };
}

function pointInsideGrid(x, y) {
  return x >= 0 && x < W && y >= GRID_OFFSET_Y && y < GRID_OFFSET_Y + GRID_ROWS * CELL;
}

function isBlockedCell(c, r) {
  if (!inGrid(c, r)) return true;
  return grid.blocked.has(keyForCell(c, r));
}

function pointBlocked(x, y) {
  if (!pointInsideGrid(x, y)) return true;
  const { c, r } = worldToCell(x, y);
  return isBlockedCell(c, r);
}

function circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearestX = clamp(cx, rx, rx + rw);
  const nearestY = clamp(cy, ry, ry + rh);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= cr * cr;
}

function isCircleBlocked(cx, cy, radius) {
  if (cx - radius < 0 || cx + radius > W) return true;
  if (cy - radius < GRID_OFFSET_Y || cy + radius > GRID_OFFSET_Y + GRID_ROWS * CELL) return true;

  const cMin = Math.floor((cx - radius) / CELL) - 1;
  const cMax = Math.floor((cx + radius) / CELL) + 1;
  const rMin = Math.floor((cy - radius - GRID_OFFSET_Y) / CELL) - 1;
  const rMax = Math.floor((cy + radius - GRID_OFFSET_Y) / CELL) + 1;

  for (let c = cMin; c <= cMax; c++) {
    for (let r = rMin; r <= rMax; r++) {
      if (!isBlockedCell(c, r)) continue;
      const rx = c * CELL;
      const ry = GRID_OFFSET_Y + r * CELL;
      if (circleIntersectsRect(cx, cy, radius, rx, ry, CELL, CELL)) return true;
    }
  }
  return false;
}

function lineHitsWall(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const samples = Math.max(2, Math.ceil(dist / 8));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (pointBlocked(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
  }
  return false;
}

function randomOpenCell(validator = null) {
  if (grid.openCells.length === 0) return cellToWorldCenter(Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2));
  const start = Math.floor(Math.random() * grid.openCells.length);
  for (let i = 0; i < grid.openCells.length; i++) {
    const idx = (start + i) % grid.openCells.length;
    const cell = grid.openCells[idx];
    if (!validator || validator(cell)) return cellToWorldCenter(cell.c, cell.r);
  }
  const fallback = grid.openCells[start];
  return cellToWorldCenter(fallback.c, fallback.r);
}

function generateGrid() {
  const blocked = new Set();
  const markBlocked = (c, r) => inGrid(c, r) && blocked.add(keyForCell(c, r));

  for (let c = 0; c < GRID_COLS; c++) { markBlocked(c, 0); markBlocked(c, GRID_ROWS - 1); }
  for (let r = 0; r < GRID_ROWS; r++) { markBlocked(0, r); markBlocked(GRID_COLS - 1, r); }

  const fixedBlocks = [
    [4, 2], [4, 3], [4, 6], [4, 7],
    [7, 2], [7, 3], [7, 6], [7, 7],
    [10, 2], [10, 3], [10, 6], [10, 7],
    [13, 2], [13, 3], [13, 6], [13, 7],
    [8, 4], [9, 5],
  ];
  for (const [c, r] of fixedBlocks) markBlocked(c, r);

  const reserved = new Set([
    keyForCell(Math.floor(GRID_COLS / 2), GRID_ROWS - 2),
    keyForCell(Math.floor(GRID_COLS / 2) - 1, GRID_ROWS - 2),
    keyForCell(Math.floor(GRID_COLS / 2) + 1, GRID_ROWS - 2),
    keyForCell(Math.floor(GRID_COLS / 2), GRID_ROWS - 3),
  ]);

  let randomBlocks = 10;
  while (randomBlocks > 0) {
    const c = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
    const r = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
    const k = keyForCell(c, r);
    if (blocked.has(k) || reserved.has(k)) continue;
    if (r >= GRID_ROWS - 3 && Math.abs(c - Math.floor(GRID_COLS / 2)) <= 2) continue;
    blocked.add(k);
    randomBlocks -= 1;
  }

  const openCells = [];
  for (let c = 1; c < GRID_COLS - 1; c++) {
    for (let r = 1; r < GRID_ROWS - 1; r++) {
      if (!blocked.has(keyForCell(c, r))) openCells.push({ c, r });
    }
  }

  grid = { blocked, openCells };
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  hpEl.textContent = String(Math.max(0, Math.ceil(player.hp)));
  enemiesEl.textContent = String(enemies.length);
}

function setPhaseLabel(value) {
  phaseEl.textContent = value;
}

function spawnEnemy(id) {
  const spawn = randomOpenCell((cell) => {
    const pos = cellToWorldCenter(cell.c, cell.r);
    return Math.hypot(pos.x - player.x, pos.y - player.y) > 220;
  });

  return {
    id,
    x: spawn.x,
    y: spawn.y,
    angle: Math.PI / 2,
    hp: ENEMY_MAX_HP,
    state: 'patrol',
    waypoint: randomOpenCell(),
    seenPlayerUntil: 0,
    nextStrafeAt: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    lastShotAt: -9999,
  };
}

function resetRound() {
  generateGrid();
  const preferred = cellToWorldCenter(Math.floor(GRID_COLS * 0.5), GRID_ROWS - 2);
  const spawnPoint = isCircleBlocked(preferred.x, preferred.y, TANK_RADIUS) ? randomOpenCell() : preferred;

  player = { x: spawnPoint.x, y: spawnPoint.y, angle: -Math.PI / 2, hp: PLAYER_MAX_HP };
  score = 0;
  bullets = [];
  enemies = [];
  for (let i = 0; i < ENEMY_COUNT; i++) enemies.push(spawnEnemy(i + 1));
  lastPlayerShotAt = -9999;
  updateHud();
}

function bindTouchButton(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;

  const setState = (value) => {
    touchState[stateKey] = value;
    el.classList.toggle('active', value);
  };

  const onDown = (e) => { e.preventDefault(); setState(true); };
  const onUp = (e) => { e.preventDefault(); setState(false); };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', onUp);

  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchend', onUp, { passive: false });
  el.addEventListener('touchcancel', onUp, { passive: false });
}

function setupTouchControls() {
  const touchRoot = document.getElementById('touch-controls');
  touchRoot?.classList.remove('hidden');

  bindTouchButton('btn-up', 'up');
  bindTouchButton('btn-down', 'down');
  bindTouchButton('btn-left', 'left');
  bindTouchButton('btn-right', 'right');
  bindTouchButton('btn-fire', 'fire');

  window.addEventListener('blur', () => {
    for (const key of Object.keys(touchState)) touchState[key] = false;
    document.querySelectorAll('.touch-btn.active').forEach((el) => el.classList.remove('active'));
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

const shouldFire = (input) => input.isDown(' ') || touchState.fire;

function pushBullet(shooter, x, y, angle, damage) {
  bullets.push({ shooter, x, y, vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED, bornAt: performance.now(), damage });
}

function tryShootPlayer(now) {
  if (now - lastPlayerShotAt < FIRE_COOLDOWN_MS) return;
  const tipX = player.x + Math.cos(player.angle) * (TANK_RADIUS + 10);
  const tipY = player.y + Math.sin(player.angle) * (TANK_RADIUS + 10);
  if (pointBlocked(tipX, tipY)) return;
  pushBullet('player', tipX, tipY, player.angle, PLAYER_BULLET_DAMAGE);
  lastPlayerShotAt = now;
}

function tryShootEnemy(enemy, now) {
  if (now - enemy.lastShotAt < ENEMY_FIRE_COOLDOWN_MS + enemy.id * 90) return;
  const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (dist > 290 || lineHitsWall(enemy.x, enemy.y, player.x, player.y)) return;

  const tipX = enemy.x + Math.cos(enemy.angle) * (ENEMY_RADIUS + 10);
  const tipY = enemy.y + Math.sin(enemy.angle) * (ENEMY_RADIUS + 10);
  if (pointBlocked(tipX, tipY)) return;

  pushBullet('enemy', tipX, tipY, enemy.angle, ENEMY_BULLET_DAMAGE);
  enemy.lastShotAt = now;
}

function moveWithCollision(entity, moveX, moveY, speed, step, radius) {
  const nextX = entity.x + moveX * speed * step;
  if (!isCircleBlocked(nextX, entity.y, radius)) entity.x = nextX;

  const nextY = entity.y + moveY * speed * step;
  if (!isCircleBlocked(entity.x, nextY, radius)) entity.y = nextY;
}

function drawTank(renderer, tank, palette) {
  const c = Math.cos(tank.angle);
  const s = Math.sin(tank.angle);

  const hw = 18;
  const hh = 12;
  const corners = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }].map((p) => ({
    x: tank.x + p.x * c - p.y * s,
    y: tank.y + p.x * s + p.y * c,
  }));

  renderer.fillPoly(corners, palette.body);
  renderer.fillCircle(tank.x, tank.y, 9, palette.turret);
  renderer.drawLine(tank.x, tank.y, tank.x + c * (TANK_RADIUS + 12), tank.y + s * (TANK_RADIUS + 12), palette.barrel, 5);
}

function drawHpBar(renderer, entity, maxHp, color, yOffset) {
  const width = 30;
  const ratio = clamp(entity.hp / maxHp, 0, 1);
  const x = entity.x - width * 0.5;
  const y = entity.y + yOffset;

  renderer.fillRect(x, y, width, 4, '#000000aa');
  renderer.fillRect(x, y, width * ratio, 4, color);
}

function showMainMenu(game) {
  resetRound();
  setPhaseLabel('MENU');
  game.setState('waiting');
  game.showOverlay(
    'TANK ROYALE',
    'Integrated gameplay scene:\n• Grid arena + random solid blocks\n• Player movement + shooting\n• AI tanks (patrol/chase/shoot)\n\nEnter / Space / Play to start',
  );
}

function startRun(game) {
  resetRound();
  setPhaseLabel('PLAY');
  game.setState('playing');
}

function endRun(game, didWin) {
  setPhaseLabel(didWin ? 'WIN' : 'LOSE');
  game.setState('over');
  const title = didWin ? 'VICTORY' : 'DEFEAT';
  const text = didWin ? `All enemy tanks eliminated!\nFinal score: ${score}` : `Your tank was destroyed.\nFinal score: ${score}`;
  game.showOverlay(title, `${text}\n\nR / Enter: Restart\nM / Esc: Menu`);
}

function updateEnemies(dt) {
  const step = dt / (1000 / 60);
  const now = performance.now();

  for (const enemy of enemies) {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
    const canSeePlayer = dist < 280 && !lineHitsWall(enemy.x, enemy.y, player.x, player.y);

    if (canSeePlayer) enemy.seenPlayerUntil = now + ENEMY_MEMORY_MS;
    enemy.state = now <= enemy.seenPlayerUntil ? 'chase' : 'patrol';

    if (now >= enemy.nextStrafeAt) {
      enemy.strafeDir *= -1;
      enemy.nextStrafeAt = now + 650 + Math.random() * 500;
    }

    let targetX = enemy.waypoint?.x ?? enemy.x;
    let targetY = enemy.waypoint?.y ?? enemy.y;

    if (enemy.state === 'patrol') {
      const reached = Math.hypot(enemy.x - targetX, enemy.y - targetY) < 10;
      if (!enemy.waypoint || reached || pointBlocked(targetX, targetY)) enemy.waypoint = randomOpenCell();
      targetX = enemy.waypoint.x;
      targetY = enemy.waypoint.y;
    } else {
      targetX = player.x;
      targetY = player.y;
    }

    let moveAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    if (enemy.state === 'chase' && dist < 130) moveAngle += (Math.PI / 2) * enemy.strafeDir;

    const beforeX = enemy.x;
    const beforeY = enemy.y;
    moveWithCollision(enemy, Math.cos(moveAngle), Math.sin(moveAngle), ENEMY_SPEED, step, ENEMY_RADIUS);

    if (Math.hypot(enemy.x - beforeX, enemy.y - beforeY) < 0.01 && enemy.state === 'patrol') {
      enemy.waypoint = randomOpenCell();
    }

    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    if (enemy.state === 'chase') tryShootEnemy(enemy, now);
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
    const out = b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10;
    if (expired || out || isCircleBlocked(b.x, b.y, BULLET_RADIUS + 1)) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.shooter === 'player') {
      let hitEnemy = false;
      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        if (Math.hypot(b.x - enemy.x, b.y - enemy.y) <= ENEMY_RADIUS + BULLET_RADIUS) {
          enemy.hp -= b.damage;
          bullets.splice(i, 1);
          hitEnemy = true;

          if (enemy.hp <= 0) {
            enemies.splice(e, 1);
            score += 100;
            if (score > bestScore) bestScore = score;
          }

          updateHud();
          if (enemies.length === 0) endRun(game, true);
          break;
        }
      }
      if (hitEnemy) continue;
    }

    if (b.shooter === 'enemy' && Math.hypot(b.x - player.x, b.y - player.y) <= TANK_RADIUS + BULLET_RADIUS) {
      player.hp -= b.damage;
      bullets.splice(i, 1);
      updateHud();
      if (player.hp <= 0) endRun(game, false);
    }
  }
}

function drawArena(renderer) {
  renderer.fillRect(0, 0, W, H, '#0d1224');
  renderer.fillRect(0, GRID_OFFSET_Y, W, GRID_ROWS * CELL, '#111a33');

  for (let c = 0; c <= GRID_COLS; c++) {
    const x = c * CELL;
    renderer.drawLine(x, GRID_OFFSET_Y, x, GRID_OFFSET_Y + GRID_ROWS * CELL, '#6fa0ff1c', 1);
  }
  for (let r = 0; r <= GRID_ROWS; r++) {
    const y = GRID_OFFSET_Y + r * CELL;
    renderer.drawLine(0, y, W, y, '#6fa0ff1c', 1);
  }

  for (const key of grid.blocked) {
    const [cRaw, rRaw] = key.split(',');
    const c = Number(cRaw);
    const r = Number(rRaw);
    const x = c * CELL;
    const y = GRID_OFFSET_Y + r * CELL;
    renderer.fillRect(x + 2, y + 2, CELL - 4, CELL - 4, '#273657');
    renderer.fillRect(x + 6, y + 6, CELL - 12, CELL - 12, '#324975');
  }
}

export function createGame() {
  const game = new Game('game');

  setupTouchControls();

  overlayPlayBtn?.addEventListener('click', () => game.state === 'waiting' && startRun(game));
  game.overlay?.addEventListener('pointerdown', () => game.state === 'waiting' && startRun(game));
  overlayRestartBtn?.addEventListener('click', () => game.state === 'over' && startRun(game));
  overlayMenuBtn?.addEventListener('click', () => showMainMenu(game));

  game.onInit = () => {
    bestScore = Number(bestEl.textContent) || 0;
    resetRound();
    game.setScoreFn(() => score);
    showMainMenu(game);
  };

  game.onUpdate = (dt) => {
    const input = game.input;

    if (game.state === 'waiting') {
      const move = readMoveInput(input);
      if (move.mx !== 0 || move.my !== 0 || input.wasPressed('Enter') || input.wasPressed(' ') || touchState.fire) {
        startRun(game);
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed(' ')) startRun(game);
      if (input.wasPressed('m') || input.wasPressed('M') || input.wasPressed('Escape')) showMainMenu(game);
      return;
    }

    if (input.wasPressed('Escape') || input.wasPressed('m') || input.wasPressed('M')) {
      showMainMenu(game);
      return;
    }

    const move = readMoveInput(input);
    if (move.mx !== 0 || move.my !== 0) {
      const len = Math.hypot(move.mx, move.my);
      const step = dt / (1000 / 60);
      const nx = move.mx / len;
      const ny = move.my / len;
      moveWithCollision(player, nx, ny, TANK_SPEED, step, TANK_RADIUS);
      player.angle = Math.atan2(ny, nx);
    }

    const now = performance.now();
    if (shouldFire(input)) tryShootPlayer(now);

    updateEnemies(dt);
    updateBullets(dt, game);
  };

  game.onDraw = (renderer, text) => {
    drawArena(renderer);

    for (const enemy of enemies) {
      drawTank(renderer, enemy, { body: '#d25a72', turret: '#f39fb0', barrel: '#ffe4ea' });
      drawHpBar(renderer, enemy, ENEMY_MAX_HP, '#ff7794', 22);
    }

    drawTank(renderer, player, { body: '#5ab2ff', turret: '#8fd2ff', barrel: '#dff3ff' });
    drawHpBar(renderer, player, PLAYER_MAX_HP, '#63d3ff', 22);

    for (const b of bullets) {
      const glow = b.shooter === 'player' ? '#ffe67d' : '#ff8b9f';
      const fill = b.shooter === 'player' ? '#fff1ac' : '#ffd6de';
      renderer.setGlow(glow, 0.35);
      renderer.fillCircle(b.x, b.y, BULLET_RADIUS, fill);
      renderer.setGlow(null);
    }

    text.drawText('MOVE: WASD / ARROWS / TOUCH D-PAD', 10, 16, 10, '#7fb5ff', 'left');
    text.drawText('SHOOT: SPACE / TOUCH FIRE', 10, 30, 10, '#7fb5ff', 'left');
    text.drawText('MENU: ESC / M', W - 10, 16, 10, '#7fb5ff', 'right');
  };

  game.start();
  return game;
}
