// speed-typing-racer/game.js — Speed Typing Racer as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 400;

// Track layout constants
const TRACK_Y = 30;
const TRACK_H = 120;
const LANE_H = 28;
const TRACK_LEFT = 60;
const TRACK_RIGHT = W - 20;
const TRACK_W = TRACK_RIGHT - TRACK_LEFT;

const RACER_COLORS = ['#4488ff', '#ff4444', '#44ff44', '#ffaa00'];
const RACER_NAMES = ['YOU', 'CPU-1', 'CPU-2', 'CPU-3'];
const AI_WPMS = [35, 55, 72];
const AI_VARIANCE = 0.15;
const AI_ERROR_RATE = [0.04, 0.03, 0.02];

const passages = [
  "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets behind the distant mountains painting the sky in brilliant shades of orange and gold.",
  "All that glitters is not gold, and not all those who wander are lost. The old that is strong does not wither, and deep roots are not reached by the frost.",
  "To be or not to be, that is the question. Whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles.",
  "In the beginning there was nothing, then there was everything. The big bang scattered matter across the void, and slowly stars ignited and galaxies spun into existence.",
  "She sells seashells by the seashore. The shells she sells are seashells for sure. So if she sells shells on the seashore then the shells are seashore shells.",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood? A woodchuck would chuck as much wood as a woodchuck could chuck if a woodchuck could chuck wood.",
  "Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where is the peck?",
  "The rain in Spain falls mainly on the plain, but the plains of Spain are not the only place where rain may fall when dark clouds fill the autumn sky.",
  "Space, the final frontier. These are the voyages of the starship Enterprise. Its continuing mission to explore strange new worlds, to seek out new life and new civilizations.",
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief and incredulity.",
  "A journey of a thousand miles begins with a single step. Keep your face always toward the sunshine and shadows will fall behind you as you walk forward.",
  "The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle. As with all matters of the heart, you will know.",
];

// --- State ---
let score = 0;
let best = parseInt(localStorage.getItem('speedTypingRacer_best')) || 0;

let passage = '';
let playerPos = 0;
let playerErrors = 0;
let playerKeystrokes = 0;
let currentCharWrong = false;
let currentWPM = 0;
let accuracy = 100;

// gameTime in ms, accumulated from fixed ticks
let gameTime = 0;
let raceStartTime = 0; // gameTime when race started
let countdownStartTime = 0;
let countdown = 0;

let aiRacers = [];
let racerDisplayX = [TRACK_LEFT, TRACK_LEFT, TRACK_LEFT, TRACK_LEFT];
let particles = [];

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function initRace() {
  passage = passages[Math.floor(Math.random() * passages.length)];
  playerPos = 0;
  playerErrors = 0;
  playerKeystrokes = 0;
  currentCharWrong = false;
  currentWPM = 0;
  accuracy = 100;
  particles = [];

  aiRacers = [];
  for (let i = 0; i < 3; i++) {
    const baseWPM = AI_WPMS[i];
    const cpm = baseWPM * 5 / 60000; // chars per ms
    aiRacers.push({
      pos: 0,
      fractionalPos: 0,
      wpm: baseWPM,
      cpm,
      nextCharTime: 0,
      errorRate: AI_ERROR_RATE[i],
      inError: false,
      errorCooldown: 0,
      finished: false,
      finishWPM: 0,
    });
  }

  racerDisplayX = [TRACK_LEFT, TRACK_LEFT, TRACK_LEFT, TRACK_LEFT];
}

function getAIDelay(ai) {
  const baseDelay = 1 / ai.cpm;
  const variance = 1 + (Math.random() * 2 - 1) * AI_VARIANCE;
  return baseDelay * variance;
}

function updateAI(now) {
  for (const ai of aiRacers) {
    if (ai.finished || ai.pos >= passage.length) {
      if (!ai.finished) {
        ai.finished = true;
        ai.pos = passage.length;
        const elapsed = (now - raceStartTime) / 60000;
        ai.finishWPM = elapsed > 0 ? Math.round((passage.length / 5) / elapsed) : 0;
      }
      continue;
    }

    if (now >= ai.nextCharTime) {
      if (!ai.inError && Math.random() < ai.errorRate) {
        ai.inError = true;
        ai.errorCooldown = 2;
        ai.nextCharTime = now + getAIDelay(ai) * 1.5;
      } else if (ai.inError) {
        ai.errorCooldown--;
        if (ai.errorCooldown <= 0) ai.inError = false;
        ai.nextCharTime = now + getAIDelay(ai);
      } else {
        ai.pos++;
        ai.nextCharTime = now + getAIDelay(ai);
      }
    }

    // Smooth fractional advancement
    if (!ai.inError && ai.pos < passage.length) {
      const timeSinceLastChar = now - (ai.nextCharTime - getAIDelay(ai));
      const progress = Math.min(timeSinceLastChar * ai.cpm, 0.9);
      ai.fractionalPos = ai.pos + Math.max(0, progress);
    }
  }
}

function getProgress(pos) {
  return passage.length > 0 ? pos / passage.length : 0;
}

function getTrackX(progress) {
  return TRACK_LEFT + progress * TRACK_W;
}

// --- Particles ---
function addParticle(x, y, color) {
  particles.push({
    x, y,
    vx: -Math.random() * 1.5 - 0.5,
    vy: (Math.random() - 0.5) * 0.8,
    life: 1,
    color,
    size: Math.random() * 3 + 1,
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (particles.length > 200) particles.splice(0, particles.length - 200);
}

// Convert a hex color like '#48f' or '#4488ff' + alpha (0-1) to 8-char hex
function colorWithAlpha(color, alpha) {
  let r, g, b;
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    r = parseInt(hex[0], 16) * 17;
    g = parseInt(hex[1], 16) * 17;
    b = parseInt(hex[2], 16) * 17;
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return '#' + [r, g, b, a].map(v => v.toString(16).padStart(2, '0')).join('');
}

// --- Draw helpers ---

function drawTrack(renderer, text) {
  // Road background
  renderer.fillRect(TRACK_LEFT - 10, TRACK_Y, TRACK_W + 30, TRACK_H, '#111125');

  // Lane lines
  for (let i = 0; i <= 4; i++) {
    const y = TRACK_Y + i * LANE_H;
    if (i === 0 || i === 4) {
      renderer.drawLine(TRACK_LEFT - 10, y, TRACK_RIGHT + 20, y, '#4488ff', 2);
    } else {
      renderer.dashedLine(TRACK_LEFT - 10, y, TRACK_RIGHT + 20, y, '#333355', 1.5, 8, 8);
    }
  }

  // Distance markers
  for (let pct = 0; pct <= 100; pct += 25) {
    const x = TRACK_LEFT + (pct / 100) * TRACK_W;
    text.drawText(pct + '%', x, TRACK_Y - 14, 8, '#333355', 'center');
    renderer.drawLine(x, TRACK_Y, x, TRACK_Y + TRACK_H, '#222240', 1);
  }

  // Checkered finish line
  const finX = TRACK_RIGHT;
  const checkSize = 4;
  for (let row = 0; row < Math.floor(TRACK_H / checkSize); row++) {
    for (let col = 0; col < 2; col++) {
      const color = (row + col) % 2 === 0 ? '#eeeeee' : '#222222';
      renderer.fillRect(finX + col * checkSize, TRACK_Y + row * checkSize, checkSize, checkSize, color);
    }
  }

  // Lane labels
  for (let i = 0; i < 4; i++) {
    const labelY = TRACK_Y + i * LANE_H + LANE_H / 2 - 5;
    text.drawText(RACER_NAMES[i], TRACK_LEFT - 14, labelY, 10, RACER_COLORS[i], 'right');
  }
}

function drawCar(renderer, x, y, color, isPlayer, state) {
  const carW = 24;
  const carH = 14;

  // Car body as polygon
  renderer.setGlow(color, isPlayer ? 0.8 : 0.5);
  renderer.fillPoly([
    { x: x - carW / 2,         y: y - carH / 2 + 2 },
    { x: x - carW / 2 + 4,    y: y - carH / 2 },
    { x: x + carW / 2 - 2,    y: y - carH / 2 },
    { x: x + carW / 2,        y: y - carH / 2 + 2 },
    { x: x + carW / 2,        y: y + carH / 2 - 2 },
    { x: x + carW / 2 - 2,    y: y + carH / 2 },
    { x: x - carW / 2 + 4,    y: y + carH / 2 },
    { x: x - carW / 2,        y: y + carH / 2 - 2 },
  ], color);

  // Windshield
  renderer.fillRect(x + 2, y - 4, 6, 8, '#1a1a2e');

  // Headlights
  renderer.setGlow('#ffffff', 0.8);
  renderer.fillRect(x + carW / 2 - 1, y - 4, 2, 3, '#ffffff');
  renderer.fillRect(x + carW / 2 - 1, y + 1, 2, 3, '#ffffff');
  renderer.setGlow(null);

  // Trail particles
  if (state === 'playing') {
    addParticle(x - carW / 2, y, color);
  }
}

function drawParticles(renderer) {
  for (const p of particles) {
    const c = colorWithAlpha(p.color, p.life * 0.7);
    renderer.setGlow(p.color, 0.3);
    renderer.fillCircle(p.x, p.y, p.size * p.life, c);
  }
  renderer.setGlow(null);
}

function drawTextPanel(renderer, text, state, now) {
  const textAreaY = TRACK_Y + TRACK_H + 20;
  const textAreaH = H - textAreaY - 10;
  const panelX = 15;
  const panelW = W - 30;

  // Background panel
  renderer.fillRect(panelX, textAreaY, panelW, textAreaH, '#0d0d1e');
  renderer.drawLine(panelX, textAreaY, panelX + panelW, textAreaY, '#4488ff', 1);
  renderer.drawLine(panelX + panelW, textAreaY, panelX + panelW, textAreaY + textAreaH, '#4488ff', 1);
  renderer.drawLine(panelX, textAreaY + textAreaH, panelX + panelW, textAreaY + textAreaH, '#4488ff', 1);
  renderer.drawLine(panelX, textAreaY, panelX, textAreaY + textAreaH, '#4488ff', 1);

  // Stats bar
  const statsY = textAreaY + 6;
  renderer.setGlow('#4488ff', 0.5);
  text.drawText('WPM: ' + currentWPM, panelX + 10, statsY, 11, '#4488ff', 'left');
  renderer.setGlow(null);
  text.drawText('Accuracy: ' + accuracy + '%', panelX + 100, statsY, 11, '#aaaaaa', 'left');
  text.drawText('Progress: ' + Math.round(getProgress(playerPos) * 100) + '%', panelX + 240, statsY, 11, '#aaaaaa', 'left');

  // Player position in race
  let position = 1;
  for (const ai of aiRacers) {
    if (ai.pos > playerPos) position++;
  }
  const ordinal = ['1st', '2nd', '3rd', '4th'][position - 1];
  const placeColor = position === 1 ? '#44ff44' : '#ffaa00';
  text.drawText(ordinal + ' Place', panelX + panelW - 10, statsY, 11, placeColor, 'right');

  // Passage text
  const charSize = 12;
  // Approximate monospace char width: charSize * 0.6
  const charW = Math.round(charSize * 0.6);
  const lineH = 18;
  const textX = panelX + 12;
  const textStartY = statsY + 22;
  const maxCharsPerLine = Math.floor((panelW - 24) / charW);
  const maxLines = Math.floor((textAreaH - 46) / lineH);

  const playerLine = Math.floor(playerPos / maxCharsPerLine);
  const startLine = Math.max(0, playerLine - 1);

  for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
    const actualLine = startLine + lineIdx;
    const lineStart = actualLine * maxCharsPerLine;
    if (lineStart >= passage.length) break;
    const lineEnd = Math.min(lineStart + maxCharsPerLine, passage.length);

    for (let ci = lineStart; ci < lineEnd; ci++) {
      const col = ci - lineStart;
      const cx = textX + col * charW;
      const cy = textStartY + lineIdx * lineH;

      if (ci < playerPos) {
        // Correctly typed
        text.drawText(passage[ci], cx, cy, charSize, '#33aa66', 'left');
      } else if (ci === playerPos) {
        if (currentCharWrong) {
          // Error highlight
          renderer.fillRect(cx - 1, cy - 12, charW + 1, lineH, '#ff333344');
          text.drawText(passage[ci], cx, cy, charSize, '#ff4444', 'left');
        } else {
          // Cursor highlight
          renderer.fillRect(cx - 1, cy - 12, charW + 1, lineH, '#4488ff33');
          // Blinking underline based on gameTime
          const blink = Math.sin(now / 200) > -0.3;
          if (blink) {
            renderer.fillRect(cx, cy + 2, charW - 1, 2, '#4488ff');
          }
          text.drawText(passage[ci], cx, cy, charSize, '#ffffff', 'left');
        }
      } else {
        // Not yet typed
        text.drawText(passage[ci], cx, cy, charSize, '#666677', 'left');
      }
    }
  }

  // Scroll indicator
  if (startLine > 0) {
    text.drawText('...', panelX + panelW - 10, textStartY - 4, 10, '#4488ff', 'right');
  }
}

function drawCountdown(renderer, text, now) {
  const elapsed = (now - countdownStartTime) / 1000;
  const num = 3 - Math.floor(elapsed);
  if (num <= 0) return;

  const frac = elapsed - Math.floor(elapsed);
  const scale = 1 + (1 - frac) * 0.5;
  const alpha = 1 - frac * 0.3;
  const fontSize = Math.round(60 * scale);

  renderer.setGlow('#4488ff', 0.8);
  text.drawText(String(num), W / 2, H / 2 - fontSize / 2, fontSize, colorWithAlpha('#4488ff', alpha), 'center');
  renderer.setGlow(null);
}

function drawFinishStats(renderer, text, now) {
  // Dim overlay
  renderer.fillRect(0, 0, W, H, '#1a1a2eeb');

  // Title
  renderer.setGlow('#4488ff', 0.8);
  text.drawText('RACE COMPLETE!', W / 2, H / 2 - 104, 28, '#4488ff', 'center');
  renderer.setGlow(null);

  // Build results
  let results = [{ name: 'YOU', wpm: currentWPM, color: RACER_COLORS[0], isPlayer: true }];
  for (let i = 0; i < aiRacers.length; i++) {
    const ai = aiRacers[i];
    const elapsed = (now - raceStartTime) / 60000;
    const wpm = ai.finished ? ai.finishWPM : (elapsed > 0 ? Math.round((ai.pos / 5) / elapsed) : 0);
    results.push({ name: RACER_NAMES[i + 1], wpm, color: RACER_COLORS[i + 1], isPlayer: false });
  }
  results.sort((a, b) => b.wpm - a.wpm);

  const rowX = W / 2 - 130;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const y = H / 2 - 54 + i * 30;
    const place = ['1st', '2nd', '3rd', '4th'][i];
    const nameColor = r.isPlayer ? '#ffffff' : '#aaaaaa';
    const fontSize = r.isPlayer ? 16 : 14;

    text.drawText(place, rowX, y, fontSize, r.color, 'left');
    text.drawText(r.name, rowX + 50, y, fontSize, nameColor, 'left');
    text.drawText(r.wpm + ' WPM', rowX + 160, y, fontSize, nameColor, 'left');
    if (r.isPlayer) {
      text.drawText('(' + accuracy + '% acc)', rowX + 230, y, 12, '#666677', 'left');
    }
  }

  // Blinking prompt
  const blink = Math.sin(now / 400) > 0;
  if (blink) {
    text.drawText('Press any key to race again', W / 2, H / 2 + 86, 13, '#666677', 'center');
  }
}

export function createGame() {
  const game = new Game('game');

  bestEl.textContent = best;

  game.onInit = () => {
    gameTime = 0;
    initRace();
    game.showOverlay('SPEED TYPING RACER', 'Press any key to start racing!\nType the text as fast as you can.');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // --- Input: typing handled via direct keydown listener ---
  // The engine's input system handles arrow keys / space for state transitions.
  // We need raw keydown for character typing.
  game.canvas.addEventListener('keydown', (e) => {
    // Typing input only in playing state
    if (game.state !== 'playing') return;
    if (e.key.length !== 1) return;
    e.preventDefault();

    playerKeystrokes++;
    const expected = passage[playerPos];

    if (e.key === expected) {
      currentCharWrong = false;
      playerPos++;

      const elapsed = (gameTime - raceStartTime) / 60000;
      if (elapsed > 0) currentWPM = Math.round((playerPos / 5) / elapsed);
      accuracy = Math.round((playerPos / playerKeystrokes) * 100);
      score = currentWPM;
      scoreEl.textContent = score;

      if (playerPos >= passage.length) {
        endRace();
      }
    } else {
      currentCharWrong = true;
      playerErrors++;
      accuracy = Math.round((playerPos / playerKeystrokes) * 100);
    }
  });

  // Canvas click to start/restart
  game.canvas.addEventListener('click', () => {
    if (game.state === 'waiting') {
      beginCountdown();
    } else if (game.state === 'over') {
      returnToWaiting();
    }
  });

  function beginCountdown() {
    initRace();
    countdownStartTime = gameTime;
    countdown = 3;
    game.hideOverlay();
    game.setState('countdown');
  }

  function startRace() {
    raceStartTime = gameTime;
    for (const ai of aiRacers) {
      ai.nextCharTime = raceStartTime + getAIDelay(ai);
    }
    game.setState('playing');
  }

  function endRace() {
    const elapsed = (gameTime - raceStartTime) / 60000;
    currentWPM = elapsed > 0 ? Math.round((passage.length / 5) / elapsed) : 0;
    score = currentWPM;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('speedTypingRacer_best', best);
    }
    game.setState('over');
  }

  function returnToWaiting() {
    game.showOverlay('SPEED TYPING RACER', 'Press any key to start racing!\nType the text as fast as you can.');
    game.setState('waiting');
  }

  game.onUpdate = (dt) => {
    gameTime += dt;
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        beginCountdown();
      }
      // Also start on any letter key (like the original)
      for (const key of input._pressed) {
        if (key.length === 1) { beginCountdown(); break; }
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('Enter')) {
        returnToWaiting();
      }
      return;
    }

    if (game.state === 'countdown') {
      const elapsed = (gameTime - countdownStartTime) / 1000;
      if (elapsed >= 3) {
        startRace();
      }
      return;
    }

    if (game.state === 'playing') {
      updateAI(gameTime);
      updateParticles();
    }
  };

  game.onDraw = (renderer, text) => {
    const now = gameTime;
    const state = game.state;

    // Draw track always
    drawTrack(renderer, text);

    // Update smooth display positions
    const targetX = [
      getTrackX(getProgress(playerPos)),
      ...aiRacers.map(ai => getTrackX(getProgress(ai.fractionalPos || ai.pos))),
    ];
    for (let i = 0; i < 4; i++) {
      racerDisplayX[i] += (targetX[i] - racerDisplayX[i]) * 0.15;
    }

    // Draw particles
    drawParticles(renderer);

    // Draw cars (back to front)
    for (let i = 3; i >= 0; i--) {
      const laneY = TRACK_Y + i * LANE_H + LANE_H / 2;
      drawCar(renderer, racerDisplayX[i], laneY, RACER_COLORS[i], i === 0, state);
    }

    if (state === 'countdown') {
      drawTextPanel(renderer, text, state, now);
      drawCountdown(renderer, text, now);
    } else if (state === 'playing') {
      drawTextPanel(renderer, text, state, now);
    } else if (state === 'over') {
      drawFinishStats(renderer, text, now);
    }
  };

  game.start();
  return game;
}
