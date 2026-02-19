// merchant-routes/game.js — Merchant Routes WebGL 2 port

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ── DOM refs ──
const scoreEl      = document.getElementById('score');
const aiScoreEl    = document.getElementById('aiScore');
const turnInfoEl   = document.getElementById('turnInfo');
const inventoryInfoEl = document.getElementById('inventoryInfo');
const cityInfoEl   = document.getElementById('cityInfo');
const eventInfoEl  = document.getElementById('eventInfo');

// ── Goods ──
const GOODS = ['Grain','Ore','Silk','Spices','Wine','Lumber','Gems','Fish'];
const GOOD_COLORS = {
  Grain:'#eda', Ore:'#aab', Silk:'#daf', Spices:'#fa8',
  Wine:'#d6a',  Lumber:'#a86', Gems:'#aef', Fish:'#8ce'
};
const BASE_PRICES = {
  Grain:8, Ore:12, Silk:20, Spices:18, Wine:15, Lumber:10, Gems:30, Fish:7
};

// ── Cities ──
const CITIES = [
  { name:'Portshire',  x:80,  y:80,  produces:['Fish','Lumber'],  demands:['Silk','Spices'] },
  { name:'Goldvale',   x:300, y:50,  produces:['Ore','Gems'],     demands:['Grain','Fish'] },
  { name:'Silkwind',   x:520, y:80,  produces:['Silk','Spices'],  demands:['Ore','Lumber'] },
  { name:'Millhaven',  x:140, y:200, produces:['Grain','Lumber'], demands:['Wine','Gems'] },
  { name:'Irondeep',   x:340, y:180, produces:['Ore','Lumber'],   demands:['Silk','Spices'] },
  { name:'Winecrest',  x:500, y:220, produces:['Wine','Grain'],   demands:['Gems','Ore'] },
  { name:'Gemharbor',  x:80,  y:340, produces:['Gems','Fish'],    demands:['Grain','Wine'] },
  { name:'Spicemere',  x:280, y:320, produces:['Spices','Wine'],  demands:['Lumber','Fish'] },
  { name:'Farmarket',  x:480, y:360, produces:['Grain','Fish'],   demands:['Silk','Gems'] },
  { name:'Tradegate',  x:280, y:450, produces:['Silk','Ore'],     demands:['Wine','Grain'] }
];

const ROADS = [
  [0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],
  [3,6],[4,7],[5,8],[6,7],[7,8],[6,9],[7,9],[8,9]
];

// ── Events ──
const EVENTS = [
  { name:'Drought!',         desc:'Grain prices spike',        effect:g=>g==='Grain'?2.2:1 },
  { name:'Gold Rush!',       desc:'Ore demand surges',         effect:g=>g==='Ore'?2.0:1 },
  { name:'Silk Road Opens',  desc:'Silk prices drop',          effect:g=>g==='Silk'?0.6:1 },
  { name:'Festival Season',  desc:'Wine demand high',          effect:g=>g==='Wine'?2.0:1 },
  { name:'Storm at Sea',     desc:'Fish supply low',           effect:g=>g==='Fish'?1.8:1 },
  { name:'Mine Collapse',    desc:'Gems become rare',          effect:g=>g==='Gems'?2.5:1 },
  { name:'Good Harvest',     desc:'Grain price drops',         effect:g=>g==='Grain'?0.5:1 },
  { name:'Trade Embargo',    desc:'Spices prices spike',       effect:g=>g==='Spices'?2.3:1 },
  { name:'Construction Boom',desc:'Lumber demand up',          effect:g=>g==='Lumber'?1.9:1 },
  { name:'Calm Seas',        desc:'All prices stable',         effect:g=>1 },
  { name:'Bandit Activity',  desc:'Travel costs +5 gold',      effect:g=>1, special:'bandit' },
  { name:'Merchant Fair',    desc:'All sell prices +20%',      effect:g=>1, special:'fair' },
];

const MAX_TURNS = 25;

// ── Module-scope state ──
let score = 100;
let turn, currentEvent, players, currentPlayer, phase;
let cityPrices, supplyDemand;
let hoveredCity, hoveredButton;
let message, messageTimer;
let animating, animProgress, animFrom, animTo;
let tradeButtons = [];

// Mouse state
let mouseX = 0, mouseY = 0;
let pendingClicks = [];

// ── Helpers ──
function getNeighbors(idx) {
  const nb = [];
  ROADS.forEach(([a, b]) => {
    if (a === idx) nb.push(b);
    if (b === idx) nb.push(a);
  });
  return nb;
}

function getCityPrice(ci, good) {
  const city = CITIES[ci];
  const base = BASE_PRICES[good];
  const sd = supplyDemand[ci][good] || 1;
  let supplyMod;
  if (city.produces.includes(good)) {
    supplyMod = 0.5 + (sd > 3 ? -0.1 * (sd - 3) : 0.1 * (3 - sd));
  } else if (city.demands.includes(good)) {
    supplyMod = 1.8 + (sd < 2 ? 0.15 * (2 - sd) : -0.1 * (sd - 2));
  } else {
    supplyMod = 1.0 + (sd < 2 ? 0.2 : -0.1);
  }
  const eventMod = currentEvent ? currentEvent.effect(good) : 1;
  return Math.max(1, Math.round(base * supplyMod * eventMod));
}

function getBuyPrice(ci, good) { return getCityPrice(ci, good); }

function getSellPrice(ci, good) {
  const base = getCityPrice(ci, good);
  const fairBonus = (currentEvent && currentEvent.special === 'fair') ? 1.2 : 1.0;
  return Math.max(1, Math.round(base * fairBonus));
}

function updatePrices() {
  cityPrices = CITIES.map((_, ci) => {
    const prices = {};
    GOODS.forEach(g => { prices[g] = { buy: getBuyPrice(ci, g), sell: getSellPrice(ci, g) }; });
    return prices;
  });
}

function rollEvent() {
  if (turn % 3 === 1 || turn === 1) {
    currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  }
  updatePrices();
}

function getInventoryCount(player) {
  let count = 0;
  for (const g in player.inventory) count += player.inventory[g];
  return count;
}

function getInventoryValue(player) {
  let val = 0;
  for (const g in player.inventory) val += player.inventory[g] * BASE_PRICES[g];
  return val;
}

function showMessage(msg) {
  message = msg;
  messageTimer = 90;
}

// ── AI Logic ──
function aiTurn(player) {
  const neighbors = getNeighbors(player.city);

  // Sell profitable goods
  for (const g in player.inventory) {
    if (player.inventory[g] > 0) {
      const sellP = getSellPrice(player.city, g);
      const city = CITIES[player.city];
      if (city.demands.includes(g) || sellP >= BASE_PRICES[g] * 1.1) {
        const qty = player.inventory[g];
        player.gold += sellP * qty;
        supplyDemand[player.city][g] = (supplyDemand[player.city][g] || 0) + qty;
        delete player.inventory[g];
      }
    }
  }

  // Buy cheap goods
  let capacity = player.maxCapacity * player.carts - getInventoryCount(player);
  if (capacity > 0) {
    const opportunities = [];
    GOODS.forEach(g => {
      const buyP = getBuyPrice(player.city, g);
      if (buyP > player.gold) return;
      neighbors.forEach(ni => {
        const sellP = getSellPrice(ni, g);
        if (sellP - buyP > 2) opportunities.push({ good: g, buyP, sellP, profit: sellP - buyP, target: ni });
      });
      neighbors.forEach(ni => {
        getNeighbors(ni).forEach(ni2 => {
          if (ni2 === player.city) return;
          const sellP = getSellPrice(ni2, g);
          if (sellP - buyP > 5) opportunities.push({ good: g, buyP, sellP, profit: sellP - buyP, target: ni, hops: 2 });
        });
      });
    });
    opportunities.sort((a, b) => b.profit - a.profit);
    for (const opp of opportunities) {
      if (capacity <= 0) break;
      if (opp.buyP > player.gold) continue;
      const canBuy = Math.min(capacity, Math.floor(player.gold / opp.buyP), 3);
      if (canBuy > 0 && supplyDemand[player.city][opp.good] > 0) {
        player.inventory[opp.good] = (player.inventory[opp.good] || 0) + canBuy;
        player.gold -= opp.buyP * canBuy;
        supplyDemand[player.city][opp.good] = Math.max(0, supplyDemand[player.city][opp.good] - canBuy);
        capacity -= canBuy;
      }
    }
    if (player.gold > 80 && player.carts < 3) {
      player.gold -= 50;
      player.carts++;
      player.maxCapacity = 6 * player.carts;
    }
  }

  // Move to best neighbor
  let bestNeighbor = neighbors[0];
  let bestSc = -999;
  neighbors.forEach(ni => {
    let sc = 0;
    for (const g in player.inventory) {
      sc += (getSellPrice(ni, g) - BASE_PRICES[g]) * (player.inventory[g] || 0);
    }
    CITIES[ni].produces.forEach(g => { sc += (BASE_PRICES[g] * 1.5 - getBuyPrice(ni, g)) * 2; });
    sc += Math.random() * 5;
    if (sc > bestSc) { bestSc = sc; bestNeighbor = ni; }
  });

  if (currentEvent && currentEvent.special === 'bandit') {
    player.gold = Math.max(0, player.gold - 5);
  }

  player.city = bestNeighbor;
}

// ── Game init ──
function initGame(game) {
  turn = 1;
  currentPlayer = 0;
  phase = 'move';
  message = '';
  messageTimer = 0;
  animating = false;
  hoveredCity = -1;
  hoveredButton = -1;
  tradeButtons = [];

  players = [
    { name:'You',          gold:100, city:0, inventory:{}, maxCapacity:6, carts:1, isAI:false, color:'#4af' },
    { name:'AI Merchant',  gold:100, city:5, inventory:{}, maxCapacity:6, carts:1, isAI:true,  color:'#f64' },
    { name:'AI Trader',    gold:100, city:9, inventory:{}, maxCapacity:6, carts:1, isAI:true,  color:'#6d4' },
  ];

  supplyDemand = CITIES.map((city) => {
    const sd = {};
    GOODS.forEach(g => {
      if (city.produces.includes(g))     sd[g] = 3 + Math.floor(Math.random() * 3);
      else if (city.demands.includes(g)) sd[g] = 0;
      else                               sd[g] = 1 + Math.floor(Math.random() * 2);
    });
    return sd;
  });

  updatePrices();
  rollEvent();
  score = 100;
  updateUI();
}

function updateUI() {
  const player = players[0];
  score = player.gold + getInventoryValue(player);
  if (scoreEl)    scoreEl.textContent    = player.gold;
  if (turnInfoEl) turnInfoEl.textContent = 'Turn ' + turn + ' / ' + MAX_TURNS;

  let bestAI = 0;
  players.forEach(p => {
    if (p.isAI) {
      const total = p.gold + getInventoryValue(p);
      if (total > bestAI) bestAI = total;
    }
  });
  if (aiScoreEl) aiScoreEl.textContent = bestAI;

  const inv = [];
  for (const g in player.inventory) {
    if (player.inventory[g] > 0) inv.push(g + ':' + player.inventory[g]);
  }
  if (inventoryInfoEl) inventoryInfoEl.innerHTML = '<span class="label">Inventory:</span> ' + (inv.length ? inv.join(', ') : 'empty');
  const city = CITIES[player.city];
  if (cityInfoEl) cityInfoEl.innerHTML = '<span class="label">City:</span> ' + city.name +
    ' | Produces: ' + city.produces.join(', ') + ' | Demands: ' + city.demands.join(', ');
  if (eventInfoEl) eventInfoEl.innerHTML = '<span class="label">Event:</span> ' + (currentEvent ? currentEvent.name : 'None');
}

// ── Turn management ──
let aiProcessTimeout = null;

function endPlayerTurn(game) {
  phase = 'done';
  currentPlayer = 1;
  aiProcessTimeout = setTimeout(() => processAITurns(game), 400);
}

function processAITurns(game) {
  if (currentPlayer >= players.length) {
    advanceTurn(game);
    return;
  }
  const p = players[currentPlayer];
  if (p.isAI) {
    const prevCity = p.city;
    aiTurn(p);
    if (prevCity !== p.city) {
      animFrom = prevCity;
      animTo = p.city;
      animating = true;
      animProgress = 0;
      // Poll for animation completion
      const waitForAnim = setInterval(() => {
        if (!animating) {
          clearInterval(waitForAnim);
          currentPlayer++;
          updateUI();
          aiProcessTimeout = setTimeout(() => processAITurns(game), 300);
        }
      }, 50);
    } else {
      currentPlayer++;
      updateUI();
      aiProcessTimeout = setTimeout(() => processAITurns(game), 300);
    }
  } else {
    currentPlayer++;
    aiProcessTimeout = setTimeout(() => processAITurns(game), 100);
  }
}

function advanceTurn(game) {
  turn++;
  if (turn > MAX_TURNS) {
    endGame(game);
    return;
  }
  supplyDemand.forEach((sd, ci) => {
    CITIES[ci].produces.forEach(g => { sd[g] = Math.min(6, (sd[g] || 0) + 1); });
    CITIES[ci].demands.forEach(g  => { sd[g] = Math.max(0, (sd[g] || 0) - 1); });
  });
  rollEvent();
  currentPlayer = 0;
  phase = 'move';
  updateUI();
}

function endGame(game) {
  const scores = players.map(p => ({
    name: p.name,
    gold: p.gold,
    inventoryVal: getInventoryValue(p),
    total: p.gold + getInventoryValue(p)
  }));
  scores.sort((a, b) => b.total - a.total);

  score = scores.find(s => s.name === 'You').total;
  if (scoreEl) scoreEl.textContent = score;

  const rank = scores.findIndex(s => s.name === 'You') + 1;
  const title = rank === 1 ? 'MASTER MERCHANT!' : (rank === 2 ? 'SKILLED TRADER' : 'APPRENTICE');
  let txt = 'Final Scores:\n';
  scores.forEach((s, i) => {
    txt += (i + 1) + '. ' + s.name + ': ' + s.total + 'g (' + s.gold + ' gold + ' + s.inventoryVal + ' goods)\n';
  });
  txt += '\nClick to play again';

  game.showOverlay(title, txt.replace(/\n/g, ' | '));
  game.setState('over');
}

// ── Drawing ──
function drawMap(renderer, text, game) {
  // Roads
  ROADS.forEach(([a, b]) => {
    const ca = CITIES[a], cb = CITIES[b];
    renderer.drawLine(ca.x, ca.y, cb.x, cb.y, '#333333', 3);

    // Highlight adjacent roads for player
    if (game.state === 'playing' && phase === 'move' && !animating && currentPlayer === 0) {
      const player = players[0];
      if (a === player.city || b === player.city) {
        renderer.drawLine(ca.x, ca.y, cb.x, cb.y, 'rgba(221,170,102,0.3)', 5);
      }
    }
  });

  // Cities
  CITIES.forEach((city, ci) => {
    const isHovered = ci === hoveredCity;
    const isPlayerHere = players.some(p => p.city === ci);
    const r = isHovered ? 22 : 18;

    // Glow ring
    if (isPlayerHere || isHovered) {
      const glowColor = isHovered ? 'rgba(221,170,102,0.15)' : 'rgba(100,100,255,0.10)';
      renderer.fillCircle(city.x, city.y, r + 8, glowColor);
    }

    // City circle body — approximate radial gradient with two circles
    renderer.fillCircle(city.x, city.y, r, '#252545');
    renderer.fillCircle(city.x - 3, city.y - 3, r * 0.5, '#3a3a5e');

    // City border
    renderer.setGlow(isHovered ? '#da6' : null, isHovered ? 0.5 : 0);
    renderer.strokePoly(
      buildCirclePoints(city.x, city.y, r, 20),
      isHovered ? '#dda466' : '#555555',
      isHovered ? 2.5 : 1.5,
      true
    );
    renderer.setGlow(null);

    // City name
    const nameColor = isHovered ? '#ffffff' : '#bbbbbb';
    const nameSize = isHovered ? 11 : 10;
    text.drawText(city.name, city.x, city.y - r - 16, nameSize, nameColor, 'center');

    // Produces dots
    city.produces.forEach((g, i) => {
      renderer.fillCircle(city.x - 8 + i * 10, city.y + r + 7, 3, GOOD_COLORS[g]);
      renderer.strokePoly(
        buildCirclePoints(city.x - 8 + i * 10, city.y + r + 7, 3, 8),
        '#555555', 0.5, true
      );
    });

    // Player markers at city
    const playersHere = players.filter(p => p.city === ci);
    playersHere.forEach((p, pi) => {
      const px = city.x - 12 + pi * 12;
      const py = city.y + 4;
      // Cart body
      renderer.fillRect(px - 4, py - 3, 8, 6, p.color);
      renderer.fillRect(px - 5, py + 3, 10, 2, p.color);
      // Wheels
      renderer.fillCircle(px - 3, py + 6, 2, '#888888');
      renderer.fillCircle(px + 3, py + 6, 2, '#888888');
    });
  });

  // Animation: moving player
  if (animating && animFrom >= 0 && animTo >= 0) {
    const from = CITIES[animFrom];
    const to   = CITIES[animTo];
    const px = from.x + (to.x - from.x) * animProgress;
    const py = from.y + (to.y - from.y) * animProgress;
    const p = players[currentPlayer];
    renderer.setGlow(p.color, 0.8);
    renderer.fillCircle(px, py, 6, p.color);
    renderer.setGlow(null);
    // White border
    renderer.strokePoly(buildCirclePoints(px, py, 6, 12), '#ffffff', 1, true);
  }
}

function drawTradePanel(renderer, text) {
  if (phase !== 'trade' || currentPlayer !== 0) return;

  const player = players[0];
  const city = CITIES[player.city];
  const panelX = 20, panelY = 10;
  const panelW = W - 40, panelH = 490;

  // Panel background
  renderer.fillRect(panelX, panelY, panelW, panelH, 'rgba(20,20,40,0.95)');
  renderer.strokePoly([
    {x:panelX,y:panelY},{x:panelX+panelW,y:panelY},
    {x:panelX+panelW,y:panelY+panelH},{x:panelX,y:panelY+panelH}
  ], '#dda466', 2, true);

  // Title
  renderer.setGlow('#da6', 0.4);
  text.drawText('TRADING AT ' + city.name.toUpperCase(), W / 2, panelY + 14, 16, '#dda466', 'center');
  renderer.setGlow(null);

  // Gold & capacity
  const invCount = getInventoryCount(player);
  text.drawText('Gold: ' + player.gold, panelX + 20, panelY + 38, 12, '#dda466', 'left');
  text.drawText('Cargo: ' + invCount + '/' + player.maxCapacity, panelX + panelW - 20, panelY + 38, 12, '#dda466', 'right');
  text.drawText('Carts: ' + player.carts, W / 2, panelY + 38, 12, '#aaaaaa', 'center');

  // Column headers
  const startY = panelY + 70;
  const rowH = 40;
  text.drawText('GOOD',      panelX + 20,  startY - 5, 10, '#888888', 'left');
  text.drawText('BUY PRICE', panelX + 180, startY - 5, 10, '#888888', 'center');
  text.drawText('SELL PRICE',panelX + 280, startY - 5, 10, '#888888', 'center');
  text.drawText('OWNED',     panelX + 370, startY - 5, 10, '#888888', 'center');
  text.drawText('ACTIONS',   panelX + 475, startY - 5, 10, '#888888', 'center');

  tradeButtons = [];

  GOODS.forEach((g, gi) => {
    const y = startY + gi * rowH;
    const buyP = getBuyPrice(player.city, g);
    const sellP = getSellPrice(player.city, g);
    const owned = player.inventory[g] || 0;
    const isProduce = city.produces.includes(g);
    const isDemand  = city.demands.includes(g);

    // Row background (alternating)
    if (gi % 2 === 0) {
      renderer.fillRect(panelX + 10, y + 2, panelW - 20, rowH - 2, 'rgba(221,170,102,0.05)');
    }

    // Good color dot
    renderer.fillCircle(panelX + 25, y + 20, 5, GOOD_COLORS[g]);

    // Good name
    text.drawText(g, panelX + 36, y + 14, 12, '#e0e0e0', 'left');

    // Tag
    if (isProduce) {
      text.drawText('CHEAP',  panelX + 100, y + 16, 9, '#66aa66', 'left');
    } else if (isDemand) {
      text.drawText('WANTED', panelX + 100, y + 16, 9, '#dd6666', 'left');
    }

    // Buy/sell prices, owned
    text.drawText(buyP  + 'g', panelX + 180, y + 14, 13, isProduce ? '#66dd66' : '#cccccc', 'center');
    text.drawText(sellP + 'g', panelX + 280, y + 14, 13, isDemand  ? '#ffff88' : '#cccccc', 'center');
    text.drawText(String(owned), panelX + 370, y + 14, 13, owned > 0 ? '#ffffff' : '#555555', 'center');

    // Buy button
    const buyBtnX = panelX + 430, buyBtnY = y + 8;
    const btnW = 40, btnH = 22;
    const canBuy = buyP <= player.gold && invCount < player.maxCapacity && supplyDemand[player.city][g] > 0;
    renderer.fillRect(buyBtnX, buyBtnY, btnW, btnH, canBuy ? '#2a4a2a' : '#2a2a2a');
    renderer.strokePoly([
      {x:buyBtnX,y:buyBtnY},{x:buyBtnX+btnW,y:buyBtnY},
      {x:buyBtnX+btnW,y:buyBtnY+btnH},{x:buyBtnX,y:buyBtnY+btnH}
    ], canBuy ? '#66aa66' : '#444444', 1, true);
    text.drawText('BUY', buyBtnX + btnW / 2, buyBtnY + 6, 10, canBuy ? '#66dd66' : '#555555', 'center');
    tradeButtons.push({ x: buyBtnX, y: buyBtnY, w: btnW, h: btnH, action: 'buy', good: g, enabled: canBuy });

    // Sell button
    const sellBtnX = panelX + 480;
    const canSell = owned > 0;
    renderer.fillRect(sellBtnX, buyBtnY, btnW, btnH, canSell ? '#4a2a2a' : '#2a2a2a');
    renderer.strokePoly([
      {x:sellBtnX,y:buyBtnY},{x:sellBtnX+btnW,y:buyBtnY},
      {x:sellBtnX+btnW,y:buyBtnY+btnH},{x:sellBtnX,y:buyBtnY+btnH}
    ], canSell ? '#dd6666' : '#444444', 1, true);
    text.drawText('SELL', sellBtnX + btnW / 2, buyBtnY + 6, 10, canSell ? '#ff8888' : '#555555', 'center');
    tradeButtons.push({ x: sellBtnX, y: buyBtnY, w: btnW, h: btnH, action: 'sell', good: g, enabled: canSell });
  });

  // Buy Cart button
  const cartY = startY + 8 * rowH + 10;
  const cartBtnW = 160, cartBtnH = 28;
  const cartBtnX = W / 2 - cartBtnW - 10;
  const cartCost = 50 * player.carts;
  const canBuyCart = player.gold >= cartCost && player.carts < 4;

  renderer.fillRect(cartBtnX, cartY, cartBtnW, cartBtnH, canBuyCart ? '#2a3a4a' : '#2a2a2a');
  renderer.strokePoly([
    {x:cartBtnX,y:cartY},{x:cartBtnX+cartBtnW,y:cartY},
    {x:cartBtnX+cartBtnW,y:cartY+cartBtnH},{x:cartBtnX,y:cartY+cartBtnH}
  ], canBuyCart ? '#6688cc' : '#444444', 1, true);
  text.drawText('BUY CART (' + cartCost + 'g)', cartBtnX + cartBtnW / 2, cartY + 8, 11, canBuyCart ? '#88aaff' : '#555555', 'center');
  tradeButtons.push({ x: cartBtnX, y: cartY, w: cartBtnW, h: cartBtnH, action: 'cart', enabled: canBuyCart });

  // End Turn button
  const doneBtnX = W / 2 + 10;
  renderer.fillRect(doneBtnX, cartY, cartBtnW, cartBtnH, '#3a3a1a');
  renderer.setGlow('#da6', 0.3);
  renderer.strokePoly([
    {x:doneBtnX,y:cartY},{x:doneBtnX+cartBtnW,y:cartY},
    {x:doneBtnX+cartBtnW,y:cartY+cartBtnH},{x:doneBtnX,y:cartY+cartBtnH}
  ], '#dda466', 1.5, true);
  renderer.setGlow(null);
  text.drawText('END TURN >>>', doneBtnX + cartBtnW / 2, cartY + 8, 11, '#dda466', 'center');
  tradeButtons.push({ x: doneBtnX, y: cartY, w: cartBtnW, h: cartBtnH, action: 'done', enabled: true });

  // Event banner
  if (currentEvent) {
    renderer.fillRect(panelX + 10, panelY + panelH - 32, panelW - 20, 24, 'rgba(60,40,10,0.90)');
    text.drawText('EVENT: ' + currentEvent.name + ' - ' + currentEvent.desc,
      W / 2, panelY + panelH - 29, 11, '#ffaa88', 'center');
  }
}

function drawHUD(renderer, text) {
  if (phase === 'trade' && currentPlayer === 0) return;

  // Event banner
  if (currentEvent && phase === 'move') {
    renderer.fillRect(10, H - 35, W - 20, 28, 'rgba(60,40,10,0.85)');
    text.drawText('EVENT: ' + currentEvent.name + ' - ' + currentEvent.desc,
      W / 2, H - 32, 11, '#ffaa88', 'center');
  }

  // Instruction bar
  if (phase === 'move' && currentPlayer === 0 && !animating) {
    renderer.fillRect(10, 2, W - 20, 22, 'rgba(20,20,40,0.85)');
    text.drawText('CLICK AN ADJACENT CITY TO TRAVEL (or click your city to stay & trade)',
      W / 2, 5, 11, '#dda466', 'center');
  }

  // AI thinking bar
  if (currentPlayer > 0 && !animating) {
    renderer.fillRect(10, 2, W - 20, 22, 'rgba(20,20,40,0.85)');
    text.drawText(players[currentPlayer].name + ' is trading...',
      W / 2, 5, 11, players[currentPlayer].color, 'center');
  }

  // Floating message
  if (messageTimer > 0) {
    const alpha = Math.min(1, messageTimer / 30);
    const msgBg = `rgba(20,20,40,${(0.85 * alpha).toFixed(2)})`;
    const msgFg = `rgba(221,170,102,${alpha.toFixed(2)})`;
    renderer.fillRect(100, H / 2 - 20, W - 200, 30, msgBg);
    renderer.strokePoly([
      {x:100,y:H/2-20},{x:W-100,y:H/2-20},
      {x:W-100,y:H/2+10},{x:100,y:H/2+10}
    ], msgFg, 1, true);
    text.drawText(message, W / 2, H / 2 - 11, 12, msgFg, 'center');
  }

  // Mini inventory panel (map mode)
  if (phase === 'move' && currentPlayer === 0) {
    const player = players[0];
    const px = W - 145, py = 30;
    renderer.fillRect(px, py, 135, 170, 'rgba(20,20,40,0.90)');
    renderer.strokePoly([
      {x:px,y:py},{x:px+135,y:py},{x:px+135,y:py+170},{x:px,y:py+170}
    ], '#dda466', 1, true);

    renderer.setGlow('#da6', 0.3);
    text.drawText('YOUR CARGO', px + 8, py + 4, 10, '#dda466', 'left');
    renderer.setGlow(null);
    text.drawText('Gold: ' + player.gold, px + 8, py + 18, 9, '#aaaaaa', 'left');
    text.drawText('Carts: ' + player.carts + ' (' + getInventoryCount(player) + '/' + player.maxCapacity + ')',
      px + 8, py + 30, 9, '#aaaaaa', 'left');

    let yi = 0;
    GOODS.forEach(g => {
      const qty = player.inventory[g] || 0;
      if (qty > 0) {
        renderer.fillCircle(px + 14, py + 50 + yi * 16, 4, GOOD_COLORS[g]);
        text.drawText(g + ' x' + qty, px + 22, py + 46 + yi * 16, 10, '#cccccc', 'left');
        yi++;
      }
    });
    if (yi === 0) {
      text.drawText('(empty)', px + 8, py + 50, 10, '#555555', 'left');
    }
  }
}

// ── Geometry helpers ──
function buildCirclePoints(cx, cy, r, segments) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// ── Click handling ──
function handleClick(cx, cy, game) {
  if (game.state === 'waiting') {
    game.setState('playing');
    initGame(game);
    return;
  }

  if (game.state === 'over') {
    game.showOverlay('MERCHANT ROUTES', 'Trade goods between cities | Build routes, corner markets | Click to Start');
    game.setState('waiting');
    return;
  }

  if (game.state !== 'playing') return;
  if (animating) return;
  if (currentPlayer !== 0) return;

  if (phase === 'move') {
    let clickedCity = -1;
    CITIES.forEach((city, ci) => {
      const dx = cx - city.x, dy = cy - city.y;
      if (dx * dx + dy * dy < 25 * 25) clickedCity = ci;
    });
    if (clickedCity < 0) return;

    const player = players[0];

    if (clickedCity === player.city) {
      phase = 'trade';
      updatePrices();
      return;
    }

    const neighbors = getNeighbors(player.city);
    if (!neighbors.includes(clickedCity)) {
      showMessage('Not adjacent! Choose a connected city.');
      return;
    }

    if (currentEvent && currentEvent.special === 'bandit') {
      player.gold = Math.max(0, player.gold - 5);
      showMessage('Bandits! -5 gold toll');
    }

    animFrom = player.city;
    animTo = clickedCity;
    animating = true;
    animProgress = 0;
    return;
  }

  if (phase === 'trade') {
    for (const btn of tradeButtons) {
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        if (!btn.enabled) return;
        const player = players[0];

        if (btn.action === 'buy') {
          const price = getBuyPrice(player.city, btn.good);
          const invCount = getInventoryCount(player);
          if (price <= player.gold && invCount < player.maxCapacity) {
            player.gold -= price;
            player.inventory[btn.good] = (player.inventory[btn.good] || 0) + 1;
            supplyDemand[player.city][btn.good] = Math.max(0, (supplyDemand[player.city][btn.good] || 0) - 1);
            updatePrices();
            updateUI();
          }
        } else if (btn.action === 'sell') {
          const price = getSellPrice(player.city, btn.good);
          if ((player.inventory[btn.good] || 0) > 0) {
            player.gold += price;
            player.inventory[btn.good]--;
            if (player.inventory[btn.good] <= 0) delete player.inventory[btn.good];
            supplyDemand[player.city][btn.good] = (supplyDemand[player.city][btn.good] || 0) + 1;
            updatePrices();
            updateUI();
          }
        } else if (btn.action === 'cart') {
          const cost = 50 * player.carts;
          if (player.gold >= cost && player.carts < 4) {
            player.gold -= cost;
            player.carts++;
            player.maxCapacity = 6 * player.carts;
            showMessage('New cart! Capacity now ' + player.maxCapacity);
            updateUI();
          }
        } else if (btn.action === 'done') {
          endPlayerTurn(game);
        }
        return;
      }
    }
  }
}

// ── Export ──
export function createGame() {
  const game = new Game('game');

  game.setScoreFn(() => score);

  game.onInit = () => {
    // Show initial overlay
    game.showOverlay('MERCHANT ROUTES',
      'Trade goods between cities | Build routes, corner markets | Click to Start');
    game.setState('waiting');

    // Set up canvas mouse listeners
    const canvasEl = document.getElementById('game');

    canvasEl.addEventListener('mousemove', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (W / rect.width);
      mouseY = (e.clientY - rect.top)  * (H / rect.height);

      hoveredCity = -1;
      if (game.state === 'playing' && phase === 'move') {
        CITIES.forEach((city, ci) => {
          const dx = mouseX - city.x, dy = mouseY - city.y;
          if (dx * dx + dy * dy < 25 * 25) hoveredCity = ci;
        });
      }
    });

    canvasEl.addEventListener('click', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top)  * (H / rect.height);
      pendingClicks.push({ x: cx, y: cy });
    });
  };

  game.onUpdate = () => {
    // Process click queue
    while (pendingClicks.length > 0) {
      const { x, y } = pendingClicks.shift();
      handleClick(x, y, game);
    }

    if (game.state !== 'playing') return;

    // Animation tick (60 fps fixed, advance ~0.04/frame = 25 frames to cross)
    if (animating) {
      animProgress += 0.04;
      if (animProgress >= 1) {
        animProgress = 1;
        animating = false;
        // Player move complete: go to trade phase
        if (currentPlayer === 0 && phase === 'move') {
          players[0].city = animTo;
          phase = 'trade';
          updatePrices();
          updateUI();
        }
      }
    }

    if (messageTimer > 0) messageTimer--;
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting') {
      // Just the map background
      drawMap(renderer, text, game);
      return;
    }

    drawMap(renderer, text, game);

    if (phase === 'trade' && currentPlayer === 0) {
      drawTradePanel(renderer, text);
    } else {
      drawHUD(renderer, text);
    }
  };

  game.start();
  return game;
}
