// plants-vs-zombies/game.js — Plants vs Zombies game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 500;

// Layout constants
const SIDEBAR_W = 60;
const TOP_BAR = 50;
const COLS = 9;
const ROWS = 5;
const CELL_W = (W - SIDEBAR_W) / COLS;
const CELL_H = (H - TOP_BAR) / ROWS;

// Plant types
const PLANT_TYPES = [
  { name: 'Peashooter', key: '1', cost: 100, color: '#4f4', hp: 100, shootRate: 60, shootDmg: 20, sunRate: 0, slow: false, symbol: 'P' },
  { name: 'Sunflower',  key: '2', cost: 50,  color: '#ff0', hp: 60,  shootRate: 0,  shootDmg: 0,  sunRate: 300, slow: false, symbol: 'S' },
  { name: 'Wall-nut',   key: '3', cost: 50,  color: '#a86', hp: 400, shootRate: 0,  shootDmg: 0,  sunRate: 0, slow: false, symbol: 'W' },
  { name: 'Snow Pea',   key: '4', cost: 175, color: '#0ef', hp: 100, shootRate: 60, shootDmg: 18, sunRate: 0, slow: true, symbol: 'I' }
];

// Zombie types
const ZOMBIE_TYPES = {
  basic:  { hp: 100, speed: 0.3, damage: 10, color: '#a66', headColor: '#d99', size: 14 },
  cone:   { hp: 200, speed: 0.3, damage: 10, color: '#f80', headColor: '#fa4', size: 15 },
  bucket: { hp: 400, speed: 0.25, damage: 12, color: '#888', headColor: '#aaa', size: 16 },
  flag:   { hp: 120, speed: 0.5, damage: 10, color: '#a44', headColor: '#f66', size: 14 }
};

// Module-scope state
let score, best;
let sun, selectedPlant, plants, zombies, projectiles, particles, suns;
let wave, waveTimer, zombiesSpawned, zombiesInWave, frameCount;
let mouseX, mouseY;
let pendingClicks;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// Helper functions
function gridToPixel(col, row) {
  return {
    x: SIDEBAR_W + col * CELL_W + CELL_W / 2,
    y: TOP_BAR + row * CELL_H + CELL_H / 2
  };
}

function pixelToGrid(px, py) {
  const col = Math.floor((px - SIDEBAR_W) / CELL_W);
  const row = Math.floor((py - TOP_BAR) / CELL_H);
  return { col, row };
}

function canPlace(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return !plants.some(p => p.col === col && p.row === row);
}

function nextWave() {
  wave++;
  waveTimer = 0;
  zombiesSpawned = 0;
  if (wave <= 2) {
    zombiesInWave = 3 + wave * 2;
  } else if (wave <= 5) {
    zombiesInWave = 5 + wave * 2;
  } else if (wave <= 10) {
    zombiesInWave = 8 + wave * 2;
  } else {
    zombiesInWave = 10 + wave * 3;
  }
}

function getZombieType() {
  const r = Math.random();
  if (wave <= 2) return 'basic';
  if (wave <= 4) return r < 0.7 ? 'basic' : 'cone';
  if (wave <= 6) return r < 0.5 ? 'basic' : r < 0.8 ? 'cone' : 'flag';
  if (wave <= 9) return r < 0.3 ? 'basic' : r < 0.6 ? 'cone' : r < 0.85 ? 'bucket' : 'flag';
  return r < 0.2 ? 'basic' : r < 0.45 ? 'cone' : r < 0.75 ? 'bucket' : 'flag';
}

function spawnZombie() {
  const type = getZombieType();
  const zt = ZOMBIE_TYPES[type];
  const row = Math.floor(Math.random() * ROWS);
  const hpMult = 1 + (wave - 1) * 0.1;
  zombies.push({
    type,
    x: W + 10,
    row,
    y: TOP_BAR + row * CELL_H + CELL_H / 2,
    hp: Math.round(zt.hp * hpMult),
    maxHp: Math.round(zt.hp * hpMult),
    speed: zt.speed,
    damage: zt.damage,
    color: zt.color,
    headColor: zt.headColor,
    size: zt.size,
    eating: false,
    slowTimer: 0
  });
  zombiesSpawned++;
}

function spawnSkySun() {
  const x = SIDEBAR_W + Math.random() * (W - SIDEBAR_W - 30) + 15;
  suns.push({
    x, y: -20,
    targetY: TOP_BAR + Math.random() * (H - TOP_BAR - 60) + 30,
    speed: 0.5,
    falling: true,
    life: 600,
    size: 16,
    collected: false,
    collectAnim: 0
  });
}

function spawnPlantSun(px, py) {
  suns.push({
    x: px + (Math.random() - 0.5) * 20,
    y: py - 10,
    targetY: py + 15 + Math.random() * 20,
    speed: 0.4,
    falling: true,
    life: 480,
    size: 14,
    collected: false,
    collectAnim: 0
  });
}

// Expand 3-char hex to 6-char hex, pass through 6-char as-is
function expandHex(color) {
  if (color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
}

function placePlant(col, row, game) {
  if (game.state !== 'playing') return;
  const type = PLANT_TYPES[selectedPlant];
  if (sun < type.cost) return;
  if (!canPlace(col, row)) return;
  sun -= type.cost;
  const pos = gridToPixel(col, row);
  plants.push({
    col, row,
    x: pos.x, y: pos.y,
    typeIdx: selectedPlant,
    hp: type.hp,
    maxHp: type.hp,
    shootTimer: type.shootRate > 0 ? Math.floor(Math.random() * type.shootRate) : 0,
    sunTimer: type.sunRate > 0 ? Math.floor(Math.random() * type.sunRate) : 0,
    color: type.color,
    symbol: type.symbol,
    shootRate: type.shootRate,
    shootDmg: type.shootDmg,
    sunRate: type.sunRate,
    slow: type.slow
  });
  // Placement particles
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: pos.x, y: pos.y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 15, color: type.color
    });
  }
}

function processClick(mx, my, game) {
  if (game.state === 'waiting') {
    game.hideOverlay();
    game.setState('playing');
    nextWave();
    return;
  }

  if (game.state === 'over') {
    game.onInit();
    return;
  }

  // Check sun collection
  for (let i = suns.length - 1; i >= 0; i--) {
    const s = suns[i];
    if (s.collected) continue;
    const dx = mx - s.x;
    const dy = my - s.y;
    if (Math.sqrt(dx * dx + dy * dy) < s.size + 10) {
      s.collected = true;
      sun += 25;
      break;
    }
  }

  // Check sidebar plant selection
  if (mx < SIDEBAR_W && my > TOP_BAR) {
    const idx = Math.floor((my - TOP_BAR - 10) / 90);
    if (idx >= 0 && idx < PLANT_TYPES.length) {
      selectedPlant = idx;
    }
    return;
  }

  // Place plant on grid
  if (mx > SIDEBAR_W && my > TOP_BAR) {
    const g = pixelToGrid(mx, my);
    placePlant(g.col, g.row, game);
  }
}

export function createGame() {
  const game = new Game('game');
  best = 0;

  // Mouse tracking on the canvas
  const canvas = game.canvas;
  mouseX = -1;
  mouseY = -1;
  pendingClicks = [];

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mouseleave', () => {
    mouseX = -1;
    mouseY = -1;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x: mx, y: my });
  });

  game.onInit = () => {
    score = 0;
    sun = 150;
    selectedPlant = 0;
    plants = [];
    zombies = [];
    projectiles = [];
    particles = [];
    suns = [];
    wave = 0;
    waveTimer = 0;
    zombiesSpawned = 0;
    zombiesInWave = 0;
    frameCount = 0;
    pendingClicks = [];
    scoreEl.textContent = '0';
    game.showOverlay('PLANTS VS ZOMBIES', 'Click or press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Process pending clicks
    const clicks = pendingClicks.splice(0);
    for (const click of clicks) {
      processClick(click.x, click.y, game);
    }

    // Handle state transitions from keyboard
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.hideOverlay();
        game.setState('playing');
        nextWave();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Keyboard plant selection
    if (input.wasPressed('1')) selectedPlant = 0;
    if (input.wasPressed('2')) selectedPlant = 1;
    if (input.wasPressed('3')) selectedPlant = 2;
    if (input.wasPressed('4')) selectedPlant = 3;

    frameCount++;

    // Spawn sky suns
    if (frameCount % 360 === 0) {
      spawnSkySun();
    }

    // Spawn zombies for current wave
    if (zombiesSpawned < zombiesInWave) {
      waveTimer++;
      const spawnInterval = Math.max(40, 120 - wave * 5);
      if (waveTimer >= spawnInterval) {
        waveTimer = 0;
        spawnZombie();
      }
    }

    // Check wave complete
    if (zombiesSpawned >= zombiesInWave && zombies.length === 0) {
      waveTimer++;
      if (waveTimer >= 120) {
        sun += 25;
        nextWave();
      }
    }

    // Update suns
    for (let i = suns.length - 1; i >= 0; i--) {
      const s = suns[i];
      if (s.collected) {
        s.collectAnim++;
        s.x += (35 - s.x) * 0.15;
        s.y += (25 - s.y) * 0.15;
        s.size *= 0.95;
        if (s.collectAnim > 20) {
          suns.splice(i, 1);
        }
        continue;
      }
      if (s.falling && s.y < s.targetY) {
        s.y += s.speed;
      } else {
        s.falling = false;
      }
      s.life--;
      if (s.life <= 0) {
        suns.splice(i, 1);
      }
    }

    // Update plants
    for (let i = plants.length - 1; i >= 0; i--) {
      const p = plants[i];
      if (p.hp <= 0) {
        for (let j = 0; j < 6; j++) {
          particles.push({
            x: p.x, y: p.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 20, color: p.color
          });
        }
        plants.splice(i, 1);
        continue;
      }

      // Shooting plants
      if (p.shootRate > 0) {
        const hasTarget = zombies.some(z => z.row === p.row && z.x > p.x);
        if (hasTarget) {
          p.shootTimer++;
          if (p.shootTimer >= p.shootRate) {
            p.shootTimer = 0;
            projectiles.push({
              x: p.x + 15,
              y: p.y,
              speed: 4,
              damage: p.shootDmg,
              row: p.row,
              color: p.slow ? '#0ef' : '#4f4',
              slow: p.slow,
              size: p.slow ? 5 : 4
            });
          }
        }
      }

      // Sun-producing plants
      if (p.sunRate > 0) {
        p.sunTimer++;
        if (p.sunTimer >= p.sunRate) {
          p.sunTimer = 0;
          spawnPlantSun(p.x, p.y);
        }
      }
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      proj.x += proj.speed;

      let hit = false;
      for (let j = 0; j < zombies.length; j++) {
        const z = zombies[j];
        if (z.row === proj.row && Math.abs(z.x - proj.x) < z.size + 4 && z.x > SIDEBAR_W) {
          z.hp -= proj.damage;
          if (proj.slow) {
            z.slowTimer = 120;
          }
          for (let k = 0; k < 3; k++) {
            particles.push({
              x: proj.x, y: proj.y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 10, color: proj.color
            });
          }
          hit = true;
          break;
        }
      }
      if (hit || proj.x > W + 20) {
        projectiles.splice(i, 1);
      }
    }

    // Update zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];

      if (z.hp <= 0) {
        score++;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        for (let j = 0; j < 8; j++) {
          particles.push({
            x: z.x, y: z.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 25, color: z.headColor
          });
        }
        zombies.splice(i, 1);
        continue;
      }

      z.eating = false;
      for (let j = 0; j < plants.length; j++) {
        const p = plants[j];
        if (p.row === z.row && Math.abs(z.x - p.x) < CELL_W * 0.4) {
          z.eating = true;
          if (frameCount % 30 === 0) {
            p.hp -= z.damage;
          }
          break;
        }
      }

      if (!z.eating) {
        let speed = z.speed;
        if (z.slowTimer > 0) {
          speed *= 0.4;
          z.slowTimer--;
        }
        z.x -= speed;
      }

      if (z.x < SIDEBAR_W - 10) {
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        game.showOverlay('GAME OVER', `Score: ${score} | Wave: ${wave} -- Click or press SPACE to restart`);
        game.setState('over');
        return;
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
    if (typeof window !== 'undefined') {
      window.gameData = {
        sun, wave, score,
        plantCount: plants.length,
        zombieCount: zombies.length,
        selectedPlant,
        gameState: game.state
      };
    }
  };

  game.onDraw = (renderer, text) => {
    // ── Top bar background ──
    renderer.fillRect(0, 0, W, TOP_BAR, '#16213e');

    // ── Sidebar background ──
    renderer.fillRect(0, TOP_BAR, SIDEBAR_W, H - TOP_BAR, '#121a30');

    // ── Lawn grid ──
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = SIDEBAR_W + c * CELL_W;
        const y = TOP_BAR + r * CELL_H;
        const shade = (r + c) % 2 === 0 ? '#1a2a1e' : '#182418';
        renderer.fillRect(x, y, CELL_W, CELL_H, shade);
      }
    }

    // Row separators
    for (let r = 0; r <= ROWS; r++) {
      const y = TOP_BAR + r * CELL_H;
      renderer.drawLine(SIDEBAR_W, y, W, y, '#2a4a2e', 1);
    }

    // Column separators (subtle grid lines)
    for (let c = 0; c <= COLS; c++) {
      const x = SIDEBAR_W + c * CELL_W;
      renderer.drawLine(x, TOP_BAR, x, H, '#1e3322', 0.5);
    }

    // ── Sidebar plant selection ──
    for (let i = 0; i < PLANT_TYPES.length; i++) {
      const pt = PLANT_TYPES[i];
      const sy = TOP_BAR + i * 90 + 10;
      const sx = 5;
      const sw = SIDEBAR_W - 10;
      const sh = 80;

      if (i === selectedPlant) {
        renderer.fillRect(sx, sy, sw, sh, 'rgba(102, 221, 68, 0.15)');
        // Selection border - draw 4 lines
        renderer.drawLine(sx, sy, sx + sw, sy, '#6d4', 2);
        renderer.drawLine(sx + sw, sy, sx + sw, sy + sh, '#6d4', 2);
        renderer.drawLine(sx + sw, sy + sh, sx, sy + sh, '#6d4', 2);
        renderer.drawLine(sx, sy + sh, sx, sy, '#6d4', 2);
      } else {
        renderer.fillRect(sx, sy, sw, sh, 'rgba(22, 33, 62, 0.8)');
        renderer.drawLine(sx, sy, sx + sw, sy, '#0f3460', 1);
        renderer.drawLine(sx + sw, sy, sx + sw, sy + sh, '#0f3460', 1);
        renderer.drawLine(sx + sw, sy + sh, sx, sy + sh, '#0f3460', 1);
        renderer.drawLine(sx, sy + sh, sx, sy, '#0f3460', 1);
      }

      // Plant icon
      const iconColor = sun >= pt.cost ? pt.color : '#555';
      if (sun >= pt.cost) {
        renderer.setGlow(pt.color, 0.4);
      }
      text.drawText(pt.symbol, sx + sw / 2, sy + 18, 20, iconColor, 'center');
      renderer.setGlow(null);

      // Cost
      const costColor = sun >= pt.cost ? '#ff0' : '#644';
      text.drawText(String(pt.cost), sx + sw / 2, sy + 40, 10, costColor, 'center');

      // Key number
      text.drawText(pt.key, sx + sw / 2, sy + 55, 9, '#666', 'center');
    }

    // ── Plants on grid ──
    if (plants) {
      for (const p of plants) {
        renderer.setGlow(p.color, 0.5);

        if (p.symbol === 'P') {
          // Peashooter - stem + circle head + barrel + eye
          renderer.fillRect(p.x - 3, p.y + 5, 6, CELL_H * 0.3, '#2a5a2a');
          renderer.fillCircle(p.x, p.y - 2, 14, p.color);
          renderer.fillRect(p.x + 8, p.y - 5, 10, 6, '#2a2');
          renderer.fillCircle(p.x + 2, p.y - 6, 3, '#111');
        } else if (p.symbol === 'S') {
          // Sunflower - stem + petals + center
          renderer.fillRect(p.x - 3, p.y + 5, 6, CELL_H * 0.3, '#2a5a2a');
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2 + frameCount * 0.01;
            const px = p.x + Math.cos(angle) * 13;
            const py = p.y - 2 + Math.sin(angle) * 13;
            renderer.fillCircle(px, py, 5, '#ff0');
          }
          renderer.fillCircle(p.x, p.y - 2, 8, '#a80');
        } else if (p.symbol === 'W') {
          // Wall-nut - big circle + damage cracks + eyes
          renderer.fillCircle(p.x, p.y, 18, p.color);
          const dmgRatio = p.hp / p.maxHp;
          if (dmgRatio < 0.6) {
            renderer.fillRect(p.x - 5, p.y - 8, 2, 12, '#654');
          }
          if (dmgRatio < 0.3) {
            renderer.fillRect(p.x + 3, p.y - 6, 2, 10, '#654');
            renderer.fillRect(p.x - 8, p.y + 2, 8, 2, '#654');
          }
          renderer.fillCircle(p.x - 5, p.y - 4, 2.5, '#111');
          renderer.fillCircle(p.x + 5, p.y - 4, 2.5, '#111');
        } else if (p.symbol === 'I') {
          // Snow Pea - stem + icy circle head + ice barrel + frost sparkles + eye
          renderer.fillRect(p.x - 3, p.y + 5, 6, CELL_H * 0.3, '#1a4a5a');
          renderer.fillCircle(p.x, p.y - 2, 14, p.color);
          renderer.fillRect(p.x + 8, p.y - 5, 10, 6, '#aef');
          renderer.fillCircle(p.x - 4, p.y - 10, 2, '#fff');
          renderer.fillCircle(p.x + 8, p.y + 4, 1.5, '#fff');
          renderer.fillCircle(p.x + 2, p.y - 6, 3, '#111');
        }

        renderer.setGlow(null);

        // Health bar (only show if damaged)
        if (p.hp < p.maxHp) {
          const barW = 28;
          const barH = 3;
          const barX = p.x - barW / 2;
          const barY = p.y + 20;
          renderer.fillRect(barX, barY, barW, barH, '#333');
          const ratio = p.hp / p.maxHp;
          const barColor = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44';
          renderer.fillRect(barX, barY, barW * ratio, barH, barColor);
        }
      }
    }

    // ── Zombies ──
    if (zombies) {
      for (const z of zombies) {
        const glowCol = z.slowTimer > 0 ? '#0ef' : z.color;
        renderer.setGlow(glowCol, 0.5);

        const bodyColor = z.slowTimer > 0 ? '#68a' : z.color;
        const headCol = z.slowTimer > 0 ? '#8ac' : z.headColor;

        // Legs (animated wobble)
        const legOffset = Math.sin(frameCount * 0.1 + z.x * 0.1) * 3;
        renderer.fillRect(z.x - 5, z.y + 8, 4, 16 + legOffset, bodyColor);
        renderer.fillRect(z.x + 2, z.y + 8, 4, 16 - legOffset, bodyColor);

        // Body
        renderer.fillRect(z.x - 7, z.y - 8, 14, 18, bodyColor);

        // Arms
        const armSwing = Math.sin(frameCount * 0.08 + z.x * 0.05) * 4;
        renderer.fillRect(z.x - 12, z.y - 4 + armSwing, 6, 3, bodyColor);
        renderer.fillRect(z.x + 7, z.y - 2 - armSwing, 6, 3, bodyColor);

        // Head
        renderer.fillCircle(z.x, z.y - 14, z.size * 0.65, headCol);

        // Headgear for special types
        if (z.type === 'cone') {
          // Cone triangle using fillPoly
          renderer.fillPoly([
            { x: z.x - 6, y: z.y - 18 },
            { x: z.x + 6, y: z.y - 18 },
            { x: z.x,     y: z.y - 30 }
          ], '#f80');
        } else if (z.type === 'bucket') {
          renderer.fillRect(z.x - 7, z.y - 26, 14, 14, '#999');
          // Bucket border
          renderer.drawLine(z.x - 7, z.y - 26, z.x + 7, z.y - 26, '#666', 1);
          renderer.drawLine(z.x + 7, z.y - 26, z.x + 7, z.y - 12, '#666', 1);
          renderer.drawLine(z.x + 7, z.y - 12, z.x - 7, z.y - 12, '#666', 1);
          renderer.drawLine(z.x - 7, z.y - 12, z.x - 7, z.y - 26, '#666', 1);
        } else if (z.type === 'flag') {
          renderer.fillRect(z.x + 5, z.y - 30, 12, 8, '#f44');
          renderer.fillRect(z.x + 4, z.y - 30, 2, 20, '#642');
        }

        // Eyes (red glowing)
        renderer.setGlow('#f00', 0.3);
        renderer.fillCircle(z.x - 3, z.y - 16, 2, '#f00');
        renderer.fillCircle(z.x + 3, z.y - 16, 2, '#f00');
        renderer.setGlow(null);

        // Health bar
        const barW = z.size + 8;
        const barH = 3;
        const barX = z.x - barW / 2;
        const barY = z.y - z.size - 16;
        renderer.fillRect(barX, barY, barW, barH, '#333');
        const hpRatio = Math.max(0, z.hp / z.maxHp);
        const hpColor = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff0' : '#f44';
        renderer.fillRect(barX, barY, barW * hpRatio, barH, hpColor);
      }
    }

    // ── Projectiles ──
    if (projectiles) {
      for (const proj of projectiles) {
        renderer.setGlow(proj.color, 0.5);
        renderer.fillCircle(proj.x, proj.y, proj.size, proj.color);
        // Trail (smaller, dimmer circle behind)
        renderer.fillCircle(proj.x - 6, proj.y, proj.size * 0.7, expandHex(proj.color) + '66');
        renderer.setGlow(null);
      }
    }

    // ── Suns ──
    if (suns) {
      for (const s of suns) {
        if (s.collected && s.collectAnim > 15) continue;
        // Use alpha via color encoding since we have no globalAlpha
        const fadeAlpha = s.collected ? Math.max(0, 1 - s.collectAnim / 20) : (s.life < 60 ? s.life / 60 : 1);
        const alphaHex = Math.round(fadeAlpha * 255).toString(16).padStart(2, '0');

        renderer.setGlow('#ff0', 0.7 * fadeAlpha);

        // Sun body
        renderer.fillCircle(s.x, s.y, s.size * 0.6, '#ffff00' + alphaHex);

        // Rays
        for (let r = 0; r < 8; r++) {
          const angle = (r / 8) * Math.PI * 2 + frameCount * 0.03;
          const rx = s.x + Math.cos(angle) * s.size * 0.85;
          const ry = s.y + Math.sin(angle) * s.size * 0.85;
          renderer.fillCircle(rx, ry, s.size * 0.25, '#ffffaa' + alphaHex);
        }

        renderer.setGlow(null);
      }
    }

    // ── Particles ──
    if (particles) {
      for (const p of particles) {
        const alpha = Math.max(0, p.life / 25);
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        // Extend 3-char hex colors to 6-char for alpha append
        renderer.fillRect(p.x - 2, p.y - 2, 4, 4, expandHex(p.color) + alphaHex);
      }
    }

    // ── Placement preview ──
    if (game.state === 'playing' && mouseX > SIDEBAR_W && mouseY > TOP_BAR) {
      const g = pixelToGrid(mouseX, mouseY);
      if (g.col >= 0 && g.col < COLS && g.row >= 0 && g.row < ROWS) {
        const valid = canPlace(g.col, g.row);
        const affordable = sun >= PLANT_TYPES[selectedPlant].cost;
        const px = SIDEBAR_W + g.col * CELL_W;
        const py = TOP_BAR + g.row * CELL_H;
        const previewFill = valid && affordable ? 'rgba(102, 221, 68, 0.15)' : 'rgba(255, 68, 68, 0.12)';
        renderer.fillRect(px, py, CELL_W, CELL_H, previewFill);
        const borderCol = valid && affordable ? '#6d4' : '#f44';
        renderer.drawLine(px, py, px + CELL_W, py, borderCol, 1.5);
        renderer.drawLine(px + CELL_W, py, px + CELL_W, py + CELL_H, borderCol, 1.5);
        renderer.drawLine(px + CELL_W, py + CELL_H, px, py + CELL_H, borderCol, 1.5);
        renderer.drawLine(px, py + CELL_H, px, py, borderCol, 1.5);

        // Plant symbol preview (dimmed)
        const previewColor = valid && affordable ? '#486' : '#333';
        text.drawText(PLANT_TYPES[selectedPlant].symbol, px + CELL_W / 2, py + CELL_H / 2 - 10, 20, previewColor, 'center');
      }
    }

    // ── Top bar HUD ──
    // Sun counter
    renderer.setGlow('#ff0', 0.4);
    text.drawText('SUN: ' + sun, 10, 14, 18, '#ff0', 'left');
    renderer.setGlow(null);

    // Wave indicator
    renderer.setGlow('#6d4', 0.3);
    text.drawText('Wave ' + wave, W - 10, 8, 14, '#6d4', 'right');
    renderer.setGlow(null);

    // Zombies remaining
    if (zombiesInWave > 0) {
      const remaining = (zombiesInWave - zombiesSpawned) + zombies.length;
      text.drawText('Zombies: ' + remaining, W - 10, 26, 12, '#888', 'right');
    }

    // Wave cleared text
    if (zombiesSpawned >= zombiesInWave && zombies.length === 0 && waveTimer > 0 && waveTimer < 120) {
      renderer.setGlow('#6d4', 0.6);
      text.drawText('Wave ' + wave + ' cleared!', SIDEBAR_W + (W - SIDEBAR_W) / 2, H / 2 - 25, 18, '#6d4', 'center');
      text.drawText('Next wave incoming...', SIDEBAR_W + (W - SIDEBAR_W) / 2, H / 2, 13, '#aaa', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
