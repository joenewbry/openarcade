// tapper/game.js — Tapper game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 500;

// Theme
const THEME = '#da4';
const THEME_DIM = '#a82';

// Layout: 4 bars
const NUM_BARS = 4;
const BAR_TOP = 60;
const BAR_SPACING = 110;
const BAR_HEIGHT = 12;
const BAR_LEFT = 70;
const BAR_RIGHT = 560;
const BAR_LENGTH = BAR_RIGHT - BAR_LEFT;

// Bartender (player)
const PLAYER_W = 28;
const PLAYER_H = 50;

// Customers
const CUST_W = 24;
const CUST_H = 44;

// Drinks (mugs)
const DRINK_W = 14;
const DRINK_H = 16;

// Taps
const TAP_W = 20;
const TAP_H = 30;

// Bar colors for each lane (neon palette)
const BAR_COLORS = ['#f44', '#f80', '#0f0', '#48f'];
const CUST_COLORS = ['#f08', '#0ff', '#8f0', '#fa0', '#a4f', '#0af'];

// ── State ──
let currentBar;
let customers;
let drinks;
let emptyMugs;
let tips;
let spawnTimer;
let spawnInterval;
let frameCount;
let levelCustomersTotal;
let levelCustomersSpawned;
let levelCustomersServed;
let serveAnimation;
let customerSpeedBase;
let drinkSpeed;
let flashTimer;
let levelFlash;
let score, best, lives, level;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

function barY(index) {
  return BAR_TOP + index * BAR_SPACING;
}

function setupLevel() {
  customers = [];
  drinks = [];
  emptyMugs = [];
  tips = [];
  spawnTimer = 0;

  const diff = Math.min(level - 1, 12);
  customerSpeedBase = 0.4 + diff * 0.08;
  drinkSpeed = 4.5 + diff * 0.3;
  spawnInterval = Math.max(30, 90 - diff * 5);
  levelCustomersTotal = 8 + level * 4;
  levelCustomersSpawned = 0;
  levelCustomersServed = 0;
}

function spawnCustomer() {
  if (levelCustomersSpawned >= levelCustomersTotal) return;

  const barCounts = [0, 0, 0, 0];
  customers.forEach(c => { if (c.state === 'walking') barCounts[c.bar]++; });

  const weights = barCounts.map(c => Math.max(1, 5 - c));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  let bar = 0;
  for (let i = 0; i < NUM_BARS; i++) {
    r -= weights[i];
    if (r <= 0) { bar = i; break; }
  }

  const speed = customerSpeedBase * (0.8 + Math.random() * 0.4);
  const drinksWanted = 1 + Math.floor(Math.random() * Math.min(3, level));
  const colorIndex = Math.floor(Math.random() * CUST_COLORS.length);

  customers.push({
    bar: bar,
    x: BAR_RIGHT + 10,
    speed: speed,
    state: 'walking',
    drinksWanted: drinksWanted,
    drinksHad: 0,
    drinkTimer: 0,
    color: CUST_COLORS[colorIndex]
  });

  levelCustomersSpawned++;
}

function serveDrink() {
  if (serveAnimation > 0) return;
  serveAnimation = 12;
  drinks.push({
    bar: currentBar,
    x: BAR_LEFT + PLAYER_W + 5,
    speed: drinkSpeed
  });
}

let gameRef = null;

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  flashTimer = 30;

  if (lives <= 0) {
    gameOver();
    return;
  }

  drinks = drinks.filter(d => d.x < BAR_RIGHT + 20);
}

function gameOver() {
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  gameRef.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
  gameRef.setState('over');
}

function updateScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

// ── Drawing helpers ──

function drawMug(renderer, x, y, full) {
  const bodyColor = full ? '#da4' : '#664';
  if (full) {
    renderer.setGlow('#da4', 0.5);
  } else {
    renderer.setGlow('#664', 0.15);
  }
  // Mug body
  renderer.fillRect(x, y, DRINK_W, DRINK_H, bodyColor);
  // Handle (small rect arc approximation)
  renderer.fillRect(x + DRINK_W, y + DRINK_H / 2 - 4, 4, 2, bodyColor);
  renderer.fillRect(x + DRINK_W + 3, y + DRINK_H / 2 - 3, 2, 6, bodyColor);
  renderer.fillRect(x + DRINK_W, y + DRINK_H / 2 + 2, 4, 2, bodyColor);
  // Foam on top if full
  if (full) {
    renderer.fillRect(x - 1, y - 3, DRINK_W + 2, 4, '#fff');
  }
  renderer.setGlow(null);
}

function drawCustomer(renderer, text, c, by) {
  const x = c.x;
  const bodyTop = by - CUST_H - 2;

  // Body
  renderer.setGlow(c.color, 0.4);
  renderer.fillRect(x + 4, bodyTop + 16, CUST_W - 8, CUST_H - 16, c.color);

  // Head
  renderer.fillCircle(x + CUST_W / 2, bodyTop + 10, 8, c.color);

  // Eyes
  renderer.setGlow(null);
  renderer.fillRect(x + 6, bodyTop + 8, 2, 3, '#1a1a2e');
  renderer.fillRect(x + 11, bodyTop + 8, 2, 3, '#1a1a2e');

  // State indicator: drinking shows a mug
  if (c.state === 'drinking') {
    drawMug(renderer, x - 4, by - DRINK_H - 2, true);
  }

  // Wants more indicator
  if (c.state === 'walking' && c.drinksHad > 0) {
    renderer.setGlow('#f44', 0.3);
    text.drawText('!', x + CUST_W / 2 - 2, bodyTop - 8, 12, '#f44', 'left');
    renderer.setGlow(null);
  }

  // Multi-drink indicator dots
  if (c.drinksWanted > 1) {
    for (let d = 0; d < c.drinksWanted; d++) {
      const dotColor = d < c.drinksHad ? '#0f0' : '#444';
      renderer.fillCircle(x + 4 + d * 7, bodyTop - 4, 2, dotColor);
    }
  }
}

function drawBartender(renderer) {
  const by = barY(currentBar);
  const bx = BAR_LEFT + 2;
  const bodyTop = by - PLAYER_H - 2;

  const serveOffset = serveAnimation > 6 ? 8 : (serveAnimation > 0 ? 4 : 0);

  // Body
  renderer.setGlow(THEME, 0.6);
  renderer.fillRect(bx + 4 + serveOffset, bodyTop + 18, PLAYER_W - 8, PLAYER_H - 18, '#fff');

  // Apron
  renderer.fillRect(bx + 6 + serveOffset, bodyTop + 28, PLAYER_W - 12, PLAYER_H - 28, THEME);

  // Head
  renderer.fillCircle(bx + PLAYER_W / 2 + serveOffset, bodyTop + 12, 9, '#f8d8b0');

  // Hat
  renderer.fillRect(bx + 2 + serveOffset, bodyTop + 2, PLAYER_W - 4, 6, THEME);

  // Eyes
  renderer.setGlow(null);
  renderer.fillRect(bx + PLAYER_W / 2 + 3 + serveOffset, bodyTop + 10, 2, 3, '#1a1a2e');
  renderer.fillRect(bx + PLAYER_W / 2 + 7 + serveOffset, bodyTop + 10, 2, 3, '#1a1a2e');

  // Arm reaching out when serving
  if (serveAnimation > 0) {
    renderer.drawLine(
      bx + PLAYER_W + serveOffset, bodyTop + 24,
      bx + PLAYER_W + 12 + serveOffset, bodyTop + 20,
      '#f8d8b0', 3
    );
  }
}

export function createGame() {
  const game = new Game('game');
  gameRef = game;

  game.onInit = () => {
    score = 0;
    best = parseInt(bestEl.textContent) || 0;
    lives = 3;
    level = 1;
    currentBar = 1;
    customers = [];
    drinks = [];
    emptyMugs = [];
    tips = [];
    spawnTimer = 0;
    frameCount = 0;
    serveAnimation = 0;
    flashTimer = 0;
    levelFlash = 0;

    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';

    setupLevel();

    game.showOverlay('TAPPER', 'UP/DOWN to move, SPACE to serve');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') || input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    if (serveAnimation > 0) serveAnimation--;
    if (flashTimer > 0) flashTimer--;

    // Player movement
    if (input.wasPressed('ArrowUp')) {
      if (currentBar > 0) currentBar--;
    }
    if (input.wasPressed('ArrowDown')) {
      if (currentBar < NUM_BARS - 1) currentBar++;
    }
    if (input.wasPressed(' ')) {
      serveDrink();
    }

    // Spawn customers
    spawnTimer++;
    if (spawnTimer >= spawnInterval && levelCustomersSpawned < levelCustomersTotal) {
      spawnTimer = 0;
      spawnCustomer();
    }

    // Update customers
    for (let i = customers.length - 1; i >= 0; i--) {
      const c = customers[i];

      if (c.state === 'walking') {
        c.x -= c.speed;
        if (c.x <= BAR_LEFT + PLAYER_W) {
          c.state = 'done';
          loseLife();
          customers.splice(i, 1);
          if (game.state !== 'playing') return;
          continue;
        }
      }

      if (c.state === 'drinking') {
        c.drinkTimer++;
        if (c.drinkTimer > 40) {
          c.drinksHad++;
          if (c.drinksHad >= c.drinksWanted) {
            c.state = 'sliding_back';
            emptyMugs.push({ bar: c.bar, x: c.x, speed: 3.0 });
          } else {
            c.state = 'walking';
            c.drinkTimer = 0;
            emptyMugs.push({ bar: c.bar, x: c.x, speed: 2.5 });
          }
        }
      }

      if (c.state === 'sliding_back') {
        c.x += 3.5;
        if (c.x >= BAR_RIGHT + 20) {
          const tipX = BAR_RIGHT - 20 - Math.random() * 80;
          tips.push({ bar: c.bar, x: tipX, timer: 400 });

          levelCustomersServed++;
          updateScore(50);

          customers.splice(i, 1);
          continue;
        }
      }

      if (c.state === 'leaving') {
        c.x += 2;
        if (c.x > BAR_RIGHT + 30) {
          customers.splice(i, 1);
          continue;
        }
      }
    }

    // Update drinks sliding down the bar
    for (let i = drinks.length - 1; i >= 0; i--) {
      const d = drinks[i];
      d.x += d.speed;

      let hitCustomer = false;
      for (let j = 0; j < customers.length; j++) {
        const c = customers[j];
        if (c.bar !== d.bar) continue;
        if (c.state !== 'walking') continue;

        if (d.x + DRINK_W >= c.x && d.x <= c.x + CUST_W) {
          c.state = 'drinking';
          c.drinkTimer = 0;
          hitCustomer = true;

          updateScore(25);
          drinks.splice(i, 1);
          break;
        }
      }

      if (hitCustomer) continue;

      if (d.x > BAR_RIGHT + 10) {
        drinks.splice(i, 1);
        loseLife();
        if (game.state !== 'playing') return;
      }
    }

    // Update empty mugs sliding back toward bartender
    for (let i = emptyMugs.length - 1; i >= 0; i--) {
      const m = emptyMugs[i];
      m.x -= m.speed;

      if (m.x <= BAR_LEFT + PLAYER_W + 10) {
        if (m.bar === currentBar) {
          updateScore(5);
          emptyMugs.splice(i, 1);
        } else if (m.x <= BAR_LEFT - 10) {
          emptyMugs.splice(i, 1);
          loseLife();
          if (game.state !== 'playing') return;
        }
      }
    }

    // Update tips
    for (let i = tips.length - 1; i >= 0; i--) {
      const t = tips[i];
      t.x -= 1.2;
      t.timer--;

      if (t.timer <= 0) {
        tips.splice(i, 1);
        continue;
      }

      if (t.bar === currentBar && t.x <= BAR_LEFT + PLAYER_W + 20) {
        updateScore(10);
        tips.splice(i, 1);
        continue;
      }

      if (t.x <= BAR_LEFT - 10) {
        tips.splice(i, 1);
      }
    }

    // Level flash timer
    if (levelFlash > 0) levelFlash--;

    // Check level complete
    if (levelCustomersServed >= levelCustomersTotal &&
        customers.length === 0 &&
        drinks.length === 0 &&
        emptyMugs.length === 0) {
      level++;
      levelEl.textContent = level;
      levelFlash = 90;
      updateScore(100 * (level - 1));
      setupLevel();
    }

    // Expose game data for ML
    window.gameData = {
      currentBar: currentBar,
      playerX: BAR_LEFT,
      customers: customers.map(c => ({ bar: c.bar, x: c.x, state: c.state })),
      drinks: drinks.map(d => ({ bar: d.bar, x: d.x })),
      lives: lives,
      level: level
    };
  };

  game.onDraw = (renderer, text) => {
    // Flash effect when losing a life
    if (flashTimer > 0 && flashTimer % 4 < 2) {
      renderer.fillRect(0, 0, W, H, '#ff323214');
    }

    // Draw bars
    for (let i = 0; i < NUM_BARS; i++) {
      const by = barY(i);
      const barColor = BAR_COLORS[i];

      // Bar counter surface
      renderer.fillRect(BAR_LEFT, by - 4, BAR_LENGTH, BAR_HEIGHT + 8, '#2a1a08');

      // Bar top edge (shiny)
      renderer.fillRect(BAR_LEFT, by - 4, BAR_LENGTH, 3, '#5a3a18');

      // Neon glow line on bar
      renderer.setGlow(barColor, 0.4);
      renderer.drawLine(BAR_LEFT, by + BAR_HEIGHT + 4, BAR_RIGHT, by + BAR_HEIGHT + 4, barColor, 1);
      renderer.setGlow(null);

      // Tap at the left end
      const tapX = BAR_LEFT - TAP_W - 5;
      const tapY = by - TAP_H + 10;
      renderer.fillRect(tapX + 6, tapY, 8, TAP_H, '#888');
      renderer.fillRect(tapX + 2, tapY, 16, 6, '#bbb');
      // Tap handle
      renderer.setGlow(THEME, 0.3);
      renderer.fillRect(tapX, tapY - 8, 20, 10, THEME);
      renderer.setGlow(null);

      // Bar number label
      text.drawText(`BAR ${i + 1}`, BAR_LEFT + 2, by + BAR_HEIGHT + 10, 10, '#555', 'left');
    }

    // Draw tips
    tips.forEach(t => {
      const by = barY(t.bar);
      const alpha = Math.min(1, t.timer / 60);
      // Use hex with alpha for tip color
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#0f8', 0.4);
      text.drawText('$', t.x, by - 16, 14, '#00ff64' + alphaHex, 'left');
      renderer.setGlow(null);
    });

    // Draw drinks
    drinks.forEach(d => {
      const by = barY(d.bar);
      drawMug(renderer, d.x, by - DRINK_H - 2, true);
    });

    // Draw empty mugs
    emptyMugs.forEach(m => {
      const by = barY(m.bar);
      drawMug(renderer, m.x, by - DRINK_H - 2, false);
    });

    // Draw customers
    customers.forEach(c => {
      const by = barY(c.bar);
      drawCustomer(renderer, text, c, by);
    });

    // Draw bartender
    drawBartender(renderer);

    // HUD: bar indicator arrows
    for (let i = 0; i < NUM_BARS; i++) {
      const by = barY(i);
      if (i === currentBar) {
        renderer.setGlow(THEME, 0.5);
        text.drawText('\u25B6', 8, by, 16, THEME, 'left');
        renderer.setGlow(null);
      } else {
        text.drawText('\u25B6', 10, by - 1, 14, '#333', 'left');
      }
    }

    // Level progress indicator
    const progress = levelCustomersTotal > 0 ? levelCustomersServed / levelCustomersTotal : 0;
    const progW = 120;
    const progH = 6;
    const progX = W - progW - 20;
    const progY = H - 20;
    renderer.fillRect(progX, progY, progW, progH, '#16213e');
    renderer.setGlow(THEME, 0.3);
    renderer.fillRect(progX, progY, progW * progress, progH, THEME);
    renderer.setGlow(null);
    text.drawText(`${levelCustomersServed}/${levelCustomersTotal}`, progX + progW + 5, progY - 2, 10, '#666', 'left');

    // Entry doors at right end of each bar
    for (let i = 0; i < NUM_BARS; i++) {
      const by = barY(i);
      renderer.fillRect(BAR_RIGHT + 2, by - CUST_H - 5, 18, CUST_H + 10, '#0f3460');
      // Door frame lines
      renderer.drawLine(BAR_RIGHT + 2, by - CUST_H - 5, BAR_RIGHT + 20, by - CUST_H - 5, '#1a4a80', 1);
      renderer.drawLine(BAR_RIGHT + 2, by - CUST_H - 5, BAR_RIGHT + 2, by + 5, '#1a4a80', 1);
      renderer.drawLine(BAR_RIGHT + 20, by - CUST_H - 5, BAR_RIGHT + 20, by + 5, '#1a4a80', 1);
      renderer.drawLine(BAR_RIGHT + 2, by + 5, BAR_RIGHT + 20, by + 5, '#1a4a80', 1);
      // Door knob
      renderer.fillCircle(BAR_RIGHT + 7, by - CUST_H / 2, 2, THEME_DIM);
    }

    // Level flash overlay
    if (levelFlash > 0) {
      const alpha = Math.min(0.7, levelFlash / 90);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(0, 0, W, H, '#1a1a2e' + alphaHex);
      renderer.setGlow(THEME, 0.8);
      text.drawText(`LEVEL ${level}`, W / 2, H / 2 - 16, 32, THEME, 'center');
      renderer.setGlow(null);
      text.drawText(`+${100 * (level - 1)} bonus`, W / 2, H / 2 + 14, 14, '#aaa', 'center');
    }
  };

  game.start();
  return game;
}
