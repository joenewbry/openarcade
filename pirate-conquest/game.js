// pirate-conquest/game.js — Pirate Conquest ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ===================== CONSTANTS =====================
const MAX_TURNS = 30;
const PLAYER_COLORS = ['#4af', '#f55', '#5d5', '#f8f'];
const PLAYER_NAMES = ['You', 'Blackbeard', 'Red Anne', 'El Diablo'];
const GOODS = ['rum', 'sugar', 'spices', 'gold'];
const GOOD_COLORS = { rum: '#c84', sugar: '#eee', spices: '#f80', gold: '#ec4' };
const GOOD_EMOJI  = { rum: 'R', sugar: 'S', spices: 'P', gold: 'G' };
const SHIP_TYPES = {
  sloop:      { name: 'Sloop',      cost: 80,  hp: 35,  speed: 4, cannons: 2, range: 65, cargo: 20, icon: 'S' },
  brigantine: { name: 'Brigantine', cost: 200, hp: 65,  speed: 3, cannons: 5, range: 55, cargo: 40, icon: 'B' },
  galleon:    { name: 'Galleon',    cost: 400, hp: 110, speed: 2, cannons: 9, range: 50, cargo: 80, icon: 'G' },
};

const ISLANDS = [
  { x: 80,  y: 75,  r: 42, color: '#2a5a2a' },
  { x: 210, y: 55,  r: 35, color: '#2d5d28' },
  { x: 380, y: 50,  r: 48, color: '#2a5a2a' },
  { x: 530, y: 75,  r: 44, color: '#2d5d28' },
  { x: 90,  y: 230, r: 52, color: '#2a5a2a' },
  { x: 300, y: 200, r: 30, color: '#306030' },
  { x: 490, y: 225, r: 48, color: '#2d5d28' },
  { x: 60,  y: 390, r: 38, color: '#2a5a2a' },
  { x: 220, y: 365, r: 44, color: '#2d5d28' },
  { x: 400, y: 380, r: 42, color: '#2a5a2a' },
  { x: 545, y: 405, r: 48, color: '#306030' },
  { x: 310, y: 440, r: 28, color: '#2d5d28' },
];

const PORT_DEFS = [
  { name: 'Havana',     x: 80,  y: 72,  island: 0,  produces: 'rum',    home: 0 },
  { name: 'Nassau',     x: 212, y: 52,  island: 1,  produces: 'sugar'          },
  { name: 'Tortuga',    x: 378, y: 48,  island: 2,  produces: 'spices'         },
  { name: 'Port Royal', x: 532, y: 72,  island: 3,  produces: 'gold',   home: 1 },
  { name: 'Cartagena',  x: 88,  y: 230, island: 4,  produces: 'gold'           },
  { name: 'Barbados',   x: 302, y: 198, island: 5,  produces: 'sugar'          },
  { name: 'Maracaibo',  x: 488, y: 225, island: 6,  produces: 'rum'            },
  { name: 'Trinidad',   x: 58,  y: 390, island: 7,  produces: 'spices', home: 2 },
  { name: 'Curacao',    x: 222, y: 362, island: 8,  produces: 'rum'            },
  { name: 'Martinique', x: 398, y: 378, island: 9,  produces: 'sugar'          },
  { name: 'Santo Dom.', x: 548, y: 402, island: 10, produces: 'gold',   home: 3 },
  { name: 'St. Kitts',  x: 312, y: 438, island: 11, produces: 'spices'         },
];

// ===================== GAME STATE =====================
let gameState = 'start';
let score = 0;
let turn, players, ports, ships, selectedShip, combatLog, hoverPort, tradePort, buyMode;
let currentPlayer;
let islandSeeds;
let cannonEffects = [];
let floatingTexts = [];
let mouseX = 0, mouseY = 0;
let frameCount = 0; // for wave animation

// ===================== HELPERS =====================
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function totalCargo(ship) { return GOODS.reduce((s, g) => s + ship.cargo[g], 0); }
function cargoSpace(ship) { return ship.maxCargo - totalCargo(ship); }
function playerShips(pid) { return ships.filter(s => s.owner === pid && !s.sunk); }
function playerPorts(pid) { return ports.filter(p => p.owner === pid); }

function playerScore(pid) {
  let g = players[pid].gold;
  playerShips(pid).forEach(s => {
    GOODS.forEach(gd => { g += s.cargo[gd] * 8; });
    g += Math.floor(SHIP_TYPES[s.type].cost * 0.3);
  });
  g += playerPorts(pid).length * 50;
  return g;
}

function addFloatingText(x, y, txt, color) {
  floatingTexts.push({ x, y, text: txt, color, life: 60, startY: y });
}
function addCannonEffect(x1, y1, x2, y2) {
  cannonEffects.push({ x1, y1, x2, y2, life: 15 });
}

// ===================== ALPHA HELPER =====================
function hexAlpha(hex, alpha) {
  // Returns #rrggbbaa from a short or full hex color + 0-1 alpha
  let r, g, b;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return '#' + [r, g, b, a].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Constant semi-transparent colors precomputed
const OCEAN_TOP    = '#082840';
const OCEAN_MID    = '#0c3560';
const OCEAN_WAVE   = hexAlpha('#3c82c8', 0.06);
const PANEL_BG     = hexAlpha('#0c1024', 0.96);
const SCOREBOARD_BG = hexAlpha('#0c1024', 0.85);
const COMBATLOG_BG  = hexAlpha('#0c1024', 0.80);
const HUD_TXT      = hexAlpha('#ec4', 0.35);

// ===================== INIT =====================
function initIslandSeeds() {
  islandSeeds = ISLANDS.map(() => {
    const pts = [];
    const n = 10 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.65 + Math.random() * 0.55;
      pts.push({ a, r });
    }
    return pts;
  });
}

function initGame() {
  turn = 1;
  combatLog = [];
  cannonEffects = [];
  floatingTexts = [];
  selectedShip = null;
  hoverPort = null;
  tradePort = -1;
  buyMode = true;
  currentPlayer = 0;

  ports = PORT_DEFS.map((pd) => ({
    name: pd.name,
    x: pd.x, y: pd.y,
    produces: pd.produces,
    owner: pd.home !== undefined ? pd.home : -1,
    defense: pd.home !== undefined ? 3 : 2,
    prices: {},
    supply: {},
  }));

  ports.forEach(p => {
    GOODS.forEach(g => {
      if (g === p.produces) {
        p.prices[g] = 4 + Math.floor(Math.random() * 5);
        p.supply[g] = 30 + Math.floor(Math.random() * 20);
      } else {
        p.prices[g] = 15 + Math.floor(Math.random() * 16);
        p.supply[g] = Math.floor(Math.random() * 8);
      }
    });
  });

  players = [];
  for (let i = 0; i < 4; i++) {
    players.push({ id: i, name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], gold: 120, isHuman: i === 0 });
  }

  ships = [];
  for (let i = 0; i < 4; i++) {
    const homePort = ports.find((_, idx) => PORT_DEFS[idx].home === i);
    ships.push(createShip(i, 'sloop', homePort.x + 15, homePort.y + 15));
  }

  updateUI();
}

function createShip(owner, type, x, y) {
  const t = SHIP_TYPES[type];
  return {
    id: Math.random().toString(36).substring(2, 8),
    owner, type, x, y,
    hp: t.hp, maxHp: t.hp,
    cannons: t.cannons, speed: t.speed, range: t.range,
    maxCargo: t.cargo,
    cargo: { rum: 0, sugar: 0, spices: 0, gold: 0 },
    moved: false, acted: false, sunk: false,
    angle: Math.random() * Math.PI * 2,
  };
}

// ===================== TURN MANAGEMENT =====================
function startPlayerTurn(pid) {
  currentPlayer = pid;
  selectedShip = null;
  tradePort = -1;

  playerShips(pid).forEach(s => { s.moved = false; s.acted = false; });

  playerPorts(pid).forEach(p => {
    players[pid].gold += 5;
    p.supply[p.produces] = Math.min(50, p.supply[p.produces] + 6);
  });

  if (pid === 0) {
    ports.forEach(p => {
      GOODS.forEach(g => {
        const delta = Math.floor(Math.random() * 3) - 1;
        p.prices[g] = Math.max(2, Math.min(35, p.prices[g] + delta));
        if (g === p.produces && p.prices[g] > 12) p.prices[g] -= 2;
      });
    });
  }

  if (pid !== 0) {
    setTimeout(() => aiTurn(pid), 250);
  }
  updateUI();
}

function endPlayerTurn() {
  tradePort = -1;
  selectedShip = null;
  ships = ships.filter(s => !s.sunk);

  const nextPid = (currentPlayer + 1) % 4;
  if (nextPid === 0) {
    turn++;
    if (turn > MAX_TURNS) { endGame(); return; }
  }
  startPlayerTurn(nextPid);
}

function endGame() {
  gameState = 'over';
  score = playerScore(0);

  let best = 0, bestScore = 0;
  for (let i = 0; i < 4; i++) {
    const s = playerScore(i);
    if (s > bestScore) { bestScore = s; best = i; }
  }

  const title = best === 0 ? 'VICTORY!' : 'DEFEATED';
  let ranking = players.map((_, i) => ({ i, s: playerScore(i) }))
    .sort((a, b) => b.s - a.s)
    .map((r, idx) => `${idx + 1}. ${PLAYER_NAMES[r.i]}: ${r.s}g (${playerPorts(r.i).length} ports, ${playerShips(r.i).length} ships)`)
    .join('\n');

  _gameRef.showOverlay(title, `${PLAYER_NAMES[best]} wins with ${bestScore} doubloons!\nYour score: ${score}\n\n${ranking}\n\nClick to play again`);
  _gameRef.setState('over');

  document.getElementById('score').textContent = score;
}

// ===================== COMBAT =====================
function doCombat(attacker, defender) {
  addCannonEffect(attacker.x, attacker.y, defender.x, defender.y);
  const atkRoll = attacker.cannons * (3 + Math.floor(Math.random() * 4));
  const defRoll = defender.cannons * (2 + Math.floor(Math.random() * 4));
  const d = dist(attacker, defender);
  const rangeMult = d < 30 ? 1.3 : (d < 50 ? 1.1 : 1.0);
  const atkDmg = Math.floor(atkRoll * rangeMult);
  const defDmg = Math.floor(defRoll * 0.9);

  defender.hp -= atkDmg;
  attacker.hp -= defDmg;

  addFloatingText(defender.x, defender.y - 15, `-${atkDmg}`, '#f55');
  addFloatingText(attacker.x, attacker.y - 15, `-${defDmg}`, '#fa0');

  const logMsg = `${PLAYER_NAMES[attacker.owner]} ${SHIP_TYPES[attacker.type].icon} hit ${PLAYER_NAMES[defender.owner]} ${SHIP_TYPES[defender.type].icon} for ${atkDmg}`;
  combatLog.unshift(logMsg);
  if (combatLog.length > 6) combatLog.pop();

  if (defender.hp <= 0) {
    defender.sunk = true;
    GOODS.forEach(g => {
      const loot = Math.floor(defender.cargo[g] / 2);
      const take = Math.min(loot, cargoSpace(attacker));
      if (take > 0) attacker.cargo[g] += take;
    });
    players[attacker.owner].gold += 25;
    addFloatingText(defender.x, defender.y, 'SUNK! +25g', '#ec4');
    combatLog.unshift(`${PLAYER_NAMES[defender.owner]}'s ${SHIP_TYPES[defender.type].name} sunk!`);
  }
  if (attacker.hp <= 0) {
    attacker.sunk = true;
    combatLog.unshift(`${PLAYER_NAMES[attacker.owner]}'s ${SHIP_TYPES[attacker.type].name} sunk!`);
  }
  attacker.acted = true;
}

function capturePort(ship, portIdx) {
  const port = ports[portIdx];
  addCannonEffect(ship.x, ship.y, port.x, port.y);
  const atkPower = ship.cannons * (3 + Math.floor(Math.random() * 3));
  const defPower = port.defense * 5;
  ship.hp -= Math.floor(port.defense * (2 + Math.random() * 3));

  if (atkPower >= defPower) {
    port.owner = ship.owner;
    port.defense = 2;
    players[ship.owner].gold += 20;
    addFloatingText(port.x, port.y - 10, `${port.name} CAPTURED!`, '#ec4');
    combatLog.unshift(`${PLAYER_NAMES[ship.owner]} captured ${port.name}!`);
  } else {
    port.defense = Math.max(1, port.defense - 1);
    addFloatingText(port.x, port.y - 10, 'Repelled!', '#f55');
    combatLog.unshift(`${port.name} repelled ${PLAYER_NAMES[ship.owner]}!`);
  }
  if (ship.hp <= 0) ship.sunk = true;
  ship.acted = true;
  if (combatLog.length > 6) combatLog.pop();
}

// ===================== TRADING =====================
function buyGood(ship, portIdx, good, qty) {
  const port = ports[portIdx];
  const price = port.prices[good];
  const maxBuy = Math.min(qty, Math.floor(players[ship.owner].gold / price), port.supply[good], cargoSpace(ship));
  if (maxBuy <= 0) return 0;
  players[ship.owner].gold -= maxBuy * price;
  ship.cargo[good] += maxBuy;
  port.supply[good] -= maxBuy;
  port.prices[good] = Math.min(35, port.prices[good] + Math.ceil(maxBuy / 4));
  addFloatingText(ship.x, ship.y - 10, `+${maxBuy} ${good}`, GOOD_COLORS[good]);
  return maxBuy;
}

function sellGood(ship, portIdx, good, qty) {
  const port = ports[portIdx];
  const price = port.prices[good];
  const maxSell = Math.min(qty, ship.cargo[good]);
  if (maxSell <= 0) return 0;
  const revenue = maxSell * price;
  players[ship.owner].gold += revenue;
  ship.cargo[good] -= maxSell;
  port.supply[good] += maxSell;
  port.prices[good] = Math.max(2, port.prices[good] - Math.ceil(maxSell / 4));
  addFloatingText(ship.x, ship.y - 10, `+${revenue}g`, '#ec4');
  return maxSell;
}

// ===================== AI =====================
function aiTurn(pid) {
  const myShips = playerShips(pid);

  myShips.forEach(ship => {
    if (ship.sunk) return;

    const nearbyEnemies = ships.filter(s => s.owner !== pid && !s.sunk && dist(s, ship) < 130);
    if (nearbyEnemies.length > 0 && ship.hp > ship.maxHp * 0.45) {
      nearbyEnemies.sort((a, b) => a.hp - b.hp);
      const target = nearbyEnemies[0];
      if (target.hp < ship.hp * 1.3) {
        moveShipToward(ship, target.x, target.y);
        if (dist(ship, target) < ship.range) { doCombat(ship, target); return; }
      }
    }

    if (totalCargo(ship) > ship.maxCargo * 0.3) {
      let bestSell = -1, bestVal = 0;
      GOODS.forEach(g => {
        if (ship.cargo[g] > 0) {
          ports.forEach((p, pi) => {
            const val = p.prices[g] * ship.cargo[g] / (dist(p, ship) + 50);
            if (val > bestVal) { bestVal = val; bestSell = pi; }
          });
        }
      });
      if (bestSell >= 0) {
        const sp = ports[bestSell];
        moveShipToward(ship, sp.x, sp.y);
        if (dist(ship, sp) < 22) {
          GOODS.forEach(g => { if (ship.cargo[g] > 0) sellGood(ship, bestSell, g, ship.cargo[g]); });
          ship.acted = true;
        }
        return;
      }
    }

    let bestRoute = null, bestEff = 0;
    ports.forEach((bp, bi) => {
      GOODS.forEach(g => {
        if (bp.supply[g] > 3 && bp.prices[g] < 13) {
          ports.forEach((sp, si) => {
            if (bi !== si && sp.prices[g] > bp.prices[g] + 4) {
              const profit = (sp.prices[g] - bp.prices[g]) * Math.min(bp.supply[g], cargoSpace(ship));
              const routeDist = dist(bp, ship) + dist(bp, sp);
              const eff = profit / (routeDist + 30);
              if (eff > bestEff) { bestEff = eff; bestRoute = { buyPort: bi, good: g }; }
            }
          });
        }
      });
    });

    if (bestRoute && cargoSpace(ship) > 5) {
      const bp = ports[bestRoute.buyPort];
      moveShipToward(ship, bp.x, bp.y);
      if (dist(ship, bp) < 22) { buyGood(ship, bestRoute.buyPort, bestRoute.good, cargoSpace(ship)); ship.acted = true; }
      return;
    }

    const targets = ports.filter(p => (p.owner === -1 || (p.owner !== pid && p.defense <= 2)));
    if (targets.length > 0 && ship.hp > ship.maxHp * 0.5) {
      targets.sort((a, b) => dist(a, ship) - dist(b, ship));
      const target = targets[0];
      const ti = ports.indexOf(target);
      moveShipToward(ship, target.x, target.y);
      if (dist(ship, target) < 22) capturePort(ship, ti);
      return;
    }

    const closest = ports.reduce((b, p) => dist(p, ship) < dist(b, ship) ? p : b, ports[0]);
    moveShipToward(ship, closest.x, closest.y);
  });

  const myGold = players[pid].gold;
  if (myShips.length < 4 && myGold >= SHIP_TYPES.sloop.cost) {
    const homeIdx = PORT_DEFS.findIndex(pd => pd.home === pid);
    if (homeIdx >= 0 && ports[homeIdx].owner === pid) {
      const hp = ports[homeIdx];
      const type = myGold >= SHIP_TYPES.galleon.cost && myShips.length >= 2 ? 'galleon' :
                   myGold >= SHIP_TYPES.brigantine.cost ? 'brigantine' : 'sloop';
      players[pid].gold -= SHIP_TYPES[type].cost;
      ships.push(createShip(pid, type, hp.x + 15, hp.y + 15));
    }
  }

  ships = ships.filter(s => !s.sunk);
  setTimeout(() => { updateUI(); endPlayerTurn(); }, 200);
}

function moveShipToward(ship, tx, ty) {
  const d = dist(ship, { x: tx, y: ty });
  const speed = ship.speed * 22;
  if (d <= speed) {
    ship.x = tx; ship.y = ty;
  } else {
    const ratio = speed / d;
    ship.x += (tx - ship.x) * ratio;
    ship.y += (ty - ship.y) * ratio;
  }
  ship.x = Math.max(8, Math.min(W - 8, ship.x));
  ship.y = Math.max(8, Math.min(H - 8, ship.y));
  ship.angle = Math.atan2(ty - ship.y, tx - ship.x) + Math.PI / 2;
  ship.moved = true;
}

// ===================== INPUT HANDLING =====================
function handleClick(cx, cy) {
  if (gameState === 'start') return;

  if (gameState === 'over') {
    // restart
    gameState = 'playing';
    initIslandSeeds();
    initGame();
    _gameRef.setState('playing');
    startPlayerTurn(0);
    return;
  }

  if (gameState !== 'playing' || currentPlayer !== 0) return;

  if (tradePort >= 0) { handleTradeClick(cx, cy); return; }

  // END TURN button
  if (cx > W - 100 && cy > H - 30) { endPlayerTurn(); return; }

  // Click detection
  let clickedPort = -1;
  ports.forEach((p, i) => { if (dist({ x: cx, y: cy }, p) < 20) clickedPort = i; });

  let clickedShip = null;
  ships.forEach(s => { if (!s.sunk && dist({ x: cx, y: cy }, s) < 16) clickedShip = s; });

  if (clickedShip && clickedShip.owner === 0) {
    selectedShip = clickedShip;
    tradePort = -1;
    updateUI();
    return;
  }

  if (clickedShip && clickedShip.owner !== 0 && selectedShip && !selectedShip.acted) {
    moveShipToward(selectedShip, clickedShip.x, clickedShip.y);
    if (dist(selectedShip, clickedShip) < selectedShip.range) {
      doCombat(selectedShip, clickedShip);
      ships = ships.filter(s => !s.sunk);
      if (selectedShip && selectedShip.sunk) selectedShip = null;
    }
    updateUI();
    return;
  }

  if (clickedPort >= 0 && selectedShip) {
    const port = ports[clickedPort];
    moveShipToward(selectedShip, port.x, port.y);
    if (dist(selectedShip, port) < 25) {
      if (port.owner === selectedShip.owner || port.owner === -1) {
        tradePort = clickedPort;
        buyMode = true;
      } else {
        capturePort(selectedShip, clickedPort);
        ships = ships.filter(s => !s.sunk);
        if (selectedShip && selectedShip.sunk) selectedShip = null;
      }
    }
    updateUI();
    return;
  }

  if (selectedShip && !selectedShip.moved) {
    moveShipToward(selectedShip, cx, cy);
    updateUI();
    return;
  }
}

function handleTradeClick(cx, cy) {
  if (tradePort < 0 || !selectedShip) return;
  const port = ports[tradePort];
  const px = 100, py = 80;

  // Close button
  if (cx > px + 370 && cx < px + 398 && cy > py + 5 && cy < py + 28) {
    tradePort = -1; updateUI(); return;
  }

  // Buy/Sell tabs
  if (cy > py + 32 && cy < py + 52) {
    if (cx > px + 10 && cx < px + 100) { buyMode = true; return; }
    if (cx > px + 110 && cx < px + 200) { buyMode = false; return; }
  }

  // Good rows
  GOODS.forEach((g, gi) => {
    const ry = py + 62 + gi * 42;
    if (cy < ry || cy > ry + 32) return;
    const amounts = [1, 5, 999];
    for (let bi = 0; bi < 3; bi++) {
      const bx = px + 210 + bi * 60;
      if (cx > bx && cx < bx + 52) {
        if (buyMode) buyGood(selectedShip, tradePort, g, amounts[bi]);
        else sellGood(selectedShip, tradePort, g, amounts[bi]);
        updateUI(); return;
      }
    }
  });

  // Capture button
  if (port.owner === -1 && cy > py + 235 && cy < py + 260 && cx > px + 10 && cx < px + 190) {
    capturePort(selectedShip, tradePort);
    ships = ships.filter(s => !s.sunk);
    if (selectedShip && selectedShip.sunk) selectedShip = null;
    tradePort = -1; updateUI(); return;
  }

  // Buy ship buttons
  if (port.owner === 0 && cy > py + 235 && cy < py + 260) {
    const shipOpts = [
      { type: 'sloop',      x1: px + 10,  x2: px + 110 },
      { type: 'brigantine', x1: px + 118, x2: px + 258 },
      { type: 'galleon',    x1: px + 266, x2: px + 395 },
    ];
    shipOpts.forEach(opt => {
      if (cx > opt.x1 && cx < opt.x2 && players[0].gold >= SHIP_TYPES[opt.type].cost) {
        players[0].gold -= SHIP_TYPES[opt.type].cost;
        ships.push(createShip(0, opt.type, port.x + 20, port.y + 20));
        addFloatingText(port.x, port.y - 15, `New ${SHIP_TYPES[opt.type].name}!`, '#4af');
        updateUI();
      }
    });
    return;
  }

  // Done button
  if (cy > py + 268 && cy < py + 293 && cx > px + 260 && cx < px + 398) {
    tradePort = -1; updateUI(); return;
  }
}

// ===================== DRAWING =====================
function drawOcean(renderer, text) {
  // Ocean gradient — split into bands
  const bands = 10;
  const bandH = H / bands;
  for (let i = 0; i < bands; i++) {
    const t = (i + 0.5) / bands;
    // Interpolate between #082840 and #0c3560 and back
    const t2 = Math.abs(t - 0.5) * 2; // 0 at middle, 1 at edges
    const r = Math.round(8 + t2 * (8 - 12) + (1 - t2) * (12 - 8));
    // Simpler: top-to-mid blend #082840->#0c3560, mid->bot back
    const rr = t < 0.5 ? Math.round(0x08 + (0x0c - 0x08) * (t / 0.5)) : Math.round(0x0c + (0x08 - 0x0c) * ((t - 0.5) / 0.5));
    const gg = t < 0.5 ? Math.round(0x28 + (0x35 - 0x28) * (t / 0.5)) : Math.round(0x35 + (0x28 - 0x35) * ((t - 0.5) / 0.5));
    const bb = t < 0.5 ? Math.round(0x40 + (0x60 - 0x40) * (t / 0.5)) : Math.round(0x60 + (0x40 - 0x60) * ((t - 0.5) / 0.5));
    const color = '#' + [rr, gg, bb].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
    renderer.fillRect(0, i * bandH, W, bandH + 1, color);
  }

  // Animated wave lines using strokePoly
  const t = frameCount * (0.0008 * 1000 / 60); // approx time
  for (let wy = 15; wy < H; wy += 25) {
    const pts = [];
    for (let x = 0; x <= W; x += 8) {
      const y = wy + Math.sin((x * 0.02) + t + wy * 0.01) * 3;
      pts.push({ x, y });
    }
    renderer.strokePoly(pts, OCEAN_WAVE, 1, false);
  }
}

function drawIslands(renderer) {
  ISLANDS.forEach((isl, idx) => {
    const seeds = islandSeeds[idx];

    // Shadow
    const shadowPts = seeds.map(pt => ({
      x: isl.x + Math.cos(pt.a) * isl.r * pt.r + 3,
      y: isl.y + Math.sin(pt.a) * isl.r * pt.r + 3,
    }));
    renderer.fillPoly(shadowPts, hexAlpha('#000000', 0.2));

    // Island body
    const islandPts = seeds.map(pt => ({
      x: isl.x + Math.cos(pt.a) * isl.r * pt.r,
      y: isl.y + Math.sin(pt.a) * isl.r * pt.r,
    }));
    renderer.fillPoly(islandPts, isl.color);

    // Beach outline
    renderer.strokePoly(islandPts, '#b8a060', 1.5, true);
  });
}

function drawPorts(renderer, text) {
  ports.forEach((port, i) => {
    const isHovered = hoverPort === i;
    const sz = isHovered ? 13 : 10;

    // Owner ring
    const ringColor = port.owner === -1
      ? hexAlpha('#646464', 0.6)
      : hexAlpha(PLAYER_COLORS[port.owner], 0.6);
    renderer.fillCircle(port.x, port.y, sz + 3, ringColor);

    // Port circle
    renderer.fillCircle(port.x, port.y, sz, '#1a1a30');
    const strokeColor = isHovered ? '#ffffff' : '#ec4';
    const strokeW = isHovered ? 2 : 1.5;
    // Draw circle outline as a ring of drawLine calls
    const segs = 16;
    for (let s = 0; s < segs; s++) {
      const a1 = (s / segs) * Math.PI * 2;
      const a2 = ((s + 1) / segs) * Math.PI * 2;
      renderer.drawLine(
        port.x + Math.cos(a1) * sz, port.y + Math.sin(a1) * sz,
        port.x + Math.cos(a2) * sz, port.y + Math.sin(a2) * sz,
        strokeColor, strokeW
      );
    }

    // Anchor icon (draw as simple cross + arc approximation)
    // Ring at top
    renderer.fillCircle(port.x, port.y - (sz * 0.35), sz * 0.18, '#ec4');
    // Vertical bar
    renderer.drawLine(port.x, port.y - sz * 0.6, port.x, port.y + sz * 0.5, '#ec4', 1.5);
    // Horizontal crossbar
    renderer.drawLine(port.x - sz * 0.4, port.y - sz * 0.1, port.x + sz * 0.4, port.y - sz * 0.1, '#ec4', 1.5);
    // Left arm curve (line)
    renderer.drawLine(port.x - sz * 0.4, port.y + sz * 0.35, port.x, port.y + sz * 0.5, '#ec4', 1.5);
    // Right arm curve (line)
    renderer.drawLine(port.x, port.y + sz * 0.5, port.x + sz * 0.4, port.y + sz * 0.35, '#ec4', 1.5);

    // Port name on hover
    if (isHovered) {
      text.drawText(port.name, port.x, port.y - sz - 14, 10, '#fff', 'center');
    }

    // Good indicator
    text.drawText(GOOD_EMOJI[port.produces], port.x + sz + 5, port.y - 4, 8, GOOD_COLORS[port.produces], 'left');
  });
}

function drawShips(renderer, text) {
  ships.forEach(ship => {
    if (ship.sunk) return;
    const isSelected = ship === selectedShip;
    const sz = ship.type === 'galleon' ? 11 : (ship.type === 'brigantine' ? 9 : 7);

    if (isSelected) {
      // Selection glow circle
      renderer.fillCircle(ship.x, ship.y, sz + 10, hexAlpha('#eecc44', 0.12));
      // Dashed selection ring (approximate with strokePoly segments)
      const segs = 24;
      for (let s = 0; s < segs; s += 2) {
        const a1 = (s / segs) * Math.PI * 2;
        const a2 = ((s + 1) / segs) * Math.PI * 2;
        renderer.drawLine(
          ship.x + Math.cos(a1) * (sz + 10), ship.y + Math.sin(a1) * (sz + 10),
          ship.x + Math.cos(a2) * (sz + 10), ship.y + Math.sin(a2) * (sz + 10),
          hexAlpha('#eecc44', 0.5), 1
        );
      }

      // Movement range circle (dashed)
      if (!ship.moved) {
        const mr = ship.speed * 22;
        for (let s = 0; s < segs; s += 2) {
          const a1 = (s / segs) * Math.PI * 2;
          const a2 = ((s + 1) / segs) * Math.PI * 2;
          renderer.drawLine(
            ship.x + Math.cos(a1) * mr, ship.y + Math.sin(a1) * mr,
            ship.x + Math.cos(a2) * mr, ship.y + Math.sin(a2) * mr,
            hexAlpha('#44aaff', 0.2), 1
          );
        }
      }

      // Attack range circle (dashed)
      for (let s = 0; s < segs; s += 3) {
        const a1 = (s / segs) * Math.PI * 2;
        const a2 = ((s + 1) / segs) * Math.PI * 2;
        renderer.drawLine(
          ship.x + Math.cos(a1) * ship.range, ship.y + Math.sin(a1) * ship.range,
          ship.x + Math.cos(a2) * ship.range, ship.y + Math.sin(a2) * ship.range,
          hexAlpha('#ff5050', 0.12), 1
        );
      }
    }

    // Ship body — rotated hull polygon
    const angle = ship.angle || 0;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    function rotPt(lx, ly) {
      return { x: ship.x + lx * cosA - ly * sinA, y: ship.y + lx * sinA + ly * cosA };
    }

    // Hull: triangle-ish shape
    const hullPts = [
      rotPt(0, -sz),
      rotPt(-sz * 0.65, sz * 0.5),
      rotPt(0, sz * 0.7),
      rotPt(sz * 0.65, sz * 0.5),
    ];
    renderer.fillPoly(hullPts, PLAYER_COLORS[ship.owner]);
    renderer.strokePoly(hullPts, hexAlpha('#000000', 0.4), 1);

    // Mast
    const mastTop = rotPt(0, -sz + 2);
    const mastBot = rotPt(0, sz * 0.2);
    renderer.drawLine(mastTop.x, mastTop.y, mastBot.x, mastBot.y, '#cccccc', 1.5);

    // Sail
    const sailTip  = rotPt(0, -sz + 3);
    const sailMid  = rotPt(sz * 0.6, -sz * 0.2);
    const sailBase = rotPt(0, sz * 0.1);
    renderer.fillPoly([sailTip, sailMid, sailBase], hexAlpha('#ffffff', 0.75));

    // Ship type letter
    text.drawText(SHIP_TYPES[ship.type].icon, ship.x, ship.y + sz + 4, 8, PLAYER_COLORS[ship.owner], 'center');

    // HP bar
    const hpW = sz * 2.2;
    const hpH = 3;
    const hpX = ship.x - hpW / 2;
    const hpY = ship.y + sz + 13;
    renderer.fillRect(hpX, hpY, hpW, hpH, '#222222');
    const hpRatio = ship.hp / ship.maxHp;
    const hpColor = hpRatio > 0.5 ? '#55dd55' : (hpRatio > 0.25 ? '#ec4' : '#f44');
    renderer.fillRect(hpX, hpY, hpW * hpRatio, hpH, hpColor);
  });
}

function drawEffects(renderer, text) {
  cannonEffects = cannonEffects.filter(e => {
    e.life--;
    const progress = 1 - (e.life / 15);
    const alpha = 1 - progress;
    const g = Math.round((200 - progress * 200));
    const lineColor = hexAlpha(`#ff${g.toString(16).padStart(2,'0')}32`, alpha);
    const lw = Math.max(0.5, 3 - progress * 2);
    const mx = e.x1 + (e.x2 - e.x1) * progress;
    const my = e.y1 + (e.y2 - e.y1) * progress;
    renderer.drawLine(e.x1, e.y1, mx, my, lineColor, lw);

    // Smoke puff at impact
    if (e.life < 5) {
      renderer.fillCircle(e.x2, e.y2, (15 - e.life) * 1.5, hexAlpha('#c8c8c8', e.life / 15));
    }
    return e.life > 0;
  });

  floatingTexts = floatingTexts.filter(ft => {
    ft.life--;
    ft.y = ft.startY - (60 - ft.life) * 0.5;
    const alpha = ft.life / 60;
    const c = ft.color.replace('#', '');
    let r, g, b;
    if (c.length === 3) { r = parseInt(c[0]+c[0],16); g = parseInt(c[1]+c[1],16); b = parseInt(c[2]+c[2],16); }
    else { r = parseInt(c.slice(0,2),16); g = parseInt(c.slice(2,4),16); b = parseInt(c.slice(4,6),16); }
    const a = Math.round(alpha * 255).toString(16).padStart(2,'0');
    const tc = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}${a}`;
    text.drawText(ft.text, ft.x, ft.y, 11, tc, 'center');
    return ft.life > 0;
  });
}

function drawCompass(renderer, text) {
  const cx = W - 30, cy = 30, r = 18;
  // Circle outline
  const segs = 24;
  for (let s = 0; s < segs; s++) {
    const a1 = (s / segs) * Math.PI * 2;
    const a2 = ((s + 1) / segs) * Math.PI * 2;
    renderer.drawLine(
      cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
      cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
      hexAlpha('#eecc44', 0.25), 1
    );
  }
  text.drawText('N', cx, cy - r + 1, 8, hexAlpha('#eecc44', 0.4), 'center');
  text.drawText('S', cx, cy + r - 9, 8, hexAlpha('#eecc44', 0.4), 'center');
  text.drawText('E', cx + r - 5, cy - 4, 8, hexAlpha('#eecc44', 0.4), 'center');
  text.drawText('W', cx - r + 1, cy - 4, 8, hexAlpha('#eecc44', 0.4), 'center');
}

function drawScoreboard(renderer, text) {
  if (!players) return;
  const bx = 8, by = H - 75, bw = 145, bh = 68;
  renderer.fillRect(bx, by, bw, bh, SCOREBOARD_BG);
  renderer.strokePoly([
    { x: bx, y: by }, { x: bx + bw, y: by },
    { x: bx + bw, y: by + bh }, { x: bx, y: by + bh },
  ], hexAlpha('#eecc44', 0.2), 1);

  for (let i = 0; i < 4; i++) {
    const py = by + 10 + i * 14;
    renderer.fillCircle(bx + 9, py + 1, 3, PLAYER_COLORS[i]);
    const nameColor = i === currentPlayer ? '#ffffff' : '#777777';
    const name = PLAYER_NAMES[i].substring(0, 11);
    text.drawText(name, bx + 17, py - 4, 9, nameColor, 'left');
    text.drawText(`${playerScore(i)}`, bx + bw - 4, py - 4, 9, nameColor, 'right');
  }
}

function drawCombatLog(renderer, text) {
  if (!combatLog || combatLog.length === 0) return;
  const lx = W - 260, ly = H - 55, lw = 252, lh = 48;
  renderer.fillRect(lx, ly, lw, lh, COMBATLOG_BG);
  renderer.strokePoly([
    { x: lx, y: ly }, { x: lx + lw, y: ly },
    { x: lx + lw, y: ly + lh }, { x: lx, y: ly + lh },
  ], hexAlpha('#eecc44', 0.15), 1);

  combatLog.slice(0, 3).forEach((log, i) => {
    const color = i === 0 ? '#ec4' : '#666666';
    const t = log.length > 40 ? log.substring(0, 40) + '..' : log;
    text.drawText(t, lx + 4, ly + 5 + i * 13, 8, color, 'left');
  });
}

function drawTradeRouteHint(renderer, text) {
  if (!selectedShip || hoverPort === null || tradePort >= 0) return;
  const port = ports[hoverPort];
  renderer.dashedLine(selectedShip.x, selectedShip.y, port.x, port.y, hexAlpha('#eecc44', 0.25), 1, 6, 4);

  const d = Math.round(dist(selectedShip, port));
  const mx = (selectedShip.x + port.x) / 2;
  const my = (selectedShip.y + port.y) / 2;
  text.drawText(`${d}px`, mx, my - 10, 9, hexAlpha('#eecc44', 0.5), 'center');
}

function drawHUD(renderer, text) {
  if (!players) return;
  text.drawText(`Turn ${turn}/${MAX_TURNS}`, 10, 4, 9, HUD_TXT, 'left');

  if (currentPlayer === 0) {
    text.drawText('Your turn', 10, 16, 9, '#44aaff', 'left');
  } else {
    text.drawText(`${PLAYER_NAMES[currentPlayer]} acting...`, 10, 16, 9, PLAYER_COLORS[currentPlayer], 'left');
  }

  // End Turn button
  if (currentPlayer === 0 && gameState === 'playing' && tradePort < 0) {
    renderer.fillRect(W - 100, H - 28, 95, 24, hexAlpha('#3c280a', 0.85));
    renderer.strokePoly([
      { x: W - 100, y: H - 28 }, { x: W - 5, y: H - 28 },
      { x: W - 5, y: H - 4 }, { x: W - 100, y: H - 4 },
    ], '#ec4', 1.5);
    text.drawText('END TURN', W - 52, H - 24, 11, '#ec4', 'center');
  }
}

function drawTradePanel(renderer, text) {
  if (tradePort < 0 || !selectedShip) return;
  const port = ports[tradePort];
  const px = 100, py = 80, pw = 400, ph = 300;

  renderer.fillRect(px, py, pw, ph, PANEL_BG);
  renderer.strokePoly([
    { x: px, y: py }, { x: px + pw, y: py },
    { x: px + pw, y: py + ph }, { x: px, y: py + ph },
  ], '#ec4', 2);

  // Title
  text.drawText(port.name, px + 10, py + 6, 14, '#ec4', 'left');
  const ownerLabel = port.owner === -1 ? 'Neutral Port' : `${PLAYER_NAMES[port.owner]}'s Port`;
  text.drawText(ownerLabel, px + 10 + port.name.length * 9 + 20, py + 6, 10, '#888888', 'left');

  // Close X
  renderer.fillRect(px + 370, py + 5, 28, 22, '#aa3333');
  text.drawText('X', px + 384, py + 8, 12, '#ffffff', 'center');

  // BUY / SELL tabs
  renderer.fillRect(px + 10, py + 32, 90, 20, buyMode ? '#ec4' : '#333333');
  text.drawText('BUY', px + 55, py + 36, 11, buyMode ? '#1a1a2e' : '#aaaaaa', 'center');

  renderer.fillRect(px + 110, py + 32, 90, 20, !buyMode ? '#ec4' : '#333333');
  text.drawText('SELL', px + 155, py + 36, 11, !buyMode ? '#1a1a2e' : '#aaaaaa', 'center');

  // Stats line
  text.drawText(
    `Cargo: ${totalCargo(selectedShip)}/${selectedShip.maxCargo}   Gold: ${players[0].gold}`,
    px + pw - 10, py + 36, 10, '#777777', 'right'
  );

  // Good rows
  GOODS.forEach((g, gi) => {
    const ry = py + 62 + gi * 42;

    text.drawText(g.toUpperCase(), px + 10, ry + 8, 12, GOOD_COLORS[g], 'left');
    text.drawText(`Price: ${port.prices[g]}g`, px + 10, ry + 21, 10, '#999999', 'left');
    text.drawText(`Stock: ${port.supply[g]}`, px + 100, ry + 21, 10, '#999999', 'left');
    text.drawText(`Own: ${selectedShip.cargo[g]}`, px + 100, ry + 8, 10, '#66aaff', 'left');

    const labels = buyMode ? ['+1', '+5', 'All'] : ['-1', '-5', 'All'];
    for (let bi = 0; bi < 3; bi++) {
      const bx = px + 210 + bi * 60;
      renderer.fillRect(bx, ry, 52, 32, '#222233');
      renderer.strokePoly([
        { x: bx, y: ry }, { x: bx + 52, y: ry },
        { x: bx + 52, y: ry + 32 }, { x: bx, y: ry + 32 },
      ], '#555555', 1);
      text.drawText(labels[bi], bx + 26, ry + 12, 10, '#ec4', 'center');
    }
  });

  // Bottom buttons
  const btnY = py + 237;
  if (port.owner === -1) {
    renderer.fillRect(px + 10, btnY, 180, 24, '#662222');
    renderer.strokePoly([
      { x: px + 10, y: btnY }, { x: px + 190, y: btnY },
      { x: px + 190, y: btnY + 24 }, { x: px + 10, y: btnY + 24 },
    ], '#f55', 1);
    text.drawText('CAPTURE PORT', px + 100, btnY + 8, 10, '#ff8888', 'center');
  } else if (port.owner === 0) {
    const shipBtns = [
      { type: 'sloop',      x: px + 10,  w: 100 },
      { type: 'brigantine', x: px + 118, w: 140 },
      { type: 'galleon',    x: px + 266, w: 129 },
    ];
    shipBtns.forEach(sb => {
      const st = SHIP_TYPES[sb.type];
      const afford = players[0].gold >= st.cost;
      renderer.fillRect(sb.x, btnY, sb.w, 24, afford ? '#1a3a1a' : '#222222');
      renderer.strokePoly([
        { x: sb.x, y: btnY }, { x: sb.x + sb.w, y: btnY },
        { x: sb.x + sb.w, y: btnY + 24 }, { x: sb.x, y: btnY + 24 },
      ], afford ? '#55aa55' : '#444444', 1);
      text.drawText(
        `${st.icon} ${st.name} ${st.cost}g`,
        sb.x + sb.w / 2, btnY + 8, 9, afford ? '#55dd55' : '#555555', 'center'
      );
    });
  }

  // Done button
  renderer.fillRect(px + 260, py + 270, 138, 24, '#333322');
  renderer.strokePoly([
    { x: px + 260, y: py + 270 }, { x: px + 398, y: py + 270 },
    { x: px + 398, y: py + 294 }, { x: px + 260, y: py + 294 },
  ], '#ec4', 1);
  text.drawText('DONE', px + 329, py + 278, 11, '#ec4', 'center');
}

// ===================== UI UPDATES =====================
function updateUI() {
  if (!players || !players[0]) return;
  score = playerScore(0);

  const scoreEl = document.getElementById('score');
  const turnEl = document.getElementById('turnIndicator');
  const fleetEl = document.getElementById('fleetInfo');
  const fleetDetails = document.getElementById('fleetDetails');
  const cargoDetails = document.getElementById('cargoDetails');
  const actionDetails = document.getElementById('actionDetails');

  if (scoreEl) scoreEl.textContent = players[0].gold;
  if (turnEl) turnEl.textContent = `Turn ${turn}/${MAX_TURNS}`;
  const myShips = playerShips(0);
  if (fleetEl) fleetEl.textContent = `${myShips.length} ship${myShips.length !== 1 ? 's' : ''} | Score: ${score}`;

  if (fleetDetails) {
    let fh = '';
    myShips.forEach(s => {
      const t = SHIP_TYPES[s.type];
      fh += `<div class="row"><span>${t.name}${s.moved ? ' [moved]' : ''}</span><span>HP ${s.hp}/${s.maxHp} | ${t.cannons} guns</span></div>`;
    });
    fleetDetails.innerHTML = fh || '<div class="row">No ships!</div>';
  }

  if (cargoDetails) {
    if (selectedShip && selectedShip.owner === 0) {
      let ch = '';
      GOODS.forEach(g => {
        if (selectedShip.cargo[g] > 0) {
          ch += `<div class="row"><span style="color:${GOOD_COLORS[g]}">${g}</span><span>${selectedShip.cargo[g]}</span></div>`;
        }
      });
      ch += `<div class="row"><span>Space</span><span>${cargoSpace(selectedShip)}/${selectedShip.maxCargo}</span></div>`;
      cargoDetails.innerHTML = ch;
    } else {
      cargoDetails.innerHTML = '<div class="row">Select a ship</div>';
    }
  }

  if (actionDetails) {
    let ah = '';
    if (currentPlayer !== 0) {
      ah = '<div class="row">Waiting for AI...</div>';
    } else if (selectedShip) {
      if (!selectedShip.moved) ah += '<div class="row">Click water/port to move</div>';
      if (!selectedShip.acted) ah += '<div class="row">Click enemy to attack</div>';
      const nearPort = ports.findIndex(p => dist(p, selectedShip) < 25);
      if (nearPort >= 0) ah += `<div class="row">Click ${ports[nearPort].name} to trade</div>`;
      ah += '<div class="row" style="color:#ec4">END TURN button bottom-right</div>';
    } else {
      ah = '<div class="row">Click your ship (blue) to select</div>';
      ah += '<div class="row" style="color:#ec4">END TURN button bottom-right</div>';
    }
    actionDetails.innerHTML = ah;
  }
}

// ===================== TOOLTIP =====================
function updateTooltip(e, cx, cy) {
  if (!ports) return;
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  let found = false;
  ports.forEach((p) => {
    if (dist({ x: cx, y: cy }, p) < 20) {
      found = true;
      let html = `<h4>${p.name}</h4>`;
      html += `Owner: ${p.owner === -1 ? 'Neutral' : PLAYER_NAMES[p.owner]}<br>`;
      html += `Produces: <span style="color:${GOOD_COLORS[p.produces]}">${p.produces}</span><br>`;
      html += `Defense: ${'*'.repeat(p.defense)}<br><br>`;
      html += `<b>Market Prices:</b><br>`;
      GOODS.forEach(g => {
        const price = p.prices[g];
        const cls = price < 10 ? 'good' : (price > 20 ? 'bad' : '');
        html += `<span class="${cls}">${g}: ${price}g (stock: ${p.supply[g]})</span><br>`;
      });
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    }
  });
  if (!found) tooltip.style.display = 'none';
}

// ===================== MAIN ENTRY =====================
let _gameRef = null;

export function createGame() {
  const game = new Game('game');
  _gameRef = game;

  game.onInit = () => {
    initIslandSeeds();
    initGame();
    // Draw initial background, then show overlay
    game.showOverlay('PIRATE CONQUEST', 'Click SET SAIL to begin');
    game.setState('waiting');
    // Immediately start game loop showing the map behind the overlay
    gameState = 'start';
  };

  game.setScoreFn(() => score);

  // Wire up mouse events directly on canvas
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);

    if (ports) {
      let found = false;
      ports.forEach((p, i) => {
        if (dist({ x: mouseX, y: mouseY }, p) < 20) { hoverPort = i; found = true; }
      });
      if (!found) hoverPort = null;
    }
    updateTooltip(e, mouseX, mouseY);
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    handleClick(cx, cy);
  });

  // Start button in overlay
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      game.setState('playing');
      gameState = 'playing';
      initIslandSeeds();
      initGame();
      startPlayerTurn(0);
    });
  }

  game.onUpdate = (dt) => {
    frameCount++;

    // Handle game-over restart via space
    if (game.state === 'over') {
      if (game.input.wasPressed(' ') || game.input.wasPressed('Enter')) {
        gameState = 'playing';
        game.setState('playing');
        initIslandSeeds();
        initGame();
        startPlayerTurn(0);
      }
    }
  };

  game.onDraw = (renderer, text) => {
    // Background is the ocean

    drawOcean(renderer, text);

    if (islandSeeds) {
      drawIslands(renderer);
      drawTradeRouteHint(renderer, text);
      if (ports) drawPorts(renderer, text);
      if (ships) drawShips(renderer, text);
      if (cannonEffects && floatingTexts) drawEffects(renderer, text);
      drawCompass(renderer, text);
      if (players) {
        drawScoreboard(renderer, text);
        drawCombatLog(renderer, text);
        drawHUD(renderer, text);
      }
      if (tradePort >= 0) drawTradePanel(renderer, text);
    }
  };

  game.start();
  return game;
}
