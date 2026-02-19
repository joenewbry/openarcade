// lode-runner/game.js — Lode Runner game logic as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 500;
const H = 400;

const COLS = 25;
const ROWS = 16;
const TW = W / COLS;   // 20
const TH = H / ROWS;   // 25

const EMPTY = 0, BRICK = 1, LADDER = 2, BAR = 3, GOLD = 4, SOLID = 5, ESCAPE_LADDER = 6;

const PLAYER_SPEED = 100;
const GUARD_SPEED = 70;
const HOLE_DURATION = 4000;
const HOLE_DIG_TIME = 300;
const GUARD_TRAPPED_TIME = 3000;

// Fixed-step dt in seconds (engine runs at 60Hz, dt = 16.667ms)
const FIXED_DT_S = 1 / 60;

// ── State ──
let score, best = 0, level, lives;
let grid, player, guards, goldCount, totalGold;
let holes, escapeLadderShown;
let respawnTimer;
let digConsumed;  // track Z/X single-press per keydown

// ── DOM refs ──
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

// ── Level data ──
function L(s) { return (s + '.........................').slice(0, 25); }

const LEVELS = [
  // Level 1: 1 guard, 7 gold
  [
    L('.........................'),
    L('.........................'),
    L('.........................'),
    L('..G........G.......G....'),
    L('#####H###########H#####'),
    L('.....H...........H.....'),
    L('.....H..G........H.....'),
    L('.....H########...H.....'),
    L('..G..H.......H...H.....'),
    L('#####H.......H...H.G...'),
    L('.....H.......H###H####.'),
    L('.....H..G....H...H.....'),
    L('..P..H.......H.E.H.....'),
    L('#####H#######H###H####.'),
    L('.....H...........H.....'),
    L('SSSSSSSSSSSSSSSSSSSSSSSSS')
  ],
  // Level 2: 2 guards, 8 gold
  [
    L('.........................'),
    L('.........................'),
    L('.G.......G..........G...'),
    L('##H####----###H###--#H.'),
    L('..H............H.....H.'),
    L('..H.G..........H.G...H.'),
    L('..H#####.E..####H.##.H.'),
    L('..H.....######.......H.'),
    L('..H.G................H.'),
    L('..H####..###H####.##.H.'),
    L('..H..........H.......H.'),
    L('..H...G......H..G....H.'),
    L('..HP..####...H..###E.H.'),
    L('..H#########.H######.H.'),
    L('..H..........H.......H.'),
    L('SSSSSSSSSSSSSSSSSSSSSSSSS')
  ],
  // Level 3: 2 guards, 9 gold
  [
    L('.........................'),
    L('..G..........G..........'),
    L('#####H####..###H########'),
    L('.....H.........H.......'),
    L('.....H.G.......H.......'),
    L('..####H######..H.......'),
    L('..G...H.E......H..G....'),
    L('..#####..####..H.####..'),
    L('..........H....H.H.....'),
    L('...G......H....H.H.G...'),
    L('..######..H#####.H####.'),
    L('..........H......H.....'),
    L('..E.G.....H.P....H.G...'),
    L('..######..H.####.H####.'),
    L('..........H......H.....'),
    L('SSSSSSSSSSSSSSSSSSSSSSSSS')
  ],
  // Level 4: 3 guards, 9 gold
  [
    L('.........................'),
    L('.G..G...G...G....G......'),
    L('##H###H#####H####H####.'),
    L('..H...H.....H....H.....'),
    L('..H---H-----H----H----.'),
    L('..H...H.....H....H.....'),
    L('..H.G.H.....H.G..H.....'),
    L('##H##.H..##.H..#H####..'),
    L('..H...H..E..H...H..G...'),
    L('..H---H-----H---H.###..'),
    L('..H...H.....H...H......'),
    L('.EH...H..G..H...H..E...'),
    L('##H.##H####.H###H.##...'),
    L('..H...H..P..H...H......'),
    L('..H...H.....H...H......'),
    L('SSSSSSSSSSSSSSSSSSSSSSSSS')
  ],
  // Level 5: 4 guards, 15 gold
  [
    L('.........................'),
    L('.G.G.G.G.G..G.G.G.G.G..'),
    L('##H####H####H####H####.'),
    L('..H....H.E..H....H.....'),
    L('..H----H----H----H----.'),
    L('..H....H....H....H.....'),
    L('##H.#..H..#.H..#.H.##..'),
    L('..H.G..H..G.H..G.H.G...'),
    L('..H-#--H--#-H--#-H-#...'),
    L('..H....H....H....H.....'),
    L('##H.E..H.##.H.E..H####.'),
    L('..H....H....H....H.....'),
    L('..H.P.....E.H....H.....'),
    L('##H########.H####H####.'),
    L('..H.........H....H.....'),
    L('SSSSSSSSSSSSSSSSSSSSSSSSS')
  ]
];

function parseLevel(idx) {
  const data = LEVELS[idx];
  grid = [];
  guards = [];
  goldCount = 0;
  totalGold = 0;
  holes = [];
  escapeLadderShown = false;
  player = null;
  respawnTimer = 0;
  digConsumed = { z: false, x: false };

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = (data[r] && data[r][c]) || '.';
      switch (ch) {
        case '#': grid[r][c] = BRICK; break;
        case 'H': grid[r][c] = LADDER; break;
        case '-': grid[r][c] = BAR; break;
        case 'G': grid[r][c] = GOLD; totalGold++; break;
        case 'S': grid[r][c] = SOLID; break;
        case 'P':
          grid[r][c] = EMPTY;
          player = { x: c * TW, y: r * TH, dir: 1, digTimer: 0, dead: false, falling: false };
          break;
        case 'E':
          grid[r][c] = EMPTY;
          guards.push({ x: c * TW, y: r * TH, dir: 1, falling: false, trapped: 0, trappedR: 0, trappedC: 0, hasGold: false });
          break;
        default: grid[r][c] = EMPTY;
      }
    }
  }
  if (!player) {
    player = { x: 2 * TW, y: 12 * TH, dir: 1, digTimer: 0, dead: false, falling: false };
  }
}

function getTile(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return SOLID;
  return grid[r][c];
}

function isSolid(tile) { return tile === BRICK || tile === SOLID; }
function isLadder(tile) { return tile === LADDER || tile === ESCAPE_LADDER; }

function hasSupport(px, py) {
  const c = Math.round(px / TW);
  const r = Math.round(py / TH);
  if (r >= ROWS - 1) return true;
  const below = getTile(r + 1, c);
  if (isSolid(below)) return true;
  const cur = getTile(r, c);
  if (isLadder(cur)) return true;
  if (cur === BAR) return true;
  if (isLadder(below)) return true;
  return false;
}

// ── Player ──

function updatePlayer(dt, input) {
  if (player.dead) return;
  if (player.digTimer > 0) { player.digTimer -= dt * 1000; return; }

  const pr = Math.round(player.y / TH);
  const pc = Math.round(player.x / TW);
  const curTile = getTile(pr, pc);
  const onLad = isLadder(curTile);
  const onBar = curTile === BAR;
  const support = hasSupport(player.x, player.y);

  // Gravity
  if (!support && !onLad && !onBar) {
    player.falling = true;
    player.y += PLAYER_SPEED * 1.5 * dt;
    if (hasSupport(player.x, player.y)) {
      player.y = Math.round(player.y / TH) * TH;
      player.falling = false;
    }
    return;
  }
  player.falling = false;

  const spd = PLAYER_SPEED * dt;

  if (input.isDown('ArrowLeft')) {
    player.dir = -1;
    const nx = player.x - spd;
    const nc = Math.round(nx / TW);
    if (nc >= 0 && !isSolid(getTile(pr, nc))) player.x = nx;
  }
  if (input.isDown('ArrowRight')) {
    player.dir = 1;
    const nx = player.x + spd;
    const nc = Math.round(nx / TW);
    if (nc < COLS && !isSolid(getTile(pr, nc))) player.x = nx;
  }
  if (input.isDown('ArrowUp') && onLad) {
    const ny = player.y - spd;
    const nr = Math.round(ny / TH);
    if (nr >= 0 && !isSolid(getTile(nr, pc))) {
      player.y = ny;
      player.x = pc * TW;
    }
  }
  if (input.isDown('ArrowDown')) {
    const belowTile = getTile(pr + 1, pc);
    if (onLad || isLadder(belowTile)) {
      const ny = player.y + spd;
      const nr = Math.round(ny / TH);
      if (nr < ROWS && !isSolid(getTile(nr, pc))) {
        player.y = ny;
        player.x = pc * TW;
      }
    }
  }

  player.x = Math.max(0, Math.min((COLS - 1) * TW, player.x));
  player.y = Math.max(0, Math.min((ROWS - 1) * TH, player.y));

  // Collect gold
  const gr = Math.round(player.y / TH);
  const gc = Math.round(player.x / TW);
  if (getTile(gr, gc) === GOLD) {
    grid[gr][gc] = EMPTY;
    goldCount++;
    score += 100;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
    if (goldCount >= totalGold) showEscapeLadder();
  }

  // Level complete
  if (goldCount >= totalGold && gr <= 0) { levelComplete(); return; }

  // Dig — use wasPressed for single-fire
  if (input.wasPressed('z') || input.wasPressed('Z')) { digHole(pc - 1, pr + 1); }
  if (input.wasPressed('x') || input.wasPressed('X')) { digHole(pc + 1, pr + 1); }
}

function digHole(c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
  if (getTile(r, c) !== BRICK) return;
  grid[r][c] = EMPTY;
  holes.push({ r, c, timer: HOLE_DURATION });
  player.digTimer = HOLE_DIG_TIME;
}

function showEscapeLadder() {
  if (escapeLadderShown) return;
  escapeLadderShown = true;
  let col = 12;
  for (let c = 0; c < COLS; c++) {
    if (isLadder(getTile(2, c)) || isLadder(getTile(3, c))) { col = c; break; }
  }
  for (let r = 0; r < 4; r++) {
    if (!isSolid(getTile(r, col))) grid[r][col] = ESCAPE_LADDER;
  }
}

let _game; // reference to game for state management

function levelComplete() {
  level++;
  score += 500 + level * 100;
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
  if (level >= LEVELS.length) {
    score += 2000;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; }
    _game.showOverlay('YOU WIN!', 'Score: ' + score + ' -- All levels cleared! Press any key');
    _game.setState('over');
    return;
  }
  parseLevel(level);
}

// ── Guards ──

function updateGuards(dt) {
  for (const g of guards) {
    if (g.trapped > 0) {
      g.trapped -= dt * 1000;
      if (g.trapped <= 0) {
        g.trapped = 0;
        g.y = g.trappedR * TH - TH;
        if (g.y < 0) g.y = 0;
        if (g.hasGold) {
          if (getTile(g.trappedR - 1, g.trappedC) === EMPTY) grid[g.trappedR - 1][g.trappedC] = GOLD;
          g.hasGold = false;
        }
      }
      continue;
    }

    const gr = Math.round(g.y / TH);
    const gc = Math.round(g.x / TW);
    const curTile = getTile(gr, gc);
    const onLad = isLadder(curTile);
    const onBar = curTile === BAR;
    const support = hasSupport(g.x, g.y);

    if (!support && !onLad && !onBar) {
      g.falling = true;
      g.y += GUARD_SPEED * 1.8 * dt;
      const nr = Math.round(g.y / TH);
      const nc = Math.round(g.x / TW);
      for (const hole of holes) {
        if (hole.r === nr && hole.c === nc) {
          g.trapped = GUARD_TRAPPED_TIME;
          g.trappedR = nr; g.trappedC = nc;
          g.y = nr * TH; g.x = nc * TW;
          g.falling = false;
          break;
        }
      }
      if (hasSupport(g.x, g.y) && g.trapped <= 0) {
        g.y = Math.round(g.y / TH) * TH;
        g.falling = false;
      }
      continue;
    }
    g.falling = false;

    const pr = Math.round(player.y / TH);
    const pc = Math.round(player.x / TW);
    const spd = GUARD_SPEED * dt;
    let mx = 0, my = 0;

    if (gr === pr) {
      mx = gc < pc ? 1 : gc > pc ? -1 : 0;
    } else if (pr < gr) {
      if (onLad) { my = -1; }
      else {
        let bestLad = -1, bd = COLS + 1;
        for (let c2 = 0; c2 < COLS; c2++) {
          if (isLadder(getTile(gr, c2)) && Math.abs(c2 - gc) < bd) { bd = Math.abs(c2 - gc); bestLad = c2; }
        }
        if (bestLad === -1) {
          for (let c2 = 0; c2 < COLS; c2++) {
            if (isLadder(getTile(gr - 1, c2)) && Math.abs(c2 - gc) < bd) { bd = Math.abs(c2 - gc); bestLad = c2; }
          }
        }
        if (bestLad >= 0) { mx = gc < bestLad ? 1 : gc > bestLad ? -1 : 0; if (mx === 0) my = -1; }
        else { mx = gc < pc ? 1 : gc > pc ? -1 : 0; }
      }
    } else {
      const belowTile = getTile(gr + 1, gc);
      if (onLad || isLadder(belowTile)) { my = 1; }
      else {
        let bestLad = -1, bd = COLS + 1;
        for (let c2 = 0; c2 < COLS; c2++) {
          if ((isLadder(getTile(gr + 1, c2)) || isLadder(getTile(gr, c2))) && Math.abs(c2 - gc) < bd) {
            bd = Math.abs(c2 - gc); bestLad = c2;
          }
        }
        if (bestLad >= 0) { mx = gc < bestLad ? 1 : gc > bestLad ? -1 : 0; if (mx === 0) my = 1; }
        else { mx = gc < pc ? 1 : gc > pc ? -1 : 0; }
      }
    }

    if (my < 0 && onLad) {
      const ny = g.y - spd;
      const nr = Math.round(ny / TH);
      if (nr >= 0 && !isSolid(getTile(nr, gc))) { g.y = ny; g.x = gc * TW; }
    } else if (my > 0) {
      if (onLad || isLadder(getTile(gr + 1, gc))) {
        const ny = g.y + spd;
        const nr = Math.round(ny / TH);
        if (nr < ROWS && !isSolid(getTile(nr, gc))) { g.y = ny; g.x = gc * TW; }
      }
    }
    if (mx !== 0) {
      const nx = g.x + mx * spd;
      const nc = Math.round(nx / TW);
      if (nc >= 0 && nc < COLS && !isSolid(getTile(gr, nc))) { g.x = nx; g.dir = mx; }
    }

    g.x = Math.max(0, Math.min((COLS - 1) * TW, g.x));
    g.y = Math.max(0, Math.min((ROWS - 1) * TH, g.y));

    // Guard picks up gold
    const ggr = Math.round(g.y / TH), ggc = Math.round(g.x / TW);
    if (!g.hasGold && getTile(ggr, ggc) === GOLD) { grid[ggr][ggc] = EMPTY; g.hasGold = true; }
  }
}

function checkCollisions() {
  if (player.dead) return;
  for (const g of guards) {
    if (g.trapped > 0) continue;
    if (Math.abs(player.x - g.x) < TW * 0.7 && Math.abs(player.y - g.y) < TH * 0.7) {
      playerDie();
      return;
    }
  }
}

function playerDie() {
  player.dead = true;
  lives--;
  if (lives <= 0) {
    _game.showOverlay('GAME OVER', 'Score: ' + score + ' -- Press any key to restart');
    _game.setState('over');
  } else {
    // Respawn delay via frame counter (30 frames ~ 500ms at 60Hz)
    respawnTimer = 30;
  }
}

function updateHoles(dt) {
  for (let i = holes.length - 1; i >= 0; i--) {
    holes[i].timer -= dt * 1000;
    if (holes[i].timer <= 0) {
      const h = holes[i];
      grid[h.r][h.c] = BRICK;
      const pr = Math.round(player.y / TH), pc = Math.round(player.x / TW);
      if (pr === h.r && pc === h.c) playerDie();
      for (const g of guards) {
        const gr = Math.round(g.y / TH), gc = Math.round(g.x / TW);
        if (gr === h.r && gc === h.c && g.trapped > 0) {
          g.trapped = 0;
          g.y = 0;
          g.x = Math.floor(Math.random() * COLS) * TW;
          if (g.hasGold) {
            if (getTile(h.r - 1, h.c) === EMPTY) grid[h.r - 1][h.c] = GOLD;
            g.hasGold = false;
          }
        }
      }
      holes.splice(i, 1);
    }
  }
}

// ── Drawing ──

function drawChar(renderer, x, y, color, dir, trapped) {
  const cx = x + TW / 2;
  renderer.setGlow(color, 0.5);
  if (trapped) {
    renderer.fillCircle(cx, y + 4, 4, color);
    renderer.setGlow(null);
    renderer.fillRect(cx - 2, y + 3, 1.5, 1.5, '#000');
    renderer.fillRect(cx + 1, y + 3, 1.5, 1.5, '#000');
  } else {
    renderer.fillCircle(cx, y + 5, 4, color);
    renderer.fillRect(cx - 2, y + 9, 4, 8, color);
    renderer.fillRect(cx - 6, y + 10, 4, 2, color);
    renderer.fillRect(cx + 2, y + 10, 4, 2, color);
    renderer.fillRect(cx - 4, y + 17, 3, 6, color);
    renderer.fillRect(cx + 1, y + 17, 3, 6, color);
    renderer.setGlow(null);
    if (dir > 0) {
      renderer.fillRect(cx, y + 4, 1.5, 1.5, '#000');
      renderer.fillRect(cx + 2, y + 4, 1.5, 1.5, '#000');
    } else {
      renderer.fillRect(cx - 3, y + 4, 1.5, 1.5, '#000');
      renderer.fillRect(cx - 1, y + 4, 1.5, 1.5, '#000');
    }
  }
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    level = 0;
    lives = 3;
    scoreEl.textContent = '0';
    parseLevel(0);
    game.showOverlay('LODE RUNNER', 'Arrows: move  Z/X: dig left/right -- Press SPACE to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    // Handle state transitions
    if (game.state === 'waiting') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
          || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')) {
        game.setState('playing');
        game.hideOverlay();
      }
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed(' ') || input.wasPressed('ArrowUp') || input.wasPressed('ArrowDown')
          || input.wasPressed('ArrowLeft') || input.wasPressed('ArrowRight')
          || input.wasPressed('z') || input.wasPressed('Z')
          || input.wasPressed('x') || input.wasPressed('X')) {
        game.onInit();
      }
      return;
    }

    // ── Playing state ──

    // Respawn timer
    if (respawnTimer > 0) {
      respawnTimer--;
      if (respawnTimer <= 0) {
        parseLevel(level);
        player.dead = false;
      }
      return;
    }

    const dt = FIXED_DT_S;
    updatePlayer(dt, input);
    updateGuards(dt);
    updateHoles(dt);
    checkCollisions();

    // Expose game data for AI
    window.gameData = {
      playerX: player.x, playerY: player.y, playerDead: player.dead,
      guards: guards.map(g => ({ x: g.x, y: g.y, trapped: g.trapped > 0 })),
      goldRemaining: totalGold - goldCount, level: level, lives: lives
    };
  };

  game.onDraw = (renderer, text) => {
    // Draw grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = grid[r][c];
        const x = c * TW, y = r * TH;

        if (tile === BRICK) {
          renderer.fillRect(x, y, TW, TH, '#6b4226');
          // Brick detail lines
          renderer.drawLine(x, y + 0.5, x + TW, y + 0.5, '#4a2d16', 1);
          renderer.drawLine(x, y + TH - 0.5, x + TW, y + TH - 0.5, '#4a2d16', 1);
          renderer.drawLine(x + 0.5, y, x + 0.5, y + TH, '#4a2d16', 1);
          renderer.drawLine(x + TW - 0.5, y, x + TW - 0.5, y + TH, '#4a2d16', 1);
          renderer.drawLine(x, y + TH / 2, x + TW, y + TH / 2, '#4a2d16', 1);
          renderer.drawLine(x + TW / 2, y, x + TW / 2, y + TH / 2, '#4a2d16', 1);
        } else if (tile === SOLID) {
          renderer.fillRect(x, y, TW, TH, '#3a3a5a');
          renderer.drawLine(x + 0.5, y + 0.5, x + TW - 0.5, y + 0.5, '#2a2a4a', 1);
          renderer.drawLine(x + 0.5, y + TH - 0.5, x + TW - 0.5, y + TH - 0.5, '#2a2a4a', 1);
          renderer.drawLine(x + 0.5, y + 0.5, x + 0.5, y + TH - 0.5, '#2a2a4a', 1);
          renderer.drawLine(x + TW - 0.5, y + 0.5, x + TW - 0.5, y + TH - 0.5, '#2a2a4a', 1);
        } else if (tile === LADDER || tile === ESCAPE_LADDER) {
          const lc = tile === ESCAPE_LADDER ? '#4f4' : '#a87532';
          if (tile === ESCAPE_LADDER) renderer.setGlow('#4f4', 0.6);
          // Ladder rails
          renderer.drawLine(x + 3, y, x + 3, y + TH, lc, 2);
          renderer.drawLine(x + TW - 3, y, x + TW - 3, y + TH, lc, 2);
          // Ladder rungs
          for (let i = 0; i < 3; i++) {
            const yy = y + 4 + i * (TH / 3);
            renderer.drawLine(x + 3, yy, x + TW - 3, yy, lc, 1.5);
          }
          if (tile === ESCAPE_LADDER) renderer.setGlow(null);
        } else if (tile === BAR) {
          renderer.drawLine(x, y + TH / 3, x + TW, y + TH / 3, '#8888cc', 2);
        } else if (tile === GOLD) {
          // Diamond shape using fillPoly
          renderer.setGlow('#ea4', 0.7);
          renderer.fillPoly([
            { x: x + TW / 2, y: y + 4 },
            { x: x + TW - 4, y: y + TH / 2 },
            { x: x + TW / 2, y: y + TH - 4 },
            { x: x + 4, y: y + TH / 2 }
          ], '#ea4');
          renderer.setGlow(null);
        }
      }
    }

    // Flashing holes about to refill
    for (const h of holes) {
      if (h.timer < 1000 && Math.floor(h.timer / 150) % 2 === 0) {
        renderer.fillRect(h.c * TW, h.r * TH, TW, TH, '#6b422680');
      }
    }

    // Guards
    for (const g of guards) {
      drawChar(renderer, g.x, g.y, '#f44', g.dir, g.trapped > 0);
      if (g.hasGold) {
        renderer.setGlow('#ea4', 0.5);
        renderer.fillCircle(g.x + TW / 2, g.y + 3, 3, '#ea4');
        renderer.setGlow(null);
      }
    }

    // Player
    if (!player.dead) drawChar(renderer, player.x, player.y, '#4cf', player.dir, false);

    // HUD
    text.drawText('Level ' + (level + 1) + '/' + LEVELS.length, 5, 2, 10, '#888', 'left');
    text.drawText('Lives: ' + lives, 5, 14, 10, '#888', 'left');
    text.drawText('Gold: ' + goldCount + '/' + totalGold, W - 5, 2, 10, '#888', 'right');

    if (goldCount >= totalGold) {
      renderer.setGlow('#4f4', 0.6);
      text.drawText('ESCAPE! Reach the top!', W / 2, 2, 10, '#4f4', 'center');
      renderer.setGlow(null);
    }
  };

  game.start();
  return game;
}
