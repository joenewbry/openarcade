// pixel-fighter/game.js — Pixel Fighter as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 350;
const FLOOR_Y = 280;
const GRAVITY = 1400;
const THEME = '#f44';
const MAX_HP = 100;
const ROUND_TIME = 60;
const MAX_ROUNDS = 3;
const COMBO_WINDOW = 30;
const SPECIAL_COOLDOWN = 180;

// { damage, startup, active, recovery, knockback, hitstun, blockstun, chipDamage }
const MOVES = {
  jab:         { damage: 6,  startup: 4,  active: 3,  recovery: 6,  knockback: 40,  hitstun: 12, blockstun: 6,  chipDamage: 1, type: 'punch' },
  kick:        { damage: 10, startup: 7,  active: 4,  recovery: 10, knockback: 70,  hitstun: 18, blockstun: 10, chipDamage: 2, type: 'kick' },
  special:     { damage: 22, startup: 14, active: 6,  recovery: 18, knockback: 130, hitstun: 28, blockstun: 16, chipDamage: 4, type: 'special' },
  jumpKick:    { damage: 12, startup: 3,  active: 5,  recovery: 8,  knockback: 60,  hitstun: 16, blockstun: 8,  chipDamage: 2, type: 'kick' },
  crouchPunch: { damage: 7,  startup: 5,  active: 3,  recovery: 7,  knockback: 30,  hitstun: 14, blockstun: 7,  chipDamage: 1, type: 'punch' },
  crouchKick:  { damage: 9,  startup: 6,  active: 4,  recovery: 9,  knockback: 50,  hitstun: 16, blockstun: 9,  chipDamage: 2, type: 'kick' }
};

// ── Game state (module-level, reset each match) ──
let player, ai;
let particles, comboTexts;
let screenShake, announceText, announceTimer;
let roundNum, roundTimer, frameCount;
let playerRoundsWon, aiRoundsWon;
let score;
let gameState; // 'waiting' | 'playing' | 'roundEnd' | 'over'

// AI
let aiPersonality;
let aiDecisionTimer, aiCurrentAction;

// Input — justPressed needs per-frame tracking
const keysJustPressed = {};

// DOM
const scoreEl = document.getElementById('score');
const roundDispEl = document.getElementById('roundDisp');
const timerDispEl = document.getElementById('timerDisp');

// ── Fighter factory ──
function createFighter(x, facingRight, isAI) {
  return {
    x, y: FLOOR_Y, vx: 0, vy: 0,
    w: 36, h: 64,
    hp: MAX_HP,
    facingRight, isAI,
    state: 'idle',
    attackMove: null,
    attackFrame: 0,
    stateTimer: 0,
    blocking: false,
    crouching: false,
    grounded: true,
    specialCooldown: 0,
    comboHits: 0,
    comboSequence: [],
    comboTimer: 0,
    comboDamageBonus: 1.0,
    animFrame: 0,
    animTimer: 0,
    walkFrame: 0,
    hitConnected: false,
    wins: 0,
    actionHistory: [],
  };
}

// ── Helpers ──
function getHurtbox(f) {
  const h = f.crouching ? f.h * 0.6 : f.h;
  const yOff = f.crouching ? f.h - h : 0;
  return { x: f.x, y: f.y - f.h + yOff, w: f.w, h };
}

function getAttackHitbox(f) {
  if (!f.attackMove) return null;
  const move = MOVES[f.attackMove];
  if (f.attackFrame < move.startup || f.attackFrame >= move.startup + move.active) return null;
  const reach = f.attackMove === 'special' ? 55 : (f.attackMove.includes('kick') || f.attackMove === 'kick' ? 45 : 35);
  const hbW = reach;
  const hbH = f.crouching ? 20 : (f.attackMove === 'jumpKick' ? 25 : 30);
  const hbX = f.facingRight ? f.x + f.w : f.x - hbW;
  let hbY = f.y - f.h / 2;
  if (f.attackMove === 'crouchPunch' || f.attackMove === 'crouchKick') hbY = f.y - 20;
  if (f.attackMove === 'jumpKick') hbY = f.y - f.h / 2;
  return { x: hbX, y: hbY, w: hbW, h: hbH };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function startAttack(f, moveName) {
  f.state = 'attack';
  f.attackMove = moveName;
  f.attackFrame = 0;
  f.hitConnected = false;
}

// ── Combo ──
function checkCombo(fighter) {
  const seq = fighter.comboSequence;
  if (seq.length >= 3) {
    const last3 = seq.slice(-3).join(',');
    if (last3 === 'jab,jab,kick') {
      fighter.comboDamageBonus = 1.5;
      spawnComboText(fighter, 'TRIPLE STRIKE!');
      return;
    }
    if (last3 === 'jab,kick,special') {
      fighter.comboDamageBonus = 2.0;
      spawnComboText(fighter, 'FURY CHAIN!');
      return;
    }
  }
  fighter.comboDamageBonus = seq.length >= 2 ? 1.0 + (seq.length - 1) * 0.15 : 1.0;
}

function spawnComboText(fighter, text) {
  comboTexts.push({
    x: fighter.x + fighter.w / 2,
    y: fighter.y - fighter.h - 20,
    text, timer: 60, color: '#ff0'
  });
}

// ── Hit resolution ──
function resolveHit(attacker, defender) {
  if (attacker.hitConnected) return;
  const move = MOVES[attacker.attackMove];
  if (!move) return;
  attacker.hitConnected = true;

  const blocked = defender.blocking && defender.state !== 'hitstun';
  if (blocked) {
    defender.hp = Math.max(0, defender.hp - move.chipDamage);
    defender.state = 'blockstun';
    defender.stateTimer = move.blockstun;
    if (!attacker.isAI) score += move.chipDamage;
    screenShake = 3;
    spawnBlockSparks(defender);
  } else {
    attacker.comboHits++;
    attacker.comboSequence.push(attacker.attackMove);
    attacker.comboTimer = COMBO_WINDOW;
    checkCombo(attacker);

    const dmg = Math.round(move.damage * attacker.comboDamageBonus);
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.state = 'hitstun';
    defender.stateTimer = move.hitstun;

    const kb = move.knockback * (attacker.facingRight ? 1 : -1);
    defender.vx = kb * 3;
    if (move.type === 'special') { defender.vy = -200; defender.grounded = false; }

    if (!attacker.isAI) {
      score += dmg * 2;
      if (attacker.comboHits >= 3) score += attacker.comboHits * 10;
    }
    if (scoreEl) scoreEl.textContent = score;
    screenShake = move.type === 'special' ? 8 : 5;
    spawnHitSparks(defender, move.type);
  }
}

// ── Effects ──
function spawnHitSparks(target, type) {
  const cx = target.x + target.w / 2;
  const cy = target.y - target.h / 2;
  const count = type === 'special' ? 20 : 10;
  const colors = type === 'special' ? ['#ff0', '#f80', '#f44', '#fff'] : ['#fff', '#ff0', '#f80'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    const life = 0.3 + Math.random() * 0.3;
    particles.push({
      x: cx + (Math.random() - 0.5) * 10,
      y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, maxLife: life,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: type === 'special' ? 3 + Math.random() * 3 : 2 + Math.random() * 2
    });
  }
}

function spawnBlockSparks(target) {
  const cx = target.x + target.w / 2;
  const cy = target.y - target.h / 2;
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2, maxLife: 0.2,
      color: '#88f', size: 2
    });
  }
}

// ── Fighter update ──
function updateFighter(f, opponent, dtSec) {
  f.animTimer++;
  if (f.animTimer >= 8) { f.animTimer = 0; f.animFrame = (f.animFrame + 1) % 4; }

  if (f.specialCooldown > 0) f.specialCooldown--;
  if (f.comboTimer > 0) {
    f.comboTimer--;
    if (f.comboTimer <= 0) {
      f.comboHits = 0;
      f.comboSequence = [];
      f.comboDamageBonus = 1.0;
    }
  }

  if (f.state !== 'hitstun' && f.state !== 'blockstun' && f.state !== 'attack') {
    f.facingRight = f.x < opponent.x;
  }

  switch (f.state) {
    case 'attack':
      f.attackFrame++;
      const mv = MOVES[f.attackMove];
      if (mv && f.attackFrame >= mv.startup + mv.active + mv.recovery) {
        f.state = 'idle';
        f.attackMove = null;
        f.attackFrame = 0;
        f.hitConnected = false;
      }
      if (mv && f.attackFrame >= mv.startup && f.attackFrame < mv.startup + mv.active) {
        const hitbox = getAttackHitbox(f);
        const hurtbox = getHurtbox(opponent);
        if (hitbox && hurtbox && rectsOverlap(hitbox, hurtbox)) resolveHit(f, opponent);
      }
      break;
    case 'hitstun':
      f.stateTimer--;
      if (f.stateTimer <= 0) { f.state = 'idle'; f.vx = 0; }
      break;
    case 'blockstun':
      f.stateTimer--;
      if (f.stateTimer <= 0) f.state = 'idle';
      break;
  }

  if (!f.grounded) {
    f.vy += GRAVITY * dtSec;
    f.y += f.vy * dtSec;
    if (f.y >= FLOOR_Y) { f.y = FLOOR_Y; f.vy = 0; f.grounded = true; }
  }

  if (f.state === 'hitstun' || f.state === 'blockstun') {
    f.x += f.vx * dtSec;
    f.vx *= 0.9;
  }

  f.x = Math.max(10, Math.min(W - f.w - 10, f.x));

  const dist = Math.abs(f.x - opponent.x);
  if (dist < f.w + 4 && f.state !== 'hitstun' && opponent.state !== 'hitstun') {
    const push = (f.w + 4 - dist) / 2;
    if (f.x < opponent.x) { f.x -= push; opponent.x += push; }
    else { f.x += push; opponent.x -= push; }
  }
}

// ── Player input ──
function handlePlayerInput(input, dtSec) {
  const p = player;
  if (p.state === 'hitstun' || p.state === 'blockstun') return;

  const justZ = keysJustPressed['z'] || keysJustPressed['Z'];
  const justX = keysJustPressed['x'] || keysJustPressed['X'];
  const justC = keysJustPressed['c'] || keysJustPressed['C'];

  p.blocking = input.isDown('s') || input.isDown('S');
  if (p.blocking && p.state !== 'attack') {
    p.state = 'idle';
    p.vx = 0;
    p.actionHistory.push('block');
    return;
  }

  if (p.state !== 'attack') {
    if (!p.grounded && justX) {
      startAttack(p, 'jumpKick');
      p.actionHistory.push('jump');
      return;
    }
    if (p.crouching) {
      if (justZ) { startAttack(p, 'crouchPunch'); p.actionHistory.push('crouch'); return; }
      if (justX) { startAttack(p, 'crouchKick'); p.actionHistory.push('crouch'); return; }
    }
    if (justZ) { startAttack(p, 'jab'); p.actionHistory.push('jab'); return; }
    if (justX) { startAttack(p, 'kick'); p.actionHistory.push('kick'); return; }
    if (justC && p.specialCooldown <= 0) {
      startAttack(p, 'special');
      p.specialCooldown = SPECIAL_COOLDOWN;
      p.actionHistory.push('special');
      return;
    }
  }

  if (p.state === 'attack') return;

  p.crouching = input.isDown('ArrowDown');
  if (p.crouching) { p.state = 'crouch'; p.vx = 0; return; }

  if (input.isDown('ArrowUp') && p.grounded) {
    p.vy = -520;
    p.grounded = false;
    p.state = 'jump';
    p.actionHistory.push('jump');
    return;
  }

  if (input.isDown('ArrowLeft')) { p.vx = -180; }
  else if (input.isDown('ArrowRight')) { p.vx = 180; }
  else { p.vx = 0; }

  if (p.vx !== 0 && p.grounded) { p.state = 'walk'; p.x += p.vx * dtSec; }
  else if (p.grounded) { p.state = 'idle'; }
  if (!p.grounded) { p.x += p.vx * dtSec; }
}

// ── AI ──
function aiAdapt() {
  const hist = player.actionHistory;
  if (hist.length < 5) return;
  const counts = { jab: 0, kick: 0, special: 0, block: 0, jump: 0, crouch: 0 };
  const recent = hist.slice(-30);
  for (const a of recent) { if (counts[a] !== undefined) counts[a]++; }
  const total = recent.length || 1;

  if (counts.jab / total > 0.3) {
    aiPersonality.blockPref = Math.min(0.6, aiPersonality.blockPref + aiPersonality.adaptRate);
    aiPersonality.aggression = Math.max(0.2, aiPersonality.aggression - 0.05);
  }
  if (counts.block / total > 0.25) {
    aiPersonality.specialPref = Math.min(0.35, aiPersonality.specialPref + aiPersonality.adaptRate);
    aiPersonality.aggression = Math.min(0.8, aiPersonality.aggression + 0.1);
  }
  if (counts.jump / total > 0.2) aiPersonality.jumpPref = Math.max(0.05, aiPersonality.jumpPref - 0.05);
  if (counts.special / total > 0.15) aiPersonality.reactionSpeed = Math.max(6, aiPersonality.reactionSpeed - 2);
}

function updateAI(dtSec) {
  const a = ai;
  if (a.state === 'hitstun' || a.state === 'blockstun') return;

  aiDecisionTimer--;
  if (aiDecisionTimer > 0 && aiCurrentAction === 'wait') return;

  const distX = Math.abs(a.x - player.x);
  const playerAttacking = player.state === 'attack';
  const inRange = distX < 80;
  const closeRange = distX < 55;
  const farRange = distX > 200;

  if (aiDecisionTimer <= 0) {
    aiDecisionTimer = aiPersonality.reactionSpeed + Math.floor(Math.random() * 8);
    const r = Math.random();

    if (playerAttacking && inRange) {
      if (r < aiPersonality.blockPref) aiCurrentAction = 'block';
      else if (r < aiPersonality.blockPref + aiPersonality.jumpPref) aiCurrentAction = 'jumpBack';
      else aiCurrentAction = 'counterAttack';
      return;
    }
    if (!player.grounded && distX < 120) {
      aiCurrentAction = r < 0.5 ? 'antiAir' : 'block';
      return;
    }
    if (closeRange) {
      if (r < aiPersonality.aggression * 0.7) {
        const atkRoll = Math.random();
        if (atkRoll < 0.4) aiCurrentAction = 'jab';
        else if (atkRoll < 0.7) aiCurrentAction = 'kick';
        else if (a.specialCooldown <= 0 && Math.random() < aiPersonality.specialPref * 2) aiCurrentAction = 'special';
        else aiCurrentAction = 'jab';
      } else if (r < aiPersonality.aggression * 0.7 + 0.2) aiCurrentAction = 'block';
      else aiCurrentAction = 'walkBack';
      return;
    }
    if (inRange) {
      if (r < aiPersonality.aggression) {
        const atkRoll2 = Math.random();
        if (atkRoll2 < 0.35) aiCurrentAction = 'jab';
        else if (atkRoll2 < 0.65) aiCurrentAction = 'kick';
        else if (a.specialCooldown <= 0 && atkRoll2 < 0.65 + aiPersonality.specialPref) aiCurrentAction = 'special';
        else aiCurrentAction = 'kick';
      } else {
        aiCurrentAction = r < 0.5 ? 'block' : 'walkBack';
      }
      return;
    }
    if (farRange) {
      if (r < 0.6) aiCurrentAction = 'approach';
      else if (r < 0.8) aiCurrentAction = 'jumpForward';
      else aiCurrentAction = 'wait';
      return;
    }
    if (r < aiPersonality.aggression * 0.8) aiCurrentAction = 'approach';
    else if (r < aiPersonality.aggression * 0.8 + 0.15) aiCurrentAction = 'jumpForward';
    else aiCurrentAction = 'wait';
  }

  a.blocking = false;
  a.crouching = false;

  switch (aiCurrentAction) {
    case 'approach':
      if (a.state !== 'attack') {
        a.state = 'walk';
        a.vx = a.facingRight ? 160 : -160;
        a.x += a.vx * dtSec;
      }
      break;
    case 'walkBack':
      if (a.state !== 'attack') {
        a.state = 'walk';
        a.vx = a.facingRight ? -140 : 140;
        a.x += a.vx * dtSec;
      }
      break;
    case 'block':
      a.blocking = true; a.state = 'idle'; a.vx = 0;
      break;
    case 'jab':
      if (a.state !== 'attack') startAttack(a, 'jab');
      aiCurrentAction = 'wait';
      if (Math.random() < 0.35) {
        setTimeout(() => {
          if (a.state !== 'hitstun' && gameState === 'playing') {
            aiCurrentAction = 'kick';
            aiDecisionTimer = 2;
          }
        }, 250);
      }
      break;
    case 'kick':
      if (a.state !== 'attack') startAttack(a, 'kick');
      aiCurrentAction = 'wait';
      break;
    case 'special':
      if (a.state !== 'attack' && a.specialCooldown <= 0) {
        startAttack(a, 'special');
        a.specialCooldown = SPECIAL_COOLDOWN;
      }
      aiCurrentAction = 'wait';
      break;
    case 'counterAttack':
      if (a.state !== 'attack') startAttack(a, Math.random() < 0.5 ? 'jab' : 'kick');
      aiCurrentAction = 'wait';
      break;
    case 'antiAir':
      if (a.state !== 'attack') startAttack(a, 'kick');
      aiCurrentAction = 'wait';
      break;
    case 'jumpForward':
      if (a.grounded) { a.vy = -480; a.grounded = false; a.state = 'jump'; a.vx = a.facingRight ? 140 : -140; }
      aiCurrentAction = 'wait';
      break;
    case 'jumpBack':
      if (a.grounded) { a.vy = -420; a.grounded = false; a.state = 'jump'; a.vx = a.facingRight ? -120 : 120; }
      aiCurrentAction = 'wait';
      break;
    case 'wait':
      if (a.state !== 'attack') { a.state = a.grounded ? 'idle' : 'jump'; }
      a.vx = 0;
      break;
  }
}

// ── Match control ──
function initPersonality() {
  aiPersonality = {
    aggression: 0.5,
    reactionSpeed: 12,
    specialPref: 0.15,
    blockPref: 0.3,
    jumpPref: 0.15,
    adaptRate: 0.1
  };
  aiDecisionTimer = 0;
  aiCurrentAction = 'idle';
}

function announce(text) {
  announceText = text;
  announceTimer = 90;
}

function startRound() {
  player = createFighter(120, true, false);
  ai = createFighter(W - 156, false, true);
  roundTimer = ROUND_TIME;
  frameCount = 0;
  particles = [];
  comboTexts = [];
  screenShake = 0;
  if (roundDispEl) roundDispEl.textContent = roundNum;
  announce('ROUND ' + roundNum);
}

// ── Drawing ──

function drawArena(renderer) {
  // Background gradient approximated with two rects
  renderer.fillRect(0, 0, W, H * 0.7, '#0d0d1a');
  renderer.fillRect(0, H * 0.7, W, H * 0.3, '#16213e');

  // Floor slab
  renderer.fillRect(0, FLOOR_Y + 2, W, H - FLOOR_Y, '#222244');

  // Floor glow line
  renderer.setGlow(THEME, 0.8);
  renderer.drawLine(0, FLOOR_Y + 2, W, FLOOR_Y + 2, THEME, 2);
  renderer.setGlow(null);

  // Grid lines (very faint)
  for (let x = 0; x < W; x += 40) {
    renderer.drawLine(x, FLOOR_Y + 2, x, H, '#f4440015', 1);
  }
  for (let y = FLOOR_Y + 20; y < H; y += 20) {
    renderer.drawLine(0, y, W, y, '#f4440015', 1);
  }

  // Background pillars
  renderer.fillRect(50, 60, 16, FLOOR_Y - 58, '#f444440a');
  renderer.fillRect(W - 66, 60, 16, FLOOR_Y - 58, '#f444440a');
}

function drawHealthBar(renderer, text, x, y, w, h, hp, maxHp, color, label, leftAligned) {
  // Background
  renderer.fillRect(x, y, w, h, '#111111');
  renderer.strokePoly([
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
  ], '#555555', 1);

  const ratio = hp / maxHp;
  const fillW = w * ratio;
  const healthColor = ratio > 0.5 ? color : (ratio > 0.25 ? '#ff0' : '#f44');

  renderer.setGlow(healthColor, 0.5);
  if (leftAligned) {
    renderer.fillRect(x + 1, y + 1, Math.max(0, fillW - 2), h - 2, healthColor);
  } else {
    renderer.fillRect(x + w - fillW + 1, y + 1, Math.max(0, fillW - 2), h - 2, healthColor);
  }
  renderer.setGlow(null);

  // Labels
  text.drawText(label, leftAligned ? x + 4 : x + w - 4, y + 2, 10, '#ffffff', leftAligned ? 'left' : 'right');
  text.drawText(String(Math.ceil(hp)), leftAligned ? x + w - 4 : x + 4, y + 2, 10, '#ffffff', leftAligned ? 'right' : 'left');
}

function drawHealthBars(renderer, text) {
  const barW = 200, barH = 16, barY = 16, gap = 10;
  drawHealthBar(renderer, text, gap, barY, barW, barH, player.hp, MAX_HP, '#4f4', 'P1', true);
  drawHealthBar(renderer, text, W - barW - gap, barY, barW, barH, ai.hp, MAX_HP, '#f44', 'AI', false);

  // Round win indicators
  const centerX = W / 2;
  for (let i = 0; i < 2; i++) {
    const col = i < playerRoundsWon ? '#44ff44' : '#333333';
    if (i < playerRoundsWon) renderer.setGlow('#4f4', 0.6);
    renderer.fillCircle(centerX - 20 - i * 18, barY + barH / 2, 5, col);
    renderer.setGlow(null);
  }
  for (let i = 0; i < 2; i++) {
    const col = i < aiRoundsWon ? '#f44' : '#333333';
    if (i < aiRoundsWon) renderer.setGlow('#f44', 0.6);
    renderer.fillCircle(centerX + 20 + i * 18, barY + barH / 2, 5, col);
    renderer.setGlow(null);
  }

  text.drawText('VS', centerX, barY + barH / 2 - 5, 10, '#666666', 'center');

  // Timer
  renderer.setGlow(THEME, 0.5);
  text.drawText(String(Math.max(0, Math.ceil(roundTimer))), centerX, barY + barH + 4, 20, '#ffffff', 'center');
  renderer.setGlow(null);
}

function drawFighter(renderer, text, f, color1, color2) {
  const cx = f.x + f.w / 2;
  const flip = f.facingRight ? 1 : -1;

  // Ground shadow (dark ellipse approximated as thin rect)
  renderer.fillRect(cx - 18, FLOOR_Y + 1, 36, 6, '#00000050');

  let bodyY = f.y;
  let headY = bodyY - f.h;
  let bobble = 0;
  let legOffset = 0;

  if (f.state === 'walk') {
    f.walkFrame += 0.15;
    bobble = Math.sin(f.walkFrame * 4) * 2;
    legOffset = Math.sin(f.walkFrame * 4) * 8;
  }
  if (f.state === 'crouch' || f.crouching) headY += 16;
  if (f.state === 'hitstun') bobble = Math.sin(frameCount * 0.5) * 3;

  headY += bobble;
  const torsoTop = headY + 14;
  const torsoBot = bodyY - 14;
  const hipY = bodyY - 6;
  const shoulderY = torsoTop + 4;

  // == Legs ==
  if (f.crouching || f.state === 'crouch') {
    // Crouched legs as line segments
    renderer.drawLine(cx - 6 * flip, hipY + 8, cx - 12 * flip, hipY + 14, color1, 4);
    renderer.drawLine(cx - 12 * flip, hipY + 14, cx - 6 * flip, hipY + 18, color1, 4);
    renderer.drawLine(cx + 4 * flip, hipY + 8, cx + 10 * flip, hipY + 14, color1, 4);
    renderer.drawLine(cx + 10 * flip, hipY + 14, cx + 4 * flip, hipY + 18, color1, 4);
  } else {
    // Standing legs
    renderer.drawLine(cx - 5, hipY, cx - 5 - legOffset * flip * 0.5, hipY + 14, color1, 4);
    renderer.drawLine(cx - 5 - legOffset * flip * 0.5, hipY + 14, cx - 5 - legOffset * flip, bodyY + 4, color1, 4);
    renderer.drawLine(cx + 5, hipY, cx + 5 + legOffset * flip * 0.5, hipY + 14, color1, 4);
    renderer.drawLine(cx + 5 + legOffset * flip * 0.5, hipY + 14, cx + 5 + legOffset * flip, bodyY + 4, color1, 4);
    // Feet
    renderer.fillRect(cx - 8 - legOffset * flip - 2, bodyY + 1, 6, 3, color2);
    renderer.fillRect(cx + 2 + legOffset * flip - 2, bodyY + 1, 6, 3, color2);
  }

  // == Torso ==
  renderer.fillRect(cx - 9, torsoTop, 18, torsoBot - torsoTop + 6, color1);
  renderer.fillRect(cx - 9, hipY - 2, 18, 4, color2);

  // == Arms ==
  if (f.state === 'attack' && f.attackMove) {
    drawAttackArms(renderer, f, cx, shoulderY, flip, color1, color2);
  } else if (f.blocking) {
    renderer.drawLine(cx + 8 * flip, shoulderY, cx + 18 * flip, shoulderY + 6, color1, 4);
    renderer.drawLine(cx + 18 * flip, shoulderY + 6, cx + 14 * flip, shoulderY - 4, color1, 4);
    renderer.drawLine(cx - 2 * flip, shoulderY, cx + 12 * flip, shoulderY + 10, color1, 4);
    renderer.drawLine(cx + 12 * flip, shoulderY + 10, cx + 10 * flip, shoulderY, color1, 4);
    // Block shield arc (approximated as strokePoly arc segments)
    const arcCx = cx + 16 * flip;
    const arcCy = shoulderY + 4;
    const arcPts = [];
    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 8) {
      arcPts.push({ x: arcCx + Math.cos(a) * 12, y: arcCy + Math.sin(a) * 12 });
    }
    renderer.strokePoly(arcPts, '#6464ff66', 2, false);
  } else {
    const armBob = Math.sin(f.animFrame * 0.5 + frameCount * 0.05) * 2;
    // Front arm
    renderer.drawLine(cx + 8 * flip, shoulderY, cx + 16 * flip, shoulderY - 4 + armBob, color1, 4);
    renderer.drawLine(cx + 16 * flip, shoulderY - 4 + armBob, cx + 20 * flip, shoulderY - 8 + armBob, color1, 4);
    renderer.fillRect(cx + 18 * flip - 2, shoulderY - 10 + armBob, 5, 5, color2);
    // Back arm
    renderer.drawLine(cx - 4 * flip, shoulderY + 2, cx + 6 * flip, shoulderY + 12, color1, 4);
    renderer.fillRect(cx + 4 * flip - 2, shoulderY + 10, 5, 5, color2);
  }

  // == Head ==
  const headCx = cx + 2 * flip;
  const headCy = headY + 7;
  renderer.fillCircle(headCx, headCy, 9, color1);

  // Headband
  renderer.fillRect(headCx - 10, headCy - 3, 20, 3, color2);
  if (!f.facingRight) {
    renderer.fillRect(headCx + 9, headCy - 5, 6, 2, color2);
    renderer.fillRect(headCx + 13, headCy - 7, 4, 2, color2);
  } else {
    renderer.fillRect(headCx - 15, headCy - 5, 6, 2, color2);
    renderer.fillRect(headCx - 17, headCy - 7, 4, 2, color2);
  }

  // Eyes
  renderer.fillRect(headCx + 2 * flip, headCy - 2, 3, 3, '#ffffff');
  renderer.fillRect(headCx + 6 * flip, headCy - 2, 3, 3, '#ffffff');
  renderer.fillRect(headCx + 3 * flip + flip, headCy - 1, 2, 2, '#111111');
  renderer.fillRect(headCx + 7 * flip + flip, headCy - 1, 2, 2, '#111111');

  // Hitstun flash
  if (f.state === 'hitstun' && frameCount % 4 < 2) {
    renderer.fillRect(f.x - 2, headY - 2, f.w + 4, f.h + 4, '#ffffff66');
  }

  // Special cooldown bar
  if (f.specialCooldown > 0) {
    const cdRatio = f.specialCooldown / SPECIAL_COOLDOWN;
    renderer.fillRect(cx - 8, bodyY + 6, 16, 3, '#ffff004c');
    renderer.fillRect(cx - 8, bodyY + 6, 16 * (1 - cdRatio), 3, '#ffff00');
  } else if (!f.isAI) {
    renderer.setGlow('#0f0', 0.5);
    renderer.fillRect(cx - 3, bodyY + 6, 6, 2, '#00ff00');
    renderer.setGlow(null);
  }
}

function drawAttackArms(renderer, f, cx, shoulderY, flip, color1, color2) {
  const move = MOVES[f.attackMove];
  const phase = f.attackFrame < move.startup ? 'windup' :
    (f.attackFrame < move.startup + move.active ? 'active' : 'recovery');
  let ext = 0;
  if (phase === 'windup') ext = -0.3;
  else if (phase === 'active') ext = 1.0;
  else ext = 0.5 * (1 - (f.attackFrame - move.startup - move.active) / move.recovery);

  switch (f.attackMove) {
    case 'jab':
    case 'crouchPunch': {
      renderer.drawLine(cx + 8 * flip, shoulderY, cx + (8 + 22 * ext) * flip, shoulderY + (phase === 'windup' ? 4 : -2), color1, 4);
      if (phase === 'active') {
        renderer.setGlow('#ff0', 0.8);
        renderer.fillRect(cx + (6 + 22 * ext) * flip - 2, shoulderY - 4, 6, 6, '#ffffff');
        renderer.setGlow(null);
      } else {
        renderer.fillRect(cx + (6 + 22 * ext) * flip - 2, shoulderY - 4, 6, 6, color2);
      }
      renderer.drawLine(cx - 4 * flip, shoulderY + 2, cx + 4 * flip, shoulderY + 10, color1, 4);
      break;
    }
    case 'kick':
    case 'crouchKick': {
      renderer.drawLine(cx + 8 * flip, shoulderY, cx + 14 * flip, shoulderY - 6, color1, 4);
      renderer.drawLine(cx - 4 * flip, shoulderY + 2, cx + 4 * flip, shoulderY + 10, color1, 4);
      if (phase === 'active') {
        const kickY = f.crouching ? shoulderY + 30 : shoulderY + 20;
        renderer.setGlow('#f80', 0.8);
        renderer.drawLine(cx + 6 * flip, kickY, cx + (6 + 30 * ext) * flip, kickY + 2, '#ffffff', 5);
        renderer.setGlow(null);
      }
      break;
    }
    case 'special': {
      if (phase === 'active') {
        renderer.setGlow('#f44', 1.0);
        renderer.drawLine(cx + 6 * flip, shoulderY - 2, cx + (6 + 30 * ext) * flip, shoulderY, '#ff0', 5);
        renderer.drawLine(cx + 2 * flip, shoulderY + 4, cx + (2 + 28 * ext) * flip, shoulderY + 4, '#ff0', 5);
        renderer.setGlow(null);
        const ex = cx + (10 + 30 * ext) * flip;
        const ey = shoulderY + 2;
        renderer.setGlow('#ff0', 1.0);
        renderer.fillCircle(ex, ey, 10 + Math.sin(frameCount * 0.5) * 3, '#ffff0099');
        renderer.fillCircle(ex, ey, 15 + Math.sin(frameCount * 0.3) * 4, '#ff444466');
        renderer.setGlow(null);
        // Spawn particles every frame during active
        for (let i = 0; i < 2; i++) {
          particles.push({
            x: ex + (Math.random() - 0.5) * 14,
            y: ey + (Math.random() - 0.5) * 14,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100 - 40,
            life: 0.15, maxLife: 0.15,
            color: Math.random() < 0.5 ? '#ff0' : '#f44',
            size: 2
          });
        }
      } else {
        renderer.drawLine(cx + 6 * flip, shoulderY - 2, cx + (6 + 30 * ext) * flip, shoulderY, color1, 4);
        renderer.drawLine(cx + 2 * flip, shoulderY + 4, cx + (2 + 28 * ext) * flip, shoulderY + 4, color1, 4);
      }
      break;
    }
    case 'jumpKick': {
      renderer.drawLine(cx + 8 * flip, shoulderY, cx + 14 * flip, shoulderY - 8, color1, 4);
      if (phase === 'active') {
        renderer.setGlow('#f80', 0.8);
        renderer.drawLine(cx, shoulderY + 20, cx + 28 * ext * flip, shoulderY + 26, '#ffffff', 5);
        renderer.setGlow(null);
      }
      break;
    }
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = Math.floor(p.life / p.maxLife * 255).toString(16).padStart(2, '0');
    const col = p.color.length === 4
      ? p.color + alpha[0] + alpha[0]     // #rgb → #rrggbbaa
      : p.color.slice(0, 7) + alpha;      // #rrggbb → #rrggbbaa
    renderer.setGlow(p.color, 0.4);
    renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, col);
  }
  renderer.setGlow(null);
}

function drawComboTexts(renderer, text) {
  for (const ct of comboTexts) {
    const alpha = Math.floor(ct.timer / 60 * 255).toString(16).padStart(2, '0');
    const col = ct.color + alpha;
    renderer.setGlow(ct.color, 0.6);
    text.drawText(ct.text, ct.x, ct.y - (60 - ct.timer) * 0.5, 14, col, 'center');
    renderer.setGlow(null);
  }
}

function drawComboCounter(renderer, text) {
  if (player.comboHits >= 2) {
    renderer.setGlow('#ff0', 0.6);
    text.drawText(player.comboHits + ' HIT COMBO!', 12, H - 36, 16, '#ffff00', 'left');
    if (player.comboDamageBonus > 1.0) {
      text.drawText('x' + player.comboDamageBonus.toFixed(1) + ' DMG', 12, H - 18, 12, '#ff8800', 'left');
    }
    renderer.setGlow(null);
  }
  if (ai.comboHits >= 2) {
    renderer.setGlow('#f44', 0.6);
    text.drawText(ai.comboHits + ' HIT COMBO!', W - 12, H - 36, 16, '#f44', 'right');
    renderer.setGlow(null);
  }
}

function drawAnnounce(renderer, text) {
  if (announceTimer <= 0) return;
  const alpha = Math.floor(Math.min(1, announceTimer / 20) * 255).toString(16).padStart(2, '0');
  const scale = announceTimer > 70 ? 1 + (90 - announceTimer) * 0.02 : 1;
  renderer.setGlow(THEME, 1.0);
  text.drawText(announceText, W / 2, H / 2 - 36, Math.round(32 * scale), THEME + alpha, 'center');
  renderer.setGlow(null);
}

function drawControlHints(text) {
  text.drawText('Z=Punch X=Kick C=Special S=Block', 8, H - 12, 9, '#ffffff26', 'left');
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  // Listen for click/tap on the canvas container to start/restart
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.parentElement.addEventListener('click', () => {
      if (game.state === 'waiting') {
        score = 0;
        roundNum = 1;
        playerRoundsWon = 0;
        aiRoundsWon = 0;
        if (scoreEl) scoreEl.textContent = '0';
        initPersonality();
        startRound();
        game.setState('playing');
      } else if (gameState === 'over') {
        game.setState('waiting');
        game.showOverlay('PIXEL FIGHTER',
          'Click to Fight\n\nCONTROLS\nArrow Keys = Move / Jump / Crouch\nZ = Punch | X = Kick | C = Special\nS = Block\n\nCOMBOS\nZ-Z-X = Triple Strike (1.5x bonus)\nZ-X-C = Fury Chain (2x bonus)');
      }
    });
  }

  game.onInit = () => {
    // Initialize everything in waiting state
    score = 0;
    roundNum = 1;
    playerRoundsWon = 0;
    aiRoundsWon = 0;
    particles = [];
    comboTexts = [];
    screenShake = 0;
    announceText = '';
    announceTimer = 0;
    gameState = 'waiting';
    initPersonality();

    // Create placeholder fighters for the title screen
    player = createFighter(120, true, false);
    ai = createFighter(W - 156, false, true);
    frameCount = 0;
    roundTimer = ROUND_TIME;

    game.showOverlay('PIXEL FIGHTER',
      'Click to Fight\n\nCONTROLS\nArrow Keys = Move / Jump / Crouch\nZ = Punch | X = Kick | C = Special\nS = Block\n\nCOMBOS\nZ-Z-X = Triple Strike (1.5x bonus)\nZ-X-C = Fury Chain (2x bonus)');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Track just-pressed keys for attack inputs (engine input only gives isDown/wasPressed)
  // We use the engine's wasPressed() to populate keysJustPressed each frame
  game.onUpdate = (dt) => {
    const dtSec = dt / 1000;
    const input = game.input;

    // Populate keysJustPressed from engine
    for (const k of ['z', 'Z', 'x', 'X', 'c', 'C']) {
      keysJustPressed[k] = input.wasPressed(k);
    }

    // Sync gameState with game.state for AI setTimeout callbacks
    gameState = game.state;

    if (game.state === 'playing') {
      frameCount++;
      roundTimer -= dtSec;
      if (timerDispEl) timerDispEl.textContent = Math.max(0, Math.ceil(roundTimer));

      if (roundTimer <= 0 || player.hp <= 0 || ai.hp <= 0) {
        // End of round
        if (player.hp > ai.hp) {
          playerRoundsWon++;
          announce('YOU WIN!');
          score += 200;
        } else if (ai.hp > player.hp) {
          aiRoundsWon++;
          announce('AI WINS!');
        } else {
          announce('DRAW!');
        }
        if (scoreEl) scoreEl.textContent = score;
        game.setState('roundEnd');
        gameState = 'roundEnd';

        setTimeout(() => {
          if (playerRoundsWon >= 2 || aiRoundsWon >= 2 || roundNum >= MAX_ROUNDS) {
            // End match
            const result = playerRoundsWon > aiRoundsWon ? 'VICTORY!' :
              (playerRoundsWon < aiRoundsWon ? 'DEFEAT' : 'DRAW');
            if (playerRoundsWon > aiRoundsWon) { score += 500; }
            if (scoreEl) scoreEl.textContent = score;
            gameState = 'over';
            game.showOverlay(result,
              'Final Score: ' + score + '\nRounds: You ' + playerRoundsWon + ' - ' + aiRoundsWon + ' AI\n\nClick to Play Again');
            game.setState('over');
          } else {
            roundNum++;
            aiAdapt();
            startRound();
            gameState = 'playing';
            game.setState('playing');
          }
        }, 2000);
      } else {
        handlePlayerInput(input, dtSec);
        updateAI(dtSec);
        updateFighter(player, ai, dtSec);
        updateFighter(ai, player, dtSec);

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * dtSec;
          p.y += p.vy * dtSec;
          p.vy += 200 * dtSec;
          p.life -= dtSec;
          if (p.life <= 0) particles.splice(i, 1);
        }

        // Combo texts
        for (let i = comboTexts.length - 1; i >= 0; i--) {
          comboTexts[i].timer--;
          if (comboTexts[i].timer <= 0) comboTexts.splice(i, 1);
        }

        if (announceTimer > 0) announceTimer--;
        if (screenShake > 0) { screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0; }
      }
    }

    // Clear just-pressed each frame (engine clears wasPressed internally at end of fixed step)
    for (const k of ['z', 'Z', 'x', 'X', 'c', 'C']) {
      keysJustPressed[k] = false;
    }
  };

  game.onDraw = (renderer, text) => {
    // Apply screen shake by offsetting draws (we can't translate in WebGL easily,
    // so we offset all drawing coords via a shake offset stored in state)
    const sx = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
    const sy = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;

    // We draw arena always; fighters only when playing/roundEnd
    drawArena(renderer);

    if (game.state === 'playing' || game.state === 'roundEnd') {
      // Offset all fighter/particle draws by shake
      // (We'll use renderer's local coordinate system — draw fighters with offset coords)
      const origPlayerX = player.x; const origPlayerY = player.y;
      const origAiX = ai.x; const origAiY = ai.y;
      if (sx || sy) {
        player.x += sx; player.y += sy;
        ai.x += sx; ai.y += sy;
      }

      drawFighter(renderer, text, player, '#4488ff', '#2266cc');
      drawFighter(renderer, text, ai, '#ff4444', '#cc2222');
      drawParticles(renderer);
      drawComboTexts(renderer, text);
      drawHealthBars(renderer, text);
      drawComboCounter(renderer, text);
      drawAnnounce(renderer, text);
      drawControlHints(text);

      if (sx || sy) {
        player.x = origPlayerX; player.y = origPlayerY;
        ai.x = origAiX; ai.y = origAiY;
      }
    }
  };

  game.start();
  return game;
}
