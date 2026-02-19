// qbert/game.js — Q*bert game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 520;

// ── Constants ──
const ROWS = 7;
const CUBE_W = 48;
const CUBE_H = 24;
const CUBE_DEPTH = 28;
const PYRAMID_TOP_X = W / 2;
const PYRAMID_TOP_Y = 60;
const HOP_DURATION = 12;

const THEME = '#e64';
const BG = '#1a1a2e';

// Cube color schemes per level
const LEVEL_SCHEMES = [
  { start: '#2a2a4e', target: '#e64',  hops: 1 },
  { start: '#2a2a4e', target: '#4f4',  hops: 1 },
  { start: '#2a2a4e', target: '#ff0',  mid: '#f80', hops: 2 },
  { start: '#2a2a4e', target: '#0ff',  mid: '#08f', hops: 2 },
  { start: '#2a2a4e', target: '#f0f',  hops: 1, revert: true },
  { start: '#2a2a4e', target: '#88f',  mid: '#44a', hops: 2, revert: true },
  { start: '#2a2a4e', target: '#f44',  hops: 1, revert: true },
  { start: '#2a2a4e', target: '#0f8',  mid: '#084', hops: 2, revert: true },
];

// Arrow key mapping to diagonal grid movement
const MOVE_MAP = {
  'ArrowUp':    { dr: -1, dc: 0 },
  'ArrowLeft':  { dr: -1, dc: -1 },
  'ArrowDown':  { dr: 1, dc: 0 },
  'ArrowRight': { dr: 1, dc: 1 },
};

// ── Game State ──
let score, best = 0;
let lives, level;
let cubes;
let qbert;
let enemies;
let discs;
let particles;
let frameCount;
let levelComplete;
let levelCompleteTimer;
let deathTimer;
let spawnTimer;
let levelScheme;

// DOM refs
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

// ── Helpers ──

function cubeScreenPos(row, col) {
  const x = PYRAMID_TOP_X + (col - row / 2) * CUBE_W;
  const y = PYRAMID_TOP_Y + row * (CUBE_H + CUBE_DEPTH - 6);
  return { x, y };
}

function cubeCenter(row, col) {
  const p = cubeScreenPos(row, col);
  return { x: p.x, y: p.y - 4 };
}

function isValidCube(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col <= row;
}

function getCubeColor(hopCount) {
  if (levelScheme.hops === 1) {
    return hopCount >= 1 ? levelScheme.target : levelScheme.start;
  } else {
    if (hopCount >= 2) return levelScheme.target;
    if (hopCount === 1) return levelScheme.mid || levelScheme.target;
    return levelScheme.start;
  }
}

function isCubeComplete(hopCount) {
  return hopCount >= levelScheme.hops;
}

function checkLevelComplete() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      if (!isCubeComplete(cubes[r][c].hopCount)) return false;
    }
  }
  return true;
}

function darkenColor(hex, factor) {
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r = Math.round(r * factor);
  g = Math.round(g * factor);
  b = Math.round(b * factor);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getHopPosition(from, to, progress) {
  const x = from.x + (to.x - from.x) * progress;
  const baseY = from.y + (to.y - from.y) * progress;
  const arc = -Math.sin(progress * Math.PI) * 30;
  return { x, y: baseY + arc };
}

// ── Particles ──

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 15,
      color,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].x += particles[i].vx;
    particles[i].y += particles[i].vy;
    particles[i].vy += 0.1;
    particles[i].life--;
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

// ── Enemies ──

function spawnEnemy() {
  const type = Math.random() < 0.5 + level * 0.05 ? 'coily' : 'redball';
  const enemy = {
    type,
    row: 0,
    col: 0,
    hopAnim: 0,
    hopFrom: null,
    hopTo: null,
    state: 'egg',
    moveTimer: 0,
    moveInterval: type === 'coily' ? 30 : 25,
  };
  enemies.push(enemy);
}

function updateEnemies(gameDeath) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.hopAnim > 0) {
      e.hopAnim--;
      continue;
    }

    e.moveTimer++;
    if (e.moveTimer < e.moveInterval) continue;
    e.moveTimer = 0;

    let dr, dc;

    if (e.type === 'redball' || e.state === 'egg') {
      if (Math.random() < 0.5) {
        dr = 1; dc = 0;
      } else {
        dr = 1; dc = 1;
      }
    } else {
      dr = qbert.row > e.row ? 1 : -1;
      dc = 0;
      if (dr === 1) {
        dc = qbert.col > e.col ? 1 : 0;
      } else {
        dc = qbert.col < e.col ? -1 : 0;
      }
    }

    const newRow = e.row + dr;
    const newCol = e.col + dc;

    if (!isValidCube(newRow, newCol)) {
      if (e.type === 'coily' && e.state !== 'egg') {
        score += 500;
        scoreEl.textContent = score;
        spawnParticles(cubeCenter(e.row, e.col).x, cubeCenter(e.row, e.col).y, '#a4f', 10);
      }
      enemies.splice(i, 1);
      continue;
    }

    e.hopFrom = cubeCenter(e.row, e.col);
    e.row = newRow;
    e.col = newCol;
    e.hopTo = cubeCenter(newRow, newCol);
    e.hopAnim = HOP_DURATION;

    if (e.type === 'coily' && e.state === 'egg' && e.row >= 2) {
      e.state = 'snake';
      e.moveInterval = Math.max(18, 30 - level * 2);
    }

    if (levelScheme.revert && e.state === 'snake' && cubes[newRow][newCol].hopCount > 0) {
      cubes[newRow][newCol].hopCount--;
    }

    if (e.row === qbert.row && e.col === qbert.col && qbert.hopAnim === 0) {
      gameDeath();
    }
  }
}

// ── Disc helpers ──

function findDisc(row, col, dr, dc) {
  for (const disc of discs) {
    if (disc.used) continue;
    if (disc.side === 'left') {
      if (row === disc.row && col === 0 && dr === -1 && dc === -1) return disc;
    } else {
      if (row === disc.row && col === row && dr === -1 && dc === 0) return disc;
    }
  }
  return null;
}

// ── Exported createGame ──

export function createGame() {
  const game = new Game('game');

  function initLevel() {
    levelScheme = LEVEL_SCHEMES[(level - 1) % LEVEL_SCHEMES.length];
    cubes = [];
    for (let r = 0; r < ROWS; r++) {
      cubes[r] = [];
      for (let c = 0; c <= r; c++) {
        cubes[r][c] = { hopCount: 0 };
      }
    }
    qbert = { row: 0, col: 0, hopAnim: 0, hopFrom: null, hopTo: null, onDisc: false };
    enemies = [];
    particles = [];
    frameCount = 0;
    levelComplete = false;
    levelCompleteTimer = 0;
    deathTimer = 0;
    spawnTimer = 0;

    discs = [];
    if (level >= 1) {
      discs.push({ row: 2, side: 'left', used: false });
      discs.push({ row: 3, side: 'right', used: false });
    }
    if (level >= 3) {
      discs.push({ row: 4, side: 'left', used: false });
      discs.push({ row: 5, side: 'right', used: false });
    }

    levelEl.textContent = level;
  }

  function playerDeath() {
    if (deathTimer > 0) return;
    lives--;
    livesEl.textContent = lives;
    deathTimer = 60;
    spawnParticles(cubeCenter(qbert.row, qbert.col).x, cubeCenter(qbert.row, qbert.col).y, THEME, 15);

    if (lives <= 0) {
      // Delay then game over — use a frame counter approach
      deathTimer = 30; // shorter delay, handled in update
    }
  }

  function tryMove(key) {
    if (qbert.hopAnim > 0 || deathTimer > 0 || levelComplete) return;

    const move = MOVE_MAP[key];
    if (!move) return;

    const newRow = qbert.row + move.dr;
    const newCol = qbert.col + move.dc;

    // Check if moving onto a disc
    if (!isValidCube(newRow, newCol)) {
      const disc = findDisc(qbert.row, qbert.col, move.dr, move.dc);
      if (disc && !disc.used) {
        disc.used = true;
        qbert.onDisc = true;
        qbert.hopAnim = HOP_DURATION * 2;
        qbert.hopFrom = cubeCenter(qbert.row, qbert.col);
        qbert.hopTo = cubeCenter(0, 0);
        qbert.row = 0;
        qbert.col = 0;
        enemies.forEach(e => {
          spawnParticles(cubeCenter(e.row, e.col).x, cubeCenter(e.row, e.col).y, '#f44', 8);
        });
        enemies = [];
        score += 500;
        scoreEl.textContent = score;
        return;
      }
      playerDeath();
      return;
    }

    // Valid move
    qbert.hopAnim = HOP_DURATION;
    qbert.hopFrom = cubeCenter(qbert.row, qbert.col);
    qbert.row = newRow;
    qbert.col = newCol;
    qbert.hopTo = cubeCenter(newRow, newCol);

    const cube = cubes[newRow][newCol];
    if (!isCubeComplete(cube.hopCount)) {
      cube.hopCount++;
      score += 25;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
      }
    }
  }

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    initLevel();
    game.showOverlay('Q*BERT', 'Arrow keys to hop diagonally -- Press any key to start');
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
        initLevel();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Handle arrow key input for movement
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      if (input.wasPressed(key)) {
        tryMove(key);
        break;
      }
    }

    // Hop animation
    if (qbert.hopAnim > 0) {
      qbert.hopAnim--;
      if (qbert.hopAnim === 0) {
        qbert.onDisc = false;
        for (const e of enemies) {
          if (e.row === qbert.row && e.col === qbert.col && e.hopAnim === 0) {
            playerDeath();
            break;
          }
        }
      }
    }

    // Death recovery
    if (deathTimer > 0) {
      deathTimer--;
      if (deathTimer === 0 && lives > 0) {
        qbert.row = 0;
        qbert.col = 0;
        qbert.hopAnim = 0;
        qbert.onDisc = false;
        enemies = [];
      }
      if (deathTimer === 0 && lives <= 0) {
        game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
        game.setState('over');
      }
      updateParticles();
      return;
    }

    // Level complete check
    if (!levelComplete && checkLevelComplete()) {
      levelComplete = true;
      levelCompleteTimer = 90;
      score += 1000 + level * 250;
      scoreEl.textContent = score;
      spawnParticles(W / 2, H / 2, '#ff0', 20);
      spawnParticles(W / 2, H / 2, THEME, 20);
    }

    if (levelComplete) {
      levelCompleteTimer--;
      if (levelCompleteTimer <= 0) {
        level++;
        levelComplete = false;
        initLevel();
      }
      updateParticles();
      return;
    }

    // Enemy spawning
    spawnTimer++;
    const spawnInterval = Math.max(80, 200 - level * 15);
    if (spawnTimer >= spawnInterval && enemies.length < Math.min(3 + level, 6)) {
      spawnEnemy();
      spawnTimer = 0;
    }

    updateEnemies(playerDeath);
    updateParticles();

    // Expose game data for ML
    window.gameData = {
      qbertRow: qbert.row,
      qbertCol: qbert.col,
      enemies: enemies.map(e => ({ type: e.type, state: e.state, row: e.row, col: e.col })),
      level,
      lives,
      cubesRemaining: (() => {
        let count = 0;
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c <= r; c++)
            if (!isCubeComplete(cubes[r][c].hopCount)) count++;
        return count;
      })(),
    };
  };

  game.onDraw = (renderer, text) => {
    // Subtle starfield
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 83) % W);
      const sy = ((i * 251 + 47) % H);
      renderer.fillRect(sx, sy, 1, 1, '#ffffff10');
    }

    // Draw cubes (back to front)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        drawCube(renderer, r, c);
      }
    }

    // Draw discs
    if (discs) {
      for (const d of discs) {
        drawDisc(renderer, d);
      }
    }

    // Draw enemies
    if (enemies) {
      for (const e of enemies) {
        drawEnemy(renderer, text, e);
      }
    }

    // Draw Q*bert
    if (qbert && (game.state === 'playing' || game.state === 'waiting')) {
      drawQbert(renderer, text);
    }

    // Draw particles
    if (particles) {
      for (const p of particles) {
        const alpha = Math.min(1, p.life / 15);
        const r = parseInt(p.color.slice(1, 2), 16) / 15;
        const g = parseInt(p.color.slice(2, 3), 16) / 15;
        const b = parseInt(p.color.slice(3, 4), 16) / 15;
        renderer.fillRect(p.x - 2, p.y - 2, 4, 4,
          `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`);
      }
    }

    // Level complete flash
    if (levelComplete) {
      const flash = Math.sin(levelCompleteTimer * 0.3) * 0.3 + 0.2;
      const a = Math.max(0, Math.min(1, flash));
      renderer.fillRect(0, 0, W, H, `rgba(238,102,68,${a})`);

      text.drawText(`LEVEL ${level} COMPLETE!`, W / 2, H / 2 - 22, 32, '#ff0', 'center');
      text.drawText(`+${1000 + level * 250} BONUS`, W / 2, H / 2 + 14, 16, '#fff', 'center');
    }

    // HUD: target color swatch and progress
    if (game.state === 'playing' && !levelComplete && levelScheme) {
      text.drawText('Target:', 10, 6, 11, '#888', 'left');
      renderer.setGlow(levelScheme.target, 0.5);
      renderer.fillRect(65, 8, 16, 14, levelScheme.target);
      renderer.setGlow(null);

      let total = 0, done = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= r; c++) {
          total++;
          if (isCubeComplete(cubes[r][c].hopCount)) done++;
        }
      }
      text.drawText(`${done}/${total}`, W - 10, 6, 11, '#888', 'right');
    }
  };

  // ── Drawing helpers ──

  function drawCube(renderer, row, col) {
    const pos = cubeScreenPos(row, col);
    const x = pos.x;
    const y = pos.y;
    const halfW = CUBE_W / 2;
    const cube = cubes[row][col];
    const color = getCubeColor(cube.hopCount);
    const complete = isCubeComplete(cube.hopCount);

    if (complete) {
      renderer.setGlow(color, 0.5);
    }

    // Top face (diamond)
    renderer.fillPoly([
      { x: x, y: y - CUBE_H },
      { x: x + halfW, y: y },
      { x: x, y: y + CUBE_H },
      { x: x - halfW, y: y },
    ], color);

    if (complete) {
      renderer.setGlow(null);
    }

    // Left face (darker)
    const leftColor = darkenColor(color, 0.5);
    renderer.fillPoly([
      { x: x - halfW, y: y },
      { x: x, y: y + CUBE_H },
      { x: x, y: y + CUBE_H + CUBE_DEPTH },
      { x: x - halfW, y: y + CUBE_DEPTH },
    ], leftColor);

    // Right face (slightly darker)
    const rightColor = darkenColor(color, 0.65);
    renderer.fillPoly([
      { x: x + halfW, y: y },
      { x: x, y: y + CUBE_H },
      { x: x, y: y + CUBE_H + CUBE_DEPTH },
      { x: x + halfW, y: y + CUBE_DEPTH },
    ], rightColor);

    // Edge highlights (top edges)
    renderer.drawLine(x - halfW, y, x, y - CUBE_H, 'rgba(255,255,255,0.1)', 1);
    renderer.drawLine(x, y - CUBE_H, x + halfW, y, 'rgba(255,255,255,0.1)', 1);
  }

  function drawDisc(renderer, disc) {
    if (disc.used) return;
    const cubePos = cubeScreenPos(disc.row, disc.side === 'left' ? -1 : disc.row + 1);
    const x = cubePos.x;
    const y = cubePos.y - 5;

    // Spinning disc effect — approximate ellipse with fillCircle + scaling via fillPoly
    const spin = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
    const outerRX = 14;
    const outerRY = 8 * spin;
    const innerRX = 7;
    const innerRY = 4 * spin;

    // Approximate ellipses with polygons
    renderer.setGlow('#f0f', 0.8);
    const outerPts = [];
    const innerPts = [];
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      outerPts.push({ x: x + Math.cos(a) * outerRX, y: y + Math.sin(a) * outerRY });
      innerPts.push({ x: x + Math.cos(a) * innerRX, y: y + Math.sin(a) * innerRY });
    }
    renderer.fillPoly(outerPts, '#f0f');
    renderer.fillPoly(innerPts, '#ff0');
    renderer.setGlow(null);
  }

  function drawQbert(renderer, text) {
    if (deathTimer > 0) {
      if (Math.floor(deathTimer / 4) % 2 === 0) return;
    }

    let pos;
    if (qbert.hopAnim > 0 && qbert.hopFrom && qbert.hopTo) {
      const progress = 1 - qbert.hopAnim / (qbert.onDisc ? HOP_DURATION * 2 : HOP_DURATION);
      pos = getHopPosition(qbert.hopFrom, qbert.hopTo, progress);
    } else {
      pos = cubeCenter(qbert.row, qbert.col);
    }

    const x = pos.x;
    const y = pos.y - 18;

    // Body (round orange character)
    renderer.setGlow('#f80', 0.7);
    renderer.fillCircle(x, y, 12, '#f80');
    renderer.setGlow(null);

    // Eyes
    renderer.fillCircle(x - 4, y - 3, 4, '#fff');
    renderer.fillCircle(x + 4, y - 3, 4, '#fff');

    // Pupils
    renderer.fillCircle(x - 3, y - 3, 2, '#000');
    renderer.fillCircle(x + 5, y - 3, 2, '#000');

    // Nose / snout
    renderer.fillCircle(x, y + 4, 5, '#fa4');

    // Feet
    renderer.fillRect(x - 8, y + 10, 5, 4, '#f60');
    renderer.fillRect(x + 3, y + 10, 5, 4, '#f60');

    // Speech bubble when hit
    if (deathTimer > 40) {
      text.drawText('!@#$%!', x, y - 28, 10, '#fff', 'center');
    }
  }

  function drawEnemy(renderer, text, e) {
    let pos;
    if (e.hopAnim > 0 && e.hopFrom && e.hopTo) {
      const progress = 1 - e.hopAnim / HOP_DURATION;
      pos = getHopPosition(e.hopFrom, e.hopTo, progress);
    } else {
      pos = cubeCenter(e.row, e.col);
    }

    const x = pos.x;
    const y = pos.y - 16;

    if (e.type === 'redball') {
      renderer.setGlow('#f22', 0.6);
      renderer.fillCircle(x, y, 10, '#f22');
      renderer.setGlow(null);
      // Highlight
      renderer.fillCircle(x - 3, y - 3, 4, '#f88');
    } else if (e.type === 'coily') {
      if (e.state === 'egg') {
        // Purple egg — approximate ellipse with polygon
        renderer.setGlow('#a4f', 0.4);
        const eggPts = [];
        const segs = 12;
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          eggPts.push({ x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 11 });
        }
        renderer.fillPoly(eggPts, '#a4f');
        renderer.setGlow(null);
        // Crack lines
        renderer.drawLine(x - 3, y - 2, x, y + 2, '#c8f', 1);
        renderer.drawLine(x, y + 2, x + 3, y - 1, '#c8f', 1);
      } else {
        // Coily snake
        renderer.setGlow('#a4f', 0.7);
        // Body (coiled)
        renderer.fillCircle(x, y + 2, 10, '#a4f');
        // Head
        renderer.fillCircle(x, y - 8, 7, '#c6f');
        renderer.setGlow(null);

        // Eyes (menacing)
        renderer.fillCircle(x - 3, y - 9, 2.5, '#f00');
        renderer.fillCircle(x + 3, y - 9, 2.5, '#f00');

        // Pupils
        renderer.fillCircle(x - 3, y - 9, 1, '#000');
        renderer.fillCircle(x + 3, y - 9, 1, '#000');
      }
    }
  }

  game.start();
  return game;
}
