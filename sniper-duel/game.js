// sniper-duel/game.js — Sniper Duel ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 400;
const GROUND_Y = 320;
const GRAVITY = 180;       // px/s^2
const BULLET_SPEED = 420;  // px/s
const DT = 1 / 60;         // fixed timestep seconds

// ── State ──

let gameState; // 'waiting'|'playerAim'|'playerShoot'|'playerMove'|'aiAim'|'aiShoot'|'aiMove'|'over'
let score = 0;
let aiScoreVal = 0;
let wind = { x: 0, y: 0, display: '' };
let zoomLevel = 1;
const MIN_ZOOM = 1, MAX_ZOOM = 3;
let mouseX = 300, mouseY = 200;
let mouseOnCanvas = false;

// Terrain / environment
let terrain = [];
const buildings = [
  { x: 40,  w: 50, h: 60, color: '#3a3a4a' },
  { x: 130, w: 35, h: 45, color: '#3f3f4f' },
  { x: 420, w: 40, h: 55, color: '#3a3a4a' },
  { x: 510, w: 45, h: 50, color: '#3f3f4f' },
  { x: 270, w: 55, h: 70, color: '#353548' },
];
const trees = [
  { x: 70,  h: 55, r: 18 }, { x: 160, h: 50, r: 15 }, { x: 220, h: 45, r: 14 },
  { x: 340, h: 48, r: 16 }, { x: 390, h: 55, r: 18 }, { x: 470, h: 50, r: 15 },
  { x: 540, h: 45, r: 14 },
];
const bushes = [
  { x: 55,  r: 12 }, { x: 100, r: 10 }, { x: 180, r: 11 }, { x: 250, r: 13 },
  { x: 310, r: 10 }, { x: 360, r: 12 }, { x: 440, r: 11 }, { x: 490, r: 13 },
  { x: 555, r: 10 },
];
const PLAYER_COVERS = [
  { x: 60  }, { x: 110 }, { x: 155 }, { x: 195 },
];
const AI_COVERS = [
  { x: 405 }, { x: 445 }, { x: 505 }, { x: 535 },
];

let player = { x: 80, hp: 5, visible: false, visibleTimer: 0, coverIdx: 0 };
let ai     = { x: 520, hp: 5, visible: false, visibleTimer: 0, coverIdx: 0 };

let bullet = null; // { x, y, vx, vy, trail: [], shooter }
let bulletTrails = [];
let particles = [];

let aiAimTimer = 0;
let aiAimTarget = { x: 0, y: 0 };
let aiCrosshair = { x: 300, y: 200 };

let turnMessage = '';
let turnMessageTimer = 0;
let moveHighlights = [];
let movingPhase = false;

// HUD DOM references
let playerHPEl, scoreEl, aiHPEl, aiScoreEl, windInfoEl;

// Game reference (set in createGame, used by endGame called from setTimeout)
let _game = null;

// ── Terrain helpers ──

function getTerrainY(x) {
  let idx = Math.max(0, Math.min(terrain.length - 1, Math.floor(x / 2)));
  return terrain[idx] ? terrain[idx].y : GROUND_Y;
}

function getSniperY(sniper) {
  return getTerrainY(sniper.x) - 30;
}

function generateTerrain() {
  terrain = [];
  for (let x = 0; x <= W; x += 2) {
    const y = GROUND_Y + Math.sin(x * 0.008) * 15 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.05) * 3;
    terrain.push({ x, y });
  }
}

// ── Utility ──

function withAlpha(hex6, a) {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  // hex6 may already have alpha; strip to 6 chars then append
  return hex6.slice(0, 7) + aa;
}

function generateWind() {
  wind.x = (Math.random() - 0.5) * 120;
  wind.y = (Math.random() - 0.5) * 30;
  const dir = wind.x > 0 ? 'E' : 'W';
  wind.display = Math.abs(wind.x).toFixed(0) + ' ' + dir;
  if (windInfoEl) windInfoEl.textContent = wind.display;
}

function updateHUD() {
  if (playerHPEl) playerHPEl.textContent = player.hp;
  if (scoreEl)    scoreEl.textContent    = score;
  if (aiHPEl)     aiHPEl.textContent     = ai.hp;
  if (aiScoreEl)  aiScoreEl.textContent  = aiScoreVal;
}

// ── Draw helpers ──

function drawSky(r) {
  r.fillRect(0, 0, W, GROUND_Y * 0.5, '#0a0a1e');
  r.fillRect(0, GROUND_Y * 0.5, W, GROUND_Y * 0.5, '#141430');
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5 + 23) % W;
    const sy = (i * 97.3 + 11) % (GROUND_Y * 0.6);
    r.fillRect(sx, sy, 1.5, 1.5, '#ffffff4d');
  }
}

function drawGround(r) {
  r.fillRect(0, GROUND_Y - 20, W, H - (GROUND_Y - 20), '#1e3a1e');
  for (let i = 0; i < terrain.length - 1; i++) {
    const t0 = terrain[i], t1 = terrain[i + 1];
    const colY = Math.min(t0.y, t1.y);
    r.fillRect(t0.x, colY, t1.x - t0.x + 1, H - colY, '#2a4a2a');
  }
  for (let i = 0; i < terrain.length - 1; i++) {
    r.drawLine(terrain[i].x, terrain[i].y, terrain[i + 1].x, terrain[i + 1].y, '#3a5a3a', 2);
  }
}

function drawBuildings(r) {
  for (const b of buildings) {
    const baseY = getTerrainY(b.x + b.w / 2);
    r.fillRect(b.x, baseY - b.h, b.w, b.h, b.color);
    const rows = Math.floor(b.h / 16);
    const cols = Math.floor(b.w / 14);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = b.x + 4 + col * 14;
        const wy = baseY - b.h + 4 + row * 16;
        r.fillRect(wx, wy, 8, 10, '#1a1a2e');
        if ((row + col) % 3 === 0) r.fillRect(wx, wy, 8, 10, '#66886826');
      }
    }
    // Outline
    r.drawLine(b.x, baseY - b.h, b.x + b.w, baseY - b.h, '#2a2a3a', 1);
    r.drawLine(b.x + b.w, baseY - b.h, b.x + b.w, baseY, '#2a2a3a', 1);
    r.drawLine(b.x, baseY, b.x + b.w, baseY, '#2a2a3a', 1);
    r.drawLine(b.x, baseY - b.h, b.x, baseY, '#2a2a3a', 1);
  }
}

function drawTrees(r) {
  for (const t of trees) {
    const baseY = getTerrainY(t.x);
    r.fillRect(t.x - 3, baseY - t.h + t.r, 6, t.h - t.r, '#3a2a1a');
    r.fillCircle(t.x, baseY - t.h + t.r, t.r, '#2a5a2a');
    r.fillCircle(t.x - 4, baseY - t.h + t.r - 3, t.r * 0.7, '#3a6a3a');
  }
}

function drawBushes(r) {
  for (const b of bushes) {
    const baseY = getTerrainY(b.x);
    r.fillCircle(b.x,     baseY - b.r * 0.6, b.r * 0.85, '#1e4a1e');
    r.fillCircle(b.x + 3, baseY - b.r * 0.5, b.r * 0.6,  '#2a5a2a');
  }
}

function drawSniper(r, t, sniper, label, isPlayer) {
  const baseY = getTerrainY(sniper.x);
  const headY = baseY - 30;
  const bodyY = baseY - 20;
  let alpha = sniper.visible ? 1 : 0.15;
  if (!sniper.visible && !isPlayer) alpha = 0;
  if (alpha <= 0) return;

  const aa = Math.round(alpha * 255).toString(16).padStart(2, '0');
  r.fillRect(sniper.x - 5, bodyY, 10, 20, (isPlayer ? '#486848' : '#584838') + aa);
  r.fillCircle(sniper.x, headY, 6, (isPlayer ? '#5a7a5a' : '#6a5a4a') + aa);
  r.fillRect(sniper.x - 8, headY - 7, 16, 5, (isPlayer ? '#3a5a3a' : '#4a3a2a') + aa);
  const rd = isPlayer ? 1 : -1;
  r.drawLine(sniper.x, bodyY + 5, sniper.x + rd * 20, bodyY, '#2a2a2a' + aa, 2);
  if (sniper.visible) {
    r.fillCircle(sniper.x + rd * 18, bodyY - 1, 2, (isPlayer ? '#aaffaa' : '#ffaaaa') + aa);
  }
  if (sniper.visible || isPlayer) {
    t.drawText(label, sniper.x, headY - 22, 10, isPlayer ? '#668866' : '#aa6666', 'center');
    const hpW = 24;
    r.fillRect(sniper.x - hpW / 2, headY - 18, hpW, 3, '#333333');
    const hpColor = sniper.hp > 2 ? '#44aa44' : sniper.hp > 1 ? '#aaaa44' : '#aa4444';
    r.fillRect(sniper.x - hpW / 2, headY - 18, hpW * (sniper.hp / 5), 3, hpColor);
  }
}

function drawWindIndicator(r, t) {
  const cx = W / 2, cy = 20;
  const arrowLen = Math.abs(wind.x) * 0.5;
  const dir = wind.x > 0 ? 1 : -1;
  r.drawLine(cx - dir * arrowLen / 2, cy, cx + dir * arrowLen / 2, cy, '#668866', 2);
  const tip = cx + dir * arrowLen / 2;
  r.fillPoly([
    { x: tip,           y: cy },
    { x: tip - dir * 6, y: cy - 4 },
    { x: tip - dir * 6, y: cy + 4 },
  ], '#668866');
  t.drawText('WIND: ' + wind.display, cx, cy + 6, 10, '#668866', 'center');
}

function drawCrosshair(r, t, x, y, color) {
  const size = 15, sides = 24;
  const outerPts = [], innerPts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    outerPts.push({ x: x + Math.cos(a) * size, y: y + Math.sin(a) * size });
    innerPts.push({ x: x + Math.cos(a) * 3,    y: y + Math.sin(a) * 3 });
  }
  r.strokePoly(outerPts, color, 1, true);
  r.strokePoly(innerPts, color, 1, true);
  r.drawLine(x - size - 5, y, x - 5, y, color, 1);
  r.drawLine(x + 5, y, x + size + 5, y, color, 1);
  r.drawLine(x, y - size - 5, x, y - 5, color, 1);
  r.drawLine(x, y + 5, x, y + size + 5, color, 1);
  for (let i = 1; i <= 3; i++) {
    r.fillCircle(x + i * 8, y, 1.5, color);
    r.fillCircle(x - i * 8, y, 1.5, color);
    r.fillCircle(x, y + i * 8, 1.5, color);
  }
}

function drawBullet(r) {
  if (!bullet) return;
  if (bullet.trail.length > 1) {
    for (let i = 1; i < bullet.trail.length; i++) {
      const a = (i / bullet.trail.length) * 0.6;
      r.drawLine(
        bullet.trail[i - 1].x, bullet.trail[i - 1].y,
        bullet.trail[i].x,     bullet.trail[i].y,
        withAlpha('#ffdc78', a * 0.6), 1
      );
    }
  }
  r.setGlow('#ffcc66', 0.8);
  r.fillCircle(bullet.x, bullet.y, 2, '#ffddaa');
  r.fillCircle(bullet.x, bullet.y, 5, '#ffc86450');
  r.setGlow(null);
}

function drawBulletTrails(r) {
  for (const trail of bulletTrails) {
    if (trail.points.length < 2) continue;
    for (let j = 1; j < trail.points.length; j++) {
      const a = (j / trail.points.length) * trail.alpha * 0.3;
      if (a < 0.01) continue;
      r.drawLine(
        trail.points[j - 1].x, trail.points[j - 1].y,
        trail.points[j].x,     trail.points[j].y,
        withAlpha('#ffdc78', a), 1
      );
    }
  }
}

function drawParticles(r) {
  for (const p of particles) {
    const col = '#' +
      Math.round(p.r).toString(16).padStart(2, '0') +
      Math.round(p.g).toString(16).padStart(2, '0') +
      Math.round(p.b).toString(16).padStart(2, '0') +
      Math.round(p.alpha * 255).toString(16).padStart(2, '0');
    r.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, col);
  }
}

function drawMoveHighlights(r, t, now) {
  if (!movingPhase || gameState !== 'playerMove') return;
  for (let i = 0; i < moveHighlights.length; i++) {
    const mh = moveHighlights[i];
    const baseY = getTerrainY(mh.x);
    const pulse = Math.sin(now * 0.005 + i) * 0.15 + 0.5;
    r.fillRect(mh.x - 15, baseY - 35, 30, 35, withAlpha('#668866', pulse));
    r.strokePoly([
      { x: mh.x - 15, y: baseY - 35 }, { x: mh.x + 15, y: baseY - 35 },
      { x: mh.x + 15, y: baseY },      { x: mh.x - 15, y: baseY },
    ], '#668866', 1, true);
    t.drawText((i + 1) + '', mh.x, baseY - 42, 9, '#aaffaa', 'center');
  }
}

function drawScopeZoom(r, t) {
  if (zoomLevel <= 1.05) return;
  const scopeR = 60;
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push({ x: mouseX + Math.cos(a) * scopeR, y: mouseY + Math.sin(a) * scopeR });
  }
  r.strokePoly(pts, '#66886666', 2, true);
  t.drawText(zoomLevel.toFixed(1) + 'x', mouseX, mouseY + scopeR + 14, 9, '#66886699', 'center');
}

function drawTurnMessage(t) {
  if (turnMessageTimer <= 0) return;
  t.drawText(turnMessage, W / 2, H / 2 - 60, 16, withAlpha('#66aa66', Math.min(1, turnMessageTimer)), 'center');
}

function drawDistanceInfo(r, t) {
  if (gameState !== 'playerAim') return;
  const dist = Math.abs(ai.x - player.x);
  t.drawText('Range: ' + dist.toFixed(0) + 'm',             10, H - 26, 10, '#66886680', 'left');
  t.drawText('Drop: ~' + (dist * 0.12).toFixed(0) + 'px',  10, H - 14, 10, '#66886680', 'left');

  if (mouseOnCanvas) {
    const px = player.x, py = getSniperY(player);
    const angle = Math.atan2(mouseY - py, mouseX - px);
    const vx = Math.cos(angle) * BULLET_SPEED;
    const vy = Math.sin(angle) * BULLET_SPEED;
    for (let tm = 0.3; tm < 3; tm += 0.1) {
      if (Math.floor(tm * 10) % 3 !== 0) continue;
      const sx = px + (vx + wind.x) * tm;
      const sy = py + vy * tm + 0.5 * GRAVITY * tm * tm + wind.y * tm;
      if (sx < 0 || sx > W || sy > H) break;
      r.fillCircle(sx, sy, 1.5, '#66886640');
    }
  }
}

// ── Full world draw (no zoom) ──

function drawWorld(r, t, now) {
  drawSky(r);
  drawGround(r);
  drawBuildings(r);
  drawBushes(r);
  drawSniper(r, t, player, 'YOU', true);
  drawSniper(r, t, ai, 'AI', false);
  drawTrees(r);
  drawBulletTrails(r);
  drawBullet(r);
  drawParticles(r);
  drawMoveHighlights(r, t, now);
}

// ── Zoomed world draw ──
// Zoom is implemented by transforming every coordinate through zp()
// (translate around mouse point, scale, translate back).

function drawWorldZoomed(r, t, now) {
  const z = zoomLevel;
  const zx = mouseX, zy = mouseY;

  const zp = (wx, wy) => ({
    x: zx + (wx - zx) * z,
    y: zy + (wy - zy) * z,
  });
  const zr  = (x, y, w, h, col) => { const p = zp(x, y); r.fillRect(p.x, p.y, w * z, h * z, col); };
  const zc  = (cx, cy, rad, col) => { const p = zp(cx, cy); r.fillCircle(p.x, p.y, rad * z, col); };
  const zl  = (x1, y1, x2, y2, col, w) => {
    const p1 = zp(x1, y1), p2 = zp(x2, y2);
    r.drawLine(p1.x, p1.y, p2.x, p2.y, col, (w || 2) * z);
  };

  // Sky
  zr(0, 0, W, GROUND_Y * 0.5, '#0a0a1e');
  zr(0, GROUND_Y * 0.5, W, GROUND_Y * 0.5, '#141430');
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5 + 23) % W;
    const sy = (i * 97.3 + 11) % (GROUND_Y * 0.6);
    zr(sx, sy, 1.5, 1.5, '#ffffff4d');
  }

  // Ground
  zr(0, GROUND_Y - 20, W, H - (GROUND_Y - 20), '#1e3a1e');
  for (let i = 0; i < terrain.length - 1; i++) {
    const t0 = terrain[i], t1 = terrain[i + 1];
    const colY = Math.min(t0.y, t1.y);
    zr(t0.x, colY, t1.x - t0.x + 1, H - colY, '#2a4a2a');
  }
  for (let i = 0; i < terrain.length - 1; i++) {
    zl(terrain[i].x, terrain[i].y, terrain[i + 1].x, terrain[i + 1].y, '#3a5a3a', 2);
  }

  // Buildings
  for (const b of buildings) {
    const baseY = getTerrainY(b.x + b.w / 2);
    zr(b.x, baseY - b.h, b.w, b.h, b.color);
    const rows = Math.floor(b.h / 16), cols = Math.floor(b.w / 14);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = b.x + 4 + col * 14;
        const wy = baseY - b.h + 4 + row * 16;
        zr(wx, wy, 8, 10, '#1a1a2e');
        if ((row + col) % 3 === 0) zr(wx, wy, 8, 10, '#66886826');
      }
    }
  }

  // Bushes
  for (const b of bushes) {
    const baseY = getTerrainY(b.x);
    zc(b.x,     baseY - b.r * 0.6, b.r * 0.85, '#1e4a1e');
    zc(b.x + 3, baseY - b.r * 0.5, b.r * 0.6,  '#2a5a2a');
  }

  // Snipers
  const drawSniperZ = (sniper, label, isPlayer) => {
    const baseY = getTerrainY(sniper.x);
    const headY = baseY - 30, bodyY = baseY - 20;
    let alpha = sniper.visible ? 1 : 0.15;
    if (!sniper.visible && !isPlayer) alpha = 0;
    if (alpha <= 0) return;
    const aa = Math.round(alpha * 255).toString(16).padStart(2, '0');
    zr(sniper.x - 5, bodyY, 10, 20, (isPlayer ? '#486848' : '#584838') + aa);
    zc(sniper.x, headY, 6, (isPlayer ? '#5a7a5a' : '#6a5a4a') + aa);
    zr(sniper.x - 8, headY - 7, 16, 5, (isPlayer ? '#3a5a3a' : '#4a3a2a') + aa);
    const rd = isPlayer ? 1 : -1;
    zl(sniper.x, bodyY + 5, sniper.x + rd * 20, bodyY, '#2a2a2a' + aa, 2);
    if (sniper.visible) zc(sniper.x + rd * 18, bodyY - 1, 2, (isPlayer ? '#aaffaa' : '#ffaaaa') + aa);
    if (sniper.visible || isPlayer) {
      const lp = zp(sniper.x, headY - 22);
      t.drawText(label, lp.x, lp.y, 10 * z, isPlayer ? '#668866' : '#aa6666', 'center');
      const hpW = 24 * z, hpH = 3 * z;
      const hp = zp(sniper.x - 12, headY - 18);
      r.fillRect(hp.x, hp.y, hpW, hpH, '#333333');
      const hpColor = sniper.hp > 2 ? '#44aa44' : sniper.hp > 1 ? '#aaaa44' : '#aa4444';
      r.fillRect(hp.x, hp.y, hpW * (sniper.hp / 5), hpH, hpColor);
    }
  };
  drawSniperZ(player, 'YOU', true);
  drawSniperZ(ai,     'AI',  false);

  // Trees
  for (const tr of trees) {
    const baseY = getTerrainY(tr.x);
    zr(tr.x - 3, baseY - tr.h + tr.r, 6, tr.h - tr.r, '#3a2a1a');
    zc(tr.x, baseY - tr.h + tr.r, tr.r, '#2a5a2a');
    zc(tr.x - 4, baseY - tr.h + tr.r - 3, tr.r * 0.7, '#3a6a3a');
  }

  // Bullet trails
  for (const trail of bulletTrails) {
    if (trail.points.length < 2) continue;
    for (let j = 1; j < trail.points.length; j++) {
      const a = (j / trail.points.length) * trail.alpha * 0.3;
      if (a < 0.01) continue;
      const p1 = zp(trail.points[j - 1].x, trail.points[j - 1].y);
      const p2 = zp(trail.points[j].x,     trail.points[j].y);
      r.drawLine(p1.x, p1.y, p2.x, p2.y, withAlpha('#ffdc78', a), 1);
    }
  }

  // Bullet
  if (bullet) {
    if (bullet.trail.length > 1) {
      for (let i = 1; i < bullet.trail.length; i++) {
        const a = (i / bullet.trail.length) * 0.6;
        const p1 = zp(bullet.trail[i - 1].x, bullet.trail[i - 1].y);
        const p2 = zp(bullet.trail[i].x,     bullet.trail[i].y);
        r.drawLine(p1.x, p1.y, p2.x, p2.y, withAlpha('#ffdc78', a * 0.6), 1);
      }
    }
    const bp = zp(bullet.x, bullet.y);
    r.setGlow('#ffcc66', 0.8);
    r.fillCircle(bp.x, bp.y, 2 * z, '#ffddaa');
    r.fillCircle(bp.x, bp.y, 5 * z, '#ffc86450');
    r.setGlow(null);
  }

  // Particles
  for (const p of particles) {
    const col = '#' +
      Math.round(p.r).toString(16).padStart(2, '0') +
      Math.round(p.g).toString(16).padStart(2, '0') +
      Math.round(p.b).toString(16).padStart(2, '0') +
      Math.round(p.alpha * 255).toString(16).padStart(2, '0');
    const pp = zp(p.x, p.y);
    r.fillRect(pp.x - p.size / 2, pp.y - p.size / 2, p.size, p.size, col);
  }

  // Move highlights
  if (movingPhase && gameState === 'playerMove') {
    for (let i = 0; i < moveHighlights.length; i++) {
      const mh = moveHighlights[i];
      const baseY = getTerrainY(mh.x);
      const pulse = Math.sin(now * 0.005 + i) * 0.15 + 0.5;
      zr(mh.x - 15, baseY - 35, 30, 35, withAlpha('#668866', pulse));
      const lp = zp(mh.x, baseY - 42);
      t.drawText((i + 1) + '', lp.x, lp.y, 9 * z, '#aaffaa', 'center');
    }
  }
}

// ── Physics ──

function fireBullet(shooter, targetX, targetY) {
  let sx, sy;
  if (shooter === 'player') {
    sx = player.x; sy = getSniperY(player);
    player.visible = true; player.visibleTimer = 3;
  } else {
    sx = ai.x; sy = getSniperY(ai);
    ai.visible = true; ai.visibleTimer = 3;
  }
  const angle = Math.atan2(targetY - sy, targetX - sx);
  bullet = {
    x: sx, y: sy,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    trail: [{ x: sx, y: sy }],
    shooter,
  };
  for (let i = 0; i < 8; i++) {
    const a = angle + (Math.random() - 0.5) * 0.5;
    particles.push({
      x: sx, y: sy,
      vx: Math.cos(a) * (50 + Math.random() * 80),
      vy: Math.sin(a) * (50 + Math.random() * 80),
      r: 255, g: 220, b: 100,
      alpha: 1, size: 2 + Math.random() * 2, life: 0.3 + Math.random() * 0.3,
    });
  }
}

function updateBullet() {
  if (!bullet) return;
  bullet.vx += wind.x * DT;
  bullet.vy += (GRAVITY + wind.y) * DT;
  bullet.x  += bullet.vx * DT;
  bullet.y  += bullet.vy * DT;
  bullet.trail.push({ x: bullet.x, y: bullet.y });
  if (bullet.trail.length > 200) bullet.trail.shift();

  const target   = bullet.shooter === 'player' ? ai : player;
  const headY    = getSniperY(target);
  const bodyY    = headY + 10;
  const headDist = Math.hypot(bullet.x - target.x, bullet.y - headY);
  const bodyDist = Math.hypot(bullet.x - target.x, bullet.y - bodyY);
  const headshot = headDist < 8;
  const hit      = headshot || bodyDist < 12;

  if (hit) {
    const dmg = headshot ? 2 : 1;
    target.hp = Math.max(0, target.hp - dmg);
    if (bullet.shooter === 'player') score += dmg; else aiScoreVal += dmg;

    const hitColor = headshot ? { r: 255, g: 50, b: 50 } : { r: 255, g: 150, b: 50 };
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 100;
      particles.push({
        x: bullet.x, y: bullet.y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        r: hitColor.r, g: hitColor.g, b: hitColor.b,
        alpha: 1, size: 1.5 + Math.random() * 2, life: 0.4 + Math.random() * 0.4,
      });
    }
    turnMessage = bullet.shooter === 'player'
      ? (headshot ? 'HEADSHOT! -2 HP' : 'HIT! -1 HP')
      : (headshot ? 'AI HEADSHOT! -2 HP' : 'AI HIT! -1 HP');
    turnMessageTimer = 2;

    const wasPlayerShot = gameState === 'playerShoot';
    bulletTrails.push({ points: [...bullet.trail], alpha: 1 });
    bullet = null;
    updateHUD();

    if (target.hp <= 0) {
      endGame(target === ai ? 'player' : 'ai');
      return;
    }
    setTimeout(() => {
      if (wasPlayerShot) startPlayerMove(); else startAIMove();
    }, 800);
    return;
  }

  const groundY = getTerrainY(bullet.x);
  if (bullet.x < -20 || bullet.x > W + 20 || bullet.y > groundY || bullet.y > H + 20) {
    if (bullet.y >= groundY - 5) {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
        const spd = 20 + Math.random() * 60;
        particles.push({
          x: bullet.x, y: Math.min(bullet.y, groundY),
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          r: 120, g: 100, b: 60,
          alpha: 1, size: 1.5 + Math.random() * 2, life: 0.3 + Math.random() * 0.3,
        });
      }
    }
    turnMessage = bullet.shooter === 'player' ? 'MISS!' : 'AI MISSED!';
    turnMessageTimer = 1.5;
    const wasPlayerShot = gameState === 'playerShoot';
    bulletTrails.push({ points: [...bullet.trail], alpha: 1 });
    bullet = null;
    setTimeout(() => {
      if (wasPlayerShot) startPlayerMove(); else startAIMove();
    }, 800);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x   += p.vx * DT;
    p.y   += p.vy * DT;
    p.vy  += 100 * DT;
    p.life -= DT;
    p.alpha = Math.max(0, p.life / 0.5);
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateBulletTrails() {
  for (let i = bulletTrails.length - 1; i >= 0; i--) {
    bulletTrails[i].alpha -= 0.003;
    if (bulletTrails[i].alpha <= 0) bulletTrails.splice(i, 1);
  }
}

function updateVisibility() {
  for (const s of [player, ai]) {
    if (s.visibleTimer > 0) {
      s.visibleTimer -= DT;
      if (s.visibleTimer <= 0) { s.visible = false; s.visibleTimer = 0; }
    }
  }
}

function updateAIAim() {
  if (gameState !== 'aiAim') return;
  aiAimTimer += DT;
  let tt = Math.min(1, aiAimTimer / 1.5);
  tt = tt * tt * (3 - 2 * tt); // smoothstep
  aiCrosshair.x = W / 2 + (aiAimTarget.x - W / 2) * tt + Math.sin(aiAimTimer * 3) * 3 * (1 - tt);
  aiCrosshair.y = H / 2 + (aiAimTarget.y - H / 2) * tt + Math.cos(aiAimTimer * 4) * 2 * (1 - tt);
  if (aiAimTimer >= 1.8) {
    gameState = 'aiShoot';
    fireBullet('ai', aiAimTarget.x, aiAimTarget.y);
  }
}

// ── Game flow ──

function startGame() {
  _game.hideOverlay();
  gameState = 'playerAim';
  turnMessage = 'YOUR TURN - Aim and fire!';
  turnMessageTimer = 2;
}

function startPlayerMove() {
  gameState = 'playerMove';
  movingPhase = true;
  moveHighlights = PLAYER_COVERS.filter((_, i) => i !== player.coverIdx);
  turnMessage = 'Choose new cover position';
  turnMessageTimer = 2;
}

function playerMoveTo(idx) {
  player.coverIdx = idx;
  player.x = PLAYER_COVERS[idx].x;
  movingPhase = false;
  moveHighlights = [];
  setTimeout(() => { player.visible = false; startAITurn(); }, 500);
}

function startAITurn() {
  gameState = 'aiAim';
  generateWind();
  aiCrosshair.x = W / 2;
  aiCrosshair.y = H / 2;
  aiAimTimer = 0;

  const dist = Math.abs(player.x - ai.x);
  const travelTime = dist / BULLET_SPEED;
  const windCompX  = -wind.x * travelTime * 0.7;
  const windCompY  = -wind.y * travelTime * 0.7;
  const gravComp   = -0.5 * GRAVITY * travelTime * travelTime * 0.7;
  const errorX = (Math.random() - 0.5) * 0.35 * 60;
  const errorY = (Math.random() - 0.5) * 0.35 * 40;

  aiAimTarget = {
    x: player.x + windCompX + errorX,
    y: getSniperY(player) + gravComp + windCompY + errorY,
  };
  turnMessage = 'AI is aiming...';
  turnMessageTimer = 2;
}

function startAIMove() {
  gameState = 'aiMove';
  const options = AI_COVERS.map((_, i) => i).filter(i => i !== ai.coverIdx);
  const newIdx = options[Math.floor(Math.random() * options.length)];
  ai.coverIdx = newIdx;
  ai.x = AI_COVERS[newIdx].x;
  turnMessage = 'AI repositions...';
  turnMessageTimer = 1.5;
  setTimeout(() => { ai.visible = false; startPlayerTurn(); }, 1000);
}

function startPlayerTurn() {
  gameState = 'playerAim';
  generateWind();
  turnMessage = 'YOUR TURN - Aim and fire!';
  turnMessageTimer = 2;
}

function endGame(winner) {
  gameState = 'over';
  if (winner === 'player') {
    _game.showOverlay('VICTORY!', 'Target eliminated  |  Hits: ' + score + '  |  Click to play again');
  } else {
    _game.showOverlay('DEFEATED', 'You were eliminated  |  Hits: ' + score + '  |  Click to play again');
  }
  _game.setState('over');
}

// ── Init ──

function initState() {
  gameState    = 'waiting';
  score        = 0;
  aiScoreVal   = 0;
  player.hp    = 5; player.visible = false; player.visibleTimer = 0;
  ai.hp        = 5; ai.visible     = false; ai.visibleTimer     = 0;
  zoomLevel    = 1;
  bullet       = null;
  bulletTrails = [];
  particles    = [];
  moveHighlights = [];
  movingPhase  = false;
  turnMessage  = '';
  turnMessageTimer = 0;

  generateTerrain();
  player.coverIdx = 0;
  player.x = PLAYER_COVERS[0].x;
  ai.coverIdx = Math.floor(Math.random() * AI_COVERS.length);
  ai.x = AI_COVERS[ai.coverIdx].x;
  generateWind();
  updateHUD();
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  _game = game;

  playerHPEl = document.getElementById('playerHP');
  scoreEl    = document.getElementById('score');
  aiHPEl     = document.getElementById('aiHP');
  aiScoreEl  = document.getElementById('aiScore');
  windInfoEl = document.getElementById('windInfo');

  // Mouse — direct canvas listeners (not engine input, since we need raw canvas coords)
  game.canvas.addEventListener('mousemove', (e) => {
    const rect = game.canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top)  * (H / rect.height);
    mouseOnCanvas = true;
  });
  game.canvas.addEventListener('mouseleave', () => { mouseOnCanvas = false; });

  game.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (gameState === 'playerAim') {
      zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - e.deltaY * 0.003));
    }
  }, { passive: false });

  game.canvas.addEventListener('click', (e) => {
    const rect = game.canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top)  * (H / rect.height);

    if (gameState === 'waiting' || gameState === 'over') {
      game.onInit();
      startGame();
      return;
    }
    if (gameState === 'playerAim') {
      gameState = 'playerShoot';
      zoomLevel = 1;
      fireBullet('player', cx, cy);
      return;
    }
    if (gameState === 'playerMove') {
      for (let i = 0; i < PLAYER_COVERS.length; i++) {
        if (i === player.coverIdx) continue;
        const cov = PLAYER_COVERS[i];
        const baseY = getTerrainY(cov.x);
        if (cx >= cov.x - 20 && cx <= cov.x + 20 && cy >= baseY - 40 && cy <= baseY) {
          playerMoveTo(i);
          return;
        }
      }
    }
  });

  game.onInit = () => {
    initState();
    game.showOverlay('SNIPER DUEL',
      'Click to Start  |  Aim with mouse  |  Click to fire  |  Scroll to zoom');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    if (gameState === 'waiting' || gameState === 'over') return;
    updateBullet();
    updateParticles();
    updateBulletTrails();
    updateVisibility();
    updateAIAim();
    if (turnMessageTimer > 0) turnMessageTimer -= DT;
  };

  game.onDraw = (renderer, text) => {
    const now = performance.now();
    if (zoomLevel > 1.05) {
      drawWorldZoomed(renderer, text, now);
    } else {
      drawWorld(renderer, text, now);
    }
    // HUD (never zoomed)
    drawWindIndicator(renderer, text);
    drawDistanceInfo(renderer, text);
    drawTurnMessage(text);
    if (gameState === 'playerAim' && mouseOnCanvas) {
      drawCrosshair(renderer, text, mouseX, mouseY, '#66ff6699');
    }
    if (gameState === 'aiAim' || gameState === 'aiShoot') {
      drawCrosshair(renderer, text, aiCrosshair.x, aiCrosshair.y, '#ff666680');
    }
    drawScopeZoom(renderer, text);
    if (gameState === 'playerAim' || gameState === 'playerMove') {
      const label = gameState === 'playerAim' ? 'AIM & FIRE' : 'CLICK COVER TO MOVE';
      text.drawText(label, W - 10, H - 14, 11, '#668866', 'right');
    } else if (gameState === 'aiAim' || gameState === 'aiShoot' || gameState === 'aiMove') {
      text.drawText('AI TURN...', W - 10, H - 14, 11, '#aa6666', 'right');
    }
  };

  game.start();
  return game;
}
