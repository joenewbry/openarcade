import { Game } from '../engine/core.js';

const W = 960;
const H = 540;

const TANK_RADIUS = 18;
const TANK_SPEED = 3.0;
const FIRE_COOLDOWN_MS = 175;
const PLAYER_MAX_HP = 100;

const ENEMY_RADIUS = 16;
const ENEMY_MAX_HP = 55;
const ENEMY_BASE_SPEED = 1.65;
const ENEMY_FIRE_COOLDOWN_MS = 800;

const BULLET_SPEED = 8.2;
const BULLET_RADIUS = 3;
const BULLET_LIFE_MS = 1300;
const PLAYER_BULLET_DAMAGE = 25;
const ENEMY_BULLET_DAMAGE = 15;

const DEFAULT_MAP_PREVIEW = './assets/maps/default-map-preview.webp';
const STORAGE_SETTINGS_KEY = 'tankRoyale.settings.v1';
const STORAGE_LEVEL_KEY = 'tankRoyale.selectedLevel.v1';

const SETTINGS_DEFAULTS = {
  masterVolume: 80,
  musicVolume: 65,
  sfxVolume: 75,
  reducedMotion: false,
  cameraShake: true,
};

const LEVELS = [
  {
    id: 'dusty-depot',
    name: 'Dusty Depot',
    objective: 'Eliminate 4 enemy tanks.',
    recommended: 'Scout + Ricochet',
    reward: '120 XP + 30 Credits',
    enemyCount: 3,
    killTarget: 4,
    locked: false,
    lockReason: '',
  },
  {
    id: 'cobalt-canyon',
    name: 'Cobalt Canyon',
    objective: 'Eliminate 6 enemy tanks.',
    recommended: 'Balanced Medium Tank',
    reward: '190 XP + 45 Credits',
    enemyCount: 4,
    killTarget: 6,
    locked: false,
    lockReason: '',
  },
  {
    id: 'iron-bastion',
    name: 'Iron Bastion',
    objective: 'Eliminate 8 enemy tanks.',
    recommended: 'Heavy Armor + Cover Control',
    reward: '260 XP + 70 Credits',
    enemyCount: 5,
    killTarget: 8,
    locked: true,
    lockReason: 'Beat Cobalt Canyon to unlock.',
  },
];

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
let spawnCounter;
let levelProgress;

let appMode = 'menu'; // menu | playing | over
let activeMenuScreen = 'main-menu-screen';
let selectedLevelId = LEVELS[0].id;
let mainMenuLastFocusId = 'menuStartBtn';
let endResult = null;

let settings = { ...SETTINGS_DEFAULTS };
let settingsDraft = { ...SETTINGS_DEFAULTS };

let previewMissingDetected = false;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const enemiesEl = document.getElementById('enemies');
const phaseEl = document.getElementById('phase');
const levelLabelEl = document.getElementById('levelLabel');

const menuRootEl = document.getElementById('menu-root');
const toastEl = document.getElementById('toast');
const touchControlsEl = document.getElementById('touch-controls');

const menuStartBtn = document.getElementById('menuStartBtn');
const menuSettingsBtn = document.getElementById('menuSettingsBtn');
const menuLevelSelectBtn = document.getElementById('menuLevelSelectBtn');
const selectedLevelTextEl = document.getElementById('selectedLevelText');

const settingsApplyBtn = document.getElementById('settingsApplyBtn');
const settingsResetBtn = document.getElementById('settingsResetBtn');
const settingsBackBtn = document.getElementById('settingsBackBtn');

const masterVolumeEl = document.getElementById('masterVolume');
const musicVolumeEl = document.getElementById('musicVolume');
const sfxVolumeEl = document.getElementById('sfxVolume');
const reducedMotionEl = document.getElementById('reducedMotion');
const cameraShakeEl = document.getElementById('cameraShake');

const masterValueEl = document.getElementById('masterValue');
const musicValueEl = document.getElementById('musicValue');
const sfxValueEl = document.getElementById('sfxValue');

const levelCardListEl = document.getElementById('levelCardList');
const detailNameEl = document.getElementById('detailName');
const detailPreviewEl = document.getElementById('detailPreview');
const detailObjectiveEl = document.getElementById('detailObjective');
const detailLoadoutEl = document.getElementById('detailLoadout');
const detailRewardEl = document.getElementById('detailReward');
const detailStatusEl = document.getElementById('detailStatus');
const levelStartBtn = document.getElementById('levelStartBtn');
const levelBackBtn = document.getElementById('levelBackBtn');
const previewNoticeEl = document.getElementById('previewNotice');

const mainHeroPreviewEl = document.getElementById('mainHeroPreview');

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function currentLevel() {
  return LEVELS.find((l) => l.id === selectedLevelId) ?? LEVELS[0];
}

function showToast(message) {
  if (!toastEl) return;

  toastEl.textContent = message;
  toastEl.classList.add('show');

  window.setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1700);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };

    const parsed = JSON.parse(raw);
    return {
      masterVolume: clamp(Number(parsed.masterVolume) || SETTINGS_DEFAULTS.masterVolume, 0, 100),
      musicVolume: clamp(Number(parsed.musicVolume) || SETTINGS_DEFAULTS.musicVolume, 0, 100),
      sfxVolume: clamp(Number(parsed.sfxVolume) || SETTINGS_DEFAULTS.sfxVolume, 0, 100),
      reducedMotion: Boolean(parsed.reducedMotion),
      cameraShake: parsed.cameraShake !== false,
    };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

function saveSettings(nextSettings) {
  settings = { ...nextSettings };
  settingsDraft = { ...nextSettings };

  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // no-op when storage is unavailable.
  }
}

function applySettingsToUI() {
  masterVolumeEl.value = String(settingsDraft.masterVolume);
  musicVolumeEl.value = String(settingsDraft.musicVolume);
  sfxVolumeEl.value = String(settingsDraft.sfxVolume);
  reducedMotionEl.checked = settingsDraft.reducedMotion;
  cameraShakeEl.checked = settingsDraft.cameraShake;

  masterValueEl.textContent = String(settingsDraft.masterVolume);
  musicValueEl.textContent = String(settingsDraft.musicVolume);
  sfxValueEl.textContent = String(settingsDraft.sfxVolume);
}

function syncSettingsDraftFromUI() {
  settingsDraft = {
    masterVolume: clamp(Number(masterVolumeEl.value) || 0, 0, 100),
    musicVolume: clamp(Number(musicVolumeEl.value) || 0, 0, 100),
    sfxVolume: clamp(Number(sfxVolumeEl.value) || 0, 0, 100),
    reducedMotion: Boolean(reducedMotionEl.checked),
    cameraShake: Boolean(cameraShakeEl.checked),
  };

  masterValueEl.textContent = String(settingsDraft.masterVolume);
  musicValueEl.textContent = String(settingsDraft.musicVolume);
  sfxValueEl.textContent = String(settingsDraft.sfxVolume);
}

function loadSelectedLevel() {
  try {
    const saved = localStorage.getItem(STORAGE_LEVEL_KEY);
    if (!saved) return LEVELS[0].id;

    if (LEVELS.some((l) => l.id === saved)) return saved;
    return LEVELS[0].id;
  } catch {
    return LEVELS[0].id;
  }
}

function saveSelectedLevel(id) {
  try {
    localStorage.setItem(STORAGE_LEVEL_KEY, id);
  } catch {
    // no-op
  }
}

function setPhaseLabel(value) {
  phaseEl.textContent = value;
}

function updateHud() {
  const level = currentLevel();
  const remaining = Math.max(0, (levelProgress?.killTarget ?? level.killTarget) - (levelProgress?.kills ?? 0));

  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  hpEl.textContent = String(Math.max(0, Math.ceil(player?.hp ?? PLAYER_MAX_HP)));
  enemiesEl.textContent = `${enemies.length}/${remaining}`;
  levelLabelEl.textContent = level.name;
  selectedLevelTextEl.textContent = `Selected: ${level.name}`;
}

function randomSpawn() {
  return {
    x: 80 + Math.random() * (W - 160),
    y: 80 + Math.random() * (H - 240),
  };
}

function ensureSpawnAwayFromPlayer(spawn, minDist = 140) {
  let attempts = 0;
  while (attempts < 30) {
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
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    nextStrafeAt: 0,
    lastShotAt: -9999,
  };
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
    damage,
    bornAt: performance.now(),
  });
}

function tryShootPlayer(now) {
  if (now - lastPlayerShotAt < FIRE_COOLDOWN_MS) return;

  const tipX = player.x + Math.cos(player.angle) * (TANK_RADIUS + 12);
  const tipY = player.y + Math.sin(player.angle) * (TANK_RADIUS + 12);

  pushBullet('player', tipX, tipY, player.angle, PLAYER_BULLET_DAMAGE);
  lastPlayerShotAt = now;
}

function tryShootEnemy(enemy, now) {
  if (now - enemy.lastShotAt < ENEMY_FIRE_COOLDOWN_MS + enemy.id * 45) return;

  const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (dist > 360) return;

  const tipX = enemy.x + Math.cos(enemy.angle) * (ENEMY_RADIUS + 10);
  const tipY = enemy.y + Math.sin(enemy.angle) * (ENEMY_RADIUS + 10);

  pushBullet('enemy', tipX, tipY, enemy.angle, ENEMY_BULLET_DAMAGE);
  enemy.lastShotAt = now;
}

function drawTank(renderer, tank, palette) {
  const c = Math.cos(tank.angle);
  const s = Math.sin(tank.angle);

  const bodyW = 18;
  const bodyH = 12;
  const corners = [
    { x: -bodyW, y: -bodyH },
    { x: bodyW, y: -bodyH },
    { x: bodyW, y: bodyH },
    { x: -bodyW, y: bodyH },
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
    x: tank.x + (14) * c - treadOffset * s,
    y: tank.y + (14) * s + treadOffset * c,
  };
  const treadD = {
    x: tank.x + (-14) * c - treadOffset * s,
    y: tank.y + (-14) * s + treadOffset * c,
  };

  renderer.drawLine(treadA.x, treadA.y, treadB.x, treadB.y, palette.tread, 4);
  renderer.drawLine(treadD.x, treadD.y, treadC.x, treadC.y, palette.tread, 4);

  renderer.fillCircle(tank.x, tank.y, 9, palette.turret);
  renderer.drawLine(
    tank.x,
    tank.y,
    tank.x + c * (TANK_RADIUS + 13),
    tank.y + s * (TANK_RADIUS + 13),
    palette.barrel,
    5,
  );
}

function drawHpBar(renderer, entity, maxHp, color, yOffset) {
  const width = 34;
  const ratio = clamp(entity.hp / maxHp, 0, 1);
  const x = entity.x - width * 0.5;
  const y = entity.y + yOffset;

  renderer.fillRect(x, y, width, 4, '#00000099');
  renderer.fillRect(x, y, width * ratio, 4, color);
}

function resetRound(level) {
  player = {
    x: W * 0.5,
    y: H * 0.82,
    angle: -Math.PI / 2,
    hp: PLAYER_MAX_HP,
  };

  bullets = [];
  enemies = [];
  spawnCounter = 0;
  levelProgress = {
    kills: 0,
    killTarget: level.killTarget,
  };

  const firstWave = Math.min(level.enemyCount, level.killTarget);
  for (let i = 0; i < firstWave; i++) {
    spawnCounter += 1;
    enemies.push(spawnEnemy(spawnCounter));
  }

  score = 0;
  lastPlayerShotAt = -9999;
  endResult = null;
  updateHud();
}

function spawnReplacementEnemyIfNeeded(level) {
  if (spawnCounter >= level.killTarget) return;

  spawnCounter += 1;
  enemies.push(spawnEnemy(spawnCounter));
}

function updateEnemies(dt) {
  const level = currentLevel();
  const step = dt / (1000 / 60);
  const now = performance.now();
  const speedScale = 1 + (level.enemyCount - 3) * 0.06;

  for (const enemy of enemies) {
    const toPlayerX = player.x - enemy.x;
    const toPlayerY = player.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    enemy.angle = Math.atan2(toPlayerY, toPlayerX);

    if (now >= enemy.nextStrafeAt) {
      enemy.strafeDir *= -1;
      enemy.nextStrafeAt = now + 530 + Math.random() * 460;
    }

    let moveX = 0;
    let moveY = 0;

    if (dist > 180) {
      moveX = Math.cos(enemy.angle);
      moveY = Math.sin(enemy.angle);
    } else if (dist < 110) {
      moveX = -Math.cos(enemy.angle);
      moveY = -Math.sin(enemy.angle);
    } else {
      moveX = Math.cos(enemy.angle + (Math.PI / 2) * enemy.strafeDir);
      moveY = Math.sin(enemy.angle + (Math.PI / 2) * enemy.strafeDir);
    }

    enemy.x += moveX * ENEMY_BASE_SPEED * speedScale * step;
    enemy.y += moveY * ENEMY_BASE_SPEED * speedScale * step;
    enemy.x = clamp(enemy.x, ENEMY_RADIUS + 2, W - ENEMY_RADIUS - 2);
    enemy.y = clamp(enemy.y, ENEMY_RADIUS + 2, H - ENEMY_RADIUS - 2);

    tryShootEnemy(enemy, now);
  }
}

function endRun(game, didWin) {
  appMode = 'over';
  endResult = didWin ? 'WIN' : 'LOSE';
  setPhaseLabel(endResult);

  game.setState('over');
  touchControlsEl.classList.add('hidden');

  const title = didWin ? 'MISSION COMPLETE' : 'MISSION FAILED';
  const level = currentLevel();
  const text = didWin
    ? `${level.name} cleared.\nFinal score: ${score}\n\nPress Enter/R to restart, or M/Esc for menu.`
    : `Your tank was destroyed.\nFinal score: ${score}\n\nPress Enter/R to retry, or M/Esc for menu.`;

  game.showOverlay(title, text);
}

function updateBullets(dt, game) {
  const now = performance.now();
  const step = dt / (1000 / 60);
  const level = currentLevel();

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
            levelProgress.kills += 1;
            score += 100;
            if (score > bestScore) bestScore = score;
            spawnReplacementEnemyIfNeeded(level);
          }

          updateHud();

          const allKillsDone = levelProgress.kills >= level.killTarget;
          if (allKillsDone && enemies.length === 0) {
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
      }
    }
  }
}

function drawArena(renderer) {
  renderer.fillRect(0, 0, W, H, '#0f1724');

  renderer.drawLine(2, 2, W - 2, 2, '#2f4f77', 2);
  renderer.drawLine(W - 2, 2, W - 2, H - 2, '#2f4f77', 2);
  renderer.drawLine(W - 2, H - 2, 2, H - 2, '#2f4f77', 2);
  renderer.drawLine(2, H - 2, 2, 2, '#2f4f77', 2);

  for (let x = 40; x < W; x += 40) {
    renderer.drawLine(x, 0, x, H, '#ffffff07', 1);
  }
  for (let y = 40; y < H; y += 40) {
    renderer.drawLine(0, y, W, y, '#ffffff07', 1);
  }

  // Light dunes/ridges inspired by cartoon tank pack silhouette language.
  for (let i = 0; i < 5; i++) {
    const y = H - 90 + i * 26;
    renderer.fillRect(0, y, W, 14, i % 2 === 0 ? '#25374d66' : '#1d2a3a66');
  }
}

function drawMenuBackdrop(renderer, now) {
  drawArena(renderer);

  const drift = settings.reducedMotion ? 0 : Math.sin(now * 0.0006) * 5;

  const blueGhost = {
    x: W * 0.26 + drift,
    y: H * 0.65,
    angle: -Math.PI / 6,
  };
  const greenGhost = {
    x: W * 0.74 - drift,
    y: H * 0.54,
    angle: Math.PI * 1.1,
  };

  drawTank(renderer, blueGhost, {
    body: '#3f8cff77',
    tread: '#1d3a5a99',
    turret: '#7ec0ff77',
    barrel: '#d6f0ff88',
  });
  drawTank(renderer, greenGhost, {
    body: '#57b95e77',
    tread: '#25552a99',
    turret: '#a0ed9b77',
    barrel: '#ebffe788',
  });

  renderer.fillRect(0, 0, W, H, '#0b101580');
}

function setPreviewMissingNotice(isMissing) {
  if (previewNoticeEl) {
    previewNoticeEl.textContent = isMissing
      ? 'Default map preview missing; using placeholder visuals.'
      : '';
  }
}

function applyPreviewImage(imgEl) {
  if (!imgEl) return;

  imgEl.classList.remove('preview-missing');
  imgEl.src = DEFAULT_MAP_PREVIEW;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.removeAttribute('src');
    imgEl.classList.add('preview-missing');
    previewMissingDetected = true;
    setPreviewMissingNotice(true);
  };
  imgEl.onload = () => {
    if (!previewMissingDetected) {
      setPreviewMissingNotice(false);
    }
  };
}

function updateLevelDetails() {
  const level = currentLevel();

  detailNameEl.textContent = level.name;
  detailObjectiveEl.textContent = level.objective;
  detailLoadoutEl.textContent = level.recommended;
  detailRewardEl.textContent = level.reward;
  detailStatusEl.textContent = level.locked ? `Locked — ${level.lockReason}` : 'Unlocked';

  levelStartBtn.disabled = level.locked;
  levelStartBtn.textContent = level.locked ? 'LOCKED' : 'START MATCH';
  applyPreviewImage(detailPreviewEl);

  updateHud();
}

function setSelectedLevel(id) {
  if (!LEVELS.some((l) => l.id === id)) return;

  selectedLevelId = id;
  saveSelectedLevel(id);

  renderLevelCards();
  updateLevelDetails();
}

function renderLevelCards() {
  if (!levelCardListEl) return;

  levelCardListEl.innerHTML = '';

  for (const level of LEVELS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card${level.id === selectedLevelId ? ' selected' : ''}${level.locked ? ' locked' : ''}`;

    const img = document.createElement('img');
    img.alt = `${level.name} preview`;
    applyPreviewImage(img);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <span class="name">${level.name}</span>
      <span class="status">${level.locked ? `Locked · ${level.lockReason}` : 'Unlocked'}</span>
      <span class="status">Objective: ${level.killTarget} takedowns</span>
    `;

    card.append(img, meta);
    card.addEventListener('click', () => {
      setSelectedLevel(level.id);
      if (level.locked) showToast(level.lockReason);
    });

    levelCardListEl.appendChild(card);
  }
}

function setActiveMenuScreen(screenId) {
  activeMenuScreen = screenId;

  document.querySelectorAll('.menu-screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });

  if (screenId === 'main-menu-screen') {
    const focusTarget = document.getElementById(mainMenuLastFocusId) ?? menuStartBtn;
    focusTarget?.focus();
  }
}

function openMenu(screenId = 'main-menu-screen') {
  appMode = 'menu';
  endResult = null;

  setPhaseLabel('MENU');
  gameRef.setState('waiting');
  gameRef.hideOverlay();

  menuRootEl.classList.remove('hidden');
  touchControlsEl.classList.add('hidden');

  setActiveMenuScreen(screenId);
  updateLevelDetails();
}

function startMatch() {
  const level = currentLevel();

  if (level.locked) {
    showToast(level.lockReason || 'Level is locked.');
    setActiveMenuScreen('level-select-screen');
    return;
  }

  resetRound(level);

  appMode = 'playing';
  menuRootEl.classList.add('hidden');
  touchControlsEl.classList.remove('hidden');

  setPhaseLabel('PLAY');
  gameRef.setState('playing');
}

function handleMenuControls() {
  menuStartBtn?.addEventListener('click', () => {
    mainMenuLastFocusId = 'menuStartBtn';
    startMatch();
  });

  menuSettingsBtn?.addEventListener('click', () => {
    mainMenuLastFocusId = 'menuSettingsBtn';
    setActiveMenuScreen('settings-screen');
  });

  menuLevelSelectBtn?.addEventListener('click', () => {
    mainMenuLastFocusId = 'menuLevelSelectBtn';
    setActiveMenuScreen('level-select-screen');
  });

  levelBackBtn?.addEventListener('click', () => {
    setActiveMenuScreen('main-menu-screen');
  });

  levelStartBtn?.addEventListener('click', () => {
    startMatch();
  });

  settingsApplyBtn?.addEventListener('click', () => {
    syncSettingsDraftFromUI();
    saveSettings(settingsDraft);
    showToast('Settings saved');
    setActiveMenuScreen('main-menu-screen');
  });

  settingsResetBtn?.addEventListener('click', () => {
    settingsDraft = { ...SETTINGS_DEFAULTS };
    applySettingsToUI();
    showToast('Settings reset');
  });

  settingsBackBtn?.addEventListener('click', () => {
    settingsDraft = { ...settings };
    applySettingsToUI();
    setActiveMenuScreen('main-menu-screen');
  });

  [masterVolumeEl, musicVolumeEl, sfxVolumeEl, reducedMotionEl, cameraShakeEl].forEach((el) => {
    el?.addEventListener('input', syncSettingsDraftFromUI);
    el?.addEventListener('change', syncSettingsDraftFromUI);
  });
}

function tryHandleOverInput(game, input) {
  if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed(' ')) {
    startMatch();
    return;
  }

  if (input.wasPressed('m') || input.wasPressed('M') || input.wasPressed('Escape')) {
    openMenu('main-menu-screen');
  }
}

let gameRef = null;

export function createGame() {
  const game = new Game('game');
  gameRef = game;

  setupTouchControls();
  handleMenuControls();

  game.onInit = () => {
    bestScore = Number(bestEl.textContent) || 0;
    settings = loadSettings();
    settingsDraft = { ...settings };
    applySettingsToUI();

    selectedLevelId = loadSelectedLevel();

    applyPreviewImage(mainHeroPreviewEl);
    renderLevelCards();
    updateLevelDetails();

    resetRound(currentLevel());
    game.setScoreFn(() => score);
    openMenu('main-menu-screen');
  };

  game.onUpdate = (dt) => {
    const input = game.input;

    if (appMode === 'menu') {
      if (input.wasPressed('Escape')) {
        setActiveMenuScreen('main-menu-screen');
      }
      if (input.wasPressed('l') || input.wasPressed('L')) {
        setActiveMenuScreen('level-select-screen');
      }
      if (input.wasPressed('o') || input.wasPressed('O')) {
        setActiveMenuScreen('settings-screen');
      }
      return;
    }

    if (appMode === 'over') {
      tryHandleOverInput(game, input);
      return;
    }

    if (appMode !== 'playing') return;

    if (input.wasPressed('Escape') || input.wasPressed('m') || input.wasPressed('M')) {
      openMenu('main-menu-screen');
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

    if (shouldFire(input)) {
      tryShootPlayer(performance.now());
    }

    updateEnemies(dt);
    updateBullets(dt, game);
  };

  game.onDraw = (renderer, text) => {
    const now = performance.now();

    if (appMode === 'menu') {
      drawMenuBackdrop(renderer, now);
      text.drawText('MAIN MENU: START / SETTINGS / LEVEL SELECT', 16, 22, 12, '#a9daff', 'left');
      text.drawText('Quick keys: O Settings, L Level Select', W - 16, 22, 11, '#88badf', 'right');
      return;
    }

    drawArena(renderer);

    for (const enemy of enemies) {
      drawTank(renderer, enemy, {
        body: '#e35a5a',
        tread: '#702831',
        turret: '#ff9ca1',
        barrel: '#ffe5e8',
      });
      drawHpBar(renderer, enemy, ENEMY_MAX_HP, '#ff8393', 22);
    }

    drawTank(renderer, player, {
      body: '#3f8cff',
      tread: '#1f446a',
      turret: '#92d2ff',
      barrel: '#dcf3ff',
    });
    drawHpBar(renderer, player, PLAYER_MAX_HP, '#63d3ff', 22);

    for (const b of bullets) {
      const glow = b.shooter === 'player' ? '#ffc857' : '#ff8e8e';
      const fill = b.shooter === 'player' ? '#ffedb4' : '#ffe0e0';
      renderer.setGlow(glow, settings.reducedMotion ? 0.18 : 0.35);
      renderer.fillCircle(b.x, b.y, BULLET_RADIUS, fill);
      renderer.setGlow(null);
    }

    text.drawText('MOVE: WASD / ARROWS / TOUCH D-PAD', 12, 18, 11, '#9fcbf2', 'left');
    text.drawText('SHOOT: SPACE / TOUCH FIRE', 12, 32, 11, '#9fcbf2', 'left');
    text.drawText('MENU: ESC / M', W - 12, 18, 11, '#9fcbf2', 'right');
  };

  game.start();
  return game;
}
