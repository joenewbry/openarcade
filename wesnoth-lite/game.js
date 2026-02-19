// wesnoth-lite/game.js — Battle for Wesnoth Lite as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ===== HEX GRID CONSTANTS =====
const COLS = 12, ROWS = 10;
const HEX_SIZE = 22;
const HEX_W = HEX_SIZE * Math.sqrt(3);
const HEX_H = HEX_SIZE * 2;
const GRID_OFFSET_X = 28;
const GRID_OFFSET_Y = 22;

// ===== TERRAIN =====
const T_GRASS = 0, T_FOREST = 1, T_HILLS = 2, T_WATER = 3, T_VILLAGE = 4, T_CASTLE = 5;
const TERRAIN_NAMES = ['Grass', 'Forest', 'Hills', 'Water', 'Village', 'Castle'];
const TERRAIN_DEF = [0, 20, 30, 0, 10, 20];
const TERRAIN_COST = [1, 2, 2, 99, 1, 1];
const TERRAIN_COLORS = ['#4a7a3a', '#2d5a1e', '#8a7a5a', '#2a4a8a', '#aa8844', '#888888'];
const TERRAIN_COLORS_NIGHT = ['#1f3218', '#122610', '#3a3324', '#111e3a', '#443620', '#363636'];
const TERRAIN_COLORS_DUSK  = ['#2d4a25', '#1c3a15', '#574c38', '#1a2e56', '#6a5430', '#565656'];

// ===== UNIT TYPES =====
const U_SWORDSMAN = 0, U_ARCHER = 1, U_CAVALRY = 2, U_MAGE = 3, U_LEADER = 4;
const UNIT_DATA = [
  { name: 'Swordsman', hp: 38, atk: 9, atkCount: 2, def: 4, move: 4, range: 1, cost: 14, align: 'lawful',  sym: 'S', color: '#ddd' },
  { name: 'Archer',    hp: 30, atk: 6, atkCount: 3, def: 3, move: 5, range: 2, cost: 15, align: 'neutral', sym: 'A', color: '#8f8' },
  { name: 'Cavalry',   hp: 34, atk: 8, atkCount: 2, def: 3, move: 7, range: 1, cost: 18, align: 'lawful',  sym: 'C', color: '#ff8' },
  { name: 'Mage',      hp: 24, atk: 7, atkCount: 2, def: 2, move: 5, range: 2, cost: 16, align: 'chaotic', sym: 'M', color: '#f8f' },
  { name: 'Leader',    hp: 42, atk: 8, atkCount: 3, def: 5, move: 5, range: 1, cost: 0,  align: 'lawful',  sym: 'L', color: '#fff' },
];

// ===== DOM ELEMENTS =====
const goldEl      = document.getElementById('gold');
const scoreEl     = document.getElementById('score');
const turnEl      = document.getElementById('turn');
const aiGoldEl    = document.getElementById('aiGold');
const aiScoreEl   = document.getElementById('aiScore');
const cycleInfoEl = document.getElementById('cycleInfo');
const phaseInfoEl = document.getElementById('phaseInfo');

// ===== GAME STATE =====
let terrain = [];
let units = [];
let turnNumber = 1;
let playerGold = 100, aiGold = 100;
let playerIncome = 2, aiIncome = 2;
let selectedUnit = null;
let moveHighlights = [];
let attackHighlights = [];
let recruitMode = false;
let recruitHex = null;
let phase = 'player';
let animating = false;
let floatingTexts = [];
let dayNight = 'day';
let score = 0;
let aiScoreVal = 0;
let villageOwnership = {};

// ===== HEX MATH =====
function hexToPixel(c, r) {
  const x = GRID_OFFSET_X + c * HEX_W + (r % 2 === 1 ? HEX_W / 2 : 0);
  const y = GRID_OFFSET_Y + r * HEX_H * 0.75;
  return { x, y };
}

function pixelToHex(px, py) {
  let best = null, bestDist = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y } = hexToPixel(c, r);
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) { bestDist = d; best = { c, r }; }
    }
  }
  return bestDist < HEX_SIZE * 1.1 ? best : null;
}

function hexDistance(c1, r1, c2, r2) {
  const ax = c1 - (r1 - (r1 & 1)) / 2;
  const az = r1;
  const ay = -ax - az;
  const bx = c2 - (r2 - (r2 & 1)) / 2;
  const bz = r2;
  const by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

function hexNeighbors(c, r) {
  const dirs = r % 2 === 0
    ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1]]
    : [[-1, 0], [1, 0], [0, -1], [0, 1], [1, -1], [1, 1]];
  const out = [];
  for (const [dc, dr] of dirs) {
    const nc = c + dc, nr = r + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) out.push({ c: nc, r: nr });
  }
  return out;
}

// ===== MAP GENERATION =====
function generateMap() {
  terrain = [];
  for (let r = 0; r < ROWS; r++) {
    terrain[r] = [];
    for (let c = 0; c < COLS; c++) {
      const rnd = Math.random();
      if (rnd < 0.12) terrain[r][c] = T_FOREST;
      else if (rnd < 0.20) terrain[r][c] = T_HILLS;
      else if (rnd < 0.26) terrain[r][c] = T_WATER;
      else if (rnd < 0.32) terrain[r][c] = T_VILLAGE;
      else terrain[r][c] = T_GRASS;
    }
  }
  // Player castle area (bottom-left)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = 8 + dr, cc = 1 + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) terrain[rr][cc] = T_CASTLE;
    }
  }
  // AI castle area (top-right)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = 1 + dr, cc = 10 + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) terrain[rr][cc] = T_CASTLE;
    }
  }
  // No water near castles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (terrain[r][c] === T_WATER) {
        if (hexDistance(c, r, 1, 8) <= 3 || hexDistance(c, r, 10, 1) <= 3) {
          terrain[r][c] = T_GRASS;
        }
      }
    }
  }
  // Guaranteed mid villages
  for (const [c, r] of [[4, 4], [7, 5], [5, 6], [8, 3], [3, 7]]) {
    if (terrain[r][c] !== T_CASTLE) terrain[r][c] = T_VILLAGE;
  }
}

// ===== UNIT MANAGEMENT =====
function createUnit(type, owner, c, r) {
  const d = UNIT_DATA[type];
  return { type, owner, c, r, hp: d.hp, maxHp: d.hp, moved: false, attacked: false };
}

function unitAt(c, r) {
  return units.find(u => u.c === c && u.r === r && u.hp > 0);
}

function getReachable(unit) {
  const maxMove = UNIT_DATA[unit.type].move;
  const visited = {};
  const queue = [{ c: unit.c, r: unit.r, cost: 0 }];
  visited[`${unit.c},${unit.r}`] = 0;
  const results = [];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.cost > 0) {
      const occ = unitAt(cur.c, cur.r);
      if (!occ) results.push({ c: cur.c, r: cur.r, cost: cur.cost });
    }
    if (cur.cost >= maxMove) continue;
    for (const nb of hexNeighbors(cur.c, cur.r)) {
      const t = terrain[nb.r][nb.c];
      const moveCost = TERRAIN_COST[t];
      if (moveCost >= 99) continue;
      const newCost = cur.cost + moveCost;
      if (newCost > maxMove) continue;
      const key = `${nb.c},${nb.r}`;
      if (visited[key] !== undefined && visited[key] <= newCost) continue;
      const occ = unitAt(nb.c, nb.r);
      if (occ && occ.owner !== unit.owner) continue;
      visited[key] = newCost;
      queue.push({ c: nb.c, r: nb.r, cost: newCost });
    }
  }
  return results;
}

function getAttackTargets(unit) {
  const range = UNIT_DATA[unit.type].range;
  return units.filter(o =>
    o.hp > 0 && o.owner !== unit.owner &&
    hexDistance(unit.c, unit.r, o.c, o.r) <= range
  );
}

// ===== COMBAT =====
function getDayNightMod(align) {
  if (align === 'lawful')  return dayNight === 'day' ? 1.25 : dayNight === 'night' ? 0.75 : 1;
  if (align === 'chaotic') return dayNight === 'night' ? 1.25 : dayNight === 'day' ? 0.75 : 1;
  return 1;
}

function resolveCombat(attacker, defender) {
  const ad = UNIT_DATA[attacker.type];
  const dd = UNIT_DATA[defender.type];
  const defBonus = TERRAIN_DEF[terrain[defender.r][defender.c]] / 100;
  const atkBonus = TERRAIN_DEF[terrain[attacker.r][attacker.c]] / 100;
  const atkMod = getDayNightMod(ad.align);
  const defMod = getDayNightMod(dd.align);
  let totalDmgToDefender = 0, totalDmgToAttacker = 0;

  for (let i = 0; i < ad.atkCount; i++) {
    if (defender.hp <= 0) break;
    let dmg = Math.round(ad.atk * atkMod * (1 - defBonus));
    dmg = Math.max(1, dmg + Math.floor(Math.random() * 3) - 1);
    defender.hp -= dmg;
    totalDmgToDefender += dmg;
  }
  if (defender.hp > 0 && hexDistance(attacker.c, attacker.r, defender.c, defender.r) <= dd.range) {
    for (let i = 0; i < dd.atkCount; i++) {
      if (attacker.hp <= 0) break;
      let dmg = Math.round(dd.atk * defMod * (1 - atkBonus));
      dmg = Math.max(1, dmg + Math.floor(Math.random() * 3) - 1);
      attacker.hp -= dmg;
      totalDmgToAttacker += dmg;
    }
  }

  const dp = hexToPixel(defender.c, defender.r);
  floatingTexts.push({ x: dp.x, y: dp.y - 10, text: `-${totalDmgToDefender}`, color: '#f44', life: 60 });
  if (totalDmgToAttacker > 0) {
    const ap = hexToPixel(attacker.c, attacker.r);
    floatingTexts.push({ x: ap.x, y: ap.y - 10, text: `-${totalDmgToAttacker}`, color: '#f44', life: 60 });
  }
  if (defender.hp <= 0) { if (defender.owner === 1) score += 5; else aiScoreVal += 5; }
  if (attacker.hp <= 0) { if (attacker.owner === 1) score += 5; else aiScoreVal += 5; }
}

// ===== VILLAGE / INCOME =====
function updateVillageOwnership() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (terrain[r][c] === T_VILLAGE) {
        const u = unitAt(c, r);
        if (u) villageOwnership[`${c},${r}`] = u.owner;
      }
    }
  }
}

function countOwnedVillages(owner) {
  let count = 0;
  for (const key in villageOwnership) {
    if (villageOwnership[key] === owner) count++;
  }
  return count;
}

// ===== DAY/NIGHT CYCLE =====
function updateDayNight() {
  const p = turnNumber % 6;
  if (p === 1 || p === 2) dayNight = 'day';
  else if (p === 3) dayNight = 'dusk';
  else if (p === 4 || p === 5) dayNight = 'night';
  else dayNight = 'dawn';
}

// ===== RECRUITMENT =====
function canRecruit(owner, c, r) {
  if (terrain[r][c] !== T_CASTLE) return false;
  if (unitAt(c, r)) return false;
  return units.some(u => u.hp > 0 && u.owner === owner && u.type === U_LEADER && terrain[u.r][u.c] === T_CASTLE);
}

function getRecruitHexes(owner) {
  const hexes = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (canRecruit(owner, c, r)) hexes.push({ c, r });
    }
  }
  return hexes;
}

function recruitUnit(type, owner, c, r) {
  const cost = UNIT_DATA[type].cost;
  if (owner === 0) {
    if (playerGold < cost) return false;
    playerGold -= cost;
  } else {
    if (aiGold < cost) return false;
    aiGold -= cost;
  }
  const u = createUnit(type, owner, c, r);
  u.moved = true;
  u.attacked = true;
  units.push(u);
  return true;
}

// ===== TURN MANAGEMENT =====
function startPlayerTurn() {
  phase = 'player';
  playerGold += 2 + countOwnedVillages(0);
  playerIncome = 2 + countOwnedVillages(0);
  for (const u of units) {
    if (u.owner === 0 && u.hp > 0) {
      u.moved = false;
      u.attacked = false;
      if (terrain[u.r][u.c] === T_VILLAGE || terrain[u.r][u.c] === T_CASTLE) {
        u.hp = Math.min(u.maxHp, u.hp + 4);
      }
    }
  }
  selectedUnit = null;
  moveHighlights = [];
  attackHighlights = [];
  recruitMode = false;
  updateDayNight();
  updateUI();
  if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit or castle to recruit';
}

function endPlayerTurn() {
  if (animating) return;
  selectedUnit = null;
  moveHighlights = [];
  attackHighlights = [];
  recruitMode = false;
  updateVillageOwnership();
  score += countOwnedVillages(0);
  phase = 'ai';
  if (phaseInfoEl) phaseInfoEl.textContent = 'AI is thinking...';
  setTimeout(doAITurn, 400);
}

function doAITurn() {
  aiGold += 2 + countOwnedVillages(1);
  aiIncome = 2 + countOwnedVillages(1);
  for (const u of units) {
    if (u.owner === 1 && u.hp > 0) {
      u.moved = false;
      u.attacked = false;
      if (terrain[u.r][u.c] === T_VILLAGE || terrain[u.r][u.c] === T_CASTLE) {
        u.hp = Math.min(u.maxHp, u.hp + 4);
      }
    }
  }
  aiRecruit();
  aiMoveAndAttack();
  updateVillageOwnership();
  aiScoreVal += countOwnedVillages(1);
  units = units.filter(u => u.hp > 0);

  if (!units.some(u => u.owner === 1 && u.type === U_LEADER && u.hp > 0)) {
    endGame('VICTORY!', `You defeated the enemy leader! Score: ${score}`);
    return;
  }
  if (!units.some(u => u.owner === 0 && u.type === U_LEADER && u.hp > 0)) {
    endGame('DEFEAT', `Your leader has fallen! Score: ${score}`);
    return;
  }

  turnNumber++;
  updateDayNight();
  startPlayerTurn();
}

// ===== AI =====
function aiRecruit() {
  const recruitHexes = getRecruitHexes(1);
  if (recruitHexes.length === 0) return;
  const aiUnits = units.filter(u => u.owner === 1 && u.hp > 0 && u.type !== U_LEADER);
  const swords = aiUnits.filter(u => u.type === U_SWORDSMAN).length;
  const archers = aiUnits.filter(u => u.type === U_ARCHER).length;
  const cavs = aiUnits.filter(u => u.type === U_CAVALRY).length;
  const mages = aiUnits.filter(u => u.type === U_MAGE).length;
  const total = aiUnits.length;
  let tries = 3;
  while (tries > 0 && recruitHexes.length > 0) {
    tries--;
    let type;
    if (total < 2 || swords < 1) type = U_SWORDSMAN;
    else if (archers < 1) type = U_ARCHER;
    else if (dayNight === 'night' && mages < 2) type = U_MAGE;
    else if (cavs < 2) type = U_CAVALRY;
    else {
      const r = Math.random();
      if (r < 0.35) type = U_SWORDSMAN;
      else if (r < 0.55) type = U_ARCHER;
      else if (r < 0.75) type = U_CAVALRY;
      else type = U_MAGE;
    }
    if (aiGold < UNIT_DATA[type].cost) break;
    const hex = recruitHexes.shift();
    if (hex && !unitAt(hex.c, hex.r)) recruitUnit(type, 1, hex.c, hex.r);
  }
}

function aiMoveAndAttack() {
  const aiUnitList = units.filter(u => u.owner === 1 && u.hp > 0 && u.type !== U_LEADER);
  const playerLeader = units.find(u => u.owner === 0 && u.type === U_LEADER && u.hp > 0);
  for (const unit of aiUnitList) {
    if (unit.hp <= 0 || unit.moved) continue;
    aiActUnit(unit, playerLeader);
  }
  const aiLeader = units.find(u => u.owner === 1 && u.type === U_LEADER && u.hp > 0);
  if (aiLeader && !aiLeader.moved) aiActLeader(aiLeader);
  units = units.filter(u => u.hp > 0);
}

function aiActUnit(unit, playerLeader) {
  const reachable = getReachable(unit);
  let bestScore = -Infinity;
  let bestMove = null;
  let bestTarget = null;

  for (const dest of [{ c: unit.c, r: unit.r }, ...reachable]) {
    const origC = unit.c, origR = unit.r;
    unit.c = dest.c; unit.r = dest.r;
    let posScore = TERRAIN_DEF[terrain[dest.r][dest.c]] * 0.5;
    if (terrain[dest.r][dest.c] === T_VILLAGE && villageOwnership[`${dest.c},${dest.r}`] !== 1) posScore += 25;
    const targets = getAttackTargets(unit);
    let bestAtkScore = 0;
    let atkTarget = null;
    for (const t of targets) {
      let s = 0;
      const estimatedDmg = UNIT_DATA[unit.type].atk * UNIT_DATA[unit.type].atkCount
        * getDayNightMod(UNIT_DATA[unit.type].align) * (1 - TERRAIN_DEF[terrain[t.r][t.c]] / 100);
      if (t.hp <= estimatedDmg) s += 50;
      s += estimatedDmg * 0.5;
      if (t.type === U_LEADER) s += 60;
      s += (1 - t.hp / UNIT_DATA[t.type].hp) * 20;
      if (s > bestAtkScore) { bestAtkScore = s; atkTarget = t; }
    }
    posScore += bestAtkScore;
    if (playerLeader) posScore += (15 - hexDistance(dest.c, dest.r, playerLeader.c, playerLeader.r)) * 2;
    const nearbyAllies = units.filter(u => u.owner === 1 && u.hp > 0 && u !== unit && hexDistance(u.c, u.r, dest.c, dest.r) <= 1).length;
    if (nearbyAllies > 2) posScore -= 10;
    unit.c = origC; unit.r = origR;
    if (posScore > bestScore) { bestScore = posScore; bestMove = dest; bestTarget = atkTarget; }
  }

  if (bestMove && (bestMove.c !== unit.c || bestMove.r !== unit.r)) {
    unit.c = bestMove.c; unit.r = bestMove.r;
  }
  unit.moved = true;
  if (bestTarget && bestTarget.hp > 0) { resolveCombat(unit, bestTarget); unit.attacked = true; }
}

function aiActLeader(leader) {
  const reachable = getReachable(leader);
  let bestScore = -Infinity;
  let bestMove = { c: leader.c, r: leader.r };
  for (const dest of [{ c: leader.c, r: leader.r }, ...reachable]) {
    let s = terrain[dest.r][dest.c] === T_CASTLE ? 30 : 0;
    s += TERRAIN_DEF[terrain[dest.r][dest.c]];
    s -= units.filter(u => u.owner === 0 && u.hp > 0 && hexDistance(u.c, u.r, dest.c, dest.r) <= 2).length * 15;
    if (s > bestScore) { bestScore = s; bestMove = dest; }
  }
  if (bestMove.c !== leader.c || bestMove.r !== leader.r) {
    leader.c = bestMove.c; leader.r = bestMove.r;
  }
  leader.moved = true;
  const targets = getAttackTargets(leader);
  if (targets.length > 0) {
    targets.sort((a, b) => a.hp - b.hp);
    resolveCombat(leader, targets[0]);
    leader.attacked = true;
  }
}

// ===== WIN/LOSE =====
function endGame(title, text) {
  if (game) {
    game.showOverlay(title, text);
    game.setState('over');
  }
  updateUI();
}

function checkWinCondition() {
  if (!units.some(u => u.owner === 1 && u.type === U_LEADER && u.hp > 0)) {
    endGame('VICTORY!', `You defeated the enemy leader! Score: ${score}`);
    return true;
  }
  if (!units.some(u => u.owner === 0 && u.type === U_LEADER && u.hp > 0)) {
    endGame('DEFEAT', `Your leader has fallen! Score: ${score}`);
    return true;
  }
  return false;
}

// ===== UI UPDATE =====
function updateUI() {
  if (goldEl) goldEl.textContent = playerGold;
  if (scoreEl) scoreEl.textContent = score;
  if (turnEl) turnEl.textContent = turnNumber;
  if (aiGoldEl) aiGoldEl.textContent = aiGold;
  if (aiScoreEl) aiScoreEl.textContent = aiScoreVal;
  if (cycleInfoEl) {
    const dnClass = (dayNight === 'night') ? 'night' : 'day';
    cycleInfoEl.className = dnClass;
    cycleInfoEl.textContent = `${dayNight.charAt(0).toUpperCase() + dayNight.slice(1)} | Income: ${2 + countOwnedVillages(0)}/turn | Villages: ${countOwnedVillages(0)}`;
  }
}

// ===== INIT =====
function initGame() {
  generateMap();
  units = [];
  turnNumber = 1;
  playerGold = 100;
  aiGold = 100;
  score = 0;
  aiScoreVal = 0;
  selectedUnit = null;
  moveHighlights = [];
  attackHighlights = [];
  recruitMode = false;
  villageOwnership = {};
  floatingTexts = [];
  dayNight = 'day';
  units.push(createUnit(U_LEADER, 0, 1, 8));
  units.push(createUnit(U_LEADER, 1, 10, 1));
  units.push(createUnit(U_SWORDSMAN, 0, 2, 8));
  units.push(createUnit(U_ARCHER, 0, 0, 8));
  units.push(createUnit(U_SWORDSMAN, 1, 9, 1));
  units.push(createUnit(U_ARCHER, 1, 11, 1));
  updateVillageOwnership();
  updateDayNight();
  updateUI();
  startPlayerTurn();
}

// ===== DRAWING =====
function hexPoints(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30);
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return pts;
}

function getTerrainColor(t) {
  if (dayNight === 'night') return TERRAIN_COLORS_NIGHT[t];
  if (dayNight === 'dusk' || dayNight === 'dawn') return TERRAIN_COLORS_DUSK[t];
  return TERRAIN_COLORS[t];
}

function drawHexFill(renderer, cx, cy, size, color) {
  renderer.fillPoly(hexPoints(cx, cy, size), color);
}

function drawHexStroke(renderer, cx, cy, size, color, lineW) {
  renderer.strokePoly(hexPoints(cx, cy, size), color, lineW);
}

function onDraw(renderer, text) {
  // Background
  const bgColor = dayNight === 'night' ? '#0a0a1e' : (dayNight === 'dusk' || dayNight === 'dawn') ? '#121228' : '#1a1a2e';
  renderer.fillRect(0, 0, W, H, bgColor);

  // Draw hex grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y } = hexToPixel(c, r);
      const t = terrain[r][c];
      drawHexFill(renderer, x, y, HEX_SIZE - 1, getTerrainColor(t));
      drawHexStroke(renderer, x, y, HEX_SIZE - 1, '#333', 1);

      // Terrain icons via text
      if (t === T_VILLAGE) {
        const owner = villageOwnership[`${c},${r}`];
        const col = owner === 0 ? '#4af' : owner === 1 ? '#f64' : '#aa8';
        text.drawText('\u2302', x, y - 16, 12, col, 'center');
      }
      if (t === T_FOREST) {
        const col = dayNight === 'night' ? '#1a3a0e' : '#2a5a1e';
        text.drawText('\u2663', x, y - 16, 14, col, 'center');
      }
      if (t === T_HILLS) {
        text.drawText('\u25B2', x, y - 16, 12, '#6a5a3a', 'center');
      }
      if (t === T_WATER) {
        text.drawText('\u2248', x, y - 12, 12, '#4a6aaa', 'center');
      }
      if (t === T_CASTLE) {
        text.drawText('\u2656', x, y - 16, 12, '#aaa', 'center');
      }
    }
  }

  // Move highlights
  for (const h of moveHighlights) {
    const { x, y } = hexToPixel(h.c, h.r);
    drawHexFill(renderer, x, y, HEX_SIZE - 2, '#64b4ff40');
    drawHexStroke(renderer, x, y, HEX_SIZE - 2, '#6bf', 1.5);
  }

  // Attack highlights
  for (const h of attackHighlights) {
    const { x, y } = hexToPixel(h.c, h.r);
    drawHexFill(renderer, x, y, HEX_SIZE - 2, '#ff50504c');
    drawHexStroke(renderer, x, y, HEX_SIZE - 2, '#f44', 1.5);
  }

  // Recruit highlights
  if (recruitMode) {
    for (const h of getRecruitHexes(0)) {
      const { x, y } = hexToPixel(h.c, h.r);
      drawHexFill(renderer, x, y, HEX_SIZE - 2, '#ffc83240');
      drawHexStroke(renderer, x, y, HEX_SIZE - 2, '#fa4', 1.5);
    }
  }

  // Draw units
  for (const unit of units) {
    if (unit.hp <= 0) continue;
    const { x, y } = hexToPixel(unit.c, unit.r);
    const d = UNIT_DATA[unit.type];
    const isSelected = selectedUnit === unit;
    const playerColor = unit.owner === 0 ? '#4af' : '#f64';
    const alpha = isSelected ? 'ff' : 'cc';
    renderer.fillCircle(x, y + 2, 9, playerColor + alpha);
    if (isSelected) {
      renderer.setGlow('#fff', 0.7);
      drawHexStroke(renderer, x, y, HEX_SIZE - 2, '#ffffff88', 2);
      renderer.setGlow(null);
    }
    text.drawText(d.sym, x, y - 4, 12, '#fff', 'center');

    // HP bar
    const hpPct = unit.hp / unit.maxHp;
    const barW = 16, barH = 3;
    renderer.fillRect(x - barW / 2, y + 12, barW, barH, '#333');
    const hpCol = hpPct > 0.5 ? '#4c4' : hpPct > 0.25 ? '#cc4' : '#c44';
    renderer.fillRect(x - barW / 2, y + 12, barW * hpPct, barH, hpCol);

    // Dim if moved
    if (unit.moved && unit.owner === 0 && phase === 'player') {
      renderer.fillCircle(x, y + 2, 9, '#00000059');
    }
  }

  // Floating damage texts
  for (const ft of floatingTexts) {
    const alphaHex = Math.floor((ft.life / 60) * 255).toString(16).padStart(2, '0');
    text.drawText(ft.text, ft.x, ft.y, 13, ft.color + alphaHex, 'center');
    ft.y -= 0.5;
    ft.life--;
  }
  floatingTexts = floatingTexts.filter(f => f.life > 0);

  // Recruit menu
  if (recruitMode) {
    drawRecruitMenu(renderer, text);
  }

  // Unit info tooltip
  if (selectedUnit && selectedUnit.hp > 0 && !recruitMode) {
    drawUnitInfo(renderer, text, selectedUnit);
  }

  // Day/night indicator
  const dnIcon = dayNight === 'day' ? '\u2600' : dayNight === 'night' ? '\u263E' : '\u263C';
  const dnColor = dayNight === 'day' ? '#fa4' : dayNight === 'night' ? '#88f' : '#ca8';
  text.drawText(dnIcon + ' ' + dayNight.charAt(0).toUpperCase() + dayNight.slice(1), W - 10, H - 22, 14, dnColor, 'right');

  // End Turn button
  if (phase === 'player' && game && game.state === 'playing') {
    const bx = W - 90, by = H - 35, bw = 80, bh = 24;
    renderer.fillRect(bx, by, bw, bh, '#334');
    renderer.strokeLine(bx, by, bx + bw, by, '#6bf', 1.5);
    renderer.strokeLine(bx + bw, by, bx + bw, by + bh, '#6bf', 1.5);
    renderer.strokeLine(bx + bw, by + bh, bx, by + bh, '#6bf', 1.5);
    renderer.strokeLine(bx, by + bh, bx, by, '#6bf', 1.5);
    text.drawText('END TURN', bx + bw / 2, by + 6, 12, '#6bf', 'center');
  }
}

function drawRecruitMenu(renderer, text) {
  const mx = 150, my = 140, mw = 300, mh = 200;
  renderer.fillRect(mx, my, mw, mh, '#14142866');
  renderer.fillRect(mx, my, mw, mh, '#141428f2');
  renderer.strokeLine(mx, my, mx + mw, my, '#6bf', 2);
  renderer.strokeLine(mx + mw, my, mx + mw, my + mh, '#6bf', 2);
  renderer.strokeLine(mx + mw, my + mh, mx, my + mh, '#6bf', 2);
  renderer.strokeLine(mx, my + mh, mx, my, '#6bf', 2);
  text.drawText('RECRUIT (Gold: ' + playerGold + ')', mx + mw / 2, my + 8, 14, '#6bf', 'center');

  const types = [U_SWORDSMAN, U_ARCHER, U_CAVALRY, U_MAGE];
  for (let i = 0; i < types.length; i++) {
    const d = UNIT_DATA[types[i]];
    const ry = my + 42 + i * 38;
    const canAfford = playerGold >= d.cost;
    renderer.fillRect(mx + 15, ry, mw - 30, 32, canAfford ? '#223' : '#1a1a2e');
    renderer.strokeLine(mx + 15, ry, mx + mw - 15, ry, canAfford ? '#6bf' : '#444', 1);
    renderer.strokeLine(mx + mw - 15, ry, mx + mw - 15, ry + 32, canAfford ? '#6bf' : '#444', 1);
    renderer.strokeLine(mx + mw - 15, ry + 32, mx + 15, ry + 32, canAfford ? '#6bf' : '#444', 1);
    renderer.strokeLine(mx + 15, ry + 32, mx + 15, ry, canAfford ? '#6bf' : '#444', 1);
    const nameCol = canAfford ? d.color : '#555';
    text.drawText(`[${d.sym}] ${d.name}`, mx + 25, ry + 3, 12, nameCol, 'left');
    text.drawText(`HP:${d.hp} ATK:${d.atk}x${d.atkCount} MV:${d.move} $${d.cost}`, mx + mw - 25, ry + 3, 12, nameCol, 'right');
    text.drawText(`Range:${d.range} Def:${d.def} ${d.align}`, mx + 25, ry + 18, 10, '#888', 'left');
  }
  text.drawText('Click unit to recruit | ESC to cancel', mx + mw / 2, my + mh - 20, 10, '#666', 'center');
}

function drawUnitInfo(renderer, text, unit) {
  const d = UNIT_DATA[unit.type];
  const infoW = 180, infoH = 65;
  const ix = 5, iy = H - infoH - 5;
  renderer.fillRect(ix, iy, infoW, infoH, '#141428e6');
  const borderCol = unit.owner === 0 ? '#4af' : '#f64';
  renderer.strokeLine(ix, iy, ix + infoW, iy, borderCol, 1);
  renderer.strokeLine(ix + infoW, iy, ix + infoW, iy + infoH, borderCol, 1);
  renderer.strokeLine(ix + infoW, iy + infoH, ix, iy + infoH, borderCol, 1);
  renderer.strokeLine(ix, iy + infoH, ix, iy, borderCol, 1);
  text.drawText(`${d.name} (${unit.owner === 0 ? 'You' : 'AI'})`, ix + 8, iy + 4, 12, borderCol, 'left');
  text.drawText(`HP: ${unit.hp}/${unit.maxHp}  ATK: ${d.atk}x${d.atkCount}`, ix + 8, iy + 18, 11, '#ddd', 'left');
  text.drawText(`DEF: ${d.def}  MV: ${d.move}  Range: ${d.range}`, ix + 8, iy + 32, 11, '#ddd', 'left');
  const tName = TERRAIN_NAMES[terrain[unit.r][unit.c]];
  const tDef = TERRAIN_DEF[terrain[unit.r][unit.c]];
  text.drawText(`Terrain: ${tName} (+${tDef}% def)`, ix + 8, iy + 46, 10, '#888', 'left');
}

// ===== INPUT =====
function handleClick(e) {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);

  if (!game) return;

  if (game.state === 'waiting' || game.state === 'over') {
    game.setState('playing');
    initGame();
    return;
  }

  if (phase !== 'player' || animating) return;

  // End turn button
  const bx = W - 90, by = H - 35, bw = 80, bh = 24;
  if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
    endPlayerTurn();
    return;
  }

  // Recruit menu
  if (recruitMode) {
    handleRecruitClick(mx, my);
    return;
  }

  const hex = pixelToHex(mx, my);
  if (!hex) return;

  // Move to highlighted hex
  if (selectedUnit && !selectedUnit.moved) {
    const moveTarget = moveHighlights.find(h => h.c === hex.c && h.r === hex.r);
    if (moveTarget) {
      selectedUnit.c = hex.c;
      selectedUnit.r = hex.r;
      selectedUnit.moved = true;
      const targets = getAttackTargets(selectedUnit);
      if (targets.length > 0 && !selectedUnit.attacked) {
        moveHighlights = [];
        attackHighlights = targets.map(t => ({ c: t.c, r: t.r }));
        if (phaseInfoEl) phaseInfoEl.textContent = 'Select target to attack';
        return;
      }
      selectedUnit = null;
      moveHighlights = [];
      attackHighlights = [];
      updateVillageOwnership();
      if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit';
      return;
    }
  }

  // Attack
  if (selectedUnit && attackHighlights.length > 0 && !selectedUnit.attacked) {
    const atkTarget = attackHighlights.find(h => h.c === hex.c && h.r === hex.r);
    if (atkTarget) {
      const defender = unitAt(hex.c, hex.r);
      if (defender && defender.owner !== 0) {
        resolveCombat(selectedUnit, defender);
        selectedUnit.attacked = true;
        units = units.filter(u => u.hp > 0);
        selectedUnit = units.includes(selectedUnit) ? selectedUnit : null;
        moveHighlights = [];
        attackHighlights = [];
        checkWinCondition();
        if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit';
        return;
      }
    }
  }

  // Select own unit
  const clickedUnit = unitAt(hex.c, hex.r);
  if (clickedUnit && clickedUnit.owner === 0 && clickedUnit.hp > 0) {
    selectedUnit = clickedUnit;
    if (!clickedUnit.moved) {
      moveHighlights = getReachable(clickedUnit);
      const targets = getAttackTargets(clickedUnit);
      attackHighlights = (!clickedUnit.attacked && targets.length > 0) ? targets.map(t => ({ c: t.c, r: t.r })) : [];
    } else if (!clickedUnit.attacked) {
      moveHighlights = [];
      const targets = getAttackTargets(clickedUnit);
      attackHighlights = targets.map(t => ({ c: t.c, r: t.r }));
    } else {
      moveHighlights = [];
      attackHighlights = [];
    }
    if (phaseInfoEl) phaseInfoEl.textContent = `Selected: ${UNIT_DATA[clickedUnit.type].name} (${clickedUnit.hp}/${clickedUnit.maxHp} HP)`;
    return;
  }

  // Recruit from castle
  if (terrain[hex.r][hex.c] === T_CASTLE && !unitAt(hex.c, hex.r)) {
    const rHexes = getRecruitHexes(0);
    if (rHexes.some(h => h.c === hex.c && h.r === hex.r)) {
      recruitMode = true;
      recruitHex = hex;
      selectedUnit = null;
      moveHighlights = [];
      attackHighlights = [];
      if (phaseInfoEl) phaseInfoEl.textContent = 'Choose a unit to recruit';
      return;
    }
  }

  // Show enemy info
  if (clickedUnit && clickedUnit.owner === 1) {
    selectedUnit = clickedUnit;
    moveHighlights = [];
    attackHighlights = [];
    if (phaseInfoEl) phaseInfoEl.textContent = `Enemy: ${UNIT_DATA[clickedUnit.type].name} (${clickedUnit.hp}/${clickedUnit.maxHp} HP)`;
    return;
  }

  // Deselect
  selectedUnit = null;
  moveHighlights = [];
  attackHighlights = [];
  if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit or castle to recruit';
}

function handleRecruitClick(mx, my) {
  const menuX = 150, menuY = 140;
  const types = [U_SWORDSMAN, U_ARCHER, U_CAVALRY, U_MAGE];
  for (let i = 0; i < types.length; i++) {
    const ry = menuY + 42 + i * 38;
    if (mx >= menuX + 15 && mx <= menuX + 285 && my >= ry && my <= ry + 32) {
      const d = UNIT_DATA[types[i]];
      if (playerGold >= d.cost && recruitHex) {
        recruitUnit(types[i], 0, recruitHex.c, recruitHex.r);
        recruitMode = false;
        recruitHex = null;
        if (phaseInfoEl) phaseInfoEl.textContent = 'Recruited ' + d.name + '!';
        updateUI();
      }
      return;
    }
  }
  if (mx < 150 || mx > 450 || my < 140 || my > 340) {
    recruitMode = false;
    recruitHex = null;
    if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit';
  }
}

// ===== GAME INSTANCE =====
let game = null;

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    game.showOverlay('BATTLE FOR WESNOTH LITE', 'Hex tactics with recruitment, terrain & day/night');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    updateUI();
  };

  game.onDraw = (renderer, text) => {
    onDraw(renderer, text);
  };


  // Mouse input: direct canvas addEventListener per spec
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.addEventListener('click', handleClick);
  }

  // Keyboard input
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      recruitMode = false;
      recruitHex = null;
      selectedUnit = null;
      moveHighlights = [];
      attackHighlights = [];
      if (phaseInfoEl) phaseInfoEl.textContent = 'Your Turn - Select a unit';
    }
    if (e.key === ' ' && game && game.state === 'playing' && phase === 'player') {
      endPlayerTurn();
    }
  });

  game.start();
  return game;
}
