// pocket-generals/game.js — Pocket Generals ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const COLS = 8, ROWS = 8;
const CELL_W = 60, CELL_H = 50;
const GRID_X = (W - COLS * CELL_W) / 2;   // 60
const GRID_Y = 10;
const GRID_BOTTOM = GRID_Y + ROWS * CELL_H; // 410
const BTN_Y = GRID_BOTTOM + 16;
const BTN_W = 120, BTN_H = 36;
const BTN_X = (W - BTN_W) / 2;

// Terrain types
const PLAIN = 0, MOUNTAIN = 1, FOREST = 2;
const TERRAIN_NAMES = ['Plains', 'Mountain', 'Forest'];

// Unit types
const INFANTRY  = 'infantry';
const TANK      = 'tank';
const ARTILLERY = 'artillery';

const UNIT_STATS = {
  [INFANTRY]:  { move: 1, hp: 3, atk: 2, minRange: 1, maxRange: 1, value: 10 },
  [TANK]:      { move: 2, hp: 5, atk: 4, minRange: 1, maxRange: 1, value: 20 },
  [ARTILLERY]: { move: 1, hp: 2, atk: 5, minRange: 2, maxRange: 3, value: 15 },
};

// ── Module-scope state ──
let score = 0;
let aiScore = 0;
let terrain = [];
let units = [];
let bases = { player: null, ai: null };
let currentTurn = 'player';
let phase = 'select';
let selectedUnit = null;
let movableCells = [];
let attackableCells = [];
let movedUnits = new Set();
let hoverCell = null;
let turnNumber = 0;
let statusMessage = '';

// Pending mouse events consumed in onUpdate
let pendingClicks = [];
let pendingMoves  = [];

// ── DOM refs ──
const scoreEl         = document.getElementById('score');
const aiScoreEl       = document.getElementById('aiScore');
const turnIndicatorEl = document.getElementById('turnIndicator');

// ── Helpers ──

function getUnitAt(r, c) {
  return units.find(u => u.row === r && u.col === c && u.hp > 0);
}

function manhattan(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

// ── Map generation ──

function generateTerrain() {
  terrain = [];
  for (let r = 0; r < ROWS; r++) {
    terrain[r] = [];
    for (let c = 0; c < COLS; c++) terrain[r][c] = PLAIN;
  }
  const mountainPositions = [[2, 3], [2, 4], [5, 3], [5, 4], [3, 1], [4, 6]];
  mountainPositions.forEach(([r, c]) => {
    terrain[r][c] = MOUNTAIN;
    terrain[ROWS - 1 - r][COLS - 1 - c] = MOUNTAIN;
  });
  const forestPositions = [[1, 2], [1, 5], [3, 3], [4, 4], [6, 1], [6, 6], [2, 6], [5, 1]];
  forestPositions.forEach(([r, c]) => {
    if (terrain[r][c] === PLAIN) terrain[r][c] = FOREST;
    const sr = ROWS - 1 - r, sc = COLS - 1 - c;
    if (terrain[sr][sc] === PLAIN) terrain[sr][sc] = FOREST;
  });
  terrain[0][0] = PLAIN; terrain[0][1] = PLAIN; terrain[1][0] = PLAIN;
  terrain[7][7] = PLAIN; terrain[7][6] = PLAIN; terrain[6][7] = PLAIN;
}

function createUnit(type, team, row, col) {
  const stats = UNIT_STATS[type];
  return {
    type, team, row, col,
    hp: stats.hp, maxHp: stats.hp,
    atk: stats.atk, move: stats.move,
    minRange: stats.minRange, maxRange: stats.maxRange,
    id: Math.random().toString(36).substr(2, 9),
  };
}

function initGame() {
  generateTerrain();
  units = [];
  movedUnits = new Set();

  units.push(createUnit(INFANTRY,  'player', 7, 1));
  units.push(createUnit(INFANTRY,  'player', 6, 0));
  units.push(createUnit(INFANTRY,  'player', 7, 2));
  units.push(createUnit(TANK,      'player', 6, 1));
  units.push(createUnit(ARTILLERY, 'player', 7, 0));

  units.push(createUnit(INFANTRY,  'ai', 0, 6));
  units.push(createUnit(INFANTRY,  'ai', 1, 7));
  units.push(createUnit(INFANTRY,  'ai', 0, 5));
  units.push(createUnit(TANK,      'ai', 1, 6));
  units.push(createUnit(ARTILLERY, 'ai', 0, 7));

  bases.player = { row: 7, col: 0 };
  bases.ai     = { row: 0, col: 7 };

  currentTurn  = 'player';
  phase        = 'select';
  selectedUnit = null;
  movableCells = [];
  attackableCells = [];
  turnNumber   = 1;
  score        = 0;
  aiScore      = 0;
  statusMessage = '';
  if (scoreEl)   scoreEl.textContent   = '0';
  if (aiScoreEl) aiScoreEl.textContent = '0';
  if (turnIndicatorEl) turnIndicatorEl.textContent = 'Your Turn';
}

// ── Pathfinding & range ──

function getMovableCells(unit) {
  const cells = [];
  const visited = {};
  const queue = [{ r: unit.row, c: unit.col, steps: 0 }];
  visited[`${unit.row},${unit.col}`] = true;
  while (queue.length > 0) {
    const { r, c, steps } = queue.shift();
    if (steps > 0) {
      const occupant = getUnitAt(r, c);
      if (!occupant) cells.push({ r, c });
    }
    if (steps < unit.move) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        const key = `${nr},${nc}`;
        if (inBounds(nr, nc) && !visited[key] && terrain[nr][nc] !== MOUNTAIN) {
          const occupant = getUnitAt(nr, nc);
          if (!occupant || (occupant.team === unit.team && steps + 1 < unit.move)) {
            visited[key] = true;
            queue.push({ r: nr, c: nc, steps: steps + 1 });
          }
        }
      }
    }
  }
  return cells;
}

function getAttackableCells(unit, fromRow, fromCol) {
  const cells = [];
  const fr = fromRow !== undefined ? fromRow : unit.row;
  const fc = fromCol !== undefined ? fromCol : unit.col;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dist = manhattan(fr, fc, r, c);
      if (dist >= unit.minRange && dist <= unit.maxRange) {
        const target = getUnitAt(r, c);
        if (target && target.team !== unit.team) cells.push({ r, c });
      }
    }
  }
  return cells;
}

// ── Combat ──

function getTerrainDefenseBonus(r, c) {
  return terrain[r][c] === FOREST ? 1 : 0;
}

function performAttack(attacker, defender) {
  const defBonus = getTerrainDefenseBonus(defender.row, defender.col);
  const damage = Math.max(1, attacker.atk - defBonus);
  defender.hp -= damage;
  let killed = false;
  if (defender.hp <= 0) {
    defender.hp = 0;
    killed = true;
    if (attacker.team === 'player') {
      score += UNIT_STATS[defender.type].value;
      if (scoreEl) scoreEl.textContent = score;
    } else {
      aiScore += UNIT_STATS[defender.type].value;
      if (aiScoreEl) aiScoreEl.textContent = aiScore;
    }
  }
  return { damage, killed };
}

// ── Win check ──

function checkVictory() {
  const playerUnits = units.filter(u => u.team === 'player' && u.hp > 0);
  const aiUnits     = units.filter(u => u.team === 'ai'     && u.hp > 0);
  const unitOnAiBase     = units.find(u => u.team === 'player' && u.hp > 0 &&
                             u.row === bases.ai.row     && u.col === bases.ai.col);
  const unitOnPlayerBase = units.find(u => u.team === 'ai'     && u.hp > 0 &&
                             u.row === bases.player.row && u.col === bases.player.col);
  if (unitOnAiBase     || aiUnits.length     === 0) return 'player';
  if (unitOnPlayerBase || playerUnits.length === 0) return 'ai';
  return null;
}

// ── AI ──

function evaluateBoard(state) {
  let playerSc = 0, aiSc = 0;
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const stats = UNIT_STATS[u.type];
    const hpRatio = u.hp / stats.hp;
    let val = stats.value * hpRatio;
    if (u.team === 'ai') {
      val += (14 - manhattan(u.row, u.col, bases.player.row, bases.player.col)) * 0.5;
      if (u.type === ARTILLERY) {
        const hasGuard = state.units.some(g => g.team === 'ai' && g.hp > 0 &&
          g.type === INFANTRY && manhattan(g.row, g.col, u.row, u.col) <= 1);
        if (hasGuard) val += 3;
      }
      aiSc += val;
    } else {
      val += (14 - manhattan(u.row, u.col, bases.ai.row, bases.ai.col)) * 0.5;
      playerSc += val;
    }
  }
  if (state.units.some(u => u.team === 'ai'     && u.hp > 0 &&
      u.row === bases.player.row && u.col === bases.player.col)) aiSc += 100;
  if (state.units.some(u => u.team === 'player' && u.hp > 0 &&
      u.row === bases.ai.row     && u.col === bases.ai.col))     playerSc += 100;
  return aiSc - playerSc;
}

function getAIMoves(state) {
  const moves = [];
  const aiUnits = state.units.filter(u => u.team === 'ai' && u.hp > 0);
  for (const unit of aiUnits) {
    const moveCells = [{ r: unit.row, c: unit.col }];
    const visited = {};
    const queue = [{ r: unit.row, c: unit.col, steps: 0 }];
    visited[`${unit.row},${unit.col}`] = true;
    while (queue.length > 0) {
      const { r, c, steps } = queue.shift();
      if (steps > 0) {
        const occ = state.units.find(u => u.row === r && u.col === c && u.hp > 0);
        if (!occ) moveCells.push({ r, c });
      }
      if (steps < unit.move) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr, nc = c + dc;
          const key = `${nr},${nc}`;
          if (inBounds(nr, nc) && !visited[key] && terrain[nr][nc] !== MOUNTAIN) {
            const occ = state.units.find(u => u.row === nr && u.col === nc && u.hp > 0);
            if (!occ || (occ.team === 'ai' && occ.id !== unit.id)) {
              visited[key] = true;
              queue.push({ r: nr, c: nc, steps: steps + 1 });
            }
          }
        }
      }
    }
    for (const mc of moveCells) {
      const attackTargets = [];
      for (const t of state.units) {
        if (t.team === 'player' && t.hp > 0) {
          const dist = manhattan(mc.r, mc.c, t.row, t.col);
          if (dist >= unit.minRange && dist <= unit.maxRange) attackTargets.push(t);
        }
      }
      if (attackTargets.length > 0) {
        for (const target of attackTargets) moves.push({ unit, moveTo: mc, attack: target });
      } else {
        moves.push({ unit, moveTo: mc, attack: null });
      }
    }
  }
  return moves;
}

function aiMinimax(state, depth, isMax, alpha, beta) {
  const aiAlive = state.units.filter(u => u.team === 'ai'     && u.hp > 0);
  const plAlive = state.units.filter(u => u.team === 'player' && u.hp > 0);
  if (aiAlive.length === 0) return -1000;
  if (plAlive.length === 0) return  1000;
  if (depth === 0) return evaluateBoard(state);

  if (isMax) {
    let best = -Infinity;
    const moves = getAIMoves(state);
    if (moves.length === 0) return evaluateBoard(state);
    const scoredMoves = moves.map(m => {
      let h = 0;
      if (m.attack) {
        h += m.attack.hp <= m.unit.atk ? 50 : m.unit.atk * 3;
        h += UNIT_STATS[m.attack.type].value;
      }
      h += (ROWS - manhattan(m.moveTo.r, m.moveTo.c, bases.player.row, bases.player.col)) * 0.5;
      return { ...m, h };
    });
    scoredMoves.sort((a, b) => b.h - a.h);
    for (const move of scoredMoves.slice(0, 8)) {
      const saved = {
        unitRow: move.unit.row, unitCol: move.unit.col,
        targetHp: move.attack ? move.attack.hp : 0,
      };
      move.unit.row = move.moveTo.r;
      move.unit.col = move.moveTo.c;
      if (move.attack) {
        const defBonus = getTerrainDefenseBonus(move.attack.row, move.attack.col);
        move.attack.hp -= Math.max(1, move.unit.atk - defBonus);
      }
      const val = aiMinimax(state, depth - 1, false, alpha, beta);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      move.unit.row = saved.unitRow;
      move.unit.col = saved.unitCol;
      if (move.attack) move.attack.hp = saved.targetHp;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    return evaluateBoard(state);
  }
}

function aiTakeTurn(game) {
  phase = 'aiTurn';
  if (turnIndicatorEl) turnIndicatorEl.textContent = 'AI Turn...';
  statusMessage = 'AI is thinking...';

  setTimeout(() => {
    const aiUnits = units.filter(u => u.team === 'ai' && u.hp > 0);
    const moveQueue = [];
    const usedCells = new Set();

    const sortedUnits = [...aiUnits].sort((a, b) => {
      const order = { artillery: 0, tank: 1, infantry: 2 };
      return order[a.type] - order[b.type];
    });

    for (const unit of sortedUnits) {
      const state = {
        units: units.filter(u => u.hp > 0).map(u => ({ ...u })),
        terrain,
      };
      const stateUnit = state.units.find(u => u.id === unit.id);
      if (!stateUnit || stateUnit.hp <= 0) continue;

      let bestScore = -Infinity;
      let bestMove  = null;

      const moveCells = [{ r: unit.row, c: unit.col }];
      const visited = {};
      const queue = [{ r: unit.row, c: unit.col, steps: 0 }];
      visited[`${unit.row},${unit.col}`] = true;
      while (queue.length > 0) {
        const { r, c, steps } = queue.shift();
        if (steps > 0) {
          const occupant = getUnitAt(r, c);
          if (!occupant && !usedCells.has(`${r},${c}`)) moveCells.push({ r, c });
        }
        if (steps < unit.move) {
          for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (inBounds(nr, nc) && !visited[key] && terrain[nr][nc] !== MOUNTAIN) {
              const occ = getUnitAt(nr, nc);
              if (!occ || occ.team === 'ai') { visited[key] = true; queue.push({ r: nr, c: nc, steps: steps + 1 }); }
            }
          }
        }
      }

      for (const mc of moveCells) {
        const targets = [];
        for (const t of units) {
          if (t.team === 'player' && t.hp > 0) {
            const dist = manhattan(mc.r, mc.c, t.row, t.col);
            if (dist >= unit.minRange && dist <= unit.maxRange) targets.push(t);
          }
        }
        const tryAttacks = targets.length > 0 ? targets : [null];
        for (const target of tryAttacks) {
          const saved = {
            unitRow: stateUnit.row, unitCol: stateUnit.col,
            targetHp: target ? state.units.find(u => u.id === target.id)?.hp : 0,
            targetRef: target ? state.units.find(u => u.id === target.id) : null,
          };
          stateUnit.row = mc.r;
          stateUnit.col = mc.c;
          if (target && saved.targetRef) {
            const defBonus = getTerrainDefenseBonus(target.row, target.col);
            saved.targetRef.hp -= Math.max(1, unit.atk - defBonus);
          }
          const val = aiMinimax(state, 1, false, -Infinity, Infinity);
          stateUnit.row = saved.unitRow;
          stateUnit.col = saved.unitCol;
          if (saved.targetRef) saved.targetRef.hp = saved.targetHp;

          let bonus = 0;
          if (target) {
            bonus += 5;
            if (target.hp <= unit.atk) bonus += 15;
          }
          if (unit.type === ARTILLERY) {
            const adjEnemy = units.some(u => u.team === 'player' && u.hp > 0 &&
              manhattan(mc.r, mc.c, u.row, u.col) === 1);
            if (adjEnemy) bonus -= 10;
          }
          const totalScore = val + bonus;
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMove = { unit, moveTo: mc, attack: target };
          }
        }
      }

      if (bestMove) {
        moveQueue.push(bestMove);
        usedCells.add(`${bestMove.moveTo.r},${bestMove.moveTo.c}`);
      }
    }

    executeAIMoves(moveQueue, 0, game);
  }, 300);
}

function executeAIMoves(queue, index, game) {
  if (index >= queue.length) {
    const victor = checkVictory();
    if (victor) { endGame(victor, game); return; }
    currentTurn = 'player';
    phase = 'select';
    movedUnits = new Set();
    turnNumber++;
    if (turnIndicatorEl) turnIndicatorEl.textContent = 'Your Turn';
    statusMessage = `Turn ${turnNumber} - Select a unit`;
    return;
  }
  const move = queue[index];
  if (move.unit.hp <= 0) { executeAIMoves(queue, index + 1, game); return; }

  move.unit.row = move.moveTo.r;
  move.unit.col = move.moveTo.c;
  statusMessage = `AI moves ${move.unit.type}`;

  setTimeout(() => {
    if (move.attack && move.attack.hp > 0) {
      const result = performAttack(move.unit, move.attack);
      statusMessage = `AI ${move.unit.type} attacks! ${result.damage} dmg${result.killed ? ' - DESTROYED!' : ''}`;
      if (result.killed) units = units.filter(u => u.hp > 0);
      const victor = checkVictory();
      if (victor) { setTimeout(() => endGame(victor, game), 400); return; }
    }
    setTimeout(() => executeAIMoves(queue, index + 1, game), 350);
  }, 300);
}

// ── Turn management ──

function endPlayerTurn(game) {
  if (currentTurn !== 'player' || phase === 'aiTurn' || phase === 'animating') return;
  selectedUnit = null;
  movableCells = [];
  attackableCells = [];
  phase = 'select';
  const victor = checkVictory();
  if (victor) { endGame(victor, game); return; }
  currentTurn = 'ai';
  aiTakeTurn(game);
}

function endGame(winner, game) {
  if (winner === 'player') {
    game.showOverlay('VICTORY!', `Score: ${score} pts - Click to play again`);
  } else {
    game.showOverlay('DEFEAT', `Score: ${score} pts - Click to play again`);
  }
  game.setState('over');
}

// ── Input handling ──

function getCellFromMouse(mx, my) {
  const c = Math.floor((mx - GRID_X) / CELL_W);
  const r = Math.floor((my - GRID_Y) / CELL_H);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
  return null;
}

function isInButton(mx, my) {
  return mx >= BTN_X && mx <= BTN_X + BTN_W && my >= BTN_Y && my <= BTN_Y + BTN_H;
}

function handlePlayerClick(r, c, game) {
  if (phase === 'select') {
    const unit = getUnitAt(r, c);
    if (unit && unit.team === 'player' && !movedUnits.has(unit.id)) {
      selectedUnit = unit;
      movableCells = getMovableCells(unit);
      attackableCells = getAttackableCells(unit, unit.row, unit.col);
      phase = 'move';
      statusMessage = `${unit.type} selected - Click to move or attack`;
    } else if (unit && unit.team === 'player' && movedUnits.has(unit.id)) {
      statusMessage = 'That unit already moved this turn';
    }
  } else if (phase === 'move') {
    const target = getUnitAt(r, c);
    if (target && target.team === 'ai' && target.hp > 0) {
      const dist = manhattan(selectedUnit.row, selectedUnit.col, r, c);
      if (dist >= selectedUnit.minRange && dist <= selectedUnit.maxRange) {
        const result = performAttack(selectedUnit, target);
        statusMessage = `${selectedUnit.type} attacks ${target.type}! ${result.damage} dmg${result.killed ? ' - DESTROYED!' : ''}`;
        if (result.killed) units = units.filter(u => u.hp > 0);
        movedUnits.add(selectedUnit.id);
        selectedUnit = null; movableCells = []; attackableCells = [];
        phase = 'select';
        const victor = checkVictory();
        if (victor) { setTimeout(() => endGame(victor, game), 300); }
        return;
      }
    }

    const isMovable = movableCells.some(m => m.r === r && m.c === c);
    if (isMovable) {
      selectedUnit.row = r;
      selectedUnit.col = c;
      attackableCells = getAttackableCells(selectedUnit, r, c);
      movableCells = [];
      if (attackableCells.length > 0) {
        phase = 'attack';
        statusMessage = 'Click enemy to attack or click elsewhere to skip';
      } else {
        movedUnits.add(selectedUnit.id);
        const victor = checkVictory();
        if (victor) { setTimeout(() => endGame(victor, game), 300); return; }
        selectedUnit = null; attackableCells = [];
        phase = 'select';
        statusMessage = 'Select another unit or End Turn';
      }
      return;
    }

    // Deselect / reselect
    selectedUnit = null; movableCells = []; attackableCells = [];
    phase = 'select';
    const newUnit = getUnitAt(r, c);
    if (newUnit && newUnit.team === 'player' && !movedUnits.has(newUnit.id)) {
      selectedUnit = newUnit;
      movableCells = getMovableCells(newUnit);
      attackableCells = getAttackableCells(newUnit, newUnit.row, newUnit.col);
      phase = 'move';
      statusMessage = `${newUnit.type} selected - Click to move or attack`;
    } else {
      statusMessage = 'Select a unit';
    }
  } else if (phase === 'attack') {
    const isAttackable = attackableCells.some(a => a.r === r && a.c === c);
    if (isAttackable) {
      const target = getUnitAt(r, c);
      if (target && target.team === 'ai') {
        const result = performAttack(selectedUnit, target);
        statusMessage = `${selectedUnit.type} attacks ${target.type}! ${result.damage} dmg${result.killed ? ' - DESTROYED!' : ''}`;
        if (result.killed) units = units.filter(u => u.hp > 0);
      }
    } else {
      statusMessage = 'Attack skipped';
    }
    movedUnits.add(selectedUnit.id);
    selectedUnit = null; movableCells = []; attackableCells = [];
    phase = 'select';
    const victor = checkVictory();
    if (victor) { setTimeout(() => endGame(victor, game), 300); return; }
  }
}

// ── Drawing ──

function drawTerrain(renderer, text) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = GRID_X + c * CELL_W;
      const y = GRID_Y + r * CELL_H;
      const t = terrain[r][c];

      // Base fill
      const bgColor = t === MOUNTAIN ? '#3a3a4e' : t === FOREST ? '#2a4a2a' : '#2a2a3e';
      renderer.fillRect(x, y, CELL_W, CELL_H, bgColor);

      // Grid lines (1px borders via thin rects)
      renderer.fillRect(x, y, CELL_W, 1, '#444');
      renderer.fillRect(x, y, 1, CELL_H, '#444');
      renderer.fillRect(x + CELL_W - 1, y, 1, CELL_H, '#444');
      renderer.fillRect(x, y + CELL_H - 1, CELL_W, 1, '#444');

      if (t === MOUNTAIN) {
        // Dark triangle body
        renderer.fillPoly([
          { x: x + CELL_W * 0.3, y: y + CELL_H * 0.75 },
          { x: x + CELL_W * 0.5, y: y + CELL_H * 0.25 },
          { x: x + CELL_W * 0.7, y: y + CELL_H * 0.75 },
        ], '#666');
        // Snow cap
        renderer.fillPoly([
          { x: x + CELL_W * 0.42, y: y + CELL_H * 0.50 },
          { x: x + CELL_W * 0.5,  y: y + CELL_H * 0.35 },
          { x: x + CELL_W * 0.58, y: y + CELL_H * 0.50 },
        ], '#888');
      }

      if (t === FOREST) {
        // Trunk
        renderer.fillRect(x + CELL_W * 0.46, y + CELL_H * 0.6, CELL_W * 0.08, CELL_H * 0.2, '#3a7a3a');
        // Canopy
        renderer.fillPoly([
          { x: x + CELL_W * 0.3,  y: y + CELL_H * 0.65 },
          { x: x + CELL_W * 0.5,  y: y + CELL_H * 0.2  },
          { x: x + CELL_W * 0.7,  y: y + CELL_H * 0.65 },
        ], '#3a7a3a');
      }
    }
  }

  // Bases
  drawBase(renderer, text, bases.player.row, bases.player.col, '#4488ff');
  drawBase(renderer, text, bases.ai.row,     bases.ai.col,     '#ee5555');
}

function drawBase(renderer, text, r, c, color) {
  const x = GRID_X + c * CELL_W;
  const y = GRID_Y + r * CELL_H;

  // Background tint (33 = ~20% opacity)
  renderer.fillRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4, color + '33');

  // Flag pole
  renderer.drawLine(x + CELL_W * 0.35, y + CELL_H * 0.2, x + CELL_W * 0.35, y + CELL_H * 0.8, color, 2);

  // Flag banner (filled polygon, ~67% opacity)
  renderer.fillPoly([
    { x: x + CELL_W * 0.35, y: y + CELL_H * 0.20 },
    { x: x + CELL_W * 0.70, y: y + CELL_H * 0.32 },
    { x: x + CELL_W * 0.35, y: y + CELL_H * 0.45 },
  ], color + 'aa');

  text.drawText('BASE', x + CELL_W / 2, y + CELL_H * 0.83, 8, color, 'center');
}

function drawHighlights(renderer) {
  for (const cell of movableCells) {
    const x = GRID_X + cell.c * CELL_W;
    const y = GRID_Y + cell.r * CELL_H;
    renderer.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2, '#4488ff40');
    renderer.strokePoly([
      { x: x + 2,           y: y + 2           },
      { x: x + CELL_W - 2, y: y + 2           },
      { x: x + CELL_W - 2, y: y + CELL_H - 2  },
      { x: x + 2,           y: y + CELL_H - 2  },
    ], '#4488ff99', 2);
  }
  for (const cell of attackableCells) {
    const x = GRID_X + cell.c * CELL_W;
    const y = GRID_Y + cell.r * CELL_H;
    renderer.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2, '#ee555540');
    renderer.strokePoly([
      { x: x + 2,           y: y + 2           },
      { x: x + CELL_W - 2, y: y + 2           },
      { x: x + CELL_W - 2, y: y + CELL_H - 2  },
      { x: x + 2,           y: y + CELL_H - 2  },
    ], '#ee5555b0', 2);
  }
  // Hover
  if (hoverCell && hoverCell.r !== undefined && inBounds(hoverCell.r, hoverCell.c)) {
    const x = GRID_X + hoverCell.c * CELL_W;
    const y = GRID_Y + hoverCell.r * CELL_H;
    renderer.strokePoly([
      { x: x + 1,           y: y + 1           },
      { x: x + CELL_W - 1, y: y + 1           },
      { x: x + CELL_W - 1, y: y + CELL_H - 1  },
      { x: x + 1,           y: y + CELL_H - 1  },
    ], '#ffffff40', 1);
  }
}

function drawUnit(renderer, text, unit) {
  if (unit.hp <= 0) return;
  const cx = GRID_X + unit.col * CELL_W + CELL_W / 2;
  const cy = GRID_Y + unit.row * CELL_H + CELL_H / 2;
  const isPlayer = unit.team === 'player';
  const baseColor = isPlayer ? '#4488ff' : '#ee5555';
  const darkColor = isPlayer ? '#2266cc' : '#cc3333';
  const isMoved = movedUnits.has(unit.id);
  const isSelected = selectedUnit && selectedUnit.id === unit.id;

  // Alpha for moved units: encode into color string as hex alpha
  const alpha = (isMoved && currentTurn === 'player' && unit.team === 'player') ? '80' : 'ff';
  const fillCol  = baseColor + alpha;
  const strokeCol = darkColor + alpha;

  if (isSelected) {
    renderer.setGlow(baseColor, 0.8);
  }

  if (unit.type === INFANTRY) {
    const size = 14;
    renderer.fillRect(cx - size / 2, cy - size / 2, size, size, fillCol);
    renderer.strokePoly([
      { x: cx - size / 2,  y: cy - size / 2  },
      { x: cx + size / 2,  y: cy - size / 2  },
      { x: cx + size / 2,  y: cy + size / 2  },
      { x: cx - size / 2,  y: cy + size / 2  },
    ], strokeCol, 2);
  } else if (unit.type === TANK) {
    const size = 16;
    renderer.fillPoly([
      { x: cx,        y: cy - size },
      { x: cx + size, y: cy        },
      { x: cx,        y: cy + size },
      { x: cx - size, y: cy        },
    ], fillCol);
    renderer.strokePoly([
      { x: cx,        y: cy - size },
      { x: cx + size, y: cy        },
      { x: cx,        y: cy + size },
      { x: cx - size, y: cy        },
    ], strokeCol, 2);
  } else if (unit.type === ARTILLERY) {
    const size = 14;
    renderer.fillPoly([
      { x: cx,          y: cy - size          },
      { x: cx + size,   y: cy + size * 0.7    },
      { x: cx - size,   y: cy + size * 0.7    },
    ], fillCol);
    renderer.strokePoly([
      { x: cx,          y: cy - size          },
      { x: cx + size,   y: cy + size * 0.7    },
      { x: cx - size,   y: cy + size * 0.7    },
    ], strokeCol, 2);
  }

  if (isSelected) renderer.setGlow(null);

  // HP bar
  const barW = CELL_W * 0.65;
  const barH = 4;
  const barX = cx - barW / 2;
  const barY = GRID_Y + unit.row * CELL_H + CELL_H - 10;
  const hpRatio = unit.hp / unit.maxHp;

  renderer.fillRect(barX, barY, barW, barH, '#333333');
  const hpColor = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.25 ? '#cccc44' : '#cc4444';
  renderer.fillRect(barX, barY, barW * hpRatio, barH, hpColor);

  // Unit label
  const label = unit.type === INFANTRY ? 'INF' : unit.type === TANK ? 'TNK' : 'ART';
  text.drawText(label, cx, GRID_Y + unit.row * CELL_H + 2, 8, '#dddddd', 'center');
}

function drawEndTurnButton(renderer, text, isHover) {
  const btnColor = isHover ? '#ee555566' : '#ee555533';
  renderer.fillRect(BTN_X, BTN_Y, BTN_W, BTN_H, btnColor);
  renderer.strokePoly([
    { x: BTN_X,         y: BTN_Y         },
    { x: BTN_X + BTN_W, y: BTN_Y         },
    { x: BTN_X + BTN_W, y: BTN_Y + BTN_H },
    { x: BTN_X,         y: BTN_Y + BTN_H },
  ], '#ee5555', 2);
  text.drawText('END TURN', BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2 - 7, 14, '#ee5555', 'center');
}

function drawStatusBar(text) {
  const y = GRID_BOTTOM + 60;
  if (statusMessage) {
    text.drawText(statusMessage, W / 2, y - 14, 11, '#888888', 'center');
  }
  if (hoverCell && hoverCell.r !== undefined && inBounds(hoverCell.r, hoverCell.c)) {
    const t = TERRAIN_NAMES[terrain[hoverCell.r][hoverCell.c]];
    const u = getUnitAt(hoverCell.r, hoverCell.c);
    let info = t;
    if (terrain[hoverCell.r][hoverCell.c] === FOREST) info += ' (+1 DEF)';
    if (u) {
      const stats = UNIT_STATS[u.type];
      info += ` | ${u.team === 'player' ? 'Player' : 'AI'} ${u.type} HP:${u.hp}/${stats.hp} ATK:${stats.atk}`;
      if (u.type === ARTILLERY) info += ` RNG:${stats.minRange}-${stats.maxRange}`;
    }
    text.drawText(info, W / 2, y + 2, 11, '#aaaaaa', 'center');
  }
  // Turn number
  text.drawText(`Turn ${turnNumber}`, GRID_X + COLS * CELL_W - 4, GRID_Y + ROWS * CELL_H + 76, 10, '#666666', 'right');
}

// ── Entry point ──

export function createGame() {
  const game = new Game('game');

  // Initialise game state to show a preview board before starting
  initGame();

  game.onInit = () => {
    game.showOverlay('POCKET GENERALS', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Register canvas mouse events (direct, as per instructions)
  const canvas = game.canvas;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    pendingMoves.push({ mx, my });
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    pendingClicks.push({ mx: e.clientX - rect.left, my: e.clientY - rect.top });
  });

  game.onUpdate = () => {
    // Process mouse moves (just update hover, last one wins)
    for (const { mx, my } of pendingMoves) {
      const cell = getCellFromMouse(mx, my);
      if (cell) {
        hoverCell = cell;
      } else if (isInButton(mx, my)) {
        hoverCell = { btn: true };
      } else {
        hoverCell = null;
      }
    }
    pendingMoves.length = 0;

    // Process clicks
    for (const { mx, my } of pendingClicks) {
      if (game.state === 'waiting' || game.state === 'over') {
        initGame();
        if (turnIndicatorEl) turnIndicatorEl.textContent = 'Your Turn';
        statusMessage = `Turn ${turnNumber} - Select a unit`;
        game.setState('playing');
        continue;
      }

      if (game.state !== 'playing') continue;
      if (currentTurn !== 'player') continue;
      if (phase === 'aiTurn' || phase === 'animating') continue;

      if (isInButton(mx, my)) {
        endPlayerTurn(game);
        continue;
      }

      const cell = getCellFromMouse(mx, my);
      if (cell) handlePlayerClick(cell.r, cell.c, game);
    }
    pendingClicks.length = 0;
  };

  game.onDraw = (renderer, text) => {
    const isPlaying = game.state === 'playing' || game.state === 'over' || game.state === 'waiting';

    drawTerrain(renderer, text);
    drawHighlights(renderer);

    for (const unit of units) {
      if (unit.hp > 0) drawUnit(renderer, text, unit);
    }

    if (game.state === 'playing' && currentTurn === 'player') {
      const isHover = hoverCell && hoverCell.btn;
      drawEndTurnButton(renderer, text, isHover);
    }

    drawStatusBar(text);
  };

  game.start();
  return game;
}
