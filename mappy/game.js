// mappy/game.js — Mappy game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// --- CONSTANTS ---
const TILE = 32;
const COLS = 15;
const NUM_FLOORS = 6;
const FLOOR_GAP = 80;
const ROOF_Y = 40;
const FLOOR_THICKNESS = 4;
const TRAMPOLINE_WIDTH = 28;
const TRAMPOLINE_HEIGHT = 10;
const GRAVITY = 0.35;
const MAX_FALL = 7;
const PLAYER_SPEED = 2.5;
const CAT_SPEED_BASE = 1.2;
const DOOR_WIDTH = 6;
const DOOR_HEIGHT = 54;
const MICROWAVE_RANGE = 160;
const MICROWAVE_DURATION = 60;

const TRAMP_COLS = [1, 4, 7, 10, 13];

const ITEM_TYPES = [
  { name: 'TV',       color: '#0ff', points: 200, shape: 'tv' },
  { name: 'Computer', color: '#0f0', points: 300, shape: 'computer' },
  { name: 'Painting', color: '#f80', points: 500, shape: 'painting' },
  { name: 'Radio',    color: '#f0f', points: 100, shape: 'radio' },
  { name: 'Safe',     color: '#88f', points: 800, shape: 'safe' },
];

// --- GAME STATE ---
let score, best, lives, level;
let player, cats, items, doors, trampolines;
let microwaveEffects;
let frameCount;
let itemsTotal;
let levelTransition;

// DOM refs
const scoreEl   = document.getElementById('score');
const bestEl    = document.getElementById('best');
const levelEl   = document.getElementById('level');
const livesEl   = document.getElementById('lives');

function floorY(i) { return ROOF_Y + i * FLOOR_GAP; }

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function isOnTrampolineGap(cx) {
  for (let col of TRAMP_COLS) {
    const gapLeft  = col * TILE + 4;
    const gapRight = col * TILE + TILE - 4;
    if (cx > gapLeft && cx < gapRight) return true;
  }
  return false;
}

// --- LEVEL SETUP ---
function setupLevel() {
  frameCount = 0;
  microwaveEffects = [];
  levelTransition = 0;

  player = {
    x: W / 2 - 8,
    y: floorY(NUM_FLOORS - 1) - 16,
    w: 16, h: 16,
    vx: 0, vy: 0,
    onFloor: true,
    floorIndex: NUM_FLOORS - 1,
    bounceCount: 0,
    facingRight: true,
    stunTimer: 0,
    dead: false
  };

  trampolines = [];
  for (let col of TRAMP_COLS) {
    for (let f = 0; f < NUM_FLOORS; f++) {
      const tx = col * TILE + (TILE - TRAMPOLINE_WIDTH) / 2;
      const ty = floorY(f) + FLOOR_GAP / 2 - TRAMPOLINE_HEIGHT / 2 + 12;
      if (ty + TRAMPOLINE_HEIGHT < H - 10) {
        trampolines.push({
          x: tx, y: ty,
          w: TRAMPOLINE_WIDTH, h: TRAMPOLINE_HEIGHT,
          aboveFloor: f, belowFloor: f + 1,
          stretch: 0
        });
      }
    }
  }

  doors = [];
  for (let f = 0; f < NUM_FLOORS; f++) {
    const doorCols = [3, 7, 11];
    for (let dc of doorCols) {
      doors.push({
        x: dc * TILE,
        y: floorY(f) - DOOR_HEIGHT,
        w: DOOR_WIDTH,
        h: DOOR_HEIGHT,
        floor: f,
        open: false,
        openTimer: 0,
        microwaving: false,
        microTimer: 0
      });
    }
  }

  items = [];
  const itemFloors = [];
  for (let f = 0; f < NUM_FLOORS - 1; f++) {
    itemFloors.push(f);
  }

  const numPairs = 3 + Math.min(level, 4);
  let pairCount = 0;
  for (let f of itemFloors) {
    if (pairCount >= numPairs) break;
    const type = ITEM_TYPES[pairCount % ITEM_TYPES.length];
    const lx = (2 + Math.floor(Math.random() * 3)) * TILE;
    const rx = (10 + Math.floor(Math.random() * 3)) * TILE;
    items.push({ x: lx, y: floorY(f) - 20, w: 20, h: 20, type, collected: false, floor: f, paired: pairCount });
    items.push({ x: rx, y: floorY(f) - 20, w: 20, h: 20, type, collected: false, floor: f, paired: pairCount });
    pairCount++;
  }
  while (pairCount < numPairs) {
    const f = itemFloors[Math.floor(Math.random() * itemFloors.length)];
    const type = ITEM_TYPES[pairCount % ITEM_TYPES.length];
    const lx = (1 + Math.floor(Math.random() * 5)) * TILE;
    const rx = (9 + Math.floor(Math.random() * 5)) * TILE;
    items.push({ x: lx, y: floorY(f) - 20, w: 20, h: 20, type, collected: false, floor: f, paired: pairCount });
    items.push({ x: rx, y: floorY(f) - 20, w: 20, h: 20, type, collected: false, floor: f, paired: pairCount });
    pairCount++;
  }
  itemsTotal = items.length;

  cats = [];
  const numCats = 2 + Math.min(level, 5);
  for (let i = 0; i < numCats; i++) {
    const f = i % (NUM_FLOORS - 1);
    const isGoro = (i === 0 && level >= 3);
    cats.push({
      x: (i % 2 === 0) ? TILE * 2 : W - TILE * 3,
      y: floorY(f) - 16,
      w: 16, h: 16,
      vx: (Math.random() < 0.5 ? -1 : 1) * (CAT_SPEED_BASE + level * 0.15),
      vy: 0,
      onFloor: true,
      floorIndex: f,
      stunTimer: 0,
      isGoro,
      bounceCount: 0,
      chaseTimer: 0,
      dirChangeTimer: Math.floor(Math.random() * 120) + 60
    });
  }

  livesEl.textContent = lives;
  levelEl.textContent = level;
}

// --- UPDATE HELPERS ---
function updatePlayer(input) {
  let moveDir = 0;
  if (input.isDown('ArrowLeft'))  moveDir = -1;
  if (input.isDown('ArrowRight')) moveDir = 1;

  if (player.onFloor) {
    player.vx = moveDir * PLAYER_SPEED;
    if (moveDir !== 0) player.facingRight = moveDir > 0;
  } else {
    player.vx = moveDir * PLAYER_SPEED * 0.8;
    if (moveDir !== 0) player.facingRight = moveDir > 0;
  }

  if (!player.onFloor) {
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  }

  player.x += player.vx;

  if (player.x + player.w < 0) player.x = W;
  if (player.x > W) player.x = -player.w;

  player.y += player.vy;

  if (player.vy > 0 && !player.onFloor) {
    for (let t of trampolines) {
      if (player.x + player.w > t.x && player.x < t.x + t.w &&
          player.y + player.h >= t.y && player.y + player.h <= t.y + t.h + 4) {
        player.bounceCount++;
        t.stretch = 8;
        if (player.bounceCount >= 4) {
          player.vy = 2;
          player.bounceCount = 0;
          player.dead = true;
          player.stunTimer = 40;
          return;
        }
        player.vy = -(6 + player.bounceCount * 0.8);
        break;
      }
    }
  }

  if (player.vy > 0) {
    const pcx = player.x + player.w / 2;
    for (let f = 0; f < NUM_FLOORS; f++) {
      const fy = floorY(f);
      if (player.y + player.h >= fy && player.y + player.h <= fy + 10 &&
          !isOnTrampolineGap(pcx)) {
        player.y = fy - player.h;
        player.vy = 0;
        player.onFloor = true;
        player.floorIndex = f;
        player.bounceCount = 0;
        break;
      }
    }
  }

  if (player.onFloor) {
    const pcx = player.x + player.w / 2;
    if (isOnTrampolineGap(pcx)) {
      player.onFloor = false;
      player.vy = 0.5;
    }
  }

  if (player.y > H + 20) {
    player.dead = true;
    player.stunTimer = 40;
  }

  for (let t of trampolines) {
    if (t.stretch > 0) t.stretch -= 0.5;
  }
}

function updateCats() {
  for (let cat of cats) {
    if (cat.stunTimer > 0) { cat.stunTimer--; continue; }

    cat.dirChangeTimer--;

    if (cat.onFloor) {
      if (cat.dirChangeTimer <= 0) {
        cat.dirChangeTimer = Math.floor(Math.random() * 120) + 60;
        if (Math.random() < 0.65) {
          cat.vx = (player.x > cat.x ? 1 : -1) * (CAT_SPEED_BASE + level * 0.15);
        } else {
          cat.vx = (Math.random() < 0.5 ? 1 : -1) * (CAT_SPEED_BASE + level * 0.15);
        }
      }

      if (cat.isGoro) {
        cat.vx = (player.x > cat.x ? 1 : -1) * (CAT_SPEED_BASE + level * 0.15) * 1.4;
      }

      cat.x += cat.vx;

      if (cat.x + cat.w < 0) cat.x = W;
      if (cat.x > W) cat.x = -cat.w;

      const catCenterX = cat.x + cat.w / 2;
      if (Math.random() < 0.008 || (Math.abs(cat.floorIndex - player.floorIndex) > 0 && Math.random() < 0.02)) {
        if (isOnTrampolineGap(catCenterX)) {
          cat.onFloor = false;
          cat.vy = player.y < cat.y ? -(5 + Math.random() * 2) : 1;
        }
      }
    } else {
      cat.vy += GRAVITY;
      if (cat.vy > MAX_FALL) cat.vy = MAX_FALL;
      cat.y += cat.vy;
      cat.x += cat.vx * 0.3;

      if (cat.vy > 0) {
        for (let t of trampolines) {
          if (cat.x + cat.w > t.x && cat.x < t.x + t.w &&
              cat.y + cat.h >= t.y && cat.y + cat.h <= t.y + t.h + 4) {
            cat.bounceCount++;
            t.stretch = 6;
            if (cat.bounceCount >= 3) {
              cat.vy = 2;
              cat.bounceCount = 0;
            } else {
              cat.vy = -(5 + Math.random() * 2);
            }
            break;
          }
        }
      }

      if (cat.vy > 0) {
        const ccx = cat.x + cat.w / 2;
        for (let f = 0; f < NUM_FLOORS; f++) {
          const fy = floorY(f);
          if (cat.y + cat.h >= fy && cat.y + cat.h <= fy + 10 &&
              !isOnTrampolineGap(ccx)) {
            cat.y = fy - cat.h;
            cat.vy = 0;
            cat.onFloor = true;
            cat.floorIndex = f;
            cat.bounceCount = 0;
            break;
          }
        }
      }

      if (cat.x + cat.w < 0) cat.x = W;
      if (cat.x > W) cat.x = -cat.w;
    }

    const bottomFloorY = floorY(NUM_FLOORS - 1);
    if (cat.y + cat.h > bottomFloorY + 40) {
      cat.y = floorY(0) - cat.h;
      cat.onFloor = true;
      cat.floorIndex = 0;
      cat.vy = 0;
    }
  }
}

function updateMicrowaves() {
  for (let d of doors) {
    if (d.openTimer > 0) {
      d.openTimer--;
      if (d.openTimer === 0) d.open = false;
    }
    if (d.microTimer > 0) {
      d.microTimer--;
      if (d.microTimer === 0) d.microwaving = false;
    }
  }

  microwaveEffects = microwaveEffects.filter(m => m.timer > 0);
  for (let m of microwaveEffects) {
    m.timer--;
    m.radius += 3;
  }
}

function openDoor(door) {
  if (door.open) {
    door.open = false;
    door.openTimer = 0;
    return;
  }
  door.open = true;
  door.openTimer = 90;

  door.microwaving = true;
  door.microTimer = MICROWAVE_DURATION;

  const blastDir = player.x < door.x ? 1 : -1;

  microwaveEffects.push({
    x: door.x + door.w / 2,
    y: door.y + door.h / 2,
    dir: blastDir,
    timer: 30,
    radius: 10,
    floor: door.floor
  });

  for (let cat of cats) {
    if (cat.stunTimer > 0) continue;
    if (Math.abs(cat.floorIndex - door.floor) > 0) continue;
    const dist = Math.abs(cat.x + cat.w / 2 - (door.x + door.w / 2));
    const sameDirection = (blastDir > 0 && cat.x > door.x) || (blastDir < 0 && cat.x < door.x);
    if (dist < MICROWAVE_RANGE && sameDirection) {
      cat.stunTimer = 120;
      cat.vx = blastDir * 4;
      cat.x += blastDir * 30;
      score += 50;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }
  }
}

function openNearestDoor() {
  if (!player.onFloor) return;

  let nearest = null;
  let nearestDist = Infinity;

  for (let d of doors) {
    if (d.floor !== player.floorIndex) continue;
    const dist = Math.abs((d.x + d.w / 2) - (player.x + player.w / 2));
    if (dist < nearestDist && dist < TILE * 1.5) {
      nearestDist = dist;
      nearest = d;
    }
  }

  if (nearest) openDoor(nearest);
}

function checkItemCollection() {
  for (let item of items) {
    if (item.collected) continue;
    if (rectsOverlap(player, item)) {
      item.collected = true;
      score += item.type.points;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }

      const pairItems = items.filter(it => it.paired === item.paired);
      const allCollected = pairItems.every(it => it.collected);
      if (allCollected && pairItems.length === 2) {
        const bonus = item.type.points * 2;
        score += bonus;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
      }
    }
  }
}

function checkCatCollision() {
  for (let cat of cats) {
    if (cat.stunTimer > 0) continue;
    if (player.stunTimer > 0 || player.dead) continue;
    if (rectsOverlap(player, cat)) {
      player.dead = true;
      player.stunTimer = 50;
    }
  }
}

function checkLevelClear() {
  const remaining = items.filter(it => !it.collected).length;
  if (remaining === 0 && levelTransition === 0) {
    levelTransition = 90;
    score += 1000 + level * 200;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
  }
}

function updateGameData() {
  window.gameData = {
    playerX: player.x,
    playerY: player.y,
    playerFloor: player.floorIndex,
    playerOnFloor: player.onFloor,
    cats: cats.map(c => ({
      x: c.x, y: c.y,
      floor: c.floorIndex,
      stunned: c.stunTimer > 0,
      isGoro: c.isGoro
    })),
    itemsRemaining: items.filter(it => !it.collected).length,
    itemsTotal: itemsTotal,
    level: level,
    lives: lives
  };
}

// --- DRAW HELPERS ---

function strokeRect(renderer, x, y, w, h, color, lineWidth) {
  // Top
  renderer.drawLine(x, y, x + w, y, color, lineWidth);
  // Bottom
  renderer.drawLine(x, y + h, x + w, y + h, color, lineWidth);
  // Left
  renderer.drawLine(x, y, x, y + h, color, lineWidth);
  // Right
  renderer.drawLine(x + w, y, x + w, y + h, color, lineWidth);
}

function drawMansionBg(renderer) {
  // Vertical mansion walls
  renderer.fillRect(0, ROOF_Y - 10, 8, H - ROOF_Y + 10, '#16213e');
  renderer.fillRect(W - 8, ROOF_Y - 10, 8, H - ROOF_Y + 10, '#16213e');

  // Roof
  renderer.fillRect(0, ROOF_Y - 12, W, 4, '#0f3460');

  // Subtle wallpaper stripes
  for (let fy = 0; fy < NUM_FLOORS - 1; fy++) {
    const top = floorY(fy) + 2;
    const bottom = floorY(fy + 1) - 2;
    for (let x = 16; x < W - 16; x += TILE) {
      renderer.fillRect(x, top, 1, bottom - top, '#0f346026');
    }
  }
}

function drawFloors(renderer) {
  for (let f = 0; f < NUM_FLOORS; f++) {
    const fy = floorY(f);

    const gapPositions = [];
    for (let col of TRAMP_COLS) {
      gapPositions.push({ start: col * TILE + 2, end: col * TILE + TILE - 2 });
    }
    gapPositions.sort((a, b) => a.start - b.start);

    let x = 0;
    for (let gap of gapPositions) {
      if (x < gap.start) {
        renderer.fillRect(x, fy, gap.start - x, FLOOR_THICKNESS, '#0f3460');
        // Floor highlight
        renderer.fillRect(x, fy, gap.start - x, 1, '#1a4a8e');
      }
      x = gap.end;
    }
    if (x < W) {
      renderer.fillRect(x, fy, W - x, FLOOR_THICKNESS, '#0f3460');
      renderer.fillRect(x, fy, W - x, 1, '#1a4a8e');
    }
  }
}

function drawTrampolines(renderer) {
  for (let t of trampolines) {
    const stretch = Math.max(0, t.stretch);
    const sy = t.y + stretch;
    const sh = Math.max(2, t.h - stretch + 2);

    // Trampoline fabric
    renderer.setGlow('#f44', 0.3);
    renderer.fillRect(t.x, sy, t.w, sh, '#f44');
    renderer.setGlow(null);

    // Trampoline legs
    renderer.drawLine(t.x + 3, sy + sh, t.x + 3, sy + sh + 6, '#888', 1);
    renderer.drawLine(t.x + t.w - 3, sy + sh, t.x + t.w - 3, sy + sh + 6, '#888', 1);
  }
}

function drawDoors(renderer) {
  for (let d of doors) {
    if (d.open) {
      const doorColor = d.microwaving ? '#fe4' : '#2a5a3e';
      const frameColor = d.microwaving ? '#fe4' : '#4a8a5e';
      renderer.fillRect(d.x - 12, d.y, 14, d.h, doorColor);
      strokeRect(renderer, d.x - 12, d.y, 14, d.h, frameColor, 1);

      if (d.microwaving) {
        const blastDir = player.x < d.x ? 1 : -1;
        const rx = blastDir > 0 ? d.x : d.x - MICROWAVE_RANGE;
        renderer.fillRect(rx, d.y, MICROWAVE_RANGE, d.h, '#ffee4433');
      }
    } else {
      renderer.fillRect(d.x, d.y, d.w, d.h, '#3a2a1a');
      strokeRect(renderer, d.x, d.y, d.w, d.h, '#5a4a2a', 1);
      // Door knob
      renderer.fillCircle(d.x + d.w - 1, d.y + d.h * 0.6, 1.5, '#fe4');
    }
  }
}

function drawItems(renderer) {
  for (let item of items) {
    if (item.collected) continue;
    const { x, y, w, h, type } = item;

    renderer.setGlow(type.color, 0.5);

    switch (type.shape) {
      case 'tv':
        renderer.fillRect(x + 2, y + 2, w - 4, h - 6, type.color);
        renderer.fillRect(x + 6, y + h - 5, 2, 4, type.color);
        renderer.fillRect(x + w - 8, y + h - 5, 2, 4, type.color);
        renderer.fillRect(x + 4, y + h - 2, w - 8, 2, type.color);
        // Screen
        renderer.fillRect(x + 4, y + 4, w - 8, h - 10, '#1a1a2e');
        // Antenna
        renderer.fillRect(x + w / 2 - 1, y - 3, 2, 5, type.color);
        break;
      case 'computer':
        renderer.fillRect(x + 3, y + 1, w - 6, h - 8, type.color);
        renderer.fillRect(x + 5, y + 3, w - 10, h - 12, '#1a1a2e');
        // Stand
        renderer.fillRect(x + w / 2 - 2, y + h - 7, 4, 3, type.color);
        renderer.fillRect(x + 4, y + h - 4, w - 8, 2, type.color);
        break;
      case 'painting':
        strokeRect(renderer, x + 1, y + 1, w - 2, h - 2, type.color, 2);
        renderer.fillRect(x + 3, y + 3, w - 6, h - 6, '#2a1a3e');
        // Art
        renderer.fillRect(x + 6, y + 6, 4, 4, type.color);
        renderer.fillRect(x + 11, y + 8, 3, 6, type.color);
        break;
      case 'radio':
        renderer.fillRect(x + 2, y + 4, w - 4, h - 6, type.color);
        // Speakers (circles)
        renderer.fillCircle(x + 7, y + h / 2, 3, '#1a1a2e');
        renderer.fillCircle(x + w - 7, y + h / 2, 3, '#1a1a2e');
        // Antenna
        renderer.fillRect(x + w - 5, y, 1, 5, type.color);
        break;
      case 'safe':
        renderer.fillRect(x + 1, y + 1, w - 2, h - 2, type.color);
        renderer.fillRect(x + 3, y + 3, w - 6, h - 6, '#1a1a2e');
        // Dial (circle outline approximated)
        strokeRect(renderer, x + w / 2 - 4, y + h / 2 - 4, 8, 8, type.color, 1);
        // Handle
        renderer.fillRect(x + w / 2 + 3, y + h / 2 - 1, 4, 2, type.color);
        break;
    }
    renderer.setGlow(null);
  }
}

function drawMicrowaves(renderer) {
  for (let m of microwaveEffects) {
    const alpha = (m.timer / 30 * 0.4).toFixed(2);
    const color = `rgba(255,238,68,${alpha})`;

    // Approximate wave arcs with short line segments
    for (let i = 0; i < 3; i++) {
      const r = m.radius + i * 12;
      const startAngle = m.dir > 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3;
      const endAngle   = m.dir > 0 ? Math.PI / 3  : Math.PI + Math.PI / 3;
      const segments = 8;
      for (let s = 0; s < segments; s++) {
        const a1 = startAngle + (endAngle - startAngle) * (s / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((s + 1) / segments);
        renderer.drawLine(
          m.x + Math.cos(a1) * r, m.y + Math.sin(a1) * r,
          m.x + Math.cos(a2) * r, m.y + Math.sin(a2) * r,
          color, 2
        );
      }
    }
  }
}

function drawPlayer(renderer) {
  if (player.stunTimer > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

  const px = player.x;
  const py = player.y;
  const cx = px + player.w / 2;
  const cy = py + player.h / 2;
  const dir = player.facingRight ? 1 : -1;

  renderer.setGlow('#4488ff', 0.4);

  // Body (blue uniform)
  renderer.fillRect(cx - 6, cy - 2, 12, 12, '#4488ff');

  // Head
  renderer.fillCircle(cx, cy - 5, 6, '#ffcc88');

  // Ears (mouse ears)
  renderer.fillCircle(cx - 5 * dir, cy - 9, 3, '#ffaa66');
  renderer.fillCircle(cx + 5 * dir, cy - 9, 3, '#ffaa66');

  // Police hat
  renderer.fillRect(cx - 5, cy - 10, 10, 3, '#2244aa');
  renderer.fillRect(cx - 2, cy - 10, 4, 2, '#fe4');

  // Eye
  renderer.fillRect(cx + 2 * dir, cy - 6, 2, 2, '#000');

  // Legs
  const legAnim = player.onFloor && Math.abs(player.vx) > 0 ? Math.sin(frameCount * 0.3) * 3 : 0;
  renderer.fillRect(cx - 4, cy + 10, 3, 5 + legAnim, '#4488ff');
  renderer.fillRect(cx + 2, cy + 10, 3, 5 - legAnim, '#4488ff');

  renderer.setGlow(null);
}

function drawCats(renderer) {
  for (let cat of cats) {
    if (cat.stunTimer > 0 && Math.floor(frameCount / 3) % 2 === 0) continue;

    const cx = cat.x + cat.w / 2;
    const cy = cat.y + cat.h / 2;
    const s = cat.isGoro ? 1.3 : 1;

    const bodyColor = cat.isGoro ? '#ff4444' : '#ff88aa';
    renderer.setGlow(bodyColor, 0.35);

    // Body
    renderer.fillRect(cx - 6 * s, cy - 2 * s, 12 * s, 10 * s, bodyColor);

    // Head
    renderer.fillCircle(cx, cy - 4 * s, 5 * s, bodyColor);

    // Ears (triangle approximations with small rects)
    // Left ear
    renderer.fillPoly([
      { x: cx - 5 * s, y: cy - 7 * s },
      { x: cx - 3 * s, y: cy - 12 * s },
      { x: cx - 1 * s, y: cy - 7 * s },
    ], bodyColor);
    // Right ear
    renderer.fillPoly([
      { x: cx + 1 * s, y: cy - 7 * s },
      { x: cx + 3 * s, y: cy - 12 * s },
      { x: cx + 5 * s, y: cy - 7 * s },
    ], bodyColor);

    // Eyes
    renderer.fillRect(cx - 3 * s, cy - 5 * s, 2 * s, 2 * s, '#ff0');
    renderer.fillRect(cx + 1 * s, cy - 5 * s, 2 * s, 2 * s, '#ff0');
    // Pupils
    renderer.fillRect(cx - 2 * s, cy - 5 * s, 1 * s, 2 * s, '#000');
    renderer.fillRect(cx + 2 * s, cy - 5 * s, 1 * s, 2 * s, '#000');

    // Tail (approximated with line segments)
    const tailWave = Math.sin(frameCount * 0.1) * 3;
    renderer.drawLine(cx + 6 * s, cy + 2 * s, cx + 9 * s, cy + (-1 + tailWave / 2) * s, bodyColor, 2);
    renderer.drawLine(cx + 9 * s, cy + (-1 + tailWave / 2) * s, cx + 12 * s, cy + tailWave * 0.3 * s, bodyColor, 2);

    if (cat.stunTimer > 0) {
      // Dizzy stars
      for (let st = 0; st < 3; st++) {
        const angle = frameCount * 0.1 + st * Math.PI * 2 / 3;
        const sx = cx + Math.cos(angle) * 8;
        const sy = cy + Math.sin(angle) * 5 - 14;
        renderer.fillRect(sx - 1, sy - 1, 3, 3, '#fe4');
      }
    }

    renderer.setGlow(null);
  }
}

// --- MAIN EXPORT ---
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    setupLevel();
    game.showOverlay('MAPPY', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        setupLevel();
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---
    frameCount++;

    // Level transition
    if (levelTransition > 0) {
      levelTransition--;
      if (levelTransition === 0) {
        level++;
        levelEl.textContent = level;
        setupLevel();
      }
      return;
    }

    // Player stun
    if (player.stunTimer > 0) {
      player.stunTimer--;
      if (player.stunTimer === 0 && player.dead) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
          game.setState('over');
          if (score > best) { best = score; bestEl.textContent = best; }
          return;
        }
        // Respawn
        player.x = W / 2 - 8;
        player.y = floorY(NUM_FLOORS - 1) - 16;
        player.vx = 0;
        player.vy = 0;
        player.onFloor = true;
        player.floorIndex = NUM_FLOORS - 1;
        player.bounceCount = 0;
        player.dead = false;
      }
      return;
    }

    // Space to open nearest door
    if (input.wasPressed(' ')) {
      openNearestDoor();
    }

    updatePlayer(input);
    updateCats();
    updateMicrowaves();
    checkItemCollection();
    checkCatCollision();
    checkLevelClear();
    updateGameData();
  };

  game.onDraw = (renderer, text) => {
    drawMansionBg(renderer);
    drawTrampolines(renderer);
    drawFloors(renderer);
    drawDoors(renderer);
    drawItems(renderer);
    drawMicrowaves(renderer);
    drawCats(renderer);
    drawPlayer(renderer);

    // Level transition flash
    if (levelTransition > 0) {
      const alpha = (levelTransition / 90 * 0.3).toFixed(2);
      renderer.fillRect(0, 0, W, H, `rgba(255,238,68,${alpha})`);
      renderer.setGlow('#fe4', 0.6);
      text.drawText('LEVEL CLEAR!', W / 2, H / 2 - 12, 24, '#fe4', 'center');
      renderer.setGlow(null);
    }

    // HUD - items remaining
    const remaining = items ? items.filter(it => !it.collected).length : 0;
    text.drawText(`Items: ${remaining}/${itemsTotal || 0}`, W - 8, H - 18, 11, '#888', 'right');
  };

  game.start();
  return game;
}
