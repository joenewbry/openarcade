// puzzle-bobble/game.js — Puzzle Bobble game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// --- Grid Constants ---
const BUBBLE_R = 15;
const BUBBLE_D = BUBBLE_R * 2;
const COLS = 12;
const COLS_ODD = COLS - 1;
const ROW_H = BUBBLE_D * 0.866;
const GRID_LEFT = (W - COLS * BUBBLE_D) / 2 + BUBBLE_R;
const GRID_TOP = BUBBLE_R + 8;
const LAUNCHER_X = W / 2;
const LAUNCHER_Y = H - 44;
const SHOOT_SPEED = 11;
const MIN_ANGLE = Math.PI * 0.06;
const MAX_ANGLE = Math.PI * 0.94;
const AIM_SPEED = 0.028;
const DANGER_Y = LAUNCHER_Y - BUBBLE_D * 3;
const PUSH_FRAMES_START = 1100;
const PUSH_FRAMES_MIN = 400;

const COLORS = ['#f44', '#4f4', '#44f', '#ff0', '#f0f', '#f80'];

// --- Module-scope state ---
let score, best, level;
let rows;
let aimAngle, currentColor, nextColor;
let flyingBubble, popAnims, fallAnims;
let pushTimer, pushFrames, canShoot;
let levelAdvanceTimer;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');

// --- Grid helpers ---
function rowCols(r) { return rows[r].shifted ? COLS_ODD : COLS; }

function cellX(r, c) {
  return GRID_LEFT + c * BUBBLE_D + (rows[r].shifted ? BUBBLE_R : 0);
}

function cellY(r) {
  return GRID_TOP + r * ROW_H;
}

function hexNeighbors(r, c) {
  const out = [];
  const shifted = rows[r].shifted;
  if (c > 0) out.push([r, c - 1]);
  if (c < rowCols(r) - 1) out.push([r, c + 1]);
  for (const dr of [-1, 1]) {
    const nr = r + dr;
    if (nr < 0 || nr >= rows.length) continue;
    const nShifted = rows[nr].shifted;
    const nCols = rows[nr].shifted ? COLS_ODD : COLS;
    if (shifted && !nShifted) {
      if (c >= 0 && c < nCols) out.push([nr, c]);
      if (c + 1 >= 0 && c + 1 < nCols) out.push([nr, c + 1]);
    } else if (!shifted && nShifted) {
      if (c - 1 >= 0 && c - 1 < nCols) out.push([nr, c - 1]);
      if (c >= 0 && c < nCols) out.push([nr, c]);
    } else {
      if (c > 0 && c - 1 < nCols) out.push([nr, c - 1]);
      if (c < nCols) out.push([nr, c]);
    }
  }
  return out;
}

function floodColor(startR, startC, color) {
  const visited = new Set();
  const k = (r, c) => r * 100 + c;
  visited.add(k(startR, startC));
  const queue = [[startR, startC]];
  const result = [[startR, startC]];
  while (queue.length) {
    const [cr, cc] = queue.shift();
    for (const [nr, nc] of hexNeighbors(cr, cc)) {
      const key = k(nr, nc);
      if (visited.has(key)) continue;
      if (nr < 0 || nr >= rows.length) continue;
      if (nc < 0 || nc >= rows[nr].cells.length) continue;
      if (rows[nr].cells[nc] !== color) continue;
      visited.add(key);
      queue.push([nr, nc]);
      result.push([nr, nc]);
    }
  }
  return result;
}

function findFloating() {
  const connected = new Set();
  const queue = [];
  const k = (r, c) => r * 100 + c;
  if (rows.length > 0) {
    for (let c = 0; c < rows[0].cells.length; c++) {
      if (rows[0].cells[c] !== null) {
        connected.add(k(0, c));
        queue.push([0, c]);
      }
    }
  }
  while (queue.length) {
    const [cr, cc] = queue.shift();
    for (const [nr, nc] of hexNeighbors(cr, cc)) {
      const key = k(nr, nc);
      if (connected.has(key)) continue;
      if (nr < 0 || nr >= rows.length) continue;
      if (nc < 0 || nc >= rows[nr].cells.length) continue;
      if (rows[nr].cells[nc] === null) continue;
      connected.add(key);
      queue.push([nr, nc]);
    }
  }
  const floating = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].cells.length; c++) {
      if (rows[r].cells[c] !== null && !connected.has(k(r, c))) {
        floating.push([r, c]);
      }
    }
  }
  return floating;
}

function gridEmpty() {
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].cells.length; c++)
      if (rows[r].cells[c] !== null) return false;
  return true;
}

function trimRows() {
  while (rows.length > 0 && rows[rows.length - 1].cells.every(v => v === null)) rows.pop();
}

function buildLevel() {
  rows = [];
  const numRows = 3 + Math.min(level, 5);
  const numColors = Math.min(2 + level, COLORS.length);
  for (let r = 0; r < numRows; r++) {
    const shifted = r % 2 === 1;
    const nc = shifted ? COLS_ODD : COLS;
    const cells = [];
    for (let c = 0; c < nc; c++) {
      cells.push(Math.floor(Math.random() * numColors));
    }
    rows.push({ shifted, cells });
  }
}

function pickColor() {
  const onGrid = new Set();
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].cells.length; c++)
      if (rows[r].cells[c] !== null) onGrid.add(rows[r].cells[c]);
  if (onGrid.size === 0) return Math.floor(Math.random() * Math.min(2 + level, COLORS.length));
  const arr = [...onGrid];
  return arr[Math.floor(Math.random() * arr.length)];
}

function pushRow() {
  const shifted = rows.length > 0 ? !rows[0].shifted : false;
  const nc = shifted ? COLS_ODD : COLS;
  const numColors = Math.min(2 + level, COLORS.length);
  const cells = [];
  for (let i = 0; i < nc; i++) cells.push(Math.floor(Math.random() * numColors));
  rows.unshift({ shifted, cells });
}

function snapToGrid(bx, by) {
  let bestR = 0, bestC = 0, bestD = Infinity;
  const maxR = Math.max(rows.length + 1, 1);
  for (let r = 0; r < maxR; r++) {
    let shifted, nc;
    if (r < rows.length) {
      shifted = rows[r].shifted;
      nc = rows[r].cells.length;
    } else {
      shifted = rows.length > 0 ? !rows[rows.length - 1].shifted : false;
      if (r > rows.length) shifted = !shifted;
      nc = shifted ? COLS_ODD : COLS;
    }
    for (let c = 0; c < nc; c++) {
      if (r < rows.length && c < rows[r].cells.length && rows[r].cells[c] !== null) continue;
      const px = GRID_LEFT + c * BUBBLE_D + (shifted ? BUBBLE_R : 0);
      const py = GRID_TOP + r * ROW_H;
      const dx = bx - px, dy = by - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestR = r; bestC = c; }
    }
  }
  return { row: bestR, col: bestC };
}

// Game ref (set in createGame)
let game;

function checkGameOver() {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].cells.length; c++) {
      if (rows[r].cells[c] !== null && cellY(r) + BUBBLE_R >= DANGER_Y) {
        doGameOver();
        return true;
      }
    }
  }
  return false;
}

function doGameOver() {
  if (score > best) { best = score; bestEl.textContent = best; }
  game.showOverlay('GAME OVER', `Score: ${score} \u2014 Press any key to restart`);
  game.setState('over');
}

function advanceLevel() {
  level++;
  levelEl.textContent = level;
  pushFrames = Math.max(PUSH_FRAMES_MIN, PUSH_FRAMES_START - (level - 1) * 80);
  score += level * 100;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
  buildLevel();
  flyingBubble = null;
  popAnims = [];
  fallAnims = [];
  pushTimer = 0;
  canShoot = true;
  levelAdvanceTimer = 0;
  currentColor = pickColor();
  nextColor = pickColor();
}

function placeBubbleAt(r, c, color) {
  rows[r].cells[c] = color;

  const cluster = floodColor(r, c, color);
  if (cluster.length >= 3) {
    for (const [mr, mc] of cluster) {
      popAnims.push({ x: cellX(mr, mc), y: cellY(mr), color: COLORS[rows[mr].cells[mc]], t: 0 });
      rows[mr].cells[mc] = null;
    }
    score += cluster.length * 10;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }

    const floaters = findFloating();
    if (floaters.length > 0) {
      for (const [fr, fc] of floaters) {
        fallAnims.push({ x: cellX(fr, fc), y: cellY(fr), vy: 0, color: COLORS[rows[fr].cells[fc]], t: 0 });
        rows[fr].cells[fc] = null;
      }
      score += floaters.length * 20;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
    }

    trimRows();

    if (gridEmpty()) {
      levelAdvanceTimer = 24; // ~400ms at 60fps
    }
  }

  if (game.state === 'playing' && !checkGameOver()) {
    pushTimer = 0;
  }

  canShoot = true;
}

function placeBubble(bx, by, color) {
  const { row, col } = snapToGrid(bx, by);

  while (rows.length <= row) {
    const prevShifted = rows.length > 0 ? rows[rows.length - 1].shifted : true;
    const shifted = !prevShifted;
    const nc = shifted ? COLS_ODD : COLS;
    rows.push({ shifted, cells: new Array(nc).fill(null) });
  }

  if (col < 0 || col >= rows[row].cells.length) { canShoot = true; return; }

  if (rows[row].cells[col] !== null) {
    const adj = hexNeighbors(row, col);
    let bestAdj = null, bestAD = Infinity;
    for (const [ar, ac] of adj) {
      while (rows.length <= ar) {
        const ps = rows.length > 0 ? rows[rows.length - 1].shifted : true;
        const s = !ps;
        rows.push({ shifted: s, cells: new Array(s ? COLS_ODD : COLS).fill(null) });
      }
      if (ac < 0 || ac >= rows[ar].cells.length) continue;
      if (rows[ar].cells[ac] !== null) continue;
      const dx = bx - cellX(ar, ac), dy = by - cellY(ar);
      const d = dx * dx + dy * dy;
      if (d < bestAD) { bestAD = d; bestAdj = [ar, ac]; }
    }
    if (!bestAdj) { canShoot = true; return; }
    return placeBubbleAt(bestAdj[0], bestAdj[1], color);
  }

  placeBubbleAt(row, col, color);
}

function shoot() {
  if (!canShoot || flyingBubble) return;
  canShoot = false;
  flyingBubble = {
    x: LAUNCHER_X,
    y: LAUNCHER_Y - BUBBLE_R - 6,
    vx: Math.cos(aimAngle) * SHOOT_SPEED,
    vy: -Math.sin(aimAngle) * SHOOT_SPEED,
    color: currentColor
  };
  currentColor = nextColor;
  nextColor = pickColor();
}

// --- Drawing helpers for bubbles ---
function drawBubble(renderer, cx, cy, colorVal, alpha) {
  const col = typeof colorVal === 'number' ? COLORS[colorVal] : colorVal;
  const r = BUBBLE_R - 1;

  if (alpha !== undefined && alpha < 1) {
    // Convert color to rgba with alpha
    const rgba = hexToRGBA(col, alpha);
    renderer.setGlow(col, 0.3 * alpha);
    renderer.fillCircle(cx, cy, r, rgba);
    // Specular highlight
    renderer.fillCircle(cx - 3, cy - 4, r * 0.35, `rgba(255,255,255,${0.25 * alpha})`);
    renderer.setGlow(null);
  } else {
    renderer.setGlow(col, 0.3);
    renderer.fillCircle(cx, cy, r, col);
    // Specular highlight
    renderer.fillCircle(cx - 3, cy - 4, r * 0.35, 'rgba(255,255,255,0.25)');
    renderer.setGlow(null);
  }
}

function hexToRGBA(hex, a) {
  if (hex.length === 4) {
    const r = parseInt(hex[1], 16) * 17;
    const g = parseInt(hex[2], 16) * 17;
    const b = parseInt(hex[3], 16) * 17;
    return `rgba(${r},${g},${b},${a})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// --- Aim guide computation ---
function computeAimGuide() {
  const dots = [];
  let sx = LAUNCHER_X, sy = LAUNCHER_Y - BUBBLE_R - 6;
  let svx = Math.cos(aimAngle) * SHOOT_SPEED;
  let svy = -Math.sin(aimAngle) * SHOOT_SPEED;

  for (let i = 0; i < 55; i++) {
    sx += svx;
    sy += svy;
    if (sx - BUBBLE_R < 0) { sx = BUBBLE_R; svx = -svx; }
    if (sx + BUBBLE_R > W) { sx = W - BUBBLE_R; svx = -svx; }
    if (sy - BUBBLE_R <= GRID_TOP) break;
    let hitGrid = false;
    for (let r = 0; r < rows.length && !hitGrid; r++) {
      for (let c = 0; c < rows[r].cells.length && !hitGrid; c++) {
        if (rows[r].cells[c] === null) continue;
        const dx = sx - cellX(r, c), dy = sy - cellY(r);
        if (dx * dx + dy * dy < BUBBLE_D * BUBBLE_D * 0.82) hitGrid = true;
      }
    }
    if (hitGrid) break;
    if (i % 3 === 0) {
      dots.push({ x: sx, y: sy });
    }
  }
  return dots;
}

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = parseInt(bestEl.textContent) || 0;
    level = 1;
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    rows = [];
    aimAngle = Math.PI / 2;
    flyingBubble = null;
    popAnims = [];
    fallAnims = [];
    pushTimer = 0;
    pushFrames = PUSH_FRAMES_START;
    canShoot = true;
    levelAdvanceTimer = 0;
    buildLevel();
    currentColor = pickColor();
    nextColor = pickColor();
    game.showOverlay('PUZZLE BOBBLE', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
        || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
        || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---

    // Level advance timer (replaces setTimeout)
    if (levelAdvanceTimer > 0) {
      levelAdvanceTimer--;
      if (levelAdvanceTimer === 0 && game.state === 'playing') {
        advanceLevel();
      }
      return;
    }

    // Aiming
    if (input.isDown('ArrowLeft')) aimAngle = Math.min(MAX_ANGLE, aimAngle + AIM_SPEED);
    if (input.isDown('ArrowRight')) aimAngle = Math.max(MIN_ANGLE, aimAngle - AIM_SPEED);

    // Shoot
    if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
      shoot();
    }

    // Flying bubble physics
    if (flyingBubble) {
      flyingBubble.x += flyingBubble.vx;
      flyingBubble.y += flyingBubble.vy;

      if (flyingBubble.x - BUBBLE_R < 0) {
        flyingBubble.x = BUBBLE_R;
        flyingBubble.vx = -flyingBubble.vx;
      }
      if (flyingBubble.x + BUBBLE_R > W) {
        flyingBubble.x = W - BUBBLE_R;
        flyingBubble.vx = -flyingBubble.vx;
      }

      if (flyingBubble.y - BUBBLE_R <= GRID_TOP) {
        placeBubble(flyingBubble.x, Math.max(flyingBubble.y, GRID_TOP), flyingBubble.color);
        flyingBubble = null;
        return;
      }

      let hit = false;
      for (let r = 0; r < rows.length && !hit; r++) {
        for (let c = 0; c < rows[r].cells.length && !hit; c++) {
          if (rows[r].cells[c] === null) continue;
          const gx = cellX(r, c), gy = cellY(r);
          const dx = flyingBubble.x - gx, dy = flyingBubble.y - gy;
          if (dx * dx + dy * dy < BUBBLE_D * BUBBLE_D * 0.82) {
            placeBubble(flyingBubble.x, flyingBubble.y, flyingBubble.color);
            flyingBubble = null;
            hit = true;
          }
        }
      }
    }

    // Pop animations
    for (let i = popAnims.length - 1; i >= 0; i--) {
      popAnims[i].t++;
      if (popAnims[i].t > 16) popAnims.splice(i, 1);
    }

    // Fall animations
    for (let i = fallAnims.length - 1; i >= 0; i--) {
      fallAnims[i].vy += 0.5;
      fallAnims[i].y += fallAnims[i].vy;
      fallAnims[i].t++;
      if (fallAnims[i].y > H + 40) fallAnims.splice(i, 1);
    }

    // Push timer
    if (!flyingBubble && canShoot && popAnims.length === 0 && fallAnims.length === 0 && !gridEmpty()) {
      pushTimer++;
      if (pushTimer >= pushFrames) {
        pushTimer = 0;
        pushRow();
        checkGameOver();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Play area background
    renderer.fillRect(0, 0, W, DANGER_Y, '#12122a');

    // Ceiling line
    renderer.drawLine(0, GRID_TOP - BUBBLE_R - 2, W, GRID_TOP - BUBBLE_R - 2, '#0f3460', 2);

    // Side walls
    renderer.drawLine(0.5, GRID_TOP - BUBBLE_R - 2, 0.5, DANGER_Y, '#0f3460', 1);
    renderer.drawLine(W - 0.5, GRID_TOP - BUBBLE_R - 2, W - 0.5, DANGER_Y, '#0f3460', 1);

    // Danger line (dashed)
    renderer.dashedLine(0, DANGER_Y, W, DANGER_Y, '#f4444440', 1, 6, 6);

    // Grid bubbles
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].cells.length; c++) {
        if (rows[r].cells[c] === null) continue;
        drawBubble(renderer, cellX(r, c), cellY(r), rows[r].cells[c]);
      }
    }

    // Pop animations
    for (const p of popAnims) {
      const prog = p.t / 16;
      const rad = BUBBLE_R * (1 + prog * 0.6);
      const alpha = 1 - prog;
      renderer.setGlow(p.color, 0.7 * alpha);
      renderer.fillCircle(p.x, p.y, rad, hexToRGBA(p.color, alpha));
      renderer.setGlow(null);
      // Particle sparkles
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 / 4) * i + prog * 3;
        const d = rad + prog * 18;
        const px = p.x + Math.cos(a) * d;
        const py = p.y + Math.sin(a) * d;
        renderer.fillCircle(px, py, 2, `rgba(255,255,255,${alpha * 0.7})`);
      }
    }

    // Fall animations
    for (const f of fallAnims) {
      drawBubble(renderer, f.x, f.y, f.color, Math.max(0, 1 - f.t / 30));
    }

    // Flying bubble
    if (flyingBubble) {
      drawBubble(renderer, flyingBubble.x, flyingBubble.y, flyingBubble.color);
    }

    // Launcher area background
    renderer.fillRect(0, DANGER_Y, W, H - DANGER_Y, '#16213e');

    // Launcher base circle
    renderer.setGlow('#8fd', 0.2);
    renderer.fillCircle(LAUNCHER_X, LAUNCHER_Y, 22, '#0f3460');
    renderer.setGlow(null);
    // Launcher ring (approximate with small circle segments)
    const ringSegs = 32;
    for (let i = 0; i < ringSegs; i++) {
      const a1 = (Math.PI * 2 / ringSegs) * i;
      const a2 = (Math.PI * 2 / ringSegs) * (i + 1);
      renderer.drawLine(
        LAUNCHER_X + Math.cos(a1) * 22, LAUNCHER_Y + Math.sin(a1) * 22,
        LAUNCHER_X + Math.cos(a2) * 22, LAUNCHER_Y + Math.sin(a2) * 22,
        '#8fd', 1.5
      );
    }

    // Aim guide dots
    const dots = computeAimGuide();
    for (const dot of dots) {
      renderer.fillCircle(dot.x, dot.y, 2, 'rgba(136,255,221,0.35)');
    }

    // Arrow tip
    const tipDist = 48;
    const tx = LAUNCHER_X + Math.cos(aimAngle) * tipDist;
    const ty = LAUNCHER_Y - Math.sin(aimAngle) * tipDist;
    const arrowAngle = -aimAngle + Math.PI / 2;
    renderer.setGlow('#8fd', 0.4);
    renderer.fillPoly([
      { x: tx + Math.cos(arrowAngle - Math.PI) * 7, y: ty + Math.sin(arrowAngle - Math.PI) * 7 },
      { x: tx + Math.cos(arrowAngle - Math.PI / 2) * 4, y: ty + Math.sin(arrowAngle - Math.PI / 2) * 4 },
      { x: tx + Math.cos(arrowAngle + Math.PI / 2) * 4, y: ty + Math.sin(arrowAngle + Math.PI / 2) * 4 },
    ], '#8fd');
    renderer.setGlow(null);

    // Current bubble on launcher
    if (currentColor !== undefined && !flyingBubble) {
      drawBubble(renderer, LAUNCHER_X, LAUNCHER_Y - BUBBLE_R - 6, currentColor);
    }

    // Next bubble
    if (nextColor !== undefined) {
      text.drawText('NEXT', LAUNCHER_X + 58, LAUNCHER_Y - 22, 10, '#666', 'center');
      drawBubble(renderer, LAUNCHER_X + 58, LAUNCHER_Y - 2, nextColor, 0.65);
    }

    // Push timer bar
    if (game.state === 'playing' && !gridEmpty()) {
      const prog = pushTimer / pushFrames;
      const bw = 90, bx = LAUNCHER_X - bw / 2, by = LAUNCHER_Y + 22;
      renderer.fillRect(bx, by, bw, 4, '#0f3460');
      const bc = prog > 0.75 ? '#f44' : '#8fd';
      renderer.setGlow(bc, 0.3);
      renderer.fillRect(bx, by, bw * prog, 4, bc);
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
