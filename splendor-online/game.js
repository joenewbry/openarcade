// splendor-online/game.js — Splendor card game as ES module for WebGL engine

import { Game } from '../engine/core.js';

const W = 650, H = 500;

// --- Gem colors ---
const GEM_NAMES = ['ruby', 'sapphire', 'emerald', 'diamond', 'onyx'];
const GEM_COLORS = { ruby: '#e33', sapphire: '#44f', emerald: '#3b3', diamond: '#eee', onyx: '#555', gold: '#ea0' };
const GEM_LABELS = { ruby: 'R', sapphire: 'S', emerald: 'E', diamond: 'D', onyx: 'O', gold: 'G' };
const GEM_SHORT = { ruby: 'Rby', sapphire: 'Sph', emerald: 'Emr', diamond: 'Dia', onyx: 'Onx', gold: 'Gld' };

// --- Layout constants ---
const CARD_W = 80, CARD_H = 58;
const CARD_GAP = 8;
const TIER_LABELS = ['I', 'II', 'III'];
const GEM_TOKEN_R = 14;
const MARKET_X = 80;
const NOBLE_SIZE = 36;

// --- Game state ---
let supply = {};
let decks = [[], [], []];
let market = [[], [], []];
let nobles = [];
let players = [];
let currentPlayer = 0;
let turnPhase = 'action';
let selectedGems = [];
let hoverCard = null;
let hoverGem = null;
let hoverButton = null;
let message = '';
let messageTimer = 0;
let roundNumber = 0;
let lastRoundTriggered = false;
let aiThinkTimer = 0;
let score = 0;

const scoreEl = document.getElementById('score');
const aiScoreEl = document.getElementById('aiScore');

// --- Seeded RNG ---
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const r = rng || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Card generation ---
function distributeGemCost(total, rng, tier) {
  const cost = {};
  GEM_NAMES.forEach(g => cost[g] = 0);
  const numTypes = tier === 0 ? (2 + Math.floor(rng() * 2)) : (2 + Math.floor(rng() * 3));
  const types = shuffle([...GEM_NAMES], rng).slice(0, Math.min(numTypes, 5));
  let remaining = total;
  for (let i = 0; i < types.length - 1; i++) {
    const maxHere = Math.min(remaining - (types.length - 1 - i), 7);
    const amt = 1 + Math.floor(rng() * Math.max(1, maxHere - 1));
    cost[types[i]] = Math.min(amt, remaining - (types.length - 1 - i));
    remaining -= cost[types[i]];
  }
  cost[types[types.length - 1]] = Math.max(1, remaining);
  return cost;
}

function generateDecks() {
  const rng = mulberry32(Date.now() & 0xFFFFFFFF);
  const tiers = [
    { count: 40, minP: 0, maxP: 1, minCost: 2, maxCost: 5 },
    { count: 30, minP: 1, maxP: 3, minCost: 5, maxCost: 9 },
    { count: 20, minP: 3, maxP: 5, minCost: 10, maxCost: 14 }
  ];
  const allDecks = [[], [], []];
  for (let t = 0; t < 3; t++) {
    const cfg = tiers[t];
    for (let i = 0; i < cfg.count; i++) {
      const bonus = GEM_NAMES[i % 5];
      const prestige = cfg.minP + Math.floor(rng() * (cfg.maxP - cfg.minP + 1));
      const totalCost = cfg.minCost + Math.floor(rng() * (cfg.maxCost - cfg.minCost + 1));
      const cost = distributeGemCost(totalCost, rng, t);
      allDecks[t].push({ tier: t, bonus, prestige, cost, id: `${t}-${i}` });
    }
    shuffle(allDecks[t], rng);
  }
  return allDecks;
}

function generateNobles() {
  const patterns = [
    { ruby: 4, sapphire: 4 },
    { emerald: 4, onyx: 4 },
    { diamond: 3, sapphire: 3, onyx: 3 },
    { ruby: 3, emerald: 3, diamond: 3 },
    { sapphire: 3, emerald: 3, ruby: 3 }
  ];
  const chosen = shuffle([...patterns]).slice(0, 4);
  return chosen.map((req, i) => ({ id: `noble-${i}`, prestige: 3, requirements: req }));
}

// --- Player state ---
function newPlayer(name) {
  const gems = {}; const bonuses = {};
  GEM_NAMES.forEach(g => { gems[g] = 0; bonuses[g] = 0; });
  gems.gold = 0;
  return { name, gems, bonuses, prestige: 0, reserved: [] };
}

function totalGems(p) {
  let t = 0;
  GEM_NAMES.forEach(g => t += p.gems[g]);
  t += p.gems.gold;
  return t;
}

// --- Card affordability ---
function canAfford(player, card) {
  let goldNeeded = 0;
  for (const g of GEM_NAMES) {
    const need = (card.cost[g] || 0) - (player.bonuses[g] || 0);
    if (need > 0) {
      const have = player.gems[g] || 0;
      if (have < need) goldNeeded += need - have;
    }
  }
  return goldNeeded <= (player.gems.gold || 0);
}

function payForCard(player, card) {
  for (const g of GEM_NAMES) {
    let need = (card.cost[g] || 0) - (player.bonuses[g] || 0);
    if (need <= 0) continue;
    const fromGems = Math.min(need, player.gems[g] || 0);
    player.gems[g] -= fromGems;
    supply[g] += fromGems;
    need -= fromGems;
    if (need > 0) {
      player.gems.gold -= need;
      supply.gold += need;
    }
  }
  player.bonuses[card.bonus] = (player.bonuses[card.bonus] || 0) + 1;
  player.prestige += card.prestige;
}

// --- Noble check ---
function checkNobles(player) {
  for (let i = nobles.length - 1; i >= 0; i--) {
    const n = nobles[i];
    let qualifies = true;
    for (const g of GEM_NAMES) {
      if ((n.requirements[g] || 0) > (player.bonuses[g] || 0)) { qualifies = false; break; }
    }
    if (qualifies) {
      player.prestige += n.prestige;
      nobles.splice(i, 1);
      setMessage(`${player.name} attracts a Noble! +${n.prestige} prestige`);
      return true;
    }
  }
  return false;
}

function setMessage(msg) {
  message = msg;
  messageTimer = 180;
}

// --- Init ---
function initGame() {
  supply = {};
  GEM_NAMES.forEach(g => supply[g] = 4);
  supply.gold = 5;
  const allDecks = generateDecks();
  decks = allDecks;
  market = [[], [], []];
  for (let t = 0; t < 3; t++) {
    for (let i = 0; i < 4; i++) {
      if (decks[t].length > 0) market[t].push(decks[t].pop());
    }
  }
  nobles = generateNobles();
  players = [newPlayer('Player'), newPlayer('AI')];
  currentPlayer = 0;
  turnPhase = 'action';
  selectedGems = [];
  hoverCard = null;
  hoverGem = null;
  hoverButton = null;
  message = '';
  messageTimer = 0;
  roundNumber = 1;
  lastRoundTriggered = false;
  aiThinkTimer = 0;
  score = 0;
  if (scoreEl) scoreEl.textContent = '0';
  if (aiScoreEl) aiScoreEl.textContent = '0';
}

function refillMarket(tier) {
  while (market[tier].length < 4 && decks[tier].length > 0) {
    market[tier].push(decks[tier].pop());
  }
}

// --- Layout helpers ---
function cardPos(tier, index) {
  const displayRow = 2 - tier;
  const x = MARKET_X + index * (CARD_W + CARD_GAP);
  const y = 58 + displayRow * (CARD_H + 6);
  return { x, y };
}

function gemTokenPos(gemIndex) {
  const x = 470 + (gemIndex % 3) * 58;
  const y = 72 + Math.floor(gemIndex / 3) * 52;
  return { x, y };
}

function goldTokenPos() {
  return { x: 470 + 1 * 58, y: 72 + 2 * 52 };
}

// --- Hit testing ---
function hitTestCard(mx, my) {
  for (let t = 0; t < 3; t++) {
    for (let i = 0; i < market[t].length; i++) {
      const pos = cardPos(t, i);
      if (mx >= pos.x && mx <= pos.x + CARD_W && my >= pos.y && my <= pos.y + CARD_H) {
        return { tier: t, index: i, card: market[t][i] };
      }
    }
  }
  if (players.length > 0) {
    const p = players[0];
    for (let i = 0; i < p.reserved.length; i++) {
      const rx = 440 + i * (68 + 4);
      const ry = H - 48 - CARD_H - 4;
      if (mx >= rx && mx <= rx + CARD_W && my >= ry && my <= ry + CARD_H) {
        return { tier: -1, index: i, card: p.reserved[i] };
      }
    }
  }
  return null;
}

function hitTestGem(mx, my) {
  for (let i = 0; i < GEM_NAMES.length; i++) {
    const pos = gemTokenPos(i);
    const dx = mx - pos.x, dy = my - pos.y;
    if (dx * dx + dy * dy <= (GEM_TOKEN_R + 4) * (GEM_TOKEN_R + 4)) return GEM_NAMES[i];
  }
  return null;
}

function hitTestDiscardGem(mx, my) {
  const p = players[0];
  let dx = W / 2 - 130;
  const allGems = [...GEM_NAMES, 'gold'];
  for (const g of allGems) {
    if (p.gems[g] > 0) {
      const ddx = mx - dx, ddy = my - H / 2;
      if (ddx * ddx + ddy * ddy <= 20 * 20) return g;
      dx += 44;
    }
  }
  return null;
}

function hitTestButton(mx, my) {
  if (turnPhase === 'selectGems' && selectedGems.length > 0) {
    if (mx >= 480 && mx <= 552 && my >= 198 && my <= 220) return 'confirm';
    if (mx >= 558 && mx <= 618 && my >= 198 && my <= 220) return 'cancel';
  }
  return null;
}

// --- Player actions ---
function trySelectGem(gemName) {
  if (supply[gemName] <= 0) return;

  if (turnPhase === 'action') {
    turnPhase = 'selectGems';
    selectedGems = [gemName];
    return;
  }
  if (turnPhase !== 'selectGems') return;

  const uniqueSelected = [...new Set(selectedGems)];
  const countOfThis = selectedGems.filter(g => g === gemName).length;

  if (countOfThis === 1 && selectedGems.length === 1) {
    if (supply[gemName] >= 4) {
      selectedGems.push(gemName);
      confirmGemSelection();
    } else {
      setMessage('Need 4+ tokens to take 2 of same color');
    }
    return;
  }

  if (countOfThis >= 1) { setMessage('Already selected that gem'); return; }

  if (uniqueSelected.length === selectedGems.length) {
    if (selectedGems.length >= 3) { setMessage('Max 3 different gems'); return; }
    selectedGems.push(gemName);
    if (selectedGems.length === 3) confirmGemSelection();
    return;
  }

  setMessage('Invalid gem selection');
}

function confirmGemSelection() {
  if (selectedGems.length === 0) return;
  const p = players[0];
  const unique = [...new Set(selectedGems)];
  if (!(unique.length === 1 && selectedGems.length === 2) &&
      !(unique.length === selectedGems.length && selectedGems.length >= 1 && selectedGems.length <= 3)) {
    setMessage('Invalid gem combination');
    selectedGems = [];
    turnPhase = 'action';
    return;
  }
  for (const g of selectedGems) { supply[g]--; p.gems[g]++; }
  selectedGems = [];
  if (totalGems(p) > 10) { turnPhase = 'discardGems'; } else { endPlayerTurn(); }
}

function cancelGemSelection() {
  selectedGems = [];
  turnPhase = 'action';
}

function tryBuyCard(hit) {
  const p = players[0];
  if (!canAfford(p, hit.card)) { setMessage('Cannot afford this card'); return; }
  payForCard(p, hit.card);
  if (hit.tier >= 0) { market[hit.tier].splice(hit.index, 1); refillMarket(hit.tier); }
  else { p.reserved.splice(hit.index, 1); }
  setMessage(`Bought card: +${hit.card.prestige} prestige, +1 ${hit.card.bonus} bonus`);
  checkNobles(p);
  updateScores();
  if (totalGems(p) > 10) { turnPhase = 'discardGems'; } else { endPlayerTurn(); }
}

function tryReserveCard(hit) {
  const p = players[0];
  if (hit.tier < 0) { setMessage('Cannot reserve a reserved card'); return; }
  if (p.reserved.length >= 3) { setMessage('Max 3 reserved cards'); return; }
  const card = market[hit.tier].splice(hit.index, 1)[0];
  p.reserved.push(card);
  refillMarket(hit.tier);
  if (supply.gold > 0) { supply.gold--; p.gems.gold++; }
  setMessage('Reserved card + 1 Gold');
  if (totalGems(p) > 10) { turnPhase = 'discardGems'; } else { endPlayerTurn(); }
}

function discardGem(gemName) {
  const p = players[0];
  if (p.gems[gemName] <= 0) return;
  p.gems[gemName]--;
  supply[gemName]++;
  if (totalGems(p) <= 10) endPlayerTurn();
}

function endPlayerTurn() {
  turnPhase = 'action';
  updateScores();
  if (players[0].prestige >= 15 || players[1].prestige >= 15) lastRoundTriggered = true;
  currentPlayer = 1;
  turnPhase = 'aiTurn';
  aiThinkTimer = 40;
}

function updateScores() {
  score = players[0].prestige;
  if (scoreEl) scoreEl.textContent = players[0].prestige;
  if (aiScoreEl) aiScoreEl.textContent = players[1].prestige;
}

function checkWinCondition(game) {
  if (players[0].prestige >= 15 || players[1].prestige >= 15) lastRoundTriggered = true;
  if (lastRoundTriggered && currentPlayer === 0 &&
      (players[0].prestige >= 15 || players[1].prestige >= 15)) {
    let winner;
    if (players[0].prestige > players[1].prestige) winner = 'Player';
    else if (players[1].prestige > players[0].prestige) winner = 'AI';
    else winner = 'Tie';
    game.setState('over');
    const title = winner === 'Tie' ? 'TIE GAME!' : (winner === 'Player' ? 'YOU WIN!' : 'AI WINS!');
    game.showOverlay(title, `${players[0].prestige} vs ${players[1].prestige} prestige. Click to restart.`);
  }
}

// --- AI Logic ---
function evaluateBonusValue(player, bonusColor) {
  let value = 0;
  const cards = [...market[0], ...market[1], ...market[2], ...player.reserved];
  for (const card of cards) {
    const need = (card.cost[bonusColor] || 0) - (player.bonuses[bonusColor] || 0);
    if (need > 0) value += card.prestige >= 3 ? 3 : (card.prestige >= 1 ? 2 : 1);
  }
  for (const n of nobles) {
    const need = (n.requirements[bonusColor] || 0) - (player.bonuses[bonusColor] || 0);
    if (need > 0 && need <= 2) value += 4;
  }
  return value;
}

function howCloseToAfford(player, card) {
  let totalCost = 0, canPay = 0;
  for (const g of GEM_NAMES) {
    const cost = card.cost[g] || 0;
    if (cost === 0) continue;
    totalCost += cost;
    const effective = (player.bonuses[g] || 0) + (player.gems[g] || 0);
    canPay += Math.min(cost, effective);
  }
  if (totalCost === 0) return 1;
  return canPay / totalCost;
}

function evaluateGemNeed(player, gem) {
  let need = 0;
  const cards = [...market[0], ...market[1], ...market[2], ...player.reserved];
  for (const card of cards) {
    const required = Math.max(0, (card.cost[gem] || 0) - (player.bonuses[gem] || 0));
    need += required;
  }
  return need;
}

function aiDiscardExcess() {
  const ai = players[1];
  while (totalGems(ai) > 10) {
    let worstGem = null, worstScore = Infinity;
    const allGems = [...GEM_NAMES, 'gold'];
    for (const g of allGems) {
      if (ai.gems[g] > 0) {
        const s = g === 'gold' ? 100 : evaluateGemNeed(ai, g);
        if (s < worstScore) { worstScore = s; worstGem = g; }
      }
    }
    if (worstGem) { ai.gems[worstGem]--; supply[worstGem]++; } else break;
  }
}

function aiTurn(game) {
  const ai = players[1];
  let bestBuy = null, bestBuyScore = -1;

  for (let t = 2; t >= 0; t--) {
    for (let i = 0; i < market[t].length; i++) {
      const card = market[t][i];
      if (canAfford(ai, card)) {
        const cardScore = card.prestige * 10 + evaluateBonusValue(ai, card.bonus);
        if (cardScore > bestBuyScore) { bestBuyScore = cardScore; bestBuy = { tier: t, index: i, card }; }
      }
    }
  }
  for (let i = 0; i < ai.reserved.length; i++) {
    const card = ai.reserved[i];
    if (canAfford(ai, card)) {
      const cardScore = card.prestige * 10 + evaluateBonusValue(ai, card.bonus);
      if (cardScore > bestBuyScore) { bestBuyScore = cardScore; bestBuy = { tier: -1, index: i, card }; }
    }
  }

  if (bestBuy && bestBuyScore >= 5) {
    payForCard(ai, bestBuy.card);
    if (bestBuy.tier >= 0) { market[bestBuy.tier].splice(bestBuy.index, 1); refillMarket(bestBuy.tier); }
    else { ai.reserved.splice(bestBuy.index, 1); }
    setMessage(`AI bought card: +${bestBuy.card.prestige} prestige`);
    checkNobles(ai);
    endAITurn(game);
    return;
  }

  if (ai.reserved.length < 3) {
    let bestReserve = null, bestReserveScore = -1;
    for (let t = 2; t >= 0; t--) {
      for (let i = 0; i < market[t].length; i++) {
        const card = market[t][i];
        if (card.prestige >= 3) {
          const closeScore = howCloseToAfford(ai, card);
          if (closeScore >= 0.4) {
            const reserveScore = card.prestige * 10 + closeScore * 20;
            if (reserveScore > bestReserveScore) { bestReserveScore = reserveScore; bestReserve = { tier: t, index: i, card }; }
          }
        }
      }
    }
    if (bestReserve && bestReserveScore > 30 && supply.gold > 0) {
      const card = market[bestReserve.tier].splice(bestReserve.index, 1)[0];
      ai.reserved.push(card);
      refillMarket(bestReserve.tier);
      if (supply.gold > 0) { supply.gold--; ai.gems.gold++; }
      setMessage('AI reserved a card');
      endAITurn(game);
      return;
    }
  }

  const gemValue = {};
  GEM_NAMES.forEach(g => gemValue[g] = 0);
  for (let t = 0; t < 3; t++) {
    for (const card of market[t]) {
      const weight = card.prestige >= 3 ? 3 : (card.prestige >= 1 ? 2 : 1);
      for (const g of GEM_NAMES) {
        const need = Math.max(0, (card.cost[g] || 0) - (ai.bonuses[g] || 0) - (ai.gems[g] || 0));
        gemValue[g] += need * weight;
      }
    }
  }
  for (const card of ai.reserved) {
    for (const g of GEM_NAMES) {
      const need = Math.max(0, (card.cost[g] || 0) - (ai.bonuses[g] || 0) - (ai.gems[g] || 0));
      gemValue[g] += need * 5;
    }
  }

  const sortedGems = [...GEM_NAMES].filter(g => supply[g] > 0).sort((a, b) => gemValue[b] - gemValue[a]);

  if (sortedGems.length > 0 && supply[sortedGems[0]] >= 4 && gemValue[sortedGems[0]] > 3) {
    supply[sortedGems[0]] -= 2;
    ai.gems[sortedGems[0]] += 2;
    setMessage(`AI took 2 ${sortedGems[0]} gems`);
    aiDiscardExcess();
    endAITurn(game);
    return;
  }

  const toTake = sortedGems.slice(0, Math.min(3, sortedGems.length));
  if (toTake.length > 0) {
    for (const g of toTake) { supply[g]--; ai.gems[g]++; }
    setMessage(`AI took ${toTake.length} gems`);
    aiDiscardExcess();
    endAITurn(game);
    return;
  }

  if (bestBuy) {
    payForCard(ai, bestBuy.card);
    if (bestBuy.tier >= 0) { market[bestBuy.tier].splice(bestBuy.index, 1); refillMarket(bestBuy.tier); }
    else { ai.reserved.splice(bestBuy.index, 1); }
    setMessage(`AI bought card: +${bestBuy.card.prestige} prestige`);
    checkNobles(ai);
    endAITurn(game);
    return;
  }

  setMessage('AI passes');
  endAITurn(game);
}

function endAITurn(game) {
  updateScores();
  currentPlayer = 0;
  turnPhase = 'action';
  roundNumber++;
  checkWinCondition(game);
}

// --- Drawing helpers ---

// Draw a rounded rectangle using fillPoly (approximated as plain rect for simplicity,
// or as a polygon with chamfered corners)
function drawRoundRect(renderer, x, y, w, h, r, fillColor) {
  // Approximate rounded rect as an octagon polygon
  const pts = [
    { x: x + r, y }, { x: x + w - r, y },
    { x: x + w, y: y + r }, { x: x + w, y: y + h - r },
    { x: x + w - r, y: y + h }, { x: x + r, y: y + h },
    { x, y: y + h - r }, { x, y: y + r },
  ];
  renderer.fillPoly(pts, fillColor);
}

function strokeRoundRect(renderer, x, y, w, h, r, strokeColor, lineWidth) {
  const pts = [
    { x: x + r, y }, { x: x + w - r, y },
    { x: x + w, y: y + r }, { x: x + w, y: y + h - r },
    { x: x + w - r, y: y + h }, { x: x + r, y: y + h },
    { x, y: y + h - r }, { x, y: y + r },
  ];
  renderer.strokePoly(pts, strokeColor, lineWidth);
}

function hexWithAlpha(hex, alpha) {
  // Convert #rrggbb to #rrggbbaa
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  if (hex.length === 4) {
    // #rgb → #rrggbbaa
    const r = hex[1] + hex[1], g = hex[2] + hex[2], b = hex[3] + hex[3];
    return `#${r}${g}${b}${a}`;
  }
  if (hex.length === 7) return hex + a;
  return hex;
}

function rgbaHex(r, g, b, a) {
  const toHex = v => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a * 255)}`;
}

// Draw a filled card
function drawCard(renderer, text, card, x, y, isHover, isBuyable) {
  const tierColors = [
    rgbaHex(60, 70, 90, 0.9),
    rgbaHex(70, 60, 80, 0.9),
    rgbaHex(90, 70, 50, 0.9),
  ];
  drawRoundRect(renderer, x, y, CARD_W, CARD_H, 4, tierColors[card.tier]);

  const strokeColor = isHover
    ? (isBuyable ? '#4f4' : '#e90')
    : (isBuyable ? '#50ff5080' : '#ffffff33');
  const strokeWidth = isHover ? 2 : 1;
  strokeRoundRect(renderer, x, y, CARD_W, CARD_H, 4, strokeColor, strokeWidth);

  // Bonus gem circle (top right)
  renderer.fillCircle(x + CARD_W - 14, y + 12, 8, GEM_COLORS[card.bonus]);
  renderer.drawLine(x + CARD_W - 14, y + 12, x + CARD_W - 14, y + 12, '#aaa', 0.5); // tiny dot for border approx
  const labelColor = card.bonus === 'diamond' ? '#333' : '#fff';
  text.drawText(GEM_LABELS[card.bonus], x + CARD_W - 14, y + 7, 9, labelColor, 'center');

  // Prestige (top left)
  if (card.prestige > 0) {
    text.drawText(String(card.prestige), x + 5, y + 3, 16, '#ff0', 'left');
  }

  // Cost gems (bottom of card)
  let cx = x + 4;
  for (const g of GEM_NAMES) {
    if (card.cost[g] && card.cost[g] > 0) {
      renderer.fillCircle(cx + 7, y + CARD_H - 12, 7, GEM_COLORS[g]);
      const costColor = g === 'diamond' ? '#333' : '#fff';
      text.drawText(String(card.cost[g]), cx + 7, y + CARD_H - 16, 9, costColor, 'center');
      cx += 16;
    }
  }
}

function drawPlayerBar(renderer, text, player, y, isAI) {
  const bgColor = isAI ? rgbaHex(100, 60, 60, 0.3) : rgbaHex(60, 80, 100, 0.3);
  renderer.fillRect(0, y, W, 48, bgColor);

  const nameColor = isAI ? '#f88' : '#8cf';
  text.drawText(`${player.name}: ${player.prestige} prestige`, 10, y + 4, 13, nameColor, 'left');

  let gx = 10;
  const allGems = [...GEM_NAMES, 'gold'];
  for (const g of allGems) {
    if (player.gems[g] > 0 || (g !== 'gold' && player.bonuses[g] > 0)) {
      renderer.fillCircle(gx + 8, y + 32, 8, GEM_COLORS[g]);
      const tokenTextColor = g === 'diamond' ? '#333' : '#fff';
      text.drawText(String(player.gems[g]), gx + 8, y + 27, 10, tokenTextColor, 'center');
      if (g !== 'gold' && player.bonuses[g] > 0) {
        text.drawText(`+${player.bonuses[g]}`, gx + 8, y + 40, 10, '#ff0', 'center');
      }
      gx += 30;
    }
  }

  text.drawText(`Gems: ${totalGems(player)}/10`, W - 10, y + 4, 10, '#888', 'right');
  if (!isAI) {
    text.drawText(`Reserved: ${player.reserved.length}/3`, W - 10, y + 18, 10, '#888', 'right');
  }
}

function drawNobles(renderer, text) {
  if (nobles.length === 0) return;
  text.drawText('NOBLES', 34, 58, 9, '#aaa', 'center');
  for (let i = 0; i < nobles.length; i++) {
    const n = nobles[i];
    const nx = 10, ny = 70 + i * (NOBLE_SIZE + 6);
    drawRoundRect(renderer, nx, ny, 48, NOBLE_SIZE, 3, '#b478ff33');
    strokeRoundRect(renderer, nx, ny, 48, NOBLE_SIZE, 3, '#b478ff80', 1);
    text.drawText('3', nx + 3, ny + 2, 11, '#ff0', 'left');

    let ry = ny + 14;
    for (const g of GEM_NAMES) {
      if (n.requirements[g]) {
        text.drawText(`${GEM_LABELS[g]}:${n.requirements[g]}`, nx + 3, ry, 8, GEM_COLORS[g], 'left');
        ry += 9;
      }
    }
  }
}

function drawGemSupply(renderer, text, currentPhase, selGems, hGem, hBtn) {
  text.drawText('GEM SUPPLY', 528, 58, 10, '#aaa', 'center');

  const allGems = [...GEM_NAMES, 'gold'];
  for (let i = 0; i < allGems.length; i++) {
    const g = allGems[i];
    const pos = i < 5 ? gemTokenPos(i) : goldTokenPos();
    const isHover = hGem === g;
    const canTake = currentPlayer === 0 &&
      (currentPhase === 'action' || currentPhase === 'selectGems') &&
      supply[g] > 0 && g !== 'gold';

    renderer.fillCircle(pos.x, pos.y, GEM_TOKEN_R, GEM_COLORS[g]);
    const ringColor = (isHover && canTake) ? '#ff0' : '#ffffff66';
    const ringWidth = (isHover && canTake) ? 3 : 1;
    // Draw ring as a slightly larger circle outline
    renderer.strokePoly(circlePoints(pos.x, pos.y, GEM_TOKEN_R), ringColor, ringWidth);

    const countColor = g === 'diamond' ? '#333' : '#fff';
    text.drawText(String(supply[g]), pos.x, pos.y - 7, 14, countColor, 'center');
    text.drawText(GEM_SHORT[g], pos.x, pos.y + GEM_TOKEN_R + 1, 8, '#aaa', 'center');

    const selCount = selGems.filter(sg => sg === g).length;
    if (selCount > 0) {
      text.drawText(`x${selCount}`, pos.x + GEM_TOKEN_R + 4, pos.y - 6, 10, '#ff0', 'left');
    }
  }

  if (currentPhase === 'selectGems' && selGems.length > 0) {
    drawButtonShape(renderer, text, 'Confirm', 480, 198, 72, 22, hBtn === 'confirm', '#4f4');
    drawButtonShape(renderer, text, 'Cancel', 558, 198, 60, 22, hBtn === 'cancel', '#f44');
  }
}

function circlePoints(cx, cy, r, steps) {
  const n = steps || 16;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function drawButtonShape(renderer, text, label, x, y, w, h, isHover, color) {
  const fillColor = isHover ? color : '#ffffff1a';
  drawRoundRect(renderer, x, y, w, h, 3, fillColor);
  strokeRoundRect(renderer, x, y, w, h, 3, color, 1);
  const textColor = isHover ? '#000' : color;
  text.drawText(label, x + w / 2, y + 4, 11, textColor, 'center');
}

function drawSelectedGems(renderer, text, selGems) {
  renderer.fillRect(468, 228, 170, 26, '#ee99001a');
  const selText = 'Taking: ' + selGems.map(g => GEM_LABELS[g]).join(', ');
  text.drawText(selText, 474, 235, 10, '#e90', 'left');
}

function drawReservedCards(renderer, text, player) {
  if (player.reserved.length === 0) return;
  text.drawText('Reserved:', 440, H - 48 - CARD_H - 18, 9, '#aaa', 'left');
  for (let i = 0; i < player.reserved.length; i++) {
    const card = player.reserved[i];
    const rx = 440 + i * (68 + 4);
    const ry = H - 48 - CARD_H - 4;
    const hover = hoverCard && hoverCard.tier === -1 && hoverCard.index === i;
    drawCard(renderer, text, card, rx, ry, hover,
      canAfford(player, card) && currentPlayer === 0 && turnPhase === 'action');
  }
}

function drawDiscardUI(renderer, text) {
  const p = players[0];
  renderer.fillRect(0, H / 2 - 60, W, 120, '#000000b3');
  text.drawText(`Too many gems! (${totalGems(p)}/10) Click gems to discard`, W / 2, H / 2 - 50, 14, '#f44', 'center');

  let dx = W / 2 - 130;
  const allGems = [...GEM_NAMES, 'gold'];
  for (const g of allGems) {
    if (p.gems[g] > 0) {
      const isH = hoverGem === g;
      renderer.fillCircle(dx, H / 2, 16, GEM_COLORS[g]);
      const ringColor = isH ? '#ff0' : '#aaa';
      renderer.strokePoly(circlePoints(dx, H / 2, 16), ringColor, isH ? 3 : 1);
      const countColor = g === 'diamond' ? '#333' : '#fff';
      text.drawText(String(p.gems[g]), dx, H / 2 - 7, 13, countColor, 'center');
      text.drawText(GEM_SHORT[g], dx, H / 2 + 18, 8, '#aaa', 'center');
      dx += 44;
    }
  }
}

// --- Main draw function ---
function drawGame(renderer, text) {
  if (players.length === 0) return;

  const p = players[0], ai = players[1];

  // AI bar (top)
  drawPlayerBar(renderer, text, ai, 0, true);

  // Nobles
  drawNobles(renderer, text);

  // Card market
  for (let t = 0; t < 3; t++) {
    const displayRow = 2 - t;
    const ly = 58 + displayRow * (CARD_H + 6) + CARD_H / 2;
    text.drawText(TIER_LABELS[t], MARKET_X - 26, ly - 6, 12, '#888', 'center');
    text.drawText(`(${decks[t].length})`, MARKET_X - 26, ly + 8, 9, '#888', 'center');

    for (let i = 0; i < market[t].length; i++) {
      const pos = cardPos(t, i);
      const card = market[t][i];
      const isHover = hoverCard && hoverCard.tier === t && hoverCard.index === i;
      const affordable = canAfford(p, card);
      drawCard(renderer, text, card, pos.x, pos.y, isHover,
        affordable && currentPlayer === 0 && turnPhase === 'action');
    }
  }

  // Gem supply
  drawGemSupply(renderer, text, turnPhase, selectedGems, hoverGem, hoverButton);

  // Player bar (bottom)
  drawPlayerBar(renderer, text, p, H - 48, false);

  // Player reserved cards
  drawReservedCards(renderer, text, p);

  // Selected gems indicator
  if (turnPhase === 'selectGems' && selectedGems.length > 0) {
    drawSelectedGems(renderer, text, selectedGems);
  }

  // Discard phase
  if (turnPhase === 'discardGems') {
    drawDiscardUI(renderer, text);
  }

  // Turn indicator
  if (currentPlayer === 0) {
    let turnMsg = 'Your turn: buy/reserve card or take gems';
    let turnColor = '#e90';
    if (turnPhase === 'selectGems') {
      turnMsg = 'Select gems (click tokens) then Confirm';
    } else if (turnPhase === 'discardGems') {
      turnMsg = `Discard gems to 10 (have ${totalGems(p)})`;
      turnColor = '#f44';
    }
    text.drawText(turnMsg, 10, H - 13, 11, turnColor, 'left');
  } else {
    text.drawText('AI is thinking...', 10, H - 13, 11, '#888', 'left');
  }

  // Message overlay
  if (messageTimer > 0) {
    const alpha = Math.min(1, messageTimer / 30);
    const msgColor = hexWithAlpha('#ee9900', alpha);
    text.drawText(message, W / 2, H / 2 - 5, 13, msgColor, 'center');
  }
}

// --- Export ---
export function createGame() {
  const game = new Game('game');

  game.onInit = () => {
    game.showOverlay('SPLENDOR ONLINE', 'Click to Start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    if (game.state === 'waiting') return;
    if (game.state === 'over') return;

    if (messageTimer > 0) messageTimer--;

    if (game.state === 'playing' && currentPlayer === 1 && turnPhase === 'aiTurn') {
      aiThinkTimer--;
      if (aiThinkTimer <= 0) aiTurn(game);
    }
  };

  game.onDraw = (renderer, text) => {
    if (game.state === 'waiting' || players.length === 0) return;
    drawGame(renderer, text);
  };

  // Mouse events — direct canvas addEventListener
  const canvas = document.getElementById('game');

  canvas.addEventListener('mousemove', (e) => {
    if (game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    hoverCard = hitTestCard(mx, my);
    if (turnPhase === 'discardGems') { hoverGem = hitTestDiscardGem(mx, my); }
    else { hoverGem = hitTestGem(mx, my); }
    hoverButton = hitTestButton(mx, my);
  });

  canvas.addEventListener('click', (e) => {
    if (game.state === 'waiting') {
      initGame();
      game.setState('playing');
      return;
    }
    if (game.state === 'over') {
      initGame();
      game.setState('playing');
      return;
    }
    if (game.state !== 'playing' || currentPlayer !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    if (turnPhase === 'discardGems') {
      const dGem = hitTestDiscardGem(mx, my);
      if (dGem) discardGem(dGem);
      return;
    }

    const btn = hitTestButton(mx, my);
    if (btn === 'confirm') { confirmGemSelection(); return; }
    if (btn === 'cancel') { cancelGemSelection(); return; }

    const gem = hitTestGem(mx, my);
    if (gem && (turnPhase === 'action' || turnPhase === 'selectGems')) {
      trySelectGem(gem);
      return;
    }

    if (turnPhase === 'action') {
      const hit = hitTestCard(mx, my);
      if (hit) {
        if (e.shiftKey) { tryReserveCard(hit); } else { tryBuyCard(hit); }
        return;
      }
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (game.state !== 'playing' || currentPlayer !== 0 || turnPhase !== 'action') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const hit = hitTestCard(mx, my);
    if (hit) tryReserveCard(hit);
  });

  game.start();
  return game;
}
