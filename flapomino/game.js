// flapomino/game.js — Flapomino (Flappy Bird × Tetris) WebGL v2

import { Game } from '../engine/core.js';

const W = 320;
const H = 480;
const CELL = 20;
const COLS = W / CELL;  // 16

// Bird
const BIRD_W = 22;
const BIRD_H = 16;
const GRAVITY = 0.28;
const FLAP_VY = -5.5;

// Obstacles
const OBS_SPEED_BASE = 2.5;
const OBS_INTERVAL  = 90;   // frames between spawns
const OBS_WIDTH = CELL * 3; // 3 columns wide
const GAP_MIN = 90;         // minimum gap height in obstacle

// Stack
const STACK_ROWS = H / CELL;  // 24 rows
const COLOR_POOL = ['#f80','#0ff','#ff0','#a0f','#0f0','#f44','#4af'];

// DOM refs
const scoreEl       = document.getElementById('score');
const stackHeightEl = document.getElementById('stackHeight');

let bird;
let obstacles;   // { x, topH, botY, color, counted }
let stack;       // STACK_ROWS × COLS of null|color (bottom-pinned)
let stackTop;    // how many rows the stack occupies (from bottom)
let score;
let obsTimer;
let obsSpeed;
let obsCount;

function emptyStack() {
  return Array.from({ length: STACK_ROWS }, () => new Array(COLS).fill(null));
}

// Random tetromino silhouette as column-height array (COLS entries)
// Returns obstacle = top wall heights and bottom start
function makeObstacle(x) {
  // Pick a random tetromino and project it into 3 columns
  const shapes = [
    [3, 1, 3],   // T upright
    [3, 3, 3],   // flat
    [3, 2, 3],   // slight dip
    [2, 3, 3],   // left low
    [3, 3, 2],   // right low
    [2, 2, 3],   // left block
    [3, 2, 2],   // right block
  ];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const topHeights = shape.map(h => h * CELL);  // 40-60px top walls

  // Guaranteed gap: bottom wall starts at topH + GAP_MIN
  const botStart = topHeights.map(th => th + GAP_MIN + Math.random() * 30);

  return {
    x,
    topH: topHeights,
    botY: botStart,
    color: COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
    counted: false,
    landed: false,
  };
}

function landObstacle(obs) {
  // Convert obstacle into stack cells
  const col0 = Math.round(obs.x / CELL);
  for (let dc = 0; dc < 3; dc++) {
    const col = col0 + dc;
    if (col < 0 || col >= COLS) continue;
    // Top block spans 0..topH[dc]
    const topRows = Math.ceil(obs.topH[dc] / CELL);
    for (let r = 0; r < topRows && r < STACK_ROWS; r++) {
      if (!stack[r][col]) stack[r][col] = obs.color;
    }
    // Bottom block spans botY[dc]..H
    const botStartRow = Math.floor(obs.botY[dc] / CELL);
    for (let r = botStartRow; r < STACK_ROWS; r++) {
      if (!stack[r][col]) stack[r][col] = obs.color;
    }
  }
  // Clear full rows
  let cleared = 0;
  for (let r = STACK_ROWS - 1; r >= 0; r--) {
    if (stack[r].every(c => c !== null)) {
      stack.splice(r, 1);
      stack.unshift(new Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared > 0) score += cleared * 50;

  // Compute stack top
  updateStackTop();
}

function updateStackTop() {
  stackTop = 0;
  for (let r = 0; r < STACK_ROWS; r++) {
    if (stack[r].some(c => c !== null)) {
      stackTop = STACK_ROWS - r;
      break;
    }
  }
  stackHeightEl.textContent = stackTop;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    bird = { x: 60, y: H / 2, vy: 0 };
    obstacles = [];
    stack = emptyStack();
    stackTop = 0;
    score = 0; obsTimer = 0; obsSpeed = OBS_SPEED_BASE; obsCount = 0;
    scoreEl.textContent = '0';
    stackHeightEl.textContent = '0';
    game.showOverlay('FLAPOMINO', 'Press SPACE, UP, or Click to flap');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  let clicked = false;
  game.canvas.addEventListener('click', () => { clicked = true; });

  game.onUpdate = () => {
    const input = game.input;
    const flap = input.wasPressed(' ') || input.wasPressed('ArrowUp') || clicked;
    clicked = false;

    if (game.state === 'waiting') {
      if (flap) { bird.vy = FLAP_VY; game.setState('playing'); }
      return;
    }
    if (game.state === 'over') {
      if (input.wasPressed(' ') || flap) game.onInit();
      return;
    }

    // ── Bird ──
    if (flap) bird.vy = FLAP_VY;
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Bird wraps horizontally
    if (bird.x - BIRD_W / 2 > W) bird.x = -BIRD_W / 2;
    if (bird.x + BIRD_W / 2 < 0) bird.x = W + BIRD_W / 2;

    // Bird hits ceiling
    if (bird.y - BIRD_H / 2 < 0) {
      bird.y = BIRD_H / 2;
      bird.vy = Math.abs(bird.vy) * 0.5;
    }

    // Bird hits stack
    const stackStartY = H - stackTop * CELL;
    if (bird.y + BIRD_H / 2 >= stackStartY && stackTop > 0) {
      die();
      return;
    }

    // Bird hits screen bottom
    if (bird.y + BIRD_H / 2 >= H) {
      die();
      return;
    }

    // ── Spawn obstacles ──
    obsTimer++;
    if (obsTimer >= OBS_INTERVAL) {
      obsTimer = 0;
      obstacles.push(makeObstacle(W + 10));
      obsCount++;
      if (obsCount % 10 === 0) obsSpeed = Math.min(OBS_SPEED_BASE + obsCount / 10 * 0.3, 5.5);
    }

    // ── Move obstacles ──
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= obsSpeed;

      // Score: bird passed obs
      if (!obs.counted && obs.x + OBS_WIDTH < bird.x) {
        obs.counted = true;
        score += 10;
        scoreEl.textContent = score;
      }

      // Land off-screen obstacle into stack
      if (obs.x + OBS_WIDTH < 0 && !obs.landed) {
        obs.landed = true;
        landObstacle(obs);
        obstacles.splice(i, 1);
        continue;
      }

      // Bird vs obstacle collision
      if (!birdClear(obs)) {
        die();
        return;
      }
    }
  };

  function birdClear(obs) {
    const bx1 = bird.x - BIRD_W / 2, bx2 = bird.x + BIRD_W / 2;
    const by1 = bird.y - BIRD_H / 2, by2 = bird.y + BIRD_H / 2;
    const ox1 = obs.x, ox2 = obs.x + OBS_WIDTH;
    if (bx2 <= ox1 || bx1 >= ox2) return true; // no horizontal overlap
    // Check each column slice
    for (let dc = 0; dc < 3; dc++) {
      const cx1 = obs.x + dc * CELL;
      const cx2 = cx1 + CELL;
      if (bx2 <= cx1 || bx1 >= cx2) continue;
      // In this column: top block is 0..topH[dc], bottom is botY[dc]..H
      if (by1 < obs.topH[dc]) return false; // hit top block
      if (by2 > obs.botY[dc]) return false; // hit bottom block
    }
    return true;
  }

  function die() {
    game.showOverlay('GAME OVER', `Score: ${score}  •  Space/Click to restart`);
    game.setState('over');
  }

  game.onDraw = (renderer, text) => {
    const COLOR = '#fe0';

    // Draw stack
    for (let r = 0; r < STACK_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (stack[r][c]) {
          renderer.setGlow(stack[r][c], 0.3);
          renderer.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, stack[r][c]);
        }
      }
    }

    // Draw obstacles
    for (const obs of obstacles) {
      renderer.setGlow(obs.color, 0.5);
      for (let dc = 0; dc < 3; dc++) {
        const cx = obs.x + dc * CELL;
        // Top block
        if (obs.topH[dc] > 0) {
          renderer.fillRect(cx + 1, 0, CELL - 2, obs.topH[dc], obs.color);
        }
        // Bottom block
        renderer.fillRect(cx + 1, obs.botY[dc], CELL - 2, H - obs.botY[dc], obs.color);
      }
    }

    // Draw bird
    renderer.setGlow(COLOR, 0.8);
    renderer.fillRect(bird.x - BIRD_W / 2, bird.y - BIRD_H / 2, BIRD_W, BIRD_H, COLOR);
    // Beak
    renderer.fillRect(bird.x + BIRD_W / 2 - 4, bird.y - 3, 6, 6, '#f80');
    // Eye
    renderer.fillCircle(bird.x + 4, bird.y - 3, 3, '#fff');
    renderer.fillCircle(bird.x + 5, bird.y - 3, 1.5, '#000');

    renderer.setGlow(null);
  };

  game.start();
  return game;
}
