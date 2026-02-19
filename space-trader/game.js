// space-trader/game.js — WebGL 2 port of Space Trader

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ---- CONSTANTS ----
const GOODS = ['Food', 'Tech', 'Minerals', 'Luxuries', 'Weapons'];
const GOOD_COLORS = { Food: '#88ff88', Tech: '#88ccff', Minerals: '#ffaa88', Luxuries: '#ff88ff', Weapons: '#ff8888' };
const GOOD_BASE = { Food: 20, Tech: 80, Minerals: 40, Luxuries: 120, Weapons: 100 };
const MAX_TURNS = 30;
const FACTIONS = ['Federation', 'Syndicate', 'Frontier'];
const FACTION_COLORS = ['#4488ff', '#ff8844', '#88ff44'];

const SYSTEM_DEFS = [
  { name: 'Sol',        x: 300, y: 250, faction: 0, produces: 'Tech',     consumes: 'Food' },
  { name: 'Alpha Cen',  x: 180, y: 180, faction: 0, produces: 'Food',     consumes: 'Luxuries' },
  { name: 'Sirius',     x: 420, y: 170, faction: 0, produces: 'Minerals', consumes: 'Tech' },
  { name: 'Vega',       x: 100, y: 100, faction: 1, produces: 'Weapons',  consumes: 'Minerals' },
  { name: 'Rigel',      x: 500, y: 100, faction: 1, produces: 'Luxuries', consumes: 'Weapons' },
  { name: 'Betelgeuse', x: 500, y: 280, faction: 1, produces: 'Tech',     consumes: 'Food' },
  { name: 'Polaris',    x: 300, y:  80, faction: 2, produces: 'Minerals', consumes: 'Luxuries' },
  { name: 'Arcturus',   x: 100, y: 300, faction: 2, produces: 'Food',     consumes: 'Weapons' },
  { name: 'Capella',    x: 200, y: 400, faction: 2, produces: 'Luxuries', consumes: 'Tech' },
  { name: 'Deneb',      x: 400, y: 400, faction: 0, produces: 'Weapons',  consumes: 'Minerals' },
  { name: 'Altair',     x: 500, y: 420, faction: 1, produces: 'Food',     consumes: 'Tech' },
  { name: 'Procyon',    x:  80, y: 440, faction: 2, produces: 'Minerals', consumes: 'Food' },
];

const LANES = [
  [0,1],[0,2],[0,6],[1,3],[1,7],[2,4],[2,5],[3,6],[4,5],[4,6],
  [5,10],[7,8],[7,11],[8,9],[8,0],[9,10],[9,0],[10,5],[11,8]
];

// ---- GAME STATE ----
let score = 0;
let turn = 1;
let view = 'map';
let systems = [];
let players = [];
let combatState = null;
let hoverSystem = -1;
let tradeButtons = [];
let shipButtons = [];
let combatButtons = [];
let messages = [];
let animFrame = 0;
let starField = [];
let playerMoved = false;
let playerTraded = false;

// ---- HELPERS ----
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rnd(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function rndF(lo, hi) { return Math.random() * (hi - lo) + lo; }

function withAlpha(hex6, alpha) {
  const a = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
  return hex6 + a;
}

function neighbors(sysIdx) {
  const nb = [];
  for (const [a, b] of LANES) {
    if (a === sysIdx) nb.push(b);
    if (b === sysIdx) nb.push(a);
  }
  return [...new Set(nb)];
}

function cargoCount(p) {
  return GOODS.reduce((s, g) => s + (p.cargo[g] || 0), 0);
}

function totalWealth(p) {
  return p.credits + GOODS.reduce((s, g) => s + (p.cargo[g] || 0) * GOOD_BASE[g], 0);
}

function getRepLevel(p) {
  const r = p.rep[systems[p.system].faction];
  if (r >= 3) return 'Allied';
  if (r >= 1) return 'Friendly';
  if (r >= -1) return 'Neutral';
  if (r >= -3) return 'Hostile';
  return 'Enemy';
}

function priceMod(p, sys) {
  return 1 - p.rep[sys.faction] * 0.03;
}

function getReachable(p) {
  const nbs = neighbors(p.system);
  const reachable = nbs.slice();
  if (p.engine >= 2) {
    for (const nb of nbs) {
      for (const n2 of neighbors(nb)) {
        if (n2 !== p.system && !reachable.includes(n2)) reachable.push(n2);
      }
    }
  }
  if (p.engine >= 3) {
    const extended = reachable.slice();
    for (const nb of extended) {
      for (const n3 of neighbors(nb)) {
        if (n3 !== p.system && !reachable.includes(n3)) reachable.push(n3);
      }
    }
  }
  return reachable;
}

function findPath(from, to) {
  const visited = { [from]: true };
  const queue = [[from]];
  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === to) return path;
    for (const nb of neighbors(node)) {
      if (!visited[nb]) { visited[nb] = true; queue.push([...path, nb]); }
    }
  }
  return [from];
}

// ---- LOG ----
let logEl;
function addLog(msg, cls = 'event-system') {
  messages.unshift({ msg, cls });
  if (messages.length > 50) messages.pop();
  if (logEl) {
    logEl.innerHTML = messages.map(m => `<div class="${m.cls}">${m.msg}</div>`).join('');
  }
}

// ---- DOM refs ----
let scoreEl, shipInfoEl, turnInfoEl, locationInfoEl, cargoInfoEl, repInfoEl;
let btnMap, btnTrade, btnShip, btnEnd;

// ---- INITIALIZATION ----
function initGame() {
  systems = [];
  for (const s of SYSTEM_DEFS) {
    const prices = {}, stock = {};
    for (const g of GOODS) {
      const base = GOOD_BASE[g];
      if (g === s.produces)      { prices[g] = Math.round(base * rndF(0.4, 0.7)); stock[g] = rnd(15, 30); }
      else if (g === s.consumes) { prices[g] = Math.round(base * rndF(1.4, 1.8)); stock[g] = rnd(2, 8); }
      else                       { prices[g] = Math.round(base * rndF(0.8, 1.2)); stock[g] = rnd(5, 15); }
    }
    systems.push({ ...s, idx: systems.length, prices, stock });
  }

  players = [
    { name: 'You',           color: '#aa88ff', ai: false, system: 0, credits: 500, cargo: {}, cargoMax: 10, engine: 1, weapons: 1, shields: 1, rep: [0,0,0], alive: true, type: 'trader' },
    { name: 'Merchant Zara', color: '#ff8844', ai: true,  system: 4, credits: 500, cargo: {}, cargoMax: 12, engine: 1, weapons: 0, shields: 1, rep: [1,1,1], alive: true, type: 'merchant' },
    { name: 'Pirate Kael',   color: '#ff4444', ai: true,  system: 7, credits: 300, cargo: {}, cargoMax: 8,  engine: 2, weapons: 3, shields: 2, rep: [-2,-1,-2], alive: true, type: 'pirate' },
    { name: 'Trader Mira',   color: '#44ccff', ai: true,  system:10, credits: 500, cargo: {}, cargoMax: 10, engine: 1, weapons: 1, shields: 1, rep: [0,1,0], alive: true, type: 'trader' },
  ];

  turn = 1; score = 0; view = 'map'; combatState = null;
  playerMoved = false; playerTraded = false; messages = [];
  if (logEl) logEl.innerHTML = '';
  addLog('Welcome to the galaxy, trader. 30 turns to amass wealth.', 'event-system');
  addLog('Buy low at production worlds, sell high at consumer worlds.', 'event-system');
  updateUI();
}

function updateUI() {
  const p = players[0];
  score = totalWealth(p);
  if (scoreEl) scoreEl.textContent = score;
  if (turnInfoEl) turnInfoEl.textContent = `Turn ${turn}/${MAX_TURNS}`;
  if (locationInfoEl) locationInfoEl.textContent = `Location: ${systems[p.system].name}`;
  if (cargoInfoEl) cargoInfoEl.textContent = `Cargo: ${cargoCount(p)}/${p.cargoMax}`;
  if (repInfoEl) repInfoEl.textContent = `Rep: ${getRepLevel(p)}`;
  if (shipInfoEl) shipInfoEl.textContent = `E${p.engine} W${p.weapons} S${p.shields}`;
  if (btnMap)   btnMap.className   = view === 'map'   ? 'active' : '';
  if (btnTrade) btnTrade.className = view === 'trade' ? 'active' : '';
  if (btnShip)  btnShip.className  = view === 'ship'  ? 'active' : '';
}

// ---- MARKET FLUCTUATION ----
function fluctuateMarkets() {
  for (const sys of systems) {
    for (const g of GOODS) {
      const base = GOOD_BASE[g];
      const drift = rndF(-0.05, 0.05);
      if (g === sys.produces) {
        sys.prices[g] = clamp(Math.round(sys.prices[g] * (1 + drift)), Math.round(base * 0.3), Math.round(base * 0.8));
        sys.stock[g]  = clamp(sys.stock[g] + rnd(1, 4), 0, 40);
      } else if (g === sys.consumes) {
        sys.prices[g] = clamp(Math.round(sys.prices[g] * (1 + drift)), Math.round(base * 1.2), Math.round(base * 2.2));
        sys.stock[g]  = clamp(sys.stock[g] + rnd(-2, 1), 0, 20);
      } else {
        sys.prices[g] = clamp(Math.round(sys.prices[g] * (1 + drift)), Math.round(base * 0.6), Math.round(base * 1.5));
        sys.stock[g]  = clamp(sys.stock[g] + rnd(-1, 2), 0, 25);
      }
    }
  }
}

// ---- AI LOGIC ----
function aiBestTradeRoute(p) {
  const curSys = systems[p.system];
  const nbs = getReachable(p);
  let bestProfit = -Infinity, bestGood = null, bestDest = null;
  for (const g of GOODS) {
    const buyPrice = Math.round(curSys.prices[g] * priceMod(p, curSys));
    if (curSys.stock[g] < 1) continue;
    const canBuy = Math.min(curSys.stock[g], p.cargoMax - cargoCount(p), Math.floor(p.credits / buyPrice));
    if (canBuy < 1) continue;
    for (const ni of nbs) {
      const destSys = systems[ni];
      const sellPrice = Math.round(destSys.prices[g] / priceMod(p, destSys));
      const profit = (sellPrice - buyPrice) * canBuy;
      if (profit > bestProfit) { bestProfit = profit; bestGood = g; bestDest = ni; }
    }
  }
  return { good: bestGood, dest: bestDest, profit: bestProfit };
}

function aiTurn(p) {
  if (!p.alive) return;
  const curSys = systems[p.system];

  for (const g of GOODS) {
    const qty = p.cargo[g] || 0;
    if (qty > 0) {
      const sellPrice = Math.round(curSys.prices[g] / priceMod(p, curSys));
      p.credits += sellPrice * qty;
      curSys.stock[g] = (curSys.stock[g] || 0) + qty;
      p.cargo[g] = 0;
      addLog(`${p.name} sold ${qty} ${g} at ${curSys.name}`, 'event-trade');
    }
  }

  if (p.type === 'pirate') {
    const nbs = neighbors(p.system);
    const targets = players.filter(t => t !== p && t.alive && nbs.includes(t.system));
    if (targets.length > 0 && Math.random() < 0.5) {
      const target = targets[rnd(0, targets.length - 1)];
      p.system = target.system;
      addLog(`${p.name} jumps to ${systems[p.system].name} hunting prey!`, 'event-combat');
      const atkPow = p.weapons + rnd(1, 3);
      const defPow = target.shields + rnd(1, 3);
      if (atkPow > defPow && target.ai) {
        const stolen = Math.min(target.credits, rnd(30, 100));
        target.credits -= stolen; p.credits += stolen;
        p.rep[systems[p.system].faction] -= 1;
        addLog(`${p.name} raids ${target.name} for ${stolen} credits!`, 'event-combat');
      } else if (atkPow > defPow && !target.ai) {
        combatState = { attacker: p, defender: target, phase: 'ambush' };
        view = 'combat';
        addLog(`${p.name} ambushes you at ${systems[p.system].name}!`, 'event-combat');
        return;
      } else {
        addLog(`${p.name} tried to raid ${target.name} but was repelled.`, 'event-combat');
      }
    } else {
      const nbs2 = neighbors(p.system);
      p.system = nbs2[rnd(0, nbs2.length - 1)];
    }
    const route = aiBestTradeRoute(p);
    if (route.good && route.profit > 20) {
      const buyP = Math.round(systems[p.system].prices[route.good] * priceMod(p, systems[p.system]));
      const canBuy = Math.min(systems[p.system].stock[route.good], p.cargoMax, Math.floor(p.credits / buyP));
      if (canBuy > 0) {
        p.cargo[route.good] = (p.cargo[route.good] || 0) + canBuy;
        p.credits -= buyP * canBuy;
        systems[p.system].stock[route.good] -= canBuy;
      }
    }
  } else {
    const route = aiBestTradeRoute(p);
    if (route.good && route.profit > 0) {
      const buyP = Math.round(curSys.prices[route.good] * priceMod(p, curSys));
      const canBuy = Math.min(curSys.stock[route.good], p.cargoMax - cargoCount(p), Math.floor(p.credits / buyP));
      if (canBuy > 0) {
        p.cargo[route.good] = (p.cargo[route.good] || 0) + canBuy;
        p.credits -= buyP * canBuy;
        curSys.stock[route.good] -= canBuy;
        addLog(`${p.name} buys ${canBuy} ${route.good} at ${curSys.name}`, 'event-trade');
      }
      const path = findPath(p.system, route.dest);
      if (path.length > 1) {
        const steps = Math.min(p.engine, path.length - 1);
        p.system = path[steps];
        addLog(`${p.name} travels to ${systems[p.system].name}`, 'event-system');
      }
    } else {
      const nbs = neighbors(p.system);
      p.system = nbs[rnd(0, nbs.length - 1)];
    }
    if (p.type === 'merchant' && Math.random() < 0.3) {
      const fac = systems[p.system].faction;
      p.rep[fac] = clamp(p.rep[fac] + 1, -5, 5);
    }
    if (p.credits > 400 && p.engine < 3 && Math.random() < 0.2) {
      p.credits -= 200; p.engine++;
      addLog(`${p.name} upgrades engine to level ${p.engine}`, 'event-system');
    }
    if (p.credits > 400 && p.cargoMax < 16 && Math.random() < 0.2) {
      p.credits -= 150; p.cargoMax += 2;
      addLog(`${p.name} expands cargo to ${p.cargoMax}`, 'event-system');
    }
    if (p.type === 'trader' && p.credits > 300 && p.weapons < 2 && Math.random() < 0.15) {
      p.credits -= 200; p.weapons++;
    }
  }
}

// ---- PLAYER ACTIONS ----
function playerTravel(destIdx) {
  if (playerMoved) { addLog('Already traveled this turn.', 'event-system'); return; }
  const p = players[0];
  const reachable = getReachable(p);
  if (!reachable.includes(destIdx)) { addLog('Too far! Upgrade your engine.', 'event-system'); return; }
  p.system = destIdx;
  playerMoved = true;
  addLog(`Traveled to ${systems[destIdx].name}`, 'event-system');
  const fac = systems[destIdx].faction;
  if (Math.random() < 0.15) {
    p.rep[fac] = clamp(p.rep[fac] + 1, -5, 5);
    addLog(`Reputation with ${FACTIONS[fac]} improved!`, 'event-diplo');
  }
  updateUI();
}

function playerBuy(good, qty) {
  const p = players[0];
  const sys = systems[p.system];
  const price = Math.round(sys.prices[good] * priceMod(p, sys));
  const maxQty = Math.min(qty, sys.stock[good], p.cargoMax - cargoCount(p), Math.floor(p.credits / price));
  if (maxQty < 1) { addLog('Cannot buy: check credits/cargo/stock.', 'event-system'); return; }
  p.cargo[good] = (p.cargo[good] || 0) + maxQty;
  p.credits -= price * maxQty;
  sys.stock[good] -= maxQty;
  playerTraded = true;
  addLog(`Bought ${maxQty} ${good} for ${price * maxQty} cr`, 'event-trade');
  updateUI();
}

function playerSell(good, qty) {
  const p = players[0];
  const sys = systems[p.system];
  const price = Math.round(sys.prices[good] / priceMod(p, sys));
  const maxQty = Math.min(qty, p.cargo[good] || 0);
  if (maxQty < 1) { addLog('Nothing to sell.', 'event-system'); return; }
  p.cargo[good] -= maxQty;
  p.credits += price * maxQty;
  sys.stock[good] += maxQty;
  playerTraded = true;
  addLog(`Sold ${maxQty} ${good} for ${price * maxQty} cr`, 'event-trade');
  updateUI();
}

function playerUpgrade(type) {
  const p = players[0];
  const costs = { cargo: 150, engine: 200, weapons: 200, shields: 180 };
  const maxes = { cargo: 20, engine: 3, weapons: 5, shields: 5 };
  const cost = costs[type];
  const val = type === 'cargo' ? p.cargoMax : p[type];
  if (val >= maxes[type]) { addLog(`${type} maxed out!`, 'event-system'); return; }
  if (p.credits < cost) { addLog(`Need ${cost} credits.`, 'event-system'); return; }
  p.credits -= cost;
  if (type === 'cargo') { p.cargoMax += 2; addLog(`Cargo hold expanded to ${p.cargoMax}`, 'event-system'); }
  else { p[type]++; addLog(`${type} upgraded to level ${p[type]}`, 'event-system'); }
  updateUI();
}

function endTurn() {
  if (view === 'combat') return;
  for (let i = 1; i < players.length; i++) {
    aiTurn(players[i]);
    if (view === 'combat') return;
  }
  fluctuateMarkets();
  turn++;
  playerMoved = false; playerTraded = false;
  if (turn > MAX_TURNS) { endGame(); return; }
  if (Math.random() < 0.12) {
    const sys = systems[rnd(0, 11)];
    const g = GOODS[rnd(0, 4)];
    if (Math.random() < 0.5) {
      sys.prices[g] = Math.round(sys.prices[g] * 1.5);
      sys.stock[g] = Math.max(0, sys.stock[g] - 5);
      addLog(`Shortage of ${g} at ${sys.name}! Prices soar!`, 'event-trade');
    } else {
      sys.prices[g] = Math.round(sys.prices[g] * 0.6);
      sys.stock[g] += 10;
      addLog(`${g} surplus at ${sys.name}! Prices crash!`, 'event-trade');
    }
  }
  updateUI();
  addLog(`--- Turn ${turn} ---`, 'event-system');
}

function endGame(game) {
  const rankings = players.filter(p => p.alive).map(p => ({ name: p.name, wealth: totalWealth(p) }));
  rankings.sort((a, b) => b.wealth - a.wealth);
  const rank = rankings.findIndex(r => r.name === 'You') + 1;
  score = totalWealth(players[0]);
  const lines = rankings.map((r, i) => `${i + 1}. ${r.name}: ${r.wealth} cr`).join(' | ');
  const title = rank === 1 ? 'TRADE EMPIRE!' : `RANK #${rank}`;
  game.showOverlay(title, `Final Wealth: ${score} credits`);
  const sub = document.getElementById('overlaySub');
  if (sub) sub.textContent = lines;
  game.setState('over');
  updateUI();
}

// ---- COMBAT ----
function resolveCombat(action, game) {
  if (!combatState) return;
  const p = players[0];
  const atk = combatState.attacker;
  if (action === 'fight') {
    const pPow = p.weapons + rnd(1, 4);
    const aPow = atk.weapons + rnd(1, 3);
    if (pPow >= aPow) {
      const loot = Math.min(atk.credits, rnd(50, 150));
      atk.credits -= loot; p.credits += loot;
      addLog(`You defeated ${atk.name}! Looted ${loot} credits!`, 'event-combat');
      p.rep[systems[p.system].faction] = clamp(p.rep[systems[p.system].faction] + 1, -5, 5);
    } else {
      const lost = Math.min(p.credits, rnd(30, 100));
      p.credits -= lost; atk.credits += lost;
      for (const g of GOODS) {
        if ((p.cargo[g] || 0) > 0) {
          const lose = Math.min(p.cargo[g], rnd(1, 3));
          p.cargo[g] -= lose;
          addLog(`Lost ${lose} ${g} in the battle!`, 'event-combat');
        }
      }
      addLog(`${atk.name} overpowered you! Lost ${lost} credits.`, 'event-combat');
    }
  } else if (action === 'flee') {
    const fleeChance = 0.4 + p.engine * 0.15;
    if (Math.random() < fleeChance) {
      const nbs = neighbors(p.system);
      p.system = nbs[rnd(0, nbs.length - 1)];
      addLog(`Escaped to ${systems[p.system].name}!`, 'event-combat');
    } else {
      const lost = Math.min(p.credits, rnd(20, 60));
      p.credits -= lost; atk.credits += lost;
      addLog(`Failed to flee! ${atk.name} took ${lost} credits.`, 'event-combat');
    }
  } else if (action === 'bribe') {
    const bribe = Math.min(p.credits, rnd(50, 100));
    p.credits -= bribe; atk.credits += bribe;
    addLog(`Bribed ${atk.name} with ${bribe} credits.`, 'event-diplo');
  }
  combatState = null;
  view = 'map';
  updateUI();
}

// ---- DRAWING HELPERS ----
function drawStarField(renderer) {
  animFrame++;
  for (const s of starField) {
    const twinkle = 0.5 + 0.5 * Math.sin(animFrame * 0.02 + s.b * 10);
    const a = Math.round(twinkle * 0.7 * 255).toString(16).padStart(2, '0');
    renderer.fillRect(s.x, s.y, s.s, s.s, `#c8c8ff${a}`);
  }
}

function drawNebula(renderer) {
  // Approximate nebula glows with large dim circles
  renderer.fillCircle(300, 250, 200, '#aa88ff07');
  renderer.fillCircle(300, 250, 120, '#aa88ff05');
  renderer.fillCircle(480, 380, 120, '#ff88aa05');
}

function drawRoundedRect(renderer, x, y, w, h, fillColor, strokeColor, strokeWidth = 1) {
  // Approximate rounded rect with a regular rect (fillPoly for proper rounding not needed here)
  renderer.fillRect(x, y, w, h, fillColor);
  if (strokeColor) {
    renderer.drawLine(x, y, x + w, y, strokeColor, strokeWidth);
    renderer.drawLine(x + w, y, x + w, y + h, strokeColor, strokeWidth);
    renderer.drawLine(x + w, y + h, x, y + h, strokeColor, strokeWidth);
    renderer.drawLine(x, y + h, x, y, strokeColor, strokeWidth);
  }
}

// ---- DRAW MAP ----
function drawMap(renderer, text) {
  renderer.fillRect(0, 0, W, H, '#0a0a1e');
  drawStarField(renderer);
  drawNebula(renderer);

  const p = players[0];
  const reachable = playerMoved ? [] : getReachable(p);

  // Draw lanes
  for (const [a, b] of LANES) {
    const sa = systems[a], sb = systems[b];
    renderer.drawLine(sa.x, sa.y, sb.x, sb.y, '#aa88ff26', 1);
  }

  // Draw reachable lanes highlighted (dashed)
  if (!playerMoved) {
    for (const ri of reachable) {
      const path = findPath(p.system, ri);
      for (let pi = 0; pi < path.length - 1; pi++) {
        const pa = systems[path[pi]], pb = systems[path[pi + 1]];
        renderer.dashedLine(pa.x, pa.y, pb.x, pb.y, '#aa88ff59', 1.5, 4, 4);
      }
    }
  }

  // Draw systems
  for (let si = 0; si < systems.length; si++) {
    const s = systems[si];
    const isHover = si === hoverSystem;
    const isPlayer = si === p.system;
    const isReachable = reachable.includes(si);
    const fColor = FACTION_COLORS[s.faction];

    // Glow ring for player location
    if (isPlayer) {
      renderer.setGlow('#aa88ff', 0.8);
      renderer.fillCircle(s.x, s.y, 16, '#aa88ff44');
      renderer.setGlow(null);
    }

    // System circle
    const radius = isHover ? 11 : 9;
    const fillC = isPlayer ? '#aa88ff' : (isReachable ? fColor : '#555555');
    renderer.fillCircle(s.x, s.y, radius, fillC);
    // Stroke ring
    renderer.strokePoly([
      { x: s.x - radius, y: s.y }, { x: s.x, y: s.y - radius },
      { x: s.x + radius, y: s.y }, { x: s.x, y: s.y + radius },
    ], fColor, isReachable ? 2 : 1, true);

    // Production icon dot
    renderer.fillCircle(s.x + 12, s.y - 8, 3, GOOD_COLORS[s.produces]);

    // System name
    const nameColor = isPlayer ? '#ffffff' : (isReachable ? '#cccccc' : '#777777');
    text.drawText(s.name, s.x, s.y + 14, 9, nameColor, 'center');

    // Other players at system
    let oh = 0;
    for (let oi = 1; oi < players.length; oi++) {
      if (players[oi].alive && players[oi].system === si) {
        renderer.fillCircle(s.x + 16 + oh * 10, s.y, 4, players[oi].color);
        oh++;
      }
    }
  }

  // Hover tooltip
  if (hoverSystem >= 0) {
    const hs = systems[hoverSystem];
    let tx = hs.x + 20, ty = hs.y - 50;
    if (tx + 170 > W) tx = hs.x - 190;
    if (ty < 10) ty = hs.y + 20;
    drawRoundedRect(renderer, tx, ty, 170, 108, '#14143266', '#aa88ff', 1);
    text.drawText(`${hs.name} [${FACTIONS[hs.faction]}]`, tx + 6, ty + 4, 10, FACTION_COLORS[hs.faction], 'left');
    text.drawText(`Produces: ${hs.produces}`, tx + 6, ty + 18, 10, '#88ff88', 'left');
    text.drawText(`Demands: ${hs.consumes}`, tx + 6, ty + 30, 10, '#ff8888', 'left');
    let yi = 44;
    for (const tg of GOODS) {
      text.drawText(`${tg}: ${hs.prices[tg]}cr (${hs.stock[tg]})`, tx + 6, ty + yi, 9, GOOD_COLORS[tg], 'left');
      yi += 12;
    }
  }

  // Legend
  for (let f = 0; f < FACTIONS.length; f++) {
    renderer.fillRect(10, H - 32 + f * 11, 7, 7, FACTION_COLORS[f]);
    text.drawText(FACTIONS[f], 20, H - 32 + f * 11, 9, FACTION_COLORS[f], 'left');
  }

  // Move hint
  const hintColor = '#666666';
  if (!playerMoved) {
    text.drawText('Click a highlighted system to travel', W / 2, H - 10, 9, hintColor, 'center');
  } else {
    text.drawText('Already moved. Trade or End Turn.', W / 2, H - 10, 9, '#555555', 'center');
  }
}

// ---- DRAW TRADE ----
function drawTrade(renderer, text) {
  renderer.fillRect(0, 0, W, H, '#0a0a1e');
  drawStarField(renderer);

  const p = players[0];
  const sys = systems[p.system];
  const mod = priceMod(p, sys);

  text.drawText(`${sys.name} Trading Post`, W / 2, 16, 16, '#aa88ff', 'center');
  text.drawText(`${FACTIONS[sys.faction]} Territory | Rep: ${getRepLevel(p)}`, W / 2, 36, 11, FACTION_COLORS[sys.faction], 'center');

  tradeButtons = [];
  const startY = 58;

  // Header
  text.drawText('Good',  30,  startY, 11, '#888888', 'left');
  text.drawText('Buy',  140,  startY, 11, '#888888', 'left');
  text.drawText('Sell', 200,  startY, 11, '#888888', 'left');
  text.drawText('Stock', 260, startY, 11, '#888888', 'left');
  text.drawText('Have',  310, startY, 11, '#888888', 'left');
  renderer.drawLine(20, startY + 8, 580, startY + 8, '#333333', 1);

  for (let gi = 0; gi < GOODS.length; gi++) {
    const g = GOODS[gi];
    const y = startY + 28 + gi * 60;
    const buyP  = Math.round(sys.prices[g] * mod);
    const sellP = Math.round(sys.prices[g] / mod);
    const have  = p.cargo[g] || 0;
    const isProd = g === sys.produces;
    const isCons = g === sys.consumes;

    text.drawText(g, 30, y, 12, GOOD_COLORS[g], 'left');
    const tagColor = isProd ? '#88ff88' : (isCons ? '#ff8888' : '#666666');
    const tagLabel = isProd ? '(produces)' : (isCons ? '(demands)' : '');
    if (tagLabel) text.drawText(tagLabel, 30, y + 13, 9, tagColor, 'left');

    text.drawText(`${buyP}cr`,  140, y, 12, '#ffffff', 'left');
    text.drawText(`${sellP}cr`, 200, y, 12, '#ffffff', 'left');
    text.drawText(`${sys.stock[g]}`, 265, y, 12, '#aaaaaa', 'left');
    text.drawText(`${have}`, 315, y, 12, have > 0 ? '#ffffff' : '#555555', 'left');

    const btns = [
      { label: 'Buy 1',  qty: 1, bx: 365, action: 'buy' },
      { label: 'Buy 5',  qty: 5, bx: 420, action: 'buy' },
      { label: 'Sell 1', qty: 1, bx: 480, action: 'sell' },
      { label: 'Sell 5', qty: 5, bx: 535, action: 'sell' },
    ];

    for (const btn of btns) {
      const canDo = btn.action === 'buy'
        ? (sys.stock[g] >= 1 && p.credits >= buyP && cargoCount(p) < p.cargoMax)
        : (have >= 1);
      const bgColor = canDo ? '#1e1e3ccc' : '#14142888';
      const borderColor = canDo ? GOOD_COLORS[g] : '#333333';
      drawRoundedRect(renderer, btn.bx, y - 12, 50, 22, bgColor, borderColor, 1);
      text.drawText(btn.label, btn.bx + 25, y - 3, 10, canDo ? '#ffffff' : '#555555', 'center');
      tradeButtons.push({ x: btn.bx, y: y - 12, w: 50, h: 22, action: btn.action, good: g, qty: btn.qty, enabled: canDo });
    }
  }

  text.drawText(`Credits: ${p.credits} | Cargo: ${cargoCount(p)}/${p.cargoMax}`, W / 2, H - 92, 14, '#aa88ff', 'center');
  text.drawText(`Tip: Buy ${sys.produces} here (cheap), sell ${sys.consumes} here (expensive)`, W / 2, H - 72, 10, '#777777', 'center');

  // Best routes
  text.drawText('Best routes from here:', 20, H - 50, 10, '#666666', 'left');
  const routes = [];
  const nbs = neighbors(p.system);
  for (const rg of GOODS) {
    for (const ni of nbs) {
      const profit = Math.round(systems[ni].prices[rg] / priceMod(p, systems[ni])) - Math.round(sys.prices[rg] * mod);
      if (profit > 0) routes.push({ g: rg, dest: systems[ni].name, profit });
    }
  }
  routes.sort((a, b) => b.profit - a.profit);
  for (let ri = 0; ri < Math.min(3, routes.length); ri++) {
    text.drawText(`  ${routes[ri].g} -> ${routes[ri].dest}: +${routes[ri].profit}/unit`, 20, H - 36 + ri * 13, 9, GOOD_COLORS[routes[ri].g], 'left');
  }
}

// ---- DRAW SHIP ----
function drawShip(renderer, text) {
  renderer.fillRect(0, 0, W, H, '#0a0a1e');
  drawStarField(renderer);

  const p = players[0];

  text.drawText('SHIP STATUS', W / 2, 22, 18, '#aa88ff', 'center');

  // ASCII ship art
  const shipArt = [
    '     /\\',
    '    /  \\',
    '   / ** \\',
    '  /______\\',
    ' |   ||   |',
    ' | TRADE  |',
    ' |________|',
    '  \\||  ||/',
    '   \\|  |/',
    '    \\__/',
    '    /|\\',
    '   / | \\',
  ];
  for (let ai = 0; ai < shipArt.length; ai++) {
    text.drawText(shipArt[ai], 150, 52 + ai * 14, 12, '#aa88ff', 'center');
  }

  // Stats panel
  const sx = 310, sy = 52;
  text.drawText('Ship Systems:', sx, sy, 13, '#ffffff', 'left');

  const stats = [
    { label: 'Engine',    val: p.engine,   max: 3,  cost: 200, type: 'engine',  desc: `Range: ${p.engine} jump${p.engine > 1 ? 's' : ''}` },
    { label: 'Cargo Hold',val: p.cargoMax, max: 20, cost: 150, type: 'cargo',   desc: `Capacity: ${p.cargoMax} units` },
    { label: 'Weapons',   val: p.weapons,  max: 5,  cost: 200, type: 'weapons', desc: `Attack power: +${p.weapons}` },
    { label: 'Shields',   val: p.shields,  max: 5,  cost: 180, type: 'shields', desc: `Defense power: +${p.shields}` },
  ];

  shipButtons = [];
  for (let si2 = 0; si2 < stats.length; si2++) {
    const st = stats[si2];
    const y = sy + 22 + si2 * 55;
    text.drawText(st.label, sx, y, 12, '#aa88ff', 'left');
    text.drawText(st.desc, sx, y + 13, 10, '#aaaaaa', 'left');

    // Level bar
    const barSteps = st.type === 'cargo' ? Math.floor((st.max - 10) / 2) + 1 : st.max;
    for (let j = 0; j < barSteps; j++) {
      const filled = st.type === 'cargo' ? (j * 2 + 10) <= st.val : j < st.val;
      renderer.fillRect(sx + j * 18, y + 20, 14, 8, filled ? '#aa88ff' : '#333333');
    }

    const canUp = (st.type === 'cargo' ? st.val < st.max : st.val < st.max) && p.credits >= st.cost;
    const bx = sx + 150, by = y + 14;
    drawRoundedRect(renderer, bx, by, 110, 20, canUp ? '#1e1e3ce6' : '#14142880', canUp ? '#aa88ff' : '#444444', 1);
    const upLabel = (st.type === 'cargo' ? st.val >= st.max : st.val >= st.max) ? 'MAXED' : `Upgrade ${st.cost}cr`;
    text.drawText(upLabel, bx + 55, by + 12, 10, canUp ? '#ffffff' : '#555555', 'center');
    shipButtons.push({ x: bx, y: by, w: 110, h: 20, type: st.type, enabled: canUp });
  }

  // Cargo manifest
  text.drawText('Cargo Manifest:', 30, 298, 13, '#ffffff', 'left');
  let cy = 316;
  let totalVal = 0;
  for (const cg of GOODS) {
    const cqty = p.cargo[cg] || 0;
    const cval = cqty * GOOD_BASE[cg];
    totalVal += cval;
    text.drawText(`${cg}: ${cqty} (worth ~${cval} cr)`, 40, cy, 12, cqty > 0 ? GOOD_COLORS[cg] : '#444444', 'left');
    cy += 18;
  }
  text.drawText(`Total Cargo Value: ~${totalVal} cr`, 40, cy + 8, 12, '#aa88ff', 'left');

  // Reputation
  text.drawText('Faction Reputation:', 30, 428, 13, '#ffffff', 'left');
  for (let fi = 0; fi < FACTIONS.length; fi++) {
    const r = p.rep[fi];
    const rlabel = r >= 3 ? 'Allied' : r >= 1 ? 'Friendly' : r >= -1 ? 'Neutral' : r >= -3 ? 'Hostile' : 'Enemy';
    text.drawText(`${FACTIONS[fi]}: ${rlabel} (${r >= 0 ? '+' : ''}${r})`, 40, 448 + fi * 18, 12, FACTION_COLORS[fi], 'left');
    for (let rj = -5; rj <= 5; rj++) {
      const filled = rj <= r;
      const barColor = filled ? (rj >= 0 ? '#88ff88' : '#ff8888') : '#222222';
      renderer.fillRect(240 + (rj + 5) * 12, 440 + fi * 18, 10, 8, barColor);
    }
  }

  // Leaderboard
  text.drawText('Leaderboard:', 350, 338, 13, '#ffffff', 'left');
  const rankings = players.filter(pl => pl.alive).map(pl => ({ name: pl.name, wealth: totalWealth(pl), color: pl.color }));
  rankings.sort((a, b) => b.wealth - a.wealth);
  for (let lbi = 0; lbi < rankings.length; lbi++) {
    text.drawText(`${lbi + 1}. ${rankings[lbi].name}: ${rankings[lbi].wealth} cr`, 360, 358 + lbi * 18, 12, rankings[lbi].color, 'left');
  }
}

// ---- DRAW COMBAT ----
function drawCombat(renderer, text, game) {
  renderer.fillRect(0, 0, W, H, '#0a0a1e');
  drawStarField(renderer);

  if (!combatState) return;
  const atk = combatState.attacker;
  const p = players[0];

  renderer.setGlow('#ff4444', 0.9);
  text.drawText('COMBAT ALERT', W / 2, 44, 24, '#ff4444', 'center');
  renderer.setGlow(null);

  text.drawText(`${atk.name} attacks!`, W / 2, 76, 14, '#ff8888', 'center');

  text.drawText('YOUR SHIP', 170, 118, 12, '#aa88ff', 'center');
  text.drawText(atk.name.toUpperCase(), 430, 118, 12, atk.color, 'center');
  text.drawText('VS', W / 2, 150, 40, '#888888', 'center');

  const cmpStats = [
    ['Weapons', p.weapons, atk.weapons],
    ['Shields',  p.shields,  atk.shields],
    ['Engine',   p.engine,   atk.engine],
    ['Credits',  p.credits,  atk.credits],
  ];
  let cy2 = 198;
  for (const cs of cmpStats) {
    text.drawText(cs[0], W / 2, cy2, 12, '#aaaaaa', 'center');
    text.drawText(`${cs[1]}`, 230, cy2, 12, cs[1] >= cs[2] ? '#88ff88' : '#ff8888', 'right');
    text.drawText(`${cs[2]}`, 370, cy2, 12, cs[2] >= cs[1] ? '#88ff88' : '#ff8888', 'left');
    cy2 += 22;
  }

  combatButtons = [];
  const btnY = 338;
  const fleeP = Math.round((0.4 + p.engine * 0.15) * 100);
  const actions = [
    { label: 'FIGHT', action: 'fight', desc: `Wpn(${p.weapons})+d4 vs ${atk.weapons}+d3`, color: '#ff4444' },
    { label: 'FLEE',  action: 'flee',  desc: `${fleeP}% chance (engine)`,                  color: '#ffff88' },
    { label: 'BRIBE', action: 'bribe', desc: 'Pay 50-100cr to escape',                      color: '#88ccff' },
  ];

  for (let cbi = 0; cbi < actions.length; cbi++) {
    const ac = actions[cbi];
    const abx = 100 + cbi * 160, aby = btnY;
    drawRoundedRect(renderer, abx, aby, 140, 50, '#1e1e3ce6', ac.color, 2);
    text.drawText(ac.label, abx + 70, aby + 18, 16, ac.color, 'center');
    text.drawText(ac.desc, abx + 70, aby + 36, 8, '#aaaaaa', 'center');
    combatButtons.push({ x: abx, y: aby, w: 140, h: 50, action: ac.action });
  }

  text.drawText('Your cargo and credits are at stake!', W / 2, 418, 11, '#666666', 'center');
}

// ---- EXPORT ----
export function createGame() {
  // Grab DOM refs
  scoreEl      = document.getElementById('score');
  shipInfoEl   = document.getElementById('shipInfo');
  turnInfoEl   = document.getElementById('turnInfo');
  locationInfoEl = document.getElementById('locationInfo');
  cargoInfoEl  = document.getElementById('cargoInfo');
  repInfoEl    = document.getElementById('repInfo');
  logEl        = document.getElementById('log');
  btnMap       = document.getElementById('btnMap');
  btnTrade     = document.getElementById('btnTrade');
  btnShip      = document.getElementById('btnShip');
  btnEnd       = document.getElementById('btnEnd');

  // Build starfield
  for (let i = 0; i < 200; i++) {
    starField.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5, b: Math.random() });
  }

  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('SPACE TRADER', 'Elite-inspired trading across the stars');
    const sub = document.getElementById('overlaySub');
    if (sub) sub.textContent = 'Click to launch';
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // No continuous update needed — game is turn-based / event-driven
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting' || !players.length) {
      renderer.fillRect(0, 0, W, H, '#0a0a1e');
      drawStarField(renderer);
      drawNebula(renderer);
      return;
    }
    if (view === 'map')    drawMap(renderer, text);
    else if (view === 'trade') drawTrade(renderer, text);
    else if (view === 'ship')  drawShip(renderer, text);
    else if (view === 'combat') drawCombat(renderer, text, game);
  };

  // ---- MOUSE INPUT (direct canvas listeners) ----
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    hoverSystem = -1;
    if (view === 'map' && game.state === 'playing') {
      for (let i = 0; i < systems.length; i++) {
        if (dist({ x: mx, y: my }, systems[i]) < 20) { hoverSystem = i; break; }
      }
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
      return;
    }

    if (game.state === 'over') {
      game.showOverlay('SPACE TRADER', 'Elite-inspired trading across the stars');
      const sub = document.getElementById('overlaySub');
      if (sub) sub.textContent = 'Click to launch';
      game.setState('waiting');
      return;
    }

    if (view === 'map') {
      for (let i = 0; i < systems.length; i++) {
        if (dist({ x: mx, y: my }, systems[i]) < 20 && i !== players[0].system) {
          playerTravel(i);
          return;
        }
      }
    }

    if (view === 'trade') {
      for (const tb of tradeButtons) {
        if (tb.enabled && mx >= tb.x && mx <= tb.x + tb.w && my >= tb.y && my <= tb.y + tb.h) {
          if (tb.action === 'buy') playerBuy(tb.good, tb.qty);
          else playerSell(tb.good, tb.qty);
          return;
        }
      }
    }

    if (view === 'ship') {
      for (const sb of shipButtons) {
        if (sb.enabled && mx >= sb.x && mx <= sb.x + sb.w && my >= sb.y && my <= sb.y + sb.h) {
          playerUpgrade(sb.type);
          return;
        }
      }
    }

    if (view === 'combat') {
      for (const cb of combatButtons) {
        if (mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
          resolveCombat(cb.action, game);
          return;
        }
      }
    }
  });

  // Button handlers
  if (btnMap)   btnMap.addEventListener('click',   () => { if (game.state === 'playing' && view !== 'combat') { view = 'map';   updateUI(); } });
  if (btnTrade) btnTrade.addEventListener('click', () => { if (game.state === 'playing' && view !== 'combat') { view = 'trade'; updateUI(); } });
  if (btnShip)  btnShip.addEventListener('click',  () => { if (game.state === 'playing' && view !== 'combat') { view = 'ship';  updateUI(); } });
  if (btnEnd)   btnEnd.addEventListener('click',   () => { if (game.state === 'playing') endTurn(); });

  game.start();
  return game;
}
