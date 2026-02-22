// wizard-duels/game.js — WebGL 2 port of Wizard Duels

import { Game } from '../engine/core.js';

const W = 600, H = 400;

// ─── Constants ───
const MAX_HP = 100;
const MAX_MANA = 100;
const MANA_REGEN = 0.15;
const MEDITATE_REGEN = 0.8;
const SHIELD_DURATION = 40;
const SHIELD_COOLDOWN = 90;
const BLIND_DURATION = 120;

const SPELLS = {
  fire:      { name: 'Fire',      mana: 15, damage: 18, speed: 6,   color: '#f72', trail: '#fa3', size: 6 },
  ice:       { name: 'Ice',       mana: 20, damage: 15, speed: 3.5, color: '#4df', trail: '#8ef', size: 8, slow: true, slowDur: 120 },
  lightning: { name: 'Lightning', mana: 40, damage: 35, speed: 12,  color: '#ff0', trail: '#ff8', size: 4 },
  heal:      { name: 'Heal',      mana: 30, damage: 0,  speed: 0,   color: '#4f8', trail: '#8fa', size: 0 }
};

const COMBO_STEAM     = { name: 'Steam',     damage: 10, color: '#ccc', trail: '#eee', size: 12, speed: 5, blind: true };
const COMBO_EXPLOSION = { name: 'Explosion', damage: 45, color: '#f80', trail: '#fc0', size: 14, speed: 7, explosive: true };

// ─── DOM refs ───
const scoreEl    = document.getElementById('score');
const aiScoreEl  = document.getElementById('aiScore');
const roundNumEl = document.getElementById('roundNum');

// ─── Game state (module-level so callbacks can close over them) ───
let player, ai;
let projectiles = [];
let particles   = [];
let floatingTexts = [];
let currentRound = 1;
let roundTimer   = 0;
let aiDecisionTimer = 0;
let savedPlayerWins = 0;
let savedAiWins     = 0;
let score = 0;
let roundEnded = false;  // track round-end phase without bypassing engine state

// ─── Wizard factory ───
function createWizard(x, facing, isAI) {
  return {
    x, y: 260, facing, isAI,
    hp: MAX_HP, mana: MAX_MANA,
    shieldUp: false, shieldTimer: 0, shieldCooldown: 0,
    meditating: false,
    blinded: 0, slowed: 0,
    castAnim: 0, castSpellType: null,
    lastSpell: null, comboTimer: 0,
    hitAnim: 0, healAnim: 0,
    roundWins: 0, totalDamage: 0
  };
}

// ─── Init ───
function initRound() {
  player = createWizard(80, 1, false);
  ai     = createWizard(520, -1, true);
  player.roundWins   = savedPlayerWins;
  ai.roundWins       = savedAiWins;
  player.totalDamage = score;
  projectiles   = [];
  particles     = [];
  floatingTexts = [];
  roundTimer    = 0;
  aiDecisionTimer = 0;
  roundEnded    = false;
}

function initGame(game) {
  score = 0;
  currentRound = 1;
  savedPlayerWins = 0;
  savedAiWins     = 0;
  if (scoreEl)    scoreEl.textContent    = '0';
  if (aiScoreEl)  aiScoreEl.textContent  = '0';
  if (roundNumEl) roundNumEl.textContent = '1';
  initRound();
  game.setState('playing');
}

// ─── Spell casting ───
function castSpell(caster, target, type) {
  const spell = SPELLS[type];
  if (caster.mana < spell.mana) return;
  if (caster.shieldUp) return;

  caster.mana -= spell.mana;
  caster.meditating = false;
  caster.castAnim = 20;
  caster.castSpellType = type;

  if (type === 'heal') {
    const healAmt = 25;
    caster.hp = Math.min(MAX_HP, caster.hp + healAmt);
    caster.healAnim = 30;
    addFloatingText(caster.x, caster.y - 40, '+' + healAmt, '#4f8');
    spawnParticles(caster.x, caster.y - 20, '#4f8', 12);
    caster.lastSpell  = null;
    caster.comboTimer = 0;
    return;
  }

  let comboSpell = null;
  if (caster.comboTimer > 0 && caster.lastSpell) {
    const pair = [caster.lastSpell, type].sort().join('+');
    if (pair === 'fire+ice')       comboSpell = COMBO_STEAM;
    if (pair === 'fire+lightning') comboSpell = COMBO_EXPLOSION;
  }

  if (comboSpell) {
    projectiles.push(createProjectile(caster, target, comboSpell, true));
    addFloatingText(caster.x, caster.y - 60, comboSpell.name + '!', comboSpell.color);
    spawnParticles(caster.x + caster.facing * 20, caster.y - 20, comboSpell.color, 20);
    caster.lastSpell  = null;
    caster.comboTimer = 0;
  } else {
    projectiles.push(createProjectile(caster, target, spell, false));
    spawnParticles(caster.x + caster.facing * 20, caster.y - 20, spell.color, 8);
    caster.lastSpell  = type;
    caster.comboTimer = 90;
  }
}

function createProjectile(caster, target, spell, isCombo) {
  return {
    x: caster.x + caster.facing * 30,
    y: caster.y - 20,
    vx: spell.speed * caster.facing,
    vy: (Math.random() - 0.5) * 0.5,
    spell, isCombo,
    owner: caster, target,
    size: spell.size,
    life: 200,
    trail: []
  };
}

function activateShield(wizard) {
  if (wizard.shieldCooldown > 0) return;
  if (wizard.mana < 5) return;
  wizard.shieldUp    = true;
  wizard.shieldTimer = SHIELD_DURATION;
  wizard.shieldCooldown = SHIELD_COOLDOWN;
  wizard.meditating  = false;
  wizard.mana -= 5;
}

// ─── AI Logic ───
function updateAI() {
  aiDecisionTimer--;
  if (aiDecisionTimer > 0) return;

  aiDecisionTimer = ai.blinded > 0
    ? (55 + Math.random() * 40)
    : (22 + Math.random() * 28);

  const incoming = projectiles.filter(p => p.target === ai);
  let nearest = null, nearestDist = Infinity;
  for (const p of incoming) {
    const d = Math.abs(p.x - ai.x);
    if (d < nearestDist) { nearestDist = d; nearest = p; }
  }

  if (nearest && nearestDist < 140 && !ai.shieldUp && ai.shieldCooldown <= 0) {
    const shieldChance = nearest.isCombo ? 0.85 : 0.7;
    if (Math.random() < shieldChance) {
      activateShield(ai);
      aiDecisionTimer = 15;
      return;
    }
  }

  if (ai.mana < 20 && (!nearest || nearestDist > 300)) {
    ai.meditating   = true;
    aiDecisionTimer = 35 + Math.random() * 20;
    return;
  }

  if (ai.meditating && nearest && nearestDist < 250) ai.meditating = false;

  if (ai.hp < 40 && ai.mana >= SPELLS.heal.mana && Math.random() < 0.6) {
    castSpell(ai, player, 'heal');
    aiDecisionTimer = 30;
    return;
  }

  if (ai.blinded > 0 && Math.random() < 0.4) { aiDecisionTimer = 20; return; }

  if (ai.comboTimer > 0 && ai.lastSpell === 'fire') {
    if (ai.mana >= SPELLS.ice.mana       && Math.random() < 0.6) { castSpell(ai, player, 'ice');       return; }
    if (ai.mana >= SPELLS.lightning.mana && Math.random() < 0.5) { castSpell(ai, player, 'lightning'); return; }
  }
  if (ai.comboTimer > 0 && ai.lastSpell === 'ice'       && ai.mana >= SPELLS.fire.mana && Math.random() < 0.5) { castSpell(ai, player, 'fire'); return; }
  if (ai.comboTimer > 0 && ai.lastSpell === 'lightning'  && ai.mana >= SPELLS.fire.mana && Math.random() < 0.5) { castSpell(ai, player, 'fire'); return; }

  const r = Math.random();
  if (ai.mana >= SPELLS.lightning.mana && r < 0.15 && ai.mana > 60) {
    castSpell(ai, player, 'lightning');
  } else if (ai.mana >= SPELLS.ice.mana && r < 0.45) {
    castSpell(ai, player, 'ice');
  } else if (ai.mana >= SPELLS.fire.mana) {
    castSpell(ai, player, 'fire');
  } else {
    ai.meditating   = true;
    aiDecisionTimer = 30;
  }
}

// ─── Particles ───
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      color, life: 20 + Math.random() * 20, maxLife: 40,
      size: 2 + Math.random() * 3
    });
  }
}

function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color, life: 30 + Math.random() * 30, maxLife: 60,
      size: 2 + Math.random() * 4
    });
  }
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 60 });
}

// ─── Helper: alpha hex suffix ───
function alphaHex(a) {
  return Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

// Convert a color string + alpha to #rrggbbaa.
// Accepts #rgb, #rrggbb, rgba(…), or named colors.
function withAlpha(color, a) {
  if (a >= 1) return color; // no change needed unless we need to expand
  const hex = colorToHex6(color);
  return hex + alphaHex(a);
}

function colorToHex6(color) {
  // Already 6-digit hex
  if (color.startsWith('#') && color.length === 7) return color;
  // 3-digit hex
  if (color.startsWith('#') && color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  // rgba/rgb — parse
  const m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (m) {
    const r = parseInt(m[1]).toString(16).padStart(2,'0');
    const g = parseInt(m[2]).toString(16).padStart(2,'0');
    const b = parseInt(m[3]).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }
  return color; // fallback
}

// Build an ellipse as a polygon of N points
function ellipsePoly(cx, cy, rx, ry, n = 24) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

// ─── Draw helpers (coordinate-offset aware) ───

function drawEllipseFill(renderer, cx, cy, rx, ry, color) {
  renderer.fillPoly(ellipsePoly(cx, cy, rx, ry, 24), color);
}

function drawEllipseStroke(renderer, cx, cy, rx, ry, color, width = 1.5) {
  renderer.strokePoly(ellipsePoly(cx, cy, rx, ry, 24), color, width, true);
}

function drawCircleStroke(renderer, cx, cy, r, color, width = 1) {
  renderer.strokePoly(ellipsePoly(cx, cy, r, r, 20), color, width, true);
}

// ─── Wizard drawing ───
function drawWizard(renderer, text, w, label) {
  const cx = w.x;
  const cy = w.y;
  const f  = w.facing;
  const flash = w.hitAnim > 0 && w.hitAnim % 4 < 2;

  // Colors
  const robeColor     = flash ? '#ffffff' : (w.isAI ? '#833333' : '#333388');
  const robeOutline   = flash ? '#ffffff' : (w.isAI ? '#ff4444' : '#4488ff');
  const robeBelt      = flash ? '#ffffff' : (w.isAI ? '#aa3333' : '#3333aa');
  const hatColor      = flash ? '#ffffff' : (w.isAI ? '#622222' : '#222266');
  const hatStarColor  = flash ? '#ffffff' : '#ffff00';
  const brimColor     = robeColor;

  // ── Robe (trapezoid) ──
  // Points relative to (cx, cy): top corners (±12,0), bottom corners (±16,40)
  renderer.fillPoly([
    { x: cx - 12, y: cy + 0  },
    { x: cx + 12, y: cy + 0  },
    { x: cx + 16, y: cy + 40 },
    { x: cx - 16, y: cy + 40 },
  ], robeColor);
  renderer.strokePoly([
    { x: cx - 12, y: cy + 0  },
    { x: cx + 12, y: cy + 0  },
    { x: cx + 16, y: cy + 40 },
    { x: cx - 16, y: cy + 40 },
  ], robeOutline, 1.5, true);

  // Belt line
  renderer.drawLine(cx - 13, cy + 15, cx + 13, cy + 15, robeBelt, 2);

  // ── Hat (triangle, tip leaning toward facing) ──
  renderer.fillPoly([
    { x: cx - 14, y: cy - 5  },
    { x: cx + f * 5, y: cy - 50 },
    { x: cx + 14, y: cy - 5  },
  ], hatColor);
  renderer.strokePoly([
    { x: cx - 14, y: cy - 5  },
    { x: cx + f * 5, y: cy - 50 },
    { x: cx + 14, y: cy - 5  },
  ], robeOutline, 1.5, true);

  // Hat star ★ — draw as a small filled circle (atlas star glyph is unavailable at tiny sizes)
  renderer.fillCircle(cx + f * 2, cy - 22, 3, hatStarColor);

  // ── Brim (ellipse) ──
  drawEllipseFill(renderer, cx, cy - 5, 18, 5, brimColor);
  drawEllipseStroke(renderer, cx, cy - 5, 18, 5, robeOutline, 1.5);

  // ── Face ──
  renderer.fillRect(cx - 6, cy - 16, 12, 10, '#ddbbaa');

  // ── Eyes ──
  if (w.blinded > 0) {
    // X eyes
    renderer.drawLine(cx - 4, cy - 13, cx - 1, cy - 10, '#666666', 1.5);
    renderer.drawLine(cx - 1, cy - 13, cx - 4, cy - 10, '#666666', 1.5);
    renderer.drawLine(cx + 2, cy - 13, cx + 5, cy - 10, '#666666', 1.5);
    renderer.drawLine(cx + 5, cy - 13, cx + 2, cy - 10, '#666666', 1.5);
  } else {
    const eyeOffL = f > 0 ? -4 : -2;
    const eyeOffR = f > 0 ?  2 :  0;
    renderer.fillRect(cx + eyeOffL, cy - 14, 3, 3, '#ffffff');
    renderer.fillRect(cx + eyeOffR, cy - 14, 3, 3, '#ffffff');
    renderer.fillRect(cx + eyeOffL + 1, cy - 13, 1.5, 1.5, '#111111');
    renderer.fillRect(cx + eyeOffR + 1, cy - 13, 1.5, 1.5, '#111111');
  }

  // ── Staff arm + staff ──
  // Arm: from (cx + f*10, cy+5) to tip
  const armAngle = w.castAnim > 0 ? -0.6 : 0.15;
  // Approximate arm rotation: use the end-point of the rotated arm
  const armLen = 15;
  const cosA = Math.cos(armAngle * f);
  const sinA = Math.sin(armAngle * f);
  const armStartX = cx + f * 10;
  const armStartY = cy + 5;
  const armEndX = armStartX + f * armLen * cosA - (-10) * sinA;
  const armEndY = armStartY + f * armLen * sinA + (-10) * cosA;
  const armColor = flash ? '#ffffff' : '#ddbbaa';
  renderer.drawLine(armStartX, armStartY, armEndX, armEndY, armColor, 3);

  // Staff body (fixed position — matches original pixel positions)
  renderer.drawLine(cx + f * 12, cy + 15, cx + f * 18, cy - 25, '#886644', 2.5);

  // Staff orb
  let orbColor = '#aa44ff';
  if (w.castAnim > 0 && w.castSpellType && SPELLS[w.castSpellType]) {
    orbColor = SPELLS[w.castSpellType].color;
  }
  renderer.setGlow(orbColor, 0.8);
  renderer.fillCircle(cx + f * 18, cy - 27, 5, orbColor);
  renderer.setGlow(null);

  // ── Shield bubble ──
  if (w.shieldUp) {
    const sa = 0.3 + 0.2 * Math.sin(roundTimer * 0.2);
    const shieldAlpha1 = sa + 0.3;
    const shieldAlpha2 = sa;
    // Filled ellipse with partial alpha
    drawEllipseFill(renderer, cx + f * -5, cy - 5, 30, 48, withAlpha('#aa44ff', shieldAlpha2));
    drawEllipseStroke(renderer, cx + f * -5, cy - 5, 30, 48, withAlpha('#aa44ff', shieldAlpha1), 3);
    // Shield rune: draw a small diamond shape
    const rx = cx + f * -5;
    const ry = cy - 5;
    const runeA = withAlpha('#ffffff', sa + 0.1);
    renderer.fillPoly([
      { x: rx,     y: ry - 8 },
      { x: rx + 5, y: ry     },
      { x: rx,     y: ry + 8 },
      { x: rx - 5, y: ry     },
    ], runeA);
  }

  // ── Meditation aura ──
  if (w.meditating) {
    for (let mi = 0; mi < 4; mi++) {
      const ma  = roundTimer * 0.05 + mi * (Math.PI * 2 / 4);
      const mrx = Math.cos(ma) * 22;
      const mry = Math.sin(ma) * 35;
      const ma2 = 0.3 + 0.2 * Math.sin(roundTimer * 0.1 + mi);
      renderer.fillCircle(cx + mrx, cy + mry - 5, 3, withAlpha('#64b4ff', ma2));
    }
    // Mana stream — short horizontal dashes
    for (let mi = 0; mi < 6; mi++) {
      const my = cy - 40 + mi * 15;
      const mx = cx + Math.sin(roundTimer * 0.08 + mi) * 15;
      renderer.drawLine(mx - 5, my, mx + 5, my, '#ffffff26', 1);
    }
  }

  // ── Heal aura ──
  if (w.healAnim > 0) {
    const ha = w.healAnim / 30;
    const scale = 1 + (1 - ha) * 0.5;
    drawEllipseFill(renderer, cx, cy, 25 * scale, 40 * scale, withAlpha('#44ff88', ha * 0.3));
    drawEllipseStroke(renderer, cx, cy, 25 * scale, 40 * scale, withAlpha('#44ff88', ha * 0.5), 2);
  }

  // ── Blind cloud ──
  if (w.blinded > 0) {
    const ba = Math.min(1, w.blinded / 30);
    drawEllipseFill(renderer, cx, cy - 15, 22, 30, withAlpha('#c8c8c8', ba * 0.25));
    text.drawText('BLIND', cx, cy - 43, 9, withAlpha('#ffffff', ba * 0.6), 'center');
  }

  // ── HP bar ──
  const barW = 54, barH = 7;
  const barX = cx - barW / 2;
  const barY = cy - 65;
  renderer.fillRect(barX - 1, barY - 1, barW + 2, barH + 2, '#222222');
  renderer.fillRect(barX, barY, barW, barH, '#333333');
  const hpPct   = w.hp / MAX_HP;
  const hpColor = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff4444';
  renderer.fillRect(barX, barY, barW * hpPct, barH, hpColor);
  drawCircleStroke(renderer, barX, barY, 0, '#555555', 1); // just a placeholder — draw stroke rect
  renderer.strokePoly([
    { x: barX,        y: barY        },
    { x: barX + barW, y: barY        },
    { x: barX + barW, y: barY + barH },
    { x: barX,        y: barY + barH },
  ], '#555555', 1, true);
  text.drawText(String(Math.ceil(w.hp)), cx, barY + 1, 7, '#ffffff', 'center');

  // ── Mana bar ──
  const mBarY = barY + barH + 2;
  const mBarH = 5;
  renderer.fillRect(barX - 1, mBarY - 1, barW + 2, mBarH + 2, '#222222');
  renderer.fillRect(barX, mBarY, barW, mBarH, '#333333');
  renderer.fillRect(barX, mBarY, barW * (w.mana / MAX_MANA), mBarH, '#4488ff');
  renderer.strokePoly([
    { x: barX,        y: mBarY         },
    { x: barX + barW, y: mBarY         },
    { x: barX + barW, y: mBarY + mBarH },
    { x: barX,        y: mBarY + mBarH },
  ], '#555555', 1, true);

  // ── Label ──
  text.drawText(label, cx, cy + 55, 11, '#888888', 'center');
}

// ─── Background ───
function drawBackground(renderer, text) {
  // Sky — fill with gradient approximation (3 rects from dark to medium)
  renderer.fillRect(0, 0,   W, H * 0.5,  '#050515');
  renderer.fillRect(0, H * 0.35, W, H * 0.15, '#12122e');
  renderer.fillRect(0, H * 0.5, W, H * 0.5,  '#1a1a2e');

  // Stars (50 dots)
  for (let i = 0; i < 50; i++) {
    const sx = (i * 137.5 + 23) % W;
    const sy = (i * 73.1  + 11) % (H * 0.55);
    const ss = 0.5 + (i % 3) * 0.5;
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(roundTimer * 0.015 + i * 0.7));
    renderer.fillRect(sx, sy, ss, ss, withAlpha('#ffffff', twinkle * 0.6));
  }

  // Moon — two circles at different alphas
  renderer.fillCircle(480, 50, 22, withAlpha('#ddddee', 0.15));
  renderer.fillCircle(480, 50, 18, withAlpha('#eeeeff', 0.08));

  // Ground
  renderer.fillRect(0, 295, W, 5,   '#2a2a4e');
  renderer.fillRect(0, 300, W, 100, '#1e1e3a');

  // Ground line
  renderer.drawLine(0, 300, W, 300, '#3a3a5e', 1);

  // Arena center line (dashed)
  renderer.dashedLine(W / 2, 80, W / 2, 300, '#aa44ff1f', 1, 4, 8);

  // Arena ellipse outline
  drawEllipseStroke(renderer, W / 2, 300, 260, 12, '#aa44ff14', 2);

  // Runes on ground
  const runeAlpha = 0.04 + 0.025 * Math.sin(roundTimer * 0.025);
  const runeColor = withAlpha('#aa44ff', runeAlpha);
  const runeChars = ['\u2721', '\u2726', '\u2605', '\u2736', '\u2727'];
  for (let ri = 0; ri < 5; ri++) {
    text.drawText(runeChars[ri], 80 + ri * 110, 310 + (ri % 2) * 15, 14, runeColor, 'center');
  }

  // Ambient magic particles rising from ground
  for (let ap = 0; ap < 8; ap++) {
    const apx = (ap * 83 + roundTimer * 0.3) % W;
    const apy = 300 - ((roundTimer * 0.5 + ap * 37) % 80);
    renderer.fillCircle(apx, apy, 1.5, withAlpha('#aa44ff', 0.15));
  }
}

// ─── Projectiles ───
function drawProjectiles(renderer) {
  for (const p of projectiles) {
    // Trail
    for (const t of p.trail) {
      const alpha = t.life / 15;
      if (alpha <= 0) continue;
      const r = p.size * 0.6 * alpha;
      renderer.fillCircle(t.x, t.y, r, withAlpha(p.spell.trail, alpha * 0.4));
    }

    // Outer glow halo
    renderer.fillCircle(p.x, p.y, p.size * 2, withAlpha(p.spell.color, 0.15));

    // Main body
    renderer.setGlow(p.spell.color, 0.8);
    renderer.fillCircle(p.x, p.y, p.size, p.spell.color);
    renderer.setGlow(null);

    // Core highlight
    renderer.fillCircle(p.x, p.y, p.size * 0.4, withAlpha('#ffffff', 0.8));

    // Lightning zigzag
    if (p.spell.name === 'Lightning' || p.spell.name === 'Explosion') {
      let lx = p.x, ly = p.y;
      for (let j = 0; j < 5; j++) {
        const nx = p.x - p.vx * (j + 1) * 2.5 + (Math.random() - 0.5) * 14;
        const ny = p.y + (Math.random() - 0.5) * 14;
        renderer.drawLine(lx, ly, nx, ny, withAlpha(p.spell.color, 0.6), 2);
        lx = nx; ly = ny;
      }
    }

    // Ice crystals
    if (p.spell.name === 'Ice' || p.spell.name === 'Steam') {
      for (let ic = 0; ic < 3; ic++) {
        const ia  = roundTimer * 0.1 + ic * 2;
        const irx = Math.cos(ia) * (p.size + 3);
        const iry = Math.sin(ia) * (p.size + 3);
        renderer.drawLine(
          p.x + irx, p.y + iry,
          p.x + irx * 0.5, p.y + iry * 0.5,
          withAlpha(p.spell.color, 0.4), 1
        );
      }
    }
  }
}

// ─── Particles ───
function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = p.life / (p.maxLife || 40);
    renderer.fillCircle(p.x, p.y, p.size * alpha, withAlpha(p.color, alpha));
  }
}

// ─── Floating texts ───
function drawFloatingTexts(renderer, text) {
  for (const ft of floatingTexts) {
    const alpha = ft.life / 60;
    renderer.setGlow(ft.color, 0.5);
    text.drawText(ft.text, ft.x, ft.y, 14, withAlpha(ft.color, alpha), 'center');
    renderer.setGlow(null);
  }
}

// ─── HUD ───
function drawHUD(renderer, text) {
  // Player win indicators
  text.drawText('Wins:', 12, 8, 11, '#4488ff', 'left');
  for (let i = 0; i < 2; i++) {
    const filled = i < player.roundWins;
    renderer.fillCircle(62 + i * 18, 15, 6, filled ? '#4488ff' : '#222222');
    drawCircleStroke(renderer, 62 + i * 18, 15, 6, '#4488ff', 1);
  }

  // AI win indicators
  text.drawText('Wins:', W - 50, 8, 11, '#ff4444', 'left');
  for (let i = 0; i < 2; i++) {
    const filled = i < ai.roundWins;
    renderer.fillCircle(W - 35 + i * 18, 15, 6, filled ? '#ff4444' : '#222222');
    drawCircleStroke(renderer, W - 35 + i * 18, 15, 6, '#ff4444', 1);
  }

  // Spell bar background
  const spellY = H - 28;
  renderer.fillRect(30, spellY - 14, 440, 30, '#00000066');
  renderer.strokePoly([
    { x: 30,  y: spellY - 14 },
    { x: 470, y: spellY - 14 },
    { x: 470, y: spellY + 16 },
    { x: 30,  y: spellY + 16 },
  ], '#aa44ff33', 1, true);

  const spellList = ['fire', 'ice', 'lightning', 'heal'];
  const spellKeys = ['1', '2', '3', '4'];
  for (let si = 0; si < 4; si++) {
    const sp = SPELLS[spellList[si]];
    const sx = 80 + si * 100;
    const canCast = player.mana >= sp.mana && !player.shieldUp;
    const col     = canCast ? sp.color : '#444444';
    const a       = canCast ? 1 : 0.4;
    text.drawText('[' + spellKeys[si] + '] ' + sp.name, sx, spellY - 8, 10, withAlpha(col, a), 'center');
    text.drawText(sp.mana + 'mp', sx, spellY + 3, 9, withAlpha(canCast ? '#888888' : '#333333', a), 'center');
  }

  // Shield indicator
  const canShield = player.shieldCooldown <= 0 && player.mana >= 5;
  const shieldCol = canShield ? '#aa44ff' : '#444444';
  text.drawText('[S] Shield', 510, spellY - 8, 10, withAlpha(shieldCol, canShield ? 1 : 0.4), 'center');
  if (player.shieldCooldown > 0) {
    text.drawText((player.shieldCooldown / 60).toFixed(1) + 's', 510, spellY + 3, 9, '#555555', 'center');
  }

  // Meditating
  if (player.meditating) {
    const medA = 0.5 + 0.3 * Math.sin(roundTimer * 0.1);
    text.drawText('\u2726 Meditating... \u2726', W / 2, 40, 11, withAlpha('#88ccff', medA), 'center');
  }

  // Combo hint
  if (player.comboTimer > 0 && player.lastSpell) {
    let hint = '';
    if (player.lastSpell === 'fire')      hint = '\u26A1 Combo: +[2]Ice=Steam  +[3]Lightning=Explosion';
    else if (player.lastSpell === 'ice')  hint = '\u26A1 Combo: +[1]Fire=Steam';
    else if (player.lastSpell === 'lightning') hint = '\u26A1 Combo: +[1]Fire=Explosion';
    if (hint) {
      const comboA = Math.min(1, player.comboTimer / 45);
      text.drawText(hint, W / 2, 57, 10, withAlpha('#aa44ff', comboA), 'center');
    }
  }
}

// ─── Update ───
function update(game) {
  const input = game.input;

  if (game.state === 'waiting') {
    // Any key starts the game
    for (const key of ['1','2','3','4','s','S',' ','Enter','ArrowLeft','ArrowRight']) {
      if (input.wasPressed(key)) { initGame(game); return; }
    }
    return;
  }

  if (game.state === 'over') {
    for (const key of ['1','2','3','4','s','S',' ','Enter']) {
      if (input.wasPressed(key)) { initGame(game); return; }
    }
    return;
  }

  if (roundEnded) {
    for (const key of ['1','2','3','4','s','S',' ','Enter']) {
      if (input.wasPressed(key)) {
        currentRound++;
        if (roundNumEl) roundNumEl.textContent = currentRound;
        initRound();
        game.hideOverlay();
        return;
      }
    }
    return;
  }

  if (game.state !== 'playing') return;

  roundTimer++;

  // Spell + shield input
  if (input.wasPressed('1')) castSpell(player, ai, 'fire');
  if (input.wasPressed('2')) castSpell(player, ai, 'ice');
  if (input.wasPressed('3')) castSpell(player, ai, 'lightning');
  if (input.wasPressed('4')) castSpell(player, ai, 'heal');
  if (input.wasPressed('s') || input.wasPressed('S')) activateShield(player);

  // Player meditation — held space
  player.meditating = input.isDown(' ') && !player.shieldUp;

  // Mana regen
  for (const w of [player, ai]) {
    w.mana = Math.min(MAX_MANA, w.mana + (w.meditating ? MEDITATE_REGEN : MANA_REGEN));
  }

  // Timers
  for (const w of [player, ai]) {
    if (w.shieldTimer > 0)  { w.shieldTimer--;  if (w.shieldTimer <= 0)  w.shieldUp = false; }
    if (w.shieldCooldown > 0) w.shieldCooldown--;
    if (w.castAnim > 0)   w.castAnim--;
    if (w.hitAnim > 0)    w.hitAnim--;
    if (w.healAnim > 0)   w.healAnim--;
    if (w.blinded > 0)    w.blinded--;
    if (w.slowed > 0)     w.slowed--;
    if (w.comboTimer > 0) w.comboTimer--;
  }

  // AI
  updateAI();

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    p.trail.push({ x: p.x, y: p.y, life: 15 });
    if (p.trail.length > 20) p.trail.shift();

    // Trail particles
    if (Math.random() < 0.4) {
      particles.push({
        x: p.x + (Math.random() - 0.5) * 4,
        y: p.y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        color: p.spell.trail,
        life: 8 + Math.random() * 8, maxLife: 16,
        size: 1.5 + Math.random() * 2
      });
    }

    // Collision
    const target = p.target;
    const dx = p.x - target.x;
    const dy = p.y - (target.y - 20);

    if (Math.abs(dx) < 25 && Math.abs(dy) < 40) {
      if (target.shieldUp) {
        spawnExplosion(target.x + target.facing * -20, target.y - 20, '#ffffff', 15);
        addFloatingText(target.x, target.y - 50, 'Blocked!', '#ffffff');
        projectiles.splice(i, 1);
        continue;
      }

      const dmg = p.spell.damage;
      target.hp = Math.max(0, target.hp - dmg);
      target.hitAnim = 15;
      p.owner.totalDamage += dmg;

      if (p.owner === player) {
        score += dmg;
        if (scoreEl) scoreEl.textContent = score;
      } else {
        if (aiScoreEl) aiScoreEl.textContent = ai.totalDamage;
      }

      addFloatingText(target.x, target.y - 50, '-' + dmg, p.spell.color);

      if (p.spell.blind) {
        target.blinded = BLIND_DURATION;
        addFloatingText(target.x, target.y - 70, 'Blinded!', '#cccccc');
      }
      if (p.spell.slow) {
        target.slowed = p.spell.slowDur || 120;
      }

      if (p.spell.explosive) {
        spawnExplosion(p.x, p.y, '#ff8800', 40);
        spawnExplosion(p.x, p.y, '#ffff00', 20);
      } else {
        spawnExplosion(p.x, p.y, p.spell.color, 20);
      }

      projectiles.splice(i, 1);
      continue;
    }

    if (p.x < -20 || p.x > W + 20 || p.life <= 0) {
      projectiles.splice(i, 1);
    }
  }

  // Update trail life (already ticked in draw in original; tick here)
  for (const p of projectiles) {
    p.trail = p.trail.filter(t => t.life > 0);
    for (const t of p.trail) t.life--;
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 0.8;
    floatingTexts[i].life--;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  // Round-end check
  if (player.hp <= 0 || ai.hp <= 0) {
    endRound(game);
  }
}

function endRound(game) {
  const playerWon = ai.hp <= 0;
  if (playerWon) player.roundWins++;
  else           ai.roundWins++;

  savedPlayerWins = player.roundWins;
  savedAiWins     = ai.roundWins;

  if (currentRound >= 3 || player.roundWins >= 2 || ai.roundWins >= 2) {
    game.setState('over');
    const won = player.roundWins > ai.roundWins;
    game.showOverlay(
      won ? 'VICTORY!' : 'DEFEATED',
      'Score: ' + score + ' | Rounds: ' + player.roundWins + '-' + ai.roundWins + ' | Press any key'
    );
  } else {
    // Track round-end phase at game level; engine stays in 'playing'
    roundEnded = true;
    game.showOverlay(
      playerWon ? 'Round Won!' : 'Round Lost!',
      'Round ' + currentRound + '/3 | ' + player.roundWins + '-' + ai.roundWins + ' | Press any key'
    );
  }
}

// ─── Export ───
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    initRound();
    game.showOverlay('WIZARD DUELS', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    update(game);
  };

  game.onDraw = (renderer, text) => {
    drawBackground(renderer, text);
    drawProjectiles(renderer);
    drawParticles(renderer);
    if (player) drawWizard(renderer, text, player, 'YOU');
    if (ai)     drawWizard(renderer, text, ai,     'AI');
    drawFloatingTexts(renderer, text);
    if (game.state === 'playing') drawHUD(renderer, text);
  };

  game.start();
  return game;
}
