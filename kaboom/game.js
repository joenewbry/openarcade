// kaboom/game.js — Kaboom game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 600;

// Bomber constants
const BOMBER_W = 40;
const BOMBER_H = 36;
const BOMBER_Y = 30;

// Bucket constants
const BUCKET_W = 70;
const BUCKET_H = 18;
const BUCKET_GAP = 4;
const BUCKET_BOTTOM_Y = H - 40;

// Bomb constants
const BOMB_R = 8;

// Keyboard speed
const KEYBOARD_SPEED = 6;

// -- State --
let score, best, wave;
let bomberX, bomberDir, bomberSpeed;
let bucketX, buckets;
let bombs, explosions;
let bombsInWave, bombsDropped, bombsCaught;
let dropTimer, dropInterval;
let waveCompleteTimer;

// -- DOM refs --
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const waveEl = document.getElementById('wave');

// Wave configuration
function getWaveConfig(w) {
  const speed = Math.min(2 + w * 0.6, 8);
  const interval = Math.max(60 - w * 5, 12);
  const count = 10 + w * 5;
  return { speed, interval, count };
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.radius += 2;
    e.alpha -= 0.03;
    if (e.alpha <= 0 || e.radius >= e.maxRadius) {
      explosions.splice(i, 1);
    }
  }
}

function startWave(w) {
  wave = w;
  waveEl.textContent = wave;
  const cfg = getWaveConfig(wave);
  bomberSpeed = cfg.speed;
  dropInterval = cfg.interval;
  bombsInWave = cfg.count;
  bombsDropped = 0;
  bombsCaught = 0;
  dropTimer = 0;
  bombs = [];
}

export function createGame() {
  const game = new Game('game');
  const canvas = game.canvas;

  // Mouse tracking for bucket movement
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    bucketX = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, x));
  });

  game.onInit = () => {
    score = 0;
    best = best || 0;
    wave = 1;
    buckets = 3;
    bomberX = W / 2;
    bomberDir = 1;
    bucketX = W / 2;
    bombs = [];
    explosions = [];
    dropTimer = 0;
    bombsDropped = 0;
    bombsCaught = 0;
    waveCompleteTimer = 0;

    const cfg = getWaveConfig(wave);
    bomberSpeed = cfg.speed;
    dropInterval = cfg.interval;
    bombsInWave = cfg.count;

    scoreEl.textContent = '0';
    waveEl.textContent = '1';
    game.showOverlay('KABOOM!', 'Move mouse or arrow keys -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions from input
    if (game.state === 'waiting') {
      if (input.wasPressed(' ')) {
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

    // -- Playing state --

    // Keyboard movement
    if (input.isDown('ArrowLeft')) bucketX -= KEYBOARD_SPEED;
    if (input.isDown('ArrowRight')) bucketX += KEYBOARD_SPEED;
    bucketX = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, bucketX));

    // Wave complete animation pause
    if (waveCompleteTimer > 0) {
      waveCompleteTimer--;
      if (waveCompleteTimer === 0) {
        startWave(wave + 1);
      }
      updateExplosions();
      return;
    }

    // Move bomber
    bomberX += bomberDir * bomberSpeed;
    if (bomberX > W - BOMBER_W / 2) {
      bomberX = W - BOMBER_W / 2;
      bomberDir = -1;
    }
    if (bomberX < BOMBER_W / 2) {
      bomberX = BOMBER_W / 2;
      bomberDir = 1;
    }

    // Drop bombs
    if (bombsDropped < bombsInWave) {
      dropTimer++;
      if (dropTimer >= dropInterval) {
        dropTimer = 0;
        bombs.push({
          x: bomberX,
          y: BOMBER_Y + BOMBER_H,
          vy: 2 + wave * 0.3,
          fusePhase: Math.random() * Math.PI * 2
        });
        bombsDropped++;
      }
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.y += b.vy;
      b.fusePhase += 0.15;

      // Check catch with buckets (from bottom bucket up)
      let caught = false;
      for (let j = 0; j < buckets; j++) {
        const bucketY = BUCKET_BOTTOM_Y - j * (BUCKET_H + BUCKET_GAP);
        const bLeft = bucketX - BUCKET_W / 2;
        const bRight = bucketX + BUCKET_W / 2;

        if (b.y + BOMB_R >= bucketY && b.y + BOMB_R <= bucketY + BUCKET_H + b.vy &&
            b.x >= bLeft + 4 && b.x <= bRight - 4) {
          // Caught!
          caught = true;
          bombs.splice(i, 1);
          bombsCaught++;

          // Score: more points in higher waves
          const points = wave * 10;
          score += points;
          scoreEl.textContent = score;
          if (score > best) {
            best = score;
            bestEl.textContent = best;
          }

          // Small catch sparkle
          explosions.push({
            x: b.x,
            y: bucketY,
            radius: 0,
            maxRadius: 12,
            alpha: 0.8,
            color: '#fff'
          });
          break;
        }
      }

      if (caught) continue;

      // Check if bomb hit the ground
      if (b.y + BOMB_R >= H - 10) {
        bombs.splice(i, 1);

        // Explosion
        explosions.push({
          x: b.x,
          y: H - 20,
          radius: 0,
          maxRadius: 40,
          alpha: 1.0,
          color: '#f06'
        });

        // Lose a bucket
        buckets--;
        if (buckets <= 0) {
          game.showOverlay('GAME OVER', `Score: ${score} -- Press SPACE to restart`);
          game.setState('over');
          return;
        }
      }
    }

    // Check wave complete
    if (bombsDropped >= bombsInWave && bombs.length === 0 && waveCompleteTimer === 0) {
      // Wave bonus
      const bonus = wave * 100;
      score += bonus;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
      }

      // Restore one bucket (max 3)
      if (buckets < 3) buckets++;

      waveCompleteTimer = 90; // 1.5 second pause
    }

    updateExplosions();
  };

  game.onDraw = (renderer, text) => {
    // Ground line
    renderer.fillRect(0, H - 10, W, 2, '#0f3460');

    // Draw bomber
    drawBomber(renderer, bomberX, BOMBER_Y);

    // Draw bombs
    bombs.forEach(b => drawBomb(renderer, b));

    // Draw buckets
    drawBuckets(renderer);

    // Draw explosions
    explosions.forEach(e => {
      renderer.setGlow(e.color, e.alpha * 0.8);
      renderer.fillCircle(e.x, e.y, e.radius, e.color);
      renderer.setGlow(null);
    });

    // Wave complete text
    if (waveCompleteTimer > 0) {
      const pulse = 0.6 + Math.sin(waveCompleteTimer * 0.15) * 0.4;
      renderer.setGlow('#f06', pulse * 0.8);
      text.drawText(`WAVE ${wave} COMPLETE!`, W / 2, H / 2 - 20, 28, '#f06', 'center');
      renderer.setGlow('#fff', pulse * 0.5);
      text.drawText(`+${wave * 100} BONUS`, W / 2, H / 2 + 15, 18, '#fff', 'center');
      renderer.setGlow(null);
    }

    // Lives / buckets indicator
    text.drawText('Buckets:', 10, H - 18, 14, '#888', 'left');
    for (let i = 0; i < buckets; i++) {
      renderer.setGlow('#f06', 0.4);
      renderer.fillRect(85 + i * 20, H - 26, 14, 10, '#f06');
    }
    renderer.setGlow(null);
  };

  function drawBomber(renderer, x, y) {
    renderer.setGlow('#f06', 0.5);

    // Hat
    renderer.fillRect(x - 18, y - 8, 36, 6, '#333');
    renderer.fillRect(x - 12, y - 18, 24, 12, '#333');

    // Face
    renderer.fillRect(x - 14, y, 28, 18, '#e0e0e0');

    // Eyes - shift based on direction
    const eyeOffset = bomberDir * 2;
    renderer.setGlow('#f06', 0.5);
    renderer.fillRect(x - 8 + eyeOffset, y + 4, 5, 5, '#f06');
    renderer.fillRect(x + 3 + eyeOffset, y + 4, 5, 5, '#f06');

    // Grin
    renderer.fillRect(x - 8, y + 12, 16, 3, '#f06');

    // Arms
    renderer.fillRect(x - 18, y + 6, 5, 14, '#e0e0e0');
    renderer.fillRect(x + 13, y + 6, 5, 14, '#e0e0e0');

    renderer.setGlow(null);
  }

  function drawBomb(renderer, b) {
    // Bomb body
    renderer.setGlow('#f06', 0.6);
    renderer.fillCircle(b.x, b.y, BOMB_R, '#333');

    // Highlight
    renderer.fillCircle(b.x - 2, b.y - 2, BOMB_R * 0.5, 'rgba(255,255,255,0.15)');

    // Fuse line (short line from top of bomb going up-right)
    renderer.drawLine(
      b.x + 3, b.y - BOMB_R + 1,
      b.x + 5, b.y - BOMB_R - 10,
      '#888', 2
    );

    // Fuse spark/glow
    const sparkBrightness = 0.5 + Math.sin(b.fusePhase) * 0.5;
    const sparkG = Math.floor(100 + sparkBrightness * 155);
    renderer.setGlow('#fa0', sparkBrightness * 0.7);
    renderer.fillCircle(b.x + 5, b.y - BOMB_R - 10, 3, `rgba(255,${sparkG},0,${sparkBrightness})`);
    renderer.setGlow(null);
  }

  function drawBuckets(renderer) {
    const bucketColors = ['#f06', '#d05', '#b04'];

    for (let i = 0; i < buckets; i++) {
      const by = BUCKET_BOTTOM_Y - i * (BUCKET_H + BUCKET_GAP);
      const color = bucketColors[i] || '#f06';
      const bLeft = bucketX - BUCKET_W / 2;

      renderer.setGlow('#f06', 0.5);

      // Bucket shape - trapezoid via fillPoly
      renderer.fillPoly([
        { x: bLeft + 4, y: by },
        { x: bLeft + BUCKET_W - 4, y: by },
        { x: bLeft + BUCKET_W - 1, y: by + BUCKET_H },
        { x: bLeft + 1, y: by + BUCKET_H }
      ], color);

      // Bucket rim highlight
      renderer.fillRect(bLeft + 5, by, BUCKET_W - 10, 3, 'rgba(255,255,255,0.15)');

      // Bucket inner shadow
      renderer.fillRect(bLeft + 6, by + 4, BUCKET_W - 12, BUCKET_H - 6, 'rgba(0,0,0,0.3)');

      renderer.setGlow(null);
    }
  }

  game.start();
  return game;
}
