// nidhogg-like/game.js — Nidhogg-like ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 300;
const GROUND = 235;
const GRAVITY = 0.55;
const SCREEN_W = 600;
const TOTAL_SCREENS = 9;
const WORLD_LEFT = -4 * SCREEN_W;
const WORLD_RIGHT = 4 * SCREEN_W + SCREEN_W;

const STANCE_HIGH = 0, STANCE_MID = 1, STANCE_LOW = 2;
const SWORD_RANGE = 48;
const FIST_RANGE = 22;
const SWORD_THROW_SPEED = 11;

const p1ScoreEl = document.getElementById('p1Score');
const p2ScoreEl = document.getElementById('p2Score');
const screenPosEl = document.getElementById('screenPos');

let kills1, kills2, score;
let p1, p2, cameraX, roundTimer, respawnTimer;
let winner, particles, enGardeTimer, flashTimer;
let droppedSwords = [];

// ─── Fighter ─────────────────────────────────────────────────────────────────

class Fighter {
  constructor(x, facing, isAI) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.isAI = isAI;
    this.hasSword = true;
    this.stance = STANCE_MID;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackStance = STANCE_MID;
    this.attackHitRegistered = false;
    this.blocking = false;
    this.dead = false;
    this.deathTimer = 0;
    this.onGround = true;
    this.runSpeed = 3.2;
    this.color = isAI ? '#ff5555' : '#ffcc00';
    this.throwCooldown = 0;
    this.thrownSword = null;
    this.stunTimer = 0;
    this.advancing = false;
    this.advanceTimer = 0;
    this.goalDir = isAI ? -1 : 1;
    // AI
    this.aiTimer = 0;
    this.aiDecision = null;
  }

  reset(x, facing) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hasSword = true;
    this.stance = STANCE_MID;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackHitRegistered = false;
    this.blocking = false;
    this.dead = false;
    this.deathTimer = 0;
    this.onGround = true;
    this.thrownSword = null;
    this.throwCooldown = 0;
    this.stunTimer = 0;
    this.advancing = false;
    this.advanceTimer = 0;
    this.aiTimer = 0;
    this.aiDecision = null;
  }

  get weaponRange() { return this.hasSword ? SWORD_RANGE : FIST_RANGE; }

  attack(stance) {
    if (this.attacking || this.stunTimer > 0 || this.dead) return;
    this.attacking = true;
    this.attackTimer = 14;
    this.attackStance = stance;
    this.attackHitRegistered = false;
    this.blocking = false;
  }

  throwSword(opponent) {
    if (!this.hasSword || this.attacking || this.throwCooldown > 0 || this.stunTimer > 0 || this.dead) return;
    this.hasSword = false;
    this.throwCooldown = 40;
    this.thrownSword = {
      x: this.x + this.facing * 18,
      y: this.y - 22,
      vx: this.facing * SWORD_THROW_SPEED,
      vy: -0.5,
      active: true,
      stance: this.stance
    };
  }

  update() {
    if (this.dead) {
      this.deathTimer++;
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      return;
    }

    if (this.stunTimer > 0) {
      this.stunTimer--;
      this.vx *= 0.85;
    }

    if (this.attackTimer > 0) {
      this.attackTimer--;
      if (this.attackTimer === 0) this.attacking = false;
    }

    if (this.throwCooldown > 0) this.throwCooldown--;

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y >= GROUND) {
      this.y = GROUND;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.x = Math.max(WORLD_LEFT + 20, Math.min(WORLD_RIGHT - 20, this.x));

    if (this.onGround && this.stunTimer <= 0 && !this.advancing) {
      this.vx *= 0.75;
    }

    if (this.thrownSword && this.thrownSword.active) {
      this.thrownSword.x += this.thrownSword.vx;
      this.thrownSword.y += this.thrownSword.vy;
      this.thrownSword.vy += 0.03;
      if (Math.abs(this.thrownSword.x - this.x) > 900) {
        droppedSwords.push({ x: this.thrownSword.x, y: GROUND - 5 });
        this.thrownSword.active = false;
      }
      if (this.thrownSword.y > GROUND) {
        droppedSwords.push({ x: this.thrownSword.x, y: GROUND - 5 });
        this.thrownSword.active = false;
      }
    }
  }
}

// ─── Combat helpers ───────────────────────────────────────────────────────────

function checkHit(attacker, defender) {
  if (!attacker.attacking || defender.dead || attacker.dead) return false;
  if (attacker.attackHitRegistered) return false;
  if (attacker.attackTimer < 4 || attacker.attackTimer > 8) return false;

  const dx = defender.x - attacker.x;
  const dist = Math.abs(dx);
  const inFront = (dx * attacker.facing) > 0;
  if (!inFront || dist > attacker.weaponRange + 12) return false;

  const dy = Math.abs(defender.y - attacker.y);
  if (dy > 35) return false;

  if (defender.blocking && !defender.attacking) {
    if (defender.stance === attacker.attackStance) {
      attacker.stunTimer = 18;
      attacker.vx = -attacker.facing * 4;
      attacker.attackHitRegistered = true;
      spawnParticles((attacker.x + defender.x) / 2, attacker.y - 22, '#ffffff', 6);
      return false;
    }
  }

  if (defender.attacking && !defender.attackHitRegistered &&
      defender.attackTimer >= 4 && defender.attackTimer <= 8 &&
      defender.attackStance === attacker.attackStance) {
    attacker.stunTimer = 14;
    defender.stunTimer = 14;
    attacker.vx = -attacker.facing * 5;
    defender.vx = -defender.facing * 5;
    attacker.attackHitRegistered = true;
    defender.attackHitRegistered = true;
    spawnParticles((attacker.x + defender.x) / 2, attacker.y - 22, '#ffffff', 10);
    if (Math.random() < 0.2) {
      const victim = Math.random() < 0.5 ? attacker : defender;
      if (victim.hasSword) {
        victim.hasSword = false;
        droppedSwords.push({ x: (attacker.x + defender.x) / 2, y: GROUND - 5 });
      }
    }
    return false;
  }

  attacker.attackHitRegistered = true;
  return true;
}

function checkThrownSwordHit(sword, target) {
  if (!sword || !sword.active || target.dead) return false;
  const dx = Math.abs(sword.x - target.x);
  const dy = Math.abs(sword.y - (target.y - 22));
  if (dx < 16 && dy < 22) {
    if (target.blocking) {
      sword.active = false;
      if (!target.hasSword) target.hasSword = true;
      spawnParticles(sword.x, sword.y, '#ffffff', 6);
      return false;
    }
    return true;
  }
  return false;
}

function killFighter(victim, killer) {
  victim.dead = true;
  victim.deathTimer = 0;
  victim.vy = -9;
  victim.vx = (victim.x < killer.x ? -4 : 4);

  if (killer === p1) {
    kills1++;
    score = kills1;
  } else {
    kills2++;
  }

  spawnParticles(victim.x, victim.y - 20, victim.color, 18);
  spawnParticles(victim.x, victim.y - 20, '#cc0000', 12);

  if (victim.hasSword) droppedSwords.push({ x: victim.x, y: GROUND - 5 });

  killer.advancing = true;
  killer.advanceTimer = 70;
  killer.facing = killer.goalDir;

  flashTimer = 15;
  respawnTimer = 100;
  updateUI();
}

function respawn() {
  const alive = p1.dead ? p2 : p1;
  const dead = p1.dead ? p1 : p2;
  let spawnX = alive.x + alive.goalDir * 280;
  spawnX = Math.max(WORLD_LEFT + 50, Math.min(WORLD_RIGHT - 50, spawnX));
  dead.reset(spawnX, dead === p1 ? 1 : -1);
  dead.facing = dead.x < alive.x ? 1 : -1;
  alive.advancing = false;
  alive.advanceTimer = 0;
  enGardeTimer = 50;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 7 - 2,
      life: 20 + Math.random() * 25,
      color,
      size: 1.5 + Math.random() * 3
    });
  }
}

function updateUI() {
  if (p1ScoreEl) p1ScoreEl.textContent = kills1;
  if (p2ScoreEl) p2ScoreEl.textContent = kills2;
  const leaderX = p1.dead ? p2.x : (p2.dead ? p1.x : (p1.x + p2.x) / 2);
  if (screenPosEl) screenPosEl.textContent = Math.round(leaderX / SCREEN_W);
}

function checkWinCondition() {
  if (p1.x >= WORLD_RIGHT - 50 && !p1.dead) { winner = 'P1'; return true; }
  if (p2.x <= WORLD_LEFT + 50 && !p2.dead) { winner = 'AI'; return true; }
  return false;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function updateAI(ai, player) {
  if (ai.dead || ai.stunTimer > 0) return;

  const dx = player.x - ai.x;
  const dist = Math.abs(dx);
  ai.facing = dx > 0 ? 1 : -1;

  // React to thrown sword
  if (player.thrownSword && player.thrownSword.active) {
    const sw = player.thrownSword;
    const sDist = Math.abs(sw.x - ai.x);
    const approaching = (sw.vx > 0 && sw.x < ai.x) || (sw.vx < 0 && sw.x > ai.x);
    if (sDist < 180 && approaching) {
      ai.blocking = true;
      ai.stance = sw.stance;
      if (Math.random() < 0.2 && ai.onGround && sDist < 100) {
        ai.vy = -11;
        ai.blocking = false;
      }
      return;
    }
  }

  // React to player attacks
  if (player.attacking && player.attackTimer >= 4 && dist < 90) {
    if (Math.random() < 0.65) {
      ai.blocking = true;
      ai.stance = player.attackStance;
      ai.aiTimer = 8;
      return;
    } else if (Math.random() < 0.3 && ai.onGround) {
      ai.vy = -11;
      ai.vx = -ai.facing * 2;
      return;
    }
  }

  ai.aiTimer--;
  if (ai.aiTimer > 0) {
    if (ai.blocking) ai.vx *= 0.4;
    return;
  }

  ai.aiTimer = 6 + Math.floor(Math.random() * 10);
  ai.blocking = false;

  if (ai.advancing) {
    ai.vx = ai.goalDir * ai.runSpeed * 1.2;
    return;
  }

  // Pick up sword
  if (!ai.hasSword) {
    let closest = null, closestDist = Infinity;
    for (const s of droppedSwords) {
      const d = Math.abs(s.x - ai.x);
      if (d < closestDist) { closestDist = d; closest = s; }
    }
    if (closest && closestDist < 40) {
      ai.hasSword = true;
      droppedSwords.splice(droppedSwords.indexOf(closest), 1);
    } else if (closest && closestDist < 200) {
      ai.vx = (closest.x > ai.x ? 1 : -1) * ai.runSpeed;
      return;
    }
  }

  if (dist < 55) {
    const r = Math.random();
    if (r < 0.12 && ai.hasSword) {
      ai.throwSword(player);
    } else if (r < 0.65) {
      const stances = [STANCE_HIGH, STANCE_MID, STANCE_LOW];
      const choices = player.blocking ? stances.filter(s => s !== player.stance) : stances;
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      ai.stance = chosen;
      ai.attack(chosen);
    } else if (r < 0.85) {
      ai.blocking = true;
      ai.stance = [STANCE_HIGH, STANCE_MID, STANCE_LOW][Math.floor(Math.random() * 3)];
      ai.aiTimer = 10 + Math.floor(Math.random() * 8);
    } else {
      ai.vx = -ai.facing * ai.runSpeed;
    }
  } else if (dist < 130) {
    const r = Math.random();
    if (r < 0.5) {
      ai.vx = ai.facing * ai.runSpeed * 0.7;
    } else if (r < 0.65 && ai.hasSword) {
      ai.throwSword(player);
    } else if (r < 0.8) {
      ai.blocking = true;
      ai.stance = [STANCE_HIGH, STANCE_MID, STANCE_LOW][Math.floor(Math.random() * 3)];
      ai.vx = ai.facing * ai.runSpeed * 0.4;
    } else {
      ai.vx = ai.facing * ai.runSpeed * 1.3;
      const s = [STANCE_HIGH, STANCE_MID, STANCE_LOW][Math.floor(Math.random() * 3)];
      ai.stance = s;
      ai.attack(s);
    }
  } else {
    ai.blocking = false;
    ai.vx = ai.facing * ai.runSpeed * 1.1;
    if (Math.random() < 0.08 && ai.onGround) ai.vy = -11;
  }

  if (!ai.blocking && !ai.attacking && dist > 55) {
    ai.vx += ai.facing * 0.2;
    ai.vx = Math.max(-ai.runSpeed, Math.min(ai.runSpeed, ai.vx));
  }
  if (ai.blocking) ai.vx *= 0.4;
}

// ─── Player input ─────────────────────────────────────────────────────────────

function updatePlayer(p, opponent, input) {
  if (p.dead || p.stunTimer > 0) return;

  if (p.advancing) {
    p.vx = p.goalDir * p.runSpeed * 1.2;
    p.advanceTimer--;
    if (p.advanceTimer <= 0) p.advancing = false;
    return;
  }

  let moveX = 0;
  if (input.isDown('ArrowLeft'))  moveX -= 1;
  if (input.isDown('ArrowRight')) moveX += 1;

  if (!p.blocking && !p.attacking) {
    p.vx = moveX * p.runSpeed;
    if (moveX !== 0) p.facing = moveX;
  } else if (p.blocking) {
    p.vx = moveX * p.runSpeed * 0.3;
  }

  if (input.wasPressed('ArrowUp') && p.onGround && !p.attacking) {
    p.vy = -11;
  }

  p.blocking = false;
  if (input.isDown('KeyS')) {
    p.blocking = true;
  }

  if (p.blocking) {
    if (input.isDown('ArrowUp')) p.stance = STANCE_HIGH;
    else if (input.isDown('ArrowDown')) p.stance = STANCE_LOW;
  }

  if (input.wasPressed('KeyZ')) { p.stance = STANCE_HIGH; p.attack(STANCE_HIGH); }
  if (input.wasPressed('KeyX')) { p.stance = STANCE_MID;  p.attack(STANCE_MID);  }
  if (input.wasPressed('KeyC')) { p.stance = STANCE_LOW;  p.attack(STANCE_LOW);  }
  if (input.wasPressed('KeyD')) { p.throwSword(opponent); }

  if (!p.hasSword) {
    for (let i = droppedSwords.length - 1; i >= 0; i--) {
      if (Math.abs(droppedSwords[i].x - p.x) < 30) {
        p.hasSword = true;
        droppedSwords.splice(i, 1);
        break;
      }
    }
  }
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

// Polyhex builder — returns {x,y}[]
function buildPoly(cx, cy, verts) {
  return verts.map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }));
}

function drawBackground(renderer, text, camX) {
  renderer.fillRect(0, 0, W, H, '#0a0a1e');

  // Far background vertical lines
  for (let px = WORLD_LEFT; px < WORLD_RIGHT; px += 80) {
    const sx = px - camX * 0.3 + W / 2;
    if (sx > -5 && sx < W + 5) {
      renderer.drawLine(sx, 0, sx, GROUND + 20, '#fc000008', 1);
    }
  }

  // Ground fill
  renderer.fillRect(0, GROUND + 18, W, H - GROUND, '#151530');

  // Ground glow strip — simulate gradient with two rects
  renderer.fillRect(0, GROUND + 12, W, 5,  '#fc000060');
  renderer.fillRect(0, GROUND + 17, W, 5,  '#fc000020');

  // Ground line
  renderer.drawLine(0, GROUND + 16, W, GROUND + 16, '#fc000066', 2);

  // Screen dividers (dashed)
  for (let s = -4; s <= 4; s++) {
    const sx = s * SCREEN_W - camX + W / 2;
    if (sx > -10 && sx < W + 10) {
      renderer.dashedLine(sx, 30, sx, GROUND + 16, '#fc00001a', 1, 5, 10);
    }
  }

  // Pillars
  for (let px = WORLD_LEFT + 100; px < WORLD_RIGHT; px += 300) {
    const sx = px - camX + W / 2;
    if (sx > -20 && sx < W + 20) {
      renderer.fillRect(sx - 4,  GROUND - 40, 8,  56, '#fc00000a');
      renderer.fillRect(sx - 10, GROUND - 42, 20, 4,  '#fc00000a');
      renderer.fillRect(sx - 8,  GROUND + 14, 16, 4,  '#fc00000a');
    }
  }

  // AI win zone (left)
  const leftZX = WORLD_LEFT - camX + W / 2;
  if (leftZX > -80 && leftZX < W + 80) {
    renderer.fillRect(leftZX, 0, 60, GROUND + 16, '#ff55551f');
    renderer.strokePoly([
      { x: leftZX, y: 0 }, { x: leftZX + 60, y: 0 },
      { x: leftZX + 60, y: GROUND + 16 }, { x: leftZX, y: GROUND + 16 }
    ], '#f5556b', 2, true);
    text.drawText('AI GOAL', leftZX + 30, 13, 11, '#f55', 'center');
  }

  // P1 win zone (right)
  const rightZX = WORLD_RIGHT - 50 - camX + W / 2;
  if (rightZX > -80 && rightZX < W + 80) {
    renderer.fillRect(rightZX, 0, 50, GROUND + 16, '#ffcc001f');
    renderer.strokePoly([
      { x: rightZX, y: 0 }, { x: rightZX + 50, y: 0 },
      { x: rightZX + 50, y: GROUND + 16 }, { x: rightZX, y: GROUND + 16 }
    ], '#fc006b', 2, true);
    text.drawText('P1 GOAL', rightZX + 25, 13, 11, '#fc0', 'center');
  }

  // Direction arrows
  text.drawText('P1 \u2192', 8, 6, 13, '#fc0', 'left');
  text.drawText('\u2190 AI', W - 8, 6, 13, '#f55', 'right');
}

function drawDroppedSwords(renderer, camX) {
  for (const s of droppedSwords) {
    const sx = s.x - camX + W / 2;
    if (sx < -20 || sx > W + 20) continue;
    // Blade
    renderer.drawLine(sx - 10, s.y + 12, sx + 10, s.y + 12, '#aaa', 2);
    // Guard / handle
    renderer.drawLine(sx - 1, s.y + 9, sx - 1, s.y + 15, '#666', 3);
  }
}

function drawFighter(renderer, text, f, camX, frameCount) {
  const sx = f.x - camX + W / 2;
  const sy = f.y;
  if (sx < -60 || sx > W + 60) return;

  // Death rotation — precompute with trig
  let drawSX = sx;
  let drawSY = sy - 20;
  let rotSin = 0, rotCos = 1;

  if (f.dead) {
    const angle = f.deathTimer * 0.1 * (f.vx > 0 ? 1 : -1);
    rotSin = Math.sin(angle);
    rotCos = Math.cos(angle);
  }

  const alpha = f.dead ? Math.max(0, 1 - f.deathTimer / 50) : 1;
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

  const dir = f.facing;

  let color = f.color;
  if (f.stunTimer > 0 && Math.floor(f.stunTimer / 2) % 2 === 0) color = '#ffffff';
  if (f.blocking) color = f.isAI ? '#cc4444' : '#ddaa00';

  const col = color + alphaHex;

  // Pivot for rotation is (sx, sy-20)
  function rotPt(dx, dy) {
    return {
      x: drawSX + dx * rotCos - dy * rotSin,
      y: drawSY + dx * rotSin + dy * rotCos,
    };
  }

  // Key bone positions relative to pivot (sx, sy-20)
  // pivot IS (sx, sy-20), so:
  //   headY = sy - 38  → offset from pivot = -18
  //   neckY = sy - 32  → offset from pivot = -12
  //   hipY  = sy - 8   → offset from pivot = +12
  //   armY  = sy - 24  → offset from pivot = -4
  //   feetY = sy + 14  → offset from pivot = +34

  const headR  = rotPt(0, -18);
  const neckR  = rotPt(0, -12);
  const hipR   = rotPt(0,  12);
  const armR   = rotPt(0,  -4);

  // Leg animation
  let legA = 0;
  if (Math.abs(f.vx) > 0.8 && f.onGround && !f.dead) {
    legA = Math.sin(frameCount * (Math.PI / 30)) * 8;
  }

  const lFoot  = rotPt(legA,  34);
  const rFoot  = rotPt(-legA, 34);
  const backArm = rotPt(-dir * 7, 2);

  // Weapon stance
  const weaponStance = f.attacking ? f.attackStance : f.stance;
  const swordTipDY = weaponStance === STANCE_HIGH ? -22 : weaponStance === STANCE_MID ? -6 : 6;

  let ext = 10;
  if (f.attacking && f.attackTimer >= 4 && f.attackTimer <= 8) ext = 26;
  else if (f.attacking) ext = 16;
  if (f.blocking) ext = 8;

  const armTip  = rotPt(dir * ext,        swordTipDY);
  const swordTip= rotPt(dir * (ext + 28), swordTipDY);
  const guardA  = rotPt(dir * ext,        swordTipDY - 4);
  const guardB  = rotPt(dir * ext,        swordTipDY + 4);

  // Head (circle)
  renderer.setGlow(color, 0.3);
  renderer.fillCircle(headR.x, headR.y, 5, col);

  // Torso
  renderer.drawLine(neckR.x, neckR.y, hipR.x, hipR.y, col, 2.5);

  // Legs
  renderer.drawLine(hipR.x, hipR.y, lFoot.x, lFoot.y, col, 2.5);
  renderer.drawLine(hipR.x, hipR.y, rFoot.x, rFoot.y, col, 2.5);

  // Back arm
  renderer.drawLine(armR.x, armR.y, backArm.x, backArm.y, col, 2.5);

  // Front arm
  renderer.drawLine(armR.x, armR.y, armTip.x, armTip.y, col, 2.5);

  // Weapon
  const isActive = f.attacking && f.attackTimer >= 4 && f.attackTimer <= 8;
  if (f.hasSword) {
    const wCol = isActive ? '#ffffff' + alphaHex : col;
    const wWidth = isActive ? 3.5 : 2;
    if (isActive) renderer.setGlow(color, 0.8);
    renderer.drawLine(armTip.x, armTip.y, swordTip.x, swordTip.y, wCol, wWidth);
    renderer.setGlow(null);
    // Guard
    renderer.drawLine(guardA.x, guardA.y, guardB.x, guardB.y, '#888888' + alphaHex, 3);
  } else {
    // Fist
    const fistX = rotPt(dir * (ext + 6), swordTipDY);
    if (isActive) {
      renderer.setGlow(color, 0.8);
      renderer.fillCircle(fistX.x, fistX.y, 4, '#ffffff' + alphaHex);
      renderer.setGlow(null);
    } else {
      renderer.fillCircle(fistX.x, fistX.y, 2.5, col);
    }
  }

  // Block shield (dashed vertical line)
  if (f.blocking) {
    const shA = rotPt(dir * 10, swordTipDY - 14);
    const shB = rotPt(dir * 10, swordTipDY + 14);
    renderer.dashedLine(shA.x, shA.y, shB.x, shB.y, '#ffffff59', 2, 4, 3);
    // Stance label
    const stanceLabelPt = rotPt(dir * 10, swordTipDY - 21);
    text.drawText(['H', 'M', 'L'][f.stance], stanceLabelPt.x, stanceLabelPt.y - 7, 7, '#ffffff66', 'center');
  }

  renderer.setGlow(null);

  // Name label above head
  renderer.setGlow(color, 0.5);
  text.drawText(f.isAI ? 'AI' : 'P1', headR.x, headR.y - 18, 10, col, 'center');
  renderer.setGlow(null);

  // Disarmed indicator
  if (!f.hasSword && !f.dead) {
    text.drawText('UNARMED', sx, sy + 26, 7, '#888', 'center');
  }
}

function drawThrownSword(renderer, sword, camX, color, frameCount) {
  if (!sword || !sword.active) return;
  const sx = sword.x - camX + W / 2;
  const sy = sword.y;
  if (sx < -30 || sx > W + 30) return;

  const dir = sword.vx > 0 ? 1 : -1;
  // Rotate — use frame count to animate spin
  const rot = (frameCount / 60) * Math.PI * 2 * dir;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  const a = { x: sx + cosR * -14, y: sy + sinR * -14 };
  const b = { x: sx + cosR *  14, y: sy + sinR *  14 };
  const ga = { x: sx + cosR * -2 + sinR * -3, y: sy + sinR * -2 - cosR * -3 };
  const gb = { x: sx + cosR * -2 + sinR *  3, y: sy + sinR * -2 - cosR *  3 };

  renderer.setGlow(color, 0.6);
  renderer.drawLine(a.x, a.y, b.x, b.y, color, 2.5);
  renderer.setGlow(null);
  renderer.drawLine(ga.x, ga.y, gb.x, gb.y, '#888', 3);
}

function drawParticles(renderer, camX) {
  for (const p of particles) {
    const sx = p.x - camX + W / 2;
    if (sx < -10 || sx > W + 10) continue;
    const a = Math.min(1, p.life / 25);
    const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
    renderer.fillCircle(sx, p.y, p.size, p.color + aHex);
  }
}

function drawProgressBar(renderer, text) {
  const barY = H - 18;
  const barW = W - 60;
  const barH = 6;
  const barX = 30;

  renderer.fillRect(barX, barY, barW, barH, '#ffffff0f');

  // Center tick
  renderer.fillRect(barX + barW / 2 - 1, barY - 3, 2, barH + 6, '#555');

  // Goal zones
  renderer.fillRect(barX + barW - 10, barY, 10, barH, '#fc000033');
  renderer.fillRect(barX, barY, 10, barH, '#ff555533');

  // P1 dot
  const norm1 = Math.max(0, Math.min(1, (p1.x - WORLD_LEFT) / (WORLD_RIGHT - WORLD_LEFT)));
  renderer.setGlow('#fc0', 0.5);
  renderer.fillCircle(barX + norm1 * barW, barY + barH / 2, 4, '#fc0');

  // AI dot
  const norm2 = Math.max(0, Math.min(1, (p2.x - WORLD_LEFT) / (WORLD_RIGHT - WORLD_LEFT)));
  renderer.setGlow('#f55', 0.5);
  renderer.fillCircle(barX + norm2 * barW, barY + barH / 2, 4, '#f55');
  renderer.setGlow(null);

  text.drawText('P1\u2192', barX, barY - 11, 7, '#fc0', 'left');
  text.drawText('\u2190AI', barX + barW, barY - 11, 7, '#f55', 'right');
}

function drawEnGarde(renderer, text) {
  if (enGardeTimer <= 0) return;
  const a = Math.min(1, enGardeTimer / 30);
  const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
  renderer.setGlow('#fc0', 1.0);
  text.drawText('EN GARDE!', W / 2, H / 2 - 44, 28, '#ffcc00' + aHex, 'center');
  renderer.setGlow(null);
}

function drawKillFlash(renderer) {
  if (flashTimer <= 0) return;
  const a = (flashTimer / 15) * 0.3;
  const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
  renderer.fillRect(0, 0, W, H, '#ffffff' + aHex);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function createGame() {
  const game = new Game('game');

  // Frame counter for sprite animation
  let frameCount = 0;

  function initGame() {
    score = 0;
    kills1 = 0;
    kills2 = 0;
    p1 = new Fighter(0, 1, false);
    p2 = new Fighter(200, -1, true);
    cameraX = 0;
    roundTimer = 0;
    respawnTimer = 0;
    winner = null;
    particles = [];
    droppedSwords = [];
    enGardeTimer = 0;
    flashTimer = 0;
    updateUI();
    game.showOverlay('NIDHOGG-LIKE', 'Click or press any key to Start');
    game.setState('waiting');
  }

  function startMatch() {
    kills1 = 0;
    kills2 = 0;
    p1.reset(-80, 1);
    p2.reset(80, -1);
    cameraX = 0;
    roundTimer = 0;
    respawnTimer = 0;
    winner = null;
    particles = [];
    droppedSwords = [];
    enGardeTimer = 80;
    flashTimer = 0;
    frameCount = 0;
    updateUI();
    game.setState('playing');
  }

  game.onInit = () => {
    initGame();
  };

  game.setScoreFn(() => score);

  // Canvas click starts game
  game.canvas.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') startMatch();
  });

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      // Any key also starts
      const startKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                         'KeyZ', 'KeyX', 'KeyC', 'KeyS', 'KeyD', ' '];
      for (const k of startKeys) {
        if (input.wasPressed(k)) { startMatch(); return; }
      }
      return;
    }

    if (game.state === 'over') {
      const restartKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
      for (const k of restartKeys) {
        if (input.wasPressed(k)) { initGame(); return; }
      }
      return;
    }

    // Playing
    frameCount++;
    roundTimer++;
    if (enGardeTimer > 0) enGardeTimer--;
    if (flashTimer > 0) flashTimer--;

    if (enGardeTimer > 20) return;

    updatePlayer(p1, p2, input);

    if (!p2.advancing) updateAI(p2, p1);

    if (p1.advancing) {
      p1.vx = p1.goalDir * p1.runSpeed * 1.3;
      p1.advanceTimer--;
      if (p1.advanceTimer <= 0) p1.advancing = false;
    }
    if (p2.advancing) {
      p2.vx = p2.goalDir * p2.runSpeed * 1.3;
      p2.advanceTimer--;
      if (p2.advanceTimer <= 0) p2.advancing = false;
    }

    p1.update();
    p2.update();

    if (!p1.dead && !p2.dead) {
      if (checkHit(p1, p2)) killFighter(p2, p1);
      if (checkHit(p2, p1)) killFighter(p1, p2);

      if (checkThrownSwordHit(p1.thrownSword, p2)) { p1.thrownSword.active = false; killFighter(p2, p1); }
      if (checkThrownSwordHit(p2.thrownSword, p1)) { p2.thrownSword.active = false; killFighter(p1, p2); }

      // Push apart
      const dx = p2.x - p1.x;
      const dist = Math.abs(dx);
      if (dist < 18) {
        const push = (18 - dist) / 2;
        const d = dx > 0 ? 1 : -1;
        p1.x -= d * push;
        p2.x += d * push;
      }
    }

    // AI picks up swords
    if (!p2.dead && !p2.hasSword) {
      for (let i = droppedSwords.length - 1; i >= 0; i--) {
        if (Math.abs(droppedSwords[i].x - p2.x) < 30) {
          p2.hasSword = true;
          droppedSwords.splice(i, 1);
          break;
        }
      }
    }

    // Respawn
    if ((p1.dead || p2.dead) && respawnTimer > 0) {
      respawnTimer--;
      if (respawnTimer <= 0) respawn();
    }

    // Camera
    let targetCamX;
    if (p1.dead) targetCamX = p2.x;
    else if (p2.dead) targetCamX = p1.x;
    else targetCamX = (p1.x + p2.x) / 2;
    cameraX += (targetCamX - cameraX) * 0.06;

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.vx *= 0.98;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Win check
    if (checkWinCondition()) {
      game.showOverlay(
        winner === 'P1' ? 'VICTORY!' : 'DEFEAT!',
        'P1: ' + kills1 + ' kills | AI: ' + kills2 + ' kills — Click to play again'
      );
      game.setState('over');
    }

    updateUI();
  };

  game.onDraw = (renderer, text) => {
    const camX = cameraX || 0;

    drawBackground(renderer, text, camX);
    drawDroppedSwords(renderer, camX);

    if (p1) drawFighter(renderer, text, p1, camX, frameCount);
    if (p2) drawFighter(renderer, text, p2, camX, frameCount);

    if (p1 && p1.thrownSword) drawThrownSword(renderer, p1.thrownSword, camX, '#fc0', frameCount);
    if (p2 && p2.thrownSword) drawThrownSword(renderer, p2.thrownSword, camX, '#f55', frameCount);

    drawParticles(renderer, camX);
    drawProgressBar(renderer, text);
    drawEnGarde(renderer, text);
    drawKillFlash(renderer);
  };

  game.start();
  return game;
}
