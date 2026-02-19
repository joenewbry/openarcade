// stick-fight-online/game.js — WebGL 2 port of Stick Fight Online

import { Game } from '../engine/core.js';

const W = 600, H = 400;

const GRAVITY = 0.45;
const JUMP_FORCE = -9;
const MOVE_SPEED = 2.8;
const PLAYER_W = 12, PLAYER_H = 30;
const LAVA_RISE_SPEED = 0.15;
const CRUMBLE_TIME = 120;
const WIN_SCORE = 5;
const COLORS = ['#4af', '#f44', '#4f4', '#f8f'];
const WEAPON_TYPES = ['sword', 'gun', 'grenade', 'laser'];

// DOM elements
const p1ScoreEl = document.getElementById('p1Score');
const roundNumEl = document.getElementById('roundNum');
const killCountEl = document.getElementById('killCount');

// Game state
let players = [];
let platforms = [];
let projectiles = [];
let particles = [];
let weaponPickups = [];
let lavaY = H + 50;
let roundNum = 0;
let totalKills = 0;
let roundTimer = 0;
let roundOver = false;
let roundOverTimer = 0;
let matchOver = false;
let score = 0;

// Input state (keyed off core input via game.input, but we also track locally for just-pressed)
// We'll use game.input.isDown() and game.input.wasPressed() in update
let gameRef = null; // set after createGame

// ── Platform ──

class Platform {
  constructor(x, y, w, h, type) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.type = type || 'normal';
    this.hp = 1;
    this.crumbleTimer = 0;
    this.crumbling = false;
    this.shakeX = 0;
    this.dead = false;
    this.originalY = y;
  }

  update() {
    if (this.crumbling) {
      this.crumbleTimer++;
      this.shakeX = (Math.random() - 0.5) * 3;
      if (this.crumbleTimer > CRUMBLE_TIME) {
        this.dead = true;
        for (let i = 0; i < 8; i++) {
          particles.push(new Particle(
            this.x + Math.random() * this.w, this.y,
            (Math.random() - 0.5) * 3, -Math.random() * 2, '#886', 20
          ));
        }
      }
    }
  }

  draw(renderer) {
    if (this.dead) return;
    const alpha = this.crumbling ? Math.max(0.3, 1 - this.crumbleTimer / CRUMBLE_TIME) : 1;
    const dx = this.crumbling ? this.shakeX : 0;

    if (this.type === 'crumble') {
      const fillColor = alpha < 1
        ? '#665533' + Math.round(alpha * 255).toString(16).padStart(2, '0')
        : '#665533';
      const strokeColor = alpha < 1
        ? '#aa8844' + Math.round(alpha * 255).toString(16).padStart(2, '0')
        : '#aa8844';
      renderer.fillRect(this.x + dx, this.y, this.w, this.h, fillColor);
      // Border via thin edge rects
      renderer.fillRect(this.x + dx, this.y, this.w, 1, strokeColor);
      renderer.fillRect(this.x + dx, this.y + this.h - 1, this.w, 1, strokeColor);
      renderer.fillRect(this.x + dx, this.y, 1, this.h, strokeColor);
      renderer.fillRect(this.x + dx + this.w - 1, this.y, 1, this.h, strokeColor);
      // Crack lines when crumbling
      if (this.crumbling) {
        const crackColor = alpha < 1
          ? '#332211' + Math.round(alpha * 255).toString(16).padStart(2, '0')
          : '#332211';
        renderer.drawLine(
          this.x + dx + this.w * 0.3, this.y,
          this.x + dx + this.w * 0.5, this.y + this.h,
          crackColor, 1
        );
        renderer.drawLine(
          this.x + dx + this.w * 0.7, this.y,
          this.x + dx + this.w * 0.4, this.y + this.h,
          crackColor, 1
        );
      }
    } else {
      const fillColor = alpha < 1
        ? '#444466' + Math.round(alpha * 255).toString(16).padStart(2, '0')
        : '#444466';
      const strokeColor = alpha < 1
        ? '#6666aa' + Math.round(alpha * 255).toString(16).padStart(2, '0')
        : '#6666aa';
      renderer.fillRect(this.x + dx, this.y, this.w, this.h, fillColor);
      renderer.fillRect(this.x + dx, this.y, this.w, 1, strokeColor);
      renderer.fillRect(this.x + dx, this.y + this.h - 1, this.w, 1, strokeColor);
      renderer.fillRect(this.x + dx, this.y, 1, this.h, strokeColor);
      renderer.fillRect(this.x + dx + this.w - 1, this.y, 1, this.h, strokeColor);
    }
  }
}

// ── Particle ──

class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = 2 + Math.random() * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life--;
  }

  draw(renderer) {
    const a = Math.max(0, this.life / this.maxLife);
    // Build #rrggbbaa color string
    const base = this.color.startsWith('#') ? this.color.slice(1) : 'ffffff';
    const hex6 = base.length === 3
      ? base[0]+base[0]+base[1]+base[1]+base[2]+base[2]
      : base.slice(0, 6);
    const aa = Math.round(a * 255).toString(16).padStart(2, '0');
    renderer.fillRect(
      this.x - this.size / 2, this.y - this.size / 2,
      this.size, this.size,
      '#' + hex6 + aa
    );
  }
}

// ── Projectile ──

class Projectile {
  constructor(x, y, vx, vy, type, owner) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.type = type; this.owner = owner;
    this.life = type === 'laser' ? 15 : (type === 'grenade' ? 90 : 60);
    this.bounces = 0;
    this.radius = type === 'grenade' ? 4 : 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.type === 'grenade') {
      this.vy += GRAVITY * 0.6;
      for (const p of platforms) {
        if (p.dead) continue;
        if (this.x > p.x && this.x < p.x + p.w &&
            this.y + this.radius > p.y && this.y - this.radius < p.y + p.h) {
          this.vy = -Math.abs(this.vy) * 0.6;
          this.y = p.y - this.radius;
          this.bounces++;
        }
      }
    }
    this.life--;
    if (this.x < -20 || this.x > W + 20 || this.y > H + 20) this.life = 0;
  }

  draw(renderer) {
    if (this.type === 'bullet') {
      renderer.setGlow('#ff0', 0.8);
      renderer.fillCircle(this.x, this.y, 3, '#ff0');
      renderer.setGlow(null);
    } else if (this.type === 'grenade') {
      renderer.fillCircle(this.x, this.y, 4, '#0a0');
      // Stroke ring
      renderer.drawLine(this.x - 4, this.y, this.x + 4, this.y, '#0f0', 1);
      renderer.drawLine(this.x, this.y - 4, this.x, this.y + 4, '#0f0', 1);
    } else if (this.type === 'laser') {
      renderer.setGlow('#f0f', 1.0);
      renderer.drawLine(
        this.x - this.vx * 3, this.y - this.vy * 3,
        this.x, this.y,
        '#f0f', 3
      );
      renderer.setGlow(null);
    }
  }

  explode() {
    if (this.type === 'grenade') {
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        particles.push(new Particle(this.x, this.y, Math.cos(a) * s, Math.sin(a) * s, '#f80', 25));
      }
      const blastR = 60;
      for (const p of players) {
        if (p.dead) continue;
        const dx = (p.x + PLAYER_W / 2) - this.x;
        const dy = (p.y + PLAYER_H / 2) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < blastR) {
          const dmg = Math.floor(40 * (1 - dist / blastR));
          p.takeDamage(dmg, this.owner, dx > 0 ? 1 : -1);
        }
      }
      for (const pl of platforms) {
        if (pl.dead) continue;
        const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
        const dist = Math.sqrt((cx - this.x) ** 2 + (cy - this.y) ** 2);
        if (dist < blastR && pl.type === 'crumble') {
          pl.dead = true;
          for (let i = 0; i < 6; i++) {
            particles.push(new Particle(cx, cy, (Math.random() - 0.5) * 4, -Math.random() * 3, '#886', 20));
          }
        }
      }
    }
  }
}

// ── WeaponPickup ──

class WeaponPickup {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.vy = 0;
    this.grounded = false;
    this.timer = 0;
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  update() {
    this.timer++;
    if (!this.grounded) {
      this.vy += GRAVITY;
      this.y += this.vy;
      for (const p of platforms) {
        if (p.dead) continue;
        if (this.x > p.x - 6 && this.x < p.x + p.w + 6 &&
            this.y + 6 > p.y && this.y < p.y + p.h) {
          this.y = p.y - 6;
          this.vy = 0;
          this.grounded = true;
        }
      }
      if (this.y > H) this.grounded = true;
    }
  }

  draw(renderer) {
    if (this.y > H) return;
    const by = Math.sin(this.timer * 0.05 + this.bobOffset) * 2;
    const colors = { sword: '#aaf', gun: '#ff4', grenade: '#0f0', laser: '#f0f' };
    const col = colors[this.type] || '#fff';

    renderer.setGlow(col, 0.5);
    if (this.type === 'sword') {
      renderer.fillRect(this.x - 1, this.y - 10 + by, 3, 14, col);
      renderer.fillRect(this.x - 3, this.y + 2 + by, 7, 3, '#664');
    } else if (this.type === 'gun') {
      renderer.fillRect(this.x - 6, this.y - 2 + by, 12, 4, col);
      renderer.fillRect(this.x - 2, this.y + 2 + by, 4, 5, col);
    } else if (this.type === 'grenade') {
      renderer.fillCircle(this.x, this.y + by, 5, col);
    } else if (this.type === 'laser') {
      renderer.fillRect(this.x - 7, this.y - 2 + by, 14, 4, col);
      renderer.fillRect(this.x + 5, this.y - 3 + by, 3, 6, '#a0a');
    }
    renderer.setGlow(null);
  }
}

// ── Fighter ──

class Fighter {
  constructor(x, y, idx, isAI) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.idx = idx;
    this.isAI = isAI;
    this.color = COLORS[idx];
    this.hp = 100;
    this.dead = false;
    this.facing = idx === 0 ? 1 : -1;
    this.grounded = false;
    this.weapon = null;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.hitTimer = 0;
    this.specialCooldown = 0;
    this.animFrame = 0;
    this.walkCycle = 0;
    this.deathTimer = 0;
    this.score = 0;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.onPlatform = null;
    // AI state
    this.aiTarget = null;
    this.aiAction = 'idle';
    this.aiTimer = 0;
    this.aiJumpTimer = 0;
    this.aiAttackTimer = 0;
    this.aiPickupTarget = null;
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = 100;
    this.dead = false;
    this.weapon = null;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.hitTimer = 0;
    this.specialCooldown = 0;
    this.deathTimer = 0;
    this.jumpCount = 0;
    this.onPlatform = null;
    this.grounded = false;
  }

  takeDamage(dmg, attacker, dir) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hitTimer = 10;
    this.vx = dir * 5;
    this.vy = -3;
    for (let i = 0; i < 6; i++) {
      particles.push(new Particle(
        this.x + PLAYER_W / 2, this.y + PLAYER_H / 3,
        (Math.random() - 0.5) * 5 + dir * 2, (Math.random() - 0.5) * 4,
        this.color, 15
      ));
    }
    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(killer) {
    this.dead = true;
    this.deathTimer = 60;
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        this.x + PLAYER_W / 2, this.y + PLAYER_H / 2,
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 2,
        this.color, 30
      ));
    }
    if (killer !== undefined && killer !== this.idx) {
      const k = players[killer];
      if (k) {
        k.score++;
        if (killer === 0) {
          totalKills++;
          killCountEl.textContent = totalKills;
        }
      }
    }
    if (this.weapon) {
      weaponPickups.push(new WeaponPickup(this.x + PLAYER_W / 2, this.y, this.weapon.type));
      this.weapon = null;
    }
  }

  pickup() {
    if (this.weapon) {
      this.throwWeapon();
      return;
    }
    let best = null, bestD = 30;
    for (let i = 0; i < weaponPickups.length; i++) {
      const wp = weaponPickups[i];
      const dx = (this.x + PLAYER_W / 2) - wp.x;
      const dy = (this.y + PLAYER_H / 2) - wp.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best !== null) {
      const wp = weaponPickups[best];
      const ammo = { sword: 999, gun: 6, grenade: 3, laser: 4 };
      this.weapon = { type: wp.type, ammo: ammo[wp.type] };
      weaponPickups.splice(best, 1);
    }
  }

  throwWeapon() {
    if (!this.weapon) return;
    projectiles.push(new Projectile(
      this.x + PLAYER_W / 2 + this.facing * 10, this.y + PLAYER_H / 3,
      this.facing * 8, -1,
      this.weapon.type === 'grenade' ? 'grenade' : 'bullet', this.idx
    ));
    this.weapon = null;
  }

  attack() {
    if (this.attackCooldown > 0) return;
    this.attackTimer = 12;

    if (!this.weapon) {
      this.attackCooldown = 18;
      const punchX = this.x + PLAYER_W / 2 + this.facing * 20;
      const punchY = this.y + PLAYER_H / 3;
      for (const p of players) {
        if (p.idx === this.idx || p.dead) continue;
        const dx = (p.x + PLAYER_W / 2) - punchX;
        const dy = (p.y + PLAYER_H / 2) - punchY;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 22) {
          p.takeDamage(12, this.idx, this.facing);
        }
      }
      particles.push(new Particle(punchX, punchY, this.facing * 2, 0, '#ff4', 8));
    } else if (this.weapon.type === 'sword') {
      this.attackCooldown = 14;
      const range = 30;
      const sx = this.x + PLAYER_W / 2 + this.facing * range / 2;
      const sy = this.y + PLAYER_H / 3;
      for (const p of players) {
        if (p.idx === this.idx || p.dead) continue;
        const dx = (p.x + PLAYER_W / 2) - sx;
        const dy = (p.y + PLAYER_H / 2) - sy;
        if (Math.abs(dx) < range && Math.abs(dy) < 24) {
          p.takeDamage(22, this.idx, this.facing);
        }
      }
      for (let i = 0; i < 4; i++) {
        particles.push(new Particle(
          sx + Math.random() * 10 * this.facing, sy + (Math.random() - 0.5) * 20,
          this.facing * 3, (Math.random() - 0.5) * 2, '#aaf', 10
        ));
      }
    } else if (this.weapon.type === 'gun') {
      this.attackCooldown = 12;
      this.weapon.ammo--;
      projectiles.push(new Projectile(
        this.x + PLAYER_W / 2 + this.facing * 12, this.y + PLAYER_H / 3,
        this.facing * 10, 0, 'bullet', this.idx
      ));
      if (this.weapon.ammo <= 0) this.weapon = null;
    } else if (this.weapon.type === 'grenade') {
      this.attackCooldown = 30;
      this.weapon.ammo--;
      projectiles.push(new Projectile(
        this.x + PLAYER_W / 2 + this.facing * 10, this.y,
        this.facing * 5, -4, 'grenade', this.idx
      ));
      if (this.weapon.ammo <= 0) this.weapon = null;
    } else if (this.weapon.type === 'laser') {
      this.attackCooldown = 20;
      this.weapon.ammo--;
      projectiles.push(new Projectile(
        this.x + PLAYER_W / 2 + this.facing * 12, this.y + PLAYER_H / 3,
        this.facing * 14, 0, 'laser', this.idx
      ));
      if (this.weapon.ammo <= 0) this.weapon = null;
    }
  }

  special() {
    if (this.specialCooldown > 0) return;
    this.specialCooldown = 60;
    this.vx = this.facing * 12;
    this.vy = -2;
    this.attackTimer = 15;
    const sx = this.x + PLAYER_W / 2;
    const sy = this.y + PLAYER_H / 2;
    for (const p of players) {
      if (p.idx === this.idx || p.dead) continue;
      const dx = (p.x + PLAYER_W / 2) - sx;
      const dy = (p.y + PLAYER_H / 2) - sy;
      if (Math.abs(dy) < 24 && dx * this.facing > 0 && Math.abs(dx) < 50) {
        p.takeDamage(18, this.idx, this.facing);
      }
    }
    for (let i = 0; i < 8; i++) {
      particles.push(new Particle(
        sx, sy,
        -this.facing * (1 + Math.random() * 2), (Math.random() - 0.5) * 3,
        '#ff4', 12
      ));
    }
  }

  updateAI() {
    this.aiTimer++;
    let closest = null, closestD = Infinity;
    for (const p of players) {
      if (p.idx === this.idx || p.dead) continue;
      const d = Math.abs(p.x - this.x) + Math.abs(p.y - this.y);
      if (d < closestD) { closestD = d; closest = p; }
    }
    this.aiTarget = closest;

    if (!this.weapon && weaponPickups.length > 0) {
      let bestPick = null, bestPickD = Infinity;
      for (const wp of weaponPickups) {
        if (wp.y > H) continue;
        const d = Math.abs(wp.x - this.x) + Math.abs(wp.y - this.y);
        if (d < bestPickD) { bestPickD = d; bestPick = wp; }
      }
      if (bestPick && bestPickD < 150) {
        this.aiPickupTarget = bestPick;
        const dx = bestPick.x - (this.x + PLAYER_W / 2);
        if (Math.abs(dx) > 8) {
          this.vx = dx > 0 ? MOVE_SPEED : -MOVE_SPEED;
          this.facing = dx > 0 ? 1 : -1;
        }
        if (bestPick.y < this.y - 20 && this.grounded && this.aiJumpTimer <= 0) {
          this.vy = JUMP_FORCE;
          this.grounded = false;
          this.jumpCount = 1;
          this.aiJumpTimer = 20;
        }
        if (Math.abs(dx) < 25 && Math.abs(bestPick.y - this.y) < 30) {
          this.pickup();
          this.aiPickupTarget = null;
        }
        this.aiJumpTimer--;
        return;
      }
    }

    if (!closest) return;

    const dx = closest.x - this.x;
    const dy = closest.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.facing = dx > 0 ? 1 : -1;

    // Avoid lava
    if (this.y + PLAYER_H > lavaY - 40) {
      if (this.grounded && this.aiJumpTimer <= 0) {
        this.vy = JUMP_FORCE;
        this.grounded = false;
        this.jumpCount = 1;
        this.aiJumpTimer = 15;
      } else if (!this.grounded && this.jumpCount < this.maxJumps && this.aiJumpTimer <= 0) {
        this.vy = JUMP_FORCE;
        this.jumpCount++;
        this.aiJumpTimer = 15;
      }
      const cx = W / 2 - this.x;
      this.vx = cx > 0 ? MOVE_SPEED : -MOVE_SPEED;
      this.aiJumpTimer--;
      return;
    }

    // Navigate platforms
    for (const pl of platforms) {
      if (pl.dead) continue;
      if (this.x + PLAYER_W > pl.x && this.x < pl.x + pl.w &&
          Math.abs((this.y + PLAYER_H) - pl.y) < 5) {
        if (pl.crumbling && pl.crumbleTimer > CRUMBLE_TIME * 0.6) {
          if (this.aiJumpTimer <= 0) {
            this.vy = JUMP_FORCE;
            this.grounded = false;
            this.jumpCount = 1;
            this.aiJumpTimer = 15;
            this.vx = (Math.random() > 0.5 ? 1 : -1) * MOVE_SPEED;
          }
        }
        break;
      }
    }

    // Combat
    if (dist < 35 && !this.weapon) {
      if (this.aiAttackTimer <= 0) {
        this.attack();
        this.aiAttackTimer = 15 + Math.random() * 10;
      }
      if (Math.random() < 0.02) this.vx = -this.facing * MOVE_SPEED;
    } else if (dist < 50 && this.weapon && this.weapon.type === 'sword') {
      if (this.aiAttackTimer <= 0) {
        this.attack();
        this.aiAttackTimer = 12 + Math.random() * 8;
      }
    } else if (this.weapon && (this.weapon.type === 'gun' || this.weapon.type === 'laser') && dist < 250 && Math.abs(dy) < 40) {
      if (this.aiAttackTimer <= 0) {
        this.attack();
        this.aiAttackTimer = 15 + Math.random() * 15;
      }
    } else if (this.weapon && this.weapon.type === 'grenade' && dist < 200 && dist > 60) {
      if (this.aiAttackTimer <= 0) {
        this.attack();
        this.aiAttackTimer = 30 + Math.random() * 20;
      }
    } else {
      if (Math.abs(dx) > 25) this.vx = dx > 0 ? MOVE_SPEED : -MOVE_SPEED;
    }

    if (dy < -30 && this.grounded && this.aiJumpTimer <= 0) {
      this.vy = JUMP_FORCE;
      this.grounded = false;
      this.jumpCount = 1;
      this.aiJumpTimer = 25;
    }
    if (dist < 60 && Math.random() < 0.03 && this.grounded && this.aiJumpTimer <= 0) {
      this.vy = JUMP_FORCE;
      this.grounded = false;
      this.jumpCount = 1;
      this.aiJumpTimer = 20;
    }
    if (dist < 80 && dist > 30 && this.specialCooldown <= 0 && Math.random() < 0.01) {
      this.special();
    }
    if (!this.grounded && this.vy > 0 && this.y + PLAYER_H > lavaY - 60 && this.jumpCount < this.maxJumps && this.aiJumpTimer <= 0) {
      this.vy = JUMP_FORCE;
      this.jumpCount++;
      this.aiJumpTimer = 15;
    }

    this.aiJumpTimer--;
    this.aiAttackTimer--;
  }

  update(input) {
    if (this.dead) {
      this.deathTimer--;
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.hitTimer > 0) this.hitTimer--;
    if (this.attackTimer > 0) this.attackTimer--;

    if (this.isAI) {
      this.updateAI();
    } else {
      if (input.isDown('ArrowLeft')) {
        this.vx = -MOVE_SPEED;
        this.facing = -1;
      } else if (input.isDown('ArrowRight')) {
        this.vx = MOVE_SPEED;
        this.facing = 1;
      }
      if (input.wasPressed('ArrowUp') && this.jumpCount < this.maxJumps) {
        this.vy = JUMP_FORCE;
        this.grounded = false;
        this.jumpCount++;
      }
      if (input.wasPressed('z')) this.attack();
      if (input.wasPressed('x')) this.pickup();
      if (input.wasPressed('c')) this.special();
    }

    // Physics
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.85;

    // Platform collisions
    this.grounded = false;
    this.onPlatform = null;
    for (const p of platforms) {
      if (p.dead) continue;
      if (this.vy >= 0 &&
          this.x + PLAYER_W > p.x && this.x < p.x + p.w &&
          this.y + PLAYER_H > p.y && this.y + PLAYER_H - this.vy <= p.y + 4) {
        this.y = p.y - PLAYER_H;
        this.vy = 0;
        this.grounded = true;
        this.jumpCount = 0;
        this.onPlatform = p;
        if (p.type === 'crumble' && !p.crumbling) p.crumbling = true;
      }
    }

    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + PLAYER_W > W) { this.x = W - PLAYER_W; this.vx = 0; }

    // Lava death
    if (this.y + PLAYER_H > lavaY) {
      this.hp = 0;
      let killer = this.idx;
      let minD = Infinity;
      for (const p of players) {
        if (p.idx === this.idx || p.dead) continue;
        const d = Math.abs(p.x - this.x);
        if (d < minD) { minD = d; killer = p.idx; }
      }
      this.die(killer);
    }

    // Fall death
    if (this.y > H + 50 && !this.dead) {
      let killer = this.idx;
      let minD = Infinity;
      for (const p of players) {
        if (p.idx === this.idx || p.dead) continue;
        const d = Math.abs(p.x - this.x);
        if (d < minD) { minD = d; killer = p.idx; }
      }
      this.die(killer);
    }

    if (this.grounded && Math.abs(this.vx) > 0.5) {
      this.walkCycle += 0.2;
    } else {
      this.walkCycle = 0;
    }
  }

  draw(renderer, text) {
    if (this.dead) return;
    const cx = this.x + PLAYER_W / 2;
    const cy = this.y;

    const col = this.hitTimer > 0 && this.hitTimer % 3 === 0 ? '#fff' : this.color;

    // Head (circle outline)
    renderer.setGlow(col, 0.3);
    renderer.strokePoly(buildCirclePoly(cx, cy + 5, 5, 10), col, 2.0);

    // Body
    renderer.drawLine(cx, cy + 10, cx, cy + 22, col, 2.5);

    // Legs
    const legSwing = this.grounded ? Math.sin(this.walkCycle) * 6 : -4;
    const legSwingB = this.grounded ? Math.sin(this.walkCycle + Math.PI) * 6 : 4;
    renderer.drawLine(cx, cy + 22, cx + legSwing, cy + PLAYER_H, col, 2.5);
    renderer.drawLine(cx, cy + 22, cx + legSwingB, cy + PLAYER_H, col, 2.5);

    // Arms
    const armY = cy + 13;
    if (this.attackTimer > 0) {
      renderer.drawLine(cx, armY, cx + this.facing * 16, armY - 2, col, 2.5);
      renderer.drawLine(cx, armY, cx - this.facing * 6, armY + 4, col, 2.5);
      if (this.weapon) {
        if (this.weapon.type === 'sword') {
          renderer.drawLine(
            cx + this.facing * 16, armY - 2,
            cx + this.facing * 30, armY - 8,
            '#aaf', 2
          );
          // Slash arc approximated as a short arc poly
          const arcPts = buildArcPoly(cx + this.facing * 16, armY, 14, -Math.PI * 0.6, Math.PI * 0.3, 8);
          renderer.strokePoly(arcPts, '#aaaaff66', 4, false);
        }
      } else {
        // Punch effect
        renderer.setGlow('#ff4', 0.8);
        renderer.fillCircle(cx + this.facing * 18, armY - 2, 3, '#ff4');
        renderer.setGlow(null);
      }
    } else {
      const armSwing = Math.sin(this.walkCycle) * 4;
      renderer.drawLine(cx, armY, cx + this.facing * 6 + armSwing, armY + 6, col, 2.5);
      renderer.drawLine(cx, armY, cx - this.facing * 3 - armSwing, armY + 6, col, 2.5);
      if (this.weapon) drawHeldWeapon(renderer, this.weapon, cx, armY, this.facing);
    }

    renderer.setGlow(null);

    // HP bar
    const hpW = 24;
    const hpX = cx - hpW / 2;
    const hpY = cy - 10;
    renderer.fillRect(hpX, hpY, hpW, 3, '#300');
    const hpFrac = Math.max(0, this.hp / 100);
    const hpCol = hpFrac > 0.5 ? '#0f0' : hpFrac > 0.25 ? '#ff0' : '#f00';
    renderer.fillRect(hpX, hpY, hpW * hpFrac, 3, hpCol);

    // Player label
    text.drawText(this.isAI ? 'CPU' + this.idx : 'P1', cx, cy - 15, 8, col, 'center');
  }
}

// ── Geometry helpers ──

function buildCirclePoly(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function buildArcPoly(cx, cy, r, startAngle, endAngle, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segments);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawHeldWeapon(renderer, weapon, cx, armY, facing) {
  if (weapon.type === 'sword') {
    renderer.drawLine(
      cx + facing * 6, armY + 4,
      cx + facing * 18, armY - 6,
      '#aaf', 2
    );
  } else if (weapon.type === 'gun') {
    renderer.fillRect(cx + (facing > 0 ? 4 : -16), armY + 1, 12, 3, '#ff4');
  } else if (weapon.type === 'grenade') {
    renderer.fillCircle(cx + facing * 8, armY + 4, 3, '#0f0');
  } else if (weapon.type === 'laser') {
    renderer.fillRect(cx + (facing > 0 ? 4 : -18), armY + 1, 14, 3, '#f0f');
    renderer.fillRect(cx + (facing > 0 ? 16 : -19), armY, 3, 5, '#a0a');
  }
}

// ── Level generation ──

function generatePlatforms() {
  platforms = [];
  platforms.push(new Platform(0, H - 20, W, 30, 'normal'));

  const layouts = [
    [
      [80, 310, 120, 10, 'crumble'],
      [400, 310, 120, 10, 'crumble'],
      [220, 270, 160, 10, 'normal'],
      [50, 220, 100, 10, 'crumble'],
      [450, 220, 100, 10, 'crumble'],
      [180, 170, 80, 10, 'normal'],
      [340, 170, 80, 10, 'normal'],
      [250, 120, 100, 10, 'crumble'],
    ],
    [
      [30, 320, 100, 10, 'normal'],
      [160, 280, 100, 10, 'crumble'],
      [290, 240, 100, 10, 'normal'],
      [420, 200, 100, 10, 'crumble'],
      [290, 160, 100, 10, 'crumble'],
      [160, 120, 100, 10, 'normal'],
      [30, 170, 80, 10, 'crumble'],
      [500, 280, 80, 10, 'normal'],
    ],
    [
      [100, 300, 80, 10, 'crumble'],
      [260, 300, 80, 10, 'crumble'],
      [420, 300, 80, 10, 'crumble'],
      [50, 220, 70, 10, 'normal'],
      [200, 200, 90, 10, 'crumble'],
      [350, 220, 70, 10, 'normal'],
      [500, 200, 70, 10, 'crumble'],
      [270, 140, 60, 10, 'normal'],
      [130, 140, 60, 10, 'crumble'],
      [410, 140, 60, 10, 'crumble'],
    ],
  ];

  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  for (const p of layout) {
    platforms.push(new Platform(p[0], p[1], p[2], p[3], p[4]));
  }
}

function spawnWeapons() {
  weaponPickups = [];
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const x = 50 + Math.random() * (W - 100);
    const y = 50 + Math.random() * 100;
    weaponPickups.push(new WeaponPickup(x, y, type));
  }
}

function spawnWeaponPeriodic() {
  if (Math.random() < 0.005 && weaponPickups.length < 5) {
    const type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const x = 50 + Math.random() * (W - 100);
    weaponPickups.push(new WeaponPickup(x, 20, type));
  }
}

function initRound() {
  roundNum++;
  roundNumEl.textContent = roundNum;
  roundTimer = 0;
  roundOver = false;
  roundOverTimer = 0;
  lavaY = H + 50;
  projectiles = [];
  particles = [];

  generatePlatforms();
  spawnWeapons();

  const spawns = [
    [80, H - 60],
    [W - 100, H - 60],
    [200, H - 60],
    [W - 220, H - 60],
  ];

  if (players.length === 0) {
    players = [];
    players.push(new Fighter(spawns[0][0], spawns[0][1], 0, false));
    for (let i = 1; i < 4; i++) {
      players.push(new Fighter(spawns[i][0], spawns[i][1], i, true));
    }
  } else {
    for (let i = 0; i < players.length; i++) {
      players[i].reset(spawns[i][0], spawns[i][1]);
    }
  }
}

function startMatch(game) {
  score = 0;
  totalKills = 0;
  roundNum = 0;
  matchOver = false;
  killCountEl.textContent = '0';
  players = [];
  for (let i = 0; i < 4; i++) {
    players.push(new Fighter(0, 0, i, i !== 0));
    players[i].score = 0;
  }
  p1ScoreEl.textContent = '0';
  initRound();
  game.setState('playing');
}

function checkRoundEnd() {
  const alive = players.filter(p => !p.dead);
  if (alive.length <= 1) {
    if (!roundOver) {
      roundOver = true;
      roundOverTimer = 90;
      if (alive.length === 1) {
        alive[0].score++;
        if (alive[0].idx === 0) {
          totalKills++;
          killCountEl.textContent = totalKills;
        }
      }
    }
  }
}

function checkMatchEnd(game) {
  for (const p of players) {
    if (p.score >= WIN_SCORE) {
      matchOver = true;
      score = players[0].score;
      p1ScoreEl.textContent = score;
      const winner = p.idx === 0 ? 'YOU WIN!' : 'CPU' + p.idx + ' WINS!';
      game.setState('over');
      game.showOverlay(winner, 'Score: ' + players[0].score + ' | Kills: ' + totalKills + ' | Click to play again');
      return true;
    }
  }
  return false;
}

// ── Draw helpers ──

function drawBackground(renderer) {
  // Dark gradient approximated with two overlapping rects
  renderer.fillRect(0, 0, W, H, '#0a0a1e');
  renderer.fillRect(0, H * 0.5, W, H * 0.5, '#1a1a2e80');

  // Subtle grid lines
  for (let x = 0; x < W; x += 30) {
    renderer.drawLine(x, 0, x, H, '#ff440008', 1);
  }
  for (let y = 0; y < H; y += 30) {
    renderer.drawLine(0, y, W, y, '#ff440008', 1);
  }
}

function drawLava(renderer, text) {
  if (lavaY >= H + 50) return;

  // Lava body gradient (approximated with tinted rects)
  const lavaHeight = H - lavaY + 10;
  renderer.fillRect(0, lavaY, W, lavaHeight * 0.3, '#f80');
  renderer.fillRect(0, lavaY + lavaHeight * 0.3, W, lavaHeight * 0.7, '#800');

  // Lava surface wave
  renderer.setGlow('#f80', 0.8);
  const wavePts = [];
  for (let x = 0; x <= W; x += 4) {
    const wavY = lavaY + Math.sin((x + roundTimer * 2) * 0.03) * 3;
    wavePts.push({ x, y: wavY });
  }
  renderer.strokePoly(wavePts, '#ff0', 2, false);
  renderer.setGlow(null);
}

function drawHUD(renderer, text) {
  // Player scores
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const x = 10 + i * 150;
    const col = p.dead ? '#555' : p.color;
    const label = i === 0 ? 'P1' : 'CPU' + i;
    const wepStr = p.weapon ? ' [' + p.weapon.type[0].toUpperCase() + ':' + p.weapon.ammo + ']' : '';
    text.drawText(label + ': ' + p.score + '/' + WIN_SCORE + wepStr, x, 2, 11, col, 'left');
  }

  // Lava warning
  if (roundTimer > 400 && roundTimer < 480 && roundTimer % 30 < 15) {
    renderer.setGlow('#f80', 0.8);
    text.drawText('!! LAVA RISING SOON !!', W / 2, 20, 12, '#f80', 'center');
    renderer.setGlow(null);
  }

  // Round over text
  if (roundOver) {
    const alive = players.filter(p => !p.dead);
    const txt = alive.length === 1
      ? (alive[0].idx === 0 ? 'YOU WIN THE ROUND!' : 'CPU' + alive[0].idx + ' WINS!')
      : 'DRAW!';
    renderer.setGlow('#ff4', 1.0);
    text.drawText(txt, W / 2, H / 2 - 20, 20, '#ff4', 'center');
    renderer.setGlow(null);
    text.drawText('Next round starting...', W / 2, H / 2 + 10, 12, '#aaa', 'center');
  }

  // Special cooldown indicator for player 0
  if (players.length > 0 && !players[0].dead) {
    if (players[0].specialCooldown > 0) {
      renderer.fillRect(10, H - 12, 50, 6, '#444');
      const frac = 1 - players[0].specialCooldown / 60;
      renderer.fillRect(10, H - 12, 50 * frac, 6, frac >= 1 ? '#ff4' : '#884');
      text.drawText('DASH', 12, H - 11, 8, '#888', 'left');
    } else {
      text.drawText('[C] DASH READY', 10, H - 11, 8, '#ff4', 'left');
    }
  }
}

// ── Main export ──

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('STICK FIGHT ONLINE', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse click on canvas to start
  game.canvas.addEventListener('click', () => {
    if (game.state === 'waiting' || game.state === 'over') {
      startMatch(game);
    }
  });

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;

    const input = game.input;
    roundTimer++;

    // Lava rises after 8 seconds (480 frames at 60hz)
    if (roundTimer > 480) {
      lavaY -= LAVA_RISE_SPEED;
      if (roundTimer > 900) lavaY -= 0.1;
      if (roundTimer > 1200) lavaY -= 0.15;
    }

    for (const p of platforms) p.update();

    spawnWeaponPeriodic();
    for (const wp of weaponPickups) wp.update();
    weaponPickups = weaponPickups.filter(wp => wp.y < H + 10);

    for (const p of players) p.update(input);

    // Update projectiles
    const nextProjectiles = [];
    for (const pr of projectiles) {
      pr.update();
      if (pr.life <= 0) {
        pr.explode();
        continue;
      }
      // Check hit
      let hit = false;
      for (const p of players) {
        if (p.idx === pr.owner || p.dead) continue;
        const dx = (p.x + PLAYER_W / 2) - pr.x;
        const dy = (p.y + PLAYER_H / 2) - pr.y;
        const hitR = pr.type === 'grenade' ? 8 : 12;
        if (Math.abs(dx) < hitR && Math.abs(dy) < hitR + 5) {
          if (pr.type === 'bullet') {
            p.takeDamage(18, pr.owner, dx < 0 ? -1 : 1);
            pr.life = 0; hit = true; break;
          } else if (pr.type === 'laser') {
            p.takeDamage(25, pr.owner, dx < 0 ? -1 : 1);
            pr.life = 0; hit = true; break;
          }
          // grenade only explodes on timer
        }
      }
      if (pr.type === 'grenade' && pr.life <= 1) { pr.explode(); continue; }
      if (pr.life > 0 && !hit) nextProjectiles.push(pr);
    }
    projectiles = nextProjectiles;

    for (const p of particles) p.update();
    particles = particles.filter(p => p.life > 0);

    checkRoundEnd();

    if (roundOver) {
      roundOverTimer--;
      if (roundOverTimer <= 0) {
        if (!checkMatchEnd(game)) {
          initRound();
        }
      }
    }

    // Update score display
    if (players.length > 0) p1ScoreEl.textContent = players[0].score;
  };

  game.onDraw = (renderer, text) => {
    drawBackground(renderer);

    for (const p of platforms) p.draw(renderer);
    for (const wp of weaponPickups) wp.draw(renderer);
    for (const pr of projectiles) pr.draw(renderer);
    for (const p of particles) p.draw(renderer);

    drawLava(renderer, text);

    for (const p of players) p.draw(renderer, text);

    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
