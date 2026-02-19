// space-invaders/game.js — Space Invaders game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480, H = 560;
const PLAYER_W = 40, PLAYER_H = 16, PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const AW = 32, AH = 24, PAD = 8;

// ── Creature types ──
const TYPES = {
  grunt: {
    color: '#0f0', hp: 1, points: 10,
    bulletSpeed: 3, shootChance: 0.5, shootStyle: 'normal',
    move(a, t) {},
    draw(a, r) { drawBasicAlien(a, r, '#0f0'); }
  },
  zigzagger: {
    color: '#ff0', hp: 1, points: 20,
    bulletSpeed: 3, shootChance: 0.6, shootStyle: 'normal',
    move(a, t) { a.offsetX = Math.sin(t * 0.05 + a.phase) * 30; },
    draw(a, r) { drawZigzagger(a, r); }
  },
  diver: {
    color: '#f80', hp: 1, points: 30,
    bulletSpeed: 4, shootChance: 0.3, shootStyle: 'normal',
    move(a, t) {
      if (!a.diving && Math.random() < 0.002) {
        a.diving = true;
        a.diveStartY = a.formY + a.offsetY;
        a.diveVY = 3;
        a.diveVX = (player.x + PLAYER_W / 2 - (a.formX + a.offsetX + AW / 2)) * 0.02;
      }
      if (a.diving) {
        a.offsetY += a.diveVY;
        a.offsetX += a.diveVX;
        if (a.formY + a.offsetY > H + 20) {
          a.diving = false;
          a.offsetY = -a.formY + 30;
          a.offsetX = 0;
        }
      }
    },
    draw(a, r) { drawDiver(a, r); }
  },
  tank: {
    color: '#4af', hp: 3, points: 40,
    bulletSpeed: 2.5, shootChance: 0.7, shootStyle: 'normal',
    move(a, t) {},
    draw(a, r) { drawTank(a, r); }
  },
  splitter: {
    color: '#c4f', hp: 1, points: 25,
    bulletSpeed: 3, shootChance: 0.4, shootStyle: 'normal',
    move(a, t) { a.offsetX = Math.sin(t * 0.03 + a.phase) * 15; },
    onDeath(a) {
      for (let d = -1; d <= 1; d += 2) {
        aliens.push(makeAlien('mini', a.formX + a.offsetX + d * 18, a.formY + a.offsetY, 0, 0));
      }
    },
    draw(a, r) { drawSplitter(a, r); }
  },
  mini: {
    color: '#e8f', hp: 1, points: 15,
    bulletSpeed: 3.5, shootChance: 0.3, shootStyle: 'normal',
    move(a, t) {
      a.offsetX += Math.sin(t * 0.1 + a.phase) * 2;
      a.offsetY += Math.cos(t * 0.08 + a.phase) * 0.3;
      const ax = a.formX + a.offsetX;
      if (ax < 5) a.offsetX += 3;
      if (ax + AW > W - 5) a.offsetX -= 3;
    },
    draw(a, r) { drawMini(a, r); }
  },
  phaser: {
    color: '#f0f', hp: 1, points: 35,
    bulletSpeed: 3, shootChance: 0.5, shootStyle: 'normal',
    move(a, t) { a.visible = Math.sin(t * 0.04 + a.phase) > -0.3; },
    draw(a, r) { if (a.visible !== false) drawPhaser(a, r); }
  },
  bomber: {
    color: '#f33', hp: 2, points: 45,
    bulletSpeed: 2, shootChance: 0.8, shootStyle: 'spread',
    move(a, t) {},
    draw(a, r) { drawBomber(a, r); }
  },
  speedster: {
    color: '#fff', hp: 1, points: 30,
    bulletSpeed: 5, shootChance: 0.3, shootStyle: 'normal',
    move(a, t) {
      if (!a.dashTimer) a.dashTimer = 0;
      a.dashTimer++;
      if (a.dashTimer > 120 && Math.random() < 0.02) {
        a.offsetX += (Math.random() > 0.5 ? 1 : -1) * 60;
        a.dashTimer = 0;
        const ax = a.formX + a.offsetX;
        if (ax < 5) a.offsetX = 5 - a.formX;
        if (ax + AW > W - 5) a.offsetX = W - 5 - AW - a.formX;
      }
    },
    draw(a, r) { drawSpeedster(a, r); }
  },
  mothership: {
    color: '#fd0', hp: 20, points: 200,
    bulletSpeed: 3, shootChance: 1, shootStyle: 'aimed',
    move(a, t) {
      a.offsetX = Math.sin(t * 0.015) * (W / 2 - 60);
      a.offsetY = Math.sin(t * 0.01) * 30;
    },
    draw(a, r) { drawMothership(a, r); }
  }
};

// ── Level definitions ──
const LEVELS = [
  { name: 'The Swarm Arrives', intro: 'Grunts — basic invaders',
    rows: [{ type: 'grunt', count: 8 }, { type: 'grunt', count: 8 }, { type: 'grunt', count: 8 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.6, shootInterval: 55 },
  { name: 'Evasive Maneuvers', intro: 'NEW: Zigzaggers — weave side to side',
    rows: [{ type: 'zigzagger', count: 8 }, { type: 'zigzagger', count: 8 }, { type: 'grunt', count: 8 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.7, shootInterval: 50 },
  { name: 'Dive Bombers', intro: 'NEW: Divers — break formation to attack',
    rows: [{ type: 'grunt', count: 8 }, { type: 'diver', count: 6 }, { type: 'diver', count: 6 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.8, shootInterval: 50 },
  { name: 'Heavy Armor', intro: 'NEW: Tanks — take 3 hits to destroy',
    rows: [{ type: 'tank', count: 6 }, { type: 'grunt', count: 8 }, { type: 'zigzagger', count: 8 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.7, shootInterval: 45 },
  { name: 'Mitosis', intro: 'NEW: Splitters — split in two when killed',
    rows: [{ type: 'splitter', count: 7 }, { type: 'splitter', count: 7 }, { type: 'diver', count: 6 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.8, shootInterval: 45 },
  { name: 'Now You See Me', intro: 'NEW: Phasers — phase in and out of reality',
    rows: [{ type: 'phaser', count: 8 }, { type: 'phaser', count: 8 }, { type: 'zigzagger', count: 8 }, { type: 'tank', count: 6 }],
    formSpeed: 0.9, shootInterval: 40 },
  { name: 'Carpet Bombing', intro: 'NEW: Bombers — fire spread shots',
    rows: [{ type: 'bomber', count: 5 }, { type: 'tank', count: 6 }, { type: 'grunt', count: 8 }, { type: 'diver', count: 6 }, { type: 'grunt', count: 8 }],
    formSpeed: 0.9, shootInterval: 38 },
  { name: 'Warp Speed', intro: 'NEW: Speedsters — dash unpredictably',
    rows: [{ type: 'speedster', count: 8 }, { type: 'speedster', count: 8 }, { type: 'diver', count: 6 }, { type: 'zigzagger', count: 8 }, { type: 'bomber', count: 5 }],
    formSpeed: 1.1, shootInterval: 35 },
  { name: 'The Gauntlet', intro: 'All enemy types combined',
    rows: [{ type: 'phaser', count: 8 }, { type: 'bomber', count: 5 }, { type: 'splitter', count: 7 }, { type: 'tank', count: 6 }, { type: 'speedster', count: 8 }, { type: 'diver', count: 6 }],
    formSpeed: 1.2, shootInterval: 30 },
  { name: 'The Mothership', intro: 'BOSS: Mothership — spawns minions',
    rows: [{ type: 'mothership', count: 1 }, { type: 'tank', count: 6 }, { type: 'speedster', count: 8 }, { type: 'bomber', count: 5 }, { type: 'phaser', count: 8 }, { type: 'diver', count: 6 }],
    formSpeed: 1.0, shootInterval: 25 },
];

let player, bullets, alienBullets, aliens, particles;
let score, lives, wave, tick;
let formX, formDir, formSpeed, shootInterval, shootTimer;
let waveIntroTimer;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');

function makeAlien(type, fx, fy, row, col) {
  const t = TYPES[type];
  return {
    type, formX: fx, formY: fy, offsetX: 0, offsetY: 0,
    row, col, alive: true,
    hp: t.hp, maxHp: t.hp,
    phase: Math.random() * Math.PI * 2,
    visible: true, diving: false,
  };
}

function alienScreenX(a) {
  return (a.type === 'mini' ? a.formX : a.formX + formX) + a.offsetX;
}
function alienScreenY(a) { return a.formY + a.offsetY; }

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI * 2 / 12) * i + Math.random() * 0.3;
    const spd = 1 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 20 + Math.random() * 10, color });
  }
}

function spawnSpark(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 8, color: '#fff' });
  }
}

// ── Drawing functions ──
function drawBasicAlien(a, r, color) {
  const x = alienScreenX(a), y = alienScreenY(a);
  r.setGlow(color, 0.4);
  r.fillRect(x + 4, y, AW - 8, AH - 4, color);
  r.fillRect(x, y + 6, AW, AH - 12, color);
  r.setGlow(null);
  r.fillRect(x + 8, y + 8, 4, 4, '#1a1a2e');
  r.fillRect(x + AW - 12, y + 8, 4, 4, '#1a1a2e');
}

function drawZigzagger(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  r.setGlow('#ff0', 0.4);
  r.fillPoly([
    { x: x + AW / 2, y: y },
    { x: x + AW, y: y + AH / 2 },
    { x: x + AW / 2, y: y + AH },
    { x: x, y: y + AH / 2 }
  ], '#ff0');
  r.setGlow(null);
  r.fillRect(x + 10, y + 9, 3, 3, '#1a1a2e');
  r.fillRect(x + AW - 13, y + 9, 3, 3, '#1a1a2e');
}

function drawDiver(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  r.setGlow('#f80', 0.5);
  r.fillPoly([
    { x: x + AW / 2, y: y + AH },
    { x: x, y: y },
    { x: x + AW * 0.3, y: y + AH * 0.4 },
    { x: x + AW / 2, y: y },
    { x: x + AW * 0.7, y: y + AH * 0.4 },
    { x: x + AW, y: y }
  ], '#f80');
  r.setGlow(null);
  r.fillCircle(x + AW / 2, y + AH * 0.5, 3, '#1a1a2e');
}

function drawTank(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  const pct = a.hp / a.maxHp;
  const cr = Math.round(70 + (1 - pct) * 180);
  const cg = Math.round(170 * pct);
  const color = `rgb(${cr},${cg},255)`;
  r.setGlow('#4af', 0.4);
  r.fillRect(x + 2, y + 2, AW - 4, AH - 4, color);
  r.fillRect(x - 2, y + 6, AW + 4, AH - 12, color);
  r.setGlow(null);
  // Armor border
  r.drawLine(x + 4, y + 4, x + AW - 4, y + 4, '#1a1a2e', 2);
  r.drawLine(x + AW - 4, y + 4, x + AW - 4, y + AH - 4, '#1a1a2e', 2);
  r.drawLine(x + AW - 4, y + AH - 4, x + 4, y + AH - 4, '#1a1a2e', 2);
  r.drawLine(x + 4, y + AH - 4, x + 4, y + 4, '#1a1a2e', 2);
  r.fillRect(x + 8, y + 8, 5, 5, '#1a1a2e');
  r.fillRect(x + AW - 13, y + 8, 5, 5, '#1a1a2e');
}

function drawSplitter(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  r.setGlow('#c4f', 0.5);
  r.fillCircle(x + AW / 2, y + AH / 2, AW / 2 - 2, '#c4f');
  r.setGlow(null);
  r.drawLine(x + AW / 2, y + 2, x + AW / 2, y + AH - 2, '#1a1a2e', 2);
  r.fillCircle(x + AW / 2 - 6, y + AH / 2, 2.5, '#1a1a2e');
  r.fillCircle(x + AW / 2 + 6, y + AH / 2, 2.5, '#1a1a2e');
}

function drawMini(a, r) {
  const x = a.formX + a.offsetX, y = a.formY + a.offsetY;
  r.setGlow('#e8f', 0.3);
  r.fillCircle(x + 8, y + 8, 8, '#e8f');
  r.setGlow(null);
  r.fillCircle(x + 6, y + 7, 2, '#1a1a2e');
  r.fillCircle(x + 10, y + 7, 2, '#1a1a2e');
}

function drawPhaser(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  const alpha = a.visible !== false ? 0.9 : 0.15;
  const glow = a.visible !== false ? 0.6 : 0.1;
  r.setGlow('#f0f', glow);
  // Simplified ghost: semicircle top + wavy bottom as rect
  r.fillCircle(x + AW / 2, y + AH / 3, AW / 2 - 2, `rgba(255,0,255,${alpha})`);
  r.fillRect(x + 2, y + AH / 3, AW - 4, AH * 0.67, `rgba(255,0,255,${alpha})`);
  r.setGlow(null);
  if (a.visible !== false) {
    r.fillCircle(x + AW / 2 - 5, y + AH / 3, 3, '#fff');
    r.fillCircle(x + AW / 2 + 5, y + AH / 3, 3, '#fff');
    r.fillCircle(x + AW / 2 - 4, y + AH / 3, 1.5, '#1a1a2e');
    r.fillCircle(x + AW / 2 + 6, y + AH / 3, 1.5, '#1a1a2e');
  }
}

function drawBomber(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  const pct = a.hp / a.maxHp;
  const color = pct > 0.5 ? '#f33' : '#f66';
  r.setGlow('#f33', 0.5);
  r.fillRect(x, y + 4, AW, AH - 8, color);
  r.fillRect(x + 4, y, AW - 8, AH, color);
  r.setGlow(null);
  r.fillRect(x + AW / 2 - 4, y + AH - 6, 8, 6, '#800');
  // Angry eyes
  r.fillRect(x + 6, y + 6, 6, 4, '#ff0');
  r.fillRect(x + AW - 12, y + 6, 6, 4, '#ff0');
  r.fillRect(x + 8, y + 7, 3, 3, '#1a1a2e');
  r.fillRect(x + AW - 11, y + 7, 3, 3, '#1a1a2e');
}

function drawSpeedster(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  r.setGlow('#aaf', 0.6);
  r.fillPoly([
    { x: x + AW / 2, y: y },
    { x: x + AW + 4, y: y + AH / 2 },
    { x: x + AW / 2, y: y + AH - 2 },
    { x: x - 4, y: y + AH / 2 }
  ], '#fff');
  r.setGlow(null);
  // Speed lines
  for (let i = 0; i < 3; i++) {
    r.drawLine(x - 8 - i * 6, y + 6 + i * 6, x - 2 - i * 4, y + 6 + i * 6, 'rgba(170,170,255,0.4)', 1);
  }
  r.fillCircle(x + AW / 2 + 2, y + AH / 2 - 1, 3, '#1a1a2e');
}

function drawMothership(a, r) {
  const x = alienScreenX(a), y = alienScreenY(a);
  const mw = AW * 3, mh = AH * 2;
  const pulse = Math.sin(tick * 0.05) * 0.3 + 0.7;
  r.setGlow('#fd0', 1.0);
  // Saucer body (wide ellipse approximated as rect + circles)
  r.fillRect(x + 10, y + mh * 0.45, mw - 20, mh * 0.3, `rgba(255,220,0,${pulse})`);
  r.fillCircle(x + 10, y + mh * 0.6, mh * 0.15, `rgba(255,220,0,${pulse})`);
  r.fillCircle(x + mw - 10, y + mh * 0.6, mh * 0.15, `rgba(255,220,0,${pulse})`);
  // Dome
  r.fillRect(x + mw * 0.3, y + mh * 0.15, mw * 0.4, mh * 0.35, `rgba(255,180,0,${pulse})`);
  r.fillCircle(x + mw / 2, y + mh * 0.15, mw * 0.2, `rgba(255,180,0,${pulse})`);
  r.setGlow(null);
  // Lights
  for (let i = 0; i < 5; i++) {
    const lx = x + mw * 0.2 + i * (mw * 0.15);
    const blink = Math.sin(tick * 0.1 + i) > 0;
    r.fillCircle(lx, y + mh * 0.6, 3, blink ? '#f00' : '#600');
  }
  // Health bar
  r.fillRect(x + 10, y - 8, mw - 20, 5, '#400');
  r.fillRect(x + 10, y - 8, (mw - 20) * (a.hp / a.maxHp), 5, '#0f0');
}

export function createGame() {
  const game = new Game('game');

  function startWave() {
    wave++;
    if (wave > 10) wave = 10;
    waveEl.textContent = wave;
    const lvl = LEVELS[wave - 1];
    formSpeed = lvl.formSpeed;
    shootInterval = lvl.shootInterval;
    shootTimer = 0;
    formX = 0;
    formDir = 1;
    aliens = [];
    alienBullets = [];

    let y = 40;
    lvl.rows.forEach((rowDef, r) => {
      const count = rowDef.count;
      const w = count * (AW + PAD) - PAD;
      const sx = (W - w) / 2;
      for (let c = 0; c < count; c++) {
        aliens.push(makeAlien(rowDef.type, sx + c * (AW + PAD), y, r, c));
      }
      y += rowDef.type === 'mothership' ? AH * 2 + PAD : AH + PAD;
    });

    // Show wave intro
    game.showOverlay(`WAVE ${wave}`, lvl.name);
    waveIntroTimer = 120;
  }

  function shoot() {
    if (bullets.length < 4) {
      bullets.push({ x: player.x + PLAYER_W / 2, y: player.y });
    }
  }

  game.onInit = () => {
    player = { x: W / 2 - PLAYER_W / 2, y: H - 50 };
    bullets = []; alienBullets = []; aliens = []; particles = [];
    score = 0; lives = 3; wave = 0; tick = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    waveEl.textContent = '1';
    waveIntroTimer = 0;
    game.showOverlay('SPACE INVADERS', 'Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed(' ') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.hideOverlay();
        startWave();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    tick++;

    // Wave intro countdown
    if (waveIntroTimer > 0) {
      waveIntroTimer--;
      if (waveIntroTimer <= 0) {
        game.hideOverlay();
      }
      return;
    }

    // Player movement
    if (input.isDown('ArrowLeft')) player.x = Math.max(0, player.x - PLAYER_SPEED);
    if (input.isDown('ArrowRight')) player.x = Math.min(W - PLAYER_W, player.x + PLAYER_SPEED);

    // Shoot
    if (input.wasPressed(' ')) shoot();

    // Formation movement
    const liveAliens = aliens.filter(a => a.alive);
    if (liveAliens.length === 0) { startWave(); return; }

    const leftMost = Math.min(...liveAliens.map(a => a.formX + a.offsetX)) + formX;
    const rightMost = Math.max(...liveAliens.map(a => a.formX + a.offsetX + AW)) + formX;

    if ((formDir === 1 && rightMost >= W - 5) || (formDir === -1 && leftMost <= 5)) {
      formDir *= -1;
      aliens.forEach(a => { if (a.type !== 'mini') a.formY += 12; });
      if (liveAliens.some(a => a.alive && a.formY + a.offsetY + AH >= player.y)) {
        game.showOverlay(wave >= 10 && aliens.every(a => !a.alive) ? 'YOU WIN!' : 'GAME OVER',
          `Score: ${score} — Press any key to restart`);
        game.setState('over');
        return;
      }
    }
    formX += formSpeed * formDir;

    // Per-alien movement
    aliens.forEach(a => { if (a.alive) TYPES[a.type].move(a, tick); });

    // Player bullets vs aliens
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) { bullets.splice(i, 1); continue; }

      for (const a of aliens) {
        if (!a.alive) continue;
        if (a.type === 'phaser' && a.visible === false) continue;
        const ax = alienScreenX(a);
        const ay = a.formY + a.offsetY;
        const aw = a.type === 'mothership' ? AW * 3 : AW;
        const ah = a.type === 'mothership' ? AH * 2 : AH;
        if (bullets[i] && bullets[i].x >= ax && bullets[i].x <= ax + aw &&
            bullets[i].y >= ay && bullets[i].y <= ay + ah) {
          a.hp--;
          bullets.splice(i, 1);
          if (a.hp <= 0) {
            a.alive = false;
            score += TYPES[a.type].points;
            scoreEl.textContent = score;
            spawnExplosion(ax + aw / 2, ay + ah / 2, TYPES[a.type].color);
            if (TYPES[a.type].onDeath) TYPES[a.type].onDeath(a);
            if (a.type === 'mothership') {
              for (let d = -1; d <= 1; d += 2) {
                aliens.push(makeAlien('mini', ax + d * 40, ay + ah, 0, 0));
              }
            }
          } else {
            spawnSpark(ax + aw / 2, ay + ah / 2);
          }
          break;
        }
      }
    }

    // Alien shooting
    shootTimer++;
    if (shootTimer >= shootInterval) {
      shootTimer = 0;
      const shooters = liveAliens.filter(a => a.type !== 'mini' && (a.type !== 'phaser' || a.visible !== false));
      if (shooters.length > 0) {
        const a = shooters[Math.floor(Math.random() * shooters.length)];
        const t = TYPES[a.type];
        if (Math.random() < t.shootChance) {
          const ax = alienScreenX(a) + AW / 2;
          const ay = a.formY + a.offsetY + AH;
          if (t.shootStyle === 'spread') {
            alienBullets.push({ x: ax, y: ay, vx: -1.5, vy: t.bulletSpeed });
            alienBullets.push({ x: ax, y: ay, vx: 0, vy: t.bulletSpeed });
            alienBullets.push({ x: ax, y: ay, vx: 1.5, vy: t.bulletSpeed });
          } else if (t.shootStyle === 'aimed') {
            const dx = player.x + PLAYER_W / 2 - ax;
            const dy = player.y - ay;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            alienBullets.push({ x: ax, y: ay, vx: dx / dist * t.bulletSpeed, vy: dy / dist * t.bulletSpeed });
          } else {
            alienBullets.push({ x: ax, y: ay, vx: 0, vy: t.bulletSpeed });
          }
        }
      }
    }

    // Alien bullets
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      alienBullets[i].x += alienBullets[i].vx;
      alienBullets[i].y += alienBullets[i].vy;
      if (alienBullets[i].y > H || alienBullets[i].x < 0 || alienBullets[i].x > W) {
        alienBullets.splice(i, 1); continue;
      }
      if (alienBullets[i].x >= player.x && alienBullets[i].x <= player.x + PLAYER_W &&
          alienBullets[i].y >= player.y && alienBullets[i].y <= player.y + PLAYER_H) {
        alienBullets.splice(i, 1);
        lives--;
        livesEl.textContent = lives;
        spawnExplosion(player.x + PLAYER_W / 2, player.y, '#0f0');
        if (lives <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
          game.setState('over');
          return;
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 83) % W);
      const sy = ((i * 251 + 47) % H);
      const twinkle = Math.sin(tick * 0.02 + i) > 0.7 ? 2 : 1;
      renderer.fillRect(sx, sy, twinkle, twinkle, 'rgba(255,255,255,0.06)');
    }

    // Aliens
    aliens.forEach(a => {
      if (!a.alive) return;
      TYPES[a.type].draw(a, renderer);
    });

    // Player ship
    renderer.setGlow('#0f0', 0.6);
    renderer.fillPoly([
      { x: player.x + PLAYER_W / 2, y: player.y - 8 },
      { x: player.x, y: player.y + PLAYER_H },
      { x: player.x + PLAYER_W, y: player.y + PLAYER_H }
    ], '#0f0');
    renderer.fillRect(player.x + 4, player.y + PLAYER_H - 4, PLAYER_W - 8, 4, '#0f0');

    // Player bullets
    renderer.setGlow('#0f0', 0.5);
    bullets.forEach(b => {
      renderer.fillRect(b.x - 1.5, b.y, 3, 10, '#0f0');
    });

    // Alien bullets
    renderer.setGlow('#f44', 0.4);
    alienBullets.forEach(b => {
      renderer.fillRect(b.x - 1.5, b.y, 3, 10, b.vx !== 0 ? '#f84' : '#f44');
    });

    renderer.setGlow(null);

    // Particles
    particles.forEach(p => {
      const alpha = p.life / 30;
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, `rgba(255,255,255,${alpha})`);
    });
  };

  game.start();
  return game;
}
