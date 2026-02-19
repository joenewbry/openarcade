// poker-arena/game.js — Poker Arena as ES module for WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// Theme colors
const GOLD       = '#c9a84c';
const GOLD_DIM   = '#8a7030';
const GOLD_FAINT = '#c9a84c22';
const CARD_WHITE = '#f5f0e8';
const CARD_BACK  = '#1a3a8a';

// Card dimensions
const CW = 40, CH = 56;

// Suits
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const SUIT_COLORS  = { hearts: '#dd2222', diamonds: '#dd2222', clubs: '#222222', spades: '#222222' };
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUES = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};

// AI personalities
const PERSONALITIES = [
  {name:'Ace',   style:'tight-aggressive', color:'#ee5555', foldThresh:0.45, raiseThresh:0.70, bluffRate:0.08, aggressionMult:1.4},
  {name:'Blaze', style:'loose-aggressive', color:'#ee9933', foldThresh:0.25, raiseThresh:0.50, bluffRate:0.20, aggressionMult:1.8},
  {name:'Chill', style:'tight-passive',    color:'#55aaee', foldThresh:0.50, raiseThresh:0.85, bluffRate:0.03, aggressionMult:0.6},
  {name:'Dice',  style:'loose-passive',    color:'#99cc55', foldThresh:0.30, raiseThresh:0.80, bluffRate:0.05, aggressionMult:0.7},
  {name:'Echo',  style:'bluffer',          color:'#cc66ee', foldThresh:0.35, raiseThresh:0.55, bluffRate:0.35, aggressionMult:1.5},
];

// DOM elements
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// ── Game state ──
let score = 1000, best = 1000;
let gameState = 'waiting';
let deck, communityCards, pot;
let players, dealerIdx, currentPlayerIdx, humanIdx;
let phase;
let currentBet, minRaise;
let smallBlind, bigBlind;
let actionButtons, raiseSlider;
let animTimer;
let handNumber;
let revealedHands;
let winnerMessage;
let winnerDisplayTimer;
let messageLog;
let actedThisRound;
let bettingRoundStarter;
let waitingForHuman;
let isDraggingSlider = false;

// ── Helpers: polygon approximation ──

function ellipsePoints(cx, cy, rx, ry, steps = 48) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

function circlePoints(cx, cy, r, steps = 32) {
  return ellipsePoints(cx, cy, r, r, steps);
}

function roundRectPoints(x, y, w, h, r) {
  // Approximate rounded rectangle as polygon
  const pts = [];
  const corners = [
    { cx: x + r,     cy: y + r,     a0: Math.PI, a1: 1.5 * Math.PI },
    { cx: x + w - r, cy: y + r,     a0: 1.5 * Math.PI, a1: 2 * Math.PI },
    { cx: x + w - r, cy: y + h - r, a0: 0, a1: 0.5 * Math.PI },
    { cx: x + r,     cy: y + h - r, a0: 0.5 * Math.PI, a1: Math.PI },
  ];
  const steps = 6;
  for (const c of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / steps);
      pts.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r });
    }
  }
  return pts;
}

// ── Deck / hand logic ──

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r, value: RANK_VALUES[r] });
  return shuffle(d);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const result = [];
  const [first, ...rest] = arr;
  for (const c of getCombinations(rest, k - 1)) result.push([first, ...c]);
  for (const c of getCombinations(rest, k))     result.push(c);
  return result;
}

function evaluate5(cards) {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits  = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  let isStraight = false, straightHigh = values[0];
  const uniqVals = [...new Set(values)].sort((a, b) => b - a);
  if (uniqVals.length === 5) {
    if (uniqVals[0] - uniqVals[4] === 4) { isStraight = true; straightHigh = uniqVals[0]; }
    if (uniqVals[0] === 14 && uniqVals[1] === 5 && uniqVals[2] === 4 && uniqVals[3] === 3 && uniqVals[4] === 2) {
      isStraight = true; straightHigh = 5;
    }
  }
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ value: parseInt(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  if (isFlush && isStraight && straightHigh === 14) return { rank: 9, name: 'Royal Flush',    kickers: [14] };
  if (isFlush && isStraight)                        return { rank: 8, name: 'Straight Flush',  kickers: [straightHigh] };
  if (groups[0].count === 4)                        return { rank: 7, name: 'Four of a Kind',  kickers: [groups[0].value, groups[1].value] };
  if (groups[0].count === 3 && groups[1].count === 2) return { rank: 6, name: 'Full House',   kickers: [groups[0].value, groups[1].value] };
  if (isFlush)                                      return { rank: 5, name: 'Flush',           kickers: values };
  if (isStraight)                                   return { rank: 4, name: 'Straight',        kickers: [straightHigh] };
  if (groups[0].count === 3)                        return { rank: 3, name: 'Three of a Kind', kickers: [groups[0].value, ...groups.slice(1).map(g => g.value)] };
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = [groups[0].value, groups[1].value].sort((a, b) => b - a);
    return { rank: 2, name: 'Two Pair', kickers: [...pairs, groups[2].value] };
  }
  if (groups[0].count === 2) return { rank: 1, name: 'Pair',      kickers: [groups[0].value, ...groups.slice(1).map(g => g.value)] };
  return { rank: 0, name: 'High Card', kickers: values };
}

function evaluateHand(holeCards, community) {
  const all = holeCards.concat(community);
  if (all.length < 5) return { rank: 0, name: 'Incomplete', kickers: [] };
  let best = null;
  for (const combo of getCombinations(all, 5)) {
    const ev = evaluate5(combo);
    if (!best || compareHands(ev, best) > 0) best = ev;
  }
  return best;
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}

function estimateHandStrength(holeCards, community) {
  if (community.length === 0) {
    const v1 = holeCards[0].value, v2 = holeCards[1].value;
    const suited = holeCards[0].suit === holeCards[1].suit;
    const pair   = v1 === v2;
    const high   = Math.max(v1, v2), low = Math.min(v1, v2);
    let strength = (high + low) / 28;
    if (pair)            strength += 0.30;
    if (suited)          strength += 0.06;
    if (high - low <= 2 && !pair) strength += 0.04;
    if (high >= 12)      strength += 0.08;
    if (high === 14)     strength += 0.05;
    return Math.min(1, Math.max(0, strength));
  }
  const hand = evaluateHand(holeCards, community);
  const base = hand.rank / 9;
  const kickerBonus = (hand.kickers[0] || 0) / 14 * 0.08;
  return Math.min(1, base + kickerBonus + 0.15);
}

// ── Player positions ──

function getPlayerPosition(idx, total) {
  if (idx === humanIdx) return { x: W / 2, y: H - 70 };
  let otherIdx = 0;
  const otherCount = total - 1;
  for (let i = 0; i < total; i++) {
    if (i === humanIdx) continue;
    if (i === idx) break;
    otherIdx++;
  }
  const angle = Math.PI + (Math.PI * (otherIdx + 1)) / (otherCount + 1);
  const cx = W / 2, cy = H / 2 - 15;
  const rx = 230, ry = 135;
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

// ── Game lifecycle ──

let game; // reference set in createGame

function initGame() {
  score = 1000;
  if (scoreEl) scoreEl.textContent = '1000';
  gameState = 'waiting';
  handNumber = 0;
  messageLog = [];
  game.showOverlay('POKER ARENA', 'Click to Play');
  game.setState('waiting');
}

function startGame() {
  gameState = 'playing';
  game.setState('playing');
  humanIdx = 0;
  players = [{
    name: 'You', chips: 1000, holeCards: [], folded: false, allIn: false,
    currentBet: 0, isHuman: true, personality: null, color: GOLD, seatIdx: 0
  }];
  const perms = shuffle([...PERSONALITIES]);
  for (let i = 0; i < 4; i++) {
    players.push({
      name: perms[i].name, chips: 1000, holeCards: [], folded: false, allIn: false,
      currentBet: 0, isHuman: false, personality: perms[i], color: perms[i].color, seatIdx: i + 1
    });
  }
  dealerIdx  = Math.floor(Math.random() * players.length);
  smallBlind = 10;
  bigBlind   = 20;
  handNumber = 0;
  startNewHand();
}

function startNewHand() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  handNumber++;
  if (handNumber > 1 && (handNumber - 1) % 8 === 0) {
    smallBlind = Math.min(smallBlind * 2, 200);
    bigBlind   = smallBlind * 2;
  }
  players = players.filter(p => p.chips > 0);
  const humanAlive = players.find(p => p.isHuman);
  if (!humanAlive)          { endGame(false); return; }
  if (players.length === 1) { endGame(true);  return; }

  deck           = createDeck();
  communityCards = [];
  pot            = 0;
  currentBet     = 0;
  minRaise       = bigBlind;
  revealedHands  = false;
  winnerMessage  = '';
  winnerDisplayTimer = 0;
  messageLog     = [];
  actedThisRound = new Set();
  waitingForHuman = false;
  actionButtons  = [];

  for (const p of players) {
    p.holeCards  = [];
    p.folded     = false;
    p.allIn      = false;
    p.currentBet = 0;
  }

  dealerIdx = (dealerIdx + 1) % players.length;
  for (let i = 0; i < 2; i++) for (const p of players) p.holeCards.push(deck.pop());

  const sbIdx = (dealerIdx + 1) % players.length;
  const bbIdx = (dealerIdx + 2) % players.length;
  postBlind(players[sbIdx], smallBlind);
  postBlind(players[bbIdx], bigBlind);
  currentBet = bigBlind;

  phase = 'preflop';
  currentPlayerIdx   = (bbIdx + 1) % players.length;
  bettingRoundStarter = currentPlayerIdx;

  updateScore();
  processCurrentPlayer();
}

function postBlind(player, amount) {
  const actual = Math.min(amount, player.chips);
  player.chips     -= actual;
  player.currentBet = actual;
  pot              += actual;
  if (player.chips === 0) player.allIn = true;
}

function getActivePlayers()  { return players.filter(p => !p.folded); }
function getActiveCanAct()   { return players.filter(p => !p.folded && !p.allIn); }

function processCurrentPlayer() {
  if (gameState !== 'playing') return;
  let loops = 0;
  while (loops < players.length && (players[currentPlayerIdx].folded || players[currentPlayerIdx].allIn)) {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    loops++;
  }
  if (loops >= players.length) { advancePhase(); return; }

  const nonFolded = getActivePlayers();
  if (nonFolded.length <= 1) {
    if (nonFolded.length === 1) awardPot([nonFolded[0]]);
    winnerMessage      = (nonFolded.length === 1 ? nonFolded[0].name : '???') + ' wins $' + pot;
    winnerDisplayTimer = Date.now();
    animTimer = setTimeout(() => startNewHand(), 2500);
    return;
  }

  const canAct     = getActiveCanAct();
  const allMatched = canAct.every(p => p.currentBet === currentBet);
  if (allMatched && actedThisRound.size > 0 && canAct.every(p => actedThisRound.has(players.indexOf(p)))) {
    advancePhase();
    return;
  }

  if (players[currentPlayerIdx].isHuman) {
    waitingForHuman = true;
    setupActionButtons();
  } else {
    waitingForHuman = false;
    actionButtons = [];
    animTimer = setTimeout(() => doAIAction(), 500 + Math.random() * 700);
  }
}

function setupActionButtons() {
  const human = players[humanIdx];
  if (!human || human.folded || human.allIn) { actionButtons = []; return; }
  const toCall = currentBet - human.currentBet;
  actionButtons = [];
  actionButtons.push({ label: 'FOLD',                    x: 65,  y: H - 18, w: 70, h: 28, action: 'fold' });
  if (toCall <= 0) {
    actionButtons.push({ label: 'CHECK',                 x: 155, y: H - 18, w: 70, h: 28, action: 'check' });
  } else {
    const callAmt = Math.min(toCall, human.chips);
    actionButtons.push({ label: 'CALL $' + callAmt,     x: 160, y: H - 18, w: 90, h: 28, action: 'call' });
  }
  if (human.chips > toCall) {
    actionButtons.push({ label: 'RAISE',                 x: 270, y: H - 18, w: 70, h: 28, action: 'raise' });
    actionButtons.push({ label: 'ALL IN',                x: 360, y: H - 18, w: 80, h: 28, action: 'allin' });
  }
  raiseSlider = {
    x: 430, y: H - 30, w: 140, h: 20,
    min:   Math.max(currentBet + minRaise, bigBlind),
    max:   human.chips + human.currentBet,
    value: Math.max(currentBet + minRaise, bigBlind),
  };
  if (raiseSlider.min > raiseSlider.max) raiseSlider.min = raiseSlider.max;
  if (raiseSlider.value > raiseSlider.max) raiseSlider.value = raiseSlider.max;
}

function playerAction(action, amount) {
  const player = players[currentPlayerIdx];
  if (!player || player.folded || player.allIn) { nextPlayer(); return; }

  switch (action) {
    case 'fold':
      player.folded = true;
      addLog(player.name + ' folds');
      break;
    case 'check':
      addLog(player.name + ' checks');
      break;
    case 'call': {
      const toCall = Math.min(currentBet - player.currentBet, player.chips);
      player.chips     -= toCall;
      player.currentBet += toCall;
      pot              += toCall;
      if (player.chips === 0) player.allIn = true;
      addLog(player.name + ' calls $' + toCall);
      break;
    }
    case 'raise': {
      let raiseTotal = amount || (raiseSlider ? raiseSlider.value : currentBet + minRaise);
      raiseTotal = Math.max(raiseTotal, currentBet + minRaise);
      raiseTotal = Math.min(raiseTotal, player.chips + player.currentBet);
      let cost = Math.min(raiseTotal - player.currentBet, player.chips);
      player.chips      -= cost;
      player.currentBet += cost;
      pot               += cost;
      minRaise = Math.max(minRaise, player.currentBet - currentBet);
      currentBet = player.currentBet;
      if (player.chips === 0) player.allIn = true;
      actedThisRound = new Set();
      addLog(player.name + ' raises to $' + currentBet);
      break;
    }
    case 'allin': {
      const allInAmt = player.chips;
      player.currentBet += allInAmt;
      pot              += allInAmt;
      player.chips      = 0;
      player.allIn      = true;
      if (player.currentBet > currentBet) {
        minRaise   = Math.max(minRaise, player.currentBet - currentBet);
        currentBet = player.currentBet;
        actedThisRound = new Set();
      }
      addLog(player.name + ' ALL IN ($' + player.currentBet + ')');
      break;
    }
  }

  actedThisRound.add(currentPlayerIdx);
  waitingForHuman = false;
  actionButtons   = [];
  updateScore();
  nextPlayer();
}

function nextPlayer() {
  currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
  processCurrentPlayer();
}

function advancePhase() {
  actedThisRound = new Set();
  for (const p of players) p.currentBet = 0;
  currentBet = 0;
  minRaise   = bigBlind;

  const canAct    = getActiveCanAct();
  const nonFolded = getActivePlayers();

  switch (phase) {
    case 'preflop': phase = 'flop';  communityCards.push(deck.pop(), deck.pop(), deck.pop()); break;
    case 'flop':    phase = 'turn';  communityCards.push(deck.pop()); break;
    case 'turn':    phase = 'river'; communityCards.push(deck.pop()); break;
    case 'river':   phase = 'showdown'; doShowdown(); return;
  }

  if (canAct.length <= 1) {
    animTimer = setTimeout(() => advancePhase(), 700);
    return;
  }

  currentPlayerIdx = (dealerIdx + 1) % players.length;
  processCurrentPlayer();
}

function doShowdown() {
  revealedHands = true;
  const nonFolded = getActivePlayers();
  const results   = nonFolded.map(p => ({ player: p, hand: evaluateHand(p.holeCards, communityCards) }));
  results.sort((a, b) => compareHands(b.hand, a.hand));
  const winners = [results[0]];
  for (let i = 1; i < results.length; i++) {
    if (compareHands(results[i].hand, results[0].hand) === 0) winners.push(results[i]);
    else break;
  }
  const winnerPlayers = winners.map(w => w.player);
  awardPot(winnerPlayers);
  const winNames = winnerPlayers.map(w => w.name).join(' & ');
  winnerMessage      = winNames + ' wins with ' + winners[0].hand.name + '!';
  winnerDisplayTimer = Date.now();
  updateScore();
  animTimer = setTimeout(() => startNewHand(), 3500);
}

function awardPot(winners) {
  const share     = Math.floor(pot / winners.length);
  const remainder = pot - share * winners.length;
  for (let i = 0; i < winners.length; i++) {
    winners[i].chips += share + (i === 0 ? remainder : 0);
  }
}

function doAIAction() {
  if (gameState !== 'playing') return;
  const player = players[currentPlayerIdx];
  if (!player || player.folded || player.allIn || player.isHuman) { nextPlayer(); return; }

  const p      = player.personality;
  const strength = estimateHandStrength(player.holeCards, communityCards);
  const toCall   = currentBet - player.currentBet;
  let adjustedStrength = strength;
  if (Math.random() < p.bluffRate) adjustedStrength = 0.65 + Math.random() * 0.35;

  if (toCall > 0) {
    if (adjustedStrength < p.foldThresh && toCall > bigBlind * 2) {
      playerAction('fold');
    } else if (adjustedStrength > p.raiseThresh && player.chips > toCall * 2) {
      const raiseMult = 2 + Math.floor(adjustedStrength * 3 * p.aggressionMult);
      let raiseAmt = Math.min(currentBet * raiseMult, player.chips + player.currentBet);
      raiseAmt = Math.max(raiseAmt, currentBet + minRaise);
      if (raiseAmt >= player.chips + player.currentBet) playerAction('allin');
      else playerAction('raise', raiseAmt);
    } else if (adjustedStrength >= p.foldThresh - 0.1 || toCall <= bigBlind) {
      playerAction('call');
    } else {
      playerAction('fold');
    }
  } else {
    if (adjustedStrength > p.raiseThresh) {
      let raiseAmt = bigBlind * (2 + Math.floor(adjustedStrength * 4 * p.aggressionMult));
      raiseAmt = Math.max(raiseAmt, currentBet + minRaise);
      raiseAmt = Math.min(raiseAmt, player.chips + player.currentBet);
      if (raiseAmt >= player.chips) playerAction('allin');
      else playerAction('raise', raiseAmt);
    } else {
      playerAction('check');
    }
  }
}

function addLog(msg) {
  messageLog.unshift(msg);
  if (messageLog.length > 4) messageLog.pop();
}

function updateScore() {
  const human = players.find(p => p.isHuman);
  if (human) {
    score = human.chips;
    if (scoreEl) scoreEl.textContent = score;
    if (score > best) { best = score; if (bestEl) bestEl.textContent = best; }
  }
}

function endGame(won) {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  gameState = 'over';
  if (won) {
    game.showOverlay('YOU WIN!',   'Final chips: $' + score + ' -- Click to play again');
  } else {
    game.showOverlay('GAME OVER',  'Score: $' + score + ' -- Click to play again');
  }
  game.setState('waiting'); // reuse waiting state to show overlay
}

// ── Slider update ──

function updateSliderVal(mx) {
  if (!raiseSlider) return;
  const s   = raiseSlider;
  const pct = Math.max(0, Math.min(1, (mx - s.x) / s.w));
  let rawVal = s.min + pct * (s.max - s.min);
  s.value = Math.max(s.min, Math.min(s.max, Math.round(rawVal / bigBlind) * bigBlind));
  if (s.value < s.min) s.value = s.min;
}

// ── Drawing ──

function drawTable(r) {
  const cx = W / 2, cy = H / 2 - 15;
  const rx = 255, ry = 148;

  // Outer rim shadow fill
  r.setGlow('#c9a84c', 0.15);
  r.fillPoly(ellipsePoints(cx, cy, rx + 8, ry + 8), '#2a1a08');
  r.setGlow(null);

  // Wood rim
  r.fillPoly(ellipsePoints(cx, cy, rx + 5, ry + 5), '#4a2e10');

  // Felt gradient approximation — dark green base
  r.fillPoly(ellipsePoints(cx, cy, rx, ry), '#1b6e1b');
  // Lighter center circle for gradient feel
  r.fillCircle(cx, cy - 20, rx * 0.45, '#2d8a2d80');

  // Felt texture lines — thin dark horizontal lines across the ellipse
  for (let i = -ry + 3; i < ry; i += 6) {
    const halfW = rx * Math.sqrt(Math.max(0, 1 - (i / ry) ** 2));
    r.fillRect(cx - halfW, cy + i, halfW * 2, 1, '#00000008');
  }

  // Gold trim ring
  r.setGlow(GOLD, 0.4);
  r.strokePoly(ellipsePoints(cx, cy, rx + 1, ry + 1), GOLD_DIM, 1.5);
  r.setGlow(null);
}

function drawCardFaceUp(r, text, x, y, card, small) {
  const w = small ? 30 : CW;
  const h = small ? 42 : CH;

  // Card shadow
  r.fillRect(x + 2, y + 2, w, h, '#00000066');

  // Card face
  r.fillPoly(roundRectPoints(x, y, w, h, 3), CARD_WHITE);

  // Border
  r.strokePoly(roundRectPoints(x, y, w, h, 3), '#bbbbbb', 0.7);

  const color = SUIT_COLORS[card.suit];
  const sym   = SUIT_SYMBOLS[card.suit];
  const rankFs   = small ? 10 : 12;
  const suitSmFs = small ? 8  : 10;
  const suitLgFs = small ? 16 : 22;

  // Top-left rank
  text.drawText(card.rank, x + 3, y + 2,  rankFs,   color, 'left');
  // Top-left mini suit
  text.drawText(sym,       x + 3, y + rankFs + 4, suitSmFs, color, 'left');
  // Center suit large
  text.drawText(sym, x + w / 2, y + h / 2 - suitLgFs / 2, suitLgFs, color, 'center');
  // Bottom-right rank (small)
  text.drawText(card.rank, x + w - 3, y + h - rankFs - 2, rankFs - 2, color, 'right');
}

function drawCardBack(r, x, y, small) {
  const w = small ? 30 : CW;
  const h = small ? 42 : CH;
  const m = small ? 2 : 3;

  // Shadow
  r.fillRect(x + 2, y + 2, w, h, '#00000055');

  // Card back
  r.fillPoly(roundRectPoints(x, y, w, h, 3), CARD_BACK);

  // Inner border
  r.strokePoly(roundRectPoints(x + m, y + m, w - m * 2, h - m * 2, 2), '#2a4aaa', 1);

  // Cross-hatch pattern (simplified — diagonal lines)
  const step = small ? 4 : 5;
  for (let i = 0; i < w + h; i += step) {
    const x1a = Math.max(x + m, x + m + i - h);
    const y1a = Math.max(y + m, y + m + i - w);
    const x2a = Math.min(x + w - m, x + m + i);
    const y2a = Math.min(y + h - m, y + m + i);
    if (x1a < x2a) r.drawLine(x1a, y1a, x2a, y2a, '#6488dc30', 0.5);

    const x1b = Math.min(x + w - m, x + w - m - i + h);
    const y1b = Math.max(y + m, y + m + i - w);
    const x2b = Math.max(x + m, x + w - m - i);
    const y2b = Math.min(y + h - m, y + m + i);
    if (x1b > x2b) r.drawLine(x1b, y1b, x2b, y2b, '#6488dc30', 0.5);
  }
}

function drawCommunityCards(r, text) {
  const startX = W / 2 - (5 * (CW + 6)) / 2 + 3;
  const y      = H / 2 - CH / 2 - 15;
  for (let i = 0; i < 5; i++) {
    const x = startX + i * (CW + 6);
    if (i < communityCards.length) {
      drawCardFaceUp(r, text, x, y, communityCards[i], false);
    } else {
      // Empty slot outline
      r.strokePoly(roundRectPoints(x, y, CW, CH, 3), '#c9a84c1e', 1);
    }
  }
}

function drawPot(r, text) {
  if (pot <= 0) return;
  r.setGlow(GOLD, 0.6);
  text.drawText('POT: $' + pot, W / 2, H / 2 + 42, 15, GOLD, 'center');
  r.setGlow(null);
}

function drawPlayer(r, text, idx) {
  const p   = players[idx];
  const pos = getPlayerPosition(idx, players.length);
  const isCurrentTurn = (idx === currentPlayerIdx && phase !== 'showdown');
  const isHuman       = p.isHuman;
  const badgeR        = isHuman ? 22 : 18;

  // Turn glow ring
  if (isCurrentTurn && !p.folded) {
    r.setGlow(GOLD, 0.7);
    r.strokePoly(circlePoints(pos.x, pos.y, badgeR + 5), GOLD, 2);
    r.setGlow(null);
  }

  // Badge fill
  const bgColor = p.folded ? '#222222' : (isHuman ? '#1a3050' : '#261540');
  r.fillPoly(circlePoints(pos.x, pos.y, badgeR), bgColor);

  // Badge border
  const borderColor = p.folded ? '#444444' : (p.color || '#888888');
  r.strokePoly(circlePoints(pos.x, pos.y, badgeR), borderColor, 2);

  // Initial letter
  const initColor = p.folded ? '#555555' : (p.color || '#dddddd');
  const initFs    = isHuman ? 18 : 14;
  text.drawText(p.name[0], pos.x, pos.y - initFs / 2, initFs, initColor, 'center');

  // Name below badge
  const nameFs    = isHuman ? 11 : 10;
  const nameColor = p.folded ? '#444444' : '#bbbbbb';
  text.drawText(p.name, pos.x, pos.y + badgeR + 2, nameFs, nameColor, 'center');

  // Chips
  const chipColor = p.folded ? '#333333' : GOLD;
  text.drawText('$' + p.chips, pos.x, pos.y + badgeR + 14, 10, chipColor, 'center');

  // AI style label
  if (!isHuman && p.personality && !p.folded) {
    text.drawText(p.personality.style, pos.x, pos.y + badgeR + 26, 8, '#556677', 'center');
  }

  // Dealer chip
  if (idx === dealerIdx) {
    const dx = pos.x + badgeR + 6;
    const dy = pos.y - badgeR + 2;
    r.fillPoly(circlePoints(dx, dy, 8), '#f5f0d0');
    r.strokePoly(circlePoints(dx, dy, 8), '#aa9040', 1.5);
    text.drawText('D', dx, dy - 4, 9, '#333333', 'center');
  }

  // Current bet indicator (chip toward center)
  if (p.currentBet > 0 && !p.folded) {
    const tcx = W / 2, tcy = H / 2 - 15;
    const ddx = tcx - pos.x, ddy = tcy - pos.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    const bx = pos.x + (dist > 0 ? ddx * 0.4 : 0);
    const by = pos.y + (dist > 0 ? ddy * 0.4 : 0);
    r.fillCircle(bx, by, 10, '#ddbb3c33');
    text.drawText('$' + p.currentBet, bx, by - 4, 9, '#ffbb44', 'center');
  }

  // Status labels
  if (p.folded) {
    text.drawText('FOLDED', pos.x, pos.y + badgeR + 36, 9, '#555555', 'center');
  } else if (p.allIn) {
    r.setGlow('#ff6644', 0.6);
    text.drawText('ALL IN', pos.x, pos.y + badgeR + 36, 9, '#ff6644', 'center');
    r.setGlow(null);
  }

  // Hole cards
  if (!p.folded && p.holeCards.length >= 2) {
    const showCards = isHuman || revealedHands;
    if (isHuman) {
      const cx1 = pos.x - CW - 2;
      const cy1 = pos.y - CH - 28;
      if (showCards) {
        drawCardFaceUp(r, text, cx1,        cy1, p.holeCards[0], false);
        drawCardFaceUp(r, text, cx1 + CW + 4, cy1, p.holeCards[1], false);
      } else {
        drawCardBack(r, cx1,        cy1, false);
        drawCardBack(r, cx1 + CW + 4, cy1, false);
      }
      // Hand strength label
      if (showCards && communityCards.length >= 3) {
        const hand = evaluateHand(p.holeCards, communityCards);
        r.setGlow('#ffdd66', 0.4);
        text.drawText(hand.name, pos.x, pos.y - CH - 36, 10, '#ffdd66', 'center');
        r.setGlow(null);
      }
    } else {
      const cx1 = pos.x - 32;
      const cy1 = pos.y - badgeR - 50;
      if (showCards) {
        drawCardFaceUp(r, text, cx1,      cy1, p.holeCards[0], true);
        drawCardFaceUp(r, text, cx1 + 34, cy1, p.holeCards[1], true);
      } else {
        drawCardBack(r, cx1,      cy1, true);
        drawCardBack(r, cx1 + 34, cy1, true);
      }
      if (showCards && revealedHands && communityCards.length >= 3) {
        const hand = evaluateHand(p.holeCards, communityCards);
        text.drawText(hand.name, pos.x, cy1 - 6, 9, '#ffdd66', 'center');
      }
    }
  }
}

function drawActionButtons(r, text) {
  if (!actionButtons || actionButtons.length === 0) return;

  // Button bar background
  r.fillRect(0, H - 38, W, 38, '#0d1520eb');
  r.drawLine(0, H - 38, W, H - 38, GOLD_DIM, 1);

  for (const btn of actionButtons) {
    const bx = btn.x - btn.w / 2;
    const by = btn.y - btn.h / 2;
    const isRed   = btn.action === 'fold';
    const isGreen = btn.action === 'check' || btn.action === 'call';
    const btnColor    = isRed ? '#4a1a1a' : (isGreen ? '#1a3a1a' : '#1a2040');
    const borderColor = isRed ? '#cc4444' : (isGreen ? '#44cc44' : GOLD);

    r.setGlow(borderColor, 0.5);
    r.fillPoly(roundRectPoints(bx, by, btn.w, btn.h, 4), btnColor);
    r.strokePoly(roundRectPoints(bx, by, btn.w, btn.h, 4), borderColor, 1.5);
    r.setGlow(null);

    text.drawText(btn.label, btn.x, btn.y - 5, 10, borderColor, 'center');
  }

  // Raise slider
  if (raiseSlider && raiseSlider.max > raiseSlider.min) {
    const s      = raiseSlider;
    const sliderY = s.y + s.h / 2;
    const pct     = Math.max(0, Math.min(1, (s.value - s.min) / (s.max - s.min)));

    // Track background
    r.fillPoly(roundRectPoints(s.x, s.y + 5, s.w, s.h - 10, 4), '#222222');

    // Filled portion
    if (pct > 0) {
      r.fillPoly(roundRectPoints(s.x, s.y + 5, Math.max(8, s.w * pct), s.h - 10, 4), GOLD_DIM);
    }

    // Thumb handle
    const hx = s.x + s.w * pct;
    r.setGlow(GOLD, 0.4);
    r.fillCircle(hx, sliderY, 7, GOLD);
    r.setGlow(null);

    // Value label
    text.drawText('$' + s.value, s.x + s.w / 2, s.y - 12, 9, '#eeeeee', 'center');
  }
}

function drawMessageLog(text) {
  if (!messageLog) return;
  const baseY = waitingForHuman ? H - 52 : H - 20;
  for (let i = 0; i < messageLog.length; i++) {
    const alpha = Math.max(0.2, 0.9 - i * 0.25);
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    text.drawText(messageLog[i], 10, baseY - i * 14, 10, '#c8c8c8' + a, 'left');
  }
}

function drawWinnerBanner(r, text) {
  if (!winnerMessage || !winnerDisplayTimer) return;
  const elapsed = Date.now() - winnerDisplayTimer;
  const pulse   = 0.6 + 0.4 * Math.sin(elapsed / 200);
  r.setGlow(GOLD, pulse * 0.8);
  text.drawText(winnerMessage, W / 2, H / 2 + 62, 14, GOLD, 'center');
  r.setGlow(null);
}

function drawPhaseIndicator(text) {
  if (!phase) return;
  const labels = { preflop: 'PRE-FLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER', showdown: 'SHOWDOWN' };
  text.drawText(labels[phase] || '', W - 10, 4, 10, '#667788', 'right');
}

function drawIdleTable(r, text) {
  // Draw just the table with no game state
  drawTable(r);
}

// ── Main draw ──

function onDraw(r, text) {
  // Background
  r.fillRect(0, 0, W, H, '#0d1520');

  drawTable(r);

  if (gameState !== 'playing' && gameState !== 'over') return;
  if (!players || players.length === 0) return;

  drawCommunityCards(r, text);
  drawPot(r, text);

  for (let i = 0; i < players.length; i++) drawPlayer(r, text, i);
  if (waitingForHuman && phase !== 'showdown') drawActionButtons(r, text);
  drawMessageLog(text);
  if (winnerMessage && winnerDisplayTimer) drawWinnerBanner(r, text);
  drawPhaseIndicator(text);

  // Hand / blinds info
  text.drawText('Hand #' + handNumber + '  Blinds $' + smallBlind + '/$' + bigBlind, 8, 4, 10, '#555566', 'left');
}

// ── Export ──

export function createGame() {
  game = new Game('game');

  game.onInit = () => {
    initGame();
  };

  game.setScoreFn(() => score);

  game.onUpdate = () => {
    // All game logic is event-driven / timer-driven; nothing per-tick needed
  };

  game.onDraw = (renderer, text) => {
    onDraw(renderer, text);
  };

  // Mouse input — direct canvas listeners (no keyboard needed for poker)
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width);
    const my   = (e.clientY - rect.top)  * (H / rect.height);

    if (gameState === 'waiting') { startGame(); return; }
    if (gameState === 'over')    { initGame();  return; }
    if (gameState !== 'playing') return;
    if (!waitingForHuman) return;
    if (phase === 'showdown') return;

    // Slider hit test
    if (raiseSlider && raiseSlider.max > raiseSlider.min) {
      const s = raiseSlider;
      if (mx >= s.x - 10 && mx <= s.x + s.w + 10 && my >= s.y - 10 && my <= s.y + s.h + 10) {
        isDraggingSlider = true;
        updateSliderVal(mx);
        return;
      }
    }

    // Button hit test
    if (actionButtons) {
      for (const btn of actionButtons) {
        const bx = btn.x - btn.w / 2;
        const by = btn.y - btn.h / 2;
        if (mx >= bx && mx <= bx + btn.w && my >= by && my <= by + btn.h) {
          if (btn.action === 'raise') {
            playerAction('raise', raiseSlider ? raiseSlider.value : null);
          } else {
            playerAction(btn.action);
          }
          return;
        }
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDraggingSlider) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width);
    updateSliderVal(mx);
  });

  canvas.addEventListener('mouseup',    () => { isDraggingSlider = false; });
  canvas.addEventListener('mouseleave', () => { isDraggingSlider = false; });

  // Overlay click
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.cursor        = 'pointer';
    overlay.style.pointerEvents = 'auto';
    overlay.addEventListener('click', () => {
      if (gameState === 'waiting') startGame();
      else if (gameState === 'over') initGame();
    });
  }

  game.start();
  return game;
}
