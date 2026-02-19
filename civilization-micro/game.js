// civilization-micro/game.js — Civilization Micro ported to WebGL 2 engine

import { Game } from '../engine/core.js';

// Module-level game reference (set when createGame() is called)
let _game = null;

const W = 600, H = 500;

const COLS = 15, ROWS = 12;
const HEX_W = 38, HEX_H = 34;
const MAP_OX = 14, MAP_OY = 14;

// Terrain types
const T_PLAINS = 0, T_HILLS = 1, T_FOREST = 2, T_MOUNTAIN = 3, T_WATER = 4;
const TERRAIN_COLORS = ['#5a7a3a','#8a7a4a','#3a6a3a','#6a6a6a','#3a5a8a'];
const TERRAIN_FOOD = [3,1,2,0,0];
const TERRAIN_PROD = [1,3,1,0,0];
const TERRAIN_MOVE = [1,2,2,99,99];

// Unit types
const U_SCOUT = 0, U_WARRIOR = 1, U_SETTLER = 2, U_BUILDER = 3;
const UNIT_NAMES = ['Scout','Warrior','Settler','Builder'];
const UNIT_MOVE = [3,2,2,2];
const UNIT_STR = [1,4,0,0];
const UNIT_HP_MAX = [3,6,2,2];
const UNIT_COST = [15,25,40,20];
// Unicode: club, swords, flag, hammer
const UNIT_SYMBOLS = ['\u2667','\u2694','\u2691','\u2692'];

// Player colors
const P_COLORS = ['#4488ff','#ff4444','#44cc44','#cc44cc'];
const P_NAMES = ['You','Red AI','Green AI','Purple AI'];

// Tech tree
const TECHS = [
  { name:'Agriculture', cost:15, desc:'+1 food per city', foodBonus:1 },
  { name:'Mining', cost:25, desc:'+1 prod per city, unlock Builder', prodBonus:1, unlock:U_BUILDER },
  { name:'Construction', cost:35, desc:'Cities +2 defense, +1 prod', defBonus:2, prodBonus:1 },
  { name:'Military', cost:45, desc:'Units +2 str, unlock faster prod', strBonus:2, prodBonus:1 }
];

// ── State ──
let numPlayers, terrain, visible, explored, cities, units, players;
let turn, currentPlayer, selectedUnit, selectedCity, reachable, logLines;
let cityNameIdx;
let score = 0;

// Pending mouse clicks
let pendingClicks = [];

const cityNames = ['Rome','Athens','Babylon','Memphis','Kyoto','Delhi','London','Paris',
  'Beijing','Cairo','Sparta','Thebes','Troy','Ur','Cusco','Axum','Angkor','Knossos',
  'Nineveh','Persepolis','Carthage','Mohenjo','Syracuse','Olympia'];

// ── DOM refs ──
const turnNumEl = document.getElementById('turnNum');
const scoreEl = document.getElementById('score');
const turnInfoEl = document.getElementById('turnInfo');
const endTurnBtn = document.getElementById('endTurnBtn');
const infoPanelEl = document.getElementById('infoPanel');
const selectedInfoEl = document.getElementById('selectedInfo');
const techInfoEl = document.getElementById('techInfo');
const logEl = document.getElementById('log');
const playerCountEl = document.getElementById('playerCount');

// ── Hex Math ──

function hexToPixel(r, c) {
  let x = MAP_OX + c * HEX_W * 0.75 + HEX_W / 2;
  let y = MAP_OY + r * HEX_H + (c % 2 === 1 ? HEX_H / 2 : 0) + HEX_H / 2;
  return { x, y };
}

function pixelToHex(px, py) {
  let bestD = 999, bestR = -1, bestC = -1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let { x, y } = hexToPixel(r, c);
      let d = Math.hypot(px - x, py - y);
      if (d < bestD) { bestD = d; bestR = r; bestC = c; }
    }
  }
  if (bestD < HEX_W * 0.6) return { r: bestR, c: bestC };
  return null;
}

function hexNeighbors(r, c) {
  let n = [];
  let odd = c % 2 === 1;
  let dirs = odd
    ? [[-1,0],[0,-1],[1,-1],[1,0],[1,1],[0,1]]
    : [[-1,0],[-1,-1],[0,-1],[1,0],[0,1],[-1,1]];
  for (let [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) n.push({ r: nr, c: nc });
  }
  return n;
}

function hexDist(r1, c1, r2, c2) {
  function toCube(r, c) {
    let x = c;
    let z = r - (c - (c & 1)) / 2;
    let y = -x - z;
    return { x, y, z };
  }
  let a = toCube(r1, c1), b = toCube(r2, c2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

// Compute the 6 vertices of a hex centered at (cx, cy) with the given size
function hexPoints(cx, cy, size) {
  let pts = [];
  for (let i = 0; i < 6; i++) {
    let ang = Math.PI / 180 * (60 * i - 30);
    pts.push({
      x: cx + size * 0.52 * Math.cos(ang),
      y: cy + size * 0.6 * Math.sin(ang)
    });
  }
  return pts;
}

// ── Color helpers ──

function darken(hex, factor) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);
  return `rgb(${r},${g},${b})`;
}

function withAlpha(color, alpha) {
  // Convert color to rgba string
  if (color.startsWith('#')) {
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // rgb(r,g,b)
  let m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return color;
}

// ── Map Generation ──

function generateMap() {
  terrain = [];
  for (let r = 0; r < ROWS; r++) {
    terrain[r] = [];
    for (let c = 0; c < COLS; c++) {
      let n = Math.random();
      if (n < 0.45) terrain[r][c] = T_PLAINS;
      else if (n < 0.62) terrain[r][c] = T_HILLS;
      else if (n < 0.78) terrain[r][c] = T_FOREST;
      else if (n < 0.88) terrain[r][c] = T_MOUNTAIN;
      else terrain[r][c] = T_WATER;
    }
  }
  let starts = getStartPositions(numPlayers);
  for (let s of starts) {
    terrain[s.r][s.c] = T_PLAINS;
    for (let nb of hexNeighbors(s.r, s.c)) {
      if (terrain[nb.r][nb.c] === T_WATER || terrain[nb.r][nb.c] === T_MOUNTAIN)
        terrain[nb.r][nb.c] = T_PLAINS;
    }
  }
}

function getStartPositions(n) {
  let pos = [
    { r: 2, c: 2 },
    { r: ROWS - 3, c: COLS - 3 },
    { r: 2, c: COLS - 3 },
    { r: ROWS - 3, c: 2 }
  ];
  return pos.slice(0, n);
}

// ── Fog of War ──

function resetVisibility() {
  visible = [];
  for (let r = 0; r < ROWS; r++) {
    visible[r] = [];
    for (let c = 0; c < COLS; c++) visible[r][c] = false;
  }
}

function updateVisibility() {
  resetVisibility();
  for (let u of units) {
    if (u.owner !== 0) continue;
    let radius = u.type === U_SCOUT ? 3 : 2;
    revealAround(u.r, u.c, radius);
  }
  for (let city of cities) {
    if (city.owner !== 0) continue;
    revealAround(city.r, city.c, 2);
  }
}

function revealAround(cr, cc, radius) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (hexDist(cr, cc, r, c) <= radius) {
        visible[r][c] = true;
        explored[r][c] = true;
      }
    }
  }
}

// ── Pathfinding ──

function getReachable(unit) {
  let open = [{ r: unit.r, c: unit.c, moves: unit.moves }];
  let visited = {};
  let key = (r, c) => r * 100 + c;
  visited[key(unit.r, unit.c)] = true;
  let result = [];

  while (open.length > 0) {
    let cur = open.shift();
    for (let nb of hexNeighbors(cur.r, cur.c)) {
      let k = key(nb.r, nb.c);
      if (visited[k]) continue;
      let t = terrain[nb.r][nb.c];
      let cost = TERRAIN_MOVE[t];
      if (cost >= 99) continue;
      let enemyUnit = units.find(u => u.r === nb.r && u.c === nb.c && u.owner !== unit.owner);
      let friendUnit = units.find(u => u.r === nb.r && u.c === nb.c && u.owner === unit.owner && u !== unit);
      if (friendUnit) continue;
      let remaining = cur.moves - cost;
      if (remaining < 0) continue;
      visited[k] = true;
      result.push({ r: nb.r, c: nb.c, enemy: enemyUnit || null });
      if (!enemyUnit) {
        open.push({ r: nb.r, c: nb.c, moves: remaining });
      }
    }
  }
  return result;
}

// ── Unit Factory ──

function makeUnit(type, owner, r, c) {
  return {
    r, c, owner, type,
    hp: UNIT_HP_MAX[type], hpMax: UNIT_HP_MAX[type],
    moves: UNIT_MOVE[type], movesMax: UNIT_MOVE[type]
  };
}

// ── City Management ──

function foundCity(unit) {
  if (unit.type !== U_SETTLER) return;
  if (terrain[unit.r][unit.c] === T_WATER || terrain[unit.r][unit.c] === T_MOUNTAIN) return;
  if (cities.find(c => c.r === unit.r && c.c === unit.c)) return;
  for (let city of cities) {
    if (hexDist(city.r, city.c, unit.r, unit.c) < 3) return;
  }

  let name = cityNames[cityNameIdx++ % cityNames.length];
  let food = TERRAIN_FOOD[terrain[unit.r][unit.c]];
  let prod = TERRAIN_PROD[terrain[unit.r][unit.c]];
  for (let nb of hexNeighbors(unit.r, unit.c)) {
    food += TERRAIN_FOOD[terrain[nb.r][nb.c]] * 0.3;
    prod += TERRAIN_PROD[terrain[nb.r][nb.c]] * 0.3;
  }

  let city = {
    r: unit.r, c: unit.c, owner: unit.owner,
    name, hp: 10, hpMax: 10, defense: 3,
    prod: Math.max(2, Math.floor(prod + 1)),
    food: Math.max(1, Math.floor(food)),
    pop: 1,
    prodTarget: null, prodProgress: 0,
    isCapital: false
  };

  if (!players[unit.owner].capital) {
    players[unit.owner].capital = { r: unit.r, c: unit.c };
    city.isCapital = true;
    city.hp = 15; city.hpMax = 15; city.defense = 5;
  }

  cities.push(city);
  units = units.filter(u => u !== unit);
  if (unit.owner === 0) {
    addLog(`Founded ${name}!`);
    selectedUnit = null;
  }
  updateVisibility();
}

function cityProduce(city) {
  if (!city.prodTarget && city.prodTarget !== 0) return;
  let p = city.prod + (players[city.owner].prodBonus || 0);
  city.prodProgress += p;
  let targetCost = UNIT_COST[city.prodTarget];
  if (city.prodProgress >= targetCost) {
    city.prodProgress = 0;
    let spawn = null;
    let candidates = [{ r: city.r, c: city.c }, ...hexNeighbors(city.r, city.c)];
    for (let pos of candidates) {
      if (terrain[pos.r][pos.c] >= T_MOUNTAIN) continue;
      if (units.find(u => u.r === pos.r && u.c === pos.c)) continue;
      spawn = pos;
      break;
    }
    if (spawn) {
      units.push(makeUnit(city.prodTarget, city.owner, spawn.r, spawn.c));
      if (city.owner === 0) addLog(`${city.name} produced ${UNIT_NAMES[city.prodTarget]}`);
    }
    city.prodTarget = null;
  }
}

function cityResearch(city) {
  let p = players[city.owner];
  if (p.techLevel >= TECHS.length - 1) return;
  let nextTech = p.techLevel + 1;
  p.techProgress += city.food + (p.foodBonus || 0);
  if (p.techProgress >= TECHS[nextTech].cost) {
    p.techProgress -= TECHS[nextTech].cost;
    p.techLevel = nextTech;
    let tech = TECHS[nextTech];
    if (tech.foodBonus) p.foodBonus = (p.foodBonus || 0) + tech.foodBonus;
    if (tech.prodBonus) p.prodBonus = (p.prodBonus || 0) + tech.prodBonus;
    if (tech.strBonus) p.strBonus = (p.strBonus || 0) + tech.strBonus;
    if (tech.defBonus) p.defBonus = (p.defBonus || 0) + tech.defBonus;
    if (city.owner === 0) addLog(`Researched ${tech.name}!`);
  }
}

// ── Combat ──

function combat(attacker, defender) {
  let atkStr = UNIT_STR[attacker.type] + (players[attacker.owner].strBonus || 0);
  let defStr = UNIT_STR[defender.type] + (players[defender.owner].strBonus || 0);
  let t = terrain[defender.r][defender.c];
  if (t === T_HILLS) defStr += 1;
  if (t === T_FOREST) defStr += 1;

  let atkDmg = Math.max(1, atkStr - Math.floor(defStr * 0.3) + Math.floor(Math.random() * 2));
  let defDmg = Math.max(1, defStr - Math.floor(atkStr * 0.3) + Math.floor(Math.random() * 2));

  defender.hp -= atkDmg;
  attacker.hp -= Math.floor(defDmg * 0.6);

  let result = '';
  if (defender.hp <= 0) {
    result = `${UNIT_NAMES[attacker.type]} destroyed ${UNIT_NAMES[defender.type]}`;
    units = units.filter(u => u !== defender);
    attacker.r = defender.r;
    attacker.c = defender.c;
  }
  if (attacker.hp <= 0) {
    result = `${UNIT_NAMES[attacker.type]} was destroyed`;
    units = units.filter(u => u !== attacker);
  }
  if (result && (attacker.owner === 0 || defender.owner === 0)) addLog(result);
  attacker.moves = 0;

  return defender.hp <= 0;
}

function attackCity(unit, city) {
  let str = UNIT_STR[unit.type] + (players[unit.owner].strBonus || 0);
  let def = city.defense + (players[city.owner].defBonus || 0);
  let dmg = Math.max(1, str - Math.floor(def * 0.3) + Math.floor(Math.random() * 2));
  city.hp -= dmg;
  unit.hp -= Math.max(1, Math.floor(def * 0.3));
  unit.moves = 0;

  if (unit.hp <= 0) {
    units = units.filter(u => u !== unit);
    if (unit.owner === 0) addLog(`${UNIT_NAMES[unit.type]} fell attacking ${city.name}`);
  }

  if (city.hp <= 0) {
    let oldOwner = city.owner;
    city.owner = unit.owner;
    city.hp = Math.floor(city.hpMax / 2);
    city.prodTarget = null;
    city.prodProgress = 0;
    if (unit.owner === 0 || oldOwner === 0) addLog(`${city.name} captured!`);
    if (city.isCapital) {
      let ownerCities = cities.filter(c => c.owner === oldOwner);
      if (ownerCities.length === 0) {
        players[oldOwner].alive = false;
        if (oldOwner === 0) addLog('Your civilization has fallen!');
        else addLog(`${P_NAMES[oldOwner]} eliminated!`);
      }
    }
    checkWin();
  }
}

// ── Builder Improvement ──

function buildImprovement(unit) {
  if (unit.type !== U_BUILDER) return;
  let city = cities.find(c => hexDist(c.r, c.c, unit.r, unit.c) <= 2 && c.owner === unit.owner);
  if (!city) return;
  city.prod += 1;
  city.food += 1;
  unit.moves = 0;
  units = units.filter(u => u !== unit);
  if (unit.owner === 0) addLog(`Builder improved area near ${city.name}`);
}

// ── Turn Management ──

function endTurn(game) {
  if (game.state !== 'playing') return;

  let pCities = cities.filter(c => c.owner === currentPlayer);
  for (let city of pCities) {
    cityProduce(city);
    cityResearch(city);
    if (city.hp < city.hpMax) city.hp = Math.min(city.hpMax, city.hp + 1);
  }

  for (let u of units) {
    if (u.owner !== currentPlayer) continue;
    let inCity = cities.find(c => c.r === u.r && c.c === u.c && c.owner === u.owner);
    if (inCity) u.hp = Math.min(u.hpMax, u.hp + 2);
    else u.hp = Math.min(u.hpMax, u.hp + 1);
  }

  currentPlayer++;
  while (currentPlayer < numPlayers && !players[currentPlayer].alive) currentPlayer++;

  if (currentPlayer >= numPlayers) {
    currentPlayer = 0;
    while (currentPlayer < numPlayers && !players[currentPlayer].alive) currentPlayer++;
    turn++;
    if (turn > 40) { endGame(game); return; }
  }

  for (let u of units) {
    if (u.owner === currentPlayer) u.moves = u.movesMax;
  }

  selectedUnit = null;
  selectedCity = null;
  reachable = [];

  if (currentPlayer === 0) {
    updateVisibility();
    updateScore();
  } else {
    runAI(currentPlayer, game);
  }
}

// ── AI ──

function runAI(pid, game) {
  if (!players[pid].alive) { endTurn(game); return; }

  let myCities = cities.filter(c => c.owner === pid);
  let myUnits = units.filter(u => u.owner === pid);

  for (let u of myUnits.filter(u => u.type === U_SETTLER)) {
    let nearCity = cities.find(c => hexDist(c.r, c.c, u.r, u.c) < 3);
    if (!nearCity && terrain[u.r][u.c] !== T_WATER && terrain[u.r][u.c] !== T_MOUNTAIN) {
      foundCity(u);
    } else if (u.moves > 0) {
      aiMoveToward(u, aiFindSettleSpot(pid));
    }
  }

  myCities = cities.filter(c => c.owner === pid);
  for (let city of myCities) {
    if (city.prodTarget === null) {
      city.prodTarget = aiChooseProduction(pid, city);
    }
  }

  myUnits = units.filter(u => u.owner === pid);
  for (let u of myUnits) {
    if (u.type === U_SETTLER) continue;
    if (u.moves <= 0) continue;

    if (u.type === U_BUILDER) {
      let nearCity = cities.find(c => hexDist(c.r, c.c, u.r, u.c) <= 2 && c.owner === pid);
      if (nearCity) {
        buildImprovement(u);
      } else if (myCities.length > 0) {
        aiMoveToward(u, { r: myCities[0].r, c: myCities[0].c });
      }
      continue;
    }

    if (u.type === U_SCOUT) {
      let target = aiFindExploreTarget(u);
      if (target) aiMoveToward(u, target);
      continue;
    }

    let enemyNear = null, bestDist = 999;
    for (let e of units) {
      if (e.owner === pid) continue;
      let d = hexDist(u.r, u.c, e.r, e.c);
      if (d < bestDist) { bestDist = d; enemyNear = e; }
    }

    let enemyCityNear = null, bestCityDist = 999;
    for (let ec of cities) {
      if (ec.owner === pid) continue;
      let d = hexDist(u.r, u.c, ec.r, ec.c);
      if (d < bestCityDist) { bestCityDist = d; enemyCityNear = ec; }
    }

    let myStr = myUnits.filter(mu => mu.type === U_WARRIOR).length;
    let shouldAttack = myStr >= 2 + Math.floor(turn / 10) || turn > 25;

    if (shouldAttack && enemyCityNear && bestCityDist <= 6) {
      if (bestCityDist === 1 || (u.r === enemyCityNear.r && u.c === enemyCityNear.c)) {
        let nb = hexNeighbors(u.r, u.c);
        if (nb.find(n => n.r === enemyCityNear.r && n.c === enemyCityNear.c) ||
            (u.r === enemyCityNear.r && u.c === enemyCityNear.c)) {
          attackCity(u, enemyCityNear);
        }
      } else {
        aiMoveToward(u, { r: enemyCityNear.r, c: enemyCityNear.c });
        let nbs = hexNeighbors(u.r, u.c);
        if (nbs.find(n => n.r === enemyCityNear.r && n.c === enemyCityNear.c)) {
          if (u.moves > 0) attackCity(u, enemyCityNear);
        }
      }
    } else if (enemyNear && bestDist <= 4) {
      aiMoveToward(u, { r: enemyNear.r, c: enemyNear.c });
      reachable = getReachable(u);
      let attackable = reachable.find(h => h.enemy && h.enemy === enemyNear);
      if (attackable) combat(u, enemyNear);
    } else {
      let target = aiFindExploreTarget(u);
      if (target) aiMoveToward(u, target);
    }
  }

  setTimeout(() => endTurn(game), 50);
}

function aiChooseProduction(pid, city) {
  let p = players[pid];
  let myCities = cities.filter(c => c.owner === pid);
  let myWarriors = units.filter(u => u.owner === pid && u.type === U_WARRIOR).length;
  let myScouts = units.filter(u => u.owner === pid && u.type === U_SCOUT).length;
  let mySettlers = units.filter(u => u.owner === pid && u.type === U_SETTLER).length;

  if (myScouts === 0 && turn < 10) return U_SCOUT;
  if (myCities.length < 3 && mySettlers === 0 && turn < 25) return U_SETTLER;
  if (myWarriors < myCities.length + 1) return U_WARRIOR;
  if (p.techLevel >= 1 && Math.random() < 0.3) return U_BUILDER;
  if (turn > 20) return U_WARRIOR;

  let r = Math.random();
  if (r < 0.4) return U_WARRIOR;
  if (r < 0.6 && myCities.length < 4 && mySettlers === 0) return U_SETTLER;
  if (r < 0.8) return U_SCOUT;
  return U_WARRIOR;
}

function aiFindSettleSpot(pid) {
  let best = null, bestScore = -999;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (terrain[r][c] >= T_MOUNTAIN) continue;
      let tooClose = false;
      for (let city of cities) {
        if (hexDist(city.r, city.c, r, c) < 3) { tooClose = true; break; }
      }
      if (tooClose) continue;
      let sc = TERRAIN_FOOD[terrain[r][c]] + TERRAIN_PROD[terrain[r][c]];
      for (let nb of hexNeighbors(r, c)) {
        sc += (TERRAIN_FOOD[terrain[nb.r][nb.c]] + TERRAIN_PROD[terrain[nb.r][nb.c]]) * 0.3;
      }
      if (sc > bestScore) { bestScore = sc; best = { r, c }; }
    }
  }
  return best || { r: 6, c: 7 };
}

function aiFindExploreTarget(unit) {
  let best = null, bestDist = -1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (terrain[r][c] >= T_MOUNTAIN) continue;
      let d = hexDist(unit.r, unit.c, r, c);
      if (d > 3 && d < 8) {
        let distFromCities = 0;
        for (let city of cities.filter(ci => ci.owner === unit.owner)) {
          distFromCities += hexDist(city.r, city.c, r, c);
        }
        if (distFromCities > bestDist) { bestDist = distFromCities; best = { r, c }; }
      }
    }
  }
  return best;
}

function aiMoveToward(unit, target) {
  if (!target || unit.moves <= 0) return;
  let steps = 0;
  while (unit.moves > 0 && steps < 4) {
    steps++;
    let nbs = hexNeighbors(unit.r, unit.c);
    let best = null, bestD = hexDist(unit.r, unit.c, target.r, target.c);
    for (let nb of nbs) {
      if (terrain[nb.r][nb.c] >= T_MOUNTAIN) continue;
      if (units.find(u => u.r === nb.r && u.c === nb.c && u.owner === unit.owner)) continue;
      let d = hexDist(nb.r, nb.c, target.r, target.c);
      let cost = TERRAIN_MOVE[terrain[nb.r][nb.c]];
      if (d < bestD && cost <= unit.moves) {
        let enemy = units.find(u => u.r === nb.r && u.c === nb.c && u.owner !== unit.owner);
        if (enemy && unit.type === U_WARRIOR) {
          combat(unit, enemy);
          return;
        }
        if (!enemy) { best = nb; bestD = d; }
      }
    }
    if (!best) break;
    let cost = TERRAIN_MOVE[terrain[best.r][best.c]];
    unit.r = best.r;
    unit.c = best.c;
    unit.moves -= cost;
  }
}

// ── Score / Win / Loss ──

function updateScore() {
  for (let i = 0; i < numPlayers; i++) {
    let p = players[i];
    if (!p.alive) { p.score = 0; continue; }
    let myCities = cities.filter(c => c.owner === i);
    let myUnits = units.filter(u => u.owner === i);
    p.score = myCities.length * 10 + (p.techLevel + 1) * 5 + myUnits.length * 2 +
      myCities.reduce((s, c) => s + c.pop, 0);
  }
  score = players[0].score;
  if (scoreEl) scoreEl.textContent = score;
  if (turnNumEl) turnNumEl.textContent = turn;
}

function checkWin() {
  let aliveCount = players.filter(p => p.alive).length;
  if (aliveCount <= 1) {
    let winner = players.findIndex(p => p.alive);
    if (winner >= 0) endGame(_game, winner);
  }
}

function endGame(game, winnerOverride) {
  updateScore();
  let winner = winnerOverride !== undefined ? winnerOverride : -1;
  if (winner < 0) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < numPlayers; i++) {
      if (players[i].score > bestScore) { bestScore = players[i].score; best = i; }
    }
    winner = best;
  }

  let title = winner === 0 ? 'VICTORY!' : P_NAMES[winner] + ' WINS';
  let body = `Final Turn ${Math.min(turn, 40)}/40\n` +
    players.map((p, i) => `${P_NAMES[i]}: ${p.score}pts${!p.alive ? ' (eliminated)' : ''}`).join('  |  ');

  game.showOverlay(title, body);
  game.setState('over');
  if (endTurnBtn) endTurnBtn.style.display = 'none';
}

// ── Log ──

function addLog(msg) {
  logLines.unshift(`T${turn}: ${msg}`);
  if (logLines.length > 30) logLines.pop();
  if (logEl) logEl.innerHTML = logLines.join('<br>');
}

// ── DOM Panel Updates ──

function updateInfoPanel() {
  if (!selectedInfoEl || !techInfoEl) return;

  // Selected info
  if (selectedUnit && selectedUnit.owner === 0) {
    let u = selectedUnit;
    let html = `<b>${UNIT_NAMES[u.type]}</b> HP: ${u.hp}/${u.hpMax} Moves: ${u.moves}<br>`;
    if (u.type === U_SETTLER) {
      let canFound = !cities.find(c => hexDist(c.r, c.c, u.r, u.c) < 3) &&
        terrain[u.r][u.c] < T_MOUNTAIN;
      html += `<button class="action-btn" ${canFound ? 'onclick="window._civDoFoundCity()"' : 'disabled'}>Found City</button>`;
    }
    if (u.type === U_BUILDER) {
      let nearCity = cities.find(c => hexDist(c.r, c.c, u.r, u.c) <= 2 && c.owner === 0);
      html += `<button class="action-btn" ${nearCity ? 'onclick="window._civDoBuild()"' : 'disabled'}>Build Improvement</button>`;
    }
    selectedInfoEl.innerHTML = html;
  } else if (selectedCity && selectedCity.owner === 0) {
    let c = selectedCity;
    let html = `<b>${c.name}</b>${c.isCapital ? ' [CAPITAL]' : ''}<br>`;
    html += `HP: ${c.hp}/${c.hpMax} Pop: ${c.pop} Prod: ${c.prod}+${players[0].prodBonus} Food: ${c.food}<br>`;
    if (c.prodTarget !== null) {
      html += `Building: ${UNIT_NAMES[c.prodTarget]} (${c.prodProgress}/${UNIT_COST[c.prodTarget]})<br>`;
    } else {
      html += 'Produce: ';
      for (let i = 0; i < UNIT_NAMES.length; i++) {
        if (i === U_BUILDER && players[0].techLevel < 1) continue;
        html += `<button class="action-btn" onclick="window._civSetProd(${i})">${UNIT_NAMES[i]} (${UNIT_COST[i]})</button>`;
      }
    }
    selectedInfoEl.innerHTML = html;
  } else {
    selectedInfoEl.innerHTML = 'Click a unit or city on the map';
  }

  // Tech info
  let p = players[0];
  let html = '';
  for (let i = 0; i < TECHS.length; i++) {
    let t = TECHS[i];
    if (i <= p.techLevel) {
      html += `<span style="color:#4f4">\u2713 ${t.name}</span><br>`;
    } else if (i === p.techLevel + 1) {
      html += `<b style="color:#ca4">\u25B6 ${t.name}</b> ${p.techProgress}/${t.cost}<br>`;
      html += `<span style="color:#888;font-size:0.65rem">${t.desc}</span><br>`;
    } else {
      html += `<span style="color:#555">\u25CB ${t.name}</span><br>`;
    }
  }
  techInfoEl.innerHTML = html;
}

function updateTurnInfo() {
  if (!turnInfoEl) return;
  if (currentPlayer === 0) {
    turnInfoEl.textContent = 'Your Turn';
    turnInfoEl.style.color = P_COLORS[0];
  } else {
    turnInfoEl.textContent = `${P_NAMES[currentPlayer]}'s Turn`;
    turnInfoEl.style.color = P_COLORS[currentPlayer];
  }
}

// ── Drawing ──

function drawHexFilled(renderer, cx, cy, size, fillColor) {
  let pts = hexPoints(cx, cy, size);
  renderer.fillPoly(pts, fillColor);
}

function drawHexStroked(renderer, cx, cy, size, strokeColor, lw) {
  let pts = hexPoints(cx, cy, size);
  renderer.strokePoly(pts, strokeColor, lw || 1, true);
}

function drawMap(renderer, text) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let { x, y } = hexToPixel(r, c);
      let t = terrain[r][c];

      if (!explored[r][c]) {
        drawHexFilled(renderer, x, y, HEX_W, '#0a0a18');
        drawHexStroked(renderer, x, y, HEX_W, '#16213e', 0.5);
        continue;
      }

      let vis = visible[r][c];
      let color = TERRAIN_COLORS[t];
      if (!vis) color = darken(color, 0.4);

      drawHexFilled(renderer, x, y, HEX_W, color);
      drawHexStroked(renderer, x, y, HEX_W, '#16213e', 0.5);

      // Terrain icon
      let alpha = vis ? 0.3 : 0.1;
      let icon = ['~','^','T','M','W'][t];
      text.drawText(icon, x, y + 5, 9, `rgba(255,255,255,${alpha})`, 'center');
    }
  }
}

function drawReachable(renderer) {
  for (let h of reachable) {
    let { x, y } = hexToPixel(h.r, h.c);
    let fillColor = h.enemy ? 'rgba(255,80,80,0.35)' : 'rgba(204,170,68,0.25)';
    let strokeColor = h.enemy ? '#f44' : '#ca4';
    drawHexFilled(renderer, x, y, HEX_W, fillColor);
    drawHexStroked(renderer, x, y, HEX_W, strokeColor, 1.5);
  }
}

function drawCities(renderer, text) {
  for (let city of cities) {
    if (!visible[city.r][city.c] && !explored[city.r][city.c]) continue;
    let { x, y } = hexToPixel(city.r, city.c);
    let vis = visible[city.r][city.c];
    let alpha = vis ? 1.0 : 0.4;

    let darkOwnerColor = darken(P_COLORS[city.owner], 0.6);
    // Encode alpha into the color
    let fillColor = withAlpha(darkOwnerColor, alpha);
    let strokeColor = withAlpha(P_COLORS[city.owner], alpha);

    drawHexFilled(renderer, x, y, HEX_W, fillColor);
    drawHexStroked(renderer, x, y, HEX_W, strokeColor, 2);

    // City icon (crown for capital, square for regular)
    let iconColor = withAlpha(P_COLORS[city.owner], alpha);
    let iconText = city.isCapital ? '\u2655' : '\u25A0';
    let iconSize = city.isCapital ? 14 : 12;
    text.drawText(iconText, x, y - 8, iconSize, iconColor, 'center');

    // City name
    let nameColor = withAlpha('#fff', alpha);
    text.drawText(city.name, x, y - 19, 7, nameColor, 'center');

    // HP bar (only when visible)
    if (vis) {
      let bw = 16, bh = 2;
      renderer.fillRect(x - bw / 2, y + 6, bw, bh, '#400');
      renderer.fillRect(x - bw / 2, y + 6, bw * (city.hp / city.hpMax), bh, '#4f4');
    }
  }
}

function drawUnits(renderer, text) {
  for (let u of units) {
    if (!visible[u.r][u.c]) continue;
    let { x, y } = hexToPixel(u.r, u.c);

    // Unit circle
    renderer.fillCircle(x, y, 7, P_COLORS[u.owner]);
    let ringColor = u === selectedUnit ? '#ffffff' : darken(P_COLORS[u.owner], 0.5);
    let ringWidth = u === selectedUnit ? 2 : 1;
    renderer.strokePoly(
      Array.from({length: 16}, (_, i) => ({
        x: x + 7 * Math.cos(i / 16 * Math.PI * 2),
        y: y + 7 * Math.sin(i / 16 * Math.PI * 2)
      })),
      ringColor, ringWidth, true
    );

    // Unit symbol
    text.drawText(UNIT_SYMBOLS[u.type], x, y - 5, 9, '#ffffff', 'center');

    // HP bar
    if (u.hp < u.hpMax) {
      let bw = 10, bh = 2;
      renderer.fillRect(x - bw / 2, y - 10, bw, bh, '#400');
      renderer.fillRect(x - bw / 2, y - 10, bw * (u.hp / u.hpMax), bh, '#4f4');
    }

    // Movement dots
    if (u.owner === 0 && u.moves > 0) {
      for (let m = 0; m < Math.min(u.moves, 3); m++) {
        renderer.fillCircle(x - 5 + m * 5, y + 10, 1.5, '#ca4');
      }
    }
  }
}

function drawMinimap(renderer, text) {
  let mx = W - 100, my = 6, mw = 92, mh = 62;

  // Background
  renderer.fillRect(mx, my, mw, mh, 'rgba(10,10,24,0.85)');
  // Border
  renderer.strokePoly([
    {x: mx, y: my}, {x: mx + mw, y: my},
    {x: mx + mw, y: my + mh}, {x: mx, y: my + mh}
  ], '#ca4', 1, true);

  let sx = mw / COLS, sy = mh / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!explored[r][c]) continue;
      let t = terrain[r][c];
      let col = visible[r][c] ? TERRAIN_COLORS[t] : darken(TERRAIN_COLORS[t], 0.4);
      renderer.fillRect(mx + c * sx, my + r * sy, sx, sy, col);
    }
  }

  // Cities on minimap
  for (let city of cities) {
    renderer.fillRect(mx + city.c * sx - 1, my + city.r * sy - 1, 3, 3, P_COLORS[city.owner]);
  }

  // Units on minimap
  for (let u of units) {
    if (u.owner === 0 || visible[u.r][u.c]) {
      renderer.fillRect(mx + u.c * sx, my + u.r * sy, 2, 2, P_COLORS[u.owner]);
    }
  }

  text.drawText('MAP', mx + 2, my + mh - 10, 6, '#ca4', 'left');
}

function drawTitleScreen(renderer) {
  // Decorative hex grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let { x, y } = hexToPixel(r, c);
      let alpha = 0.05 + Math.random() * 0.08;
      drawHexFilled(renderer, x, y, HEX_W, `rgba(204,170,68,${alpha})`);
      drawHexStroked(renderer, x, y, HEX_W, 'rgba(204,170,68,0.1)', 0.5);
    }
  }
}

// ── Input Handling (Click) ──

function handleClick(mx, my, game) {
  if (game.state !== 'playing' || currentPlayer !== 0) return;

  let hex = pixelToHex(mx, my);
  if (!hex) return;

  // Move selected unit to reachable hex
  if (selectedUnit && selectedUnit.owner === 0 && selectedUnit.moves > 0) {
    let dest = reachable.find(h => h.r === hex.r && h.c === hex.c);
    if (dest) {
      if (dest.enemy) {
        combat(selectedUnit, dest.enemy);
      } else {
        let cost = TERRAIN_MOVE[terrain[hex.r][hex.c]];
        selectedUnit.r = hex.r;
        selectedUnit.c = hex.c;
        selectedUnit.moves = Math.max(0, selectedUnit.moves - cost);

        // Check if moved onto enemy city
        let enemyCity = cities.find(c => c.r === hex.r && c.c === hex.c && c.owner !== 0);
        if (enemyCity && selectedUnit && UNIT_STR[selectedUnit.type] > 0) {
          attackCity(selectedUnit, enemyCity);
        }
      }
      updateVisibility();
      if (selectedUnit && selectedUnit.moves > 0) {
        reachable = getReachable(selectedUnit);
      } else {
        reachable = [];
      }
      updateScore();
      updateInfoPanel();
      updateTurnInfo();
      return;
    }
  }

  // Click own unit
  let clickedUnit = units.find(u => u.r === hex.r && u.c === hex.c && u.owner === 0);
  if (clickedUnit) {
    selectedUnit = clickedUnit;
    selectedCity = null;
    reachable = clickedUnit.moves > 0 ? getReachable(clickedUnit) : [];
    updateInfoPanel();
    return;
  }

  // Click own city
  let clickedCity = cities.find(c => c.r === hex.r && c.c === hex.c && c.owner === 0);
  if (clickedCity) {
    selectedCity = clickedCity;
    selectedUnit = null;
    reachable = [];
    updateInfoPanel();
    return;
  }

  // Deselect
  selectedUnit = null;
  selectedCity = null;
  reachable = [];
  updateInfoPanel();
}

// ── Export ──

export function createGame() {
  const game = new Game('game');
  _game = game;
  const canvasEl = document.getElementById('game');

  // Queue canvas clicks for processing in onUpdate
  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    pendingClicks.push({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
  });

  // DOM action buttons exposed as globals
  window._civDoFoundCity = function() {
    if (selectedUnit && selectedUnit.type === U_SETTLER) {
      foundCity(selectedUnit);
      updateVisibility();
      updateScore();
      updateInfoPanel();
      updateTurnInfo();
    }
  };

  window._civDoBuild = function() {
    if (selectedUnit && selectedUnit.type === U_BUILDER) {
      buildImprovement(selectedUnit);
      selectedUnit = null;
      reachable = [];
      updateScore();
      updateInfoPanel();
      updateTurnInfo();
    }
  };

  window._civSetProd = function(unitType) {
    if (selectedCity && selectedCity.owner === 0) {
      selectedCity.prodTarget = unitType;
      selectedCity.prodProgress = 0;
      updateInfoPanel();
    }
  };

  if (endTurnBtn) {
    endTurnBtn.addEventListener('click', () => {
      if (game.state === 'playing' && currentPlayer === 0) endTurn(game);
    });
  }

  // Start button
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (game.state === 'waiting' || game.state === 'over') {
        doInit(game);
      }
    });
  }

  game.onInit = () => {
    score = 0;
    pendingClicks = [];
    selectedUnit = null;
    selectedCity = null;
    reachable = [];
    logLines = [];
    cityNameIdx = 0;

    game.showOverlay('CIVILIZATION MICRO', '4X Strategy in 40 Turns — Select players and click Start');
    game.setState('waiting');

    if (infoPanelEl) infoPanelEl.style.display = 'none';
    if (endTurnBtn) endTurnBtn.style.display = 'none';
    if (turnNumEl) turnNumEl.textContent = '0';
    if (scoreEl) scoreEl.textContent = '0';
    if (turnInfoEl) { turnInfoEl.textContent = '--'; turnInfoEl.style.color = '#aaa'; }
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    const input = game.input;

    if (game.state === 'waiting') {
      // Keyboard start handled via Enter key
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        doInit(game);
      }
      pendingClicks = []; // discard clicks while overlay showing (start btn handles it)
      return;
    }

    if (game.state === 'over') {
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        game.onInit();
      }
      pendingClicks = [];
      return;
    }

    // playing state
    // Keyboard shortcuts
    if (input.wasPressed('Enter') || input.wasPressed(' ')) {
      if (currentPlayer === 0) endTurn(game);
    }
    if (input.wasPressed('Escape')) {
      selectedUnit = null;
      selectedCity = null;
      reachable = [];
      updateInfoPanel();
    }
    if (input.wasPressed('f') && selectedUnit && selectedUnit.type === U_SETTLER) {
      window._civDoFoundCity();
    }
    if (input.wasPressed('b') && selectedUnit && selectedUnit.type === U_BUILDER) {
      window._civDoBuild();
    }

    // Process click queue
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();
      handleClick(click.x, click.y, game);
    }

    // Keep DOM turn indicator up to date
    updateTurnInfo();
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      // Draw decorative title screen behind overlay
      if (terrain) {
        drawMap(renderer, text);
      } else {
        drawTitleScreen(renderer);
      }
      return;
    }

    // Draw map
    drawMap(renderer, text);

    // Draw reachable highlight
    drawReachable(renderer);

    // Draw cities
    drawCities(renderer, text);

    // Draw units
    drawUnits(renderer, text);

    // Draw minimap
    drawMinimap(renderer, text);
  };

  game.start();
  return game;
}

// ── Init (actual game start) ──

function doInit(game) {
  numPlayers = parseInt((playerCountEl ? playerCountEl.value : null) || '2');
  turn = 1;
  currentPlayer = 0;
  selectedUnit = null;
  selectedCity = null;
  reachable = [];
  cities = [];
  units = [];
  logLines = [];
  cityNameIdx = 0;
  score = 0;

  players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      alive: true, techLevel: -1, techProgress: 0, score: 0,
      capital: null, gold: 0, prodBonus: 0, strBonus: 0, foodBonus: 0, defBonus: 0
    });
  }

  generateMap();

  explored = [];
  for (let r = 0; r < ROWS; r++) {
    explored[r] = [];
    for (let c = 0; c < COLS; c++) explored[r][c] = false;
  }

  let starts = getStartPositions(numPlayers);
  for (let i = 0; i < numPlayers; i++) {
    let s = starts[i];
    units.push(makeUnit(U_SETTLER, i, s.r, s.c));
    units.push(makeUnit(U_WARRIOR, i, s.r, s.c + 1));
  }

  updateVisibility();
  updateScore();
  pendingClicks = [];

  game.setState('playing');
  if (infoPanelEl) infoPanelEl.style.display = 'flex';
  if (endTurnBtn) endTurnBtn.style.display = 'inline-block';

  addLog('Game started! Found a city with your Settler.');
  updateInfoPanel();
  updateTurnInfo();
}
