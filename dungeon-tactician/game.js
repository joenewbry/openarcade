// dungeon-tactician/game.js — Dungeon Tactician ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ---- CONSTANTS ----
const COLS = 10, ROWS = 10;
const CELL = 42;
const GRID_X = 30, GRID_Y = 30;
const SIDEBAR_X = GRID_X + COLS * CELL + 20;

const TRAP_SPIKE = 'spike';
const TRAP_PIT = 'pit';
const TRAP_ARROW = 'arrow';
const MON_GOBLIN = 'goblin';
const MON_SKELETON = 'skeleton';
const MON_DRAGON = 'dragon';
const WALL = 'wall';
const TREASURE = 'treasure';
const ENTRANCE = 'entrance';

const PLACEMENT_COSTS = {
  [WALL]: 1, [TRAP_SPIKE]: 2, [TRAP_PIT]: 2, [TRAP_ARROW]: 3,
  [MON_GOBLIN]: 2, [MON_SKELETON]: 3, [MON_DRAGON]: 5
};

const TRAP_DAMAGE = { [TRAP_SPIKE]: 3, [TRAP_PIT]: 5, [TRAP_ARROW]: 4 };
const MON_HP = { [MON_GOBLIN]: 4, [MON_SKELETON]: 6, [MON_DRAGON]: 12 };
const MON_ATK = { [MON_GOBLIN]: 2, [MON_SKELETON]: 3, [MON_DRAGON]: 6 };

const HERO_WARRIOR = 'warrior';
const HERO_MAGE = 'mage';
const HERO_ROGUE = 'rogue';
const HERO_STATS = {
  [HERO_WARRIOR]: { hp: 15, atk: 4, range: 1, icon: 'W', color: '#48f', ability: 'Tank: takes reduced damage' },
  [HERO_MAGE]:    { hp: 8,  atk: 6, range: 3, icon: 'M', color: '#c4f', ability: 'Ranged: attacks from distance' },
  [HERO_ROGUE]:   { hp: 10, atk: 3, range: 1, icon: 'R', color: '#4f8', ability: 'Disarms traps automatically' }
};

const BUILD_BUDGET = 15;

const ICONS = {
  [WALL]:         { ch: '#', color: '#666' },
  [TRAP_SPIKE]:   { ch: '\u25B2', color: '#f44' },
  [TRAP_PIT]:     { ch: 'O', color: '#840' },
  [TRAP_ARROW]:   { ch: '\u2192', color: '#f84' },
  [MON_GOBLIN]:   { ch: 'g', color: '#4a4' },
  [MON_SKELETON]: { ch: 's', color: '#aaa' },
  [MON_DRAGON]:   { ch: 'D', color: '#f44' },
  [TREASURE]:     { ch: '\u2666', color: '#fc4' },
  [ENTRANCE]:     { ch: '\u25A1', color: '#4af' }
};

// ---- DOM REFS ----
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const roundNumEl = document.getElementById('roundNum');
const phaseTextEl = document.getElementById('phaseText');
const infoTextEl = document.getElementById('infoText');
const budgetTextEl = document.getElementById('budgetText');
const overlaySubText = document.getElementById('overlaySubText');
const toolbarEl = document.getElementById('toolbar');

// ---- GAME STATE ----
let score = 0;
let grid = [];
let round = 1;
let playerScore = 0;
let aiScore = 0;
let phase = 'build';
let playerRole = 'builder';
let selectedTool = null;
let budget = BUILD_BUDGET;
let heroes = [];
let selectedHero = null;
let heroesKilled = 0;
let treasureReached = false;
let fogOfWar = [];
let turnLog = [];
let monsterHPs = {};
let raidTurn = 0;
let raidComplete = false;
let aiThinking = false;
let showAllForBuilder = true;

// ---- MOUSE EVENT QUEUE ----
let pendingClicks = [];

// ---- GAME INSTANCE ----
let _game = null;

// ---- HELPER: update DOM scoreboard ----
function updateScoreboard() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
  roundNumEl.textContent = round > 3 ? 3 : round;
}

function addLog(msg) {
  turnLog.push(msg);
  if (turnLog.length > 5) turnLog.shift();
}

// ---- TOOLBAR ----
function clearToolbar() {
  toolbarEl.innerHTML = '';
}

function buildToolbar() {
  clearToolbar();
  const items = [
    { id: WALL,         label: 'Wall (1)',     cost: 1 },
    { id: TRAP_SPIKE,   label: 'Spike (2)',    cost: 2 },
    { id: TRAP_PIT,     label: 'Pit (2)',      cost: 2 },
    { id: TRAP_ARROW,   label: 'Arrow (3)',    cost: 3 },
    { id: MON_GOBLIN,   label: 'Goblin (2)',   cost: 2 },
    { id: MON_SKELETON, label: 'Skeleton (3)', cost: 3 },
    { id: MON_DRAGON,   label: 'Dragon (5)',   cost: 5 },
  ];
  items.forEach(it => {
    const btn = document.createElement('button');
    btn.textContent = it.label;
    btn.id = 'btn-' + it.id;
    btn.onclick = () => selectTool(it.id);
    if (it.cost > budget) btn.disabled = true;
    toolbarEl.appendChild(btn);
  });
  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'DONE \u2713';
  doneBtn.style.background = '#a64';
  doneBtn.style.color = '#fff';
  doneBtn.onclick = finishBuildPhase;
  toolbarEl.appendChild(doneBtn);
  const eraseBtn = document.createElement('button');
  eraseBtn.textContent = 'Erase';
  eraseBtn.id = 'btn-erase';
  eraseBtn.onclick = () => selectTool('erase');
  toolbarEl.appendChild(eraseBtn);
}

function selectTool(tool) {
  selectedTool = tool;
  toolbarEl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + tool);
  if (btn) btn.classList.add('active');
}

function updateBuildButtons() {
  Object.keys(PLACEMENT_COSTS).forEach(key => {
    const btn = document.getElementById('btn-' + key);
    if (btn) btn.disabled = PLACEMENT_COSTS[key] > budget;
  });
}

function buildRaidToolbar() {
  clearToolbar();
  heroes.forEach((h, i) => {
    if (!h.alive) return;
    const btn = document.createElement('button');
    const stats = HERO_STATS[h.type];
    btn.textContent = stats.icon + ' ' + h.type.charAt(0).toUpperCase() + h.type.slice(1) + ' HP:' + h.hp;
    btn.id = 'btn-hero-' + i;
    btn.style.borderColor = stats.color;
    if (i === selectedHero) btn.classList.add('active');
    btn.onclick = () => { selectedHero = i; updateRaidToolbar(); };
    toolbarEl.appendChild(btn);
  });
  const endBtn = document.createElement('button');
  endBtn.textContent = 'END TURN';
  endBtn.style.background = '#a64';
  endBtn.style.color = '#fff';
  endBtn.onclick = endRaidTurn;
  toolbarEl.appendChild(endBtn);
}

function updateRaidToolbar() {
  toolbarEl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  heroes.forEach((h, i) => {
    const btn = document.getElementById('btn-hero-' + i);
    if (btn) {
      const stats = HERO_STATS[h.type];
      btn.textContent = stats.icon + ' ' + h.type.charAt(0).toUpperCase() + h.type.slice(1) + ' HP:' + h.hp;
      if (i === selectedHero) btn.classList.add('active');
      if (!h.alive) { btn.disabled = true; btn.textContent += ' DEAD'; }
    }
  });
}

// ---- GRID ----
function resetGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = { type: 'empty', revealed: false };
    }
  }
  grid[0][0] = { type: ENTRANCE, revealed: true };
  grid[ROWS - 1][COLS - 1] = { type: TREASURE, revealed: false };
  fogOfWar = [];
  for (let r = 0; r < ROWS; r++) {
    fogOfWar[r] = [];
    for (let c = 0; c < COLS; c++) {
      fogOfWar[r][c] = false;
    }
  }
}

function pathExists() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const queue = [{ r: 0, c: 0 }];
  visited[0][0] = true;
  while (queue.length > 0) {
    const { r, c } = queue.shift();
    if (r === ROWS - 1 && c === COLS - 1) return true;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && grid[nr][nc].type !== WALL) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  return false;
}

function revealAround(r, c) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && Math.abs(dr) + Math.abs(dc) <= 2) {
        fogOfWar[nr][nc] = true;
      }
    }
  }
}

// ---- BUILD PHASE ----
function startBuildPhase() {
  phase = 'build';
  budget = BUILD_BUDGET;
  selectedTool = null;
  showAllForBuilder = true;
  phaseTextEl.textContent = 'BUILD PHASE (You)';
  infoTextEl.textContent = 'Place traps, monsters, walls';
  budgetTextEl.textContent = 'Budget: ' + budget;
  buildToolbar();
}

function finishBuildPhase() {
  clearToolbar();
  if (playerRole === 'builder') {
    startAIRaidPhase();
  } else {
    startRaidPhase();
  }
}

// ---- AI BUILD ----
function startAIBuildPhase() {
  phase = 'build';
  budget = BUILD_BUDGET;
  showAllForBuilder = false;
  phaseTextEl.textContent = 'BUILD PHASE (AI)';
  infoTextEl.textContent = 'AI is building the dungeon...';
  budgetTextEl.textContent = '';
  clearToolbar();

  setTimeout(() => {
    aiBuildDungeon();
    if (playerRole === 'raider') {
      startRaidPhase();
    } else {
      startAIRaidPhase();
    }
  }, 800);
}

function aiBuildDungeon() {
  let remaining = BUILD_BUDGET;
  const treasureR = ROWS - 1, treasureC = COLS - 1;

  let cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].type !== 'empty') continue;
      const dist = Math.abs(r - treasureR) + Math.abs(c - treasureC);
      const distToEntrance = r + c;
      const sc = 20 - dist + Math.min(distToEntrance, 5);
      cells.push({ r, c, score: sc + Math.random() * 4 });
    }
  }
  cells.sort((a, b) => b.score - a.score);

  if (remaining >= 5) {
    const dragonCells = cells.filter(c =>
      Math.abs(c.r - treasureR) + Math.abs(c.c - treasureC) <= 3 &&
      Math.abs(c.r - treasureR) + Math.abs(c.c - treasureC) >= 1
    );
    if (dragonCells.length > 0) {
      const dc = dragonCells[0];
      grid[dc.r][dc.c] = { type: MON_DRAGON, revealed: false };
      remaining -= 5;
      cells = cells.filter(c => c.r !== dc.r || c.c !== dc.c);
    }
  }

  while (remaining >= 3) {
    const monCells = cells.filter(c => {
      const d = Math.abs(c.r - treasureR) + Math.abs(c.c - treasureC);
      return d >= 2 && d <= 7;
    });
    if (monCells.length === 0) break;
    const mc = monCells[0];
    grid[mc.r][mc.c] = { type: MON_SKELETON, revealed: false };
    remaining -= 3;
    cells = cells.filter(c => c.r !== mc.r || c.c !== mc.c);
    if (remaining < 2) break;
    if (remaining >= 2) {
      const trapCells = cells.filter(c => {
        const d = Math.abs(c.r - treasureR) + Math.abs(c.c - treasureC);
        return d >= 1 && d <= 5;
      });
      if (trapCells.length > 0) {
        const tc = trapCells[0];
        const trapType = [TRAP_SPIKE, TRAP_PIT, TRAP_ARROW][Math.floor(Math.random() * 3)];
        const cost = PLACEMENT_COSTS[trapType];
        if (remaining >= cost) {
          grid[tc.r][tc.c] = { type: trapType, revealed: false };
          remaining -= cost;
          cells = cells.filter(c => c.r !== tc.r || c.c !== tc.c);
        }
      }
    }
  }

  while (remaining >= 1 && cells.length > 0) {
    const wc = cells.shift();
    if (remaining >= 2 && Math.random() < 0.4) {
      grid[wc.r][wc.c] = { type: MON_GOBLIN, revealed: false };
      remaining -= 2;
    } else {
      grid[wc.r][wc.c] = { type: WALL, revealed: false };
      remaining -= 1;
    }
  }

  ensurePath();
}

function ensurePath() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const queue = [{ r: 0, c: 0 }];
  visited[0][0] = true;
  while (queue.length > 0) {
    const { r, c } = queue.shift();
    if (r === ROWS - 1 && c === COLS - 1) return;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && grid[nr][nc].type !== WALL) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  let r = 0, c = 0;
  while (r < ROWS - 1 || c < COLS - 1) {
    if (grid[r][c].type === WALL) grid[r][c] = { type: 'empty', revealed: false };
    if (r < ROWS - 1 && c < COLS - 1) {
      if (Math.random() < 0.5) r++; else c++;
    } else if (r < ROWS - 1) r++;
    else c++;
  }
}

// ---- RAID PHASE ----
function startRaidPhase() {
  phase = 'raid';
  showAllForBuilder = false;
  heroes = [
    { type: HERO_WARRIOR, hp: HERO_STATS[HERO_WARRIOR].hp, maxHp: HERO_STATS[HERO_WARRIOR].hp, r: 0, c: 0, alive: true, moved: false },
    { type: HERO_MAGE,    hp: HERO_STATS[HERO_MAGE].hp,    maxHp: HERO_STATS[HERO_MAGE].hp,    r: 0, c: 0, alive: true, moved: false },
    { type: HERO_ROGUE,   hp: HERO_STATS[HERO_ROGUE].hp,   maxHp: HERO_STATS[HERO_ROGUE].hp,   r: 0, c: 0, alive: true, moved: false }
  ];
  selectedHero = 0;
  raidTurn = 0;
  raidComplete = false;
  heroesKilled = 0;
  treasureReached = false;
  monsterHPs = {};
  turnLog = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MON_HP[grid[r][c].type]) {
        monsterHPs[r + ',' + c] = MON_HP[grid[r][c].type];
      }
    }
  }

  revealAround(0, 0);
  phaseTextEl.textContent = 'RAID PHASE (You)';
  infoTextEl.textContent = 'Move heroes to reach treasure';
  budgetTextEl.textContent = '';
  buildRaidToolbar();
}

function endRaidTurn() {
  raidTurn++;
  heroes.forEach(h => h.moved = false);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MON_ATK[grid[r][c].type] && monsterHPs[r + ',' + c] > 0) {
        heroes.forEach(h => {
          if (!h.alive) return;
          const dist = Math.abs(h.r - r) + Math.abs(h.c - c);
          if (dist <= 1) {
            let dmg = MON_ATK[grid[r][c].type];
            if (h.type === HERO_WARRIOR) dmg = Math.max(1, dmg - 1);
            h.hp -= dmg;
            addLog(grid[r][c].type + ' attacks ' + h.type + ' for ' + dmg + ' dmg');
            if (h.hp <= 0) {
              h.alive = false;
              h.hp = 0;
              heroesKilled++;
              addLog(h.type + ' has fallen!');
            }
          }
        });
      }
    }
  }

  checkRaidEnd();
  if (!raidComplete) {
    updateRaidToolbar();
    const nextH = heroes.findIndex(h => h.alive && !h.moved);
    if (nextH >= 0) selectedHero = nextH;
    updateRaidToolbar();
  }
}

function checkRaidEnd() {
  const allDead = heroes.every(h => !h.alive);
  if (allDead || treasureReached || raidTurn >= 30) {
    raidComplete = true;
    endRaidPhase();
  }
}

function endRaidPhase() {
  clearToolbar();

  let builderPoints = heroesKilled * 2;
  let raiderPoints = treasureReached ? 5 : 0;
  raiderPoints += heroes.filter(h => h.alive).length;

  if (playerRole === 'builder') {
    playerScore += builderPoints;
    aiScore += raiderPoints;
  } else {
    playerScore += raiderPoints;
    aiScore += builderPoints;
  }

  updateScoreboard();

  const msg = treasureReached ? 'Treasure reached!' : 'All heroes fell!';
  phaseTextEl.textContent = 'ROUND ' + round + ' COMPLETE';
  infoTextEl.textContent = msg;
  budgetTextEl.textContent = '';

  setTimeout(() => {
    round++;
    if (round > 3) {
      endGame();
    } else {
      playerRole = playerRole === 'builder' ? 'raider' : 'builder';
      showTransition();
    }
  }, 1500);
}

function showTransition() {
  _game.showOverlay('ROUND ' + round, 'You are the ' + playerRole.toUpperCase());
  if (overlaySubText) overlaySubText.textContent = 'Click to continue';
  _game.setState('transition');
}

function endGame() {
  const winner = playerScore > aiScore ? 'YOU WIN!' : (playerScore < aiScore ? 'AI WINS!' : 'TIE!');
  _game.showOverlay(winner, 'Player: ' + playerScore + ' | AI: ' + aiScore);
  if (overlaySubText) overlaySubText.textContent = 'Click to play again';
  score = playerScore;
  _game.setState('over');
}

// ---- AI RAID ----
function startAIRaidPhase() {
  phase = 'raid';
  showAllForBuilder = true;
  heroes = [
    { type: HERO_WARRIOR, hp: HERO_STATS[HERO_WARRIOR].hp, maxHp: HERO_STATS[HERO_WARRIOR].hp, r: 0, c: 0, alive: true, moved: false },
    { type: HERO_MAGE,    hp: HERO_STATS[HERO_MAGE].hp,    maxHp: HERO_STATS[HERO_MAGE].hp,    r: 0, c: 0, alive: true, moved: false },
    { type: HERO_ROGUE,   hp: HERO_STATS[HERO_ROGUE].hp,   maxHp: HERO_STATS[HERO_ROGUE].hp,   r: 0, c: 0, alive: true, moved: false }
  ];
  raidTurn = 0;
  raidComplete = false;
  heroesKilled = 0;
  treasureReached = false;
  monsterHPs = {};
  turnLog = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MON_HP[grid[r][c].type]) {
        monsterHPs[r + ',' + c] = MON_HP[grid[r][c].type];
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      fogOfWar[r][c] = true;
    }
  }

  phaseTextEl.textContent = 'RAID PHASE (AI)';
  infoTextEl.textContent = 'AI is raiding your dungeon...';
  budgetTextEl.textContent = '';
  clearToolbar();

  aiRaidStep();
}

function aiRaidStep() {
  if (raidComplete || _game.state !== 'playing') return;

  aiThinking = true;
  setTimeout(() => {
    const aliveHeroes = heroes.filter(h => h.alive);
    if (aliveHeroes.length === 0) {
      raidComplete = true;
      endRaidPhase();
      return;
    }

    aliveHeroes.forEach(hero => {
      if (!hero.alive || hero.moved) return;
      const target = findPathStep(hero.r, hero.c, ROWS - 1, COLS - 1, hero.type);
      if (target) {
        moveHero(heroes.indexOf(hero), target.r, target.c);
      }
      hero.moved = true;
    });

    raidTurn++;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MON_ATK[grid[r][c].type] && monsterHPs[r + ',' + c] > 0) {
          heroes.forEach(h => {
            if (!h.alive) return;
            const dist = Math.abs(h.r - r) + Math.abs(h.c - c);
            if (dist <= 1) {
              let dmg = MON_ATK[grid[r][c].type];
              if (h.type === HERO_WARRIOR) dmg = Math.max(1, dmg - 1);
              h.hp -= dmg;
              if (h.hp <= 0) {
                h.alive = false;
                h.hp = 0;
                heroesKilled++;
              }
            }
          });
        }
      }
    }

    heroes.forEach(h => h.moved = false);
    aiThinking = false;

    checkRaidEnd();
    if (!raidComplete && raidTurn < 30) {
      aiRaidStep();
    } else if (!raidComplete) {
      raidComplete = true;
      endRaidPhase();
    }
  }, 500);
}

function findPathStep(fromR, fromC, toR, toC, heroType) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const queue = [{ r: fromR, c: fromC }];
  visited[fromR][fromC] = true;

  while (queue.length > 0) {
    const { r, c } = queue.shift();
    if (r === toR && c === toC) {
      let cr = toR, cc = toC;
      while (parent[cr][cc]) {
        const p = parent[cr][cc];
        if (p.r === fromR && p.c === fromC) return { r: cr, c: cc };
        cr = p.r; cc = p.c;
      }
      return { r: cr, c: cc };
    }
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
        const cellType = grid[nr][nc].type;
        if (cellType === WALL) continue;
        visited[nr][nc] = true;
        parent[nr][nc] = { r, c };
        queue.push({ r: nr, c: nc });
      }
    }
  }
  let bestDist = Infinity, bestPos = null;
  for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const nr = fromR + dr, nc = fromC + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].type !== WALL) {
      const dist = Math.abs(nr - toR) + Math.abs(nc - toC);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = { r: nr, c: nc };
      }
    }
  }
  return bestPos;
}

// ---- HERO MOVEMENT ----
function moveHero(idx, tr, tc) {
  const hero = heroes[idx];
  if (!hero || !hero.alive) return false;

  const dist = Math.abs(hero.r - tr) + Math.abs(hero.c - tc);
  if (dist !== 1) return false;

  const cell = grid[tr][tc];
  if (cell.type === WALL) return false;

  hero.r = tr;
  hero.c = tc;
  hero.moved = true;
  revealAround(tr, tc);

  if (TRAP_DAMAGE[cell.type]) {
    if (hero.type === HERO_ROGUE) {
      addLog('Rogue disarms ' + cell.type + '!');
      grid[tr][tc] = { type: 'empty', revealed: true };
    } else {
      const dmg = TRAP_DAMAGE[cell.type];
      hero.hp -= dmg;
      addLog(hero.type + ' triggers ' + cell.type + '! -' + dmg + ' HP');
      grid[tr][tc] = { type: 'empty', revealed: true };
      if (hero.hp <= 0) {
        hero.alive = false;
        hero.hp = 0;
        heroesKilled++;
        addLog(hero.type + ' has fallen!');
      }
    }
  }

  if (MON_HP[cell.type] && monsterHPs[tr + ',' + tc] > 0) {
    const monKey = tr + ',' + tc;
    const heroAtk = HERO_STATS[hero.type].atk;
    monsterHPs[monKey] -= heroAtk;
    addLog(hero.type + ' attacks ' + cell.type + ' for ' + heroAtk);
    if (monsterHPs[monKey] <= 0) {
      grid[tr][tc] = { type: 'empty', revealed: true };
      addLog(cell.type + ' defeated!');
    } else {
      let dmg = MON_ATK[cell.type];
      if (hero.type === HERO_WARRIOR) dmg = Math.max(1, dmg - 1);
      hero.hp -= dmg;
      addLog(cell.type + ' hits back for ' + dmg);
      if (hero.hp <= 0) {
        hero.alive = false;
        hero.hp = 0;
        heroesKilled++;
        addLog(hero.type + ' has fallen!');
      }
    }
  }

  if (hero.type === HERO_MAGE && hero.alive) {
    for (let dr = -HERO_STATS[HERO_MAGE].range; dr <= HERO_STATS[HERO_MAGE].range; dr++) {
      for (let dc = -HERO_STATS[HERO_MAGE].range; dc <= HERO_STATS[HERO_MAGE].range; dc++) {
        if (dr === 0 && dc === 0) continue;
        const mr = tr + dr, mc = tc + dc;
        if (mr >= 0 && mr < ROWS && mc >= 0 && mc < COLS) {
          const mKey = mr + ',' + mc;
          if (MON_HP[grid[mr][mc].type] && monsterHPs[mKey] > 0) {
            const monType = grid[mr][mc].type;
            monsterHPs[mKey] -= 2;
            addLog('Mage zaps ' + monType + ' from range');
            if (monsterHPs[mKey] <= 0) {
              grid[mr][mc] = { type: 'empty', revealed: true };
              addLog(monType + ' defeated by magic!');
            }
          }
        }
      }
    }
  }

  if (tr === ROWS - 1 && tc === COLS - 1) {
    treasureReached = true;
    addLog('TREASURE REACHED!');
  }

  return true;
}

// ---- CLICK HANDLERS ----
function handleBuildClick(r, c) {
  if (grid[r][c].type === ENTRANCE || grid[r][c].type === TREASURE) return;

  if (selectedTool === 'erase') {
    const existing = grid[r][c].type;
    if (existing !== 'empty') {
      const refund = PLACEMENT_COSTS[existing] || 0;
      budget += refund;
      grid[r][c] = { type: 'empty', revealed: false };
      budgetTextEl.textContent = 'Budget: ' + budget;
      updateBuildButtons();
    }
    return;
  }

  if (!selectedTool || !PLACEMENT_COSTS[selectedTool]) return;
  if (grid[r][c].type !== 'empty') return;

  const cost = PLACEMENT_COSTS[selectedTool];
  if (budget < cost) return;

  grid[r][c] = { type: selectedTool, revealed: false };
  budget -= cost;
  budgetTextEl.textContent = 'Budget: ' + budget;

  if (!pathExists()) {
    grid[r][c] = { type: 'empty', revealed: false };
    budget += cost;
    budgetTextEl.textContent = 'Budget: ' + budget;
    addLog('Cannot block all paths!');
  }

  updateBuildButtons();
}

function handleRaidClick(r, c) {
  if (raidComplete) return;
  const hero = heroes[selectedHero];
  if (!hero || !hero.alive || hero.moved) {
    const clickedHero = heroes.findIndex(h => h.alive && h.r === r && h.c === c);
    if (clickedHero >= 0) {
      selectedHero = clickedHero;
      updateRaidToolbar();
    }
    return;
  }

  const dist = Math.abs(hero.r - r) + Math.abs(hero.c - c);
  if (dist !== 1) return;

  moveHero(selectedHero, r, c);
  updateRaidToolbar();

  const nextAlive = heroes.findIndex((h, i) => i > selectedHero && h.alive && !h.moved);
  if (nextAlive >= 0) {
    selectedHero = nextAlive;
  } else {
    const firstAlive = heroes.findIndex(h => h.alive && !h.moved);
    if (firstAlive >= 0) selectedHero = firstAlive;
  }
  updateRaidToolbar();

  checkRaidEnd();
}

// ---- ROUND / GAME FLOW ----
function startRound() {
  roundNumEl.textContent = round;
  resetGrid();
  heroesKilled = 0;
  treasureReached = false;
  raidComplete = false;
  raidTurn = 0;

  if (playerRole === 'builder') {
    startBuildPhase();
  } else {
    startAIBuildPhase();
  }
}

// ---- DRAWING ----
function drawGrid(renderer, text) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = GRID_X + c * CELL;
      const y = GRID_Y + r * CELL;
      const cell = grid[r][c];
      const revealed = showAllForBuilder || fogOfWar[r][c];

      if (!revealed && phase === 'raid') {
        renderer.fillRect(x, y, CELL - 1, CELL - 1, '#0a0a1e');
        text.drawText('?', x + CELL / 2, y + CELL / 2 - 6, 12, '#1a1a3e', 'center');
      } else {
        const floorColor = (r + c) % 2 === 0 ? '#2a2218' : '#241e14';
        renderer.fillRect(x, y, CELL - 1, CELL - 1, floorColor);

        if (cell.type !== 'empty') {
          const icon = ICONS[cell.type];
          if (icon) {
            if (cell.type === TREASURE) {
              renderer.setGlow('#fc4', 0.8);
            } else if (MON_HP[cell.type]) {
              renderer.setGlow('#f44', 0.5);
            } else if (TRAP_DAMAGE[cell.type]) {
              renderer.setGlow('#f84', 0.5);
            }
            text.drawText(icon.ch, x + CELL / 2, y + CELL / 2 - 9, 18, icon.color, 'center');
            renderer.setGlow(null);

            if (phase === 'raid' && MON_HP[cell.type] && monsterHPs[r + ',' + c] > 0) {
              text.drawText(monsterHPs[r + ',' + c] + '/' + MON_HP[cell.type],
                x + CELL / 2, y + CELL - 14, 9, '#fff', 'center');
            }
          }
        }
      }

      // Grid border
      renderer.strokePoly([
        { x: x, y: y },
        { x: x + CELL - 1, y: y },
        { x: x + CELL - 1, y: y + CELL - 1 },
        { x: x, y: y + CELL - 1 }
      ], '#3a2a1a', 0.5, true);
    }
  }
}

function drawHeroes(renderer, text) {
  heroes.forEach((h, i) => {
    if (!h.alive) return;
    const x = GRID_X + h.c * CELL;
    const y = GRID_Y + h.r * CELL;
    const stats = HERO_STATS[h.type];
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const rad = CELL / 3;

    const isSelected = i === selectedHero && playerRole === 'raider';
    const fillColor = isSelected ? stats.color : stats.color + '88';
    renderer.fillCircle(cx, cy, rad, fillColor);
    renderer.strokePoly(
      buildCirclePoly(cx, cy, rad, 16),
      isSelected ? '#fff' : stats.color,
      isSelected ? 2 : 1,
      true
    );

    text.drawText(stats.icon, cx, cy - 7, 14, '#fff', 'center');

    // HP bar
    const barW = CELL - 8;
    const barH = 3;
    const barX = x + 4;
    const barY = y + CELL - 7;
    renderer.fillRect(barX, barY, barW, barH, '#400');
    const hpFrac = h.hp / h.maxHp;
    const hpColor = hpFrac > 0.5 ? '#4f4' : (hpFrac > 0.25 ? '#ff4' : '#f44');
    renderer.fillRect(barX, barY, barW * hpFrac, barH, hpColor);

    // Moved indicator — semi-transparent dark overlay
    if (h.moved) {
      renderer.fillRect(x, y, CELL - 1, CELL - 1, 'rgba(0,0,0,0.4)');
    }
  });
}

function buildCirclePoly(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawSidebar(renderer, text) {
  const sx = SIDEBAR_X;
  let sy = GRID_Y;

  if (phase === 'build') {
    text.drawText('BUILD MODE', sx, sy, 12, '#a64', 'left'); sy += 18;
    text.drawText('Budget: ' + budget, sx, sy, 10, '#aaa', 'left'); sy += 14;
    text.drawText('Round: ' + round + '/3', sx, sy, 10, '#aaa', 'left'); sy += 14;
    text.drawText('Role: Builder', sx, sy, 10, '#aaa', 'left'); sy += 20;
    text.drawText('Click grid to', sx, sy, 10, '#888', 'left'); sy += 12;
    text.drawText('place items', sx, sy, 10, '#888', 'left'); sy += 18;

    text.drawText('LEGEND:', sx, sy, 10, '#a64', 'left'); sy += 14;
    const legend = [
      { ch: '#', color: '#666', label: 'Wall' },
      { ch: '\u25B2', color: '#f44', label: 'Spike' },
      { ch: 'O', color: '#840', label: 'Pit' },
      { ch: '\u2192', color: '#f84', label: 'Arrow' },
      { ch: 'g', color: '#4a4', label: 'Goblin' },
      { ch: 's', color: '#aaa', label: 'Skeleton' },
      { ch: 'D', color: '#f44', label: 'Dragon' },
    ];
    legend.forEach(l => {
      text.drawText(l.ch, sx, sy, 12, l.color, 'left');
      text.drawText(' ' + l.label, sx + 14, sy, 10, '#888', 'left');
      sy += 14;
    });
  } else {
    text.drawText('RAID MODE', sx, sy, 12, '#a64', 'left'); sy += 18;
    text.drawText('Turn: ' + raidTurn, sx, sy, 10, '#aaa', 'left'); sy += 14;
    text.drawText('Round: ' + round + '/3', sx, sy, 10, '#aaa', 'left'); sy += 14;
    text.drawText('Killed: ' + heroesKilled, sx, sy, 10, '#aaa', 'left'); sy += 20;

    heroes.forEach((h, i) => {
      const stats = HERO_STATS[h.type];
      const heroNameColor = h.alive ? stats.color : '#444';
      const heroInfoColor = h.alive ? '#aaa' : '#444';
      text.drawText(stats.icon + ' ' + h.type, sx, sy, 11, heroNameColor, 'left'); sy += 13;
      text.drawText('HP:' + h.hp + '/' + h.maxHp, sx, sy, 10, heroInfoColor, 'left'); sy += 13;
      text.drawText(stats.ability, sx, sy, 10, heroInfoColor, 'left'); sy += 16;
    });

    if (turnLog.length > 0) {
      sy += 6;
      text.drawText('LOG:', sx, sy, 10, '#a64', 'left'); sy += 13;
      turnLog.forEach(msg => {
        const displayMsg = msg.length > 20 ? msg.substring(0, 19) + '..' : msg;
        text.drawText(displayMsg, sx, sy, 9, '#888', 'left');
        sy += 11;
      });
    }
  }
}

// ---- EXPORT ----
export function createGame() {
  const game = new Game('game');
  _game = game;

  // Set up canvas click listener for grid interaction
  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    pendingClicks.push({ x: mx, y: my });
  });

  game.setScoreFn(() => score);

  game.onInit = () => {
    score = 0;
    round = 1;
    playerScore = 0;
    aiScore = 0;
    playerRole = 'builder';
    turnLog = [];
    updateScoreboard();
    clearToolbar();
    if (overlaySubText) overlaySubText.textContent = 'Click to start';
    game.showOverlay('DUNGEON TACTICIAN', 'Build dungeons. Raid dungeons. Outsmart the AI.');
    game.setState('waiting');
  };

  game.onUpdate = () => {
    const state = game.state;

    // Process pending clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const { x: mx, y: my } = click;

      if (state === 'waiting') {
        // Start game on click
        resetGrid();
        heroesKilled = 0;
        treasureReached = false;
        raidComplete = false;
        raidTurn = 0;
        roundNumEl.textContent = round;
        if (playerRole === 'builder') {
          startBuildPhase();
        } else {
          startAIBuildPhase();
        }
        game.setState('playing');
        continue;
      }

      if (state === 'over') {
        // Reset and restart
        game.onInit();
        continue;
      }

      if (state === 'transition') {
        // Move to next round
        game.setState('playing');
        game.hideOverlay();
        startRound();
        continue;
      }

      if (state === 'playing' && !aiThinking) {
        // Convert canvas coords to grid coords
        const gc = Math.floor((mx - GRID_X) / CELL);
        const gr = Math.floor((my - GRID_Y) / CELL);
        if (gc >= 0 && gc < COLS && gr >= 0 && gr < ROWS) {
          if (phase === 'build' && playerRole === 'builder') {
            handleBuildClick(gr, gc);
          } else if (phase === 'raid' && playerRole === 'raider') {
            handleRaidClick(gr, gc);
          }
        }
      }
    }
  };

  game.onDraw = (renderer, text) => {
    drawGrid(renderer, text);
    if (phase === 'raid') {
      drawHeroes(renderer, text);
    }
    drawSidebar(renderer, text);
  };

  game.start();
  return game;
}
