// sumo-push/game.js — Sumo Push game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500, H = 500;
const CX = W / 2, CY = H / 2;

// Ring
const RING_RADIUS = 190;
const RING_EDGE_ZONE = 40;

// Wrestler constants
const WRESTLER_RADIUS = 28;
const MAX_SPEED = 2.8;
const ACCEL = 0.25;
const FRICTION = 0.92;
const MAX_STAMINA = 100;
const STAMINA_REGEN = 0.3;
const PUSH_COST = 25;
const PUSH_FORCE = 8;
const CHARGE_PUSH_FORCE = 16;
const PUSH_RANGE = 70;
const DODGE_SPEED = 7;
const DODGE_COST = 20;
const DODGE_DURATION = 12;
const DODGE_COOLDOWN = 30;
const CHARGE_RATE = 1.5;
const MAX_CHARGE = 100;
const PUSH_COOLDOWN = 20;
const WEIGHT_BASE = 1.0;

// Game state
let score = 0;
let playerWins = 0;
let aiWins = 0;
let currentRound = 1;
let roundState = 'ready'; // 'ready' | 'fighting' | 'roundEnd' | 'matchEnd'
let roundTimer = 0;
let roundEndTimer = 0;
let roundMessage = '';

// Particles
let particles = [];
let ringPulse = 0;

// AI state
let aiDecisionTimer = 0;
let aiTarget = { x: CX, y: CY };
let aiWantCharge = false;
let aiWantPush = false;
let aiWantDodge = false;

let player, ai;

const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');
const roundInfoEl = document.getElementById('roundInfo');

// ── Helpers ──

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function distFromCenter(w) {
  return Math.sqrt((w.x - CX) ** 2 + (w.y - CY) ** 2);
}
function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

// ── Wrestler factory ──

function createWrestler(x, y, color, colorGlow) {
  return {
    x, y,
    vx: 0, vy: 0,
    radius: WRESTLER_RADIUS,
    color, colorGlow,
    stamina: MAX_STAMINA,
    charge: 0,
    isCharging: false,
    isPushing: false,
    pushTimer: 0,
    pushDirX: 0, pushDirY: 0,
    isDodging: false,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    dodgeDirX: 0, dodgeDirY: 0,
    weight: WEIGHT_BASE,
    stunTimer: 0,
    flashTimer: 0,
  };
}

// ── Particle helpers ──

function spawnParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (Math.random() * 0.5 + 0.5) * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 30 + Math.random() * 20,
      maxLife: 30 + Math.random() * 20,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnImpactParticles(x, y, dirX, dirY, color, count) {
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 1.5;
    const spd = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: dirX * spd + spread * 2,
      vy: dirY * spd + spread * 2,
      life: 15 + Math.random() * 15,
      maxLife: 15 + Math.random() * 15,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

// ── Game mechanics ──

function edgeResistance(wrestler) {
  const d = distFromCenter(wrestler);
  const edgeDist = RING_RADIUS - d;
  if (edgeDist < 0) return 0.2;
  if (edgeDist < RING_EDGE_ZONE) {
    return 0.4 + 0.6 * (edgeDist / RING_EDGE_ZONE);
  }
  return 1.0;
}

function applyPush(attacker, defender, force) {
  if (defender.isDodging) {
    spawnParticles(defender.x, defender.y, '#fff', 4, 2);
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const n = normalize(dx, dy);
    attacker.vx += n.x * 3;
    attacker.vy += n.y * 3;
    attacker.stunTimer = 15;
    return;
  }

  const dx = defender.x - attacker.x;
  const dy = defender.y - attacker.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return;
  const nx = dx / d;
  const ny = dy / d;

  const resist = edgeResistance(defender);
  const effectiveForce = force / (resist * defender.weight);

  defender.vx += nx * effectiveForce;
  defender.vy += ny * effectiveForce;
  defender.stunTimer = 10;

  attacker.vx -= nx * 1.5;
  attacker.vy -= ny * 1.5;

  const impactX = (attacker.x + defender.x) / 2;
  const impactY = (attacker.y + defender.y) / 2;
  spawnImpactParticles(impactX, impactY, nx, ny, '#fff', 8);
  spawnParticles(impactX, impactY, attacker.color, 5, 3);

  ringPulse = 10;
}

function moveWrestler(w) {
  if (w.isDodging) {
    w.x += w.dodgeDirX * DODGE_SPEED;
    w.y += w.dodgeDirY * DODGE_SPEED;
    w.dodgeTimer--;
    if (w.dodgeTimer <= 0) {
      w.isDodging = false;
      w.dodgeCooldown = DODGE_COOLDOWN;
    }
  } else {
    w.x += w.vx;
    w.y += w.vy;
    w.vx *= FRICTION;
    w.vy *= FRICTION;
  }

  if (!w.isCharging) {
    w.stamina = Math.min(MAX_STAMINA, w.stamina + STAMINA_REGEN);
  }

  if (w.pushTimer > 0) w.pushTimer--;
  if (w.dodgeCooldown > 0) w.dodgeCooldown--;
  if (w.stunTimer > 0) w.stunTimer--;
  if (w.flashTimer > 0) w.flashTimer--;

  if (!w.isCharging && w.charge > 0) {
    w.charge = Math.max(0, w.charge - 2);
  }
}

function collideWrestlers(a, b) {
  if (a.isDodging || b.isDodging) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;
  if (d < minDist && d > 0) {
    const nx = dx / d;
    const ny = dy / d;
    const overlap = minDist - d;
    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;

    const relVx = a.vx - b.vx;
    const relVy = a.vy - b.vy;
    const relDot = relVx * nx + relVy * ny;
    if (relDot > 0) {
      a.vx -= nx * relDot * 0.5;
      a.vy -= ny * relDot * 0.5;
      b.vx += nx * relDot * 0.5;
      b.vy += ny * relDot * 0.5;
    }
  }
}

function isOutOfRing(w) {
  return distFromCenter(w) > RING_RADIUS + w.radius * 0.5;
}

function constrainToRing(w) {
  const d = distFromCenter(w);
  if (d > RING_RADIUS - w.radius * 0.3 && d > 0) {
    if (d > RING_RADIUS + w.radius) return;
    const nx = (w.x - CX) / d;
    const ny = (w.y - CY) / d;
    const dot = w.vx * nx + w.vy * ny;
    if (dot > 0) {
      const resist = edgeResistance(w);
      w.vx -= nx * dot * (1 - resist) * 0.3;
      w.vy -= ny * dot * (1 - resist) * 0.3;
    }
  }
}

// ── Player input ──

function handlePlayerInput(input) {
  if (player.stunTimer > 0) return;
  if (player.isDodging) return;

  let ax = 0, ay = 0;
  if (input.isDown('ArrowLeft')) ax -= 1;
  if (input.isDown('ArrowRight')) ax += 1;
  if (input.isDown('ArrowUp')) ay -= 1;
  if (input.isDown('ArrowDown')) ay += 1;

  const speedMult = player.isCharging ? 0.4 : 1.0;

  if (ax !== 0 || ay !== 0) {
    const n = normalize(ax, ay);
    player.vx += n.x * ACCEL * speedMult;
    player.vy += n.y * ACCEL * speedMult;
  }

  const spd = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  if (spd > MAX_SPEED * speedMult) {
    player.vx = (player.vx / spd) * MAX_SPEED * speedMult;
    player.vy = (player.vy / spd) * MAX_SPEED * speedMult;
  }

  // Charge (Z)
  if (input.isDown('z') || input.isDown('Z')) {
    if (player.stamina > 0.5) {
      player.isCharging = true;
      player.charge = Math.min(MAX_CHARGE, player.charge + CHARGE_RATE);
      player.stamina = Math.max(0, player.stamina - 0.4);
    } else {
      player.isCharging = false;
    }
  } else {
    player.isCharging = false;
  }

  // Push (Space)
  if (input.isDown(' ') && player.pushTimer <= 0) {
    const d = dist(player, ai);
    if (d < PUSH_RANGE && player.stamina >= PUSH_COST) {
      const force = player.charge > 50 ? CHARGE_PUSH_FORCE * (player.charge / MAX_CHARGE + 0.5) : PUSH_FORCE;
      applyPush(player, ai, force);
      player.stamina -= PUSH_COST;
      player.pushTimer = PUSH_COOLDOWN;
      player.charge = 0;
      player.isCharging = false;
      player.isPushing = true;
      player.flashTimer = 8;
      const dx = ai.x - player.x;
      const dy = ai.y - player.y;
      const n = normalize(dx, dy);
      player.pushDirX = n.x;
      player.pushDirY = n.y;
      setTimeout(() => { player.isPushing = false; }, 200);
    }
  }

  // Dodge (X)
  if ((input.isDown('x') || input.isDown('X')) && !player.isDodging &&
      player.dodgeCooldown <= 0 && player.stamina >= DODGE_COST) {
    player.isDodging = true;
    player.dodgeTimer = DODGE_DURATION;
    player.stamina -= DODGE_COST;
    if (ax !== 0 || ay !== 0) {
      const n = normalize(ax, ay);
      player.dodgeDirX = n.x;
      player.dodgeDirY = n.y;
    } else {
      const dx = player.x - ai.x;
      const dy = player.y - ai.y;
      const n = normalize(dx, dy);
      player.dodgeDirX = n.x;
      player.dodgeDirY = n.y;
    }
    spawnParticles(player.x, player.y, player.color, 6, 2);
  }
}

// ── AI ──

function makeAIDecision() {
  const dp = dist(ai, player);
  const aiEdgeDist = RING_RADIUS - distFromCenter(ai);
  const playerEdgeDist = RING_RADIUS - distFromCenter(player);

  aiWantCharge = false;
  aiWantPush = false;
  aiWantDodge = false;

  if (aiEdgeDist < 50) {
    aiTarget.x = CX + (Math.random() - 0.5) * 40;
    aiTarget.y = CY + (Math.random() - 0.5) * 40;
    return;
  }

  if (playerEdgeDist < 60 && dp < 120) {
    const pAngle = Math.atan2(player.y - CY, player.x - CX);
    aiTarget.x = player.x - Math.cos(pAngle) * 50;
    aiTarget.y = player.y - Math.sin(pAngle) * 50;
    if (dp < PUSH_RANGE && ai.stamina >= PUSH_COST) {
      aiWantPush = true;
    }
    return;
  }

  if (player.isCharging && dp < 100) {
    if (Math.random() < 0.6) { aiWantDodge = true; return; }
  }
  if (player.isPushing && dp < PUSH_RANGE + 20) {
    if (Math.random() < 0.5) { aiWantDodge = true; return; }
  }

  if (dp > PUSH_RANGE + 20) {
    const pAngle = Math.atan2(player.y - CY, player.x - CX);
    aiTarget.x = player.x - Math.cos(pAngle) * 40;
    aiTarget.y = player.y - Math.sin(pAngle) * 40;
    if (dp > 100 && ai.stamina > 40) {
      aiWantCharge = true;
    }
  } else {
    if (ai.charge > 60 || (ai.stamina >= PUSH_COST && Math.random() < 0.5)) {
      aiWantPush = true;
    } else if (ai.stamina > 30 && Math.random() < 0.3) {
      aiWantCharge = true;
      const angle = Math.atan2(ai.y - player.y, ai.x - player.x) + (Math.random() < 0.5 ? 0.5 : -0.5);
      aiTarget.x = player.x + Math.cos(angle) * 55;
      aiTarget.y = player.y + Math.sin(angle) * 55;
    } else {
      const angle = Math.atan2(ai.y - player.y, ai.x - player.x) + (Math.random() < 0.5 ? 0.8 : -0.8);
      aiTarget.x = player.x + Math.cos(angle) * 60;
      aiTarget.y = player.y + Math.sin(angle) * 60;
    }
  }
}

function updateAI() {
  if (ai.stunTimer > 0) return;
  if (ai.isDodging) return;

  aiDecisionTimer--;
  if (aiDecisionTimer <= 0) {
    aiDecisionTimer = 10 + Math.floor(Math.random() * 15);
    makeAIDecision();
  }

  const dx = aiTarget.x - ai.x;
  const dy = aiTarget.y - ai.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const speedMult = ai.isCharging ? 0.4 : 1.0;

  if (d > 5) {
    const n = normalize(dx, dy);
    ai.vx += n.x * ACCEL * speedMult;
    ai.vy += n.y * ACCEL * speedMult;
  }

  const spd = Math.sqrt(ai.vx ** 2 + ai.vy ** 2);
  if (spd > MAX_SPEED * speedMult) {
    ai.vx = (ai.vx / spd) * MAX_SPEED * speedMult;
    ai.vy = (ai.vy / spd) * MAX_SPEED * speedMult;
  }

  if (aiWantCharge && ai.stamina > 15) {
    ai.isCharging = true;
    ai.charge = Math.min(MAX_CHARGE, ai.charge + CHARGE_RATE);
    ai.stamina = Math.max(0, ai.stamina - 0.4);
  } else {
    ai.isCharging = false;
  }

  if (aiWantPush && ai.pushTimer <= 0) {
    const dp = dist(ai, player);
    if (dp < PUSH_RANGE && ai.stamina >= PUSH_COST) {
      const force = ai.charge > 50 ? CHARGE_PUSH_FORCE * (ai.charge / MAX_CHARGE + 0.5) : PUSH_FORCE;
      applyPush(ai, player, force);
      ai.stamina -= PUSH_COST;
      ai.pushTimer = PUSH_COOLDOWN;
      ai.charge = 0;
      ai.isCharging = false;
      ai.isPushing = true;
      ai.flashTimer = 8;
      const ndx = player.x - ai.x;
      const ndy = player.y - ai.y;
      const nn = normalize(ndx, ndy);
      ai.pushDirX = nn.x;
      ai.pushDirY = nn.y;
      aiWantPush = false;
      aiWantCharge = false;
      setTimeout(() => { ai.isPushing = false; }, 200);
    }
  }

  if (aiWantDodge && !ai.isDodging && ai.dodgeCooldown <= 0 && ai.stamina >= DODGE_COST) {
    ai.isDodging = true;
    ai.dodgeTimer = DODGE_DURATION;
    ai.stamina -= DODGE_COST;
    const pdx = ai.x - player.x;
    const pdy = ai.y - player.y;
    const n = normalize(pdx, pdy);
    if (Math.random() < 0.5) {
      ai.dodgeDirX = -n.y;
      ai.dodgeDirY = n.x;
    } else {
      ai.dodgeDirX = n.y;
      ai.dodgeDirY = -n.x;
    }
    aiWantDodge = false;
    spawnParticles(ai.x, ai.y, ai.color, 6, 2);
  }
}

// ── Init ──

function initRound() {
  player = createWrestler(CX - 60, CY, '#4488ff', 'rgba(68,136,255,0.5)');
  ai = createWrestler(CX + 60, CY, '#f80', 'rgba(255,136,0,0.5)');
  particles = [];
  ringPulse = 0;
  roundState = 'ready';
  roundTimer = 60;
  roundMessage = 'Round ' + currentRound;
  aiDecisionTimer = 0;
  aiTarget = { x: CX, y: CY };
  aiWantCharge = false;
  aiWantPush = false;
  aiWantDodge = false;
}

// ── Drawing helpers ──

function approxCirclePoly(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// Build a thick arc as a triangle strip polygon
function buildArcPoly(cx, cy, r, startAngle, endAngle, lineWidth, segments) {
  const pts = [];
  const ri = r - lineWidth / 2;
  const ro = r + lineWidth / 2;
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (i / segments) * (endAngle - startAngle);
    pts.push({ x: cx + Math.cos(a) * ro, y: cy + Math.sin(a) * ro });
  }
  for (let i = segments; i >= 0; i--) {
    const a = startAngle + (i / segments) * (endAngle - startAngle);
    pts.push({ x: cx + Math.cos(a) * ri, y: cy + Math.sin(a) * ri });
  }
  return pts;
}

function drawRing(renderer) {
  const pulseSize = ringPulse > 0 ? Math.sin(ringPulse * 0.5) * 5 : 0;

  // Outer glow halo (filled circles at different radii with alpha)
  renderer.setGlow('#f80', 0.3);
  renderer.fillCircle(CX, CY, RING_RADIUS + 20 + pulseSize, '#f8440008');
  renderer.fillCircle(CX, CY, RING_RADIUS + 10 + pulseSize, '#f8440012');
  renderer.setGlow(null);

  // Ring floor — dark brown circle
  renderer.fillCircle(CX, CY, RING_RADIUS, '#3a3020');

  // Edge danger zone (red tinted ring)
  const dangerPoly = buildArcPoly(CX, CY, RING_RADIUS - RING_EDGE_ZONE / 2, 0, Math.PI * 2, RING_EDGE_ZONE, 64);
  renderer.fillPoly(dangerPoly, '#ff330214');

  // Center cross lines
  renderer.drawLine(CX - 30, CY, CX + 30, CY, '#f8801a', 1.5);
  renderer.drawLine(CX, CY - 30, CX, CY + 30, '#f8801a', 1.5);

  // Inner ring subtle border (lineWidth=2, 64 segments)
  renderer.fillPoly(buildArcPoly(CX, CY, RING_RADIUS - 8, 0, Math.PI * 2, 2, 64), '#f8440033');

  // Ring border (tawara rope) with glow
  renderer.setGlow('#f80', 0.6 + pulseSize * 0.03);
  const borderPoly = buildArcPoly(CX, CY, RING_RADIUS, 0, Math.PI * 2, 80, 4);
  renderer.fillPoly(borderPoly, '#ff8800');
  renderer.setGlow(null);
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbHex(r, g, b, a) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  if (a !== undefined) {
    return '#' + toHex(r) + toHex(g) + toHex(b) + toHex(a * 255);
  }
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function darkenHex(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return rgbHex(r * factor, g * factor, b * factor);
}

function drawWrestler(renderer, text, w, isPlayer) {
  // Shadow (dark ellipse below)
  renderer.fillCircle(w.x + 2, w.y + 4, w.radius * 0.75, '#00000050');

  // Dodge transparency — use low-alpha color variants
  const alphaHex = w.isDodging ? '66' : 'ff';
  const bodyAlphaHex = w.isDodging ? '4d' : 'ff';

  // Charge glow
  if (w.isCharging && w.charge > 10) {
    const glowR = w.radius * 2 * (w.charge / MAX_CHARGE);
    renderer.setGlow(w.color, 0.8);
    renderer.fillCircle(w.x, w.y, glowR, w.color + '26'); // 0x26 = ~15% alpha
    renderer.setGlow(null);
  }

  // Body — three concentric circles to fake a radial gradient
  const bodyColor = w.flashTimer > 0 ? '#ffffff' : w.color;
  const darkColor = darkenHex(w.color === '#ffffff' ? '#aaaaaa' : w.color, 0.5);

  renderer.setGlow(w.color, w.isCharging ? 0.6 + w.charge * 0.003 : 0.4);
  renderer.fillCircle(w.x, w.y, w.radius, darkColor + alphaHex);
  renderer.fillCircle(w.x - 2, w.y - 2, w.radius * 0.7, bodyColor + alphaHex);
  renderer.fillCircle(w.x - 5, w.y - 5, w.radius * 0.35, '#ffffff' + alphaHex);
  renderer.setGlow(null);

  // Inner belly circle
  const { r: br, g: bg, b: bb } = hexToRgb(w.color);
  const bellyAlpha = w.isDodging ? 0.3 : 0.6;
  renderer.fillCircle(w.x, w.y, w.radius * 0.55, rgbHex(br, bg, bb, bellyAlpha));

  // Belt (mawashi arc)
  const opponent = isPlayer ? ai : player;
  const facing = Math.atan2(opponent.y - w.y, opponent.x - w.x);
  const beltColor = w.isCharging ? '#ffff00' : (isPlayer ? '#2266cc' : '#cc6600');
  const beltPoly = buildArcPoly(w.x, w.y, w.radius * 0.7, facing - 1.2, facing + 1.2, 4, 16);
  renderer.fillPoly(beltPoly, beltColor + alphaHex);

  // Eyes
  const eyeDist = w.radius * 0.35;
  const eyeSize = 3;
  const ex1 = w.x + Math.cos(facing - 0.3) * eyeDist;
  const ey1 = w.y + Math.sin(facing - 0.3) * eyeDist;
  const ex2 = w.x + Math.cos(facing + 0.3) * eyeDist;
  const ey2 = w.y + Math.sin(facing + 0.3) * eyeDist;
  renderer.fillCircle(ex1, ey1, eyeSize, '#111111' + alphaHex);
  renderer.fillCircle(ex2, ey2, eyeSize, '#111111' + alphaHex);

  // Angry eyebrows when charging
  if (w.isCharging) {
    renderer.drawLine(ex1 - 4, ey1 - 5, ex1 + 4, ey1 - 3, '#111111', 2);
    renderer.drawLine(ex2 - 4, ey2 - 3, ex2 + 4, ey2 - 5, '#111111', 2);
  }

  // Stun stars
  if (w.stunTimer > 0) {
    const starT = performance.now() * 0.005;
    for (let i = 0; i < 3; i++) {
      const angle = starT + (i * Math.PI * 2 / 3);
      const sx = w.x + Math.cos(angle) * (w.radius + 8);
      const sy = w.y - w.radius * 0.5 + Math.sin(angle) * 5;
      text.drawText('*', sx - 3, sy - 6, 12, '#ffff00', 'center');
    }
  }

  // Stamina bar
  const barW = w.radius * 2;
  const barH = 4;
  const barX = w.x - barW / 2;
  const barY = w.y - w.radius - 14;
  renderer.fillRect(barX - 1, barY - 1, barW + 2, barH + 2, '#222222');
  renderer.fillRect(barX, barY, barW, barH, '#333333');
  const staminaRatio = w.stamina / MAX_STAMINA;
  const staminaColor = staminaRatio > 0.5 ? '#00cc00' : (staminaRatio > 0.25 ? '#ffff00' : '#ff0000');
  renderer.fillRect(barX, barY, barW * staminaRatio, barH, staminaColor);

  // Charge bar
  if (w.charge > 0) {
    const cBarY = barY - 7;
    renderer.fillRect(barX - 1, cBarY - 1, barW + 2, barH + 2, '#222222');
    renderer.fillRect(barX, cBarY, barW, barH, '#333333');
    renderer.setGlow('#f80', 0.5);
    renderer.fillRect(barX, cBarY, barW * (w.charge / MAX_CHARGE), barH, '#ff8800');
    renderer.setGlow(null);
  }

  // Label
  text.drawText(isPlayer ? 'YOU' : 'CPU', w.x, w.y + w.radius + 5, 10, '#888888', 'center');
}

function drawPushIndicator(renderer, w) {
  if (!w.isPushing) return;
  const px = w.x + w.pushDirX * w.radius * 1.8;
  const py = w.y + w.pushDirY * w.radius * 1.8;
  renderer.setGlow('#ffffff', 0.6);
  renderer.drawLine(w.x + w.pushDirX * w.radius, w.y + w.pushDirY * w.radius, px, py, '#ffffff', 3);
  // Arrowhead
  const aSize = 8;
  const aAngle = Math.atan2(w.pushDirY, w.pushDirX);
  renderer.drawLine(px, py,
    px - Math.cos(aAngle - 0.4) * aSize, py - Math.sin(aAngle - 0.4) * aSize,
    '#ffffff', 2);
  renderer.drawLine(px, py,
    px - Math.cos(aAngle + 0.4) * aSize, py - Math.sin(aAngle + 0.4) * aSize,
    '#ffffff', 2);
  renderer.setGlow(null);
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    renderer.setGlow(p.color, 0.3);
    renderer.fillCircle(p.x, p.y, p.size * alpha, p.color + alphaHex);
  }
  renderer.setGlow(null);
}

function drawHUD(renderer, text) {
  // Round countdown
  if (roundState === 'ready') {
    renderer.setGlow('#f80', 0.8);
    text.drawText(roundMessage, CX, CY - 85, 24, '#ff8800', 'center');
    renderer.setGlow(null);
    if (roundTimer < 40) {
      const scale = 1 + (40 - roundTimer) * 0.02;
      const fontSize = Math.floor(42 * scale);
      renderer.setGlow('#ffffff', 0.8);
      text.drawText('FIGHT!', CX, CY - 10, fontSize, '#ffffff', 'center');
      renderer.setGlow(null);
    }
  }

  // Round end message
  if (roundState === 'roundEnd') {
    renderer.setGlow('#ffffff', 0.8);
    text.drawText(roundMessage, CX, 20, 32, '#ffffff', 'center');
    renderer.setGlow(null);
    text.drawText(playerWins + ' - ' + aiWins, CX, 58, 16, '#aaaaaa', 'center');
  }

  // Win dots
  const dotY = 16;
  const dotSpacing = 16;
  const dotBaseX = CX;
  for (let i = 0; i < 3; i++) {
    // Player dots (left)
    const playerDotColor = i < playerWins ? '#4488ff' : '#333333';
    if (i < playerWins) renderer.setGlow('#4488ff', 0.6);
    renderer.fillCircle(dotBaseX - 50 + i * dotSpacing, dotY, 5, playerDotColor);
    renderer.setGlow(null);

    // AI dots (right)
    const aiDotColor = i < aiWins ? '#ff8800' : '#333333';
    if (i < aiWins) renderer.setGlow('#f80', 0.6);
    renderer.fillCircle(dotBaseX + 20 + i * dotSpacing, dotY, 5, aiDotColor);
    renderer.setGlow(null);
  }

  // VS text
  text.drawText('VS', dotBaseX - 10, dotY - 6, 9, '#555555', 'center');
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    playerWins = 0;
    aiWins = 0;
    currentRound = 1;
    if (scoreEl) scoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    if (roundInfoEl) roundInfoEl.textContent = 'Best of 5';
    initRound();
    game.showOverlay('SUMO PUSH', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    const input = game.input;

    if (game.state === 'waiting') {
      // Any key starts the game
      const startKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'z', 'Z', 'x', 'X', 'Enter'];
      for (const k of startKeys) {
        if (input.wasPressed(k)) {
          score = 0;
          playerWins = 0;
          aiWins = 0;
          currentRound = 1;
          if (scoreEl) scoreEl.textContent = '0';
          if (aiScoreEl) aiScoreEl.textContent = '0';
          initRound();
          game.setState('playing');
          return;
        }
      }
      return;
    }

    if (game.state === 'over') {
      const restartKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'z', 'Z', 'x', 'X'];
      for (const k of restartKeys) {
        if (input.wasPressed(k)) {
          score = 0;
          playerWins = 0;
          aiWins = 0;
          currentRound = 1;
          if (scoreEl) scoreEl.textContent = '0';
          if (aiScoreEl) aiScoreEl.textContent = '0';
          initRound();
          game.setState('playing');
          return;
        }
      }
      return;
    }

    // Playing
    if (roundState === 'ready') {
      roundTimer--;
      if (roundTimer <= 0) {
        roundState = 'fighting';
      }
      // Update particles during countdown too
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.95; p.vy *= 0.95;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (ringPulse > 0) ringPulse--;
      return;
    }

    if (roundState === 'roundEnd') {
      roundEndTimer--;
      if (roundEndTimer <= 0) {
        if (playerWins >= 3 || aiWins >= 3) {
          roundState = 'matchEnd';
          game.setState('over');
          if (playerWins >= 3) {
            game.showOverlay('YOU WIN!', playerWins + '-' + aiWins + ' | Press any key to restart');
          } else {
            game.showOverlay('CPU WINS', aiWins + '-' + playerWins + ' | Press any key to restart');
          }
          return;
        }
        currentRound++;
        initRound();
        game.setState('playing');
      }
      // Update particles during round end
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.95; p.vy *= 0.95;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (ringPulse > 0) ringPulse--;
      return;
    }

    // Fighting
    handlePlayerInput(input);
    updateAI();
    moveWrestler(player);
    moveWrestler(ai);
    constrainToRing(player);
    constrainToRing(ai);
    collideWrestlers(player, ai);

    // Check ring out
    if (isOutOfRing(player)) {
      aiWins++;
      if (aiScoreEl) aiScoreEl.textContent = aiWins;
      roundMessage = 'CPU scores!';
      roundState = 'roundEnd';
      roundEndTimer = 90;
      spawnParticles(player.x, player.y, player.color, 20, 5);
      ringPulse = 20;
    } else if (isOutOfRing(ai)) {
      playerWins++;
      score = playerWins;
      if (scoreEl) scoreEl.textContent = playerWins;
      roundMessage = 'You score!';
      roundState = 'roundEnd';
      roundEndTimer = 90;
      spawnParticles(ai.x, ai.y, ai.color, 20, 5);
      ringPulse = 20;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (ringPulse > 0) ringPulse--;
    if (roundInfoEl) roundInfoEl.textContent = 'Round ' + currentRound + ' / Best of 5';
  };

  game.onDraw = (renderer, text) => {
    // Background — handled by renderer.begin() default '#1a1a2e'
    // Subtle warm radial hint around ring
    renderer.fillCircle(CX, CY, RING_RADIUS + 30, '#ff880006');

    drawRing(renderer);
    drawParticles(renderer);

    if (roundState !== 'matchEnd') {
      drawPushIndicator(renderer, player);
      drawPushIndicator(renderer, ai);
      drawWrestler(renderer, text, ai, false);
      drawWrestler(renderer, text, player, true);
    }

    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
