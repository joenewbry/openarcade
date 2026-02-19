import { Game } from '../engine/core.js';

const W = 600, H = 500;

const GOLD = '#fa0';
const BG = '#1a1a2e';
const PANEL = '#16213e';
const PANEL_LIGHT = '#1e2d4a';

const CATEGORIES = [
  { name: 'Fine Art',      icon: 'art',       baseValue: [800,  2500], color: '#e44' },
  { name: 'Antiques',      icon: 'antique',   baseValue: [500,  2000], color: '#c96' },
  { name: 'Jewelry',       icon: 'jewel',     baseValue: [1000, 3500], color: '#4cf' },
  { name: 'Rare Books',    icon: 'book',      baseValue: [300,  1500], color: '#8b6' },
  { name: 'Vintage Wine',  icon: 'wine',      baseValue: [400,  1800], color: '#b46' },
  { name: 'Sculptures',    icon: 'sculpture', baseValue: [600,  2200], color: '#c8f' },
  { name: 'Timepieces',    icon: 'watch',     baseValue: [700,  3000], color: '#6cf' },
  { name: 'Maps & Charts', icon: 'map',       baseValue: [200,  1200], color: '#da6' },
  { name: 'Coins & Medals',icon: 'coin',      baseValue: [300,  1600], color: '#fd4' },
  { name: 'Instruments',   icon: 'music',     baseValue: [500,  2400], color: '#f86' }
];

const ITEM_NAMES = {
  art:       ['Sunset Over Venice','Portrait of a Lady','Abstract Harmony','Mountain Dusk','The Blue Garden','Starlit Harbor','Golden Meadow','Crimson Still Life'],
  antique:   ['Victorian Desk','Ming Dynasty Vase','Georgian Mirror','Edwardian Tea Set','Art Deco Lamp','Louis XV Chair','Bronze Candelabra','Ivory Chess Set'],
  jewel:     ['Ruby Necklace','Sapphire Ring','Emerald Brooch','Diamond Tiara','Pearl Earrings','Opal Pendant','Topaz Bracelet','Amethyst Crown'],
  book:      ['First Ed. Dickens','Illuminated MS','Shakespeare Folio','Gutenberg Leaf','Ancient Atlas','Signed Hemingway','Medieval Psalter','Darwin Origin 1st'],
  wine:      ['1945 Mouton','1961 Petrus','1982 Lafite','1990 Romanee-Conti','2000 Margaux','1947 Cheval Blanc','1959 Haut-Brion','1975 Yquem'],
  sculpture: ['Bronze Apollo','Marble Venus','Jade Dragon','Onyx Panther','Crystal Swan','Iron Wolf','Gilt Angel','Ceramic Lion'],
  watch:     ['1950s Rolex Sub','Patek 2499','Breguet Tourbillon','AP Royal Oak','Omega Speedmaster','Cartier Tank','Vacheron Patrimony','IWC Portuguese'],
  map:       ['16th C. World Map','Celestial Chart','Nautical Atlas','Silk Road Map','Colonial Territory','Ptolemy Print','Treasure Map 1650','Ottoman Map'],
  coin:      ['Roman Aureus','Doubloon 1715','Double Eagle 1933','Byzantine Solidus','Athenian Owl','Flowing Hair Dollar','Guinea 1663','Florentine Florin'],
  music:     ['Stradivarius','1959 Les Paul','Steinway Grand','Martin D-45','Selmer Mark VI','Amati Cello','Bosendorfer Imp.','Gibson Mandolin']
};

const AI_PROFILES = [
  { name: 'Baron Von Rich', strategy: 'aggressive',    color: '#e55', riskTol: 1.3,  bluffChance: 0.10 },
  { name: 'Lady Prudence',  strategy: 'conservative',  color: '#5b5', riskTol: 0.7,  bluffChance: 0.05 },
  { name: 'The Collector',  strategy: 'value-hunter',  color: '#58f', riskTol: 1.0,  bluffChance: 0.02 },
  { name: 'Sly Fox',        strategy: 'bluffer',       color: '#f8f', riskTol: 0.9,  bluffChance: 0.35 },
  { name: 'Old Money',      strategy: 'steady',        color: '#cc8', riskTol: 0.85, bluffChance: 0.08 }
];

// Module-scope state
let score = 0;
let bestScore = 0;
let players = [];
let currentItem = null;
let currentBid = 0;
let currentBidder = -1;
let round = 0;
let totalRounds = 12;
let auctionPhase = 'idle';
let animTimer = 0;
let bidButtons = [];
let messageLog = [];
let soldAnim = 0;
let allItems = [];
let sparkles = [];
let hoverBtn = -1;
let showItemTimer = 0;
let bidIncrement = 100;
let playerBidAmount = 0;
let quickBidButtons = [];
let gaveled = false;
let gavelTimer = 0;
let gavelCount = 0;
let respondedToBid = new Set();
let waitingForHuman = false;
let aiActionTimer = 0;
let nextAiIdx = -1;
let mouseX = 0, mouseY = 0;
let pendingClicks = [];
let pendingMoves = [];

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function hexAlpha(alpha) {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
}

// Build color with alpha from a hex color (#rrggbb → #rrggbbaa)
function withAlpha(hex, alpha) {
  // hex is like '#fa0' or '#16213e'
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1], 16) * 17;
    g = parseInt(hex[2], 16) * 17;
    b = parseInt(hex[3], 16) * 17;
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  const a = hexAlpha(alpha);
  const rh = r.toString(16).padStart(2, '0');
  const gh = g.toString(16).padStart(2, '0');
  const bh = b.toString(16).padStart(2, '0');
  return `#${rh}${gh}${bh}${a}`;
}

function generateItems() {
  allItems = [];
  const usedNames = new Set();
  for (let i = 0; i < totalRounds; i++) {
    const cat = CATEGORIES[rand(0, CATEGORIES.length - 1)];
    const names = ITEM_NAMES[cat.icon];
    let name;
    do { name = names[rand(0, names.length - 1)]; } while (usedNames.has(name));
    usedNames.add(name);
    const baseVal = rand(cat.baseValue[0], cat.baseValue[1]);
    const variance = 0.6 + Math.random() * 1.2;
    const trueValue = Math.round(baseVal * variance / 10) * 10;
    const estLow = Math.round(baseVal * 0.5 / 50) * 50;
    const estHigh = Math.round(baseVal * 1.6 / 50) * 50;
    allItems.push({
      name, category: cat, trueValue, estLow, estHigh,
      startBid: Math.max(50, Math.round(estLow * 0.4 / 50) * 50),
      winner: -1, winBid: 0
    });
  }
}

function initGame(game) {
  players = [
    { name: 'You', color: GOLD, budget: 10000, items: [], totalSpent: 0, isHuman: true, passed: false }
  ];
  const numAI = rand(3, 4);
  const shuffled = [...AI_PROFILES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < numAI; i++) {
    const p = shuffled[i];
    players.push({
      name: p.name, color: p.color, budget: 10000, items: [],
      totalSpent: 0, isHuman: false, passed: false,
      strategy: p.strategy, riskTol: p.riskTol, bluffChance: p.bluffChance
    });
  }
  round = 0;
  generateItems();
  score = 0;
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = '$0';
  messageLog = [];
  sparkles = [];
  startNextRound();
}

function startNextRound() {
  if (round >= totalRounds) { showResults(); return; }
  currentItem = allItems[round];
  currentBid = currentItem.startBid;
  currentBidder = -1;
  auctionPhase = 'showing';
  showItemTimer = 75;
  gaveled = false; gavelTimer = 0; gavelCount = 0;
  for (const p of players) p.passed = false;
  respondedToBid = new Set();
  waitingForHuman = false;
  nextAiIdx = -1;
  aiActionTimer = 0;
  bidIncrement = currentBid < 300 ? 50 : (currentBid < 1000 ? 100 : 150);
  playerBidAmount = currentBid + bidIncrement;
  buildBidButtons();
  addMessage('Lot ' + (round + 1) + '/' + totalRounds + ': ' + currentItem.name);
  round++;
}

function buildBidButtons() {
  bidButtons = [
    { x: 400, y: 398, w: 85, h: 30, label: 'BID',  action: 'bid'  },
    { x: 500, y: 398, w: 85, h: 30, label: 'PASS', action: 'pass' }
  ];
  quickBidButtons = [];
  const increments = [50, 100, 250, 500];
  for (let i = 0; i < increments.length; i++) {
    quickBidButtons.push({
      x: 400 + i * 47, y: 365, w: 43, h: 22,
      label: '+' + increments[i], value: increments[i]
    });
  }
}

function addMessage(msg) {
  messageLog.unshift({ text: msg, time: 240 });
  if (messageLog.length > 8) messageLog.pop();
}

function scheduleResponses() {
  waitingForHuman = false;
  nextAiIdx = -1;
  if (!players[0].passed && !respondedToBid.has(0) && currentBidder !== 0) {
    waitingForHuman = true;
  }
  for (let i = 1; i < players.length; i++) {
    if (!players[i].passed && !respondedToBid.has(i) && currentBidder !== i) {
      nextAiIdx = i;
      aiActionTimer = rand(20, 45);
      return;
    }
  }
  if (!waitingForHuman) {
    checkAuctionEnd();
  }
}

function playerBid() {
  if (auctionPhase !== 'bidding' || players[0].passed) return;
  if (playerBidAmount > players[0].budget) return;
  if (currentBidder !== -1 && playerBidAmount <= currentBid) return;
  currentBid = playerBidAmount;
  currentBidder = 0;
  addMessage('You bid $' + currentBid);
  respondedToBid = new Set();
  respondedToBid.add(0);
  playerBidAmount = currentBid + bidIncrement;
  gaveled = false; gavelCount = 0;
  waitingForHuman = false;
  scheduleResponses();
}

function playerPass() {
  if (auctionPhase !== 'bidding' || players[0].passed) return;
  players[0].passed = true;
  respondedToBid.add(0);
  addMessage('You pass');
  waitingForHuman = false;
  scheduleResponses();
}

function aiDecide(idx) {
  const ai = players[idx];
  if (ai.passed || ai.budget < currentBid + bidIncrement) {
    ai.passed = true;
    respondedToBid.add(idx);
    addMessage(ai.name + ' passes');
    scheduleResponses();
    return;
  }
  const item = currentItem;
  let estValue = (item.estLow + item.estHigh) / 2;
  const personalBias = (Math.random() - 0.5) * 0.4 + 1.0;
  estValue *= personalBias * ai.riskTol;
  let maxWilling = estValue;
  switch (ai.strategy) {
    case 'aggressive': maxWilling = estValue * (1.1 + Math.random() * 0.3); break;
    case 'conservative': maxWilling = estValue * (0.6 + Math.random() * 0.2); break;
    case 'value-hunter':
      if (currentBid > estValue * 0.7) {
        ai.passed = true; respondedToBid.add(idx);
        addMessage(ai.name + ' passes'); scheduleResponses(); return;
      }
      maxWilling = estValue * 0.85; break;
    case 'bluffer':
      if (Math.random() < ai.bluffChance) maxWilling = estValue * (1.5 + Math.random());
      else maxWilling = estValue * (0.7 + Math.random() * 0.3); break;
    case 'steady': maxWilling = estValue * (0.8 + Math.random() * 0.2); break;
  }
  const budgetRatio = ai.budget / 10000;
  if (budgetRatio < 0.3) maxWilling *= 0.7;
  else if (budgetRatio < 0.5) maxWilling *= 0.85;
  const itemsLeft = totalRounds - round + 1;
  if (itemsLeft <= 3 && ai.items.length === 0) maxWilling *= 1.3;
  const nextBid = currentBid + bidIncrement + rand(0, 2) * 50;
  if (nextBid <= maxWilling && nextBid <= ai.budget) {
    currentBid = nextBid;
    currentBidder = idx;
    addMessage(ai.name + ' bids $' + currentBid);
    respondedToBid = new Set();
    respondedToBid.add(idx);
    playerBidAmount = Math.max(playerBidAmount, currentBid + bidIncrement);
    gaveled = false; gavelCount = 0;
    scheduleResponses();
  } else {
    ai.passed = true;
    respondedToBid.add(idx);
    addMessage(ai.name + ' passes');
    scheduleResponses();
  }
}

function checkAuctionEnd() {
  if (currentBidder >= 0) {
    let allDone = true;
    for (let i = 0; i < players.length; i++) {
      if (i !== currentBidder && !players[i].passed) { allDone = false; break; }
    }
    if (allDone) {
      if (!gaveled) { gaveled = true; gavelTimer = 45; gavelCount = 0; }
    }
  } else {
    let anyActive = false;
    for (let i = 0; i < players.length; i++) { if (!players[i].passed) { anyActive = true; break; } }
    if (!anyActive) {
      auctionPhase = 'sold'; soldAnim = 70;
      currentItem.winner = -1;
      addMessage(currentItem.name + ' goes unsold!');
    }
  }
}

function sellItem() {
  const winner = currentBidder;
  const price = currentBid;
  currentItem.winner = winner;
  currentItem.winBid = price;
  players[winner].budget -= price;
  players[winner].totalSpent += price;
  players[winner].items.push({ ...currentItem, pricePaid: price });
  if (winner === 0) {
    addMessage('You won ' + currentItem.name + ' for $' + price + '!');
    for (let i = 0; i < 15; i++) {
      sparkles.push({
        x: 200 + Math.random() * 200, y: 80 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1,
        life: rand(30, 60), maxLife: 60
      });
    }
  } else {
    addMessage(players[winner].name + ' wins ' + currentItem.name + ' for $' + price);
  }
  auctionPhase = 'sold'; soldAnim = 85;
}

function showResults() {
  auctionPhase = 'results';
  for (const p of players) {
    p.totalValue = 0;
    for (const item of p.items) p.totalValue += item.trueValue;
    p.profit = p.totalValue - p.totalSpent;
  }
  score = players[0].profit;
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = '$' + score;
  if (score > bestScore) {
    bestScore = score;
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = '$' + bestScore;
    localStorage.setItem('auctionHouseBest', bestScore.toString());
  }
}

// ── Drawing helpers ──

// Draw a rounded rectangle as filled polygon (approximated with fillRect + fillCircles)
// Since the engine has no built-in roundRect, we approximate with a plain rect
// and use strokePoly for the border with corner points.
function drawRoundRect(renderer, x, y, w, h, r, fillColor, strokeColor, strokeWidth) {
  // Fill: approximate rounded rect with center rect + 4 side rects + 4 corner circles
  if (fillColor) {
    // Center body
    renderer.fillRect(x + r, y, w - r * 2, h, fillColor);
    renderer.fillRect(x, y + r, w, h - r * 2, fillColor);
    // Corners
    renderer.fillCircle(x + r,     y + r,     r, fillColor);
    renderer.fillCircle(x + w - r, y + r,     r, fillColor);
    renderer.fillCircle(x + r,     y + h - r, r, fillColor);
    renderer.fillCircle(x + w - r, y + h - r, r, fillColor);
  }
  if (strokeColor) {
    // Draw outline as a polygon of rounded corner points
    const steps = 4;
    const pts = [];
    // Top edge
    pts.push({ x: x + r, y });
    pts.push({ x: x + w - r, y });
    // Top-right corner
    for (let i = 1; i <= steps; i++) {
      const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps);
      pts.push({ x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
    }
    // Right edge
    pts.push({ x: x + w, y: y + h - r });
    // Bottom-right corner
    for (let i = 1; i <= steps; i++) {
      const a = (Math.PI / 2) * (i / steps);
      pts.push({ x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
    }
    // Bottom edge
    pts.push({ x: x + r, y: y + h });
    // Bottom-left corner
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI / 2 + (Math.PI / 2) * (i / steps);
      pts.push({ x: x + r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
    }
    // Left edge
    pts.push({ x, y: y + r });
    // Top-left corner
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI + (Math.PI / 2) * (i / steps);
      pts.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
    }
    renderer.strokePoly(pts, strokeColor, strokeWidth || 1.5, true);
  }
}

function drawIcon(renderer, text, cx, cy, size, type, color) {
  renderer.setGlow(color, 0.5);
  switch (type) {
    case 'art': {
      // Frame (two rects as outlines)
      const fw = size * 2, fh = size * 1.6;
      const fx = cx - size, fy = cy - size * 0.8;
      renderer.strokePoly([
        {x: fx, y: fy}, {x: fx+fw, y: fy}, {x: fx+fw, y: fy+fh}, {x: fx, y: fy+fh}
      ], color, 1.5, true);
      renderer.strokePoly([
        {x: fx+2, y: fy+2}, {x: fx+fw-2, y: fy+2}, {x: fx+fw-2, y: fy+fh-2}, {x: fx+2, y: fy+fh-2}
      ], color, 1.5, true);
      // Mountain line
      renderer.strokePoly([
        {x: cx - size + 4, y: cy + size * 0.5},
        {x: cx - size * 0.3, y: cy - size * 0.2},
        {x: cx, y: cy + size * 0.1},
        {x: cx + size * 0.4, y: cy - size * 0.4},
        {x: cx + size - 4, y: cy + size * 0.5}
      ], color, 1.5, false);
      break;
    }
    case 'antique': {
      // Vase shape approximated with lines
      const pts = [
        {x: cx - size * 0.3, y: cy - size},
        {x: cx - size * 0.8, y: cy - size * 0.3},
        {x: cx - size * 0.5, y: cy + size * 0.5},
        {x: cx - size * 0.6, y: cy + size},
        {x: cx + size * 0.6, y: cy + size},
        {x: cx + size * 0.5, y: cy + size * 0.5},
        {x: cx + size * 0.8, y: cy - size * 0.3},
        {x: cx + size * 0.3, y: cy - size}
      ];
      renderer.strokePoly(pts, color, 1.5, true);
      break;
    }
    case 'jewel': {
      // Diamond outline
      renderer.strokePoly([
        {x: cx, y: cy - size},
        {x: cx + size, y: cy - size * 0.2},
        {x: cx + size * 0.6, y: cy + size},
        {x: cx - size * 0.6, y: cy + size},
        {x: cx - size, y: cy - size * 0.2}
      ], color, 1.5, true);
      // Facet lines
      renderer.drawLine(cx - size, cy - size * 0.2, cx + size, cy - size * 0.2, color, 1.5);
      renderer.drawLine(cx - size * 0.5, cy - size * 0.2, cx, cy + size, color, 1.5);
      renderer.drawLine(cx + size * 0.5, cy - size * 0.2, cx, cy + size, color, 1.5);
      break;
    }
    case 'book': {
      // Spine
      renderer.drawLine(cx, cy - size * 0.8, cx, cy + size * 0.8, color, 1.5);
      // Left cover (approximated quadratic with line segments)
      renderer.strokePoly([
        {x: cx, y: cy - size * 0.8},
        {x: cx - size * 0.6, y: cy - size * 0.5},
        {x: cx - size, y: cy},
        {x: cx - size * 0.6, y: cy + size * 0.3},
        {x: cx, y: cy + size * 0.8}
      ], color, 1.5, false);
      // Right cover
      renderer.strokePoly([
        {x: cx, y: cy - size * 0.8},
        {x: cx + size * 0.6, y: cy - size * 0.5},
        {x: cx + size, y: cy},
        {x: cx + size * 0.6, y: cy + size * 0.3},
        {x: cx, y: cy + size * 0.8}
      ], color, 1.5, false);
      break;
    }
    case 'wine': {
      // Bottle shape
      renderer.strokePoly([
        {x: cx - size * 0.15, y: cy - size},
        {x: cx - size * 0.15, y: cy - size * 0.5},
        {x: cx - size * 0.4, y: cy},
        {x: cx - size * 0.4, y: cy + size * 0.7},
        {x: cx + size * 0.4, y: cy + size * 0.7},
        {x: cx + size * 0.4, y: cy},
        {x: cx + size * 0.15, y: cy - size * 0.5},
        {x: cx + size * 0.15, y: cy - size}
      ], color, 1.5, true);
      break;
    }
    case 'sculpture': {
      // Head circle
      const headR = size * 0.45;
      const steps = 12;
      const headPts = [];
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        headPts.push({ x: cx + Math.cos(a) * headR, y: (cy - size * 0.4) + Math.sin(a) * headR });
      }
      renderer.strokePoly(headPts, color, 1.5, true);
      // Body
      renderer.strokePoly([
        {x: cx - size * 0.6, y: cy + size},
        {x: cx - size * 0.25, y: cy + size * 0.15},
        {x: cx + size * 0.25, y: cy + size * 0.15},
        {x: cx + size * 0.6, y: cy + size}
      ], color, 1.5, false);
      break;
    }
    case 'watch': {
      // Outer circle
      const steps = 16;
      const makePts = (cx2, cy2, r) => Array.from({length: steps + 1}, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return { x: cx2 + Math.cos(a) * r, y: cy2 + Math.sin(a) * r };
      });
      renderer.strokePoly(makePts(cx, cy, size * 0.75), color, 1.5, true);
      renderer.strokePoly(makePts(cx, cy, size * 0.6), color, 1.5, true);
      // Hands
      renderer.drawLine(cx, cy, cx, cy - size * 0.45, color, 1.5);
      renderer.drawLine(cx, cy, cx + size * 0.3, cy, color, 1.5);
      // Crown
      renderer.drawLine(cx, cy - size * 0.75, cx, cy - size, color, 1.5);
      break;
    }
    case 'map': {
      // Rect border
      renderer.strokePoly([
        {x: cx - size * 0.8, y: cy - size * 0.7},
        {x: cx + size * 0.8, y: cy - size * 0.7},
        {x: cx + size * 0.8, y: cy + size * 0.7},
        {x: cx - size * 0.8, y: cy + size * 0.7}
      ], color, 1.5, true);
      // X marker
      const mx = cx - size * 0.15, my = cy;
      renderer.drawLine(mx - size * 0.2, my - size * 0.2, mx + size * 0.2, my + size * 0.2, color, 1.5);
      renderer.drawLine(mx + size * 0.2, my - size * 0.2, mx - size * 0.2, my + size * 0.2, color, 1.5);
      break;
    }
    case 'coin': {
      const steps = 16;
      const makePts = (r) => Array.from({length: steps + 1}, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      });
      renderer.strokePoly(makePts(size * 0.75), color, 1.5, true);
      renderer.strokePoly(makePts(size * 0.55), color, 1.5, true);
      // Dollar sign in center
      text.drawText('$', cx - size * 0.2, cy - size * 0.4, size * 0.7, color, 'center');
      break;
    }
    case 'music': {
      // Note head circle
      const headR = size * 0.3;
      const noteHX = cx - size * 0.2, noteHY = cy + size * 0.35;
      const steps = 10;
      const headPts = Array.from({length: steps + 1}, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return { x: noteHX + Math.cos(a) * headR, y: noteHY + Math.sin(a) * headR };
      });
      renderer.strokePoly(headPts, color, 1.5, true);
      // Stem
      const stemX = noteHX + headR;
      renderer.drawLine(stemX, noteHY, stemX, cy - size * 0.7, color, 1.5);
      // Flag (approximated with 2 lines)
      renderer.strokePoly([
        {x: stemX, y: cy - size * 0.7},
        {x: stemX + size * 0.7, y: cy - size * 0.4},
        {x: stemX, y: cy - size * 0.15}
      ], color, 1.5, false);
      break;
    }
  }
  renderer.setGlow(null);
}

function drawItemCard(renderer, text, item, x, y, w, h, showValue) {
  renderer.setGlow(item.category.color, 0.6);
  drawRoundRect(renderer, x, y, w, h, 8, PANEL, item.category.color, 2);
  renderer.setGlow(null);

  text.drawText(item.category.name.toUpperCase(), x + w / 2, y + 8, 10, item.category.color, 'center');

  drawIcon(renderer, text, x + w / 2, y + 55, 18, item.category.icon, item.category.color);

  // Item name (word wrap)
  const words = item.name.split(' ');
  let line = '', ly = y + 84;
  const maxW = w - 16;
  // Approximate char width for 11px font: ~7px per char
  for (let wi = 0; wi < words.length; wi++) {
    const test = line + (line ? ' ' : '') + words[wi];
    if (test.length * 7 > maxW && line) {
      text.drawText(line, x + w / 2, ly, 11, '#fff', 'center');
      line = words[wi]; ly += 13;
    } else line = test;
  }
  text.drawText(line, x + w / 2, ly, 11, '#fff', 'center');

  ly += 18;
  text.drawText('Est. Value', x + w / 2, ly, 9, '#888', 'center');
  ly += 12;
  text.drawText('$' + item.estLow + ' - $' + item.estHigh, x + w / 2, ly, 11, GOLD, 'center');

  if (showValue) {
    ly += 16;
    text.drawText('TRUE: $' + item.trueValue, x + w / 2, ly, 12, '#4f4', 'center');
  }
}

function drawButton(renderer, text, btn, hover, disabled) {
  const col = disabled ? '#444' : (hover ? '#fc2' : GOLD);
  const fillCol = disabled ? '#222' : (hover ? PANEL_LIGHT : PANEL);
  const sw = hover && !disabled ? 2 : 1;
  if (hover && !disabled) renderer.setGlow(GOLD, 0.5);
  drawRoundRect(renderer, btn.x, btn.y, btn.w, btn.h, 4, fillCol, col, sw);
  if (hover && !disabled) renderer.setGlow(null);
  text.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 - 6, 11, col, 'center');
}

function drawPlayerPanel(renderer, text, p, idx, x, y, w, h) {
  const isCurrent = (currentBidder === idx);
  const fillCol = isCurrent ? withAlpha('#ffaa00', 0.08) : PANEL;
  const strokeCol = isCurrent ? GOLD : (p.passed ? '#333' : p.color);
  const sw = isCurrent ? 2 : 1;
  if (isCurrent) renderer.setGlow(GOLD, 0.4);
  drawRoundRect(renderer, x, y, w, h, 4, fillCol, strokeCol, sw);
  if (isCurrent) renderer.setGlow(null);

  const nameCol = p.passed ? '#555' : p.color;
  text.drawText(p.isHuman ? 'YOU' : p.name, x + 6, y + 3, 10, nameCol, 'left');

  const budgetCol = p.passed ? '#444' : '#aaa';
  text.drawText('$' + p.budget, x + 6, y + 16, 9, budgetCol, 'left');

  text.drawText(p.items.length + ' items', x + w - 6, y + 3, 9, p.passed ? '#444' : '#666', 'right');

  if (p.passed && auctionPhase === 'bidding') {
    text.drawText('PASSED', x + w - 6, y + 16, 9, '#644', 'right');
  } else if (isCurrent) {
    text.drawText('LEADING', x + w - 6, y + 16, 9, GOLD, 'right');
  }
}

function drawCollection(renderer, text) {
  const y0 = 440;
  text.drawText('YOUR COLLECTION:', 15, y0 - 10, 9, '#666', 'left');
  const items = players[0].items;
  if (items.length === 0) {
    text.drawText('No items yet', 15, y0 + 4, 9, '#444', 'left');
  } else {
    const maxShow = Math.min(items.length, 10);
    for (let i = 0; i < maxShow; i++) {
      const ix = 15 + i * 46;
      drawRoundRect(renderer, ix, y0 + 4, 42, 42, 3, PANEL, items[i].category.color, 1);
      drawIcon(renderer, text, ix + 21, y0 + 22, 10, items[i].category.icon, items[i].category.color);
      text.drawText('$' + items[i].pricePaid, ix + 21, y0 + 36, 7, '#888', 'center');
    }
    if (items.length > 10) {
      text.drawText('+' + (items.length - 10), 15 + 10 * 46, y0 + 16, 9, '#666', 'left');
    }
  }
  text.drawText('Budget:', W - 90, y0 - 10, 10, '#888', 'right');
  const budgetCol = players[0].budget < 1000 ? '#f44' : GOLD;
  text.drawText('$' + players[0].budget, W - 15, y0 + 2, 12, budgetCol, 'right');
  text.drawText('Spent: $' + players[0].totalSpent, W - 15, y0 + 16, 9, '#666', 'right');
}

function drawMessages(renderer, text) {
  const mx = 15, my = 200;
  for (let i = 0; i < messageLog.length; i++) {
    const msg = messageLog[i];
    const alpha = Math.min(1, msg.time / 80);
    text.drawText(msg.text, mx, my + i * 12, 9, withAlpha('#aaaaaa', alpha), 'left');
  }
}

function drawSparkles(renderer) {
  for (let i = 0; i < sparkles.length; i++) {
    const s = sparkles[i];
    const alpha = s.life / s.maxLife;
    renderer.setGlow(GOLD, 0.5);
    renderer.fillRect(s.x - 2, s.y - 2, 4, 4, withAlpha('#ffaa00', alpha));
    renderer.setGlow(null);
  }
}

function drawResults(renderer, text) {
  renderer.setGlow(GOLD, 0.8);
  text.drawText('AUCTION RESULTS', W / 2, 12, 24, GOLD, 'center');
  renderer.setGlow(null);

  const sorted = [...players].sort((a, b) => b.profit - a.profit);
  const startY = 55, rowH = 62;

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i], y = startY + i * rowH, isP = p.isHuman;
    const fillCol = isP ? withAlpha('#ffaa00', 0.08) : PANEL;
    const strokeCol = isP ? GOLD : (i === 0 ? '#fd4' : '#333');
    const sw = isP ? 2 : 1;
    drawRoundRect(renderer, 20, y, W - 40, rowH - 5, 6, fillCol, strokeCol, sw);

    const rankCol = i === 0 ? '#fd4' : '#888';
    text.drawText('#' + (i + 1), 32, y + 6, 16, rankCol, 'left');

    text.drawText(p.name, 70, y + 4, 12, p.color, 'left');

    if (!p.isHuman) {
      text.drawText('(' + p.strategy + ')', 70, y + 18, 9, '#555', 'left');
    }

    text.drawText(p.items.length + ' items won', 70, y + 34, 9, '#888', 'left');

    text.drawText('Spent: $' + p.totalSpent, W - 180, y + 6, 9, '#aaa', 'right');
    text.drawText('Value: $' + p.totalValue, W - 180, y + 20, 9, '#aaa', 'right');

    const profitCol = p.profit >= 0 ? '#4f4' : '#f44';
    const profitStr = (p.profit >= 0 ? '+' : '') + '$' + p.profit;
    text.drawText(profitStr, W - 35, y + 15, 14, profitCol, 'right');

    if (i === 0) {
      text.drawText('\u2605', W - 35, y + 38, 16, '#fd4', 'right');
    }

    // Item icons for this player
    const iconStartX = 200;
    for (let j = 0; j < p.items.length && j < 7; j++) {
      drawIcon(renderer, text, iconStartX + j * 26, y + 46, 6, p.items[j].category.icon, p.items[j].category.color);
    }
  }

  const unsold = allItems.filter(it => it.winner === -1);
  if (unsold.length > 0) {
    const uy = startY + sorted.length * rowH + 5;
    const names = unsold.map(u => u.name).join(', ');
    text.drawText('Unsold: ' + names, 25, uy, 10, '#555', 'left');
  }

  const pulsed = 0.5 + Math.sin(animTimer * 0.05) * 0.3;
  text.drawText('Click to Play Again', W / 2, H - 25, 12, withAlpha('#ffaa00', pulsed), 'center');
}

export function createGame() {
  bestScore = parseInt(localStorage.getItem('auctionHouseBest') || '0');
  const bestEl = document.getElementById('best');
  if (bestEl) bestEl.textContent = '$' + bestScore;

  const game = new Game('game');
  const canvasEl = document.getElementById('game');

  // Mouse tracking
  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    pendingMoves.push({ x: mouseX, y: mouseY });
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    pendingClicks.push({ x: cx, y: cy });
  });

  game.onInit = () => {
    score = 0;
    auctionPhase = 'idle';
    messageLog = [];
    sparkles = [];
    pendingClicks = [];
    pendingMoves = [];
    animTimer = 0;
    hoverBtn = -1;
    game.showOverlay('AUCTION HOUSE', 'Click to start bidding');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // Process mouse moves for hover
    for (const mv of pendingMoves) {
      hoverBtn = -1;
      if (auctionPhase === 'bidding' && !players[0].passed) {
        for (let i = 0; i < bidButtons.length; i++) {
          const b = bidButtons[i];
          if (mv.x >= b.x && mv.x <= b.x + b.w && mv.y >= b.y && mv.y <= b.y + b.h) hoverBtn = i;
        }
        for (let i = 0; i < quickBidButtons.length; i++) {
          const b = quickBidButtons[i];
          if (mv.x >= b.x && mv.x <= b.x + b.w && mv.y >= b.y && mv.y <= b.y + b.h) hoverBtn = 100 + i;
        }
      }
    }
    pendingMoves = [];

    // Process clicks
    for (const click of pendingClicks) {
      const cx = click.x, cy = click.y;
      if (game.state === 'waiting') {
        game.hideOverlay();
        game.setState('playing');
        initGame(game);
        break;
      }
      if (game.state === 'over') {
        if (auctionPhase === 'results') {
          game.setState('playing');
          initGame(game);
        }
        break;
      }
      if (auctionPhase === 'bidding' && !players[0].passed) {
        const b0 = bidButtons[0];
        if (cx >= b0.x && cx <= b0.x + b0.w && cy >= b0.y && cy <= b0.y + b0.h) { playerBid(); break; }
        const b1 = bidButtons[1];
        if (cx >= b1.x && cx <= b1.x + b1.w && cy >= b1.y && cy <= b1.y + b1.h) { playerPass(); break; }
        for (let i = 0; i < quickBidButtons.length; i++) {
          const qb = quickBidButtons[i];
          if (cx >= qb.x && cx <= qb.x + qb.w && cy >= qb.y && cy <= qb.y + qb.h) {
            playerBidAmount += qb.value; break;
          }
        }
      }
    }
    pendingClicks = [];

    // Update animation timer
    animTimer++;

    // Message log decay
    for (let i = messageLog.length - 1; i >= 0; i--) {
      messageLog[i].time--;
      if (messageLog[i].time <= 0) messageLog.splice(i, 1);
    }

    // Sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].x += sparkles[i].vx;
      sparkles[i].y += sparkles[i].vy;
      sparkles[i].vy += 0.05;
      sparkles[i].life--;
      if (sparkles[i].life <= 0) sparkles.splice(i, 1);
    }

    if (game.state !== 'playing') return;

    // Show item phase
    if (auctionPhase === 'showing') {
      showItemTimer--;
      if (showItemTimer <= 0) {
        auctionPhase = 'bidding';
        respondedToBid = new Set();
        scheduleResponses();
      }
    }

    // AI action timer
    if (auctionPhase === 'bidding' && nextAiIdx >= 0) {
      aiActionTimer--;
      if (aiActionTimer <= 0) {
        const idx = nextAiIdx;
        nextAiIdx = -1;
        aiDecide(idx);
      }
    }

    // Gavel countdown
    if (gaveled && nextAiIdx < 0) {
      gavelTimer--;
      if (gavelTimer <= 0) {
        gavelCount++;
        if (gavelCount >= 3) sellItem();
        else gavelTimer = 40;
      }
    }

    // Sold animation
    if (auctionPhase === 'sold') {
      soldAnim--;
      if (soldAnim <= 0) startNextRound();
    }

    // Sync score display for 'over' state
    if (auctionPhase === 'results' && game.state !== 'over') {
      game.setState('over');
    }
  };

  game.onDraw = (renderer, text) => {
    // Background is handled by renderer.begin() with default BG

    if (auctionPhase === 'results') {
      drawResults(renderer, text);
      return;
    }

    if (auctionPhase === 'idle') return;

    // Item card (left side)
    if (currentItem) {
      drawItemCard(renderer, text, currentItem, 15, 10, 160, 165,
        auctionPhase === 'sold' && currentItem.winner >= 0);
    }

    // Round info
    text.drawText('Round ' + round + '/' + totalRounds, 20, 182, 10, '#666', 'left');

    // Bidding display (center/right)
    if (auctionPhase === 'showing' || auctionPhase === 'bidding') {
      renderer.setGlow(GOLD, 0.8);
      text.drawText('$' + currentBid, 380, 16, 28, GOLD, 'center');
      renderer.setGlow(null);

      if (currentBidder >= 0) {
        text.drawText('Current bid by ' + players[currentBidder].name, 380, 52, 11, '#888', 'center');
      } else {
        text.drawText('Starting bid', 380, 52, 11, '#888', 'center');
      }

      if (gaveled) {
        const pa = 0.5 + Math.sin(animTimer * 0.15) * 0.3;
        const gt = gavelCount === 0 ? 'Going once...' : gavelCount === 1 ? 'Going twice...' : 'SOLD!';
        text.drawText(gt, 380, 74, 14, withAlpha('#ffaa00', pa), 'center');
      }

      if (auctionPhase === 'showing') {
        text.drawText('Presenting next item...', 380, 74, 11, withAlpha('#ffaa00', 0.5), 'center');
      }
    }

    // Sold overlay
    if (auctionPhase === 'sold' && soldAnim > 0) {
      const alpha = Math.min(1, soldAnim / 30);
      if (currentItem.winner >= 0) {
        renderer.setGlow(GOLD, 0.8);
        text.drawText('SOLD!', 380, 22, 22, withAlpha('#ffaa00', alpha), 'center');
        renderer.setGlow(null);
        text.drawText('to ' + players[currentItem.winner].name + ' for $' + currentItem.winBid, 380, 48, 12, withAlpha('#ffffff', alpha), 'center');
        const profitOnItem = currentItem.trueValue - currentItem.winBid;
        const profitCol = profitOnItem >= 0 ? withAlpha('#50ff50', alpha) : withAlpha('#ff5050', alpha);
        text.drawText('True Value: $' + currentItem.trueValue + ' (' + (profitOnItem >= 0 ? '+' : '') + profitOnItem + ')', 380, 68, 11, profitCol, 'center');
      } else {
        text.drawText('NO SALE', 380, 38, 18, withAlpha('#969696', alpha), 'center');
      }
    }

    // Player panels
    const panelX = 195, panelW = 390, panelRowH = 34;
    for (let i = 0; i < players.length; i++) {
      const px = panelX + (i % 2) * (panelW / 2 + 5);
      const py = 96 + Math.floor(i / 2) * (panelRowH + 4);
      drawPlayerPanel(renderer, text, players[i], i, px, py, panelW / 2 - 5, panelRowH);
    }

    // Bid controls
    if (auctionPhase === 'bidding' && !players[0].passed) {
      drawRoundRect(renderer, 392, 325, 200, 115, 6, withAlpha('#16213e', 0.6), '#333', 1);

      text.drawText('Your bid:', 400, 335, 10, '#aaa', 'left');
      const bidCol = playerBidAmount > players[0].budget ? '#f44' : GOLD;
      text.drawText('$' + playerBidAmount, 470, 335, 14, bidCol, 'left');

      for (let i = 0; i < quickBidButtons.length; i++) {
        drawButton(renderer, text, quickBidButtons[i], hoverBtn === 100 + i, false);
      }
      const canBid = playerBidAmount <= players[0].budget && (playerBidAmount > currentBid || currentBidder === -1);
      drawButton(renderer, text, bidButtons[0], hoverBtn === 0, !canBid);
      drawButton(renderer, text, bidButtons[1], hoverBtn === 1, false);

      if (waitingForHuman) {
        const pulsed = 0.5 + Math.sin(animTimer * 0.1) * 0.3;
        text.drawText('Your turn to respond!', 492, 308, 9, withAlpha('#ffaa00', pulsed), 'center');
      }
    } else if (auctionPhase === 'bidding' && players[0].passed) {
      text.drawText('You passed. Watching...', 490, 375, 11, '#555', 'center');
    }

    drawCollection(renderer, text);
    drawMessages(renderer, text);
    drawSparkles(renderer);
  };

  game.start();
  return game;
}
