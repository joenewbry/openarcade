// stock-market-sim/game.js — Stock Market Sim ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ── Stock definitions ──
const STOCK_DEFS = [
  { ticker: 'NVTK', name: 'NovaTech',  sector: 'tech',   color: '#4af', basePrice: 150, volatility: 0.06 },
  { ticker: 'CBIT', name: 'CyberBit',  sector: 'tech',   color: '#6cf', basePrice:  85, volatility: 0.07 },
  { ticker: 'PETX', name: 'PetroMax',  sector: 'energy', color: '#fa0', basePrice:  65, volatility: 0.05 },
  { ticker: 'SOLR', name: 'SolarWave', sector: 'energy', color: '#fc0', basePrice:  42, volatility: 0.08 },
  { ticker: 'BPHR', name: 'BioPharma', sector: 'pharma', color: '#f4a', basePrice: 120, volatility: 0.09 },
  { ticker: 'MDRX', name: 'MedRelix',  sector: 'pharma', color: '#f6c', basePrice:  78, volatility: 0.07 },
  { ticker: 'SHPX', name: 'ShopMax',   sector: 'retail', color: '#af4', basePrice:  55, volatility: 0.04 },
  { ticker: 'DLVR', name: 'DeliverEZ', sector: 'retail', color: '#cf6', basePrice:  38, volatility: 0.06 },
];

const MARKET_EVENTS = [
  { text: 'FDA approves new drug!',           sector: 'pharma', effect:  0.15 },
  { text: 'Drug trial fails!',                sector: 'pharma', effect: -0.18 },
  { text: 'Tech earnings CRUSH estimates!',   sector: 'tech',   effect:  0.12 },
  { text: 'Major data breach reported!',      sector: 'tech',   effect: -0.14 },
  { text: 'Oil prices surge on supply cut!',  sector: 'energy', effect:  0.13 },
  { text: 'Oil spill causes market panic!',   sector: 'energy', effect: -0.16 },
  { text: 'Holiday sales smash records!',     sector: 'retail', effect:  0.10 },
  { text: 'Consumer spending drops sharply!', sector: 'retail', effect: -0.12 },
  { text: 'Fed raises interest rates!',       sector: 'all',    effect: -0.06 },
  { text: 'Fed signals rate cuts ahead!',     sector: 'all',    effect:  0.07 },
  { text: 'Trade war escalates!',             sector: 'all',    effect: -0.08 },
  { text: 'New trade deal signed!',           sector: 'all',    effect:  0.06 },
  { text: 'Green energy subsidies announced!',sector: 'energy', effect:  0.11 },
  { text: 'AI breakthrough announced!',       sector: 'tech',   effect:  0.16 },
  { text: 'Retail chain files bankruptcy!',   sector: 'retail', effect: -0.10 },
  { text: 'Pandemic fears resurface!',        sector: 'pharma', effect:  0.14 },
];

const INSIDER_TIPS = [
  { text: 'Insider: Big pharma deal coming...',   sector: 'pharma' },
  { text: 'Rumor: Tech bubble about to pop!',     sector: 'tech'   },
  { text: 'Insider: Energy merger imminent!',     sector: 'energy' },
  { text: 'Tip: Retail earnings will disappoint', sector: 'retail' },
  { text: 'Source says: Buy tech NOW',            sector: 'tech'   },
  { text: 'Whisper: Pharma scandal brewing...',   sector: 'pharma' },
  { text: 'Insider: Retail expansion coming',     sector: 'retail' },
  { text: 'Rumor: Energy crash imminent!',        sector: 'energy' },
];

// ── UI layout constants ──
const CHART_X = 10,  CHART_Y = 10,  CHART_W = 280, CHART_H = 180;
const PORT_X  = 300, PORT_Y  = 10,  PORT_W  = 290, PORT_H  = 180;
const TRADE_X = 10,  TRADE_Y = 200, TRADE_W = 280, TRADE_H = 200;
const NEWS_X  = 300, NEWS_Y  = 200, NEWS_W  = 290, NEWS_H  = 100;
const BOARD_X = 300, BOARD_Y = 308, BOARD_W = 290, BOARD_H =  92;
const TICKER_Y = 450, TICKER_H = 45;

// ── Game state ──
let stocks, players, round, phase, currentEvent, currentTip, newsTicker;
let selectedStock, tradeQty, sectorTrends, animFrame;
let resolveTimer = 0;
let score = 0;
const MAX_ROUNDS = 20;

const cashEl  = document.getElementById('cash');
const roundEl = document.getElementById('round');
const scoreEl = document.getElementById('score');

// ── Helpers ──
function portfolioValue(p) {
  let val = p.cash;
  stocks.forEach(s => {
    val += (p.holdings[s.ticker] || 0) * s.price;
    const sq = p.shorts[s.ticker] || 0;
    if (sq > 0) val += sq * (p.shortPrices[s.ticker] - s.price);
  });
  return Math.max(0, val);
}

function updateUI() {
  const pv = portfolioValue(players[0]);
  score = Math.round(pv);
  if (scoreEl) scoreEl.textContent = score.toLocaleString();
  if (cashEl)  cashEl.textContent  = Math.round(players[0].cash).toLocaleString();
  if (roundEl) roundEl.textContent = round + '/' + MAX_ROUNDS;
}

function pushNews(msg) {
  newsTicker.unshift(msg);
  if (newsTicker.length > 8) newsTicker.pop();
}

// ── AI trading ──
function aiTrade(p) {
  const budget = p.cash * 0.3;
  stocks.forEach(s => {
    const hist = s.history;
    const momentum = hist.length >= 3
      ? (hist[hist.length - 1] - hist[hist.length - 3]) / hist[hist.length - 3] : 0;
    const valueRatio = s.basePrice / s.price;
    let action = 'hold', qty = 0;

    switch (p.strategy) {
      case 'value':
        if (valueRatio > 1.15) { action = 'buy';  qty = Math.floor(Math.min(budget / 4, p.cash * 0.15) / s.price); }
        else if (valueRatio < 0.8) { action = 'sell'; qty = Math.floor((p.holdings[s.ticker] || 0) * 0.4); }
        break;
      case 'momentum':
        if (momentum > 0.04) { action = 'buy';  qty = Math.floor(Math.min(budget / 3, p.cash * 0.2) / s.price); }
        else if (momentum < -0.04) {
          action = 'sell'; qty = Math.floor((p.holdings[s.ticker] || 0) * 0.5);
          if (momentum < -0.08 && p.shorts[s.ticker] === 0 && p.cash > s.price * 5) {
            const sq = Math.floor(Math.min(p.cash * 0.1, budget / 4) / s.price);
            if (sq > 0) { p.shorts[s.ticker] = sq; p.shortPrices[s.ticker] = s.price; p.cash -= sq * s.price; }
          }
        }
        break;
      case 'contrarian':
        if (momentum < -0.05) { action = 'buy';  qty = Math.floor(Math.min(budget / 3, p.cash * 0.2) / s.price); }
        else if (momentum > 0.06) { action = 'sell'; qty = Math.floor((p.holdings[s.ticker] || 0) * 0.5); }
        if (p.shorts[s.ticker] > 0 && momentum < -0.03) {
          const sq = p.shorts[s.ticker];
          p.cash += sq * p.shortPrices[s.ticker] + sq * (p.shortPrices[s.ticker] - s.price);
          p.shorts[s.ticker] = 0;
        }
        break;
    }

    if (action === 'buy' && qty > 0) {
      const cost = qty * s.price;
      if (cost <= p.cash) { p.cash -= cost; p.holdings[s.ticker] = (p.holdings[s.ticker] || 0) + qty; }
    } else if (action === 'sell' && qty > 0) {
      const have = p.holdings[s.ticker] || 0;
      qty = Math.min(qty, have);
      if (qty > 0) { p.cash += qty * s.price; p.holdings[s.ticker] -= qty; }
    }
  });
}

// ── Game flow ──
function initGame(game) {
  round = 0;
  phase = 'trade';
  selectedStock = 0;
  tradeQty = 1;
  animFrame = 0;
  resolveTimer = 0;
  newsTicker = ['Welcome to the Stock Market! Trade wisely.'];
  currentEvent = null;
  currentTip   = null;
  sectorTrends = { tech: 0, energy: 0, pharma: 0, retail: 0 };

  stocks = STOCK_DEFS.map(d => ({ ...d, price: d.basePrice, history: [d.basePrice], change: 0 }));

  players = [
    { name: 'You',        cash: 100000, holdings: {}, shorts: {}, shortPrices: {}, isAI: false, strategy: 'human',     color: '#4c4' },
    { name: 'ValueBot',   cash: 100000, holdings: {}, shorts: {}, shortPrices: {}, isAI: true,  strategy: 'value',      color: '#4af' },
    { name: 'MomentumAI', cash: 100000, holdings: {}, shorts: {}, shortPrices: {}, isAI: true,  strategy: 'momentum',   color: '#fa0' },
    { name: 'Contrarian', cash: 100000, holdings: {}, shorts: {}, shortPrices: {}, isAI: true,  strategy: 'contrarian', color: '#f4a' },
  ];
  players.forEach(p => {
    stocks.forEach(s => { p.holdings[s.ticker] = 0; p.shorts[s.ticker] = 0; p.shortPrices[s.ticker] = 0; });
  });

  nextRound(game);
}

function nextRound(game) {
  round++;
  if (round > MAX_ROUNDS) { endGame(game); return; }

  phase = 'trade';
  resolveTimer = 0;

  currentEvent = (round > 1 && Math.random() < 0.7)
    ? MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)] : null;
  currentTip   = Math.random() < 0.5
    ? INSIDER_TIPS[Math.floor(Math.random() * INSIDER_TIPS.length)]   : null;

  for (const s in sectorTrends) {
    sectorTrends[s] = Math.max(-0.1, Math.min(0.1, sectorTrends[s] + (Math.random() - 0.5) * 0.03));
  }

  updateUI();
}

function resolveRound(game) {
  if (phase !== 'trade') return;
  phase = 'news';
  resolveTimer = 0;

  players.forEach(p => { if (p.isAI) aiTrade(p); });

  if (currentEvent) pushNews(currentEvent.text);

  stocks.forEach(s => {
    let delta = (Math.random() - 0.48) * s.volatility;
    delta += sectorTrends[s.sector] || 0;
    if (currentEvent && (currentEvent.sector === 'all' || currentEvent.sector === s.sector)) {
      delta += currentEvent.effect * (0.7 + Math.random() * 0.6);
    }
    delta += (Math.random() - 0.5) * 0.03;
    let newPrice = Math.max(2, Math.round(s.price * (1 + delta) * 100) / 100);
    s.change = ((newPrice - s.price) / s.price) * 100;
    s.price  = newPrice;
    s.history.push(newPrice);
  });

  updateUI();
  // resolveTimer will count up in onUpdate; nextRound fires after ~1.2 s (72 frames at 60Hz)
}

function endGame(game) {
  players.forEach(p => {
    stocks.forEach(s => {
      const sq = p.shorts[s.ticker] || 0;
      if (sq > 0) {
        p.cash += sq * p.shortPrices[s.ticker] + sq * (p.shortPrices[s.ticker] - s.price);
        p.shorts[s.ticker] = 0;
      }
    });
  });

  score = Math.round(portfolioValue(players[0]));
  const rankings = players.map((p, i) => ({ name: p.name, value: Math.round(portfolioValue(p)), idx: i }));
  rankings.sort((a, b) => b.value - a.value);
  const rank = rankings.findIndex(r => r.idx === 0) + 1;

  const title = rank === 1 ? 'MARKET CHAMPION!' : 'GAME OVER';
  let txt = 'Final: $' + score.toLocaleString() + '  Rank: #' + rank + ' of 4';
  game.showOverlay(title, txt);
  game.setState('over');
  if (scoreEl) scoreEl.textContent = score.toLocaleString();
}

// ── Player actions ──
function playerBuy() {
  const s = stocks[selectedStock];
  const cost = tradeQty * s.price;
  if (cost > players[0].cash) return;
  players[0].cash -= cost;
  players[0].holdings[s.ticker] = (players[0].holdings[s.ticker] || 0) + tradeQty;
  pushNews('Bought ' + tradeQty + ' ' + s.ticker + ' @ $' + s.price.toFixed(2));
  updateUI();
}

function playerSell() {
  const s = stocks[selectedStock];
  const qty = Math.min(tradeQty, players[0].holdings[s.ticker] || 0);
  if (qty <= 0) return;
  players[0].cash += qty * s.price;
  players[0].holdings[s.ticker] -= qty;
  pushNews('Sold ' + qty + ' ' + s.ticker + ' @ $' + s.price.toFixed(2));
  updateUI();
}

function playerShort() {
  const s = stocks[selectedStock];
  const collateral = tradeQty * s.price;
  if (collateral > players[0].cash) return;
  players[0].cash -= collateral;
  players[0].shorts[s.ticker]      = (players[0].shorts[s.ticker] || 0) + tradeQty;
  players[0].shortPrices[s.ticker] = s.price;
  pushNews('Shorted ' + tradeQty + ' ' + s.ticker + ' @ $' + s.price.toFixed(2));
  updateUI();
}

function playerCoverShort() {
  const s   = stocks[selectedStock];
  const sq  = players[0].shorts[s.ticker] || 0;
  if (sq <= 0) return;
  const qty = Math.min(tradeQty, sq);
  const pnl = qty * (players[0].shortPrices[s.ticker] - s.price);
  players[0].cash += qty * players[0].shortPrices[s.ticker] + pnl;
  players[0].shorts[s.ticker] -= qty;
  pushNews('Covered ' + qty + ' ' + s.ticker + ' P/L: $' + pnl.toFixed(0));
  updateUI();
}

// ── Rendering helpers ──
function drawPanel(r, t, x, y, w, h, title) {
  r.fillRect(x, y, w, h, '#14142880');
  r.strokePoly([
    { x: x,     y: y     },
    { x: x + w, y: y     },
    { x: x + w, y: y + h },
    { x: x,     y: y + h },
  ], '#333333', 1);
  if (title) {
    t.drawText(title, x + 6, y + 3, 11, '#44cc44');
  }
}

function drawChart(r, t) {
  drawPanel(r, t, CHART_X, CHART_Y, CHART_W, CHART_H, 'PRICE CHART');
  const s    = stocks[selectedStock];
  const hist = s.history;
  if (hist.length < 2) return;

  const px = CHART_X + 8, py = CHART_Y + 22;
  const pw = CHART_W - 16, ph = CHART_H - 32;

  let minP = Infinity, maxP = 0;
  hist.forEach(v => { minP = Math.min(minP, v); maxP = Math.max(maxP, v); });
  const range = maxP - minP || 1;
  minP -= range * 0.1;
  maxP += range * 0.1;

  // Grid lines
  for (let i = 0; i < 4; i++) {
    const gy = py + (ph * i / 3);
    r.drawLine(px, gy, px + pw, gy, '#252540', 0.5);
    const pVal = maxP - (i / 3) * (maxP - minP);
    t.drawText('$' + pVal.toFixed(0), px + 1, gy - 10, 9, '#555555');
  }

  // Fill under curve (draw as filled poly)
  const fillPts = [];
  for (let i = 0; i < hist.length; i++) {
    const hx = px + (i / Math.max(1, hist.length - 1)) * pw;
    const hy = py + ph - ((hist[i] - minP) / (maxP - minP)) * ph;
    fillPts.push({ x: hx, y: hy });
  }
  // Close bottom
  fillPts.push({ x: px + pw, y: py + ph });
  fillPts.push({ x: px,      y: py + ph });
  // Hex color with 15 (~8%) alpha for fill
  r.fillPoly(fillPts, s.color + '15');

  // Price line
  r.setGlow(s.color, 0.5);
  for (let i = 0; i < hist.length - 1; i++) {
    const x1 = px + (i       / Math.max(1, hist.length - 1)) * pw;
    const y1 = py + ph - ((hist[i]     - minP) / (maxP - minP)) * ph;
    const x2 = px + ((i + 1) / Math.max(1, hist.length - 1)) * pw;
    const y2 = py + ph - ((hist[i + 1] - minP) / (maxP - minP)) * ph;
    r.drawLine(x1, y1, x2, y2, s.color, 2);
  }
  r.setGlow(null);

  // Current price label
  t.drawText(s.ticker + ' $' + s.price.toFixed(2), px + pw - 108, py + 2, 12, s.color);
  const chgColor = s.change >= 0 ? '#44cc44' : '#ff4444';
  t.drawText((s.change >= 0 ? '+' : '') + s.change.toFixed(1) + '%', px + pw - 40, py + 2, 11, chgColor);
}

function drawPortfolio(r, t) {
  drawPanel(r, t, PORT_X, PORT_Y, PORT_W, PORT_H, 'LEADERBOARD');
  const py = PORT_Y + 24;
  const rankings = players.map((p, i) => ({ ...p, value: Math.round(portfolioValue(p)), idx: i }));
  rankings.sort((a, b) => b.value - a.value);

  rankings.forEach((pl, i) => {
    const ry = py + i * 38;
    const isPlayer = pl.idx === 0;
    r.fillRect(PORT_X + 4, ry - 2, PORT_W - 8, 34, isPlayer ? '#44cc4410' : '#ffffff08');

    t.drawText((i + 1) + '. ' + pl.name, PORT_X + 10, ry,      11, pl.color);
    t.drawText('$' + pl.value.toLocaleString(), PORT_X + 10, ry + 14, 10, '#cccccc');

    // Performance bar
    const perf = ((pl.value - 100000) / 100000) * 100;
    const barW = Math.min(80, Math.abs(perf) * 0.8);
    const barX = PORT_X + 160;
    const barColor = perf >= 0 ? '#44cc44' : '#ff4444';
    if (barW > 0) r.fillRect(barX, ry + 19, perf >= 0 ? barW : -barW, 6, barColor);
    t.drawText((perf >= 0 ? '+' : '') + perf.toFixed(1) + '%',
      barX + (perf >= 0 ? barW + 4 : -barW - 38), ry + 14, 9, barColor);
  });
}

function drawTradePanel(r, t) {
  drawPanel(r, t, TRADE_X, TRADE_Y, TRADE_W, TRADE_H, 'TRADING DESK');

  // Stock selector tabs
  const tabW = 33, tabH = 18;
  stocks.forEach((s, i) => {
    const tx  = TRADE_X + 6 + i * (tabW + 2);
    const ty  = TRADE_Y + 20;
    const sel = i === selectedStock;
    r.fillRect(tx, ty, tabW, tabH, sel ? s.color + '40' : '#1a1a2e');
    r.strokePoly([
      { x: tx,        y: ty },
      { x: tx + tabW, y: ty },
      { x: tx + tabW, y: ty + tabH },
      { x: tx,        y: ty + tabH },
    ], sel ? s.color : '#333333', sel ? 1.5 : 0.5);
    t.drawText(s.ticker.substring(0, 4), tx + 2, ty + 3, 8, sel ? s.color : '#777777');
  });

  const s     = stocks[selectedStock];
  const baseY = TRADE_Y + 48;

  // Stock info
  t.drawText(s.ticker + ' - ' + s.name,          TRADE_X + 10, baseY,       13, s.color);
  t.drawText('Sector: ' + s.sector.toUpperCase(), TRADE_X + 10, baseY + 14,  10, '#888888');
  t.drawText('Price: $' + s.price.toFixed(2),     TRADE_X + 10, baseY + 28,  10, '#dddddd');
  const chgColor = s.change >= 0 ? '#44cc44' : '#ff4444';
  t.drawText((s.change >= 0 ? '+' : '') + s.change.toFixed(2) + '%', TRADE_X + 130, baseY + 28, 10, chgColor);

  const held    = players[0].holdings[s.ticker] || 0;
  const shorted = players[0].shorts[s.ticker]   || 0;
  t.drawText('Held: ' + held + ' ($' + Math.round(held * s.price).toLocaleString() + ')',
    TRADE_X + 10, baseY + 44, 10, '#aaaaaa');
  if (shorted > 0) {
    t.drawText('Short: ' + shorted, TRADE_X + 180, baseY + 44, 10, '#ff8844');
  }

  // Quantity buttons
  t.drawText('Qty:', TRADE_X + 10, baseY + 62, 10, '#aaaaaa');
  const qtyBtns = [1, 5, 10, 50, 'MAX'];
  qtyBtns.forEach((q, i) => {
    const bx = TRADE_X + 45 + i * 44;
    const by = baseY + 60;
    const bw = 40, bh = 18;
    const maxQ = Math.max(1, Math.floor(players[0].cash / s.price));
    const isActive = (q === 'MAX' && tradeQty === maxQ) || (q !== 'MAX' && tradeQty === q);
    r.fillRect(bx, by, bw, bh, isActive ? '#44cc4440' : '#222222');
    r.strokePoly([
      { x: bx,      y: by },
      { x: bx + bw, y: by },
      { x: bx + bw, y: by + bh },
      { x: bx,      y: by + bh },
    ], isActive ? '#44cc44' : '#444444', 1);
    t.drawText('' + q, bx + (q === 'MAX' ? 6 : 14), by + 3, 9, isActive ? '#44cc44' : '#aaaaaa');
  });

  // Action buttons + End Turn
  if (phase === 'trade') {
    const btns = [
      { label: 'BUY',   color: '#44cc44', x: TRADE_X + 10,  enabled: players[0].cash >= s.price * tradeQty },
      { label: 'SELL',  color: '#ff4444', x: TRADE_X + 78,  enabled: (players[0].holdings[s.ticker] || 0) > 0 },
      { label: 'SHORT', color: '#ff8844', x: TRADE_X + 146, enabled: players[0].cash >= s.price * tradeQty },
      { label: 'COVER', color: '#4488ff', x: TRADE_X + 214, enabled: (players[0].shorts[s.ticker] || 0) > 0 },
    ];
    btns.forEach(b => {
      const by = baseY + 88; const bw = 60, bh = 24;
      r.fillRect(b.x, by, bw, bh, b.enabled ? b.color + '30' : '#1a1a2e');
      r.strokePoly([
        { x: b.x,      y: by },
        { x: b.x + bw, y: by },
        { x: b.x + bw, y: by + bh },
        { x: b.x,      y: by + bh },
      ], b.enabled ? b.color : '#333333', b.enabled ? 1.5 : 0.5);
      t.drawText(b.label, b.x + 10, by + 6, 10, b.enabled ? b.color : '#555555');
    });

    // End turn button
    const etx = TRADE_X + 80, ety = baseY + 122, etw = 120, eth = 26;
    r.fillRect(etx, ety, etw, eth, '#44cc4425');
    r.strokePoly([
      { x: etx,       y: ety },
      { x: etx + etw, y: ety },
      { x: etx + etw, y: ety + eth },
      { x: etx,       y: ety + eth },
    ], '#44cc44', 2);
    t.drawText('END TURN >>', etx + 10, ety + 6, 12, '#44cc44');
  } else {
    r.setGlow('#ffaa00', 0.6);
    t.drawText('Processing market...', TRADE_X + 50, baseY + 100, 12, '#ffaa00');
    r.setGlow(null);
  }
}

function drawNews(r, t) {
  drawPanel(r, t, NEWS_X, NEWS_Y, NEWS_W, NEWS_H, 'NEWS FEED');
  const ny = NEWS_Y + 22;

  if (currentEvent && phase === 'trade') {
    t.drawText('BREAKING:', NEWS_X + 8, ny, 10, '#ffaa00');
    // Simple line wrap — split into ~30 char chunks
    const words = currentEvent.text.split(' ');
    let line = '', lineY = ny + 14;
    words.forEach(w => {
      if ((line + w).length > 32) {
        t.drawText(line.trim(), NEWS_X + 8, lineY, 9, '#dddddd');
        line = ''; lineY += 12;
      }
      line += w + ' ';
    });
    if (line.trim()) t.drawText(line.trim(), NEWS_X + 8, lineY, 9, '#dddddd');
  }

  if (currentTip && phase === 'trade') {
    t.drawText('TIP: ' + currentTip.text, NEWS_X + 8, ny + 54, 9, '#ff44aa');
    t.drawText('(Tips may be misleading!)', NEWS_X + 8, ny + 66, 8, '#666666');
  }
}

function drawOrderBook(r, t) {
  drawPanel(r, t, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 'ORDER BOOK / HOLDINGS');
  const s  = stocks[selectedStock];
  const by = BOARD_Y + 20;

  players.forEach((p, i) => {
    const ry   = by + i * 17;
    const held = p.holdings[s.ticker] || 0;
    const shrt = p.shorts[s.ticker]   || 0;
    t.drawText(p.name.padEnd(12),             BOARD_X + 8,   ry, 9, p.color);
    t.drawText('H:' + ('' + held).padStart(4), BOARD_X + 110, ry, 9, held > 0 ? '#44cc44' : '#555555');
    t.drawText('S:' + ('' + shrt).padStart(4), BOARD_X + 175, ry, 9, shrt > 0 ? '#ff8844' : '#555555');
    const val = held * s.price;
    t.drawText('$' + Math.round(val).toLocaleString(), BOARD_X + 220, ry, 9, '#777777');
  });
}

function drawNewsTicker(r, t) {
  drawPanel(r, t, 10, TICKER_Y, W - 20, TICKER_H, null);
  const visible = newsTicker.slice(0, 3);
  visible.forEach((n, i) => {
    t.drawText(n.substring(0, 80), 18, TICKER_Y + 4 + i * 14, 9, i === 0 ? '#dddddd' : '#666666');
  });
}

function drawWaitingBg(r, t) {
  // Animated sine-wave background for overlay state
  const time = animFrame * 0.02;
  for (let i = 0; i < 3; i++) {
    const pts = [];
    for (let x = 0; x <= W; x += 6) {
      const y = H / 2 + Math.sin(x * 0.01 + time + i * 2) * 60
                      + Math.sin(x * 0.03 + time * 1.5) * 30 - i * 40;
      pts.push({ x, y });
    }
    for (let j = 0; j < pts.length - 1; j++) {
      r.drawLine(pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y, '#44cc4420', 1);
    }
  }
}

// ── Main ──
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('STOCK MARKET SIM', 'Competitive trading simulation');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    animFrame++;

    if (game.state === 'over') return;

    if (phase === 'news') {
      resolveTimer += dt;
      if (resolveTimer >= 1200) {
        resolveTimer = 0;
        nextRound(game);
      }
    }
  };

  game.onDraw = (r, t) => {
    if (game.state === 'waiting') {
      drawWaitingBg(r, t);
      return;
    }

    if (game.state === 'over') {
      // Minimal background during game-over overlay
      drawWaitingBg(r, t);
      return;
    }

    drawChart(r, t);
    drawPortfolio(r, t);
    drawTradePanel(r, t);
    drawNews(r, t);
    drawOrderBook(r, t);
    drawNewsTicker(r, t);

    // "MARKET MOVING..." overlay during resolve phase
    if (phase === 'news') {
      r.fillRect(0, 0, W, H, '#1a1a2e99');
      r.setGlow('#ffaa00', 0.8);
      t.drawText('MARKET MOVING...', W / 2, H / 2 - 8, 16, '#ffaa00', 'center');
      r.setGlow(null);
    }
  };

  // ── Mouse input via direct canvas listener ──
  game.canvas.addEventListener('click', (e) => {
    const rect = game.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (game.state === 'waiting') {
      game.setState('playing');
      initGame(game);
      return;
    }

    if (game.state === 'over') {
      game.setState('playing');
      initGame(game);
      return;
    }

    if (phase !== 'trade') return;

    // Stock tabs
    const tabW = 33, tabH = 18;
    stocks.forEach((s, i) => {
      const tx = TRADE_X + 6 + i * (tabW + 2);
      const ty = TRADE_Y + 20;
      if (mx >= tx && mx <= tx + tabW && my >= ty && my <= ty + tabH) {
        selectedStock = i;
        tradeQty = 1;
      }
    });

    // Qty buttons
    const s     = stocks[selectedStock];
    const baseY = TRADE_Y + 48;
    const qtyBtns = [1, 5, 10, 50, 'MAX'];
    qtyBtns.forEach((q, i) => {
      const bx = TRADE_X + 45 + i * 44;
      const by = baseY + 60;
      if (mx >= bx && mx <= bx + 40 && my >= by && my <= by + 18) {
        tradeQty = q === 'MAX' ? Math.max(1, Math.floor(players[0].cash / s.price)) : q;
      }
    });

    // Action buttons
    const btns = [
      { x: TRADE_X + 10,  action: playerBuy,        enabled: players[0].cash >= s.price * tradeQty },
      { x: TRADE_X + 78,  action: playerSell,       enabled: (players[0].holdings[s.ticker] || 0) > 0 },
      { x: TRADE_X + 146, action: playerShort,      enabled: players[0].cash >= s.price * tradeQty },
      { x: TRADE_X + 214, action: playerCoverShort, enabled: (players[0].shorts[s.ticker] || 0) > 0 },
    ];
    btns.forEach(b => {
      const by2 = baseY + 88;
      if (mx >= b.x && mx <= b.x + 60 && my >= by2 && my <= by2 + 24 && b.enabled) {
        b.action();
      }
    });

    // End turn
    const etx = TRADE_X + 80, ety = baseY + 122;
    if (mx >= etx && mx <= etx + 120 && my >= ety && my <= ety + 26) {
      resolveRound(game);
    }
  });

  game.start();
  return game;
}
