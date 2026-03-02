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
const MINI_BOSS_SCALE = 12;
const FINAL_BOSS_SCALE = 16;

// ── Sprite image preloader ──
const SPRITE_IMAGE_FILES = [
  'specter-idle', 'specter-bank-left', 'specter-bank-right',
  'atlas-idle', 'atlas-bank-left', 'atlas-bank-right',
  'enemy-scout', 'enemy-torpedo', 'enemy-raider', 'enemy-gunship', 'enemy-bomber',
  'boss-coral', 'boss-desert', 'boss-arctic', 'boss-storm',
  'powerup-shot', 'powerup-speed', 'powerup-shield', 'powerup-bomb', 'powerup-double',
  'explosion-small', 'explosion-large', 'explosion-boss',
];

const SPRITE_IMAGES = {}; // name → Image (set when loaded)
let spritesLoaded = false;

function preloadSpriteImages(onAllLoaded) {
  let remaining = SPRITE_IMAGE_FILES.length;
  for (const name of SPRITE_IMAGE_FILES) {
    const img = new Image();
    img.onload = () => {
      SPRITE_IMAGES[name] = img;
      remaining--;
      if (remaining === 0) {
        spritesLoaded = true;
        if (onAllLoaded) onAllLoaded();
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite: ${name}`);
      remaining--;
      if (remaining === 0) {
        spritesLoaded = true;
        if (onAllLoaded) onAllLoaded();
      }
    };
    img.src = `assets/sprites/${name}.png`;
  }
}

// Entity-to-sprite mappings
const ENEMY_SPRITE_MAP = {
  'scout_zero': 'enemy-scout',
  'torpedo_gull': 'enemy-torpedo',
  'canopy_raider': 'enemy-raider',
  'gunship_hornet': 'enemy-gunship',
  'rail_bomber': 'enemy-bomber',
  'dune_lancer': 'enemy-raider',    // fallback: reuse raider
  'storm_wraith': 'enemy-scout',    // fallback: reuse scout
  'sub_spear': 'enemy-torpedo',     // fallback: reuse torpedo
};

const MINI_BOSS_SPRITE_MAP = {
  'reef_guardian': 'boss-coral',
  'river_bastion': 'boss-desert',
  'convoy_ram': 'boss-arctic',
  'monsoon_blade': 'boss-storm',
};

const FINAL_BOSS_SPRITE_MAP = {
  'coral_dreadnought': 'boss-coral',
  'jungle_citadel': 'boss-desert',
  'dust_colossus': 'boss-arctic',
  'iron_tempest': 'boss-storm',
};

const POWERUP_SPRITE_MAP = {
  'double-shot': 'powerup-double',
  'speed-boost': 'powerup-speed',
  'shield': 'powerup-shield',
  'repair': 'powerup-shield',       // reuse shield sprite for repair
  'bomb': 'powerup-bomb',
};

function getPlayerSpriteName(planeId, vx) {
  if (vx > 1) return `${planeId}-bank-right`;
  if (vx < -1) return `${planeId}-bank-left`;
  return `${planeId}-idle`;
}

function getEnemySpriteName(enemy) {
  if (enemy.tier === 'final') return FINAL_BOSS_SPRITE_MAP[enemy.id] || null;
  if (enemy.tier === 'mini') return MINI_BOSS_SPRITE_MAP[enemy.id] || null;
  return ENEMY_SPRITE_MAP[enemy.id] || null;
}

function getPowerupSpriteName(pickupId) {
  return POWERUP_SPRITE_MAP[pickupId] || null;
}

// Upload loaded images to WebGL renderer as textures (called once renderer is available)
let spritesUploaded = false;
function uploadSpriteTextures(renderer) {
  if (spritesUploaded) return;
  for (const name of SPRITE_IMAGE_FILES) {
    const img = SPRITE_IMAGES[name];
    if (img && !renderer.hasSpriteTexture(name)) {
      renderer.loadSpriteTexture(name, img);
    }
  }
  spritesUploaded = true;
}

// Draw a sprite image, falling back to pixel art if not loaded
function drawSpriteImage(renderer, spriteName, x, y, w, h, alpha = 1, fallbackId, fallbackScale, fallbackTint) {
  if (spriteName && renderer.hasSpriteTexture(spriteName)) {
    renderer.drawSprite(spriteName, x, y, w, h, alpha);
  } else if (fallbackId !== undefined) {
    drawPixelSprite(renderer, fallbackId, x, y, fallbackScale || PLAYER_SCALE, fallbackTint || '#ff6f6f', alpha);
  }
}
const BULLET_SIZE = 8;
const ROLL_DURATION = 30;
const ROLL_IFRAMES = 22;
const ROLL_SPEED = 12.2;
const ROLL_TRAIL_MAX = 4;
const GRAZE_RADIUS = 56;
const GRAZE_POINTS = 25;

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

  graze() { this.tone(1400, 'sine', 0.03, 0.05); }
  shoot() { this.tone(920, 'square', 0.05, 0.07); }
  enemyShoot() { this.tone(420, 'sawtooth', 0.06, 0.07); }
  hit() { this.noise(0.08, 0.12); }
  explode() { this.noise(0.18, 0.18); this.tone(130, 'sine', 0.15, 0.1); }
  bomb() {
    this.noise(0.5, 0.3);
    this.tone(55, 'sine', 0.6, 0.25);
    this.tone(80, 'square', 0.4, 0.15);
    setTimeout(() => { this.noise(0.3, 0.2); this.tone(40, 'sine', 0.5, 0.18); }, 120);
  }
  roll() { this.tone(520, 'triangle', 0.12, 0.08); }
  pickup() { this.tone(680, 'sine', 0.08, 0.1); setTimeout(() => this.tone(980, 'sine', 0.1, 0.09), 70); }
  bossWarn() { this.tone(160, 'square', 0.12, 0.12); setTimeout(() => this.tone(130, 'square', 0.12, 0.1), 140); }
  oneUp() {
    this.tone(440, 'sine', 0.1, 0.12);
    setTimeout(() => this.tone(554, 'sine', 0.1, 0.12), 80);
    setTimeout(() => this.tone(659, 'sine', 0.1, 0.12), 160);
    setTimeout(() => this.tone(880, 'sine', 0.2, 0.15), 240);
  }
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
    bombInvuln: 0,
    vx: 0,
    vy: 0,
    rollVx: 0,
    rollVy: -1,
    rollCooldown: 0,
    rollStocks: 3,
    rollMaxStocks: 3,
    rollRegenTimer: 0,
    invuln: 0,
    shieldTimer: 0,
    speedBoostTimer: 0,
    doubleShotTimer: 0,
    rollTrail: [],
    lastSpacePressedAt: -100,
    lastMoveX: 0,
    lastMoveY: -1,
    autoBomb: false,
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
    phase: 'playing',
    campaignIntroTimer: 0,
    campaignIntroName: '',
    player: makePlayer(planeId),
    bullets: [],
    bulletTrails: [],
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
    grazeCount: 0,
    chainCount: 0,
    chainTimer: 0,
    chainPulse: 0,
    deathFreezeTimer: 0,
    screenShakeTimer: 0,
    pendingAutoBomb: false,
    signatureWhale: null,
    signatureWingman: null,
    bombDarkenTimer: 0,
    bossSlowTimer: 0,
    chainPulseFlash: 0,
    nextLifeAt: 100000,
    oneUpTimer: 0,
    focusActive: false,
  };
}

function createEnemy(enemyId, x, y, pattern, difficulty = 1, tier = 'normal') {
  const def = tier === 'normal'
    ? ENEMIES[enemyId]
    : tier === 'mini'
      ? MINI_BOSSES[enemyId]
      : FINAL_BOSSES[enemyId];
  const anim = def.anim[0];
  const scale = tier === 'normal' ? ENEMY_SCALE : (tier === 'mini' ? MINI_BOSS_SCALE : FINAL_BOSS_SCALE);
  const size = spriteSize(anim, scale);
  const enemy = {
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
  initHitZones(enemy);
  return enemy;
}

function initHitZones(enemy) {
  if (enemy.tier === 'final') {
    const totalHp = enemy.hp;
    const zoneHp = Math.ceil(totalHp / 4);
    enemy.hitZones = [
      { name: 'port', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: 0, oy: Math.floor(enemy.h * 0.25),
        w: Math.floor(enemy.w * 0.3), h: Math.floor(enemy.h * 0.5),
        color: '#ff6666', smokeTimer: 0 },
      { name: 'starboard', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: Math.floor(enemy.w * 0.7), oy: Math.floor(enemy.h * 0.25),
        w: Math.floor(enemy.w * 0.3), h: Math.floor(enemy.h * 0.5),
        color: '#6688ff', smokeTimer: 0 },
      { name: 'engine', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: Math.floor(enemy.w * 0.25), oy: 0,
        w: Math.floor(enemy.w * 0.5), h: Math.floor(enemy.h * 0.3),
        color: '#ffaa44', smokeTimer: 0 },
      { name: 'core', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: Math.floor(enemy.w * 0.2), oy: Math.floor(enemy.h * 0.3),
        w: Math.floor(enemy.w * 0.6), h: Math.floor(enemy.h * 0.55),
        color: '#ff4466', smokeTimer: 0 },
    ];
    enemy.phase = 1;
    enemy.zonesDestroyed = 0;
  } else if (enemy.tier === 'mini') {
    const totalHp = enemy.hp;
    const zoneHp = Math.ceil(totalHp / 2);
    enemy.hitZones = [
      { name: 'left', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: 0, oy: 0,
        w: Math.floor(enemy.w * 0.5), h: enemy.h,
        color: '#ff6666', smokeTimer: 0 },
      { name: 'right', hp: zoneHp, maxHp: zoneHp, destroyed: false,
        ox: Math.floor(enemy.w * 0.5), oy: 0,
        w: Math.floor(enemy.w * 0.5), h: enemy.h,
        color: '#6688ff', smokeTimer: 0 },
    ];
    enemy.phase = 1;
    enemy.zonesDestroyed = 0;
  }
}

function checkBossZoneStatus(state, enemy) {
  if (!enemy.hitZones) return false;
  // Phase transition: when 2+ zones destroyed, enter phase 2
  if (enemy.zonesDestroyed >= 2 && enemy.phase === 1) {
    enemy.phase = 2;
    spawnExplosion(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff4444', 20);
    state.screenShakeTimer = 15;
    sfx.bossWarn();
  }
  // Sync HP to sum of zone HPs
  enemy.hp = enemy.hitZones.reduce((sum, z) => sum + Math.max(0, z.hp), 0);
  // Boss dies when core destroyed (final) or all zones destroyed
  const allDestroyed = enemy.hitZones.every(z => z.destroyed);
  const coreZone = enemy.hitZones.find(z => z.name === 'core');
  const coreDestroyed = coreZone ? coreZone.destroyed : false;
  return allDestroyed || coreDestroyed;
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
    case 'ambush_left': return { vx: speed * 1.1, vy: Math.sin(t) * 0.8 };
    case 'ambush_right': return { vx: -speed * 1.1, vy: Math.sin(t) * 0.8 };
    case 'ambush_bottom': return { vx: Math.sin(t) * 0.8, vy: -speed };
    default: return { vx: 0, vy: speed };
  }
}

function spawnWave(state) {
  const campaign = getCampaign(state.campaignIndex);

  // Remove wingman from previous wave
  if (state.signatureWingman) {
    state.signatureWingman = null;
  }

  state.wave += 1;

  // Check for signature moments
  const sigMoment = campaign.signatureMoments && campaign.signatureMoments[state.wave];
  if (sigMoment === 'whale_crossing') {
    state.signatureWhale = {
      x: -320,
      y: H * 0.4,
      w: 320,
      h: 80,
      vx: 7.2,
    };
    queueDialogue(state, ['A massive whale surfaces below...', 'Use it as cover!']);
  } else if (sigMoment === 'wingman') {
    state.signatureWingman = {
      x: state.player.x + 80,
      y: state.player.y,
      w: state.player.w,
      h: state.player.h,
      fireCooldown: 0,
      fireRate: 14,
      waveSpawned: state.wave,
    };
    queueDialogue(state, ['Allied wingman on your six!', 'Covering fire incoming.']);
  }

  const waveKey = `${campaign.id}:${state.wave}`;
  if (campaign.minibossWaves.includes(state.wave)) {
    if (!state.shownMilestones.has(`${waveKey}:mini`)) {
      queueDialogue(state, getDialogue(campaign.id, 'miniboss'));
      state.shownMilestones.add(`${waveKey}:mini`);
      sfx.bossWarn();
    }
    const isDouble = campaign.doubleMiniWaves && campaign.doubleMiniWaves.includes(state.wave);
    if (isDouble) {
      // Spawn two mini bosses side by side
      const miniL = createEnemy(campaign.miniboss, W / 2 - 200, -180, 'mini', state.campaignIndex + 1, 'mini');
      const miniR = createEnemy(campaign.miniboss, W / 2 + 8, -180, 'mini', state.campaignIndex + 1, 'mini');
      state.enemies.push(miniL, miniR);
    } else {
      const mini = createEnemy(campaign.miniboss, W / 2 - 96, -180, 'mini', state.campaignIndex + 1, 'mini');
      state.enemies.push(mini);
    }
    return;
  }

  if (state.wave === campaign.finalWave) {
    if (!state.shownMilestones.has(`${waveKey}:boss`)) {
      queueDialogue(state, getDialogue(campaign.id, 'boss'), 280);
      state.shownMilestones.add(`${waveKey}:boss`);
      sfx.bossWarn();
    }
    const boss = createEnemy(campaign.finalBoss, W / 2 - 152, -240, 'boss', state.campaignIndex + 1, 'final');
    // Apply extra-tough scaling if defined
    if (campaign.finalBossScale && campaign.finalBossScale > 1) {
      boss.hp = Math.round(boss.hp * campaign.finalBossScale);
      boss.maxHp = boss.hp;
    }
    state.enemies.push(boss);
    return;
  }

  // Signature moment: ambush from all edges (replaces normal spawn)
  if (sigMoment === 'ambush_all_edges') {
    const roster = campaign.roster;
    const perEdge = 4;
    // Top edge
    for (let i = 0; i < perEdge; i++) {
      const id = roster[i % roster.length];
      const x = 120 + i * 190;
      state.enemies.push(createEnemy(id, x, -60, 'line', state.campaignIndex + 1, 'normal'));
    }
    // Bottom edge
    for (let i = 0; i < perEdge; i++) {
      const id = roster[i % roster.length];
      const x = 120 + i * 190;
      state.enemies.push(createEnemy(id, x, H + 60, 'ambush_bottom', state.campaignIndex + 1, 'normal'));
    }
    // Left edge
    for (let i = 0; i < perEdge; i++) {
      const id = roster[i % roster.length];
      const y = 200 + i * 200;
      state.enemies.push(createEnemy(id, -60, y, 'ambush_left', state.campaignIndex + 1, 'normal'));
    }
    // Right edge
    for (let i = 0; i < perEdge; i++) {
      const id = roster[i % roster.length];
      const y = 200 + i * 200;
      state.enemies.push(createEnemy(id, W + 60, y, 'ambush_right', state.campaignIndex + 1, 'normal'));
    }
    queueDialogue(state, ['CONTACTS ALL AROUND!', 'They\'re coming from every direction!']);
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
  if (player.rollTimer > 0) return;
  // Stock system: need at least 1 stock
  if (player.rollStocks <= 0) return;
  const mag = Math.hypot(dirX, dirY) || 1;
  const nx = mag > 0 ? dirX / mag : 0;
  const ny = mag > 0 ? dirY / mag : -1;
  player.rollTimer = ROLL_DURATION;
  player.rollStocks -= 1;
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

  // ARCADE-024: Early waves in C1 — all normal enemies fire straight down (no aiming)
  const isEarlyWave = state.campaignIndex === 0 && state.wave <= 5;
  if (isEarlyWave && e.tier === 'normal') {
    pushEnemyBullet(state, cx, cy, 0, baseSpeed);
    return;
  }

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

function activateBomb(state, game) {
  const player = state.player;
  if (player.bombs <= 0) return;
  player.bombs -= 1;

  // --- Dramatic sound ---
  sfx.bomb();

  // --- Full-screen white flash for 8 frames ---
  state.flashTimer = 8;

  // --- ARCADE-016: Darken background for 30 frames ---
  state.bombDarkenTimer = 30;

  // --- Kill all normal enemies outright; bosses/minis take 15% maxHp ---
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.tier === 'normal') {
      state.score += enemy.def.score;
      state.scorePops.push({ x: enemy.x + enemy.w / 2, y: enemy.y, text: `${enemy.def.score}`, life: 30 });
      spawnExplosion(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff8f5c', 10);
      if (Math.random() < 0.14) spawnPowerup(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
      state.enemies.splice(i, 1);
    } else {
      enemy.hp -= Math.ceil(enemy.maxHp * 0.15);
      if (enemy.hp <= 0) {
        const wasFinal = enemy.tier === 'final';
        killEnemy(state, enemy);
        state.enemies.splice(i, 1);
        if (wasFinal && state.enemies.filter((x) => x.tier === 'final').length === 0) {
          moveToNextCampaign(state, game);
        }
      }
    }
  }

  // --- Cancel ALL enemy bullets, award 10 points per bullet (flat, no chain) ---
  const cancelledBullets = state.enemyBullets.length;
  if (cancelledBullets > 0) {
    const bulletPoints = cancelledBullets * 10;
    state.score += bulletPoints;
    state.scorePops.push({ x: W / 2 - 40, y: H / 2, text: `+${bulletPoints}`, life: 45 });
  }
  state.enemyBullets.length = 0;

  // --- 90 frames of bomb I-frames (tracked separately) ---
  player.bombInvuln = 90;

  // --- Reset chain to 0 (bombing costs your combo) ---
  state.chainCount = 0;
  state.chainTimer = 0;
  state.chainPulse = 0;

  // --- Big explosion particles across the screen (35 large orange/white) ---
  for (let i = 0; i < 35; i++) {
    const px = rand(40, W - 40);
    const py = rand(40, H - 40);
    const color = Math.random() < 0.5 ? '#ffa040' : '#ffffff';
    state.particles.push({
      x: px,
      y: py,
      vx: rand(-6, 6),
      vy: rand(-6, 6),
      life: rand(30, 55),
      maxLife: rand(30, 55),
      color,
      r: rand(10, 22),
    });
  }
}

function damagePlayer(state) {
  const p = state.player;
  if (p.invuln > 0 || p.shieldTimer > 0 || p.rollInvuln > 0 || p.bombInvuln > 0) return;

  // --- Auto-bomb: if enabled and player has bombs, use bomb instead of dying ---
  if (p.autoBomb && p.bombs > 0) {
    state.pendingAutoBomb = true;
    return;
  }

  p.lives -= 1;
  p.invuln = 120;
  spawnExplosion(state, p.x + p.w / 2, p.y + p.h / 2, '#8ec5ff', 16);
  sfx.hit();

  // Death consequences: reset all buffs
  p.doubleShotTimer = 0;
  p.speedBoostTimer = 0;
  p.shieldTimer = 0;
  p.specialTimer = 0;

  // Reset chain
  state.chainCount = 0;
  state.chainTimer = 0;
  state.chainPulse = 0;

  // Entity freeze + screen shake + death flash
  state.deathFreezeTimer = 30;
  state.screenShakeTimer = 20;
  state.flashTimer = 8;

  if (p.lives <= 0) {
    state.best = Math.max(state.best, state.score);
    localStorage.setItem('openarcade_1942_best', String(state.best));
    return true;
  }
  return false;
}

function getChainMultiplier(chainCount) {
  if (chainCount < 2) return 1;
  return 1 + Math.floor(chainCount / 5) * 0.5;
}

function getChainWindow(chainCount) {
  return Math.max(45, 90 - chainCount * 3);
}

function getChainColor(chainCount) {
  if (chainCount >= 10) return '#ff4444';
  if (chainCount >= 5) return '#ff9933';
  return '#ffdd44';
}

function killEnemy(state, enemy) {
  spawnExplosion(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff8f5c', enemy.tier === 'normal' ? 10 : 24);
  sfx.explode();

  // Update chain
  if (state.chainTimer > 0) {
    state.chainCount += 1;
  } else {
    state.chainCount = 1;
  }
  state.chainTimer = getChainWindow(state.chainCount);
  state.chainPulse = 12;

  // ARCADE-016: Chain milestone pulse (every 5 kills)
  if (state.chainCount > 0 && state.chainCount % 5 === 0) {
    state.chainPulseFlash = 12;
    state.screenShakeTimer = Math.max(state.screenShakeTimer, 4);
  }

  // ARCADE-016: Boss death triggers big particle burst + slowdown
  if (enemy.tier === 'final' || enemy.tier === 'mini') {
    // Big particle burst across the screen
    for (let i = 0; i < 50; i++) {
      const px = enemy.x + enemy.w / 2 + rand(-120, 120);
      const py = enemy.y + enemy.h / 2 + rand(-120, 120);
      const color = ['#ff4444', '#ffaa44', '#ffffff', '#ff8844', '#ffdd44'][Math.floor(rand(0, 5))];
      state.particles.push({
        x: px, y: py,
        vx: rand(-8, 8), vy: rand(-8, 8),
        life: rand(40, 70), maxLife: rand(40, 70),
        color, r: rand(6, 16),
      });
    }
    // Brief slowdown for final bosses
    if (enemy.tier === 'final') {
      state.bossSlowTimer = 60;
    }
    state.screenShakeTimer = Math.max(state.screenShakeTimer, 20);
  }

  // Apply chain multiplier to score
  const multiplier = getChainMultiplier(state.chainCount);
  const points = Math.round(enemy.def.score * multiplier);
  state.score += points;

  const popText = multiplier > 1 ? `${points} x${multiplier.toFixed(1)}` : `${points}`;
  state.scorePops.push({ x: enemy.x + enemy.w / 2, y: enemy.y, text: popText, life: 30 });

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
  state.bulletTrails.length = 0;
  state.powerups.length = 0;
  state.ambience.length = 0;
  state.signatureWhale = null;
  state.signatureWingman = null;

  if (state.campaignIndex >= CAMPAIGNS.length) {
    game.setState('over');
    game.showOverlay('Victory', `Final Score: ${state.score}\nPress SPACE to fly again`);
    return;
  }

  // ARCADE-010: Show campaign intro screen for 180 frames
  const nextCampaign = getCampaign(state.campaignIndex);
  state.campaignIntroTimer = 180;
  state.campaignIntroName = nextCampaign.name;
  // Clear pending dialogue, will queue intro after the black screen
  state.dialogue = null;
  state.pendingDialogue = [];
  queueDialogue(state, getDialogue(nextCampaign.id, 'intro'), 280);
}

function updateGame(state, game, input) {
  const player = state.player;
  state.tick += 1;

  // ARCADE-010: Campaign intro screen — pause gameplay during transition
  if (state.campaignIntroTimer > 0) {
    state.campaignIntroTimer--;
    return;
  }

  // ARCADE-016: Boss slow effect — run at 0.5x speed (skip every other frame)
  if (state.bossSlowTimer > 0) {
    state.bossSlowTimer--;
    if (state.tick % 2 === 0) return; // skip every other frame for 0.5x speed
  }

  // Death freeze: pause all entities, only tick down timers
  if (state.deathFreezeTimer > 0) {
    state.deathFreezeTimer--;
    if (state.screenShakeTimer > 0) state.screenShakeTimer--;
    if (state.flashTimer > 0) state.flashTimer--;
    if (player.invuln > 0) player.invuln--;
    if (player.bombInvuln > 0) player.bombInvuln--;
    // Decay particles during freeze for visual continuity
    for (const pt of state.particles) {
      pt.life -= 1;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    return;
  }

  if (player.fireCooldown > 0) player.fireCooldown--;
  if (player.specialCooldown > 0) player.specialCooldown--;
  if (player.specialTimer > 0) player.specialTimer--;
  if (player.rollTimer > 0) player.rollTimer--;
  if (player.rollInvuln > 0) player.rollInvuln--;
  if (player.bombInvuln > 0) player.bombInvuln--;
  if (player.invuln > 0) player.invuln--;
  if (player.doubleShotTimer > 0) player.doubleShotTimer--;
  if (player.speedBoostTimer > 0) player.speedBoostTimer--;
  if (player.shieldTimer > 0) player.shieldTimer--;
  if (state.flashTimer > 0) state.flashTimer--;
  if (state.screenShakeTimer > 0) state.screenShakeTimer--;
  if (state.bombDarkenTimer > 0) state.bombDarkenTimer--;
  if (state.chainPulseFlash > 0) state.chainPulseFlash--;
  if (state.oneUpTimer > 0) state.oneUpTimer--;

  // ARCADE-020: Roll stock regeneration (1 stock per 600 frames)
  if (player.rollStocks < player.rollMaxStocks) {
    player.rollRegenTimer++;
    if (player.rollRegenTimer >= 600) {
      player.rollStocks++;
      player.rollRegenTimer = 0;
    }
  } else {
    player.rollRegenTimer = 0;
  }

  // ARCADE-015/028: Focus mode — active when 'f' or 'z' key is held (separated from Space/shoot)
  state.focusActive = input.isDown('f') || input.isDown('z');

  // Chain timer
  if (state.chainTimer > 0) {
    state.chainTimer -= 1;
    if (state.chainTimer <= 0) {
      state.chainCount = 0;
    }
  }
  if (state.chainPulse > 0) state.chainPulse -= 1;

  if (state.tick % 40 === 0) {
    spawnAmbient(state, getCampaign(state.campaignIndex).theme);
  }

  // Signature moment: whale crossing
  if (state.signatureWhale) {
    const whale = state.signatureWhale;
    whale.x += whale.vx;
    // Water spray particles
    if (state.tick % 8 === 0) {
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          x: whale.x + whale.w - 10 + rand(-10, 10),
          y: whale.y + rand(-15, 5),
          vx: rand(-0.5, 0.5),
          vy: rand(-2, -0.5),
          life: 15, maxLife: 15,
          color: '#a8e0ff', r: rand(3, 6),
        });
      }
    }
    // Remove when fully off-screen right
    if (whale.x > W + 20) {
      state.signatureWhale = null;
    }
  }

  // Signature moment: wingman
  if (state.signatureWingman) {
    const wm = state.signatureWingman;
    // Follow player's Y, offset 80px to the right
    const targetX = player.x + 80;
    const targetY = player.y;
    wm.x += (targetX - wm.x) * 0.12;
    wm.y += (targetY - wm.y) * 0.12;
    wm.x = clamp(wm.x, 24, W - wm.w - 24);
    wm.y = clamp(wm.y, 88, H - wm.h - 40);
    // Auto-fire at enemies (slower rate than player)
    if (wm.fireCooldown > 0) wm.fireCooldown--;
    if (wm.fireCooldown <= 0 && state.enemies.length > 0 && !state.dialogue) {
      const bx = wm.x + wm.w / 2;
      const by = wm.y;
      state.bullets.push({
        x: bx - BULLET_SIZE / 2,
        y: by,
        w: BULLET_SIZE,
        h: 20,
        vx: 0,
        vy: -15,
        pierce: 0,
        color: '#ffdd66',
      });
      wm.fireCooldown = wm.fireRate;
    }
  }

  popDialogueIfNeeded(state);
  if (state.dialogue) {
    state.dialogue.timer -= 1;
    if (state.dialogue.timer <= 0) state.dialogue = null;
  }

  // ARCADE-015: Focus mode reduces speed to 1.5px/frame (3px at 2x scale)
  let speed;
  if (state.focusActive) {
    speed = 3; // 1.5px/frame * 2x scale
  } else {
    speed = (player.plane.speed + (player.speedBoostTimer > 0 ? 1.15 : 0)) * 2;
  }
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

  if (input.wasPressed('a') || input.wasPressed('A')) {
    player.autoBomb = !player.autoBomb;
  }

  if (input.wasPressed('b') || input.wasPressed('B') || state.pendingAutoBomb) {
    state.pendingAutoBomb = false;
    activateBomb(state, game);
  }

  if (input.isDown(' ') && player.fireCooldown <= 0) {
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

  // Capture bullet trails (afterimage) before moving
  for (const b of state.bullets) {
    state.bulletTrails.push({ x: b.x, y: b.y, w: b.w, h: b.h, life: 3 });
  }
  for (const t of state.bulletTrails) t.life--;
  state.bulletTrails = state.bulletTrails.filter((t) => t.life > 0);

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
  state.enemyBullets = state.enemyBullets.filter((b) => b.y < H + 60 && b.y > -60 && b.x > -40 && b.x < W + 40);

  // Signature whale blocks enemy bullets
  if (state.signatureWhale) {
    const whale = state.signatureWhale;
    const whaleRect = { x: whale.x, y: whale.y, w: whale.w, h: whale.h };
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      if (rectHit(state.enemyBullets[i], whaleRect)) {
        const b = state.enemyBullets[i];
        state.particles.push({
          x: b.x, y: b.y,
          vx: rand(-2, 2), vy: rand(-2, 0),
          life: 8, maxLife: 8,
          color: '#8ec5ff', r: 3,
        });
        state.enemyBullets.splice(i, 1);
      }
    }
  }

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

  // -- Graze detection (ARCADE-015: enhanced during focus mode) --
  {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    for (const eb of state.enemyBullets) {
      if (eb.grazed) continue;
      const bcx = eb.x + eb.w / 2;
      const bcy = eb.y + eb.h / 2;
      const dx = bcx - pcx;
      const dy = bcy - pcy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GRAZE_RADIUS && !rectHit(eb, player)) {
        eb.grazed = true;
        state.grazeCount += 1;
        // Focus mode: 2x graze multiplier bonus
        const focusBonus = state.focusActive ? 2 : 1;
        const grazeMultiplier = getChainMultiplier(state.chainCount) * focusBonus;
        const grazePoints = Math.round(GRAZE_POINTS * grazeMultiplier);
        state.score += grazePoints;
        state.scorePops.push({ x: bcx, y: bcy, text: `+${grazePoints}`, life: 20 });
        // Spark particles
        for (let s = 0; s < 4; s++) {
          state.particles.push({
            x: bcx,
            y: bcy,
            vx: rand(-3, 3),
            vy: rand(-3, 3),
            life: 10,
            maxLife: 10,
            color: s % 2 === 0 ? '#ffffff' : '#66ffff',
            r: rand(2, 4),
          });
        }
        sfx.graze();
      }
    }
  }

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
    if (e.y > H + 100 || e.y < -300 || e.x < -300 || e.x > W + 300) state.enemies.splice(i, 1);
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

  // ARCADE-021: 1-Up score milestones
  if (state.score >= state.nextLifeAt && player.lives < 5) {
    player.lives += 1;
    state.oneUpTimer = 90;
    sfx.oneUp();
    // Next milestone: first at 100k, then every 200k after
    if (state.nextLifeAt === 100000) {
      state.nextLifeAt = 200000;
    } else {
      state.nextLifeAt += 200000;
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

// ── Parallax scrolling tile background ──
// Two layers: slow ground/water tiles + faster cloud/detail layer
function drawBackground(renderer, campaign, flashTimer, tick) {
  const t = campaign.theme;
  // Base fill
  renderer.fillRect(0, 0, W, H, t.low);

  // Layer 1: slow scrolling ground/water tiles (0.5 px/frame)
  const tileH = 128;
  const tileW = 128;
  const scrollSpeed1 = 0.5;
  const offset1 = (tick * scrollSpeed1) % tileH;

  for (let row = -1; row < Math.ceil(H / tileH) + 1; row++) {
    for (let col = 0; col < Math.ceil(W / tileW); col++) {
      const tx = col * tileW;
      const ty = row * tileH + offset1;
      // Alternate tile colors for visual pattern
      const isAlt = (row + col) % 2 === 0;
      const baseColor = isAlt ? t.sea : t.low;
      renderer.fillRect(tx, ty, tileW, tileH, baseColor);
      // Tile border accent lines
      renderer.fillRect(tx, ty, tileW, 2, hexToRgba(t.accent, 0.08));
      renderer.fillRect(tx, ty, 2, tileH, hexToRgba(t.accent, 0.05));
      // Detail: small terrain features
      if (isAlt) {
        const detailX = tx + 20 + (col * 37 + row * 53) % 60;
        const detailY = ty + 30 + (col * 41 + row * 29) % 50;
        renderer.fillRect(detailX, detailY, 24, 12, hexToRgba(t.accent, 0.12));
        renderer.fillRect(detailX + 4, detailY + 2, 16, 8, hexToRgba(t.accent, 0.08));
      }
    }
  }

  // Layer 2: faster scrolling cloud/detail layer (1.5 px/frame, semi-transparent)
  const cloudH = 200;
  const scrollSpeed2 = 1.5;
  const offset2 = (tick * scrollSpeed2) % cloudH;

  for (let row = -1; row < Math.ceil(H / cloudH) + 1; row++) {
    const cy = row * cloudH + offset2;
    // Scattered cloud patches using deterministic positions
    for (let i = 0; i < 3; i++) {
      const seed = (row * 7 + i * 13) & 0xFF;
      const cx = (seed * 3.7) % W;
      const cw = 80 + (seed % 60);
      const ch = 20 + (seed % 16);
      renderer.fillRect(cx, cy + i * 50, cw, ch, hexToRgba('#ffffff', 0.06));
      renderer.fillRect(cx + 10, cy + i * 50 + 4, cw - 20, ch - 8, hexToRgba('#ffffff', 0.04));
    }
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
  if (p.autoBomb) text.drawText('AUTO', 560, 60, 24, '#ff6666');
  text.drawText(`WAVE ${state.wave}/${campaign.finalWave}`, 680, 20, 36, '#f1fbff');
  text.drawText(campaign.name, 680, 60, 28, '#b6daf4');

  if (state.grazeCount > 0) text.drawText(`GRAZE ${state.grazeCount}`, 680, 104, 24, '#66ffff');

  text.drawText(`PLANE ${p.plane.name}`, 24, H - 48, 28, p.plane.color);
  text.drawText(`SPECIAL ${p.plane.special.name}`, 440, H - 48, 28, '#d5e7ff');

  const cdPct = p.specialCooldown / p.plane.special.cooldown;
  const cdW = 240;
  renderer.fillRect(700, H - 52, cdW, 16, '#334f66');
  renderer.fillRect(700, H - 52, Math.floor(cdW * (1 - cdPct)), 16, '#79c7ff');

  if (p.doubleShotTimer > 0) text.drawText('DOUBLE', 24, 104, 24, '#ffe48d');
  if (p.speedBoostTimer > 0) text.drawText('SPEED', 160, 104, 24, '#8effb5');
  if (p.shieldTimer > 0) text.drawText('SHIELD', 280, 104, 24, '#9bc8ff');

  // ARCADE-020: Roll stock icons
  const rollIconY = 62;
  const rollIconX = 580;
  text.drawText('ROLL', rollIconX - 56, rollIconY - 2, 20, '#b6daf4');
  for (let i = 0; i < p.rollMaxStocks; i++) {
    const ix = rollIconX + i * 22;
    if (i < p.rollStocks) {
      renderer.fillRect(ix, rollIconY, 16, 16, '#79c7ff');
      renderer.fillRect(ix + 2, rollIconY + 2, 12, 12, '#b8e8ff');
    } else {
      renderer.fillRect(ix, rollIconY, 16, 16, '#334f66');
      renderer.fillRect(ix + 2, rollIconY + 2, 12, 12, '#223344');
    }
  }

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
      'Controls: Arrows move, Space shoot, Shift/Double-Space roll, X special, B bomb, A auto-bomb, F/Z focus\n' +
      'Select Plane: keys 1-4\nPress SPACE to launch'
    );
  }

  function resetRun() {
    state = makeInitialState(PLANES[selectedPlaneIndex].id);
    queueDialogue(state, getDialogue(getCampaign(0).id, 'intro'), 260);
    spawnWave(state);
  }

  // Start preloading sprite images immediately
  preloadSpriteImages();

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
    // Upload sprite textures to GPU once images are loaded
    if (spritesLoaded && !spritesUploaded) {
      uploadSpriteTextures(renderer);
    }

    // ARCADE-010: Campaign intro screen — black screen with campaign name
    if (state.campaignIntroTimer > 0) {
      renderer.fillRect(0, 0, W, H, '#000000');
      const alpha = Math.min(1, Math.min(state.campaignIntroTimer / 30, (180 - state.campaignIntroTimer) / 30));
      const color = `rgba(255,255,255,${alpha.toFixed(2)})`;
      const name = state.campaignIntroName || '';
      text.drawText(name, W / 2 - name.length * 16, H / 2 - 30, 64, color);
      return;
    }

    // Screen shake via canvas CSS transform
    if (state.screenShakeTimer > 0) {
      const shakeX = Math.round((Math.random() - 0.5) * 8);
      const shakeY = Math.round((Math.random() - 0.5) * 8);
      renderer.canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
    } else {
      renderer.canvas.style.transform = '';
    }

    const campaign = getCampaign(state.campaignIndex);
    drawBackground(renderer, campaign, state.flashTimer, state.tick);

    // ARCADE-016: Bomb darken overlay
    if (state.bombDarkenTimer > 0) {
      const darkenAlpha = Math.min(0.5, state.bombDarkenTimer / 30 * 0.5);
      renderer.fillRect(0, 0, W, H, `rgba(0,0,0,${darkenAlpha.toFixed(2)})`);
    }

    // ARCADE-016: Chain milestone pulse flash
    if (state.chainPulseFlash > 0) {
      const pulseAlpha = (state.chainPulseFlash / 12 * 0.15).toFixed(2);
      renderer.fillRect(0, 0, W, H, `rgba(255,255,100,${pulseAlpha})`);
    }

    drawAmbient(renderer, state.ambience, campaign);

    // Draw signature whale
    if (state.signatureWhale) {
      const whale = state.signatureWhale;
      // Main body
      renderer.fillRect(whale.x, whale.y, whale.w, whale.h, '#3a7ca5');
      // Darker dorsal
      renderer.fillRect(whale.x + 20, whale.y, whale.w - 40, whale.h * 0.35, '#2d6080');
      // Lighter belly
      renderer.fillRect(whale.x + 20, whale.y + whale.h * 0.65, whale.w - 40, whale.h * 0.25, '#6db8d8');
      // Head (front bulge)
      renderer.fillRect(whale.x + whale.w - 30, whale.y + 8, 30, whale.h - 16, '#3580a8');
      // Tail flukes
      renderer.fillRect(whale.x - 24, whale.y + 10, 32, 18, '#2d6080');
      renderer.fillRect(whale.x - 24, whale.y + whale.h - 28, 32, 18, '#2d6080');
      renderer.fillRect(whale.x - 40, whale.y + 4, 20, 12, '#265a78');
      renderer.fillRect(whale.x - 40, whale.y + whale.h - 16, 20, 12, '#265a78');
      // Eye
      renderer.fillRect(whale.x + whale.w - 50, whale.y + 18, 8, 8, '#e0f0ff');
      // Subtle fin
      renderer.fillRect(whale.x + whale.w * 0.4, whale.y - 14, 24, 16, '#2d6080');
    }

    for (const p of state.powerups) {
      const puSprite = getPowerupSpriteName(p.id);
      if (puSprite && renderer.hasSpriteTexture(puSprite)) {
        renderer.drawSprite(puSprite, p.x, p.y, p.w, p.h, 1);
      } else {
        drawPixelSprite(renderer, buildPowerupSprite(p.id), p.x, p.y, 6, '#ffd166');
      }
    }

    // Player bullet glow trails (afterimage)
    for (const t of state.bulletTrails) {
      const alpha = (t.life / 3 * 0.35).toFixed(2);
      renderer.fillRect(t.x, t.y, t.w, t.h, `rgba(0,255,255,${alpha})`);
    }

    // Player bullets: bright cyan body with white core stripe
    for (const b of state.bullets) {
      // Outer glow
      renderer.setGlow('#00ffff', 0.5);
      // Cyan body
      renderer.fillRect(b.x, b.y, b.w, b.h, '#00ffff');
      renderer.setGlow(null);
      // White core stripe (centered, 2px wide)
      const coreW = 2;
      const coreX = b.x + (b.w - coreW) / 2;
      renderer.fillRect(coreX, b.y, coreW, b.h, '#ffffff');
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
      const enemySprite = getEnemySpriteName(enemy);
      if (enemySprite && renderer.hasSpriteTexture(enemySprite)) {
        renderer.drawSprite(enemySprite, enemy.x, enemy.y, enemy.w, enemy.h, alpha);
      } else {
        drawPixelSprite(renderer, frameId, enemy.x, enemy.y, enemy.tier === 'normal' ? ENEMY_SCALE : (enemy.tier === 'mini' ? MINI_BOSS_SCALE : FINAL_BOSS_SCALE), tint, alpha);
      }

      if (enemy.tier !== 'normal') {
        const w = enemy.w;
        const hpPct = clamp(enemy.hp / enemy.maxHp, 0, 1);
        renderer.fillRect(enemy.x, enemy.y - 16, w, 6, '#2f3148');
        renderer.fillRect(enemy.x, enemy.y - 16, Math.floor(w * hpPct), 6, '#ff8f7a');
      }
    }

    for (const tr of state.player.rollTrail) {
      const trailAlpha = tr.life / 18 * 0.45;
      const trailSprite = getPlayerSpriteName(state.player.plane.id, 0); // idle for trail
      if (renderer.hasSpriteTexture(trailSprite)) {
        renderer.drawSprite(trailSprite, tr.x, tr.y, state.player.w, state.player.h, trailAlpha);
      } else {
        const frame = tr.life % 2 ? 'roll_1' : 'roll_2';
        drawPixelSprite(renderer, frame, tr.x, tr.y, PLAYER_SCALE, state.player.plane.color, trailAlpha);
      }
    }

    const playerAlpha = (state.player.invuln > 0 || state.player.bombInvuln > 0) && state.tick % 6 < 3 ? 0.55 : 1;
    const bankOffset = clamp(state.player.vx * 0.4, -2, 2);
    const playerImgName = state.player.rollTimer > 0
      ? getPlayerSpriteName(state.player.plane.id, 0) // idle during roll
      : getPlayerSpriteName(state.player.plane.id, state.player.vx);
    if (renderer.hasSpriteTexture(playerImgName)) {
      renderer.drawSprite(playerImgName, state.player.x + bankOffset, state.player.y, state.player.w, state.player.h, playerAlpha);
    } else {
      const playerSprite = state.player.rollTimer > 0
        ? (Math.floor(state.player.rollTimer / 6) % 2 ? 'roll_1' : 'roll_2')
        : `plane_${state.player.plane.id}`;
      drawPixelSprite(renderer, playerSprite, state.player.x + bankOffset, state.player.y, PLAYER_SCALE, state.player.plane.color, playerAlpha);
    }

    // ARCADE-015: Focus mode — draw hitbox dot and FOCUS text
    if (state.focusActive) {
      const pcx = state.player.x + state.player.w / 2;
      const pcy = state.player.y + state.player.h / 2;
      renderer.fillCircle(pcx, pcy, 3, '#ffffff');
      // Outer glow ring
      renderer.fillCircle(pcx, pcy, 6, 'rgba(255,255,255,0.3)');
      text.drawText('FOCUS', pcx - 30, state.player.y + state.player.h + 8, 20, '#ffffff');
    }

    // Draw signature wingman
    if (state.signatureWingman) {
      const wm = state.signatureWingman;
      const wmSprite = getPlayerSpriteName(state.player.plane.id, 0);
      if (renderer.hasSpriteTexture(wmSprite)) {
        renderer.drawSprite(wmSprite, wm.x, wm.y, wm.w, wm.h, 0.85);
      } else {
        drawPixelSprite(renderer, `plane_${state.player.plane.id}`, wm.x, wm.y, PLAYER_SCALE, '#66ff88', 0.85);
      }
      // Engine glow
      renderer.fillRect(wm.x + wm.w / 2 - 4, wm.y + wm.h, 8, 12, '#ffaa44');
    }

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

    // Chain display
    if (state.chainCount > 1) {
      const chainColor = getChainColor(state.chainCount);
      const multiplier = getChainMultiplier(state.chainCount);
      const pulse = state.chainPulse > 0 ? 1 + state.chainPulse * 0.02 : 1;
      const baseSize = 40;
      const fontSize = Math.round(baseSize * pulse);
      const multSize = Math.round(30 * pulse);
      const chainText = `CHAIN ${state.chainCount}`;
      const multText = `x${multiplier.toFixed(1)}`;
      const cx = W / 2;
      text.drawText(chainText, cx - chainText.length * 10, 100, fontSize, chainColor);
      text.drawText(multText, cx - multText.length * 6, 100 + fontSize + 4, multSize, chainColor);
      // Chain timer bar
      const barW = 160;
      const barH = 6;
      const barX = cx - barW / 2;
      const barY = 100 + fontSize + multSize + 12;
      const timerPct = state.chainTimer / getChainWindow(state.chainCount);
      renderer.fillRect(barX, barY, barW, barH, '#334f66');
      renderer.fillRect(barX, barY, Math.floor(barW * timerPct), barH, chainColor);
    }

    // ARCADE-021: 1-UP flash text
    if (state.oneUpTimer > 0) {
      const alpha = Math.min(1, state.oneUpTimer / 15);
      const color = `rgba(255,255,0,${alpha.toFixed(2)})`;
      const blink = Math.floor(state.oneUpTimer / 6) % 2 === 0;
      if (blink) {
        text.drawText('1-UP', W / 2 - 48, 140, 48, color);
      }
    }

    updateAndDrawScorePops(text, state);
    drawUI(renderer, text, state);
  };

  game.start();
}
