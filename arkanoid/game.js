// arkanoid/game.js — Arkanoid game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 600;

// --- Constants ---
const PADDLE_BASE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const PADDLE_SPEED = 7;
const BALL_R = 5;
const BASE_BALL_SPEED = 5.5;
const BRICK_COLS = 12;
const BRICK_ROWS = 10;
const BRICK_W = (W - 20) / BRICK_COLS;
const BRICK_H = 18;
const BRICK_TOP = 60;
const BRICK_PAD = 2;
const POWERUP_W = 24;
const POWERUP_H = 14;
const POWERUP_SPEED = 2.5;
const LASER_W = 3;
const LASER_H = 14;
const LASER_SPEED = 8;

// Particle cap
const MAX_PARTICLES = 300;

// Brick types
const BRICK_NORMAL = 1;
const BRICK_TOUGH = 2;
const BRICK_METAL = 3;

// Power-up types
const PU_EXPAND = 'E';
const PU_LASER = 'L';
const PU_MULTI = 'M';
const PU_STRONG = 'P';
const PU_LIFE = '1';

const PU_COLORS = {
  [PU_EXPAND]: '#4fb',
  [PU_LASER]: '#f44',
  [PU_MULTI]: '#88f',
  [PU_STRONG]: '#fa0',
  [PU_LIFE]: '#f0f'
};

const PU_LABELS = {
  [PU_EXPAND]: 'E',
  [PU_LASER]: 'L',
  [PU_MULTI]: 'M',
  [PU_STRONG]: 'P',
  [PU_LIFE]: '+'
};

const PU_TYPES = [PU_EXPAND, PU_LASER, PU_MULTI, PU_STRONG, PU_LIFE];

// Row colors for normal bricks
const ROW_COLORS = ['#f44', '#f80', '#fa0', '#ff0', '#8f0', '#0f0', '#0f8', '#0ff', '#08f', '#88f'];

// --- Procedural Audio System ---
class SynthSFX {
  constructor() {
    this.ctx = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _playTone(freq, duration, type = 'square', volume = 0.15) {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  brickHit(row) {
    const baseFreq = 300 + (BRICK_ROWS - row) * 60;
    this._playTone(baseFreq, 0.08, 'square', 0.1);
  }

  paddleBounce() {
    this._playTone(220, 0.06, 'square', 0.08);
  }

  wallBounce() {
    this._playTone(180, 0.04, 'sine', 0.04);
  }

  powerupCollect() {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  lifeLost() {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }

  levelClear() {
    const ctx = this._ensureCtx();
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  }

  gameOver() {
    const ctx = this._ensureCtx();
    const notes = [440, 330, 220]; // A4, E4, A3
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.setValueAtTime(0.13, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.2);
    });
  }

  laserFire() {
    this._playTone(1200, 0.05, 'square', 0.06);
  }
}

const sfx = new SynthSFX();

// --- Easing Functions ---
function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutBounce(t) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// --- Screen Shake System ---
let shakeAmount = 0;
let shakeTimer = 0;
let shakeX = 0;
let shakeY = 0;

function triggerShake(amount, duration) {
  shakeAmount = amount;
  shakeTimer = duration;
}

function updateShake() {
  if (shakeTimer > 0) {
    shakeX = (Math.random() - 0.5) * 2 * shakeAmount;
    shakeY = (Math.random() - 0.5) * 2 * shakeAmount;
    shakeTimer--;
    if (shakeTimer <= 0) {
      shakeAmount = 0;
      shakeX = 0;
      shakeY = 0;
    }
  } else {
    shakeX = 0;
    shakeY = 0;
  }
}

// --- Floating Background Particles ---
let bgParticles = [];

function initBgParticles() {
  bgParticles = [];
  for (let i = 0; i < 15; i++) {
    bgParticles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.2 + Math.random() * 0.4,
      size: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.25
    });
  }
}

function updateBgParticles() {
  for (const p of bgParticles) {
    p.y -= p.speed;
    p.x += Math.sin(p.y * 0.01) * 0.2;
    if (p.y < -5) {
      p.y = H + 5;
      p.x = Math.random() * W;
    }
  }
}

// --- Game state ---
let score, best, lives, level;
let paddleX, paddleW;
let balls;       // Array of {x, y, vx, vy, trail}
let bricks;      // 2D array of {type, hits, alive}
let powerups;    // Array of {x, y, type}
let lasers;      // Array of {x, y}
let hasLaser, laserTimer, expandTimer, strongTimer, laserHintTimer;
let comboCount, lastHitFrame;
let particles;
let frameCount;
let levelClearTimer; // countdown for level clear effect
let paddleStretchTimer = 0;
let paddleStretchScale = 1;
let rowClearedFlags = [];

// --- DOM refs ---
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

// --- Level layouts ---
function generateLevel(lvl) {
  const layout = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    layout[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      layout[r][c] = 0;
    }
  }

  switch ((lvl - 1) % 24) {
    case 0: // Welcome Mat — simple full grid
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = BRICK_NORMAL;
        }
      }
      break;

    case 1: // Checkerboard with tough bricks
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if ((r + c) % 2 === 0) {
            layout[r][c] = r < 2 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      break;

    case 2: // Diamond — partial metal border with openings
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const cx = BRICK_COLS / 2 - 0.5;
          const cy = 4;
          const dist = Math.abs(c - cx) + Math.abs(r - cy);
          if (dist <= 5) {
            if (dist === 5 && (c + r) % 2 === 0) layout[r][c] = BRICK_METAL;
            else if (dist === 5) layout[r][c] = BRICK_TOUGH;
            else if (dist <= 2) layout[r][c] = BRICK_TOUGH;
            else layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 3: // Stripes — alternating normal/tough rows, no metal
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = r % 2 === 0 ? BRICK_NORMAL : BRICK_TOUGH;
        }
      }
      break;

    case 4: // Inverted pyramid
      for (let r = 0; r < 7; r++) {
        const indent = r;
        for (let c = indent; c < BRICK_COLS - indent; c++) {
          if (c >= 0 && c < BRICK_COLS) {
            layout[r][c] = r === 0 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      layout[0][0] = BRICK_METAL;
      layout[0][BRICK_COLS - 1] = BRICK_METAL;
      break;

    case 5: // Cross pattern
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const midC = Math.floor(BRICK_COLS / 2);
          const midR = 4;
          if (c >= midC - 1 && c <= midC || r >= midR - 1 && r <= midR) {
            layout[r][c] = BRICK_NORMAL;
          }
          if (c >= midC - 1 && c <= midC && r >= midR - 1 && r <= midR) {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      layout[0][Math.floor(BRICK_COLS / 2) - 1] = BRICK_METAL;
      layout[0][Math.floor(BRICK_COLS / 2)] = BRICK_METAL;
      break;

    case 6: // Zigzag
      for (let r = 0; r < 8; r++) {
        const offset = (r % 2 === 0) ? 0 : 3;
        for (let c = 0; c < BRICK_COLS; c++) {
          if ((c + offset) % 6 < 4) {
            layout[r][c] = r < 3 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      break;

    case 7: // Fortress — metal top + corner pillars, wide bottom gate
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (r === 0) {
            layout[r][c] = BRICK_METAL;
          } else if (r <= 5 && (c <= 1 || c >= BRICK_COLS - 2)) {
            layout[r][c] = BRICK_METAL;
          } else if (r === 1 && c >= 2 && c <= BRICK_COLS - 3) {
            layout[r][c] = BRICK_TOUGH;
          } else if (r >= 2 && r <= 7 && c >= 2 && c <= BRICK_COLS - 3) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 8: // Corridor — vertical metal walls, normal center, tough sides
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (c === 4 || c === 7) {
            layout[r][c] = BRICK_METAL;
          } else if (c === 5 || c === 6) {
            layout[r][c] = BRICK_NORMAL;
          } else {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      break;

    case 9: { // Bullseye — concentric rings
      const cx9 = BRICK_COLS / 2 - 0.5;
      const cy9 = 4.5;
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const dist = Math.sqrt((c - cx9) * (c - cx9) + (r - cy9) * (r - cy9));
          if (dist <= 1.5) {
            layout[r][c] = r <= 3 ? 0 : BRICK_METAL;
          } else if (dist <= 3) {
            layout[r][c] = BRICK_TOUGH;
          } else if (dist <= 5) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;
    }

    case 10: // Maze — metal walls with normal brick paths
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = BRICK_NORMAL;
        }
      }
      for (let c = 0; c < 5; c++) layout[2][c] = BRICK_METAL;
      for (let c = 7; c < BRICK_COLS; c++) layout[4][c] = BRICK_METAL;
      for (let c = 0; c < 5; c++) layout[6][c] = BRICK_METAL;
      for (let r = 0; r < 3; r++) layout[r][8] = BRICK_METAL;
      for (let r = 4; r < 7; r++) layout[r][3] = BRICK_METAL;
      for (let r = 6; r < 9; r++) layout[r][8] = BRICK_METAL;
      break;

    case 11: // Shields — 3 shielded groups
      for (let g = 0; g < 3; g++) {
        const cOff = g * 4;
        for (let r = 5; r <= 7; r++) {
          for (let c = cOff; c < cOff + 4; c++) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
        layout[2][cOff + 1] = BRICK_TOUGH;
        layout[2][cOff + 2] = BRICK_TOUGH;
        for (let c = cOff; c < cOff + 4; c++) layout[3][c] = BRICK_TOUGH;
        for (let c = cOff; c < cOff + 4; c++) layout[4][c] = BRICK_TOUGH;
      }
      break;

    case 12: // Staircase — descending steps
      for (let step = 0; step < 6; step++) {
        const r = step + 1;
        const cStart = step * 2;
        for (let c = cStart; c < cStart + 2 && c < BRICK_COLS; c++) {
          layout[r][c] = step < 2 ? BRICK_TOUGH : BRICK_NORMAL;
          if (r + 1 < BRICK_ROWS) layout[r + 1][c] = BRICK_NORMAL;
        }
        if (cStart < BRICK_COLS) layout[r][cStart] = BRICK_METAL;
      }
      break;

    case 13: // Honeycomb — offset hex-like pattern
      for (let r = 0; r < 8; r++) {
        const off = (r % 2 === 0) ? 0 : 1;
        for (let c = off; c < BRICK_COLS; c += 2) {
          layout[r][c] = BRICK_NORMAL;
          if (r >= 1 && r <= 6 && c >= 2 && c <= 9 && (r + c) % 4 === 0) {
            layout[r][c] = BRICK_TOUGH;
          }
        }
      }
      break;

    case 14: // Gauntlet — dense field with metal column gap
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (c === 5 || c === 6) {
            layout[r][c] = r >= 6 ? BRICK_NORMAL : 0;
          } else if (c === 4 || c === 7) {
            layout[r][c] = BRICK_METAL;
          } else if (r < 4) {
            layout[r][c] = BRICK_TOUGH;
          } else {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 15: { // Boss — skull pattern
      const skull = [
        [0,0,2,2,2,2,2,2,2,2,0,0],
        [0,2,2,2,2,2,2,2,2,2,2,0],
        [0,2,1,3,3,1,1,3,3,1,2,0],
        [0,2,1,1,1,1,1,1,1,1,2,0],
        [0,0,2,1,1,2,2,1,1,2,0,0],
        [0,0,0,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,0,1,1,0,1,1,0,0],
        [0,0,0,1,1,1,1,1,1,0,0,0],
      ];
      for (let r = 0; r < skull.length; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = skull[r][c];
        }
      }
      break;
    }

    case 16: // Spiral
      for (let step = 0; step < 24; step++) {
        const angle = step * 0.6;
        const radius = 1 + step * 0.3;
        const r = Math.round(BRICK_ROWS / 2 + Math.sin(angle) * radius);
        const c = Math.round(BRICK_COLS / 2 + Math.cos(angle) * radius);
        if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS) {
          layout[r][c] = step < 8 ? BRICK_TOUGH : BRICK_NORMAL;
        }
      }
      break;

    case 17: // Twin pyramids
      for (let r = 0; r < 5; r++) {
        for (let c = r; c < 5 - r; c++) {
          layout[r][c + 1] = r === 0 ? BRICK_TOUGH : BRICK_NORMAL;
          layout[r][c + 7] = r === 0 ? BRICK_TOUGH : BRICK_NORMAL;
        }
      }
      break;

    case 18: { // Arrow pointing down
      for (let r = 0; r < 8; r++) {
        const w = Math.max(1, 6 - r);
        const cx18 = Math.floor(BRICK_COLS / 2);
        for (let c = cx18 - w; c <= cx18 + w - 1; c++) {
          if (c >= 0 && c < BRICK_COLS) {
            layout[r][c] = r < 3 ? BRICK_TOUGH : BRICK_NORMAL;
          }
        }
      }
      // Shaft
      for (let r = 0; r < 5; r++) {
        layout[r][5] = BRICK_METAL;
        layout[r][6] = BRICK_METAL;
      }
      break;
    }

    case 19: // Scattered clusters
      for (let g = 0; g < 5; g++) {
        const cr = Math.floor(Math.random() * 6) + 1;
        const cc = Math.floor(Math.random() * 8) + 2;
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            if (cr + dr < BRICK_ROWS && cc + dc < BRICK_COLS) {
              layout[cr + dr][cc + dc] = g < 2 ? BRICK_TOUGH : BRICK_NORMAL;
            }
          }
        }
      }
      break;

    case 20: // Frame — border only
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (r === 0 || r === BRICK_ROWS - 1 || c === 0 || c === BRICK_COLS - 1) {
            layout[r][c] = (r === 0 || r === BRICK_ROWS - 1) && (c === 0 || c === BRICK_COLS - 1) ? BRICK_METAL : BRICK_TOUGH;
          } else if (r === 3 || r === 6) {
            layout[r][c] = BRICK_NORMAL;
          }
        }
      }
      break;

    case 21: // X pattern
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const d1 = Math.abs(c - r * (BRICK_COLS / 8));
          const d2 = Math.abs(c - (BRICK_COLS - 1 - r * (BRICK_COLS / 8)));
          if (d1 < 1.5 || d2 < 1.5) {
            layout[r][c] = r === 0 || r === 7 ? BRICK_METAL : (r < 3 ? BRICK_TOUGH : BRICK_NORMAL);
          }
        }
      }
      break;

    case 22: // Teeth / comb pattern
      for (let c = 0; c < BRICK_COLS; c++) {
        const height = c % 2 === 0 ? 7 : 4;
        for (let r = 0; r < height; r++) {
          layout[r][c] = r === 0 ? BRICK_TOUGH : BRICK_NORMAL;
        }
      }
      break;

    case 23: { // Heart
      const heart = [
        [0,0,1,1,0,0,0,1,1,0,0,0],
        [0,1,2,2,1,0,1,2,2,1,0,0],
        [1,2,1,1,2,1,2,1,1,2,1,0],
        [1,2,1,1,1,1,1,1,1,2,1,0],
        [0,1,2,1,1,1,1,1,2,1,0,0],
        [0,0,1,2,1,1,1,2,1,0,0,0],
        [0,0,0,1,2,1,2,1,0,0,0,0],
        [0,0,0,0,1,2,1,0,0,0,0,0],
      ];
      for (let r = 0; r < heart.length; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          layout[r][c] = heart[r][c];
        }
      }
      break;
    }
  }

  // Add extra tough bricks for higher levels (after first cycle)
  if (lvl > 24) {
    const extraTough = Math.min(lvl - 24, 10);
    for (let i = 0; i < extraTough; i++) {
      const r = Math.floor(Math.random() * BRICK_ROWS);
      const c = Math.floor(Math.random() * BRICK_COLS);
      if (layout[r][c] === BRICK_NORMAL) {
        layout[r][c] = BRICK_TOUGH;
      }
    }
  }

  return layout;
}

function initBricks(lvl) {
  const layout = generateLevel(lvl);
  bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      const type = layout[r][c];
      bricks[r][c] = {
        type: type,
        hits: type === BRICK_TOUGH ? 2 : (type === BRICK_METAL ? -1 : 1),
        alive: type > 0
      };
    }
  }
}

function getEffectiveBallSpeed() {
  return BASE_BALL_SPEED + (level - 1) * 0.3;
}

function resetBall() {
  balls = [];
  const speed = getEffectiveBallSpeed();
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  balls.push({
    x: W / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    trail: []
  });
}

function spawnParticles(x, y, color, count) {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color: color,
      size: 2 + Math.random() * 3
    });
  }
}

function spawnLevelClearParticles() {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W;
    const colors = ['#f44', '#fa0', '#ff0', '#4fb', '#88f', '#f0f'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      color: color,
      size: 2 + Math.random() * 4
    });
  }
}

function maybeDropPowerup(x, y) {
  if (Math.random() < 0.20) {
    const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    powerups.push({ x: x, y: y, type: type });
  }
}

function activatePowerup(type) {
  sfx.powerupCollect();
  switch (type) {
    case PU_EXPAND:
      paddleW = PADDLE_BASE_W * 1.6;
      expandTimer = 600;
      break;

    case PU_LASER:
      hasLaser = true;
      laserTimer = 600;
      laserHintTimer = 120;
      break;

    case PU_MULTI:
      if (balls.length > 0) {
        const newBalls = [];
        const sourceBall = balls[0];
        const speed = Math.sqrt(sourceBall.vx * sourceBall.vx + sourceBall.vy * sourceBall.vy);
        for (let i = 0; i < 2; i++) {
          const angleOffset = (i === 0 ? -0.5 : 0.5);
          const currentAngle = Math.atan2(sourceBall.vy, sourceBall.vx);
          const newAngle = currentAngle + angleOffset;
          newBalls.push({
            x: sourceBall.x,
            y: sourceBall.y,
            vx: Math.cos(newAngle) * speed,
            vy: Math.sin(newAngle) * speed,
            trail: []
          });
        }
        balls.push(...newBalls);
      }
      break;

    case PU_STRONG:
      strongTimer = 480;
      break;

    case PU_LIFE:
      lives++;
      livesEl.textContent = lives;
      break;
  }
}

function getBrickColor(row, type) {
  if (type === BRICK_TOUGH) return '#fff';
  if (type === BRICK_METAL) return '#888';
  return ROW_COLORS[row % ROW_COLORS.length];
}

function hitBrick(r, c) {
  const brick = bricks[r][c];
  if (brick.type === BRICK_METAL) {
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    spawnParticles(bx, by, '#888', 4);
    sfx.brickHit(r);
    return;
  }

  brick.hits--;
  if (brick.hits <= 0) {
    brick.alive = false;
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    const color = getBrickColor(r, brick.type);
    spawnParticles(bx, by, color, 10);
    maybeDropPowerup(bx, by);

    if (frameCount - lastHitFrame < 30) {
      comboCount++;
    } else {
      comboCount = 1;
    }
    lastHitFrame = frameCount;

    const basePoints = 10 + (BRICK_ROWS - r) * 5;
    const comboBonus = Math.min(comboCount, 10);
    score += basePoints * comboBonus;
    triggerShake(2, 5);

    // Check if this row is now fully cleared
    let rowDone = true;
    for (let cc = 0; cc < BRICK_COLS; cc++) {
      if (bricks[r][cc].alive && bricks[r][cc].type !== BRICK_METAL) {
        rowDone = false;
        break;
      }
    }
    if (rowDone && !rowClearedFlags[r]) {
      rowClearedFlags[r] = true;
      // Cascade: extra particles along the row
      for (let cc = 0; cc < BRICK_COLS; cc++) {
        const rx = 10 + cc * BRICK_W + BRICK_W / 2;
        const ry = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
        spawnParticles(rx, ry, ROW_COLORS[r % ROW_COLORS.length], 3);
      }
      triggerShake(3, 8);
      score += 100; // Row clear bonus
      scoreEl.textContent = score;
    }
  } else {
    const bx = 10 + c * BRICK_W + BRICK_W / 2;
    const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
    spawnParticles(bx, by, '#ff8', 4);
  }

  sfx.brickHit(r);
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
  }
}

function hitBrickStrong(r, c) {
  const brick = bricks[r][c];
  brick.alive = false;
  const bx = 10 + c * BRICK_W + BRICK_W / 2;
  const by = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
  const color = brick.type === BRICK_METAL ? '#fa0' : getBrickColor(r, brick.type);
  spawnParticles(bx, by, color, 12);
  if (brick.type !== BRICK_METAL) {
    maybeDropPowerup(bx, by);
  }

  if (frameCount - lastHitFrame < 30) {
    comboCount++;
  } else {
    comboCount = 1;
  }
  lastHitFrame = frameCount;

  const basePoints = brick.type === BRICK_METAL ? 100 : (10 + (BRICK_ROWS - r) * 5);
  const comboBonus = Math.min(comboCount, 10);
  score += basePoints * comboBonus;
  scoreEl.textContent = score;
  if (score > best) best = score;
  sfx.brickHit(r);
  triggerShake(2, 5);

  // Check if this row is now fully cleared
  let rowDoneS = true;
  for (let cc = 0; cc < BRICK_COLS; cc++) {
    if (bricks[r][cc].alive && bricks[r][cc].type !== BRICK_METAL) {
      rowDoneS = false;
      break;
    }
  }
  if (rowDoneS && !rowClearedFlags[r]) {
    rowClearedFlags[r] = true;
    for (let cc = 0; cc < BRICK_COLS; cc++) {
      const rx = 10 + cc * BRICK_W + BRICK_W / 2;
      const ry = BRICK_TOP + r * BRICK_H + BRICK_H / 2;
      spawnParticles(rx, ry, ROW_COLORS[r % ROW_COLORS.length], 3);
    }
    triggerShake(3, 8);
    score += 100;
    scoreEl.textContent = score;
  }
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    lives = 3;
    level = 1;
    paddleW = PADDLE_BASE_W;
    paddleX = W / 2 - paddleW / 2;
    balls = [];
    powerups = [];
    lasers = [];
    particles = [];
    hasLaser = false;
    laserTimer = 0;
    expandTimer = 0;
    strongTimer = 0;
    laserHintTimer = 0;
    comboCount = 0;
    lastHitFrame = -999;
    frameCount = 0;
    levelClearTimer = 0;
    shakeAmount = 0;
    shakeTimer = 0;
    shakeX = 0;
    shakeY = 0;
    paddleStretchTimer = 0;
    paddleStretchScale = 1;
    rowClearedFlags = new Array(BRICK_ROWS).fill(false);
    initBgParticles();
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    initBricks(1);
    resetBall();
    game.showOverlay('ARKANOID', 'Press SPACE or LEFT/RIGHT to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Always update background particles and shake
    updateBgParticles();
    updateShake();

    if (game.state === 'waiting') {
      if (input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed(' ')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ')) {
        game.onInit();
      }
      return;
    }

    // --- Level clear effect countdown ---
    if (levelClearTimer > 0) {
      levelClearTimer--;
      // Update particles during clear effect
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
      if (levelClearTimer <= 0) {
        // Actually advance level
        level++;
        levelEl.textContent = level;
        score += 500 * level;
        scoreEl.textContent = score;
        initBricks(level);
        rowClearedFlags = new Array(BRICK_ROWS).fill(false);
        resetBall();
        powerups = [];
        lasers = [];
      }
      return;
    }

    // --- Playing state ---
    frameCount++;

    // Fire laser on space
    if (input.wasPressed(' ') && hasLaser) {
      lasers.push({ x: paddleX + 6, y: PADDLE_Y - 4 });
      lasers.push({ x: paddleX + paddleW - 6, y: PADDLE_Y - 4 });
      sfx.laserFire();
    }

    // Decrement timers
    if (expandTimer > 0) {
      expandTimer--;
      if (expandTimer <= 0) {
        paddleW = PADDLE_BASE_W;
        paddleX = Math.min(paddleX, W - paddleW);
      }
    }
    if (laserTimer > 0) {
      laserTimer--;
      if (laserTimer <= 0) hasLaser = false;
    }
    if (strongTimer > 0) {
      strongTimer--;
    }
    if (laserHintTimer > 0) {
      laserHintTimer--;
    }

    // Paddle stretch animation
    if (paddleStretchTimer > 0) {
      paddleStretchTimer--;
      paddleStretchScale = 1 + 0.2 * easeOutElastic(1 - paddleStretchTimer / 8);
      if (paddleStretchTimer <= 0) paddleStretchScale = 1;
    }

    // Move paddle
    if (input.isDown('ArrowLeft') || input.isDown('a')) paddleX -= PADDLE_SPEED;
    if (input.isDown('ArrowRight') || input.isDown('d')) paddleX += PADDLE_SPEED;
    paddleX = Math.max(0, Math.min(W - paddleW, paddleX));

    // Update balls
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];

      // Update trail
      if (!ball.trail) ball.trail = [];
      ball.trail.unshift({ x: ball.x, y: ball.y });
      if (ball.trail.length > 6) ball.trail.pop();

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x - BALL_R <= 0) {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx);
        sfx.wallBounce();
      }
      if (ball.x + BALL_R >= W) {
        ball.x = W - BALL_R;
        ball.vx = -Math.abs(ball.vx);
        sfx.wallBounce();
      }
      if (ball.y - BALL_R <= 0) {
        ball.y = BALL_R;
        ball.vy = Math.abs(ball.vy);
        sfx.wallBounce();
      }

      // Paddle collision
      if (ball.vy > 0 &&
          ball.y + BALL_R >= PADDLE_Y &&
          ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 6 &&
          ball.x >= paddleX - 2 &&
          ball.x <= paddleX + paddleW + 2) {
        ball.y = PADDLE_Y - BALL_R;
        const hit = (ball.x - paddleX) / paddleW;
        const angle = -Math.PI * (0.15 + 0.7 * (1 - hit));
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        comboCount = 0;
        sfx.paddleBounce();
        paddleStretchTimer = 8;
        paddleStretchScale = 1.2;
        triggerShake(1, 3);
      }

      // Ball falls below
      if (ball.y - BALL_R > H) {
        balls.splice(bi, 1);
        continue;
      }

      // Brick collisions
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          if (!bricks[r][c].alive) continue;
          const bx = 10 + c * BRICK_W + BRICK_PAD;
          const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
          const bw = BRICK_W - BRICK_PAD * 2;
          const bh = BRICK_H - BRICK_PAD * 2;

          if (ball.x + BALL_R > bx && ball.x - BALL_R < bx + bw &&
              ball.y + BALL_R > by && ball.y - BALL_R < by + bh) {

            if (strongTimer > 0) {
              // Power ball — plow through everything
              hitBrickStrong(r, c);
            } else {
              const overlapLeft = (ball.x + BALL_R) - bx;
              const overlapRight = (bx + bw) - (ball.x - BALL_R);
              const overlapTop = (ball.y + BALL_R) - by;
              const overlapBottom = (by + bh) - (ball.y - BALL_R);
              const minOverlapX = Math.min(overlapLeft, overlapRight);
              const minOverlapY = Math.min(overlapTop, overlapBottom);

              if (minOverlapX < minOverlapY) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }

              hitBrick(r, c);
              break;
            }
          }
        }
      }
    }

    // All balls lost
    if (balls.length === 0) {
      lives--;
      livesEl.textContent = lives;
      paddleW = PADDLE_BASE_W;
      hasLaser = false;
      laserTimer = 0;
      expandTimer = 0;
      strongTimer = 0;
      laserHintTimer = 0;
      if (lives <= 0) {
        if (score > best) best = score;
        sfx.gameOver();
        game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
        game.setState('over');
        return;
      }
      sfx.lifeLost();
      resetBall();
    }

    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      powerups[i].y += POWERUP_SPEED;

      const pu = powerups[i];
      if (pu.y + POWERUP_H >= PADDLE_Y &&
          pu.y <= PADDLE_Y + PADDLE_H &&
          pu.x + POWERUP_W / 2 >= paddleX &&
          pu.x - POWERUP_W / 2 <= paddleX + paddleW) {
        activatePowerup(pu.type);
        spawnParticles(pu.x, pu.y, PU_COLORS[pu.type], 8);
        powerups.splice(i, 1);
        continue;
      }

      if (pu.y > H) {
        powerups.splice(i, 1);
      }
    }

    // Update lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].y -= LASER_SPEED;

      if (lasers[i].y < 0) {
        lasers.splice(i, 1);
        continue;
      }

      const laser = lasers[i];
      let hitSomething = false;
      for (let r = 0; r < BRICK_ROWS && !hitSomething; r++) {
        for (let c = 0; c < BRICK_COLS && !hitSomething; c++) {
          if (!bricks[r][c].alive) continue;
          const bx = 10 + c * BRICK_W + BRICK_PAD;
          const by = BRICK_TOP + r * BRICK_H + BRICK_PAD;
          const bw = BRICK_W - BRICK_PAD * 2;
          const bh = BRICK_H - BRICK_PAD * 2;

          if (laser.x >= bx && laser.x <= bx + bw &&
              laser.y >= by && laser.y <= by + bh) {
            hitBrick(r, c);
            lasers.splice(i, 1);
            hitSomething = true;
          }
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Check level clear
    let allClear = true;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (bricks[r][c].alive && bricks[r][c].type !== BRICK_METAL) {
          allClear = false;
          break;
        }
      }
      if (!allClear) break;
    }
    if (allClear) {
      // Trigger level clear effect
      sfx.levelClear();
      triggerShake(4, 15);
      spawnLevelClearParticles();
      levelClearTimer = 45; // ~0.75 seconds of celebration before advancing
    }

    // Update game data for ML
    window.gameData = {
      paddleX: paddleX,
      paddleW: paddleW,
      balls: balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
      lives: lives,
      level: level,
      hasLaser: hasLaser,
      hasStrong: strongTimer > 0,
      powerupsOnScreen: powerups.length,
      activeBricks: bricks.flat().filter(b => b.alive).length
    };
  };

  game.onDraw = (renderer, text) => {
    // --- Enhanced Background ---
    // Gradient background strips (layered blues)
    const gradSteps = 12;
    for (let i = 0; i < gradSteps; i++) {
      const t = i / gradSteps;
      const r = Math.floor(10 + t * 15);
      const g = Math.floor(10 + t * 25);
      const b = Math.floor(30 + t * 40);
      const yy = (i / gradSteps) * H;
      const hh = H / gradSteps + 1;
      renderer.fillRect(shakeX + 0, shakeY + yy, W, hh, `rgba(${r}, ${g}, ${b}, 0.4)`);
    }

    // Perspective grid lines converging toward center top
    const vanishX = W / 2;
    const vanishY = -60;
    // Vertical perspective lines
    for (let i = 0; i <= 10; i++) {
      const bottomX = (i / 10) * W;
      renderer.drawLine(
        shakeX + bottomX, shakeY + H,
        shakeX + vanishX + (bottomX - vanishX) * 0.2, shakeY + vanishY,
        'rgba(20, 60, 110, 0.25)', 0.5
      );
    }
    // Horizontal lines with perspective spacing
    for (let i = 0; i < 12; i++) {
      const t = Math.pow(i / 12, 1.5);
      const yy = H - t * (H + 60);
      if (yy < -60 || yy > H) continue;
      const spread = 1 - t * 0.8;
      const x1 = vanishX - (W / 2) * spread;
      const x2 = vanishX + (W / 2) * spread;
      renderer.drawLine(
        shakeX + x1, shakeY + yy,
        shakeX + x2, shakeY + yy,
        'rgba(20, 60, 110, 0.2)', 0.5
      );
    }

    // Floating background particles
    for (const bp of bgParticles) {
      const a = bp.alpha;
      renderer.fillCircle(shakeX + bp.x, shakeY + bp.y, bp.size, `rgba(100, 160, 255, ${a})`);
    }

    // Bricks — 3D beveled
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!bricks[r][c].alive) continue;
        const brick = bricks[r][c];
        const bx = shakeX + 10 + c * BRICK_W + BRICK_PAD;
        const by = shakeY + BRICK_TOP + r * BRICK_H + BRICK_PAD;
        const bw = BRICK_W - BRICK_PAD * 2;
        const bh = BRICK_H - BRICK_PAD * 2;

        if (brick.type === BRICK_METAL) {
          // Metal brick — darker base with 3D detail
          renderer.fillRect(bx, by, bw, bh, '#556');
          // Top third lighter stripe
          renderer.fillRect(bx + 2, by, bw - 4, bh / 3, 'rgba(255, 255, 255, 0.15)');
          // Specular highlight line
          renderer.fillRect(bx + 4, by + 2, bw - 8, 1, 'rgba(255, 255, 255, 0.3)');
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Rivet dots at corners
          renderer.fillCircle(bx + 4, by + 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + bw - 4, by + 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + 4, by + bh - 4, 1.5, 'rgba(200, 200, 220, 0.5)');
          renderer.fillCircle(bx + bw - 4, by + bh - 4, 1.5, 'rgba(200, 200, 220, 0.5)');
        } else if (brick.type === BRICK_TOUGH) {
          const color = ROW_COLORS[r % ROW_COLORS.length];
          renderer.setGlow(color, 0.5);
          renderer.fillRect(bx, by, bw, bh, color);
          renderer.setGlow(null);
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Inner shine
          renderer.fillRect(bx + 2, by + 2, bw - 4, 4, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx + 2, by + 2, 4, bh - 4, 'rgba(255, 255, 255, 0.3)');
          // Crack line if damaged
          if (brick.hits === 1) {
            renderer.drawLine(bx + bw * 0.3, by, bx + bw * 0.5, by + bh * 0.5, 'rgba(0, 0, 0, 0.6)', 2);
            renderer.drawLine(bx + bw * 0.5, by + bh * 0.5, bx + bw * 0.7, by + bh, 'rgba(0, 0, 0, 0.6)', 2);
          }
        } else {
          const color = ROW_COLORS[r % ROW_COLORS.length];
          renderer.setGlow(color, 0.4);
          renderer.fillRect(bx, by, bw, bh, color);
          renderer.setGlow(null);
          // Bevel edges
          renderer.fillRect(bx, by, bw, 2, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by, 2, bh, 'rgba(255, 255, 255, 0.3)');
          renderer.fillRect(bx, by + bh - 2, bw, 2, 'rgba(0, 0, 0, 0.3)');
          renderer.fillRect(bx + bw - 2, by, 2, bh, 'rgba(0, 0, 0, 0.3)');
          // Inner face highlight
          renderer.fillRect(bx + 2, by + 2, bw - 4, (bh - 4) / 2, 'rgba(255, 255, 255, 0.1)');
        }
      }
    }

    // Power-ups — rotating 3D capsules with pulsing glow
    powerups.forEach(pu => {
      const puColor = PU_COLORS[pu.type];
      const phase = Math.sin(frameCount * 0.08 + pu.y * 0.1);
      const visibleW = POWERUP_W * Math.abs(phase);
      const glowPulse = 0.5 + Math.sin(frameCount * 0.12 + pu.y * 0.05) * 0.3;

      // Diamond enclosure
      const diamondSize = POWERUP_W * 0.8;
      renderer.strokePoly([
        { x: shakeX + pu.x, y: shakeY + pu.y - diamondSize / 2 },
        { x: shakeX + pu.x + diamondSize / 2, y: shakeY + pu.y },
        { x: shakeX + pu.x, y: shakeY + pu.y + diamondSize / 2 },
        { x: shakeX + pu.x - diamondSize / 2, y: shakeY + pu.y }
      ], puColor, 1, true);

      if (visibleW < 2) {
        // Edge-on: thin line
        renderer.fillRect(shakeX + pu.x - 1, shakeY + pu.y - POWERUP_H / 2, 2, POWERUP_H, puColor);
      } else {
        const px = shakeX + pu.x - visibleW / 2;
        const py = shakeY + pu.y - POWERUP_H / 2;
        renderer.setGlow(puColor, glowPulse);
        renderer.fillRect(px, py, visibleW, POWERUP_H, puColor);
        renderer.setGlow(null);

        // 3D highlight on top half
        if (phase > 0) {
          renderer.fillRect(px + 1, py + 1, visibleW - 2, POWERUP_H / 3, 'rgba(255, 255, 255, 0.25)');
        }

        // Label visible when capsule > 50% width
        if (visibleW > POWERUP_W * 0.5) {
          text.drawText(PU_LABELS[pu.type], shakeX + pu.x, py - 2, 10, '#1a1a2e', 'center');
        }
      }
    });

    // Lasers
    lasers.forEach(laser => {
      renderer.setGlow('#f44', 0.6);
      renderer.fillRect(shakeX + laser.x - LASER_W / 2, shakeY + laser.y, LASER_W, LASER_H, '#f44');
    });
    renderer.setGlow(null);

    // Paddle
    const paddleColor = hasLaser ? '#f44' : '#4fb';
    const visualPaddleW = paddleW * paddleStretchScale;
    const visualPaddleX = paddleX - (visualPaddleW - paddleW) / 2;

    // Paddle glow aura
    const paddleCx = shakeX + paddleX + paddleW / 2;
    const paddleCy = shakeY + PADDLE_Y + PADDLE_H / 2;
    renderer.setGlow(paddleColor, 0.3);
    renderer.fillCircle(paddleCx, paddleCy, paddleW / 2 + 8, `rgba(68, 255, 187, 0.08)`);
    renderer.setGlow(null);

    renderer.setGlow(paddleColor, 0.8);
    renderer.fillRect(shakeX + visualPaddleX, shakeY + PADDLE_Y, visualPaddleW, PADDLE_H, paddleColor);
    renderer.setGlow(null);

    // Laser cannons on paddle
    if (hasLaser) {
      renderer.fillRect(shakeX + visualPaddleX + 4, shakeY + PADDLE_Y - 4, 4, 6, '#f88');
      renderer.fillRect(shakeX + visualPaddleX + visualPaddleW - 8, shakeY + PADDLE_Y - 4, 4, 6, '#f88');
    }

    // Paddle highlight
    renderer.fillRect(shakeX + visualPaddleX + 4, shakeY + PADDLE_Y + 2, visualPaddleW - 8, 2, 'rgba(255, 255, 255, 0.2)');

    // Laser hint
    if (laserHintTimer > 0) {
      const alpha = laserHintTimer < 30 ? laserHintTimer / 30 : 1;
      const hintColor = `rgba(255, 68, 68, ${alpha})`;
      text.drawText('PRESS SPACE TO FIRE', shakeX + W / 2, shakeY + PADDLE_Y - 30, 12, hintColor, 'center');
    }

    // Ball trails
    balls.forEach(ball => {
      if (ball.trail) {
        for (let t = 0; t < ball.trail.length; t++) {
          const pos = ball.trail[t];
          const frac = 1 - (t + 1) / (ball.trail.length + 1);
          const trailR = BALL_R * frac * 0.8;
          if (trailR < 0.5) continue;
          const alpha = frac * 0.4;
          if (strongTimer > 0) {
            renderer.fillCircle(shakeX + pos.x, shakeY + pos.y, trailR, `rgba(255, 170, 0, ${alpha})`);
          } else {
            renderer.fillCircle(shakeX + pos.x, shakeY + pos.y, trailR, `rgba(68, 255, 187, ${alpha})`);
          }
        }
      }
    });

    // Balls — glow gold when strong
    balls.forEach(ball => {
      if (strongTimer > 0) {
        renderer.setGlow('#fa0', 1.0);
        renderer.fillCircle(shakeX + ball.x, shakeY + ball.y, BALL_R + 2, '#fa0');
        renderer.setGlow(null);
        renderer.fillCircle(shakeX + ball.x, shakeY + ball.y, BALL_R, '#fff');
      } else {
        renderer.setGlow('#4fb', 0.8);
        renderer.fillCircle(shakeX + ball.x, shakeY + ball.y, BALL_R, '#fff');
        renderer.setGlow(null);
      }
      // Ball highlight
      renderer.fillCircle(shakeX + ball.x - 1, shakeY + ball.y - 1, BALL_R * 0.4, 'rgba(255, 255, 255, 0.6)');
    });

    // Particles
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      renderer.setGlow(p.color, alpha * 0.3);
      renderer.fillRect(shakeX + p.x - p.size / 2, shakeY + p.y - p.size / 2, p.size, p.size, p.color);
    });
    renderer.setGlow(null);

    // Lives indicator (bottom right)
    renderer.setGlow('#4fb', 0.4);
    for (let i = 0; i < lives; i++) {
      renderer.fillCircle(shakeX + W - 20 - i * 18, shakeY + H - 15, 5, '#4fb');
    }
    renderer.setGlow(null);

    // Power-up legend (bottom-right, above lives)
    const legendX = shakeX + W - 140;
    const legendY = shakeY + H - 55;
    const legendItems = [
      { color: PU_COLORS[PU_EXPAND], letter: 'E', name: 'Expand' },
      { color: PU_COLORS[PU_LASER], letter: 'L', name: 'Laser' },
      { color: PU_COLORS[PU_MULTI], letter: 'M', name: 'Multi' },
      { color: PU_COLORS[PU_STRONG], letter: 'P', name: 'Power' },
      { color: PU_COLORS[PU_LIFE], letter: '+', name: 'Life' },
    ];
    legendItems.forEach((item, i) => {
      const ly = legendY + i * 10;
      renderer.fillCircle(legendX + 3, ly, 2.5, item.color);
      text.drawText(item.letter + ' ' + item.name, legendX + 9, ly - 5, 8, 'rgba(255, 255, 255, 0.5)', 'left');
    });

    // Active power-up indicators (bottom left)
    let indicatorX = shakeX + 10;
    const indicatorY = shakeY + H - 12;
    if (expandTimer > 0) {
      text.drawText('EXPAND ' + Math.ceil(expandTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_EXPAND], 'left');
      indicatorX += 80;
    }
    if (laserTimer > 0) {
      text.drawText('LASER ' + Math.ceil(laserTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_LASER], 'left');
      indicatorX += 72;
    }
    if (strongTimer > 0) {
      text.drawText('POWER ' + Math.ceil(strongTimer / 60) + 's', indicatorX, indicatorY - 10, 10, PU_COLORS[PU_STRONG], 'left');
      indicatorX += 72;
    }

    // Combo indicator — tiered visual escalation
    if (comboCount > 1 && frameCount - lastHitFrame < 60) {
      const pulse = 1 + Math.sin(frameCount * 0.2) * 0.15;
      const tier = comboCount >= 20 ? 3 : comboCount >= 10 ? 2 : comboCount >= 5 ? 1 : 0;
      const baseSize = 16 + comboCount * 2;
      const tierSizeBonus = tier * 4;
      const comboSize = Math.min(baseSize + tierSizeBonus, 36) * pulse;
      const glowIntensity = 0.6 + tier * 0.2;

      const comboColors = ['#ff0', '#f80', '#f44', '#f0f'];
      const comboColor = comboColors[tier];

      renderer.setGlow(comboColor, glowIntensity);
      text.drawText('COMBO x' + comboCount, shakeX + W / 2, shakeY + BRICK_TOP - 20, comboSize, comboColor, 'center');
      renderer.setGlow(null);

      const tierLabels = ['', 'EXCELLENT!', 'AMAZING!!', 'UNSTOPPABLE!!!'];
      if (tier > 0) {
        const excPulse = 1 + Math.sin(frameCount * 0.15 + 1) * 0.1;
        const excSize = (14 + tier * 2) * excPulse;
        renderer.setGlow(comboColor, glowIntensity * 0.8);
        text.drawText(tierLabels[tier], shakeX + W / 2, shakeY + BRICK_TOP - 38, excSize, comboColor, 'center');
        renderer.setGlow(null);
      }
    }

    // Level clear celebration text
    if (levelClearTimer > 0) {
      const alpha = levelClearTimer > 30 ? 1 : levelClearTimer / 30;
      const clearPulse = 1 + Math.sin(frameCount * 0.3) * 0.1;
      const clearSize = 28 * clearPulse;
      renderer.setGlow('#4fb', 1.0);
      text.drawText('LEVEL CLEAR!', shakeX + W / 2, shakeY + H / 2 - 20, clearSize, `rgba(68, 255, 187, ${alpha})`, 'center');
      renderer.setGlow(null);

      // Screen flash overlay on level clear
      if (levelClearTimer > 30) {
        const flashAlpha = (levelClearTimer - 30) / 15;
        renderer.fillRect(0, 0, W, H, `rgba(255, 255, 255, ${Math.min(flashAlpha * 0.3, 0.3).toFixed(2)})`);
      }
    }
  };

  game.start();
  return game;
}
