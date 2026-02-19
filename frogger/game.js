// frogger/game.js — Frogger game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 560;

// Grid layout: 14 rows, each 40px tall = 560px
const CELL = 40;
const COLS = W / CELL; // 12
const ROWS = H / CELL; // 14

// Row assignments (from top, row 0 to row 13):
const HOME_ROW = 0;
const RIVER_START = 1;
const RIVER_END = 5;
const MEDIAN_ROW = 6;
const ROAD_START = 7;
const ROAD_END = 11;
const SIDEWALK_ROW = 12;
const START_ROW = 13;

// Home positions (5 lily pads evenly spaced)
const HOME_POSITIONS = [1, 3, 5, 7, 9];

// Lane definitions
const LANE_DEFS = {
  // Road lanes
  7:  { type: 'road', dir: -1, baseSpeed: 1.2, objType: 'car',   objLen: 1.5, gap: 4, color: '#f44' },
  8:  { type: 'road', dir:  1, baseSpeed: 1.8, objType: 'truck', objLen: 2.5, gap: 5, color: '#ff0' },
  9:  { type: 'road', dir: -1, baseSpeed: 1.0, objType: 'car',   objLen: 1.5, gap: 3.5, color: '#f80' },
  10: { type: 'road', dir:  1, baseSpeed: 2.2, objType: 'car',   objLen: 1.5, gap: 4.5, color: '#f0f' },
  11: { type: 'road', dir: -1, baseSpeed: 1.5, objType: 'truck', objLen: 3,   gap: 6, color: '#88f' },
  // River lanes
  1:  { type: 'river', dir:  1, baseSpeed: 0.8, objType: 'log',    objLen: 3,   gap: 4, color: '#a52' },
  2:  { type: 'river', dir: -1, baseSpeed: 1.2, objType: 'turtle', objLen: 2,   gap: 3.5, color: '#0a6', diveInterval: 300 },
  3:  { type: 'river', dir:  1, baseSpeed: 1.0, objType: 'log',    objLen: 4,   gap: 5, color: '#a52' },
  4:  { type: 'river', dir: -1, baseSpeed: 0.6, objType: 'turtle', objLen: 3,   gap: 4, color: '#0a6', diveInterval: 400 },
  5:  { type: 'river', dir:  1, baseSpeed: 1.4, objType: 'log',    objLen: 2,   gap: 3, color: '#a52' },
};

// ── State ──
let score, best = 0;
let lives, level, frogX, frogY, frogMaxRow;
let lanes;
let homes;
let timeLeft, maxTime;
let timerFrameCount; // frame counter for timer (replaces setInterval)
let deathAnim;
let waveOffset = 0; // for animated wave lines

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');

function initLanes() {
  lanes = {};
  for (const [row, def] of Object.entries(LANE_DEFS)) {
    const r = parseInt(row);
    const speedMult = 1 + (level - 1) * 0.15;
    const speed = def.baseSpeed * speedMult * def.dir;
    const objLenPx = def.objLen * CELL;
    const gapPx = def.gap * CELL;
    const totalLen = objLenPx + gapPx;

    const count = Math.ceil((W + totalLen * 2) / totalLen) + 1;
    const objects = [];
    for (let i = 0; i < count; i++) {
      const x = i * totalLen - totalLen;
      objects.push({
        x: x,
        len: objLenPx,
        diveTimer: def.diveInterval ? Math.random() * def.diveInterval : 0,
        diving: false,
        divePhase: 0,
      });
    }
    lanes[r] = {
      ...def,
      speed: speed,
      objects: objects,
      totalLen: totalLen,
    };
  }
}

function resetFrog() {
  frogX = Math.floor(COLS / 2);
  frogY = START_ROW;
  frogMaxRow = START_ROW;
}

function killFrog(game) {
  lives--;
  livesEl.textContent = Math.max(0, lives);
  deathAnim = { x: frogX, y: frogY, frame: 0 };
}

function gameOver(game) {
  game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
  game.setState('over');
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    maxTime = 30;
    timeLeft = maxTime;
    timerFrameCount = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    homes = [false, false, false, false, false];
    initLanes();
    resetFrog();
    deathAnim = null;
    waveOffset = 0;
    game.showOverlay('FROGGER', 'Press SPACE to start');
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
        timerFrameCount = 0;
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

    // Timer via frame counter: 60 frames = 1 second, decrement every 6 frames = 0.1s
    timerFrameCount++;
    if (timerFrameCount % 6 === 0) {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        killFrog(game);
      }
    }

    // Wave animation offset
    waveOffset += 0.12;

    // Death animation
    if (deathAnim) {
      deathAnim.frame++;
      if (deathAnim.frame > 30) {
        deathAnim = null;
        if (lives <= 0) {
          gameOver(game);
          return;
        }
        resetFrog();
        timeLeft = maxTime;
        timerFrameCount = 0;
      }
      return;
    }

    // Input
    if (input.wasPressed('ArrowUp'))    moveFrog(0, -1);
    if (input.wasPressed('ArrowDown'))  moveFrog(0, 1);
    if (input.wasPressed('ArrowLeft'))  moveFrog(-1, 0);
    if (input.wasPressed('ArrowRight')) moveFrog(1, 0);

    // Update lane objects
    for (const [row, lane] of Object.entries(lanes)) {
      for (const obj of lane.objects) {
        obj.x += lane.speed;

        // Wrap
        if (lane.speed > 0 && obj.x > W + obj.len) {
          obj.x -= lane.totalLen * lane.objects.length;
        } else if (lane.speed < 0 && obj.x + obj.len < -obj.len) {
          obj.x += lane.totalLen * lane.objects.length;
        }

        // Turtle diving
        if (lane.objType === 'turtle' && lane.diveInterval) {
          obj.diveTimer--;
          if (obj.diveTimer <= 0) {
            if (!obj.diving) {
              obj.diving = true;
              obj.divePhase = 0;
            }
            obj.divePhase++;
            if (obj.divePhase > 60) {
              obj.diving = false;
              obj.diveTimer = lane.diveInterval + Math.random() * 100;
              obj.divePhase = 0;
            }
          }
        }
      }
    }

    // Check frog on river
    if (frogY >= RIVER_START && frogY <= RIVER_END) {
      const lane = lanes[frogY];
      if (lane) {
        const frogPxX = frogX * CELL;
        let onPlatform = false;

        for (const obj of lane.objects) {
          if (frogPxX + CELL * 0.8 > obj.x && frogPxX + CELL * 0.2 < obj.x + obj.len) {
            if (lane.objType === 'turtle' && obj.diving && obj.divePhase > 20) {
              continue;
            }
            onPlatform = true;
            frogX += lane.speed / CELL;
            break;
          }
        }

        if (!onPlatform) {
          killFrog(game);
          return;
        }

        if (frogX < -0.5 || frogX >= COLS + 0.5) {
          killFrog(game);
          return;
        }
      }
    }

    // Check frog on road
    if (frogY >= ROAD_START && frogY <= ROAD_END) {
      const lane = lanes[frogY];
      if (lane) {
        const frogPxX = frogX * CELL;
        for (const obj of lane.objects) {
          if (frogPxX + CELL * 0.7 > obj.x && frogPxX + CELL * 0.3 < obj.x + obj.len) {
            killFrog(game);
            return;
          }
        }
      }
    }

    // Check if frog reached home row
    if (frogY === HOME_ROW) {
      let landed = false;
      for (let i = 0; i < HOME_POSITIONS.length; i++) {
        const homeX = HOME_POSITIONS[i];
        if (!homes[i] && Math.abs(frogX - homeX) < 1.2) {
          homes[i] = true;
          score += 50;
          scoreEl.textContent = score;
          if (score > best) { best = score; bestEl.textContent = best; }
          landed = true;

          // Check if all homes filled
          if (homes.every(h => h)) {
            score += Math.floor(timeLeft) * 10;
            scoreEl.textContent = score;
            if (score > best) { best = score; bestEl.textContent = best; }
            level++;
            homes = [false, false, false, false, false];
            initLanes();
            maxTime = Math.max(15, 30 - (level - 1) * 2);
          }

          resetFrog();
          timeLeft = maxTime;
          timerFrameCount = 0;
          break;
        }
      }
      if (!landed) {
        killFrog(game);
        return;
      }
    }

    // Update gameData for ML
    window.gameData = {
      frogX: frogX,
      frogY: frogY,
      lives: lives,
      level: level,
      timeLeft: timeLeft,
      homesFilled: homes.filter(h => h).length,
    };
  };

  function moveFrog(dx, dy) {
    if (deathAnim) return;
    const nx = frogX + dx;
    const ny = frogY + dy;

    if (nx < 0 || nx >= COLS || ny < 0 || ny > START_ROW) return;

    frogX = nx;
    frogY = ny;

    if (ny < frogMaxRow) {
      score += 10;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
      frogMaxRow = ny;
    }
  }

  // ── Drawing ──

  game.onDraw = (renderer, text) => {
    // Background
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    drawHomeRow(renderer);
    drawRiver(renderer);
    drawMedian(renderer);
    drawRoad(renderer);
    drawSidewalk(renderer);
    drawStartZone(renderer, text);
    drawLaneObjects(renderer);
    drawFrog(renderer);
    drawTimerBar(renderer);
    drawHUD(renderer, text);
  };

  function drawHomeRow(renderer) {
    // Dark water background
    renderer.fillRect(0, HOME_ROW * CELL, W, CELL, '#0a1628');

    for (let i = 0; i < HOME_POSITIONS.length; i++) {
      const x = HOME_POSITIONS[i] * CELL;
      const y = HOME_ROW * CELL;
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;

      if (homes[i]) {
        // Filled: bright frog circle
        renderer.setGlow('#4e8', 0.6);
        renderer.fillCircle(cx, cy, CELL * 0.35, '#4e8');
        renderer.setGlow(null);
      } else {
        // Empty lily pad
        renderer.setGlow('#4e8', 0.25);
        renderer.fillCircle(cx, cy, CELL * 0.4, '#1a4a2a');
        renderer.setGlow(null);
        // Outline ring (draw a slightly larger darker circle behind, then the pad)
        // Use a thin ring via two circles
        renderer.fillCircle(cx, cy, CELL * 0.42, '#2a6a3a');
        renderer.fillCircle(cx, cy, CELL * 0.38, '#1a4a2a');
      }
    }
  }

  function drawRiver(renderer) {
    // Water background
    renderer.fillRect(0, RIVER_START * CELL, W, (RIVER_END - RIVER_START + 1) * CELL, '#0a1e3a');

    // Subtle wave lines using short dashes
    for (let r = RIVER_START; r <= RIVER_END; r++) {
      const y = r * CELL + CELL / 2;
      // Draw a series of small wave segments
      for (let x = 0; x < W; x += 20) {
        const waveY1 = y + Math.sin((x + waveOffset * 60) * 0.05) * 3;
        const waveY2 = y + Math.sin(((x + 20) + waveOffset * 60) * 0.05) * 3;
        renderer.drawLine(x, waveY1, x + 20, waveY2, '#0f2848', 1);
      }
    }
  }

  function drawMedian(renderer) {
    renderer.fillRect(0, MEDIAN_ROW * CELL, W, CELL, '#1a3a1e');
    renderer.dashedLine(0, MEDIAN_ROW * CELL + CELL / 2, W, MEDIAN_ROW * CELL + CELL / 2, '#2a5a2e', 1, 4, 4);
  }

  function drawRoad(renderer) {
    renderer.fillRect(0, ROAD_START * CELL, W, (ROAD_END - ROAD_START + 1) * CELL, '#1a1a28');

    // Lane dividers
    for (let r = ROAD_START; r <= ROAD_END; r++) {
      renderer.dashedLine(0, r * CELL, W, r * CELL, '#333340', 1, 12, 12);
    }
  }

  function drawSidewalk(renderer) {
    renderer.fillRect(0, SIDEWALK_ROW * CELL, W, CELL, '#1a3a1e');
  }

  function drawStartZone(renderer, text) {
    renderer.fillRect(0, START_ROW * CELL, W, CELL, '#1a3a1e');
    text.drawText('START', W / 2, START_ROW * CELL + CELL / 2 - 6, 12, '#2a5a2e', 'center');
  }

  function drawLaneObjects(renderer) {
    for (const [row, lane] of Object.entries(lanes)) {
      const r = parseInt(row);
      const y = r * CELL;

      for (const obj of lane.objects) {
        if (lane.type === 'road') {
          drawVehicle(renderer, obj.x, y, obj.len, lane);
        } else if (lane.objType === 'log') {
          drawLog(renderer, obj.x, y, obj.len);
        } else if (lane.objType === 'turtle') {
          drawTurtles(renderer, obj.x, y, obj.len, obj);
        }
      }
    }
  }

  function drawVehicle(renderer, x, y, len, lane) {
    const margin = 4;
    const h = CELL - margin * 2;

    // Main body with glow
    renderer.setGlow(lane.color, 0.5);
    renderer.fillRect(x + 2, y + margin, len - 4, h, lane.color);

    // Windshield
    renderer.setGlow(null);
    if (lane.dir > 0) {
      renderer.fillRect(x + len - 14, y + margin + 3, 10, h - 6, 'rgba(100, 200, 255, 0.3)');
    } else {
      renderer.fillRect(x + 4, y + margin + 3, 10, h - 6, 'rgba(100, 200, 255, 0.3)');
    }

    // Headlights
    renderer.setGlow('#ff8', 0.4);
    if (lane.dir > 0) {
      renderer.fillRect(x + len - 4, y + margin + 2, 3, 4, '#ff8');
      renderer.fillRect(x + len - 4, y + CELL - margin - 6, 3, 4, '#ff8');
    } else {
      renderer.fillRect(x + 1, y + margin + 2, 3, 4, '#ff8');
      renderer.fillRect(x + 1, y + CELL - margin - 6, 3, 4, '#ff8');
    }
    renderer.setGlow(null);
  }

  function drawLog(renderer, x, y, len) {
    const margin = 5;
    const h = CELL - margin * 2;

    // Main log body
    renderer.setGlow('#a05020', 0.25);
    renderer.fillRect(x + 2, y + margin, len - 4, h, '#6a3a1a');
    renderer.setGlow(null);

    // Wood grain lines
    for (let lx = x + 10; lx < x + len - 5; lx += 15) {
      renderer.drawLine(lx, y + margin + 2, lx, y + CELL - margin - 2, '#5a2a0a', 1);
    }

    // Bark highlight on top
    renderer.fillRect(x + 2, y + margin, len - 4, 3, '#8a5a2a');
  }

  function drawTurtles(renderer, x, y, len, obj) {
    const numTurtles = Math.floor(len / CELL);
    const margin = 6;

    // Determine opacity based on dive state
    let alpha = 1;
    if (obj.diving) {
      if (obj.divePhase < 20) {
        alpha = 1 - (obj.divePhase / 20) * 0.8;
      } else if (obj.divePhase > 40) {
        alpha = 0.2 + ((obj.divePhase - 40) / 20) * 0.8;
      } else {
        alpha = 0.2;
      }
    }

    for (let t = 0; t < numTurtles; t++) {
      const tx = x + t * CELL + CELL / 2;
      const ty = y + CELL / 2;
      const r = CELL / 2 - margin;

      // Shell
      const shellR = Math.round(170 * alpha);
      const shellG = Math.round(100 * alpha);
      const shellColor = `rgba(0, ${shellR}, ${shellG}, ${alpha})`;
      renderer.setGlow(`rgba(0, 170, 100, ${alpha * 0.3})`, alpha * 0.25);
      renderer.fillCircle(tx, ty, r, shellColor);
      renderer.setGlow(null);

      // Shell pattern (inner ring + cross) when visible enough
      if (alpha > 0.4) {
        const patternColor = `rgba(0, ${Math.round(130 * alpha)}, ${Math.round(70 * alpha)}, ${alpha})`;
        // Inner ring via two circles
        renderer.fillCircle(tx, ty, r - 2, patternColor);
        renderer.fillCircle(tx, ty, r - 3, shellColor);

        // Cross pattern
        renderer.drawLine(tx - 6, ty, tx + 6, ty, patternColor, 1);
        renderer.drawLine(tx, ty - 6, tx, ty + 6, patternColor, 1);
      }
    }
  }

  function drawFrog(renderer) {
    if (deathAnim) {
      // Death animation: expanding red X
      const progress = deathAnim.frame / 30;
      const cx = deathAnim.x * CELL + CELL / 2;
      const cy = deathAnim.y * CELL + CELL / 2;
      const size = 10 + progress * 5; // grows slightly

      // Red X with glow (fades with progress via dimmer color)
      const r = Math.round(255 * (1 - progress));
      const g = Math.round(68 * (1 - progress));
      const b = Math.round(68 * (1 - progress));
      const xColor = `rgb(${r}, ${g}, ${b})`;
      renderer.setGlow('#f44', (1 - progress) * 0.6);
      renderer.drawLine(cx - size, cy - size, cx + size, cy + size, xColor, 3);
      renderer.drawLine(cx + size, cy - size, cx - size, cy + size, xColor, 3);
      renderer.setGlow(null);
      return;
    }

    const cx = frogX * CELL + CELL / 2;
    const cy = frogY * CELL + CELL / 2;
    const r = CELL * 0.38;

    // Body
    renderer.setGlow('#4e8', 0.7);
    renderer.fillCircle(cx, cy, r, '#4e8');
    renderer.setGlow(null);

    // Eyes (white)
    renderer.fillCircle(cx - 6, cy - 6, 4, '#fff');
    renderer.fillCircle(cx + 6, cy - 6, 4, '#fff');

    // Pupils
    renderer.fillCircle(cx - 6, cy - 7, 2, '#111');
    renderer.fillCircle(cx + 6, cy - 7, 2, '#111');
  }

  function drawTimerBar(renderer) {
    const barY = H - 6;
    const barH = 4;
    const pct = Math.max(0, timeLeft / maxTime);

    // Background
    renderer.fillRect(0, barY, W, barH, '#16213e');

    // Timer fill
    let barColor;
    if (pct > 0.5) barColor = '#4e8';
    else if (pct > 0.25) barColor = '#ff0';
    else barColor = '#f44';

    renderer.setGlow(barColor, 0.4);
    renderer.fillRect(0, barY, W * pct, barH, barColor);
    renderer.setGlow(null);
  }

  function drawHUD(renderer, text) {
    text.drawText(`LVL ${level}`, W - 8, H - 20, 12, '#4e8', 'right');
  }

  game.start();
  return game;
}
