// phoenix/game.js — Phoenix game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480, H = 600;

// -- Constants --
const PLAYER_W = 36, PLAYER_H = 20, PLAYER_SPEED = 5;
const BULLET_W = 3, BULLET_H = 12, BULLET_SPEED = 8;
const MAX_BULLETS = 3;
const SHIELD_DURATION = 90;
const STAR_COUNT = 100;

// -- Module state --
let score, best = 0, lives, shieldUses, shieldActive, shieldTimer;
let player, bullets, enemyBullets, enemies, particles, stars;
let tick, wave, cycle;
let waveIntroTimer, shootCooldown;

// -- DOM refs --
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const shieldsEl = document.getElementById('shields');
const waveEl = document.getElementById('wave');

// -- Wave names --
const WAVE_NAMES = [
  'Bird Scouts',
  'The Flock Attacks',
  'Phoenix Rising',
  'Firestorm',
  'The Mothership'
];

const WAVE_INTROS = [
  'Small birds in formation',
  'Aggressive swoop attacks',
  'NEW: Phoenix birds - take multiple hits, can regenerate!',
  'NEW: Greater phoenixes - regenerate fast, destroy quickly!',
  'BOSS: Blast through the rotating shield!'
];

// -- Star field --
function makeStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.2 + Math.random() * 0.8,
      brightness: 0.3 + Math.random() * 0.7,
      size: Math.random() < 0.1 ? 2 : 1
    });
  }
}

function updateStars() {
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  }
}

function drawStars(renderer) {
  for (const s of stars) {
    const twinkle = (Math.sin(tick * 0.03 + s.x * 0.1) * 0.3 + 0.7) * s.brightness;
    const alpha = Math.round(twinkle * 255).toString(16).padStart(2, '0');
    renderer.fillRect(s.x, s.y, s.size, s.size, '#ffffff' + alpha);
  }
}

// -- Particles --
function spawnExplosion(x, y, color, count) {
  count = count || 12;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      color
    });
  }
}

function spawnSpark(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 8 + Math.random() * 5,
      maxLife: 13,
      color: '#fff'
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    const sz = 2 + alpha * 2;
    renderer.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz, p.color + a);
  }
}

// -- Enemy constructors --
function makeSmallBird(x, y, row, col) {
  return {
    type: 'smallBird',
    x, y, baseX: x, baseY: y,
    row, col,
    alive: true,
    hp: 1, maxHp: 1,
    points: 10,
    phase: Math.random() * Math.PI * 2,
    swooping: false, swoopTime: 0,
    swoopStartX: 0, swoopStartY: 0,
    swoopTargetX: 0,
    w: 28, h: 20,
    wingFrame: 0
  };
}

function makeLargeBird(x, y, row, col) {
  return {
    type: 'largeBird',
    x, y, baseX: x, baseY: y,
    row, col,
    alive: true,
    hp: 3, maxHp: 3,
    points: 30,
    phase: Math.random() * Math.PI * 2,
    swooping: false, swoopTime: 0,
    swoopStartX: 0, swoopStartY: 0,
    swoopTargetX: 0,
    w: 40, h: 28,
    wingFrame: 0,
    regenTimer: 0,
    regenDelay: 180,
    lastHitTick: 0
  };
}

function makePhoenixBird(x, y, row, col) {
  return {
    type: 'phoenixBird',
    x, y, baseX: x, baseY: y,
    row, col,
    alive: true,
    hp: 5, maxHp: 5,
    points: 50,
    phase: Math.random() * Math.PI * 2,
    swooping: false, swoopTime: 0,
    swoopStartX: 0, swoopStartY: 0,
    swoopTargetX: 0,
    w: 44, h: 32,
    wingFrame: 0,
    regenTimer: 0,
    regenDelay: 120,
    lastHitTick: 0,
    flameTimer: 0
  };
}

function makeBoss() {
  return {
    type: 'boss',
    x: W / 2, y: 80,
    alive: true,
    hp: 40, maxHp: 40,
    points: 500,
    w: 100, h: 60,
    shieldAngle: 0,
    shieldSegments: 16,
    shieldHp: [],
    phase: 0,
    moveDir: 1,
    shootTimer: 0,
    alienX: 0, alienY: 0,
    alienVisible: false
  };
}

// -- Wave Definitions --
function getWaveEnemies(waveNum) {
  const w = ((waveNum - 1) % 5) + 1;
  const c = Math.floor((waveNum - 1) / 5);
  const hpMult = 1 + c * 0.5;
  const enems = [];

  if (w === 1) {
    for (let row = 0; row < 3; row++) {
      const count = 8;
      const spacing = 52;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeSmallBird(startX + col * spacing, 60 + row * 40, row, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        enems.push(e);
      }
    }
  } else if (w === 2) {
    for (let row = 0; row < 4; row++) {
      const count = 7 + (row < 2 ? 0 : 1);
      const spacing = 52;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeSmallBird(startX + col * spacing, 50 + row * 38, row, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        e.points = 15;
        enems.push(e);
      }
    }
  } else if (w === 3) {
    for (let row = 0; row < 2; row++) {
      const count = 5;
      const spacing = 80;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeLargeBird(startX + col * spacing, 50 + row * 50, row, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        enems.push(e);
      }
    }
    for (let row = 0; row < 2; row++) {
      const count = 7;
      const spacing = 56;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeSmallBird(startX + col * spacing, 160 + row * 38, row + 2, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        enems.push(e);
      }
    }
  } else if (w === 4) {
    for (let row = 0; row < 2; row++) {
      const count = 4;
      const spacing = 90;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makePhoenixBird(startX + col * spacing, 50 + row * 55, row, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        enems.push(e);
      }
    }
    for (let row = 0; row < 2; row++) {
      const count = 6;
      const spacing = 64;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeLargeBird(startX + col * spacing, 170 + row * 45, row + 2, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        enems.push(e);
      }
    }
  } else if (w === 5) {
    const boss = makeBoss();
    boss.hp = Math.ceil(boss.hp * hpMult);
    boss.maxHp = boss.hp;
    boss.shieldHp = [];
    for (let i = 0; i < boss.shieldSegments; i++) {
      boss.shieldHp.push(Math.ceil(3 * hpMult));
    }
    enems.push(boss);
    for (let row = 0; row < 2; row++) {
      const count = 5;
      const spacing = 56;
      const startX = (W - (count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const e = makeSmallBird(startX + col * spacing, 180 + row * 36, row, col);
        e.hp = Math.ceil(e.hp * hpMult);
        e.maxHp = e.hp;
        e.points = 20;
        enems.push(e);
      }
    }
  }
  return enems;
}

function getEnemyColor(e) {
  switch (e.type) {
    case 'smallBird': return '#f92';
    case 'largeBird': return '#f44';
    case 'phoenixBird': return '#f62';
    case 'boss': return '#fa0';
    default: return '#f62';
  }
}

// -- Game reference (set in createGame) --
let game;

function nextWave() {
  wave++;
  waveEl.textContent = wave;
  cycle = Math.floor((wave - 1) / 5);
  enemies = getWaveEnemies(wave);
  enemyBullets = [];

  game.setState('waveIntro');
  const waveType = ((wave - 1) % 5);
  game.showOverlay(`WAVE ${wave}`, WAVE_NAMES[waveType]);
  // Show wave intro info via overlayWave element
  const overlayWave = document.getElementById('overlayWave');
  if (overlayWave) overlayWave.textContent = WAVE_INTROS[waveType];
  waveIntroTimer = 120;
}

function playerHit() {
  lives--;
  livesEl.textContent = lives;
  spawnExplosion(player.x + PLAYER_W / 2, player.y, '#f62', 15);
  if (lives <= 0) {
    gameOver();
  } else {
    shieldActive = true;
    shieldTimer = 60;
  }
}

function activateShield() {
  if (shieldUses > 0 && !shieldActive) {
    shieldUses--;
    shieldsEl.textContent = shieldUses;
    shieldActive = true;
    shieldTimer = SHIELD_DURATION;
  }
}

function gameOver() {
  game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
  const overlayWave = document.getElementById('overlayWave');
  if (overlayWave) overlayWave.textContent = `Reached Wave ${wave}`;
  game.setState('over');
}

// -- Boss Logic --
function updateBoss(boss) {
  boss.phase += 0.01;
  boss.shieldAngle += 0.02 + cycle * 0.005;

  boss.x = W / 2 + Math.sin(boss.phase) * (W / 3 - boss.w / 2);
  boss.y = 80 + Math.sin(boss.phase * 0.7) * 20;

  boss.shootTimer++;
  const shootInterval = Math.max(30, 60 - cycle * 10);
  if (boss.shootTimer >= shootInterval) {
    boss.shootTimer = 0;
    const dx = player.x + PLAYER_W / 2 - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 3.5 + cycle * 0.5;
    enemyBullets.push({
      x: boss.x, y: boss.y + boss.h / 2,
      vx: dx / dist * speed,
      vy: dy / dist * speed
    });
    // Spread shots
    if (boss.shootTimer === 0) {
      for (let a = -0.3; a <= 0.3; a += 0.3) {
        enemyBullets.push({
          x: boss.x, y: boss.y + boss.h / 2,
          vx: (dx / dist * speed) + a * speed,
          vy: dy / dist * speed
        });
      }
    }
  }

  boss.alienVisible = boss.shieldHp.every(hp => hp <= 0);
}

function checkBossHit(boss, bullet, bulletIdx) {
  const bx = bullet.x - boss.x;
  const by = bullet.y - boss.y;
  const shieldRadius = 55 + cycle * 2;

  const dist = Math.sqrt(bx * bx + by * by);
  if (dist >= shieldRadius - 12 && dist <= shieldRadius + 12) {
    let angle = Math.atan2(by, bx) - boss.shieldAngle;
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segIdx = Math.floor(angle / (Math.PI * 2 / boss.shieldSegments));

    if (segIdx >= 0 && segIdx < boss.shieldSegments && boss.shieldHp[segIdx] > 0) {
      boss.shieldHp[segIdx]--;
      bullets.splice(bulletIdx, 1);
      spawnSpark(bullet.x, bullet.y);
      return true;
    }
  }

  const hitDist = Math.sqrt(bx * bx + by * by);
  if (hitDist < 35) {
    let angle = Math.atan2(by, bx) - boss.shieldAngle;
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segIdx = Math.floor(angle / (Math.PI * 2 / boss.shieldSegments));
    const adjacent1 = (segIdx + 1) % boss.shieldSegments;
    const adjacent2 = (segIdx - 1 + boss.shieldSegments) % boss.shieldSegments;

    if (boss.shieldHp[segIdx] <= 0 || boss.shieldHp[adjacent1] <= 0 || boss.shieldHp[adjacent2] <= 0) {
      boss.hp--;
      bullets.splice(bulletIdx, 1);
      spawnSpark(boss.x + bx * 0.5, boss.y + by * 0.5);
      score += 5;
      scoreEl.textContent = score;
      if (score > best) best = score;
      if (boss.hp <= 0) {
        boss.alive = false;
        score += boss.points;
        scoreEl.textContent = score;
        if (score > best) best = score;
        spawnExplosion(boss.x, boss.y, '#f92', 30);
        spawnExplosion(boss.x - 30, boss.y + 10, '#ff0', 15);
        spawnExplosion(boss.x + 30, boss.y - 10, '#f44', 15);
      }
      return true;
    }
  }

  return false;
}

// -- Drawing helpers --

function drawSmallBird(e, renderer) {
  const x = e.x, y = e.y;
  const wing = Math.sin(e.wingFrame * 3) * 0.4;

  renderer.setGlow('#f92', 0.4);

  // Body (ellipse approximated as circle)
  renderer.fillCircle(x, y, 8, '#f92');

  // Left wing
  renderer.fillPoly([
    { x: x - 6, y },
    { x: x - 14, y: y - 8 + wing * 10 },
    { x: x - 10, y: y + 2 }
  ], '#f92');

  // Right wing
  renderer.fillPoly([
    { x: x + 6, y },
    { x: x + 14, y: y - 8 + wing * 10 },
    { x: x + 10, y: y + 2 }
  ], '#f92');

  renderer.setGlow(null);

  // Eyes
  renderer.fillRect(x - 4, y - 2, 2, 2, '#1a1a2e');
  renderer.fillRect(x + 2, y - 2, 2, 2, '#1a1a2e');

  // Beak
  renderer.fillRect(x - 1, y + 3, 2, 2, '#ff0');
}

function drawLargeBird(e, renderer) {
  const x = e.x, y = e.y;
  const wing = Math.sin(e.wingFrame * 2.5) * 0.5;
  const hpRatio = e.hp / e.maxHp;

  const r = 255;
  const g = Math.floor(60 + hpRatio * 30);
  const b = Math.floor(20 + (1 - hpRatio) * 40);
  const color = `rgb(${r},${g},${b})`;

  renderer.setGlow('#f44', 0.5);

  // Body
  renderer.fillCircle(x, y, 12, color);

  // Left wing
  renderer.fillPoly([
    { x: x - 10, y },
    { x: x - 20, y: y - 12 + wing * 14 },
    { x: x - 16, y: y + 4 }
  ], color);

  // Right wing
  renderer.fillPoly([
    { x: x + 10, y },
    { x: x + 20, y: y - 12 + wing * 14 },
    { x: x + 16, y: y + 4 }
  ], color);

  // Tail feathers
  renderer.fillPoly([
    { x: x - 4, y: y + 8 },
    { x, y: y + 14 },
    { x: x + 4, y: y + 8 }
  ], color);

  renderer.setGlow(null);

  // Eyes
  renderer.fillCircle(x - 5, y - 2, 2, '#ff0');
  renderer.fillCircle(x + 5, y - 2, 2, '#ff0');

  // Regen indicator
  if (e.hp < e.maxHp && tick - e.lastHitTick > e.regenDelay) {
    const pulse = Math.sin(tick * 0.1) * 0.3 + 0.5;
    drawCircleRing(renderer, x, y, 16, `rgba(100,255,100,${pulse})`, 1);
  }

  // HP bar
  if (e.hp < e.maxHp) {
    const barW = 24;
    renderer.fillRect(x - barW / 2, y - 16, barW, 3, '#400');
    renderer.fillRect(x - barW / 2, y - 16, barW * hpRatio, 3, '#0f0');
  }
}

function drawPhoenixBird(e, renderer) {
  const x = e.x, y = e.y;
  const wing = Math.sin(e.wingFrame * 2) * 0.6;
  const hpRatio = e.hp / e.maxHp;

  const flame = Math.sin(tick * 0.15 + e.phase) * 0.3 + 0.7;
  const flameG = Math.floor(60 + flame * 100);
  const flameB = Math.floor(flame * 30);
  const bodyColor = `rgb(255,${flameG},${flameB})`;

  renderer.setGlow('#f62', 0.7);

  // Large body
  renderer.fillCircle(x, y, 15, bodyColor);

  // Grand left wing
  renderer.fillPoly([
    { x: x - 12, y: y - 2 },
    { x: x - 22, y: y - 16 + wing * 16 },
    { x: x - 18, y: y - 6 + wing * 8 },
    { x: x - 24, y: y - 10 + wing * 12 },
    { x: x - 14, y: y + 4 }
  ], bodyColor);

  // Grand right wing
  renderer.fillPoly([
    { x: x + 12, y: y - 2 },
    { x: x + 22, y: y - 16 + wing * 16 },
    { x: x + 18, y: y - 6 + wing * 8 },
    { x: x + 24, y: y - 10 + wing * 12 },
    { x: x + 14, y: y + 4 }
  ], bodyColor);

  // Tail plume
  const tailG = Math.floor(150 + flame * 80);
  renderer.fillPoly([
    { x: x - 5, y: y + 10 },
    { x: x - 8, y: y + 20 + Math.sin(tick * 0.08 + e.phase) * 4 },
    { x, y: y + 16 },
    { x: x + 8, y: y + 20 + Math.sin(tick * 0.08 + e.phase + 1) * 4 },
    { x: x + 5, y: y + 10 }
  ], `rgb(255,${tailG},0)`);

  // Head crest
  renderer.fillPoly([
    { x, y: y - 10 },
    { x: x - 3, y: y - 16 },
    { x: x + 3, y: y - 16 }
  ], '#fa0');

  // Eyes (glowing)
  renderer.setGlow('#ff0', 0.4);
  renderer.fillCircle(x - 6, y - 3, 2.5, '#ff0');
  renderer.fillCircle(x + 6, y - 3, 2.5, '#ff0');

  renderer.setGlow(null);

  // Regen indicator
  if (e.hp < e.maxHp && tick - e.lastHitTick > e.regenDelay) {
    const pulse = Math.sin(tick * 0.15) * 0.4 + 0.6;
    drawCircleRing(renderer, x, y, 22, `rgba(255,200,0,${pulse})`, 2);
    // Fire particles when regenerating
    if (tick % 4 === 0) {
      particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 2,
        life: 10 + Math.random() * 8,
        maxLife: 18,
        color: '#fa0'
      });
    }
  }

  // HP bar
  if (e.maxHp > 1) {
    const barW = 30;
    renderer.fillRect(x - barW / 2, y - 22, barW, 3, '#400');
    const hpColor = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f44';
    renderer.fillRect(x - barW / 2, y - 22, barW * hpRatio, 3, hpColor);
  }
}

function drawBoss(boss, renderer) {
  const bx = boss.x, by = boss.y;
  const hpRatio = boss.hp / boss.maxHp;

  // -- Rotating shield --
  const shieldRadius = 55 + cycle * 2;
  const segAngle = (Math.PI * 2) / boss.shieldSegments;

  for (let i = 0; i < boss.shieldSegments; i++) {
    if (boss.shieldHp[i] <= 0) continue;

    const a1 = boss.shieldAngle + i * segAngle;
    const a2 = a1 + segAngle * 0.85;

    const maxSegHp = Math.ceil(3 * (1 + cycle * 0.5));
    const segRatio = boss.shieldHp[i] / maxSegHp;
    const r = Math.floor(100 + segRatio * 155);
    const g = Math.floor(segRatio * 150);
    const b = Math.floor(segRatio * 60);
    const segColor = `rgb(${r},${g},${b})`;

    renderer.setGlow(segColor, 0.5);
    // Draw shield arc as line segments
    drawArc(renderer, bx, by, shieldRadius, a1, a2, segColor, 6);
  }

  renderer.setGlow(null);

  // -- Mothership body --
  const pulse = Math.sin(tick * 0.04) * 0.2 + 0.8;

  // Main saucer (ellipse approximated as wide circle)
  renderer.setGlow('#a4f', 0.6);
  renderer.fillCircle(bx, by, boss.w / 2.5, `rgba(80,40,120,${pulse})`);

  // Dome (semi-ellipse as triangles)
  renderer.fillPoly([
    { x: bx - 30, y: by - 8 },
    { x: bx - 20, y: by - 24 },
    { x: bx, y: by - 28 },
    { x: bx + 20, y: by - 24 },
    { x: bx + 30, y: by - 8 }
  ], `rgba(120,60,180,${pulse})`);

  renderer.setGlow(null);

  // Lights around rim
  for (let i = 0; i < 8; i++) {
    const la = (Math.PI * 2 / 8) * i + tick * 0.05;
    const lx = bx + Math.cos(la) * (boss.w / 2 - 5);
    const ly = by + Math.sin(la) * (boss.h / 3 - 3);
    const blink = Math.sin(tick * 0.12 + i * 0.8) > 0;
    renderer.fillCircle(lx, ly, 3, blink ? '#f62' : '#631');
  }

  // Alien inside (visible when shield breached)
  if (boss.alienVisible) {
    const aGlow = Math.sin(tick * 0.08) * 0.3 + 0.7;
    renderer.setGlow('#0f0', 0.6);
    // Alien head
    renderer.fillCircle(bx, by - 5, 12, `rgba(0,255,0,${aGlow})`);
    // Eyes
    renderer.fillCircle(bx - 4, by - 7, 3, '#000');
    renderer.fillCircle(bx + 4, by - 7, 3, '#000');
    renderer.setGlow(null);
  }

  // HP bar
  const barW = 80;
  renderer.fillRect(bx - barW / 2, by - boss.h / 2 - 14, barW, 5, '#400');
  const hpColor = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f44';
  renderer.fillRect(bx - barW / 2, by - boss.h / 2 - 14, barW * hpRatio, 5, hpColor);
}

// Helper: draw a circle ring as line segments
function drawCircleRing(renderer, cx, cy, radius, color, width) {
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const a1 = (Math.PI * 2 / segments) * i;
    const a2 = (Math.PI * 2 / segments) * (i + 1);
    renderer.drawLine(
      cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius,
      cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius,
      color, width
    );
  }
}

// Helper: draw an arc as line segments
function drawArc(renderer, cx, cy, radius, startAngle, endAngle, color, width) {
  const segments = 8;
  const step = (endAngle - startAngle) / segments;
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + step * i;
    const a2 = startAngle + step * (i + 1);
    renderer.drawLine(
      cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius,
      cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius,
      color, width
    );
  }
}

function drawPlayer(renderer) {
  const px = player.x, py = player.y;

  renderer.setGlow('#f62', 0.7);

  // Ship body - pointed triangle
  renderer.fillPoly([
    { x: px + PLAYER_W / 2, y: py - 8 },
    { x: px, y: py + PLAYER_H },
    { x: px + PLAYER_W, y: py + PLAYER_H }
  ], '#f62');

  // Cockpit
  renderer.fillPoly([
    { x: px + PLAYER_W / 2, y: py },
    { x: px + PLAYER_W / 2 - 5, y: py + 10 },
    { x: px + PLAYER_W / 2 + 5, y: py + 10 }
  ], '#fa0');

  // Engine glow
  const flicker = 0.7 + Math.random() * 0.3;
  renderer.setGlow('#ff0', 0.5);
  renderer.fillPoly([
    { x: px + PLAYER_W / 2 - 6, y: py + PLAYER_H },
    { x: px + PLAYER_W / 2, y: py + PLAYER_H + 6 + Math.random() * 4 },
    { x: px + PLAYER_W / 2 + 6, y: py + PLAYER_H }
  ], `rgba(255,200,50,${flicker})`);

  renderer.setGlow(null);
}

// ================================================================
// Export createGame
// ================================================================

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    shieldUses = 3;
    shieldActive = false;
    shieldTimer = 0;
    wave = 0;
    cycle = 0;
    tick = 0;
    shootCooldown = 0;
    player = { x: W / 2 - PLAYER_W / 2, y: H - 60 };
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    makeStars();
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    shieldsEl.textContent = '3';
    waveEl.textContent = '1';
    const overlayWave = document.getElementById('overlayWave');
    if (overlayWave) overlayWave.textContent = 'Left/Right: Move | Space: Fire | Shift: Shield';
    game.showOverlay('PHOENIX', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;
    tick++;

    // -- Waiting state --
    if (game.state === 'waiting') {
      updateStars();
      if (input.wasPressed(' ')) {
        game.hideOverlay();
        const overlayWave = document.getElementById('overlayWave');
        if (overlayWave) overlayWave.textContent = '';
        nextWave();
      }
      return;
    }

    // -- Over state --
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // -- Wave intro state --
    if (game.state === 'waveIntro') {
      waveIntroTimer--;
      updateStars();
      if (waveIntroTimer <= 0) {
        game.hideOverlay();
        const overlayWave = document.getElementById('overlayWave');
        if (overlayWave) overlayWave.textContent = '';
        game.setState('playing');
      }
      return;
    }

    // -- Playing state --
    updateStars();

    // Player movement
    if (input.isDown('ArrowLeft') || input.isDown('a')) player.x = Math.max(0, player.x - PLAYER_SPEED);
    if (input.isDown('ArrowRight') || input.isDown('d')) player.x = Math.min(W - PLAYER_W, player.x + PLAYER_SPEED);

    // Shield cooldown
    if (shieldActive) {
      shieldTimer--;
      if (shieldTimer <= 0) {
        shieldActive = false;
      }
    }

    // Shoot cooldown
    if (shootCooldown > 0) shootCooldown--;

    // Shoot
    if (input.isDown(' ') && shootCooldown <= 0 && bullets.length < MAX_BULLETS) {
      bullets.push({ x: player.x + PLAYER_W / 2, y: player.y });
      shootCooldown = 8;
    }

    // Shield activation
    if (input.wasPressed('Shift')) {
      activateShield();
    }

    // Update player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -BULLET_H) {
        bullets.splice(i, 1);
      }
    }

    // Check if all enemies dead
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) {
      nextWave();
      return;
    }

    // Formation sway
    const formSway = Math.sin(tick * 0.015) * 40;

    // Update enemies
    for (const e of enemies) {
      if (!e.alive) continue;

      if (e.type === 'boss') {
        updateBoss(e);
        continue;
      }

      // Wing animation
      e.wingFrame = (e.wingFrame || 0) + 0.08;

      // Formation sway
      if (!e.swooping) {
        e.x = e.baseX + formSway + Math.sin(tick * 0.03 + e.phase) * 10;
        e.y = e.baseY + Math.sin(tick * 0.02 + e.phase * 2) * 5;
      }

      // Regeneration for phoenix types
      if ((e.type === 'largeBird' || e.type === 'phoenixBird') && e.hp < e.maxHp) {
        if (tick - e.lastHitTick > e.regenDelay) {
          e.regenTimer++;
          if (e.regenTimer >= 30) {
            e.hp++;
            e.regenTimer = 0;
          }
        }
      }

      // Swooping behavior
      if (!e.swooping) {
        let swoopChance = 0.001;
        if (e.type === 'smallBird') swoopChance = 0.002 + cycle * 0.001;
        if (e.type === 'largeBird') swoopChance = 0.0015 + cycle * 0.0008;
        if (e.type === 'phoenixBird') swoopChance = 0.001 + cycle * 0.0005;

        if (Math.random() < swoopChance) {
          e.swooping = true;
          e.swoopTime = 0;
          e.swoopStartX = e.x;
          e.swoopStartY = e.y;
          e.swoopTargetX = player.x + PLAYER_W / 2;
        }
      }

      if (e.swooping) {
        e.swoopTime++;
        const t = e.swoopTime;
        const totalTime = e.type === 'smallBird' ? 120 : 150;

        if (t < totalTime / 2) {
          const progress = t / (totalTime / 2);
          e.x = e.swoopStartX + (e.swoopTargetX - e.swoopStartX) * progress;
          e.y = e.swoopStartY + (H + 30 - e.swoopStartY) * progress;
        } else if (t < totalTime) {
          const progress = (t - totalTime / 2) / (totalTime / 2);
          e.x = e.swoopTargetX + (e.baseX + formSway - e.swoopTargetX) * progress;
          e.y = (H + 30) - (H + 30 - e.baseY) * progress;
        } else {
          e.swooping = false;
          e.x = e.baseX + formSway;
          e.y = e.baseY;
        }

        // Shoot while swooping
        if (t % 30 === 15 && Math.random() < 0.5) {
          const dx = player.x + PLAYER_W / 2 - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = 3 + cycle * 0.5;
          enemyBullets.push({
            x: e.x, y: e.y + e.h / 2,
            vx: dx / dist * speed,
            vy: dy / dist * speed
          });
        }
      } else {
        // Random shooting while in formation
        let shootChance = 0.003 + cycle * 0.001;
        if (e.type === 'phoenixBird') shootChance *= 1.5;
        if (Math.random() < shootChance) {
          enemyBullets.push({
            x: e.x, y: e.y + e.h,
            vx: (Math.random() - 0.5) * 1,
            vy: 3 + cycle * 0.3 + Math.random()
          });
        }
      }
    }

    // Bullet-enemy collision
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let hit = false;

      for (const e of enemies) {
        if (!e.alive) continue;

        if (e.type === 'boss') {
          hit = checkBossHit(e, b, i);
          if (hit) break;
          continue;
        }

        // AABB collision
        if (b.x >= e.x - e.w / 2 && b.x <= e.x + e.w / 2 &&
            b.y >= e.y - e.h / 2 && b.y <= e.y + e.h / 2) {
          e.hp--;
          e.lastHitTick = tick;
          e.regenTimer = 0;
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            e.alive = false;
            score += e.points;
            scoreEl.textContent = score;
            if (score > best) best = score;
            spawnExplosion(e.x, e.y, getEnemyColor(e), e.type === 'phoenixBird' ? 20 : 12);
          } else {
            spawnSpark(e.x, e.y);
          }
          hit = true;
          break;
        }
      }
    }

    // Enemy bullets vs player
    if (!shieldActive) {
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
          enemyBullets.splice(i, 1);
          continue;
        }
        if (b.x >= player.x && b.x <= player.x + PLAYER_W &&
            b.y >= player.y && b.y <= player.y + PLAYER_H) {
          enemyBullets.splice(i, 1);
          playerHit();
          if (game.state === 'over') return;
        }
      }
    } else {
      // Shield deflects bullets
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
          enemyBullets.splice(i, 1);
          continue;
        }
        const dx = b.x - (player.x + PLAYER_W / 2);
        const dy = b.y - (player.y + PLAYER_H / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
          spawnSpark(b.x, b.y);
          enemyBullets.splice(i, 1);
        }
      }
    }

    // Enemy-player collision (swooping birds)
    if (!shieldActive) {
      for (const e of enemies) {
        if (!e.alive || e.type === 'boss') continue;
        const ex = e.x - e.w / 2;
        const ey = e.y - e.h / 2;
        if (ex < player.x + PLAYER_W && ex + e.w > player.x &&
            ey < player.y + PLAYER_H && ey + e.h > player.y) {
          e.alive = false;
          score += Math.floor(e.points / 2);
          scoreEl.textContent = score;
          spawnExplosion(e.x, e.y, getEnemyColor(e), 8);
          playerHit();
          if (game.state === 'over') return;
        }
      }
    }

    // Update particles
    updateParticles();

    // Update gameData for ML
    const aliveCount = enemies.filter(e => e.alive).length;
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      shieldActive,
      shieldUses,
      enemyCount: aliveCount,
      wave,
      cycle
    };
  };

  game.onDraw = (renderer, text) => {
    // Stars
    drawStars(renderer);

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === 'smallBird') drawSmallBird(e, renderer);
      else if (e.type === 'largeBird') drawLargeBird(e, renderer);
      else if (e.type === 'phoenixBird') drawPhoenixBird(e, renderer);
      else if (e.type === 'boss') drawBoss(e, renderer);
    }

    // Enemy bullets
    renderer.setGlow('#f44', 0.4);
    for (const b of enemyBullets) {
      renderer.fillCircle(b.x, b.y, 3, '#f44');
    }
    renderer.setGlow(null);

    // Player bullets
    renderer.setGlow('#f92', 0.5);
    for (const b of bullets) {
      renderer.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H, '#f92');
    }
    renderer.setGlow(null);

    // Player
    drawPlayer(renderer);

    // Particles
    drawParticles(renderer);

    // Shield indicator
    if (shieldActive) {
      const alpha = (Math.sin(tick * 0.2) * 0.3 + 0.5);
      renderer.setGlow('#f62', 0.7);
      drawCircleRing(renderer, player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 25, `rgba(255,102,34,${alpha})`, 2);
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
