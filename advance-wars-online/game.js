// advance-wars-online/game.js — Advance Wars Online ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;
const COLS = 16, ROWS = 12;
const TILE = Math.min(Math.floor(W / COLS), Math.floor(H / ROWS));
const OX = Math.floor((W - COLS * TILE) / 2);
const OY = Math.floor((H - ROWS * TILE) / 2);

const T = { PLAIN: 0, FOREST: 1, MOUNTAIN: 2, ROAD: 3, CITY: 4, FACTORY: 5, HQ: 6, RIVER: 7 };
const TERRAIN_NAMES = ['Plain','Forest','Mountain','Road','City','Factory','HQ','River'];
const TERRAIN_DEF = [0, 1, 3, 0, 2, 1, 3, 0];
const TERRAIN_MOVE = [1, 2, 99, 0.5, 1, 1, 1, 99];
const TERRAIN_INF_MOVE = [1, 1, 2, 0.5, 1, 1, 1, 2];

const U = { INFANTRY: 0, TANK: 1, ARTILLERY: 2, ANTIAIR: 3 };
const UNIT_NAMES = ['Infantry','Tank','Artillery','Anti-Air'];
const UNIT_COST = [1000, 3000, 2500, 2500];
const UNIT_HP = [10, 10, 10, 10];
const UNIT_ATK = [5, 8, 9, 7];
const UNIT_MOVE = [3, 5, 4, 5];
const UNIT_RANGE_MIN = [1, 1, 2, 1];
const UNIT_RANGE_MAX = [1, 1, 3, 1];
const UNIT_IS_VEHICLE = [false, true, true, true];

const P = { RED: 0, BLUE: 1 };

const TERRAIN_COLORS = {
  [T.PLAIN]:   '#4a7a3a',
  [T.FOREST]:  '#2d5a1e',
  [T.MOUNTAIN]:'#7a6b5a',
  [T.ROAD]:    '#8a8070',
  [T.CITY]:    '#6a6a7a',
  [T.FACTORY]: '#5a5a6a',
  [T.HQ]:      '#8a7a4a',
  [T.RIVER]:   '#3a5a8a',
};

// ── Module-scope state ──
let gameState;   // 'menu' | 'playing' | 'gameover'
let score;
let map, tileOwner, units;
let currentPlayer, turn, gold;
let selectedUnit, movableTiles, attackableTiles;
let phase;       // 'select' | 'move' | 'attack' | 'production'
let fogMap;
let lastAction;
let productionFactory;
let aiThinking;
let unitsMoved;
let unitsDestroyed;
let damageFlashes;
let hoverTile;

// ── Pending mouse events (queued from canvas listeners, consumed in onUpdate) ──
let pendingClicks = [];
let pendingRightClicks = [];
let pendingMoves = [];

// ── DOM refs ──
const scoreEl       = document.getElementById('score');
const turnEl        = document.getElementById('turnNum');
const goldEl        = document.getElementById('gold');
const citiesEl      = document.getElementById('cities');
const totalCitiesEl = document.getElementById('totalCities');
const playerLabelEl = document.getElementById('playerLabel');
const infoBar       = document.getElementById('info-bar');

// ── Map / unit helpers ──
function generateMap() {
  map = []; tileOwner = [];
  for (let y = 0; y < ROWS; y++) {
    map[y] = []; tileOwner[y] = [];
    for (let x = 0; x < COLS; x++) {
      map[y][x] = T.PLAIN; tileOwner[y][x] = -1;
    }
  }
  for (let x = 0; x < COLS; x++) { map[5][x] = T.ROAD; map[6][x] = T.ROAD; }
  for (let y = 0; y < ROWS; y++) { map[y][4] = T.ROAD; map[y][11] = T.ROAD; }
  for (let y = 2; y < 10; y++) { map[y][7] = T.RIVER; map[y][8] = T.RIVER; }
  map[5][7] = T.ROAD; map[5][8] = T.ROAD; map[6][7] = T.ROAD; map[6][8] = T.ROAD;
  [[1,1],[1,2],[2,2],[3,1],[0,5],[1,6],[2,5],[9,0],[10,1],[10,2],
   [1,13],[1,14],[2,13],[3,14],[0,10],[1,9],[2,10],[9,15],[10,14],[10,13],
   [4,3],[7,3],[4,12],[7,12],[9,5],[9,10]].forEach(([y,x])=>{ if(y<ROWS&&x<COLS) map[y][x]=T.FOREST; });
  [[3,3],[3,5],[8,3],[8,5],[3,10],[3,12],[8,10],[8,12],[5,2],[6,13]].forEach(([y,x])=>{ if(y<ROWS&&x<COLS) map[y][x]=T.MOUNTAIN; });
  map[5][0]  = T.HQ;      tileOwner[5][0]  = P.RED;
  map[6][15] = T.HQ;      tileOwner[6][15] = P.BLUE;
  map[2][1]  = T.FACTORY; tileOwner[2][1]  = P.RED;
  map[8][1]  = T.FACTORY; tileOwner[8][1]  = P.RED;
  map[2][14] = T.FACTORY; tileOwner[2][14] = P.BLUE;
  map[8][14] = T.FACTORY; tileOwner[8][14] = P.BLUE;
  map[5][5]  = T.FACTORY; tileOwner[5][5]  = -1;
  map[6][10] = T.FACTORY; tileOwner[6][10] = -1;
  [[1,3],[4,1],[6,3],[9,2],[0,0],[11,1]].forEach(([y,x])=>{ map[y][x]=T.CITY; tileOwner[y][x]=P.RED; });
  [[1,12],[4,14],[6,12],[9,13],[0,15],[11,14]].forEach(([y,x])=>{ map[y][x]=T.CITY; tileOwner[y][x]=P.BLUE; });
  [[3,6],[8,6],[3,9],[8,9],[5,9],[6,6],[0,7],[11,8]].forEach(([y,x])=>{ map[y][x]=T.CITY; tileOwner[y][x]=-1; });
}

function createUnit(type, player, x, y) {
  return { type, player, x, y, hp: UNIT_HP[type], moved: false, attacked: false, id: Math.random().toString(36).substr(2,9) };
}

function spawnStartingUnits() {
  units = [];
  units.push(createUnit(U.INFANTRY,  P.RED,  1, 5));
  units.push(createUnit(U.INFANTRY,  P.RED,  1, 6));
  units.push(createUnit(U.INFANTRY,  P.RED,  2, 4));
  units.push(createUnit(U.TANK,      P.RED,  0, 6));
  units.push(createUnit(U.TANK,      P.RED,  2, 6));
  units.push(createUnit(U.INFANTRY,  P.BLUE, 14, 5));
  units.push(createUnit(U.INFANTRY,  P.BLUE, 14, 6));
  units.push(createUnit(U.INFANTRY,  P.BLUE, 13, 7));
  units.push(createUnit(U.TANK,      P.BLUE, 15, 5));
  units.push(createUnit(U.TANK,      P.BLUE, 13, 5));
}

function unitAt(x, y) { return units.find(u => u.x === x && u.y === y && u.hp > 0); }

function getMoveCost(x, y, unitType) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return 999;
  const t = map[y][x];
  if (t === T.RIVER) return UNIT_IS_VEHICLE[unitType] ? 999 : 2;
  if (t === T.MOUNTAIN && UNIT_IS_VEHICLE[unitType]) return 999;
  return UNIT_IS_VEHICLE[unitType] ? TERRAIN_MOVE[t] : TERRAIN_INF_MOVE[t];
}

function getReachableTiles(unit) {
  const tiles = {};
  const key = (x,y) => x+','+y;
  const open = [[unit.x, unit.y, UNIT_MOVE[unit.type]]];
  tiles[key(unit.x, unit.y)] = UNIT_MOVE[unit.type];
  while (open.length > 0) {
    const [cx, cy, rem] = open.shift();
    for (const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = cx+dx, ny = cy+dy;
      if (nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      const cost = getMoveCost(nx, ny, unit.type);
      const nr = rem - cost;
      if (nr < 0) continue;
      const k = key(nx, ny);
      if (tiles[k] !== undefined && tiles[k] >= nr) continue;
      const blocker = unitAt(nx, ny);
      if (blocker && blocker.player !== unit.player) continue;
      tiles[k] = nr;
      open.push([nx, ny, nr]);
    }
  }
  const result = [];
  for (const k in tiles) {
    const [x,y] = k.split(',').map(Number);
    const occ = unitAt(x, y);
    if (!occ || (occ.x === unit.x && occ.y === unit.y)) result.push({x,y});
  }
  return result;
}

function getAttackTargets(unit, fromX, fromY) {
  const targets = [];
  const minR = UNIT_RANGE_MIN[unit.type], maxR = UNIT_RANGE_MAX[unit.type];
  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      const dist = Math.abs(dx)+Math.abs(dy);
      if (dist < minR || dist > maxR) continue;
      const nx = fromX+dx, ny = fromY+dy;
      if (nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      const target = unitAt(nx, ny);
      if (target && target.player !== unit.player) targets.push({x:nx,y:ny,unit:target});
    }
  }
  return targets;
}

function calcDamage(attacker, defender) {
  const atkPower = UNIT_ATK[attacker.type] * (attacker.hp / UNIT_HP[attacker.type]);
  const defBonus = TERRAIN_DEF[map[defender.y][defender.x]];
  const def = 1 + defBonus * 0.1;
  let dmg = Math.round(atkPower / def * (0.9 + Math.random()*0.2));
  if (attacker.type===U.TANK && defender.type===U.INFANTRY) dmg = Math.round(dmg*1.3);
  if (attacker.type===U.ARTILLERY) dmg = Math.round(dmg*1.1);
  if (attacker.type===U.ANTIAIR && defender.type===U.INFANTRY) dmg = Math.round(dmg*1.2);
  return Math.max(1, Math.min(dmg, defender.hp));
}

function doAttack(attacker, defender) {
  const dmg = calcDamage(attacker, defender);
  defender.hp -= dmg;
  damageFlashes.push({x:defender.x, y:defender.y, dmg, t:30, color:'#ff4444'});
  let counterDmg = 0;
  if (defender.hp > 0 && UNIT_RANGE_MIN[attacker.type] === 1) {
    const dist = Math.abs(attacker.x-defender.x)+Math.abs(attacker.y-defender.y);
    if (dist >= UNIT_RANGE_MIN[defender.type] && dist <= UNIT_RANGE_MAX[defender.type]) {
      counterDmg = calcDamage(defender, attacker);
      counterDmg = Math.max(1, Math.round(counterDmg*0.7));
      attacker.hp -= counterDmg;
      damageFlashes.push({x:attacker.x, y:attacker.y, dmg:counterDmg, t:30, color:'#ffaa44'});
    }
  }
  if (defender.hp <= 0) { unitsDestroyed[attacker.player]++; units = units.filter(u=>u!==defender); }
  if (attacker.hp <= 0) { unitsDestroyed[defender.player]++; units = units.filter(u=>u!==attacker); }
  attacker.attacked = true; attacker.moved = true;
  return {dmg, counterDmg};
}

function processCapturesForPlayer(player) {
  units.forEach(u => {
    if (u.player !== player || u.hp <= 0 || u.type !== U.INFANTRY) return;
    const t = map[u.y][u.x];
    if ((t===T.CITY||t===T.FACTORY||t===T.HQ) && tileOwner[u.y][u.x] !== player) {
      tileOwner[u.y][u.x] = player;
      lastAction = UNIT_NAMES[u.type]+' captured '+TERRAIN_NAMES[t]+'!';
    }
  });
}

function updateFog() {
  fogMap = [];
  for (let y = 0; y < ROWS; y++) { fogMap[y] = []; for (let x = 0; x < COLS; x++) fogMap[y][x] = false; }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tileOwner[y][x] === P.RED) revealAround(x, y, 2);
  }
  units.forEach(u => {
    if (u.player === P.RED && u.hp > 0) {
      revealAround(u.x, u.y, map[u.y][u.x]===T.MOUNTAIN ? 4 : 3);
    }
  });
}

function revealAround(cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.abs(dx)+Math.abs(dy) > r) continue;
    const nx = cx+dx, ny = cy+dy;
    if (nx>=0&&nx<COLS&&ny>=0&&ny<ROWS) fogMap[ny][nx] = true;
  }
}

function collectIncome(player) {
  let income = 1000;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tileOwner[y][x] === player) {
      if (map[y][x]===T.CITY)    income += 500;
      if (map[y][x]===T.FACTORY) income += 500;
      if (map[y][x]===T.HQ)      income += 1000;
    }
  }
  gold[player] += income;
  return income;
}

function updateScore() {
  let s = unitsDestroyed[P.RED] * 100;
  let rc = 0, tc = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (map[y][x]===T.CITY||map[y][x]===T.FACTORY) { tc++; if (tileOwner[y][x]===P.RED) rc++; }
  }
  s += rc * 50;
  score = s;
  if (scoreEl)       scoreEl.textContent       = score;
  if (citiesEl)      citiesEl.textContent      = rc;
  if (totalCitiesEl) totalCitiesEl.textContent = tc;
}

function updateUI() {
  if (goldEl)        goldEl.textContent       = gold[P.RED];
  if (playerLabelEl) {
    playerLabelEl.textContent = currentPlayer===P.RED ? 'RED' : 'BLUE';
    playerLabelEl.style.color = currentPlayer===P.RED ? '#e44' : '#4af';
  }
}

function startTurn(player, game) {
  currentPlayer = player;
  unitsMoved.clear();
  selectedUnit = null; movableTiles = []; attackableTiles = [];
  phase = 'select'; productionFactory = null;
  units.forEach(u => { if (u.player===player) { u.moved=false; u.attacked=false; } });
  processCapturesForPlayer(player);
  const income = collectIncome(player);
  updateFog(); updateScore(); updateUI();
  if (player === P.RED) {
    lastAction = 'Your turn! Income: +'+income+' gold';
  } else {
    lastAction = 'AI is thinking...';
    aiThinking = true;
    setTimeout(() => aiTurn(game), 600);
  }
}

function endTurn(game) {
  if (currentPlayer === P.RED) { startTurn(P.BLUE, game); }
  else { turn++; if (turnEl) turnEl.textContent = turn; startTurn(P.RED, game); }
}

function checkVictory() {
  if (tileOwner[5][0] === P.BLUE) return P.BLUE;
  if (tileOwner[6][15] === P.RED) return P.RED;
  const redU  = units.filter(u=>u.player===P.RED  && u.hp>0);
  const blueU = units.filter(u=>u.player===P.BLUE && u.hp>0);
  if (redU.length===0 && turn>1) {
    let canProduce = false;
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      if (map[y][x]===T.FACTORY && tileOwner[y][x]===P.RED && gold[P.RED]>=1000) canProduce=true;
    }
    if (!canProduce) return P.BLUE;
  }
  if (blueU.length===0 && turn>1) {
    let canProduce = false;
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      if (map[y][x]===T.FACTORY && tileOwner[y][x]===P.BLUE && gold[P.BLUE]>=1000) canProduce=true;
    }
    if (!canProduce) return P.RED;
  }
  return -1;
}

function doVictory(winner, game) {
  gameState = 'gameover';
  if (winner===P.RED) {
    game.showOverlay('VICTORY!', 'Score: '+score+' | Click to play again');
    const ot = document.getElementById('overlayTitle');
    if (ot) ot.style.color = '#e44';
  } else {
    game.showOverlay('DEFEAT', 'Score: '+score+' | Click to try again');
    const ot = document.getElementById('overlayTitle');
    if (ot) ot.style.color = '#4af';
  }
}

function initGame(game) {
  generateMap(); spawnStartingUnits();
  currentPlayer = P.RED; turn = 1; gold = [5000, 5000]; score = 0; unitsDestroyed = [0, 0];
  selectedUnit = null; movableTiles = []; attackableTiles = []; phase = 'select';
  productionFactory = null; aiThinking = false; unitsMoved = new Set(); damageFlashes = [];
  let tc = 0;
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
    if (map[y][x]===T.CITY||map[y][x]===T.FACTORY) tc++;
  }
  if (totalCitiesEl) totalCitiesEl.textContent = tc;
  if (turnEl) turnEl.textContent = turn;
  updateFog(); updateScore(); startTurn(P.RED, game);
}

// ── AI ──
function aiTurn(game) {
  aiThinking = true;
  const aiUnits = units.filter(u=>u.player===P.BLUE&&u.hp>0);
  const priority = [U.ARTILLERY, U.ANTIAIR, U.TANK, U.INFANTRY];
  aiUnits.sort((a,b)=>priority.indexOf(a.type)-priority.indexOf(b.type));
  let moveIndex = 0;
  function doNextAiAction() {
    if (moveIndex >= aiUnits.length) { aiProduce(); aiThinking=false; endTurn(game); return; }
    const unit = aiUnits[moveIndex]; moveIndex++;
    if (unit.hp<=0) { doNextAiAction(); return; }
    aiMoveUnit(unit); updateFog(); updateScore();
    const vic=checkVictory(); if (vic>=0) { doVictory(vic, game); return; }
    setTimeout(doNextAiAction, 150);
  }
  setTimeout(doNextAiAction, 300);
}

function aiMoveUnit(unit) {
  const reachable = getReachableTiles(unit);
  let bestScore=-Infinity, bestPos=null, bestTarget=null;
  for (const pos of reachable) {
    let posScore = 0;
    const origX=unit.x, origY=unit.y;
    unit.x=pos.x; unit.y=pos.y;
    const targets=getAttackTargets(unit,pos.x,pos.y);
    let bestAtkScore=0, bestAtkTarget=null;
    for (const t of targets) {
      let as = calcDamage(unit,t.unit)*10;
      if (t.unit.hp<=calcDamage(unit,t.unit)) as+=50;
      as+=(UNIT_HP[t.unit.type]-t.unit.hp)*2;
      as+=UNIT_COST[t.unit.type]/100;
      if (as>bestAtkScore) { bestAtkScore=as; bestAtkTarget=t; }
    }
    posScore+=bestAtkScore;
    posScore+=TERRAIN_DEF[map[pos.y][pos.x]]*3;
    if (unit.type===U.INFANTRY) {
      const t=map[pos.y][pos.x];
      if ((t===T.CITY||t===T.FACTORY||t===T.HQ)&&tileOwner[pos.y][pos.x]!==P.BLUE) {
        posScore+=(t===T.HQ)?200:(t===T.FACTORY)?80:40;
      }
    }
    const distHQ = Math.abs(pos.x-0)+Math.abs(pos.y-5);
    posScore+=Math.max(0,20-distHQ)*0.5;
    let nearestCity=999;
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      if ((map[y][x]===T.CITY||map[y][x]===T.FACTORY)&&tileOwner[y][x]!==P.BLUE) {
        nearestCity=Math.min(nearestCity,Math.abs(pos.x-x)+Math.abs(pos.y-y));
      }
    }
    posScore+=Math.max(0,15-nearestCity)*(unit.type===U.INFANTRY?2:0.5);
    let nearestEnemy=999;
    units.forEach(u=>{ if(u.player===P.RED&&u.hp>0) nearestEnemy=Math.min(nearestEnemy,Math.abs(pos.x-u.x)+Math.abs(pos.y-u.y)); });
    if (unit.type===U.TANK||unit.type===U.ANTIAIR) posScore+=Math.max(0,12-nearestEnemy)*1.5;
    if (unit.type===U.ARTILLERY) {
      if (nearestEnemy>=2&&nearestEnemy<=4) posScore+=10;
      if (nearestEnemy<=1) posScore-=15;
    }
    units.forEach(u=>{ if(u!==unit&&u.player===P.BLUE&&u.hp>0) { if(Math.abs(pos.x-u.x)+Math.abs(pos.y-u.y)<=1) posScore-=3; }});
    let threat=0;
    units.forEach(u=>{ if(u.player===P.RED&&u.hp>0) {
      const d=Math.abs(pos.x-u.x)+Math.abs(pos.y-u.y);
      if (d<=UNIT_RANGE_MAX[u.type]+UNIT_MOVE[u.type]) threat+=UNIT_ATK[u.type]*(u.hp/UNIT_HP[u.type]);
    }});
    posScore-=threat*(unit.hp<=3?0.5:0.1);
    unit.x=origX; unit.y=origY;
    if (posScore>bestScore) { bestScore=posScore; bestPos=pos; bestTarget=bestAtkTarget; }
  }
  if (bestPos) {
    unit.x=bestPos.x; unit.y=bestPos.y; unit.moved=true;
    if (bestTarget) doAttack(unit, bestTarget.unit);
  } else { unit.moved=true; }
}

function aiProduce() {
  const factories=[];
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
    if (map[y][x]===T.FACTORY&&tileOwner[y][x]===P.BLUE&&!unitAt(x,y)) factories.push({x,y});
  }
  const aiU=units.filter(u=>u.player===P.BLUE&&u.hp>0);
  const inf=aiU.filter(u=>u.type===U.INFANTRY).length;
  const tanks=aiU.filter(u=>u.type===U.TANK).length;
  const arty=aiU.filter(u=>u.type===U.ARTILLERY).length;
  const aa=aiU.filter(u=>u.type===U.ANTIAIR).length;
  let uncaptured=0;
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
    if ((map[y][x]===T.CITY||map[y][x]===T.FACTORY)&&tileOwner[y][x]!==P.BLUE) uncaptured++;
  }
  for (const fac of factories) {
    if (gold[P.BLUE]<1000) break;
    let type;
    if (inf<2||(uncaptured>3&&inf<4)) type=U.INFANTRY;
    else if (tanks<2&&gold[P.BLUE]>=3000) type=U.TANK;
    else if (arty<1&&gold[P.BLUE]>=2500) type=U.ARTILLERY;
    else if (aa<1&&gold[P.BLUE]>=2500) type=U.ANTIAIR;
    else if (gold[P.BLUE]>=3000&&Math.random()>0.4) type=U.TANK;
    else if (gold[P.BLUE]>=2500&&Math.random()>0.5) type=Math.random()>0.5?U.ARTILLERY:U.ANTIAIR;
    else type=U.INFANTRY;
    if (gold[P.BLUE]>=UNIT_COST[type]) {
      gold[P.BLUE]-=UNIT_COST[type];
      const nu=createUnit(type,P.BLUE,fac.x,fac.y);
      nu.moved=true; nu.attacked=true; units.push(nu);
    }
  }
}

// ── Player click handling ──
function handlePlayerClick(tx, ty, game) {
  const clicked = unitAt(tx, ty);
  if (phase==='select') {
    if (map[ty][tx]===T.FACTORY && tileOwner[ty][tx]===P.RED) {
      productionFactory={x:tx,y:ty}; phase='production';
      selectedUnit=null; movableTiles=[]; attackableTiles=[]; return;
    }
    if (clicked&&clicked.player===P.RED&&!clicked.moved) {
      selectedUnit=clicked; movableTiles=getReachableTiles(clicked); attackableTiles=[];
      phase='move'; return;
    }
    if (clicked&&clicked.player===P.RED&&clicked.moved&&!clicked.attacked) {
      const targets=getAttackTargets(clicked,clicked.x,clicked.y);
      if (targets.length>0) { selectedUnit=clicked; movableTiles=[]; attackableTiles=targets; phase='attack'; return; }
    }
    if (clicked && clicked.player===P.BLUE && fogMap[ty] && fogMap[ty][tx]) {
      lastAction = 'Enemy '+UNIT_NAMES[clicked.type]+' HP:'+clicked.hp+'/'+UNIT_HP[clicked.type];
    }
    return;
  }
  if (phase==='move'&&selectedUnit) {
    const directTargets = getAttackTargets(selectedUnit, selectedUnit.x, selectedUnit.y);
    const directTarget = directTargets.find(t=>t.x===tx&&t.y===ty);
    const movable = movableTiles.find(t=>t.x===tx&&t.y===ty);
    if (movable) {
      selectedUnit.x=tx; selectedUnit.y=ty; selectedUnit.moved=true;
      const targets=getAttackTargets(selectedUnit,tx,ty);
      if (targets.length>0) {
        attackableTiles=targets; movableTiles=[]; phase='attack';
        lastAction='Select target to attack or right-click to skip';
      } else {
        selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select';
        lastAction='Unit moved.';
      }
      updateFog(); return;
    }
    if (directTarget) {
      const result=doAttack(selectedUnit, directTarget.unit);
      lastAction='Attack! '+result.dmg+' damage'+(result.counterDmg?', '+result.counterDmg+' counter!':'');
      selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select';
      updateScore(); updateFog();
      const vic=checkVictory(); if (vic>=0) doVictory(vic, game);
      return;
    }
    if (clicked&&clicked.player===P.RED&&!clicked.moved&&clicked!==selectedUnit) {
      selectedUnit=clicked; movableTiles=getReachableTiles(clicked); attackableTiles=[];
      phase='move'; return;
    }
    selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select'; return;
  }
  if (phase==='attack'&&selectedUnit) {
    const target=attackableTiles.find(t=>t.x===tx&&t.y===ty);
    if (target) {
      const result=doAttack(selectedUnit, target.unit);
      lastAction='Attack! '+result.dmg+' damage'+(result.counterDmg?', '+result.counterDmg+' counter!':'');
      selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select';
      updateScore(); updateFog();
      const vic=checkVictory(); if (vic>=0) doVictory(vic, game);
      return;
    }
    selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select'; return;
  }
}

function getTileFromXY(mx, my) {
  const tx=Math.floor((mx-OX)/TILE), ty=Math.floor((my-OY)/TILE);
  if (tx<0||tx>=COLS||ty<0||ty>=ROWS) return null;
  return {x:tx,y:ty};
}

// ── Drawing helpers ──

// Pre-computed polygon points to avoid ctx.save/rotate
function rotatedRect(cx, cy, w, h, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const hw = w/2, hh = h/2;
  const corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];
  return corners.map(([lx,ly]) => ({
    x: cx + lx*cos - ly*sin,
    y: cy + lx*sin + ly*cos,
  }));
}

function drawTile(renderer, text, x, y) {
  const px = OX+x*TILE, py = OY+y*TILE;
  const t = map[y][x];
  const visible = fogMap[y] && fogMap[y][x];

  renderer.fillRect(px, py, TILE, TILE, visible ? TERRAIN_COLORS[t] : '#2a2a3e');
  if (!visible) {
    renderer.drawLine(px,    py,    px+TILE, py,    '#333348', 0.5);
    renderer.drawLine(px+TILE,py,   px+TILE, py+TILE,'#333348',0.5);
    renderer.drawLine(px,    py+TILE,px+TILE,py+TILE,'#333348',0.5);
    renderer.drawLine(px,    py,    px,      py+TILE,'#333348',0.5);
    return;
  }

  if (t===T.FOREST) {
    renderer.fillCircle(px+TILE*0.3,  py+TILE*0.5,  TILE*0.2,  '#1a4a10');
    renderer.fillCircle(px+TILE*0.65, py+TILE*0.4,  TILE*0.22, '#1a4a10');
    renderer.fillCircle(px+TILE*0.5,  py+TILE*0.55, TILE*0.18, '#2d6a1e');
  } else if (t===T.MOUNTAIN) {
    renderer.fillPoly([
      {x:px+TILE*0.2, y:py+TILE*0.8},
      {x:px+TILE*0.5, y:py+TILE*0.15},
      {x:px+TILE*0.8, y:py+TILE*0.8},
    ], '#9a8a7a');
    renderer.fillPoly([
      {x:px+TILE*0.4, y:py+TILE*0.3},
      {x:px+TILE*0.5, y:py+TILE*0.15},
      {x:px+TILE*0.6, y:py+TILE*0.3},
    ], '#cccccc');
  } else if (t===T.CITY || t===T.FACTORY || t===T.HQ) {
    const owner = tileOwner[y][x];
    let bColor = '#888888';
    if (owner===P.RED)  bColor='#cc4444';
    else if (owner===P.BLUE) bColor='#4444cc';
    if (t===T.HQ) {
      renderer.fillRect(px+4, py+4, TILE-8, TILE-8, bColor);
      text.drawText('HQ', px+TILE/2, py+TILE/2-Math.floor(TILE*0.35)/2, Math.floor(TILE*0.35), '#ffffff', 'center');
    } else if (t===T.FACTORY) {
      renderer.fillRect(px+3,          py+TILE*0.3,  TILE-6,       TILE*0.55, bColor);
      renderer.fillRect(px+TILE*0.6,   py+2,         TILE*0.15,    TILE*0.35, bColor);
      renderer.fillRect(px+5,          py+TILE*0.45, TILE-10,      2,         '#555555');
    } else { // CITY
      renderer.fillRect(px+TILE*0.15, py+TILE*0.25, TILE*0.3,  TILE*0.6,  bColor);
      renderer.fillRect(px+TILE*0.5,  py+TILE*0.35, TILE*0.35, TILE*0.5,  bColor);
      renderer.fillRect(px+TILE*0.25, py+TILE*0.35, 3, 3, '#ffff88');
      renderer.fillRect(px+TILE*0.25, py+TILE*0.55, 3, 3, '#ffff88');
      renderer.fillRect(px+TILE*0.58, py+TILE*0.45, 3, 3, '#ffff88');
    }
  } else if (t===T.RIVER) {
    // Three wavy lines represented as horizontal stroke lines
    for (let i=0; i<3; i++) {
      const wy = py + TILE*(0.2+i*0.3);
      renderer.drawLine(px, wy, px+TILE, wy, '#5a7aaa', 1.5);
    }
  } else if (t===T.ROAD) {
    renderer.fillRect(px+2, py+2, TILE-4, TILE-4, '#9a9080');
    // Dashed center line - vertical
    renderer.drawLine(px+TILE/2, py, px+TILE/2, py+TILE, '#aaa09088', 1);
  }

  // Tile grid border
  renderer.drawLine(px,      py,      px+TILE, py,      'rgba(255,255,255,0.08)', 0.5);
  renderer.drawLine(px+TILE, py,      px+TILE, py+TILE, 'rgba(255,255,255,0.08)', 0.5);
  renderer.drawLine(px,      py+TILE, px+TILE, py+TILE, 'rgba(255,255,255,0.08)', 0.5);
  renderer.drawLine(px,      py,      px,      py+TILE, 'rgba(255,255,255,0.08)', 0.5);
}

function drawUnit(renderer, text, unit) {
  if (!fogMap[unit.y]||!fogMap[unit.y][unit.x]) { if (unit.player===P.BLUE) return; }
  const px=OX+unit.x*TILE, py=OY+unit.y*TILE;
  const cx=px+TILE/2, cy=py+TILE/2;
  const isRed = unit.player===P.RED;
  const baseColor  = isRed ? '#ee4444' : '#4488ff';
  const darkColor  = isRed ? '#aa2222' : '#2266aa';
  const bodyColor  = unit.moved ? darkColor : baseColor;
  const r = TILE*0.35;

  if (unit.type===U.INFANTRY) {
    renderer.fillCircle(cx, cy, r, bodyColor);
    renderer.strokePoly([
      {x:cx-r, y:cy},
      {x:cx,   y:cy-r},
      {x:cx+r, y:cy},
      {x:cx,   y:cy+r},
    ], '#ffffff', 1.5, true);
    // Head
    renderer.fillCircle(cx, cy-r*0.3, r*0.25, '#ffffff');
    // Body line
    renderer.drawLine(cx, cy-r*0.05, cx, cy+r*0.45, '#ffffff', 2);
  } else if (unit.type===U.TANK) {
    const w=TILE*0.65, h=TILE*0.45;
    renderer.fillPoly([
      {x:cx-w/2+4, y:cy-h/2},
      {x:cx+w/2-4, y:cy-h/2},
      {x:cx+w/2,   y:cy-h/2+4},
      {x:cx+w/2,   y:cy+h/2-4},
      {x:cx+w/2-4, y:cy+h/2},
      {x:cx-w/2+4, y:cy+h/2},
      {x:cx-w/2,   y:cy+h/2-4},
      {x:cx-w/2,   y:cy-h/2+4},
    ], bodyColor);
    renderer.strokePoly([
      {x:cx-w/2+4, y:cy-h/2},
      {x:cx+w/2-4, y:cy-h/2},
      {x:cx+w/2,   y:cy-h/2+4},
      {x:cx+w/2,   y:cy+h/2-4},
      {x:cx+w/2-4, y:cy+h/2},
      {x:cx-w/2+4, y:cy+h/2},
      {x:cx-w/2,   y:cy+h/2-4},
      {x:cx-w/2,   y:cy-h/2+4},
    ], '#ffffff', 1.5, true);
    // Turret
    renderer.fillCircle(cx, cy, r*0.4, isRed?'#cc3333':'#3366dd');
    // Barrel pointing right
    renderer.drawLine(cx, cy, cx+TILE*0.25, cy, '#ffffff', 3);
  } else if (unit.type===U.ARTILLERY) {
    renderer.fillPoly([
      {x:cx,   y:cy-r},
      {x:cx+r, y:cy},
      {x:cx,   y:cy+r},
      {x:cx-r, y:cy},
    ], bodyColor);
    renderer.strokePoly([
      {x:cx,   y:cy-r},
      {x:cx+r, y:cy},
      {x:cx,   y:cy+r},
      {x:cx-r, y:cy},
    ], '#ffffff', 1.5, true);
    // Barrel at 45 degrees
    const barrelLen = TILE*0.3;
    const angle = -Math.PI/4;
    renderer.drawLine(cx, cy, cx+Math.cos(angle)*barrelLen, cy+Math.sin(angle)*barrelLen, '#ffffff', 3);
  } else if (unit.type===U.ANTIAIR) {
    renderer.fillPoly([
      {x:cx,         y:cy-r},
      {x:cx+r*0.95,  y:cy-r*0.3},
      {x:cx+r*0.6,   y:cy+r*0.9},
      {x:cx-r*0.6,   y:cy+r*0.9},
      {x:cx-r*0.95,  y:cy-r*0.3},
    ], bodyColor);
    renderer.strokePoly([
      {x:cx,         y:cy-r},
      {x:cx+r*0.95,  y:cy-r*0.3},
      {x:cx+r*0.6,   y:cy+r*0.9},
      {x:cx-r*0.6,   y:cy+r*0.9},
      {x:cx-r*0.95,  y:cy-r*0.3},
    ], '#ffffff', 1.5, true);
    // Twin barrels
    renderer.drawLine(cx-3, cy-r*0.6, cx-3, cy+r*0.2, '#ffffff', 2);
    renderer.drawLine(cx+1, cy-r*0.6, cx+1, cy+r*0.2, '#ffffff', 2);
  }

  // HP bar
  if (unit.hp < UNIT_HP[unit.type]) {
    const barW=TILE*0.7, barH=3, barX=cx-barW/2, barY=py+TILE-6;
    renderer.fillRect(barX, barY, barW, barH, '#333333');
    const pct = unit.hp/UNIT_HP[unit.type];
    const hpColor = pct>0.5 ? '#44cc44' : pct>0.25 ? '#cccc44' : '#cc4444';
    renderer.fillRect(barX, barY, barW*pct, barH, hpColor);
  }

  // HP number
  text.drawText(unit.hp.toString(), cx, py+TILE-1-Math.floor(TILE*0.28), Math.floor(TILE*0.28), '#ffffff', 'center');
}

function drawHighlights(renderer) {
  movableTiles.forEach(({x,y})=>{
    const px=OX+x*TILE, py=OY+y*TILE;
    renderer.fillRect(px, py, TILE, TILE, 'rgba(68,170,255,0.25)');
    renderer.strokePoly([
      {x:px+1,      y:py+1},
      {x:px+TILE-1, y:py+1},
      {x:px+TILE-1, y:py+TILE-1},
      {x:px+1,      y:py+TILE-1},
    ], 'rgba(68,170,255,0.5)', 1, true);
  });
  attackableTiles.forEach(({x,y})=>{
    const px=OX+x*TILE, py=OY+y*TILE;
    renderer.fillRect(px, py, TILE, TILE, 'rgba(228,68,68,0.3)');
    renderer.strokePoly([
      {x:px+1,      y:py+1},
      {x:px+TILE-1, y:py+1},
      {x:px+TILE-1, y:py+TILE-1},
      {x:px+1,      y:py+TILE-1},
    ], 'rgba(228,68,68,0.7)', 1.5, true);
  });
  if (selectedUnit) {
    const px=OX+selectedUnit.x*TILE, py=OY+selectedUnit.y*TILE;
    renderer.strokePoly([
      {x:px,      y:py},
      {x:px+TILE, y:py},
      {x:px+TILE, y:py+TILE},
      {x:px,      y:py+TILE},
    ], '#ffffff', 2, true);
  }
}

function drawDamageFlashes(renderer, text) {
  damageFlashes = damageFlashes.filter(f => {
    f.t--;
    if (f.t<=0) return false;
    const fx = OX+f.x*TILE+TILE/2;
    const fy = OY+f.y*TILE+TILE/2 - 10 + (30-f.t)*0.5;
    const alpha = Math.round((f.t/30)*255).toString(16).padStart(2,'0');
    text.drawText('-'+f.dmg, fx, fy-7, 14, f.color+alpha, 'center');
    return true;
  });
}

function drawProductionMenu(renderer, text) {
  if (phase!=='production'||!productionFactory) return;
  const menuX=W/2-130, menuY=H/2-85, menuW=260, menuH=170;
  renderer.fillRect(menuX, menuY, menuW, menuH, 'rgba(20,20,40,0.95)');
  renderer.strokePoly([
    {x:menuX,       y:menuY},
    {x:menuX+menuW, y:menuY},
    {x:menuX+menuW, y:menuY+menuH},
    {x:menuX,       y:menuY+menuH},
  ], '#e44444', 2, true);
  text.drawText('PRODUCE UNIT', W/2, menuY+7, 14, '#e44444', 'center');
  text.drawText('Gold: '+gold[P.RED], W/2, menuY+23, 11, '#aaaaaa', 'center');

  const types=[U.INFANTRY, U.TANK, U.ARTILLERY, U.ANTIAIR];
  const occupied = unitAt(productionFactory.x, productionFactory.y);
  types.forEach((type,i)=>{
    const bx=menuX+10, by=menuY+45+i*28, bw=menuW-20, bh=24;
    const canAfford = gold[P.RED]>=UNIT_COST[type];
    const available = canAfford && !occupied;
    renderer.fillRect(bx, by, bw, bh, available ? 'rgba(228,68,68,0.2)' : 'rgba(100,100,100,0.15)');
    renderer.strokePoly([
      {x:bx,    y:by},
      {x:bx+bw, y:by},
      {x:bx+bw, y:by+bh},
      {x:bx,    y:by+bh},
    ], available ? '#e44444' : '#555555', 1, true);
    const tc = available ? '#eeeeee' : '#666666';
    text.drawText(UNIT_NAMES[type], bx+10, by+5, 12, tc, 'left');
    text.drawText(UNIT_COST[type]+'g', bx+bw-10, by+5, 12, tc, 'right');
  });
  text.drawText('[Right-click or ESC to cancel]', W/2, menuY+menuH-16, 10, '#888888', 'center');
}

function drawEndTurnButton(renderer, text) {
  if (currentPlayer!==P.RED||gameState!=='playing'||phase==='production') return;
  const bx=W-95, by=H-30, bw=85, bh=24;
  renderer.fillRect(bx, by, bw, bh, 'rgba(228,68,68,0.3)');
  renderer.strokePoly([
    {x:bx,    y:by},
    {x:bx+bw, y:by},
    {x:bx+bw, y:by+bh},
    {x:bx,    y:by+bh},
  ], '#e44444', 1.5, true);
  text.drawText('END TURN', bx+bw/2, by+4, 11, '#e44444', 'center');
}

function drawMiniStatus(renderer, text) {
  if (gameState!=='playing') return;
  const redU  = units.filter(u=>u.player===P.RED  && u.hp>0).length;
  const blueU = units.filter(u=>u.player===P.BLUE && u.hp>0).length;
  renderer.fillRect(2, H-28, 145, 26, 'rgba(20,20,40,0.7)');
  text.drawText('RED:'+redU+' units',  8,  H-28+3, 10, '#ee4444', 'left');
  text.drawText('BLU:'+blueU+' units', 78, H-28+3, 10, '#44aaff', 'left');
}

function drawHoverInfo(renderer, text) {
  if (gameState!=='playing'||currentPlayer!==P.RED) return;
  if (!hoverTile) return;
  const t = map[hoverTile.y][hoverTile.x];
  const def = TERRAIN_DEF[t];
  let info = TERRAIN_NAMES[t];
  if (def > 0) info += ' DEF+'+def;
  const owner = tileOwner[hoverTile.y][hoverTile.x];
  if (owner===P.RED) info+=' (RED)';
  else if (owner===P.BLUE) info+=' (BLUE)';
  else if ((t===T.CITY||t===T.FACTORY) && owner===-1) info+=' (Neutral)';
  const infoW = info.length*7+10;
  renderer.fillRect(2, 2, infoW, 18, 'rgba(20,20,40,0.8)');
  text.drawText(info, 7, 3, 11, '#cccccc', 'left');
}

// ── Entry point ──
export function createGame() {
  const game = new Game('game');

  // Initialize state
  gameState = 'menu';
  score = 0;
  map = []; tileOwner = []; units = [];
  currentPlayer = P.RED; turn = 1; gold = [5000,5000];
  selectedUnit = null; movableTiles = []; attackableTiles = [];
  phase = 'select'; fogMap = []; lastAction = '';
  productionFactory = null; aiThinking = false;
  unitsMoved = new Set(); unitsDestroyed = [0,0]; damageFlashes = [];
  hoverTile = null;
  pendingClicks = []; pendingRightClicks = []; pendingMoves = [];

  // For rendering purpose — draw an initial fog map when in menu
  for (let y=0;y<ROWS;y++) { fogMap[y]=[]; for (let x=0;x<COLS;x++) fogMap[y][x]=true; }
  generateMap();

  // Canvas mouse listeners
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    pendingRightClicks.push({ x: e.clientX-rect.left, y: e.clientY-rect.top });
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    pendingClicks.push({ x: e.clientX-rect.left, y: e.clientY-rect.top });
  });

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    pendingMoves.push({ x: e.clientX-rect.left, y: e.clientY-rect.top });
  });

  game.onInit = () => {
    game.showOverlay('ADVANCE WARS ONLINE', 'Click to Deploy');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // Process mouse moves (take last)
    if (pendingMoves.length > 0) {
      const mv = pendingMoves[pendingMoves.length-1];
      pendingMoves = [];
      hoverTile = getTileFromXY(mv.x, mv.y);
    }

    // Process right clicks
    while (pendingRightClicks.length > 0) {
      pendingRightClicks.shift();
      if (phase==='production') { phase='select'; productionFactory=null; }
      else { selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select'; }
    }

    // Process left clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      const mx=click.x, my=click.y;

      if (gameState==='menu') {
        gameState='playing';
        game.hideOverlay();
        game.setState('playing');
        initGame(game);
        pendingClicks = [];
        break;
      }

      if (gameState==='gameover') {
        gameState='menu';
        game.showOverlay('ADVANCE WARS ONLINE', 'Click to Deploy');
        const ot = document.getElementById('overlayTitle');
        if (ot) ot.style.color = '#e44';
        game.setState('waiting');
        pendingClicks = [];
        break;
      }

      if (gameState!=='playing'||currentPlayer!==P.RED) break;

      // End Turn button area
      if (mx>=W-95&&mx<=W-10&&my>=H-30&&my<=H-6&&phase!=='production') {
        endTurn(game); break;
      }

      // Production menu clicks
      if (phase==='production'&&productionFactory) {
        const menuX=W/2-130, menuY=H/2-85;
        const types=[U.INFANTRY,U.TANK,U.ARTILLERY,U.ANTIAIR];
        let handled=false;
        for (let i=0;i<types.length;i++) {
          const by=menuY+45+i*28;
          if (my>=by&&my<=by+24&&mx>=menuX+10&&mx<=menuX+250) {
            const type=types[i];
            const occupied=unitAt(productionFactory.x, productionFactory.y);
            if (gold[P.RED]>=UNIT_COST[type]&&!occupied) {
              gold[P.RED]-=UNIT_COST[type];
              const nu=createUnit(type,P.RED,productionFactory.x,productionFactory.y);
              nu.moved=true; nu.attacked=true; units.push(nu);
              lastAction='Produced '+UNIT_NAMES[type]+'!';
              productionFactory=null; phase='select'; updateUI();
            }
            handled=true; break;
          }
        }
        if (handled) break;
        break; // click outside menu items — ignore
      }

      // Map tile click
      const tile = getTileFromXY(mx, my);
      if (tile) handlePlayerClick(tile.x, tile.y, game);
    }

    // Keyboard shortcuts
    if (game.input.wasPressed('Escape')) {
      if (phase==='production') { phase='select'; productionFactory=null; }
      else { selectedUnit=null; movableTiles=[]; attackableTiles=[]; phase='select'; }
    }
    if ((game.input.wasPressed('e')||game.input.wasPressed('E')) &&
        gameState==='playing' && currentPlayer===P.RED && phase!=='production') {
      endTurn(game);
    }

    // Update info bar DOM
    let info = lastAction;
    if (selectedUnit) {
      const u = selectedUnit;
      info = UNIT_NAMES[u.type]+' HP:'+u.hp+'/'+UNIT_HP[u.type]+' ATK:'+UNIT_ATK[u.type]+' MOV:'+UNIT_MOVE[u.type];
      if (UNIT_RANGE_MAX[u.type]>1) info+=' RNG:'+UNIT_RANGE_MIN[u.type]+'-'+UNIT_RANGE_MAX[u.type];
    }
    if (infoBar) infoBar.innerHTML = info;
  };

  game.onDraw = (renderer, text) => {
    // Draw map
    if (map.length > 0) {
      for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) drawTile(renderer, text, x, y);
    }

    if (gameState==='playing'||gameState==='gameover') {
      drawHighlights(renderer);
      units.forEach(u=>{ if(u.hp>0) drawUnit(renderer, text, u); });
      drawDamageFlashes(renderer, text);
      drawProductionMenu(renderer, text);
      drawEndTurnButton(renderer, text);
      drawMiniStatus(renderer, text);
      drawHoverInfo(renderer, text);
    }
  };

  game.start();
  return game;
}
