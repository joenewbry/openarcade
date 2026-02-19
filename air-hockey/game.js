// air-hockey/game.js — Air Hockey game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// Theme colors
const THEME = '#6cf';
const CPU_COLOR = '#f66';

// Table dimensions
const TABLE_MARGIN = 10;
const GOAL_WIDTH = 120;
const GOAL_HALF = GOAL_WIDTH / 2;
const GOAL_DEPTH = 8;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;
const CENTER_CIRCLE_R = 50;

// Mallet and puck sizes
const MALLET_R = 22;
const PUCK_R = 14;
const WIN_SCORE = 7;

// Physics
const FRICTION = 0.995;
const WALL_BOUNCE = 0.85;
const MAX_PUCK_SPEED = 14;
const MALLET_MASS = 3;
const PUCK_MASS = 1;

// CPU AI
const CPU_SPEED = 4.5;
const CPU_REACTION_DELAY = 0.06;

// ── State ──
let score, cpuScore;
let puck, playerMallet, cpuMallet;
let mouseX, mouseY;
let puckTrail;
let flashAlpha;
let goalPauseTimer;
let lastGoalScorer;
let goalTextAlpha;
let goalText;
let cpuIdlePhase; // for CPU idle oscillation without Date.now()

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const matchPointEl = document.getElementById('matchPoint');

// ── Helpers ──
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function magnitude(vx, vy) {
  return Math.sqrt(vx * vx + vy * vy);
}

function resetPuck() {
  puck.x = CENTER_X;
  puck.y = CENTER_Y;
  puck.vx = 0;
  puck.vy = 0;
  puckTrail = [];
  goalPauseTimer = 60; // ~1 second pause at 60Hz
}

function resetTable() {
  puck = { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 };
  playerMallet = { x: CENTER_X, y: H - 80, vx: 0, vy: 0 };
  cpuMallet = { x: CENTER_X, y: 80, vx: 0, vy: 0 };
  mouseX = CENTER_X;
  mouseY = H - 80;
  puckTrail = [];
  flashAlpha = 0;
  goalPauseTimer = 0;
  goalTextAlpha = 0;
  cpuIdlePhase = 0;
}

function collideMalletPuck(mallet) {
  const dx = puck.x - mallet.x;
  const dy = puck.y - mallet.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const minDist = MALLET_R + PUCK_R;

  if (d < minDist && d > 0) {
    // Separate puck from mallet
    const nx = dx / d;
    const ny = dy / d;
    const overlap = minDist - d;
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    // Relative velocity
    const dvx = puck.vx - mallet.vx;
    const dvy = puck.vy - mallet.vy;
    const dvDotN = dvx * nx + dvy * ny;

    // Only resolve if objects are approaching
    if (dvDotN < 0) {
      const restitution = 0.9;
      const impulse = -(1 + restitution) * dvDotN / (1 / PUCK_MASS + 1 / MALLET_MASS);
      puck.vx += (impulse / PUCK_MASS) * nx;
      puck.vy += (impulse / PUCK_MASS) * ny;

      // Flash effect on hard hits
      const hitSpeed = magnitude(mallet.vx, mallet.vy);
      if (hitSpeed > 6) {
        flashAlpha = Math.min(0.4, hitSpeed * 0.03);
      }
    }
  }
}

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // Mouse tracking — need raw mouse position for this game
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mouseenter', () => {
    if (game.state === 'waiting') {
      game.setState('playing');
      // Give initial puck nudge toward the player who was scored on
      if (lastGoalScorer === 1) {
        puck.vy = -2; // toward CPU
      } else {
        puck.vy = 2; // toward player
      }
    }
  });

  canvas.addEventListener('click', () => {
    if (game.state === 'waiting') {
      game.setState('playing');
      if (lastGoalScorer === 1) {
        puck.vy = -2;
      } else {
        puck.vy = 2;
      }
    } else if (game.state === 'over') {
      game.onInit();
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Init ──
  game.onInit = () => {
    score = 0;
    cpuScore = 0;
    lastGoalScorer = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';
    matchPointEl.style.display = 'none';
    resetTable();
    game.showOverlay('AIR HOCKEY', 'Move mouse over table to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ── Scoring ──
  function playerScored() {
    score++;
    scoreEl.textContent = score;
    lastGoalScorer = 1;
    goalText = 'GOAL!';
    goalTextAlpha = 1;
    flashAlpha = 0.3;
    checkWin();
  }

  function cpuScored() {
    cpuScore++;
    bestEl.textContent = cpuScore;
    lastGoalScorer = -1;
    goalText = 'CPU SCORES';
    goalTextAlpha = 1;
    flashAlpha = 0.2;
    checkWin();
  }

  function checkWin() {
    if (score >= WIN_SCORE - 1 || cpuScore >= WIN_SCORE - 1) {
      matchPointEl.style.display = 'block';
    }

    if (score >= WIN_SCORE) {
      game.showOverlay('YOU WIN!', `${score} - ${cpuScore} -- Move mouse to play again`);
      game.setState('over');
      return;
    }
    if (cpuScore >= WIN_SCORE) {
      game.showOverlay('CPU WINS', `${score} - ${cpuScore} -- Move mouse to play again`);
      game.setState('over');
      return;
    }
    resetPuck();
  }

  // ── CPU AI ──
  function updateCPU() {
    let targetX = CENTER_X;
    let targetY = 80;

    if (puck.vy < 0 && puck.y < CENTER_Y + 50) {
      targetX = puck.x + puck.vx * 5;
      targetY = clamp(puck.y + puck.vy * 3, TABLE_MARGIN + MALLET_R, CENTER_Y - MALLET_R);
    } else if (puck.vy < 0) {
      targetX = puck.x + puck.vx * 10;
      targetY = CENTER_Y * 0.4;
    } else {
      targetX = CENTER_X + (puck.x - CENTER_X) * 0.2;
      // Use frame counter for idle oscillation instead of Date.now()
      targetY = 70 + Math.sin(cpuIdlePhase * 0.12) * 15;
    }

    targetX = clamp(targetX, TABLE_MARGIN + MALLET_R, W - TABLE_MARGIN - MALLET_R);
    targetY = clamp(targetY, TABLE_MARGIN + MALLET_R, CENTER_Y - MALLET_R);

    const dx = targetX - cpuMallet.x;
    const dy = targetY - cpuMallet.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    const difficultyBoost = Math.max(0, cpuScore - score) * 0.3;
    const speed = CPU_SPEED + difficultyBoost;

    if (d > 1) {
      const moveX = (dx / d) * Math.min(speed, d * CPU_REACTION_DELAY + speed * 0.5);
      const moveY = (dy / d) * Math.min(speed, d * CPU_REACTION_DELAY + speed * 0.5);
      cpuMallet.vx = moveX;
      cpuMallet.vy = moveY;
      cpuMallet.x += moveX;
      cpuMallet.y += moveY;
    } else {
      cpuMallet.vx = 0;
      cpuMallet.vy = 0;
    }

    cpuMallet.x = clamp(cpuMallet.x, TABLE_MARGIN + MALLET_R, W - TABLE_MARGIN - MALLET_R);
    cpuMallet.y = clamp(cpuMallet.y, TABLE_MARGIN + MALLET_R, CENTER_Y - MALLET_R);
  }

  // ── Update ──
  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from keyboard
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.setState('playing');
        if (lastGoalScorer === 1) {
          puck.vy = -2;
        } else {
          puck.vy = 2;
        }
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    cpuIdlePhase++;

    // Goal pause countdown
    if (goalPauseTimer > 0) {
      goalPauseTimer--;
      if (goalTextAlpha > 0) goalTextAlpha -= 0.02;
      return;
    }

    // Fade effects
    if (flashAlpha > 0) flashAlpha -= 0.05;
    if (goalTextAlpha > 0) goalTextAlpha -= 0.015;

    // --- Player mallet ---
    const targetX = clamp(mouseX, TABLE_MARGIN + MALLET_R, W - TABLE_MARGIN - MALLET_R);
    const targetY = clamp(mouseY, CENTER_Y + MALLET_R, H - TABLE_MARGIN - MALLET_R);

    playerMallet.vx = targetX - playerMallet.x;
    playerMallet.vy = targetY - playerMallet.y;
    playerMallet.x = targetX;
    playerMallet.y = targetY;

    // --- CPU mallet AI ---
    updateCPU();

    // --- Puck physics ---
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    // Clamp puck speed
    const pSpeed = magnitude(puck.vx, puck.vy);
    if (pSpeed > MAX_PUCK_SPEED) {
      puck.vx = (puck.vx / pSpeed) * MAX_PUCK_SPEED;
      puck.vy = (puck.vy / pSpeed) * MAX_PUCK_SPEED;
    }

    // Puck trail
    if (pSpeed > 1) {
      puckTrail.push({ x: puck.x, y: puck.y, alpha: 0.6 });
    }
    for (let i = puckTrail.length - 1; i >= 0; i--) {
      puckTrail[i].alpha -= 0.04;
      if (puckTrail[i].alpha <= 0) puckTrail.splice(i, 1);
    }

    // Wall collisions — Left wall
    if (puck.x - PUCK_R < TABLE_MARGIN) {
      puck.x = TABLE_MARGIN + PUCK_R;
      puck.vx = Math.abs(puck.vx) * WALL_BOUNCE;
    }
    // Right wall
    if (puck.x + PUCK_R > W - TABLE_MARGIN) {
      puck.x = W - TABLE_MARGIN - PUCK_R;
      puck.vx = -Math.abs(puck.vx) * WALL_BOUNCE;
    }

    // Top wall (with goal opening)
    if (puck.y - PUCK_R < TABLE_MARGIN) {
      if (puck.x > CENTER_X - GOAL_HALF + PUCK_R && puck.x < CENTER_X + GOAL_HALF - PUCK_R) {
        if (puck.y < -PUCK_R) {
          playerScored();
          return;
        }
      } else {
        puck.y = TABLE_MARGIN + PUCK_R;
        puck.vy = Math.abs(puck.vy) * WALL_BOUNCE;
        if (puck.x >= CENTER_X - GOAL_HALF - PUCK_R && puck.x <= CENTER_X - GOAL_HALF + PUCK_R) {
          puck.vx = Math.abs(puck.vx) * WALL_BOUNCE;
        }
        if (puck.x >= CENTER_X + GOAL_HALF - PUCK_R && puck.x <= CENTER_X + GOAL_HALF + PUCK_R) {
          puck.vx = -Math.abs(puck.vx) * WALL_BOUNCE;
        }
      }
    }

    // Bottom wall (with goal opening)
    if (puck.y + PUCK_R > H - TABLE_MARGIN) {
      if (puck.x > CENTER_X - GOAL_HALF + PUCK_R && puck.x < CENTER_X + GOAL_HALF - PUCK_R) {
        if (puck.y > H + PUCK_R) {
          cpuScored();
          return;
        }
      } else {
        puck.y = H - TABLE_MARGIN - PUCK_R;
        puck.vy = -Math.abs(puck.vy) * WALL_BOUNCE;
        if (puck.x >= CENTER_X - GOAL_HALF - PUCK_R && puck.x <= CENTER_X - GOAL_HALF + PUCK_R) {
          puck.vx = Math.abs(puck.vx) * WALL_BOUNCE;
        }
        if (puck.x >= CENTER_X + GOAL_HALF - PUCK_R && puck.x <= CENTER_X + GOAL_HALF + PUCK_R) {
          puck.vx = -Math.abs(puck.vx) * WALL_BOUNCE;
        }
      }
    }

    // Mallet-puck collisions
    collideMalletPuck(playerMallet);
    collideMalletPuck(cpuMallet);

    // Keep puck within table bounds (safety)
    puck.x = clamp(puck.x, TABLE_MARGIN + PUCK_R, W - TABLE_MARGIN - PUCK_R);

    // Update game data for ML
    window.gameData = {
      puckX: puck.x, puckY: puck.y,
      puckVX: puck.vx, puckVY: puck.vy,
      playerX: playerMallet.x, playerY: playerMallet.y,
      cpuX: cpuMallet.x, cpuY: cpuMallet.y,
      playerScore: score, cpuScore: cpuScore
    };
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Table surface (darker inner area)
    renderer.fillRect(TABLE_MARGIN, TABLE_MARGIN, W - TABLE_MARGIN * 2, H - TABLE_MARGIN * 2, '#141428');

    // Table border / rink walls
    // Left wall
    renderer.drawLine(TABLE_MARGIN, TABLE_MARGIN, TABLE_MARGIN, H - TABLE_MARGIN, '#0f3460', 2);
    // Right wall
    renderer.drawLine(W - TABLE_MARGIN, TABLE_MARGIN, W - TABLE_MARGIN, H - TABLE_MARGIN, '#0f3460', 2);
    // Top wall with goal gap
    renderer.drawLine(TABLE_MARGIN, TABLE_MARGIN, CENTER_X - GOAL_HALF, TABLE_MARGIN, '#0f3460', 2);
    renderer.drawLine(CENTER_X + GOAL_HALF, TABLE_MARGIN, W - TABLE_MARGIN, TABLE_MARGIN, '#0f3460', 2);
    // Bottom wall with goal gap
    renderer.drawLine(TABLE_MARGIN, H - TABLE_MARGIN, CENTER_X - GOAL_HALF, H - TABLE_MARGIN, '#0f3460', 2);
    renderer.drawLine(CENTER_X + GOAL_HALF, H - TABLE_MARGIN, W - TABLE_MARGIN, H - TABLE_MARGIN, '#0f3460', 2);

    // Goal zones
    drawGoal(renderer, CENTER_X, TABLE_MARGIN, CPU_COLOR, true);
    drawGoal(renderer, CENTER_X, H - TABLE_MARGIN, THEME, false);

    // Center dashed line
    renderer.dashedLine(TABLE_MARGIN, CENTER_Y, W - TABLE_MARGIN, CENTER_Y, '#0f3460', 1, 6, 6);

    // Center circle (approximate with polygon)
    const circlePoints = [];
    const segments = 40;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circlePoints.push({ x: CENTER_X + Math.cos(angle) * CENTER_CIRCLE_R, y: CENTER_Y + Math.sin(angle) * CENTER_CIRCLE_R });
    }
    renderer.strokePoly(circlePoints, '#0f3460', 1.5, true);

    // Center dot
    renderer.fillCircle(CENTER_X, CENTER_Y, 4, '#0f3460');

    // Big score display in background (dim)
    text.drawText(String(cpuScore), CENTER_X, CENTER_Y * 0.45 - 36, 72, '#16213e', 'center');
    text.drawText(String(score), CENTER_X, H - CENTER_Y * 0.45 - 36, 72, '#16213e', 'center');

    // Puck trail
    for (const t of puckTrail) {
      const trailAlpha = t.alpha * 0.3;
      const r = PUCK_R * t.alpha;
      renderer.fillCircle(t.x, t.y, r, `rgba(255, 255, 255, ${trailAlpha})`);
    }

    // Puck
    renderer.setGlow('#fff', 0.6);
    renderer.fillCircle(puck.x, puck.y, PUCK_R, '#fff');
    renderer.setGlow(null);
    // Inner ring on puck (approximate with stroke polygon circle)
    const puckRingPoints = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      puckRingPoints.push({ x: puck.x + Math.cos(angle) * PUCK_R * 0.6, y: puck.y + Math.sin(angle) * PUCK_R * 0.6 });
    }
    renderer.strokePoly(puckRingPoints, 'rgba(200, 200, 200, 0.4)', 1, true);

    // Player mallet (bottom)
    drawMallet(renderer, playerMallet.x, playerMallet.y, THEME);

    // CPU mallet (top)
    drawMallet(renderer, cpuMallet.x, cpuMallet.y, CPU_COLOR);

    // Flash overlay on hard hits or goals
    if (flashAlpha > 0) {
      renderer.fillRect(0, 0, W, H, `rgba(255, 255, 255, ${flashAlpha})`);
    }

    // Goal text
    if (goalTextAlpha > 0) {
      const gtColor = lastGoalScorer === 1 ? THEME : CPU_COLOR;
      renderer.setGlow(gtColor, 0.8);
      text.drawText(goalText, CENTER_X, CENTER_Y - 18, 36, gtColor, 'center');
      renderer.setGlow(null);
    }
  };

  function drawGoal(renderer, cx, y, color, isTop) {
    // Goal area glow
    const glowColor = color === CPU_COLOR ? 'rgba(255, 102, 102, 0.15)' : 'rgba(102, 204, 255, 0.15)';
    if (isTop) {
      renderer.fillRect(cx - GOAL_HALF, y - GOAL_DEPTH, GOAL_WIDTH, GOAL_DEPTH, glowColor);
    } else {
      renderer.fillRect(cx - GOAL_HALF, y, GOAL_WIDTH, GOAL_DEPTH, glowColor);
    }

    // Goal posts
    renderer.setGlow(color, 0.5);
    renderer.fillCircle(cx - GOAL_HALF, y, 4, color);
    renderer.fillCircle(cx + GOAL_HALF, y, 4, color);
    renderer.setGlow(null);

    // Goal back lines (three lines forming U-shape)
    if (isTop) {
      renderer.drawLine(cx - GOAL_HALF, y - GOAL_DEPTH, cx - GOAL_HALF, y, color, 2);
      renderer.drawLine(cx + GOAL_HALF, y - GOAL_DEPTH, cx + GOAL_HALF, y, color, 2);
      renderer.drawLine(cx - GOAL_HALF, y - GOAL_DEPTH, cx + GOAL_HALF, y - GOAL_DEPTH, color, 2);
    } else {
      renderer.drawLine(cx - GOAL_HALF, y, cx - GOAL_HALF, y + GOAL_DEPTH, color, 2);
      renderer.drawLine(cx + GOAL_HALF, y, cx + GOAL_HALF, y + GOAL_DEPTH, color, 2);
      renderer.drawLine(cx - GOAL_HALF, y + GOAL_DEPTH, cx + GOAL_HALF, y + GOAL_DEPTH, color, 2);
    }
  }

  function drawMallet(renderer, x, y, color) {
    const rgbaBase = color === CPU_COLOR ? 'rgba(255, 102, 102, ' : 'rgba(102, 204, 255, ';

    // Outer glow ring (approximate with stroke polygon circle)
    const outerPoints = [];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      outerPoints.push({ x: x + Math.cos(angle) * (MALLET_R + 3), y: y + Math.sin(angle) * (MALLET_R + 3) });
    }
    renderer.strokePoly(outerPoints, rgbaBase + '0.3)', 3, true);

    // Main mallet body
    renderer.setGlow(color, 0.6);
    renderer.fillCircle(x, y, MALLET_R, color);
    renderer.setGlow(null);

    // Inner ring
    const innerPoints = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      innerPoints.push({ x: x + Math.cos(angle) * MALLET_R * 0.55, y: y + Math.sin(angle) * MALLET_R * 0.55 });
    }
    renderer.strokePoly(innerPoints, rgbaBase + '0.5)', 2, true);

    // Center highlight
    renderer.fillCircle(x - 3, y - 3, MALLET_R * 0.3, 'rgba(255, 255, 255, 0.2)');
  }

  game.start();
  return game;
}
