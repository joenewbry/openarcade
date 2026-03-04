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

const DEFAULT_CHALLENGE_DATA = {
  modes: [
    {
      id: 'no-walls-open-arena',
      name: 'No Walls (Open Arena)',
      tier: 1,
      enemyCount: 3,
      spawnCadenceSeconds: 7.8,
      mapSize: { width: 22, height: 22 },
      specialRule: 'no_walls',
      killTarget: 12,
      blitz: { startSeconds: 0, killBonusSeconds: 0 },
    },
    {
      id: 'blitz-clock-time-attack',
      name: 'Blitz Clock (Time Attack)',
      tier: 2,
      enemyCount: 4,
      spawnCadenceSeconds: 6.9,
      mapSize: { width: 21, height: 21 },
      specialRule: 'blitz_clock',
      killTarget: 18,
      blitz: { startSeconds: 90, killBonusSeconds: 3 },
    },
    {
      id: 'fast-spawn-overclocked',
      name: 'Fast Spawn',
      tier: 3,
      enemyCount: 5,
      spawnCadenceSeconds: 4.9,
      mapSize: { width: 20, height: 20 },
      specialRule: 'fast_spawn',
      killTarget: 22,
      blitz: { startSeconds: 0, killBonusSeconds: 0 },
    },
  ],
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
let killsThisRun = 0;
let nextEnemyId = 1;

let challengeModes = [];
let selectedChallengeId = null;
let currentChallenge = null;
let challengeMetrics = { maxMapWidth: 22, maxMapHeight: 22 };
let unlockedTier = 1;
let clearedModeIds = new Set();

const PROGRESS_STORAGE_KEY = 'tankRoyaleChallengeProgressV1';

let arenaBounds = { minX: 2, minY: 2, maxX: W - 2, maxY: H - 2 };
let arenaWallRects = [];
let blitzClockRemainingMs = 0;

let spawnDirector = {
  maxConcurrentEnemies: 3,
  spawnCadenceMs: 7800,
  totalSpawned: 0,
  spawnBudget: 12,
  nextSpawnAt: 0,
};

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const enemiesEl = document.getElementById('enemies');
const phaseEl = document.getElementById('phase');
const modeEl = document.getElementById('modeName');
const timerEl = document.getElementById('timer');

const challengeCardsEl = document.getElementById('challengeCards');
const modeLaunchBtn = document.getElementById('challengeLaunch');
const challengeStateBadgeEl = document.getElementById('challengeStateBadge');
const challengeTitleEl = document.getElementById('challengeTitle');
const challengeRuleEl = document.getElementById('challengeRule');
const challengeMetaEl = document.getElementById('challengeMeta');
const challengeUnlockHintEl = document.getElementById('challengeUnlockHint');

const overlayPlayBtn = document.getElementById('overlayPlay');
const overlayRestartBtn = document.getElementById('overlayRestart');
const overlayMenuBtn = document.getElementById('overlayMenu');

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function circleIntersectsRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function isCircleCollidingWithWall(cx, cy, radius) {
  for (const wall of arenaWallRects) {
    if (circleIntersectsRect(cx, cy, radius, wall)) {
      return true;
    }
  }

  return false;
}

function clampEntityToArena(entity, radius) {
  entity.x = clamp(entity.x, arenaBounds.minX + radius, arenaBounds.maxX - radius);
  entity.y = clamp(entity.y, arenaBounds.minY + radius, arenaBounds.maxY - radius);
}

function moveWithWallCollision(entity, targetX, targetY, radius) {
  const prevX = entity.x;
  const prevY = entity.y;

  entity.x = targetX;
  entity.y = targetY;
  clampEntityToArena(entity, radius);

  if (isCircleCollidingWithWall(entity.x, entity.y, radius)) {
    entity.x = prevX;
    entity.y = prevY;
  }
}

function randomSpawn() {
  const spawnPadding = 24;
  const minX = arenaBounds.minX + spawnPadding;
  const maxX = arenaBounds.maxX - spawnPadding;
  const minY = arenaBounds.minY + spawnPadding;
  const maxY = arenaBounds.maxY - spawnPadding;

  return {
    x: minX + Math.random() * Math.max(1, maxX - minX),
    y: minY + Math.random() * Math.max(1, maxY - minY),
  };
}

function ensureSpawnAwayFromPlayer(spawn, minDist = 130) {
  let attempts = 0;
  while (attempts < 32) {
    const d = Math.hypot(spawn.x - player.x, spawn.y - player.y);
    const validDistance = d >= minDist;
    const freeOfWalls = !isCircleCollidingWithWall(spawn.x, spawn.y, ENEMY_RADIUS);

    if (validDistance && freeOfWalls) {
      return spawn;
    }

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

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  hpEl.textContent = String(Math.max(0, Math.ceil(player?.hp ?? PLAYER_MAX_HP)));
  enemiesEl.textContent = `${enemies.length}/${Math.max(0, currentChallenge?.killTarget ?? 0) - killsThisRun}`;

  const modeLabel = currentChallenge ? `T${currentChallenge.tier} ${currentChallenge.name}` : 'None';
  modeEl.textContent = modeLabel;

  if (currentChallenge?.specialRule === 'blitz_clock') {
    timerEl.textContent = `${Math.max(0, Math.ceil(blitzClockRemainingMs / 1000))}s`;
  } else {
    timerEl.textContent = '--';
  }
}

function setPhaseLabel(value) {
  phaseEl.textContent = value;
}

function parseChallengeMode(rawMode) {
  const mapWidth = isFiniteNumber(rawMode?.mapSize?.width, 22);
  const mapHeight = isFiniteNumber(rawMode?.mapSize?.height, 22);

  return {
    id: String(rawMode?.id ?? 'mode-unknown'),
    name: String(rawMode?.name ?? 'Unnamed Mode'),
    tier: Math.max(1, Math.floor(isFiniteNumber(rawMode?.tier, 1))),
    enemyCount: Math.max(1, Math.floor(isFiniteNumber(rawMode?.enemyCount, 3))),
    spawnCadenceSeconds: Math.max(0.3, isFiniteNumber(rawMode?.spawnCadenceSeconds, 8)),
    mapSize: {
      width: Math.max(8, Math.floor(mapWidth)),
      height: Math.max(8, Math.floor(mapHeight)),
    },
    specialRule: String(rawMode?.specialRule ?? 'none'),
    killTarget: Math.max(1, Math.floor(isFiniteNumber(rawMode?.killTarget, 12))),
    blitz: {
      startSeconds: Math.max(0, isFiniteNumber(rawMode?.blitz?.startSeconds, 0)),
      killBonusSeconds: Math.max(0, isFiniteNumber(rawMode?.blitz?.killBonusSeconds, 0)),
    },
  };
}

function normalizeChallengeData(rawData) {
  const sourceModes = Array.isArray(rawData?.modes) ? rawData.modes : [];
  const parsed = sourceModes.map(parseChallengeMode);

  if (parsed.length === 0) {
    return DEFAULT_CHALLENGE_DATA.modes.map(parseChallengeMode);
  }

  parsed.sort((a, b) => a.tier - b.tier);
  return parsed;
}

async function loadChallengeModes() {
  try {
    const response = await fetch('./challenge-modes.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return normalizeChallengeData(data);
  } catch (error) {
    console.warn('Failed to load challenge-modes.json; using defaults.', error);
    return normalizeChallengeData(DEFAULT_CHALLENGE_DATA);
  }
}

function computeChallengeMetrics(modes) {
  return modes.reduce(
    (acc, mode) => ({
      maxMapWidth: Math.max(acc.maxMapWidth, mode.mapSize.width),
      maxMapHeight: Math.max(acc.maxMapHeight, mode.mapSize.height),
    }),
    { maxMapWidth: 1, maxMapHeight: 1 },
  );
}

function getHighestModeTier() {
  return challengeModes.reduce((acc, mode) => Math.max(acc, mode.tier), 1);
}

function isChallengeUnlocked(mode) {
  return mode.tier <= unlockedTier;
}

function hasClearedMode(mode) {
  return clearedModeIds.has(mode.id);
}

function getUnlockRequirementText(mode) {
  if (isChallengeUnlocked(mode)) {
    return 'Ready to deploy.';
  }

  const requiredTier = Math.max(1, mode.tier - 1);
  const requiredMode = challengeModes.find((candidate) => candidate.tier === requiredTier);
  if (!requiredMode) {
    return `Clear previous challenge to unlock Tier ${mode.tier}.`;
  }

  return `Beat Challenge ${requiredMode.tier} to unlock.`;
}

function loadChallengeProgress() {
  unlockedTier = 1;
  clearedModeIds = new Set();

  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const parsedUnlockedTier = Math.floor(Number(parsed?.unlockedTier) || 1);
    unlockedTier = Math.max(1, parsedUnlockedTier);

    if (Array.isArray(parsed?.clearedModeIds)) {
      clearedModeIds = new Set(parsed.clearedModeIds.map((id) => String(id)));
    }
  } catch (error) {
    console.warn('Failed to load challenge progress; using defaults.', error);
    unlockedTier = 1;
    clearedModeIds = new Set();
  }
}

function saveChallengeProgress() {
  try {
    const payload = {
      unlockedTier,
      clearedModeIds: Array.from(clearedModeIds),
    };
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save challenge progress.', error);
  }
}

function unlockTier(tier) {
  const highestTier = getHighestModeTier();
  const nextTier = clamp(Math.floor(tier), 1, highestTier);

  if (nextTier <= unlockedTier) {
    return false;
  }

  unlockedTier = nextTier;
  saveChallengeProgress();
  return true;
}

function markChallengeCleared(mode) {
  if (!mode) return;

  clearedModeIds.add(mode.id);
  saveChallengeProgress();
}

function getSelectedChallengeMode() {
  const fallbackMode = challengeModes[0];
  if (!selectedChallengeId) return fallbackMode;
  return challengeModes.find((mode) => mode.id === selectedChallengeId) ?? fallbackMode;
}

function canLaunchSelectedChallenge() {
  const mode = getSelectedChallengeMode();
  return Boolean(mode && isChallengeUnlocked(mode));
}

function renderChallengeDetails(mode) {
  if (!mode) return;

  const unlocked = isChallengeUnlocked(mode);
  const cleared = hasClearedMode(mode);

  if (challengeStateBadgeEl) {
    challengeStateBadgeEl.className = `challenge-state ${unlocked ? (cleared ? 'cleared' : 'unlocked') : 'locked'}`;
    challengeStateBadgeEl.textContent = unlocked ? (cleared ? 'CLEARED' : 'UNLOCKED') : 'LOCKED';
  }

  if (challengeTitleEl) {
    challengeTitleEl.textContent = `Challenge ${mode.tier}: ${mode.name}`;
  }

  if (challengeRuleEl) {
    challengeRuleEl.textContent = describeRule(mode);
  }

  if (challengeMetaEl) {
    challengeMetaEl.textContent = `Target ${mode.killTarget} kills • Max enemies ${mode.enemyCount} • Spawn ${mode.spawnCadenceSeconds.toFixed(1)}s`;
  }

  if (challengeUnlockHintEl) {
    challengeUnlockHintEl.textContent = unlocked
      ? (cleared ? 'Completed. Replay anytime.' : 'Ready to launch.')
      : getUnlockRequirementText(mode);
  }

  if (modeLaunchBtn) {
    modeLaunchBtn.disabled = !unlocked;
    modeLaunchBtn.textContent = unlocked ? `LAUNCH CHALLENGE ${mode.tier}` : 'LOCKED';
    modeLaunchBtn.title = unlocked ? 'Launch selected challenge' : getUnlockRequirementText(mode);
  }
}

function renderChallengeCards() {
  if (!challengeCardsEl) return;

  challengeCardsEl.innerHTML = '';

  for (const mode of challengeModes) {
    const unlocked = isChallengeUnlocked(mode);
    const cleared = hasClearedMode(mode);
    const selected = mode.id === selectedChallengeId;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `challenge-card${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`;
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    card.dataset.modeId = mode.id;

    const state = unlocked ? (cleared ? 'CLEARED' : 'READY') : 'LOCKED';

    card.innerHTML = `
      <span class="challenge-tier">CH ${mode.tier}</span>
      <strong class="challenge-name">${mode.name}</strong>
      <span class="challenge-card-state">${state}</span>
    `;

    card.addEventListener('click', () => {
      selectedChallengeId = mode.id;
      renderLevelSelect();
    });

    challengeCardsEl.appendChild(card);
  }
}

function renderLevelSelect() {
  const mode = getSelectedChallengeMode();
  renderChallengeCards();
  renderChallengeDetails(mode);
}

function setupChallengeSelector() {
  loadChallengeProgress();

  if (challengeModes.length === 0) {
    selectedChallengeId = null;
    return;
  }

  const highestTier = getHighestModeTier();
  unlockedTier = clamp(unlockedTier, 1, highestTier);

  const initialMode = challengeModes.find((mode) => mode.tier === unlockedTier)
    ?? challengeModes.find((mode) => isChallengeUnlocked(mode))
    ?? challengeModes[0];

  selectedChallengeId = initialMode?.id ?? challengeModes[0]?.id ?? null;
  renderLevelSelect();
}

function computeArenaBoundsForMode(mode) {
  const widthRatio = mode.mapSize.width / challengeMetrics.maxMapWidth;
  const heightRatio = mode.mapSize.height / challengeMetrics.maxMapHeight;

  const playableWidth = W * clamp(widthRatio, 0.5, 1);
  const playableHeight = H * clamp(heightRatio, 0.5, 1);

  const left = (W - playableWidth) * 0.5 + 2;
  const top = (H - playableHeight) * 0.5 + 2;

  return {
    minX: left,
    minY: top,
    maxX: left + playableWidth - 4,
    maxY: top + playableHeight - 4,
  };
}

function buildDefaultArenaWalls(bounds) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const wallThickness = Math.max(10, Math.min(width, height) * 0.03);

  return [
    {
      x: bounds.minX + width * 0.28,
      y: bounds.minY + height * 0.18,
      w: wallThickness,
      h: height * 0.28,
    },
    {
      x: bounds.minX + width * 0.68,
      y: bounds.minY + height * 0.54,
      w: wallThickness,
      h: height * 0.28,
    },
    {
      x: bounds.minX + width * 0.42,
      y: bounds.minY + height * 0.68,
      w: width * 0.18,
      h: wallThickness,
    },
  ];
}

function configureChallengeMode(mode) {
  currentChallenge = mode;
  arenaBounds = computeArenaBoundsForMode(mode);

  arenaWallRects = mode.specialRule === 'no_walls'
    ? []
    : buildDefaultArenaWalls(arenaBounds);

  spawnDirector = {
    maxConcurrentEnemies: mode.enemyCount,
    spawnCadenceMs: mode.spawnCadenceSeconds * 1000,
    totalSpawned: 0,
    spawnBudget: mode.killTarget,
    nextSpawnAt: performance.now(),
  };

  killsThisRun = 0;
  blitzClockRemainingMs = mode.specialRule === 'blitz_clock'
    ? mode.blitz.startSeconds * 1000
    : 0;

  nextEnemyId = 1;
}

function primeEnemyWave() {
  const initialCount = Math.min(spawnDirector.maxConcurrentEnemies, spawnDirector.spawnBudget);

  for (let i = 0; i < initialCount; i++) {
    enemies.push(spawnEnemy(nextEnemyId++));
    spawnDirector.totalSpawned += 1;
  }

  spawnDirector.nextSpawnAt = performance.now() + spawnDirector.spawnCadenceMs;
}

function resetRound(selectedMode = getSelectedChallengeMode()) {
  configureChallengeMode(selectedMode);

  player = {
    x: (arenaBounds.minX + arenaBounds.maxX) * 0.5,
    y: arenaBounds.maxY - 48,
    angle: -Math.PI / 2,
    hp: PLAYER_MAX_HP,
  };

  clampEntityToArena(player, TANK_RADIUS);

  score = 0;
  bullets = [];
  enemies = [];
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

function describeRule(mode) {
  switch (mode.specialRule) {
    case 'no_walls':
      return 'Open Arena (interior walls removed)';
    case 'blitz_clock':
      return `Time Attack (${mode.blitz.startSeconds}s +${mode.blitz.killBonusSeconds}s/kill)`;
    case 'fast_spawn':
      return 'Overclocked Spawn Director';
    default:
      return 'Standard Rules';
  }
}

function showMainMenu(game) {
  const mode = getSelectedChallengeMode();
  resetRound(mode);
  renderLevelSelect();
  setPhaseLabel('MENU');
  showButtonState('menu');
  game.setState('waiting');

  const lockHint = isChallengeUnlocked(mode)
    ? 'Enter / Space / Play to start'
    : `${getUnlockRequirementText(mode)}\nSelect an unlocked challenge to deploy.`;

  game.showOverlay(
    'TANK ROYALE',
    `${mode.name}\n${describeRule(mode)}\n\nTarget: ${mode.killTarget} kills\nMax Enemies: ${mode.enemyCount} | Spawn: ${mode.spawnCadenceSeconds.toFixed(1)}s\nMap: ${mode.mapSize.width}x${mode.mapSize.height}\n\n${lockHint}`,
  );
}

function startRun(game) {
  const mode = getSelectedChallengeMode();
  if (!mode || !isChallengeUnlocked(mode)) {
    renderLevelSelect();
    return false;
  }

  resetRound(mode);
  setPhaseLabel('PLAY');
  showButtonState('play');
  game.setState('playing');
  return true;
}

function endRun(game, didWin, extraLine = '') {
  endResult = didWin ? 'WIN' : 'LOSE';
  setPhaseLabel(endResult);
  game.setState('over');
  showButtonState('over');

  const title = didWin ? 'VICTORY' : 'DEFEAT';
  const text = didWin
    ? `${currentChallenge.name} cleared!\nFinal score: ${score}`
    : `Your tank was destroyed.\nFinal score: ${score}`;

  const extra = extraLine ? `\n${extraLine}` : '';
  game.showOverlay(
    title,
    `${text}${extra}\nKills: ${killsThisRun}/${currentChallenge.killTarget}\n\nR / Enter: Restart\nM / Esc: Menu`,
  );
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

    const targetX = enemy.x + moveX * ENEMY_SPEED * step;
    const targetY = enemy.y + moveY * ENEMY_SPEED * step;
    moveWithWallCollision(enemy, targetX, targetY, ENEMY_RADIUS);

    tryShootEnemy(enemy, now);
  }
}

function onEnemyDestroyed(game) {
  killsThisRun += 1;
  score += 100;

  if (score > bestScore) {
    bestScore = score;
  }

  if (currentChallenge.specialRule === 'blitz_clock') {
    blitzClockRemainingMs += currentChallenge.blitz.killBonusSeconds * 1000;
  }

  updateHud();

  if (killsThisRun >= currentChallenge.killTarget) {
    const completedMode = currentChallenge;
    markChallengeCleared(completedMode);

    const unlockedNewTier = unlockTier(completedMode.tier + 1);
    if (unlockedNewTier) {
      const nextMode = challengeModes.find((mode) => mode.tier === completedMode.tier + 1);
      if (nextMode) {
        selectedChallengeId = nextMode.id;
      }
    }

    renderLevelSelect();

    const unlockLine = unlockedNewTier
      ? `Challenge ${Math.min(completedMode.tier + 1, getHighestModeTier())} unlocked!`
      : 'Challenge progress updated.';

    endRun(game, true, unlockLine);
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
    const outOfBounds = b.x < arenaBounds.minX - 10
      || b.x > arenaBounds.maxX + 10
      || b.y < arenaBounds.minY - 10
      || b.y > arenaBounds.maxY + 10;

    if (expired || outOfBounds) {
      bullets.splice(i, 1);
      continue;
    }

    if (isCircleCollidingWithWall(b.x, b.y, BULLET_RADIUS)) {
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
            onEnemyDestroyed(game);
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
    const started = startRun(game);
    if (!started) {
      const mode = getSelectedChallengeMode();
      if (mode) {
        game.showOverlay('CHALLENGE LOCKED', `${getUnlockRequirementText(mode)}\n\nPick an unlocked challenge to launch.`);
      }
    }
  }
}

function tryHandleOverInput(game, input) {
  if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed(' ')) {
    const started = startRun(game);
    if (!started) {
      const mode = getSelectedChallengeMode();
      if (mode) {
        game.showOverlay('CHALLENGE LOCKED', `${getUnlockRequirementText(mode)}\n\nPick an unlocked challenge to launch.`);
      }
    }
    return;
  }

  if (input.wasPressed('m') || input.wasPressed('M') || input.wasPressed('Escape')) {
    showMainMenu(game);
  }
}

function drawArena(renderer) {
  renderer.fillRect(0, 0, W, H, '#0d1224');

  renderer.drawLine(arenaBounds.minX, arenaBounds.minY, arenaBounds.maxX, arenaBounds.minY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.maxX, arenaBounds.minY, arenaBounds.maxX, arenaBounds.maxY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.maxX, arenaBounds.maxY, arenaBounds.minX, arenaBounds.maxY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.minX, arenaBounds.maxY, arenaBounds.minX, arenaBounds.minY, '#2a4f82', 2);

  const gridStepX = Math.max(24, (arenaBounds.maxX - arenaBounds.minX) / 16);
  const gridStepY = Math.max(24, (arenaBounds.maxY - arenaBounds.minY) / 10);

  for (let x = arenaBounds.minX + gridStepX; x < arenaBounds.maxX; x += gridStepX) {
    renderer.drawLine(x, arenaBounds.minY, x, arenaBounds.maxY, '#ffffff08', 1);
  }
  for (let y = arenaBounds.minY + gridStepY; y < arenaBounds.maxY; y += gridStepY) {
    renderer.drawLine(arenaBounds.minX, y, arenaBounds.maxX, y, '#ffffff08', 1);
  }

  for (const wall of arenaWallRects) {
    renderer.fillRect(wall.x, wall.y, wall.w, wall.h, '#254a72');
    renderer.drawLine(wall.x, wall.y, wall.x + wall.w, wall.y, '#5ea3df', 1);
    renderer.drawLine(wall.x, wall.y + wall.h, wall.x + wall.w, wall.y + wall.h, '#0f2741', 1);
  }
}

export async function createGame() {
  challengeModes = await loadChallengeModes();
  challengeMetrics = computeChallengeMetrics(challengeModes);
  setupChallengeSelector();

  const game = new Game('game');

  setupTouchControls();

  overlayPlayBtn?.addEventListener('click', () => {
    if (game.state === 'waiting') {
      const started = startRun(game);
      if (!started) {
        const mode = getSelectedChallengeMode();
        if (mode) {
          game.showOverlay('CHALLENGE LOCKED', `${getUnlockRequirementText(mode)}\n\nPick an unlocked challenge to launch.`);
        }
      }
    }
  });

  overlayRestartBtn?.addEventListener('click', () => {
    if (game.state === 'over') {
      const started = startRun(game);
      if (!started) {
        const mode = getSelectedChallengeMode();
        if (mode) {
          game.showOverlay('CHALLENGE LOCKED', `${getUnlockRequirementText(mode)}\n\nPick an unlocked challenge to launch.`);
        }
      }
    }
  });

  overlayMenuBtn?.addEventListener('click', () => {
    showMainMenu(game);
  });

  challengeCardsEl?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest('.challenge-card');
    if (!card) return;

    if (game.state === 'waiting') {
      showMainMenu(game);
    } else {
      renderLevelSelect();
    }
  });

  modeLaunchBtn?.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') {
      const started = startRun(game);
      if (!started) {
        const mode = getSelectedChallengeMode();
        if (mode) {
          game.showOverlay('CHALLENGE LOCKED', `${getUnlockRequirementText(mode)}\n\nPick an unlocked challenge to launch.`);
        }
      }
    }
  });

  game.onInit = () => {
    bestScore = Number(bestEl.textContent) || 0;
    resetRound(getSelectedChallengeMode());
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

    if (currentChallenge.specialRule === 'blitz_clock') {
      blitzClockRemainingMs -= dt;
      if (blitzClockRemainingMs <= 0) {
        blitzClockRemainingMs = 0;
        updateHud();
        endRun(game, false);
        return;
      }
    }

    const move = readMoveInput(input);
    if (move.mx !== 0 || move.my !== 0) {
      const len = Math.hypot(move.mx, move.my);
      const nx = move.mx / len;
      const ny = move.my / len;
      const scale = dt / (1000 / 60);

      const nextX = player.x + nx * TANK_SPEED * scale;
      const nextY = player.y + ny * TANK_SPEED * scale;
      moveWithWallCollision(player, nextX, nextY, TANK_RADIUS);
      player.angle = Math.atan2(ny, nx);
    }

    clampEntityToArena(player, TANK_RADIUS);

    const now = performance.now();
    if (shouldFire(input)) {
      tryShootPlayer(now);
    }

    updateEnemies(dt);
    updateBullets(dt, game);
    updateHud();
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
