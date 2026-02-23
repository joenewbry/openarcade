// raiden/game.js — Raiden game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 640;

// ── Constants ──
const PLAYER_SPEED = 4;
const PLAYER_W = 28, PLAYER_H = 32;
const FIRE_RATE_VULCAN = 6;
const FIRE_RATE_LASER = 12;
const FIRE_RATE_MISSILE = 20;
const BOMB_FLASH_DURATION = 30;
const MAX_BOMBS = 3;
const MAX_LIVES = 3;
const MEDAL_SCORE = 500;
const STAGE_DURATION = 3600;
const MAX_PARTICLES = 250;

// Weapon types
const WEAPON = { VULCAN: 0, LASER: 1, MISSILE: 2 };
const WEAPON_COLORS = ['#f44', '#48f', '#4f4'];
const WEAPON_NAMES = ['VULCAN', 'LASER', 'MISSILE'];

// ── Procedural Audio System ──
class SynthSFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  _init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      // Audio not available
    }
  }

  _osc(type, freq, duration, volume, detune) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  _noise(duration, volume) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + duration);
  }

  vulcanFire() {
    this._init();
    this._osc('square', 1800, 0.02, 0.15);
  }

  laserFire() {
    this._init();
    this._osc('sawtooth', 600, 0.08, 0.12);
    this._osc('square', 900, 0.06, 0.06);
  }

  missileFire() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
    this._noise(0.08, 0.06);
  }

  explosionSmall() {
    this._init();
    this._noise(0.08, 0.18);
    this._osc('sine', 150, 0.06, 0.1);
  }

  explosionBig() {
    this._init();
    this._noise(0.2, 0.25);
    this._osc('sine', 80, 0.15, 0.15);
  }

  bossExplosion() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Layer 1: long noise
    const bufSize = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.5);
    // Layer 2: low rumble
    this._osc('sine', 50, 0.4, 0.2);
    // Layer 3: mid crunch
    this._osc('sawtooth', 120, 0.3, 0.12);
  }

  bombUse() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
    this._noise(0.25, 0.2);
  }

  powerupCollect() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.08);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  medalCollect() {
    this._init();
    this._osc('sine', 1200, 0.05, 0.12);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1600;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setValueAtTime(0.12, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playerHit() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
    this._noise(0.1, 0.1);
  }

  stageComplete() {
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }
}

const sfx = new SynthSFX();

// ── State ──
let player, bullets, enemies, enemyBullets, particles, powerups, medals;
let tick, lives, bombs, weaponType, weaponLevel;
let stage, stageTimer, bossActive, boss;
let scrollY, groundObjects;
let bombFlash, invincibleTimer, fireTimer;
let screenShake, shakeTimer;
let score, best = 0;

// New state for enhancements
let thrusterParticles;
let missileTrails;
let vulcanTrails;
let slowMoTimer, slowMoScale;
let stageTextTimer, stageTextNum;
let bossEntranceTriggered;
let bossDeathExplosions;
let medalSparkles;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Utility ──
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(x1, y1, x2, y2) { return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

// Expand 3-char hex to 6-char hex
function expandHex(hexColor) {
  if (hexColor.length === 4) {
    return '#' + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2] + hexColor[3] + hexColor[3];
  }
  return hexColor;
}

// ── Ground objects (scrolling terrain) ──
function createGroundObject(x, y) {
  const type = randInt(0, 3);
  return { x, y, type, w: type === 3 ? 40 : 20 + randInt(0, 15), h: type === 3 ? 40 : 15 + randInt(0, 10) };
}

function updateGround() {
  const scrollSpeed = 0.8 + stage * 0.1;
  scrollY += scrollSpeed;

  for (let i = groundObjects.length - 1; i >= 0; i--) {
    groundObjects[i].y += scrollSpeed;
    if (groundObjects[i].y > H + 50) {
      groundObjects.splice(i, 1);
    }
  }

  if (Math.random() < 0.02) {
    groundObjects.push(createGroundObject(rand(10, W - 50), -50));
  }
}

// ── Enemy spawning ──
function spawnEnemy(type, x, y, vx, vy) {
  const e = { type, x, y, vx: vx || 0, vy: vy || 0, hp: 1, maxHp: 1, tick: 0, phase: rand(0, Math.PI * 2) };
  switch (type) {
    case 'basic':
      e.hp = e.maxHp = 1; e.vy = 1.5 + stage * 0.2; e.score = 100;
      e.w = 20; e.h = 20; e.color = '#f80';
      break;
    case 'fast':
      e.hp = e.maxHp = 1; e.vy = 3 + stage * 0.15; e.score = 150;
      e.w = 16; e.h = 16; e.color = '#ff0';
      break;
    case 'zigzag':
      e.hp = e.maxHp = 2; e.vy = 1.2 + stage * 0.1; e.score = 200;
      e.w = 22; e.h = 22; e.color = '#0ff'; e.amplitude = 60 + rand(0, 30);
      break;
    case 'tough':
      e.hp = e.maxHp = 3 + stage; e.vy = 0.8; e.score = 300;
      e.w = 28; e.h = 28; e.color = '#c4f';
      break;
    case 'tank':
      e.hp = e.maxHp = 5 + stage * 2; e.vy = 0.4; e.score = 500;
      e.w = 36; e.h = 28; e.color = '#888'; e.shootTimer = 0;
      break;
    case 'turret':
      e.hp = e.maxHp = 4 + stage; e.vy = 0.8 + stage * 0.1; e.score = 400;
      e.w = 30; e.h = 30; e.color = '#696'; e.shootTimer = 0; e.ground = true;
      break;
  }
  enemies.push(e);
}

function spawnFormation() {
  const formations = [
    // V formation
    () => {
      const cx = rand(60, W - 60);
      for (let i = 0; i < 5; i++) {
        spawnEnemy('basic', cx + (i - 2) * 30, -20 - Math.abs(i - 2) * 25);
      }
    },
    // Line
    () => {
      const y = -20;
      const count = 6 + Math.min(stage, 4);
      const spacing = (W - 80) / count;
      for (let i = 0; i < count; i++) {
        spawnEnemy('basic', 40 + i * spacing, y - rand(0, 10));
      }
    },
    // Double zigzag
    () => {
      for (let i = 0; i < 4; i++) {
        spawnEnemy('zigzag', rand(40, W - 60), -20 - i * 40);
      }
    },
    // Tank + escorts
    () => {
      const cx = rand(80, W - 80);
      spawnEnemy('tank', cx - 18, -30);
      spawnEnemy('basic', cx - 50, -10);
      spawnEnemy('basic', cx + 30, -10);
    },
    // Fast swarm
    () => {
      const side = Math.random() > 0.5 ? 0 : W - 20;
      for (let i = 0; i < 4 + stage; i++) {
        spawnEnemy('fast', side, -20 - i * 20, side === 0 ? 1.5 : -1.5);
      }
    },
    // Turret pair
    () => {
      spawnEnemy('turret', rand(30, W / 2 - 40), -40);
      spawnEnemy('turret', rand(W / 2 + 10, W - 60), -40);
    }
  ];
  formations[randInt(0, formations.length - 1)]();
}

function spawnWave() {
  const spawnInterval = Math.max(40, 120 - stage * 12);

  if (tick % spawnInterval === 0 && !bossActive) {
    if (Math.random() < 0.4) {
      spawnFormation();
    } else {
      const types = ['basic', 'basic', 'fast', 'zigzag'];
      if (stage >= 2) types.push('tough', 'turret');
      if (stage >= 3) types.push('tank');
      const type = types[randInt(0, types.length - 1)];
      spawnEnemy(type, rand(30, W - 50), -30);
    }
  }
}

// ── Boss system ──
function spawnBoss() {
  bossActive = true;
  bossEntranceTriggered = false;
  const bossHp = 50 + stage * 30;
  boss = {
    x: W / 2 - 50, y: -100, w: 100, h: 60,
    hp: bossHp, maxHp: bossHp,
    phase: 0, pattern: 0, patternTimer: 0,
    entryComplete: false, score: 2000 + stage * 1000,
    shootTimer: 0
  };
}

function updateBoss() {
  if (!boss) return;

  if (!boss.entryComplete) {
    boss.y += 1.5;
    if (boss.y >= 40) {
      boss.entryComplete = true;
      boss.y = 40;
      // Boss entrance effect: screen shake + sound
      if (!bossEntranceTriggered) {
        bossEntranceTriggered = true;
        screenShake = 6;
        shakeTimer = 30;
        sfx.explosionBig();
      }
    }
    return;
  }

  boss.phase += 0.02;
  boss.patternTimer++;
  boss.shootTimer++;

  const patternDuration = 240;
  if (boss.patternTimer > patternDuration) {
    boss.patternTimer = 0;
    boss.pattern = (boss.pattern + 1) % 5;
  }

  switch (boss.pattern) {
    case 0:
      boss.x = W / 2 - boss.w / 2 + Math.sin(boss.phase * 1.5) * (W / 2 - boss.w / 2 - 20);
      break;
    case 1: {
      const targetX = player.x - boss.w / 2 + PLAYER_W / 2;
      boss.x += (targetX - boss.x) * 0.03;
      break;
    }
    case 2:
      boss.x = W / 2 - boss.w / 2 + Math.sin(boss.phase * 2) * (W / 3);
      boss.y = 40 + Math.sin(boss.phase * 4) * 20;
      break;
    case 3: // Figure-8 pattern
      boss.x = W / 2 - boss.w / 2 + Math.sin(boss.phase * 2) * (W / 3);
      boss.y = 40 + Math.sin(boss.phase * 4) * 25 + Math.cos(boss.phase * 2) * 15;
      break;
    case 4: { // Rush pattern — move toward player then retreat
      const rushTarget = player.x - boss.w / 2 + PLAYER_W / 2;
      boss.x += (rushTarget - boss.x) * 0.06;
      boss.y = 40 + Math.sin(boss.phase * 3) * 35;
      break;
    }
  }

  boss.x = clamp(boss.x, 10, W - boss.w - 10);
  boss.y = clamp(boss.y, 10, 120);

  const fireRate = Math.max(15, 40 - stage * 3);
  if (boss.shootTimer >= fireRate) {
    boss.shootTimer = 0;
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h;
    const hpRatio = boss.hp / boss.maxHp;

    if (hpRatio < 0.3) {
      const angle = Math.atan2(player.y - cy, player.x + PLAYER_W / 2 - cx);
      for (let i = -3; i <= 3; i++) {
        const a = angle + i * 0.15;
        enemyBullets.push({ x: cx, y: cy, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 });
      }
    } else if (hpRatio < 0.6) {
      for (let i = 0; i < 6; i++) {
        const a = boss.phase * 3 + i * Math.PI / 3;
        enemyBullets.push({ x: cx, y: cy, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5 + 1 });
      }
    } else {
      const dx = player.x + PLAYER_W / 2 - cx;
      const dy = player.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyBullets.push({ x: cx, y: cy, vx: dx / d * 3, vy: dy / d * 3 });
      enemyBullets.push({ x: boss.x + 10, y: cy, vx: 0, vy: 2.5 });
      enemyBullets.push({ x: boss.x + boss.w - 10, y: cy, vx: 0, vy: 2.5 });
    }
  }
}

// ── Player weapons ──
function fireWeapon() {
  const cx = player.x + PLAYER_W / 2;
  const cy = player.y;
  const lvl = weaponLevel;

  switch (weaponType) {
    case WEAPON.VULCAN:
      if (fireTimer % FIRE_RATE_VULCAN === 0) {
        bullets.push({ x: cx, y: cy, vx: 0, vy: -8, dmg: 1, type: 'vulcan' });
        if (lvl >= 2) {
          bullets.push({ x: cx - 8, y: cy + 4, vx: -0.5, vy: -8, dmg: 1, type: 'vulcan' });
          bullets.push({ x: cx + 8, y: cy + 4, vx: 0.5, vy: -8, dmg: 1, type: 'vulcan' });
        }
        if (lvl >= 3) {
          bullets.push({ x: cx - 14, y: cy + 8, vx: -1.2, vy: -7, dmg: 1, type: 'vulcan' });
          bullets.push({ x: cx + 14, y: cy + 8, vx: 1.2, vy: -7, dmg: 1, type: 'vulcan' });
        }
        sfx.vulcanFire();
      }
      break;

    case WEAPON.LASER:
      if (fireTimer % FIRE_RATE_LASER === 0) {
        bullets.push({ x: cx, y: cy, vx: 0, vy: -10, dmg: 3, type: 'laser', w: 4 + lvl * 2, h: 20 + lvl * 5 });
        if (lvl >= 3) {
          bullets.push({ x: cx - 12, y: cy + 5, vx: 0, vy: -9, dmg: 2, type: 'laser', w: 3, h: 16 });
          bullets.push({ x: cx + 12, y: cy + 5, vx: 0, vy: -9, dmg: 2, type: 'laser', w: 3, h: 16 });
        }
        sfx.laserFire();
      }
      break;

    case WEAPON.MISSILE:
      if (fireTimer % FIRE_RATE_MISSILE === 0) {
        bullets.push({ x: cx - 6, y: cy, vx: -0.5, vy: -5, dmg: 4, type: 'missile', homing: true });
        bullets.push({ x: cx + 6, y: cy, vx: 0.5, vy: -5, dmg: 4, type: 'missile', homing: true });
        if (lvl >= 2) {
          bullets.push({ x: cx, y: cy - 5, vx: 0, vy: -6, dmg: 5, type: 'missile', homing: true });
        }
        if (lvl >= 3) {
          bullets.push({ x: cx - 14, y: cy + 5, vx: -1, vy: -4, dmg: 4, type: 'missile', homing: true });
          bullets.push({ x: cx + 14, y: cy + 5, vx: 1, vy: -4, dmg: 4, type: 'missile', homing: true });
        }
        sfx.missileFire();
      }
      break;
  }
}

// ── Particles ──
function spawnExplosion(x, y, color, count) {
  count = count || 10;
  if (particles.length >= MAX_PARTICLES) count = Math.min(count, 3);
  for (let i = 0; i < count; i++) {
    const ang = rand(0, Math.PI * 2);
    const spd = rand(1, 4);
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 20 + rand(0, 15), maxLife: 35,
      color, size: rand(2, 5)
    });
  }
}

// Spawn thruster particles from the player ship's rear
function emitThrusterParticles() {
  if (thrusterParticles.length >= 50) return;
  const cx = player.x + PLAYER_W / 2;
  const cy = player.y + PLAYER_H;
  const count = randInt(1, 2);
  for (let i = 0; i < count; i++) {
    thrusterParticles.push({
      x: cx + rand(-4, 4),
      y: cy + rand(0, 3),
      vx: rand(-0.6, 0.6),
      vy: rand(1.5, 3),
      life: randInt(10, 15),
      maxLife: 15,
      size: rand(1.5, 3.5)
    });
  }
}

// Spawn missile smoke trail
function emitMissileTrail(bx, by) {
  if (missileTrails.length >= 80) return;
  for (let i = 0; i < randInt(2, 3); i++) {
    missileTrails.push({
      x: bx + rand(-2, 2),
      y: by + rand(2, 6),
      vx: rand(-0.3, 0.3),
      vy: rand(0.2, 0.8),
      life: randInt(8, 14),
      maxLife: 14,
      size: rand(1.5, 3)
    });
  }
}

// Spawn vulcan trail dots
function emitVulcanTrail(bx, by) {
  vulcanTrails.push({
    x: bx + rand(-1, 1),
    y: by + rand(4, 8),
    life: randInt(1, 2),
    maxLife: 2,
    size: rand(1, 2)
  });
}

// Boss death: spawn massive explosion particles
function spawnBossDeathExplosion(bx, by, bw, bh) {
  // Initial massive burst
  for (let i = 0; i < 50; i++) {
    const ang = rand(0, Math.PI * 2);
    const spd = rand(0.5, 5);
    particles.push({
      x: bx + rand(0, bw), y: by + rand(0, bh),
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 30 + rand(0, 20), maxLife: 50,
      color: ['#fd0', '#f84', '#f44', '#fff', '#ff8'][randInt(0, 4)],
      size: rand(2, 7)
    });
  }
  // Queue sequential explosions
  bossDeathExplosions = [];
  for (let i = 0; i < 8; i++) {
    bossDeathExplosions.push({
      x: bx + rand(0, bw),
      y: by + rand(0, bh),
      delay: i * 4 + randInt(0, 3),
      fired: false
    });
  }
}

// ── Bomb ──
function useBomb(game) {
  if (bombs <= 0) return;
  bombs--;
  bombFlash = BOMB_FLASH_DURATION;
  screenShake = 8;
  shakeTimer = 20;
  sfx.bombUse();

  enemies.forEach(e => {
    e.hp -= 10;
    if (e.hp <= 0) {
      addScore(e.score);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 8);
    }
  });
  enemies = enemies.filter(e => e.hp > 0);

  if (boss) {
    boss.hp -= 15;
    if (boss.hp <= 0) {
      addScore(boss.score);
      triggerBossDeath(game);
    }
  }

  enemyBullets = [];

  for (let i = 0; i < 30; i++) {
    particles.push({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-3, 3), vy: rand(-3, 3),
      life: 40, maxLife: 40,
      color: '#fff', size: rand(2, 6)
    });
  }

  // Expanding particle ring from player
  const cx = player.x + PLAYER_W / 2;
  const cy = player.y + PLAYER_H / 2;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const speed = 4 + rand(0, 2);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 25, maxLife: 25,
      color: ['#fff', '#fd0', '#f84'][randInt(0, 2)],
      size: rand(3, 6)
    });
  }
}

// ── Boss death logic (extracted for reuse) ──
function triggerBossDeath(game) {
  if (!boss) return;
  sfx.bossExplosion();
  sfx.stageComplete();
  spawnExplosion(boss.x + boss.w / 2, boss.y + boss.h / 2, '#fd0', 30);
  spawnBossDeathExplosion(boss.x, boss.y, boss.w, boss.h);
  for (let m = 0; m < 8; m++) {
    spawnMedal(boss.x + rand(0, boss.w), boss.y + rand(0, boss.h));
  }
  spawnPowerup(boss.x + boss.w / 2, boss.y + boss.h / 2);
  // Slow-mo effect
  slowMoTimer = 30;
  slowMoScale = 0.3;
  // Stage transition text
  stageTextTimer = 120;
  stageTextNum = stage;
  boss = null;
  bossActive = false;
  stage++;
  stageTimer = 0;
}

// ── Powerup system ──
function spawnPowerup(x, y) {
  const r = Math.random();
  let type;
  if (r < 0.3) type = 'vulcan';
  else if (r < 0.6) type = 'laser';
  else if (r < 0.9) type = 'missile';
  else type = 'bomb';
  powerups.push({ x, y, type, vy: 1.5, w: 20, h: 20, tick: 0 });
}

function spawnMedal(x, y) {
  medals.push({ x, y, vy: 1.2, w: 14, h: 14, tick: 0 });
}

// ── Player hit ──
function playerHit(game) {
  lives--;
  invincibleTimer = 120;
  screenShake = 6;
  shakeTimer = 15;
  spawnExplosion(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#f28', 15);
  sfx.playerHit();
  if (weaponLevel > 1) weaponLevel--;

  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} | Stage ${stage} -- Press any key`);
    game.setState('over');
  }
}

// ── Reset game state ──
function resetGame() {
  player = { x: W / 2 - PLAYER_W / 2, y: H - 80 };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerups = [];
  medals = [];
  thrusterParticles = [];
  missileTrails = [];
  vulcanTrails = [];
  tick = 0;
  lives = MAX_LIVES;
  bombs = MAX_BOMBS;
  weaponType = WEAPON.VULCAN;
  weaponLevel = 1;
  stage = 1;
  stageTimer = 0;
  bossActive = false;
  boss = null;
  bossEntranceTriggered = false;
  scrollY = 0;
  groundObjects = [];
  bombFlash = 0;
  invincibleTimer = 0;
  fireTimer = 0;
  screenShake = 0;
  shakeTimer = 0;
  slowMoTimer = 0;
  slowMoScale = 1;
  stageTextTimer = 0;
  stageTextNum = 0;
  bossDeathExplosions = [];
  medalSparkles = [];
  score = 0;
  scoreEl.textContent = '0';

  // Seed initial ground objects
  for (let i = 0; i < 12; i++) {
    groundObjects.push(createGroundObject(rand(0, W), rand(0, H)));
  }
}

// ── Enhanced starfield — 3 layers ──
const STAR_LAYERS = [
  { count: 40, speedFactor: 0.15, minSize: 0.5, maxSize: 1.0, alpha: 0.08 },   // far
  { count: 30, speedFactor: 0.35, minSize: 1.0, maxSize: 1.5, alpha: 0.12 },   // mid
  { count: 20, speedFactor: 0.6,  minSize: 1.5, maxSize: 2.5, alpha: 0.18 }    // near
];
const starData = [];
let starIdx = 0;
for (const layer of STAR_LAYERS) {
  for (let i = 0; i < layer.count; i++) {
    starData.push({
      xSeed: (starIdx * 137 + 83) % W,
      ySeed: (starIdx * 251 + 47),
      speedFactor: layer.speedFactor,
      minSize: layer.minSize,
      maxSize: layer.maxSize,
      baseAlpha: layer.alpha,
      twinkleOffset: rand(0, Math.PI * 2)
    });
    starIdx++;
  }
}
const TOTAL_STARS = starData.length;

// ──────────────────────────────────────────────────────────
// Export: createGame
// ──────────────────────────────────────────────────────────
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = best;
    player = { x: W / 2 - PLAYER_W / 2, y: H - 80 };
    bullets = []; enemies = []; enemyBullets = [];
    particles = []; powerups = []; medals = [];
    thrusterParticles = []; missileTrails = []; vulcanTrails = [];
    groundObjects = []; boss = null; bossActive = false;
    bossEntranceTriggered = false;
    scrollY = 0; bombFlash = 0; invincibleTimer = 0;
    screenShake = 0; shakeTimer = 0; tick = 0;
    slowMoTimer = 0; slowMoScale = 1;
    stageTextTimer = 0; stageTextNum = 0;
    bossDeathExplosions = [];
    medalSparkles = [];
    lives = MAX_LIVES; bombs = MAX_BOMBS;
    weaponType = WEAPON.VULCAN; weaponLevel = 1;
    game.showOverlay('RAIDEN', 'Arrows: Move | Space: Fire | Shift/B: Bomb');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // State transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        resetGame();
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('Shift') || input.wasPressed('b') || input.wasPressed('B') ||
          input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Slow-mo timer
    let dtScale = 1;
    if (slowMoTimer > 0) {
      slowMoTimer--;
      dtScale = slowMoScale + (1 - slowMoScale) * (1 - slowMoTimer / 30);
    }

    tick++;
    stageTimer++;

    // Stage text timer
    if (stageTextTimer > 0) stageTextTimer--;

    // Boss death sequential explosions
    if (bossDeathExplosions && bossDeathExplosions.length > 0) {
      for (let i = bossDeathExplosions.length - 1; i >= 0; i--) {
        const be = bossDeathExplosions[i];
        be.delay--;
        if (be.delay <= 0 && !be.fired) {
          be.fired = true;
          spawnExplosion(be.x, be.y, ['#fd0', '#f84', '#fff'][randInt(0, 2)], 8);
          sfx.explosionSmall();
          bossDeathExplosions.splice(i, 1);
        }
      }
    }

    // Screen shake
    if (shakeTimer > 0) shakeTimer--;
    else screenShake = 0;

    // Bomb flash
    if (bombFlash > 0) bombFlash--;

    // Invincibility
    if (invincibleTimer > 0) invincibleTimer--;

    // Scrolling ground
    updateGround();

    // Player movement
    let playerMoving = false;
    if (input.isDown('ArrowLeft')) { player.x -= PLAYER_SPEED * dtScale; playerMoving = true; }
    if (input.isDown('ArrowRight')) { player.x += PLAYER_SPEED * dtScale; playerMoving = true; }
    if (input.isDown('ArrowUp')) { player.y -= PLAYER_SPEED * dtScale; playerMoving = true; }
    if (input.isDown('ArrowDown')) { player.y += PLAYER_SPEED * dtScale; playerMoving = true; }
    player.x = clamp(player.x, 0, W - PLAYER_W);
    player.y = clamp(player.y, H / 3, H - PLAYER_H - 10);

    // Firing
    if (input.isDown(' ')) {
      fireTimer++;
      fireWeapon();
    } else {
      fireTimer = 0;
    }

    // Thruster particles when firing or moving
    if (fireTimer > 0 || playerMoving) {
      emitThrusterParticles();
    }

    // Bomb
    if (input.wasPressed('Shift') || input.wasPressed('b') || input.wasPressed('B')) {
      useBomb(game);
    }

    // Stage progression
    if (!bossActive && stageTimer >= STAGE_DURATION) {
      spawnBoss();
    }

    // Spawn waves
    spawnWave();

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      // Homing missiles
      if (b.homing) {
        let closest = null, closestDist = Infinity;
        enemies.forEach(e => {
          const d = dist(b.x, b.y, e.x + e.w / 2, e.y + e.h / 2);
          if (d < closestDist) { closestDist = d; closest = { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
        });
        if (boss) {
          const d = dist(b.x, b.y, boss.x + boss.w / 2, boss.y + boss.h / 2);
          if (d < closestDist) { closestDist = d; closest = { x: boss.x + boss.w / 2, y: boss.y + boss.h / 2 }; }
        }
        if (closest) {
          const angle = Math.atan2(closest.y - b.y, closest.x - b.x);
          const curAngle = Math.atan2(b.vy, b.vx);
          let diff = angle - curAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = clamp(diff, -0.08, 0.08);
          const newAngle = curAngle + turn;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
        }
      }

      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;
      if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) {
        bullets.splice(i, 1);
        continue;
      }

      // Weapon visual trails
      if (b.type === 'missile') {
        emitMissileTrail(b.x, b.y);
      } else if (b.type === 'vulcan') {
        emitVulcanTrail(b.x, b.y);
      }

      // Hit enemies
      const bw = b.w || 4, bh = b.h || 8;
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (rectCollide(b.x - bw / 2, b.y - bh / 2, bw, bh, e.x, e.y, e.w, e.h)) {
          e.hp -= b.dmg;
          hit = true;
          if (e.hp <= 0) {
            addScore(e.score);
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 10);
            sfx.explosionSmall();
            if (Math.random() < 0.12) spawnPowerup(e.x + e.w / 2, e.y + e.h / 2);
            else if (Math.random() < 0.2) spawnMedal(e.x + e.w / 2, e.y + e.h / 2);
            enemies.splice(j, 1);
          } else {
            spawnExplosion(b.x, b.y, '#fff', 3);
          }
          break;
        }
      }

      // Hit boss
      if (!hit && boss) {
        if (rectCollide(b.x - bw / 2, b.y - bh / 2, bw, bh, boss.x, boss.y, boss.w, boss.h)) {
          boss.hp -= b.dmg;
          hit = true;
          spawnExplosion(b.x, b.y, '#fff', 3);
          screenShake = 2;
          shakeTimer = 3;
          if (boss.hp <= 0) {
            addScore(boss.score);
            triggerBossDeath(game);
          }
        }
      }

      if (hit) {
        bullets.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.tick++;

      switch (e.type) {
        case 'basic':
          if (e.tick < 30) {
            // Entry swoop: curve inward
            const entryT = e.tick / 30;
            e.y += e.vy * entryT * dtScale;
            e.x += Math.sin(e.phase + entryT * Math.PI) * 3 * dtScale;
          } else {
            e.y += e.vy * dtScale;
            e.x += Math.sin(e.tick * 0.03 + e.phase) * 0.8 * dtScale;
          }
          break;
        case 'fast':
          if (e.tick < 20) {
            e.y += e.vy * 0.5 * dtScale;
            e.x += e.vx * dtScale;
          } else {
            e.y += e.vy * dtScale;
            e.x += e.vx * dtScale;
            // Slight homing toward player
            if (e.tick % 30 === 0) {
              const dx = player.x + PLAYER_W / 2 - (e.x + e.w / 2);
              e.vx += Math.sign(dx) * 0.3;
              e.vx = clamp(e.vx, -3, 3);
            }
          }
          break;
        case 'zigzag':
          e.y += e.vy * dtScale;
          e.x += Math.sin(e.tick * 0.05 + e.phase) * 2 * dtScale;
          break;
        case 'tough':
          e.y += e.vy * dtScale;
          e.x += Math.sin(e.tick * 0.02 + e.phase) * 1.5 * dtScale;
          // Occasional burst of speed
          if (e.tick > 60 && e.tick % 120 < 20) {
            e.y += e.vy * 2 * dtScale;
          }
          break;
        case 'tank':
          e.y += e.vy * dtScale;
          e.shootTimer++;
          if (e.shootTimer > 60) {
            e.shootTimer = 0;
            const dx = player.x + PLAYER_W / 2 - (e.x + e.w / 2);
            const dy = player.y - (e.y + e.h);
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            enemyBullets.push({ x: e.x + e.w / 2, y: e.y + e.h, vx: dx / d * 2.5, vy: dy / d * 2.5 });
          }
          break;
        case 'turret':
          e.y += e.vy * dtScale;
          e.shootTimer++;
          if (e.shootTimer > 45) {
            e.shootTimer = 0;
            const angle = Math.atan2(player.y - e.y, player.x + PLAYER_W / 2 - (e.x + e.w / 2));
            for (let s = -1; s <= 1; s++) {
              const a = angle + s * 0.3;
              enemyBullets.push({ x: e.x + e.w / 2, y: e.y + e.h, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5 });
            }
          }
          break;
      }

      // Remove offscreen
      if (e.y > H + 50 || e.x < -80 || e.x > W + 80) {
        enemies.splice(i, 1);
        continue;
      }

      // Collision with player
      if (invincibleTimer <= 0 && rectCollide(player.x, player.y, PLAYER_W, PLAYER_H, e.x, e.y, e.w, e.h)) {
        playerHit(game);
        e.hp -= 5;
        if (e.hp <= 0) {
          addScore(e.score);
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 10);
          sfx.explosionSmall();
          enemies.splice(i, 1);
        }
      }
    }

    // Update boss
    updateBoss();

    // Boss collision with player
    if (boss && invincibleTimer <= 0 && boss.entryComplete) {
      if (rectCollide(player.x, player.y, PLAYER_W, PLAYER_H, boss.x, boss.y, boss.w, boss.h)) {
        playerHit(game);
      }
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;
      if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (invincibleTimer <= 0 && rectCollide(b.x - 3, b.y - 3, 6, 6, player.x, player.y, PLAYER_W, PLAYER_H)) {
        enemyBullets.splice(i, 1);
        playerHit(game);
      }
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy;
      p.tick++;
      if (p.y > H + 20) { powerups.splice(i, 1); continue; }
      if (rectCollide(player.x - 5, player.y - 5, PLAYER_W + 10, PLAYER_H + 10, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h)) {
        if (p.type === 'bomb') {
          bombs = Math.min(bombs + 1, MAX_BOMBS + 2);
        } else {
          const newWeapon = p.type === 'vulcan' ? WEAPON.VULCAN : p.type === 'laser' ? WEAPON.LASER : WEAPON.MISSILE;
          if (newWeapon === weaponType) {
            weaponLevel = Math.min(weaponLevel + 1, 3);
          } else {
            weaponType = newWeapon;
            weaponLevel = 1;
          }
        }
        addScore(50);
        sfx.powerupCollect();
        powerups.splice(i, 1);
      }
    }

    // Update medals
    for (let i = medals.length - 1; i >= 0; i--) {
      const m = medals[i];
      m.y += m.vy;
      m.tick++;
      if (m.y > H + 20) { medals.splice(i, 1); continue; }
      // Medal sparkle particles
      if (tick % 3 === 0) {
        medalSparkles.push({
          x: m.x + rand(-6, 6),
          y: m.y + rand(-6, 6),
          vx: rand(-0.5, 0.5),
          vy: rand(-0.3, 0.3),
          life: randInt(6, 10),
          maxLife: 10,
          color: ['#fd0', '#fc0', '#fa0', '#fff'][randInt(0, 3)]
        });
      }
      if (rectCollide(player.x - 5, player.y - 5, PLAYER_W + 10, PLAYER_H + 10, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h)) {
        addScore(MEDAL_SCORE);
        sfx.medalCollect();
        for (let s = 0; s < 6; s++) {
          particles.push({
            x: m.x, y: m.y,
            vx: rand(-2, 2), vy: rand(-2, 2),
            life: 15, maxLife: 15,
            color: '#fd0', size: 3
          });
        }
        medals.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dtScale;
      p.y += p.vy * dtScale;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update thruster particles
    for (let i = thrusterParticles.length - 1; i >= 0; i--) {
      const p = thrusterParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) thrusterParticles.splice(i, 1);
    }

    // Update missile trails
    for (let i = missileTrails.length - 1; i >= 0; i--) {
      const p = missileTrails[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) missileTrails.splice(i, 1);
    }

    // Update vulcan trails
    for (let i = vulcanTrails.length - 1; i >= 0; i--) {
      vulcanTrails[i].life--;
      if (vulcanTrails[i].life <= 0) vulcanTrails.splice(i, 1);
    }

    // Update medal sparkles
    for (let i = medalSparkles.length - 1; i >= 0; i--) {
      const s = medalSparkles[i];
      s.x += s.vx; s.y += s.vy; s.life--;
      if (s.life <= 0) medalSparkles.splice(i, 1);
    }
    if (medalSparkles.length > 60) medalSparkles.length = 60;
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (shakeTimer > 0) {
      shakeX = rand(-screenShake, screenShake);
      shakeY = rand(-screenShake, screenShake);
    }

    // Danger-responsive background overlay
    const enemyCount = enemies.length;
    const dangerLevel = Math.min(1, enemyCount / 15 + (MAX_LIVES - lives) / MAX_LIVES * 0.3);
    const bgR = Math.round(26 + dangerLevel * 30);
    const bgG = Math.round(26 - dangerLevel * 10);
    const bgB = Math.round(46 + dangerLevel * 15);
    renderer.fillRect(0, 0, W, H, `rgba(${bgR}, ${bgG}, ${bgB}, 0.15)`);

    // Enhanced scrolling stars with twinkle and layers
    for (let i = 0; i < TOTAL_STARS; i++) {
      const s = starData[i];
      const sx = s.xSeed + shakeX;
      const sy = ((s.ySeed + (scrollY * s.speedFactor)) % H) + shakeY;
      // Twinkle: sine wave on alpha based on tick and star offset
      const twinkle = Math.sin(tick * 0.04 + s.twinkleOffset) * 0.5 + 0.5;
      const alpha = s.baseAlpha * (0.5 + twinkle * 0.5);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      const size = s.minSize + (s.maxSize - s.minSize) * twinkle;
      renderer.fillCircle(sx, sy, size, '#ffffff' + a);
    }

    // Ground terrain patches with glow edges
    groundObjects.forEach(g => {
      if (g.type === 3) return;
      const color = g.type === 0 ? '#16213e' : g.type === 1 ? '#1a2940' : '#0f2035';
      renderer.setGlow('#0f3460', 0.2);
      renderer.fillRect(g.x + shakeX, g.y + shakeY, g.w, g.h, color);
      renderer.setGlow(null);
      // Stroke outline using thin rects
      renderer.fillRect(g.x + shakeX, g.y + shakeY, g.w, 1, '#0f3460');
      renderer.fillRect(g.x + shakeX, g.y + g.h - 1 + shakeY, g.w, 1, '#0f3460');
      renderer.fillRect(g.x + shakeX, g.y + shakeY, 1, g.h, '#0f3460');
      renderer.fillRect(g.x + g.w - 1 + shakeX, g.y + shakeY, 1, g.h, '#0f3460');
    });

    // Missile smoke trails (draw behind bullets)
    for (let i = 0; i < missileTrails.length; i++) {
      const p = missileTrails[i];
      const alpha = p.life / p.maxLife;
      const a = Math.round(alpha * 0.4 * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(p.x + shakeX, p.y + shakeY, p.size, '#888888' + a);
    }

    // Vulcan trail dots (draw behind bullets)
    for (let i = 0; i < vulcanTrails.length; i++) {
      const vt = vulcanTrails[i];
      const alpha = vt.life / vt.maxLife;
      const a = Math.round(alpha * 0.5 * 255).toString(16).padStart(2, '0');
      renderer.fillCircle(vt.x + shakeX, vt.y + shakeY, vt.size, '#ff4444' + a);
    }

    // Powerups
    powerups.forEach(p => {
      const pulse = Math.sin(p.tick * 0.1) * 0.3 + 0.7;
      let color;
      switch (p.type) {
        case 'vulcan': color = '#f44'; break;
        case 'laser': color = '#48f'; break;
        case 'missile': color = '#4f4'; break;
        case 'bomb': color = '#fd0'; break;
      }
      renderer.setGlow(color, pulse * 0.6);
      renderer.fillRect(p.x - p.w / 2 + shakeX, p.y - p.h / 2 + shakeY, p.w, p.h, color);
      renderer.setGlow(null);
      const letter = p.type === 'bomb' ? 'B' : p.type[0].toUpperCase();
      text.drawText(letter, p.x + shakeX, p.y - 6 + shakeY, 12, '#fff', 'center');
    });

    // Medal sparkles
    for (const s of medalSparkles) {
      const alpha = s.life / s.maxLife;
      const a = Math.round(alpha * 200).toString(16).padStart(2, '0');
      renderer.fillCircle(s.x + shakeX, s.y + shakeY, 1.5, expandHex(s.color) + a);
    }

    // Medals (diamond shapes)
    medals.forEach(m => {
      const pulse = Math.sin(m.tick * 0.15) * 0.3 + 0.7;
      const hw = m.w / 2;
      const hh = m.h / 2;
      const mx = m.x + shakeX;
      const my = m.y + shakeY;
      const alpha = Math.round(pulse * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#fd0', 0.5);
      renderer.fillPoly([
        { x: mx, y: my - hh },
        { x: mx + hw, y: my },
        { x: mx, y: my + hh },
        { x: mx - hw, y: my }
      ], '#ffdc00' + alpha);
      renderer.setGlow(null);
    });

    // Enemies
    enemies.forEach(e => {
      drawEnemy(renderer, text, e, shakeX, shakeY);
    });

    // Boss
    if (boss) {
      drawBoss(renderer, text, shakeX, shakeY);
    }

    // Thruster particles (draw behind player, before player bullets for layering)
    for (let i = 0; i < thrusterParticles.length; i++) {
      const p = thrusterParticles[i];
      const alpha = p.life / p.maxLife;
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // Orange to yellow gradient based on life
      const r = 255;
      const g = Math.round(140 + (1 - alpha) * 100);
      const b = Math.round(20 + (1 - alpha) * 40);
      const color = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0') + a;
      renderer.setGlow('#fd0', alpha * 0.4);
      renderer.fillCircle(p.x + shakeX, p.y + shakeY, p.size * alpha, color);
      renderer.setGlow(null);
    }

    // Player bullets
    bullets.forEach(b => {
      const bx = b.x + shakeX;
      const by = b.y + shakeY;
      switch (b.type) {
        case 'vulcan':
          renderer.setGlow('#f44', 0.4);
          renderer.fillRect(bx - 2, by - 4, 4, 8, '#f44');
          renderer.setGlow(null);
          break;
        case 'laser': {
          const lw = b.w || 4, lh = b.h || 20;
          const pulseW = lw + Math.sin(tick * 0.3) * 2;
          // Outer glow beam
          renderer.setGlow('#08f', 1.2);
          renderer.fillRect(bx - pulseW / 2 - 2, by - lh / 2, pulseW + 4, lh, 'rgba(0, 128, 255, 0.2)');
          // Inner beam
          renderer.fillRect(bx - pulseW / 2, by - lh / 2, pulseW, lh, '#48f');
          // Core bright center
          renderer.fillRect(bx - 1, by - lh / 2, 2, lh, '#8bf');
          renderer.setGlow(null);
          break;
        }
        case 'missile': {
          renderer.setGlow('#4f4', 0.4);
          renderer.fillPoly([
            { x: bx, y: by - 5 },
            { x: bx + 3, y: by + 4 },
            { x: bx - 3, y: by + 4 }
          ], '#4f4');
          renderer.setGlow(null);
          // Exhaust
          renderer.fillRect(bx - 1, by + 4, 2, 3, '#fd0');
          break;
        }
      }
    });

    // Enemy bullets
    renderer.setGlow('#f84', 0.4);
    enemyBullets.forEach(b => {
      renderer.fillCircle(b.x + shakeX, b.y + shakeY, 3, '#f84');
    });
    renderer.setGlow(null);

    // Player
    if (invincibleTimer <= 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
      drawPlayer(renderer, shakeX, shakeY);
    }

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      let hexColor = expandHex(p.color);
      renderer.fillCircle(
        p.x + shakeX,
        p.y + shakeY,
        p.size / 2,
        hexColor + a
      );
    });

    // Bomb flash overlay
    if (bombFlash > 0) {
      const flashAlpha = bombFlash / BOMB_FLASH_DURATION * 0.6;
      const a = Math.round(flashAlpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(-10 + shakeX, -10 + shakeY, W + 20, H + 20, '#ffffff' + a);
    }

    // HUD
    drawHUD(renderer, text, shakeX, shakeY);

    // Stage transition text (glitch effect)
    if (stageTextTimer > 0) {
      const fadeAlpha = Math.min(1, stageTextTimer / 30);
      const a = Math.round(fadeAlpha * 255).toString(16).padStart(2, '0');
      const glowIntensity = fadeAlpha * 0.8;

      const baseText = `STAGE ${stageTextNum} CLEAR`;

      // Glitch effect: scramble characters when timer > 80
      let displayText = baseText;
      if (stageTextTimer > 80) {
        const glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&';
        displayText = '';
        for (let i = 0; i < baseText.length; i++) {
          if (baseText[i] === ' ') {
            displayText += ' ';
          } else if (Math.random() < 0.6) {
            displayText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            displayText += baseText[i];
          }
        }
      } else if (stageTextTimer > 60) {
        // Partial resolve
        displayText = '';
        for (let i = 0; i < baseText.length; i++) {
          if (baseText[i] === ' ') {
            displayText += ' ';
          } else if (Math.random() < 0.2) {
            const glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            displayText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            displayText += baseText[i];
          }
        }
      }

      // Chromatic aberration offset
      const offsetX = stageTextTimer > 60 ? (Math.random() - 0.5) * 4 : 0;
      const offsetY = stageTextTimer > 60 ? (Math.random() - 0.5) * 2 : 0;

      renderer.setGlow('#fd0', glowIntensity);
      // Red channel offset
      if (stageTextTimer > 60) {
        text.drawText(displayText, W / 2 - 2 + offsetX, H / 2 - 40 + offsetY, 28, `rgba(255, 0, 0, ${(fadeAlpha * 0.3).toFixed(2)})`, 'center');
        text.drawText(displayText, W / 2 + 2 + offsetX, H / 2 - 40 - offsetY, 28, `rgba(0, 255, 255, ${(fadeAlpha * 0.3).toFixed(2)})`, 'center');
      }
      text.drawText(displayText, W / 2, H / 2 - 40, 28, '#ffdd00' + a, 'center');
      renderer.setGlow(null);

      // Sub-text
      if (stageTextTimer < 80) {
        text.drawText('GET READY!', W / 2, H / 2 - 10, 14, '#ffdd00' + a, 'center');
      }
    }
  };

  game.start();
  return game;
}

// ── Drawing helpers ──

function drawPlayer(renderer, sx, sy) {
  const px = player.x + sx;
  const py = player.y + sy;

  renderer.setGlow('#f28', 0.7);

  // Main body (triangle-ish ship)
  renderer.fillPoly([
    { x: px + PLAYER_W / 2, y: py - 6 },
    { x: px + PLAYER_W - 2, y: py + PLAYER_H - 4 },
    { x: px + PLAYER_W, y: py + PLAYER_H },
    { x: px, y: py + PLAYER_H },
    { x: px + 2, y: py + PLAYER_H - 4 }
  ], '#f28');

  renderer.setGlow(null);

  // Cockpit
  renderer.fillCircle(px + PLAYER_W / 2, py + 6, 4, '#fff');

  // Wings
  renderer.fillRect(px - 4, py + PLAYER_H - 10, 8, 6, '#d14');
  renderer.fillRect(px + PLAYER_W - 4, py + PLAYER_H - 10, 8, 6, '#d14');

  // Engine glow when firing or thrusting upward
  if (fireTimer > 0) {
    const flicker = rand(3, 8);
    renderer.setGlow('#fd0', 0.5);
    renderer.fillRect(px + PLAYER_W / 2 - 3, py + PLAYER_H, 6, flicker, '#fd0');
    renderer.setGlow(null);
  }
}

function drawEnemy(renderer, text, e, sx, sy) {
  const ex = e.x + sx;
  const ey = e.y + sy;

  switch (e.type) {
    case 'basic':
      renderer.setGlow(e.color, 0.4);
      renderer.fillPoly([
        { x: ex + e.w / 2, y: ey },
        { x: ex + e.w, y: ey + e.h / 2 },
        { x: ex + e.w / 2, y: ey + e.h },
        { x: ex, y: ey + e.h / 2 }
      ], e.color);
      renderer.setGlow(null);
      break;

    case 'fast':
      renderer.setGlow(e.color, 0.4);
      renderer.fillPoly([
        { x: ex + e.w / 2, y: ey },
        { x: ex + e.w, y: ey + e.h },
        { x: ex, y: ey + e.h }
      ], e.color);
      renderer.setGlow(null);
      break;

    case 'zigzag':
      renderer.setGlow(e.color, 0.5);
      renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, e.w / 2, e.color);
      renderer.setGlow(null);
      renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, e.w / 4, '#1a1a2e');
      break;

    case 'tough': {
      const hpPct = e.hp / e.maxHp;
      const color = hpPct > 0.5 ? e.color : '#f4a';
      renderer.setGlow(e.color, 0.5);
      renderer.fillRect(ex + 2, ey + 2, e.w - 4, e.h - 4, color);
      renderer.setGlow(null);
      // Stroke border using thin rects
      renderer.fillRect(ex + 2, ey + 2, e.w - 4, 1, '#fff');
      renderer.fillRect(ex + 2, ey + e.h - 3, e.w - 4, 1, '#fff');
      renderer.fillRect(ex + 2, ey + 2, 1, e.h - 4, '#fff');
      renderer.fillRect(ex + e.w - 3, ey + 2, 1, e.h - 4, '#fff');
      // HP bar
      renderer.fillRect(ex, ey - 5, e.w, 3, '#400');
      renderer.fillRect(ex, ey - 5, e.w * hpPct, 3, '#0f0');
      break;
    }

    case 'tank': {
      const thpPct = e.hp / e.maxHp;
      renderer.setGlow('#aaa', 0.4);
      renderer.fillRect(ex, ey + 6, e.w, e.h - 6, e.color);
      renderer.fillRect(ex + 4, ey, e.w - 8, e.h, e.color);
      renderer.setGlow(null);
      // Turret
      renderer.fillRect(ex + e.w / 2 - 4, ey + e.h - 4, 8, 8, '#aaa');
      // HP bar
      renderer.fillRect(ex, ey - 6, e.w, 3, '#400');
      renderer.fillRect(ex, ey - 6, e.w * thpPct, 3, '#0f0');
      break;
    }

    case 'turret': {
      renderer.setGlow(e.color, 0.4);
      // Base
      renderer.fillRect(ex + 2, ey + e.h / 2, e.w - 4, e.h / 2, e.color);
      // Dome (approximate as circle)
      renderer.fillCircle(ex + e.w / 2, ey + e.h / 2, e.w / 2 - 2, e.color);
      renderer.setGlow(null);
      // Gun barrel — draw as a thick line towards the player
      const gunAngle = Math.atan2(player.y - (e.y + e.h / 2), player.x + PLAYER_W / 2 - (e.x + e.w / 2));
      const gunLen = 18;
      const gx1 = ex + e.w / 2;
      const gy1 = ey + e.h / 2;
      const gx2 = gx1 + Math.cos(gunAngle) * gunLen;
      const gy2 = gy1 + Math.sin(gunAngle) * gunLen;
      renderer.drawLine(gx1, gy1, gx2, gy2, '#888', 4);
      // HP bar
      const turHpPct = e.hp / e.maxHp;
      renderer.fillRect(ex, ey - 6, e.w, 3, '#400');
      renderer.fillRect(ex, ey - 6, e.w * turHpPct, 3, '#0f0');
      break;
    }
  }
}

function drawBoss(renderer, text, sx, sy) {
  if (!boss) return;
  const b = boss;
  const bx = b.x + sx;
  const by = b.y + sy;
  const hpPct = b.hp / b.maxHp;

  // Damage color: more red as hp decreases
  const r = Math.round(200 + (1 - hpPct) * 55);
  const g = Math.round(50 * hpPct);
  const bl = Math.round(80 * hpPct);
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = bl.toString(16).padStart(2, '0');
  const hullColor = '#' + rHex + gHex + bHex;

  // HP-phase color shift
  const phaseGlow = hpPct > 0.5 ? '#f28' : hpPct > 0.25 ? '#f44' : '#f00';
  const phasePulse = hpPct > 0.25 ? 0.8 : 1.2;

  renderer.setGlow(phaseGlow, phasePulse);

  // Main hull
  renderer.fillPoly([
    { x: bx + b.w / 2, y: by },
    { x: bx + b.w + 10, y: by + b.h * 0.6 },
    { x: bx + b.w, y: by + b.h },
    { x: bx, y: by + b.h },
    { x: bx - 10, y: by + b.h * 0.6 }
  ], hullColor);

  // Center core (pulsing)
  const pulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
  const coreAlpha = Math.round(pulse * 255).toString(16).padStart(2, '0');
  renderer.setGlow(phaseGlow, pulse);
  renderer.fillCircle(bx + b.w / 2, by + b.h * 0.45, 12, '#ff2288' + coreAlpha);

  renderer.setGlow(null);

  // Side engines
  renderer.fillRect(bx - 8, by + 10, 12, 30, '#888');
  renderer.fillRect(bx + b.w - 4, by + 10, 12, 30, '#888');

  // Engine glow
  const flicker1 = rand(4, 10);
  const flicker2 = rand(4, 10);
  renderer.setGlow('#f84', 0.5);
  renderer.fillRect(bx - 6, by + b.h, 8, flicker1, '#f84');
  renderer.fillRect(bx + b.w - 2, by + b.h, 8, flicker2, '#f84');
  renderer.setGlow(null);

  // Damage sparks when low HP
  if (hpPct < 0.5 && Math.random() < 0.3) {
    const sparkX = bx + rand(0, b.w);
    const sparkY = by + rand(0, b.h);
    renderer.setGlow('#f84', 0.5);
    renderer.fillCircle(sparkX, sparkY, rand(1, 3), '#f84');
    renderer.setGlow(null);
  }

  // HP bar
  const barW = b.w + 20;
  const barX = bx - 10;
  renderer.fillRect(barX, by - 12, barW, 6, '#400');
  const hpColor = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
  renderer.fillRect(barX, by - 12, barW * hpPct, 6, hpColor);
  // HP bar border
  renderer.fillRect(barX, by - 12, barW, 1, '#888');
  renderer.fillRect(barX, by - 7, barW, 1, '#888');
  renderer.fillRect(barX, by - 12, 1, 6, '#888');
  renderer.fillRect(barX + barW - 1, by - 12, 1, 6, '#888');

  // Boss label
  text.drawText(`STAGE ${stage} BOSS`, bx + b.w / 2, by - 24, 10, '#f28', 'center');
}

function drawHUD(renderer, text, sx, sy) {
  // Lives (small triangles at bottom left)
  for (let i = 0; i < lives; i++) {
    const lx = 10 + i * 22 + sx;
    const ly = H - 25 + sy;
    renderer.setGlow('#f28', 0.3);
    renderer.fillPoly([
      { x: lx + 6, y: ly },
      { x: lx + 12, y: ly + 10 },
      { x: lx, y: ly + 10 }
    ], '#f28');
    renderer.setGlow(null);
  }

  // Bombs (small circles above lives)
  renderer.setGlow('#fd0', 0.3);
  for (let i = 0; i < bombs; i++) {
    const bx = 10 + i * 18 + sx;
    const by = H - 40 + sy;
    renderer.fillCircle(bx + 6, by + 5, 5, '#fd0');
    renderer.fillRect(bx + 4, by - 2, 4, 4, '#fd0');
  }
  renderer.setGlow(null);

  // Weapon indicator (bottom right)
  const wColor = WEAPON_COLORS[weaponType];
  text.drawText(`${WEAPON_NAMES[weaponType]} Lv${weaponLevel}`, W - 10 + sx, H - 38 + sy, 12, wColor, 'right');

  // Stage indicator
  text.drawText(`Stage ${stage}`, W - 10 + sx, H - 20 + sy, 11, '#aaa', 'right');

  // Boss warning (blink with glow + red border flash)
  if (bossActive && boss && !boss.entryComplete) {
    const warnPhase = Math.sin(tick * 0.15);
    if (warnPhase > 0) {
      const warnGlow = warnPhase * 0.5 + 0.5;
      renderer.setGlow('#f28', warnGlow);
      text.drawText('WARNING', W / 2 + sx, H / 2 - 50 + sy, 28, '#f28', 'center');
      text.drawText('BOSS APPROACHING', W / 2 + sx, H / 2 - 20 + sy, 14, '#f28', 'center');
      renderer.setGlow(null);
    }
    // Red border flash
    const borderAlpha = (Math.sin(tick * 0.2) * 0.5 + 0.5) * 0.15;
    const ba = `rgba(255, 40, 40, ${borderAlpha.toFixed(3)})`;
    renderer.fillRect(0, 0, W, 4, ba);       // top
    renderer.fillRect(0, H - 4, W, 4, ba);   // bottom
    renderer.fillRect(0, 0, 4, H, ba);       // left
    renderer.fillRect(W - 4, 0, 4, H, ba);  // right
  }
}
