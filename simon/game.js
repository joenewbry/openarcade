// simon/game.js — Simon game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 450;

// Panel colors: bright (active) and dim (inactive)
const panels = [
  { bright: '#44ff44', dim: '#164016', glow: '#44ff44', key: ['1', 'ArrowUp'] },    // 0 = top-left = Green
  { bright: '#ff4444', dim: '#401616', glow: '#ff4444', key: ['2', 'ArrowRight'] },  // 1 = top-right = Red
  { bright: '#ffff44', dim: '#404016', glow: '#ffff44', key: ['3', 'ArrowLeft'] },   // 2 = bottom-left = Yellow
  { bright: '#4444ff', dim: '#161640', glow: '#4444ff', key: ['4', 'ArrowDown'] },   // 3 = bottom-right = Blue
];

// Panel geometry -- 2x2 grid with gap
const PAD = 30;
const GAP = 16;
const PANEL_W = (W - PAD * 2 - GAP) / 2;
const PANEL_H = (350 - GAP) / 2;
const PANEL_Y_START = 10;
const CORNER_R = 16;
const CORNER_SEGMENTS = 6; // segments per rounded corner

// Tone frequencies: E4, C4, A3, E3
const toneFreqs = [329.63, 261.63, 220.00, 164.81];

// Timing constants
const INPUT_FLASH_MS = 200;

// ── State ──
let score, best = 0;
let sequence = [];
let playerIndex = 0;
let showIndex = 0;
let phase = 'idle'; // idle, pre-show, showing, input, flash-correct, flash-wrong
let activePanel = -1;
let flashTimer = 0;
let showTimer = 0;
let showDelay = 0;
let roundDisplay = 0;
let inputFlashTime = 0;
let frame = 0;

// Audio
let audioCtx = null;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Helpers ──

function panelRect(i) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {
    x: PAD + col * (PANEL_W + GAP),
    y: PANEL_Y_START + row * (PANEL_H + GAP),
    w: PANEL_W,
    h: PANEL_H,
  };
}

function roundedRectPoints(x, y, w, h, r) {
  const pts = [];
  const segs = CORNER_SEGMENTS;
  // Top-right corner
  for (let i = 0; i <= segs; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / segs);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  // Bottom-right corner
  for (let i = 0; i <= segs; i++) {
    const a = 0 + (Math.PI / 2) * (i / segs);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  // Bottom-left corner
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / segs);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  // Top-left corner
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / segs);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  return pts;
}

function getShowInterval() {
  const base = 600;
  const min = 250;
  const ramp = Math.min(sequence.length / 20, 1);
  return base - ramp * (base - min);
}

function getShowPause() {
  const base = 150;
  const min = 80;
  const ramp = Math.min(sequence.length / 20, 1);
  return base - ramp * (base - min);
}

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* silent */ }
  }
}

function playTone(panelIdx, duration) {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = toneFreqs[panelIdx];
  gain.gain.value = 0.15;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration || 0.3));
  osc.stop(audioCtx.currentTime + (duration || 0.3));
}

function playBuzz() {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sawtooth';
  osc.frequency.value = 80;
  gain.gain.value = 0.2;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  osc.stop(audioCtx.currentTime + 0.6);
}

function addToSequence() {
  sequence.push(Math.floor(Math.random() * 4));
  roundDisplay = sequence.length;
  phase = 'pre-show';
  showIndex = 0;
  activePanel = -1;
  showTimer = 0;
  showDelay = 500;
}

function handlePanelInput(panelIdx, game) {
  if (game.state !== 'playing' || phase !== 'input') return;
  if (panelIdx < 0 || panelIdx > 3) return;

  activePanel = panelIdx;
  inputFlashTime = 0;
  playTone(panelIdx, 0.2);

  if (panelIdx === sequence[playerIndex]) {
    playerIndex++;
    if (playerIndex >= sequence.length) {
      score = sequence.length;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }
      phase = 'flash-correct';
      flashTimer = 400;
      activePanel = -1;
    }
  } else {
    playBuzz();
    phase = 'flash-wrong';
    flashTimer = 800;
    activePanel = -1;
  }
}

// Convert ms-based timers to frame ticks at 60fps
// The engine calls onUpdate at fixed 60Hz, dt ~= 16.667ms
// We accumulate dt to keep ms-based timing accurate.
let accumulatedDt = 0;

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = '0';
    sequence = [];
    playerIndex = 0;
    showIndex = 0;
    phase = 'idle';
    activePanel = -1;
    roundDisplay = 0;
    frame = 0;
    accumulatedDt = 0;
    game.showOverlay('SIMON', 'Press SPACE or click to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Mouse click handler for panel input
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (game.state === 'waiting') {
      startGame(game);
      return;
    }

    if (game.state === 'over') {
      game.onInit();
      return;
    }

    if (game.state === 'playing') {
      for (let i = 0; i < 4; i++) {
        const r = panelRect(i);
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          handlePanelInput(i, game);
          return;
        }
      }
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function startGame(game) {
    score = 0;
    scoreEl.textContent = '0';
    sequence = [];
    playerIndex = 0;
    roundDisplay = 0;
    frame = 0;
    accumulatedDt = 0;
    game.hideOverlay();
    game.setState('playing');
    addToSequence();
  }

  game.onUpdate = (dt) => {
    const input = game.input;
    frame++;

    // State transitions from keyboard
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('1') || input.wasPressed('2') ||
          input.wasPressed('3') || input.wasPressed('4') ||
          input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        startGame(game);
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('1') || input.wasPressed('2') ||
          input.wasPressed('3') || input.wasPressed('4')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Map keyboard to panel input
    if (phase === 'input') {
      let panelIdx = -1;
      if (input.wasPressed('1') || input.wasPressed('ArrowUp')) panelIdx = 0;
      else if (input.wasPressed('2') || input.wasPressed('ArrowRight')) panelIdx = 1;
      else if (input.wasPressed('3') || input.wasPressed('ArrowLeft')) panelIdx = 2;
      else if (input.wasPressed('4') || input.wasPressed('ArrowDown')) panelIdx = 3;

      if (panelIdx >= 0) {
        handlePanelInput(panelIdx, game);
      }
    }

    // Phase logic (ms-based timing via dt)
    if (phase === 'pre-show') {
      showDelay -= dt;
      if (showDelay <= 0) {
        phase = 'showing';
        showIndex = 0;
        showTimer = 0;
        activePanel = sequence[0];
        playTone(activePanel, getShowInterval() / 1000);
      }
      return;
    }

    if (phase === 'showing') {
      showTimer += dt;
      const interval = getShowInterval();
      const pause = getShowPause();

      if (activePanel >= 0) {
        if (showTimer >= interval) {
          activePanel = -1;
          showTimer = 0;
        }
      } else {
        if (showTimer >= pause) {
          showIndex++;
          if (showIndex >= sequence.length) {
            phase = 'input';
            playerIndex = 0;
            activePanel = -1;
          } else {
            activePanel = sequence[showIndex];
            playTone(activePanel, interval / 1000);
            showTimer = 0;
          }
        }
      }
      return;
    }

    if (phase === 'input') {
      if (activePanel >= 0) {
        inputFlashTime += dt;
        if (inputFlashTime >= INPUT_FLASH_MS) {
          activePanel = -1;
        }
      }
      return;
    }

    if (phase === 'flash-correct') {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        addToSequence();
      }
      return;
    }

    if (phase === 'flash-wrong') {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        phase = 'idle';
        activePanel = -1;
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE or click to restart`);
        game.setState('over');
      }
      return;
    }
  };

  game.onDraw = (renderer, text) => {
    const isWrongFlash = (phase === 'flash-wrong');

    // Draw 4 panels as filled rounded-rect polygons
    for (let i = 0; i < 4; i++) {
      const p = panels[i];
      const r = panelRect(i);
      const isActive = (activePanel === i);

      let fillColor, borderColor;
      if (isWrongFlash) {
        fillColor = '#662222';
        borderColor = '#ff4444';
      } else if (isActive) {
        fillColor = p.bright;
        borderColor = p.bright;
      } else {
        fillColor = p.dim;
        borderColor = '#333333';
      }

      // Glow for active panels
      if (isActive) {
        renderer.setGlow(p.glow, 0.8);
      } else if (isWrongFlash) {
        renderer.setGlow('#ff4444', 0.5);
      }

      // Fill the rounded rect
      const pts = roundedRectPoints(r.x, r.y, r.w, r.h, CORNER_R);
      renderer.fillPoly(pts, fillColor);

      // Border
      renderer.strokePoly(pts, borderColor, isActive ? 3 : 2, true);

      renderer.setGlow(null);

      // Panel label (key number)
      const labelColor = isActive ? '#ffffff' : '#555555';
      const labels = ['1', '2', '3', '4'];
      text.drawText(labels[i], r.x + r.w / 2, r.y + r.h / 2 - 11, 20, labelColor, 'center');
    }

    // Info area at bottom
    const infoY = PANEL_Y_START + 2 * (PANEL_H + GAP) + 20;

    // Round display
    renderer.setGlow('#f6c', 0.4);
    text.drawText('Round ' + roundDisplay, W / 2, infoY - 11, 22, '#ff66cc', 'center');
    renderer.setGlow(null);

    // Phase indicator
    let phaseText = '';
    let phaseColor = '#888888';
    if (phase === 'pre-show' || phase === 'showing') {
      phaseText = 'Watch...';
    } else if (phase === 'input') {
      phaseText = 'Your turn! (' + playerIndex + '/' + sequence.length + ')';
    } else if (phase === 'flash-correct') {
      phaseText = 'Correct!';
      phaseColor = '#44ff44';
    } else if (phase === 'flash-wrong') {
      phaseText = 'Wrong!';
      phaseColor = '#ff4444';
    } else if (game.state === 'waiting') {
      phaseText = 'Click or press 1-4 / arrow keys';
    }
    text.drawText(phaseText, W / 2, infoY + 19, 14, phaseColor, 'center');

    // Key hints at bottom
    text.drawText('Keys: 1=Green  2=Red  3=Yellow  4=Blue', W / 2, H - 26, 12, '#444444', 'center');

    // Update gameData for ML
    window.gameData = {
      phase,
      round: roundDisplay,
      sequenceLength: sequence.length,
      playerIndex,
      activePanel,
      score,
    };
  };

  game.start();
  return game;
}
