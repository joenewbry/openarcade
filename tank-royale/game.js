import { Game } from '../engine/core.js';

const W = 720;
const H = 420;

const TANK_RADIUS = 17;
const TANK_SPEED = 2.9;
const FIRE_COOLDOWN_MS = 170;
const PLAYER_MAX_HP = 100;
const RAPID_FIRE_MULTIPLIER = 0.55;
const RAPID_FIRE_DURATION_MS = 6500;

const ENEMY_RADIUS = 16;
const ENEMY_MAX_HP = 55;
const ENEMY_SPEED = 1.6;
const ENEMY_FIRE_COOLDOWN_MS = 760;

const BULLET_SPEED = 7.4;
const BULLET_RADIUS = 3;
const BULLET_LIFE_MS = 1250;
const PLAYER_BULLET_DAMAGE = 25;
const ENEMY_BULLET_DAMAGE = 15;

const MAP_LAYOUT_PATH = './default-map-layout.json';
const SPRITE_KEYS = {
  floor: 'tr-map-floor',
  wall: 'tr-map-wall',
  destructible: 'tr-map-destructible',
  pickup: 'tr-map-pickup',
};

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

const FALLBACK_MAP_LAYOUT = {
  metadata: {
    sourcePack: 'Cartoon Tank Pack',
    sourceMap: 'Default Arena',
    topology: 'Mirrored three-lane arena with center choke and flank breakables',
  },
  designGrid: { width: 22, height: 22 },
  assets: {
    floor: [
      './assets/cartoon-tank-pack/maps/default/floor.png',
      './assets/cartoon-tank-pack/maps/default/ground.png',
    ],
    wall: [
      './assets/cartoon-tank-pack/maps/default/wall.png',
      './assets/cartoon-tank-pack/props/wall_straight.png',
    ],
    destructible: [
      './assets/cartoon-tank-pack/props/destructible_crate.png',
      './assets/cartoon-tank-pack/props/destructible_wall.png',
    ],
    pickup: [
      './assets/cartoon-tank-pack/pickups/pickup_crate.png',
      './assets/cartoon-tank-pack/pickups/pickup_orb.png',
    ],
  },
  layout: {
    walls: [
      { x: 6.15, y: 4.2, w: 0.9, h: 6.2 },
      { x: 14.95, y: 11.5, w: 0.9, h: 6.2 },
      { x: 9.3, y: 14.8, w: 3.45, h: 0.9 },
    ],
    destructibles: [
      { x: 8.15, y: 6.2, w: 1.1, h: 1.1, hp: 45 },
      { x: 12.75, y: 6.2, w: 1.1, h: 1.1, hp: 45 },
      { x: 9.95, y: 9.35, w: 1.1, h: 1.1, hp: 40 },
      { x: 10.95, y: 9.35, w: 1.1, h: 1.1, hp: 40 },
      { x: 6.1, y: 12.6, w: 1.1, h: 1.1, hp: 35 },
      { x: 14.8, y: 8.2, w: 1.1, h: 1.1, hp: 35 },
    ],
    pickupSpawnPoints: [
      {
        x: 11,
        y: 10.95,
        kind: 'rapid_fire',
        radius: 0.5,
        respawnSeconds: 12,
        initialSpawnDelaySeconds: 3,
      },
      {
        x: 4.2,
        y: 5,
        kind: 'health',
        radius: 0.48,
        respawnSeconds: 11,
        initialSpawnDelaySeconds: 5,
      },
      {
        x: 17.8,
        y: 16.9,
        kind: 'health',
        radius: 0.48,
        respawnSeconds: 11,
        initialSpawnDelaySeconds: 7,
      },
      {
        x: 11,
        y: 17.45,
        kind: 'score_bonus',
        radius: 0.5,
        respawnSeconds: 13,
        initialSpawnDelaySeconds: 9,
      },
    ],
  },
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

let defaultMapLayout = FALLBACK_MAP_LAYOUT;
let mapLayoutMetadata = {
  source: 'fallback',
  usedFallback: true,
  sourcePack: 'Cartoon Tank Pack',
  sourceMap: 'Default Arena',
};
let mapAssetUsage = {
  floor: null,
  wall: null,
  destructible: null,
  pickup: null,
};

let arenaBounds = { minX: 2, minY: 2, maxX: W - 2, maxY: H - 2 };
let arenaWallRects = [];
let destructibleBlocks = [];
let pickupSpawnPoints = [];
let activePickups = [];
let nextPickupId = 1;

let blitzClockRemainingMs = 0;
let playerRapidFireUntilMs = 0;

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

const modeSelectEl = document.getElementById('challengeModeSelect');
const modeLaunchBtn = document.getElementById('challengeLaunch');

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

function normalizeMapRect(rawRect, fallbackHp = null) {
  const x = isFiniteNumber(rawRect?.x, 0);
  const y = isFiniteNumber(rawRect?.y, 0);
  const w = Math.max(0.25, isFiniteNumber(rawRect?.w, 1));
  const h = Math.max(0.25, isFiniteNumber(rawRect?.h, 1));
  const hp = fallbackHp === null
    ? null
    : Math.max(1, isFiniteNumber(rawRect?.hp, fallbackHp));

  return { x, y, w, h, hp };
}

function normalizePickupSpawn(rawSpawn) {
  return {
    x: isFiniteNumber(rawSpawn?.x, 11),
    y: isFiniteNumber(rawSpawn?.y, 11),
    kind: String(rawSpawn?.kind ?? 'health'),
    radius: Math.max(0.2, isFiniteNumber(rawSpawn?.radius, 0.45)),
    respawnSeconds: Math.max(2, isFiniteNumber(rawSpawn?.respawnSeconds, 12)),
    initialSpawnDelaySeconds: Math.max(0, isFiniteNumber(rawSpawn?.initialSpawnDelaySeconds, 4)),
    lifetimeSeconds: Math.max(4, isFiniteNumber(rawSpawn?.lifetimeSeconds, 12)),
  };
}

function normalizeMapLayout(rawLayout) {
  const designGrid = {
    width: Math.max(8, Math.floor(isFiniteNumber(rawLayout?.designGrid?.width, 22))),
    height: Math.max(8, Math.floor(isFiniteNumber(rawLayout?.designGrid?.height, 22))),
  };

  const rawWalls = Array.isArray(rawLayout?.layout?.walls) ? rawLayout.layout.walls : [];
  const rawDestructibles = Array.isArray(rawLayout?.layout?.destructibles) ? rawLayout.layout.destructibles : [];
  const rawSpawns = Array.isArray(rawLayout?.layout?.pickupSpawnPoints) ? rawLayout.layout.pickupSpawnPoints : [];

  const walls = rawWalls.map((wall) => normalizeMapRect(wall));
  const destructibles = rawDestructibles.map((block) => normalizeMapRect(block, 40));
  const pickupSpawnPoints = rawSpawns.map((spawn) => normalizePickupSpawn(spawn));

  return {
    metadata: {
      sourcePack: String(rawLayout?.metadata?.sourcePack ?? 'Cartoon Tank Pack'),
      sourceMap: String(rawLayout?.metadata?.sourceMap ?? 'Default Arena'),
      topology: String(rawLayout?.metadata?.topology ?? 'Unknown topology'),
    },
    designGrid,
    assets: {
      floor: Array.isArray(rawLayout?.assets?.floor) ? rawLayout.assets.floor.map(String) : [],
      wall: Array.isArray(rawLayout?.assets?.wall) ? rawLayout.assets.wall.map(String) : [],
      destructible: Array.isArray(rawLayout?.assets?.destructible) ? rawLayout.assets.destructible.map(String) : [],
      pickup: Array.isArray(rawLayout?.assets?.pickup) ? rawLayout.assets.pickup.map(String) : [],
    },
    layout: {
      walls,
      destructibles,
      pickupSpawnPoints,
    },
  };
}

async function loadDefaultMapLayout() {
  try {
    const response = await fetch(MAP_LAYOUT_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawLayout = await response.json();
    const normalized = normalizeMapLayout(rawLayout);

    mapLayoutMetadata = {
      source: MAP_LAYOUT_PATH,
      usedFallback: false,
      sourcePack: normalized.metadata.sourcePack,
      sourceMap: normalized.metadata.sourceMap,
    };

    return normalized;
  } catch (error) {
    console.warn('Failed to load default-map-layout.json; using in-code fallback topology.', error);

    const fallback = normalizeMapLayout(FALLBACK_MAP_LAYOUT);
    mapLayoutMetadata = {
      source: 'in-code fallback topology',
      usedFallback: true,
      sourcePack: fallback.metadata.sourcePack,
      sourceMap: fallback.metadata.sourceMap,
    };

    return fallback;
  }
}

function projectGridRectToArena(rect, grid, bounds) {
  const arenaWidth = bounds.maxX - bounds.minX;
  const arenaHeight = bounds.maxY - bounds.minY;

  return {
    x: bounds.minX + (rect.x / grid.width) * arenaWidth,
    y: bounds.minY + (rect.y / grid.height) * arenaHeight,
    w: Math.max(8, (rect.w / grid.width) * arenaWidth),
    h: Math.max(8, (rect.h / grid.height) * arenaHeight),
    hp: rect.hp,
  };
}

function projectGridPointToArena(point, grid, bounds) {
  const arenaWidth = bounds.maxX - bounds.minX;
  const arenaHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(arenaWidth / grid.width, arenaHeight / grid.height);

  return {
    x: bounds.minX + (point.x / grid.width) * arenaWidth,
    y: bounds.minY + (point.y / grid.height) * arenaHeight,
    radius: Math.max(7, point.radius * scale),
    kind: point.kind,
    respawnMs: point.respawnSeconds * 1000,
    initialSpawnDelayMs: point.initialSpawnDelaySeconds * 1000,
    lifetimeMs: point.lifetimeSeconds * 1000,
  };
}

function projectMapLayoutToArena(layout, bounds) {
  const grid = layout.designGrid;

  const walls = layout.layout.walls.map((wall) => projectGridRectToArena(wall, grid, bounds));
  const destructibles = layout.layout.destructibles.map((block, index) => {
    const projected = projectGridRectToArena(block, grid, bounds);
    return {
      id: `block-${index + 1}`,
      ...projected,
      maxHp: block.hp,
      hp: block.hp,
    };
  });

  const pickupSpawns = layout.layout.pickupSpawnPoints.map((point, index) => ({
    id: `spawn-${index + 1}`,
    ...projectGridPointToArena(point, grid, bounds),
    nextSpawnAt: performance.now() + point.initialSpawnDelaySeconds * 1000,
  }));

  return { walls, destructibles, pickupSpawns };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image load failed: ${url}`));
    image.src = url;
  });
}

async function tryLoadSprite(renderer, spriteKey, candidatePaths) {
  for (const path of candidatePaths) {
    try {
      const image = await loadImage(path);
      renderer.loadSpriteTexture(spriteKey, image);
      return path;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

async function loadOptionalMapSprites(renderer, layout) {
  const usage = {
    floor: null,
    wall: null,
    destructible: null,
    pickup: null,
  };

  usage.floor = await tryLoadSprite(renderer, SPRITE_KEYS.floor, layout.assets.floor);
  usage.wall = await tryLoadSprite(renderer, SPRITE_KEYS.wall, layout.assets.wall);
  usage.destructible = await tryLoadSprite(renderer, SPRITE_KEYS.destructible, layout.assets.destructible);
  usage.pickup = await tryLoadSprite(renderer, SPRITE_KEYS.pickup, layout.assets.pickup);

  return usage;
}

function isCircleCollidingWithWall(cx, cy, radius, options = {}) {
  const includeDestructibles = options.includeDestructibles !== false;

  for (const wall of arenaWallRects) {
    if (circleIntersectsRect(cx, cy, radius, wall)) {
      return true;
    }
  }

  if (includeDestructibles) {
    for (const block of destructibleBlocks) {
      if (block.hp > 0 && circleIntersectsRect(cx, cy, radius, block)) {
        return true;
      }
    }
  }

  return false;
}

function getDestructibleHit(cx, cy, radius) {
  for (const block of destructibleBlocks) {
    if (block.hp > 0 && circleIntersectsRect(cx, cy, radius, block)) {
      return block;
    }
  }
  return null;
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
    return;
  }

  const rapidFireRemainingMs = playerRapidFireUntilMs - performance.now();
  if (rapidFireRemainingMs > 0) {
    timerEl.textContent = `RF ${Math.max(1, Math.ceil(rapidFireRemainingMs / 1000))}s`;
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

function syncSelectedChallengeIdFromUI() {
  if (modeSelectEl?.value) {
    selectedChallengeId = modeSelectEl.value;
  }
}

function getSelectedChallengeMode() {
  syncSelectedChallengeIdFromUI();
  const fallbackMode = challengeModes[0];
  if (!selectedChallengeId) return fallbackMode;
  return challengeModes.find((mode) => mode.id === selectedChallengeId) ?? fallbackMode;
}

function setupChallengeSelector() {
  if (!modeSelectEl) {
    selectedChallengeId = challengeModes[0]?.id ?? null;
    return;
  }

  modeSelectEl.innerHTML = '';
  for (const mode of challengeModes) {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = `Tier ${mode.tier} - ${mode.name}`;
    modeSelectEl.appendChild(option);
  }

  selectedChallengeId = challengeModes[0]?.id ?? null;
  modeSelectEl.value = selectedChallengeId;

  modeSelectEl.addEventListener('change', () => {
    selectedChallengeId = modeSelectEl.value;
  });
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

function configureChallengeMode(mode) {
  currentChallenge = mode;
  arenaBounds = computeArenaBoundsForMode(mode);

  const projectedLayout = projectMapLayoutToArena(defaultMapLayout, arenaBounds);

  arenaWallRects = mode.specialRule === 'no_walls'
    ? []
    : projectedLayout.walls;

  destructibleBlocks = mode.specialRule === 'no_walls'
    ? []
    : projectedLayout.destructibles;

  pickupSpawnPoints = projectedLayout.pickupSpawns;
  activePickups = [];
  nextPickupId = 1;

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

  playerRapidFireUntilMs = 0;
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

function getPlayerFireCooldown(now) {
  return now < playerRapidFireUntilMs
    ? FIRE_COOLDOWN_MS * RAPID_FIRE_MULTIPLIER
    : FIRE_COOLDOWN_MS;
}

function tryShootPlayer(now) {
  if (now - lastPlayerShotAt < getPlayerFireCooldown(now)) return;

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
  setPhaseLabel('MENU');
  showButtonState('menu');
  game.setState('waiting');

  const assetMode = mapAssetUsage.floor || mapAssetUsage.wall || mapAssetUsage.destructible || mapAssetUsage.pickup
    ? 'Asset map visuals loaded'
    : 'Fallback visual rendering (asset files not found)';

  game.showOverlay(
    'TANK ROYALE',
    `${mode.name}\n${describeRule(mode)}\n\nMap: ${mapLayoutMetadata.sourcePack} / ${mapLayoutMetadata.sourceMap}\n${assetMode}\n\nTarget: ${mode.killTarget} kills\nMax Enemies: ${mode.enemyCount} | Spawn: ${mode.spawnCadenceSeconds.toFixed(1)}s\nMap Size: ${mode.mapSize.width}x${mode.mapSize.height}\n\nEnter / Space / Play to start`,
  );
}

function startRun(game) {
  resetRound(getSelectedChallengeMode());
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
    ? `${currentChallenge.name} cleared!\nFinal score: ${score}`
    : `Your tank was destroyed.\nFinal score: ${score}`;

  game.showOverlay(
    title,
    `${text}\nKills: ${killsThisRun}/${currentChallenge.killTarget}\n\nR / Enter: Restart\nM / Esc: Menu`,
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
    endRun(game, true);
  }
}

function applyDamageToDestructible(block, incomingDamage, shooter) {
  const scale = shooter === 'enemy' ? 0.55 : 1;
  const damage = Math.max(4, incomingDamage * scale);

  block.hp -= damage;
  if (block.hp > 0) {
    return false;
  }

  block.hp = 0;

  if (shooter === 'player') {
    score += 30;
    if (score > bestScore) {
      bestScore = score;
    }
  }

  return true;
}

function getPickupSpawnById(spawnId) {
  return pickupSpawnPoints.find((spawn) => spawn.id === spawnId) ?? null;
}

function spawnPickupAtPoint(spawnPoint, now) {
  const pickup = {
    id: `pickup-${nextPickupId++}`,
    spawnId: spawnPoint.id,
    x: spawnPoint.x,
    y: spawnPoint.y,
    radius: spawnPoint.radius,
    kind: spawnPoint.kind,
    expiresAt: now + spawnPoint.lifetimeMs,
  };

  activePickups.push(pickup);
}

function updatePickupSpawns(now) {
  for (let i = activePickups.length - 1; i >= 0; i--) {
    const pickup = activePickups[i];
    if (now <= pickup.expiresAt) {
      continue;
    }

    activePickups.splice(i, 1);
    const spawn = getPickupSpawnById(pickup.spawnId);
    if (spawn) {
      spawn.nextSpawnAt = now + spawn.respawnMs;
    }
  }

  for (const spawn of pickupSpawnPoints) {
    const hasActivePickup = activePickups.some((pickup) => pickup.spawnId === spawn.id);
    if (hasActivePickup || now < spawn.nextSpawnAt) {
      continue;
    }

    spawnPickupAtPoint(spawn, now);
    spawn.nextSpawnAt = now + spawn.respawnMs;
  }
}

function applyPickupEffect(pickup, now) {
  if (pickup.kind === 'health') {
    player.hp = Math.min(PLAYER_MAX_HP, player.hp + 30);
    return;
  }

  if (pickup.kind === 'rapid_fire') {
    playerRapidFireUntilMs = Math.max(playerRapidFireUntilMs, now + RAPID_FIRE_DURATION_MS);
    return;
  }

  if (pickup.kind === 'score_bonus') {
    score += 160;
    if (score > bestScore) {
      bestScore = score;
    }
    return;
  }

  score += 100;
}

function updatePickupCollection(now) {
  for (let i = activePickups.length - 1; i >= 0; i--) {
    const pickup = activePickups[i];
    const d = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    if (d > TANK_RADIUS + pickup.radius) {
      continue;
    }

    activePickups.splice(i, 1);
    applyPickupEffect(pickup, now);

    const spawn = getPickupSpawnById(pickup.spawnId);
    if (spawn) {
      spawn.nextSpawnAt = now + spawn.respawnMs;
    }
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

    const hitBlock = getDestructibleHit(b.x, b.y, BULLET_RADIUS);
    if (hitBlock) {
      applyDamageToDestructible(hitBlock, b.damage, b.shooter);
      bullets.splice(i, 1);
      continue;
    }

    if (isCircleCollidingWithWall(b.x, b.y, BULLET_RADIUS, { includeDestructibles: false })) {
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

function drawPickupSpawner(renderer, spawn, now) {
  const pulse = 0.25 + 0.2 * Math.sin(now * 0.005 + spawn.x * 0.03 + spawn.y * 0.02);
  renderer.setGlow('#77ceff', pulse);
  renderer.fillCircle(spawn.x, spawn.y, spawn.radius + 2, '#1a3552');
  renderer.setGlow(null);
  renderer.drawLine(spawn.x - spawn.radius, spawn.y, spawn.x + spawn.radius, spawn.y, '#67bfff', 1);
  renderer.drawLine(spawn.x, spawn.y - spawn.radius, spawn.x, spawn.y + spawn.radius, '#67bfff', 1);
}

function drawPickup(renderer, pickup, now) {
  const size = pickup.radius * 2.2;
  const x = pickup.x - size * 0.5;
  const y = pickup.y - size * 0.5;

  if (renderer.hasSpriteTexture(SPRITE_KEYS.pickup)) {
    renderer.drawSprite(SPRITE_KEYS.pickup, x, y, size, size, 1);
    return;
  }

  const pulse = 0.3 + 0.22 * Math.sin(now * 0.008 + pickup.x * 0.02 + pickup.y * 0.015);
  const color = pickup.kind === 'health'
    ? '#7ff58a'
    : pickup.kind === 'rapid_fire'
      ? '#ffd66f'
      : '#ff9bca';

  renderer.setGlow(color, pulse);
  renderer.fillCircle(pickup.x, pickup.y, pickup.radius, color);
  renderer.setGlow(null);
}

function drawDestructibleBlock(renderer, block) {
  if (block.hp <= 0) {
    return;
  }

  const hpRatio = clamp(block.hp / block.maxHp, 0, 1);

  if (renderer.hasSpriteTexture(SPRITE_KEYS.destructible)) {
    renderer.drawSprite(SPRITE_KEYS.destructible, block.x, block.y, block.w, block.h, 0.5 + 0.5 * hpRatio);
    return;
  }

  const damaged = hpRatio < 0.65;
  renderer.fillRect(block.x, block.y, block.w, block.h, damaged ? '#a35f5f' : '#bc7d63');
  renderer.drawLine(block.x, block.y, block.x + block.w, block.y, '#ffd0a8', 1);
  renderer.drawLine(block.x, block.y + block.h, block.x + block.w, block.y + block.h, '#5a2d2d', 1);

  if (hpRatio < 0.98) {
    const crackCount = Math.max(1, Math.floor((1 - hpRatio) * 4));
    for (let i = 0; i < crackCount; i++) {
      const frac = (i + 1) / (crackCount + 1);
      const sx = block.x + block.w * frac;
      renderer.drawLine(
        sx,
        block.y + block.h * 0.15,
        sx - block.w * 0.12,
        block.y + block.h * 0.82,
        '#4a2c2c',
        1,
      );
    }
  }
}

function drawArena(renderer) {
  renderer.fillRect(0, 0, W, H, '#0d1224');

  const arenaWidth = arenaBounds.maxX - arenaBounds.minX;
  const arenaHeight = arenaBounds.maxY - arenaBounds.minY;

  if (renderer.hasSpriteTexture(SPRITE_KEYS.floor)) {
    renderer.drawSprite(SPRITE_KEYS.floor, arenaBounds.minX, arenaBounds.minY, arenaWidth, arenaHeight, 0.95);
  } else {
    renderer.fillRect(arenaBounds.minX, arenaBounds.minY, arenaWidth, arenaHeight, '#101d35');
  }

  renderer.drawLine(arenaBounds.minX, arenaBounds.minY, arenaBounds.maxX, arenaBounds.minY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.maxX, arenaBounds.minY, arenaBounds.maxX, arenaBounds.maxY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.maxX, arenaBounds.maxY, arenaBounds.minX, arenaBounds.maxY, '#2a4f82', 2);
  renderer.drawLine(arenaBounds.minX, arenaBounds.maxY, arenaBounds.minX, arenaBounds.minY, '#2a4f82', 2);

  const gridStepX = Math.max(24, arenaWidth / 16);
  const gridStepY = Math.max(24, arenaHeight / 10);

  for (let x = arenaBounds.minX + gridStepX; x < arenaBounds.maxX; x += gridStepX) {
    renderer.drawLine(x, arenaBounds.minY, x, arenaBounds.maxY, '#ffffff08', 1);
  }
  for (let y = arenaBounds.minY + gridStepY; y < arenaBounds.maxY; y += gridStepY) {
    renderer.drawLine(arenaBounds.minX, y, arenaBounds.maxX, y, '#ffffff08', 1);
  }

  for (const wall of arenaWallRects) {
    if (renderer.hasSpriteTexture(SPRITE_KEYS.wall)) {
      renderer.drawSprite(SPRITE_KEYS.wall, wall.x, wall.y, wall.w, wall.h, 1);
    } else {
      renderer.fillRect(wall.x, wall.y, wall.w, wall.h, '#254a72');
      renderer.drawLine(wall.x, wall.y, wall.x + wall.w, wall.y, '#5ea3df', 1);
      renderer.drawLine(wall.x, wall.y + wall.h, wall.x + wall.w, wall.y + wall.h, '#0f2741', 1);
    }
  }

  for (const block of destructibleBlocks) {
    drawDestructibleBlock(renderer, block);
  }

  const now = performance.now();
  for (const spawn of pickupSpawnPoints) {
    drawPickupSpawner(renderer, spawn, now);
  }
  for (const pickup of activePickups) {
    drawPickup(renderer, pickup, now);
  }
}

export async function createGame() {
  const [loadedChallengeModes, loadedMapLayout] = await Promise.all([
    loadChallengeModes(),
    loadDefaultMapLayout(),
  ]);

  challengeModes = loadedChallengeModes;
  challengeMetrics = computeChallengeMetrics(challengeModes);
  defaultMapLayout = loadedMapLayout;

  setupChallengeSelector();

  const game = new Game('game');
  mapAssetUsage = await loadOptionalMapSprites(game.renderer, defaultMapLayout);

  console.info('Tank Royale default map integration', {
    mapSource: mapLayoutMetadata,
    assetUsage: mapAssetUsage,
  });

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

  modeLaunchBtn?.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') {
      startRun(game);
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

    updatePickupSpawns(now);
    updatePickupCollection(now);

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
