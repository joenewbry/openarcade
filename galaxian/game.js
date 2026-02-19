// galaxian/game.js — Galaxian game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480, H = 600;
const PLAYER_W = 32, PLAYER_H = 24;
const PLAYER_SPEED = 4;
const PLAYER_Y = H - 50;
const BULLET_SPEED = 8;
const ALIEN_W = 28, ALIEN_H = 20;

// Row types: flagship (top), commander, escorts, drones (bottom rows)
const ROW_DEFS = [
  { type: 'flagship',  count: 4,  color: '#ff4', glow: '#ff4', points: 60 },
  { type: 'commander', count: 8,  color: '#f44', glow: '#f44', points: 40 },
  { type: 'escort',    count: 10, color: '#84f', glow: '#84f', points: 25 },
  { type: 'escort',    count: 10, color: '#4af', glow: '#4af', points: 25 },
  { type: 'drone',     count: 10, color: '#0cf', glow: '#0cf', points: 15 },
  { type: 'drone',     count: 10, color: '#0cf', glow: '#0cf', points: 15 },
];

const NUM_STARS = 80;

// Expand short hex (#rgb) to rgba string with alpha
function particleColor(hex, alpha) {
  const h = hex.slice(1);
  let r, g, b;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── State ──
let score, best = 0, lives, wave, tick;
let player, bullet, aliens, alienBullets, particles, stars;
let formX, formDir, formSpeed;
let diveTimer, diveInterval;
// Delayed dive queue (replaces setTimeout for escorts following flagships)
let diveQueue; // array of { alien, delay }

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

// ── Stars ──
function initStars() {
  stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.3 + Math.random() * 1.2,
      brightness: 0.3 + Math.random() * 0.7,
      size: Math.random() < 0.3 ? 2 : 1
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

// ── Aliens ──
function makeAlien(type, color, glow, points, row, col, fx, fy) {
  return {
    type, color, glow, points, row, col,
    formX: fx, formY: fy,
    alive: true, diving: false,
    diveX: 0, diveY: 0, diveVX: 0, diveVY: 0,
    divePhase: 0,
    diveAngle: 0, diveRadius: 0,
    diveCenterX: 0, diveCenterY: 0,
  };
}

function spawnFormation() {
  aliens = [];
  const startY = 60;
  const rowGap = ALIEN_H + 8;

  for (let r = 0; r < ROW_DEFS.length; r++) {
    const def = ROW_DEFS[r];
    const totalW = def.count * (ALIEN_W + 6) - 6;
    const sx = (W - totalW) / 2;
    for (let c = 0; c < def.count; c++) {
      aliens.push(makeAlien(
        def.type, def.color, def.glow, def.points,
        r, c,
        sx + c * (ALIEN_W + 6),
        startY + r * rowGap
      ));
    }
  }
}

function alienScreenX(a) {
  if (a.diving) return a.diveX;
  return a.formX + formX;
}

function alienScreenY(a) {
  if (a.diving) return a.diveY;
  return a.formY;
}

// ── Dive bombing ──
function startDive(a) {
  if (a.diving || !a.alive) return;
  a.diving = true;
  a.divePhase = 1;
  a.diveX = a.formX + formX;
  a.diveY = a.formY;

  const targetX = player.x + PLAYER_W / 2;
  const dx = targetX - (a.diveX + ALIEN_W / 2);
  const speed = 2.5 + wave * 0.15;

  a.diveVX = dx * 0.008 + (Math.random() - 0.5) * 1.5;
  a.diveVY = speed;
  a.diveAngle = 0;
}

function updateDiver(a) {
  if (a.divePhase === 1) {
    // Swooping down toward player
    a.diveX += a.diveVX;
    a.diveY += a.diveVY;

    // Curve toward player
    const targetX = player.x + PLAYER_W / 2;
    const dx = targetX - (a.diveX + ALIEN_W / 2);
    a.diveVX += dx * 0.002;
    a.diveVX = Math.max(-3, Math.min(3, a.diveVX));

    // Alien shoots while diving
    if (Math.random() < 0.015) {
      alienBullets.push({
        x: a.diveX + ALIEN_W / 2,
        y: a.diveY + ALIEN_H,
        vx: a.diveVX * 0.3,
        vy: 4
      });
    }

    // Went past bottom -- loop back up from top
    if (a.diveY > H + 20) {
      a.divePhase = 2;
      a.diveY = -30;
      a.diveX = a.formX + formX + (Math.random() - 0.5) * 60;
    }

    // Keep within horizontal bounds
    if (a.diveX < 5) a.diveVX = Math.abs(a.diveVX);
    if (a.diveX + ALIEN_W > W - 5) a.diveVX = -Math.abs(a.diveVX);
  } else if (a.divePhase === 2) {
    // Returning to formation from top
    const targetX = a.formX + formX;
    const targetY = a.formY;
    const dx = targetX - a.diveX;
    const dy = targetY - a.diveY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      a.diving = false;
      a.divePhase = 0;
    } else {
      const speed = Math.min(3, dist * 0.04);
      a.diveX += (dx / dist) * speed;
      a.diveY += (dy / dist) * speed;
    }
  }
}

function triggerDive() {
  const inFormation = aliens.filter(a => a.alive && !a.diving);
  if (inFormation.length === 0) return;

  // Pick a random alien, weighted toward top rows
  const weights = inFormation.map(a => {
    if (a.type === 'flagship') return 4;
    if (a.type === 'commander') return 3;
    if (a.type === 'escort') return 2;
    return 1;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  let chosen = inFormation[0];
  for (let i = 0; i < inFormation.length; i++) {
    r -= weights[i];
    if (r <= 0) { chosen = inFormation[i]; break; }
  }

  startDive(chosen);

  // Flagships bring escorts with them (use frame-delay queue instead of setTimeout)
  if (chosen.type === 'flagship') {
    const escorts = inFormation.filter(a =>
      a.type === 'escort' && !a.diving &&
      Math.abs(a.col - chosen.col * 2.5) < 4
    );
    const toTake = escorts.slice(0, 2);
    for (const e of toTake) {
      // ~150-350ms at 60fps = 9-21 frames
      const delayFrames = Math.floor(9 + Math.random() * 12);
      diveQueue.push({ alien: e, delay: delayFrames });
    }
  }
}

// ── Particles ──
function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 / 14) * i + Math.random() * 0.4;
    const spd = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 18 + Math.random() * 12,
      maxLife: 30,
      color
    });
  }
}

// ── Drawing helpers ──
function drawAlien(a, renderer) {
  const x = alienScreenX(a);
  const y = alienScreenY(a);

  renderer.setGlow(a.glow, 0.5);

  if (a.type === 'flagship') {
    // Flagship: wing-shaped, yellow
    renderer.fillPoly([
      { x: x + ALIEN_W / 2, y: y },
      { x: x + ALIEN_W + 4, y: y + ALIEN_H * 0.6 },
      { x: x + ALIEN_W, y: y + ALIEN_H },
      { x: x, y: y + ALIEN_H },
      { x: x - 4, y: y + ALIEN_H * 0.6 },
    ], a.color);
    // Crown detail
    renderer.fillRect(x + ALIEN_W / 2 - 3, y + 2, 6, 4, '#fa0');
    // Eyes
    renderer.fillRect(x + 8, y + 10, 3, 3, '#1a1a2e');
    renderer.fillRect(x + ALIEN_W - 11, y + 10, 3, 3, '#1a1a2e');
  } else if (a.type === 'commander') {
    // Commander: red, angular
    renderer.fillPoly([
      { x: x + ALIEN_W / 2, y: y },
      { x: x + ALIEN_W, y: y + ALIEN_H * 0.5 },
      { x: x + ALIEN_W - 3, y: y + ALIEN_H },
      { x: x + 3, y: y + ALIEN_H },
      { x: x, y: y + ALIEN_H * 0.5 },
    ], a.color);
    // Wing marks
    renderer.fillRect(x + 3, y + ALIEN_H * 0.4, 4, 3, '#d22');
    renderer.fillRect(x + ALIEN_W - 7, y + ALIEN_H * 0.4, 4, 3, '#d22');
    // Eyes
    renderer.fillRect(x + 9, y + 9, 3, 3, '#1a1a2e');
    renderer.fillRect(x + ALIEN_W - 12, y + 9, 3, 3, '#1a1a2e');
  } else if (a.type === 'escort') {
    // Escort: diamond-ish
    renderer.fillPoly([
      { x: x + ALIEN_W / 2, y: y },
      { x: x + ALIEN_W, y: y + ALIEN_H / 2 },
      { x: x + ALIEN_W / 2, y: y + ALIEN_H },
      { x: x, y: y + ALIEN_H / 2 },
    ], a.color);
    // Core
    renderer.fillCircle(x + ALIEN_W / 2, y + ALIEN_H / 2, 3, '#1a1a2e');
  } else {
    // Drone: rectangle with antennae
    renderer.fillRect(x + 2, y + 4, ALIEN_W - 4, ALIEN_H - 6, a.color);
    renderer.fillRect(x + 6, y, ALIEN_W - 12, ALIEN_H - 2, a.color);
    // Antennae
    renderer.fillRect(x + 4, y - 2, 2, 4, a.color);
    renderer.fillRect(x + ALIEN_W - 6, y - 2, 2, 4, a.color);
    // Eyes
    renderer.fillRect(x + 8, y + 6, 3, 3, '#1a1a2e');
    renderer.fillRect(x + ALIEN_W - 11, y + 6, 3, 3, '#1a1a2e');
  }

  renderer.setGlow(null);
}

function drawPlayer(renderer) {
  const x = player.x, y = PLAYER_Y;

  renderer.setGlow('#84f', 0.7);

  // Ship body
  renderer.fillPoly([
    { x: x + PLAYER_W / 2, y: y - 6 },
    { x: x + PLAYER_W, y: y + PLAYER_H },
    { x: x + PLAYER_W - 4, y: y + PLAYER_H },
    { x: x + PLAYER_W / 2, y: y + PLAYER_H - 6 },
    { x: x + 4, y: y + PLAYER_H },
    { x: x, y: y + PLAYER_H },
  ], '#84f');

  renderer.setGlow(null);

  // Cockpit highlight
  renderer.fillRect(x + PLAYER_W / 2 - 2, y + 2, 4, 6, '#b8f');

  // Engine glow (flicker via tick)
  const flicker = Math.sin(tick * 0.3) * 0.3 + 0.7;
  const a = Math.round(flicker * 255).toString(16).padStart(2, '0');
  renderer.fillRect(x + PLAYER_W / 2 - 4, y + PLAYER_H - 2, 8, 4, '#8844ff' + a);
}

function drawLivesIndicator(renderer) {
  for (let i = 0; i < lives - 1; i++) {
    const lx = 10 + i * 22;
    const ly = H - 20;
    renderer.setGlow('#84f', 0.3);
    renderer.fillPoly([
      { x: lx + 7, y: ly },
      { x: lx + 14, y: ly + 10 },
      { x: lx, y: ly + 10 },
    ], '#84f');
    renderer.setGlow(null);
  }
}

export function createGame() {
  const game = new Game('game');

  function loseLife() {
    lives--;
    livesEl.textContent = lives;
    spawnExplosion(player.x + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2, '#84f');
    if (lives <= 0) {
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      game.showOverlay('GAME OVER', `Score: ${score} — Press SPACE to restart`);
      game.setState('over');
      return;
    }
    player.x = W / 2 - PLAYER_W / 2;
    bullet = null;
    alienBullets = [];
  }

  function nextWave() {
    wave++;
    formX = 0;
    formDir = 1;
    formSpeed = 0.4 + wave * 0.08;
    diveInterval = Math.max(40, 120 - wave * 8);
    diveTimer = 0;
    bullet = null;
    alienBullets = [];
    diveQueue = [];
    spawnFormation();
  }

  function shoot() {
    if (bullet) return; // One shot at a time
    bullet = { x: player.x + PLAYER_W / 2, y: PLAYER_Y };
  }

  game.onInit = () => {
    score = 0;
    lives = 3;
    wave = 1;
    tick = 0;
    formX = 0;
    formDir = 1;
    formSpeed = 0.4;
    diveTimer = 0;
    diveInterval = 120;
    diveQueue = [];
    player = { x: W / 2 - PLAYER_W / 2 };
    bullet = null;
    alienBullets = [];
    particles = [];

    scoreEl.textContent = '0';
    livesEl.textContent = '3';

    initStars();
    spawnFormation();

    game.showOverlay('GALAXIAN', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Stars always update for visual effect
    updateStars();

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.hideOverlay();
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    tick++;

    // Player movement
    if (input.isDown('ArrowLeft')) player.x = Math.max(0, player.x - PLAYER_SPEED);
    if (input.isDown('ArrowRight')) player.x = Math.min(W - PLAYER_W, player.x + PLAYER_SPEED);

    // Shoot
    if (input.wasPressed(' ')) shoot();

    // Check all aliens dead
    const liveAliens = aliens.filter(a => a.alive);
    if (liveAliens.length === 0) {
      nextWave();
      return;
    }

    // Formation movement
    const inFormation = liveAliens.filter(a => !a.diving);
    if (inFormation.length > 0) {
      const leftMost = Math.min(...inFormation.map(a => a.formX)) + formX;
      const rightMost = Math.max(...inFormation.map(a => a.formX + ALIEN_W)) + formX;

      if ((formDir === 1 && rightMost >= W - 10) || (formDir === -1 && leftMost <= 10)) {
        formDir *= -1;
      }
      formX += formSpeed * formDir;
    }

    // Dive bombing timer
    diveTimer++;
    if (diveTimer >= diveInterval) {
      diveTimer = 0;
      triggerDive();
    }

    // Process delayed dive queue (replaces setTimeout)
    for (let i = diveQueue.length - 1; i >= 0; i--) {
      diveQueue[i].delay--;
      if (diveQueue[i].delay <= 0) {
        startDive(diveQueue[i].alien);
        diveQueue.splice(i, 1);
      }
    }

    // Update divers
    for (const a of aliens) {
      if (a.alive && a.diving) {
        updateDiver(a);
      }
    }

    // Player bullet
    if (bullet) {
      bullet.y -= BULLET_SPEED;
      if (bullet.y < -10) bullet = null;
    }

    // Bullet vs aliens
    if (bullet) {
      for (const a of aliens) {
        if (!a.alive) continue;
        const ax = alienScreenX(a);
        const ay = alienScreenY(a);
        if (bullet.x >= ax && bullet.x <= ax + ALIEN_W &&
            bullet.y >= ay && bullet.y <= ay + ALIEN_H) {
          a.alive = false;
          bullet = null;

          // Diving aliens give double points
          const pts = a.diving ? a.points * 2 : a.points;
          score += pts;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
          spawnExplosion(ax + ALIEN_W / 2, ay + ALIEN_H / 2, a.color);
          break;
        }
      }
    }

    // Alien bullets
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      const b = alienBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H || b.x < 0 || b.x > W) {
        alienBullets.splice(i, 1);
        continue;
      }
      // Hit player
      if (b.x >= player.x && b.x <= player.x + PLAYER_W &&
          b.y >= PLAYER_Y && b.y <= PLAYER_Y + PLAYER_H) {
        alienBullets.splice(i, 1);
        loseLife();
        if (game.state === 'over') return;
      }
    }

    // Diving aliens collide with player
    for (const a of aliens) {
      if (!a.alive || !a.diving) continue;
      const ax = alienScreenX(a);
      const ay = alienScreenY(a);
      if (ax < player.x + PLAYER_W && ax + ALIEN_W > player.x &&
          ay < PLAYER_Y + PLAYER_H && ay + ALIEN_H > PLAYER_Y) {
        a.alive = false;
        spawnExplosion(ax + ALIEN_W / 2, ay + ALIEN_H / 2, a.color);
        loseLife();
        if (game.state === 'over') return;
      }
    }

    // Formation aliens shoot occasionally
    if (tick % 50 === 0) {
      const shooters = inFormation.filter(a => a.alive);
      if (shooters.length > 0) {
        const a = shooters[Math.floor(Math.random() * shooters.length)];
        const ax = alienScreenX(a) + ALIEN_W / 2;
        const ay = alienScreenY(a) + ALIEN_H;
        alienBullets.push({ x: ax, y: ay, vx: 0, vy: 3 + wave * 0.2 });
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars
    for (const s of stars) {
      const a = Math.round(s.brightness * 255).toString(16).padStart(2, '0');
      renderer.fillRect(s.x, s.y, s.size, s.size, '#ffffff' + a);
    }

    // Aliens
    for (const a of aliens) {
      if (a.alive) drawAlien(a, renderer);
    }

    // Player
    if (game.state === 'playing' || game.state === 'waiting') {
      drawPlayer(renderer);
    }

    // Player bullet
    if (bullet) {
      renderer.setGlow('#84f', 0.6);
      renderer.fillRect(bullet.x - 1.5, bullet.y, 3, 10, '#fff');
      renderer.setGlow(null);
    }

    // Alien bullets
    renderer.setGlow('#f44', 0.4);
    for (const b of alienBullets) {
      renderer.fillRect(b.x - 1.5, b.y, 3, 8, '#f66');
    }
    renderer.setGlow(null);

    // Particles (use rgba since base colors are short hex)
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, particleColor(p.color, alpha));
    }

    // Lives indicator
    drawLivesIndicator(renderer);

    // Wave indicator
    renderer.setGlow('#84f', 0.3);
    text.drawText('WAVE ' + wave, W - 10, H - 22, 12, '#84f', 'right');
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
