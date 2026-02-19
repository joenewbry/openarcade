// xcom-tactics/game.js — WebGL 2 port via engine/core.js
import { Game } from '../engine/core.js';

// Expand #rgb → #rrggbb for alpha concatenation
function expandHex(c) {
  if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  return c;
}

export function createGame() {
  const game = new Game('game');

  const W = 600, H = 500;
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const turnInfoEl = document.getElementById('turnInfo');
  const overlayControls = document.getElementById('overlayControls');

  // --- Grid constants ---
  const COLS = 12, ROWS = 12;
  const CELL = 34;
  const OX = Math.floor((W - COLS * CELL) / 2);
  const OY = 6;
  const PANEL_Y = OY + ROWS * CELL + 4;

  // --- Cover ---
  const COVER_NONE = 0, COVER_HALF = 1, COVER_FULL = 2;
  const COVER_DEF = [0, 25, 50];

  // --- State ---
  let score = 0, best = 0;
  let grid, soldiers, selSoldier, curAction, turn, aiThinking;
  let moveRange, floats, logs, turnNum, hoverCell;
  let shootAnim, grenadeAnim;

  // --- Helpers ---
  function occupied(r, c) { return soldiers.some(s => s.alive && s.row === r && s.col === c); }
  function soldierAt(r, c) { return soldiers.find(s => s.alive && s.row === r && s.col === c) || null; }
  function dist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

  function adjCover(r, c) {
    let best = 0;
    for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].cover > best) best = grid[nr][nc].cover;
    }
    return best;
  }

  function lineOfSight(r1, c1, r2, c2) {
    let dr = Math.abs(r2 - r1), dc = Math.abs(c2 - c1);
    let sr = r1 < r2 ? 1 : -1, sc = c1 < c2 ? 1 : -1;
    let err = dr - dc, cr = r1, cc = c1;
    while (true) {
      if (cr === r2 && cc === c2) return true;
      let e2 = 2 * err;
      if (e2 > -dc) { err -= dc; cr += sr; }
      if (e2 < dr) { err += dr; cc += sc; }
      if (cr === r2 && cc === c2) return true;
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) return false;
      if (grid[cr][cc].cover === COVER_FULL) return false;
    }
  }

  function effectiveCover(attacker, target) {
    let best = COVER_NONE;
    let dr = Math.sign(attacker.row - target.row);
    let dc = Math.sign(attacker.col - target.col);
    let checks = [];
    if (dr !== 0) checks.push([dr, 0]);
    if (dc !== 0) checks.push([0, dc]);
    for (let [cr, cc] of checks) {
      let nr = target.row + cr, nc = target.col + cc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (grid[nr][nc].cover > best) best = grid[nr][nc].cover;
      }
    }
    for (let [cr, cc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = target.row + cr, nc = target.col + cc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (grid[nr][nc].cover === COVER_NONE) continue;
      let toAtk = [attacker.row - target.row, attacker.col - target.col];
      let toCov = [cr, cc];
      if (toAtk[0] * toCov[0] + toAtk[1] * toCov[1] > 0) {
        if (grid[nr][nc].cover > best) best = grid[nr][nc].cover;
      }
    }
    return best;
  }

  function hitChance(atk, tgt) {
    let d = dist(atk.row, atk.col, tgt.row, tgt.col);
    let base = 95 - (d - 1) * 7;
    if (base < 25) base = 25;
    let cover = effectiveCover(atk, tgt);
    base -= COVER_DEF[cover];
    if (tgt.hunkered) base -= 20;
    return Math.max(Math.min(base, 95), 5);
  }

  function calcMoveRange(s) {
    if (s.moved) return [];
    let maxSteps = 5;
    let visited = new Map();
    let queue = [{r: s.row, c: s.col, steps: 0}];
    visited.set(s.row * COLS + s.col, 0);
    let result = [];
    while (queue.length > 0) {
      let cur = queue.shift();
      if (cur.steps > 0) result.push({r: cur.r, c: cur.c, steps: cur.steps});
      if (cur.steps >= maxSteps) continue;
      for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let nr = cur.r + dr, nc = cur.c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (grid[nr][nc].cover === COVER_FULL) continue;
        if (occupied(nr, nc)) continue;
        let key = nr * COLS + nc;
        let newSteps = cur.steps + 1;
        if (!visited.has(key) || visited.get(key) > newSteps) {
          visited.set(key, newSteps);
          queue.push({r: nr, c: nc, steps: newSteps});
        }
      }
    }
    return result;
  }

  function shootTargets(s) {
    if (s.acted) return [];
    let targets = [];
    let enemies = soldiers.filter(e => e.team !== s.team && e.alive);
    for (let e of enemies) {
      let d = dist(s.row, s.col, e.row, e.col);
      if (d <= 10 && lineOfSight(s.row, s.col, e.row, e.col)) {
        targets.push({soldier: e, hit: hitChance(s, e), dist: d});
      }
    }
    return targets;
  }

  function addFloat(r, c, text, color) {
    floats.push({x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2, text, color, life: 50});
  }

  function log(msg) { logs.unshift(msg); if (logs.length > 4) logs.pop(); }

  // --- Map generation ---
  function genMap() {
    grid = Array.from({length: ROWS}, () => Array.from({length: COLS}, () => ({cover: COVER_NONE})));
    let placed = 0;
    let target = 20 + Math.floor(Math.random() * 10);
    let attempts = 0;
    while (placed < target && attempts < 500) {
      attempts++;
      let r = 2 + Math.floor(Math.random() * (ROWS - 4));
      let c = Math.floor(Math.random() * COLS);
      if (grid[r][c].cover !== COVER_NONE) continue;
      let type = Math.random() < 0.35 ? COVER_FULL : COVER_HALF;
      grid[r][c].cover = type;
      placed++;
      if (Math.random() < 0.45) {
        let dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        let d = dirs[Math.floor(Math.random() * 4)];
        let nr = r + d[0], nc = c + d[1];
        if (nr >= 2 && nr < ROWS - 2 && nc >= 0 && nc < COLS && grid[nr][nc].cover === COVER_NONE) {
          grid[nr][nc].cover = type;
          placed++;
        }
      }
    }

    soldiers = [];
    selSoldier = null;
    curAction = null;
    turn = 'player';
    aiThinking = false;
    moveRange = [];
    floats = [];
    logs = [];
    turnNum = 1;
    hoverCell = null;
    shootAnim = null;
    grenadeAnim = null;

    let pNames = ['Alpha','Bravo','Charlie','Delta'];
    let pPos = randPositions(ROWS - 2, ROWS, 0, COLS, 4);
    for (let i = 0; i < 4; i++) {
      let hp = 3 + Math.floor(Math.random() * 3);
      soldiers.push({
        id: i, team: 'player', name: pNames[i],
        row: pPos[i].r, col: pPos[i].c,
        hp, maxHp: hp, moved: false, acted: false,
        overwatch: false, hunkered: false, alive: true
      });
    }
    let aNames = ['Sectoid-A','Sectoid-B','Muton-A','Muton-B'];
    let aPos = randPositions(0, 2, 0, COLS, 4);
    for (let i = 0; i < 4; i++) {
      let hp = 3 + Math.floor(Math.random() * 3);
      soldiers.push({
        id: i + 4, team: 'ai', name: aNames[i],
        row: aPos[i].r, col: aPos[i].c,
        hp, maxHp: hp, moved: false, acted: false,
        overwatch: false, hunkered: false, alive: true
      });
    }
  }

  function randPositions(rMin, rMax, cMin, cMax, n) {
    let all = [];
    for (let r = rMin; r < rMax; r++)
      for (let c = cMin; c < cMax; c++)
        if (grid[r][c].cover === COVER_NONE) all.push({r, c});
    for (let i = all.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, n);
  }

  // --- Turn Management ---
  function resetTurn(team) {
    soldiers.forEach(s => {
      if (s.team === team && s.alive) {
        s.moved = false;
        s.acted = false;
        s.hunkered = false;
      }
    });
    if (team === 'player') {
      turnInfoEl.textContent = `TURN ${turnNum} — YOUR MOVE  [E] End`;
      turnInfoEl.style.color = '#4488ff';
    }
  }

  function endPlayerTurn() {
    if (turn !== 'player' || aiThinking) return;
    selSoldier = null;
    curAction = null;
    moveRange = [];
    if (checkWin()) return;
    turn = 'ai';
    turnInfoEl.textContent = 'ALIEN ACTIVITY...';
    turnInfoEl.style.color = '#e44';
    resetTurn('ai');
    log('--- Alien turn ---');
    aiThinking = true;
    setTimeout(runAI, 500);
  }

  function endAITurn() {
    aiThinking = false;
    if (checkWin()) return;
    turnNum++;
    turn = 'player';
    resetTurn('player');
    log(`Turn ${turnNum} — Your move.`);
  }

  function checkWin() {
    let pAlive = soldiers.filter(s => s.team === 'player' && s.alive).length;
    let aAlive = soldiers.filter(s => s.team === 'ai' && s.alive).length;
    if (aAlive === 0) {
      if (score > best) { best = score; bestEl.textContent = best; }
      overlayControls.style.display = 'none';
      game.setState('over');
      game.showOverlay('MISSION COMPLETE', `Kills: ${score} — Click to redeploy`);
      return true;
    }
    if (pAlive === 0) {
      if (score > best) { best = score; bestEl.textContent = best; }
      overlayControls.style.display = 'none';
      game.setState('over');
      game.showOverlay('SQUAD WIPED', `Kills: ${score} — Click to redeploy`);
      return true;
    }
    return false;
  }

  // --- Actions ---
  function doMove(s, r, c) {
    s.row = r; s.col = c; s.moved = true; s.overwatch = false;
    log(`${s.name} moves to (${c},${r})`);
    triggerOverwatch(s);
  }

  function triggerOverwatch(mover) {
    let watchers = soldiers.filter(e => e.team !== mover.team && e.alive && e.overwatch);
    for (let w of watchers) {
      if (!mover.alive) break;
      let d = dist(w.row, w.col, mover.row, mover.col);
      if (d <= 8 && lineOfSight(w.row, w.col, mover.row, mover.col)) {
        w.overwatch = false;
        let chance = hitChance(w, mover) - 15;
        chance = Math.max(chance, 5);
        let hit = Math.random() * 100 < chance;
        if (hit) {
          let dmg = 1 + Math.floor(Math.random() * 2);
          mover.hp -= dmg;
          log(`${w.name} OVERWATCH hits ${mover.name} for ${dmg}! (${chance}%)`);
          addFloat(mover.row, mover.col, `-${dmg} OW`, '#f44');
          shootAnim = {from: {r: w.row, c: w.col}, to: {r: mover.row, c: mover.col}, t: 20, color: '#f44'};
          if (mover.hp <= 0) killSoldier(mover);
        } else {
          log(`${w.name} OVERWATCH misses ${mover.name}. (${chance}%)`);
          addFloat(mover.row, mover.col, 'MISS', '#888');
          shootAnim = {from: {r: w.row, c: w.col}, to: {r: mover.row, c: mover.col}, t: 20, color: '#666'};
        }
      }
    }
  }

  function doShoot(atk, tgt) {
    atk.acted = true;
    if (!atk.moved) atk.moved = true;
    let chance = hitChance(atk, tgt);
    let hit = Math.random() * 100 < chance;
    shootAnim = {from: {r: atk.row, c: atk.col}, to: {r: tgt.row, c: tgt.col}, t: 20, color: hit ? '#ff4' : '#666'};
    if (hit) {
      let dmg = 1 + Math.floor(Math.random() * 2);
      tgt.hp -= dmg;
      log(`${atk.name} shoots ${tgt.name} — HIT ${dmg} dmg (${chance}%)`);
      addFloat(tgt.row, tgt.col, `-${dmg}`, '#f44');
      if (tgt.hp <= 0) killSoldier(tgt);
    } else {
      log(`${atk.name} shoots ${tgt.name} — MISS (${chance}%)`);
      addFloat(tgt.row, tgt.col, 'MISS', '#888');
    }
  }

  function doGrenade(atk, r, c) {
    atk.acted = true;
    if (!atk.moved) atk.moved = true;
    log(`${atk.name} throws grenade!`);
    addFloat(r, c, 'BOOM', '#fa0');
    grenadeAnim = {r, c, t: 25};
    let cells = [{r, c}];
    for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) cells.push({r: nr, c: nc});
    }
    for (let cell of cells) {
      if (grid[cell.r][cell.c].cover !== COVER_NONE) {
        grid[cell.r][cell.c].cover = COVER_NONE;
        log(`Cover destroyed at (${cell.c},${cell.r})`);
      }
      let s = soldierAt(cell.r, cell.c);
      if (s) {
        let dmg = (cell.r === r && cell.c === c) ? 3 : 2;
        s.hp -= dmg;
        addFloat(s.row, s.col, `-${dmg}`, '#fa0');
        log(`Grenade hits ${s.name} for ${dmg}!`);
        if (s.hp <= 0) killSoldier(s);
      }
    }
  }

  function doOverwatch(s) {
    s.overwatch = true; s.acted = true;
    if (!s.moved) s.moved = true;
    log(`${s.name} sets Overwatch.`);
    addFloat(s.row, s.col, 'OVERWATCH', '#4e8');
  }

  function doHunker(s) {
    s.hunkered = true; s.acted = true;
    if (!s.moved) s.moved = true;
    log(`${s.name} hunkers down.`);
    addFloat(s.row, s.col, 'HUNKERED', '#48f');
  }

  function killSoldier(s) {
    s.alive = false;
    addFloat(s.row, s.col, 'KIA', '#f00');
    log(`${s.name} is KIA!`);
    if (s.team === 'ai') {
      score++;
      scoreEl.textContent = score;
      game.setScoreFn(() => score);
    }
  }

  // --- AI ---
  function runAI() {
    if (game.state !== 'playing') return;
    let aiUnits = soldiers.filter(s => s.team === 'ai' && s.alive && (!s.moved || !s.acted));
    if (aiUnits.length === 0) {
      endAITurn();
      return;
    }
    let unit = aiUnits[0];
    aiTurn(unit);
    setTimeout(() => {
      if (game.state !== 'playing') return;
      if (checkWin()) return;
      runAI();
    }, 600);
  }

  function aiTurn(s) {
    let enemies = soldiers.filter(e => e.team === 'player' && e.alive);
    if (enemies.length === 0) return;

    let curTargets = shootTargets(s);
    let bestCurTarget = curTargets.sort((a, b) => {
      let scoreA = a.hit + (a.soldier.hp <= 1 ? 40 : 0);
      let scoreB = b.hit + (b.soldier.hp <= 1 ? 40 : 0);
      return scoreB - scoreA;
    })[0] || null;

    if (!s.moved) {
      let moves = calcMoveRange(s);
      if (moves.length > 0) {
        let bestMove = null, bestMoveScore = -9999;
        for (let m of moves) {
          let ms = 0;
          let ac = adjCover(m.r, m.c);
          ms += ac === COVER_FULL ? 30 : ac === COVER_HALF ? 15 : -10;
          let tmpS = {row: m.r, col: m.c, team: 'ai', moved: false, acted: false};
          for (let e of enemies) {
            let d2 = dist(m.r, m.c, e.row, e.col);
            if (d2 <= 10 && lineOfSight(m.r, m.c, e.row, e.col)) {
              let hc = hitChance(tmpS, e);
              ms += hc * 0.4;
              let cv = effectiveCover(tmpS, e);
              if (cv === COVER_NONE) ms += 20;
              if (e.hp <= 2 && hc >= 50) ms += 30;
            }
          }
          let nearEnemies = enemies.filter(e => dist(m.r, m.c, e.row, e.col) <= 2).length;
          ms -= nearEnemies * 15;
          let minDist = Math.min(...enemies.map(e => dist(m.r, m.c, e.row, e.col)));
          if (minDist >= 3 && minDist <= 6) ms += 10;
          let owDanger = soldiers.filter(e => e.team === 'player' && e.alive && e.overwatch).some(w => {
            return dist(w.row, w.col, m.r, m.c) <= 8 && lineOfSight(w.row, w.col, m.r, m.c);
          });
          if (owDanger) ms -= 35;
          if (ms > bestMoveScore) { bestMoveScore = ms; bestMove = m; }
        }
        let curScore = 0;
        curScore += adjCover(s.row, s.col) === COVER_FULL ? 30 : adjCover(s.row, s.col) === COVER_HALF ? 15 : -10;
        if (bestCurTarget) curScore += bestCurTarget.hit * 0.4;
        if (bestMove && (bestMoveScore > curScore + 5 || !bestCurTarget)) {
          doMove(s, bestMove.r, bestMove.c);
          if (!s.alive) return;
        } else {
          s.moved = true;
        }
      }
    }

    if (!s.acted && s.alive) {
      let targets = shootTargets(s);
      targets.sort((a, b) => {
        let sa = a.hit + (a.soldier.hp <= 1 ? 40 : 0) + (a.soldier.hp <= 2 ? 20 : 0);
        let sb = b.hit + (b.soldier.hp <= 1 ? 40 : 0) + (b.soldier.hp <= 2 ? 20 : 0);
        return sb - sa;
      });
      let bestTarget = targets[0] || null;
      let grenadeTarget = aiGrenadeTarget(s);

      if (grenadeTarget && grenadeTarget.value >= 3) {
        doGrenade(s, grenadeTarget.r, grenadeTarget.c);
      } else if (bestTarget && bestTarget.hit >= 25) {
        doShoot(s, bestTarget.soldier);
      } else if (grenadeTarget) {
        doGrenade(s, grenadeTarget.r, grenadeTarget.c);
      } else {
        let nearestEnemy = Math.min(...enemies.map(e => dist(s.row, s.col, e.row, e.col)));
        if (nearestEnemy <= 8) {
          doOverwatch(s);
        } else if (adjCover(s.row, s.col) >= COVER_HALF) {
          doHunker(s);
        } else {
          doOverwatch(s);
        }
      }
    }

    s.moved = true;
    s.acted = true;
  }

  function aiGrenadeTarget(s) {
    let enemies = soldiers.filter(e => e.team === 'player' && e.alive);
    let bestVal = 0, bestPos = null;
    for (let e of enemies) {
      let d = dist(s.row, s.col, e.row, e.col);
      if (d > 6 || d < 2) continue;
      let hits = 0, friendlyHits = 0, coverDestroyed = 0;
      let cells = [{r: e.row, c: e.col}];
      for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let nr = e.row + dr, nc = e.col + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) cells.push({r: nr, c: nc});
      }
      for (let cell of cells) {
        let target = soldierAt(cell.r, cell.c);
        if (target && target.team === 'player') hits++;
        if (target && target.team === 'ai' && target.id !== s.id) friendlyHits++;
        if (grid[cell.r][cell.c].cover !== COVER_NONE) coverDestroyed++;
      }
      let value = hits * 3 - friendlyHits * 5 + coverDestroyed * 0.5;
      if (value > bestVal) { bestVal = value; bestPos = {r: e.row, c: e.col, value}; }
    }
    return bestPos;
  }

  // --- Input setup (direct canvas listeners) ---
  const canvas = document.getElementById('game');

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousemove', e => {
    if (game.state !== 'playing') return;
    let rect = canvas.getBoundingClientRect();
    let mx = (e.clientX - rect.left) * (W / rect.width);
    let my = (e.clientY - rect.top) * (H / rect.height);
    let c = Math.floor((mx - OX) / CELL);
    let r = Math.floor((my - OY) / CELL);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
      if (!hoverCell || hoverCell.r !== r || hoverCell.c !== c) hoverCell = {r, c};
    } else {
      hoverCell = null;
    }
  });

  canvas.addEventListener('click', e => {
    if (game.state === 'waiting') {
      startGame();
      return;
    }
    if (game.state === 'over') {
      initGame();
      return;
    }
    if (turn !== 'player' || aiThinking) return;

    let rect = canvas.getBoundingClientRect();
    let mx = (e.clientX - rect.left) * (W / rect.width);
    let my = (e.clientY - rect.top) * (H / rect.height);
    let col = Math.floor((mx - OX) / CELL);
    let row = Math.floor((my - OY) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    let clicked = soldierAt(row, col);

    if (curAction === 'grenade' && selSoldier && !selSoldier.acted) {
      let d = dist(selSoldier.row, selSoldier.col, row, col);
      if (d >= 2 && d <= 6) {
        doGrenade(selSoldier, row, col);
        curAction = null; selSoldier = null; moveRange = [];
        checkWin();
        return;
      }
    }

    if (clicked && clicked.team === 'player') {
      selSoldier = clicked;
      curAction = null;
      moveRange = calcMoveRange(clicked);
      return;
    }

    if (clicked && clicked.team === 'ai' && selSoldier && !selSoldier.acted) {
      let targets = shootTargets(selSoldier);
      if (targets.some(t => t.soldier.id === clicked.id)) {
        doShoot(selSoldier, clicked);
        selSoldier = null; moveRange = [];
        checkWin();
        return;
      }
    }

    if (!clicked && selSoldier && !selSoldier.moved) {
      if (moveRange.some(m => m.r === row && m.c === col)) {
        doMove(selSoldier, row, col);
        if (!selSoldier.alive) { selSoldier = null; moveRange = []; }
        else { moveRange = []; }
        checkWin();
        return;
      }
    }

    selSoldier = null; curAction = null; moveRange = [];
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button === 2) {
      e.preventDefault();
      if (game.state !== 'playing' || turn !== 'player') return;
      if (selSoldier && !selSoldier.acted) {
        doOverwatch(selSoldier);
        selSoldier = null; moveRange = [];
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (game.state === 'waiting') { startGame(); return; }
    if (game.state === 'over') { initGame(); return; }
    if (game.state === 'playing') {
      if (e.key === 'e' || e.key === 'E') endPlayerTurn();
      if (e.key === 'g' || e.key === 'G') {
        if (selSoldier && !selSoldier.acted) { curAction = 'grenade'; }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (selSoldier && !selSoldier.acted) { doHunker(selSoldier); selSoldier = null; moveRange = []; }
      }
      if (e.key === 'Escape') { curAction = null; }
    }
  });

  // --- Game lifecycle ---
  function initGame() {
    score = 0;
    scoreEl.textContent = '0';
    overlayControls.style.display = 'block';
    genMap();
    game.showOverlay('XCOM TACTICS', 'Click anywhere to deploy');
    game.setState('waiting');
  }

  function startGame() {
    turn = 'player';
    resetTurn('player');
    log('Turn 1 — Select a soldier.');
    game.setState('playing');
  }

  // --- Drawing ---
  function drawGrid(renderer) {
    const gridColor = '#16213e';
    // Horizontal lines
    for (let r = 0; r <= ROWS; r++) {
      renderer.drawLine(OX, OY + r * CELL, OX + COLS * CELL, OY + r * CELL, gridColor, 1);
    }
    // Vertical lines
    for (let c = 0; c <= COLS; c++) {
      renderer.drawLine(OX + c * CELL, OY, OX + c * CELL, OY + ROWS * CELL, gridColor, 1);
    }
    // Hover cell
    if (hoverCell) {
      let x = OX + hoverCell.c * CELL + 1, y = OY + hoverCell.r * CELL + 1;
      let sz = CELL - 2;
      renderer.strokePoly([
        {x, y}, {x: x + sz, y}, {x: x + sz, y: y + sz}, {x, y: y + sz}
      ], '#ffffff33', 1.5);
    }
  }

  function drawCover(renderer, text) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let cv = grid[r][c].cover;
        if (cv === COVER_NONE) continue;
        let x = OX + c * CELL, y = OY + r * CELL;

        if (cv === COVER_FULL) {
          // Wall block
          renderer.fillRect(x + 1, y + 1, CELL - 2, CELL - 2, '#3a3a50');
          renderer.strokePoly([
            {x: x+1, y: y+1}, {x: x+CELL-1, y: y+1},
            {x: x+CELL-1, y: y+CELL-1}, {x: x+1, y: y+CELL-1}
          ], '#555', 1);
          // Brick pattern lines
          const brickColor = '#4a4a60';
          renderer.drawLine(x+1, y + CELL/2, x+CELL-1, y + CELL/2, brickColor, 1);
          renderer.drawLine(x + CELL/2, y+1, x + CELL/2, y + CELL/2, brickColor, 1);
          renderer.drawLine(x + CELL/4, y + CELL/2, x + CELL/4, y+CELL-1, brickColor, 1);
          renderer.drawLine(x + CELL*3/4, y + CELL/2, x + CELL*3/4, y+CELL-1, brickColor, 1);
          // Shield text
          text.drawText('||', x + CELL/2, y + CELL/2 - 4, 8, '#6a6a80', 'center');
        } else {
          // Crate (half cover)
          let cx = x + 4, cy = y + Math.floor(CELL / 3);
          let cw = CELL - 8, ch = Math.floor(CELL * 2/3) - 4;
          renderer.fillRect(cx, cy, cw, ch, '#4a4030');
          renderer.strokePoly([
            {x: cx, y: cy}, {x: cx+cw, y: cy},
            {x: cx+cw, y: cy+ch}, {x: cx, y: cy+ch}
          ], '#6a5a40', 1);
          // Cross lines
          renderer.drawLine(x + CELL/2, cy+2, x + CELL/2, y+CELL-6, '#6a5a40', 1);
          renderer.drawLine(x+6, y + CELL*0.55, x+CELL-6, y + CELL*0.55, '#6a5a40', 1);
        }
      }
    }
  }

  function drawRanges(renderer) {
    if (!selSoldier || turn !== 'player') return;

    // Move range
    if (!selSoldier.moved) {
      for (let m of moveRange) {
        let x = OX + m.c * CELL + 1, y = OY + m.r * CELL + 1;
        renderer.fillRect(x, y, CELL-2, CELL-2, '#4488ff1f');
        renderer.strokePoly([
          {x: x+1, y: y+1}, {x: x+CELL-3, y: y+1},
          {x: x+CELL-3, y: y+CELL-3}, {x: x+1, y: y+CELL-3}
        ], '#4488ff59', 1);
      }
    }

    // Shoot indicators on enemies
    if (!selSoldier.acted && curAction !== 'grenade') {
      let targets = shootTargets(selSoldier);
      for (let t of targets) {
        let x = OX + t.soldier.col * CELL, y = OY + t.soldier.row * CELL;
        let color = t.hit >= 60 ? '#4e8' : t.hit >= 35 ? '#fa0' : '#f44';
        renderer.strokePoly([
          {x: x+1, y: y+1}, {x: x+CELL-1, y: y+1},
          {x: x+CELL-1, y: y+CELL-1}, {x: x+1, y: y+CELL-1}
        ], color, 2);
        // Crosshair circle
        let cx = x + CELL/2, cy = y + CELL/2;
        let r = CELL * 0.3;
        // Approximate circle with polygon (24 segments)
        let pts = [];
        for (let i = 0; i < 24; i++) {
          let a = (i / 24) * Math.PI * 2;
          pts.push({x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r});
        }
        renderer.strokePoly(pts, color, 1.5);
        // Crosshair lines
        renderer.drawLine(cx - CELL*0.4, cy, cx + CELL*0.4, cy, color, 1);
        renderer.drawLine(cx, cy - CELL*0.4, cx, cy + CELL*0.4, color, 1);
      }
    }

    // Grenade range
    if (curAction === 'grenade' && !selSoldier.acted) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let d = dist(selSoldier.row, selSoldier.col, r, c);
          if (d >= 2 && d <= 6) {
            let x = OX + c * CELL + 1, y = OY + r * CELL + 1;
            renderer.fillRect(x, y, CELL-2, CELL-2, '#ffaa0014');
          }
        }
      }
      if (hoverCell) {
        let d = dist(selSoldier.row, selSoldier.col, hoverCell.r, hoverCell.c);
        if (d >= 2 && d <= 6) {
          let cells = [{r: hoverCell.r, c: hoverCell.c}];
          for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            let nr = hoverCell.r + dr, nc = hoverCell.c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) cells.push({r: nr, c: nc});
          }
          for (let cell of cells) {
            let x = OX + cell.c * CELL + 1, y = OY + cell.r * CELL + 1;
            renderer.fillRect(x, y, CELL-2, CELL-2, '#ff780040');
            renderer.strokePoly([
              {x: x+1, y: y+1}, {x: x+CELL-3, y: y+1},
              {x: x+CELL-3, y: y+CELL-3}, {x: x+1, y: y+CELL-3}
            ], '#ff780080', 1);
          }
        }
      }
    }
  }

  function drawRangesText(text) {
    if (!selSoldier || turn !== 'player') return;
    if (!selSoldier.acted && curAction !== 'grenade') {
      let targets = shootTargets(selSoldier);
      for (let t of targets) {
        let x = OX + t.soldier.col * CELL, y = OY + t.soldier.row * CELL;
        let color = t.hit >= 60 ? '#4e8' : t.hit >= 35 ? '#fa0' : '#f44';
        text.drawText(t.hit + '%', x + CELL/2, y + CELL - 12, 9, color, 'center');
      }
    }
  }

  function drawSoldiers(renderer) {
    for (let s of soldiers) {
      if (!s.alive) continue;
      let x = OX + s.col * CELL, y = OY + s.row * CELL;
      let cx = x + CELL / 2, cy = y + CELL / 2;
      let isPlayer = s.team === 'player';
      let dimmed = isPlayer && turn === 'player' && s.moved && s.acted;

      let glowColor = isPlayer ? '#4488ff' : '#ff4444';
      let glowInt = s === selSoldier ? 0.8 : 0.4;
      renderer.setGlow(glowColor, glowInt);

      // Alpha via color channel
      let alpha = dimmed ? '73' : 'ff'; // ~45% or 100%

      // Selection ring
      if (s === selSoldier) {
        renderer.strokePoly([
          {x: x+1, y: y+1}, {x: x+CELL-1, y: y+1},
          {x: x+CELL-1, y: y+CELL-1}, {x: x+1, y: y+CELL-1}
        ], '#ffffff', 2);
      }

      if (isPlayer) {
        // Torso
        renderer.fillRect(cx - 5, cy - 2, 10, 10, '#2255aa' + alpha);
        // Head circle
        renderer.fillCircle(cx, cy - 5, 5, '#4488ff' + alpha);
        // Helmet visor
        renderer.fillRect(cx - 3, cy - 6, 6, 2, '#66aaff' + alpha);
        // Gun
        renderer.fillRect(cx + 4, cy - 1, 7, 2, '#888888' + alpha);
      } else {
        // Alien body
        renderer.fillRect(cx - 6, cy - 1, 12, 9, '#882222' + alpha);
        // Alien head
        renderer.fillCircle(cx, cy - 5, 6, '#cc4444' + alpha);
        // Eyes
        renderer.fillCircle(cx - 3, cy - 5, 2, '#ffff00' + alpha);
        renderer.fillCircle(cx + 3, cy - 5, 2, '#ffff00' + alpha);
      }

      renderer.setGlow(null);

      // HP bar background
      let barW = CELL - 6, barH = 3;
      let barX = x + 3, barY = y + 2;
      renderer.fillRect(barX, barY, barW, barH, '#222222');
      let frac = s.hp / s.maxHp;
      let hpColor = frac > 0.6 ? '#00cc00' : frac > 0.3 ? '#ffaa00' : '#ff0000';
      renderer.fillRect(barX, barY, barW * frac, barH, hpColor);
    }
  }

  function drawSoldiersText(text) {
    for (let s of soldiers) {
      if (!s.alive) continue;
      let x = OX + s.col * CELL, y = OY + s.row * CELL;
      let cx = x + CELL / 2;
      if (s.overwatch) {
        text.drawText('OW', cx, y + CELL - 9, 7, '#44ee88', 'center');
      } else if (s.hunkered) {
        text.drawText('HD', cx, y + CELL - 9, 7, '#4488ff', 'center');
      }
    }
  }

  function drawAnims(renderer) {
    // Shoot line
    if (shootAnim && shootAnim.t > 0) {
      let sa = shootAnim;
      let fx = OX + sa.from.c * CELL + CELL/2, fy = OY + sa.from.r * CELL + CELL/2;
      let tx = OX + sa.to.c * CELL + CELL/2, ty = OY + sa.to.r * CELL + CELL/2;
      let aFrac = sa.t / 20;
      // Encode alpha into color
      let alphaHex = Math.round(aFrac * 255).toString(16).padStart(2, '0');
      let baseColor = expandHex(sa.color);
      if (baseColor.length === 7) {
        renderer.setGlow(baseColor, 0.5 * aFrac);
        renderer.drawLine(fx, fy, tx, ty, baseColor + alphaHex, 2);
        renderer.setGlow(null);
      } else {
        renderer.drawLine(fx, fy, tx, ty, baseColor, 2);
      }
      sa.t--;
    }

    // Grenade explosion
    if (grenadeAnim && grenadeAnim.t > 0) {
      let ga = grenadeAnim;
      let cx = OX + ga.c * CELL + CELL/2, cy = OY + ga.r * CELL + CELL/2;
      let radius = (25 - ga.t) * 3;
      let aFrac = ga.t / 25;
      let alphaHex = Math.round(aFrac * 255).toString(16).padStart(2, '0');
      renderer.setGlow('#ff8800', 0.8 * aFrac);
      // Outer explosion
      let outerPts = [];
      for (let i = 0; i < 20; i++) {
        let a = (i / 20) * Math.PI * 2;
        outerPts.push({x: cx + Math.cos(a)*radius, y: cy + Math.sin(a)*radius});
      }
      renderer.fillPoly(outerPts, '#ffaa00' + alphaHex);
      // Inner explosion
      let innerPts = [];
      let innerR = radius * 0.5;
      for (let i = 0; i < 20; i++) {
        let a = (i / 20) * Math.PI * 2;
        innerPts.push({x: cx + Math.cos(a)*innerR, y: cy + Math.sin(a)*innerR});
      }
      renderer.fillPoly(innerPts, '#ffff00' + alphaHex);
      renderer.setGlow(null);
      ga.t--;
    }
  }

  function drawFloats(renderer, text) {
    for (let i = floats.length - 1; i >= 0; i--) {
      let f = floats[i];
      f.life--;
      f.y -= 0.6;
      let aFrac = Math.min(1, f.life / 25);
      let alphaHex = Math.round(aFrac * 255).toString(16).padStart(2, '0');
      let baseColor = expandHex(f.color);
      renderer.setGlow(baseColor, 0.4 * aFrac);
      text.drawText(f.text, f.x, f.y, 11, baseColor + alphaHex, 'center');
      renderer.setGlow(null);
      if (f.life <= 0) floats.splice(i, 1);
    }
  }

  function drawPanel(renderer, text) {
    // Background
    renderer.fillRect(0, PANEL_Y, W, H - PANEL_Y, '#16213e');
    renderer.drawLine(0, PANEL_Y, W, PANEL_Y, '#0f3460', 1);

    // Log messages (left side)
    for (let i = 0; i < logs.length; i++) {
      let color = i === 0 ? '#44ee88' : '#555555';
      let msg = logs[i];
      if (msg.length > 55) msg = msg.substring(0, 54) + '..';
      text.drawText(msg, 8, PANEL_Y + 4 + i * 12, 9, color, 'left');
    }

    // Selected soldier info (right side)
    if (selSoldier && turn === 'player') {
      let s = selSoldier;
      let rx = W - 200;
      text.drawText(s.name, rx, PANEL_Y + 4, 10, '#4488ff', 'left');
      text.drawText(`HP: ${s.hp}/${s.maxHp}`, rx, PANEL_Y + 16, 10, '#aaaaaa', 'left');
      let hints = [];
      if (!s.moved) hints.push('Move');
      if (!s.acted) hints.push('Shoot/[G]ren/[H]unk/RClick:OW');
      text.drawText(hints.join(' | '), rx, PANEL_Y + 28, 8, '#666666', 'left');
      if (curAction === 'grenade') {
        text.drawText('GRENADE MODE [Esc cancel]', rx, PANEL_Y + 40, 8, '#ffaa00', 'left');
      }
    }

    // Hover info
    if (hoverCell && turn === 'player') {
      let s = soldierAt(hoverCell.r, hoverCell.c);
      if (s) {
        let color = s.team === 'player' ? '#4488ff' : '#ee4444';
        text.drawText(`${s.name} HP:${s.hp}/${s.maxHp}`, W/2, PANEL_Y + 40, 9, color, 'center');
        let cv = adjCover(s.row, s.col);
        let cvText = cv === COVER_FULL ? 'Full Cover' : cv === COVER_HALF ? 'Half Cover' : 'No Cover';
        let statusExtra = (s.overwatch ? ' [OW]' : '') + (s.hunkered ? ' [HD]' : '');
        text.drawText(cvText + statusExtra, W/2, PANEL_Y + 52, 9, '#777777', 'center');
      } else {
        let cv = grid[hoverCell.r][hoverCell.c].cover;
        if (cv > 0) {
          text.drawText(cv === COVER_FULL ? 'Full Cover (+50% def)' : 'Half Cover (+25% def)', W/2, PANEL_Y + 40, 9, '#666666', 'center');
        }
      }
    }
  }

  // --- Game setup ---
  game.onInit = () => {
    genMap();
    game.showOverlay('XCOM TACTICS', 'Click anywhere to deploy');
    game.setState('waiting');
    overlayControls.style.display = 'block';
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    // Floats decay is handled in draw; no fixed-step physics needed beyond that
  };

  game.onDraw = (renderer, text) => {
    drawGrid(renderer);
    drawCover(renderer, text);
    drawRanges(renderer);
    drawRangesText(text);
    drawSoldiers(renderer);
    drawSoldiersText(text);
    drawAnims(renderer);
    drawFloats(renderer, text);
    drawPanel(renderer, text);
  };

  game.start();
  return game;
}
