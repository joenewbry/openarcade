// mr-do/game.js — Mr. Do! game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 480;
const H = 480;

// Grid dimensions
const COLS = 15;
const ROWS = 15;
const CELL = W / COLS; // 32px

// Tile types
const DIRT = 0;
const EMPTY = 1;
const CHERRY = 2;
const APPLE = 3;
const BONUS = 4;

// Timing (frame counts at 60fps)
const MOVE_INTERVAL = 7;
const MONSTER_MOVE_INTERVAL = 12;

// ── State ──
let score, best = 0;
let lives, level;
let grid;
let player;
let monsters;
let powerBall;
let apples;
let cherryGroups;
let totalCherries, collectedCherries;
let totalMonsters, killedMonsters;
let bonusItem;
let bonusTimer;
let lastDir;
let moveTimer;
let monsterMoveTimer;
let levelCompleteTimer;
let ballReturnTimer;
let frameCount;

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');

// ── Cherry group placement ──
function getCherryGroupPositions(cols, rows) {
  const groups = [];
  const numGroups = 4 + Math.min(level, 3);
  const used = new Set();

  for (let g = 0; g < numGroups; g++) {
    let attempts = 0;
    while (attempts < 100) {
      const cx = 2 + Math.floor(Math.random() * (cols - 4));
      const cy = 2 + Math.floor(Math.random() * (rows - 4));
      const key = cx + ',' + cy;
      if (used.has(key)) { attempts++; continue; }

      const cells = [
        [cx, cy], [cx + 1, cy],
        [cx, cy + 1], [cx + 1, cy + 1]
      ];

      let valid = true;
      for (const [x, y] of cells) {
        const k = x + ',' + y;
        if (used.has(k) || x <= 0 || x >= cols - 1 || y <= 0 || y >= rows - 1) {
          valid = false;
          break;
        }
      }
      if (valid) {
        cells.forEach(([x, y]) => used.add(x + ',' + y));
        groups.push(cells);
        break;
      }
      attempts++;
    }
  }
  return groups;
}

// ── Level initialization ──
function initLevel() {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = DIRT;
    }
  }

  // Place cherries
  cherryGroups = getCherryGroupPositions(COLS, ROWS);
  totalCherries = 0;
  collectedCherries = 0;
  for (const group of cherryGroups) {
    for (const [cx, cy] of group) {
      grid[cy][cx] = CHERRY;
      totalCherries++;
    }
  }

  // Place apples (3-5)
  apples = [];
  const numApples = 3 + Math.min(level, 3);
  for (let i = 0; i < numApples; i++) {
    let ax, ay;
    let attempts = 0;
    do {
      ax = 1 + Math.floor(Math.random() * (COLS - 2));
      ay = 1 + Math.floor(Math.random() * (ROWS - 4));
      attempts++;
    } while ((grid[ay][ax] !== DIRT || (ax === Math.floor(COLS / 2) && ay === ROWS - 2)) && attempts < 100);

    if (attempts < 100) {
      grid[ay][ax] = APPLE;
      apples.push({ x: ax, y: ay, falling: false, fallSpeed: 0, settled: true, pixelY: ay * CELL });
    }
  }

  // Player starts at bottom center
  const px = Math.floor(COLS / 2);
  const py = ROWS - 2;
  player = { x: px, y: py, dir: { x: 0, y: -1 }, animFrame: 0 };
  grid[py][px] = EMPTY;
  grid[py - 1][px] = EMPTY;
  grid[py][px - 1] = EMPTY;
  grid[py][px + 1] = EMPTY;

  // Spawn monsters at top
  monsters = [];
  const numMonsters = 3 + Math.min(level * 2, 8);
  totalMonsters = numMonsters;
  killedMonsters = 0;
  for (let i = 0; i < numMonsters; i++) {
    const mx = 2 + Math.floor(Math.random() * (COLS - 4));
    const my = 1 + Math.floor(Math.random() * 3);
    grid[my][mx] = EMPTY;
    monsters.push({
      x: mx, y: my,
      alive: true,
      type: i < numMonsters / 2 ? 0 : 1,
      stunTimer: 0,
      color: i < numMonsters / 2 ? '#f55' : '#f0f'
    });
  }

  powerBall = null;
  ballReturnTimer = 0;
  bonusItem = null;
  bonusTimer = 300 + Math.floor(Math.random() * 300);
  moveTimer = 0;
  monsterMoveTimer = 0;
  levelCompleteTimer = 0;
  lastDir = { x: 0, y: -1 };
}

// ── Game ref (set in createGame) ──
let game;

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    if (score > best) {
      best = score;
      bestEl.textContent = best;
    }
    game.showOverlay('GAME OVER', `Score: ${score} -- Press any key to restart`);
    game.setState('over');
  } else {
    player.x = Math.floor(COLS / 2);
    player.y = ROWS - 2;
    grid[player.y][player.x] = EMPTY;
    powerBall = null;
    ballReturnTimer = 0;
    for (const m of monsters) {
      if (m.alive) m.stunTimer = 30;
    }
  }
}

function nextLevel() {
  level++;
  initLevel();
  levelCompleteTimer = 60;
}

function throwBall() {
  if (powerBall || ballReturnTimer > 0) return;
  powerBall = {
    x: player.x * CELL + CELL / 2,
    y: player.y * CELL + CELL / 2,
    dx: lastDir.x || 0,
    dy: lastDir.y || -1,
    bounces: 0
  };
  if (powerBall.dx === 0 && powerBall.dy === 0) {
    powerBall.dy = -1;
  }
  const mag = Math.hypot(powerBall.dx, powerBall.dy);
  powerBall.dx /= mag;
  powerBall.dy /= mag;
}

// ── Drawing helpers ──

function drawCherry(renderer, cx, cy) {
  // Two small red circles with glow
  renderer.setGlow('#f22', 0.4);
  renderer.fillCircle(cx - 4, cy + 2, 5, '#f22');
  renderer.fillCircle(cx + 4, cy + 2, 5, '#f22');
  renderer.setGlow(null);
  // Stem (curved line approximated with two line segments)
  renderer.drawLine(cx - 4, cy - 3, cx, cy - 10, '#0a0', 1.5);
  renderer.drawLine(cx, cy - 10, cx + 4, cy - 3, '#0a0', 1.5);
  // Highlight
  renderer.fillCircle(cx - 5, cy, 2, 'rgba(255,255,255,0.3)');
}

function drawApple(renderer, cx, cy) {
  const r = CELL / 2 - 2;
  renderer.setGlow('#2d2', 0.5);
  renderer.fillCircle(cx, cy, r, '#2d2');
  renderer.setGlow(null);
  // Stem
  renderer.drawLine(cx, cy - r, cx, cy - r - 5, '#841', 2);
  // Highlight
  renderer.fillCircle(cx - 4, cy - 4, 4, 'rgba(255,255,255,0.25)');
}

function drawBonus(renderer, cx, cy) {
  const pulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
  const alpha = Math.floor(pulse * 255).toString(16).padStart(2, '0');
  const color = '#ffff00' + alpha;
  renderer.setGlow('#ff0', 0.7);
  renderer.fillPoly([
    { x: cx, y: cy - 10 },
    { x: cx + 8, y: cy },
    { x: cx, y: cy + 10 },
    { x: cx - 8, y: cy }
  ], color);
  renderer.setGlow(null);
}

function drawMonster(renderer, cx, cy, monster) {
  const color = monster.color;

  // Body: ghost-like shape using polygon
  const halfW = CELL / 2 - 3;
  const topY = cy - 2 - halfW;
  const botY = cy + CELL / 2 - 4;
  const waveOff = (frameCount * 0.2) % (Math.PI * 2);
  const waveAmp = 3;

  // Build body polygon: semicircle top + wavy bottom
  const bodyPts = [];
  // Top arc (semicircle approximated with segments)
  for (let a = Math.PI; a >= 0; a -= Math.PI / 8) {
    bodyPts.push({
      x: cx + Math.cos(a) * halfW,
      y: cy - 2 + Math.sin(a) * (-halfW)
    });
  }
  // Wavy bottom
  for (let i = CELL - 6; i >= 0; i -= 4) {
    const wx = cx - CELL / 2 + 3 + i;
    const wy = botY + Math.sin(waveOff + i * 0.5) * waveAmp;
    bodyPts.push({ x: wx, y: wy });
  }

  renderer.setGlow(color, 0.5);
  renderer.fillPoly(bodyPts, color);
  renderer.setGlow(null);

  // Eyes
  renderer.fillCircle(cx - 4, cy - 4, 3, '#fff');
  renderer.fillCircle(cx + 4, cy - 4, 3, '#fff');
  // Pupils (look toward player)
  const pupilDx = (player.x * CELL + CELL / 2 - cx) > 0 ? 1 : -1;
  const pupilDy = (player.y * CELL + CELL / 2 - cy) > 0 ? 1 : -1;
  renderer.fillCircle(cx - 4 + pupilDx, cy - 4 + pupilDy, 1.5, '#111');
  renderer.fillCircle(cx + 4 + pupilDx, cy - 4 + pupilDy, 1.5, '#111');

  // Digger indicator (crown arc)
  if (monster.type === 1) {
    // Approximate arc with line segments
    const arcR = CELL / 2 - 1;
    for (let a = Math.PI; a > 0.2; a -= 0.3) {
      const x1 = cx + Math.cos(a) * arcR;
      const y1 = cy - 2 - Math.sin(a) * arcR;
      const a2 = a - 0.3;
      const x2 = cx + Math.cos(a2) * arcR;
      const y2 = cy - 2 - Math.sin(a2) * arcR;
      renderer.drawLine(x1, y1, x2, y2, '#ff0', 1);
    }
  }
}

function drawPlayer(renderer, cx, cy, isPlaying) {
  // Body (blue suit)
  renderer.setGlow('#44f', 0.5);
  renderer.fillCircle(cx, cy + 2, CELL / 2 - 4, '#44f');
  renderer.setGlow(null);

  // White face
  renderer.fillCircle(cx, cy - 3, 7, '#fff');

  // Red nose
  renderer.fillCircle(cx, cy - 2, 2.5, '#f22');

  // Eyes
  renderer.fillCircle(cx - 3, cy - 5, 1.5, '#111');
  renderer.fillCircle(cx + 3, cy - 5, 1.5, '#111');

  // Hat (red pointy hat) - triangle
  renderer.fillPoly([
    { x: cx - 7, y: cy - 9 },
    { x: cx, y: cy - 18 },
    { x: cx + 7, y: cy - 9 }
  ], '#f44');

  // Hat pom-pom
  renderer.fillCircle(cx, cy - 18, 2.5, '#fff');

  // Direction indicator
  if (isPlaying) {
    renderer.fillCircle(cx + lastDir.x * 8, cy + lastDir.y * 8 + 2, 2, 'rgba(255,170,68,0.4)');
  }
}

// ── Export ──

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    score = 0;
    lives = 3;
    level = 1;
    frameCount = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    initLevel();
    game.showOverlay('MR. DO!', 'Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
      }
      return;
    }

    if (game.state === 'over') {
      // Any key restarts
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown') ||
          input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight') || input.wasPressed('Enter')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──
    frameCount++;

    // Level complete timer
    if (levelCompleteTimer > 0) {
      levelCompleteTimer--;
      return;
    }

    // Throw ball on space
    if (input.wasPressed(' ')) {
      throwBall();
    }

    // Update lastDir immediately on key press for responsiveness
    if (input.wasPressed('ArrowLeft')) lastDir = { x: -1, y: 0 };
    if (input.wasPressed('ArrowRight')) lastDir = { x: 1, y: 0 };
    if (input.wasPressed('ArrowUp')) lastDir = { x: 0, y: -1 };
    if (input.wasPressed('ArrowDown')) lastDir = { x: 0, y: 1 };

    // Player movement (grid-based, on timer)
    moveTimer++;
    if (moveTimer >= MOVE_INTERVAL) {
      moveTimer = 0;
      let dx = 0, dy = 0;
      if (input.isDown('ArrowLeft')) { dx = -1; }
      else if (input.isDown('ArrowRight')) { dx = 1; }
      else if (input.isDown('ArrowUp')) { dy = -1; }
      else if (input.isDown('ArrowDown')) { dy = 1; }

      if (dx !== 0 || dy !== 0) {
        lastDir = { x: dx, y: dy };
        player.dir = { x: dx, y: dy };
        player.animFrame = (player.animFrame + 1) % 4;

        const nx = player.x + dx;
        const ny = player.y + dy;

        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          const tile = grid[ny][nx];

          if (tile === APPLE) {
            // Blocked by apple
          } else {
            if (tile === DIRT) {
              grid[ny][nx] = EMPTY;
            }

            if (tile === CHERRY) {
              grid[ny][nx] = EMPTY;
              score += 50;
              collectedCherries++;
              scoreEl.textContent = score;

              if (collectedCherries >= totalCherries) {
                score += 500;
                scoreEl.textContent = score;
                nextLevel();
                return;
              }
            }

            if (tile === BONUS) {
              grid[ny][nx] = EMPTY;
              score += 500;
              scoreEl.textContent = score;
              bonusItem = null;
            }

            player.x = nx;
            player.y = ny;
          }
        }
      }
    }

    // Update apples - check for unsupported apples
    for (const apple of apples) {
      if (!apple.settled) continue;
      const ax = apple.x;
      const ay = apple.y;
      if (ay + 1 < ROWS && grid[ay + 1][ax] === EMPTY) {
        if (grid[ay][ax] === APPLE) {
          apple.falling = true;
          apple.settled = false;
          apple.fallSpeed = 0;
          apple.pixelY = ay * CELL;
          grid[ay][ax] = EMPTY;
        }
      }
    }

    // Update falling apples
    for (let i = apples.length - 1; i >= 0; i--) {
      const apple = apples[i];
      if (!apple.falling) continue;

      apple.fallSpeed = Math.min(apple.fallSpeed + 0.5, 4);
      apple.pixelY += apple.fallSpeed;
      const newGridY = Math.floor(apple.pixelY / CELL);

      const nextY = newGridY + 1;
      if (nextY >= ROWS || (grid[nextY] && grid[nextY][apple.x] !== EMPTY)) {
        if (apple.fallSpeed > 2) {
          apples.splice(i, 1);
        } else {
          apple.y = newGridY;
          apple.pixelY = newGridY * CELL;
          apple.falling = false;
          apple.settled = true;
          apple.fallSpeed = 0;
          if (newGridY >= 0 && newGridY < ROWS) {
            grid[newGridY][apple.x] = APPLE;
          }
        }
        continue;
      }

      apple.y = newGridY;

      // Apple hits player
      if (apple.x === player.x && newGridY === player.y) {
        apples.splice(i, 1);
        loseLife();
        return;
      }

      // Apple hits monster
      for (let m = monsters.length - 1; m >= 0; m--) {
        if (!monsters[m].alive) continue;
        if (apple.x === monsters[m].x && newGridY === monsters[m].y) {
          monsters[m].alive = false;
          killedMonsters++;
          score += 300;
          scoreEl.textContent = score;
          apples.splice(i, 1);
          if (killedMonsters >= totalMonsters) {
            score += 1000;
            scoreEl.textContent = score;
            nextLevel();
            return;
          }
          break;
        }
      }
    }

    // Power ball movement
    if (powerBall) {
      powerBall.x += powerBall.dx * 3;
      powerBall.y += powerBall.dy * 3;

      // Bounce off walls
      if (powerBall.x <= 0 || powerBall.x >= W) {
        powerBall.dx *= -1;
        powerBall.x = Math.max(0, Math.min(W, powerBall.x));
        powerBall.bounces++;
      }
      if (powerBall.y <= 0 || powerBall.y >= H) {
        powerBall.dy *= -1;
        powerBall.y = Math.max(0, Math.min(H, powerBall.y));
        powerBall.bounces++;
      }

      // Check monster hits
      for (let m = monsters.length - 1; m >= 0; m--) {
        if (!monsters[m].alive) continue;
        const mx = monsters[m].x * CELL + CELL / 2;
        const my = monsters[m].y * CELL + CELL / 2;
        const dist = Math.hypot(powerBall.x - mx, powerBall.y - my);
        if (dist < CELL * 0.8) {
          monsters[m].alive = false;
          killedMonsters++;
          const killScore = [100, 200, 400, 800];
          score += killScore[Math.min(killedMonsters - 1, 3)];
          scoreEl.textContent = score;
          powerBall = null;
          ballReturnTimer = 120;

          if (killedMonsters >= totalMonsters) {
            score += 1000;
            scoreEl.textContent = score;
            nextLevel();
            return;
          }
          break;
        }
      }

      // Ball expires after too many bounces
      if (powerBall && powerBall.bounces > 8) {
        powerBall = null;
        ballReturnTimer = 120;
      }
    }

    // Ball return timer
    if (ballReturnTimer > 0) {
      ballReturnTimer--;
    }

    // Monster movement
    monsterMoveTimer++;
    const monsterSpeed = Math.max(6, MONSTER_MOVE_INTERVAL - level);
    if (monsterMoveTimer >= monsterSpeed) {
      monsterMoveTimer = 0;
      for (const monster of monsters) {
        if (!monster.alive) continue;
        if (monster.stunTimer > 0) {
          monster.stunTimer--;
          continue;
        }

        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const moves = [];
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

        for (const [mx, my] of dirs) {
          const nx = monster.x + mx;
          const ny = monster.y + my;
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;

          const tile = grid[ny][nx];
          if (tile === EMPTY || tile === CHERRY || tile === BONUS ||
              (monster.type === 1 && tile === DIRT)) {
            const distToPlayer = Math.abs(nx - player.x) + Math.abs(ny - player.y);
            moves.push({ x: mx, y: my, dist: distToPlayer, nx, ny });
          }
        }

        if (moves.length > 0) {
          moves.sort((a, b) => a.dist - b.dist);
          let chosen;
          if (Math.random() < 0.7) {
            chosen = moves[0];
          } else {
            chosen = moves[Math.floor(Math.random() * moves.length)];
          }

          if (monster.type === 1 && grid[chosen.ny][chosen.nx] === DIRT) {
            grid[chosen.ny][chosen.nx] = EMPTY;
          }

          if (grid[chosen.ny][chosen.nx] !== APPLE) {
            monster.x = chosen.nx;
            monster.y = chosen.ny;
          }
        }

        // Check collision with player
        if (monster.x === player.x && monster.y === player.y) {
          loseLife();
          return;
        }
      }
    }

    // Check player-monster collision every frame
    for (const monster of monsters) {
      if (!monster.alive) continue;
      if (monster.x === player.x && monster.y === player.y) {
        loseLife();
        return;
      }
    }

    // Bonus item spawn
    if (!bonusItem) {
      bonusTimer--;
      if (bonusTimer <= 0) {
        const bx = Math.floor(COLS / 2);
        const by = Math.floor(ROWS / 2);
        if (grid[by][bx] === EMPTY || grid[by][bx] === DIRT) {
          grid[by][bx] = BONUS;
          bonusItem = { x: bx, y: by, timer: 300 };
        }
        bonusTimer = 600 + Math.floor(Math.random() * 300);
      }
    } else {
      bonusItem.timer--;
      if (bonusItem.timer <= 0) {
        if (grid[bonusItem.y][bonusItem.x] === BONUS) {
          grid[bonusItem.y][bonusItem.x] = EMPTY;
        }
        bonusItem = null;
      }
    }

    // Update gameData for ML
    window.gameData = {
      playerX: player.x,
      playerY: player.y,
      monsters: monsters.filter(m => m.alive).map(m => ({ x: m.x, y: m.y })),
      cherries: collectedCherries + '/' + totalCherries,
      level: level,
      lives: lives
    };
  };

  game.onDraw = (renderer, text) => {
    // Draw grid
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = grid[y][x];
        const px = x * CELL;
        const py = y * CELL;

        if (tile === DIRT) {
          // Dirt - earthy brown
          renderer.fillRect(px, py, CELL, CELL, '#4a3728');
          // Texture dots
          const dotSeed = (x * 7 + y * 13) % 5;
          renderer.fillRect(px + 4 + dotSeed * 3, py + 4 + dotSeed * 2, 2, 2, '#5c4433');
          renderer.fillRect(px + 14 + dotSeed * 2, py + 12 + dotSeed, 2, 2, '#5c4433');
          renderer.fillRect(px + 8, py + 20 + dotSeed, 2, 2, '#5c4433');
          // Grid border (thin lines)
          renderer.drawLine(px, py, px + CELL, py, '#3a2a1c', 0.5);
          renderer.drawLine(px, py, px, py + CELL, '#3a2a1c', 0.5);
        } else if (tile === EMPTY) {
          renderer.fillRect(px, py, CELL, CELL, '#0d0d1a');
        } else if (tile === CHERRY) {
          renderer.fillRect(px, py, CELL, CELL, '#0d0d1a');
          drawCherry(renderer, px + CELL / 2, py + CELL / 2);
        } else if (tile === APPLE) {
          renderer.fillRect(px, py, CELL, CELL, '#4a3728');
        } else if (tile === BONUS) {
          renderer.fillRect(px, py, CELL, CELL, '#0d0d1a');
          drawBonus(renderer, px + CELL / 2, py + CELL / 2);
        }
      }
    }

    // Draw apples on top
    for (const apple of apples) {
      if (apple.falling) {
        drawApple(renderer, apple.x * CELL + CELL / 2, apple.pixelY + CELL / 2);
      } else if (apple.settled) {
        drawApple(renderer, apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2);
      }
    }

    // Draw monsters
    for (const monster of monsters) {
      if (!monster.alive) continue;
      drawMonster(renderer, monster.x * CELL + CELL / 2, monster.y * CELL + CELL / 2, monster);
    }

    // Draw player
    drawPlayer(renderer, player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, game.state === 'playing');

    // Draw power ball
    if (powerBall) {
      renderer.setGlow('#fa4', 0.8);
      renderer.fillCircle(powerBall.x, powerBall.y, 5, '#fff');
      renderer.setGlow(null);
      // Trail
      renderer.fillCircle(
        powerBall.x - powerBall.dx * 5,
        powerBall.y - powerBall.dy * 5,
        3,
        'rgba(255,170,68,0.3)'
      );
    }

    // Ball recharge indicator (arc approximated with small segments)
    if (!powerBall && ballReturnTimer > 0) {
      const pct = 1 - ballReturnTimer / 120;
      const centerX = player.x * CELL + CELL / 2;
      const centerY = player.y * CELL - 4;
      const arcR = 6;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * pct;
      const segments = Math.max(4, Math.floor(pct * 16));
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (endAngle - startAngle) * (i / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
        renderer.drawLine(
          centerX + Math.cos(a1) * arcR, centerY + Math.sin(a1) * arcR,
          centerX + Math.cos(a2) * arcR, centerY + Math.sin(a2) * arcR,
          'rgba(255,170,68,0.4)', 2
        );
      }
    }

    // Level info
    text.drawText('Lv.' + level, 4, 2, 12, '#fa4', 'left');

    // Cherries remaining
    const remaining = totalCherries - collectedCherries;
    text.drawText('Cherries: ' + remaining, W - 4, 2, 12, '#fa4', 'right');

    // Level complete flash
    if (levelCompleteTimer > 0) {
      const alpha = Math.floor((levelCompleteTimer / 60) * 0.6 * 255).toString(16).padStart(2, '0');
      renderer.fillRect(0, 0, W, H, '#ffaa44' + alpha);
      renderer.setGlow('#fa4', 0.8);
      text.drawText('LEVEL ' + level + '!', W / 2, H / 2 - 14, 28, '#fa4', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
