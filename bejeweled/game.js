// bejeweled/game.js — Bejeweled game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// Grid constants
const COLS = 8;
const ROWS = 8;
const CELL = W / COLS; // 60px
const GEM_RADIUS = CELL * 0.38;

// Gem types and their colors
const GEM_COLORS = [
  { fill: '#ff4444', glow: '#ff4444', name: 'ruby' },
  { fill: '#44ff44', glow: '#44ff44', name: 'emerald' },
  { fill: '#4488ff', glow: '#4488ff', name: 'sapphire' },
  { fill: '#ffff44', glow: '#ffff44', name: 'topaz' },
  { fill: '#ff44ff', glow: '#ff44ff', name: 'amethyst' },
  { fill: '#44ffff', glow: '#44ffff', name: 'diamond' },
  { fill: '#ff8844', glow: '#ff8844', name: 'amber' }
];
const NUM_TYPES = GEM_COLORS.length;

// Gem shapes
const GEM_SHAPES = ['diamond', 'circle', 'square', 'triangle', 'hexagon', 'star', 'pentagon'];

// ── State ──
let grid = [];
let cursorR = 0, cursorC = 0;
let selectedR = -1, selectedC = -1;
let mouseSelectedR = -1, mouseSelectedC = -1;
let animating = false;
let score = 0;
let best = 0;
let timeLeft = 60;
let chainMultiplier = 1;
let comboText = '';
let comboTimer = 0;
let hintTimer = 0;
let hintGems = null;
let sparkles = [];
let pendingChainProcess = false;
let chainDelay = 0;
let timerFrameCounter = 0;
let chainCheckDelay = 0; // frames to wait before checking chains after drop

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timerEl = document.getElementById('timer');

// ── Grid logic ──

function randomType() {
  return Math.floor(Math.random() * NUM_TYPES);
}

function createGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      let type;
      do {
        type = randomType();
      } while (
        (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) ||
        (r >= 2 && grid[r - 1][c] === type && grid[r - 2][c] === type)
      );
      grid[r][c] = type;
    }
  }
  if (!hasValidMove()) {
    createGrid();
  }
}

function findMatches() {
  const matched = new Set();

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      if (grid[r][c] !== -1 && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
        let len = 3;
        while (c + len < COLS && grid[r][c + len] === grid[r][c]) len++;
        for (let i = 0; i < len; i++) matched.add(r * COLS + (c + i));
      }
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      if (grid[r][c] !== -1 && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
        let len = 3;
        while (r + len < ROWS && grid[r + len][c] === grid[r][c]) len++;
        for (let i = 0; i < len; i++) matched.add((r + i) * COLS + c);
      }
    }
  }

  return matched;
}

function removeMatches(matched) {
  matched.forEach(pos => {
    const r = Math.floor(pos / COLS);
    const c = pos % COLS;
    addSparkles(c * CELL + CELL / 2, r * CELL + CELL / 2, GEM_COLORS[grid[r][c]].fill);
    grid[r][c] = -1;
  });
  return matched.size;
}

function dropGems() {
  let dropped = false;
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== -1) {
        if (writeRow !== r) {
          grid[writeRow][c] = grid[r][c];
          grid[r][c] = -1;
          dropped = true;
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      grid[r][c] = randomType();
      dropped = true;
    }
  }
  return dropped;
}

function hasValidMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) {
        swap(r, c, r, c + 1);
        if (findMatches().size > 0) { swap(r, c, r, c + 1); return true; }
        swap(r, c, r, c + 1);
      }
      if (r < ROWS - 1) {
        swap(r, c, r + 1, c);
        if (findMatches().size > 0) { swap(r, c, r + 1, c); return true; }
        swap(r, c, r + 1, c);
      }
    }
  }
  return false;
}

function findHintMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) {
        swap(r, c, r, c + 1);
        if (findMatches().size > 0) { swap(r, c, r, c + 1); return [{ r, c }, { r, c: c + 1 }]; }
        swap(r, c, r, c + 1);
      }
      if (r < ROWS - 1) {
        swap(r, c, r + 1, c);
        if (findMatches().size > 0) { swap(r, c, r + 1, c); return [{ r, c }, { r: r + 1, c }]; }
        swap(r, c, r + 1, c);
      }
    }
  }
  return null;
}

function swap(r1, c1, r2, c2) {
  const tmp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = tmp;
}

function isAdjacent(r1, c1, r2, c2) {
  return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
}

function reshuffleBoard() {
  const flat = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      flat.push(grid[r][c]);
    }
  }
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = flat[idx++];
    }
  }
  if (findMatches().size > 0 || !hasValidMove()) {
    createGrid();
  }
  comboText = 'RESHUFFLE!';
  comboTimer = 90;
}

// ── Sparkle particles ──

function addSparkles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    sparkles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.1;
    s.life--;
    if (s.life <= 0) sparkles.splice(i, 1);
  }
}

// ── Chain processing ──

function processChains(game) {
  const matched = findMatches();
  if (matched.size > 0) {
    const count = removeMatches(matched);
    const points = count * 10 * chainMultiplier;
    score += points;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    if (chainMultiplier > 1) {
      comboText = `${chainMultiplier}x CHAIN! +${points}`;
    } else {
      comboText = `+${points}`;
    }
    comboTimer = 60;
    chainMultiplier++;
    chainDelay = 12;
    pendingChainProcess = true;
  } else {
    chainMultiplier = 1;
    animating = false;
    pendingChainProcess = false;
    chainCheckDelay = 0;
    if (!hasValidMove()) {
      reshuffleBoard();
    }
    hintTimer = 0;
    hintGems = null;
  }
}

function trySwap(r1, c1, r2, c2, game) {
  if (animating) return;
  if (!isAdjacent(r1, c1, r2, c2)) return;

  animating = true;
  chainMultiplier = 1;
  hintGems = null;
  hintTimer = 0;

  swap(r1, c1, r2, c2);

  const matched = findMatches();
  if (matched.size === 0) {
    swap(r1, c1, r2, c2);
    animating = false;
    comboText = 'No match!';
    comboTimer = 40;
    return;
  }

  processChains(game);
}

// ── Gem shape drawing helpers (return polygon points) ──

function getDiamondPoints(cx, cy, radius) {
  return [
    { x: cx, y: cy - radius },
    { x: cx + radius * 0.7, y: cy },
    { x: cx, y: cy + radius },
    { x: cx - radius * 0.7, y: cy }
  ];
}

function getDiamondHighlight(cx, cy, radius) {
  return [
    { x: cx, y: cy - radius * 0.5 },
    { x: cx + radius * 0.35, y: cy },
    { x: cx, y: cy + radius * 0.3 },
    { x: cx - radius * 0.35, y: cy }
  ];
}

function getTrianglePoints(cx, cy, radius) {
  return [
    { x: cx, y: cy - radius },
    { x: cx + radius * 0.9, y: cy + radius * 0.7 },
    { x: cx - radius * 0.9, y: cy + radius * 0.7 }
  ];
}

function getTriangleHighlight(cx, cy, radius) {
  return [
    { x: cx, y: cy - radius * 0.35 },
    { x: cx + radius * 0.35, y: cy + radius * 0.3 },
    { x: cx - radius * 0.35, y: cy + radius * 0.3 }
  ];
}

function getRegularPolygonPoints(cx, cy, radius, sides, rotationOffset) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i + rotationOffset;
    pts.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  return pts;
}

function getStarPoints(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    pts.push({ x: cx + radius * Math.cos(outerAngle), y: cy + radius * Math.sin(outerAngle) });
    pts.push({ x: cx + radius * 0.45 * Math.cos(innerAngle), y: cy + radius * 0.45 * Math.sin(innerAngle) });
  }
  return pts;
}

// Rotated square points (diamond-rotated square)
function getRotatedSquarePoints(cx, cy, radius) {
  const s = radius * 0.8;
  const cos45 = Math.cos(Math.PI / 4);
  const sin45 = Math.sin(Math.PI / 4);
  const corners = [
    { x: -s, y: -s },
    { x: s, y: -s },
    { x: s, y: s },
    { x: -s, y: s }
  ];
  return corners.map(p => ({
    x: cx + p.x * cos45 - p.y * sin45,
    y: cy + p.x * sin45 + p.y * cos45
  }));
}

function getRotatedSquareHighlight(cx, cy, radius) {
  const s = radius * 0.8 * 0.5;
  const cos45 = Math.cos(Math.PI / 4);
  const sin45 = Math.sin(Math.PI / 4);
  const corners = [
    { x: -s, y: -s },
    { x: s, y: -s },
    { x: s, y: s },
    { x: -s, y: s }
  ];
  return corners.map(p => ({
    x: cx + p.x * cos45 - p.y * sin45,
    y: cy + p.x * sin45 + p.y * cos45
  }));
}

// ── Mouse click handling ──

let canvasEl = null;

function handleCanvasClick(e, game) {
  if (game.state !== 'playing' || animating) return;

  const rect = canvasEl.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const cx = mx * scaleX;
  const cy = my * scaleY;

  const clickC = Math.floor(cx / CELL);
  const clickR = Math.floor(cy / CELL);

  if (clickR < 0 || clickR >= ROWS || clickC < 0 || clickC >= COLS) return;

  hintTimer = 0;
  hintGems = null;

  if (mouseSelectedR === -1) {
    mouseSelectedR = clickR;
    mouseSelectedC = clickC;
    selectedR = -1;
    selectedC = -1;
  } else {
    if (mouseSelectedR === clickR && mouseSelectedC === clickC) {
      mouseSelectedR = -1;
      mouseSelectedC = -1;
    } else if (isAdjacent(mouseSelectedR, mouseSelectedC, clickR, clickC)) {
      trySwap(mouseSelectedR, mouseSelectedC, clickR, clickC, game);
      mouseSelectedR = -1;
      mouseSelectedC = -1;
    } else {
      mouseSelectedR = clickR;
      mouseSelectedC = clickC;
    }
  }
}

// ── Draw gem shape using renderer ──

function drawGem(renderer, cx, cy, radius, shapeIdx, color) {
  const shape = GEM_SHAPES[shapeIdx];

  switch (shape) {
    case 'diamond': {
      renderer.fillPoly(getDiamondPoints(cx, cy, radius), color);
      renderer.fillPoly(getDiamondHighlight(cx, cy, radius), 'rgba(255,255,255,0.2)');
      break;
    }
    case 'circle': {
      renderer.fillCircle(cx, cy, radius, color);
      renderer.fillCircle(cx - radius * 0.2, cy - radius * 0.2, radius * 0.4, 'rgba(255,255,255,0.25)');
      break;
    }
    case 'square': {
      renderer.fillPoly(getRotatedSquarePoints(cx, cy, radius), color);
      renderer.fillPoly(getRotatedSquareHighlight(cx, cy, radius), 'rgba(255,255,255,0.2)');
      break;
    }
    case 'triangle': {
      renderer.fillPoly(getTrianglePoints(cx, cy, radius), color);
      renderer.fillPoly(getTriangleHighlight(cx, cy, radius), 'rgba(255,255,255,0.2)');
      break;
    }
    case 'hexagon': {
      const pts = getRegularPolygonPoints(cx, cy, radius, 6, -Math.PI / 6);
      renderer.fillPoly(pts, color);
      const inner = getRegularPolygonPoints(cx, cy, radius * 0.5, 6, -Math.PI / 6);
      renderer.fillPoly(inner, 'rgba(255,255,255,0.2)');
      break;
    }
    case 'star': {
      const pts = getStarPoints(cx, cy, radius);
      renderer.fillPoly(pts, color);
      renderer.fillCircle(cx, cy, radius * 0.25, 'rgba(255,255,255,0.2)');
      break;
    }
    case 'pentagon': {
      const pts = getRegularPolygonPoints(cx, cy, radius, 5, -Math.PI / 2);
      renderer.fillPoly(pts, color);
      const inner = getRegularPolygonPoints(cx, cy, radius * 0.5, 5, -Math.PI / 2);
      renderer.fillPoly(inner, 'rgba(255,255,255,0.2)');
      break;
    }
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  canvasEl = document.getElementById('game');

  // Set up mouse click handler
  canvasEl.addEventListener('click', (e) => handleCanvasClick(e, game));

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    timeLeft = 60;
    timerEl.textContent = '60';
    cursorR = 0;
    cursorC = 0;
    selectedR = -1;
    selectedC = -1;
    mouseSelectedR = -1;
    mouseSelectedC = -1;
    animating = false;
    pendingChainProcess = false;
    chainDelay = 0;
    chainCheckDelay = 0;
    chainMultiplier = 1;
    comboText = '';
    comboTimer = 0;
    hintTimer = 0;
    hintGems = null;
    sparkles = [];
    timerFrameCounter = 0;
    createGrid();
    game.showOverlay('BEJEWELED', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    // ── Over state ──
    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Timer: count 60 frames = 1 second
    timerFrameCounter++;
    if (timerFrameCounter >= 60) {
      timerFrameCounter = 0;
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        // Game over
        game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        game.setState('over');
        return;
      }
    }

    // Combo text timer
    if (comboTimer > 0) comboTimer--;

    // Sparkles
    updateSparkles();

    // Chain processing delay
    if (pendingChainProcess) {
      chainDelay--;
      if (chainDelay <= 0) {
        dropGems();
        pendingChainProcess = false;
        // Wait ~9 frames (150ms at 60fps) before checking for more matches
        chainCheckDelay = 9;
      }
      return;
    }

    // Chain check delay (replaces the setTimeout)
    if (chainCheckDelay > 0) {
      chainCheckDelay--;
      if (chainCheckDelay <= 0) {
        processChains(game);
      }
      return;
    }

    // Keyboard input
    if (!animating) {
      if (input.wasPressed('ArrowUp')) {
        cursorR = Math.max(0, cursorR - 1);
        hintTimer = 0; hintGems = null;
      }
      if (input.wasPressed('ArrowDown')) {
        cursorR = Math.min(ROWS - 1, cursorR + 1);
        hintTimer = 0; hintGems = null;
      }
      if (input.wasPressed('ArrowLeft')) {
        cursorC = Math.max(0, cursorC - 1);
        hintTimer = 0; hintGems = null;
      }
      if (input.wasPressed('ArrowRight')) {
        cursorC = Math.min(COLS - 1, cursorC + 1);
        hintTimer = 0; hintGems = null;
      }
      if (input.wasPressed(' ')) {
        if (selectedR === -1) {
          selectedR = cursorR;
          selectedC = cursorC;
          mouseSelectedR = -1;
          mouseSelectedC = -1;
        } else {
          if (cursorR === selectedR && cursorC === selectedC) {
            selectedR = -1;
            selectedC = -1;
          } else {
            trySwap(selectedR, selectedC, cursorR, cursorC, game);
            selectedR = -1;
            selectedC = -1;
          }
        }
        hintTimer = 0; hintGems = null;
      }
    }

    // Hint system
    if (!animating) {
      hintTimer++;
      if (hintTimer > 300 && !hintGems) {
        hintGems = findHintMove();
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Grid lines
    for (let r = 0; r <= ROWS; r++) {
      renderer.drawLine(0, r * CELL, W, r * CELL, '#16213e', 1);
    }
    for (let c = 0; c <= COLS; c++) {
      renderer.drawLine(c * CELL, 0, c * CELL, H, '#16213e', 1);
    }

    // Draw gems
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r] === undefined || grid[r][c] === -1) continue;

        const gemType = grid[r][c];
        if (gemType < 0 || gemType >= GEM_COLORS.length) continue;
        const gem = GEM_COLORS[gemType];
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;

        // Hint glow
        const isHint = hintGems && (
          (hintGems[0].r === r && hintGems[0].c === c) ||
          (hintGems[1].r === r && hintGems[1].c === c)
        );
        if (isHint) {
          const pulse = 0.3 + 0.3 * Math.sin(performance.now() / 300);
          renderer.setGlow('#fff', pulse);
        }

        // Selection highlight
        const isSelected = (selectedR === r && selectedC === c) || (mouseSelectedR === r && mouseSelectedC === c);
        if (isSelected) {
          renderer.setGlow('#fff', 0.8);
          renderer.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4, 'rgba(255,255,255,0.15)');
        }

        // Gem glow
        if (!isHint && !isSelected) {
          renderer.setGlow(gem.glow, 0.4);
        } else if (isSelected) {
          renderer.setGlow(gem.glow, 0.7);
        }

        drawGem(renderer, cx, cy, GEM_RADIUS, gemType, gem.fill);

        renderer.setGlow(null);
      }
    }

    // Cursor (keyboard)
    if (game.state === 'playing') {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      const alpha = 0.5 + 0.5 * pulse;
      // Use r,g,b with alpha for the cursor color
      const cursorColor = `rgba(255, 136, 170, ${alpha})`;
      renderer.setGlow('#f8a', 0.4 * pulse);
      // Draw cursor as 4 lines forming a rect outline
      const cx = cursorC * CELL + 3;
      const cy = cursorR * CELL + 3;
      const cw = CELL - 6;
      const ch = CELL - 6;
      renderer.drawLine(cx, cy, cx + cw, cy, cursorColor, 3);
      renderer.drawLine(cx + cw, cy, cx + cw, cy + ch, cursorColor, 3);
      renderer.drawLine(cx + cw, cy + ch, cx, cy + ch, cursorColor, 3);
      renderer.drawLine(cx, cy + ch, cx, cy, cursorColor, 3);
      renderer.setGlow(null);
    }

    // Sparkle particles
    for (const s of sparkles) {
      const alpha = s.life / s.maxLife;
      // Approximate alpha by mixing color toward background
      renderer.setGlow(s.color, 0.3 * alpha);
      renderer.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size, s.color);
    }
    renderer.setGlow(null);

    // Combo text
    if (comboTimer > 0 && comboText) {
      const alpha = Math.min(1, comboTimer / 20);
      // Approximate alpha with glow intensity
      renderer.setGlow('#f8a', 0.6 * alpha);
      text.drawText(comboText, W / 2, H / 2 - 14, 28, '#f8a', 'center');
      renderer.setGlow(null);
    }

    // Timer bar at bottom
    if (game.state === 'playing') {
      const barWidth = (timeLeft / 60) * W;
      const timerColor = timeLeft > 15 ? '#f8a' : (timeLeft > 5 ? '#f80' : '#f44');
      renderer.fillRect(0, H - 6, W, 6, 'rgba(255,136,170,0.1)');
      renderer.setGlow(timerColor, 0.4);
      renderer.fillRect(0, H - 6, barWidth, 6, timerColor);
      renderer.setGlow(null);
    }
  };

  // Expose game data for ML
  window.gameData = {
    get grid() { return grid; },
    get cursorR() { return cursorR; },
    get cursorC() { return cursorC; },
    get selectedR() { return selectedR; },
    get selectedC() { return selectedC; },
    get timeLeft() { return timeLeft; },
    get chainMultiplier() { return chainMultiplier; }
  };

  game.start();
  return game;
}
