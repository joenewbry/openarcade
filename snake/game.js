// snake/game.js — Snake game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 400;
const CELL = 20;
const COLS = W / CELL;
const ROWS = H / CELL;
const BASE_INTERVAL = 100;
const MIN_INTERVAL = 60;

let snake, dir, nextDir, food, score, best = 0, interval, moveTimer;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function placeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    interval = BASE_INTERVAL;
    moveTimer = 0;
    scoreEl.textContent = '0';
    placeFood();
    game.showOverlay('SNAKE', 'Press any arrow key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Convert ms interval to frame count (60fps)
  function moveFrames() {
    return Math.max(1, Math.round(interval * 60 / 1000));
  }

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      const dirs = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }
      };
      for (const key of arrows) {
        if (input.wasPressed(key)) {
          nextDir = dirs[key];
          dir = dirs[key];
          game.setState('playing');
          return;
        }
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') ||
          input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // Direction input (prevent 180-degree turns)
    const dirs = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }
    };
    for (const [key, d] of Object.entries(dirs)) {
      if (input.wasPressed(key) && (d.x + dir.x !== 0 || d.y + dir.y !== 0)) {
        nextDir = d;
      }
    }

    // Tick at variable rate
    moveTimer++;
    if (moveTimer < moveFrames()) return;
    moveTimer = 0;

    // Move snake
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
      game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
      game.setState('over');
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 3);
      placeFood();
    } else {
      snake.pop();
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid lines
    for (let x = 0; x <= W; x += CELL) {
      renderer.fillRect(x, 0, 0.5, H, '#16213e');
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.fillRect(0, y, W, 0.5, '#16213e');
    }

    // Food
    renderer.setGlow('#f00', 0.6);
    renderer.fillCircle(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, '#f00');

    // Snake
    snake.forEach((seg, i) => {
      const brightness = 1 - (i / snake.length) * 0.5;
      const r = 0, g = Math.round(255 * brightness), b = Math.round(255 * brightness);
      const color = `rgba(${r},${g},${b},1)`;
      renderer.setGlow('#0ff', i === 0 ? 0.7 : 0.3);
      renderer.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, color);
    });
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
