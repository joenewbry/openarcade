// elevator-action/game.js — Elevator Action game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 600;

// ── Constants ──
const TILE = 24;
const PLAYER_W = 16;
const PLAYER_H = 22;
const PLAYER_SPEED = 2.5;
const BULLET_SPEED = 6;
const GRAVITY = 0.5;
const JUMP_VEL = -6;
const ELEVATOR_SPEED = 1.8;

// Building layout constants
const FLOOR_H = 72;
const BUILDING_LEFT = 48;
const BUILDING_RIGHT = 432;
const BUILDING_W = BUILDING_RIGHT - BUILDING_LEFT;

// Elevator shaft
const SHAFT_W = 36;

// ── State ──
let player, bullets, enemyBullets, enemies, particles;
let floors, elevators, shafts, redDoors;
let camera, level, docsCollected, docsTotal;
let tick;
let escapeZone;
let score, best;
let shootAnimTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const docsEl = document.getElementById('docs');
const bestEl = document.getElementById('best');

// ── Collision helpers ──
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function isOnPlatform(entity) {
  const footY = entity.y + entity.h;
  const footRect = { x: entity.x + 2, y: footY - 2, w: entity.w - 4, h: 6 };

  for (const floor of floors) {
    for (const seg of floor.segments) {
      const platRect = { x: seg.x, y: seg.y, w: seg.w, h: 6 };
      if (rectsOverlap(footRect, platRect) && entity.vy >= 0) {
        return seg.y;
      }
    }
  }
  return null;
}

function isOnElevator(entity) {
  const footY = entity.y + entity.h;
  for (const elev of elevators) {
    if (footY >= elev.y && footY <= elev.y + elev.h + 4 &&
        entity.x + entity.w > elev.x + 4 && entity.x < elev.x + elev.w - 4 &&
        entity.vy >= 0) {
      return elev;
    }
  }
  return null;
}

// ── Level generation ──
function generateLevel(levelNum) {
  const numFloors = 8 + Math.min(levelNum, 4) * 2;
  const numShafts = 2 + Math.min(levelNum, 2);
  const numDocs = 3 + levelNum;
  const numEnemies = 2 + levelNum * 2;

  floors = [];
  shafts = [];
  elevators = [];
  redDoors = [];
  enemies = [];

  // Create shaft positions spread across building width
  const shaftPositions = [];
  const segmentW = BUILDING_W / (numShafts + 1);
  for (let i = 0; i < numShafts; i++) {
    const sx = BUILDING_LEFT + segmentW * (i + 1) - SHAFT_W / 2;
    shaftPositions.push(sx);
    shafts.push({ x: sx, w: SHAFT_W });
  }

  // Create floors
  for (let i = 0; i < numFloors; i++) {
    const y = i * FLOOR_H + 60;
    floors.push({
      index: i,
      y: y,
      segments: buildFloorSegments(y, shaftPositions)
    });
  }

  // Create elevators in shafts
  for (let si = 0; si < shaftPositions.length; si++) {
    const elevsPerShaft = Math.min(3, Math.ceil(numFloors / 4));
    const floorsPerElev = Math.ceil(numFloors / elevsPerShaft) + 1;

    for (let e = 0; e < elevsPerShaft; e++) {
      const topFloor = Math.max(0, e * (floorsPerElev - 1) - 1);
      const bottomFloor = Math.min(numFloors - 1, topFloor + floorsPerElev);
      const topY = floors[topFloor].y + FLOOR_H - 6;
      const bottomY = floors[bottomFloor].y + FLOOR_H - 6;

      if (bottomY <= topY) continue;

      elevators.push({
        shaftIndex: si,
        x: shaftPositions[si],
        y: topY + (bottomY - topY) * (e % 2 === 0 ? 0.3 : 0.7),
        w: SHAFT_W,
        h: 6,
        topY: topY,
        bottomY: bottomY,
        dir: e % 2 === 0 ? 1 : -1,
        speed: ELEVATOR_SPEED * (0.8 + Math.random() * 0.4),
        carrying: null
      });
    }
  }

  // Place red doors on random floors (not first or last)
  const doorFloors = [];
  for (let i = 0; i < numDocs && doorFloors.length < numFloors - 2; i++) {
    let fi;
    do {
      fi = 1 + Math.floor(Math.random() * (numFloors - 2));
    } while (doorFloors.includes(fi));
    doorFloors.push(fi);

    const side = Math.random() > 0.5 ? 'left' : 'right';
    const doorX = side === 'left'
      ? BUILDING_LEFT + 8 + Math.floor(Math.random() * 3) * 40
      : BUILDING_RIGHT - 40 - Math.floor(Math.random() * 3) * 40;

    redDoors.push({
      x: doorX,
      y: floors[fi].y + FLOOR_H - 38,
      w: 24,
      h: 32,
      floor: fi,
      collected: false
    });
  }

  docsTotal = redDoors.length;
  docsCollected = 0;
  docsEl.textContent = `${docsCollected}/${docsTotal}`;

  // Place enemies on various floors
  for (let i = 0; i < numEnemies; i++) {
    const fi = 1 + Math.floor(Math.random() * (numFloors - 2));
    const floor = floors[fi];
    const ex = BUILDING_LEFT + 40 + Math.random() * (BUILDING_W - 80);
    spawnEnemy(ex, floor.y + FLOOR_H - PLAYER_H - 6, fi);
  }

  // Escape zone at bottom
  const lastFloor = floors[numFloors - 1];
  escapeZone = {
    x: BUILDING_LEFT + BUILDING_W / 2 - 30,
    y: lastFloor.y + FLOOR_H - 40,
    w: 60,
    h: 34
  };

  return numFloors;
}

function buildFloorSegments(y, shaftPositions) {
  const segments = [];
  let cx = BUILDING_LEFT;

  const sorted = [...shaftPositions].sort((a, b) => a - b);

  for (const sx of sorted) {
    if (sx > cx) {
      segments.push({ x: cx, w: sx - cx, y: y + FLOOR_H - 6 });
    }
    cx = sx + SHAFT_W;
  }

  if (cx < BUILDING_RIGHT) {
    segments.push({ x: cx, w: BUILDING_RIGHT - cx, y: y + FLOOR_H - 6 });
  }

  return segments;
}

function spawnEnemy(x, y, floorIndex) {
  enemies.push({
    x: x,
    y: y,
    vx: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8),
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    floor: floorIndex,
    alive: true,
    shootTimer: 60 + Math.floor(Math.random() * 120),
    facing: 1,
    onGround: false,
    patrolLeft: 60 + Math.random() * 120,
    patrolRight: 0,
    alertRange: 160 + Math.random() * 80,
    alerted: false
  });
}

function resetPlayer() {
  const startFloor = floors[0];
  const spawnSeg = startFloor.segments[0];
  const spawnX = spawnSeg.x + spawnSeg.w / 2 - PLAYER_W / 2;
  player = {
    x: spawnX,
    y: startFloor.y + FLOOR_H - PLAYER_H - 6,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facing: 1,
    onGround: false,
    onElevator: null,
    crouching: false,
    shooting: false,
    shootCooldown: 0,
    lives: 3,
    invuln: 0,
    enteringDoor: false,
    doorTimer: 0
  };
  shootAnimTimer = 0;
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI * 2 / 10) * i + Math.random() * 0.3;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 10,
      color
    });
  }
}

function hurtPlayer(game) {
  if (player.invuln > 0) return;
  player.lives--;
  player.invuln = 90;
  spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#d6f');

  if (player.lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} | Docs: ${docsCollected}/${docsTotal} -- Press any key`);
    game.setState('over');
  }
}

function levelComplete() {
  level++;
  score += 500 + docsCollected * 200;
  scoreEl.textContent = score;

  generateLevel(level);
  resetPlayer();
  bullets = [];
  enemyBullets = [];
  particles = [];
  camera.y = 0;
  camera.targetY = 0;
}

// ── Drawing helpers ──

function drawBuildingPreview(renderer, text) {
  // Simple static building preview for waiting screen
  renderer.fillRect(80, 50, 320, 500, '#16213e');
  // Outline
  renderer.drawLine(80, 50, 400, 50, '#0f3460', 2);
  renderer.drawLine(80, 50, 80, 550, '#0f3460', 2);
  renderer.drawLine(400, 50, 400, 550, '#0f3460', 2);
  renderer.drawLine(80, 550, 400, 550, '#0f3460', 2);

  // Floors and windows
  for (let i = 0; i < 7; i++) {
    const y = 50 + i * 70 + 64;
    renderer.fillRect(80, y, 320, 6, '#0f3460');

    for (let w = 0; w < 6; w++) {
      const color = Math.random() > 0.3 ? '#334' : '#da3';
      renderer.fillRect(95 + w * 52, y - 30, 20, 24, color);
    }
  }

  // Spy silhouette
  renderer.setGlow('#d6f', 0.6);
  renderer.fillRect(230, 100, 16, 22, '#d6f');
  renderer.fillRect(226, 96, 24, 6, '#d6f');
  renderer.setGlow(null);
}

function drawBuilding(renderer, camY) {
  const totalH = floors.length * FLOOR_H + 100;

  // Building walls
  renderer.fillRect(BUILDING_LEFT - 8, -20 - camY, 8, totalH, '#16213e');
  renderer.fillRect(BUILDING_RIGHT, -20 - camY, 8, totalH, '#16213e');

  // Building interior
  renderer.fillRect(BUILDING_LEFT, -20 - camY, BUILDING_W, totalH, '#0d1525');

  // Floor platforms
  for (const floor of floors) {
    for (const seg of floor.segments) {
      renderer.fillRect(seg.x, seg.y - camY, seg.w, 6, '#0f3460');
      // Floor surface detail
      renderer.fillRect(seg.x, seg.y - camY, seg.w, 2, '#1a2840');
    }

    // Background wall details (windows/panels)
    const fy = floor.y;
    const panelY = fy + 10;
    for (let wx = BUILDING_LEFT + 12; wx < BUILDING_RIGHT - 24; wx += 44) {
      let blocked = false;
      for (const shaft of shafts) {
        if (wx + 20 > shaft.x && wx < shaft.x + shaft.w) { blocked = true; break; }
      }
      if (!blocked) {
        renderer.fillRect(wx, panelY - camY, 28, 36, '#162240');
        // Border
        renderer.drawLine(wx, panelY - camY, wx + 28, panelY - camY, '#0f3460', 1);
        renderer.drawLine(wx, panelY - camY, wx, panelY + 36 - camY, '#0f3460', 1);
        renderer.drawLine(wx + 28, panelY - camY, wx + 28, panelY + 36 - camY, '#0f3460', 1);
        renderer.drawLine(wx, panelY + 36 - camY, wx + 28, panelY + 36 - camY, '#0f3460', 1);

        // Inner window glow
        if (Math.sin(wx * 0.1 + fy * 0.05) > 0.2) {
          renderer.fillRect(wx + 2, panelY + 2 - camY, 24, 32, 'rgba(221, 102, 255, 0.04)');
        }
      }
    }
  }

  // Building edge neon trim
  renderer.setGlow('#d6f', 0.4);
  renderer.fillRect(BUILDING_LEFT - 8, -20 - camY, 2, totalH, '#d6f');
  renderer.fillRect(BUILDING_RIGHT + 6, -20 - camY, 2, totalH, '#d6f');
  renderer.setGlow(null);
}

function drawShafts(renderer, camY) {
  const totalH = floors.length * FLOOR_H + 100;
  for (const shaft of shafts) {
    renderer.fillRect(shaft.x, -20 - camY, shaft.w, totalH, '#0a0e1a');
    // Shaft rails
    renderer.fillRect(shaft.x, -20 - camY, 2, totalH, '#1a2840');
    renderer.fillRect(shaft.x + shaft.w - 2, -20 - camY, 2, totalH, '#1a2840');
  }
}

function drawDoors(renderer, text, camY) {
  for (const door of redDoors) {
    if (door.collected) {
      renderer.fillRect(door.x, door.y - camY, door.w, door.h, '#1a2840');
      // Border
      renderer.drawLine(door.x, door.y - camY, door.x + door.w, door.y - camY, '#333', 1);
      renderer.drawLine(door.x, door.y - camY, door.x, door.y + door.h - camY, '#333', 1);
      renderer.drawLine(door.x + door.w, door.y - camY, door.x + door.w, door.y + door.h - camY, '#333', 1);
      renderer.drawLine(door.x, door.y + door.h - camY, door.x + door.w, door.y + door.h - camY, '#333', 1);
    } else {
      // Red door - glowing
      renderer.setGlow('#f00', 0.7);
      renderer.fillRect(door.x, door.y - camY, door.w, door.h, '#c00');
      renderer.setGlow(null);

      // Door details
      renderer.fillRect(door.x + 2, door.y + 2 - camY, door.w - 4, door.h / 2 - 2, '#a00');
      renderer.fillRect(door.x + 2, door.y + door.h / 2 + 1 - camY, door.w - 4, door.h / 2 - 3, '#a00');

      // Door handle
      renderer.fillRect(door.x + door.w - 6, door.y + door.h / 2 - 2 - camY, 3, 4, '#ff0');

      // TOP SECRET label
      text.drawText('TOP', door.x + door.w / 2, door.y + 4 - camY, 6, '#ff0', 'center');
      text.drawText('SECRET', door.x + door.w / 2, door.y + 12 - camY, 6, '#ff0', 'center');

      // Pulse glow
      const pulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
      const pulseAlpha = pulse * 0.15;
      renderer.fillRect(door.x - 4, door.y - 4 - camY, door.w + 8, door.h + 8, `rgba(255, 0, 0, ${pulseAlpha})`);
    }
  }
}

function drawElevators(renderer, camY) {
  for (const elev of elevators) {
    renderer.setGlow('#4a6', 0.4);
    renderer.fillRect(elev.x + 2, elev.y - camY, elev.w - 4, elev.h, '#4a6');
    renderer.setGlow(null);

    // Direction indicator (triangle)
    const arrowX = elev.x + elev.w / 2;
    const arrowY = elev.y + elev.h / 2 - camY;
    if (elev.dir < 0) {
      renderer.fillPoly([
        { x: arrowX, y: arrowY - 3 },
        { x: arrowX - 3, y: arrowY + 1 },
        { x: arrowX + 3, y: arrowY + 1 }
      ], '#8f8');
    } else {
      renderer.fillPoly([
        { x: arrowX, y: arrowY + 3 },
        { x: arrowX - 3, y: arrowY - 1 },
        { x: arrowX + 3, y: arrowY - 1 }
      ], '#8f8');
    }
  }
}

function drawEscapeZone(renderer, text, camY) {
  if (!escapeZone) return;

  const allCollected = docsCollected >= docsTotal;
  const color = allCollected ? '#0f0' : '#555';
  const glowAlpha = allCollected ? (Math.sin(tick * 0.1) * 0.3 + 0.5) : 0.2;

  const fillColor = allCollected
    ? `rgba(0,255,0,${glowAlpha})`
    : `rgba(100,100,100,${glowAlpha})`;
  renderer.fillRect(escapeZone.x, escapeZone.y - camY, escapeZone.w, escapeZone.h, fillColor);

  // Border
  if (allCollected) renderer.setGlow(color, 0.6);
  renderer.drawLine(escapeZone.x, escapeZone.y - camY, escapeZone.x + escapeZone.w, escapeZone.y - camY, color, 2);
  renderer.drawLine(escapeZone.x, escapeZone.y - camY, escapeZone.x, escapeZone.y + escapeZone.h - camY, color, 2);
  renderer.drawLine(escapeZone.x + escapeZone.w, escapeZone.y - camY, escapeZone.x + escapeZone.w, escapeZone.y + escapeZone.h - camY, color, 2);
  renderer.drawLine(escapeZone.x, escapeZone.y + escapeZone.h - camY, escapeZone.x + escapeZone.w, escapeZone.y + escapeZone.h - camY, color, 2);
  if (allCollected) renderer.setGlow(null);

  // EXIT label
  text.drawText('EXIT', escapeZone.x + escapeZone.w / 2, escapeZone.y + escapeZone.h / 2 - 4 - camY, 12, color, 'center');

  if (!allCollected) {
    text.drawText('NEED DOCS', escapeZone.x + escapeZone.w / 2, escapeZone.y - 8 - camY, 8, '#888', 'center');
  }
}

function drawPlayer(renderer, camY) {
  if (player.invuln > 0 && tick % 6 < 3) return;

  const px = player.x;
  const py = player.y - camY;
  const f = player.facing;
  const input_keys = _gameRef.input;

  renderer.setGlow('#d6f', 0.5);

  if (player.crouching) {
    renderer.fillRect(px + 2, py + 10, player.w - 4, player.h - 10, '#d6f');
    renderer.fillRect(px + 3, py + 6, player.w - 6, 8, '#d6f');
  } else {
    // Body
    renderer.fillRect(px + 3, py + 6, player.w - 6, player.h - 6, '#d6f');
    // Head
    renderer.fillRect(px + 4, py, player.w - 8, 8, '#d6f');
    // Hat (spy fedora)
    renderer.fillRect(px + 1, py - 2, player.w - 2, 4, '#a4e');
    renderer.fillRect(px + 3, py - 4, player.w - 6, 3, '#a4e');
  }

  renderer.setGlow(null);

  // Gun arm when shooting
  if (shootAnimTimer > 0 || input_keys.isDown(' ')) {
    const gunX = f > 0 ? px + player.w : px - 6;
    renderer.fillRect(gunX, py + 8, 6, 3, '#fff');
  }

  // Eyes
  const eyeX = f > 0 ? px + player.w - 6 : px + 3;
  renderer.fillRect(eyeX, py + 2, 3, 2, '#fff');
}

function drawEnemies(renderer, text, camY) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const ex = enemy.x;
    const ey = enemy.y - camY;
    const f = enemy.facing;

    const bodyColor = enemy.alerted ? '#f44' : '#a44';
    const hatColor = enemy.alerted ? '#c22' : '#822';

    renderer.setGlow(bodyColor, 0.4);

    // Body
    renderer.fillRect(ex + 3, ey + 6, enemy.w - 6, enemy.h - 6, bodyColor);
    // Head
    renderer.fillRect(ex + 4, ey, enemy.w - 8, 8, bodyColor);
    // Hat
    renderer.fillRect(ex + 2, ey - 2, enemy.w - 4, 4, hatColor);

    renderer.setGlow(null);

    // Eyes
    const eyeX = f > 0 ? ex + enemy.w - 6 : ex + 3;
    renderer.fillRect(eyeX, ey + 2, 3, 2, '#ff0');

    // Gun
    if (enemy.alerted) {
      const gunX = f > 0 ? ex + enemy.w : ex - 5;
      renderer.fillRect(gunX, ey + 8, 5, 2, '#888');
    }

    // Alert indicator
    if (enemy.alerted) {
      text.drawText('!', ex + enemy.w / 2, ey - 10, 10, '#f00', 'center');
    }
  }
}

function drawBullets(renderer, camY) {
  // Player bullets
  renderer.setGlow('#d6f', 0.4);
  for (const b of bullets) {
    renderer.fillRect(b.x - 3, b.y - 1 - camY, 6, 3, '#d6f');
  }

  // Enemy bullets
  renderer.setGlow('#f44', 0.4);
  for (const b of enemyBullets) {
    renderer.fillRect(b.x - 3, b.y - 1 - camY, 6, 3, '#f44');
  }
  renderer.setGlow(null);
}

function drawParticles(renderer, camY) {
  for (const p of particles) {
    const alpha = Math.min(1, p.life / 25);
    // Approximate alpha by appending to hex color
    const r = parseInt(p.color.slice(1, 2), 16) * 17;
    const g = parseInt(p.color.slice(2, 3), 16) * 17;
    const b_val = parseInt(p.color.slice(3, 4), 16) * 17;
    renderer.fillRect(p.x - 2, p.y - 2 - camY, 4, 4, `rgba(${r},${g},${b_val},${alpha})`);
  }
}

function drawHUD(renderer, text, camY) {
  // Lives
  renderer.setGlow('#d6f', 0.3);
  for (let i = 0; i < player.lives; i++) {
    renderer.fillRect(10 + i * 18, H - 20, 12, 14, '#d6f');
    renderer.fillRect(8 + i * 18, H - 22, 16, 4, '#d6f');
  }
  renderer.setGlow(null);

  // Level indicator
  text.drawText(`FLOOR ${level}`, W - 10, H - 16, 12, '#d6f', 'right');

  // Minimap
  drawMinimap(renderer, camY);
}

function drawMinimap(renderer, camY) {
  const mmX = W - 40;
  const mmY = 10;
  const mmW = 30;
  const mmH = 120;
  const totalH = floors.length * FLOOR_H;
  const scale = mmH / totalH;

  // Background
  renderer.fillRect(mmX, mmY, mmW, mmH, 'rgba(15, 52, 96, 0.7)');
  // Border
  renderer.drawLine(mmX, mmY, mmX + mmW, mmY, '#0f3460', 1);
  renderer.drawLine(mmX, mmY, mmX, mmY + mmH, '#0f3460', 1);
  renderer.drawLine(mmX + mmW, mmY, mmX + mmW, mmY + mmH, '#0f3460', 1);
  renderer.drawLine(mmX, mmY + mmH, mmX + mmW, mmY + mmH, '#0f3460', 1);

  // Floors
  for (const floor of floors) {
    const fy = mmY + floor.y * scale;
    renderer.fillRect(mmX, fy + FLOOR_H * scale - 1, mmW, 1, '#0f3460');
  }

  // Red doors (uncollected)
  for (const door of redDoors) {
    if (!door.collected) {
      renderer.fillRect(mmX + (door.x - BUILDING_LEFT) / BUILDING_W * mmW, mmY + door.y * scale, 3, 3, '#f00');
    }
  }

  // Escape zone
  const escColor = docsCollected >= docsTotal ? '#0f0' : '#555';
  renderer.fillRect(mmX + (escapeZone.x - BUILDING_LEFT) / BUILDING_W * mmW, mmY + escapeZone.y * scale, 4, 3, escColor);

  // Player
  renderer.setGlow('#d6f', 0.3);
  renderer.fillRect(mmX + (player.x - BUILDING_LEFT) / BUILDING_W * mmW - 1, mmY + player.y * scale - 1, 4, 4, '#d6f');
  renderer.setGlow(null);

  // Camera view box
  const cvY = mmY + camY * scale;
  const cvH = H * scale;
  renderer.drawLine(mmX, cvY, mmX + mmW, cvY, 'rgba(221, 102, 255, 0.4)', 1);
  renderer.drawLine(mmX, cvY, mmX, cvY + cvH, 'rgba(221, 102, 255, 0.4)', 1);
  renderer.drawLine(mmX + mmW, cvY, mmX + mmW, cvY + cvH, 'rgba(221, 102, 255, 0.4)', 1);
  renderer.drawLine(mmX, cvY + cvH, mmX + mmW, cvY + cvH, 'rgba(221, 102, 255, 0.4)', 1);

  // Enemies
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    renderer.fillRect(mmX + (enemy.x - BUILDING_LEFT) / BUILDING_W * mmW, mmY + enemy.y * scale, 2, 2, '#f44');
  }
}

// ── Game reference for input access in draw ──
let _gameRef = null;

export function createGame() {
  const game = new Game('game');
  _gameRef = game;

  game.onInit = () => {
    score = 0;
    best = best || 0;
    level = 1;
    tick = 0;
    bullets = [];
    enemyBullets = [];
    particles = [];
    camera = { y: 0, targetY: 0 };
    shootAnimTimer = 0;

    scoreEl.textContent = '0';

    generateLevel(level);
    resetPlayer();

    game.showOverlay('ELEVATOR ACTION', 'Arrow keys: Move | Space: Shoot | Down at red door: Collect docs -- Press any key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ') || input.wasPressed('Enter')) {
        camera.y = 0;
        camera.targetY = 0;
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    // ── over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── playing state ──
    tick++;

    // Shoot animation timer (replaces setTimeout)
    if (shootAnimTimer > 0) shootAnimTimer--;

    // Player input
    let moveX = 0;
    if (input.isDown('ArrowLeft'))  { moveX = -PLAYER_SPEED; player.facing = -1; }
    if (input.isDown('ArrowRight')) { moveX = PLAYER_SPEED;  player.facing = 1; }

    player.crouching = input.isDown('ArrowDown') && player.onGround && !player.onElevator;

    if (player.crouching) moveX = 0;

    // Shooting
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (input.isDown(' ') && player.shootCooldown <= 0 && !player.enteringDoor) {
      bullets.push({
        x: player.x + player.w / 2 + player.facing * 8,
        y: player.y + 8,
        vx: player.facing * BULLET_SPEED,
        vy: 0,
        owner: 'player'
      });
      player.shootCooldown = 15;
      player.shooting = true;
      shootAnimTimer = 6; // ~100ms at 60fps
    }

    // Check if near red door and pressing down
    if (input.isDown('ArrowDown') && player.onGround && !player.enteringDoor) {
      for (const door of redDoors) {
        if (!door.collected && Math.abs(player.x + player.w / 2 - door.x - door.w / 2) < 20 &&
            Math.abs(player.y + player.h - door.y - door.h) < 10) {
          door.collected = true;
          docsCollected++;
          docsEl.textContent = `${docsCollected}/${docsTotal}`;
          score += 100;
          scoreEl.textContent = score;
          player.enteringDoor = true;
          player.doorTimer = 30;
          // Particles
          for (let i = 0; i < 8; i++) {
            particles.push({
              x: door.x + door.w / 2,
              y: door.y + door.h / 2,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 20 + Math.random() * 10,
              color: '#ff4'
            });
          }
        }
      }
    }

    if (player.doorTimer > 0) {
      player.doorTimer--;
      if (player.doorTimer <= 0) player.enteringDoor = false;
    }

    // Elevator interaction
    if (input.isDown('ArrowUp') || input.isDown('ArrowDown')) {
      if (!player.onElevator) {
        const elev = isOnElevator(player);
        if (elev) {
          player.onElevator = elev;
          player.vy = 0;
        }
      }
    }

    // Move player horizontally
    if (!player.enteringDoor) {
      player.x += moveX;
    }

    // Clamp to building bounds
    player.x = Math.max(BUILDING_LEFT + 2, Math.min(BUILDING_RIGHT - player.w - 2, player.x));

    // Vertical movement
    if (player.onElevator) {
      const elev = player.onElevator;
      player.y = elev.y - player.h;
      player.vy = 0;
      player.onGround = true;

      // Control elevator with up/down
      if (input.isDown('ArrowUp')) {
        elev.dir = -1;
      } else if (input.isDown('ArrowDown')) {
        elev.dir = 1;
      }

      // Step off elevator if moving horizontally off it
      if (player.x + player.w < elev.x + 2 || player.x > elev.x + elev.w - 2) {
        const platY = isOnPlatform(player);
        if (platY !== null) {
          player.onElevator = null;
          player.y = platY - player.h;
        } else {
          player.x = Math.max(elev.x + 2, Math.min(elev.x + elev.w - player.w - 2, player.x));
        }
      }
    } else {
      // Apply gravity
      player.vy += GRAVITY;
      player.y += player.vy;

      // Check floor collision
      const platY = isOnPlatform(player);
      if (platY !== null && player.vy >= 0) {
        player.y = platY - player.h;
        player.vy = 0;
        player.onGround = true;
      } else {
        const elev = isOnElevator(player);
        if (elev && player.vy >= 0) {
          player.y = elev.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.onElevator = elev;
        } else {
          player.onGround = false;
        }
      }

      // Jump
      if (input.isDown('ArrowUp') && player.onGround && !player.onElevator) {
        player.vy = JUMP_VEL;
        player.onGround = false;
      }
    }

    // Fall off bottom
    if (player.y > floors[floors.length - 1].y + FLOOR_H + 100) {
      hurtPlayer(game);
    }

    // Invulnerability countdown
    if (player.invuln > 0) player.invuln--;

    // ── Update elevators ──
    for (const elev of elevators) {
      elev.y += elev.dir * elev.speed;
      if (elev.y <= elev.topY) { elev.y = elev.topY; elev.dir = 1; }
      if (elev.y >= elev.bottomY) { elev.y = elev.bottomY; elev.dir = -1; }
    }

    // ── Update enemies ──
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.alertRange) {
        enemy.alerted = true;
      }

      if (enemy.alerted) {
        if (Math.abs(dy) < FLOOR_H) {
          enemy.facing = dx > 0 ? 1 : -1;
          enemy.vx = enemy.facing * 1.2;
        }

        enemy.shootTimer--;
        if (enemy.shootTimer <= 0 && dist < 250) {
          enemy.shootTimer = 50 + Math.floor(Math.random() * 60);
          enemyBullets.push({
            x: enemy.x + enemy.w / 2 + enemy.facing * 8,
            y: enemy.y + 8,
            vx: enemy.facing * 4,
            vy: 0,
            owner: 'enemy'
          });
        }
      } else {
        enemy.patrolLeft -= Math.abs(enemy.vx);
        if (enemy.patrolLeft <= 0) {
          enemy.vx = -enemy.vx;
          enemy.facing = enemy.vx > 0 ? 1 : -1;
          enemy.patrolLeft = 60 + Math.random() * 120;
        }
      }

      enemy.x += enemy.vx;
      enemy.x = Math.max(BUILDING_LEFT + 4, Math.min(BUILDING_RIGHT - enemy.w - 4, enemy.x));

      enemy.vy += GRAVITY;
      enemy.y += enemy.vy;

      const ePlatY = isOnPlatform(enemy);
      if (ePlatY !== null && enemy.vy >= 0) {
        enemy.y = ePlatY - enemy.h;
        enemy.vy = 0;
        enemy.onGround = true;
      } else {
        const eElev = isOnElevator(enemy);
        if (eElev && enemy.vy >= 0) {
          enemy.y = eElev.y - enemy.h;
          enemy.vy = 0;
          enemy.onGround = true;
        } else {
          enemy.onGround = false;
        }
      }
    }

    // ── Update bullets ──
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].x += bullets[i].vx;
      bullets[i].y += bullets[i].vy;

      if (bullets[i].x < BUILDING_LEFT - 10 || bullets[i].x > BUILDING_RIGHT + 10 ||
          bullets[i].y < camera.y - 20 || bullets[i].y > camera.y + H + 20) {
        bullets.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (bullets[i] && rectsOverlap(
          { x: bullets[i].x - 3, y: bullets[i].y - 3, w: 6, h: 6 },
          enemy
        )) {
          enemy.alive = false;
          score += 50;
          scoreEl.textContent = score;
          spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#f44');
          bullets.splice(i, 1);
          hit = true;
          break;
        }
      }

      if (!hit && bullets[i]) {
        if (bullets[i].x <= BUILDING_LEFT + 6 || bullets[i].x >= BUILDING_RIGHT - 6) {
          bullets.splice(i, 1);
        }
      }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      enemyBullets[i].x += enemyBullets[i].vx;
      enemyBullets[i].y += enemyBullets[i].vy;

      if (enemyBullets[i].x < 0 || enemyBullets[i].x > W) {
        enemyBullets.splice(i, 1);
        continue;
      }

      if (player.invuln <= 0 && rectsOverlap(
        { x: enemyBullets[i].x - 3, y: enemyBullets[i].y - 3, w: 6, h: 6 },
        player
      )) {
        enemyBullets.splice(i, 1);
        hurtPlayer(game);
      }
    }

    // Enemy collision with player
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (player.invuln <= 0 && rectsOverlap(player, enemy)) {
        hurtPlayer(game);
        enemy.alive = false;
        spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#f44');
      }
    }

    // ── Check escape zone ──
    if (docsCollected >= docsTotal && rectsOverlap(player, escapeZone)) {
      levelComplete();
      return;
    }

    // ── Update particles ──
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // ── Camera ──
    camera.targetY = player.y - H / 3;
    camera.targetY = Math.max(0, Math.min(floors[floors.length - 1].y + FLOOR_H - H + 20, camera.targetY));
    camera.y += (camera.targetY - camera.y) * 0.08;

    // ── Respawn enemies gradually ──
    const aliveEnemies = enemies.filter(e => e.alive).length;
    if (aliveEnemies < 2 + level && tick % 180 === 0) {
      const fi = 1 + Math.floor(Math.random() * (floors.length - 2));
      const fy = floors[fi].y + FLOOR_H - PLAYER_H - 6;
      if (Math.abs(fy - camera.y - H / 2) > H / 2 + 50) {
        const ex = BUILDING_LEFT + 40 + Math.random() * (BUILDING_W - 80);
        spawnEnemy(ex, fy, fi);
      }
    }

    // ── Game data for ML ──
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerFacing: player.facing,
      onElevator: !!player.onElevator,
      docsCollected: docsCollected,
      docsTotal: docsTotal,
      enemyCount: enemies.filter(e => e.alive).length
    };
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      drawBuildingPreview(renderer, text);
      return;
    }

    const camY = camera.y;

    // Draw building background
    drawBuilding(renderer, camY);

    // Draw elevator shafts
    drawShafts(renderer, camY);

    // Draw red doors
    drawDoors(renderer, text, camY);

    // Draw elevators
    drawElevators(renderer, camY);

    // Draw escape zone
    drawEscapeZone(renderer, text, camY);

    // Draw enemies
    drawEnemies(renderer, text, camY);

    // Draw player
    drawPlayer(renderer, camY);

    // Draw bullets
    drawBullets(renderer, camY);

    // Draw particles
    drawParticles(renderer, camY);

    // HUD (screen space, not affected by camera)
    drawHUD(renderer, text, camY);
  };

  game.start();
  return game;
}
