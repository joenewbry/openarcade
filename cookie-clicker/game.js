// cookie-clicker/game.js — Cookie Clicker game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 560;
const H = 500;

// --- Game constants ---
const COOKIE_X = 160;
const COOKIE_Y = 250;
const COOKIE_RADIUS = 100;
const SHOP_X = 330;
const SHOP_W = 220;
const MILESTONE = 1000000; // 1 million cookies triggers "win"

// --- Buildings ---
const BUILDING_DEFS = [
  { name: 'Cursor',  baseCost: 15,   cps: 0.1,  key: '1', color: '#ed4',  icon: '\u25C6' },
  { name: 'Grandma', baseCost: 100,  cps: 1,    key: '2', color: '#f80',  icon: '\u2665' },
  { name: 'Farm',    baseCost: 500,  cps: 5,    key: '3', color: '#0f0',  icon: '\u2618' },
  { name: 'Factory', baseCost: 3000, cps: 20,   key: '4', color: '#0ff',  icon: '\u2699' },
  { name: 'Mine',    baseCost: 10000, cps: 50,  key: '5', color: '#88f',  icon: '\u25B2' },
  { name: 'Bank',    baseCost: 40000, cps: 100,  key: '6', color: '#f0f',  icon: '\u0024' },
];

// --- State ---
let cookies, totalCookies, cookiesPerClick, cps;
let buildings, clickParticles, floatingTexts;
let cookieScale, cookieBounce, cookieRotation;
let hoverBuilding;
let mouseX, mouseY;
let score, best;
let shopButtons;

// Frame-based timing: engine runs at fixed 60 fps
const FPS = 60;

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Mouse state (engine only exposes keyboard polling) ---
let pendingClicks = [];
let pendingMousePos = null;

function getBuildingCost(index) {
  const def = BUILDING_DEFS[index];
  return Math.floor(def.baseCost * Math.pow(1.15, buildings[index].count));
}

function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function recalcCPS() {
  cps = 0;
  for (let i = 0; i < BUILDING_DEFS.length; i++) {
    cps += BUILDING_DEFS[i].cps * buildings[i].count;
  }
}

function isInsideCookie(x, y) {
  const dx = x - COOKIE_X;
  const dy = y - COOKIE_Y;
  return dx * dx + dy * dy <= COOKIE_RADIUS * COOKIE_RADIUS;
}

function getShopButtonRects() {
  const rects = [];
  const startY = 90;
  const btnH = 62;
  const btnPad = 6;
  const btnW = SHOP_W - 20;
  for (let i = 0; i < BUILDING_DEFS.length; i++) {
    const bx = SHOP_X + 10;
    const by = startY + i * (btnH + btnPad);
    rects.push({ x: bx, y: by, w: btnW, h: btnH, index: i });
  }
  return rects;
}

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // --- Mouse handling ---
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    pendingMousePos = pos;
  });

  canvas.addEventListener('click', (e) => {
    const pos = getCanvasPos(e);
    pendingClicks.push(pos);
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Game lifecycle ---
  game.onInit = () => {
    cookies = 0;
    totalCookies = 0;
    score = 0;
    best = best || 0;
    cookiesPerClick = 1;
    cps = 0;
    clickParticles = [];
    floatingTexts = [];
    cookieScale = 1;
    cookieBounce = 0;
    cookieRotation = 0;
    hoverBuilding = -1;
    mouseX = 0;
    mouseY = 0;
    pendingClicks = [];
    buildings = BUILDING_DEFS.map(() => ({ count: 0 }));
    shopButtons = getShopButtonRects();

    scoreEl.textContent = '0';
    game.showOverlay('COOKIE CLICKER', 'Click or press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  function clickCookie(x, y) {
    const earned = cookiesPerClick;
    cookies += earned;
    totalCookies += earned;
    score = Math.floor(totalCookies);
    scoreEl.textContent = formatNumber(score);
    if (score > best) {
      best = score;
      bestEl.textContent = formatNumber(best);
    }

    // Visual feedback
    cookieBounce = 1;

    // Floating text
    floatingTexts.push({
      x: COOKIE_X + (Math.random() - 0.5) * 60,
      y: COOKIE_Y - COOKIE_RADIUS - 10,
      text: '+' + formatNumber(earned),
      alpha: 1,
      vy: -1.5
    });

    // Particles
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      clickParticles.push({
        x: COOKIE_X + Math.cos(angle) * 20,
        y: COOKIE_Y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: '#ed4'
      });
    }

    // Check milestone
    if (totalCookies >= MILESTONE) {
      doGameOver();
    }
  }

  function buyBuilding(index) {
    const cost = getBuildingCost(index);
    if (cookies >= cost) {
      cookies -= cost;
      buildings[index].count++;
      recalcCPS();
      if (index === 0) {
        cookiesPerClick = 1 + buildings[0].count * 0.1;
      }
      return true;
    }
    return false;
  }

  function doGameOver() {
    if (score > best) {
      best = score;
      bestEl.textContent = formatNumber(best);
    }
    game.showOverlay('GAME OVER', formatNumber(totalCookies) + ' cookies! Press any key to restart');
    game.setState('over');
  }

  function handleClick(pos) {
    // Check cookie click
    if (isInsideCookie(pos.x, pos.y)) {
      clickCookie(pos.x, pos.y);
      return;
    }

    // Check shop button clicks
    for (const btn of shopButtons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
          pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        buyBuilding(btn.index);
        return;
      }
    }
  }

  game.onUpdate = () => {
    const input = game.input;
    // dt in seconds for a single fixed frame
    const dt = 1 / FPS;

    // --- State transitions ---
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || pendingClicks.length > 0) {
        pendingClicks = [];
        game.onInit();
      }
      return;
    }

    // --- Playing state ---

    // Process mouse position for hover
    if (pendingMousePos) {
      mouseX = pendingMousePos.x;
      mouseY = pendingMousePos.y;
      pendingMousePos = null;

      // Check hover on shop buttons
      hoverBuilding = -1;
      for (const btn of shopButtons) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          hoverBuilding = btn.index;
          break;
        }
      }
    }

    // Process mouse clicks
    for (const pos of pendingClicks) {
      handleClick(pos);
    }
    pendingClicks = [];

    // Space = click cookie
    if (input.wasPressed(' ')) {
      clickCookie(COOKIE_X, COOKIE_Y);
    }

    // Number keys 1-6 = buy building
    for (let k = 1; k <= BUILDING_DEFS.length; k++) {
      if (input.wasPressed(String(k))) {
        buyBuilding(k - 1);
      }
    }

    // Passive cookie generation
    if (cps > 0) {
      const earned = cps * dt;
      cookies += earned;
      totalCookies += earned;
      score = Math.floor(totalCookies);
      scoreEl.textContent = formatNumber(score);
      if (score > best) {
        best = score;
        bestEl.textContent = formatNumber(best);
      }
    }

    // Cookie bounce animation
    if (cookieBounce > 0) {
      cookieBounce -= dt * 5;
      if (cookieBounce < 0) cookieBounce = 0;
    }
    cookieScale = 1 + cookieBounce * 0.1;

    // Slow rotation
    cookieRotation += dt * 0.3;

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= dt * 1.5;
      if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }

    // Update particles
    for (let i = clickParticles.length - 1; i >= 0; i--) {
      const p = clickParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 2;
      if (p.life <= 0) clickParticles.splice(i, 1);
    }

    // Check milestone
    if (totalCookies >= MILESTONE) {
      doGameOver();
    }

    // Expose game data for ML
    window.gameData = {
      cookies: Math.floor(cookies),
      totalCookies: Math.floor(totalCookies),
      cps: cps,
      cookiesPerClick: cookiesPerClick,
      buildings: buildings.map((b, i) => ({
        name: BUILDING_DEFS[i].name,
        count: b.count,
        cost: getBuildingCost(i)
      }))
    };
  };

  game.onDraw = (renderer, text) => {
    // --- Left area: grid pattern ---
    for (let x = 0; x < SHOP_X; x += 40) {
      renderer.drawLine(x, 0, x, H, '#16213e', 1);
    }
    for (let y = 0; y < H; y += 40) {
      renderer.drawLine(0, y, SHOP_X, y, '#16213e', 1);
    }

    // --- Cookie count display (above cookie) ---
    renderer.setGlow('#ed4', 0.5);
    text.drawText(formatNumber(Math.floor(cookies)), COOKIE_X, 30, 28, '#ed4', 'center');
    renderer.setGlow(null);

    text.drawText('cookies', COOKIE_X, 58, 14, '#aaa', 'center');

    // CPS display
    text.drawText(formatNumber(cps) + ' per second', COOKIE_X, 78, 12, '#888', 'center');

    // Click power display
    text.drawText('+' + cookiesPerClick.toFixed(1) + ' per click', COOKIE_X, 96, 11, '#666', 'center');

    // --- Draw the cookie ---
    drawCookie(renderer, text);

    // Hint text below cookie
    text.drawText('Click cookie or press SPACE', COOKIE_X, COOKIE_Y + COOKIE_RADIUS + 22, 11, '#555', 'center');
    text.drawText('Keys 1-6 to buy buildings', COOKIE_X, COOKIE_Y + COOKIE_RADIUS + 40, 11, '#555', 'center');

    // --- Progress bar to milestone ---
    const progress = Math.min(totalCookies / MILESTONE, 1);
    const barX = 30;
    const barY = H - 40;
    const barW = SHOP_X - 60;
    const barH = 12;

    renderer.fillRect(barX, barY, barW, barH, '#0f1a30');
    if (progress > 0) {
      renderer.setGlow('#ed4', progress > 0.5 ? 0.5 : 0.25);
      renderer.fillRect(barX, barY, barW * progress, barH, '#ed4');
      renderer.setGlow(null);
    }
    // Progress bar border via lines
    renderer.drawLine(barX, barY, barX + barW, barY, '#0f3460', 1);
    renderer.drawLine(barX, barY + barH, barX + barW, barY + barH, '#0f3460', 1);
    renderer.drawLine(barX, barY, barX, barY + barH, '#0f3460', 1);
    renderer.drawLine(barX + barW, barY, barX + barW, barY + barH, '#0f3460', 1);

    text.drawText('Goal: 1M cookies (' + (progress * 100).toFixed(1) + '%)', COOKIE_X, barY - 8, 10, '#888', 'center');

    // --- Floating texts ---
    for (const ft of floatingTexts) {
      if (ft.alpha > 0) {
        renderer.setGlow('#ed4', 0.4);
        // Use alpha via color approximation: blend toward background
        const a = Math.max(0, Math.min(1, ft.alpha));
        const r = Math.round(238 * a);
        const g = Math.round(221 * a);
        const b = Math.round(68 * a);
        const col = 'rgb(' + r + ',' + g + ',' + b + ')';
        text.drawText(ft.text, ft.x, ft.y, 18, col, 'center');
        renderer.setGlow(null);
      }
    }

    // --- Particles ---
    for (const p of clickParticles) {
      if (p.life > 0) {
        const a = Math.max(0, Math.min(1, p.life));
        const r = Math.round(238 * a);
        const g = Math.round(221 * a);
        const b2 = Math.round(68 * a);
        const col = 'rgb(' + r + ',' + g + ',' + b2 + ')';
        renderer.setGlow(col, 0.3);
        renderer.fillRect(p.x - 2, p.y - 2, 4, 4, col);
        renderer.setGlow(null);
      }
    }

    // --- Shop panel ---
    drawShop(renderer, text);
  };

  function drawCookie(renderer, text) {
    // Cookie body - approximate the gradient with concentric circles
    const glowIntensity = 0.5 + cookieBounce * 0.4;
    renderer.setGlow('#ed4', glowIntensity);

    // Outer ring (darkest)
    renderer.fillCircle(COOKIE_X, COOKIE_Y, COOKIE_RADIUS * cookieScale, '#8B6914');
    // Mid ring
    renderer.fillCircle(COOKIE_X, COOKIE_Y, COOKIE_RADIUS * cookieScale * 0.85, '#b8860b');
    // Inner (lightest)
    renderer.fillCircle(COOKIE_X, COOKIE_Y, COOKIE_RADIUS * cookieScale * 0.5, '#d4a030');

    renderer.setGlow(null);

    // Scalloped edge - draw as a polygon outline
    const edgePoints = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + cookieRotation * 0.05;
      const r = (COOKIE_RADIUS - 2 + Math.sin(i * 3.7) * 4) * cookieScale;
      edgePoints.push({
        x: COOKIE_X + Math.cos(angle) * r,
        y: COOKIE_Y + Math.sin(angle) * r
      });
    }
    renderer.strokePoly(edgePoints, '#8B6914', 3, true);

    // Chocolate chips
    const chips = [
      { x: -30, y: -40, r: 10 },
      { x: 25, y: -25, r: 9 },
      { x: -15, y: 10, r: 11 },
      { x: 35, y: 20, r: 8 },
      { x: -40, y: 30, r: 9 },
      { x: 10, y: 45, r: 10 },
      { x: -55, y: -10, r: 8 },
      { x: 50, y: -5, r: 7 },
      { x: 5, y: -55, r: 8 },
    ];

    for (const chip of chips) {
      // Apply scale
      const cx = COOKIE_X + chip.x * cookieScale;
      const cy = COOKIE_Y + chip.y * cookieScale;
      const cr = chip.r * cookieScale;
      // Dark chocolate chip with lighter center
      renderer.fillCircle(cx, cy, cr, '#3a2518');
      renderer.fillCircle(cx, cy, cr * 0.5, '#5c3d2e');
    }
  }

  function drawShop(renderer, text) {
    // Shop panel background
    renderer.fillRect(SHOP_X, 0, SHOP_W, H, '#16213e');

    // Divider line
    renderer.fillRect(SHOP_X, 0, 2, H, '#0f3460');

    // Shop title
    renderer.setGlow('#ed4', 0.4);
    text.drawText('SHOP', SHOP_X + SHOP_W / 2, 16, 16, '#ed4', 'center');
    renderer.setGlow(null);

    // CPS display
    text.drawText(formatNumber(cps) + ' per second', SHOP_X + SHOP_W / 2, 38, 12, '#aaa', 'center');

    // Cookie count in shop area
    text.drawText(formatNumber(Math.floor(cookies)) + ' cookies', SHOP_X + SHOP_W / 2, 58, 14, '#ed4', 'center');

    // Buildings
    const startY = 90;
    const btnH = 62;
    const btnPad = 6;
    const btnW = SHOP_W - 20;

    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      const def = BUILDING_DEFS[i];
      const cost = getBuildingCost(i);
      const canAfford = cookies >= cost;
      const bx = SHOP_X + 10;
      const by = startY + i * (btnH + btnPad);
      const isHovered = hoverBuilding === i;

      // Button background
      renderer.fillRect(bx, by, btnW, btnH, isHovered ? '#1a2a4e' : '#0f1a30');

      // Button border
      const borderColor = canAfford ? def.color : '#333';
      if (canAfford && isHovered) {
        renderer.setGlow(def.color, 0.4);
      }
      // Draw border using lines
      const borderW = (canAfford && isHovered) ? 2 : 1;
      renderer.drawLine(bx, by, bx + btnW, by, borderColor, borderW);
      renderer.drawLine(bx, by + btnH, bx + btnW, by + btnH, borderColor, borderW);
      renderer.drawLine(bx, by, bx, by + btnH, borderColor, borderW);
      renderer.drawLine(bx + btnW, by, bx + btnW, by + btnH, borderColor, borderW);
      renderer.setGlow(null);

      // Icon
      const iconColor = canAfford ? def.color : '#555';
      text.drawText(def.icon, bx + 8, by + 12, 20, iconColor, 'left');

      // Name
      const nameColor = canAfford ? '#e0e0e0' : '#666';
      text.drawText(def.name, bx + 32, by + 8, 13, nameColor, 'left');

      // Key shortcut
      const keyColor = canAfford ? '#888' : '#444';
      text.drawText('[' + def.key + ']', bx + btnW - 6, by + 8, 10, keyColor, 'right');

      // Cost
      const costColor = canAfford ? '#ed4' : '#663';
      text.drawText(formatNumber(cost) + ' cookies', bx + 32, by + 26, 12, costColor, 'left');

      // Count owned
      const countColor = canAfford ? def.color : '#444';
      text.drawText(buildings[i].count.toString(), bx + btnW - 6, by + 30, 18, countColor, 'right');

      // CPS contribution
      text.drawText('+' + def.cps + '/s each', bx + 32, by + 42, 10, '#666', 'left');
    }
  }

  game.start();
  return game;
}
