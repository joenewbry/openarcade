// snake-invaders/game.js — Snake Invaders (Snake × Space Invaders) WebGL v2

import { Game } from '../engine/core.js';

const W = 400;
const H = 400;
const CELL = 20;
const COLS = W / CELL;   // 20
const ROWS = H / CELL;   // 20
const SNAKE_TICK = 8;    // frames per grid step

// Invader grid
const INV_COLS = 5;
const INV_ROWS = 3;
const INV_W = 24;
const INV_H = 18;
const INV_PAD_X = 10;

// DOM refs
const scoreEl  = document.getElementById('score');
const waveEl   = document.getElementById('wave');
const lengthEl = document.getElementById('length');

let snake, dir, nextDir;
let snakeTick;
let playerBullets;  // { x, y }
let alienBullets;   // { x, y }
let aliens;         // { col, row, alive }
let invX, invY, invDX, invDescend;
let foods;          // { x, y, ttl }
let score, wave;
let alienFireTimer, alienFireInterval;
let alienMoveTimer, alienMoveInterval;

function initAliens(waveNum) {
  aliens = [];
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      aliens.push({ col: c, row: r, alive: true });
    }
  }
  invX = 20;
  invY = 30;
  invDX = 1;
  invDescend = false;
  alienFireInterval = Math.max(40, 120 - waveNum * 20);
  alienMoveInterval = Math.max(4, 16 - waveNum * 2);
  alienFireTimer = 0;
  alienMoveTimer = 0;
}

function alienPixelPos(a) {
  return {
    x: invX + a.col * (INV_W + INV_PAD_X),
    y: invY + a.row * (INV_H + 10),
  };
}

function initSnake() {
  snake = [
    { x: 10, y: 15 },
    { x: 9,  y: 15 },
    { x: 8,  y: 15 },
  ];
  dir = { dx: 1, dy: 0 };
  nextDir = { dx: 1, dy: 0 };
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0; wave = 1;
    scoreEl.textContent = '0';
    waveEl.textContent = '1';
    playerBullets = [];
    alienBullets  = [];
    foods = [];
    snakeTick = 0;
    initSnake();
    initAliens(1);
    lengthEl.textContent = snake.length;
    game.showOverlay('SNAKE INVADERS', 'Arrow keys + Space to shoot');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }
    if (game.state === 'over') {
      if (input.wasPressed(' ')) game.onInit();
      return;
    }

    // ── Input ──
    if (input.wasPressed('ArrowUp')    && dir.dy === 0) nextDir = { dx: 0, dy: -1 };
    if (input.wasPressed('ArrowDown')  && dir.dy === 0) nextDir = { dx: 0, dy:  1 };
    if (input.wasPressed('ArrowLeft')  && dir.dx === 0) nextDir = { dx: -1, dy: 0 };
    if (input.wasPressed('ArrowRight') && dir.dx === 0) nextDir = { dx:  1, dy: 0 };

    // Fire player bullet (limit 2 on screen)
    if (input.wasPressed(' ') && playerBullets.length < 2) {
      const head = snake[0];
      playerBullets.push({ x: head.x * CELL + CELL / 2, y: head.y * CELL });
    }

    // ── Player bullets ──
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      playerBullets[i].y -= 8;
      if (playerBullets[i].y < 0) { playerBullets.splice(i, 1); continue; }
      // Hit alien?
      let hit = false;
      for (const a of aliens) {
        if (!a.alive) continue;
        const { x, y } = alienPixelPos(a);
        if (playerBullets[i].x > x && playerBullets[i].x < x + INV_W &&
            playerBullets[i].y > y && playerBullets[i].y < y + INV_H) {
          a.alive = false;
          score += 10 * wave;
          scoreEl.textContent = score;
          // Leave food dot
          foods.push({ x: x + INV_W / 2, y: y + INV_H / 2, ttl: 180 });
          playerBullets.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // ── Alien movement ──
    alienMoveTimer++;
    if (alienMoveTimer >= alienMoveInterval) {
      alienMoveTimer = 0;
      const liveAliens = aliens.filter(a => a.alive);
      if (liveAliens.length === 0) {
        // Next wave
        wave++;
        waveEl.textContent = wave;
        alienBullets = [];
        playerBullets = [];
        foods = [];
        initAliens(wave);
      } else {
        if (invDescend) {
          invY += INV_H + 10;
          invDX *= -1;
          invDescend = false;
        } else {
          invX += invDX * 8;
          // Check edge
          let minX = Infinity, maxX = -Infinity;
          for (const a of liveAliens) {
            const px = alienPixelPos(a).x;
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px + INV_W);
          }
          if (maxX >= W - 5 || minX <= 5) {
            invDescend = true;
          }
        }
        // Aliens reached snake area?
        for (const a of liveAliens) {
          const { y } = alienPixelPos(a);
          if (y + INV_H >= snake[0].y * CELL) {
            // Instant game over
            game.showOverlay('INVADED!', `Score: ${score}  •  Space to restart`);
            game.setState('over');
            return;
          }
        }
      }
    }

    // ── Alien bullets ──
    alienFireTimer++;
    if (alienFireTimer >= alienFireInterval) {
      alienFireTimer = 0;
      const liveAliens = aliens.filter(a => a.alive);
      if (liveAliens.length > 0) {
        const a = liveAliens[Math.floor(Math.random() * liveAliens.length)];
        const { x, y } = alienPixelPos(a);
        alienBullets.push({ x: x + INV_W / 2, y: y + INV_H });
      }
    }
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      alienBullets[i].y += 4;
      if (alienBullets[i].y > H) { alienBullets.splice(i, 1); continue; }
      const bx = alienBullets[i].x, by = alienBullets[i].y;
      // Hit snake head?
      const head = snake[0];
      if (bx > head.x * CELL && bx < (head.x + 1) * CELL &&
          by > head.y * CELL && by < (head.y + 1) * CELL) {
        game.showOverlay('GAME OVER', `Score: ${score}  •  Space to restart`);
        game.setState('over');
        return;
      }
      // Hit tail segment? Remove that segment
      let hitTail = false;
      for (let s = 1; s < snake.length; s++) {
        if (bx > snake[s].x * CELL && bx < (snake[s].x + 1) * CELL &&
            by > snake[s].y * CELL && by < (snake[s].y + 1) * CELL) {
          snake.splice(s, 1);
          alienBullets.splice(i, 1);
          lengthEl.textContent = snake.length;
          hitTail = true;
          break;
        }
      }
    }

    // ── Food dots (decrement TTL) ──
    for (let i = foods.length - 1; i >= 0; i--) {
      foods[i].ttl--;
      if (foods[i].ttl <= 0) { foods.splice(i, 1); continue; }
      // Snake head eats food?
      const head = snake[0];
      const f = foods[i];
      if (Math.abs(f.x - (head.x * CELL + CELL / 2)) < CELL / 2 &&
          Math.abs(f.y - (head.y * CELL + CELL / 2)) < CELL / 2) {
        // Grow snake
        const tail = snake[snake.length - 1];
        snake.push({ x: tail.x, y: tail.y });
        score += 5;
        scoreEl.textContent = score;
        lengthEl.textContent = snake.length;
        foods.splice(i, 1);
      }
    }

    // ── Snake movement ──
    snakeTick++;
    if (snakeTick < SNAKE_TICK) return;
    snakeTick = 0;

    dir = nextDir;
    const head = snake[0];
    let nx = (head.x + dir.dx + COLS) % COLS;
    let ny = (head.y + dir.dy + ROWS) % ROWS;

    // Self collision?
    for (let s = 1; s < snake.length; s++) {
      if (snake[s].x === nx && snake[s].y === ny) {
        game.showOverlay('GAME OVER', `Score: ${score}  •  Space to restart`);
        game.setState('over');
        return;
      }
    }

    snake.unshift({ x: nx, y: ny });
    snake.pop();
  };

  game.onDraw = (renderer, text) => {
    const COLOR = '#a0f';

    // Draw food dots
    for (const f of foods) {
      const alpha = f.ttl / 180;
      renderer.setGlow('#ff0', alpha);
      renderer.fillCircle(f.x, f.y, 5, '#ff0');
    }

    // Draw aliens
    for (const a of aliens) {
      if (!a.alive) continue;
      const { x, y } = alienPixelPos(a);
      renderer.setGlow(COLOR, 0.6);
      // Body
      renderer.fillRect(x + 4, y + 4, INV_W - 8, INV_H - 8, COLOR);
      // Eyes
      renderer.fillRect(x + 5, y + 5, 4, 4, '#fff');
      renderer.fillRect(x + INV_W - 9, y + 5, 4, 4, '#fff');
      // Legs
      renderer.fillRect(x + 2, y + INV_H - 5, 4, 4, COLOR);
      renderer.fillRect(x + INV_W - 6, y + INV_H - 5, 4, 4, COLOR);
    }

    // Draw alien bullets
    renderer.setGlow('#f44', 0.8);
    for (const b of alienBullets) {
      renderer.fillRect(b.x - 2, b.y - 6, 4, 12, '#f44');
    }

    // Draw player bullets
    renderer.setGlow('#0ff', 0.8);
    for (const b of playerBullets) {
      renderer.fillRect(b.x - 2, b.y, 4, 10, '#0ff');
    }

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const bright = i === 0 ? '#d0ff80' : (i % 2 === 0 ? '#80d000' : '#60b000');
      renderer.setGlow(i === 0 ? '#d0ff80' : '#60b000', i === 0 ? 0.6 : 0.3);
      renderer.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, bright);
      // Head eyes
      if (i === 0) {
        renderer.fillRect(s.x * CELL + 4, s.y * CELL + 4, 3, 3, '#fff');
        renderer.fillRect(s.x * CELL + CELL - 7, s.y * CELL + 4, 3, 3, '#fff');
      }
    }

    renderer.setGlow(null);
  };

  game.start();
  return game;
}
