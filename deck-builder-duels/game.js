// deck-builder-duels/game.js — Deck Builder Duels ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600;
const H = 600;

// ── Theme ──
const THEME = '#b266ff';
const CARD_COLORS = {
  treasure: '#ffd700',
  victory: '#40c040',
  action: '#4488ff',
  attack: '#ff5555',
  defense: '#44ccaa'
};

// ── Card definitions ──
const CARD_DEFS = {
  copper:     { name: 'Copper',    type: 'treasure', cost: 0, coins: 1, vp: 0,  desc: '+1 Coin' },
  estate:     { name: 'Estate',    type: 'victory',  cost: 2, coins: 0, vp: 1,  desc: '+1 VP' },
  silver:     { name: 'Silver',    type: 'treasure', cost: 3, coins: 2, vp: 0,  desc: '+2 Coins' },
  gold:       { name: 'Gold',      type: 'treasure', cost: 6, coins: 3, vp: 0,  desc: '+3 Coins' },
  duchy:      { name: 'Duchy',     type: 'victory',  cost: 5, coins: 0, vp: 3,  desc: '+3 VP' },
  province:   { name: 'Province',  type: 'victory',  cost: 8, coins: 0, vp: 6,  desc: '+6 VP' },
  smithy:     { name: 'Smithy',    type: 'action',   cost: 4, coins: 0, vp: 0,  desc: '+3 Cards',        cards: 3, actions: 0, extraCoins: 0 },
  village:    { name: 'Village',   type: 'action',   cost: 3, coins: 0, vp: 0,  desc: '+1 Card +2 Act',  cards: 1, actions: 2, extraCoins: 0 },
  market:     { name: 'Market',    type: 'action',   cost: 5, coins: 0, vp: 0,  desc: '+1 Card +1A +1$', cards: 1, actions: 1, extraCoins: 1, extraBuys: 1 },
  festival:   { name: 'Festival',  type: 'action',   cost: 5, coins: 0, vp: 0,  desc: '+2 Act +2$',      cards: 0, actions: 2, extraCoins: 2, extraBuys: 1 },
  laboratory: { name: 'Lab',       type: 'action',   cost: 5, coins: 0, vp: 0,  desc: '+2 Cards +1 Act', cards: 2, actions: 1, extraCoins: 0 },
  woodcutter: { name: 'Woodcut',   type: 'action',   cost: 3, coins: 0, vp: 0,  desc: '+2 Coins',        cards: 0, actions: 0, extraCoins: 2 },
  militia:    { name: 'Militia',   type: 'attack',   cost: 4, coins: 0, vp: 0,  desc: '+2$ Opp->3',      cards: 0, actions: 0, extraCoins: 2, attackType: 'discard' },
  witch:      { name: 'Witch',     type: 'attack',   cost: 5, coins: 0, vp: 0,  desc: '+2 Cards Curse',  cards: 2, actions: 0, extraCoins: 0, attackType: 'curse' },
  moat:       { name: 'Moat',      type: 'defense',  cost: 2, coins: 0, vp: 0,  desc: '+2 Cards Block',  cards: 2, actions: 0, extraCoins: 0, blocks: true },
  curse:      { name: 'Curse',     type: 'victory',  cost: 0, coins: 0, vp: -1, desc: '-1 VP' }
};

// ── Card layout constants ──
const CARD_W = 56;
const CARD_H = 52;
const MCARD_W = 62;
const MCARD_H = 62;

// ── Score DOM elements ──
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// ── Persistent score ──
let bestScore = parseInt(localStorage.getItem('deckBuilderDuelsBest') || '0');

// ── Game state (all module-level so game logic fns can share them) ──
let supply = {};
let players = [];
let currentPlayer = 0;
let turnPhase = 'action';
let turnActions = 1;
let turnBuys = 1;
let turnCoins = 0;
let turnNumber = 0;
let logMessages = [];
let hoveredArea = null;
let animFrame = 0;
let aiThinking = false;
let aiTimer = 0;
let statusMsg = '';
const VIEW = { MAIN: 0, MARKET: 1 };
let currentView = VIEW.MAIN;
let score = 0;

// ── Click area registry (rebuilt each draw frame) ──
let clickAreas = [];

// ── Pending input (queued from DOM listeners, consumed in onUpdate) ──
let pendingClicks = [];
let pendingMoves  = [];

// ── Module-level game reference (set in createGame) ──
let _game = null;

// ===================== SUPPLY =====================

function createSupply() {
  return {
    copper: 46, silver: 40, gold: 30,
    estate: 8,  duchy: 8,  province: 8,
    smithy: 10, village: 10, market: 10,
    festival: 10, laboratory: 10, woodcutter: 10,
    militia: 10, witch: 10, moat: 10,
    curse: 10
  };
}

// ===================== PLAYER =====================

function createPlayer(name, isAI) {
  const deck = [];
  for (let i = 0; i < 7; i++) deck.push('copper');
  for (let i = 0; i < 3; i++) deck.push('estate');
  shuffle(deck);
  const hand = deck.splice(0, 5);
  return { name, isAI, deck, hand, discard: [], playArea: [] };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCards(player, n) {
  for (let i = 0; i < n; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle([...player.discard]);
      player.discard = [];
    }
    player.hand.push(player.deck.pop());
  }
}

function calcVP(player) {
  let vp = 0;
  const all = [...player.deck, ...player.hand, ...player.discard, ...player.playArea];
  for (const c of all) vp += CARD_DEFS[c].vp;
  return vp;
}

function countAllCards(player) {
  return player.deck.length + player.hand.length + player.discard.length + player.playArea.length;
}

function hasDefense(player) {
  return player.hand.includes('moat');
}

// ===================== GAME INIT =====================

function initGame() {
  supply = createSupply();
  players = [createPlayer('You', false), createPlayer('AI', true)];
  currentPlayer = 0;
  turnPhase = 'action';
  turnActions = 1;
  turnBuys = 1;
  turnCoins = 0;
  turnNumber = 1;
  logMessages = [];
  hoveredArea = null;
  currentView = VIEW.MAIN;
  aiThinking = false;
  statusMsg = 'Your turn - Action Phase';
  score = 0;
  addLog('Game started! Turn 1');
  updateScore();
}

function addLog(msg) {
  logMessages.push(msg);
  if (logMessages.length > 60) logMessages.shift();
}

function updateScore() {
  if (!players.length) return;
  score = calcVP(players[0]);
  scoreEl.textContent = score;
}

// ===================== TURN LOGIC =====================

function startTurn() {
  turnActions = 1;
  turnBuys = 1;
  turnCoins = 0;
  turnPhase = 'action';
  const p = players[currentPlayer];
  const hasActs = p.hand.some(c => {
    const d = CARD_DEFS[c];
    return d.type === 'action' || d.type === 'attack' || d.type === 'defense';
  });
  if (!hasActs) turnPhase = 'buy';

  if (currentPlayer === 0) {
    statusMsg = turnPhase === 'action' ? 'Your turn - Action Phase' : 'Your turn - Buy Phase';
    addLog('--- Turn ' + turnNumber + ' (You) ---');
  } else {
    statusMsg = 'AI is thinking...';
    addLog('--- Turn ' + turnNumber + ' (AI) ---');
    aiThinking = true;
    aiTimer = 35;
  }
}

function playAction(player, handIdx) {
  const cardId = player.hand[handIdx];
  const def = CARD_DEFS[cardId];
  if (def.type !== 'action' && def.type !== 'attack' && def.type !== 'defense') return false;
  if (turnActions <= 0) return false;

  player.hand.splice(handIdx, 1);
  player.playArea.push(cardId);
  turnActions--;
  turnActions += (def.actions || 0);
  turnCoins   += (def.extraCoins || 0);
  turnBuys    += (def.extraBuys || 0);
  if (def.cards) drawCards(player, def.cards);

  addLog(player.name + ' plays ' + def.name);

  if (def.type === 'attack') {
    for (let i = 0; i < players.length; i++) {
      if (i === currentPlayer) continue;
      const target = players[i];
      if (hasDefense(target)) {
        addLog(target.name + ' blocks with Moat!');
        continue;
      }
      if (def.attackType === 'discard') {
        while (target.hand.length > 3) {
          const worstIdx = pickWorstCard(target);
          const disc = target.hand.splice(worstIdx, 1)[0];
          target.discard.push(disc);
          addLog(target.name + ' discards ' + CARD_DEFS[disc].name);
        }
      } else if (def.attackType === 'curse') {
        if (supply.curse > 0) {
          supply.curse--;
          target.discard.push('curse');
          addLog(target.name + ' gains a Curse!');
        }
      }
    }
  }

  if (turnActions <= 0 || !player.hand.some(c => {
    const d = CARD_DEFS[c];
    return d.type === 'action' || d.type === 'attack' || d.type === 'defense';
  })) {
    turnPhase = 'buy';
    if (currentPlayer === 0) statusMsg = 'Your turn - Buy Phase';
  }

  return true;
}

function pickWorstCard(player) {
  let worstIdx = 0, worstScore = 999;
  for (let i = 0; i < player.hand.length; i++) {
    const cid = player.hand[i];
    const def = CARD_DEFS[cid];
    let s = def.cost;
    if (def.type === 'action' || def.type === 'attack') s += 5;
    if (def.type === 'defense') s += 4;
    if (cid === 'curse')   s = -10;
    if (cid === 'copper')  s = 0;
    if (cid === 'estate')  s = 1;
    if (def.type === 'treasure') s += def.coins * 2;
    if (s < worstScore) { worstScore = s; worstIdx = i; }
  }
  return worstIdx;
}

function playAllTreasures(player) {
  let total = 0;
  for (let i = player.hand.length - 1; i >= 0; i--) {
    if (CARD_DEFS[player.hand[i]].type === 'treasure') {
      turnCoins += CARD_DEFS[player.hand[i]].coins;
      total     += CARD_DEFS[player.hand[i]].coins;
      player.playArea.push(player.hand[i]);
      player.hand.splice(i, 1);
    }
  }
  if (total > 0) addLog(player.name + ' plays treasures (+' + total + ' coins)');
}

function buyCard(cardId) {
  const def = CARD_DEFS[cardId];
  if (turnBuys <= 0 || supply[cardId] <= 0 || turnCoins < def.cost) return false;
  supply[cardId]--;
  turnCoins -= def.cost;
  turnBuys--;
  players[currentPlayer].discard.push(cardId);
  addLog(players[currentPlayer].name + ' buys ' + def.name);
  updateScore();
  return true;
}

function endTurn() {
  const p = players[currentPlayer];
  p.discard.push(...p.hand, ...p.playArea);
  p.hand = [];
  p.playArea = [];
  drawCards(p, 5);

  if (checkGameEnd()) { doEndGame(); return; }

  currentPlayer = (currentPlayer + 1) % players.length;
  if (currentPlayer === 0) turnNumber++;
  startTurn();
}

function checkGameEnd() {
  if (supply.province <= 0) return true;
  let empty = 0;
  for (const k of Object.keys(supply)) { if (supply[k] <= 0) empty++; }
  return empty >= 3;
}

function doEndGame() {
  const p0vp = calcVP(players[0]);
  const p1vp = calcVP(players[1]);
  score = p0vp;
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('deckBuilderDuelsBest', String(bestScore));
  }
  const result = p0vp > p1vp ? 'You Win!' : (p0vp < p1vp ? 'AI Wins!' : 'Tie!');
  if (_game) {
    _game.setState('over');
    _game.showOverlay(result, 'You: ' + p0vp + ' VP | AI: ' + p1vp + ' VP | Click to play again');
  }
}

// ===================== AI =====================

function aiCardValue(cardId) {
  const totalCards = countAllCards(players[1]);
  const lateGame  = supply.province <= 4;
  const veryLate  = supply.province <= 2;
  if (cardId === 'province')   return 100;
  if (cardId === 'gold')       return 55;
  if (cardId === 'duchy')      return lateGame ? 50 : 5;
  if (cardId === 'estate')     return veryLate ? 20 : -5;
  if (cardId === 'silver')     return totalCards < 15 ? 35 : 25;
  if (cardId === 'laboratory') return 48;
  if (cardId === 'witch')      return supply.curse > 0 ? 46 : 15;
  if (cardId === 'market')     return 44;
  if (cardId === 'festival')   return 42;
  if (cardId === 'smithy')     return totalCards < 18 ? 38 : 28;
  if (cardId === 'village')    return 30;
  if (cardId === 'militia')    return 35;
  if (cardId === 'moat')       return 22;
  if (cardId === 'woodcutter') return 16;
  if (cardId === 'copper')     return -10;
  if (cardId === 'curse')      return -50;
  return 0;
}

function aiTurn() {
  const p = players[currentPlayer];

  // Action phase
  if (turnPhase === 'action') {
    let played = true;
    while (played && turnActions > 0) {
      played = false;
      let bestIdx = -1, bestVal = -1;
      for (let i = 0; i < p.hand.length; i++) {
        const d = CARD_DEFS[p.hand[i]];
        if (d.type === 'action' || d.type === 'attack' || d.type === 'defense') {
          let val = aiCardValue(p.hand[i]);
          if (turnActions === 1 && (d.actions || 0) > 0) val += 10;
          if (turnActions === 1 && (d.actions || 0) === 0) val -= 5;
          if (val > bestVal) { bestVal = val; bestIdx = i; }
        }
      }
      if (bestIdx >= 0) { playAction(p, bestIdx); played = true; }
    }
    turnPhase = 'buy';
  }

  // Buy phase
  playAllTreasures(p);
  let bought = true;
  while (bought && turnBuys > 0) {
    bought = false;
    let bestCard = null, bestVal = -999;
    for (const k of Object.keys(supply)) {
      if (supply[k] <= 0 || CARD_DEFS[k].cost > turnCoins) continue;
      if (k === 'curse' || k === 'copper') continue;
      const val = aiCardValue(k);
      if (CARD_DEFS[k].type === 'victory' && k !== 'province' && supply.province > 4) continue;
      if (val > bestVal) { bestVal = val; bestCard = k; }
    }
    if (bestCard && bestVal > 0) { buyCard(bestCard); bought = true; }
    else break;
  }

  endTurn();
}

// ===================== CLICK AREA HELPERS =====================

function addClickArea(id, x, y, w, h, data) {
  clickAreas.push({ id, x, y, w, h, data });
}

function getAreaAt(mx, my) {
  for (let i = clickAreas.length - 1; i >= 0; i--) {
    const a = clickAreas[i];
    if (mx >= a.x && mx <= a.x + a.w && my >= a.y && my <= a.y + a.h) return a;
  }
  return null;
}

// ===================== DRAWING HELPERS =====================

// Encode a CSS color with an alpha multiplier → rgba string
function withAlpha(hexColor, alpha) {
  const hex = hexColor.replace('#', '');
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0], 16) * 17;
    g = parseInt(hex[1], 16) * 17;
    b = parseInt(hex[2], 16) * 17;
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

// Build a rounded-rectangle polygon (8 vertices, 90-degree corners approximated as chamfers)
function roundRectPoly(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return [
    { x: x + r,     y: y         },
    { x: x + w - r, y: y         },
    { x: x + w,     y: y + r     },
    { x: x + w,     y: y + h - r },
    { x: x + w - r, y: y + h     },
    { x: x + r,     y: y + h     },
    { x: x,         y: y + h - r },
    { x: x,         y: y + r     }
  ];
}

function drawRoundedRect(renderer, x, y, w, h, r, fillColor, strokeColor, strokeWidth) {
  const pts = roundRectPoly(x, y, w, h, r);
  renderer.fillPoly(pts, fillColor);
  if (strokeColor) renderer.strokePoly(pts, strokeColor, strokeWidth || 1.2, true);
}

// Small circle as a polygon (for coin outline)
function circlePoly(cx, cy, r, segs) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// Draw a single card at (x,y) with size (w,h)
function drawCardRect(renderer, text, x, y, w, h, cardId, highlighted, dimmed) {
  const def = CARD_DEFS[cardId];
  const tc = CARD_COLORS[def.type] || '#888888';

  if (highlighted) renderer.setGlow(tc, 0.8);

  // Background + border
  const bgColor     = dimmed ? '#181828' : '#252540';
  const borderColor = highlighted ? '#ffffff' : (dimmed ? '#333333' : tc);
  drawRoundedRect(renderer, x, y, w, h, 5, bgColor, borderColor, highlighted ? 2.5 : 1.2);

  if (highlighted) renderer.setGlow(null);

  // Top color bar
  const barAlpha = dimmed ? 0.2 : 0.75;
  renderer.fillPoly(roundRectPoly(x + 2, y + 2, w - 4, 14, 3), withAlpha(tc, barAlpha));

  // Card name
  text.drawText(def.name, x + w / 2, y + 3, 8, dimmed ? '#555555' : '#ffffff', 'center');

  // Cost coin
  renderer.fillCircle(x + 11, y + 25, 7, dimmed ? '#222222' : '#1a1a2e');
  renderer.strokePoly(circlePoly(x + 11, y + 25, 7, 12), dimmed ? '#444444' : '#ffd700', 1, true);
  // center text vertically: size=9, approximate half-height ~4px
  text.drawText(String(def.cost), x + 11, y + 25 - 4, 9, dimmed ? '#555555' : '#ffd700', 'center');

  // VP / coin indicator (top-right of card)
  if (def.vp !== 0) {
    const vpColor = def.vp > 0 ? '#40c040' : '#ff4444';
    text.drawText((def.vp > 0 ? '+' : '') + def.vp + 'VP', x + w - 3, y + 25 - 4, 9, vpColor, 'right');
  }
  if (def.coins > 0) {
    text.drawText('+' + def.coins + '$', x + w - 3, y + 25 - 4, 9, '#ffd700', 'right');
  }

  // Effect text — word-wrap into ≤2 lines of ~10 chars
  const descColor = dimmed ? '#444444' : '#bbbbbb';
  const words = def.desc.split(' ');
  let l1 = '', l2 = '';
  for (const wd of words) {
    if ((l1 + ' ' + wd).trim().length <= 10) l1 = (l1 + ' ' + wd).trim();
    else l2 = (l2 + ' ' + wd).trim();
  }
  text.drawText(l1, x + w / 2, y + h - 20, 7, descColor, 'center');
  if (l2) text.drawText(l2, x + w / 2, y + h - 11, 7, descColor, 'center');

  // Supply count badge (only visible in market view)
  if (supply[cardId] !== undefined && currentView === VIEW.MARKET) {
    const cnt = supply[cardId];
    renderer.fillCircle(x + w - 9, y + h - 9, 8, cnt > 0 ? '#b266ff' : '#662222');
    text.drawText(String(cnt), x + w - 9, y + h - 9 - 4, 8, '#ffffff', 'center');
  }
}

// Draw a clickable button
function drawBtn(renderer, text, x, y, w, h, label, hovered, color) {
  if (hovered) renderer.setGlow(color, 0.7);
  drawRoundedRect(renderer, x, y, w, h, 4,
    hovered ? color : '#252540',
    color,
    hovered ? 2 : 1
  );
  if (hovered) renderer.setGlow(null);
  // Vertically centre text: size=10, approx half-height ~5px
  text.drawText(label, x + w / 2, y + h / 2 - 5, 10, hovered ? '#1a1a2e' : color, 'center');
}

// ===================== RENDER: MAIN VIEW =====================

function renderMain(renderer, text) {
  const p  = players[0];
  const ai = players[1];

  // --- AI info row ---
  text.drawText(
    'AI: ' + ai.hand.length + ' hand | ' + ai.deck.length + ' deck | ' +
    ai.discard.length + ' disc | ' + calcVP(ai) + ' VP',
    10, 6, 10, '#666666', 'left'
  );

  // --- Supply mini-bar ---
  text.drawText('SUPPLY:', 10, 25, 9, THEME, 'left');

  const supplyKeys = [
    'copper','silver','gold',
    'estate','duchy','province',
    'smithy','village','market','festival','laboratory','woodcutter',
    'militia','witch','moat','curse'
  ];
  const pw = 31, pgap = 1;
  for (let i = 0; i < supplyKeys.length; i++) {
    const sx = 65 + i * (pw + pgap);
    const sy = 26;
    const sk = supplyKeys[i];
    const col = CARD_COLORS[CARD_DEFS[sk].type] || '#888888';
    renderer.fillRect(sx, sy, pw, 12, supply[sk] > 0 ? withAlpha(col, 0.6) : withAlpha('#333333', 0.2));
    text.drawText(String(supply[sk]), sx + pw / 2, sy + 1, 7,
      supply[sk] > 0 ? '#ffffff' : '#555555', 'center');
  }

  // --- Market button ---
  const mhov = hoveredArea && hoveredArea.id === 'marketBtn';
  drawBtn(renderer, text, 10, 44, 100, 20, 'OPEN MARKET', mhov, THEME);
  addClickArea('marketBtn', 10, 44, 100, 20, {});

  // --- Turn info bar ---
  renderer.fillRect(0, 70, W, 28, '#1e1e38');
  renderer.drawLine(0, 70,  W, 70,  '#333333', 0.5);
  renderer.drawLine(0, 98,  W, 98,  '#333333', 0.5);
  text.drawText('Turn ' + turnNumber, 10, 76, 11, THEME, 'left');
  text.drawText(statusMsg, W / 2, 77, 10, '#cccccc', 'center');
  text.drawText('Act:' + turnActions, W - 160, 77, 10, '#4488ff', 'right');
  text.drawText('$'   + turnCoins,   W - 90,  77, 10, '#ffd700', 'right');
  text.drawText('Buy:' + turnBuys,   W - 15,  77, 10, '#40c040', 'right');

  // --- Play area ---
  renderer.fillRect(5, 103, W - 10, 90, '#1a1a30');
  renderer.drawLine(5, 103, W - 5, 103, '#2a2a44', 0.5);
  renderer.drawLine(5, 193, W - 5, 193, '#2a2a44', 0.5);
  text.drawText('PLAYED THIS TURN', 12, 105, 8, '#555555', 'left');

  const pa = players[0].playArea;
  if (pa.length > 0) {
    const maxVis = Math.min(pa.length, 9);
    const gap = Math.min(CARD_W + 4, (W - 20) / maxVis);
    for (let i = 0; i < maxVis; i++) {
      drawCardRect(renderer, text, 10 + i * gap, 118, CARD_W, CARD_H - 4, pa[i], false, false);
    }
  }

  // --- Log panel ---
  renderer.fillRect(5, 198, W - 10, 75, '#171728');
  renderer.drawLine(5, 198, W - 5, 198, '#252540', 0.5);
  renderer.drawLine(5, 273, W - 5, 273, '#252540', 0.5);
  text.drawText('LOG', 12, 200, 8, '#555555', 'left');

  const logs = logMessages.slice(-5);
  for (let i = 0; i < logs.length; i++) {
    const lc = i === logs.length - 1 ? '#bbbbbb' : '#666666';
    text.drawText(logs[i].substring(0, 72), 12, 213 + i * 12, 9, lc, 'left');
  }

  // --- Deck / discard stats ---
  renderer.fillRect(5, 278, W - 10, 24, '#1e1e38');
  text.drawText('Deck:' + p.deck.length,       12,  283, 10, '#aaaaaa', 'left');
  text.drawText('Disc:' + p.discard.length,     100, 283, 10, '#aaaaaa', 'left');
  text.drawText('Total:' + countAllCards(p),    200, 283, 10, '#aaaaaa', 'left');
  text.drawText('VP:' + calcVP(p),              310, 283, 10, '#40c040', 'left');
  text.drawText('AI VP:' + calcVP(ai),     W - 12,  283, 10, '#ff8844', 'right');

  // --- Action / buy buttons ---
  const isHumanTurn = currentPlayer === 0 && !aiThinking;
  if (isHumanTurn) {
    if (turnPhase === 'action') {
      const bh = hoveredArea && hoveredArea.id === 'skipAction';
      drawBtn(renderer, text, W - 135, 308, 125, 22, 'SKIP TO BUY >>', bh, '#ffd700');
      addClickArea('skipAction', W - 135, 308, 125, 22, {});
    }
    if (turnPhase === 'buy') {
      const hasTr = p.hand.some(c => CARD_DEFS[c].type === 'treasure');
      if (hasTr) {
        const bh = hoveredArea && hoveredArea.id === 'playTreasures';
        drawBtn(renderer, text, 10, 308, 140, 22, 'PLAY TREASURES', bh, '#ffd700');
        addClickArea('playTreasures', 10, 308, 140, 22, {});
      }
      const eh = hoveredArea && hoveredArea.id === 'endTurn';
      drawBtn(renderer, text, W - 115, 308, 105, 22, 'END TURN', eh, '#ff6666');
      addClickArea('endTurn', W - 115, 308, 105, 22, {});
    }
  }

  // --- Quick buy row OR action hint ---
  if (isHumanTurn && turnPhase === 'buy') {
    text.drawText('QUICK BUY (or open market for full view):', 10, 338, 9, '#666666', 'left');

    const buyable = Object.keys(supply)
      .filter(k => supply[k] > 0 && CARD_DEFS[k].cost <= turnCoins && k !== 'curse')
      .sort((a, b) => CARD_DEFS[b].cost - CARD_DEFS[a].cost)
      .slice(0, 9);

    for (let i = 0; i < buyable.length; i++) {
      const cx = 8 + i * (CARD_W + 6);
      const cy = 352;
      const isH = hoveredArea && hoveredArea.id === 'quickbuy' && hoveredArea.data.cardId === buyable[i];
      drawCardRect(renderer, text, cx, cy, CARD_W, CARD_H, buyable[i], isH, false);
      addClickArea('quickbuy', cx, cy, CARD_W, CARD_H, { cardId: buyable[i] });
    }
  } else if (isHumanTurn && turnPhase === 'action') {
    const alpha = 0.5 + 0.3 * Math.sin(animFrame * 0.06);
    text.drawText(
      'Click an action card in your hand to play it',
      W / 2, 375, 10, withAlpha('#666666', alpha), 'center'
    );
  }

  // --- Hand area ---
  const handY = 420;
  renderer.fillRect(0, handY - 8, W, H - (handY - 8), '#1a1a30');

  // Glowing border at top of hand area
  renderer.setGlow(THEME, 0.5);
  renderer.drawLine(0, handY - 8, W, handY - 8, THEME, 1);
  renderer.setGlow(null);

  text.drawText('YOUR HAND', 10, handY - 4, 10, THEME, 'left');

  const handLen = p.hand.length;
  if (handLen > 0) {
    const handCardH = CARD_H + 16;
    const maxW = W - 20;
    const spacing = Math.min(CARD_W + 6, maxW / handLen);
    const startX = Math.max(10, (W - handLen * spacing) / 2);
    const cy = handY + 12;

    for (let i = 0; i < handLen; i++) {
      const cx = startX + i * spacing;
      const cardId = p.hand[i];
      const def = CARD_DEFS[cardId];
      const isH = hoveredArea && hoveredArea.id === 'hand' && hoveredArea.data.idx === i;
      const canPlay = isHumanTurn && (
        (turnPhase === 'action' && (def.type === 'action' || def.type === 'attack' || def.type === 'defense') && turnActions > 0) ||
        (turnPhase === 'buy' && def.type === 'treasure')
      );
      const dy = isH ? cy - 10 : cy;
      drawCardRect(renderer, text, cx, dy, CARD_W, handCardH, cardId, isH, !canPlay);
      addClickArea('hand', cx, cy - 10, CARD_W, handCardH + 10, { idx: i });
    }
  }
}

// ===================== RENDER: MARKET VIEW =====================

function renderMarket(renderer, text) {
  const p = players[0];

  // Title
  renderer.setGlow(THEME, 0.8);
  text.drawText('SUPPLY MARKET', W / 2, 6, 16, THEME, 'center');
  renderer.setGlow(null);

  // Close button
  const cbh = hoveredArea && hoveredArea.id === 'closeMarket';
  drawBtn(renderer, text, W - 80, 6, 70, 22, 'CLOSE [X]', cbh, THEME);
  addClickArea('closeMarket', W - 80, 6, 70, 22, {});

  // Resources
  text.drawText('Coins: ' + turnCoins + '  Buys: ' + turnBuys, 10, 12, 11, '#ffd700', 'left');

  const cats = [
    { label: 'TREASURE',         cards: ['copper', 'silver', 'gold'] },
    { label: 'VICTORY',          cards: ['estate', 'duchy', 'province', 'curse'] },
    { label: 'ACTIONS',          cards: ['smithy', 'village', 'woodcutter', 'market', 'festival', 'laboratory'] },
    { label: 'ATTACK / DEFENSE', cards: ['militia', 'witch', 'moat'] }
  ];

  let yy = 40;
  for (const cat of cats) {
    text.drawText(cat.label, 12, yy, 9, '#777777', 'left');
    yy += 14;

    const n = cat.cards.length;
    const sp = Math.min(MCARD_W + 10, (W - 20) / n);
    const sx = Math.max(10, (W - n * sp) / 2);

    for (let i = 0; i < n; i++) {
      const cx = sx + i * sp;
      const cy = yy;
      const cid = cat.cards[i];
      const def = CARD_DEFS[cid];
      const canBuy = turnCoins >= def.cost && supply[cid] > 0 && turnBuys > 0 &&
                     currentPlayer === 0 && turnPhase === 'buy';
      const isH = hoveredArea && hoveredArea.id === 'marketCard' && hoveredArea.data.cardId === cid;
      drawCardRect(renderer, text, cx, cy, MCARD_W, MCARD_H, cid, isH && canBuy, !canBuy);
      if (canBuy) addClickArea('marketCard', cx, cy, MCARD_W, MCARD_H, { cardId: cid });
    }
    yy += MCARD_H + 10;
  }

  // Bottom buttons
  const isHumanBuy = currentPlayer === 0 && turnPhase === 'buy' && !aiThinking;
  if (isHumanBuy) {
    const hasTr = p.hand.some(c => CARD_DEFS[c].type === 'treasure');
    if (hasTr) {
      const bh = hoveredArea && hoveredArea.id === 'playTreasures';
      drawBtn(renderer, text, 10, H - 55, 150, 24, 'PLAY TREASURES', bh, '#ffd700');
      addClickArea('playTreasures', 10, H - 55, 150, 24, {});
    }
    const eh = hoveredArea && hoveredArea.id === 'endTurn';
    drawBtn(renderer, text, W - 120, H - 55, 110, 24, 'END TURN', eh, '#ff6666');
    addClickArea('endTurn', W - 120, H - 55, 110, 24, {});
  }

  // Hand preview strip
  renderer.fillRect(0, H - 26, W, 26, '#1e1e38');
  const hs = p.hand.map(c => CARD_DEFS[c].name).join(', ');
  text.drawText('Hand: ' + hs.substring(0, 80), 8, H - 22, 9, '#888888', 'left');
}

// ===================== MAIN EXPORT =====================

export function createGame() {
  bestEl.textContent = bestScore;

  const game = new Game('game');
  _game = game;

  game.onInit = () => {
    score = 0;
    scoreEl.textContent = 0;
    animFrame = 0;
    hoveredArea = null;
    clickAreas = [];
    pendingClicks = [];
    pendingMoves = [];
    game.showOverlay('DECK BUILDER DUELS', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  // Attach mouse listeners to canvas
  const canvasEl = document.getElementById('game');

  canvasEl.addEventListener('mousemove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    pendingMoves.push({ x: mx, y: my });
  });

  canvasEl.addEventListener('click', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    pendingClicks.push({ x: mx, y: my });
  });

  // ── Update ──
  game.onUpdate = () => {
    // Process mouse moves (hover detection uses the last rendered clickAreas)
    while (pendingMoves.length > 0) {
      const mv = pendingMoves.shift();
      hoveredArea = getAreaAt(mv.x, mv.y);
      canvasEl.style.cursor = hoveredArea ? 'pointer' : 'default';
    }

    // Process clicks
    while (pendingClicks.length > 0) {
      const click = pendingClicks.shift();

      if (game.state === 'waiting' || game.state === 'over') {
        game.setState('playing');
        game.hideOverlay();
        initGame();
        startTurn();
        pendingClicks = [];
        break;
      }

      if (aiThinking || currentPlayer !== 0) continue;

      const area = getAreaAt(click.x, click.y);
      if (!area) continue;

      const p = players[0];

      switch (area.id) {
        case 'hand': {
          const idx = area.data.idx;
          if (idx >= p.hand.length) break;
          const cardId = p.hand[idx];
          const def = CARD_DEFS[cardId];
          if (turnPhase === 'action') {
            if ((def.type === 'action' || def.type === 'attack' || def.type === 'defense') && turnActions > 0) {
              playAction(p, idx);
              updateScore();
            }
          } else if (turnPhase === 'buy') {
            if (def.type === 'treasure') {
              turnCoins += def.coins;
              p.playArea.push(cardId);
              p.hand.splice(idx, 1);
              addLog('You play ' + def.name);
            }
          }
          break;
        }
        case 'skipAction':
          turnPhase = 'buy';
          statusMsg = 'Your turn - Buy Phase';
          break;
        case 'playTreasures':
          playAllTreasures(p);
          break;
        case 'endTurn':
          currentView = VIEW.MAIN;
          endTurn();
          break;
        case 'marketBtn':
          currentView = VIEW.MARKET;
          break;
        case 'closeMarket':
          currentView = VIEW.MAIN;
          break;
        case 'quickbuy':
        case 'marketCard':
          if (turnPhase === 'buy' && turnBuys > 0) {
            buyCard(area.data.cardId);
            if (turnBuys <= 0) statusMsg = 'No buys left - End Turn';
          }
          break;
      }
    }

    if (game.state !== 'playing') return;

    // AI timer countdown
    if (aiThinking && currentPlayer !== 0) {
      aiTimer--;
      if (aiTimer <= 0) {
        aiThinking = false;
        aiTurn();
      }
    }

    updateScore();
    animFrame++;
  };

  // ── Draw ──
  game.onDraw = (renderer, text) => {
    // Background clear
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Rebuild click areas each frame
    clickAreas = [];

    if (game.state !== 'playing') return;

    if (currentView === VIEW.MAIN) {
      renderMain(renderer, text);
    } else {
      renderMarket(renderer, text);
    }
  };

  game.start();
  return game;
}
