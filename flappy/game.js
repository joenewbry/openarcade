// flappy/game.js — Flappy Bird game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const PIPE_WIDTH = 60;
const GAP_START = 240;
const GAP_MIN = 130;
const PIPE_SPEED = 3;
const PIPE_SPACING = 200;
const BIRD_SIZE = 18;

let bird, pipes, score, best = 0, frameCount;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

export function createGame() {
  const game = new Game('game');

  function flap() {
    bird.vy = FLAP_FORCE;
  }

  game.onInit = () => {
    bird = { x: 80, y: H / 2, vy: 0, rotation: 0 };
    pipes = [];
    score = 0;
    frameCount = 0;
    scoreEl.textContent = '0';
    game.showOverlay('FLAPPY BIRD', 'Press Space or Up to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
        game.setState('playing');
        flap();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // Flap
    if (input.wasPressed(' ') || input.wasPressed('ArrowUp')) {
      flap();
    }

    frameCount++;

    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vy * 0.08));

    // Ceiling
    if (bird.y - BIRD_SIZE < 0) {
      bird.y = BIRD_SIZE;
      bird.vy = 0;
    }
    // Ground
    if (bird.y + BIRD_SIZE > H) {
      game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
      game.setState('over');
      return;
    }

    // Spawn pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < W - PIPE_SPACING) {
      const gap = Math.max(GAP_MIN, GAP_START - score * 5);
      const minTop = 80;
      const maxTop = H - gap - 80;
      const topH = minTop + Math.random() * (maxTop - minTop);
      pipes.push({ x: W, topH, gap, scored: false });
    }

    // Move pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      if (pipes[i].x + PIPE_WIDTH < 0) {
        pipes.splice(i, 1);
        continue;
      }

      // Score
      if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x - BIRD_SIZE) {
        pipes[i].scored = true;
        score++;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
        }
      }

      // Collision
      const p = pipes[i];
      if (bird.x + BIRD_SIZE > p.x && bird.x - BIRD_SIZE < p.x + PIPE_WIDTH) {
        if (bird.y - BIRD_SIZE < p.topH || bird.y + BIRD_SIZE > p.topH + p.gap) {
          game.showOverlay('GAME OVER', `Score: ${score} — Press any key to restart`);
          game.setState('over');
          return;
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Stars (static, decorative)
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 83) % W);
      const sy = ((i * 251 + 47) % (H - 100));
      renderer.fillRect(sx, sy, 2, 2, 'rgba(255,255,255,0.03)');
    }

    // Pipes
    pipes.forEach(p => {
      // Top pipe body
      renderer.fillRect(p.x, 0, PIPE_WIDTH, p.topH, '#2a7a2a');
      // Top pipe cap
      renderer.setGlow('#4aba4a', 0.2);
      renderer.fillRect(p.x - 4, p.topH - 20, PIPE_WIDTH + 8, 20, '#4aba4a');
      // Top pipe border
      renderer.drawLine(p.x - 4, p.topH - 20, p.x + PIPE_WIDTH + 4, p.topH - 20, '#1a5a1a', 2);
      renderer.drawLine(p.x - 4, p.topH, p.x + PIPE_WIDTH + 4, p.topH, '#1a5a1a', 2);

      // Bottom pipe body
      const botY = p.topH + p.gap;
      renderer.fillRect(p.x, botY, PIPE_WIDTH, H - botY, '#2a7a2a');
      // Bottom pipe cap
      renderer.fillRect(p.x - 4, botY, PIPE_WIDTH + 8, 20, '#4aba4a');
      renderer.drawLine(p.x - 4, botY, p.x + PIPE_WIDTH + 4, botY, '#1a5a1a', 2);
      renderer.drawLine(p.x - 4, botY + 20, p.x + PIPE_WIDTH + 4, botY + 20, '#1a5a1a', 2);
      renderer.setGlow(null);
    });

    // Bird — approximate rotation by shifting positions
    const bx = bird.x;
    const by = bird.y;
    const cos = Math.cos(bird.rotation);
    const sin = Math.sin(bird.rotation);

    // Body (circle)
    renderer.setGlow('#ff0', 0.7);
    renderer.fillCircle(bx, by, BIRD_SIZE, '#ff0');

    // Wing (small circle)
    const wingY = Math.sin(frameCount * 0.3) * 4;
    renderer.fillCircle(bx - 4, by + wingY, 7, '#ffa500');

    // Eye (white + black pupil)
    renderer.setGlow(null);
    renderer.fillCircle(bx + 8, by - 4, 5, '#fff');
    renderer.fillCircle(bx + 9, by - 4, 2.5, '#000');

    // Beak (triangle)
    renderer.fillPoly([
      { x: bx + BIRD_SIZE - 2, y: by - 3 },
      { x: bx + BIRD_SIZE + 10, y: by },
      { x: bx + BIRD_SIZE - 2, y: by + 4 }
    ], '#f80');

    // Ground line
    renderer.fillRect(0, H - 4, W, 4, '#2a5a2a');
  };

  game.start();
  return game;
}
