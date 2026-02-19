// smash-arena/game.js — Smash Arena game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;

const THEME = '#f48';

// Physics constants
const GRAVITY = 0.55;
const MAX_FALL = 12;
const GROUND_FRICTION = 0.82;
const AIR_FRICTION = 0.97;
const JUMP_FORCE = -11;
const DOUBLE_JUMP_FORCE = -9.5;
const MOVE_SPEED = 4.5;
const AIR_SPEED = 3.2;
const HITSTUN_FACTOR = 0.06;
const KB_SCALING = 0.12;
const BASE_KB = 3;
const DI_STRENGTH = 0.08;

// Stage layout
const STAGE_Y = 310;
const STAGE_LEFT = 100;
const STAGE_RIGHT = 500;
const BLAST_TOP = -80;
const BLAST_BOTTOM = 480;
const BLAST_LEFT = -60;
const BLAST_RIGHT = 660;

const platforms = [
  { x: 100, y: STAGE_Y, w: 400, h: 18, isMain: true },
  { x: 135, y: 228, w: 100, h: 10, isMain: false },
  { x: 365, y: 228, w: 100, h: 10, isMain: false },
  { x: 235, y: 155, w: 130, h: 10, isMain: false },
];

const CHAR_W = 28, CHAR_H = 38;

const CHARACTERS = [
  { name: 'Blaze', color: '#f44', accent: '#f88', speed: 1.0, weight: 1.0, jumpMul: 1.0,
    specType: 'projectile', specColor: '#f80' },
  { name: 'Frost', color: '#48f', accent: '#8af', speed: 1.1, weight: 0.85, jumpMul: 1.1,
    specType: 'dash', specColor: '#4ef' },
  { name: 'Terra', color: '#4a4', accent: '#8d8', speed: 0.85, weight: 1.3, jumpMul: 0.9,
    specType: 'slam', specColor: '#a84' },
  { name: 'Volt', color: '#ff4', accent: '#ffa', speed: 1.2, weight: 0.8, jumpMul: 1.15,
    specType: 'projectile', specColor: '#ff0' },
];

const ATTACKS = {
  jab:    { dmg: 4,  kb: 2.5,  start: 3,  active: 3,  end: 8,  rx: 30, ry: 14 },
  smash:  { dmg: 14, kb: 8,    start: 14, active: 4,  end: 20, rx: 40, ry: 20 },
  aerial: { dmg: 8,  kb: 5,    start: 5,  active: 4,  end: 10, rx: 32, ry: 20 },
  upAir:  { dmg: 9,  kb: 6,    start: 5,  active: 4,  end: 10, rx: 24, ry: 30 },
  dAir:   { dmg: 10, kb: 7,    start: 7,  active: 4,  end: 14, rx: 22, ry: 28 },
  grab:   { dmg: 0,  kb: 0,    start: 6,  active: 3,  end: 28, rx: 28, ry: 14 },
};

const ITEM_TYPES = [
  { name: 'Beam Sword', color: '#4ff', w: 20, h: 8,  atkBoost: 1.6, kbBoost: 1.4, dur: 600 },
  { name: 'Hammer',     color: '#f84', w: 16, h: 22, atkBoost: 2.2, kbBoost: 2.0, dur: 360 },
  { name: 'Bomb',       color: '#888', w: 14, h: 14, atkBoost: 1.0, kbBoost: 1.0, dur: 300, explosive: true },
];

let players = [];
let projectiles = [];
let items = [];
let particles = [];
let shakeTimer = 0, shakeIntensity = 0;
let itemSpawnTimer = 0;
let frameCount = 0;
let matchOver = false;
let countdownTimer = 0;
let stageHazardTimer = 0;
let hazardWarning = null;
let hazardActive = null;
let score = 0;

const scoreEl = document.getElementById('score');
const stocksDisp = document.getElementById('stocksDisp');
const dmgDisp = document.getElementById('dmgDisp');

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function spawnPart(x, y, vx, vy, col, life, sz) {
  particles.push({ x, y, vx, vy, col, life, maxLife: life, sz: sz || 3 });
}

function koExplosion(x, y, col) {
  shakeTimer = 16; shakeIntensity = 9;
  for (let i = 0; i < 35; i++) {
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 7;
    spawnPart(x, y, Math.cos(a)*s, Math.sin(a)*s, col, 35+Math.random()*20, 3+Math.random()*5);
  }
  for (let i = 0; i < 8; i++) {
    const a = i/8*Math.PI*2;
    spawnPart(x, y, Math.cos(a)*9, Math.sin(a)*9, '#fff', 22, 5);
  }
}

function hitSparks(x, y, dmg) {
  const n = Math.min(dmg * 2, 16);
  for (let i = 0; i < n; i++) {
    const a = Math.random()*Math.PI*2, s = 1+Math.random()*3;
    const c = ['#fff','#ff8','#f84',THEME][Math.floor(Math.random()*4)];
    spawnPart(x, y, Math.cos(a)*s, Math.sin(a)*s, c, 10+Math.random()*10, 2+Math.random()*2);
  }
}

function applyKB(target, attacker, atkData, dirX, dirY, mul) {
  const m = mul || 1;
  const itemKB = attacker.item ? attacker.item.kbBoost : 1;
  const totalKB = (BASE_KB + atkData.kb * m * itemKB) * (1 + target.damage * KB_SCALING) / target.weight;
  const ang = Math.atan2(dirY || -0.6, dirX);
  target.vx = Math.cos(ang) * totalKB;
  target.vy = Math.sin(ang) * totalKB;
  target.hitstun = Math.floor(totalKB * HITSTUN_FACTOR * 60);
  target.grounded = false;
  target.lastHitBy = attacker.idx;
  if (totalKB > 8) {
    shakeTimer = Math.min(totalKB * 0.5, 10);
    shakeIntensity = Math.min(totalKB * 0.5, 7);
  }
}

function fireProjectile(p) {
  const ch = CHARACTERS[p.charIdx];
  const isVolt = p.charIdx === 3;
  projectiles.push({
    x: p.x + p.w/2 + p.facing * 20,
    y: p.y + (isVolt ? -10 : p.h/2),
    vx: isVolt ? 0 : p.facing * 7,
    vy: isVolt ? 4 : 0,
    w: isVolt ? 16 : 12, h: isVolt ? 20 : 10,
    col: ch.specColor, owner: p.idx,
    dmg: isVolt ? 10 : 8, kb: isVolt ? 5 : 4,
    life: 70,
  });
}

function spawnItem() {
  const t = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  items.push({ x: 150 + Math.random()*300, y: -20, vy: 1.5, ...t, grounded: false, life: 600 });
}

function doAttack(p, type) {
  if (p.atk || p.hitstun > 0 || p.grabbedBy >= 0) return;
  p.atk = ATTACKS[type];
  p.atkFrame = 0;
  p.atkType = type;
}

function doSpecial(p) {
  if (p.atk || p.hitstun > 0) return;
  const ch = CHARACTERS[p.charIdx];
  if (ch.specType === 'projectile') {
    fireProjectile(p);
    p.atk = { dmg: 0, kb: 0, start: 5, active: 0, end: 12, rx: 0, ry: 0 };
    p.atkFrame = 0; p.atkType = 'special';
  } else if (ch.specType === 'dash') {
    p.vx = p.facing * 14;
    p.invincible = 8;
    p.atk = { dmg: 10, kb: 5, start: 2, active: 6, end: 12, rx: 36, ry: 20 };
    p.atkFrame = 0; p.atkType = 'special';
    for (let i = 0; i < 8; i++)
      spawnPart(p.x+p.w/2, p.y+p.h/2, -p.facing*(1+Math.random()*3), (Math.random()-0.5)*2, ch.specColor, 15, 3);
  } else if (ch.specType === 'slam') {
    if (p.grounded) {
      p.vy = JUMP_FORCE * 1.3;
      p.grounded = false;
    } else {
      p.vy = 13; p.fastFall = true;
    }
    p.atk = { dmg: 16, kb: 9, start: 4, active: 6, end: 22, rx: 42, ry: 26 };
    p.atkFrame = 0; p.atkType = 'special';
  }
}

function mkPlayer(idx, charIdx, isAI) {
  const ch = CHARACTERS[charIdx];
  return {
    x: 180 + idx * 80, y: STAGE_Y - CHAR_H,
    vx: 0, vy: 0, w: CHAR_W, h: CHAR_H,
    facing: idx < 2 ? 1 : -1,
    charIdx, color: ch.color, accent: ch.accent,
    speed: ch.speed, weight: ch.weight, jumpMul: ch.jumpMul,
    specType: ch.specType, specColor: ch.specColor,
    damage: 0, stocks: 3, kos: 0,
    isAI, grounded: false, jumpsLeft: 2,
    atk: null, atkFrame: 0, atkType: null,
    hitstun: 0, shielding: false, shieldHP: 100,
    grabbing: -1, grabbedBy: -1, grabTimer: 0,
    invincible: 0, item: null, itemTimer: 0,
    respawnTimer: 0, alive: true, idx,
    name: ch.name, platform: null,
    fastFall: false, lastHitBy: -1,
    hitlag: 0, animFrame: 0, animTimer: 0,
    aiTimer: 0, aiDodgeCD: 0, aiCombo: 0,
  };
}

function updateHUD() {
  const p = players[0];
  if (!p) return;
  if (scoreEl) scoreEl.textContent = score;
  if (stocksDisp) stocksDisp.textContent = p.stocks;
  if (dmgDisp) dmgDisp.textContent = Math.floor(p.damage);
}

function updateAI(p) {
  if (!p.alive || p.respawnTimer > 0 || p.hitstun > 0 || p.grabbedBy >= 0) return;
  p.aiTimer--;
  if (p.aiDodgeCD > 0) p.aiDodgeCD--;

  let closest = null, cDist = Infinity;
  for (const o of players) {
    if (o.idx === p.idx || !o.alive || o.respawnTimer > 0) continue;
    const d = Math.abs(o.x - p.x) + Math.abs(o.y - p.y);
    if (d < cDist) { cDist = d; closest = o; }
  }
  if (!closest) return;

  const dx = closest.x - p.x;
  const dy = closest.y - p.y;
  const distX = Math.abs(dx);
  const distY = Math.abs(dy);
  p.facing = dx > 0 ? 1 : -1;

  if (p.y > STAGE_Y + 20 || p.x < STAGE_LEFT - 30 || p.x > STAGE_RIGHT + 30) {
    const mid = (STAGE_LEFT + STAGE_RIGHT) / 2;
    p.vx += (p.x < mid ? 0.5 : -0.5);
    if (p.jumpsLeft > 0 && p.y > STAGE_Y - 40) {
      p.vy = DOUBLE_JUMP_FORCE * p.jumpMul;
      p.jumpsLeft--; p.grounded = false;
    }
    if (p.jumpsLeft <= 0 && p.y > STAGE_Y) doSpecial(p);
    return;
  }

  if (closest.y > STAGE_Y + 30 || closest.x < STAGE_LEFT - 20 || closest.x > STAGE_RIGHT + 20) {
    if (p.grounded) {
      const edge = closest.x < STAGE_LEFT ? STAGE_LEFT + 10 : STAGE_RIGHT - 10;
      if (Math.abs(p.x - edge) > 20) p.vx += (edge > p.x ? 1 : -1) * 0.5;
      if (Math.abs(p.x - edge) < 40 && cDist < 150 && Math.random() < 0.03) {
        p.vy = JUMP_FORCE * p.jumpMul; p.grounded = false; p.jumpsLeft--;
      }
    }
    if (!p.grounded && distX < 55 && distY < 55 && !p.atk) doAttack(p, 'aerial');
    return;
  }

  if (closest.atk && cDist < 65 && p.aiDodgeCD <= 0) {
    if (Math.random() < 0.5 && p.grounded) {
      p.shielding = true; p.aiDodgeCD = 20;
    } else if (p.grounded && Math.random() < 0.4) {
      p.vy = JUMP_FORCE * p.jumpMul * 0.8;
      p.grounded = false; p.jumpsLeft--; p.aiDodgeCD = 25;
    }
    return;
  }
  p.shielding = false;

  if (closest.shielding && distX < 38 && distY < 22 && !p.atk) {
    doAttack(p, 'grab'); return;
  }

  if (!p.item) {
    for (const it of items) {
      if (it.grounded && Math.abs(it.x - p.x) < 80 && Math.abs(it.y - p.y) < 60) {
        p.vx += (it.x > p.x ? 1 : -1) * 0.5; return;
      }
    }
  }

  if (distX < 48 && distY < 32) {
    if (p.aiTimer <= 0) {
      const r = Math.random();
      if (closest.damage > 80 && r < 0.35) doAttack(p, 'smash');
      else if (r < 0.6) { doAttack(p, 'jab'); p.aiCombo = 1; }
      else if (r < 0.8) doAttack(p, 'grab');
      else doSpecial(p);
      p.aiTimer = 10 + Math.floor(Math.random() * 15);
    }
  } else if (distX < 160) {
    p.vx += (dx > 0 ? 1 : -1) * 0.4 * p.speed;
    if (p.grounded && Math.random() < 0.02 && distX < 100) {
      p.vy = JUMP_FORCE * p.jumpMul * 0.7; p.grounded = false; p.jumpsLeft--;
    }
    if (distX > 100 && Math.random() < 0.015 && p.specType === 'projectile') doSpecial(p);
  } else {
    p.vx += (dx > 0 ? 1 : -1) * 0.35 * p.speed;
    if (Math.random() < 0.02 && p.specType === 'projectile') doSpecial(p);
  }

  if (!p.grounded && distX < 42 && !p.atk) {
    if (dy > 10 && Math.random() < 0.06) doAttack(p, 'dAir');
    else if (dy < -10 && Math.random() < 0.06) doAttack(p, 'upAir');
    else if (Math.random() < 0.04) doAttack(p, 'aerial');
  }

  if (p.aiCombo > 0 && !p.atk && p.aiTimer <= 0 && distX < 55) {
    if (p.aiCombo === 1) { doAttack(p, 'jab'); p.aiCombo = 2; p.aiTimer = 6; }
    else if (p.aiCombo === 2) {
      if (closest.damage > 60) doAttack(p, 'smash'); else doAttack(p, 'aerial');
      p.aiCombo = 0; p.aiTimer = 15;
    }
  } else if (p.aiCombo > 0 && distX > 60) p.aiCombo = 0;

  if (p.grounded && closest.y < p.y - 40 && Math.random() < 0.03) {
    p.vy = JUMP_FORCE * p.jumpMul; p.grounded = false; p.jumpsLeft--;
  }
  if (p.grounded && closest.y > p.y + 30 && p.platform && !p.platform.isMain && Math.random() < 0.03) {
    p.y += 12; p.grounded = false;
  }
}

function handleInput(p, input) {
  if (!p.alive || p.respawnTimer > 0 || p.hitstun > 0 || p.grabbedBy >= 0) return;

  p.shielding = input.isDown('s') && p.grounded && !p.atk && p.shieldHP > 0;
  if (p.shielding) {
    p.shieldHP -= 0.3;
    if (p.shieldHP <= 0) { p.shielding = false; p.hitstun = 45; spawnPart(p.x+p.w/2, p.y, 0, -3, '#fff', 30, 8); }
    return;
  }
  if (!p.shielding) p.shieldHP = Math.min(100, p.shieldHP + 0.15);

  if (input.isDown('ArrowLeft'))  { p.vx -= (p.grounded ? MOVE_SPEED : AIR_SPEED) * p.speed * 0.3; if (!p.atk) p.facing = -1; }
  if (input.isDown('ArrowRight')) { p.vx += (p.grounded ? MOVE_SPEED : AIR_SPEED) * p.speed * 0.3; if (!p.atk) p.facing = 1; }

  if (input.wasPressed('ArrowUp') && p.jumpsLeft > 0 && !p.atk) {
    p.vy = (p.grounded ? JUMP_FORCE : DOUBLE_JUMP_FORCE) * p.jumpMul;
    if (!p.grounded && p.jumpsLeft === 1) {
      for (let i = 0; i < 6; i++)
        spawnPart(p.x+p.w/2, p.y+p.h, (Math.random()-0.5)*3, 1+Math.random()*2, p.accent, 15, 2);
    }
    p.jumpsLeft--; p.grounded = false;
  }

  if (input.isDown('ArrowDown') && p.grounded && p.platform && !p.platform.isMain) {
    p.y += 12; p.grounded = false;
  }
  if (input.isDown('ArrowDown') && !p.grounded && p.vy > 0) p.fastFall = true;

  if (input.wasPressed('z') && !p.atk) {
    if (!p.grounded) {
      if (input.isDown('ArrowDown')) doAttack(p, 'dAir');
      else if (input.isDown('ArrowUp')) doAttack(p, 'upAir');
      else doAttack(p, 'aerial');
    } else if (input.isDown('ArrowLeft') || input.isDown('ArrowRight')) {
      doAttack(p, 'smash');
    } else {
      doAttack(p, 'jab');
    }
  }
  if (input.wasPressed('x') && !p.atk) doSpecial(p);
  if (input.wasPressed('c') && !p.atk) doAttack(p, 'grab');
}

function updatePlayer(p) {
  if (!p.alive) return;

  if (p.respawnTimer > 0) {
    p.respawnTimer--;
    if (p.respawnTimer <= 0) {
      p.x = 250 + p.idx * 30; p.y = 50;
      p.vx = 0; p.vy = 0; p.damage = 0;
      p.invincible = 120; p.hitstun = 0;
      p.shielding = false; p.shieldHP = 100;
      p.atk = null; p.atkFrame = 0;
      p.grabbedBy = -1; p.grabbing = -1; p.grabTimer = 0;
      p.item = null; p.fastFall = false;
    }
    return;
  }

  if (p.hitlag > 0) { p.hitlag--; return; }

  if (p.hitstun > 0) {
    p.hitstun--;
    // AI DI
    if (p.isAI) {
      const cx = (STAGE_LEFT + STAGE_RIGHT) / 2;
      p.vx += (p.x < cx ? 1 : -1) * DI_STRENGTH * 0.7;
      if (p.vy < 0) p.vy += DI_STRENGTH * 0.3;
    }
  }

  if (p.grabbedBy >= 0) {
    const g = players[p.grabbedBy];
    if (g && g.alive && g.grabbing === p.idx) {
      p.x = g.x + g.facing * 25; p.y = g.y;
    } else {
      p.grabbedBy = -1;
    }
    return;
  }

  if (p.grabbing >= 0) {
    p.grabTimer--;
    if (p.grabTimer <= 0) {
      const victim = players[p.grabbing];
      if (victim && victim.grabbedBy === p.idx) {
        victim.grabbedBy = -1;
        victim.damage += 6;
        applyKB(victim, p, { kb: 5, dmg: 6 }, p.facing, -0.5, 1);
        hitSparks(victim.x + victim.w/2, victim.y + victim.h/2, 6);
      }
      p.grabbing = -1;
    }
  }

  p.vy += GRAVITY;
  if (p.fastFall && p.vy > 0) p.vy += 0.35;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  p.x += p.vx;
  p.y += p.vy;
  p.vx *= p.grounded ? GROUND_FRICTION : AIR_FRICTION;

  const maxH = (p.grounded ? MOVE_SPEED * 1.3 : AIR_SPEED * 1.8) * p.speed;
  if (Math.abs(p.vx) > maxH && p.hitstun <= 0) p.vx = Math.sign(p.vx) * maxH;

  p.grounded = false; p.platform = null;
  for (const pl of platforms) {
    if (p.vy >= 0 && p.x + p.w > pl.x + 4 && p.x < pl.x + pl.w - 4 &&
        p.y + p.h >= pl.y && p.y + p.h <= pl.y + 14) {
      p.y = pl.y - p.h;
      p.vy = 0; p.grounded = true; p.jumpsLeft = 2;
      p.fastFall = false; p.platform = pl; break;
    }
  }

  if (p.invincible > 0) p.invincible--;

  if (p.atk) {
    p.atkFrame++;
    const a = p.atk;
    const total = a.start + a.active + a.end;

    if (p.atkFrame >= a.start && p.atkFrame < a.start + a.active && a.rx > 0) {
      let hx, hy;
      if (p.atkType === 'dAir') {
        hx = p.x + p.w/2 - a.rx/2; hy = p.y + p.h;
      } else if (p.atkType === 'upAir') {
        hx = p.x + p.w/2 - a.rx/2; hy = p.y - a.ry;
      } else {
        hx = p.x + (p.facing > 0 ? p.w : -a.rx);
        hy = p.y + p.h/2 - a.ry/2;
      }

      for (const o of players) {
        if (o.idx === p.idx || !o.alive || o.respawnTimer > 0 || o.invincible > 0) continue;
        if (!overlap(hx, hy, a.rx, a.ry, o.x, o.y, o.w, o.h)) continue;

        if (p.atkType === 'grab') {
          if (p.grabbing >= 0) continue;
          p.grabbing = o.idx;
          p.grabTimer = 30;
          o.grabbedBy = p.idx;
          o.vx = 0; o.vy = 0;
          o.shielding = false;
        } else {
          if (o.shielding) {
            o.shieldHP -= a.dmg * 1.5;
            spawnPart(o.x+o.w/2, o.y+o.h/2, 0, 0, '#8cf', 15, 6);
            if (o.shieldHP <= 0) { o.shielding = false; o.hitstun = 45; }
            continue;
          }
          const iMul = p.item ? p.item.atkBoost : 1;
          o.damage += a.dmg * iMul;
          const dY = p.atkType === 'upAir' ? -1 : (p.atkType === 'dAir' ? 1 : -0.4);
          applyKB(o, p, a, p.facing, dY, iMul);
          hitSparks(o.x + o.w/2, o.y + o.h/2, a.dmg);
          p.hitlag = Math.min(Math.floor(a.dmg * 0.4), 6);
          o.hitlag = p.hitlag;
        }
      }
    }
    if (p.atkFrame >= total) { p.atk = null; p.atkFrame = 0; p.atkType = null; }
  }

  if (!p.item) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.grounded && overlap(p.x, p.y, p.w, p.h, it.x, it.y, it.w, it.h)) {
        p.item = it; p.itemTimer = it.dur; items.splice(i, 1); break;
      }
    }
  }
  if (p.item) {
    p.itemTimer--;
    if (p.itemTimer <= 0) {
      if (p.item.explosive) {
        p.damage += 15;
        applyKB(p, p, { kb: 7, dmg: 15 }, 0, -1, 1);
        koExplosion(p.x + p.w/2, p.y + p.h/2, '#f80');
        for (const o of players) {
          if (o.idx === p.idx || !o.alive) continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) < 80) {
            o.damage += 20;
            applyKB(o, p, { kb: 9, dmg: 20 }, o.x > p.x ? 1 : -1, -0.5, 1);
          }
        }
      }
      p.item = null;
    }
  }

  // Blast zone KO
  if (p.y > BLAST_BOTTOM || p.y < BLAST_TOP || p.x < BLAST_LEFT || p.x > BLAST_RIGHT) {
    koExplosion(
      Math.max(10, Math.min(W-10, p.x + p.w/2)),
      Math.max(10, Math.min(H-10, p.y + p.h/2)),
      p.color
    );
    p.stocks--;
    if (p.lastHitBy >= 0 && p.lastHitBy !== p.idx) {
      players[p.lastHitBy].kos++;
      if (p.lastHitBy === 0) score++;
    }
    if (p.stocks <= 0) {
      p.alive = false;
    } else {
      p.respawnTimer = 90;
    }
    if (p.grabbing >= 0) { players[p.grabbing].grabbedBy = -1; p.grabbing = -1; }
    for (const o of players) { if (o.grabbing === p.idx) { o.grabbing = -1; } }
    p.grabbedBy = -1;
    p.lastHitBy = -1;
    updateHUD();
  }

  p.animTimer++;
  if (p.animTimer > 6) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.x += pr.vx; pr.y += pr.vy;
    if (Math.abs(pr.vx) < 0.5 && pr.vy > 0) pr.vy += 0.1;
    pr.life--;
    if (frameCount % 2 === 0) spawnPart(pr.x, pr.y, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, pr.col, 10, 2);

    let hit = false;
    for (const p of players) {
      if (p.idx === pr.owner || !p.alive || p.respawnTimer > 0 || p.invincible > 0) continue;
      if (overlap(pr.x-pr.w/2, pr.y-pr.h/2, pr.w, pr.h, p.x, p.y, p.w, p.h)) {
        if (p.shielding) { p.shieldHP -= pr.dmg; spawnPart(p.x+p.w/2, p.y+p.h/2, 0, 0, '#8cf', 15, 6); }
        else {
          p.damage += pr.dmg;
          applyKB(p, players[pr.owner] || p, { kb: pr.kb, dmg: pr.dmg }, pr.vx > 0 ? 1 : (pr.vx < 0 ? -1 : 0), pr.vy > 2 ? 0.5 : -0.3, 1);
          hitSparks(p.x + p.w/2, p.y + p.h/2, pr.dmg);
        }
        hit = true; break;
      }
    }
    if (hit || pr.life <= 0 || pr.x < -30 || pr.x > W+30 || pr.y < -30 || pr.y > H+30) projectiles.splice(i, 1);
  }
}

function updateItems() {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (!it.grounded) {
      it.vy += 0.2; it.y += it.vy;
      for (const pl of platforms) {
        if (it.vy > 0 && it.y + it.h >= pl.y && it.y + it.h <= pl.y + 10 && it.x + it.w > pl.x && it.x < pl.x + pl.w) {
          it.y = pl.y - it.h; it.vy = 0; it.grounded = true; break;
        }
      }
    }
    it.life--;
    if (it.life <= 0 || it.y > H + 20) items.splice(i, 1);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateHazard() {
  if (matchOver) return;
  stageHazardTimer--;
  if (stageHazardTimer <= 0 && !hazardActive && !hazardWarning) {
    hazardWarning = { side: Math.random() < 0.5 ? 'left' : 'right', timer: 90 };
  }
  if (hazardWarning) {
    hazardWarning.timer--;
    if (hazardWarning.timer <= 0) {
      hazardActive = { side: hazardWarning.side, timer: 50,
        startX: hazardWarning.side === 'left' ? -30 : W + 30,
        endX: hazardWarning.side === 'left' ? W * 0.4 : W * 0.6 };
      hazardWarning = null;
    }
  }
  if (hazardActive) {
    hazardActive.timer--;
    const prog = 1 - hazardActive.timer / 50;
    const hx = hazardActive.startX + (hazardActive.endX - hazardActive.startX) * prog;
    const hy = STAGE_Y - 12;

    if (prog > 0.1 && prog < 0.9) {
      for (const p of players) {
        if (!p.alive || p.respawnTimer > 0 || p.invincible > 0) continue;
        if (Math.abs(p.x + p.w/2 - hx) < 35 && Math.abs(p.y + p.h - hy) < 45) {
          p.damage += 12;
          applyKB(p, p, { kb: 7, dmg: 12 }, hazardActive.side === 'left' ? 1 : -1, -0.6, 1);
          hitSparks(p.x + p.w/2, p.y + p.h/2, 12);
          p.invincible = 20;
        }
      }
    }

    if (hazardActive.timer <= 0) {
      hazardActive = null;
      stageHazardTimer = 600 + Math.floor(Math.random() * 400);
    }
  }
}

// ── hex color to rgba string ──
function hexAlpha(hex, alpha) {
  // hex is like '#f48' or '#ff4488'
  let r, g, b;
  const h = hex.slice(1);
  if (h.length === 3) {
    r = parseInt(h[0]+h[0], 16);
    g = parseInt(h[1]+h[1], 16);
    b = parseInt(h[2]+h[2], 16);
  } else {
    r = parseInt(h.slice(0,2), 16);
    g = parseInt(h.slice(2,4), 16);
    b = parseInt(h.slice(4,6), 16);
  }
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}${a}`;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    players = [];
    projectiles = []; items = []; particles = [];
    shakeTimer = 0; shakeIntensity = 0;
    itemSpawnTimer = 300;
    stageHazardTimer = 800 + Math.floor(Math.random() * 300);
    hazardWarning = null; hazardActive = null;
    matchOver = false;
    countdownTimer = 180;
    frameCount = 0;
    updateHUD();
    game.showOverlay('SMASH ARENA', 'Click to Fight!');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Click to start
  const canvas = document.getElementById('game');
  canvas.parentElement.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') {
      players = [
        mkPlayer(0, 0, false),
        mkPlayer(1, 1, true),
        mkPlayer(2, 2, true),
        mkPlayer(3, 3, true),
      ];
      score = 0;
      projectiles = []; items = []; particles = [];
      itemSpawnTimer = 300;
      stageHazardTimer = 800 + Math.floor(Math.random() * 300);
      hazardWarning = null; hazardActive = null;
      matchOver = false;
      countdownTimer = 180;
      frameCount = 0;
      updateHUD();
      game.setState('playing');
    }
  });

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;
    frameCount++;

    if (countdownTimer > 0) { countdownTimer--; return; }
    if (matchOver) return;

    const input = game.input;

    // Player 1 DI during hitstun
    const p0 = players[0];
    if (p0 && p0.hitstun > 0) {
      if (input.isDown('ArrowLeft'))  p0.vx -= DI_STRENGTH;
      if (input.isDown('ArrowRight')) p0.vx += DI_STRENGTH;
      if (input.isDown('ArrowUp'))    p0.vy -= DI_STRENGTH;
    }

    handleInput(players[0], input);
    for (let i = 1; i < players.length; i++) updateAI(players[i]);
    for (const p of players) updatePlayer(p);
    updateProjectiles();
    updateItems();
    updateParticles();
    updateHazard();

    itemSpawnTimer--;
    if (itemSpawnTimer <= 0) { spawnItem(); itemSpawnTimer = 400 + Math.floor(Math.random() * 300); }
    if (shakeTimer > 0) shakeTimer--;
    updateHUD();

    // Check match end
    let alive = 0, last = null;
    for (const p of players) {
      if (p.alive || p.stocks > 0) { alive++; last = p; }
    }
    if (alive <= 1) {
      matchOver = true;
      const title = last ? (last.idx === 0 ? 'VICTORY!' : last.name + ' WINS!') : 'DRAW!';
      const body = `Your KOs: ${score}  --  Click to play again`;
      game.showOverlay(title, body);
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    // Screen shake offset (applied by translating draw positions would require
    // storing it; instead we use a shake delta applied globally via particle positions)
    // We pass shakeOffX/Y into drawing routines.
    let shakeX = 0, shakeY = 0;
    if (shakeTimer > 0) {
      const si = shakeIntensity * (shakeTimer / 16);
      shakeX = (Math.random()-0.5)*si;
      shakeY = (Math.random()-0.5)*si;
    }
    const sx = shakeX, sy = shakeY;

    // ── Background ──
    // Animated stars
    for (let i = 0; i < 50; i++) {
      const stX = (i * 97 + frameCount * 0.08) % W;
      const stY = (i * 53 + Math.sin(frameCount * 0.004 + i) * 6) % (STAGE_Y - 30);
      renderer.fillRect(sx + stX, sy + stY, 1.5, 1.5, '#ffffff18');
    }

    // Blast zone boundary (dashed approximation: small rect segments)
    for (let x2 = 10; x2 < W - 10; x2 += 14) {
      renderer.fillRect(sx + x2, sy + 10, 4, 1, '#f4881a');
      renderer.fillRect(sx + x2, sy + H - 10, 4, 1, '#f4881a');
    }
    for (let y2 = 10; y2 < H - 10; y2 += 14) {
      renderer.fillRect(sx + 10, sy + y2, 1, 4, '#f4881a');
      renderer.fillRect(sx + W - 10, sy + y2, 1, 4, '#f4881a');
    }

    // ── Stage ──
    for (const pl of platforms) {
      if (pl.isMain) {
        // Stage body (dark panel below top)
        renderer.fillRect(sx + pl.x, sy + pl.y, pl.w, pl.h + 80, '#2a2a4e');
        // Top surface
        renderer.fillRect(sx + pl.x, sy + pl.y, pl.w, 3, THEME);
        // Ledge markers
        renderer.fillRect(sx + pl.x, sy + pl.y, 5, 14, hexAlpha(THEME, 0.67));
        renderer.fillRect(sx + pl.x + pl.w - 5, sy + pl.y, 5, 14, hexAlpha(THEME, 0.67));
      } else {
        renderer.fillRect(sx + pl.x, sy + pl.y, pl.w, pl.h, '#2a2a4e');
        renderer.fillRect(sx + pl.x, sy + pl.y, pl.w, 2, hexAlpha(THEME, 0.53));
        // Support line
        renderer.drawLine(sx + pl.x + pl.w/2, sy + pl.y + pl.h, sx + pl.x + pl.w/2, sy + pl.y + 40, '#2a2a4e44', 1);
      }
    }

    // ── Hazards ──
    if (hazardWarning) {
      const flash = Math.sin(frameCount * 0.3) > 0;
      if (flash) {
        const wx = hazardWarning.side === 'left' ? 55 : W - 55;
        text.drawText('! HAZARD !', sx + wx, sy + STAGE_Y - 44, 14, '#f00', 'center');
        renderer.fillRect(sx + wx - 40, sy, 80, STAGE_Y, '#f0000018');
      }
    }
    if (hazardActive) {
      const prog = 1 - hazardActive.timer / 50;
      const hx2 = hazardActive.startX + (hazardActive.endX - hazardActive.startX) * prog;
      renderer.setGlow('#f44', 0.7);
      renderer.fillCircle(sx + hx2, sy + STAGE_Y - 12, 22, '#f44');
      renderer.fillCircle(sx + hx2, sy + STAGE_Y - 12, 10, '#ff8');
      // Trail
      for (let i = 1; i <= 4; i++) {
        const tx2 = hx2 - (hazardActive.endX - hazardActive.startX > 0 ? 1 : -1) * i * 12;
        const ta = Math.max(0, 0.3 - i * 0.06);
        renderer.fillCircle(sx + tx2, sy + STAGE_Y - 12, 14 - i * 2, hexAlpha('#f44', ta));
      }
      renderer.setGlow(null);
    }

    // ── Characters ──
    for (const p of players) {
      if (!p.alive || p.respawnTimer > 0) continue;
      if (p.invincible > 0 && frameCount % 4 < 2) continue;

      const cx = sx + p.x + p.w/2;
      const cy = sy + p.y + p.h/2;
      const flip = p.facing < 0 ? -1 : 1;

      // Shadow under feet
      renderer.fillRect(cx - 12, sy + p.y + p.h - 2, 24, 4, '#00000040');

      const bodyC = p.hitstun > 0 ? '#fff' : p.color;

      // Body (origin = cx,cy which is center of body)
      // In original: fillRect(-11,-8, 22,20) relative to cx,cy
      renderer.fillRect(cx - 11, cy - 8, 22, 20, bodyC);

      // Head: fillRect(-9,-19, 18,13) relative to cx,cy, mirrored on X
      renderer.fillRect(cx - 9, cy - 19, 18, 13, bodyC);

      // Eyes (flip-aware)
      renderer.fillRect(cx + flip*0, cy - 16, 6, 5, '#fff');
      renderer.fillRect(cx + flip*2, cy - 15, 3, 3, '#111');

      // Mouth
      renderer.fillRect(cx + flip*1, cy - 9, 4, 2, '#111');

      // Arms
      if (p.atk && p.atkFrame >= p.atk.start && p.atkFrame < p.atk.start + p.atk.active) {
        if (p.atkType === 'upAir') {
          renderer.fillRect(cx - 3, cy - 28, 8, 14, p.accent);
          renderer.fillRect(cx - 5, cy - 32, 12, 6, hexAlpha('#fff', 0.4));
        } else if (p.atkType === 'dAir') {
          renderer.fillRect(cx - 3, cy + 12, 8, 14, p.accent);
          renderer.fillRect(cx - 5, cy + 22, 12, 6, hexAlpha('#fff', 0.4));
        } else {
          renderer.fillRect(cx + flip*11, cy - 7, 20, 7, p.accent);
          if (p.atkType === 'smash') {
            renderer.fillRect(cx + flip*22, cy - 12, 16, 16, hexAlpha('#fff', 0.47));
          }
        }
      } else {
        renderer.fillRect(cx + flip*11, cy - 3, 9, 6, p.accent);
      }
      // Back arm
      renderer.fillRect(cx - flip*15, cy - 1, 6, 6, p.accent);

      // Legs (animated)
      const lo = p.grounded ? Math.sin(p.animFrame * 0.8) * 3 : 4;
      renderer.fillRect(cx - 9, cy + 12, 8, 8 + lo, bodyC);
      renderer.fillRect(cx + 2,  cy + 12, 8, 8 - lo, bodyC);

      // Item indicator
      if (p.item) {
        renderer.setGlow(p.item.color, 0.5);
        renderer.fillRect(cx + flip*13, cy - 14, p.item.w * 0.7, p.item.h * 0.7, hexAlpha(p.item.color, 0.6));
        renderer.setGlow(null);
      }

      // Shield bubble
      if (p.shielding) {
        const shieldA = 0.35 + (p.shieldHP / 100) * 0.35;
        renderer.fillCircle(cx, cy, 25, hexAlpha('#8cf', shieldA));
        renderer.strokePoly([
          {x: cx-25, y: cy}, {x: cx, y: cy-25}, {x: cx+25, y: cy}, {x: cx, y: cy+25}
        ], hexAlpha('#8cf', shieldA + 0.15), 2, true);
      }

      // Attack hitbox (subtle)
      if (p.atk && p.atkFrame >= p.atk.start && p.atkFrame < p.atk.start + p.atk.active && p.atk.rx > 0) {
        const a = p.atk;
        let hbx, hby;
        if (p.atkType === 'dAir') {
          hbx = sx + p.x + p.w/2 - a.rx/2; hby = sy + p.y + p.h;
        } else if (p.atkType === 'upAir') {
          hbx = sx + p.x + p.w/2 - a.rx/2; hby = sy + p.y - a.ry;
        } else {
          hbx = sx + p.x + (p.facing > 0 ? p.w : -a.rx);
          hby = sy + p.y + p.h/2 - a.ry/2;
        }
        renderer.fillRect(hbx, hby, a.rx, a.ry, hexAlpha(p.color, 0.15));
      }

      // Damage % label
      const dmgC = p.damage > 100 ? '#f44' : (p.damage > 60 ? '#fa4' : '#fff');
      text.drawText(Math.floor(p.damage) + '%', sx + p.x + p.w/2, sy + p.y - 17, 11, dmgC, 'center');

      // Name label
      text.drawText(p.name + (p.isAI ? '' : ' (YOU)'), sx + p.x + p.w/2, sy + p.y - 28, 9, p.color, 'center');
    }

    // ── Projectiles ──
    for (const pr of projectiles) {
      renderer.setGlow(pr.col, 0.6);
      renderer.fillCircle(sx + pr.x, sy + pr.y, Math.max(pr.w, pr.h) / 2, pr.col);
    }
    renderer.setGlow(null);

    // ── Items ──
    for (const it of items) {
      renderer.setGlow(it.color, 0.5);
      renderer.fillRect(sx + it.x, sy + it.y, it.w, it.h, it.color);
      renderer.setGlow(null);
      // Border
      renderer.strokePoly([
        {x: sx+it.x,        y: sy+it.y},
        {x: sx+it.x+it.w,   y: sy+it.y},
        {x: sx+it.x+it.w,   y: sy+it.y+it.h},
        {x: sx+it.x,        y: sy+it.y+it.h},
      ], '#ffffff88', 1, true);
      text.drawText(it.name, sx + it.x + it.w/2, sy + it.y - 12, 8, '#fff', 'center');
    }

    // ── Particles ──
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      renderer.fillRect(sx + p.x - p.sz/2, sy + p.y - p.sz/2, p.sz, p.sz, hexAlpha(p.col, alpha));
    }

    // ── HUD ──
    const hudY = H - 32;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const hx3 = 75 + i * 150;

      // Panel background
      renderer.fillRect(sx + hx3 - 60, sy + hudY - 14, 120, 34, '#00000070');
      // Panel border
      const borderCol = p.alive ? hexAlpha(p.color, 0.38) : '#33333360';
      renderer.strokePoly([
        {x: sx+hx3-60, y: sy+hudY-14},
        {x: sx+hx3+60, y: sy+hudY-14},
        {x: sx+hx3+60, y: sy+hudY+20},
        {x: sx+hx3-60, y: sy+hudY+20},
      ], borderCol, 1, true);

      // Name
      const nameC = p.alive ? p.color : '#555';
      text.drawText(p.name + (p.isAI ? '' : ' (P1)'), sx + hx3, sy + hudY, 10, nameC, 'center');

      // Stocks (circles)
      for (let s = 0; s < 3; s++) {
        const sc = s < p.stocks ? p.color : '#333';
        renderer.fillCircle(sx + hx3 - 28 + s * 14, sy + hudY + 12, 4, sc);
      }

      // Damage %
      const dc = p.damage > 100 ? '#f44' : (p.damage > 60 ? '#fa4' : '#eee');
      const dispC = p.alive ? dc : '#555';
      text.drawText(Math.floor(p.damage) + '%', sx + hx3 + 35, sy + hudY + 14, 12, dispC, 'center');
    }

    // ── Countdown ──
    if (countdownTimer > 0) {
      const v = Math.ceil(countdownTimer / 60);
      const pr2 = (countdownTimer % 60) / 60;
      const fontSize = Math.floor(42 + pr2 * 20);
      const alpha = 0.5 + pr2 * 0.5;
      renderer.setGlow(THEME, 0.8);
      text.drawText(v > 0 ? String(v) : 'GO!', sx + W/2, sy + H/2 - 20 - fontSize/2, fontSize, hexAlpha(THEME, alpha), 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
