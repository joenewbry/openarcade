import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = game.width;
  const H = game.height;

  // ---- Constants ----
  const BASE_X = W / 2, BASE_Y = H / 2;
  const BASE_RADIUS = 28;
  const PLAYER_RADIUS = 8;
  const ZOMBIE_RADIUS = 7;
  const BULLET_RADIUS = 2;
  const BARRICADE_W = 24, BARRICADE_H = 8;
  const TURRET_RADIUS = 7;
  const GRENADE_RADIUS = 3;
  const GRENADE_EXPLODE_RADIUS = 40;
  const SCRAP_PER_KILL = 1;
  const BARRICADE_COST = 5;
  const BARRICADE_HP = 60;

  const WEAPONS = {
    pistol:  { name: 'Pistol',  damage: 15, fireRate: 0.35, spread: 0.03, bullets: 1, speed: 400, maxAmmo: Infinity, reloadTime: 0 },
    shotgun: { name: 'Shotgun', damage: 10, fireRate: 0.7,  spread: 0.15, bullets: 5, speed: 350, maxAmmo: 24,       reloadTime: 1.2 },
    rifle:   { name: 'Rifle',   damage: 12, fireRate: 0.12, spread: 0.02, bullets: 1, speed: 500, maxAmmo: 60,       reloadTime: 1.5 },
  };

  // ---- State variables ----
  let score = 0;
  let gameState = 'menu'; // 'menu' | 'classSelect' | 'playing' | 'gameover'

  let player, ally, base;
  let zombies, bullets, barricades, turrets, grenades, particles, scrapDrops, healEffects;
  let wave, zombiesRemaining, waveTimer, spawnTimer, betweenWaves;
  let playerClass = 'soldier';

  // ---- Mouse state (attached directly to canvas) ----
  let mouseX = W / 2, mouseY = H / 2;
  let mouseDown = false;

  const canvas = game.canvas;

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('mousedown', e => {
    mouseDown = true;
    handleClick();
  });
  canvas.addEventListener('mouseup', () => { mouseDown = false; });

  // ---- HUD DOM elements ----
  const scoreEl    = document.getElementById('score');
  const waveEl     = document.getElementById('wave');
  const baseHpEl   = document.getElementById('baseHp');
  const playerHpEl = document.getElementById('playerHp');
  const ammoEl     = document.getElementById('ammo');
  const scrapEl    = document.getElementById('scrap');
  const allyHpEl   = document.getElementById('allyHp');
  const classInfoEl = document.getElementById('classInfo');

  // overlay DOM (managed by engine, but we also set innerHTML)
  const controlsText = document.getElementById('controlsText');

  function showClassSelect() {
    game.showOverlay('CHOOSE YOUR CLASS', '');
    if (controlsText) {
      controlsText.innerHTML =
        '<span style="color:#4a4">[M]</span> Medic: Q heals nearby allies<br>' +
        '<span style="color:#4a4">[N]</span> Engineer: Q places auto-turret<br>' +
        '<span style="color:#4a4">[S]</span> Soldier: Q throws grenade';
    }
    gameState = 'classSelect';
  }

  function handleClick() {
    if (gameState === 'menu') {
      showClassSelect();
    } else if (gameState === 'gameover') {
      showClassSelect();
    }
  }

  // ---- Keyboard handling (supplement engine input) ----
  document.addEventListener('keydown', e => {
    if (gameState === 'menu') {
      showClassSelect();
      return;
    }
    if (gameState === 'classSelect') {
      const k = e.key.toLowerCase();
      if (k === 'm') { playerClass = 'medic';    startGame(); }
      else if (k === 'n') { playerClass = 'engineer'; startGame(); }
      else if (k === 's') { playerClass = 'soldier';  startGame(); }
      return;
    }
    if (gameState === 'playing') {
      if (e.key === '1') switchWeapon('pistol');
      if (e.key === '2') switchWeapon('shotgun');
      if (e.key === '3') switchWeapon('rifle');
      const k = e.key.toLowerCase();
      if (k === 'r') startReload();
      if (k === 'e') buildBarricade();
      if (k === 'q') useAbility();
    }
  });

  // ---- Utility ----
  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  // ---- Player / Ally factory ----
  function makePlayer(x, y, cls, isAI) {
    return {
      x, y, hp: 100, maxHp: 100, speed: 100, radius: PLAYER_RADIUS,
      class: cls, isAI,
      weapon: 'pistol',
      ammo: { pistol: Infinity, shotgun: 24, rifle: 60 },
      maxAmmo: { pistol: Infinity, shotgun: 24, rifle: 60 },
      reloading: false, reloadTimer: 0,
      fireTimer: 0,
      angle: 0,
      scrap: 0,
      abilityCooldown: 0,
      invulnTimer: 0,
      alive: true,
    };
  }

  // ---- Start game ----
  function startGame() {
    score = 0;
    if (scoreEl) scoreEl.textContent = '0';
    player = makePlayer(BASE_X - 30, BASE_Y, playerClass, false);
    const allyClass = playerClass === 'soldier' ? 'medic' : (playerClass === 'medic' ? 'soldier' : 'soldier');
    ally = makePlayer(BASE_X + 30, BASE_Y, allyClass, true);
    base = { x: BASE_X, y: BASE_Y, hp: 100, maxHp: 100, radius: BASE_RADIUS };
    zombies = []; bullets = []; barricades = []; turrets = [];
    grenades = []; particles = []; scrapDrops = []; healEffects = [];
    wave = 0; zombiesRemaining = 0; waveTimer = 2; spawnTimer = 0; betweenWaves = true;
    if (classInfoEl) classInfoEl.textContent = playerClass.charAt(0).toUpperCase() + playerClass.slice(1);
    nextWave();
    gameState = 'playing';
    game.setState('playing');
    game.setScoreFn(() => score);
  }

  // ---- Waves ----
  function nextWave() {
    wave++;
    if (waveEl) waveEl.textContent = wave;
    const count = 5 + wave * 3 + Math.floor(wave * wave * 0.3);
    zombiesRemaining = count;
    spawnTimer = 0;
    betweenWaves = false;
    if (player) {
      player.ammo.shotgun = Math.min(player.maxAmmo.shotgun, player.ammo.shotgun + 8);
      player.ammo.rifle   = Math.min(player.maxAmmo.rifle,   player.ammo.rifle + 15);
    }
    if (ally) {
      ally.ammo.shotgun = Math.min(ally.maxAmmo.shotgun, ally.ammo.shotgun + 8);
      ally.ammo.rifle   = Math.min(ally.maxAmmo.rifle,   ally.ammo.rifle + 15);
    }
  }

  function spawnZombie() {
    const side = Math.random() * 4 | 0;
    let x, y;
    if (side === 0)      { x = -10;      y = Math.random() * H; }
    else if (side === 1) { x = W + 10;   y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = -10; }
    else                 { x = Math.random() * W; y = H + 10; }

    let type = 'normal';
    const r = Math.random();
    if (wave >= 3 && r < 0.15) type = 'fast';
    if (wave >= 5 && r < 0.08) type = 'tank';
    if (wave >= 7 && r < 0.05) type = 'boss';

    let hp, speed, damage, radius, color;
    switch (type) {
      case 'normal': hp = 20 + wave * 3; speed = 30 + Math.random() * 15; damage = 8;  radius = ZOMBIE_RADIUS; color = '#4a4'; break;
      case 'fast':   hp = 12 + wave * 2; speed = 60 + Math.random() * 20; damage = 5;  radius = 5;             color = '#8f8'; break;
      case 'tank':   hp = 60 + wave * 8; speed = 18 + Math.random() * 8;  damage = 15; radius = 10;            color = '#2a6'; break;
      case 'boss':   hp = 150 + wave*15;  speed = 22;                       damage = 25; radius = 14;            color = '#f44'; break;
    }

    zombies.push({
      x, y, hp, maxHp: hp, speed, damage, radius, color, type,
      attackTimer: 0, attackRate: 0.8,
      knockback: { x: 0, y: 0 },
      stunTimer: 0,
    });
  }

  // ---- Weapons ----
  function switchWeapon(wep) {
    if (player.reloading) return;
    player.weapon = wep;
  }

  function startReload() {
    if (player.reloading) return;
    const w = WEAPONS[player.weapon];
    if (w.maxAmmo === Infinity) return;
    if (player.ammo[player.weapon] >= w.maxAmmo) return;
    player.reloading = true;
    player.reloadTimer = w.reloadTime;
  }

  function fireBullet(shooter, targetX, targetY) {
    const w = WEAPONS[shooter.weapon];
    if (shooter.fireTimer > 0) return;
    if (shooter.reloading) return;
    if (shooter.ammo[shooter.weapon] <= 0 && w.maxAmmo !== Infinity) {
      shooter.reloading = true;
      shooter.reloadTimer = w.reloadTime;
      return;
    }
    shooter.fireTimer = w.fireRate;
    if (w.maxAmmo !== Infinity) shooter.ammo[shooter.weapon]--;

    const angle = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    for (let i = 0; i < w.bullets; i++) {
      const a = angle + (Math.random() - 0.5) * w.spread * 2;
      bullets.push({
        x: shooter.x, y: shooter.y,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        damage: w.damage,
        owner: shooter === player ? 'player' : 'ally',
        life: 1.2,
      });
    }
    particles.push({
      x: shooter.x + Math.cos(angle) * 10,
      y: shooter.y + Math.sin(angle) * 10,
      vx: 0, vy: 0, life: 0.08, maxLife: 0.08,
      color: '#ff8', radius: 4,
    });
  }

  // ---- Barricades ----
  function buildBarricade() {
    if (player.scrap < BARRICADE_COST) return;
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    const bx = player.x + Math.cos(angle) * 20;
    const by = player.y + Math.sin(angle) * 20;
    if (dist(bx, by, base.x, base.y) < BASE_RADIUS + 10) return;
    player.scrap -= BARRICADE_COST;
    barricades.push({ x: bx, y: by, w: BARRICADE_W, h: BARRICADE_H, hp: BARRICADE_HP, maxHp: BARRICADE_HP, angle });
  }

  // ---- Abilities ----
  function useAbility() {
    if (player.abilityCooldown > 0) return;
    doAbility(player);
  }

  function doAbility(p) {
    switch (p.class) {
      case 'medic': {
        p.abilityCooldown = 8;
        const healRange = 60;
        [player, ally].forEach(target => {
          if (!target.alive) return;
          if (dist(p.x, p.y, target.x, target.y) < healRange) {
            target.hp = Math.min(target.maxHp, target.hp + 30);
            healEffects.push({ x: target.x, y: target.y, timer: 0.6 });
          }
        });
        if (dist(p.x, p.y, base.x, base.y) < healRange + BASE_RADIUS) {
          base.hp = Math.min(base.maxHp, base.hp + 5);
          healEffects.push({ x: base.x, y: base.y, timer: 0.6 });
        }
        break;
      }
      case 'engineer': {
        if (turrets.length >= 4) turrets.shift();
        p.abilityCooldown = 12;
        const tx = p.x + (p.isAI ? (Math.random()-0.5)*30 : Math.cos(Math.atan2(mouseY-p.y, mouseX-p.x))*25);
        const ty = p.y + (p.isAI ? (Math.random()-0.5)*30 : Math.sin(Math.atan2(mouseY-p.y, mouseX-p.x))*25);
        turrets.push({ x: tx, y: ty, hp: 50, maxHp: 50, fireTimer: 0, fireRate: 0.5, damage: 8, range: 80, angle: 0 });
        break;
      }
      case 'soldier': {
        p.abilityCooldown = 6;
        let gx, gy;
        if (p.isAI) {
          let best = null, bestCount = 0;
          zombies.forEach(z => {
            const count = zombies.filter(z2 => dist(z.x, z.y, z2.x, z2.y) < GRENADE_EXPLODE_RADIUS).length;
            if (count > bestCount) { bestCount = count; best = z; }
          });
          if (best) { gx = best.x; gy = best.y; }
          else { gx = p.x + 50; gy = p.y; }
        } else {
          gx = mouseX; gy = mouseY;
        }
        grenades.push({ x: p.x, y: p.y, tx: gx, ty: gy, timer: 0.6, speed: 200 });
        break;
      }
    }
  }

  // ---- AI ally ----
  function updateAlly(dt) {
    if (!ally.alive) return;

    let nearestZombie = null, nearestDist = Infinity;
    let zombiesNearBase = 0, zombiesNearAlly = 0;
    zombies.forEach(z => {
      const d = dist(ally.x, ally.y, z.x, z.y);
      if (d < nearestDist) { nearestDist = d; nearestZombie = z; }
      if (dist(z.x, z.y, base.x, base.y) < 80) zombiesNearBase++;
      if (d < 60) zombiesNearAlly++;
    });

    const lowHp = ally.hp < 30;
    let targetX, targetY;
    if (lowHp && ally.class !== 'medic') {
      targetX = base.x + (ally.x > base.x ? 15 : -15);
      targetY = base.y + (ally.y > base.y ? 15 : -15);
    } else if (zombiesNearBase > 2) {
      if (nearestZombie) {
        const a = Math.atan2(nearestZombie.y - base.y, nearestZombie.x - base.x);
        targetX = base.x + Math.cos(a) * (BASE_RADIUS + 25);
        targetY = base.y + Math.sin(a) * (BASE_RADIUS + 25);
      } else { targetX = base.x + 25; targetY = base.y; }
    } else {
      const px = player.alive ? player.x : base.x;
      const py = player.alive ? player.y : base.y;
      const angleFromBase = Math.atan2(py - base.y, px - base.x);
      const patrolAngle = angleFromBase + Math.PI + Math.sin(performance.now() * 0.001) * 0.5;
      targetX = base.x + Math.cos(patrolAngle) * 55;
      targetY = base.y + Math.sin(patrolAngle) * 55;
    }

    const ddx = targetX - ally.x, ddy = targetY - ally.y;
    const dd = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dd > 3) {
      ally.x += (ddx / dd) * ally.speed * dt;
      ally.y += (ddy / dd) * ally.speed * dt;
    }
    ally.x = clamp(ally.x, 10, W - 10);
    ally.y = clamp(ally.y, 10, H - 10);

    if (nearestZombie && nearestDist < 150) {
      ally.angle = Math.atan2(nearestZombie.y - ally.y, nearestZombie.x - ally.x);
      if (nearestDist < 50 && ally.ammo.shotgun > 0) ally.weapon = 'shotgun';
      else if (ally.ammo.rifle > 0) ally.weapon = 'rifle';
      else ally.weapon = 'pistol';
      fireBullet(ally, nearestZombie.x, nearestZombie.y);
    }

    if (ally.abilityCooldown <= 0) {
      if (ally.class === 'medic') {
        if (ally.hp < 50 || (player.alive && player.hp < 50) || base.hp < 60) doAbility(ally);
      } else if (ally.class === 'engineer') {
        if (turrets.length < 2 && zombies.length > 3) doAbility(ally);
      } else if (ally.class === 'soldier') {
        if (zombiesNearBase >= 3 || zombiesNearAlly >= 4) doAbility(ally);
      }
    }

    if (ally.scrap >= BARRICADE_COST && zombiesNearBase >= 2 && barricades.length < 8 && Math.random() < 0.01) {
      const a = Math.atan2(
        (nearestZombie ? nearestZombie.y : ally.y + 20) - ally.y,
        (nearestZombie ? nearestZombie.x : ally.x + 20) - ally.x
      );
      const bx = ally.x + Math.cos(a) * 20;
      const by = ally.y + Math.sin(a) * 20;
      if (dist(bx, by, base.x, base.y) > BASE_RADIUS + 10) {
        ally.scrap -= BARRICADE_COST;
        barricades.push({ x: bx, y: by, w: BARRICADE_W, h: BARRICADE_H, hp: BARRICADE_HP, maxHp: BARRICADE_HP, angle: a });
      }
    }

    if (ally.scrap > 10 && player.alive && player.scrap < 3 && dist(ally.x, ally.y, player.x, player.y) < 40) {
      const give = Math.min(3, ally.scrap - 5);
      ally.scrap -= give;
      player.scrap += give;
    }

    ally.fireTimer = Math.max(0, ally.fireTimer - dt);
    if (ally.reloading) {
      ally.reloadTimer -= dt;
      if (ally.reloadTimer <= 0) {
        ally.reloading = false;
        ally.ammo[ally.weapon] = WEAPONS[ally.weapon].maxAmmo;
      }
    }
    if (ally.ammo[ally.weapon] <= 0 && WEAPONS[ally.weapon].maxAmmo !== Infinity && !ally.reloading) {
      ally.reloading = true;
      ally.reloadTimer = WEAPONS[ally.weapon].reloadTime;
    }
    ally.abilityCooldown = Math.max(0, ally.abilityCooldown - dt);
    ally.invulnTimer     = Math.max(0, ally.invulnTimer - dt);
  }

  // ---- Keys (engine input) ----
  function isDown(key) { return game.input.isDown(key); }

  // ---- Update ----
  game.onUpdate = (dtMs) => {
    const dt = dtMs / 1000;

    if (gameState !== 'playing') return;

    // Player movement
    if (player.alive) {
      let mx = 0, my = 0;
      if (isDown('w') || isDown('ArrowUp'))    my = -1;
      if (isDown('s') || isDown('ArrowDown'))  my = 1;
      if (isDown('a') || isDown('ArrowLeft'))  mx = -1;
      if (isDown('d') || isDown('ArrowRight')) mx = 1;
      if (mx || my) {
        const len = Math.sqrt(mx * mx + my * my);
        player.x += (mx / len) * player.speed * dt;
        player.y += (my / len) * player.speed * dt;
      }
      player.x = clamp(player.x, 10, W - 10);
      player.y = clamp(player.y, 10, H - 10);
      player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
      if (mouseDown) fireBullet(player, mouseX, mouseY);
      player.fireTimer = Math.max(0, player.fireTimer - dt);
      if (player.reloading) {
        player.reloadTimer -= dt;
        if (player.reloadTimer <= 0) {
          player.reloading = false;
          player.ammo[player.weapon] = WEAPONS[player.weapon].maxAmmo;
        }
      }
      player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
      player.invulnTimer     = Math.max(0, player.invulnTimer - dt);
    }

    updateAlly(dt);

    // Spawn
    if (!betweenWaves && zombiesRemaining > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        const spawnRate = Math.max(0.15, 0.8 - wave * 0.04);
        spawnTimer = spawnRate;
        spawnZombie();
        zombiesRemaining--;
      }
    }
    if (!betweenWaves && zombiesRemaining <= 0 && zombies.length === 0) {
      betweenWaves = true;
      waveTimer = 3;
    }
    if (betweenWaves) {
      waveTimer -= dt;
      if (waveTimer <= 0) nextWave();
    }

    // Zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      z.attackTimer = Math.max(0, z.attackTimer - dt);
      z.stunTimer   = Math.max(0, z.stunTimer - dt);

      if (Math.abs(z.knockback.x) > 0.1 || Math.abs(z.knockback.y) > 0.1) {
        z.x += z.knockback.x * dt * 8;
        z.y += z.knockback.y * dt * 8;
        z.knockback.x *= 0.9;
        z.knockback.y *= 0.9;
      }
      if (z.stunTimer > 0) continue;

      const targets = [];
      targets.push({ x: base.x, y: base.y, type: 'base', dist: dist(z.x, z.y, base.x, base.y) });
      if (player.alive) targets.push({ x: player.x, y: player.y, type: 'player', dist: dist(z.x, z.y, player.x, player.y) });
      if (ally.alive)   targets.push({ x: ally.x,   y: ally.y,   type: 'ally',   dist: dist(z.x, z.y, ally.x,   ally.y) });

      let best = null, bestDist = Infinity;
      targets.forEach(t => { if (t.dist < bestDist) { bestDist = t.dist; best = t; } });

      let blockedByBarricade = null;
      barricades.forEach(b => {
        const d = dist(z.x, z.y, b.x, b.y);
        if (d < 30 && d < bestDist) blockedByBarricade = b;
      });

      if (blockedByBarricade) {
        const b = blockedByBarricade;
        const d = dist(z.x, z.y, b.x, b.y);
        if (d < z.radius + 14) {
          if (z.attackTimer <= 0) {
            b.hp -= z.damage;
            z.attackTimer = z.attackRate;
            if (b.hp <= 0) {
              barricades.splice(barricades.indexOf(b), 1);
              for (let j = 0; j < 5; j++) {
                particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*80, vy: (Math.random()-0.5)*80, life: 0.5, maxLife: 0.5, color: '#864', radius: 3 });
              }
            }
          }
        } else {
          const ddx = b.x - z.x, ddy = b.y - z.y;
          const dd = Math.sqrt(ddx*ddx + ddy*ddy);
          z.x += (ddx / dd) * z.speed * dt;
          z.y += (ddy / dd) * z.speed * dt;
        }
      } else if (best) {
        const ddx = best.x - z.x, ddy = best.y - z.y;
        const dd = Math.sqrt(ddx * ddx + ddy * ddy);
        const hitDist = best.type === 'base' ? (z.radius + BASE_RADIUS) : (z.radius + PLAYER_RADIUS);
        if (dd > hitDist) {
          z.x += (ddx / dd) * z.speed * dt;
          z.y += (ddy / dd) * z.speed * dt;
        } else {
          if (z.attackTimer <= 0) {
            z.attackTimer = z.attackRate;
            if (best.type === 'base') {
              base.hp -= z.damage * 0.5;
            } else if (best.type === 'player' && player.invulnTimer <= 0) {
              player.hp -= z.damage;
              player.invulnTimer = 0.3;
            } else if (best.type === 'ally' && ally.invulnTimer <= 0) {
              ally.hp -= z.damage;
              ally.invulnTimer = 0.3;
            }
          }
        }
      }

      // Separation
      for (let j = i + 1; j < zombies.length; j++) {
        const z2 = zombies[j];
        const dd = dist(z.x, z.y, z2.x, z2.y);
        const minD = z.radius + z2.radius;
        if (dd < minD && dd > 0.1) {
          const push = (minD - dd) * 0.3;
          const nx = (z2.x - z.x) / dd, ny = (z2.y - z.y) / dd;
          z.x -= nx * push; z.y -= ny * push;
          z2.x += nx * push; z2.y += ny * push;
        }
      }
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        bullets.splice(i, 1);
        continue;
      }
      let hit = false;
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        if (dist(b.x, b.y, z.x, z.y) < z.radius + BULLET_RADIUS) {
          z.hp -= b.damage;
          const angle = Math.atan2(b.vy, b.vx);
          z.knockback.x += Math.cos(angle) * 15;
          z.knockback.y += Math.sin(angle) * 15;
          z.stunTimer = 0.05;
          particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40, life: 0.2, maxLife: 0.2, color: '#f84', radius: 2 });
          if (z.hp <= 0) {
            score++;
            if (scoreEl) scoreEl.textContent = score;
            for (let k = 0; k < 4; k++) {
              particles.push({ x: z.x, y: z.y, vx: (Math.random()-0.5)*60, vy: (Math.random()-0.5)*60, life: 0.4, maxLife: 0.4, color: '#4a4', radius: 3 });
            }
            const scrapAmt = SCRAP_PER_KILL + (z.type === 'boss' ? 5 : z.type === 'tank' ? 2 : 0);
            scrapDrops.push({ x: z.x, y: z.y, amount: scrapAmt, timer: 10 });
            zombies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }
      if (hit) bullets.splice(i, 1);
    }

    // Turrets
    for (let i = turrets.length - 1; i >= 0; i--) {
      const t = turrets[i];
      t.fireTimer = Math.max(0, t.fireTimer - dt);
      let nearest = null, nearDist = Infinity;
      zombies.forEach(z => {
        const d = dist(t.x, t.y, z.x, z.y);
        if (d < t.range && d < nearDist) { nearDist = d; nearest = z; }
      });
      if (nearest && t.fireTimer <= 0) {
        t.fireTimer = t.fireRate;
        t.angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
        bullets.push({ x: t.x, y: t.y, vx: Math.cos(t.angle)*300, vy: Math.sin(t.angle)*300, damage: t.damage, owner: 'turret', life: 0.5 });
      } else if (nearest) {
        t.angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
      }
      t.hp -= dt * 2;
      if (t.hp <= 0) turrets.splice(i, 1);
    }

    // Grenades
    for (let i = grenades.length - 1; i >= 0; i--) {
      const g = grenades[i];
      const gdx = g.tx - g.x, gdy = g.ty - g.y;
      const gdd = Math.sqrt(gdx * gdx + gdy * gdy);
      if (gdd > 5) {
        g.x += (gdx / gdd) * g.speed * dt;
        g.y += (gdy / gdd) * g.speed * dt;
      }
      g.timer -= dt;
      if (g.timer <= 0) {
        zombies.forEach(z => {
          if (dist(z.x, z.y, g.x, g.y) < GRENADE_EXPLODE_RADIUS) {
            z.hp -= 40 + wave * 2;
            const angle = Math.atan2(z.y - g.y, z.x - g.x);
            z.knockback.x += Math.cos(angle) * 40;
            z.knockback.y += Math.sin(angle) * 40;
            z.stunTimer = 0.3;
          }
        });
        for (let j = 0; j < 12; j++) {
          const a = (j / 12) * Math.PI * 2;
          particles.push({ x: g.x, y: g.y, vx: Math.cos(a)*(60+Math.random()*40), vy: Math.sin(a)*(60+Math.random()*40), life: 0.4, maxLife: 0.4, color: j % 2 === 0 ? '#f84' : '#ff4', radius: 4 });
        }
        barricades.forEach(b => { if (dist(b.x, b.y, g.x, g.y) < GRENADE_EXPLODE_RADIUS) b.hp -= 15; });
        grenades.splice(i, 1);
      }
    }

    // Scrap
    for (let i = scrapDrops.length - 1; i >= 0; i--) {
      const s = scrapDrops[i];
      s.timer -= dt;
      if (s.timer <= 0) { scrapDrops.splice(i, 1); continue; }
      if (player.alive && dist(player.x, player.y, s.x, s.y) < 18) { player.scrap += s.amount; scrapDrops.splice(i, 1); continue; }
      if (ally.alive   && dist(ally.x,   ally.y,   s.x, s.y) < 18) { ally.scrap   += s.amount; scrapDrops.splice(i, 1); continue; }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Heal effects
    for (let i = healEffects.length - 1; i >= 0; i--) {
      healEffects[i].timer -= dt;
      if (healEffects[i].timer <= 0) healEffects.splice(i, 1);
    }

    barricades = barricades.filter(b => b.hp > 0);

    // Player/ally death
    if (player.alive && player.hp <= 0) {
      player.alive = false;
      for (let j = 0; j < 8; j++) particles.push({ x: player.x, y: player.y, vx: (Math.random()-0.5)*80, vy: (Math.random()-0.5)*80, life: 0.5, maxLife: 0.5, color: '#48f', radius: 3 });
    }
    if (ally.alive && ally.hp <= 0) {
      ally.alive = false;
      for (let j = 0; j < 8; j++) particles.push({ x: ally.x, y: ally.y, vx: (Math.random()-0.5)*80, vy: (Math.random()-0.5)*80, life: 0.5, maxLife: 0.5, color: '#f84', radius: 3 });
    }

    // Revive
    if (!player.alive && ally.alive && dist(ally.x, ally.y, base.x, base.y) < BASE_RADIUS + 15) {
      player.alive = true; player.hp = 50; player.x = base.x - 15; player.y = base.y;
      healEffects.push({ x: player.x, y: player.y, timer: 0.8 });
    }
    if (!ally.alive && player.alive && dist(player.x, player.y, base.x, base.y) < BASE_RADIUS + 15) {
      ally.alive = true; ally.hp = 50; ally.x = base.x + 15; ally.y = base.y;
      healEffects.push({ x: ally.x, y: ally.y, timer: 0.8 });
    }

    // Game over
    if (base.hp <= 0) {
      base.hp = 0;
      gameState = 'gameover';
      game.setState('over');
      game.showOverlay('BASE DESTROYED', 'Wave ' + wave + ' | Kills: ' + score);
      if (controlsText) controlsText.textContent = 'Click to restart';
    }

    // HUD
    if (baseHpEl)   baseHpEl.textContent   = Math.max(0, Math.round(base.hp));
    if (playerHpEl) playerHpEl.textContent = player.alive ? Math.round(player.hp) : 'DEAD';
    if (allyHpEl)   allyHpEl.textContent   = ally.alive   ? Math.round(ally.hp)   : 'DEAD';
    const wepName = WEAPONS[player.weapon].name;
    let ammoStr = player.ammo[player.weapon] === Infinity ? 'INF' : player.ammo[player.weapon];
    if (player.reloading) ammoStr = 'RELOAD';
    if (ammoEl) ammoEl.textContent = wepName + ' ' + ammoStr;
    if (scrapEl) scrapEl.textContent = player.scrap;
  };

  // ---- Helpers: draw a rotated rect via fillPoly ----
  function rotatedRectPoints(cx, cy, w, h, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const hw = w / 2, hh = h / 2;
    const corners = [
      { x: -hw, y: -hh }, { x:  hw, y: -hh },
      { x:  hw, y:  hh }, { x: -hw, y:  hh },
    ];
    return corners.map(c => ({
      x: cx + c.x * cos - c.y * sin,
      y: cy + c.x * sin + c.y * cos,
    }));
  }

  // hex color with alpha channel
  function withAlpha(hex, a) {
    // Expand #rgb to #rrggbb first
    let h = hex.startsWith("#") ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const byte = Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, "0");
    return "#" + h + byte;
  }




  // approximate a filled circle arc section as polygon (for arcs/rings use strokePoly)
  function arcPoints(cx, cy, r, startAngle, endAngle, segments = 20) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  // Draw a thin arc stroke using drawLine segments
  function drawArcStroke(renderer, cx, cy, r, startAngle, endAngle, color, width, segments = 20) {
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (endAngle - startAngle) * (i / segments);
      const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
      renderer.drawLine(cx + Math.cos(a1)*r, cy + Math.sin(a1)*r, cx + Math.cos(a2)*r, cy + Math.sin(a2)*r, color, width);
    }
  }

  // ---- Draw ----
  game.onDraw = (renderer, text) => {
    const now = performance.now();

    // Background
    renderer.fillRect(0, 0, W, H, '#111118');

    // Grid lines
    for (let x = 0; x < W; x += 30) {
      renderer.drawLine(x, 0, x, H, '#44aa4407', 1);
    }
    for (let y = 0; y < H; y += 30) {
      renderer.drawLine(0, y, W, y, '#44aa4407', 1);
    }

    if (gameState === 'menu' || gameState === 'classSelect') {
      drawMenuBg(renderer, text, now);
      return;
    }

    // ---- Base glow ----
    const baseAlpha = 0.1 + 0.05 * Math.sin(now * 0.003);
    // Draw radial glow as concentric circles with decreasing alpha
    for (let ring = 5; ring >= 1; ring--) {
      const rr = BASE_RADIUS * 2.5 * (ring / 5);
      const a = baseAlpha * (1 - ring / 6);
      renderer.fillCircle(base.x, base.y, rr, withAlpha('#44aa44', a));
    }

    // Base body
    renderer.fillCircle(base.x, base.y, BASE_RADIUS, '#1a3a1a');
    renderer.setGlow('#44aa44', 0.4);
    drawArcStroke(renderer, base.x, base.y, BASE_RADIUS, 0, Math.PI * 2, '#44aa44', 2);
    renderer.setGlow(null);

    // Base HP bar
    const baseHpFrac = base.hp / base.maxHp;
    renderer.fillRect(base.x - 20, base.y - BASE_RADIUS - 8, 40, 4, '#222222');
    const baseBarColor = baseHpFrac > 0.5 ? '#44aa44' : baseHpFrac > 0.25 ? '#aaaa44' : '#aa4444';
    renderer.fillRect(base.x - 20, base.y - BASE_RADIUS - 8, 40 * baseHpFrac, 4, baseBarColor);

    // Base cross icon
    renderer.drawLine(base.x - 10, base.y, base.x + 10, base.y, '#44aa44', 3);
    renderer.drawLine(base.x, base.y - 10, base.x, base.y + 10, '#44aa44', 3);

    // ---- Barricades ----
    barricades.forEach(b => {
      const hpFrac = b.hp / b.maxHp;
      const rv = Math.round(100 + 60 * hpFrac);
      const gv = Math.round(70 + 40 * hpFrac);
      const fillColor = `rgb(${rv},${gv},30)`;
      const pts = rotatedRectPoints(b.x, b.y, b.w, b.h, b.angle);
      renderer.fillPoly(pts, fillColor);
      renderer.strokePoly(pts, '#886644', 1, true);
      if (hpFrac < 0.6) {
        // crack line
        const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
        const cx1 = b.x + cos * (-b.w * 0.3) - sin * (-b.h * 0.3);
        const cy1 = b.y + sin * (-b.w * 0.3) + cos * (-b.h * 0.3);
        const cx2 = b.x + cos * (b.w * 0.1) - sin * (b.h * 0.2);
        const cy2 = b.y + sin * (b.w * 0.1) + cos * (b.h * 0.2);
        renderer.drawLine(cx1, cy1, cx2, cy2, '#443322', 1);
      }
    });

    // ---- Turrets ----
    turrets.forEach(t => {
      renderer.fillCircle(t.x, t.y, TURRET_RADIUS, '#555566');
      drawArcStroke(renderer, t.x, t.y, TURRET_RADIUS, 0, Math.PI * 2, '#8888aa', 1);
      renderer.drawLine(t.x, t.y, t.x + Math.cos(t.angle) * 10, t.y + Math.sin(t.angle) * 10, '#aaaabb', 2);
      const tHpFrac = t.hp / t.maxHp;
      renderer.fillRect(t.x - 6, t.y - TURRET_RADIUS - 5, 12, 2, '#222222');
      renderer.fillRect(t.x - 6, t.y - TURRET_RADIUS - 5, 12 * tHpFrac, 2, '#8888aa');
    });

    // ---- Scrap drops ----
    scrapDrops.forEach(s => {
      const blink = s.timer < 3 ? (Math.sin(now * 0.02) > 0 ? 1.0 : 0.3) : 1.0;
      const scrapColor = withAlpha('#c8b43c', blink);
      const diamond = [
        { x: s.x,     y: s.y - 4 },
        { x: s.x + 4, y: s.y },
        { x: s.x,     y: s.y + 4 },
        { x: s.x - 4, y: s.y },
      ];
      renderer.fillPoly(diamond, scrapColor);
    });

    // ---- Zombies ----
    zombies.forEach(z => {
      // shadow ellipse (approximate)
      renderer.fillCircle(z.x + 2, z.y + 3, z.radius * 0.6, '#00000055');

      renderer.setGlow(z.color, z.type === 'boss' ? 0.8 : 0.3);
      renderer.fillCircle(z.x, z.y, z.radius, z.color);
      renderer.setGlow(null);

      // Red eyes
      const lookAngle = Math.atan2(base.y - z.y, base.x - z.x);
      renderer.fillCircle(
        z.x + Math.cos(lookAngle - 0.3) * z.radius * 0.4,
        z.y + Math.sin(lookAngle - 0.3) * z.radius * 0.4,
        1.5, '#ff0000'
      );
      renderer.fillCircle(
        z.x + Math.cos(lookAngle + 0.3) * z.radius * 0.4,
        z.y + Math.sin(lookAngle + 0.3) * z.radius * 0.4,
        1.5, '#ff0000'
      );

      // HP bar
      if (z.hp < z.maxHp) {
        const frac = z.hp / z.maxHp;
        renderer.fillRect(z.x - z.radius, z.y - z.radius - 5, z.radius * 2, 2, '#222222');
        const zBarColor = frac > 0.5 ? '#44aa44' : frac > 0.25 ? '#aaaa44' : '#aa4444';
        renderer.fillRect(z.x - z.radius, z.y - z.radius - 5, z.radius * 2 * frac, 2, zBarColor);
      }
    });

    // ---- Players ----
    function drawPlayer(p, bodyColor, glowColor) {
      if (!p.alive) return;

      // shadow
      renderer.fillCircle(p.x + 2, p.y + 3, PLAYER_RADIUS * 0.6, '#00000055');

      renderer.setGlow(glowColor, 0.5);
      renderer.fillCircle(p.x, p.y, PLAYER_RADIUS, bodyColor);
      renderer.setGlow(null);
      drawArcStroke(renderer, p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2, glowColor, 1.5);

      // gun direction
      renderer.drawLine(p.x, p.y, p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14, '#dddddd', 2);

      // class icon
      const icon = p.class === 'medic' ? '+' : p.class === 'engineer' ? '#' : '*';
      text.drawText(icon, p.x, p.y - 4, 10, '#ffffff', 'center');

      // HP bar
      const hpFrac = p.hp / p.maxHp;
      renderer.fillRect(p.x - 10, p.y - PLAYER_RADIUS - 6, 20, 3, '#222222');
      const pBarColor = hpFrac > 0.5 ? '#44aa44' : hpFrac > 0.25 ? '#aaaa44' : '#aa4444';
      renderer.fillRect(p.x - 10, p.y - PLAYER_RADIUS - 6, 20 * hpFrac, 3, pBarColor);

      // invulnerability flash
      if (p.invulnTimer > 0 && Math.sin(now * 0.03) > 0) {
        drawArcStroke(renderer, p.x, p.y, PLAYER_RADIUS + 3, 0, Math.PI * 2, '#ffffff80', 2);
      }

      // reload arc
      if (p.reloading) {
        const prog = 1 - (p.reloadTimer / WEAPONS[p.weapon].reloadTime);
        drawArcStroke(renderer, p.x, p.y, PLAYER_RADIUS + 5, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2, '#ffff88', 2);
      }

      // ability cooldown arc
      if (p.abilityCooldown > 0) {
        const maxCD = p.class === 'medic' ? 8 : p.class === 'engineer' ? 12 : 6;
        const prog = 1 - (p.abilityCooldown / maxCD);
        drawArcStroke(renderer, p.x, p.y, PLAYER_RADIUS + 7, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2, '#64c8ff66', 1);
      }

      // label
      text.drawText(p.isAI ? 'ALLY' : 'YOU', p.x, p.y + PLAYER_RADIUS + 4, 8, glowColor, 'center');
    }

    drawPlayer(player, '#222244', '#4488ff');
    drawPlayer(ally,   '#442222', '#ff8844');

    // ---- Bullets ----
    bullets.forEach(b => {
      const bColor = b.owner === 'player' ? '#88ccff' : b.owner === 'ally' ? '#ffcc88' : '#ffff88';
      renderer.setGlow(bColor, 0.4);
      renderer.fillCircle(b.x, b.y, BULLET_RADIUS, bColor);
      renderer.setGlow(null);
    });

    // ---- Grenades ----
    grenades.forEach(g => {
      const flash = Math.sin(now * 0.02) > 0;
      renderer.fillCircle(g.x, g.y, GRENADE_RADIUS, flash ? '#ff4444' : '#aa2222');
      drawArcStroke(renderer, g.x, g.y, GRENADE_RADIUS, 0, Math.PI * 2, '#ff8888', 1);
    });

    // ---- Particles ----
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      const r = p.radius * alpha;
      if (r < 0.3) return;
      renderer.fillCircle(p.x, p.y, r, withAlpha(p.color, alpha));
    });

    // ---- Heal effects ----
    healEffects.forEach(h => {
      const alpha = h.timer / 0.6;
      const size = 12 * (1 - alpha * 0.5);
      const healColor = withAlpha('#64ff64', alpha);
      renderer.drawLine(h.x - size, h.y, h.x + size, h.y, healColor, 2);
      renderer.drawLine(h.x, h.y - size, h.x, h.y + size, healColor, 2);
      drawArcStroke(renderer, h.x, h.y, size * 1.5, 0, Math.PI * 2, withAlpha('#64ff64', alpha * 0.4), 1);
    });

    // ---- Wave announcement ----
    if (betweenWaves && gameState === 'playing') {
      renderer.setGlow('#44aa44', 0.6);
      text.drawText('WAVE ' + (wave + 1) + ' INCOMING...', W / 2, 18, 20, '#44aa44', 'center');
      renderer.setGlow(null);
      text.drawText('Stand near base to revive fallen ally', W / 2, 42, 11, '#888888', 'center');
    }

    // ---- Crosshair ----
    if (gameState === 'playing' && player && player.alive) {
      const chColor = '#44aa4499';
      renderer.drawLine(mouseX - 8, mouseY, mouseX - 3, mouseY, chColor, 1);
      renderer.drawLine(mouseX + 3, mouseY, mouseX + 8, mouseY, chColor, 1);
      renderer.drawLine(mouseX, mouseY - 8, mouseX, mouseY - 3, chColor, 1);
      renderer.drawLine(mouseX, mouseY + 3, mouseX, mouseY + 8, chColor, 1);
    }

    // ---- Canvas HUD ----
    if (gameState === 'playing' && player) {
      const weapons = ['pistol', 'shotgun', 'rifle'];
      weapons.forEach((w, idx) => {
        const selected = player.weapon === w;
        let label = (idx + 1) + ':' + WEAPONS[w].name;
        if (WEAPONS[w].maxAmmo !== Infinity) label += '(' + player.ammo[w] + ')';
        text.drawText(label, 8, H - 30 + idx * 12, 10, selected ? '#44aa44' : '#555555', 'left');
      });

      const abilityReady = player.abilityCooldown <= 0;
      let abilityName = player.class === 'medic' ? 'Q:Heal' : player.class === 'engineer' ? 'Q:Turret' : 'Q:Grenade';
      if (player.abilityCooldown > 0) abilityName += ' (' + Math.ceil(player.abilityCooldown) + 's)';
      text.drawText(abilityName, 8, H - 42, 10, abilityReady ? '#44aaff' : '#555555', 'left');

      const canBuild = player.scrap >= BARRICADE_COST;
      text.drawText('E:Barricade (' + BARRICADE_COST + ' scrap)', 150, H - 6, 10, canBuild ? '#cccc88' : '#666666', 'left');

      text.drawText('Zombies: ' + zombies.length, W - 8, H - 6, 11, '#44aa44', 'right');
    }
  };

  function drawMenuBg(renderer, text, now) {
    const t = now * 0.001;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      const x = W / 2 + Math.cos(a) * 140;
      const y = H / 2 + Math.sin(a) * 90;
      renderer.setGlow('#44aa44', 0.5);
      renderer.fillCircle(x, y, 7, '#44aa44');
      renderer.setGlow(null);
      const ea = Math.atan2(H / 2 - y, W / 2 - x);
      renderer.fillCircle(x + Math.cos(ea - 0.3) * 3, y + Math.sin(ea - 0.3) * 3, 1.2, '#ff0000');
      renderer.fillCircle(x + Math.cos(ea + 0.3) * 3, y + Math.sin(ea + 0.3) * 3, 1.2, '#ff0000');
    }
    renderer.fillCircle(W / 2, H / 2, BASE_RADIUS, '#1a3a1a');
    renderer.setGlow('#44aa44', 0.4);
    drawArcStroke(renderer, W / 2, H / 2, BASE_RADIUS, 0, Math.PI * 2, '#44aa44', 2);
    renderer.setGlow(null);
    renderer.drawLine(W / 2 - 10, H / 2, W / 2 + 10, H / 2, '#44aa44', 3);
    renderer.drawLine(W / 2, H / 2 - 10, W / 2, H / 2 + 10, '#44aa44', 3);
  }

  // ---- Init ----
  game.onInit = () => {
    game.showOverlay('ZOMBIE SIEGE CO-OP', 'Click to Start');
    game.setState('waiting');
    gameState = 'menu';
  };

  game.setScoreFn(() => score);
  game.start();
  return game;
}
