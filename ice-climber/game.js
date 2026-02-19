// ice-climber/game.js — Ice Climber game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 400;
const H = 600;

// --- Constants ---
const TILE = 32;
const COLS = Math.floor(W / TILE);  // 12
const GRAVITY = 0.38;
const JUMP_VEL = -9.5;
const MOVE_SPEED = 3;
const PLAYER_W = 24;
const PLAYER_H = 28;
const BLOCK_W = TILE;
const BLOCK_H = TILE;

// Floor config
const FLOOR_GAP = 4;
const BLOCKS_PER_FLOOR = COLS;
const HOLE_MIN = 2;
const HOLE_MAX = 4;

// Enemy (Topi) config
const TOPI_W = 22;
const TOPI_H = 20;
const TOPI_SPEED = 1.2;

// Bonus fruit
const FRUIT_SIZE = 14;

// Mountain/level config
const FLOORS_PER_LEVEL = 8;
const SUMMIT_FLOOR = FLOORS_PER_LEVEL;

// Camera
const SCROLL_THRESHOLD = H * 0.35;

// ── State ──
let score, best;
let player, floors, enemies, fruits, particles;
let cameraY, level, floorsClimbed, topFloorGenerated;
let frameCount;
let bonusActive, bonusTimer;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

function getFloorY(floorIndex) {
  return (SUMMIT_FLOOR - floorIndex) * FLOOR_GAP * TILE;
}

function generateMountain() {
  floors = [];
  enemies = [];
  fruits = [];

  for (let f = 0; f <= SUMMIT_FLOOR; f++) {
    const floorY = getFloorY(f);
    const blocks = [];

    if (f === 0) {
      for (let c = 0; c < COLS; c++) {
        blocks.push({ x: c * TILE, y: floorY, alive: true, repairing: false, repairTimer: 0 });
      }
    } else if (f === SUMMIT_FLOOR) {
      for (let c = 0; c < COLS; c++) {
        blocks.push({ x: c * TILE, y: floorY, alive: true, summit: true, repairing: false, repairTimer: 0 });
      }
    } else {
      const holeWidth = HOLE_MIN + Math.floor(Math.random() * (HOLE_MAX - HOLE_MIN + 1));
      const holeStart = 1 + Math.floor(Math.random() * (COLS - holeWidth - 2));

      for (let c = 0; c < COLS; c++) {
        const isHole = c >= holeStart && c < holeStart + holeWidth;
        blocks.push({
          x: c * TILE,
          y: floorY,
          alive: !isHole,
          repairing: false,
          repairTimer: 0
        });
      }

      if (Math.random() < 0.5) {
        const fruitX = (holeStart + Math.floor(holeWidth / 2)) * TILE + TILE / 2 - FRUIT_SIZE / 2;
        fruits.push({
          x: fruitX,
          y: floorY - TILE - FRUIT_SIZE,
          collected: false,
          floor: f,
          type: Math.floor(Math.random() * 4)
        });
      }
    }

    if (f >= 2 && f < SUMMIT_FLOOR && Math.random() < 0.35 + level * 0.05) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      enemies.push({
        x: dir > 0 ? 0 : W - TOPI_W,
        y: floorY - TOPI_H,
        vx: TOPI_SPEED * dir * (1 + level * 0.1),
        floor: f,
        alive: true,
        repairing: false,
        repairTarget: null,
        repairCooldown: 0,
        frameOffset: Math.random() * 100
      });
    }

    floors.push({ y: floorY, blocks: blocks, index: f });
  }

  topFloorGenerated = SUMMIT_FLOOR;
  cameraY = getFloorY(0) - H + TILE * 2;
}

function updateScore(val) {
  score = val;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
}

function levelComplete(game) {
  const levelBonus = 500 * level;
  updateScore(score + levelBonus);

  for (let p = 0; p < 30; p++) {
    particles.push({
      x: player.x + PLAYER_W / 2,
      y: player.y,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 8 - 2,
      life: 50 + Math.random() * 30,
      size: 3 + Math.random() * 5,
      color: ['#8af', '#ff0', '#f44', '#0f0', '#f0f'][Math.floor(Math.random() * 5)]
    });
  }

  level++;
  generateMountain();

  player.x = W / 2 - PLAYER_W / 2;
  player.y = getFloorY(0) - PLAYER_H;
  player.vy = 0;
  player.vx = 0;
  player.onGround = true;
}

export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    score = 0;
    best = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = '0';

    player = {
      x: W / 2 - PLAYER_W / 2,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
      jumping: false,
      headHit: false,
      headHitTimer: 0,
      facingRight: true,
      hammerSwing: 0,
      lives: 3
    };

    floors = [];
    enemies = [];
    fruits = [];
    particles = [];
    cameraY = 0;
    level = 1;
    floorsClimbed = 0;
    topFloorGenerated = 0;
    frameCount = 0;
    bonusActive = false;
    bonusTimer = 0;

    generateMountain();

    player.x = W / 2 - PLAYER_W / 2;
    player.y = getFloorY(0) - PLAYER_H;
    player.onGround = true;

    game.showOverlay('ICE CLIMBER', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Player horizontal movement
    if (input.isDown('ArrowLeft') || input.isDown('a')) {
      player.vx = -MOVE_SPEED;
      player.facingRight = false;
    } else if (input.isDown('ArrowRight') || input.isDown('d')) {
      player.vx = MOVE_SPEED;
      player.facingRight = true;
    } else {
      player.vx = 0;
    }

    player.x += player.vx;

    // Wall collision - wrap around
    if (player.x + PLAYER_W < 0) player.x = W;
    if (player.x > W) player.x = -PLAYER_W;

    // Jump
    if ((input.isDown(' ') || input.isDown('ArrowUp') || input.isDown('w')) && player.onGround && !player.jumping) {
      player.vy = JUMP_VEL;
      player.onGround = false;
      player.jumping = true;
    }

    // Reset jump flag when key released
    if (!input.isDown(' ') && !input.isDown('ArrowUp') && !input.isDown('w')) {
      player.jumping = false;
    }

    // Gravity
    player.vy += GRAVITY;
    player.y += player.vy;

    // Hammer swing animation
    if (player.hammerSwing > 0) player.hammerSwing--;

    // Head hit animation
    if (player.headHitTimer > 0) player.headHitTimer--;

    // --- Collision with floors ---
    player.onGround = false;

    for (let fi = 0; fi < floors.length; fi++) {
      const floor = floors[fi];

      for (let bi = 0; bi < floor.blocks.length; bi++) {
        const block = floor.blocks[bi];
        if (!block.alive) continue;

        const bx = block.x;
        const by = block.y;

        // Player landing on top of block (falling down)
        if (player.vy >= 0) {
          const playerBottom = player.y + PLAYER_H;
          const prevBottom = playerBottom - player.vy;

          if (playerBottom >= by && prevBottom <= by + 4 &&
              player.x + PLAYER_W > bx + 2 && player.x < bx + BLOCK_W - 2) {
            player.y = by - PLAYER_H;
            player.vy = 0;
            player.onGround = true;
          }
        }

        // Player hitting block from below (jumping up)
        if (player.vy < 0) {
          const playerTop = player.y;
          const prevTop = playerTop - player.vy;

          if (playerTop <= by + BLOCK_H && prevTop >= by + BLOCK_H - 4 &&
              player.x + PLAYER_W > bx + 2 && player.x < bx + BLOCK_W - 2) {

            if (!block.summit) {
              // Break the ice block!
              block.alive = false;
              player.headHit = true;
              player.headHitTimer = 8;
              player.hammerSwing = 10;

              updateScore(score + 10);

              // Spawn ice particles
              for (let p = 0; p < 6; p++) {
                particles.push({
                  x: bx + BLOCK_W / 2 + (Math.random() - 0.5) * BLOCK_W,
                  y: by + BLOCK_H / 2,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 4 - 1,
                  life: 30 + Math.random() * 20,
                  size: 3 + Math.random() * 4
                });
              }

              // Check if any enemy was standing on this block
              for (let ei = 0; ei < enemies.length; ei++) {
                const enemy = enemies[ei];
                if (!enemy.alive) continue;
                const enemyBottom = enemy.y + TOPI_H;
                if (Math.abs(enemyBottom - by) < 4 &&
                    enemy.x + TOPI_W > bx && enemy.x < bx + BLOCK_W) {
                  enemy.alive = false;
                  updateScore(score + 50);

                  for (let p = 0; p < 8; p++) {
                    particles.push({
                      x: enemy.x + TOPI_W / 2,
                      y: enemy.y + TOPI_H / 2,
                      vx: (Math.random() - 0.5) * 6,
                      vy: -Math.random() * 5 - 2,
                      life: 25 + Math.random() * 15,
                      size: 3 + Math.random() * 3,
                      color: '#f66'
                    });
                  }
                }
              }
            } else {
              // Bonk on summit
              player.vy = 0;
              player.y = by + BLOCK_H;
            }
          }
        }
      }
    }

    // Fruit collection
    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      if (fruit.collected) continue;

      if (player.x + PLAYER_W > fruit.x &&
          player.x < fruit.x + FRUIT_SIZE &&
          player.y + PLAYER_H > fruit.y &&
          player.y < fruit.y + FRUIT_SIZE) {
        fruit.collected = true;
        updateScore(score + 100);

        for (let p = 0; p < 10; p++) {
          particles.push({
            x: fruit.x + FRUIT_SIZE / 2,
            y: fruit.y + FRUIT_SIZE / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 20 + Math.random() * 15,
            size: 2 + Math.random() * 3,
            color: '#ff0'
          });
        }
      }
    }

    // --- Enemy (Topi) AI ---
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive) continue;

      const floor = floors.find(f => f.index === enemy.floor);
      if (!floor) continue;

      let targetBlock = null;
      if (enemy.repairCooldown > 0) {
        enemy.repairCooldown--;
      } else {
        for (let bi = 0; bi < floor.blocks.length; bi++) {
          if (!floor.blocks[bi].alive && !floor.blocks[bi].summit) {
            targetBlock = floor.blocks[bi];
            break;
          }
        }
      }

      if (targetBlock && !enemy.repairing) {
        const targetX = targetBlock.x + BLOCK_W / 2 - TOPI_W / 2;
        if (Math.abs(enemy.x - targetX) < 3) {
          enemy.repairing = true;
          enemy.repairTarget = targetBlock;
          targetBlock.repairing = true;
          targetBlock.repairTimer = 60;
        } else {
          enemy.x += (targetX > enemy.x ? 1 : -1) * Math.abs(enemy.vx);
        }
      } else if (enemy.repairing && enemy.repairTarget) {
        enemy.repairTarget.repairTimer--;
        if (enemy.repairTarget.repairTimer <= 0) {
          enemy.repairTarget.alive = true;
          enemy.repairTarget.repairing = false;
          enemy.repairing = false;
          enemy.repairTarget = null;
          enemy.repairCooldown = 120;
        }
      } else {
        enemy.x += enemy.vx;
        if (enemy.x <= 0) { enemy.x = 0; enemy.vx = Math.abs(enemy.vx); }
        if (enemy.x + TOPI_W >= W) { enemy.x = W - TOPI_W; enemy.vx = -Math.abs(enemy.vx); }
      }

      // Check if enemy touches player
      if (player.x + PLAYER_W > enemy.x + 3 &&
          player.x < enemy.x + TOPI_W - 3 &&
          player.y + PLAYER_H > enemy.y + 3 &&
          player.y < enemy.y + TOPI_H - 3) {

        if (player.vy > 0 && player.y + PLAYER_H < enemy.y + TOPI_H / 2) {
          enemy.alive = false;
          player.vy = JUMP_VEL * 0.7;
          updateScore(score + 100);

          for (let p = 0; p < 8; p++) {
            particles.push({
              x: enemy.x + TOPI_W / 2,
              y: enemy.y + TOPI_H / 2,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 5 - 2,
              life: 25 + Math.random() * 15,
              size: 3 + Math.random() * 3,
              color: '#f66'
            });
          }
        } else {
          // Player gets hit — die
          game.showOverlay('GAME OVER', `Score: ${score} | Level: ${level} -- Press any key to restart`);
          game.setState('over');
          return;
        }
      }
    }

    // --- Camera scrolling ---
    const playerScreenY = player.y - cameraY;
    if (playerScreenY < SCROLL_THRESHOLD) {
      cameraY = player.y - SCROLL_THRESHOLD;
    }

    // --- Check if player reached the summit ---
    const summitY = getFloorY(SUMMIT_FLOOR);
    if (player.y < summitY - PLAYER_H + 5 && player.onGround) {
      levelComplete(game);
      return;
    }

    // --- Fall death ---
    if (player.y - cameraY > H + PLAYER_H * 2) {
      game.showOverlay('GAME OVER', `Score: ${score} | Level: ${level} -- Press any key to restart`);
      game.setState('over');
      return;
    }

    // --- Update particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      playerVY: player.vy,
      onGround: player.onGround,
      cameraY: cameraY,
      level: level,
      enemyCount: enemies.filter(e => e.alive).length
    };
  };

  game.onDraw = (renderer, text) => {
    // --- Sky background ---
    // The engine clears with the bg color from begin(), so we draw a gradient manually
    // with overlapping rects to simulate the cold sky gradient
    const heightRatio = Math.min(Math.max(-cameraY / (SUMMIT_FLOOR * FLOOR_GAP * TILE), 0), 1);

    // Draw gradient background as bands
    const BANDS = 12;
    for (let i = 0; i < BANDS; i++) {
      const t = i / BANDS;
      const r1 = Math.round(26 - heightRatio * 10);
      const g1 = Math.round(26 - heightRatio * 10);
      const b1 = Math.round(46 + heightRatio * 20);
      const r2 = Math.round(15 - heightRatio * 5);
      const g2 = Math.round(15 + heightRatio * 5);
      const b2 = Math.round(35 + heightRatio * 30);
      const r = Math.round(r2 + (r1 - r2) * t);
      const g = Math.round(g2 + (g1 - g2) * t);
      const b = Math.round(b2 + (b1 - b2) * t);
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      renderer.fillRect(0, Math.floor(t * H), W, Math.ceil(H / BANDS) + 1, hex);
    }

    // Snowflakes in background
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97 + frameCount * 0.3 * ((i % 3) + 1)) % (W + 20)) - 10;
      const sy = ((i * 131 + frameCount * 0.5 * ((i % 2) + 1) - cameraY * 0.1) % (H + 20)) - 10;
      const ss = 1 + (i % 3);
      renderer.fillRect(sx, sy, ss, ss, 'rgba(200,220,255,0.15)');
    }

    // Mountain outline in background (using drawLine)
    const mtnColor = 'rgba(136,170,255,0.08)';
    const mtnPts = [
      { x: 0, y: H },
      { x: W * 0.15, y: H * 0.5 - cameraY * 0.02 },
      { x: W * 0.35, y: H * 0.7 - cameraY * 0.015 },
      { x: W * 0.5, y: H * 0.3 - cameraY * 0.025 },
      { x: W * 0.7, y: H * 0.6 - cameraY * 0.02 },
      { x: W * 0.85, y: H * 0.35 - cameraY * 0.025 },
      { x: W, y: H }
    ];
    renderer.strokePoly(mtnPts, mtnColor, 2, false);

    // --- Draw floors / ice blocks ---
    for (let fi = 0; fi < floors.length; fi++) {
      const floor = floors[fi];

      for (let bi = 0; bi < floor.blocks.length; bi++) {
        const block = floor.blocks[bi];
        const drawX = block.x;
        const drawY = block.y - cameraY;

        if (drawY < -TILE * 2 || drawY > H + TILE) continue;

        if (block.alive) {
          if (block.summit) {
            // Summit blocks - golden/warm
            renderer.setGlow('#fd6', 0.5);
            renderer.fillRect(drawX, drawY, BLOCK_W, BLOCK_H, '#da4');
            renderer.setGlow(null);

            // Shiny highlight
            renderer.fillRect(drawX + 2, drawY + 2, BLOCK_W - 4, 4, '#fe8');

            // Flag on middle summit block
            if (bi === Math.floor(COLS / 2)) {
              // Flag pole
              renderer.fillRect(drawX + BLOCK_W / 2 - 1, drawY - 24, 2, 24, '#f44');
              // Flag triangle
              renderer.setGlow('#f44', 0.4);
              renderer.fillPoly([
                { x: drawX + BLOCK_W / 2 + 1, y: drawY - 24 },
                { x: drawX + BLOCK_W / 2 + 14, y: drawY - 18 },
                { x: drawX + BLOCK_W / 2 + 1, y: drawY - 12 }
              ], '#f44');
              renderer.setGlow(null);
            }
          } else if (floor.index === 0) {
            // Ground floor - solid rock/ice
            renderer.fillRect(drawX, drawY, BLOCK_W, BLOCK_H, '#445');
            renderer.fillRect(drawX + 1, drawY + 1, BLOCK_W - 2, 3, '#556');
            // Ground texture line
            renderer.drawLine(drawX + BLOCK_W * 0.3, drawY, drawX + BLOCK_W * 0.3, drawY + BLOCK_H, '#334', 1);
          } else {
            // Normal ice blocks
            renderer.setGlow('#8af', 0.3);
            renderer.fillRect(drawX, drawY, BLOCK_W, BLOCK_H, '#68c');
            renderer.setGlow(null);

            // Ice highlight/sheen
            renderer.fillRect(drawX + 2, drawY + 2, BLOCK_W - 4, 5, 'rgba(170,210,255,0.4)');

            // Ice crack detail
            const crackPts = [
              { x: drawX + BLOCK_W * 0.2, y: drawY + BLOCK_H * 0.4 },
              { x: drawX + BLOCK_W * 0.5, y: drawY + BLOCK_H * 0.6 },
              { x: drawX + BLOCK_W * 0.8, y: drawY + BLOCK_H * 0.3 }
            ];
            renderer.strokePoly(crackPts, 'rgba(100,140,200,0.5)', 1, false);
          }
        } else if (block.repairing) {
          // Block being repaired - show ghost outline (dashed rect approximation)
          const brdColor = 'rgba(136,170,255,0.4)';
          // Top
          renderer.dashedLine(drawX + 2, drawY + 2, drawX + BLOCK_W - 2, drawY + 2, brdColor, 2, 4, 4);
          // Bottom
          renderer.dashedLine(drawX + 2, drawY + BLOCK_H - 2, drawX + BLOCK_W - 2, drawY + BLOCK_H - 2, brdColor, 2, 4, 4);
          // Left
          renderer.dashedLine(drawX + 2, drawY + 2, drawX + 2, drawY + BLOCK_H - 2, brdColor, 2, 4, 4);
          // Right
          renderer.dashedLine(drawX + BLOCK_W - 2, drawY + 2, drawX + BLOCK_W - 2, drawY + BLOCK_H - 2, brdColor, 2, 4, 4);

          // Fill progress
          const progress = 1 - (block.repairTimer / 60);
          renderer.fillRect(drawX, drawY + BLOCK_H * (1 - progress), BLOCK_W, BLOCK_H * progress, 'rgba(100,140,200,0.3)');
        }
      }
    }

    // --- Draw fruits ---
    for (let i = 0; i < fruits.length; i++) {
      const fruit = fruits[i];
      if (fruit.collected) continue;

      const fx = fruit.x;
      const fy = fruit.y - cameraY;
      if (fy < -20 || fy > H + 20) continue;

      renderer.setGlow('#ff0', 0.4);

      const bobY = fy + Math.sin(frameCount * 0.06 + fruit.floor) * 3;

      switch (fruit.type) {
        case 0: // eggplant (purple) - ellipse as circle
          renderer.fillCircle(fx + FRUIT_SIZE / 2, bobY + FRUIT_SIZE / 2, FRUIT_SIZE / 2, '#a4f');
          renderer.fillRect(fx + FRUIT_SIZE / 2 - 2, bobY - 2, 4, 4, '#4a2');
          break;
        case 1: // carrot (orange) - triangle
          renderer.fillPoly([
            { x: fx + FRUIT_SIZE / 2, y: bobY + FRUIT_SIZE },
            { x: fx, y: bobY + 2 },
            { x: fx + FRUIT_SIZE, y: bobY + 2 }
          ], '#f80');
          renderer.fillRect(fx + FRUIT_SIZE / 2 - 3, bobY - 2, 6, 4, '#4a2');
          break;
        case 2: // cabbage (green) - circles
          renderer.fillCircle(fx + FRUIT_SIZE / 2, bobY + FRUIT_SIZE / 2, FRUIT_SIZE / 2, '#4c4');
          renderer.fillCircle(fx + FRUIT_SIZE / 2, bobY + FRUIT_SIZE / 2, FRUIT_SIZE / 3, '#6e6');
          break;
        case 3: // mushroom (red) - half circle cap + stem
          // Cap as full circle (top half visible above stem)
          renderer.fillCircle(fx + FRUIT_SIZE / 2, bobY + 4, FRUIT_SIZE / 2, '#f44');
          // Stem
          renderer.fillRect(fx + FRUIT_SIZE / 2 - 3, bobY + 4, 6, FRUIT_SIZE - 5, '#edc');
          // White dots on cap
          renderer.fillCircle(fx + FRUIT_SIZE / 2 - 2, bobY + 2, 2, '#fff');
          renderer.fillCircle(fx + FRUIT_SIZE / 2 + 3, bobY + 1, 1.5, '#fff');
          break;
      }
      renderer.setGlow(null);
    }

    // --- Draw enemies (Topi) ---
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.alive) continue;

      const ex = enemy.x;
      const ey = enemy.y - cameraY;
      if (ey < -30 || ey > H + 30) continue;

      const facing = enemy.vx >= 0 ? 1 : -1;

      // Body (seal/walrus shape) - ellipse as circle
      renderer.setGlow('#c4a', 0.4);
      renderer.fillCircle(ex + TOPI_W / 2, ey + TOPI_H / 2 + 2, TOPI_W / 2, '#c4a');
      renderer.setGlow(null);

      // Lighter belly
      renderer.fillCircle(ex + TOPI_W / 2, ey + TOPI_H / 2 + 4, TOPI_W / 3, '#d6c');

      // Eyes
      renderer.fillCircle(ex + TOPI_W / 2 + facing * 4, ey + TOPI_H / 3, 3, '#fff');
      renderer.fillCircle(ex + TOPI_W / 2 + facing * 5, ey + TOPI_H / 3, 1.5, '#111');

      // Little legs walking animation
      const walkPhase = Math.sin((frameCount + enemy.frameOffset) * 0.15);
      renderer.fillRect(ex + TOPI_W / 2 - 6 + walkPhase * 2, ey + TOPI_H - 4, 4, 4, '#a38');
      renderer.fillRect(ex + TOPI_W / 2 + 2 - walkPhase * 2, ey + TOPI_H - 4, 4, 4, '#a38');

      // Repair indicator
      if (enemy.repairing) {
        text.drawText('\u2692', ex + TOPI_W / 2, ey - 8, 10, '#ff0', 'center');
      }
    }

    // --- Draw player ---
    const px = player.x;
    const py = player.y - cameraY;
    const dir = player.facingRight ? 1 : -1;

    // For the mirrored player, we compute positions manually.
    // Center reference:
    const cx = px + PLAYER_W / 2;
    const cy = py + PLAYER_H / 2;

    // Parka body (rounded rect approximation as plain rect)
    renderer.setGlow('#8af', 0.6);
    renderer.fillRect(cx - PLAYER_W / 2, cy - PLAYER_H / 2 + 6, PLAYER_W, PLAYER_H - 8, '#48f');
    renderer.setGlow(null);

    // Parka highlight
    renderer.fillRect(cx - PLAYER_W / 2 + 2, cy - PLAYER_H / 2 + 7, PLAYER_W - 4, 5, '#6af');

    // Head
    renderer.fillCircle(cx, cy - PLAYER_H / 2 + 4, 8, '#fdb');

    // Hood/hat (top half of head)
    renderer.fillCircle(cx, cy - PLAYER_H / 2 + 1, 9, '#48f');
    // Cover bottom half of hood circle
    renderer.fillCircle(cx, cy - PLAYER_H / 2 + 4, 8, '#fdb');

    // Eyes
    renderer.fillCircle(cx + dir * 2, cy - PLAYER_H / 2 + 4, 1.5, '#111');

    // Hammer
    const hammerAngle = player.hammerSwing > 0 ? -0.5 - player.hammerSwing * 0.1 : -0.3;
    // Simplified hammer: handle + head drawn as rects, offset by facing direction
    const hBaseX = cx + dir * (PLAYER_W / 2 - 4);
    const hBaseY = cy - 2;

    // Handle
    renderer.fillRect(
      dir > 0 ? hBaseX : hBaseX - 14,
      hBaseY - 2, 14, 3, '#a73'
    );

    // Hammer head
    renderer.setGlow('#8af', 0.3);
    renderer.fillRect(
      dir > 0 ? hBaseX + 11 : hBaseX - 18,
      hBaseY - 5, 7, 9, '#ccc'
    );
    renderer.setGlow(null);

    // Feet
    const walkAnim = player.onGround ? Math.sin(frameCount * 0.15) * (Math.abs(player.vx) > 0 ? 3 : 0) : 0;
    renderer.fillRect(cx - PLAYER_W / 2 + 2, cy + PLAYER_H / 2 - 4 + walkAnim, 8, 4, '#335');
    renderer.fillRect(cx + PLAYER_W / 2 - 10, cy + PLAYER_H / 2 - 4 - walkAnim, 8, 4, '#335');

    // --- Draw particles ---
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const alpha = Math.min(1, p.life / 15);
      const color = p.color || '#8af';
      // Approximate alpha by using the color with reduced alpha
      // Parse color to hex and append alpha
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      let hexColor;
      if (color.length === 4) {
        // #rgb -> #rrggbb
        hexColor = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + a;
      } else if (color.length === 7) {
        hexColor = color + a;
      } else {
        hexColor = color;
      }
      renderer.setGlow(color, 0.3);
      renderer.fillRect(p.x, p.y - cameraY, p.size, p.size, hexColor);
    }
    renderer.setGlow(null);

    // --- HUD ---
    if (game.state === 'playing') {
      text.drawText(`Mt. ${level}`, 8, 8, 14, '#8af', 'left');

      // Height meter on right side
      const totalHeight = SUMMIT_FLOOR * FLOOR_GAP * TILE;
      const currentHeight = Math.max(0, getFloorY(0) - player.y);
      const progress = Math.min(currentHeight / totalHeight, 1);

      // Track bar
      renderer.fillRect(W - 8, 30, 5, H - 60, 'rgba(136,170,255,0.15)');

      // Progress fill
      const barH = H - 60;
      const fillH = progress * barH;
      renderer.setGlow('#8af', 0.4);
      renderer.fillRect(W - 8, 30 + barH - fillH, 5, fillH, '#8af');
      renderer.setGlow(null);

      // Summit marker
      renderer.fillRect(W - 10, 28, 9, 3, '#fd6');

      // Player marker (triangle as small rect)
      const markerY = 30 + barH - fillH;
      renderer.fillPoly([
        { x: W - 14, y: markerY },
        { x: W - 10, y: markerY - 3 },
        { x: W - 10, y: markerY + 3 }
      ], '#fff');
    }
  };

  game.start();
  return game;
}
