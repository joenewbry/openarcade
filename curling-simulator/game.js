// curling-simulator/game.js — Curling Simulator for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 400, H = 600;
const CX = W / 2;
const THEME = '#4cf';

// ---- Sheet geometry ----
const SHEET_L = 40;
const SHEET_R = W - 40;
const SHEET_T = 15;
const SHEET_B = H - 15;
const SHEET_W = SHEET_R - SHEET_L;

// House (target) positioned in the upper portion of the sheet
const HOUSE_Y = 105;
const BUTTON_R = 5;
const RING1_R = 20;   // 4-foot
const RING2_R = 40;   // 8-foot
const RING3_R = 60;   // 12-foot

// Key lines
const BACK_LINE = HOUSE_Y - RING3_R - 8;
const TEE_LINE = HOUSE_Y;
const HOG_FAR = HOUSE_Y + RING3_R + 30;
const HOG_NEAR = H - 90;
const HACK_Y = H - 45;

// Stone physics
const STONE_R = 10;
const FRICTION = 0.9925;
const SWEEP_FRICTION = 0.9965;
const CURL_STRENGTH = 0.008;
const MIN_SPEED = 0.06;
const MAX_STONES = 8;
const MAX_ENDS = 8;

// ---- DOM refs ----
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const endInfoEl = document.getElementById('endInfo');

// ---- State ----
let score, cpuScore, currentEnd, stonesThrown;
let stones, activeStone, phase;
let aimAngle, powerLevel, powerDir;
let sweeping, mouseDown, mouseX, mouseY, aiSweepFramesLeft;
let curlDir, hammerTeam, endScores;
let animFrame, aiThinkTimer, msg, msgTimer;
let scoringDisplay, turnDelay, particles;
let pendingMouseEvents = [];
let turnDelayTimer = 0;   // frame counter for turn delay
let turnDelayFrames = 0;  // how many frames to wait

// ---- Helpers ----
function isPlayerTurn() {
  if (hammerTeam === 'player') {
    return stonesThrown % 2 === 1;
  } else {
    return stonesThrown % 2 === 0;
  }
}

function distToButton(s) {
  return Math.hypot(s.x - CX, s.y - HOUSE_Y);
}

function showMsg(text, duration) {
  msg = text;
  msgTimer = duration || 120;
}

function updateEndInfo() {
  if (endInfoEl) endInfoEl.textContent = `End ${currentEnd}/${MAX_ENDS}`;
}

// ---- Particles ----
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.5 + Math.random() * 1.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 20 + Math.random() * 20,
      maxLife: 30,
      color
    });
  }
}

// ---- Stone launch ----
function launchStone(team, angle, power, curl) {
  const speed = 1.5 + power * 5.5;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const s = { team, x: CX, y: HACK_Y, vx, vy, curl: curl || 0, active: true };
  stones.push(s);
  activeStone = s;
  phase = 'sliding';
  sweeping = false;
  stonesThrown++;
  spawnParticles(CX, HACK_Y, '#fff', 3);
}

// ---- Physics ----
function updatePhysics() {
  let anyMoving = false;

  for (let s of stones) {
    if (!s.active) continue;
    const speed = Math.hypot(s.vx, s.vy);
    if (speed < MIN_SPEED) {
      s.vx = 0;
      s.vy = 0;
      continue;
    }
    anyMoving = true;

    const f = (s === activeStone && sweeping) ? SWEEP_FRICTION : FRICTION;
    s.vx *= f;
    s.vy *= f;

    if (speed > 0.2 && speed < 3.5) {
      const curlAmt = CURL_STRENGTH * s.curl * (1 - speed / 5);
      s.vx += curlAmt;
    }

    s.x += s.vx;
    s.y += s.vy;

    if (s.x - STONE_R < SHEET_L) {
      s.x = SHEET_L + STONE_R;
      s.vx = Math.abs(s.vx) * 0.4;
    }
    if (s.x + STONE_R > SHEET_R) {
      s.x = SHEET_R - STONE_R;
      s.vx = -Math.abs(s.vx) * 0.4;
    }

    if (s.y - STONE_R < BACK_LINE) {
      s.active = false;
      spawnParticles(s.x, s.y, s.team === 'player' ? '#f66' : '#ff6', 5);
      continue;
    }
    if (s.y > SHEET_B + 30) {
      s.active = false;
      continue;
    }
  }

  // Stone-stone collisions
  for (let i = 0; i < stones.length; i++) {
    const a = stones[i];
    if (!a.active) continue;
    for (let j = i + 1; j < stones.length; j++) {
      const b = stones[j];
      if (!b.active) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minD = STONE_R * 2;

      if (dist < minD && dist > 0.1) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minD - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const dvn = dvx * nx + dvy * ny;

        if (dvn > 0) {
          const rest = 0.82;
          a.vx -= dvn * nx * rest;
          a.vy -= dvn * ny * rest;
          b.vx += dvn * nx * rest;
          b.vy += dvn * ny * rest;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          spawnParticles(mx, my, '#fff', 4);
        }
      }
    }
  }

  return anyMoving;
}

// ---- Scoring ----
function scoreEnd(game) {
  phase = 'scoring';
  const pStones = stones.filter(s => s.active && s.team === 'player');
  const cStones = stones.filter(s => s.active && s.team === 'cpu');

  let closestP = Infinity, closestC = Infinity;
  for (let s of pStones) closestP = Math.min(closestP, distToButton(s));
  for (let s of cStones) closestC = Math.min(closestC, distToButton(s));

  let ep = 0, ec = 0;
  const houseLimit = RING3_R + STONE_R;

  if (closestP < closestC) {
    for (let s of pStones) {
      if (distToButton(s) < closestC && distToButton(s) <= houseLimit) ep++;
    }
    if (ep > 0) hammerTeam = 'cpu';
  } else if (closestC < closestP) {
    for (let s of cStones) {
      if (distToButton(s) < closestP && distToButton(s) <= houseLimit) ec++;
    }
    if (ec > 0) hammerTeam = 'player';
  }

  score += ep;
  cpuScore += ec;
  if (scoreEl) scoreEl.textContent = score;
  if (bestEl) bestEl.textContent = cpuScore;
  endScores.push({ player: ep, cpu: ec });

  scoringDisplay = { playerScore: ep, cpuScore: ec, timer: 200 };
}

function advanceEnd(game) {
  currentEnd++;
  if (currentEnd > MAX_ENDS) {
    doGameOver(game);
    return;
  }
  startEnd(game);
}

function doGameOver(game) {
  let title, text;
  if (score > cpuScore) {
    title = 'YOU WIN!';
  } else if (cpuScore > score) {
    title = 'CPU WINS';
  } else {
    title = 'DRAW';
  }
  text = `${score} - ${cpuScore} | Click to play again`;
  game.showOverlay(title, text);
  game.setState('over');
}

// ---- AI ----
function aiTurn() {
  const cpuS = stones.filter(s => s.active && s.team === 'cpu');
  const plS = stones.filter(s => s.active && s.team === 'player');
  const stonesRemaining = MAX_STONES * 2 - stonesThrown;

  let closestPD = Infinity, closestCD = Infinity;
  let closestPS = null, closestCS = null;
  for (let s of plS) { const d = distToButton(s); if (d < closestPD) { closestPD = d; closestPS = s; } }
  for (let s of cpuS) { const d = distToButton(s); if (d < closestCD) { closestCD = d; closestCS = s; } }

  let targetX = CX, targetY = HOUSE_Y;
  let power = 0.5;
  let curl = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);

  const r = Math.random();

  if (closestPS && closestPD < RING2_R && closestPD < closestCD && r < 0.55) {
    targetX = closestPS.x + (Math.random() - 0.5) * 3;
    targetY = closestPS.y;
    power = 0.65 + Math.random() * 0.2;
  } else if (cpuS.length === 0 || closestCD > RING2_R) {
    if (r < 0.7 || stonesRemaining <= 4) {
      targetX = CX + (Math.random() - 0.5) * RING1_R * 1.5;
      targetY = HOUSE_Y + (Math.random() - 0.5) * RING1_R;
      power = 0.42 + Math.random() * 0.14;
    } else {
      targetX = CX + (Math.random() - 0.5) * 30;
      targetY = HOG_FAR + 10 + Math.random() * 25;
      power = 0.34 + Math.random() * 0.08;
    }
  } else if (closestCS && closestCD < RING1_R && r < 0.5) {
    const side = Math.random() > 0.5 ? 1 : -1;
    targetX = closestCS.x + side * STONE_R * 2.3;
    targetY = closestCS.y + (Math.random() - 0.5) * STONE_R;
    power = 0.44 + Math.random() * 0.1;
  } else if (closestPS && closestPD < RING3_R && r < 0.7) {
    targetX = closestPS.x + (Math.random() - 0.5) * 3;
    targetY = closestPS.y;
    power = 0.62 + Math.random() * 0.18;
  } else {
    targetX = CX + (Math.random() - 0.5) * RING2_R;
    targetY = HOUSE_Y + (Math.random() - 0.5) * RING1_R * 1.5;
    power = 0.43 + Math.random() * 0.13;
  }

  const dx = targetX - CX;
  const dy = targetY - HACK_Y;
  let angle = Math.atan2(dy, dx);

  angle += (Math.random() - 0.5) * 0.04;
  power += (Math.random() - 0.5) * 0.04;
  power = Math.max(0.25, Math.min(0.92, power));

  launchStone('cpu', angle, power, curl);

  if (power < 0.6 && Math.random() > 0.35) {
    sweeping = true;
    aiSweepFramesLeft = Math.floor((1200 + Math.random() * 1500) / (1000 / 60));
  }
}

// ---- Init / End management ----
function startEnd(game) {
  stones = [];
  stonesThrown = 0;
  activeStone = null;
  phase = 'idle';
  sweeping = false;
  scoringDisplay = null;
  particles = [];
  aiSweepFramesLeft = 0;
  turnDelayTimer = 0;
  turnDelayFrames = 0;
  updateEndInfo();
  beginTurn(game);
}

function beginTurn(game) {
  if (stonesThrown >= MAX_STONES * 2) {
    scoreEnd(game);
    return;
  }
  if (isPlayerTurn()) {
    phase = 'aim';
    aimAngle = -Math.PI / 2;
    powerLevel = 0;
    powerDir = 1;
    curlDir = 1;
    showMsg('Click to set aim direction', 150);
  } else {
    phase = 'aiThink';
    aiThinkTimer = 45 + Math.floor(Math.random() * 30);
    showMsg('CPU is thinking...', 90);
  }
}

// ---- Drawing helpers ----

function drawSheet(renderer, text) {
  // Ice surface — approximate gradient with multiple fillRects
  const iceColors = ['#c8dce6', '#cce4ee', '#d0e6f0', '#cce4ee', '#c0d4de'];
  const segH = (SHEET_B - SHEET_T) / iceColors.length;
  for (let i = 0; i < iceColors.length; i++) {
    renderer.fillRect(SHEET_L, SHEET_T + i * segH, SHEET_W, segH + 1, iceColors[i]);
  }

  // Pebble texture (subtle dots) — deterministic positions
  for (let i = 0; i < 120; i++) {
    const px = SHEET_L + ((i * 137.508 + 50) % SHEET_W);
    const py = SHEET_T + ((i * 73.13 + 20) % (SHEET_B - SHEET_T));
    renderer.fillCircle(px, py, 0.8, 'rgba(180,200,210,0.4)');
  }

  // ---- House rings ----
  renderer.fillCircle(CX, HOUSE_Y, RING3_R, '#2266bb');
  renderer.fillCircle(CX, HOUSE_Y, RING2_R + 4, '#e0ecf2');
  renderer.fillCircle(CX, HOUSE_Y, RING2_R, '#cc2222');
  renderer.fillCircle(CX, HOUSE_Y, RING1_R + 3, '#e0ecf2');
  renderer.fillCircle(CX, HOUSE_Y, RING1_R, '#2266bb');
  renderer.fillCircle(CX, HOUSE_Y, BUTTON_R, '#e0ecf2');

  // Ring outlines (thin circles drawn as strokePoly)
  const ringOutlineColor = 'rgba(0,0,0,0.15)';
  const rings = [RING3_R, RING2_R + 4, RING2_R, RING1_R + 3, RING1_R, BUTTON_R];
  for (const rr of rings) {
    const pts = [];
    const segs = 32;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push({ x: CX + Math.cos(a) * rr, y: HOUSE_Y + Math.sin(a) * rr });
    }
    renderer.strokePoly(pts, ringOutlineColor, 0.5, false);
  }

  // Center line (vertical)
  renderer.drawLine(CX, BACK_LINE - 5, CX, SHEET_B, 'rgba(0,0,0,0.25)', 1);

  // Tee line
  renderer.drawLine(SHEET_L, TEE_LINE, SHEET_R, TEE_LINE, 'rgba(0,0,0,0.25)', 1);

  // Back line
  renderer.drawLine(SHEET_L, BACK_LINE, SHEET_R, BACK_LINE, 'rgba(180,30,30,0.5)', 1.5);

  // Hog lines
  renderer.drawLine(SHEET_L, HOG_FAR, SHEET_R, HOG_FAR, 'rgba(180,30,30,0.6)', 2);
  renderer.drawLine(SHEET_L, HOG_NEAR, SHEET_R, HOG_NEAR, 'rgba(180,30,30,0.6)', 2);

  // Line labels
  text.drawText('BACK', SHEET_R - 4, BACK_LINE - 10, 8, 'rgba(0,0,0,0.2)', 'right');
  text.drawText('HOG', SHEET_R - 4, HOG_FAR - 10, 8, 'rgba(0,0,0,0.2)', 'right');
  text.drawText('HOG', SHEET_R - 4, HOG_NEAR - 10, 8, 'rgba(0,0,0,0.2)', 'right');

  // Hack
  renderer.fillRect(CX - 12, HACK_Y - 4, 24, 8, '#444');
  renderer.fillRect(CX - 10, HACK_Y - 3, 20, 6, '#666');
  renderer.fillRect(CX - 2, HACK_Y - 5, 4, 10, '#555');

  // Sheet border with neon glow
  renderer.setGlow('#4cf', 0.5);
  const borderPts = [
    { x: SHEET_L - 1, y: SHEET_T - 1 },
    { x: SHEET_R + 1, y: SHEET_T - 1 },
    { x: SHEET_R + 1, y: SHEET_B + 1 },
    { x: SHEET_L - 1, y: SHEET_B + 1 },
  ];
  renderer.strokePoly(borderPts, 'rgba(68,204,255,0.3)', 3, true);
  renderer.setGlow(null);
}

function drawStoneFull(renderer, x, y, team, isActive) {
  const isRed = team === 'player';
  const main = isRed ? '#cc2222' : '#ccaa11';
  const dark = isRed ? '#991111' : '#998800';

  // Shadow
  renderer.fillCircle(x + 1.5, y + 1.5, STONE_R + 0.5, 'rgba(0,0,0,0.25)');

  // Glow for active stone
  if (isActive) {
    renderer.setGlow(main, 0.6);
  }

  // Body
  renderer.fillCircle(x, y, STONE_R, main);

  if (isActive) renderer.setGlow(null);

  // Edge ring (dark outline circle — approximate with slightly larger circle under)
  // Draw dark ring: draw slightly smaller circle on top
  renderer.fillCircle(x, y, STONE_R - 1, dark);
  renderer.fillCircle(x, y, STONE_R - 2.5, main);

  // Handle (center dark)
  renderer.fillCircle(x, y, STONE_R * 0.45, dark);

  // Handle highlight arc — approximate as a thin white arc
  // Draw a small white partial circle (top-left portion)
  {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI * 0.8 + (i / 8) * (Math.PI * 0.6);
      const hr = STONE_R * 0.45;
      pts.push({ x: x + Math.cos(a) * hr, y: y + Math.sin(a) * hr });
    }
    renderer.strokePoly(pts, 'rgba(255,255,255,0.25)', 1, false);
  }

  // Specular highlight
  renderer.fillCircle(x - 2.5, y - 2.5, STONE_R * 0.25, 'rgba(255,255,255,0.3)');
}

function drawStones(renderer) {
  const sorted = stones.filter(s => s.active);
  if (activeStone) {
    const idx = sorted.indexOf(activeStone);
    if (idx >= 0) {
      sorted.splice(idx, 1);
      sorted.push(activeStone);
    }
  }
  for (let s of sorted) {
    drawStoneFull(renderer, s.x, s.y, s.team, s === activeStone && phase === 'sliding');
  }
}

function drawUI(renderer, text) {
  // ---- Aim phase ----
  if (phase === 'aim' && isPlayerTurn()) {
    const aimLen = 120;
    const ex = CX + Math.cos(aimAngle) * aimLen;
    const ey = HACK_Y + Math.sin(aimAngle) * aimLen;

    // Dashed aim line
    renderer.dashedLine(CX, HACK_Y, ex, ey, 'rgba(68,204,255,0.5)', 1.5, 5, 5);

    // Crosshair circle
    {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pts.push({ x: ex + Math.cos(a) * 10, y: ey + Math.sin(a) * 10 });
      }
      renderer.strokePoly(pts, 'rgba(68,204,255,0.7)', 1, false);
    }
    // Crosshair lines
    renderer.drawLine(ex - 14, ey, ex + 14, ey, 'rgba(68,204,255,0.7)', 1);
    renderer.drawLine(ex, ey - 14, ex, ey + 14, 'rgba(68,204,255,0.7)', 1);

    // Stone preview at hack
    drawStoneFull(renderer, CX, HACK_Y, 'player', false);

    // Curl direction
    const curlLabel = 'Curl: ' + (curlDir > 0 ? '>>>' : '<<<');
    renderer.setGlow('#4cf', 0.3);
    text.drawText(curlLabel, CX, HACK_Y + 17, 11, '#4cf', 'center');
    renderer.setGlow(null);
    text.drawText('Right-click to flip curl', CX, HACK_Y + 29, 9, 'rgba(150,150,150,0.7)', 'center');
  }

  // ---- Power phase ----
  if (phase === 'power') {
    const mx = SHEET_R + 10;
    const my = 60;
    const mh = 420;
    const mw = 14;

    // Background
    renderer.fillRect(mx - 3, my - 3, mw + 6, mh + 6, 'rgba(26,26,46,0.95)');

    // Power fill — gradient-like with multiple rects
    const fillH = mh * powerLevel;
    if (fillH > 0) {
      const segments = 20;
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const segY = my + mh - fillH + t * fillH;
        const segH2 = fillH / segments + 1;
        // gradient: green -> yellow -> orange -> red
        let r2, g2, b2;
        if (t < 0.4) {
          r2 = Math.round(34 + t / 0.4 * (204 - 34));
          g2 = Math.round(170 + t / 0.4 * (204 - 170));
          b2 = Math.round(102 + t / 0.4 * (34 - 102));
        } else if (t < 0.7) {
          const tt = (t - 0.4) / 0.3;
          r2 = Math.round(204 + tt * (204 - 204));
          g2 = Math.round(204 - tt * (204 - 102));
          b2 = Math.round(34);
        } else {
          const tt = (t - 0.7) / 0.3;
          r2 = 204;
          g2 = Math.round(102 - tt * 102);
          b2 = Math.round(34 - tt * 34);
        }
        renderer.fillRect(mx, segY, mw, segH2, `rgb(${r2},${g2},${b2})`);
      }
    }

    // Zone labels
    text.drawText('MAX', mx + mw + 3, my + 2, 7, 'rgba(255,255,255,0.3)', 'left');
    text.drawText('MED', mx + mw + 3, my + mh * 0.5 - 4, 7, 'rgba(255,255,255,0.3)', 'left');
    text.drawText('LOW', mx + mw + 3, my + mh - 9, 7, 'rgba(255,255,255,0.3)', 'left');

    // Border
    renderer.strokePoly([
      { x: mx, y: my },
      { x: mx + mw, y: my },
      { x: mx + mw, y: my + mh },
      { x: mx, y: my + mh },
    ], '#4cf', 1, true);

    // Indicator bar
    const iy = my + mh - fillH;
    renderer.setGlow('#fff', 0.6);
    renderer.fillRect(mx - 5, iy - 2, mw + 10, 4, '#fff');
    renderer.setGlow(null);

    // Power percentage
    renderer.setGlow('#4cf', 0.3);
    text.drawText(Math.round(powerLevel * 100) + '%', mx + mw / 2, my + mh + 4, 12, '#4cf', 'center');
    text.drawText('PWR', mx + mw / 2, my - 14, 12, '#4cf', 'center');
    renderer.setGlow(null);

    // Faint aim line
    renderer.dashedLine(CX, HACK_Y, CX + Math.cos(aimAngle) * 80, HACK_Y + Math.sin(aimAngle) * 80,
      'rgba(68,204,255,0.25)', 1, 4, 4);

    drawStoneFull(renderer, CX, HACK_Y, 'player', false);
  }

  // ---- Sweep indicator ----
  if (phase === 'sliding' && activeStone && activeStone.active) {
    if (activeStone.team === 'player') {
      const sweepText = sweeping ? '*** SWEEPING! ***' : 'Hold mouse to SWEEP';
      const sweepColor = sweeping ? 'rgba(68,255,120,0.9)' : 'rgba(68,204,255,0.7)';
      renderer.setGlow(sweeping ? '#4f8' : '#4cf', 0.4);
      text.drawText(sweepText, CX, SHEET_B + 2, 12, sweepColor, 'center');
      renderer.setGlow(null);

      // Broom animation near stone when sweeping
      if (sweeping && activeStone.active) {
        const boff = Math.sin(animFrame * 0.4) * 12;
        const bx = activeStone.x + boff;
        const by = activeStone.y + 2;
        renderer.drawLine(bx + 5, by - 6, bx - 5, by + 6, 'rgba(68,255,120,0.5)', 2);
        renderer.drawLine(bx - 5, by - 6, bx + 5, by + 6, 'rgba(68,255,120,0.5)', 2);
      }
    } else {
      if (sweeping) {
        text.drawText('CPU sweeping...', CX, SHEET_B + 2, 11, 'rgba(221,204,34,0.6)', 'center');
      }
    }
  }

  // ---- Turn message ----
  if (msgTimer > 0 && phase !== 'sliding') {
    const alpha = Math.min(1, msgTimer / 40);
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    renderer.setGlow('#4cf', 0.3);
    text.drawText(msg, CX, SHEET_B + 2, 12, `#44ccff${alphaHex}`, 'center');
    renderer.setGlow(null);
  }

  // ---- Stone count ----
  drawStoneCount(renderer, text, 5, H - 12, 'player');
  drawStoneCount(renderer, text, W - 100, H - 12, 'cpu');

  // ---- End scoreboard ----
  if (endScores.length > 0) {
    drawScoreboard(renderer, text);
  }

  // ---- Particles ----
  for (let p of particles) {
    const a = p.life / 30;
    const alphaHex = Math.round(Math.min(1, a) * 255).toString(16).padStart(2, '0');
    const rad = 1.5 * a;
    if (rad > 0.1) {
      renderer.fillCircle(p.x, p.y, rad, p.color + alphaHex);
    }
  }

  // Distance indicators for stones in/near house
  if (phase !== 'aim' && phase !== 'power') {
    const activeStones = stones.filter(s => s.active);
    for (let s of activeStones) {
      const d = distToButton(s);
      if (d <= RING3_R + STONE_R * 2) {
        const col = s.team === 'player' ? 'rgba(255,100,100,0.6)' : 'rgba(255,220,50,0.6)';
        text.drawText(d.toFixed(0), s.x, s.y - STONE_R - 11, 7, col, 'center');
      }
    }
  }
}

function drawStoneCount(renderer, text, x, y, team) {
  const thrown = stones.filter(s => s.team === team).length;
  const color = team === 'player' ? '#cc2222' : '#ccaa11';
  text.drawText(team === 'player' ? 'YOU' : 'CPU', x, y - 11, 8, 'rgba(200,200,200,0.4)', 'left');
  for (let i = 0; i < MAX_STONES; i++) {
    const c = i < thrown ? 'rgba(60,60,60,0.3)' : color;
    renderer.fillCircle(x + 4 + i * 10, y + 5, 3.5, c);
  }
}

function drawScoreboard(renderer, text) {
  const sbW = Math.min(W - 10, 30 + endScores.length * 28 + 60);
  const sbX = (W - sbW) / 2;
  const sbY = 1;
  const sbH = 13;

  renderer.fillRect(sbX, sbY, sbW, sbH, 'rgba(26,26,46,0.9)');
  renderer.strokePoly([
    { x: sbX, y: sbY },
    { x: sbX + sbW, y: sbY },
    { x: sbX + sbW, y: sbY + sbH },
    { x: sbX, y: sbY + sbH },
  ], 'rgba(68,204,255,0.2)', 0.5, true);

  let xp = sbX + 16;
  text.drawText('END', xp, sbY + 1, 8, '#888', 'center');
  xp += 18;

  for (let i = 0; i < endScores.length; i++) {
    const es = endScores[i];
    let col;
    if (es.player > 0) col = '#ff5555';
    else if (es.cpu > 0) col = '#ffdd44';
    else col = '#555';
    const val = es.player > 0 ? es.player : (es.cpu > 0 ? es.cpu : '-');
    text.drawText(String(val), xp, sbY + 1, 8, col, 'center');
    xp += 22;
  }

  text.drawText(`${score}-${cpuScore}`, xp + 8, sbY + 1, 8, '#4cf', 'center');
}

function drawScoringOverlay(renderer, text) {
  if (!scoringDisplay) return;
  const a = Math.min(1, scoringDisplay.timer / 40);

  const alphaHex = Math.round(a * 0.75 * 255).toString(16).padStart(2, '0');
  renderer.fillRect(0, H / 2 - 65, W, 130, `#1a1a2e${alphaHex}`);

  const aHex = Math.round(a * 255).toString(16).padStart(2, '0');

  renderer.setGlow('#4cf', 0.5);
  text.drawText(`End ${currentEnd} Complete`, CX, H / 2 - 51, 18, `#44ccff${aHex}`, 'center');
  renderer.setGlow(null);

  if (scoringDisplay.playerScore > 0) {
    renderer.setGlow('#d33', 0.4);
    text.drawText(`You score ${scoringDisplay.playerScore}!`, CX, H / 2 - 11, 22, `#dd3333${aHex}`, 'center');
    renderer.setGlow(null);
  } else if (scoringDisplay.cpuScore > 0) {
    renderer.setGlow('#db2', 0.4);
    text.drawText(`CPU scores ${scoringDisplay.cpuScore}!`, CX, H / 2 - 11, 22, `#ddbb22${aHex}`, 'center');
    renderer.setGlow(null);
  } else {
    text.drawText('Blank end', CX, H / 2 - 8, 16, `#969696${aHex}`, 'center');
  }

  const a8hex = Math.round(a * 0.8 * 255).toString(16).padStart(2, '0');
  text.drawText(`Total: You ${score} - CPU ${cpuScore}`, CX, H / 2 + 19, 14, `#44ccff${a8hex}`, 'center');

  const a6hex = Math.round(a * 0.6 * 255).toString(16).padStart(2, '0');
  text.drawText(`Hammer: ${hammerTeam === 'player' ? 'You' : 'CPU'}`, CX, H / 2 + 39, 10, `#969696${a6hex}`, 'center');
}

// ---- Main export ----
export function createGame() {
  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Mouse state
  mouseDown = false;
  mouseX = CX;
  mouseY = H / 2;

  // Prevent context menu
  canvasEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (phase === 'aim') curlDir *= -1;
  });

  // Mouse events — queued for onUpdate processing
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    pendingMouseEvents.push({ type: 'move', x: mouseX, y: mouseY });
  });

  canvasEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    mouseDown = true;
    pendingMouseEvents.push({ type: 'down', button: e.button });
  });

  canvasEl.addEventListener('mouseup', (e) => {
    mouseDown = false;
    pendingMouseEvents.push({ type: 'up', button: e.button });
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    pendingMouseEvents.push({ type: 'click', x, y, button: e.button });
  });

  // ---- onInit ----
  game.onInit = () => {
    score = 0;
    cpuScore = 0;
    currentEnd = 1;
    endScores = [];
    hammerTeam = 'cpu';
    animFrame = 0;
    msg = '';
    msgTimer = 0;
    particles = [];
    pendingMouseEvents = [];
    mouseDown = false;
    aiSweepFramesLeft = 0;
    turnDelayTimer = 0;
    turnDelayFrames = 0;
    if (scoreEl) scoreEl.textContent = '0';
    if (bestEl) bestEl.textContent = '0';

    // Initialize end state without calling beginTurn yet
    stones = [];
    stonesThrown = 0;
    activeStone = null;
    phase = 'idle';
    sweeping = false;
    scoringDisplay = null;
    updateEndInfo();

    game.showOverlay('CURLING SIMULATOR', 'Click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // ---- onUpdate ----
  game.onUpdate = () => {
    // Handle waiting state
    if (game.state === 'waiting') {
      const hasClick = pendingMouseEvents.some(e => e.type === 'click');
      const hasKey = game.input.wasPressed(' ') || game.input.wasPressed('Enter') ||
        game.input.wasPressed('ArrowUp') || game.input.wasPressed('ArrowDown');
      if (hasClick || hasKey) {
        pendingMouseEvents = [];
        startEnd(game);
        game.setState('playing');
      }
      return;
    }

    // Handle game over state
    if (game.state === 'over') {
      const hasClick = pendingMouseEvents.some(e => e.type === 'click');
      const hasKey = game.input.wasPressed(' ') || game.input.wasPressed('Enter') ||
        game.input.wasPressed('ArrowUp') || game.input.wasPressed('ArrowDown');
      if (hasClick || hasKey) {
        pendingMouseEvents = [];
        game.onInit();
      }
      return;
    }

    // ---- Playing state ----
    animFrame++;
    if (msgTimer > 0) msgTimer--;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Scoring phase
    if (phase === 'scoring' && scoringDisplay) {
      scoringDisplay.timer--;
      if (scoringDisplay.timer <= 0) advanceEnd(game);
      pendingMouseEvents = [];
      return;
    }

    // Turn delay (frame-based, replaces setTimeout)
    if (turnDelayFrames > 0) {
      turnDelayTimer++;
      if (turnDelayTimer >= turnDelayFrames) {
        turnDelayFrames = 0;
        turnDelayTimer = 0;
        if (game.state === 'playing' && phase === 'idle') beginTurn(game);
      }
      pendingMouseEvents = [];
      return;
    }

    // AI think phase
    if (phase === 'aiThink') {
      aiThinkTimer--;
      if (aiThinkTimer <= 0) aiTurn();
      pendingMouseEvents = [];
      return;
    }

    // Power oscillation
    if (phase === 'power') {
      powerLevel += powerDir * 0.015;
      if (powerLevel >= 1) { powerLevel = 1; powerDir = -1; }
      if (powerLevel <= 0) { powerLevel = 0; powerDir = 1; }
    }

    // Sliding physics
    if (phase === 'sliding') {
      // Handle sweep via mousedown during sliding
      for (const evt of pendingMouseEvents) {
        if (evt.type === 'down' && activeStone && activeStone.team === 'player') {
          sweeping = true;
        }
        if (evt.type === 'up' && activeStone && activeStone.team === 'player') {
          sweeping = false;
        }
      }

      // AI sweep countdown
      if (aiSweepFramesLeft > 0 && sweeping) {
        aiSweepFramesLeft--;
        if (aiSweepFramesLeft <= 0 || !activeStone || activeStone.team !== 'cpu') {
          sweeping = false;
          aiSweepFramesLeft = 0;
        }
      }

      const moving = updatePhysics();
      if (!moving) {
        if (activeStone && activeStone.active && activeStone.y > HOG_FAR) {
          activeStone.active = false;
          spawnParticles(activeStone.x, activeStone.y, '#888', 5);
          showMsg('Hogged! Removed.', 90);
        }
        activeStone = null;
        sweeping = false;
        phase = 'idle';
        // Frame-based turn delay (~600ms at 60fps = 36 frames)
        turnDelayFrames = 36;
        turnDelayTimer = 0;
      }
      pendingMouseEvents = [];
      return;
    }

    // Process mouse events for aim/power phases
    for (const evt of pendingMouseEvents) {
      if (evt.type === 'move' && phase === 'aim' && isPlayerTurn()) {
        const dx = evt.x - CX;
        const dy = evt.y - HACK_Y;
        aimAngle = Math.atan2(dy, dx);
        if (aimAngle > -0.08) aimAngle = -0.08;
        if (aimAngle < -Math.PI + 0.08) aimAngle = -Math.PI + 0.08;
      }

      if (evt.type === 'click') {
        if (phase === 'aim' && isPlayerTurn()) {
          phase = 'power';
          powerLevel = 0;
          powerDir = 1;
          showMsg('Click to set power', 150);
        } else if (phase === 'power' && isPlayerTurn()) {
          launchStone('player', aimAngle, powerLevel, curlDir);
          showMsg('Hold mouse to sweep!', 120);
        }
      }
    }

    pendingMouseEvents = [];
  };

  // ---- onDraw ----
  game.onDraw = (renderer, text) => {
    drawSheet(renderer, text);
    drawStones(renderer);
    drawUI(renderer, text);
    if (scoringDisplay) drawScoringOverlay(renderer, text);
  };

  game.start();
  return game;
}
