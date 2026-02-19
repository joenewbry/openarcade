// tower-defense/game.js — Tower Defense game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 480;

// Grid constants
const CELL = 40;
const COLS = W / CELL;  // 15
const ROWS = H / CELL;  // 12

// Path definition: S-shaped path enemies follow
const PATH = [];
function buildPath() {
  PATH.length = 0;
  // Row 1: left to right (y=1, x=0..13)
  for (let x = 0; x <= 13; x++) PATH.push({ x, y: 1 });
  // Down right side (x=13, y=2..3)
  for (let y = 2; y <= 3; y++) PATH.push({ x: 13, y });
  // Row 3: right to left (y=3, x=12..1)
  for (let x = 12; x >= 1; x--) PATH.push({ x, y: 3 });
  // Down left side (x=1, y=4..5)
  for (let y = 4; y <= 5; y++) PATH.push({ x: 1, y });
  // Row 5: left to right (y=5, x=2..13)
  for (let x = 2; x <= 13; x++) PATH.push({ x, y: 5 });
  // Down right side (x=13, y=6..7)
  for (let y = 6; y <= 7; y++) PATH.push({ x: 13, y });
  // Row 7: right to left (y=7, x=12..1)
  for (let x = 12; x >= 1; x--) PATH.push({ x, y: 7 });
  // Down left side (x=1, y=8..9)
  for (let y = 8; y <= 9; y++) PATH.push({ x: 1, y });
  // Row 9: left to right (y=9, x=2..14)
  for (let x = 2; x <= 14; x++) PATH.push({ x, y: 9 });
}
buildPath();

// Path lookup set for quick collision check
const pathSet = new Set();
function rebuildPathSet() {
  pathSet.clear();
  PATH.forEach(p => pathSet.add(p.x + ',' + p.y));
}
rebuildPathSet();

// Tower types
const TOWER_TYPES = {
  blaster: { name: 'Blaster', cost: 50, range: 3, damage: 8, fireRate: 8, color: '#4f4', splash: 0, slow: 0, bulletSpeed: 6, bulletSize: 3 },
  cannon:  { name: 'Cannon', cost: 100, range: 2.5, damage: 40, fireRate: 30, color: '#f80', splash: 1.2, slow: 0, bulletSpeed: 4, bulletSize: 5 },
  frost:   { name: 'Frost', cost: 75, range: 2.8, damage: 5, fireRate: 12, color: '#0ef', splash: 0, slow: 0.5, bulletSpeed: 5, bulletSize: 4 },
  sniper:  { name: 'Sniper', cost: 150, range: 5.5, damage: 60, fireRate: 50, color: '#f4f', splash: 0, slow: 0, bulletSpeed: 10, bulletSize: 2 }
};

// Enemy types
const ENEMY_TYPES = {
  basic: { hp: 40, speed: 1.0, reward: 10, color: '#f44', size: 12 },
  fast:  { hp: 25, speed: 2.0, reward: 15, color: '#ff0', size: 10 },
  tank:  { hp: 150, speed: 0.6, reward: 25, color: '#f80', size: 16 },
  boss:  { hp: 500, speed: 0.4, reward: 100, color: '#f0f', size: 20 }
};

// Wave definitions
function getWave(n) {
  const waves = [];
  if (n <= 3) {
    for (let i = 0; i < 5 + n * 2; i++) waves.push('basic');
  } else if (n <= 6) {
    for (let i = 0; i < 4 + n; i++) waves.push('basic');
    for (let i = 0; i < n - 2; i++) waves.push('fast');
  } else if (n <= 10) {
    for (let i = 0; i < 3 + n; i++) waves.push('basic');
    for (let i = 0; i < n - 3; i++) waves.push('fast');
    for (let i = 0; i < Math.floor((n - 5) / 2); i++) waves.push('tank');
  } else if (n <= 15) {
    for (let i = 0; i < n; i++) waves.push('basic');
    for (let i = 0; i < n - 4; i++) waves.push('fast');
    for (let i = 0; i < Math.floor(n / 4); i++) waves.push('tank');
    if (n % 5 === 0) waves.push('boss');
  } else {
    for (let i = 0; i < n + 2; i++) waves.push('basic');
    for (let i = 0; i < n - 2; i++) waves.push('fast');
    for (let i = 0; i < Math.floor(n / 3); i++) waves.push('tank');
    if (n % 3 === 0) waves.push('boss');
  }
  const hpMult = 1 + (n - 1) * 0.12;
  return waves.map(type => {
    const e = ENEMY_TYPES[type];
    return {
      type, hp: Math.round(e.hp * hpMult), maxHp: Math.round(e.hp * hpMult),
      speed: e.speed, reward: e.reward, color: e.color, size: e.size
    };
  });
}

// ── State ──
let score, gold, lives, wave;
let waveEnemies, spawnTimer, spawnIndex;
let enemies, towers, bullets, particles;
let selectedTower, cursorX, cursorY;
let mouseX, mouseY;
let frameCount, waveDelay;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
let best = 0;

// ── Mouse click queue ──
let pendingClicks = [];

function canPlace(gx, gy) {
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
  if (pathSet.has(gx + ',' + gy)) return false;
  if (towers.some(t => t.x === gx && t.y === gy)) return false;
  let adjacent = false;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (pathSet.has((gx + dx) + ',' + (gy + dy))) {
        adjacent = true;
        break;
      }
    }
    if (adjacent) break;
  }
  return adjacent;
}

function placeTower(gx, gy) {
  const type = TOWER_TYPES[selectedTower];
  if (gold < type.cost) return;
  if (!canPlace(gx, gy)) return;

  gold -= type.cost;
  towers.push({
    x: gx, y: gy,
    range: type.range, damage: type.damage, fireRate: type.fireRate,
    cooldown: 0, color: type.color, splash: type.splash, slow: type.slow,
    bulletSpeed: type.bulletSpeed, bulletSize: type.bulletSize,
    angle: 0, type: selectedTower
  });

  for (let p = 0; p < 4; p++) {
    particles.push({
      x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2,
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
      life: 15, color: type.color
    });
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
}

function updateTowerKeyIndicators() {
  const map = { blaster: 'tk1', cannon: 'tk2', frost: 'tk3', sniper: 'tk4' };
  Object.entries(map).forEach(([type, id]) => {
    const el = document.getElementById(id);
    if (el) {
      if (type === selectedTower) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });
}

function nextWave() {
  wave++;
  waveEnemies = getWave(wave);
  // Shuffle
  for (let i = waveEnemies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [waveEnemies[i], waveEnemies[j]] = [waveEnemies[j], waveEnemies[i]];
  }
  spawnIndex = 0;
  spawnTimer = 0;
}

export function createGame() {
  const game = new Game('game');

  // Set up mouse events on the canvas
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvasEl.addEventListener('mouseleave', () => {
    mouseX = -1;
    mouseY = -1;
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    pendingClicks.push({ x: mx, y: my });
  });

  game.onInit = () => {
    score = 0;
    gold = 200;
    lives = 20;
    wave = 0;
    enemies = [];
    towers = [];
    bullets = [];
    particles = [];
    waveEnemies = [];
    spawnTimer = 0;
    spawnIndex = 0;
    frameCount = 0;
    waveDelay = 0;
    selectedTower = 'blaster';
    cursorX = 7;
    cursorY = 0;
    mouseX = -1;
    mouseY = -1;
    pendingClicks = [];
    scoreEl.textContent = '0';
    updateTowerKeyIndicators();
    game.showOverlay('TOWER DEFENSE', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
        nextWave();
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Handle tower selection keys
    if (input.wasPressed('1')) { selectedTower = 'blaster'; updateTowerKeyIndicators(); }
    if (input.wasPressed('2')) { selectedTower = 'cannon'; updateTowerKeyIndicators(); }
    if (input.wasPressed('3')) { selectedTower = 'frost'; updateTowerKeyIndicators(); }
    if (input.wasPressed('4')) { selectedTower = 'sniper'; updateTowerKeyIndicators(); }

    // Handle keyboard cursor movement
    if (input.wasPressed('ArrowLeft')) {
      cursorX = Math.max(0, cursorX - 1);
      mouseX = -1; mouseY = -1;
    }
    if (input.wasPressed('ArrowRight')) {
      cursorX = Math.min(COLS - 1, cursorX + 1);
      mouseX = -1; mouseY = -1;
    }
    if (input.wasPressed('ArrowUp')) {
      cursorY = Math.max(0, cursorY - 1);
      mouseX = -1; mouseY = -1;
    }
    if (input.wasPressed('ArrowDown')) {
      cursorY = Math.min(ROWS - 1, cursorY + 1);
      mouseX = -1; mouseY = -1;
    }

    // Place tower via keyboard
    if (input.wasPressed(' ')) {
      placeTower(cursorX, cursorY);
    }

    // Process queued mouse clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const gx = Math.floor(click.x / CELL);
      const gy = Math.floor(click.y / CELL);
      placeTower(gx, gy);
    }

    // Spawn enemies from current wave
    if (spawnIndex < waveEnemies.length) {
      spawnTimer++;
      const spawnInterval = Math.max(15, 40 - wave);
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const template = waveEnemies[spawnIndex];
        enemies.push({
          pathIdx: 0, progress: 0,
          hp: template.hp, maxHp: template.maxHp,
          speed: template.speed, reward: template.reward,
          color: template.color, size: template.size, type: template.type,
          slowTimer: 0,
          x: PATH[0].x * CELL + CELL / 2,
          y: PATH[0].y * CELL + CELL / 2
        });
        spawnIndex++;
      }
    }

    // Check for wave complete
    if (spawnIndex >= waveEnemies.length && enemies.length === 0) {
      waveDelay++;
      if (waveDelay >= 90) {
        waveDelay = 0;
        gold += 20 + wave * 5;
        nextWave();
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      let speed = e.speed;
      if (e.slowTimer > 0) {
        speed *= 0.4;
        e.slowTimer--;
      }

      e.progress += speed * 0.03;

      const idx = Math.floor(e.pathIdx + e.progress);
      if (idx >= PATH.length - 1) {
        lives--;
        enemies.splice(i, 1);
        for (let p = 0; p < 5; p++) {
          particles.push({
            x: PATH[PATH.length - 1].x * CELL + CELL / 2,
            y: PATH[PATH.length - 1].y * CELL + CELL / 2,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 20, color: '#f00'
          });
        }
        if (lives <= 0) {
          lives = 0;
          if (score > best) { best = score; bestEl.textContent = best; }
          game.showOverlay('GAME OVER', `Score: ${score} | Wave: ${wave} -- Press SPACE to restart`);
          game.setState('over');
          return;
        }
        continue;
      }

      const currNode = PATH[idx];
      const nextNode = PATH[Math.min(idx + 1, PATH.length - 1)];
      const frac = (e.pathIdx + e.progress) - idx;
      e.x = (currNode.x + (nextNode.x - currNode.x) * frac) * CELL + CELL / 2;
      e.y = (currNode.y + (nextNode.y - currNode.y) * frac) * CELL + CELL / 2;
    }

    // Update towers (fire at enemies)
    towers.forEach(t => {
      if (t.cooldown > 0) { t.cooldown--; return; }

      let target = null;
      const rangePixels = t.range * CELL;

      enemies.forEach(e => {
        const dx = e.x - (t.x * CELL + CELL / 2);
        const dy = e.y - (t.y * CELL + CELL / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= rangePixels) {
          const pathProgress = e.pathIdx + e.progress;
          if (!target || pathProgress > (target._pathProgress || 0)) {
            target = e;
            target._pathProgress = pathProgress;
          }
        }
      });

      if (target) {
        t.cooldown = t.fireRate;
        t.angle = Math.atan2(target.y - (t.y * CELL + CELL / 2), target.x - (t.x * CELL + CELL / 2));

        bullets.push({
          x: t.x * CELL + CELL / 2, y: t.y * CELL + CELL / 2,
          tx: target.x, ty: target.y, target: target,
          speed: t.bulletSpeed, damage: t.damage,
          splash: t.splash, slow: t.slow,
          color: t.color, size: t.bulletSize
        });
      }
    });

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      if (b.target && enemies.includes(b.target)) {
        b.tx = b.target.x;
        b.ty = b.target.y;
      }

      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < b.speed * 2) {
        if (b.splash > 0) {
          const splashR = b.splash * CELL;
          enemies.forEach(e => {
            const edx = e.x - b.tx;
            const edy = e.y - b.ty;
            if (Math.sqrt(edx * edx + edy * edy) <= splashR) {
              damageEnemy(e, b.damage * 0.6);
            }
          });
          if (b.target && enemies.includes(b.target)) {
            damageEnemy(b.target, b.damage * 0.4);
          }
          for (let p = 0; p < 8; p++) {
            particles.push({
              x: b.tx, y: b.ty,
              vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
              life: 15, color: b.color
            });
          }
        } else {
          if (b.target && enemies.includes(b.target)) {
            damageEnemy(b.target, b.damage);
            if (b.slow > 0) {
              b.target.slowTimer = 60;
            }
          }
          for (let p = 0; p < 3; p++) {
            particles.push({
              x: b.tx, y: b.ty,
              vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
              life: 10, color: b.color
            });
          }
        }
        bullets.splice(i, 1);
        continue;
      }

      b.x += (dx / dist) * b.speed;
      b.y += (dy / dist) * b.speed;

      if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
        bullets.splice(i, 1);
      }
    }

    // Remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        const e = enemies[i];
        gold += e.reward;
        score += e.reward;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        for (let p = 0; p < 6; p++) {
          particles.push({
            x: e.x, y: e.y,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 20, color: e.color
          });
        }
        enemies.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Expose game data for ML
    window.gameData = {
      gold, lives, wave, score,
      towerCount: towers.length,
      enemyCount: enemies.length,
      selectedTower, cursorX, cursorY
    };
  };

  game.onDraw = (renderer, text) => {
    // Grid lines
    for (let x = 0; x <= W; x += CELL) {
      renderer.drawLine(x, 0, x, H, '#16213e', 0.5);
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.drawLine(0, y, W, y, '#16213e', 0.5);
    }

    // Draw path cells
    PATH.forEach((p, i) => {
      renderer.fillRect(p.x * CELL, p.y * CELL, CELL, CELL, '#1e2a4a');

      // Path direction indicators
      if (i < PATH.length - 1) {
        const next = PATH[i + 1];
        renderer.drawLine(
          p.x * CELL + CELL / 2, p.y * CELL + CELL / 2,
          p.x * CELL + CELL / 2 + (next.x - p.x) * CELL * 0.3,
          p.y * CELL + CELL / 2 + (next.y - p.y) * CELL * 0.3,
          '#2a3a5e', 2
        );
      }
    });

    // Entry marker
    renderer.setGlow('#4f4', 0.6);
    text.drawText('IN', PATH[0].x * CELL + CELL / 2, PATH[0].y * CELL + CELL / 2 - 7, 14, '#4f4', 'center');
    renderer.setGlow(null);

    // Exit marker
    const lastP = PATH[PATH.length - 1];
    renderer.setGlow('#f44', 0.6);
    text.drawText('END', lastP.x * CELL + CELL / 2, lastP.y * CELL + CELL / 2 - 7, 14, '#f44', 'center');
    renderer.setGlow(null);

    // Draw towers
    towers.forEach(t => {
      const cx = t.x * CELL + CELL / 2;
      const cy = t.y * CELL + CELL / 2;
      const r = CELL / 2 - 4;

      // Base circle (filled dark + colored stroke)
      renderer.fillCircle(cx, cy, r, '#16213e');
      // Stroke ring using drawLine segments (approximate circle with polygon)
      const segs = 16;
      for (let s = 0; s < segs; s++) {
        const a1 = (s / segs) * Math.PI * 2;
        const a2 = ((s + 1) / segs) * Math.PI * 2;
        renderer.drawLine(
          cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
          cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
          t.color, 2
        );
      }

      // Turret barrel (rotated line from center outward)
      const barrelLen = CELL / 2 - 2;
      renderer.setGlow(t.color, 0.5);
      renderer.drawLine(
        cx, cy,
        cx + Math.cos(t.angle) * barrelLen,
        cy + Math.sin(t.angle) * barrelLen,
        t.color, 4
      );

      // Center dot
      renderer.fillCircle(cx, cy, 4, t.color);
      renderer.setGlow(null);
    });

    // Draw cursor / placement preview
    if (game.state === 'playing') {
      let cx, cy;
      if (mouseX >= 0 && mouseY >= 0) {
        cx = Math.floor(mouseX / CELL);
        cy = Math.floor(mouseY / CELL);
      } else {
        cx = cursorX;
        cy = cursorY;
      }

      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
        const valid = canPlace(cx, cy);
        const type = TOWER_TYPES[selectedTower];
        const affordable = gold >= type.cost;

        // Range preview circle (approximate with polygon segments)
        const rangeR = type.range * CELL;
        const centerX = cx * CELL + CELL / 2;
        const centerY = cy * CELL + CELL / 2;
        const rangeColor = valid && affordable ? '#ccff4440' : '#ff444426';
        const rangeSegs = 32;
        for (let s = 0; s < rangeSegs; s++) {
          const a1 = (s / rangeSegs) * Math.PI * 2;
          const a2 = ((s + 1) / rangeSegs) * Math.PI * 2;
          renderer.drawLine(
            centerX + Math.cos(a1) * rangeR, centerY + Math.sin(a1) * rangeR,
            centerX + Math.cos(a2) * rangeR, centerY + Math.sin(a2) * rangeR,
            valid && affordable ? '#ccff4440' : '#ff444426', 1
          );
        }

        // Cell highlight
        renderer.fillRect(cx * CELL, cy * CELL, CELL, CELL, valid && affordable ? '#ccff4426' : '#ff444426');

        // Cell border (4 lines)
        const bColor = valid && affordable ? '#cf4' : '#f44';
        renderer.drawLine(cx * CELL, cy * CELL, cx * CELL + CELL, cy * CELL, bColor, 1.5);
        renderer.drawLine(cx * CELL + CELL, cy * CELL, cx * CELL + CELL, cy * CELL + CELL, bColor, 1.5);
        renderer.drawLine(cx * CELL + CELL, cy * CELL + CELL, cx * CELL, cy * CELL + CELL, bColor, 1.5);
        renderer.drawLine(cx * CELL, cy * CELL + CELL, cx * CELL, cy * CELL, bColor, 1.5);

        // Tower type label
        const labelColor = valid && affordable ? '#cf4' : '#f44';
        text.drawText(type.name + ' $' + type.cost, cx * CELL + CELL / 2, cy * CELL - 12, 10, labelColor, 'center');
      }
    }

    // Draw enemies
    enemies.forEach(e => {
      const eColor = e.slowTimer > 0 ? '#88f' : e.color;
      renderer.setGlow(e.color, e.slowTimer > 0 ? 0.8 : 0.5);

      if (e.type === 'tank' || e.type === 'boss') {
        renderer.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size, eColor);
      } else {
        renderer.fillCircle(e.x, e.y, e.size / 2, eColor);
      }
      renderer.setGlow(null);

      // Health bar
      const barW = e.size + 4;
      const barH = 3;
      const barX = e.x - barW / 2;
      const barY = e.y - e.size / 2 - 6;
      renderer.fillRect(barX, barY, barW, barH, '#333');
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      const hpColor = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff0' : '#f44';
      renderer.fillRect(barX, barY, barW * hpRatio, barH, hpColor);
    });

    // Draw bullets
    bullets.forEach(b => {
      renderer.setGlow(b.color, 0.5);
      renderer.fillCircle(b.x, b.y, b.size, b.color);
      renderer.setGlow(null);
    });

    // Draw particles
    particles.forEach(p => {
      const alpha = Math.max(0, Math.min(1, p.life / 20));
      // Approximate alpha by converting color to rgba hex
      const aHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      // Parse base color and add alpha
      let pColor = p.color;
      if (pColor.length === 4) {
        // #rgb -> #rrggbbaa
        pColor = '#' + pColor[1] + pColor[1] + pColor[2] + pColor[2] + pColor[3] + pColor[3] + aHex;
      } else if (pColor.length === 7) {
        pColor = pColor + aHex;
      }
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, pColor);
    });

    // HUD on canvas
    renderer.setGlow('#cf4', 0.3);
    text.drawText('Gold: ' + gold, 8, 2, 14, '#cf4', 'left');
    text.drawText('Lives: ' + lives, 8, 20, 14, '#cf4', 'left');
    text.drawText('Wave: ' + wave, 8, 38, 14, '#cf4', 'left');
    renderer.setGlow(null);

    // Selected tower indicator
    const st = TOWER_TYPES[selectedTower];
    text.drawText('[' + selectedTower.toUpperCase() + ']', W - 8, 2, 14, st.color, 'right');

    // Wave status text
    if (spawnIndex < waveEnemies.length) {
      const remaining = waveEnemies.length - spawnIndex + enemies.length;
      text.drawText('Enemies: ' + remaining, W - 8, 20, 12, '#888', 'right');
    } else if (enemies.length === 0 && waveDelay > 0) {
      renderer.setGlow('#cf4', 0.5);
      text.drawText('Wave ' + wave + ' cleared!', W / 2, H / 2 - 26, 14, '#cf4', 'center');
      text.drawText('Next wave incoming...', W / 2, H / 2 - 1, 12, '#aaa', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
