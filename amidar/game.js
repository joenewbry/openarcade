// amidar/game.js — Amidar game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// Grid configuration
const GRID_COLS = 7;
const GRID_ROWS = 7;
const MARGIN = 30;
const CELL_W = (W - 2 * MARGIN) / GRID_COLS;
const CELL_H = (H - 2 * MARGIN) / GRID_ROWS;
const NODE_COLS = GRID_COLS + 1;
const NODE_ROWS = GRID_ROWS + 1;

// Theme colors
const TRACED_COLOR = '#f4d';
const UNTRACED_COLOR = '#16213e';
const ENEMY_COLOR = '#f44';
const PLAYER_COLOR = '#0ff';
const POWERUP_COLOR = '#ff0';

// Movement speed (frames per grid step)
const PLAYER_SPEED = 6;
const BASE_ENEMY_SPEED = 12;

// ── State ──
let score, best = 0;
let lives, level;
let player, enemies, powerup;
let hEdges, vEdges;
let filledBoxes;
let totalBoxes, filledCount;
let freezeTimer;
let moveTimer;
let enemyMoveTimers;
let frameCount;
let deathAnimation;
let levelCompleteAnim;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

function nodeX(col) { return MARGIN + col * CELL_W; }
function nodeY(row) { return MARGIN + row * CELL_H; }

function getValidDirections(row, col) {
  const dirs = [];
  if (row > 0) dirs.push({ dr: -1, dc: 0 });
  if (row < GRID_ROWS) dirs.push({ dr: 1, dc: 0 });
  if (col > 0) dirs.push({ dr: 0, dc: -1 });
  if (col < GRID_COLS) dirs.push({ dr: 0, dc: 1 });
  return dirs;
}

function chaseDirection(er, ec, pr, pc, validDirs) {
  let bestDist = Infinity;
  let bestDir = validDirs[0];
  for (const d of validDirs) {
    const nr = er + d.dr;
    const nc = ec + d.dc;
    const dist = Math.abs(nr - pr) + Math.abs(nc - pc);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }
  return bestDir;
}

function traceEdge(r1, c1, r2, c2) {
  if (r1 === r2) {
    const c = Math.min(c1, c2);
    hEdges[r1][c] = true;
  } else {
    const r = Math.min(r1, r2);
    vEdges[r][c1] = true;
  }
}

function getEntityX(entity) {
  if (entity.moving) {
    const fromX = nodeX(entity.col);
    const toX = nodeX(entity.targetCol);
    const speed = entity === player ? PLAYER_SPEED : Math.max(BASE_ENEMY_SPEED - level, 5);
    const t = entity.moveProgress / speed;
    return fromX + (toX - fromX) * t;
  }
  return nodeX(entity.col);
}

function getEntityY(entity) {
  if (entity.moving) {
    const fromY = nodeY(entity.row);
    const toY = nodeY(entity.targetRow);
    const speed = entity === player ? PLAYER_SPEED : Math.max(BASE_ENEMY_SPEED - level, 5);
    const t = entity.moveProgress / speed;
    return fromY + (toY - fromY) * t;
  }
  return nodeY(entity.row);
}

function initLevel() {
  hEdges = [];
  for (let r = 0; r < NODE_ROWS; r++) {
    hEdges[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      hEdges[r][c] = false;
    }
  }
  vEdges = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    vEdges[r] = [];
    for (let c = 0; c < NODE_COLS; c++) {
      vEdges[r][c] = false;
    }
  }

  filledBoxes = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    filledBoxes[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      filledBoxes[r][c] = false;
    }
  }
  totalBoxes = GRID_ROWS * GRID_COLS;
  filledCount = 0;

  player = { col: 0, row: 0, targetCol: 0, targetRow: 0, moveProgress: 0, moving: false };
  moveTimer = 0;

  const numEnemies = Math.min(3 + level, 8);
  enemies = [];
  enemyMoveTimers = [];
  for (let i = 0; i < numEnemies; i++) {
    let ec, er;
    do {
      ec = Math.floor(Math.random() * NODE_COLS);
      er = Math.floor(Math.random() * NODE_ROWS);
    } while (ec === 0 && er === 0);
    const dirs = getValidDirections(er, ec);
    const dir = dirs.length > 0 ? dirs[Math.floor(Math.random() * dirs.length)] : { dr: 0, dc: 1 };
    enemies.push({
      col: ec, row: er,
      targetCol: ec, targetRow: er,
      moveProgress: 0, moving: false,
      dir: dir,
      patternType: i % 3
    });
    enemyMoveTimers.push(0);
  }

  freezeTimer = 0;
  powerup = null;
  frameCount = 0;
  deathAnimation = null;
  levelCompleteAnim = 0;
}

function checkFilledBoxes() {
  let newFills = 0;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!filledBoxes[r][c]) {
        const top = hEdges[r][c];
        const bottom = hEdges[r + 1][c];
        const left = vEdges[r][c];
        const right = vEdges[r][c + 1];
        if (top && bottom && left && right) {
          filledBoxes[r][c] = true;
          filledCount++;
          newFills++;
        }
      }
    }
  }

  if (newFills > 0) {
    score += newFills * 100 * level;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }

    if (filledCount >= totalBoxes) {
      levelCompleteAnim = 90;
    }
  }
}

function updatePlayer(input) {
  if (player.moving) {
    player.moveProgress++;
    if (player.moveProgress >= PLAYER_SPEED) {
      const fromCol = player.col;
      const fromRow = player.row;
      player.col = player.targetCol;
      player.row = player.targetRow;
      player.moving = false;
      player.moveProgress = 0;

      traceEdge(fromRow, fromCol, player.row, player.col);
      checkFilledBoxes();
    }
    return;
  }

  let dr = 0, dc = 0;
  if (input.isDown('ArrowUp')) dr = -1;
  else if (input.isDown('ArrowDown')) dr = 1;
  else if (input.isDown('ArrowLeft')) dc = -1;
  else if (input.isDown('ArrowRight')) dc = 1;

  if (dr === 0 && dc === 0) return;

  const newRow = player.row + dr;
  const newCol = player.col + dc;

  if (newRow < 0 || newRow >= NODE_ROWS || newCol < 0 || newCol >= NODE_COLS) return;

  player.targetRow = newRow;
  player.targetCol = newCol;
  player.moving = true;
  player.moveProgress = 0;
}

function updateEnemies() {
  const enemySpeed = Math.max(BASE_ENEMY_SPEED - level, 5);

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];

    if (e.moving) {
      e.moveProgress++;
      if (e.moveProgress >= enemySpeed) {
        e.col = e.targetCol;
        e.row = e.targetRow;
        e.moving = false;
        e.moveProgress = 0;
      }
      continue;
    }

    let dir = e.dir;
    const validDirs = getValidDirections(e.row, e.col);

    if (validDirs.length === 0) continue;

    if (e.patternType === 2) {
      const bestDir = chaseDirection(e.row, e.col, player.row, player.col, validDirs);
      if (Math.random() < 0.7) {
        dir = bestDir;
      } else {
        dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    } else {
      const canContinue = validDirs.some(d => d.dr === dir.dr && d.dc === dir.dc);
      if (!canContinue) {
        const reverse = { dr: -dir.dr, dc: -dir.dc };
        const canReverse = validDirs.some(d => d.dr === reverse.dr && d.dc === reverse.dc);
        if (canReverse && Math.random() < 0.6) {
          dir = reverse;
        } else {
          const perpDirs = validDirs.filter(d => !(d.dr === dir.dr && d.dc === dir.dc));
          dir = perpDirs.length > 0
            ? perpDirs[Math.floor(Math.random() * perpDirs.length)]
            : validDirs[Math.floor(Math.random() * validDirs.length)];
        }
      } else {
        if (validDirs.length > 2 && Math.random() < 0.2) {
          dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        }
      }
    }

    e.dir = dir;
    e.targetRow = e.row + dir.dr;
    e.targetCol = e.col + dir.dc;
    e.moving = true;
    e.moveProgress = 0;
  }
}

function checkCollisions() {
  if (deathAnimation) return;

  const px = getEntityX(player);
  const py = getEntityY(player);

  for (const e of enemies) {
    const ex = getEntityX(e);
    const ey = getEntityY(e);
    const dist = Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);
    if (dist < 8) {
      lives--;
      livesEl.textContent = lives;
      deathAnimation = { timer: 60, x: px, y: py };
      player.moving = false;
      player.moveProgress = 0;
      return;
    }
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    initLevel();
    game.showOverlay('AMIDAR', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Level complete animation
    if (levelCompleteAnim > 0) {
      levelCompleteAnim--;
      if (levelCompleteAnim === 0) {
        level++;
        levelEl.textContent = level;
        score += 500 * level;
        scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; }
        initLevel();
      }
      return;
    }

    // Death animation
    if (deathAnimation) {
      deathAnimation.timer--;
      if (deathAnimation.timer <= 0) {
        deathAnimation = null;
        if (lives <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
          game.setState('over');
          return;
        }
        player.col = 0; player.row = 0;
        player.targetCol = 0; player.targetRow = 0;
        player.moveProgress = 0; player.moving = false;
      }
      return;
    }

    // Freeze timer
    if (freezeTimer > 0) freezeTimer--;

    // Spawn power-up occasionally
    if (!powerup && Math.random() < 0.002 && frameCount > 120) {
      let pc, pr;
      do {
        pc = Math.floor(Math.random() * NODE_COLS);
        pr = Math.floor(Math.random() * NODE_ROWS);
      } while (pc === player.col && pr === player.row);
      powerup = { col: pc, row: pr, timer: 600 };
    }
    if (powerup) {
      powerup.timer--;
      if (powerup.timer <= 0) powerup = null;
    }

    // Update player movement
    updatePlayer(input);

    // Update enemies
    if (freezeTimer <= 0) {
      updateEnemies();
    }

    // Check collision with enemies
    checkCollisions();

    // Check power-up pickup
    if (powerup && !player.moving && player.col === powerup.col && player.row === powerup.row) {
      freezeTimer = 180;
      score += 50;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
      powerup = null;
    }

    // Update gameData for ML
    window.gameData = {
      playerCol: player.col,
      playerRow: player.row,
      enemies: enemies.map(e => ({ col: e.col, row: e.row })),
      filledCount: filledCount,
      totalBoxes: totalBoxes,
      level: level,
      lives: lives,
      frozen: freezeTimer > 0
    };
  };

  game.onDraw = (renderer, text) => {
    const pulsePhase = Math.sin(frameCount * 0.05) * 0.5 + 0.5;

    // Draw filled boxes
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (filledBoxes[r][c]) {
          const x = nodeX(c);
          const y = nodeY(r);
          const alpha = 0.2 + pulsePhase * 0.15;
          renderer.fillRect(x, y, CELL_W, CELL_H, `rgba(255, 68, 221, ${alpha})`);
        }
      }
    }

    // Level complete flash
    if (levelCompleteAnim > 0) {
      const flash = Math.sin(levelCompleteAnim * 0.3) * 0.5 + 0.5;
      renderer.fillRect(0, 0, W, H, `rgba(255, 68, 221, ${flash * 0.3})`);
    }

    // Draw grid edges
    // Horizontal edges
    for (let r = 0; r < NODE_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x1 = nodeX(c);
        const y1 = nodeY(r);
        const x2 = nodeX(c + 1);

        if (hEdges[r][c]) {
          renderer.setGlow('#f4d', 0.5);
          renderer.drawLine(x1, y1, x2, y1, TRACED_COLOR, 2);
          renderer.setGlow(null);
        } else {
          renderer.drawLine(x1, y1, x2, y1, UNTRACED_COLOR, 2);
        }
      }
    }

    // Vertical edges
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < NODE_COLS; c++) {
        const x1 = nodeX(c);
        const y1 = nodeY(r);
        const y2 = nodeY(r + 1);

        if (vEdges[r][c]) {
          renderer.setGlow('#f4d', 0.5);
          renderer.drawLine(x1, y1, x1, y2, TRACED_COLOR, 2);
          renderer.setGlow(null);
        } else {
          renderer.drawLine(x1, y1, x1, y2, UNTRACED_COLOR, 2);
        }
      }
    }

    // Draw intersection nodes
    for (let r = 0; r < NODE_ROWS; r++) {
      for (let c = 0; c < NODE_COLS; c++) {
        const x = nodeX(c);
        const y = nodeY(r);
        let anyTraced = false;
        if (c > 0 && hEdges[r][c - 1]) anyTraced = true;
        if (c < GRID_COLS && hEdges[r][c]) anyTraced = true;
        if (r > 0 && vEdges[r - 1][c]) anyTraced = true;
        if (r < GRID_ROWS && vEdges[r][c]) anyTraced = true;

        renderer.fillCircle(x, y, 3, anyTraced ? TRACED_COLOR : '#2a3a5e');
      }
    }

    // Draw power-up
    if (powerup) {
      const px = nodeX(powerup.col);
      const py = nodeY(powerup.row);
      const blink = Math.sin(frameCount * 0.15) > 0;
      if (blink) {
        renderer.setGlow(POWERUP_COLOR, 0.8);
        renderer.fillCircle(px, py, 7, POWERUP_COLOR);
        renderer.setGlow(null);
        // Lightning bolt approximated as small text
        text.drawText('\u26A1', px, py - 5, 10, '#1a1a2e', 'center');
      }
    }

    // Draw enemies
    const frozen = freezeTimer > 0;
    for (const e of enemies) {
      const ex = getEntityX(e);
      const ey = getEntityY(e);

      let eColor;
      if (frozen) {
        const blink = Math.sin(frameCount * 0.2) > 0;
        eColor = blink ? '#48f' : '#246';
        renderer.setGlow('#48f', 0.6);
      } else {
        eColor = ENEMY_COLOR;
        renderer.setGlow(ENEMY_COLOR, 0.6);
      }

      // Diamond shape
      const diamondPts = [
        { x: ex, y: ey - 7 },
        { x: ex + 7, y: ey },
        { x: ex, y: ey + 7 },
        { x: ex - 7, y: ey }
      ];
      renderer.fillPoly(diamondPts, eColor);
      renderer.setGlow(null);

      // Eyes
      renderer.fillCircle(ex - 2, ey - 1, 1.5, '#fff');
      renderer.fillCircle(ex + 2, ey - 1, 1.5, '#fff');
    }

    // Draw death animation
    if (deathAnimation) {
      const t = 1 - deathAnimation.timer / 60;
      const radius = 5 + t * 30;
      const alpha = 1 - t;
      const ringColor = `rgba(0, 255, 255, ${alpha})`;

      renderer.setGlow(PLAYER_COLOR, 0.8);

      // Outer ring approximated with polygon (circle outline)
      const outerPts = [];
      const segs = 24;
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        outerPts.push({ x: deathAnimation.x + Math.cos(angle) * radius, y: deathAnimation.y + Math.sin(angle) * radius });
      }
      renderer.strokePoly(outerPts, ringColor, 2, true);

      // Inner ring
      const innerPts = [];
      const innerR = radius * 0.5;
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        innerPts.push({ x: deathAnimation.x + Math.cos(angle) * innerR, y: deathAnimation.y + Math.sin(angle) * innerR });
      }
      renderer.strokePoly(innerPts, ringColor, 2, true);

      renderer.setGlow(null);
    }

    // Draw player (if not in death animation)
    if (!deathAnimation) {
      const px = getEntityX(player);
      const py = getEntityY(player);

      renderer.setGlow(PLAYER_COLOR, 0.7);
      renderer.fillCircle(px, py, 7, PLAYER_COLOR);
      renderer.setGlow(null);

      // Inner highlight
      renderer.fillCircle(px - 2, py - 2, 3, 'rgba(255, 255, 255, 0.4)');
    }

    // Draw freeze indicator
    if (freezeTimer > 0) {
      const freezeAlpha = 0.3 + Math.sin(frameCount * 0.1) * 0.15;
      text.drawText('FROZEN', W / 2, H - 14, 14, `rgba(72, 136, 255, ${freezeAlpha})`, 'center');
    }

    // Progress bar at bottom
    const barY = H - 4;
    const barW = W - 2 * MARGIN;
    const barX = MARGIN;
    renderer.fillRect(barX, barY, barW, 3, '#16213e');
    renderer.setGlow('#f4d', 0.4);
    renderer.fillRect(barX, barY, barW * (filledCount / totalBoxes), 3, TRACED_COLOR);
    renderer.setGlow(null);
  };

  game.start();
  return game;
}
