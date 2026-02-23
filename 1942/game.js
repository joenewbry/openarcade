// 1942/game.js — 1942 game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 640;

// Theme
const THEME = '#6db';

// Player constants
const PW = 32, PH = 36;
const PLAYER_SPEED = 4;
const FIRE_RATE = 8;
const ROLL_DURATION = 40;
const ROLL_COOLDOWN = 90;
const DOUBLE_TAP_WINDOW = 15;

// Bullet constants
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 3;

// Parallax ground scroll
const SCROLL_SPEED = 1.5;

// ── Procedural Audio System ──
class SynthSFX {
  constructor() {
    this.ctx = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _osc(freq, type, duration, gainVal, detune) {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(gainVal || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  _noise(duration, gainVal) {
    const ctx = this._ensureCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  machineGun() {
    this._osc(2200, 'square', 0.015, 0.08);
  }

  explosion() {
    this._noise(0.1, 0.2);
    this._osc(120, 'sine', 0.1, 0.12);
  }

  bossExplosion() {
    const ctx = this._ensureCtx();
    this._noise(0.4, 0.3);
    this._osc(80, 'sine', 0.4, 0.15);
    setTimeout(() => { this._noise(0.2, 0.2); }, 100);
    setTimeout(() => { this._osc(60, 'sine', 0.3, 0.1); }, 200);
  }

  rollWhoosh() {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  powerupCollect() {
    this._osc(600, 'sine', 0.08, 0.12);
    setTimeout(() => { this._osc(900, 'sine', 0.1, 0.12); }, 60);
  }

  playerHit() {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  waveComplete() {
    this._osc(440, 'triangle', 0.12, 0.1);
    setTimeout(() => { this._osc(554, 'triangle', 0.12, 0.1); }, 100);
    setTimeout(() => { this._osc(660, 'triangle', 0.18, 0.12); }, 200);
  }

  bossWarning() {
    const ctx = this._ensureCtx();
    for (let i = 0; i < 4; i++) {
      const freq = i % 2 === 0 ? 120 : 160;
      const t = ctx.currentTime + i * 0.125;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  gameOver() {
    this._osc(500, 'triangle', 0.18, 0.12);
    setTimeout(() => { this._osc(400, 'triangle', 0.18, 0.12); }, 160);
    setTimeout(() => { this._osc(280, 'triangle', 0.3, 0.1); }, 320);
  }
}

const sfx = new SynthSFX();

// ── State ──
let score, best = 0;
let player, bullets, enemies, enemyBullets, powerUps, particles, explosions;
let tick, fireCooldown;
let lives;
let waveTimer, waveNumber, waveEnemiesLeft;
let bossActive, bossSpawnScore;
let scrollOffset;
let lastSpaceDown, rollCooldownTimer, rollingTimer;
let doubleShot, doubleShotTimer;
let speedBoost, speedBoostTimer;
let groundTiles = [];

// Screen shake state
let shakeAmount = 0;
let shakeTimer = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;

// Boss warning state
let bossWarningTimer = 0;

// Wave text state
let waveTextTimer = 0;
let waveTextNumber = 0;

// Engine exhaust particles
let exhaustParticles = [];

// Roll afterimage state
let rollTrail = []; // stores [{x, y, alpha}]

// Clouds for parallax
let clouds = [];

// Debris particles (tumbling rectangles from enemy deaths)
let debrisParticles = [];

// Bullet counter for sfx throttle
let bulletsFired = 0;

// Propeller animation
let propellerAngle = 0;

// Invincibility after respawn
let invincibleTimer = 0;

// Particle cap
const MAX_PARTICLES = 250;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

function triggerShake(amount, duration) {
  shakeAmount = Math.max(shakeAmount, amount);
  shakeTimer = Math.max(shakeTimer, duration);
}

function initGround() {
  groundTiles = [];
  for (let i = 0; i < 30; i++) {
    groundTiles.push({
      x: Math.random() * W,
      y: Math.random() * H * 2 - H,
      w: 20 + Math.random() * 60,
      h: 15 + Math.random() * 40,
      type: Math.random() < 0.3 ? 'island' : 'wave',
      shade: Math.random() * 0.3
    });
  }
}

function initClouds() {
  clouds = [];
  // Far layer (slower, more transparent, smaller)
  for (let i = 0; i < 4; i++) {
    clouds.push({
      x: Math.random() * W,
      y: Math.random() * H * 2 - H,
      w: 30 + Math.random() * 50,
      h: 10 + Math.random() * 15,
      speed: 0.15 + Math.random() * 0.2,
      alpha: 0.03 + Math.random() * 0.03,
      layer: 0
    });
  }
  // Near layer (faster, slightly more visible, larger)
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * W,
      y: Math.random() * H * 2 - H,
      w: 40 + Math.random() * 80,
      h: 16 + Math.random() * 24,
      speed: 0.3 + Math.random() * 0.4,
      alpha: 0.06 + Math.random() * 0.06,
      layer: 1
    });
  }
}

// ── Enemy spawning ──
function spawnEnemy(type, x, y, pattern) {
  const e = {
    type: type,
    x: x, y: y,
    w: 28, h: 24,
    hp: 1,
    speed: 2,
    points: 10,
    pattern: pattern || 'straight',
    patternPhase: Math.random() * Math.PI * 2,
    patternTimer: 0,
    fireTimer: 60 + Math.floor(Math.random() * 120),
    fireRate: 120,
    alive: true
  };

  switch (type) {
    case 'fighter':
      e.hp = 1; e.speed = 2.5; e.points = 10; e.w = 26; e.h = 22;
      e.fireRate = 150;
      break;
    case 'bomber':
      e.hp = 2; e.speed = 1.5; e.points = 20; e.w = 32; e.h = 28;
      e.fireRate = 80;
      break;
    case 'ace':
      e.hp = 2; e.speed = 3; e.points = 30; e.w = 24; e.h = 20;
      e.fireRate = 100;
      break;
    case 'boss':
      e.hp = 25 + waveNumber * 5; e.maxHp = e.hp;
      e.speed = 1; e.points = 200; e.w = 72; e.h = 56;
      e.fireRate = 40; e.fireTimer = 20;
      e.pattern = 'boss';
      break;
  }

  enemies.push(e);
  return e;
}

// ── Wave spawning ──
function spawnWave() {
  waveNumber++;

  // Wave transition text
  waveTextTimer = 90;
  waveTextNumber = waveNumber;
  sfx.waveComplete();

  const diff = Math.min(waveNumber, 20);

  if (score >= bossSpawnScore && !bossActive) {
    bossActive = true;
    spawnEnemy('boss', W / 2 - 36, -60, 'boss');
    bossSpawnScore += 400 + waveNumber * 50;
    // Boss entrance effects
    triggerShake(5, 30);
    bossWarningTimer = 90;
    sfx.bossWarning();
    return;
  }

  const formations = ['v', 'line', 'stagger', 'circle', 'diagonal', 'funnel', 'pincer', 'cascade'];
  const formation = formations[waveNumber % formations.length];
  const count = 4 + Math.min(Math.floor(diff / 2), 6);
  const types = ['fighter'];
  if (diff >= 3) types.push('bomber');
  if (diff >= 6) types.push('ace');

  const baseSpeed = 1.5 + diff * 0.1;

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let ex, ey, pattern;

    switch (formation) {
      case 'v':
        ex = W / 2 - (count / 2 - i) * 44;
        ey = -40 - Math.abs(count / 2 - i) * 30;
        pattern = 'straight';
        break;
      case 'line':
        ex = (W / (count + 1)) * (i + 1) - 14;
        ey = -40 - i * 8;
        pattern = 'straight';
        break;
      case 'stagger':
        ex = 40 + (i % 2 === 0 ? i * 50 : W - 80 - i * 30);
        ey = -40 - i * 25;
        pattern = 'sine';
        break;
      case 'circle':
        ex = W / 2 + Math.cos(i / count * Math.PI * 2) * 120 - 14;
        ey = -60 - Math.sin(i / count * Math.PI * 2) * 60 - 60;
        pattern = 'sine';
        break;
      case 'diagonal':
        ex = i % 2 === 0 ? -30 : W + 30;
        ey = -40 - i * 30;
        pattern = i % 2 === 0 ? 'swoopRight' : 'swoopLeft';
        break;
      case 'funnel':
        // Enemies start wide and funnel to center
        ex = (i % 2 === 0) ? 20 + i * 15 : W - 20 - i * 15;
        ey = -40 - i * 20;
        pattern = 'sine';
        break;
      case 'pincer':
        // Two groups from left and right
        if (i < count / 2) {
          ex = -30;
          ey = -40 - i * 30;
          pattern = 'swoopRight';
        } else {
          ex = W + 30;
          ey = -40 - (i - Math.floor(count / 2)) * 30;
          pattern = 'swoopLeft';
        }
        break;
      case 'cascade':
        // Staggered diagonal waterfall
        ex = 30 + (i * 60) % (W - 60);
        ey = -40 - i * 40;
        pattern = 'straight';
        break;
    }

    const e = spawnEnemy(type, ex, ey, pattern);
    e.speed = baseSpeed + Math.random() * 0.5;
    e.fireRate = Math.max(40, 150 - diff * 8);
  }

  waveEnemiesLeft = count;
}

// ── Power-up spawning ──
function spawnPowerUp(x, y) {
  if (Math.random() > 0.15) return;
  const types = ['doubleShot', 'speedBoost'];
  powerUps.push({
    x: x, y: y,
    type: types[Math.floor(Math.random() * types.length)],
    w: 20, h: 20,
    speed: 1.5
  });
}

// ── Particles & Explosions ──
function spawnParticles(x, y, count, color) {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x: x, y: y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 15,
      color: color
    });
  }
}

function spawnDebris(x, y, count, color) {
  if (debrisParticles.length >= 60) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.8 + Math.random() * 2.5;
    debrisParticles.push({
      x: x, y: y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      w: 3 + Math.random() * 5,
      h: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      color: color
    });
  }
}

function spawnExplosion(x, y, count) {
  explosions.push({ x: x, y: y, life: 20, maxLife: 20, size: count * 2 });
  spawnParticles(x, y, count, '#f84');
}

function spawnEnhancedExplosion(x, y, count, color) {
  // Standard explosion
  explosions.push({ x: x, y: y, life: 20, maxLife: 20, size: count * 2 });
  // More particles (10-12)
  spawnParticles(x, y, Math.max(count, 10), '#f84');
  // Debris in enemy color
  spawnDebris(x, y, Math.floor(count * 0.6), color || '#f84');
}

function fireBullet() {
  const cx = player.x + PW / 2;
  const cy = player.y;
  if (doubleShot) {
    bullets.push({ x: cx - 8, y: cy });
    bullets.push({ x: cx + 8, y: cy });
  } else {
    bullets.push({ x: cx, y: cy });
  }
  bulletsFired++;
  // Throttle sfx to every 3rd bullet
  if (bulletsFired % 3 === 1) {
    sfx.machineGun();
  }
}

let _game; // reference to game instance for hitPlayer/gameOver

function hitPlayer() {
  lives--;
  livesEl.textContent = lives;
  spawnExplosion(player.x + PW / 2, player.y + PH / 2, 12);
  // Death debris
  spawnDebris(player.x + PW / 2, player.y + PH / 2, 8, THEME);
  triggerShake(3, 10);
  sfx.playerHit();
  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    sfx.gameOver();
    _game.showOverlay('GAME OVER', `Score: ${score} — Press SPACE to restart`);
    _game.setState('over');
  } else {
    rollingTimer = 30;
    invincibleTimer = 90; // 1.5 seconds of invincibility
    player.y = H - 80;
  }
}

function startRoll() {
  if (rollCooldownTimer > 0 || rollingTimer > 0) return;
  rollingTimer = ROLL_DURATION;
  rollCooldownTimer = ROLL_COOLDOWN;
  triggerShake(1, ROLL_DURATION);
  sfx.rollWhoosh();
  // Initialize roll trail
  rollTrail = [];
}

// ── Engine exhaust ──
function emitExhaust() {
  if (exhaustParticles.length >= 40) return;
  const cx = player.x + PW / 2;
  const cy = player.y + PH;
  const count = speedBoost ? 3 : 1;
  const baseColor = speedBoost ? '#48f' : '#f84';
  for (let i = 0; i < count; i++) {
    exhaustParticles.push({
      x: cx + (Math.random() - 0.5) * 6,
      y: cy - 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1 + Math.random() * 1.5,
      life: 8 + Math.floor(Math.random() * 5),
      color: baseColor
    });
  }
}

// ── Export ──
export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    lives = 3;
    tick = 0;
    fireCooldown = 0;
    waveTimer = 0;
    waveNumber = 0;
    waveEnemiesLeft = 0;
    bossActive = false;
    bossSpawnScore = 300;
    scrollOffset = 0;
    lastSpaceDown = -999;
    rollCooldownTimer = 0;
    rollingTimer = 0;
    doubleShot = false;
    doubleShotTimer = 0;
    speedBoost = false;
    speedBoostTimer = 0;
    shakeAmount = 0;
    shakeTimer = 0;
    shakeOffsetX = 0;
    shakeOffsetY = 0;
    bossWarningTimer = 0;
    waveTextTimer = 0;
    waveTextNumber = 0;
    bulletsFired = 0;
    propellerAngle = 0;
    invincibleTimer = 0;
    rollTrail = [];
    exhaustParticles = [];
    debrisParticles = [];

    player = { x: W / 2 - PW / 2, y: H - 80 };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    powerUps = [];
    particles = [];
    explosions = [];

    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    initGround();
    initClouds();
    game.showOverlay('1942', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── State transitions ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
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

    // ── Playing state ──
    tick++;
    scrollOffset = (scrollOffset + SCROLL_SPEED) % (H * 2);
    propellerAngle += 0.6; // fast propeller spin

    // Cooldowns
    if (fireCooldown > 0) fireCooldown--;
    if (rollCooldownTimer > 0) rollCooldownTimer--;
    if (rollingTimer > 0) rollingTimer--;
    if (doubleShotTimer > 0) {
      doubleShotTimer--;
      if (doubleShotTimer <= 0) doubleShot = false;
    }
    if (speedBoostTimer > 0) {
      speedBoostTimer--;
      if (speedBoostTimer <= 0) speedBoost = false;
    }
    if (invincibleTimer > 0) invincibleTimer--;

    // Screen shake update
    if (shakeTimer > 0) {
      shakeTimer--;
      shakeOffsetX = (Math.random() - 0.5) * 2 * shakeAmount;
      shakeOffsetY = (Math.random() - 0.5) * 2 * shakeAmount;
      if (shakeTimer <= 0) {
        shakeAmount = 0;
        shakeOffsetX = 0;
        shakeOffsetY = 0;
      }
    }

    // Boss warning timer
    if (bossWarningTimer > 0) bossWarningTimer--;

    // Wave text timer
    if (waveTextTimer > 0) waveTextTimer--;

    // Player movement
    const spd = speedBoost ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    if (input.isDown('ArrowLeft')) player.x -= spd;
    if (input.isDown('ArrowRight')) player.x += spd;
    if (input.isDown('ArrowUp')) player.y -= spd;
    if (input.isDown('ArrowDown')) player.y += spd;
    player.x = Math.max(0, Math.min(W - PW, player.x));
    player.y = Math.max(H * 0.3, Math.min(H - PH - 10, player.y));

    // Shift triggers roll
    if (input.wasPressed('Shift')) {
      startRoll();
    }

    // Double-tap space triggers roll
    if (input.wasPressed(' ')) {
      if (tick - lastSpaceDown < DOUBLE_TAP_WINDOW) {
        startRoll();
      }
      lastSpaceDown = tick;
    }

    // Auto-fire while holding space
    if (input.isDown(' ') && fireCooldown <= 0 && rollingTimer <= 0) {
      fireBullet();
      fireCooldown = FIRE_RATE;
    }

    // Roll trail: store previous positions
    if (rollingTimer > 0) {
      rollTrail.unshift({ x: player.x, y: player.y });
      if (rollTrail.length > 3) rollTrail.length = 3;
    } else {
      rollTrail = [];
    }

    // Engine exhaust
    if (game.state === 'playing' && rollingTimer <= 0) {
      emitExhaust();
    }

    // Update exhaust particles
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
      const ep = exhaustParticles[i];
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.life--;
      if (ep.life <= 0) exhaustParticles.splice(i, 1);
    }

    // Update debris particles
    for (let i = debrisParticles.length - 1; i >= 0; i--) {
      const d = debrisParticles[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.04; // slight gravity
      d.rotation += d.rotSpeed;
      d.life--;
      if (d.life <= 0) debrisParticles.splice(i, 1);
    }

    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) bullets.splice(i, 1);
    }

    // Wave spawning
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) {
      waveTimer++;
      if (waveTimer > 60) {
        waveTimer = 0;
        bossActive = false;
        spawnWave();
      }
    }

    // Enemy update
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) { enemies.splice(i, 1); continue; }

      e.patternTimer++;

      // Movement patterns
      switch (e.pattern) {
        case 'straight':
          e.y += e.speed;
          break;
        case 'sine':
          e.y += e.speed;
          e.x += Math.sin(e.patternTimer * 0.04 + e.patternPhase) * 2;
          break;
        case 'swoopRight':
          e.x += e.speed * 1.2;
          e.y += e.speed * 0.8;
          break;
        case 'swoopLeft':
          e.x -= e.speed * 1.2;
          e.y += e.speed * 0.8;
          break;
        case 'boss':
          if (e.y < 60) {
            e.y += e.speed;
          } else {
            e.x += Math.sin(e.patternTimer * 0.02) * 2;
            e.y = 60 + Math.sin(e.patternTimer * 0.015) * 20;
          }
          e.x = Math.max(10, Math.min(W - e.w - 10, e.x));
          break;
      }

      // Enemy firing
      e.fireTimer--;
      if (e.fireTimer <= 0 && e.y > 0 && e.y < H * 0.7) {
        e.fireTimer = e.fireRate + Math.floor(Math.random() * 30);
        const bx = e.x + e.w / 2;
        const by = e.y + e.h;

        if (e.type === 'boss') {
          for (let a = -1; a <= 1; a++) {
            enemyBullets.push({
              x: bx + a * 20, y: by,
              vx: a * 1.5,
              vy: ENEMY_BULLET_SPEED + waveNumber * 0.1
            });
          }
          const dx = (player.x + PW / 2) - bx;
          const dy = (player.y + PH / 2) - by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const spd2 = ENEMY_BULLET_SPEED + 0.5;
          enemyBullets.push({ x: bx, y: by, vx: dx / dist * spd2, vy: dy / dist * spd2 });
        } else {
          const dx = (player.x + PW / 2) - bx;
          const dy = (player.y + PH / 2) - by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const aim = 0.3;
          const espd = ENEMY_BULLET_SPEED + waveNumber * 0.05;
          enemyBullets.push({
            x: bx, y: by,
            vx: dx / dist * espd * aim,
            vy: espd
          });
        }
      }

      // Off-screen removal
      if (e.y > H + 40 || e.x < -60 || e.x > W + 60) {
        enemies.splice(i, 1);
        continue;
      }

      // Bullet-enemy collision
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          bullets.splice(j, 1);
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            score += e.points;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            // Enhanced death effects
            const isBoss = e.type === 'boss';
            const deathCount = isBoss ? 20 : 10;
            const enemyColor = e.type === 'fighter' ? '#f55' :
                               e.type === 'bomber' ? '#e80' :
                               e.type === 'ace' ? '#f4f' : '#f44';
            spawnEnhancedExplosion(e.x + e.w / 2, e.y + e.h / 2, deathCount, enemyColor);
            if (isBoss) {
              triggerShake(5, 30);
              sfx.bossExplosion();
            } else {
              triggerShake(1, 3);
              sfx.explosion();
            }
            spawnPowerUp(e.x + e.w / 2, e.y + e.h / 2);
          } else {
            spawnParticles(b.x, b.y, 3, '#fff');
          }
          break;
        }
      }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Boss bullet trails
      if (b.vx !== undefined && Math.abs(b.vx) > 1) {
        if (tick % 3 === 0 && particles.length < MAX_PARTICLES) {
          particles.push({
            x: b.x, y: b.y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            life: 6 + Math.random() * 4,
            color: '#f44'
          });
        }
      }

      if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }

      // Hit player (not while rolling or invincible)
      if (rollingTimer <= 0 && invincibleTimer <= 0) {
        if (b.x >= player.x + 4 && b.x <= player.x + PW - 4 &&
            b.y >= player.y + 4 && b.y <= player.y + PH - 4) {
          enemyBullets.splice(i, 1);
          hitPlayer();
          break;
        }
      }
    }

    // Enemy-player collision (not while rolling or invincible)
    if (rollingTimer <= 0 && invincibleTimer <= 0) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (player.x + 4 < e.x + e.w && player.x + PW - 4 > e.x &&
            player.y + 4 < e.y + e.h && player.y + PH - 4 > e.y) {
          e.alive = false;
          score += e.points;
          scoreEl.textContent = score;
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, 8);
          hitPlayer();
          break;
        }
      }
    }

    // Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.y += p.speed;
      if (p.y > H + 20) { powerUps.splice(i, 1); continue; }

      if (player.x < p.x + p.w && player.x + PW > p.x &&
          player.y < p.y + p.h && player.y + PH > p.y) {
        if (p.type === 'doubleShot') {
          doubleShot = true;
          doubleShotTimer = 600;
        } else if (p.type === 'speedBoost') {
          speedBoost = true;
          speedBoostTimer = 480;
        }
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 6, THEME);
        sfx.powerupCollect();
        powerUps.splice(i, 1);
      }
    }

    // Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life--;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Clouds scroll
    for (const c of clouds) {
      c.y += c.speed;
      if (c.y > H + c.h) {
        c.y = -c.h - Math.random() * 100;
        c.x = Math.random() * W;
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Apply screen shake offset to all drawing
    const sx = shakeOffsetX;
    const sy = shakeOffsetY;

    // Ocean background — color shifts with danger level
    const dangerT = Math.min(waveNumber / 20, 1);
    const oceanR = Math.round(10 + dangerT * 20);
    const oceanG = Math.round(22 - dangerT * 8);
    const oceanB = Math.round(40 + dangerT * 15);
    renderer.fillRect(0 + sx, 0 + sy, W, H, `rgb(${oceanR},${oceanG},${oceanB})`);

    // Animated ocean ripple lines
    for (let i = 0; i < 10; i++) {
      const baseY = (i / 10) * H;
      const rippleY = baseY + Math.sin(tick * 0.02 + i * 1.3) * 8;
      const alpha = 0.08 + Math.sin(tick * 0.015 + i * 0.7) * 0.03;
      const rippleColor = `rgba(60,100,140,${alpha.toFixed(3)})`;
      // Wavy line: draw as several segments
      const segs = 16;
      for (let s = 0; s < segs; s++) {
        const x1 = (s / segs) * W;
        const x2 = ((s + 1) / segs) * W;
        const y1 = rippleY + Math.sin(tick * 0.03 + s * 0.5 + i) * 3;
        const y2 = rippleY + Math.sin(tick * 0.03 + (s + 1) * 0.5 + i) * 3;
        renderer.drawLine(x1 + sx, y1 + sy, x2 + sx, y2 + sy, rippleColor, 1);
      }
    }

    // Parallax clouds
    clouds.forEach(c => {
      const cloudColor = `rgba(180,200,220,${c.alpha.toFixed(3)})`;
      // Draw cloud as overlapping ellipse approximations
      const pts = [];
      const segs = 12;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pts.push({ x: c.x + Math.cos(a) * (c.w / 2) + sx, y: c.y + Math.sin(a) * (c.h / 2) + sy });
      }
      renderer.fillPoly(pts, cloudColor);
      // Second lobe offset
      const pts2 = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pts2.push({ x: c.x + c.w * 0.25 + Math.cos(a) * (c.w * 0.35) + sx, y: c.y - c.h * 0.15 + Math.sin(a) * (c.h * 0.4) + sy });
      }
      renderer.fillPoly(pts2, cloudColor);
      // Third lobe
      const pts3 = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pts3.push({ x: c.x - c.w * 0.2 + Math.cos(a) * (c.w * 0.3) + sx, y: c.y + c.h * 0.1 + Math.sin(a) * (c.h * 0.35) + sy });
      }
      renderer.fillPoly(pts3, cloudColor);
    });

    // Parallax ground — islands and waves
    groundTiles.forEach(t => {
      let ty = (t.y + scrollOffset) % (H * 2) - H * 0.5;
      if (t.type === 'island') {
        const rx = t.w / 2;
        const ry = t.h / 2;
        const alpha = 0.4 + t.shade;
        const r = Math.round(30 * alpha);
        const g = Math.round(80 * alpha);
        const b2 = Math.round(50 * alpha);
        const islandColor = `rgb(${r},${g},${b2})`;
        const pts = [];
        const segs = 12;
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          pts.push({ x: t.x + Math.cos(a) * rx + sx, y: ty + Math.sin(a) * ry + sy });
        }
        renderer.fillPoly(pts, islandColor);

        const shoreColor = 'rgba(80,140,100,0.3)';
        const shorePts = [];
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          shorePts.push({ x: t.x + Math.cos(a) * (rx + 2) + sx, y: ty + Math.sin(a) * (ry + 2) + sy });
        }
        renderer.strokePoly(shorePts, shoreColor, 1, true);

        // Vegetation detail (small circles on islands)
        const vegCount = Math.floor(t.w / 15);
        for (let v = 0; v < vegCount; v++) {
          const vAngle = (v / vegCount) * Math.PI * 2 + t.shade * 10;
          const vr = rx * 0.5;
          const vx = t.x + Math.cos(vAngle) * vr * (0.3 + Math.random() * 0.5) + sx;
          const vy = ty + Math.sin(vAngle) * ry * 0.4 + sy;
          const vegSize = 2 + Math.random() * 3;
          renderer.fillCircle(vx, vy, vegSize, 'rgba(40,100,50,0.5)');
        }
      } else {
        const waveAlpha = 0.15 + t.shade * 0.2;
        const waveColor = `rgba(40,80,120,${waveAlpha})`;
        renderer.drawLine(t.x - t.w / 2 + sx, ty + sy, t.x + t.w / 2 + sx, ty + sy, waveColor, 1);
      }
    });

    // Exhaust particles (behind player)
    exhaustParticles.forEach(ep => {
      const alpha = Math.min(1, ep.life / 10);
      const size = 2 + (1 - alpha) * 2;
      renderer.fillCircle(ep.x + sx, ep.y + sy, size, applyAlpha(ep.color, alpha * 0.7));
    });

    // Power-ups
    powerUps.forEach(p => {
      const pulse = Math.sin(tick * 0.1) * 0.3 + 0.7;
      if (p.type === 'doubleShot') {
        const c = `rgba(255,200,50,${pulse})`;
        renderer.setGlow('#fc3', 0.5);
        renderer.fillRect(p.x + 4 + sx, p.y + 2 + sy, 4, 16, c);
        renderer.fillRect(p.x + 12 + sx, p.y + 2 + sy, 4, 16, c);
        renderer.setGlow(null);
      } else {
        const c = `rgba(100,200,255,${pulse})`;
        renderer.setGlow('#4cf', 0.5);
        renderer.fillPoly([
          { x: p.x + 10 + sx, y: p.y + sy },
          { x: p.x + 20 + sx, y: p.y + 10 + sy },
          { x: p.x + 10 + sx, y: p.y + 20 + sy },
          { x: p.x + 10 + sx, y: p.y + 14 + sy },
          { x: p.x + sx, y: p.y + 14 + sy },
          { x: p.x + sx, y: p.y + 6 + sy },
          { x: p.x + 10 + sx, y: p.y + 6 + sy }
        ], c);
        renderer.setGlow(null);
      }
    });

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    enemyBullets.forEach(b => {
      renderer.fillCircle(b.x + sx, b.y + sy, 3, '#f44');
    });
    renderer.setGlow(null);

    // Enemies
    enemies.forEach(e => {
      if (!e.alive) return;
      drawEnemy(renderer, text, e, sx, sy);
    });

    // Player bullets
    renderer.setGlow(THEME, 0.5);
    bullets.forEach(b => {
      renderer.fillRect(b.x - 2 + sx, b.y + sy, 4, 10, THEME);
    });
    renderer.setGlow(null);

    // Player (with roll afterimage)
    drawPlayer(renderer, sx, sy);

    // Explosions
    explosions.forEach(ex => {
      const pct = ex.life / ex.maxLife;
      const r = ex.size * (1 - pct * 0.5);
      const green = Math.floor(120 + pct * 135);
      const blue = Math.floor(pct * 80);
      const alpha = pct * 0.7;
      const c = `rgba(255,${green},${blue},${alpha})`;
      renderer.setGlow('#f84', 0.6);
      renderer.fillCircle(ex.x + sx, ex.y + sy, r, c);
      renderer.setGlow(null);
    });

    // Particles
    particles.forEach(p => {
      const alpha = Math.min(1, p.life / 30);
      renderer.fillRect(p.x - 2 + sx, p.y - 2 + sy, 4, 4, applyAlpha(p.color, alpha));
    });

    // Debris particles (tumbling rectangles)
    debrisParticles.forEach(d => {
      const alpha = Math.min(1, d.life / d.maxLife);
      const cos = Math.cos(d.rotation);
      const sin = Math.sin(d.rotation);
      const hw = d.w / 2;
      const hh = d.h / 2;
      const pts = [
        { x: d.x + (-hw * cos - -hh * sin) + sx, y: d.y + (-hw * sin + -hh * cos) + sy },
        { x: d.x + (hw * cos - -hh * sin) + sx, y: d.y + (hw * sin + -hh * cos) + sy },
        { x: d.x + (hw * cos - hh * sin) + sx, y: d.y + (hw * sin + hh * cos) + sy },
        { x: d.x + (-hw * cos - hh * sin) + sx, y: d.y + (-hw * sin + hh * cos) + sy }
      ];
      renderer.fillPoly(pts, applyAlpha(d.color, alpha));
    });

    // Power-up timer bars (on-canvas HUD)
    drawPowerUpTimers(renderer, text, sx, sy);

    // Roll cooldown indicator
    if (rollCooldownTimer > 0) {
      const pct = rollCooldownTimer / ROLL_COOLDOWN;
      renderer.fillRect(W - 50 + sx, H - 14 + sy, 40 * (1 - pct), 6, 'rgba(102,221,187,0.3)');
      renderer.strokePoly([
        { x: W - 50 + sx, y: H - 14 + sy },
        { x: W - 10 + sx, y: H - 14 + sy },
        { x: W - 10 + sx, y: H - 8 + sy },
        { x: W - 50 + sx, y: H - 8 + sy }
      ], 'rgba(102,221,187,0.5)', 1, true);
    }

    // Boss warning overlay
    if (bossWarningTimer > 0) {
      const warningAlpha = Math.abs(Math.sin(bossWarningTimer * 0.15)) * 0.8;

      // Dramatic WARNING text with glow
      renderer.setGlow('#f00', 1.0);
      text.drawText('WARNING', W / 2 + sx, H / 2 - 40 + sy, 40, `rgba(255,40,40,${warningAlpha.toFixed(2)})`, 'center');
      renderer.setGlow(null);

      // Sub-text
      if (bossWarningTimer < 60) {
        const subAlpha = Math.min(1, (60 - bossWarningTimer) / 30) * warningAlpha;
        text.drawText('BOSS APPROACHING', W / 2 + sx, H / 2 + sy, 16, `rgba(255,100,100,${subAlpha.toFixed(2)})`, 'center');
      }

      // Red screen flash
      renderer.fillRect(0, 0, W, H, `rgba(255,0,0,${(warningAlpha * 0.08).toFixed(3)})`);

      // Red border flash
      const borderW = 4;
      const borderAlpha = warningAlpha * 0.3;
      const borderColor = `rgba(255,30,30,${borderAlpha.toFixed(3)})`;
      renderer.fillRect(0, 0, W, borderW, borderColor);
      renderer.fillRect(0, H - borderW, W, borderW, borderColor);
      renderer.fillRect(0, 0, borderW, H, borderColor);
      renderer.fillRect(W - borderW, 0, borderW, H, borderColor);
    }

    // Wave transition text
    if (waveTextTimer > 0) {
      const glitchX = (Math.random() - 0.5) * 3;
      const glitchY = (Math.random() - 0.5) * 3;
      const fadeAlpha = Math.min(1, waveTextTimer / 30);
      renderer.setGlow(THEME, 0.7);
      text.drawText(`WAVE ${waveTextNumber}`, W / 2 + glitchX + sx, H / 2 + glitchY + sy, 28, applyAlpha(THEME, fadeAlpha), 'center');
      // Slight glitch duplicate
      if (waveTextTimer > 60) {
        text.drawText(`WAVE ${waveTextNumber}`, W / 2 + glitchX + 2 + sx, H / 2 + glitchY + sy, 28, `rgba(255,100,100,${(fadeAlpha * 0.3).toFixed(2)})`, 'center');
        text.drawText(`WAVE ${waveTextNumber}`, W / 2 + glitchX - 2 + sx, H / 2 + glitchY + sy, 28, `rgba(100,100,255,${(fadeAlpha * 0.3).toFixed(2)})`, 'center');
      }
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}

// ── Helper: apply alpha to hex/named color ──
function applyAlpha(color, alpha) {
  if (alpha >= 1) return color;
  // Parse common hex colors
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
  return color; // fallback
}

// ── Draw helpers ──

function drawPlayer(renderer, sx, sy) {
  // Skip drawing every other frame when invincible (blink effect)
  if (invincibleTimer > 0 && Math.floor(invincibleTimer / 3) % 2 === 0) return;

  const px = player.x, py = player.y;
  const cx = px + PW / 2, cy = py + PH / 2;

  // During roll, draw afterimage trail and chromatic effect
  if (rollingTimer > 0) {
    // Draw afterimages at previous positions
    for (let i = rollTrail.length - 1; i >= 0; i--) {
      const trail = rollTrail[i];
      const trailCx = trail.x + PW / 2;
      const trailCy = trail.y + PH / 2;
      const trailAlpha = 0.15 - i * 0.04;
      if (trailAlpha > 0) {
        drawPlayerShapeScaled(renderer, trailCx + sx, trailCy + sy, 0.8, trailAlpha);
      }
    }

    const rollPct = rollingTimer / ROLL_DURATION;
    const scaleX = Math.cos(rollPct * Math.PI * 3);
    const absScale = Math.abs(scaleX) * 0.7 + 0.3;
    const alpha = 0.4 + Math.abs(scaleX) * 0.6;

    // Chromatic aberration effect: cyan and red offsets
    drawPlayerShapeScaledTinted(renderer, cx - 2 + sx, cy + sy, absScale, alpha * 0.3, '#0ff');
    drawPlayerShapeScaledTinted(renderer, cx + 2 + sx, cy + sy, absScale, alpha * 0.3, '#f00');
    // Main ship
    drawPlayerShapeScaled(renderer, cx + sx, cy + sy, absScale, alpha);
    return;
  }

  drawPlayerShape(renderer, cx + sx, cy + sy);

  // Double-shot swirling particles
  if (doubleShot) {
    for (let i = 0; i < 3; i++) {
      const a = tick * 0.15 + i * (Math.PI * 2 / 3);
      const orbitR = 18;
      const dpx = player.x + PW / 2 + Math.cos(a) * orbitR + sx;
      const dpy = player.y + PH / 2 + Math.sin(a) * orbitR + sy;
      const dalpha = 0.4 + Math.sin(tick * 0.1 + i) * 0.2;
      renderer.setGlow('#fc3', 0.3);
      renderer.fillCircle(dpx, dpy, 2, `rgba(255,200,50,${dalpha.toFixed(2)})`);
      renderer.setGlow(null);
    }
  }

  // Speed boost trail
  if (speedBoost) {
    // Stretched exhaust trail
    renderer.fillPoly([
      { x: px + 4 + sx, y: py + PH + sy },
      { x: px + PW / 2 + sx, y: py + PH + 20 + sy },
      { x: px + PW - 4 + sx, y: py + PH + sy }
    ], 'rgba(100,200,255,0.35)');
    // Motion lines
    for (let i = 0; i < 3; i++) {
      const lx = px + 6 + i * (PW - 12) / 2 + sx;
      const ly = py + PH + 5 + sy;
      renderer.drawLine(lx, ly, lx, ly + 12 + Math.random() * 8, 'rgba(100,200,255,0.25)', 1);
    }
  }
}

function drawPlayerShape(renderer, cx, cy) {
  renderer.setGlow(THEME, 0.5);

  // Fuselage
  renderer.fillPoly([
    { x: cx, y: cy - PH / 2 },
    { x: cx + 5, y: cy - 6 },
    { x: cx + 5, y: cy + PH / 2 - 4 },
    { x: cx - 5, y: cy + PH / 2 - 4 },
    { x: cx - 5, y: cy - 6 }
  ], THEME);

  // Left wing
  renderer.fillPoly([
    { x: cx - 4, y: cy },
    { x: cx - PW / 2, y: cy + 8 },
    { x: cx - PW / 2, y: cy + 12 },
    { x: cx - 4, y: cy + 6 }
  ], THEME);

  // Right wing
  renderer.fillPoly([
    { x: cx + 4, y: cy },
    { x: cx + PW / 2, y: cy + 8 },
    { x: cx + PW / 2, y: cy + 12 },
    { x: cx + 4, y: cy + 6 }
  ], THEME);

  // Left tail
  renderer.fillPoly([
    { x: cx - 3, y: cy + PH / 2 - 6 },
    { x: cx - 10, y: cy + PH / 2 },
    { x: cx - 3, y: cy + PH / 2 - 2 }
  ], THEME);

  // Right tail
  renderer.fillPoly([
    { x: cx + 3, y: cy + PH / 2 - 6 },
    { x: cx + 10, y: cy + PH / 2 },
    { x: cx + 3, y: cy + PH / 2 - 2 }
  ], THEME);

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 3, y: (cy - 4) + Math.sin(a) * 5 });
  }
  renderer.fillPoly(cockpitPts, '#aef');

  // Propeller
  const propR = 8;
  for (let i = 0; i < 2; i++) {
    const a = propellerAngle + i * Math.PI;
    const px1 = cx + Math.cos(a) * propR;
    const py1 = (cy - PH / 2 - 2) + Math.sin(a) * 3;
    const px2 = cx + Math.cos(a + Math.PI) * propR;
    const py2 = (cy - PH / 2 - 2) + Math.sin(a + Math.PI) * 3;
    renderer.drawLine(px1, py1, px2, py2, 'rgba(200,230,255,0.4)', 2);
  }
  // Propeller hub
  renderer.fillCircle(cx, cy - PH / 2 - 2, 2, '#aef');

  // Engine glow
  renderer.setGlow('#f84', 0.5);
  const enginePts = [];
  const engineRx = 3, engineRy = 5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    enginePts.push({ x: cx + Math.cos(a) * engineRx, y: (cy + PH / 2 - 2) + Math.sin(a) * engineRy });
  }
  renderer.fillPoly(enginePts, '#fa4');

  renderer.setGlow(null);
}

function drawPlayerShapeScaled(renderer, cx, cy, scaleX, alpha) {
  const s = scaleX;
  const col = applyAlpha(THEME, alpha);

  renderer.setGlow(THEME, 0.3 * alpha);

  // Fuselage
  renderer.fillPoly([
    { x: cx, y: cy - PH / 2 },
    { x: cx + 5 * s, y: cy - 6 },
    { x: cx + 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy - 6 }
  ], col);

  // Left wing
  renderer.fillPoly([
    { x: cx - 4 * s, y: cy },
    { x: cx - PW / 2 * s, y: cy + 8 },
    { x: cx - PW / 2 * s, y: cy + 12 },
    { x: cx - 4 * s, y: cy + 6 }
  ], col);

  // Right wing
  renderer.fillPoly([
    { x: cx + 4 * s, y: cy },
    { x: cx + PW / 2 * s, y: cy + 8 },
    { x: cx + PW / 2 * s, y: cy + 12 },
    { x: cx + 4 * s, y: cy + 6 }
  ], col);

  // Left tail
  renderer.fillPoly([
    { x: cx - 3 * s, y: cy + PH / 2 - 6 },
    { x: cx - 10 * s, y: cy + PH / 2 },
    { x: cx - 3 * s, y: cy + PH / 2 - 2 }
  ], col);

  // Right tail
  renderer.fillPoly([
    { x: cx + 3 * s, y: cy + PH / 2 - 6 },
    { x: cx + 10 * s, y: cy + PH / 2 },
    { x: cx + 3 * s, y: cy + PH / 2 - 2 }
  ], col);

  renderer.setGlow(null);
}

function drawPlayerShapeScaledTinted(renderer, cx, cy, scaleX, alpha, tint) {
  const s = scaleX;
  const col = applyAlpha(tint, alpha);

  // Fuselage only for tint (simplified for performance)
  renderer.fillPoly([
    { x: cx, y: cy - PH / 2 },
    { x: cx + 5 * s, y: cy - 6 },
    { x: cx + 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy + PH / 2 - 4 },
    { x: cx - 5 * s, y: cy - 6 }
  ], col);

  // Wings
  renderer.fillPoly([
    { x: cx - 4 * s, y: cy },
    { x: cx - PW / 2 * s, y: cy + 8 },
    { x: cx - PW / 2 * s, y: cy + 12 },
    { x: cx - 4 * s, y: cy + 6 }
  ], col);
  renderer.fillPoly([
    { x: cx + 4 * s, y: cy },
    { x: cx + PW / 2 * s, y: cy + 8 },
    { x: cx + PW / 2 * s, y: cy + 12 },
    { x: cx + 4 * s, y: cy + 6 }
  ], col);
}

function drawEnemy(renderer, text, e, sx, sy) {
  const cx = e.x + e.w / 2 + sx;
  const cy = e.y + e.h / 2 + sy;

  switch (e.type) {
    case 'fighter':
      drawEnemyFighter(renderer, cx, cy, e);
      break;
    case 'bomber':
      drawEnemyBomber(renderer, cx, cy, e);
      break;
    case 'ace':
      drawEnemyAce(renderer, cx, cy, e);
      break;
    case 'boss':
      drawBoss(renderer, e, sx, sy);
      break;
  }
}

function drawEnemyFighter(renderer, cx, cy, e) {
  renderer.setGlow('#f55', 0.4);

  // Body (inverted — nose points down)
  renderer.fillPoly([
    { x: cx, y: cy + e.h / 2 },
    { x: cx + 4, y: cy + 2 },
    { x: cx + e.w / 2 - 2, y: cy - 4 },
    { x: cx + e.w / 2 - 2, y: cy - e.h / 2 + 2 },
    { x: cx - e.w / 2 + 2, y: cy - e.h / 2 + 2 },
    { x: cx - e.w / 2 + 2, y: cy - 4 },
    { x: cx - 4, y: cy + 2 }
  ], '#f55');

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 3, y: cy + Math.sin(a) * 4 });
  }
  renderer.fillPoly(cockpitPts, '#400');

  renderer.setGlow(null);
}

function drawEnemyBomber(renderer, cx, cy, e) {
  renderer.setGlow('#e80', 0.5);

  // Wide body
  renderer.fillRect(cx - e.w / 2 + 2, cy - e.h / 2 + 4, e.w - 4, e.h - 8, '#e80');
  // Wings
  renderer.fillRect(cx - e.w / 2 - 4, cy - 4, e.w + 8, 10, '#e80');
  // Nose
  renderer.fillPoly([
    { x: cx - 6, y: cy + e.h / 2 - 4 },
    { x: cx, y: cy + e.h / 2 + 2 },
    { x: cx + 6, y: cy + e.h / 2 - 4 }
  ], '#e80');

  // Cockpit
  renderer.fillRect(cx - 4, cy - 3, 8, 6, '#420');

  // HP indicator
  if (e.hp > 1) {
    for (let d = 0; d < e.hp; d++) {
      renderer.fillRect(cx - 4 + d * 5, cy - e.h / 2, 3, 3, '#ff0');
    }
  }

  renderer.setGlow(null);
}

function drawEnemyAce(renderer, cx, cy, e) {
  renderer.setGlow('#f4f', 0.5);

  // Sleek body
  renderer.fillPoly([
    { x: cx, y: cy + e.h / 2 },
    { x: cx + e.w / 2, y: cy - e.h / 4 },
    { x: cx + e.w / 4, y: cy - e.h / 2 },
    { x: cx - e.w / 4, y: cy - e.h / 2 },
    { x: cx - e.w / 2, y: cy - e.h / 4 }
  ], '#f4f');

  // Stripe
  renderer.fillRect(cx - 2, cy - e.h / 2 + 2, 4, e.h - 4, '#808');

  // HP indicator
  if (e.hp > 1) {
    for (let d = 0; d < e.hp; d++) {
      renderer.fillRect(cx - 4 + d * 5, cy - e.h / 2 - 3, 3, 3, '#ff0');
    }
  }

  renderer.setGlow(null);
}

function drawBoss(renderer, e, sx, sy) {
  const cx = e.x + e.w / 2 + sx;
  const cy = e.y + e.h / 2 + sy;

  const pulse = Math.sin(tick * 0.06) * 0.3 + 0.7;
  const bossColor = `rgba(255,60,60,${pulse})`;

  renderer.setGlow('#f44', 0.8);

  // Large fuselage
  renderer.fillRect(cx - 12, cy - e.h / 2, 24, e.h, bossColor);
  // Wide wings
  renderer.fillRect(cx - e.w / 2, cy - 8, e.w, 18, bossColor);

  // Left wing tip
  renderer.fillPoly([
    { x: cx - e.w / 2, y: cy - 8 },
    { x: cx - e.w / 2 - 6, y: cy + 4 },
    { x: cx - e.w / 2, y: cy + 10 }
  ], bossColor);

  // Right wing tip
  renderer.fillPoly([
    { x: cx + e.w / 2, y: cy - 8 },
    { x: cx + e.w / 2 + 6, y: cy + 4 },
    { x: cx + e.w / 2, y: cy + 10 }
  ], bossColor);

  // Nose
  renderer.fillPoly([
    { x: cx - 8, y: cy + e.h / 2 },
    { x: cx, y: cy + e.h / 2 + 10 },
    { x: cx + 8, y: cy + e.h / 2 }
  ], bossColor);

  // Cockpit
  const cockpitPts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cockpitPts.push({ x: cx + Math.cos(a) * 6, y: (cy + 2) + Math.sin(a) * 8 });
  }
  renderer.fillPoly(cockpitPts, '#400');

  // Engine flames
  const flameColor = `rgba(255,160,40,${pulse})`;
  renderer.setGlow('#f84', 0.6);

  const lFlame = [];
  const rFlame = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lFlame.push({ x: (cx - 10) + Math.cos(a) * 4, y: (cy - e.h / 2) + Math.sin(a) * 7 });
    rFlame.push({ x: (cx + 10) + Math.cos(a) * 4, y: (cy - e.h / 2) + Math.sin(a) * 7 });
  }
  renderer.fillPoly(lFlame, flameColor);
  renderer.fillPoly(rFlame, flameColor);

  renderer.setGlow(null);

  // Health bar
  const barW = e.w + 20;
  const hpPct = e.hp / e.maxHp;
  renderer.fillRect(cx - barW / 2, e.y - 12 + sy, barW, 6, '#400');
  const hpColor = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
  renderer.fillRect(cx - barW / 2, e.y - 12 + sy, barW * hpPct, 6, hpColor);
  renderer.strokePoly([
    { x: cx - barW / 2, y: e.y - 12 + sy },
    { x: cx + barW / 2, y: e.y - 12 + sy },
    { x: cx + barW / 2, y: e.y - 6 + sy },
    { x: cx - barW / 2, y: e.y - 6 + sy }
  ], '#666', 1, true);
}

function drawPowerUpTimers(renderer, text, sx, sy) {
  let yOff = 20;
  if (doubleShot) {
    const pct = doubleShotTimer / 600;
    text.drawText('DOUBLE SHOT', 10 + sx, yOff - 10 + sy, 12, 'rgba(255,200,50,0.8)', 'left');
    renderer.fillRect(10 + sx, yOff + 4 + sy, 80, 4, '#333');
    renderer.fillRect(10 + sx, yOff + 4 + sy, 80 * pct, 4, '#fc3');
    yOff += 24;
  }
  if (speedBoost) {
    const pct = speedBoostTimer / 480;
    text.drawText('SPEED BOOST', 10 + sx, yOff - 10 + sy, 12, 'rgba(100,200,255,0.8)', 'left');
    renderer.fillRect(10 + sx, yOff + 4 + sy, 80, 4, '#333');
    renderer.fillRect(10 + sx, yOff + 4 + sy, 80 * pct, 4, '#4cf');
    yOff += 24;
  }
}
