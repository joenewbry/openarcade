// nibbler/game.js — Nibbler game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;
const CELL = 20;
const COLS = W / CELL;  // 25
const ROWS = H / CELL;  // 25

// ── Maze helpers ──

function hWall(r, c1, c2) {
  const out = [];
  for (let c = c1; c <= c2; c++) out.push([r, c]);
  return out;
}
function vWall(c, r1, r2) {
  const out = [];
  for (let r = r1; r <= r2; r++) out.push([r, c]);
  return out;
}

const mazePatterns = [
  // Level 1: Simple cross corridors
  [
    ...hWall(6, 4, 10), ...hWall(6, 14, 20),
    ...hWall(18, 4, 10), ...hWall(18, 14, 20),
    ...vWall(6, 4, 10), ...vWall(6, 14, 20),
    ...vWall(18, 4, 10), ...vWall(18, 14, 20),
    ...hWall(12, 8, 11), ...hWall(12, 13, 16),
  ],
  // Level 2: Rooms with doorways
  [
    ...hWall(5, 2, 7), ...hWall(5, 9, 15), ...hWall(5, 17, 22),
    ...hWall(12, 3, 6), ...hWall(12, 8, 11), ...hWall(12, 13, 16), ...hWall(12, 18, 21),
    ...hWall(19, 2, 7), ...hWall(19, 9, 15), ...hWall(19, 17, 22),
    ...vWall(8, 2, 4), ...vWall(8, 6, 11), ...vWall(8, 13, 18), ...vWall(8, 20, 23),
    ...vWall(16, 2, 4), ...vWall(16, 6, 11), ...vWall(16, 13, 18), ...vWall(16, 20, 23),
  ],
  // Level 3: Zigzag corridors
  [
    ...hWall(4, 1, 8), ...vWall(8, 4, 8),
    ...hWall(8, 8, 16), ...vWall(16, 4, 8),
    ...hWall(4, 16, 23),
    ...hWall(12, 3, 10), ...hWall(12, 14, 21),
    ...vWall(3, 12, 16), ...hWall(16, 3, 10),
    ...vWall(10, 16, 20), ...hWall(20, 10, 21),
    ...vWall(21, 12, 20),
    ...vWall(12, 6, 10), ...vWall(12, 14, 18),
  ],
  // Level 4: Spiral with gaps for navigation
  [
    ...hWall(3, 2, 11), ...hWall(3, 13, 22),
    ...vWall(22, 3, 11), ...vWall(22, 13, 21),
    ...hWall(21, 4, 11), ...hWall(21, 13, 22),
    ...vWall(4, 5, 11), ...vWall(4, 13, 21),
    ...hWall(5, 4, 11), ...hWall(5, 13, 20),
    ...vWall(20, 5, 11), ...vWall(20, 13, 19),
    ...hWall(19, 6, 11), ...hWall(19, 13, 20),
    ...vWall(6, 7, 11), ...vWall(6, 13, 19),
    ...hWall(7, 6, 11), ...hWall(7, 13, 18),
    ...vWall(18, 7, 11), ...vWall(18, 13, 17),
    ...hWall(17, 8, 11), ...hWall(17, 13, 18),
    ...vWall(8, 9, 11), ...vWall(8, 13, 17),
    ...hWall(9, 8, 11), ...hWall(9, 13, 16),
  ],
  // Level 5: Dense maze with many corridors
  [
    ...vWall(4, 2, 6), ...vWall(4, 10, 14), ...vWall(4, 18, 22),
    ...vWall(8, 4, 8), ...vWall(8, 12, 16), ...vWall(8, 20, 23),
    ...vWall(12, 1, 5), ...vWall(12, 7, 11), ...vWall(12, 13, 17), ...vWall(12, 19, 23),
    ...vWall(16, 2, 6), ...vWall(16, 8, 12), ...vWall(16, 16, 20),
    ...vWall(20, 4, 8), ...vWall(20, 10, 14), ...vWall(20, 18, 22),
    ...hWall(8, 1, 3), ...hWall(8, 9, 11), ...hWall(8, 13, 15), ...hWall(8, 21, 23),
    ...hWall(16, 1, 3), ...hWall(16, 5, 7), ...hWall(16, 17, 19), ...hWall(16, 21, 23),
  ],
  // Level 6: Open arena with pillars
  [
    ...hWall(6, 6, 8), ...hWall(6, 16, 18),
    ...hWall(18, 6, 8), ...hWall(18, 16, 18),
    ...vWall(6, 6, 8), ...vWall(6, 16, 18),
    ...vWall(18, 6, 8), ...vWall(18, 16, 18),
    ...hWall(12, 10, 14),
    ...vWall(12, 10, 14),
    ...hWall(4, 10, 14), ...hWall(20, 10, 14),
    ...vWall(4, 4, 6), ...vWall(20, 4, 6),
    ...vWall(4, 18, 20), ...vWall(20, 18, 20),
  ],
  // Level 7: Corridors with dead-end traps
  [
    ...hWall(4, 2, 11), ...hWall(4, 13, 22),
    ...hWall(8, 4, 9), ...hWall(8, 15, 20),
    ...hWall(12, 2, 5), ...hWall(12, 7, 11), ...hWall(12, 13, 17), ...hWall(12, 19, 22),
    ...hWall(16, 4, 9), ...hWall(16, 15, 20),
    ...hWall(20, 2, 11), ...hWall(20, 13, 22),
    ...vWall(11, 4, 7), ...vWall(13, 4, 7),
    ...vWall(11, 13, 16), ...vWall(13, 13, 16),
    ...vWall(11, 17, 20), ...vWall(13, 17, 20),
  ],
  // Level 8: Tight winding maze
  [
    ...hWall(3, 2, 5), ...vWall(5, 3, 7), ...hWall(7, 2, 5),
    ...hWall(3, 7, 11), ...vWall(11, 3, 7), ...hWall(7, 7, 11),
    ...hWall(3, 13, 17), ...vWall(13, 3, 7), ...hWall(7, 13, 17),
    ...hWall(3, 19, 22), ...vWall(19, 3, 7), ...hWall(7, 19, 22),
    ...hWall(10, 2, 5), ...vWall(5, 10, 14), ...hWall(14, 2, 5),
    ...hWall(10, 7, 11), ...vWall(11, 10, 14), ...hWall(14, 7, 11),
    ...hWall(10, 13, 17), ...vWall(13, 10, 14), ...hWall(14, 13, 17),
    ...hWall(10, 19, 22), ...vWall(19, 10, 14), ...hWall(14, 19, 22),
    ...hWall(17, 2, 5), ...vWall(5, 17, 21), ...hWall(21, 2, 5),
    ...hWall(17, 7, 11), ...vWall(11, 17, 21), ...hWall(21, 7, 11),
    ...hWall(17, 13, 17), ...vWall(13, 17, 21), ...hWall(17, 13, 17),
    ...hWall(17, 19, 22), ...vWall(19, 17, 21), ...hWall(21, 19, 22),
  ],
];

function createMaze(level) {
  const m = [];
  for (let r = 0; r < ROWS; r++) {
    m[r] = [];
    for (let c = 0; c < COLS; c++) {
      m[r][c] = (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) ? 1 : 0;
    }
  }
  const idx = (level - 1) % mazePatterns.length;
  const pattern = mazePatterns[idx];
  for (const [r, c] of pattern) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      m[r][c] = 1;
    }
  }
  return m;
}

function getStartPos(maze) {
  const centerR = Math.floor(ROWS / 2);
  const centerC = Math.floor(COLS / 2);
  for (let d = 0; d < 12; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        const r = centerR + dr;
        const c = centerC + dc;
        if (r >= 1 && r < ROWS - 1 && c >= 2 && c < COLS - 2 &&
            maze[r][c] === 0 && maze[r][c + 1] === 0 && maze[r][c - 1] === 0) {
          return { r, c };
        }
      }
    }
  }
  return { r: 2, c: 2 };
}

function placeFood(maze, snake, count) {
  const openCells = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (maze[r][c] === 0 && !snake.some(s => s.r === r && s.c === c)) {
        openCells.push({ r, c });
      }
    }
  }
  for (let i = openCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [openCells[i], openCells[j]] = [openCells[j], openCells[i]];
  }
  return openCells.slice(0, Math.min(count, openCells.length));
}

function getFoodCount(level) {
  return 8 + Math.min(level * 2, 16);
}

function getTimeForLevel(level) {
  return Math.max(30, 60 - (level - 1) * 4);
}

function getSpeed(level) {
  return Math.max(80, 160 - (level - 1) * 10);
}

// ── State ──
let score, best = 0;
let snake, dir, nextDir, maze, foods;
let level, lives, timeLeft, currentInterval;
let foodEaten, totalFoodInLevel;
let levelTransition, levelTransitionFrames;
let moveTimer, timerFrames, timerCounter;
let pulsePhase = 0;
let crashResumeFrames;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// Convert ms to frame count at 60fps
function msToFrames(ms) {
  return Math.max(1, Math.round(ms * 60 / 1000));
}

export function createGame() {
  const game = new Game('game');

  function setupLevel() {
    maze = createMaze(level);
    const startPos = getStartPos(maze);
    snake = [
      { r: startPos.r, c: startPos.c },
      { r: startPos.r, c: startPos.c - 1 },
      { r: startPos.r, c: startPos.c - 2 },
    ];
    dir = { r: 0, c: 1 };
    nextDir = { r: 0, c: 1 };
    totalFoodInLevel = getFoodCount(level);
    foods = placeFood(maze, snake, totalFoodInLevel);
    foodEaten = 0;
    timeLeft = getTimeForLevel(level);
    currentInterval = getSpeed(level);
    levelTransition = false;
    levelTransitionFrames = 0;
    crashResumeFrames = 0;
    moveTimer = 0;
    timerFrames = 0;
    timerCounter = 0;
  }

  function completeLevel() {
    levelTransition = true;

    // Time bonus
    const timeBonus = timeLeft * level * 2;
    score += timeBonus;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }

    game.showOverlay('LEVEL ' + level + ' COMPLETE!', 'Time bonus: +' + timeBonus + ' | Next level...');
    levelTransitionFrames = msToFrames(2000); // 2 seconds
  }

  function die() {
    lives--;

    if (lives <= 0) {
      game.showOverlay('GAME OVER', 'Score: ' + score + ' | Level ' + level + ' \u2014 Press any key to restart');
      game.setState('over');
    } else {
      levelTransition = true;
      game.showOverlay('CRASHED!', lives + ' lives left... Get ready!');
      crashResumeFrames = msToFrames(1500); // 1.5 seconds
    }
  }

  game.onInit = () => {
    score = 0;
    level = 1;
    lives = 3;
    scoreEl.textContent = '0';
    levelTransition = false;
    levelTransitionFrames = 0;
    crashResumeFrames = 0;
    moveTimer = 0;
    timerFrames = 0;
    timerCounter = 0;
    pulsePhase = 0;
    setupLevel();
    game.showOverlay('NIBBLER', 'Press any arrow key to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  function moveFrames() {
    return Math.max(1, Math.round(currentInterval * 60 / 1000));
  }

  game.onUpdate = () => {
    const input = game.input;
    pulsePhase += 0.05;

    // ── Waiting state ──
    if (game.state === 'waiting') {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      const dirs = {
        ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 },
        ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 }
      };
      for (const key of arrows) {
        if (input.wasPressed(key)) {
          nextDir = dirs[key];
          dir = dirs[key];
          game.hideOverlay();
          game.setState('playing');
          return;
        }
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

    // Handle level transition countdown (level complete)
    if (levelTransition && levelTransitionFrames > 0) {
      levelTransitionFrames--;
      if (levelTransitionFrames <= 0) {
        level++;
        setupLevel();
        game.hideOverlay();
        levelTransition = false;
      }
      return;
    }

    // Handle crash resume countdown
    if (levelTransition && crashResumeFrames > 0) {
      crashResumeFrames--;
      if (crashResumeFrames <= 0) {
        const startPos = getStartPos(maze);
        snake = [
          { r: startPos.r, c: startPos.c },
          { r: startPos.r, c: startPos.c - 1 },
          { r: startPos.r, c: startPos.c - 2 },
        ];
        dir = { r: 0, c: 1 };
        nextDir = { r: 0, c: 1 };
        game.hideOverlay();
        levelTransition = false;
      }
      return;
    }

    // Direction input (prevent 180-degree turns)
    const dirs = {
      ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 },
      ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 }
    };
    for (const [key, d] of Object.entries(dirs)) {
      if (input.wasPressed(key) && (d.r + dir.r !== 0 || d.c + dir.c !== 0)) {
        nextDir = d;
      }
    }

    // Timer: count down timeLeft every 60 frames (1 second at 60fps)
    timerCounter++;
    if (timerCounter >= 60) {
      timerCounter = 0;
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        die();
        return;
      }
    }

    // Snake movement tick via frame counter
    moveTimer++;
    if (moveTimer < moveFrames()) return;
    moveTimer = 0;

    // Apply direction and move
    dir = { ...nextDir };
    const head = { r: snake[0].r + dir.r, c: snake[0].c + dir.c };

    // Check wall collision
    if (head.r < 0 || head.r >= ROWS || head.c < 0 || head.c >= COLS || maze[head.r][head.c] === 1) {
      die();
      return;
    }

    // Check self collision (skip the tail tip since it will move)
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].r === head.r && snake[i].c === head.c) {
        die();
        return;
      }
    }

    snake.unshift(head);

    // Check food
    const foodIdx = foods.findIndex(f => f.r === head.r && f.c === head.c);
    if (foodIdx >= 0) {
      foods.splice(foodIdx, 1);
      foodEaten++;
      const points = 10 * level;
      score += points;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }

      // Check level complete
      if (foods.length === 0) {
        completeLevel();
        return;
      }
    } else {
      snake.pop();
    }
  };

  game.onDraw = (renderer, text) => {
    // Grid lines (subtle)
    for (let x = 0; x <= W; x += CELL) {
      renderer.fillRect(x, 0, 0.5, H, '#16213e');
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.fillRect(0, y, W, 0.5, '#16213e');
    }

    // Draw maze walls
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze[r][c] === 1) {
          // Solid wall block
          renderer.fillRect(c * CELL, r * CELL, CELL, CELL, '#0f3460');
          // Inner highlight
          renderer.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4, '#16213e');
          // Border glow via a slightly brighter outline effect (thin rects)
          renderer.fillRect(c * CELL, r * CELL, CELL, 1, '#1a4a7a');
          renderer.fillRect(c * CELL, r * CELL + CELL - 1, CELL, 1, '#1a4a7a');
          renderer.fillRect(c * CELL, r * CELL, 1, CELL, '#1a4a7a');
          renderer.fillRect(c * CELL + CELL - 1, r * CELL, 1, CELL, '#1a4a7a');
        }
      }
    }

    // Draw food with pulsing glow
    const pulse = 0.5 + 0.5 * Math.sin(pulsePhase * 2);
    const glowIntensity = 0.3 + pulse * 0.5;
    renderer.setGlow('#ff0', glowIntensity);
    for (const f of foods) {
      const cx = f.c * CELL + CELL / 2;
      const cy = f.r * CELL + CELL / 2;
      renderer.fillCircle(cx, cy, CELL / 2 - 4, '#ff0');
    }

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const x = seg.c * CELL;
      const y = seg.r * CELL;

      if (i === 0) {
        // Head - distinct look
        renderer.setGlow('#4f6', 0.8);
        renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#4f6');

        // Eyes
        const eyeOffset = 5;
        const eyeR = 2.5;
        let ex1, ey1, ex2, ey2;
        if (dir.c === 1) { // right
          ex1 = x + CELL - eyeOffset; ey1 = y + eyeOffset;
          ex2 = x + CELL - eyeOffset; ey2 = y + CELL - eyeOffset;
        } else if (dir.c === -1) { // left
          ex1 = x + eyeOffset; ey1 = y + eyeOffset;
          ex2 = x + eyeOffset; ey2 = y + CELL - eyeOffset;
        } else if (dir.r === -1) { // up
          ex1 = x + eyeOffset; ey1 = y + eyeOffset;
          ex2 = x + CELL - eyeOffset; ey2 = y + eyeOffset;
        } else { // down
          ex1 = x + eyeOffset; ey1 = y + CELL - eyeOffset;
          ex2 = x + CELL - eyeOffset; ey2 = y + CELL - eyeOffset;
        }
        renderer.setGlow(null);
        renderer.fillCircle(ex1, ey1, eyeR, '#fff');
        renderer.fillCircle(ex2, ey2, eyeR, '#fff');
        renderer.fillCircle(ex1, ey1, 1.2, '#111');
        renderer.fillCircle(ex2, ey2, 1.2, '#111');
      } else {
        // Body - fade from bright to dim
        const t = i / snake.length;
        const r = Math.round(68 * (1 - t * 0.4));
        const g = Math.round(255 * (1 - t * 0.5));
        const b = Math.round(102 * (1 - t * 0.4));
        const color = 'rgb(' + r + ',' + g + ',' + b + ')';
        renderer.setGlow('#4f6', 0.2);
        renderer.fillRect(x + 2, y + 2, CELL - 4, CELL - 4, color);
      }
    }
    renderer.setGlow(null);

    // HUD: Level, Lives, Time - drawn on canvas for ML visibility
    renderer.fillRect(0, 0, W, 18, 'rgba(26,26,46,0.7)');

    renderer.setGlow('#4f6', 0.3);
    text.drawText('LVL ' + level, 6, 2, 12, '#4f6', 'left');

    // Lives (hearts)
    const livesStr = '\u2764'.repeat(lives);
    text.drawText(livesStr, W / 2, 2, 12, '#f44', 'center');

    // Time
    const timeColor = timeLeft <= 10 ? '#f44' : '#4f6';
    text.drawText('TIME ' + timeLeft, W - 6, 2, 12, timeColor, 'right');

    // Food counter
    text.drawText(foods.length + ' left', W / 2 + 40, 2, 12, '#ff0', 'left');
  };

  game.start();
  return game;
}
