// lemmings/game.js — Lemmings game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Pixel-based terrain map
const TERRAIN_W = 1200;
const TERRAIN_H = 400;

// ── State ──
let terrain; // Uint8Array, 1 = solid, 0 = air
let camX;
const CAM_SPEED = 4;

let level, score, best;
let entryX, entryY, exitX, exitY;
let totalLemmings, neededToSave, spawnRate, spawnTimer, spawnedCount;
let lemmings;
let savedCount, deadCount;
let selectedLemming;
let selectedAbility;
let abilities;
let particles;
let pendingClicks;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Terrain helpers ──
function terrainGet(x, y) {
  if (x < 0 || x >= TERRAIN_W || y < 0 || y >= TERRAIN_H) return 0;
  return terrain[y * TERRAIN_W + x];
}

function terrainSet(x, y, val) {
  if (x < 0 || x >= TERRAIN_W || y < 0 || y >= TERRAIN_H) return;
  terrain[y * TERRAIN_W + x] = val;
}

function terrainRect(x, y, w, h, val) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      terrainSet(px, py, val);
    }
  }
}

// ── Level generation ──
function generateLevel() {
  terrain = new Uint8Array(TERRAIN_W * TERRAIN_H);

  // Base ground
  terrainRect(0, TERRAIN_H - 30, TERRAIN_W, 30, 1);

  const seed = level * 7 + 13;
  function seededRand(i) {
    let v = Math.sin(seed * 9301 + i * 49297 + 233) * 10000;
    return v - Math.floor(v);
  }
  let ri = 0;
  function rand() { return seededRand(ri++); }

  // Generate platforms at various heights
  const numPlatforms = 6 + Math.min(level, 8);
  for (let i = 0; i < numPlatforms; i++) {
    const px = Math.floor(rand() * (TERRAIN_W - 200)) + 50;
    const py = 80 + Math.floor(rand() * (TERRAIN_H - 150));
    const pw = 60 + Math.floor(rand() * 140);
    const ph = 12 + Math.floor(rand() * 8);
    terrainRect(px, py, pw, ph, 1);
  }

  // Walls
  const numWalls = 3 + Math.min(level, 5);
  for (let i = 0; i < numWalls; i++) {
    const wx = Math.floor(rand() * (TERRAIN_W - 100)) + 50;
    const wy = 60 + Math.floor(rand() * (TERRAIN_H - 140));
    const ww = 10 + Math.floor(rand() * 8);
    const wh = 50 + Math.floor(rand() * 100);
    terrainRect(wx, wy, ww, wh, 1);
  }

  // Create gaps in the ground
  const numGaps = 2 + Math.min(level, 4);
  for (let i = 0; i < numGaps; i++) {
    const gx = 100 + Math.floor(rand() * (TERRAIN_W - 300));
    const gw = 30 + Math.floor(rand() * 50);
    terrainRect(gx, TERRAIN_H - 30, gw, 30, 0);
  }

  // Connect some platforms with slopes/ramps
  const numRamps = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < numRamps; i++) {
    const rx = Math.floor(rand() * (TERRAIN_W - 200)) + 80;
    const ry = 100 + Math.floor(rand() * 200);
    const rLen = 40 + Math.floor(rand() * 60);
    const dir = rand() > 0.5 ? 1 : -1;
    for (let s = 0; s < rLen; s++) {
      const sx = rx + s * dir;
      const sy = ry + Math.floor(s * 0.5);
      terrainRect(sx, sy, 3, 4, 1);
    }
  }

  // Entry point - clear area around it
  entryX = 60 + Math.floor(rand() * 100);
  entryY = 40;
  terrainRect(entryX - 10, entryY, 20, 15, 0);

  // Exit point - place on ground or a platform
  exitX = TERRAIN_W - 100 - Math.floor(rand() * 150);
  exitY = TERRAIN_H - 31;
  for (let y = 50; y < TERRAIN_H; y++) {
    if (terrainGet(exitX, y)) {
      exitY = y - 1;
      break;
    }
  }
  // Clear space above exit
  terrainRect(exitX - 8, exitY - 20, 16, 20, 0);

  // Difficulty scaling
  totalLemmings = 10 + level * 3;
  neededToSave = Math.ceil(totalLemmings * (0.4 + Math.min(level * 0.05, 0.4)));
  spawnRate = Math.max(40, 80 - level * 5);

  abilities = {
    1: 5 + Math.floor(level * 0.5),  // Digger
    2: 5 + Math.floor(level * 0.5),  // Builder
    3: 3 + Math.floor(level * 0.3),  // Blocker
    4: 5 + Math.floor(level * 0.5),  // Basher
    5: 3 + Math.floor(level * 0.3),  // Climber
  };
  updateAbilityUI();
}

function updateAbilityUI() {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('cnt-' + i);
    if (el) el.textContent = abilities[i] || 0;
  }
}

function clearAbilitySelection() {
  selectedAbility = 0;
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('ab-' + i);
    if (el) el.classList.remove('selected');
  }
}

function resetLevel() {
  lemmings = [];
  particles = [];
  savedCount = 0;
  deadCount = 0;
  spawnedCount = 0;
  spawnTimer = 0;
  selectedLemming = null;
  selectedAbility = 0;
  camX = 0;
  pendingClicks = [];
  generateLevel();
  clearAbilitySelection();
}

// ── Lemming factory ──
function createLemming(x, y) {
  return {
    x, y,
    dir: 1,           // 1 = right, -1 = left
    velY: 0,
    alive: true,
    saved: false,
    state: 'falling',  // walking, falling, digging, building, blocking, bashing, climbing, dying
    animFrame: 0,
    buildCount: 0,
    digTimer: 0,
    bashTimer: 0,
    climbFail: 0,
    fallDist: 0,
  };
}

function spawnLemming() {
  if (spawnedCount < totalLemmings) {
    lemmings.push(createLemming(entryX, entryY + 14));
    spawnedCount++;
  }
}

// ── Particles ──
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 1) * 3,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Lemming update ──
function killLemming(lem) {
  lem.state = 'dying';
  lem.digTimer = 0;
  spawnParticles(lem.x, lem.y, '#f66', 10);
}

function updateLemming(lem) {
  if (!lem.alive || lem.saved) return;

  const GRAV = 0.5;
  const WALK_SPEED = 1;
  const MAX_FALL = 6;
  const LETHAL_FALL = 80;

  lem.animFrame++;

  // Check if fallen off map
  if (lem.y > TERRAIN_H + 10 || lem.x < -10 || lem.x > TERRAIN_W + 10) {
    killLemming(lem);
    return;
  }

  // Check exit
  if (Math.abs(lem.x - exitX) < 12 && Math.abs(lem.y - exitY) < 15 && lem.state !== 'blocking') {
    lem.saved = true;
    lem.alive = false;
    savedCount++;
    spawnParticles(lem.x, lem.y, '#8af', 8);
    return;
  }

  switch (lem.state) {
    case 'falling': {
      lem.velY = Math.min(lem.velY + GRAV, MAX_FALL);
      lem.y += lem.velY;
      lem.fallDist += Math.abs(lem.velY);
      if (terrainGet(Math.floor(lem.x), Math.floor(lem.y))) {
        while (terrainGet(Math.floor(lem.x), Math.floor(lem.y))) {
          lem.y -= 1;
        }
        if (lem.fallDist > LETHAL_FALL) {
          killLemming(lem);
          return;
        }
        lem.velY = 0;
        lem.fallDist = 0;
        lem.state = 'walking';
      }
      break;
    }

    case 'walking': {
      if (!terrainGet(Math.floor(lem.x), Math.floor(lem.y + 1))) {
        lem.state = 'falling';
        lem.velY = 0;
        lem.fallDist = 0;
        break;
      }

      const nextX = Math.floor(lem.x + lem.dir * WALK_SPEED);
      const feetY = Math.floor(lem.y);

      // Check for blocker collision
      for (const other of lemmings) {
        if (other === lem || !other.alive || other.saved) continue;
        if (other.state === 'blocking' && Math.abs(other.x - nextX) < 6 && Math.abs(other.y - lem.y) < 10) {
          lem.dir *= -1;
          break;
        }
      }

      // Check wall ahead
      let wallHit = false;
      for (let cy = feetY - 1; cy >= feetY - 6; cy--) {
        if (terrainGet(nextX, cy)) {
          wallHit = true;
          break;
        }
      }

      if (wallHit) {
        let canStep = false;
        for (let step = 1; step <= 3; step++) {
          let blocked = false;
          for (let cy = feetY - step - 1; cy >= feetY - step - 6; cy--) {
            if (terrainGet(nextX, cy)) { blocked = true; break; }
          }
          if (!blocked && terrainGet(nextX, feetY - step + 1)) {
            lem.x = nextX;
            lem.y -= step;
            canStep = true;
            break;
          }
        }
        if (!canStep) {
          lem.dir *= -1;
        }
      } else {
        lem.x += lem.dir * WALK_SPEED;
        if (!terrainGet(Math.floor(lem.x), Math.floor(lem.y + 1))) {
          let dropped = false;
          for (let d = 1; d <= 3; d++) {
            if (terrainGet(Math.floor(lem.x), Math.floor(lem.y + 1 + d))) {
              lem.y += d;
              dropped = true;
              break;
            }
          }
          if (!dropped) {
            lem.state = 'falling';
            lem.velY = 0;
            lem.fallDist = 0;
          }
        }
      }
      break;
    }

    case 'digging': {
      lem.digTimer++;
      if (lem.digTimer % 6 === 0) {
        let dugSomething = false;
        for (let dx = -3; dx <= 3; dx++) {
          const tx = Math.floor(lem.x) + dx;
          const ty = Math.floor(lem.y + 1);
          if (terrainGet(tx, ty)) {
            terrainSet(tx, ty, 0);
            terrainSet(tx, ty + 1, 0);
            dugSomething = true;
          }
        }
        if (dugSomething) {
          lem.y += 2;
          spawnParticles(lem.x, lem.y, '#a86', 2);
        } else {
          lem.state = 'walking';
        }
      }
      break;
    }

    case 'building': {
      lem.digTimer++;
      if (lem.digTimer % 10 === 0) {
        if (lem.buildCount >= 10) {
          lem.state = 'walking';
          break;
        }
        const bx = Math.floor(lem.x) + lem.dir * 3;
        const by = Math.floor(lem.y) - 1;
        terrainRect(bx, by, 5, 2, 1);
        lem.x += lem.dir * 3;
        lem.y -= 2;
        lem.buildCount++;
        spawnParticles(bx + 2, by, '#8af', 1);

        if (terrainGet(Math.floor(lem.x), Math.floor(lem.y - 8))) {
          lem.state = 'walking';
        }
      }
      break;
    }

    case 'blocking': {
      // Just stand there
      break;
    }

    case 'bashing': {
      lem.bashTimer++;
      if (lem.bashTimer % 4 === 0) {
        const bx = Math.floor(lem.x) + lem.dir * 2;
        let bashedSomething = false;
        for (let dy = -6; dy <= 0; dy++) {
          const by = Math.floor(lem.y) + dy;
          for (let dx = 0; dx < 3; dx++) {
            if (terrainGet(bx + dx * lem.dir, by)) {
              terrainSet(bx + dx * lem.dir, by, 0);
              bashedSomething = true;
            }
          }
        }
        if (bashedSomething) {
          lem.x += lem.dir * 1;
          spawnParticles(lem.x + lem.dir * 4, lem.y - 3, '#a86', 2);
        } else {
          lem.state = 'walking';
        }
      }
      if (!terrainGet(Math.floor(lem.x), Math.floor(lem.y + 1))) {
        lem.state = 'falling';
        lem.velY = 0;
        lem.fallDist = 0;
      }
      break;
    }

    case 'climbing': {
      const cx = Math.floor(lem.x + lem.dir * 2);
      const cy = Math.floor(lem.y - 1);
      if (terrainGet(cx, cy)) {
        lem.y -= 1;
        lem.climbFail++;
        if (lem.climbFail > 80) {
          lem.dir *= -1;
          lem.state = 'falling';
          lem.velY = 0;
          lem.fallDist = 0;
        }
      } else {
        lem.x += lem.dir * 3;
        lem.state = 'walking';
        lem.climbFail = 0;
      }
      if (!terrainGet(Math.floor(lem.x + lem.dir), Math.floor(lem.y)) &&
          !terrainGet(Math.floor(lem.x + lem.dir * 2), Math.floor(lem.y))) {
        lem.state = 'falling';
        lem.velY = 0;
        lem.fallDist = 0;
      }
      break;
    }

    case 'dying': {
      lem.digTimer++;
      if (lem.digTimer > 30) {
        lem.alive = false;
        deadCount++;
      }
      break;
    }
  }
}

// ── Ability assignment ──
function assignAbility(lem, abilityNum) {
  if (!lem || !lem.alive || lem.saved) return false;
  if (lem.state === 'blocking' || lem.state === 'dying') return false;
  if (!abilities[abilityNum] || abilities[abilityNum] <= 0) return false;

  switch (abilityNum) {
    case 1: // Digger
      if (lem.state === 'digging') return false;
      lem.state = 'digging';
      lem.digTimer = 0;
      break;
    case 2: // Builder
      if (lem.state === 'building') return false;
      lem.state = 'building';
      lem.digTimer = 0;
      lem.buildCount = 0;
      break;
    case 3: // Blocker
      if (lem.state === 'blocking') return false;
      lem.state = 'blocking';
      break;
    case 4: // Basher
      if (lem.state === 'bashing') return false;
      lem.state = 'bashing';
      lem.bashTimer = 0;
      break;
    case 5: // Climber
      if (lem.state === 'climbing') return false;
      lem.state = 'climbing';
      lem.climbFail = 0;
      break;
    default:
      return false;
  }
  abilities[abilityNum]--;
  updateAbilityUI();
  spawnParticles(lem.x, lem.y - 5, '#8af', 4);
  return true;
}

// ── Drawing helpers ──

function drawTerrain(renderer) {
  const startX = Math.floor(camX);
  const endX = Math.min(startX + W, TERRAIN_W);
  const BLOCK = 2;

  for (let y = 0; y < TERRAIN_H; y += BLOCK) {
    // Precompute depth color for this row
    const depth = y / TERRAIN_H;
    const r = Math.floor(30 + depth * 40);
    const g = Math.floor(50 + depth * 30);
    const b = Math.floor(20 + depth * 20);
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    const color = '#' + rh + gh + bh;

    for (let x = startX; x < endX; x += BLOCK) {
      if (terrainGet(x, y)) {
        renderer.fillRect(x - startX, y, BLOCK, BLOCK, color);
      }
    }
  }

  // Surface highlights
  for (let x = startX; x < endX; x += 2) {
    for (let y = 0; y < TERRAIN_H - 1; y++) {
      if (terrainGet(x, y + 1) && !terrainGet(x, y)) {
        renderer.fillRect(x - startX, y + 1, 2, 1, '#88aaff14');
      }
    }
  }
}

function drawDoor(renderer, text, x, y, label, color) {
  const sx = x - camX;
  renderer.setGlow(color, 0.6);
  renderer.fillRect(sx - 8, y - 18, 16, 18, color);
  renderer.setGlow(null);

  // Door detail (dark interior)
  renderer.fillRect(sx - 5, y - 15, 10, 15, '#1a1a2e');

  // Label
  renderer.setGlow(color, 0.4);
  text.drawText(label, sx, y - 26, 8, color, 'center');
  renderer.setGlow(null);
}

function drawLemmings(renderer, text) {
  for (const lem of lemmings) {
    if (!lem.alive || lem.saved) continue;

    const sx = lem.x - camX;
    const sy = lem.y;

    // Skip if off screen
    if (sx < -10 || sx > W + 10) continue;

    const isSelected = lem === selectedLemming;

    // Selection highlight (rectangle outline via 4 lines)
    if (isSelected) {
      renderer.setGlow('#fff', 0.5);
      const rx = sx - 6, ry = sy - 12, rw = 12, rh = 14;
      renderer.drawLine(rx, ry, rx + rw, ry, '#fff', 1);
      renderer.drawLine(rx + rw, ry, rx + rw, ry + rh, '#fff', 1);
      renderer.drawLine(rx + rw, ry + rh, rx, ry + rh, '#fff', 1);
      renderer.drawLine(rx, ry + rh, rx, ry, '#fff', 1);
      renderer.setGlow(null);
    }

    // Lemming colors by state
    let bodyColor = '#8af';
    let hairColor = '#6d8fcc';

    switch (lem.state) {
      case 'digging': bodyColor = '#fa4'; hairColor = '#c80'; break;
      case 'building': bodyColor = '#4fa'; hairColor = '#2a8'; break;
      case 'blocking': bodyColor = '#f66'; hairColor = '#a33'; break;
      case 'bashing': bodyColor = '#ff8'; hairColor = '#aa5'; break;
      case 'climbing': bodyColor = '#f8f'; hairColor = '#a5a'; break;
      case 'dying': bodyColor = '#f33'; hairColor = '#900'; break;
    }

    renderer.setGlow(bodyColor, 0.3);

    // Head (circle)
    renderer.fillCircle(sx, sy - 8, 3, bodyColor);

    // Hair
    renderer.fillRect(sx - 3, sy - 12, 6, 2, hairColor);

    // Body
    renderer.fillRect(sx - 2, sy - 5, 4, 5, bodyColor);

    // Legs (animated)
    const legAnim = Math.sin(lem.animFrame * 0.3) * 2;
    const leg1H = 2 + (lem.state === 'walking' ? legAnim : 0);
    const leg2H = 2 - (lem.state === 'walking' ? legAnim : 0);
    renderer.fillRect(sx - 2, sy, 1, Math.max(1, leg1H), bodyColor);
    renderer.fillRect(sx + 1, sy, 1, Math.max(1, leg2H), bodyColor);

    // Direction indicator (eye)
    if (lem.state === 'walking' || lem.state === 'bashing') {
      renderer.fillRect(sx + lem.dir * 2, sy - 8, 1, 1, '#fff');
    }

    // State-specific visuals
    if (lem.state === 'digging') {
      const pickY = sy + 2 + Math.sin(lem.animFrame * 0.5) * 2;
      renderer.drawLine(sx, sy, sx, pickY, '#fa4', 1);
    } else if (lem.state === 'building') {
      renderer.fillRect(sx + lem.dir * 4, sy - 3, 3, 2, '#4fa');
    } else if (lem.state === 'blocking') {
      renderer.drawLine(sx - 5, sy - 4, sx + 5, sy - 4, '#f66', 2);
    } else if (lem.state === 'climbing') {
      const armY = -6 + Math.sin(lem.animFrame * 0.4) * 2;
      renderer.drawLine(sx, sy - 5, sx + lem.dir * 4, sy + armY, '#f8f', 1);
    } else if (lem.state === 'dying') {
      // Death X animation
      const alpha = Math.max(0, 1 - lem.digTimer / 30);
      const spread = lem.digTimer * 0.5;
      // Use reduced-alpha color for fading
      const a = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      const deathColor = '#ff3333' + a;
      renderer.drawLine(sx - spread, sy - 8 - spread, sx + spread, sy - 8 + spread, deathColor, 2);
      renderer.drawLine(sx + spread, sy - 8 - spread, sx - spread, sy - 8 + spread, deathColor, 2);
    }

    renderer.setGlow(null);
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const sx = p.x - camX;
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    const a = Math.floor(alpha * 255).toString(16).padStart(2, '0');
    // Append alpha to color
    let c = p.color;
    // Normalize color to 6-char hex so we can append alpha
    if (c.length === 4) {
      // #rgb -> #rrggbb
      c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    }
    const colorA = c + a;
    renderer.setGlow(p.color, 0.2);
    renderer.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size, colorA);
  }
  renderer.setGlow(null);
}

function drawHUD(renderer, text) {
  // Level info
  renderer.setGlow('#8af', 0.3);
  text.drawText('LVL ' + level, 8, 4, 12, '#8af', 'left');
  text.drawText('Saved: ' + savedCount + ' / ' + neededToSave + ' needed', W / 2, 4, 12, '#8af', 'center');

  const remaining = totalLemmings - spawnedCount;
  const alive = lemmings.filter(l => l.alive && !l.saved).length;
  text.drawText('Left: ' + remaining + '  Active: ' + alive, W - 8, 4, 12, '#8af', 'right');
  renderer.setGlow(null);

  // Scroll indicator
  const scrollPct = camX / Math.max(1, TERRAIN_W - W);
  const barW = 80;
  const barX = (W - barW) / 2;
  const barY = H - 8;
  renderer.fillRect(barX, barY, barW, 4, '#16213e');
  renderer.fillRect(barX + scrollPct * (barW - 16), barY, 16, 4, '#8af');

  // Selected ability indicator
  if (selectedAbility > 0) {
    const names = { 1: 'DIGGER', 2: 'BUILDER', 3: 'BLOCKER', 4: 'BASHER', 5: 'CLIMBER' };
    renderer.setGlow('#8af', 0.4);
    text.drawText('[ ' + names[selectedAbility] + ' ]', W / 2, 20, 11, '#8af', 'center');
    renderer.setGlow(null);
  }
}

// ── Exported create function ──
export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // Mouse click handling
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  pendingClicks = [];

  canvas.addEventListener('click', (e) => {
    const pos = getCanvasPos(e);
    pendingClicks.push(pos);
  });

  // Ability button clicks
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('ab-' + i);
    if (btn) {
      btn.addEventListener('click', () => {
        if (game.state !== 'playing') return;
        if (selectedAbility === i) {
          clearAbilitySelection();
        } else {
          selectedAbility = i;
          for (let j = 1; j <= 5; j++) {
            const el = document.getElementById('ab-' + j);
            if (el) el.classList.toggle('selected', j === i);
          }
        }
      });
    }
  }

  // ── Init ──
  game.onInit = () => {
    score = 0;
    level = 1;
    best = parseInt(localStorage.getItem('lemmings-best')) || 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (bestEl) bestEl.textContent = best;
    pendingClicks = [];
    resetLevel();
    game.showOverlay('LEMMINGS', 'Click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score + savedCount * 10);

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || pendingClicks.length > 0) {
        pendingClicks = [];
        resetLevel();
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        if (savedCount >= neededToSave) {
          // Next level
          level++;
          resetLevel();
          game.setState('playing');
          game.hideOverlay();
        } else {
          // Restart
          game.onInit();
          resetLevel();
          game.setState('playing');
          game.hideOverlay();
        }
      }
      return;
    }

    // ── Playing state ──

    // Camera scrolling
    if (input.isDown('ArrowLeft')) camX = Math.max(0, camX - CAM_SPEED);
    if (input.isDown('ArrowRight')) camX = Math.min(TERRAIN_W - W, camX + CAM_SPEED);
    if (input.isDown('ArrowUp')) camX = Math.max(0, camX - CAM_SPEED * 3);
    if (input.isDown('ArrowDown')) camX = Math.min(TERRAIN_W - W, camX + CAM_SPEED * 3);

    // Number key ability selection
    for (let n = 1; n <= 5; n++) {
      if (input.wasPressed(String(n))) {
        if (selectedAbility === n) {
          clearAbilitySelection();
        } else {
          selectedAbility = n;
          for (let j = 1; j <= 5; j++) {
            const el = document.getElementById('ab-' + j);
            if (el) el.classList.toggle('selected', j === n);
          }
        }
        // If a lemming is already selected, apply immediately
        if (selectedLemming && selectedAbility > 0) {
          if (assignAbility(selectedLemming, selectedAbility)) {
            selectedLemming = null;
          }
        }
      }
    }

    // Process mouse clicks
    for (const pos of pendingClicks) {
      const mx = pos.x + camX;
      const my = pos.y;

      // Find closest lemming to click
      let closest = null;
      let closestDist = 15;
      for (const lem of lemmings) {
        if (!lem.alive || lem.saved) continue;
        const dist = Math.sqrt((lem.x - mx) ** 2 + ((lem.y - 4) - my) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = lem;
        }
      }

      if (closest) {
        selectedLemming = closest;
        if (selectedAbility > 0) {
          if (assignAbility(closest, selectedAbility)) {
            selectedLemming = null;
          }
        }
      } else {
        selectedLemming = null;
      }
    }
    pendingClicks = [];

    // Spawn lemmings
    spawnTimer++;
    if (spawnTimer >= spawnRate && spawnedCount < totalLemmings) {
      spawnTimer = 0;
      spawnLemming();
    }

    // Update lemmings
    for (const lem of lemmings) {
      updateLemming(lem);
    }

    // Update particles
    updateParticles();

    // Check game over conditions
    const activeLemmings = lemmings.filter(l => l.alive && !l.saved).length;
    const allSpawned = spawnedCount >= totalLemmings;

    if (allSpawned && activeLemmings === 0) {
      const won = savedCount >= neededToSave;
      if (won) {
        score += savedCount * 10 + level * 5;
      } else {
        score += savedCount * 5;
      }
      if (scoreEl) scoreEl.textContent = score;
      if (score > best) {
        best = score;
        if (bestEl) bestEl.textContent = best;
        localStorage.setItem('lemmings-best', best);
      }
      if (won) {
        game.showOverlay('LEVEL ' + level + ' COMPLETE!',
          'Saved ' + savedCount + '/' + totalLemmings + ' (needed ' + neededToSave + ') - Click for next level');
      } else {
        game.showOverlay('LEVEL FAILED',
          'Saved ' + savedCount + '/' + neededToSave + ' needed - Click to retry');
      }
      game.setState('over');
    }

    // Update score display
    if (scoreEl) scoreEl.textContent = score + savedCount * 10;
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#0a0a1e');

    // Terrain
    drawTerrain(renderer);

    // Doors
    drawDoor(renderer, text, entryX, entryY + 14, 'IN', '#4f4');
    drawDoor(renderer, text, exitX, exitY, 'EXIT', '#ff0');

    // Lemmings
    drawLemmings(renderer, text);

    // Particles
    drawParticles(renderer);

    // HUD
    drawHUD(renderer, text);
  };

  game.start();
  return game;
}
