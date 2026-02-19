// duck-hunt/game.js — Duck Hunt game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 500;

// Game constants
const GRASS_HEIGHT = 60;
const PLAY_AREA_TOP = 40;
const PLAY_AREA_BOTTOM = H - GRASS_HEIGHT;
const MAX_MISSES = 3;
const SHOTS_PER_DUCK = 3;
const HIT_RADIUS = 30;
const BANG_DURATION = 15;
const DUCK_FALL_ROTATE_SPEED = 0.15;

// Duck patterns
const PATTERNS = ['diagonal', 'wavy', 'swoop', 'zigzag'];

// Star positions (fixed)
const STAR_POSITIONS = [
  [45, 30], [120, 60], [200, 20], [280, 55], [350, 35],
  [420, 50], [470, 25], [80, 90], [310, 80], [450, 85]
];

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// --- Game State ---
let score = 0;
let best = 0;
let round, misses, shotsLeft, totalDucksThisRound;
let ducks, bangEffects, mouseX, mouseY;
let roundStartTimer, roundTransition;
let combo, comboTimer;
let grassTufts;
let pendingShots; // queued click positions

// --- Utility ---
function generateGrass() {
  grassTufts = [];
  for (let i = 0; i < 60; i++) {
    grassTufts.push({
      x: Math.random() * W,
      h: 10 + Math.random() * 25,
      w: 2 + Math.random() * 3,
      shade: Math.random() * 0.3
    });
  }
}

function createDuck(roundNum) {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  const baseSpeed = 1.5 + roundNum * 0.3;
  const speed = baseSpeed * (0.8 + Math.random() * 0.4);
  const size = Math.max(16, 28 - roundNum * 0.8);

  let x, vx;
  if (side === 'left') {
    x = -20;
    vx = speed;
  } else {
    x = W + 20;
    vx = -speed;
  }
  const y = PLAY_AREA_TOP + Math.random() * (PLAY_AREA_BOTTOM - PLAY_AREA_TOP - 60);
  const vy = (Math.random() - 0.5) * speed * 0.5;

  return {
    x, y, vx, vy, size,
    pattern,
    alive: true,
    falling: false,
    fallRotation: 0,
    fallVy: 0,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.15 + Math.random() * 0.1,
    escaped: false,
    time: 0,
    startY: y,
    amplitude: 20 + Math.random() * 30,
    frequency: 0.02 + Math.random() * 0.02,
    swoopPhase: Math.random() < 0.5 ? 0 : Math.PI
  };
}

function spawnRound() {
  const duckCount = Math.min(3, 1 + Math.floor((round - 1) / 3));
  totalDucksThisRound = duckCount;
  shotsLeft = duckCount * SHOTS_PER_DUCK;
  ducks = [];
  for (let i = 0; i < duckCount; i++) {
    const duck = createDuck(round);
    duck.x += duck.vx > 0 ? -i * 40 : i * 40;
    ducks.push(duck);
  }
  roundStartTimer = 60;
}

function shoot(x, y) {
  if (roundTransition > 0) return;
  if (roundStartTimer > 20) return;
  if (shotsLeft <= 0) return;

  shotsLeft--;

  let hitAny = false;

  for (const d of ducks) {
    if (!d.alive || d.falling || d.escaped) continue;

    const dx = x - d.x;
    const dy = y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDist = d.size + HIT_RADIUS * 0.5;

    if (dist < hitDist) {
      d.falling = true;
      d.fallVy = -3;

      combo++;
      comboTimer = 90;

      let points = 10 * round;
      if (combo > 1) points = Math.floor(points * (1 + combo * 0.5));

      score += points;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }

      bangEffects.push({ x: d.x, y: d.y, life: BANG_DURATION, hit: true, points });
      hitAny = true;
      break;
    }
  }

  if (!hitAny) {
    bangEffects.push({ x, y, life: BANG_DURATION, hit: false, points: 0 });
    combo = 0;
    comboTimer = 0;
  }
}

// --- Drawing helpers ---

function drawSky(renderer) {
  // Approximate gradient with horizontal bands
  const bands = [
    { y: 0, h: PLAY_AREA_BOTTOM * 0.4, color: '#0a0a1e' },
    { y: PLAY_AREA_BOTTOM * 0.4, h: PLAY_AREA_BOTTOM * 0.3, color: '#1a1a3e' },
    { y: PLAY_AREA_BOTTOM * 0.7, h: PLAY_AREA_BOTTOM * 0.3, color: '#2a3a5e' }
  ];
  for (const b of bands) {
    renderer.fillRect(0, b.y, W, b.h, b.color);
  }
}

function drawStars(renderer) {
  for (const [sx, sy] of STAR_POSITIONS) {
    renderer.fillRect(sx, sy, 2, 2, 'rgba(255, 255, 255, 0.3)');
  }
}

function drawGrass(renderer) {
  // Base
  renderer.fillRect(0, PLAY_AREA_BOTTOM, W, GRASS_HEIGHT, '#164016');

  // Tufts
  for (const tuft of grassTufts) {
    const green = Math.floor(100 + tuft.shade * 80);
    const r = Math.floor(green * 0.3);
    const g = green;
    const b = Math.floor(green * 0.2);
    renderer.fillRect(tuft.x, PLAY_AREA_BOTTOM - tuft.h, tuft.w, tuft.h, `rgb(${r},${g},${b})`);
  }

  // Bush shapes (approximate ellipses as filled polygons)
  drawBush(renderer, 60, PLAY_AREA_BOTTOM, 40, 20);
  drawBush(renderer, 180, PLAY_AREA_BOTTOM, 50, 25);
  drawBush(renderer, 320, PLAY_AREA_BOTTOM, 35, 18);
  drawBush(renderer, 440, PLAY_AREA_BOTTOM, 45, 22);
}

function drawBush(renderer, cx, baseY, radiusX, radiusY) {
  // Approximate upper half of ellipse with polygon
  const pts = [];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI + (Math.PI * i / segments); // PI to 2*PI (upper half, flipped)
    pts.push({
      x: cx + Math.cos(angle) * radiusX,
      y: baseY + Math.sin(angle) * radiusY
    });
  }
  renderer.fillPoly(pts, '#1a5a1a');
}

function drawDuck(renderer, text, d) {
  const s = d.size;
  const facingRight = d.vx > 0;
  const wingAngle = Math.sin(d.wingPhase) * 0.6;

  // When falling, rotate all positions around duck center
  const rot = d.falling ? d.fallRotation : 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  // Helper to rotate a point (localX, localY) around duck center (d.x, d.y)
  function tx(lx, ly) {
    return d.x + lx * cosR - ly * sinR;
  }
  function ty(lx, ly) {
    return d.y + lx * sinR + ly * cosR;
  }

  // Wing (behind body)
  const wingX = facingRight ? -s * 0.2 : s * 0.2;
  const wingLocalY = -s * 0.2;
  // Wing flap offset
  const wingFlapY = -s * 0.3 * Math.cos(wingAngle);
  const wingFlapX = -s * 0.3 * Math.sin(wingAngle) * (facingRight ? -0.3 : 0.3);
  const wcx = wingX + wingFlapX;
  const wcy = wingLocalY + wingFlapY;
  const wrx = s * 0.5;
  const wry = s * 0.25;
  // Approximate wing ellipse
  const wingPts = [];
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    const lx = wcx + Math.cos(a) * wrx;
    const ly = wcy + Math.sin(a) * wry;
    wingPts.push({ x: tx(lx, ly), y: ty(lx, ly) });
  }
  renderer.fillPoly(wingPts, '#a63');

  // Body (ellipse approximated as polygon)
  const bodyPts = [];
  for (let i = 0; i <= 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    const lx = Math.cos(a) * s;
    const ly = Math.sin(a) * s * 0.6;
    bodyPts.push({ x: tx(lx, ly), y: ty(lx, ly) });
  }
  renderer.setGlow('#f66', 0.5);
  renderer.fillPoly(bodyPts, '#c84');
  renderer.setGlow(null);

  // Head
  const headLX = facingRight ? s * 0.7 : -s * 0.7;
  const headLY = -s * 0.3;
  const headR = s * 0.4;
  renderer.fillCircle(tx(headLX, headLY), ty(headLX, headLY), headR, '#2a6a2a');

  // Eye
  const eyeLX = facingRight ? headLX + s * 0.15 : headLX - s * 0.15;
  const eyeLY = -s * 0.35;
  renderer.fillCircle(tx(eyeLX, eyeLY), ty(eyeLX, eyeLY), s * 0.1, '#fff');
  renderer.fillCircle(tx(eyeLX, eyeLY), ty(eyeLX, eyeLY), s * 0.05, '#000');

  // X eyes if falling
  if (d.falling) {
    const xSize = s * 0.12;
    const ex = eyeLX;
    const ey = eyeLY;
    renderer.drawLine(
      tx(ex - xSize, ey - xSize), ty(ex - xSize, ey - xSize),
      tx(ex + xSize, ey + xSize), ty(ex + xSize, ey + xSize),
      '#f00', 2
    );
    renderer.drawLine(
      tx(ex + xSize, ey - xSize), ty(ex + xSize, ey - xSize),
      tx(ex - xSize, ey + xSize), ty(ex - xSize, ey + xSize),
      '#f00', 2
    );
  }

  // Beak (triangle)
  const beakDir = facingRight ? 1 : -1;
  const b1x = headLX + beakDir * s * 0.2;
  const b1y = -s * 0.25;
  const b2x = headLX + beakDir * (s * 0.35 + s * 0.15);
  const b2y = -s * 0.2;
  const b3x = headLX + beakDir * s * 0.2;
  const b3y = -s * 0.15;
  renderer.fillPoly([
    { x: tx(b1x, b1y), y: ty(b1x, b1y) },
    { x: tx(b2x, b2y), y: ty(b2x, b2y) },
    { x: tx(b3x, b3y), y: ty(b3x, b3y) }
  ], '#f80');

  // Tail (triangle)
  const tailBaseX = facingRight ? -s * 0.8 : s * 0.8;
  const tailDir = facingRight ? -1 : 1;
  const t1x = tailBaseX;
  const t1y = 0;
  const t2x = tailBaseX + tailDir * s * 0.3;
  const t2y = -s * 0.2;
  const t3x = tailBaseX + tailDir * s * 0.2;
  const t3y = s * 0.1;
  renderer.fillPoly([
    { x: tx(t1x, t1y), y: ty(t1x, t1y) },
    { x: tx(t2x, t2y), y: ty(t2x, t2y) },
    { x: tx(t3x, t3y), y: ty(t3x, t3y) }
  ], '#a63');
}

function drawCrosshair(renderer) {
  const size = 15;
  renderer.setGlow('#f66', 0.4);

  // Outer circle (approximate with line segments)
  const circPts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (Math.PI * 2 * i) / 24;
    circPts.push({ x: mouseX + Math.cos(a) * size, y: mouseY + Math.sin(a) * size });
  }
  renderer.strokePoly(circPts, '#f66', 2, true);

  // Cross lines (with gap in center)
  renderer.drawLine(mouseX - size - 5, mouseY, mouseX - size * 0.4, mouseY, '#f66', 2);
  renderer.drawLine(mouseX + size * 0.4, mouseY, mouseX + size + 5, mouseY, '#f66', 2);
  renderer.drawLine(mouseX, mouseY - size - 5, mouseX, mouseY - size * 0.4, '#f66', 2);
  renderer.drawLine(mouseX, mouseY + size * 0.4, mouseX, mouseY + size + 5, '#f66', 2);

  // Center dot
  renderer.fillCircle(mouseX, mouseY, 2, '#f66');

  renderer.setGlow(null);
}

function drawBangEffects(renderer, text) {
  for (const b of bangEffects) {
    const alpha = b.life / BANG_DURATION;
    if (b.hit) {
      const yOff = (BANG_DURATION - b.life) * 1.5;
      const r = 255, g = 102, bv = 102;
      const color = `rgba(${r},${g},${bv},${alpha})`;
      renderer.setGlow('#f66', alpha * 0.5);
      text.drawText(`+${b.points}`, b.x, b.y - yOff - 8, 16, color, 'center');
      renderer.setGlow(null);
    } else {
      const yOff = BANG_DURATION - b.life;
      const color = `rgba(255,255,200,${alpha})`;
      renderer.setGlow('#ff0', alpha * 0.6);
      text.drawText('BANG!', b.x, b.y - yOff - 10, 20, color, 'center');
      renderer.setGlow(null);
    }
  }
}

function drawHUD(renderer, text, gameState) {
  // Round number
  renderer.setGlow('#f66', 0.3);
  text.drawText(`ROUND ${round}`, 10, 6, 14, '#f66', 'left');
  renderer.setGlow(null);

  // Shots remaining
  const shotText = 'SHOTS: ' + '\u2022'.repeat(shotsLeft);
  text.drawText(shotText, W - 10, 6, 14, '#f66', 'right');

  // Misses
  let missDisplay = '';
  for (let i = 0; i < MAX_MISSES; i++) {
    missDisplay += i < misses ? '\u2717 ' : '\u25CB ';
  }
  text.drawText(missDisplay.trim(), W / 2, 6, 14, '#888', 'center');

  // Combo display
  if (combo > 1 && comboTimer > 0) {
    renderer.setGlow('#ff0', 0.6);
    text.drawText(`${combo}x COMBO!`, W / 2, 24, 16, '#ff0', 'center');
    renderer.setGlow(null);
  }

  // Round start announcement
  if (roundStartTimer > 0) {
    const alpha = Math.min(1, roundStartTimer / 30);
    const color = `rgba(255,102,102,${alpha})`;
    renderer.setGlow('#f66', alpha * 0.7);
    text.drawText(`ROUND ${round}`, W / 2, H / 2 - 60, 28, color, 'center');
    const duckText = totalDucksThisRound === 1 ? '1 DUCK' : `${totalDucksThisRound} DUCKS`;
    text.drawText(duckText, W / 2, H / 2 - 28, 18, color, 'center');
    renderer.setGlow(null);
  }

  // Round transition
  if (roundTransition > 0 && gameState === 'playing') {
    const alpha = Math.min(1, roundTransition / 20);
    const color = `rgba(170,170,170,${alpha})`;
    text.drawText('Next round...', W / 2, H / 2 - 10, 16, color, 'center');
  }
}


// === Export ===

export function createGame() {
  const game = new Game('game');
  const canvas = document.getElementById('game');

  // Mouse tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // Click to shoot (queue shots for processing in onUpdate)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX = x;
    mouseY = y;

    if (game.state === 'waiting') {
      game.setState('playing');
      round = 1;
      spawnRound();
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    if (game.state === 'playing') {
      pendingShots.push({ x, y });
    }
  });

  // Prevent context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    round = 0;
    misses = 0;
    combo = 0;
    comboTimer = 0;
    ducks = [];
    bangEffects = [];
    mouseX = W / 2;
    mouseY = H / 2;
    roundStartTimer = 0;
    roundTransition = 0;
    pendingShots = [];
    generateGrass();
    canvas.style.cursor = 'default';
    game.showOverlay('DUCK HUNT', 'Click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from keyboard
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
        round = 1;
        spawnRound();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // --- Playing state ---

    // Hide cursor while playing
    canvas.style.cursor = 'none';

    // Process queued shots
    for (const s of pendingShots) {
      shoot(s.x, s.y);
    }
    pendingShots = [];

    // Round start countdown
    if (roundStartTimer > 0) {
      roundStartTimer--;
    }

    // Round transition
    if (roundTransition > 0) {
      roundTransition--;
      if (roundTransition === 0) {
        round++;
        spawnRound();
      }
      return;
    }

    // Combo timer decay
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) combo = 0;
    }

    // Update bang effects
    for (let i = bangEffects.length - 1; i >= 0; i--) {
      bangEffects[i].life--;
      if (bangEffects[i].life <= 0) {
        bangEffects.splice(i, 1);
      }
    }

    // Update ducks
    let allDone = true;
    for (let i = 0; i < ducks.length; i++) {
      const d = ducks[i];

      if (d.falling) {
        d.fallVy += 0.2;
        d.y += d.fallVy;
        d.fallRotation += DUCK_FALL_ROTATE_SPEED * (d.vx > 0 ? 1 : -1);
        if (d.y > H + 40) {
          d.escaped = true;
        }
        if (!d.escaped) allDone = false;
        continue;
      }

      if (d.escaped) continue;

      d.time++;
      d.wingPhase += d.wingSpeed;

      switch (d.pattern) {
        case 'diagonal':
          d.x += d.vx;
          d.y += d.vy;
          if (d.y < PLAY_AREA_TOP || d.y > PLAY_AREA_BOTTOM - 30) {
            d.vy = -d.vy;
          }
          break;

        case 'wavy':
          d.x += d.vx;
          d.y = d.startY + Math.sin(d.time * d.frequency) * d.amplitude;
          break;

        case 'swoop':
          d.x += d.vx;
          d.y = d.startY + Math.sin(d.time * 0.03 + d.swoopPhase) * d.amplitude * 1.5;
          d.y = Math.max(PLAY_AREA_TOP, Math.min(PLAY_AREA_BOTTOM - 30, d.y));
          break;

        case 'zigzag': {
          d.x += d.vx;
          const period = 80;
          const phase = d.time % period;
          if (phase < period / 2) {
            d.y += Math.abs(d.vx) * 0.6;
          } else {
            d.y -= Math.abs(d.vx) * 0.6;
          }
          d.y = Math.max(PLAY_AREA_TOP, Math.min(PLAY_AREA_BOTTOM - 30, d.y));
          break;
        }
      }

      // Check if duck escaped off screen
      if (d.x < -50 || d.x > W + 50) {
        d.escaped = true;
        d.alive = false;
      }

      if (!d.escaped && !d.falling) allDone = false;
    }

    // Check if round is over
    if (allDone && roundTransition === 0) {
      let roundMisses = 0;
      for (const d of ducks) {
        if (d.alive && d.escaped) {
          roundMisses++;
        }
      }
      misses += roundMisses;

      if (misses >= MAX_MISSES) {
        canvas.style.cursor = 'default';
        game.showOverlay('GAME OVER', `Score: ${score} | Round: ${round} -- Click to restart`);
        game.setState('over');
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
        return;
      }

      roundTransition = 45;
    }

    // Update gameData for ML
    window.gameData = {
      mouseX, mouseY,
      round, misses, shotsLeft, combo,
      ducks: ducks.filter(d => d.alive && !d.escaped && !d.falling).map(d => ({ x: d.x, y: d.y, size: d.size }))
    };
  };

  game.onDraw = (renderer, text) => {
    // Sky
    drawSky(renderer);
    drawStars(renderer);

    // Ducks
    for (const d of ducks) {
      if (!d.escaped || d.falling) {
        drawDuck(renderer, text, d);
      }
    }

    // Grass (on top of ducks)
    drawGrass(renderer);

    // Bang effects
    drawBangEffects(renderer, text);

    // HUD
    drawHUD(renderer, text, game.state);

    // Crosshair (always on top)
    if (game.state === 'playing') {
      drawCrosshair(renderer);
    }
  };

  game.start();
  return game;
}
