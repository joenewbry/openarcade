// crossy-road/game.js — Crossy Road game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 600;

// Grid constants
const ROW_H = 40;
const COLS = Math.floor(W / ROW_H);
const COL_W = W / COLS;
const VISIBLE_ROWS = Math.ceil(H / ROW_H) + 2;

// Row types
const GRASS = 'grass';
const ROAD = 'road';
const RIVER = 'river';

// Player constants
const PLAYER_SIZE = 28;

// ── State ──
let score, best = 0;
let player, rows, cameraY, furthestRow;
let hopAnim, hopFrom, hopTo, hopProgress;
let idleTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Seeded hash for deterministic row generation ──
function hashRow(rowIndex) {
  let h = rowIndex * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  return (h >>> 16) ^ h;
}

// ── Row generation ──
function generateDecorations(rowIndex) {
  const decos = [];
  const h = hashRow(rowIndex * 7 + 3);
  const count = (h % 4);
  for (let i = 0; i < count; i++) {
    const dh = hashRow(rowIndex * 13 + i * 37);
    const col = dh % COLS;
    const type = (dh >> 8) % 3; // 0=bush, 1=rock, 2=flower
    decos.push({ col, type });
  }
  return decos;
}

function generateRoadRow(rowIndex, difficulty) {
  const h = hashRow(rowIndex * 11 + 5);
  const dir = (h % 2 === 0) ? 1 : -1;
  const baseSpeed = 1 + difficulty * 2.5;
  const speed = baseSpeed * (0.7 + ((h >> 4) % 100) / 200);
  const carCount = 1 + Math.floor(difficulty * 2) + ((h >> 8) % 2);
  const cars = [];
  const totalWidth = W + 400;
  for (let i = 0; i < carCount; i++) {
    const ch = hashRow(rowIndex * 23 + i * 41);
    const carW = 40 + (ch % 3) * 15;
    const colorIdx = (ch >> 4) % 5;
    const colors = ['#e44', '#4ae', '#ea4', '#e4a', '#4ea'];
    const x = (i * (totalWidth / carCount)) + ((ch >> 8) % 40) - 200;
    cars.push({ x, w: carW, color: colors[colorIdx] });
  }
  return { type: ROAD, index: rowIndex, dir, speed, cars };
}

function generateRiverRow(rowIndex, difficulty) {
  const h = hashRow(rowIndex * 17 + 7);
  const dir = (h % 2 === 0) ? 1 : -1;
  const baseSpeed = 0.8 + difficulty * 1.5;
  const speed = baseSpeed * (0.6 + ((h >> 4) % 100) / 200);
  const logCount = 3 - Math.floor(difficulty * 1.5);
  const finalCount = Math.max(1, logCount + ((h >> 8) % 2));
  const logs = [];
  const totalWidth = W + 300;
  for (let i = 0; i < finalCount; i++) {
    const lh = hashRow(rowIndex * 29 + i * 53);
    const logW = 80 + (lh % 4) * 20 - Math.floor(difficulty * 30);
    const finalW = Math.max(50, logW);
    const x = (i * (totalWidth / finalCount)) + ((lh >> 8) % 30) - 150;
    logs.push({ x, w: finalW });
  }
  return { type: RIVER, index: rowIndex, dir, speed, logs };
}

function generateRow(rowIndex) {
  if (rowIndex <= 2) {
    return { type: GRASS, index: rowIndex, decorations: generateDecorations(rowIndex) };
  }
  const difficulty = Math.min(rowIndex / 80, 1);
  const rand = (hashRow(rowIndex) % 1000) / 1000;
  let type;
  if (rand < 0.35) {
    type = GRASS;
  } else if (rand < 0.70) {
    type = ROAD;
  } else {
    type = RIVER;
  }
  if (type === ROAD) return generateRoadRow(rowIndex, difficulty);
  if (type === RIVER) return generateRiverRow(rowIndex, difficulty);
  return { type: GRASS, index: rowIndex, decorations: generateDecorations(rowIndex) };
}

function getRow(rowIndex) {
  if (!rows[rowIndex]) {
    rows[rowIndex] = generateRow(rowIndex);
  }
  return rows[rowIndex];
}

// ── Ellipse approximation using polygon ──
function fillEllipse(renderer, cx, cy, rx, ry, color) {
  const segs = 16;
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  renderer.fillPoly(pts, color);
}

// ── Player screen position (with hop animation) ──
function getPlayerScreenPos() {
  const baseX = player.col * COL_W + COL_W / 2;
  const baseY = H - ROW_H - (player.row * ROW_H) + cameraY;
  if (hopAnim) {
    const fromX = hopFrom.col * COL_W + COL_W / 2;
    const fromY = H - ROW_H - (hopFrom.row * ROW_H) + cameraY;
    const toX = hopTo.col * COL_W + COL_W / 2;
    const toY = H - ROW_H - (hopTo.row * ROW_H) + cameraY;
    const t = hopProgress;
    const eased = t * t * (3 - 2 * t);
    const x = fromX + (toX - fromX) * eased;
    const y = fromY + (toY - fromY) * eased;
    const arcHeight = -15 * Math.sin(t * Math.PI);
    return { x, y: y + arcHeight };
  }
  return { x: baseX, y: baseY };
}

// ── Hop logic ──
function tryHop(dCol, dRow) {
  if (hopAnim) return;
  const newCol = player.col + dCol;
  const newRow = player.row + dRow;
  if (newCol < 0 || newCol >= COLS) return;
  if (newRow < 0) return;
  const destRow = getRow(newRow);
  if (destRow.type === GRASS) {
    const blocked = destRow.decorations.some(d => d.col === newCol && (d.type === 0 || d.type === 1));
    if (blocked) return;
  }
  hopAnim = true;
  hopFrom = { col: player.col, row: player.row };
  hopTo = { col: newCol, row: newRow };
  hopProgress = 0;
  idleTimer = 0;
}

// ── Drawing helpers ──
function drawGrassRow(renderer, text, row, screenY) {
  const shade = row.index % 2 === 0 ? '#1a3a1a' : '#1e3e1e';
  renderer.fillRect(0, screenY, W, ROW_H, shade);

  // Grass texture lines as tiny rects
  for (let i = 0; i < COLS; i++) {
    const h = hashRow(row.index * 100 + i);
    if (h % 3 === 0) {
      const x = i * COL_W + (h % 20);
      renderer.fillRect(x, screenY + ROW_H - 8 - (h % 6), 1, 8 + (h % 6), 'rgba(40, 120, 40, 0.15)');
    }
  }

  // Decorations
  row.decorations.forEach(d => {
    const dx = d.col * COL_W + COL_W / 2;
    const dy = screenY + ROW_H / 2;
    if (d.type === 0) {
      // Bush
      renderer.setGlow('#2a6a2a', 0.3);
      renderer.fillCircle(dx, dy, 12, '#2a6a2a');
      renderer.fillCircle(dx - 4, dy - 3, 8, '#3a8a3a');
      renderer.setGlow(null);
    } else if (d.type === 1) {
      // Rock (ellipse → flattened polygon)
      fillEllipse(renderer, dx, dy + 2, 10, 8, '#555');
      fillEllipse(renderer, dx - 2, dy, 7, 5, '#666');
    } else {
      // Flower
      renderer.fillRect(dx - 1, dy, 2, 10, '#4a4');
      const fh = hashRow(row.index * 200 + d.col);
      const flowerColor = ['#f4a', '#fa4', '#a4f', '#4af'][fh % 4];
      renderer.fillCircle(dx, dy, 4, flowerColor);
    }
  });
}

function drawRoadRow(renderer, text, row, screenY) {
  renderer.fillRect(0, screenY, W, ROW_H, '#2a2a3e');

  // Road markings (dashed center line)
  renderer.dashedLine(0, screenY + ROW_H / 2, W, screenY + ROW_H / 2, '#555', 2, 12, 8);

  // Edge lines
  renderer.drawLine(0, screenY, W, screenY, '#444', 1);
  renderer.drawLine(0, screenY + ROW_H, W, screenY + ROW_H, '#444', 1);

  // Cars
  row.cars.forEach(car => {
    const carH = ROW_H - 10;
    const carY = screenY + 5;

    // Car body with glow
    renderer.setGlow(car.color, 0.5);
    renderer.fillRect(car.x, carY, car.w, carH, car.color);
    renderer.setGlow(null);

    // Car roof (darker)
    renderer.fillRect(car.x + car.w * 0.2, carY + 2, car.w * 0.6, carH * 0.4, 'rgba(0,0,0,0.25)');

    // Headlights
    if (row.dir > 0) {
      renderer.fillRect(car.x + car.w - 4, carY + 3, 3, 4, '#ff8');
      renderer.fillRect(car.x + car.w - 4, carY + carH - 7, 3, 4, '#ff8');
    } else {
      renderer.fillRect(car.x + 1, carY + 3, 3, 4, '#ff8');
      renderer.fillRect(car.x + 1, carY + carH - 7, 3, 4, '#ff8');
    }

    // Taillights
    if (row.dir > 0) {
      renderer.fillRect(car.x + 1, carY + 3, 3, 4, '#f22');
      renderer.fillRect(car.x + 1, carY + carH - 7, 3, 4, '#f22');
    } else {
      renderer.fillRect(car.x + car.w - 4, carY + 3, 3, 4, '#f22');
      renderer.fillRect(car.x + car.w - 4, carY + carH - 7, 3, 4, '#f22');
    }
  });
}

function drawRiverRow(renderer, text, row, screenY) {
  // Water background
  renderer.fillRect(0, screenY, W, ROW_H, '#0a2a4e');

  // Water ripples as small horizontal lines
  for (let i = 0; i < 5; i++) {
    const rx = (hashRow(row.index * 50 + i) % W);
    const ry = screenY + 10 + (i * 7);
    renderer.drawLine(rx, ry, rx + 20, ry, 'rgba(40, 120, 200, 0.2)', 1);
  }

  // Logs
  row.logs.forEach(log => {
    const logH = ROW_H - 8;
    const logY = screenY + 4;

    // Log body with glow
    renderer.setGlow('#6a4a2a', 0.3);
    renderer.fillRect(log.x, logY, log.w, logH, '#6a4a2a');
    renderer.setGlow(null);

    // Log texture (horizontal lines)
    for (let i = 0; i < 3; i++) {
      const ly = logY + 6 + i * 8;
      renderer.drawLine(log.x + 3, ly, log.x + log.w - 3, ly, '#5a3a1a', 1);
    }

    // Log ends (circles)
    renderer.fillCircle(log.x + 5, logY + logH / 2, 5, '#7a5a3a');
    renderer.fillCircle(log.x + log.w - 5, logY + logH / 2, 5, '#7a5a3a');
  });
}

function drawPlayer(renderer, x, y) {
  const s = PLAYER_SIZE;
  const cx = x;
  const cy = y + ROW_H / 2;

  // Shadow under the chicken
  fillEllipse(renderer, cx, cy + s / 2 - 2, s / 2.5, 4, 'rgba(0, 0, 0, 0.3)');

  // Body with glow
  renderer.setGlow('#fc4', 0.7);
  fillEllipse(renderer, cx, cy, s / 2.5, s / 2.2, '#fc4');
  renderer.setGlow(null);

  // Head
  renderer.fillCircle(cx, cy - s / 2.5, s / 4, '#fda');

  // Eyes
  renderer.fillCircle(cx - 3, cy - s / 2.5 - 1, 2, '#111');
  renderer.fillCircle(cx + 3, cy - s / 2.5 - 1, 2, '#111');

  // Beak (triangle)
  renderer.fillPoly([
    { x: cx - 3, y: cy - s / 2.5 + 3 },
    { x: cx, y: cy - s / 2.5 + 7 },
    { x: cx + 3, y: cy - s / 2.5 + 3 },
  ], '#f80');

  // Comb (red on top of head)
  renderer.fillCircle(cx - 2, cy - s / 2.5 - s / 4 - 1, 3, '#e33');
  renderer.fillCircle(cx + 2, cy - s / 2.5 - s / 4 + 1, 2.5, '#e33');

  // Feet
  renderer.fillRect(cx - 6, cy + s / 2.2 - 3, 3, 5, '#f80');
  renderer.fillRect(cx + 3, cy + s / 2.2 - 3, 3, 5, '#f80');
}

// ── Main export ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    player = { col: Math.floor(COLS / 2), row: 0 };
    rows = {};
    cameraY = 0;
    furthestRow = 0;
    hopAnim = false;
    hopProgress = 0;
    idleTimer = 0;

    // Pre-generate visible rows
    for (let i = -2; i < VISIBLE_ROWS + 5; i++) {
      getRow(i);
    }

    game.showOverlay('CROSSY ROAD', 'Press any arrow key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        // Process the first key as a hop
        if (input.wasPressed('ArrowUp')) tryHop(0, 1);
        else if (input.wasPressed('ArrowDown')) tryHop(0, -1);
        else if (input.wasPressed('ArrowLeft')) tryHop(-1, 0);
        else if (input.wasPressed('ArrowRight')) tryHop(1, 0);
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Handle input for hops
    if (input.wasPressed('ArrowUp')) tryHop(0, 1);
    if (input.wasPressed('ArrowDown')) tryHop(0, -1);
    if (input.wasPressed('ArrowLeft')) tryHop(-1, 0);
    if (input.wasPressed('ArrowRight')) tryHop(1, 0);

    // Update hop animation
    if (hopAnim) {
      hopProgress += 0.15;
      if (hopProgress >= 1) {
        hopProgress = 1;
        hopAnim = false;
        player.col = hopTo.col;
        player.row = hopTo.row;
        if (player.row > furthestRow) {
          furthestRow = player.row;
          score = furthestRow;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }
        }
      }
    }

    // Scroll camera to follow player
    const targetCameraY = Math.max(0, (player.row - 4) * ROW_H);
    cameraY += (targetCameraY - cameraY) * 0.1;

    // Pre-generate rows ahead
    for (let i = player.row - 2; i < player.row + VISIBLE_ROWS + 5; i++) {
      getRow(i);
    }

    // Update moving objects
    const minRow = Math.floor(cameraY / ROW_H) - 2;
    const maxRow = minRow + VISIBLE_ROWS + 6;
    for (let ri = minRow; ri <= maxRow; ri++) {
      const row = getRow(ri);
      if (row.type === ROAD) {
        row.cars.forEach(car => {
          car.x += row.speed * row.dir;
          if (row.dir > 0 && car.x > W + 100) car.x = -car.w - 50;
          if (row.dir < 0 && car.x + car.w < -100) car.x = W + 50;
        });
      } else if (row.type === RIVER) {
        row.logs.forEach(log => {
          log.x += row.speed * row.dir;
          if (row.dir > 0 && log.x > W + 100) log.x = -log.w - 50;
          if (row.dir < 0 && log.x + log.w < -100) log.x = W + 50;
        });
      }
    }

    // Player interactions (only when not mid-hop)
    if (!hopAnim) {
      const currentRow = getRow(player.row);
      const px = player.col * COL_W + COL_W / 2;

      // On a river row: check if on a log
      if (currentRow.type === RIVER) {
        let onLog = false;
        currentRow.logs.forEach(log => {
          if (px >= log.x && px <= log.x + log.w) {
            onLog = true;
            const newPx = px + currentRow.speed * currentRow.dir;
            player.col = Math.round((newPx - COL_W / 2) / COL_W);
          }
        });
        if (!onLog) { die(); return; }
        if (player.col < 0 || player.col >= COLS) { die(); return; }
      }

      // On a road row: check for car collision
      if (currentRow.type === ROAD) {
        const playerLeft = px - PLAYER_SIZE / 2;
        const playerRight = px + PLAYER_SIZE / 2;
        for (const car of currentRow.cars) {
          if (playerRight > car.x + 4 && playerLeft < car.x + car.w - 4) {
            die(); return;
          }
        }
      }

      // Idle timeout
      idleTimer++;
      const playerScreenY = H - ROW_H - (player.row * ROW_H) + cameraY;
      if (playerScreenY > H + ROW_H) { die(); return; }
    }

    // Slowly push camera forward to create urgency
    if (furthestRow > 5) {
      const pushSpeed = 0.15 + Math.min(furthestRow / 200, 0.3);
      const minCamera = (furthestRow - 10) * ROW_H;
      if (cameraY < minCamera) {
        cameraY += pushSpeed;
      }
    }
  };

  function die() {
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    // Determine visible row range
    const minRow = Math.floor(cameraY / ROW_H) - 2;
    const maxRow = minRow + VISIBLE_ROWS + 4;

    // Draw rows from back to front
    for (let ri = maxRow; ri >= minRow; ri--) {
      const row = getRow(ri);
      const screenY = H - ROW_H - (ri * ROW_H) + cameraY;
      if (screenY > H + ROW_H || screenY < -ROW_H * 2) continue;

      if (row.type === GRASS) drawGrassRow(renderer, text, row, screenY);
      else if (row.type === ROAD) drawRoadRow(renderer, text, row, screenY);
      else if (row.type === RIVER) drawRiverRow(renderer, text, row, screenY);
    }

    // Draw player
    const pPos = getPlayerScreenPos();
    drawPlayer(renderer, pPos.x, pPos.y);

    // Score display (subtle, on the canvas)
    text.drawText(`${score}`, W / 2, 10, 32, 'rgba(255, 204, 68, 0.3)', 'center');
  };

  game.start();
  return game;
}
