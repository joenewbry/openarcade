import { Game } from '../engine/core.js';

export function createGame() {
  const game = new Game('game');
  const W = 600, H = 400;

  // Grid constants
  const COLS = 13, ROWS = 16;
  const CELL = 20;
  const GRID_W = COLS * CELL; // 260
  const GRID_H = ROWS * CELL; // 320
  const PAD_TOP = 40;
  const P_OX = 10, P_OY = PAD_TOP;
  const A_OX = W - GRID_W - 10, A_OY = PAD_TOP;
  const MID_X = W / 2;

  // Entry/exit positions (grid coords)
  const ENTRY_COL = 0, ENTRY_ROW = 1;
  const EXIT_COL = COLS - 1, EXIT_ROW = ROWS - 2;

  // Tower definitions
  const TOWER_DEFS = [
    { name: 'Arrow',  cost: 10, range: 3,   damage: 8,  rate: 500,  color: '#4f4', splash: 0,   slow: 0,   chain: 0, sell: 5  },
    { name: 'Cannon', cost: 20, range: 2.5, damage: 25, rate: 1200, color: '#f84', splash: 1.2, slow: 0,   chain: 0, sell: 10 },
    { name: 'Ice',    cost: 15, range: 2.8, damage: 4,  rate: 600,  color: '#8ef', splash: 0,   slow: 0.5, chain: 0, sell: 7  },
    { name: 'Zap',   cost: 25, range: 3.5, damage: 12, rate: 800,  color: '#ff0', splash: 0,   slow: 0,   chain: 3, sell: 12 },
  ];

  // Creep definitions
  const CREEP_DEFS = [
    { name: 'Scout',   cost: 8,  hp: 30,  speed: 1.8, reward: 5,  color: '#f66', size: 4 },
    { name: 'Soldier', cost: 14, hp: 80,  speed: 1.0, reward: 8,  color: '#fa0', size: 5 },
    { name: 'Tank',    cost: 22, hp: 200, speed: 0.6, reward: 14, color: '#f0f', size: 7 },
    { name: 'Speed',   cost: 18, hp: 50,  speed: 2.5, reward: 10, color: '#0ff', size: 4 },
  ];

  // Game state
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('towerWarsBest')) || 0;

  let selectedTower = 0;
  let playerGold = 50, aiGold = 50;
  let playerLives = 20, aiLives = 20;
  let playerKills = 0, aiKills = 0;
  let gameTime = 0;

  let playerGrid, aiGrid;
  let playerTowers, aiTowers;
  let playerCreeps, aiCreeps;
  let projectiles;
  let particles;
  let hoverCell = null;
  let aiTimer = 0;
  let aiActionTimer = 0;
  let goldTimer = 0;
  let waveTimer = 0;

  // DOM elements for score bar
  const scoreEl  = document.getElementById('score');
  const bestEl   = document.getElementById('best');
  const pLivesEl = document.getElementById('pLives');
  const aLivesEl = document.getElementById('aLives');
  const pGoldEl  = document.getElementById('pGold');
  const aiKillsEl = document.getElementById('aiKills');

  if (bestEl) bestEl.textContent = bestScore;

  // ── Helpers ──

  function updateUI() {
    if (scoreEl)   scoreEl.textContent   = score;
    if (pLivesEl)  pLivesEl.textContent  = playerLives;
    if (aLivesEl)  aLivesEl.textContent  = aiLives;
    if (pGoldEl)   pGoldEl.textContent   = playerGold;
    if (aiKillsEl) aiKillsEl.textContent = aiKills;
  }

  // Pathfinding (BFS)
  function findPath(grid) {
    const start = { r: ENTRY_ROW, c: ENTRY_COL };
    const end   = { r: EXIT_ROW,  c: EXIT_COL  };
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const parent  = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const queue = [start];
    visited[start.r][start.c] = true;
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.r === end.r && cur.c === end.c) {
        const path = [];
        let n = cur;
        while (n) { path.unshift({ r: n.r, c: n.c }); n = parent[n.r][n.c]; }
        return path;
      }
      for (const [dr, dc] of dirs) {
        const nr = cur.r + dr, nc = cur.c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && grid[nr][nc] === 0) {
          visited[nr][nc] = true;
          parent[nr][nc] = cur;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return null;
  }

  function gridToWorld(ox, oy, r, c) {
    return { x: ox + c * CELL + CELL / 2, y: oy + r * CELL + CELL / 2 };
  }

  function placeTower(grid, towers, r, c, type, isAI) {
    const def = TOWER_DEFS[type];
    grid[r][c] = type + 1;
    const ox = isAI ? A_OX : P_OX;
    const oy = isAI ? A_OY : P_OY;
    const pos = gridToWorld(ox, oy, r, c);
    towers.push({ r, c, type, x: pos.x, y: pos.y, lastFire: 0, ...def });
  }

  function removeTower(grid, towers, r, c) {
    grid[r][c] = 0;
    const idx = towers.findIndex(t => t.r === r && t.c === c);
    if (idx >= 0) {
      const t = towers[idx];
      towers.splice(idx, 1);
      return t.sell;
    }
    return 0;
  }

  function spawnCreep(grid, creeps, type, isOnAIField) {
    const path = findPath(grid);
    if (!path) return;
    const def = CREEP_DEFS[type];
    const ox = isOnAIField ? A_OX : P_OX;
    const oy = isOnAIField ? A_OY : P_OY;
    const startPos = gridToWorld(ox, oy, path[0].r, path[0].c);
    creeps.push({
      type, x: startPos.x, y: startPos.y,
      hp: def.hp, maxHp: def.hp,
      speed: def.speed, color: def.color, size: def.size, reward: def.reward,
      path, pathIdx: 0, slowTimer: 0, slowFactor: 1, ox, oy,
    });
  }

  function updateCreepPaths(grid, creeps, isOnAIField) {
    const path = findPath(grid);
    if (!path) return;
    const ox = isOnAIField ? A_OX : P_OX;
    const oy = isOnAIField ? A_OY : P_OY;
    for (const creep of creeps) {
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < path.length; i++) {
        const wp = gridToWorld(ox, oy, path[i].r, path[i].c);
        const d = Math.hypot(creep.x - wp.x, creep.y - wp.y);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      creep.path = path;
      creep.pathIdx = bestIdx;
    }
  }

  // ── Init ──

  function initGame() {
    playerGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    aiGrid     = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    playerTowers = []; aiTowers = [];
    playerCreeps = []; aiCreeps = [];
    projectiles = []; particles = [];
    playerGold = 50; aiGold = 50;
    playerLives = 20; aiLives = 20;
    playerKills = 0; aiKills = 0;
    gameTime = 0; aiTimer = 0; aiActionTimer = 0; goldTimer = 0; waveTimer = 0;
    score = 0; selectedTower = 0;
    highlightBtn(0);
    updateUI();
  }

  // ── Tower selection UI ──

  function highlightBtn(type) {
    document.querySelectorAll('.controls button').forEach((b, i) => {
      if (i < 5) b.classList.toggle('active', i === type || (type === -1 && i === 4));
    });
  }

  window.selectTower = function(type) {
    selectedTower = type;
    highlightBtn(type);
  };

  window.sendCreepCmd = function(type) {
    if (game.state !== 'playing') return;
    const def = CREEP_DEFS[type];
    if (playerGold < def.cost) return;
    playerGold -= def.cost;
    spawnCreep(aiGrid, aiCreeps, type, true);
    updateUI();
  };

  // ── AI ──

  function aiDecide() {
    const rand = Math.random();
    if (rand < 0.55 && aiGold >= 10) {
      aiBuildTower();
    } else if (aiGold >= 8) {
      aiSendCreep();
    }
  }

  function aiBuildTower() {
    const path = findPath(aiGrid);
    if (!path) return;
    const pathSet = new Set(path.map(p => p.r + ',' + p.c));
    const candidates = [];
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const p of path) {
      for (const [dr, dc] of dirs) {
        const nr = p.r + dr, nc = p.c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && aiGrid[nr][nc] === 0 &&
            !pathSet.has(nr + ',' + nc) &&
            !(nr === ENTRY_ROW && nc === ENTRY_COL) &&
            !(nr === EXIT_ROW  && nc === EXIT_COL)) {
          candidates.push({ r: nr, c: nc });
        }
      }
    }
    if (candidates.length === 0) return;
    const affordable = TOWER_DEFS.map((d, i) => ({ ...d, idx: i })).filter(d => d.cost <= aiGold);
    if (affordable.length === 0) return;
    const towerType = affordable[Math.floor(Math.random() * affordable.length)].idx;
    const def = TOWER_DEFS[towerType];
    for (let attempts = 0; attempts < 10; attempts++) {
      const cand = candidates[Math.floor(Math.random() * candidates.length)];
      aiGrid[cand.r][cand.c] = towerType + 1;
      const testPath = findPath(aiGrid);
      if (testPath) {
        aiGrid[cand.r][cand.c] = 0;
        aiGold -= def.cost;
        placeTower(aiGrid, aiTowers, cand.r, cand.c, towerType, true);
        updateCreepPaths(aiGrid, aiCreeps, true);
        return;
      }
      aiGrid[cand.r][cand.c] = 0;
    }
  }

  function aiSendCreep() {
    const affordable = CREEP_DEFS.map((d, i) => ({ ...d, idx: i })).filter(d => d.cost <= aiGold);
    if (affordable.length === 0) return;
    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    aiGold -= pick.cost;
    spawnCreep(playerGrid, playerCreeps, pick.idx, false);
  }

  // ── Combat ──

  function fireProjectile(tower, target, creeps) {
    projectiles.push({ x: tower.x, y: tower.y, target, tower, creeps, speed: 5, color: tower.color });
  }

  function applyDamage(tower, target, creeps) {
    target.hp -= tower.damage;

    if (tower.splash > 0) {
      const splashPx = tower.splash * CELL;
      for (const c of creeps) {
        if (c !== target) {
          const d = Math.hypot(c.x - target.x, c.y - target.y);
          if (d <= splashPx) {
            c.hp -= tower.damage * 0.5;
            particles.push({ x: c.x, y: c.y, vx: 0, vy: -1, color: '#f84', life: 300, size: 3 });
          }
        }
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        particles.push({ x: target.x, y: target.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, color: '#f84', life: 300, size: 2 });
      }
    }

    if (tower.slow > 0) {
      target.slowFactor = 1 - tower.slow;
      target.slowTimer = 1500;
      particles.push({ x: target.x, y: target.y, vx: 0, vy: -1, color: '#8ef', life: 400, size: 4 });
    }

    if (tower.chain > 0) {
      let chainTarget = target;
      const chained = new Set([target]);
      for (let ch = 0; ch < tower.chain; ch++) {
        let nearest = null, nearDist = CELL * 3;
        for (const cr of creeps) {
          if (chained.has(cr) || cr.hp <= 0) continue;
          const d = Math.hypot(cr.x - chainTarget.x, cr.y - chainTarget.y);
          if (d < nearDist) { nearDist = d; nearest = cr; }
        }
        if (nearest) {
          nearest.hp -= tower.damage * 0.6;
          chained.add(nearest);
          particles.push({
            x: (chainTarget.x + nearest.x) / 2, y: (chainTarget.y + nearest.y) / 2,
            vx: 0, vy: 0, color: '#ff0', life: 200, size: 2,
          });
          chainTarget = nearest;
        } else break;
      }
    }
  }

  // ── Update ──

  function updateCreeps(creeps, towers, isOnAIField, dt) {
    const ox = isOnAIField ? A_OX : P_OX;
    const oy = isOnAIField ? A_OY : P_OY;

    for (let i = creeps.length - 1; i >= 0; i--) {
      const c = creeps[i];

      if (c.slowTimer > 0) {
        c.slowTimer -= dt;
        if (c.slowTimer <= 0) c.slowFactor = 1;
      }

      if (c.pathIdx < c.path.length - 1) {
        const target = gridToWorld(ox, oy, c.path[c.pathIdx + 1].r, c.path[c.pathIdx + 1].c);
        const dx = target.x - c.x;
        const dy = target.y - c.y;
        const dist = Math.hypot(dx, dy);
        const speed = c.speed * c.slowFactor * CELL * dt / 500;
        if (dist <= speed) {
          c.x = target.x; c.y = target.y; c.pathIdx++;
        } else {
          c.x += (dx / dist) * speed;
          c.y += (dy / dist) * speed;
        }
      }

      if (c.pathIdx >= c.path.length - 1) {
        creeps.splice(i, 1);
        if (isOnAIField) { aiLives--;  score += 5; }
        else             { playerLives--; aiKills++; }
        continue;
      }

      if (c.hp <= 0) {
        if (isOnAIField) { aiGold += c.reward; }
        else             { playerGold += c.reward; playerKills++; score += 2; }
        for (let j = 0; j < 6; j++) {
          particles.push({
            x: c.x, y: c.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: c.color, life: 400, size: 2,
          });
        }
        creeps.splice(i, 1);
      }
    }

    // Tower firing
    const now = gameTime;
    for (const t of towers) {
      if (now - t.lastFire < t.rate) continue;
      const rangePx = t.range * CELL;
      let target = null, bestProgress = -1;
      for (const c of creeps) {
        const d = Math.hypot(c.x - t.x, c.y - t.y);
        if (d <= rangePx && c.pathIdx > bestProgress) {
          bestProgress = c.pathIdx; target = c;
        }
      }
      if (target) { t.lastFire = now; fireProjectile(t, target, creeps); }
    }
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const speed = p.speed * dt / 2;
      if (dist <= speed || p.target.hp <= 0) {
        if (p.target.hp > 0) applyDamage(p.tower, p.target, p.creeps);
        projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * speed;
        p.y += (dy / dist) * speed;
      }
    }
  }

  function endGame(won) {
    score += Math.floor(gameTime / 1000);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('towerWarsBest', bestScore);
      if (bestEl) bestEl.textContent = bestScore;
    }
    if (scoreEl) scoreEl.textContent = score;
    game.showOverlay(
      won ? 'VICTORY!' : 'DEFEATED',
      `Score: ${score}\nKills: ${playerKills} | Survived: ${Math.floor(gameTime/1000)}s\nClick to play again`
    );
    game.setState('over');
  }

  // ── Draw helpers ──

  function drawGrid(renderer, text, ox, oy, grid, towers, creeps, isAI) {
    // Grid background
    renderer.fillRect(ox, oy, GRID_W, GRID_H, '#12122a');

    // Grid lines
    for (let r = 0; r <= ROWS; r++) {
      renderer.drawLine(ox, oy + r * CELL, ox + GRID_W, oy + r * CELL, '#222244', 0.5);
    }
    for (let c = 0; c <= COLS; c++) {
      renderer.drawLine(ox + c * CELL, oy, ox + c * CELL, oy + GRID_H, '#222244', 0.5);
    }

    // Entry / Exit markers
    const entryX = ox + ENTRY_COL * CELL, entryY = oy + ENTRY_ROW * CELL;
    const exitX  = ox + EXIT_COL  * CELL, exitY  = oy + EXIT_ROW  * CELL;

    renderer.setGlow('#0f0', 0.8);
    renderer.fillRect(entryX + 2, entryY + 2, CELL - 4, CELL - 4, '#0a0');
    renderer.setGlow('#f00', 0.8);
    renderer.fillRect(exitX + 2, exitY + 2, CELL - 4, CELL - 4, '#a00');
    renderer.setGlow(null);

    text.drawText('IN',  entryX + CELL / 2, entryY + CELL / 2 - 5, 9, '#fff', 'center');
    text.drawText('OUT', exitX  + CELL / 2, exitY  + CELL / 2 - 5, 9, '#fff', 'center');

    // Path hint
    if (game.state === 'playing') {
      const path = findPath(grid);
      if (path && path.length > 1) {
        const pts = path.map(p => gridToWorld(ox, oy, p.r, p.c))
                        .map(p => ({ x: p.x, y: p.y }));
        renderer.strokePoly(pts, '#2d822844', 2, false);
      }
    }

    // Towers
    for (const t of towers) {
      const tx = ox + t.c * CELL;
      const ty = oy + t.r * CELL;
      renderer.setGlow(t.color, 0.5);
      renderer.fillRect(tx + 3, ty + 3, CELL - 6, CELL - 6, t.color);
      renderer.setGlow(null);
      text.drawText(t.name[0], tx + CELL / 2, ty + CELL / 2 - 4, 8, '#000', 'center');
    }

    // Creeps
    for (const c of creeps) {
      // Health bar background
      const barW = c.size * 2 + 4;
      const hpRatio = Math.max(0, c.hp / c.maxHp);
      renderer.fillRect(c.x - barW / 2, c.y - c.size - 5, barW, 3, '#300');
      const barColor = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
      renderer.fillRect(c.x - barW / 2, c.y - c.size - 5, barW * hpRatio, 3, barColor);

      // Body
      renderer.setGlow(c.color, 0.5);
      renderer.fillCircle(c.x, c.y, c.size, c.color);
      renderer.setGlow(null);

      // Slow ring
      if (c.slowTimer > 0) {
        renderer.strokePoly(circlePoints(c.x, c.y, c.size + 2, 12), '#8ef', 1, true);
      }
    }
  }

  // Generate circle approximation as polygon points
  function circlePoints(cx, cy, r, segments) {
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  // ── Mouse input (direct canvas listener) ──

  const canvas = game.canvas;

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    if (game.state === 'waiting' || game.state === 'over') {
      initGame();
      game.setState('playing');
      return;
    }

    if (game.state !== 'playing') return;

    const gc = Math.floor((mx - P_OX) / CELL);
    const gr = Math.floor((my - P_OY) / CELL);
    if (gc >= 0 && gc < COLS && gr >= 0 && gr < ROWS) {
      if (selectedTower === -1) {
        if (playerGrid[gr][gc] > 0) {
          const gold = removeTower(playerGrid, playerTowers, gr, gc);
          playerGold += gold;
          updateUI();
        }
      } else if (selectedTower >= 0 && selectedTower < TOWER_DEFS.length) {
        const def = TOWER_DEFS[selectedTower];
        if (playerGold < def.cost) return;
        if (playerGrid[gr][gc] !== 0) return;
        if (gr === ENTRY_ROW && gc === ENTRY_COL) return;
        if (gr === EXIT_ROW  && gc === EXIT_COL)  return;
        playerGrid[gr][gc] = selectedTower + 1;
        const testPath = findPath(playerGrid);
        if (!testPath) { playerGrid[gr][gc] = 0; return; }
        playerGrid[gr][gc] = 0;
        playerGold -= def.cost;
        placeTower(playerGrid, playerTowers, gr, gc, selectedTower, false);
        updateCreepPaths(playerGrid, playerCreeps, false);
        updateUI();
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    const gc = Math.floor((mx - P_OX) / CELL);
    const gr = Math.floor((my - P_OY) / CELL);
    if (gc >= 0 && gc < COLS && gr >= 0 && gr < ROWS) {
      hoverCell = { r: gr, c: gc };
    } else {
      hoverCell = null;
    }
  });

  // ── Engine callbacks ──

  game.onInit = () => {
    game.showOverlay('TOWER WARS', 'Click to start\nBuild towers to defend your base\nSend creeps to attack the AI');
    game.setState('waiting');
    // Initialise arrays so draw doesn't crash before first click
    initGame();
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;
    gameTime += dt;

    goldTimer += dt;
    if (goldTimer >= 2000) {
      goldTimer -= 2000;
      playerGold += 3;
      aiGold += 3;
    }

    waveTimer += dt;
    if (waveTimer >= 8000) {
      waveTimer -= 8000;
      spawnCreep(aiGrid,     aiCreeps,     0, true);
      spawnCreep(playerGrid, playerCreeps, 0, false);
    }

    // AI
    aiActionTimer += dt;
    if (aiActionTimer > 2000) {
      aiActionTimer = 0;
      aiDecide();
    }

    updateCreeps(playerCreeps, playerTowers, false, dt);
    updateCreeps(aiCreeps,     aiTowers,     true,  dt);
    updateProjectiles(dt);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateUI();

    if (playerLives <= 0) endGame(false);
    else if (aiLives <= 0) endGame(true);
  };

  game.onDraw = (renderer, text) => {
    // Title labels
    text.drawText('YOUR BASE', P_OX + GRID_W / 2, P_OY - 16, 12, '#2d8', 'center');
    text.drawText('AI BASE',   A_OX + GRID_W / 2, A_OY - 16, 12, '#f66', 'center');

    // Middle info
    text.drawText('TOWER WARS',                    MID_X, PAD_TOP + 10, 10, '#555555', 'center');
    text.drawText(`${Math.floor(gameTime/1000)}s`, MID_X, PAD_TOP + 30, 11, '#2d8',   'center');
    text.drawText(`AI Gold: ${aiGold}`,            MID_X, PAD_TOP + 48, 9,  '#888',   'center');

    drawGrid(renderer, text, P_OX, P_OY, playerGrid, playerTowers, playerCreeps, false);
    drawGrid(renderer, text, A_OX, A_OY, aiGrid,     aiTowers,     aiCreeps,     true);

    // Projectiles
    for (const p of projectiles) {
      renderer.setGlow(p.color, 0.8);
      renderer.fillCircle(p.x, p.y, 2, p.color);
    }
    renderer.setGlow(null);

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / 400);
      const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color + hex);
    }

    // Hover preview on player grid
    if (hoverCell && game.state === 'playing') {
      const { r, c } = hoverCell;
      if (selectedTower >= 0 && selectedTower < TOWER_DEFS.length) {
        if (playerGrid[r][c] === 0 && !(r === ENTRY_ROW && c === ENTRY_COL) && !(r === EXIT_ROW && c === EXIT_COL)) {
          const px = P_OX + c * CELL;
          const py = P_OY + r * CELL;
          renderer.fillRect(px, py, CELL, CELL, '#22dd8833');
          renderer.strokePoly([
            { x: px,        y: py        },
            { x: px + CELL, y: py        },
            { x: px + CELL, y: py + CELL },
            { x: px,        y: py + CELL },
          ], '#2d8', 1, true);
          // Range circle
          const def = TOWER_DEFS[selectedTower];
          renderer.strokePoly(
            circlePoints(px + CELL / 2, py + CELL / 2, def.range * CELL, 24),
            '#2d822833', 1, true
          );
        }
      } else if (selectedTower === -1) {
        if (playerGrid[r][c] > 0) {
          const px = P_OX + c * CELL;
          const py = P_OY + r * CELL;
          renderer.fillRect(px, py, CELL, CELL, '#ff505033');
          renderer.strokePoly([
            { x: px,        y: py        },
            { x: px + CELL, y: py        },
            { x: px + CELL, y: py + CELL },
            { x: px,        y: py + CELL },
          ], '#f55', 1, true);
        }
      }
    }
  };

  game.start();
  return game;
}
