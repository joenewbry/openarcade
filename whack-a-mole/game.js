// whack-a-mole/game.js — Whack-a-Mole game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// Game constants
const GRID_COLS = 3;
const GRID_ROWS = 3;
const HOLE_RX = 50;
const HOLE_RY = 20;
const MOLE_RADIUS = 30;
const GAME_DURATION = 60;

// Grid layout
const GRID_OFFSET_X = 80;
const GRID_OFFSET_Y = 100;
const CELL_W = (W - GRID_OFFSET_X * 2) / GRID_COLS;
const CELL_H = (H - GRID_OFFSET_Y - 40) / GRID_ROWS;

// Mole types
const MOLE_NORMAL = 'normal';
const MOLE_GOLDEN = 'golden';
const MOLE_BOMB = 'bomb';

// ── State ──
let score, best = 0, lives;
let holes = [];
let timeLeft;
let timerInterval;
let effects = [];
let missEffects = [];
let popInterval, popDuration, popTimer, maxMolesUp;
let frameCounter = 0;

// DOM refs
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function getHoleCenter(row, col) {
  return {
    x: GRID_OFFSET_X + col * CELL_W + CELL_W / 2,
    y: GRID_OFFSET_Y + row * CELL_H + CELL_H / 2 + 30
  };
}

function schedulePop(game) {
  if (game.state !== 'playing') return;
  const jitter = popInterval * 0.4;
  const delay = popInterval + (Math.random() * jitter * 2 - jitter);
  popTimer = setTimeout(() => {
    popMole(game);
    schedulePop(game);
  }, Math.max(200, delay));
}

function popMole(game) {
  if (game.state !== 'playing') return;
  const molesUp = holes.filter(h => h.moleUp && !h.whacked).length;
  if (molesUp >= maxMolesUp) return;

  const available = holes.filter(h => !h.moleUp && h.popProgress === 0);
  if (available.length === 0) return;

  const hole = available[Math.floor(Math.random() * available.length)];
  const rand = Math.random();
  if (rand < 0.05) {
    hole.moleType = MOLE_GOLDEN;
  } else if (rand < 0.18) {
    hole.moleType = MOLE_BOMB;
  } else {
    hole.moleType = MOLE_NORMAL;
  }

  hole.moleUp = true;
  hole.whacked = false;
  hole.popDirection = 1;

  const duration = popDuration + (Math.random() * 400 - 200);
  hole.moleTimer = setTimeout(() => {
    if (hole.moleUp && !hole.whacked) {
      hole.popDirection = -1;
    }
  }, duration);
}

function addEffect(x, y, type) {
  const stars = [];
  const starCount = type === 'golden' ? 10 : (type === 'bomb' ? 6 : 5);
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 25;
    let color;
    if (type === 'golden') color = Math.random() > 0.5 ? '#ffd700' : '#fff';
    else if (type === 'bomb') color = Math.random() > 0.5 ? '#f44' : '#f80';
    else color = Math.random() > 0.5 ? '#fc8' : '#fff';
    stars.push({
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color
    });
  }
  effects.push({ x, y, type, life: 1.0, stars });
}

function whackMole(hole, game) {
  if (hole.whacked || !hole.moleUp) return;

  hole.whacked = true;
  clearTimeout(hole.moleTimer);

  if (hole.moleType === MOLE_BOMB) {
    score = Math.max(0, score - 20);
    lives--;
    scoreEl.textContent = score;
    addEffect(hole.cx, hole.cy - 40, 'bomb');

    if (lives <= 0) {
      doGameOver(game);
      return;
    }
  } else if (hole.moleType === MOLE_GOLDEN) {
    score += 50;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
    addEffect(hole.cx, hole.cy - 40, 'golden');
  } else {
    score += 10;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
    addEffect(hole.cx, hole.cy - 40, 'whack');
  }

  setTimeout(() => {
    hole.popDirection = -1;
  }, 200);
}

function doGameOver(game) {
  clearInterval(timerInterval);
  clearTimeout(popTimer);

  holes.forEach(h => {
    clearTimeout(h.moleTimer);
    h.moleUp = false;
    h.popProgress = 0;
    h.popDirection = 0;
  });

  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  game.showOverlay('GAME OVER', `Score: ${score} -- Click or press SPACE to restart`);
  game.setState('over');
}

function startPlaying(game) {
  game.hideOverlay();
  game.setState('playing');

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      doGameOver(game);
    }
    const elapsed = GAME_DURATION - timeLeft;
    if (elapsed < 15) {
      popInterval = 1200; popDuration = 1800; maxMolesUp = 2;
    } else if (elapsed < 30) {
      popInterval = 900; popDuration = 1400; maxMolesUp = 3;
    } else if (elapsed < 45) {
      popInterval = 650; popDuration = 1100; maxMolesUp = 4;
    } else {
      popInterval = 450; popDuration = 800; maxMolesUp = 5;
    }
  }, 1000);

  schedulePop(game);
}

// ── Ellipse helper: draw an ellipse as a filled polygon ──
function fillEllipse(renderer, cx, cy, rx, ry, color, segments) {
  const n = segments || 32;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  renderer.fillPoly(pts, color);
}

function strokeEllipse(renderer, cx, cy, rx, ry, color, width, segments) {
  const n = segments || 32;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  renderer.strokePoly(pts, color, width || 1.5, true);
}

// Draw half-ellipse (top half only, for hole highlight arc)
function strokeEllipseArc(renderer, cx, cy, rx, ry, color, width, startAngle, endAngle, segments) {
  const n = segments || 16;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / n);
    pts.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  renderer.strokePoly(pts, color, width || 1, false);
}

// ── Draw star shape as filled polygon ──
function drawStar(renderer, x, y, size, innerRatio, color) {
  const spikes = 4;
  const outerR = size;
  const innerR = size * innerRatio;
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
  }
  renderer.fillPoly(pts, color);
}

// Draw the rounded rect for the ground area using fillPoly approximation
function fillRoundedRect(renderer, x, y, w, h, r, color) {
  // Approximate rounded rectangle with a polygon
  const pts = [];
  const segments = 8;
  // Top-left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / segments);
    pts.push({ x: x + r + Math.cos(angle) * r, y: y + r + Math.sin(angle) * r });
  }
  // Top-right corner
  for (let i = 0; i <= segments; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * (i / segments);
    pts.push({ x: x + w - r + Math.cos(angle) * r, y: y + r + Math.sin(angle) * r });
  }
  // Bottom-right corner
  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI / 2) * (i / segments);
    pts.push({ x: x + w - r + Math.cos(angle) * r, y: y + h - r + Math.sin(angle) * r });
  }
  // Bottom-left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (i / segments);
    pts.push({ x: x + r + Math.cos(angle) * r, y: y + h - r + Math.sin(angle) * r });
  }
  renderer.fillPoly(pts, color);
}

// ── Clip simulation: draw mole parts only above the hole ──
// Instead of canvas clip(), we draw the mole body as a polygon clipped at hole y
function fillClippedEllipse(renderer, cx, cy, rx, ry, clipY, color, segments) {
  const n = segments || 32;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    let py = cy + Math.sin(angle) * ry;
    if (py > clipY) py = clipY;
    pts.push({ x: cx + Math.cos(angle) * rx, y: py });
  }
  renderer.fillPoly(pts, color);
}

// Fill circle as polygon
function fillCirclePoly(renderer, cx, cy, r, color, segments) {
  fillEllipse(renderer, cx, cy, r, r, color, segments || 24);
}

// Draw mole eyes as X when whacked
function drawWhackedEyes(renderer, cx, moleY) {
  const eyeSize = 4;
  const lw = 2;
  // Left eye X
  renderer.drawLine(cx - 10 - eyeSize, moleY - 8 - eyeSize, cx - 10 + eyeSize, moleY - 8 + eyeSize, '#111', lw);
  renderer.drawLine(cx - 10 + eyeSize, moleY - 8 - eyeSize, cx - 10 - eyeSize, moleY - 8 + eyeSize, '#111', lw);
  // Right eye X
  renderer.drawLine(cx + 10 - eyeSize, moleY - 8 - eyeSize, cx + 10 + eyeSize, moleY - 8 + eyeSize, '#111', lw);
  renderer.drawLine(cx + 10 + eyeSize, moleY - 8 - eyeSize, cx + 10 - eyeSize, moleY - 8 + eyeSize, '#111', lw);
}

function drawNormalEyes(renderer, cx, moleY) {
  // Whites
  fillCirclePoly(renderer, cx - 10, moleY - 8, 6, '#fff', 16);
  fillCirclePoly(renderer, cx + 10, moleY - 8, 6, '#fff', 16);
  // Pupils
  fillCirclePoly(renderer, cx - 10, moleY - 7, 3, '#111', 12);
  fillCirclePoly(renderer, cx + 10, moleY - 7, 3, '#111', 12);
}

function drawAngryBrows(renderer, cx, moleY) {
  renderer.drawLine(cx - 16, moleY - 16, cx - 6, moleY - 13, '#111', 2);
  renderer.drawLine(cx + 16, moleY - 16, cx + 6, moleY - 13, '#111', 2);
}

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  game.onInit = () => {
    score = 0;
    lives = 3;
    timeLeft = GAME_DURATION;
    scoreEl.textContent = '0';
    effects = [];
    missEffects = [];
    frameCounter = 0;

    holes = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const center = getHoleCenter(r, c);
        holes.push({
          row: r, col: c,
          cx: center.x, cy: center.y,
          moleUp: false,
          moleType: MOLE_NORMAL,
          moleTimer: null,
          popProgress: 0,
          popDirection: 0,
          whacked: false
        });
      }
    }

    popInterval = 1200;
    popDuration = 1800;
    maxMolesUp = 2;

    clearInterval(timerInterval);
    clearTimeout(popTimer);

    game.showOverlay('WHACK-A-MOLE', 'Click or press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse click handler
  canvas.addEventListener('click', (e) => {
    if (game.state === 'waiting') {
      startPlaying(game);
      return;
    }
    if (game.state === 'over') {
      game.onInit();
      return;
    }
    if (game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hitSomething = false;
    holes.forEach(h => {
      if (!h.moleUp || h.whacked || h.popProgress < 0.3) return;
      const moleRise = h.popProgress * (MOLE_RADIUS * 2 + 10);
      const moleY = h.cy - moleRise + MOLE_RADIUS;
      const dx = mx - h.cx;
      const dy = my - moleY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOLE_RADIUS + 10) {
        whackMole(h, game);
        hitSomething = true;
      }
    });

    if (!hitSomething) {
      missEffects.push({ x: mx, y: my, life: 1.0 });
    }
  });

  game.onUpdate = () => {
    const input = game.input;
    frameCounter++;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
        startPlaying(game);
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

    // Animate mole pop progress
    const popSpeed = 0.08;
    holes.forEach(h => {
      if (h.popDirection === 1) {
        h.popProgress = Math.min(1, h.popProgress + popSpeed);
        if (h.popProgress >= 1) h.popDirection = 0;
      } else if (h.popDirection === -1) {
        h.popProgress = Math.max(0, h.popProgress - popSpeed);
        if (h.popProgress <= 0) {
          h.popDirection = 0;
          h.moleUp = false;
          h.whacked = false;
        }
      }
    });

    // Update effects
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].life -= 0.02;
      effects[i].y -= 0.8;
      if (effects[i].life <= 0) effects.splice(i, 1);
    }
    for (let i = missEffects.length - 1; i >= 0; i--) {
      missEffects[i].life -= 0.03;
      if (missEffects[i].life <= 0) missEffects.splice(i, 1);
    }

    // Update gameData for ML
    window.gameData = {
      score,
      timeLeft,
      lives,
      holes: holes.map(h => ({
        row: h.row, col: h.col,
        moleUp: h.moleUp, moleType: h.moleType,
        whacked: h.whacked, popProgress: h.popProgress
      }))
    };
  };

  game.onDraw = (renderer, text) => {
    // Grass/ground area
    fillRoundedRect(renderer, 20, 60, W - 40, H - 80, 16, '#1a2a1e');

    // Subtle grid lines
    for (let c = 1; c < GRID_COLS; c++) {
      const x = GRID_OFFSET_X + c * CELL_W;
      renderer.drawLine(x, 70, x, H - 30, '#1a3a1e', 1);
    }
    for (let r = 1; r < GRID_ROWS; r++) {
      const y = GRID_OFFSET_Y + r * CELL_H;
      renderer.drawLine(30, y, W - 30, y, '#1a3a1e', 1);
    }

    // Draw holes and moles
    holes.forEach(h => {
      drawHoleAndMole(renderer, text, h);
    });

    // Draw whack/golden/bomb effects
    effects.forEach(e => {
      // Fade color by multiplying alpha into hex
      const alpha = Math.max(0, Math.min(1, e.life));
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

      if (e.type === 'whack') {
        renderer.setGlow('#fc8', 0.4 * alpha);
        text.drawText('WHACK!', e.x, e.y, 20, '#ffcc88' + alphaHex, 'center');
      } else if (e.type === 'golden') {
        renderer.setGlow('#ffd700', 0.4 * alpha);
        text.drawText('+50!', e.x, e.y, 20, '#ffd700' + alphaHex, 'center');
      } else if (e.type === 'bomb') {
        renderer.setGlow('#f44', 0.4 * alpha);
        text.drawText('OUCH! -20', e.x, e.y, 20, '#ff4444' + alphaHex, 'center');
      }
      renderer.setGlow(null);

      // Star particles
      if (e.stars) {
        e.stars.forEach(s => {
          const sx = e.x + s.dx * (1 - e.life) * 3;
          const sy = e.y + s.dy * (1 - e.life) * 3;
          const sz = s.size * e.life;
          if (sz > 0.3) {
            renderer.setGlow(s.color, 0.3 * alpha);
            renderer.fillCircle(sx, sy, sz, s.color);
          }
        });
        renderer.setGlow(null);
      }
    });

    // Draw miss effects (red X)
    missEffects.forEach(e => {
      const alpha = Math.max(0, e.life * 0.6);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      const c = '#ff4444' + alphaHex;
      const s = 12;
      renderer.setGlow('#f44', 0.3 * alpha);
      renderer.drawLine(e.x - s, e.y - s, e.x + s, e.y + s, c, 3);
      renderer.drawLine(e.x + s, e.y - s, e.x - s, e.y + s, c, 3);
      renderer.setGlow(null);
    });

    // HUD
    drawHUD(renderer, text);
  };

  function drawHoleAndMole(renderer, text, h) {
    const cx = h.cx;
    const cy = h.cy;

    // Dirt mound behind hole
    fillEllipse(renderer, cx, cy + 8, HOLE_RX + 8, HOLE_RY + 6, '#2a1a0a', 24);

    // Mole (drawn above hole, clipped at hole edge)
    if (h.popProgress > 0) {
      const moleRise = h.popProgress * (MOLE_RADIUS * 2 + 10);
      const moleY = cy - moleRise + MOLE_RADIUS;
      const clipY = cy - 2;

      // Colors based on type
      let bodyColor, bellyColor, glowColor, glowIntensity;
      if (h.moleType === MOLE_GOLDEN) {
        bodyColor = '#ffd700'; bellyColor = '#ffe44d'; glowColor = '#ffd700'; glowIntensity = 0.6;
      } else if (h.moleType === MOLE_BOMB) {
        bodyColor = '#c03030'; bellyColor = '#e05050'; glowColor = '#f44'; glowIntensity = 0.4;
      } else {
        bodyColor = '#8B6914'; bellyColor = '#c89830'; glowColor = '#a07820'; glowIntensity = 0.15;
      }

      // Mole body (clipped ellipse)
      renderer.setGlow(glowColor, glowIntensity);
      fillClippedEllipse(renderer, cx, moleY, MOLE_RADIUS, MOLE_RADIUS * 1.1, clipY, bodyColor, 32);
      renderer.setGlow(null);

      // Belly (clipped)
      fillClippedEllipse(renderer, cx, moleY + 6, MOLE_RADIUS * 0.6, MOLE_RADIUS * 0.5, clipY, bellyColor, 24);

      // Only draw details if mole head is above clip line
      if (moleY - 8 < clipY) {
        // Eyes
        if (h.whacked) {
          drawWhackedEyes(renderer, cx, moleY);
        } else {
          drawNormalEyes(renderer, cx, moleY);
          if (h.moleType === MOLE_BOMB) {
            drawAngryBrows(renderer, cx, moleY);
          }
        }

        // Nose
        const noseColor = h.moleType === MOLE_BOMB ? '#300' : '#d4783a';
        if (moleY - 1 < clipY) {
          fillCirclePoly(renderer, cx, moleY - 1, 4, noseColor, 12);
        }

        // Golden mole sparkle
        if (h.moleType === MOLE_GOLDEN && !h.whacked) {
          const sparkTime = frameCounter * 0.08;
          for (let i = 0; i < 3; i++) {
            const angle = sparkTime + i * (Math.PI * 2 / 3);
            const sx = cx + Math.cos(angle) * 22;
            const sy = moleY - 8 + Math.sin(angle) * 16;
            if (sy < clipY) {
              renderer.setGlow('#ffd700', 0.4);
              drawStar(renderer, sx, sy, 3, 0.5, '#fff');
              renderer.setGlow(null);
            }
          }
        }

        // Bomb mole fuse
        if (h.moleType === MOLE_BOMB && !h.whacked) {
          const fuseTopY = moleY - MOLE_RADIUS * 1.6;
          if (fuseTopY < clipY) {
            // Fuse line (approximate quadratic curve with line segments)
            const fuseBaseY = moleY - MOLE_RADIUS * 1.1;
            const fuseMidX = cx + 8;
            const fuseMidY = moleY - MOLE_RADIUS * 1.4;
            const fuseEndX = cx + 4;
            const fuseEndY = fuseTopY;
            renderer.drawLine(cx, fuseBaseY, fuseMidX, fuseMidY, '#888', 2);
            renderer.drawLine(fuseMidX, fuseMidY, fuseEndX, fuseEndY, '#888', 2);

            // Fuse spark
            const sparkFlicker = Math.sin(frameCounter * 0.3) * 0.3 + 0.7;
            const sparkG = Math.round(150 * sparkFlicker).toString(16).padStart(2, '0');
            const sparkA = Math.round(sparkFlicker * 255).toString(16).padStart(2, '0');
            renderer.setGlow('#f80', 0.5 * sparkFlicker);
            fillCirclePoly(renderer, fuseEndX, fuseEndY, 4, '#ff' + sparkG + '00' + sparkA, 10);
            renderer.setGlow(null);
          }
        }
      }
    }

    // Hole (front ellipse -- covers bottom of mole)
    fillEllipse(renderer, cx, cy, HOLE_RX, HOLE_RY, '#0a0a0a', 32);

    // Hole rim
    strokeEllipse(renderer, cx, cy, HOLE_RX, HOLE_RY, '#3a2a10', 3, 32);

    // Hole highlight (top arc)
    strokeEllipseArc(renderer, cx, cy - 2, HOLE_RX - 4, HOLE_RY - 3, '#5a3a18', 1.5, Math.PI, Math.PI * 2, 16);
  }

  function drawHUD(renderer, text) {
    // Timer bar background
    fillRoundedRect(renderer, 30, 20, W - 60, 26, 6, '#16213e');

    // Timer bar fill
    const timerFrac = Math.max(0, timeLeft / GAME_DURATION);
    let barColor;
    if (timerFrac > 0.5) barColor = '#fc8';
    else if (timerFrac > 0.2) barColor = '#f80';
    else barColor = '#f44';

    if (timerFrac > 0) {
      renderer.setGlow(barColor, 0.4);
      fillRoundedRect(renderer, 32, 22, (W - 64) * timerFrac, 22, 5, barColor);
      renderer.setGlow(null);
    }

    // Timer text
    text.drawText(`${timeLeft}s`, W / 2, 22, 14, '#e0e0e0', 'center');

    // Lives display (hearts)
    let livesText = '';
    for (let i = 0; i < lives; i++) livesText += '\u2665 ';
    text.drawText(livesText.trim(), 35, H - 30, 14, '#fc8', 'left');

    // Score on canvas (for frame captures)
    renderer.setGlow('#fc8', 0.3);
    text.drawText(`Score: ${score}`, W - 35, H - 30, 16, '#fc8', 'right');
    renderer.setGlow(null);
  }

  game.start();
  return game;
}
