import { Game } from '../engine/core.js';
import { PLANES, getPlaneById } from './content/planes.js';
import { POWERUPS, rollPowerup } from './content/powerups.js';
import { CAMPAIGNS, getCampaign } from './content/campaigns.js';
import { ENEMIES, MINI_BOSSES, FINAL_BOSSES } from './content/enemies.js';
import { getDialogue } from './content/dialogue.js';
import { getSprite, colorForKey } from './content/sprites.js';

const W = 960;
const H = 1280;
const PLAYER_SCALE = 6;
const ENEMY_SCALE = 6;
const BOSS_SCALE = 8;
const BULLET_SIZE = 8;
const ROLL_DURATION = 30;
const ROLL_IFRAMES = 22;
const ROLL_SPEED = 12.2;
const ROLL_TRAIL_MAX = 4;

class Sfx {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, type, duration, gainVal = 0.08) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  noise(duration = 0.12, gainVal = 0.15) {
    const ctx = this.ensure();
    const size = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  shoot() { this.tone(920, 'square', 0.05, 0.07); }
  enemyShoot() { this.tone(420, 'sawtooth', 0.06, 0.07); }
  hit() { this.noise(0.08, 0.12); }
  explode() { this.noise(0.18, 0.18); this.tone(130, 'sine', 0.15, 0.1); }
  roll() { this.tone(520, 'triangle', 0.12, 0.08); }
  pickup() { this.tone(680, 'sine', 0.08, 0.1); setTimeout(() => this.tone(980, 'sine', 0.1, 0.09), 70); }
  bossWarn() { this.tone(160, 'square', 0.12, 0.12); setTimeout(() => this.tone(130, 'square', 0.12, 0.1), 140); }
}

const sfx = new Sfx();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spriteSize(spriteId, scale) {
  const sprite = getSprite(spriteId);
  const h = sprite.length;
  const w = sprite[0].length;
  return { w: w * scale, h: h * scale };
}

function drawPixelSprite(renderer, spriteId, x, y, scale, tintColor, alpha = 1) {
  const sprite = getSprite(spriteId);
  for (let py = 0; py < sprite.length; py++) {
    const row = sprite[py];
    for (let px = 0; px < row.length; px++) {
      const key = row[px];
      if (key === '.') continue;
      let c = colorForKey(key, tintColor);
      if (!c) continue;
      if (alpha < 1) {
        c = c.startsWith('#')
          ? hexToRgba(c, alpha)
          : c.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
      }
      renderer.fillRect(Math.floor(x + px * scale), Math.floor(y + py * scale), scale, scale, c);
    }
  }
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function makePlayer(planeId) {
  const plane = getPlaneById(planeId);
  const size = spriteSize(`plane_${plane.id}`, PLAYER_SCALE);
  return {
    planeId: plane.id,
    plane,
    x: W / 2 - size.w / 2,
    y: H - 240,
    w: size.w,
    h: size.h,
    lives: 3,
    bombs: 2,
    fireCooldown: 0,
    specialCooldown: 0,
    specialTimer: 0,
    rollTimer: 0,
    rollInvuln: 0,
    vx: 0,
    vy: 0,
    rollVx: 0,
    rollVy: -1,
    rollCooldown: 0,
    invuln: 0,
    shieldTimer: 0,
    speedBoostTimer: 0,
    doubleShotTimer: 0,
    rollTrail: [],
    lastSpacePressedAt: -100,
    lastMoveX: 0,
    lastMoveY: -1,
  };
}

function makeInitialState(planeId) {
  return {
    score: 0,
    best: Number(localStorage.getItem('openarcade_1942_best') || 0),
    tick: 0,
    campaignIndex: 0,
    wave: 0,
    waveDelay: 50,
    phase: 'campaign_intro',
    player: makePlayer(planeId),
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    ambience: [],
    dialogue: null,
    pendingDialogue: [],
    flashTimer: 0,
    waveClearTimer: 0,
    waveClearBonusAwarded: false,
    bossWarningTimer: 0,
    pendingBossWave: false,
    shownMilestones: new Set(),
    scorePops: [],
  };
}

function createEnemy(enemyId, x, y, pattern, difficulty = 1, tier = 'normal') {
  const def = tier === 'normal'
    ? ENEMIES[enemyId]
    : tier === 'mini'
      ? MINI_BOSSES[enemyId]
      : FINAL_BOSSES[enemyId];
  const anim = def.anim[0];
  const scale = tier === 'normal' ? ENEMY_SCALE : BOSS_SCALE;
  const size = spriteSize(anim, scale);
  return {
    id: enemyId,
    def,
    tier,
    x,
    y,
    w: size.w,
    h: size.h,
    pattern,
    hp: Math.round(def.hp * (1 + difficulty * 0.1)),
    maxHp: Math.round(def.hp * (1 + difficulty * 0.1)),
    fireTimer: Math.floor(rand(12, 80)),
    animTimer: 0,
    frame: 0,
    t: rand(0, 120),
    stunned: 0,
  };
}

function queueDialogue(state, lines, hold = 260) {
  if (!lines || !lines.length) return;
  state.pendingDialogue.push({
    lines,
    timer: hold,
    hold,
  });
}

function popDialogueIfNeeded(state) {
  if (!state.dialogue && state.pendingDialogue.length > 0) {
    state.dialogue = state.pendingDialogue.shift();
  }
}

function spawnPowerup(state, x, y, fixedId = null) {
  const def = fixedId ? POWERUPS.find((p) => p.id === fixedId) : rollPowerup();
  if (!def) return;
  state.powerups.push({
    id: def.id,
    x,
    y,
    w: 42,
    h: 42,
    vy: 2.8,
    bob: rand(0, Math.PI * 2),
  });
}

function spawnExplosion(state, x, y, color = '#ff8f5c', count = 12) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: rand(-4.4, 4.4),
      vy: rand(-4.4, 4.4),
      life: rand(18, 36),
      maxLife: rand(18, 36),
      color,
      r: rand(4, 8),
    });
  }
}

function enemyPatternVelocity(enemy, player) {
  const e = enemy;
  const speed = e.def.speed * 2;
  const t = e.t * 0.045;
  switch (e.pattern) {
    case 'line': return { vx: 0, vy: speed };
    case 'vee': return { vx: Math.sin(t) * 2.2, vy: speed };
    case 'cross': return { vx: Math.sign(Math.sin(t)) * 3.0, vy: speed * 0.92 };
    case 'stagger': return { vx: Math.sin(t * 1.8) * 2.8, vy: speed * 0.95 };
    case 'swirl': return { vx: Math.cos(t) * 3.6, vy: speed * 0.88 };
    case 'mini': return { vx: Math.sin(t * 0.8) * 2.8, vy: 1.2 };
    case 'boss': {
      const dx = player.x + player.w / 2 - (e.x + e.w / 2);
      const clampV = clamp(dx * 0.02, -2.8, 2.8);
      const yTarget = 160;
      const dy = yTarget - e.y;
      return { vx: clampV, vy: clamp(dy * 0.03, -2.4, 2.4) };
    }
    default: return { vx: 0, vy: speed };
  }
}

function spawnWave(state) {
  const campaign = getCampaign(state.campaignIndex);
  state.wave += 1;

  const waveKey = `${campaign.id}:${state.wave}`;
  if (campaign.minibossWaves.includes(state.wave)) {
    if (!state.shownMilestones.has(`${waveKey}:mini`)) {
      queueDialogue(state, getDialogue(campaign.id, 'miniboss'));
      state.shownMilestones.add(`${waveKey}:mini`);
      sfx.bossWarn();
    }
    const mini = createEnemy(campaign.miniboss, W / 2 - 96, -180, 'mini', state.campaignIndex + 1, 'mini');
    state.enemies.push(mini);
    return;
  }

  if (state.wave === campaign.finalWave) {
    if (!state.shownMilestones.has(`${waveKey}:boss`)) {
      queueDialogue(state, getDialogue(campaign.id, 'boss'), 280);
      state.shownMilestones.add(`${waveKey}:boss`);
      sfx.bossWarn();
    }
    const boss = createEnemy(campaign.finalBoss, W / 2 - 152, -240, 'boss', state.campaignIndex + 1, 'final');
    state.enemies.push(boss);
    return;
  }

  const spec = campaign.waves[(state.wave - 1) % campaign.waves.length];
  const count = spec.count + Math.min(state.campaignIndex, 2);
  for (let i = 0; i < count; i++) {
    const id = spec.mix[i % spec.mix.length];
    let x = 80 + (i % 6) * 140;
    let y = -60 - Math.floor(i / 6) * 88;
    if (spec.pattern === 'vee') {
      const col = i % 9;
      x = W / 2 + (col - 4) * 52;
      y = -60 - Math.abs(col - 4) * 28 - Math.floor(i / 9) * 104;
    }
    if (spec.pattern === 'swirl') {
      x = W / 2 + Math.sin(i * 0.8) * 240;
      y = -60 - i * 68;
    }
    state.enemies.push(createEnemy(id, x, y, spec.pattern, state.campaignIndex + 1, 'normal'));
  }
}

function spawnAmbient(state, theme) {
  if (state.ambience.length > 24) return;
  const r = Math.random();
  const type = theme.wildlife[Math.floor(rand(0, theme.wildlife.length))];
  if (r < 0.28) {
    state.ambience.push({ type, x: rand(40, W - 120), y: -80, size: rand(44, 120), vy: rand(0.8, 2.4) });
  }
}

function drawAmbient(renderer, ambient, campaign) {
  const theme = campaign.theme;
  for (const a of ambient) {
    if (a.type === 'whale') {
      renderer.fillRect(a.x, a.y, a.size, 20, '#3f6c8e');
      renderer.fillRect(a.x + 16, a.y - 10, a.size * 0.35, 8, '#4e7ea3');
    } else if (a.type === 'islands') {
      renderer.fillRect(a.x, a.y, a.size, 16, '#d5bc84');
      renderer.fillRect(a.x + 10, a.y - 22, a.size * 0.6, 22, '#4b7c45');
    } else if (a.type === 'gulls' || a.type === 'birds') {
      renderer.fillRect(a.x, a.y, 12, 4, '#eaeff7');
      renderer.fillRect(a.x + 14, a.y + 2, 10, 4, '#eaeff7');
    } else if (a.type === 'treeline') {
      renderer.fillRect(a.x, a.y, a.size, 20, '#27492d');
      renderer.fillRect(a.x + 8, a.y - 24, 16, 24, '#446d31');
      renderer.fillRect(a.x + 32, a.y - 32, 18, 32, '#4d7935');
    } else if (a.type === 'river') {
      renderer.fillRect(a.x, a.y, a.size, 14, '#5f90bd');
    } else if (a.type === 'dunes') {
      renderer.fillRect(a.x, a.y, a.size, 16, '#be8a52');
      renderer.fillRect(a.x + 20, a.y - 6, a.size * 0.4, 8, '#d4a065');
    } else if (a.type === 'convoy') {
      renderer.fillRect(a.x, a.y, a.size, 16, '#6e5743');
      renderer.fillRect(a.x + 16, a.y - 16, a.size * 0.3, 16, '#92745b');
    } else if (a.type === 'storm') {
      renderer.fillRect(a.x, a.y, a.size, 24, '#4b5578');
      renderer.fillRect(a.x + 10, a.y + 20, a.size * 0.2, 12, '#68739a');
    } else if (a.type === 'subs') {
      renderer.fillRect(a.x, a.y, a.size * 0.8, 14, '#596286');
      renderer.fillRect(a.x + 6, a.y - 8, a.size * 0.25, 8, '#777fa3');
    } else if (a.type === 'lightning') {
      renderer.fillRect(a.x, a.y, 6, a.size, '#d9e3ff');
      renderer.fillRect(a.x + 6, a.y + 16, 6, a.size * 0.4, '#f5f8ff');
    } else {
      renderer.fillRect(a.x, a.y, a.size, 16, theme.hazard);
    }
  }
}

function buildPowerupSprite(id) {
  if (id === 'double-shot') return 'pickup_double';
  if (id === 'speed-boost') return 'pickup_speed';
  if (id === 'shield') return 'pickup_shield';
  if (id === 'repair') return 'pickup_repair';
  return 'pickup_bomb';
}

function startRoll(player, dirX, dirY) {
  if (player.rollCooldown > 0 || player.rollTimer > 0) return;
  const mag = Math.hypot(dirX, dirY) || 1;
  const nx = mag > 0 ? dirX / mag : 0;
  const ny = mag > 0 ? dirY / mag : -1;
  player.rollTimer = ROLL_DURATION;
  player.rollCooldown = player.plane.rollCooldown;
  player.rollInvuln = ROLL_IFRAMES;
  player.rollVx = nx;
  player.rollVy = ny;
  sfx.roll();
}

function spawnPlayerBullets(state, mode = 'normal') {
  const p = state.player;
  const baseX = p.x + p.w / 2;
  const baseY = p.y;
  const speed = -17;

  let pattern = [{ vx: 0, vy: speed, pierce: 0 }];
  if (mode === 'burst') {
    pattern = [
      { vx: -4.0, vy: speed + 2.0, pierce: 0 },
      { vx: -2.0, vy: speed, pierce: 0 },
      { vx: 0, vy: speed, pierce: 0 },
      { vx: 2.0, vy: speed, pierce: 0 },
      { vx: 4.0, vy: speed + 2.0, pierce: 0 },
    ];
  } else if (mode === 'rail') {
    pattern = [
      { vx: -1.6, vy: speed - 2.0, pierce: 3 },
      { vx: 1.6, vy: speed - 2.0, pierce: 3 },
    ];
  } else if (p.doubleShotTimer > 0) {
    pattern = [
      { vx: -1.0, vy: speed, pierce: 0 },
      { vx: 1.0, vy: speed, pierce: 0 },
    ];
  }

  for (const b of pattern) {
    state.bullets.push({
      x: baseX - BULLET_SIZE / 2,
      y: baseY,
      w: BULLET_SIZE,
      h: 20,
      vx: b.vx,
      vy: b.vy,
      pierce: b.pierce,
      color: mode === 'rail' ? '#b8d4ff' : '#9df2ff',
    });
  }
  sfx.shoot();
}

function useSpecial(state) {
  const p = state.player;
  if (p.specialCooldown > 0) return;
  const special = p.plane.special;
  if (special.id === 'burst') {
    p.specialTimer = special.duration;
  } else if (special.id === 'rail') {
    spawnPlayerBullets(state, 'rail');
  } else if (special.id === 'phase') {
    p.shieldTimer = Math.max(p.shieldTimer, special.duration);
    p.invuln = Math.max(p.invuln, special.duration);
  } else if (special.id === 'emp') {
    for (const enemy of state.enemies) {
      const dx = enemy.x + enemy.w / 2 - (p.x + p.w / 2);
      const dy = enemy.y + enemy.h / 2 - (p.y + p.h / 2);
      const d2 = dx * dx + dy * dy;
      if (d2 < 360 * 360) {
        enemy.stunned = 90;
        enemy.hp -= 10;
      }
    }
    state.enemyBullets = state.enemyBullets.filter((b) => {
      const dx = b.x - (p.x + p.w / 2);
      const dy = b.y - (p.y + p.h / 2);
      return dx * dx + dy * dy > 300 * 300;
    });
    spawnExplosion(state, p.x + p.w / 2, p.y + p.h / 2, '#8ec5ff', 20);
  }
  p.specialCooldown = special.cooldown;
}

// -- Enemy bullet pattern helpers --
// Speed tiers for color-coding:
//   slow  (<=3.0): large 12px, pink/magenta circle
//   medium (<=5.0): medium 8px, orange diamond
//   fast  (>5.0):  small 6px, bright red circle

function bulletTier(speed) {
  const abs = Math.abs(speed);
  if (abs <= 3.0) return 'slow';
  if (abs <= 5.0) return 'medium';
  return 'fast';
}

function bulletProps(speed) {
  const tier = bulletTier(speed);
  if (tier === 'slow') return { size: 12, color: '#ff44cc', shape: 'circle' };
  if (tier === 'medium') return { size: 8, color: '#ff9933', shape: 'diamond' };
  return { size: 6, color: '#ff2222', shape: 'circle' };
}

function pushEnemyBullet(state, x, y, vx, vy) {
  const speed = Math.hypot(vx, vy);
  const props = bulletProps(speed);
  const half = props.size / 2;
  state.enemyBullets.push({
    x: x - half, y: y - half,
    w: props.size,
    h: props.size,
    vx, vy,
    color: props.color,
    shape: props.shape,
  });
}

function spawnEnemyBullets(state, e, player) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h - 8;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  const baseSpeed = e.def.bulletSpeed * 2;

  // Determine kind: normal enemies use def.kind, bosses use tier
  const kind = e.tier === 'normal' ? (e.def.kind || 'fighter') : e.tier;

  switch (kind) {
    // --- Fighters / scouts: single aimed shot ---
    case 'fighter': {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy) || 1;
      pushEnemyBullet(state, cx, cy, (dx / dist) * baseSpeed, (dy / dist) * baseSpeed);
      break;
    }

    // --- Gunships: 3-round burst spread ---
    case 'gunship': {
      const dx = px - cx;
      const dy = py - cy;
      const angle = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.22;
        pushEnemyBullet(state, cx, cy, Math.cos(a) * baseSpeed, Math.sin(a) * baseSpeed);
      }
      break;
    }

    // --- Bombers: slow large bombs that drop straight down ---
    case 'bomber': {
      const bombSpeed = Math.min(baseSpeed * 0.5, 2.8);
      pushEnemyBullet(state, cx - 12, cy, 0, bombSpeed);
      pushEnemyBullet(state, cx + 12, cy, 0, bombSpeed);
      break;
    }

    // --- Subs: similar to bombers but with slight tracking ---
    case 'sub': {
      const dx = px - cx;
      const dist = Math.abs(dx) || 1;
      const trackVx = clamp(dx / dist * 1.2, -1.2, 1.2);
      const bombSpeed = Math.min(baseSpeed * 0.55, 2.8);
      pushEnemyBullet(state, cx, cy, trackVx, bombSpeed);
      break;
    }

    // --- Mini bosses: rotating spiral pattern ---
    case 'mini': {
      const spiralCount = 5;
      const baseAngle = (e.t * 0.08);
      for (let i = 0; i < spiralCount; i++) {
        const a = baseAngle + (i / spiralCount) * Math.PI * 2;
        const spd = baseSpeed * 0.85;
        pushEnemyBullet(state, cx, cy, Math.cos(a) * spd, Math.sin(a) * spd);
      }
      break;
    }

    // --- Final bosses: dense curtain with safe corridors ---
    case 'final': {
      const curtainCount = 9;
      const gap = Math.floor(rand(1, curtainCount - 1)); // safe corridor index
      const totalWidth = e.w + 80;
      for (let i = 0; i < curtainCount; i++) {
        if (i === gap || i === gap + 1) continue; // safe corridor
        const offsetX = (i - (curtainCount - 1) / 2) * (totalWidth / curtainCount);
        const spd = baseSpeed * 0.7;
        pushEnemyBullet(state, cx + offsetX, cy, rand(-0.3, 0.3), spd);
      }
      // Also fire a couple of aimed shots through the corridor edges
      const dx = px - cx;
      const dy = py - cy;
      const angle = Math.atan2(dy, dx);
      const fastSpeed = baseSpeed * 1.1;
      pushEnemyBullet(state, cx, cy, Math.cos(angle) * fastSpeed, Math.sin(angle) * fastSpeed);
      break;
    }

    // Fallback: single aimed shot
    default: {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy) || 1;
      pushEnemyBullet(state, cx, cy, (dx / dist) * baseSpeed, (dy / dist) * baseSpeed);
      break;
    }
  }
}

function damagePlayer(state) {
  const p = state.player;
  if (p.invuln > 0 || p.shieldTimer > 0 || p.rollInvuln > 0) return;
  p.lives -= 1;
  p.invuln = 120;
  spawnExplosion(state, p.x + p.w / 2, p.y + p.h / 2, '#8ec5ff', 16);
  sfx.hit();
  if (p.lives <= 0) {
    state.best = Math.max(state.best, state.score);
    localStorage.setItem('openarcade_1942_best', String(state.best));
    return true;
  }
  return false;
}

function killEnemy(state, enemy) {
  spawnExplosion(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff8f5c', enemy.tier === 'normal' ? 10 : 24);
  sfx.explode();
  state.score += enemy.def.score;
  state.scorePops.push({ x: enemy.x + enemy.w / 2, y: enemy.y, text: `${enemy.def.score}`, life: 30 });
  if (enemy.tier === 'normal') {
    if (Math.random() < 0.14) spawnPowerup(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
  } else {
    spawnPowerup(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.def.drop);
  }
}

function moveToNextCampaign(state, game) {
  const campaign = getCampaign(state.campaignIndex);
  queueDialogue(state, getDialogue(campaign.id, 'clear'), 220);

  state.campaignIndex += 1;
  state.wave = 0;
  state.waveDelay = 80;
  state.waveClearTimer = 0;
  state.waveClearBonusAwarded = false;
  state.bossWarningTimer = 0;
  state.pendingBossWave = false;
  state.enemies.length = 0;
  state.enemyBullets.length = 0;
  state.bullets.length = 0;
  state.powerups.length = 0;
  state.ambience.length = 0;

  if (state.campaignIndex >= CAMPAIGNS.length) {
    game.setState('over');
    game.showOverlay('Victory', `Final Score: ${state.score}\nPress SPACE to fly again`);
    return;
  }

  const nextCampaign = getCampaign(state.campaignIndex);
  queueDialogue(state, getDialogue(nextCampaign.id, 'intro'), 280);
}

function updateGame(state, game, input) {
  const player = state.player;
  state.tick += 1;

  if (player.fireCooldown > 0) player.fireCooldown--;
  if (player.specialCooldown > 0) player.specialCooldown--;
  if (player.specialTimer > 0) player.specialTimer--;
  if (player.rollTimer > 0) player.rollTimer--;
  if (player.rollInvuln > 0) player.rollInvuln--;
  if (player.rollCooldown > 0) player.rollCooldown--;
  if (player.invuln > 0) player.invuln--;
  if (player.doubleShotTimer > 0) player.doubleShotTimer--;
  if (player.speedBoostTimer > 0) player.speedBoostTimer--;
  if (player.shieldTimer > 0) player.shieldTimer--;
  if (state.flashTimer > 0) state.flashTimer--;

  if (state.tick % 40 === 0) {
    spawnAmbient(state, getCampaign(state.campaignIndex).theme);
  }

  popDialogueIfNeeded(state);
  if (state.dialogue) {
    state.dialogue.timer -= 1;
    if (state.dialogue.timer <= 0) state.dialogue = null;
  }

  const speed = (player.plane.speed + (player.speedBoostTimer > 0 ? 1.15 : 0)) * 2;
  let mx = 0;
  let my = 0;
  if (input.isDown('ArrowLeft')) mx -= 1;
  if (input.isDown('ArrowRight')) mx += 1;
  if (input.isDown('ArrowUp')) my -= 1;
  if (input.isDown('ArrowDown')) my += 1;

  if (mx !== 0 || my !== 0) {
    const mag = Math.hypot(mx, my) || 1;
    player.lastMoveX = mx / mag;
    player.lastMoveY = my / mag;
  }

  if (player.rollTimer > 0) {
    const t = (ROLL_DURATION - player.rollTimer) / ROLL_DURATION;
    const burst = Math.sin(Math.PI * clamp(t + 0.08, 0, 1));
    player.x += player.rollVx * ROLL_SPEED * burst;
    player.y += player.rollVy * (ROLL_SPEED * 0.72) * burst;
  } else {
    const targetVX = mx * speed;
    const targetVY = my * speed;
    player.vx += (targetVX - player.vx) * 0.28;
    player.vy += (targetVY - player.vy) * 0.20;
    if (Math.abs(player.vx) < 0.01) player.vx = 0;
    if (Math.abs(player.vy) < 0.01) player.vy = 0;
    player.x += player.vx;
    player.y += player.vy;
  }

  player.x = clamp(player.x, 24, W - player.w - 24);
  player.y = clamp(player.y, 88, H - player.h - 40);

  if (input.wasPressed('Shift')) startRoll(player, player.lastMoveX, player.lastMoveY);

  if (input.wasPressed(' ') && state.tick - player.lastSpacePressedAt <= 14) {
    startRoll(player, player.lastMoveX, player.lastMoveY);
  }
  if (input.wasPressed(' ')) {
    player.lastSpacePressedAt = state.tick;
  }

  if (input.wasPressed('x') || input.wasPressed('X')) {
    useSpecial(state);
  }

  if (input.wasPressed('b') || input.wasPressed('B')) {
    if (player.bombs > 0) {
      player.bombs -= 1;
      spawnExplosion(state, player.x + player.w / 2, player.y - 40, '#ffd27b', 24);
      state.enemies.forEach((enemy) => {
        enemy.hp -= enemy.tier === 'normal' ? 8 : 18;
      });
      state.enemyBullets.length = 0;
    }
  }

  if (input.isDown(' ') && player.fireCooldown <= 0 && !state.dialogue) {
    if (player.specialTimer > 0 && player.plane.special.id === 'burst') {
      spawnPlayerBullets(state, 'burst');
    } else {
      spawnPlayerBullets(state, 'normal');
    }
    player.fireCooldown = player.plane.fireRate;
  }

  if (player.rollTimer > 0) {
    player.rollTrail.unshift({ x: player.x, y: player.y, life: 18 });
    if (player.rollTrail.length > ROLL_TRAIL_MAX) player.rollTrail.length = ROLL_TRAIL_MAX;
  }

  for (const tr of player.rollTrail) tr.life--;
  player.rollTrail = player.rollTrail.filter((t) => t.life > 0);

  for (const b of state.bullets) {
    b.x += b.vx;
    b.y += b.vy;
  }
  state.bullets = state.bullets.filter((b) => b.y > -40 && b.y < H + 40 && b.x > -40 && b.x < W + 40);

  for (const e of state.enemies) {
    e.t += 1;
    if (e.stunned > 0) {
      e.stunned--;
    } else {
      const vel = enemyPatternVelocity(e, player);
      e.x += vel.vx;
      e.y += vel.vy;
    }

    e.fireTimer -= 1;
    e.animTimer += 1;

    const step = Math.max(1, Math.floor(60 / e.def.animFps));
    e.frame = Math.floor(e.animTimer / step) % e.def.anim.length;

    if (e.fireTimer <= 0 && !state.dialogue) {
      spawnEnemyBullets(state, e, player);
      e.fireTimer = e.def.fireRate + rand(-8, 8);
      if (Math.random() < 0.25) sfx.enemyShoot();
    }
  }

  for (const eb of state.enemyBullets) {
    eb.x += eb.vx;
    eb.y += eb.vy;
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.y < H + 60 && b.x > -40 && b.x < W + 40);

  for (const p of state.powerups) {
    p.y += p.vy;
    p.bob += 0.09;
    p.x += Math.sin(p.bob) * 0.8;
  }
  state.powerups = state.powerups.filter((p) => p.y < H + 60);

  for (const a of state.ambience) {
    a.y += a.vy;
  }
  state.ambience = state.ambience.filter((a) => a.y < H + 120);

  for (const pt of state.particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vx *= 0.97;
    pt.vy *= 0.97;
    pt.life -= 1;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (!rectHit(b, e)) continue;
      e.hp -= b.pierce > 0 ? 2 : 1;
      if (b.pierce > 0) {
        b.pierce -= 1;
      } else {
        state.bullets.splice(i, 1);
      }
      if (e.hp <= 0) {
        const wasFinal = e.tier === 'final';
        killEnemy(state, e);
        state.enemies.splice(j, 1);
        if (wasFinal && state.enemies.filter((x) => x.tier === 'final').length === 0) {
          moveToNextCampaign(state, game);
        }
      }
      break;
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    if (rectHit(state.enemyBullets[i], player)) {
      state.enemyBullets.splice(i, 1);
      if (damagePlayer(state)) {
        game.setState('over');
        game.showOverlay('Mission Failed', `Final Score: ${state.score}\nPress SPACE to restart`);
        return;
      }
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (rectHit(e, player)) {
      state.enemies.splice(i, 1);
      if (damagePlayer(state)) {
        game.setState('over');
        game.showOverlay('Mission Failed', `Final Score: ${state.score}\nPress SPACE to restart`);
        return;
      }
      continue;
    }
    if (e.y > H + 60) state.enemies.splice(i, 1);
  }

  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const p = state.powerups[i];
    if (rectHit(p, player)) {
      const def = POWERUPS.find((x) => x.id === p.id);
      if (def) def.apply(state);
      state.powerups.splice(i, 1);
      spawnExplosion(state, p.x + p.w / 2, p.y + p.h / 2, '#baf6ff', 8);
      sfx.pickup();
    }
  }

  if (state.enemies.length === 0 && game.state === 'playing') {
    // Boss warning phase — count down, then spawn boss wave
    if (state.bossWarningTimer > 0) {
      state.bossWarningTimer -= 1;
      if (state.bossWarningTimer <= 0) {
        state.pendingBossWave = false;
        spawnWave(state);
        state.waveDelay = 120;
      }
      return;
    }

    // Wave clear display (only after wave 1+)
    if (state.wave > 0 && !state.waveClearBonusAwarded) {
      state.waveClearTimer = 90;
      state.waveClearBonusAwarded = true;
      state.score += 500;
      state.scorePops.push({ x: W / 2 - 40, y: H / 2 + 60, text: '+500', life: 60 });
    }

    if (state.waveClearTimer > 0) {
      state.waveClearTimer -= 1;
      return;
    }

    state.waveDelay -= 1;
    if (state.waveDelay <= 0) {
      // Check if next wave is a boss wave
      const campaign = getCampaign(state.campaignIndex);
      const nextWave = state.wave + 1;
      if (!state.pendingBossWave && (campaign.minibossWaves.includes(nextWave) || nextWave === campaign.finalWave)) {
        state.bossWarningTimer = 180;
        state.pendingBossWave = true;
        return;
      }
      state.pendingBossWave = false;
      state.waveClearBonusAwarded = false;
      spawnWave(state);
      state.waveDelay = 120;
    }
  }

  if (state.campaignIndex === 3 && Math.random() < 0.012) {
    state.flashTimer = 5;
  }
}

function drawBackground(renderer, campaign, flashTimer) {
  const t = campaign.theme;
  renderer.fillRect(0, 0, W, H, t.low);

  for (let y = 0; y < H; y += 16) {
    const pct = y / H;
    const mix = 0.35 + pct * 0.65;
    const c = lerpHex(t.sky, t.sea, mix);
    renderer.fillRect(0, y, W, 16, c);
  }

  for (let y = 0; y < H; y += 64) {
    renderer.fillRect(0, y + 12, W, 2, hexToRgba(t.accent, 0.15));
  }

  if (flashTimer > 0) {
    renderer.fillRect(0, 0, W, H, `rgba(240,248,255,${(flashTimer / 7).toFixed(2)})`);
  }
}

function lerpHex(a, b, t) {
  const aa = a.replace('#', '');
  const bb = b.replace('#', '');
  const ar = parseInt(aa.slice(0, 2), 16);
  const ag = parseInt(aa.slice(2, 4), 16);
  const ab = parseInt(aa.slice(4, 6), 16);
  const br = parseInt(bb.slice(0, 2), 16);
  const bg = parseInt(bb.slice(2, 4), 16);
  const bbv = parseInt(bb.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bbv - ab) * t);
  return `rgb(${r},${g},${bch})`;
}

function updateAndDrawScorePops(text, state) {
  for (let i = state.scorePops.length - 1; i >= 0; i--) {
    const p = state.scorePops[i];
    p.y -= 2;
    p.life -= 1;
    const alpha = Math.max(0, p.life / 30);
    const r = 255, g = 255, b = 100;
    const color = `rgba(${r},${g},${b},${alpha})`;
    text.drawText(p.text, p.x - p.text.length * 6, p.y, 28, color);
    if (p.life <= 0) state.scorePops.splice(i, 1);
  }
}

function drawUI(renderer, text, state) {
  const p = state.player;
  const campaign = getCampaign(state.campaignIndex);

  text.drawText(`SCORE ${state.score}`, 24, 20, 36, '#f1fbff');
  text.drawText(`BEST ${Math.max(state.best, state.score)}`, 24, 60, 28, '#b6daf4');
  text.drawText(`LIVES ${p.lives}`, 380, 20, 36, '#f1fbff');
  text.drawText(`BOMBS ${p.bombs}`, 380, 60, 28, '#ffe1a2');
  text.drawText(`WAVE ${state.wave}/${campaign.finalWave}`, 680, 20, 36, '#f1fbff');
  text.drawText(campaign.name, 680, 60, 28, '#b6daf4');

  text.drawText(`PLANE ${p.plane.name}`, 24, H - 48, 28, p.plane.color);
  text.drawText(`SPECIAL ${p.plane.special.name}`, 440, H - 48, 28, '#d5e7ff');

  const cdPct = p.specialCooldown / p.plane.special.cooldown;
  const cdW = 240;
  renderer.fillRect(700, H - 52, cdW, 16, '#334f66');
  renderer.fillRect(700, H - 52, Math.floor(cdW * (1 - cdPct)), 16, '#79c7ff');

  if (p.doubleShotTimer > 0) text.drawText('DOUBLE', 24, 104, 24, '#ffe48d');
  if (p.speedBoostTimer > 0) text.drawText('SPEED', 160, 104, 24, '#8effb5');
  if (p.shieldTimer > 0) text.drawText('SHIELD', 280, 104, 24, '#9bc8ff');

  if (state.dialogue) {
    const alpha = clamp(state.dialogue.timer / state.dialogue.hold, 0.2, 1);
    renderer.fillRect(28, 136, W - 56, 116, `rgba(8,16,26,${(alpha * 0.8).toFixed(2)})`);
    renderer.fillRect(40, 148, W - 80, 4, '#7ec7ff');
    const lineA = state.dialogue.lines[0] || '';
    const lineB = state.dialogue.lines[1] || '';
    text.drawText(lineA, 48, 164, 26, '#eef7ff');
    text.drawText(lineB, 48, 196, 26, '#b8ddff');
  }
}

function enemyFrameId(enemy) {
  return enemy.def.anim[enemy.frame % enemy.def.anim.length];
}

export function createGame() {
  const game = new Game('game');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const livesEl = document.getElementById('lives');

  let selectedPlaneIndex = 0;
  let state = makeInitialState(PLANES[selectedPlaneIndex].id);

  function updateOverlayText() {
    const plane = PLANES[selectedPlaneIndex];
    game.showOverlay(
      '1942: Pixel Campaigns',
      `Plane: [${selectedPlaneIndex + 1}] ${plane.name}\n` +
      `Special: ${plane.special.name}\n\n` +
      'Controls: Arrows move, Space shoot, Shift/Double-Space roll, X special, B bomb\n' +
      'Select Plane: keys 1-4\nPress SPACE to launch'
    );
  }

  function resetRun() {
    state = makeInitialState(PLANES[selectedPlaneIndex].id);
    queueDialogue(state, getDialogue(getCampaign(0).id, 'intro'), 260);
    spawnWave(state);
  }

  game.onInit = () => {
    updateOverlayText();
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    bestEl.textContent = String(state.best);
  };

  game.setScoreFn(() => state.score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('1')) { selectedPlaneIndex = 0; updateOverlayText(); }
      if (input.wasPressed('2')) { selectedPlaneIndex = 1; updateOverlayText(); }
      if (input.wasPressed(' ')) {
        resetRun();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.setState('waiting');
        updateOverlayText();
      }
      return;
    }

    updateGame(state, game, input);

    scoreEl.textContent = String(state.score);
    livesEl.textContent = String(state.player.lives);
    bestEl.textContent = String(Math.max(state.best, state.score));
  };

  game.onDraw = (renderer, text) => {
    const campaign = getCampaign(state.campaignIndex);
    drawBackground(renderer, campaign, state.flashTimer);

    drawAmbient(renderer, state.ambience, campaign);

    for (const p of state.powerups) {
      drawPixelSprite(renderer, buildPowerupSprite(p.id), p.x, p.y, 6, '#ffd166');
    }

    for (const b of state.bullets) {
      renderer.fillRect(b.x, b.y, b.w, b.h, b.color);
    }

    for (const b of state.enemyBullets) {
      const bcx = b.x + b.w / 2;
      const bcy = b.y + b.h / 2;
      if (b.shape === 'diamond') {
        const half = b.w / 2;
        renderer.fillPoly([
          { x: bcx, y: bcy - half },
          { x: bcx + half, y: bcy },
          { x: bcx, y: bcy + half },
          { x: bcx - half, y: bcy },
        ], b.color);
      } else {
        // circle for slow and fast bullets
        renderer.fillCircle(bcx, bcy, b.w / 2, b.color);
      }
    }

    for (const enemy of state.enemies) {
      const frameId = enemyFrameId(enemy);
      const tint = enemy.tier === 'normal' ? '#ff6f6f' : '#ff4f65';
      const alpha = enemy.stunned > 0 ? 0.55 : 1;
      drawPixelSprite(renderer, frameId, enemy.x, enemy.y, enemy.tier === 'normal' ? ENEMY_SCALE : BOSS_SCALE, tint, alpha);

      if (enemy.tier !== 'normal') {
        const w = enemy.w;
        const hpPct = clamp(enemy.hp / enemy.maxHp, 0, 1);
        renderer.fillRect(enemy.x, enemy.y - 16, w, 6, '#2f3148');
        renderer.fillRect(enemy.x, enemy.y - 16, Math.floor(w * hpPct), 6, '#ff8f7a');
      }
    }

    for (const tr of state.player.rollTrail) {
      const frame = tr.life % 2 ? 'roll_1' : 'roll_2';
      drawPixelSprite(renderer, frame, tr.x, tr.y, PLAYER_SCALE, state.player.plane.color, tr.life / 18 * 0.45);
    }

    const playerSprite = state.player.rollTimer > 0
      ? (Math.floor(state.player.rollTimer / 6) % 2 ? 'roll_1' : 'roll_2')
      : `plane_${state.player.plane.id}`;

    const playerAlpha = state.player.invuln > 0 && state.tick % 6 < 3 ? 0.55 : 1;
    const bankOffset = clamp(state.player.vx * 0.4, -2, 2);
    drawPixelSprite(renderer, playerSprite, state.player.x + bankOffset, state.player.y, PLAYER_SCALE, state.player.plane.color, playerAlpha);

    if (state.player.shieldTimer > 0) {
      renderer.fillCircle(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, 48, 'rgba(132,188,255,0.2)');
    }

    for (const pt of state.particles) {
      renderer.fillRect(pt.x, pt.y, pt.r, pt.r, hexToRgba(pt.color.startsWith('#') ? pt.color : '#ff8f5c', clamp(pt.life / pt.maxLife, 0, 1)));
    }

    // Wave Clear text
    if (state.waveClearTimer > 0 && state.wave > 0) {
      const alpha = Math.min(state.waveClearTimer / 15, 1);
      const color = `rgba(186,246,255,${alpha})`;
      text.drawText('WAVE CLEAR', W / 2 - 160, H / 2 - 40, 56, color);
    }

    // Boss Warning overlay
    if (state.bossWarningTimer > 0) {
      renderer.fillRect(0, 0, W, H, 'rgba(0,0,0,0.3)');
      if (Math.floor(state.bossWarningTimer / 12) % 2 === 0) {
        text.drawText('WARNING', W / 2 - 70, H / 2 - 20, 32, '#ff2244');
      }
    }

    updateAndDrawScorePops(text, state);
    drawUI(renderer, text, state);
  };

  game.start();
}
