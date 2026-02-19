// tactical-card-battler/game.js — Tactical Card Battler ported to WebGL 2 engine

import { Game } from '../engine/core.js';

const W = 600, H = 500;

// ---- COLORS ----
const C_BG       = '#1a1a2e';
const C_PURPLE   = '#cc44ff';
const C_PURPLEA  = '#cc44ff88';
const C_BLUE     = '#4488ff';
const C_BLUEA    = '#4488ff88';
const C_RED      = '#ff4466';
const C_REDA     = '#ff446688';
const C_GREEN    = '#44ff88';
const C_GOLD     = '#ffcc44';
const C_LANE     = '#16213e';
const C_LANEBDR  = '#2a2a4e';
const C_CARD     = '#22224a';
const C_CARDDIM  = '#181830';
const C_WHITE    = '#ffffff';
const C_GREY     = '#aaaaaa';
const C_DARK     = '#555555';
const C_MANA_ON  = '#6644ff';
const C_MANA_OFF = '#2a2a4e';
const C_MANA_BDR = '#8866ff';
const C_AI_CARD  = '#4a1a2a';
const C_AI_BDR   = '#cc3344';
const C_PL_CARD  = '#1a2a5a';
const C_PL_BDR   = '#3366cc';
const C_MANABG   = '#3344aa';

// ---- LAYOUT ----
const LANE_X    = [120, 300, 480];
const LANE_W    = 140;
const LANE_TOP  = 50;
const LANE_MID  = 190;
const LANE_BOT  = 330;
const PLAYER_LANE_Y = 250;
const AI_LANE_Y     = 120;
const HAND_Y    = 410;
const HAND_H    = 80;
const CARD_W    = 65;
const CARD_H    = 75;
const END_BTN   = { x: 530, y: 365, w: 60, h: 28 };

// ---- CARD POOL ----
const CARD_POOL = [
  { type:'minion', cost:1, atk:1, hp:2, name:'Imp',         desc:'1/2' },
  { type:'minion', cost:1, atk:2, hp:1, name:'Wisp',        desc:'2/1' },
  { type:'minion', cost:2, atk:2, hp:3, name:'Grunt',       desc:'2/3' },
  { type:'minion', cost:2, atk:3, hp:2, name:'Rogue',       desc:'3/2' },
  { type:'minion', cost:3, atk:3, hp:4, name:'Knight',      desc:'3/4' },
  { type:'minion', cost:3, atk:4, hp:3, name:'Assassin',    desc:'4/3' },
  { type:'minion', cost:4, atk:4, hp:5, name:'Golem',       desc:'4/5' },
  { type:'minion', cost:4, atk:5, hp:4, name:'Berserker',   desc:'5/4' },
  { type:'minion', cost:5, atk:5, hp:6, name:'Drake',       desc:'5/6' },
  { type:'minion', cost:5, atk:6, hp:5, name:'Champion',    desc:'6/5' },
  { type:'minion', cost:6, atk:7, hp:7, name:'Giant',       desc:'7/7' },
  { type:'minion', cost:7, atk:8, hp:8, name:'Dragon',      desc:'8/8' },
  { type:'minion', cost:2, atk:1, hp:4, name:'Shieldsman',  desc:'1/4' },
  { type:'minion', cost:3, atk:2, hp:5, name:'Guardian',    desc:'2/5' },
  { type:'spell', cost:1, name:'Zap',         desc:'Deal 2 dmg',  effect:'damage',   value:2 },
  { type:'spell', cost:2, name:'Fireball',    desc:'Deal 4 dmg',  effect:'damage',   value:4 },
  { type:'spell', cost:3, name:'Lightning',   desc:'Deal 6 dmg',  effect:'damage',   value:6 },
  { type:'spell', cost:1, name:'Heal',        desc:'Heal hero 3', effect:'heal',     value:3 },
  { type:'spell', cost:2, name:'GreatHeal',   desc:'Heal hero 6', effect:'heal',     value:6 },
  { type:'spell', cost:2, name:'War Cry',     desc:'All +2 atk',  effect:'buff_atk', value:2 },
];

function makeCard(template) {
  const c = { ...template };
  c.id = Math.random();
  if (c.type === 'minion') { c.curHp = c.hp; c.canAttack = false; }
  return c;
}

function buildDeck() {
  const deck = [];
  for (let i = 0; i < 15; i++) {
    deck.push(makeCard(CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)]));
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ---- HUD ELEMENTS ----
const scoreEl    = document.getElementById('score');
const playerHPEl = document.getElementById('playerHP');
const playerManaEl = document.getElementById('playerMana');
const aiHPEl     = document.getElementById('aiHP');
const aiManaEl   = document.getElementById('aiMana');

// ---- GAME STATE (module-level) ----
let player, ai, turnNumber, currentTurn, selectedCard, dragging, dragX, dragY;
let selectedAttacker, animQueue, turnPhase;
let combatLog, logTimer;
let score = 0;
let gameInst = null; // reference to Game instance

function updateHUD() {
  if (scoreEl)     scoreEl.textContent     = score;
  if (playerHPEl)  playerHPEl.textContent  = Math.max(0, player.hp);
  if (playerManaEl)playerManaEl.textContent= player.mana + '/' + player.maxMana;
  if (aiHPEl)      aiHPEl.textContent      = Math.max(0, ai.hp);
  if (aiManaEl)    aiManaEl.textContent    = ai.mana + '/' + ai.maxMana;
}

function initGameState() {
  player = {
    hp: 30, maxHp: 30, mana: 0, maxMana: 0,
    deck: buildDeck(), hand: [], lanes: [null, null, null]
  };
  ai = {
    hp: 30, maxHp: 30, mana: 0, maxMana: 0,
    deck: buildDeck(), hand: [], lanes: [null, null, null]
  };
  turnNumber    = 0;
  currentTurn   = 'player';
  selectedCard  = null;
  dragging      = false;
  dragX = 0; dragY = 0;
  selectedAttacker = null;
  animQueue     = [];
  turnPhase     = 'idle';
  combatLog     = '';
  logTimer      = 0;
  score         = 0;
  updateHUD();
}

function startTurn(who) {
  currentTurn = who;
  const p = who === 'player' ? player : ai;
  turnNumber++;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  if (p.deck.length > 0 && p.hand.length < 7) {
    p.hand.push(p.deck.pop());
  }
  for (let i = 0; i < 3; i++) {
    if (p.lanes[i]) p.lanes[i].canAttack = true;
  }
  selectedCard  = null;
  selectedAttacker = null;
  if (who === 'ai') {
    turnPhase = 'ai_thinking';
    setTimeout(() => aiTurn(), 600);
  } else {
    turnPhase = 'idle';
  }
  updateHUD();
}

function endTurn() {
  if (currentTurn !== 'player' || turnPhase !== 'idle') return;
  doCombat('player');
}

function doCombat(who) {
  const attacker = who === 'player' ? player : ai;
  const defender = who === 'player' ? ai : player;
  turnPhase = 'animating';
  let delay = 0;
  for (let i = 0; i < 3; i++) {
    const m = attacker.lanes[i];
    if (!m) continue;
    delay += 400;
    const laneIdx = i;
    setTimeout(() => {
      if (!attacker.lanes[laneIdx]) return;
      const opp = defender.lanes[laneIdx];
      if (opp) {
        opp.curHp  -= m.atk;
        m.curHp    -= opp.atk;
        showLog(m.name + ' fights ' + opp.name);
        if (who === 'player') score += m.atk;
        if (opp.curHp <= 0) { defender.lanes[laneIdx] = null; showLog(opp.name + ' dies!'); }
        if (m.curHp  <= 0) { attacker.lanes[laneIdx] = null; showLog(m.name  + ' dies!'); }
      } else {
        defender.hp -= m.atk;
        if (who === 'player') score += m.atk;
        showLog(m.name + ' hits hero for ' + m.atk + '!');
      }
      updateHUD();
      checkGameOver();
    }, delay);
  }
  setTimeout(() => {
    if (gameInst && gameInst.state !== 'playing') return;
    turnPhase = 'idle';
    if (who === 'player') {
      startTurn('ai');
    } else {
      startTurn('player');
    }
  }, delay + 500);
}

function showLog(msg) {
  combatLog = msg;
  logTimer  = 90;
}

function checkGameOver() {
  if (!gameInst) return;
  if (player.hp <= 0 || ai.hp <= 0) {
    gameInst.setState('over');
    if (ai.hp <= 0) {
      gameInst.showOverlay('VICTORY!', 'Score: ' + score + ' | Click to play again');
    } else {
      gameInst.showOverlay('DEFEAT', 'Score: ' + score + ' | Click to play again');
    }
  }
}

function playCard(who, cardIdx, laneIdx) {
  const p = who === 'player' ? player : ai;
  const card = p.hand[cardIdx];
  if (!card || card.cost > p.mana) return false;
  if (card.type === 'minion') {
    if (laneIdx < 0 || laneIdx > 2 || p.lanes[laneIdx] !== null) return false;
    p.mana -= card.cost;
    p.hand.splice(cardIdx, 1);
    const minion = { ...card, curHp: card.hp, canAttack: false };
    p.lanes[laneIdx] = minion;
    showLog((who === 'player' ? 'You' : 'AI') + ' plays ' + card.name + ' to lane ' + (laneIdx + 1));
  } else if (card.type === 'spell') {
    p.mana -= card.cost;
    p.hand.splice(cardIdx, 1);
    applySpell(who, card, laneIdx);
  }
  updateHUD();
  return true;
}

function applySpell(who, card, targetLane) {
  const p   = who === 'player' ? player : ai;
  const opp = who === 'player' ? ai : player;
  if (card.effect === 'damage') {
    if (targetLane >= 0 && targetLane <= 2 && opp.lanes[targetLane]) {
      opp.lanes[targetLane].curHp -= card.value;
      if (who === 'player') score += card.value;
      showLog(card.name + ' hits ' + opp.lanes[targetLane].name + ' for ' + card.value + '!');
      if (opp.lanes[targetLane].curHp <= 0) {
        showLog(opp.lanes[targetLane].name + ' dies!');
        opp.lanes[targetLane] = null;
      }
    } else {
      opp.hp -= card.value;
      if (who === 'player') score += card.value;
      showLog(card.name + ' hits hero for ' + card.value + '!');
    }
  } else if (card.effect === 'heal') {
    p.hp = Math.min(p.maxHp, p.hp + card.value);
    showLog(card.name + ' heals for ' + card.value);
  } else if (card.effect === 'buff_atk') {
    for (let i = 0; i < 3; i++) {
      if (p.lanes[i]) {
        p.lanes[i].atk += card.value;
        showLog(p.lanes[i].name + ' gains +' + card.value + ' atk!');
      }
    }
  }
  checkGameOver();
}

// ---- AI LOGIC ----
function aiTurn() {
  if (!gameInst || gameInst.state !== 'playing') return;
  let played = true;
  while (played) {
    played = false;
    let bestScore = -1, bestCardIdx = -1, bestLane = -1;
    for (let ci = 0; ci < ai.hand.length; ci++) {
      const card = ai.hand[ci];
      if (card.cost > ai.mana) continue;
      if (card.type === 'minion') {
        for (let li = 0; li < 3; li++) {
          if (ai.lanes[li] !== null) continue;
          const s = evaluateMinion(card, li);
          if (s > bestScore) { bestScore = s; bestCardIdx = ci; bestLane = li; }
        }
      } else if (card.type === 'spell') {
        const r = evaluateSpell(card);
        if (r.score > bestScore) { bestScore = r.score; bestCardIdx = ci; bestLane = r.lane; }
      }
    }
    if (bestCardIdx >= 0 && bestScore > 0) {
      playCard('ai', bestCardIdx, bestLane);
      played = true;
    }
  }
  setTimeout(() => {
    if (!gameInst || gameInst.state !== 'playing') return;
    doCombat('ai');
  }, 600);
}

function evaluateMinion(card, lane) {
  let s = card.atk + card.hp;
  const oppMinion = player.lanes[lane];
  if (oppMinion) {
    if (card.atk >= oppMinion.curHp) s += 5;
    if (card.hp > oppMinion.atk)    s += 3;
  } else {
    s += card.atk * 1.5;
  }
  s += (10 - card.cost) * 0.5;
  return s;
}

function evaluateSpell(card) {
  let bestScore = 0, bestLane = -1;
  if (card.effect === 'damage') {
    for (let i = 0; i < 3; i++) {
      const m = player.lanes[i];
      if (m) {
        let s = card.value;
        if (card.value >= m.curHp) s += m.atk + m.curHp + 5;
        else s += card.value;
        if (s > bestScore) { bestScore = s; bestLane = i; }
      }
    }
    const faceScore = card.value * 1.2 + (player.hp <= card.value ? 50 : 0);
    if (faceScore > bestScore) { bestScore = faceScore; bestLane = -1; }
  } else if (card.effect === 'heal') {
    bestScore = ai.hp < 20 ? card.value * 1.5 : card.value * 0.5;
    bestLane  = -1;
  } else if (card.effect === 'buff_atk') {
    bestScore = ai.lanes.filter(m => m).length * card.value * 2;
    bestLane  = -1;
  }
  return { score: bestScore, lane: bestLane };
}

// ---- DRAWING HELPERS ----

// Draw a rounded rect using fillPoly (approximate with many-sided poly is overkill;
// use a plain fillRect + strokePoly outline for the "rounded" look — close enough visually)
function drawRoundRect(r, color, x, y, w, h) {
  r.fillRect(x, y, w, h, color);
}

function drawRoundRectBorder(r, color, x, y, w, h, lineW = 1.5) {
  r.strokePoly([
    { x: x,     y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x,     y: y + h },
  ], color, lineW, true);
}

// ---- DRAW FUNCTIONS ----

function drawLanes(r, t) {
  for (let i = 0; i < 3; i++) {
    const x = LANE_X[i] - LANE_W / 2;
    // AI lane
    r.fillRect(x, LANE_TOP, LANE_W, LANE_MID - LANE_TOP - 5, C_LANE);
    drawRoundRectBorder(r, C_LANEBDR, x, LANE_TOP, LANE_W, LANE_MID - LANE_TOP - 5);
    // Player lane
    r.fillRect(x, LANE_MID + 5, LANE_W, LANE_BOT - LANE_MID - 5, C_LANE);
    drawRoundRectBorder(r, C_LANEBDR, x, LANE_MID + 5, LANE_W, LANE_BOT - LANE_MID - 5);
    // Lane label
    t.drawText('Lane ' + (i + 1), LANE_X[i], LANE_MID - 7, 10, C_DARK, 'center');
  }
}

function drawHeroes(r, t) {
  // AI hero
  const ahx = 35, ahy = 25;
  r.setGlow(C_RED, 0.6);
  r.fillCircle(ahx, ahy, 20, ai.hp > 10 ? C_RED : '#aa2233');
  r.setGlow(null);
  t.drawText(String(ai.hp), ahx, ahy - 8, 12, C_WHITE, 'center');
  t.drawText('AI', ahx, ahy - 35, 9, C_GREY, 'center');

  // Player hero
  const phx = 35, phy = LANE_BOT + 10;
  r.setGlow(C_BLUE, 0.6);
  r.fillCircle(phx, phy, 20, player.hp > 10 ? C_BLUE : '#2244aa');
  r.setGlow(null);
  t.drawText(String(player.hp), phx, phy - 8, 12, C_WHITE, 'center');
  t.drawText('YOU', phx, phy - 35, 9, C_GREY, 'center');
}

function drawMinionCard(r, t, m, cx, cy, owner) {
  const w = 60, h = 55;
  const x = cx - w / 2, y = cy - h / 2;
  const isPlayer = owner === 'player';

  const bodyColor  = isPlayer ? C_PL_CARD : C_AI_CARD;
  const isSelected = selectedAttacker && selectedAttacker.lane !== undefined &&
    ((isPlayer && player.lanes[selectedAttacker.lane] === m) ||
     (!isPlayer && ai.lanes[selectedAttacker.lane] === m));
  const borderColor = isSelected ? C_GOLD : (isPlayer ? C_PL_BDR : C_AI_BDR);
  const borderW     = isSelected ? 2 : 1;

  // Glow if can attack
  if (m.canAttack && isPlayer && currentTurn === 'player') {
    r.setGlow(C_GOLD, 0.6);
  }
  r.fillRect(x, y, w, h, bodyColor);
  drawRoundRectBorder(r, borderColor, x, y, w, h, borderW);
  r.setGlow(null);

  // Name
  t.drawText(m.name, cx, y + 4, 9, '#dddddd', 'center');

  // ATK label + value
  t.drawText('ATK', x + 3, y + h - 16, 8, C_DARK, 'left');
  t.drawText(String(m.atk), x + 5, y + h - 14, 14, C_GOLD, 'left');

  // HP label + value
  t.drawText('HP', x + w - 3, y + h - 16, 8, C_DARK, 'right');
  t.drawText(String(m.curHp), x + w - 5, y + h - 14, 14, m.curHp < m.hp ? C_RED : C_GREEN, 'right');
}

function drawMinions(r, t) {
  for (let i = 0; i < 3; i++) {
    if (ai.lanes[i])     drawMinionCard(r, t, ai.lanes[i],     LANE_X[i], AI_LANE_Y,     'ai');
    if (player.lanes[i]) drawMinionCard(r, t, player.lanes[i], LANE_X[i], PLAYER_LANE_Y, 'player');
  }
}

function drawCardInHand(r, t, card, x, y, playable) {
  const bodyColor   = playable ? C_CARD : C_CARDDIM;
  const borderColor = playable ? C_PURPLE : '#333333';
  const borderW     = playable ? 1.5 : 1;

  if (playable) r.setGlow(C_PURPLE, 0.5);
  r.fillRect(x, y, CARD_W, CARD_H, bodyColor);
  drawRoundRectBorder(r, borderColor, x, y, CARD_W, CARD_H, borderW);
  r.setGlow(null);

  // Mana cost circle
  r.fillCircle(x + 10, y + 10, 8, C_MANABG);
  t.drawText(String(card.cost), x + 10, y + 3, 10, C_WHITE, 'center');

  // Name (truncate if long)
  const displayName = card.name.length > 9 ? card.name.substring(0, 8) + '..' : card.name;
  t.drawText(displayName, x + CARD_W / 2, y + 22, 8, playable ? '#dddddd' : '#777777', 'center');

  if (card.type === 'minion') {
    t.drawText('MINION', x + CARD_W / 2, y + 36, 7, '#666666', 'center');
    t.drawText(String(card.atk), x + 5, y + CARD_H - 4, 11, C_GOLD,  'left');
    t.drawText(String(card.hp),  x + CARD_W - 5, y + CARD_H - 4, 11, C_GREEN, 'right');
  } else {
    t.drawText('SPELL', x + CARD_W / 2, y + 36, 7, C_PURPLE, 'center');
    t.drawText(card.desc, x + CARD_W / 2, y + 48, 7, '#aaaaaa', 'center');
  }
}

function drawHand(r, t) {
  const hand = player.hand;
  const n = hand.length;
  if (n === 0) return;
  const totalW = n * (CARD_W + 4);
  const startX = (W - totalW) / 2;
  for (let i = 0; i < n; i++) {
    if (dragging && selectedCard === i) continue;
    const card = hand[i];
    const cx = startX + i * (CARD_W + 4);
    drawCardInHand(r, t, card, cx, HAND_Y, card.cost <= player.mana && currentTurn === 'player');
  }
}

function drawDragCard(r, t) {
  const card = player.hand[selectedCard];
  if (!card) return;
  const x = dragX - CARD_W / 2;
  const y = dragY - CARD_H / 2;
  // Draw at 85% alpha — encode alpha in color by drawing a semi-transparent overlay isn't
  // directly possible; just draw normally (dragging gives visual feedback via position)
  drawCardInHand(r, t, card, x, y, true);

  // Highlight valid drop zones
  if (card.type === 'minion') {
    for (let i = 0; i < 3; i++) {
      if (player.lanes[i] === null) {
        const lx = LANE_X[i] - LANE_W / 2;
        r.dashedLine(lx + 2, LANE_MID + 7, lx + LANE_W - 2, LANE_MID + 7, C_GREEN, 2, 4, 4);
        r.dashedLine(lx + 2, LANE_BOT - 2, lx + LANE_W - 2, LANE_BOT - 2, C_GREEN, 2, 4, 4);
        r.dashedLine(lx + 2, LANE_MID + 7, lx + 2, LANE_BOT - 2,           C_GREEN, 2, 4, 4);
        r.dashedLine(lx + LANE_W - 2, LANE_MID + 7, lx + LANE_W - 2, LANE_BOT - 2, C_GREEN, 2, 4, 4);
      }
    }
  } else if (card.effect === 'damage') {
    for (let i = 0; i < 3; i++) {
      const lx = LANE_X[i] - LANE_W / 2;
      r.dashedLine(lx + 2, LANE_TOP + 2, lx + LANE_W - 2, LANE_TOP + 2,   C_RED, 2, 4, 4);
      r.dashedLine(lx + 2, LANE_MID - 7, lx + LANE_W - 2, LANE_MID - 7,   C_RED, 2, 4, 4);
      r.dashedLine(lx + 2, LANE_TOP + 2, lx + 2, LANE_MID - 7,             C_RED, 2, 4, 4);
      r.dashedLine(lx + LANE_W - 2, LANE_TOP + 2, lx + LANE_W - 2, LANE_MID - 7, C_RED, 2, 4, 4);
    }
  }
}

function drawEndTurnButton(r, t) {
  const b = END_BTN;
  const active = currentTurn === 'player' && turnPhase === 'idle';
  r.fillRect(b.x, b.y, b.w, b.h, active ? '#2a1a4a' : '#1a1a2a');
  if (active) r.setGlow(C_PURPLE, 0.5);
  drawRoundRectBorder(r, active ? C_PURPLE : '#444444', b.x, b.y, b.w, b.h, active ? 2 : 1);
  r.setGlow(null);
  const tc = active ? '#dddddd' : '#666666';
  t.drawText('END',  b.x + b.w / 2, b.y + 4,  9, tc, 'center');
  t.drawText('TURN', b.x + b.w / 2, b.y + 15, 9, tc, 'center');
}

function drawCombatLog(t) {
  if (logTimer > 0) {
    logTimer--;
    // Fade out as logTimer drops below 30
    const alpha = Math.min(1, logTimer / 30);
    // Build a hex alpha suffix
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    t.drawText(combatLog, W / 2, LANE_MID - 12, 11, '#cc44ff' + a, 'center');
  }
}

function drawTurnIndicator(r, t) {
  const turnColor = currentTurn === 'player' ? C_BLUE : C_RED;
  const turnText  = currentTurn === 'player' ? 'YOUR TURN' : 'AI TURN';
  t.drawText(turnText, W - 10, 5, 10, turnColor, 'right');

  // Mana crystals
  const mx = 530, my = 395;
  t.drawText('MANA', mx + 30, my + 5, 9, C_DARK, 'center');
  for (let i = 0; i < player.maxMana; i++) {
    const cx2 = mx + (i % 5) * 12;
    const cy2 = my + 18 + Math.floor(i / 5) * 12;
    r.fillCircle(cx2, cy2, 4, i < player.mana ? C_MANA_ON : C_MANA_OFF);
    // thin border
    r.strokePoly([
      { x: cx2 - 4, y: cy2 - 4 },
      { x: cx2 + 4, y: cy2 - 4 },
      { x: cx2 + 4, y: cy2 + 4 },
      { x: cx2 - 4, y: cy2 + 4 },
    ], C_MANA_BDR, 0.5, true);
  }
}

// ---- MAIN EXPORT ----

export function createGame() {
  const game = new Game('game');
  gameInst = game;

  const canvas = game.canvas;

  game.onInit = () => {
    initGameState();
    game.showOverlay('TACTICAL CARD BATTLER', 'Click anywhere to start');
    game.setState('waiting');
  };

  game.setScoreFn(() => score);

  game.onUpdate = (dt) => {
    // logTimer is decremented inside drawCombatLog each draw frame; nothing needed here
    // All game logic is event-driven (setTimeout + mouse)
  };

  game.onDraw = (renderer, text) => {
    drawLanes(renderer, text);
    drawHeroes(renderer, text);
    drawMinions(renderer, text);
    drawHand(renderer, text);
    drawEndTurnButton(renderer, text);
    drawCombatLog(text);
    drawTurnIndicator(renderer, text);
    if (dragging && selectedCard !== null) drawDragCard(renderer, text);
  };

  // ---- MOUSE INPUT (direct canvas event listeners per pattern) ----

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;

    if (game.state === 'waiting') {
      game.setState('playing');
      startTurn('player');
      return;
    }
    if (game.state === 'over') {
      game.setState('waiting');
      initGameState();
      game.showOverlay('TACTICAL CARD BATTLER', 'Click anywhere to start');
      game.setState('waiting');
      return;
    }
    if (currentTurn !== 'player' || turnPhase !== 'idle') return;

    // End turn button
    if (mx >= END_BTN.x && mx <= END_BTN.x + END_BTN.w &&
        my >= END_BTN.y && my <= END_BTN.y + END_BTN.h) {
      endTurn();
      return;
    }

    // Pick up card from hand
    const hand = player.hand;
    const n = hand.length;
    if (n > 0) {
      const totalW = n * (CARD_W + 4);
      const startX = (W - totalW) / 2;
      for (let i = n - 1; i >= 0; i--) {
        const cx = startX + i * (CARD_W + 4);
        if (mx >= cx && mx <= cx + CARD_W && my >= HAND_Y && my <= HAND_Y + CARD_H) {
          const card = hand[i];
          if (card.cost <= player.mana) {
            selectedCard = i;
            dragging = true;
            dragX = mx;
            dragY = my;
          }
          return;
        }
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    dragX = (e.clientX - rect.left) * sx;
    dragY = (e.clientY - rect.top) * sy;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!dragging || selectedCard === null) return;
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;

    const card = player.hand[selectedCard];
    if (card) {
      if (card.type === 'minion') {
        for (let i = 0; i < 3; i++) {
          const lx = LANE_X[i] - LANE_W / 2;
          if (mx >= lx && mx <= lx + LANE_W && my >= LANE_MID + 5 && my <= LANE_BOT) {
            if (player.lanes[i] === null) {
              playCard('player', selectedCard, i);
              break;
            }
          }
        }
      } else if (card.type === 'spell') {
        if (card.effect === 'damage') {
          let targetLane = -1;
          for (let i = 0; i < 3; i++) {
            const lx = LANE_X[i] - LANE_W / 2;
            if (mx >= lx && mx <= lx + LANE_W && my >= LANE_TOP && my < LANE_MID) {
              targetLane = i;
              break;
            }
          }
          playCard('player', selectedCard, targetLane);
        } else if (card.effect === 'heal' || card.effect === 'buff_atk') {
          if (my < HAND_Y) {
            playCard('player', selectedCard, -1);
          }
        }
      }
    }

    dragging = false;
    selectedCard = null;
  });

  // Overlay click also works via the overlay element in HTML
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'pointer';
    overlay.addEventListener('click', () => {
      if (game.state === 'waiting') {
        game.setState('playing');
        startTurn('player');
      } else if (game.state === 'over') {
        initGameState();
        game.showOverlay('TACTICAL CARD BATTLER', 'Click anywhere to start');
        game.setState('waiting');
      }
    });
  }

  game.start();
  return game;
}
