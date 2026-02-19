// boxing-ring/game.js — Boxing Ring ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 500, H = 500;

// Theme
const THEME = '#f42';
const BG2 = '#16213e';

// Fighter properties
const MAX_HP = 100;
const MAX_STAMINA = 100;
const STAMINA_REGEN = 12; // per second
const BLOCK_STAMINA_COST = 8; // per second while blocking
const STAGGER_DURATION = 0.6; // seconds

// Punch definitions: { name, damage, staminaCost, windupTime, recoveryTime }
const PUNCHES = {
  jab:      { name: 'Jab',      damage: 8,  staminaCost: 10, windupTime: 0.15, recoveryTime: 0.2 },
  hook:     { name: 'Hook',     damage: 15, staminaCost: 20, windupTime: 0.3,  recoveryTime: 0.35 },
  uppercut: { name: 'Uppercut', damage: 25, staminaCost: 30, windupTime: 0.5,  recoveryTime: 0.5 }
};

const DODGE_COOLDOWN = 1.2;  // seconds
const DODGE_DURATION = 0.4;  // seconds
const DODGE_INVULN = 0.35;   // invulnerability window

const ROUND_TIME = 60; // seconds
const MAX_ROUNDS = 3;

// Fixed timestep dt in seconds
const DT = 1 / 60;

// Module-scope state
let score = 0;
let player, ai, roundNum, roundTimer, roundPhase;
let hitFlashes = [];
let particles = [];
let combatLog = [];
let playerHistory = [];
const HISTORY_SIZE = 20;

// Pending deferred actions (endRound, endMatch use setTimeout in original)
let pendingAction = null;   // { type: 'endRound'|'endMatch', delay, countdown }
let pendingResult = null;   // stored reason for endRound deferred

// Keys tracked manually (engine input uses wasPressed/isDown but we also
// need held-key state for blocking/punching)
// We'll use game.input.isDown() for everything — engine tracks held keys.

// DOM refs
const scoreEl = document.getElementById('score');
const roundDisp = document.getElementById('roundDisp');
const timerDisp = document.getElementById('timerDisp');

// Click queue for canvas start
let pendingClicks = [];

// ── Fighter factory ──
function createFighter(isAI) {
  return {
    hp: MAX_HP,
    stamina: MAX_STAMINA,
    x: isAI ? 330 : 170,
    baseX: isAI ? 330 : 170,
    y: 300,
    action: 'idle', // idle, windup, punching, recovery, blocking, dodging, staggered
    actionTimer: 0,
    punchType: null,
    dodgeDir: 0,
    dodgeCooldown: 0,
    dodgeOffset: 0,
    bodyAngle: 0,
    punchProgress: 0,
    hitFlash: 0,
    damageDealt: 0,
    punchesLanded: 0,
    punchesThrown: 0,
    isAI,
    aiTimer: 0,
    facing: isAI ? -1 : 1,
    staggerTimer: 0,
    roundsWon: 0
  };
}

// ── Combat helpers ──
function recordPlayerAction(action) {
  playerHistory.push(action);
  if (playerHistory.length > HISTORY_SIZE) playerHistory.shift();
}

function attemptPunch(fighter, type) {
  const punch = PUNCHES[type];
  if (fighter.stamina < punch.staminaCost) return;
  fighter.stamina -= punch.staminaCost;
  fighter.action = 'windup';
  fighter.punchType = type;
  fighter.actionTimer = punch.windupTime;
  fighter.punchProgress = 0;
  if (!fighter.isAI) fighter.punchesThrown++;
}

function startBlock(fighter) {
  fighter.action = 'blocking';
  fighter.actionTimer = 0;
}

function attemptDodge(fighter, dir) {
  if (fighter.dodgeCooldown > 0) return;
  if (fighter.stamina < 15) return;
  fighter.stamina -= 15;
  fighter.action = 'dodging';
  fighter.dodgeDir = dir;
  fighter.actionTimer = DODGE_DURATION;
  fighter.dodgeCooldown = DODGE_COOLDOWN;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const life = 0.4 + Math.random() * 0.3;
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200 - 50,
      life,
      maxLife: life,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function addLog(msg) {
  combatLog.unshift({ msg, time: 2.0 });
  if (combatLog.length > 5) combatLog.pop();
}

function resolvePunch(attacker, defender) {
  const punch = PUNCHES[attacker.punchType];

  // Dodging — invulnerable
  if (defender.action === 'dodging' && defender.actionTimer > (DODGE_DURATION - DODGE_INVULN)) {
    addLog((attacker.isAI ? 'AI' : 'You') + ' missed! ' + (defender.isAI ? 'AI' : 'You') + ' dodged!');
    spawnParticles(defender.x + defender.dodgeOffset, defender.y - 40, '#4af', 3);
    return;
  }

  // Blocking
  if (defender.action === 'blocking' && defender.stamina > 0) {
    const blockReduction = 0.7;
    const dmg = Math.round(punch.damage * (1 - blockReduction));
    const staminaDrain = punch.damage * 0.5;
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.stamina = Math.max(0, defender.stamina - staminaDrain);
    if (!attacker.isAI) {
      attacker.damageDealt += dmg;
      attacker.punchesLanded++;
    }
    defender.hitFlash = 0.15;
    addLog((attacker.isAI ? 'AI' : 'You') + ': ' + punch.name + ' BLOCKED (-' + dmg + ')');
    spawnParticles(defender.x, defender.y - 50, '#ff0', 4);
    return;
  }

  // Counter (defender was winding up)
  if (defender.action === 'windup') {
    const staggerBonus = 1.3;
    const dmg = Math.round(punch.damage * staggerBonus);
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.action = 'staggered';
    defender.actionTimer = STAGGER_DURATION;
    defender.hitFlash = 0.3;
    if (!attacker.isAI) {
      attacker.damageDealt += dmg;
      attacker.punchesLanded++;
    }
    addLog((attacker.isAI ? 'AI' : 'You') + ': ' + punch.name + ' COUNTER! (-' + dmg + ')');
    spawnParticles(defender.x, defender.y - 60, '#f42', 8);
    return;
  }

  // Normal hit
  const dmg = punch.damage;
  defender.hp = Math.max(0, defender.hp - dmg);
  defender.hitFlash = 0.2;
  if (!attacker.isAI) {
    attacker.damageDealt += dmg;
    attacker.punchesLanded++;
  }
  addLog((attacker.isAI ? 'AI' : 'You') + ': ' + punch.name + ' (-' + dmg + ')');
  spawnParticles(defender.x + (attacker.facing * 15), defender.y - 50, '#f42', 5);
}

// ── AI ──
function predictPlayerAction() {
  if (playerHistory.length < 3) return null;
  const recent = playerHistory.slice(-10);
  const counts = {};
  for (const a of recent) counts[a] = (counts[a] || 0) + 1;
  let maxAction = null, maxCount = 0;
  for (const [action, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; maxAction = action; }
  }
  if (playerHistory.length >= 3) {
    const last2 = playerHistory.slice(-2).join(',');
    const seqCounts = {};
    for (let i = 2; i < playerHistory.length; i++) {
      const prev2 = playerHistory.slice(i - 2, i).join(',');
      if (prev2 === last2) {
        const next = playerHistory[i];
        seqCounts[next] = (seqCounts[next] || 0) + 1;
      }
    }
    let seqMax = null, seqMaxCount = 0;
    for (const [action, count] of Object.entries(seqCounts)) {
      if (count > seqMaxCount) { seqMaxCount = count; seqMax = action; }
    }
    if (seqMax && seqMaxCount >= 2) return seqMax;
  }
  return maxAction;
}

function updateAI() {
  ai.aiTimer -= DT;
  if (ai.aiTimer > 0) return;
  if (ai.action !== 'idle' && ai.action !== 'blocking') return;

  if (ai.action === 'blocking') {
    if (Math.random() < 0.3 || ai.stamina < 15) {
      ai.action = 'idle';
    }
    ai.aiTimer = 0.1 + Math.random() * 0.2;
    return;
  }

  const predicted = predictPlayerAction();

  if (player.action === 'windup') {
    const r = Math.random();
    if (r < 0.35 && ai.stamina >= 10) {
      attemptPunch(ai, 'jab');
      ai.aiTimer = 0.1;
      return;
    } else if (r < 0.6 && ai.dodgeCooldown <= 0 && ai.stamina >= 15) {
      attemptDodge(ai, Math.random() < 0.5 ? -1 : 1);
      ai.aiTimer = 0.3;
      return;
    } else if (r < 0.85) {
      startBlock(ai);
      ai.aiTimer = 0.3 + Math.random() * 0.3;
      return;
    }
  }

  const decision = Math.random();

  if (predicted === 'block' && ai.stamina >= 30) {
    if (decision < 0.4) {
      attemptPunch(ai, 'uppercut');
      ai.aiTimer = 0.2;
      return;
    }
  }

  if (predicted === 'jab' && decision < 0.4) {
    startBlock(ai);
    ai.aiTimer = 0.2 + Math.random() * 0.2;
    return;
  }

  if ((predicted === 'dodge_left' || predicted === 'dodge_right') && ai.stamina >= 20) {
    if (decision < 0.35) {
      attemptPunch(ai, 'hook');
      ai.aiTimer = 0.15;
      return;
    }
  }

  if (ai.hp < 30) {
    if (decision < 0.4) {
      startBlock(ai);
      ai.aiTimer = 0.4 + Math.random() * 0.5;
    } else if (decision < 0.6 && ai.dodgeCooldown <= 0 && ai.stamina >= 15) {
      attemptDodge(ai, Math.random() < 0.5 ? -1 : 1);
      ai.aiTimer = 0.3;
    } else if (decision < 0.8 && ai.stamina >= 10) {
      attemptPunch(ai, 'jab');
      ai.aiTimer = 0.3;
    } else {
      ai.aiTimer = 0.2 + Math.random() * 0.3;
    }
  } else if (ai.stamina > 50) {
    if (decision < 0.3 && ai.stamina >= 10) {
      attemptPunch(ai, 'jab');
      ai.aiTimer = 0.2 + Math.random() * 0.3;
    } else if (decision < 0.5 && ai.stamina >= 20) {
      attemptPunch(ai, 'hook');
      ai.aiTimer = 0.25 + Math.random() * 0.3;
    } else if (decision < 0.6 && ai.stamina >= 30) {
      attemptPunch(ai, 'uppercut');
      ai.aiTimer = 0.3 + Math.random() * 0.4;
    } else if (decision < 0.75) {
      startBlock(ai);
      ai.aiTimer = 0.3 + Math.random() * 0.3;
    } else {
      ai.aiTimer = 0.15 + Math.random() * 0.25;
    }
  } else {
    if (decision < 0.25 && ai.stamina >= 10) {
      attemptPunch(ai, 'jab');
      ai.aiTimer = 0.25 + Math.random() * 0.35;
    } else if (decision < 0.4 && ai.stamina >= 20) {
      attemptPunch(ai, 'hook');
      ai.aiTimer = 0.3 + Math.random() * 0.35;
    } else if (decision < 0.5 && ai.stamina >= 30) {
      attemptPunch(ai, 'uppercut');
      ai.aiTimer = 0.35 + Math.random() * 0.4;
    } else if (decision < 0.7) {
      startBlock(ai);
      ai.aiTimer = 0.3 + Math.random() * 0.4;
    } else if (decision < 0.8 && ai.dodgeCooldown <= 0 && ai.stamina >= 15) {
      attemptDodge(ai, Math.random() < 0.5 ? -1 : 1);
      ai.aiTimer = 0.3;
    } else {
      ai.aiTimer = 0.2 + Math.random() * 0.3;
    }
  }
}

function updateFighterAction(fighter, opponent) {
  if (fighter.action === 'windup') {
    fighter.actionTimer -= DT;
    const punch = PUNCHES[fighter.punchType];
    fighter.punchProgress = 1 - (fighter.actionTimer / punch.windupTime);
    if (fighter.actionTimer <= 0) {
      fighter.action = 'punching';
      fighter.actionTimer = 0.08;
      fighter.punchProgress = 1;
      resolvePunch(fighter, opponent);
    }
  } else if (fighter.action === 'punching') {
    fighter.actionTimer -= DT;
    if (fighter.actionTimer <= 0) {
      fighter.action = 'recovery';
      fighter.actionTimer = PUNCHES[fighter.punchType].recoveryTime;
    }
  } else if (fighter.action === 'recovery') {
    fighter.actionTimer -= DT;
    fighter.punchProgress = Math.max(0, fighter.actionTimer / PUNCHES[fighter.punchType].recoveryTime);
    if (fighter.actionTimer <= 0) {
      fighter.action = 'idle';
      fighter.punchType = null;
      fighter.punchProgress = 0;
    }
  } else if (fighter.action === 'dodging') {
    fighter.actionTimer -= DT;
    const t = 1 - (fighter.actionTimer / DODGE_DURATION);
    if (t < 0.5) {
      fighter.dodgeOffset = fighter.dodgeDir * 50 * (t * 2);
    } else {
      fighter.dodgeOffset = fighter.dodgeDir * 50 * (1 - (t - 0.5) * 2);
    }
    if (fighter.actionTimer <= 0) {
      fighter.action = 'idle';
      fighter.dodgeOffset = 0;
    }
  } else if (fighter.action === 'staggered') {
    fighter.actionTimer -= DT;
    if (fighter.actionTimer <= 0) {
      fighter.action = 'idle';
    }
  }
}

// ── Drawing helpers ──

// Draw a quadratic bezier curve as line segments
function drawQuadBezier(renderer, x0, y0, cx, cy, x1, y1, color, width) {
  const steps = 12;
  let px = x0, py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const nx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const ny = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    renderer.drawLine(px, py, nx, ny, color, width);
    px = nx;
    py = ny;
  }
}

// Draw an ellipse as a polygon
function ellipsePoints(cx, cy, rx, ry, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

function drawRing(renderer) {
  // Ring shadow floor
  renderer.fillPoly([
    { x: 50,  y: 380 },
    { x: 450, y: 380 },
    { x: 480, y: 450 },
    { x: 20,  y: 450 }
  ], '#1e1e3a');

  // Ring mat
  renderer.fillPoly([
    { x: 70,  y: 340 },
    { x: 430, y: 340 },
    { x: 460, y: 420 },
    { x: 40,  y: 420 }
  ], '#2a1a1a');

  // Ring mat center ellipse (stroke only — approximate with strokePoly)
  renderer.strokePoly(ellipsePoints(250, 375, 80, 25, 32), 'rgba(255,68,34,0.15)', 2, true);

  // Ropes (3 of them, quadratic bezier approximated as segments)
  const ropeAlphas = [0.3, 0.45, 0.6];
  const ropeWidths = [2.5, 2.2, 1.9];
  for (let i = 0; i < 3; i++) {
    const y = 200 + i * 50;
    const sag = 3 + i * 2;
    const alpha = ropeAlphas[i];
    const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    const ropeColor = '#ff4422' + aHex;
    drawQuadBezier(renderer, 40, y, 250, y + sag, 460, y, ropeColor, ropeWidths[i]);
  }

  // Corner posts
  for (const px of [40, 460]) {
    renderer.drawLine(px, 180, px, 440, '#555', 4);
    // Turnbuckles
    for (let i = 0; i < 3; i++) {
      const ry = 200 + i * 50;
      renderer.fillRect(px - 3, ry - 3, 6, 6, '#888');
    }
  }
}

function drawFighter(renderer, text, fighter, isRight) {
  const cx = fighter.x + fighter.dodgeOffset;
  const cy = fighter.y;
  const dir = fighter.facing;

  const flashAlpha = fighter.hitFlash > 0 ? fighter.hitFlash * 3 : 0;

  const bodyColor   = isRight ? '#c44' : '#48a';
  const gloveColor  = isRight ? '#f42' : '#4af';
  const shortsColor = isRight ? '#a22' : '#26a';
  const skinColor   = isRight ? '#d88' : '#8ad';

  // Stagger wobble
  let wobble = 0;
  if (fighter.action === 'staggered') {
    wobble = Math.sin(fighter.actionTimer * 20) * 8;
  }

  const wx = cx + wobble;

  // Body (torso — ellipse)
  renderer.fillPoly(ellipsePoints(wx, cy - 50, 22, 35, 20), bodyColor);

  // Shorts (rect)
  renderer.fillRect(wx - 18, cy - 18, 36, 22, shortsColor);

  // Head (circle)
  renderer.fillCircle(wx, cy - 95, 16, skinColor);

  // Eyes
  renderer.fillCircle(wx + dir * 6, cy - 98, 3, '#fff');
  renderer.fillCircle(wx + dir * 7, cy - 98, 1.5, '#111');

  // Headband (arc — approximate as strokePoly arc segment)
  {
    const arcPts = [];
    const startA = -0.4;
    const endA = Math.PI + 0.4;
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const a = startA + (endA - startA) * (i / steps);
      arcPts.push({ x: wx + Math.cos(a) * 16, y: cy - 95 + Math.sin(a) * 16 });
    }
    renderer.strokePoly(arcPts, gloveColor, 2, false);
  }

  // Compute glove positions
  let leftGX, leftGY, rightGX, rightGY;

  if (fighter.action === 'blocking') {
    leftGX  = wx - 15 * dir;  leftGY  = cy - 70;
    rightGX = wx + 5 * dir;   rightGY = cy - 75;
  } else if (fighter.action === 'windup' || fighter.action === 'punching' || fighter.action === 'recovery') {
    const progress = fighter.punchProgress;
    if (fighter.punchType === 'jab') {
      const ext = fighter.action === 'punching' ? 1 : (fighter.action === 'windup' ? progress * 0.3 : progress);
      leftGX  = wx + dir * (15 + ext * 50);  leftGY  = cy - 65 - ext * 5;
      rightGX = wx - dir * 10;               rightGY = cy - 55;
    } else if (fighter.punchType === 'hook') {
      const ext = fighter.action === 'punching' ? 1 : (fighter.action === 'windup' ? progress * 0.4 : progress);
      const angle = -0.5 + ext * 1.5;
      rightGX = wx + dir * (10 + Math.cos(angle) * 45 * ext);
      rightGY = cy - 55 - Math.sin(angle) * 20 * ext;
      leftGX  = wx - dir * 5;  leftGY  = cy - 60;
    } else { // uppercut
      const ext = fighter.action === 'punching' ? 1 : progress;
      if (fighter.action === 'windup') {
        rightGX = wx + dir * 5;
        rightGY = cy - 30 + (1 - progress) * 10;
      } else {
        rightGX = wx + dir * (15 + ext * 30);
        rightGY = cy - 30 - ext * 60;
      }
      leftGX  = wx - dir * 10;  leftGY  = cy - 55;
    }
  } else if (fighter.action === 'staggered') {
    leftGX  = wx - 20;  leftGY  = cy - 40;
    rightGX = wx + 20;  rightGY = cy - 45;
  } else {
    // Idle guard
    leftGX  = wx + dir * 18;  leftGY  = cy - 65;
    rightGX = wx + dir * 12;  rightGY = cy - 50;
  }

  // Arms
  renderer.drawLine(wx - 15, cy - 55, leftGX,  leftGY,  bodyColor, 6);
  renderer.drawLine(wx + 15, cy - 50, rightGX, rightGY, bodyColor, 6);

  // Gloves
  renderer.setGlow(gloveColor, 0.4);
  renderer.fillCircle(leftGX,  leftGY,  10, gloveColor);
  renderer.fillCircle(rightGX, rightGY, 10, gloveColor);
  renderer.setGlow(null);

  // Glove shine
  renderer.fillCircle(leftGX  - 2, leftGY  - 3, 3, 'rgba(255,255,255,0.3)');
  renderer.fillCircle(rightGX - 2, rightGY - 3, 3, 'rgba(255,255,255,0.3)');

  // Legs
  renderer.drawLine(wx - 8, cy + 4, wx - 12, cy + 45, skinColor, 7);
  renderer.drawLine(wx + 8, cy + 4, wx + 12, cy + 45, skinColor, 7);

  // Shoes
  renderer.fillRect(wx - 17, cy + 40, 12, 8, '#333');
  renderer.fillRect(wx +  7, cy + 40, 12, 8, '#333');

  // Hit flash (white ellipse overlay with alpha)
  if (flashAlpha > 0) {
    const fa = Math.min(flashAlpha, 0.6);
    const aHex = Math.round(fa * 255).toString(16).padStart(2, '0');
    renderer.fillPoly(ellipsePoints(wx, cy - 50, 30, 55, 20), '#ffffff' + aHex);
  }

  // Dodge trail
  if (fighter.action === 'dodging') {
    const trailX = cx - fighter.dodgeDir * 20;
    renderer.fillCircle(trailX, cy - 50, 15, 'rgba(68,170,255,0.3)');
  }

  // Name label
  renderer.setGlow(gloveColor, 0.4);
  text.drawText(isRight ? 'AI' : 'YOU', cx, cy + 52, 12, gloveColor, 'center');
  renderer.setGlow(null);
}

function drawBar(renderer, text, x, y, w, h, pct, color, bgColor, label) {
  renderer.fillRect(x, y, w, h, bgColor);
  renderer.fillRect(x, y, w * Math.max(0, pct), h, color);
  renderer.strokePoly([
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
  ], 'rgba(255,255,255,0.2)', 1, true);
  text.drawText(label, x + 3, y + h - 11, 9, '#fff', 'left');
  text.drawText(String(Math.round(pct * 100)), x + w - 3, y + h - 11, 9, '#fff', 'right');
}

function drawHUD(renderer, text) {
  const barW = 180;
  const barH = 14;
  const barY = 20;

  const pHpX = 20;
  drawBar(renderer, text, pHpX, barY,      barW, barH,     player.hp      / MAX_HP,      '#4f4', '#400', 'HP');
  drawBar(renderer, text, pHpX, barY + 20, barW, barH - 2, player.stamina / MAX_STAMINA, '#ff0', '#440', 'ST');

  const aHpX = W - 20 - barW;
  drawBar(renderer, text, aHpX, barY,      barW, barH,     ai.hp      / MAX_HP,      '#f44', '#400', 'HP');
  drawBar(renderer, text, aHpX, barY + 20, barW, barH - 2, ai.stamina / MAX_STAMINA, '#fa0', '#440', 'ST');

  // Labels
  renderer.setGlow('#4af', 0.4);
  text.drawText('YOU', pHpX, barY - 14, 11, '#4af', 'left');
  renderer.setGlow(null);
  renderer.setGlow('#f42', 0.4);
  text.drawText('AI', aHpX + barW, barY - 14, 11, '#f42', 'right');
  renderer.setGlow(null);

  // Round / timer center
  renderer.setGlow('#f42', 0.5);
  text.drawText('R' + roundNum, W / 2, barY - 8, 16, '#f42', 'center');
  renderer.setGlow(null);
  const timeColor = roundTimer <= 10 ? '#f42' : '#aaa';
  text.drawText(Math.max(0, Math.ceil(roundTimer)) + 's', W / 2, barY + 10, 12, timeColor, 'center');

  // Round wins
  text.drawText('Wins: ' + player.roundsWon, 20,      barY + 42, 10, '#4af', 'left');
  text.drawText('Wins: ' + ai.roundsWon,     W - 20,  barY + 42, 10, '#f42', 'right');

  // Dodge cooldown
  if (player.dodgeCooldown > 0) {
    text.drawText('Dodge: ' + player.dodgeCooldown.toFixed(1) + 's', 20, barY + 54, 10, 'rgba(255,255,255,0.3)', 'left');
  } else {
    text.drawText('Dodge: READY', 20, barY + 54, 10, 'rgba(68,255,68,0.5)', 'left');
  }

  // Action state
  if (player.action !== 'idle') {
    let stateText = player.action.toUpperCase();
    if (player.punchType) stateText = PUNCHES[player.punchType].name.toUpperCase() + ' (' + stateText + ')';
    text.drawText(stateText, 20, barY + 66, 10, '#ff0', 'left');
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    // Embed alpha into color: parse base color and append alpha
    let colorWithAlpha;
    if (p.color.startsWith('#')) {
      const base = p.color.slice(1);
      if (base.length === 3) {
        // expand shorthand
        const r = base[0] + base[0];
        const g = base[1] + base[1];
        const b = base[2] + base[2];
        colorWithAlpha = '#' + r + g + b + aHex;
      } else {
        colorWithAlpha = '#' + base.slice(0, 6) + aHex;
      }
    } else {
      colorWithAlpha = p.color;
    }
    renderer.fillCircle(p.x, p.y, p.size * alpha, colorWithAlpha);
  }
}

function drawCombatLog(renderer, text) {
  for (let i = 0; i < combatLog.length; i++) {
    const log = combatLog[i];
    const alpha = Math.min(1, log.time);
    const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    let color;
    if (log.msg.includes('COUNTER'))      color = '#ff4422' + aHex;
    else if (log.msg.includes('BLOCKED')) color = '#ffff00' + aHex;
    else if (log.msg.includes('dodged'))  color = '#44aaff' + aHex;
    else if (log.msg.includes('KO'))      color = '#ff4422' + aHex;
    else                                  color = '#ffffff' + aHex;
    text.drawText(log.msg, W / 2, 170 + i * 16, 11, color, 'center');
  }
}

function drawControls(text) {
  text.drawText('A:Jab  D:Hook  W:Uppercut  S:Block  Q/E:Dodge', W / 2, H - 16, 9, 'rgba(255,255,255,0.15)', 'center');
}

// ── Round / match management ──
function startRound() {
  player.hp = MAX_HP; player.stamina = MAX_STAMINA;
  player.action = 'idle'; player.actionTimer = 0;
  player.dodgeCooldown = 0; player.dodgeOffset = 0;
  player.damageDealt = 0; player.punchesLanded = 0; player.punchesThrown = 0;

  ai.hp = MAX_HP; ai.stamina = MAX_STAMINA;
  ai.action = 'idle'; ai.actionTimer = 0;
  ai.dodgeCooldown = 0; ai.dodgeOffset = 0;
  ai.damageDealt = 0; ai.punchesLanded = 0; ai.punchesThrown = 0;
  ai.aiTimer = 0.5 + Math.random() * 0.5;

  roundTimer = ROUND_TIME;
  roundPhase = 'fighting';
  combatLog = [];
  hitFlashes = [];
  particles = [];
}

function endRound(reason, game) {
  roundPhase = 'roundEnd';
  let playerWon = false;
  if (reason === 'ko_player') {
    ai.roundsWon++;
    addLog('KO! You went down!');
  } else if (reason === 'ko_ai') {
    player.roundsWon++;
    playerWon = true;
    addLog('KO! Opponent is down!');
    score += 500;
  } else {
    if (player.hp > ai.hp) {
      player.roundsWon++;
      playerWon = true;
      addLog('Round to you by decision!');
      score += 200;
    } else if (ai.hp > player.hp) {
      ai.roundsWon++;
      addLog('Round to opponent by decision!');
    } else {
      addLog('Round drawn!');
    }
  }
  score += player.damageDealt;
  scoreEl.textContent = score;

  if (roundNum >= MAX_ROUNDS || player.roundsWon >= 2 || ai.roundsWon >= 2) {
    // Defer endMatch by ~2 seconds (120 frames)
    pendingAction = { type: 'endMatch', countdown: 120 };
  } else {
    roundNum++;
    roundDisp.textContent = roundNum;
    // Defer startRound by ~2 seconds
    pendingAction = { type: 'startRound', countdown: 120 };
  }
}

function endMatch(game) {
  if (player.roundsWon > ai.roundsWon) {
    score += 1000;
    scoreEl.textContent = score;
    game.showOverlay('VICTORY!', 'Final Score: ' + score + '\nRounds: ' + player.roundsWon + '-' + ai.roundsWon + '\n\nClick or press any key to play again');
  } else if (ai.roundsWon > player.roundsWon) {
    game.showOverlay('DEFEATED', 'Final Score: ' + score + '\nRounds: ' + player.roundsWon + '-' + ai.roundsWon + '\n\nClick or press any key to play again');
  } else {
    game.showOverlay('DRAW', 'Final Score: ' + score + '\nRounds: ' + player.roundsWon + '-' + ai.roundsWon + '\n\nClick or press any key to play again');
  }
  game.setState('over');
}

// ── Export ──
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('click', () => {
    pendingClicks.push(true);
  });

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    roundNum = 1;
    roundDisp.textContent = '1';
    timerDisp.textContent = '60';
    player = createFighter(false);
    ai = createFighter(true);
    roundPhase = 'ready';
    playerHistory = [];
    combatLog = [];
    hitFlashes = [];
    particles = [];
    pendingAction = null;
    pendingClicks = [];

    game.showOverlay('BOXING RING', 'Click to Fight\n\nA=Jab  D=Hook  W=Uppercut\nS=Block  Q=Dodge Left  E=Dodge Right');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      const anyKey = input.wasPressed('a') || input.wasPressed('d') || input.wasPressed('w') ||
                     input.wasPressed('s') || input.wasPressed('q') || input.wasPressed('e') ||
                     input.wasPressed(' ');
      if (anyKey || pendingClicks.length > 0) {
        pendingClicks = [];
        game.setState('playing');
        startRound();
      }
      return;
    }

    if (game.state === 'over') {
      const anyKey = input.wasPressed('a') || input.wasPressed('d') || input.wasPressed('w') ||
                     input.wasPressed('s') || input.wasPressed('q') || input.wasPressed('e') ||
                     input.wasPressed(' ');
      if (anyKey || pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
        game.setState('playing');
        startRound();
      }
      return;
    }

    // Clear click queue during play
    pendingClicks = [];

    // Handle deferred actions (replaces setTimeout)
    if (pendingAction) {
      pendingAction.countdown--;
      if (pendingAction.countdown <= 0) {
        const type = pendingAction.type;
        pendingAction = null;
        if (type === 'endMatch') {
          endMatch(game);
        } else if (type === 'startRound') {
          startRound();
        }
      }
      return; // pause game logic during countdown
    }

    if (roundPhase !== 'fighting') return;

    // Round timer
    roundTimer -= DT;
    timerDisp.textContent = Math.max(0, Math.ceil(roundTimer));
    if (roundTimer <= 0) {
      endRound('time', game);
      return;
    }

    // Stamina regen / blocking drain
    if (player.action !== 'blocking') {
      player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN * DT);
    } else {
      player.stamina = Math.max(0, player.stamina - BLOCK_STAMINA_COST * DT);
      if (player.stamina <= 0) player.action = 'idle';
    }
    if (ai.action !== 'blocking') {
      ai.stamina = Math.min(MAX_STAMINA, ai.stamina + STAMINA_REGEN * DT);
    } else {
      ai.stamina = Math.max(0, ai.stamina - BLOCK_STAMINA_COST * DT);
      if (ai.stamina <= 0) ai.action = 'idle';
    }

    // Cooldowns & flash decay
    player.dodgeCooldown = Math.max(0, player.dodgeCooldown - DT);
    ai.dodgeCooldown     = Math.max(0, ai.dodgeCooldown - DT);
    player.hitFlash      = Math.max(0, player.hitFlash - DT);
    ai.hitFlash          = Math.max(0, ai.hitFlash - DT);

    // Player input
    if (player.action === 'idle') {
      if (input.isDown('a')) {
        attemptPunch(player, 'jab');
        recordPlayerAction('jab');
      } else if (input.isDown('d')) {
        attemptPunch(player, 'hook');
        recordPlayerAction('hook');
      } else if (input.isDown('w')) {
        attemptPunch(player, 'uppercut');
        recordPlayerAction('uppercut');
      } else if (input.isDown('s')) {
        startBlock(player);
        recordPlayerAction('block');
      } else if (input.isDown('q')) {
        attemptDodge(player, -1);
        recordPlayerAction('dodge_left');
      } else if (input.isDown('e')) {
        attemptDodge(player, 1);
        recordPlayerAction('dodge_right');
      }
    }

    // Release block when S not held
    if (player.action === 'blocking' && !input.isDown('s')) {
      player.action = 'idle';
      player.actionTimer = 0;
    }

    // AI
    updateAI();

    // Fighter action timers
    updateFighterAction(player, ai);
    updateFighterAction(ai, player);

    // KO checks
    if (player.hp <= 0) { endRound('ko_player', game); return; }
    if (ai.hp <= 0)     { endRound('ko_ai',     game); return; }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.vy += 300 * DT;
      p.life -= DT;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Combat log timers
    for (let i = combatLog.length - 1; i >= 0; i--) {
      combatLog[i].time -= DT;
      if (combatLog[i].time <= 0) combatLog.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    drawRing(renderer);
    drawFighter(renderer, text, player, false);
    drawFighter(renderer, text, ai, true);
    drawHUD(renderer, text);
    drawParticles(renderer);
    drawCombatLog(renderer, text);
    drawControls(text);
  };

  game.start();
  return game;
}
