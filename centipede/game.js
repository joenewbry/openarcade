// centipede/game.js — Centipede game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 600;

// Grid constants
const CELL = 20;
const COLS = W / CELL;   // 24
const ROWS = H / CELL;   // 30
const PLAYER_ZONE_TOP = ROWS - 7; // player can move in bottom 7 rows

const PLAYER_SPEED = 4;
const BULLET_SPEED = 8;
const SHOT_COOLDOWN = 6; // frames between shots

// -- State --
let score, best = 0, lives;
let player, bullets, centipedes, mushrooms, spider, flea, particles;
let frameCount, lastShotFrame;
let level;
let fleaTimer, spiderTimer;

// -- DOM refs --
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 15 + Math.random() * 10,
      color
    });
  }
}

function placeMushrooms() {
  const count = 25 + level * 3;
  for (let i = 0; i < count; i++) {
    const r = 2 + Math.floor(Math.random() * (PLAYER_ZONE_TOP - 3));
    const c = Math.floor(Math.random() * COLS);
    if (mushrooms[r][c] === 0) {
      mushrooms[r][c] = 4;
    }
  }
}

function spawnCentipede() {
  const segCount = Math.min(12, 10 + Math.floor(level / 2));
  const segments = [];
  const startCol = Math.floor(Math.random() * (COLS - 4)) + 2;
  for (let i = 0; i < segCount; i++) {
    segments.push({
      x: (startCol - i) * CELL,
      y: 0,
      dir: 1,
      dropping: false,
      dropTarget: 0,
      head: i === 0
    });
  }
  centipedes.push(segments);
}

function resetLife() {
  player = { x: W / 2 - CELL / 2, y: H - CELL * 2 };
  bullets = [];
  particles = [];
  centipedes = [];
  spider = null;
  flea = null;
  frameCount = 0;
  lastShotFrame = -SHOT_COOLDOWN;
  fleaTimer = 200 + Math.floor(Math.random() * 200);
  spiderTimer = 150 + Math.floor(Math.random() * 150);
  spawnCentipede();
}

function moveCentipedeHead(s) {
  const col = Math.round(s.x / CELL);
  const row = Math.round(s.y / CELL);
  const nextCol = col + s.dir;

  let mustTurn = false;
  if (nextCol < 0 || nextCol >= COLS) {
    mustTurn = true;
  } else if (row >= 0 && row < ROWS && mushrooms[row][nextCol] > 0) {
    mustTurn = true;
  }

  if (mustTurn) {
    s.y += CELL;
    s.dir *= -1;
    if (s.y >= H) {
      s.y = 0;
    }
  } else {
    s.x += s.dir * CELL;
  }

  s.x = Math.round(s.x / CELL) * CELL;
  s.y = Math.round(s.y / CELL) * CELL;
}

export function createGame() {
  const game = new Game('game');

  function killPlayer() {
    lives--;
    livesEl.textContent = lives;
    spawnParticles(player.x + CELL / 2, player.y + CELL / 2, '#6f8', 15);

    if (lives <= 0) {
      gameOver();
    } else {
      player.x = W / 2 - CELL / 2;
      player.y = H - CELL * 2;
      bullets = [];
      spider = null;
      flea = null;
      spiderTimer = 150 + Math.floor(Math.random() * 150);
      fleaTimer = 200 + Math.floor(Math.random() * 200);

      // Repair damaged mushrooms
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (mushrooms[r][c] > 0 && mushrooms[r][c] < 4) {
            mushrooms[r][c] = 4;
            addScore(5);
          }
        }
      }

      centipedes = [];
      spawnCentipede();
    }
  }

  function gameOver() {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
  }

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    mushrooms = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    placeMushrooms();
    resetLife();
    game.showOverlay('CENTIPEDE', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') ||
          input.wasPressed('ArrowDown') || input.wasPressed('ArrowLeft') ||
          input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // -- Playing state --
    frameCount++;

    // Player movement
    if (input.isDown('ArrowLeft'))  player.x -= PLAYER_SPEED;
    if (input.isDown('ArrowRight')) player.x += PLAYER_SPEED;
    if (input.isDown('ArrowUp'))    player.y -= PLAYER_SPEED;
    if (input.isDown('ArrowDown'))  player.y += PLAYER_SPEED;

    // Clamp to bounds
    player.x = Math.max(0, Math.min(W - CELL, player.x));
    player.y = Math.max(PLAYER_ZONE_TOP * CELL, Math.min(H - CELL, player.y));

    // Auto-fire while space is held
    if (input.isDown(' ') && frameCount - lastShotFrame >= SHOT_COOLDOWN) {
      bullets.push({ x: player.x + CELL / 2, y: player.y });
      lastShotFrame = frameCount;
    }

    // -- Update bullets --
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) {
        bullets.splice(i, 1);
        continue;
      }

      const b = bullets[i];
      let bulletHit = false;

      // Bullet vs mushroom
      const mc = Math.floor(b.x / CELL);
      const mr = Math.floor(b.y / CELL);
      if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS && mushrooms[mr][mc] > 0) {
        mushrooms[mr][mc]--;
        if (mushrooms[mr][mc] === 0) {
          addScore(1);
        }
        bullets.splice(i, 1);
        spawnParticles(mc * CELL + CELL / 2, mr * CELL + CELL / 2, '#5a5', 3);
        continue;
      }

      // Bullet vs centipede segments
      for (let ci = centipedes.length - 1; ci >= 0; ci--) {
        const segs = centipedes[ci];
        for (let si = segs.length - 1; si >= 0; si--) {
          const s = segs[si];
          if (b.x >= s.x && b.x <= s.x + CELL &&
              b.y >= s.y && b.y <= s.y + CELL) {
            bulletHit = true;
            addScore(s.head ? 100 : 10);
            spawnParticles(s.x + CELL / 2, s.y + CELL / 2, s.head ? '#f44' : '#6f8', 8);

            // Leave mushroom where segment died
            const mr2 = Math.floor((s.y + CELL / 2) / CELL);
            const mc2 = Math.floor((s.x + CELL / 2) / CELL);
            if (mr2 >= 0 && mr2 < ROWS && mc2 >= 0 && mc2 < COLS) {
              mushrooms[mr2][mc2] = 4;
            }

            // Split centipede
            if (segs.length === 1) {
              centipedes.splice(ci, 1);
            } else {
              const before = segs.slice(0, si);
              const after = segs.slice(si + 1);
              centipedes.splice(ci, 1);
              if (before.length > 0) {
                centipedes.push(before);
              }
              if (after.length > 0) {
                after[0].head = true;
                centipedes.push(after);
              }
            }
            break;
          }
        }
        if (bulletHit) break;
      }
      if (bulletHit) {
        bullets.splice(i, 1);
        continue;
      }

      // Bullet vs spider
      if (spider) {
        if (b.x >= spider.x && b.x <= spider.x + CELL * 1.2 &&
            b.y >= spider.y && b.y <= spider.y + CELL * 1.2) {
          const dist = Math.abs(spider.y - player.y);
          const pts = dist < 60 ? 900 : dist < 150 ? 600 : 300;
          addScore(pts);
          spawnParticles(spider.x + CELL / 2, spider.y + CELL / 2, '#f0f', 10);
          spider = null;
          bullets.splice(i, 1);
          continue;
        }
      }

      // Bullet vs flea
      if (flea) {
        if (b.x >= flea.x && b.x <= flea.x + CELL &&
            b.y >= flea.y && b.y <= flea.y + CELL) {
          flea.hp--;
          if (flea.hp <= 0) {
            addScore(200);
            spawnParticles(flea.x + CELL / 2, flea.y + CELL / 2, '#ff0', 8);
            flea = null;
          }
          bullets.splice(i, 1);
          continue;
        }
      }
    }

    // -- Update centipedes (every 3 frames) --
    if (frameCount % 3 === 0) {
      for (const segs of centipedes) {
        const oldPos = segs.map(s => ({ x: s.x, y: s.y, dir: s.dir }));
        moveCentipedeHead(segs[0]);
        for (let si = 1; si < segs.length; si++) {
          segs[si].x = oldPos[si - 1].x;
          segs[si].y = oldPos[si - 1].y;
          segs[si].dir = oldPos[si - 1].dir;
        }
      }
    }

    // Centipede vs player
    for (const segs of centipedes) {
      for (const s of segs) {
        if (rectsOverlap(player.x, player.y, CELL, CELL, s.x, s.y, CELL, CELL)) {
          killPlayer();
          return;
        }
      }
    }

    // All centipedes dead -> next wave
    if (centipedes.length === 0) {
      level++;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (mushrooms[r][c] > 0 && mushrooms[r][c] < 4) {
            addScore(5);
            mushrooms[r][c] = 4;
          }
        }
      }
      spawnCentipede();
    }

    // -- Spider --
    spiderTimer--;
    if (!spider && spiderTimer <= 0) {
      const side = Math.random() < 0.5 ? 0 : W - CELL;
      spider = {
        x: side,
        y: PLAYER_ZONE_TOP * CELL + Math.random() * (H - PLAYER_ZONE_TOP * CELL - CELL * 2),
        vx: side === 0 ? 2 : -2,
        vy: 0,
        phase: Math.random() * Math.PI * 2
      };
    }
    if (spider) {
      spider.phase += 0.08;
      spider.x += spider.vx;
      spider.vy = Math.sin(spider.phase) * 3;
      spider.y += spider.vy;

      if (spider.y < (PLAYER_ZONE_TOP - 2) * CELL) spider.y = (PLAYER_ZONE_TOP - 2) * CELL;
      if (spider.y > H - CELL * 2) spider.y = H - CELL * 2;

      if (spider.x < -CELL * 2 || spider.x > W + CELL * 2) {
        spider = null;
        spiderTimer = 100 + Math.floor(Math.random() * 200);
      }

      if (spider) {
        const sc = Math.floor((spider.x + CELL / 2) / CELL);
        const sr = Math.floor((spider.y + CELL / 2) / CELL);
        if (sc >= 0 && sc < COLS && sr >= 0 && sr < ROWS && mushrooms[sr][sc] > 0) {
          mushrooms[sr][sc] = 0;
        }

        if (rectsOverlap(player.x, player.y, CELL, CELL,
                         spider.x, spider.y, CELL * 1.2, CELL * 1.2)) {
          killPlayer();
          return;
        }
      }
    }

    // -- Flea --
    fleaTimer--;
    if (!flea && fleaTimer <= 0) {
      let playerAreaMushrooms = 0;
      for (let r = PLAYER_ZONE_TOP; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (mushrooms[r][c] > 0) playerAreaMushrooms++;
        }
      }
      if (playerAreaMushrooms < 5) {
        flea = {
          x: Math.floor(Math.random() * COLS) * CELL,
          y: -CELL,
          hp: 2,
          speed: 3 + level * 0.3
        };
      }
      fleaTimer = 300 + Math.floor(Math.random() * 200);
    }
    if (flea) {
      flea.y += flea.speed;

      const fc = Math.floor((flea.x + CELL / 2) / CELL);
      const fr = Math.floor((flea.y + CELL / 2) / CELL);
      if (fr >= 0 && fr < ROWS && fc >= 0 && fc < COLS && mushrooms[fr][fc] === 0) {
        if (Math.random() < 0.3) {
          mushrooms[fr][fc] = 4;
        }
      }

      if (flea.y > H + CELL) {
        flea = null;
        fleaTimer = 200 + Math.floor(Math.random() * 300);
      }

      if (flea && rectsOverlap(player.x, player.y, CELL, CELL,
                                flea.x, flea.y, CELL, CELL)) {
        killPlayer();
        return;
      }
    }

    // -- Particles --
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].life--;
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  };

  game.onDraw = (renderer, text) => {
    // Subtle grid lines
    const gridColor = '#16213e';
    for (let x = 0; x <= W; x += CELL) {
      renderer.drawLine(x, 0, x, H, gridColor, 0.5);
    }
    for (let y = 0; y <= H; y += CELL) {
      renderer.drawLine(0, y, W, y, gridColor, 0.5);
    }

    // Player zone line
    renderer.drawLine(0, PLAYER_ZONE_TOP * CELL, W, PLAYER_ZONE_TOP * CELL, '#0f3460', 1);

    // -- Mushrooms --
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const hp = mushrooms[r][c];
        if (hp <= 0) continue;

        const x = c * CELL;
        const y = r * CELL;
        const frac = hp / 4;

        const green = Math.floor(100 + 155 * frac);
        const capColor = `rgb(${Math.floor(80 * frac)}, ${green}, ${Math.floor(60 * frac)})`;
        const stemColor = `rgb(${Math.floor(60 * frac)}, ${Math.floor(80 + 40 * frac)}, ${Math.floor(50 * frac)})`;
        const glowColor = `rgb(0, ${green}, 0)`;

        // Mushroom cap as filled polygon (dome approximation)
        const capH = CELL * 0.55 * frac + CELL * 0.2;
        const cx = x + CELL / 2;
        const baseY = y + CELL - CELL * 0.35;
        const rx = CELL * 0.45;

        // Approximate elliptical cap with polygon points
        renderer.setGlow(glowColor, 0.3);
        const capPts = [];
        const capSegments = 12;
        for (let s = 0; s <= capSegments; s++) {
          const t = Math.PI + (Math.PI * s / capSegments); // PI to 2*PI (bottom half flipped)
          capPts.push({x: cx + Math.cos(t) * rx, y: baseY + Math.sin(t) * capH});
        }
        renderer.fillPoly(capPts, capColor);

        // Stem
        renderer.fillRect(x + CELL * 0.35, y + CELL - CELL * 0.4, CELL * 0.3, CELL * 0.4, stemColor);
        renderer.setGlow(null);
      }
    }

    // -- Centipedes --
    for (const segs of centipedes) {
      // Draw connections between segments first (behind)
      if (segs.length > 1) {
        for (let i = 0; i < segs.length - 1; i++) {
          renderer.drawLine(
            segs[i].x + CELL / 2, segs[i].y + CELL / 2,
            segs[i + 1].x + CELL / 2, segs[i + 1].y + CELL / 2,
            '#4d6', 3
          );
        }
      }

      // Draw segments from tail to head
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        const cx = s.x + CELL / 2;
        const cy = s.y + CELL / 2;
        const r = CELL * 0.45;

        if (s.head) {
          // Head: brighter, larger
          renderer.setGlow('#f44', 0.7);
          renderer.fillCircle(cx, cy, r + 2, '#f44');

          // Eyes
          const eyeOffX = s.dir * 3;
          renderer.fillCircle(cx + eyeOffX - 3, cy - 3, 2.5, '#fff');
          renderer.fillCircle(cx + eyeOffX + 3, cy - 3, 2.5, '#fff');
          renderer.fillCircle(cx + eyeOffX - 3, cy - 3, 1.2, '#000');
          renderer.fillCircle(cx + eyeOffX + 3, cy - 3, 1.2, '#000');

          // Antennae
          renderer.setGlow(null);
          renderer.drawLine(cx - 4, cy - r, cx - 8, cy - r - 6, '#f44', 1.5);
          renderer.drawLine(cx + 4, cy - r, cx + 8, cy - r - 6, '#f44', 1.5);
        } else {
          // Body segment
          renderer.setGlow('#6f8', 0.4);
          renderer.fillCircle(cx, cy, r, '#6f8');

          // Segment detail - inner stripe
          renderer.fillCircle(cx, cy, r * 0.5, '#4d6');

          // Legs
          renderer.setGlow(null);
          const legAnim = Math.sin(frameCount * 0.15 + i) * 2;
          renderer.drawLine(cx - r, cy, cx - r - 3, cy + 4 + legAnim, '#4d6', 1);
          renderer.drawLine(cx + r, cy, cx + r + 3, cy + 4 - legAnim, '#4d6', 1);
        }
        renderer.setGlow(null);
      }
    }

    // -- Spider --
    if (spider) {
      const cx = spider.x + CELL * 0.6;
      const cy = spider.y + CELL * 0.6;
      const r = CELL * 0.55;

      renderer.setGlow('#f0f', 0.7);

      // Body (approximate ellipse with polygon)
      const bodyPts = [];
      for (let s = 0; s < 16; s++) {
        const t = (Math.PI * 2 * s) / 16;
        bodyPts.push({x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r * 0.7});
      }
      renderer.fillPoly(bodyPts, '#f0f');

      // Smaller head
      renderer.fillCircle(cx, cy - r * 0.5, r * 0.4, '#f0f');

      // Legs (4 pairs)
      renderer.setGlow(null);
      for (let side = -1; side <= 1; side += 2) {
        for (let j = 0; j < 4; j++) {
          const angle = (j * 0.4 + 0.3) * side;
          const legLen = r + 4 + Math.sin(frameCount * 0.2 + j * 1.5) * 3;
          const knee = r * 0.6;
          const kx = cx + Math.cos(angle) * knee * side;
          const ky = cy + Math.sin(angle + 0.5) * knee;
          const footX = cx + Math.cos(angle - 0.2) * legLen * side;
          const footY = cy + legLen * 0.4 + Math.sin(frameCount * 0.15 + j) * 2;
          renderer.drawLine(cx, cy, kx, ky, '#f0f', 1.5);
          renderer.drawLine(kx, ky, footX, footY, '#f0f', 1.5);
        }
      }

      // Eyes
      renderer.fillCircle(cx - 3, cy - r * 0.5 - 2, 2, '#fff');
      renderer.fillCircle(cx + 3, cy - r * 0.5 - 2, 2, '#fff');
      renderer.fillCircle(cx - 3, cy - r * 0.5 - 2, 1, '#f00');
      renderer.fillCircle(cx + 3, cy - r * 0.5 - 2, 1, '#f00');
    }

    // -- Flea --
    if (flea) {
      const cx = flea.x + CELL / 2;
      const cy = flea.y + CELL / 2;

      renderer.setGlow('#ff0', 0.6);

      // Body (approximate ellipse)
      const fleaPts = [];
      for (let s = 0; s < 12; s++) {
        const t = (Math.PI * 2 * s) / 12;
        fleaPts.push({x: cx + Math.cos(t) * CELL * 0.3, y: cy + Math.sin(t) * CELL * 0.4});
      }
      renderer.fillPoly(fleaPts, '#ff0');

      // Trail effect (smaller ellipse above)
      const trailPts = [];
      for (let s = 0; s < 8; s++) {
        const t = (Math.PI * 2 * s) / 8;
        trailPts.push({x: cx + Math.cos(t) * CELL * 0.15, y: (cy - CELL * 0.4) + Math.sin(t) * CELL * 0.25});
      }
      renderer.fillPoly(trailPts, '#660');

      // Eyes
      renderer.setGlow(null);
      renderer.fillCircle(cx - 3, cy - 3, 2, '#f00');
      renderer.fillCircle(cx + 3, cy - 3, 2, '#f00');
    }

    // -- Player --
    renderer.setGlow('#6f8', 0.7);

    // Ship body (arrow/triangle shape)
    const px = player.x;
    const py = player.y;
    renderer.fillPoly([
      {x: px + CELL / 2, y: py},
      {x: px + CELL, y: py + CELL},
      {x: px + CELL * 0.7, y: py + CELL * 0.75},
      {x: px + CELL * 0.3, y: py + CELL * 0.75},
      {x: px, y: py + CELL}
    ], '#6f8');

    // Gun barrel
    renderer.fillRect(px + CELL / 2 - 1.5, py - 4, 3, 6, '#6f8');
    renderer.setGlow(null);

    // -- Bullets --
    renderer.setGlow('#6f8', 0.4);
    for (const b of bullets) {
      renderer.fillRect(b.x - 1.5, b.y, 3, 8, '#fff');
    }
    renderer.setGlow(null);

    // -- Particles --
    for (const p of particles) {
      const alpha = Math.max(0, Math.min(1, p.life / 25));
      const pColor = alpha < 0.9 ? blendColor(p.color, alpha) : p.color;
      renderer.fillRect(p.x - 2, p.y - 2, 4, 4, pColor);
    }
  };

  game.start();
  return game;
}

// Helper to blend a color toward dark background based on alpha
function blendColor(hex, alpha) {
  // Parse common short hex colors
  let r, g, b;
  if (hex === '#6f8') { r = 0x66; g = 0xff; b = 0x88; }
  else if (hex === '#f44') { r = 0xff; g = 0x44; b = 0x44; }
  else if (hex === '#f0f') { r = 0xff; g = 0x00; b = 0xff; }
  else if (hex === '#ff0') { r = 0xff; g = 0xff; b = 0x00; }
  else if (hex === '#5a5') { r = 0x55; g = 0xaa; b = 0x55; }
  else if (hex === '#4d6') { r = 0x44; g = 0xdd; b = 0x66; }
  else { return hex; } // fallback

  // Blend with background (#1a1a2e)
  const bgR = 0x1a, bgG = 0x1a, bgB = 0x2e;
  const rr = Math.floor(bgR + (r - bgR) * alpha);
  const gg = Math.floor(bgG + (g - bgG) * alpha);
  const bb = Math.floor(bgB + (b - bgB) * alpha);

  return `rgb(${rr}, ${gg}, ${bb})`;
}
